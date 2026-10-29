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
  eyebrow: 'Anant Pandey · DevOps at Bobcares',
  headline: ['Infrastructure,', 'automation', 'and security.'],
  intro: 'I work in DevOps at Bobcares, where my team supports client servers and infrastructure. Outside work I build Python and Go tools, an Active Directory lab and open-source changes, each linked to public source.',
  location: 'Jharsuguda, Odisha, India',
  description: 'Anant Pandey: DevOps at Bobcares, with Python and Go tools, an Active Directory purple-team lab design and a merged Pwndbg contribution.',
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
  { id: 'ad-lab', n: '03', name: 'Project Cerberus', kind: 'Lab', meta: 'Active Directory purple team · simulation', href: '#lab' },
  { id: 'pwndbg', n: '04', name: 'Pwndbg #3160', kind: 'Open source', meta: 'cymbol subcommands · merged', href: '#pwndbg' },
];

export const work = {
  heading: 'Selected work',
  lede: 'Public repositories and one upstream contribution. Where something is unfinished or simulated, it says so.',
};

export const crawlx = {
  id: 'crawlx',
  name: 'CrawlX',
  kicker: 'Go · command-line tool',
  lede: 'A concurrent web crawler. Give it a starting URL and a depth; a pool of workers fetches pages, follows links on the same domain, and prints a report that groups errors by kind.',
  repoUrl: 'https://github.com/sh4dowkey/Crawlx',
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
  name: 'Project Cerberus',
  status: 'Design and simulation',
  lede: 'An Active Directory purple-team lab: a six-machine design with Sysmon telemetry, Winlogbeat forwarding, a SIEM, an AD CS honeypot and Sigma detections. In the public repository only DC01 and WIN10-1 are built. The interactive below is a local simulation of the design, not live telemetry.',
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
/** Only technologies backed by the job description or by a verified repository. No ratings. `evidence` ids match
 *  `index` ids, plus 'work' for the Bobcares role. Add a tool here once its use is confirmed. */
export interface Tool { name: string; note: string; evidence: string[] }
export const toolkit = {
  heading: 'Toolkit',
  lede: 'Only what the work or a public repository shows. Point at a tool to see where it appears.',
  evidenceTargets: [
    { id: 'work', n: '00', name: 'Bobcares DevOps', href: '#resume' },
  ],
  groups: [
    { id: 'ops', title: 'Operations', items: [
      { name: 'Linux servers', note: 'Day-to-day server checks', evidence: ['work'] },
      { name: 'Windows Server', note: 'Work environments; lab domain controller', evidence: ['work', 'ad-lab'] },
      { name: 'AD DS and DNS', note: 'DC01 in the lab', evidence: ['ad-lab'] },
      { name: 'PowerShell', note: 'Forest setup and verification in the lab', evidence: ['ad-lab'] },
    ] },
    { id: 'dev', title: 'Development', items: [
      { name: 'Python', note: 'CLI crawler; Pwndbg patch', evidence: ['cli-crawler', 'pwndbg'] },
      { name: 'Go', note: 'CrawlX', evidence: ['crawlx'] },
      { name: 'Git and GitHub', note: 'Public repositories; upstream pull request', evidence: ['crawlx', 'cli-crawler', 'ad-lab', 'pwndbg'] },
      { name: 'GDB and Pwndbg', note: 'Merged cymbol refactor', evidence: ['pwndbg'] },
    ] },
    { id: 'lab', title: 'Lab environment', items: [
      { name: 'VirtualBox / VMware', note: 'Named in the lab README', evidence: ['ad-lab'] },
    ] },
  ] as { id: string; title: string; items: Tool[] }[],
};

/* ----------------------------------------------------------------- writing */
export const writing = {
  heading: 'Writing',
  lede: 'Beginner-level explainers on Medium.',
  articles: [
    { title: 'cURL for Beginners: Essential Tips and Tricks', date: '28 May 2025', topic: 'Command line', url: 'https://medium.com/@pandeyanant733/curl-for-beginners-essential-tips-and-tricks-eb5098f026da' },
    { title: 'Hacking 101 — Crack the Code (Legally!)', date: '22 Feb 2025', topic: 'Ethical hacking', url: 'https://medium.com/@pandeyanant733/hacking-101-crack-the-code-legally-8c357651414f' },
    { title: 'Decoding the OWASP Top 10', date: '19 Feb 2025', topic: 'Web security', url: 'https://medium.com/@pandeyanant733/decoding-the-owasp-top-10-3f2af22570dc' },
  ],
};

/* ------------------------------------------------------------------ résumé */
export const resume = {
  heading: 'Experience and background',
  pdf: { href: '/resume.pdf', label: 'Download résumé', meta: 'PDF · 385 KB', filename: 'Anant-Pandey-Resume.pdf', note: 'The original résumé file, unchanged. It predates the current role and still lists Bhubaneswar.' },
  facts: [
    ['Based in', 'Jharsuguda, Odisha, India'],
    ['Employer', 'Bobcares (Poornam Info Vision Pvt. Ltd.)'],
    ['Degree', 'B.Tech, Computer Science, 2022 – 2026'],
  ] as [string, string][],
  /** Newest first. */
  timeline: [
    { when: 'June 2026 – present', title: 'DevOps', org: 'Bobcares · Poornam Info Vision Pvt. Ltd. · Jharsuguda',
      text: 'Part of a team that supports different clients across L1, L2 and L3 support tiers. My work includes checking Linux servers, working in Linux and Windows server environments, and supporting infrastructure operations.',
      textNote: 'A team-level description. It does not claim that I personally handle every tier.',
      review: 'Confirm the exact job title and start date (only “June 2026” was given) before the strict build is cleared.' },
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
    { when: '2022 – 2026', title: 'B.Tech, Computer Science', org: 'Trident Academy of Technology, Bhubaneswar', review: 'Graduation status shown exactly as on the résumé (2022 – 2026); confirm.' },
  ] as {
    when: string; title: string; org: string; text?: string; textNote?: string;
    link?: { label: string; href: string }; review?: string;
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
