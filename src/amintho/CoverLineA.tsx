// 3D OBD film cover A, thin-line vector (studio grid style). Built by the cover workflow.
// „ყველაზე ძვირი ნათურა": a dark cover. The instrument cluster drawn straight on as a precise line drawing (two gauges
// bleeding off both sides, a thin hood brow over them), every line white and thin; the only lit thing is the check-engine
// lamp in the centre, and a dotted leader hangs from it down to a price tag that only says „?".
// Grid rules (src/Cover.tsx): the top row at y 300 with a hairline under it, the headline under that, everything that
// matters inside y 240..1680. Black, white and greys only.
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {HEAD_LH, MAX_W, PAD, ROW_H, TOP, useFit} from './Covers';

const BG = '#000000';
const INK = '#F5F5F5';
const DIM = '#8A8A8A';
const QUIET = '#5E5E5E';
const FAINT = '#2E2E2E';
const RULE_Y = TOP + ROW_H + 30;
const HEAD_TOP = RULE_Y + 56;
const LINES = ['ყველაზე ძვირი', 'ნათურა'];
const TAG = 'ჩეკის ნათურა';

// the engine lamp (24 px icon box): the body is one closed sub-path, the cap, the pipe and the plug are strokes
const ENGINE_BODY = 'M8.2 7.4H15.3L16.8 9.2H18.6V8.2H21V15.6H18.6V14.6H16.8L14.6 17.2H9.2L7.2 15.2V7.4Z';
const ENGINE_BITS = 'M10 5H13.6M11.8 5V7.4M4.4 9.6V15M4.4 12.3H7.2';
const ENGINE_C = {x: 12.7, y: 11.1};

// the drawing's geometry
const GY = 1205; // the gauges' hubs
const GL = 145; // left hub x (the speedometer)
const GR = 935; // right hub x (the rev counter)
const BEZEL = 304;
const TRACK = 282;
const LAMP = {x: 540, y: 995};
const TAG_HOLE = {x: 540, y: 1418};

const rad = (a: number) => (a * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, a: number): [number, number] => [cx + r * Math.cos(rad(a)), cy - r * Math.sin(rad(a))];
/** a clockwise arc from math angle a1 down to a2 (a1 > a2) */
const arc = (cx: number, cy: number, r: number, a1: number, a2: number) => {
  const [x1, y1] = pt(cx, cy, r, a1);
  const [x2, y2] = pt(cx, cy, r, a2);
  return `M${x1.toFixed(2)} ${y1.toFixed(2)}A${r} ${r} 0 ${a1 - a2 > 180 ? 1 : 0} 1 ${x2.toFixed(2)} ${y2.toFixed(2)}`;
};

const A0 = 225; // value 0 sits lower left, the sweep runs 270 degrees clockwise
const SWEEP = 270;

type GaugeSpec = {
  cx: number;
  steps: number; // fine ticks over the whole sweep
  mid: number; // a medium tick every n fine ticks
  major: number; // a long tick every n fine ticks
  every: number; // a number every n fine ticks
  label: (i: number) => string;
  value: number; // the needle, in fine ticks
  red?: number; // the red zone starts at this fine tick (hatched, no colour)
  unit: string;
};

const Gauge: React.FC<{g: GaugeSpec}> = ({g}) => {
  const {cx, steps} = g;
  const ang = (i: number) => A0 - (i / steps) * SWEEP;
  const ticks: React.ReactNode[] = [];
  for (let i = 0; i <= steps; i++) {
    const a = ang(i);
    const major = i % g.major === 0;
    const mid = !major && i % g.mid === 0;
    const len = major ? 30 : mid ? 18 : 10;
    const [x1, y1] = pt(cx, GY, TRACK - 1, a);
    const [x2, y2] = pt(cx, GY, TRACK - len, a);
    ticks.push(<line key={`t${i}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={major ? 2.6 : mid ? 1.8 : 1.3} opacity={major ? 1 : mid ? 0.85 : 0.6} />);
    if (i % g.every === 0) {
      const [tx, ty] = pt(cx, GY, TRACK - 60, a);
      ticks.push(
        <text key={`n${i}`} x={tx} y={ty} fill={DIM} fontFamily={F.mono} fontSize={22} letterSpacing="0.02em" textAnchor="middle" dominantBaseline="central">
          {g.label(i)}
        </text>,
      );
    }
  }
  // the red zone: a hatched band inside the track (fine radial strokes), drawn in white
  const hatch: React.ReactNode[] = [];
  if (g.red !== undefined) {
    const n = (steps - g.red) * 2;
    for (let k = 0; k <= n; k++) {
      const a = ang(g.red + k / 2);
      const [x1, y1] = pt(cx, GY, TRACK - 34, a);
      const [x2, y2] = pt(cx, GY, TRACK - 46, a);
      hatch.push(<line key={`h${k}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={INK} strokeWidth={1.3} opacity={0.75} />);
    }
  }
  // the needle: a slim outline from behind the hub to the ticks
  const na = ang(g.value);
  const [tipX, tipY] = pt(cx, GY, TRACK - 22, na);
  const [b1x, b1y] = pt(cx, GY, 7, na + 90);
  const [b2x, b2y] = pt(cx, GY, 7, na - 90);
  const [tlx, tly] = pt(cx, GY, 46, na + 180);
  return (
    <g>
      {/* the bezel, a full circle, and the tick track along the sweep */}
      <circle cx={cx} cy={GY} r={BEZEL} fill="none" stroke={QUIET} strokeWidth={1.5} />
      <path d={arc(cx, GY, TRACK, A0, A0 - SWEEP)} fill="none" stroke={INK} strokeWidth={2.4} strokeLinecap="round" />
      {g.red !== undefined ? <path d={arc(cx, GY, TRACK - 34, ang(g.red), A0 - SWEEP)} fill="none" stroke={INK} strokeWidth={1.3} opacity={0.75} /> : null}
      {g.red !== undefined ? <path d={arc(cx, GY, TRACK - 46, ang(g.red), A0 - SWEEP)} fill="none" stroke={INK} strokeWidth={1.3} opacity={0.75} /> : null}
      {hatch}
      {ticks}
      {/* the inner face: a dotted ring */}
      <circle cx={cx} cy={GY} r={150} fill="none" stroke={QUIET} strokeWidth={2} strokeDasharray="0 9" strokeLinecap="round" />
      <text x={cx} y={GY + 96} fill={DIM} fontFamily={F.mono} fontSize={20} letterSpacing="0.08em" textAnchor="middle" dominantBaseline="central">
        {g.unit}
      </text>
      <path d={`M${tipX} ${tipY}L${b1x} ${b1y}L${tlx} ${tly}L${b2x} ${b2y}Z`} fill="none" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
      <circle cx={cx} cy={GY} r={20} fill={BG} stroke={INK} strokeWidth={2} />
      <circle cx={cx} cy={GY} r={6} fill="none" stroke={INK} strokeWidth={1.6} />
    </g>
  );
};

const SPEEDO: GaugeSpec = {cx: GL, steps: 52, mid: 2, major: 4, every: 8, label: (i) => String(i * 5), value: 22, unit: 'km/h'};
const TACHO: GaugeSpec = {cx: GR, steps: 80, mid: 5, major: 10, every: 10, label: (i) => String(i / 10), value: 24, red: 65, unit: '×1000 r/min'};

/** the hanging price tag, its hole at the origin, rotated a touch as it swings */
const PriceTag: React.FC<{x: number; y: number; turn: number}> = ({x, y, turn}) => {
  const w = 78; // half width
  const top = -30;
  const shoulder = 18;
  const bottom = 206;
  const r = 10;
  const body = `M${-40} ${top}H40L${w} ${shoulder}V${bottom - r}Q${w} ${bottom} ${w - r} ${bottom}H${-w + r}Q${-w} ${bottom} ${-w} ${bottom - r}V${shoulder}Z`;
  const inset = 12;
  const inner = `M${-40 + 5} ${top + inset}H${40 - 5}L${w - inset} ${shoulder + 5}V${bottom - inset}H${-w + inset}V${shoulder + 5}Z`;
  return (
    <g transform={`translate(${x} ${y}) rotate(${turn})`}>
      <path d={body} fill={BG} stroke={INK} strokeWidth={2.6} strokeLinejoin="round" />
      <path d={inner} fill="none" stroke={QUIET} strokeWidth={1.5} strokeDasharray="5 7" strokeLinejoin="round" />
      <circle cx={0} cy={0} r={9} fill={BG} stroke={INK} strokeWidth={2.2} />
      <text x={0} y={52} fill={DIM} fontFamily={F.mono} fontSize={24} textAnchor="middle" dominantBaseline="central">
        ₾
      </text>
      <text x={0} y={132} fill={INK} fontFamily={F.sans} fontWeight={600} fontSize={128} textAnchor="middle" dominantBaseline="central">
        ?
      </text>
    </g>
  );
};

const Drawing: React.FC = () => {
  const k = 7.2; // the lamp's scale from its 24 px box
  const lampT = `translate(${LAMP.x - ENGINE_C.x * k} ${LAMP.y - ENGINE_C.y * k}) scale(${k})`;
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id="cla-halo" cx={LAMP.x} cy={LAMP.y} r={210} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.3} />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.11} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
        <filter id="cla-glow" x="-1" y="-1" width="3" height="3">
          <feGaussianBlur stdDeviation={1.6} />
        </filter>
      </defs>

      {/* a blueprint axis through both hubs */}
      <line x1={0} y1={GY} x2={1080} y2={GY} stroke={FAINT} strokeWidth={1.5} strokeDasharray="22 8 3 8" />

      {/* the cluster hood's brow, bleeding off both sides, and its lip */}
      <path d="M-40 905Q540 705 1120 905" fill="none" stroke={INK} strokeWidth={2.4} />
      <path d="M-40 923Q540 723 1120 923" fill="none" stroke={QUIET} strokeWidth={1.5} />

      <Gauge g={SPEEDO} />
      <Gauge g={TACHO} />

      {/* the lit lamp: a soft halo, a glow, the solid symbol, and two quiet rings around it */}
      <circle cx={LAMP.x} cy={LAMP.y} r={210} fill="url(#cla-halo)" />
      <circle cx={LAMP.x} cy={LAMP.y} r={84} fill="none" stroke={QUIET} strokeWidth={1.5} />
      <circle cx={LAMP.x} cy={LAMP.y} r={112} fill="none" stroke={DIM} strokeWidth={2.4} strokeDasharray="0 10" strokeLinecap="round" />
      <g transform={lampT} filter="url(#cla-glow)" opacity={0.9}>
        <path d={ENGINE_BODY} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={2.4} strokeLinejoin="round" />
        <path d={ENGINE_BITS} fill="none" stroke="#FFFFFF" strokeWidth={2.4} strokeLinecap="round" />
      </g>
      <g transform={lampT}>
        <path d={ENGINE_BODY} fill="#FFFFFF" stroke="#FFFFFF" strokeWidth={1.4} strokeLinejoin="round" />
        <path d={ENGINE_BITS} fill="none" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
      </g>
      {/* focus marks on the dotted ring, a blueprint's crosshair */}
      {[0, 90, 180].map((a) => {
        const [x1, y1] = pt(LAMP.x, LAMP.y, 100, a);
        const [x2, y2] = pt(LAMP.x, LAMP.y, 126, a);
        return <line key={a} x1={x1} y1={y1} x2={x2} y2={y2} stroke={DIM} strokeWidth={1.6} />;
      })}

      {/* the dotted leader from the lamp down to the tag */}
      <circle cx={LAMP.x} cy={LAMP.y + 112} r={4.5} fill={INK} />
      <line x1={LAMP.x} y1={LAMP.y + 128} x2={TAG_HOLE.x} y2={TAG_HOLE.y - 14} stroke={INK} strokeWidth={3} strokeDasharray="0 11" strokeLinecap="round" />
      <PriceTag x={TAG_HOLE.x} y={TAG_HOLE.y} turn={-6} />
    </svg>
  );
};

export const CoverLineA: React.FC = () => {
  const size = useFit(LINES, 168);
  const fs = size ?? 168;
  return (
    <AbsoluteFill style={{backgroundColor: BG}}>
      <Drawing />
      {/* top row: the lockup left, the tag right, a hairline under them */}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: 'brightness(0) invert(1)'}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: 'brightness(0) invert(1)'}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 22px 0 18px', borderRadius: ROW_H, border: `1.5px solid ${QUIET}`, fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: '#B4B4B4', whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: INK}} />
          {mtav(TAG)}
        </div>
      </div>
      <div style={{position: 'absolute', top: RULE_Y, left: PAD, right: PAD, height: 1.5, background: 'rgba(94,94,94,0.55)'}} />
      {/* the headline */}
      <div style={{position: 'absolute', top: HEAD_TOP, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: INK, opacity: size ? 1 : 0}}>
        {LINES.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {mtav(line)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
