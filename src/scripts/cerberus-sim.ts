/**
 * Project Cerberus: a self-running, looping simulation of the purple-team scenario in the Cerberus PDF.
 * One loop position `u` (ms into a fixed cycle) drives everything: the three-plane scene (attacker, isolated lab
 * network, observability), telemetry beams, attack paths, the event stream, alerts, hunt queries, the investigation
 * timeline and the rulebook. Because every element is a function of u they cannot drift apart. Hover or focus a host,
 * event or alert chip to inspect it; nothing has to be clicked. All data is fixture data (s../data/cerberus.ts);
 * nothing is executed or fetched and no VM, SIEM or attack is running.
 */
import { machines, phases, events, alerts, hunts, timeline, rules, fired, pipeline, pipelineInfo, lab, buildLabel, liveRequirements, type Machine } from '../data/cerberus';
import { createLoop, clamp, ease, esc } from './loop';

const NS = 'http://www.w3.org/2000/svg';
const starts: number[] = []; let acc = 0; phases.forEach((p) => { starts.push(acc); acc += p.dur; });
const CYCLE = acc, FADE_OUT = 2300, FADE_IN = 900;
const abs = (phase: number, at: number) => starts[phase] + at;
const evAbs = new Map(events.map((e) => [e.id, abs(e.phase, e.at)]));
const evBy = new Map(events.map((e) => [e.id, e]));
const mBy = new Map(machines.map((m) => [m.id, m]));
const ruleBy = new Map(rules.map((r) => [r.id, r]));
const ts = (ms: number) => { const s = Math.round(ms / 1000 * 4); return `T+${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`; };
const PULSE = 950;

interface Plate { id: 'siem' | 'lab' | 'atk'; label: string; cx: number; cy: number; w: number; d: number; sk: number }
const SCENES = {
  wide: { w: 780, h: 520, tile: { w: 100, h: 38 }, plates: [
    { id: 'siem', label: 'OBSERVABILITY', cx: 390, cy: 74, w: 430, d: 74, sk: 38 }, { id: 'lab', label: 'CERBERUS-LAB-NET · 192.168.56.0/24 · ISOLATED', cx: 390, cy: 268, w: 640, d: 196, sk: 50 }, { id: 'atk', label: 'ATTACKER', cx: 390, cy: 462, w: 400, d: 72, sk: 38 }] as Plate[],
    uv: { siem01: [0.5, 0.52], dc01: [0.5, 0.2], ca01: [0.14, 0.62], srv01: [0.86, 0.62], ws01: [0.5, 0.86], kali: [0.5, 0.52] } as Record<string, number[]> },
  narrow: { w: 360, h: 610, tile: { w: 96, h: 40 }, plates: [
    { id: 'siem', label: 'OBSERVABILITY', cx: 180, cy: 62, w: 250, d: 58, sk: 18 }, { id: 'lab', label: 'LAB-NET 192.168.56.0/24 · ISOLATED', cx: 180, cy: 282, w: 336, d: 250, sk: 22 }, { id: 'atk', label: 'ATTACKER', cx: 180, cy: 535, w: 250, d: 56, sk: 18 }] as Plate[],
    uv: { siem01: [0.5, 0.52], dc01: [0.5, 0.15], ca01: [0.24, 0.46], srv01: [0.76, 0.46], ws01: [0.5, 0.86], kali: [0.5, 0.52] } as Record<string, number[]> },
};
/** Attack segments: drawn progressively inside their phase. */
const ATTACKS = [{ from: 'kali', to: 'dc01', phase: 0, at: 4300, dur: 1500 }, { from: 'ws01', to: 'dc01', phase: 1, at: 500, dur: 1200 }, { from: 'kali', to: 'srv01', phase: 2, at: 300, dur: 1500 }, { from: 'kali', to: 'ca01', phase: 3, at: 400, dur: 1500, denied: true }];

export function initCerberus(root: HTMLElement, opts: { reduced: boolean }) {
  root.innerHTML = `
  <div class="cb__bar">
    <p class="cb__sim" role="note">Simulated scenario: fixture events replayed in your browser, not live telemetry. Hover, focus or tap a host, stage, event or alert to inspect it.</p>
    <p class="cb__meta"><span data-k="events">0 events</span><span data-k="alerts">0 alerts</span></p>
    <ol class="cb__phases" aria-hidden="true">${phases.slice(0, 7).map((p) => `<li data-ph title="${esc(p.name)}"><i></i></li>`).join('')}</ol>
    <span class="dm__loop" aria-hidden="true"><i data-loop></i></span>
  </div>
  <div class="cb__stage" data-cbstage>
    <div class="cb__map"><svg data-svg role="img" aria-label="Isometric view of the lab: an attacker machine, the isolated lab network with four Windows hosts, and the SIEM host above it receiving telemetry."></svg>
      <ol class="cb__pipe" data-pipe aria-label="Telemetry pipeline">${pipeline.map((s, i) => `<li><button type="button" data-stage="${i}">${esc(s)}</button></li>`).join('')}</ol>
    </div>
    <div class="cb__side">
      <div class="cb__phase" data-phase aria-live="off"></div>
      <div class="cb__streamwrap"><p class="cb__h">Event stream <span>SIEM01 · fixtures</span></p><ol class="cb__stream" data-stream></ol></div>
      <div class="cb__detail" data-detail></div>
    </div>
    <div class="cb__alerts"><p class="cb__h">Alerts <span data-acount>0</span></p><ol data-alerts></ol></div>
    <div class="cb__aux" data-aux></div>
  </div>
  <details class="cb__live"><summary>What a live connection would need</summary>
    <ul>${liveRequirements.map(([k, v]) => `<li><b>${esc(k)}</b> ${esc(v)}</li>`).join('')}</ul>
  </details>
  <p class="dm__note">Architecture, addressing, accounts, queries and rule logic come from the Cerberus design document. That document is a plan, not evidence of a running lab. In the public lab repository only a domain controller and a Windows 10 client are built, with different addressing (192.168.10.x, corp.local); the other machines are planned. Every event and alert here is an illustrative fixture, not captured telemetry. Credentials and attack commands are intentionally not reproduced.</p>`;

  const $ = <T extends Element = HTMLElement>(s: string) => root.querySelector<T>(s)!;
  const svg = $<SVGSVGElement>('[data-svg]'), stage = $('[data-cbstage]');
  let mode: 'wide' | 'tall' = root.clientWidth < 760 ? 'tall' : 'wide';
  let sc = SCENES.wide, tiles = new Map<string, { g: SVGGElement; x: number; y: number; badge: SVGTextElement }>(), plates = new Map<string, SVGGElement>(), beams = new Map<string, { d: string; pts: number[][]; el: SVGPathElement }>();
  let pulseEls: { el: SVGCircleElement; id: string; host: string }[] = [], arcs: { el: SVGPathElement; head: SVGCircleElement; deny: SVGTextElement; a: typeof ATTACKS[number]; pts: number[][] }[] = [];
  type Foc = { kind: 'ev' | 'host' | 'stage' | 'alert'; id: string } | null;
  let hover: Foc = null, pinned: Foc = null, prevU = 0;
  const mk = (tag: string, attrs: Record<string, string>, parent?: Element) => { const e = document.createElementNS(NS, tag); for (const k in attrs) e.setAttribute(k, attrs[k]); parent?.appendChild(e); return e; };
  const bez = (p: number[][], t: number) => { const u = 1 - t; return [u * u * u * p[0][0] + 3 * u * u * t * p[1][0] + 3 * u * t * t * p[2][0] + t * t * t * p[3][0], u * u * u * p[0][1] + 3 * u * u * t * p[1][1] + 3 * u * t * t * p[2][1] + t * t * t * p[3][1]]; };
  const pathOf = (p: number[][]) => `M${p[0][0]} ${p[0][1]}C${p[1][0]} ${p[1][1]} ${p[2][0]} ${p[2][1]} ${p[3][0]} ${p[3][1]}`;

  function build() {
    sc = mode === 'wide' ? SCENES.wide : SCENES.narrow;
    svg.setAttribute('viewBox', `0 0 ${sc.w} ${sc.h}`); svg.replaceChildren(); tiles = new Map(); plates = new Map(); beams = new Map(); pulseEls = []; arcs = [];
    const gPlates = mk('g', {}, svg), gBeams = mk('g', {}, svg), gArcs = mk('g', {}, svg), gTiles = mk('g', {}, svg), gPulse = mk('g', {}, svg);
    const corner = (p: Plate) => { const A = [p.cx - p.w / 2 + p.sk, p.cy - p.d / 2], B = [p.cx + p.w / 2 + p.sk, p.cy - p.d / 2], D = [p.cx - p.w / 2 - p.sk, p.cy + p.d / 2]; return { A, B, D, C: [B[0] + D[0] - A[0], B[1] + D[1] - A[1]] }; };
    const at = (p: Plate, u: number, v: number) => { const c = corner(p); return [c.A[0] + u * (c.B[0] - c.A[0]) + v * (c.D[0] - c.A[0]), c.A[1] + u * (c.B[1] - c.A[1]) + v * (c.D[1] - c.A[1])]; };
    sc.plates.forEach((p) => {
      const g = mk('g', { class: 'cb__plate', 'data-plate': p.id }, gPlates) as SVGGElement; const c = corner(p);
      mk('polygon', { class: 'cb__plateface', points: [c.A, c.B, c.C, c.D].map((q) => q.join(',')).join(' ') }, g);
      mk('polygon', { class: 'cb__plateedge', points: [c.D, c.C, [c.C[0], c.C[1] + 7], [c.D[0], c.D[1] + 7]].map((q) => q.join(',')).join(' ') }, g);
      const t = mk('text', { class: 'cb__platelbl', x: String(c.A[0] + 16 - p.sk * 0.2), y: String(c.A[1] + (mode === 'wide' ? 15 : 14)) }, g); t.textContent = p.label;
      plates.set(p.id, g);
    });
    const plate = (id: string) => sc.plates.find((p) => p.id === id)!;
    const pos: Record<string, number[]> = {}; machines.forEach((m) => { const uv = sc.uv[m.id]; pos[m.id] = at(plate(m.plate), uv[0], uv[1]); });
    const T = sc.tile;
    // telemetry beams: every Windows host up to SIEM01
    machines.filter((m) => m.plate === 'lab').forEach((m) => {
      const a = pos[m.id], b = pos['siem01'], y1 = a[1] - T.h / 2, y2 = b[1] + T.h / 2, mid = (y1 + y2) / 2;
      const pts = [[a[0], y1], [a[0], mid], [b[0] + (a[0] - b[0]) * 0.12, mid], [b[0] + (a[0] - b[0]) * 0.12, y2]];
      beams.set(m.id, { d: pathOf(pts), pts, el: mk('path', { class: 'cb__beam', d: pathOf(pts) }, gBeams) as SVGPathElement });
    });
    // attack paths
    ATTACKS.forEach((a) => {
      const f = pos[a.from], t = pos[a.to], up = f[1] > t[1], y1 = f[1] + (up ? -T.h / 2 : T.h / 2), y2 = t[1] + (up ? T.h / 2 : -T.h / 2), mid = (y1 + y2) / 2, bend = (a.from === 'ws01' ? 70 : 0);
      const pts = [[f[0], y1], [f[0] + bend, mid], [t[0] + bend, mid], [t[0], y2]];
      const el = mk('path', { class: 'cb__arc', d: pathOf(pts), pathLength: '1' }, gArcs) as SVGPathElement;
      const head = mk('circle', { class: 'cb__archead', r: '3.6' }, gArcs) as SVGCircleElement; const deny = mk('text', { class: 'cb__deny', 'text-anchor': 'middle' }, gArcs) as SVGTextElement; deny.textContent = '✕';
      arcs.push({ el, head, deny, a, pts });
    });
    // tiles
    machines.forEach((m) => {
      const [x, y] = pos[m.id];
      const g = mk('g', { class: 'cb__tile', transform: `translate(${x} ${y})`, tabindex: '0', role: 'button', 'data-host': m.id, 'data-build': m.build, 'aria-label': `${m.name}, ${m.role}, ${m.ip}, ${buildLabel[m.build]}` }, gTiles) as SVGGElement;
      mk('rect', { class: 'cb__tbase', x: String(-T.w / 2), y: String(-T.h / 2 + 5), width: String(T.w), height: String(T.h), rx: '9' }, g);
      mk('rect', { class: 'cb__tface', x: String(-T.w / 2), y: String(-T.h / 2), width: String(T.w), height: String(T.h), rx: '9' }, g);
      mk('circle', { class: 'cb__tdot', cx: String(-T.w / 2 + 12), cy: '-5', r: '3.6' }, g);
      const n = mk('text', { class: 'cb__tname', x: String(-T.w / 2 + 22), y: '-1' }, g); n.textContent = m.name;
      const ip = mk('text', { class: 'cb__tip', x: String(-T.w / 2 + 12), y: '12' }, g); ip.textContent = m.ip;
      const badge = mk('text', { class: 'cb__tbadge', x: String(T.w / 2 - 8), y: '-2', 'text-anchor': 'end' }, g) as SVGTextElement;
      tiles.set(m.id, { g, x, y, badge });
    });
    events.forEach((e) => { if (beams.has(e.host)) pulseEls.push({ el: mk('circle', { class: 'cb__pulse', r: '3.4' }, gPulse) as SVGCircleElement, id: e.id, host: e.host }); });
  }

  const phaseAt = (u: number) => { let i = 0; while (i < starts.length - 1 && u >= starts[i + 1]) i++; return i; };
  let lastStream: string | null = null, lastAlerts: string | null = null, lastAux: string | null = null, lastPhase = -1;
  const evLine = (e: (typeof events)[number], hl: boolean, isNew: boolean) => `<li class="${e.benign ? 'is-benign' : ''} ${e.rule ? 'is-hit' : ''} ${hl ? 'is-hl' : ''} ${isNew ? 'is-new' : ''}"><button type="button" data-ev="${e.id}"><time>${ts(evAbs.get(e.id)!)}</time><b>${esc(mBy.get(e.host)!.name)}</b><code>${e.channel === 'Sysmon' ? 'Sysmon ' : ''}${e.code}</code><span>${esc(e.summary)}</span>${e.rule ? `<i class="cb__chip">${e.rule}</i>` : e.inferred ? '<i class="cb__chip cb__chip--dim">inferred</i>' : e.benign ? '<i class="cb__chip cb__chip--dim">normal</i>' : ''}</button></li>`;

  function render(u: number, fade: number) {
    stage.style.setProperty('--fade', String(fade));
    $('[data-loop]').style.transform = `scaleX(${(u / CYCLE).toFixed(4)})`;
    if (u < prevU - 2000) pinned = null; prevU = u;
    const ph = phaseAt(u), phase = phases[ph], inPhase = u - starts[ph];
    // inspection: one focus (hover, keyboard focus or a tapped selection) lights up everything related to it
    const focus = hover ?? pinned, fkey = focus ? focus.kind + focus.id : '', shownEv = events.filter((e) => evAbs.get(e.id)! <= u);
    const hlEv = new Set<string>(), hlHosts = new Set<string>(), hlAlerts = new Set<string>(), shownAlerts = alerts.filter((a) => abs(a.phase, a.at) <= u);
    if (focus?.kind === 'ev') { const e = evBy.get(focus.id)!; hlEv.add(e.id); hlHosts.add(e.host); shownAlerts.forEach((a) => { if (a.evidence.includes(e.id)) hlAlerts.add(a.id); }); }
    else if (focus?.kind === 'host') { hlHosts.add(focus.id); shownEv.forEach((e) => { if (e.host === focus.id) hlEv.add(e.id); }); shownAlerts.forEach((a) => { if (a.host === focus.id) hlAlerts.add(a.id); }); }
    else if (focus?.kind === 'alert') { const a = alerts.find((x) => x.id === focus.id)!; hlAlerts.add(a.id); hlHosts.add(a.host); a.evidence.forEach((id) => { hlEv.add(id); hlHosts.add(evBy.get(id)!.host); }); }
    else if (focus?.kind === 'stage') { const i = +focus.id; if (i <= 1) shownEv.forEach((e) => hlHosts.add(e.host)); else hlHosts.add('siem01'); if (i === 4) shownAlerts.forEach((a) => hlAlerts.add(a.id)); if (i === 3) shownAlerts.forEach((a) => hlAlerts.add(a.id)); }
    const hlTL = new Set<number>(); timeline.forEach((t, j) => { if (t.refs.some((r) => hlEv.has(r))) hlTL.add(j); });
    root.querySelectorAll<HTMLElement>('[data-ph]').forEach((el, i) => { el.classList.toggle('is-on', i === ph); el.classList.toggle('is-past', i < ph); });
    // scene: plates rise in, tiles light up
    const rise = (delay: number) => ease((u - delay) / 900);
    ([['siem', 500], ['lab', 150], ['atk', 850]] as const).forEach(([id, d]) => { const k = rise(d), g = plates.get(id)!; g.style.opacity = String(k); g.style.transform = `translateY(${(1 - k) * 26}px)`; });
    const vis = events.filter((e) => evAbs.get(e.id)! <= u), counts = new Map<string, number>(); vis.forEach((e) => counts.set(e.host, (counts.get(e.host) ?? 0) + 1));
    const phaseFocus = new Set(phase.focus);
    tiles.forEach((t, id) => {
      const idx = machines.findIndex((m) => m.id === id), k = ease((u - 900 - idx * 150) / 600);
      t.g.style.opacity = String(k); t.g.style.transform = `translate(${t.x}px, ${t.y + (1 - k) * 10}px)`;
      t.g.classList.toggle('is-focus', phaseFocus.has(id)); t.g.classList.toggle('is-hover', hlHosts.has(id));
      const n = counts.get(id) ?? 0; const tx = n ? `${n}` : ''; if (t.badge.textContent !== tx) t.badge.textContent = tx;
    });
    // telemetry pulses beam from the emitting host to SIEM01
    const arrive = (id: string) => evAbs.get(id)! + PULSE;
    const beamHot = new Set<string>();
    pulseEls.forEach((p) => { const t = (u - evAbs.get(p.id)!) / PULSE; const b = beams.get(p.host)!; if (t >= 0 && t <= 1) { const [x, y] = bez(b.pts, ease(t)); p.el.setAttribute('cx', String(x)); p.el.setAttribute('cy', String(y)); p.el.style.opacity = '1'; beamHot.add(p.host); } else p.el.style.opacity = '0'; });
    beams.forEach((b, id) => { b.el.classList.toggle('is-hot', beamHot.has(id) || (hlHosts.has(id) && (!focus || focus.kind !== 'stage' || +focus.id <= 1))); b.el.style.strokeDashoffset = String(-(u / 40) % 24); });
    // attack paths draw progressively inside their phase, then stay dim
    arcs.forEach((a) => {
      const t0 = abs(a.a.phase, a.a.at), k = ease((u - t0) / a.a.dur), active = u >= t0 && u < starts[a.a.phase] + phases[a.a.phase].dur;
      a.el.style.strokeDashoffset = String(1 - k); a.el.style.opacity = u < t0 ? '0' : active ? '1' : '0.3';
      const [x, y] = bez(a.pts, k); a.head.setAttribute('cx', String(x)); a.head.setAttribute('cy', String(y)); a.head.style.opacity = u >= t0 && k < 1 ? '1' : '0';
      a.deny.setAttribute('x', String(a.pts[3][0])); a.deny.setAttribute('y', String(a.pts[3][1] + 16)); a.deny.style.opacity = a.a.denied && k >= 1 && u >= t0 ? '1' : '0';
    });
    // pipeline strip: latest arrival walks Sysmon → Winlogbeat → Elastic → Sigma → Alert
    let step = -1; const arrivals = vis.map((e) => arrive(e.id)).concat(alerts.filter((a) => abs(a.phase, a.at) <= u).map((a) => abs(a.phase, a.at))).filter((a) => u >= a).sort((a, b) => b - a);
    if (arrivals.length && u - arrivals[0] < 1500) step = Math.min(4, Math.floor((u - arrivals[0]) / 280));
    root.querySelectorAll<HTMLElement>('[data-pipe] li').forEach((li, i) => { li.classList.toggle('is-on', i === step); li.classList.toggle('is-past', step >= 0 && i < step); li.classList.toggle('is-sel', focus?.kind === 'stage' && +focus.id === i); });
    // phase card
    if (lastPhase !== ph) { lastPhase = ph; $('[data-phase]').innerHTML = ph === 7 ? `<p class="cb__k">Loop</p><h4>Returning to the initial state</h4><p>The scenario restarts with the same fixtures.</p>` : `<p class="cb__k">Phase ${ph + 1} of 7 · <span>${esc(phase.technique)}</span></p><h4>${esc(phase.name)}</h4><p>${esc(phase.text)}</p>`; }
    // stream
    const lastSix = vis.slice(-7).reverse(), sig = 'v' + lastSix.map((e) => e.id).join();
    if (sig !== lastStream) { lastStream = sig; $('[data-stream]').innerHTML = !lastSix.length ? '<li class="cb__none">Waiting for the first event</li>' : lastSix.map((e, i) => evLine(e, hlEv.has(e.id), i === 0)).join(''); }
    const top = $('[data-stream]').firstElementChild; if (top && lastSix.length) top.classList.toggle('is-new', u - evAbs.get(lastSix[0].id)! < 900);
    // alerts
    const al = shownAlerts, asig = 'v' + al.map((a) => a.id).join();
    if (asig !== lastAlerts) { lastAlerts = asig; $('[data-alerts]').innerHTML = al.slice().reverse().map((a) => { const r = ruleBy.get(a.rule)!; return `<li class="lv-${r.level} ${hlAlerts.has(a.id) ? 'is-hl' : ''}" data-alert="${a.id}" tabindex="0" role="button"><p><i class="cb__lvl">${r.level}</i> <b>${esc(r.title)}</b></p><p class="cb__as">${esc(a.summary)}</p><p class="cb__ev">${a.evidence.map((id) => `<button type="button" data-ev="${id}" class="${hlEv.has(id) ? 'is-hl' : ''}">${id}</button>`).join('')}</p></li>`; }).join('') || '<li class="cb__none">No alerts yet</li>'; }
    $('[data-acount]').textContent = String(al.length);
    $('[data-k="events"]').textContent = `${vis.length} event${vis.length === 1 ? '' : 's'}`; $('[data-k="alerts"]').textContent = `${al.length} alert${al.length === 1 ? '' : 's'}`;
    // aux: design facts, then hunt + timeline, then rules + incident summary
    let aux = '';
    if (ph < 5) aux = `<p class="cb__h">The design <span>${lab.domain}</span></p><dl class="cb__facts"><div><dt>Network</dt><dd>${lab.network}, ${lab.subnet}</dd></div><div><dt>Isolation</dt><dd>${lab.isolation}</dd></div><div><dt>Telemetry</dt><dd>${pipeline.join(' → ')}</dd></div><div><dt>Built so far</dt><dd>Only a domain controller and a Windows 10 client exist in the public repo, with different addressing. The rest is planned.</dd></div></dl>`;
    else if (ph === 5) {
      aux = `<p class="cb__h">Hunt in Kibana <span>starting from alice</span></p>` + hunts.map((h) => { const t0 = starts[5] + h.at, typed = Math.round(clamp((u - t0) / 1500) * h.query.length), done = u >= t0 + 1700; return u < t0 ? '' : `<div class="cb__q"><code>${esc(h.query.slice(0, typed))}${typed < h.query.length ? '<i class="cb__caret"></i>' : ''}</code>${done ? `<p class="cb__qr"><b>${h.ids.length} events</b> ${esc(h.found)} <span>${h.ids.map((id) => `<button type="button" data-ev="${id}">${id}</button>`).join('')}</span></p>` : ''}</div>`; }).join('')
        + `<ol class="cb__tl">${timeline.map((t, j) => u >= starts[5] + t.at ? `<li data-tl="${j}"><b>${esc(t.label)}</b> ${esc(t.text)}</li>` : '').join('')}</ol>`;
    } else if (ph >= 6) {
      const t = inPhase;
      aux = `<p class="cb__h">Sigma rulebook <span>${fired.size} of ${rules.length} fired in this scenario</span></p><ol class="cb__rules">${rules.map((r, i) => t < i * 380 ? '' : `<li class="${fired.has(r.id) ? 'is-fired' : ''}"><i class="cb__lvl lv-${r.level}">${r.level}</i><b>${esc(r.title)}</b><code>${esc(r.logic)}</code><span>${fired.has(r.id) ? 'fired' : 'not triggered here'}</span></li>`).join('')}</ol>`
        + (t > 3600 ? `<p class="cb__sum"><b>Incident summary</b> alice’s foothold on WS01 led to Kerberoasting against DC01, PsExec to SRV01 and a certificate request against the honeypot on CA01, which was denied and logged. One account, one chain, reconstructed from three log sources.</p>` : '');
    }
    if (aux !== lastAux) { lastAux = aux; $('[data-aux]').innerHTML = aux; }
    // highlights are toggled in place (never by rebuilding a list), so keyboard focus and taps are not lost
    root.querySelectorAll<HTMLElement>('[data-stream] li').forEach((li) => li.classList.toggle('is-hl', !!li.querySelector('[data-ev]') && hlEv.has(li.querySelector<HTMLElement>('[data-ev]')!.dataset.ev!)));
    root.querySelectorAll<HTMLElement>('[data-alerts] li[data-alert]').forEach((li) => li.classList.toggle('is-hl', hlAlerts.has(li.dataset.alert!)));
    root.querySelectorAll<HTMLElement>('[data-alerts] [data-ev], [data-aux] [data-ev]').forEach((b) => b.classList.toggle('is-hl', hlEv.has(b.dataset.ev!)));
    root.querySelectorAll<HTMLElement>('[data-aux] li[data-tl]').forEach((li) => li.classList.toggle('is-hl', hlTL.has(+li.dataset.tl!)));
    // inspector
    let det = '';
    const evCard = (e: (typeof events)[number]) => `<p class="cb__k">${e.id} · ${e.channel} ${e.code} · ${esc(mBy.get(e.host)!.name)}${e.inferred ? ' · inferred, not enumerated in the design' : ''}</p><p>${esc(e.summary)}</p><dl class="cb__facts">${Object.entries(e.fields).map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>`;
    if (focus?.kind === 'host') { const m = mBy.get(focus.id)!, n = shownEv.filter((e) => e.host === m.id).length; det = `<p class="cb__k">${esc(m.name)} · ${esc(buildLabel[m.build])}</p><p>${esc(m.role)}</p><dl class="cb__facts"><div><dt>OS</dt><dd>${esc(m.os)}</dd></div><div><dt>Address</dt><dd>${esc(m.ip)} · ${m.ram} · ${m.cpu}</dd></div><div><dt>In this run</dt><dd>${n} event${n === 1 ? '' : 's'}, ${[...hlAlerts].length} alert${hlAlerts.size === 1 ? '' : 's'}</dd></div>${m.note ? `<div><dt>Note</dt><dd>${esc(m.note)}</dd></div>` : ''}</dl>`; }
    else if (focus?.kind === 'stage') { const i = +focus.id, info = pipelineInfo[i]; det = `<p class="cb__k">Stage ${i + 1} of 5 · ${esc(info.name)}</p><p>${esc(info.what)}</p><dl class="cb__facts"><div><dt>Runs on</dt><dd>${esc(info.where)}</dd></div><div><dt>Passed so far</dt><dd>${i <= 2 ? `${shownEv.length} events` : i === 3 ? `${shownEv.filter((e) => e.rule).length} rule matches` : `${shownAlerts.length} alerts`}</dd></div></dl>`; }
    else if (focus?.kind === 'alert') { const a = alerts.find((x) => x.id === focus.id)!, r = ruleBy.get(a.rule)!; det = `<p class="cb__k">${a.id} · ${r.level} · ${esc(r.title)}</p><p>${esc(a.summary)}</p><dl class="cb__facts"><div><dt>Rule logic</dt><dd>${esc(r.logic)}</dd></div><div><dt>Technique</dt><dd>${esc(r.tags)}</dd></div><div><dt>Evidence</dt><dd>${a.evidence.map((id) => `${id} (${esc(mBy.get(evBy.get(id)!.host)!.name)})`).join(', ')}</dd></div></dl>`; }
    else { const e = focus?.kind === 'ev' ? evBy.get(focus.id) : shownEv[shownEv.length - 1]; det = e && evAbs.get(e.id)! <= u ? evCard(e) + (focus?.kind === 'ev' && hlAlerts.size ? `<p class="cb__k cb__k--note">Part of ${[...hlAlerts].join(', ')}</p>` : '') : '<p class="cb__k">Waiting for the first event</p>'; }
    if (pinned && !hover) det += '<p class="cb__k cb__k--note">Selected: tap it again to release. The scenario keeps running.</p>';
    const dEl = $('[data-detail]'); if (dEl.dataset.h !== det) { dEl.dataset.h = det; dEl.innerHTML = det; }
  }

  build();
  const loop = createLoop(root, { cycle: CYCLE, fadeIn: FADE_IN, fadeOut: FADE_OUT, reduced: opts.reduced, staticU: starts[6] + 6200, render });
  const same = (a: Foc, b: Foc) => !!a && !!b && a.kind === b.kind && a.id === b.id;
  const refresh = () => loop.redraw();
  const setHover = (h: Foc) => { if (same(h, hover) || (!h && !hover)) return; hover = h; refresh(); };
  const target = (t: EventTarget | null): Foc => {
    const el = (t as Element | null)?.closest?.('[data-ev]:not([data-ev=""]),[data-host]:not([data-host=""]),[data-stage]:not([data-stage=""]),[data-alert]:not([data-alert=""])') as HTMLElement | null; if (!el) return null;
    if (el.dataset.ev && evBy.has(el.dataset.ev)) return { kind: 'ev', id: el.dataset.ev };
    if (el.dataset.host && mBy.has(el.dataset.host)) return { kind: 'host', id: el.dataset.host };
    if (el.dataset.stage && pipelineInfo[+el.dataset.stage]) return { kind: 'stage', id: el.dataset.stage };
    if (el.dataset.alert && alerts.some((a) => a.id === el.dataset.alert)) return { kind: 'alert', id: el.dataset.alert };
    return null;
  };
  const toggle = (t: Foc) => { pinned = t && !same(t, pinned) ? t : null; refresh(); };
  root.addEventListener('pointerover', (e) => { if ((e as PointerEvent).pointerType === 'touch') return; const t = target(e.target); if (t) setHover(t); });
  root.addEventListener('pointerout', (e) => { if (target(e.target) && !target(e.relatedTarget)) setHover(null); });
  root.addEventListener('focusin', (e) => { const t = target(e.target); if (t) setHover(t); });
  root.addEventListener('focusout', () => setHover(null));
  root.addEventListener('click', (e) => { const t = target(e.target); if (t) toggle(t); else if (pinned && (e.target as Element).closest('.cb__stage') && !(e.target as Element).closest('.cb__detail')) toggle(null); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { const t = target(e.target); if (t) { e.preventDefault(); toggle(t); } } });
  new ResizeObserver(() => { const m = root.clientWidth < 760 ? 'tall' : 'wide'; if (m !== mode) { mode = m; build(); lastStream = lastAlerts = lastAux = null; lastPhase = -1; loop.redraw(); } }).observe(root);
  (root as unknown as { __cb: unknown }).__cb = { get focus() { return JSON.stringify({ hover, pinned }); }, seek: (ms: number) => loop.seek(ms), get pos() { return loop.pos; }, get running() { return loop.running; }, cycle: CYCLE, starts, get machines() { return machines as Machine[]; } };
}
