# anantsec redesign
Astro + TypeScript + GSAP + Lenis. `npm install && npm run dev`. Content in `src/data/site.ts`. See `docs/HANDOFF.md`.
Tests: `npm run build && python3 tools/behaviour.py` (needs Python + Playwright); `python3 tools/shots.py <dir> <tag> <w> <h> [mobile]`.

## Demonstrations
The CrawlX, CLI crawler and Cerberus sections are browser simulations over fixture data (see `docs/HANDOFF.md`). Run `python3 tools/qa.py` after `npm run build` for the browser checks.
