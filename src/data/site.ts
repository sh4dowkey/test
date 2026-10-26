/**
 * Central content module: every piece of personal information, project copy, article link, experience and
 * contact detail lives here. Components only read from this file.
 *
 * Editing guide
 *  - A plain value is VERIFIED against a public source (see docs/00-source-audit.md section 10).
 *  - An object with a `review` string is provisional: it renders in the local preview, is highlighted when you
 *    open the page with `?review`, and BLOCKS `npm run build:production` until you delete the `review` field.
 *  - Never add a field you cannot source. Withheld items live at the bottom of this file and never render.
 */

export interface Reviewable { review?: string }
const STRICT = process.env.ANANT_STRICT === '1';

/** Spread onto an element: `<li {...flag(item)}>`. Adds data-review in preview, throws in strict builds. */
export function flag(o?: Reviewable): Record<string, string> {
  if (!o?.review) return {};
  if (STRICT) throw new Error(`Unreviewed content in production build: ${o.review}`);
  return { 'data-review': o.review };
}

/* ------------------------------------------------------------------ person */
export const person = {
  name: 'Anant Pandey',
  nameLines: ['Anant', 'Pandey'] as const,
  fullName: 'Anant Kumar Pandey',
  heroLines: ['Building tools.', 'Understanding systems.', 'Exploring security.'] as const,
  tagline: 'Anant Pandey builds security tools, explores how systems work and contributes to open source.',
  headline: 'Building security tools, exploring how systems work, and contributing to open source.',
  description: 'Anant Pandey builds security tools, explores how systems work and contributes to open source.',
  review: 'Display name "Anant Pandey" and the headline wording are provisional (OI-2, OI-3). The résumé uses "Anant Kumar Pandey".',
} satisfies Reviewable & Record<string, unknown>;

export const premise = {
  lead: 'Built in the open.',
  body: 'Every project here links to its public source, so each claim can be checked.',
  review: 'Provisional wording (OI-2).',
};

/* ---------------------------------------------------------------- profiles */
export const profiles = [
  { id: 'github', label: 'GitHub', handle: 'sh4dowkey', url: 'https://github.com/sh4dowkey' },
  { id: 'linkedin', label: 'LinkedIn', handle: 'anant-ku-pandey', url: 'https://www.linkedin.com/in/anant-ku-pandey',
    review: 'URL taken from the legacy site; the résumé prints it without /in/ (F2). Confirm it resolves.' },
  { id: 'medium', label: 'Medium', handle: '@pandeyanant733', url: 'https://medium.com/@pandeyanant733',
    review: 'Handle taken from the legacy article URLs; profile page not fetched (F3).' },
] as const;

export const contact = {
  email: { address: 'anant.pandey017@gmail.com',
    review: 'Published on the legacy site and résumé; confirm you want it public on the new site (OI-21).' },
};

/* ---------------------------------------------------------------- projects */
export const pwndbg = {
  id: 'pwndbg',
  name: 'Pwndbg',
  intro: 'An open-source plug-in for GDB and LLDB used in exploit development and reverse engineering. One command in it, cymbol, manages custom C structures.',
  repoUrl: 'https://github.com/pwndbg/pwndbg',
  contribution: {
    title: 'cymbol, refactored to use subcommands',
    prTitle: 'Refactor cymbol command to use subcommands',
    prLabel: 'pwndbg/pwndbg #3160',
    prUrl: 'https://github.com/pwndbg/pwndbg/pull/3160',
    issueLabel: 'issue #3154',
    issueUrl: 'https://github.com/pwndbg/pwndbg/issues/3154',
    commitLabel: 'commit 7d92563',
    commitUrl: 'https://github.com/pwndbg/pwndbg/commit/7d92563',
    status: 'Merged',
    authorship: 'Co-authored; the commit lists four contributors',
  },
  /** From the patch of commit 7d92563 (pwndbg/commands/cymbol.py): each old option became the subcommand of the same name. */
  mapping: [
    { oldFlag: '-a', oldArg: 'name', sub: 'add', arg: 'name' },
    { oldFlag: '-f', oldArg: 'filepath', sub: 'file', arg: 'path' },
    { oldFlag: '-r', oldArg: 'name', sub: 'remove', arg: 'name' },
    { oldFlag: '-e', oldArg: 'name', sub: 'edit', arg: 'name' },
    { oldFlag: '-l', oldArg: 'name', sub: 'load', arg: 'name' },
    { oldFlag: '-s', oldArg: 'name', sub: 'show', arg: 'name' },
    { oldFlag: '--show-all', oldArg: '', sub: 'show-all', arg: '' },
  ] as { oldFlag: string; oldArg: string; sub: string; arg: string }[],
  /** New order of subcommands in the patched usage line; `file` moved from second to sixth. */
  newOrder: ['add', 'remove', 'edit', 'load', 'show', 'file', 'show-all'] as string[],
  added: 'New with the subcommands: --force on add and file, and --name on file.',
  evidence: [
    { src: '/img/pwndbg-commit.webp', w: 1600, h: 193, alt: 'GitHub commit page for 7d92563, titled Refactor cymbol command to use subcommands (#3160), marked Verified.' },
    { src: '/img/pwndbg-diff.webp', w: 1500, h: 1021, alt: 'Diff of docs/commands/misc/cymbol.md: the usage line changes from flag options to the subcommands add, remove, edit, load, show, file and show-all.' },
  ],
  evidenceCaption: 'Excerpts from the commit page on GitHub; the commit message trailers are omitted.',
};

export const crawlx = {
  id: 'crawlx',
  name: 'CrawlX',
  lede: 'A concurrent web crawler written in Go. Give it a starting URL and a depth; a pool of workers fetches pages, follows links within the same domain and prints a report that sorts errors by kind.',
  repoUrl: 'https://github.com/sh4dowkey/Crawlx',
  facts: [
    { label: 'Language', value: 'Go' },
    { label: 'Concurrency', value: 'Ten workers pulling from a buffered task queue, as set in the source' },
    { label: 'Scope', value: 'Same-domain links up to a chosen depth (default 2)' },
    { label: 'Output', value: 'Per-page status and links in verbose mode, then a crawl report' },
    { label: 'Distribution', value: 'Release binaries for Windows, Linux and macOS, per the README', review: 'Read from the README earlier; re-check the releases page.' },
  ] as { label: string; value: string; review?: string }[],
  evidence: [
    { src: '/img/crawlx-output.webp', w: 1400, h: 589, alt: 'Terminal output of the command crawlx -u https://toscrape.com -v -d 1, listing pages crawled with status codes and discovered links.', caption: 'Output of crawlx -u https://toscrape.com -v -d 1 (excerpt).' },
  ],
  /** Transcribed from the project's own `crawlx -h` screenshot. */
  help: {
    title: 'crawlx -h',
    lines: [
      'CrawlX - A fast, concurrent web crawler built in Go.',
      '',
      'USAGE:',
      '  crawlx -u <STARTING_URL> [OPTIONS]',
      '',
      'OPTIONS:',
      '  -u, --url <string>   The starting URL to crawl (Required)',
      '  -d, --depth <int>    Maximum crawling depth (Default: 2)',
      '  -i, --allow-ip       Allow crawling IP addresses (Default: false)',
      '  -v, --verbose        Show detailed crawl progress (Default: false)',
    ],
  },
};

export const cliCrawler = {
  id: 'cli-crawler',
  name: 'CLI Web Crawler',
  lede: 'A command-line crawler in Python. It follows links from a starting URL to a chosen depth, respects robots.txt, can keep to internal or external links, and checks each page for a keyword. Each result carries the URL, the page title and whether the keyword matched.',
  repoUrl: 'https://github.com/sh4dowkey/CLI-Web-Crawler',
  usage: 'python cli.py <url> [OPTIONS]',
  options: [
    ['<url>', 'Starting URL to crawl (required)'],
    ['--depth', 'Maximum depth to crawl (default 2)'],
    ['--max-pages', 'Maximum number of pages (default 100)'],
    ['--search', 'Keyword to look for in page content'],
    ['--internal-only', 'Follow internal links only'],
    ['--external-only', 'Follow external links only'],
    ['--user-agent', 'Custom User-Agent string'],
    ['--verbose', 'Show each visited page'],
    ['--output', 'Save results to a file'],
  ] as [string, string][],
  optionsNote: 'Taken from the project\u2019s README.',
};

export const adLab = {
  id: 'ad-lab',
  name: 'Active Directory lab',
  status: 'Work in progress',
  lede: 'A home lab for learning Active Directory: a Windows Server 2019 domain controller running AD DS and DNS, and a domain-joined Windows 10 client, on an internal virtual network, documented with setup guides and screenshots.',
  progress: 'The domain controller and client are complete. The README lists the Kali attacker machine, users and OUs, attack chains and detection tooling as still to come.',
  repoUrl: 'https://github.com/sh4dowkey/ad-attack-defense-lab',
  machines: [
    ['DC01', 'Windows Server 2019', 'Domain controller and DNS'],
    ['WIN10-1', 'Windows 10 Pro', 'Domain-joined client'],
    ['Kali', 'Kali Linux', 'Attacker machine (listed as coming soon)'],
  ] as [string, string, string][],
  machinesNote: 'Lab machines, from the project\u2019s README.',
  built: ['DC01 (domain controller)', 'WIN10-1 (domain-joined client)'],
  planned: ['Kali attacker machine', 'Users and OUs', 'Attack chains', 'Detection tooling'],
  review: 'Included as a provisional project (D-13). The README status was read on 2026-10-24; update it as the lab progresses. The legacy diagram image is deliberately not used (see HANDOFF).',
};

/* ---------------------------------------------------------------- articles */
export const writing = {
  intro: 'Short explainers on ethical hacking, web security and command-line tools.',
  review: 'Intro line is my summary of the three titles.',
  articles: [
    { title: 'Hacking 101 \u2014 Crack the Code (Legally!)', topic: 'Ethical hacking', date: 'Feb 22', venue: 'Medium',
      url: 'https://medium.com/@pandeyanant733/hacking-101-crack-the-code-legally-8c357651414f' },
    { title: 'Decoding the OWASP Top 10', topic: 'Web security', date: 'Feb 19', venue: 'Medium',
      url: 'https://medium.com/@pandeyanant733/decoding-the-owasp-top-10-3f2af22570dc' },
    { title: 'cURL for Beginners: Essential Tips and Tricks', topic: 'Command line', date: 'May 28', venue: 'Medium',
      url: 'https://medium.com/@pandeyanant733/curl-for-beginners-essential-tips-and-tricks-eb5098f026da' },
  ].map((a) => ({ ...a, review: 'Year not shown on the legacy site; link not fetched from this sandbox (F3). Topic label is mine.' })),
};

/* ----------------------------------------------------------------- toolkit */
/** `evidence` links to public work on this page. Items without it are listed on the r\u00e9sum\u00e9 only. Never add levels or ratings. */
export const toolkit = {
  heading: 'What I work with',
  lede: 'A working toolkit, not a ranking. Filled markers link to public work on this page; hollow ones come from my r\u00e9sum\u00e9 and have no public project here yet.',
  groups: [
    { title: 'Languages and development', items: [
      { name: 'Python', evidence: { label: 'CLI Web Crawler, Pwndbg', href: '#cli-crawler' } },
      { name: 'Go', evidence: { label: 'CrawlX', href: '#crawlx' } },
      { name: 'Git / GitHub', evidence: { label: 'Pull request merged upstream', href: '#work' } },
      { name: 'Linux', review: 'R\u00e9sum\u00e9 only: no public project here demonstrates it (confirm or link).' },
      { name: 'GDB / Pwndbg', evidence: { label: 'Contribution to Pwndbg', href: '#work' } },
    ] as ToolItem[] },
    { title: 'Security tools', items: [
      { name: 'Burp Suite', review: 'R\u00e9sum\u00e9 only: no public project here demonstrates it (confirm or link).' },
      { name: 'Nmap', review: 'R\u00e9sum\u00e9 only: no public project here demonstrates it (confirm or link).' },
      { name: 'Wireshark', review: 'R\u00e9sum\u00e9 only: no public project here demonstrates it (confirm or link).' },
      { name: 'Nessus / OpenVAS', review: 'R\u00e9sum\u00e9 only: no public project here demonstrates it (confirm or link).' },
    ] as ToolItem[] },
  ],
};
export interface ToolItem { name: string; evidence?: { label: string; href: string }; review?: string }

/* -------------------------------------------------------------- background */
export const background = {
  intro: 'Computer science with a focus on security. The projects above are the clearest record of what I do: small command-line tools, a contribution to a debugger, and a lab for learning Active Directory.',
  introReview: 'Provisional first-person summary of the verified work (OI-2).',
  capabilities: [
    { title: 'Python and Go', text: 'Command-line tools in both languages, and Python inside an existing open-source codebase.',
      links: [{ label: 'CLI Web Crawler', href: '#cli-crawler' }, { label: 'CrawlX', href: '#crawlx' }, { label: 'Pwndbg', href: '#work' }],
      more: { text: 'Also listed on the r\u00e9sum\u00e9: Bash, Java, C, C++, SQL, JavaScript, HTML/CSS.', review: 'R\u00e9sum\u00e9 list; no public project shown here uses them.' } },
    { title: 'Concurrency and the web', text: 'Worker pools and task queues, depth-limited crawling, same-domain rules and robots.txt.',
      links: [{ label: 'CrawlX', href: '#crawlx' }, { label: 'CLI Web Crawler', href: '#cli-crawler' }] },
    { title: 'Inside a debugger', text: 'Changing a command\u2019s interface and documentation in a widely used GDB plug-in, with maintainers reviewing the work.',
      links: [{ label: 'Pwndbg #3160', href: '#work' }] },
    { title: 'Active Directory', text: 'Building a lab with a domain controller and a joined client, as groundwork for attack and detection practice.',
      links: [{ label: 'Active Directory lab', href: '#ad-lab' }] },
    { title: 'Explaining what I learn', text: 'Beginner-friendly articles on ethical hacking, the OWASP Top 10 and cURL.',
      links: [{ label: 'Writing', href: '#writing' }] },
  ],
  tools: { text: 'Burp Suite, Nmap, Wireshark, Metasploit, Nessus / OpenVAS, BloodHound, Impacket, Responder, Netcat, OpenSSL, Gobuster, GDB (Pwndbg).',
    review: 'Listed on the r\u00e9sum\u00e9; none is demonstrated by a public project on this page.' },
  timeline: [
    { when: '2022 \u2013 2026', what: 'B.Tech, Computer Science', where: 'Trident Academy of Technology, Bhubaneswar',
      review: 'Current status unknown (A1): confirm graduation or expected date.' },
    { when: 'Feb \u2013 Apr 2025', what: 'Cyber Security Intern', where: 'Teachnook, remote',
      review: 'R\u00e9sum\u00e9 says Feb\u2013Apr; the legacy badge says Feb\u2013Mar and a different title (B1, B2).' },
    { when: 'Jan \u2013 Feb 2025', what: 'Cyber Security Intern', where: 'AICTE-Edunet Foundation with IBM, remote',
      review: 'Programme name differs between sources (B3). Responsibilities are omitted: the r\u00e9sum\u00e9 repeats the same text for both roles (B4).' },
  ],
  credentials: [
    { name: 'Certified Cybersecurity Technician (C|CT)', issuer: 'EC-Council', review: 'Credential ID and validity not verified with the issuer (G1).' },
    { name: 'Google Cybersecurity Professional Certificate', issuer: 'Google', review: 'Not verified with the issuer (G2).' },
    { name: 'OWASP API Security Top 10 and Beyond', issuer: 'APISec University', review: 'Title differs between sources (G3).' },
  ],
  jobSims: { text: 'Virtual job simulations: Datacom, Deloitte, Mastercard and Tata (Forage).',
    review: 'R\u00e9sum\u00e9 calls them "Virtual Experience/Internship"; wording needs your decision (B6).' },
};

/* ----------------------------------------------------------------- closing */
export const closing = {
  statement: 'The work is public. The conversation can start anywhere.',
  lead: 'If any of it is relevant to what you are building, I would be glad to hear from you.',
  review: 'Provisional wording (OI-2).',
};

/* ---------------------------------------------------------------- withheld */
/** Never rendered. Kept so nothing is lost. */
export const withheld = {
  resumePdf: 'Contains status and contact details not yet approved (A1, F5).',
  gradeTwelve: '12th grade 90%, St. Mary\u2019s HSS, 2021\u201322 (A2: publish at all?).',
  aiGeneratedLabDiagram: 'ad_lab_diagram.png shows typos and an AI watermark and depicts hosts (SIEM01, CA01) absent from the README. Do not use.',
  unverifiedBadgeClaims: 'Cobalt Strike, Ghidra, malware analysis, forensics, NIST CSF, PTES, bug bounty, red teaming (C2-C8, D1-D3).',
  credentialIds: 'C|CT ECC9285371640; Google 69LDJC7T49HZ (G1, G2).',
  secureSuite: 'SecureSuite / StegoHide AES+RSA claim (E6) not demonstrated by the repos.',
};

/* ------------------------------------------------------------------ review */
/** Walks the data and lists every provisional item (printed at build time). */
export function reviewReport(): string[] {
  const out: string[] = [];
  const walk = (v: unknown, path: string) => {
    if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${path}[${i}]`));
    else if (v && typeof v === 'object') {
      const o = v as Record<string, unknown>;
      if (typeof o.review === 'string') out.push(`${path}: ${o.review}`);
      for (const k of Object.keys(o)) if (k !== 'review') walk(o[k], `${path}.${k}`);
    }
  };
  walk({ person, premise, profiles, contact, pwndbg, crawlx, cliCrawler, adLab, toolkit, writing, background, closing }, 'site');
  return out;
}
