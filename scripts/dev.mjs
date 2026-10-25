// Local preview: builds the site, serves dist/ on http://127.0.0.1:4321 and rebuilds when files change.
// The admin page works here too; it still saves to the real GitHub repository.

import { execFile } from 'node:child_process';
import { watch } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const port = Number(process.env.PORT) || 4321;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.gif': 'image/gif',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml; charset=utf-8',
};

// Returns a file path, { redirect } for directories without a trailing slash (like GitHub Pages), or null.
async function resolveFile(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.resolve(dist, '.' + clean);
  if (target !== dist && !target.startsWith(dist + path.sep)) return null;
  try {
    const info = await stat(target);
    if (info.isDirectory()) return clean.endsWith('/') ? resolveFile(clean + 'index.html') : { redirect: clean + '/' };
    return target;
  } catch {
    return null;
  }
}

const server = http.createServer(async (req, res) => {
  const file = await resolveFile(req.url ?? '/');
  const headers = { 'Cache-Control': 'no-store', 'Access-Control-Allow-Origin': '*', 'X-Content-Type-Options': 'nosniff' };
  if (file?.redirect) {
    res.writeHead(301, { ...headers, Location: file.redirect });
    res.end();
    return;
  }
  if (!file) {
    res.writeHead(404, { ...headers, 'Content-Type': TYPES['.html'] });
    res.end(await readFile(path.join(dist, '404.html')).catch(() => 'Not found'));
    return;
  }
  res.writeHead(200, { ...headers, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' });
  res.end(await readFile(file));
});

// Each rebuild runs in a fresh process, so edits to src/*.mjs are picked up (Node caches imported modules).
const rebuild = () =>
  new Promise((resolve) => {
    execFile(process.execPath, [path.join(root, 'scripts', 'build.mjs')], (error, stdout, stderr) => {
      process.stdout.write(stdout);
      if (error) console.error(stderr || error.message);
      resolve();
    });
  });

await rebuild();
server.listen(port, '127.0.0.1', () => console.log(`Serving http://127.0.0.1:${port}/  (admin: http://127.0.0.1:${port}/admin/)`));

let timer;
for (const dir of ['src', 'public', 'content']) {
  watch(path.join(root, dir), { recursive: true }, () => {
    clearTimeout(timer);
    timer = setTimeout(rebuild, 150);
  });
}
