// The navigator promo's refined kit (the owner, 2026-10-12: "the same film as the first one, only with refined graphics"):
// it replaces the crude MS-Paint kit (crude.tsx) shot for shot. The people are the studio's "Silhouette light" Figure, the
// cars the studio's Car; the night, the moon, the pines, the crows, the owl, the cow, the phone in the hand and the horn's
// burst are drawn here in the same language: flat planes of the illustration greys (C.il*), one soft light, no outline,
// the film's cobalt only on what matters. Everything is SVG in frame pixels (1080 x 1920), frame-driven, no randomness.
import React, {useId} from 'react';
import {C, F, rgba} from '../tokens';
import {mix} from '../scenes/illo/palette';
import {Figure, type Cast} from '../scenes/illo/figure';
import {filmSilPal} from '../scenes/illo/sil';
import {Car} from '../scenes/illo/car';
import {DefsSvg} from '../scenes/illo/solid';
import {pathOf, type V} from '../scenes/illo/silhead';
import {clamp, lerp} from './lib';

export const W = 1080;
export const H = 1920;

/** a stable 0..1 from two integers */
export const jit = (i: number, k: number) => {
  const s = Math.sin(i * 127.1 + k * 311.7) * 43758.5453;
  return s - Math.floor(s);
};

/** the lost man: the same person in every shot (a flat cap and a moustache, the crude man's echo, now refined) */
export const MAN: Cast = {is: 'man', seed: 7, outfit: 'leather', hat: 'flatCap', beard: 'tache', hair: 'crop', gender: 'm', age: 'adult'};

// ---- the night ------------------------------------------------------------------------------------------------------------
/** a pine from the side: five stacked tiers and a short trunk, its foot at (x, b) */
export const pine = (x: number, b: number, h: number, w: number) => {
  let d = '';
  for (let t = 0; t < 5; t++) {
    const ty = b - h + (h * t) / 5.6;
    const bot = ty + h * 0.34;
    const half = (w * (0.42 + (0.58 * t) / 4)) / 2;
    d += `M${x.toFixed(1)} ${ty.toFixed(1)}L${(x + half).toFixed(1)} ${bot.toFixed(1)}Q${x.toFixed(1)} ${(bot - h * 0.04).toFixed(1)} ${(x - half).toFixed(1)} ${bot.toFixed(1)}Z`;
  }
  return d + `M${(x - w * 0.035).toFixed(1)} ${(b - h * 0.08).toFixed(1)}H${(x + w * 0.035).toFixed(1)}V${b}H${(x - w * 0.035).toFixed(1)}Z`;
};
/** a row of pines along y = b, a gap left open between gap[0] and gap[1] */
export const pineRow = (seed: number, b: number, h: number, w: number, n: number, gap: [number, number] = [9999, 9999], dx = 0) => {
  let d = '';
  for (let i = 0; i < n; i++) {
    const x = -80 + dx + (1240 * (i + jit(i, seed) * 0.6)) / n;
    if (x > gap[0] && x < gap[1]) continue;
    d += pine(x, b + jit(i, seed + 1) * 24, h * (0.75 + jit(i, seed + 2) * 0.5), w * (0.8 + jit(i, seed + 3) * 0.4));
  }
  return d;
};

/** the night's gradients, ids prefixed with uid */
export const NightDefs: React.FC<{uid: string}> = ({uid}) => (
  <defs>
    <linearGradient id={`${uid}sky`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.ilNight} />
      <stop offset="0.62" stopColor={C.il7} />
      <stop offset="1" stopColor={C.il6} />
    </linearGradient>
    <linearGradient id={`${uid}fog`} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={C.il5} stopOpacity="0" />
      <stop offset="0.5" stopColor={C.il5} stopOpacity="0.34" />
      <stop offset="1" stopColor={C.il5} stopOpacity="0" />
    </linearGradient>
    <radialGradient id={`${uid}glow`}>
      <stop offset="0" stopColor={C.il0} stopOpacity="0.9" />
      <stop offset="0.35" stopColor={C.il1} stopOpacity="0.35" />
      <stop offset="1" stopColor={C.il1} stopOpacity="0" />
    </radialGradient>
    <radialGradient id={`${uid}screen`}>
      <stop offset="0" stopColor={C.il0} stopOpacity="0.55" />
      <stop offset="0.4" stopColor={C.il1} stopOpacity="0.18" />
      <stop offset="1" stopColor={C.il1} stopOpacity="0" />
    </radialGradient>
    <linearGradient id={`${uid}beam`} x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stopColor={C.il0} stopOpacity="0.55" />
      <stop offset="1" stopColor={C.il0} stopOpacity="0" />
    </linearGradient>
  </defs>
);

/** the stars: small, twinkling slowly */
export const Stars: React.FC<{frame: number; n?: number; area?: [number, number, number, number]}> = ({frame, n = 46, area = [0, 0, 1080, 900]}) => (
  <g>
    {Array.from({length: n}, (_, i) => {
      const x = area[0] + jit(i, 21) * (area[2] - area[0]);
      const y = area[1] + jit(i, 22) * (area[3] - area[1]);
      const r = 1.2 + jit(i, 23) * 2.2;
      const tw = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(frame * (0.05 + jit(i, 24) * 0.08) + i));
      return <circle key={i} cx={x} cy={y} r={r} fill={C.il1} opacity={tw * 0.8} />;
    })}
  </g>
);

/** the moon: a soft halo, a pale disc, two faint maria */
export const Moon: React.FC<{uid: string; x: number; y: number; r: number}> = ({uid, x, y, r}) => (
  <g>
    <circle cx={x} cy={y} r={r * 4.6} fill={`url(#${uid}glow)`} opacity={0.42} />
    <circle cx={x} cy={y} r={r} fill={C.il1} />
    <circle cx={x - r * 0.3} cy={y - r * 0.2} r={r * 0.26} fill={C.il2} opacity={0.5} />
    <circle cx={x + r * 0.28} cy={y + r * 0.3} r={r * 0.18} fill={C.il2} opacity={0.45} />
  </g>
);

/** the night behind a scene: the sky, the stars, the moon, a far and a near row of pines, the fog, the ground at `ground` */
export const Night: React.FC<{uid: string; frame: number; moon?: [number, number, number]; ground?: number; slide?: number; gap?: [number, number]; far?: boolean}> = ({
  uid,
  frame,
  moon = [790, 430, 46],
  ground = 1130,
  slide = 0,
  gap = [9999, 9999],
  far = true,
}) => (
  <g>
    <rect x={-300} y={-300} width={1680} height={ground + 340} fill={`url(#${uid}sky)`} />
    <Stars frame={frame} area={[-100, -100, 1180, ground - 300]} />
    <Moon uid={uid} x={moon[0]} y={moon[1]} r={moon[2]} />
    {far ? <path d={pineRow(3, ground - 80, 260, 120, 24, [9999, 9999], slide * 0.4)} fill={C.il6} opacity={0.85} /> : null}
    <rect x={-300 + ((frame * 0.5) % 260)} y={ground - 280} width={1700} height={260} fill={`url(#${uid}fog)`} />
    <path d={pineRow(11, ground + 10, 440, 190, 14, gap, slide)} fill={C.il7} />
    <rect x={-300} y={ground} width={1680} height={2400 - ground} fill={C.ilNight} />
  </g>
);

// ---- the people and the animals ---------------------------------------------------------------------------------------------
/** the lost man, the studio's Figure (it needs its defs once per svg: <DefsSvg uid/>) */
export const Man: React.FC<{uid: string; frame: number; x: number; y: number; size: number; crop?: 'full' | 'bust' | 'head'; pose?: string; face?: string; turn?: number; flip?: boolean; phone?: boolean; time?: 'day' | 'night'; idle?: boolean}> = (p) => (
  <Figure
    uid={p.uid}
    cast={MAN}
    x={p.x}
    y={p.y}
    size={p.size}
    crop={p.crop}
    frame={p.frame}
    time={p.time ?? 'night'}
    pose={(p.pose ?? 'stand') as never}
    face={(p.face ?? 'neutral') as never}
    turn={p.turn ?? 0}
    flip={p.flip}
    hold={p.phone ? 'phone' : null}
    idle={p.idle}
  />
);
export {DefsSvg};

/** a crow from the side, wings flapping (flap: any number, its sine beats the wings) */
export const Crow: React.FC<{x: number; y: number; s?: number; flap: number; dir?: number}> = ({x, y, s = 1, flap, dir = 1}) => {
  const w = Math.sin(flap) * 34;
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) scale(${(s * dir).toFixed(3)} ${s.toFixed(3)})`}>
      <path d={`M-6 0C-20 ${-18 - w * 0.4} -52 ${-26 - w} -78 ${-8 - w * 1.2}C-50 ${-6 - w * 0.4} -30 6 -6 8Z`} fill={C.ilNight} />
      <path d="M-26 2C-10 -10 22 -12 40 -4L54 -6L44 4C30 14 0 16 -26 2Z" fill={C.ilNight} />
      <path d={`M6 -2C18 ${-18 - w * 0.5} 44 ${-30 - w} 70 ${-16 - w * 1.1}C46 ${-8 - w * 0.4} 26 4 6 6Z`} fill={C.ilNight} />
      <path d="M-26 2L-48 10L-40 0Z" fill={C.ilNight} />
    </g>
  );
};

/** the owl on its pine branch, by night: a dark body with the moon's rim on its left, a pale facial disc, dark eyes that
 *  hold one catch-light each; the head turns (head 0..1 = left .. right) and blinks */
export const Owl: React.FC<{x: number; y: number; s?: number; head: number; blink?: boolean}> = ({x, y, s = 1, head, blink = false}) => {
  const id = useId().replace(/[^A-Za-z0-9]/g, '');
  const hx = (head - 0.5) * 18;
  const ey = blink ? 0.12 : 1;
  const body = 'M0 -58C34 -58 58 -26 60 12C62 46 40 74 0 76C-40 74 -62 46 -60 12C-58 -26 -34 -58 0 -58Z';
  const headD = 'M0 -142C30 -142 52 -122 54 -94C56 -66 34 -46 0 -46C-34 -46 -56 -66 -54 -94C-52 -122 -30 -142 0 -142Z';
  const tufts = 'M-46 -118L-50 -156L-26 -134Z M46 -118L50 -156L26 -134Z';
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id={`ow${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.il5} />
          <stop offset="0.5" stopColor={C.il6} />
          <stop offset="1" stopColor={C.il7} />
        </linearGradient>
        <radialGradient id={`od${id}`} cx="0.5" cy="0.45" r="0.6">
          <stop offset="0" stopColor={C.il4} />
          <stop offset="1" stopColor={C.il5} />
        </radialGradient>
      </defs>
      {/* the pine branch: a bough with the moon along its top, a few needle tufts */}
      <path d="M-190 78C-90 62 40 70 200 54L200 70C40 86 -90 80 -190 94Z" fill={C.il7} />
      <path d="M-190 78C-90 62 40 70 200 54" stroke={C.il5} strokeWidth={3} fill="none" opacity={0.8} />
      {[-160, -110, 120, 172].map((bx, i) => (
        <path key={i} d={`M${bx} ${76 - i}l-26 22M${bx} ${76 - i}l-6 28M${bx} ${76 - i}l16 24M${bx} ${76 - i}l30 14`} stroke={C.il7} strokeWidth={4} strokeLinecap="round" />
      ))}
      {/* the body: the moon's rim, the down, the folded wing, the chest's chevrons, the talons */}
      <path d={body} fill={C.il4} transform="translate(-3 -3)" />
      <path d={body} fill={`url(#ow${id})`} />
      <path d="M18 -36C44 -24 56 8 50 40C44 62 26 72 8 74C26 50 30 6 18 -36Z" fill={C.il7} />
      {[0, 1, 2].map((i) => (
        <path key={i} d={`M${30 + i * 4} ${46 + i * 10}q6 6 14 2`} stroke={C.il6} strokeWidth={2.4} fill="none" />
      ))}
      {[0, 1, 2, 3].map((i) =>
        [-1, 1].map((sx) => <path key={`${i}${sx}`} d={`M${sx * 20 - 7} ${-6 + i * 15}l7 6l7 -6`} stroke={C.il4} strokeWidth={2.2} fill="none" opacity={0.6} />),
      )}
      <path d="M-22 72l-6 12M-14 72l0 13M14 72l0 13M22 72l6 12" stroke={C.il3} strokeWidth={4.5} strokeLinecap="round" />
      <g transform={`translate(${hx.toFixed(1)} 0)`}>
        <path d={tufts} fill={C.il4} transform="translate(-3 -3)" />
        <path d={headD} fill={C.il4} transform="translate(-3 -3)" />
        <path d={tufts} fill={C.il6} />
        <path d={headD} fill={`url(#ow${id})`} />
        {/* the facial disc: two pale lobes, a darker ruff round them */}
        <path d="M0 -76C-10 -62 -44 -60 -48 -90C-50 -114 -20 -122 0 -106C20 -122 50 -114 48 -90C44 -60 10 -62 0 -76Z" fill={C.il6} />
        <path d="M0 -80C-10 -68 -40 -66 -43 -91C-44 -110 -18 -117 0 -103C18 -117 44 -110 43 -91C40 -66 10 -68 0 -80Z" fill={`url(#od${id})`} />
        {/* the eyes: a dark lens, a thin ring of iris, the moon caught in each */}
        <g transform={`translate(0 -92) scale(1 ${ey}) translate(0 92)`}>
          {[-21, 21].map((cx) => (
            <g key={cx}>
              <circle cx={cx} cy={-92} r={14} fill={C.il7} />
              <circle cx={cx} cy={-92} r={12} fill="none" stroke={C.il3} strokeWidth={1.6} opacity={0.7} />
              <circle cx={cx + hx * 0.2} cy={-92} r={6.5} fill={C.ilNight} />
              <circle cx={cx - 4.5 + hx * 0.15} cy={-96.5} r={3.4} fill={C.il0} />
            </g>
          ))}
        </g>
        {blink ? <path d="M-35 -92h28M7 -92h28" stroke={C.il6} strokeWidth={3} strokeLinecap="round" /> : null}
        <path d="M-6 -80L0 -64L6 -80Z" fill={C.il3} />
      </g>
    </g>
  );
};

/** the cow's head, front on, by night: the white of her coat in the moon's mid greys, the black patches in ink, the moon's
 *  rim down her left, a shade down her right; dark eyes under heavy lids, each with one catch-light (a deadpan stare);
 *  the muzzle chews (chew: any number, its sine moves the jaw) */
export const Cow: React.FC<{x: number; y: number; s?: number; chew?: number}> = ({x, y, s = 1, chew = 0}) => {
  const id = useId().replace(/[^A-Za-z0-9]/g, '');
  const j = Math.sin(chew) * 7;
  const head = pathOf([
    [-112, -156], [-128, -118], [-132, -56], [-120, 14], [-106, 74], [-100, 124], [-106, 170], [-94, 212], [-58, 234], [0, 240],
    [58, 234], [94, 212], [106, 170], [100, 124], [106, 74], [120, 14], [132, -56], [128, -118], [112, -156], [58, -174], [0, -178], [-58, -174],
  ]);
  const ear = pathOf([[-118, -108], [-168, -128], [-222, -122], [-252, -98], [-236, -74], [-184, -64], [-126, -74]]);
  const earIn = pathOf([[-132, -100], [-172, -114], [-214, -108], [-232, -96], [-216, -84], [-176, -80], [-136, -86]]);
  const horn = pathOf([[-80, -164], [-100, -198], [-126, -224], [-146, -228, 0.3], [-132, -208], [-114, -176], [-98, -152]]);
  const mirrorX = (d: string) => <path d={d} transform="scale(-1 1)" />;
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <defs>
        <linearGradient id={`cw${id}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0" stopColor={C.il2} />
          <stop offset="0.45" stopColor={C.il3} />
          <stop offset="1" stopColor={C.il4} />
        </linearGradient>
        <linearGradient id={`cm${id}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={C.il3} />
          <stop offset="1" stopColor={C.il4} />
        </linearGradient>
        <clipPath id={`cc${id}`}>
          <path d={head} />
        </clipPath>
      </defs>
      {/* the horns and the ears behind the head (the far side in the shade) */}
      <g fill={C.il2}>
        <path d={horn} />
      </g>
      <g fill={C.il4}>{mirrorX(horn)}</g>
      <path d={ear} fill={C.il3} />
      <path d={earIn} fill={C.il5} />
      <g fill={C.il5}>{mirrorX(ear)}</g>
      <g fill={C.il6}>{mirrorX(earIn)}</g>
      {/* the head: the moon's rim on the left, the coat, its patches, the shade on the right */}
      <path d={head} fill={C.il1} transform="translate(-4 -3)" />
      <path d={head} fill={`url(#cw${id})`} />
      <g clipPath={`url(#cc${id})`}>
        <path d={pathOf([[-140, -96], [-104, -136], [-52, -132], [-30, -88], [-40, -22], [-80, 14], [-122, 10], [-146, -36]])} fill={C.il7} />
        <path d={pathOf([[86, -70], [124, -84], [146, -30], [124, 16], [92, -6]])} fill={C.il7} />
        <path d={pathOf([[-56, -180], [-20, -196], [16, -190], [52, -196], [64, -168], [32, -138], [0, -150], [-32, -136]])} fill={C.il7} />
        <path d="M70 -170C120 -120 128 0 104 120C100 160 106 200 94 240L160 240L160 -180Z" fill={C.il6} opacity={0.4} />
        <path d="M-96 -120C-70 -150 -30 -160 0 -156" stroke={C.il1} strokeWidth={5} fill="none" opacity={0.5} strokeLinecap="round" />
      </g>
      {/* the eyes: dark almonds under heavy, unimpressed lids, one catch-light each */}
      {[-1, 1].map((sx) => (
        <g key={sx} transform={`translate(${sx * 96} -28) scale(${sx} 1)`}>
          <path d="M-22 2C-14 -10 10 -12 22 0C12 12 -12 14 -22 2Z" fill={C.ilNight} />
          <path d="M-24 1C-14 -16 12 -18 24 -1C10 -6 -10 -6 -24 1Z" fill={sx < 0 ? C.il6 : C.il4} />
          <path d="M-24 1C-10 -6 10 -6 24 -1" stroke={C.ilNight} strokeWidth={2.4} fill="none" strokeLinecap="round" />
          <circle cx={-5} cy={3} r={3} fill={C.il0} opacity={0.9} />
        </g>
      ))}
      {/* the muzzle: broad and pale, two nostrils; the lower lip chews */}
      <path d={pathOf([[-96, 118], [-60, 102], [0, 98], [60, 102], [96, 118], [106, 168], [94, 208], [50, 226], [0, 230], [-50, 226], [-94, 208], [-106, 168]])} fill={`url(#cm${id})`} />
      <path d="M-96 118C-60 102 60 102 96 118" stroke={C.il1} strokeWidth={3} fill="none" opacity={0.55} />
      <path d={pathOf([[-58, 158], [-40, 150], [-30, 164], [-38, 184], [-52, 186]])} fill={C.il6} />
      <path d={pathOf([[58, 158], [40, 150], [30, 164], [38, 184], [52, 186]])} fill={C.il6} />
      <path d="M-30 204Q0 212 30 204" stroke={C.il5} strokeWidth={3} fill="none" strokeLinecap="round" />
      <path d={pathOf([[-62 + j, 220], [0 + j, 228], [62 + j, 220], [52 + j, 244], [0 + j, 252], [-52 + j, 244]])} fill={C.il4} />
    </g>
  );
};

/** the horn's burst over the curse: a star of the film's colour, the curse itself in symbols */
export const Burst: React.FC<{x: number; y: number; r: number; k: number; rot?: number}> = ({x, y, r, k, rot = -8}) => {
  let d = '';
  for (let i = 0; i < 28; i++) {
    const a = (i / 28) * Math.PI * 2;
    const rr = i % 2 === 0 ? r : r * 0.66;
    d += `${i ? 'L' : 'M'}${(Math.cos(a) * rr).toFixed(1)} ${(Math.sin(a) * rr).toFixed(1)}`;
  }
  return (
    <g transform={`translate(${x} ${y}) rotate(${rot}) scale(${k.toFixed(3)})`}>
      <path d={d + 'Z'} fill={C.accA} />
      <path d={d + 'Z'} fill="none" stroke={C.il0} strokeWidth={5} opacity={0.9} />
      <text x={0} y={r * 0.14} textAnchor="middle" fontFamily={F.sans} fontWeight={800} fontSize={r * 0.38} fill={C.il0}>
        #@%&!
      </text>
    </g>
  );
};

// ---- the phone in his hand ------------------------------------------------------------------------------------------------
const ARROW_R = 'M30 104V58C30 38 42 26 62 26H80V8L112 38L80 68V50H62C56 50 54 54 54 60V104Z';
const ARROW_UP = 'M48 108V44H24L60 6L96 44H72V108Z';

// the hand that holds the phone (his right hand, the phone's local space: the phone 504 x 1004 about its centre): the heel
// of the hand and the wrist under the phone, the jacket's cuff, four fingers curled round the right edge (their tips over
// the bezel, never the screen), the thumb lying along the left edge. The skin is the man's: the film's one light (the
// Silhouette-light ramp of his face, sil.tsx filmSilPal) in its darker steps, the screen's spill on the tips, a rim of the
// light on the outer edges, the fingers parted by a deeper step, no outline.
const HEEL: V[] = [[-268, 330], [-302, 430], [-294, 540], [-250, 628], [-192, 700], [-172, 860, 0], [162, 860, 0], [176, 700], [226, 628], [262, 540], [272, 430], [258, 330]];
const CUFF: V[] = [[-214, 700], [-60, 682], [100, 684], [214, 704], [232, 1240, 0], [-238, 1240, 0]];
const THUMB: V[] = [[-250, 500], [-292, 470], [-318, 392], [-324, 292], [-316, 194], [-300, 120], [-282, 82, 0.8], [-261, 78], [-247, 102], [-243, 172], [-246, 282], [-252, 400]];
const FINGERS: [number, number, number][] = [
  // centre y, half height, reach (how far the finger shows past the edge)
  [14, 44, 84],
  [106, 46, 90],
  [196, 42, 84],
  [276, 35, 68],
];
const finger = (c: number, h: number, reach: number): V[] => [
  [237, c - h * 0.5, 0.75], [250, c - h * 0.88], [276, c - h * 0.97], [252 + reach * 0.8, c - h], [252 + reach, c - h * 0.62], [255 + reach, c + h * 0.15],
  [252 + reach * 0.88, c + h * 0.92], [276, c + h], [250, c + h * 0.84], [236, c + h * 0.4, 0.75], [232, c - h * 0.05, 0.9],
];
export const Grip: React.FC<{part: 'back' | 'front'; uid: string}> = ({part, uid}) => {
  const g = `${uid}grip`;
  const pal = filmSilPal('night', 0.92);
  const [deep, , half] = pal.lit;
  if (part === 'back')
    return (
      <g>
        <defs>
          <linearGradient id={`${g}h`} gradientUnits="userSpaceOnUse" x1={60} y1={320} x2={-40} y2={860}>
            <stop offset="0" stopColor={mix(deep, half, 0.4)} />
            <stop offset="0.5" stopColor={mix(deep, half, 0.12)} />
            <stop offset="1" stopColor={mix(deep, '#000000', 0.3)} />
          </linearGradient>
          <linearGradient id={`${g}f`} gradientUnits="userSpaceOnUse" x1={232} y1={0} x2={344} y2={40}>
            <stop offset="0" stopColor={mix(deep, half, 0.62)} />
            <stop offset="0.45" stopColor={mix(deep, half, 0.3)} />
            <stop offset="1" stopColor={mix(deep, '#000000', 0.15)} />
          </linearGradient>
          <linearGradient id={`${g}t`} gradientUnits="userSpaceOnUse" x1={-300} y1={80} x2={-270} y2={500}>
            <stop offset="0" stopColor={mix(deep, half, 0.62)} />
            <stop offset="0.5" stopColor={mix(deep, half, 0.32)} />
            <stop offset="1" stopColor={mix(deep, half, 0.14)} />
          </linearGradient>
        </defs>
        {/* the heel of the hand and the wrist, their rim; the cuff of the leather sleeve over them */}
        <path d={pathOf(HEEL)} fill={pal.rim} opacity={0.5} transform="translate(-4 -4)" />
        <path d={pathOf(HEEL)} fill={`url(#${g}h)`} />
        <path d="M-236 470C-200 560 -150 630 -70 676" stroke={deep} strokeWidth={14} fill="none" opacity={0.25} strokeLinecap="round" />
        <path d={pathOf(CUFF)} fill={C.il4} opacity={0.6} transform="translate(-4 -5)" />
        <path d={pathOf(CUFF)} fill={C.il7} />
        <path d="M-212 734C-60 716 100 718 216 738" stroke={C.il5} strokeWidth={4} fill="none" opacity={0.8} />
        <path d="M-40 760V1240" stroke={C.il6} strokeWidth={4} opacity={0.8} />
      </g>
    );
  return (
    <g>
      {/* the fingers round the right edge, the lowest first; each its rim, the light on its tip, a deeper step under it */}
      {[...FINGERS].reverse().map(([c, h, reach], i) => (
        <g key={i}>
          <path d={pathOf(finger(c, h, reach))} fill={pal.rim} opacity={0.45} transform="translate(2 -3)" />
          <path d={pathOf(finger(c, h, reach))} fill={`url(#${g}f)`} />
          <path d={`M${240} ${(c + h * 0.5).toFixed(1)}C${270} ${(c + h * 0.95).toFixed(1)} ${252 + reach * 0.6} ${(c + h * 0.98).toFixed(1)} ${252 + reach * 0.95} ${(c + h * 0.7).toFixed(1)}`} stroke={deep} strokeWidth={5} fill="none" opacity={0.55} strokeLinecap="round" />
          <path d={`M${262 + reach * 0.42} ${(c - h * 0.7).toFixed(1)}Q${258 + reach * 0.38} ${c} ${262 + reach * 0.42} ${(c + h * 0.7).toFixed(1)}`} stroke={deep} strokeWidth={3} fill="none" opacity={0.3} strokeLinecap="round" />
        </g>
      ))}
      {/* the thumb along the left edge: its rim, the nail's quiet light, the crease over the knuckle */}
      <path d={pathOf(THUMB)} fill={pal.rim} opacity={0.5} transform="translate(-4 -3)" />
      <path d={pathOf(THUMB)} fill={`url(#${g}t)`} />
      <path d={pathOf([[-290, 116], [-279, 92], [-263, 91], [-256, 116], [-262, 150], [-283, 152]])} fill={half} opacity={0.35} />
      <path d="M-318 276Q-288 262 -246 270" stroke={deep} strokeWidth={3} fill="none" opacity={0.4} strokeLinecap="round" />
      <path d="M-252 470C-244 400 -240 320 -242 250" stroke={deep} strokeWidth={4} fill="none" opacity={0.35} />
    </g>
  );
};

/** the foreign navigator in his hand, filling the frame: arrow 0 right, 1 up, 2 left (a flip between); bars 0..4; tiles: the
 *  map's opacity; loader: a spinner (-1 none); shake: px; label: the line under the arrow. The phone's foot stays above
 *  y 1360 (the subtitle's band starts at 1440): the shots push about that point. */
export const PhoneInHand: React.FC<{uid: string; frame: number; arrow: number; flipK?: number; bars?: number; tiles?: number; loader?: number; shake?: number; label: string; hand?: boolean}> = ({
  uid,
  frame,
  arrow,
  flipK = 1,
  bars = 4,
  tiles = 1,
  loader = -1,
  shake = 0,
  label,
  hand = true,
}) => {
  const sway = Math.sin(frame / 7) * 5 + shake;
  const rot = -5 + Math.sin(frame / 11) * 1.2;
  const ax = 540 + sway;
  const ay = PHONE_Y + Math.sin(frame / 9) * 4;
  const path = arrow === 1 ? ARROW_UP : ARROW_R;
  const mirror = arrow === 2 ? -1 : 1;
  const sx = mirror * (0.35 + 0.65 * flipK);
  return (
    <g>
      <circle cx={540} cy={PHONE_Y - 60} r={760} fill={`url(#${uid}screen)`} opacity={0.5} />
      <g transform={`translate(${ax.toFixed(1)} ${ay.toFixed(1)}) rotate(${rot.toFixed(2)}) scale(${PHONE_K})`}>
        {hand ? <Grip part="back" uid={uid} /> : null}
        <rect x={-252} y={-502} width={504} height={1004} rx={76} fill={C.ilGlass} stroke={C.il5} strokeWidth={3} />
        <rect x={-234} y={-484} width={468} height={968} rx={62} fill={C.il7} />
        {/* the map: a few streets and blocks, fading out when the signal goes */}
        <g opacity={tiles}>
          {Array.from({length: 9}, (_, i) => (
            <path key={i} d={`M-234 ${-420 + i * 110 + jit(i, 3) * 40}L234 ${-470 + i * 110 + jit(i, 4) * 60}`} stroke={C.il6} strokeWidth={10 + jit(i, 5) * 10} />
          ))}
          {Array.from({length: 5}, (_, i) => (
            <path key={`v${i}`} d={`M${-200 + i * 100 + jit(i, 6) * 30} -484L${-180 + i * 100 + jit(i, 7) * 40} 484`} stroke={C.il6} strokeWidth={8} />
          ))}
          <path d="M-20 484C-10 300 40 160 30 20C20 -120 -40 -240 -30 -380" stroke={C.accA} strokeWidth={14} fill="none" strokeLinecap="round" opacity={0.85} />
          <circle cx={-20} cy={300} r={18} fill={C.il0} />
          <circle cx={-20} cy={300} r={9} fill={C.accA} />
        </g>
        {/* the status bar: the signal bars */}
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={-196 + i * 16} y={-446 - i * 7} width={10} height={14 + i * 7} rx={2} fill={C.il0} opacity={i < bars ? 0.95 : 0.18} />
        ))}
        <rect x={-62} y={-468} width={124} height={32} rx={16} fill={C.ilNight} />
        {/* the instruction card */}
        <rect x={-196} y={-372} width={392} height={330} rx={44} fill={rgba(C.ilNight, 0.88)} />
        <g transform={`translate(0 -246) scale(${sx.toFixed(3)} 1) translate(-60 -60)`}>
          <path d={path} fill={C.il0} />
        </g>
        <text x={0} y={-82} textAnchor="middle" fontFamily={F.mono} fontWeight={600} fontSize={30} letterSpacing={3} fill={C.il1}>
          {label}
        </text>
        {loader >= 0 ? (
          <g transform="translate(0 160)">
            <circle r={60} fill="none" stroke={C.il6} strokeWidth={10} />
            <circle r={60} fill="none" stroke={C.il0} strokeWidth={10} strokeDasharray="80 300" strokeLinecap="round" transform={`rotate(${(loader * 50) % 360})`} />
          </g>
        ) : null}
        {/* the glass's edge catches the light */}
        <path d="M-243 -400V400" stroke={C.il4} strokeWidth={3} strokeLinecap="round" opacity={0.45} />
        {hand ? <Grip part="front" uid={uid} /> : null}
      </g>
    </g>
  );
};
/** the phone's centre and scale in PhoneInHand (the shots push about its foot, PHONE_FOOT) */
export const PHONE_Y = 905;
export const PHONE_K = 0.86;
export const PHONE_FOOT = PHONE_Y + (502 + 24) * PHONE_K;

/** the same phone seen from behind, held up in his hand (the close-up of his face): the dark back, the camera, the
 *  screen's light spilling round its edges; the phone's local space as in PhoneInHand */
export const PhoneBack: React.FC<{uid: string}> = ({uid}) => (
  <g>
    <Grip part="back" uid={uid} />
    <rect x={-262} y={-512} width={524} height={1024} rx={84} fill={C.il1} opacity={0.35} />
    <rect x={-252} y={-502} width={504} height={1004} rx={76} fill={C.ilGlass} stroke={C.il4} strokeWidth={6} />
    <rect x={-210} y={-460} width={190} height={190} rx={48} fill={C.il6} />
    <circle cx={-162} cy={-412} r={34} fill={C.ilNight} stroke={C.il5} strokeWidth={6} />
    <circle cx={-68} cy={-412} r={34} fill={C.ilNight} stroke={C.il5} strokeWidth={6} />
    <circle cx={-162} cy={-318} r={34} fill={C.ilNight} stroke={C.il5} strokeWidth={6} />
    <path d="M232 -420V420" stroke={C.il2} strokeWidth={8} strokeLinecap="round" opacity={0.7} />
    <Grip part="front" uid={uid} />
  </g>
);

// ---- the forest from above (the hook's dive and the crash out): pine crowns, the clearing, the man seen from the sky ------
/** one pine crown from above: its paths (the cast shadow, the moon's rim, the dark needles, a lighter middle tier, the
 *  moonlit top) and its tone (0 the darkest .. 2 the most moonlit); the moon is up and to the right */
export type Crown = {x: number; y: number; r: number; tone: number; d: [string, string, string, string, string]};
const crownStar = (x: number, y: number, r: number, n: number, a0: number, seed: number, inner: number, tip = 0.72, notch = 0.12): V[] => {
  const pts: V[] = [];
  for (let k = 0; k < n; k++) {
    const a = a0 + (k / n) * Math.PI * 2 + (jit(seed, k + 40) - 0.5) * (2.6 / n);
    const rt = r * (0.82 + 0.26 * jit(seed, k + 60));
    pts.push([x + Math.cos(a) * rt, y + Math.sin(a) * rt, tip]);
    const av = a + Math.PI / n;
    const rv = r * (inner + 0.08 * jit(seed, k + 80));
    pts.push([x + Math.cos(av) * rv, y + Math.sin(av) * rv, notch]);
  }
  return pts;
};
const crownOf = (x: number, y: number, r: number, i: number): Crown => {
  // a fir's crown seen from the sky: a whorl of soft boughs (rounded ends, sharp notches between, uneven lengths), the
  // upper tiers smaller and shifted toward the moon, so the crown reads as a cone lit from one side, never a star
  const n = 11 + Math.floor(jit(i, 5) * 4);
  const a0 = jit(i, 6) * Math.PI * 2;
  const base = crownStar(0, 0, r, n, a0, i, 0.74);
  const at = (dx: number, dy: number, k = 1) => pathOf(base.map((p) => [x + p[0] * k + dx, y + p[1] * k + dy, p[2] as number] as V));
  const mid = pathOf(crownStar(x + r * 0.1, y - r * 0.12, r * 0.66, n - 2, a0 + Math.PI / n, i + 300, 0.74));
  const top = pathOf(crownStar(x + r * 0.2, y - r * 0.24, r * 0.32, Math.max(6, n - 6), a0, i + 600, 0.72));
  const tone = jit(i, 7) < 0.3 ? 0 : jit(i, 7) < 0.78 ? 1 : 2;
  return {x, y, r, tone, d: [at(-r * 0.34, r * 0.42, 1.04), at(r * 0.07, -r * 0.07), at(0, 0), mid, top]};
};
/** a field of crowns on a jittered grid over [x0, y0, x1, y1], sizes 0.6 .. 1.4 of `r`, the big ones drawn last (taller,
 *  so they overlap the small); `skip` leaves a point bare (a clearing, a track) */
export const crownField = (x0: number, y0: number, x1: number, y1: number, step: number, r: number, skip: (x: number, y: number, r: number) => boolean): Crown[] => {
  const out: Crown[] = [];
  let i = 0;
  for (let gy = y0; gy < y1; gy += step * 0.87)
    for (let gx = x0 + ((Math.round((gy - y0) / (step * 0.87)) % 2) * step) / 2; gx < x1; gx += step) {
      i++;
      const x = gx + (jit(i, 1) - 0.5) * step * 0.7;
      const y = gy + (jit(i, 2) - 0.5) * step * 0.7;
      const rr = r * (0.6 + 0.8 * jit(i, 3) ** 1.3);
      if (skip(x, y, rr)) continue;
      out.push(crownOf(x, y, rr, i));
    }
  return out.sort((a, b) => a.r - b.r);
};
/** the crowns, culled to a view box [x0, y0, x1, y1] */
export const Crowns: React.FC<{list: Crown[]; view?: [number, number, number, number]}> = ({list, view}) => {
  const T = [
    [C.il7, C.il6, C.il5, C.il5, 0.75, 0.75],
    [C.il7, C.il6, C.il4, C.il5, 1, 0.85],
    [C.il6, C.il5, C.il4, C.il4, 1, 0.9],
  ] as const;
  const vis = view ? list.filter((c) => c.x + c.r * 1.5 > view[0] && c.x - c.r * 1.5 < view[2] && c.y + c.r * 1.5 > view[1] && c.y - c.r * 1.5 < view[3]) : list;
  return (
    <g>
      <g fill={C.shade} opacity={0.6}>
        {vis.map((c, i) => (
          <path key={i} d={c.d[0]} />
        ))}
      </g>
      {vis.map((c, i) => {
        const t = T[c.tone];
        return (
          <g key={i}>
            <path d={c.d[1]} fill={t[3]} opacity={t[5]} />
            <path d={c.d[2]} fill={t[0]} />
            <path d={c.d[3]} fill={t[1]} opacity={t[4]} />
            <path d={c.d[4]} fill={t[2]} opacity={0.55} />
          </g>
        );
      })}
    </g>
  );
};

/** the man seen from the sky (facing +x): his shadow away from the moon, the leather jacket's shoulders with the moon's rim,
 *  the near arm held out with the phone (his hand in the phone's light, the screen glowing), the flat cap from above: its
 *  crown catching the moon, the stiff peak where he faces */
export const ManTop: React.FC<{uid: string; x: number; y: number; s?: number; rot?: number; glow?: number}> = ({uid, x, y, s = 1, rot = 0, glow = 1}) => {
  const shoulders = pathOf([[-11, -2], [-9, -20], [-2, -29], [7, -27], [12, -14, 0.8], [12, 14, 0.8], [7, 27], [-2, 29], [-9, 20]]);
  const sleeve = pathOf([[2, -27], [14, -27], [30, -23], [40, -19], [41, -12], [30, -14], [16, -16], [6, -16]]);
  const cap = pathOf([[-11, 0], [-8, -9], [0, -12], [8, -10], [12, 0], [8, 10], [0, 12], [-8, 9]]);
  const peak = pathOf([[9, -8.6], [15, -6], [17.6, 0], [15, 6], [9, 8.6], [11, 0, 0.8]]);
  return (
    <g transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${s})`}>
      <ellipse cx={-14} cy={14} rx={26} ry={15} fill={C.shade} opacity={0.5} transform="rotate(28 -14 14)" />
      <circle cx={46} cy={-16} r={74} fill={`url(#${uid}screen)`} opacity={0.85 * glow} />
      {/* the far arm down his side, the shoulders, the near arm out with the phone; each with the moon's rim */}
      <path d={pathOf([[-4, 26], [8, 26], [14, 31], [6, 34], [-4, 32]])} fill={C.il7} />
      <path d={shoulders} fill={C.il4} transform="translate(1.8 -1.8)" />
      <path d={shoulders} fill={C.il7} />
      <path d={sleeve} fill={C.il4} transform="translate(1.4 -1.6)" />
      <path d={sleeve} fill={C.il7} />
      <path d="M-6 -25C0 -22 4 -10 4 0C4 10 0 22 -6 25" stroke={C.il6} strokeWidth={1.6} fill="none" />
      <circle cx={42} cy={-15.6} r={4.6} fill={mix(C.accA, '#FFFFFF', 0.35)} />
      <rect x={42} y={-22} width={8} height={13} rx={2} fill={C.il0} transform="rotate(14 46 -15.5)" />
      {/* the cap from above: the crown, its button and seam, the peak where he faces */}
      <path d={cap} fill={C.il4} transform="translate(1.2 -1.2)" />
      <path d={cap} fill={C.il6} />
      <path d="M-7 -7C-2 -10.6 5 -10.6 9 -6.4C5 -7.6 -2 -7.8 -7 -7Z" fill={C.il5} />
      <path d="M-9 1C-3 -1 4 -1 10 0.6" stroke={C.il7} strokeWidth={1} fill="none" opacity={0.8} />
      <path d={peak} fill={C.il7} />
      <path d="M10 -8.2C14.6 -6 17 -2.6 17.4 0" stroke={C.il4} strokeWidth={1.1} fill="none" strokeLinecap="round" />
    </g>
  );
};

/** the stuck car from the side, nose down in the ditch, hazards blinking */
export const StuckCar: React.FC<{uid: string; frame: number; x: number; y: number; len: number; tilt?: number}> = ({uid, frame, x, y, len, tilt = 7}) => {
  const hz = Math.floor(frame / 12) % 2 === 0 ? 1 : 0.12;
  return (
    <g transform={`rotate(${tilt} ${x} ${y})`}>
      <ellipse cx={x} cy={y + 4} rx={len * 0.55} ry={len * 0.035} fill={C.ilNight} opacity={0.8} />
      <Car uid={uid} x={x} y={y} len={len} view="side" dir={1} body="coupe" paint="a" frame={frame} time="night" lights={{head: 1, tail: 1, hazard: hz, left: hz, right: hz, beam: 1}} />
    </g>
  );
};

/** the car from above (the roundabout's lost loops, the forest seen from the sky) */
export const CarTop: React.FC<{uid: string; frame: number; x: number; y: number; len: number; rot: number}> = ({uid, frame, x, y, len, rot}) => (
  <g transform={`rotate(${rot} ${x} ${y})`}>
    <Car uid={uid} x={x} y={y} len={len} view="top" body="coupe" paint="a" frame={frame} time="night" lights={{head: 1, tail: 1}} />
  </g>
);

export {clamp, lerp};
