// Renders every public page from the settings object. Used by the build (Node) and by the
// admin's live preview (browser), so what you see in the preview is exactly what gets published.

import { BRAND_ICONS } from './icons.mjs';
import { inline, markdown } from './markdown.mjs';
import { resolveProvider } from './providers.mjs';
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
  website: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c2.5 2.7 3.8 5.7 3.8 9s-1.3 6.3-3.8 9c-2.5-2.7-3.8-5.7-3.8-9S9.5 5.7 12 3z"/>',
  email: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
  rss: '<path d="M5 4.5a14.5 14.5 0 0 1 14.5 14.5M5 11a8 8 0 0 1 8 8"/><circle cx="6" cy="18" r="1.25"/>',
};

const icon = (name, cls = 'icon') =>
  `<svg class="${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${STROKE[name]}</svg>`;
const sigil = (cls = 'sigil') => `<svg class="${cls}" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${SIGIL_PATH}"/></svg>`;

function socialIcon(platform) {
  const brand = BRAND_ICONS[platform];
  if (brand) return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path fill="currentColor" d="${brand.path}"/></svg>`;
  return icon(STROKE[platform] ? platform : 'website');
}

export function faviconSvg(accent) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path fill="${accent}" d="${SIGIL_PATH}"/></svg>\n`;
}

// --- shared building blocks -------------------------------------------------

const PAGES = {
  home: { path: '/', file: 'index.html' },
  privacy: { path: '/privacy/', file: 'privacy/index.html', title: 'Privacy policy' },
  confirmed: { path: '/confirmed/', file: 'confirmed/index.html', title: 'Subscription confirmed', noindex: true },
  legal: { path: '/legal/', file: 'legal/index.html' },
  notfound: { path: '/404.html', file: '404.html', title: 'Page not found', noindex: true },
};

export const PREVIEW_PAGES = { home: 'Home', privacy: 'Privacy policy', confirmed: 'Confirmed', legal: 'Legal notice', notfound: '404' };

function absolute(settings, path) {
  if (!path) return '';
  return path.startsWith('/') ? settings.site.url + path : path;
}

/**
 * Origins that absolute image URLs point at. The CSP lists all of them (including this site's own
 * origin, so images keep loading on localhost or after moving to a custom domain); the privacy
 * policy lists only third parties.
 */
export function imageOrigins(settings, { includeOwn = false } = {}) {
  const own = new URL(settings.site.url).origin;
  const origins = new Set();
  for (const url of [...settings.games.items.map((g) => g.image), settings.about.image]) {
    if (!/^https:\/\//.test(url)) continue;
    const origin = new URL(url).origin;
    if (includeOwn || origin !== own) origins.add(origin);
  }
  return [...origins];
}

function contentSecurityPolicy(settings, provider) {
  const images = imageOrigins(settings, { includeOwn: true });
  const sends = provider.ready && provider.responds !== 'navigate' ? provider.origin : "'none'";
  return [
    "default-src 'none'",
    "script-src 'self'",
    "style-src 'self'",
    `img-src 'self' data:${images.length ? ' ' + images.join(' ') : ''}`,
    "font-src 'self'",
    `connect-src ${sends}`,
    `form-action 'self'${provider.ready ? ' ' + provider.origin : ''}`,
    "manifest-src 'self'",
    "base-uri 'none'",
    'upgrade-insecure-requests',
  ].join('; ');
}

function enabledSections(settings) {
  return settings.sections.filter((s) => {
    if (!s.enabled) return false;
    if (s.id === 'games') return settings.games.items.length > 0;
    if (s.id === 'devlog') return settings.devlog.items.length > 0;
    return true;
  });
}

function brand(settings, ctx) {
  const logo = settings.theme.logo
    ? `<img class="brand-logo" src="${esc(ctx.img(settings.theme.logo))}" alt="" width="36" height="36">`
    : sigil('sigil brand-sigil');
  return `<a class="brand" href="/">${logo}<span class="brand-name">${esc(settings.site.name)}</span></a>`;
}

function socialLinks(settings, cls = 'socials') {
  if (!settings.socials.length) return '';
  const items = settings.socials
    .map((s) => {
      const name = s.label || (BRAND_ICONS[s.platform]?.title ?? { email: 'Email', website: 'Website', rss: 'RSS feed' }[s.platform]);
      const external = /^https?:/.test(s.url);
      return `<li><a href="${esc(s.url)}"${external ? ' rel="me noopener"' : ''} aria-label="${esc(name)}" title="${esc(name)}">${socialIcon(s.platform)}</a></li>`;
    })
    .join('');
  return `<ul class="${cls}">${items}</ul>`;
}

function header(settings, ctx) {
  const labels = { games: settings.games.heading, devlog: settings.devlog.heading, about: settings.about.navLabel };
  const links = enabledSections(settings)
    .filter((s) => labels[s.id])
    .map((s) => `<a class="nav-link" href="/#${s.id}">${esc(labels[s.id])}</a>`)
    .join('');
  return `<header class="site-header">
  <div class="container header-inner">
    ${brand(settings, ctx)}
    <nav class="site-nav" aria-label="Main">${links}<a class="btn btn-small btn-primary" href="/#subscribe">${esc(settings.newsletter.buttonLabel)}</a></nav>
  </div>
</header>`;
}

function footer(settings, ctx) {
  const links = [
    `<a href="/privacy/">Privacy</a>`,
    settings.legal.enabled ? `<a href="/legal/">${esc(settings.legal.heading)}</a>` : '',
    settings.site.contactEmail ? `<a href="mailto:${esc(settings.site.contactEmail)}">Contact</a>` : '',
  ].filter(Boolean);
  return `<footer class="site-footer">
  <div class="container footer-inner">
    <div class="footer-brand">
      ${brand(settings, ctx)}
      <p class="footer-note">${icon('shield')}<span>No cookies, no tracking. Your email is only ever used for the newsletter.</span></p>
    </div>
    ${socialLinks(settings, 'socials footer-socials')}
    <nav class="footer-nav" aria-label="Footer">${links.join('')}</nav>
    <p class="copyright">© ${ctx.year} ${esc(settings.site.copyrightName || settings.site.name)}</p>
  </div>
</footer>`;
}

function layout(settings, ctx, pageId, main) {
  const page = PAGES[pageId];
  const s = settings;
  const title = pageId === 'home' ? s.seo.title : `${page.title ?? s.legal.heading} · ${s.site.name}`;
  const noindex = !s.seo.indexable || page.noindex;
  const canonical = s.site.url + page.path;
  const ogImage = absolute(s, s.seo.ogImage);
  const v = ctx.version ? `?v=${esc(ctx.version)}` : '';
  const favicon = s.theme.favicon ? ctx.img(s.theme.favicon) : `/assets/img/favicon.svg${v}`;
  const font = ctx.preview ? '' : preloadFont(s.theme.headingFont);
  const t = s.theme;

  return `<!doctype html>
<html lang="${esc(s.site.language)}" data-hero="${t.heroBackground}" data-layout="${t.heroLayout}" data-cards="${t.cardStyle}" data-motion="${t.animations ? 'on' : 'off'}"${ctx.preview ? ' data-preview' : ''}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
${ctx.preview ? '' : `<meta http-equiv="Content-Security-Policy" content="${esc(contentSecurityPolicy(s, ctx.provider))}">\n`}<meta name="referrer" content="strict-origin-when-cross-origin">
<title>${esc(title)}</title>
<meta name="description" content="${esc(s.seo.description)}">
<meta name="robots" content="${noindex ? 'noindex, nofollow' : 'index, follow'}">
<link rel="canonical" href="${esc(canonical)}">
<meta name="theme-color" content="${t.colors.bg}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="${esc(s.site.name)}">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(s.seo.description)}">
<meta property="og:url" content="${esc(canonical)}">
${ogImage ? `<meta property="og:image" content="${esc(ogImage)}">\n<meta property="og:image:alt" content="${esc(s.seo.ogImageAlt)}">\n<meta name="twitter:card" content="summary_large_image">\n` : ''}<link rel="icon" href="${esc(favicon)}">
<link rel="apple-touch-icon" href="${esc(s.theme.favicon ? favicon : '/assets/img/apple-touch-icon.png')}">
<link rel="manifest" href="/site.webmanifest">
${font ? `<link rel="preload" href="/assets/fonts/${font}" as="font" type="font/woff2" crossorigin>\n` : ''}<link rel="stylesheet" href="${esc(ctx.themeHref ?? `/assets/css/theme.css${v}`)}">
<link rel="stylesheet" href="/assets/css/site.css${v}">
${ctx.preview ? '' : `<script type="module" src="/assets/js/site.js${v}"></script>\n`}</head>
<body class="page-${pageId}">
<a class="skip-link" href="#main">Skip to content</a>
${header(s, ctx)}
<main id="main" tabindex="-1">
${main}
</main>
${footer(s, ctx)}
</body>
</html>
`;
}

// --- home page ---------------------------------------------------------------

function consentHtml(nl) {
  const link = '<a href="/privacy/">privacy policy</a>';
  const text = esc(nl.consentText);
  return text.includes('{privacy}') ? text.replace('{privacy}', link) : `${text} (${link})`;
}

function subscribeCard(settings, ctx) {
  const nl = settings.newsletter;
  const p = ctx.provider;
  const perks = nl.perks.length
    ? `<ul class="perks">${nl.perks.map((perk) => `<li>${sigil('sigil perk-icon')}<span>${esc(perk)}</span></li>`).join('')}</ul>`
    : '';

  let form;
  if (p.ready) {
    const hidden = Object.entries(p.hidden)
      .map(([name, value]) => `<input type="hidden" name="${esc(name)}" value="${esc(value)}">`)
      .join('');
    form = `<form class="subscribe-form" method="post" action="${esc(p.action)}" accept-charset="utf-8" data-subscribe data-provider="${p.id}" data-responds="${p.responds}">
      ${hidden}
      <label class="field-label" for="subscribe-email">${esc(nl.emailLabel)}</label>
      <div class="field-row">
        <input class="input" id="subscribe-email" type="email" name="${esc(p.emailField)}" required maxlength="254" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" placeholder="${esc(nl.placeholder)}">
        <button class="btn btn-primary" type="submit"><span class="btn-label">${esc(nl.buttonLabel)}</span><span class="spinner" aria-hidden="true"></span></button>
      </div>
      <div class="hp-field" aria-hidden="true">
        <label for="subscribe-website">Leave this field empty</label>
        <input id="subscribe-website" type="text" tabindex="-1" autocomplete="off" data-honeypot>
      </div>
      ${
        nl.requireConsent
          ? `<label class="consent"><input type="checkbox" required data-consent><span>${consentHtml(nl)}</span></label>`
          : `<p class="consent consent-text">${consentHtml(nl)}</p>`
      }
      ${nl.finePrint ? `<p class="fine-print">${icon('lock')}<span>${esc(nl.finePrint)}</span></p>` : ''}
      <p class="form-status" role="status" aria-live="polite" data-status></p>
    </form>
    <div class="subscribe-success" data-success hidden tabindex="-1">
      <div class="success-icon">${icon('mail')}</div>
      <h3>${esc(nl.successTitle)}</h3>
      <div class="prose">${markdown(nl.successBody)}</div>
    </div>`;
  } else {
    form = `<div class="subscribe-closed">${icon('hourglass')}<p>${esc(nl.closedMessage)}</p></div>`;
  }

  return `<aside class="subscribe-card card" id="subscribe" aria-labelledby="subscribe-title">
    <h2 class="subscribe-title" id="subscribe-title">${esc(nl.heading)}</h2>
    <div class="subscribe-body prose">${markdown(nl.body)}</div>
    ${perks}
    ${form}
  </aside>`;
}

function hero(settings, ctx) {
  const h = settings.hero;
  const games = enabledSections(settings).some((s) => s.id === 'games');
  return `<section class="hero" aria-labelledby="hero-title">
  <div class="hero-bg" aria-hidden="true"><span class="hero-layer hero-layer-a"></span><span class="hero-layer hero-layer-b"></span></div>
  <div class="container hero-inner">
    <div class="hero-copy">
      ${h.eyebrow ? `<p class="eyebrow">${sigil()}<span>${esc(h.eyebrow)}</span></p>` : ''}
      <h1 id="hero-title">${esc(h.headline)}</h1>
      <div class="lead prose">${markdown(h.intro)}</div>
      ${games ? `<p class="hero-links"><a class="link-arrow" href="#games">See the games ${icon('arrow')}</a></p>` : ''}
    </div>
    ${subscribeCard(settings, ctx)}
  </div>
</section>`;
}

function sectionHead(id, heading, intro) {
  return `<header class="section-head">
      <h2 id="${id}-title">${esc(heading)}</h2>
      ${intro ? `<div class="section-intro prose">${markdown(intro)}</div>` : ''}
    </header>`;
}

function gamesSection(settings, ctx) {
  const g = settings.games;
  const cards = g.items
    .map((item) => {
      const media = item.image
        ? `<img src="${esc(ctx.img(item.image))}" alt="${esc(item.imageAlt)}" width="1200" height="630" loading="lazy" decoding="async">`
        : `<span class="game-media-empty">${sigil()}</span>`;
      const meta = [
        item.status ? `<span class="badge">${esc(item.status)}</span>` : '',
        ...item.tags.map((t) => `<span class="tag">${esc(t)}</span>`),
      ].join('');
      return `<article class="game-card card">
        <div class="game-media">${media}</div>
        <div class="game-body">
          ${meta ? `<div class="game-meta">${meta}</div>` : ''}
          <h3 class="game-title">${item.url ? `<a class="stretched-link" href="${esc(item.url)}">${esc(item.title)}</a>` : esc(item.title)}</h3>
          ${item.description ? `<p class="game-description">${esc(item.description)}</p>` : ''}
          ${item.url ? `<span class="link-arrow" aria-hidden="true">${esc(item.linkLabel)} ${icon('arrow')}</span>` : ''}
        </div>
      </article>`;
    })
    .join('\n');
  return `<section class="section" id="games" aria-labelledby="games-title">
  <div class="container">
    ${sectionHead('games', g.heading, g.intro)}
    <div class="game-grid">
      ${cards}
    </div>
  </div>
</section>`;
}

function devlogSection(settings) {
  const d = settings.devlog;
  const items = [...d.items]
    .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
    .map((post) => {
      const date = post.date ? `<time datetime="${post.date}">${esc(formatDate(post.date, settings.site.language))}</time>` : '';
      const title = post.url ? `<a href="${esc(post.url)}">${esc(post.title)}</a>` : esc(post.title);
      return `<li class="devlog-item card">${date}<h3>${title}</h3>${post.body ? `<div class="prose">${markdown(post.body)}</div>` : ''}</li>`;
    })
    .join('\n');
  return `<section class="section" id="devlog" aria-labelledby="devlog-title">
  <div class="container narrow">
    ${sectionHead('devlog', d.heading, d.intro)}
    <ol class="devlog-list">
      ${items}
    </ol>
  </div>
</section>`;
}

function aboutSection(settings, ctx) {
  const a = settings.about;
  const image = a.image
    ? `<figure class="about-media card"><img src="${esc(ctx.img(a.image))}" alt="${esc(a.imageAlt)}" loading="lazy" decoding="async"></figure>`
    : '';
  return `<section class="section" id="about" aria-labelledby="about-title">
  <div class="container about-grid${image ? ' has-image' : ''}">
    <div class="about-copy">
      <h2 id="about-title">${esc(a.heading)}</h2>
      <div class="prose">${markdown(a.body)}</div>
      ${socialLinks(settings, 'socials socials-large')}
    </div>
    ${image}
  </div>
</section>`;
}

function ctaSection(settings) {
  const c = settings.cta;
  return `<section class="section cta-section" aria-labelledby="cta-title">
  <div class="container">
    <div class="cta card">
      ${sigil('sigil cta-sigil')}
      <h2 id="cta-title">${esc(c.heading)}</h2>
      ${c.body ? `<div class="prose">${markdown(c.body)}</div>` : ''}
      <a class="btn btn-primary btn-large" href="#subscribe">${esc(c.buttonLabel)}</a>
    </div>
  </div>
</section>`;
}

function homePage(settings, ctx) {
  const renderers = { games: gamesSection, devlog: devlogSection, about: aboutSection, cta: ctaSection };
  const sections = enabledSections(settings).map((s) => renderers[s.id](settings, ctx));
  return [hero(settings, ctx), ...sections].join('\n');
}

// --- other pages ---------------------------------------------------------------

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
  const images = imageOrigins(s);

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
    <p><strong>Why:</strong> to send you game development updates, news about releases and playtest invitations.</p>
    <p><strong>Legal basis:</strong> your consent (Art. 6(1)(a) GDPR). We use double opt-in: you only start receiving emails after you click the link in the confirmation email. You can withdraw your consent at any time using the unsubscribe link in every email, or by contacting us. Withdrawing consent does not affect anything sent before.</p>
    <p><strong>How it works:</strong> when you press the subscribe button, your email address is sent directly from your browser to ${providerLink}. It is never stored on this website.</p>

    <h2>Visiting this website</h2>
    <p>This website is hosted on GitHub Pages. Like any web server, GitHub processes technical data such as your IP address, browser type and the pages requested, to deliver the site and keep it secure. GitHub may log visitor IP addresses for security purposes. The legal basis is our legitimate interest in running a secure website (Art. 6(1)(f) GDPR). We do not have access to these logs and do not use any analytics.</p>
    <p>Fonts and images are served from this website itself${images.length ? `, except images loaded from ${images.map((o) => esc(new URL(o).host)).join(', ')}` : ''}. No content is loaded from advertising or tracking services.</p>

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

function confirmedPage(settings) {
  const nl = settings.newsletter;
  const games = enabledSections(settings).some((s) => s.id === 'games');
  return `<section class="page page-center">
  <div class="container narrow">
    <div class="success-icon success-icon-large">${icon('check')}</div>
    <h1>${esc(nl.confirmedTitle)}</h1>
    <div class="prose lead">${markdown(nl.confirmedBody)}</div>
    <p class="actions">
      ${games ? `<a class="btn btn-primary" href="/#games">Play the games</a>` : ''}
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

// --- public API ----------------------------------------------------------------

function context(settings, opts) {
  const now = opts.now ?? new Date();
  return {
    provider: resolveProvider(settings.newsletter),
    preview: Boolean(opts.preview),
    version: opts.version ?? '',
    themeHref: opts.themeHref,
    img: opts.resolveImage ?? ((src) => src),
    year: now.getUTCFullYear(),
    now,
    repo: opts.repo,
  };
}

/** Render one page to an HTML string. Used for the admin preview. */
export function renderPage(settings, pageId, opts = {}) {
  const ctx = context(settings, opts);
  const bodies = {
    home: () => homePage(settings, ctx),
    privacy: () => privacyPage(settings, ctx),
    confirmed: () => confirmedPage(settings, ctx),
    legal: () => legalPage(settings, ctx),
    notfound: () => notFoundPage(settings, ctx),
  };
  return layout(settings, ctx, pageId, (bodies[pageId] ?? bodies.home)());
}

/** Render every generated file of the site: { "path/in/dist": "contents" }. */
export function renderSite(settings, opts = {}) {
  const ctx = context(settings, opts);
  const s = settings;
  const files = {};
  const pages = ['home', 'privacy', 'confirmed', 'notfound', ...(s.legal.enabled ? ['legal'] : [])];
  for (const id of pages) files[PAGES[id].file] = renderPage(s, id, opts);

  files['assets/css/theme.css'] = themeCss(s.theme);
  files['assets/img/favicon.svg'] = faviconSvg(s.theme.colors.accent);

  const sitemapPages = ['home', 'privacy', ...(s.legal.enabled ? ['legal'] : [])];
  const today = ctx.now.toISOString().slice(0, 10);
  files['sitemap.xml'] = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapPages.map((id) => `  <url><loc>${esc(s.site.url + PAGES[id].path)}</loc><lastmod>${today}</lastmod></url>`).join('\n')}
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
