// v134-winter-battery: one car battery, drawn in section, that moves on from step to step of the lesson (a diagram on the
// clean field). The shots:
//   share   two batteries as gauges: the left one fills to 45.4 (the battery's share of the breakdown calls), the right
//           one to 21.8 (the engine's), each number landing over its own gauge
//   cold    the battery in section, frost creeping in from its corners, the charge inside sinking, the charging arrow from
//           the alternator fading as it tries
//   cells   the six cells light one by one, 2.1 over each, then the sum lands under the case
//   meter   a multimeter on the terminals: the readout rolls down from 12.6 to `value`, past the 12.4 mark on its scale
//   lamps   a headlamp beside the battery: its beam collapses as the cells drain
//   frozen  the cells iced through, the jump leads come in from the side, and a cross lands over them
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import {acc} from '../illo/palette';
import {PartIcon} from '../kit/parts';
import {ENGINE_PATH} from '../kit/stage';
import type {SceneCtx} from '../../types';

type P = {
  shot?: 'share' | 'cold' | 'cells' | 'meter' | 'lamps' | 'frozen' | 'charge' | 'minute';
  hitAt?: number | string;
  at2?: number | string;
  value?: number;
  line?: string;
  source?: string;
};

const BX = 250;
const BY = 690;
const BW = 580;
const BH = 400;
const CELLS = 6;
const PAD = 30;
const GAP = 14;
const CW = (BW - 2 * PAD - (CELLS - 1) * GAP) / CELLS;
const STROKE = 6;

const cellX = (i: number) => BX + PAD + i * (CW + GAP);

/** The battery in section: the case, the two terminals, six cells with their acid, optional frost and ice. */
const Battery: React.FC<{level: number[]; lit?: number[]; frost?: number; ice?: number; scale?: number; ox?: number; oy?: number}> = ({level, lit, frost = 0, ice = 0, scale = 1, ox = 0, oy = 0}) => {
  const a = acc('a');
  const b = acc('b');
  const topY = BY + 40;
  const bot = BY + BH - 30;
  return (
    <g transform={`translate(${ox} ${oy}) translate(${BX + BW / 2} ${BY + BH / 2}) scale(${scale.toFixed(4)}) translate(${-(BX + BW / 2)} ${-(BY + BH / 2)})`}>
      <rect x={BX + 70} y={BY - 46} width={84} height={50} rx={10} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
      <rect x={BX + BW - 154} y={BY - 46} width={84} height={50} rx={10} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
      <path d={`M ${BX + 92} ${BY - 21} h 40 M ${BX + 112} ${BY - 41} v 40`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      <path d={`M ${BX + BW - 132} ${BY - 21} h 40`} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
      <rect x={BX} y={BY} width={BW} height={BH} rx={34} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
      {Array.from({length: CELLS}, (_, i) => {
        const x = cellX(i);
        const lv = Math.max(0, Math.min(1, level[+i] ?? 0));
        const h = (bot - topY) * lv;
        const on = lit ? lit[+i] ?? 0 : 0;
        return (
          <g key={i}>
            <rect x={x} y={topY} width={CW} height={bot - topY} rx={14} fill={rgba(C.ink, 0.05)} stroke={C.ink2} strokeWidth={4} />
            <rect x={x + 6} y={bot - h + 4} width={CW - 12} height={Math.max(0, h - 10)} rx={9} fill={rgba(a, 0.22 + 0.5 * on)} />
            {ice > 0 ? (
              <g opacity={Math.min(1, ice * 1.4 - i * 0.08)}>
                <rect x={x + 6} y={bot - h + 4} width={CW - 12} height={Math.max(0, h - 10)} rx={9} fill={rgba(b, 0.55)} />
                <path d={`M ${x + 12} ${bot - h * 0.3} l ${CW * 0.3} ${-h * 0.2} l ${CW * 0.25} ${h * 0.12} M ${x + CW * 0.3} ${bot - h * 0.65} l ${CW * 0.4} ${-h * 0.1}`} stroke={C.surface} strokeWidth={4} fill="none" strokeLinecap="round" />
              </g>
            ) : null}
            {on > 0 ? <rect x={x - 4} y={topY - 4} width={CW + 8} height={bot - topY + 8} rx={17} fill="none" stroke={a} strokeWidth={6} opacity={on} /> : null}
          </g>
        );
      })}
      {frost > 0 ? (
        <g opacity={frost}>
          {[0, 1, 2, 3].map((k) => {
            const cx = k % 2 === 0 ? BX : BX + BW;
            const cy = k < 2 ? BY : BY + BH;
            const r = 70 + 90 * frost;
            return <path key={k} d={`M ${cx} ${cy} m ${-r} 0 a ${r} ${r} 0 0 0 ${2 * r} 0 a ${r} ${r} 0 0 0 ${-2 * r} 0`} fill={rgba(b, 0.16)} stroke={rgba(b, 0.6)} strokeWidth={4} />;
          })}
        </g>
      ) : null}
    </g>
  );
};

/** A snowflake, bold. */
const Flake: React.FC<{x: number; y: number; r: number; color: string; rot?: number}> = ({x, y, r, color, rot = 0}) => (
  <g transform={`translate(${x} ${y}) rotate(${rot})`}>
    {[0, 60, 120].map((d) => (
      <g key={d} transform={`rotate(${d})`}>
        <line x1={-r} y1={0} x2={r} y2={0} stroke={color} strokeWidth={6} strokeLinecap="round" />
        <path d={`M ${r * 0.55} 0 l ${r * 0.25} ${-r * 0.22} M ${r * 0.55} 0 l ${r * 0.25} ${r * 0.22} M ${-r * 0.55} 0 l ${-r * 0.25} ${-r * 0.22} M ${-r * 0.55} 0 l ${-r * 0.25} ${r * 0.22}`} stroke={color} strokeWidth={5} strokeLinecap="round" fill="none" />
      </g>
    ))}
  </g>
);

const Big: React.FC<{text: string; x: number; y: number; k: number; size?: number; color?: string}> = ({text, x, y, k, size = 96, color}) => (
  <div className={TXT} style={{position: 'absolute', left: x - 300, top: y, width: 600, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, color: color ?? C.ink, opacity: k, transform: `translateY(${(1 - k) * 24}px) scale(${(0.9 + 0.1 * k).toFixed(4)})`, whiteSpace: 'nowrap', letterSpacing: '-0.02em'}}>
    {mtav(text)}
  </div>
);

// ---- share: two gauges -------------------------------------------------------------------------------------------------------
const Share: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.3s'));
  const hit2 = Math.max(hit + 18, cueFrame(ctx, p.at2 ?? 1));
  const k0 = spr(f, e, 'enterXL');
  const f1 = prog(f, hit - 14, 22, ease.countUp);
  const f2 = prog(f, hit2 - 10, 20, ease.countUp);
  const a = acc('a');
  const kick = useKick();
  const G = (x: number, fill: number, show: number, col: string, icon: 'battery' | 'engine') => {
    const y0 = 720;
    const h = 460;
    const w = 250;
    return (
      <g className={OBJ}>
        <rect x={x + w / 2 - 40} y={y0 - 34} width={80} height={38} rx={10} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
        <rect x={x} y={y0} width={w} height={h} rx={40} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
        <rect x={x + 16} y={y0 + h - 16 - (h - 32) * fill} width={w - 32} height={(h - 32) * fill} rx={26} fill={col} />
        {[0.25, 0.5, 0.75].map((t) => (
          <line key={t} x1={x + 16} x2={x + 46} y1={y0 + h - 16 - (h - 32) * t} y2={y0 + h - 16 - (h - 32) * t} stroke={C.ink2} strokeWidth={4} />
        ))}
        {icon === 'battery' ? (
          <PartIcon name="battery" x={x + w / 2 - 50} y={y0 + h + 30} size={100} color={C.ink} width={3.4} opacity={show} />
        ) : (
          <g transform={`translate(${x + w / 2 - 50} ${y0 + h + 30}) scale(${100 / 24})`} opacity={show}>
            <path d={ENGINE_PATH} fill="none" stroke={C.ink} strokeWidth={7} vectorEffect="non-scaling-stroke" strokeLinejoin="round" strokeLinecap="round" />
          </g>
        )}
      </g>
    );
  };
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          {G(200, (45.4 / 100) * f1, k0, a, 'battery')}
          <g opacity={0.35 + 0.65 * prog(f, hit2 - 12, 10)}>{G(630, (21.8 / 100) * f2, prog(f, hit2 - 12, 10), C.ink2, 'engine')}</g>
          <circle cx={325} cy={950} r={190 + 20 * kick} fill="none" stroke={rgba(a, 0.12 * kick)} strokeWidth={6} />
        </svg>
      </CameraLayer>
      <Hud>
        <Big text="45.4%" x={325} y={560} k={prog(f, hit, 10, ease.enter)} size={104} />
        <Big text="21.8%" x={755} y={560} k={prog(f, hit2, 10, ease.enter)} size={104} color={C.ink2} />
      </Hud>
      <SourceLine text={p.source ?? 'adac.de · 2025'} at={Math.max(base, e + 8)} y={1300} />
      <Land at={hit} />
      <Sfx name="asmr-count-roll" at={Math.max(base, hit - 14)} volume={0.3} />
      <Sfx name="asmr-land" at={hit2} volume={0.4} />
      <Haptic kind="light" at={hit2} />
    </PictureBand>
  );
};

// ---- cold: frost creeps in, the charge sinks, the alternator's arrow fades -----------------------------------------------------
const Cold: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.6s'));
  const at2 = Math.max(hit + 20, cueFrame(ctx, p.at2 ?? 1));
  const k0 = spr(f, e, 'enterXL');
  const frost = prog(f, e, 70, ease.drift);
  const sink = prog(f, hit, 40, ease.drift);
  const lv = Array.from({length: CELLS}, (_, i) => 0.86 - 0.38 * sink - 0.03 * i * sink);
  const arrow = prog(f, at2 - 6, 14);
  const stall = prog(f, at2 + 18, 30);
  const b = acc('b');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.8 * k0}}>
          <Flake x={210} y={500} r={52} color={b} rot={f * 0.4} />
          <Flake x={880} y={540} r={40} color={b} rot={-f * 0.5} />
          <Flake x={900} y={1210} r={46} color={b} rot={f * 0.3} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <Battery level={lv} frost={frost} scale={0.86} oy={-30} />
          <g opacity={arrow * (1 - 0.7 * stall)}>
            <circle cx={540} cy={1230} r={62} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
            {[0, 60, 120, 180, 240, 300].map((d) => (
              <line key={d} x1={540} y1={1230} x2={540 + Math.cos(((d + f * 4 * (1 - stall)) * Math.PI) / 180) * 44} y2={1230 + Math.sin(((d + f * 4 * (1 - stall)) * Math.PI) / 180) * 44} stroke={C.ink2} strokeWidth={5} strokeLinecap="round" />
            ))}
            <path d="M 540 1160 L 540 1090" stroke={C.ink} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${70 * (1 - stall)} 80`} />
            <path d="M 516 1112 L 540 1086 L 564 1112" stroke={C.ink} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" fill="none" opacity={1 - stall} />
          </g>
        </svg>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(base, hit - 6)} volume={0.22} />
      <Haptic kind="light" at={at2} />
    </PictureBand>
  );
};

// ---- cells: six cells, 2.1 each, the sum ------------------------------------------------------------------------------------
const Cells: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const s0 = Math.max(base + 6, cueFrame(ctx, p.hitAt ?? 0));
  const sum = Math.max(s0 + 6 * 8 + 6, cueFrame(ctx, p.at2 ?? 2));
  const k0 = spr(f, e, 'enterXL');
  const lit = Array.from({length: CELLS}, (_, i) => prog(f, s0 + i * 7, 8));
  const lv = Array.from({length: CELLS}, () => 0.86);
  const ks = prog(f, sum, 12, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <Battery level={lv} lit={lit} oy={-20} />
        </svg>
      </CameraLayer>
      <Hud>
        {Array.from({length: CELLS}, (_, i) => (
          <div key={i} className={TXT} style={{position: 'absolute', left: cellX(i) - 20, top: 760, width: CW + 40, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 40, color: C.ink, opacity: lit[+i] * (1 - 0.4 * ks), transform: `translateY(${(1 - lit[+i]) * 16}px)`}}>
            2.1
          </div>
        ))}
        <Big text="12.6 V" x={540} y={1150} k={ks} size={110} />
      </Hud>
      {Array.from({length: CELLS}, (_, i) => (
        <Sfx key={i} name="asmr-tick-fine" at={s0 + i * 7} volume={0.3} />
      ))}
      <Land at={sum} />
    </PictureBand>
  );
};

// ---- meter: the multimeter on the terminals ----------------------------------------------------------------------------------
const Meter: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 1));
  const k0 = spr(f, e, 'enterXL');
  const reach = prog(f, e + 4, 22, ease.enter);
  const target = p.value ?? 12.3;
  const roll = prog(f, hit - 18, 22, ease.countUp);
  const v = 12.6 + (target - 12.6) * roll;
  const low = v < 12.4 - 0.001;
  const kick = useKick();
  const a = acc('a');
  // the meter's body under the battery, its scale 12.0 .. 12.8
  const MX = 330;
  const MY = 1010;
  const MW = 420;
  const MH = 300;
  const sx = (x: number) => MX + 40 + ((x - 12.0) / 0.8) * (MW - 80);
  const lv = Array.from({length: CELLS}, () => 0.86 - 0.25 * roll * (target < 12.4 ? 1 : 0));
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <Battery level={lv} scale={0.78} oy={-200} />
          <path d={`M ${MX + 70} ${MY} C ${MX + 40} ${900} ${360} ${720} ${370} ${560 + 60 * (1 - reach)}`} stroke={a} strokeWidth={8} fill="none" strokeLinecap="round" />
          <path d={`M ${MX + MW - 70} ${MY} C ${MX + MW - 40} ${900} ${720} ${720} ${710} ${560 + 60 * (1 - reach)}`} stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" />
          <circle cx={370} cy={556 + 60 * (1 - reach)} r={12} fill={a} />
          <circle cx={710} cy={556 + 60 * (1 - reach)} r={12} fill={C.ink} />
          <rect x={MX} y={MY} width={MW} height={MH} rx={40} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
          <rect x={MX + 30} y={MY + 26} width={MW - 60} height={150} rx={20} fill={rgba(C.ink, 0.06)} stroke={C.ink2} strokeWidth={4} />
          <line x1={sx(12.0)} x2={sx(12.8)} y1={MY + 230} y2={MY + 230} stroke={C.ink2} strokeWidth={6} strokeLinecap="round" />
          <line x1={sx(12.4)} x2={sx(12.4)} y1={MY + 206} y2={MY + 254} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          <rect x={sx(12.0)} y={MY + 222} width={sx(12.4) - sx(12.0)} height={16} rx={8} fill={toneLine('down')} opacity={0.35 + 0.5 * (low ? 1 : 0)} />
          <circle cx={sx(Math.max(12.0, Math.min(12.8, v)))} cy={MY + 230} r={16 + 4 * kick} fill={low ? toneLine('down') : C.ink} />
        </svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: MX + 30, top: MY + 46, width: MW - 60, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 100, color: C.ink, letterSpacing: '0.02em', opacity: k0}}>
          {v.toFixed(1)}
        </div>
        <div className={TXT} style={{position: 'absolute', left: sx(12.4) - 80, top: MY + 256, width: 160, textAlign: 'center', fontFamily: F.mono, fontSize: 34, color: C.ink, opacity: k0}}>
          12.4
        </div>
        {p.line ? (
          <div style={{position: 'absolute', left: 160, top: 400, width: 760, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit + 4} fx="slam" size={72} />
          </div>
        ) : null}
      </Hud>
      <Sfx name="asmr-tap" at={Math.max(base, e + 22)} volume={0.3} />
      <Sfx name="asmr-count-roll" at={Math.max(base, hit - 18)} volume={0.28} />
      <Land at={hit + 4} />
    </PictureBand>
  );
};

// ---- lamps: the beam collapses ----------------------------------------------------------------------------------------------
const Lamps: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 16, cueFrame(ctx, p.hitAt ?? 1));
  const k0 = spr(f, e, 'enterXL');
  const on = prog(f, e + 6, 10);
  const dim = prog(f, hit - 6, 18, ease.enter);
  const a = acc('a');
  const beam = on * (1 - 0.82 * dim);
  const len = 520 - 330 * dim;
  const lv = Array.from({length: CELLS}, (_, i) => 0.8 - 0.55 * dim + 0.02 * i * dim);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <path d={`M 300 640 L ${300 + len} ${560 - 0.25 * len} L ${300 + len} ${720 + 0.25 * len} Z`} fill={rgba(a, 0.42 * beam)} />
          <path d={`M 300 640 L ${300 + len * 0.7} ${600 - 0.1 * len} L ${300 + len * 0.7} ${680 + 0.1 * len} Z`} fill={rgba(a, 0.5 * beam)} />
          <path d="M 170 560 Q 330 560 330 640 Q 330 720 170 720 Z" fill={C.surface} stroke={C.ink} strokeWidth={STROKE} strokeLinejoin="round" />
          <circle cx={280} cy={640} r={34} fill={beam > 0.2 ? rgba(a, 0.4 + 0.6 * beam) : C.ink2} stroke={C.ink} strokeWidth={5} />
          <Battery level={lv} scale={0.7} oy={250} />
          <path d={`M 360 ${1030} C 300 940 240 860 240 730`} stroke={C.ink2} strokeWidth={6} fill="none" strokeLinecap="round" strokeDasharray="14 12" />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-knock" at={Math.max(base, e + 6)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.22} />
      <Haptic kind="medium" at={hit} />
    </PictureBand>
  );
};

// ---- frozen: iced cells, the leads come in, a cross lands ------------------------------------------------------------------
const Frozen: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 24, cueFrame(ctx, p.hitAt ?? 1));
  const k0 = spr(f, e, 'enterXL');
  const ice = prog(f, e, 30, ease.enter);
  const lead2 = prog(f, e + 8, 26, ease.enter);
  const x = prog(f, hit, 10, ease.whipOut);
  const kick = useKick();
  const lv = Array.from({length: CELLS}, () => 0.5);
  const a = acc('a');
  const reach = 1 - lead2;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <Battery level={lv} ice={ice} frost={0.6 * ice} scale={0.86} oy={40} />
          <path d={`M ${160 - 200 * reach} 520 C 260 500 300 520 ${342} ${660}`} stroke={a} strokeWidth={14} fill="none" strokeLinecap="round" />
          <path d={`M ${920 + 200 * reach} 520 C 820 500 780 520 ${738} ${660}`} stroke={C.ink} strokeWidth={14} fill="none" strokeLinecap="round" />
          <rect x={318} y={630} width={48} height={60} rx={10} fill={a} />
          <rect x={714} y={630} width={48} height={60} rx={10} fill={C.ink} />
          <g opacity={x} transform={`translate(540 780) scale(${(0.7 + 0.3 * x + 0.04 * kick).toFixed(4)})`}>
            <line x1={-250} y1={-250} x2={250} y2={250} stroke={toneLine('down')} strokeWidth={26} strokeLinecap="round" />
            <line x1={250} y1={-250} x2={-250} y2={250} stroke={toneLine('down')} strokeWidth={26} strokeLinecap="round" />
          </g>
        </svg>
      </CameraLayer>
      <Sfx name="asmr-paper" at={Math.max(base, e + 10)} volume={0.26} />
      <Sfx name="asmr-strike" at={hit} volume={0.4} />
      <Haptic kind="rigid" at={hit + 1} />
    </PictureBand>
  );
};

// ---- charge: a charger on the terminals, the cells filling back up ---------------------------------------------------------
const Charge: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? '0.4s'));
  const k0 = spr(f, e, 'enterXL');
  const plug = prog(f, e + 2, 16, ease.enter);
  const fill = prog(f, hit, 40, ease.drift);
  const a = acc('a');
  const lv = Array.from({length: CELLS}, (_, i) => 0.3 + 0.58 * prog(f, hit + i * 4, 30, ease.drift));
  const lit = Array.from({length: CELLS}, (_, i) => 0.6 * prog(f, hit + i * 4, 30));
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <Battery level={lv} lit={lit} scale={0.82} oy={120} />
          <rect x={390} y={430 - 80 * (1 - plug)} width={300} height={190} rx={34} fill={C.surface} stroke={C.ink} strokeWidth={STROKE} />
          <path d={`M 552 ${462 - 80 * (1 - plug)} L 508 ${530 - 80 * (1 - plug)} L 548 ${530 - 80 * (1 - plug)} L 528 ${590 - 80 * (1 - plug)} L 576 ${516 - 80 * (1 - plug)} L 536 ${516 - 80 * (1 - plug)} Z`} fill={rgba(a, 0.4 + 0.6 * fill)} stroke={C.ink} strokeWidth={4} strokeLinejoin="round" />
          <path d={`M 430 ${620 - 80 * (1 - plug)} C 420 700 380 760 ${375} ${790}`} stroke={a} strokeWidth={8} fill="none" strokeLinecap="round" opacity={plug} />
          <path d={`M 650 ${620 - 80 * (1 - plug)} C 660 700 700 760 ${705} ${790}`} stroke={C.ink} strokeWidth={8} fill="none" strokeLinecap="round" opacity={plug} />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-tap" at={Math.max(base, e + 14)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, hit)} volume={0.24} />
      <Haptic kind="light" at={Math.max(base, hit)} />
    </PictureBand>
  );
};

// ---- minute: the readout alone, a minute's ring closing round it ----------------------------------------------------------
const Minute: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const f = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? '0.5s'));
  const k0 = spr(f, e, 'enterXL');
  const sweep = prog(f, e, Math.max(30, hit - e + 10), ease.enter);
  const kick = useKick();
  const a = acc('a');
  const R = 300;
  const CY = 860;
  const ang = sweep * 2 * Math.PI;
  const ex = 540 + Math.sin(ang) * R;
  const ey = CY - Math.cos(ang) * R;
  const large = sweep > 0.5 ? 1 : 0;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: k0}}>
          <circle cx={540} cy={CY} r={R} fill={C.surface} stroke={rgba(C.ink, 0.14)} strokeWidth={22} />
          {sweep > 0.002 && sweep < 0.999 ? <path d={`M 540 ${CY - R} A ${R} ${R} 0 ${large} 1 ${ex} ${ey}`} stroke={a} strokeWidth={22} fill="none" strokeLinecap="round" /> : null}
          {sweep >= 0.999 ? <circle cx={540} cy={CY} r={R} fill="none" stroke={a} strokeWidth={22 + 6 * kick} /> : null}
          <PartIcon name="battery" x={490} y={640} size={100} color={C.ink} width={3.4} />
        </svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: 240, top: CY - 50, width: 600, textAlign: 'center', fontFamily: F.mono, fontWeight: 700, fontSize: 130, color: C.ink, opacity: k0}}>
          {(p.value ?? 12.6).toFixed(1)}
        </div>
      </Hud>
      <Sfx name="asmr-tick-fine" at={Math.max(base, e + 6)} volume={0.26} />
      <Land at={hit} />
    </PictureBand>
  );
};

export const V134WinterBattery: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  switch (p.shot) {
    case 'charge':
      return <Charge p={p} ctx={ctx} />;
    case 'minute':
      return <Minute p={p} ctx={ctx} />;
    case 'cold':
      return <Cold p={p} ctx={ctx} />;
    case 'cells':
      return <Cells p={p} ctx={ctx} />;
    case 'meter':
      return <Meter p={p} ctx={ctx} />;
    case 'lamps':
      return <Lamps p={p} ctx={ctx} />;
    case 'frozen':
      return <Frozen p={p} ctx={ctx} />;
    default:
      return <Share p={p} ctx={ctx} />;
  }
};
