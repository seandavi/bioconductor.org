# The freeze and cutover

How bioconductor.org moves from nanoc on `devel` to Astro, tracked in
[#440](https://github.com/Bioconductor/bioconductor.org/issues/440). Content
edits pause for a day or two; nothing else is affected, and every step can be
undone.

## Before

- [ ] Every `astro-migration` issue except #439 is closed. Pages no longer
      convert at the freeze if any still have unported ERB; `pipeline/freeze.py`
      refuses to run.
- [ ] Publishing from this repository works: a merge builds the site and uploads
      it, and PRs get previews. Today bioc-website publishes production.
- [ ] The edge redirects for dropped pages are ready to apply
      ([bioc-infrastructure#187](https://github.com/seandavi/bioc-infrastructure/issues/187)).
- [ ] A date agreed with the core team, away from a release. Announce it to
      everyone who edits the site: from the start of the freeze until the end,
      no merges to `devel`.

## The freeze

1. **Announce the start.** Pin the freeze notice on #440.
2. **Merge `devel` into `astro`** so the branch has every content edit.
   Conflicts are of two kinds: a file nanoc needed that `astro` deleted (keep it
   deleted), and content (take `devel`'s). CI must pass on the merge, including
   the freeze dry run.
3. **Convert, on a branch from `astro`:**
   ```bash
   python3 -m pipeline.freeze
   ```
   This writes every page in its final form (frontmatter, no sidecar), turns
   `etc/course_descriptions.tsv` into `etc/courses/*.yaml`, moves the hero and
   banner partials to `content/_partials/`, and sets `FROZEN` in
   `astro/src/lib/sources.js`. Then remove the converter, in the same PR:
   ```bash
   git rm -r layouts pipeline/content.py pipeline/courses.py pipeline/freeze.py \
     pipeline/test_content.py pipeline/test_courses.py
   ```
   - `justfile`: delete the `content` recipe, and drop it from `dev` and `build`.
   - `.github/workflows/astro.yml`: delete the "Freeze dry run" step.
   - `AGENTS.md` and `README.md`: remove the "until the cutover" notes.
4. **Check it** before opening the PR: `just build`, then `just parity`, then
   `diff -rq` against a build of `astro` from before step 3 (excluding
   `pagefind`, `_astro`, `next`). Only `BiocViews.html` should differ (a random
   island id). Merge into `astro` on green.
5. **Cut over:** open the PR `astro` → `devel` in Bioconductor/bioconductor.org.
   Merge it with a merge commit, not a squash, so `devel` keeps both histories.

## Switching publishing

6. Turn on publishing from this repository's `devel` and check that a build
   lands (the `x-bioc-build` response header names it).
7. Stop the old publishers:
   - seandavi/bioc-website: disable its `site.yml` workflow.
   - onclappc02: `systemctl --user disable --now bioc-site-refresh.timer`. Content now
     lives here, so there is nothing to refresh.
   - staging.bioconductor.org: comment out the `update_site` line in
     biocadmin's crontab, which rebuilds nanoc every 20 minutes.
8. Apply the edge redirects (#187).
9. Spot-check: the homepage, `/help/events/`, `/help/course-materials/`, a
   package page, the search page, `/sitemap.xml`.
10. **Announce the end.** Editing works as in [README.md](README.md). Close #440.

## Rolling back

- **A bad build:** point the edge back at the previous build (the route table's
  `build`, or move `site/latest` back). It takes effect within a minute.
- **The whole cutover:** revert the cutover merge on `devel`, re-enable the
  `update_site` cron and bioc-website's workflow, and point the edge at the last
  bioc-website build. nanoc's history and files are all still in git.
