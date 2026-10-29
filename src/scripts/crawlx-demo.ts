/**
 * CrawlX demonstration: a self-running, looping visualisation (frontend simulation, no controls).
 * The engine in crawl-sim.ts replays the dispatcher/worker logic of internal/crawl/crawler.go on fictional data.
 * Everything drawn is a pure function of the loop position u (see loop.ts), so the graph, the scan head, workers,
 * queue, counters and the final report cannot disagree. Hover or focus a node to inspect it.
 */
import { crawlxFixture as fx } from '../data/demos';
import { simulate, apply, fresh, layoutFor, code, pageBy, C, type St, type Ev, type Layout, type U } from './crawl-sim';
import { createLoop, clamp, ease, esc } from './loop';

const NS = 'http://www.w3.org/2000/svg';
const DEPTH = 2;
const SPEED = 1.25;            // real ms per simulated ms
const INTRO = 900, HOLD = 5600, REPORT_BUILD = 1500;
const ORIGIN_SHOWN = 'https://' + fx.host + '/';
const short = (p: string) => (p === '/' ? fx.host : '/' + (p.split('/').filter(Boolean).pop() ?? ''));

export function initCrawlxDemo(root: HTMLElement, opts: { reduced: boolean }) {
  const events: Ev[] = simulate(DEPTH);
  const total = events[events.length - 1].t - 120;
  const CRAWL = total * SPEED, CYCLE = INTRO + CRAWL + HOLD;
  const doneAt = new Map<string, number>(), seenAt = new Map<string, number>(), malAt: { t: number; parent: string }[] = [];
  events.forEach((e) => { if (e.k === 'done') doneAt.set(e.url, e.t); if ((e.k === 'enqueue' || (e.k === 'found' && e.kind === 'external')) && !seenAt.has(e.url)) seenAt.set(e.url, e.t); if (e.k === 'malformed') malAt.push({ t: e.t, parent: e.parent! }); });

  root.innerHTML = `
  <div class="dm__bar">
    <span class="dm__badge" title="Frontend simulation, not the Go program">Demo · simulated data</span>
    <code class="dm__cmd">${esc(fx.command(DEPTH))}</code>
    <span class="dm__loop" aria-hidden="true"><i data-loop></i></span>
  </div>
  <div class="cx__stage" data-stage>
    <div class="cx__graph"><svg role="img" aria-label="A web crawl in progress: a crawler starts at the seed page, discovers links, queues eligible ones and records each response." data-svg></svg></div>
    <aside class="cx__side">
      <div class="cx__now" data-now aria-live="off"></div>
      <div class="cx__report" data-report></div>
      <ol class="cx__lanes" data-lanes aria-label="Ten workers"></ol>
      <dl class="cx__counts" data-counts></dl>
    </aside>
    <div class="cx__strip">
      <div class="cx__q"><span class="cx__qh">Task queue</span><ol data-queue></ol></div>
    </div>
  </div>
  <p class="dm__note">A browser simulation on a fictional site with hand-written data, replaying the logic of CrawlX (${C.workers} workers, buffer ${C.taskBuffer}, ${C.maxRetries} attempts, ${C.requestDelayMs} ms delay, from <code>crawler.go</code>). It is not the Go program and not real network activity.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const svg = $<SVGSVGElement>('[data-svg]'), stage = $('[data-stage]'), lanes = $('[data-lanes]');
  lanes.innerHTML = Array.from({ length: C.workers }, (_, i) => `<li><b>${i + 1}</b><i><u></u></i><span>idle</span></li>`).join('');
  const laneEls = Array.from(lanes.children) as HTMLElement[];

  let mode: 'wide' | 'tall' = root.clientWidth < 640 ? 'tall' : 'wide';
  let L: Layout = layoutFor(events, mode);
  let nodeEls = new Map<string, SVGGElement>(), edgeEls: { el: SVGPathElement; a: string; b: string; t: number; kind: string }[] = [], malEls: SVGTextElement[] = [];
  let head!: SVGGElement, hover: string | null = null, st: St = fresh(), idx = 0, prevT = -1, lastSig = '', lastQ = '';
  const mk = (tag: string, attrs: Record<string, string>, parent?: Element) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
  const P = (u: string) => L.pts.get(u) ?? L.ext.get(u)!;
  const curve = (a: { x: number; y: number }, b: { x: number; y: number }) => mode === 'wide' ? `M${a.x} ${a.y}C${a.x + 70} ${a.y} ${b.x - 70} ${b.y} ${b.x} ${b.y}` : `M${a.x} ${a.y}C${a.x} ${a.y + 46} ${b.x} ${b.y - 46} ${b.x} ${b.y}`;

  function build() {
    L = layoutFor(events, mode);
    svg.setAttribute('viewBox', `0 0 ${L.w} ${L.h}`); svg.replaceChildren();
    const eg = mk('g', {}, svg), ng = mk('g', {}, svg); head = mk('g', { class: 'cx__head' }, svg) as SVGGElement;
    mk('circle', { class: 'cx__headring', r: '15' }, head); mk('circle', { class: 'cx__headcore', r: '3.4' }, head);
    [0, 90, 180, 270].forEach((a) => mk('line', { class: 'cx__tick', x1: '19', y1: '0', x2: '25', y2: '0', transform: `rotate(${a})` }, head));
    edgeEls = []; nodeEls = new Map(); malEls = [];
    events.filter((e) => e.k === 'found').forEach((e) => {
      const a = P(e.parent!), b = P(e.url); if (!a || !b) return;
      const el = mk('path', { d: curve(a, b), class: 'cx__e cx__e--' + e.kind, pathLength: '1' }, eg) as SVGPathElement;
      edgeEls.push({ el, a: e.parent!, b: e.url, t: e.t, kind: e.kind! });
    });
    const addNode = (u: string, ext: boolean) => {
      const p = P(u); if (!p) return;
      const g = mk('g', { class: 'n', transform: `translate(${p.x} ${p.y})`, tabindex: '0', role: 'button', 'data-u': u, 'aria-label': (ext ? 'External link ' : 'Page ') + u }, ng) as SVGGElement;
      const inner = mk('g', { class: 'n__in' }, g);
      mk('circle', { class: 'n__ring', r: '12' }, inner);
      if (ext) mk('rect', { class: 'n__dot', x: '-6', y: '-6', width: '12', height: '12', rx: '3' }, inner); else mk('circle', { class: 'n__dot', r: '6.5' }, inner);
      if (L.labels) { const t = mk('text', { class: 'n__t', x: '13', y: '3.6' }, inner); t.textContent = ext ? u.replace('https://', '').replace(/\/$/, '') : short(u); }
      g.addEventListener('pointerenter', () => { hover = u; loop.redraw(); }); g.addEventListener('pointerleave', () => { hover = null; loop.redraw(); });
      g.addEventListener('focus', () => { hover = u; loop.redraw(); }); g.addEventListener('blur', () => { hover = null; loop.redraw(); });
      nodeEls.set(u, g);
    };
    L.tree.forEach((n) => addNode(n.path, false)); fx.externals.forEach((x) => addNode(x.url, true));
    malAt.forEach((m) => { const p = P(m.parent); const t = mk('text', { class: 'cx__mal', x: String(p.x + (mode === 'wide' ? 4 : 10)), y: String(p.y - 14), 'text-anchor': 'middle' }, ng) as SVGTextElement; t.textContent = '×'; mk('title', {}, t).textContent = 'Malformed link skipped'; malEls.push(t); });
    st = fresh(); idx = 0; prevT = -1; lastSig = ''; lastQ = '';
  }

  function rebuild(simT: number) {
    if (simT < prevT) { st = fresh(); idx = 0; lastSig = ''; lastQ = ''; }
    prevT = simT;
    while (idx < events.length && events[idx].t <= simT) { apply(st, events[idx], DEPTH); idx++; }
  }

  const detail = (u: U | undefined, url: string) => {
    if (!u) return `<p class="cx__k">Not discovered yet</p><p class="cx__url">${esc(url)}</p>`;
    const pg = pageBy.get(url);
    const res = u.state === 'external' ? 'External: recorded in the report, not crawled' : u.state === 'queued' ? 'Queued' : u.state === 'fetching' ? (u.retries ? `Retry ${u.retries} of ${C.maxRetries - 1}…` : 'Fetching…') : u.status === 0 ? `Failed after ${C.maxRetries} attempts` : `[${esc(code(u.status!))}] ${u.ms}ms · ${u.nlinks ?? 0} links`;
    return `<p class="cx__k">${hover ? 'Inspecting' : 'Crawling'}</p><p class="cx__url">${esc(url === '/' ? ORIGIN_SHOWN : url)}</p>
      <dl class="cx__facts"><div><dt>Depth</dt><dd>${u.depth}</dd></div><div><dt>Worker</dt><dd>${u.w !== undefined && u.state !== 'external' ? u.w + 1 : '–'}</dd></div><div class="cx__w"><dt>Result</dt><dd>${res}</dd></div></dl>
      ${pg?.title && u.state === 'ok' ? `<p class="cx__title">“${esc(pg.title)}”</p>` : ''}`;
  };

  function render(uMs: number, fade: number) {
    stage.style.setProperty('--fade', String(fade));
    $('[data-loop]').style.transform = `scaleX(${(uMs / CYCLE).toFixed(4)})`;
    const simT = clamp((uMs - INTRO) / SPEED, 0, total + 200);
    rebuild(simT);
    const urls = [...st.urls.values()], pages = urls.filter((u) => u.state !== 'external');
    nodeEls.forEach((g, u) => {
      const s = st.urls.get(u), inner = g.firstElementChild as SVGGElement;
      if (!s) { g.dataset.s = 'hidden'; return; }
      g.dataset.s = s.state; g.classList.toggle('is-hover', hover === u);
      const k = ease((simT - (seenAt.get(u) ?? 0)) / 380); inner.setAttribute('transform', `scale(${(0.2 + 0.8 * k).toFixed(3)})`); inner.style.opacity = String(k);
    });
    edgeEls.forEach((e) => {
      if (simT < e.t) { e.el.style.opacity = '0'; return; }
      const p = ease((simT - e.t) / 520);
      e.el.style.opacity = e.kind === 'dup' ? String(0.3 * p) : '1'; e.el.style.strokeDashoffset = String(1 - p);
      e.el.classList.toggle('is-active', e.kind === 'new' && st.urls.get(e.b)?.state === 'fetching');
    });
    malEls.forEach((m, i) => { m.style.opacity = simT >= malAt[i].t ? '1' : '0'; });
    const started = urls.filter((u) => u.tStart !== undefined && u.state !== 'external').sort((a, b) => b.tStart! - a.tStart!)[0];
    const running = st.workers.some(Boolean);
    if (started && running) {
      const to = P(started.url), from = started.parent && L.pts.get(started.parent) ? L.pts.get(started.parent)! : to, k = ease((simT - started.tStart!) / 380);
      head.setAttribute('transform', `translate(${from.x + (to.x - from.x) * k} ${from.y + (to.y - from.y) * k}) rotate(${(uMs / 14) % 360})`); head.style.opacity = '1';
    } else head.style.opacity = '0';
    const crawled = pages.filter((u) => u.state === 'ok' || u.state === 'redirect').length, errs = pages.filter((u) => ['client', 'server', 'network'].includes(u.state)).length;
    const counts = `<div><dt>Discovered</dt><dd>${pages.length}</dd></div><div><dt>Crawled</dt><dd>${crawled}</dd></div><div><dt>Errors</dt><dd>${errs}</dd></div><div><dt>External</dt><dd>${urls.length - pages.length}</dd></div><div><dt>Duplicates skipped</dt><dd>${st.dups}</dd></div>`;
    if (counts !== lastSig) { lastSig = counts; $('[data-counts]').innerHTML = counts; }
    const q = st.queue.slice(0, 6).map((u) => `<li>${esc(short(u))}</li>`).join('') + (st.queue.length > 6 ? `<li class="more">+${st.queue.length - 6}</li>` : '') || '<li class="more">empty</li>';
    if (q !== lastQ) { lastQ = q; $('[data-queue]').innerHTML = q; }
    st.workers.forEach((u, i) => {
      const li = laneEls[i], busy = !!u; li.classList.toggle('is-busy', busy);
      const sp = li.lastElementChild as HTMLElement, tx = busy ? short(u!) : 'idle'; if (sp.textContent !== tx) sp.textContent = tx;
      const bar = li.querySelector('u') as HTMLElement;
      if (busy) { const s = st.urls.get(u!)!, d = doneAt.get(u!)!; bar.style.transform = `scaleX(${clamp((simT - s.tStart!) / Math.max(1, d - s.tStart!)).toFixed(3)})`; } else bar.style.transform = 'scaleX(0)';
    });
    const cur = hover ?? started?.url ?? fx.start, done = st.reported;
    const rp = done ? ease((uMs - INTRO - CRAWL) / REPORT_BUILD) : 0;
    const now = $('[data-now]'); now.style.opacity = String(hover ? 1 : 1 - rp);
    const html = detail(st.urls.get(cur), cur);
    if (now.dataset.h !== html) { now.dataset.h = html; now.innerHTML = html; }
    const rep = $('[data-report]'); rep.style.opacity = String(hover ? 0 : rp); rep.style.visibility = rp > 0 && !hover ? 'visible' : 'hidden';
    if (rp > 0 && !rep.dataset.built) {
      const g = (s: U['state']) => pages.filter((u) => u.state === s).length;
      const ok = g('ok') + g('redirect'), c4 = g('client'), c5 = g('server'), net = g('network'), tot = pages.length;
      rep.dataset.built = '1'; rep.dataset.v = JSON.stringify({ ok, c4, c5, net, tot });
      rep.innerHTML = `<p class="cx__k">Crawl report</p><p class="cx__tot"><b data-n="tot">0</b> pages · <b data-n="ok">0</b> ok · <b data-n="bad">0</b> errors</p>
        <div class="cx__bar"><i data-seg="ok"></i><i data-seg="c4"></i><i data-seg="c5"></i><i data-seg="net"></i></div>
        <ul class="cx__rows"><li><span>Successful</span><b>${ok}</b></li><li><span>Client errors 4xx</span><b>${c4}</b></li><li><span>Server errors 5xx</span><b>${c5}</b></li><li><span>Network errors</span><b>${net}</b></li><li><span>External links</span><b>${urls.length - tot}</b></li><li><span>Malformed links</span><b>${st.malformed.length}</b></li></ul>`;
    }
    if (rp > 0 && rep.dataset.v) {
      const v = JSON.parse(rep.dataset.v) as Record<string, number>;
      const set = (n: string, val: number) => { const el = rep.querySelector(`[data-n="${n}"]`); if (el) el.textContent = String(Math.round(val * rp)); };
      set('tot', v.tot); set('ok', v.ok); set('bad', v.c4 + v.c5 + v.net);
      (['ok', 'c4', 'c5', 'net'] as const).forEach((s) => { const el = rep.querySelector<HTMLElement>(`[data-seg="${s}"]`); if (el) el.style.width = `${(v[s] / v.tot) * 100 * rp}%`; });
    }
    if (rp === 0 && rep.dataset.built) { delete rep.dataset.built; rep.innerHTML = ''; }
  }

  build();
  const loop = createLoop(root, { cycle: CYCLE, reduced: opts.reduced, staticU: INTRO + CRAWL + HOLD * 0.55, render });
  new ResizeObserver(() => { const m = root.clientWidth < 640 ? 'tall' : 'wide'; if (m !== mode) { mode = m; build(); loop.redraw(); } }).observe(root);
  (root as unknown as { __cx: unknown }).__cx = { seek: (ms: number) => loop.seek(ms), get pos() { return loop.pos; }, get running() { return loop.running; }, cycle: CYCLE, get reported() { return st.reported; } };
}
