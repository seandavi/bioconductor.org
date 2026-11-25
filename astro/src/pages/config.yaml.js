// /config.yaml, byte for byte (#446). BiocManager and BiocPkgTools read it.
// nanoc's Rakefile copied it outside the Rules (copy_config), so until this
// the edge served the legacy mirror's copy, which trails devel by hours. The
// config collection (content.config.ts) has already validated it by now.
import { readFileSync } from 'node:fs';

// Same path the collection loads: `npm run build` runs in astro/.
export const GET = () =>
  new Response(readFileSync('../config.yaml'), { headers: { 'Content-Type': 'application/yaml' } });
