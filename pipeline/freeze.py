"""The freeze: commit the converted content once, in place of nanoc's form.

    python3 -m pipeline.freeze        # from the repo root, on a clean checkout

Run once, at the content freeze (Bioconductor/bioconductor.org#439), after the
final merge of devel. It writes what the build-time converter produces into
the repo itself:

- every page body in content/ is replaced by its converted form (YAML
  frontmatter from the sidecar, evaluable ERB resolved, partials inlined),
  and the sidecar is deleted
- the hero partials and the announcement banner go to content/_partials/
- the placeholder pages nanoc filled from package data (/help/bioc-views/)
  are deleted; the Astro build makes those pages itself
- etc/course_descriptions.tsv becomes one YAML file per course in etc/courses/
- astro/src/lib/sources.js is switched to FROZEN, so the build reads these

Event records (content/help/events/*.yaml) and config.yaml are already in
their final form and are left alone. The converter itself, layouts/ and the
`content` build step are removed by hand in the same PR (see FREEZE.md).
"""

import os
import re
import shutil
import sys
import tempfile

import yaml

from pipeline import content, courses

SOURCES = os.path.join("astro", "src", "lib", "sources.js")


def freeze(repo="."):
    pages, _, report = content.collect(repo)
    if report["with_erb"]:
        raise SystemExit("ERB still unresolved in %s; port those pages first" % report["erb_heavy"])
    root = os.path.join(repo, "content")

    # Converted pages, written beside a scratch copy and then over the sources:
    # write_pages() owns its destination directory, and content/ holds more
    # than pages.
    with tempfile.TemporaryDirectory() as tmp:
        content.write_pages(pages, tmp)
        for dirpath, _, files in os.walk(tmp):
            for fn in files:
                rel = os.path.relpath(os.path.join(dirpath, fn), tmp)
                dest = os.path.join(root, rel)
                os.makedirs(os.path.dirname(dest), exist_ok=True)
                shutil.copyfile(os.path.join(dirpath, fn), dest)
    for p in pages:
        side = os.path.join(root, os.path.splitext(p["source"])[0] + ".yaml")
        if os.path.exists(side):
            os.remove(side)

    # Placeholders for pages nanoc generated from package data.
    for dirpath, _, files in os.walk(root):
        for fn in files:
            rel = os.path.relpath(os.path.join(dirpath, fn), root).replace(os.sep, "/")
            stem, ext = os.path.splitext(fn)
            if ext in content.BODY_EXT + (".yaml",) and content.GENERATED.match(content.url_for(rel)):
                os.remove(os.path.join(dirpath, fn))

    ann = os.path.join(repo, "layouts", "components", "announcement.html")
    dest = os.path.join(root, "_partials", "announcement.html")
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    shutil.copyfile(ann, dest) if os.path.exists(ann) else open(dest, "w").close()

    tsv = os.path.join(repo, "etc", "course_descriptions.tsv")
    out = os.path.join(repo, "etc", "courses")
    os.makedirs(out, exist_ok=True)
    for key, c in courses.convert(tsv).items():
        with open(os.path.join(out, key + ".yaml"), "w", encoding="utf-8") as fh:
            yaml.safe_dump(c, fh, sort_keys=False, allow_unicode=True, width=1000)
    os.remove(tsv)

    path = os.path.join(repo, SOURCES)
    src = open(path, encoding="utf-8").read()
    flipped = re.sub(r"^export const FROZEN = false;$", "export const FROZEN = true;", src, flags=re.M)
    if flipped == src:
        raise SystemExit("%s: no `export const FROZEN = false;` to switch" % path)
    open(path, "w", encoding="utf-8").write(flipped)
    print("[freeze] %d pages written into content/, courses into etc/courses/, %s switched"
          % (len(pages), SOURCES), file=sys.stderr)


if __name__ == "__main__":
    freeze()
