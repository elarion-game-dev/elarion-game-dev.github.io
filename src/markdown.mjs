// A deliberately tiny, safe Markdown subset for text fields edited in the admin.
// Supported: paragraphs, line breaks, "- " lists, "## " / "### " headings, **bold**, *italic*, `code`, [links](https://...).
// Text is escaped before any formatting is applied, so raw HTML in the input is always shown as text.

import { esc, safeUrl } from './util.mjs';

function emphasis(escaped) {
  return escaped
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*)\*/g, '$1<em>$2</em>');
}

export function inline(text) {
  const source = String(text ?? '');
  const linkPattern = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  let out = '';
  let last = 0;
  for (const match of source.matchAll(linkPattern)) {
    out += emphasis(esc(source.slice(last, match.index)));
    const href = safeUrl(match[2]);
    const label = emphasis(esc(match[1]));
    if (href) {
      const external = /^https?:/.test(href);
      out += `<a href="${esc(href)}"${external ? ' rel="noopener"' : ''}>${label}</a>`;
    } else {
      out += label;
    }
    last = match.index + match[0].length;
  }
  out += emphasis(esc(source.slice(last)));
  return out;
}

export function markdown(text) {
  const blocks = String(text ?? '')
    .replace(/\r\n?/g, '\n')
    .split(/\n{2,}/)
    .map((b) => b.trim())
    .filter(Boolean);

  return blocks
    .map((block) => {
      const lines = block.split('\n');
      if (lines.every((l) => /^\s*[-*]\s+/.test(l))) {
        return `<ul>${lines.map((l) => `<li>${inline(l.replace(/^\s*[-*]\s+/, ''))}</li>`).join('')}</ul>`;
      }
      if (lines.length === 1 && /^###\s+/.test(block)) return `<h4>${inline(block.replace(/^###\s+/, ''))}</h4>`;
      if (lines.length === 1 && /^##?\s+/.test(block)) return `<h3>${inline(block.replace(/^##?\s+/, ''))}</h3>`;
      return `<p>${lines.map(inline).join('<br>')}</p>`;
    })
    .join('\n');
}
