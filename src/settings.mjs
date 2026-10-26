// Default site settings and the normaliser that every settings object passes through,
// both when the admin edits it and when the build renders it. Unknown keys are dropped,
// strings are length-limited, enums/colours/URLs are validated, so a broken or tampered
// site.json can never produce unsafe output.

import { BRAND_ICONS, PERK_ICONS } from './icons.mjs';
import { PROVIDER_IDS } from './providers.mjs';
import {
  BUTTON_STYLES,
  CARD_STYLES,
  DEFAULT_NAV_LOOK,
  DEFAULT_TEXT_STYLE,
  FONT_IDS,
  FORM_LAYOUTS,
  HEADING_CASES,
  HERO_BACKGROUNDS,
  NAV_COLORS,
  NAV_SHADOWS,
  PRESETS,
  TEXT_CASES,
  TEXT_COLORS,
  TEXT_ROLES,
  TEXT_SHADOWS,
} from './themes.mjs';
import { clamp, isEmail, isHexColor, isPlainObject, safeAssetPath, safeUrl, slugify } from './util.mjs';

// 3: social band and effects became top-level settings; social links can be saved without a URL.
// 4: band layout, perk icon and text styles. All new keys default safely, so no migration is needed.
export const SCHEMA_VERSION = 4;
export const NAV_IDS = ['home', 'news', 'press'];
export const NAV_LABELS = { home: 'Home', news: 'News', press: 'Press kit' };
export const HOME_LAYOUTS = { 'about-first': 'About text first, then sign-up', 'signup-first': 'Sign-up first, then about text' };
export const PRESS_SECTION_IDS = ['factsheet', 'description', 'history', 'features', 'images', 'logos', 'videos', 'quotes', 'team', 'contact'];
export const PRESS_SECTION_LABELS = {
  factsheet: 'Factsheet',
  description: 'Description',
  history: 'History',
  features: 'Features',
  images: 'Screenshots',
  logos: 'Logo & icon',
  videos: 'Videos',
  quotes: 'Press & quotes',
  team: 'Team',
  contact: 'Contact',
};
export const LOGO_BACKGROUNDS = { dark: 'Dark tile', light: 'Light tile', checker: 'Checkerboard' };
const EXTRA_PLATFORMS = { email: 'Email', website: 'Website', rss: 'RSS feed' };
export const SOCIAL_GROUPS = {
  'Stores & platforms': ['steam', 'itch', 'epic', 'gog', 'playstation', 'appstore', 'googleplay', 'gamejolt', 'newgrounds'],
  Community: ['discord', 'reddit', 'telegram'],
  'Video & streaming': ['youtube', 'twitch', 'kick', 'tiktok'],
  Social: ['bluesky', 'x', 'mastodon', 'threads', 'instagram', 'facebook', 'tumblr'],
  'Support & crowdfunding': ['kickstarter', 'patreon', 'kofi', 'buymeacoffee'],
  Other: ['github', 'artstation', 'substack', 'linktree', 'email', 'website', 'rss'],
};
export const SOCIAL_PLATFORMS = Object.fromEntries(Object.values(SOCIAL_GROUPS).flat().map((id) => [id, BRAND_ICONS[id]?.title ?? EXTRA_PLATFORMS[id]]));
export const NAV_STYLES = { 'bar-stepped': 'Hanging bar, pixel corners', 'bar-rounded': 'Hanging bar, rounded corners', classic: 'Full-width header' };
export const BAND_PLACES = { all: 'Every page', home: 'Home page only', off: 'Nowhere' };
export const BAND_LAYOUTS = { inline: 'Under the sign-up form', strip: 'Strip above the footer' };
export const PERK_ICON_CHOICES = [...Object.keys(PERK_ICONS), 'none', 'custom'];
export const PERK_ICON_COLORS = { accent: 'Accent', accent2: 'Second accent', text: 'Text colour', muted: 'Secondary text' };
export const HALFTONE_PLACES = { home: 'Home page background', all: 'Every page' };
export const HALFTONE_COLORS = { accent2: 'Second accent', accent: 'Accent', text: 'Text colour' };
export const LIMITS = { posts: 100, perks: 6, socials: 24, facts: 20, features: 20, images: 40, logos: 12, videos: 12, quotes: 20, team: 30 };

const DEFAULT_PRESET = PRESETS.twilight;

export const DEFAULT_SETTINGS = {
  schemaVersion: SCHEMA_VERSION,
  site: {
    name: 'Elarion',
    url: 'https://elarion-game-dev.github.io',
    language: 'en',
    contactEmail: '',
    copyrightName: 'Elarion',
  },
  nav: {
    home: { enabled: true, label: 'Home' },
    news: { enabled: true, label: 'News' },
    press: { enabled: true, label: 'Press Kit' },
    style: 'bar-stepped',
    dividers: true,
    showSocials: true,
    look: { ...DEFAULT_NAV_LOOK },
  },
  home: {
    layout: 'about-first',
    showLogo: true,
    logoImage: '',
    logoImageAlt: '',
    about: {
      enabled: true,
      heading: 'About Elarion',
      body: 'Elarion is an indie game developer building a new game in the open. Follow along from the first sketches to launch day, and help shape the game in early playtests.',
    },
  },
  socialBand: { show: 'all', layout: 'inline', heading: 'Follow Elarion' },
  footer: { note: 'No cookies, no tracking.' },
  effects: {
    crt: { enabled: true, scanlines: 22, flicker: true, rgbText: true, vignette: true },
    halftone: { enabled: true, where: 'home', color: 'accent2', opacity: 30, size: 11, angle: 45, mouse: 60 },
  },
  newsletter: {
    provider: 'none',
    kit: { formId: '' },
    mailerlite: { accountId: '', formId: '' },
    buttondown: { username: '', tag: 'website' },
    custom: { action: '', emailField: 'email', providerName: '', privacyUrl: '' },
    heading: 'Get early playtest access and exclusive development updates',
    body: '',
    showPerks: true,
    perks: ['Exclusive screenshots', 'Early builds', 'Concept art', 'Developer insights'],
    perkIcon: 'sparkle',
    perkImage: '',
    perkIconColor: 'accent',
    perkIconSize: 14,
    emailLabel: 'Email',
    placeholder: 'you@example.com',
    buttonLabel: 'Subscribe',
    trustText: '',
    requireConsent: false,
    consentText: '',
    successTitle: 'Almost there! Check your inbox.',
    successBody: "I've sent you a confirmation link. Click it to finish subscribing. Nothing there after a few minutes? Check your spam folder.",
    closedMessage: 'Sign-ups open very soon. Check back in a day or two!',
    confirmedTitle: "You're in. Welcome aboard!",
    confirmedBody: 'Thanks for confirming your email. Playtest invites, screenshots and development updates will land straight in your inbox.',
    showOnNews: true,
  },
  wishlist: {
    enabled: true,
    url: '',
    text: 'Wishlisting the game on Steam is the best way to support it.',
    buttonLabel: 'Wishlist on Steam',
  },
  theme: {
    preset: 'twilight',
    colors: { ...DEFAULT_PRESET.colors },
    headingFont: DEFAULT_PRESET.headingFont,
    bodyFont: DEFAULT_PRESET.bodyFont,
    headingCase: DEFAULT_PRESET.headingCase,
    buttonStyle: DEFAULT_PRESET.buttonStyle,
    formLayout: 'stacked',
    baseSize: 18,
    radius: DEFAULT_PRESET.radius,
    heroBackground: DEFAULT_PRESET.heroBackground,
    heroImage: '',
    heroBlur: 14,
    heroOverlay: 70,
    cardStyle: DEFAULT_PRESET.cardStyle,
    animations: true,
    logo: '',
    favicon: '',
  },
  textStyles: Object.fromEntries(Object.keys(TEXT_ROLES).map((id) => [id, { ...DEFAULT_TEXT_STYLE }])),
  news: {
    heading: 'News',
    intro: 'Development updates, new builds and behind-the-scenes notes.',
    readMoreLabel: 'Read more',
    posts: [
      {
        title: 'Welcome to Elarion',
        slug: 'welcome',
        date: '2026-10-25',
        image: '',
        imageAlt: '',
        summary: 'The site is live. This is where development news will land.',
        body: "This is where I'll post development news: new builds, screenshots, concept art and the occasional deep-dive into how things work.\n\nWant it all first? Join the newsletter. Subscribers get early playtest access.",
        url: '',
        linkLabel: '',
      },
    ],
  },
  press: {
    heading: 'Press kit',
    intro: 'Everything you need to write about Elarion. All images and logos may be used in coverage.',
    sections: PRESS_SECTION_IDS.map((id) => ({ id, enabled: true, heading: PRESS_SECTION_LABELS[id] })),
    facts: [
      { label: 'Developer', value: 'Elarion', url: '' },
      { label: 'Status', value: 'First game in development', url: '' },
      { label: 'Website', value: 'elarion-game-dev.github.io', url: 'https://elarion-game-dev.github.io/' },
    ],
    description: 'Elarion is an independent game developer. The first game is in development and will be announced soon.\n\nJoin the newsletter for early playtest access and exclusive development updates.',
    history: '',
    features: [],
    images: [],
    logos: [
      { src: '/assets/press/elarion-logo-light.png', label: 'Logo, light (for dark backgrounds)', background: 'dark' },
      { src: '/assets/press/elarion-logo-dark.png', label: 'Logo, dark (for light backgrounds)', background: 'light' },
      { src: '/assets/press/elarion-mark.png', label: 'Icon', background: 'dark' },
    ],
    videos: [],
    quotes: [],
    team: [],
    contact: 'For press enquiries, review copies and interviews, get in touch.',
  },
  // Common game-dev links, ready to fill in. Entries without a URL are only shown (faded) in the admin preview.
  socials: ['steam', 'discord', 'youtube', 'bluesky', 'x', 'tiktok'].map((platform) => ({ platform, url: '', label: '', inMenu: true, inBand: true })),
  privacy: {
    controllerName: '',
    controllerAddress: '',
    country: '',
    minimumAge: 16,
    emailTracking: true,
    effectiveDate: '2026-10-25',
    extra: '',
  },
  legal: {
    enabled: false,
    heading: 'Legal notice',
    body: '',
  },
  seo: {
    title: 'Elarion · Indie game developer',
    description: 'Elarion is an indie game developer. Join the newsletter for early playtest access and exclusive development updates.',
    ogImage: '/assets/img/og.png',
    ogImageAlt: 'Elarion: get early playtest access and exclusive development updates',
    indexable: true,
  },
};

// --- normalising helpers -----------------------------------------------------

function str(value, max, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
}
const line = (value, max, fallback) => str(value, max, fallback).replace(/\n+/g, ' ');
const required = (value, max, fallback) => line(value, max, fallback) || fallback;
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);
const color = (value, fallback) => (isHexColor(value) ? value.toLowerCase() : fallback);
const num = (value, min, max, fallback) => (Number.isFinite(Number(value)) && value !== '' && value !== null ? Math.round(clamp(value, min, max)) : fallback);
const date = (value, fallback = '') => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? value : fallback);
const list = (value, max, fallback) => (Array.isArray(value) ? value.slice(0, max) : fallback);
const obj = (value) => (isPlainObject(value) ? value : {});
const link = (value) => safeUrl(line(value, 500, ''));
const httpLink = (value) => safeUrl(line(value, 500, ''), { allowMailto: false, allowRelative: false });
// Images must be files uploaded to this site, so pages never load anything from another server.
const image = (value) => safeAssetPath(value);
// A colour picked from the theme (by name) or a custom hex value.
const themeColor = (value, names, fallback) => (isHexColor(value) ? value.toLowerCase() : oneOf(value, Object.keys(names), fallback));

/** Ordered on/off sections: keeps the given order, drops unknown ids, appends missing ones. */
function sectionList(value, ids, defaults, labels) {
  const seen = new Set();
  const out = [];
  for (const raw of list(value, 40, defaults)) {
    const s = obj(raw);
    if (!ids.includes(s.id) || seen.has(s.id)) continue;
    seen.add(s.id);
    out.push({ id: s.id, enabled: bool(s.enabled, true), heading: required(s.heading, 80, labels[s.id]) });
  }
  for (const id of ids) if (!seen.has(id)) out.push({ id, enabled: false, heading: labels[id] });
  return out;
}

function posts(value) {
  const used = new Set();
  return list(value, LIMITS.posts, DEFAULT_SETTINGS.news.posts).map((raw) => {
    const p = obj(raw);
    const title = line(p.title, 140, '');
    const base = typeof p.slug === 'string' && /^[a-z0-9]+(-[a-z0-9]+)*$/.test(p.slug) && p.slug.length <= 60 ? p.slug : slugify(title, 'post');
    let slug = base;
    for (let n = 2; used.has(slug); n++) slug = `${base}-${n}`;
    used.add(slug);
    return {
      title,
      slug,
      date: date(p.date),
      image: image(p.image),
      imageAlt: line(p.imageAlt, 200, ''),
      summary: str(p.summary, 400, ''),
      body: str(p.body, 20000, ''),
      url: link(p.url),
      linkLabel: line(p.linkLabel, 40, ''),
    };
  });
}

/**
 * Returns a complete, valid settings object. Missing values fall back to defaults only where
 * a fallback makes sense; free-text lists (posts, socials…) keep exactly what the admin entered.
 */
export function normalizeSettings(input) {
  const raw = obj(input);
  const d = DEFAULT_SETTINGS;
  const site = obj(raw.site);
  const nav = obj(raw.nav);
  const home = obj(raw.home);
  const nl = obj(raw.newsletter);
  const wish = obj(raw.wishlist);
  const theme = obj(raw.theme);
  const colors = obj(theme.colors);
  const news = obj(raw.news);
  const press = obj(raw.press);
  const privacy = obj(raw.privacy);
  const legal = obj(raw.legal);
  const seo = obj(raw.seo);
  // Settings saved before version 3 kept the band under home.socials and dropped links without a URL.
  const legacy = Number(raw.schemaVersion) < 3;
  const oldBand = obj(home.socials);
  const band = raw.socialBand
    ? obj(raw.socialBand)
    : legacy && raw.home?.socials
      ? { show: oldBand.enabled === false ? 'off' : 'all', heading: oldBand.heading }
      : {};
  const socialsIn = legacy && Array.isArray(raw.socials) && raw.socials.length === 0 ? d.socials : raw.socials;
  const crt = obj(obj(raw.effects).crt);
  const dots = obj(obj(raw.effects).halftone);
  const dc = d.effects.crt;
  const dd = d.effects.halftone;
  const email = line(site.contactEmail, 254, '').trim();

  return {
    schemaVersion: SCHEMA_VERSION,
    site: {
      name: required(site.name, 60, d.site.name),
      url: httpLink(site.url).replace(/\/+$/, '') || d.site.url,
      language: /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(site.language) ? site.language : d.site.language,
      contactEmail: isEmail(email) ? email : '',
      copyrightName: line(site.copyrightName, 80, d.site.copyrightName),
    },
    nav: {
      ...Object.fromEntries(
        NAV_IDS.map((id) => {
          const item = obj(nav[id]);
          return [id, { enabled: bool(item.enabled, d.nav[id].enabled), label: required(item.label, 30, d.nav[id].label) }];
        })
      ),
      style: oneOf(nav.style, Object.keys(NAV_STYLES), d.nav.style),
      dividers: bool(nav.dividers, d.nav.dividers),
      showSocials: bool(nav.showSocials, d.nav.showSocials),
      look: (() => {
        const look = obj(nav.look);
        const dl = DEFAULT_NAV_LOOK;
        return {
          background: themeColor(look.background, NAV_COLORS, dl.background),
          opacity: num(look.opacity, 30, 100, dl.opacity),
          linkColor: themeColor(look.linkColor, NAV_COLORS, dl.linkColor),
          activeColor: themeColor(look.activeColor, NAV_COLORS, dl.activeColor),
          iconColor: themeColor(look.iconColor, NAV_COLORS, dl.iconColor),
          dividerColor: themeColor(look.dividerColor, NAV_COLORS, dl.dividerColor),
          size: num(look.size, 70, 160, dl.size),
          shadow: oneOf(look.shadow, Object.keys(NAV_SHADOWS), dl.shadow),
        };
      })(),
    },
    home: {
      layout: oneOf(home.layout, Object.keys(HOME_LAYOUTS), d.home.layout),
      showLogo: bool(home.showLogo, d.home.showLogo),
      logoImage: image(home.logoImage),
      logoImageAlt: line(home.logoImageAlt, 200, ''),
      about: {
        enabled: bool(obj(home.about).enabled, d.home.about.enabled),
        heading: line(obj(home.about).heading, 100, d.home.about.heading),
        body: str(obj(home.about).body, 3000, d.home.about.body),
      },
    },
    socialBand: {
      show: oneOf(band.show, Object.keys(BAND_PLACES), d.socialBand.show),
      layout: oneOf(band.layout, Object.keys(BAND_LAYOUTS), d.socialBand.layout),
      heading: line(band.heading, 80, d.socialBand.heading),
    },
    footer: { note: line(obj(raw.footer).note, 120, d.footer.note) },
    effects: {
      crt: {
        enabled: bool(crt.enabled, dc.enabled),
        scanlines: num(crt.scanlines, 0, 60, dc.scanlines),
        flicker: bool(crt.flicker, dc.flicker),
        rgbText: bool(crt.rgbText, dc.rgbText),
        vignette: bool(crt.vignette, dc.vignette),
      },
      halftone: {
        enabled: bool(dots.enabled, dd.enabled),
        where: oneOf(dots.where, Object.keys(HALFTONE_PLACES), dd.where),
        color: oneOf(dots.color, Object.keys(HALFTONE_COLORS), dd.color),
        opacity: num(dots.opacity, 5, 80, dd.opacity),
        size: num(dots.size, 6, 28, dd.size),
        angle: num(dots.angle, 0, 90, dd.angle),
        mouse: num(dots.mouse, 0, 100, dd.mouse),
      },
    },
    newsletter: {
      provider: oneOf(nl.provider, PROVIDER_IDS, 'none'),
      kit: { formId: line(obj(nl.kit).formId, 20, '').trim() },
      mailerlite: { accountId: line(obj(nl.mailerlite).accountId, 40, '').trim(), formId: line(obj(nl.mailerlite).formId, 40, '').trim() },
      buttondown: { username: line(obj(nl.buttondown).username, 64, '').trim(), tag: line(obj(nl.buttondown).tag, 40, '').trim() },
      custom: {
        action: httpLink(obj(nl.custom).action),
        emailField: required(line(obj(nl.custom).emailField, 64, '').trim(), 64, 'email'),
        providerName: line(obj(nl.custom).providerName, 60, '').trim(),
        privacyUrl: httpLink(obj(nl.custom).privacyUrl),
      },
      heading: required(nl.heading, 140, d.newsletter.heading),
      body: str(nl.body, 600, d.newsletter.body),
      showPerks: bool(nl.showPerks, d.newsletter.showPerks),
      perks: list(nl.perks, LIMITS.perks, d.newsletter.perks).map((p) => line(p, 60, '')).filter(Boolean),
      perkIcon: oneOf(nl.perkIcon, PERK_ICON_CHOICES, d.newsletter.perkIcon),
      perkImage: image(nl.perkImage),
      perkIconColor: oneOf(nl.perkIconColor, Object.keys(PERK_ICON_COLORS), d.newsletter.perkIconColor),
      perkIconSize: num(nl.perkIconSize, 8, 40, d.newsletter.perkIconSize),
      emailLabel: required(nl.emailLabel, 60, d.newsletter.emailLabel),
      placeholder: line(nl.placeholder, 60, d.newsletter.placeholder),
      buttonLabel: required(nl.buttonLabel, 40, d.newsletter.buttonLabel),
      trustText: line(nl.trustText, 300, d.newsletter.trustText),
      requireConsent: bool(nl.requireConsent, d.newsletter.requireConsent),
      // Nothing under the form unless written in; only a turned-on checkbox gets words of its own.
      consentText: bool(nl.requireConsent, d.newsletter.requireConsent)
        ? required(nl.consentText, 400, 'I want to receive the Elarion newsletter. See the {privacy}.')
        : line(nl.consentText, 400, ''),
      successTitle: required(nl.successTitle, 100, d.newsletter.successTitle),
      successBody: str(nl.successBody, 500, d.newsletter.successBody),
      closedMessage: line(nl.closedMessage, 200, d.newsletter.closedMessage),
      confirmedTitle: required(nl.confirmedTitle, 100, d.newsletter.confirmedTitle),
      confirmedBody: str(nl.confirmedBody, 600, d.newsletter.confirmedBody),
      showOnNews: bool(nl.showOnNews, d.newsletter.showOnNews),
    },
    wishlist: {
      enabled: bool(wish.enabled, d.wishlist.enabled),
      url: httpLink(wish.url),
      text: line(wish.text, 200, d.wishlist.text),
      buttonLabel: required(wish.buttonLabel, 40, d.wishlist.buttonLabel),
    },
    theme: {
      preset: oneOf(theme.preset, [...Object.keys(PRESETS), 'custom'], 'custom'),
      colors: Object.fromEntries(Object.entries(d.theme.colors).map(([k, v]) => [k, color(colors[k], v)])),
      headingFont: oneOf(theme.headingFont, FONT_IDS, d.theme.headingFont),
      bodyFont: oneOf(theme.bodyFont, FONT_IDS, d.theme.bodyFont),
      headingCase: oneOf(theme.headingCase, Object.keys(HEADING_CASES), d.theme.headingCase),
      buttonStyle: oneOf(theme.buttonStyle, Object.keys(BUTTON_STYLES), d.theme.buttonStyle),
      formLayout: oneOf(theme.formLayout, Object.keys(FORM_LAYOUTS), d.theme.formLayout),
      baseSize: num(theme.baseSize, 14, 22, d.theme.baseSize),
      radius: num(theme.radius, 0, 32, d.theme.radius),
      heroBackground: oneOf(theme.heroBackground, Object.keys(HERO_BACKGROUNDS), d.theme.heroBackground),
      heroImage: image(theme.heroImage),
      heroBlur: num(theme.heroBlur, 0, 40, d.theme.heroBlur),
      heroOverlay: num(theme.heroOverlay, 0, 95, d.theme.heroOverlay),
      cardStyle: oneOf(theme.cardStyle, Object.keys(CARD_STYLES), d.theme.cardStyle),
      animations: bool(theme.animations, d.theme.animations),
      logo: image(theme.logo),
      favicon: image(theme.favicon),
    },
    textStyles: Object.fromEntries(
      Object.keys(TEXT_ROLES).map((id) => {
        const t = obj(obj(raw.textStyles)[id]);
        const dt = DEFAULT_TEXT_STYLE;
        return [
          id,
          {
            font: t.font === '' ? '' : oneOf(t.font, FONT_IDS, dt.font),
            weight: t.weight === 0 ? 0 : Math.round(num(t.weight, 100, 900, dt.weight) / 100) * 100,
            size: num(t.size, 50, 250, dt.size),
            case: oneOf(t.case, Object.keys(TEXT_CASES), dt.case),
            color: oneOf(t.color, Object.keys(TEXT_COLORS), dt.color),
            customColor: color(t.customColor, dt.customColor),
            tracking: num(t.tracking, -10, 40, dt.tracking),
            shadow: oneOf(t.shadow, Object.keys(TEXT_SHADOWS), dt.shadow),
            crt: bool(t.crt, dt.crt),
          },
        ];
      })
    ),
    news: {
      heading: required(news.heading, 80, d.news.heading),
      intro: str(news.intro, 500, d.news.intro),
      readMoreLabel: required(news.readMoreLabel, 40, d.news.readMoreLabel),
      posts: posts(news.posts),
    },
    press: {
      heading: required(press.heading, 80, d.press.heading),
      intro: str(press.intro, 1000, d.press.intro),
      sections: sectionList(press.sections, PRESS_SECTION_IDS, d.press.sections, PRESS_SECTION_LABELS),
      facts: list(press.facts, LIMITS.facts, d.press.facts)
        .map((f) => ({ label: line(obj(f).label, 60, ''), value: line(obj(f).value, 200, ''), url: link(obj(f).url) }))
        .filter((f) => f.label || f.value),
      description: str(press.description, 6000, d.press.description),
      history: str(press.history, 6000, ''),
      features: list(press.features, LIMITS.features, []).map((f) => line(f, 200, '')).filter(Boolean),
      images: list(press.images, LIMITS.images, []).map((i) => ({ src: image(obj(i).src), caption: line(obj(i).caption, 200, '') })),
      logos: list(press.logos, LIMITS.logos, d.press.logos).map((i) => ({
        src: image(obj(i).src),
        label: line(obj(i).label, 100, ''),
        background: oneOf(obj(i).background, Object.keys(LOGO_BACKGROUNDS), 'checker'),
      })),
      videos: list(press.videos, LIMITS.videos, []).map((v) => ({ title: line(obj(v).title, 120, ''), url: httpLink(obj(v).url) })),
      quotes: list(press.quotes, LIMITS.quotes, []).map((q) => ({ quote: str(obj(q).quote, 600, ''), source: line(obj(q).source, 120, ''), url: httpLink(obj(q).url) })),
      team: list(press.team, LIMITS.team, []).map((t) => ({ name: line(obj(t).name, 80, ''), role: line(obj(t).role, 80, ''), url: link(obj(t).url) })),
      contact: str(press.contact, 1000, d.press.contact),
    },
    // Entries without a URL are kept so the admin can offer them ready to fill in; pages skip them.
    socials: list(socialsIn, LIMITS.socials, d.socials).map((s) => {
      const item = obj(s);
      return {
        platform: oneOf(item.platform, Object.keys(SOCIAL_PLATFORMS), 'website'),
        url: link(item.url),
        label: line(item.label, 40, ''),
        inMenu: bool(item.inMenu, true),
        inBand: bool(item.inBand, true),
      };
    }),
    privacy: {
      controllerName: line(privacy.controllerName, 120, ''),
      controllerAddress: str(privacy.controllerAddress, 300, ''),
      country: line(privacy.country, 60, ''),
      minimumAge: num(privacy.minimumAge, 13, 18, d.privacy.minimumAge),
      emailTracking: bool(privacy.emailTracking, d.privacy.emailTracking),
      effectiveDate: date(privacy.effectiveDate, d.privacy.effectiveDate),
      extra: str(privacy.extra, 6000, ''),
    },
    legal: {
      enabled: bool(legal.enabled, false),
      heading: required(legal.heading, 80, d.legal.heading),
      body: str(legal.body, 6000, ''),
    },
    seo: {
      title: required(seo.title, 120, d.seo.title),
      description: line(seo.description, 300, d.seo.description),
      ogImage: image(seo.ogImage),
      ogImageAlt: line(seo.ogImageAlt, 200, ''),
      indexable: bool(seo.indexable, true),
    },
  };
}

/** Things the site owner still needs to do; shown on the admin overview. */
export function setupChecklist(settings, provider) {
  return [
    {
      id: 'provider',
      done: provider.ready,
      title: 'Connect an email provider',
      detail: provider.ready ? `Sign-ups go to ${provider.name}.` : 'Until this is done, the sign-up form shows a "coming soon" message.',
      panel: 'newsletter',
    },
    {
      id: 'contact',
      done: Boolean(settings.site.contactEmail),
      title: 'Add a contact email',
      detail: 'Required by GDPR for privacy requests, and used as the press contact.',
      panel: 'privacy',
    },
    {
      id: 'controller',
      done: Boolean(settings.privacy.controllerName && settings.privacy.country),
      title: 'Fill in who runs the site',
      detail: 'Your name (or company) and country for the privacy policy.',
      panel: 'privacy',
    },
    {
      id: 'wishlist',
      done: !settings.wishlist.enabled || Boolean(settings.wishlist.url),
      optional: true,
      title: 'Add your Steam page (optional)',
      detail: 'Shown as a "Wishlist on Steam" button after people subscribe.',
      panel: 'home',
    },
    {
      id: 'socials',
      done: settings.socials.some((s) => s.url),
      optional: true,
      title: 'Add your social links (optional)',
      detail: 'They appear in the top menu and the "Follow" band.',
      panel: 'socials',
    },
  ];
}
