// v2: what every shot shares: the shot's clock (useShot), the car camera's mix and a person standing on the car's floor,
// the film's two worlds' inks (text is ALWAYS black or white: the owner, 2026-10-15), the amber of the check light (the only
// warm accent in the pictures), the explainers' small parts (a step chip, a punch-word label, a soft card), the slow phone
// entrance (0.9-1.3 s eased rise with a soft settle: the owner, "the mockup must rise slowly and gently") and a hand-held
// camera's breath. Frame-driven, no randomness.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {mtav} from '../../lib/format';
import {F} from '../../tokens';
import {clamp, E, ev, evs, fr, lerp, prog, shot} from '../lib';
import type {CarCam} from './car3d';
import {viewOf} from './street';

export const useShot = (id: string) => {
  const t = useCurrentFrame();
  const base = fr(shot(id).from);
  const len = fr(shot(id).to) - base;
  const L = (name: string) => fr(ev(name)) - base;
  const Ls = (name: string) => evs(name).map((x) => fr(x) - base);
  return {t, len, L, Ls, base};
};

export const mixCam = (a: CarCam, b: CarCam, k: number): CarCam => ({
  pos: [lerp(a.pos[0], b.pos[0], k), lerp(a.pos[1], b.pos[1], k), lerp(a.pos[2], b.pos[2], k)],
  target: [lerp(a.target[0], b.target[0], k), lerp(a.target[1], b.target[1], k), lerp(a.target[2], b.target[2], k)],
  fov: lerp(a.fov, b.fov, k),
  roll: lerp(a.roll ?? 0, b.roll ?? 0, k),
});

/** a person standing at (x, z) on the floor, `h` metres tall, seen by `cam` (frame px) */
export const personAt = (cam: CarCam, x: number, z: number, h: number) => {
  const V = viewOf(cam);
  const f = V.pt([x, 0, z]);
  const hd = V.pt([x, h, z]);
  return f && hd ? {x: f[0], y: f[1], size: f[1] - hd[1]} : null;
};

/** the inks: text only ever in these */
export const INK = '#0B0B0B';
export const GREY = '#6E6E6E';
export const PALE = '#E9E9E9';
export const WHITE = '#FFFFFF';
/** the check light's amber: pictures only, never text */
export const AMBER = '#FFA51F';
export const AMBER_HI = '#FFC45A';

/** the slow, gentle entrance of a phone (or any hero object): 0..1 over `dur` frames from `at`, an ease-in-out rise with a
 *  soft settle (a 3 % overshoot that eases back), never a snap */
export const rise = (t: number, at: number, dur = 34) => {
  if (t < at) return 0;
  const q = clamp((t - at) / dur);
  return E.inOut(q) + 0.022 * Math.sin(Math.PI * clamp((t - at - dur * 0.8) / (dur * 0.55)));
};

/** a hand-held camera's slow breath (px, degrees): for the live-action-feeling shots */
export const breath = (t: number, amp = 1) => ({
  x: amp * (3.2 * Math.sin(t / 23 + 0.4) + 1.4 * Math.sin(t / 9.7 + 1.1)),
  y: amp * (2.6 * Math.sin(t / 19 + 2.2) + 1.1 * Math.sin(t / 7.3)),
  r: amp * 0.22 * Math.sin(t / 31 + 0.7),
});

/** a camera punch (scale kick) at frame `at`: quick in, settles a touch above 1 */
export const punch = (t: number, at: number, amount = 0.08, hold = 0.6) => {
  if (t < at) return 1;
  const k = t - at;
  const up = E.outExpo(clamp(k / 5));
  const back = 1 - (1 - hold) * E.inOut(clamp((k - 5) / 14));
  return 1 + amount * up * back;
};

/** a damped shake (px) */
export const jolt = (t: number, at: number, amp = 9, dur = 9, seed = 1) => {
  const k = t - at;
  if (k < 0 || k > dur) return 0;
  return amp * (1 - k / dur) * Math.sin(k * 2.3 + seed);
};

/** the numbered step chip of the how-to: a black disc, a white numeral (or the reverse on the dark) */
export const StepChip: React.FC<{n: number; x: number; y: number; k: number; size?: number; dark?: boolean}> = ({n, x, y, k, size = 92, dark = false}) => (
  <div
    style={{
      position: 'absolute',
      left: x - size / 2,
      top: y - size / 2,
      width: size,
      height: size,
      borderRadius: size / 2,
      background: dark ? WHITE : INK,
      color: dark ? INK : WHITE,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F.sans,
      fontWeight: 700,
      fontSize: size * 0.56,
      lineHeight: 1,
      opacity: clamp(k * 1.6),
      transform: `scale(${lerp(0.6, 1, E.outBack(clamp(k)))})`,
      boxShadow: dark ? 'none' : '0 14px 30px rgba(0,0,0,0.16)',
    }}
  >
    <span style={{marginTop: size * 0.04}}>{n}</span>
  </div>
);

/** a punch word or two (Mtavruli, black on the white world, white on the dark), centred on x */
export const Label: React.FC<{text: string; x: number; y: number; k: number; size?: number; dark?: boolean; weight?: number; latin?: boolean; grey?: boolean; anchor?: 'c' | 'l' | 'r'}> = ({
  text,
  x,
  y,
  k,
  size = 52,
  dark = false,
  weight = 700,
  latin = false,
  grey = false,
  anchor = 'c',
}) => (
  <div
    style={{
      position: 'absolute',
      left: anchor === 'c' ? x - 520 : anchor === 'l' ? x : x - 1040,
      width: 1040,
      top: y,
      textAlign: anchor === 'c' ? 'center' : anchor === 'l' ? 'left' : 'right',
      fontFamily: F.sans,
      fontWeight: weight,
      fontSize: size,
      lineHeight: 1.12,
      whiteSpace: 'nowrap',
      color: dark ? (grey ? 'rgba(255,255,255,0.62)' : WHITE) : grey ? GREY : INK,
      opacity: clamp(k * 1.5),
      transform: `translateY(${(1 - clamp(k)) * 18}px)`,
    }}
  >
    {latin ? text : mtav(text)}
  </div>
);

/** a soft white card (the explainers' surface): no outline, a soft shadow */
export const Card: React.FC<{x: number; y: number; w: number; h: number; k?: number; r?: number; children?: React.ReactNode; dark?: boolean; style?: React.CSSProperties}> = ({x, y, w, h, k = 1, r = 36, children, dark = false, style}) => (
  <div
    style={{
      position: 'absolute',
      left: x,
      top: y,
      width: w,
      height: h,
      borderRadius: r,
      background: dark ? '#17181B' : WHITE,
      boxShadow: dark ? '0 30px 70px rgba(0,0,0,0.45)' : '0 26px 64px rgba(0,0,0,0.12), 0 4px 14px rgba(0,0,0,0.05)',
      opacity: clamp(k * 1.6),
      transform: `translateY(${(1 - clamp(k)) * 30}px) scale(${lerp(0.94, 1, clamp(k))})`,
      overflow: 'hidden',
      ...style,
    }}
  >
    {children}
  </div>
);

/** the check engine icon (the ISO outline) as an SVG group at (x, y) of `size` px, lit `k` (0 a dark outline .. 1 amber) */
export const ENGINE_PATH =
  'M8.2 7.4H15.3L16.8 9.2H18.6V8.2H21V15.6H18.6V14.6H16.8L14.6 17.2H9.2L7.2 15.2V7.4ZM10 5H13.6M11.8 5V7.4M4.4 9.6V15M4.4 12.3H7.2';
export const EngineIcon: React.FC<{x: number; y: number; size: number; k: number; off?: string; glow?: number; uid: string; stroke?: number}> = ({x, y, size, k, off = '#3A3F48', glow = 1, uid, stroke = 1.7}) => {
  const s = size / 24;
  return (
    <g>
      <defs>
        <radialGradient id={`eg${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={AMBER} stopOpacity={0.55} />
          <stop offset="0.35" stopColor={AMBER} stopOpacity={0.2} />
          <stop offset="1" stopColor={AMBER} stopOpacity={0} />
        </radialGradient>
        <filter id={`ef${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={1.1} />
        </filter>
      </defs>
      {glow > 0 ? <circle cx={x} cy={y} r={size * 1.3} fill={`url(#eg${uid})`} opacity={k * glow} /> : null}
      <g transform={`translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`}>
        <path d={ENGINE_PATH} fill="none" stroke={off} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" opacity={1 - k} />
        <path d={ENGINE_PATH} fill="none" stroke={AMBER} strokeWidth={stroke * 1.9} strokeLinejoin="round" strokeLinecap="round" opacity={0.5 * k} filter={`url(#ef${uid})`} />
        <path d={ENGINE_PATH} fill="none" stroke={AMBER_HI} strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round" opacity={k} />
      </g>
    </g>
  );
};

/** a full-frame SVG layer */
export const Svg: React.FC<{children: React.ReactNode; style?: React.CSSProperties}> = ({children, style}) => (
  <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, overflow: 'visible', ...style}}>
    {children}
  </svg>
);

export const cssCam = (s: number, ox: number, oy: number, dx = 0, dy = 0, rot = 0): React.CSSProperties => ({
  position: 'absolute',
  inset: 0,
  transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(3)}deg) scale(${s.toFixed(4)})`,
  transformOrigin: `${ox}px ${oy}px`,
});

export {prog};
