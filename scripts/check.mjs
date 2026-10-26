// Security and sanity checks for the renderer. Run with `npm test`.
// Feeds hostile values into every kind of setting and asserts nothing unsafe reaches the output.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { markdown } from '../src/markdown.mjs';
import { resolveProvider } from '../src/providers.mjs';
import { renderPage, renderSite } from '../src/render.mjs';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings.mjs';
import { contrastReport, PRESETS } from '../src/themes.mjs';
import { safeAssetPath, safeUrl } from '../src/util.mjs';

let passed = 0;
async function test(name, fn) {
  try {
    await fn();
    passed++;
  } catch (error) {
    console.error(`✗ ${name}\n  ${error.message}`);
    process.exitCode = 1;
  }
}

const XSS = '<script>alert(1)</script><img src=x onerror=alert(1)>"\'><svg onload=alert(1)>';
const EVIL_URL = 'javascript:alert(document.cookie)';
// Real (unescaped) markup only: escaped text like "&lt;img onerror=…" is harmless and must not match.
const INJECTED_TAG = /<(script|img src=x|svg onload|iframe|object|embed)\b/i;
const EVENT_ATTR = /<[a-z][^>]*\son[a-z]+\s*=/i;
const decode = (s) => s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&');
const withKit = (s) => ({ ...s, newsletter: { ...s.newsletter, provider: 'kit', kit: { formId: '1234567' } } });

function hostileSettings() {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.site.name = XSS;
  s.nav.news.label = XSS;
  s.nav.press.label = XSS;
  s.home.about = { enabled: true, heading: XSS, body: `${XSS}\n\n[click](${EVIL_URL}) [ok](https://example.com)` };
  s.socialBand.heading = XSS;
  s.footer.note = XSS;
  s.nav.style = '"><script>';
  s.effects.halftone.color = '"><script>alert(1)</script>';
  s.effects.halftone.size = '"><script>';
  s.effects.crt.scanlines = '1); background: url(javascript:alert(1))';
  s.home.logoImage = 'https://evil.example/tracker.png';
  s.newsletter.provider = 'kit';
  s.newsletter.kit.formId = '123"><script>alert(1)</script>';
  s.newsletter.heading = XSS;
  s.newsletter.perks = [XSS];
  s.newsletter.trustText = XSS;
  s.newsletter.consentText = `${XSS} {privacy}`;
  s.wishlist = { enabled: true, url: EVIL_URL, text: XSS, buttonLabel: XSS };
  s.theme.colors.bg = 'red;}</style><script>alert(1)</script>';
  s.theme.heroImage = "/x.png') ; background:url(javascript:alert(1)";
  s.theme.logo = 'https://evil.example/logo.png';
  s.news.heading = XSS;
  s.news.posts = [{ title: XSS, slug: '../../etc"><script>', date: '2026-13-99"><x', image: 'data:image/svg+xml,<svg onload=alert(1)>', imageAlt: XSS, summary: XSS, body: XSS, url: EVIL_URL, linkLabel: XSS }];
  s.press.heading = XSS;
  s.press.sections = s.press.sections.map((x) => ({ ...x, heading: XSS }));
  s.press.facts = [{ label: XSS, value: XSS, url: EVIL_URL }];
  s.press.description = XSS;
  s.press.features = [XSS];
  s.press.images = [{ src: 'https://evil.example/a.jpg', caption: XSS }];
  s.press.logos = [{ src: '/assets/press/elarion-mark.png', label: XSS, background: '"><script>' }];
  s.press.videos = [{ title: XSS, url: EVIL_URL }];
  s.press.quotes = [{ quote: XSS, source: XSS, url: EVIL_URL }];
  s.press.team = [{ name: XSS, role: XSS, url: EVIL_URL }];
  s.socials = [
    { platform: 'github', url: EVIL_URL, label: '', inMenu: true, inBand: true },
    { platform: '<b>', url: 'https://ok.example', label: XSS, inMenu: 'yes', inBand: 1 },
  ];
  s.privacy.extra = XSS;
  s.legal = { enabled: true, heading: XSS, body: XSS };
  s.seo.title = XSS;
  s.seo.ogImage = EVIL_URL;
  s.site.url = EVIL_URL;
  return s;
}

await test('URL filter allows only safe schemes', () => {
  assert.equal(safeUrl(EVIL_URL), '');
  assert.equal(safeUrl(' JaVaScRiPt:alert(1)'), '');
  assert.equal(safeUrl('data:text/html,hi'), '');
  assert.equal(safeUrl('//evil.example'), '');
  assert.equal(safeUrl('https://ok.example/a?b=1'), 'https://ok.example/a?b=1');
  assert.equal(safeUrl('/privacy/'), '/privacy/');
  assert.equal(safeUrl('mailto:a@b.co'), 'mailto:a@b.co');
  assert.equal(safeAssetPath('/assets/uploads/a.webp'), '/assets/uploads/a.webp');
  assert.equal(safeAssetPath("/a.png');}"), '');
  assert.equal(safeAssetPath('/../etc/passwd'), '');
});

await test('Markdown escapes HTML and drops unsafe links', () => {
  const html = markdown(`${XSS}\n\n[x](${EVIL_URL}) **b**`);
  assert.ok(!INJECTED_TAG.test(html) && !EVENT_ATTR.test(html), html);
  assert.ok(!/href="javascript:/i.test(html), html);
  assert.ok(html.includes('<strong>b</strong>'));
});

await test('Hostile settings render without executable markup', () => {
  const files = renderSite(normalizeSettings(hostileSettings()), { version: 'test' });
  assert.ok(Object.keys(files).some((f) => f.startsWith('news/') && f.endsWith('/index.html') && f !== 'news/index.html'), 'post page rendered');
  for (const [file, contents] of Object.entries(files)) {
    if (!/\.(html|xml)$/.test(file)) continue;
    const html = contents.replace(/<script type="module" src="\/assets\/js\/site\.js\?v=test"><\/script>/, '');
    assert.ok(!INJECTED_TAG.test(html), `${file}: injected element`);
    // Attribute values are always double-quoted and escaped, so blank them out and look at attribute names only.
    assert.ok(!EVENT_ATTR.test(html.replace(/"[^"]*"/g, '""')), `${file}: inline event handler`);
    assert.ok(!/(href|src|action)="\s*javascript:/i.test(html), `${file}: javascript: URL`);
    assert.ok(!/\ssrc="(data:|https?:)/i.test(html), `${file}: image from settings is not a local upload`);
  }
  assert.ok(!files['assets/css/theme.css'].includes('<'), 'theme.css contains markup');
  assert.ok(!files['assets/css/theme.css'].includes('javascript'), 'theme.css contains javascript');
});

await test('Hostile settings normalise to safe values', () => {
  const s = normalizeSettings(hostileSettings());
  assert.equal(s.site.url, DEFAULT_SETTINGS.site.url);
  assert.equal(s.theme.colors.bg, DEFAULT_SETTINGS.theme.colors.bg);
  assert.equal(s.theme.heroImage, '');
  assert.equal(s.theme.logo, '', 'images must be uploaded files, not remote URLs');
  assert.equal(s.home.logoImage, '');
  assert.equal(s.press.images[0].src, '');
  assert.equal(s.press.logos[0].background, 'checker');
  assert.equal(s.wishlist.url, '');
  const post = s.news.posts[0];
  assert.match(post.slug, /^[a-z0-9]+(-[a-z0-9]+)*$/, 'slug is sanitised');
  assert.equal(post.date, '');
  assert.equal(post.url, '');
  assert.equal(post.image, '');
  assert.equal(s.press.videos[0].url, '');
  assert.equal(s.socials[0].url, '', 'javascript: URL is dropped');
  assert.equal(s.socials[1].platform, 'website');
  assert.equal(s.socials[1].inMenu, true, 'non-boolean toggles fall back to the default');
  assert.equal(s.nav.style, 'bar-stepped');
  assert.equal(s.effects.halftone.color, 'accent2');
  assert.equal(s.effects.halftone.size, DEFAULT_SETTINGS.effects.halftone.size);
  assert.equal(s.effects.crt.scanlines, DEFAULT_SETTINGS.effects.crt.scanlines);
  assert.equal(resolveProvider(s.newsletter).ready, false, 'invalid Kit form ID is rejected');
});

await test('Post addresses are unique', () => {
  const s = normalizeSettings({ ...DEFAULT_SETTINGS, news: { ...DEFAULT_SETTINGS.news, posts: [{ title: 'Big update' }, { title: 'Big update' }, { title: 'Big update', slug: 'big-update' }] } });
  const slugs = s.news.posts.map((p) => p.slug);
  assert.equal(new Set(slugs).size, 3, slugs.join(', '));
});

await test('Content Security Policy is strict and names only the provider', () => {
  const html = renderSite(normalizeSettings(withKit(DEFAULT_SETTINGS)), { version: 'v' })['index.html'];
  const csp = decode(html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  assert.match(csp, /img-src 'self' data:(;|$)/);
  assert.match(csp, /connect-src https:\/\/app\.kit\.com(;|$)/);
  assert.match(csp, /form-action 'self' https:\/\/app\.kit\.com(;|$)/);
  assert.match(csp, /base-uri 'none'/);
  assert.ok(!csp.includes('unsafe'), 'no unsafe-* sources');
  assert.match(html, /action="https:\/\/app\.kit\.com\/forms\/1234567\/subscriptions"/);
  assert.match(html, /name="email_address"/);
});

await test('Sign-up form: one email field, consent statement or unticked checkbox', () => {
  const statement = renderSite(normalizeSettings(withKit(DEFAULT_SETTINGS)), { version: 'v' })['index.html'];
  assert.equal((statement.match(/<input class="input"/g) ?? []).length, 1, 'exactly one visible field');
  assert.match(statement, /<p class="consent consent-text">.*privacy policy/);
  const checkbox = normalizeSettings(withKit({ ...DEFAULT_SETTINGS, newsletter: { ...DEFAULT_SETTINGS.newsletter, requireConsent: true } }));
  assert.match(renderSite(checkbox, { version: 'v' })['index.html'], /<input type="checkbox" required data-consent>/);
  const blank = { ...DEFAULT_SETTINGS.newsletter, trustText: '', consentText: '' };
  const bare = renderSite(normalizeSettings(withKit({ ...DEFAULT_SETTINGS, newsletter: blank })), { version: 'v' })['index.html'];
  assert.ok(!/class="(trust|consent)/.test(bare), 'blank lines render nothing');
  const forced = normalizeSettings(withKit({ ...DEFAULT_SETTINGS, newsletter: { ...blank, requireConsent: true } }));
  assert.equal(forced.newsletter.consentText, DEFAULT_SETTINGS.newsletter.consentText, 'the checkbox keeps its words');
});

await test('Without a provider the form is replaced by a notice', () => {
  const html = renderSite(normalizeSettings(DEFAULT_SETTINGS), { version: 'v' })['index.html'];
  assert.ok(!html.includes('<form'), 'no form without a provider');
  assert.match(decode(html), /connect-src 'none'/);
});

await test('Steam button appears after sign-up only once a store link is set', () => {
  const none = renderSite(normalizeSettings(withKit(DEFAULT_SETTINGS)), { version: 'v' });
  assert.ok(!none['index.html'].includes('btn-steam'));
  const s = normalizeSettings(withKit({ ...DEFAULT_SETTINGS, wishlist: { ...DEFAULT_SETTINGS.wishlist, url: 'https://store.steampowered.com/app/1/' } }));
  const files = renderSite(s, { version: 'v' });
  assert.match(files['index.html'], /data-success hidden[\s\S]*btn-steam/);
  assert.match(files['confirmed/index.html'], /btn-steam/);
});

await test('Menu switches remove pages, links and the feed', () => {
  const on = renderSite(normalizeSettings(DEFAULT_SETTINGS), { version: 'v' });
  assert.ok(on['news/index.html'] && on['news/welcome/index.html'] && on['news/feed.xml'] && on['press/index.html']);
  assert.match(on['news/feed.xml'], /<rss version="2.0"[\s\S]*<link>https:\/\/elarion-game-dev\.github\.io\/news\/welcome\/<\/link>/);
  const offSettings = structuredClone(DEFAULT_SETTINGS);
  offSettings.nav.news.enabled = false;
  offSettings.nav.press.enabled = false;
  offSettings.nav.home.enabled = false;
  const off = renderSite(normalizeSettings(offSettings), { version: 'v' });
  assert.ok(!Object.keys(off).some((f) => f.startsWith('news/') || f.startsWith('press/')), Object.keys(off).join(', '));
  assert.ok(!/href="\/(news|press)\/"/.test(off['index.html']), 'no links to switched-off pages');
  assert.ok(!off['sitemap.xml'].includes('/news/'));
  assert.ok(!off['index.html'].includes('class="site-header"'), 'no header when the menu is empty and the logo shows');
});

await test('Menu shows the pages, star dividers and only socials that have a link', () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.socials = [
    { platform: 'discord', url: 'https://discord.gg/abc', label: '', inMenu: true, inBand: false },
    { platform: 'youtube', url: '', label: '', inMenu: true, inBand: true },
    { platform: 'steam', url: 'https://store.steampowered.com/app/1/', label: '', inMenu: false, inBand: true },
  ];
  const n = normalizeSettings(s);
  const live = renderSite(n, { version: 'v' })['press/index.html'];
  const nav = live.match(/<nav class="nav-bar"[\s\S]*?<\/nav>/)[0];
  assert.match(nav, /href="\/news\/"/);
  assert.match(nav, /class="nav-divider"/);
  assert.match(nav, /href="https:\/\/discord\.gg\/abc"/);
  assert.ok(!nav.includes('steampowered'), 'steam is not set to show in the menu');
  assert.ok(!nav.includes('is-placeholder'), 'links without a URL are not on the live site');
  assert.match(live, /class="social-band[^"]*"[\s\S]*steampowered/, 'band shows its own selection');
  assert.ok(!/class="social-band[^"]*"[\s\S]*discord\.gg/.test(live), 'discord is not set to show in the band');
  const preview = renderPage(n, 'home', { preview: true });
  assert.match(preview, /class="is-placeholder"/, 'the preview shows unfilled links faded');
});

await test('Footer is one small line without the logo', () => {
  const html = renderSite(normalizeSettings(DEFAULT_SETTINGS), { version: 'v' })['news/index.html'];
  const footer = html.match(/<footer class="site-footer">[\s\S]*?<\/footer>/)[0];
  assert.ok(!footer.includes('class="brand"') && !footer.includes('sigil'), footer);
  assert.match(footer, /href="\/privacy\/"/);
});

await test('Social band follows its placement setting', () => {
  const withLink = (show) => {
    const s = structuredClone(DEFAULT_SETTINGS);
    s.socials = [{ platform: 'discord', url: 'https://discord.gg/abc', label: '', inMenu: true, inBand: true }];
    s.socialBand.show = show;
    return renderSite(normalizeSettings(s), { version: 'v' });
  };
  assert.ok(withLink('all')['press/index.html'].match(/class="[^"]*social-band/));
  assert.ok(!withLink('home')['press/index.html'].match(/class="[^"]*social-band/));
  assert.ok(withLink('home')['index.html'].match(/class="[^"]*social-band/));
  assert.ok(!withLink('off')['index.html'].match(/class="[^"]*social-band/));
});

await test('Inline "Follow" block sits right after the sign-up form; the strip sits above the footer', () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.socials = [{ platform: 'discord', url: 'https://discord.gg/abc', label: '', inMenu: true, inBand: true }];
  const inline = renderSite(normalizeSettings(s), { version: 'v' })['index.html'];
  assert.match(inline, /<\/section>\s*<section class="home-block social-band social-inline"/);
  assert.equal(inline.match(/class="[^"]*social-band/g).length, 1, 'shown once');
  s.socialBand.layout = 'strip';
  const strip = renderSite(normalizeSettings(s), { version: 'v' })['index.html'];
  assert.ok(!strip.includes('social-inline') && strip.includes('<section class="social-band"'));
});

await test('Menu appearance becomes theme variables and rejects unsafe values', () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  assert.ok(!renderSite(normalizeSettings(s), { version: 'v' })['assets/css/theme.css'].includes('--nav-'), 'defaults add nothing');
  s.nav.look = { background: '#FF6600', opacity: 80, linkColor: 'text', activeColor: 'red;}</style><script>', iconColor: 'accent', dividerColor: 'auto', size: 120, shadow: 'none' };
  const n = normalizeSettings(s);
  assert.equal(n.nav.look.activeColor, 'auto');
  const css = renderSite(n, { version: 'v' })['assets/css/theme.css'];
  assert.match(css, /--nav-bg-custom: color-mix\(in srgb, #ff6600 80%, transparent\);/);
  assert.match(css, /--nav-link: var\(--text\);[\s\S]*--nav-icon: var\(--accent\);[\s\S]*--nav-scale: 1\.20;[\s\S]*--nav-shadow: 0 0 0 transparent;/);
  assert.ok(!css.includes('--nav-active') && !css.includes('<'));
});

await test('Perk icon, text styles and click-to-edit markers', () => {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.newsletter.perkIcon = 'heart';
  s.newsletter.perkIconColor = '"><script>';
  s.textStyles.hook = { ...s.textStyles.hook, weight: 800, size: 130, color: 'custom', customColor: '#ffffff', crt: false, font: '"><x' };
  const n = normalizeSettings(s);
  assert.equal(n.newsletter.perkIconColor, 'accent');
  assert.equal(n.textStyles.hook.font, '');
  const site = renderSite(n, { version: 'v' });
  assert.ok(site['index.html'].includes('class="perk-icon"') && !site['index.html'].includes('data-edit'));
  assert.match(site['assets/css/theme.css'], /:root \.signup-hook \{[^}]*font-weight: 800;[^}]*--k: 1\.30;[^}]*color: #ffffff;[^}]*animation: none !important;/);
  assert.ok(renderPage(n, 'home', { preview: true }).includes('data-edit="newsletter.heading"'));
  n.newsletter.perkIcon = 'custom';
  n.newsletter.perkImage = '/assets/uploads/perk.png';
  assert.ok(renderSite(n, { version: 'v' })['index.html'].includes('<img class="perk-icon perk-image" src="/assets/uploads/perk.png"'));
});

await test('CRT and halftone follow the effect settings', () => {
  const on = renderSite(normalizeSettings(DEFAULT_SETTINGS), { version: 'v' });
  assert.match(on['index.html'], /<html[^>]* data-crt data-crt-flicker data-crt-rgb data-crt-vignette/);
  assert.match(on['index.html'], /<canvas class="halftone halftone-hero" data-halftone data-color="accent2"/);
  assert.ok(!on['press/index.html'].includes('data-halftone'), 'dots only on the home page by default');
  assert.match(on['assets/css/theme.css'], /--crt-scanlines: 0\.22;[\s\S]*--halftone-opacity: 0\.30;/);
  const s = structuredClone(DEFAULT_SETTINGS);
  s.effects.crt.enabled = false;
  s.effects.halftone.where = 'all';
  const off = renderSite(normalizeSettings(s), { version: 'v' });
  assert.ok(!off['index.html'].includes('data-crt'));
  assert.match(off['press/index.html'], /<canvas class="halftone halftone-fixed"/);
  s.effects.halftone.enabled = false;
  assert.ok(!renderSite(normalizeSettings(s), { version: 'v' })['index.html'].includes('<canvas'));
});

await test('Settings from before version 3 keep their band heading and get ready-to-fill socials', () => {
  const old = structuredClone(DEFAULT_SETTINGS);
  old.schemaVersion = 2;
  delete old.socialBand;
  old.home.socials = { enabled: true, heading: 'Follow me on socials' };
  old.socials = [];
  const s = normalizeSettings(old);
  assert.deepEqual(s.socialBand, { show: 'all', layout: 'inline', heading: 'Follow me on socials' });
  assert.equal(s.socials.length, DEFAULT_SETTINGS.socials.length);
  assert.equal(normalizeSettings({ ...s, socials: [] }).socials.length, 0, 'an empty list saved by version 3 stays empty');
});

await test('Default settings are stable', () => {
  assert.deepEqual(normalizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
});

await test('Every preset passes WCAG AA for text and buttons', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    for (const check of contrastReport(preset.colors)) assert.ok(check.pass, `${id}: ${check.label} is ${check.ratio.toFixed(2)}:1`);
  }
});

await test('content/site.json renders', async () => {
  const committed = normalizeSettings(JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8')));
  const files = renderSite(committed, { version: 'v', repo: { owner: 'o', repo: 'r' } });
  assert.ok(files['index.html'].includes('<h1'));
  assert.ok(files['.well-known/security.txt'].includes('Expires:'));
});

console.log(process.exitCode ? 'Some checks failed.' : `All ${passed} checks passed.`);
