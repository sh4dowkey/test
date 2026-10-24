# 04 — Implementation Plan

Status: PROVISIONAL. Greenfield: nothing is copied from the legacy repos except verified facts and approved assets (see storyboard §9). No code exists yet.

## 1. Technical approach
- **Framework:** Astro, static output (PROVISIONAL). Reasons: content-first site, HTML shipped by default, Markdown/MDX collections for case studies, islands for the few rich parts. Fallback: Vite + vanilla TS + GSAP. Confirm current Astro/Node versions at scaffold time.
- **Animation:** GSAP + ScrollTrigger bundled locally (no CDN); `gsap.matchMedia()` for desktop/mobile/reduced-motion variants. Lenis only by gate (storyboard §10).
- **Styling:** plain CSS with design tokens (custom properties); no CSS framework; no legacy CSS.
- **Content:** typed content collections; every factual field carries a `status: verified | pending` flag, and the build **fails** if a `pending` field is rendered in a production build.
- **Images:** Astro image pipeline (AVIF/WebP, responsive sizes); every evidence image has `alt`, `source`, `credit`.
- **Fonts:** self-hosted subsets; `font-display` chosen per face; wordmark converted to outlines for the zoom.
- **Cross-page transitions:** simple cross-fade as progressive enhancement; no persistent timelines across routes (the landing narrative is one page).
- **Hosting:** NEW Netlify site with deploy previews; single header source; CSP without `unsafe-eval`; no service worker, no manifest.
- **Directory layout (planned):**
```
anantsec-redesign/
  CLAUDE.md
  docs/
  src/{pages,layouts,components,content,styles,scripts}
  public/{resume.pdf,robots.txt,_redirects}
  tests/
```

## 2. Phases, milestones and gates
| Phase | Scope | Exit gate |
|---|---|---|
| 1. Storyboard | `03-storyboard.md` | Owner review (CURRENT) |
| 2. Static foundation | Scaffold; tokens; type; layout; nav; content collections; all scenes as static HTML in final IA with confirmed content only; image pipeline; metadata; headers; redirects; a11y baseline; deploy preview | Static preview approved; Lighthouse a11y/SEO ≥ 95 (proposed); no pending content rendered |
| 3. Hero prototype | E1 + E2 on an isolated route, then in S0/S1; reduced-motion + Lite variants; real-device testing; Lenis evaluation | Prototype acceptance checklist passed (storyboard §10) and owner approval |
| 4. Remaining sections | S2/E5 sequence, curtains, evidence spreads, writing, background, contact, case-study pages, light/dark continuity | Owner review of full-page flow; mobile variants verified |
| 5. Animation refinement | Timing/easing consistency; profiling; removal pass; fallback tiers | Frame-time and CLS budgets met on target devices |
| 6. Hardening and cutover | Accessibility audit (automated + keyboard + screen reader); performance budget; headers/CSP live check; redirect tests; sitemap/OG; cross-browser; cutover plan and rollback | Explicit owner approval to cut over |

## 3. Testing requirements
- **Automated:** HTML validation; axe (or equivalent) on every page; Lighthouse CI on preview; link checker; redirect test script (`curl` each legacy URL, assert status + target); sitemap XML validation.
- **Visual:** screenshots at progress 0/.25/.5/.75/1 for each pinned sequence, compared with storyboard frames, desktop + mobile.
- **Devices (to confirm, OI-7):** at least one mid-range Android phone, one iPhone (Safari), one laptop each in Chrome/Safari/Firefox.
- **Manual:** keyboard-only pass; screen reader pass (NVDA or VoiceOver); reduced-motion pass (OS setting); no-JS pass; reverse-scroll and resize pass; 200% zoom/text-resize pass.
- **Budgets (PROPOSED):** hero JS ≤ 80KB gzip; LCP < 2.5s on throttled 4G; CLS 0 through sequences; p95 frame time ≤ 16.7ms in sequences; total page weight target set after asset selection (legacy was ~12MB of assets).

## 4. Deployment safeguards
1. New Netlify site only; never point the existing production site at this project.
2. Preview deployments are `noindex` (header or meta) until cutover.
3. Pre-cutover checklist: truth table rows for published content all VERIFIED or removed; screenshot privacy crops done; licences resolved for every asset; headers verified from live response; redirect script green; sitemap valid; OG images render.
4. Cutover = owner-approved action. Netlify keeps previous deploys, so rollback is one action. Legacy repos tagged and left untouched.
5. After cutover: serve self-unregistering `/sw.js` stub for a transition period; confirm old URLs redirect; check Search Console if used.

## 5. Legacy URL handling
See `00-source-audit.md` §11. Mapping finalised in Phase 2 once IA is approved. Old PDF and OG-image paths stay resolvable.

## 6. Technical cleanup, by phase
See `00-source-audit.md` §12. Most legacy defects (broken SW, manifest, invalid sitemap, dead scaffolding) disappear by not migrating them; the rest are built correctly from the start in Phase 2 and verified in Phase 6.

## 7. Risks
| Risk | Mitigation |
|---|---|
| SVG zoom cost on Safari/mobile | Prototype early; fallback "stroke fills viewport at moderate scale + cross-over" |
| Pin behaviour with mobile address bar | `svh/lvh`, `ignoreMobileResize`, device testing; mobile gets reduced pin distances or none |
| Content blocked by unanswered facts | Provisional placeholders in docs only; build fails on pending published content |
| Wordmark/font licensing | Check OFL before outlining; fallback families |
| Over-animation creep | Motion budget (2 pins) enforced in review; removal pass in Phase 5 |
| Screenshot privacy (third-party emails, target URLs) | Crop or recapture; owner approves |
| SEO regression at cutover | Redirect map + tests; canonical; sitemap |
