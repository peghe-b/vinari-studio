// The pinned navigator cover's picture (the owner, 2026-10-14: "not a mockup: the navigator's own graphic, the icon big, from
// above, in 3D, with stripes like a map"). A city map seen from above at a steep tilt (one flat CSS perspective transform,
// no nested 3D): grey blocks, white roads with soft kerbs and dashed centre lines, the route drawn thick in ink with a turn,
// and on it the big navigation arrow lying on the map like the navigator's own puck, with a body under its top face (an
// offset dark copy reads as thickness in the tilt), a lit and a shaded half, a white rim and a soft shadow. Grey only:
// the cover is black and white.
import React from 'react';

const BLOCK = '#E4E4E4';
const FIELD = '#EFEFEF';
const KERB = '#D0D0D0';
const ROAD = '#FFFFFF';

const VX = [150, 650, 1150, 1650, 2150];
const HY = [150, 650, 1150, 1650, 2150];

const blocks: {x: number; y: number; w: number; h: number}[] = [];
for (let i = 0; i < VX.length - 1; i++) {
  for (let j = 0; j < HY.length - 1; j++) {
    blocks.push({x: VX[i] + 52, y: HY[j] + 52, w: VX[i + 1] - VX[i] - 104, h: HY[j + 1] - HY[j] - 104});
  }
}

const ROADS = [
  ...VX.map((x) => `M ${x} -300 L ${x} 2700`),
  ...HY.map((y) => `M -300 ${y} L 2700 ${y}`),
  'M -300 2500 L 2700 -100',
];
const ROUTE = 'M 1150 2700 L 1150 1150 L 1650 1150 L 1650 650 L 2150 650 L 2150 -300';

// the arrow, pointing up the route, centred on (0, 0) in plane pixels
const TIP = 270;
const WING = 205;
const BACK = 215;
const NOTCH = 85;
const arrow = (dy = 0) => `M 0 ${-TIP + dy} L ${WING} ${BACK + dy} L 0 ${NOTCH + dy} L ${-WING} ${BACK + dy} Z`;
const leftHalf = `M 0 ${-TIP} L 0 ${NOTCH} L ${-WING} ${BACK} Z`;
const rightHalf = `M 0 ${-TIP} L ${WING} ${BACK} L 0 ${NOTCH} Z`;

/** look: where the plane's centre sits in the picture (0..1), its tilt and the arrow's place and size */
export type MapLook = {cy?: number; tilt?: number; rotZ?: number; ay?: number; arrow?: number; persp?: number};

export const NavMapPicture: React.FC<{top: number; height: number; look?: MapLook}> = ({top, height, look = {}}) => {
  const ax = 1150;
  const ay = look.ay ?? 1330;
  const cy = look.cy ?? 0.5;
  const tilt = look.tilt ?? 50;
  const rotZ = look.rotZ ?? -12;
  const arrowK = look.arrow ?? 1;
  const persp = look.persp ?? 1700;
  return (
    <div style={{position: 'absolute', left: 0, top, width: 1080, height, overflow: 'hidden'}}>
      <div
        style={{
          position: 'absolute',
          left: 540 - 1200,
          top: height * cy - 1200,
          width: 2400,
          height: 2400,
          transformOrigin: '50% 50%',
          transform: `perspective(${persp}px) rotateX(${tilt}deg) rotateZ(${rotZ}deg)`,
        }}
      >
        <svg width={2400} height={2400} viewBox="0 0 2400 2400">
          <defs>
            <linearGradient id="ncmLit" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#4A4A4A" />
              <stop offset="1" stopColor="#262626" />
            </linearGradient>
            <linearGradient id="ncmShade" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#1C1C1C" />
              <stop offset="1" stopColor="#050505" />
            </linearGradient>
            <radialGradient id="ncmShadow">
              <stop offset="0" stopColor="#000" stopOpacity={0.32} />
              <stop offset="1" stopColor="#000" stopOpacity={0} />
            </radialGradient>
          </defs>
          <rect x={-300} y={-300} width={3000} height={3000} fill={FIELD} />
          {blocks.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width={b.w} height={b.h} rx={22} fill={BLOCK} />
          ))}
          {ROADS.map((d, i) => (
            <path key={`k${i}`} d={d} stroke={KERB} strokeWidth={i === ROADS.length - 1 ? 92 : 76} fill="none" />
          ))}
          {ROADS.map((d, i) => (
            <path key={`r${i}`} d={d} stroke={ROAD} strokeWidth={i === ROADS.length - 1 ? 80 : 64} fill="none" />
          ))}
          {ROADS.map((d, i) => (
            <path key={`c${i}`} d={d} stroke={KERB} strokeWidth={4} strokeDasharray="30 26" fill="none" />
          ))}
          {/* the route: a white halo, then the ink line */}
          <path d={ROUTE} stroke="#FFFFFF" strokeWidth={60} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          <path d={ROUTE} stroke="#121212" strokeWidth={40} fill="none" strokeLinecap="round" strokeLinejoin="round" />
          {/* the destination: a ring at the route's far end */}
          <circle cx={2150} cy={250} r={54} fill="#121212" />
          <circle cx={2150} cy={250} r={24} fill="#FFFFFF" />
          {/* the arrow on the route */}
          <g transform={`translate(${ax} ${ay}) scale(${arrowK})`}>
            <ellipse cx={0} cy={70} rx={260} ry={230} fill="url(#ncmShadow)" />
            <path d={arrow(40)} fill="#000" />
            <path d={arrow(0)} fill="none" stroke="#FFFFFF" strokeWidth={26} strokeLinejoin="round" />
            <path d={leftHalf} fill="url(#ncmLit)" />
            <path d={rightHalf} fill="url(#ncmShade)" />
            <path d={arrow(0)} fill="none" stroke="#FFFFFF" strokeWidth={8} strokeLinejoin="round" />
          </g>
        </svg>
      </div>
      {/* the far edge melts into the paper under the headline */}
      <div style={{position: 'absolute', left: 0, right: 0, top: 0, height: 300, background: 'linear-gradient(#FFFFFF, rgba(255,255,255,0))'}} />
    </div>
  );
};
