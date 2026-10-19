// src/scenes/film/V110GudauriPass.tsx: the Gudauri road, the signal gone, the voice still there (v110-gudauri-pass).
// A snowy pass drawn as its own world: far white ranges, a switchback road climbing a near slope, a cell mast on the ridge.
//   mode "pass":  wide, the accent SUV climbs the lowest bend; the phone's signal bars fall one by one, the mast's waves go out,
//                 and on hitAt the bars are crossed and the punch lands.
//   mode "fork":  pushed into the upper bend where the road splits: the SUV waits at the fork, a question pops over it.
//   mode "voice": the SUV near the top, the bars still crossed, yet a white turn card rises out of the car, a voice wave moving.
//   mode "step":  one how-to step (the promo kit's StepShot) on a real screen.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, F, L, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car} from '../illo/car';
import {Snow} from '../illo/fx';
import {tone} from '../illo/palette';
import {IlloBand, Svg, TOP, FOOT} from '../illo/scene';
import {Sym} from '../kit/icons';
import {StepShot} from '../kit/explain';

type P = {
  look?: 'illustrated' | 'diagram';
  mode?: 'pass' | 'fork' | 'voice' | 'step';
  hitAt?: number | string;
  line?: string;
  dist?: string;
  src?: string;
  step?: number;
  verb?: string;
  row?: {x?: number; y: number; w?: number; h: number};
};

// the road: four runs joined by hairpins, nearest (widest) first; stage px
const RUNS = [
  {x0: -140, y0: 1262, x1: 250, y1: 1238, w: 120},
  {x0: 250, y0: 1238, x1: 860, y1: 1062, w: 82},
  {x0: 860, y0: 1062, x1: 340, y1: 936, w: 56},
  {x0: 340, y0: 936, x1: 600, y1: 842, w: 38},
];

const FAR_PEAKS = [
  [-120, 980], [60, 700], [180, 790], [330, 560], [470, 720], [600, 610], [760, 760], [900, 590], [1060, 740], [1220, 980],
];
const MID_PEAKS = [
  [-140, 1120], [40, 860], [210, 960], [380, 820], [560, 900], [720, 760], [900, 880], [1060, 800], [1240, 1120],
];

const path = (pts: number[][], foot: number) => {
  let d = `M${pts[0][0]},${foot}`;
  let lx = 0;
  for (let i = 0; i < pts.length; i++) {
    d += ` L${pts[+i][0]},${pts[+i][1]}`;
    lx = pts[+i][0];
  }
  return `${d} L${lx},${foot} Z`;
};

// the snow cap of a peak: a small triangle under its tip
const caps = (pts: number[][], depth: number) => {
  const out: string[] = [];
  for (let i = 1; i < pts.length - 1; i++) {
    const [x, y] = pts[+i];
    const [lx, ly] = pts[+(i - 1)];
    const [rx, ry] = pts[+(i + 1)];
    if (ly - y < 80 || ry - y < 80) continue;
    const kl = depth / (ly - y);
    const kr = depth / (ry - y);
    out.push(`M${x},${y} L${x + (lx - x) * kl},${y + depth} L${x + (lx - x) * kl * 0.4},${y + depth * 0.72} L${x},${y + depth * 0.9} L${x + (rx - x) * kr * 0.5},${y + depth * 0.7} L${x + (rx - x) * kr},${y + depth} Z`);
  }
  return out.join(' ');
};

const runAt = (i: number, k: number) => {
  const r = RUNS[+i];
  return {x: r.x0 + (r.x1 - r.x0) * k, y: r.y0 + (r.y1 - r.y0) * k, w: r.w};
};

/** the signal bars in a white card (HUD): `left` bars still lit (0..4, fractional fades the next), `cross` 0..1 */
const Bars: React.FC<{x: number; y: number; left: number; cross: number; k: number}> = ({x, y, left, cross, k}) => {
  const bars = [0, 1, 2, 3];
  return (
    <div style={{position: 'absolute', left: x, top: y, width: 200, height: 150, borderRadius: 36, backgroundColor: C.surface, boxShadow: `0 18px 44px ${rgba(C.shade, 0.16)}`, opacity: k, transform: `translateY(${((1 - k) * 24).toFixed(1)}px)`}}>
      <svg width={200} height={150} style={{position: 'absolute', inset: 0}}>
        {bars.map((i) => {
          const h = 26 + i * 20;
          const on = Math.max(0, Math.min(1, left - i));
          return <rect key={i} x={46 + i * 30} y={112 - h} width={20} height={h} rx={6} fill={on > 0.01 ? rgba(C.ink, 0.15 + 0.85 * on) : rgba(C.ink, 0.15)} />;
        })}
        {cross > 0 ? (
          <g stroke={C.ink} strokeWidth={9} strokeLinecap="round" opacity={cross}>
            <line x1={52} y1={34} x2={52 + 98 * cross} y2={34 + 82 * cross} />
          </g>
        ) : null}
      </svg>
    </div>
  );
};

const Mast: React.FC<{x: number; y: number; waves: number; frame: number}> = ({x, y, waves, frame}) => {
  const ink = tone(6);
  const arcs = [1, 2, 3];
  return (
    <g>
      <path d={`M${x - 34},${y} L${x},${y - 150} L${x + 34},${y} M${x - 22},${y - 50} L${x + 22},${y - 50} M${x - 12},${y - 100} L${x + 12},${y - 100} M${x - 22},${y - 50} L${x + 12},${y - 100} M${x + 22},${y - 50} L${x - 12},${y - 100}`} fill="none" stroke={ink} strokeWidth={5} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={x} cy={y - 156} r={9} fill={ink} />
      {arcs.map((i) => {
        const r = 26 + i * 24 + 4 * Math.sin(frame / 8 + i);
        const a = Math.max(0, Math.min(1, waves * 3 - (i - 1))) * (0.85 - i * 0.18);
        return a > 0.01 ? (
          <g key={i} fill="none" stroke={ink} strokeWidth={5} strokeLinecap="round" opacity={a}>
            <path d={`M${x - r * 0.7},${y - 156 - r * 0.7} A${r},${r} 0 0 0 ${x - r * 0.7},${y - 156 + r * 0.7}`} />
            <path d={`M${x + r * 0.7},${y - 156 - r * 0.7} A${r},${r} 0 0 1 ${x + r * 0.7},${y - 156 + r * 0.7}`} />
          </g>
        ) : null;
      })}
    </g>
  );
};

const World: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId().replace(/:/g, '');
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const mode = p.mode ?? 'pass';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const t = Math.max(0, frame - e);
  const dur = Math.max(1, ctx.dur - e);
  const k = Math.min(1, t / dur);

  // the framing per mode: a static lens on the world (the rig moves the camera)
  const zoom = mode === 'fork' ? 1.75 : mode === 'voice' ? 1.35 : 1;
  const ox = mode === 'fork' ? 850 : mode === 'voice' ? 520 : 540;
  const oy = mode === 'fork' ? 1040 : mode === 'voice' ? 900 : 960;
  const lens: React.CSSProperties = {position: 'absolute', inset: 0, transform: `scale(${zoom})`, transformOrigin: `${ox}px ${oy}px`};

  // the car: climbing the first run (pass), waiting at the fork, or near the top (voice)
  const car =
    mode === 'fork'
      ? {...runAt(2, 0.04), dir: -1 as const, speed: 0, len: 150}
      : mode === 'voice'
        ? {...runAt(3, 0.25 + 0.35 * ease.drift(k)), dir: 1 as const, speed: 0.4, len: 170}
        : {...runAt(1, 0.2 + 0.4 * ease.drift(k)), dir: 1 as const, speed: 0.45, len: 250};
  const slope = mode === 'voice' ? -20 : mode === 'fork' ? 0 : -16;

  // the signal: four bars falling to the hit (pass), already gone elsewhere
  const left = mode === 'pass' ? 4 * (1 - prog(frame, e + 4, Math.max(8, hit - e - 6), ease.enter)) : 0;
  const cross = mode === 'pass' ? prog(frame, hit, 8, ease.enter) : 1;
  const cardIn = spr(frame, e, 'enter');

  // the fork's question and the voice's turn card
  const pop = spr(frame, hit, 'land');
  const road = tone(6);
  const shoulder = tone(4);

  const runs = RUNS.map((r, i) => (
    <g key={i}>
      <line x1={r.x0} y1={r.y0} x2={r.x1} y2={r.y1} stroke={shoulder} strokeWidth={r.w + 18} strokeLinecap="round" />
      <line x1={r.x0} y1={r.y0} x2={r.x1} y2={r.y1} stroke={road} strokeWidth={r.w} strokeLinecap="round" />
      <line x1={r.x0} y1={r.y0} x2={r.x1} y2={r.y1} stroke={tone(1)} strokeWidth={Math.max(3, r.w * 0.06)} strokeDasharray={`${r.w * 0.5} ${r.w * 0.6}`} />
    </g>
  ));
  // the branch at the fork (the upper bend): a second road leaving to the right
  const branch = (
    <g>
      <line x1={860} y1={1062} x2={1200} y2={990} stroke={shoulder} strokeWidth={74} strokeLinecap="round" />
      <line x1={860} y1={1062} x2={1200} y2={990} stroke={road} strokeWidth={56} strokeLinecap="round" />
    </g>
  );

  return (
    <IlloBand uid={uid} time="day">
      <CameraLayer depth={0.6}>
        <div style={lens}>
          <Svg>
            <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.bg} />
            <path d={path(FAR_PEAKS, 1300)} fill={tone(2)} />
            <path d={caps(FAR_PEAKS, 120)} fill={tone(0)} />
            <path d={path(MID_PEAKS, 1400)} fill={tone(3)} />
            <path d={caps(MID_PEAKS, 90)} fill={tone(1)} />
            <Mast x={890} y={780} waves={mode === 'pass' ? left / 4 : 0} frame={frame} />
          </Svg>
        </div>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={lens}>
          <Svg>
            <path d={`M-200,1010 L120,930 L420,980 L760,900 L1280,960 L1280,${FOOT} L-200,${FOOT} Z`} fill={tone(1)} />
            <path d={`M-200,1330 L1280,1290 L1280,${FOOT} L-200,${FOOT} Z`} fill={tone(0)} />
            {branch}
            {runs}
            <g transform={`rotate(${slope} ${car.x} ${car.y})`}>
              <Car uid={`${uid}c`} x={car.x} y={car.y + car.w * 0.12} len={car.len} view="side" body="suv" paint="a" caliper="b" dir={car.dir} frame={frame} time="day" speed={car.speed} lights={{head: 1, tail: 1}} />
            </g>
          </Svg>
          {mode === 'fork' ? (
            <div style={{position: 'absolute', left: car.x - 34, top: car.y - 150, width: 68, height: 68, borderRadius: 34, backgroundColor: C.surface, boxShadow: `0 8px 20px ${rgba(C.shade, 0.18)}`, transform: `scale(${pop.toFixed(3)})`, transformOrigin: '34px 68px'}}>
              <Sym name="question_mark" size={46} color={C.ink} x={34} y={34} />
            </div>
          ) : null}
        </div>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Snow frame={frame} n={46} speed={0.7} time="day" />
      </CameraLayer>
      <Hud>
        <Bars x={L.camSafe.left} y={470} left={left} cross={cross} k={cardIn} />
        {mode === 'voice' ? (
          <div
            className={TXT}
            style={{position: 'absolute', left: 300, top: 600, width: 480, height: 200, borderRadius: 44, backgroundColor: C.surface, boxShadow: `0 22px 56px ${rgba(C.shade, 0.18)}`, transform: `translateY(${((1 - pop) * 60).toFixed(1)}px) scale(${(0.9 + 0.1 * pop).toFixed(3)})`, opacity: Math.min(1, pop * 1.4), display: 'flex', alignItems: 'center', gap: 26, padding: '0 36px', boxSizing: 'border-box'}}
          >
            <Sym name="turn_right" size={110} color={C.ink} />
            <div style={{display: 'flex', flexDirection: 'column', gap: 10}}>
              <span style={{fontFamily: F.sans, fontWeight: 700, fontSize: 72, lineHeight: 1, color: C.ink}}>{mtav(p.dist ?? '300 მ')}</span>
              <svg width={200} height={40}>
                {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => {
                  const h = 8 + 26 * Math.abs(Math.sin(frame / 4 + i * 0.9)) * pop;
                  return <rect key={i} x={i * 25} y={20 - h / 2} width={12} height={h} rx={6} fill={C.ink} />;
                })}
              </svg>
            </div>
          </div>
        ) : null}
        {p.line && mode === 'pass' ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 650, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        ) : null}
      </Hud>
      {mode === 'pass' ? [0, 1, 2, 3].map((i) => <Sfx key={i} name="asmr-tick-fine" at={Math.max(base, Math.round(e + 4 + ((hit - e - 6) * (i + 0.5)) / 4))} volume={0.22} />) : null}
      {mode === 'fork' ? <Sfx name="asmr-pop" at={Math.max(base, hit)} volume={0.3} /> : null}
      {mode === 'voice' ? <Sfx name="asmr-notif" at={Math.max(base, hit)} volume={0.28} /> : null}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

const Step: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (
  <>
    <StepShot ctx={ctx} src={p.src ?? '19-nav-streets-offer'} n={p.step ?? 1} text={p.verb ?? 'ჩართე ქუჩები'} row={p.row ?? {x: 0.05, y: 0.427, w: 0.9, h: 0.088}} tapAt={p.hitAt ?? 1} liftAt={p.hitAt ?? 1} hold hand="none" x={540} w={380} foot={1300} labelY={290} />
    <Sfx name="asmr-tap" at={Math.max(lead(ctx), cueFrame(ctx, p.hitAt ?? 1))} volume={0.3} />
  </>
);

export const V110GudauriPass: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.mode === 'step' ? <Step p={p} ctx={ctx} /> : <World p={p} ctx={ctx} />);
