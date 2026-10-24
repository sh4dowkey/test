/**
 * Progressive enhancement. The page is complete without this file (no-JS and reduced-motion get static compositions).
 * Pinned sequences: the hero zoom (E2) and the Pwndbg anatomy build (E5). Nothing else pins. Native scrolling throughout.
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { stateAt, project, calloutsAt, platesAt } from '../lib/structure';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const q = <T extends Element = HTMLElement>(s: string) => document.querySelector<T>(s);
const nav = q('.nav')!;
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const setTone = (t: string) => { if (nav.dataset.tone !== t) nav.dataset.tone = t; };

// Provisional capability heuristic (docs/03-storyboard.md section 7, "Lite"). Core count is NOT used: VMs and
// throttled devices misreport it. Threshold is an untested assumption. Override for testing: ?motion=lite | ?motion=full
const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
const override = new URLSearchParams(location.search).get('motion');
const lite = override ? override === 'lite' : mem !== undefined && mem <= 2;

/* ---- always on: nav tone per scene + brand reveal (no animation involved) ---- */
document.querySelectorAll<HTMLElement>('[data-scene]').forEach((sec) => {
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
ScrollTrigger.create({ trigger: '.premise', start: 'top 30%', onEnter: () => nav.classList.add('is-brand'), onLeaveBack: () => nav.classList.remove('is-brand') });

/* ---- E2: enter the name (hero) ---- */
function hero(dist: number, portrait: boolean) {
  const heroEl = q('.hero')!, stage = q('.hero__stage')!, line = q('.hero__line')!, grid = q('.hero__grid')!;
  const svg = q<SVGSVGElement>(portrait ? '.hero__sheet--stacked' : '.hero__sheet--single')!;
  const g = svg.querySelector<SVGGElement>('.zoom')!;
  const vbw = +svg.dataset.vbw!, minY = +svg.dataset.miny!, Px = +svg.dataset.px!, Py = +svg.dataset.py!, Pr = +svg.dataset.pr!;
  let k = 1, rectL = 0, rectT = 0, Q0x = 0, Q0y = 0, Cx = 0, Cy = 0, S = 1;

  const measure = () => {
    const r = svg.getBoundingClientRect(), s = stage.getBoundingClientRect();
    rectL = r.left - s.left; rectT = r.top - s.top; k = r.width / vbw;
    Cx = s.width / 2; Cy = s.height / 2;
    Q0x = rectL + Px * k; Q0y = rectT + (Py - minY) * k;
    S = (1.08 * Math.hypot(s.width, s.height) / 2) / (Pr * k);
  };
  const render = (p: number) => {
    const s = Math.pow(S, p);                      // exponential: perceptually even zoom speed
    const Qx = Q0x + (Cx - Q0x) * p, Qy = Q0y + (Cy - Q0y) * p;
    const tx = (Qx - rectL) / k - s * Px, ty = (Qy - rectT) / k + minY - s * Py;
    g.setAttribute('transform', `translate(${tx.toFixed(2)} ${ty.toFixed(2)}) scale(${s.toFixed(4)})`);
    grid.style.transform = `scale(${(1 + p * 2.2).toFixed(3)})`;
    line.style.opacity = String(Math.max(0, 1 - p / 0.15));
    setTone(p > 0.72 ? 'blueprint' : 'paper');
  };
  const proxy = { p: 0 };
  const tween = gsap.to(proxy, {
    p: 1, ease: 'none', onUpdate: () => render(proxy.p),
    scrollTrigger: {
      trigger: heroEl, start: 'top top', end: () => `+=${Math.round(window.innerHeight * dist)}`,
      pin: stage, scrub: 0.8, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 2,
      onRefresh: () => { measure(); render(proxy.p); },
    },
  });
  measure(); render(0);
  return () => { tween.scrollTrigger?.kill(); tween.kill(); g.removeAttribute('transform'); grid.style.transform = ''; line.style.opacity = ''; setTone('paper'); };
}

/* ---- E3 premise reading band, E6 evidence settle ---- */
function subtle() {
  const tl: gsap.core.Tween[] = [];
  gsap.utils.toArray<HTMLElement>('.premise__text .line').forEach((el) => {
    tl.push(gsap.fromTo(el, { opacity: 0.28 }, { opacity: 1, ease: 'none', scrollTrigger: { trigger: el, start: 'top 82%', end: 'top 55%', scrub: 0.3 } }));
  });
  gsap.utils.toArray<HTMLElement>('.evidence').forEach((el) => {
    tl.push(gsap.fromTo(el, { y: 28, scale: 1.035 }, { y: 0, scale: 1, ease: 'power1.out', scrollTrigger: { trigger: el, start: 'top 92%', end: 'top 58%', scrub: 0.5 } }));
  });
  return () => tl.forEach((t) => { t.scrollTrigger?.kill(); t.kill(); gsap.set(t.targets(), { clearProps: 'all' }); });
}

/* ---- E5: Pwndbg anatomy (illustration assembles, flattens, annotates) ---- */
function anatomy(pinned: boolean) {
  const svg = q<SVGSVGElement>('.structure')!;
  const polys = Array.from(svg.querySelectorAll<SVGPolygonElement>('polygon.slab'));
  const paths = Array.from(svg.querySelectorAll<SVGPathElement>('.callout'));
  const labels = Array.from(svg.querySelectorAll<SVGTextElement>('.callout-label'));
  paths.forEach((p) => { p.style.strokeDasharray = '1'; });
  const render = (p: number) => {
    const pts = project(stateAt(p)), op = platesAt(p), c = calloutsAt(p);
    polys.forEach((el, i) => { el.setAttribute('points', pts[i]); el.style.opacity = String(op); });
    paths.forEach((el) => { el.style.strokeDashoffset = String(1 - c); el.style.opacity = c > 0 ? '1' : '0'; });
    labels.forEach((el) => { el.style.opacity = String(clamp01((c - 0.6) / 0.4)); });
  };
  const proxy = { p: 0 };
  let tween: gsap.core.Tween;
  if (pinned) {
    root.classList.add('has-pin-anatomy');
    tween = gsap.to(proxy, {
      p: 1, ease: 'none', onUpdate: () => render(Math.min(1, proxy.p / 0.8)),   // finishes at 80% of the pin, then the Paper curtain rises over it
      scrollTrigger: { trigger: '.anatomy', start: 'top top', end: () => `+=${Math.round(window.innerHeight * 3)}`, pin: '.anatomy__stage', scrub: 1, anticipatePin: 1, invalidateOnRefresh: true, refreshPriority: 1 },
    });
  } else {
    tween = gsap.to(proxy, {
      p: 1, ease: 'none', onUpdate: () => render(proxy.p),
      scrollTrigger: { trigger: '.anatomy__fig', start: 'top 88%', end: 'bottom 40%', scrub: 0.8 },
    });
  }
  render(0);
  return () => {
    tween.scrollTrigger?.kill(); tween.kill(); root.classList.remove('has-pin-anatomy');
    render(1);
  };
}

const mm = gsap.matchMedia();
if (!lite) {
  mm.add({ ok: '(prefers-reduced-motion: no-preference)', full: '(min-width: 1024px)', mid: '(min-width: 641px) and (max-width: 1023px)', portrait: '(orientation: portrait)' }, (ctx) => {
    const c = ctx.conditions as Record<string, boolean>;
    if (!c.ok) return;
    const undoHero = hero(c.full ? 2.5 : c.mid ? 2 : 1.8, c.portrait);
    const undoSubtle = subtle();
    return () => { undoHero(); undoSubtle(); };
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
