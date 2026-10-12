// v99-office-print: "you print it yourself". Three moments of one ordinary A4 sheet, each its own picture:
//   phase "print": an office printer on a desk feeds out a plain A4 sheet with the windshield card printed on it in
//                  black and white; the sheet rises out of the slot on the hit, the status lamp in the film's accent.
//   phase "cut":   the sheet seen from above on the desk; a pair of scissors runs along the dashed line on the hit, the
//                  cut line turns solid behind the blades, then the card lifts off the sheet and turns square.
//   phase "tyre":  a parked coupe on a city street; on the hit its front corner sinks (the tyre going down, a hiss of
//                  air) while a passer-by walks in, stops and takes out a phone.
// Props: phase, look ("illustrated"), hitAt (chunk or "1.2s"), line ("*word*" punches), tone, cast, body.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba, accentsOn, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {MODULES, QN} from '../staging/qrParts';
import {Figure, type Cast} from '../illo/figure';
import {Car, type CarBody} from '../illo/car';
import {Smoke} from '../illo/fx';
import {acc, accRamp} from '../illo/palette';
import {FOOT, IlloBand, Svg, TOP} from '../illo/scene';
import {Shadow, Solid, rr} from '../illo/solid';

type P = {
  phase?: 'print' | 'cut' | 'tyre';
  look?: 'illustrated' | 'diagram';
  hitAt?: number | string;
  line?: string;
  tone?: Tone;
  cast?: Cast;
  body?: CarBody;
};

// the A4 sheet's shape (1 : 1.414)
const A4 = 1.414;

/** The printed card on the sheet: a QR-like code, two grey text bars, the dashed cut line (in sheet units 0..w). */
const CardPrint: React.FC<{x: number; y: number; w: number; h: number; cut: number; ink: string; rule: string}> = ({x, y, w, h, cut, ink, rule}) => {
  const q = w * 0.62;
  const qx = x + (w - q) / 2;
  const qy = y + w * 0.16;
  const m = q / QN;
  let d = '';
  for (const [r, c] of MODULES) d += `M${(qx + c * m).toFixed(1)} ${(qy + r * m).toFixed(1)}h${m.toFixed(2)}v${m.toFixed(2)}h${(-m).toFixed(2)}z`;
  const per = 2 * (w + h);
  const done = per * cut;
  return (
    <g>
      <path d={d} fill={ink} />
      <rect x={x + w * 0.19} y={qy + q + w * 0.1} width={w * 0.62} height={w * 0.06} rx={w * 0.02} fill={ink} opacity={0.85} />
      <rect x={x + w * 0.26} y={qy + q + w * 0.21} width={w * 0.48} height={w * 0.035} rx={w * 0.017} fill={ink} opacity={0.4} />
      {/* the dashed cut line, solid where the blades have passed */}
      <rect x={x} y={y} width={w} height={h} rx={w * 0.04} fill="none" stroke={rule} strokeWidth={2.2} strokeDasharray="12 9" />
      {cut > 0 ? (
        <rect x={x} y={y} width={w} height={h} rx={w * 0.04} fill="none" stroke={ink} strokeWidth={2.4} strokeDasharray={`${done.toFixed(1)} ${per.toFixed(1)}`} />
      ) : null}
    </g>
  );
};

/** A point along the card's outline (clockwise from the top left), t 0..1, and the direction there (degrees). */
const along = (x: number, y: number, w: number, h: number, t: number): [number, number, number] => {
  const per = 2 * (w + h);
  let s = ((t % 1) + 1) % 1 * per;
  if (s < w) return [x + s, y, 0];
  s -= w;
  if (s < h) return [x + w, y + s, 90];
  s -= h;
  if (s < w) return [x + w - s, y + h, 180];
  s -= w;
  return [x, y + h - s, 270];
};

/** Scissors pointing along +x, the pivot at 0,0; open 0..1. Handles in the object accent. */
const Scissors: React.FC<{uid: string; gap: number; handle: string}> = ({uid, gap, handle}) => {
  const a = 4 + 16 * gap;
  const blade = 'M0 -7 L120 -2 L122 2 L0 7 Z';
  return (
    <g>
      <g transform={`rotate(${-a})`}>
        <Solid uid={uid} d={blade} tone={2} shade="flat" />
        <ellipse cx={-62} cy={-6} rx={34} ry={24} fill="none" stroke={handle} strokeWidth={13} />
      </g>
      <g transform={`rotate(${a})`}>
        <Solid uid={uid} d={blade} tone={3} shade="flat" />
        <ellipse cx={-62} cy={6} rx={34} ry={24} fill="none" stroke={handle} strokeWidth={13} />
      </g>
      <circle cx={0} cy={0} r={6} fill={C.il6} />
    </g>
  );
};

const Punch: React.FC<{p: P; at: number; y: number}> = ({p, at, y}) =>
  p.line ? (
    <Hud>
      <div style={{position: 'absolute', left: L.camSafe.left, top: y, whiteSpace: 'nowrap'}}>
        <Words text={p.line} at={at} fx="slam" size={92} punchTone={p.tone ?? 'up'} />
      </div>
    </Hud>
  ) : null;

/** phase "print": the office printer feeding out the sheet. */
const Print: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const lampCol = accentsOn() ? accRamp(acc('a'), 2) : C.il5;
  // the sheet rises from the slot: a little before the hit it starts, on the hit it is out
  const out = prog(frame, hit - 26, 34, ease.enter);
  const SLOT = 900;
  const SW = 360;
  const SH = SW * A4;
  const sheetTop = SLOT - SH * out;
  const blink = frame < hit ? 0.35 + 0.65 * (Math.floor(frame / 8) % 2) : 1;
  const DESK = 1180;
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={DESK - TOP} fill={C.il1} />
          {/* a window's light on the office wall */}
          <rect x={690} y={300} width={300} height={420} rx={6} fill={C.il0} opacity={0.7} />
          <line x1={840} y1={300} x2={840} y2={720} stroke={C.il2} strokeWidth={6} />
          <line x1={690} y1={510} x2={990} y2={510} stroke={C.il2} strokeWidth={6} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={DESK} width={1480} height={FOOT - DESK} fill={C.il3} />
          <rect x={-200} y={DESK} width={1480} height={14} fill={C.il4} />
          <Shadow uid={uid} cx={540} cy={DESK + 6} rx={360} ry={26} />
          {/* the printer: a low graphite box, the output slot on top */}
          <Solid uid={uid} d={rr(220, 900, 640, 280, 36)} tone={5} rim outline />
          <Solid uid={uid} d={rr(250, 880, 580, 60, 24)} tone={6} rim outline />
          <rect x={360} y={SLOT - 6} width={360} height={12} rx={6} fill={C.il7} />
          <Solid uid={uid} d={rr(280, 1040, 520, 22, 11)} tone={6} shade="flat" />
          <circle cx={780} cy={980} r={11 + 3 * kick} fill={lampCol} opacity={blink} />
          {/* the sheet, clipped at the slot */}
          <clipPath id={`slot-${uid.replace(/[^A-Za-z0-9]/g, '')}`}>
            <rect x={0} y={0} width={1080} height={SLOT} />
          </clipPath>
          <g clipPath={`url(#slot-${uid.replace(/[^A-Za-z0-9]/g, '')})`}>
            <rect x={360} y={sheetTop} width={SW} height={SH} fill={C.il0} stroke={C.il3} strokeWidth={1.5} />
            <CardPrint x={360 + SW * 0.15} y={sheetTop + SH * 0.07} w={SW * 0.7} h={SH * 0.62} cut={0} ink={C.il7} rule={C.il4} />
          </g>
        </Svg>
      </CameraLayer>
      <Punch p={p} at={hit} y={1210} />
      <Sfx name="asmr-paper" at={Math.max(base, hit - 24)} volume={0.4} />
      <Land at={hit} />
      <Haptic kind="light" at={hit} volume={0.25} />
    </IlloBand>
  );
};

/** phase "cut": the sheet from above, the scissors on the dashed line, the card lifting off. */
const Cut: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? 1));
  const handle = accentsOn() ? accRamp(acc('a'), 3) : C.il5;
  const start = Math.max(e, base);
  const run = prog(frame, start, Math.max(20, hit - start + 8), ease.inOut);
  const lift = spr(frame, hit + 10, 'land');
  const SW = 640;
  const SH = SW * A4;
  const sx = 540 - SW / 2;
  const sy = 840 - SH / 2;
  const cw = SW * 0.62;
  const ch = SH * 0.56;
  const cx = sx + (SW - cw) / 2;
  const cy = sy + SH * 0.12;
  const [px, py, dirDeg] = along(cx, cy, cw, ch, run * 0.98 + 0.01);
  const snip = 0.5 + 0.5 * Math.sin(frame / 2.2);
  const scissorsOut = prog(frame, hit + 6, 14, ease.enter);
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={FOOT - TOP} fill={C.il3} />
          {/* the desk's grain, quiet */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <line key={i} x1={-200} y1={TOP + 300 + i * 330} x2={1280} y2={TOP + 340 + i * 330} stroke={C.il4} strokeWidth={2} opacity={0.5} />
          ))}
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <g transform={`rotate(-3 540 840)`}>
            <rect x={sx + 8} y={sy + 12} width={SW} height={SH} fill={rgba(C.il7, 0.12)} />
            <rect x={sx} y={sy} width={SW} height={SH} fill={C.il0} />
            {/* the hole the card leaves once lifted */}
            <rect x={cx} y={cy} width={cw} height={ch} rx={cw * 0.04} fill={C.il2} opacity={lift} />
            <g transform={`translate(${(-14 * lift).toFixed(1)} ${(-40 * lift).toFixed(1)}) rotate(${(3 * lift).toFixed(2)} ${cx + cw / 2} ${cy + ch / 2})`}>
              {lift > 0 ? <rect x={cx + 10} y={cy + 18} width={cw} height={ch} rx={cw * 0.04} fill={rgba(C.il7, 0.16 * lift)} /> : null}
              <rect x={cx} y={cy} width={cw} height={ch} rx={cw * 0.04} fill={C.il0} />
              <CardPrint x={cx} y={cy} w={cw} h={ch} cut={run} ink={C.il7} rule={C.il4} />
            </g>
          </g>
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1.3}>
        <Svg>
          <g opacity={1 - scissorsOut} transform={`rotate(-3 540 840) translate(${px.toFixed(1)} ${py.toFixed(1)}) rotate(${dirDeg})`}>
            <Scissors uid={uid} gap={frame < hit + 6 ? snip : 0.1} handle={handle} />
          </g>
        </Svg>
      </CameraLayer>
      <Punch p={p} at={hit} y={1230} />
      <Sfx name="asmr-paper-tear" at={Math.max(base, start + 2)} volume={0.28} />
      <Sfx name="asmr-paper" at={hit + 10} volume={0.36} />
      <Haptic kind="light" at={hit + 10} volume={0.25} />
    </IlloBand>
  );
};

/** phase "tyre": a parked coupe sinking at the front corner, a passer-by walking in and taking out a phone. */
const Tyre: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const GROUND = 1180;
  const LEN = 820;
  const CX = 600;
  const sag = prog(frame, e, Math.max(30, hit - e + 10), ease.inOut);
  const walk = prog(frame, e, Math.max(24, hit - e), ease.out);
  const manX = 60 + 120 * walk;
  return (
    <IlloBand uid={uid}>
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-200} y={TOP} width={1480} height={GROUND - TOP} fill={C.il2} />
          {/* a building's face: tall windows in rhythm */}
          {[0, 1, 2, 3, 4].map((i) => (
            <g key={i}>
              <rect x={-40 + i * 250} y={360} width={150} height={300} rx={4} fill={C.il3} />
              <rect x={-40 + i * 250} y={760} width={150} height={300} rx={4} fill={C.il3} />
            </g>
          ))}
          <rect x={-200} y={1080} width={1480} height={GROUND - 1080} fill={C.il3} />
        </Svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <Svg>
          <rect x={-200} y={GROUND} width={1480} height={FOOT - GROUND} fill={C.il4} />
          <rect x={-200} y={GROUND + 120} width={1480} height={8} fill={C.il5} />
          <Shadow uid={uid} cx={CX} cy={GROUND + 2} rx={LEN * 0.48} ry={20} />
          <Car uid={uid} x={CX} y={GROUND} len={LEN} body={p.body ?? 'coupe'} paint="a" view="side" dir={1} frame={frame} pitch={2.6 * sag} />
          <Smoke uid={uid} frame={frame} x={CX + LEN * 0.31} y={GROUND - 20} kind="steam" n={5} size={0.5} rise={0.4} spread={0.6} at={hit - 14} />
          <Shadow uid={uid} cx={manX} cy={GROUND + 2} rx={90} />
          <Figure
            uid={uid}
            cast={p.cast ?? {is: 'man', outfit: 'overcoat', hat: 'flatCap'}}
            x={manX}
            y={GROUND}
            size={600}
            frame={frame}
            acts={[
              {at: e, pose: 'walk', turn: 0.8},
              {at: hit, pose: 'phoneLook', turn: 0.5},
            ]}
          />
        </Svg>
      </CameraLayer>
      <Punch p={p} at={hit} y={440} />
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 16)} volume={0.3} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </IlloBand>
  );
};

export const V99OfficePrint: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) =>
  p.phase === 'cut' ? <Cut p={p} ctx={ctx} /> : p.phase === 'tyre' ? <Tyre p={p} ctx={ctx} /> : <Print p={p} ctx={ctx} />;
