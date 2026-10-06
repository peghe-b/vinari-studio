// V77FarHand: the far-hand door opening (the UK Highway Code's tip), drawn from straight above.
// The driver's side of a cabin: the door, the mirror and its view fanning back, the blind patch beside the door,
// a cyclist rolling into it. On `handAt` the right hand reaches across to the door handle and the shoulders turn;
// on `lookAt` the head turns over the left shoulder and its sight sweeps the blind patch, the cyclist found (green);
// on `passAt` he rides on past the door and only then does the door swing open, its arc clear.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx} from '../common';
import {C, L, halo, rgba, toneBig} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import type {SceneCtx} from '../../types';

type P = {
  handAt?: number | string; // the right hand reaches across
  lookAt?: number | string; // the head turns, the sight sweeps the blind patch
  passAt?: number | string; // the cyclist rides on, then the door opens
};

// geometry in stage units: the car points up, the driver's side on the left
const HX = 478; // the door's line
const HY = 700; // the hinge
const DOOR = 250; // the door's length
const MX = 452; // the mirror
const MY = 694;
const SX = 572; // the driver's shoulders
const SY = 892;
const LANE = 326; // the cyclist's line
const BODY = 'M 520 452 Q 652 414 784 452 Q 812 520 818 610 L 836 1520 L 462 1520 L 484 610 Q 490 520 520 452 Z';
const GLASS = 'M 498 650 Q 652 612 806 650';
const HOOD = 'M 540 470 Q 652 446 764 470';

const rad = (d: number) => (d * Math.PI) / 180;

export const V77FarHand: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const handAt = Math.max(base + 20, cueFrame(ctx, p.handAt ?? 1));
  const lookAt = Math.max(handAt + 16, cueFrame(ctx, p.lookAt ?? 3));
  const passAt = Math.max(lookAt + 16, cueFrame(ctx, p.passAt ?? 4));
  const openAt = passAt + 22;

  const draw = prog(frame, e, 28, ease.drawOn);
  const fan = prog(frame, e + 10, 22, ease.enter);
  // the cyclist rolls up from behind into the blind patch, later rides on past the door
  const rollIn = prog(frame, base + 4, 30, ease.camera);
  const rideOn = prog(frame, passAt, 30, ease.camera);
  const cy = lerp(lerp(1250, 948, rollIn), 520, rideOn);
  const cyIn = prog(frame, base + 4, 10);
  const reach = spr(frame, handAt, 'enter');
  const look = prog(frame, lookAt, 20, ease.camera);
  const seen = spr(frame, lookAt + 14, 'land');
  const swing = spr(frame, openAt, 'enter');
  const push = lerp(1, 1.07, prog(frame, e, ctx.dur, ease.camera));

  const ok = toneBig('up');
  const bad = toneBig('down');
  const cyc = frame >= lookAt + 14 ? ok : bad;

  // the right arm: from the right shoulder to the wheel, then across the body to the inner door handle
  const torso = -32 * reach;
  const rs = {x: SX + 64 * Math.cos(rad(torso)), y: SY + 64 * Math.sin(rad(torso))};
  const ls = {x: SX - 64 * Math.cos(rad(torso)), y: SY - 64 * Math.sin(rad(torso))};
  const rh = {x: lerp(616, HX + 18, reach), y: lerp(752, 880, reach)};
  const lh = {x: lerp(528, 520, reach), y: lerp(752, 790, reach)};
  const relbow = {x: lerp(632, 560, reach), y: lerp(830, 930, reach)};
  // the head: facing forward, then turned back over the left shoulder
  const facing = lerp(-90, -90 - 26, reach) - 80 * look;
  const nose = {x: SX + 34 * Math.cos(rad(facing)), y: SY - 30 + 34 * Math.sin(rad(facing))};
  // the sight: a fan from the head, sweeping from forward to the blind patch
  const hx = SX;
  const hy = SY - 30;
  const half = 17;
  const reachLen = 330;
  const fanPt = (a: number) => `${hx + reachLen * Math.cos(rad(a))},${hy + reachLen * Math.sin(rad(a))}`;
  // the door swings about its hinge
  const th = 42 * swing;
  const de = {x: HX - DOOR * Math.sin(rad(th)), y: HY + DOOR * Math.cos(rad(th))};
  const arcR = DOOR + 18;
  const arcEnd = {x: HX - arcR * Math.sin(rad(42)), y: HY + arcR * Math.cos(rad(42))};

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, transform: `scale(${push})`, transformOrigin: `520px ${L.contentMid}px`}}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <defs>
            <pattern id="v77hatch" width={14} height={14} patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <line x1={0} y1={0} x2={0} y2={14} stroke={bad} strokeWidth={2} opacity={0.5} />
            </pattern>
          </defs>
          <g transform="translate(64 103) scale(0.88)">
          {/* the mirror's view: a wedge fanning back along the car */}
          <polygon points={`${MX},${MY} ${MX + 6},1520 ${MX - 262},1520`} fill={rgba(C.ink, 0.05)} opacity={fan} />
          <line x1={MX} y1={MY} x2={MX - 262} y2={1520} stroke={C.rule} strokeWidth={1.5} strokeDasharray="6 8" opacity={fan} />
          <line x1={MX} y1={MY} x2={MX + 6} y2={1520} stroke={C.rule} strokeWidth={1.5} strokeDasharray="6 8" opacity={fan} />
          {/* the blind patch beside the door */}
          <rect x={230} y={796} width={128} height={276} rx={26} fill="url(#v77hatch)" stroke={bad} strokeWidth={1.6} strokeDasharray="4 6" opacity={fan * (1 - 0.75 * seen)} />
          {/* the body, drawn with one pen */}
          <path d={BODY} fill={C.surface} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" strokeDasharray={2600} strokeDashoffset={2600 * (1 - draw)} />
          <path d={HOOD} fill="none" stroke={C.ink2} strokeWidth={1.5} opacity={draw} />
          <path d={GLASS} fill="none" stroke={C.ink} strokeWidth={2} opacity={draw} />
          <path d="M 470 1180 Q 652 1150 834 1180" fill="none" stroke={C.ink2} strokeWidth={1.5} opacity={draw} />
          {/* the seat, the wheel */}
          <rect x={512} y={846} width={120} height={150} rx={30} fill="none" stroke={C.rule} strokeWidth={1.6} opacity={draw} />
          <ellipse cx={SX} cy={752} rx={58} ry={11} fill="none" stroke={C.ink2} strokeWidth={2} opacity={draw} />
          {/* the mirror */}
          <ellipse cx={MX} cy={MY} rx={22} ry={9} fill={C.surface} stroke={C.ink} strokeWidth={2} opacity={draw} />
          {/* the arms */}
          <polyline points={`${ls.x},${ls.y} ${lerp(512, 506, reach)},${lerp(820, 840, reach)} ${lh.x},${lh.y}`} fill="none" stroke={C.ink2} strokeWidth={7} strokeLinecap="round" strokeLinejoin="round" opacity={draw} />
          <polyline points={`${rs.x},${rs.y} ${relbow.x},${relbow.y} ${rh.x},${rh.y}`} fill="none" stroke={reach > 0.05 ? ok : C.ink2} strokeWidth={8} strokeLinecap="round" strokeLinejoin="round" opacity={draw} />
          {/* the shoulders and the head */}
          <ellipse cx={SX} cy={SY} rx={70} ry={24} fill={C.surface} stroke={C.ink} strokeWidth={2} transform={`rotate(${torso} ${SX} ${SY})`} opacity={draw} />
          <circle cx={hx} cy={hy} r={28} fill={C.surface} stroke={C.ink} strokeWidth={2.2} opacity={draw} />
          <circle cx={nose.x} cy={nose.y} r={6} fill={C.ink} opacity={draw} />
          {/* the sight from the turned head, over everything */}
          {frame >= lookAt ? (
            <polygon points={`${hx},${hy} ${fanPt(facing - half)} ${fanPt(facing + half)}`} fill={halo(ok, 0.14)} stroke={ok} strokeWidth={1.8} strokeLinejoin="round" opacity={prog(frame, lookAt, 8)} />
          ) : null}
          {/* the inner door handle */}
          <rect x={HX + 6} y={868} width={10} height={26} rx={4} fill={reach > 0.6 ? ok : C.ink2} opacity={draw} />
          {/* the door: closed on the body's side, then swung about the hinge */}
          {swing > 0.01 ? (
            <path d={`M ${HX} ${HY + DOOR + 18} A ${arcR} ${arcR} 0 0 1 ${arcEnd.x} ${arcEnd.y}`} fill="none" stroke={ok} strokeWidth={1.6} strokeDasharray="5 7" opacity={swing} />
          ) : null}
          <line x1={HX} y1={HY} x2={de.x} y2={de.y} stroke={swing > 0.01 ? ok : C.ink} strokeWidth={6} strokeLinecap="round" opacity={draw} />
          <circle cx={HX} cy={HY} r={6} fill={C.ink} opacity={draw} />
          {/* the cyclist, from above: a wheel line, the bars, the rider */}
          <g transform={`translate(${LANE} ${cy})`} opacity={cyIn}>
            <circle r={62 + 34 * seen} fill="none" stroke={ok} strokeWidth={1.8} opacity={frame >= lookAt + 14 ? 1 - seen : 0} />
            {/* the two wheels, the frame between them */}
            <line x1={0} y1={-66} x2={0} y2={-30} stroke={cyc} strokeWidth={7} strokeLinecap="round" />
            <line x1={0} y1={30} x2={0} y2={66} stroke={cyc} strokeWidth={7} strokeLinecap="round" />
            <line x1={0} y1={-30} x2={0} y2={30} stroke={cyc} strokeWidth={2.4} />
            {/* the bars, the arms, the shoulders, the helmet */}
            <line x1={-26} y1={-42} x2={26} y2={-42} stroke={cyc} strokeWidth={4} strokeLinecap="round" />
            <polyline points="-22,-40 -20,-14 -14,4" fill="none" stroke={cyc} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <polyline points="22,-40 20,-14 14,4" fill="none" stroke={cyc} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <ellipse cx={0} cy={6} rx={25} ry={12} fill={C.surface} stroke={cyc} strokeWidth={2.4} />
            <ellipse cx={0} cy={-2} rx={11} ry={13} fill={cyc} />
          </g>
          </g>
        </svg>
      </div>
      <Sfx name="asmr-pencil" at={base + 1} volume={0.32} />
      <Sfx name="asmr-pop" at={base + 30} volume={0.36} />
      <Sfx name="asmr-slide" at={handAt} volume={0.34} />
      <Haptic kind="light" at={handAt} />
      <Sfx name="asmr-air-long" at={lookAt} volume={0.3} />
      <Sfx name="asmr-check" at={lookAt + 14} volume={0.4} />
      <Haptic kind="success" at={lookAt + 14} />
      <Sfx name="asmr-air" at={passAt} volume={0.26} />
      <Sfx name="asmr-knock" at={openAt} volume={0.38} />
      <Haptic kind="light" at={openAt} />
    </PictureBand>
  );
};
