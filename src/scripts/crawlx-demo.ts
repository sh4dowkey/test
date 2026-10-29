/**
 * CrawlX demonstration (frontend simulation).
 * The engine replays the decision logic of internal/crawl/crawler.go over a fictional, deterministic site
 * (src/data/demos.ts): a dispatcher owns the `visited` map, a FIFO task buffer feeds NumWorkers = 10 workers,
 * a link is followed only when it is on the start host, unseen and the task still has depth left, failed network
 * attempts are retried up to MaxRetries = 3 with RetryDelay * (attempt + 1) and every result lands in the report.
 * It never touches the network and is not the Go program. The state at any instant is a pure function of the
 * simulated clock, so pause, step, scrub and replay always agree.
 */
import { crawlxFixture as fx, type CxPage } from '../data/demos';

type Kind = 'new' | 'dup' | 'external';
interface Ev { t: number; k: 'enqueue' | 'start' | 'retry' | 'done' | 'found' | 'malformed' | 'report'; url: string; w?: number; parent?: string; depth?: number; kind?: Kind; status?: number; ms?: number; n?: number; attempt?: number }

const ORIGIN = 'https://' + fx.host;
const C = fx.config;
const pageBy = new Map<string, CxPage>(fx.pages.map((p) => [p.path, p]));
const STATUS_TEXT: Record<number, string> = { 200: 'OK', 301: 'Moved Permanently', 404: 'Not Found', 500: 'Internal Server Error' };
const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const isMalformed = (h: string) => /^https?:\/\/\[/.test(h) && !h.includes(']');
const toPath = (h: string) => (h.startsWith('/') ? h : null);

/* ------------------------------------------------------------------ simulation */
function simulate(depth: number): Ev[] {
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
interface U { url: string; state: 'queued' | 'fetching' | 'ok' | 'redirect' | 'client' | 'server' | 'network' | 'external'; depth: number; parent?: string; w?: number; status?: number; ms?: number; found: { href: string; kind: Kind | 'malformed' | 'nofollow' }[]; nlinks?: number; retries: number }
interface St { urls: Map<string, U>; queue: string[]; workers: (string | null)[]; log: { t: number; html: string; url?: string }[]; edges: { a: string; b: string; kind: Kind; t: number }[]; malformed: string[]; dups: number; done: boolean; reported: boolean }
const fresh = (): St => ({ urls: new Map(), queue: [], workers: Array(C.workers).fill(null), log: [], edges: [], malformed: [], dups: 0, done: false, reported: false });
const code = (s: number) => `${s} ${STATUS_TEXT[s] ?? 'Unknown Status'}`;

function apply(st: St, e: Ev, maxDepth: number) {
  const get = (u: string) => st.urls.get(u)!;
  switch (e.k) {
    case 'enqueue': st.urls.set(e.url, { url: e.url, state: 'queued', depth: e.depth ?? 0, parent: e.parent, found: [], retries: 0 }); st.queue.push(e.url); break;
    case 'start': { const u = get(e.url); u.state = 'fetching'; u.w = e.w; st.workers[e.w!] = e.url; st.queue = st.queue.filter((x) => x !== e.url); break; }
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

/* ------------------------------------------------------------------ UI */
export function initCrawlxDemo(root: HTMLElement, opts: { reduced: boolean }) {
  let depth = C.defaultDepth;
  let events = simulate(depth);
  let total = events[events.length - 1].t;
  let st = fresh(), idx = 0, simT = 0, playing = false, speed = 1, selected: string | null = null, started = false, last = 0;
  const REAL = 1.35;               // real ms per simulated ms at 1x

  root.innerHTML = `
  <div class="dm__bar">
    <span class="dm__badge" title="Frontend simulation">Demo · simulated data</span>
    <code class="dm__cmd" data-cmd></code>
    <div class="dm__ctrl" role="group" aria-label="Playback">
      <button type="button" class="dm__btn dm__btn--main" data-play aria-label="Pause">Pause</button>
      <button type="button" class="dm__btn" data-step aria-label="Step to next event">Step</button>
      <button type="button" class="dm__btn" data-replay>Replay</button>
      <button type="button" class="dm__btn" data-speed aria-label="Playback speed">1×</button>
      <label class="dm__sel">Depth <select data-depth aria-label="Crawl depth"><option>1</option><option selected>2</option><option>3</option></select></label>
    </div>
  </div>
  <div class="cx__grid">
    <div class="cx__graph">
      <svg viewBox="30 0 520 400" role="group" aria-label="Web graph of the sample site. Select a page to inspect it." data-svg>
        <g data-edges></g><g data-pulses></g><g data-nodes></g>
      </svg>
      <p class="cx__legend" aria-hidden="true"><i class="l l--q"></i>queued <i class="l l--f"></i>fetching <i class="l l--o"></i>done <i class="l l--e"></i>error <i class="l l--x"></i>external</p>
    </div>
    <div class="cx__side">
      <dl class="cx__stats">
        <div><dt>Discovered</dt><dd data-stat="disc">0</dd></div><div><dt>Queued</dt><dd data-stat="queue">0</dd></div><div><dt>Crawled</dt><dd data-stat="ok">0</dd></div>
        <div><dt>Errors</dt><dd data-stat="err">0</dd></div><div><dt>External</dt><dd data-stat="ext">0</dd></div><div><dt>Skipped dup</dt><dd data-stat="dup">0</dd></div>
      </dl>
      <div class="cx__block"><p class="dm__h">Workers <span data-stat="busy">0/10</span></p><ol class="cx__workers" data-workers></ol></div>
      <div class="cx__block"><p class="dm__h">Task queue <span class="dm__dim">buffer ${C.taskBuffer}</span></p><ol class="cx__queue" data-queue></ol></div>
    </div>
    <div class="cx__log"><p class="dm__h">Verbose output</p><div class="cx__logbody" data-log role="log" aria-live="off"></div></div>
    <div class="cx__insp" data-insp aria-live="polite"></div>
  </div>
  <div class="dm__scrub"><input type="range" min="0" max="${total}" value="0" step="1" data-scrub aria-label="Position in the simulated run" /><span data-clock>0.0 s</span></div>
  <div class="cx__report" data-report hidden></div>
  <p class="dm__note">Fictional site, hand-written data. This is a simulation of CrawlX’s logic in the browser, not the Go program and not real network activity. Constants (10 workers, buffer 100, 3 attempts, 100 ms delay) are from <code>crawler.go</code>.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const nodesG = $('[data-nodes]'), edgesG = $('[data-edges]'), pulsesG = $('[data-pulses]');
  const NS = 'http://www.w3.org/2000/svg';
  const mk = (tag: string, attrs: Record<string, string>, parent?: Element) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
  const pos = (u: string) => { const p = pageBy.get(u); if (p) return { x: p.x, y: p.y }; const x = fx.externals.find((e) => e.url === u); return x ? { x: x.x, y: x.y } : { x: 0, y: 0 }; };

  // nodes
  const nodeEls = new Map<string, SVGGElement>();
  const addNode = (u: string, ext: boolean) => {
    const { x, y } = pos(u);
    const g = mk('g', { class: 'n', transform: `translate(${x} ${y})`, tabindex: '0', role: 'button', 'data-u': u, 'aria-label': (ext ? 'External link ' : 'Page ') + u }) as SVGGElement;
    mk('circle', { class: 'n__ring', r: '13' }, g);
    if (ext) mk('rect', { class: 'n__dot', x: '-6', y: '-6', width: '12', height: '12', rx: '3' }, g); else mk('circle', { class: 'n__dot', r: '7' }, g);
    const label = ext ? u.replace('https://', '').replace(/\/$/, '') : u;
    const t = mk('text', { class: 'n__t', y: '-16', 'text-anchor': x > 540 ? 'end' : x < 90 ? 'start' : 'middle', dx: x > 540 ? '8' : x < 90 ? '-8' : '0' }, g); t.textContent = label.length > 20 ? '…' + label.slice(-19) : label;
    nodesG.appendChild(g); nodeEls.set(u, g);
    g.addEventListener('click', () => select(u));
    g.addEventListener('keydown', (e) => { if ((e as KeyboardEvent).key === 'Enter' || (e as KeyboardEvent).key === ' ') { e.preventDefault(); select(u); } });
  };
  fx.pages.forEach((p) => addNode(p.path, false)); fx.externals.forEach((x) => addNode(x.url, true));

  const edgeEls = new Map<string, SVGLineElement>();
  const edgeFor = (a: string, b: string, kind: Kind) => {
    const id = a + '>' + b; let el = edgeEls.get(id);
    if (!el) { const A = pos(a), B = pos(b); el = mk('line', { x1: String(A.x), y1: String(A.y), x2: String(B.x), y2: String(B.y), class: 'e e--' + kind }, edgesG) as SVGLineElement; edgeEls.set(id, el); }
    return el;
  };

  const sel = <T extends Element = HTMLElement>(s: string) => $<T>(s);
  const workerEls = Array.from({ length: C.workers }, (_, i) => { const li = document.createElement('li'); li.innerHTML = `<b>${i + 1}</b><span>idle</span>`; sel('[data-workers]').appendChild(li); return li; });

  function rebuild(to: number) {
    if (to < simT || idx === 0 && to === 0) { st = fresh(); idx = 0; }
    simT = to;
    while (idx < events.length && events[idx].t <= simT) { apply(st, events[idx], depth); idx++; }
  }

  const statusLabel = (u: U) => ({ queued: 'Queued', fetching: 'Fetching', ok: 'Crawled', redirect: 'Redirect (3xx, links not read)', client: 'Client error (4xx)', server: 'Server error (5xx)', network: 'Network error after retries', external: 'External link, not crawled' }[u.state]);
  const why = (u: U) => {
    if (u.state === 'external') return 'Different host from the start URL, so the dispatcher records it under External Links and does not enqueue it.';
    const parent = u.parent ? `Found on <code>${esc(u.parent)}</code>. ` : 'Start URL. ';
    return parent + (u.depth === 0 ? 'It is the first task, enqueued with the chosen depth.' : `Same host and not yet in <code>visited</code>, so it was queued at depth ${u.depth}.`);
  };

  function paint() {
    const urls = [...st.urls.values()];
    // nodes
    nodeEls.forEach((g, u) => {
      const s = st.urls.get(u);
      const v = s ? s.state : 'hidden';
      if (g.dataset.s !== v) g.dataset.s = v;
      g.classList.toggle('is-sel', u === selected);
    });
    // edges (only discovered; duplicate edges drawn faint)
    const seen = new Set<string>();
    st.edges.forEach((e) => { const el = edgeFor(e.a, e.b, e.kind); seen.add(e.a + '>' + e.b); el.style.opacity = e.kind === 'dup' ? '.28' : '1'; el.style.display = ''; });
    edgeEls.forEach((el, id) => { if (!seen.has(id)) el.style.display = 'none'; });
    // pulses: a signal travels each newly found edge for 380 simulated ms
    pulsesG.replaceChildren();
    for (let i = st.edges.length - 1; i >= 0 && i > st.edges.length - 40; i--) {
      const e = st.edges[i], p = (simT - e.t) / 380; if (p < 0 || p > 1) continue;
      const A = pos(e.a), B = pos(e.b), k = 1 - Math.pow(1 - p, 3);
      mk('circle', { class: 'pulse pulse--' + e.kind, r: '3.2', cx: String(A.x + (B.x - A.x) * k), cy: String(A.y + (B.y - A.y) * k), opacity: String(1 - p * 0.6) }, pulsesG);
    }
    // counters
    const pages = urls.filter((u) => u.state !== 'external');
    const crawled = pages.filter((u) => u.state === 'ok' || u.state === 'redirect').length;
    const errs = pages.filter((u) => ['client', 'server', 'network'].includes(u.state)).length;
    const ext = urls.length - pages.length;
    const busy = st.workers.filter(Boolean).length;
    const set = (k: string, v: string) => { const el = sel(`[data-stat="${k}"]`); if (el.textContent !== v) el.textContent = v; };
    set('disc', String(pages.length)); set('queue', String(st.queue.length)); set('ok', String(crawled)); set('err', String(errs)); set('ext', String(ext)); set('dup', String(st.dups)); set('busy', `${busy}/${C.workers}`);
    // workers
    st.workers.forEach((u, i) => { const li = workerEls[i]; li.classList.toggle('is-busy', !!u); const sp = li.lastElementChild!; const txt = u ?? 'idle'; if (sp.textContent !== txt) sp.textContent = txt; });
    // queue
    const q = sel('[data-queue]'); const items = st.queue.slice(0, 7);
    const sig = items.join('|') + st.queue.length; if (q.dataset.sig !== sig) { q.dataset.sig = sig; q.innerHTML = items.map((u) => `<li><button type="button" data-q="${esc(u)}">${esc(u)}</button><i>d${st.urls.get(u)!.depth}</i></li>`).join('') + (st.queue.length > 7 ? `<li class="dm__dim">+ ${st.queue.length - 7} more</li>` : '') || '<li class="dm__dim">empty</li>'; }
    // log
    const lb = sel('[data-log]'); const lsig = String(st.log.length); if (lb.dataset.sig !== lsig) { lb.dataset.sig = lsig; lb.innerHTML = st.log.slice(-9).map((l) => `<button type="button" class="ll" data-q="${esc(l.url ?? '')}">${l.html}</button>`).join(''); lb.scrollTop = lb.scrollHeight; }
    // inspector
    const insp = sel('[data-insp]'); const cur = selected ? st.urls.get(selected) : null; const isig = selected + '|' + (cur ? cur.state + cur.found.length + (cur.status ?? '') : '');
    if (insp.dataset.sig !== isig) {
      insp.dataset.sig = isig;
      if (!selected) insp.innerHTML = '<p class="dm__h">Inspector</p><p class="dm__dim">Select a page in the graph, the queue or the log to see its state, how it was found and what its links became.</p>';
      else if (!cur) insp.innerHTML = `<p class="dm__h">Inspector</p><p class="dm__dim"><code>${esc(selected)}</code> has not been discovered yet at this point in the run.</p>`;
      else {
        const pg = pageBy.get(cur.url);
        const statusLine = cur.status === undefined ? '' : cur.status === 0 ? `<p>Every one of ${C.maxRetries} attempts failed.</p>` : `<p><code>[${esc(code(cur.status))}]</code> ${cur.ms}ms${cur.nlinks !== undefined ? ` · ${cur.nlinks} links found` : ''}</p>`;
        const rows = cur.found.map((f) => `<li><code>${esc(f.href)}</code><i class="k k--${f.kind}">${({ new: 'queued', dup: 'already visited', external: 'external', malformed: 'malformed', nofollow: 'depth limit reached' } as const)[f.kind]}</i></li>`).join('');
        insp.innerHTML = `<p class="dm__h">Inspector <span class="dm__dim">${esc(statusLabel(cur))}</span></p><p class="cx__path"><code>${esc(cur.url)}</code>${pg?.title ? ` <span class="dm__dim">“${esc(pg.title)}”</span>` : ''}</p><p class="dm__dim">${why(cur)}</p>${statusLine}${cur.w !== undefined && cur.state !== 'external' ? `<p class="dm__dim">Worker ${cur.w + 1}${cur.retries ? ` · ${cur.retries} retr${cur.retries > 1 ? 'ies' : 'y'}` : ''}</p>` : ''}${rows ? `<ul class="cx__links">${rows}</ul>` : ''}`;
      }
    }
    // report
    const rep = sel('[data-report]');
    if (st.reported) {
      if (rep.hidden) {
        const group = (title: string, list: U[], fmt: (u: U) => string) => list.length ? `<div><h4>${title} (${list.length})</h4><ul>${list.map((u) => `<li><button type="button" data-q="${esc(u.url)}">${fmt(u)}</button></li>`).join('')}</ul></div>` : '';
        const ok = pages.filter((u) => u.state === 'ok' || u.state === 'redirect'), c4 = pages.filter((u) => u.state === 'client'), c5 = pages.filter((u) => u.state === 'server'), net = pages.filter((u) => u.state === 'network');
        rep.innerHTML = `<p class="dm__h">Crawl report <span class="dm__dim">mirrors PrintSummaryAndLinks</span></p><p class="cx__totals">Total: ${pages.length} · Success: ${ok.length} · Errors: ${c4.length + c5.length + net.length}</p><div class="cx__rgrid">${group('Successful pages', ok, (u) => `${esc(u.url)} <i>${u.ms}ms</i>`)}${group('Client errors (4xx)', c4, (u) => `${esc(u.url)} <i>${esc(code(u.status!))}</i>`)}${group('Server errors (5xx)', c5, (u) => `${esc(u.url)} <i>${esc(code(u.status!))}</i>`)}${group('Network errors', net, (u) => `${esc(u.url)} <i>failed after ${C.maxRetries} attempts</i>`)}${group('External links', urls.filter((u) => u.state === 'external'), (u) => esc(u.url))}${st.malformed.length ? `<div><h4>Malformed links (${st.malformed.length})</h4><ul>${st.malformed.map((m) => `<li><code>${esc(m)}</code></li>`).join('')}</ul></div>` : ''}</div>`;
        rep.hidden = false;
      }
    } else if (!rep.hidden) rep.hidden = true;
    // chrome
    sel('[data-clock]').textContent = (simT / 1000).toFixed(1) + ' s';
    const sc = sel<HTMLInputElement>('[data-scrub]'); if (document.activeElement !== sc) sc.value = String(Math.round(simT));
    const pb = sel('[data-play]'); const lbl = playing ? 'Pause' : 'Play'; if (pb.textContent !== lbl) { pb.textContent = lbl; pb.setAttribute('aria-label', lbl); }
  }

  function select(u: string | null) { selected = u; paint(); }
  const play = () => { if (st.reported) { rebuild(0); } playing = true; last = 0; paint(); };
  const pause = () => { playing = false; paint(); };
  function reset(d?: number) {
    if (d !== undefined) { depth = d; events = simulate(d); total = events[events.length - 1].t; sel<HTMLInputElement>('[data-scrub]').max = String(total); edgeEls.forEach((e) => e.remove()); edgeEls.clear(); selected = null; }
    st = fresh(); idx = 0; simT = 0; sel('[data-cmd]').textContent = fx.command(depth); sel('[data-insp]').dataset.sig = ''; sel('[data-queue]').dataset.sig = ''; sel('[data-log]').dataset.sig = ''; sel('[data-report]').hidden = true;
  }

  sel('[data-play]').addEventListener('click', () => (playing ? pause() : play()));
  sel('[data-replay]').addEventListener('click', () => { reset(); rebuild(0); playing = !opts.reduced; last = 0; paint(); });
  sel('[data-step]').addEventListener('click', () => { playing = false; const nxt = events.find((e) => e.t > simT) ?? events[events.length - 1]; rebuild(nxt.t); paint(); });
  sel('[data-speed]').addEventListener('click', (e) => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; (e.currentTarget as HTMLElement).textContent = speed + '×'; });
  sel<HTMLSelectElement>('[data-depth]').addEventListener('change', (e) => { reset(+(e.target as HTMLSelectElement).value); rebuild(0); playing = !opts.reduced; last = 0; paint(); });
  sel<HTMLInputElement>('[data-scrub]').addEventListener('input', (e) => { playing = false; rebuild(+(e.target as HTMLInputElement).value); paint(); });
  root.addEventListener('click', (e) => { const b = (e.target as Element).closest<HTMLElement>('[data-q]'); if (b && b.dataset.q) select(b.dataset.q); });

  function frame(now: number) {
    if (playing && visible) {
      if (last) { simT = Math.min(total, simT + ((now - last) / REAL) * speed); rebuild(simT); if (simT >= total) playing = false; paint(); }
      last = now;
    } else last = 0;
    raf = requestAnimationFrame(frame);
  }
  let visible = false, raf = 0;
  reset(); paint();
  raf = requestAnimationFrame(frame);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !started) {
      started = true;
      if (opts.reduced) { rebuild(total + 1); playing = false; select('/catalog/archive'); } else { playing = true; select('/'); }
    }
    if (!visible) last = 0;
  }, { threshold: 0.35 }).observe(root);
  // exposed for tests only
  (root as unknown as { __cx: unknown }).__cx = { get t() { return simT; }, get total() { return total; }, get playing() { return playing; } };
}
