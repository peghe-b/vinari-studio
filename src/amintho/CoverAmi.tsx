// „კიდევ ამინთო"'s Reels covers, thin-line vector in the studio grid style (the owner, 31 Oct: drawn graphics, never film
// frames; black and white; three different ones to choose from):
//   A  „კიდევ / ამინთო?!"        dark: the road from above, the car with its lamp lit, the driver beside it and his shout in rings
//   B  „1 100 ₾ / თავსახურზე?"   dark: the fuel cap face-on in its open door, three clicks around it, P0457
//   C  „ჯერ მანქანას / ჰკითხე"   light: the blueprint SUV, its OBD-II port read by a phone, a leader to the fuel cap
import React from 'react';
import {AbsoluteFill, Img, staticFile} from 'remotion';
import {mtav} from '../lib/format';
import {F} from '../tokens';
import {HEAD_LH, MAX_W, PAD, PAPER, ROW_H, TOP, useFit} from './Covers';
import {Car, Cone, INK2, INK3, LINE, P, PORT, px, py, RULE} from './CoverLineB';
import {ENGINE_D} from './kit/cluster';
import {INK} from './kit/stage';

type V = 'A' | 'B' | 'C';
const HEADS: Record<V, string[]> = {A: ['კიდევ', 'ამინთო?!'], B: ['1 100 ₾', 'თავსახურზე?'], C: ['ჯერ მანქანას', 'ჰკითხე']};
const TAGS: Record<V, string> = {A: 'ჩეკის ნათურა', B: 'OBD სკანერი', C: 'OBD სკანერი'};
const DARK: Record<V, boolean> = {A: true, B: true, C: false};

const W = '#F2F2F2'; // white line on black
const W2 = 'rgba(242,242,242,0.55)';
const W3 = 'rgba(242,242,242,0.28)';

// ---- A: the road from above -------------------------------------------------------------------------------------------
const Aerial: React.FC = () => {
  // the road runs from the lower left up to the right; everything is drawn in its own frame and rotated
  const cx = 560;
  const cy = 1260;
  const ang = -32;
  const trees: [number, number, number][] = [
    [-420, -250, 46], [-250, -300, 34], [-60, -265, 40], [150, -310, 30], [330, -255, 44], [520, -290, 36],
    [-470, 250, 38], [-280, 300, 44], [-80, 270, 32], [140, 300, 42], [360, 265, 34], [560, 300, 40],
  ];
  const rings = [90, 160, 240, 330];
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <g transform={`translate(${cx} ${cy}) rotate(${ang})`} fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* the field rows */}
        {[-560, -500, -440, 440, 500, 560].map((y) => (
          <path key={y} d={`M-1100 ${y}L1100 ${y}`} stroke={W3} strokeWidth={1.4} strokeDasharray="2 14" />
        ))}
        {/* the road: its edges, the dashed middle */}
        <path d="M-1100 -150L1100 -150M-1100 150L1100 150" stroke={W} strokeWidth={2.6} />
        <path d="M-1100 -128L1100 -128M-1100 128L1100 128" stroke={W2} strokeWidth={1.3} />
        <path d="M-1100 0L1100 0" stroke={W2} strokeWidth={2.2} strokeDasharray="44 36" />
        {/* the trees, seen from above */}
        {trees.map(([x, y, r], i) => (
          <g key={i}>
            <circle cx={x} cy={y} r={r} stroke={W2} strokeWidth={2} />
            <circle cx={x} cy={y} r={r * 0.45} stroke={W3} strokeWidth={1.4} />
          </g>
        ))}
        {/* the car from above, parked on the right edge, nose up the road */}
        <g transform="translate(-40 72)">
          <rect x={-150} y={-64} width={300} height={128} rx={48} stroke={W} strokeWidth={2.8} fill="#000" />
          <path d="M58 -54C80 -30 80 30 58 54" stroke={W} strokeWidth={2.2} />
          <path d="M-96 -52C-112 -26 -112 26 -96 52" stroke={W} strokeWidth={2.2} />
          <path d="M58 -54L-96 -52M58 54L-96 52" stroke={W2} strokeWidth={1.5} />
          <path d="M46 -66L60 -82L76 -80L70 -64M46 66L60 82L76 80L70 64" stroke={W} strokeWidth={2} />
          <path d="M140 -40L150 -20M140 40L150 20" stroke={W2} strokeWidth={2} />
          {/* the lamp, the only lit thing */}
          <circle cx={-20} cy={0} r={56} fill="url(#amiGlow)" />
          <g transform="translate(-44 -24) scale(2)">
            <path d={ENGINE_D} stroke="#FFFFFF" strokeWidth={1.6} fill="none" />
          </g>
        </g>
        {/* the driver beside it, arms up, and his shout */}
        <g transform="translate(-40 -60)">
          {rings.map((r, i) => (
            <circle key={r} cx={0} cy={0} r={r} stroke={i === 0 ? W : W2} strokeWidth={i === 0 ? 2.2 : 1.6} strokeDasharray={i === 0 ? undefined : '3 10'} opacity={1 - i * 0.18} />
          ))}
          <ellipse cx={0} cy={0} rx={34} ry={20} stroke={W} strokeWidth={2.6} fill="#000" />
          <circle cx={0} cy={0} r={14} stroke={W} strokeWidth={2.6} fill="#000" />
          <path d="M-30 -8L-52 -40M30 -8L52 -40" stroke={W} strokeWidth={2.6} />
        </g>
      </g>
      <defs>
        <radialGradient id="amiGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.55} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </radialGradient>
      </defs>
      {/* the tiny caption, like a plan's legend */}
      <text x={PAD} y={1660} fontFamily={F.mono} fontSize={20} letterSpacing={2} fill={W2}>21:47 · {mtav('ღამე')}</text>
    </svg>
  );
};

// ---- B: the fuel cap face-on --------------------------------------------------------------------------------------------
const Cap: React.FC = () => {
  const cx = 540;
  const cy = 1180;
  const clicks = [-38, -8, 22];
  const arcR = 330;
  const a2p = (deg: number, r: number) => [cx + r * Math.cos((deg * Math.PI) / 180), cy + r * Math.sin((deg * Math.PI) / 180)];
  const [sx, sy] = a2p(-70, arcR);
  const [ex, ey] = a2p(40, arcR);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        {/* the body panel's edge and the door hinged open to the left */}
        <path d={`M-20 ${cy - 420}C300 ${cy - 440} 820 ${cy - 440} 1100 ${cy - 400}`} stroke={W3} strokeWidth={1.6} />
        <circle cx={cx} cy={cy} r={250} stroke={W2} strokeWidth={2} />
        <path d={`M${cx - 250} ${cy - 90}C${cx - 420} ${cy - 120} ${cx - 470} ${cy - 40} ${cx - 470} ${cy}C${cx - 470} ${cy + 40} ${cx - 420} ${cy + 120} ${cx - 250} ${cy + 90}`} stroke={W} strokeWidth={2.4} />
        <path d={`M${cx - 250} ${cy - 90}L${cx - 250} ${cy + 90}`} stroke={W2} strokeWidth={1.6} strokeDasharray="4 8" />
        {/* the pump icon on the open door */}
        <g transform={`translate(${cx - 405} ${cy - 30})`} stroke={W2} strokeWidth={2}>
          <rect x={0} y={0} width={30} height={46} rx={4} />
          <path d="M6 10H24M30 14L40 22V40C40 46 34 46 34 40V30" />
        </g>
        {/* the filler neck ring, the cap */}
        <circle cx={cx} cy={cy} r={210} stroke={W} strokeWidth={2.8} />
        <circle cx={cx} cy={cy} r={186} stroke={W2} strokeWidth={1.5} strokeDasharray="2 9" />
        <circle cx={cx} cy={cy} r={160} stroke={W} strokeWidth={2.8} fill="#0B0B0B" />
        <circle cx={cx} cy={cy} r={142} stroke={W3} strokeWidth={1.4} />
        {/* the grip bar */}
        <g transform={`rotate(-26 ${cx} ${cy})`}>
          <rect x={cx - 122} y={cy - 26} width={244} height={52} rx={26} stroke={W} strokeWidth={2.6} />
          <path d={`M${cx - 96} ${cy}L${cx + 96} ${cy}`} stroke={W3} strokeWidth={1.4} />
        </g>
        {/* the tether */}
        <path d={`M${cx + 150} ${cy + 60}C${cx + 230} ${cy + 150} ${cx + 160} ${cy + 230} ${cx + 60} ${cy + 236}`} stroke={W2} strokeWidth={2} strokeDasharray="1 7" />
        {/* the turn: a dotted arc with an arrow, three clicks */}
        <path d={`M${sx} ${sy}A${arcR} ${arcR} 0 0 1 ${ex} ${ey}`} stroke={W} strokeWidth={2.4} strokeDasharray="1 9" />
        {(() => {
          const [ax, ay] = a2p(40, arcR);
          const [bx, by] = a2p(32, arcR + 18);
          const [cx2, cy2] = a2p(32, arcR - 18);
          return <path d={`M${bx} ${by}L${ax} ${ay}L${cx2} ${cy2}`} stroke={W} strokeWidth={2.6} />;
        })()}
        {clicks.map((d, i) => {
          const [x1, y1] = a2p(d, arcR - 14);
          const [x2, y2] = a2p(d, arcR + 14);
          const [tx, ty] = a2p(d, arcR + 46);
          return (
            <g key={d}>
              <path d={`M${x1} ${y1}L${x2} ${y2}`} stroke={W} strokeWidth={2.6} />
              <text x={tx} y={ty + 7} fontFamily={F.mono} fontSize={22} fill={W} textAnchor="middle">{i + 1}</text>
            </g>
          );
        })}
      </g>
      {/* the code chip and its leader */}
      <path d={`M${cx + 120} ${cy - 120}L${cx + 230} ${cy - 330}L${cx + 300} ${cy - 330}`} stroke={W2} strokeWidth={1.6} fill="none" />
      <circle cx={cx + 120} cy={cy - 120} r={6} fill={W} />
      <rect x={cx + 300} y={cy - 360} width={186} height={60} rx={14} stroke={W} strokeWidth={2.2} fill="#000" />
      <text x={cx + 393} y={cy - 320} fontFamily={F.mono} fontSize={28} letterSpacing={2} fill={W} textAnchor="middle">P0457</text>
      <text x={PAD} y={1660} fontFamily={F.mono} fontSize={20} letterSpacing={2} fill={W2}>{mtav('ავზის თავსახური')} · EVAP</text>
    </svg>
  );
};

// ---- C: the blueprint car read by a phone --------------------------------------------------------------------------------
const FUEL = {x: 4190, y: 1180}; // the filler door on the rear quarter (mm)
const Read: React.FC = () => {
  const port = {x: px(PORT.x), y: py(PORT.y)};
  const fuel = {x: px(FUEL.x), y: py(FUEL.y)};
  const ph = {x: 300, y: 980, w: 190, h: 380};
  const G0 = py(0);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <path d={`M0 ${G0}L1080 ${G0}`} stroke="#B4B4B4" strokeWidth={1.9} />
      <Car />
      {/* the phone outline, reading the port */}
      <Cone a={port} ra={17} b={{x: ph.x, y: ph.y + ph.h / 2}} rb={30} />
      <rect x={ph.x - ph.w / 2} y={ph.y - ph.h / 2} width={ph.w} height={ph.h} rx={30} fill={PAPER} stroke={LINE} strokeWidth={2.8} />
      <rect x={ph.x - 30} y={ph.y - ph.h / 2 + 14} width={60} height={16} rx={8} fill="none" stroke={LINE} strokeWidth={2} />
      <rect x={ph.x - ph.w / 2 + 18} y={ph.y - 70} width={ph.w - 36} height={58} rx={12} fill="none" stroke={LINE} strokeWidth={2.2} />
      <text x={ph.x} y={ph.y - 31} fontFamily={F.mono} fontSize={24} letterSpacing={1.5} fill={INK} textAnchor="middle">P0457</text>
      <path d={`M${ph.x - 66} ${ph.y + 14}H${ph.x + 66}M${ph.x - 66} ${ph.y + 40}H${ph.x + 40}M${ph.x - 66} ${ph.y + 66}H${ph.x + 56}`} stroke={INK3} strokeWidth={2.2} />
      <circle cx={port.x} cy={port.y} r={17} fill={PAPER} stroke={LINE} strokeWidth={2.7} />
      <circle cx={port.x} cy={port.y} r={5} fill={INK} />
      <text x={port.x + 30} y={port.y + 8} fontFamily={F.mono} fontSize={22} letterSpacing={1.8} fill={LINE}>OBD-II</text>
      {/* the leader to the fuel cap: the answer */}
      <circle cx={fuel.x} cy={fuel.y} r={26} fill={PAPER} stroke={LINE} strokeWidth={2.6} />
      <circle cx={fuel.x} cy={fuel.y} r={13} fill="none" stroke={LINE} strokeWidth={2} />
      <path d={`M${fuel.x} ${fuel.y - 26}L${fuel.x} ${ph.y - 120}L${fuel.x - 40} ${ph.y - 120}`} stroke={LINE} strokeWidth={2} fill="none" />
      <text x={fuel.x - 52} y={ph.y - 130} fontFamily={F.sans} fontWeight={600} fontSize={34} fill={INK} textAnchor="end">{mtav('ავზის თავსახური')}</text>
      <text x={fuel.x - 52} y={ph.y - 94} fontFamily={F.mono} fontSize={19} letterSpacing={1.6} fill={INK3} textAnchor="end">{mtav('მოშვებულია')}</text>
    </svg>
  );
};

export const AmiCover: React.FC<{variant?: V}> = ({variant = 'A'}) => {
  const lines = HEADS[variant];
  const size = useFit(lines, 168);
  const fs = size ?? 168;
  const dark = DARK[variant];
  const ink = dark ? '#F2F2F2' : INK;
  const ruleY = TOP + ROW_H + 30;
  const headTop = ruleY + 56;
  const logo = dark ? 'brightness(0) invert(1)' : 'brightness(0) invert(0.045)';
  return (
    <AbsoluteFill style={{backgroundColor: dark ? '#000' : PAPER}}>
      {variant === 'A' ? <Aerial /> : null}
      {variant === 'B' ? <Cap /> : null}
      {variant === 'C' ? <Read /> : null}
      <div style={{position: 'absolute', top: TOP, left: PAD, height: ROW_H, display: 'flex', alignItems: 'center', gap: 14}}>
        <Img src={staticFile('brand/mark.svg')} style={{height: 40, width: (40 * 768) / 671, filter: logo}} />
        <Img src={staticFile('brand/wordmark.svg')} style={{height: 23, width: (23 * 267) / 68, filter: logo}} />
      </div>
      <div style={{position: 'absolute', top: TOP, right: PAD, height: ROW_H, display: 'flex', alignItems: 'center'}}>
        <div style={{height: ROW_H - 2, display: 'flex', alignItems: 'center', gap: 12, padding: '0 20px 0 18px', borderRadius: ROW_H, border: `1.5px solid ${dark ? 'rgba(242,242,242,0.45)' : 'rgba(160,160,160,0.9)'}`, fontFamily: F.mono, fontSize: 22, letterSpacing: '0.06em', color: dark ? W2 : INK2, whiteSpace: 'nowrap'}}>
          <div style={{width: 9, height: 9, borderRadius: 9, background: ink}} />
          {mtav(TAGS[variant])}
        </div>
      </div>
      <div style={{position: 'absolute', top: ruleY, left: PAD, right: PAD, height: 1.5, background: dark ? 'rgba(242,242,242,0.3)' : RULE}} />
      <div style={{position: 'absolute', top: headTop, left: PAD - 4, width: MAX_W + 8, fontFamily: F.sans, fontWeight: 600, fontSize: fs, lineHeight: HEAD_LH, letterSpacing: '-0.01em', color: ink, opacity: size ? 1 : 0}}>
        {lines.map((line, i) => (
          <div key={i} style={{whiteSpace: 'nowrap'}}>
            {mtav(line)}
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};
