// Elarion admin: edits content/site.json in the GitHub repository and shows a live preview.
// There is no server. GitHub checks the token on every request, and every publish is a commit
// that triggers the deploy workflow.

import { DEPLOY } from '../assets/lib/deploy.mjs';
import { pageIdForPath, perkCss, previewPages, renderPage, sortedPosts } from '../assets/lib/render.mjs';
import { DEFAULT_SETTINGS, normalizeSettings } from '../assets/lib/settings.mjs';
import { FONTS, PRESETS, PRESET_KEYS, fontFaces, fontStack, themeCss } from '../assets/lib/themes.mjs';
import { getPath, setPath, slugify } from '../assets/lib/util.mjs';
import { startHalftoneFromMarkup } from '../assets/js/halftone.js';
import { ConflictError, GitHub } from './github.js';
import { PANELS } from './panels.js';
import { confirmDialog, h, icon, toast } from './ui.js';

// Clickjacking protection: GitHub Pages can't send frame-ancestors, and <meta> CSP can't set it.
if (window.top !== window.self) {
  document.documentElement.replaceChildren();
  throw new Error('The admin page refuses to run inside a frame.');
}

const SETTINGS_PATH = 'content/site.json';
const TOKEN_KEY = 'elarion-admin-token';
const TOKEN_PATTERN = /^(github_pat_|ghp_|gho_)[A-Za-z0-9_]{20,255}$/;
const DESKTOP_WIDTH = 1280;
const MOBILE_WIDTH = 390;
const root = document.getElementById('app');

const serialize = (settings) => JSON.stringify(settings, null, 2) + '\n';
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const app = {
  repo: DEPLOY,
  siteUrl: '',
  gh: null,
  user: null,
  remembered: false,
  settings: null,
  savedJson: '',
  fileSha: '',
  uploads: new Map(),
  blobUrls: new Map(),
  open: new Set(),
  panel: PANELS.some((p) => p.id === location.hash.slice(1)) ? location.hash.slice(1) : 'overview',
  previewPage: 'home',
  previewSuccess: false,
  device: 'desktop',
  publishing: false,

  get: (path) => getPath(app.settings, path),
  set(path, value) {
    remember(path);
    setPath(app.settings, path, value);
    changed();
  },
  /** Put one setting back to its published value. */
  revert(path) {
    // Always its own undo step, never merged with typing in the same field.
    lastEdit = { path: '', time: 0 };
    app.set(path, structuredClone(getPath(savedSettings(), path)));
    lastEdit = { path: '', time: 0 };
    app.rerender();
  },
  normalized: () => normalizeSettings(app.settings),
  rerender: () => renderPanel(),
  goto(id, { follow = true } = {}) {
    app.panel = id;
    history.replaceState(null, '', `#${id}`);
    renderNav();
    renderPanel();
    // Follow along in the preview, but stay on a news post while editing news.
    const page = PANELS.find((p) => p.id === id)?.page;
    if (follow && page && !(page === 'news' && app.previewPage.startsWith('post:'))) setPreviewPage(page);
    ui.editor?.focus({ preventScroll: true });
  },
  editField,
  setPreviewSuccess(show) {
    app.previewSuccess = show;
    renderPanel();
    if (app.previewPage !== 'home') setPreviewPage('home', 'subscribe');
    else {
      pendingAnchor = 'subscribe';
      renderPreview();
    }
    ui.successToggle?.setAttribute('aria-pressed', String(show));
  },
  isPublishedSlug(slug) {
    try {
      return JSON.parse(app.savedJson).news.posts.some((p) => p.slug === slug);
    } catch {
      return false;
    }
  },
  /** Show the post at this index of the editor's list in the preview. */
  previewPost(index) {
    const slug = app.normalized().news.posts[index]?.slug;
    if (slug) setPreviewPage(`post:${slug}`);
  },
  isOpen: (key) => app.open.has(key),
  setOpen: (key, open) => (open ? app.open.add(key) : app.open.delete(key)),
  imageSrc: (path) => app.blobUrls.get(path) ?? path,
  upload: processUpload,
  applyPreset,
  loadHistory: () => app.gh.history(SETTINGS_PATH),
  loadVersion,
  exportJson,
  importJson,
  resetDefaults,
};

const ui = {};

// --- undo / redo ---------------------------------------------------------------------------
// Snapshots of the whole draft. Typing in one field within a short pause counts as one step.

const UNDO_LIMIT = 200;
const undoStack = [];
const redoStack = [];
let lastEdit = { path: '', time: 0 };

function remember(path = '') {
  const now = Date.now();
  const sameEdit = path && path === lastEdit.path && now - lastEdit.time < 1000;
  lastEdit = { path, time: now };
  if (sameEdit) return;
  undoStack.push(JSON.stringify(app.settings));
  if (undoStack.length > UNDO_LIMIT) undoStack.shift();
  redoStack.length = 0;
}

function step(from, to) {
  if (!from.length || app.publishing) return;
  to.push(JSON.stringify(app.settings));
  app.settings = JSON.parse(from.pop());
  lastEdit = { path: '', time: 0 };
  const focused = document.activeElement?.dataset?.path;
  changed();
  renderPanel();
  if (focused) ui.editor.querySelector(`[data-path="${CSS.escape(focused)}"]`)?.focus({ preventScroll: true });
}

const undo = () => step(undoStack, redoStack);
const redo = () => step(redoStack, undoStack);

let savedCache = { json: '', settings: null };
function savedSettings() {
  if (savedCache.json !== app.savedJson) savedCache = { json: app.savedJson, settings: JSON.parse(app.savedJson) };
  return savedCache.settings;
}

/** Show each field's revert button only while its value differs from the published one. */
function updateReverts() {
  if (!ui.editor) return;
  const buttons = ui.editor.querySelectorAll('[data-revert]');
  if (!buttons.length) return;
  const now = app.normalized();
  const saved = savedSettings();
  for (const button of buttons) {
    const path = button.dataset.revert;
    const before = getPath(saved, path);
    const differs = JSON.stringify(getPath(now, path)) !== JSON.stringify(before);
    button.hidden = !differs;
    if (differs) button.title = before === undefined ? 'Remove: this was not published' : `Back to the published value${typeof before === 'object' ? '' : `: ${String(before).slice(0, 60) || '(empty)'}`}`;
  }
}

// --- token storage ---------------------------------------------------------------------

function storedToken() {
  try {
    const session = sessionStorage.getItem(TOKEN_KEY);
    if (session) return { token: session, remembered: false };
    const local = localStorage.getItem(TOKEN_KEY);
    return local ? { token: local, remembered: true } : null;
  } catch {
    return null;
  }
}

function storeToken(token, remember) {
  try {
    clearToken();
    (remember ? localStorage : sessionStorage).setItem(TOKEN_KEY, token);
  } catch {
    // storage unavailable (private mode): the session simply won't survive a reload
  }
}

function clearToken() {
  try {
    sessionStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(TOKEN_KEY);
  } catch {
    // ignore
  }
}

function explain(error) {
  if (error.status === 401) return 'GitHub rejected this token. It may be mistyped, expired or revoked.';
  if (error.status === 404) return `This token can't see ${app.repo.owner}/${app.repo.repo}. When creating it, choose "Only select repositories" and pick ${app.repo.repo}.`;
  if (error.status === 403) return /rate limit/i.test(error.message) ? 'GitHub rate limit reached. Wait a few minutes and try again.' : `GitHub refused: ${error.message}. Check the token has "Contents: Read and write".`;
  if (error instanceof TypeError) return "Couldn't reach GitHub. Check your connection.";
  return error.message || 'Something went wrong.';
}

// --- sign in ---------------------------------------------------------------------------

function tokenUrl() {
  const params = new URLSearchParams({
    name: `${app.repo.repo} admin`.slice(0, 40),
    description: `Lets the admin page at ${location.origin}/admin/ edit the website.`,
    target_name: app.repo.owner,
    expires_in: '90',
    contents: 'write',
    actions: 'read',
  });
  return `https://github.com/settings/personal-access-tokens/new?${params}`;
}

function showLogin(message) {
  document.title = 'Sign in · Admin';
  const input = h('input', { type: 'password', id: 'token', class: 'input mono', autocomplete: 'off', spellcheck: 'false', placeholder: 'github_pat_…', required: true });
  const remember = h('input', { type: 'checkbox', id: 'remember' });
  const error = h('p', { class: 'login-error', role: 'alert', hidden: !message }, message ?? '');
  const button = h('button', { type: 'submit', class: 'btn btn-primary btn-block' }, 'Sign in');

  const form = h(
    'form',
    {
      class: 'login-card',
      onsubmit: async (event) => {
        event.preventDefault();
        const token = input.value.trim();
        if (!TOKEN_PATTERN.test(token)) {
          error.textContent = 'That doesn\'t look like a GitHub token. Fine-grained tokens start with "github_pat_".';
          error.hidden = false;
          return;
        }
        button.disabled = true;
        button.textContent = 'Checking with GitHub…';
        try {
          await signIn(token, remember.checked);
          storeToken(token, remember.checked);
        } catch (e) {
          error.textContent = explain(e);
          error.hidden = false;
          button.disabled = false;
          button.textContent = 'Sign in';
        }
      },
    },
    h('div', { class: 'login-brand' }, sigil(), h('span', {}, 'Elarion'), h('span', { class: 'login-tag' }, 'admin')),
    h('h1', {}, 'Sign in with a GitHub token'),
    h(
      'p',
      { class: 'muted' },
      'This page edits your website by saving changes to the ',
      h('strong', {}, `${app.repo.owner}/${app.repo.repo}`),
      ' repository. GitHub checks the token; it is never sent anywhere else.'
    ),
    h(
      'ol',
      { class: 'steps' },
      h(
        'li',
        {},
        h('a', { href: tokenUrl(), target: '_blank', rel: 'noopener noreferrer' }, 'Create a token on GitHub', icon('external', 'icon icon-xs')),
        '. Name and permissions are pre-filled (Contents: read & write, Actions: read). Under ',
        h('strong', {}, 'Repository access'),
        ' choose ',
        h('strong', {}, 'Only select repositories'),
        ` → ${app.repo.repo}.`
      ),
      h('li', {}, 'Paste the token here.')
    ),
    h('label', { class: 'field-label', for: 'token' }, 'Access token'),
    input,
    h(
      'label',
      { class: 'check', for: 'remember' },
      remember,
      h('span', {}, 'Keep me signed in on this device. Leave this off on shared computers; otherwise you are signed out when the tab closes.')
    ),
    error,
    button,
    h('p', { class: 'login-foot muted' }, icon('lock', 'icon icon-xs'), 'Lost device? Revoke the token at github.com/settings/personal-access-tokens.')
  );

  root.replaceChildren(h('div', { class: 'login' }, form));
  input.focus();
}

async function signIn(token, remembered) {
  const gh = new GitHub({ token, ...DEPLOY });
  const [user] = await Promise.all([gh.user(), gh.repository()]);
  const file = await gh.readFile(SETTINGS_PATH);
  const settings = normalizeSettings(JSON.parse(file.text));
  Object.assign(app, { gh, user, remembered, fileSha: file.sha, savedJson: serialize(settings), settings: structuredClone(settings), siteUrl: settings.site.url });
  showWorkspace();
  refreshDeployStatus();
}

function signOut() {
  clearToken();
  for (const url of app.blobUrls.values()) URL.revokeObjectURL(url);
  Object.assign(app, { gh: null, user: null, settings: null, savedJson: '', fileSha: '' });
  app.uploads.clear();
  app.blobUrls.clear();
  showLogin('Signed out.');
}

// --- workspace --------------------------------------------------------------------------

function sigil() {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 24 24');
  svg.setAttribute('class', 'sigil');
  svg.setAttribute('aria-hidden', 'true');
  svg.innerHTML = '<path fill="currentColor" d="M12 1.5c.6 4.9 2.6 8.9 10.5 10.5-7.9 1.6-9.9 5.6-10.5 10.5C11.4 17.6 9.4 13.6 1.5 12 9.4 10.4 11.4 6.4 12 1.5z"/>';
  return svg;
}

function showWorkspace() {
  ui.status = h('span', { class: 'status-text' });
  ui.dot = h('span', { class: 'status-dot' });
  ui.deploy = h('a', { class: 'deploy-pill', target: '_blank', rel: 'noopener noreferrer', dataset: { state: 'idle' } }, h('span', { class: 'deploy-dot' }), h('span', { class: 'deploy-text' }, ''));
  ui.publish = h('button', { type: 'button', class: 'btn btn-primary', onclick: () => publish() }, 'Publish');
  ui.undo = h('button', { type: 'button', class: 'icon-btn', title: 'Undo (Ctrl+Z)', 'aria-label': 'Undo', onclick: undo }, icon('undo'));
  ui.redo = h('button', { type: 'button', class: 'icon-btn', title: 'Redo (Ctrl+Shift+Z)', 'aria-label': 'Redo', onclick: redo }, icon('redo'));
  ui.discard = h('button', { type: 'button', class: 'btn btn-ghost', onclick: discard }, 'Discard');
  ui.nav = h('nav', { class: 'sidebar', 'aria-label': 'Settings sections' });
  ui.editor = h('main', { class: 'editor', id: 'editor', tabindex: '-1' });

  const account = h(
    'details',
    { class: 'account' },
    h('summary', { 'aria-label': 'Account' }, app.user.avatar_url ? h('img', { src: app.user.avatar_url, alt: '', width: 28, height: 28 }) : icon('about')),
    h(
      'div',
      { class: 'account-menu' },
      h('p', {}, 'Signed in as ', h('strong', {}, app.user.login)),
      h('p', { class: 'muted' }, app.remembered ? 'Token saved on this device.' : 'Token kept for this tab only.'),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm', onclick: confirmSignOut }, icon('logout'), 'Sign out')
    )
  );

  const pageSelect = h('select', { class: 'input input-sm preview-select', 'aria-label': 'Preview page' });
  pageSelect.addEventListener('change', () => setPreviewPage(pageSelect.value));
  ui.pageSelect = pageSelect;
  ui.hiddenBadge = h('span', { class: 'preview-hidden', hidden: true, title: 'Switched off: visitors cannot see this page' }, icon('eye'), 'Hidden on live site');
  ui.successToggle = h(
    'button',
    { type: 'button', class: 'icon-btn', title: 'Preview the message shown after signing up', 'aria-label': 'Preview the after-sign-up message', 'aria-pressed': String(app.previewSuccess), onclick: () => app.setPreviewSuccess(!app.previewSuccess) },
    icon('check')
  );

  const deviceButton = (device, label) =>
    h('button', { type: 'button', class: 'icon-btn', 'aria-label': label, title: label, 'aria-pressed': String(app.device === device), dataset: { device }, onclick: () => setDevice(device) }, icon(device));
  ui.devices = [deviceButton('desktop', 'Desktop preview'), deviceButton('mobile', 'Mobile preview')];

  ui.frames = [0, 1].map(() => h('iframe', { class: 'preview-frame', title: 'Live preview of the website', sandbox: 'allow-same-origin', hidden: true }));
  ui.stage = h('div', { class: 'preview-stage', dataset: { device: app.device } }, ui.frames);
  ui.previewPane = h(
    'aside',
    { class: 'preview-pane', 'aria-label': 'Preview' },
    h(
      'div',
      { class: 'preview-toolbar' },
      h('span', { class: 'preview-label' }, icon('eye'), 'Preview'),
      ui.hiddenBadge,
      pageSelect,
      ui.successToggle,
      h('div', { class: 'device-toggle' }, ui.devices),
      h('a', { class: 'icon-btn', href: app.siteUrl + '/', target: '_blank', rel: 'noopener noreferrer', title: 'Open live site', 'aria-label': 'Open live site' }, icon('external')),
      h('button', { type: 'button', class: 'btn btn-ghost btn-sm preview-close', onclick: () => togglePreview(false) }, 'Back to editing')
    ),
    ui.stage
  );

  const topbar = h(
    'header',
    { class: 'topbar' },
    h('a', { class: 'topbar-brand', href: app.siteUrl + '/', target: '_blank', rel: 'noopener noreferrer' }, sigil(), h('span', {}, app.settings.site.name), h('span', { class: 'login-tag' }, 'admin')),
    h('div', { class: 'topbar-status', 'aria-live': 'polite' }, ui.dot, ui.status),
    ui.deploy,
    h(
      'div',
      { class: 'topbar-actions' },
      h('button', { type: 'button', class: 'btn btn-ghost preview-open', onclick: () => togglePreview(true) }, icon('eye'), 'Preview'),
      h('div', { class: 'undo-group' }, ui.undo, ui.redo),
      ui.discard,
      ui.publish,
      account
    )
  );

  ui.shell = h('div', { class: 'shell' }, topbar, h('div', { class: 'workspace' }, ui.nav, ui.editor, ui.previewPane));
  root.replaceChildren(ui.shell);

  new ResizeObserver(fitPreview).observe(ui.stage);
  app.previewPage = PANELS.find((p) => p.id === app.panel)?.page ?? 'home';
  renderNav();
  renderPanel();
  updateStatus();
  renderPreview();
}

async function confirmSignOut() {
  if (isDirty()) {
    const choice = await confirmDialog({ title: 'Sign out with unpublished changes?', body: 'Your unpublished changes will be lost.', confirm: 'Sign out', danger: true });
    if (choice !== 'ok') return;
  }
  signOut();
}

function renderNav() {
  ui.nav.replaceChildren(
    ...PANELS.map((p) =>
      h('button', { type: 'button', class: `nav-item${app.panel === p.id ? ' active' : ''}`, 'aria-current': app.panel === p.id ? 'page' : null, onclick: () => app.goto(p.id) }, icon(p.icon), h('span', {}, p.label))
    )
  );
}

function renderPanel() {
  const panel = PANELS.find((p) => p.id === app.panel) ?? PANELS[0];
  const scroll = ui.editor.scrollTop;
  ui.editor.replaceChildren(h('div', { class: 'panel' }, panel.render(app)));
  ui.editor.scrollTop = scroll;
  updateReverts();
}

function togglePreview(show) {
  ui.shell.classList.toggle('show-preview', show);
  fitPreview();
}

// --- change tracking -----------------------------------------------------------------------

function isDirty() {
  return app.uploads.size > 0 || serialize(app.normalized()) !== app.savedJson;
}

let previewTimer;
function changed() {
  updateStatus();
  updateReverts();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(renderPreview, 120);
}

function updateStatus() {
  const dirty = isDirty();
  ui.dot.dataset.state = app.publishing ? 'busy' : dirty ? 'dirty' : 'clean';
  ui.status.textContent = app.publishing ? 'Publishing…' : dirty ? 'Unpublished changes' : 'Everything is published';
  ui.publish.disabled = app.publishing || !dirty;
  ui.discard.hidden = !dirty || app.publishing;
  ui.undo.disabled = app.publishing || !undoStack.length;
  ui.redo.disabled = app.publishing || !redoStack.length;
  document.title = `${dirty ? '• ' : ''}${app.settings.site.name || 'Site'} · Admin`;
}

window.addEventListener('beforeunload', (event) => {
  if (app.settings && isDirty()) event.preventDefault();
});

window.addEventListener('keydown', (event) => {
  if (!(event.ctrlKey || event.metaKey) || !app.settings || !ui.editor) return;
  const key = event.key.toLowerCase();
  if (key === 's') {
    event.preventDefault();
    publish();
  } else if (key === 'z' || key === 'y') {
    // The admin's own history replaces the browser's per-field undo, so every kind of control behaves the same.
    event.preventDefault();
    if (key === 'y' || event.shiftKey) redo();
    else undo();
  }
});

async function discard() {
  const choice = await confirmDialog({ title: 'Discard unpublished changes?', body: 'The editor goes back to what is currently published. Undo (Ctrl+Z) brings your changes back.', confirm: 'Discard', danger: true });
  if (choice !== 'ok') return;
  remember();
  app.settings = JSON.parse(app.savedJson);
  app.uploads.clear();
  changed();
  renderPanel();
}

// --- live preview -------------------------------------------------------------------------

let activeFrame = 0;
let themeUrl = null;
let pendingAnchor = '';
let previewDots = null;

// URLs inside a blob: stylesheet can't be relative (a blob URL has no path to resolve against).
const FONT_BASE = new URL('/assets/fonts/', location.href).href;
const absolute = (src) => (src.startsWith('/') ? new URL(src, location.href).href : src);

let lastPostIndex = 0;

/** Keep the page picker in sync with the settings (post titles change, posts come and go). */
function syncPageSelect(settings) {
  const pages = previewPages(settings);
  if (!pages.some((p) => p.id === app.previewPage)) {
    // The previewed post was renamed or removed: show the post now at the same position, or the news page.
    const posts = sortedPosts(settings);
    const post = app.previewPage.startsWith('post:') ? posts[Math.min(lastPostIndex, posts.length - 1)] : null;
    app.previewPage = post ? `post:${post.slug}` : app.previewPage.startsWith('post:') ? 'news' : 'home';
  }
  if (app.previewPage.startsWith('post:')) lastPostIndex = Math.max(0, sortedPosts(settings).findIndex((p) => `post:${p.slug}` === app.previewPage));
  ui.pageSelect.replaceChildren(...pages.map((p) => h('option', { value: p.id, selected: p.id === app.previewPage }, p.hidden ? `${p.label} (hidden)` : p.label)));
  ui.hiddenBadge.hidden = !pages.find((p) => p.id === app.previewPage)?.hidden;
}

function renderPreview() {
  if (!ui.frames) return;
  const settings = app.normalized();
  syncPageSelect(settings);
  const heroImage = settings.theme.heroImage ? absolute(app.imageSrc(settings.theme.heroImage)) : '';
  const css = themeCss(settings.theme, { imageUrl: heroImage, fontBase: FONT_BASE, effects: settings.effects, textStyles: settings.textStyles, perkIcon: perkCss(settings), nav: settings.nav.look });
  const nextThemeUrl = URL.createObjectURL(new Blob([css], { type: 'text/css' }));
  const html = renderPage(settings, app.previewPage, { preview: true, previewSuccess: app.previewSuccess, themeHref: nextThemeUrl, resolveImage: app.imageSrc });

  const current = ui.frames[activeFrame];
  const next = ui.frames[1 - activeFrame];
  const scrollY = current.contentWindow?.scrollY ?? 0;
  next.onload = () => {
    const doc = next.contentDocument;
    wirePreview(doc);
    // The preview frame may not run scripts, so the admin draws its halftone dots for it.
    previewDots?.destroy();
    const canvas = doc.querySelector('canvas[data-halftone]');
    previewDots = canvas
      ? startHalftoneFromMarkup(canvas, { win: next.contentWindow, raf: (fn) => window.requestAnimationFrame(fn), imageSrc: (src) => absolute(app.imageSrc(src)) })
      : null;
    const anchor = pendingAnchor && doc.getElementById(pendingAnchor);
    if (anchor) anchor.scrollIntoView();
    else next.contentWindow.scrollTo(0, scrollY);
    pendingAnchor = '';
    next.hidden = false;
    current.hidden = true;
    activeFrame = 1 - activeFrame;
    if (themeUrl) URL.revokeObjectURL(themeUrl);
    themeUrl = nextThemeUrl;
  };
  next.srcdoc = html;
}

function wirePreview(doc) {
  doc.addEventListener('submit', (event) => event.preventDefault());
  doc.addEventListener('click', (event) => {
    const anchor = event.target.closest('a[href]');
    // Clicking a text opens its field, unless the click was on a link inside that text.
    const editable = event.target.closest('[data-edit]');
    if (editable && !(anchor && editable.contains(anchor))) {
      event.preventDefault();
      editField(editable.dataset.edit);
      return;
    }
    if (!anchor) return;
    event.preventDefault();
    // The phone menu opens with :target on the live site; the preview toggles it directly.
    if (anchor.matches('.menu-toggle, .menu-close')) {
      doc.getElementById('site-menu')?.classList.toggle('is-open', anchor.matches('.menu-toggle'));
      return;
    }
    const href = anchor.getAttribute('href');
    if (href.startsWith('#')) {
      doc.getElementById(href.slice(1))?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    const url = new URL(href, location.origin);
    const page = url.origin === location.origin ? pageIdForPath(app.normalized(), url.pathname) : null;
    if (page) setPreviewPage(page, url.hash.slice(1));
    else if (href !== '#') window.open(url.href, '_blank', 'noopener,noreferrer');
  });
}

// Which panel holds the field for a text clicked in the preview (first matching prefix wins).
const EDIT_PANELS = [
  ['newsletter.closedMessage', 'newsletter'],
  ['newsletter.confirmed', 'newsletter'],
  ['newsletter.', 'home'],
  ['wishlist.', 'home'],
  ['socialBand.', 'home'],
  ['home.', 'home'],
  ['footer.', 'brand'],
  ['news.', 'news'],
  ['press.', 'press'],
];

/** Open the panel with this settings path, then scroll to its field and focus it. */
function editField(path) {
  const panel = EDIT_PANELS.find(([prefix]) => path.startsWith(prefix))?.[1];
  if (!panel) return;
  app.goto(panel, { follow: false });
  const field = ui.editor.querySelector(`[data-path="${CSS.escape(path)}"]`);
  if (!field) return;
  const input = field.matches('input, textarea') ? field : field.querySelector('input, textarea');
  field.scrollIntoView({ block: 'center', behavior: 'smooth' });
  input?.focus({ preventScroll: true });
  field.classList.remove('flash');
  void field.offsetWidth; // restart the animation
  field.classList.add('flash');
  togglePreview(false);
}

function setPreviewPage(page, anchor = '') {
  if (!ui.frames) return;
  if (page === app.previewPage) {
    if (anchor) ui.frames[activeFrame].contentDocument?.getElementById(anchor)?.scrollIntoView({ behavior: 'smooth' });
    return;
  }
  app.previewPage = page;
  pendingAnchor = anchor;
  ui.frames[activeFrame].contentWindow?.scrollTo(0, 0);
  renderPreview();
}

function setDevice(device) {
  app.device = device;
  ui.stage.dataset.device = device;
  for (const button of ui.devices) button.setAttribute('aria-pressed', String(button.dataset.device === device));
  fitPreview();
}

function fitPreview() {
  if (!ui.stage) return;
  const width = app.device === 'mobile' ? MOBILE_WIDTH : DESKTOP_WIDTH;
  const available = ui.stage.clientWidth - (app.device === 'mobile' ? 32 : 0);
  const scale = Math.min(1, available / width);
  const height = (ui.stage.clientHeight - (app.device === 'mobile' ? 32 : 0)) / scale;
  for (const frame of ui.frames) {
    frame.style.width = `${width}px`;
    frame.style.height = `${height}px`;
    frame.style.transform = `scale(${scale})`;
  }
}

// --- uploads ---------------------------------------------------------------------------------

const UPLOAD_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

/**
 * Re-encodes the image in the browser: resizes it and strips metadata such as GPS location.
 * SVG is not accepted, because an SVG file can contain scripts.
 */
async function processUpload(file, { maxWidth = 1600, maxHeight = 1600, format = 'image/webp', quality = 0.86, name = 'image' } = {}) {
  if (!UPLOAD_TYPES.includes(file.type)) throw new Error('Use a PNG, JPEG, WebP or GIF image.');
  if (file.size > 15 * 1024 * 1024) throw new Error('That image is larger than 15 MB.');

  let blob = file;
  if (file.type === 'image/gif') {
    if (file.size > 3 * 1024 * 1024) throw new Error('GIFs must be under 3 MB.');
  } else {
    const bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' });
    const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);
    const canvas = h('canvas', { width: Math.round(bitmap.width * scale), height: Math.round(bitmap.height * scale) });
    const context = canvas.getContext('2d');
    context.imageSmoothingQuality = 'high';
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close();
    blob = await new Promise((resolve) => canvas.toBlob(resolve, format, quality));
    if (!blob) throw new Error('This browser could not process the image.');
  }

  const ext = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'image/gif': 'gif' }[blob.type] ?? 'png';
  const sitePath = `/assets/uploads/${slugify(name, 'image')}-${Date.now().toString(36)}.${ext}`;
  app.uploads.set(sitePath, { repoPath: `public${sitePath}`, base64: await blobToBase64(blob) });
  app.blobUrls.set(sitePath, URL.createObjectURL(blob));
  return sitePath;
}

// --- publishing ---------------------------------------------------------------------------------

const AREA_NAMES = {
  site: 'site details',
  nav: 'menu',
  home: 'home page',
  socialBand: 'social band',
  textStyles: 'text styles',
  footer: 'footer',
  effects: 'effects',
  newsletter: 'newsletter',
  wishlist: 'Steam wishlist',
  theme: 'appearance',
  news: 'news',
  press: 'press kit',
  socials: 'social links',
  privacy: 'privacy policy',
  legal: 'legal notice',
  seo: 'SEO',
};

function commitMessage(before, after, uploads) {
  let changedAreas = [];
  try {
    const a = JSON.parse(before);
    const b = JSON.parse(after);
    changedAreas = Object.keys(AREA_NAMES).filter((key) => JSON.stringify(a[key]) !== JSON.stringify(b[key]));
  } catch {
    // first publish or unreadable old file
  }
  const what = changedAreas.length ? changedAreas.map((k) => AREA_NAMES[k]).join(', ') : 'site settings';
  return `Update ${what} via admin${uploads ? ` (+${uploads} image${uploads === 1 ? '' : 's'})` : ''}`;
}

async function publish({ force = false } = {}) {
  if (app.publishing || !isDirty()) return;
  const normalized = app.normalized();
  const json = serialize(normalized);
  const uploads = [...app.uploads].filter(([sitePath]) => json.includes(JSON.stringify(sitePath)));
  const files = [{ path: SETTINGS_PATH, content: json, encoding: 'utf-8' }, ...uploads.map(([, u]) => ({ path: u.repoPath, content: u.base64, encoding: 'base64' }))];

  let conflict = false;
  app.publishing = true;
  ui.publish.classList.add('is-loading');
  updateStatus();
  try {
    const { commit, blobs } = await app.gh.commit({
      message: commitMessage(app.savedJson, json, uploads.length),
      files,
      expect: force ? null : { path: SETTINGS_PATH, sha: app.fileSha },
    });
    app.fileSha = blobs[SETTINGS_PATH];
    app.savedJson = json;
    app.settings = structuredClone(normalized);
    app.uploads.clear();
    toast('Published. The live site updates in about a minute.');
    renderPanel();
    watchDeploy(commit.sha);
  } catch (error) {
    if (error instanceof ConflictError) conflict = true;
    else toast(explain(error), 'error');
  } finally {
    app.publishing = false;
    ui.publish.classList.remove('is-loading');
    updateStatus();
  }

  if (conflict) {
    const choice = await confirmDialog({
      title: 'The settings changed on GitHub',
      body: 'Someone (or another browser tab) published since you opened the editor. You can overwrite their version with yours, or reload theirs and lose your unpublished changes.',
      confirm: 'Overwrite with mine',
      extra: 'Reload theirs',
      danger: true,
    });
    if (choice === 'ok') await publish({ force: true });
    if (choice === 'extra') await reloadFromGitHub();
  }
}

async function reloadFromGitHub() {
  const file = await app.gh.readFile(SETTINGS_PATH);
  const settings = normalizeSettings(JSON.parse(file.text));
  remember();
  Object.assign(app, { fileSha: file.sha, savedJson: serialize(settings), settings: structuredClone(settings) });
  app.uploads.clear();
  changed();
  renderPanel();
  toast('Loaded the latest published settings.');
}

function setDeploy(state, text, url) {
  ui.deploy.dataset.state = state;
  ui.deploy.querySelector('.deploy-text').textContent = text;
  if (url) ui.deploy.href = url;
  else ui.deploy.removeAttribute('href');
}

let deployWatch = 0;
async function watchDeploy(sha) {
  const watchId = ++deployWatch;
  setDeploy('pending', 'Deploying…');
  const started = Date.now();
  while (Date.now() - started < 8 * 60 * 1000 && watchId === deployWatch) {
    await wait(5000);
    let run;
    try {
      run = await app.gh.latestRun(sha);
    } catch (error) {
      if (error.status === 403 || error.status === 404) return setDeploy('unknown', 'Published · live in ~1 min');
      continue;
    }
    if (!run || watchId !== deployWatch) continue;
    if (run.status === 'completed') {
      return run.conclusion === 'success' ? setDeploy('live', 'Live', run.html_url) : setDeploy('failed', 'Deploy failed', run.html_url);
    }
    setDeploy('pending', run.status === 'queued' ? 'Queued…' : 'Deploying…', run.html_url);
  }
  if (watchId === deployWatch) setDeploy('unknown', 'Deploy still running', `https://github.com/${app.repo.owner}/${app.repo.repo}/actions`);
}

async function refreshDeployStatus() {
  try {
    const run = await app.gh.latestRun();
    if (!run) return setDeploy('idle', '');
    if (run.status !== 'completed') return watchDeploy(run.head_sha);
    setDeploy(run.conclusion === 'success' ? 'live' : 'failed', run.conclusion === 'success' ? 'Live' : 'Last deploy failed', run.html_url);
  } catch {
    setDeploy('idle', '');
  }
}

// --- presets, history, backup -------------------------------------------------------------------

function applyPreset(id) {
  const preset = PRESETS[id];
  const theme = app.settings.theme;
  const keepImage = theme.heroBackground === 'image';
  remember();
  theme.preset = id;
  theme.colors = { ...preset.colors };
  for (const key of PRESET_KEYS) theme[key] = preset[key];
  if (keepImage) theme.heroBackground = 'image'; // an uploaded background beats the preset's pattern
  changed();
  renderPanel();
}

async function loadVersion(sha) {
  if (isDirty()) {
    const choice = await confirmDialog({ title: 'Replace unpublished changes?', body: 'Loading an older version replaces what is in the editor now.', confirm: 'Load version', danger: true });
    if (choice !== 'ok') return;
  }
  try {
    const file = await app.gh.readFile(SETTINGS_PATH, sha);
    remember();
    app.settings = normalizeSettings(JSON.parse(file.text));
    changed();
    toast('Older version loaded. Check the preview, then Publish to restore it.');
    app.goto('overview');
  } catch (error) {
    toast(explain(error), 'error');
  }
}

function exportJson() {
  const blob = new Blob([serialize(app.normalized())], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = h('a', { href: url, download: `site-settings-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function importJson(file) {
  try {
    if (file.size > 1024 * 1024) throw new Error('That file is too large to be a settings backup.');
    const data = JSON.parse(await file.text());
    const choice = await confirmDialog({ title: 'Import these settings?', body: 'They replace what is in the editor. Nothing goes live until you publish.', confirm: 'Import' });
    if (choice !== 'ok') return;
    remember();
    app.settings = normalizeSettings(data);
    changed();
    renderPanel();
    toast('Settings imported. Check the preview, then Publish.');
  } catch (error) {
    toast(error instanceof SyntaxError ? 'That file is not valid JSON.' : error.message, 'error');
  }
}

async function resetDefaults() {
  const choice = await confirmDialog({
    title: 'Reset everything to the defaults?',
    body: 'All texts, news posts, press kit content, colours and settings in the editor go back to the starting template. Nothing goes live until you publish, and older versions stay in History.',
    confirm: 'Reset',
    danger: true,
  });
  if (choice !== 'ok') return;
  remember();
  app.settings = structuredClone(DEFAULT_SETTINGS);
  changed();
  renderPanel();
}

// --- start --------------------------------------------------------------------------------------

function loadFontSamples() {
  const css = [
    ...Object.keys(FONTS).map((id) => fontFaces(id, FONT_BASE)),
    ...Object.keys(FONTS).map((id) => `.font-sample[data-font="${id}"] { font-family: ${fontStack(id)}; }`),
  ].join('\n');
  document.head.append(h('link', { rel: 'stylesheet', href: URL.createObjectURL(new Blob([css], { type: 'text/css' })) }));
}

loadFontSamples();
const saved = storedToken();
if (saved) {
  root.replaceChildren(h('div', { class: 'login' }, h('p', { class: 'muted' }, 'Signing in…')));
  signIn(saved.token, saved.remembered).catch((error) => {
    clearToken();
    showLogin(explain(error));
  });
} else {
  showLogin();
}
