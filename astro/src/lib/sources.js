// Where the site reads its content from (Bioconductor/bioconductor.org#439).
//
// Until the freeze, pipeline/ converts the nanoc-form content at build time and
// writes it under data/ (gitignored). pipeline/freeze.py commits that converted
// form into content/ and etc/courses/ once, and sets FROZEN to true here.
// Paths are relative to astro/, where the build runs.
export const FROZEN = false;

export const PAGES = FROZEN ? '../content' : './data/pages';
export const COURSES = FROZEN ? '../etc/courses' : './data/courses';
// Hero fragments and the announcement banner.
export const PARTIALS = `${PAGES}/_partials`;
