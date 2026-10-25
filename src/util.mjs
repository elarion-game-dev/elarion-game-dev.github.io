// Small helpers shared by the build (Node) and the admin page (browser).
// Everything that ends up in HTML goes through esc() or attr(); every URL goes through safeUrl().

const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => HTML_ESCAPES[c]);
}

export const attr = esc;

/**
 * Returns the URL if it is safe to put in an href/src, otherwise ''.
 * Allows https:, http:, mailto: and root-relative paths ("/games/"). Blocks javascript:, data:, etc.
 */
export function safeUrl(value, { allowMailto = true, allowRelative = true } = {}) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (allowRelative && /^\/(?!\/)[^\s"'<>\\]*$/.test(url)) return url;
  if (allowRelative && /^#[\w-]*$/.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') return parsed.href;
    if (allowMailto && parsed.protocol === 'mailto:') return parsed.href;
  } catch {
    // not a URL
  }
  return '';
}

/** Path to a file inside the site, e.g. "/assets/uploads/hero-k3j2.webp". Only plain characters, so it is safe in CSS url(). */
export function safeAssetPath(value) {
  const path = String(value ?? '').trim();
  return /^\/[A-Za-z0-9/_.-]+$/.test(path) && !path.includes('..') ? path : '';
}

/** An image reference: either a site asset path or an absolute https URL. */
export function safeImage(value) {
  const path = safeAssetPath(value);
  if (path) return path;
  const url = safeUrl(value, { allowMailto: false, allowRelative: false });
  return url.startsWith('https://') ? url : '';
}

export function isEmail(value) {
  const email = String(value ?? '').trim();
  return email.length <= 254 && /^[^\s@<>()"',;:]+@[^\s@<>()"',;:]+\.[^\s@<>()"',;:]{2,}$/.test(email);
}

export function isHexColor(value) {
  return /^#[0-9a-f]{6}$/i.test(String(value ?? ''));
}

export function slugify(value, fallback = 'file') {
  const slug = String(value ?? '')
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return slug || fallback;
}

export function clamp(n, min, max) {
  const num = Number(n);
  if (!Number.isFinite(num)) return min;
  return Math.min(max, Math.max(min, num));
}

export function isPlainObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

/** Read "a.b.c" from an object. */
export function getPath(obj, path) {
  return path.split('.').reduce((o, key) => (o == null ? undefined : o[key]), obj);
}

/** Write "a.b.c" into an object, creating objects along the way. */
export function setPath(obj, path, value) {
  const keys = path.split('.');
  let target = obj;
  for (const key of keys.slice(0, -1)) {
    if (!isPlainObject(target[key]) && !Array.isArray(target[key])) target[key] = {};
    target = target[key];
  }
  target[keys[keys.length - 1]] = value;
}

export function formatDate(iso, language = 'en') {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(iso ?? ''))) return '';
  const date = new Date(`${iso}T12:00:00Z`);
  try {
    return date.toLocaleDateString(language, { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });
  } catch {
    return iso;
  }
}
