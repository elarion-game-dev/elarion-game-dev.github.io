// Default site settings and the normaliser that every settings object passes through,
// both when the admin edits it and when the build renders it. Unknown keys are dropped,
// strings are length-limited, enums/colours/URLs are validated, so a broken or tampered
// site.json can never produce unsafe output.

import { PROVIDER_IDS } from './providers.mjs';
import { CARD_STYLES, FONT_IDS, HERO_BACKGROUNDS, HERO_LAYOUTS, PRESETS } from './themes.mjs';
import { BRAND_ICONS } from './icons.mjs';
import { clamp, isEmail, isHexColor, isPlainObject, safeAssetPath, safeImage, safeUrl } from './util.mjs';

export const SCHEMA_VERSION = 1;
export const SECTION_IDS = ['games', 'devlog', 'about', 'cta'];
export const SECTION_LABELS = { games: 'Games', devlog: 'Devlog', about: 'About', cta: 'Closing call-to-action' };
export const SOCIAL_PLATFORMS = { ...Object.fromEntries(Object.entries(BRAND_ICONS).map(([k, v]) => [k, v.title])), email: 'Email', website: 'Website', rss: 'RSS' };
export const LIMITS = { games: 24, devlog: 60, perks: 6, socials: 16, tags: 6 };

export const DEFAULT_SETTINGS = {
  schemaVersion: SCHEMA_VERSION,
  site: {
    name: 'Elarion',
    url: 'https://elarion-game-dev.github.io',
    language: 'en',
    contactEmail: '',
    copyrightName: 'Elarion',
  },
  hero: {
    eyebrow: 'Indie game developer',
    headline: 'Physics, chaos and a little bit of magic.',
    intro:
      "I'm Elarion, and I make browser games where things explode, shatter and pile up. Join the newsletter to follow each new game from its first prototype to launch.",
  },
  newsletter: {
    provider: 'none',
    kit: { formId: '' },
    mailerlite: { accountId: '', formId: '' },
    buttondown: { username: '', tag: 'website' },
    custom: { action: '', emailField: 'email', providerName: '', privacyUrl: '' },
    heading: 'Follow the journey',
    body: "Get an email when there's something worth showing: new prototypes, behind-the-scenes notes and early playtest invites.",
    perks: ['Early access to playtests', 'Behind-the-scenes devlogs', 'Launch news before anyone else'],
    emailLabel: 'Email address',
    placeholder: 'you@example.com',
    buttonLabel: 'Subscribe',
    requireConsent: true,
    consentText: "I'd like to receive the Elarion newsletter and I've read the {privacy}. I can unsubscribe at any time.",
    finePrint: "No spam, ever. You'll confirm your address first, and every email has a one-click unsubscribe link.",
    successTitle: 'Almost there! Check your inbox.',
    successBody: "I've sent you a confirmation link. Click it to finish subscribing. Nothing there after a few minutes? Check your spam folder.",
    closedMessage: 'The newsletter opens very soon. Check back in a day or two!',
    confirmedTitle: "You're in. Welcome aboard!",
    confirmedBody: 'Thanks for confirming your email. The next devlog will land straight in your inbox. Until then, why not play one of the prototypes?',
  },
  theme: {
    preset: 'arcane',
    colors: { ...PRESETS.arcane.colors },
    headingFont: PRESETS.arcane.headingFont,
    bodyFont: PRESETS.arcane.bodyFont,
    baseSize: 17,
    radius: 14,
    heroLayout: 'split',
    heroBackground: PRESETS.arcane.heroBackground,
    heroImage: '',
    heroOverlay: 65,
    cardStyle: PRESETS.arcane.cardStyle,
    animations: true,
    logo: '',
    favicon: '',
  },
  sections: SECTION_IDS.map((id) => ({ id, enabled: id !== 'devlog' })),
  games: {
    heading: 'Games',
    intro: 'Prototypes you can play right now, straight in your browser.',
    items: [
      {
        title: 'Mage vs. Horde',
        description: 'Cast huge spells from a tower into an endless horde of orcs. A physics prototype.',
        url: 'https://elarion-game-dev.github.io/mage-vs-horde/',
        image: 'https://elarion-game-dev.github.io/mage-vs-horde/preview.jpg',
        imageAlt: 'A meteor lands in a horde of orcs, seen from the top of a stone tower.',
        status: 'Playable prototype',
        tags: ['Browser', 'Physics'],
        linkLabel: 'Play in browser',
      },
      {
        title: 'Bottle Roll Incremental',
        description: 'Roll glass bottles down the stairs, film the smash and grow your channel.',
        url: 'https://elarion-game-dev.github.io/bottle-roll-incremental/',
        image: 'https://elarion-game-dev.github.io/bottle-roll-incremental/preview.jpg',
        imageAlt: 'A glass bottle shattering on a flight of stairs.',
        status: 'Playable',
        tags: ['Browser', 'Incremental'],
        linkLabel: 'Play in browser',
      },
    ],
  },
  devlog: {
    heading: 'Devlog',
    intro: 'Notes from the workbench.',
    items: [
      {
        date: '2026-10-25',
        title: 'The Elarion site is live',
        body: 'A home for my games, and a newsletter for everyone who wants to follow along.',
        url: '',
      },
    ],
  },
  about: {
    heading: 'About Elarion',
    navLabel: 'About',
    body:
      "Elarion is the name I make games under. I build for the browser, prototype fast and share the process along the way, including the parts that don't work.\n\nRight now I'm exploring physics-heavy ideas: hordes, destruction and satisfying chaos. Subscribe and you'll see each new prototype first.",
    image: '',
    imageAlt: '',
  },
  cta: {
    heading: "Don't miss the next game",
    body: "One email when there's something new to play. No spam, unsubscribe any time.",
    buttonLabel: 'Join the newsletter',
  },
  socials: [{ platform: 'github', url: 'https://github.com/elarion-game-dev', label: '' }],
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
    description: 'Elarion makes physics-driven browser games. Play the prototypes and join the newsletter to follow the journey.',
    ogImage: '/assets/img/og.png',
    ogImageAlt: 'Elarion: indie game developer',
    indexable: true,
  },
};

// --- normalising helpers -----------------------------------------------------

function str(value, max, fallback = '') {
  if (typeof value !== 'string') return fallback;
  return value.replace(/\r\n?/g, '\n').replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '').slice(0, max);
}
const line = (value, max, fallback) => str(value, max, fallback).replace(/\n+/g, ' ');
const bool = (value, fallback) => (typeof value === 'boolean' ? value : fallback);
const oneOf = (value, options, fallback) => (options.includes(value) ? value : fallback);
const color = (value, fallback) => (isHexColor(value) ? value.toLowerCase() : fallback);
const num = (value, min, max, fallback) => (Number.isFinite(Number(value)) && value !== '' && value !== null ? Math.round(clamp(value, min, max)) : fallback);
const date = (value, fallback = '') => (/^\d{4}-\d{2}-\d{2}$/.test(String(value ?? '')) ? value : fallback);
const list = (value, max) => (Array.isArray(value) ? value.slice(0, max) : null);
const obj = (value) => (isPlainObject(value) ? value : {});
const link = (value) => safeUrl(line(value, 500, ''));
const httpLink = (value) => safeUrl(line(value, 500, ''), { allowMailto: false, allowRelative: false });

/**
 * Returns a complete, valid settings object. Missing values fall back to defaults only where
 * a fallback makes sense; free-text lists (games, socials…) keep exactly what the admin entered.
 */
export function normalizeSettings(input) {
  const raw = obj(input);
  const d = DEFAULT_SETTINGS;

  const site = obj(raw.site);
  const hero = obj(raw.hero);
  const nl = obj(raw.newsletter);
  const theme = obj(raw.theme);
  const colors = obj(theme.colors);
  const games = obj(raw.games);
  const devlog = obj(raw.devlog);
  const about = obj(raw.about);
  const cta = obj(raw.cta);
  const privacy = obj(raw.privacy);
  const legal = obj(raw.legal);
  const seo = obj(raw.seo);

  const siteUrl = httpLink(site.url).replace(/\/+$/, '') || d.site.url;
  const email = line(site.contactEmail, 254, '').trim();

  const sectionsIn = list(raw.sections, 20) ?? d.sections;
  const seen = new Set();
  const sections = [];
  for (const s of sectionsIn) {
    const id = obj(s).id;
    if (SECTION_IDS.includes(id) && !seen.has(id)) {
      seen.add(id);
      sections.push({ id, enabled: bool(s.enabled, true) });
    }
  }
  for (const id of SECTION_IDS) if (!seen.has(id)) sections.push({ id, enabled: false });

  return {
    schemaVersion: SCHEMA_VERSION,
    site: {
      name: line(site.name, 60, d.site.name) || d.site.name,
      url: siteUrl,
      language: /^[a-z]{2,3}(-[A-Za-z]{2,4})?$/.test(site.language) ? site.language : d.site.language,
      contactEmail: isEmail(email) ? email : '',
      copyrightName: line(site.copyrightName, 80, d.site.copyrightName),
    },
    hero: {
      eyebrow: line(hero.eyebrow, 80, d.hero.eyebrow),
      headline: line(hero.headline, 140, d.hero.headline),
      intro: str(hero.intro, 600, d.hero.intro),
    },
    newsletter: {
      provider: oneOf(nl.provider, PROVIDER_IDS, 'none'),
      kit: { formId: line(obj(nl.kit).formId, 20, '').trim() },
      mailerlite: { accountId: line(obj(nl.mailerlite).accountId, 40, '').trim(), formId: line(obj(nl.mailerlite).formId, 40, '').trim() },
      buttondown: { username: line(obj(nl.buttondown).username, 64, '').trim(), tag: line(obj(nl.buttondown).tag, 40, '').trim() },
      custom: {
        action: httpLink(obj(nl.custom).action),
        emailField: line(obj(nl.custom).emailField, 64, 'email').trim() || 'email',
        providerName: line(obj(nl.custom).providerName, 60, '').trim(),
        privacyUrl: httpLink(obj(nl.custom).privacyUrl),
      },
      heading: line(nl.heading, 100, d.newsletter.heading),
      body: str(nl.body, 500, d.newsletter.body),
      perks: (list(nl.perks, LIMITS.perks) ?? d.newsletter.perks).map((p) => line(p, 100, '')).filter(Boolean),
      emailLabel: line(nl.emailLabel, 60, d.newsletter.emailLabel) || d.newsletter.emailLabel,
      placeholder: line(nl.placeholder, 60, d.newsletter.placeholder),
      buttonLabel: line(nl.buttonLabel, 40, d.newsletter.buttonLabel) || d.newsletter.buttonLabel,
      requireConsent: bool(nl.requireConsent, d.newsletter.requireConsent),
      consentText: line(nl.consentText, 400, d.newsletter.consentText) || d.newsletter.consentText,
      finePrint: line(nl.finePrint, 300, d.newsletter.finePrint),
      successTitle: line(nl.successTitle, 100, d.newsletter.successTitle) || d.newsletter.successTitle,
      successBody: str(nl.successBody, 500, d.newsletter.successBody),
      closedMessage: line(nl.closedMessage, 200, d.newsletter.closedMessage),
      confirmedTitle: line(nl.confirmedTitle, 100, d.newsletter.confirmedTitle) || d.newsletter.confirmedTitle,
      confirmedBody: str(nl.confirmedBody, 600, d.newsletter.confirmedBody),
    },
    theme: {
      preset: oneOf(theme.preset, [...Object.keys(PRESETS), 'custom'], 'custom'),
      colors: Object.fromEntries(Object.entries(d.theme.colors).map(([k, v]) => [k, color(colors[k], v)])),
      headingFont: oneOf(theme.headingFont, FONT_IDS, d.theme.headingFont),
      bodyFont: oneOf(theme.bodyFont, FONT_IDS, d.theme.bodyFont),
      baseSize: num(theme.baseSize, 14, 22, d.theme.baseSize),
      radius: num(theme.radius, 0, 32, d.theme.radius),
      heroLayout: oneOf(theme.heroLayout, Object.keys(HERO_LAYOUTS), d.theme.heroLayout),
      heroBackground: oneOf(theme.heroBackground, Object.keys(HERO_BACKGROUNDS), d.theme.heroBackground),
      heroImage: safeAssetPath(theme.heroImage),
      heroOverlay: num(theme.heroOverlay, 0, 95, d.theme.heroOverlay),
      cardStyle: oneOf(theme.cardStyle, Object.keys(CARD_STYLES), d.theme.cardStyle),
      animations: bool(theme.animations, d.theme.animations),
      logo: safeAssetPath(theme.logo),
      favicon: safeAssetPath(theme.favicon),
    },
    sections,
    games: {
      heading: line(games.heading, 80, d.games.heading),
      intro: str(games.intro, 400, d.games.intro),
      items: (list(games.items, LIMITS.games) ?? d.games.items).map((g) => {
        const item = obj(g);
        return {
          title: line(item.title, 80, ''),
          description: str(item.description, 500, ''),
          url: link(item.url),
          image: safeImage(item.image),
          imageAlt: line(item.imageAlt, 200, ''),
          status: line(item.status, 40, ''),
          tags: (list(item.tags, LIMITS.tags) ?? []).map((t) => line(t, 24, '')).filter(Boolean),
          linkLabel: line(item.linkLabel, 40, 'Play'),
        };
      }),
    },
    devlog: {
      heading: line(devlog.heading, 80, d.devlog.heading),
      intro: str(devlog.intro, 400, ''),
      items: (list(devlog.items, LIMITS.devlog) ?? d.devlog.items).map((p) => {
        const item = obj(p);
        return { date: date(item.date), title: line(item.title, 120, ''), body: str(item.body, 2000, ''), url: link(item.url) };
      }),
    },
    about: {
      heading: line(about.heading, 80, d.about.heading),
      navLabel: line(about.navLabel, 30, d.about.navLabel) || d.about.navLabel,
      body: str(about.body, 4000, d.about.body),
      image: safeImage(about.image),
      imageAlt: line(about.imageAlt, 200, ''),
    },
    cta: {
      heading: line(cta.heading, 100, d.cta.heading),
      body: str(cta.body, 400, d.cta.body),
      buttonLabel: line(cta.buttonLabel, 40, d.cta.buttonLabel) || d.cta.buttonLabel,
    },
    socials: (list(raw.socials, LIMITS.socials) ?? d.socials)
      .map((s) => {
        const item = obj(s);
        const platform = oneOf(item.platform, Object.keys(SOCIAL_PLATFORMS), 'website');
        return { platform, url: platform === 'email' ? safeUrl(line(item.url, 300, '')) : link(item.url), label: line(item.label, 40, '') };
      })
      .filter((s) => s.url),
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
      heading: line(legal.heading, 80, d.legal.heading) || d.legal.heading,
      body: str(legal.body, 6000, ''),
    },
    seo: {
      title: line(seo.title, 120, d.seo.title) || d.seo.title,
      description: line(seo.description, 300, d.seo.description),
      ogImage: safeImage(seo.ogImage),
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
      title: 'Add a contact email for privacy requests',
      detail: 'Required by GDPR so subscribers can ask what data you hold. Shown on the privacy page.',
      panel: 'privacy',
    },
    {
      id: 'controller',
      done: Boolean(settings.privacy.controllerName && settings.privacy.country),
      title: 'Fill in who runs the site',
      detail: 'Your name (or company) and country for the privacy policy.',
      panel: 'privacy',
    },
  ];
}
