// The diagram beats in ink hairlines on white, seen from above: the ROUNDABOUT (Alice counts the exits; the refined hero car
// takes the second, while the crude cobalt car from the forest keeps looping the inner ring, his cap showing through the
// roof) and the LANES (three lanes to a fork, the right one lights green, the car glides into it).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {boilOf, CrudeCarTop} from './crude';
import {Car} from './kit/car';
import {IlloDefs} from './kit/solid';
import {alongPoly, clamp, E, ev, fr, GREEN, INK, INK2, INK3, lerp, prog, sampleSmooth, shot, sp, type Pt} from './lib';
import {F} from '../tokens';

const W = 1080;
const H = 1920;
const CX = 540;
const CY = 930;
const RO = 270; // the ring's outer edge
const RI = 120; // the island
const RM = (RO + RI) / 2;
const ROADW = 150;

const Arm: React.FC<{ang: number; green?: number}> = ({ang, green = 0}) => {
  // a road leaving the ring at angle `ang` (0 = east, -90 = north), drawn as its two edges and a dashed centre line
  const c = Math.cos((ang * Math.PI) / 180);
  const s = Math.sin((ang * Math.PI) / 180);
  const nx = -s;
  const ny = c;
  const r0 = Math.sqrt(RO * RO - (ROADW / 2) ** 2);
  const r1 = 1300;
  const P = (r: number, o: number): Pt => [CX + c * r + nx * o, CY + s * r + ny * o];
  return (
    <g>
      {green > 0 ? <path d={`M${P(r0, 0).join(' ')} L${P(r1, 0).join(' ')}`} stroke={GREEN} strokeWidth={ROADW * 0.62} opacity={0.18 * green} strokeLinecap="round" /> : null}
      <line x1={P(r0, -ROADW / 2)[0]} y1={P(r0, -ROADW / 2)[1]} x2={P(r1, -ROADW / 2)[0]} y2={P(r1, -ROADW / 2)[1]} stroke={INK} strokeWidth={2.4} />
      <line x1={P(r0, ROADW / 2)[0]} y1={P(r0, ROADW / 2)[1]} x2={P(r1, ROADW / 2)[0]} y2={P(r1, ROADW / 2)[1]} stroke={INK} strokeWidth={2.4} />
      <line x1={P(r0 + 30, 0)[0]} y1={P(r0 + 30, 0)[1]} x2={P(r1, 0)[0]} y2={P(r1, 0)[1]} stroke={INK3} strokeWidth={2} strokeDasharray="22 18" />
    </g>
  );
};

// the hero car's way: up from the south, into the ring (counter-clockwise from above: right-hand traffic), out north
const HERO: Pt[] = (() => {
  const pts: Pt[] = [
    [CX + 34, 1990],
    [CX + 34, CY + RO + 40],
  ];
  // into the ring at the south, around the east side to the north
  for (let a = 70; a >= -95; a -= 8) {
    const r = RM + 18;
    pts.push([CX + Math.cos((a * Math.PI) / 180) * r, CY + Math.sin((a * Math.PI) / 180) * r]);
  }
  pts.push([CX + 34, CY - RO - 40]);
  pts.push([CX + 34, -200]);
  return sampleSmooth(pts, 6);
})();

export const Roundabout: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const b = boilOf(t);
  const base = fr(shot('round').from);
  const end = fr(shot('round').to) - base;
  const L = (n: string) => fr(ev(n)) - base;
  const e1 = L('exit1');
  const e2 = L('exit2');
  // the hero car: in from the south, round, out north by the end
  const q = E.inOut(clamp((t + 4) / (end + 4)));
  const pos = alongPoly(HERO, lerp(0.25, 0.86, q)); // it starts above the subtitle line (at 0.16 it drove through the words)
  const heading = (pos.a * 180) / Math.PI + 90;
  // the crude car loops the inner lane on twos
  const loopA = ((Math.floor(t / 2) * 2) / 30) * 5.2 + 1.2;
  const lr = RI + 34;
  const cx = CX + Math.cos(-loopA) * lr;
  const cy = CY + Math.sin(-loopA) * lr;
  const g = E.out(prog(t, e2 + 4, 10));
  const num = (n: string, x: number, y: number, at: number, green: boolean) =>
    t >= at ? (
      <text x={x} y={y} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={64} fill={green && t >= e2 + 4 ? GREEN : INK2} opacity={clamp((t - at) / 3)} transform={`translate(${x} ${y}) scale(${lerp(1.3, 1, E.out(prog(t, at, 6)))}) translate(${-x} ${-y})`}>
        {n}
      </text>
    ) : null;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <IlloDefs uid={uid} />
      <rect width={W} height={H} fill="#FFFFFF" />
      <g transform={`translate(540 960) scale(${1 + 0.03 * clamp(t / end)}) translate(-540 -960)`}>
        <Arm ang={90} />
        <Arm ang={0} />
        <Arm ang={-90} green={g} />
        <Arm ang={180} />
        <circle cx={CX} cy={CY} r={RO} fill="#FFFFFF" stroke={INK} strokeWidth={2.4} />
        <circle cx={CX} cy={CY} r={RI} fill="#F2F2F2" stroke={INK} strokeWidth={2.4} />
        <circle cx={CX} cy={CY} r={(RO + RI) / 2} fill="none" stroke={INK3} strokeWidth={2} strokeDasharray="18 16" />
        {/* the green way out: the second exit */}
        {g > 0 ? <path d={`M${CX + 34} ${CY - RO - 10} L${CX + 34} ${CY - RO - 10 - 520 * g}`} stroke={GREEN} strokeWidth={10} strokeLinecap="round" /> : null}
        {num('1', CX + RO + 80, CY - 16, e1, false)}
        {num('2', CX + 120, CY - RO - 70, e2, true)}
        <CrudeCarTop x={cx} y={cy} s={0.5} rot={-loopA - Math.PI} boil={b} cap />
        <Car uid={uid} x={pos.p[0]} y={pos.p[1]} len={190} view="top" body="ev" paint="a" heading={heading} frame={t} speed={0.4} />
      </g>
    </svg>
  );
};

// ---- the lanes ------------------------------------------------------------------------------------------------------------
const LANE_W = 150;
const Larrow: React.FC<{x: number; y: number; kind: 'up' | 'right'; color: string}> = ({x, y, kind, color}) =>
  kind === 'up' ? (
    <path d={`M${x} ${y - 70} L${x - 24} ${y - 30} L${x - 9} ${y - 30} L${x - 9} ${y + 60} L${x + 9} ${y + 60} L${x + 9} ${y - 30} L${x + 24} ${y - 30} Z`} fill={color} />
  ) : (
    <path d={`M${x - 9} ${y + 60} L${x - 9} ${y - 10} Q${x - 9} ${y - 34} ${x + 16} ${y - 34} L${x + 22} ${y - 34} L${x + 22} ${y - 56} L${x + 56} ${y - 26} L${x + 22} ${y + 4} L${x + 22} ${y - 16} L${x + 16} ${y - 16} Q${x + 9} ${y - 16} ${x + 9} ${y - 8} L${x + 9} ${y + 60} Z`} fill={color} />
  );

export const Lanes: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const base = fr(shot('lane').from);
  const end = fr(shot('lane').to) - base;
  const x0 = 540 - 1.5 * LANE_W;
  const glowK = sp(t, 3, 140, 18);
  const move = E.inOut(prog(t, 8, end - 10));
  const carX = lerp(540, 540 + LANE_W, move);
  const carY = lerp(1500, 1180, E.out(clamp(t / end)));
  const yaw = Math.sin(move * Math.PI) * 14;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <IlloDefs uid={uid} />
      <rect width={W} height={H} fill="#FFFFFF" />
      <g transform={`translate(540 960) scale(${1 + 0.03 * clamp(t / end)}) translate(-540 -960)`}>
        {/* the right lane glows green, the way the voice means */}
        <rect x={x0 + 2 * LANE_W + 6} y={560} width={LANE_W - 12} height={1460} fill={GREEN} opacity={0.14 * glowK} />
        <path d={`M${x0 + 2.5 * LANE_W} 2000 L${x0 + 2.5 * LANE_W} 700 Q${x0 + 2.5 * LANE_W} 520 ${x0 + 2.5 * LANE_W + 200} 420 L1200 330`} fill="none" stroke={GREEN} strokeWidth={12 * glowK} strokeLinecap="round" opacity={glowK} />
        {/* the road: three lanes, then the fork: left two go on north, the right one bears right */}
        <line x1={x0} y1={2000} x2={x0} y2={-100} stroke={INK} strokeWidth={2.4} />
        <line x1={x0 + LANE_W} y1={2000} x2={x0 + LANE_W} y2={-100} stroke={INK3} strokeWidth={2} strokeDasharray="30 24" />
        <line x1={x0 + 2 * LANE_W} y1={2000} x2={x0 + 2 * LANE_W} y2={640} stroke={INK3} strokeWidth={2} strokeDasharray="30 24" />
        <path d={`M${x0 + 2 * LANE_W} 640 L${x0 + 2 * LANE_W} -100`} stroke={INK} strokeWidth={2.4} />
        <path d={`M${x0 + 3 * LANE_W} 2000 L${x0 + 3 * LANE_W} 760 Q${x0 + 3 * LANE_W} 600 ${x0 + 3 * LANE_W + 200} 520 L1200 440`} fill="none" stroke={INK} strokeWidth={2.4} />
        <path d={`M${x0 + 2 * LANE_W} 640 Q${x0 + 2 * LANE_W + 20} 470 ${x0 + 2 * LANE_W + 220} 360 L1200 230`} fill="none" stroke={INK} strokeWidth={2.4} />
        <Larrow x={x0 + 0.5 * LANE_W} y={980} kind="up" color={INK3} />
        <Larrow x={x0 + 1.5 * LANE_W} y={980} kind="up" color={INK3} />
        <Larrow x={x0 + 2.5 * LANE_W} y={980} kind="right" color={glowK > 0.5 ? GREEN : INK3} />
        <Car uid={uid} x={carX} y={carY} len={200} view="top" body="ev" paint="a" heading={yaw} frame={t} speed={0.4} />
      </g>
    </svg>
  );
};
