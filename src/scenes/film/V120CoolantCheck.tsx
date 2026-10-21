// V120CoolantCheck: the cooling system as one clean diagram that moves on, step by step, through a coolant lesson.
// shot: "tank" (the expansion tank, the level sinking past MIN) | "rust" (the loop: block, hoses, radiator, the coolant's
// protective film on the block's walls) | "wear" (the film thins, rust spots creep in) | "freeze" (two thermometers: pure
// coolant against the half and half mix) | "pressure" (the closed cap holds the hot loop over 100 degrees) | "cap" (the cap
// lifts and the steam bursts out) | "gauge" (the temperature needle climbing to the red) | "level" (the tank, cold, between
// MIN and MAX) | "leak" (a drop falls from the lower hose, the level steps down).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, L, rgba, toneLine, accentsOn, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav, capsLatin} from '../../lib/format';
import type {SceneCtx} from '../../types';

type Shot = 'tank' | 'rust' | 'wear' | 'freeze' | 'pressure' | 'cap' | 'gauge' | 'level' | 'leak' | 'hot';
type P = {
  shot?: Shot;
  hitAt?: number | string;
  line?: string;
  label?: string;
  source?: string;
  tone?: Tone;
  a?: string; // freeze: the first tube's caption and value
  av?: string;
  b?: string;
  bv?: string;
};

const SW = 6;

const fluid = () => (accentsOn() ? C.accA : C.ink2);
const second = () => (accentsOn() ? C.accB : C.ink3);

/** The expansion tank: a rounded tank, its cap, the MIN and MAX marks, the coolant at `level` (0..1 of its height). */
const Tank: React.FC<{x: number; y: number; w: number; h: number; level: number; band?: number; frame: number}> = ({x, y, w, h, level, band = 0, frame}) => {
  const surf = y + h * (1 - level);
  const wave = 6 * Math.sin(frame / 7);
  const maxY = y + h * 0.28;
  const minY = y + h * 0.72;
  return (
    <g className={OBJ}>
      <rect x={x + w * 0.36} y={y - 64} width={w * 0.28} height={52} rx={10} fill={C.ink} />
      <rect x={x + w * 0.42} y={y - 16} width={w * 0.16} height={20} fill={C.ink} />
      <clipPath id="v120tank">
        <rect x={x} y={y} width={w} height={h} rx={44} />
      </clipPath>
      <rect x={x} y={y} width={w} height={h} rx={44} fill={rgba(C.ink, 0.04)} />
      <g clipPath="url(#v120tank)">
        <path d={`M ${x - 20} ${surf + wave} Q ${x + w * 0.25} ${surf - 14 - wave} ${x + w * 0.5} ${surf + wave * 0.4} T ${x + w + 20} ${surf - wave} L ${x + w + 20} ${y + h + 20} L ${x - 20} ${y + h + 20} Z`} fill={fluid()} opacity={0.82} />
        {band > 0 ? <rect x={x} y={maxY} width={w} height={minY - maxY} fill={rgba(toneLine('up'), 0.16 * band)} /> : null}
      </g>
      <rect x={x} y={y} width={w} height={h} rx={44} fill="none" stroke={C.ink} strokeWidth={SW} />
      {[maxY, minY].map((yy, i) => (
        <line key={i} x1={x + w - 70} x2={x + w + 30} y1={yy} y2={yy} stroke={band > 0 ? toneLine('up') : C.ink} strokeWidth={6} strokeLinecap="round" />
      ))}
    </g>
  );
};

/** The loop: the engine block on the left, the radiator on the right, two hoses, the coolant flowing (one moving motif). */
const Loop: React.FC<{frame: number; film: number; rust: number; drip?: number; flow?: number; hot?: number}> = ({frame, film, rust, drip = -1, flow = 1, hot = 0}) => {
  const f = hot > 0.5 ? toneLine('down') : fluid();
  const dash = -((frame * 4 * flow) % 80);
  const spots = [
    [205, 640], [215, 790], [205, 900], [440, 700], [445, 860], [300, 960], [370, 600],
  ];
  return (
    <g className={OBJ} transform="translate(540 830) scale(1.04) translate(-540 -780)">
      {/* hoses */}
      <path d="M 470 620 C 540 620 560 600 640 600" fill="none" stroke={C.ink} strokeWidth={34} strokeLinecap="round" />
      <path d="M 470 620 C 540 620 560 600 640 600" fill="none" stroke={f} strokeWidth={20} strokeLinecap="round" strokeDasharray="44 36" strokeDashoffset={dash} />
      <path d="M 640 960 C 560 960 540 940 470 940" fill="none" stroke={C.ink} strokeWidth={34} strokeLinecap="round" />
      <path d="M 640 960 C 560 960 540 940 470 940" fill="none" stroke={f} strokeWidth={20} strokeLinecap="round" strokeDasharray="44 36" strokeDashoffset={dash} />
      {/* the engine block: a water jacket round three cylinders */}
      <rect x={180} y={560} width={290} height={440} rx={34} fill={rgba(f, 0.28)} stroke={C.ink} strokeWidth={SW} />
      {[0, 1, 2].map((i) => (
        <rect key={i} x={222} y={600 + i * 130} width={206} height={100} rx={22} fill={C.bg} stroke={C.ink} strokeWidth={5} />
      ))}
      {/* the protective film on the jacket's walls */}
      <rect x={190} y={570} width={270} height={420} rx={28} fill="none" stroke={second()} strokeWidth={10} opacity={film} strokeDasharray="6 12" />
      {spots.map(([sx, sy], i) => {
        const k = prog(rust, i / spots.length, 0.3);
        return <circle key={i} cx={sx} cy={sy} r={14 * k} fill={toneLine('down')} opacity={0.8 * k} />;
      })}
      {/* the radiator */}
      <rect x={640} y={540} width={260} height={480} rx={22} fill={C.bg} stroke={C.ink} strokeWidth={SW} />
      {Array.from({length: 9}, (_, i) => (
        <line key={i} x1={670 + i * 25} x2={670 + i * 25} y1={580} y2={980} stroke={C.ink2} strokeWidth={4} />
      ))}
      <rect x={740} y={500} width={60} height={44} rx={10} fill={C.ink} />
      {drip >= 0 ? (
        <g>
          <ellipse cx={560} cy={1170} rx={30 + 70 * Math.min(1, drip * 1.2)} ry={8 + 10 * Math.min(1, drip)} fill={rgba(f, 0.6)} />
          {[0, 0.33, 0.66].map((o, i) => {
            const q = (drip * 3 + o) % 1;
            return <circle key={i} cx={560} cy={975 + 190 * ease.enter(q)} r={11} fill={f} opacity={drip > 0.05 ? 1 - q * 0.5 : 0} />;
          })}
        </g>
      ) : null}
    </g>
  );
};

/** One thermometer tube: its fill sinks to the frost line it holds to. */
const T_TOP = 500;
const T_BOT = 1040;
const T_ZERO = 590;
const frostY = (depth: number, k: number) => T_ZERO + (T_BOT - 40 - T_ZERO) * depth * k;
const Tube: React.FC<{x: number; k: number; depth: number}> = ({x, k, depth}) => {
  const y = frostY(depth, k);
  return (
    <g className={OBJ}>
      <rect x={x - 36} y={T_TOP} width={72} height={T_BOT - T_TOP} rx={36} fill={rgba(C.ink, 0.04)} stroke={C.ink} strokeWidth={SW} />
      <circle cx={x} cy={T_BOT + 40} r={60} fill={fluid()} stroke={C.ink} strokeWidth={SW} />
      <rect x={x - 18} y={T_ZERO} width={36} height={T_BOT - T_ZERO + 20} fill={fluid()} />
      <line x1={x - 36} x2={x + 36} y1={T_ZERO} y2={T_ZERO} stroke={C.ink2} strokeWidth={5} />
      <line x1={x - 70} x2={x + 70} y1={y} y2={y} stroke={toneLine('down')} strokeWidth={8} strokeLinecap="round" opacity={k} />
    </g>
  );
};
const TubeText: React.FC<{x: number; y: number; text: string; size: number; weight: number; k: number}> = ({x, y, text, size, weight, k}) => (
  <div className={TXT} style={{position: 'absolute', left: x - 220, width: 440, top: y, textAlign: 'center', fontFamily: F.sans, fontSize: size, fontWeight: weight, color: C.ink, opacity: k, whiteSpace: 'nowrap'}}>
    {mtav(capsLatin(text))}
  </div>
);

/** The temperature gauge: C to H, a red zone, the needle climbing. */
const Gauge: React.FC<{v: number; kick: number}> = ({v, kick}) => {
  const cx = 540;
  const cy = 900;
  const R = 330;
  const arc = (a0: number, a1: number, r: number) => {
    const p0 = [cx + r * Math.cos(a0), cy + r * Math.sin(a0)];
    const p1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
    return `M ${p0[0]} ${p0[1]} A ${r} ${r} 0 0 1 ${p1[0]} ${p1[1]}`;
  };
  const a0 = Math.PI * 1.15;
  const a1 = Math.PI * 1.85;
  const red = a0 + (a1 - a0) * 0.78;
  const a = a0 + (a1 - a0) * v;
  return (
    <g className={OBJ}>
      <path d={arc(a0, red, R)} fill="none" stroke={C.ink} strokeWidth={14} strokeLinecap="round" />
      <path d={arc(red, a1, R)} fill="none" stroke={toneLine('down')} strokeWidth={22} strokeLinecap="round" />
      {Array.from({length: 9}, (_, i) => {
        const t = a0 + ((a1 - a0) * i) / 8;
        return <line key={i} x1={cx + (R - 60) * Math.cos(t)} y1={cy + (R - 60) * Math.sin(t)} x2={cx + (R - 26) * Math.cos(t)} y2={cy + (R - 26) * Math.sin(t)} stroke={C.ink2} strokeWidth={6} strokeLinecap="round" />;
      })}
      <line x1={cx} y1={cy} x2={cx + (R - 40) * Math.cos(a)} y2={cy + (R - 40) * Math.sin(a)} stroke={v > 0.78 ? toneLine('down') : C.ink} strokeWidth={12} strokeLinecap="round" />
      <circle cx={cx} cy={cy} r={30 + 8 * kick} fill={C.ink} />
    </g>
  );
};

/** The radiator's neck in section: the cap and its spring hold the pressure; with "cap" it lifts and the steam bursts. */
const Neck: React.FC<{lid: number; frame: number; hot: number}> = ({lid, frame, hot}) => {
  const lift = 260 * ease.enter(lid);
  const turn = 28 * lid;
  const f = fluid();
  return (
    <g>
      <g className={OBJ}>
        {/* the radiator top in section */}
        <path d="M 200 1180 L 200 900 L 440 900 L 440 760 L 640 760 L 640 900 L 880 900 L 880 1180 Z" fill={rgba(f, 0.5 + 0.2 * hot)} stroke={C.ink} strokeWidth={SW} strokeLinejoin="round" />
        {/* pressure arrows pushing up on the cap */}
        {[0, 1, 2].map((i) => {
          const y = 870 - 30 * Math.sin(frame / 6 + i);
          return <path key={i} d={`M ${480 + i * 60} ${y + 60} L ${480 + i * 60} ${y} M ${464 + i * 60} ${y + 18} L ${480 + i * 60} ${y} L ${496 + i * 60} ${y + 18}`} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" opacity={(1 - lid) * hot} />;
        })}
        <g transform={`translate(0 ${-lift}) rotate(${turn} 540 730)`}>
          <rect x={420} y={700} width={240} height={60} rx={14} fill={C.ink} />
          <path d="M 500 760 l 20 16 l -20 16 l 20 16 l -20 16" fill="none" stroke={C.ink} strokeWidth={6} opacity={1 - lid} />
          <rect x={470} y={820} width={140} height={20} rx={6} fill={C.ink} opacity={1 - lid} />
        </g>
      </g>
      {lid > 0
        ? Array.from({length: 9}, (_, i) => {
            const q = ((frame * 0.03 + i / 9) % 1) * lid;
            const x = 540 + (i % 3 - 1) * 90 * q + 30 * Math.sin(i + frame / 9);
            const y = 740 - 330 * q;
            return <circle key={i} cx={x} cy={y} r={40 + 60 * q} fill={rgba(C.ink2, 0.35 * (1 - q))} />;
          })
        : null}
    </g>
  );
};

export const V120CoolantCheck: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const shot: Shot = p.shot ?? 'tank';
  const appear = spr(frame, e, 'enterXL');
  const k = prog(frame, hit, 22, ease.enter);
  const drift = prog(frame, e, ctx.dur);
  let pic: React.ReactNode = null;
  let hud: React.ReactNode = null;
  if (shot === 'tank' || shot === 'level') {
    const level = shot === 'tank' ? 0.6 - 0.42 * k - 0.04 * drift : 0.22 + 0.3 * prog(frame, e, 30, ease.enter) + 0.02 * Math.sin(frame / 20);
    pic = <Tank x={360} y={500} w={360} h={640} level={level} band={shot === 'level' ? k : 0} frame={frame} />;
  } else if (shot === 'rust' || shot === 'wear' || shot === 'leak' || shot === 'hot') {
    const film = shot === 'rust' ? 0.3 + 0.7 * k : 1 - 0.85 * k;
    const rust = shot === 'wear' ? k : 0;
    pic = <Loop frame={frame} film={shot === 'leak' || shot === 'hot' ? 0.4 : film} rust={rust} drip={shot === 'leak' ? prog(frame, hit, 90) : -1} flow={shot === 'leak' ? 0.5 : shot === 'hot' ? 1 + 1.5 * k : 1} hot={shot === 'hot' ? k : 0} />;
  } else if (shot === 'freeze') {
    const k1 = prog(frame, e + 6, 26, ease.enter);
    const k2 = prog(frame, hit, 26, ease.enter);
    pic = (
      <g>
        <Tube x={360} k={k1} depth={0.3} />
        <Tube x={720} k={k2} depth={0.86} />
      </g>
    );
    hud = (
      <>
        <TubeText x={360 + 150} y={frostY(0.3, k1) - 34} text={p.av ?? '−12°'} size={60} weight={700} k={k1} />
        <TubeText x={720 - 160} y={frostY(0.86, k2) - 34} text={p.bv ?? '−37°'} size={60} weight={700} k={k2} />
        <TubeText x={360} y={T_BOT + 112} text={p.a ?? '100%'} size={44} weight={600} k={appear} />
        <TubeText x={720} y={T_BOT + 112} text={p.b ?? '50/50'} size={44} weight={600} k={appear} />
      </>
    );
  } else if (shot === 'pressure' || shot === 'cap') {
    pic = <Neck lid={shot === 'cap' ? k : 0} frame={frame} hot={0.5 + 0.5 * prog(frame, e, 30)} />;
  } else if (shot === 'gauge') {
    const v = 0.35 + 0.5 * prog(frame, e, hit - e + 20, ease.drawOn) + 0.01 * Math.sin(frame / 5);
    pic = <Gauge v={v} kick={kick} />;
  }
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.95 + 0.05 * appear + 0.03 * kick).toFixed(4)})`, transformOrigin: `540px ${L.contentMid}px`}}>
          {pic}
        </svg>
      </CameraLayer>
      <Hud>
        {hud}
        <SourceLine text={p.source} at={Math.max(base, e + 8)} y={1300} />
        {p.label ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 470, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.label} at={hit} fx="slam" size={120} />
          </div>
        ) : null}
        {p.line ? (
          <div style={{position: 'absolute', left: 0, right: 0, top: 1200, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        ) : null}
      </Hud>
      <Sfx name={shot === 'cap' ? 'asmr-air-long' : 'asmr-swell'} at={Math.max(base, hit - 8)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
