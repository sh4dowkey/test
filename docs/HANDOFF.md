# HANDOFF

**Updated:** 2026-10-24 · **Session:** 2 · **Stage:** Implementation checkpoint 1 COMPLETE (working local site). Awaiting owner review of the running site.

## What exists
Astro 7 + TypeScript + GSAP 3.15 (bundled locally), standalone in `anantsec-redesign/`. Single-page homepage with all scenes: hero zoom (pinned), premise, Pwndbg anatomy (pinned) → Paper curtain → verified PR evidence, CrawlX, CLI Web Crawler, Writing, Background, Contact. Fonts self-hosted (Mona Sans, Newsreader; both OFL).
Run: `npm install && npm run build && npm run preview` → http://127.0.0.1:4321/ (`npm run dev` also works). Legacy repos and live site untouched. Nothing deployed or committed.

## Tested (actually run, headless Chromium 141, 1 CPU sandbox)
- Production build passes; scripts type-check clean (`tsc --noEmit`).
- Screenshots at many scroll positions: desktop 1440×900, mobile 390×844, reduced-motion, JavaScript disabled. Zero console errors. No horizontal overflow (incl. after resize).
- Exactly 2 pinned elements (`hero__stage`, `anatomy__stage`). CLS 0.0 during the scripted scroll. Anchor links land correctly with pins active.
- Reversibility: frames at 6 scroll positions are pixel-identical scrolling forward vs backward (nav excluded; it hides on downward scroll by design).
- Hero JS 45.9 KB gzip (budget 80 KB).
## NOT tested (do not claim)
Real phones/tablets; Safari, Firefox; frame-time/performance on real hardware (sandbox renders in software); Lighthouse; axe/screen reader/keyboard-only audit; 200% zoom; the SVG-zoom cost on Safari/iOS (storyboard risk R-1 still open); Lite capability heuristic (untested guess); Lenis (not added, per decision).

## Implementation decisions (reversible)
- Hero: Paper sheet SVG path with the wordmark as cut-outs onto Blueprint; zoom into the "t" crossbar junction (thickest stroke, computed by `tools/make_wordmark.py`); exponential scale, `scrub: 0.8`; stacked "anant/sec" layout on portrait screens.
- Premise is its own scene after the pin (not revealed inside the pin).
- Pwndbg: original SVG plates (math in `src/lib/structure.ts`); pinned 300vh on desktop ≥900px, finishes at 80% then the Paper section overlaps by 60lvh (CSS negative margin); unpinned scrubbed on narrower screens.
- Nav hides on downward scroll, returns on upward scroll / keyboard focus.
- Storyboard deviations: Paper→Blueprint curtain before Contact (T4) not built (hard edge instead); code font is the system monospace (no webfont).
- Lite heuristic uses `deviceMemory ≤ 2` only (core count misreports in VMs); `?motion=lite|full` override for testing.

## Content published (all verified; see `src/data/facts.ts`)
Pwndbg PR #3160 / commit 7d92563 / issue #3154 (crops exclude third-party emails); CrawlX and CLI Web Crawler descriptions from their READMEs; evidence crops from legacy screenshots; three Medium titles/links from the legacy site (URLs not fetched; sandbox cannot reach Medium); GitHub link.
**Provisional copy (owner review):** hero line "Security tools and open-source contributions."; premise "Built in the open. / Every project here links to its public source, so each claim can be checked." (PC-1..PC-3 in `02`).
**Withheld (not rendered, kept in `facts.ts` `withheld`):** email, LinkedIn, Medium profile, education, experience, credentials, resume PDF (contains unapproved email/status). AD lab and SecureSuite are not on the page.

## Blockers (owner input)
Same open items as `docs/02-decisions-and-owner-inputs.md` §2; none block running the site. Most valuable next answers: OI-2 (positioning/premise wording), OI-3 (wordmark `anantsec` confirmed provisional), OI-21 (contact method/email), truth-table rows for background content.

## Next action
Owner: run the preview and review the hero zoom, Pwndbg sequence and copy; list changes. Then: (1) real-device testing (iPhone Safari, Android Chrome) of both pins; (2) accessibility pass; (3) refine from review notes; (4) Phase 2 items still open: sitemap, headers file, OG image, redirects, case-study pages.
