// Typed site data (Bioconductor/bioconductor.org#433). A record that breaks a
// schema fails the build, naming the file and the field.
//
// Until the freeze, courses and config are converted at build time from the
// files nanoc still reads (etc/course_descriptions.tsv, config.yaml; see
// pipeline/). Events are read where they live, in content/help/events/.
import { defineCollection, z } from 'astro:content';
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

export const collections = { events, courses, config };
