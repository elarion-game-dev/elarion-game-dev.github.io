// Renders every public page from the settings object. Used by the build (Node) and by the
// admin's live preview (browser), so what you see in the preview is exactly what gets published.

import { BRAND_ICONS } from './icons.mjs';
import { markdown } from './markdown.mjs';
import { resolveProvider } from './providers.mjs';
import { NAV_IDS } from './settings.mjs';
import { preloadFont, themeCss } from './themes.mjs';
import { esc, formatDate } from './util.mjs';

// --- icons -------------------------------------------------------------------

const SIGIL_PATH = 'M12 1.5c.6 4.9 2.6 8.9 10.5 10.5-7.9 1.6-9.9 5.6-10.5 10.5C11.4 17.6 9.4 13.6 1.5 12 9.4 10.4 11.4 6.4 12 1.5z';
const STROKE = {
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  lock: '<rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/>',
  shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6L12 3z"/><path d="m9 12 2 2 4-4"/>',
  check: '<path d="m5 12.5 4.5 4.5L19 7.5"/>',
  hourglass: '<path d="M6 3h12M6 21h12M7.5 3c0 4.5 4.5 5.5 4.5 9s-4.5 4.5-4.5 9M16.5 3c0 4.5-4.5 5.5-4.5 9s4.5 4.5 4.5 9"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
  download: '<path d="M12 4v12M7 11l5 5 5-5M5 20h14"/>',
  play: '<path d="M7 4.5v15l12.5-7.5z"/>',
  website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  rss: '<path d="M5 4.5a14.5 14.5 0 0 1 14.5 14.5M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.25"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
};

const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${STROKE[name]}</svg>`;
const sigil = (cls = 'sigil') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${SIGIL_PATH}"/></svg>`;

function brandIcon(platform) {
  const brand = BRAND_ICONS[platform];
  if (brand) return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${brand.path}"/></svg>`;
  return icon(STROKE[platform] ? platform : 'website');
}

export function faviconSvg(accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${accent}" d="${SIGIL_PATH}"/></svg>\n`;
}

// --- pages -------------------------------------------------------------------

const STATIC_PAGES = {
  home: { path: '/', file: 'index.html', nav: 'home' },
  news: { path: '/news/', file: 'news/index.html', nav: 'news' },
  press: { path: '/press/', file: 'press/index.html', nav: 'press' },
  privacy: { path: '/privacy/', file: 'privacy/index.html', title: 'Privacy policy' },
  confirmed: { path: '/confirmed/', file: 'confirmed/index.html', title: 'Subscription confirmed', noindex: true },
  legal: { path: '/legal/', file: 'legal/index.html' },
  notfound: { path: '/404.html', file: '404.html', title: 'Page not found', noindex: true },
};
const NAV_PATHS = { home: '/', news: '/news/', press: '/press/' };

/** Markdown-ish text as a plain one-line description. */
function plain(text, max = 200) {
  const out = String(text ?? '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  return out.length > max ? `${out.slice(0, max - 1).trimEnd()}…` : out;
}

export function sortedPosts(settings) {
  return [...settings.news.posts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
}

/** Everything the layout needs to know about one page. Page ids: home, news, press, … and "post:<slug>". */
export function pageInfo(settings, id) {
  if (id.startsWith('post:')) {
    const post = settings.news.posts.find((p) => p.slug === id.slice(5));
    if (!post) return null;
    return {
      id,
      kind: 'post',
      post,
      path: `/news/${post.slug}/`,
      file: `news/${post.slug}/index.html`,
      nav: 'news',
      title: post.title || 'Untitled post',
      description: plain(post.summary || post.body),
      image: post.image,
      ogType: 'article',
    };
  }
  const base = STATIC_PAGES[id];
  if (!base) return null;
  const titles = { news: settings.news.heading, press: settings.press.heading, legal: settings.legal.heading };
  const descriptions = { news: plain(settings.news.intro), press: plain(settings.press.intro) };
  return { id, kind: id, ...base, title: base.title ?? titles[id], description: descriptions[id] };
}

/** Page ids that exist on the live site. */
export function livePages(settings) {
  return [
    'home',
    'privacy',
    'confirmed',
    'notfound',
    ...(settings.nav.news.enabled ? ['news', ...settings.news.posts.map((p) => `post:${p.slug}`)] : []),
    ...(settings.nav.press.enabled ? ['press'] : []),
    ...(settings.legal.enabled ? ['legal'] : []),
  ];
}

/** Every page the admin can preview, including ones that are switched off on the live site. */
export function previewPages(settings) {
  const live = new Set(livePages(settings));
  const pages = [
    ['home', 'Home'],
    ['news', 'News'],
    ...sortedPosts(settings).map((p) => [`post:${p.slug}`, `News: ${p.title || 'Untitled'}`]),
    ['press', 'Press kit'],
    ['confirmed', 'After confirming email'],
    ['privacy', 'Privacy policy'],
    ['legal', 'Legal notice'],
    ['notfound', '404'],
  ];
  return pages.map(([id, label]) => ({ id, label, hidden: !live.has(id) }));
}

/** Page id for a site path such as "/news/welcome/", or null. */
export function pageIdForPath(settings, pathname) {
  const match = pathname.match(/^\/news\/([a-z0-9-]+)\/?$/);
  if (match) return settings.news.posts.some((p) => p.slug === match[1]) ? `post:${match[1]}` : null;
  const found = Object.entries(STATIC_PAGES).find(([, page]) => page.path === pathname || (page.path !== '/' && page.path === `${pathname}/`));
  return found ? found[0] : pathname === '/index.html' ? 'home' : null;
}

// --- shared building blocks -------------------------------------------------

function absolute(settings, path) {
  if (!path) return '';
  return path.startsWith('/') ? settings.site.url + path : path;
}

function contentSecurityPolicy(provider) {
  const sends = provider.ready && provider.responds !== 'navigate' ? provider.origin : "'none'";
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    "img-src 'self' data:",
    "font-src 'self'",
    `connect-src ${sends}`,
    `form-action 'self'${provider.ready ? ' ' + provider.origin : ''}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function brand(settings, ctx) {
  const logo = settings.theme.logo
    ? `<img class="brand-logo" src="${esc(ctx.img(settings.theme.logo))}" alt="" width="36" height="36">`
    : sigil('sigil brand-sigil');
  return `<a class="brand" href="/">${logo}<span class="brand-name">${esc(settings.site.name)}</span></a>`;
}

const EXTRA_SOCIAL_NAMES = { email: 'Email', website: 'Website', rss: 'RSS feed' };

/**
 * Social links for one place: "menu", "band" or "all". Links without a URL only appear in the admin
 * preview (faded), so the owner can see where they will go before filling them in.
 */
function socialItems(settings, ctx, where) {
  return settings.socials
    .filter((s) => (where === 'menu' ? s.inMenu : where === 'band' ? s.inBand : true) && (s.url || ctx.preview))
    .map((s) => {
      const name = s.label || BRAND_ICONS[s.platform]?.title || EXTRA_SOCIAL_NAMES[s.platform] || 'Link';
      if (!s.url) return `<li><a href="#" class="is-placeholder" aria-label="${esc(name)} (no link yet)" title="${esc(name)}: add the link under Social links">${brandIcon(s.platform)}</a></li>`;
      const external = /^https?:/.test(s.url);
      return `<li><a href="${esc(s.url)}"${external ? ' rel="me noopener"' : ''} aria-label="${esc(name)}" title="${esc(name)}">${brandIcon(s.platform)}</a></li>`;
    })
    .join('');
}

function socialLinks(settings, ctx, cls, where = 'all') {
  const items = socialItems(settings, ctx, where);
  return items ? `<ul class="${cls}">${items}</ul>` : '';
}

function header(settings, ctx, info) {
  const nav = settings.nav;
  const divider = nav.dividers ? `<li class="nav-divider" aria-hidden="true">${sigil()}</li>` : '';
  const items = NAV_IDS.filter((id) => nav[id].enabled).map(
    (id) => `<li><a class="nav-link" href="${NAV_PATHS[id]}"${info.nav === id ? ' aria-current="page"' : ''}>${esc(nav[id].label)}</a></li>`
  );
  // With "Home" hidden from the menu, the star mark links home instead.
  if (!nav.home.enabled && info.id !== 'home') items.unshift(`<li><a class="nav-link nav-mark" href="/" aria-label="${esc(settings.site.name)}: home">${sigil()}</a></li>`);
  const socials = nav.showSocials ? socialItems(settings, ctx, 'menu') : '';
  const classic = nav.style === 'classic';
  // In the classic header the brand sits on the left, except on the home page where the big logo shows the name.
  const brandHtml = classic && !(info.id === 'home' && settings.home.showLogo) ? brand(settings, ctx) : '';
  if (!items.length && !socials && !brandHtml) return '';
  return `<header class="site-header" data-nav="${nav.style}">
  <a class="menu-toggle" href="#site-menu" aria-controls="site-menu" aria-expanded="false" aria-label="Menu">${icon('menu')}</a>
  <nav class="nav-bar" id="site-menu" aria-label="Main">
    ${brandHtml}
    ${items.length ? `<ul class="nav-links">${items.join(divider)}</ul>` : ''}
    ${socials ? `${items.length && nav.dividers ? `<span class="nav-divider nav-divider-socials" aria-hidden="true">${sigil()}</span>` : ''}<ul class="nav-socials">${socials}</ul>` : ''}
    <a class="menu-close" href="#" aria-label="Close menu">${icon('close')}</a>
  </nav>
</header>`;
}

/** "Follow us" band at the bottom of the page. */
function socialBand(settings, ctx, info) {
  const band = settings.socialBand;
  if (band.show === 'off' || (band.show === 'home' && info.id !== 'home')) return '';
  const links = socialLinks(settings, ctx, 'social-tiles', 'band');
  if (!links) return '';
  return `<section class="social-band"${band.heading ? ' aria-labelledby="social-title"' : ' aria-label="Social links"'}>
  <div class="container">
    ${band.heading ? `<h2 id="social-title">${esc(band.heading)}</h2>` : ''}
    ${links}
  </div>
</section>`;
}

function footer(settings, ctx) {
  const links = [
    `<a href="/privacy/">Privacy policy</a>`,
    settings.nav.press.enabled ? `<a href="/press/">${esc(settings.nav.press.label)}</a>` : '',
    settings.legal.enabled ? `<a href="/legal/">${esc(settings.legal.heading)}</a>` : '',
    settings.site.contactEmail ? `<a href="mailto:${esc(settings.site.contactEmail)}">Contact</a>` : '',
  ].filter(Boolean);
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <p class="copyright">© ${ctx.year} ${esc(settings.site.copyrightName || settings.site.name)}</p>
    <nav class="footer-nav" aria-label="Footer">${links.join('')}</nav>
    ${settings.footer.note ? `<p class="footer-note">${esc(settings.footer.note)}</p>` : ''}
  </div>
</footer>`;
}

/** The canvas the halftone script draws into (see assets/js/halftone.js). */
function halftoneCanvas(settings, cls) {
  const h = settings.effects.halftone;
  const t = settings.theme;
  const image = t.heroBackground === 'image' && t.heroImage ? t.heroImage : '';
  return `<canvas class="halftone ${cls}" data-halftone data-color="${h.color}" data-size="${h.size}" data-angle="${h.angle}" data-mouse="${h.mouse}"${image ? ` data-image="${esc(image)}"` : ''} aria-hidden="true"></canvas>`;
}

function layout(settings, ctx, info, main) {
  const s = settings;
  const t = s.theme;
  const title = info.id === 'home' ? s.seo.title : `${info.title} · ${s.site.name}`;
  const description = info.description || s.seo.description;
  const noindex = !s.seo.indexable || info.noindex;
  const canonical = s.site.url + info.path;
  const ogImage = absolute(s, info.image || s.seo.ogImage);
  const ogAlt = info.image ? info.post?.imageAlt ?? '' : s.seo.ogImageAlt;
  const v = ctx.version ? `?v=${esc(ctx.version)}` : '';
  const favicon = t.favicon ? ctx.img(t.favicon) : `/assets/img/favicon.svg${v}`;
  const font = ctx.preview ? '' : preloadFont(t.headingFont);
  const feed = s.nav.news.enabled ? `<link rel="alternate" type="application/rss+xml" title="${esc(`${s.news.heading} · ${s.site.name}`)}" href="/news/feed.xml">\n` : '';
  const crt = s.effects.crt;
  const crtAttrs = crt.enabled ? ` data-crt${crt.flicker ? ' data-crt-flicker' : ''}${crt.rgbText ? ' data-crt-rgb' : ''}${crt.vignette ? ' data-crt-vignette' : ''}` : '';
  // The home page draws its dots inside the hero; other pages get a fixed layer behind everything.
  const dots = s.effects.halftone.enabled && s.effects.halftone.where === 'all' && info.id !== 'home' ? `${halftoneCanvas(s, 'halftone-fixed')}\n` : '';

  return `<!doctype html>
<html lang="${esc(s.site.language)}" data-hero="${t.heroBackground}" data-cards="${t.cardStyle}" data-buttons="${t.buttonStyle}" data-form="${t.formLayout}" data-nav="${s.nav.style}" data-motion="${t.animations ? 'on' : 'off'}"${crtAttrs}${ctx.preview ? ' data-preview' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${ctx.preview ? '' : `<meta http-equiv="Content-Security-Policy" content="${esc(contentSecurityPolicy(ctx.provider))}">\n`}<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="${t.colors.bg}">
<meta property="og:type" content="${info.ogType ?? 'website'}">
<meta property="og:site_name" content="${esc(s.site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n<meta property="og:image:alt" content="${esc(ogAlt)}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="icon" href="${esc(favicon)}">
<link rel="apple-touch-icon" href="${esc(t.favicon ? favicon : '/assets/img/apple-touch-icon.png')}">
<link rel="manifest" href="/site.webmanifest">
${feed}${font ? `<link rel="preload" href="/assets/fonts/${font}" as="font" type="font/woff2" crossorigin>\n` : ''}<link rel="stylesheet" href="${esc(ctx.themeHref ?? `/assets/css/theme.css${v}`)}">
<link rel="stylesheet" href="/assets/css/site.css${v}">
${ctx.preview ? '' : `<script type="module" src="/assets/js/site.js${v}"></script>\n`}</head>
<body class="page-${info.kind}">
${dots}<a class="skip-link" href="#main">Skip to content</a>
${header(s, ctx, info)}
<main id="main" tabindex="-1">
${main}
${socialBand(s, ctx, info)}
</main>
${footer(s, ctx)}
</body>
</html>
`;
}

// --- newsletter sign-up --------------------------------------------------------

function consentHtml(nl) {
  const link = '<a href="/privacy/">privacy policy</a>';
  const text = esc(nl.consentText);
  return text.includes('{privacy}') ? text.replace('{privacy}', link) : `${text} (${link})`;
}

function perks(settings) {
  const nl = settings.newsletter;
  if (!nl.showPerks || !nl.perks.length) return '';
  return `<ul class="perks" aria-label="What subscribers get">${nl.perks.map((p) => `<li>${sigil('sigil perk-icon')}<span>${esc(p)}</span></li>`).join('')}</ul>`;
}

function wishlist(settings, ctx, cls = '') {
  const w = settings.wishlist;
  // The preview shows the button before a Steam link exists, so it can be styled and worded.
  const url = w.url || (ctx.preview ? '#' : '');
  if (!w.enabled || !url) return '';
  return `<div class="wishlist${cls ? ` ${cls}` : ''}">
        ${w.text ? `<p>${esc(w.text)}</p>` : ''}
        <a class="btn btn-steam" href="${esc(url)}" target="_blank" rel="noopener">${brandIcon('steam')}<span>${esc(w.buttonLabel)}</span></a>
      </div>`;
}

/** The email form and its success message. Without a connected provider, a "coming soon" notice. */
function signup(settings, ctx) {
  const nl = settings.newsletter;
  const p = ctx.provider;
  const showSuccess = ctx.preview && ctx.previewSuccess;
  if (!p.ready && !showSuccess) return `<div class="subscribe-closed">${icon('hourglass')}<p>${esc(nl.closedMessage)}</p></div>`;

  const hidden = p.ready
    ? Object.entries(p.hidden)
        .map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`)
        .join('')
    : '';
  const form = p.ready
    ? `<form class="subscribe-form" method="post" action="${esc(p.action)}" accept-charset="utf-8" data-subscribe data-provider="${p.id}" data-responds="${p.responds}"${showSuccess ? ' hidden' : ''}>
      ${hidden}
      <label class="field-label" for="subscribe-email">${esc(nl.emailLabel)}</label>
      <div class="field-row">
        <input class="input" id="subscribe-email" type="email" name="${esc(p.emailField)}" required maxlength="254" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="${esc(nl.placeholder)}">
        <button class="btn btn-primary btn-submit" type="submit"><span class="btn-label">${esc(nl.buttonLabel)}</span><span class="spinner" aria-hidden="true"></span></button>
      </div>
      <div class="hp-field" aria-hidden="true">
        <label for="subscribe-website">Leave this field empty</label>
        <input id="subscribe-website" type="text" tabindex="-1" autocomplete="off" data-honeypot>
      </div>
      ${nl.trustText ? `<p class="trust">${icon('lock')}<span>${esc(nl.trustText)}</span></p>` : ''}
      ${
        nl.requireConsent
          ? `<label class="consent"><input type="checkbox" required data-consent><span>${consentHtml(nl)}</span></label>`
          : `<p class="consent consent-text">${consentHtml(nl)}</p>`
      }
      <p class="form-status" role="status" aria-live="polite" data-status></p>
    </form>`
    : '';

  return `<div class="signup" data-signup>
    ${form}
    <div class="subscribe-success" data-success${showSuccess ? '' : ' hidden'} tabindex="-1">
      <div class="success-icon">${icon('mail')}</div>
      <h3>${esc(nl.successTitle)}</h3>
      <div class="prose">${markdown(nl.successBody)}</div>
      ${wishlist(settings, ctx)}
    </div>
  </div>`;
}

/** Compact sign-up box at the bottom of news pages. */
function signupBox(settings, ctx) {
  if (!settings.newsletter.showOnNews) return '';
  return `<section class="signup-band" aria-labelledby="signup-box-title">
  <div class="container narrow">
    <div class="signup-box card" id="subscribe">
      <h2 id="signup-box-title" class="signup-hook">${esc(settings.newsletter.heading)}</h2>
      ${perks(settings)}
      ${signup(settings, ctx)}
    </div>
  </div>
</section>`;
}

// --- home ---------------------------------------------------------------------

function homePage(settings, ctx) {
  const h = settings.home;
  const nl = settings.newsletter;
  const logo = h.showLogo
    ? `<h1 class="home-logo">${
        h.logoImage
          ? `<img src="${esc(ctx.img(h.logoImage))}" alt="${esc(h.logoImageAlt || settings.site.name)}">`
          : `${sigil('sigil wordmark-sigil')}<span class="wordmark">${esc(settings.site.name)}</span>`
      }</h1>`
    : `<h1 class="visually-hidden">${esc(settings.site.name)}</h1>`;

  const about =
    h.about.enabled && (h.about.heading || h.about.body)
      ? `<section class="home-block home-about"${h.about.heading ? ' aria-labelledby="about-title"' : ''}>
      ${h.about.heading ? `<h2 id="about-title">${esc(h.about.heading)}</h2>` : ''}
      <div class="prose">${markdown(h.about.body)}</div>
    </section>`
      : '';

  const signupBlock = `<section class="home-block home-signup" id="subscribe" aria-labelledby="signup-title">
      <h2 id="signup-title" class="signup-hook">${esc(nl.heading)}</h2>
      ${nl.body ? `<div class="prose signup-body">${markdown(nl.body)}</div>` : ''}
      ${perks(settings)}
      ${signup(settings, ctx)}
    </section>`;

  const blocks = h.layout === 'signup-first' ? [signupBlock, about] : [about, signupBlock];
  const dots = settings.effects.halftone.enabled ? halftoneCanvas(settings, 'halftone-hero') : '';

  return `<section class="home-hero">
  <div class="hero-bg" aria-hidden="true"><span class="hero-layer hero-layer-a"></span><span class="hero-layer hero-layer-b"></span>${dots}</div>
  <div class="container home-column">
    ${logo}
    ${blocks.filter(Boolean).join('\n    ')}
  </div>
</section>`;
}

// --- news -----------------------------------------------------------------------

function postDate(settings, post) {
  return post.date ? `<time datetime="${post.date}">${esc(formatDate(post.date, settings.site.language))}</time>` : '';
}

function newsPage(settings, ctx) {
  const n = settings.news;
  const posts = sortedPosts(settings);
  const cards = posts
    .map(
      (p) => `<article class="news-card card">
        ${p.image ? `<div class="news-media"><img src="${esc(ctx.img(p.image))}" alt="${esc(p.imageAlt)}" loading="lazy" decoding="async"></div>` : ''}
        <div class="news-body">
          ${postDate(settings, p)}
          <h2 class="news-title"><a class="stretched-link" href="/news/${p.slug}/">${esc(p.title || 'Untitled post')}</a></h2>
          ${p.summary ? `<p class="news-summary">${esc(p.summary)}</p>` : ''}
          <span class="link-arrow" aria-hidden="true">${esc(n.readMoreLabel)} ${icon('arrow')}</span>
        </div>
      </article>`
    )
    .join('\n');
  return `<section class="page page-list">
  <div class="container">
    <header class="page-head">
      <h1>${esc(n.heading)}</h1>
      ${n.intro ? `<div class="prose lead">${markdown(n.intro)}</div>` : ''}
      <p class="page-head-links"><a class="feed-link" href="/news/feed.xml">${icon('rss')}<span>RSS feed</span></a></p>
    </header>
    ${posts.length ? `<div class="news-grid">${cards}</div>` : `<p class="empty-state">${icon('hourglass')}<span>No news yet. Subscribe to hear first.</span></p>`}
  </div>
</section>
${signupBox(settings, ctx)}`;
}

function postPage(settings, ctx, post) {
  return `<article class="page post">
  <div class="container narrow">
    <p class="back-link"><a href="/news/">${icon('back')}<span>${esc(settings.news.heading)}</span></a></p>
    <header class="post-head">
      ${postDate(settings, post)}
      <h1>${esc(post.title || 'Untitled post')}</h1>
      ${post.summary ? `<p class="lead">${esc(post.summary)}</p>` : ''}
    </header>
    ${post.image ? `<figure class="post-cover"><img src="${esc(ctx.img(post.image))}" alt="${esc(post.imageAlt)}"></figure>` : ''}
    <div class="prose post-body">${markdown(post.body)}</div>
    ${post.url ? `<p class="actions"><a class="btn btn-ghost" href="${esc(post.url)}"${/^https?:/.test(post.url) ? ' rel="noopener"' : ''}>${esc(post.linkLabel || settings.news.readMoreLabel)} ${icon('arrow')}</a></p>` : ''}
  </div>
</article>
${signupBox(settings, ctx)}`;
}

function rssFeed(settings) {
  const s = settings;
  const items = sortedPosts(s)
    .map((p) => {
      const url = `${s.site.url}/news/${p.slug}/`;
      const date = p.date ? `<pubDate>${new Date(`${p.date}T12:00:00Z`).toUTCString()}</pubDate>` : '';
      return `  <item><title>${esc(p.title)}</title><link>${esc(url)}</link><guid isPermaLink="true">${esc(url)}</guid>${date}<description>${esc(p.summary || plain(p.body, 300))}</description></item>`;
    })
    .join('\n');
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
<channel>
  <title>${esc(`${s.news.heading} · ${s.site.name}`)}</title>
  <link>${esc(s.site.url)}/news/</link>
  <description>${esc(plain(s.news.intro) || s.seo.description)}</description>
  <language>${esc(s.site.language)}</language>
  <atom:link href="${esc(s.site.url)}/news/feed.xml" rel="self" type="application/rss+xml"/>
${items}
</channel>
</rss>
`;
}

// --- press kit ------------------------------------------------------------------

function factsheet(settings, ctx, section) {
  const pr = settings.press;
  const rows = pr.facts.map(
    (f) => `<div class="fact"><dt>${esc(f.label)}</dt><dd>${f.url ? `<a href="${esc(f.url)}"${/^https?:/.test(f.url) ? ' rel="noopener"' : ''}>${esc(f.value || f.url)}</a>` : esc(f.value)}</dd></div>`
  );
  if (settings.site.contactEmail) rows.push(`<div class="fact"><dt>Press contact</dt><dd><a href="mailto:${esc(settings.site.contactEmail)}">${esc(settings.site.contactEmail)}</a></dd></div>`);
  const socials = socialLinks(settings, ctx, 'socials socials-small');
  if (socials) rows.push(`<div class="fact"><dt>Social</dt><dd>${socials}</dd></div>`);
  if (!rows.length) return '';
  return `<h2 id="press-factsheet-title">${esc(section.heading)}</h2>\n      <dl class="facts">${rows.join('')}</dl>`;
}

function pressContent(settings, id) {
  const pr = settings.press;
  switch (id) {
    case 'description':
    case 'history':
      return pr[id] ? `<div class="prose">${markdown(pr[id])}</div>` : '';
    case 'features':
      return pr.features.length ? `<ul class="feature-list">${pr.features.map((f) => `<li>${sigil('sigil perk-icon')}<span>${esc(f)}</span></li>`).join('')}</ul>` : '';
    case 'images': {
      const items = pr.images.filter((i) => i.src);
      return items.length
        ? `<div class="press-gallery">${items
            .map(
              (i) => `<figure class="press-image">
          <a href="${esc(i.src)}" download><img src="${esc(i.src)}" alt="${esc(i.caption)}" loading="lazy" decoding="async"></a>
          <figcaption>${i.caption ? `<span>${esc(i.caption)}</span>` : ''}<a class="download-link" href="${esc(i.src)}" download>${icon('download')}Download</a></figcaption>
        </figure>`
            )
            .join('')}</div>`
        : '';
    }
    case 'logos': {
      const items = pr.logos.filter((i) => i.src);
      return items.length
        ? `<div class="press-logos">${items
            .map(
              (i) => `<figure class="press-logo">
          <div class="press-logo-tile tile-${i.background}"><img src="${esc(i.src)}" alt="${esc(i.label)}" loading="lazy" decoding="async"></div>
          <figcaption>${i.label ? `<span>${esc(i.label)}</span>` : ''}<a class="download-link" href="${esc(i.src)}" download>${icon('download')}Download</a></figcaption>
        </figure>`
            )
            .join('')}</div>`
        : '';
    }
    case 'videos': {
      const items = pr.videos.filter((v) => v.url);
      return items.length
        ? `<ul class="link-list">${items
            .map((v) => `<li><a href="${esc(v.url)}" rel="noopener">${/youtube\.com|youtu\.be/.test(v.url) ? brandIcon('youtube') : icon('play')}<span>${esc(v.title || v.url)}</span></a></li>`)
            .join('')}</ul>`
        : '';
    }
    case 'quotes': {
      const items = pr.quotes.filter((q) => q.quote);
      return items.length
        ? items
            .map(
              (q) => `<figure class="press-quote"><blockquote><p>${esc(q.quote)}</p></blockquote>${
                q.source ? `<figcaption>${q.url ? `<a href="${esc(q.url)}" rel="noopener">${esc(q.source)}</a>` : esc(q.source)}</figcaption>` : ''
              }</figure>`
            )
            .join('')
        : '';
    }
    case 'team': {
      const items = pr.team.filter((t) => t.name);
      return items.length
        ? `<ul class="team-list">${items
            .map((t) => `<li><strong>${t.url ? `<a href="${esc(t.url)}"${/^https?:/.test(t.url) ? ' rel="noopener"' : ''}>${esc(t.name)}</a>` : esc(t.name)}</strong>${t.role ? `<span>${esc(t.role)}</span>` : ''}</li>`)
            .join('')}</ul>`
        : '';
    }
    case 'contact': {
      const email = settings.site.contactEmail;
      if (!pr.contact && !email) return '';
      return `${pr.contact ? `<div class="prose">${markdown(pr.contact)}</div>` : ''}${email ? `<p class="actions"><a class="btn btn-primary" href="mailto:${esc(email)}">${icon('mail')}<span>${esc(email)}</span></a></p>` : ''}`;
    }
    default:
      return '';
  }
}

function pressPage(settings, ctx) {
  const pr = settings.press;
  const enabled = pr.sections.filter((s) => s.enabled);
  const factSection = enabled.find((s) => s.id === 'factsheet');
  const facts = factSection ? factsheet(settings, ctx, factSection) : '';
  const sections = enabled
    .filter((s) => s.id !== 'factsheet')
    .map((s) => {
      const content = pressContent(settings, s.id);
      return content
        ? `<section class="press-section" id="press-${s.id}" aria-labelledby="press-${s.id}-title">
        <h2 id="press-${s.id}-title">${esc(s.heading)}</h2>
        ${content}
      </section>`
        : '';
    })
    .filter(Boolean);

  return `<section class="page page-press">
  <div class="container">
    <header class="page-head">
      <h1>${esc(pr.heading)}</h1>
      ${pr.intro ? `<div class="prose lead">${markdown(pr.intro)}</div>` : ''}
    </header>
    <div class="press-layout${facts ? ' has-factsheet' : ''}">
      ${facts ? `<aside class="press-facts card" aria-labelledby="press-factsheet-title">\n      ${facts}\n      </aside>` : ''}
      <div class="press-main">
      ${sections.join('\n      ') || `<p class="empty-state">${icon('hourglass')}<span>The press kit is being put together.</span></p>`}
      </div>
    </div>
  </div>
</section>`;
}

// --- other pages ------------------------------------------------------------------

function simplePage(title, body, extraClass = '') {
  return `<section class="page ${extraClass}">
  <div class="container narrow">
    <h1>${esc(title)}</h1>
    ${body}
  </div>
</section>`;
}

function privacyPage(settings, ctx) {
  const s = settings;
  const p = s.privacy;
  const prov = ctx.provider;
  const owner = p.controllerName || s.site.name;
  const contact = s.site.contactEmail
    ? `<a href="mailto:${esc(s.site.contactEmail)}">${esc(s.site.contactEmail)}</a>`
    : 'replying to any newsletter email you have received';
  const providerLink = prov.ready
    ? prov.privacyUrl
      ? `<a href="${esc(prov.privacyUrl)}" rel="noopener">${esc(prov.name)}</a>`
      : esc(prov.name)
    : 'our email newsletter provider';

  const processors = [
    prov.ready
      ? `<li><strong>${providerLink}</strong>${prov.region ? ` (${esc(prov.region)})` : ''}: stores the newsletter list and sends the emails.</li>`
      : '<li><strong>Email provider</strong>: the newsletter is not open yet. This policy will name the provider before sign-ups start.</li>',
    `<li><strong><a href="https://docs.github.com/en/site-policy/privacy-policies/github-general-privacy-statement" rel="noopener">GitHub Pages</a></strong> (GitHub, Inc., United States): hosts this website.</li>`,
  ];

  const body = `
    <p class="page-meta">Effective ${esc(formatDate(p.effectiveDate, s.site.language))}</p>
    <div class="prose">
    <div class="callout card">
      <h2>The short version</h2>
      <ul>
        <li>This site only collects your email address, and only if you sign up for the newsletter.</li>
        <li>No cookies, no analytics, no ads, no tracking scripts.</li>
        <li>Your email is used for the newsletter and nothing else. It is never sold or shared for marketing.</li>
        <li>You can unsubscribe with one click in any email, or ask for your data to be deleted.</li>
      </ul>
    </div>

    <h2>Who is responsible</h2>
    <p>This website and newsletter are run by <strong>${esc(owner)}</strong>${p.country ? `, based in ${esc(p.country)}` : ''}, the data controller for the personal data described here.</p>
    ${p.controllerAddress ? `<p class="address">${esc(p.controllerAddress).replace(/\n/g, '<br>')}</p>` : ''}
    <p>For any privacy question or request, contact us by ${contact}.</p>

    <h2>The newsletter</h2>
    <p><strong>What we collect:</strong> your email address. When you sign up and confirm, ${providerLink} also records the time of sign-up and confirmation, and the IP address used, as proof that you agreed to receive the newsletter.${
      p.emailTracking
        ? ' The provider may also record whether an email was opened and which links were clicked, so we can see which updates are interesting. This uses a small image and tracked links in the email, and you can block it by turning off image loading in your email app.'
        : ''
    }</p>
    <p><strong>Why:</strong> to send you development updates, playtest invitations and news about releases.</p>
    <p><strong>Legal basis:</strong> your consent (Art. 6(1)(a) GDPR). We use double opt-in: you only start receiving emails after you click the link in the confirmation email. You can withdraw your consent at any time using the unsubscribe link in every email, or by contacting us. Withdrawing consent does not affect anything sent before.</p>
    <p><strong>How it works:</strong> when you press the subscribe button, your email address is sent directly from your browser to ${providerLink}. It is never stored on this website.</p>

    <h2>Visiting this website</h2>
    <p>This website is hosted on GitHub Pages. Like any web server, GitHub processes technical data such as your IP address, browser type and the pages requested, to deliver the site and keep it secure. GitHub may log visitor IP addresses for security purposes. The legal basis is our legitimate interest in running a secure website (Art. 6(1)(f) GDPR). We do not have access to these logs and do not use any analytics.</p>
    <p>Fonts and images are served from this website itself. No content is loaded from other servers, advertising or tracking services. Links to other sites, such as Steam or social networks, only send you there when you click them.</p>

    <h2>Cookies and local storage</h2>
    <p>This website does not set cookies and does not store anything in your browser. That's why there is no cookie banner.</p>

    <h2>Service providers</h2>
    <p>We use these processors, each bound by a data processing agreement:</p>
    <ul>${processors.join('')}</ul>

    <h2>International transfers</h2>
    <p>Some of these providers process data in the United States or other countries outside the EU/EEA. Where that happens, the transfer is protected by appropriate safeguards such as the EU–US Data Privacy Framework or the European Commission's Standard Contractual Clauses.</p>

    <h2>How long we keep your data</h2>
    <p>Your email address stays on the list until you unsubscribe or ask us to delete it. After you unsubscribe, the provider may keep your address on a suppression list so you are never emailed again by mistake; ask us if you want it removed completely. Sign-ups that are never confirmed receive no newsletters and are removed.</p>

    <h2>Your rights</h2>
    <p>Under the GDPR and similar laws you have the right to:</p>
    <ul>
      <li>access the personal data we hold about you and get a copy of it;</li>
      <li>have it corrected or deleted;</li>
      <li>restrict or object to its processing;</li>
      <li>receive it in a portable format;</li>
      <li>withdraw your consent at any time;</li>
      <li>lodge a complaint with a data protection supervisory authority, in particular in the country where you live or work.</li>
    </ul>
    <p>To use any of these rights, contact us by ${contact}. We'll respond within one month. We do not sell or share personal information as defined by the California Consumer Privacy Act.</p>

    <h2>Children</h2>
    <p>The newsletter is not meant for anyone under ${p.minimumAge}. We do not knowingly collect their data; if you believe a child has signed up, contact us and we'll delete it.</p>

    <h2>Security</h2>
    <p>The site is served only over HTTPS, uses a strict Content Security Policy and runs no third-party scripts. Access to the newsletter list is limited to us and protected with two-factor authentication.</p>

    <h2>Changes to this policy</h2>
    <p>If this policy changes, the new version will be posted here with a new effective date. If the change is significant, subscribers will be told by email.</p>
    ${p.extra ? `<h2>More information</h2>\n${markdown(p.extra)}` : ''}
    </div>`;
  return simplePage('Privacy policy', body, 'page-legal');
}

function confirmedPage(settings, ctx) {
  const nl = settings.newsletter;
  return `<section class="page page-center">
  <div class="container narrow">
    <div class="success-icon success-icon-large">${icon('check')}</div>
    <h1>${esc(nl.confirmedTitle)}</h1>
    <div class="prose lead">${markdown(nl.confirmedBody)}</div>
    ${wishlist(settings, ctx, 'wishlist-large')}
    <p class="actions">
      ${settings.nav.news.enabled ? `<a class="btn btn-ghost" href="/news/">Read the latest news</a>` : ''}
      <a class="btn btn-ghost" href="/">Back to the homepage</a>
    </p>
  </div>
</section>`;
}

function legalPage(settings) {
  return simplePage(settings.legal.heading, `<div class="prose">${markdown(settings.legal.body)}</div>`, 'page-legal');
}

function notFoundPage() {
  return `<section class="page page-center">
  <div class="container narrow">
    <p class="eyebrow">${sigil()}<span>404</span></p>
    <h1>This page wandered off into the fog.</h1>
    <p class="lead">The link may be old, or the page may have moved.</p>
    <p class="actions"><a class="btn btn-primary" href="/">Back to the homepage</a></p>
  </div>
</section>`;
}

// --- public API ------------------------------------------------------------------

function context(settings, opts) {
  const now = opts.now ?? new Date();
  return {
    provider: resolveProvider(settings.newsletter),
    preview: Boolean(opts.preview),
    previewSuccess: Boolean(opts.previewSuccess),
    version: opts.version ?? '',
    themeHref: opts.themeHref,
    img: opts.resolveImage ?? ((src) => src),
    year: now.getUTCFullYear(),
    now,
    repo: opts.repo,
  };
}

/** Render one page to an HTML string (also used for the admin preview). Unknown ids render the 404 page. */
export function renderPage(settings, pageId, opts = {}) {
  const ctx = context(settings, opts);
  const info = pageInfo(settings, pageId) ?? pageInfo(settings, 'notfound');
  const bodies = {
    home: () => homePage(settings, ctx),
    news: () => newsPage(settings, ctx),
    post: () => postPage(settings, ctx, info.post),
    press: () => pressPage(settings, ctx),
    privacy: () => privacyPage(settings, ctx),
    confirmed: () => confirmedPage(settings, ctx),
    legal: () => legalPage(settings, ctx),
    notfound: () => notFoundPage(settings, ctx),
  };
  return layout(settings, ctx, info, bodies[info.kind]());
}

/** Render every generated file of the site: { "path/in/dist": "contents" }. */
export function renderSite(settings, opts = {}) {
  const ctx = context(settings, opts);
  const s = settings;
  const files = {};
  const pages = livePages(s);
  for (const id of pages) files[pageInfo(s, id).file] = renderPage(s, id, opts);
  if (s.nav.news.enabled) files['news/feed.xml'] = rssFeed(s);

  files['assets/css/theme.css'] = themeCss(s.theme, { effects: s.effects });
  files['assets/img/favicon.svg'] = faviconSvg(s.theme.colors.accent);

  const today = ctx.now.toISOString().slice(0, 10);
  const indexable = pages.filter((id) => !pageInfo(s, id).noindex);
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${indexable.map((id) => `  <url><loc>${esc(s.site.url + pageInfo(s, id).path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
</urlset>
`;

  files['robots.txt'] = s.seo.indexable
    ? `User-agent: *\nAllow: /\nDisallow: /admin/\n\nSitemap: ${s.site.url}/sitemap.xml\n`
    : 'User-agent: *\nDisallow: /\n';

  const expires = new Date(ctx.now.getTime() + 365 * 24 * 3600 * 1000).toISOString().replace(/\.\d+Z$/, 'Z');
  const contacts = [
    s.site.contactEmail ? `Contact: mailto:${s.site.contactEmail}` : '',
    ctx.repo ? `Contact: https://github.com/${ctx.repo.owner}/${ctx.repo.repo}/security/advisories/new` : '',
  ].filter(Boolean);
  if (contacts.length) {
    files['.well-known/security.txt'] = `${contacts.join('\n')}\nExpires: ${expires}\nPreferred-Languages: ${s.site.language.split('-')[0]}\nCanonical: ${s.site.url}/.well-known/security.txt\n`;
  }

  files['site.webmanifest'] = JSON.stringify(
    {
      name: s.site.name,
      short_name: s.site.name,
      description: s.seo.description,
      start_url: '/',
      display: 'browser',
      background_color: s.theme.colors.bg,
      theme_color: s.theme.colors.bg,
      icons: s.theme.favicon
        ? [{ src: s.theme.favicon, sizes: 'any' }]
        : [
            { src: '/assets/img/favicon.svg', sizes: 'any', type: 'image/svg+xml' },
            { src: '/assets/img/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
          ],
    },
    null,
    2
  );

  return files;
}
