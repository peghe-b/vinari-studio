// src/scenes/illo/fx.tsx: particles and character effects of the "Graphite" look. Deterministic only: every particle's
// numbers come from rand(seed * 1000 + i) (lib/anim), every position from the frame; never Math.random, never state.
// Each system returns one <g> and keeps its node count low (streaks of one opacity share one path).
//
// Particles (budgets per scene and layer: <= 160 particles in all):
//   Rain       <= 140 streaks, slanted, with splashes on an optional ground line
//   Snow       <= 90 flakes, sine sway
//   Drops      <= 60 drops on glass, sliding slowly; `age(x, y)` (frames since a wiper passed there) clears them
//   Sparks     <= 24 streaks with gravity, in bursts (`at`, optional `loop`)
//   Confetti   <= 60 rects and ribbons, at most 20 % in the accent, flutter (scaleX cos)
//   Petals     <= 14 falling petals;  Notes: <= 24 banknotes flipping (generic notes, a lari circle, never a real note)
//   Smoke      <= 10 puffs (steam il1, smoke il4);  SpeedLines: <= 16 streaks;  Dust: motes in a light cone
//   Rings      expanding outlines (a phone ringing, a ping);  Shockwave: one ring out;  Burst: the comic star
// Character effects (anchored at a head or a hand, `size` = the head's height in px):
//   <FaceFx kind="sweat" | "shock" | "tear" | "sparkle" | "zap" | "hearts" | "question" | "idea" | "zzz" .../>
import React from 'react';
import {spring} from 'remotion';
import {rand} from '../../lib/anim';
import {useBleed} from '../../lib/bleed';
import {C, L, toneBig, type Tone} from '../../tokens';
import {dark, deepFreeze, lit, mix, type Time} from './palette';
import {Glint, paint, rr, Solid, star} from './solid';

export type Box = {x: number; y: number; w: number; h: number};
/** The picture band (stage px): where a full-picture particle system lives by default. */
export const BAND: Box = deepFreeze({x: 0, y: L.graphicsTop, w: 1080, h: L.graphicsBottom - L.graphicsTop});
/** The whole frame (a full-bleed shot, src/lib/bleed.ts): the default box there, so rain and snow reach the frame's edges. */
export const FULL: Box = deepFreeze({x: 0, y: L.bleedTop, w: 1080, h: L.bleedBottom - L.bleedTop});
/** A particle system's box: the one given, else the picture (the whole frame in a full-bleed shot, else the band). The
 *  count `n` was set for the band: on the whole frame it grows with the area (the density stays). */
const useBox = (box: Box | undefined, n: number): [Box, number] => {
  const bleed = useBleed();
  if (box) return [box, n];
  return bleed ? [FULL, Math.round((n * FULL.h) / BAND.h)] : [BAND, n];
};

const mod = (a: number, n: number) => ((a % n) + n) % n;
const R = (seed: number, i: number, k = 0) => rand(seed * 1000 + i + k * 0.37);
const n1 = (v: number) => +v.toFixed(1);
/** A circle as a relative-move path piece (many dots in one path). */
const dot = (x: number, y: number, r: number) => `M${n1(x - r)} ${n1(y)}a${n1(r)} ${n1(r)} 0 1 1 ${n1(2 * r)} 0a${n1(r)} ${n1(r)} 0 1 1 ${n1(-2 * r)} 0`;
/** The house punch spring (0..1 with about 6 % overshoot), local to the kit. */
const punch = (frame: number, at: number) => spring({frame: frame - at, fps: 30, config: {mass: 1, stiffness: 520, damping: 30}});

// ---- weather ----------------------------------------------------------------------------------------------------------
type RainP = {frame: number; seed?: number; n?: number; box?: Box; slant?: number; speed?: number; ground?: number; time?: Time; color?: string; opacity?: number};
/** Rain: slanted streaks falling fast; with `ground` (a y) they stop there and splash. */
export const Rain: React.FC<RainP> = ({frame, seed = 1, n: nIn = 110, box: boxIn, slant = 12, speed = 1, ground, time = 'day', color, opacity = 1}) => {
  const [box, n] = useBox(boxIn, nIn);
  const c = color ?? lit(time);
  const tan = Math.tan((slant * Math.PI) / 180);
  const bottom = ground ?? box.y + box.h;
  const buckets: string[] = ['', '', ''];
  let splash = '';
  for (let i = 0; i < Math.min(140, n); i++) {
    const len = 26 + 34 * R(seed, i, 1);
    const v = (30 + 22 * R(seed, i, 2)) * speed;
    const span = bottom - box.y + len;
    const pos = R(seed, i, 3) * span + frame * v;
    const y = mod(pos, span) + box.y - len; // the streak's top
    const x0 = box.x + R(seed, i, 4) * (box.w + (bottom - box.y) * Math.abs(tan)) - (tan > 0 ? 0 : (bottom - box.y) * Math.abs(tan));
    const xAt = (yy: number) => x0 - tan * (yy - box.y);
    const yEnd = Math.min(bottom, y + len);
    if (yEnd > y + 2) buckets[i % 3] += `M${n1(xAt(y))} ${n1(y)}L${n1(xAt(yEnd))} ${n1(yEnd)}`;
    if (ground !== undefined) {
      const since = mod(pos, span) / v; // frames since this drop last reached the ground
      if (since < 6) {
        const k = since / 6;
        const rx = 6 + 12 * k;
        const sx = xAt(bottom);
        splash += `M${n1(sx - rx)} ${n1(bottom)}a${n1(rx)} ${n1(rx * 0.45)} 0 0 1 ${n1(2 * rx)} 0`;
      }
    }
  }
  return (
    <g opacity={opacity} fill="none" stroke={c} strokeLinecap="round">
      <path d={buckets[0]} strokeWidth={2.2} opacity={0.5} />
      <path d={buckets[1]} strokeWidth={1.8} opacity={0.36} />
      <path d={buckets[2]} strokeWidth={1.5} opacity={0.25} />
      {splash ? <path d={splash} strokeWidth={2} opacity={0.42} /> : null}
    </g>
  );
};

type SnowP = {frame: number; seed?: number; n?: number; box?: Box; speed?: number; wind?: number; time?: Time; color?: string; opacity?: number};
/** Snow: round flakes, three sizes, falling slowly with a sine sway. */
export const Snow: React.FC<SnowP> = ({frame, seed = 2, n: nIn = 70, box: boxIn, speed = 1, wind = 0.4, time = 'day', color, opacity = 1}) => {
  const [box, n] = useBox(boxIn, nIn);
  const c = color ?? (time === 'day' && lit(time) !== C.il0 ? C.il4 : C.il0);
  const buckets = ['', '', ''];
  for (let i = 0; i < Math.min(90, n); i++) {
    const b = i % 3;
    const r = [6.5, 4.5, 3][b] * (0.8 + 0.4 * R(seed, i, 1));
    const v = [2.4, 1.7, 1.1][b] * speed * (0.85 + 0.3 * R(seed, i, 2));
    const span = box.h + 20;
    const y = mod(R(seed, i, 3) * span + frame * v, span) + box.y - 10;
    const x = box.x + mod(R(seed, i, 4) * box.w + frame * wind * v + 16 * Math.sin(frame / (34 + 20 * R(seed, i, 5)) + 6.28 * R(seed, i, 6)), box.w);
    buckets[b] += dot(x, y, r);
  }
  return (
    <g opacity={opacity} fill={c}>
      <path d={buckets[0]} opacity={0.85} />
      <path d={buckets[1]} opacity={0.6} />
      <path d={buckets[2]} opacity={0.4} />
    </g>
  );
};

type DropsP = {frame: number; seed?: number; n?: number; box?: Box; age?: (x: number, y: number) => number; color?: string; opacity?: number};
/** Drops on glass: each grows, sits, now and then slides down a little; a wiper clears them (`age`: frames since the
 *  wiper last passed over a point, Infinity when never). */
export const Drops: React.FC<DropsP> = ({frame, seed = 3, n: nIn = 46, box: boxIn, age, color, opacity = 1}) => {
  const [box, n] = useBox(boxIn, nIn);
  const c = color ?? C.il0;
  let body = '';
  let hi = '';
  let lo = '';
  for (let i = 0; i < Math.min(60, n); i++) {
    const x = box.x + R(seed, i, 1) * box.w;
    const y0 = box.y + R(seed, i, 2) * box.h;
    const r0 = 4 + 9 * R(seed, i, 3) ** 1.6;
    const cycle = 150 + 110 * R(seed, i, 4);
    const t = mod(frame + R(seed, i, 5) * cycle, cycle); // this drop's own clock
    const slideAt = cycle * (0.55 + 0.3 * R(seed, i, 6));
    const slide = t > slideAt ? (t - slideAt) * (0.6 + 1.6 * R(seed, i, 7)) : 0;
    const y = y0 + slide;
    let grow = Math.min(1, t / 22);
    if (age) grow = Math.min(grow, Math.max(0, (age(x, y0) - 4) / 26));
    if (grow <= 0.05 || y > box.y + box.h) continue;
    const r = r0 * grow;
    body += dot(x, y, r);
    hi += dot(x - r * 0.35, y - r * 0.4, Math.max(0.8, r * 0.22));
    lo += `M${n1(x - r * 0.8)} ${n1(y + r * 0.25)}a${n1(r * 0.85)} ${n1(r * 0.85)} 0 0 0 ${n1(r * 1.6)} 0`;
    if (slide > 6) lo += `M${n1(x)} ${n1(y0)}L${n1(x)} ${n1(y - r)}`;
  }
  return (
    <g opacity={opacity}>
      <path d={body} fill={c} opacity={0.14} />
      <path d={lo} fill="none" stroke={c} strokeWidth={1.6} strokeLinecap="round" opacity={0.3} />
      <path d={hi} fill={c} opacity={0.75} />
    </g>
  );
};

// ---- sparks, confetti, petals, notes ----------------------------------------------------------------------------------
type SparksP = {frame: number; x: number; y: number; at: number | number[]; loop?: number; seed?: number; n?: number; dir?: number; spread?: number; power?: number; tone?: Tone; time?: Time; uid?: string};
/** Sparks: bright streaks thrown out in bursts and pulled down by gravity (a grinder, a short circuit, a hit). */
export const Sparks: React.FC<SparksP> = ({frame, x, y, at, loop, seed = 4, n = 18, dir = -90, spread = 70, power = 1, tone: t, time = 'day', uid}) => {
  const c = t ? toneBig(t) : lit(time);
  const starts = (Array.isArray(at) ? at : [at]).map((a) => (loop && frame > a ? a + Math.floor((frame - a) / loop) * loop : a));
  let d = '';
  const heads: [number, number, number][] = [];
  starts.forEach((s, b) => {
    const tt = frame - s;
    if (tt < 0) return;
    for (let i = 0; i < Math.min(24, n); i++) {
      const k = b * 97 + i + Math.floor((s / Math.max(1, loop ?? 1)) % 7) * 31;
      const life = 12 + 12 * R(seed, k, 1);
      if (tt > life) continue;
      const a = ((dir + (R(seed, k, 2) - 0.5) * spread * 2) * Math.PI) / 180;
      const v = (7 + 10 * R(seed, k, 3)) * power;
      const g = 0.65;
      const pos = (q: number) => [x + Math.cos(a) * v * q, y + Math.sin(a) * v * q + 0.5 * g * q * q] as const;
      const [hx, hy] = pos(tt);
      const [tx, ty] = pos(Math.max(0, tt - 2.2));
      d += `M${n1(tx)} ${n1(ty)}L${n1(hx)} ${n1(hy)}`;
      if (i % 4 === 0) heads.push([hx, hy, 1 - tt / life]);
    }
  });
  if (!d) return null;
  return (
    <g>
      {uid ? heads.map(([hx, hy, k], i) => <circle key={i} cx={hx} cy={hy} r={16 * k + 4} fill={paint(uid, t === 'up' ? 'glow-up' : t ? 'glow-down' : 'glow-ink')} opacity={0.5 * k} />) : null}
      <path d={d} fill="none" stroke={c} strokeWidth={3} strokeLinecap="round" />
    </g>
  );
};

type ConfettiP = {frame: number; x: number; y: number; at: number; seed?: number; n?: number; dir?: number; spread?: number; power?: number; tone?: Tone; accentShare?: number};
/** Confetti: rects and ribbons thrown up from a point, falling with drag and fluttering; at most 20 % in the accent. */
export const Confetti: React.FC<ConfettiP> = ({frame, x, y, at, seed = 5, n = 40, dir = -90, spread = 40, power = 1, tone: t, accentShare = 0.2}) => {
  const floor = (useBleed() ? L.bleedBottom : L.graphicsBottom) + 40; // past the picture's foot: gone
  const tt = frame - at;
  if (tt < 0) return null;
  const greys = [C.il0, C.il1, C.il2, C.il3];
  return (
    <g>
      {Array.from({length: Math.min(60, n)}, (_, i) => {
        const a = ((dir + (R(seed, i, 1) - 0.5) * spread * 2) * Math.PI) / 180;
        const v = (16 + 18 * R(seed, i, 2)) * power;
        const drag = 0.9;
        // velocity decays (drag), gravity pulls to a terminal fall of about 3 px/frame
        const q = (1 - drag ** tt) / (1 - drag);
        const px = x + Math.cos(a) * v * q + 18 * Math.sin(tt / (9 + 6 * R(seed, i, 3)) + 6 * R(seed, i, 4));
        const py = y + Math.sin(a) * v * q + 2.8 * Math.max(0, tt - 8);
        if (py > floor) return null;
        const col = t && R(seed, i, 5) < accentShare ? toneBig(t) : greys[Math.floor(R(seed, i, 6) * 4)];
        const flip = Math.cos(tt * (0.22 + 0.2 * R(seed, i, 7)) + 6 * R(seed, i, 8));
        const rot = R(seed, i, 9) * 360 + tt * (6 - 12 * R(seed, i, 10));
        const ribbon = i % 5 === 0;
        return (
          <g key={i} transform={`translate(${n1(px)} ${n1(py)}) rotate(${n1(rot)}) scale(${n1(Math.abs(flip) * 0.9 + 0.1)} 1)`}>
            {ribbon ? <path d="M-14 0C-7 -9 0 9 7 0S14 -6 17 0" fill="none" stroke={col} strokeWidth={5} strokeLinecap="round" /> : <rect x={-8} y={-5} width={16} height={10} rx={2} fill={col} />}
          </g>
        );
      })}
    </g>
  );
};

type PetalsP = {frame: number; seed?: number; n?: number; box?: Box; from?: {x: number; y: number}; at?: number; color?: string; uid?: string};
/** Petals: soft teardrops falling and turning (a bouquet pushed back, a celebration). With `from` + `at` they start
 *  there; otherwise they drift through the box. */
export const Petals: React.FC<PetalsP> = ({frame, seed = 6, n: nIn = 10, box: boxIn, from, at = 0, color, uid}) => {
  const [box, n] = useBox(boxIn, nIn);
  const c = color ?? (uid ? paint(uid, 'soft-1') : C.il1);
  return (
    <g>
      {Array.from({length: Math.min(14, n)}, (_, i) => {
        const tt = frame - at - i * 2;
        if (from && tt < 0) return null;
        const span = box.h + 60;
        const fall = from ? tt * (1.6 + 1.2 * R(seed, i, 1)) : mod(R(seed, i, 2) * span + frame * (1.4 + R(seed, i, 1)), span);
        const x0 = from ? from.x + (R(seed, i, 3) - 0.5) * 90 : box.x + R(seed, i, 3) * box.w;
        const y0 = from ? from.y : box.y - 30;
        const px = x0 + 26 * Math.sin((from ? tt : frame) / (16 + 10 * R(seed, i, 4)) + 6 * R(seed, i, 5)) + (from ? (R(seed, i, 6) - 0.5) * tt * 1.2 : 0);
        const py = y0 + fall;
        if (py > box.y + box.h + 30) return null;
        const rot = R(seed, i, 7) * 360 + (from ? tt : frame) * (3 - 6 * R(seed, i, 8));
        const sx = 0.45 + 0.55 * Math.abs(Math.cos((from ? tt : frame) / 11 + i));
        return <path key={i} d="M0 -14C9 -8 9 6 0 12C-9 6 -9 -8 0 -14Z" fill={c} transform={`translate(${n1(px)} ${n1(py)}) rotate(${n1(rot)}) scale(${n1(sx)} 1)`} />;
      })}
    </g>
  );
};

/** The lari sign as a path in a 20 x 20 box centred on 0,0 (a rounded "ლ" with its stems and the base bar). */
export const LARI = 'M-5.6 5.2C-8.6 3.6 -9.4 -0.6 -7.6 -3.6M5.6 5.2C8.6 3.6 9.4 -0.6 7.6 -3.6M-5.6 5.2H5.6M-1.8 -8V3.4M1.8 -8V3.4M-6.4 8H6.4';

type NotesP = {frame: number; seed?: number; n?: number; box?: Box; at?: number; from?: {x: number; y: number}; direction?: 'in' | 'out'; size?: number; uid?: string};
/** Banknotes: generic rounded notes (il2 with an il3 border and a lari circle), flipping in 3D (scaleX cos) and swaying.
 *  direction "in": they rain down through the box; "out": they fly up and away from `from` (a loss). */
export const Notes: React.FC<NotesP> = ({frame, seed = 7, n: nIn = 14, box: boxIn, at = 0, from, direction = 'in', size = 120, uid}) => {
  const [box, n] = useBox(boxIn, nIn);
  const w = size;
  const h = size * 0.5;
  return (
    <g>
      {Array.from({length: Math.min(24, n)}, (_, i) => {
        const tt = frame - at - (direction === 'out' ? i * 3 : 0);
        if (direction === 'out' && tt < 0) return null;
        let px: number;
        let py: number;
        if (direction === 'out') {
          const o = from ?? {x: 540, y: 1000};
          px = o.x + (R(seed, i, 1) - 0.5) * tt * 5 + 30 * Math.sin(tt / 9 + i);
          py = o.y - tt * (6 + 5 * R(seed, i, 2)) + 0.02 * tt * tt;
        } else {
          const span = box.h + h * 2;
          px = box.x + R(seed, i, 1) * box.w + 34 * Math.sin(frame / (22 + 14 * R(seed, i, 3)) + 6 * R(seed, i, 4));
          py = box.y - h + mod(R(seed, i, 2) * span + (frame - at) * (2.6 + 2 * R(seed, i, 5)), span);
        }
        if (py < box.y - h * 2 || py > box.y + box.h + h * 2) return null;
        const flip = Math.cos(tt / (7 + 5 * R(seed, i, 6)) + 6 * R(seed, i, 7));
        const rot = (R(seed, i, 8) - 0.5) * 70 + 14 * Math.sin(tt / 13 + i);
        const back = flip < 0;
        return (
          <g key={i} transform={`translate(${n1(px)} ${n1(py)}) rotate(${n1(rot)}) scale(${n1(Math.max(0.06, Math.abs(flip)))} 1)`}>
            <path d={rr(-w / 2, -h / 2, w, h, h * 0.16)} fill={uid ? paint(uid, back ? 'soft-3' : 'soft-2') : back ? C.il3 : C.il2} stroke={C.il3} strokeWidth={3} />
            <path d={rr(-w / 2 + 7, -h / 2 + 7, w - 14, h - 14, h * 0.1)} fill="none" stroke={mix(C.il3, C.il2, 0.4)} strokeWidth={1.5} />
            <circle cx={back ? 0 : -w * 0.22} cy={0} r={h * 0.27} fill={back ? C.il2 : C.il1} stroke={C.il3} strokeWidth={2} />
            {back ? null : <path d={LARI} transform={`translate(${n1(-w * 0.22)} 0) scale(${n1(h / 44)})`} fill="none" stroke={C.il4} strokeWidth={2.4} strokeLinecap="round" />}
          </g>
        );
      })}
    </g>
  );
};

// ---- smoke, speed, dust -----------------------------------------------------------------------------------------------
type SmokeP = {frame: number; x: number; y: number; seed?: number; n?: number; kind?: 'steam' | 'smoke'; rise?: number; spread?: number; size?: number; at?: number; time?: Time; uid?: string};
/** Smoke or steam: puffs that grow, rise, sway and fade, one after another from (x, y). */
export const Smoke: React.FC<SmokeP> = ({frame, x, y, seed = 8, n = 8, kind = 'steam', rise = 1, spread = 1, size = 1, at = -1e4, time = 'day', uid}) => {
  // steam is light on a dark ground and a quiet grey on paper; smoke is a dark grey on both
  const c = kind === 'steam' ? (dark(time) ? C.il1 : C.il3) : dark(time) ? C.il4 : C.il5;
  const life = 54;
  const every = life / Math.min(10, n);
  const out: React.ReactNode[] = [];
  for (let i = 0; i < Math.min(10, n); i++) {
    const t = mod(frame + i * every, life);
    const born = frame - t;
    if (born < at) continue;
    const k = t / life;
    const id = Math.floor((frame + i * every) / life) * 10 + i;
    const r = (22 + 70 * Math.sqrt(k)) * size * (0.8 + 0.4 * R(seed, id, 1));
    const px = x + (R(seed, id, 2) - 0.5) * 50 * spread + 30 * spread * Math.sin(k * 4 + 6 * R(seed, id, 3));
    const py = y - k * 300 * rise;
    const a = (kind === 'steam' ? 0.34 : 0.46) * Math.min(1, t / 6) * (1 - k) ** 1.4;
    out.push(<circle key={i} cx={n1(px)} cy={n1(py)} r={n1(r)} fill={c} opacity={n1(a * 100) / 100} />);
  }
  return <g>{out}</g>;
};

type SpeedP = {frame: number; seed?: number; n?: number; box?: Box; speed?: number; dir?: 1 | -1; time?: Time; color?: string; opacity?: number};
/** Speed lines: thin horizontal streaks rushing past (dir -1: toward the left, the default for a car going right). */
export const SpeedLines: React.FC<SpeedP> = ({frame, seed = 9, n: nIn = 12, box: boxIn, speed = 1, dir = -1, time = 'day', color, opacity = 1}) => {
  const [box, n] = useBox(boxIn, nIn);
  const c = color ?? lit(time);
  const buckets = ['', ''];
  for (let i = 0; i < Math.min(16, n); i++) {
    const len = 120 + 240 * R(seed, i, 1);
    const v = (40 + 30 * R(seed, i, 2)) * speed;
    const span = box.w + len;
    const p = mod(R(seed, i, 3) * span + frame * v, span);
    const x = dir < 0 ? box.x + box.w - p : box.x - len + p;
    const y = box.y + R(seed, i, 4) * box.h;
    buckets[i % 2] += `M${n1(x)} ${n1(y)}H${n1(x + len)}`;
  }
  return (
    <g opacity={opacity} fill="none" stroke={c} strokeLinecap="round">
      <path d={buckets[0]} strokeWidth={2.5} opacity={0.42} />
      <path d={buckets[1]} strokeWidth={1.6} opacity={0.24} />
    </g>
  );
};

type DustP = {frame: number; seed?: number; n?: number; cone: {x: number; top: number; bottom: number; w0: number; w1: number}; time?: Time; color?: string};
/** Dust motes floating in a light cone (a garage door rolling up, a spotlight): only the motes inside the cone show. */
export const Dust: React.FC<DustP> = ({frame, seed = 10, n = 30, cone, time = 'night', color}) => {
  const c = color ?? lit(time);
  let d = '';
  let d2 = '';
  for (let i = 0; i < Math.min(40, n); i++) {
    const y = cone.top + mod(R(seed, i, 1) * (cone.bottom - cone.top) - frame * (0.25 + 0.3 * R(seed, i, 2)), cone.bottom - cone.top);
    const u = (y - cone.top) / (cone.bottom - cone.top);
    const half = (cone.w0 + (cone.w1 - cone.w0) * u) / 2;
    const x = cone.x + (R(seed, i, 3) * 2 - 1) * half * 1.1 + 10 * Math.sin(frame / (30 + 30 * R(seed, i, 4)) + 6 * R(seed, i, 5));
    if (Math.abs(x - cone.x) > half) continue;
    const r = 1.6 + 2.6 * R(seed, i, 6);
    if (i % 2) d += dot(x, y, r);
    else d2 += dot(x, y, r);
  }
  return (
    <g fill={c}>
      <path d={d} opacity={0.55} />
      <path d={d2} opacity={0.32} />
    </g>
  );
};

// ---- rings, shockwave, burst ------------------------------------------------------------------------------------------
type RingsP = {frame: number; x: number; y: number; w: number; h?: number; r?: number; at: number; period?: number; count?: number; gap?: number; to?: number; dur?: number; color?: string; width?: number; until?: number};
/** Expanding outlines from a shape (a phone ringing: its rounded rect, 1 -> 1.35, two rings 6 frames apart, at every
 *  burst). `period` repeats them; `until` stops new ones. */
export const Rings: React.FC<RingsP> = ({frame, x, y, w, h, r, at, period, count = 2, gap = 6, to = 1.35, dur = 24, color, width = 3, until = Infinity}) => {
  const hh = h ?? w;
  const rad = r ?? Math.min(w, hh) / 2;
  const c = color ?? C.il0;
  const out: React.ReactNode[] = [];
  const starts: number[] = [];
  if (period) {
    for (let s = at + Math.max(0, Math.floor((frame - at - dur - gap * count) / period)) * period; s <= frame; s += period) if (s >= at && s < until) starts.push(s);
  } else if (at < until) starts.push(at);
  starts.forEach((s, b) => {
    for (let j = 0; j < count; j++) {
      const t = (frame - s - j * gap) / dur;
      if (t < 0 || t > 1) continue;
      const k = 1 - (1 - t) ** 3; // ease out
      const sc = 1 + (to - 1) * k;
      out.push(<path key={`${b}-${j}`} d={rr(x - (w * sc) / 2, y - (hh * sc) / 2, w * sc, hh * sc, rad * sc)} fill="none" stroke={c} strokeWidth={width} opacity={0.5 * (1 - t) ** 1.3} />);
    }
  });
  return <g>{out}</g>;
};

/** One ring racing out from a hit: radius 0 -> r over 14 frames (ease out), its stroke thinning and fading. */
export const Shockwave: React.FC<{frame: number; x: number; y: number; r?: number; at: number; dur?: number; color?: string; width?: number}> = ({frame, x, y, r = 360, at, dur = 14, color, width = 18}) => {
  const t = (frame - at) / dur;
  if (t <= 0 || t >= 1) return null;
  const k = 1 - (1 - t) ** 3;
  return <circle cx={x} cy={y} r={r * k} fill="none" stroke={color ?? C.il0} strokeWidth={Math.max(1, width * (1 - t))} opacity={0.85 * (1 - t)} />;
};

type BurstP = {frame: number; x: number; y: number; r?: number; inner?: number; points?: number; at: number; seed?: number; turn?: number; fill?: string; uid: string; tone?: number; time?: Time};
/** The comic star burst: 12 to 16 jagged points slamming in from 0.2 with the punch spring, turning 4 degrees. A
 *  solid: soft-shaded in ramp step `tone` (or an accent `fill`), the rim on a dark ground, the ink contour on paper. */
export const Burst: React.FC<BurstP> = ({frame, x, y, r = 300, inner = 0.72, points = 14, at, seed = 11, turn = 0, fill, uid, tone: t = 0, time = 'day'}) => {
  if (frame < at) return null;
  const s = 0.2 + 0.8 * punch(frame, at);
  const rot = turn + 4 * Math.min(1, (frame - at) / 20);
  return (
    <g transform={`translate(${x} ${y}) rotate(${n1(rot)}) scale(${s.toFixed(3)})`}>
      <Solid uid={uid} d={star(0, 0, r, r * inner, points, 0, 0.28, seed)} tone={t} fill={fill} rim outline time={time} />
    </g>
  );
};

// ---- character effects ------------------------------------------------------------------------------------------------
export type FaceFxKind = 'sweat' | 'shock' | 'tear' | 'sparkle' | 'zap' | 'hearts' | 'question' | 'idea' | 'zzz';
type FaceFxP = {kind: FaceFxKind; frame: number; x: number; y: number; size?: number; at?: number; side?: 1 | -1; time?: Time; tone?: Tone; uid?: string};
const HEART = 'M0 9C-11 1 -14 -6 -9 -10C-5 -13 -1 -11 0 -7C1 -11 5 -13 9 -10C14 -6 11 1 0 9Z';
const DROP = 'M0 -10C4 -4 7 0 7 4A7 7 0 0 1 -7 4C-7 0 -4 -4 0 -10Z';
const BOLT = 'M3 -14L-7 2H0L-3 14L7 -2H0Z';
const QMARK = 'M-6 -6C-6 -12 6 -13 7 -6C8 -1 0 0 0 5';
/** A small effect at a head or a hand: (x, y) is the anchor (the head's top or a temple), `size` the head's height. */
export const FaceFx: React.FC<FaceFxP> = ({kind, frame, x, y, size = 100, at = 0, side = 1, time = 'day', tone: tn, uid}) => {
  const t = frame - at;
  if (t < 0) return null;
  const k = size / 100;
  const ink = lit(time);
  const pop = punch(frame, at);
  const g = (children: React.ReactNode, extra = '') => <g transform={`translate(${n1(x)} ${n1(y)}) scale(${k.toFixed(3)})${extra}`}>{children}</g>;
  switch (kind) {
    case 'sweat': {
      const c = mod(t, 46) / 46;
      return g(<path d={DROP} transform={`translate(${46 * side} ${-6 + 34 * c}) scale(${(1.6 * Math.min(1, c * 5)).toFixed(2)})`} fill={C.il0} stroke={C.il3} strokeWidth={1.2} opacity={1 - c ** 3} />);
    }
    case 'tear': {
      const c = mod(t, 40) / 40;
      return g(<path d={DROP} transform={`translate(${22 * side} ${4 + 40 * c}) scale(${(1.1 * Math.min(1, c * 6)).toFixed(2)})`} fill={C.il0} opacity={0.9 * (1 - c ** 4)} />);
    }
    case 'shock': {
      const jit = Math.sin(t * 2.1) * 1.5;
      return g(
        [-40, 0, 40].map((a, i) => (
          <path key={i} d="M-5 -26L5 -26L2 -6L-2 -6Z" fill={ink} transform={`rotate(${a + jit}) translate(0 ${-56 - 8 * pop}) scale(${pop.toFixed(3)})`} />
        )),
      );
    }
    case 'sparkle':
      return g(
        <>
          <Glint x={40 * side} y={-10} size={34} at={at + Math.floor(t / 40) * 40} frame={frame} />
          <Glint x={58 * side} y={-40} size={20} at={at + 12 + Math.floor((t - 12) / 40) * 40} frame={frame} />
        </>,
      );
    case 'zap': {
      const on = mod(t, 10) < 6 ? 1 : 0.35;
      return g(
        <>
          {uid ? <circle r={36} fill={paint(uid, tn === 'up' ? 'glow-up' : 'glow-down')} opacity={0.6 * on} /> : null}
          <path d={BOLT} fill={toneBig(tn ?? 'down')} transform={`scale(${(1.8 * pop).toFixed(3)}) rotate(${(8 * Math.sin(t)).toFixed(1)})`} opacity={on} />
        </>,
      );
    }
    case 'hearts':
      return g(
        [0, 1].map((i) => {
          const c = mod(t - i * 18, 44) / 44;
          if (t - i * 18 < 0) return null;
          return <path key={i} d={HEART} fill={tn ? toneBig(tn) : ink} transform={`translate(${(30 + 26 * i) * side + 10 * Math.sin(c * 6)} ${-20 - 90 * c}) scale(${(1.3 * Math.min(1, c * 4)).toFixed(2)})`} opacity={1 - c} />;
        }),
      );
    case 'question':
      return g(
        <g transform={`translate(${40 * side} ${-70}) rotate(${(10 * Math.sin(t / 6) * Math.exp(-t / 30)).toFixed(1)}) scale(${(2.4 * pop).toFixed(3)})`}>
          <path d={QMARK} fill="none" stroke={ink} strokeWidth={4} strokeLinecap="round" />
          <circle cx={0} cy={11} r={2.4} fill={ink} />
        </g>,
      );
    case 'idea': {
      const glowA = 0.5 + 0.15 * Math.sin(t / 7);
      return g(
        <g transform={`translate(0 ${-78}) scale(${(1.9 * pop).toFixed(3)})`}>
          {uid ? <circle r={30} fill={paint(uid, 'glow-ink')} opacity={glowA} /> : null}
          <path d="M0 -15C-9 -15 -13 -8 -13 -3C-13 3 -8 6 -7 11H7C8 6 13 3 13 -3C13 -8 9 -15 0 -15Z" fill={C.il0} />
          <path d={rr(-6, 12, 12, 6, 2)} fill={C.il3} />
        </g>,
      );
    }
    case 'zzz':
      return g(
        [0, 1, 2].map((i) => {
          const c = mod(t - i * 14, 42) / 42;
          if (t - i * 14 < 0) return null;
          const s = 0.8 + 0.5 * i;
          return <path key={i} d="M-6 -6H6L-6 6H6" fill="none" stroke={ink} strokeWidth={3.2 / s} strokeLinejoin="round" strokeLinecap="round" transform={`translate(${(36 + 22 * i) * side} ${-40 - 36 * i - 30 * c}) scale(${s})`} opacity={(1 - c) * Math.min(1, c * 8)} />;
        }),
      );
    default:
      return null;
  }
};

/** A soft halo disc (a lamp, a headlight, a lit screen): paint(uid, 'glow-ink' | 'glow-up' | 'glow-down'). */
export const Halo: React.FC<{uid: string; x: number; y: number; r: number; kind?: 'ink' | 'up' | 'down'; opacity?: number; sx?: number}> = ({uid, x, y, r, kind = 'ink', opacity = 1, sx = 1}) => (
  <ellipse cx={x} cy={y} rx={r * sx} ry={r} fill={paint(uid, `glow-${kind}`)} opacity={opacity} />
);

/** A seeded set of `n` numbers in [0, 1) (scenes that place their own things the same way the particles do). */
export const seeded = (seed: number, n: number) => Array.from({length: n}, (_, i) => R(seed, i));

