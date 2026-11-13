# Build the site with Astro (astro/) from this repo's content/.
#
# Inputs are staged under astro/ (gitignored): `data` unpacks the package-data
# snapshot the platform publishes, then `content` and `assets` overwrite its
# prose and asset copies with this checkout's own.

# List the recipes.
default:
    @just --list

# Package-data snapshot (releases, packages, biocViews tree) -> astro/data/.
data:
    mkdir -p astro
    curl -fsSL https://bioconductor.org/_ci/site-data.tar.zst | zstd -dc | tar -x -C astro

# Prose pages, events and config -> astro/data/site/; courses -> astro/data/courses/.
content:
    python3 -c 'from pipeline import content, courses; content.write(".", "astro/data"); courses.write(".", "astro/data")'

# Static files -> astro/public/: all of assets/, plus the downloadable files that
# sit beside pages in content/. robots.txt is generated (src/pages/robots.txt.js),
# and the gitlog feeds went with /developers/gitlog/.
assets:
    mkdir -p astro/public
    rsync -a --delete --exclude /robots.txt --exclude '/developers/rss-feeds/gitlog*.xml' assets/ astro/public/
    rsync -a --prune-empty-dirs --exclude '*.md' --exclude '*.html' --exclude '*.haml' --exclude '*.yaml' --exclude /style/ --exclude /sitemap.xml content/ astro/public/

# Install Astro's dependencies.
install:
    cd astro && npm ci

# Dev server.
dev: data content assets
    cd astro && npm run dev

# Full static build -> astro/dist/.
build: data content assets
    cd astro && npm run build

# Is everything nanoc would publish from this repo in the build? (run after build)
parity:
    python3 -m pipeline.parity astro/dist

# Importer and renderer tests.
test:
    python3 -m unittest discover -s pipeline -p 'test_*.py' -t .
    cd astro && node --test src/lib/*.test.mjs
