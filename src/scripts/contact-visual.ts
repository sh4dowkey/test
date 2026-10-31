/**
 * Contact visual: a signal leaves Kochi and reaches each channel. Fine contour lines drift behind it, with
 * parallax on pointer movement; four arcs draw once, then a light pulse travels each in turn on a 9 s loop and
 * ripples where it lands. Hovering or focusing a contact link brightens its arc. Runs only while on screen; with
 * reduced motion it draws one finished frame.
 */
import { clamp, ease } from './loop';
const KEYS = ['email', 'github', 'linkedin', 'medium'], LABELS = ['Email', 'GitHub', 'LinkedIn', 'Medium'];
const CYCLE = 9000;
export function initContactVisual(fig: HTMLElement, o: { reduced: boolean }) {
  const canvas = fig.querySelector('canvas')!, ctx = canvas.getContext('2d')!;
  let W = 0, H = 0, dpr = 1, raf = 0, active = false, t0 = performance.now(), px = 0, py = 0, tx = 0, ty = 0, hot = -1, hotT = 0;
  const size = () => { const r = fig.getBoundingClientRect(); W = r.width; H = r.height; dpr = Math.min(2, devicePixelRatio || 1); canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); canvas.style.width = W + 'px'; canvas.style.height = H + 'px'; };
  const O = () => ({ x: W * 0.15, y: H * 0.8 });
  const NODES = () => [{ x: W * 0.78, y: H * 0.2 }, { x: W * 0.9, y: H * 0.46 }, { x: W * 0.72, y: H * 0.7 }, { x: W * 0.5, y: H * 0.24 }];
  const ctrl = (a: { x: number; y: number }, b: { x: number; y: number }, i: number) => ({ x: a.x + (b.x - a.x) * 0.2, y: Math.min(a.y, b.y) - H * (0.12 + i * 0.05) });
  const pt = (a: { x: number; y: number }, c: { x: number; y: number }, b: { x: number; y: number }, t: number) => { const u = 1 - t; return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }; };
  function draw(ms: number, intro: number) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
    const t = ms / 1000;
    // contour field
    for (let i = 0; i < 16; i++) {
      const depth = i / 15, base = H * (0.08 + depth * 0.9), amp = 10 + depth * 16;
      ctx.strokeStyle = `rgba(244,242,236,${0.045 + depth * 0.075})`; ctx.lineWidth = 1; ctx.beginPath();
      for (let x = 0; x <= W; x += 10) { const y = base + Math.sin(x * 0.011 + t * 0.35 + i * 0.7) * amp + Math.sin(x * 0.027 - t * 0.2 + i) * amp * 0.35 + py * (6 + depth * 14); x === 0 ? ctx.moveTo(x + px * (4 + depth * 12), y) : ctx.lineTo(x + px * (4 + depth * 12), y); }
      ctx.stroke();
    }
    const o = O(), ns = NODES();
    ns.forEach((n, i) => {
      const c = ctrl(o, n, i), k = ease(clamp(intro * 1.4 - i * 0.18)), isHot = hot === i, base = isHot ? 0.85 : 0.34;
      ctx.strokeStyle = `rgba(244,242,236,${base})`; ctx.lineWidth = isHot ? 1.6 : 1.1; ctx.beginPath(); ctx.moveTo(o.x, o.y);
      for (let s = 1; s <= 40; s++) { const p = pt(o, c, n, (s / 40) * k); ctx.lineTo(p.x, p.y); } ctx.stroke();
      if (k >= 1) {
        // node and label
        ctx.fillStyle = isHot ? '#8DA0FF' : 'rgba(244,242,236,0.8)'; ctx.beginPath(); ctx.arc(n.x, n.y, isHot ? 4.5 : 3.2, 0, 6.283); ctx.fill();
        ctx.font = '500 11px "JetBrains Mono Variable", ui-monospace, monospace'; ctx.fillStyle = `rgba(244,242,236,${isHot ? 0.95 : 0.55})`; ctx.textAlign = 'center'; ctx.fillText(LABELS[i], n.x, n.y - 14);
        if (!o_reduced) {
          // the pulse: staggered along the loop, then a ripple where it lands
          const start = 400 + i * 1500, dur = 1500, tt = ((ms - start) % CYCLE + CYCLE) % CYCLE, q = tt / dur;
          if (q >= 0 && q <= 1) { const p = pt(o, c, n, ease(q)); const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, 16); g.addColorStop(0, 'rgba(141,160,255,0.95)'); g.addColorStop(1, 'rgba(141,160,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(p.x, p.y, 16, 0, 6.283); ctx.fill(); }
          const rq = (tt - dur) / 1200; if (rq >= 0 && rq <= 1) { ctx.strokeStyle = `rgba(141,160,255,${0.7 * (1 - rq)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(n.x, n.y, 4 + rq * 22, 0, 6.283); ctx.stroke(); }
        }
      }
    });
    // origin
    const ph = (t * 0.8) % 1; ctx.strokeStyle = `rgba(255,122,107,${0.5 * (1 - ph)})`; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(o.x, o.y, 5 + ph * 18, 0, 6.283); ctx.stroke();
    ctx.fillStyle = '#FF7A6B'; ctx.beginPath(); ctx.arc(o.x, o.y, 4.5, 0, 6.283); ctx.fill();
  }
  const o_reduced = o.reduced;
  const frame = (now: number) => { if (!active) return; px += (tx - px) * 0.05; py += (ty - py) * 0.05; const ms = now - t0; draw(ms, clamp(ms / 2400)); if (hot >= 0 && now - hotT > 1e9) hot = -1; raf = requestAnimationFrame(frame); };
  size(); draw(0, 1);
  if (o.reduced) { addEventListener('resize', () => { size(); draw(0, 1); }); return { hover: (_k: string | null) => {} }; }
  new IntersectionObserver(([e]) => { if (e.isIntersecting && !active) { active = true; t0 = performance.now() - 0; raf = requestAnimationFrame(frame); } else if (!e.isIntersecting) { active = false; cancelAnimationFrame(raf); } }, { rootMargin: '120px' }).observe(fig);
  let rz = 0; addEventListener('resize', () => { clearTimeout(rz); rz = window.setTimeout(size, 120); });
  if (matchMedia('(pointer:fine)').matches) fig.parentElement!.addEventListener('pointermove', (e) => { const r = fig.getBoundingClientRect(); tx = clamp((e.clientX - r.left) / r.width, -0.5, 1.5) - 0.5; ty = clamp((e.clientY - r.top) / r.height, -0.5, 1.5) - 0.5; });
  return { hover(k: string | null) { hot = k ? KEYS.indexOf(k) : -1; hotT = performance.now(); } };
}
