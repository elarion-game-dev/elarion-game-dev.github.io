// Visual theme: self-hosted fonts, colour presets, the generated theme.css and a WCAG contrast checker.
// Fonts are served from this site (no Google Fonts request), so visitors' IP addresses are not sent to a font CDN.

import { isHexColor, safeAssetPath } from './util.mjs';

export const FONTS = {
  jost: {
    label: 'Jost (geometric, Futura-style)',
    family: 'Jost Variable',
    fallback: 'Futura, "Trebuchet MS", system-ui, sans-serif',
    faces: [{ weight: '100 900', latin: 'jost-latin-wght-normal.woff2', ext: 'jost-latin-ext-wght-normal.woff2' }],
    heading: { weight: 700, tracking: '0.01em', scale: 1 },
  },
  cinzel: {
    label: 'Cinzel (classic fantasy)',
    family: 'Cinzel Variable',
    fallback: 'Georgia, "Times New Roman", serif',
    faces: [{ weight: '400 900', latin: 'cinzel-latin-wght-normal.woff2', ext: 'cinzel-latin-ext-wght-normal.woff2' }],
    heading: { weight: 700, tracking: '0.03em', scale: 0.92 },
  },
  fraunces: {
    label: 'Fraunces (soft serif)',
    family: 'Fraunces Variable',
    fallback: 'Georgia, serif',
    faces: [{ weight: '100 900', latin: 'fraunces-latin-wght-normal.woff2', ext: 'fraunces-latin-ext-wght-normal.woff2' }],
    heading: { weight: 650, tracking: '-0.01em', scale: 1 },
  },
  'space-grotesk': {
    label: 'Space Grotesk (modern)',
    family: 'Space Grotesk Variable',
    fallback: 'system-ui, sans-serif',
    faces: [{ weight: '300 700', latin: 'space-grotesk-latin-wght-normal.woff2', ext: 'space-grotesk-latin-ext-wght-normal.woff2' }],
    heading: { weight: 700, tracking: '-0.02em', scale: 1 },
  },
  'pixelify-sans': {
    label: 'Pixelify Sans (pixel)',
    family: 'Pixelify Sans Variable',
    fallback: 'ui-monospace, monospace',
    faces: [{ weight: '400 700', latin: 'pixelify-sans-latin-wght-normal.woff2', ext: 'pixelify-sans-latin-ext-wght-normal.woff2' }],
    heading: { weight: 700, tracking: '0', scale: 1 },
  },
  'press-start-2p': {
    label: 'Press Start 2P (8-bit)',
    family: 'Press Start 2P',
    fallback: 'ui-monospace, monospace',
    faces: [{ weight: '400', latin: 'press-start-2p-latin-400-normal.woff2', ext: 'press-start-2p-latin-ext-400-normal.woff2' }],
    heading: { weight: 400, tracking: '0', scale: 0.6 },
  },
  inter: {
    label: 'Inter (clean sans)',
    family: 'Inter Variable',
    fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
    faces: [{ weight: '100 900', latin: 'inter-latin-wght-normal.woff2', ext: 'inter-latin-ext-wght-normal.woff2' }],
    heading: { weight: 750, tracking: '-0.02em', scale: 1 },
  },
  nunito: {
    label: 'Nunito (rounded)',
    family: 'Nunito Variable',
    fallback: 'system-ui, sans-serif',
    faces: [{ weight: '200 1000', latin: 'nunito-latin-wght-normal.woff2', ext: 'nunito-latin-ext-wght-normal.woff2' }],
    heading: { weight: 800, tracking: '-0.01em', scale: 1 },
  },
  atkinson: {
    label: 'Atkinson Hyperlegible (most readable)',
    family: 'Atkinson Hyperlegible',
    fallback: 'system-ui, sans-serif',
    faces: [
      { weight: '400', latin: 'atkinson-hyperlegible-latin-400-normal.woff2', ext: 'atkinson-hyperlegible-latin-ext-400-normal.woff2' },
      { weight: '700', latin: 'atkinson-hyperlegible-latin-700-normal.woff2', ext: 'atkinson-hyperlegible-latin-ext-700-normal.woff2' },
    ],
    heading: { weight: 700, tracking: '-0.01em', scale: 1 },
  },
  system: {
    label: 'System font (no download)',
    family: '',
    fallback: 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
    faces: [],
    heading: { weight: 750, tracking: '-0.02em', scale: 1 },
  },
};

export const FONT_IDS = Object.keys(FONTS);

const UNICODE_LATIN =
  'U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD';
const UNICODE_LATIN_EXT =
  'U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF';

export const COLOR_KEYS = [
  ['bg', 'Page background'],
  ['surface', 'Cards & panels'],
  ['border', 'Borders'],
  ['text', 'Text'],
  ['muted', 'Secondary text'],
  ['accent', 'Accent (buttons, highlights)'],
  ['onAccent', 'Text on accent'],
  ['accent2', 'Second accent (glows, links)'],
];

// Each preset sets the colours plus these theme keys.
export const PRESET_KEYS = ['headingFont', 'bodyFont', 'headingCase', 'buttonStyle', 'heroBackground', 'cardStyle', 'radius'];

export const PRESETS = {
  twilight: {
    label: 'Twilight',
    colors: { bg: '#0d1524', surface: '#142036', border: '#2b3a57', text: '#f3f5fa', muted: '#aeb8cc', accent: '#f2b35b', onAccent: '#1d1405', accent2: '#93b4ff' },
    headingFont: 'jost',
    bodyFont: 'jost',
    headingCase: 'uppercase',
    buttonStyle: 'solid',
    heroBackground: 'mist',
    cardStyle: 'outline',
    radius: 4,
  },
  arcane: {
    label: 'Arcane night',
    colors: { bg: '#0b0d19', surface: '#141932', border: '#2a3157', text: '#ecebf7', muted: '#a8abc9', accent: '#f2b35b', onAccent: '#1d1405', accent2: '#9d8cff' },
    headingFont: 'cinzel',
    bodyFont: 'inter',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'starfield',
    cardStyle: 'glass',
    radius: 14,
  },
  ember: {
    label: 'Ember forge',
    colors: { bg: '#130e0c', surface: '#1f1714', border: '#3a2a22', text: '#f6ede6', muted: '#c2aea0', accent: '#ff7d45', onAccent: '#210b02', accent2: '#ffcb5c' },
    headingFont: 'fraunces',
    bodyFont: 'inter',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'aurora',
    cardStyle: 'glass',
    radius: 12,
  },
  grove: {
    label: 'Moonlit grove',
    colors: { bg: '#0a1511', surface: '#11221b', border: '#214034', text: '#e8f3ec', muted: '#a1bfad', accent: '#7fe3a5', onAccent: '#052013', accent2: '#e2cf72' },
    headingFont: 'fraunces',
    bodyFont: 'nunito',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'aurora',
    cardStyle: 'glass',
    radius: 16,
  },
  pixel: {
    label: 'Neon arcade',
    colors: { bg: '#0d0a16', surface: '#19142a', border: '#3a2f5c', text: '#f3f0ff', muted: '#b1a9d3', accent: '#3dff8f', onAccent: '#03160a', accent2: '#ff5ad9' },
    headingFont: 'pixelify-sans',
    bodyFont: 'atkinson',
    headingCase: 'uppercase',
    buttonStyle: 'outline',
    heroBackground: 'grid',
    cardStyle: 'outline',
    radius: 0,
  },
  parchment: {
    label: 'Parchment (light)',
    colors: { bg: '#f6f0e4', surface: '#fffaf1', border: '#e0d3bc', text: '#2a2017', muted: '#6b5b4b', accent: '#a3302b', onAccent: '#fff8f0', accent2: '#2f6f73' },
    headingFont: 'cinzel',
    bodyFont: 'atkinson',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'aurora',
    cardStyle: 'solid',
    radius: 10,
  },
  frost: {
    label: 'Frost (light)',
    colors: { bg: '#f3f6fb', surface: '#ffffff', border: '#d9e0ec', text: '#111827', muted: '#556079', accent: '#3550f0', onAccent: '#ffffff', accent2: '#0f9f92' },
    headingFont: 'space-grotesk',
    bodyFont: 'inter',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'grid',
    cardStyle: 'solid',
    radius: 12,
  },
  sunrise: {
    label: 'Sunrise (white & orange)',
    colors: { bg: '#ffffff', surface: '#fff6ee', border: '#f3dcc8', text: '#1f1610', muted: '#6e5a4c', accent: '#c2410c', onAccent: '#ffffff', accent2: '#ea580c' },
    headingFont: 'jost',
    bodyFont: 'jost',
    headingCase: 'uppercase',
    buttonStyle: 'solid',
    heroBackground: 'solid',
    cardStyle: 'solid',
    radius: 6,
  },
  tangerine: {
    label: 'Tangerine (orange & white)',
    colors: { bg: '#c2410c', surface: '#a8380a', border: '#db6a35', text: '#ffffff', muted: '#fff0e6', accent: '#ffffff', onAccent: '#c2410c', accent2: '#ffe0b2' },
    headingFont: 'jost',
    bodyFont: 'jost',
    headingCase: 'uppercase',
    buttonStyle: 'solid',
    heroBackground: 'mist',
    cardStyle: 'outline',
    radius: 4,
  },
  crimson: {
    label: 'Blood moon',
    colors: { bg: '#120a0c', surface: '#1d1013', border: '#3b1c22', text: '#f7e9ea', muted: '#c4a5a9', accent: '#e5484d', onAccent: '#1a0506', accent2: '#ffb38a' },
    headingFont: 'cinzel',
    bodyFont: 'inter',
    headingCase: 'uppercase',
    buttonStyle: 'solid',
    heroBackground: 'mist',
    cardStyle: 'glass',
    radius: 6,
  },
  ocean: {
    label: 'Deep ocean',
    colors: { bg: '#07141c', surface: '#0d212d', border: '#1c3b4c', text: '#e6f4f8', muted: '#9dbcc8', accent: '#2ec4d6', onAccent: '#03181c', accent2: '#ffd166' },
    headingFont: 'nunito',
    bodyFont: 'nunito',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'aurora',
    cardStyle: 'glass',
    radius: 14,
  },
  mono: {
    label: 'Monochrome',
    colors: { bg: '#0a0a0a', surface: '#151515', border: '#2e2e2e', text: '#f5f5f5', muted: '#a3a3a3', accent: '#ffffff', onAccent: '#0a0a0a', accent2: '#d4d4d4' },
    headingFont: 'space-grotesk',
    bodyFont: 'inter',
    headingCase: 'uppercase',
    buttonStyle: 'outline',
    heroBackground: 'solid',
    cardStyle: 'outline',
    radius: 0,
  },
  ink: {
    label: 'Paper & ink (light)',
    colors: { bg: '#fafaf7', surface: '#ffffff', border: '#e2e2dc', text: '#141414', muted: '#5c5c58', accent: '#141414', onAccent: '#ffffff', accent2: '#c2410c' },
    headingFont: 'fraunces',
    bodyFont: 'inter',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'solid',
    cardStyle: 'solid',
    radius: 8,
  },
  candy: {
    label: 'Candy (light)',
    colors: { bg: '#fff5f9', surface: '#ffffff', border: '#f5d0e0', text: '#2b1020', muted: '#74506a', accent: '#c0266d', onAccent: '#ffffff', accent2: '#6d28d9' },
    headingFont: 'nunito',
    bodyFont: 'nunito',
    headingCase: 'normal',
    buttonStyle: 'solid',
    heroBackground: 'aurora',
    cardStyle: 'solid',
    radius: 18,
  },
};

export const HERO_BACKGROUNDS = {
  mist: 'Mist (soft blurred light)',
  starfield: 'Starfield',
  aurora: 'Aurora glow',
  grid: 'Retro grid',
  solid: 'Plain colour',
  image: 'Image (upload key art)',
};

export const CARD_STYLES = { outline: 'Outline only', glass: 'Frosted glass', solid: 'Solid' };
export const HEADING_CASES = { uppercase: 'UPPERCASE', normal: 'As typed' };
export const BUTTON_STYLES = { solid: 'Solid (most visible)', outline: 'Outline' };
export const FORM_LAYOUTS = { stacked: 'Button under the field', inline: 'Button next to the field' };

// --- text styles ------------------------------------------------------------
// Per-text overrides on top of the theme. site.css multiplies each role's font size by --k.

export const TEXT_ROLES = {
  hook: { label: 'Sign-up hook (main heading)', selector: '.signup-hook' },
  aboutHeading: { label: 'About heading', selector: '.home-about h2' },
  aboutText: { label: 'About text', selector: '.home-about .prose' },
  perks: { label: 'Subscriber perks', selector: '.perks' },
  bandHeading: { label: '"Follow" heading', selector: '.social-band h2' },
  pageHeadings: { label: 'Page titles (News, Press kit, posts)', selector: '.page h1' },
  menu: { label: 'Menu links', selector: '.nav-link' },
};
export const TEXT_COLORS = { default: 'Theme default', text: 'Text colour', muted: 'Secondary text', accent: 'Accent', accent2: 'Second accent', custom: 'Custom colour' };
export const TEXT_CASES = { default: 'Theme default', uppercase: 'UPPERCASE', normal: 'As typed' };
export const TEXT_SHADOWS = { none: 'None', soft: 'Soft shadow', hard: 'Hard drop shadow', glow: 'Accent glow' };
// --- top menu ---------------------------------------------------------------

export const NAV_COLORS = { auto: 'Theme default', text: 'Text colour', muted: 'Secondary text', accent: 'Accent', accent2: 'Second accent', bg: 'Page background', surface: 'Card colour' };
export const NAV_SHADOWS = { drop: 'Hard drop shadow', soft: 'Soft shadow', glow: 'Accent glow', none: 'None' };
export const DEFAULT_NAV_LOOK = { background: 'auto', opacity: 100, linkColor: 'auto', activeColor: 'auto', iconColor: 'auto', dividerColor: 'auto', size: 100, shadow: 'drop' };

const NAV_SHADOW_CSS = {
  soft: '0 6px 14px rgb(0 0 0 / 0.45)',
  glow: '0 0 14px color-mix(in srgb, var(--accent) 60%, transparent)',
  none: '0 0 0 transparent',
};

/** A menu colour setting as CSS: a theme colour name, a hex value, or null for the default. */
function navColor(value) {
  if (isHexColor(value)) return value;
  return { text: 'var(--text)', muted: 'var(--muted)', accent: 'var(--accent)', accent2: 'var(--accent-2)', bg: 'var(--bg)', surface: 'var(--surface)' }[value] ?? null;
}

function navVars(look) {
  if (!look) return [];
  const vars = [];
  if (look.background !== 'auto' || look.opacity !== 100) {
    const base = navColor(look.background) ?? 'color-mix(in srgb, var(--bg) 55%, #000)';
    vars.push(`--nav-bg-custom: ${look.opacity < 100 ? `color-mix(in srgb, ${base} ${look.opacity}%, transparent)` : base};`);
  }
  for (const [key, name] of [['linkColor', 'nav-link'], ['activeColor', 'nav-active'], ['iconColor', 'nav-icon'], ['dividerColor', 'nav-divider']]) {
    const value = navColor(look[key]);
    if (value) vars.push(`--${name}: ${value};`);
  }
  if (look.size !== 100) vars.push(`--nav-scale: ${(look.size / 100).toFixed(2)};`);
  if (NAV_SHADOW_CSS[look.shadow]) vars.push(`--nav-shadow: ${NAV_SHADOW_CSS[look.shadow]};`);
  return vars;
}

export const DEFAULT_TEXT_STYLE = { font: '', weight: 0, size: 100, case: 'default', color: 'default', customColor: '#ffffff', tracking: 0, shadow: 'none', crt: true };

const SHADOW_CSS = {
  soft: '0 2px 14px rgb(0 0 0 / 0.45)',
  hard: '0 0.06em 0 rgb(0 0 0 / 0.6)',
  glow: '0 0 0.45em color-mix(in srgb, var(--accent) 70%, transparent)',
};
const COLOR_VARS = { text: 'var(--text)', muted: 'var(--muted)', accent: 'var(--accent)', accent2: 'var(--accent-2)' };

function textStyleCss(styles = {}) {
  return Object.entries(TEXT_ROLES)
    .map(([id, role]) => {
      const t = styles[id];
      if (!t) return '';
      const rules = [];
      if (t.font) rules.push(`font-family: ${fontStack(t.font)};`);
      if (t.weight) rules.push(`font-weight: ${t.weight};`);
      if (t.size !== 100) rules.push(`--k: ${(t.size / 100).toFixed(2)};`);
      if (t.case !== 'default') rules.push(`text-transform: ${t.case === 'uppercase' ? 'uppercase' : 'none'};`);
      if (t.color === 'custom' && isHexColor(t.customColor)) rules.push(`color: ${t.customColor};`);
      else if (COLOR_VARS[t.color]) rules.push(`color: ${COLOR_VARS[t.color]};`);
      if (t.tracking) rules.push(`letter-spacing: ${(t.tracking / 100).toFixed(2)}em;`);
      if (SHADOW_CSS[t.shadow]) rules.push(`text-shadow: ${SHADOW_CSS[t.shadow]};`);
      // The CRT colour split is an animated text-shadow, so a chosen shadow also switches it off.
      if (!t.crt || SHADOW_CSS[t.shadow]) rules.push('animation: none !important;');
      return rules.length ? `:root ${role.selector} {\n  ${rules.join('\n  ')}\n}` : '';
    })
    .filter(Boolean)
    .join('\n');
}

// --- colour maths -------------------------------------------------------

function channel(c) {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

export function luminance(hex) {
  if (!isHexColor(hex)) return 0;
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function isDark(hex) {
  return luminance(hex) < 0.2;
}

/** WCAG checks the admin shows next to the colour pickers. */
export function contrastReport(colors) {
  const checks = [
    { label: 'Text on background', a: colors.text, b: colors.bg, min: 4.5 },
    { label: 'Text on cards', a: colors.text, b: colors.surface, min: 4.5 },
    { label: 'Secondary text on background', a: colors.muted, b: colors.bg, min: 4.5 },
    { label: 'Button text on accent', a: colors.onAccent, b: colors.accent, min: 4.5 },
    { label: 'Accent on background (outline buttons)', a: colors.accent, b: colors.bg, min: 3 },
    { label: 'Links on background', a: colors.accent2, b: colors.bg, min: 3 },
  ];
  return checks.map((c) => {
    const ratio = contrast(c.a, c.b);
    return { ...c, ratio, pass: ratio >= c.min };
  });
}

// --- theme.css ------------------------------------------------------------

export function fontFaces(fontId, fontBase = '/assets/fonts/') {
  const font = FONTS[fontId];
  if (!font || !font.family) return '';
  return font.faces
    .map((face) =>
      [
        ['ext', UNICODE_LATIN_EXT],
        ['latin', UNICODE_LATIN],
      ]
        .map(
          ([key, range]) => `@font-face {
  font-family: '${font.family}';
  font-style: normal;
  font-display: swap;
  font-weight: ${face.weight};
  src: url('${fontBase}${face[key]}') format('woff2');
  unicode-range: ${range};
}`
        )
        .join('\n')
    )
    .join('\n');
}

export function fontStack(fontId) {
  const font = FONTS[fontId] ?? FONTS.system;
  return font.family ? `'${font.family}', ${font.fallback}` : font.fallback;
}

/** The font file to <link rel="preload"> for the heading, so the hero renders without a font swap flash. */
export function preloadFont(fontId) {
  const face = FONTS[fontId]?.faces?.[0];
  return face ? face.latin : '';
}

/** Error red that stays readable on the page background; on mid-tone backgrounds (e.g. orange) the text colour. */
function dangerColor(c) {
  const [first, second] = isDark(c.bg) ? ['#ff8f85', '#b42318'] : ['#b42318', '#ff8f85'];
  return [first, second].find((red) => contrast(red, c.bg) >= 4.5) ?? c.text;
}

export function themeCss(theme, { fontBase = '/assets/fonts/', imageUrl, effects, textStyles, perkIcon, nav } = {}) {
  const c = theme.colors;
  const heading = FONTS[theme.headingFont] ?? FONTS.system;
  const heroImage = imageUrl ?? safeAssetPath(theme.heroImage);
  const textFonts = Object.values(textStyles ?? {}).map((t) => t.font).filter(Boolean);
  const faces = [...new Set([theme.headingFont, theme.bodyFont, ...textFonts])].map((id) => fontFaces(id, fontBase)).filter(Boolean);

  return `/* Generated from content/site.json by the build. Edit colours and fonts in the admin page, not here. */
${faces.join('\n')}
:root {
  color-scheme: ${isDark(c.bg) ? 'dark' : 'light'};
  --bg: ${c.bg};
  --surface: ${c.surface};
  --border: ${c.border};
  --text: ${c.text};
  --muted: ${c.muted};
  --accent: ${c.accent};
  --on-accent: ${c.onAccent};
  --accent-2: ${c.accent2};
  --danger: ${dangerColor(c)};
  --font-heading: ${fontStack(theme.headingFont)};
  --font-body: ${fontStack(theme.bodyFont)};
  --heading-weight: ${heading.heading.weight};
  --heading-tracking: ${heading.heading.tracking};
  --heading-scale: ${heading.heading.scale};
  --heading-case: ${theme.headingCase === 'uppercase' ? 'uppercase' : 'none'};
  --base-size: ${theme.baseSize}px;
  --radius: ${theme.radius}px;
  --hero-overlay: ${(theme.heroOverlay / 100).toFixed(2)};
  --hero-blur: ${theme.heroBlur}px;
  --hero-image: ${heroImage ? `url('${heroImage}')` : 'none'};${
    effects
      ? `
  --crt-scanlines: ${(effects.crt.scanlines / 100).toFixed(2)};
  --halftone-opacity: ${(effects.halftone.opacity / 100).toFixed(2)};`
      : ''
  }${
    perkIcon
      ? `
  --perk-size: ${perkIcon.size}px;
  --perk-color: ${COLOR_VARS[perkIcon.color] ?? 'var(--accent)'};`
      : ''
  }${navVars(nav)
    .map((v) => `\n  ${v}`)
    .join('')}
}
${textStyleCss(textStyles)}
`;
}
