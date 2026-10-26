# anantsec-redesign

Standalone Astro + TypeScript + GSAP portfolio (greenfield; independent of the legacy repos).

Requires Node.js 22.22 or newer (Astro 7's requirement) and npm 9.6.5+.

```
npm install
npm run build
npm run preview     # http://127.0.0.1:4321/   (or: npm run dev)
```
Content lives in `src/data/site.ts`. Open the page with `?review` to outline provisional items; `npm run build:production` fails until every `review` flag is cleared.
Motion testing overrides: `?motion=lite` or `?motion=full`. OS "reduce motion" and JavaScript-off give static compositions.
Project rules: `CLAUDE.md`; state: `docs/HANDOFF.md`. Tools: `tools/review_shots.py`, `tools/screenshot.py`, `tools/behaviour.py` (screenshots and scroll/CLS checks) (need Python + Playwright).
