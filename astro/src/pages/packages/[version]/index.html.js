// /packages/<version>/index.html, a copy of assets/extra/index.html (a redirect
// to BiocViews.html) that nanoc's Rakefile put in each version (post_compile, #446).
// Only the versions config.yaml builds; older ones stay on the mirror.
import { readFileSync } from 'node:fs';
import { getEntry } from 'astro:content';

export const getStaticPaths = async () =>
  (await getEntry('config', 'site')).data.versions.map((version) => ({ params: { version } }));

export const GET = () =>
  new Response(readFileSync('../assets/extra/index.html'), { headers: { 'Content-Type': 'text/html' } });
