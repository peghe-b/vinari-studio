// 3D OBD film cover B, thin-line vector (studio grid style). Built by the cover workflow.
//   headline  „ჯერ კოდი, / მერე ხელოსანი", the tag „OBD სკანერი"
//   picture   a technical side elevation of a modern SUV (GLE-like, no logo) facing left, its rear bleeding off the right
//             edge (the rear wheel stays whole); a small circle marks the OBD-II port under the steering wheel, and a
//             dotted detail cone leads up to an enlarged inset circle: the 16-pin trapezoid port face-on with the adapter
//             outline in line under it (exploded, on the centre line), a bracket „საჭის ქვეშ" beside it, the wheelbase dimensioned
// The wheelbase 2 995 mm is the GLE (V167) figure.
// Black, white and greys only on the studio paper; everything that matters inside y 240..1680.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {HEAD_LH, MAX_W, PAD, PAPER, ROW_H, TOP, useFit} from './Covers';
import {INK} from './kit/stage';

const LINE = '#1C1C1C'; // the drawing's main line
const LINE2 = '#3F3F3F'; // panel lines, details
const HID = '#9A9A9A'; // hidden lines, guides
const DIM = '#8A8A8A'; // dimension lines
const INK2 = '#6A6A6A';
const INK3 = '#858585';
const RULE = 'rgba(160,160,160,0.55)';

const LINES = ['ჯერ კოდი,', 'მერე ხელოსანი'];
const TAG = 'OBD სკანერი';

// ---- the car: millimetres (x from the front bumper back, y up from the ground) to cover pixels -------------------------
const LEN = 4924;
const S = 1100 / LEN; // px per mm
const X0 = 64; // the front bumper
const G = 1572; // the ground line
const px = (x: number) => X0 + x * S;
const py = (y: number) => G - y * S;
const P = (x: number, y: number) => `${px(x).toFixed(1)} ${py(y).toFixed(1)}`;
const FW = {x: 950, y: 392}; // front wheel centre
const RW = {x: 3945, y: 392}; // rear wheel centre
const TIRE = 392;
const ARCH = 462;
const archEnds = (c: {x: number; y: number}, r: number, yc: number) => {
  const dx = Math.sqrt(r * r - (c.y - yc) * (c.y - yc));
  return [c.x - dx, c.x + dx];
};
const [FA0, FA1] = archEnds(FW, ARCH, 350);
const [RA0, RA1] = archEnds(RW, ARCH, 350);
const AR = (ARCH * S).toFixed(1);

const BODY = [
  `M${P(330, 360)}`,
  `L${P(150, 400)}`,
  `C${P(90, 412)} ${P(52, 440)} ${P(36, 490)}`,
  `C${P(14, 560)} ${P(4, 640)} ${P(4, 720)}`,
  `C${P(4, 830)} ${P(16, 930)} ${P(48, 1010)}`,
  `C${P(66, 1050)} ${P(100, 1068)} ${P(170, 1074)}`,
  `C${P(700, 1100)} ${P(1150, 1140)} ${P(1470, 1198)}`,
  `C${P(1760, 1390)} ${P(1980, 1600)} ${P(2190, 1702)}`,
  `C${P(2280, 1748)} ${P(2400, 1766)} ${P(2560, 1772)}`,
  `C${P(3200, 1784)} ${P(3900, 1756)} ${P(4440, 1692)}`,
  `C${P(4520, 1684)} ${P(4570, 1676)} ${P(4590, 1662)}`,
  `L${P(4790, 1300)}`,
  `C${P(4835, 1235)} ${P(4885, 1180)} ${P(4902, 1100)}`,
  `C${P(4924, 1000)} ${P(4924, 800)} ${P(4920, 660)}`,
  `C${P(4915, 480)} ${P(4880, 385)} ${P(4790, 340)}`,
  `L${P(RA1, 350)}`,
  `A${AR} ${AR} 0 1 0 ${P(RA0, 350)}`,
  `L${P(RA0 - 40, 300)}`,
  `L${P(FA1 + 40, 300)}`,
  `L${P(FA1, 350)}`,
  `A${AR} ${AR} 0 1 0 ${P(FA0, 350)}`,
  `L${P(330, 360)}Z`,
].join('');

// the daylight opening (the side glass): a high belt that rises to the rear, the roof line falling into a rounded tip
const DLO = [
  `M${P(1610, 1252)}`,
  `C${P(1810, 1420)} ${P(2010, 1590)} ${P(2240, 1662)}`,
  `C${P(2420, 1692)} ${P(2620, 1696)} ${P(2860, 1696)}`,
  `C${P(3500, 1696)} ${P(3980, 1660)} ${P(4300, 1596)}`,
  `C${P(4400, 1576)} ${P(4462, 1532)} ${P(4452, 1492)}`,
  `C${P(4440, 1446)} ${P(4300, 1384)} ${P(4000, 1352)}`,
  `C${P(3500, 1322)} ${P(2500, 1284)} ${P(1610, 1252)}Z`,
].join('');

const Wheel: React.FC<{c: {x: number; y: number}}> = ({c}) => {
  const cx = px(c.x);
  const cy = py(c.y);
  const spokes: React.ReactNode[] = [];
  for (let k = 0; k < 5; k++) {
    const base = (k * 72 - 90) * (Math.PI / 180);
    for (const sgn of [-1, 1]) {
      const r0 = 64 * S;
      const r1 = 258 * S;
      const a0 = base + (sgn * 4.2) / r0;
      const a1 = base + (sgn * 5.2) / r1;
      spokes.push(<line key={`${k}${sgn}`} x1={cx + r0 * Math.cos(a0)} y1={cy + r0 * Math.sin(a0)} x2={cx + r1 * Math.cos(a1)} y2={cy + r1 * Math.sin(a1)} stroke={LINE2} strokeWidth={1.9} strokeLinecap="round" />);
    }
  }
  return (
    <g>
      <circle cx={cx} cy={cy} r={TIRE * S} fill={PAPER} stroke={LINE} strokeWidth={2.8} />
      <circle cx={cx} cy={cy} r={(TIRE - 18) * S} fill="none" stroke={LINE2} strokeWidth={1.2} opacity={0.55} />
      <circle cx={cx} cy={cy} r={280 * S} fill="none" stroke={LINE} strokeWidth={2.3} />
      <circle cx={cx} cy={cy} r={262 * S} fill="none" stroke={LINE2} strokeWidth={1.4} />
      {spokes}
      <circle cx={cx} cy={cy} r={58 * S} fill="none" stroke={LINE2} strokeWidth={1.9} />
      <circle cx={cx} cy={cy} r={22 * S} fill="none" stroke={LINE2} strokeWidth={1.4} />
    </g>
  );
};

const PORT = {x: 1790, y: 740}; // the OBD-II port under the dash, driver's side (mm)

const Car: React.FC = () => {
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      {/* the body */}
      <path d={BODY} stroke={LINE} strokeWidth={3} fill="none" />
      {/* the roof rail */}
      <path d={`M${P(2560, 1808)}C${P(3200, 1822)} ${P(3900, 1794)} ${P(4380, 1734)}`} stroke={LINE} strokeWidth={2.5} />
      <path d={`M${P(2580, 1808)}L${P(2620, 1775)}M${P(4360, 1736)}L${P(4340, 1702)}`} stroke={LINE2} strokeWidth={2.3} />
      {/* the glass, the pillars */}
      <path d={DLO} stroke={LINE} strokeWidth={2.5} fill="#EBEBEB" />
      <path d={`M${P(2880, 1696)}L${P(2900, 1290)}M${P(2950, 1696)}L${P(2966, 1292)}`} stroke={LINE} strokeWidth={2.3} />
      <path d={`M${P(3830, 1674)}L${P(3790, 1338)}`} stroke={LINE} strokeWidth={2.3} />
      {/* the doors' shut lines */}
      <g stroke={LINE2} strokeWidth={2.3}>
        <path d={`M${P(1650, 1258)}C${P(1600, 950)} ${P(1570, 640)} ${P(1566, 330)}`} />
        <path d={`M${P(2925, 1292)}L${P(2912, 318)}`} />
        <path d={`M${P(3810, 1338)}L${P(3762, 930)}A${(520 * S).toFixed(1)} ${(520 * S).toFixed(1)} 0 0 0 ${P(3436, 490)}L${P(3420, 318)}`} />
      </g>
      {/* the shoulder line, the lower crease, the sill */}
      <g stroke={LINE2} strokeWidth={1.9} opacity={0.8}>
        <path d={`M${P(610, 1008)}C${P(1700, 1050)} ${P(3200, 1092)} ${P(4700, 1112)}`} />
        <path d={`M${P(1720, 500)}C${P(2400, 520)} ${P(3000, 560)} ${P(3360, 610)}`} />
        <path d={`M${P(FA1 + 60, 392)}L${P(RA0 - 60, 392)}`} />
      </g>
      {/* the arch cladding */}
      <g stroke={LINE2} strokeWidth={1.9}>
        <path d={`M${P(FW.x - 512, 368)}A${((ARCH + 52) * S).toFixed(1)} ${((ARCH + 52) * S).toFixed(1)} 0 1 1 ${P(FW.x + 512, 368)}`} />
        <path d={`M${P(RW.x - 512, 368)}A${((ARCH + 52) * S).toFixed(1)} ${((ARCH + 52) * S).toFixed(1)} 0 1 1 ${P(RW.x + 512, 368)}`} />
      </g>
      {/* the mirror */}
      <path d={`M${P(1640, 1262)}C${P(1610, 1330)} ${P(1660, 1398)} ${P(1770, 1400)}C${P(1862, 1402)} ${P(1892, 1336)} ${P(1862, 1290)}C${P(1834, 1262)} ${P(1730, 1256)} ${P(1640, 1262)}Z`} stroke={LINE} strokeWidth={2.3} fill={PAPER} />
      {/* the flush handles */}
      <rect x={px(2460)} y={py(1176)} width={220 * S} height={38 * S} rx={19 * S} stroke={LINE2} strokeWidth={2.1} />
      <rect x={px(3380)} y={py(1204)} width={210 * S} height={38 * S} rx={19 * S} stroke={LINE2} strokeWidth={2.1} />
      {/* the lamps, the intake */}
      <path d={`M${P(24, 880)}C${P(200, 898)} ${P(420, 944)} ${P(610, 1006)}C${P(420, 1002)} ${P(210, 988)} ${P(40, 962)}Z`} stroke={LINE} strokeWidth={2.1} />
      <path d={`M${P(4600, 1092)}C${P(4750, 1102)} ${P(4870, 1110)} ${P(4906, 1082)}L${P(4914, 1002)}C${P(4800, 1002)} ${P(4660, 1012)} ${P(4585, 1042)}Z`} stroke={LINE} strokeWidth={2.1} />
      <path d={`M${P(14, 580)}C${P(120, 592)} ${P(260, 600)} ${P(430, 600)}`} stroke={LINE2} strokeWidth={1.9} />
      <Wheel c={FW} />
      <Wheel c={RW} />
    </g>
  );
};

// ---- the detail: the port face-on, the adapter under it ---------------------------------------------------------------
const trap = (cx: number, top: number, wTop: number, wBot: number, h: number, r: number) => {
  const a = wTop / 2;
  const b = wBot / 2;
  return [
    `M${cx - a + r} ${top}`,
    `L${cx + a - r} ${top}`,
    `Q${cx + a} ${top} ${cx + a - r * 0.3} ${top + r}`,
    `L${cx + b + r * 0.3} ${top + h - r}`,
    `Q${cx + b} ${top + h} ${cx + b - r} ${top + h}`,
    `L${cx - b + r} ${top + h}`,
    `Q${cx - b} ${top + h} ${cx - b - r * 0.3} ${top + h - r}`,
    `L${cx - a + r * 0.3} ${top + r}`,
    `Q${cx - a} ${top} ${cx - a + r} ${top}Z`,
  ].join('');
};

const Detail: React.FC<{cx: number; cy: number; r: number}> = ({cx, cy, r}) => {
  const portTop = cy - 128;
  const pins: React.ReactNode[] = [];
  for (let row = 0; row < 2; row++)
    for (let i = 0; i < 8; i++) {
      const x = cx + (i - 3.5) * (row === 0 ? 21 : 18.5);
      const y = portTop + (row === 0 ? 34 : 64);
      pins.push(<line key={`${row}${i}`} x1={x} y1={y - 7} x2={x} y2={y + 7} stroke={LINE} strokeWidth={3} strokeLinecap="round" />);
    }
  const plugTop = cy + 18;
  const bodyTop = plugTop + 30;
  const bw = 196;
  const bh = 96;
  return (
    <g fill="none" strokeLinecap="round" strokeLinejoin="round">
      <circle cx={cx} cy={cy} r={r} fill={PAPER} stroke={LINE} strokeWidth={2.8} />
      <circle cx={cx} cy={cy} r={r + 14} stroke="#C4C4C4" strokeWidth={1.4} />
      {/* the centre line */}
      <path d={`M${cx} ${cy - r + 14}L${cx} ${cy + r - 14}`} stroke={HID} strokeWidth={1.4} strokeDasharray="22 6 3 6" />
      {/* the port: its bezel, its recess, sixteen pins */}
      <path d={trap(cx, portTop - 14, 252, 206, 112, 12)} stroke={LINE} strokeWidth={2.7} fill={PAPER} />
      <path d={trap(cx, portTop, 214, 172, 84, 9)} stroke={LINE} strokeWidth={2.3} />
      {pins}
      {/* the guides: the adapter's plug goes up into the recess */}
      <g stroke={HID} strokeWidth={2.3} strokeDasharray="0 7">
        <path d={`M${cx - 86} ${portTop + 84}L${cx - 92} ${plugTop}`} />
        <path d={`M${cx + 86} ${portTop + 84}L${cx + 92} ${plugTop}`} />
      </g>
      {/* the adapter: its plug, its body, the lit led */}
      <path d={`M${cx - 96} ${plugTop}L${cx + 96} ${plugTop}L${cx + 82} ${bodyTop}L${cx - 82} ${bodyTop}Z`} stroke={LINE} strokeWidth={2.5} fill={PAPER} />
      <path d={`M${cx - 70} ${plugTop + 10}L${cx + 70} ${plugTop + 10}`} stroke={LINE2} strokeWidth={1.4} />
      <rect x={cx - bw / 2} y={bodyTop} width={bw} height={bh} rx={24} stroke={LINE} strokeWidth={2.7} fill={PAPER} />
      <text x={cx - bw / 2 + 24} y={bodyTop + 46} fontFamily={F.mono} fontSize={19} letterSpacing={1.5} fill={LINE}>ELM327</text>
      <text x={cx - bw / 2 + 24} y={bodyTop + 72} fontFamily={F.mono} fontSize={14} letterSpacing={2} fill={INK3}>OBD-II</text>
      <circle cx={cx + bw / 2 - 30} cy={bodyTop + 62} r={7} fill={INK} />
      <circle cx={cx + bw / 2 - 30} cy={bodyTop + 62} r={14} stroke={LINE2} strokeWidth={1.4} />
      {/* its signal */}
      <g stroke={LINE} strokeWidth={2.5}>
        {[18, 31, 44].map((a) => (
          <path key={a} d={`M${cx + bw / 2 + 8} ${bodyTop + 12 - a}A${a} ${a} 0 0 1 ${cx + bw / 2 + 8 + a} ${bodyTop + 12}`} />
        ))}
      </g>
    </g>
  );
};

/** the two outer tangents between a small circle (a, ra) and a big one (b, rb), as dotted segments */
const Cone: React.FC<{a: {x: number; y: number}; ra: number; b: {x: number; y: number}; rb: number}> = ({a, ra, b, rb}) => {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const d = Math.hypot(dx, dy);
  const phi = Math.atan2(dy, dx);
  const al = Math.acos((ra - rb) / d);
  return (
    <g stroke={DIM} strokeWidth={2.5} strokeDasharray="0 8" strokeLinecap="round">
      {[phi + al, phi - al].map((t, i) => (
        <path key={i} d={`M${a.x + ra * Math.cos(t)} ${a.y + ra * Math.sin(t)}L${b.x + rb * Math.cos(t)} ${b.y + rb * Math.sin(t)}`} />
      ))}
    </g>
  );
};

const Drawing: React.FC = () => {
  const port = {x: px(PORT.x), y: py(PORT.y)};
  const det = {x: 350, y: 1004};
  const R = 192;
  const fx = px(FW.x);
  const rx = px(RW.x);
  const dimY = 1630;
  const bx = det.x + R + 44; // the bracket beside the detail
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      {/* the ground */}
      <path d={`M0 ${G}L1080 ${G}`} stroke="#B4B4B4" strokeWidth={1.9} />
      <Car />
      {/* the port on the car */}
      <Cone a={port} ra={17} b={det} rb={R + 14} />
      <circle cx={port.x} cy={port.y} r={17} fill={PAPER} stroke={LINE} strokeWidth={2.7} />
      <circle cx={port.x} cy={port.y} r={5} fill={INK} />
      <text x={port.x + 30} y={port.y + 8} fontFamily={F.mono} fontSize={22} letterSpacing={1.8} fill={LINE}>OBD-II</text>
      <Detail cx={det.x} cy={det.y} r={R} />
      {/* the bracket: what the detail shows */}
      <g stroke={LINE} strokeWidth={2.5} fill="none" strokeLinecap="round">
        <path d={`M${bx - 14} ${det.y - 120}L${bx} ${det.y - 120}L${bx} ${det.y + 120}L${bx - 14} ${det.y + 120}`} />
      </g>
      <text x={bx + 24} y={det.y + 4} fontFamily={F.sans} fontWeight={600} fontSize={34} fill={INK}>{mtav('საჭის ქვეშ')}</text>
      <text x={bx + 25} y={det.y + 40} fontFamily={F.mono} fontSize={19} letterSpacing={1.6} fill={INK3}>J1962 · 16 PIN</text>
      {/* the wheelbase */}
      <g stroke={DIM} strokeWidth={1.5} fill="none">
        <path d={`M${fx} ${G + 12}L${fx} ${dimY + 14}M${rx} ${G + 12}L${rx} ${dimY + 14}`} strokeDasharray="0 6" strokeLinecap="round" strokeWidth={2.3} />
        <path d={`M${fx} ${dimY}L${(fx + rx) / 2 - 62} ${dimY}M${(fx + rx) / 2 + 62} ${dimY}L${rx} ${dimY}`} />
        <path d={`M${fx - 7} ${dimY + 7}L${fx + 7} ${dimY - 7}M${rx - 7} ${dimY + 7}L${rx + 7} ${dimY - 7}`} strokeWidth={2.3} stroke={LINE2} />
      </g>
      <text x={(fx + rx) / 2} y={dimY + 7} fontFamily={F.mono} fontSize={20} letterSpacing={1.6} fill={INK2} textAnchor="middle">2 995</text>
    </svg>
  );
};

export const CoverLineB: React.FC = () => {
  const size = useFit(LINES, 168);
  const fs = size ?? 168;
  const ruleY = TOP + ROW_H + 30;
  const headTop = ruleY + 56;
  return (
    <AbsoluteFill style={{backgroundColor: PAPER}}>
      <Drawing />
      {/* the top row: the lockup left, the tag right, a hairline under them */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(0.045)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(0.045)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: '1.5px solid rgba(160,160,160,0.9)', fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(TAG)}
        </div>
      </div>
      <div style={{position: 'absolute', top: ruleY, left: PAD, right: PAD, height: 1.5, background: RULE}} />
      <div style={{position: 'absolute', top: headTop, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {LINES.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {mtav(line)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
