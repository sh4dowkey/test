# anantsec redesign
Astro + TypeScript + GSAP + Lenis. `npm install && npm run dev`. Content in `src/data/site.ts`. See `docs/HANDOFF.md`.
Tests: `npm run build && python3 tools/behaviour.py` (needs Python + Playwright); `python3 tools/shots.py <dir> <tag> <w> <h> [mobile]`.

## Demonstrations
CrawlX, the CLI crawler and Project Cerberus are self-running browser simulations over fixture data. They have no controls; they loop while visible. See `docs/HANDOFF.md`. Run `npm run build` then `python3 tools/qa.py` for the browser checks, and `npm run build:production` to see which facts are still flagged for review.
