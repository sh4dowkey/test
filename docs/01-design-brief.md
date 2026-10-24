# 01 — Design Brief

Status key: APPROVED (owner stated) · PROVISIONAL (working default; change freely) · see `02-decisions-and-owner-inputs.md`.

## 1. Subject and audience
A cybersecurity portfolio for an early-career security practitioner/tool builder. Primary audiences: recruiters and hiring engineers (need to understand who/what within seconds and find proof), peers and open-source maintainers (want technical credibility). The job of the site: turn claims into **checkable evidence**. [PROVISIONAL]

## 2. Creative direction [APPROVED]
- Timeless, premium, editorial. Cinematic storytelling with minimal typography and generous negative space.
- Experimental but purposeful interaction; subtle everyday motion plus at most two major cinematic scroll sequences on the landing page.
- Scroll-driven zoom, scale, position and object transformation where they serve the narrative.
- Seamless transitions between scenes; deliberate light and dark scenes designed into the story (no global theme toggle in v1).
- Inspired by the quality of Apple's product storytelling, not a copy of it.
- Avoid: neon-green hacker aesthetic, terminal-themed hero, random floating code, glassmorphism for its own sake, template card grids, scattered decoration.

## 3. Core idea [PROVISIONAL]
**Two layers, two scenes.**
- **Blueprint (dark):** the layer of *understanding* — how things work. Illustrations, anatomy, structure. Drawn in linework.
- **Paper (light):** the layer of *proof* — real artifacts: screenshots, pull requests, repositories, documents, writing.
Every illustrated claim resolves into a real artifact on Paper. Illustrations are labelled as illustrations. A single annotation language (redline callouts) links statement to evidence.

## 4. Visual principles
1. One memorable thing per scene; everything around it quiet.
2. Evidence over decoration: no mock dashboards, invented metrics or fake terminals.
3. Structure is information: borders, numbers and labels only where they encode something (numbers only for genuine sequences).
4. Motion is rare, large and meaningful; ordinary reading is never slowed down.
5. Type does the heavy lifting; the wordmark is the hero object.
6. Avoid the generic-default tells: cream + serif + terracotta; near-black + acid accent; identical rounded cards; all-caps eyebrow labels above every heading; monospace data labels everywhere; "→" on every link.
Palette, type scale and spacing: see `03-storyboard.md` §5.

## 5. Information architecture [PROVISIONAL]
Single-page landing narrative plus pages that genuinely warrant their own URL.
```
/                     Landing: Opening → Premise → Work (Pwndbg anatomy → proof; CrawlX; CLI Web Crawler; [AD lab if confirmed]) → Writing → Background → Contact
/work/<slug>/         Optional case studies (Pwndbg, CrawlX, CLI Web Crawler; AD lab/SecureSuite pending)
/resume/              Real HTML resume (searchable, accessible) + original PDF
/resume.pdf           Stable PDF URL
/credentials/         Compact archive of certificates (not in primary nav)
404
```
Primary nav (anchors on landing): **Work · Writing · Background · Contact**. "Writing" is PROVISIONAL; "Research" is only used if original research exists (owner decision OI-1).
Gallery evidence lives inside project case studies only. Certificates are compact, not a destination. No empty writeup pages. No placeholder social links.

## 6. Animation principles [APPROVED unless noted]
- GSAP ScrollTrigger (preferred candidate); native scroll first; Lenis only if a prototype demonstrates a genuine benefit.
- Pinning only where it materially improves the story (max 2 pinned sequences on landing). Never pin every section, never make every section full-screen, never animate every element.
- Catch-up smoothing via ScrollTrigger `scrub` values where appropriate.
- Ordinary content stays readable and navigable; no scroll-jacking, no forced snapping.
- Plain HTML is the final state; motion enhances it (PROVISIONAL, WA-4).
- Separate reduced-motion experience and no-JS/low-capability fallbacks are mandatory, designed not bolted on.
- Animate transform and opacity only in scrubbed sequences.

## 7. Technical direction [PROVISIONAL]
Astro (static output) + GSAP ScrollTrigger, content in typed Markdown/MDX collections, Netlify hosting on a NEW site with isolated previews. No PWA in v1. Badge not embedded or linked by default. See `04-implementation-plan.md`.

## 8. Content rules
Verified evidence only. No invented achievements, skills, credentials, biography or metrics. Unknown identity details are `[PLACEHOLDER: …]` in planning docs and never published. Unsupported claims are omitted until confirmed (`00-source-audit.md` §10).

## 9. Working assumptions (change freely)
- Nav label "Writing" instead of "Research".
- Pwndbg is the lead project (strongest external validation).
- Wordmark text and positioning line are placeholders until OI-2/OI-3.
- Dark scenes use a blueprint/cyanotype blue, not black.
- No portrait photo in v1 unless the owner supplies one (none exists in the repos).
