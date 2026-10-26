// V131OdometerCheck: one diagram of the rolled-back odometer, moving on step by step (v131-odometer-check).
//   shot "roll"    a black odometer housing, its top drums turning BACK from 186 to 98 thousand, the low drums a smear
//   shot "third"   nine cars from above in a grid; on the key moment every third one is lit in the accent and ringed
//   shot "sticker" a service sticker on the glass corner and the odometer plate under it: 100 000 against 180 000
//   shot "gap"     a ruler 100 000 .. 180 000: the oil's 40 000 km reach, then the gap that does not fit, slammed red
//   shot "tyre"    a tyre seen from the side, rolling in, the ~32 000 km label, its sidewall mark ringed
//   shot "pedal"   a brake pedal's rubber close up, its ribs worn smooth in the middle, ringed on the key moment
//   shot "memory"  the fault memory as a dark card: entries carry their mileage, one runs past the odometer line
//   shot "verdict" three tiles (sticker, pedal, memory): state "doubt" a red cross each, "done" a green check each
// Props: shot, at, hitAt, line, label, source, state.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, F, rgba, toneBig, toneLine} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import {mtav} from '../../lib/format';
import {Car} from '../illo/car';
import {IlloDefs} from '../illo/solid';
import type {SceneCtx} from '../../types';

type P = {
  shot?: string;
  at?: number | string;
  hitAt?: number | string;
  line?: string;
  label?: string;
  source?: string;
  state?: string;
};

const CX = 540;
const DW = 108; // a drum's width
const DH = 168; // a drum's height
const GAP = 10;

const grp = (n: number) => {
  const s = String(Math.round(n));
  return s.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
};

/** The common timing of a shot: the frame, its entrance, the chunk cue and the key moment. */
const useT = (p: P, ctx: SceneCtx) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const at = Math.max(base, cueFrame(ctx, p.at ?? 0));
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const appear = spr(frame, e, 'enterXL');
  return {frame, e, base, at, hit, appear};
};

/** One drum: a column of digits 0..9,0 moved to show `d` (0..10, fractions roll). */
const Drum: React.FC<{d: number; x: number; y: number; smear?: number; lit?: boolean}> = ({d, x, y, smear = 0, lit}) => {
  const digits = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 0];
  const v = ((d % 10) + 10) % 10;
  return (
    <div style={{position: 'absolute', left: x, top: y, width: DW, height: DH, overflow: 'hidden', borderRadius: 14, backgroundColor: rgba(C.bg, 0.08)}}>
      <div className={TXT} style={{position: 'absolute', left: 0, top: -v * DH, width: DW, opacity: 1 - 0.6 * smear}}>
        {digits.map((g, i) => (
          <div key={i} style={{height: DH, lineHeight: `${DH}px`, textAlign: 'center', font: `600 128px ${F.sans}`, color: C.bg}}>
            {g}
          </div>
        ))}
      </div>
      {lit ? <div style={{position: 'absolute', left: 16, right: 16, bottom: 10, height: 7, borderRadius: 4, backgroundColor: toneLine('a')}} /> : null}
    </div>
  );
};

/** The odometer housing with six drums; `v` the reading, `roll` 0..1 smears the low drums while they spin. */
const Odo: React.FC<{v: number; y: number; roll?: number; lit?: boolean; scale?: number}> = ({v, y, roll = 0, lit, scale = 1}) => {
  const w = DW * 6 + GAP * 5 + 48;
  const x0 = CX - w / 2;
  // a real odometer's carry: a drum turns only while the drum to its right passes 9 -> 0
  const carry = (q: number) => Math.floor(q) + Math.min(1, Math.max(0, (q - Math.floor(q) - 0.9) / 0.1));
  const d5 = carry(v / 100000);
  const d4 = carry(v / 10000);
  const low = String(Math.round(v) % 10000).padStart(4, '0');
  return (
    <div className={OBJ} style={{position: 'absolute', left: x0, top: y, width: w, height: DH + 48, borderRadius: 30, backgroundColor: C.ink, transform: `scale(${scale})`, transformOrigin: '50% 50%'}}>
      <Drum d={d5} x={24} y={24} lit={lit} />
      <Drum d={d4} x={24 + DW + GAP} y={24} lit={lit} />
      {[0, 1, 2, 3].map((i) => (
        <Drum key={i} d={roll > 0.02 ? (Number(low[+i]) + 3 * i + 1) % 10 : Number(low[+i])} x={24 + (DW + GAP) * (i + 2)} y={24} smear={roll} />
      ))}
    </div>
  );
};

const RollShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, base, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const k = prog(frame, Math.max(base, 4), Math.max(30, hit + 26 - Math.max(base, 4)), ease.camera);
  const v = lerp(186400, 98400, k);
  const rolling = k > 0 && k < 1 ? 1 : 0;
  const arc = (a0: number, a1: number, r: number) => `M ${CX + r * Math.cos(a0)} ${830 + r * Math.sin(a0)} A ${r} ${r} 0 0 0 ${CX + r * Math.cos(a1)} ${830 + r * Math.sin(a1)}`;
  const spin = -frame * 0.06 * (1 - k);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.9 * appear}}>
          <g transform={`rotate(${(spin * 180) / Math.PI} ${CX} 830)`}>
            <path d={arc(-0.4, -2.6, 400)} fill="none" stroke={toneLine('a')} strokeWidth={8} strokeLinecap="round" />
            <path d={arc(2.74, 0.54, 400)} fill="none" stroke={toneLine('a')} strokeWidth={8} strokeLinecap="round" />
            <path d={`M ${CX + 400 * Math.cos(-2.6) - 26} ${830 + 400 * Math.sin(-2.6) - 6} l 26 6 l 4 -28`} fill="none" stroke={toneLine('a')} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
            <path d={`M ${CX + 400 * Math.cos(0.54) + 26} ${830 + 400 * Math.sin(0.54) + 6} l -26 -6 l -4 28`} fill="none" stroke={toneLine('a')} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
          </g>
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div style={{position: 'absolute', inset: 0, opacity: appear}}>
          <Odo v={v} y={830 - (DH + 48) / 2} roll={rolling} lit scale={1 + 0.03 * kick} />
          <div className={TXT} style={{position: 'absolute', left: 0, width: 1080, top: 830 + DH / 2 + 50, textAlign: 'center', font: `600 44px ${F.sans}`, color: C.ink2}}>{mtav('კმ')}</div>
        </div>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, width: 1080, top: 470, display: 'flex', justifyContent: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*უკან* ტრიალებს'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      <Sfx name="asmr-flap-roll" at={Math.max(base, 6)} volume={0.22} />
      <Sfx name="asmr-flap-roll" at={Math.max(base, 6) + 16} volume={0.18} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const LIT = [2, 3, 7];
const ThirdShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {frame, e, hit, appear} = useT(p, ctx);
  const bodies = ['sedan', 'suv', 'ev', 'hatch', 'coupe', 'sedan', 'ev', 'suv', 'hatch'] as const;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <IlloDefs uid={uid} />
          {bodies.map((b, i) => {
            const cx = 300 + (i % 3) * 240;
            const cy = 560 + Math.floor(i / 3) * 290;
            const a = spr(frame, e + i * 2, 'enter');
            const lit = LIT.includes(i) ? spr(frame, hit + LIT.indexOf(i) * 4, 'land') : 0;
            return (
              <g key={i} opacity={a}>
                <g transform={`translate(0 ${(1 - a) * 30})`}>
                  <Car uid={uid} x={cx} y={cy} len={250} view="top" body={b} paint={3} frame={frame} heading={0} shadow={false} />
                  {lit > 0 ? (
                    <g opacity={lit}>
                      <Car uid={uid} x={cx} y={cy} len={250} view="top" body={b} paint="a" frame={frame} heading={0} shadow={false} />
                      <rect className={OBJ} x={cx - 96} y={cy - 138} width={192} height={276} rx={34} fill="none" stroke={toneLine('a')} strokeWidth={6} transform={`translate(${cx} ${cy}) scale(${0.9 + 0.1 * lit}) translate(${-cx} ${-cy})`} />
                    </g>
                  ) : null}
                </g>
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      <Sfx name="asmr-pop" at={hit} volume={0.3} />
      <Sfx name="asmr-pop" at={hit + 4} volume={0.26} />
      <Sfx name="asmr-pop" at={hit + 8} volume={0.24} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </PictureBand>
  );
};

/** A small oil-can glyph. */
const OilCan: React.FC<{x: number; y: number; s: number; color: string}> = ({x, y, s, color}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} fill="none" stroke={color} strokeWidth={6 / s > 8 ? 8 : 6} strokeLinejoin="round" strokeLinecap="round">
    <path d="M -46 -10 h 54 l 30 -16 l 26 10 l -40 36 h -70 z" />
    <path d="M -34 -10 v -12 h 18 v 12" />
    <path d="M 70 4 q 4 14 0 20 q -4 -6 0 -20" fill={color} />
  </g>
);

const StickerShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, base, at, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const odo = spr(frame, at, 'enter');
  const num = spr(frame, hit, 'land');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <path d="M 120 380 L 960 380 L 960 520 Q 600 470 120 560 Z" fill={rgba(C.ink, 0.07)} />
          <path d="M 120 560 Q 600 470 960 520" fill="none" stroke={C.rule} strokeWidth={5} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: 250, top: 560, width: 580, height: 330, borderRadius: 26, backgroundColor: C.surface, border: `5px solid ${C.ink}`, opacity: appear, transform: `rotate(-2deg) scale(${1 + 0.03 * kick})`}}>
          <svg width={580} height={330} style={{position: 'absolute', inset: 0}}>
            <OilCan x={110} y={110} s={1.25} color={toneLine('a')} />
            <rect x={220} y={86} width={300} height={10} rx={5} fill={rgba(C.ink, 0.14)} />
            <rect x={220} y={118} width={220} height={10} rx={5} fill={rgba(C.ink, 0.14)} />
            <line x1={40} y1={190} x2={540} y2={190} stroke={C.rule} strokeWidth={4} strokeDasharray="12 10" />
          </svg>
          <div className={TXT} style={{position: 'absolute', left: 0, width: 580, top: 205, textAlign: 'center', font: `600 96px ${F.sans}`, color: C.ink, opacity: num, transform: `translateY(${(1 - num) * -40}px) scale(${1.25 - 0.25 * num})`}}>
            {grp(180000)}
          </div>
          <div className={TXT} style={{position: 'absolute', left: 0, width: 580, top: 228, textAlign: 'center', font: `600 72px ${F.sans}`, color: C.ink3, opacity: 1 - num}}>
            ··· ···
          </div>
        </div>
      </CameraLayer>
      <CameraLayer depth={1.15}>
        <div style={{position: 'absolute', inset: 0, opacity: odo, transform: `translateY(${(1 - odo) * 60}px)`}}>
          <Odo v={100000} y={1010} scale={0.78} />
        </div>
      </CameraLayer>
      <Sfx name="asmr-paper" at={Math.max(base, 2)} volume={0.24} />
      <Sfx name="asmr-knock" at={at} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const GapShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, e, base, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const X0 = 170;
  const X1 = 910;
  const xOf = (km: number) => X0 + ((km - 100000) / 80000) * (X1 - X0);
  const Y = 900;
  const grow = prog(frame, e + 8, 26, ease.enter);
  const red = prog(frame, hit, 10, ease.whipOut);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <line x1={X0} y1={Y} x2={X1} y2={Y} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          {Array.from({length: 9}, (_, i) => (
            <line key={i} x1={xOf(100000 + i * 10000)} y1={Y - (i % 4 === 0 ? 30 : 18)} x2={xOf(100000 + i * 10000)} y2={Y + (i % 4 === 0 ? 30 : 18)} stroke={i % 4 === 0 ? C.ink : C.ink2} strokeWidth={i % 4 === 0 ? 6 : 4} strokeLinecap="round" />
          ))}
          <rect x={xOf(100000)} y={Y - 150} width={(xOf(140000) - xOf(100000)) * grow} height={74} rx={18} fill={toneLine('a')} />
          <rect x={xOf(140000) + 8} y={Y - 150} width={(xOf(180000) - xOf(140000) - 8) * red} height={74} rx={18} fill={toneLine('down')} transform={`translate(0 ${-6 * kick})`} />
          <path d={`M ${xOf(140000)} ${Y - 190} V ${Y + 50}`} stroke={C.ink} strokeWidth={5} strokeDasharray="14 10" />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: xOf(100000), top: Y - 240, width: xOf(140000) - xOf(100000), textAlign: 'center', font: `600 50px ${F.sans}`, color: C.ink, opacity: appear * grow}}>
          {grp(40000)}
        </div>
        <div className={TXT} style={{position: 'absolute', left: xOf(140000), top: Y - 250, width: xOf(180000) - xOf(140000), textAlign: 'center', font: `700 72px ${F.sans}`, color: toneBig('down'), opacity: red, transform: `scale(${1.4 - 0.4 * red})`}}>
          ?
        </div>
        <div className={TXT} style={{position: 'absolute', left: X0 - 60, top: Y + 52, width: 240, textAlign: 'left', font: `600 44px ${F.sans}`, color: C.ink, opacity: appear}}>{grp(100000)}</div>
        <div className={TXT} style={{position: 'absolute', left: X1 - 200, top: Y + 52, width: 260, textAlign: 'right', font: `600 44px ${F.sans}`, color: C.ink, opacity: appear}}>{grp(180000)}</div>
      </CameraLayer>
      <Sfx name="asmr-swell" at={Math.max(base, e + 6)} volume={0.2} />
      <Sfx name="asmr-strike" at={hit} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const TyreShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, e, base, at, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const roll = spr(frame, e, 'enterXL');
  const x = CX + (1 - roll) * 260;
  const rot = (1 - roll) * 140 + frame * 0.15;
  const Y = 820;
  const R = 300;
  const ring = spr(frame, hit, 'land');
  const lab = spr(frame, at, 'enter');
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g transform={`translate(${x} ${Y}) rotate(${rot})`}>
            <circle r={R} fill={C.ink} />
            {Array.from({length: 36}, (_, i) => (
              <rect key={i} x={-14} y={-R - 2} width={28} height={30} rx={6} fill={C.ink} transform={`rotate(${i * 10})`} />
            ))}
            {Array.from({length: 36}, (_, i) => (
              <line key={`g${i}`} x1={0} y1={-R + 4} x2={0} y2={-R + 30} stroke={rgba(C.bg, 0.35)} strokeWidth={4} transform={`rotate(${i * 10 + 5})`} />
            ))}
            <circle r={R - 80} fill={C.surface} stroke={C.rule} strokeWidth={5} />
            {Array.from({length: 5}, (_, i) => (
              <path key={`s${i}`} d="M -18 -60 L -28 -200 Q 0 -212 28 -200 L 18 -60 Z" fill={rgba(C.ink, 0.16)} transform={`rotate(${i * 72})`} />
            ))}
            <circle r={58} fill={C.rule} />
            <circle r={18} fill={C.ink} />
          </g>
          <g opacity={ring}>
            <path d={`M ${x - (R - 40) * Math.cos(-2.2)} ${Y + (R - 40) * Math.sin(-2.2)} A ${R - 40} ${R - 40} 0 0 1 ${x + (R - 40) * Math.cos(-0.9)} ${Y + (R - 40) * Math.sin(-0.9)}`} fill="none" stroke={toneLine('a')} strokeWidth={14 + 4 * kick} strokeLinecap="round" />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <div className={TXT} style={{position: 'absolute', left: 0, width: 1080, top: 1170, textAlign: 'center', font: `600 64px ${F.sans}`, color: C.ink, opacity: lab, transform: `translateY(${(1 - lab) * 30}px)`}}>
          ≈{grp(32000)} {mtav('კმ')}
        </div>
      </Hud>
      {p.source ? <SourceLine text={p.source} at={Math.max(base, at + 6)} y={1300} /> : null}
      <Sfx name="asmr-air-long" at={Math.max(base, 0)} volume={0.18} />
      <Sfx name="asmr-knock" at={at} volume={0.24} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.25} />
    </PictureBand>
  );
};

const PedalShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, base, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const ring = spr(frame, hit, 'land');
  const PX = CX;
  const PY = 860;
  const W = 420;
  const H = 400;
  const ribs = 9;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <path d={`M ${PX - 40} 380 L ${PX + 40} 380 L ${PX + 30} ${PY - H / 2 + 10} L ${PX - 30} ${PY - H / 2 + 10} Z`} fill={rgba(C.ink, 0.55)} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g transform={`translate(${PX} ${PY}) scale(${1 + 0.025 * kick}) translate(${-PX} ${-PY})`}>
            <rect x={PX - W / 2} y={PY - H / 2} width={W} height={H} rx={48} fill={C.ink} />
            {Array.from({length: ribs}, (_, i) => {
              const y = PY - H / 2 + 44 + i * ((H - 88) / (ribs - 1));
              const mid = Math.abs(i - (ribs - 1) / 2) / ((ribs - 1) / 2);
              const worn = Math.max(0, 1 - mid * 1.2);
              return (
                <g key={i}>
                  <rect x={PX - W / 2 + 34} y={y - 7} width={W - 68} height={14} rx={7} fill={rgba(C.bg, 0.42 * (1 - 0.85 * worn))} />
                </g>
              );
            })}
            <ellipse cx={PX} cy={PY} rx={130} ry={100} fill={rgba(C.bg, 0.12)} />
          </g>
          <ellipse cx={PX} cy={PY} rx={190} ry={150} fill="none" stroke={toneLine('a')} strokeWidth={10} opacity={ring} transform={`translate(${PX} ${PY}) scale(${1.25 - 0.25 * ring}) translate(${-PX} ${-PY})`} />
        </svg>
      </CameraLayer>
      <Sfx name="asmr-knock" at={Math.max(base, 2)} volume={0.2} />
      <Land at={hit} />
      <Haptic kind="light" at={hit + 2} volume={0.25} />
    </PictureBand>
  );
};

/** A warning triangle glyph. */
const Warn: React.FC<{x: number; y: number; c: string}> = ({x, y, c}) => (
  <g transform={`translate(${x} ${y})`}>
    <path d="M 0 -26 L 28 22 L -28 22 Z" fill="none" stroke={c} strokeWidth={6} strokeLinejoin="round" />
    <line x1={0} y1={-8} x2={0} y2={6} stroke={c} strokeWidth={6} strokeLinecap="round" />
    <circle cx={0} cy={14} r={3.5} fill={c} />
  </g>
);

const MemoryShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, e, base, hit, appear} = useT(p, ctx);
  const kick = useKick();
  const X = 160;
  const W = 760;
  const LINE = 690; // the odometer's reading, as an x
  const rows = [0.46, 0.62, 1.0];
  const over = prog(frame, hit, 14, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <div className={OBJ} style={{position: 'absolute', left: X, top: 520, width: W, height: 640, borderRadius: 40, backgroundColor: C.ink, opacity: appear, transform: `scale(${(0.96 + 0.04 * appear) * (1 + 0.02 * kick)})`}}>
          <svg width={W} height={640} style={{position: 'absolute', inset: 0}}>
            {[0, 1, 2, 3].map((i) => (
              <rect key={`p${i}`} x={-14} y={120 + i * 120} width={20} height={44} rx={6} fill={rgba(C.bg, 0.4)} />
            ))}
            {rows.map((r, i) => {
              const y = 150 + i * 170;
              const g = prog(frame, e + 8 + i * 6, 18, ease.enter);
              const len = i === 2 ? lerp(LINE - X - 160, (LINE - X - 110) * 1.0 + 150, over) : (LINE - X - 120) * r;
              const bad = i === 2 ? over : 0;
              return (
                <g key={i}>
                  <Warn x={70} y={y} c={bad > 0.5 ? toneLine('down') : rgba(C.bg, 0.8)} />
                  <rect x={130} y={y - 14} width={Math.max(0, len * g)} height={28} rx={14} fill={bad > 0 ? toneLine('down') : rgba(C.bg, 0.55)} />
                </g>
              );
            })}
            <line x1={LINE - X} y1={70} x2={LINE - X} y2={590} stroke={toneLine('a')} strokeWidth={7} strokeDasharray="18 12" />
          </svg>
        </div>
        <div style={{position: 'absolute', inset: 0, opacity: appear}}>
          <div className={TXT} style={{position: 'absolute', left: LINE - 160, width: 320, top: 440, textAlign: 'center', font: `600 50px ${F.sans}`, color: C.ink}}>{grp(100000)}</div>
        </div>
      </CameraLayer>
      <Sfx name="asmr-tick-fine" at={Math.max(base, e + 8)} volume={0.2} />
      <Sfx name="asmr-tick-fine" at={Math.max(base, e + 14)} volume={0.2} />
      <Sfx name="asmr-count-roll" at={Math.max(base, hit - 4)} volume={0.2} />
      <Land at={hit + 12} />
      <Haptic kind="rigid" at={hit + 12} volume={0.3} />
    </PictureBand>
  );
};

/** The three checks as tiles. */
const Tile: React.FC<{x: number; y: number; kind: number; mark: number; ok: boolean}> = ({x, y, kind, mark, ok}) => {
  const s = 240;
  const c = C.ink;
  return (
    <g transform={`translate(${x} ${y})`}>
      <rect className={OBJ} x={-s / 2} y={-s / 2} width={s} height={s} rx={44} fill={C.surface} stroke={c} strokeWidth={6} />
      {kind === 0 ? (
        <g>
          <rect x={-70} y={-50} width={140} height={100} rx={16} fill="none" stroke={c} strokeWidth={6} />
          <rect x={-44} y={-22} width={88} height={10} rx={5} fill={c} />
          <rect x={-44} y={4} width={60} height={10} rx={5} fill={rgba(c, 0.5)} />
        </g>
      ) : kind === 1 ? (
        <g>
          <rect x={-56} y={-66} width={112} height={132} rx={22} fill={c} />
          {[0, 1, 2, 3, 4].map((i) => (
            <rect key={i} x={-40} y={-46 + i * 23} width={80} height={9} rx={4} fill={rgba(C.bg, i === 2 ? 0.1 : 0.45)} />
          ))}
        </g>
      ) : (
        <g>
          <rect x={-56} y={-56} width={112} height={112} rx={14} fill={c} />
          {[-36, -12, 12, 36].map((d) => (
            <g key={d}>
              <rect x={d - 5} y={-76} width={10} height={20} rx={3} fill={c} />
              <rect x={d - 5} y={56} width={10} height={20} rx={3} fill={c} />
            </g>
          ))}
        </g>
      )}
      <g opacity={mark} transform={`translate(${s / 2 - 30} ${-s / 2 + 30}) scale(${1.4 - 0.4 * mark})`}>
        <circle r={42} fill={ok ? toneLine('up') : toneLine('down')} />
        {ok ? (
          <path d="M -18 0 L -5 14 L 20 -14" fill="none" stroke={C.surface} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" />
        ) : (
          <path d="M -14 -14 L 14 14 M 14 -14 L -14 14" fill="none" stroke={C.surface} strokeWidth={8} strokeLinecap="round" />
        )}
      </g>
    </g>
  );
};

const VerdictShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const {frame, e, base, hit, appear} = useT(p, ctx);
  const ok = p.state === 'done';
  const two = p.shot === 'doubt';
  const pos = two
    ? [
        {x: 330, y: 830, s: 1.35},
        {x: 750, y: 830, s: 1.35},
      ]
    : [
        {x: 300, y: 700, s: 1},
        {x: 780, y: 700, s: 1},
        {x: 540, y: 1010, s: 1},
      ];
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {pos.map((q, i) => {
            const a = spr(frame, e + i * 3, 'enter');
            const m = spr(frame, hit + i * 7, 'land');
            return (
              <g key={i} opacity={a * appear} transform={`translate(${q.x} ${q.y + (1 - a) * 40}) scale(${q.s}) translate(${-q.x} ${-q.y})${two ? ` rotate(${i ? 3 : -3} ${q.x} ${q.y})` : ''}`}>
                <Tile x={q.x} y={q.y} kind={i} mark={m} ok={ok} />
              </g>
            );
          })}
        </svg>
      </CameraLayer>
      {pos.map((_, i) => (
        <Sfx key={i} name={ok ? 'asmr-check' : 'asmr-strike'} at={Math.max(base, hit + i * 7)} volume={0.26} />
      ))}
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </PictureBand>
  );
};

export const V131OdometerCheck: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const s = p.shot ?? 'roll';
  if (s === 'third') return <ThirdShot p={p} ctx={ctx} />;
  if (s === 'sticker') return <StickerShot p={p} ctx={ctx} />;
  if (s === 'gap') return <GapShot p={p} ctx={ctx} />;
  if (s === 'tyre') return <TyreShot p={p} ctx={ctx} />;
  if (s === 'pedal') return <PedalShot p={p} ctx={ctx} />;
  if (s === 'memory') return <MemoryShot p={p} ctx={ctx} />;
  if (s === 'verdict' || s === 'doubt') return <VerdictShot p={p} ctx={ctx} />;
  return <RollShot p={p} ctx={ctx} />;
};
