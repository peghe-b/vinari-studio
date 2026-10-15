// v108-clutch-foot: the clutch in cross-section with a left shoe on its pedal. One diagram that moves on
// from step to step of the lesson: the parts named (intro), the foot resting on the pedal turns the release bearing
// (ride), the pedal held half way lets the disc slip on the flywheel and heat up (slip), the whole pack glows hot (heat),
// and the foot moves off to the floor, the bearing stops and the disc clamps clean (free).
// Props: look "diagram", step intro | ride | slip | heat | free, at (the step's change: a chunk or "1.2s"), hitAt (the
// camera's kick), fly / disc / bearing (the part labels, 1 to 2 words), line (a punch, "*word*").
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, PictureBand, Sfx} from '../common';
import {accentsOn, C, F, rgba, halo, toneLine, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';

type Step = 'intro' | 'ride' | 'slip' | 'heat' | 'free';
type P = {
  look?: 'diagram';
  step?: Step;
  at?: number | string;
  hitAt?: number | string;
  fly?: string;
  disc?: string;
  bearing?: string;
  line?: string;
  tone?: Tone;
};

// the layout, stage units: the shaft runs left (the engine) to right (the gearbox)
const AY = 760; // the axis
const FLY_X = 270; // the flywheel's face
const FLY_W = 54;
const FLY_H = 520;
const DISC_H = 440;
const PLATE_H = 470;
const BEAR_X = 600; // the release bearing at rest
const PIV = {x: 820, y: 900}; // the pedal's pivot
const LEVER = 290; // the pedal's lever
const FLOOR = 1250;

const clamp = (v: number) => Math.max(0, Math.min(1, v));

/** Scrolling dashes on a part's face: they move as the part spins (speed in px a frame, 0 = still). */
const Spin: React.FC<{x: number; y0: number; y1: number; speed: number; frame: number; color: string; w?: number}> = ({x, y0, y1, speed, frame, color, w = 2.2}) => {
  const period = 34;
  const off = ((frame * speed) % period + period) % period;
  const n = Math.ceil((y1 - y0) / period) + 1;
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const y = y0 + i * period + off - period;
    const a = Math.max(y, y0);
    const b = Math.min(y + 14, y1);
    if (b > a) out.push(<line key={i} x1={x} y1={a} x2={x} y2={b} stroke={color} strokeWidth={w} strokeLinecap="round" />);
  }
  return <>{out}</>;
};

export const V108ClutchFoot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const step: Step = p.step ?? 'intro';
  const e = entrance(ctx);
  const base = lead(ctx);
  const at = Math.max(base + 6, cueFrame(ctx, p.at ?? 0));
  const hit = Math.max(base + 10, cueFrame(ctx, p.hitAt ?? p.at ?? 1));
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  const ch = prog(frame, at, 14, ease.enter); // the step's change, 0..1

  // the pedal travel: 0 = foot off, a light rest is 0.1, half way 0.5
  const from = step === 'slip' ? 0.1 : step === 'free' ? 0.1 : step === 'heat' ? 0.5 : 0;
  const to = step === 'ride' ? 0.1 : step === 'slip' ? 0.5 : step === 'heat' ? 0.5 : 0;
  const push = lerp(from, to, ch);
  // where the shoe is: on the pad, hovering above it, or moved off to the floor
  const onPad = step === 'intro' ? 0 : step === 'ride' ? ch : step === 'free' ? 1 - ch : 1;

  // the release bearing slides toward the spring fingers; contact from push 0.06
  const bearX = BEAR_X - 70 * push;
  const touch = clamp((push - 0.06) / 0.04);
  const fingerTip = BEAR_X - 26;
  const press = Math.max(0, fingerTip + 4 - (bearX - 22)); // how far the fingers are pushed
  const gap = clamp((push - 0.25) / 0.5) * 9; // the disc lets go of the flywheel
  const slipping = step === 'slip' || step === 'heat' ? clamp((push - 0.2) / 0.25) : 0;

  // the spin of each part, px a frame
  const engine = 6;
  const flySpeed = engine;
  const discSpeed = lerp(engine, engine * 0.35, slipping);
  const bearSpeed = touch * engine * 1.1;
  const heat = step === 'heat' ? clamp(prog(frame, e + 4, 30, ease.enter) + 0.3) : slipping * clamp(prog(frame, at + 6, 24, ease.enter));
  const freeGlow = step === 'free' ? prog(frame, at + 10, 18, ease.enter) : 0;

  const accent = accentsOn() ? C.accA : C.ink;
  const hot = toneLine('down');
  const good = toneLine('up');
  const ink = C.ink;
  const ink2 = C.ink2;

  // the parts' x
  const discX = FLY_X + FLY_W + 8 + gap;
  const plateX = discX + 30;
  // the pedal
  const ang = ((8 + 26 * push) * Math.PI) / 180;
  const pad = {x: PIV.x - Math.sin(ang) * LEVER, y: PIV.y + Math.cos(ang) * LEVER};
  // the shoe: on the pad, or on the floor to the right of the pedal
  const shoeOn = {x: pad.x + 18, y: pad.y - 6, r: -8 - 26 * push};
  const shoeOff = step === 'intro' ? {x: pad.x + 70, y: pad.y - 120, r: -14} : {x: 905, y: FLOOR - 26, r: 0};
  const sx = lerp(shoeOff.x, shoeOn.x, onPad);
  const sy = lerp(shoeOff.y, shoeOn.y, onPad) - (step === 'free' ? Math.sin(Math.PI * clamp(ch)) * 50 : 0);
  const sr = lerp(shoeOff.r, shoeOn.r, onPad);

  // wear: specks shed by the bearing (ride) or the disc (slip, heat)
  const specks: React.ReactNode[] = [];
  const shed = step === 'ride' ? touch * clamp((frame - hit) / 6 + 1) : slipping;
  if (shed > 0.05)
    for (let i = 0; i < 9; i++) {
      const t = ((frame * 0.9 + i * 13) % 40) / 40;
      const ox = step === 'ride' ? bearX - 10 + (i % 3) * 8 : discX + 6 + (i % 2) * 6;
      const oy = step === 'ride' ? AY + 70 : AY + DISC_H / 2 - 30 - (i % 4) * 40;
      specks.push(<circle key={i} cx={ox + Math.sin(i * 2.1 + t * 3) * 10} cy={oy + t * 110} r={2.4 - t * 1.4} fill={step === 'ride' ? accent : hot} opacity={shed * (1 - t)} />);
    }

  // heat shimmer over the pack
  const waves: React.ReactNode[] = [];
  if (heat > 0.05)
    for (let i = 0; i < 3; i++) {
      const x0 = FLY_X + 20 + i * 50;
      const lift = ((frame * 1.6 + i * 22) % 60) / 60;
      const y0 = AY - FLY_H / 2 - 30 - lift * 60;
      let d = `M ${x0} ${y0}`;
      for (let k = 1; k <= 6; k++) d += ` Q ${x0 + (k % 2 ? 12 : -12)} ${y0 - k * 14 + 7} ${x0} ${y0 - k * 14}`;
      waves.push(<path key={i} d={d} fill="none" stroke={hot} strokeWidth={2} strokeLinecap="round" opacity={heat * (1 - lift) * 0.8} />);
    }

  const label = (text: string | undefined, x: number, y: number, at0: number, align: 'left' | 'right' = 'left') =>
    text ? (
      <div
        className={TXT}
        style={{
          position: 'absolute',
          left: align === 'left' ? x : undefined,
          right: align === 'right' ? 1080 - x : undefined,
          top: y,
          font: `600 34px ${F.sans}`,
          color: ink,
          whiteSpace: 'nowrap',
          opacity: prog(frame, at0, 10, ease.enter),
          transform: `translateY(${(1 - prog(frame, at0, 12, ease.enter)) * 10}px)`,
        }}
      >
        {mtav(text)}
      </div>
    ) : null;

  const l0 = Math.max(base, e + 6);
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', inset: 0, transform: 'scale(1.12)', transformOrigin: '540px 860px'}}>
      {/* the clutch pack, depth 1 */}
      <CameraLayer depth={1}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {/* the crankshaft from the engine and the gearbox's input shaft */}
          <rect x={130} y={AY - 16} width={FLY_X - 130} height={32} rx={6} fill={rgba(ink, 0.08)} stroke={ink2} strokeWidth={2} />
          <line x1={FLY_X + FLY_W} y1={AY} x2={960} y2={AY} stroke={ink2} strokeWidth={3} strokeLinecap="round" />
          <rect x={plateX + 40} y={AY - 12} width={960 - plateX - 40} height={24} rx={5} fill="none" stroke={ink2} strokeWidth={1.6} />
          {/* the flywheel */}
          <rect x={FLY_X} y={AY - FLY_H / 2} width={FLY_W} height={FLY_H} rx={10} fill={rgba(ink, 0.1 + 0.25 * heat)} stroke={heat > 0.1 ? hot : ink} strokeWidth={2.4} />
          <rect x={FLY_X} y={AY - FLY_H / 2} width={FLY_W} height={FLY_H} rx={10} fill={halo(hot, 0.9 * heat)} />
          <Spin x={FLY_X + FLY_W / 2} y0={AY - FLY_H / 2 + 14} y1={AY + FLY_H / 2 - 14} speed={flySpeed} frame={frame} color={rgba(ink, 0.45)} />
          {/* the disc: a thin plate with its friction pads at the rim */}
          <rect x={discX} y={AY - DISC_H / 2} width={14} height={DISC_H} rx={5} fill={rgba(ink, 0.18)} stroke={ink} strokeWidth={2} />
          {[-1, 1].map((s) => (
            <rect key={s} x={discX - 6} y={s < 0 ? AY - DISC_H / 2 : AY + DISC_H / 2 - 120} width={26} height={120} rx={4} fill={heat > 0.1 ? rgba(hot, 0.25 + 0.5 * heat) : rgba(ink, 0.32)} stroke={slipping > 0.1 ? hot : ink} strokeWidth={2} />
          ))}
          <rect x={discX - 14} y={AY - 40} width={42} height={80} rx={8} fill="none" stroke={ink} strokeWidth={2} />
          <Spin x={discX + 7} y0={AY - DISC_H / 2 + 10} y1={AY + DISC_H / 2 - 10} speed={discSpeed} frame={frame} color={rgba(ink, 0.6)} w={2} />
          {/* the rub between the disc and the flywheel: a hot line while it slips, a clean green seam once it clamps */}
          {slipping > 0.05 ? (
            <g opacity={slipping}>
              <rect x={FLY_X + FLY_W - 2} y={AY - DISC_H / 2} width={discX - FLY_X - FLY_W + 6} height={DISC_H} fill={halo(hot, 1.2)} />
              {[-1, 1].map((s) => (
                <line key={s} x1={FLY_X + FLY_W + 2} y1={s < 0 ? AY - DISC_H / 2 + 4 : AY + DISC_H / 2 - 116} x2={FLY_X + FLY_W + 2} y2={s < 0 ? AY - DISC_H / 2 + 116 : AY + DISC_H / 2 - 4} stroke={hot} strokeWidth={3 + 1.5 * Math.sin(frame / 2)} strokeLinecap="round" />
              ))}
            </g>
          ) : null}
          {freeGlow > 0 ? <line x1={FLY_X + FLY_W + 3} y1={AY - DISC_H / 2 + 6} x2={FLY_X + FLY_W + 3} y2={AY + DISC_H / 2 - 6} stroke={good} strokeWidth={3} strokeLinecap="round" opacity={freeGlow} /> : null}
          {/* the pressure plate and its cover, bolted back to the flywheel */}
          <rect x={plateX} y={AY - PLATE_H / 2} width={22} height={PLATE_H} rx={6} fill={rgba(ink, 0.12)} stroke={ink} strokeWidth={2} />
          <path d={`M ${FLY_X + FLY_W} ${AY - FLY_H / 2 + 20} L ${plateX + 60} ${AY - FLY_H / 2 + 20} L ${plateX + 60} ${AY - 120}`} fill="none" stroke={ink2} strokeWidth={2} />
          <path d={`M ${FLY_X + FLY_W} ${AY + FLY_H / 2 - 20} L ${plateX + 60} ${AY + FLY_H / 2 - 20} L ${plateX + 60} ${AY + 120}`} fill="none" stroke={ink2} strokeWidth={2} />
          {/* the diaphragm spring's fingers, pushed in by the bearing */}
          {[-1, 1].map((s) => (
            <path key={s} d={`M ${plateX + 22} ${AY + s * 190} Q ${plateX + 60} ${AY + s * 150} ${plateX + 60} ${AY + s * 120} L ${fingerTip - press} ${AY + s * 46}`} fill="none" stroke={ink} strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round" />
          ))}
          {/* the release bearing: the part the habit wears out */}
          <g>
            <rect x={bearX - 22} y={AY - 62} width={44} height={124} rx={10} fill={touch > 0.1 ? rgba(accent, 0.22) : rgba(ink, 0.08)} stroke={touch > 0.1 ? accent : ink} strokeWidth={2.4} />
            <rect x={bearX - 22} y={AY - 62} width={44} height={124} rx={10} fill={halo(accent, 0.8 * touch * (0.7 + 0.3 * Math.sin(frame / 3)))} />
            {[-1, 1].map((s) => (
              <circle key={s} cx={bearX} cy={AY + s * 36 + ((frame * bearSpeed) % 12) - 6} r={7} fill="none" stroke={touch > 0.1 ? accent : ink2} strokeWidth={2} />
            ))}
            <rect x={bearX + 22} y={AY - 28} width={60} height={56} rx={6} fill="none" stroke={ink2} strokeWidth={1.8} />
          </g>
          {/* the fork from the bearing down to the slave cylinder, the line to the pedal */}
          <line x1={bearX + 10} y1={AY + 62} x2={bearX + 60 + 40 * push} y2={AY + 230} stroke={ink} strokeWidth={3} strokeLinecap="round" />
          <circle cx={bearX + 32} cy={AY + 140} r={6} fill={ink} />
          <rect x={bearX + 40 + 40 * push} y={AY + 222} width={70} height={30} rx={8} fill="none" stroke={ink2} strokeWidth={2} />
          <path d={`M ${bearX + 110 + 40 * push} ${AY + 237} C ${PIV.x - 60} ${AY + 237} ${PIV.x - 40} ${PIV.y - 40} ${PIV.x - 8} ${PIV.y + 60}`} fill="none" stroke={ink2} strokeWidth={2} strokeDasharray="7 7" />
          {specks}
          {waves}
        </svg>
      </CameraLayer>
      {/* the pedal and the foot, the foreground, depth 1.3 */}
      <CameraLayer depth={1.3}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <line x1={640} y1={FLOOR} x2={960} y2={FLOOR} stroke={ink2} strokeWidth={2} strokeLinecap="round" />
          <circle cx={PIV.x} cy={PIV.y} r={9} fill={ink} />
          <line x1={PIV.x} y1={PIV.y} x2={pad.x} y2={pad.y} stroke={ink} strokeWidth={6} strokeLinecap="round" />
          <rect x={pad.x - 44} y={pad.y - 10} width={88} height={20} rx={8} fill={ink} transform={`rotate(${(-ang * 180) / Math.PI} ${pad.x} ${pad.y})`} />
          {/* the shoe, in profile, toe to the left */}
          <g transform={`translate(${sx} ${sy}) rotate(${sr})`}>
            <path d="M -70 0 C -78 -18 -62 -34 -38 -36 L 8 -40 C 22 -64 30 -92 34 -120 L 74 -120 C 74 -70 80 -36 84 -10 C 86 4 76 10 60 10 L -56 10 C -66 10 -72 6 -70 0 Z" fill={rgba(ink, 0.88)} />
            <path d="M 34 -120 L 74 -120 L 76 -150 L 30 -150 Z" fill={rgba(ink, 0.55)} />
          </g>
        </svg>
      </CameraLayer>
      {/* the part labels, with the parts */}
      <CameraLayer depth={1}>
        {label(p.fly, FLY_X - 8, AY - FLY_H / 2 - 56, l0, 'left')}
        {label(p.disc, discX - 20, AY + FLY_H / 2 + 14, l0 + 8, 'left')}
        {label(p.bearing, bearX - 30, AY - 130, step === 'intro' ? l0 + 16 : l0, 'left')}
      </CameraLayer>
      </div>
      {/* the punch */}
      <Hud>
        {p.line ? (
          <div style={{position: 'absolute', left: 580, top: 440, whiteSpace: 'nowrap', transform: `scale(${(1 + 0.04 * kick).toFixed(4)})`, transformOrigin: 'left center'}}>
            <Words text={p.line} at={hit} fx="slam" size={70} punchTone={p.tone ?? (step === 'free' ? 'up' : step === 'ride' ? 'a' : 'down')} />
          </div>
        ) : null}
      </Hud>
      {step === 'intro' ? <Sfx name="asmr-pencil" at={Math.max(base, e + 4)} volume={0.22} /> : null}
      {step !== 'intro' ? <Sfx name={step === 'free' ? 'asmr-check' : 'asmr-knock'} at={Math.max(base, at)} volume={0.3} /> : null}
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 2} volume={0.3} />
    </PictureBand>
  );
};
