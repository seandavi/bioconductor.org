// /bioc-version: the release, no newline, as nanoc's Rakefile wrote it (write_version_number, #446).
import { getEntry } from 'astro:content';

export const GET = async () => new Response((await getEntry('config', 'site')).data.release_version);
