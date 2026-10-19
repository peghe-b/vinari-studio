// V112HaloBoot: a single-seater in side elevation, drawn as a clean diagram (look "diagram").
// phase "fire": the chassis parts behind the cockpit, the rear half drifts away and thin flame strokes rise in the gap
//   while a quiet counter runs up to `secs`.
// phase "hit": the whole car, the halo arc over the helmet in the film's accent; a slab of barrier rails falls onto the
//   cockpit and stops on the arc (hitAt): the camera kicks, the arc flares, the helmet under it stays where it was.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {C, F, L, rgba, toneLine, type Tone} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Smoke, Sparks} from '../illo/fx';

type P = {
  look?: 'diagram' | 'illustrated';
  phase?: 'fire' | 'hit';
  hitAt?: number | string;
  line?: string;
  label?: string;
  tone?: Tone;
  secs?: number;
};

const CY = 900; // the floor line of the car (stage y)
const SPLIT = 640;
const K = 0.84; // the car's drawing scale around (540, CY): the rear wing stays inside the frame // where the chassis parts in the fire phase
const APEX_X = 548;
const APEX_Y = CY - 214;

const NOSE = `M 150 ${CY - 18} L 300 ${CY - 52} L 430 ${CY - 92} L 470 ${CY - 112} L 520 ${CY - 112}`;
const FRONT_BODY = `${NOSE} L 600 ${CY - 112} L ${SPLIT} ${CY - 150} L ${SPLIT} ${CY} L 150 ${CY} Z`;
const REAR_BODY = `M ${SPLIT} ${CY - 150} L 680 ${CY - 196} L 720 ${CY - 190} L 900 ${CY - 96} L 900 ${CY} L ${SPLIT} ${CY} Z`;
const HALO = `M 612 ${CY - 120} C 606 ${CY - 222}, 500 ${CY - 236}, 468 ${CY - 168} L 446 ${CY - 112}`;

const Wheel: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => (
  <g>
    <circle cx={cx} cy={cy} r={r} fill={C.ink} />
    <circle cx={cx} cy={cy} r={r * 0.56} fill="none" stroke={C.bg} strokeWidth={2} />
    <circle cx={cx} cy={cy} r={r * 0.12} fill={C.bg} />
  </g>
);

const FrontHalf: React.FC<{haloColor: string; haloW: number}> = ({haloColor, haloW}) => (
  <g>
    {/* front wing */}
    <path d={`M 128 ${CY + 8} L 262 ${CY + 8} L 262 ${CY - 8} L 140 ${CY - 8} Z`} fill={C.ink} />
    <path d={FRONT_BODY} fill={rgba(C.ink, 0.06)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
    {/* the cockpit opening and the helmet */}
    <path d={`M 470 ${CY - 112} Q 545 ${CY - 96} 612 ${CY - 120}`} fill="none" stroke={C.ink} strokeWidth={2} />
    <circle cx={APEX_X - 4} cy={CY - 140} r={34} fill={C.ink} />
    <path d={`M ${APEX_X - 30} ${CY - 146} L ${APEX_X + 24} ${CY - 146}`} stroke={C.bg} strokeWidth={6} strokeLinecap="round" />
    {/* the halo: its arc and the centre pillar */}
    <path d={HALO} fill="none" stroke={haloColor} strokeWidth={haloW} strokeLinecap="round" strokeLinejoin="round" />
    <Wheel cx={300} cy={CY - 6} r={66} />
  </g>
);

const RearHalf: React.FC = () => (
  <g>
    <path d={REAR_BODY} fill={rgba(C.ink, 0.06)} stroke={C.ink} strokeWidth={2.5} strokeLinejoin="round" />
    {/* rear wing */}
    <path d={`M 872 ${CY - 250} L 938 ${CY - 250} L 938 ${CY - 214} L 872 ${CY - 214} Z`} fill={C.ink} />
    <path d={`M 904 ${CY - 214} L 904 ${CY - 100}`} stroke={C.ink} strokeWidth={4} />
    <Wheel cx={790} cy={CY - 12} r={78} />
  </g>
);

const Fire: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const appear = spr(frame, e, 'enterXL');
  const part = prog(frame, e + 6, 26, ease.enter);
  const dx = 80 * part;
  const rot = 4 * part;
  const flame = prog(frame, e + 12, 14, ease.enter);
  const secs = p.secs ?? 28;
  const runFrom = Math.max(base, e + 10);
  const runDur = Math.max(30, ctx.dur - (runFrom - e) - 12);
  const n = Math.round(secs * prog(frame, runFrom, runDur, ease.enter));
  const ringR = 92;
  const circ = 2 * Math.PI * ringR;
  const fill = n / secs;
  const uid = useId();
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <line x1={110} y1={CY + 4} x2={970} y2={CY + 4} stroke={C.rule} strokeWidth={1.5} />
          {Array.from({length: 18}, (_, i) => (
            <line key={i} x1={130 + i * 48} y1={CY + 4} x2={110 + i * 48} y2={CY + 24} stroke={C.rule} strokeWidth={1.2} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${K})`, transformOrigin: `540px ${CY}px`}}>
          {/* thin flame strokes rising in the gap */}
          {Array.from({length: 9}, (_, i) => {
            const x = SPLIT + 10 + (i * (dx + 20)) / 9;
            const h = (120 + 90 * Math.abs(Math.sin(frame / 5 + i * 1.7))) * flame;
            const sway = 14 * Math.sin(frame / 4 + i);
            return (
              <path
                key={i}
                d={`M ${x} ${CY} Q ${x + sway} ${CY - h / 2} ${x - sway * 0.6} ${CY - h}`}
                fill="none"
                stroke={toneLine('down')}
                strokeWidth={2.4}
                strokeLinecap="round"
                opacity={0.35 + 0.5 * Math.abs(Math.sin(frame / 6 + i))}
              />
            );
          })}
          <Smoke frame={frame} x={SPLIT + dx / 2} y={CY - 60} kind="smoke" n={7} rise={1.2} size={1.1} at={e + 10} uid={uid} />
          <FrontHalf haloColor={C.ink} haloW={7} />
          <g transform={`translate(${dx.toFixed(2)} 0) rotate(${rot.toFixed(2)} ${SPLIT} ${CY})`}>
            <RearHalf />
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <circle cx={540} cy={520} r={ringR} fill="none" stroke={C.rule} strokeWidth={2} />
          <circle
            cx={540}
            cy={520}
            r={ringR}
            fill="none"
            stroke={toneLine('down')}
            strokeWidth={5}
            strokeLinecap="round"
            strokeDasharray={`${(circ * fill).toFixed(2)} ${circ.toFixed(2)}`}
            transform={`rotate(-90 540 520)`}
          />
        </svg>
        <div className={TXT} style={{position: 'absolute', left: 340, width: 400, top: 470, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 92, lineHeight: '100px', color: C.ink, opacity: appear}}>
          {n}
        </div>
      </Hud>
      <Sfx name="asmr-paper-tear" at={Math.max(base, e + 6)} volume={0.3} />
      <Sfx name="asmr-swell" at={Math.max(base, e + 14)} volume={0.2} />
    </PictureBand>
  );
};

const Hit: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 2));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const label = prog(frame, e + 8, 16, ease.enter);
  // the rails fall in on an accelerating curve and stop on the halo's apex, then rebound a little
  const fall = prog(frame, hit - 16, 16, ease.whipIn);
  const back = frame >= hit ? 10 * Math.exp(-(frame - hit) / 6) * Math.sin((frame - hit) / 2.2) : 0;
  const ox = -330 * (1 - fall);
  const oy = -300 * (1 - fall) - back;
  const flare = frame >= hit ? Math.exp(-(frame - hit) / 14) : 0;
  const haloCol = toneLine('a');
  const uid = useId();
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: 0.6 * appear}}>
          <line x1={110} y1={CY + 4} x2={970} y2={CY + 4} stroke={C.rule} strokeWidth={1.5} />
          {Array.from({length: 18}, (_, i) => (
            <line key={i} x1={130 + i * 48} y1={CY + 4} x2={110 + i * 48} y2={CY + 24} stroke={C.rule} strokeWidth={1.2} />
          ))}
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${K})`, transformOrigin: `540px ${CY}px`}}>
          <FrontHalf haloColor={haloCol} haloW={9 + 5 * flare} />
          <RearHalf />
          {/* a bracket that names the arc before the hit */}
          <g opacity={label * (1 - flare * 0.8) * (frame < hit ? 1 : 0.4)}>
            <path d={`M ${APEX_X - 70} ${APEX_Y - 40} L ${APEX_X - 70} ${APEX_Y - 56} L ${APEX_X + 70} ${APEX_Y - 56} L ${APEX_X + 70} ${APEX_Y - 40}`} fill="none" stroke={C.ink2} strokeWidth={2} />
            <line x1={APEX_X} y1={APEX_Y - 56} x2={APEX_X} y2={APEX_Y - 96} stroke={C.ink2} strokeWidth={2} />
          </g>
          {/* the flare at the point of contact */}
          {Array.from({length: 10}, (_, i) => {
            const a = Math.PI + (i / 9) * Math.PI;
            const r0 = 22 + 30 * (1 - flare);
            const r1 = r0 + 46 * flare;
            return (
              <line
                key={i}
                x1={APEX_X + Math.cos(a) * r0}
                y1={APEX_Y - 8 + Math.sin(a) * r0}
                x2={APEX_X + Math.cos(a) * r1}
                y2={APEX_Y - 8 + Math.sin(a) * r1}
                stroke={haloCol}
                strokeWidth={3}
                strokeLinecap="round"
                opacity={flare}
              />
            );
          })}
          <Sparks frame={frame} x={APEX_X} y={APEX_Y - 8} at={hit} n={16} dir={-110} spread={80} power={0.8} tone="a" uid={uid} />
          <circle cx={APEX_X} cy={APEX_Y} r={30 + 40 * kick} fill="none" stroke={rgba(C.ink, 0.25 * flare)} strokeWidth={2} />
        </svg>
      </CameraLayer>
      {/* the foreground plane: the barrier's rails, a slab falling at a slant onto the cockpit */}
      <CameraLayer depth={1.3}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear * (frame >= hit - 16 ? 1 : 0), transform: `scale(${K})`, transformOrigin: `540px ${CY}px`}}>
          <g transform={`translate(${ox.toFixed(2)} ${oy.toFixed(2)}) rotate(-18 ${APEX_X} ${APEX_Y - 8})`}>
            {[0, 1, 2].map((k) => (
              <g key={k}>
                <rect x={APEX_X - 520} y={APEX_Y - 30 - k * 46} width={760} height={22} rx={3} fill={C.surface} stroke={C.ink} strokeWidth={2} />
                <line x1={APEX_X - 500} y1={APEX_Y - 19 - k * 46} x2={APEX_X + 220} y2={APEX_Y - 19 - k * 46} stroke={C.rule} strokeWidth={1.5} />
              </g>
            ))}
            {[-420, -200, 20].map((x, k) => (
              <rect key={k} x={APEX_X + x} y={APEX_Y - 140} width={16} height={120} fill={C.ink2} />
            ))}
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? 'ჰალო'} at={Math.max(base, e + 8)} style={{position: 'absolute', left: 540 + (APEX_X - 60 - 540) * K, top: CY + (APEX_Y - 150 - CY) * K, opacity: frame < hit ? 1 : 0}} />
        <div style={{position: 'absolute', left: L.camSafe.left, top: 1040, whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*ცოცხალი*'} at={hit} fx="slam" size={112} punchTone={p.tone ?? 'neutral'} />
        </div>
      </Hud>
      <Sfx name="asmr-air-long" at={Math.max(base, hit - 16)} volume={0.26} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.32} />
    </PictureBand>
  );
};

export const V112HaloBoot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.phase === 'fire' ? <Fire p={p} ctx={ctx} /> : <Hit p={p} ctx={ctx} />);
