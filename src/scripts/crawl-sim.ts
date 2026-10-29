/**
 * Crawl simulation engine shared by the opening scene and the CrawlX demonstration. It replays the decision logic of
 * internal/crawl/crawler.go over a fictional, deterministic site (src/data/demos.ts): a dispatcher owns the `visited`
 * map, a FIFO buffer feeds 10 workers, a link is followed only when it is on the start host, unseen and the task still
 * has depth left, failed attempts are retried (3 attempts, 1 s * (n+1) back-off) and everything lands in a report.
 * It never touches the network and is not the Go program.
 */
import { crawlxFixture as fx, type CxPage } from '../data/demos';
import { esc } from './loop';

export const ORIGIN = 'https://' + fx.host;
export const C = fx.config;
export const pageBy = new Map<string, CxPage>(fx.pages.map((p) => [p.path, p]));
export const STATUS_TEXT: Record<number, string> = { 200: 'OK', 301: 'Moved Permanently', 404: 'Not Found', 500: 'Internal Server Error' };
export const code = (s: number) => `${s} ${STATUS_TEXT[s] ?? 'Unknown Status'}`;
export type Kind = 'new' | 'dup' | 'external';
export interface Ev { t: number; k: 'enqueue' | 'start' | 'retry' | 'done' | 'found' | 'malformed' | 'report'; url: string; w?: number; parent?: string; depth?: number; kind?: Kind; status?: number; ms?: number; n?: number; attempt?: number }

export const isMalformed = (h: string) => /^https?:\/\/\[/.test(h) && !h.includes(']');
export const toPath = (h: string) => (h.startsWith('/') ? h : null);

/* ------------------------------------------------------------------ simulation */
export function simulate(depth: number): Ev[] {
  const ev: Ev[] = [];
  let t = 0;
  const queue: { path: string; depth: number }[] = [{ path: fx.start, depth }];
  const visited = new Set<string>([fx.start]);
  const free = Array.from({ length: C.workers }, (_, i) => i);
  const running: { w: number; end: number; path: string; depth: number }[] = [];
  ev.push({ t: 0, k: 'enqueue', url: fx.start, depth: 0 });

  const assign = () => {
    while (queue.length && free.length) {
      const task = queue.shift()!; const w = free.shift()!;
      const pg = pageBy.get(task.path)!;
      const one = C.requestDelayMs + pg.ms;
      ev.push({ t, k: 'start', url: task.path, w, depth: depth - task.depth });
      let dur = one;
      if (pg.status === 0) {
        // three attempts, sleeping RetryDelay * (attempt + 1) between them
        dur = C.requestDelayMs + pg.ms * C.maxRetries + C.retryDelayMs * (1 + 2);
        ev.push({ t: t + C.requestDelayMs + pg.ms, k: 'retry', url: task.path, w, attempt: 1 });
        ev.push({ t: t + C.requestDelayMs + pg.ms * 2 + C.retryDelayMs, k: 'retry', url: task.path, w, attempt: 2 });
      }
      running.push({ w, end: t + dur, path: task.path, depth: task.depth });
    }
  };

  assign();
  while (running.length) {
    running.sort((a, b) => a.end - b.end || a.w - b.w);
    const r = running.shift()!;
    t = r.end; free.push(r.w); free.sort((a, b) => a - b);
    const pg = pageBy.get(r.path)!;
    const shown = depth - r.depth;
    const links = pg.status === 0 ? [] : [...new Set(pg.links)];
    ev.push({ t, k: 'done', url: r.path, w: r.w, status: pg.status, ms: pg.status === 0 ? pg.ms * C.maxRetries + 3000 : pg.ms, n: links.length, depth: shown });
    for (const h of links) if (isMalformed(h)) ev.push({ t, k: 'malformed', url: h, parent: r.path });
    if (pg.status !== 0 && pg.status < 400 && r.depth > 0) {
      for (const h of links) {
        if (isMalformed(h)) continue;
        const p = toPath(h) ?? (h.startsWith(ORIGIN) ? h.slice(ORIGIN.length) || '/' : null);
        if (p && pageBy.has(p)) {
          if (visited.has(p)) { ev.push({ t, k: 'found', url: p, parent: r.path, kind: 'dup' }); continue; }
          visited.add(p);
          if (queue.length < C.taskBuffer) { queue.push({ path: p, depth: r.depth - 1 }); ev.push({ t, k: 'found', url: p, parent: r.path, kind: 'new' }); ev.push({ t, k: 'enqueue', url: p, parent: r.path, depth: depth - (r.depth - 1) }); }
        } else ev.push({ t, k: 'found', url: h, parent: r.path, kind: 'external' });
      }
    }
    assign();
  }
  ev.push({ t: t + 120, k: 'report', url: '' });
  return ev;
}

/* ------------------------------------------------------------------ state at an instant */
export interface U { url: string; state: 'queued' | 'fetching' | 'ok' | 'redirect' | 'client' | 'server' | 'network' | 'external'; depth: number; parent?: string; w?: number; status?: number; ms?: number; found: { href: string; kind: Kind | 'malformed' | 'nofollow' }[]; nlinks?: number; retries: number; tStart?: number }
export interface St { urls: Map<string, U>; queue: string[]; workers: (string | null)[]; log: { t: number; html: string; url?: string }[]; edges: { a: string; b: string; kind: Kind; t: number }[]; malformed: string[]; dups: number; done: boolean; reported: boolean }
export const fresh = (): St => ({ urls: new Map(), queue: [], workers: Array(C.workers).fill(null), log: [], edges: [], malformed: [], dups: 0, done: false, reported: false });

export function apply(st: St, e: Ev, maxDepth: number) {
  const get = (u: string) => st.urls.get(u)!;
  switch (e.k) {
    case 'enqueue': st.urls.set(e.url, { url: e.url, state: 'queued', depth: e.depth ?? 0, parent: e.parent, found: [], retries: 0 }); st.queue.push(e.url); break;
    case 'start': { const u = get(e.url); u.state = 'fetching'; u.tStart = e.t; u.w = e.w; st.workers[e.w!] = e.url; st.queue = st.queue.filter((x) => x !== e.url); break; }
    case 'retry': { const u = get(e.url); u.retries = e.attempt!; st.log.push({ t: e.t, url: e.url, html: `<span class="c-warn">[RETRY ${e.attempt}/${C.maxRetries - 1}]</span> ${esc(e.url)} <i>(worker ${e.w! + 1})</i>` }); break; }
    case 'done': {
      const u = get(e.url); u.w = e.w; st.workers[e.w!] = null; u.status = e.status; u.ms = e.ms; u.nlinks = e.n;
      u.state = e.status === 0 ? 'network' : e.status! >= 500 ? 'server' : e.status! >= 400 ? 'client' : e.status! >= 300 ? 'redirect' : 'ok';
      const ind = '&nbsp;&nbsp;'.repeat(e.depth ?? 0);
      if (e.status === 0) st.log.push({ t: e.t, url: e.url, html: `${ind}<span class="c-bad">[FAIL]</span> ${esc(e.url)} <i>(failed after ${C.maxRetries} attempts)</i>` });
      else st.log.push({ t: e.t, url: e.url, html: `${ind}<span class="${e.status! >= 400 ? 'c-bad' : 'c-ok'}">[${e.status}]</span> ${esc(e.url)} <i>${e.n} links · ${e.ms}ms</i>` });
      if (e.status! > 0 && e.status! < 400 && e.n && (e.depth ?? 0) >= maxDepth) u.found.push({ href: `${e.n} links`, kind: 'nofollow' });
      break;
    }
    case 'found': {
      const p = get(e.parent!);
      if (e.kind === 'external') { if (!st.urls.has(e.url)) st.urls.set(e.url, { url: e.url, state: 'external', depth: 0, parent: e.parent, found: [], retries: 0 }); }
      if (e.kind === 'dup') st.dups++;
      p.found.push({ href: e.url, kind: e.kind! });
      st.edges.push({ a: e.parent!, b: e.url, kind: e.kind!, t: e.t });
      break;
    }
    case 'malformed': { st.malformed.push(e.url); get(e.parent!).found.push({ href: e.url, kind: 'malformed' }); break; }
    case 'report': st.done = true; st.reported = true; break;
  }
}


/* ------------------------------------------------------------------ layout (no fixed per-device coordinates) */
export interface Pt { x: number; y: number }
export interface Layout { pts: Map<string, Pt>; ext: Map<string, Pt>; w: number; h: number; labels: boolean; tree: { path: string; parent?: string; depth: number }[] }
/** Tree of first discoveries, laid out by leaf order: depth along the main axis, siblings evenly spaced on the other.
 *  mode 'wide' flows left to right with labels beside the nodes; 'tall' flows top to bottom for phones (labels off). */
export function layoutFor(events: Ev[], mode: 'wide' | 'tall'): Layout {
  const tree = events.filter((e) => e.k === 'enqueue').map((e) => ({ path: e.url, parent: e.parent, depth: e.depth ?? 0 }));
  const kids = new Map<string, string[]>(); tree.forEach((n) => { if (n.parent) (kids.get(n.parent) ?? kids.set(n.parent, []).get(n.parent)!).push(n.path); });
  const order = new Map<string, number>(); let leaf = 0;
  const place = (p: string): number => { const k = kids.get(p); if (!k) { order.set(p, leaf++); return order.get(p)!; } const ys = k.map(place); const m = (Math.min(...ys) + Math.max(...ys)) / 2; order.set(p, m); return m; };
  place(fx.start);
  const maxD = Math.max(...tree.map((n) => n.depth));
  const wide = mode === 'wide', gap = wide ? 42 : 36, col = wide ? 196 : 118, padA = wide ? 54 : 34, padB = wide ? 64 : 62;
  const pts = new Map<string, Pt>();
  tree.forEach((n) => { const a = padA + n.depth * col, b = padB + order.get(n.path)! * gap; pts.set(n.path, wide ? { x: a, y: b } : { x: b, y: a }); });
  const lastB = padB + (leaf - 1) * gap;
  const ext = new Map<string, Pt>();
  const above = (p: string, dx: number) => { const q = pts.get(p)!; return wide ? { x: q.x + dx, y: 22 } : { x: 18, y: q.y + 0 }; };
  fx.externals.forEach((x, i) => {
    const from = events.find((e) => e.k === 'found' && e.kind === 'external' && e.url === x.url)!.parent!;
    const q = pts.get(from)!;
    ext.set(x.url, wide ? (i === 0 ? { x: q.x + col * 0.7, y: 22 } : { x: q.x + col, y: lastB + 46 }) : (i === 0 ? { x: q.x + 66, y: q.y - 30 } : { x: Math.min(q.x + 70, 300), y: q.y + 60 }));
  });
  void above;
  const w = wide ? padA + maxD * col + 190 : padB * 2 + (leaf - 1) * gap + 10;
  const h = wide ? lastB + 96 : padA + maxD * col + 96;
  return { pts, ext, w, h, labels: wide, tree };
}
