/**
 * Progressive enhancement. The page is complete without this file: no-JS and reduced-motion visitors get the finished
 * compositions. There is exactly one pinned sequence: the opening (hero-scene.ts), pinned for about 1.75 viewports on desktop and 1.15 on phones.
 * Everything else is scroll-linked or reveal-based without pinning. The demonstrations run on their own loops (loop.ts).
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
import { initHeroScene } from './hero-scene';
import { initContactVisual } from './contact-visual';

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
/** Deliberate, distance-aware navigation: about 1.5 s for a neighbouring section, up to about 2.8 s across the whole page,
 *  with a symmetric ease so the page accelerates away and settles on the target instead of flying past it. */
const navEase = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);   // quadratic in-out: a calm peak speed
const scrollToId = (id: string, immediate = false) => {
  const el = id === '#top' ? null : q(id);
  if (id !== '#top' && !el) return false;
  if (lenis) {
    const y = el ? el.getBoundingClientRect().top + window.scrollY : 0, screens = Math.abs(y - window.scrollY) / innerHeight;
    lenis.scrollTo(el ?? 0, { duration: 1.45 + Math.min(1.35, screens * 0.06), easing: navEase, immediate, lock: false });
  }
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
  const map: [string, string][] = [['.curtain', '#work'], ['#lab', '#work'], ['#pwndbg', '#work'], ['#toolkit', '#toolkit'], ['#writing', '#writing'], ['#resume', '#resume'], ['#contact', '#contact']];
  map.forEach(([sel, id]) => { const el = q(sel); if (el) ScrollTrigger.create({ trigger: el, start: 'top 50%', end: 'bottom 50%', onToggle: (s) => { if (s.isActive) setCurrent(id); } }); });
  ScrollTrigger.create({ trigger: '.hero', start: 'top top', end: 'bottom 60%', onToggle: (s) => { if (s.isActive) setCurrent('#top'); } });
  ScrollTrigger.create({
    start: 0, end: 'max', onUpdate: (self) => {
      const y = self.scroll();
      if (y < 120 || self.direction === -1) nav.classList.remove('is-hidden');
      else if (self.direction === 1 && y > 500) nav.classList.add('is-hidden');
    },
  });
}

/* ---------------------------------------------------------------- opening: one pinned, scrubbed sequence (see hero-scene.ts) */
function initHero() {
  const hero = q('.hero')!;
  let target = 0;
  const scene = initHeroScene(hero, { reduced, getP: () => target, setTone: (t) => setTone(t) });
  root.classList.add('ready');
  if (reduced) return;
  const chars = qa('.hero .ch > span'), subs = qa('.hero__sub > span');
  gsap.set(chars, { yPercent: 118 }); gsap.set(subs, { clipPath: 'inset(0 100% 0 0)', x: -10 });
  const state = { v: 0 };
  const run = () => gsap.timeline({ defaults: { ease: EASE } })
    .to(state, { v: 1, duration: 2.8, ease: 'power2.out', onUpdate: () => scene.setIntro(state.v) }, 0)
    .to(chars, { yPercent: 0, duration: 1.5, stagger: 0.075 }, 0.2)
    .to(subs, { clipPath: 'inset(0 0% 0 0)', x: 0, duration: 1.3, ease: 'power3.inOut' }, 1.15);
  (document.fonts?.ready ?? Promise.resolve()).then(run);
  const phone = matchMedia('(max-width: 700px)');
  ScrollTrigger.create({
    trigger: hero, start: 'top top', end: () => '+=' + Math.round(innerHeight * (phone.matches ? 1.15 : 1.75)),
    pin: '.hero__pin', pinSpacing: true, anticipatePin: 1, invalidateOnRefresh: true,
    onUpdate: (self) => { target = self.progress; },
  });
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

/* ---------------------------------------------------------------- Pwndbg: the refactor, explained in one scrubbed timeline (no pin, no buttons) */
function initCymbol() {
  const cym = q('[data-cym]'); if (!cym) return;
  const usage = qa('.cym__usage p', cym), rows = qa('.cym__row', cym);
  const olds = rows.map((r) => q('.cym__old code', r)!), links = rows.map((r) => q('.cym__link i', r)!), news = rows.map((r) => q('.cym__new code', r)!);
  const head = q('.cym__table thead', cym)!, added = q('.cym__added', cym)!, fig = q('.evidence', cym)!, img = q('img', fig)!;
  gsap.set(usage, { clipPath: 'inset(0 100% 0 0)' }); gsap.set(head, { opacity: 0 });
  gsap.set(olds, { opacity: 0, x: -12, '--s': '0%' }); gsap.set(links, { scaleX: 0 }); gsap.set(news, { opacity: 0, x: -14 });
  gsap.set(added, { opacity: 0, y: 10 }); gsap.set(fig, { clipPath: 'inset(0 0 100% 0)' }); gsap.set(img, { scale: 1.08 });
  // 1. the command comparison starts as the block enters the view and finishes while its last rows are still on screen
  const tl = gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: usage[0], endTrigger: q('.cym__table', cym)!, start: 'top 90%', end: 'bottom 64%', scrub: 0.6 } });
  tl.to(usage[0], { clipPath: 'inset(0 0% 0 0)', duration: 0.7 }, 0)                                 // the old syntax
    .to(head, { opacity: 1, duration: 0.25 }, 0.55)
    .to(olds, { opacity: 1, x: 0, duration: 0.5, stagger: 0.07 }, 0.65)                              // each old option
    .to(links, { scaleX: 1, duration: 0.55, stagger: 0.09 }, 1.15)                                   // paths draw while the rows are visible
    .to(olds, { '--s': '100%', opacity: 0.45, duration: 0.45, stagger: 0.07 }, 1.4)                  // old options struck
    .to(news, { opacity: 1, x: 0, duration: 0.5, stagger: 0.09 }, 1.5)                               // subcommands settle
    .to(usage[1], { clipPath: 'inset(0 0% 0 0)', duration: 0.6 }, 2.2)                               // the new syntax
    .to(added, { opacity: 1, y: 0, duration: 0.35 }, 2.75)
    .to({}, { duration: 0.15 });
  // 2. the patch evidence has its own trigger: it starts as the image nears the viewing area and is done with its top at mid-screen
  gsap.timeline({ defaults: { ease: 'none' }, scrollTrigger: { trigger: fig, start: 'top 97%', end: 'top 48%', scrub: 0.5 } })
    .to(fig, { clipPath: 'inset(0 0 0% 0)', duration: 1 }, 0).to(img, { scale: 1, duration: 1 }, 0);
}

/* ---------------------------------------------------------------- toolkit: names always visible; a trace and a wave pass through the groups; focus shows the evidence */
function initKit() {
  const board = q('[data-kit]'); if (!board) return;
  const cols = qa('.kit__col', board), tools = qa<HTMLButtonElement>('.tool', board), focus = q('[data-focus]', board)!, rail = q<SVGSVGElement>('.kit__rail', board)!;
  const ns = 'http://www.w3.org/2000/svg', def = focus.innerHTML;
  const names = (c: Element) => qa('.tool__name', c);
  // focus: dim the rest and show what the tool is based on
  const label = { work: 'Work', project: 'Project', self: 'Self-assessed', early: 'Early experience' } as const;
  const show = (t: HTMLButtonElement | null) => {
    board.classList.toggle('has-focus', !!t); tools.forEach((x) => x.classList.toggle('is-on', x === t));
    if (!t) { focus.innerHTML = def; return; }
    const b = t.dataset.basis as keyof typeof label;
    focus.innerHTML = `<span><b>${t.dataset.name}</b> ${label[b]}: ${t.dataset.detail}${t.dataset.href ? ` <a class="textlink" href="${t.dataset.href}">See it</a>` : ''}</span>`;
  };
  tools.forEach((t) => { t.addEventListener('pointerenter', () => show(t)); t.addEventListener('focus', () => show(t)); t.addEventListener('pointerleave', () => show(null)); t.addEventListener('blur', () => show(null)); t.addEventListener('click', () => { if (t.dataset.href) scrollToId(t.dataset.href); }); });
  if (reduced) return;
  // reveal: coordinated wave across the columns (names are in the HTML and stay readable if this never runs)
  gsap.set(tools, { opacity: 0, y: 14 });
  ScrollTrigger.create({ trigger: board, start: 'top 82%', once: true, onEnter: () => gsap.to(tools, { opacity: 1, y: 0, duration: 0.9, ease: EASE, stagger: { each: 0.045, grid: 'auto', from: 'start' }, clearProps: 'transform' }) });
  // trace: a line through the four group headings with a pulse that visits each and lights its names in turn
  let tlp: gsap.core.Timeline | null = null;
  const build = () => {
    tlp?.kill(); rail.replaceChildren();
    if (!desktop()) return;
    const w = board.getBoundingClientRect(); rail.setAttribute('viewBox', `0 0 ${w.width} 24`);
    const xs = cols.map((c) => (q('.kit__title', c)!.getBoundingClientRect().left - w.left) + 4);
    const line = document.createElementNS(ns, 'line'); line.setAttribute('x1', String(xs[0])); line.setAttribute('x2', String(xs[xs.length - 1] + (w.width - xs[xs.length - 1]) * 0.18)); line.setAttribute('y1', '12'); line.setAttribute('y2', '12'); rail.appendChild(line);
    const dots = xs.map((x) => { const c = document.createElementNS(ns, 'circle'); c.setAttribute('cx', String(x)); c.setAttribute('cy', '12'); c.setAttribute('r', '3'); rail.appendChild(c); return c; });
    const pulse = document.createElementNS(ns, 'circle'); pulse.setAttribute('r', '5'); pulse.setAttribute('cy', '12'); pulse.setAttribute('cx', String(xs[0])); pulse.setAttribute('class', 'kit__pulse'); rail.appendChild(pulse);
    const len = line.getTotalLength(); gsap.fromTo(line, { strokeDasharray: len, strokeDashoffset: len }, { strokeDashoffset: 0, duration: 1.4, ease: 'power2.inOut', scrollTrigger: { trigger: board, start: 'top 80%', once: true } });
    tlp = gsap.timeline({ repeat: -1, paused: true, delay: 1.6 });
    cols.forEach((c, i) => {
      if (i) tlp!.to(pulse, { attr: { cx: xs[i] }, duration: 1.1, ease: 'power2.inOut' });
      tlp!.to(dots[i], { attr: { r: 5.5 }, duration: 0.25, yoyo: true, repeat: 1 }, '>-0.1')
        .to(names(c), { '--w': 1, duration: 0.35, stagger: 0.14, yoyo: true, repeat: 1, ease: 'power1.inOut' }, '<')
        .to({}, { duration: 0.9 });
    });
    ScrollTrigger.create({ trigger: board, start: 'top 85%', end: 'bottom 10%', onToggle: (s) => (s.isActive ? tlp!.play() : tlp!.pause()) });
  };
  build(); let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = window.setTimeout(() => { build(); ScrollTrigger.refresh(); }, 150); });
  board.addEventListener('pointerenter', () => tlp?.pause()); board.addEventListener('pointerleave', () => tlp?.play());
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

/* ---------------------------------------------------------------- contact: the visual loops on its own; hovering a link brightens its arc */
function initContact() {
  const fig = q('[data-cvisual]'); if (!fig) return;
  const vis = initContactVisual(fig, { reduced });
  qa('.contact__links li').forEach((li) => {
    const k = li.dataset.k!;
    li.addEventListener('pointerenter', () => vis.hover(k)); li.addEventListener('focusin', () => vis.hover(k));
    li.addEventListener('pointerleave', () => vis.hover(null)); li.addEventListener('focusout', () => vis.hover(null));
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
initCopy(); initDemos();
// The pinned opening must be created first: every ScrollTrigger below it measures positions after its pin spacing.
if (reduced) {
  root.classList.add('ready');
  initHero(); initNav(); initKit(); initContact();
} else {
  initHero(); initNav(); initReveals(); initZoom(); initCymbol(); initKit(); initTimeline(); initContact();
}
const refresh = () => ScrollTrigger.refresh();
document.fonts?.ready.then(refresh);
let rt = 0;
qa<HTMLImageElement>('img').forEach((im) => { if (!im.complete) im.addEventListener('load', () => { clearTimeout(rt); rt = window.setTimeout(refresh, 120); }, { once: true }); });
addEventListener('load', () => setTimeout(refresh, 200));
if (location.hash.length > 1) setTimeout(() => scrollToId(location.hash, true), 400);
