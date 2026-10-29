/**
 * Project Cerberus simulation. One state object drives every view:
 *   step      0..7   scenario progress; events, alerts, hunts and timeline items are all filtered by it
 *   host      selected machine (architecture view, also set by selecting an event)
 *   stage     selected pipeline stage
 *   ev        selected event (shown through the lens of the selected stage)
 *   hunt      active saved search;  filter  free text over the visible events
 * Going back a step removes everything that belongs to later steps, so the views can never disagree.
 * All data is fixture data from src/data/cerberus.ts. Nothing is executed and nothing is fetched.
 */
import { machines, edges, stages, rules, events, alerts, hunts, steps, timeline, statusLabel, liveRequirements, type Ev } from '../data/cerberus';

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
const NS = 'http://www.w3.org/2000/svg';
type Tab = 'arch' | 'telemetry' | 'scenario';
const machineBy = new Map(machines.map((m) => [m.id, m]));
const ruleBy = new Map(rules.map((r) => [r.id, r]));
const evBy = new Map(events.map((e) => [e.id, e]));
const NSTEPS = steps.length;

export function initCerberus(root: HTMLElement, opts: { reduced: boolean }) {
  const S = { tab: 'arch' as Tab, step: 0, host: 'dc01' as string | null, stage: 'collect', ev: null as string | null, hunt: null as string | null, filter: '', layer: 'all' as 'all' | 'identity' | 'telemetry' | 'attack', playing: false };
  let timer = 0, flowTimer = 0;

  root.innerHTML = `
  <div class="cb__top">
    <p class="cb__sim" role="note"><b>Simulation</b> Fixture events replayed in your browser. No VMs, SIEM or attacks are running.</p>
    <dl class="cb__stats" aria-live="polite">
      <div><dt>Step</dt><dd data-k="step">0/${NSTEPS}</dd></div><div><dt>Events ingested</dt><dd data-k="events">0</dd></div>
      <div><dt>Alerts</dt><dd data-k="alerts">0</dd></div><div><dt>Hosts involved</dt><dd data-k="hosts">0</dd></div><div><dt>Accounts</dt><dd data-k="accts">0</dd></div>
    </dl>
  </div>
  <div class="cb__ctrl">
    <div class="cb__btns" role="group" aria-label="Scenario controls">
      <button type="button" class="dm__btn" data-act="reset">Reset</button>
      <button type="button" class="dm__btn" data-act="prev" aria-label="Previous step">Back</button>
      <button type="button" class="dm__btn dm__btn--main" data-act="next" aria-label="Next step">Next step</button>
      <button type="button" class="dm__btn" data-act="play" aria-pressed="false">Auto-play</button>
    </div>
    <ol class="cb__dots" aria-label="Scenario steps">${steps.map((s) => `<li><button type="button" data-act="goto" data-n="${s.n}" aria-label="Step ${s.n}: ${esc(s.name)}"><i></i><span>${esc(s.name)}</span></button></li>`).join('')}</ol>
  </div>
  <div class="cb__tabs" role="tablist" aria-label="Views">
    <button role="tab" id="cb-t-arch" aria-controls="cb-p-arch" data-tab="arch">Architecture</button>
    <button role="tab" id="cb-t-telemetry" aria-controls="cb-p-telemetry" data-tab="telemetry">Telemetry pipeline</button>
    <button role="tab" id="cb-t-scenario" aria-controls="cb-p-scenario" data-tab="scenario">Scenario and investigation</button>
  </div>

  <div class="cb__panel" role="tabpanel" id="cb-p-arch" aria-labelledby="cb-t-arch" data-p="arch">
    <div class="cb__arch">
      <div class="cb__map">
        <div class="cb__layers" role="group" aria-label="Show connections">
          ${(['all', 'identity', 'telemetry', 'attack'] as const).map((l) => `<button type="button" data-layer="${l}" aria-pressed="${l === 'all'}">${{ all: 'All', identity: 'Identity', telemetry: 'Log flow', attack: 'Emulated path' }[l]}</button>`).join('')}
        </div>
        <svg viewBox="0 0 760 420" role="group" aria-label="Lab topology. Select a machine to see its details." data-svg>
          <rect class="cb__net" x="28" y="24" width="704" height="384" rx="22"/>
          <text class="cb__nettxt" x="48" y="50">Isolated lab network (host-only)</text>
          <g data-edges></g><g data-nodes></g>
        </svg>
        <p class="cb__legend" aria-hidden="true"><i class="s s--built"></i>built <i class="s s--unverified"></i>unverified <i class="s s--planned"></i>planned</p>
      </div>
      <div class="cb__detail" data-host-detail aria-live="polite"></div>
    </div>
  </div>

  <div class="cb__panel" role="tabpanel" id="cb-p-telemetry" aria-labelledby="cb-t-telemetry" data-p="telemetry" hidden>
    <ol class="cb__pipe" data-pipe></ol>
    <div class="cb__tele">
      <div class="cb__stagebox" data-stage-detail aria-live="polite"></div>
      <div class="cb__streambox">
        <div class="cb__streamhead">
          <p class="dm__h">Event stream <span class="dm__dim" data-stream-count></span></p>
          <input type="search" data-filter placeholder="Filter: host, account, event ID" aria-label="Filter visible events" />
        </div>
        <div class="cb__hunts" data-hunts></div>
        <ul class="cb__stream" data-stream></ul>
      </div>
    </div>
  </div>

  <div class="cb__panel" role="tabpanel" id="cb-p-scenario" aria-labelledby="cb-t-scenario" data-p="scenario" hidden>
    <div class="cb__scen">
      <div class="cb__stepcard" data-stepcard aria-live="polite"></div>
      <div class="cb__side2">
        <div data-alerts></div>
        <div data-cbtl></div>
      </div>
    </div>
    <div class="cb__evbox" data-evbox></div>
  </div>

  <details class="cb__live"><summary>What a live connection would need</summary>
    <ul>${liveRequirements.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('')}</ul>
    <p class="dm__dim">The design keeps the data in structured files shaped like SIEM documents, so a read-only API can replace them without changing the views.</p>
  </details>
  <p class="dm__note">Event IDs are the standard Windows and Sysmon ones. Accounts, timings, the template name and every alert are invented fixtures, not captured from a lab. Built or planned status comes from the public repository and the owner’s brief. <a href="https://github.com/sh4dowkey/ad-attack-defense-lab" rel="noopener">Public lab repository</a>.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const $$ = <T extends Element = HTMLElement>(s: string) => Array.from(root.querySelectorAll<T>(s));
  const visible = () => events.filter((e) => e.step <= S.step);
  const mk = (tag: string, attrs: Record<string, string>, parent?: Element) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };

  /* ---------------------------------------------------------- persistent SVG */
  const nodesG = $('[data-nodes]'), edgesG = $('[data-edges]');
  const edgeEls = new Map<string, SVGLineElement>(), nodeEls = new Map<string, SVGGElement>();
  edges.forEach((e) => { const a = machineBy.get(e.a)!, b = machineBy.get(e.b)!; edgeEls.set(e.id, mk('line', { x1: String(a.x), y1: String(a.y), x2: String(b.x), y2: String(b.y), class: 'cb__e cb__e--' + e.layer }, edgesG) as SVGLineElement); });
  machines.forEach((m) => {
    const g = mk('g', { class: 'cb__n', transform: `translate(${m.x} ${m.y})`, tabindex: '0', role: 'button', 'data-id': m.id, 'aria-label': `${m.name}, ${m.role}, ${statusLabel[m.status]}` }, nodesG) as SVGGElement;
    mk('rect', { class: 'cb__nbox', x: '-62', y: '-30', width: '124', height: '60', rx: '14' }, g);
    mk('circle', { class: 'cb__ndot', cx: '-46', cy: '-14', r: '4.5' }, g);
    const t = mk('text', { class: 'cb__nname', x: '-36', y: '-9' }, g); t.textContent = m.name;
    const r = mk('text', { class: 'cb__nrole', x: '-50', y: '14' }, g); r.textContent = m.role.length > 24 ? m.role.slice(0, 22) + '…' : m.role;
    mk('circle', { class: 'cb__cnt', cx: '58', cy: '-28', r: '10' }, g); const c = mk('text', { class: 'cb__cnttxt', x: '58', y: '-24.5', 'text-anchor': 'middle' }, g); c.setAttribute('data-cnt', m.id);
    mk('circle', { class: 'cb__al', cx: '58', cy: '28', r: '5' }, g);
    nodeEls.set(m.id, g);
    const pick = () => { S.host = m.id; draw(); };
    g.addEventListener('click', pick);
    g.addEventListener('keydown', (e) => { const k = (e as KeyboardEvent).key; if (k === 'Enter' || k === ' ') { e.preventDefault(); pick(); } });
  });

  function drawArch() {
    const vis = visible(), curEdges = new Set(S.step ? steps[S.step - 1].edges : []);
    const hostsWithEv = new Set(vis.map((e) => e.host));
    edges.forEach((e) => {
      const el = edgeEls.get(e.id)!;
      el.classList.toggle('is-dim', S.layer !== 'all' && S.layer !== e.layer);
      el.classList.toggle('is-on', curEdges.has(e.id));
      el.classList.toggle('is-flow', e.layer === 'telemetry' && hostsWithEv.has(e.a));
    });
    const alerting = new Set(alerts.filter((a) => a.step <= S.step).map((a) => a.host));
    machines.forEach((m) => {
      const g = nodeEls.get(m.id)!;
      g.dataset.status = m.status; g.classList.toggle('is-sel', S.host === m.id);
      g.classList.toggle('has-ev', vis.some((e) => e.host === m.id)); g.classList.toggle('has-alert', alerting.has(m.id));
      const n = vis.filter((e) => e.host === m.id).length;
      g.querySelector('[data-cnt]')!.textContent = String(n);
      g.classList.toggle('show-cnt', n > 0);
    });
    // host details
    const m = S.host ? machineBy.get(S.host) : null, d = $('[data-host-detail]');
    if (!m) { d.innerHTML = '<p class="dm__dim">Select a machine.</p>'; return; }
    const hev = vis.filter((e) => e.host === m.id), hal = alerts.filter((a) => a.step <= S.step && a.host === m.id);
    d.innerHTML = `<p class="dm__h">${esc(m.name)} <span class="cb__st cb__st--${m.status}">${statusLabel[m.status]}</span></p>
      <p class="cb__role">${esc(m.role)}</p>
      <dl class="cb__kv">${m.os ? `<div><dt>OS</dt><dd>${esc(m.os)}</dd></div>` : ''}${m.ip ? `<div><dt>Address</dt><dd><code>${m.ip}</code></dd></div>` : ''}<div><dt>Source</dt><dd>${esc(m.source)}</dd></div></dl>
      <p class="dm__h dm__h--s">Services</p><ul class="cb__svc">${m.services.map((s) => `<li><i class="s s--${s.status}"></i>${esc(s.name)}<span>${statusLabel[s.status]}</span></li>`).join('')}</ul>
      ${m.review ? `<p class="cb__review"><b>To confirm</b> ${esc(m.review)}</p>` : ''}
      <p class="dm__h dm__h--s">In this simulation</p>
      ${hev.length ? `<ul class="cb__mini">${hev.slice(-4).reverse().map((e) => `<li><button type="button" data-ev="${e.id}"><code>${e.code}</code> ${esc(e.summary)}</button></li>`).join('')}</ul>` : '<p class="dm__dim">No events from this machine yet. Advance the scenario.</p>'}
      ${hal.length ? `<p class="cb__alertline">${hal.length} alert${hal.length > 1 ? 's' : ''}: ${hal.map((a) => esc(a.rule)).join(', ')}</p>` : ''}`;
  }

  /* ---------------------------------------------------------- telemetry */
  const rep = (stage: string, e: Ev) => {
    const host = machineBy.get(e.host)!.name;
    const vis = alerts.filter((a) => a.step <= S.step && a.triggers.includes(e.id));
    switch (stage) {
      case 'endpoint': return { Channel: e.channel, EventID: e.code, Computer: host, ...e.fields };
      case 'forward': return { agent: 'winlogbeat', 'host.name': host, 'winlog.channel': e.channel, 'winlog.event_id': e.code, shipped_at: 'T+' + e.t };
      case 'collect': return { '@timestamp': 'T+' + e.t, 'event.code': e.code, 'host.name': host, 'user.name': e.user, 'winlog.event_data': e.fields };
      case 'index': return { _index: 'winlogbeat-fixture', _id: e.id, searchable_by: ['host.name', 'user.name', 'event.code'] };
      case 'detect': return { rules_evaluated: rules.length - 1, matched: e.rules.length ? e.rules : 'none' };
      default: return { contributes_to: vis.length ? vis.map((a) => `${a.id} (${a.rule})`) : 'no alert' };
    }
  };
  const countAt = (id: string) => { const v = visible(); return id === 'detect' ? v.filter((e) => e.rules.length).length : id === 'correlate' ? alerts.filter((a) => a.step <= S.step).length : v.length; };

  function drawPipe() {
    $('[data-pipe]').innerHTML = stages.map((s, i) => `<li><button type="button" class="cb__stage ${S.stage === s.id ? 'is-sel' : ''}" style="--i:${i}" data-stage="${s.id}" aria-pressed="${S.stage === s.id}"><span class="cb__sn">${s.n}</span><span class="cb__sname">${esc(s.name)}</span><span class="cb__scount">${countAt(s.id)}</span></button></li>`).join('');
    const st = stages.find((s) => s.id === S.stage)!, e = S.ev ? evBy.get(S.ev) : null, ok = e && e.step <= S.step;
    $('[data-stage-detail]').innerHTML = `<p class="dm__h">${st.n}. ${esc(st.name)} <span class="cb__st cb__st--planned">Planned</span></p>
      <p class="cb__role">${esc(st.where)}</p><p>${esc(st.processes)}</p>
      <dl class="cb__kv"><div><dt>In</dt><dd>${esc(st.input)}</dd></div><div><dt>Out</dt><dd>${esc(st.output)}</dd></div></dl>
      <p class="dm__h dm__h--s">${ok ? `${esc(e!.id)} at this stage` : 'Selected event'}</p>
      ${ok ? `<pre class="cb__json">${esc(JSON.stringify(rep(st.id, e!), null, 2))}</pre><p class="dm__dim">${esc(e!.summary)}</p>` : '<p class="dm__dim">Select an event in the stream to see what this stage holds for it.</p>'}`;
  }

  function drawStream() {
    const h = hunts.find((x) => x.id === S.hunt);
    const f = S.filter.trim().toLowerCase();
    let list = visible().slice().reverse();
    if (h) list = list.filter((e) => h.ids.includes(e.id));
    if (f) list = list.filter((e) => (JSON.stringify(e) + machineBy.get(e.host)!.name).toLowerCase().includes(f));
    $('[data-stream-count]').textContent = `${list.length} of ${visible().length}`;
    $('[data-hunts]').innerHTML = steps.length && S.step >= 6
      ? hunts.map((x) => `<button type="button" data-hunt="${x.id}" aria-pressed="${S.hunt === x.id}">${esc(x.label)}</button>`).join('') + (h ? `<code class="cb__query">${esc(h.query)}</code>` : '')
      : '<span class="dm__dim">Saved hunts unlock at step 6.</span>';
    $('[data-stream]').innerHTML = list.length ? list.map((e) => `<li class="${e.benign ? 'is-benign' : ''} ${S.ev === e.id ? 'is-sel' : ''} ${e.rules.length ? 'is-hit' : ''}"><button type="button" data-ev="${e.id}"><time>${e.t}</time><b>${esc(machineBy.get(e.host)!.name)}</b><code>${e.code}</code><span>${esc(e.summary)}</span>${e.rules.map((r) => `<i class="cb__rule">${r}</i>`).join('')}${e.benign ? '<i class="cb__rule cb__rule--n">normal</i>' : ''}</button></li>`).join('') : `<li class="dm__dim cb__empty">${S.step === 0 ? 'Nothing ingested yet. Press Next step.' : 'No events match.'}</li>`;
  }

  /* ---------------------------------------------------------- scenario */
  function drawScenario() {
    const sc = $('[data-stepcard]');
    if (S.step === 0) sc.innerHTML = `<p class="dm__h">Before the scenario</p><p>The lab is quiet. Seven stages follow the documented emulation: reconnaissance, credential access, lateral movement, an AD CS abuse attempt, a deception alert, threat hunting and a correlated investigation.</p><p><button type="button" class="dm__btn dm__btn--main" data-act="next">Start step 1</button></p>`;
    else {
      const s = steps[S.step - 1], evs = events.filter((e) => e.step === S.step), rs = [...new Set(evs.flatMap((e) => e.rules))].map((r) => ruleBy.get(r)!);
      const showRules = S.step === 5 ? [ruleBy.get('R4')!] : S.step === 7 ? [ruleBy.get('R5')!] : rs;
      sc.innerHTML = `<p class="dm__h">Step ${s.n} of ${NSTEPS} <span class="dm__dim">${esc(s.technique)}</span></p><h4 class="cb__h4">${esc(s.name)}</h4>
        <p>${esc(s.what)}</p><p class="cb__sees"><b>What the SIEM sees</b> ${esc(s.sees)}</p>
        ${evs.length ? `<ul class="cb__mini">${evs.map((e) => `<li><button type="button" data-ev="${e.id}"><time>${e.t}</time> <code>${e.code}</code> ${esc(machineBy.get(e.host)!.name)}: ${esc(e.summary)}</button></li>`).join('')}</ul>` : ''}
        ${showRules.map((r) => `<div class="cb__rulebox"><p><b>${r.id}</b> ${esc(r.name)} <i class="cb__sev cb__sev--${r.severity}">${r.severity}</i></p><pre>${esc(r.logic.join('\n'))}</pre><p class="dm__dim">${esc(r.technique)} · illustrative Sigma-style logic</p></div>`).join('')}`;
    }
    const al = alerts.filter((a) => a.step <= S.step);
    $('[data-alerts]').innerHTML = `<p class="dm__h">Alerts <span class="dm__dim">${al.length}</span></p>` + (al.length ? `<ul class="cb__alerts">${al.slice().reverse().map((a) => { const r = ruleBy.get(a.rule)!; return `<li class="sev-${r.severity}"><p><i class="cb__sev cb__sev--${r.severity}">${r.severity}</i> <b>${a.rule}</b> ${esc(a.summary)}</p><p class="cb__alinks">${a.triggers.map((t) => `<button type="button" data-ev="${t}">${t}</button>`).join('')}</p></li>`; }).join('')}</ul>` : '<p class="dm__dim">None yet.</p>');
    const tl = timeline.filter((t) => t.step <= S.step);
    $('[data-cbtl]').innerHTML = `<p class="dm__h">Investigation timeline <span class="dm__dim">${tl.length ? '' : 'starts at step 6'}</span></p>` + (tl.length ? `<ol class="cb__tl">${tl.map((t) => `<li><time>${t.t}</time><p>${esc(t.text)}</p><p class="cb__alinks">${t.refs.map((r) => `<button type="button" data-ev="${r}">${r}</button>`).join('')}</p></li>`).join('')}</ol>` : '');
    drawEvBox();
  }
  function drawEvBox() {
    const e = S.ev ? evBy.get(S.ev) : null, box = $('[data-evbox]');
    if (!e || e.step > S.step) { box.innerHTML = ''; return; }
    const al = alerts.filter((a) => a.step <= S.step && a.triggers.includes(e.id));
    box.innerHTML = `<p class="dm__h">Event ${e.id} <span class="dm__dim">${esc(e.channel)} ${e.code} on ${esc(machineBy.get(e.host)!.name)} at T+${e.t}</span></p><p>${esc(e.summary)}</p><pre class="cb__json">${esc(JSON.stringify(rep('collect', e), null, 2))}</pre><p class="dm__dim">${e.benign ? 'Normal activity: no rule matches.' : e.rules.length ? `Matches ${e.rules.join(', ')}.` : 'Context for the chain; no rule matches on its own.'}${al.length ? ` Part of ${al.map((a) => a.id).join(', ')}.` : ''}</p>`;
  }

  /* ---------------------------------------------------------- shell */
  function drawChrome() {
    const v = visible();
    const set = (k: string, t: string) => { const el = $(`[data-k="${k}"]`); if (el.textContent !== t) el.textContent = t; };
    set('step', `${S.step}/${NSTEPS}`); set('events', String(v.length)); set('alerts', String(alerts.filter((a) => a.step <= S.step).length));
    set('hosts', String(new Set(v.filter((e) => !e.benign).map((e) => e.host)).size)); set('accts', String(new Set(v.filter((e) => !e.benign && e.user !== '-').map((e) => e.user)).size));
    $$('[data-act="goto"]').forEach((b) => { const n = +b.dataset.n!; b.classList.toggle('is-done', n <= S.step); b.classList.toggle('is-cur', n === S.step); if (n === S.step) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    ($('[data-act="prev"]') as HTMLButtonElement).disabled = S.step === 0;
    const nx = $<HTMLButtonElement>('[data-act="next"]'); nx.disabled = S.step === NSTEPS; nx.textContent = S.step === 0 ? 'Start' : S.step === NSTEPS ? 'End of scenario' : 'Next step';
    const pl = $('[data-act="play"]'); pl.setAttribute('aria-pressed', String(S.playing)); pl.textContent = S.playing ? 'Pause' : 'Auto-play';
    $$('[data-tab]').forEach((t) => { const on = t.dataset.tab === S.tab; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; });
    $$('[data-p]').forEach((p) => { p.hidden = p.dataset.p !== S.tab; });
    $$('[data-layer]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.layer === S.layer)));
  }
  const fk = () => (document.activeElement as HTMLElement | null)?.closest<HTMLElement>('[data-ev],[data-stage],[data-hunt],[data-act],[data-layer],[data-tab]');
  function draw(parts: ('arch' | 'pipe' | 'stream' | 'scen' | 'all')[] = ['all']) {
    const a = fk(); const key = a ? Array.from(a.attributes).filter((x) => x.name.startsWith('data-')).map((x) => `[${x.name}="${x.value}"]`).join('') : '';
    const all = parts.includes('all');
    drawChrome();
    if (S.tab === 'arch' || all) drawArch();
    if (S.tab === 'telemetry' || all) { drawPipe(); drawStream(); }
    if (S.tab === 'scenario' || all) drawScenario();
    if (key && !root.contains(document.activeElement)) { try { root.querySelector<HTMLElement>(key)?.focus({ preventScroll: true }); } catch { /* ignore */ } }
  }
  function flow() {
    const pipe = $('[data-pipe]'); pipe.classList.remove('is-flow'); void (pipe as HTMLElement).offsetWidth;
    if (!opts.reduced) { pipe.classList.add('is-flow'); clearTimeout(flowTimer); flowTimer = window.setTimeout(() => pipe.classList.remove('is-flow'), 2200); }
  }
  function setStep(n: number) {
    const was = S.step; S.step = Math.max(0, Math.min(NSTEPS, n));
    if (S.ev && evBy.get(S.ev)!.step > S.step) S.ev = null;
    if (S.hunt && S.step < 6) S.hunt = null;
    if (S.step > was) { const newest = events.filter((e) => e.step === S.step).filter((e) => !e.benign).pop(); if (newest) { S.host = newest.host; } flow(); }
    if (S.step === 0) { S.ev = null; S.hunt = null; S.filter = ''; const f = $<HTMLInputElement>('[data-filter]'); f.value = ''; }
    draw();
  }
  const stop = () => { S.playing = false; clearInterval(timer); };

  root.addEventListener('click', (e) => {
    const t = e.target as Element;
    const ev = t.closest<HTMLElement>('[data-ev]'); if (ev) { S.ev = ev.dataset.ev!; S.host = evBy.get(S.ev)!.host; draw(); return; }
    const st = t.closest<HTMLElement>('[data-stage]'); if (st) { S.stage = st.dataset.stage!; draw(); return; }
    const hu = t.closest<HTMLElement>('[data-hunt]'); if (hu) { S.hunt = S.hunt === hu.dataset.hunt ? null : hu.dataset.hunt!; draw(); return; }
    const ly = t.closest<HTMLElement>('[data-layer]'); if (ly) { S.layer = ly.dataset.layer as typeof S.layer; draw(); return; }
    const tb = t.closest<HTMLElement>('[data-tab]'); if (tb) { S.tab = tb.dataset.tab as Tab; draw(); return; }
    const act = t.closest<HTMLElement>('[data-act]'); if (!act) return;
    switch (act.dataset.act) {
      case 'next': stop(); setStep(S.step + 1); break;
      case 'prev': stop(); setStep(S.step - 1); break;
      case 'reset': stop(); S.host = 'dc01'; S.stage = 'collect'; setStep(0); break;
      case 'goto': stop(); setStep(+act.dataset.n!); break;
      case 'play':
        if (S.playing) { stop(); draw(); break; }
        if (S.step >= NSTEPS) setStep(0);
        S.playing = true; draw();
        timer = window.setInterval(() => { if (S.step >= NSTEPS) { stop(); draw(); return; } setStep(S.step + 1); }, 4200); break;
    }
  });
  root.addEventListener('keydown', (e) => {
    const k = (e as KeyboardEvent).key, tb = (e.target as Element).closest<HTMLElement>('[data-tab]');
    if (!tb || (k !== 'ArrowRight' && k !== 'ArrowLeft' && k !== 'Home' && k !== 'End')) return;
    const order: Tab[] = ['arch', 'telemetry', 'scenario'], i = order.indexOf(S.tab);
    S.tab = k === 'Home' ? order[0] : k === 'End' ? order[2] : order[(i + (k === 'ArrowRight' ? 1 : 2)) % 3]; draw(); root.querySelector<HTMLElement>(`[data-tab="${S.tab}"]`)!.focus(); e.preventDefault();
  });
  $<HTMLInputElement>('[data-filter]').addEventListener('input', (e) => { S.filter = (e.target as HTMLInputElement).value; drawStream(); });
  draw();
  (root as unknown as { __cb: unknown }).__cb = { get state() { return { ...S }; } };
}
