// Her room in the evening (act 1, the push at home and the calm at the end), v4: a warm wall lit by a sconce behind her and
// a globe lamp on the vanity, with a crown moulding, wainscot panels, a framed print, a long linen curtain at the window's
// edge and a tall plant in its shade; a tall arched mirror in a slim brass frame; a walnut vanity with its drawers, two
// perfume bottles, a brass ring dish, a bud vase with one stem, her phone lying on the wood. She stands in profile facing
// the mirror (kit/woman.tsx, lit by the lamp's warm hue), and the mirror answers with her reflection: the SAME pose,
// mirrored (the owner: the reflection must match her exactly). The lamp breathes a soft bloom and two faint rays.
// Everything is SVG in frame px (1080 x 1920), frame-driven, no randomness.
import React from 'react';
import type {SilPal} from './sil/sil';
import {silPal, SilPalCtx} from './sil/sil';
import type {Time} from '../../scenes/illo/palette';
import {clamp, E, lerp} from '../lib';
import {Woman, womanPal, type WPose} from './woman';

export const WARM_HUE = '#EBA468';
export const warmPal = (level = 1) => (time: Time, lv: number): SilPal => silPal({light: false, hue: WARM_HUE, b: '#8A6A55', time, level: lv * level});

// the room's geometry
export const MX0 = 585;
export const MX1 = 1005;
export const MTOP = 420;
export const MR = (MX1 - MX0) / 2;
export const MB = 1186;
export const VTOP = 1180;
export const HER_X = 318;
/** her reflection: near the glass's left edge (she stands to its left), the same pose mirrored */
export const REFL_X = 712;
export const HER_Y = 1652;
export const HER_SIZE = 1330;
export const PHONE_AT = {x: 742, y: 1176};
export const LAMP = {x: 955, y: 1078};

const glassD = `M${MX0} ${MB}V${MTOP + MR}A${MR} ${MR} 0 0 1 ${MX1} ${MTOP + MR}V${MB}Z`;

export type RoomP = {
  uid: string;
  frame: number;
  pose: WPose;
  ring?: number; // 0..1 the phone's screen light
  buzz?: number; // px of the phone's jitter
  faceDown?: boolean;
  calm?: number; // 0..1 the calm ending: the light a little warmer and softer
  wave?: number; // 0..1 a voice playing from the phone (rings off its speaker)
};

export const Room: React.FC<RoomP> = ({uid, frame, pose, ring = 0, buzz = 0, faceDown = false, calm = 0, wave = 0}) => {
  const id = (n: string) => `${uid}-${n}`;
  const lampA = 0.42 + 0.08 * calm + 0.015 * Math.sin(frame / 23);
  const pal = womanPal(1.04 + 0.08 * calm);
  const palR = womanPal(0.86 + 0.06 * calm);
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#241B19" />
          <stop offset="0.55" stopColor="#3A2C27" />
          <stop offset="1" stopColor="#2C211D" />
        </linearGradient>
        <radialGradient id={id('sconce')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#F4BA7A" stopOpacity={0.5} />
          <stop offset="0.35" stopColor="#E59A5A" stopOpacity={0.2} />
          <stop offset="1" stopColor="#E59A5A" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('lampglow')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity={lampA + 0.2} />
          <stop offset="0.3" stopColor="#F2A860" stopOpacity={lampA * 0.55} />
          <stop offset="1" stopColor="#F2A860" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={id('globe')} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0" stopColor="#FFF6E4" />
          <stop offset="0.55" stopColor="#FFD08A" />
          <stop offset="1" stopColor="#E59A4E" />
        </radialGradient>
        <linearGradient id={id('brass')} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#E6C88E" />
          <stop offset="0.5" stopColor="#A7804A" />
          <stop offset="1" stopColor="#6E5230" />
        </linearGradient>
        <linearGradient id={id('glass')} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stopColor="#4B3E3A" />
          <stop offset="1" stopColor="#30302F" />
        </linearGradient>
        <linearGradient id={id('wood')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#9A6B47" />
          <stop offset="1" stopColor="#6A452E" />
        </linearGradient>
        <linearGradient id={id('cab')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3E2A20" />
          <stop offset="0.7" stopColor="#4F3627" />
          <stop offset="1" stopColor="#5A3D2C" />
        </linearGradient>
        <linearGradient id={id('floor')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2A1E19" />
          <stop offset="1" stopColor="#140E0C" />
        </linearGradient>
        <linearGradient id={id('curtain')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#5E4A3E" />
          <stop offset="0.35" stopColor="#7C6454" />
          <stop offset="0.6" stopColor="#5A463A" />
          <stop offset="1" stopColor="#3A2C25" />
        </linearGradient>
        <radialGradient id={id('screen')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#CFE0FF" stopOpacity={0.75} />
          <stop offset="0.4" stopColor="#9FB8F0" stopOpacity={0.22} />
          <stop offset="1" stopColor="#9FB8F0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('mfade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34302F" stopOpacity={0} />
          <stop offset="0.55" stopColor="#34302F" stopOpacity={0.7} />
          <stop offset="1" stopColor="#34302F" stopOpacity={0.9} />
        </linearGradient>
        <linearGradient id={id('ray')} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#FFD9A0" stopOpacity={0} />
          <stop offset="0.5" stopColor="#FFD9A0" stopOpacity={0.07} />
          <stop offset="1" stopColor="#FFD9A0" stopOpacity={0} />
        </linearGradient>
        <filter id={id('blur')} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation={10} />
        </filter>
        <clipPath id={id('mclip')}>
          <path d={glassD} />
        </clipPath>
      </defs>
      {/* the wall, the crown moulding, the sconce behind her, the lamp's pool */}
      <rect width={1080} height={1920} fill={`url(#${id('wall')})`} />
      <rect x={0} y={150} width={1080} height={26} fill="#2A1F1B" />
      <rect x={0} y={176} width={1080} height={4} fill="#5A4436" opacity={0.6} />
      <rect x={0} y={190} width={1080} height={3} fill="#4A372B" opacity={0.5} />
      {/* faint wallpaper stripes */}
      {Array.from({length: 18}, (_, i) => (
        <rect key={i} x={i * 62 + 10} y={196} width={2} height={1050} fill="#4A3830" opacity={0.25} />
      ))}
      <ellipse cx={200} cy={560} rx={620} ry={700} fill={`url(#${id('sconce')})`} />
      <ellipse cx={LAMP.x} cy={LAMP.y} rx={720} ry={720} fill={`url(#${id('lampglow')})`} />
      {/* the window's edge at the far left: a long linen curtain, its folds catching the sconce */}
      <path d="M-20 140H74C70 520 86 980 66 1660H-20Z" fill={`url(#${id('curtain')})`} />
      {[14, 38, 58].map((x, i) => (
        <path key={i} d={`M${x} 160C${x + 6} 600 ${x - 4} 1100 ${x + 3} 1650`} stroke={i === 1 ? '#9C8270' : '#2E231D'} strokeWidth={i === 1 ? 4 : 3} fill="none" opacity={0.5} />
      ))}
      {/* a framed print: a soft abstract in the warm light */}
      <g transform="translate(142 300)">
        <rect x={-6} y={-6} width={232} height={292} fill="#1A1310" />
        <rect x={0} y={0} width={220} height={280} fill="#D9C7B0" opacity={0.85} />
        <rect x={14} y={14} width={192} height={252} fill="#CDB89E" />
        <circle cx={92} cy={118} r={52} fill="#B5643E" opacity={0.75} />
        <path d="M30 230C70 180 120 210 190 160V252H30Z" fill="#5C4232" opacity={0.75} />
        <rect x={0} y={0} width={220} height={280} fill="#000" opacity={0.18} />
      </g>
      {/* the sconce: a brass plate and a frosted shade */}
      <rect x={96} y={620} width={22} height={120} rx={8} fill={`url(#${id('brass')})`} />
      <path d="M118 648Q160 648 168 620L176 700Q160 720 118 712Z" fill="#F7DDB5" opacity={0.95} />
      {/* a tall plant in the corner's shade, under the print */}
      <g opacity={0.92} transform="translate(-372 0)">
        <path d="M470 1640L452 1500H560L542 1640Z" fill="#1E1714" />
        <path d="M452 1500H560" stroke="#6A4E3C" strokeWidth={3} opacity={0.6} />
        {[
          [500, 1500, 430, 1080, 380, 1110],
          [505, 1500, 560, 1020, 610, 1060],
          [500, 1500, 470, 930, 520, 950],
          [510, 1500, 610, 1240, 650, 1270],
          [495, 1500, 400, 1300, 380, 1350],
        ].map(([x0, y0, x1, y1, x2, y2], i) => (
          <path key={i} d={`M${x0} ${y0}Q${(x0 + x1) / 2} ${(y0 + y1) / 2 - 20} ${x1} ${y1}Q${(x1 + x2) / 2 + 30} ${(y1 + y2) / 2 + 40} ${x2} ${y2}Q${(x0 + x2) / 2 + 10} ${(y0 + y2) / 2} ${x0} ${y0}Z`} fill={i % 2 ? '#2A211B' : '#33281F'} />
        ))}
      </g>
      {/* the wainscot and the floor */}
      <rect x={0} y={1250} width={1080} height={390} fill="#2E221C" />
      <rect x={0} y={1244} width={1080} height={10} fill="#4A372B" />
      <rect x={0} y={1244} width={1080} height={2} fill="#7A5A44" opacity={0.6} />
      {[
        [36, 470],
        [500, 1050],
      ].map(([a, b]) => (
        <rect key={a} x={a} y={1290} width={b - a} height={300} rx={4} fill="none" stroke="#231914" strokeWidth={4} />
      ))}
      <rect x={0} y={1640} width={1080} height={280} fill={`url(#${id('floor')})`} />
      <rect x={0} y={1640} width={1080} height={3} fill="#5A4234" opacity={0.6} />
      {/* a rug's edge under her */}
      <path d="M-20 1700L1100 1690V1760L-20 1772Z" fill="#3C2A22" opacity={0.7} />
      <path d="M-20 1700L1100 1690" stroke="#8A6A55" strokeWidth={3} opacity={0.35} />
      {/* the mirror: its glass and what it shows (the room, cooler; the lamp; her, the same pose mirrored) */}
      <g clipPath={`url(#${id('mclip')})`}>
        <rect x={MX0} y={MTOP} width={MX1 - MX0} height={MB - MTOP} fill={`url(#${id('glass')})`} />
        <ellipse cx={1030} cy={620} rx={420} ry={520} fill={`url(#${id('sconce')})`} opacity={0.55} />
        <ellipse cx={LAMP.x - 40} cy={LAMP.y} rx={380} ry={380} fill={`url(#${id('lampglow')})`} opacity={0.6} />
        {/* the room behind her in the glass: the print's frame, a dim door */}
        <rect x={880} y={560} width={120} height={160} fill="#1E1714" opacity={0.6} />
        <rect x={900} y={830} width={110} height={420} fill="#241B18" opacity={0.6} />
        <g opacity={0.86}>
          <Woman uid={`${uid}r`} x={REFL_X} y={HER_Y + 12} size={HER_SIZE * 0.93} pose={pose} pal={palR} flip rim={0.5} />
        </g>
        <rect x={MX0} y={860} width={MX1 - MX0} height={MB - 860} fill={`url(#${id('mfade')})`} />
        <rect x={MX0} y={MTOP} width={MX1 - MX0} height={MB - MTOP} fill="#9FB6C8" opacity={0.06} />
        {/* the glass's sheen */}
        <path d={`M${MX0 + 40} ${MTOP + 520}L${MX0 + 250} ${MTOP + 90}L${MX0 + 320} ${MTOP + 90}L${MX0 + 110} ${MTOP + 520}Z`} fill="#FFFFFF" opacity={0.05} />
        <path d={`M${MX0 + 150} ${MTOP + 700}L${MX0 + 380} ${MTOP + 230}L${MX0 + 410} ${MTOP + 230}L${MX0 + 180} ${MTOP + 700}Z`} fill="#FFFFFF" opacity={0.035} />
        {ring > 0.01 ? <ellipse cx={PHONE_AT.x} cy={MB - 10} rx={260} ry={200} fill={`url(#${id('screen')})`} opacity={0.55 * ring} /> : null}
      </g>
      <path d={glassD} fill="none" stroke={`url(#${id('brass')})`} strokeWidth={14} />
      <path d={glassD} fill="none" stroke="#FFE2B0" strokeWidth={2} opacity={0.35} transform="translate(-3 -3)" />
      {/* her */}
      <Woman uid={uid} x={HER_X} y={HER_Y} size={HER_SIZE} pose={pose} pal={pal} />
      {/* the vanity */}
      <rect x={520} y={VTOP + 32} width={600} height={400} fill={`url(#${id('cab')})`} />
      {[
        [556, 790],
        [814, 1060],
      ].map(([a, b]) => (
        <g key={a}>
          <rect x={a} y={1240} width={b - a} height={150} rx={6} fill="#5A3E2D" stroke="#2E1F16" strokeWidth={3} />
          <rect x={a + 4} y={1244} width={b - a - 8} height={3} fill="#C99A72" opacity={0.25} />
          <rect x={(a + b) / 2 - 42} y={1306} width={84} height={10} rx={5} fill={`url(#${id('brass')})`} />
        </g>
      ))}
      <path d={`M548 ${VTOP + 430}L560 1648H576L586 ${VTOP + 430}Z`} fill="#3A271D" />
      <rect x={510} y={VTOP} width={610} height={34} rx={6} fill={`url(#${id('wood')})`} />
      <rect x={510} y={VTOP} width={610} height={3} rx={1.5} fill="#E2B88E" opacity={0.7} />
      <rect x={510} y={VTOP + 30} width={610} height={4} fill="#2A1A12" opacity={0.6} />
      {/* a bud vase with one stem */}
      <g transform="translate(612 1108)">
        <path d="M-10 72Q-18 40 -8 18L-6 0H6L8 18Q18 40 10 72Z" fill="#E9D7C2" opacity={0.3} />
        <path d="M0 4C-4 -40 6 -90 -6 -140" stroke="#5E6A4A" strokeWidth={3} fill="none" />
        <path d="M-6 -140C-26 -150 -24 -176 -6 -178C10 -176 12 -152 -6 -140Z" fill="#C9705A" />
        <path d="M-2 -70C10 -80 22 -78 26 -70C18 -64 8 -64 -2 -70Z" fill="#5E6A4A" />
      </g>
      {/* the perfumes */}
      {[
        {x: 850, w: 52, h: 72, cap: 20},
        {x: 902, w: 34, h: 96, cap: 14},
      ].map((b, i) => (
        <g key={i} transform={`translate(${b.x} ${VTOP - b.h - 8})`}>
          <rect x={-b.w / 2} y={8} width={b.w} height={b.h} rx={10} fill="#E9D7C2" opacity={0.28} />
          <rect x={-b.w / 2} y={8} width={b.w} height={b.h} rx={10} fill="none" stroke="#F5E6D2" strokeWidth={2} opacity={0.5} />
          <rect x={-b.w / 2 + 8} y={b.h * 0.45} width={b.w - 16} height={b.h * 0.5} rx={6} fill="#E8A060" opacity={0.35} />
          <rect x={-b.cap / 2} y={-10} width={b.cap} height={20} rx={4} fill={`url(#${id('brass')})`} />
          <rect x={-b.w / 2 + 6} y={12} width={6} height={b.h - 10} rx={3} fill="#FFFFFF" opacity={0.35} />
        </g>
      ))}
      {/* a brass ring dish */}
      <g transform={`translate(668 ${VTOP - 4})`}>
        <ellipse cx={0} cy={0} rx={44} ry={9} fill={`url(#${id('brass')})`} />
        <ellipse cx={0} cy={-2} rx={34} ry={6} fill="#6E5230" />
        <circle cx={-8} cy={-6} r={6} fill="none" stroke="#F1D8A4" strokeWidth={2.4} />
      </g>
      {/* the lamp, its bloom and two faint rays */}
      <g>
        <path d={`M${LAMP.x - 30} ${LAMP.y - 60}L${LAMP.x - 420} ${LAMP.y - 520}L${LAMP.x - 300} ${LAMP.y - 560}Z`} fill={`url(#${id('ray')})`} opacity={0.8 + 0.2 * calm} />
        <path d={`M${LAMP.x - 50} ${LAMP.y - 20}L${LAMP.x - 520} ${LAMP.y - 240}L${LAMP.x - 470} ${LAMP.y - 330}Z`} fill={`url(#${id('ray')})`} opacity={0.6 + 0.2 * calm} />
        <ellipse cx={LAMP.x} cy={VTOP + 2} rx={52} ry={8} fill="#000" opacity={0.35} />
        <path d={`M${LAMP.x - 34} ${VTOP}L${LAMP.x - 22} ${LAMP.y + 50}H${LAMP.x + 22}L${LAMP.x + 34} ${VTOP}Z`} fill={`url(#${id('brass')})`} />
        <circle cx={LAMP.x} cy={LAMP.y} r={110} fill="#FFD9A0" opacity={0.18} filter={`url(#${id('blur')})`} />
        <circle cx={LAMP.x} cy={LAMP.y} r={74} fill={`url(#${id('globe')})`} />
      </g>
      {/* the phone on the wood: lying flat, seen from a little above */}
      <g transform={`translate(${(PHONE_AT.x + buzz).toFixed(2)} ${PHONE_AT.y}) rotate(${(-2 + buzz * 0.3).toFixed(2)})`}>
        {ring > 0.01 ? <ellipse cx={0} cy={-30} rx={240} ry={120} fill={`url(#${id('screen')})`} opacity={ring} /> : null}
        {wave > 0.01
          ? [0, 1, 2].map((n) => {
              const ph = ((frame / 14 + n / 3) % 1 + 1) % 1;
              return <ellipse key={n} cx={0} cy={-14} rx={70 + 120 * ph} ry={18 + 34 * ph} fill="none" stroke="#DCE6FF" strokeWidth={3} opacity={wave * 0.5 * (1 - ph)} />;
            })
          : null}
        <ellipse cx={4} cy={6} rx={88} ry={8} fill="#000" opacity={0.45} />
        <path d="M-80 -2L80 -2L84 4L-76 4Z" fill="#6A6A72" />
        <path d="M-80 -2L80 -2L60 -26L-64 -26Z" fill={faceDown ? '#24242A' : ring > 0.01 ? '#AFC4F2' : '#141418'} />
        {!faceDown && ring > 0.01 ? <path d="M-74 -4L74 -4L56 -24L-58 -24Z" fill="#DCE6FF" opacity={0.7 * ring} /> : null}
        {faceDown ? (
          <g>
            <path d="M-56 -20L-30 -20L-33 -9L-61 -9Z" fill="#141418" />
            <circle cx={-51} cy={-15} r={3.6} fill="#2E2E36" stroke="#55555E" strokeWidth={1} />
            <circle cx={-40} cy={-15} r={3.6} fill="#2E2E36" stroke="#55555E" strokeWidth={1} />
            <path d="M-80 -2L80 -2L60 -26L-64 -26Z" fill="none" stroke="#5A5A64" strokeWidth={1.2} opacity={0.8} />
          </g>
        ) : (
          <path d="M-80 -2L80 -2L60 -26L-64 -26Z" fill="none" stroke="#4A4A52" strokeWidth={1.4} />
        )}
      </g>
    </svg>
  );
};

/** her light, the warm lamp's: put round anything that draws the kit's figures */
export const WarmLight: React.FC<{children: React.ReactNode; level?: number}> = ({children, level = 1}) => <SilPalCtx.Provider value={warmPal(level)}>{children}</SilPalCtx.Provider>;

/** a camera on an SVG/HTML stage: scale s about (fx, fy) */
export const cam = (s: number, fx: number, fy: number, dx = 0, dy = 0) => `translate(${(fx + dx).toFixed(2)}px, ${(fy + dy).toFixed(2)}px) scale(${s.toFixed(4)}) translate(${(-fx).toFixed(2)}px, ${(-fy).toFixed(2)}px)`;

export const easeIn = (t: number, a: number, d: number) => E.inOut(clamp((t - a) / d));
export const mixN = lerp;
