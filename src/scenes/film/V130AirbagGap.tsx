// v130-airbag-gap: the airbag explained as one diagram that moves on. Two views of the same part:
// - "hub", "once", "zone", "gap": the steering wheel in side section, the folded bag in its hub, the seat back across the
//   cabin and a ruler between them in centimetres (14 px a cm). "hub": the bag sits folded and pulses; "once": it blooms
//   on hitAt, then sags empty and a "1x" lands; "zone": the bag blooms and the first 8 cm turn into a hatched red zone;
//   "gap": the seat slides back from `from` cm to `to` cm on hitAt and the ruler turns green.
// - "wall", "dud": the wheel face-on over a speed scale 0..30 km/h with the 13..23 band shaded; a marker slides to
//   `speed` on `at`; past 13 the bag blooms out of the hub ("wall"), or stays shut and the hub turns red ("dud").
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx, SourceLine} from '../common';
import {C, L, rgba, toneBig, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {F} from '../../tokens';
import {acc, accRamp} from '../illo/palette';
import type {SceneCtx} from '../../types';

type P = {
  look?: 'diagram';
  shot?: 'hub' | 'empty' | 'once' | 'zone' | 'gap' | 'wall' | 'light' | 'dud';
  at?: number | string;
  hitAt?: number | string;
  speed?: number;
  from?: number;
  to?: number;
  line?: string;
  source?: string;
  tone?: Tone;
};

const CM = 14;
const HX = 400; // the hub in the side section (the column's foot stays well inside the frame)
const HY = 800;

/** The steering wheel in side section: the rim tilted back, the column running down to the dash. */
const WheelSide: React.FC<{hubCol: string}> = ({hubCol}) => (
  <g>
    <line x1={HX - 40} y1={HY + 20} x2={HX - 190} y2={HY + 230} stroke={C.ink2} strokeWidth={22} strokeLinecap="round" />
    <rect x={HX - 220} y={HY + 210} width={100} height={130} rx={22} fill={rgba(C.ink, 0.08)} stroke={C.ink2} strokeWidth={5} />
    <g transform={`rotate(-18 ${HX} ${HY})`}>
      <rect x={HX - 26} y={HY - 190} width={52} height={380} rx={26} fill={C.surface} stroke={C.ink} strokeWidth={8} />
      <rect x={HX - 12} y={HY - 62} width={44} height={124} rx={14} fill={hubCol} stroke={C.ink} strokeWidth={5} />
    </g>
  </g>
);

/** The bag: folded (k 0) to full (k 1), sag 0..1 empties it. Shaded on the accent ramp, never a flat fill. */
const Bag: React.FC<{k: number; sag: number}> = ({k, sag}) => {
  if (k <= 0.01) return null;
  const col = acc('a');
  const rx = 40 + 170 * k * (1 - 0.55 * sag);
  const ry = 60 + 170 * k * (1 - 0.45 * sag);
  const cx = HX + 20 + rx * 0.92;
  const cy = HY + 40 * sag;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill={accRamp(col, 2 + 2 * sag)} stroke={accRamp(col, 5)} strokeWidth={5} />
      <ellipse cx={cx - rx * 0.25} cy={cy - ry * 0.35} rx={rx * 0.45} ry={ry * 0.3} fill={accRamp(col, 1)} opacity={0.55 * (1 - sag)} />
      {sag > 0.05 ? <path d={`M ${cx - rx * 0.6} ${cy} q ${rx * 0.3} ${-ry * 0.3 * sag} ${rx * 0.6} 0 t ${rx * 0.6} 0`} fill="none" stroke={accRamp(col, 6)} strokeWidth={5} strokeLinecap="round" /> : null}
    </g>
  );
};

/** The seat back: a padded shape whose front edge is at x. */
const Seat: React.FC<{x: number}> = ({x}) => (
  <g>
    <path d={`M ${x} ${HY - 300} q 60 -40 120 0 l 40 560 q -80 30 -170 0 z`} fill={rgba(C.ink, 0.1)} stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
    <rect x={x + 10} y={HY - 400} width={90} height={110} rx={36} fill={rgba(C.ink, 0.1)} stroke={C.ink} strokeWidth={6} />
    <line x1={x} y1={HY - 240} x2={x} y2={HY + 230} stroke={C.ink} strokeWidth={8} strokeLinecap="round" />
  </g>
);

const Label: React.FC<{text: string; x: number; y: number; size?: number; o?: number; color?: string; anchor?: 'start' | 'middle'}> = ({text, x, y, size = 40, o = 1, color, anchor = 'middle'}) => (
  <div className={TXT} style={{position: 'absolute', left: anchor === 'middle' ? x - 300 : x, top: y, width: anchor === 'middle' ? 600 : 'auto', textAlign: anchor === 'middle' ? 'center' : 'left', whiteSpace: 'nowrap', fontFamily: F.sans, fontWeight: 600, fontSize: size, color: color ?? C.ink, opacity: o}}>
    {mtav(text)}
  </div>
);

const Side: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const shot = p.shot ?? 'hub';
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const from = p.from ?? (shot === 'gap' ? 14 : 25);
  const to = p.to ?? 25;
  const slide = shot === 'gap' ? prog(frame, hit, 22, ease.enter) : 0;
  const gapCm = from + (to - from) * slide;
  const seatX = HX + 30 + gapCm * CM;
  // the bag
  let bag = 0;
  let sag = 0;
  if (shot === 'hub') bag = 0;
  if (shot === 'once' || shot === 'zone') bag = prog(frame, hit, 6, ease.whipOut);
  if (shot === 'once') sag = prog(frame, hit + 22, 26, ease.enter);
  const zone = shot === 'zone' ? prog(frame, hit + 8, 14, ease.enter) : 0;
  const fold = shot === 'hub' ? 0.5 + 0.5 * Math.sin(frame / 7) : 0;
  const hollow = shot === 'empty' ? prog(frame, hit, 10, ease.enter) : 0;
  const hubCol = shot === 'hub' ? accRamp(acc('a'), 2 + fold) : hollow > 0 ? rgba(toneLine('down'), 0.12 + 0.2 * hollow) : C.surface;
  const good = shot === 'gap' && slide > 0.95;
  const rulerCol = good ? toneLine('up') : C.ink;
  const showRuler = shot === 'gap' || shot === 'zone';
  const rulerY = HY + 300;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <line x1={140} y1={HY + 380} x2={940} y2={HY + 380} stroke={C.rule} strokeWidth={4} />
          <rect x={120} y={HY - 470} width={840} height={20} rx={10} fill={rgba(C.ink, 0.07)} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <Seat x={seatX} />
          {zone > 0 ? (
            <g opacity={zone}>
              <rect x={HX + 20} y={HY - 260} width={8 * CM * zone} height={520} fill={rgba(toneLine('down'), 0.22)} />
              {Array.from({length: 7}, (_, i) => (
                <line key={i} x1={HX + 20} y1={HY - 240 + i * 75} x2={HX + 20 + 8 * CM * zone} y2={HY - 280 + i * 75} stroke={toneLine('down')} strokeWidth={4} opacity={0.7} />
              ))}
              <line x1={HX + 20 + 8 * CM * zone} y1={HY - 260} x2={HX + 20 + 8 * CM * zone} y2={HY + 260} stroke={toneLine('down')} strokeWidth={6} />
            </g>
          ) : null}
          {hollow > 0 ? <ellipse cx={HX + 213} cy={HY} rx={193} ry={213} fill="none" stroke={toneLine('down')} strokeWidth={6} strokeDasharray="22 18" opacity={hollow} /> : null}
          <Bag k={bag} sag={sag} />
          <WheelSide hubCol={hubCol} />
          {showRuler ? (
            <g>
              <line x1={HX + 20} y1={rulerY} x2={seatX} y2={rulerY} stroke={rulerCol} strokeWidth={6} />
              <line x1={HX + 20} y1={rulerY - 24} x2={HX + 20} y2={rulerY + 24} stroke={rulerCol} strokeWidth={6} />
              <line x1={seatX} y1={rulerY - 24} x2={seatX} y2={rulerY + 24} stroke={rulerCol} strokeWidth={6} />
              {Array.from({length: Math.floor(gapCm / 5)}, (_, i) => (
                <line key={i} x1={HX + 20 + (i + 1) * 5 * CM} y1={rulerY - 12} x2={HX + 20 + (i + 1) * 5 * CM} y2={rulerY + 12} stroke={rulerCol} strokeWidth={4} />
              ))}
            </g>
          ) : null}
        </svg>
      </CameraLayer>
      <Hud>
        {showRuler ? (
          <div className={TXT} style={{position: 'absolute', left: (HX + 20 + seatX) / 2 - 200, top: rulerY + 34, width: 400, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: 64, color: good ? toneBig('up') : C.ink, opacity: appear}}>
            {`${Math.round(gapCm)} სმ`}
          </div>
        ) : null}
        {zone > 0 ? <Label text="8 სმ" x={HX + 20 + 4 * CM} y={HY - 340} size={56} o={zone} color={toneBig('down')} /> : null}
        {shot === 'once' ? (
          <div className={TXT} style={{position: 'absolute', left: 640, top: 430, fontFamily: F.sans, fontWeight: 700, fontSize: 150, color: C.ink, opacity: prog(frame, hit + 30, 10), transform: `scale(${(1 + 0.12 * kick).toFixed(3)})`}}>
            1×
          </div>
        ) : null}
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 1250, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={72} />
          </div>
        ) : null}
      </Hud>
      {p.source ? <SourceLine text={p.source} at={Math.max(base, e + 8)} y={1310} /> : null}
      {shot !== 'hub' ? <Sfx name={shot === 'gap' ? 'asmr-slide' : 'asmr-drop'} at={Math.max(base, hit)} volume={shot === 'gap' ? 0.3 : 0.22} /> : <Sfx name="asmr-swell" at={Math.max(base, e + 6)} volume={0.2} />}
      {shot !== 'hub' ? <Land at={Math.max(base, hit + 2)} /> : null}
      <Haptic kind="rigid" at={Math.max(base, hit + 2)} volume={0.3} />
    </PictureBand>
  );
};

const SX0 = 180;
const SX1 = 900;
const SY = 1130;
const WX = 540;
const WY = 720;
const px = (kmh: number) => SX0 + ((SX1 - SX0) * kmh) / 30;

const Face: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const dud = p.shot === 'dud';
  const go = Math.max(base + 6, cueFrame(ctx, p.at ?? 0));
  const hit = Math.max(go + 8, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const speed = p.speed ?? 18;
  const v = speed * prog(frame, go, Math.max(8, hit - go), ease.enter);
  const passed = v >= 13;
  const bag = !dud && passed ? prog(frame, hit, 6, ease.whipOut) : 0;
  const bad = dud && frame >= hit ? 1 : 0;
  const col = acc('a');
  const band = prog(frame, e + 6, 14, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.5 * appear}}>
          <circle cx={WX} cy={WY} r={290} fill="none" stroke={C.rule} strokeWidth={4} />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <circle cx={WX} cy={WY} r={230} fill="none" stroke={C.ink} strokeWidth={34} />
          <line x1={WX - 210} y1={WY + 40} x2={WX - 70} y2={WY + 20} stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
          <line x1={WX + 210} y1={WY + 40} x2={WX + 70} y2={WY + 20} stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
          <line x1={WX} y1={WY + 90} x2={WX} y2={WY + 215} stroke={C.ink} strokeWidth={26} strokeLinecap="round" />
          <circle cx={WX} cy={WY} r={84} fill={bad ? rgba(toneLine('down'), 0.2) : C.surface} stroke={bad ? toneLine('down') : C.ink} strokeWidth={8} />
          {bag > 0 ? (
            <g>
              <circle cx={WX} cy={WY} r={84 + 150 * bag} fill={accRamp(col, 2)} stroke={accRamp(col, 5)} strokeWidth={5} />
              <circle cx={WX - 50 * bag} cy={WY - 60 * bag} r={60 * bag} fill={accRamp(col, 1)} opacity={0.6} />
            </g>
          ) : null}
          <rect x={px(13)} y={SY - 34} width={(px(23) - px(13)) * band} height={68} rx={10} fill={rgba(col, 0.3)} />
          <line x1={SX0} y1={SY} x2={SX1} y2={SY} stroke={C.ink} strokeWidth={6} strokeLinecap="round" />
          {[0, 5, 10, 15, 20, 25, 30].map((k) => (
            <line key={k} x1={px(k)} y1={SY - 16} x2={px(k)} y2={SY + 16} stroke={C.ink2} strokeWidth={4} />
          ))}
          <path d={`M ${px(v)} ${SY - 30} l -22 -40 l 44 0 z`} fill={passed ? (dud ? toneLine('down') : C.ink) : C.ink2} />
        </svg>
      </CameraLayer>
      <Hud>
        <Label text="13" x={px(13)} y={SY + 34} size={44} o={band} />
        <Label text="23" x={px(23)} y={SY + 34} size={44} o={band} />
        <Label text="კმ/სთ" x={SX0} y={SY + 34} size={40} o={appear} color={C.ink2} anchor="start" />
        {p.line ? (
          <div style={{position: 'absolute', left: L.camSafe.left, top: 410, whiteSpace: 'nowrap', transform: `scale(${(1 + 0.06 * kick).toFixed(3)})`}}>
            <Words text={p.line} at={hit} fx="slam" size={72} />
          </div>
        ) : null}
      </Hud>
      {p.source ? <SourceLine text={p.source} at={Math.max(base, e + 8)} y={1300} /> : null}
      <Sfx name="asmr-count-roll" at={Math.max(base, go)} volume={0.2} />
      <Sfx name={dud ? 'asmr-knock' : 'asmr-drop'} at={Math.max(base, hit)} volume={0.22} />
      <Land at={Math.max(base, hit + 2)} />
      <Haptic kind="rigid" at={Math.max(base, hit + 2)} volume={0.3} />
    </PictureBand>
  );
};

export const V130AirbagGap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.shot === 'wall' || p.shot === 'light' || p.shot === 'dud' ? <Face p={p} ctx={ctx} /> : <Side p={p} ctx={ctx} />;
