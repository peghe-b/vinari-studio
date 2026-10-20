// src/scenes/film/V119Roundabout.tsx: v119's own picture. A big city roundabout straight from above: a planted island in
// the middle, five arms that all look the same, the plane trees on the pavements. The hero sedan in the film's accent drives
// it counter-clockwise (Georgia drives on the right).
//   shot "lost"   the car already on the ring, going round and round past every exit; on the hit a lap mark lands (×2)
//   shot "count"  the car comes up the south arm and onto the ring; each exit it passes gets its number on the asphalt
//                 (1, then 2 big in the accent), and on the hit it leaves by the second exit, speeding away
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, Land, lead, Sfx} from '../common';
import {C, F, accentsOn, isLight, rgba, toneLine} from '../../tokens';
import {prog, ease} from '../../lib/anim';
import {TXT} from '../../lib/layer';
import {CameraLayer, Hud, useKick} from '../../lib/camera';
import {Words} from '../../lib/textfx';
import type {SceneCtx} from '../../types';
import {Car, type CarBody} from '../illo/car';
import {FOOT, IlloBand, Svg, TOP} from '../illo/scene';
import {Shadow} from '../illo/solid';

type P = {
  look?: 'illustrated';
  shot?: 'lost' | 'count';
  hitAt?: number | string;
  line?: string; // the lost shot's punch (from the spec)
  body?: CarBody;
};

const CX = 540;
const CY = 820;
const RING_OUT = 330; // the asphalt ring's outer edge
const ISLAND = 175; // the planted island
const LANE = 252; // where the car drives on the ring
const OFF = 56; // the right lane's offset from an arm's centre line
const ARM_W = 230;
const DEG = Math.PI / 180;
// the arms' directions in degrees (screen: 0 = east, 90 = south); the south arm (90) is where the car comes in
const ARMS = [90, 18, -54, -126, -198];
const EDGE = (Math.asin(OFF / LANE) * 180) / Math.PI; // a lane meets the ring this far round from its arm
const TREES: [number, number, number][] = [
  [180, 300, 34],
  [300, 180, 28],
  [880, 330, 30],
  [960, 520, 26],
  [140, 1180, 32],
  [250, 1330, 28],
  [900, 1230, 30],
  [990, 1060, 26],
  [120, 640, 26],
];

const ptOn = (deg: number, r: number): [number, number] => [CX + r * Math.cos(deg * DEG), CY + r * Math.sin(deg * DEG)];

/** The count shot's way: up the south arm's right lane, round the ring counter-clockwise, out of the second exit. */
const IN_Y0 = 1190; // the car's start (its rear stays over the subtitle band)
const IN_Y1 = CY + Math.sqrt(LANE * LANE - OFF * OFF);
const LEN_IN = IN_Y0 - IN_Y1;
const A0 = 90 - EDGE; // the ring angle where it joins
const A1 = ARMS[2] + EDGE; // the ring angle where it leaves (exit 2)
const LEN_RING = (A0 - A1) * DEG * LANE;
const wayAt = (s: number): [number, number] => {
  if (s <= LEN_IN) return [CX + OFF, IN_Y0 - s];
  if (s <= LEN_IN + LEN_RING) return ptOn(A0 - ((s - LEN_IN) / LANE) * (180 / Math.PI), LANE);
  const u = s - LEN_IN - LEN_RING;
  const d = ARMS[2] * DEG;
  const [x, y] = ptOn(A1, LANE);
  return [x + u * Math.cos(d), y + u * Math.sin(d)];
};
/** the heading (0 = nose up) from the way's direction, smoothed over 70 px so the corners turn, never snap */
const headingOf = (way: (s: number) => [number, number], s: number) => {
  const [x0, y0] = way(s - 35);
  const [x1, y1] = way(s + 35);
  return (Math.atan2(y1 - y0, x1 - x0) * 180) / Math.PI + 90;
};

export const V119Roundabout: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const uid = useId();
  const e = entrance(ctx);
  const base = lead(ctx);
  const shot = p.shot ?? 'lost';
  const hit = Math.max(base + 12, cueFrame(ctx, p.hitAt ?? 1));
  const kick = useKick();
  const accent = accentsOn() ? toneLine('a') : C.ink;
  const asphalt = C.il5;
  const kerb = C.il1;
  const mark = rgba(C.il0, 0.9);

  // the car
  let cx = 0;
  let cy = 0;
  let hd = 0;
  let ringAng = 0; // how far round the ring it is (count shot), for the numbers
  if (shot === 'lost') {
    const w = 1.55; // degrees a frame: a lap in about 7.7 s
    const ang = 150 - w * frame; // counter-clockwise from the south-west
    [cx, cy] = ptOn(ang, LANE);
    hd = ang;
  } else {
    const sHit = LEN_IN + LEN_RING;
    const v = sHit / Math.max(20, hit + 8);
    const dt = frame - hit;
    const s = dt <= 0 ? sHit + v * dt : sHit + v * (dt + (dt * dt) / 22);
    [cx, cy] = wayAt(s);
    hd = headingOf(wayAt, s);
    ringAng = s <= LEN_IN ? 999 : s <= sHit ? A0 - ((s - LEN_IN) / LANE) * (180 / Math.PI) : -999;
  }
  // the numbers on the exits (count): on as the car passes the arm
  const nums = [1, 2].map((n) => {
    const armAng = ARMS[+n];
    const on = shot === 'count' && ringAng <= armAng + EDGE + 8 ? 1 : 0;
    return {n, armAng, on};
  });
  const passF = (n: number) => (n === 2 ? hit : hit - Math.round(((ARMS[1] - ARMS[2]) * DEG * LANE) / Math.max(1, (LEN_IN + LEN_RING) / Math.max(20, hit + 8))));
  const appear = prog(frame, e, 12, ease.enter);

  return (
    <IlloBand uid={uid} time="day">
      {/* the ground, the blocks' lawns and the trees: depth 0.6 */}
      <CameraLayer depth={0.6}>
        <Svg>
          <rect x={-240} y={TOP} width={1560} height={FOOT - TOP} fill={C.il2} />
          {TREES.map((t, i) => (
            <g key={i}>
              <circle cx={t[0] + 8} cy={t[1] + 10} r={t[2] * 1.3} fill={rgba(C.il7, 0.12)} />
              <circle cx={t[0]} cy={t[1]} r={t[2] * 1.3} fill={C.il3} />
              <circle cx={t[0] - t[2] * 0.3} cy={t[1] - t[2] * 0.3} r={t[2] * 0.7} fill={C.il1} />
            </g>
          ))}
        </Svg>
      </CameraLayer>
      {/* the roads, the island, the numbers and the car: depth 1 */}
      <CameraLayer depth={1}>
        <Svg>
          {ARMS.map((a, i) => (
            <g key={`k${i}`} transform={`rotate(${a} ${CX} ${CY})`}>
              <rect x={CX} y={CY - ARM_W / 2 - 30} width={1700} height={ARM_W + 60} fill={kerb} />
            </g>
          ))}
          <circle cx={CX} cy={CY} r={RING_OUT + 30} fill={kerb} />
          {ARMS.map((a, i) => (
            <g key={`a${i}`} transform={`rotate(${a} ${CX} ${CY})`}>
              <rect x={CX} y={CY - ARM_W / 2} width={1700} height={ARM_W} fill={asphalt} />
              {Array.from({length: 12}, (_, j) => (
                <rect key={j} x={CX + RING_OUT + 70 + j * 120} y={CY - 4} width={64} height={8} rx={3} fill={mark} />
              ))}
              {/* the give-way line where an arm meets the ring */}
              <rect x={CX + RING_OUT + 18} y={CY} width={10} height={ARM_W / 2 - 10} fill={mark} />
            </g>
          ))}
          <circle cx={CX} cy={CY} r={RING_OUT} fill={asphalt} />
          <circle cx={CX} cy={CY} r={(RING_OUT + ISLAND) / 2 + 8} fill="none" stroke={mark} strokeWidth={6} strokeDasharray="34 30" />
          {/* the island: a kerb, a lawn, a ring of shrubs and a small monument in the middle */}
          <circle cx={CX} cy={CY} r={ISLAND} fill={kerb} />
          <circle cx={CX} cy={CY} r={ISLAND - 18} fill={C.il3} />
          {Array.from({length: 14}, (_, i) => {
            const [x, y] = ptOn(i * (360 / 14), ISLAND - 46);
            return <circle key={`s${i}`} cx={x} cy={y} r={18} fill={i % 2 ? C.il4 : C.il2} />;
          })}
          <circle cx={CX + 10} cy={CY + 12} r={44} fill={rgba(C.il7, 0.16)} />
          <circle cx={CX} cy={CY} r={44} fill={C.il1} stroke={C.il4} strokeWidth={4} />
          <circle cx={CX} cy={CY} r={16} fill={C.il5} />
          {/* the exit numbers painted on the asphalt (count) */}
          {nums.map(({n, armAng, on}) => {
            const [x, y] = ptOn(armAng, RING_OUT + 100);
            const k = on ? prog(frame, passF(n) - 4, 10, ease.enter) : 0;
            const big = n === 2;
            const r = (big ? 70 : 52) * (0.6 + 0.4 * k) * (big ? 1 + 0.08 * kick : 1);
            return k > 0 ? (
              <g key={`n${n}`} opacity={k}>
                <circle cx={x} cy={y} r={r + 8} fill={rgba(C.il7, 0.14)} />
                <circle cx={x} cy={y} r={r} fill={big ? accent : C.il0} stroke={big ? 'none' : C.il5} strokeWidth={5} />
              </g>
            ) : null;
          })}
          <Shadow uid={uid} cx={cx + 10} cy={cy + 12} rx={90} ry={90} k={0.6} />
          <Car uid={uid} x={cx} y={cy} len={250} view="top" body={p.body ?? 'sedan'} paint="a" heading={hd} frame={frame} speed={0.3} lights={{right: shot === 'count' && frame > hit - 30 && frame < hit + 10 ? 1 : 0}} />
        </Svg>
        {/* the digits of the numbers: clean text over the painted discs */}
        {nums.map(({n, armAng, on}) => {
          const [x, y] = ptOn(armAng, RING_OUT + 100);
          const k = on ? prog(frame, passF(n) - 4, 10, ease.enter) : 0;
          const size = n === 2 ? 84 : 60;
          return k > 0 ? (
            <div key={`d${n}`} className={TXT} style={{position: 'absolute', left: x - 60, top: y - size * 0.62, width: 120, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: 1.2, color: n === 2 && accentsOn() ? (isLight() ? C.surface : C.ink) : C.ink, opacity: k}}>
              {n}
            </div>
          ) : null;
        })}
      </CameraLayer>
      {shot === 'lost' ? (
        <Hud>
          <div style={{position: 'absolute', left: 0, width: 1080, top: 1236, textAlign: 'center', whiteSpace: 'nowrap', opacity: appear}}>
            <Words text={p.line ?? '×2'} at={hit} fx="slam" size={96} />
          </div>
        </Hud>
      ) : null}
      <Sfx name={shot === 'lost' ? 'asmr-knock' : 'asmr-pop'} at={Math.max(base, hit)} volume={0.3} />
      {shot === 'count' ? <Sfx name="asmr-tick-fine" at={Math.max(base, passF(1))} volume={0.3} /> : null}
      <Land at={hit} />
      <Haptic kind="light" at={hit + 1} volume={0.25} />
    </IlloBand>
  );
};
