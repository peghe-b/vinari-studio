// Mountains, no signal (Alice offline), then WHY it works offline: one continuous illustrated shot in the light Graphite
// look. Caucasus-like ridges with thin snow lines, a serpentine road; the hero car (the same cobalt car the forest drew
// crudely, now refined) climbs in rear view with the phone glowing in its dash holder; a tower on the ridge loses its three
// arcs to a red slash; the green route keeps drawing ahead. Then the camera pushes toward the car, three line icons (the map,
// search, the voice) lift off the landscape and drop into the phone, the phone glows, and on „აბა, მოუსმინე." the push goes
// all the way into the phone's speaker.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {Car, carBox} from './kit/car';
import {IlloDefs} from './kit/solid';
import {alongPoly, clamp, E, ev, evs, fr, GREEN, INK, lerp, polyLen, prog, RED, sampleSmooth, shot, sp, type Pt} from './lib';

const W = 1080;
const H = 1920;
const G = {g0: '#FFFFFF', g1: '#EFEFEF', g2: '#E2E2E2', g3: '#CFCFCF', g4: '#B4B4B4', g5: '#8E8E8E', g6: '#666666'};

// the road's centre line, near (bottom) to far (the pass)
const ROAD: Pt[] = sampleSmooth(
  [
    [540, 2060],
    [600, 1760],
    [360, 1560],
    [640, 1400],
    [430, 1265],
    [610, 1150],
    [500, 1060],
    [585, 985],
    [560, 930],
  ],
  14,
);
const widthAt = (y: number) => lerp(14, 330, clamp((y - 930) / 1130) ** 1.25);
const roadPoly = () => {
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < ROAD.length; i++) {
    const a = ROAD[Math.max(0, i - 1)];
    const b = ROAD[Math.min(ROAD.length - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const w = widthAt(ROAD[i][1]) / 2;
    left.push([ROAD[i][0] + nx * w, ROAD[i][1] + ny * w]);
    right.push([ROAD[i][0] - nx * w, ROAD[i][1] - ny * w]);
  }
  const pts = [...left, ...right.reverse()];
  return `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')} Z`;
};
const ROAD_D = roadPoly();
const ROAD_LEN = polyLen(ROAD);
const ridge = (pts: Pt[], base = 2100) => `M${pts.map((p) => p.join(' ')).join(' L')} L${pts[pts.length - 1][0]} ${base} L${pts[0][0]} ${base} Z`;
const FAR: Pt[] = [[-60, 900], [80, 760], [170, 820], [300, 610], [380, 700], [470, 560], [560, 690], [660, 600], [760, 720], [870, 650], [960, 760], [1140, 690]];
const SNOW: Pt[][] = [
  [[236, 712], [300, 610], [344, 668], [318, 660], [300, 686], [272, 676]],
  [[420, 634], [470, 560], [512, 622], [488, 616], [470, 640], [446, 630]],
  [[612, 666], [660, 600], [706, 662], [680, 652], [660, 674], [636, 664]],
  [[826, 712], [870, 650], [912, 706], [890, 700], [870, 716], [850, 708]],
];
const MID: Pt[] = [[-60, 1010], [120, 900], [260, 960], [400, 870], [520, 940], [640, 890], [800, 980], [940, 920], [1140, 1000]];
const NEAR_L: Pt[] = [[-60, 1180], [100, 1100], [260, 1160], [380, 1240], [300, 1500], [-60, 1600]];
const NEAR_R: Pt[] = [[1140, 1120], [960, 1060], [820, 1140], [740, 1300], [880, 1560], [1140, 1640]];

/** the car on the road at fraction s (0 near .. 1 the pass): position, scale, lean */
const carAt = (s: number) => {
  const {p, a} = alongPoly(ROAD, s);
  const w = widthAt(p[1]);
  return {x: p[0], y: p[1], len: w * 2.15, lean: Math.cos(a) * 3};
};

const Tower: React.FC<{x: number; y: number; arcs: number[]; slash: number}> = ({x, y, arcs, slash}) => (
  <g>
    <path d={`M${x - 34} ${y} L${x} ${y - 190} L${x + 34} ${y} M${x - 26} ${y - 40} L${x + 26} ${y - 40} M${x - 18} ${y - 85} L${x + 18} ${y - 85} M${x - 10} ${y - 130} L${x + 10} ${y - 130} M${x - 26} ${y - 40} L${x + 18} ${y - 85} L${x - 10} ${y - 130} M${x + 26} ${y - 40} L${x - 18} ${y - 85} L${x + 10} ${y - 130}`} fill="none" stroke={INK} strokeWidth={2.4} strokeLinejoin="round" />
    <circle cx={x} cy={y - 196} r={7} fill={INK} />
    {[0, 1, 2].map((i) => {
      const r = 30 + i * 24;
      const o = arcs[i];
      if (o <= 0) return null;
      return (
        <g key={i} opacity={o} fill="none" stroke={INK} strokeWidth={3} strokeLinecap="round">
          <path d={`M${x - r * 0.7} ${y - 196 - r * 0.7} A${r} ${r} 0 0 0 ${x - r * 0.7} ${y - 196 + r * 0.7}`} />
          <path d={`M${x + r * 0.7} ${y - 196 - r * 0.7} A${r} ${r} 0 0 1 ${x + r * 0.7} ${y - 196 + r * 0.7}`} />
        </g>
      );
    })}
    {slash > 0 ? <line x1={x - 60 * slash} y1={y - 256 + 0} x2={x - 60 + 120 * slash} y2={y - 256 + 120 * slash} stroke={RED} strokeWidth={6} strokeLinecap="round" /> : null}
  </g>
);

const Icon: React.FC<{kind: 'map' | 'search' | 'voice'; x: number; y: number; s: number; o: number}> = ({kind, x, y, s, o}) => (
  <g transform={`translate(${x} ${y}) scale(${s})`} opacity={o} fill="none" stroke={INK} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round">
    <circle r={58} fill="#FFFFFF" stroke={INK} strokeWidth={3} />
    {kind === 'map' ? <path d="M-30 -20 L-10 -28 L10 -20 L30 -28 L30 22 L10 30 L-10 22 L-30 30 Z M-10 -28 L-10 22 M10 -20 L10 30" /> : null}
    {kind === 'search' ? <path d="M6 6 L26 26 M-4 -26 A22 22 0 1 0 -3.9 -26 Z" /> : null}
    {kind === 'voice' ? <path d="M-30 -10 L-16 -10 L0 -26 L0 26 L-16 10 L-30 10 Z M12 -14 Q22 0 12 14 M20 -24 Q38 0 20 24" /> : null}
  </g>
);

export const MountainSeq: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId();
  const base = fr(shot('mountain').from);
  const L = (s: number) => fr(s) - base;
  const end = fr(shot('why').to) - base;
  const whyAt = fr(shot('why').from) - base;
  const arcsT = evs('arcs').map(L);
  const slashT = L(ev('slash'));
  const alice = L(ev('alice1'));
  const icons = evs('icons').map(L);
  const glowT = L(ev('glow'));
  const aba = L(ev('aba'));
  // the car climbs all through the shot
  const s = lerp(0.13, 0.3, E.sine(clamp(t / end)));
  const car = carAt(s);
  const cb = carBox('rear', 'ev', car.len);
  // the phone in the dash, seen through the rear glass
  const ph = {x: car.x, y: car.y - 0.292 * car.len, w: 0.07 * car.len, h: 0.034 * car.len};
  // the camera: a drift, then the push to the car, then into the phone
  const push1 = E.inOut(prog(t, whyAt - 4, 40));
  const push2 = E.in(prog(t, aba + 4, end - aba - 2));
  const zoom = lerp(1.0 + 0.03 * clamp(t / whyAt), 2.7, push1) * lerp(1, 9, push2);
  const fx = lerp(540, ph.x, Math.max(push1, push2));
  const fy = lerp(1100, ph.y, Math.max(push1, push2));
  const tx = 540 - fx * zoom;
  const ty = lerp(1000, 900, push1) - fy * zoom;
  // the route ahead of the car, drawing on
  const routeFrom = s + 0.01;
  const routeTo = lerp(routeFrom, 1, E.out(prog(t, 4, 50)));
  const routePts: Pt[] = [];
  for (let k = 0; k <= 40; k++) routePts.push(alongPoly(ROAD, lerp(routeFrom, routeTo, k / 40)).p);
  const routeW = (y: number) => widthAt(y) * 0.16;
  // the tower's arcs and the slash
  const arcs = arcsT.map((a) => 1 - clamp((t - a) / 5));
  const slash = E.out(prog(t, slashT, 6));
  // Alice's sound rings from the cabin
  const rings = t >= alice && t < alice + 64 ? [0, 1, 2].map((i) => ((t - alice + i * 9) % 27) / 27) : [];
  // the icons: lift off the landscape, fly in an arc into the phone
  const iconFrom: Pt[] = [
    [470, 600],
    [210, 1000],
    [900, 1050],
  ];
  const glow = t >= glowT ? Math.exp(-(t - glowT) / 10) * clamp((t - glowT) / 3) : 0;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', inset: 0}}>
      <IlloDefs uid={uid} />
      <rect width={W} height={H} fill="#FFFFFF" />
      <g transform={`translate(${tx} ${ty}) scale(${zoom})`}>
        <path d={ridge(FAR)} fill={G.g1} />
        {SNOW.map((p, i) => (
          <path key={i} d={`M${p.map((q) => q.join(' ')).join(' L')} Z`} fill="#FFFFFF" stroke={G.g4} strokeWidth={1.4} strokeLinejoin="round" />
        ))}
        <path d={`M${FAR.map((q) => q.join(' ')).join(' L')}`} fill="none" stroke={G.g4} strokeWidth={1.4} strokeLinejoin="round" />
        <Tower x={870} y={652} arcs={arcs} slash={slash} />
        <path d={ridge(MID)} fill={G.g2} />
        <path d={`M${MID.map((q) => q.join(' ')).join(' L')}`} fill="none" stroke={G.g4} strokeWidth={1.4} strokeLinejoin="round" />
        <path d={`M-60 1080 Q300 1020 540 1060 T1140 1060 L1140 2100 L-60 2100 Z`} fill={G.g1} />
        <path d={ridge(NEAR_L)} fill={G.g2} />
        <path d={ridge(NEAR_R)} fill={G.g2} />
        <path d={ROAD_D} fill={G.g4} />
        {/* the road's centre dashes */}
        {Array.from({length: 26}, (_, i) => {
          const a = alongPoly(ROAD, i / 26 + 0.01).p;
          const b = alongPoly(ROAD, i / 26 + 0.022).p;
          return <line key={i} x1={a[0]} y1={a[1]} x2={b[0]} y2={b[1]} stroke="#FFFFFF" strokeWidth={Math.max(1.2, widthAt(a[1]) * 0.03)} strokeLinecap="round" />;
        })}
        {/* the green route ahead */}
        {routePts.slice(1).map((p, i) => (
          <line key={i} x1={routePts[i][0]} y1={routePts[i][1]} x2={p[0]} y2={p[1]} stroke={GREEN} strokeWidth={Math.max(2.5, routeW(p[1]))} strokeLinecap="round" />
        ))}
        <Car uid={uid} x={car.x} y={car.y} len={car.len} view="rear" body="ev" paint="a" frame={t} speed={0.35} lean={car.lean} lights={{tail: 0.6}} />
        {/* the phone in its dash holder, through the rear glass: a lit screen and the earpiece slot */}
        <g>
          <rect x={ph.x - ph.w / 2 - ph.w * 0.25} y={ph.y - ph.h * 0.9} width={ph.w * 1.5} height={ph.h * 1.9} rx={ph.h * 0.5} fill="#FFFFFF" opacity={0.25 + 0.6 * glow} />
          <rect x={ph.x - ph.w / 2} y={ph.y - ph.h / 2} width={ph.w} height={ph.h} rx={ph.h * 0.18} fill="#F4F7F4" stroke="#111" strokeWidth={Math.max(0.6, ph.h * 0.08)} />
          <path d={`M${ph.x - ph.w * 0.3} ${ph.y + ph.h * 0.15} Q${ph.x} ${ph.y - ph.h * 0.3} ${ph.x + ph.w * 0.32} ${ph.y - ph.h * 0.05}`} fill="none" stroke={GREEN} strokeWidth={Math.max(0.4, ph.h * 0.09)} strokeLinecap="round" />
          <rect x={ph.x - ph.w * 0.12} y={ph.y - ph.h * 0.42} width={ph.w * 0.24} height={ph.h * 0.06} rx={ph.h * 0.03} fill="#111" />
        </g>
        {rings.map((k, i) => (
          <ellipse key={i} cx={car.x} cy={car.y - cb.h * 0.55} rx={cb.w * (0.4 + k * 0.9)} ry={cb.w * (0.25 + k * 0.55)} fill="none" stroke={INK} strokeWidth={2} opacity={(1 - k) * 0.7} />
        ))}
      </g>
      {/* the icons fly in screen space, into the phone's place on screen */}
      {(['map', 'search', 'voice'] as const).map((kind, i) => {
        const a = icons[i];
        if (t < a - 2) return null;
        const q = E.inOut(prog(t, a, 16));
        const lift = sp(t, a - 2, 200, 16);
        const target: Pt = [tx + ph.x * zoom, ty + ph.y * zoom];
        const [ox, oy] = iconFrom[i];
        const mx = lerp(ox, target[0], 0.5);
        const my = Math.min(oy, target[1]) - 220;
        const x = (1 - q) ** 2 * ox + 2 * (1 - q) * q * mx + q * q * target[0];
        const y = (1 - q) ** 2 * (oy - 40 * lift) + 2 * (1 - q) * q * my + q * q * target[1];
        const sc = lerp(1, 0.2, E.in(q)) * lift;
        return q >= 1 ? null : <Icon key={kind} kind={kind} x={x} y={y} s={sc} o={1} />;
      })}
    </svg>
  );
};
