// Her room in the evening (act 1 and the calm at the end): a warm wall lit by a sconce behind her and a globe lamp on the
// vanity, a tall arched mirror in a slim brass frame, a walnut vanity, a perfume bottle, her phone lying on the wood. She
// stands in profile facing the mirror ("Silhouette light", lit by the warm lamp's hue), and the mirror answers with her
// reflection. Everything is SVG in frame px (1080 x 1920), frame-driven, no randomness.
import React from 'react';
import type {Act} from '../../scenes/illo/acting';
import type {Pose} from '../../scenes/illo/poses';
import type {Face} from '../../scenes/illo/faces';
import {silPal, SilPalCtx, type SilPal} from './sil/sil';
import type {Time} from '../../scenes/illo/palette';
import {clamp, E, lerp} from '../lib';
import {FILM, Her, HER_CAST} from './her';

export const HER = HER_CAST;
export {FILM};
export const WARM_HUE = '#EBA468';
export const warmPal = (level = 1) => (time: Time, lv: number): SilPal => silPal({light: false, hue: WARM_HUE, b: '#8A6A55', time, level: lv * level});

// the room's geometry
export const MX0 = 585;
export const MX1 = 1005;
export const MTOP = 420;
export const MR = (MX1 - MX0) / 2;
export const MB = 1186;
export const VTOP = 1180;
export const HER_X = 330;
/** her reflection: near the glass's left edge (she stands to its left), not in its middle */
export const REFL_X = 700;
export const HER_Y = 1652;
export const HER_SIZE = 1320;
export const PHONE_AT = {x: 742, y: 1176};
export const LAMP = {x: 955, y: 1078};

const glassD = `M${MX0} ${MB}V${MTOP + MR}A${MR} ${MR} 0 0 1 ${MX1} ${MTOP + MR}V${MB}Z`;

export type RoomP = {
  uid: string;
  frame: number;
  pose?: Pose;
  face?: Face;
  acts?: Act[];
  lean?: number; // degrees, about her hips (the head thrown back: negative)
  ring?: number; // 0..1 the phone's screen light
  buzz?: number; // px of the phone's jitter
  faceDown?: boolean;
  calm?: number; // 0..1 the calm ending: the light a little warmer and softer
  behind?: boolean; // raised arms behind her head (primping)
};

export const Room: React.FC<RoomP> = ({uid, frame, pose = 'stand', face = 'neutral', acts, lean = 0, ring = 0, buzz = 0, faceDown = false, calm = 0, behind = false}) => {
  const id = (n: string) => `${uid}-${n}`;
  const lampA = 0.42 + 0.08 * calm;
  const her = (refl: boolean) => (
    <SilPalCtx.Provider value={warmPal(1 + 0.1 * calm)}>
    <g transform={`rotate(${(refl ? -lean : lean).toFixed(2)} ${refl ? REFL_X : HER_X} ${HER_Y - HER_SIZE * 0.47})`}>
      <Her
        uid={uid}
        x={refl ? REFL_X : HER_X}
        y={refl ? HER_Y + 10 : HER_Y}
        size={refl ? HER_SIZE * 0.93 : HER_SIZE}
        frame={frame}
        pose={pose}
        face={face}
        acts={acts}
        turn={refl ? -0.9 : 0.9}
        time="night"
        behind={behind}
      />
    </g>
    </SilPalCtx.Provider>
  );
  return (
    <svg width={1080} height={1920} viewBox="0 0 1080 1920" style={{position: 'absolute', inset: 0}}>
      <defs>
        <linearGradient id={id('wall')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#261D1B" />
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
        <radialGradient id={id('screen')} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#CFE0FF" stopOpacity={0.75} />
          <stop offset="0.4" stopColor="#9FB8F0" stopOpacity={0.22} />
          <stop offset="1" stopColor="#9FB8F0" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={id('mfade')} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#34302F" stopOpacity={0} />
          <stop offset="0.55" stopColor="#34302F" stopOpacity={0.75} />
          <stop offset="1" stopColor="#34302F" stopOpacity={0.92} />
        </linearGradient>
        <clipPath id={id('mclip')}>
          <path d={glassD} />
        </clipPath>
      </defs>
      {/* the wall, the sconce behind her, the lamp's pool */}
      <rect width={1080} height={1920} fill={`url(#${id('wall')})`} />
      <ellipse cx={210} cy={560} rx={620} ry={700} fill={`url(#${id('sconce')})`} />
      <ellipse cx={LAMP.x} cy={LAMP.y} rx={720} ry={720} fill={`url(#${id('lampglow')})`} />
      {/* the sconce: a brass plate and a frosted shade */}
      <rect x={96} y={520} width={22} height={120} rx={8} fill={`url(#${id('brass')})`} />
      <path d="M118 548Q160 548 168 520L176 600Q160 620 118 612Z" fill="#F7DDB5" opacity={0.95} />
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
      {/* the mirror: its glass and what it shows (the room, cooler; the lamp; her) */}
      <g clipPath={`url(#${id('mclip')})`}>
        <rect x={MX0} y={MTOP} width={MX1 - MX0} height={MB - MTOP} fill={`url(#${id('glass')})`} />
        <ellipse cx={210 + 820} cy={620} rx={420} ry={520} fill={`url(#${id('sconce')})`} opacity={0.55} />
        <ellipse cx={LAMP.x - 40} cy={LAMP.y} rx={380} ry={380} fill={`url(#${id('lampglow')})`} opacity={0.6} />
        <g opacity={0.82}>{her(true)}</g>
        {/* the reflection fades into the glass toward the vanity (her legs, far behind the wood, never show) */}
        <rect x={MX0} y={860} width={MX1 - MX0} height={MB - 860} fill={`url(#${id('mfade')})`} />
        <rect x={MX0} y={MTOP} width={MX1 - MX0} height={MB - MTOP} fill="#9FB6C8" opacity={0.07} />
        {/* the glass's sheen */}
        <path d={`M${MX0 + 40} ${MTOP + 520}L${MX0 + 250} ${MTOP + 90}L${MX0 + 320} ${MTOP + 90}L${MX0 + 110} ${MTOP + 520}Z`} fill="#FFFFFF" opacity={0.05} />
        <path d={`M${MX0 + 150} ${MTOP + 700}L${MX0 + 380} ${MTOP + 230}L${MX0 + 410} ${MTOP + 230}L${MX0 + 180} ${MTOP + 700}Z`} fill="#FFFFFF" opacity={0.035} />
        {ring > 0.01 ? <ellipse cx={PHONE_AT.x} cy={MB - 10} rx={260} ry={200} fill={`url(#${id('screen')})`} opacity={0.55 * ring} /> : null}
      </g>
      <path d={glassD} fill="none" stroke={`url(#${id('brass')})`} strokeWidth={14} />
      <path d={glassD} fill="none" stroke="#2A1D15" strokeWidth={2} opacity={0.6} transform="translate(0 0)" />
      {/* her */}
      {her(false)}
      {/* the vanity */}
      <rect x={520} y={VTOP + 32} width={600} height={400} fill={`url(#${id('cab')})`} />
      {[
        [556, 790],
        [814, 1060],
      ].map(([a, b]) => (
        <g key={a}>
          <rect x={a} y={1240} width={b - a} height={150} rx={6} fill="#5A3E2D" stroke="#2E1F16" strokeWidth={3} />
          <rect x={(a + b) / 2 - 42} y={1306} width={84} height={10} rx={5} fill={`url(#${id('brass')})`} />
        </g>
      ))}
      <path d={`M548 ${VTOP + 430}L560 1648H576L586 ${VTOP + 430}Z`} fill="#3A271D" />
      <rect x={510} y={VTOP} width={610} height={34} rx={6} fill={`url(#${id('wood')})`} />
      <rect x={510} y={VTOP} width={610} height={3} rx={1.5} fill="#E2B88E" opacity={0.7} />
      <rect x={510} y={VTOP + 30} width={610} height={4} fill="#2A1A12" opacity={0.6} />
      {/* the perfume */}
      <g transform="translate(860 1100)">
        <rect x={-26} y={8} width={52} height={72} rx={10} fill="#E9D7C2" opacity={0.28} />
        <rect x={-26} y={8} width={52} height={72} rx={10} fill="none" stroke="#F5E6D2" strokeWidth={2} opacity={0.5} />
        <rect x={-18} y={34} width={36} height={40} rx={6} fill="#E8A060" opacity={0.35} />
        <rect x={-10} y={-10} width={20} height={20} rx={4} fill={`url(#${id('brass')})`} />
        <rect x={-18} y={12} width={6} height={60} rx={3} fill="#FFFFFF" opacity={0.35} />
      </g>
      {/* the lamp */}
      <g>
        <ellipse cx={LAMP.x} cy={VTOP + 2} rx={52} ry={8} fill="#000" opacity={0.35} />
        <path d={`M${LAMP.x - 34} ${VTOP}L${LAMP.x - 22} ${LAMP.y + 50}H${LAMP.x + 22}L${LAMP.x + 34} ${VTOP}Z`} fill={`url(#${id('brass')})`} />
        <circle cx={LAMP.x} cy={LAMP.y} r={74} fill={`url(#${id('globe')})`} />
      </g>
      {/* the phone on the wood: lying flat, seen from a little above (its top face a thin parallelogram) */}
      <g transform={`translate(${(PHONE_AT.x + buzz).toFixed(2)} ${PHONE_AT.y}) rotate(${(-2 + buzz * 0.3).toFixed(2)})`}>
        {ring > 0.01 ? <ellipse cx={0} cy={-30} rx={240} ry={120} fill={`url(#${id('screen')})`} opacity={ring} /> : null}
        <ellipse cx={4} cy={6} rx={88} ry={8} fill="#000" opacity={0.45} />
        {/* the side (its edge, metal) */}
        <path d="M-80 -2L80 -2L84 4L-76 4Z" fill="#6A6A72" />
        {/* the top face: the screen (up) or the back glass (face down) */}
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

/** her light, the warm lamp's: put round anything that draws her */
export const WarmLight: React.FC<{children: React.ReactNode; level?: number}> = ({children, level = 1}) => <SilPalCtx.Provider value={warmPal(level)}>{children}</SilPalCtx.Provider>;

/** a camera on an SVG/HTML stage: scale s about (fx, fy) */
export const cam = (s: number, fx: number, fy: number, dx = 0, dy = 0) => `translate(${(fx + dx).toFixed(2)}px, ${(fy + dy).toFixed(2)}px) scale(${s.toFixed(4)}) translate(${(-fx).toFixed(2)}px, ${(-fy).toFixed(2)}px)`;

export const easeIn = (t: number, a: number, d: number) => E.inOut(clamp((t - a) / d));
export const mixN = lerp;
