// The lost man's head for the forest's close-ups (the owner, 2026-10-12: no cartoon faces, the studio's "Silhouette light"
// head; the director on the first try: a spike under the ear, a boxy black notch for a mouth, a cap that was only a blue
// line). The kit's three-quarter head (silhead.tsx TQ_M, the same light recipe: the face's ramp, the near side's soft
// step, the eye socket, the nose's and the chin's shade, the cheek's light, the profile's lit edge, a few precise marks)
// drawn here as ONE outline whose lower jaw really drops: every point carries a weight, the mandible's points turn about
// the hinge in front of the ear (and slide a little forward, as a jaw does), the cheek between stretches with them, so the
// open mouth is a dark opening INSIDE the face, the far lips a lit sliver along the profile, never a notch cut in the edge.
// The cap is a solid ink flat cap (its crown catching the sky, a stiff peak with a lit edge, its shadow on the brow), the
// short hair runs from under it round the ear to the nape, so the skull's base never shows as a lit wedge.
// Head space as silhead.tsx: the crown y -50, the chin y +50, the eye line 0, the face toward +x.
import React from 'react';
import {mix} from '../scenes/illo/palette';
import {pathOf, type SilExpr, type SilPal, type V} from '../scenes/illo/silhead';

type Pt = [number, number];
/** a point of an outline with a jaw weight: x, y, smoothness (as pathOf), w (0 the skull .. 1 the mandible) */
type WP = readonly [number, number, number, number];

const f2 = (n: number) => String(Math.round(n * 100) / 100);

/** the jaw's hinge (the joint in front of the ear) */
export const HINGE: Pt = [-6, 6];
/** a point moved with the jaw: turned w * th degrees about the hinge, slid forward and down a little (the condyle rides
 *  forward as the mouth opens wide) */
export const jawPt = (x: number, y: number, w: number, th: number): Pt => {
  if (w <= 0 || th === 0) return [x, y];
  const a = (w * th * Math.PI) / 180;
  const dx = x - HINGE[0];
  const dy = y - HINGE[1];
  return [HINGE[0] + dx * Math.cos(a) - dy * Math.sin(a) + w * th * 0.36, HINGE[1] + dx * Math.sin(a) + dy * Math.cos(a) + w * th * 0.08];
};
const mv = (pts: readonly WP[], th: number): V[] => pts.map((p) => [...jawPt(p[0], p[1], p[3], th), p[2]] as V);

// the face and the skull, clockwise from the crown (silhead TQ_M, the chin a little stronger, the lips split for the jaw)
const OUT: WP[] = [
  [-6, -50, 1, 0], [12, -48, 1, 0], [25, -40.2, 1, 0], [31.4, -29.6, 1, 0], [34.4, -17.4, 1, 0], [35.4, -8.6, 0.55, 0], [33.6, -3.2, 0.35, 0],
  [35.4, 3, 1, 0], [38.6, 10.4, 1, 0], [41.6, 16.4, 0.55, 0], [40.6, 19.4, 0.5, 0], [36.4, 21.4, 0.15, 0], [36.8, 24.6, 1, 0],
  [37.2, 27.6, 0.5, 0], [36.4, 30.2, 0.45, 0.04], // the upper lip, turning under
  [35.1, 31.2, 0.7, 0.5], // between the lips (the far corner): a soft dip
  [35.8, 32.1, 0.45, 1], [36, 33.6, 1, 1], [34.6, 35.4, 0.5, 1], [32.2, 37.6, 0.5, 1], // the lower lip, the fold under it
  [34, 42.4, 1, 1], [33.4, 47, 0.7, 1], [28.6, 51, 0.6, 1], [18, 52.6, 1, 1], [7, 50.4, 1, 1], [-3, 43.6, 0.55, 1], // chin, jaw
  [-6.8, 35.4, 1, 0.85], [-10.6, 29.6, 1, 0.55], [-19.6, 25, 0.6, 0.15], // the ramus up to the ear's lobe
  [-30, 18, 1, 0], [-38.6, 4.6, 1, 0], [-42.6, -12, 1, 0], [-38.8, -31, 1, 0], [-26.6, -44.4, 1, 0],
];
// the near side of the face, turned from the light (everything left of this line)
const SIDE: WP[] = [[10, -40, 1, 0], [10.6, -22, 1, 0], [12.6, -8, 0.6, 0], [11.4, 3, 1, 0], [14, 14, 1, 0.05], [18.2, 26, 1, 0.4], [20.6, 36, 1, 0.9], [21, 46, 1, 1], [18, 62, 1, 1], [-60, 62, 1, 1], [-60, -40, 1, 0]];
// the mouth's dark opening: the upper lip's edge back to the near corner, the lower lip's edge forward, the far end a
// little inside the profile (the far lips' lit sliver stays on the edge)
const MOUTH: WP[] = [
  [34.6, 31.0, 0.6, 0.1], [32.2, 30.8, 1, 0], [28.8, 30.8, 1, 0.03], [24.6, 31.8, 0.35, 0.32], // the top edge, the near corner
  [26.6, 32.8, 1, 0.74], [30.2, 33.1, 1, 0.93], [33.8, 32.6, 0.7, 0.99], // the lower lip's edge
  [33.6, 31.7, 0.8, 0.55], // the far end
];
const TONGUE: WP[] = [[26.4, 32.8, 1, 0.66], [30, 33, 1, 0.7], [33.4, 32.5, 0.6, 0.74], [33.8, 32.6, 0.6, 0.99], [30.2, 33.1, 1, 0.93], [26.6, 32.8, 1, 0.74]];
// the moustache: a full chevron over the upper lip, its near end drooping past the mouth's corner
const TACHE: V[] = [[24.8, 31.6, 0.3], [26.4, 27.4], [29.6, 24.4], [33.6, 22.8], [36.6, 22.6], [38.1, 24.2, 0.5], [37.9, 27.6, 0.4], [35, 29.2], [30.6, 29.4], [27.2, 30.4]];
// the short hair under the cap: from the cap's back edge down the skull to the nape, up behind the ear, over it, the
// sideburn in front of it, back under the cap
const HAIR: V[] = [
  [-46.4, -19, 0.5], [-44.2, -7], [-41.4, 3], [-37.4, 11], [-33, 16.4, 0.5], [-27.8, 14.6], [-24.4, 9.6], [-22, 2.6], [-21.2, -5.4], [-15.6, -9.6],
  [-8.8, -9.4], [-4.4, -5.2], [-2.8, 2], [-1.8, 8.8, 0.3], [1.4, 8.6, 0.3], [2.4, -1.6], [4.8, -12], [9.6, -21.6], [14, -26.6], [-10, -27.6], [-32, -24],
];
// the flat cap: the crown sloping from the back to the front, over the stiff peak
const CAP: V[] = [
  [47.6, -22.2, 0.25], [45.4, -25.2, 0.5], [41.4, -27.6], [36.4, -32.6], [25, -42.6], [8, -50.4], [-12, -53], [-29, -49.2], [-40.2, -41],
  [-44.8, -30.2], [-45.6, -20.8, 0.5], [-43, -16.8, 0.3], [-35, -19.8], [-19, -23.8], [1, -25.8], [20, -26.2], [32.6, -24.4], [40, -21.8], [45.6, -20.8, 0.3],
];
const PEAK: V[] = [[47.6, -22.2, 0.25], [45.4, -25.2, 0.5], [38.6, -26.8], [31, -26.2, 0.5], [32.6, -24.4], [40, -21.8], [45.6, -20.8, 0.3]];
const EAR: V[] = [[-7.6, -2.4], [-12, -5.2], [-17.4, -4.4], [-20.4, -0.4], [-20.6, 6.6], [-18.4, 12.6], [-14.8, 17.8], [-11.6, 20, 0.7], [-9, 18.6], [-8, 13.4], [-7.3, 7.4], [-6.8, 1.6]];

/** an eye (silhead's: a lid line over a dark iris, no white; closed: a fine crescent) */
const eyeOf = (x0: number, x1: number, y: number, ex: SilExpr, col: string, w: number, key: string): React.ReactNode => {
  const L = x1 - x0;
  const at = (t: number, dy: number): V => [x0 + L * t, y + dy];
  const lid = Math.max(0, Math.min(1, ex.lid));
  const sm = Math.max(0, Math.min(1, ex.smile));
  if (lid < 0.32) {
    const sag = (1.7 - 3.4 * sm) * w;
    return <path key={key} d={pathOf([at(0, -0.2), at(0.5, sag - 0.1), at(1, 0.6 * w), at(1, 1.25 * w), at(0.5, sag + 1.05 * w), at(0, 0.45 * w)])} fill={col} />;
  }
  const o = (lid - 0.32) / 0.68;
  const up = -(1.0 + 2.2 * o) * w;
  const lo = (1.2 + 0.6 * o - 1.2 * sm) * w;
  const lk = ex.look * 0.18 * L;
  return (
    <g key={key}>
      <path d={pathOf([at(0.3 + lk / L, up * 0.6), at(0.78 + lk / L, up * 0.55), at(0.82 + lk / L, lo * 0.8), at(0.36 + lk / L, lo * 0.85)])} fill={col} opacity={0.85} />
      <path d={pathOf([at(-0.02, 0.4), at(0.4, up - 0.2), at(1.02, 0.2), at(0.98, 0.9), at(0.42, up + 0.9), at(0.04, 1.0)])} fill={col} />
    </g>
  );
};
/** a brow (silhead's: a tapered filled stroke, raised and tilted by the expression) */
const browOf = (x0: number, x1: number, y: number, ex: SilExpr, col: string, w: number, inner: 0 | 1, key: string): React.ReactNode => {
  const L = x1 - x0;
  const tilt = (ex.browTilt * Math.PI) / 180;
  const yAt = (t: number) => y - ex.brow + (inner === 1 ? t : 1 - t) * -Math.tan(tilt) * L * 0.45;
  const th = 1.45 * w;
  const top: V[] = [[x0, yAt(0) + 0.2], [x0 + L * 0.45, yAt(0.45) - th * 0.9 - 0.5], [x1, yAt(1) + 0.3 * w]];
  const bot: V[] = [[x1, yAt(1) + 0.6 * w], [x0 + L * 0.45, yAt(0.45) + th * 0.2 - 0.5], [x0, yAt(0) + th]];
  return <path key={key} d={pathOf([...top, ...bot])} fill={col} />;
};

/** the jaw's underside (the chin's foot back to the ear's lobe), moved with the jaw: for the shadow it casts on the neck */
export const jawLine = (th: number): Pt[] => OUT.slice(21, 26).map((p) => jawPt(p[0], p[1], p[3], th));

/** the lost man's head, close (see the file's header). jaw: degrees the jaw drops (0 closed .. 18 a full shout); tilt:
 *  the head's own tilt (the light stays put); glow: a light on the face (head space), strength k */
export const ManHead: React.FC<{uid: string; pal: SilPal; ex: SilExpr; jaw?: number; tilt?: number; glow?: {x: number; y: number; r: number; k: number}}> = ({uid, pal, ex, jaw = 0, tilt = 0, glow}) => {
  const id = (n: string) => `mh${uid}${n}`;
  const [deep, shadow, half, hi] = pal.lit;
  const th = Math.max(0, jaw);
  const open = th > 1.2;
  const d = pathOf(mv(OUT, th));
  const feat = pal.feature;
  const gt = `rotate(${f2(-tilt)} 0 0)`;
  const capTop = mix(pal.ink, '#FFFFFF', 0.2);
  const capMid = mix(pal.ink, '#FFFFFF', 0.08);
  // the lips' corner and the fold from the nose's wing round it deepen as the mouth opens
  const fold = mv([[31.4, 19.8, 1, 0], [28.6, 23.6, 1, 0], [25.8, 28.4, 1, 0.1], [23.8, 32.4, 1, 0.36]], th);
  const lip = mix(deep, feat, 0.45);
  return (
    <g>
      <defs>
        <linearGradient id={id('face')} gradientUnits="userSpaceOnUse" x1={-26} y1={-30} x2={36} y2={34} gradientTransform={gt}>
          <stop offset="0" stopColor={deep} />
          <stop offset="0.42" stopColor={shadow} />
          <stop offset="0.76" stopColor={half} />
          <stop offset="1" stopColor={hi} />
        </linearGradient>
        <linearGradient id={id('side')} gradientUnits="userSpaceOnUse" x1={15} y1={0} x2={-3} y2={6} gradientTransform={gt}>
          <stop offset="0" stopColor={deep} stopOpacity={0} />
          <stop offset="0.5" stopColor={deep} stopOpacity={0.18} />
          <stop offset="1" stopColor={deep} stopOpacity={0.3} />
        </linearGradient>
        <radialGradient id={id('sock')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor={deep} stopOpacity={0.5} />
          <stop offset="1" stopColor={deep} stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('cheek')} cx={26} cy={10} r={10.6} gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor={hi} stopOpacity={0.5} />
          <stop offset="1" stopColor={hi} stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('ear')} gradientUnits="userSpaceOnUse" x1={-9} y1={-6} x2={-21} y2={22}>
          <stop offset="0" stopColor={mix(shadow, half, 0.25)} />
          <stop offset="1" stopColor={mix(deep, shadow, 0.55)} />
        </linearGradient>
        <linearGradient id={id('brim')} gradientUnits="userSpaceOnUse" x1={0} y1={-25} x2={0} y2={-14}>
          <stop offset="0" stopColor={deep} stopOpacity={0.62} />
          <stop offset="1" stopColor={deep} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={id('hair')} gradientUnits="userSpaceOnUse" x1={0} y1={-20} x2={-40} y2={16}>
          <stop offset="0" stopColor={mix(pal.ink, '#FFFFFF', 0.1)} />
          <stop offset="0.6" stopColor={pal.ink} />
        </linearGradient>
        <linearGradient id={id('cap')} gradientUnits="userSpaceOnUse" x1={18} y1={-56} x2={-8} y2={-18}>
          <stop offset="0" stopColor={capTop} />
          <stop offset="0.45" stopColor={capMid} />
          <stop offset="1" stopColor={pal.ink} />
        </linearGradient>
        <linearGradient id={id('peak')} gradientUnits="userSpaceOnUse" x1={0} y1={-27} x2={0} y2={-20}>
          <stop offset="0" stopColor={mix(pal.ink, '#FFFFFF', 0.14)} />
          <stop offset="1" stopColor={mix(pal.ink, '#000000', 0.35)} />
        </linearGradient>
        {glow ? (
          <radialGradient id={id('glow')} gradientUnits="userSpaceOnUse" cx={glow.x} cy={glow.y} r={glow.r}>
            <stop offset="0" stopColor={hi} stopOpacity={0.8 * glow.k} />
            <stop offset="0.5" stopColor={hi} stopOpacity={0.28 * glow.k} />
            <stop offset="1" stopColor={hi} stopOpacity="0" />
          </radialGradient>
        ) : null}
        <filter id={id('soft')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={1.3} />
        </filter>
        <clipPath id={id('clip')}>
          <path d={d} />
        </clipPath>
        <clipPath id={id('front')}>
          <path d={pathOf(mv([[20, -40, 0, 0], [70, -40, 0, 0], [70, 34, 0, 0.6], [70, 80, 0, 1], [24, 80, 0, 1], [24, 40, 0, 1], [20, 30, 0, 0.3]], th))} />
        </clipPath>
      </defs>
      {/* the face: the light's ramp, then inside it the planes turned away, the light's accents and the marks */}
      <path d={d} fill={`url(#${id('face')})`} />
      <g clipPath={`url(#${id('clip')})`}>
        <path d={pathOf(mv(SIDE, th))} fill={`url(#${id('side')})`} filter={`url(#${id('soft')})`} />
        <ellipse cx={21} cy={-0.8} rx={8.6} ry={5.2} fill={`url(#${id('sock')})`} />
        <path d={pathOf([[31.4, 1.6], [34, 1.4], [39, 13], [36, 19.4], [32.4, 17.6]])} fill={deep} opacity={0.18} />
        <rect x={10} y={-2} width={34} height={26} fill={`url(#${id('cheek')})`} />
        {glow ? <rect x={-60} y={-60} width={120} height={130} fill={`url(#${id('glow')})`} /> : null}
        {/* the peak's shadow across the brow */}
        <path d="M-10 -30H50V-12H-10Z" fill={`url(#${id('brim')})`} />
        <path d={d} fill="none" stroke={hi} strokeWidth={5} opacity={0.34} clipPath={`url(#${id('front')})`} />
        {eyeOf(15, 26.4, 0.4, ex, feat, 0.95, 'eyeN')}
        {eyeOf(30.4, 33.4, 0, {...ex, lid: Math.min(ex.lid, 0.3)}, feat, 0.6, 'eyeF')}
        {browOf(13.6, 27.8, -6.8, ex, feat, 1, 1, 'browN')}
        {browOf(30, 34.6, -7, ex, feat, 0.7, 0, 'browF')}
        <path d="M33.4 15.2C34.1 17.6 35.1 19.2 37.2 20.4" stroke={feat} strokeWidth={0.95} strokeLinecap="round" fill="none" opacity={0.7} />
        <path d={pathOf(fold, false)} stroke={deep} strokeWidth={1} strokeLinecap="round" fill="none" opacity={0.3 + Math.min(0.3, th * 0.02)} />
        {open ? (
          <>
            {/* the open mouth: its dark, the tongue's deeper hue low in it */}
            <path d={pathOf(mv(MOUTH, th))} fill={feat} />
            <path d={pathOf(mv(TONGUE, th))} fill={mix(deep, feat, 0.5)} opacity={Math.min(1, (th - 1.2) / 6) * 0.9} />
          </>
        ) : (
          <path d="M34.6 30.4C32 30.8 29.4 31 27.2 31.4" stroke={lip} strokeWidth={1.1} strokeLinecap="round" fill="none" />
        )}
      </g>
      {/* the moustache: ink, one hairline of sheen along its top */}
      <path d={pathOf(TACHE)} fill={pal.ink} />
      <path d={pathOf([[27.8, 27], [30.8, 25], [34.2, 23.7], [36.8, 23.5]], false)} stroke={pal.sheen} strokeWidth={0.5} fill="none" opacity={0.7} />
      {/* the ear */}
      <path d={pathOf(EAR)} fill={`url(#${id('ear')})`} />
      <path d="M-11.6 -1.2C-14.6 -2 -17 -0.8 -17.8 2.8C-18.6 6.4 -17.2 10 -14.8 12.6" stroke={deep} strokeWidth={0.8} strokeLinecap="round" fill="none" opacity={0.55} />
      {/* the hair under the cap: the light's rim behind it, the ink */}
      {pal.dark ? <path d={pathOf(HAIR)} fill={pal.rim} opacity={0.55} transform="translate(-0.9 -0.4)" /> : null}
      <path d={pathOf(HAIR)} fill={`url(#${id('hair')})`} />
      {/* the flat cap: the rim along its crown, the solid ink crown catching the sky, the peak, the crown's seam */}
      {pal.dark ? <path d={pathOf(CAP)} fill={pal.rim} opacity={0.7} transform="translate(-0.7 -0.9)" /> : null}
      <path d={pathOf(CAP)} fill={`url(#${id('cap')})`} />
      <path d={pathOf(PEAK)} fill={`url(#${id('peak')})`} />
      <path d={pathOf([[31.4, -26.4], [38.6, -27], [45.2, -25.4]], false)} stroke={pal.sheen} strokeWidth={0.7} strokeLinecap="round" fill="none" opacity={0.95} />
      <path d={pathOf([[39, -28.6], [26, -33.4], [6, -35.4], [-16, -33], [-34, -26.6]], false)} stroke={pal.sheen} strokeWidth={0.55} fill="none" opacity={0.55} />
      <path d={pathOf([[35.6, -33.6], [24.4, -43.6], [7.6, -51.2], [-12, -53.6]], false)} stroke={mix(pal.sheen, '#FFFFFF', 0.3)} strokeWidth={0.6} strokeLinecap="round" fill="none" opacity={0.5} />
    </g>
  );
};
