// v117-wheel-swap: the wheel change as one diagram that moves on step by step. A wheel seen face-on (the tyre, the rim,
// five nuts) with a lug wrench on its top nut: lifted, the wrench turns the whole wheel with it (the problem); on the
// ground only the nut gives (step 1); the jack lifts the sill and the space under it turns into a no-go zone (step 2);
// from above, the diagonal wheel gets a stone (the chock); the nuts tighten in a star, numbered as they land (step 3);
// after the first kilometres the nuts settle and are tightened again (step 4); the recap holds the finished wheel.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT, OBJ} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {Car, carBox} from '../illo/car';
import type {SceneCtx} from '../../types';

type Step = 'hook' | 'loosen' | 'lift' | 'chock' | 'star' | 'settle' | 'recap' | 'wedge';
type P = {step?: Step; hitAt?: number | string; at?: number | string; line?: string; label?: string};

const GROUND = 1090;
const TYRE = 255;
const RIM = 168;
const PITCH = 96;
const NUT = 24;
const STAR = [0, 2, 4, 1, 3];

const nutAt = (cx: number, cy: number, k: number, rot: number) => {
  const a = ((-90 + 72 * k + rot) * Math.PI) / 180;
  return {x: cx + Math.cos(a) * PITCH, y: cy + Math.sin(a) * PITCH};
};

const hexPts = (x: number, y: number, r: number, turn: number) =>
  Array.from({length: 6}, (_, i) => {
    const a = ((60 * i + turn) * Math.PI) / 180;
    return `${(x + Math.cos(a) * r).toFixed(1)},${(y + Math.sin(a) * r).toFixed(1)}`;
  }).join(' ');

/** The wheel face-on: tyre with tread blocks, rim, spokes, hub and five nuts. `rot` turns the whole wheel. */
const Wheel: React.FC<{cx: number; cy: number; rot: number; nutTurn?: number; hot?: number; lit?: number[]; litCol?: string}> = ({cx, cy, rot, nutTurn = 0, hot = -1, lit = [], litCol}) => {
  const acc = toneLine('a');
  return (
    <g>
      <circle cx={cx} cy={cy} r={TYRE} fill={rgba(C.ink, 0.86)} />
      {Array.from({length: 36}, (_, i) => {
        const a = ((i * 10 + rot) * Math.PI) / 180;
        return <line key={i} x1={cx + Math.cos(a) * (TYRE - 30)} y1={cy + Math.sin(a) * (TYRE - 30)} x2={cx + Math.cos(a) * (TYRE - 4)} y2={cy + Math.sin(a) * (TYRE - 4)} stroke={rgba(C.bg, 0.22)} strokeWidth={5} strokeLinecap="round" />;
      })}
      <circle cx={cx} cy={cy} r={RIM + 14} fill={C.surface} stroke={C.ink} strokeWidth={5} />
      <circle cx={cx} cy={cy} r={RIM - 10} fill="none" stroke={C.rule} strokeWidth={4} />
      {Array.from({length: 5}, (_, k) => {
        const a = ((-54 + 72 * k + rot) * Math.PI) / 180;
        const b = ((-54 + 72 * k + rot + 22) * Math.PI) / 180;
        const c = ((-54 + 72 * k + rot - 22) * Math.PI) / 180;
        return (
          <polygon key={k} points={`${cx + Math.cos(a) * 70},${cy + Math.sin(a) * 70} ${cx + Math.cos(b) * (RIM - 18)},${cy + Math.sin(b) * (RIM - 18)} ${cx + Math.cos(c) * (RIM - 18)},${cy + Math.sin(c) * (RIM - 18)}`} fill={rgba(C.ink, 0.14)} stroke={C.ink2} strokeWidth={3} strokeLinejoin="round" />
        );
      })}
      <circle cx={cx} cy={cy} r={PITCH + 36} fill="none" stroke={C.rule} strokeWidth={3} />
      <circle cx={cx} cy={cy} r={40} fill={C.surface} stroke={C.ink} strokeWidth={5} />
      {Array.from({length: 5}, (_, k) => {
        const n = nutAt(cx, cy, k, rot);
        const on = lit.indexOf(k) >= 0;
        const col = k === hot ? acc : on ? litCol ?? acc : C.ink2;
        return <polygon key={k} points={hexPts(n.x, n.y, NUT, rot + (k === hot ? nutTurn : 0))} fill={k === hot || on ? col : C.surface} stroke={k === hot || on ? col : C.ink} strokeWidth={5} strokeLinejoin="round" />;
      })}
    </g>
  );
};

/** The lug wrench on the top nut: a socket, an arm out to the right, a grip. `turn` in degrees (negative = anticlockwise). */
const Wrench: React.FC<{x: number; y: number; turn: number}> = ({x, y, turn}) => (
  <g transform={`rotate(${turn.toFixed(2)} ${x} ${y})`}>
    <circle cx={x} cy={y} r={NUT + 12} fill="none" stroke={C.ink} strokeWidth={9} />
    <line x1={x + NUT + 10} y1={y} x2={x + 270} y2={y} stroke={C.ink} strokeWidth={16} strokeLinecap="round" />
    <line x1={x + 210} y1={y} x2={x + 270} y2={y} stroke={toneLine('b')} strokeWidth={22} strokeLinecap="round" />
  </g>
);

/** A curved arrow round (cx, cy) from a0 to a1 degrees, drawn on to `k`. */
const Arc: React.FC<{cx: number; cy: number; r: number; a0: number; a1: number; k: number; col: string}> = ({cx, cy, r, a0, a1, k, col}) => {
  if (k <= 0.01) return null;
  const a = a0 + (a1 - a0) * k;
  const p = (d: number) => ({x: cx + Math.cos((d * Math.PI) / 180) * r, y: cy + Math.sin((d * Math.PI) / 180) * r});
  const s = p(a0);
  const e = p(a);
  const big = Math.abs(a - a0) > 180 ? 1 : 0;
  const sweep = a > a0 ? 1 : 0;
  const dir = a > a0 ? 1 : -1;
  const h1 = p(a - dir * 9);
  const tip = {x: e.x, y: e.y};
  const ox = (h1.x - cx) / r;
  const oy = (h1.y - cy) / r;
  return (
    <g>
      <path d={`M ${s.x} ${s.y} A ${r} ${r} 0 ${big} ${sweep} ${e.x} ${e.y}`} fill="none" stroke={col} strokeWidth={8} strokeLinecap="round" />
      <polygon points={`${tip.x},${tip.y} ${h1.x + ox * 18},${h1.y + oy * 18} ${h1.x - ox * 18},${h1.y - oy * 18}`} fill={col} />
    </g>
  );
};

/** The side of the car round the wheel: the sill, the arch, a scissor jack under the sill at the left. */
const Body: React.FC<{cy: number; jack: number; zone: number; uid: string}> = ({cy, jack, zone, uid}) => {
  const sill = cy + 46;
  const cx = 620;
  const archR = TYRE + 40;
  const roofY = cy - 330;
  const jx = 175;
  const jh = Math.max(40, GROUND - sill);
  const half = 46 - 18 * (1 - Math.min(1, jh / 160));
  const red = toneLine('down');
  return (
    <g>
      <path d={`M 150 ${sill} L ${cx - archR} ${sill} A ${archR} ${archR} 0 0 1 ${cx + archR} ${sill} L 945 ${sill} L 945 ${roofY + 90} Q 945 ${roofY} 860 ${roofY} L 230 ${roofY} Q 150 ${roofY} 150 ${roofY + 90} Z`} fill={rgba(C.ink, 0.06)} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
      {zone > 0.01 ? (
        <g opacity={zone}>
          <clipPath id={`${uid}z`}>
            <rect x={256} y={sill + 6} width={64} height={Math.max(0, GROUND - sill - 6)} />
          </clipPath>
          <g clipPath={`url(#${uid}z)`}>
            <rect x={256} y={sill + 6} width={64} height={400} fill={rgba(red, 0.12)} />
            {Array.from({length: 14}, (_, i) => (
              <line key={i} x1={200} y1={sill - 40 + i * 30} x2={360} y2={sill + 120 + i * 30} stroke={red} strokeWidth={4} />
            ))}
          </g>
          <rect x={256} y={sill + 6} width={64} height={Math.max(0, GROUND - sill - 6)} fill="none" stroke={red} strokeWidth={4} />
        </g>
      ) : null}
      <g opacity={jack}>
        <rect x={jx - 70} y={GROUND - 16} width={140} height={16} rx={4} fill={C.ink} />
        <rect x={jx - 34} y={sill} width={68} height={12} rx={3} fill={C.ink} />
        <polyline points={`${jx - half},${GROUND - 16} ${jx},${GROUND - 16 - (jh - 28) / 2} ${jx - half},${sill + 12}`} fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        <polyline points={`${jx + half},${GROUND - 16} ${jx},${GROUND - 16 - (jh - 28) / 2} ${jx + half},${sill + 12}`} fill="none" stroke={C.ink} strokeWidth={8} strokeLinejoin="round" />
        <circle cx={jx} cy={GROUND - 16 - (jh - 28) / 2} r={9} fill={toneLine('a')} />
      </g>
    </g>
  );
};

/** The car from above, the front up: one corner lifted, the diagonal wheel chocked with a stone. */
const TopView: React.FC<{k: number; chock: number; uid: string; frame: number}> = ({k, chock, uid, frame}) => {
  const acc = toneLine('a');
  const cx = 540;
  const cy = 820;
  const box = carBox('top', 'suv', 700);
  const x0 = cx - box.w / 2;
  const y0 = cy - box.h / 2;
  const lifted = {x: x0 - 30, y: y0 + box.h * 0.17};
  const diag = {x: x0 + box.w + 6, y: y0 + box.h * 0.66};
  const stoneY = diag.y + 112 + 26;
  return (
    <g>
      <Car uid={`${uid}c`} x={cx} y={cy} len={700} view="top" body="suv" paint="a" heading={0} frame={frame} speed={0} />
      <g opacity={k}>
        <line x1={lifted.x - 40} y1={lifted.y + 52} x2={lifted.x - 40} y2={lifted.y + 52 - 70 * k} stroke={acc} strokeWidth={8} strokeLinecap="round" />
        <polygon points={`${lifted.x - 40},${lifted.y - 30 - 70 * k + 60} ${lifted.x - 58},${lifted.y - 4 - 70 * k + 60} ${lifted.x - 22},${lifted.y - 4 - 70 * k + 60}`} fill={acc} />
      </g>
      <line x1={lifted.x + 24} y1={lifted.y + 52} x2={lifted.x + 24 + (diag.x - lifted.x) * chock} y2={lifted.y + 52 + (diag.y - lifted.y) * chock} stroke={C.ink2} strokeWidth={4} strokeDasharray="14 12" opacity={0.7 * chock} />
      <g opacity={chock} transform={`translate(0 ${(-40 * (1 - chock)).toFixed(1)})`}>
        <polygon points={`${diag.x - 6},${stoneY + 34} ${diag.x + 6},${stoneY - 4} ${diag.x + 40},${stoneY - 10} ${diag.x + 58},${stoneY + 30}`} fill={toneLine('b')} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
      </g>
    </g>
  );
};

export const V117WheelSwap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const step: Step = p.step ?? 'loosen';
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const k = prog(frame, hit - 6, 16, ease.enter);
  const red = toneLine('down');
  const green = toneLine('up');
  const acc = toneLine('a');

  let picture: React.ReactNode = null;
  if (step === 'chock') {
    picture = <TopView k={prog(frame, e, 18, ease.enter)} chock={k} uid={uid} frame={frame} />;
  } else if (step === 'star') {
    const t0 = hit - 4;
    const order = STAR.map((n, i) => ({n, on: prog(frame, t0 + i * 9, 8, ease.enter)}));
    const lit = order.filter((o) => o.on > 0.5).map((o) => o.n);
    const cx = 540;
    const cy = 800;
    const pts = order.map((o) => nutAt(cx, cy, o.n, 0));
    const scale = 1.42;
    picture = (
      <g transform={`translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})`}>
        <Wheel cx={cx} cy={cy} rot={0} lit={lit} />
        {pts.slice(1).map((q, i) => {
          const j = (i | 0) + 1;
          const f = order[j].on;
          const a = pts[+i];
          return f > 0 ? <line key={i} x1={a.x} y1={a.y} x2={a.x + (q.x - a.x) * f} y2={a.y + (q.y - a.y) * f} stroke={acc} strokeWidth={5} strokeLinecap="round" /> : null;
        })}
      </g>
    );
  } else {
    const lifted = step === 'hook' ? 1 : step === 'lift' ? prog(frame, hit - 8, 20, ease.enter) : 0;
    const cy = GROUND - TYRE - 70 * lifted;
    const cx = 620;
    const nut = nutAt(cx, cy, 0, 0);
    // the hook: the wrench drags the lifted wheel round with it; step 1: on the ground only the nut gives
    const pre = step === 'hook' ? -10 * prog(frame, 1, 14, ease.enter) : 0; // the hook moves from its first frames
    const swing = step === 'hook' || step === 'loosen' ? pre - (38 + pre) * k : 0;
    const wheelRot = step === 'hook' ? swing : 0;
    const settle = step === 'settle';
    const lit = settle ? (k > 0.5 ? [0, 1, 2, 3, 4] : []) : step === 'recap' ? [0, 1, 2, 3, 4] : [];
    const showWrench = step === 'hook' || step === 'loosen' || (settle && k > 0 && k < 1);
    const wr = settle ? 30 * Math.sin(Math.PI * k) : swing;
    picture = (
      <g>
        <line x1={110} y1={GROUND} x2={970} y2={GROUND} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
        {step === 'lift' || step === 'hook' ? <Body cy={cy} jack={step === 'hook' ? 1 : prog(frame, e, 14)} zone={step === 'lift' ? prog(frame, hit + 10, 14, ease.enter) : 0} uid={uid} /> : null}
        <g transform={step === 'hook' ? `rotate(${wheelRot.toFixed(2)} ${cx} ${cy})` : undefined}>
          <Wheel cx={cx} cy={cy} rot={0} nutTurn={step === 'loosen' ? swing : 0} hot={step === 'loosen' || step === 'hook' ? 0 : -1} lit={lit} litCol={settle ? green : acc} />
          {step === 'hook' ? <Wrench x={nut.x} y={nut.y} turn={0} /> : null}
        </g>
        {showWrench && step !== 'hook' ? <Wrench x={nut.x} y={nut.y} turn={wr} /> : null}
        {step === 'hook' ? <Arc cx={cx} cy={cy} r={TYRE + 34} a0={-30} a1={-120} k={k} col={red} /> : null}
        {step === 'loosen' ? <Arc cx={nut.x} cy={nut.y} r={74} a0={-20} a1={-150} k={k} col={green} /> : null}
        {settle ? <Arc cx={cx} cy={cy} r={PITCH + 70} a0={-150} a1={20} k={k} col={green} /> : null}
        {step === 'wedge' ? (
          <g transform={`translate(${(-260 * (1 - k)).toFixed(1)} 0)`} opacity={Math.min(1, 0.2 + k)}>
            <polygon points={`${cx - 300},${GROUND} ${cx - 284},${GROUND - 70} ${cx - 236},${GROUND - 96} ${cx - 186},${GROUND - 36} ${cx - 176},${GROUND}`} fill={toneLine('b')} stroke={C.ink} strokeWidth={5} strokeLinejoin="round" />
          </g>
        ) : null}
        {step === 'recap' ? <circle cx={cx} cy={cy} r={TYRE + 22 + 10 * kick} fill="none" stroke={rgba(acc, 0.25 + 0.5 * k)} strokeWidth={6} /> : null}
      </g>
    );
  }

  const label = p.label;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.95 + 0.05 * appear + 0.012 * kick).toFixed(4)})`, transformOrigin: '540px 820px'}}>
          {picture}
        </svg>
      </CameraLayer>
      <Hud>
        {label ? <MonoLabel text={label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top - 30}} /> : null}
        {step === 'star' ? (
          <div className={TXT} style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 1920}}>
            {STAR.map((n, i) => {
              const q = nutAt(540, 800, n, 0);
              const o = prog(frame, hit - 4 + i * 9, 8, ease.enter);
              const dx = (q.x - 540) * 1.42 * 1.55;
              const dy = (q.y - 800) * 1.42 * 1.55;
              return (
                <div key={i} style={{position: 'absolute', left: 540 + dx - 30, top: 800 + dy - 30, width: 60, height: 60, borderRadius: 30, backgroundColor: C.ink, color: C.bg, font: `700 40px ${F.sans}`, display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: o, transform: `scale(${(0.6 + 0.4 * o).toFixed(3)})`}}>
                  {mtav(String(i + 1))}
                </div>
              );
            })}
          </div>
        ) : null}
      </Hud>
      {p.line ? (
        <div style={{position: 'absolute', left: L.camSafe.left, top: 1200, whiteSpace: 'nowrap'}}>
          <Words text={p.line} at={hit} fx="slam" size={78} />
        </div>
      ) : null}
      <Sfx name={step === 'star' ? 'asmr-tick-fine' : 'asmr-knock'} at={Math.max(base, hit)} volume={0.3} />
      <Land at={hit + 4} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
