// Builds the static site into dist/: copies public/, renders every page from content/site.json,
// and publishes the shared src/ modules so the admin page can render its live preview with the same code.
// No dependencies: runs on plain Node.js 20+.

import { createHash } from 'node:crypto';
import { cp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { renderSite } from '../src/render.mjs';
import { normalizeSettings } from '../src/settings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');

async function repoInfo() {
  const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8'));
  const [owner, repo] = (process.env.GITHUB_REPOSITORY ?? '').split('/');
  return {
    owner: owner || pkg.site.owner,
    repo: repo || pkg.site.repo,
    branch: process.env.GITHUB_REF_NAME || pkg.site.branch,
  };
}

// Skip dotfiles such as .gitkeep, but keep .well-known/.
const copyFilter = (src) => {
  const name = path.basename(src);
  return !name.startsWith('.') || name === '.well-known';
};

export async function build({ log = console.log } = {}) {
  const started = Date.now();
  const raw = JSON.parse(await readFile(path.join(root, 'content', 'site.json'), 'utf8'));
  const settings = normalizeSettings(raw);
  const repo = await repoInfo();

  await rm(dist, { recursive: true, force: true });
  await cp(path.join(root, 'public'), dist, { recursive: true, filter: copyFilter });
  await cp(path.join(root, 'src'), path.join(dist, 'assets', 'lib'), { recursive: true, filter: copyFilter });

  // One version for the content and all code, so browsers never mix cached files from different deploys.
  const code = (await readdir(dist, { recursive: true })).filter((f) => /\.(m?js|css)$/.test(f)).sort();
  const fingerprint = createHash('sha256');
  fingerprint.update(JSON.stringify(settings));
  for (const file of code) fingerprint.update(file).update(await readFile(path.join(dist, file)));
  const version = fingerprint.digest('hex').slice(0, 10);

  // Stamp every relative module import, and the admin's own entry files, with that version.
  const stamp = (spec) => `${spec}?v=${version}`;
  for (const file of code.filter((f) => /\.m?js$/.test(f))) {
    const target = path.join(dist, file);
    const source = await readFile(target, 'utf8');
    await writeFile(target, source.replace(/(\b(?:from|import)\s*\(?\s*)(['"])(\.\.?\/[^'"?]+\.m?js)\2/g, (_, pre, q, spec) => `${pre}${q}${stamp(spec)}${q}`));
  }
  const adminPage = path.join(dist, 'admin', 'index.html');
  const admin = await readFile(adminPage, 'utf8');
  await writeFile(adminPage, admin.replace('href="admin.css"', `href="${stamp('admin.css')}"`).replace('src="admin.js"', `src="${stamp('admin.js')}"`));
  await writeFile(path.join(dist, 'assets', 'lib', 'deploy.mjs'), `export const DEPLOY = ${JSON.stringify(repo)};\nexport const VERSION = '${version}';\n`);

  const files = renderSite(settings, { version, repo });
  for (const [file, contents] of Object.entries(files)) {
    const target = path.join(dist, file);
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents);
  }

  // Cheap guards against template mistakes reaching production.
  for (const [file, contents] of Object.entries(files)) {
    if (!file.endsWith('.html')) continue;
    if (!contents.includes('http-equiv="Content-Security-Policy"')) throw new Error(`${file} is missing its Content-Security-Policy`);
    if (/\b(undefined|NaN|\[object Object\])\b/.test(contents)) throw new Error(`${file} contains "undefined", "NaN" or "[object Object]"`);
  }

  log(`Built ${Object.keys(files).length} files into dist/ in ${Date.now() - started} ms (version ${version}).`);
  return { settings, files, version };
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  build().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
