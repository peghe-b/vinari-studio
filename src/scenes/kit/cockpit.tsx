// v2: the crossover's own instrument display, a 2020s digital cockpit (never v1's floating twin-ring cluster): one wide
// black glass panel under a slim hood; a thin power arc on the left, the big digital speed in the middle, the gear and the
// range on the right, the trip line of the road ahead under them, and the warning lamps in a row at its foot where the amber
// CHECK ENGINE lamp lives. Drawn in its own units (1000 x 380), placed by the shot (an SVG group or an absolutely placed
// div). The amber lamp is the only warm thing on it; every number and word on it is white or grey (the film's rule).
import React from 'react';
import {F} from '../../tokens';
import {clamp, lerp} from './lib';
import {AMBER, AMBER_HI, ENGINE_PATH} from './stage';

export const CP = {w: 1000, h: 380};
/** the check lamp's centre in the cockpit's units */
export const CP_LAMP = {x: 500, y: 326};

const BATTERY = 'M4 8H20V18H4ZM7 8V6H10V8M14 8V6H17V8M7.2 13H10.2M15.6 11.5V14.5M14.1 13H17.1';
const BELT = 'M12 3.2A2 2 0 1 1 11.99 3.2ZM8 21L9.5 12.5L12 9L14.5 12.5L16 21M7 13.5L17 10.5';
const LOW = 'M3 13H9M3 9H9M3 17H9M13 7C18.5 7 21 9.5 21 12C21 14.5 18.5 17 13 17Z';

export const Cockpit: React.FC<{uid: string; frame: number; check: number; on?: number; speed?: number; test?: number; night?: number}> = ({uid, frame, check, on = 1, speed = 64, test = 0, night = 1}) => {
  const id = (n: string) => `cp${uid}-${n}`;
  const ck = clamp(Math.max(check, test));
  const pw = clamp(0.28 + 0.04 * Math.sin(frame / 11));
  const arcR = 150;
  const ax = 175;
  const ay = 196;
  const a0 = (200 * Math.PI) / 180;
  const a1 = (340 * Math.PI) / 180;
  const at = (a: number, r = arcR): [number, number] => [ax + r * Math.cos(a), ay + r * Math.sin(a)];
  const arcD = (from: number, to: number, r = arcR) => {
    const [x0, y0] = at(from, r);
    const [x1, y1] = at(to, r);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const lamp = (d: string, x: number, k: number, col: string, key: string) => (
    <g key={key} transform={`translate(${x - 21} ${CP_LAMP.y - 21}) scale(1.75)`} opacity={0.18 + 0.82 * k}>
      <path d={d} fill="none" stroke={k > 0.5 ? col : '#3B3F47'} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" />
    </g>
  );
  const flow = (frame * 0.035) % 1;
  return (
    <g>
      <defs>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#0B0C0F" />
          <stop offset="1" stopColor="#050607" />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.09} />
          <stop offset="0.35" stopColor="#FFFFFF" stopOpacity={0.02} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <radialGradient id={id('amb')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={AMBER} stopOpacity={0.62} />
          <stop offset="0.3" stopColor={AMBER} stopOpacity={0.22} />
          <stop offset="1" stopColor={AMBER} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('road')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.5} />
        </linearGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={2.2} />
        </filter>
      </defs>
      {/* the hood over it and the panel */}
      <path d={`M-40 -26Q500 -70 1040 -26L1020 40L-20 40Z`} fill={night ? '#0E0D0E' : '#1C1D21'} />
      <rect x={0} y={0} width={CP.w} height={CP.h} rx={46} fill={`url(#${id('glass')})`} />
      <rect x={1.5} y={1.5} width={CP.w - 3} height={CP.h - 3} rx={45} fill="none" stroke="#2A2C31" strokeWidth={3} />
      <g opacity={on}>
        {/* the power arc */}
        <path d={arcD(a0, a1)} stroke="#24272D" strokeWidth={10} fill="none" strokeLinecap="round" />
        <path d={arcD(a0, lerp(a0, a1, pw))} stroke="#E9EDF3" strokeWidth={10} fill="none" strokeLinecap="round" />
        <text x={ax} y={ay - 30} textAnchor="middle" fontFamily={F.sans} fontSize={30} fontWeight={500} fill="#8C929C">
          {Math.round(pw * 100)}%
        </text>
        {/* the speed */}
        <text x={500} y={196} textAnchor="middle" fontFamily={F.sans} fontSize={168} fontWeight={300} fill="#F4F6F9" letterSpacing={-4}>
          {Math.round(speed)}
        </text>
        <text x={500} y={238} textAnchor="middle" fontFamily={F.sans} fontSize={30} fontWeight={500} fill="#7E848E" letterSpacing={2}>
          km/h
        </text>
        {/* the gear and the range */}
        <text x={830} y={150} textAnchor="middle" fontFamily={F.sans} fontSize={74} fontWeight={500} fill="#F4F6F9">
          D
        </text>
        <text x={830} y={196} textAnchor="middle" fontFamily={F.sans} fontSize={28} fontWeight={500} fill="#7E848E">
          412 km
        </text>
        {/* the road ahead: two converging edges and the dashes flowing toward the driver */}
        <path d="M712 272L790 214M948 272L870 214" stroke={`url(#${id('road')})`} strokeWidth={3} fill="none" />
        {[0, 1, 2].map((i) => {
          const u = (flow + i / 3) % 1;
          const y = lerp(218, 270, u * u);
          const hw = lerp(1, 4, u);
          return <rect key={i} x={830 - hw / 2} y={y} width={hw} height={lerp(5, 14, u)} fill="#FFFFFF" opacity={0.25 + 0.5 * u} />;
        })}
        {/* the clock and the outside air, small, up top */}
        <text x={64} y={58} fontFamily={F.sans} fontSize={26} fontWeight={500} fill="#7E848E">
          19:42
        </text>
        <text x={936} y={58} textAnchor="end" fontFamily={F.sans} fontSize={26} fontWeight={500} fill="#7E848E">
          14°
        </text>
        {/* the lamps' row */}
        {lamp(BATTERY, 360, test, '#E6534A', 'bat')}
        {lamp(BELT, 420, test, '#E6534A', 'belt')}
        {lamp(LOW, 640, test, '#4FAE6B', 'low')}
        <circle cx={CP_LAMP.x} cy={CP_LAMP.y} r={96 * (1 + 0.05 * Math.sin(frame / 6))} fill={`url(#${id('amb')})`} opacity={ck} />
        <g transform={`translate(${CP_LAMP.x - 30} ${CP_LAMP.y - 30}) scale(2.5)`}>
          <path d={ENGINE_PATH} fill="none" stroke="#3B3F47" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" opacity={1 - ck} />
          <path d={ENGINE_PATH} fill="none" stroke={AMBER} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" opacity={0.55 * ck} filter={`url(#${id('soft')})`} />
          <path d={ENGINE_PATH} fill="none" stroke={AMBER_HI} strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" opacity={ck} />
        </g>
      </g>
      <rect x={0} y={0} width={CP.w} height={CP.h} rx={46} fill={`url(#${id('sheen')})`} />
    </g>
  );
};
