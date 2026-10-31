# Handoff

Run: `npm install`, then `npm run dev` (or `npm run build && npm run preview`, http://127.0.0.1:4321/). Node 22.22+.
Content: everything is in `src/data/site.ts`. Résumé PDF: `public/resume.pdf` (byte-identical to the legacy site's file).
Previews carry `noindex`; build with `PUBLIC_INDEXABLE=1` for the real deployment. `npm run build:production` = strict build (still works, no flags remain).

## What changed
- **Opening**: headline "Python & Go tools. Security labs. Open-source work." plus a four-row index of real projects. There is no pin and no spacer: the hero is sticky and the first light scene rises over it, so every pixel of scroll moves content. First project heading is in view after about 0.56 viewport heights of scroll. Trace down the index advances with scroll.
- **Projects**: CrawlX (bounded dark frame; screenshots use natural aspect ratio, nothing cropped, click opens full size; worker-pool illustration from `NumWorkers = 10`), CLI Web Crawler (usage/options panel), Active Directory lab (status beside title; DC01, WIN10-1 built, Kali and the rest planned, per the README; responsive bus diagram), Pwndbg (modest: before/after usage, old flag to subcommand table from commit 7d92563, diff evidence, PR/commit/issue links, ~1 s resolve animation, no pin).
- **Toolkit**: three groups, no ratings. Hover/focus/click a tool or a project to highlight relations and draw a trace (desktop); highlights only on mobile.
- **Experience**: timeline that draws on scroll, internships grouped (the résumé gives identical responsibilities for both, noted on the page), credentials, résumé download card.
- **Contact**: signal travels a rail to the hovered/focused channel; Copy-email button; finished footer.
- Motion: GSAP + ScrollTrigger + Lenis (touch stays native). Zero pins. Reduced motion and no-JS show everything statically.

## Tested (headless Chromium via `tools/behaviour.py`, `tools/shots.py`)
Build and strict build pass; `tsc` clean. No console errors, no horizontal overflow at 1440x900, 390x844, 360x800. Anchors land at 76 px (Contact is limited by page end). Wheel responsive. Résumé download byte-identical, filename `Anant-Pandey-Resume.pdf`. Toolkit hover/keyboard/lock, contact hover/keyboard/copy checked. Reduced motion and no-JS: nothing hidden. Screenshots reviewed for hero, each project, toolkit, writing, résumé, contact at desktop and 390 mobile.
**Not tested**: real phones/trackpads, Safari/Firefox, Lighthouse, screen readers, 200% zoom, 360x800 visual review (only automated overflow checks), LinkedIn and Medium URLs resolving (sandbox cannot reach them).

## Facts to confirm
- LinkedIn URL is from the legacy site (`/in/anant-ku-pandey`); the résumé prints it without `/in/`.
- Article year 2025 comes from the legacy blog's year label.
- Graduation status: shown as "2022 – 2026" exactly as on the résumé.
- The résumé PDF itself still contains items not shown on the page (12th-grade result, credential IDs, a long skills list, "Secure Suite"). Consider updating the PDF.
- Withheld content is listed at the bottom of `site.ts`.
- Tools such as Burp Suite, Nmap, Wireshark, Metasploit, Nessus/OpenVAS, Gobuster and Linux come from the résumé only; no public project demonstrates them.
- Legacy repos and the live site were only read, never modified.


---
## Current state (cinematic revision)

**Opening** – `Hero.astro`, `src/scripts/hero-scene.ts`. One pinned sequence (about 1.75 viewports on desktop, 1.15 on phones): the word "Welcome" over a canvas lattice that is flown through on scroll, resolves into the CrawlX crawl tree (same layout code as the demo: `crawl-sim.ts → layoutFor`) and is revealed through a growing paper mask. An ink copy of the text lives inside the mask so it recolours as the paper passes. Reduced motion: no pin, one static frame. This is the only pin on the page. **Create the hero's ScrollTrigger first** (see the boot order in `motion.ts`), otherwise triggers below it measure stale positions.

**Self-running demonstrations** – no visitor controls. Each is one rAF loop (`src/scripts/loop.ts`) whose `render(u, fade)` is a pure function of the loop position, so nothing drifts. They start when near the viewport, pause off-screen and in hidden tabs, dissolve at the cycle end and restart clean. Reduced motion renders one finished frame. Hover or focus inspects.
- `crawlx-demo.ts` + `crawl-sim.ts`: replays the dispatcher/worker logic of `internal/crawl/crawler.go` (10 workers, buffer 100, 3 attempts, 1 s·(n+1) back-off, 100 ms delay, visited-map dedupe, same-domain filter, depth countdown) on a fictional site (`data/demos.ts`). Layout is computed from the discovery tree (wide on desktop, tall on phones), never fixed per device.
- `cli-demo.ts`: follows `crawler/core.py` (FIFO list, global `visited`, robots.txt before visiting, fail-open, `--search`, link filters). With `--output` the real tool prints nothing at the end, so the terminal shows no summary; the file appears in the results sheet.
- `cerberus-sim.ts` + `data/cerberus.ts`: eight phases (~49 s) over an isometric three-plane scene. Event stream, alerts, hunt queries, timeline and rulebook are all derived from one position. State is plain typed arrays so a read-only API could replace them (`docs/CERBERUS-LIVE.md`).

**Cerberus provenance** – Architecture, addressing (192.168.56.0/24, cerberus.local), accounts, template name, KQL hunts and the six Sigma rules come from `Combine-1,2.pdf`. The PDF is a **design**; the public repo `ad-attack-defense-lab` builds only a DC01 (192.168.10.10, corp.local) and WIN10-1, so those two are labelled "built in the lab repo / mapping unconfirmed" and everything else "planned". Events, timings and alerts are illustrative fixtures; recon events are marked *inferred* because the PDF gives no event IDs for that stage. Credentials, PowerShell and attack commands from the PDF are intentionally **not** reproduced.

**Pwndbg** – `initCymbol` in `motion.ts`: a scrubbed (unpinned) timeline: old usage line, each old option, paths drawing, old options struck, subcommands settling, new usage line, then the patch screenshot. Everything is readable without it.

**Toolkit** – content in `site.ts → toolkit`. Names are in the HTML (readable without JS); a trace and a wave pass through the groups; focus shows what each tool is based on (work / project / self-assessed / early). Self-assessed items carry `review` flags.

**Contact** – split composition; `contact-visual.ts` canvas loops on its own and brightens an arc when its link is hovered or focused.

**Review flags (strict build blocks until resolved)**: Bobcares job title/start date, graduation status, DC01 and WS01 mapping to the lab repo, and every self-assessed toolkit item (Networking, Server monitoring and log analysis, Bash, Burp Suite, Nmap, Web vulnerability research, Vulnerability-report writing, Cloud fundamentals). Run `npm run build:production` to list them.

**Résumé** – `public/resume.pdf` is the original, unmodified; it still says Bhubaneswar and predates the Bobcares role, and the page says so. `public/_headers` pins its content type on Netlify.

**Tests** – `python3 tools/qa.py [dir]` after `npm run build`: browser checks (about 70) including deterministic seeks into each loop. Not tested: real devices, Safari, Firefox, screen readers, performance profiling.


---
## Polish pass (preserves the existing design)

**Mobile opening** – Root cause: `hero-scene.ts` measured the `.hero` *section*, which contains the GSAP pin spacer (about 2.15 screens high once pinned), so any phone resize (URL bar showing or hiding) re-measured the canvas at roughly double height and pushed the tree below the visible frame. It now measures `.hero__pin` (100svh) and re-measures only when that frame really changes (ResizeObserver). The mask, headline scale, nav tone and tree remain driven by one progress value. Phone headline is slightly narrower and scales less so it stays on screen while it fades. Test hook: `.hero.__hero.bounds()`.

**Content** – The work section heading comes from `site.ts → work.heading` ("Portfolio"); the nav item is still "Work". Experience: Kochi, Kerala is the workplace; Jharsuguda is shown only as "Hometown" (résumé panel, contact). L1/L2/L3 wording and the tier note are removed; the description is limited to Linux/Windows server environments, checking Linux servers and infrastructure support. The résumé PDF itself is unchanged.

**CrawlX screenshots** – a rule had made every caption `<code>` a two-column grid. Captions are now plain wrapping blocks (`text-wrap: balance`), images keep their ratio, and on phones the two screenshots stack instead of sitting side by side at ~130 to 180 px.

**Pwndbg** – two triggers instead of one timeline: the command comparison runs from `.cym__usage` entering (top 90%) to the table's bottom reaching 64%, so paths draw while rows are visible; the evidence image has its own trigger (top 97% → top 48%) and is fully revealed with its top at mid-screen. Both scrub, so scrolling back reverses them. No new pin.

**Navigation scroll** – `scrollToId` in `motion.ts`: quadratic in-out easing, duration 1.45 s plus 0.06 s per screen travelled (about 1.5 s for a neighbouring section, up to about 2.8 s across the page), `lock: false` so wheel/touch input still interrupts. Direct hash loads and reduced motion remain immediate. Lenis position is checked against `scrollY` in the tests.

**Demonstration inspection (still fully automatic)**
- CrawlX: hover, focus (Enter to pin) or tap a page. Incoming and outgoing links highlight, the rest recede, the inspector lists "Found on" and "Links to" (chips jump to that page). Tap again, or tap empty graph, to release.
- CLI: any result row, queue chip or terminal line is focusable; it highlights its row, terminal line and stage in the rail, and shows the decision (queued, robots.txt rule, keyword match).
- Cerberus: hosts, pipeline stages (now real buttons), events and alerts. The related hosts, beams, stream lines, alerts and timeline entries highlight together and the detail card explains the target. Highlights are applied in place; lists are never rebuilt for a highlight, otherwise keyboard focus and taps are lost (this was a bug found and fixed in testing). Selections clear when the loop restarts.
- Labels are quiet text ("Simulated crawl · fictional site", "Sample run · fixture pages", and a muted "Simulated scenario: fixture events… not live telemetry" line for Cerberus). The loud pills are gone.
- Bug found by testing and fixed: Cerberus' wrapper `<div data-stage>` matched the new `[data-stage]` pipeline selector, so hovering empty parts of the scene produced an invalid focus and threw in `render`. The wrapper is now `data-cbstage`, targets are validated, and `tools/qa.py` has a regression test.

**Tests** – `python3 tools/qa.py` (after `npm run build`): 159 assertions pass on the final build, in desktop Chromium and Playwright's emulated phone viewports (touch + mobile emulation at 320, 360, 390, 430 px) including viewport resizes mid-sequence, a full-scroll mask/tone/text sync check, tap interactions at 390 px, reduced motion and JavaScript disabled. **Not tested:** real phones, Safari/iOS, Firefox, screen readers, performance profiling. The real iOS/Android URL-bar behaviour is reproduced only by resizing the emulated viewport.

**Still flagged (strict build blocks)** – 12 items: job title and start date, graduation status, the DC01 and WS01 mapping to the lab repo, and the self-assessed toolkit items.
