/**
 * CLI Web Crawler demonstration (frontend replay of a sample run).
 * run() follows crawler/core.py statement by statement: a list used as a FIFO queue, a global `visited` set,
 * `depth > args.depth` skipped, robots.txt consulted before a URL is added to `visited`, a failed fetch printed
 * as [ERROR] and dropped, keyword search as a case-insensitive substring, link filters for --internal-only /
 * --external-only, and either a summary or an --output file at the end. Pages are fixtures (src/data/demos.ts);
 * nothing is fetched and no visitor-supplied URL is ever crawled.
 */
import { cliFixture as fx, type CliPage } from '../data/demos';

interface Opts { depth: number; maxPages: number; search: string; scope: 'all' | 'internal' | 'external'; verbose: boolean; output: boolean }
interface Step { lines: string[]; queue: { url: string; depth: number }[]; visited: number; current: string; tag?: { text: string; kind: 'ok' | 'warn' | 'bad' | 'dim' | 'hit' }; progress: number; results: { url: string; title: string; hit: boolean }[]; quick?: boolean }

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const pageBy = new Map<string, CliPage>(fx.pages.map((p) => [p.url, p]));
const host = (u: string) => new URL(u).host;
const robotsOk = (u: string) => { const r = fx.robots[host(u)]; if (!r) return true; const p = new URL(u).pathname; return !r.some((d) => p.startsWith(d)); };
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

export function run(o: Opts): { steps: Step[]; file: string } {
  const visited = new Set<string>();
  const queue: [string, number][] = [[fx.start, 0]];
  const results: { url: string; title: string; hit: boolean }[] = [];
  const steps: Step[] = [];
  let progress = 0;
  const snap = (current: string, lines: string[], tag?: Step['tag'], quick = false) =>
    steps.push({ lines, queue: queue.map(([url, depth]) => ({ url, depth })), visited: visited.size, current, tag, progress, results: results.slice(), quick });

  snap('', [`Crawling ${fx.start} with max depth=${o.depth} and max pages=${o.maxPages}`], { text: 'start URL queued at depth 0', kind: 'dim' });
  while (queue.length && visited.size < o.maxPages) {
    const [url, depth] = queue.shift()!;
    if (visited.has(url) || depth > o.depth) { snap(url, [], { text: visited.has(url) ? 'already visited, skipped' : `depth ${depth} > ${o.depth}, skipped`, kind: 'dim' }, true); continue; }
    if (!robotsOk(url)) { snap(url, o.verbose ? [`<span class="c-bad">[robots.txt] Disallowed:</span> ${esc(url)}`] : [], { text: 'robots.txt: disallowed', kind: 'bad' }); continue; }
    visited.add(url);
    const pg = pageBy.get(url);
    if (!pg || pg.fail) { snap(url, [`<span class="c-bad">[ERROR]</span> Failed to fetch ${esc(url)}: 404 Client Error: Not Found for url: ${esc(url)}`], { text: 'fetch failed, dropped', kind: 'bad' }); continue; }
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
    snap(url, lines, { text: `${queued} queued${filtered ? ` · ${filtered} filtered (${o.scope}-only)` : ''}${hit ? ' · keyword match' : ''}`, kind: hit ? 'hit' : 'ok' });
  }
  const body = results.map((r) => `${r.url}\nTitle: ${r.title}\nKeyword found: ${r.hit ? '✔️' : '❌'}\n`);
  const fin: string[] = [];
  if (o.output) fin.push(`<span class="c-dim">(results written to results.txt: ${results.length} pages)</span>`);
  else { fin.push('', '--- Crawl Summary ---'); for (const r of results) fin.push(esc(r.url), `Title: ${esc(r.title)}`, `Keyword found: ${r.hit ? '<span class="c-hit">✔️</span>' : '❌'}`, ''); }
  queue.length = 0;
  snap('', fin, { text: o.output ? 'file written' : 'summary printed', kind: 'ok' });
  return { steps, file: body.join('\n') };
}

/* ------------------------------------------------------------------ UI */
export function initCliDemo(root: HTMLElement, opts: { reduced: boolean }) {
  const o: Opts = { depth: fx.defaults.depth, maxPages: fx.defaults.maxPages, search: 'backup', scope: 'all', verbose: true, output: false };
  let sim = run(o), i = 0, playing = false, speed = 1, started = false, visible = false, acc = 0, last = 0, typed = 0, typing = false;

  root.innerHTML = `
  <div class="dm__bar">
    <span class="dm__badge dm__badge--coral" title="Replay of a sample run">Sample run · fixture pages</span>
    <div class="dm__ctrl" role="group" aria-label="Playback">
      <button type="button" class="dm__btn dm__btn--main" data-play>Pause</button>
      <button type="button" class="dm__btn" data-step aria-label="Step to next crawl step">Step</button>
      <button type="button" class="dm__btn" data-replay>Replay</button>
      <button type="button" class="dm__btn" data-speed aria-label="Playback speed">1×</button>
    </div>
  </div>
  <div class="cl__grid">
    <form class="cl__opts" onsubmit="return false" aria-label="Command options">
      <p class="dm__h">Options <span class="dm__dim">from the README</span></p>
      <label>--depth <select data-o="depth"><option>0</option><option>1</option><option selected>2</option><option>3</option></select></label>
      <label>--max-pages <select data-o="maxPages"><option>4</option><option>8</option><option selected>100</option></select></label>
      <label>--search <select data-o="search"><option value="">(none)</option><option selected>backup</option><option>login</option></select></label>
      <fieldset><legend>Links</legend>
        <label><input type="radio" name="scope" value="all" checked /> all</label>
        <label><input type="radio" name="scope" value="internal" /> --internal-only</label>
        <label><input type="radio" name="scope" value="external" /> --external-only</label>
      </fieldset>
      <label class="cl__chk"><input type="checkbox" data-o="verbose" checked /> --verbose</label>
      <label class="cl__chk"><input type="checkbox" data-o="output" /> --output results.txt</label>
      <p class="dm__dim cl__hint">Visitor-supplied URLs are never crawled. The pages are fixtures; the keyword choices are presets.</p>
    </form>
    <div class="cl__term" role="region" aria-label="Terminal">
      <div class="cl__chrome"><i></i><i></i><i></i><span>sample run</span></div>
      <pre class="cl__out" data-out tabindex="0" aria-live="off"></pre>
      <div class="cl__prog" aria-hidden="true"><span data-pct>0%</span><i><b data-bar></b></i><span data-count>0/100</span></div>
    </div>
    <div class="cl__state">
      <p class="dm__h">Crawl queue <span class="dm__dim" data-visited>visited 0</span></p>
      <p class="cl__cur" data-cur></p>
      <ol class="cl__queue" data-queue></ol>
      <p class="dm__h">Results <span class="dm__dim" data-rcount>0</span></p>
      <ul class="cl__results" data-results></ul>
      <div class="cl__file" data-file hidden></div>
    </div>
  </div>
  <p class="dm__note">Sample data, not a live crawl. The run follows <code>crawler/core.py</code>: FIFO queue, <code>visited</code> set, robots.txt check before visiting (fails open if unreachable), <code>--search</code> as a case-insensitive substring match. Link order is sorted here; the Python code iterates a set.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const outEl = $('[data-out]');

  function paint() {
    const cmd = command(o);
    const upto = sim.steps.slice(0, i);
    const prompt = `<span class="c-dim">$</span> ${esc(cmd.slice(0, typing ? typed : cmd.length))}${typing ? '<span class="cl__caret"></span>' : ''}`;
    const body = typing ? '' : upto.flatMap((s) => s.lines).join('\n');
    outEl.innerHTML = prompt + (body ? '\n' + body : '');
    outEl.scrollTop = outEl.scrollHeight;
    const cur = upto[upto.length - 1];
    const pct = Math.round(((cur?.progress ?? 0) / o.maxPages) * 100);
    $('[data-pct]').textContent = pct + '%'; ($('[data-bar]') as HTMLElement).style.width = pct + '%'; $('[data-count]').textContent = `${cur?.progress ?? 0}/${o.maxPages}`;
    $('[data-visited]').textContent = 'visited ' + (cur?.visited ?? 0);
    $('[data-cur]').innerHTML = cur && cur.tag ? `<code>${esc(cur.current || fx.start)}</code><span class="cl__tag cl__tag--${cur.tag.kind}">${esc(cur.tag.text)}</span>` : '<span class="dm__dim">waiting</span>';
    $('[data-queue]').innerHTML = cur ? (cur.queue.slice(0, 8).map((q) => `<li><code>${esc(q.url.replace('https://', ''))}</code><i>d${q.depth}</i></li>`).join('') + (cur.queue.length > 8 ? `<li class="dm__dim">+ ${cur.queue.length - 8} more</li>` : '') || '<li class="dm__dim">empty</li>') : '';
    const res = cur?.results ?? [];
    $('[data-rcount]').textContent = String(res.length);
    $('[data-results]').innerHTML = res.map((r) => `<li class="${r.hit ? 'is-hit' : ''}"><code>${esc(r.url.replace('https://', ''))}</code><span>${esc(r.title)}</span><b>${o.search ? (r.hit ? '✔️' : '❌') : ''}</b></li>`).join('');
    const file = $('[data-file]'); const done = i >= sim.steps.length;
    if (o.output && done && !typing) { file.hidden = false; file.innerHTML = `<p class="dm__h">results.txt</p><pre>${esc(sim.file)}</pre>`; } else file.hidden = true;
    const pb = $('[data-play]'); const lbl = playing ? 'Pause' : 'Play'; pb.textContent = lbl;
  }

  function restart(autoplay = true) {
    sim = run(o); i = 0; acc = 0; last = 0;
    typing = !opts.reduced && autoplay; typed = 0; playing = autoplay;
    if (opts.reduced) { typing = false; i = sim.steps.length; playing = false; }
    paint();
  }
  const bind = () => {
    root.querySelectorAll<HTMLSelectElement>('select[data-o]').forEach((s) => s.addEventListener('change', () => { const k = s.dataset.o as 'depth' | 'maxPages' | 'search'; (o as unknown as Record<string, unknown>)[k] = k === 'search' ? s.value : +s.value; restart(!opts.reduced); }));
    root.querySelectorAll<HTMLInputElement>('input[data-o]').forEach((c) => c.addEventListener('change', () => { (o as unknown as Record<string, unknown>)[c.dataset.o!] = c.checked; restart(!opts.reduced); }));
    root.querySelectorAll<HTMLInputElement>('input[name=scope]').forEach((r) => r.addEventListener('change', () => { o.scope = r.value as Opts['scope']; restart(!opts.reduced); }));
    $('[data-play]').addEventListener('click', () => { if (i >= sim.steps.length) restart(true); else { playing = !playing; last = 0; paint(); } });
    $('[data-replay]').addEventListener('click', () => restart(!opts.reduced));
    $('[data-step]').addEventListener('click', () => { playing = false; typing = false; if (i < sim.steps.length) i++; paint(); });
    $('[data-speed]').addEventListener('click', (e) => { speed = speed === 1 ? 2 : speed === 2 ? 4 : 1; (e.currentTarget as HTMLElement).textContent = speed + '×'; });
  };
  bind();

  const frame = (now: number) => {
    if (playing && visible) {
      if (last) {
        const dt = (now - last) * speed; last = now;
        if (typing) { typed += dt / 22; if (typed >= command(o).length) { typing = false; acc = 0; } paint(); }
        else {
          acc += dt;
          while (i < sim.steps.length && acc >= (sim.steps[i].quick ? 90 : 520)) { acc -= sim.steps[i].quick ? 90 : 520; i++; }
          if (i >= sim.steps.length) playing = false;
          paint();
        }
      } else last = now;
    } else last = 0;
    requestAnimationFrame(frame);
  };
  paint(); requestAnimationFrame(frame);
  new IntersectionObserver(([en]) => {
    visible = en.isIntersecting;
    if (visible && !started) { started = true; restart(!opts.reduced); }
  }, { threshold: 0.35 }).observe(root);
  (root as unknown as { __cli: unknown }).__cli = { get i() { return i; }, get n() { return sim.steps.length; }, get playing() { return playing; } };
}
