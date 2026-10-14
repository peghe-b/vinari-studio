// TWO VOICES (the owner, 2026-10-12: "it all needs refining, properly", "zoom", "the studio's moving phone"): the app's two
// voices introduce themselves on two prints dealt onto the paper, and the camera does the work. It opens tight on Nelson's
// print (the iris opens on it) and pushes slowly toward his face while he speaks; as his line ends it drifts right and eases
// out to the pair while Alice's print is dealt onto the pile; on her "hello" it leans toward her; then it pulls back and
// tilts down to the joke. The two prints are ONE series (the reviewers, round 2: an archival photograph next to a drawing
// read as two media): two illustrated studio portraits in the kit's Silhouette-light language, the same backdrop, the same
// one soft light from the middle of the pair (each sitter turned toward the other), the same greys and grain: Nelson, a
// motorist of 1903 in a flat cap, round spectacles, a wing collar and tie; Alice, a woman of 1909
// in a motoring duster and a period hat with its veil. No photograph and never a fake one. Each print says its year and its
// name („ალისა", as she says it). While a voice speaks its print lifts with a cobalt hairline and two pulses and its voice
// badge plays. The joke (one, not four): the lost man of the forest slaps on as a happy die-cut sticker (grey light, a
// smile); his old English phone pops out from behind the sticker and stands up showing TURN RIGHT, then is lobbed into a
// refined pedal bin whose lid (hinged away from the throw) latches on the latch sound.
// Everything stays whole: above the subtitle band (y 1440) and, under y 1110, left of x 887 (the Reels buttons).
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {Figure, type Cast} from '../scenes/illo/figure';
import {silPal, SilPalCtx, type SilPal} from '../scenes/illo/sil';
import {pathOf, SilHead, type HeadLook, type SilExpr} from '../scenes/illo/silhead';
import type {Time} from '../scenes/illo/palette';
import {Grain, useGrainTile} from '../lib/photo';
import {mtav} from '../lib/format';
import {C, F, rgba} from '../tokens';
import {DefsSvg, MAN} from './refined';
import {clamp, E, ev, fr, lerp, prog, shake, shot, sp} from './lib';

// ---- the layout (world px: what the frame shows when the camera is at rest, z 1) --------------------------------------------
const CW = 420; // a print
const CH = 590;
const PAD = 18; // its white border
const PW = CW - 2 * PAD; // the picture
const PH = 420;
const NEL = {x: 325, y: 565, rot: -3.5};
const ALI = {x: 738, y: 615, rot: 3}; // dealt onto the pile, just over Nelson's right border
const STK = {x: 250, y: 1225, r: 100};
const BIN = {x: 700, base: 1398, top: 1205};
const HOLD = {x: 482, y: 1240}; // the old phone stands here, between the sticker and the bin
const PS = 0.52; // the old phone's scale (its drawing is 260 x 520)
const ANCHOR = {x: 540, y: 760}; // where the camera's focus lands on screen

const STICKER_MAN: Cast = {...(MAN as Exclude<Cast, string>), beard: 'none'};
/** the grey light (no hue): both illustrated prints share this one grade; the features a soft dark grey, not black */
const greyPal = (time: Time, level: number): SilPal => ({...silPal({light: true, hue: null, time, level}), feature: C.il6});

const ARROW_R = 'M30 104V58C30 38 42 26 62 26H80V8L112 38L80 68V50H62C56 50 54 54 54 60V104Z';

// ---- the camera ----------------------------------------------------------------------------------------------------------------
type Cam = {x: number; y: number; z: number; r: number}; // the world point at the anchor, the zoom, the roll (deg)
const K0: Cam = {x: 325, y: 578, z: 1.34, r: -1}; // tight on Nelson's print
const K1: Cam = {x: 348, y: 545, z: 1.5, r: 0.2}; // pushed in toward his face
const K2: Cam = {x: 535, y: 602, z: 1.12, r: 0.5}; // the pair, Alice landing on the right
const K2b: Cam = {x: 546, y: 606, z: 1.13, r: 0.3}; // leaning toward Alice
const K3: Cam = {x: 540, y: 760, z: 1, r: 0}; // the whole table: the prints and the jokes
const mixCam = (a: Cam, b: Cam, k: number): Cam => ({x: lerp(a.x, b.x, k), y: lerp(a.y, b.y, k), z: lerp(a.z, b.z, k), r: lerp(a.r, b.r, k)});

// ---- a print ---------------------------------------------------------------------------------------------------------------
/** the voice badge: idle a ringed glyph in grey, playing a cobalt disc whose bars move */
const Badge: React.FC<{on: number; t: number; dim: number}> = ({on, t, dim}) => {
  const S = 58;
  const bars = [0.5, 0.85, 1, 0.75, 0.45];
  const glyph = (play: boolean, col: string) => (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} style={{position: 'absolute', inset: 0}}>
      {bars.map((b, i) => {
        const h = 22 * b * (play ? 0.4 + 0.6 * Math.abs(Math.sin(t * 0.55 + i * 1.7)) : 0.7);
        return <rect key={i} x={S / 2 - 16 + i * 7} y={S / 2 - h / 2} width={4} height={h} rx={2} fill={col} />;
      })}
    </svg>
  );
  return (
    <div style={{position: 'absolute', right: PAD + 2, top: PAD + PH + 16, width: S, height: S, opacity: 1 - dim}}>
      <div style={{position: 'absolute', inset: 0, borderRadius: S / 2, border: `2px solid ${C.rule}`, opacity: 1 - on}}>{glyph(false, C.ink3)}</div>
      <div style={{position: 'absolute', inset: 0, borderRadius: S / 2, background: C.accA, opacity: on, transform: `scale(${lerp(0.7, 1, on).toFixed(3)})`}}>{glyph(true, C.onInk)}</div>
    </div>
  );
};

type CardP = {
  rest: {x: number; y: number; rot: number};
  deal: number; // 0..1 (a spring): dealt onto the paper
  from: [number, number, number]; // where it is dealt from: dx, dy, extra tilt (always inside the frame)
  on: number; // 0..1 its voice speaks
  dim: number; // 0..1 the other voice speaks
  t: number;
  phase: number;
  year: string;
  name: string;
  z: number;
  children: React.ReactNode;
};

const Card: React.FC<CardP> = ({rest, deal, from, on, dim, t, phase, year, name, z, children}) => {
  if (deal <= 0) return null;
  const air = clamp(1 - deal, 0, 1.2); // its height over the paper while it falls
  const h = Math.max(air * 1.4, on); // the shadow's height
  const cx = rest.x + from[0] * (1 - deal);
  const cy = rest.y + from[1] * (1 - deal) + Math.sin((t + phase) / 38) * 3 - 16 * on;
  const r = rest.rot * (1 - 0.4 * on) + from[2] * (1 - deal) + Math.sin((t + phase) / 47) * 0.35;
  const s = lerp(1.1, 1, deal) * (1 + 0.055 * on) * (1 - 0.025 * dim);
  return (
    <div style={{position: 'absolute', left: cx - CW / 2, top: cy - CH / 2, width: CW, height: CH, transform: `rotate(${r.toFixed(3)}deg) scale(${s.toFixed(4)})`, opacity: clamp(deal * 6), zIndex: z}}>
      {/* the speaking light: a cobalt hairline round the print, two pulses leaving it */}
      {on > 0.01 ? (
        <>
          {[0, 1].map((i) => {
            const q = ((t + i * 12) % 24) / 24;
            const g = 12 + q * 14;
            return <div key={i} style={{position: 'absolute', inset: -g, borderRadius: 14 + q * 14, border: `3px solid ${C.accA}`, opacity: on * (1 - q) * 0.5}} />;
          })}
          <div style={{position: 'absolute', inset: -12, borderRadius: 14, border: `4px solid ${C.accA}`, opacity: on}} />
        </>
      ) : null}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: C.surface,
          borderRadius: 6,
          boxShadow: `0 ${(4 + 30 * h).toFixed(1)}px ${(10 + 56 * h).toFixed(1)}px ${rgba(C.shade, 0.1 + 0.07 * h)}, 0 1px 3px ${rgba(C.shade, 0.12)}`,
        }}
      />
      <div style={{position: 'absolute', left: PAD, top: PAD, width: PW, height: PH, overflow: 'hidden', background: C.il2}}>
        {children}
        <div style={{position: 'absolute', inset: 0, boxShadow: `inset 0 0 0 1px ${rgba(C.shade, 0.1)}`}} />
        {/* stepping back: a light veil on the picture only (the print keeps its contrast, the caption stays readable) */}
        {dim > 0.01 ? <div style={{position: 'absolute', inset: 0, background: rgba(C.surface, 0.2 * dim)}} /> : null}
      </div>
      <div style={{position: 'absolute', left: PAD + 2, top: PAD + PH + 18, fontFamily: F.sans, fontWeight: 600, fontSize: 52, lineHeight: 1, color: C.ink, letterSpacing: '-0.01em', fontFeatureSettings: '"tnum" 1'}}>{year}</div>
      <div style={{position: 'absolute', left: PAD + 3, top: PAD + PH + 82, fontFamily: F.sans, fontWeight: 600, fontSize: 36, lineHeight: 1, color: C.ink, letterSpacing: '0.03em', whiteSpace: 'nowrap'}}>{mtav(name)}</div>
      <Badge on={on} t={t} dim={dim} />
    </div>
  );
};

/** Nelson: an illustrated studio portrait, the pair of Alice's (the reviewers: his archival photograph next to her drawing
 *  read as two media; the people of this film are the kit's Silhouette-light people). The same backdrop, the same one soft
 *  light (from the side he looks to, toward Alice), the same greys and grain, mirrored: the kit's sculpted head in a
 *  three-quarter view, eyes open, a quiet closed smile; a motorist of 1903 sat for his portrait: a dark flat cap, round
 *  spectacles, a high white wing collar and a dark tie, a dark motoring coat with
 *  lapels, each turned by the light with a highlight edge. Head space as Alice's (100 units = the head), the face toward +x. */
const NELSON_EX: SilExpr = {lid: 1, smile: 0.15, brow: 0.4, browTilt: 0, curve: 0.4, open: 0, look: 0.12};

const NelsonPrint: React.FC<{t: number; dur: number; uid: string; tile: string}> = ({t, dur, uid, tile}) => {
  const z = 1 + 0.07 * E.sine(clamp(t / dur));
  const pal: SilPal = {...silPal({light: true, hue: null, time: 'day', level: 1}), lit: [C.il5, C.il4, C.il2, C.il0], feature: C.il7, ink: C.ink};
  const look: HeadLook = {fem: false, age: 0, hair: 'crop', hairCol: C.ink, beard: null, glasses: 'round', hat: 'flatCap', hatCol: C.il6, earring: null};
  const g = (n: string) => `${uid}${n}`;
  return (
    <>
      <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          <linearGradient id={g('ab')} x1="1" y1="0" x2="0.7" y2="1">
            <stop offset="0" stopColor={C.il2} />
            <stop offset="1" stopColor={C.il4} />
          </linearGradient>
          <radialGradient id={g('al')} cx="0.5" cy="0.36" r="0.56">
            <stop offset="0" stopColor={C.il0} stopOpacity="0.9" />
            <stop offset="0.5" stopColor={C.il1} stopOpacity="0.4" />
            <stop offset="1" stopColor={C.il1} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g('av')} x1="1" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={C.il7} stopOpacity="0" />
            <stop offset="0.6" stopColor={C.il7} stopOpacity="0" />
            <stop offset="1" stopColor={C.il7} stopOpacity="0.3" />
          </linearGradient>
          <linearGradient id={g('coat')} gradientUnits="userSpaceOnUse" x1={70} y1={96} x2={-110} y2={230}>
            <stop offset="0" stopColor={C.il4} />
            <stop offset="0.4" stopColor={C.il5} />
            <stop offset="1" stopColor={C.il7} />
          </linearGradient>
          <linearGradient id={g('lap')} gradientUnits="userSpaceOnUse" x1={40} y1={90} x2={-40} y2={200}>
            <stop offset="0" stopColor={C.il4} />
            <stop offset="1" stopColor={C.il6} />
          </linearGradient>
          <linearGradient id={g('neck')} gradientUnits="userSpaceOnUse" x1={-24} y1={60} x2={14} y2={60}>
            <stop offset="0" stopColor={pal.lit[0]} />
            <stop offset="0.45" stopColor={pal.lit[1]} />
            <stop offset="1" stopColor={pal.lit[2]} />
          </linearGradient>
          <linearGradient id={g('collar')} gradientUnits="userSpaceOnUse" x1={22} y1={54} x2={-30} y2={100}>
            <stop offset="0" stopColor={C.il0} />
            <stop offset="0.6" stopColor={C.il1} />
            <stop offset="1" stopColor={C.il3} />
          </linearGradient>
          <linearGradient id={g('tie')} gradientUnits="userSpaceOnUse" x1={12} y1={92} x2={-6} y2={180}>
            <stop offset="0" stopColor={C.il5} />
            <stop offset="1" stopColor={C.il7} />
          </linearGradient>
        </defs>
        <rect width={PW} height={PH} fill={`url(#${g('ab')})`} />
        <rect width={PW} height={PH} fill={`url(#${g('al')})`} />
        <g transform={`translate(${PW / 2} ${PH * 0.42}) scale(${z.toFixed(4)}) translate(${-PW / 2} ${-PH * 0.42})`}>
          <g transform="translate(176 180) scale(1.5) rotate(2)">
            {/* the motoring coat: dark, its shoulders lit along the top (the light from +x), lapels open on the shirt front */}
            <path d="M-26 80C-54 88 -92 98 -110 122C-124 140 -128 176 -130 240L96 240C94 180 90 146 74 124C60 106 36 94 16 86Z" fill={`url(#${g('coat')})`} />
            <path d="M74 124C60 106 36 94 16 86" stroke={C.il3} strokeWidth={2.4} strokeLinecap="round" fill="none" />
            <path d="M-26 80C-54 88 -92 98 -110 122" stroke={C.il4} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
            <path d="M-22 92L24 92L6 214Z" fill={C.il1} />
            <path d="M-22 92L-6 160L6 214" stroke={C.il3} strokeWidth={1} fill="none" opacity={0.7} />
            {/* the tie: a knot at the throat and its blade, a hairline of sheen */}
            <path d="M-3 98C-1 112 0 140 2 168L7 178L12 168C11 140 10 112 9 98Z" fill={`url(#${g('tie')})`} />
            <path d="M-5 89L11 89L9 99L-3 99Z" fill={C.il6} />
            <path d="M8 100C9 120 10 145 10.6 166" stroke={C.il4} strokeWidth={1} fill="none" opacity={0.8} />
            {/* the lapels over the shirt front */}
            <path d="M-26 88C-34 118 -30 160 -6 240L4 240C-6 190 -12 140 -10 104Z" fill={`url(#${g('lap')})`} />
            <path d="M24 88C34 116 34 166 26 240L14 240C18 190 20 140 16 104Z" fill={`url(#${g('lap')})`} />
            <path d="M24 88C34 116 34 166 26 240" stroke={C.il3} strokeWidth={1.4} fill="none" />
            {/* the neck, turned by the light */}
            <path d="M-19.6 25.4C-21 48 -23 62 -24 84L16 88C14 74 11 62 10 47Z" fill={`url(#${g('neck')})`} />
            {/* the high wing collar: white, its two tips folded down at the throat */}
            <path d="M-26 92C-28 80 -26 68 -22 58C-8 66 8 68 20 62C24 72 24 82 23 92C16 88 10 88 7 90L2 92L-3 90C-10 88 -18 88 -26 92Z" fill={`url(#${g('collar')})`} />
            <path d="M-22 58C-8 66 8 68 20 62" stroke={C.il0} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <path d="M-4 88L-11 97L-2 95Z" fill={C.il1} />
            <path d="M8 88L15 97L6 95Z" fill={C.il0} />
            {/* the head (the kit's): round spectacles, the flat cap */}
            <SilHead view="three" look={look} ex={NELSON_EX} pal={pal} uid={`${uid}h`} tilt={-2} />
            {/* a hairline of sheen along the cap's crown, from the light's side */}
            <path d="M30 -45C18 -53 0 -55.6 -18 -52" stroke={C.il4} strokeWidth={1.6} strokeLinecap="round" fill="none" opacity={0.9} />
          </g>
        </g>
        <rect width={PW} height={PH} fill={`url(#${g('av')})`} />
      </svg>
      <Grain amount={0.45} tile={tile} seed={1} />
    </>
  );
};

/** Alice: an illustrated studio portrait (no photo of her is in the licensed set; never a fake photo). The kit's sculpted
 *  Silhouette-light head in a three-quarter view, toward Nelson, eyes open, a quiet closed smile in a mid grey; the rest
 *  drawn here in the same language, as a woman of 1909 sat for her portrait: a dark motoring hat with a chiffon veil
 *  wound round its crown and flowing back, a high white blouse collar with a brooch, a dark duster coat with lapels, each
 *  turned by the one soft light (from her front, top left on screen) with a highlight edge. A print does not move: only
 *  the camera's slow push inside the frame. Head space: 100 units = the head's height, the face toward +x (mirrored). */
const ALICE_EX: SilExpr = {lid: 1, smile: 0, brow: 0.6, browTilt: 0, curve: 0.5, open: 0, look: 0.1};

const AlicePrint: React.FC<{t: number; dur: number; uid: string; tile: string}> = ({t, dur, uid, tile}) => {
  const z = 1 + 0.07 * E.sine(clamp(t / dur));
  // C is read at render time (the theme is set after the modules load)
  const pal: SilPal = {...silPal({light: true, hue: null, time: 'day', level: 1}), lit: [C.il5, C.il4, C.il2, C.il0], feature: C.il7, ink: C.ink};
  const look: HeadLook = {fem: true, age: 0, hair: 'bun', hairCol: C.ink, beard: null, glasses: null, hat: null, hatCol: C.ink, earring: 'stud'};
  const cl = -ALICE_EX.curve * 1.5;
  const lips = pathOf([[34.6, 23.6], [35, 25], [33, 28], [34.2, 29.8], [33.4, 32.6], [30.6, 33], [27.6, 30.8 + cl * 0.6], [27.2, 28.8 + cl], [29.8, 26.4]]);
  const g = (n: string) => `${uid}${n}`;
  return (
    <>
      <svg width={PW} height={PH} viewBox={`0 0 ${PW} ${PH}`} style={{position: 'absolute', inset: 0}}>
        <defs>
          {/* the studio: a grey backdrop, a soft light pool behind her head */}
          <linearGradient id={g('ab')} x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0" stopColor={C.il2} />
            <stop offset="1" stopColor={C.il4} />
          </linearGradient>
          <radialGradient id={g('al')} cx="0.5" cy="0.36" r="0.56">
            <stop offset="0" stopColor={C.il0} stopOpacity="0.9" />
            <stop offset="0.5" stopColor={C.il1} stopOpacity="0.4" />
            <stop offset="1" stopColor={C.il1} stopOpacity="0" />
          </radialGradient>
          <linearGradient id={g('av')} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={C.il7} stopOpacity="0" />
            <stop offset="0.6" stopColor={C.il7} stopOpacity="0" />
            <stop offset="1" stopColor={C.il7} stopOpacity="0.3" />
          </linearGradient>
          {/* head space gradients (the light from +x, the face's side) */}
          <linearGradient id={g('coat')} gradientUnits="userSpaceOnUse" x1={70} y1={96} x2={-110} y2={230}>
            <stop offset="0" stopColor={C.il4} />
            <stop offset="0.4" stopColor={C.il5} />
            <stop offset="1" stopColor={C.il7} />
          </linearGradient>
          <linearGradient id={g('lap')} gradientUnits="userSpaceOnUse" x1={40} y1={90} x2={-40} y2={200}>
            <stop offset="0" stopColor={C.il3} />
            <stop offset="1" stopColor={C.il5} />
          </linearGradient>
          <linearGradient id={g('neck')} gradientUnits="userSpaceOnUse" x1={-24} y1={60} x2={14} y2={60}>
            <stop offset="0" stopColor={pal.lit[0]} />
            <stop offset="0.45" stopColor={pal.lit[1]} />
            <stop offset="1" stopColor={pal.lit[2]} />
          </linearGradient>
          <linearGradient id={g('collar')} gradientUnits="userSpaceOnUse" x1={22} y1={54} x2={-30} y2={100}>
            <stop offset="0" stopColor={C.il0} />
            <stop offset="0.6" stopColor={C.il1} />
            <stop offset="1" stopColor={C.il3} />
          </linearGradient>
          <linearGradient id={g('hat')} gradientUnits="userSpaceOnUse" x1={36} y1={-92} x2={-40} y2={-44}>
            <stop offset="0" stopColor={C.il5} />
            <stop offset="1" stopColor={C.il7} />
          </linearGradient>
          <linearGradient id={g('veil')} gradientUnits="userSpaceOnUse" x1={30} y1={-80} x2={-80} y2={80}>
            <stop offset="0" stopColor={C.il0} stopOpacity="0.92" />
            <stop offset="1" stopColor={C.il1} stopOpacity="0.55" />
          </linearGradient>
        </defs>
        <rect width={PW} height={PH} fill={`url(#${g('ab')})`} />
        <rect width={PW} height={PH} fill={`url(#${g('al')})`} />
        <g transform={`translate(${PW / 2} ${PH * 0.42}) scale(${z.toFixed(4)}) translate(${-PW / 2} ${-PH * 0.42})`}>
          <g transform="translate(206 176) scale(-1.5 1.5) rotate(-3)">
            {/* the veil's loose end, flowing back from the hat behind her head and down to the shoulder */}
            <path d="M-34 -58C-58 -52 -74 -30 -78 4C-82 40 -90 74 -104 104C-92 106 -80 100 -70 88C-60 60 -56 30 -50 4C-46 -18 -40 -36 -30 -48Z" fill={`url(#${g('veil')})`} />
            <path d="M-36 -54C-56 -42 -66 -14 -70 20C-72 44 -78 70 -88 94" stroke={C.il0} strokeWidth={1.2} fill="none" opacity={0.8} />
            {/* the duster: a dark coat, its shoulders lit along the top, lapels */}
            <path d="M-26 80C-54 88 -92 98 -110 122C-124 140 -128 176 -130 240L96 240C94 180 90 146 74 124C60 106 36 94 16 86Z" fill={`url(#${g('coat')})`} />
            <path d="M74 124C60 106 36 94 16 86" stroke={C.il3} strokeWidth={2.4} strokeLinecap="round" fill="none" />
            <path d="M-26 80C-54 88 -92 98 -110 122" stroke={C.il4} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
            <path d="M-24 92C-30 120 -26 160 -6 240L8 240C0 180 -2 130 2 100Z" fill={`url(#${g('lap')})`} />
            <path d="M22 92C30 120 34 170 30 240L18 240C20 180 16 130 10 102Z" fill={`url(#${g('lap')})`} />
            <path d="M22 92C30 120 34 170 30 240" stroke={C.il2} strokeWidth={1.4} fill="none" />
            {/* the neck, turned by the light */}
            <path d="M-19.6 25.4C-21 48 -23 62 -24 84L16 88C14 74 11 62 10 47Z" fill={`url(#${g('neck')})`} />
            {/* the high blouse collar: white, pleated, a brooch at the throat */}
            <path d="M-28 100C-30 86 -28 70 -24 58C-8 66 8 68 20 62C24 74 24 88 22 102C4 108 -12 106 -28 100Z" fill={`url(#${g('collar')})`} />
            {[-14, -4, 6, 14].map((x) => (
              <path key={x} d={`M${x} ${64 + Math.abs(x) * 0.1}C${x + 0.6} ${78} ${x + 0.4} ${92} ${x} ${104}`} stroke={C.il2} strokeWidth={1} fill="none" opacity={0.9} />
            ))}
            <path d="M-24 58C-8 66 8 68 20 62" stroke={C.il0} strokeWidth={1.8} strokeLinecap="round" fill="none" />
            <circle cx={12} cy={84} r={5} fill={C.il4} />
            <circle cx={12} cy={84} r={3.2} fill={C.il2} />
            <circle cx={13.2} cy={82.8} r={1.1} fill={C.il0} />
            {/* the head (the kit's), the lips closed in a mid grey */}
            <SilHead view="three" look={look} ex={ALICE_EX} pal={pal} uid={`${uid}h`} tilt={-3} />
            <path d={lips} fill={C.il4} />
            <path d={`M27.6 ${(29.6 + cl * 0.8).toFixed(2)}C30 ${(29.8 + cl * 0.3).toFixed(2)} 32.4 29.6 34.4 29.2`} stroke={C.il5} strokeWidth={0.8} strokeLinecap="round" fill="none" />
            {/* the hat: a low crown with the chiffon wound round it, a wide brim tipped forward, a hairline of sheen */}
            <g transform="rotate(8 -2 -40)">
              <path d="M-40 -42C-43 -66 -28 -88 -2 -88C24 -88 38 -68 36 -44Z" fill={`url(#${g('hat')})`} />
              <ellipse cx={-4} cy={-41} rx={74} ry={12} fill={C.il6} />
              <path d="M-78 -41C-54 -32 44 -31 70 -41" stroke={C.il4} strokeWidth={1.6} fill="none" />
              <path d="M-41.6 -46C-30 -58 26 -60 36.4 -48L37 -56C24 -70 -26 -70 -42.4 -56Z" fill={`url(#${g('veil')})`} />
              <path d="M-40 -54C-24 -66 22 -66 36 -54" stroke={C.il0} strokeWidth={1.2} fill="none" opacity={0.9} />
              <path d="M28 -78C32 -70 34 -64 35 -60" stroke={C.il4} strokeWidth={2} strokeLinecap="round" fill="none" opacity={0.8} />
            </g>
          </g>
        </g>
        <rect width={PW} height={PH} fill={`url(#${g('av')})`} />
      </svg>
      <Grain amount={0.45} tile={tile} seed={7} />
    </>
  );
};

// ---- the old English phone (the forest's foreign navigator, its screen readable: the arrow and TURN RIGHT) ----------------
const OldPhone: React.FC<{uid: string}> = ({uid}) => (
  <g>
    <defs>
      <clipPath id={`${uid}ps`}>
        <rect x={-121} y={-251} width={242} height={502} rx={30} />
      </clipPath>
    </defs>
    <rect x={-130} y={-260} width={260} height={520} rx={40} fill={C.ilGlass} stroke={C.il5} strokeWidth={3} />
    <g clipPath={`url(#${uid}ps)`}>
      <rect x={-121} y={-251} width={242} height={502} fill={C.il7} />
      {[-150, -30, 70, 170].map((y, i) => (
        <path key={i} d={`M-130 ${y + 30}L130 ${y - 20 + i * 6}`} stroke={C.il6} strokeWidth={12 + (i % 2) * 6} />
      ))}
      {[-70, 40].map((x, i) => (
        <path key={`v${i}`} d={`M${x} -260L${x + 16} 260`} stroke={C.il6} strokeWidth={10} />
      ))}
      <path d="M-10 260C-6 190 22 150 16 100C10 64 -8 54 -4 30" stroke={C.il3} strokeWidth={10} fill="none" strokeLinecap="round" />
      <circle cx={-2} cy={160} r={13} fill={C.il0} />
      <circle cx={-2} cy={160} r={6} fill={C.il5} />
    </g>
    <rect x={-34} y={-246} width={68} height={18} rx={9} fill={C.ilGlass} />
    {/* the instruction card */}
    <rect x={-106} y={-212} width={212} height={252} rx={28} fill={rgba(C.ilNight, 0.94)} />
    <g transform="translate(-48 -206) scale(0.84)">
      <path d={ARROW_R} fill={C.il0} />
    </g>
    <text x={0} y={-60} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={44} letterSpacing={3} fill={C.il0}>
      TURN
    </text>
    <text x={0} y={-10} textAnchor="middle" fontFamily={F.mono} fontWeight={700} fontSize={44} letterSpacing={3} fill={C.il0}>
      RIGHT
    </text>
    {/* a hairline of glass light down the left edge */}
    <path d="M-118 -200V200" stroke={C.il4} strokeWidth={3} strokeLinecap="round" opacity={0.5} />
  </g>
);

// ---- the bin (a pedal bin, flat planes of the illustration greys, one soft light from the top left) -----------------------
const binBody = (x: number, top: number, base: number) =>
  `M${x - 92} ${top}A92 15 0 0 0 ${x + 92} ${top}L${x + 79} ${base - 12}Q${x + 78} ${base} ${x + 66} ${base}L${x - 66} ${base}Q${x - 78} ${base} ${x - 79} ${base - 12}Z`;

// ---- the shot --------------------------------------------------------------------------------------------------------------
export const Voices: React.FC = () => {
  const t = useCurrentFrame();
  const uid = useId().replace(/[^A-Za-z0-9]/g, '');
  const tile = useGrainTile();
  const base = fr(shot('voices').from);
  const L = (name: string, plus = 0) => fr(ev(name) + plus) - base;
  const dur = fr(shot('voices').to) - base;
  const nel = L('nelsonIntro');
  const ali = L('aliceIntro');
  const stk = L('sticker');
  const bin = L('bin');
  const latch = L('bin', 0.42); // the lid's latch sound

  // the prints: Nelson's lands on the paper sound; Alice's is dealt onto the pile as her voice begins, once the camera has
  // drifted over (so it lands whole, inside the frame); the speaking one lifts
  const dealN = sp(t, -3, 150, 17);
  const dealA = sp(t, ali - 3, 160, 17);
  const onN = sp(t, nel - 1, 170, 20) * (1 - sp(t, ali - 4, 170, 20));
  const onA = sp(t, ali + 4, 170, 20);

  // the camera: tight on Nelson, a slow push to his face; a drift and ease-out to the pair as his line ends; a lean toward
  // Alice; the pull-back and tilt down to the jokes; small kicks on the sticker's slap and on the latch
  let cam = mixCam(K0, K1, E.sine(prog(t, 0, ali - 3)));
  cam = mixCam(cam, K2, E.inOut(prog(t, ali - 15, 16)));
  cam = mixCam(cam, K2b, E.sine(prog(t, ali + 1, 10)));
  cam = mixCam(cam, K3, E.inOut(prog(t, ali + 9, 18)));
  const kickS = t >= stk ? 0.016 * (1 - E.out(prog(t, stk, 9))) : 0;
  const kickL = t >= latch ? 0.008 * (1 - E.out(prog(t, latch, 8))) : 0;
  const cz = cam.z * (1 + kickS + kickL);

  // the bin: set down once the camera has pulled back far enough to hold it whole
  const binDrop = ali + 22;
  const binIn = sp(t, binDrop, 220, 17);
  const binShake = shake(t, latch, 5, 9, 2);
  // its lid (hinged on the right, away from the throw): opens for the throw, shuts once the phone has sunk, latches
  const open = sp(t, bin - 5, 240, 16);
  const shut = sp(t, latch - 3, 700, 26);
  const lid = 92 * open * clamp(1 - shut, -0.03, 1);

  // the old phone: pops out from behind the sticker, stands up (TURN RIGHT readable), is lobbed into the bin
  const popAt = stk + 8;
  const pop = sp(t, popAt, 240, 15);
  const flyDur = latch - 6 - bin; // it reaches the mouth, sinks in 3 frames, then the lid shuts and latches on the sound
  const P0: [number, number] = [HOLD.x, HOLD.y];
  const P1: [number, number] = [640, 990]; // a low lob: the phone stays under Alice's print and over the rim
  const P2: [number, number] = [BIN.x - 4, BIN.top - 88];
  const bez = (u: number): [number, number] => [
    (1 - u) ** 2 * P0[0] + 2 * (1 - u) * u * P1[0] + u * u * P2[0],
    (1 - u) ** 2 * P0[1] + 2 * (1 - u) * u * P1[1] + u * u * P2[1],
  ];
  const fu = prog(t, bin, flyDur);
  const sink = E.in2(prog(t, bin + flyDur, 3));
  const windup = E.sine(prog(t, bin - 3, 3)) * (1 - fu);
  const phone = (() => {
    if (t < popAt || t > latch + 1) return null;
    if (t < bin) {
      const x = lerp(STK.x + 30, HOLD.x, pop);
      const y = lerp(STK.y + 10, HOLD.y, pop) + 6 * windup;
      const r = lerp(-24, -3, pop) + Math.sin((t - popAt) / 2.6) * 1.2 * clamp(pop) - 5 * windup;
      return {x, y, r, s: PS * lerp(0.62, 1, pop), behind: true};
    }
    const p = bez(fu);
    return {x: p[0], y: p[1] + 240 * sink, r: lerp(-8, 2, fu) - 12 * Math.sin(Math.PI * fu), s: PS * lerp(1, 0.62, E.out2(fu)), behind: false};
  })();
  const phoneEl = phone ? (
    <g transform={`translate(${phone.x.toFixed(1)} ${phone.y.toFixed(1)}) rotate(${phone.r.toFixed(2)}) scale(${phone.s.toFixed(4)})`}>
      <OldPhone uid={uid} />
    </g>
  ) : null;

  // the sticker
  const st = sp(t, stk, 320, 16);
  const stS = 1.5 - 0.5 * st;
  const stR = lerp(-26, -8, st);

  // the paper's pool of light drifts at half the camera's speed (a little depth)
  const poolX = 540 + (540 - cam.x) * cam.z * 0.5;
  const poolY = 700 + (640 - cam.y) * cam.z * 0.5;
  // the last frames: the paper whitens toward the next shot's white field
  const endK = E.sine(prog(t, dur - 9, 8));

  return (
    <div style={{position: 'absolute', inset: 0, background: C.bg, overflow: 'hidden'}}>
      <div style={{position: 'absolute', inset: 0, background: `radial-gradient(ellipse 74% 44% at ${poolX.toFixed(1)}px ${poolY.toFixed(1)}px, ${C.surface} 0%, ${rgba(C.surface, 0)} 100%)`}} />
      {endK > 0 ? <div style={{position: 'absolute', inset: 0, background: C.surface, opacity: endK}} /> : null}
      <div
        style={{
          position: 'absolute',
          left: 0,
          top: 0,
          width: 1080,
          height: 1920,
          transformOrigin: '0 0',
          transform: `translate(${ANCHOR.x}px, ${ANCHOR.y}px) rotate(${cam.r.toFixed(3)}deg) scale(${cz.toFixed(4)}) translate(${(-cam.x).toFixed(2)}px, ${(-cam.y).toFixed(2)}px)`,
        }}
      >
        <Card rest={NEL} deal={dealN} from={[-6, -50, -7]} on={onN} dim={onA} t={t} phase={0} year="1903" name="ნელსონ ჯექსონი" z={2}>
          <NelsonPrint t={t} dur={dur} uid={`${uid}n`} tile={tile} />
        </Card>
        <Card rest={ALI} deal={dealA} from={[-24, -60, 7]} on={onA} dim={0} t={t} phase={19} year="1909" name="ალისა რამზი" z={3}>
          <AlicePrint t={t} dur={dur} uid={`${uid}a`} tile={tile} />
        </Card>
        <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0, zIndex: 5, overflow: 'visible'}}>
          <DefsSvg uid={uid} />
          <defs>
            <linearGradient id={`${uid}bb`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={C.il2} />
              <stop offset="0.2" stopColor={C.il0} />
              <stop offset="0.48" stopColor={C.il1} />
              <stop offset="0.85" stopColor={C.il3} />
              <stop offset="1" stopColor={C.il4} />
            </linearGradient>
            <linearGradient id={`${uid}bl`} x1="0" y1="0" x2="1" y2="0.4">
              <stop offset="0" stopColor={C.il0} />
              <stop offset="0.5" stopColor={C.il1} />
              <stop offset="1" stopColor={C.il3} />
            </linearGradient>
            <linearGradient id={`${uid}bp`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0" stopColor={C.il3} />
              <stop offset="1" stopColor={C.il5} />
            </linearGradient>
            <radialGradient id={`${uid}sh`}>
              <stop offset="0" stopColor={C.shade} stopOpacity="0.2" />
              <stop offset="1" stopColor={C.shade} stopOpacity="0" />
            </radialGradient>
            <radialGradient id={`${uid}sk`} cx="0.38" cy="0.32" r="0.75">
              <stop offset="0" stopColor={C.il0} />
              <stop offset="1" stopColor={C.il2} />
            </radialGradient>
            <filter id={`${uid}blur`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={lerp(20, 7, clamp(st))} />
            </filter>
            <filter id={`${uid}pblur`} x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation={9} />
            </filter>
            <clipPath id={`${uid}stk`}>
              <circle cx={STK.x} cy={STK.y} r={STK.r} />
            </clipPath>
            {/* the bin's mouth: everything over the rim, and its inside (the phone never shows under the bin) */}
            <clipPath id={`${uid}mouth`}>
              <rect x={BIN.x - 400} y={BIN.top - 900} width={800} height={900} />
              <rect x={BIN.x - 1000} y={BIN.top - 10} width={1000 - 96} height={900} />
              <path d={binBody(BIN.x, BIN.top, BIN.base)} />
            </clipPath>
          </defs>

          {/* the bin: its shadow, the opening, the old phone going in, the body, the lid */}
          {t >= binDrop ? (
            <g transform={`translate(${binShake.toFixed(2)} ${(-60 * (1 - binIn)).toFixed(1)})`} opacity={clamp(binIn * 3)}>
              <ellipse cx={BIN.x + 8} cy={BIN.base + 2} rx={118 * lerp(0.8, 1, binIn)} ry={14} fill={`url(#${uid}sh)`} />
              <ellipse cx={BIN.x} cy={BIN.top} rx={94} ry={16} fill={C.il3} />
              <ellipse cx={BIN.x} cy={BIN.top + 1} rx={85} ry={12} fill={C.il6} />
              {phone && !phone.behind ? fu >= 0.85 ? <g clipPath={`url(#${uid}mouth)`}>{phoneEl}</g> : phoneEl : null}
              <path d={binBody(BIN.x, BIN.top, BIN.base)} fill={`url(#${uid}bb)`} />
              <path d={`M${BIN.x - 92} ${BIN.top}A92 15 0 0 0 ${BIN.x + 92} ${BIN.top}`} stroke={C.il3} strokeWidth={3} fill="none" />
              <rect x={BIN.x - 80} y={BIN.base - 26} width={160} height={26} rx={9} fill={`url(#${uid}bp)`} />
              <rect x={BIN.x - 28} y={BIN.base - 14 + 4 * open * (1 - shut)} width={56} height={14} rx={5} fill={C.il6} />
              <path d={`M${BIN.x - 58} ${BIN.top + 30}Q${BIN.x - 62} ${BIN.base - 90} ${BIN.x - 56} ${BIN.base - 40}`} stroke={C.il0} strokeWidth={6} strokeLinecap="round" fill="none" opacity={0.7} />
              <g transform={`rotate(${lid.toFixed(2)} ${BIN.x + 95} ${BIN.top})`}>
                <path d={`M${BIN.x - 96} ${BIN.top}C${BIN.x - 94} ${BIN.top - 40} ${BIN.x + 94} ${BIN.top - 40} ${BIN.x + 96} ${BIN.top}A96 16 0 0 1 ${BIN.x - 96} ${BIN.top}Z`} fill={`url(#${uid}bl)`} />
                <path d={`M${BIN.x - 96} ${BIN.top}A96 16 0 0 0 ${BIN.x + 96} ${BIN.top}`} stroke={C.il3} strokeWidth={4} fill="none" />
                <path d={`M${BIN.x - 60} ${BIN.top - 22}Q${BIN.x - 10} ${BIN.top - 34} ${BIN.x + 40} ${BIN.top - 27}`} stroke={C.il0} strokeWidth={5} strokeLinecap="round" fill="none" opacity={0.9} />
              </g>
            </g>
          ) : null}

          {/* the old phone, standing up beside the sticker (it came out from behind it) */}
          {phone && phone.behind ? (
            <g>
              <ellipse cx={phone.x + 10} cy={HOLD.y + 128} rx={62 * pop} ry={10} fill={rgba(C.shade, 0.16)} filter={`url(#${uid}pblur)`} />
              {phoneEl}
            </g>
          ) : null}

          {/* the sticker: the lost man, happy at last, slapped onto the paper */}
          {t >= stk ? (
            <g>
              <circle cx={STK.x + lerp(20, 5, clamp(st))} cy={STK.y + lerp(38, 8, clamp(st))} r={(STK.r + 13) * stS} fill={rgba(C.shade, lerp(0.1, 0.22, clamp(st)))} filter={`url(#${uid}blur)`} />
              <g transform={`translate(${STK.x} ${STK.y}) rotate(${stR.toFixed(2)}) scale(${stS.toFixed(4)}) translate(${-STK.x} ${-STK.y})`} opacity={clamp((t - stk + 1) / 2)}>
                <circle cx={STK.x} cy={STK.y} r={STK.r + 13} fill={C.surface} />
                <circle cx={STK.x} cy={STK.y} r={STK.r} fill={`url(#${uid}sk)`} />
                <g clipPath={`url(#${uid}stk)`}>
                  <SilPalCtx.Provider value={greyPal}>
                    <Figure uid={uid} cast={STICKER_MAN} x={STK.x - 24} y={STK.y} size={860} crop="head" frame={t} time="day" face="smile" turn={0.3} />
                  </SilPalCtx.Provider>
                </g>
                <path d={`M${STK.x - 92} ${STK.y - 40}A100 100 0 0 1 ${STK.x - 30} ${STK.y - 96}`} stroke={C.il0} strokeWidth={7} strokeLinecap="round" fill="none" opacity={0.55} />
              </g>
            </g>
          ) : null}
        </svg>
      </div>
    </div>
  );
};
