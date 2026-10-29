/**
 * Progressive enhancement. The page is complete without this file: no-JS and reduced-motion visitors get the finished
 * compositions. There are no pinned sequences (the brief allows two; none was needed). The opening is a sticky "curtain": the hero stays put while the first
 * light scene rises over it, so every pixel of scroll moves real content (no spacer, no dead viewport).
 *
 * Motion system (shared by everything below)
 *   ease      expo-out for entrances, none for scrubbed values (Lenis already smooths them)
 *   duration  0.9 to 1.2 s for entrances, 0.35 to 0.55 s for hover and focus responses
 *   stagger   0.08 s
 *   property  transform and opacity only (plus clip-path on media frames while they reveal, cleared afterwards)
 */
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import Lenis from 'lenis';
import { initCrawlxDemo } from './crawlx-demo';
import { initCliDemo } from './cli-demo';
import { initCerberus } from './cerberus-sim';

gsap.registerPlugin(ScrollTrigger);
ScrollTrigger.config({ ignoreMobileResize: true });

const root = document.documentElement;
const q = <T extends Element = HTMLElement>(s: string, scope: ParentNode = document) => scope.querySelector<T>(s);
const qa = <T extends Element = HTMLElement>(s: string, scope: ParentNode = document) => Array.from(scope.querySelectorAll<T>(s));
const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const EASE = 'expo.out';
const STAGGER = 0.08;

const params = new URLSearchParams(location.search);
const override = params.get('motion');                       // ?motion=lite | ?motion=full (testing)
const mem = (navigator as Navigator & { deviceMemory?: number }).deviceMemory;
const reducedMQ = matchMedia('(prefers-reduced-motion: reduce)');
const reduced = reducedMQ.matches && override !== 'full';
const lite = override ? override === 'lite' : mem !== undefined && mem <= 2;
const coarse = matchMedia('(pointer: coarse)').matches;
const desktop = () => matchMedia('(min-width: 901px)').matches;

/* ---------------------------------------------------------------- smooth scrolling (Lenis, GSAP ticker) */
let lenis: Lenis | null = null;
const tick = (time: number) => { lenis?.raf(time * 1000); };
if (!lite && !reduced) {
  lenis = new Lenis({ autoRaf: false, lerp: 0.11, smoothWheel: true, wheelMultiplier: 1 });   // touch stays native
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(tick);
  gsap.ticker.lagSmoothing(0);
  (window as unknown as { __lenis?: Lenis }).__lenis = lenis;
}
const scrollToId = (id: string, immediate = false) => {
  const el = id === '#top' ? null : q(id);
  if (id !== '#top' && !el) return false;
  if (lenis) lenis.scrollTo(el ?? 0, { duration: 1.1, immediate });
  else if (el) el.scrollIntoView(); else window.scrollTo(0, 0);
  return true;
};
document.addEventListener('click', (e) => {
  const a = (e.target as Element).closest<HTMLAnchorElement>('a[href^="#"]');
  if (!a || !lenis || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const id = a.getAttribute('href')!;
  if (id.length > 1 && !q(id)) return;
  e.preventDefault();
  history.replaceState({ y: window.scrollY }, '');
  scrollToId(id); history.pushState(null, '', id);
});
addEventListener('popstate', (e) => {
  const y = (e.state as { y?: number } | null)?.y;
  if (typeof y === 'number') {
    const restore = () => window.scrollTo(0, y);
    restore();
    addEventListener('hashchange', () => { restore(); requestAnimationFrame(restore); }, { once: true });
    setTimeout(restore, 80);
  } else if (location.hash.length > 1) scrollToId(location.hash, true);
});

/* ---------------------------------------------------------------- navigation: tone per scene, hide on scroll down, current section */
const nav = q('.nav')!;
const setTone = (t: string) => { if (nav.dataset.tone !== t) nav.dataset.tone = t; };
const setCurrent = (id: string) => qa<HTMLAnchorElement>('.nav ul a').forEach((a) => { if (a.getAttribute('href') === id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
function initNav() {
  qa('[data-scene]').forEach((sec) => {
    ScrollTrigger.create({ trigger: sec, start: 'top 40px', end: 'bottom 40px', onToggle: (s) => { if (s.isActive) setTone(sec.dataset.scene === 'paper' ? 'paper' : 'dark'); } });
  });
  setCurrent('#top');
  const map: [string, string][] = [['.work', '#work'], ['#lab', '#work'], ['#pwndbg', '#work'], ['#toolkit', '#toolkit'], ['#writing', '#writing'], ['#resume', '#resume'], ['#contact', '#contact']];
  map.forEach(([sel, id]) => { const el = q(sel); if (el) ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) setCurrent(id); } }); });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'top -50%', onEnter: () => setCurrent('#top'), onLeaveBack: () => setCurrent('#top') });
  ScrollTrigger.create({
    start: 0, end: 'max', onUpdate: (self) => {
      const y = self.scroll();
      if (y < 120 || self.direction === -1) nav.classList.remove('is-hidden');
      else if (self.direction === 1 && y > 500) nav.classList.add('is-hidden');
    },
  });
}

/* ---------------------------------------------------------------- opening */
function initHero() {
  const lines = qa('.hero__line [data-i]');
  const intro = qa('.hero [data-intro]').filter((el) => !el.classList.contains('hero__line'));
  const rows = qa('.index__row');
  const fill = q('.index__trace-fill')!;
  const grid = q('.hero__grid')!, glow1 = q('.hero__glow .g1')!, glow2 = q('.hero__glow .g2')!;
  const hero = q('.hero')!;
  const nodeAt = (i: number) => (rows.length > 1 ? (i + 0.5) / rows.length : 1);   // fill fraction at which node i is reached
  // The trace fills 0 -> 1 across the nodes; rows below the current fill light up.
  let drawn = 0;
  const paint = (f: number) => {
    drawn = f;
    gsap.set(fill, { scaleY: f });
    rows.forEach((r, i) => r.classList.toggle('is-lit', f >= (i === 0 ? 0.001 : i / (rows.length - 1)) - 0.001));
  };

  gsap.set(lines, { yPercent: 105, y: 0 });
  gsap.set(intro, { opacity: 0, y: 24 });
  gsap.set(rows, { opacity: 0, x: 18 });
  paint(0);
  root.classList.add('ready');

  const tl = gsap.timeline({ defaults: { ease: EASE }, delay: 0.1 });
  tl.to(lines, { yPercent: 0, duration: 1.15, stagger: 0.11 }, 0)
    .to(intro, { opacity: 1, y: 0, duration: 1, stagger: STAGGER }, 0.35)
    .to(rows, { opacity: 1, x: 0, duration: 0.9, stagger: STAGGER }, 0.5)
    .to({ f: 0 }, { f: 0.08, duration: 0.9, ease: 'power2.inOut', onUpdate() { paint(Math.max(drawn, (this.targets()[0] as { f: number }).f)); } }, 0.9);

  // Scroll: the trace carries on down the index while the first light scene rises over the hero.
  // The curtain covers the index at roughly 0.55 of this range, so the trace completes by 0.45.
  const travel = () => hero.getBoundingClientRect().height;
  ScrollTrigger.create({
    start: 0, end: () => travel(), scrub: true, invalidateOnRefresh: true,
    onUpdate: (self) => {
      const p = self.progress;
      if (tl.isActive() && p < 0.01) return;
      paint(Math.max(0.08, clamp01(p / 0.42)));
      if (!lite) {
        gsap.set(grid, { y: -p * 36, scale: 1 - p * 0.05, opacity: 1 - p * 0.75, transformOrigin: '50% 0%' });
        gsap.set(glow1, { y: p * 80 }); gsap.set(glow2, { y: -p * 50 });
      }
    },
  });
  void nodeAt;

  // Gentle pointer response on the glow (mouse only).
  if (!coarse && !lite && !reduced) {
    const x1 = gsap.quickTo(glow1, 'x', { duration: 1.4, ease: 'power3.out' }), y1 = gsap.quickTo(glow1, 'yPercent', { duration: 1.4, ease: 'power3.out' });
    hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); x1(((e.clientX - r.left) / r.width - 0.5) * -60); y1(((e.clientY - r.top) / r.height - 0.5) * -8); });
  }
}

/* ---------------------------------------------------------------- shared reveals */
function initReveals() {
  qa('[data-reveal-group]').forEach((g) => {
    const items = qa('[data-reveal-item]', g);
    if (!items.length) return;
    gsap.set(items, { opacity: 0, y: 28 });
    ScrollTrigger.create({ trigger: g, start: 'top 88%', once: true, onEnter: () => gsap.to(items, { opacity: 1, y: 0, duration: 1, ease: EASE, stagger: STAGGER, clearProps: 'transform' }) });
  });
  // Media frames: a controlled clip-path reveal that is removed afterwards, so nothing is ever cropped at rest.
  if (!lite) qa('[data-frame]').forEach((f) => {
    gsap.set(f, { clipPath: 'inset(9% 5% 9% 5% round 28px)', opacity: 0.001 });
    ScrollTrigger.create({ trigger: f, start: 'top 90%', once: true, onEnter: () => gsap.to(f, { clipPath: 'inset(0% 0% 0% 0% round 24px)', opacity: 1, duration: 1.3, ease: EASE, clearProps: 'clipPath,opacity' }) });
  });
  else qa('[data-frame]').forEach((f) => { gsap.set(f, { opacity: 0 }); ScrollTrigger.create({ trigger: f, start: 'top 90%', once: true, onEnter: () => gsap.to(f, { opacity: 1, duration: 0.6, clearProps: 'opacity' }) }); });
  // Subtle depth on screenshots.
  if (!lite) qa('[data-parallax]').forEach((el) => {
    const n = (parseFloat(el.dataset.parallax || '8') || 8) * (coarse ? 0.5 : 1);
    gsap.fromTo(el, { y: -n }, { y: n, ease: 'none', scrollTrigger: { trigger: el, start: 'top bottom', end: 'bottom top', scrub: true } });
  });
}

/* ---------------------------------------------------------------- demonstrations (simulations; see each module) */
function initDemos() {
  const cx = q('[data-cx]'), cl = q('[data-cli]'), cb = q('[data-cerb]');
  if (cx) initCrawlxDemo(cx, { reduced });
  if (cl) initCliDemo(cl, { reduced });
  if (cb) initCerberus(cb, { reduced });
}

/* ---------------------------------------------------------------- scroll-linked depth: demo frames scale up and settle as they arrive */
function initZoom() {
  if (reduced || lite) return;
  qa('[data-zoom]').forEach((el) => {
    gsap.fromTo(el, { scale: coarse ? 0.97 : 0.93, yPercent: 3, transformOrigin: '50% 0%' }, {
      scale: 1, yPercent: 0, ease: 'none', immediateRender: true,
      scrollTrigger: { trigger: el, start: 'top 98%', end: 'top 38%', scrub: true },
    });
  });
}

/* ---------------------------------------------------------------- hero: a signal travels the index trace, row to row, through the real project list */
function initSignal() {
  const sig = q('.index__signal'), rows = qa('.index__row'); if (!sig || !rows.length || reduced) return;
  const wrap = q('.index-wrap')!;
  const ys = () => rows.map((r) => r.offsetTop + r.offsetHeight / 2 - rows[0].offsetHeight / 2);
  const tl = gsap.timeline({ repeat: -1, repeatDelay: 1.6, delay: 2.2, paused: false });
  const build = () => { tl.clear(); ys().forEach((y, i) => { tl.to(sig, { y, opacity: 1, duration: i ? 0.9 : 0.01, ease: 'power2.inOut' }); tl.add(() => rows.forEach((r, k) => r.classList.toggle('is-ping', k === i)), '>'); tl.to({}, { duration: 0.45 }); }); tl.to(sig, { opacity: 0, duration: 0.4 }).add(() => rows.forEach((r) => r.classList.remove('is-ping'))); };
  gsap.set(sig, { opacity: 0, y: 0 });
  build();
  addEventListener('resize', () => { build(); tl.restart(); });
  ScrollTrigger.create({ trigger: wrap, start: 'top bottom', end: 'bottom top', onToggle: (s) => (s.isActive ? tl.resume() : tl.pause()) });
}

/* ---------------------------------------------------------------- Pwndbg: old options resolve into subcommands (about a second, no pin) */
function initCymbol() {
  const cym = q('[data-cym]'); if (!cym) return;
  const rows = qa('.cym__row', cym), links = rows.map((r) => q('.cym__link i', r)!), news = rows.map((r) => q('.cym__new code', r)!);
  gsap.set(links, { scaleX: 0 }); gsap.set(news, { opacity: 0.2, x: -8 });
  ScrollTrigger.create({
    trigger: q('.cym__table', cym)!, start: 'top 80%', once: true,
    onEnter: () => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      rows.forEach((r, i) => {
        tl.to(links[i], { scaleX: 1, duration: 0.55 }, i * 0.1)
          .to(news[i], { opacity: 1, x: 0, duration: 0.6 }, i * 0.1 + 0.18)
          .add(() => r.classList.add('is-done'), i * 0.1 + 0.5);
      });
    },
  });
}

/* ---------------------------------------------------------------- toolkit: tools <-> projects, with a drawn trace (interaction; works with or without motion) */
function initKit() {
  const kit = q('.kit'), wrap = q('[data-kit]'); if (!kit || !wrap) return;
  const svg = q<SVGSVGElement>('.kit__trace', wrap)!;
  const tools = qa<HTMLButtonElement>('.tool', wrap), chips = qa<HTMLAnchorElement>('.chip', wrap);
  const ns = 'http://www.w3.org/2000/svg';
  svg.innerHTML = '<defs><linearGradient id="kit-grad" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="1000" y2="0"><stop offset="0" stop-color="#7C5CFF"/><stop offset="1" stop-color="#FF6BB5"/></linearGradient></defs>';
  const idsOf = (t: HTMLElement) => (t.dataset.projects || '').split(' ').filter(Boolean);
  let locked: HTMLButtonElement | null = null;

  const draw = (pairs: [HTMLElement, HTMLElement][]) => {
    qa('path', svg).forEach((p) => p.remove());
    if (!desktop() || !pairs.length) return;
    const w = wrap.getBoundingClientRect();
    svg.setAttribute('viewBox', `0 0 ${w.width} ${w.height}`);
    q('#kit-grad', svg)?.setAttribute('x2', String(w.width));
    pairs.forEach(([t, c]) => {
      const a = t.getBoundingClientRect(), b = c.getBoundingClientRect();
      const x1 = a.right - w.left, y1 = a.top + a.height / 2 - w.top, x2 = b.left - w.left, y2 = b.top + b.height / 2 - w.top;
      const dx = Math.max(40, (x2 - x1) / 2);
      const path = document.createElementNS(ns, 'path');
      path.setAttribute('d', `M ${x1} ${y1} C ${x1 + dx} ${y1}, ${x2 - dx} ${y2}, ${x2} ${y2}`);
      svg.appendChild(path);
      const len = path.getTotalLength();
      if (reduced) return;
      path.style.strokeDasharray = `${len}`; path.style.strokeDashoffset = `${len}`;
      gsap.to(path, { strokeDashoffset: 0, duration: 0.7, ease: EASE });
    });
  };
  const show = (activeTools: HTMLElement[], activeChips: HTMLElement[]) => {
    kit.classList.toggle('has-active', activeTools.length + activeChips.length > 0);
    tools.forEach((t) => t.classList.toggle('is-on', activeTools.includes(t)));
    chips.forEach((c) => c.classList.toggle('is-on', activeChips.includes(c)));
    const pairs: [HTMLElement, HTMLElement][] = [];
    activeTools.forEach((t) => activeChips.forEach((c) => { if (idsOf(t).includes(c.dataset.id!)) pairs.push([t, c]); }));
    draw(pairs);
  };
  const forTool = (t: HTMLButtonElement) => show([t], chips.filter((c) => idsOf(t).includes(c.dataset.id!)));
  const forChip = (c: HTMLAnchorElement) => show(tools.filter((t) => idsOf(t).includes(c.dataset.id!)), [c]);
  const rest = () => (locked ? forTool(locked) : show([], []));

  tools.forEach((t) => {
    t.addEventListener('pointerenter', () => forTool(t)); t.addEventListener('focus', () => forTool(t));
    t.addEventListener('pointerleave', rest); t.addEventListener('blur', rest);
    t.addEventListener('click', () => {
      locked = locked === t ? null : t;
      tools.forEach((x) => x.setAttribute('aria-pressed', String(x === locked)));
      rest(); if (locked) forTool(locked);
    });
  });
  chips.forEach((c) => {
    c.addEventListener('pointerenter', () => forChip(c)); c.addEventListener('focus', () => forChip(c));
    c.addEventListener('pointerleave', rest); c.addEventListener('blur', rest);
  });
  addEventListener('resize', rest);
}

/* ---------------------------------------------------------------- experience timeline */
function initTimeline() {
  const tlEl = q('[data-timeline]'); if (!tlEl) return;
  const fill = q('.timeline__fill', tlEl)!, entries = qa('[data-tl]', tlEl);
  gsap.set(fill, { scaleY: 0 });
  gsap.to(fill, { scaleY: 1, ease: 'none', scrollTrigger: { trigger: tlEl, start: 'top 68%', end: 'bottom 62%', scrub: true } });
  entries.forEach((e) => {
    const parts = qa(':scope > :not(.tl__dot)', e);
    gsap.set(parts, { opacity: 0, y: 22 });
    ScrollTrigger.create({
      trigger: e, start: 'top 72%',
      onEnter: () => { e.classList.add('is-on'); gsap.to(parts, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: 0.06, overwrite: true, clearProps: 'transform' }); },
      onLeaveBack: () => e.classList.remove('is-on'),
    });
  });
}

/* ---------------------------------------------------------------- contact: a signal travels the rail to the channel in focus */
function initContact() {
  const box = q('[data-channels]'); if (!box) return;
  const rows = qa('.channel', box), signal = q('.channels__signal', box)!, fill = q('.channels__fill', box)!;
  const centre = (i: number) => rows[i].offsetTop + rows[i].offsetHeight / 2;
  let active = 0;
  const go = (i: number, instant = false) => {
    active = i;
    rows.forEach((r, k) => r.classList.toggle('is-active', k === i));
    if (instant || reduced) gsap.set(signal, { y: centre(i) }); else gsap.to(signal, { y: centre(i), duration: 0.7, ease: EASE, overwrite: true });
  };
  rows.forEach((r, i) => { r.addEventListener('pointerenter', () => go(i)); r.addEventListener('focusin', () => go(i)); });
  box.addEventListener('pointerleave', () => go(0));
  box.addEventListener('focusout', (e) => { if (!box.contains((e as FocusEvent).relatedTarget as Node)) go(0); });
  addEventListener('resize', () => go(active, true));
  gsap.set(signal, { y: centre(0), opacity: reduced ? 1 : 0 });
  rows.forEach((r, i) => r.classList.toggle('is-active', i === 0));
  if (reduced) return;
  gsap.set(fill, { scaleY: 0 }); gsap.set(rows, { opacity: 0, y: 18 });
  ScrollTrigger.create({
    trigger: box, start: 'top 82%', once: true,
    onEnter: () => {
      const tl = gsap.timeline({ defaults: { ease: EASE } });
      tl.to(fill, { scaleY: 1, duration: 1.3 }, 0)
        .to(rows, { opacity: 1, y: 0, duration: 0.9, stagger: STAGGER, clearProps: 'transform' }, 0.15)
        .fromTo(signal, { y: 0, opacity: 1 }, { y: centre(0), opacity: 1, duration: 1.2 }, 0)
        .add(() => go(0, true));
    },
  });
}

function initCopy() {
  const btn = q<HTMLButtonElement>('[data-copy]'), status = q('[data-copy-status]'); if (!btn) return;
  btn.addEventListener('click', async () => {
    const text = btn.dataset.copy || '';
    try { await navigator.clipboard.writeText(text); }
    catch { const ta = document.createElement('textarea'); ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.opacity = '0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch { /* ignore */ } ta.remove(); }
    const old = btn.textContent; btn.textContent = 'Copied'; if (status) status.textContent = 'Email address copied';
    setTimeout(() => { btn.textContent = old; if (status) status.textContent = ''; }, 1800);
  });
}

/* ---------------------------------------------------------------- boot */
initKit(); initCopy(); initDemos();
if (reduced) {
  root.classList.add('ready');
  initNav(); initContact();
  qa<HTMLElement>('.index__row').forEach((r) => r.classList.add('is-lit'));
} else {
  initNav(); initHero(); initSignal(); initReveals(); initZoom(); initCymbol(); initTimeline(); initContact();
}
const refresh = () => ScrollTrigger.refresh();
document.fonts?.ready.then(refresh);
let rt = 0;
qa<HTMLImageElement>('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(rt); rt = window.setTimeout(refresh, 120); }, { once: true }); });
addEventListener('load', () => setTimeout(refresh, 200));
if (location.hash.length > 1) setTimeout(() => scrollToId(location.hash, true), 400);
