// The car's instrument cluster, seen from the driver's seat: a slim floating display under a soft hood, two ring gauges
// (the rev counter left, the speed right) drawn as thin arcs with fine ticks and a slim needle, the gear and the outside
// temperature between them, and the warning lamps in a row under the centre: the battery, the CHECK ENGINE lamp in
// amber (the film's problem), the oil. Around it the dashboard and the windscreen's glow:
//   night  the garage's amber pendants seen through the glass as soft out-of-focus discs, the dash in deep brown-black
//   dawn   the morning's cool violet-blue sky over the hood, the dash in cold dark greys
//   day    a calm daylight: the glass bright, the dash a mid grey, the display still dark glass
// Everything is SVG in frame px (1080 x 1920), frame-driven, no randomness. The whole panel stays inside the frame.
import React from 'react';
import {clamp, lerp} from './lib';

export type ClusterLook = 'night' | 'dawn' | 'day';

export const CL = {x: 540, y: 930, w: 900, h: 400};
const LG = {x: CL.x - 235, y: CL.y + 6, r: 150};
const RG = {x: CL.x + 235, y: CL.y + 6, r: 150};
const A0 = 225; // the arc's start (degrees, 0 = up, clockwise)
const A1 = 495;
export const CHECK_AT = {x: CL.x, y: CL.y + 118};

/** the check engine lamp: the ISO engine outline (a block with its cap, the intake on the left, the fan on the right),
 *  drawn on a 24-unit grid, stroked */
export const ENGINE_D =
  'M8.2 7.4H15.3L16.8 9.2H18.6V8.2H21V15.6H18.6V14.6H16.8L14.6 17.2H9.2L7.2 15.2V7.4ZM10 5H13.6M11.8 5V7.4M4.4 9.6V15M4.4 12.3H7.2';
export const BATTERY_D = 'M4 8H20V18H4ZM7 8V6H10V8M14 8V6H17V8M7.2 13H10.2M15.6 11.5V14.5M14.1 13H17.1';
export const OIL_D = 'M3.5 11.5L7 10.5H11L13 9L20.5 11.6L15 16.5H7.5L5.8 13.6L3.5 12.8ZM20.5 11.6L21.6 14.6M12 7V9';

const pol = (cx: number, cy: number, r: number, deg: number): [number, number] => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
};
const arc = (cx: number, cy: number, r: number, d0: number, d1: number) => {
  const [x0, y0] = pol(cx, cy, r, d0);
  const [x1, y1] = pol(cx, cy, r, d1);
  const large = d1 - d0 > 180 ? 1 : 0;
  return `M${x0.toFixed(1)} ${y0.toFixed(1)}A${r} ${r} 0 ${large} 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
};

const PAL = {
  night: {bgTop: '#2A1D14', bgMid: '#140F0C', bgBot: '#0C0907', dash: '#1A1411', hood: '#0E0B09', hoodHi: '#3A2A20', glass: '#08090B', ring: '#DCE3EE', tick: '#8C96A6', dim: '#2A303A', text: '#E6ECF5', sub: '#7C8696', glow: '#FFB26A'},
  dawn: {bgTop: '#4A5577', bgMid: '#1B1E2A', bgBot: '#0D0E13', dash: '#191B22', hood: '#0F1015', hoodHi: '#3A4258', glass: '#07080B', ring: '#DCE3EE', tick: '#8C96A6', dim: '#2A303A', text: '#E6ECF5', sub: '#7C8696', glow: '#9FB0E0'},
  day: {bgTop: '#D9DCE2', bgMid: '#5E6168', bgBot: '#2C2E33', dash: '#3A3C42', hood: '#24262B', hoodHi: '#8A8E97', glass: '#0A0B0E', ring: '#E8EDF5', tick: '#98A1B0', dim: '#2A303A', text: '#EEF2F8', sub: '#8A93A3', glow: '#FFFFFF'},
};

export type ClusterP = {
  uid: string;
  look: ClusterLook;
  frame: number;
  check: number; // 0..1 the check engine lamp's light
  test?: number; // 0..1 every lamp lit (the self-test at the start)
  on?: number; // 0..1 the display awake
  rpm?: number; // 0..1 of the rev counter's arc
  speed?: number; // 0..1 of the speed's arc
  cam?: {s: number; cx: number; cy: number};
  blur?: number; // px: the whole cluster out of focus (a backdrop for a close-up)
  dimAll?: number; // 0..1 darken (a backdrop)
};

const Gauge: React.FC<{g: {x: number; y: number; r: number}; v: number; on: number; P: (typeof PAL)['night']; n: number; labels: string[]; id: (s: string) => string}> = ({g, v, on, P, n, labels, id}) => {
  const ang = lerp(A0, A1, clamp(v));
  const [nx, ny] = pol(g.x, g.y, g.r - 14, ang);
  const [tx, ty] = pol(g.x, g.y, 22, ang + 180);
  const ticks = [];
  for (let i = 0; i <= n * 2; i++) {
    const d = lerp(A0, A1, i / (n * 2));
    const major = i % 2 === 0;
    const [x0, y0] = pol(g.x, g.y, g.r - (major ? 20 : 12), d);
    const [x1, y1] = pol(g.x, g.y, g.r - 4, d);
    ticks.push(<line key={i} x1={x0} y1={y0} x2={x1} y2={y1} stroke={P.tick} strokeWidth={major ? 3 : 1.6} strokeLinecap="round" opacity={on} />);
  }
  return (
    <g>
      <circle cx={g.x} cy={g.y} r={g.r + 10} fill={`url(#${id('dial')})`} opacity={on} />
      <path d={arc(g.x, g.y, g.r, A0, A1)} stroke={P.dim} strokeWidth={6} fill="none" strokeLinecap="round" opacity={on} />
      {v > 0.001 ? <path d={arc(g.x, g.y, g.r, A0, ang)} stroke={`url(#${id('active')})`} strokeWidth={6} fill="none" strokeLinecap="round" opacity={on} /> : null}
      {ticks}
      {labels.map((l, i) => {
        const d = lerp(A0, A1, i / (labels.length - 1));
        const [x, y] = pol(g.x, g.y, g.r - 44, d);
        return (
          <text key={l} x={x} y={y + 8} textAnchor="middle" fontFamily="FiraGO" fontSize={22} fontWeight={500} fill={P.sub} opacity={on}>
            {l}
          </text>
        );
      })}
      <line x1={tx} y1={ty} x2={nx} y2={ny} stroke="#FF5A3C" strokeWidth={5} strokeLinecap="round" opacity={on} />
      <line x1={tx} y1={ty} x2={nx} y2={ny} stroke="#FF8A6A" strokeWidth={14} strokeLinecap="round" opacity={0.18 * on} />
      <circle cx={g.x} cy={g.y} r={16} fill="#15181E" stroke={P.dim} strokeWidth={3} opacity={on} />
    </g>
  );
};

export const Cluster: React.FC<ClusterP> = ({uid, look, frame, check, test = 0, on = 1, rpm = 0, speed = 0, cam = {s: 1, cx: 540, cy: 960}, blur = 0, dimAll = 0}) => {
  const P = PAL[look];
  const id = (n: string) => `cl${uid}-${n}`;
  const tf = `translate(${540 - cam.cx * cam.s} ${960 - cam.cy * cam.s}) scale(${cam.s})`;
  const ck = clamp(Math.max(check, test));
  const breathe = 1 + 0.05 * Math.sin(frame / 7);
  const lampY = CL.y + 118;
  const lamps: {d: string; x: number; col: string; k: number; s: number}[] = [
    {d: BATTERY_D, x: CL.x - 92, col: '#FF4A3A', k: clamp(test), s: 2.1},
    {d: ENGINE_D, x: CL.x, col: '#FFB020', k: ck, s: 2.5},
    {d: OIL_D, x: CL.x + 92, col: '#FF4A3A', k: clamp(test), s: 2.1},
  ];
  // the out-of-focus lights through the windscreen (night: the garage's pendants; dawn: two far street lamps)
  const bokeh: [number, number, number, number][] =
    look === 'night'
      ? [
          [250, 330, 120, 0.5],
          [700, 260, 90, 0.42],
          [900, 420, 140, 0.3],
          [420, 480, 60, 0.25],
        ]
      : look === 'dawn'
        ? [
            [820, 360, 70, 0.35],
            [260, 420, 50, 0.25],
          ]
        : [];
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, filter: blur > 0 ? `blur(${blur}px)` : undefined}}>
      <defs>
        <linearGradient id={id('bg')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.bgTop} />
          <stop offset="0.36" stopColor={P.bgMid} />
          <stop offset="1" stopColor={P.bgBot} />
        </linearGradient>
        <radialGradient id={id('bok')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={P.glow} stopOpacity={0.9} />
          <stop offset="0.55" stopColor={P.glow} stopOpacity={0.35} />
          <stop offset="1" stopColor={P.glow} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('hood')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={P.hoodHi} />
          <stop offset="0.25" stopColor={P.hood} />
          <stop offset="1" stopColor={P.hood} />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#14171D" />
          <stop offset="1" stopColor={P.glass} />
        </linearGradient>
        <linearGradient id={id('sheen')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.08} />
          <stop offset="0.4" stopColor="#FFFFFF" stopOpacity={0.0} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0.03} />
        </linearGradient>
        <radialGradient id={id('dial')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#1C2230" stopOpacity={0.9} />
          <stop offset="1" stopColor="#0A0C10" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('active')} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0" stopColor="#4C7DFF" />
          <stop offset="1" stopColor="#9FC0FF" />
        </linearGradient>
        <radialGradient id={id('amber')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFB020" stopOpacity={0.55} />
          <stop offset="0.4" stopColor="#FF9A10" stopOpacity={0.18} />
          <stop offset="1" stopColor="#FF9A10" stopOpacity={0} />
        </radialGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      <rect width={1080} height={1920} fill={`url(#${id('bg')})`} />
      <g transform={tf}>
        {bokeh.map(([x, y, r, a], i) => (
          <circle key={i} cx={x} cy={y} r={r} fill={`url(#${id('bok')})`} opacity={a} />
        ))}
        {/* the dash: a broad soft surface from the windscreen's foot down */}
        <path d={`M-200 640C200 600 880 600 1280 640L1280 2200L-200 2200Z`} fill={P.dash} />
        <path d={`M-200 640C200 600 880 600 1280 640`} stroke={P.hoodHi} strokeWidth={3} fill="none" opacity={0.5} />
        {/* the hood over the display */}
        <path
          d={`M${CL.x - CL.w / 2 - 50} ${CL.y - CL.h / 2 + 30}C${CL.x - CL.w / 2 - 30} ${CL.y - CL.h / 2 - 70} ${CL.x + CL.w / 2 + 30} ${CL.y - CL.h / 2 - 70} ${CL.x + CL.w / 2 + 50} ${CL.y - CL.h / 2 + 30}L${CL.x + CL.w / 2 + 50} ${CL.y + CL.h / 2 + 40}L${CL.x - CL.w / 2 - 50} ${CL.y + CL.h / 2 + 40}Z`}
          fill={`url(#${id('hood')})`}
        />
        {/* the display: dark glass in a slim bezel */}
        <rect x={CL.x - CL.w / 2 - 6} y={CL.y - CL.h / 2 - 6} width={CL.w + 12} height={CL.h + 12} rx={46} fill="#2A2D33" />
        <rect x={CL.x - CL.w / 2} y={CL.y - CL.h / 2} width={CL.w} height={CL.h} rx={40} fill={`url(#${id('glass')})`} />
        <Gauge g={LG} v={rpm} on={on} P={P} n={8} labels={['0', '2', '4', '6', '8']} id={id} />
        <Gauge g={RG} v={speed} on={on} P={P} n={12} labels={['0', '60', '120', '180', '240']} id={id} />
        {/* the centre: the gear and the outside temperature */}
        <text x={CL.x} y={CL.y - 40} textAnchor="middle" fontFamily="FiraGO" fontWeight={600} fontSize={76} fill={P.text} opacity={on}>
          P
        </text>
        <text x={CL.x} y={CL.y + 20} textAnchor="middle" fontFamily="FiraGO" fontWeight={500} fontSize={28} fill={P.sub} opacity={on}>
          {look === 'night' ? '14°' : look === 'dawn' ? '6°' : '19°'}
        </text>
        {/* the warning lamps */}
        {lamps.map((L, i) => {
          const s = L.s * (i === 1 ? 1 : 1);
          const x0 = L.x - 12 * s;
          const y0 = lampY - 12 * s;
          return (
            <g key={i}>
              {i === 1 && ck > 0.01 ? <circle cx={L.x} cy={lampY} r={150 * breathe} fill={`url(#${id('amber')})`} opacity={ck} /> : null}
              <g transform={`translate(${x0} ${y0}) scale(${s})`}>
                <path d={L.d} fill="none" stroke="#2C313B" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" opacity={on * (1 - L.k)} />
                {L.k > 0.01 ? (
                  <>
                    <path d={L.d} fill="none" stroke={L.col} strokeWidth={3.4} strokeLinejoin="round" strokeLinecap="round" opacity={0.5 * L.k} filter={`url(#${id('soft')})`} />
                    <path d={L.d} fill="none" stroke={L.col} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" opacity={L.k} />
                  </>
                ) : null}
              </g>
            </g>
          );
        })}
        {/* the glass's sheen over everything on the display */}
        <rect x={CL.x - CL.w / 2} y={CL.y - CL.h / 2} width={CL.w} height={CL.h} rx={40} fill={`url(#${id('sheen')})`} />
      </g>
      {dimAll > 0 ? <rect width={1080} height={1920} fill="#000" opacity={dimAll} /> : null}
    </svg>
  );
};

/** the check engine lamp alone, big, glowing (the close-up over the blurred cluster) */
export const CheckLamp: React.FC<{x: number; y: number; size: number; k: number; frame: number; uid: string}> = ({x, y, size, k, frame, uid}) => {
  const s = size / 24;
  const breathe = 1 + 0.06 * Math.sin(frame / 6);
  return (
    <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
      <defs>
        <radialGradient id={`ck${uid}`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFB020" stopOpacity={0.6} />
          <stop offset="0.35" stopColor="#FF9A10" stopOpacity={0.22} />
          <stop offset="1" stopColor="#FF9A10" stopOpacity={0} />
        </radialGradient>
        <filter id={`cks${uid}`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={1.2} />
        </filter>
      </defs>
      <circle cx={x} cy={y} r={size * 1.25 * breathe} fill={`url(#ck${uid})`} opacity={k} />
      <g transform={`translate(${x - 12 * s} ${y - 12 * s}) scale(${s})`}>
        <path d={ENGINE_D} fill="none" stroke="#2C313B" strokeWidth={1.6} strokeLinejoin="round" strokeLinecap="round" opacity={1 - k} />
        <path d={ENGINE_D} fill="none" stroke="#FFB020" strokeWidth={3} strokeLinejoin="round" strokeLinecap="round" opacity={0.55 * k} filter={`url(#cks${uid})`} />
        <path d={ENGINE_D} fill="none" stroke="#FFC24A" strokeWidth={1.7} strokeLinejoin="round" strokeLinecap="round" opacity={k} />
      </g>
    </svg>
  );
};
