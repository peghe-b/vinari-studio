import {Easing, interpolate, spring} from 'remotion';
import {BEZ, FPS, SPRING} from '../tokens';

const bez = (b: readonly [number, number, number, number]) => Easing.bezier(b[0], b[1], b[2], b[3]);
export const ease = {
  enter: bez(BEZ.enter),
  exit: bez(BEZ.exit),
  camera: bez(BEZ.camera),
  countUp: bez(BEZ.countUp),
  drawOn: bez(BEZ.drawOn),
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
