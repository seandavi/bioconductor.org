// Build check for #34: run after `npm run build`. Every HTML page in dist/ has
// exactly one rel=canonical, and the live release/devel versions' package pages
// point at /packages/release/ and /packages/devel/.
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { liveVersions } from './src/lib/packages.js';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.html') ? [join(d, e.name)] : [],
  );

const { release, devel } = liveVersions();
const live = { [devel]: 'devel', [release]: 'release' };

const bad = [];
let n = 0;
for (const f of walk('dist')) {
  // Static HTML copied verbatim from public/ (old book supplements and the
  // like) is published as it was; only pages the build renders carry canonicals.
  if (existsSync(join('public', f.slice('dist/'.length)))) continue;
  // So is the per-version redirect to BiocViews.html (src/pages/packages/[version]/index.html.js).
  if (/^dist\/packages\/\d+\.\d+\/index\.html$/.test(f)) continue;
  n++;
  const hits = [...readFileSync(f, 'utf8').matchAll(/<link rel="canonical" href="([^"]*)"/g)];
  const path = '/' + f.slice('dist/'.length);
  if (hits.length !== 1) { bad.push(`${path}: ${hits.length} canonical links`); continue; }
  const m = path.match(/^\/packages\/(\d+\.\d+)\//);
  const want = (m && live[m[1]] ? path.replace(m[1], live[m[1]]) : path).replace(/\/index\.html$/, '/').replace(/^\/next\.html$/, '/next/');
  if (hits[0][1] !== 'https://bioconductor.org' + want) bad.push(`${path}: canonical ${hits[0][1]}, want ${want}`);
}
if (bad.length) {
  console.error(bad.slice(0, 20).join('\n') + `\n${bad.length} of ${n} pages failed`);
  process.exit(1);
}
console.log(`canonical ok on ${n} pages (live: ${JSON.stringify(live)})`);
