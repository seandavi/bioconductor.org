import { getCollection } from 'astro:content';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

// Same resolution rule as lib/packages.js: from the project root, not
// import.meta.url, because Vite rewrites module URLs during the build.
const DATA = join(process.cwd(), 'data', 'site');

function read(name) {
  const f = join(DATA, name);
  // Fail loudly: a missing data file must not silently yield zero pages. This
  // build has already been burned once by a renderer that "succeeded" with no
  // output because its input was absent.
  if (!existsSync(f)) {
    throw new Error(`missing site data: ${f} -- run \`just data-content\` first`);
  }
  return JSON.parse(readFileSync(f, 'utf8'));
}

// The prose pages [...page].astro renders: everything in the `pages`
// collection except pages whose ERB isn't ported yet (#435) and the legacy
// search page, which pages/help/search/ replaces with Pagefind.
export async function renderablePages() {
  const pages = await getCollection('pages', ({ data }) => !data.erb_unresolved && data.path !== '/help/search/');
  // Code-point order, as the URL list was before (not localeCompare, which folds case).
  return pages.sort((a, b) => (a.data.path < b.data.path ? -1 : a.data.path > b.data.path ? 1 : 0));
}

export function loadEvents() {
  return read('events.json');
}

/** Events that have ended, most recent start first (nanoc's previous_events). */
export function pastEvents(events) {
  const today = new Date().toISOString().slice(0, 10);
  const endDate = (e) => String(e.end ?? e.start ?? '');
  return events.filter((e) => endDate(e) < today).sort((a, b) => String(b.start ?? '').localeCompare(String(a.start ?? '')));
}

/** Only events that haven't ended yet, ordered by start date. */
export function topEvents(events, limit = 5) {
  const today = new Date().toISOString().slice(0, 10);
  const key = (e) => String(e.start ?? '');
  const endDate = (e) => String(e.end ?? e.start ?? ''); // single-day events have no end (see eventDate)
  const upcoming = events.filter((e) => endDate(e) >= today).sort((a, b) => key(a).localeCompare(key(b)));
  return upcoming.slice(0, limit);
}

/**
 * Live-site date shapes, exactly: "02 December 2025", "19 - 20 November 2026"
 * (range within one month), "28 June - 02 July 2026" (one year). Days are
 * always zero-padded and the separator is a spaced hyphen, not an en dash.
 */
export function eventDate(e) {
  if (!e.start) return '';
  const d = (s) => new Date(s + 'T00:00:00Z');
  const pad = (n) => String(n).padStart(2, '0');
  const part = (x, opts) => x.toLocaleDateString('en-GB', { ...opts, timeZone: 'UTC' });
  const full = (x) => `${pad(x.getUTCDate())} ${part(x, { month: 'long', year: 'numeric' })}`;
  const s = d(e.start);
  if (!e.end || e.end === e.start) return full(s);
  const t = d(e.end);
  if (s.getUTCFullYear() === t.getUTCFullYear() && s.getUTCMonth() === t.getUTCMonth())
    return `${pad(s.getUTCDate())} - ${pad(t.getUTCDate())} ${part(s, { month: 'long', year: 'numeric' })}`;
  if (s.getUTCFullYear() === t.getUTCFullYear())
    return `${pad(s.getUTCDate())} ${part(s, { month: 'long' })} - ${full(t)}`;
  return `${full(s)} - ${full(t)}`;
}
