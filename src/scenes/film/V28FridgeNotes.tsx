// v28-fridge-notes: the car's to-do notes stuck on a fridge door; the fridge folds into a phone and every note flies
// in as a neat row with a check. Chunk 1: the camera pulls back from the notes to the whole fridge. `peelAt`: the
// notes peel off and the door morphs into the phone. `landAt`: the last row settles.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx, vary} from '../common';
import {C, F, L, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import type {SceneCtx} from '../../types';

type P = {
  notes?: string[]; // what is written on the five notes
  rows?: string[]; // what each becomes in the phone
  pullAt?: number | string; // the camera pulls back to the whole fridge
  peelAt?: number | string; // the notes peel off, the fridge becomes a phone
};

// sticky notes on the door (centre x, centre y, rotation)
const NOTE = [
  [420, 545, -6],
  [655, 600, 5],
  [440, 870, 4],
  [660, 945, -5],
  [540, 1150, -3],
];
const NW = 200;
const NH = 150;
// the fridge door and the phone it folds into
const FR = {x: 300, y: 410, w: 480, h: 920, r: 26};
const PH = {x: 305, y: 410, w: 470, h: 860, r: 66};
const RW = 400;
const RH = 96;
const RY0 = 570;
const RSTEP = 128;

const fit = (s: string, max: number, px: number, w: number) => Math.min(max, Math.floor((max * w) / Math.max(1, textWidth(s, `600 ${max}px ${F.sans}`))), px);

export const V28FridgeNotes: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const notes = p.notes ?? ['ზეთი?', 'დაზღვევა', 'რამდენი ღირს?', 'რა აკაკუნებს?', 'ტექდათვალიერება'];
  const rows = p.rows ?? ['ზეთი', 'დაზღვევა', 'ფასი', 'ძრავის ხმა', 'ტექდათვალიერება'];
  const n = Math.min(5, notes.length, rows.length);

  const pull = Math.max(base + 10, cueFrame(ctx, p.pullAt ?? 1));
  const peel = Math.max(pull + 18, cueFrame(ctx, p.peelAt ?? 2));
  const lastLand = peel + (n - 1) * 5 + 24;

  // the fridge draws on before frame 0 (first scene) or on the cut
  const draw = prog(frame, e, 24, ease.drawOn);
  // camera: close on the notes, pulled back on chunk 1, a slow push after
  const back = prog(frame, pull, 30, ease.camera);
  const cam = lerp(1.26, 1.06, back) * lerp(1, 1.04, prog(frame, peel, ctx.dur - peel, ease.camera));
  const camY = lerp(760, L.contentMid, back);
  // the door folds into the phone
  const m = prog(frame, peel + 4, 26, ease.camera);
  const bx = lerp(FR.x, PH.x, m);
  const by = lerp(FR.y, PH.y, m);
  const bw = lerp(FR.w, PH.w, m);
  const bh = lerp(FR.h, PH.h, m);
  const br = lerp(FR.r, PH.r, m);
  const fridgeOnly = 1 - prog(frame, peel, 14);
  const phoneOnly = prog(frame, peel + 16, 14);
  const perim = 2 * (FR.w + FR.h);

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${cam})`, transformOrigin: `540px ${camY}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the door: a fridge, then a phone */}
          <rect x={bx} y={by} width={bw} height={bh} rx={br} fill={rgba(C.surface, 0.55 * draw)} stroke={C.ink} strokeWidth={2.2}
            strokeDasharray={perim} strokeDashoffset={perim * (1 - draw)} />
          {/* the fridge's freezer line, handles and feet */}
          <g opacity={draw * fridgeOnly}>
            <line x1={FR.x} y1={720} x2={FR.x + FR.w} y2={720} stroke={C.ink} strokeWidth={1.8} />
            <line x1={FR.x + 34} y1={500} x2={FR.x + 34} y2={640} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
            <line x1={FR.x + 34} y1={770} x2={FR.x + 34} y2={960} stroke={C.ink} strokeWidth={5} strokeLinecap="round" />
            <line x1={FR.x + 40} y1={FR.y + FR.h} x2={FR.x + 40} y2={FR.y + FR.h + 22} stroke={C.ink} strokeWidth={2} />
            <line x1={FR.x + FR.w - 40} y1={FR.y + FR.h} x2={FR.x + FR.w - 40} y2={FR.y + FR.h + 22} stroke={C.ink} strokeWidth={2} />
          </g>
          {/* the phone's island and home bar */}
          <g opacity={phoneOnly}>
            <rect x={540 - 58} y={PH.y + 22} width={116} height={30} rx={15} fill={C.ink} />
            <rect x={540 - 70} y={PH.y + PH.h - 26} width={140} height={6} rx={3} fill={rgba(C.ink, 0.5)} />
          </g>
        </svg>
        {/* the notes: stuck on the door, then rows in the phone */}
        {Array.from({length: n}, (_, i) => {
          const [nx, ny, nr] = NOTE[+i];
          const f0 = peel + i * 5;
          const t = prog(frame, f0, 24, ease.camera);
          const lift = Math.sin(Math.PI * t) * 34;
          // a small flutter on chunk 1 for the top note
          const flutter = i === 1 ? Math.sin(Math.max(0, frame - pull) / 4) * 3 * (1 - prog(frame, pull, 26)) : 0;
          const cx = lerp(nx, 540, t);
          const cy = lerp(ny, RY0 + i * RSTEP, t) - lift;
          const nw = i === 4 ? 330 : NW;
          const w = lerp(nw, RW, t);
          const h = lerp(NH, RH, t);
          const rot = lerp(nr + flutter, 0, t);
          const appear = i === 0 && ctx.index === 0 ? 1 : spr(frame, e + 6 + i * 3, 'enter');
          const land = frame >= f0 + 24 ? spr(frame, f0 + 24, 'land') : 0;
          const label = mtav(t < 0.5 ? notes[+i] : rows[+i]);
          const size = t < 0.5 ? fit(label, 34, 34, nw - 34) : fit(label, 34, 34, RW - 100);
          const swap = t < 0.5 ? 1 - prog(t, 0.3, 0.2, (x) => x) : prog(t, 0.5, 0.2, (x) => x);
          return (
            <div key={i} style={{position: 'absolute', left: cx - w / 2, top: cy - h / 2, width: w, height: h, opacity: appear,
              transform: `rotate(${rot}deg) scale(${lerp(0.9, 1, appear)})`}}>
              <div style={{position: 'absolute', inset: 0, borderRadius: lerp(4, 18, t), backgroundColor: C.surface,
                border: `1.6px solid ${rgba(C.ink, lerp(0.55, 0.28, t))}`, boxShadow: `0 ${lerp(10, 2, t)}px ${lerp(18, 6, t)}px ${rgba(C.shade, 0.16)}`}} />
              {/* the magnet that held it */}
              <div style={{position: 'absolute', left: w / 2 - 11, top: -9, width: 22, height: 22, borderRadius: 11, backgroundColor: C.ink, opacity: 1 - prog(t, 0, 0.25, (x) => x)}} />
              <div className={TXT} style={{position: 'absolute', left: t < 0.5 ? 0 : 26, right: t < 0.5 ? 0 : 70, top: 0, bottom: 0, display: 'flex',
                alignItems: 'center', justifyContent: t < 0.5 ? 'center' : 'flex-start', fontFamily: F.sans, fontWeight: 600, fontSize: size,
                color: C.ink, opacity: swap, whiteSpace: 'nowrap'}}>
                {label}
              </div>
              {/* the check once it lands */}
              <svg width={40} height={40} style={{position: 'absolute', right: 20, top: h / 2 - 20, opacity: land}}>
                <circle cx={20} cy={20} r={17} fill="none" stroke={toneBig('up')} strokeWidth={2.2} />
                <path d="M 12 20.5 L 18 26 L 28 14" fill="none" stroke={toneBig('up')} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"
                  strokeDasharray={24} strokeDashoffset={24 * (1 - land)} />
              </svg>
            </div>
          );
        })}
      </div>
      <Sfx name="asmr-pencil" at={base + 2} volume={0.3} />
      <Sfx name="asmr-air-long" at={pull} volume={0.3} />
      {Array.from({length: n}, (_, i) => (
        <React.Fragment key={i}>
          <Sfx name="asmr-paper" at={peel + i * 5} volume={0.32 * vary(i)} />
          {i % 2 === 0 ? <Sfx name="asmr-check" at={peel + i * 5 + 25} volume={0.34 * vary(i + 7)} /> : null}
        </React.Fragment>
      ))}
      <Sfx name="asmr-land" at={lastLand} volume={0.45} />
      <Haptic kind="light" at={peel} />
      <Haptic kind="success" at={lastLand} />
    </PictureBand>
  );
};
