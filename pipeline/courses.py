"""Course materials: etc/course_descriptions.tsv -> one YAML file per course.

The TSV is still what nanoc reads, so until the freeze it stays the source and
this runs at build time (Bioconductor/bioconductor.org#433). Its rows become
sessions grouped by course, so a course's name and link are written once, and
the Astro schema (astro/src/content.config.ts) checks every field.

Faithful, not clever: cells are copied as they are, and anything this cannot
parse is an error naming the row. Fixing the data belongs in the TSV.
"""

import csv
import os
import re
import sys

import yaml

LINK = re.compile(r"^\[([^\]]+)\]\(([^)\s]+)\)$")
DATE = re.compile(r"^(\S+) - (\S+)$")


def slug(name):
    return re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")


def convert(tsv):
    """Rows -> {slug: course}. Raises ValueError naming the first bad row."""
    with open(tsv, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh, delimiter="\t"))
    courses = {}
    for line, r in enumerate(rows, start=2):
        if len(r) != 8 or None in r.values():
            raise ValueError("%s:%d: expected 8 tab-separated fields" % (tsv, line))
        m = DATE.match(r["Date"].strip())
        if not m:
            raise ValueError("%s:%d: Date is not 'start - end': %r" % (tsv, line, r["Date"]))
        cell = r["Course"].strip()
        link = LINK.match(cell)
        name, url = (link.group(1), link.group(2)) if link else (cell, None)
        if not name:
            raise ValueError("%s:%d: empty Course" % (tsv, line))
        session = {
            "start": m.group(1),
            "end": m.group(2),
            "keyword": r["Keyword"].strip(),
            "title": r["Title"].strip(),
            "instructor": r["Instructor"].strip(),
            "materials": r["Material"].strip(),
            "bioc": r["Bioc version"].strip(),
            "r": r["R version"].strip(),
        }
        # A plain course name links to its directory under /help/course-materials/,
        # which is per year; a linked one (the forum: one video per session) keeps
        # its own link.
        if url:
            session["url"] = url
        course = courses.setdefault(slug(name), {"course": name, "sessions": []})
        course["sessions"].append(session)
    for c in courses.values():
        c["sessions"].sort(key=lambda s: (s["start"], s["title"]))
    return courses


def write(repo, outdir):
    courses = convert(os.path.join(repo, "etc", "course_descriptions.tsv"))
    dest = os.path.join(outdir, "courses")
    os.makedirs(dest, exist_ok=True)
    for f in os.listdir(dest):
        os.remove(os.path.join(dest, f))
    for key, c in courses.items():
        with open(os.path.join(dest, key + ".yaml"), "w", encoding="utf-8") as fh:
            # safe_dump quotes anything YAML would retype, so "3.10" stays a
            # string and dates stay strings for the schema to check.
            yaml.safe_dump(c, fh, sort_keys=False, allow_unicode=True, width=1000)
    n = sum(len(c["sessions"]) for c in courses.values())
    print("[courses] %d sessions in %d courses -> %s" % (n, len(courses), dest), file=sys.stderr)
