/**
 * Central content module. Every piece of personal information, project copy, link, experience entry and contact
 * detail lives here; components only read from this file.
 *
 * Sources (all read from the public repositories or the owner's own résumé PDF):
 *  - sh4dowkey/Crawlx, sh4dowkey/CLI-Web-Crawler, sh4dowkey/ad-attack-defense-lab (READMEs and source)
 *  - pwndbg/pwndbg commit 7d92563 (patch read in full) and PR #3160
 *  - public/resume.pdf (byte-identical to the file on the legacy site)
 *  - the legacy site for profile URLs and article links
 * Never add a claim you cannot source. Anything withheld lives at the bottom and never renders.
 */

/* ------------------------------------------------------------------ person */
export const person = {
  name: 'Anant Pandey',
  fullName: 'Anant Kumar Pandey',
  /** Three concrete things the portfolio contains. `href` is the section that proves each one. */
  heroLines: [
    { text: 'Python & Go tools.', href: '#crawlx' },
    { text: 'Security labs.', href: '#lab' },
    { text: 'Open-source work.', href: '#pwndbg' },
  ],
  intro: 'Two command-line crawlers, an Active Directory lab that is still being built, and a merged change to Pwndbg. Each one links to its public source.',
  description: 'Anant Pandey: Python and Go security tools, an Active Directory lab and a merged contribution to Pwndbg.',
};

/* ---------------------------------------------------------------- profiles */
export const profiles = {
  email: { label: 'Email', handle: 'anant.pandey017@gmail.com', url: 'mailto:anant.pandey017@gmail.com', note: 'Quickest way to reach me' },
  github: { label: 'GitHub', handle: 'sh4dowkey', url: 'https://github.com/sh4dowkey', note: 'Source for every project here' },
  linkedin: { label: 'LinkedIn', handle: 'anant-ku-pandey', url: 'https://www.linkedin.com/in/anant-ku-pandey', note: 'Background and credentials' },
  medium: { label: 'Medium', handle: '@pandeyanant733', url: 'https://medium.com/@pandeyanant733', note: 'Short security explainers' },
};

/* ---------------------------------------------------------------- projects */
/** Used by the opening index, the toolkit relationships and the résumé links. Order = order on the page. */
export const index = [
  { id: 'crawlx', n: '01', name: 'CrawlX', kind: 'Tool', meta: 'Go · concurrent web crawler', href: '#crawlx' },
  { id: 'cli-crawler', n: '02', name: 'CLI Web Crawler', kind: 'Tool', meta: 'Python · robots.txt-aware', href: '#cli-crawler' },
  { id: 'ad-lab', n: '03', name: 'Active Directory lab', kind: 'Lab', meta: 'Windows Server 2019 · in progress', href: '#lab' },
  { id: 'pwndbg', n: '04', name: 'Pwndbg #3160', kind: 'Open source', meta: 'cymbol subcommands · merged', href: '#pwndbg' },
];

export const work = {
  heading: 'Selected work',
  lede: 'Four public repositories. Where something is unfinished, it says so.',
};

export const crawlx = {
  id: 'crawlx',
  name: 'CrawlX',
  kicker: 'Go · command-line tool',
  lede: 'A concurrent web crawler. Give it a starting URL and a depth; a pool of workers fetches pages, follows links on the same domain, and prints a report that groups errors by kind.',
  repoUrl: 'https://github.com/sh4dowkey/Crawlx',
  /** From internal/crawl/crawler.go: NumWorkers = 10, buffered `tasks` and `results` channels. */
  pipeline: { workers: 10, steps: ['Task queue', 'Ten workers', 'Report'] },
  facts: [
    ['Concurrency', 'Ten workers reading from a buffered task channel'],
    ['Scope', 'Same-domain links up to a chosen depth (default 2)'],
    ['Output', 'Per-page status and links with -v, then a crawl report'],
    ['Builds', 'Release binaries for Windows, Linux and macOS (per the README)'],
  ] as [string, string][],
  shots: [
    { src: '/img/crawlx-output.webp', w: 1400, h: 589, alt: 'Terminal output of crawlx -u https://toscrape.com -v -d 1: each page crawled with its status code, response time and the links found.', caption: 'crawlx -u https://toscrape.com -v -d 1' },
    { src: '/img/crawlx-help.webp', w: 1100, h: 664, alt: 'Output of crawlx -h: usage, the options -u, -d, -i and -v with their defaults, and three examples.', caption: 'crawlx -h' },
  ],
};

export const cliCrawler = {
  id: 'cli-crawler',
  name: 'CLI Web Crawler',
  kicker: 'Python · command-line tool',
  lede: 'Follows links from a starting URL to a chosen depth, respects robots.txt, can stay on internal or external links, and checks each page for a keyword. Every result carries the URL, the page title and whether the keyword matched.',
  repoUrl: 'https://github.com/sh4dowkey/CLI-Web-Crawler',
  usage: ['python', 'cli.py', '<url>', '[OPTIONS]'],
  options: [
    ['--depth', 'Maximum depth to crawl (default 2)'],
    ['--max-pages', 'Maximum number of pages (default 100)'],
    ['--search', 'Keyword to look for in page content'],
    ['--internal-only', 'Follow internal links only'],
    ['--external-only', 'Follow external links only'],
    ['--user-agent', 'Custom User-Agent string'],
    ['--verbose', 'Show each visited page'],
    ['--output', 'Save results to a file'],
  ] as [string, string][],
  note: 'Usage and options as listed in the project README.',
};

/** Source of truth: the lab README's machine table and status table. Nothing here is added beyond them. */
export const adLab = {
  id: 'lab',
  name: 'Active Directory lab',
  status: 'In progress',
  lede: 'A home lab for learning Active Directory: a Windows Server 2019 domain controller running AD DS and DNS, and a domain-joined Windows 10 client on an internal network, documented with setup guides and screenshots.',
  repoUrl: 'https://github.com/sh4dowkey/ad-attack-defense-lab',
  network: 'ADLabNet (internal)',
  machines: [
    { id: 'dc01', host: 'DC01', os: 'Windows Server 2019', role: 'Domain controller · AD DS · DNS', ip: '192.168.10.10', state: 'built' },
    { id: 'win10', host: 'WIN10-1', os: 'Windows 10 Pro', role: 'Domain-joined client', ip: '192.168.10.11', state: 'built' },
    { id: 'kali', host: 'Kali', os: 'Kali Linux', role: 'Attacker machine', ip: '192.168.10.100', state: 'planned' },
  ],
  /** README "Project Status" table. */
  status_table: [
    { name: 'DC01', state: 'built', note: 'Domain set up and verified' },
    { name: 'WIN10-1', state: 'built', note: 'Joined to the domain' },
    { name: 'Kali', state: 'planned', note: 'Listed as coming soon' },
    { name: 'Users and OUs', state: 'planned', note: 'Pending' },
    { name: 'Attack chains', state: 'planned', note: 'Planned' },
    { name: 'Detection', state: 'planned', note: 'Planned' },
  ] as { name: string; state: 'built' | 'planned'; note: string }[],
  note: 'Machines and status from the lab README. Dashed means planned.',
};

export const pwndbg = {
  id: 'pwndbg',
  name: 'Pwndbg',
  kicker: 'Open-source contribution · Python',
  title: 'cymbol now uses subcommands',
  intro: 'Pwndbg is an open-source plug-in for GDB used in exploit development and reverse engineering. Its cymbol command manages custom C structures. The pull request below replaced cymbol’s option flags with subcommands.',
  repoUrl: 'https://github.com/pwndbg/pwndbg',
  pr: { label: 'pwndbg/pwndbg #3160', url: 'https://github.com/pwndbg/pwndbg/pull/3160', title: 'Refactor cymbol command to use subcommands' },
  issue: { label: 'issue #3154', url: 'https://github.com/pwndbg/pwndbg/issues/3154' },
  commit: { label: 'commit 7d92563', url: 'https://github.com/pwndbg/pwndbg/commit/7d92563' },
  meta: [
    ['Status', 'Merged, July 2025'],
    ['Changed', 'cymbol.py, its generated docs page and the command index'],
    ['Authorship', 'Co-authored; the commit lists several contributors'],
  ] as [string, string][],
  /** From the patch of commit 7d92563 (pwndbg/commands/cymbol.py): each old option became the subcommand of the same name. */
  mapping: [
    { oldFlag: '-a', oldArg: 'name', sub: 'add', arg: 'name' },
    { oldFlag: '-r', oldArg: 'name', sub: 'remove', arg: 'name' },
    { oldFlag: '-e', oldArg: 'name', sub: 'edit', arg: 'name' },
    { oldFlag: '-l', oldArg: 'name', sub: 'load', arg: 'name' },
    { oldFlag: '-s', oldArg: 'name', sub: 'show', arg: 'name' },
    { oldFlag: '-f', oldArg: 'filepath', sub: 'file', arg: 'path' },
    { oldFlag: '--show-all', oldArg: '', sub: 'show-all', arg: '' },
  ] as { oldFlag: string; oldArg: string; sub: string; arg: string }[],
  usageBefore: 'cymbol [-a name] [-f filepath] [-r name] [-e name] [-l name] [-s name] [--show-all]',
  usageAfter: 'cymbol {add,remove,edit,load,show,file,show-all} ...',
  added: 'The same change added --force on add and file, and --name on file.',
  evidence: { src: '/img/pwndbg-diff.webp', w: 1500, h: 1021, alt: 'Diff of docs/commands/misc/cymbol.md: the usage line changes from flag options to the subcommands add, remove, edit, load, show, file and show-all.', caption: 'Diff of the cymbol docs page, from the commit.' },
};

/* ----------------------------------------------------------------- toolkit */
export interface Tool { name: string; projects?: string[] }
export const toolkit = {
  heading: 'Toolkit',
  lede: 'Grouped by what each tool is for. Choose a project to see what it used, or a tool to see where it appears.',
  groups: [
    { id: 'dev', title: 'Languages and development', items: [
      { name: 'Python', projects: ['cli-crawler', 'pwndbg'] },
      { name: 'Go', projects: ['crawlx'] },
      { name: 'Git and GitHub', projects: ['pwndbg'] },
    ] },
    { id: 'sys', title: 'Systems and debugging', items: [
      { name: 'Linux' },
      { name: 'GDB and Pwndbg', projects: ['pwndbg'] },
      { name: 'Windows Server, AD DS and DNS', projects: ['ad-lab'] },
      { name: 'PowerShell', projects: ['ad-lab'] },
    ] },
    { id: 'sec', title: 'Security tooling', items: [
      { name: 'Burp Suite' },
      { name: 'Nmap' },
      { name: 'Wireshark' },
      { name: 'Metasploit' },
      { name: 'Nessus / OpenVAS' },
      { name: 'Gobuster' },
    ] },
  ] as { id: string; title: string; items: Tool[] }[],
};

/* ----------------------------------------------------------------- writing */
export const writing = {
  heading: 'Writing',
  lede: 'Beginner-level explainers on Medium.',
  articles: [
    { title: 'Hacking 101 — Crack the Code (Legally!)', date: '22 Feb 2025', topic: 'Ethical hacking', url: 'https://medium.com/@pandeyanant733/hacking-101-crack-the-code-legally-8c357651414f' },
    { title: 'Decoding the OWASP Top 10', date: '19 Feb 2025', topic: 'Web security', url: 'https://medium.com/@pandeyanant733/decoding-the-owasp-top-10-3f2af22570dc' },
    { title: 'cURL for Beginners: Essential Tips and Tricks', date: '28 May 2025', topic: 'Command line', url: 'https://medium.com/@pandeyanant733/curl-for-beginners-essential-tips-and-tricks-eb5098f026da' },
  ],
};

/* ------------------------------------------------------------------ résumé */
export const resume = {
  heading: 'Experience and background',
  pdf: { href: '/resume.pdf', label: 'Download résumé', meta: 'PDF · 385 KB', filename: 'Anant-Pandey-Resume.pdf' },
  facts: [
    ['Based in', 'Bhubaneswar, Odisha, India'],
    ['Degree', 'B.Tech, Computer Science, 2022 – 2026'],
  ] as [string, string][],
  /** Newest first. */
  timeline: [
    { when: 'Jul 2025', title: 'Pwndbg contribution merged', org: 'pwndbg/pwndbg · open source',
      text: 'Refactored the cymbol command to use subcommands, with its documentation.',
      link: { label: 'Pull request #3160', href: 'https://github.com/pwndbg/pwndbg/pull/3160' } },
    { when: '2025', title: 'Cyber security internships', org: 'Remote, India',
      roles: [
        { when: 'Feb – Apr 2025', role: 'Cyber Security Intern', org: 'Teachnook' },
        { when: 'Jan – Feb 2025', role: 'Cyber Security Intern', org: 'AICTE-Edunet Foundation, with IBM' },
      ],
      text: 'Reconnaissance, vulnerability assessment and exploitation validation on web and network targets; recursive crawling and parameter harvesting with a custom Python CLI tool; written findings with remediation recommendations.',
      textNote: 'Responsibilities as written on the résumé, which gives the same text for both roles.' },
    { when: '2022 – 2026', title: 'B.Tech, Computer Science', org: 'Trident Academy of Technology, Bhubaneswar' },
  ] as {
    when: string; title: string; org: string; text?: string; textNote?: string;
    link?: { label: string; href: string };
    roles?: { when: string; role: string; org: string }[];
  }[],
  credentials: [
    { name: 'Certified Cybersecurity Technician (C|CT)', issuer: 'EC-Council' },
    { name: 'Google Cybersecurity Professional Certificate', issuer: 'Google' },
    { name: 'OWASP API Security Top 10 and Beyond', issuer: 'APISec University' },
    { name: 'Cybersecurity virtual job simulations', issuer: 'Datacom, Deloitte, Mastercard, Tata' },
  ],
};

/* ----------------------------------------------------------------- closing */
export const closing = {
  heading: 'Get in touch',
  lead: 'Questions about a project, a pull request or an article are welcome. Email is the quickest way to reach me.',
  channels: ['email', 'github', 'linkedin', 'medium'] as const,
};

/* ---------------------------------------------------------------- withheld */
/** Never rendered. Kept so nothing is lost. */
export const withheld = {
  gradeTwelve: '12th grade 90%, St. Mary’s HSS, 2021–22 (on the résumé; not shown on the page).',
  credentialIds: 'C|CT and Google certificate credential IDs (on the résumé).',
  unverifiedSkills: 'Cobalt Strike, Ghidra, malware analysis, forensics, NIST CSF, PTES, bug bounty, red teaming, and the résumé’s long skills list (BloodHound, Impacket, Responder, Kerberoasting…): not demonstrated by any public project.',
  secureSuite: '“Secure Suite / StegoHide AES+RSA” (résumé): no public repository found.',
  aiLabDiagram: 'Legacy ad_lab_diagram.png: typos, AI watermark, hosts absent from the README.',
};
