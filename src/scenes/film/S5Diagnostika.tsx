// The დიაგნოსტიკა Story's adapter slide (s5-diagnostika, the owner 2026-10-29: "no photo: a small line drawing like the VIN
// scanner's, a car drawn in fine strokes"): the driver's place seen from the seat, low: the dashboard's lower edge, the
// steering wheel and its column, the knee panel, the pedals, and under the dash, left of the column, the OBD2 port with the
// adapter in it, ringed as the app's VIN art rings its plate. Fine ink strokes on paper, one soft grey fill, the adapter's
// red light the only colour.
import React from 'react';

type Box = {x: number; y: number; w: number; h: number};
// the drawing sits 60 units in from each side, so it keeps inside Instagram's side margin (x 65..1015)
const VB = {w: 1120, h: 860};
const INK = '#1C1C1E';
const LINE = '#8E8E93';
const FILL = '#ECECEF';

export const S5Diagnostika: React.FC<{p: {box?: Box}}> = ({p}) => {
  const b = p.box ?? {x: 65, y: 560, w: 950, h: 1000};
  const s = Math.min(b.w / VB.w, b.h / VB.h);
  const ox = b.x + (b.w - VB.w * s) / 2;
  const oy = b.y + (b.h - VB.h * s) / 2;
  const pins = (y: number, x0: number, n: number, gap: number) =>
    Array.from({length: n}, (_, i) => <circle key={`${y}-${i}`} cx={x0 + i * gap} cy={y} r={3.4} fill={INK} stroke="none" />);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0}}>
      <g transform={`translate(${ox + 60 * s} ${oy}) scale(${s})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* the dashboard, its lower edge a long soft curve; the vents and the screen in fine grey */}
        <path d="M20 40 H980 V300 C820 350 640 372 500 372 C360 372 180 350 20 300 Z" fill={FILL} stroke={INK} strokeWidth={4} />
        <path d="M660 110 h230 a16 16 0 0 1 16 16 v74 a16 16 0 0 1 -16 16 h-230 a16 16 0 0 1 -16 -16 v-74 a16 16 0 0 1 16 -16 z" fill="#FFFFFF" stroke={LINE} strokeWidth={3} />
        <path d="M680 250 h70 M790 250 h90 M80 250 h70" stroke={LINE} strokeWidth={3} />
        {/* the steering wheel: the rim, three spokes and the hub, the column shroud under it */}
        <path d="M376 412 h88 l14 64 h-116 z" fill={FILL} stroke={INK} strokeWidth={4} />
        <circle cx={420} cy={230} r={178} fill="none" stroke={INK} strokeWidth={16} />
        <path d="M250 246 C320 262 360 268 382 272 M590 246 C520 262 480 268 458 272 M420 300 V400" stroke={INK} strokeWidth={10} />
        <path d="M372 236 h96 a22 22 0 0 1 22 22 v28 a22 22 0 0 1 -22 22 h-96 a22 22 0 0 1 -22 -22 v-28 a22 22 0 0 1 22 -22 z" fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        {/* the knee panel's edge and the floor line */}
        <path d="M120 360 C150 372 190 380 230 386" stroke={LINE} strokeWidth={3} />
        <path d="M60 820 H960" stroke={LINE} strokeWidth={3} />
        {/* the pedals */}
        <path d="M560 600 h92 a18 18 0 0 1 18 18 v140 a18 18 0 0 1 -18 18 h-92 a18 18 0 0 1 -18 -18 v-140 a18 18 0 0 1 18 -18 z" fill={FILL} stroke={INK} strokeWidth={4} />
        <path d="M730 650 h70 a16 16 0 0 1 16 16 v92 a16 16 0 0 1 -16 16 h-70 a16 16 0 0 1 -16 -16 v-92 a16 16 0 0 1 16 -16 z" fill={FILL} stroke={INK} strokeWidth={4} />
        <path d="M606 372 V600 M765 368 V650" stroke={LINE} strokeWidth={3} />
        {/* the OBD2 port under the dash, left of the column (its trapezoid, 16 pins), the adapter in it with its red light */}
        <path d="M170 392 h140 l-14 58 h-112 z" fill="#FFFFFF" stroke={INK} strokeWidth={4} />
        {pins(412, 196, 8, 12.5)}
        {pins(432, 200, 8, 11.5)}
        <path d="M182 450 h116 v74 a14 14 0 0 1 -14 14 h-88 a14 14 0 0 1 -14 -14 z" fill={INK} stroke={INK} strokeWidth={4} />
        <circle cx={276} cy={474} r={8} fill="#FF3B30" stroke="none" />
        {/* the ring and the label below it */}
        <rect x={140} y={372} width={200} height={190} rx={30} stroke={INK} strokeWidth={5} />
        <path d="M240 562 V626" stroke={INK} strokeWidth={4} />
        <circle cx={240} cy={626} r={7} fill={INK} stroke="none" />
        <text x={240} y={680} textAnchor="middle" fontFamily="Helvetica Neue, Arial, sans-serif" fontSize={42} fontWeight={700} fill={INK} stroke="none">
          OBD2
        </text>
      </g>
    </svg>
  );
};
