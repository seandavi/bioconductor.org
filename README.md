# bioconductor.org

The source of [bioconductor.org](https://bioconductor.org): the site's content,
and the [Astro](https://astro.build) project in `astro/` that builds it.

> **Until the cutover** ([#440](https://github.com/Bioconductor/bioconductor.org/issues/440))
> the content is still in nanoc's form: each page has a `.yaml` sidecar, and
> courses are rows in `etc/course_descriptions.tsv`. The build converts it.
> This guide describes the form it takes after the freeze ([FREEZE.md](FREEZE.md)).
> Edits made in the old form are carried over automatically.

## Editing the site

Every change is a pull request. CI builds the whole site and checks it. A
merge publishes it within a few minutes.

### Pages

A page is a file under `content/`: Markdown (`.md`) or HTML (`.html`),
starting with YAML frontmatter.

```markdown
---
title: Community Resources
description: Where to ask questions and meet other users.   # optional, for search engines
---
# Community Resources

Text in Markdown. HTML works too.
```

The URL is the path without the extension, with a trailing slash:
`content/help/community.md` is `/help/community/`, and an `index` file is its
directory (`content/about/index.html` is `/about/`). To add a page, add a file;
to remove one, delete it and ask for a redirect in
[bioc-infrastructure](https://github.com/seandavi/bioc-infrastructure/issues).

A few pages have markers like `<!--slot:courses-->`. Each one is where the
build inserts a list from data (courses, events, mirrors, new packages). Edit
the text around a marker freely; move or delete the marker only if the list
should move or go.

### Events

One file per event in `content/help/events/`. Upcoming events show on the
homepage and on `/help/events/`; past ones are listed below them.

```yaml
title: "BioC2027: Where Software and Biology Connect"
location: Seattle, WA
event_host: Bioconductor            # optional
start: 2027-07-28
end: 2027-07-30                     # same as start for a one-day event
link:
  text: Conference website
  url: https://bioc2027.bioconductor.org/
description: An optional sentence.  # optional
```

### Courses, workshops and Developers' Forum sessions

One file per course or series in `etc/courses/`, listing its sessions. They
make up the table on [/help/course-materials/](https://bioconductor.org/help/course-materials/).
To add a Developers' Forum session, add an entry to the end of
`etc/courses/biocdevelforum.yaml`:

```yaml
- start: '2026-11-26'
  end: '2026-11-26'
  keyword: Talk
  title: The talk's title
  instructor: Speaker Name
  materials: '[video](https://www.youtube.com/watch?v=VIDEO_ID)'   # Markdown
  bioc: '3.24'         # quoted: unquoted 3.10 would read as the number 3.1
  r: '4.6'
  url: https://www.youtube.com/watch?v=VIDEO_ID
```

Dates and versions are quoted strings. `url` is optional: without it the course
name links to its folder under `/help/course-materials/<year>/`.

Large course materials (slides, data, videos) don't go in this repository.
Link to where they live: GitHub, Zenodo, YouTube.

### Release day

`config.yaml` holds `release_version`, `devel_version`, the R versions that go
with them, and the mirror list. The build checks that `devel_version` is the
version after `release_version`.

### Everything else

- `assets/`: images, stylesheets, scripts and documents, published at the same
  path (`assets/about/annual-reports/AnnRep2024.pdf` is
  `/about/annual-reports/AnnRep2024.pdf`).
- `content/_partials/announcement.html`: the site-wide banner. Leave the file
  empty for no banner.

## Previewing locally

You need Node 22, Python 3 with PyYAML, [just](https://just.systems), `zstd`
and `rsync`.

```bash
just install    # once
just dev        # http://localhost:4321, reloads as you edit
just build      # the full site, into astro/dist/
just test
```

`just` fetches the package data the build needs (about 36 MB) from
bioconductor.org on each run.

## When a check fails

| Check | What it means | What to do |
|---|---|---|
| YAML | A `.yaml` file doesn't parse | The error gives the file and line; often a tab, or a `: ` inside unquoted text (quote it) |
| Build | Usually a record that breaks its schema | The message names the file and the field, e.g. `sessions.0.bioc: Expected type "string"`. Fix the data; don't loosen the schema |
| Parity | Something the site published is missing from the build | Restore it, or add it to `GONE` in `pipeline/parity.py` with the reason |
| Canonical links, sitemap, robots | A generated page lost its canonical link or a sitemap entry | Usually a template change; ask in the PR |
| Internal links | A link on a main page points at a page that doesn't exist | Fix the link |
| Freeze dry run | The cutover's conversion would change the site (only until the cutover) | Ask in the PR |

## How the site is served

Merging builds the site and uploads it as an immutable build. The
[edge](https://github.com/seandavi/bioc-infrastructure/tree/main/packages/edge)
serves the newest build, and serves anything a build doesn't contain (old
release pages, archived course files) from its copy of the previous site. The
package data comes from the [Bioconductor platform](https://seandavi.github.io/bioc-infrastructure/).
Problems with the site rather than its content:
[report them here](https://github.com/seandavi/bioc-infrastructure/issues/new/choose).

For agents and contributors changing the build itself: [AGENTS.md](AGENTS.md).
