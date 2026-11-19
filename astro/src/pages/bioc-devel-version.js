// /bioc-devel-version: the devel version, no newline, as nanoc's Rakefile wrote it (#446).
import { getEntry } from 'astro:content';

export const GET = async () => new Response((await getEntry('config', 'site')).data.devel_version);
