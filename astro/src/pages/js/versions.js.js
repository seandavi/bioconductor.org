// /js/versions.js, in the format nanoc's Rakefile wrote it (write_version_info, #446).
import { getEntry } from 'astro:content';

export const GET = async () => {
  const { release_version, devel_version, versions } = (await getEntry('config', 'site')).data;
  const body =
    `var develVersion = "${devel_version}";\nvar releaseVersion="${release_version}";\n` +
    `var versions = [${versions.map((v) => `"${v}"`).join(',')}];\n`;
  return new Response(body, { headers: { 'Content-Type': 'text/javascript' } });
};
