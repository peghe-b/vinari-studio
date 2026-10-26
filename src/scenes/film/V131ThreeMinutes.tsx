// V131ThreeMinutes: Le Mans 2016, the leading Toyota's last three minutes, seen from the seat of the prototype and counted
// by the rule. One export, a "shot" each beat:
//   THE COCKPIT (look "illustrated", full bleed): the track through the screen at the top, the light cowl below, the helm
//   with its shift lights, its dash (P1 and the clock) and its warning lamp. The shots are cameras and moments of it:
//     clock  close on the dash: P1, the clock counting down from p.clock (3:00), the lights twitch with the sputter
//     road   the track ahead from the seat, the kerbs and the centre line streaming at race speed
//     helm   the wide cockpit, every light lit, the track streaming
//     dash   closer, from the left grip across the lit dash, the track streaming past the pillar
//     lights the lights die from the right on hitAt, the track slows
//     lamp   close on the dash's corner: the lamp blinks, the clock still running
//     stop   the wide cockpit, all dark: the track stops on hitAt and the P1 goes out
//     win    the wide cockpit two years on: the lights sweep back on and the P1 burns
//     flag   the track ahead, the chequered flag waving over it
//   THE RULE (look "diagram", the clean field):
//     sand   an hourglass of six minutes; the sand runs out on hitAt
//     lap    the last lap as one thick bar, the marker short of the flag when time is up, the rest of it turning red
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C, F, rgba, toneLine} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import {OBJ, TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type Shot = 'clock' | 'road' | 'helm' | 'dash' | 'lights' | 'lamp' | 'stop' | 'win' | 'flag' | 'sand' | 'lap';
type P = {
  shot?: Shot;
  hitAt?: number | string;
  line?: string;
  clock?: number; // the dash clock's seconds at the shot's first frame (180 = 3:00)
};

const LEDS = 15;
const HY = 220; // the helm's drop below its drawing coordinates
const HORIZON = 430;
const SCREEN_FOOT = 790; // where the cowl starts in the wide view

// each camera: zoom and the stage point it zooms about (close shots keep the helm's foot over the subtitle band)
const CAMS: Record<string, {z: number; fx: number; fy: number}> = {
  clock: {z: 2, fx: 540, fy: 1150},
  lights: {z: 1.6, fx: 540, fy: 1060},
  lamp: {z: 2, fx: 700, fy: 1150},
  dash: {z: 1.4, fx: 330, fy: 1030},
  helm: {z: 1, fx: 540, fy: 960},
  stop: {z: 1, fx: 540, fy: 960},
  win: {z: 1, fx: 540, fy: 960},
};

const clockText = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

/** The track seen through the screen: sky, the far trees, the tarmac in perspective, the kerbs and the centre line. */
const Track: React.FC<{run: number; foot: number; horizon: number; flag?: number; frame: number}> = ({run, foot, horizon, flag = 0, frame}) => {
  const depth = foot - horizon;
  const dashes = [];
  for (let i = 0; i < 9; i++) {
    const z = (((i / 9 + run) % 1) + 1) % 1;
    const y = horizon + depth * z * z;
    const h = 6 + 70 * z * z;
    const w = 3 + 22 * z * z;
    dashes.push(<rect key={i} x={540 - w / 2} y={y} width={w} height={h} fill={C.bg} opacity={0.9} />);
  }
  const kerbs = [];
  for (let i = 0; i < 14; i++) {
    const z0 = (((i / 14 + run * 1.4) % 1) + 1) % 1;
    const z1 = Math.min(1, z0 + 1 / 28);
    const y0 = horizon + depth * z0 * z0;
    const y1 = horizon + depth * z1 * z1;
    for (const side of [-1, 1]) {
      const x0 = 540 + side * (40 + 760 * z0 * z0);
      const x1 = 540 + side * (40 + 760 * z1 * z1);
      const k0 = 540 + side * (40 + 860 * z0 * z0);
      const k1 = 540 + side * (40 + 860 * z1 * z1);
      kerbs.push(<path key={`${i}${side}`} d={`M${x0} ${y0} L${k0} ${y0} L${k1} ${y1} L${x1} ${y1} Z`} fill={i % 2 ? C.ink : C.bg} />);
    }
  }
  const wave = (x: number) => 10 * Math.sin(frame / 5 + x / 40);
  return (
    <g>
      <rect x={-400} y={-400} width={1880} height={horizon + 400} fill={C.bg} />
      <rect x={-400} y={horizon - 120} width={1880} height={120} fill={rgba(C.ink, 0.05)} />
      <path d={`M-400 ${horizon} L-400 ${horizon - 40} Q-200 ${horizon - 90} 0 ${horizon - 50} Q160 ${horizon - 100} 330 ${horizon - 46} Q470 ${horizon - 80} 600 ${horizon - 40} Q760 ${horizon - 96} 900 ${horizon - 50} Q1100 ${horizon - 90} 1480 ${horizon - 44} L1480 ${horizon} Z`} fill={rgba(C.ink, 0.2)} />
      <rect x={-400} y={horizon} width={1880} height={depth + 1200} fill={rgba(C.ink, 0.1)} />
      <path d={`M500 ${horizon} L580 ${horizon} L${540 + 820} ${foot} L${540 - 820} ${foot} Z`} fill={rgba(C.ink, 0.32)} />
      {kerbs}
      {dashes}
      {flag > 0 ? (
        <g opacity={flag} transform={`translate(0 ${(1 - flag) * 60})`}>
          <rect x={348} y={250} width={12} height={300} rx={6} fill={C.ink} />
          {Array.from({length: 6}, (_, c) =>
            Array.from({length: 4}, (_, r) => (
              <rect key={`${c}${r}`} x={360 + c * 56} y={258 + r * 50 + wave(c * 56)} width={56} height={50} fill={(c + r) % 2 ? C.bg : C.ink} />
            )),
          )}
          <rect x={360} y={256 + wave(0)} width={336} height={6} fill={C.ink} />
        </g>
      ) : null}
    </g>
  );
};

/** The helm with its lights, its dash and its lamp (drawn about x 540, y 540..1080, then dropped by HY). */
const HelmParts: React.FC<{on: number; lamp: number; pos: number; clock: string; clockOn: number; frame: number}> = ({on, lamp, pos, clock, clockOn, frame}) => {
  const lit = accentsOn() ? toneLine('a') : toneLine('up');
  const off = rgba(C.bg, 0.16);
  return (
    <g transform={`translate(0 ${HY})`}>
      <rect x={170} y={560} width={150} height={500} rx={70} fill={C.ink} />
      <rect x={760} y={560} width={150} height={500} rx={70} fill={C.ink} />
      <path d="M250 600 Q250 540 330 540 L750 540 Q830 540 830 600 L830 970 Q830 1040 750 1040 L660 1040 Q600 990 540 990 Q480 990 420 1040 L330 1040 Q250 1040 250 970 Z" fill={C.ink} />
      {Array.from({length: LEDS}, (_, i) => {
        const x = 330 + (i * 420) / (LEDS - 1);
        const burn = i < on;
        return (
          <g key={i}>
            {burn ? <circle cx={x} cy={590} r={22} fill={rgba(lit, 0.3)} /> : null}
            <circle cx={x} cy={590} r={12} fill={burn ? lit : off} />
          </g>
        );
      })}
      <rect x={370} y={640} width={340} height={250} rx={22} fill={C.shade} stroke={rgba(C.bg, 0.25)} strokeWidth={4} />
      <rect x={660} y={656} width={34} height={34} rx={8} fill={lamp ? toneLine('down') : off} />
      {[300, 780].map((x) => (
        <g key={x}>
          <circle cx={x} cy={700} r={24} fill={rgba(C.bg, 0.14)} />
          <circle cx={x} cy={790} r={18} fill={rgba(C.bg, 0.22)} />
          <circle cx={x} cy={870} r={18} fill={rgba(C.bg, 0.22)} />
        </g>
      ))}
      <circle cx={440} cy={940} r={30} fill="none" stroke={rgba(C.bg, 0.3)} strokeWidth={6} />
      <circle cx={640} cy={940} r={30} fill="none" stroke={rgba(C.bg, 0.3)} strokeWidth={6} />
      <line x1={440} y1={940} x2={440 + 22 * Math.sin(frame / 20)} y2={940 - 22 * Math.cos(frame / 20)} stroke={rgba(C.bg, 0.5)} strokeWidth={6} strokeLinecap="round" />
      <line x1={640} y1={940} x2={640} y2={912} stroke={rgba(C.bg, 0.5)} strokeWidth={6} strokeLinecap="round" />
      <text className={TXT} x={540} y={790} textAnchor="middle" fontFamily={F.sans} fontWeight={800} fontSize={120} fill={C.bg} opacity={pos}>
        P1
      </text>
      {clock ? (
        <text className={TXT} x={540} y={862} textAnchor="middle" fontFamily={F.mono} fontWeight={600} fontSize={56} fill={rgba(C.bg, 0.85)} opacity={clockOn}>
          {clock}
        </text>
      ) : null}
    </g>
  );
};

const Cockpit: React.FC<{p: P; ctx: SceneCtx; shot: Shot}> = ({p, ctx, shot}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const t = Math.max(0, frame - e);
  const view = shot === 'road' || shot === 'flag';
  // the run of the track (its phase) and how fast it streams: a race, an engine dying, a stop
  const speedAt = (f: number) => {
    if (shot === 'stop') return 0.25 * (1 - prog(f, hit, 16, ease.enter));
    if (shot === 'lights') return 1 - 0.55 * prog(f, hit, 30);
    if (shot === 'lamp') return 0.38;
    if (shot === 'flag') return 0.5;
    return 1;
  };
  let run = 0;
  for (let f = 0; f < frame; f++) run += 0.022 * speedAt(f);
  // the lights, the lamp, the P1, the clock
  let on = LEDS;
  if (shot === 'clock') on = frame >= hit && frame < hit + 14 && Math.floor(frame / 2) % 2 === 0 ? 9 : LEDS;
  else if (shot === 'lights') on = Math.round(LEDS * (1 - prog(frame, hit, 22, ease.enter))) - (frame < hit && Math.floor(frame / 3) % 5 === 0 ? 2 : 0);
  else if (shot === 'lamp' || shot === 'stop') on = 0;
  else if (shot === 'win') on = Math.round(LEDS * prog(frame, hit - 8, 16, ease.enter));
  const lamp = shot === 'lamp' ? (Math.floor(t / 6) % 2 === 0 ? 1 : 0) : shot === 'stop' ? 1 : shot === 'lights' && frame >= hit ? (Math.floor((frame - hit) / 5) % 2 === 0 ? 1 : 0) : 0;
  const pos = shot === 'stop' ? 1 - 0.85 * prog(frame, hit, 10) : shot === 'win' ? 0.45 + 0.55 * prog(frame, hit, 10) : 1;
  const secs = Math.max(0, (p.clock ?? 180) - Math.floor(t / 30));
  const clock = shot === 'win' ? '' : clockText(secs);
  const clockOn = shot === 'stop' ? 1 - prog(frame, hit, 10) : 1;
  // the engine's tremble while it runs, a jolt when it coughs
  const alive = shot === 'stop' ? 0 : shot === 'lamp' ? 0.4 : shot === 'lights' ? 1 - prog(frame, hit, 24) : 1;
  const shake = alive * 1.4 * Math.sin(frame * 2.3);
  const coughAt = shot === 'clock' || shot === 'lights' ? hit : -999;
  const jolt = frame >= coughAt ? 12 * Math.exp(-(frame - coughAt) / 5) * Math.sin((frame - coughAt) * 1.7) : 0;
  const appear = spr(frame, e, 'enterXL');
  const cam = shot === 'clock' ? CAMS.clock : shot === 'lights' ? CAMS.lights : shot === 'lamp' ? CAMS.lamp : shot === 'dash' ? CAMS.dash : CAMS.helm;
  const z = cam.z * (1.06 - 0.06 * appear) * (1 + 0.012 * kick);
  const flag = shot === 'flag' ? spr(frame, hit - 6, 'land') : 0;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={view ? `translate(540 ${HORIZON}) scale(${(1.02 + 0.02 * appear).toFixed(4)}) translate(-540 ${-HORIZON})` : `translate(${cam.fx} ${cam.fy}) scale(${z.toFixed(4)}) translate(${-cam.fx} ${-cam.fy})`}>
            <Track run={run} foot={view ? 1290 : SCREEN_FOOT} horizon={view ? 640 : HORIZON} flag={flag} frame={frame} />
          </g>
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          <g transform={view ? '' : `translate(${(cam.fx + shake + jolt).toFixed(2)} ${cam.fy}) scale(${z.toFixed(4)}) translate(${-cam.fx} ${-cam.fy})`}>
            {/* the cowl: the light interior under the screen, down past the frame's foot */}
            <path d={view ? 'M-400 1300 Q540 1236 1480 1300 L1480 2400 L-400 2400 Z' : `M-400 ${SCREEN_FOOT} Q540 ${SCREEN_FOOT - 70} 1480 ${SCREEN_FOOT} L1480 2400 L-400 2400 Z`} fill={C.bg} />
            <path d={view ? 'M-400 1300 Q540 1236 1480 1300 L1480 2400 L-400 2400 Z' : `M-400 ${SCREEN_FOOT} Q540 ${SCREEN_FOOT - 70} 1480 ${SCREEN_FOOT} L1480 2400 L-400 2400 Z`} fill={rgba(C.ink, 0.1)} />
            <path d={view ? 'M-400 1300 Q540 1236 1480 1300' : `M-400 ${SCREEN_FOOT} Q540 ${SCREEN_FOOT - 70} 1480 ${SCREEN_FOOT}`} fill="none" stroke={rgba(C.ink, 0.35)} strokeWidth={6} />
            {/* the screen's pillars */}
            <path d="M-400 -400 L120 -400 L-20 900 L-400 900 Z" fill={rgba(C.ink, 0.86)} />
            <path d="M1480 -400 L960 -400 L1100 900 L1480 900 Z" fill={rgba(C.ink, 0.86)} />
            {view ? null : (
              <g className={cam.z === 1 ? OBJ : undefined}>
                <HelmParts on={on} lamp={lamp} pos={pos} clock={clock} clockOn={clockOn} frame={frame} />
              </g>
            )}
          </g>
        </svg>
      </CameraLayer>
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: view ? 880 : 400, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={84} />
          </div>
        </Hud>
      ) : null}
      {shot === 'lights' ? <Sfx name="real-sputter" at={Math.max(base, hit - 4)} volume={0.45} /> : null}
      {shot === 'road' ? <Sfx name="real-pass-by" at={Math.max(base, e)} volume={0.35} /> : null}
      {shot === 'lamp' ? <Sfx name="asmr-haptic-warning" at={Math.max(base, hit)} volume={0.35} /> : null}
      {shot === 'stop' ? <Sfx name="asmr-whoomp" at={Math.max(base, hit)} volume={0.35} /> : null}
      {shot === 'win' ? <Sfx name="asmr-shimmer" at={Math.max(base, hit - 6)} volume={0.3} /> : null}
      {shot === 'flag' ? <Sfx name="asmr-swell" at={Math.max(base, hit - 8)} volume={0.25} /> : null}
      <Land at={hit} />
      <Haptic kind={shot === 'win' || shot === 'flag' ? 'success' : 'rigid'} at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

const TOP_BULB = 'M384 470 L696 470 Q696 650 556 772 L524 772 Q384 650 384 470 Z';
const LOW_BULB = 'M524 792 L556 792 Q696 914 696 1094 L384 1094 Q384 914 524 792 Z';

/** The six minutes: an hourglass on the clean field, the sand gone on hitAt. */
const Sand: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId().replace(/:/g, '');
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 20, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const k = prog(frame, e, Math.max(1, hit - e), ease.drift);
  const topY = 540 + (772 - 540) * k;
  const lowY = 1094 - (1094 - 900) * k;
  const tip = 6 * prog(frame, hit, 10, ease.enter);
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `translateY(24px) rotate(${tip.toFixed(2)}deg) scale(${(0.94 + 0.06 * appear + 0.015 * kick).toFixed(4)})`, transformOrigin: '540px 800px'}}>
          <defs>
            <clipPath id={`${uid}t`}>
              <path d={TOP_BULB} />
            </clipPath>
            <clipPath id={`${uid}b`}>
              <path d={LOW_BULB} />
            </clipPath>
          </defs>
          <rect x={330} y={430} width={420} height={36} rx={12} fill={C.ink} />
          <rect x={330} y={1098} width={420} height={36} rx={12} fill={C.ink} />
          <rect x={344} y={466} width={14} height={632} rx={7} fill={C.ink} />
          <rect x={722} y={466} width={14} height={632} rx={7} fill={C.ink} />
          <g clipPath={`url(#${uid}t)`}>
            <rect x={380} y={topY} width={320} height={772 - topY + 2} fill={C.ink2} />
          </g>
          <g clipPath={`url(#${uid}b)`}>
            <path d={`M380 1100 L380 ${lowY + 60} Q540 ${lowY - 40} 700 ${lowY + 60} L700 1100 Z`} fill={C.ink2} />
          </g>
          {k < 1 ? <line x1={540} y1={772} x2={540} y2={lowY + 10} stroke={C.ink2} strokeWidth={6} /> : null}
          <path d={TOP_BULB} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
          <path d={LOW_BULB} fill="none" stroke={C.ink} strokeWidth={6} strokeLinejoin="round" />
        </svg>
      </CameraLayer>
      <Hud>
        <div style={{position: 'absolute', left: 0, width: 1080, top: 1200, textAlign: 'center', whiteSpace: 'nowrap'}}>
          <Words text={p.line ?? '*6:00*'} at={hit} fx="slam" size={84} />
        </div>
      </Hud>
      <Sfx name="asmr-air" at={Math.max(base, e + 2)} volume={0.2} />
      <Sfx name="asmr-strike" at={Math.max(base, hit)} volume={0.32} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

/** The last lap as one bar: the marker crawls, the time is up before the flag, the rest of the lap turns red. */
const Lap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 8, cueFrame(ctx, p.hitAt ?? '0.4s'));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const mark = 0.55 + 0.27 * prog(frame, e, Math.max(1, hit - e), ease.enter) + 0.05 * prog(frame, hit, 50);
  const x0 = 170;
  const x1 = 830;
  const mx = x0 + (x1 - x0) * mark;
  const late = prog(frame, hit, 8);
  const cy = 820;
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${(0.94 + 0.06 * appear + 0.02 * kick).toFixed(4)})`, transformOrigin: `540px ${cy}px`}}>
          <rect x={x0} y={cy - 20} width={x1 - x0} height={40} rx={20} fill={rgba(C.ink, 0.14)} />
          <rect x={mx} y={cy - 20} width={Math.max(0, x1 - mx)} height={40} rx={20} fill={toneLine('down')} opacity={late} />
          <rect x={x0} y={cy - 20} width={mx - x0} height={40} rx={20} fill={C.ink} />
          <path d={`M${mx - 30} ${cy - 46} L${mx + 34} ${cy} L${mx - 30} ${cy + 46} Z`} fill={C.ink} />
          {[0, 1, 2, 3].map((r) =>
            [0, 1, 2].map((c) => <rect key={`${r}${c}`} x={x1 + 20 + c * 24} y={cy - 150 + r * 24} width={24} height={24} fill={(r + c) % 2 ? C.bg : C.ink} />),
          )}
          <rect x={x1 + 18} y={cy - 152} width={76} height={100} fill="none" stroke={C.ink} strokeWidth={4} />
          <rect x={x1 + 12} y={cy - 152} width={8} height={176} fill={C.ink} />
        </svg>
      </CameraLayer>
      {p.line ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 560, textAlign: 'center', whiteSpace: 'nowrap'}}>
            <Words text={p.line} at={hit} fx="slam" size={96} />
          </div>
        </Hud>
      ) : null}
      <Sfx name="asmr-haptic-error" at={Math.max(base, hit)} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="heavy" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};

export const V131ThreeMinutes: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const shot = p.shot ?? 'helm';
  if (shot === 'sand') return <Sand p={p} ctx={ctx} />; // the rule's shots live in V131ThreeMinutesReveal; kept for a still
  if (shot === 'lap') return <Lap p={p} ctx={ctx} />;
  return <Cockpit p={p} ctx={ctx} shot={shot} />;
};
