# CLAUDE.md — Standing project instructions

Project: **anantsec-redesign** — a new cybersecurity portfolio built from scratch.
Start every session by reading this file and `docs/HANDOFF.md`, then only the supporting docs the task needs.

## 1. Greenfield rule
- Work only inside `anantsec-redesign/`. It is outside and independent of the legacy repos.
- Legacy repos (`sh4dowkey/anantsec`, `sh4dowkey/portfolio_badge`) are READ-ONLY references for verified facts and approved assets. Never modify them, branch from them, copy their CSS/components, or touch the live site.
- If the workspace cannot support a separate directory, say so; never silently use the legacy directory.
- Never replace the production site without explicit owner approval.

## 2. Direction (details in `docs/01-design-brief.md`)
Cinematic, editorial, experimental-minimal single-page portfolio plus optional case-study pages. Deliberate light (Paper) and dark (Blueprint) scenes, no theme toggle in v1. Subtle everyday motion plus at most two major scroll sequences. Timeless, premium, restrained. No neon hacker look, terminal hero, floating code, decorative glass, template cards, or generic-AI tells (cream+serif+terracotta, near-black+acid accent, identical rounded cards, all-caps eyebrows, monospace labels, "→" on every link).

## 3. Technical constraints
- Astro (static) + GSAP ScrollTrigger preferred (PROVISIONAL, confirm in Phase 2). Native scroll first; Lenis only if a prototype shows a genuine benefit.
- Pin only where it materially improves the story (max 2 on landing). No scroll-jacking, no snapping, no animating everything.
- Animate transform/opacity only in scrubbed sequences. Plain HTML is the baseline; motion enhances it.
- Mandatory: reduced-motion variant, no-JS/low-capability fallback, keyboard access, visible focus, mobile variants.
- No PWA/service worker in v1. No third-party CDNs; self-host fonts and scripts. CSP without `unsafe-eval`; one source for headers.
- Hosting: new Netlify site with isolated previews; previews `noindex` until cutover.
- Badge is not embedded or linked by default.

## 4. Content-accuracy rules
- Publish only facts marked VERIFIED in `docs/00-source-audit.md` §10 or confirmed by the owner in `docs/02-decisions-and-owner-inputs.md`.
- Never invent achievements, skills, credentials, biography, experience or metrics. Do not choose silently between conflicting claims; mark NEEDS OWNER CONFIRMATION.
- Omit unsupported claims (e.g., bug bounty, red teaming, Cobalt Strike, Ghidra, malware analysis, forensics, NIST CSF, PTES) until confirmed.
- Personal info and copy live only in `src/data/site.ts`; anything unconfirmed carries a `review` flag (`?review` highlights it; `npm run build:production` blocks it).
- Placeholders live only in planning docs as `[BRACKETED]` tokens and are never published (build must fail if pending content renders).
- Illustrations are labelled as illustrations; evidence is real and sourced; check screenshots for personal/third-party data before use.
- Do not reuse badge art, Kali/HTB/Anonymous artwork, or assets of unknown origin.

## 5. Workflow
1. Read `CLAUDE.md` and `docs/HANDOFF.md`.
2. Do the next action in HANDOFF. Detailed output goes in files, not chat.
3. Record decisions and questions in `docs/02-decisions-and-owner-inputs.md` (APPROVED / PROVISIONAL / NEEDS OWNER CONFIRMATION). Do not re-ask recorded questions in chat.
4. Do not install dependencies, commit, or deploy unless the current phase allows it and the owner has approved.
5. Phase order: storyboard → static foundation → hero prototype → remaining sections → animation refinement → hardening/cutover (`docs/04-implementation-plan.md`). Stop at each gate for owner review.
6. Update `docs/HANDOFF.md` before ending every session.

## 6. Validation expectations
Per phase: HTML validity, axe/Lighthouse, keyboard pass, reduced-motion pass, no-JS pass, mobile check, redirect tests before cutover. Pinned sequences need the acceptance checklist (`docs/03-storyboard.md` §10). Verify claims against the truth table before publishing.

## 7. Keeping chat short
- Visible replies under 200 words: files created/updated, main decisions, genuine blockers, exact next action.
- No pasting of audits, storyboards, tables or plans into chat. No narrating file operations.
- If context is near its limit: finish the current documentation checkpoint, update `docs/HANDOFF.md`, tell the owner to start a fresh chat and re-supply this folder.

## 8. File map
`docs/00-source-audit.md` full audit + truth table + URL map · `01-design-brief.md` direction/IA · `02-decisions-and-owner-inputs.md` register + questions · `03-storyboard.md` concepts, scenes, motion spec, checklists · `04-implementation-plan.md` technical plan · `HANDOFF.md` continuation.
