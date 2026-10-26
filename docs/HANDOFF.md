# HANDOFF

**Updated:** 2026-10-26 · **Session:** 4 · **Stage:** Visual refinement 3 COMPLETE (local preview). Awaiting owner review.

## Run
`npm install` · `npm run build` · `npm run preview` → http://127.0.0.1:4321/ (`npm run dev` works too). Node 22.22+.
`?review` outlines every provisional item. `npm run build:production` FAILS while any `review` flag remains in `src/data/site.ts` (verified: it does). It leaves `dist` incomplete when it fails, so run `npm run build` again before previewing.

## Design system (src/styles/global.css)
Warm paper `#F4EFE7` and sand `#E9E1D3`; midnight `#0B1020` and indigo-night `#141B3D`; cobalt `#3B4BFF` (light scenes) / `#8FA0FF` (dark); coral `#FF7452` only for what changes or needs attention (old flags, "work in progress"). Gradients are scene lighting only. Mona Sans (display), Newsreader (text), JetBrains Mono (code). Contrast estimates: cobalt on paper ≈ 5:1, cobalt-hi on midnight ≈ 7:1 (not tool-verified).

## What changed this session
- **Opening:** name moved to the nav and a small tagline. Headline "Building tools. Understanding systems. Exploring security." with the key words in cobalt. ONE visual: a signal that draws itself to the first node on load, then (scroll-driven, same pin) passes two more nodes, crosses a rising boundary and turns luminous as it enters the dark scene; the three phrases light as their nodes are reached. Landscape and portrait SVG variants. Old ring/disc/strip removed.
- **Pwndbg:** slabs and "field/size/offset" removed. New explanation built from the patch of PR #3160: the seven old options (`-a -f -r -e -l -s --show-all`) trace to the subcommand of the same name (`add file remove edit load show show-all`); `file` moves from 2nd to 6th place so exactly one trace crosses; then the new usage line and "New with the subcommands: --force on add and file, --name on file". Same pin, scrub, 80%-complete timing and paper curtain into the real evidence.
- **Projects:** CrawlX (screenshot on an indigo plate, the project's own `crawlx -h` typeset beside it), CLI Web Crawler (typographic usage + options on sand), AD lab (indigo scene, topology drawn from the README with planned parts dashed). The AI-generated legacy lab diagram is still not used.
- **New "What I work with" section** (between projects and Writing): two groups, filled markers = public work on this page (links to it), hollow = résumé only (no link, flagged `review`). No levels or percentages. Tracer runs down a spine as you scroll; items reveal with a stagger (reversible); hover/focus responses; works on mobile.
- **Writing:** topic in cobalt, metadata row, hover tint + accent bar + underline + shifted "Read on Medium".
- **Background:** now a story rail (Studying / Practising / Building in public) instead of a table; same flagged data.
- **Closing:** circle/iris and giant wordmark removed. Statement, a route (spine with ticks) drawn as you arrive to four contact rows, an end marker, a top edge highlight and a colophon.
- Removed: `src/lib/structure.ts` and the slab component. Added: `@fontsource-variable/jetbrains-mono`.

## Tested (actually run; headless Chromium 141, 1-CPU sandbox)
Production build passes; `tsc` clean. Screenshots (desktop 1440×900, mobile 390×844, reduced-motion) of opening, premise, Pwndbg at five progress points, proof, each project, toolkit, Writing, Background, closing, page end: no console errors, no horizontal overflow. Two pins only. CLS 0.0. Anchors (including Toolkit) land correctly. Forward/back frames differ by ≤0.005% of pixels. Resize OK. Nav readable on light and dark scenes in screenshots; fixed a mobile nav overflow and a mobile headline clip found during inspection. I did not have your screen recording, so comparisons were against my own earlier screenshots.
**NOT tested:** real phones; Safari/Firefox; real-hardware frame times; Lighthouse; axe/screen reader/keyboard audit; 200% zoom; the Lite heuristic.

## Items needing your review (`?review`; 26 flagged in `src/data/site.ts`)
All items listed last session, plus: hero statement wording and tagline; the five résumé-only toolkit entries (Linux, Burp Suite, Nmap, Wireshark, Nessus / OpenVAS); closing statement; AD lab inclusion. Withheld still: résumé PDF, 12th-grade result, unverified badge claims, SecureSuite.

## Known limitations
Writing dates show no year. The toolkit "Git / GitHub" evidence is the merged upstream pull request. Closing statement wording is mine. Opening is sparse on the right until the trace draws (intentional negative space; consider adding detail if it feels thin). No OG image, sitemap, headers file or redirects yet. Hover states cannot be exercised in screenshots; they were reviewed in CSS only.

## Next action
Owner: review the preview; correct `src/data/site.ts` and delete each `review` field as confirmed. Then: real-device testing of both pins; accessibility pass; OG image, sitemap, headers, legacy redirects; `npm run build:production` must pass before any deployment.
