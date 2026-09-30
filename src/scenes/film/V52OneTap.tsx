// v52-one-tap: the saved spot needs no internet. A white card holds the parked car from above with the pin on it;
// under it the phone's signal (four bars, three wifi arcs) falls away piece by piece on chunk `at`, and the pin
// only breathes. On chunk `at + 1` the ring round the car closes in green: the phone keeps the spot by itself.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, L, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // chunk where the signal starts to fall
  lockAt?: number | string; // chunk where the ring closes
  tone?: Tone;
};

const CX = 540;
const CY = 720; // the card's centre
const R = 230; // the ring round the car
const RING = 2 * Math.PI * R;
const BARS = [0, 1, 2, 3];
const ARCS = [0, 1, 2];
const SIG_Y = 1160; // the signal row's baseline

export const V52OneTap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const tone = p.tone ?? 'up';
  const green = toneBig(tone);
  const drop0 = Math.max(base + 6, cueFrame(ctx, p.at ?? 0));
  const lock = Math.max(drop0 + 40, cueFrame(ctx, p.lockAt ?? 1));

  const inCard = spr(frame, e, 'enter');
  const draw = prog(frame, e, 24, ease.drawOn);
  const pinLand = spr(frame, e + 6, 'land');
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));
  const closed = prog(frame, lock, 26, ease.drawOn);
  const settle = spr(frame, lock + 20, 'land');

  // seven signal pieces fall one after another: bars from the tallest, then the arcs from the outside
  const STEP = 5;
  const fall = (k: number) => prog(frame, drop0 + k * STEP, 16, ease.exit);
  const drops = [0, 1, 2, 3, 4, 5, 6].map((k) => drop0 + k * STEP);
  // the pin breathes once for each piece that falls
  let breath = 0;
  for (let k = 0; k < 7; k++) {
    const t = frame - (drop0 + k * STEP);
    if (t >= 0 && t < 14) breath = Math.max(breath, Math.sin((t / 14) * Math.PI) * 0.05);
  }
  const strike = prog(frame, drop0 + 7 * STEP, 14, ease.drawOn);

  // the car from above, inside the ring
  const car = (
    <g transform={`translate(${CX} ${CY + 40})`}>
      <rect x={-62} y={-118} width={124} height={236} rx={38} fill="none" stroke={C.ink} strokeWidth={2.4} />
      <rect x={-46} y={-66} width={92} height={46} rx={12} fill="none" stroke={C.ink2} strokeWidth={1.8} />
      <rect x={-46} y={38} width={92} height={34} rx={10} fill="none" stroke={C.ink2} strokeWidth={1.8} />
      <line x1={-62} y1={-80} x2={-72} y2={-86} stroke={C.ink} strokeWidth={2} />
      <line x1={62} y1={-80} x2={72} y2={-86} stroke={C.ink} strokeWidth={2} />
    </g>
  );

  // the parking lines on either side of the car
  const lines = [-130, 130].map((dx, i) => (
    <line key={i} x1={CX + dx} y1={CY - 120} x2={CX + dx} y2={CY + 190} stroke={C.rule} strokeWidth={2} strokeDasharray={320} strokeDashoffset={320 * (1 - draw)} />
  ));

  // the pin over the car
  const pinY = CY - 110 - (1 - pinLand) * 60;
  const pinS = 1 + breath;
  const pin = (
    <g transform={`translate(${CX} ${pinY}) scale(${pinS})`} opacity={Math.min(1, pinLand * 1.4)}>
      <path d="M 0 40 C -10 22 -34 4 -34 -20 A 34 34 0 1 1 34 -20 C 34 4 10 22 0 40 Z" fill={green} />
      <circle cx={0} cy={-20} r={12} fill={C.surface} />
    </g>
  );

  // the signal row: four bars (left) and three wifi arcs (right)
  const barEls = BARS.map((i) => {
    const k = 3 - i; // the tallest falls first
    const f = fall(k);
    const h = 22 + i * 18;
    const x = 360 + i * 30;
    return (
      <rect key={i} x={x} y={SIG_Y - h + f * 40} width={20} height={h} rx={4} fill={rgba(C.ink, 1 - f * 0.85)} stroke={C.rule} strokeWidth={f > 0 ? 1.5 : 0} opacity={draw} />
    );
  });
  const arcEls = ARCS.map((i) => {
    const k = 4 + (2 - i); // the outer arc first
    const f = fall(k);
    const r = 22 + i * 26;
    const ax = 660;
    const ay = SIG_Y;
    const d = `M ${ax - r * 0.72} ${ay - r * 0.69} A ${r} ${r} 0 0 1 ${ax + r * 0.72} ${ay - r * 0.69}`;
    return <path key={i} d={d} fill="none" stroke={rgba(C.ink, 1 - f * 0.8)} strokeWidth={6} strokeLinecap="round" transform={`translate(0 ${f * 36})`} opacity={draw} />;
  });

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `540px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          {/* the card */}
          <g opacity={inCard} transform={`translate(0 ${(1 - inCard) * 30})`}>
            <rect x={200} y={400} width={680} height={640} rx={44} fill={C.surface} stroke={C.rule} strokeWidth={1.5} />
            {lines}
            {car}
            <circle cx={CX} cy={CY} r={R} fill="none" stroke={C.rule} strokeWidth={2} strokeDasharray={RING} strokeDashoffset={RING * (1 - draw)} />
            <circle
              cx={CX}
              cy={CY}
              r={R}
              fill="none"
              stroke={green}
              strokeWidth={4}
              strokeLinecap="round"
              strokeDasharray={RING}
              strokeDashoffset={RING * (1 - closed)}
              transform={`rotate(-90 ${CX} ${CY})`}
            />
            <circle cx={CX} cy={CY} r={R + 18 + 30 * settle} fill="none" stroke={rgba(green, 0.5)} strokeWidth={1.5} opacity={frame >= lock + 20 ? 1 - settle : 0} />
            {pin}
          </g>
          {/* the signal, falling away */}
          {barEls}
          {arcEls}
          <line x1={340} y1={SIG_Y + 20} x2={340 + 400 * strike} y2={SIG_Y + 20 - 130 * strike} stroke={C.ink2} strokeWidth={2.5} strokeLinecap="round" opacity={strike > 0 ? 1 : 0} />
        </svg>
      </div>
      <Sfx name="asmr-paper" at={base + 2} volume={0.35} />
      <Sfx name="asmr-pop" at={base + 10} volume={0.4} />
      {drops.map((d, k) => (
        <Sfx key={k} name="asmr-tick-fine" at={d} volume={0.3} />
      ))}
      <Sfx name="asmr-pencil-short" at={drop0 + 7 * STEP} volume={0.35} />
      <Sfx name="asmr-check" at={lock + 20} volume={0.45} />
      <Haptic kind="light" at={drop0} />
      <Haptic kind="success" at={lock + 20} />
    </PictureBand>
  );
};
