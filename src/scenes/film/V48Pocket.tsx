// v48-pocket: the tech passport photo on a line-art phone; the camera pulls back to a cargo pocket with its flap
// open, the phone drops in, the flap folds down and the button snaps shut; a small check lands on the button.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, PictureBand, Sfx} from '../common';
import {C, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  pullAt?: number | string; // chunk where the camera pulls back to the pocket
  dropAt?: number | string; // chunk where the phone drops in and the flap closes
  checkAt?: number | string; // chunk where the check lands on the button
  tone?: Tone;
};

// the pocket, in stage units
const PX0 = 330;
const PX1 = 750;
const HINGE = 860; // the pocket's opening, where the flap is sewn on
const PBOT = 1290;
const FLAP = 150; // the flap's depth at its point
const BTN_Y = HINGE + FLAP - 26;
// the phone
const W = 200;
const H = 380;
const TOP0 = 400; // the phone's top before it drops
const TOP1 = 890; // ... and inside the pocket

export const V48Pocket: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const pull = cueFrame(ctx, p.pullAt ?? 1);
  const drop = Math.max(pull + 16, cueFrame(ctx, p.dropAt ?? 2));
  const check = Math.max(drop + 30, cueFrame(ctx, p.checkAt ?? 3));
  const tone = p.tone ?? 'up';

  // the camera: close on the phone's screen, then back to the whole pocket, then a slow push
  const back = prog(frame, pull, 22, ease.camera);
  const inn = prog(frame, drop + 4, 40, ease.camera); // in on the pocket once the phone is in it
  const drift = prog(frame, drop + 44, Math.max(1, ctx.dur - drop - 44), ease.camera);
  const z = lerp(lerp(1.75, 1, back), 1.3, inn) * lerp(1, 1.04, drift);
  const fx = 540;
  const fy = lerp(lerp(TOP0 + H / 2, 845, back), 1075, inn);
  const tx = 540 - z * fx;
  const ty = 830 - z * fy;

  // the phone: a quiet hover, then it drops into the pocket
  const d = prog(frame, drop, 18, ease.enter);
  const hover = Math.sin((frame - e) / 14) * 6 * (1 - d);
  const py =lerp(TOP0, TOP1, d) + hover;
  const tilt = Math.sin((frame - e) / 22) * 1.5 * (1 - d);

  // the flap: -1 = open (standing up from the hinge), 1 = closed over the opening
  const shut = spr(frame, drop + 12, 'land');
  const sy = lerp(-1, 1, Math.min(1, shut));
  const snap = drop + 24;
  const btnPulse = spr(frame, snap, 'tap');
  const ok = spr(frame, check, 'land');

  const flapPath = `M ${PX0 - 10} ${HINGE} L ${PX1 + 10} ${HINGE} L ${PX1 + 10} ${HINGE + FLAP - 50} Q ${PX1 + 10} ${HINGE + FLAP - 40} ${PX1 - 6} ${HINGE + FLAP - 34} L 548 ${HINGE + FLAP - 2} Q 540 ${HINGE + FLAP + 1} 532 ${HINGE + FLAP - 2} L ${PX0 + 6} ${HINGE + FLAP - 34} Q ${PX0 - 10} ${HINGE + FLAP - 40} ${PX0 - 10} ${HINGE + FLAP - 50} Z`;
  const flapStitch = `M ${PX0 + 6} ${HINGE + 12} L ${PX1 - 6} ${HINGE + 12} L ${PX1 - 6} ${HINGE + FLAP - 56} L 540 ${HINGE + FLAP - 18} L ${PX0 + 6} ${HINGE + FLAP - 56} Z`;
  const bodyPath = `M ${PX0} ${HINGE} L ${PX1} ${HINGE} L ${PX1} ${PBOT - 44} Q ${PX1} ${PBOT} ${PX1 - 44} ${PBOT} L ${PX0 + 44} ${PBOT} Q ${PX0} ${PBOT} ${PX0} ${PBOT - 44} Z`;
  const bodyStitch = `M ${PX0 + 16} ${HINGE + 4} L ${PX0 + 16} ${PBOT - 50} Q ${PX0 + 16} ${PBOT - 16} ${PX0 + 50} ${PBOT - 16} L ${PX1 - 50} ${PBOT - 16} Q ${PX1 - 16} ${PBOT - 16} ${PX1 - 16} ${PBOT - 50} L ${PX1 - 16} ${HINGE + 4}`;

  const flap = (
    <g transform={`translate(0 ${HINGE}) scale(1 ${sy}) translate(0 ${-HINGE})`}>
      <path d={flapPath} fill={C.surface} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
      <path d={flapStitch} fill="none" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="7 7" strokeLinejoin="round" />
    </g>
  );

  const px = 540 - W / 2;
  const phone = (
    <g transform={`rotate(${tilt} 540 ${py +H / 2})`}>
      <rect x={px} y={py} width={W} height={H} rx={34} fill={C.surface} stroke={C.ink} strokeWidth={2.4} />
      <rect x={px + 9} y={py +9} width={W - 18} height={H - 18} rx={26} fill={C.bg} stroke={C.rule} strokeWidth={1.2} />
      <rect x={540 - 30} y={py +20} width={60} height={16} rx={8} fill={C.ink} />
      {/* the tech passport photo on the screen: a card with its header, the portrait box and the lines */}
      <g>
        <rect x={px + 22} y={py +120} width={W - 44} height={116} rx={9} fill={C.surface} stroke={C.ink} strokeWidth={1.6} />
        <rect x={px + 22} y={py +120} width={W - 44} height={20} rx={9} fill={C.ink} />
        <rect x={px + 22} y={py +132} width={W - 44} height={8} fill={C.ink} />
        <rect x={px + 34} y={py +152} width={38} height={48} rx={4} fill="none" stroke={C.ink2} strokeWidth={1.4} />
        <circle cx={px + 53} cy={py +170} r={8} fill="none" stroke={C.ink2} strokeWidth={1.2} />
        <path d={`M ${px + 40} ${py +196} Q ${px + 53} ${py +180} ${px + 66} ${py +196}`} fill="none" stroke={C.ink2} strokeWidth={1.2} />
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={px + 84} y={py +154 + i * 13} width={[76, 58, 70, 44][+i]} height={4} rx={2} fill={i === 0 ? C.ink : C.ink2} />
        ))}
        <rect x={px + 34} y={py +214} width={122} height={4} rx={2} fill={C.rule} />
        <rect x={px + 34} y={py +224} width={84} height={4} rx={2} fill={C.rule} />
      </g>
      <rect x={540 - 36} y={py +H - 26} width={72} height={5} rx={2.5} fill={C.ink2} />
    </g>
  );

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `translate(${tx}px, ${ty}px) scale(${z})`, transformOrigin: '0 0'}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
          {/* the open flap stands behind the phone; once it folds past the hinge it lies over the pocket */}
          {sy < 0 ? flap : null}
          {/* the pocket's back edge */}
          <path d={`M ${PX0} ${HINGE} L ${PX1} ${HINGE}`} stroke={C.rule} strokeWidth={1.5} />
          {phone}
          <path d={bodyPath} fill={C.surface} stroke={C.ink} strokeWidth={2.4} strokeLinejoin="round" />
          <path d={bodyStitch} fill="none" stroke={C.ink2} strokeWidth={1.5} strokeDasharray="7 7" />
          {/* a rivet at each top corner */}
          <circle cx={PX0 + 16} cy={HINGE + 16} r={4} fill={C.ink2} />
          <circle cx={PX1 - 16} cy={HINGE + 16} r={4} fill={C.ink2} />
          {/* the phone, seen faintly through the fabric once it is in */}
          <g opacity={0.45 * prog(frame, snap, 14)}>
            <rect x={px} y={TOP1} width={W} height={H} rx={34} fill="none" stroke={C.ink2} strokeWidth={1.6} strokeDasharray="10 8" />
            <rect x={px + 22} y={TOP1 + 120} width={W - 44} height={116} rx={9} fill="none" stroke={C.ink2} strokeWidth={1.4} strokeDasharray="6 6" />
          </g>
          {sy >= 0 ? flap : null}
          {/* the button, on the flap once it is closed */}
          {sy > 0.9 ? (
            <g>
              <circle cx={540} cy={BTN_Y} r={16 + 26 * btnPulse} fill="none" stroke={rgba(C.ink, 0.4)} strokeWidth={1.5} opacity={1 - btnPulse} />
              <circle cx={540} cy={BTN_Y} r={15} fill={C.surface} stroke={C.ink} strokeWidth={2.2} />
              <circle cx={540} cy={BTN_Y} r={5} fill={C.ink} opacity={1 - ok} />
            </g>
          ) : null}
          {frame >= check ? (
            <g transform={`translate(540 ${BTN_Y}) scale(${0.6 + 0.4 * ok})`} opacity={Math.min(1, ok * 1.4)}>
              <circle r={30} fill={toneBig(tone)} />
              <path d="M -12 1 L -4 9 L 13 -9" fill="none" stroke={C.bg} strokeWidth={4} strokeLinecap="round" strokeLinejoin="round" />
            </g>
          ) : null}
          {frame >= check ? (
            <circle cx={540} cy={BTN_Y} r={34 + 60 * ok} fill="none" stroke={toneBig(tone)} strokeWidth={2} opacity={0.6 * (1 - ok)} />
          ) : null}
        </svg>
      </div>
      <Sfx name="asmr-air-long" at={Math.max(0, pull)} volume={0.3} />
      <Sfx name="asmr-slide" at={drop} volume={0.45} />
      <Sfx name="asmr-paper" at={drop + 14} volume={0.4} />
      <Sfx name="asmr-land" at={snap} volume={0.45} />
      <Haptic kind="light" at={snap} />
      <Sfx name="asmr-check" at={check} volume={0.45} />
      <Haptic kind="medium" at={check} />
    </PictureBand>
  );
};
