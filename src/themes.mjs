// Visual theme: self-hosted fonts, colour presets, the generated theme.css and a WCAG contrast checker.
// Fonts are served from this site (no Google Fonts request), so visitors' IP addresses are not sent to a font CDN.

import { isHexColor, safeAssetPath } from './util.mjs';

export const FONTS = {
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

export const PRESETS = {
  arcane: {
    label: 'Arcane night',
    colors: { bg: '#0b0d19', surface: '#141932', border: '#2a3157', text: '#ecebf7', muted: '#a8abc9', accent: '#f2b35b', onAccent: '#1d1405', accent2: '#9d8cff' },
    headingFont: 'cinzel',
    bodyFont: 'inter',
    heroBackground: 'starfield',
    cardStyle: 'glass',
  },
  ember: {
    label: 'Ember forge',
    colors: { bg: '#130e0c', surface: '#1f1714', border: '#3a2a22', text: '#f6ede6', muted: '#c2aea0', accent: '#ff7d45', onAccent: '#210b02', accent2: '#ffcb5c' },
    headingFont: 'fraunces',
    bodyFont: 'inter',
    heroBackground: 'aurora',
    cardStyle: 'glass',
  },
  grove: {
    label: 'Moonlit grove',
    colors: { bg: '#0a1511', surface: '#11221b', border: '#214034', text: '#e8f3ec', muted: '#a1bfad', accent: '#7fe3a5', onAccent: '#052013', accent2: '#e2cf72' },
    headingFont: 'fraunces',
    bodyFont: 'nunito',
    heroBackground: 'aurora',
    cardStyle: 'glass',
  },
  pixel: {
    label: 'Neon arcade',
    colors: { bg: '#0d0a16', surface: '#19142a', border: '#3a2f5c', text: '#f3f0ff', muted: '#b1a9d3', accent: '#3dff8f', onAccent: '#03160a', accent2: '#ff5ad9' },
    headingFont: 'pixelify-sans',
    bodyFont: 'atkinson',
    heroBackground: 'grid',
    cardStyle: 'outline',
  },
  parchment: {
    label: 'Parchment (light)',
    colors: { bg: '#f6f0e4', surface: '#fffaf1', border: '#e0d3bc', text: '#2a2017', muted: '#6b5b4b', accent: '#a3302b', onAccent: '#fff8f0', accent2: '#2f6f73' },
    headingFont: 'cinzel',
    bodyFont: 'atkinson',
    heroBackground: 'aurora',
    cardStyle: 'solid',
  },
  frost: {
    label: 'Frost (light)',
    colors: { bg: '#f3f6fb', surface: '#ffffff', border: '#d9e0ec', text: '#111827', muted: '#556079', accent: '#3550f0', onAccent: '#ffffff', accent2: '#0f9f92' },
    headingFont: 'space-grotesk',
    bodyFont: 'inter',
    heroBackground: 'grid',
    cardStyle: 'solid',
  },
};

export const HERO_BACKGROUNDS = {
  starfield: 'Starfield',
  aurora: 'Aurora glow',
  grid: 'Retro grid',
  solid: 'Plain colour',
  image: 'Image (upload)',
};

export const CARD_STYLES = { glass: 'Frosted glass', solid: 'Solid', outline: 'Outline only' };
export const HERO_LAYOUTS = { split: 'Text left, sign-up right', centered: 'Centred, sign-up below' };

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

export function themeCss(theme, { fontBase = '/assets/fonts/', imageUrl } = {}) {
  const c = theme.colors;
  const heading = FONTS[theme.headingFont] ?? FONTS.system;
  const heroImage = imageUrl ?? safeAssetPath(theme.heroImage);
  const faces = [...new Set([theme.headingFont, theme.bodyFont])].map((id) => fontFaces(id, fontBase)).filter(Boolean);

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
  --font-heading: ${fontStack(theme.headingFont)};
  --font-body: ${fontStack(theme.bodyFont)};
  --heading-weight: ${heading.heading.weight};
  --heading-tracking: ${heading.heading.tracking};
  --heading-scale: ${heading.heading.scale};
  --base-size: ${theme.baseSize}px;
  --radius: ${theme.radius}px;
  --hero-overlay: ${(theme.heroOverlay / 100).toFixed(2)};
  --hero-image: ${heroImage ? `url('${heroImage}')` : 'none'};
}
`;
}
