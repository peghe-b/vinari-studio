import React from 'react';
import {Easing, interpolate, interpolateColors, useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {kickEnv} from '../lib/camera';
import {capsLatin, mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {PhotoPlate, PhotoCredits, photoCredit} from '../lib/photo';
import {Words} from '../lib/textfx';
import {C, F, L, rgba, Tone, toneBig} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, Sfx, SourceLine, TypeSfx} from './common';

// ---- BigNumber: a year or a number, huge, on mechanical drums (2026-10-06, the stories category) ------------------------
// Every digit is a drum (a column 0..9 in a 1 em window) that rolls from `from` to `value`, the right drums fastest, with a
// cheap motion stretch (a stretched drum and one ghost copy) while it spins; the number lands with a punch, its tone and a
// camera kick. Truth: `value` and `from` are the bank's own figures; a year is never "today" read from a clock.
// Props:
//   value*    the number (a year: 1888; a bank figure)
//   from      where it starts (REQUIRED for rewind; default: 0, or for a year the value minus 60)
//   staging   "odometer" (default) | "rewind" (counts DOWN from `from` to the year, accelerating then braking: the jump
//             back in time; a photo `bg` fades in when it lands, and the planner adds one tape glitch at the midpoint)
//             | "scrub" (a year ruler slides under a fixed needle; the big number above follows it)
//   format    "year" (no separator, the default when 1000..2100 and an integer) | "int" (groups: 300 000) | "plain"
//   unit      a mono word after it ("წელი", "კმ/სთ");  label: a mono line above, typed;  caption: a line under, masked
//   at        the count starts (chunk or "1.2s"; default the entrance + 4);  landAt: it lands on this chunk (at + 30)
//   tone      the landed colour (neutral; up = a record, down = a loss);  size: 300 (shrinks to fit 800 px)
//   bg        {src, dim}: rewind's photo (graded mono, dim 0.55);  source: the mono source line
// Camera: free (push 0.01 while it counts), a kick on the landing.

type At = number | string;
type P = {
  value: number;
  from?: number;
  staging?: 'odometer' | 'rewind' | 'scrub';
  format?: 'year' | 'int' | 'plain';
  unit?: string;
  label?: string;
  caption?: string;
  at?: At;
  landAt?: At;
  tone?: Tone;
  size?: number;
  bg?: {src: string; dim?: number};
  source?: string;
};

const isYear = (v: number) => Number.isInteger(v) && v >= 1000 && v <= 2100;
const BRAKE = Easing.bezier(0.5, 0, 0.12, 1);
/** A drum's position like a real odometer: the units roll continuously, a higher drum turns only while the drum below
 *  it passes from 9 to 0 (or back), so a number at rest always reads whole. */
const drumPos = (v: number, i: number) => {
  const a = Math.abs(v);
  if (i === 0) return a % 10;
  const d = Math.floor(a / 10 ** i) % 10;
  const lower = (a / 10 ** (i - 1)) % 10;
  return d + (lower > 9 ? lower - 9 : 0);
};
/** The count's frames (the scene and its camera kick agree on them). */
export const bnTimes = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  const at = p.at !== undefined ? Math.max(e + 2, cueFrame(ctx, p.at)) : e + 4;
  const land = Math.max(at + 12, p.landAt !== undefined ? cueFrame(ctx, p.landAt) : at + 30);
  return {at, land};
};
export const bnKicks = (p: P, ctx: SceneCtx) => [bnTimes(p, ctx).land];

/** One drum: the column of digits, positioned to `pos` (a real number: 3.4 = between 3 and 4). While it spins the
 *  column is drawn three times along its travel (a cheap motion blur: the taps spread with the speed and meet when it
 *  stops), so a fast count reads as a spinning drum, never as digits strobing frame to frame. */
const Drum: React.FC<{pos: number; speed: number; size: number; color: string}> = ({pos, speed, size, color}) => {
  const w = size * 0.6;
  const m = ((pos % 10) + 10) % 10;
  // the faster it turns, the wider and the more even the smear (seven taps from a digit a frame: a blur, not a strobe)
  const k = Math.min(1, speed / 0.6);
  const spread = Math.min(1.6, 0.15 + speed * 0.5);
  const n = k < 0.05 ? 1 : speed < 1 ? 3 : 7;
  const taps: [number, number][] =
    n === 1
      ? [[0, 1]]
      : Array.from({length: n}, (_, j) => {
          const x = -1 + (2 * j) / (n - 1);
          const centre = j === (n - 1) / 2;
          return [x * spread, centre ? 1 - 0.55 * k : (n === 3 ? 0.5 : 0.32) * k] as [number, number];
        });
  return (
    <div className={TXT} style={{position: 'relative', display: 'inline-block', width: w, height: size * 1.04, overflow: 'hidden', color, verticalAlign: 'top'}}>
      {taps.map(([dy, op], j) => (
        <div key={j} style={{position: 'absolute', left: 0, top: size * 0.02, width: w, transform: `translateY(${(-(m + dy + 2) * size).toFixed(2)}px)`, opacity: op}}>
          {[8, 9, 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0, 1, 2].map((d, i) => (
            <div key={i} style={{height: size, lineHeight: `${size}px`, textAlign: 'center'}}>
              {d}
            </div>
          ))}
        </div>
      ))}
    </div>
  );
};

export const BigNumber: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const staging = p.staging ?? 'odometer';
  const value = Number(p.value) || 0;
  const year = (p.format ?? (isYear(value) ? 'year' : 'int')) === 'year';
  const fmt = p.format ?? (year ? 'year' : 'int');
  const from = p.from ?? (year ? value - 60 : 0);
  const {at, land} = bnTimes(p, ctx);
  // rewind and scrub accelerate, then brake on a LONG tail (the last digits roll slowly, so an odometer near one digit a
  // frame never strobes); the odometer counts up fast and settles (Stat's curve)
  const curve = staging === 'odometer' ? ease.countUp : BRAKE;
  const valueAt = (f: number) => from + (value - from) * interpolate(f, [at, land], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: curve});
  const v = valueAt(frame);
  const vNext = valueAt(frame + 1);
  const vPrev = valueAt(frame - 1);
  const digits = Math.max(String(Math.round(Math.abs(value))).length, String(Math.round(Math.abs(from))).length);
  const want = p.size ?? 300;
  const sepW = fmt === 'int' ? Math.floor((digits - 1) / 3) * 0.28 : 0;
  const unit = p.unit ? mtav(capsLatin(p.unit)) : '';
  const unitFs0 = Math.max(34, Math.round(want * 0.2));
  const unitW = unit ? textWidth(unit, `500 ${unitFs0}px ${F.sans}`) + 24 : 0;
  const size = Math.floor(Math.min(want, (800 - unitW) / (digits * 0.6 + sepW)));
  const unitFs = Math.max(34, Math.round(size * 0.2));
  const landed = frame >= land;
  // the landing: a 2-frame rise and a fall (camera.tsx kickEnv), never a one-frame jump (tools/flicker.py reads a ramp)
  const pop = 1 + 0.06 * kickEnv(frame - land);
  const tone = p.tone ?? 'neutral';
  const color = interpolateColors(prog(frame, land, 6), [0, 1], [C.ink, toneBig(tone)]);
  const appear = prog(frame, e, 8);
  const cy = staging === 'scrub' ? L.contentMid - 90 : L.contentMid - 20;
  const drums: React.ReactNode[] = [];
  for (let i = digits - 1; i >= 0; i--) {
    // the position of drum i: the value's digits from the right, rolling continuously (an odometer)
    const pos = landed ? Math.floor(Math.abs(value) / 10 ** i) % 10 : drumPos(v, i);
    const exact = Math.floor(Math.abs(v) / 10 ** i);
    const leading = exact === 0 && i > 0 && Math.floor(Math.abs(value) / 10 ** i) === 0;
    // how far this drum really turns around this frame (a carry turns a higher drum a whole digit in a frame or two)
    const turn = (a: number, b: number) => {
      const d = Math.abs(drumPos(a, i) - drumPos(b, i));
      return Math.min(d, 10 - d);
    };
    const speed = Math.max(turn(v, vNext), turn(vPrev, v));
    drums.push(
      <span key={i} style={{opacity: leading ? 0 : 1}}>
        <Drum pos={pos} speed={landed ? 0 : speed} size={size} color={color} />
      </span>,
    );
    if (fmt === 'int' && i > 0 && i % 3 === 0) drums.push(<span key={`s${i}`} style={{display: 'inline-block', width: size * 0.28}} />);
  }
  const dim = Math.max(0, Math.min(0.9, p.bg?.dim ?? 0.55));
  const bgK = staging === 'rewind' && p.bg?.src ? prog(frame, land, 14, ease.camera) : 0;
  const view = {x: 20, y: L.graphicsTop, w: 1040, h: L.graphicsBottom - L.graphicsTop};
  // scrub: the year ruler under a fixed needle
  const rulerY = 1080;
  const PX = 22; // stage px a unit
  const ticks: React.ReactNode[] = [];
  if (staging === 'scrub') {
    const lo = Math.floor(Math.min(from, value)) - 30;
    const hi = Math.ceil(Math.max(from, value)) + 30;
    for (let yv = lo; yv <= hi; yv++) {
      const x = 540 + (yv - v) * PX;
      if (x < 40 || x > 1040) continue;
      const big = yv % 10 === 0;
      ticks.push(<div key={yv} style={{position: 'absolute', left: x - (big ? 1 : 0.75), top: rulerY - (big ? 26 : 14), width: big ? 2 : 1.5, height: big ? 26 : 14, backgroundColor: big ? C.ink2 : C.rule}} />);
      if (big) ticks.push(<div key={`l${yv}`} className={TXT} style={{position: 'absolute', left: x - 60, width: 120, top: rulerY + 12, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: C.ink2}}>{yv}</div>);
    }
  }
  return (
    <>
      {bgK > 0 && p.bg?.src ? (
        <>
          <PhotoPlate src={p.bg.src} id={`vn-bn-${ctx.index}`} view={view} z={1.04 + 0.05 * prog(frame, land, ctx.dur - land)} u={0.5} v={0.45} grade="archival" opacity={bgK} vignette={0.45} />
          <div style={{position: 'absolute', left: view.x, top: view.y, width: view.w, height: view.h, backgroundColor: rgba(C.bg, dim * bgK)}} />
          <PhotoCredits lines={[photoCredit(p.bg.src)]} bottom={view.y + view.h - 10} />
        </>
      ) : null}
      {p.label ? (
        <div className={TXT} style={{position: 'absolute', top: cy - size / 2 - 70, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, whiteSpace: 'nowrap'}}>
          {mtav(capsLatin(p.label)).slice(0, Math.max(0, Math.floor((frame - e) * 1.4)))}
          <TypeSfx text={mtav(capsLatin(p.label))} at={Math.max(base, e)} cpf={1.4} volume={0.24} rolls={1} />
        </div>
      ) : null}
      <div style={{position: 'absolute', top: cy - size / 2, left: 0, right: 0, textAlign: 'center', whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 600, fontSize: size, fontVariantNumeric: 'tabular-nums', lineHeight: 1, opacity: appear, transform: `scale(${pop.toFixed(4)})`, transformOrigin: `540px ${size / 2}px`}}>
        {drums}
        {unit ? (
          <span className={TXT} style={{display: 'inline-block', marginLeft: 20, fontFamily: F.sans, fontWeight: 500, fontSize: unitFs, color: C.ink2, verticalAlign: 'top', lineHeight: 1, marginTop: size * 0.72 - unitFs}}>
            {unit}
          </span>
        ) : null}
      </div>
      {staging === 'scrub' ? (
        <>
          <div style={{position: 'absolute', left: 40, right: 40, top: rulerY, height: 1.5, backgroundColor: C.rule, opacity: appear}} />
          <div style={{opacity: appear}}>{ticks}</div>
          <div style={{position: 'absolute', left: 539, top: rulerY - 44, width: 2, height: 60, backgroundColor: C.ink}} />
        </>
      ) : null}
      {p.caption ? (
        <div style={{position: 'absolute', top: cy + size / 2 + (staging === 'scrub' ? 150 : 40), left: 0, right: 0, textAlign: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.caption} at={Math.max(e + 8, land - 6)} fx="mask" size={44} sound={false} />
        </div>
      ) : null}
      <SourceLine text={p.source} at={base + 24} />
      {/* events: the count rolls, the number lands (a felt thump and a medium haptic); a year's drums settle on a detent */}
      {at >= 0 ? <Sfx name="asmr-count-roll-long" at={Math.max(0, at)} volume={staging === 'rewind' ? 0.4 : 0.36} len={Math.max(8, land - at)} fade={6} /> : null}
      <Land at={land} />
      {year ? <Sfx name="asmr-detent" at={land + 2} volume={0.4} /> : null}
      {staging === 'scrub' ? <Haptic kind="rigid" at={land} volume={0.3} /> : null}
    </>
  );
};
