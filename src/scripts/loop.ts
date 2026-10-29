/**
 * One animation loop per demonstration. `render(u, fade)` is a pure function of u, the position in ms inside a fixed
 * cycle, so every element that depends on it stays in step and nothing can drift (no unrelated timers).
 * The loop runs only while the element is near the viewport and the tab is visible, resumes where it stopped, and in
 * reduced-motion mode renders one finished frame instead of animating.
 */
export interface LoopOpts { cycle: number; fadeIn?: number; fadeOut?: number; reduced: boolean; staticU: number; render: (u: number, fade: number) => void }
export function createLoop(root: HTMLElement, o: LoopOpts) {
  const fi = o.fadeIn ?? 700, fo = o.fadeOut ?? 800;
  let pos = 0, last = 0, raf = 0, running = false, near = false;
  const fade = (u: number) => Math.max(0, Math.min(1, u / fi, (o.cycle - u) / fo));
  const frame = (now: number) => {
    if (!running) return;
    if (last) { pos += Math.min(64, now - last); if (pos >= o.cycle) pos -= o.cycle; }
    last = now; o.render(pos, fade(pos)); raf = requestAnimationFrame(frame);
  };
  const start = () => { if (running || o.reduced) return; running = true; last = 0; raf = requestAnimationFrame(frame); };
  const stop = () => { running = false; cancelAnimationFrame(raf); last = 0; };
  const sync = () => { if (near && !document.hidden) start(); else stop(); };
  if (o.reduced) o.render(o.staticU, 1);
  else new IntersectionObserver(([e]) => { near = e.isIntersecting; sync(); }, { rootMargin: '160px 0px' }).observe(root);
  document.addEventListener('visibilitychange', sync);
  return { seek: (ms: number) => { pos = ((ms % o.cycle) + o.cycle) % o.cycle; o.render(pos, fade(pos)); }, redraw: () => o.render(o.reduced ? o.staticU : pos, o.reduced ? 1 : fade(pos)), get pos() { return pos; }, get running() { return running; } };
}
export const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const ease = (t: number) => 1 - Math.pow(1 - clamp(t), 3);
export const smooth = (a: number, b: number, v: number) => { const t = clamp((v - a) / (b - a)); return t * t * (3 - 2 * t); };
export const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!));
