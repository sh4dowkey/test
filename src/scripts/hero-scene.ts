/**
 * Opening scene. One concept: the infrastructure lattice you start inside is flown through, resolves into the
 * crawl graph of the first project (the same tree CrawlX builds in the demo below) and is revealed through a paper
 * mask that grows from the centre, carrying the word "Welcome" from ink-on-dark to ink-on-paper.
 * Scroll progress p (0..1, supplied by the pinned ScrollTrigger and smoothed here) drives everything:
 *   0.00-0.45  camera flies through the lattice, nodes pass by in depth
 *   0.18-0.78  paper mask grows (clip-path circle); nodes and lines inside it switch to ink
 *   0.42-0.88  the lattice nodes converge on the tree layout; unrelated nodes fall away
 *   0.55-0.95  tree edges draw from the seed outward
 * A small ambient drift and pointer parallax keep it alive; the canvas only renders while the hero is on screen.
 */
import { simulate, layoutFor } from './crawl-sim';
import { clamp, ease, smooth } from './loop';

interface N { x: number; y: number; z: number; seed: number; g: number }
const rng = (s: number) => () => ((s = Math.imul(s ^ (s >>> 15), 2246822507) ^ Math.imul(s ^ (s >>> 13), 3266489909)), ((s ^= s >>> 16) >>> 0) / 4294967296);

export function initHeroScene(hero: HTMLElement, o: { reduced: boolean; getP: () => number; setTone: (t: 'dark' | 'paper') => void }) {
  const canvas = hero.querySelector<HTMLCanvasElement>('.hero__canvas')!, paper = hero.querySelector<HTMLElement>('.hero__paper')!;
  const copies = Array.from(hero.querySelectorAll<HTMLElement>('.hero__copy'));
  const ctx = canvas.getContext('2d')!;
  const cs = getComputedStyle(document.documentElement);
  const INK = cs.getPropertyValue('--ink').trim() || '#14151c', PAPER = cs.getPropertyValue('--paper').trim() || '#f4f2ec', ACC = '#5368F2', ACC2 = '#8DA0FF';
  const events = simulate(2);
  let gBottom = 0, W = 0, H = 0, dpr = 1, nodes: N[] = [], edges: [number, number][] = [], targets: { x: number; y: number; depth: number; parent: number; label: string }[] = [], tall = false, scale = 1, count = 0;
  let intro = o.reduced ? 1 : 0, p = o.reduced ? 0.0 : 0, active = false, raf = 0, px = 0, py = 0, tpx = 0, tpy = 0, lastClip = '';

  function setup() {
    const r = hero.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
    tall = W / H < 0.9;
    const L = layoutFor(events, tall ? 'tall' : 'wide');
    const boxW = tall ? W * 0.9 : Math.min(W * 0.78, 1040), boxH = tall ? H * 0.56 : H * 0.6;
    scale = Math.min(boxW / L.w, boxH / L.h); gBottom = H * 0.54 + (L.h * scale) / 2;
    const order = L.tree.map((t) => t.path), idxOf = new Map(order.map((u, i) => [u, i]));
    targets = L.tree.map((t) => { const q = L.pts.get(t.path)!; return { x: W / 2 + (q.x - L.w / 2) * scale, y: H * 0.54 + (q.y - L.h / 2) * scale, depth: t.depth, parent: t.parent ? idxOf.get(t.parent)! : -1, label: t.path === '/' ? 'sample.test' : t.path.split('/').filter(Boolean).pop()! }; });
    count = tall || W < 700 ? 46 : 92;
    const R = rng(7); nodes = Array.from({ length: count }, (_, i) => ({ x: (R() - 0.5) * 3.4, y: (R() - 0.5) * 2.1, z: 0.35 + R() * 2.9, seed: R() * 6.28, g: -1 }));
    // assign the nearest-by-x lattice nodes to the tree so they converge without long crossings
    const used = new Set<number>(); const byX = targets.map((t, i) => ({ t, i })).sort((a, b) => a.t.x - b.t.x);
    byX.forEach(({ i }) => { let best = -1, bd = 1e9; nodes.forEach((n, k) => { if (used.has(k)) return; const d = Math.abs((n.x / 3.4 + 0.5) * W - targets[i].x) * 0.6 + Math.abs((n.y / 2.1 + 0.5) * H - targets[i].y); if (d < bd) { bd = d; best = k; } }); used.add(best); nodes[best].g = i; });
    edges = []; nodes.forEach((a, i) => { nodes.map((b, j) => ({ j, d: (a.x - b.x) ** 2 + (a.y - b.y) ** 2 + (a.z - b.z) ** 2 * 0.5 })).filter((q) => q.j !== i).sort((u, v) => u.d - v.d).slice(0, 2).forEach((q) => { if (!edges.some(([x, y]) => (x === i && y === q.j) || (x === q.j && y === i))) edges.push([i, q.j]); }); });
  }

  const cx = () => W / 2, cy = () => H * 0.56;
  function draw(t: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const maxR = Math.hypot(Math.max(cx(), W - cx()), Math.max(cy(), H - cy())) * 1.02;
    const R = ease(smooth(0.16, 0.8, p)) * maxR, m = smooth(0.42, 0.88, p), me = ease(m);
    const clip = `circle(${R.toFixed(1)}px at ${cx().toFixed(1)}px ${cy().toFixed(1)}px)`; if (clip !== lastClip) { lastClip = clip; paper.style.clipPath = clip; (paper.style as CSSStyleDeclaration).setProperty('-webkit-clip-path', clip); }
    const zc = p * 2.5, f = Math.min(W, H) * (tall ? 0.62 : 0.5);
    const pos = nodes.map((n, i) => {
      const zr = Math.max(0.34, n.z - zc), dx = Math.sin(t * 0.25 + n.seed) * 0.035, dy = Math.cos(t * 0.21 + n.seed) * 0.03;
      let x = cx() + (n.x + dx) * f / zr + px * 26 / zr, y = cy() + (n.y + dy) * f / zr + py * 18 / zr;
      let a = clamp(1.25 - zr * 0.34) * clamp((intro * 2.4 - (i / count) * 1.2));
      if (n.z - zc < 0.34) a *= clamp((n.z - zc + 0.15) / 0.5);
      const rad = clamp(1.1 + 2.1 / zr, 1, 5.5); let r = rad, al = a;
      if (n.g >= 0) { const tg = targets[n.g]; x += (tg.x - x) * me; y += (tg.y - y) * me; r = rad + (4.2 - rad) * me; al = a + (1 - a) * me; }
      else al = a * (1 - me);
      return { x, y, r, a: al, inside: Math.hypot(x - cx(), y - cy()) < R };
    });
    const col = (inside: boolean, a: number, acc = false) => acc ? (inside ? `rgba(83,104,242,${a})` : `rgba(141,160,255,${a})`) : inside ? `rgba(20,21,28,${a})` : `rgba(244,242,236,${a})`;
    // lattice lines
    ctx.lineWidth = 1;
    edges.forEach(([i, j]) => { const A = pos[i], B = pos[j]; const a = Math.min(A.a, B.a) * 0.34 * (nodes[i].g >= 0 && nodes[j].g >= 0 ? 1 - me : 1); if (a < 0.01) return; ctx.strokeStyle = col(Math.hypot((A.x + B.x) / 2 - cx(), (A.y + B.y) / 2 - cy()) < R, a); ctx.beginPath(); ctx.moveTo(A.x, A.y); ctx.lineTo(B.x, B.y); ctx.stroke(); });
    // tree edges draw from the seed outward
    const gp = new Array(targets.length) as { x: number; y: number; inside: boolean }[]; nodes.forEach((n, i) => { if (n.g >= 0) gp[n.g] = pos[i]; });
    const prog = smooth(0.55, 0.95, p);
    targets.forEach((tg, i) => {
      if (tg.parent < 0) return; const A = gp[tg.parent], B = gp[i], k = clamp(prog * 2.2 - tg.depth * 0.55 + 0.1); if (k <= 0) return;
      const horiz = !tall, c1x = horiz ? A.x + (B.x - A.x) * 0.5 : A.x, c1y = horiz ? A.y : A.y + (B.y - A.y) * 0.5, c2x = horiz ? A.x + (B.x - A.x) * 0.5 : B.x, c2y = horiz ? B.y : A.y + (B.y - A.y) * 0.5;
      ctx.strokeStyle = col(Math.hypot((A.x + B.x) / 2 - cx(), (A.y + B.y) / 2 - cy()) < R, 0.7 * me); ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(A.x, A.y);
      for (let s = 1; s <= 18; s++) { const u = (s / 18) * ease(k), v = 1 - u; ctx.lineTo(v * v * v * A.x + 3 * v * v * u * c1x + 3 * v * u * u * c2x + u * u * u * B.x, v * v * v * A.y + 3 * v * v * u * c1y + 3 * v * u * u * c2y + u * u * u * B.y); }
      ctx.stroke();
    });
    // nodes
    nodes.forEach((n, i) => { const q = pos[i]; if (q.a < 0.02) return; const seed = n.g === 0; ctx.fillStyle = seed ? (q.inside ? ACC : ACC2) : col(q.inside, Math.min(1, q.a)); ctx.beginPath(); ctx.arc(q.x, q.y, q.r * (seed ? 1.5 : 1), 0, 6.283); ctx.fill(); });
    // once resolved: a scan ring walks the tree, and the seed is labelled
    if (p > 0.9 && !o.reduced) { const k = Math.floor(t * 2.2) % targets.length, q = gp[k]; const ph = (t * 2.2) % 1; ctx.strokeStyle = `rgba(83,104,242,${0.8 * (1 - ph)})`; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(q.x, q.y, 6 + ph * 12, 0, 6.283); ctx.stroke(); }
    if (me > 0.8) {
      const a = (me - 0.8) * 5; ctx.textAlign = 'center';
      if (!tall) { ctx.font = '500 11px "JetBrains Mono Variable", ui-monospace, monospace'; ctx.fillStyle = `rgba(20,21,28,${a * 0.75})`; targets.forEach((tg, i) => { if (tg.depth > 1) return; const q = gp[i]; ctx.fillText(tg.label, q.x + (tg.depth === 0 ? 0 : 6), q.y - 13); }); }
      ctx.font = '600 15px "Mona Sans Variable", system-ui, sans-serif'; ctx.fillStyle = `rgba(20,21,28,${a})`; ctx.fillText('01 · CrawlX', cx(), Math.min(H - 56, gBottom + 44)); ctx.textAlign = 'start';
    }
    // text: scales through the viewport and dissolves as the paper arrives
    const s = 1 + p * (tall ? 0.38 : 0.26), ty = -p * H * 0.09, op = 1 - smooth(0.36, 0.62, p);
    copies.forEach((c) => { c.style.transform = `translate3d(0,${ty.toFixed(1)}px,0) scale(${s.toFixed(4)})`; c.style.opacity = op.toFixed(3); });
    hero.querySelector<HTMLElement>('.hero__cue')!.style.opacity = String(clamp(1 - p * 14) * intro);
    o.setTone(R > Math.min(H * 0.18, 140) && cy() - R < 40 ? 'paper' : 'dark');
  }

  let t0 = performance.now();
  const frame = (now: number) => {
    if (!active) return;
    const target = o.getP(); p += (target - p) * 0.14; if (Math.abs(target - p) < 0.0005) p = target;
    px += (tpx - px) * 0.06; py += (tpy - py) * 0.06; draw((now - t0) / 1000); raf = requestAnimationFrame(frame);
  };
  const start = () => { if (active || o.reduced) return; active = true; raf = requestAnimationFrame(frame); };
  const stop = () => { active = false; cancelAnimationFrame(raf); };
  setup(); draw(0);
  new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()), { rootMargin: '10% 0px' }).observe(hero);
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = window.setTimeout(() => { setup(); draw((performance.now() - t0) / 1000); }, 120); });
  if (!o.reduced && matchMedia('(pointer:fine)').matches) hero.addEventListener('pointermove', (e) => { const r = hero.getBoundingClientRect(); tpx = (e.clientX - r.left) / r.width - 0.5; tpy = (e.clientY - r.top) / r.height - 0.5; });
  return { setIntro(v: number) { intro = v; if (!active) draw((performance.now() - t0) / 1000); }, redraw() { draw((performance.now() - t0) / 1000); } };
}
