// ⚠️ SUPERSEDED for new covers (the owner, 2026-11-13): a new cover is a LINE COVER drawn with src/scenes/kit/coverline.tsx
// (references PromoLineCalendarCover, PromoLineCodeCover, PromoLineNightCover, PromoLineCustomsCover). This flat-object kit
// stays only so the covers made with it (V140, V142, V144, the palm demos) still render.
// src/scenes/kit/cover.tsx: the COVER KIT. A cover drawing (cover.art, src/scenes/film/<FilmName>Cover.tsx) is ONE big,
// clean, FLAT graphic in black and white: even strokes and a few flat fills, the object's own print, nothing else.
//
// FLAT ONLY (the owner, 2026-11-10, on the palm-scanner covers: „ეს 3D-ში რატომ აკეთებ ვითომ? მოაშორე ... სტუდიოდანაც
// ამოიღე, არ უხდება, ტყუილად გრაფიკებს ავსებს და ამახინჯებს“, then „შადოუ და ანარეკლი მოაშორე ... ნაგავია, ამახინჯებს“): no
// fake 3D extrusion, no shadow, no floor reflection, no halo stage, no glow, no gloss streak, no grain. That reverses the
// 2026-11-04 "5.0 premium product shot" kit; the parts below keep their names and props so every cover still compiles, and
// the depth parts now draw nothing:
//
//   <CoverArt p>           the svg every cover draws in: 1080 wide, the art box p.artH tall, the frame's foot p.h
//   <Block x y w h r tone> a flat rounded box (an adapter, a card, a key, a terminal): one flat fill from mat(tone),
//                          a hairline edge on paper; children draw ON it (0..w, 0..h). d, angle, gloss: ignored
//   <Slab ...>             a flat card turned by `rot`; tilt, thick: ignored (no lying back, no shadow)
//   <Device x y w rot>     a flat phone: a grey frame, black bezel, the island; children draw its screen in w x 2.17w
//   <Qr x y s seed>        a clean QR code (three finder eyes, deterministic modules)
//   <Corners x y w h len>  scan corners round a box (thick, rounded)
//   <DotPath d>            a dotted path with round dots evenly spaced (motion, a route, a leader)
//   mat(tone)              {hi, mid, lo, edge, rim}: a material's greys from 0 (white) to 1 (black); a flat face uses mid
//   <Mark x y size>        a product marking printed on an object (Latin or digits: "ELM327", "OBD-II", "P0420")
//   <Spot> <Floor> <Gleam> <Mirror> <Halo>   draw nothing (kept so older covers compile); <Grain> is a pass-through
//
// Black and white only: every colour a neutral grey. One idea, big: the object fills 55-90 % of the art box.
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
export const Spot: React.FC<{cx: number; cy: number; r: number; k?: number}> = () => null;

/** the soft contact shadow an object stands on: a tight dark core and a wide soft spread (blurred) */
export const Floor: React.FC<{cx: number; y: number; rx: number; k?: number}> = () => null;

/** a glossy highlight streak across a face (a soft diagonal band of light) */
export const Gleam: React.FC<{x: number; y: number; w: number; h: number; r?: number; k?: number}> = () => null;

/**
 * An extruded rounded box (the front face at x, y, w x h, radius r) with depth d going back toward the top right
 * (angle deg from the horizontal): the side drawn as slices, the front face lit from the top left, a rim of light on
 * its top-left edge, an optional gloss. children draw ON the front face (its own coordinates: 0..w, 0..h).
 */
export const Block: React.FC<{
  x: number; y: number; w: number; h: number; d?: number; r?: number; angle?: number; tone?: number; gloss?: number; stroke?: number;
  children?: React.ReactNode;
}> = ({x, y, w, h, r = 24, tone = 0.05, stroke = 0, children}) => {
  const uid = useId().replace(/:/g, '');
  const fill = mat(tone).mid;
  // a light face on a light field needs its edge: a hairline keeps it from melting into the paper
  const edge = stroke || (tone < 0.2 && isLight()) ? (tone > 0.5 ? rgba('#FFFFFF', 0.14) : rgba('#000000', 0.12)) : 'none';
  return (
    <g>
      <defs>
        <clipPath id={`c${uid}`}>
          <rect x={x} y={y} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      <rect x={x} y={y} width={w} height={h} rx={r} fill={fill} stroke={edge} strokeWidth={stroke || 2} />
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
  cx, cy, w, h, r = 18, rot = -8, tone = 0, children,
}) => {
  const uid = useId().replace(/:/g, '');
  const t = `translate(${cx} ${cy}) rotate(${rot}) translate(${-w / 2} ${-h / 2})`;
  return (
    <g transform={t}>
      <defs>
        <clipPath id={`k${uid}`}>
          <rect x={0} y={0} width={w} height={h} rx={r} />
        </clipPath>
      </defs>
      <rect x={0} y={0} width={w} height={h} rx={r} fill={mat(tone).mid} stroke={tone < 0.2 && isLight() ? rgba('#000000', 0.12) : 'none'} strokeWidth={2} />
      <g clipPath={`url(#k${uid})`}>{children}</g>
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
        <clipPath id={`s${uid}`}>
          <rect x={x + bez} y={y + bez} width={sw} height={sh} rx={r - bez} />
        </clipPath>
      </defs>
      <rect x={x - 4} y={y - 4} width={w + 8} height={h + 8} rx={r + 4} fill="#8A8A8A" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill="#0A0A0A" />
      <g clipPath={`url(#s${uid})`}>
        <rect x={x + bez} y={y + bez} width={sw} height={sh} fill={C.surface} />
        <g transform={`translate(${x + bez} ${y + bez})`}>{children}</g>
      </g>
      <rect x={x + w / 2 - w * 0.15} y={y + bez + w * 0.035} width={w * 0.3} height={w * 0.085} rx={w * 0.0425} fill="#0A0A0A" />
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
export const Mirror: React.FC<{y: number; k?: number; depth?: number; children: React.ReactNode}> = () => null;

/** a stage behind the object: a soft disc and one thin ring (the halo frames it without a single extra thing) */
export const Halo: React.FC<{cx: number; cy: number; r: number; k?: number}> = () => null;

/** defs for a fine grain (paper, matte plastic): put <Grain id="g1"/> once, then filter={`url(#g1)`} on a face */
export const Grain: React.FC<{id: string; k?: number; seed?: number}> = ({id}) => (
  <defs>
    <filter id={id} x="0" y="0" width="100%" height="100%">
      <feMerge>
        <feMergeNode in="SourceGraphic" />
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
