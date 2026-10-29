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
