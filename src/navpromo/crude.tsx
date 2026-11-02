// The crude MS-Paint kit of the opening (the storyboard's reading of „გეფაიკებად": the cheapness is the joke): flat paint-
// bucket fills, thick wobbly black outlines that boil through three tracings on twos, one stamped pine, a crude ADULT man
// (long face, moustache, heavy brows, flat cap, leather jacket), his crude but 2020s crossover, a cow, an owl, crows, a
// crude phone. Everything is SVG drawn in frame pixels; nothing here is refined on purpose.
import React from 'react';
import {clamp, hash, lerp, type Pt} from './lib';

export const C1 = {
  night: '#0B0B0B',
  pine: '#24502A',
  pine2: '#1C4022',
  trunk: '#4A2E1A',
  moon: '#FFD21F',
  mud: '#6B4A2B',
  mud2: '#4E331C',
  ground: '#141A12',
  cobalt: '#2D5BDB',
  glass: '#0F1A2E',
  skin: '#E2A97E',
  skin2: '#C98E64',
  jacket: '#6B4226',
  jacket2: '#55331C',
  jeans: '#2B3A5C',
  cap: '#5C5246',
  black: '#0A0A0A',
  white: '#FFFFFF',
  red: '#E8211C',
  pink: '#FF5C9A',
  yellow: '#FFD21F',
  orange: '#FF8A1F',
  cow: '#F2F2F2',
  snout: '#F2A7B5',
  owl: '#7A5634',
  phoneMap: '#61788A',
  phoneMap2: '#7E95A6',
};

/** which of the three tracings is up: the line boils on twos */
export const boilOf = (frame: number) => Math.floor(frame / 2) % 3;

/** jitter every vertex a little, differently on each tracing */
export const jit = (pts: Pt[], boil: number, amp = 2.4, seed = 1): Pt[] =>
  pts.map(([x, y], i) => [x + hash(i, seed, boil) * amp, y + hash(i, seed + 101, boil) * amp]);

export const d = (pts: Pt[], close = true) => `M${pts.map((p) => `${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' L')}${close ? ' Z' : ''}`;

export const ell = (cx: number, cy: number, rx: number, ry: number, n = 18, rot = 0, from = 0, to = Math.PI * 2): Pt[] => {
  const out: Pt[] = [];
  const full = Math.abs(to - from - Math.PI * 2) < 1e-6;
  const m = full ? n : n + 1;
  for (let i = 0; i < m; i++) {
    const a = from + ((to - from) * i) / n;
    const x = Math.cos(a) * rx;
    const y = Math.sin(a) * ry;
    out.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  return out;
};

/** a flat-filled crude shape with a wobbly outline */
export const Shape: React.FC<{pts: Pt[]; fill?: string; stroke?: string; sw?: number; boil: number; seed?: number; amp?: number; close?: boolean; opacity?: number}> = ({
  pts,
  fill = 'none',
  stroke = C1.black,
  sw = 5,
  boil,
  seed = 1,
  amp = 2.4,
  close = true,
  opacity,
}) => <path d={d(jit(pts, boil, amp, seed), close)} fill={fill} stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" opacity={opacity} />;

/** a crude line (open) */
export const Line: React.FC<{pts: Pt[]; stroke?: string; sw?: number; boil: number; seed?: number; amp?: number}> = ({pts, stroke = C1.black, sw = 5, boil, seed = 3, amp = 2}) => (
  <path d={d(jit(pts, boil, amp, seed), false)} fill="none" stroke={stroke} strokeWidth={sw} strokeLinejoin="round" strokeLinecap="round" />
);

const tr = (pts: Pt[], x: number, y: number, s = 1, rot = 0): Pt[] => {
  const c = Math.cos(rot);
  const si = Math.sin(rot);
  return pts.map(([px, py]) => [x + (px * c - py * si) * s, y + (px * si + py * c) * s]);
};
export const move = tr;

// ---- the stamped pine: one clip-art tree, the same every time -------------------------------------------------------------
const PINE: Pt[] = [
  [0, -300],
  [60, -200],
  [30, -205],
  [100, -100],
  [55, -105],
  [130, 0],
  [12, 0],
  [12, 50],
  [-12, 50],
  [-12, 0],
  [-130, 0],
  [-55, -105],
  [-100, -100],
  [-30, -205],
  [-60, -200],
];
export const Pine: React.FC<{x: number; y: number; s?: number; boil: number; seed?: number; fill?: string}> = ({x, y, s = 1, boil, seed = 5, fill = C1.pine}) => {
  const pts = tr(PINE, x, y, s);
  const trunk = tr(
    [
      [12, 0],
      [12, 50],
      [-12, 50],
      [-12, 0],
    ],
    x,
    y,
    s,
  );
  return (
    <g>
      <Shape pts={trunk} fill={C1.trunk} boil={boil} seed={seed + 3} sw={4} />
      <Shape pts={pts} fill={fill} boil={boil} seed={seed} sw={5} />
    </g>
  );
};

/** the same pine from above: a zig-zag star blob (for the top-down sea of trees) */
export const PineTop: React.FC<{x: number; y: number; r: number; boil: number}> = ({x, y, r, boil}) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    const rr = i % 2 ? r * 0.72 : r;
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return <Shape pts={pts} fill={C1.pine} boil={boil} seed={7} sw={3} amp={1.2} />;
};

// ---- the moon and the spray-can stars --------------------------------------------------------------------------------------
export const Moon: React.FC<{cx: number; cy: number; r: number; boil: number; wob?: number}> = ({cx, cy, r, boil, wob = 0}) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 26; i++) {
    const a = (i / 26) * Math.PI * 2;
    const rr = r * (1 + 0.06 * hash(i, 77, 0) + 0.03 * Math.sin(wob + i));
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  return <Shape pts={pts} fill={C1.moon} boil={boil} seed={9} sw={5} amp={2.6} />;
};
export const Stars: React.FC<{boil: number; n?: number; area?: [number, number, number, number]}> = ({boil, n = 26, area = [40, 120, 1040, 820]}) => {
  const out: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    const cx = lerp(area[0], area[2], (hash(i, 3) + 1) / 2);
    const cy = lerp(area[1], area[3], (hash(i, 4) + 1) / 2);
    // a spray-can puff: a few dots, re-sprayed on each tracing
    for (let k = 0; k < 7; k++) {
      const dx = hash(i, k, boil + 11) * 7;
      const dy = hash(i, k + 31, boil + 11) * 7;
      out.push(<circle key={`${i}-${k}`} cx={cx + dx} cy={cy + dy} r={1.6 + (k === 0 ? 1.6 : 0)} fill={C1.white} opacity={k === 0 ? 1 : 0.75} />);
    }
  }
  return <g>{out}</g>;
};

// ---- the crude crossover: a 2020s silhouette even when crude (raked glass, slim light bar, small mirror) --------------------
// side view, facing right, ground under the wheels at y = 0, length about 600 at s = 1
const CAR_BODY: Pt[] = [
  [-300, -40],
  [-298, -118],
  [-262, -150],
  [-150, -168],
  [-95, -238],
  [40, -244],
  [118, -178],
  [238, -150],
  [298, -112],
  [304, -48],
  [280, -26],
  [-282, -24],
];
const CAR_GLASS: Pt[] = [
  [-140, -164],
  [-92, -224],
  [32, -229],
  [100, -172],
];
export const CrudeCar: React.FC<{x: number; y: number; s?: number; rot?: number; boil: number; hazard?: boolean; paint?: string; flip?: boolean}> = ({x, y, s = 1, rot = 0, boil, hazard = false, paint = C1.cobalt, flip = false}) => {
  const k = flip ? -1 : 1;
  const T = (pts: Pt[]) => tr(pts.map(([a, b]) => [a * k, b] as Pt), x, y, s, rot);
  const wheel = (wx: number) => tr(ell(wx * k, -22, 52, 52, 14), x, y, s, rot);
  const hub = (wx: number) => tr(ell(wx * k, -22, 22, 22, 10), x, y, s, rot);
  return (
    <g>
      <Shape pts={T(CAR_BODY)} fill={paint} boil={boil} seed={21} sw={5} />
      <Shape pts={T(CAR_GLASS)} fill={C1.glass} boil={boil} seed={22} sw={4} />
      {/* the B pillar and the door line, a mirror, the slim light bar, a tail light */}
      <Line pts={T([[-24, -232], [-30, -60]])} boil={boil} seed={23} sw={4} />
      <Shape pts={T([[96, -176], [128, -186], [130, -168], [100, -162]])} fill={paint} boil={boil} seed={24} sw={3} />
      <Line pts={T([[238, -140], [296, -112]])} stroke={C1.white} sw={6} boil={boil} seed={25} />
      <Line pts={T([[-296, -110], [-288, -76]])} stroke={hazard ? C1.orange : '#8A1C1C'} sw={9} boil={boil} seed={26} />
      <Line pts={T([[290, -82], [300, -60]])} stroke={hazard ? C1.orange : '#5A5A5A'} sw={9} boil={boil} seed={27} />
      {[-188, 182].map((wx) => (
        <g key={wx}>
          <Shape pts={wheel(wx)} fill="#1A1A1A" boil={boil} seed={30 + wx} sw={4} />
          <Shape pts={hub(wx)} fill="#9A9A9A" boil={boil} seed={31 + wx} sw={3} />
        </g>
      ))}
      {hazard ? (
        <>
          <circle cx={T([[-292, -94]])[0][0]} cy={T([[-292, -94]])[0][1]} r={34 * s} fill={C1.orange} opacity={0.35} />
          <circle cx={T([[296, -70]])[0][0]} cy={T([[296, -70]])[0][1]} r={34 * s} fill={C1.orange} opacity={0.35} />
        </>
      ) : null}
    </g>
  );
};

/** the same car from above: a blue rectangle with a glass slot (the top-down shot, the roundabout joke) */
export const CrudeCarTop: React.FC<{x: number; y: number; s?: number; rot?: number; boil: number; cap?: boolean}> = ({x, y, s = 1, rot = 0, boil, cap = false}) => {
  const T = (pts: Pt[]) => tr(pts, x, y, s, rot);
  return (
    <g>
      <Shape pts={T([[-36, -78], [36, -78], [40, 70], [-40, 70]])} fill={C1.cobalt} boil={boil} seed={41} sw={4} />
      <Shape pts={T([[-28, -40], [28, -40], [30, 30], [-30, 30]])} fill={C1.glass} boil={boil} seed={42} sw={3} />
      {cap ? <Shape pts={T(ell(0, -4, 13, 13, 10))} fill={C1.cap} boil={boil} seed={43} sw={3} /> : null}
    </g>
  );
};

// ---- the man: a crude ADULT (6.5 heads, long face, moustache, heavy brows, flat cap, leather jacket, muddy jeans) ----------
// facing: 0 front, 1 three-quarter right, 2 profile right, 3 back, 4 profile left, 5 three-quarter left (the paper-doll spin)
export type Arms = 'phoneUp' | 'down' | 'armsUp' | 'wave' | 'danceA' | 'danceB' | 'none';
export const CrudeMan: React.FC<{
  x: number; // feet centre
  y: number; // ground
  h?: number; // height in px (feet to cap top)
  facing?: number;
  arms?: Arms;
  boil: number;
  mouth?: 0 | 1;
  eyes?: 'dot' | 'squint' | 'hearts';
  phoneGlow?: number;
  sticker?: boolean;
  legs?: boolean;
  seed?: number;
}> = ({x, y, h = 520, facing = 0, arms = 'down', boil, mouth = 0, eyes = 'dot', phoneGlow = 1, sticker = false, legs = true, seed = 0}) => {
  const u = h / 520; // design at 520 px tall
  const P = (px: number, py: number): Pt => [x + px * u, y + py * u];
  const T = (pts: Pt[]): Pt[] => pts.map(([a, b]) => P(a, b));
  const f = ((facing % 6) + 6) % 6;
  // how the body turns: width factor of the torso and where the face sits
  const turn = [0, 0.55, 1, 0, -1, -0.55][f];
  const back = f === 3;
  const tw = [1, 0.86, 0.62, 1, 0.62, 0.86][f];
  const headX = turn * 10;
  const headY = -440;
  const out: React.ReactNode[] = [];
  const S = (key: string, pts: Pt[], fill: string, sw = 5, s2 = 1) => <Shape key={key} pts={T(pts)} fill={fill} boil={boil} seed={seed + s2} sw={sw * Math.max(0.6, u)} />;
  // legs and boots
  if (legs) {
    out.push(S('legL', [[-46 * tw, -200], [-6 * tw, -200], [-10 * tw, -12], [-44 * tw, -12]], C1.jeans, 5, 2));
    out.push(S('legR', [[6 * tw, -200], [46 * tw, -200], [44 * tw, -12], [10 * tw, -12]], C1.jeans, 5, 3));
    out.push(S('bootL', [[-50 * tw - 6 * turn, -16], [-8 * tw, -16], [-6 * tw + 14 * turn, 0], [-56 * tw + 6 * turn, 0]], '#2A1D14', 4, 4));
    out.push(S('bootR', [[8 * tw, -16], [50 * tw - 6 * turn, -16], [56 * tw + 14 * turn, 0], [6 * tw, 0]], '#2A1D14', 4, 5));
    // mud on the trousers (brown blobs)
    out.push(<Shape key="mud1" pts={T(ell(-28 * tw, -40, 16, 10, 8))} fill={C1.mud} boil={boil} seed={seed + 6} sw={2} />);
    out.push(<Shape key="mud2" pts={T(ell(26 * tw, -64, 12, 9, 8))} fill={C1.mud} boil={boil} seed={seed + 7} sw={2} />);
    out.push(<Shape key="mud3" pts={T(ell(-20 * tw, -92, 9, 7, 7))} fill={C1.mud} boil={boil} seed={seed + 8} sw={2} />);
  }
  // arms behind the torso first when they hang
  const arm = (key: string, from: Pt, to: Pt, hand: boolean, phone: boolean) => {
    const [ax, ay] = from;
    const [bx, by] = to;
    const nx = -(by - ay);
    const ny = bx - ax;
    const l = Math.hypot(nx, ny) || 1;
    const w = 19;
    const k = w / l;
    const pts: Pt[] = [
      [ax + nx * k, ay + ny * k],
      [bx + nx * k * 0.8, by + ny * k * 0.8],
      [bx - nx * k * 0.8, by - ny * k * 0.8],
      [ax - nx * k, ay - ny * k],
    ];
    const parts = [S(`${key}a`, pts, C1.jacket, 5, 11)];
    if (hand) parts.push(<Shape key={`${key}h`} pts={T(ell(bx, by, 15, 15, 10))} fill={C1.skin} boil={boil} seed={seed + 12} sw={4 * u} />);
    if (phone) {
      const ph: Pt[] = [
        [bx - 18, by - 64],
        [bx + 18, by - 64],
        [bx + 18, by - 6],
        [bx - 18, by - 6],
      ];
      parts.push(
        <g key={`${key}p`}>
          <circle cx={P(bx, by - 36)[0]} cy={P(bx, by - 36)[1]} r={70 * u} fill="#CFE6FF" opacity={0.22 * phoneGlow} />
          <circle cx={P(bx, by - 36)[0]} cy={P(bx, by - 36)[1]} r={40 * u} fill="#E6F2FF" opacity={0.3 * phoneGlow} />
          <Shape pts={T(ph)} fill="#DDEBFF" boil={boil} seed={seed + 13} sw={5 * u} />
        </g>,
      );
    }
    return parts;
  };
  const sh: Pt = [0, -360];
  const shL: Pt = [-58 * tw, -350];
  const shR: Pt = [58 * tw, -350];
  const armsOf = (): React.ReactNode[] => {
    if (arms === 'none') return [];
    if (arms === 'phoneUp') return [...arm('l', shL, [-70 * tw, -205], true, false), ...arm('r', shR, [92 * tw + 10, -560], true, true)];
    if (arms === 'armsUp') return [...arm('l', shL, [-120, -600], true, true), ...arm('r', shR, [120, -600], true, false)];
    if (arms === 'wave') return [...arm('l', shL, [-70 * tw, -205], true, false), ...arm('r', shR, [120, -540], true, false)];
    if (arms === 'danceA') return [...arm('l', shL, [-130, -520], true, false), ...arm('r', shR, [100, -230], true, false)];
    if (arms === 'danceB') return [...arm('l', shL, [-100, -230], true, false), ...arm('r', shR, [130, -520], true, false)];
    return [...arm('l', shL, [-72 * tw, -200], true, false), ...arm('r', shR, [72 * tw, -200], true, false)];
  };
  // torso: the leather jacket
  const torso: Pt[] = [
    [-60 * tw, -372],
    [60 * tw, -372],
    [56 * tw, -196],
    [-56 * tw, -196],
  ];
  out.push(S('torso', torso, C1.jacket, 5, 14));
  if (!back) out.push(<Line key="zip" pts={T([[turn * 22, -366], [turn * 18, -200]])} boil={boil} seed={seed + 15} sw={3 * u} />);
  out.push(<Line key="belt" pts={T([[-56 * tw, -206], [56 * tw, -206]])} stroke="#22160E" boil={boil} seed={seed + 16} sw={6 * u} />);
  out.push(S('neck', [[-14, -392], [14, -392], [14, -366], [-14, -366]], C1.skin2, 4, 17));
  // head: a LONG face, square jaw
  const hx = headX;
  const face: Pt[] = [
    [hx - 30, headY - 40],
    [hx + 30, headY - 40],
    [hx + 33, headY + 10],
    [hx + 26, headY + 40],
    [hx + 12, headY + 52],
    [hx - 12, headY + 52],
    [hx - 26, headY + 40],
    [hx - 33, headY + 10],
  ];
  out.push(S('head', face, back ? '#3A2A1E' : C1.skin, 5, 18));
  if (!back) {
    if (f === 0 || Math.abs(turn) < 0.9) {
      // ears
      out.push(<Shape key="earL" pts={T(ell(hx - 35 + turn * 6, headY + 2, 7, 12, 8))} fill={C1.skin2} boil={boil} seed={seed + 19} sw={3 * u} />);
      out.push(<Shape key="earR" pts={T(ell(hx + 35 + turn * 6, headY + 2, 7, 12, 8))} fill={C1.skin2} boil={boil} seed={seed + 20} sw={3 * u} />);
    }
    const fx = hx + turn * 14;
    // heavy brows
    out.push(<Line key="browL" pts={T([[fx - 22, headY - 12], [fx - 5, headY - 9]])} sw={7 * u} boil={boil} seed={seed + 21} />);
    if (Math.abs(turn) < 0.9) out.push(<Line key="browR" pts={T([[fx + 5, headY - 9], [fx + 22, headY - 12]])} sw={7 * u} boil={boil} seed={seed + 22} />);
    // eyes
    const eye = (ex: number, key: string) => {
      if (eyes === 'hearts') {
        const hp: Pt[] = [
          [ex, headY + 6],
          [ex - 9, headY - 2],
          [ex - 8, headY - 8],
          [ex - 3, headY - 9],
          [ex, headY - 5],
          [ex + 3, headY - 9],
          [ex + 8, headY - 8],
          [ex + 9, headY - 2],
        ];
        return <Shape key={key} pts={T(hp)} fill={C1.pink} boil={boil} seed={seed + 23} sw={2.5 * u} amp={0.8} />;
      }
      if (eyes === 'squint') return <Line key={key} pts={T([[ex - 7, headY], [ex + 7, headY + 1]])} sw={4 * u} boil={boil} seed={seed + 24} />;
      return <circle key={key} cx={P(ex, headY)[0]} cy={P(ex, headY)[1]} r={4.2 * u} fill={C1.black} />;
    };
    out.push(eye(fx - 13, 'eyeL'));
    if (Math.abs(turn) < 0.9) out.push(eye(fx + 13, 'eyeR'));
    // a long nose
    out.push(<Line key="nose" pts={T([[fx + turn * 4, headY - 2], [fx + turn * 16 + 2, headY + 18], [fx - 4 + turn * 6, headY + 20]])} sw={3.5 * u} boil={boil} seed={seed + 25} />);
    // the moustache: thick, black
    out.push(
      <Shape
        key="tache"
        pts={T([
          [fx - 22 + turn * 6, headY + 30],
          [fx - 6, headY + 22],
          [fx + 6, headY + 22],
          [fx + 22 + turn * 6, headY + 30],
          [fx + 14, headY + 33],
          [fx - 14, headY + 33],
        ])}
        fill={C1.black}
        boil={boil}
        seed={seed + 26}
        sw={3 * u}
      />,
    );
    if (mouth === 1) out.push(<Shape key="mouth" pts={T(ell(fx + turn * 4, headY + 42, 9, 7, 10))} fill="#3A0A0A" boil={boil} seed={seed + 27} sw={3 * u} />);
  }
  // the flat cap: a crown and a brim to the front
  const capPts: Pt[] = [
    [hx - 36, headY - 30],
    [hx - 30, headY - 58],
    [hx + 24, headY - 62],
    [hx + 40, headY - 40],
    [hx + 36, headY - 30],
  ];
  out.push(S('cap', capPts, C1.cap, 5, 28));
  if (!back) out.push(S('brim', [[hx - 26 + turn * 26, headY - 34], [hx + 30 + turn * 26, headY - 36], [hx + 40 + turn * 30, headY - 24], [hx - 22 + turn * 26, headY - 24]], '#4A4238', 4, 29));
  const body = (
    <g>
      {arms === 'down' || arms === 'phoneUp' ? null : armsOf()}
      {out}
      {arms === 'down' || arms === 'phoneUp' ? armsOf() : null}
    </g>
  );
  return sticker ? <Sticker>{body}</Sticker> : body;
};

/** a white sticker outline behind any crude drawing: draw it twice, the first copy fat and white */
export const Sticker: React.FC<{children: React.ReactNode}> = ({children}) => (
  <g>
    <StickerUnder>{children}</StickerUnder>
    {children}
  </g>
);
// the under-copy: every path filled and stroked white (CSS forces it, whatever the child set)
const StickerUnder: React.FC<{children: React.ReactNode}> = ({children}) => (
  <g>
    <style>{'.np-under path, .np-under circle { fill: #FFFFFF !important; stroke: #FFFFFF !important; stroke-width: 20px !important; opacity: 1 !important; }'}</style>
    <g className="np-under">{children}</g>
  </g>
);

// ---- the crude face close-up (squinting up at the phone; shouting) ------------------------------------------------------
export const CrudeFace: React.FC<{cx: number; cy: number; s?: number; boil: number; mode: 'squint' | 'shout'; mouth?: 0 | 1; look?: number}> = ({cx, cy, s = 1, boil, mode, mouth = 0, look = 0}) => {
  const T = (pts: Pt[]) => tr(pts, cx, cy, s);
  const face: Pt[] = [
    [-150, -230],
    [150, -230],
    [168, -40],
    [150, 140],
    [96, 236],
    [-96, 236],
    [-150, 140],
    [-168, -40],
  ];
  const lx = look * 14;
  return (
    <g>
      <Shape pts={T([[-60, 230], [60, 230], [70, 420], [-70, 420]])} fill={C1.skin2} boil={boil} seed={51} sw={7} />
      <Shape pts={T([[-260, 330], [260, 330], [300, 520], [-300, 520]])} fill={C1.jacket} boil={boil} seed={52} sw={7} />
      <Shape pts={T(ell(-176, 0, 30, 58, 10))} fill={C1.skin2} boil={boil} seed={53} sw={6} />
      <Shape pts={T(ell(176, 0, 30, 58, 10))} fill={C1.skin2} boil={boil} seed={54} sw={6} />
      <Shape pts={T(face)} fill={C1.skin} boil={boil} seed={55} sw={8} />
      {/* stubble dots */}
      {Array.from({length: 26}, (_, i) => {
        const a = hash(i, 61);
        const b = hash(i, 62);
        const [px, py] = T([[a * 120, 150 + Math.abs(b) * 70]])[0];
        return <circle key={i} cx={px} cy={py} r={2.6 * s} fill="#5A4030" opacity={0.75} />;
      })}
      {/* heavy brows: angry in the shout, knitted in the squint */}
      <Line pts={T(mode === 'shout' ? [[-120, -66], [-30, -40]] : [[-118, -78], [-34, -66]])} sw={20 * s} boil={boil} seed={56} />
      <Line pts={T(mode === 'shout' ? [[30, -40], [120, -66]] : [[34, -66], [118, -78]])} sw={20 * s} boil={boil} seed={57} />
      {mode === 'squint' ? (
        <>
          <Line pts={T([[-104 + lx, -16], [-46 + lx, -20]])} sw={9 * s} boil={boil} seed={58} />
          <Line pts={T([[46 + lx, -20], [104 + lx, -16]])} sw={9 * s} boil={boil} seed={59} />
        </>
      ) : (
        <>
          <Shape pts={T(ell(-74, -6, 26, 22, 10))} fill={C1.white} boil={boil} seed={60} sw={6} />
          <Shape pts={T(ell(74, -6, 26, 22, 10))} fill={C1.white} boil={boil} seed={61} sw={6} />
          <circle cx={T([[-70, -2]])[0][0]} cy={T([[-70, -2]])[0][1]} r={8 * s} fill={C1.black} />
          <circle cx={T([[70, -2]])[0][0]} cy={T([[70, -2]])[0][1]} r={8 * s} fill={C1.black} />
        </>
      )}
      {/* the long nose */}
      <Shape pts={T([[-10, -30], [16, -30], [34, 74], [8, 92], [-22, 84]])} fill={C1.skin2} boil={boil} seed={62} sw={6} />
      {/* the moustache */}
      <Shape pts={T([[-120, 140], [-40, 100], [0, 112], [40, 100], [120, 140], [92, 152], [0, 136], [-92, 152]])} fill={C1.black} boil={boil} seed={63} sw={5} />
      {/* the mouth: shut and bitter, or open and shouting (two drawings) */}
      {mode === 'shout' ? (
        mouth === 1 ? (
          <Shape pts={T(ell(0, 186, 62, 40, 14))} fill="#3A0A0A" boil={boil} seed={64} sw={7} />
        ) : (
          <Shape pts={T(ell(0, 180, 44, 26, 14))} fill="#3A0A0A" boil={boil} seed={65} sw={7} />
        )
      ) : (
        <Line pts={T([[-38, 178], [0, 172], [36, 182]])} sw={8 * s} boil={boil} seed={66} />
      )}
      {/* the flat cap */}
      <Shape pts={T([[-178, -170], [-150, -300], [100, -318], [196, -230], [186, -170]])} fill={C1.cap} boil={boil} seed={67} sw={8} />
      <Shape pts={T([[-120, -186], [190, -196], [250, -150], [-110, -150]])} fill="#4A4238" boil={boil} seed={68} sw={7} />
    </g>
  );
};

// ---- the cow head, the owl, crows -------------------------------------------------------------------------------------------
export const CowHead: React.FC<{x: number; y: number; s?: number; boil: number; chew?: number; eyes?: 'dead' | 'party'}> = ({x, y, s = 1, boil, chew = 0}) => {
  const T = (pts: Pt[]) => tr(pts, x, y, s);
  const jaw = Math.sin(chew) * 8;
  return (
    <g>
      <Shape pts={T([[-110, -150], [-170, -175], [-150, -128]])} fill={C1.cow} boil={boil} seed={71} sw={5} />
      <Shape pts={T([[110, -150], [170, -175], [150, -128]])} fill={C1.cow} boil={boil} seed={72} sw={5} />
      <Shape pts={T([[-70, -190], [-80, -232], [-52, -196]])} fill="#D9C9A6" boil={boil} seed={73} sw={4} />
      <Shape pts={T([[70, -190], [80, -232], [52, -196]])} fill="#D9C9A6" boil={boil} seed={74} sw={4} />
      <Shape pts={T([[-104, -196], [104, -196], [120, -40], [80, 60], [-80, 60], [-120, -40]])} fill={C1.cow} boil={boil} seed={75} sw={6} />
      <Shape pts={T([[-104, -196], [-20, -196], [-50, -120], [-112, -100]])} fill={C1.black} boil={boil} seed={76} sw={4} />
      <Shape pts={T([[40, -110], [100, -130], [110, -60], [60, -50]])} fill={C1.black} boil={boil} seed={77} sw={4} />
      <circle cx={T([[-46, -86]])[0][0]} cy={T([[-46, -86]])[0][1]} r={9 * s} fill={C1.black} />
      <circle cx={T([[46, -86]])[0][0]} cy={T([[46, -86]])[0][1]} r={9 * s} fill={C1.black} />
      <Line pts={T([[-62, -98], [-30, -96]])} sw={4 * s} boil={boil} seed={78} />
      <Line pts={T([[30, -96], [62, -98]])} sw={4 * s} boil={boil} seed={79} />
      <Shape pts={T([[-96, 0], [96, 0], [104, 70 + jaw], [60, 110 + jaw], [-60, 110 + jaw], [-104, 70 + jaw]])} fill={C1.snout} boil={boil} seed={80} sw={6} />
      <Shape pts={T(ell(-40, 40 + jaw * 0.5, 14, 10, 8))} fill="#3A1A20" boil={boil} seed={81} sw={3} />
      <Shape pts={T(ell(40, 40 + jaw * 0.5, 14, 10, 8))} fill="#3A1A20" boil={boil} seed={82} sw={3} />
      <Line pts={T([[-34, 90 + jaw], [34, 92 + jaw]])} sw={4 * s} boil={boil} seed={83} />
    </g>
  );
};

export const Owl: React.FC<{x: number; y: number; s?: number; boil: number; head: number; blink?: boolean}> = ({x, y, s = 1, boil, head, blink = false}) => {
  const T = (pts: Pt[]) => tr(pts, x, y, s);
  // head turn 0..1: 0 facing us, 0.5 profile, 1 the back of the head (180 degrees)
  const showEyes = head < 0.55;
  const ex = lerp(0, 34, clamp(head * 2));
  return (
    <g>
      <Shape pts={T([[-70, 60], [70, 60], [60, 150], [-60, 150]])} fill={C1.owl} boil={boil} seed={91} sw={5} />
      <Line pts={T([[-80, 150], [80, 150]])} stroke="#3A2614" sw={10 * s} boil={boil} seed={92} />
      <Shape pts={T([[-74, -40], [-50, -76], [50, -76], [74, -40], [64, 64], [-64, 64]])} fill={C1.owl} boil={boil} seed={93} sw={5} />
      <Shape pts={T([[-58, -72], [-70, -104], [-36, -76]])} fill={C1.owl} boil={boil} seed={94} sw={4} />
      <Shape pts={T([[58, -72], [70, -104], [36, -76]])} fill={C1.owl} boil={boil} seed={95} sw={4} />
      {showEyes ? (
        <>
          <Shape pts={T(ell(-26 + ex, -20, 22, 22, 12))} fill={C1.yellow} boil={boil} seed={96} sw={4} />
          {head < 0.3 ? <Shape pts={T(ell(26 + ex, -20, 22, 22, 12))} fill={C1.yellow} boil={boil} seed={97} sw={4} /> : null}
          {blink ? (
            <>
              <Line pts={T([[-46 + ex, -20], [-6 + ex, -20]])} sw={6 * s} boil={boil} seed={98} />
              {head < 0.3 ? <Line pts={T([[6 + ex, -20], [46 + ex, -20]])} sw={6 * s} boil={boil} seed={99} /> : null}
            </>
          ) : (
            <>
              <circle cx={T([[-26 + ex, -20]])[0][0]} cy={T([[-26 + ex, -20]])[0][1]} r={8 * s} fill={C1.black} />
              {head < 0.3 ? <circle cx={T([[26 + ex, -20]])[0][0]} cy={T([[26 + ex, -20]])[0][1]} r={8 * s} fill={C1.black} /> : null}
            </>
          )}
          <Shape pts={T([[ex - 8, 4], [ex + 8, 4], [ex, 22]])} fill={C1.orange} boil={boil} seed={100} sw={3} />
        </>
      ) : (
        <Line pts={T([[-40, 0], [0, 10], [40, 0]])} stroke="#3A2614" sw={5 * s} boil={boil} seed={101} />
      )}
    </g>
  );
};

export const Crow: React.FC<{x: number; y: number; s?: number; boil: number; flap: number}> = ({x, y, s = 1, boil, flap}) => {
  const up = flap % 2 === 0;
  const T = (pts: Pt[]) => tr(pts, x, y, s);
  return <Shape pts={T(up ? [[-60, -30], [-14, 6], [0, 0], [14, 6], [60, -30], [10, 18], [0, 14], [-10, 18]] : [[-60, 26], [-14, 0], [0, -6], [14, 0], [60, 26], [10, 12], [0, 18], [-10, 12]])} fill={C1.black} stroke={C1.black} boil={boil} seed={111} sw={4} />;
};

/** a jagged MS-Paint explosion star, no text */
export const Boom: React.FC<{x: number; y: number; r: number; boil: number; fill?: string}> = ({x, y, r, boil, fill = C1.yellow}) => {
  const pts: Pt[] = [];
  for (let i = 0; i < 22; i++) {
    const a = (i / 22) * Math.PI * 2;
    const rr = i % 2 ? r * (0.48 + 0.08 * hash(i, 5)) : r * (0.95 + 0.12 * hash(i, 6));
    pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
  }
  return <Shape pts={pts} fill={fill} boil={boil} seed={121} sw={6} />;
};

// ---- the crude foreign phone: a bad blue-grey map, a fat white arrow, bars, a loader ------------------------------------
export const CrudePhone: React.FC<{
  x: number; // centre
  y: number;
  w: number;
  boil: number;
  arrow?: number; // 0 right, 1 up, 2 left
  bars?: number; // 0..4
  tiles?: number; // 1 map, 0 grey grid
  loader?: number; // -1 none, else the step
  shakeX?: number;
  hand?: boolean;
}> = ({x, y, w, boil, arrow = 0, bars = 4, tiles = 1, loader = -1, shakeX = 0, hand = true}) => {
  const h = w * 1.95;
  const X = x + shakeX;
  const L = X - w / 2;
  const Tp = y - h / 2;
  const sx = L + w * 0.08;
  const sy = Tp + h * 0.07;
  const sw = w * 0.84;
  const sh = h * 0.86;
  const body: Pt[] = [
    [L, Tp + 40],
    [L + 40, Tp],
    [L + w - 40, Tp],
    [L + w, Tp + 40],
    [L + w, Tp + h - 40],
    [L + w - 40, Tp + h],
    [L + 40, Tp + h],
    [L, Tp + h - 40],
  ];
  const roads: Pt[][] = [
    [
      [sx, sy + sh * 0.3],
      [sx + sw, sy + sh * 0.42],
    ],
    [
      [sx + sw * 0.35, sy],
      [sx + sw * 0.55, sy + sh],
    ],
    [
      [sx, sy + sh * 0.75],
      [sx + sw, sy + sh * 0.62],
    ],
    [
      [sx + sw * 0.8, sy],
      [sx + sw * 0.7, sy + sh],
    ],
  ];
  const ax = sx + sw / 2;
  const ay = sy + sh * 0.52;
  const A = w * 0.32;
  const rot = arrow === 0 ? 0 : arrow === 1 ? -Math.PI / 2 : Math.PI;
  const arrowPts: Pt[] = tr(
    [
      [-A, -A * 0.28],
      [A * 0.2, -A * 0.28],
      [A * 0.2, -A * 0.62],
      [A, 0],
      [A * 0.2, A * 0.62],
      [A * 0.2, A * 0.28],
      [-A, A * 0.28],
    ],
    ax,
    ay,
    1,
    rot,
  );
  return (
    <g>
      <Shape pts={body} fill="#1B1B1B" boil={boil} seed={131} sw={7} />
      <Shape pts={[[sx, sy], [sx + sw, sy], [sx + sw, sy + sh], [sx, sy + sh]]} fill={tiles > 0.5 ? C1.phoneMap : '#8C8C8C'} boil={boil} seed={132} sw={4} />
      {tiles > 0.5
        ? roads.map((r, i) => <Line key={i} pts={r} stroke={C1.phoneMap2} sw={w * 0.06} boil={boil} seed={140 + i} />)
        : Array.from({length: 7}, (_, i) => (
            <g key={i}>
              <Line pts={[[sx, sy + (sh * (i + 1)) / 8], [sx + sw, sy + (sh * (i + 1)) / 8]]} stroke="#A8A8A8" sw={3} boil={boil} seed={150 + i} />
              <Line pts={[[sx + (sw * (i + 1)) / 8, sy], [sx + (sw * (i + 1)) / 8, sy + sh]]} stroke="#A8A8A8" sw={3} boil={boil} seed={160 + i} />
            </g>
          ))}
      {loader < 0 ? <Shape pts={arrowPts} fill={C1.white} boil={boil} seed={133} sw={6} /> : null}
      {loader >= 0
        ? Array.from({length: 8}, (_, i) => {
            const a = ((i + loader * 3) / 8) * Math.PI * 2;
            return <circle key={i} cx={ax + Math.cos(a) * w * 0.16} cy={ay + Math.sin(a) * w * 0.16} r={w * 0.026} fill={C1.white} opacity={0.25 + (i / 8) * 0.75} />;
          })
        : null}
      {/* the signal bars, top left of the screen */}
      {Array.from({length: 4}, (_, i) => (
        <Shape
          key={`b${i}`}
          pts={[
            [sx + 14 + i * 16, sy + 46],
            [sx + 24 + i * 16, sy + 46],
            [sx + 24 + i * 16, sy + 46 - 8 - i * 8],
            [sx + 14 + i * 16, sy + 46 - 8 - i * 8],
          ]}
          fill={i < bars ? C1.white : '#454545'}
          boil={boil}
          seed={170 + i}
          sw={2}
          amp={0.6}
        />
      ))}
      {hand ? (
        <>
          <Shape pts={[[L - 30, Tp + h * 0.55], [L + 30, Tp + h * 0.52], [L + 40, Tp + h + 120], [L - 50, Tp + h + 160]]} fill={C1.skin} boil={boil} seed={180} sw={6} />
          <Shape pts={[[L + w - 30, Tp + h * 0.6], [L + w + 30, Tp + h * 0.58], [L + w + 50, Tp + h + 160], [L + w - 40, Tp + h + 130]]} fill={C1.skin} boil={boil} seed={181} sw={6} />
          <Shape pts={[[L - 60, Tp + h + 110], [L + w + 60, Tp + h + 110], [L + w + 90, 1990], [L - 90, 1990]]} fill={C1.jacket} boil={boil} seed={182} sw={7} />
        </>
      ) : null}
    </g>
  );
};
