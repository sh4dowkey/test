/**
 * CLI Web Crawler demonstration: a self-running replay of one documented sample run (no controls).
 * run() follows crawler/core.py statement by statement: list used as a FIFO queue, global `visited` set,
 * `depth > args.depth` skipped, robots.txt consulted before a URL joins `visited` (fails open), a failed fetch printed
 * as [ERROR] and dropped, --search as a case-insensitive substring, --internal-only / --external-only filters and,
 * with --output, a file written silently (nothing is printed), otherwise a summary. Pages are fixtures
 * (src/data/demos.ts); nothing is fetched and no visitor-supplied URL is ever crawled.
 * Terminal, queue, robots.txt panel and results ledger are all driven by the same step list and one loop position.
 */
import { cliFixture as fx, type CliPage } from '../data/demos';
import { createLoop, clamp, ease, esc } from './loop';

interface Opts { depth: number; maxPages: number; search: string; scope: 'all' | 'internal' | 'external'; verbose: boolean; output: boolean }
type Kind = 'ok' | 'bad' | 'hit' | 'dim';
interface Step { lines: string[]; queue: { url: string; depth: number }[]; visited: number; current: string; tag: { text: string; kind: Kind }; progress: number; results: { url: string; title: string; hit: boolean }[]; quick: boolean; stage: number; final?: boolean }

const pageBy = new Map<string, CliPage>(fx.pages.map((p) => [p.url, p]));
const host = (u: string) => new URL(u).host;
const disallowedBy = (u: string) => { const r = fx.robots[host(u)]; if (!r) return null; const p = new URL(u).pathname; return r.find((d) => p.startsWith(d)) ?? null; };
const isInternal = (a: string, b: string) => host(a) === host(b);

export function command(o: Opts) {
  const parts = ['python', 'cli.py', fx.start];
  if (o.depth !== fx.defaults.depth) parts.push('--depth', String(o.depth));
  if (o.maxPages !== fx.defaults.maxPages) parts.push('--max-pages', String(o.maxPages));
  if (o.search) parts.push('--search', o.search);
  if (o.scope === 'internal') parts.push('--internal-only'); if (o.scope === 'external') parts.push('--external-only');
  if (o.verbose) parts.push('--verbose');
  if (o.output) parts.push('--output', 'results.txt');
  return parts.join(' ');
}

/** Stage indexes for the progress rail. */
const STAGES = ['Command', 'robots.txt', 'Queue', 'Fetch and parse', 'Filter', 'Keyword', 'Output'];

export function run(o: Opts): { steps: Step[]; file: string } {
  const visited = new Set<string>(), queue: [string, number][] = [[fx.start, 0]], results: { url: string; title: string; hit: boolean }[] = [], steps: Step[] = [];
  let progress = 0;
  const snap = (current: string, lines: string[], tag: Step['tag'], stage: number, quick = false, final = false) =>
    steps.push({ lines, queue: queue.map(([url, depth]) => ({ url, depth })), visited: visited.size, current, tag, progress, results: results.slice(), quick, stage, final });
  snap('', [`Crawling ${fx.start} with max depth=${o.depth} and max pages=${o.maxPages}`], { text: 'seed URL queued at depth 0', kind: 'dim' }, 2);
  while (queue.length && visited.size < o.maxPages) {
    const [url, depth] = queue.shift()!;
    if (visited.has(url) || depth > o.depth) { snap(url, [], { text: visited.has(url) ? 'already visited' : `depth ${depth} > ${o.depth}`, kind: 'dim' }, 2, true); continue; }
    const rule = disallowedBy(url);
    if (rule) { snap(url, o.verbose ? [`<span class="c-bad">[robots.txt] Disallowed:</span> ${esc(url)}`] : [], { text: `robots.txt disallows ${rule}`, kind: 'bad' }, 1); continue; }
    visited.add(url);
    const pg = pageBy.get(url);
    if (!pg || pg.fail) { snap(url, [`<span class="c-bad">[ERROR]</span> Failed to fetch ${esc(url)}: 404 Client Error: Not Found for url: ${esc(url)}`], { text: 'fetch failed, dropped', kind: 'bad' }, 3); continue; }
    const hit = o.search ? pg.text.toLowerCase().includes(o.search.toLowerCase()) : false;
    results.push({ url, title: pg.title, hit });
    const lines: string[] = [];
    if (o.verbose) lines.push(`Visited: ${esc(url)} | Title: ${esc(pg.title)} | Keyword: ${hit ? '<span class="c-hit">✔️</span>' : '❌'}`);
    let queued = 0, filtered = 0;
    for (const link of [...new Set(pg.links)].sort()) {
      if (o.scope === 'internal' && !isInternal(fx.start, link)) { filtered++; continue; }
      if (o.scope === 'external' && isInternal(fx.start, link)) { filtered++; continue; }
      if (!visited.has(link)) { queue.push([link, depth + 1]); queued++; }
    }
    progress = results.length;
    snap(url, lines, { text: `${queued} link${queued === 1 ? '' : 's'} queued${hit ? ' · keyword match' : ''}`, kind: hit ? 'hit' : 'ok' }, hit ? 5 : 3);
  }
  const fin: string[] = [];
  if (!o.output) { fin.push('', '--- Crawl Summary ---'); for (const r of results) fin.push(esc(r.url), `Title: ${esc(r.title)}`, `Keyword found: ${r.hit ? '<span class="c-hit">✔️</span>' : '❌'}`, ''); }
  queue.length = 0;
  snap('', fin, { text: o.output ? 'results.txt written' : 'summary printed', kind: 'ok' }, 6, false, true);
  return { steps, file: results.map((r) => `${r.url}\nTitle: ${r.title}\nKeyword found: ${r.hit ? '✔️' : '❌'}\n`).join('\n') };
}

export function initCliDemo(root: HTMLElement, opts: { reduced: boolean }) {
  const o: Opts = { depth: fx.defaults.depth, maxPages: fx.defaults.maxPages, search: 'backup', scope: 'all', verbose: true, output: true };
  const sim = run(o), cmd = command(o);
  const TYPE_MS = 34, TYPE = cmd.length * TYPE_MS, GAP = 700, HOLD = 5200;
  const starts: number[] = []; let acc = TYPE + GAP; sim.steps.forEach((s) => { starts.push(acc); acc += s.quick ? 170 : 780; });
  const CYCLE = acc + HOLD;
  const ruleLines = (fx.robots['notes.sample.test'] ?? []);

  root.innerHTML = `
  <div class="dm__bar">
    <span class="dm__badge dm__badge--ink" title="Replay of a sample run">Sample run · fixture pages</span>
    <ol class="cl__rail" data-rail aria-label="Stages of the run">${STAGES.map((s) => `<li>${s}</li>`).join('')}</ol>
    <span class="dm__loop" aria-hidden="true"><i data-loop></i></span>
  </div>
  <div class="cl__stage" data-stage>
    <div class="cl__term" role="region" aria-label="Terminal output of the sample run">
      <div class="cl__chrome"><i></i><i></i><i></i><span>cli.py · sample run</span></div>
      <pre class="cl__out" data-out></pre>
      <div class="cl__prog" aria-hidden="true"><span data-pct>0%</span><i><b data-bar></b></i><span data-count>0/${o.maxPages}</span></div>
    </div>
    <div class="cl__sheet">
      <section class="cl__robots" aria-label="robots.txt for notes.sample.test">
        <p class="cl__h">robots.txt <span>notes.sample.test</span></p>
        <p class="cl__rl">User-agent: *</p>
        ${ruleLines.map((r) => `<p class="cl__rl" data-rule="${esc(r)}">Disallow: ${esc(r)}</p>`).join('')}
        <p class="cl__check" data-check>waiting</p>
      </section>
      <section class="cl__queuebox" aria-label="Crawl queue"><p class="cl__h">Queue <span data-visited>visited 0</span></p><ol class="cl__queue" data-queue></ol></section>
      <section class="cl__ledger" aria-label="Results"><p class="cl__h" data-lh>Results <span data-rcount>0 pages</span></p><ul data-results></ul><p class="cl__stamp" data-stamp>results.txt saved by --output</p></section>
    </div>
  </div>
  <p class="dm__note">Sample data, not a live crawl. The run follows <code>crawler/core.py</code>: FIFO queue, <code>visited</code> set, robots.txt checked before visiting (fails open if unreachable), <code>--search</code> as a case-insensitive substring match. With <code>--output</code> the real tool writes the file silently, so the terminal shows no summary. Link order is sorted here; the Python code iterates a set.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const out = $('[data-out]'), stage = $('[data-stage]'), rail = Array.from($('[data-rail]').children) as HTMLElement[];
  let shown = -1, lastQ = '', lastR = '';
  const promptHtml = (n: number) => `<span class="c-dim">$</span> ${esc(cmd.slice(0, n))}`;

  function render(u: number, fade: number) {
    stage.style.setProperty('--fade', String(fade));
    $('[data-loop]').style.transform = `scaleX(${(u / CYCLE).toFixed(4)})`;
    // how many steps have started
    let n = 0; while (n < starts.length && u >= starts[n]) n++;
    const typed = clamp(u / TYPE) * cmd.length;
    if (n < shown) { out.innerHTML = ''; shown = -1; lastQ = ''; lastR = ''; }
    if (shown === -1) { out.innerHTML = `<span data-p></span>`; shown = 0; }
    const p = out.firstElementChild as HTMLElement; const typing = u < TYPE;
    const ph = promptHtml(Math.round(typed)) + (typing || n === 0 ? '<span class="cl__caret"></span>' : ''); if (p.dataset.h !== ph) { p.dataset.h = ph; p.innerHTML = ph; }
    while (shown < n) { const s = sim.steps[shown]; s.lines.forEach((l) => { const d = document.createElement('span'); d.className = 'cl__ln'; d.innerHTML = '\n' + l; out.appendChild(d); }); shown++; out.scrollTop = out.scrollHeight; }
    const cur = n > 0 ? sim.steps[n - 1] : null;
    // rail: which part of the process is active
    const sinceStep = cur ? u - starts[n - 1] : 0; const active = !cur ? 0 : cur.final ? 6 : sinceStep < 260 && cur.stage !== 1 && cur.stage !== 2 ? 3 : cur.stage;
    rail.forEach((li, i) => { li.classList.toggle('is-on', i === active); li.classList.toggle('is-past', i < active || (cur?.final && i <= 6)); });
    const pct = Math.round(((cur?.progress ?? 0) / o.maxPages) * 100);
    $('[data-pct]').textContent = pct + '%'; ($('[data-bar]') as HTMLElement).style.width = Math.max(pct, cur ? 2 : 0) + '%'; $('[data-count]').textContent = `${cur?.progress ?? 0}/${o.maxPages}`;
    // robots.txt panel
    const chk = $('[data-check]');
    const robotsHit = cur && cur.tag.kind === 'bad' && cur.tag.text.startsWith('robots');
    const rule = robotsHit ? cur!.tag.text.replace('robots.txt disallows ', '') : '';
    root.querySelectorAll('[data-rule]').forEach((el) => el.classList.toggle('is-hit', (el as HTMLElement).dataset.rule === rule));
    chk.innerHTML = !cur || !cur.current ? 'checking the seed URL…' : robotsHit ? `<b class="is-bad">disallowed</b> ${esc(new URL(cur.current).pathname)}` : cur.tag.text.includes('depth') || cur.tag.text.includes('visited') ? `<span class="dim">skipped</span> ${esc(new URL(cur.current).pathname)}` : `<b>allowed</b> ${esc(new URL(cur.current).pathname)}`;
    // queue ribbon
    const q = !cur ? '' : cur.queue.slice(0, 7).map((x) => `<li><span>${esc(x.url.replace('https://', '').replace(/\/$/, '') || x.url)}</span><i>d${x.depth}</i></li>`).join('') + (cur.queue.length > 7 ? `<li class="more">+${cur.queue.length - 7}</li>` : '') || '<li class="more">empty</li>';
    if (q !== lastQ) { lastQ = q; $('[data-queue]').innerHTML = q; }
    $('[data-visited]').textContent = 'visited ' + (cur?.visited ?? 0);
    // results ledger
    const res = cur?.results ?? [];
    const r = res.map((x) => `<li class="${x.hit ? 'is-hit' : ''}"><code>${esc(x.url.replace('https://', ''))}</code><span>${esc(x.title)}</span><b>${x.hit ? 'match' : ''}</b></li>`).join('');
    if (r !== lastR) { lastR = r; $('[data-results]').innerHTML = r; const l = $('[data-results]'); l.scrollTop = l.scrollHeight; }
    $('[data-rcount]').textContent = `${res.length} page${res.length === 1 ? '' : 's'}`;
    const fin = !!cur?.final; $('[data-lh]').firstChild!.textContent = fin ? 'results.txt ' : 'Results '; $('[data-stamp]').style.opacity = String(fin ? ease((u - starts[n - 1]) / 500) : 0);
    stage.classList.toggle('is-final', fin);
  }

  const loop = createLoop(root, { cycle: CYCLE, reduced: opts.reduced, staticU: CYCLE - HOLD * 0.6, render });
  (root as unknown as { __cli: unknown }).__cli = { seek: (ms: number) => loop.seek(ms), get pos() { return loop.pos; }, get running() { return loop.running; }, cycle: CYCLE, steps: sim.steps.length, get text() { return out.textContent; } };
}
