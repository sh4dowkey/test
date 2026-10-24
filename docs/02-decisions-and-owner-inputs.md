# 02 — Decisions and Owner Inputs

Single place for every decision and every open question. Do not re-ask these in chat; update this file.
Statuses: **APPROVED** (owner stated) · **PROVISIONAL** (working default, proceed unless changed) · **NEEDS OWNER CONFIRMATION**.
Row IDs like `B2` refer to the truth table in `00-source-audit.md` §10.

## 1. Decision register

| ID | Decision | Status | Notes |
|---|---|---|---|
| D-01 | Greenfield project in `anantsec-redesign`, outside both legacy repos; legacy repos read-only | APPROVED | Old live site untouched until new site is finished and approved |
| D-02 | Files-first workflow; chat replies < 200 words; `HANDOFF.md` updated every session | APPROVED | |
| D-03 | One cohesive cinematic/editorial single-page portfolio + optional case-study pages | APPROVED | |
| D-04 | Completely new typography, layout, components, palette, animation language | APPROVED | No legacy CSS/components reused |
| D-05 | Deliberate light and dark scenes; no global theme toggle in v1 | APPROVED | |
| D-06 | Subtle microinteractions + at most two major cinematic scroll sequences on landing | APPROVED | |
| D-07 | Native scroll first; GSAP ScrollTrigger preferred; Lenis only if prototype proves benefit | APPROVED | Criteria in storyboard §10 |
| D-08 | Static readable HTML, reduced-motion alternatives, keyboard accessibility, mobile adaptations | APPROVED | |
| D-09 | Badge not embedded or linked by default; stays separate | APPROVED | Revisit only with a design + licensing reason |
| D-10 | PWA omitted in initial release | APPROVED | |
| D-11 | Netlify hosting, new site, isolated preview; never replace production without approval | APPROVED | |
| D-12 | Verified evidence only; no invented achievements, skills, credentials, bio, metrics; placeholders never published | APPROVED | |
| D-13 | Initial project candidates: Pwndbg, CrawlX, CLI Web Crawler; AD lab provisional; SecureSuite pending | APPROVED | |
| D-14 | Astro (static) + GSAP ScrollTrigger | PROVISIONAL | Confirm versions/licences in Stage 2 |
| D-15 | Core concept: Blueprint (dark, understanding) vs Paper (light, proof) | PROVISIONAL | Storyboard §3 of brief |
| D-16 | Hero = H1 "Enter the name" | PROVISIONAL | Needs OI-3 (wordmark) and owner review |
| D-17 | Second sequence = SQ-A "Anatomy → proof" for Pwndbg | PROVISIONAL | |
| D-18 | Palette: Paper `#E6E8E8`, Ink `#13161B`, Blueprint `#0C2340`, Linework `#BFD3EA`, Redline | PROVISIONAL | Contrast re-check in Stage 2 |
| D-19 | Type: Mona Sans (display), Newsreader (text), mono only inside code excerpts | PROVISIONAL | Licence/packaging check |
| D-20 | Primary nav: Work · Writing · Background · Contact (inline on mobile, no hamburger) | PROVISIONAL | "Writing" pending OI-1 |
| D-21 | Pwndbg is the lead project | PROVISIONAL | Strongest verified external evidence |
| D-22 | Legacy URL redirects per `00-source-audit.md` §11; self-unregistering `sw.js` stub at cutover | PROVISIONAL | |
| D-23 | Plain HTML is the baseline; animation is an enhancement | PROVISIONAL | |
| D-24 | No analytics in v1 | PROVISIONAL | |
| D-25 | English only | PROVISIONAL | |
| D-26 | Single source of truth for headers (`netlify.toml` OR `_headers`), CSP without `unsafe-eval` | PROVISIONAL | |

## 2. Owner inputs

### A. Needed before finalising the visual concept
| ID | Question | Default if unanswered |
|---|---|---|
| OI-1 | Nav label: "Writing", "Research" (only if original research exists), or "Lab"? | "Writing" |
| OI-2 | One-sentence positioning you would stand behind, and the tone of the premise (also D4: Researcher vs Enthusiast vs other) | `[POSITIONING_LINE]` / `[PREMISE]` placeholders |
| OI-3 | Public name form and brand: "Anant Kumar Pandey" / "Anant Pandey" / `anantsec` / `sh4dowkey` (F7). Determines the wordmark and its aperture letter | Storyboard tests `[anantsec]`, `[Anant Pandey]` |
| OI-4 | Project set and order for the landing page | Pwndbg → CrawlX → CLI Web Crawler; AD lab if confirmed |
| OI-5 | Imagery: any portrait/photography you want used? Rights for any generated or commissioned assets (H2–H6)? | Type- and artifact-only; nothing generated |
| OI-6 | Approve or redirect: hero H1, second sequence SQ-A, palette and type direction | Proceed with H1 + SQ-A |
| OI-7 | Mobile: is a simplified variant (stacked stills for SQ-A) acceptable? | Yes |

### B. Needed before publishing factual content
| Group | Questions (see truth table rows) |
|---|---|
| Education/status | A1 current status and dates; A2 publish 12th-grade result?; A3 location wording; A4 availability statement |
| Experience | B1 Teachnook title; B2 Teachnook dates (Feb–Apr vs Feb–Mar 2025); B3 AICTE programme name; B4 per-role responsibilities (resume repeats the same text for both); B5 intern vs trainee; B6 wording for Forage simulations |
| Skills/tools | C1 approve a curated skill set tied to evidence; C2–C8 Cobalt Strike, Ghidra, malware analysis, digital forensics, NIST CSF, PTES, other badge-only tools: real or remove?; C9 "Burp Suite Pro" vs "Burp Suite"; C10 resume-only items |
| Pen-test/bounty | D1 "Specializing in AD, Bug Bounty, Red Teaming"; D2 "comprehensive penetration tests"; D3 bug-bounty content exists?; D5 HTB profile/rank? |
| Projects | E2 approve wording of the Pwndbg contribution (the `cymbol` command; co-authored; merge date/year); E3 performance claims for CrawlX; E4 CLI Web Crawler vs "PyRecon" naming and description; E5 AD lab: confirm stack ("PowerShell, Vagrant, Ansible") and whether to feature; E6 SecureSuite vs STEGANOGRAPHY repos and the AES/RSA claim; E7 feature `threat-intel-platform`?; E8 ownership/fork status of other repos |
| Profiles | F2 correct LinkedIn URL; F3 Medium handle and post years; F5 publish email? |
| Certificates | G1–G3 verify IDs/titles/validity and decide whether IDs are public; G4 treat internship certificates as experience evidence?; G5 keep LeetCode badge? |
| Assets | Identify which crawler screenshot belongs to which tool; approve crops of screenshots that contain personal data or third-party emails; origin of `ad_lab_diagram.png`, `og-image.png`, `thankyou.webp` (H6) |

Rule: only the content that depends on an unanswered item is blocked; everything else proceeds on provisional defaults.

### C. Needed before deployment
| ID | Question | Default |
|---|---|---|
| OI-20 | Domain: keep `anantsec.netlify.app` (new Netlify site takes over at cutover) or a custom domain? | Decide at cutover; canonical set accordingly |
| OI-21 | Contact method: published email, form, or both? Dedicated page or landing section? (F5) | Landing section, method pending |
| OI-22 | Cutover approval and legacy retirement plan (old Netlify site, badge site, `sh4dowkey.github.io`) | Old site stays live until explicit approval |
| OI-23 | Search Console resubmission, if used | Yes if you use it |
| OI-24 | Badge: keep unlinked, or link later after H1–H4 are resolved? | Unlinked |
| OI-25 | Site-code licence for the new repo (none in legacy repos) | None until decided |

## 3. Provisional copy and implementation records (session 2)
| ID | Item | Status |
|---|---|---|
| PC-1 | Hero line: "Security tools and open-source contributions." (derived only from verified repos) | PROVISIONAL, owner review (OI-2) |
| PC-2 | Premise line 1: "Built in the open." | PROVISIONAL (OI-2) |
| PC-3 | Premise line 2: "Every project here links to its public source, so each claim can be checked." | PROVISIONAL (OI-2) |
| PC-4 | Wordmark text `anantsec` (OFL Mona Sans outlines, weight 860, width 108) | PROVISIONAL (OI-3) |
| PC-5 | Aperture letter: "t" (thickest stroke, computed) | PROVISIONAL |
| PC-6 | Background shows only an evidence ledger (skills tied to the projects above); education, experience, credentials withheld | PROVISIONAL until section 2B answered |
| PC-7 | Email, LinkedIn, Medium profile, resume PDF not published | Withheld pending OI-21, F2, F3, A1/B* |
| PC-8 | Medium post titles/links reused from the legacy site (not fetched) | NEEDS OWNER CONFIRMATION (F3) |
| PC-9 | Pwndbg described as "co-authored; the commit lists four contributors" | PROVISIONAL (E2) |
