# 03 — Storyboard (Stage 1)

> **Superseded (sessions 3 and 4):** the opening is now the signal-and-boundary composition, the Pwndbg illustration is the cymbol flag-to-subcommand explanation, and the palette is warm paper / midnight / cobalt (see `docs/HANDOFF.md`). Motion rules (two pins, native scroll, reduced-motion variants) still apply.

Status: PROPOSED — awaiting owner review. No code exists. Everything here is PROVISIONAL until approved.
Placeholders use `[BRACKETS]` and are never published. Facts come only from `00-source-audit.md` rows marked VERIFIED.
Units: `vh` = viewport height (implement with `svh`/`lvh` per mobile notes). "Scroll distance" = extra scroll consumed while pinned.

---

## 1. Hero concepts (signature opening)

### H1 — "Enter the name" (RECOMMENDED)
The page opens on a huge deep-blue wordmark on Paper. The wordmark is a window: its letterforms are cut-outs onto the Blueprint scene behind. As the visitor scrolls, the camera pushes into one heavy letterform until its stroke fills the viewport; the other letters drift outward. The visitor has literally stepped inside the name and arrives in the dark Blueprint scene where the premise statement is waiting.
- Why: needs no photography (none exists); type-driven and timeless; delivers the requested zoom/scale/position transformation and a light→dark scene change in one gesture; the metaphor ("inside the name, where the work is") suits a security practitioner without hacker clichés.
- Risks: vector scale to ×20–×40 can be costly to rasterise (esp. Safari) [A]; depends on the wordmark choice (needs a heavy letter with a generous stroke). Mitigations in §6 and §10.

### H2 — "The annotated claim"
Paper page with one positioning sentence. As the visitor scrolls, redline lines draw from phrases to small real artifacts (PR, repo, diagram) that scale up in turn.
- Why: expresses the "claims → evidence" idea directly.
- Against: more diagrammatic than cinematic; thumbnails risk the "random cards" look; weaker first frame.

### H3 — "Exploded object"
A single abstract object (stack of data slabs) in a Blueprint scene assembles and rotates; the name appears as a label.
- Why: strong object transformation, Apple-like exploded view.
- Against: abstract object has no obvious relationship to the person; heavy 3D/CSS-3D work for the *first* impression; better used as a supporting sequence (see SQ-A).

**Recommendation:** H1 for the hero. H2's annotation language is reused as a small system (redline callouts); H3's exploded-object idea becomes the second sequence.

**Wordmark rule:** the final wordmark text is open (OI-3). Candidates: `[anantsec]`, `[Anant Pandey]`, `[Anant Kumar Pandey]`. The aperture letter must have a heavy, closed form: lowercase *a*/*e*/*p*/*d*, or capital *A*/*P*/*D*/*R*. Stage 2 must test the chosen wordmark's geometry before the prototype.

---

## 2. Second cinematic sequence concepts

### SQ-A — "Anatomy → proof" for Pwndbg (RECOMMENDED)
Blueprint scene. An illustrative stack of byte slabs (an abstract struct layout, labelled "Illustration") assembles in perspective, rotates flat, and receives redline callouts. The scene then hands off by *match cut* to Paper where the real pull request evidence sits exactly where the flattened diagram was.
- Ties to the strongest verified evidence (PR #3160, `cymbol` command manages custom C structures in Pwndbg). The illustration shows the *idea of a struct layout*, not project internals or results.
- The pinned part is only the build/annotate; the proof is ordinary scrolling.

### SQ-B — "Crawl as a map"
Zoom out from one URL to a mapped region with parallel lanes for CrawlX's concurrency.
- Against: network-graph imagery is a cybersecurity cliché; invites performance implications we cannot verify (E3).

### SQ-C — "Evidence desk pan"
Camera travels across large crops of real artifacts (PR, crawler output, lab diagram) at scale.
- Against: reads as a gallery; horizontal scroll hijack; weaker concept.

**Recommendation:** SQ-A, placed as the opener of the featured project. It is the only pinned sequence after the hero.

---

## 3. Scene-by-scene map (single page)

Estimated desktop length ≈ 1,700–1,800vh total (mobile ≈ 1,300vh). Two pinned sequences only.

| ID | Scene | Tone | Height | Pin | Content type |
|---|---|---|---|---|---|
| S0 | Opening: enter the name | Paper → Blueprint | 100vh + 250vh pin | Yes (E2) | Wordmark, `[POSITIONING_LINE]`, nav |
| S1 | Premise | Blueprint | ~120vh | No | `[PREMISE]` 1–2 sentences |
| S2 | Pwndbg: anatomy | Blueprint | 100vh + 300vh pin | Yes (E5) | Illustration + callouts, verified one-liner |
| S3 | Pwndbg: proof | Paper | ~130vh | No | Real PR/diff crop, verified facts, links |
| S4 | CrawlX | Paper | ~130vh | No | Editorial spread, evidence crop, repo link |
| S5 | CLI Web Crawler | Paper | ~130vh | No | Editorial spread, evidence crop, repo link |
| S5b | AD lab (PROVISIONAL, only if confirmed) | Paper | ~130vh | No | Diagram evidence |
| S6 | Writing | Paper-2 | ~80vh | No | 3 Medium posts as a large-type index |
| S7 | Background | Paper | ~150vh | No | Evidence-tied skills, confirmed experience/education, credentials row, resume |
| S8 | Contact | Blueprint | ~100vh | No | Closing line, contact method, links, wordmark callback |

Fixed navigation (always present, minimal): **Work · Writing · Background · Contact**. Its colours switch with the scene underneath via class toggles. No hamburger on mobile (four words fit inline).

**S0 Opening.** First frame: Paper, wordmark ~92% viewport width in Ink, left-aligned, baseline ~58% down; `[POSITIONING_LINE]` set small in the text face at bottom left. No scroll arrow; a short hairline "draw" under the line at the end of the load moment signals scrollability. On scroll: the zoom (E2).
**S1 Premise.** Blueprint. Large text face, left-aligned on columns 2–9, max ~22 words, `[PREMISE]`. Lines gain focus as they cross a reading band (E3). Must be written only from verified claims.
**S2 Anatomy.** Blueprint. Left: project name in display type and a verified one-liner. Right: the illustrated slab stack with redline callouts. Caption "Illustration of a struct layout. Not project output." (E5).
**S3 Proof.** Paper. Left (cols 1–5): project name, verified facts (PR #3160 link, issue #3154, merged, co-authored; wording pending E2), one link to the case-study page. Right (cols 6–12): real evidence crop at readable size; caption with source link and attribution.
**S4/S5 Crawler spreads.** Alternate image side. Large project name; one paragraph from verified repo description only; one evidence crop; repo link. Short and quiet.
**S6 Writing.** Index list: title in display type, venue `Medium`, date (year pending), external link. No thumbnails. Hover/focus draws an underline.
**S7 Background.** Text-led. Evidence-tied skills as a two-column ledger (skill ↔ the project that evidences it) — a structural device that carries real information. Experience/education blocks are shells until OI answers arrive. Credentials: one text row with issuer and verify links; link to `/credentials/`. Resume: link to `/resume/` and PDF.
**S8 Contact.** Blueprint. `[CLOSING_LINE]`, `[CONTACT_METHOD]`, verified links only (GitHub confirmed; others pending). A cropped giant wordmark at the bottom edge calls back to S0; "Back to top" is a plain link.

Optional case-study pages `/work/<slug>/`: Blueprint title band, Paper body (what it is, what was done, evidence, links), built from READMEs verified in Stage 2. Simple cross-fade page transition (progressive enhancement).

---

## 4. Composition at the start and end of every major transition

### T1 — Opening zoom (S0 → S1), pinned, E2
```
p=0.00 (Paper)                p=0.50                       p=1.00 (Blueprint)
+------------------------+    +------------------------+   +------------------------+
|nav            Work ... |    |nav                     |   |nav                     |
|                        |    |  paper ring at edges   |   |                        |
|  [WORDMARK]            |    |  dark fills the heavy  |   |   [PREMISE] text       |
|  (~92% width)          |    |  stroke; neighbours    |   |   (Paper on Blueprint) |
|  [positioning line]    |    |  letters exit outward  |   |                        |
+------------------------+    +------------------------+   +------------------------+
```
- **Start:** full Paper; wordmark at 92% width; line at bottom-left. The letterforms are cut-outs onto the Blueprint layer behind, so at rest the wordmark reads as deep blue-black ink (Blueprint showing through), which is why Ink and Blueprint are chosen to sit close in value.
- **25%:** non-aperture letters begin to drift outward and slightly down (parallax by distance from the aperture); positioning line fades out by 15%.
- **50%:** the aperture letter's stroke dominates; paper remains only as a wide ring; a very faint blueprint grid (1px, ~6% linework tone) scales at a different rate to give depth.
- **75%:** paper only at corners; neighbours gone.
- **End:** viewport 100% Blueprint; grid settled; `[PREMISE]` first line already in place (revealed in the last 20% so no text is read at partial coverage). Pin releases into S1 with no hard edge.

### T2 — Anatomy build (inside S2), pinned, E5
```
p=0.00                  p=0.40                    p=0.75–1.00
+--------------------+  +--------------------+    +--------------------+
|[title]             |  |[title]             |    |[title]       slabs |
|        slabs far   |  |   slabs stacked    |    |              flat  |
|        apart,      |  |   in perspective   |    |   callouts drawn   |
|        rotated     |  |   rotating toward  |    |   (redline)        |
|        55°/−35°    |  |   flat             |    |   plane = proof    |
+--------------------+  +--------------------+    +--------------------+
```
- **Start:** Blueprint; title and verified one-liner left; slabs separated in depth, rotated (≈55° X / −35° Y), low opacity.
- **40%:** slabs assembled; rotation easing toward flat.
- **75–100%:** flat (0°), plane centred at columns 7–11, ~60% of its starting scale; redline callouts have drawn (stroke-dashoffset) and hold; caption "Illustration…" present.

### T3 — Curtain match cut (S2 → S3), unpinned (native scroll)
- **Start:** Blueprint sticky, flattened diagram plane on the right.
- **During (~60vh):** the Paper section slides up over the sticky Blueprint (CSS sticky overlap; no JS).
- **End:** Paper fills the viewport; the real evidence crop sits at the *same position and size* as the flattened plane; text column on the left. A match cut, not a morph.

### T4 — Curtain (S7 → S8), unpinned
- **Start:** Paper Background section; **End:** Blueprint Contact rises over it; the giant wordmark appears cropped at the bottom edge, echoing S0. Native scroll, no JS.

### Non-transitions
S3→S4→S5 (Paper→Paper) separated by generous space only. S5→S6 (Paper→Paper-2) is a hard tone edge with large negative space, because animating large-area background colour is not compositor-only.

---

## 5. Light/dark rhythm, type, colour, spacing, hierarchy

**Rhythm:** Paper (S0 first frame) → Blueprint (S0 end – S2) → Paper (S3 – S7) → Blueprint (S8). Three tone changes: one cinematic (T1), two curtains (T3, T4). Dark is where things are *understood*; light is where they are *proven*.

**Colour (4–6 named values; verify contrast with tooling in Stage 2)**
| Token | Hex | Role |
|---|---|---|
| Paper | `#E6E8E8` | Light scenes: cool mineral white (not cream) |
| Paper-2 | `#D8DCDD` | Writing scene tone shift |
| Ink | `#13161B` | Text on Paper, wordmark |
| Blueprint | `#0C2340` | Dark scenes (cyanotype/engineering-drawing blue, not black) |
| Linework | `#BFD3EA` | Lines, secondary text on Blueprint |
| Redline | `#D9442B` on Paper · `#FF7A5C` on Blueprint | Annotation marks only (callouts, focus accents) |

Contrast estimates (to be re-checked): Ink on Paper ≈ 14:1; Paper on Blueprint ≈ 12:1; Linework on Blueprint ≈ 10:1; Redline `#FF7A5C` on Blueprint ≈ 6:1; **Redline `#D9442B` on Paper ≈ 3.6:1 → graphics and ≥24px text only**; annotation text uses Ink.

**Typography (candidates; confirm OFL licence, packaging and glyph geometry in Stage 2)**
- Display/wordmark: **Mona Sans** (variable weight + width). Fallbacks if unsuitable: Archivo (wdth/wght) or Anybody. Heavy weight, extended width for the wordmark; text-case sentence/lowercase as the wordmark dictates.
- Text: **Newsreader** (serif with optical size) for reading text; line-height ~1.55–1.6, measure 58–66ch.
- Code/evidence only: **Commit Mono** or **JetBrains Mono**, used only inside real code excerpts. Not used for labels.
- Scale: fluid, ratio ~1.25 for text; display `clamp(3.5rem, 13vw, 15rem)`; small text 14–15px minimum. No all-caps labels, no eyebrow labels, no "01/02" numbering (the scenes are not a sequence).
- Load moment: if animating the width axis causes layout cost on a ~13vw heading, use a mask reveal instead (prototype question).

**Spacing and layout:** 8px base; 12-column desktop grid, 4-column mobile; asymmetric left-aligned text blocks; vertical rhythm of 12–20rem between scenes on desktop; negative space is a design element. Text is left-aligned (no centred paragraphs, no justification).

**Hierarchy:** one dominant element per scene (wordmark → premise → slab stack → evidence crop → project name → post titles → ledger → closing line). Everything else is ≤ 1/3 of its size. Redline appears only where a mark connects a statement to its evidence.

---

## 6. Animation spec (important effects)

| ID | Effect | Trigger | Scroll distance | Easing / catch-up | Pin | Notes |
|---|---|---|---|---|---|---|
| E1 | Load moment: wordmark resolves | Page load (not scroll) | 0 (≈1.2s) | `expo.out`; width-axis or mask reveal | No | The only load animation. Skipped under reduced motion (final state rendered) |
| E2 | Enter the name | ScrollTrigger `start: top top`, `end: +=250%` | 250vh (desktop), 200vh tablet, 180vh mobile | `scrub: 0.8` catch-up; zoom scale mapped **exponentially** (`scale = Smax^p`) so perceived speed is even; neighbours `power2.out` | Yes (`anticipatePin`, `pinSpacing`) | `Smax` tuned to stroke geometry (≈×20–×40 target). Premise first line revealed in last 20%. `snap: none` |
| E3 | Premise reading band | Each line `start: top 70%` → `end: top 40%` | ≈30vh per line | `scrub: 0.3`; opacity 0.35 → 1 | No | Disabled under reduced motion (all lines at 1) |
| E4 | Curtain transitions (T3, T4) | Native scroll | ~60vh each | None (position: sticky overlap) | CSS sticky only | No JS; identical under reduced motion |
| E5 | Anatomy → proof prep | `start: top top`, `end: +=300%` | 300vh desktop; no pin on mobile | Phases: 0–40% assemble (`power2.inOut`), 40–75% annotate (draw, linear), 75–100% hold; `scrub: 1` | Yes | Transform/opacity only; CSS 3D or SVG isometric (prototype decides). Reverse scroll must be clean |
| E6 | Evidence settle | `start: top 85%` → `end: top 40%` | ≈45vh | `scrub: 0.5`; scale 1.04 → 1, y 24 → 0 | No | Subtle; only on evidence crops. Disabled under reduced motion |
| E7 | Link microinteractions | Hover/focus | n/a | 200ms underline draw (left → right); focus ring 2px Ink/Paper with 3:1 contrast | No | Reduced motion: instant colour change |
| E8 | Scene theme for nav | ScrollTrigger `toggleClass` per scene | n/a | Instant class swap | No | Nav stays readable on both tones |

**Pinning decision:** pin E2 and E5 only. All other scenes are ordinary scroll. **Smoothing:** none beyond ScrollTrigger `scrub` catch-up; Lenis only if the prototype shows a benefit (criteria in §10). No snapping, no wheel hijack.
**Mobile prototype questions:** `ScrollTrigger.config({ ignoreMobileResize: true })`, `normalizeScroll`, `svh/lvh` handling, address-bar resize behaviour, SVG raster cost at high scale, Safari mask behaviour.

---

## 7. Variants

| Scene / effect | Desktop ≥1024 | Tablet 640–1023 | Mobile <640 | Reduced motion | No-JS / low capability |
|---|---|---|---|---|---|
| S0 / E2 | Full, 250vh pin | Full, 200vh | Wordmark stacked on 2 lines so the aperture letter is large; 180vh; lower `Smax` | No zoom: Paper wordmark section, then hard-edge Blueprint premise | Same as reduced motion |
| S1 / E3 | Reading band | Same | Same, shorter bands | All lines fully visible | Same |
| S2 / E5 | Pinned 300vh | Pinned 240vh if profiling allows | No pin: three stacked stills (assembled, annotated, flat) with simple reveal | Static: assembled illustration with callouts | Static SVG illustration |
| T3 / T4 | Sticky curtain | Same | Same (pure layout) | Same | Same |
| S3–S5 / E6 | Settle | Settle | Settle or none | None | None |
| Nav | Top-right text | Same | Inline row of 4 links | Same | Same |
| Page transitions | Cross-fade | Same | Same | None | None |

**Lite variant (low capability):** detect via `gsap.matchMedia` conditions (`prefers-reduced-motion`, width) plus a capability probe (median `requestAnimationFrame` delta in the first second, `hardwareConcurrency`, `deviceMemory` where available) — no user-agent sniffing. In Lite, replace E2 with a short, unpinned cross-over and E5 with stacked stills. [A: thresholds set during Stage 3 testing.]
**Principle:** the plain HTML/CSS composition (reduced-motion layout) is the baseline; scroll animation is an enhancement applied after JS loads. Skip links, focus visibility and anchor navigation must work mid-pin (nav click to `#work` lands correctly).

---

## 8. How hero, project visuals and evidence relate
1. Hero = identity (type only, nothing to verify). Premise = a statement that every later scene backs up.
2. Blueprint illustrations explain an idea and are always captioned as illustrations. They contain no invented numbers, no fake terminal output, no fake dashboards.
3. Paper evidence is real: PR, repository pages, README or output screenshots, writing, documents. Each evidence crop has a source link and attribution.
4. One consistent hand-off: Blueprint illustration → (match cut) → Paper evidence in the same screen position (T3). Other projects skip the illustration and go straight to evidence to keep restraint.
5. Redline marks are the only visual device linking statement to artifact; they never decorate.
6. Order of emphasis follows strength of evidence: Pwndbg (externally merged) first; CrawlX and CLI Web Crawler (public repos); AD lab only if confirmed; SecureSuite pending.

---

## 9. Asset and licensing checklist
| Asset (legacy path) | Status | Action |
|---|---|---|
| `resume.pdf` | Reusable after owner confirms contents | Publish original PDF at `/resume.pdf`; build HTML resume from confirmed facts |
| `pwndbg_contribution_pr.png` | Reuse a **crop** | **Privacy:** screenshot shows third-party co-author email addresses in the commit message; crop them out or recapture. Credit pwndbg |
| `crawler_help.png`, `crawler_output.png`, `crawler_code.png` | Verify | Identify which tool each shows; check for target URLs/personal data; crop and optimise |
| `ad_lab_diagram.png`, `ad_lab_readme.png` | Verify | Origin of diagram unknown (H6); AD lab is PROVISIONAL; consider redrawing from scratch |
| `stegno_hide_msg.webp` | Verify | Pending SecureSuite clarification (E6) |
| `github_workflow.png`, `python_script.png` | Unidentified | Do not use unless owner assigns a purpose |
| Certificate and badge PNGs | Archive only | Credential IDs/QR codes: owner decides what is public; verify with issuers; Forage logos not decorative |
| `og-image.png` | Create from scratch | New OG image in the new system |
| `thankyou.webp`, `htb_logo.png` | Do not reuse | Unknown origin / trademark |
| Badge assets (`front.png`, `back.png`, `band.png`, `kali-dragon.png`, `tag.glb`) | Do not reuse | Unresolved licensing (H1–H4) |
| Wordmark (SVG outlines) | Create from scratch | Convert chosen font to outlines; confirm font licence permits |
| Slab/struct illustration, redline callouts, blueprint grid | Create from scratch | Original SVG/CSS |
| Fonts (Mona Sans, Newsreader, Commit Mono) | Verify | Confirm OFL and packaging; self-host only |
| GSAP + ScrollTrigger | Verify | Confirm current licence terms at install; bundle locally |
| Favicon / app icons | Create from scratch | Simple mark derived from the wordmark's aperture letter |

---

## 10. Prototype acceptance checklist (hero, Stage 3)
**Feel**
- [ ] First frame communicates who and what within 5 seconds, with no scrolling.
- [ ] Scroll response feels immediate; catch-up lag is perceptible but under ~0.5s; no rubber-band jank on release.
- [ ] Zoom feels evenly paced (exponential mapping), not accelerating or stalling.
- [ ] The arrival in Blueprint feels continuous: no flash, hard cut, or visible layer seam.
- [ ] Removal test: deleting any hero element makes it worse (otherwise delete it).
- [ ] Normal reading after the hero is comfortable; nothing slows ordinary scrolling.

**Technical**
- [ ] Frame time p95 ≤ 16.7ms on a mid-range phone and laptop; no long tasks > 50ms during the pinned range.
- [ ] Only transform/opacity animate while scrubbed; zero layout shift (CLS 0) during and after the pin.
- [ ] Forward and reverse scrolling give identical frames at the same progress.
- [ ] Resize, orientation change and mobile address-bar collapse do not break the pin or leave gaps.
- [ ] Wordmark is real text or inline SVG (not a raster); LCP < 2.5s on throttled 4G.
- [ ] Initial JS for the hero ≤ 80KB gzipped (proposed budget).
- [ ] Safari (macOS/iOS), Chrome, Firefox pass visual comparison at progress 0, .25, .5, .75, 1.

**Accessibility and fallbacks**
- [ ] Keyboard: Tab order sensible during pin; Space/PageDown/End work; nav anchors land correctly mid-pin; skip link works.
- [ ] Screen reader reads the wordmark and premise in order, once (no duplicated hidden text).
- [ ] Reduced-motion variant is complete and designed, not "disabled".
- [ ] No-JS and Lite variants are readable and navigable.
- [ ] All settled text states meet 4.5:1 contrast.

**Decision gates**
- [ ] Lenis adopted only if native scrolling plus ScrollTrigger scrub shows a demonstrable defect that Lenis fixes (stepped wheel input, touch inconsistency), and the benefit survives keyboard/anchor/reduced-motion testing.
- [ ] If SVG scale cost fails on Safari/mobile, fall back to the "stroke fills viewport at moderate scale + cross-over" variant before abandoning H1.

---

## 11. Anti-default review (what changed after self-critique)
- Dropped an **amber** accent (reads as retro CRT/terminal) → Redline, used only as annotation.
- Dropped a **near-black** dark scene (generic) → cyanotype/blueprint blue.
- Dropped **monospace labels**, **numbered scene markers** and **eyebrow labels**; scenes are not a sequence and labels carry no data.
- Kept one orchestrated load moment instead of per-section fade-ups.
- Spent boldness in one place (the name zoom); the second sequence is restrained to one pin.
- Illustrations are always labelled; evidence is always sourced.

## 12. Open items affecting this storyboard
OI-1 nav label · OI-2 premise/positioning · OI-3 wordmark and identity · OI-4 project set · OI-5 imagery rights · OI-6 contact method. See `02-decisions-and-owner-inputs.md`.
