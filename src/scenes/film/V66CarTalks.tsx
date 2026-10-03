// v66-car-talks: the car talks. A clean side profile of a sedan, and three speech bubbles rise from it, one need
// each (the road it blocks, the oil, a knock). Then the bubbles shrink into three small nodes that settle on one
// orbit around the car, its own quiet assistant, and the word lands under it.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, F, halo, rgba, toneBig, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  lines?: string[]; // the three things the car asks for, first person
  label?: string; // the word under the orbit
  at?: number | string; // chunk where the bubbles rise
  mergeAt?: number | string; // chunk where they become the orbit
  tone?: Tone;
};

// the car in its own units (600 x 200), placed at CX, CY on the stage
const CX = 240;
const CY = 820;
const BODY =
  'M 20 150 L 75 150 A 50 50 0 0 1 175 150 L 425 150 A 50 50 0 0 1 525 150 L 585 150 Q 600 150 600 135 L 598 110 Q 595 92 560 88 L 470 78 Q 430 28 370 20 L 260 20 Q 205 24 150 78 L 45 92 Q 8 98 5 125 L 5 140 Q 6 150 20 150 Z';
const GLASS = 'M 178 80 Q 216 40 265 34 L 365 34 Q 410 38 446 80 Z';
const BODY_LEN = 1700;
// the orbit around the car
const OX = 540;
const OY = 915;
const RX = 360;
const RY = 150;
// where the bubbles float (centres, stage units) and the angle of their node on the orbit
const SPOTS = [
  {x: 330, y: 500, a: 200},
  {x: 720, y: 610, a: 270},
  {x: 360, y: 715, a: 340},
];

const Icon: React.FC<{k: number; s: number; color: string}> = ({k, s, color}) => {
  if (k === 0) {
    // a small QR: three finder squares and a few modules
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <rect x={3} y={3} width={13} height={13} fill="none" stroke={color} strokeWidth={2.4} />
        <rect x={24} y={3} width={13} height={13} fill="none" stroke={color} strokeWidth={2.4} />
        <rect x={3} y={24} width={13} height={13} fill="none" stroke={color} strokeWidth={2.4} />
        <rect x={7.5} y={7.5} width={4} height={4} fill={color} />
        <rect x={28.5} y={7.5} width={4} height={4} fill={color} />
        <rect x={7.5} y={28.5} width={4} height={4} fill={color} />
        <rect x={25} y={25} width={5} height={5} fill={color} />
        <rect x={32} y={32} width={5} height={5} fill={color} />
        <rect x={32} y={24} width={4} height={4} fill={color} />
      </svg>
    );
  }
  if (k === 1) {
    // an oil drop
    return (
      <svg width={s} height={s} viewBox="0 0 40 40">
        <path d="M 20 4 C 26 14 32 20 32 26 A 12 12 0 0 1 8 26 C 8 20 14 14 20 4 Z" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" />
        <path d="M 14 27 A 6 6 0 0 0 19 32" fill="none" stroke={color} strokeWidth={2} strokeLinecap="round" />
      </svg>
    );
  }
  // a knock: a sharp zigzag
  return (
    <svg width={s} height={s} viewBox="0 0 40 40">
      <path d="M 2 20 L 9 20 L 13 8 L 19 32 L 24 12 L 28 26 L 31 20 L 38 20" fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
};

/** The car asks for three things in speech bubbles; the bubbles become three nodes on one orbit around it. */
export const V66CarTalks: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const first = ctx.index === 0;
  const draw = first ? 1 : prog(frame, e, 30, ease.drawOn);
  const rise = Math.max(base + 6, cueFrame(ctx, p.at ?? 1));
  const merge = Math.max(rise + 30, cueFrame(ctx, p.mergeAt ?? 2));
  const m = prog(frame, merge, 30, ease.camera);
  const ring = prog(frame, merge + 4, 32, ease.drawOn);
  const landF = merge + 30;
  const land = spr(frame, landF, 'land');
  const tone = p.tone ?? 'up';
  const lines = p.lines ?? ['გზა გადავკეტე', 'ზეთი მომიცვალე', 'რაღაც მიკაკუნებს'];
  const label = mtav(p.label ?? 'ერთ აპში');
  const labelSize = Math.min(60, Math.floor((60 * 600) / Math.max(1, textWidth(label, `600 60px ${F.sans}`))));
  // the camera: a slow push on the bubbles, then a step back for the orbit
  const push = lerp(1, 1.04, prog(frame, e, merge - e, ease.camera)) * lerp(1, 0.97, m);
  // the orbit turns slowly once it is there
  const spin = 18 * prog(frame, merge, Math.max(30, ctx.dur - (merge - e)), ease.camera);
  // the "..." the car types before it speaks
  const typing = (1 - prog(frame, rise - 4, 6)) * (first ? 1 : prog(frame, e + 6, 10));

  const bubbles = [0, 1, 2].map((i) => {
    const f = rise + i * 9;
    const s = spr(frame, f, 'enter');
    const text = mtav(lines[+i] ?? '');
    const fs = Math.min(42, Math.floor((42 * 300) / Math.max(1, textWidth(text, `600 42px ${F.sans}`))));
    const w = Math.min(440, 30 + 44 + 16 + textWidth(text, `600 ${fs}px ${F.sans}`) * 1.18 + 40);
    const h = 92;
    const sp = SPOTS[+i];
    const cx = Math.min(960 - w / 2, Math.max(120 + w / 2, sp.x));
    const ang = ((sp.a + spin) * Math.PI) / 180;
    const nx = OX + RX * Math.cos(ang);
    const ny = OY + RY * Math.sin(ang);
    return {i, f, s, text, fs, w, h, cx, cy: sp.y, nx, ny};
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px 860px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the orbit, behind the car */}
          <ellipse cx={OX} cy={OY} rx={RX} ry={RY} fill="none" stroke={toneLine(tone)} strokeWidth={2} strokeDasharray={1700} strokeDashoffset={1700 * (1 - ring)} opacity={ring > 0 ? 0.85 : 0} />
          <ellipse cx={OX} cy={OY} rx={RX + 26} ry={RY + 14} fill="none" stroke={rgba(C.ink, 0.18)} strokeWidth={1.2} opacity={ring} />
          {/* the ground */}
          <line x1={CX - 60} y1={CY + 192} x2={CX + 660} y2={CY + 192} stroke={C.rule} strokeWidth={1.5} opacity={draw} />
          {/* the car */}
          <g transform={`translate(${CX} ${CY})`}>
            <path d={BODY} fill={C.bg} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" strokeDasharray={BODY_LEN} strokeDashoffset={BODY_LEN * (1 - draw)} />
            <path d={GLASS} fill="none" stroke={C.ink2} strokeWidth={1.8} strokeLinejoin="round" opacity={draw} />
            <line x1={310} y1={34} x2={310} y2={80} stroke={C.ink2} strokeWidth={1.8} opacity={draw} />
            <line x1={330} y1={98} x2={360} y2={98} stroke={C.ink2} strokeWidth={1.8} strokeLinecap="round" opacity={draw} />
            <line x1={578} y1={104} x2={596} y2={106} stroke={C.ink} strokeWidth={2.4} strokeLinecap="round" opacity={draw} />
            {[125, 475].map((x) => (
              <g key={x} opacity={draw}>
                <circle cx={x} cy={150} r={40} fill={C.bg} stroke={C.ink} strokeWidth={2.4} />
                <circle cx={x} cy={150} r={13} fill="none" stroke={C.ink2} strokeWidth={1.8} />
              </g>
            ))}
          </g>
          {/* the tails of the bubbles, pointing at the roof */}
          {bubbles.map((b) => (
            <line key={b.i} x1={b.cx} y1={b.cy + b.h / 2} x2={lerp(b.cx, 540, 0.35)} y2={lerp(b.cy + b.h / 2, CY + 20, 0.35)} stroke={rgba(C.ink, 0.35)} strokeWidth={1.5} opacity={Math.min(1, b.s) * (1 - m)} />
          ))}
          {/* the nodes on the orbit */}
          {bubbles.map((b) => {
            const show = prog(frame, merge + 10 + b.i * 4, 14);
            return (
              <g key={b.i} opacity={show}>
                <circle cx={b.nx} cy={b.ny} r={48} fill={C.surface} stroke={toneLine(tone)} strokeWidth={2} />
                <circle cx={b.nx} cy={b.ny} r={60} fill="none" stroke={halo(toneLine(tone), 0.5)} strokeWidth={1} opacity={1 - land * 0.5} />
              </g>
            );
          })}
        </svg>
        {/* the typing dots before the car speaks */}
        <div style={{position: 'absolute', left: 760, top: 770, width: 96, height: 50, borderRadius: 25, backgroundColor: C.surface, border: `1.5px solid ${rgba(C.ink, 0.25)}`, opacity: typing, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9}}>
          {[0, 1, 2].map((d) => (
            <div key={d} style={{width: 10, height: 10, borderRadius: 5, backgroundColor: C.ink, opacity: 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((frame - d * 4) / 4))}} />
          ))}
        </div>
        {/* the bubbles: icon and words; on the merge they shrink into their nodes */}
        {bubbles.map((b) => {
          const sc = Math.min(1.04, b.s);
          const x = lerp(b.cx, b.nx, m);
          const y = lerp(b.cy, b.ny, m);
          const w = lerp(b.w, 96, m);
          const h = lerp(b.h, 96, m);
          return (
            <div key={b.i} style={{position: 'absolute', left: x - w / 2, top: y - h / 2, width: w, height: h, borderRadius: h / 2, backgroundColor: C.surface, border: `1.5px solid ${rgba(C.ink, lerp(0.22, 0, m))}`, opacity: Math.min(1, b.s * 1.4), transform: `scale(${sc})`, transformOrigin: '50% 100%', overflow: 'hidden', display: 'flex', alignItems: 'center', paddingLeft: lerp(30, 26, m), boxSizing: 'border-box'}}>
              <div style={{flex: 'none', width: 44, height: 44}}>
                <Icon k={b.i} s={44} color={m > 0.5 ? toneLine(tone) : C.ink} />
              </div>
              <div className={TXT} style={{marginLeft: 16, fontFamily: F.sans, fontWeight: 600, fontSize: b.fs, color: C.ink, whiteSpace: 'nowrap', opacity: 1 - Math.min(1, m / 0.4)}}>
                {b.text}
              </div>
            </div>
          );
        })}
        {/* the word under the orbit */}
        <div className={TXT} style={{position: 'absolute', left: 120, width: 840, top: 1140, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: labelSize, color: toneBig(tone), opacity: Math.min(1, land), transform: `translateY(${(1 - Math.min(1, land)) * 18}px)`}}>
          {label}
        </div>
      </div>
      {first ? null : <Sfx name="asmr-pencil" at={base + 1} volume={0.35} />}
      {bubbles.map((b) => (
        <Sfx key={b.i} name="asmr-pop" at={b.f} volume={0.4} />
      ))}
      <Haptic kind="light" at={rise} />
      <Sfx name="asmr-air-long" at={merge} volume={0.3} />
      <Sfx name="asmr-pencil-short" at={merge + 4} volume={0.3} />
      <Land at={landF} />
    </PictureBand>
  );
};
