/**
 * Single source for every published fact. Anything not 'verified' must never render in a production build.
 * See docs/00-source-audit.md section 10 for the truth table; docs/02-decisions-and-owner-inputs.md for open items.
 */
export type Status = 'verified' | 'pending';
export interface Fact<T = string> { value: T; status: Status; source: string }

export function published<T>(f: Fact<T>): T {
  if (f.status !== 'verified' && import.meta.env.PROD) {
    throw new Error(`Refusing to publish unverified fact (${f.source})`);
  }
  return f.value;
}
const v = <T,>(value: T, source: string): Fact<T> => ({ value, status: 'verified', source });
const p = <T,>(value: T, source: string): Fact<T> => ({ value, status: 'pending', source });

export const links = {
  github: v('https://github.com/sh4dowkey', 'GitHub profile exists (fetched 2026-10-24)'),
  pwndbgPr: v('https://github.com/pwndbg/pwndbg/pull/3160', 'PR #3160 by sh4dowkey (fetched 2026-10-24)'),
  pwndbgCommit: v('https://github.com/pwndbg/pwndbg/commit/7d92563', 'Commit page (fetched 2026-10-24)'),
  pwndbgIssue: v('https://github.com/pwndbg/pwndbg/issues/3154', 'Referenced by the PR description as the issue addressed'),
  pwndbgRepo: v('https://github.com/pwndbg/pwndbg', 'Upstream project'),
  crawlx: v('https://github.com/sh4dowkey/Crawlx', 'Repo exists, "A Golang based Web Crawler"'),
  cliCrawler: v('https://github.com/sh4dowkey/CLI-Web-Crawler', 'Repo exists, Python CLI crawler'),
};

export const posts = [
  { title: 'Hacking 101 \u2014 Crack the Code (Legally!)', url: v('https://medium.com/@pandeyanant733/hacking-101-crack-the-code-legally-8c357651414f', 'Legacy blog.html; URL not fetched (network)') },
  { title: 'Decoding the OWASP Top 10', url: v('https://medium.com/@pandeyanant733/decoding-the-owasp-top-10-3f2af22570dc', 'Legacy blog.html; URL not fetched (network)') },
  { title: 'cURL for Beginners: Essential Tips and Tricks', url: v('https://medium.com/@pandeyanant733/curl-for-beginners-essential-tips-and-tricks-eb5098f026da', 'Legacy blog.html; URL not fetched (network)') },
];

/** Provisional copy. Recorded in docs/02-decisions-and-owner-inputs.md (PC-1..PC-3) for owner review. */
export const copy = {
  heroLine: p('Security tools and open-source contributions.', 'PROVISIONAL: derived only from verified repos (OI-2)'),
  premiseA: p('Built in the open.', 'PROVISIONAL (OI-2)'),
  premiseB: p('Every project here links to its public source, so each claim can be checked.', 'PROVISIONAL (OI-2)'),
};
// Provisional copy is allowed to render (it is derived from verified facts) but is tracked explicitly:
export const provisionalCopy = { heroLine: copy.heroLine.value, premiseA: copy.premiseA.value, premiseB: copy.premiseB.value };

/** NOT published. Kept here so nothing is lost; none of these may be rendered until confirmed. */
export const withheld = {
  email: p('anant.pandey017@gmail.com', 'OI-21: publication not approved'),
  linkedin: p('https://www.linkedin.com/in/anant-ku-pandey', 'F2: URL unconfirmed (resume omits /in/)'),
  mediumProfile: p('https://medium.com/@pandeyanant733', 'F3: handle unconfirmed'),
  education: p('B.Tech CS, Trident Academy of Technology, 2022-2026', 'A1: current status unconfirmed'),
  experience: p('Teachnook; AICTE-Edunet/IBM', 'B1-B5: titles/dates conflict'),
  credentials: p('C|CT; Google Cybersecurity; APISec', 'G1-G5: titles/IDs unverified'),
};
