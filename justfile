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

# Static assets (style, images, js, favicon) -> astro/public/.
assets:
    mkdir -p astro/public
    for d in style images js; do rsync -a --delete assets/$d/ astro/public/$d/; done
    cp assets/favicon.ico astro/public/

# Install Astro's dependencies.
install:
    cd astro && npm ci

# Dev server.
dev: data content assets
    cd astro && npm run dev

# Full static build -> astro/dist/.
build: data content assets
    cd astro && npm run build

# Importer and renderer tests.
test:
    python3 -m unittest discover -s pipeline -p 'test_*.py' -t .
    cd astro && node --test src/lib/*.test.mjs
