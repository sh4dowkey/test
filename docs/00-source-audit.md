# 00 — Source Audit (preserved, complete)

Status: FINAL for Stage 0. Do not shorten. Update only when new facts are verified.
Legacy repos are READ-ONLY references: `sh4dowkey/anantsec` (main site), `sh4dowkey/portfolio_badge` (3D badge).
Tags: **[V]** verified in source or public record · **[A]** assumption/inference · **[?]** open question.

## 0. Audit limits
- Source audit only. The live sites (`anantsec.netlify.app`, `badge-anantsec.netlify.app`) were NOT reachable from the sandbox, so rendering, Lighthouse and live response headers were never observed.
- Public GitHub pages were read afterwards (PR #3160, repo existence/descriptions). The GitHub API was rate-limited. READMEs were not read.
- "VERIFIED" means the public artifact exists and matches name/description, not that technical descriptions are accurate.
- Certificate PNGs were not read for dates/IDs. Only `front.png` (badge) and `pwndbg_contribution_pr.png` were viewed.

## 1. Legacy architecture
**Main site [V]:** hand-written static multi-page site, no build step (`netlify.toml`: `publish = "."`, `command = "echo 'No build command'"`). 10 HTML pages, 11 per-page CSS files, 10 JS files, ~5,000 lines CSS+JS. 2 commits.
- Nav block is copy-pasted into every page with inline styles. `view.html` nav has drifted (omits "Blog").
- Page links: About → iframe of `badge-anantsec.netlify.app`. Writeups → `blog/htb.html`, `blog/bugbounty.html` (both empty). Certificates render from `data/certificates.json`. Gallery is a Vue 2 app with items hardcoded in `gallery.js`.
- Third-party loads: Font Awesome 6.4.0 (cdnjs), Unicons (iconscout), particles.js 2.0.0 (cdnjs), Vue 2.7.16 (jsdelivr).
- Extras: service worker, PWA manifest, theme toggle (`localStorage`), CSP in both `_headers` and `netlify.toml`.

**Badge [V]:** separate Vite + React 18 + react-three-fiber + Rapier physics app, own Netlify site. ~1,190 lines, mostly one 903-line `App.jsx` (profile data, terminal commands, 3D scene, UI). 8 commits.

**Third host [A]:** `og:image` and CSP reference `sh4dowkey.github.io` (probably an older GitHub Pages site).

## 2. Content inventory (legacy)
| Content | Where | Notes |
|---|---|---|
| Pwndbg contribution, PR #3160 | Resume, `album_images/pwndbg_contribution_pr.png` | Strongest external validation. Absent from homepage and badge |
| CrawlX (Go crawler) | Resume, badge, gallery | Repo `Crawlx` |
| CLI Web Crawler (Python) | Resume, gallery; badge calls it "PyRecon" | Same repo, two names |
| Secure Suite (StegoHide) | Resume, gallery (`stegno_hide_msg.webp`) | Missing from badge |
| AD lab | Gallery (`ad_lab_diagram.png`, `ad_lab_readme.png`), badge | Real repo `ad-attack-defense-lab` |
| Medium posts (3) | `blog.html` | "Hacking 101: Crack the Code Legally" (Feb 22), "Decoding the OWASP Top 10" (Feb 19), "cURL for Beginners: Essential Tips and Tricks" (May 28). URLs under `medium.com/@pandeyanant733/`. Year shown as 2025 [A] |
| Certificates | `data/certificates.json`, `assets/certificates/` | C\|CT (EC-Council), Google Cyber Security Professional, Teachnook "Cybersecurity Intern", Edunet-IBM "Cybersecurity Intern", APISec "OWASP API Security Top 10" |
| Forage job simulations | `assets/certificates/*-jobsim.png` | Tata, Mastercard, Deloitte, Datacom |
| Badges | `CCT-badge.png`, `apisec-badge.png`, `leetcode-badge.png` | LeetCode 100 days is not security-related |
| Experience | Resume | Teachnook (Feb–Apr 2025), AICTE-Edunet/IBM (Jan–Feb 2025) |
| Resume | `assets/pdf/resume/resume.pdf` + 2 PNG previews | Same PDF duplicated in the badge repo (`cmp` identical) |
| Links | Site/resume | GitHub, LinkedIn, email |

Resume key text (for reference, resume is the most authoritative single source): Name "Anant Kumar Pandey"; B.Tech CS, Trident Academy of Technology, Bhubaneswar, 2022–2026; 12th 90% St. Mary's HSS Jharsuguda 2021–22; Programming: Python, Go, Bash, Java, C, C++, SQL, JavaScript, HTML/CSS; Tools: Burp Suite, Nmap, Wireshark, Metasploit, Nessus/OpenVAS, BloodHound, Impacket, Responder, Netcat, OpenSSL, Shodan, theHarvester, DNSdumpster, Gobuster, Git, GitHub, Linux, GDB (Pwndbg); Credential IDs C|CT `ECC9285371640`, Google `69LDJC7T49HZ`; both internship entries carry identical responsibilities text.

**Empty or fake content [V]:** both writeup pages contain only "More Coming Soon" (Bug Bounty card badged "Live"); Twitter, Discord, YouTube icons link to bare homepages (`twitter.com/` also in JSON-LD `sameAs`).

## 3. Design problems (from source; rendering not observed)
- Typography unresolved: `Fira Code` declared on `body` but never loaded (no `@font-face` or font link on the main site) → system monospace fallback. Other pages use Inter/Roboto/Segoe UI. Monospace body copy everywhere reads as "terminal".
- Colour has no system: 4 CSS variables vs dozens of hardcoded greys (`#333` ×25, `#888` ×13, `#a9a9b3` ×15). Charcoal `#292a2d` + cyan `#66ccff`. Light mode = `body.light` overrides.
- Navigation: six equal-weight links (About, Gallery, Blog, Resume, Certificates, Writeups); Blog/Writeups/Gallery overlap; Gallery re-shows certificate images.
- Every page uses a different layout paradigm (iframe, card grid, list, Vue 3D album, resume as PNG images).
- Homepage layers particles, 11 rotating typed taglines (some with emoji), a cycling/flickering logo SVG, six social icons (three placeholders), "Explore" prompt leading to the iframe About page (no text of its own).
- Emoji used as headings; generic footer.

## 4. Animation audit
| Item | Implementation | Verdict |
|---|---|---|
| Particle network | particles.js 2.0.0 (appears unmaintained [A]); ignores reduced motion | Remove |
| Typed rotating taglines | Custom `setTimeout` loop | Remove |
| Logo icon cycler + flicker | `setInterval` | Remove |
| Scrolling grid | `gridFloat` on fixed full-viewport pseudo-element, duplicated in 7 CSS files, force-disabled on homepage | Remove |
| fadeInUp, cardFadeIn, headerGlow, borderGlow | CSS keyframes redefined per page | Reimagine as one system |
| Skeleton shimmer, spinner, lightbox/modal | CSS+JS | Lightbox focus-trap pattern worth re-implementing |
| 3D photo album | Vue 2.7.16 (EOL Dec 2023) + CSS 3D | Retire |
| Badge lanyard physics | R3F + Rapier + meshline | Separate project |
| Terminal typewriter | React state | Badge only |
| `loader.js`, `view.js` reading progress | Unreferenced / orphaned | Dead code |
Reduced motion: one CSS `prefers-reduced-motion` block; `main.js` adds a `.reduce-motion` class no CSS uses [V].

## 5. Asset audit
Worth considering: resume PDF; certificate and badge images (archive material); pwndbg PR screenshot; crawler screenshots; AD lab diagram; `og-image.png` (needs redesign).
Weak/heavy: `thankyou.webp` 6001×4001; `crawler_output.png` 2048×5810 (1.1 MB); `pwndbg_contribution_pr.png` 2778×4939; `google-cert.png` 1 MB; `leetcode-badge.png` 710 KB; ~12 MB total, no responsive sizes/AVIF.
No portrait or photography exists in either repo [V] — cinematic imagery must be built from type, diagrams or real project artifacts, or created/commissioned.

**Badge assessment:** fits as a "physical object responding to the user" idea and has monochrome front art; conflicts: Anonymous emblem + glitchy lettering (apparently AI-generated [A]), terminal UI, cyan accent, 4 MB Kali dragon background. `tag.glb` loaded from `assets.vercel.com`; scene structure matches Vercel's public lanyard example [A]; no LICENSE file in repo [V]. Technical: viewport `user-scalable=no`; `position: fixed; touch-action: none` can trap scroll in an iframe on mobile [A, test]; "Go Back" targets `/about.html` on the badge origin (404); `leva`, `lucide`, `react-icons` installed but apparently unused. Verdict: separate project; not in the new site by default.

## 6. Technical assessment (legacy)
- **Maintainability:** nav duplicated 10×; `gridFloat`/`fadeInUp` redefined per file; unfinished writeup pipeline (`view.html`/`view.js` fetch `./posts/...`; `htb.js`/`bugbounty.js` fetch `data/htb.json`/`data/bugbounty.json` which do not exist and the pages do not load them); `bugbounty.css`, `htb.css`, `loader.js` unreferenced.
- **Production bugs [V]:** `sw.js` precaches `/assets/css/about.css` (404) → `cache.addAll` rejects → worker never installs; cache-first HTML with fixed cache name would serve stale pages if it did. `manifest.json` references missing `icon-192.png`/`icon-512.png`. `sitemap.xml` has an HTML comment before `<?xml …?>` (invalid) and lists the two empty writeup pages. `robots.txt` disallows non-existent `/scripts/`, `/.github/` and sets ignored `Crawl-delay`.
- **Security:** CSP has `'unsafe-inline' 'unsafe-eval'` in `script-src`; `_headers` and `netlify.toml` define different CSPs (only toml allows the badge frame); which wins live is unknown [?]. No HSTS/Referrer-Policy/Permissions-Policy in repo. Email in plain text in several files.
- **Accessibility:** good: skip links, aria-live announcements, focus trap, theme toggle keyboard support. Bad: hamburger `<label>` probably not keyboard-focusable; "Explore" is a `div onclick`; resume images only; `#888`-class greys on near-white ≈3.5:1 (below AA for body text, confirm per usage); badge blocks zoom, canvas has no text alternative.
- **SEO:** About page has no body content; `og:image` points at another host; no canonical; placeholder Twitter in JSON-LD; sitemap `lastmod` 2025-01-10.
- **Performance:** ~12 MB unoptimised images; two icon libs and Vue from CDNs; `transition: all` on `body`. Badge adds 4 MB + 1.7 MB textures plus physics. Nothing measured live.

## 7. Architecture options (compared) and outcome
| Option | Pros | Cons |
|---|---|---|
| A. Static HTML/CSS/JS + GSAP/Lenis | No tooling | Duplicated layout; full reloads break seamless transitions |
| B. Vite + vanilla JS/TS + GSAP | Tiny runtime, full control | Build own routing/content model |
| C. Vite + React SPA (+R3F) | Direct badge port | Heavy for static content; SEO needs prerender; R3F v8/drei v9 tied to React 18 |
| D. Astro (static, islands) | Plain HTML output, Markdown/MDX content, islands for rich parts | New tool; cross-route persistent timelines need care |
**Outcome:** evaluate D (Astro + GSAP ScrollTrigger). Fallback B. Choose C only if the badge becomes central. Badge integration options considered: iframe (rejected), lazy island (costly: three + Rapier), pre-rendered video/image sequence, or keep separate (chosen).

## 8. Information architecture (original proposal, superseded by 01-design-brief.md)
One spine: identity → proof → practice → writing → credentials → resume/contact. Demote Gallery (merge into case studies), Certificates (compact + archive), Writeups (hidden until populated), theme toggle (conflicts with designed scenes).

## 9. Recommendations summary
Preserve: resume content, project/cert facts, lightbox/focus-trap logic, accessibility instincts. Change: positioning gap (bug-bounty/red-teaming claims vs evidence), type/colour tokens, About as real text, badge's role. Remove: particles, typed taglines, icon cycler, grid, Vue album, writeup scaffolding, placeholder socials, empty pages.
Biggest risks: (1) overclaiming; (2) badge weight/branding/licensing; (3) scroll-driven mobile performance; (4) SEO regression without redirects.

---

## 10. Content truth table (Stage 0)
Status vocabulary: VERIFIED / NEEDS OWNER CONFIRMATION (conflict where noted).

### A. Education and status
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| A1 | B.Tech CS, Trident Academy of Technology, 2022–2026 | Resume | Badge says "B.Tech student"; it is now Oct 2026 | NEEDS OWNER CONFIRMATION | Omit status and dates |
| A2 | 12th grade 90%, 2021–22 | Resume | None | NEEDS OWNER CONFIRMATION (publish at all?) | PDF only |
| A3 | Location: Bhubaneswar (OD) / "India" | Resume / badge | Precision differs | NEEDS OWNER CONFIRMATION | Use approved text only |
| A4 | Employment/availability status | None | No source | NEEDS OWNER CONFIRMATION | Don't imply any |

### B. Experience
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| B1 | Teachnook role title | Resume "Cyber Security Intern"; badge "Cybersecurity Certification Trainee"; cert JSON "Cybersecurity Intern" | Three versions | NEEDS OWNER CONFIRMATION (conflict) | Omit until chosen |
| B2 | Teachnook dates | Resume Feb–Apr 2025; badge Feb–Mar 2025 | Conflict | NEEDS OWNER CONFIRMATION (conflict) | Omit until chosen |
| B3 | AICTE programme name | Resume "AICTE-Edunet Foundation, IBM"; badge "AICTE-IBM SkillsBuild"; cert "Edunet - IBM" | Conflict (dates Jan–Feb 2025 agree) | NEEDS OWNER CONFIRMATION (conflict) | Use certificate name |
| B4 | Responsibilities | Resume identical text for both; badge different and specific (AD lateral movement, threat hunting, APT vectors) | Copy-paste; resume vs badge disagree | NEEDS OWNER CONFIRMATION (conflict) | Role, org, dates only |
| B5 | "Internship" vs "trainee" | As above | Certificate may say | NEEDS OWNER CONFIRMATION | Certificate wording |
| B6 | Forage simulations | Resume "Virtual Experience/Internship"; site "Job Simulation"; gallery title "EXPERIENCE" | Wording implies employment | NEEDS OWNER CONFIRMATION | "Job simulations (Forage)" under credentials |

### C. Skills and tools
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| C1 | Full resume skill/tool list | Resume | No link to evidence | NEEDS OWNER CONFIRMATION | Curated set tied to projects |
| C2 | Cobalt Strike | Badge only | Not on resume; no evidence | NEEDS OWNER CONFIRMATION | Omit |
| C3 | Ghidra | Badge only | Same | NEEDS OWNER CONFIRMATION | Omit |
| C4 | Malware analysis | Badge only | Same | NEEDS OWNER CONFIRMATION | Omit |
| C5 | Digital forensics | Badge only | Same | NEEDS OWNER CONFIRMATION | Omit |
| C6 | NIST CSF | Badge only | Same | NEEDS OWNER CONFIRMATION | Omit |
| C7 | PTES | Badge only | Same | NEEDS OWNER CONFIRMATION | Omit |
| C8 | Assembly, PowerShell, Windows/Linux Internals, John the Ripper, SQLMap, Hydra, Mimikatz, Empire, Splunk, Snort, Maltego | Badge terminal | Resume lacks them | NEEDS OWNER CONFIRMATION | Omit |
| C9 | "Burp Suite Pro" | Badge; resume says "Burp Suite" | Implies paid licence | NEEDS OWNER CONFIRMATION | Write "Burp Suite" |
| C10 | Java, SQL, SIEM log analysis, Impacket, Responder, Kerberoasting | Resume only | Badge lacks them | NEEDS OWNER CONFIRMATION | Include only with evidence |

### D. Pen-test / bug bounty / role
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| D1 | "Specializing in Active Directory, Bug Bounty, and Red Teaming" | Meta, OG, JSON-LD | No bug-bounty artifact; AD lab supports AD only | NEEDS OWNER CONFIRMATION | Omit bug bounty, red teaming |
| D2 | "Comprehensive penetration tests" | Badge | Resume claims VAPT as a skill and "exploitation validation" | NEEDS OWNER CONFIRMATION | Omit |
| D3 | Bug Bounty card "real-world production systems", badged "Live" | `writeups.html` | Page empty | NEEDS OWNER CONFIRMATION | Remove |
| D4 | "Cybersecurity Researcher" vs "Enthusiast" | Badge / site, JSON-LD | Conflict | NEEDS OWNER CONFIRMATION (conflict) | Decide |
| D5 | Hack The Box activity | Gallery logo, empty page | No profile/rank/evidence | NEEDS OWNER CONFIRMATION | Omit unless profile link given |

### E. Projects and Pwndbg
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| E1 | Pwndbg PR #3160 "Refactor cymbol command to use subcommands", addresses issue #3154 | Resume, screenshot, GitHub | PR opened by `sh4dowkey`; merged as commit `7d92563` into `pwndbg/pwndbg` (`dev`); screenshot: 3 files changed, +127 −98, 4 listed authors/co-authors; screenshot shows "Jul 22" with no year | **VERIFIED** (merge date/year not extracted) | Link `https://github.com/pwndbg/pwndbg/pull/3160` |
| E2 | "Refactored the symbol module … merged after positive code review" | Resume | Change is to the `cymbol` command, not a symbol module; review thread not read | NEEDS OWNER CONFIRMATION (wording) | Describe as `cymbol` command refactor, co-authored |
| E3 | CrawlX: Go concurrent crawler | Resume, badge | Repo `Crawlx`, "A Golang based Web Crawler" (Go confirmed). "High-performance/scalable" unbenchmarked | **VERIFIED** existence+language; performance wording NEEDS OWNER CONFIRMATION | No performance claims |
| E4 | "PyRecon: modular OSINT and footprinting framework" | Badge → `CLI-Web-Crawler` | No `PyRecon` repo; repo = "Python command-line tool that recursively crawls websites, extracts links and page titles" | NEEDS OWNER CONFIRMATION (conflict) | Use repo name/description |
| E5 | AD lab "Automated … PowerShell, Vagrant, Ansible" | Badge → `/AD-Lab` (404) | Real repo `ad-attack-defense-lab`: "Simulated enterprise Active Directory lab for red team attack techniques and blue team detection strategies." Stack unverified | Repo **VERIFIED**; stack/"automated" NEEDS OWNER CONFIRMATION | Correct URL |
| E6 | Secure Suite / StegoHide AES/RSA hybrid, pixel-level encoding | Resume | `SecureSuite` repo has no description; `STEGANOGRAPHY` repo: Python, OpenCV, Tkinter, basic password protection | NEEDS OWNER CONFIRMATION | Clarify relation of repos |
| E7 | `threat-intel-platform` | GitHub only | Not on site/resume; no description | NEEDS OWNER CONFIRMATION | Don't feature unless chosen |
| E8 | GDorks, Linux-Privilege-Escalation, CyberChef, bugzilla, pwndbg, Java-projects, neha_pandey_portfolio, test-new | GitHub | Fork/authorship not determined | NEEDS OWNER CONFIRMATION | Omit |

### F. Profiles, contact, identity
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| F1 | GitHub `sh4dowkey` | Site, resume | None | **VERIFIED** | Use |
| F2 | LinkedIn | Site `/in/anant-ku-pandey`; resume `linkedin.com/anant-ku-pandey` | Resume missing `/in/`; not checked | NEEDS OWNER CONFIRMATION | Use confirmed URL |
| F3 | Medium `@pandeyanant733` | `blog.html` | Handle differs; not checked | NEEDS OWNER CONFIRMATION | Confirm |
| F4 | Twitter, Discord, YouTube | Site | Bare homepages | Placeholders | Remove |
| F5 | Email `anant.pandey017@gmail.com` | Site, badge, resume | Plain text everywhere | NEEDS OWNER CONFIRMATION (publish?) | Owner decision |
| F6 | Phone `+91-933XXXXXXXX` | Badge | Placeholder | Placeholder | Omit |
| F7 | "Anant Kumar Pandey" vs "Anant Pandey"; `anantsec` vs `sh4dowkey` | Resume, JSON-LD, meta / site, GitHub | Two public identities | NEEDS OWNER CONFIRMATION | Decide |

### G. Certificates
| # | Claim | Source | Inconsistency | Status | Recommendation |
|---|---|---|---|---|---|
| G1 | C\|CT, EC-Council, ID `ECC9285371640` | Resume, cert image | Not checked with issuer; validity/expiry unknown | NEEDS OWNER CONFIRMATION | Verify; decide whether to publish ID |
| G2 | Google Cybersecurity Professional Certificate, ID `69LDJC7T49HZ` | Resume, cert image | Not checked | NEEDS OWNER CONFIRMATION | Use issuer verify link if any |
| G3 | APISec "OWASP API Security Top 10 and Beyond" | Resume; site says "…Top 10" | Title differs | NEEDS OWNER CONFIRMATION | Use certificate title |
| G4 | Teachnook/Edunet certs listed as "Professional Certificates" | `certificates.json` | They are internship certificates | NEEDS OWNER CONFIRMATION | Move under experience evidence |
| G5 | LeetCode 100-days badge | Site | Not security-related | NEEDS OWNER CONFIRMATION | Owner's call |

### H. Licensing and attribution
| # | Asset | Source | Issue | Status | Recommendation |
|---|---|---|---|---|---|
| H1 | `tag.glb` (assets.vercel.com) | Badge `App.jsx` | No LICENSE; resembles Vercel public example [A] | NEEDS OWNER CONFIRMATION | Resolve before any link to badge |
| H2 | `front.png` (Anonymous emblem, glitched lettering) | Badge | Creator/tool/rights unknown; brand symbol | NEEDS OWNER CONFIRMATION | Do not reuse |
| H3 | `back.png`, `band.png` | Badge | Not inspected | NEEDS OWNER CONFIRMATION | Do not reuse |
| H4 | `kali-dragon.png` (4 MB) | Badge terminal | Kali branding; source/permission unknown | NEEDS OWNER CONFIRMATION | Do not reuse |
| H5 | `htb_logo.png` | Gallery | HTB trademark | NEEDS OWNER CONFIRMATION | Factual reference only |
| H6 | `thankyou.webp`, `og-image.png`, `ad_lab_diagram.png` | Main site | Origin unknown (some possibly generated) | NEEDS OWNER CONFIRMATION | State how each was made |
| H7 | Company logos on Forage certs | Gallery | Fine as evidence | OK | Never decorative |
| H8 | Pwndbg screenshot | Gallery | Third-party project UI | OK | Credit project |
| H9 | Font Awesome, Unicons, Vue, particles.js | CDNs | Removed in new build | n/a | n/a |
| H10 | Fonts, GSAP | Future | Licences to check at selection | Pending | Check at Stage 2 |

## 11. Legacy URL map (proposed; final after IA approval)
| Old | New |
|---|---|
| `/index.html` | `/` (301) |
| `/about.html` | `/#background` or `/about/` (decide in Stage 2) |
| `/gallery.html` | `/#work` |
| `/blog.html`, `/writeups.html`, `/blog/htb.html`, `/blog/bugbounty.html`, `/view.html` | `/#writing` |
| `/resume.html` | `/resume/` |
| `/certificates.html` | `/credentials/` or `/#background` |
| `/assets/pdf/resume/resume.pdf` | Keep resolvable (external links) |
| `/assets/img/og-image.png` | Keep resolvable (social caches) |
| `/sw.js` | Serve self-unregistering stub for a transition period (old worker almost certainly never installed) |
| `/manifest.json` | Drop (PWA omitted) |

## 12. Technical cleanup list, by stage (not fixed in legacy; avoided by greenfield)
| Issue | Stage |
|---|---|
| Broken SW precache | Not migrated; SW stub at cutover (6) |
| Missing PWA icons | PWA omitted; manifest dropped (2) |
| Invalid sitemap | Generated sitemap (2), validate (6) |
| Conflicting CSP/headers, `unsafe-eval` | Single source defined (2), verify live (6) |
| ~12 MB unoptimised images | Pipeline (2), per-asset selection (4), budget audit (6) |
| Legacy `.html` URLs | Map (2), test (6) |
| Keyboard/contrast issues | Baseline (2) |
| Resume as images | Real HTML resume (4) |
| Reduced motion | Designed variants (3, 5) |
| Placeholder socials, wrong OG host, no canonical, stale lastmod | Metadata (2) |
| Fira Code never loaded | Font choice (2) |
| Badge-repo issues | Parked; out of scope while separate |
