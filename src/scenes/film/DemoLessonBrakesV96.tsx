// DemoLessonBrakesV96: the brake system as ONE clean diagram that moves on step by step (the 2026-10-12 lesson demo).
// The pedal hangs behind the firewall, its rod pushes the master cylinder's piston, the fluid carries the push down the
// line to the caliper on the disc. The spec's props pick the step and the framing, so the same drawing explains each
// step from its own camera position:
//   pressAt  the foot presses: the push runs down the line as a pulse (accent a), the caliper squeezes, the disc stops
//   waterAt  droplets from the air sink through the cap into the reservoir, the fluid takes dots of water (accent b)
//   heatAt   the disc heats up (accent a, a shimmer above it)
//   boilAt   vapour bubbles grow in the line and the caliper
//   failAt   the foot presses again: the pedal goes to the toe board, the bubbles squash, the push never arrives,
//            the disc keeps turning (a red ring where the pad hits the floor)
//   view {x, y, zoom}  the framing (the pedal, the reservoir, the caliper or the whole); tags [{part, text, at}] part
//   labels (pedal, reservoir, cylinder, line, caliper, disc); line + hitAt the punch in the Hud.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C, F, L, rgba, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {acc, accRamp} from '../illo/palette';
import type {SceneCtx} from '../../types';

type Tag = {part: string; text: string; at?: number | string};
type P = {
  pressAt?: number | string;
  waterAt?: number | string;
  heatAt?: number | string;
  boilAt?: number | string;
  failAt?: number | string;
  water?: boolean; // the fluid already holds water (a later step)
  heat?: boolean; // the disc is already hot
  bubbles?: boolean; // the bubbles are already there
  view?: {x?: number; y?: number; zoom?: number};
  tags?: Tag[];
  line?: string;
  hitAt?: number | string;
  tone?: Tone;
};

// stage units
const PIV = {x: 430, y: 540}; // the pedal's pivot under the dash
const ARM = {x: -130, y: 450}; // pivot to the pad, at rest
const FIRE = 470; // the firewall
const ROD = 150; // the pushrod
const MC = {x0: 500, x1: 720, y0: 598, y1: 662}; // the master cylinder
const RES = {x0: 560, x1: 690, y0: 474, y1: 572}; // the reservoir
const LINE = 'M 720 630 H 842 Q 860 630 860 648 V 1030';
const DISC = {x: 716, y: 1100, r: 138};
const CAL = {x0: 822, x1: 902, y0: 1030, y1: 1170};
const HEEL = {x: 214, y: 1112};
const PRESS_DEG = 6;
const FLOOR_DEG = 15.5;
const BUBBLES = [
  {x: 860, y: 700, r: 5},
  {x: 860, y: 768, r: 7},
  {x: 860, y: 834, r: 5.5},
  {x: 860, y: 896, r: 7.5},
  {x: 860, y: 958, r: 6},
  {x: 860, y: 1004, r: 5},
  {x: 800, y: 630, r: 4.5},
];
const TUBE = 26; // the line's outer width, stage units at every zoom (the bubbles live inside it)
const BORE = 19;
const DOTS = [
  {x: 590, y: 528},
  {x: 622, y: 548},
  {x: 660, y: 520},
  {x: 640, y: 556},
  {x: 600, y: 556},
  {x: 676, y: 546},
  {x: 760, y: 630},
  {x: 860, y: 760},
  {x: 860, y: 880},
  {x: 690, y: 630},
];
type Anchor = {x: number; y: number; tx: number; ty: number};
const anchorOf = (part: string): Anchor | null => {
  if (part === 'pedal') return {x: 352, y: 800, tx: 180, ty: 700};
  if (part === 'reservoir') return {x: 690, y: 500, tx: 740, ty: 470};
  if (part === 'cylinder') return {x: 600, y: 662, tx: 612, ty: 762};
  if (part === 'line') return {x: 860, y: 850, tx: 800, ty: 884};
  if (part === 'caliper') return {x: 824, y: 1042, tx: 650, ty: 935};
  if (part === 'disc') return {x: 716, y: 1238, tx: 520, ty: 1250};
  return null;
};

const rot = (v: {x: number; y: number}, deg: number) => {
  const a = (-deg * Math.PI) / 180;
  return {x: v.x * Math.cos(a) - v.y * Math.sin(a), y: v.x * Math.sin(a) + v.y * Math.cos(a)};
};

export const DemoLessonBrakesV96: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const at = (v: number | string | undefined) => (v === undefined ? null : Math.max(base + 6, cueFrame(ctx, v)));
  const pressF = at(p.pressAt);
  const waterF = at(p.waterAt);
  const heatF = at(p.heatAt);
  const boilF = at(p.boilAt);
  const failF = at(p.failAt);
  const hitF = at(p.hitAt);
  const on = accentsOn();
  const accA = acc('a');
  const accB = acc('b');
  const red = toneLine('down');
  const fluid = rgba(C.ink2, 0.42);

  // the pedal: pressed a little (it works) or all the way to the floor (it does not)
  const press = pressF === null ? 0 : spr(frame, pressF, 'land');
  const fail = failF === null ? 0 : prog(frame, failF, 16, ease.enter);
  const deg = PRESS_DEG * press * (1 - fail) + FLOOR_DEG * fail;
  const arm = rot(ARM, deg);
  const pad = {x: PIV.x + arm.x, y: PIV.y + arm.y};
  const ux = arm.x / Math.hypot(arm.x, arm.y);
  const uy = arm.y / Math.hypot(arm.x, arm.y);
  const att = {x: PIV.x + arm.x * 0.2, y: PIV.y + arm.y * 0.2};
  const rodEnd = att.x + ROD;
  // the push in the line: a pulse that reaches the caliper, or dies in the bubbles
  const pulse = pressF === null ? -1 : prog(frame, pressF + 4, 16, ease.enter);
  const failPulse = failF === null ? -1 : prog(frame, failF + 4, 14, ease.enter) * 0.6;
  const clamp = pressF === null ? 0 : spr(frame, pressF + 18, 'tap');
  // the disc spins until the caliper clamps; on a failed press it keeps spinning
  const stopAt = pressF === null ? null : pressF + 18;
  const spin = stopAt === null || frame < stopAt ? (frame - e) * 4.2 : (stopAt - e) * 4.2 + 26 * (1 - Math.exp(-(frame - stopAt) / 6));
  const water = p.water ? 1 : waterF === null ? 0 : prog(frame, waterF + 14, 30, ease.enter);
  const heat = p.heat ? 1 : heatF === null ? 0 : prog(frame, heatF, 26, ease.enter);
  const boil = p.bubbles ? 1 : boilF === null ? 0 : 1;
  const squash = fail;
  const appear = spr(frame, e, 'enterXL');
  const fx = p.view?.x ?? 520;
  const fy = p.view?.y ?? 850;
  const z = p.view?.zoom ?? 1;
  const view = `translate(540 ${L.contentMid}) scale(${z.toFixed(3)}) translate(${-fx} ${-fy})`;
  const lw = (w: number) => w / Math.sqrt(z); // lines a little finer when pushed in
  const ink = C.ink;
  const discCol = on && heat > 0 ? accRamp(accA, lerp(5, 2, heat)) : C.surface;
  // the shoe: from the heel on the floor to the pad's face
  // the pad's face looks back at the driver: n, perpendicular to the arm, pointing left
  const nx = -uy;
  const ny = ux;
  const toe = {x: pad.x + nx * 16, y: pad.y + ny * 16};
  const sx = toe.x - HEEL.x;
  const sy = toe.y - HEEL.y;
  const sl = Math.hypot(sx, sy);
  const sa = (Math.atan2(sy, sx) * 180) / Math.PI;
  const ring = failF === null ? 0 : prog(frame, failF + 12, 16, ease.enter);

  return (
    <PictureBand camera={false}>
      {/* far plane: a quiet dot grid, drifting less than the drawing */}
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.55 * appear}}>
          {Array.from({length: 12}, (_, i) =>
            Array.from({length: 14}, (_, j) => <circle key={`${i}-${j}`} cx={110 + i * 80} cy={400 + j * 72} r={1.6} fill={C.rule} />),
          )}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <g transform={view}>
            {/* the floor, the toe board and the firewall */}
            <path d={`M 120 1118 H 352 L 470 976 V 470`} fill="none" stroke={C.ink2} strokeWidth={lw(3)} strokeLinejoin="round" />
            {Array.from({length: 9}, (_, i) => (
              <line key={i} x1={130 + i * 26} y1={1122} x2={116 + i * 26} y2={1140} stroke={C.rule} strokeWidth={lw(1.5)} />
            ))}
            {/* the shoe, heel on the floor, the ball on the pad */}
            <g transform={`translate(${HEEL.x} ${HEEL.y}) rotate(${sa.toFixed(2)})`}>
              <path
                d={`M -6 0 Q -10 -40 30 -50 L ${sl - 46} -64 Q ${sl + 4} -66 ${sl + 4} -30 L ${sl + 2} 2 Z`}
                fill={C.surface}
                stroke={ink}
                strokeWidth={lw(2.2)}
                strokeLinejoin="round"
              />
              <line x1={4} y1={-4} x2={sl} y2={-4} stroke={C.ink2} strokeWidth={lw(4)} strokeLinecap="round" />
            </g>
            {/* the pedal arm and pad */}
            <line x1={PIV.x} y1={PIV.y} x2={pad.x} y2={pad.y} stroke={ink} strokeWidth={lw(9)} strokeLinecap="round" />
            <line x1={pad.x + nx * 8 - ux * 36} y1={pad.y + ny * 8 - uy * 36} x2={pad.x + nx * 8 + ux * 30} y2={pad.y + ny * 8 + uy * 30} stroke={ink} strokeWidth={lw(16)} strokeLinecap="round" />
            <circle cx={PIV.x} cy={PIV.y} r={13} fill={C.surface} stroke={ink} strokeWidth={lw(2.4)} />
            {/* the pushrod through the firewall */}
            <line x1={att.x} y1={att.y} x2={rodEnd} y2={630} stroke={ink} strokeWidth={lw(5)} strokeLinecap="round" />
            <circle cx={att.x} cy={att.y} r={6} fill={ink} />
            {/* the master cylinder: the fluid ahead of the piston, the piston, the body */}
            <rect x={rodEnd + 16} y={MC.y0 + 6} width={MC.x1 - rodEnd - 22} height={MC.y1 - MC.y0 - 12} fill={fluid} />
            <rect x={MC.x0} y={MC.y0} width={MC.x1 - MC.x0} height={MC.y1 - MC.y0} rx={12} fill="none" stroke={ink} strokeWidth={lw(2.4)} />
            <rect x={rodEnd} y={MC.y0 + 6} width={16} height={MC.y1 - MC.y0 - 12} rx={3} fill={ink} />
            {/* the reservoir with its fluid, the neck and the cap */}
            <rect x={RES.x0 + 4} y={512} width={RES.x1 - RES.x0 - 8} height={RES.y1 - 516} rx={10} fill={fluid} />
            <line x1={RES.x0 + 10} y1={512} x2={RES.x1 - 10} y2={512} stroke={C.ink2} strokeWidth={lw(1.6)} />
            <rect x={RES.x0} y={RES.y0} width={RES.x1 - RES.x0} height={RES.y1 - RES.y0} rx={14} fill="none" stroke={ink} strokeWidth={lw(2.4)} />
            <rect x={613} y={RES.y1} width={24} height={MC.y0 - RES.y1} fill={fluid} stroke={ink} strokeWidth={lw(2)} />
            <rect x={598} y={458} width={54} height={16} rx={4} fill={C.surface} stroke={ink} strokeWidth={lw(2.2)} />
            <line x1={620} y1={458} x2={630} y2={458} stroke={C.bg} strokeWidth={lw(4)} />
            {/* the line: tube, fluid, and the push travelling in it */}
            <path d={LINE} fill="none" stroke={ink} strokeWidth={TUBE} strokeLinejoin="round" />
            <path d={LINE} fill="none" stroke={C.bg} strokeWidth={BORE} strokeLinejoin="round" />
            <path d={LINE} fill="none" stroke={fluid} strokeWidth={BORE} strokeLinejoin="round" />
            {pulse > 0 && pulse < 1 ? (
              <path d={LINE} pathLength={1} fill="none" stroke={on ? accA : ink} strokeWidth={BORE} strokeDasharray={`0.16 1`} strokeDashoffset={-(pulse * 1.04 - 0.16)} />
            ) : null}
            {failPulse > 0 && failPulse < 0.6 ? (
              <path
                d={LINE}
                pathLength={1}
                fill="none"
                stroke={on ? accA : ink}
                strokeWidth={BORE}
                strokeDasharray={`0.12 1`}
                strokeDashoffset={-(failPulse - 0.12)}
                opacity={1 - prog(frame, failF! + 10, 10)}
              />
            ) : null}
            {/* water from the air: drops through the cap, then dots in the fluid */}
            {waterF !== null
              ? [0, 1, 2].map((k) => {
                  const t0 = waterF + k * 7;
                  const t = prog(frame, t0, 18, ease.exit);
                  if (frame < t0 || t >= 1) return null;
                  return <path key={k} d="M 0 -12 C 6 -4 8 0 8 3 A 8 8 0 0 1 -8 3 C -8 0 -6 -4 0 -12 Z" transform={`translate(${615 + k * 10} ${lerp(392, 500, t)})`} fill={on ? accB : C.ink2} opacity={1 - t * 0.4} />;
                })
              : null}
            {water > 0
              ? DOTS.map((d, k) => <circle key={k} cx={d.x} cy={d.y} r={3.4} fill={on ? accB : C.ink} opacity={water * (k < 6 ? 1 : 0.8) * prog(frame, (waterF ?? 0) + 14 + k * 2, 8)} />)
              : null}
            {/* the disc: hat, bolts and drilled holes turning; hot in the accent */}
            <g transform={`translate(${DISC.x} ${DISC.y})`}>
              {heat > 0 ? <circle r={DISC.r + 16} fill="none" stroke={on ? rgba(accA, 0.35 * heat) : rgba(C.ink, 0.2 * heat)} strokeWidth={lw(10)} /> : null}
              <circle r={DISC.r} fill={discCol} stroke={ink} strokeWidth={lw(2.6)} />
              <circle r={DISC.r - 18} fill="none" stroke={on && heat > 0.4 ? accRamp(accA, 5) : C.rule} strokeWidth={lw(1.4)} />
              <g transform={`rotate(${spin.toFixed(2)})`}>
                {Array.from({length: 10}, (_, k) => {
                  const a = (k / 10) * Math.PI * 2;
                  return <circle key={k} cx={Math.cos(a) * 92} cy={Math.sin(a) * 92} r={6} fill={C.bg} stroke={ink} strokeWidth={lw(1.6)} />;
                })}
                <circle r={54} fill={C.surface} stroke={ink} strokeWidth={lw(2.2)} />
                {Array.from({length: 5}, (_, k) => {
                  const a = (k / 5) * Math.PI * 2;
                  return <circle key={k} cx={Math.cos(a) * 32} cy={Math.sin(a) * 32} r={5.5} fill={ink} />;
                })}
                <circle r={13} fill={C.bg} stroke={ink} strokeWidth={lw(2)} />
              </g>
            </g>
            {heat > 0
              ? [0, 1, 2].map((k) => {
                  const ph = ((frame - (heatF ?? e)) / 30 + k / 3) % 1;
                  const x = DISC.x - 60 + k * 60;
                  const y = DISC.y - DISC.r - 20 - ph * 90;
                  return (
                    <path
                      key={k}
                      d={`M ${x} ${y} q 10 -14 0 -28 q -10 -14 0 -28`}
                      fill="none"
                      stroke={on ? accA : C.ink2}
                      strokeWidth={lw(2.2)}
                      strokeLinecap="round"
                      opacity={heat * Math.sin(ph * Math.PI) * 0.8}
                    />
                  );
                })
              : null}
            {/* the caliper squeezing the disc's edge */}
            <g transform={`translate(${(CAL.x0 + CAL.x1) / 2} ${(CAL.y0 + CAL.y1) / 2}) scale(${(1 - 0.05 * clamp * (1 - fail)).toFixed(4)} 1)`}>
              <rect x={-(CAL.x1 - CAL.x0) / 2} y={-(CAL.y1 - CAL.y0) / 2} width={CAL.x1 - CAL.x0} height={CAL.y1 - CAL.y0} rx={18} fill={C.surface} stroke={ink} strokeWidth={lw(2.6)} />
              <rect x={-30} y={-52} width={12} height={104} rx={4} fill={clamp > 0.3 && fail === 0 ? ink : C.ink2} />
            </g>
            {/* the vapour: bubbles grow in the line, squash on the failed press */}
            {boil
              ? BUBBLES.map((b, k) => {
                  const g = p.bubbles ? 1 : spr(frame, boilF! + k * 3, 'land');
                  const r = b.r * g;
                  if (r <= 0.2) return null;
                  return <ellipse key={k} cx={b.x} cy={b.y} rx={r * (1 + 0.2 * squash)} ry={r * (1 - 0.45 * squash)} fill={C.bg} stroke={ink} strokeWidth={lw(1.6)} />;
                })
              : null}
            {/* the floor hit on a failed press */}
            {ring > 0 && ring < 1 ? <circle cx={pad.x + 12} cy={pad.y + 14} r={20 + 70 * ring} fill="none" stroke={red} strokeWidth={lw(2.4)} opacity={1 - ring} /> : null}
            {/* the part labels */}
            {(p.tags ?? []).map((t, k) => {
              const a = anchorOf(t.part);
              if (!a) return null;
              const f0 = Math.max(e + 6, t.at === undefined ? e + 10 + k * 6 : cueFrame(ctx, t.at));
              const o = prog(frame, f0, 10);
              if (o <= 0) return null;
              const size = 40 / Math.sqrt(z);
              return (
                <g key={k} opacity={o}>
                  <line x1={a.x} y1={a.y} x2={a.tx + 6} y2={a.ty + 8} stroke={C.ink2} strokeWidth={lw(1.4)} />
                  <circle cx={a.x} cy={a.y} r={lw(4)} fill={C.ink2} />
                  <text className={TXT} x={a.tx} y={a.ty} fontFamily={F.mono} fontSize={size} fill={C.ink} textAnchor={a.tx < a.x ? 'end' : 'start'} letterSpacing="0.06em">
                    {mtav(t.text)}
                  </text>
                </g>
              );
            })}
          </g>
        </svg>
      </CameraLayer>
      {p.line && hitF !== null ? (
        <Hud>
          <div style={{position: 'absolute', left: L.camSafe.left, top: 420, whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hitF} fx="slam" size={80} punchTone={p.tone ?? 'down'} />
          </div>
        </Hud>
      ) : null}
      {pressF !== null ? <Sfx name="asmr-detent" at={pressF} volume={0.4} /> : null}
      {pressF !== null ? <Land at={pressF + 18} volume={0.35} /> : null}
      {waterF !== null ? [0, 1, 2].map((k) => <Sfx key={k} name="asmr-tap" at={waterF + k * 7 + 16} volume={0.22} />) : null}
      {heatF !== null ? <Sfx name="asmr-swell" at={heatF} volume={0.26} /> : null}
      {boilF !== null ? <Sfx name="asmr-shimmer" at={boilF} volume={0.3} /> : null}
      {failF !== null ? <Sfx name="asmr-sub" at={failF} volume={0.4} /> : null}
      {failF !== null ? <Land at={failF + 12} volume={0.5} /> : null}
      {failF !== null ? <Haptic kind="heavy" at={failF + 12} /> : null}
    </PictureBand>
  );
};
