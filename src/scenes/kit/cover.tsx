// src/scenes/kit/cover.tsx: the COVER KIT (the owner, 2026-11-04: "the covers must be made far more powerfully and refined,
// not chaos, not quick, not cheap: our studio's engine is a 2.0, raise it to a 5.0"). A cover drawing (cover.art,
// src/scenes/film/<FilmName>Cover.tsx) is ONE premium object in a studio light, like a product shot drawn in black and
// white: a soft spotlight behind it, real depth (extruded faces, a key light from the top left, a core shadow, a rim),
// materials that read (paper, matte plastic, gloss, brushed metal, glass), a soft contact shadow on the floor. Never a
// sketch of thin lines.
//
//   <CoverArt p>           the svg every cover draws in: 1080 wide, the art box p.artH tall (everything that matters
//                          inside it), the frame's foot p.h; the studio light and the floor come with it
//   <Spot cx cy r k>       the soft studio light behind the object (paper: a white glow; black: a grey one)
//   <Floor cx y rx k>      the soft contact shadow an object stands on (blurred, two layers)
//   <Block x y w h d r ...> an extruded rounded box seen from the front-left-top (an adapter, a card standing up, a key, a
//                          box, a pill button): slices for the depth, a lit front face, a highlight line on its top edge
//   <Slab ...>             a flat object lying back (a card, a sheet, a phone on a table): a rounded quad in perspective
//                          with thickness and a shadow
//   <Device x y w r tilt>  a premium phone body (titanium edge, black bezel, island); children draw its screen in a
//                          w x 2.17w box from (0, 0)
//   <Qr x y s seed>        a clean QR code (three finder eyes, deterministic modules)
//   <Corners x y w h len>  scan corners round a box (thick, rounded)
//   <DotPath d>            a dotted path with round dots evenly spaced (motion, a route, a leader)
//   <Gleam ...>            a glossy highlight streak across a face
//   mat(tone)              {hi, mid, lo, edge, rim}: the four values of a material from 0 (white) to 1 (black)
//   <Mirror y k>          the object's mirror image on a glossy studio floor at y, fading away (the premium floor)
//   <Halo cx cy r>         a large thin ring and a soft disc behind the object: a stage that frames it
//   <Grain id k>           defs: a fine paper or plastic grain filter; use it as filter={`url(#id)`} on a face
//   <Mark x y size>        a product marking printed on an object (Latin or digits: "ELM327", "OBD-II", "P0420"),
//                          small caps in the mono stack, the way a real object carries its own print
//
// Black and white only (the cover's rule): every colour here is a neutral grey from C (both looks). One idea, big: the
// object fills 55-85 % of the art box (bleeding off one edge is fine on purpose), the light from the top left, the
// shadow on the floor under it, nothing scattered around it. 5.0 (the owner, the same day: "raise it more"): the object
// 65-90 % of the art box, a glossy floor with its reflection, a halo stage, real surfaces (grain, bevels, its own print).
import React, {useId} from 'react';
import {C, isLight, rgba} from '../../tokens';

const clamp = (v: number, a = 0, b = 255) => Math.max(a, Math.min(b, v));
const g = (v: number) => {
  const n = Math.round(clamp(v));
  const h = n.toString(16).padStart(2, '0');
  return `#${h}${h}${h}`;
};

/** a material's values from tone 0 (white) .. 1 (black): hi the lit part, mid the face, lo the core shadow, edge the
 *  extrusion's side, rim the light line on the top edge */
export const mat = (tone: number) => {
  const v = 255 * (1 - tone);
  return {hi: g(v + 14 - tone * 4), mid: g(v - 10), lo: g(v - 46 + tone * 26), edge: g(v - 70 + tone * 40), rim: g(clamp(v + 70, 0, 255))};
};

export type CoverP = {w?: number; h?: number; artH?: number};

/** the svg a cover draws in, with the shared defs: the floor blur and the soft-light gradients */
export const CoverArt: React.FC<{p: CoverP; children: React.ReactNode}> = ({p, children}) => {
  const W = p.w ?? 1080;
  const H = p.h ?? 1200;
  return (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible'}}>
      {children}
    </svg>
  );
};

/** the studio light behind the object: a soft round glow (white on paper, a lifted grey on black) */
export const Spot: React.FC<{cx: number; cy: number; r: number; k?: number}> = ({cx, cy, r, k = 1}) => {
  const id = `spot${useId().replace(/:/g, '')}`;
  const light = isLight();
  return (
    <g>
      <defs>
        <radialGradient id={id} cx="50%" cy="50%" r="50%">
          <stop offset="0" stopColor={light ? '#FFFFFF' : '#3A3A3A'} stopOpacity={(light ? 0.95 : 0.55) * k} />
          <stop offset="0.55" stopColor={light ? '#FFFFFF' : '#2A2A2A'} stopOpacity={(light ? 0.45 : 0.22) * k} />
          <stop offset="1" stopColor={light ? '#FFFFFF' : '#000000'} stopOpacity={0} />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx={r} ry={r * 0.92} fill={`url(#${id})`} />
    </g>
  );
};

/** the soft contact shadow an object stands on: a tight dark core and a wide soft spread (blurred) */
export const Floor: React.FC<{cx: number; y: number; rx: number; k?: number}> = ({cx, y, rx, k = 1}) => {
  const id = `fl${useId().replace(/:/g, '')}`;
  const light = isLight();
  const a = (light ? 0.26 : 0.7) * k;
  return (
    <g>
      <defs>
        <filter id={id} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation={rx * 0.06} />
        </filter>
        <filter id={`${id}b`} x="-50%" y="-200%" width="200%" height="500%">
          <feGaussianBlur stdDeviation={rx * 0.018} />
        </filter>
      </defs>
      <ellipse cx={cx} cy={y + rx * 0.02} rx={rx} ry={rx * 0.1} fill={`rgba(0,0,0,${a * 0.55})`} filter={`url(#${id})`} />
      <ellipse cx={cx} cy={y} rx={rx * 0.82} ry={rx * 0.035} fill={`rgba(0,0,0,${a})`} filter={`url(#${id}b)`} />
    </g>
  );
};

/** a glossy highlight streak across a face (a soft diagonal band of light) */
export const Gleam: React.FC<{x: number; y: number; w: number; h: number; r?: number; k?: number}> = ({x, y, w, h, r = 0, k = 1}) => {
  const id = `gl${useId().replace(/:/g, '')}`;
  const cp = `${id}c`;
  return (
    <g>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={0.0} />
          <stop offset="0.28" stopColor="#FFFFFF" stopOpacity={0.0} />
          <stop offset="0.36" stopColor="#FFFFFF" stopOpacity={0.22 * k} />
          <stop offset="0.46" stopColor="#FFFFFF" stopOpacity={0.05 * k} />
          <stop offset="0.52" stopColor="#FFFFFF" stopOpacity={0.12 * k} />
          <stop offset="0.6" stopColor="#FFFFFF" stopOpacity={0} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <clipPath id={cp}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id})`} clipPath={`url(#${cp})`} />
    </g>
  );
};

/**
 * An extruded rounded box (the front face at x, y, w x h, radius r) with depth d going back toward the top right
 * (angle deg from the horizontal): the side drawn as slices, the front face lit from the top left, a rim of light on
 * its top-left edge, an optional gloss. children draw ON the front face (its own coordinates: 0..w, 0..h).
 */
export const Block: React.FC<{
  x: number; y: number; w: number; h: number; d?: number; r?: number; angle?: number; tone?: number; gloss?: number; stroke?: number;
  children?: React.ReactNode;
}> = ({x, y, w, h, d = 40, r = 24, angle = 38, tone = 0.05, gloss = 0, stroke = 0, children}) => {
  const uid = useId().replace(/:/g, '');
  const m = mat(tone);
  const ax = Math.cos((angle * Math.PI) / 180);
  const ay = -Math.sin((angle * Math.PI) / 180);
  const n = Math.max(6, Math.round(d / 2));
  const slices = [];
  for (let i = n; i >= 1; i--) {
    const t = i / n;
    const sx = x + ax * d * t;
    const sy = y + ay * d * t;
    const shade = clamp(parseInt(m.edge.slice(1, 3), 16) + (1 - t) * 22);
    slices.push(<rect key={i} x={sx} y={sy} width={w} height={h} rx={r} fill={g(shade)} />);
  }
  return (
    <g>
      <defs>
        <linearGradient id={`f${uid}`} x1="0" y1="0" x2="0.9" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="0.55" stopColor={m.mid} />
          <stop offset="1" stopColor={m.lo} />
        </linearGradient>
        <linearGradient id={`r${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.rim} stopOpacity={0.9} />
          <stop offset="0.4" stopColor={m.rim} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`c${uid}`}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      {slices}
      {/* the back slice's rim: the far edge catches the light */}
      <rect x={x + ax * d} y={y + ay * d} width={w} height={h} rx={r} fill="none" stroke={rgba('#FFFFFF', 0.18)} strokeWidth={2} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#f${uid})`} stroke={stroke ? (tone > 0.5 ? rgba('#FFFFFF', 0.14) : rgba('#000000', 0.12)) : 'none'} strokeWidth={stroke} />
      <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} rx={Math.max(0, r - 1.5)} fill="none" stroke={`url(#r${uid})`} strokeWidth={3} />
      {/* the bevel: the face's edge rounds over, lit along the top, in shade along the bottom */}
      <path d={`M${x + r} ${y + 3} L${x + w - r} ${y + 3}`} stroke={rgba('#FFFFFF', tone > 0.5 ? 0.22 : 0.85)} strokeWidth={3} strokeLinecap="round" />
      <path d={`M${x + r} ${y + h - 2.5} L${x + w - r} ${y + h - 2.5}`} stroke={rgba('#000000', tone > 0.5 ? 0.5 : 0.14)} strokeWidth={3} strokeLinecap="round" />
      {gloss ? <Gleam x={x} y={y} w={w} h={h} r={r} k={gloss} /> : null}
      {children ? (
        <g clipPath={`url(#c${uid})`}>
          <g transform={`translate(${x} ${y})`}>{children}</g>
        </g>
      ) : null}
    </g>
  );
};

/**
 * A flat object lying back on the floor (a card, a sheet of paper): its face w x h in its own units, laid back by
 * `tilt` (0 flat to the viewer .. 0.6 well back) and turned by `rot` degrees, with a thickness and a soft shadow.
 * children draw on the face (0..w, 0..h).
 */
export const Slab: React.FC<{cx: number; cy: number; w: number; h: number; r?: number; tilt?: number; rot?: number; thick?: number; tone?: number; children?: React.ReactNode}> = ({
  cx, cy, w, h, r = 18, tilt = 0.25, rot = -8, thick = 8, tone = 0, children,
}) => {
  const uid = useId().replace(/:/g, '');
  const m = mat(tone);
  const sy = 1 - tilt; // the face squashes as it lies back
  const t = `translate(${cx} ${cy}) rotate(${rot}) scale(1 ${sy}) translate(${-w / 2} ${-h / 2})`;
  return (
    <g>
      <defs>
        <linearGradient id={`s${uid}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={m.hi} />
          <stop offset="1" stopColor={m.mid} />
        </linearGradient>
        <filter id={`b${uid}`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation={Math.max(w, h) * 0.03} />
        </filter>
        <clipPath id={`k${uid}`}>
          <rect x={0} y={0} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      <g transform={`translate(${cx + 14} ${cy + 26}) rotate(${rot}) scale(1 ${sy}) translate(${-w / 2} ${-h / 2})`}>
        <rect x={0} y={0} width={w} height={h} rx={r} fill={`rgba(0,0,0,${isLight() ? 0.22 : 0.6})`} filter={`url(#b${uid})`} />
      </g>
      <g transform={t}>
        <rect x={0} y={thick / sy} width={w} height={h} rx={r} fill={m.edge} />
        <rect x={0} y={0} width={w} height={h} rx={r} fill={`url(#s${uid})`} />
        <g clipPath={`url(#k${uid})`}>{children}</g>
        <rect x={1} y={1} width={w - 2} height={h - 2} rx={r} fill="none" stroke={rgba('#FFFFFF', 0.5)} strokeWidth={2} />
      </g>
    </g>
  );
};

/** a premium phone: a titanium edge (brushed gradient), black bezel, the island; children draw the screen in its box
 *  (0..sw, 0..sh) */
export const Device: React.FC<{x: number; y: number; w: number; rot?: number; children?: React.ReactNode}> = ({x, y, w, rot = 0, children}) => {
  const uid = useId().replace(/:/g, '');
  const h = w * 2.06;
  const r = w * 0.19;
  const bez = w * 0.045;
  const sw = w - 2 * bez;
  const sh = h - 2 * bez;
  return (
    <g transform={`rotate(${rot} ${x + w / 2} ${y + h / 2})`}>
      <defs>
        <linearGradient id={`t${uid}`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#9A9A9A" />
          <stop offset="0.08" stopColor="#E8E8E8" />
          <stop offset="0.2" stopColor="#7E7E7E" />
          <stop offset="0.8" stopColor="#8A8A8A" />
          <stop offset="0.93" stopColor="#EDEDED" />
          <stop offset="1" stopColor="#8E8E8E" />
        </linearGradient>
        <clipPath id={`s${uid}`}>
          <rect x={x + bez} y={y + bez} width={sw} height={sh} rx={r - bez} />
        </clipPath>
      </defs>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={r + 4} fill={`url(#t${uid})`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#0A0A0A" />
      <g clipPath={`url(#s${uid})`}>
        <rect x={x + bez} y={y + bez} width={sw} height={sh} fill={C.surface} />
        <g transform={`translate(${x + bez} ${y + bez})`}>{children}</g>
      </g>
      <rect x={x + w / 2 - w * 0.15} y={y + bez + w * 0.035} width={w * 0.3} height={w * 0.085} rx={w * 0.0425} fill="#0A0A0A" />
      <Gleam x={x} y={y} w={w} h={h} r={r} k={0.6} />
    </g>
  );
};

/** a stable 0..1 from two integers (drawing code: no randomness) */
const cell = (x: number, y: number, s: number) => {
  const v = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
  return v - Math.floor(v);
};

/** a clean QR code, s wide, ink modules on its own white (quiet zone outside) */
export const Qr: React.FC<{x: number; y: number; s: number; seed?: number; ink?: string; paper?: string}> = ({x, y, s, seed = 1, ink, paper}) => {
  const n = 25;
  const md = s / n;
  const I = ink ?? '#0B0B0B';
  const P = paper ?? '#FFFFFF';
  const eye = (cx: number, cy: number) => (
    <g key={`e${cx}${cy}`}>
      <rect x={x + cx * md} y={y + cy * md} width={7 * md} height={7 * md} rx={md * 1.6} fill={I} />
      <rect x={x + (cx + 1) * md} y={y + (cy + 1) * md} width={5 * md} height={5 * md} rx={md} fill={P} />
      <rect x={x + (cx + 2) * md} y={y + (cy + 2) * md} width={3 * md} height={3 * md} rx={md * 0.7} fill={I} />
    </g>
  );
  const inEye = (i: number, j: number) => (i < 8 && j < 8) || (i > n - 9 && j < 8) || (i < 8 && j > n - 9);
  const mods: React.ReactNode[] = [];
  for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) if (!inEye(i, j) && cell(i, j, seed) > 0.5) mods.push(<rect key={`${i}.${j}`} x={x + i * md + md * 0.06} y={y + j * md + md * 0.06} width={md * 0.88} height={md * 0.88} rx={md * 0.28} fill={I} />);
  return (
    <g>
      {mods}
      {eye(0, 0)}
      {eye(n - 7, 0)}
      {eye(0, n - 7)}
    </g>
  );
};

/** scan corners round a box: four thick rounded L's */
export const Corners: React.FC<{x: number; y: number; w: number; h: number; len?: number; sw?: number; color?: string}> = ({x, y, w, h, len = 70, sw = 12, color}) => {
  const c = color ?? C.ink;
  const d = `M${x} ${y + len} L${x} ${y} L${x + len} ${y} M${x + w - len} ${y} L${x + w} ${y} L${x + w} ${y + len} M${x + w} ${y + h - len} L${x + w} ${y + h} L${x + w - len} ${y + h} M${x + len} ${y + h} L${x} ${y + h} L${x} ${y + h - len}`;
  return <path d={d} fill="none" stroke={c} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" />;
};

/** a dotted path: round dots, evenly spaced (a route, a leader, a motion arc) */
export const DotPath: React.FC<{d: string; gap?: number; size?: number; color?: string; opacity?: number}> = ({d, gap = 22, size = 9, color, opacity = 1}) => (
  <path d={d} fill="none" stroke={color ?? C.ink} strokeOpacity={opacity} strokeWidth={size} strokeLinecap="round" strokeDasharray={`0.1 ${gap}`} />
);

/** the object's mirror image on a glossy floor: children are drawn flipped about the floor line y, squashed a little
 *  and faded out downward (a studio's glossy floor) */
export const Mirror: React.FC<{y: number; k?: number; depth?: number; children: React.ReactNode}> = ({y, k = 1, depth = 260, children}) => {
  const uid = useId().replace(/:/g, '');
  const light = isLight();
  return (
    <g>
      <defs>
        <linearGradient id={`rg${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity={(light ? 0.32 : 0.22) * k} />
          <stop offset="1" stopColor="#FFFFFF" stopOpacity={0} />
        </linearGradient>
        <mask id={`rm${uid}`} maskUnits="userSpaceOnUse" x={-200} y={y} width={1480} height={depth}>
          <rect x={-200} y={y} width={1480} height={depth} fill={`url(#rg${uid})`} />
        </mask>
      </defs>
      <g mask={`url(#rm${uid})`}>
        <g transform={`translate(0 ${2 * y}) scale(1 -1)`}>{children}</g>
      </g>
    </g>
  );
};

/** a stage behind the object: a soft disc and one thin ring (the halo frames it without a single extra thing) */
export const Halo: React.FC<{cx: number; cy: number; r: number; k?: number}> = ({cx, cy, r, k = 1}) => {
  const light = isLight();
  return (
    <g>
      <circle cx={cx} cy={cy} r={r} fill={light ? rgba('#FFFFFF', 0.55 * k) : rgba('#FFFFFF', 0.035 * k)} />
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={light ? rgba('#000000', 0.08 * k) : rgba('#FFFFFF', 0.12 * k)} strokeWidth={2.5} />
      <circle cx={cx} cy={cy} r={r * 1.18} fill="none" stroke={light ? rgba('#000000', 0.045 * k) : rgba('#FFFFFF', 0.06 * k)} strokeWidth={2} strokeDasharray="2 14" strokeLinecap="round" />
    </g>
  );
};

/** defs for a fine grain (paper, matte plastic): put <Grain id="g1"/> once, then filter={`url(#g1)`} on a face */
export const Grain: React.FC<{id: string; k?: number; seed?: number}> = ({id, k = 1, seed = 3}) => (
  <defs>
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={seed} result="n" />
      <feColorMatrix in="n" type="matrix" values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${0.09 * k} 0`} result="g" />
      <feComposite in="g" in2="SourceGraphic" operator="in" result="gi" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="gi" />
      </feMerge>
    </filter>
  </defs>
);

/** a product marking printed on an object: short Latin or digits in spaced mono caps (its own print, not a caption) */
export const Mark: React.FC<{x: number; y: number; size?: number; color?: string; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode}> = ({x, y, size = 26, color, anchor = 'start', children}) => (
  <text x={x} y={y} fontFamily="VinariMono, FiraGO, monospace" fontSize={size} fontWeight={600} letterSpacing={size * 0.12} textAnchor={anchor} fill={color ?? C.ink}>
    {children}
  </text>
);
