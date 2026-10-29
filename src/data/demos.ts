/**
 * Deterministic fixtures for the two crawler demonstrations. NOTHING here is real network activity: the sites are
 * fictional (".test" is reserved and never resolves) and every status code, timing and title is hand-written.
 * The demos run the same decision logic as the real programs (read from the repositories) over this data in the browser.
 */

/* ------------------------------------------------------------------ CrawlX (Go) */
export interface CxPage {
  path: string;
  title: string;
  status: number;           // 0 = every attempt fails with a network error
  ms: number;               // response time of one attempt
  links: string[];          // raw hrefs in the page, absolute or relative, as ResolveLinks would receive them
  x: number; y: number;     // layout in the 640 x 400 graph
}
export const crawlxFixture = {
  command: (d: number) => `crawlx -u https://sample.test -v -d ${d}`,
  host: 'sample.test',
  start: '/',
  /** Constants copied from internal/crawl/crawler.go. */
  config: { workers: 10, taskBuffer: 100, maxRetries: 3, retryDelayMs: 1000, requestDelayMs: 100, clientTimeoutS: 20, defaultDepth: 2 },
  pages: [
    { path: '/', title: 'Sample Shop', status: 200, ms: 120, x: 70, y: 200, links: ['/about', '/catalog', '/blog', '/contact', '/status', 'https://partner.test/'] },
    { path: '/about', title: 'About', status: 200, ms: 90, x: 190, y: 62, links: ['/', '/team', '/careers'] },
    { path: '/catalog', title: 'Catalog', status: 200, ms: 210, x: 190, y: 150, links: ['/catalog/tools', '/catalog/archive', '/about'] },
    { path: '/blog', title: 'Blog', status: 200, ms: 160, x: 190, y: 250, links: ['/blog/post-1', '/blog/post-2', '/blog/old-post', 'http://[bad-host/feed', 'https://social.test/sample'] },
    { path: '/contact', title: 'Contact', status: 200, ms: 70, x: 190, y: 330, links: ['/', '/contact/form'] },
    { path: '/status', title: '', status: 0, ms: 40, x: 100, y: 352, links: [] },
    { path: '/team', title: 'Team', status: 200, ms: 110, x: 340, y: 40, links: ['/about', '/team/lead'] },
    { path: '/careers', title: '', status: 404, ms: 60, x: 340, y: 92, links: [] },
    { path: '/catalog/tools', title: 'Tools', status: 200, ms: 240, x: 340, y: 140, links: ['/catalog', '/catalog/tools/scanner'] },
    { path: '/catalog/archive', title: '', status: 500, ms: 380, x: 340, y: 192, links: [] },
    { path: '/blog/post-1', title: 'Post one', status: 200, ms: 130, x: 340, y: 240, links: ['/blog', '/blog/post-1/notes'] },
    { path: '/blog/post-2', title: 'Post two', status: 200, ms: 150, x: 340, y: 286, links: ['/blog'] },
    { path: '/blog/old-post', title: '', status: 404, ms: 55, x: 340, y: 332, links: [] },
    { path: '/contact/form', title: '', status: 301, ms: 45, x: 340, y: 372, links: [] },
    { path: '/team/lead', title: 'Team lead', status: 200, ms: 100, x: 500, y: 40, links: ['/team'] },
    { path: '/catalog/tools/scanner', title: 'Scanner', status: 200, ms: 180, x: 500, y: 140, links: ['/catalog/tools'] },
    { path: '/blog/post-1/notes', title: 'Notes', status: 200, ms: 95, x: 500, y: 240, links: ['/blog/post-1'] },
  ] as CxPage[],
  externals: [
    { url: 'https://partner.test/', x: 120, y: 120 },
    { url: 'https://social.test/sample', x: 290, y: 285 },
  ],
  malformed: ['http://[bad-host/feed'],
};

/* ---------------------------------------------------------------- CLI Web Crawler (Python) */
export interface CliPage {
  url: string;
  title: string;
  fail?: boolean;           // requests raises: fetch() prints [ERROR] and returns (None, None)
  text: string;             // page text searched by --search (case-insensitive substring)
  links: string[];          // absolute URLs left after extract_links (fragments and javascript: already dropped)
}
export const cliFixture = {
  start: 'https://notes.sample.test/',
  /** robots.txt for each fixture host (User-agent: *). */
  robots: {
    'notes.sample.test': ['/admin/', '/private/'],
    'partner.test': [],
  } as Record<string, string[]>,
  defaults: { depth: 2, maxPages: 100 },
  keywords: ['backup', 'login'],
  pages: [
    { url: 'https://notes.sample.test/', title: 'Notes home', text: 'Welcome. Read the guides, or see the login page for members.', links: ['https://notes.sample.test/guides', 'https://notes.sample.test/login', 'https://notes.sample.test/admin/panel', 'https://partner.test/'] },
    { url: 'https://notes.sample.test/guides', title: 'Guides', text: 'Guides index. Backup strategy, restore drills and checklists.', links: ['https://notes.sample.test/guides/backup', 'https://notes.sample.test/guides/restore', 'https://notes.sample.test/guides/restore/old', 'https://notes.sample.test/'] },
    { url: 'https://notes.sample.test/login', title: 'Member login', text: 'Sign in to continue. Forgot your password?', links: ['https://notes.sample.test/', 'https://notes.sample.test/private/area'] },
    { url: 'https://notes.sample.test/admin/panel', title: 'Admin panel', text: 'admin', links: [] },
    { url: 'https://notes.sample.test/guides/backup', title: 'Backup guide', text: 'A backup is only useful once a restore has been tested.', links: ['https://notes.sample.test/guides', 'https://notes.sample.test/guides/backup/schedule'] },
    { url: 'https://notes.sample.test/guides/restore', title: 'Restore drills', text: 'Restore drills: pick a backup and rebuild a server.', links: ['https://notes.sample.test/guides', 'https://notes.sample.test/guides/restore/old'] },
    { url: 'https://notes.sample.test/guides/backup/schedule', title: 'Backup schedule', text: 'Nightly backup at 02:00; weekly full backup.', links: ['https://notes.sample.test/guides/backup'] },
    { url: 'https://notes.sample.test/guides/restore/old', title: '', fail: true, text: '', links: [] },
    { url: 'https://notes.sample.test/private/area', title: 'Private', text: 'private', links: [] },
    { url: 'https://partner.test/', title: 'Partner site', text: 'Partner docs. Login with a partner account.', links: ['https://partner.test/docs', 'https://notes.sample.test/'] },
    { url: 'https://partner.test/docs', title: 'Partner docs', text: 'API reference and backup notes for partners.', links: ['https://partner.test/'] },
  ] as CliPage[],
};
