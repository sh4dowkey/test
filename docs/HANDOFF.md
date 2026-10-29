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
## Update: interactive demonstrations and Bobcares role

**New files**
- `src/data/demos.ts` – fictional deterministic sites for the CrawlX and CLI demos (everything is labelled as sample data).
- `src/data/cerberus.ts` – Cerberus fixtures plus a provenance note. The architecture PDF was not available when this was written; machine roles come from the owner's brief and build status from the public repo.
- `src/scripts/crawlx-demo.ts`, `cli-demo.ts`, `cerberus-sim.ts` – the three simulations (no network access, no user-supplied URLs).
- `docs/CERBERUS-LIVE.md` – what a genuine live connection would need.
- `tools/qa.py` – browser tests against the production preview (replaces `tools/behaviour.py`).

**Verified facts used**: CrawlX constants (10 workers, buffer 100, 3 attempts, 1 s retry delay, 100 ms request delay) from `crawler.go`; CLI options and BFS/robots logic from `cli.py` and `crawler/core.py`. Note: `usage.md` in the CLI repo documents a `--color` option that `cli.py` does not implement, so it is not shown. The lab repo lists Kali as 192.168.10.100 in one README and .30 in another, so no Kali address is displayed.

**Review flags** (strict build `npm run build:production` fails until each is resolved): job title and start date for the Bobcares role, graduation status, and the unconfirmed Cerberus details in `cerberus.ts`.

**Résumé**: `public/resume.pdf` is the original, unmodified. It still says Bhubaneswar and predates the Bobcares role; the page says so next to the download. `public/_headers` pins its content type for Netlify.
