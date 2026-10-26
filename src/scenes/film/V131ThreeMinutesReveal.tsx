// V131ThreeMinutesReveal: the track ahead and the rule that took the race. One export, a "shot" each beat:
//   THE TRACK (look "illustrated", full bleed): the track ahead from the seat, the light cowl along the foot
//     road   the kerbs and the centre line streaming at race speed
//     flag   two years on: the chequered flag waving over the track, the punch word landing on hitAt
//   THE RULE (look "diagram", the clean field):
//     sand   an hourglass of six minutes; the sand runs out on hitAt
//     lap    the last lap as one thick bar, the marker short of the flag when time is up, the rest of it turning red
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  shot?: 'road' | 'flag' | 'sand' | 'lap';
  hitAt?: number | string;
  line?: string;
};

const HORIZON = 640;
const FOOT = 1290;

const Track: React.FC<{run: number; flag: number; frame: number}> = ({run, flag, frame}) => {
  const depth = FOOT - HORIZON;
  const dashes = [];
  for (let i = 0; i < 9; i++) {
    const z = (((i / 9 + run) % 1) + 1) % 1;
    const y = HORIZON + depth * z * z;
    const h = 6 + 70 * z * z;
    const w = 3 + 22 * z * z;
    dashes.push(<rect key={i} x={540 - w / 2} y={y} width={w} height={h} fill={C.bg} opacity={0.9} />);
  }
  const kerbs = [];
  for (let i = 0; i < 14; i++) {
    const z0 = (((i / 14 + run * 1.4) % 1) + 1) % 1;
    const z1 = Math.min(1, z0 + 1 / 28);
    const y0 = HORIZON + depth * z0 * z0;
    const y1 = HORIZON + depth * z1 * z1;
    for (const side of [-1, 1]) {
      const x0 = 540 + side * (40 + 760 * z0 * z0);
      const x1 = 540 + side * (40 + 760 * z1 * z1);
      const k0 = 540 + side * (40 + 860 * z0 * z0);
      const k1 = 540 + side * (40 + 860 * z1 * z1);
      kerbs.push(<path key={`${i}${side}`} d={`M${x0} ${y0} L${k0} ${y0} L${k1} ${y1} L${x1} ${y1} Z`} fill={i % 2 ? C.ink : C.bg} />);
    }
  }
  const wave = (x: number) => 10 * Math.sin(frame / 5 + x / 40);
  return (
    <g>
      <rect x={-400} y={-400} width={1880} height={HORIZON + 400} fill={C.bg} />
      <rect x={-400} y={HORIZON - 120} width={1880} height={120} fill={rgba(C.ink, 0.05)} />
      <path d={`M-400 ${HORIZON} L-400 ${HORIZON - 40} Q-200 ${HORIZON - 90} 0 ${HORIZON - 50} Q160 ${HORIZON - 100} 330 ${HORIZON - 46} Q470 ${HORIZON - 80} 600 ${HORIZON - 40} Q760 ${HORIZON - 96} 900 ${HORIZON - 50} Q1100 ${HORIZON - 90} 1480 ${HORIZON - 44} L1480 ${HORIZON} Z`} fill={rgba(C.ink, 0.2)} />
      <rect x={-400} y={HORIZON} width={1880} height={depth + 1200} fill={rgba(C.ink, 0.1)} />
      <path d={`M500 ${HORIZON} L580 ${HORIZON} L${540 + 820} ${FOOT} L${540 - 820} ${FOOT} Z`} fill={rgba(C.ink, 0.32)} />
      {kerbs}
      {dashes}
      {flag > 0 ? (
        <g opacity={flag} transform={`translate(0 ${(1 - flag) * 60})`}>
          <rect x={348} y={250} width={12} height={300} rx={6} fill={C.ink} />
          {Array.from({length: 6}, (_, c) =>
            Array.from({length: 4}, (_, r) => (
              <rect key={`${c}${r}`} x={360 + c * 56} y={258 + r * 50 + wave(c * 56)} width={56} height={50} fill={(c + r) % 2 ? C.bg : C.ink} />
            )),
          )}
          <rect x={360} y={256 + wave(0)} width={336} height={6} fill={C.ink} />
        </g>
      ) : null}
    </g>
  );
};

/** The track ahead: the camera low in the seat, the cowl along the foot, the pillars at the top corners. */
const Ahead: React.FC<{p: P; ctx: SceneCtx; flagShot: boolean}> = ({p, ctx, flagShot}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(frame, e, 'enterXL');
  const kick = useKick();
  const speed = flagShot ? 0.5 : 1;
  const run = frame * 0.022 * speed;
  const flag = flagShot ? spr(frame, hit - 6, 'land') : 0;
  const shake = 1.4 * Math.sin(frame * 2.3) * speed;
  const cowl = 'M-400 1300 Q540 1236 1480 1300 L1480 2400 L-400 2400 Z';
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={`translate(540 ${HORIZON}) scale(${(1.02 + 0.02 * appear + 0.01 * kick).toFixed(4)}) translate(-540 ${-HORIZON})`}>
            <Track run={run} flag={flag} frame={frame} />
          </g>
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={`translate(${shake.toFixed(2)} 0)`}>
            <path d={cowl} fill={C.bg} />
            <path d={cowl} fill={rgba(C.ink, 0.1)} />
            <path d="M-400 1300 Q540 1236 1480 1300" fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={6} />
            <path d="M-400 -400 L120 -400 L-20 900 L-400 900 Z" fill={rgba(C.ink, 0.86)} />
            <path d="M1480 -400 L960 -400 L1100 900 L1480 900 Z" fill={rgba(C.ink, 0.86)} />
          </g>
        </svg>
      </CameraLayer>
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 880, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        </Hud>
      ) : null}
      {flagShot ? <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.25} /> : <Sfx name="real-pass-by" at={Math.max(base, e)} volume={0.35} />}
      <Land at={hit} />
      <Haptic kind={flagShot ? 'success' : 'rigid'} at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const TOP_BULB = 'M384 470 L696 470 Q696 650 556 772 L524 772 Q384 650 384 470 Z';
const LOW_BULB = 'M524 792 L556 792 Q696 914 696 1094 L384 1094 Q384 914 524 792 Z';

/** The six minutes: an hourglass on the clean field, the sand gone on hitAt. */
const Sand: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/:/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 20, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const k = prog(frame, e, Math.max(1, hit - e), ease.drift);
  const topY = 540 + (772 - 540) * k;
  const lowY = 1094 - (1094 - 900) * k;
  const tip = 6 * prog(frame, hit, 10, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `translateY(24px) rotate(${tip.toFixed(2)}deg) scale(${(0.94 + 0.06 * appear + 0.015 * kick).toFixed(4)})`, transformOrigin: '540px 800px'}}>
          <defs>
            <clipPath id={`${uid}t`}>
              <path d={TOP_BULB} />
            </clipPath>
            <clipPath id={`${uid}b`}>
              <path d={LOW_BULB} />
            </clipPath>
          </defs>
          <rect x={330} y={430} width={420} height={36} rx={12} fill={C.ink} />
          <rect x={330} y={1098} width={420} height={36} rx={12} fill={C.ink} />
          <rect x={344} y={466} width={14} height={632} rx={7} fill={C.ink} />
          <rect x={722} y={466} width={14} height={632} rx={7} fill={C.ink} />
          <g clipPath={`url(#${uid}t)`}>
            <rect x={380} y={topY} width={320} height={772 - topY + 2} fill={C.ink2} />
          </g>
          <g clipPath={`url(#${uid}b)`}>
            <path d={`M380 1100 L380 ${lowY + 60} Q540 ${lowY - 40} 700 ${lowY + 60} L700 1100 Z`} fill={C.ink2} />
          </g>
          {k < 1 ? <line x1={540} y1={772} x2={540} y2={lowY + 10} stroke={C.ink2} strokeWidth={6} /> : null}
          <path d={TOP_BULB} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          <path d={LOW_BULB} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        </svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, width: 1080, top: 1200, textAlign: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*6:00*'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      <Sfx name="asmr-air" at={Math.max(base, e + 2)} volume={0.2} />
      <Sfx name="asmr-strike" at={Math.max(base, hit)} volume={0.32} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** The last lap as one bar: the marker crawls, the time is up before the flag, the rest of the lap turns red. */
const Lap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.4s'));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const mark = 0.55 + 0.27 * prog(frame, e, Math.max(1, hit - e), ease.enter) + 0.05 * prog(frame, hit, 50);
  const x0 = 170;
  const x1 = 830;
  const mx = x0 + (x1 - x0) * mark;
  const late = prog(frame, hit, 8);
  const cy = 820;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.94 + 0.06 * appear + 0.02 * kick).toFixed(4)})`, transformOrigin: `540px ${cy}px`}}>
          <rect x={x0} y={cy - 20} width={x1 - x0} height={40} rx={20} fill={rgba(C.ink, 0.14)} />
          <rect x={mx} y={cy - 20} width={Math.max(0, x1 - mx)} height={40} rx={20} fill={toneLine('down')} opacity={late} />
          <rect x={x0} y={cy - 20} width={mx - x0} height={40} rx={20} fill={C.ink} />
          <path d={`M${mx - 30} ${cy - 46} L${mx + 34} ${cy} L${mx - 30} ${cy + 46} Z`} fill={C.ink} />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={x1 + 20 + c * 24} y={cy - 150 + r * 24} width={24} height={24} fill={(r + c) % 2 ? C.bg : C.ink} />),
          )}
          <rect x={x1 + 18} y={cy - 152} width={76} height={100} fill="none" stroke={C.ink} strokeWidth={4} />
          <rect x={x1 + 12} y={cy - 152} width={8} height={176} fill={C.ink} />
        </svg>
      </CameraLayer>
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 560, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={96} />
          </div>
        </Hud>
      ) : null}
      <Sfx name="asmr-haptic-error" at={Math.max(base, hit)} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V131ThreeMinutesReveal: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const shot = p.shot ?? 'sand';
  if (shot === 'lap') return <Lap p={p} ctx={ctx} />;
  if (shot === 'road' || shot === 'flag') return <Ahead p={p} ctx={ctx} flagShot={shot === 'flag'} />;
  return <Sand p={p} ctx={ctx} />;
};
