// Typed site data (Bioconductor/bioconductor.org#433). A record that breaks a
// schema fails the build, naming the file and the field.
//
// Until the freeze, courses and config are converted at build time from the
// files nanoc still reads (etc/course_descriptions.tsv, config.yaml; see
// pipeline/). Events are read where they live, in content/help/events/.
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';
import { parseFrontmatter } from '@astrojs/markdown-remark';
import { defineCollection, z } from 'astro:content';
import type { Loader } from 'astro/loaders';
import { file, glob } from 'astro/loaders';

// Strings, never YAML numbers: an unquoted 3.10 reads as 3.1, which is how the
// course table came to list Bioc "3.1" for 2019 sessions.
const bioc = z.string().regex(/^\d+\.\d+$/, 'Bioc version must be like "3.10"');
const rVersion = z.string().regex(/^\d+\.\d+(\.\d+)?$/, 'R version must be like "4.5" or "4.5.1"');
// Absolute, or a path on this site.
const href = z.string().regex(/^(https?:\/\/|\/)\S+$/, 'link must be https://… or a /path on this site');
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD')
  .refine((s) => new Date(s + 'T00:00:00Z').toISOString().startsWith(s), 'not a calendar date');

const events = defineCollection({
  loader: glob({ base: '../content/help/events', pattern: '*.yaml' }),
  schema: z
    .object({
      title: z.string().min(1),
      location: z.string().min(1),
      event_host: z.string().nullish(),
      start: z.coerce.date(),
      end: z.coerce.date(),
      description: z.string().optional(),
      link: z.object({ text: z.string().optional(), url: href.optional() }).strict(),
    })
    .strict()
    .refine((e) => e.end >= e.start, { message: 'end is before start', path: ['end'] }),
});

const session = z
  .object({
    start: isoDate,
    end: isoDate,
    keyword: z.string().min(1),
    title: z.string().min(1),
    instructor: z.string(),
    materials: z.string(), // Markdown, as written
    bioc,
    r: rVersion,
    url: z.string().min(1).optional(),
  })
  .strict()
  .refine((s) => s.end >= s.start, { message: 'end is before start', path: ['end'] });

const courses = defineCollection({
  loader: glob({ base: './data/courses', pattern: '*.yaml' }),
  schema: z.object({ course: z.string().min(1), sessions: z.array(session).min(1) }).strict(),
});

// Only the keys the site reads are typed; the rest (nanoc's deploy settings)
// pass through until nanoc goes (#436).
const config = defineCollection({
  loader: file('./data/site/config.json', {
    parser: (text) => [{ id: 'site', ...JSON.parse(text) }],
  }),
  schema: z
    .object({
      release_version: bioc,
      devel_version: bioc,
      r_version_associated_with_release: rVersion,
      r_version_associated_with_devel: rVersion,
      versions: z.array(bioc).min(1),
      devel_repos: z.array(z.string()),
      ami_ids: z.record(z.string()),
      // [{ country: [mirror, …] }, …]; "0-Bioconductor" is the main site itself.
      mirrors: z.array(
        z.record(
          z.array(
            z
              .object({
                institution: z.string().min(1),
                institution_url: href,
                contact: z.string().min(1),
                contact_email: z.string().email(),
                city: z.string(),
                mirror_url: z.string().url(),
                https_mirror_url: z.string().url().optional(),
                rsync: z.string().nullable(),
                country_code: z.string().length(2),
              })
              .strict(),
          ),
        ),
      ),
    })
    .passthrough()
    // Release-day edits change both; devel is always the next minor version.
    .refine(
      (c) => {
        const [rm, rn] = c.release_version.split('.').map(Number);
        const [dm, dn] = c.devel_version.split('.').map(Number);
        return (dm === rm && dn === rn + 1) || (dm === rm + 1 && dn === 0);
      },
      { message: 'devel_version must be the version after release_version', path: ['devel_version'] },
    ),
});

// nanoc's URL for a content path: the extension dropped, a trailing slash, and
// an `index` basename collapsed into its directory (pipeline/content.py url_for).
const urlFor = (rel: string) => {
  const parts = rel.replace(/\.[^./]+$/, '').split('/');
  if (parts.at(-1) === 'index') parts.pop();
  return parts.length ? `/${parts.join('/')}/` : '/';
};

// Pages are Markdown or HTML bodies with YAML frontmatter, at their source
// paths. glob() would hand .md to Astro's Markdown pipeline and doesn't read
// .html at all; the bodies render through `marked` exactly as before
// ([...page].astro), so this loader only parses frontmatter and keeps the body.
function pagesLoader(base: string): Loader {
  return {
    name: 'pages',
    load: async ({ store, parseData, generateDigest }) => {
      store.clear();
      const files = readdirSync(base, { recursive: true, encoding: 'utf8' })
        .filter((f) => /\.(md|html)$/.test(f) && !f.startsWith('_partials/'))
        .sort();
      for (const rel of files) {
        const text = readFileSync(join(base, rel), 'utf8');
        const { frontmatter, content } = parseFrontmatter(text);
        const hero = frontmatter.hero
          ? readFileSync(join(base, '_partials', `${String(frontmatter.hero).replace(/^\/|\/$/g, '')}.html`), 'utf8')
          : undefined;
        const path = urlFor(rel);
        const data = await parseData({
          id: path,
          data: { ...frontmatter, path, format: rel.endsWith('.md') ? 'md' : 'html', heroHtml: hero },
        });
        // parseFrontmatter leaves the newline that closed the frontmatter.
        store.set({ id: path, data, body: content.replace(/^\n/, ''), digest: generateDigest(text) });
      }
    },
  };
}

const pages = defineCollection({
  loader: pagesLoader('./data/pages'),
  schema: z
    .object({
      title: z.string().min(1),
      path: z.string(),
      format: z.enum(['md', 'html']),
      description: z.string().nullish(),
      fullwidth: z.boolean().optional(),
      hidden: z.boolean().optional(),
      hero: z.string().optional(),
      heroHtml: z.string().optional(),
      // ERB the converter couldn't evaluate; the page isn't rendered until it is ported (#435).
      erb_unresolved: z.array(z.string()).optional(),
      // Course pages under /help/course-materials/.
      layout: z.literal('course').optional(),
      start_date: z.coerce.date().optional(),
      end_date: z.coerce.date().optional(),
      location: z.string().optional(),
      instructors: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      url: href.optional(),
      created_at: z.coerce.date().optional(),
      autogenerated: z.boolean().optional(),
      // nanoc navigation, not used by the Astro layouts.
      subnav: z.union([z.boolean(), z.array(z.object({ include: z.string() }).strict())]).nullish(),
      suppress_subnav: z.boolean().optional(),
    })
    .strict(),
});

export const collections = { events, courses, config, pages };
