// Security and sanity checks for the renderer. Run with `npm test`.
// Feeds hostile values into every kind of setting and asserts nothing unsafe reaches the HTML.

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { markdown } from '../src/markdown.mjs';
import { resolveProvider } from '../src/providers.mjs';
import { renderSite } from '../src/render.mjs';
import { DEFAULT_SETTINGS, normalizeSettings } from '../src/settings.mjs';
import { contrastReport, PRESETS } from '../src/themes.mjs';
import { safeAssetPath, safeUrl } from '../src/util.mjs';

let passed = 0;
function test(name, fn) {
  try {
    fn();
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

function hostileSettings() {
  const s = structuredClone(DEFAULT_SETTINGS);
  s.site.name = XSS;
  s.hero.headline = XSS;
  s.hero.intro = `${XSS}\n\n[click](${EVIL_URL}) [ok](https://example.com)`;
  s.newsletter.provider = 'kit';
  s.newsletter.kit.formId = '123"><script>alert(1)</script>';
  s.newsletter.perks = [XSS];
  s.newsletter.consentText = `${XSS} {privacy}`;
  s.theme.colors.bg = 'red;}</style><script>alert(1)</script>';
  s.theme.heroImage = "/x.png') ; background:url(javascript:alert(1)";
  s.theme.logo = 'https://evil.example/logo.png';
  s.games.items = [{ title: XSS, description: XSS, url: EVIL_URL, image: 'data:image/svg+xml,<svg onload=alert(1)>', imageAlt: XSS, status: XSS, tags: [XSS], linkLabel: XSS }];
  s.socials = [{ platform: 'github', url: EVIL_URL, label: '' }, { platform: '<b>', url: 'https://ok.example', label: XSS }];
  s.privacy.extra = XSS;
  s.legal = { enabled: true, heading: XSS, body: XSS };
  s.seo.title = XSS;
  s.seo.ogImage = EVIL_URL;
  s.site.url = EVIL_URL;
  return s;
}

test('URL filter allows only safe schemes', () => {
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

test('Markdown escapes HTML and drops unsafe links', () => {
  const html = markdown(`${XSS}\n\n[x](${EVIL_URL}) **b**`);
  assert.ok(!INJECTED_TAG.test(html) && !EVENT_ATTR.test(html), html);
  assert.ok(!/href="javascript:/i.test(html), html);
  assert.ok(html.includes('<strong>b</strong>'));
});

test('Hostile settings render without executable markup', () => {
  const files = renderSite(normalizeSettings(hostileSettings()), { version: 'test' });
  for (const [file, contents] of Object.entries(files)) {
    if (!file.endsWith('.html')) continue;
    const html = contents.replace(/<script type="module" src="\/assets\/js\/site\.js\?v=test"><\/script>/, '');
    assert.ok(!INJECTED_TAG.test(html), `${file}: injected element`);
    // Attribute values are always double-quoted and escaped, so blank them out and look at attribute names only.
    assert.ok(!EVENT_ATTR.test(html.replace(/"[^"]*"/g, '""')), `${file}: inline event handler`);
    assert.ok(!/(href|src|action)="\s*javascript:/i.test(html), `${file}: javascript: URL`);
    assert.ok(!/\ssrc="data:/i.test(html), `${file}: data: image from settings`);
  }
  assert.ok(!files['assets/css/theme.css'].includes('<'), 'theme.css contains markup');
  assert.ok(!files['assets/css/theme.css'].includes('javascript'), 'theme.css contains javascript');
});

test('Hostile settings normalise to safe values', () => {
  const s = normalizeSettings(hostileSettings());
  assert.equal(s.site.url, DEFAULT_SETTINGS.site.url);
  assert.equal(s.theme.colors.bg, DEFAULT_SETTINGS.theme.colors.bg);
  assert.equal(s.theme.heroImage, '');
  assert.equal(s.theme.logo, '', 'logo must be an uploaded file, not a remote URL');
  assert.equal(s.games.items[0].url, '');
  assert.equal(s.games.items[0].image, '');
  assert.equal(s.socials.length, 1, 'social with javascript: URL is dropped');
  assert.equal(s.socials[0].platform, 'website');
  assert.equal(resolveProvider(s.newsletter).ready, false, 'invalid Kit form ID is rejected');
});

test('Content Security Policy is strict and names only the provider', () => {
  const s = normalizeSettings({ ...DEFAULT_SETTINGS, newsletter: { ...DEFAULT_SETTINGS.newsletter, provider: 'kit', kit: { formId: '1234567' } } });
  const html = renderSite(s, { version: 'v' })['index.html'];
  const csp = decode(html.match(/http-equiv="Content-Security-Policy" content="([^"]+)"/)[1]);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'(;|$)/);
  assert.match(csp, /style-src 'self'(;|$)/);
  assert.match(csp, /connect-src https:\/\/app\.kit\.com(;|$)/);
  assert.match(csp, /form-action 'self' https:\/\/app\.kit\.com(;|$)/);
  assert.match(csp, /base-uri 'none'/);
  assert.ok(!csp.includes('unsafe'), 'no unsafe-* sources');
  assert.match(html, /action="https:\/\/app\.kit\.com\/forms\/1234567\/subscriptions"/);
  assert.match(html, /name="email_address"/);
  assert.match(html, /<input type="checkbox" required data-consent>/, 'consent checkbox is unticked and required');
});

test('Without a provider the form is replaced by a notice', () => {
  const html = renderSite(normalizeSettings(DEFAULT_SETTINGS), { version: 'v' })['index.html'];
  assert.ok(!html.includes('<form'), 'no form without a provider');
  assert.match(decode(html), /connect-src 'none'/);
});

test('Default settings are stable and committed content is valid', async () => {
  assert.deepEqual(normalizeSettings(DEFAULT_SETTINGS), DEFAULT_SETTINGS);
});

test('Every preset passes WCAG AA for body text and buttons', () => {
  for (const [id, preset] of Object.entries(PRESETS)) {
    for (const check of contrastReport(preset.colors)) assert.ok(check.pass, `${id}: ${check.label} is ${check.ratio.toFixed(2)}:1`);
  }
});

const committed = normalizeSettings(JSON.parse(await readFile(new URL('../content/site.json', import.meta.url), 'utf8')));
test('content/site.json renders', () => {
  const files = renderSite(committed, { version: 'v', repo: { owner: 'o', repo: 'r' } });
  assert.ok(files['index.html'].includes('<h1'));
  assert.ok(files['.well-known/security.txt'].includes('Expires:'));
});

console.log(process.exitCode ? 'Some checks failed.' : `All ${passed} checks passed.`);
