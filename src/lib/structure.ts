/**
 * Original illustration: an abstract data-structure layout.
 * Six plates start as an exploded, tilted stack and end as a flat strip of segments.
 * Pure math, shared by the build (static final state) and the browser (scroll-driven state).
 * The widths are arbitrary and represent nothing about any real project.
 */
export const VB = { w: 720, h: 360 } as const;
export const SEG_W = [96, 54, 54, 150, 84, 120] as const;
export const SEG_H = 84;
export const SEG_GAP = 4;
const N = SEG_W.length;
const STRIP_W = SEG_W.reduce((a, b) => a + b, 0) + SEG_GAP * (N - 1);
const CX = VB.w / 2;
const CY = 172;
const Z_UNIT = 52;

export interface State { rotX: number; rotZ: number; explode: number; spread: number }
export const FLAT: State = { rotX: 0, rotZ: 0, explode: 0, spread: 1 };

const rad = (d: number) => (d * Math.PI) / 180;
const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => t * t * (3 - 2 * t);
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function flatOffsets(): number[] {
  const out: number[] = []; let x = 0;
  for (let i = 0; i < N; i++) { out.push(x); x += SEG_W[i] + SEG_GAP; }
  return out;
}

export function flatBoxes() {
  const left = CX - STRIP_W / 2; const offs = flatOffsets();
  return SEG_W.map((w, i) => ({ x: left + offs[i], y: CY - SEG_H / 2, w, h: SEG_H }));
}

export function project(s: State): string[] {
  const offs = flatOffsets();
  const cz = Math.cos(rad(s.rotZ)), sz = Math.sin(rad(s.rotZ));
  const cx = Math.cos(rad(s.rotX)), sx = Math.sin(rad(s.rotX));
  return SEG_W.map((w, i) => {
    const stackX = (STRIP_W - w) / 2;
    const x0 = lerp(stackX, offs[i], s.spread) - STRIP_W / 2;
    const z = (i - (N - 1) / 2) * s.explode * Z_UNIT;
    const corners: [number, number][] = [[x0, -SEG_H / 2], [x0 + w, -SEG_H / 2], [x0 + w, SEG_H / 2], [x0, SEG_H / 2]];
    return corners.map(([x, y]) => {
      const x1 = x * cz - y * sz; const y1 = x * sz + y * cz;
      const y2 = y1 * cx - z * sx;
      return `${(CX + x1).toFixed(1)},${(CY + y2).toFixed(1)}`;
    }).join(' ');
  });
}

/** Scroll progress p (0..1) -> geometry. Phases: assemble 0-.3, flatten .3-.6, annotate .55-.8, hold .8-1 */
export function stateAt(p: number): State {
  const a = ease(clamp(p / 0.3));
  const f = ease(clamp((p - 0.3) / 0.3));
  const sp = ease(clamp((p - 0.36) / 0.26));
  return {
    rotX: lerp(lerp(60, 52, a), 0, f),
    rotZ: lerp(lerp(-36, -24, a), 0, f),
    explode: lerp(lerp(1.15, 0.3, a), 0, f),
    spread: sp,
  };
}
export const calloutsAt = (p: number) => clamp((p - 0.55) / 0.25);
export const platesAt = (p: number) => 0.35 + 0.65 * ease(clamp(p / 0.25));
