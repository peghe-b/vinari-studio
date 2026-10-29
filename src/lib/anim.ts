import {Easing, interpolate, spring} from 'remotion';
import {BEZ, FPS, SPRING} from '../tokens';

const bez = (b: readonly [number, number, number, number]) => Easing.bezier(b[0], b[1], b[2], b[3]);
// `inOut` and `out` were never easings here: films v89 .. v106 passed ease.inOut / ease.out to prog(), which got undefined and
// fell back to its default (ease.enter), and that is how they render. The two names are typed as always undefined so those
// films typecheck and keep rendering exactly as made; tools/ci/filmlint.mjs refuses an unknown ease name in a new film.
type Never = {readonly inOut?: undefined; readonly out?: undefined};
export const ease: {
  readonly enter: (t: number) => number;
  readonly exit: (t: number) => number;
  readonly camera: (t: number) => number;
  readonly countUp: (t: number) => number;
  readonly drawOn: (t: number) => number;
  readonly drift: (t: number) => number;
  readonly whipIn: (t: number) => number;
  readonly whipOut: (t: number) => number;
  readonly snap: (t: number) => number;
} & Never = {
  enter: bez(BEZ.enter),
  exit: bez(BEZ.exit),
  camera: bez(BEZ.camera),
  countUp: bez(BEZ.countUp),
  drawOn: bez(BEZ.drawOn),
  drift: bez(BEZ.drift),
  whipIn: bez(BEZ.whipIn),
  whipOut: bez(BEZ.whipOut),
  snap: bez(BEZ.snap),
};

/** Smoothstep: 0 below a, 1 above b, an S between. */
export const smooth = (u: number, a: number, b: number) => {
  const t = Math.min(1, Math.max(0, (u - a) / Math.max(1e-6, b - a)));
  return t * t * (3 - 2 * t);
};

const clamp = {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'} as const;

/** 0→1 over [from, from+dur] frames with an easing. */
export const prog = (frame: number, from: number, dur: number, e: (t: number) => number = ease.enter) =>
  interpolate(frame, [from, from + Math.max(1, dur)], [0, 1], {...clamp, easing: e});

/** App spring: 0→1 starting at `from`. */
export const spr = (frame: number, from: number, cfg: keyof typeof SPRING = 'enter') =>
  spring({frame: frame - from, fps: FPS, config: SPRING[cfg]});

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

/** Seeded deterministic random in [0,1). Never use Math.random in a render. */
export const rand = (seed: number) => {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  return x - Math.floor(x);
};

/** Log-space zoom: constant perceived speed between two scales. */
export const logZoom = (s0: number, s1: number, t: number) => Math.exp(Math.log(s0) + (Math.log(s1) - Math.log(s0)) * t);

/** Visible text length for a type-on effect at `cps` chars per frame. */
export const typeOn = (text: string, frame: number, from: number, cpf = 1) => {
  const n = Math.max(0, Math.floor((frame - from) * cpf));
  return Array.from(text).slice(0, n).join('');
};
