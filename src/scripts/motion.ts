/**
 * Progressive enhancement. The page is complete without this file (no-JS and reduced-motion get the finished static compositions).
 * Pinned sequences: the opening (hero) and the Pwndbg cymbol explanation. Nothing else pins. Native scrolling throughout.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const q = <T extends Element = HTMLElement>(s: string, scope: ParentNode = document) => scope.querySelector<T>(s);
const qa = <T extends Element = HTMLElement>(s: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(s));
const nav = q('.nav')!;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const ease = (x: number) => x * x * (3 - 2 * x);
const easeIO = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
const setTone = (t: string) => { if (nav.dataset.tone !== t) nav.dataset.tone = t; };

// Provisional capability heuristic (docs/03-storyboard.md section 7). Core count is NOT used (VMs misreport it).
// Override for testing: ?motion=lite | ?motion=full
const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
const override = new URLSearchParams(location.search).get('motion');
const lite = override ? override === 'lite' : mem !== undefined && mem <= 2;

/* ---- always on: nav tone per scene + hide-on-scroll-down (no animation of content involved) ---- */
qa<HTMLElement>('[data-scene]').forEach((sec) => {
  if (sec.classList.contains('hero')) return;
  ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => { if (s.isActive) setTone(sec.dataset.scene!); } });
});
ScrollTrigger.create({
  start: 0, end: 'max', onUpdate: (self) => {
    const y = self.scroll();
    if (y < 120 || self.direction === -1) nav.classList.remove('is-hidden');
    else if (self.direction === 1 && y > 400) nav.classList.add('is-hidden');
  },
});

/* ---- opening: a signal passes three nodes, then crosses a boundary into the dark scene ---- */
function hero(dist: number, portrait: boolean) {
  const stage = q('.hero__stage')!;
  const svg = q<SVGSVGElement>(portrait ? '.hero__art--port' : '.hero__art--land')!;
  const trace = q<SVGPathElement>('.trace', svg)!, echo = q<SVGPathElement>('.trace-echo', svg)!;
  const deep = q<SVGGElement>('.deep', svg)!, head = q<SVGCircleElement>('.head', svg)!;
  const nodes = qa<SVGCircleElement>('.node', svg);
  const grads = qa<SVGLinearGradientElement>('linearGradient[id^="tr-"], linearGradient[id^="nf-"]', svg);
  const b0 = +svg.dataset.boundary!, nodePts = JSON.parse(svg.dataset.nodes!) as [number, number][];
  const copy = q('.hero__copy')!, phrases = qa('.phrase', stage), cue = q('.hero__cue')!;
  const L = trace.getTotalLength();
  // length along the path at which each node sits
  const nodeL = nodePts.map(([x, y]) => {
    let best = 0, bd = Infinity;
    for (let i = 0; i <= 800; i++) { const pt = trace.getPointAtLength((L * i) / 800); const d = (pt.x - x) ** 2 + (pt.y - y) ** 2; if (d < bd) { bd = d; best = (L * i) / 800; } }
    return best;
  });
  trace.style.strokeDasharray = `${L}`; echo.style.strokeDasharray = `${L}`;

  const boundaryScreenY = (y: number) => { const m = svg.getScreenCTM(); return m ? y * m.d + m.f : y; };
  const render = (p: number) => {
    const len = L * ease(clamp01((p - 0.03) / 0.57));
    trace.style.strokeDashoffset = String(L - len);
    echo.style.strokeDashoffset = String(L - L * ease(clamp01((p - 0.09) / 0.57)));
    const pt = trace.getPointAtLength(Math.max(0.01, len));
    head.setAttribute('cx', pt.x.toFixed(1)); head.setAttribute('cy', pt.y.toFixed(1));
    head.style.opacity = len > 1 && len < L - 1 ? '1' : '0';
    nodes.forEach((n, i) => { n.style.opacity = String(len >= nodeL[i] - 6 ? 1 : 0.2); });
    phrases.forEach((el, i) => { el.style.opacity = i === 0 ? '1' : String(0.38 + 0.62 * clamp01((len - (nodeL[i] - 90)) / 90)); });
    const by = b0 + (-80 - b0) * easeIO(clamp01((p - 0.45) / 0.43));
    deep.setAttribute('transform', `translate(0 ${by.toFixed(1)})`);
    grads.forEach((g) => { g.setAttribute('y1', by.toFixed(1)); g.setAttribute('y2', (by + 1).toFixed(1)); });
    const fade = clamp01((p - 0.5) / 0.2);
    copy.style.opacity = String(1 - fade);
    copy.style.transform = `translate3d(0,${(-48 * clamp01((p - 0.5) / 0.3)).toFixed(1)}px,0)`;
    cue.style.opacity = String(Math.max(0, 1 - p / 0.08));
    setTone(boundaryScreenY(by) < 40 ? 'dark' : 'paper');
  };
  const proxy = { p: 0 }, intro = { p: 0 };
  const show = () => render(Math.max(proxy.p, intro.p));
  const introTween = gsap.to(intro, { p: 0.19, duration: 1.9, delay: 0.35, ease: 'power2.inOut', onUpdate: show });
  const tween = gsap.to(proxy, {
    p: 1, ease: 'none', onUpdate: show,
    scrollTrigger: {
      trigger: '.hero', start: 'top top', end: () => `+=${Math.round(window.innerHeight * dist)}`,
      pin: stage, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
      onRefresh: show,
    },
  });
  render(0);
  return () => {
    introTween.kill(); tween.scrollTrigger?.kill(); tween.kill();
    [trace, echo].forEach((e) => { e.style.strokeDasharray = ''; e.style.strokeDashoffset = ''; });
    deep.setAttribute('transform', `translate(0 ${b0})`);
    grads.forEach((g) => { g.setAttribute('y1', String(b0)); g.setAttribute('y2', String(b0 + 1)); });
    head.style.opacity = '0'; nodes.forEach((n) => (n.style.opacity = ''));
    phrases.forEach((el) => (el.style.opacity = '')); copy.style.opacity = ''; copy.style.transform = ''; cue.style.opacity = '';
    setTone('paper');
  };
}

/* ---- premise reading band, evidence settle ---- */
function subtle() {
  const tl: gsap.core.Tween[] = [];
  qa('.premise__text .line').forEach((el) => {
    tl.push(gsap.fromTo(el, { opacity: 0.28 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 55%', scrub: 0.3 } }));
  });
  qa('.evidence').forEach((el) => {
    tl.push(gsap.fromTo(el, { y: 28, scale: 1.03 }, { y: 0, scale: 1, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 58%', scrub: 0.5 } }));
  });
  return () => tl.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); gsap.set(t.targets(), { clearProps: 'all' }); });
}

/* ---- Pwndbg: seven flags become seven subcommands (each old option -> the subcommand of the same name) ---- */
function anatomy(pinned: boolean) {
  const fig = q('.cym')!;
  const oldLis = qa<HTMLElement>('.cym__col--old li', fig), newLis = qa<HTMLElement>('.cym__col--new li', fig);
  const svgT = q<SVGSVGElement>('.cym__traces', fig)!, paths = qa<SVGPathElement>('.cym__trace', svgT);
  const before = q('.cym__usage--before', fig)!, afterRow = q('.cym__usage--after', fig)!, afterCode = q<HTMLElement>('code', afterRow)!;
  const added = q('.cym__added', fig)!;
  const N = paths.length; const lens: number[] = [];
  const newByRow = new Map(newLis.map((li) => [+li.dataset.row!, li]));

  const layout = () => {
    const r = svgT.getBoundingClientRect(); const w = r.width, h = r.height;
    if (!w || !h) return;
    svgT.setAttribute('viewBox', `0 0 ${w.toFixed(1)} ${h.toFixed(1)}`); svgT.setAttribute('preserveAspectRatio', 'xMidYMid meet');
    paths.forEach((p, i) => {
      const y1 = ((i + 0.5) * h) / N, y2 = ((+p.dataset.to! + 0.5) * h) / N;
      p.setAttribute('d', `M 0 ${y1.toFixed(1)} C ${(w * 0.58).toFixed(1)} ${y1.toFixed(1)} ${(w * 0.42).toFixed(1)} ${y2.toFixed(1)} ${w.toFixed(1)} ${y2.toFixed(1)}`);
      lens[i] = p.getTotalLength(); p.style.strokeDasharray = `${lens[i]}`;
    });
  };
  const start = (i: number) => 0.1 + i * 0.075;
  const render = (p: number) => {
    paths.forEach((path, i) => {
      const t = ease(clamp01((p - start(i)) / 0.14));
      path.style.strokeDashoffset = String((lens[i] ?? 0) * (1 - t));
      const on = t > 0 && t < 1;
      const nl = newByRow.get(i)!, ol = oldLis[i];
      ol.classList.toggle('is-on', on); nl.classList.toggle('is-on', on);
      ol.style.opacity = String(1 - 0.45 * clamp01((p - start(i) - 0.1) / 0.06));
      const o = clamp01((p - start(i) - 0.08) / 0.06);
      nl.style.opacity = String(o); nl.style.transform = `translate3d(${((1 - o) * -14).toFixed(1)}px,0,0)`;
    });
    before.style.opacity = String(1 - 0.55 * clamp01((p - 0.66) / 0.1));
    afterRow.style.opacity = String(clamp01((p - 0.64) / 0.05));
    afterCode.style.clipPath = `inset(0 ${((1 - clamp01((p - 0.68) / 0.12)) * 100).toFixed(1)}% 0 0)`;
    added.style.opacity = String(clamp01((p - 0.82) / 0.1));
  };
  const reset = () => {
    paths.forEach((pa) => { pa.style.strokeDasharray = ''; pa.style.strokeDashoffset = ''; });
    [...oldLis, ...newLis].forEach((li) => { li.style.opacity = ''; li.style.transform = ''; li.classList.remove('is-on'); });
    [before, afterRow, added].forEach((e) => ((e as HTMLElement).style.opacity = '')); afterCode.style.clipPath = '';
  };

  layout();
  const proxy = { p: 0 };
  let tween: gsap.core.Tween;
  if (pinned) {
    root.classList.add('has-pin-anatomy');
    tween = gsap.to(proxy, {
      p: 1, ease: 'none', onUpdate: () => render(Math.min(1, proxy.p / 0.8)),   // done at 80% of the pin; then the paper curtain rises
      scrollTrigger: { trigger: '.anatomy', start: 'top top', end: () => `+=${Math.round(window.innerHeight * 3)}`, pin: '.anatomy__stage', scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1, onRefresh: () => { layout(); render(Math.min(1, proxy.p / 0.8)); } },
    });
  } else {
    tween = gsap.to(proxy, {
      p: 1, ease: 'none', onUpdate: () => render(proxy.p),
      scrollTrigger: { trigger: fig, start: 'top 88%', end: 'bottom 45%', scrub: 0.8, onRefresh: () => { layout(); render(proxy.p); } },
    });
  }
  render(0);
  return () => { tween.scrollTrigger?.kill(); tween.kill(); root.classList.remove('has-pin-anatomy'); reset(); layout(); };
}

/* ---- toolkit: a tracer runs down the spine; groups reveal with a restrained stagger (reversible) ---- */
function toolkit() {
  const run = q('.toolkit__groups')!;
  const made: gsap.core.Tween[] = [];
  run.style.setProperty('--run', '100');
  made.push(gsap.to(run, { '--run': 0, ease: 'none', scrollTrigger: { trigger: run, start: 'top 78%', end: 'bottom 85%', scrub: 0.6 } }));
  qa('.tgroup').forEach((g) => {
    const items = qa('.tool', g), tick = q('.tgroup__node', g)!;
    gsap.set(items, { opacity: 0, y: 16 });
    made.push(gsap.to(items, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out', stagger: 0.07, scrollTrigger: { trigger: g, start: 'top 82%', toggleActions: 'play none none reverse' } }));
    gsap.set(tick, { scaleX: 0, transformOrigin: '0 50%' });
    made.push(gsap.to(tick, { scaleX: 1, duration: 0.4, ease: 'power2.out', scrollTrigger: { trigger: g, start: 'top 82%', toggleActions: 'play none none reverse' } }));
  });
  return () => { made.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); }); run.style.removeProperty('--run'); gsap.set([...qa('.tool'), ...qa('.tgroup__node')], { clearProps: 'all' }); };
}

/* ---- closing: the route to the contact links is drawn as you arrive ---- */
function closing() {
  const route = q('.closing__route')!, head = q('.closing__head')!;
  route.style.setProperty('--run', '100');
  const a = gsap.to(route, { '--run': 0, ease: 'none', scrollTrigger: { trigger: route, start: 'top 88%', end: 'bottom 97%', scrub: 0.6 } });
  const b = gsap.fromTo(head, { opacity: 0.2, y: 24 }, { opacity: 1, y: 0, ease: 'power1.out', scrollTrigger: { trigger: head, start: 'top 92%', end: 'top 55%', scrub: 0.5 } });
  return () => { [a, b].forEach((t) => { t.scrollTrigger?.kill(); t.kill(); }); route.style.removeProperty('--run'); gsap.set(head, { clearProps: 'all' }); };
}

const mm = gsap.matchMedia();
if (!lite) {
  mm.add({ ok: '(prefers-reduced-motion: no-preference)', full: '(min-width: 1024px)', mid: '(min-width: 641px) and (max-width: 1023px)', portrait: '(orientation: portrait)' }, (ctx) => {
    const c = ctx.conditions as Record<string, boolean>;
    if (!c.ok) return;
    const undo = [hero(c.full ? 2.5 : c.mid ? 2 : 1.8, c.portrait), subtle(), toolkit(), closing()];
    return () => undo.forEach((u) => u());
  });
  mm.add({ ok: '(prefers-reduced-motion: no-preference)', desk: '(min-width: 900px)' }, (ctx) => {
    const c = ctx.conditions as Record<string, boolean>;
    if (!c.ok) return;
    return anatomy(c.desk);
  });
}

root.classList.add('js-ready');
document.fonts?.ready.then(() => ScrollTrigger.refresh());
window.addEventListener('load', () => ScrollTrigger.refresh());
