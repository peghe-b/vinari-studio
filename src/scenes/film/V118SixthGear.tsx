// src/scenes/film/V118SixthGear.tsx: v118's own picture, the six-speed gate seen from above (a diagram).
// Senna's gearbox, 1991: the knob climbs 1 to 6 and lands; then the other five slots slam shut and only the sixth is
// left; a rev ring that sinks towards a stall at every slow corner; the finish with the sixth glowing; then the cost
// it took (a thermometer climbing) and the trophy that barely rises.
// Props: phase gate | jam | rev | finish | heat | cup, hitAt (chunk or "1.2s"), label (a Hud word, 2 at most),
// line (the punch, "*word*").
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  phase?: 'gate' | 'jam' | 'rev' | 'finish' | 'heat' | 'cup';
  hitAt?: number | string;
  label?: string;
  line?: string;
};

const CX = 540;
const NY = 860; // the neutral bar
const TOPY = 640;
const BOTY = 1080;
const COLS = [380, 540, 700];
const SW = 22; // the slot's width

const inOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const gearXY = (g: number) => ({x: g <= 2 ? COLS[0] : g <= 4 ? COLS[1] : COLS[2],y: g % 2 === 1 ? TOPY : BOTY});
// the knob's road from 1 up to 6, through the neutral bar
const ROAD = [
  [380, 640],
  [380, 860],
  [380, 1080],
  [380, 860],
  [540, 860],
  [540, 640],
  [540, 860],
  [540, 1080],
  [540, 860],
  [700, 860],
  [700, 640],
  [700, 860],
  [700, 1080],
];
const STOPS = [0, 2, 5, 7, 10, 12]; // the road's index where each gear lands

const along = (k: number) => {
  const n = ROAD.length - 1;
  const f = Math.max(0, Math.min(1, k)) * n;
  const i = Math.min(n - 1, Math.floor(f));
  const r = f - i;
  const p0 = ROAD[+i];
  const p1 = ROAD[+i + 1];
  return {x: p0[0] + (p1[0] - p0[0]) * r, y: p0[1] + (p1[1] - p0[1]) * r};
};

const Gate: React.FC<{frame: number; e: number; hit: number; phase: string; kick: number}> = ({frame, e, hit, phase, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const a = toneLine('a');
  // the knob: gate climbs 1..6 before the hit, every other phase sits in 6 and trembles
  let knob = gearXY(6);
  if (phase === 'gate') {
    const k = inOut(prog(frame, e + 4, Math.max(12, hit - e - 4)));
    knob = along(k);
  }
  const shake = phase === 'jam' ? 4 * Math.sin(frame * 1.7) * prog(frame, hit, 6) * (1 - prog(frame, hit + 30, 30)) : 0;
  const glow6 = phase === 'finish' ? 0.5 + 0.5 * prog(frame, hit, 14) : phase === 'jam' ? prog(frame, hit + 10, 12) : phase === 'gate' ? prog(frame, hit - 2, 8) : 0;
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      {/* the gate plate */}
      <rect x={250} y={540} width={580} height={640} rx={60} fill={rgba(C.ink, 0.04)} stroke={C.rule} strokeWidth={4} />
      {/* the slots: the neutral bar and six lanes */}
      <path d={`M${COLS[0]} ${NY}H${COLS[2]}`} stroke={C.ink2} strokeWidth={SW} strokeLinecap="round" />
      {[1, 2, 3, 4, 5, 6].map((g) => {
        const p = gearXY(g);
        const shut = phase !== 'gate' && g < 6 ? (phase === 'jam' ? spr(frame, hit + (g - 1) * 4, 'land') : 1) : 0;
        const on = g === 6 ? 1 : 1 - 0.65 * shut;
        return (
          <g key={g}>
            <path d={`M${p.x} ${NY}V${p.y}`} stroke={rgba(C.ink2, on)} strokeWidth={SW} strokeLinecap="round" />
            {/* a closed slot: a heavy bar across its lane */}
            {shut > 0 ? <rect x={p.x - 46} y={(p.y + NY) / 2 - 9} width={92 * shut} height={18} rx={9} fill={C.ink} /> : null}
            <text className={TXT} x={p.x} y={g % 2 === 1 ? p.y - 44 : p.y + 82} textAnchor="middle" style={{fontFamily: F.sans, fontWeight: 600, fontSize: g === 6 ? 72 : 60}} fill={g === 6 ? C.ink : rgba(C.ink, on)}>
              {g}
            </text>
          </g>
        );
      })}
      {/* the sixth: the one slot left, ringed in the film's accent */}
      {glow6 > 0 ? <circle cx={COLS[2]} cy={BOTY} r={58 + 10 * kick} fill="none" stroke={a} strokeWidth={6} opacity={glow6} /> : null}
      {/* the knob */}
      <circle cx={knob.x + shake} cy={knob.y} r={44} fill={C.ink} />
      <circle cx={knob.x + shake - 12} cy={knob.y - 14} r={12} fill={rgba(C.bg, 0.35)} />
    </svg>
  );
};

/** the rev ring: the needle runs high, then sinks to the red stall zone on every cue of the scene */
const Rev: React.FC<{frame: number; e: number; ctx: SceneCtx; kick: number}> = ({frame, e, ctx, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const cy = 900;
  const R = 300;
  const cues = (ctx.cues ?? []).filter((c) => c > e + 8);
  let v = 0.72 + 0.03 * Math.sin(frame / 5);
  for (const c of cues) {
    const dip = prog(frame, c, 14, inOut) * (1 - prog(frame, c + 26, 18, inOut));
    v -= 0.62 * dip;
  }
  const ang = (x: number) => (-120 + 240 * x) * (Math.PI / 180);
  const pt = (x: number, r: number) => ({x: CX + Math.sin(ang(x)) * r, y: cy - Math.cos(ang(x)) * r});
  const arc = (from: number, to: number, r: number) => {
    const s = pt(from, r);
    const t = pt(to, r);
    return `M${s.x} ${s.y}A${r} ${r} 0 ${(to - from) * 240 > 180 ? 1 : 0} 1 ${t.x} ${t.y}`;
  };
  const n = pt(v, R - 70);
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      <path d={arc(0, 1, R)} fill="none" stroke={C.rule} strokeWidth={10} strokeLinecap="round" />
      <path d={arc(0, 0.14, R)} fill="none" stroke={toneLine('down')} strokeWidth={18} strokeLinecap="round" />
      <path d={arc(0.14, Math.max(0.15, v), R)} fill="none" stroke={toneLine('a')} strokeWidth={18} strokeLinecap="round" />
      {Array.from({length: 9}, (_, i) => {
        const a = pt(i / 8, R - 34);
        const b = pt(i / 8, R - 64);
        return <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={C.ink2} strokeWidth={6} strokeLinecap="round" />;
      })}
      <line x1={CX} y1={cy} x2={n.x} y2={n.y} stroke={C.ink} strokeWidth={10} strokeLinecap="round" />
      <circle cx={CX} cy={cy} r={86 + 6 * kick} fill={C.ink} />
      <text className={TXT} x={CX} y={cy + 30} textAnchor="middle" style={{fontFamily: F.sans, fontWeight: 600, fontSize: 84}} fill={C.bg}>
        6
      </text>
    </svg>
  );
};

/** the cost:a thermometer that climbs into the red */
const Heat: React.FC<{frame: number; e: number; hit: number; kick: number}> = ({frame, e, hit, kick}) => {
  const appear = spr(frame, e, 'enterXL');
  const lvl = 0.25 + 0.6 * prog(frame, e + 6, Math.max(20, hit - e), inOut) + 0.02 * Math.sin(frame / 4);
  const topY = 560;
  const bot = 1110;
  const h = (bot - topY) * lvl;
  const pulse = 1 + 0.04 * Math.sin(frame / 3) * prog(frame, hit, 10) + 0.05 * kick;
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      <rect x={CX - 44} y={topY - 40} width={88} height={bot - topY + 80} rx={44} fill="none" stroke={C.ink} strokeWidth={8} />
      <rect x={CX - 22} y={bot - h} width={44} height={h + 40} rx={22} fill={toneLine('down')} />
      <circle cx={CX} cy={bot + 90} r={86 * pulse} fill={toneLine('down')} stroke={C.ink} strokeWidth={8} />
      {Array.from({length: 6}, (_, i) => (
        <line key={i} x1={CX + 64} y1={topY + 20 + i * 96} x2={CX + 110} y2={topY + 20 + i * 96} stroke={C.ink2} strokeWidth={6} strokeLinecap="round" />
      ))}
    </svg>
  );
};

/** the trophy, lifted a little and only just, trembling */
const Cup: React.FC<{frame: number; e: number; hit: number}> = ({frame, e, hit}) => {
  const appear = spr(frame, e, 'enterXL');
  const lift = prog(frame, hit - 4, 40, inOut);
  const dy = 70 - 90 * lift + 6 * Math.sin(frame * 0.9) * (0.3 + lift);
  const tilt = 2.5 * Math.sin(frame / 6);
  const a = toneLine('a');
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
      <g transform={`translate(0 ${dy.toFixed(2)}) rotate(${tilt.toFixed(2)} ${CX} 1000)`}>
        <path d={`M${CX - 170} 560H${CX + 170}C${CX + 170} 800 ${CX + 90} 880 ${CX} 900C${CX - 90} 880 ${CX - 170} 800 ${CX - 170} 560Z`} fill={rgba(C.ink, 0.06)} stroke={a} strokeWidth={8} strokeLinejoin="round" />
        <path d={`M${CX - 170} 610C${CX - 290} 610 ${CX - 280} 760 ${CX - 140} 780`} fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" />
        <path d={`M${CX + 170} 610C${CX + 290} 610 ${CX + 280} 760 ${CX + 140} 780`} fill="none" stroke={a} strokeWidth={8} strokeLinecap="round" />
        <rect x={CX - 18} y={900} width={36} height={110} fill={C.ink} />
        <rect x={CX - 130} y={1010} width={260} height={60} rx={10} fill={C.ink} />
      </g>
      {/* the weight that pulls it down */}
      <path d={`M${CX} 1150V1270M${CX - 34} 1236L${CX} 1272L${CX + 34} 1236`} fill="none" stroke={C.ink2} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={0.4 + 0.6 * lift} />
    </svg>
  );
};

/** the finish: a chequered strip crossing under the gate */
const Flag: React.FC<{frame: number; hit: number}> = ({frame, hit}) => {
  // the strip unrolls from the left inside x 230..850, whole inside the frame
  const k = prog(frame, hit, 22, ease.drift);
  const shown = Math.round(14 * k);
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      {Array.from({length: 14}, (_, i) =>
        i < shown ? Array.from({length: 2}, (__, j) => <rect key={`${i}-${j}`} x={232 + i * 44} y={1230 + j * 44} width={44} height={44} fill={(i + j) % 2 === 0 ? C.ink : rgba(C.ink, 0.08)} />) : null,
      )}
    </svg>
  );
};

export const V118SixthGear: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const phase = p.phase ?? 'gate';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const shifts = phase === 'gate' ? STOPS.slice(1).map((s) => Math.round(e + 4 + (s / (ROAD.length - 1)) * Math.max(12, hit - e - 4))) : [];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5}}>
          <circle cx={CX} cy={880} r={430} fill="none" stroke={rgba(C.ink, 0.1)} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        {phase === 'rev' ? <Rev frame={frame} e={e} ctx={ctx} kick={kick} /> : phase === 'heat' ? <Heat frame={frame} e={e} hit={hit} kick={kick} /> : phase === 'cup' ? <Cup frame={frame} e={e} hit={hit} /> : <Gate frame={frame} e={e} hit={hit} phase={phase} kick={kick} />}
        {phase === 'finish' ? <Flag frame={frame} hit={hit} /> : null}
      </CameraLayer>
      <Hud>
        {p.label ? <MonoLabel text={p.label} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top - 30}} /> : null}
        {p.line ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 1190, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        ) : null}
      </Hud>
      {shifts.map((f, i) => (
        <Sfx key={i} name="asmr-knock" at={Math.max(base, f)} volume={0.22} />
      ))}
      {phase === 'jam' ? [1, 2, 3, 4, 5].map((g) => <Sfx key={g} name="asmr-land" at={Math.max(base, hit + (g - 1) * 4)} volume={0.2} />) : null}
      {phase === 'heat' || phase === 'cup' ? <Sfx name="asmr-swell" at={Math.max(base, hit - 10)} volume={0.24} /> : null}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
