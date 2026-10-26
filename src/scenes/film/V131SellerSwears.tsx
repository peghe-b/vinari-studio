// v131-seller-swears: a used car on an old Tbilisi street, by day. The seller swears the check light is only a sensor.
//   shot "lot"     the street, the car for sale (the film's one hero sedan, in the film's accent) parked at the kerb, the
//                  seller on the pavement by its nose presenting it, smiling; on `hitAt` he lays a hand on it (the swear).
//   shot "socket"  a diagram: the lower edge of the dash under the steering column, the trapezoid OBD-II socket at knee
//                  height; the adapter rises from below and seats on `hitAt`, its light wakes and blinks.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, PictureBand, Sfx} from '../common';
import {accentsOn, C, L, rgba} from '../../tokens';
import {ease, prog, spr} from '../../lib/anim';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {OBJ} from '../../lib/layer';
import type {SceneCtx} from '../../types';
import {Car3, fitCarCam, GRAPHITE, type CarCam} from '../kit/car3d';
import {Street} from '../kit/street';
import {Owner, Seller} from '../kit/people';
import {breath, mixCam, personAt, Svg, useShot} from '../kit/stage';
import {E} from '../kit/lib';
import type {Act} from '../illo/acting';

type P = {
  shot?: 'lot' | 'buyer' | 'socket';
  hitAt?: number | string;
  label?: string;
};

// the lot: the car at the origin, nose to +z, the pavement on its right (+x); a slow dolly from the pavement ahead
const LOT0: CarCam = {pos: [5.6, 1.55, 9.2], target: [0.3, 0.85, 0.4], fov: 35};
const LOT1: CarCam = {pos: [5.1, 1.5, 8.5], target: [0.35, 0.88, 0.45], fov: 35};

// the buyer: across the car from the pavement's far side, the seller at its nose, the buyer by its tail, face to face
const BUY0: CarCam = {pos: [9.4, 1.5, 1.6], target: [0.6, 1.0, 0.4], fov: 36};
const BUY1: CarCam = {pos: [9.0, 1.45, 0.8], target: [0.6, 1.0, 0.3], fov: 36};

const LotShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const uid = useId();
  const {t, len, at} = useShot(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 10, at(p.hitAt, 24));
  const buyer = p.shot === 'buyer';
  const cam = fitCarCam(mixCam(buyer ? BUY0 : LOT0, buyer ? BUY1 : LOT1, E.inOut(prog(t, 0, len))), {design: 'sedan'});
  const s = buyer ? personAt(cam, 2.5, 2.1, 1.8) : personAt(cam, 2.2, 2.7, 1.8);
  const o = buyer ? personAt(cam, 2.7, -1.4, 1.8) : null;
  const b = breath(t, 0.8);
  const acts: Act[] = buyer ? [{at: hit - 3, pose: 'shrug', face: 'worried'} as Act] : [{at: hit - 3, pose: 'confident', face: 'grin'} as Act];
  const paint = accentsOn() ? C.accA : GRAPHITE;
  return (
    <PictureBand camera={false}>
      <div style={{position: 'absolute', left: -60, right: -60, top: -80, bottom: -80, backgroundColor: '#F4F4F4', overflow: 'hidden'}}>
        <div style={{position: 'absolute', left: 60 + b.x, top: 80 + b.y, width: 1080, height: 1920}}>
          <Street cam={cam} uid={`${uid}s`} look="day" />
          <Car3 cam={cam} night={0} design="sedan" paint={paint} shadow={1} lift={0} sheen={-0.8 + 1.4 * prog(t, 0, len)} lamp={prog(t, hit - 4, 10)} />
          <Svg>{s ? <Seller uid={`${uid}p`} x={s.x} y={s.y} size={s.size} frame={t} light="day" pose="offer" face="smile" turn={buyer ? 0.6 : -0.6} acts={acts} /> : null}</Svg>
          <Svg>{o ? <Owner uid={`${uid}o`} x={o.x} y={o.y} size={o.size} frame={t + 30} light="day" pose="crossArms" face="smirk" turn={-0.6} acts={[{at: hit - 6, pose: 'point'} as Act]} /> : null}</Svg>
        </div>
      </div>
      <Sfx name="asmr-knock" at={hit} volume={0.3} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </PictureBand>
  );
};

// the socket diagram, stage units, inside the band 370..1380
const SX = 540;
const SY = 760;
const SW = 300; // the socket's top width
const SH = 120;
const PINS = 8;

const SocketShot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const hit = Math.max(base + 14, cueFrame(ctx, p.hitAt ?? 0) + 14);
  const kick = useKick();
  const appear = spr(frame, e, 'enterXL');
  // the adapter rises from below the band and seats on the hit
  const up = prog(frame, hit - 16, 16, ease.enter);
  const ay = 1240 - (1240 - (SY + SH - 6)) * up;
  const seated = frame >= hit;
  const blink = seated ? (Math.floor((frame - hit) / 6) % 2 === 0 ? 1 : 0.35) : 0;
  const led = accentsOn() ? C.accA : C.ink;
  const trap = `M${SX - SW / 2} ${SY} L${SX + SW / 2} ${SY} L${SX + SW / 2 - 26} ${SY + SH} L${SX - SW / 2 + 26} ${SY + SH} Z`;
  const pins: React.ReactNode[] = [];
  for (let r = 0; r < 2; r++) {
    for (let i = 0; i < PINS; i++) {
      const w = SW - 70 - r * 30;
      const x = SX - w / 2 + (w / (PINS - 1)) * i;
      pins.push(<rect key={`${r}-${i}`} x={x - 7} y={SY + 30 + r * 42} width={14} height={24} rx={4} fill={C.ink2} />);
    }
  }
  return (
    <PictureBand camera={false}>
      <CameraLayer depth={0.6}>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          {/* the lower edge of the dash and the steering column over the socket */}
          <path d="M120 470 L960 470 L960 560 Q960 590 930 590 L150 590 Q120 590 120 560 Z" fill={rgba(C.ink, 0.06)} stroke={C.ink2} strokeWidth={4} />
          <path d="M380 470 L700 470 L660 610 L420 610 Z" fill={rgba(C.ink, 0.1)} stroke={C.ink2} strokeWidth={4} />
          {/* knee height: a dashed line */}
          <line x1={150} y1={SY + SH / 2} x2={SX - SW / 2 - 40} y2={SY + SH / 2} stroke={C.rule} strokeWidth={4} strokeDasharray="14 12" />
          <line x1={SX + SW / 2 + 40} y1={SY + SH / 2} x2={930} y2={SY + SH / 2} stroke={C.rule} strokeWidth={4} strokeDasharray="14 12" />
        </svg>
      </CameraLayer>
      <CameraLayer depth={1}>
        <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, opacity: appear}}>
          <path d={trap} fill={C.surface} stroke={C.ink} strokeWidth={7} strokeLinejoin="round" transform={`translate(0 ${(-4 * kick).toFixed(2)})`} />
          {pins}
          {/* the adapter */}
          <g opacity={prog(frame, hit - 16, 5)} transform={`translate(0 ${(ay - (SY + SH - 6)).toFixed(2)})`}>
            <path d={`M${SX - SW / 2 + 30} ${SY + SH - 6} L${SX + SW / 2 - 30} ${SY + SH - 6} L${SX + SW / 2 - 30} ${SY + SH + 210} Q${SX + SW / 2 - 30} ${SY + SH + 240} ${SX + SW / 2 - 60} ${SY + SH + 240} L${SX - SW / 2 + 60} ${SY + SH + 240} Q${SX - SW / 2 + 30} ${SY + SH + 240} ${SX - SW / 2 + 30} ${SY + SH + 210} Z`} fill={C.ink} stroke={C.ink} strokeWidth={4} />
            <circle cx={SX + 70} cy={SY + SH + 90} r={16} fill={seated ? led : C.ink2} opacity={seated ? blink : 0.6} />
            {seated ? <circle cx={SX + 70} cy={SY + SH + 90} r={34} fill="none" stroke={led} strokeWidth={4} opacity={0.5 * blink} /> : null}
          </g>
        </svg>
      </CameraLayer>
      <Hud>
        <MonoLabel text={p.label ?? 'OBD-II'} at={Math.max(base, e + 4)} size={40} color={C.ink} style={{position: 'absolute', left: L.camSafe.left, top: L.camSafe.top + 230}} />
      </Hud>
      <Sfx name="asmr-knock" at={hit} volume={0.35} />
      <Land at={hit} />
      <Haptic kind="rigid" at={hit + 1} volume={0.3} />
    </PictureBand>
  );
};

export const V131SellerSwears: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => (p.shot === 'socket' ? <SocketShot p={p} ctx={ctx} /> : <LotShot p={p} ctx={ctx} />);
