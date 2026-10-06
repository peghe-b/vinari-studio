// src/scenes/illo/handset.tsx: the Handset part of the "Graphite" kit (spec 3.7): a slim current smartphone, its ringing
// state and a hand that holds it. Generic only: no Vinari screen (those are `Phone` with real captures), no app brand.
//
//   <Handset uid x y w tilt frame lit screen ring time/>
//     x, y, w     the phone's centre and width in stage px (height = 2.05 w), tilt in degrees
//     lit         0..1: the screen wakes (content fades in over black glass; ramp it over about 8 frames)
//     screen      (w, h) => ReactNode: drawn clipped to the screen, in screen px from its top-left corner
//     ring        {from, until?}: buzz bursts (12 frames on, 18 off: a jitter of a few px, +-0.6 deg, a ghost copy at
//                 0.18) and two outlines of the phone expanding at every burst (1 -> 1.35, 6 frames apart)
//   <CallScreen w h frame name label avatar state at/>   an incoming call (pass it through `screen`): the caller's
//                 name big in the film's capitals, a mono label, an avatar that pulses while it rings, two neutral
//                 buttons; `state` answer fills the right one green with a pop and starts a timer, decline fills the
//                 left one red and the screen sinks to black
//   <HandGrip uid part x y w tilt frame ring/>   the hand holding the phone from below (right hand): `part="back"`
//                 (palm, fingers behind the phone: draw it before the Handset) and `part="front"` (the thumb over the
//                 right edge, the ball of the thumb: draw it after, at depth 1.3 in a scene). Same placement props as
//                 the Handset, so it follows every buzz.
//   buzz(frame, ring)   the shared jitter: {env, dx, dy, rot}
//
// Pure drawing code: frame-driven, deterministic, colours only from C (screens: C.screen / C.ink / C.ink2), ids from
// useId(). Text inside the screen goes through mtav() and carries className={TXT} (the text layer).
import React, {useId} from 'react';
import {spring} from 'remotion';
import {C, F, toneBig} from '../../tokens';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import {textWidth} from '../../lib/measure';
import {Rings} from './fx';
import {dark, mix, tone, type Time} from './palette';
import {capsule, gid, paint, rr, Solid} from './solid';

export const ASPECT = 2.05;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const n1 = (v: number) => +v.toFixed(1);

export type Ring = {from: number; until?: number};

/** The buzz: bursts of 12 frames every 30 from `from` (2-frame ramps), a jitter that never repeats in step. */
export const buzz = (frame: number, ring?: Ring | null, w = 470) => {
  if (!ring || frame < ring.from || frame >= (ring.until ?? Infinity)) return {env: 0, dx: 0, dy: 0, rot: 0, burst: -1};
  const t = frame - ring.from;
  const q = t % 30;
  const env = q < 2 ? q / 2 : q < 10 ? 1 : q < 12 ? (12 - q) / 2 : 0;
  const k = (w / 470) * env;
  return {env, dx: 5 * k * Math.sin(frame * 2.31 + 0.4), dy: 1.4 * k * Math.sin(frame * 3.07), rot: 0.6 * env * Math.sin(frame * 1.73 + 1), burst: t - q + ring.from};
};

type Place = {x: number; y: number; w: number; tilt?: number; frame: number; ring?: Ring | null};
/** The phone's transform (its centre, the tilt and the buzz). */
const placeOf = (p: Place) => {
  const b = buzz(p.frame, p.ring, p.w);
  return {b, transform: `translate(${n1(p.x + b.dx)} ${n1(p.y + b.dy)}) rotate(${n1((p.tilt ?? 0) + b.rot)})`};
};

type HandsetP = Place & {
  uid: string;
  lit?: number;
  screen?: (w: number, h: number) => React.ReactNode;
  time?: Time;
  ghost?: boolean;
};

export const Handset: React.FC<HandsetP> = (p) => {
  const id = useId();
  const w = p.w;
  const h = w * ASPECT;
  const R = w * 0.14;
  const edge = w * 0.012;
  const bez = w * 0.026;
  const sw = w - 2 * bez;
  const sh = h - 2 * bez;
  const sr = R - bez;
  const {b, transform} = placeOf(p);
  const time = p.time ?? 'day';
  const onDark = dark(time);
  const lit = clamp(p.lit ?? 1, 0, 1);
  const clip = gid(p.uid, `hs${id}`);
  const frameD = rr(-w / 2, -h / 2, w, h, R);
  const glassD = rr(-w / 2 + edge, -h / 2 + edge, w - 2 * edge, h - 2 * edge, R - edge);
  const screenD = rr(-sw / 2, -sh / 2, sw, sh, sr);
  const button = (x: number, y: number, len: number) => rr(x, y, w * 0.016, len, w * 0.008);
  return (
    <g>
      {p.ring ? (
        <Rings frame={p.frame} x={p.x} y={p.y} w={w} h={h} r={R} at={p.ring.from} period={30} until={p.ring.until} color={onDark ? C.il0 : C.il5} width={Math.max(2, w * 0.007)} />
      ) : null}
      {b.env > 0.05 && p.ghost !== false ? (
        <g transform={`translate(${n1(p.x - b.dx * 1.6)} ${n1(p.y)}) rotate(${n1((p.tilt ?? 0) - b.rot)})`} opacity={0.18 * b.env}>
          <path d={frameD} fill={onDark ? C.il2 : C.il5} />
        </g>
      ) : null}
      <g transform={transform}>
        <defs>
          <clipPath id={clip}>
            <path d={screenD} />
          </clipPath>
        </defs>
        {/* side buttons: the action button and the volume pair on the left, power on the right */}
        <path d={button(-w / 2 - w * 0.01, -h * 0.3, h * 0.05) + button(-w / 2 - w * 0.01, -h * 0.2, h * 0.075) + button(-w / 2 - w * 0.01, -h * 0.1, h * 0.075) + button(w / 2 - w * 0.006, -h * 0.22, h * 0.11)} fill={tone(4)} />
        {/* the metal edge, the black glass, the screen */}
        <Solid uid={p.uid} d={frameD} tone={3} rim outline time={time} />
        <path d={glassD} fill={C.ilFeature} />
        <path d={screenD} fill={mix(C.ilFeature, C.ilGlass, 0.5)} />
        <g clipPath={`url(#${clip})`}>
          {p.screen && lit > 0 ? (
            <g transform={`translate(${n1(-sw / 2)} ${n1(-sh / 2)})`} opacity={lit}>
              {p.screen(sw, sh)}
            </g>
          ) : null}
          {/* the glass catches the key light: one soft diagonal band */}
          <path d={`M${n1(-sw / 2)} ${n1(-sh * 0.12)}L${n1(-sw * 0.05)} ${n1(-sh / 2)}L${n1(sw * 0.16)} ${n1(-sh / 2)}L${n1(-sw / 2)} ${n1(sh * 0.08)}Z`} fill={C.il0} opacity={lit > 0.5 ? 0.04 : onDark ? 0.07 : 0.1} />
        </g>
        {/* the island */}
        <path d={rr(-w * 0.15, -sh / 2 + w * 0.03, w * 0.3, w * 0.085, w * 0.0425)} fill={C.island} />
        <circle cx={w * 0.095} cy={-sh / 2 + w * 0.0725} r={w * 0.018} fill={tone(6)} />
      </g>
    </g>
  );
};

// ---- the call screen --------------------------------------------------------------------------------------------------
export type CallState = 'ringing' | 'answer' | 'decline';
type CallP = {
  w: number;
  h: number;
  frame: number;
  name: string;
  label?: string;
  avatar?: React.ReactNode | string; // a node drawn in a circle of radius 1 at the origin (scaled), or an initial
  state?: CallState;
  at?: number; // the frame the outcome happens
  uid: string;
};
const punch = (frame: number, at: number) => spring({frame: frame - at, fps: 30, config: {mass: 1, stiffness: 520, damping: 30}});
const ease = (t: number) => 1 - (1 - clamp(t, 0, 1)) ** 3;

/** A receiver glyph (the classic handset), centred, `s` = its size; `down` turns it to hang up. */
const receiver = (cx: number, cy: number, s: number, down: boolean) => {
  // two ear pieces joined by a curved grip, drawn as one filled shape in a 24-unit box
  const P = (x: number, y: number) => {
    const a = down ? (135 * Math.PI) / 180 : 0;
    const u = (x - 12) / 24;
    const v = (y - 12) / 24;
    return `${n1(cx + (u * Math.cos(a) - v * Math.sin(a)) * s)} ${n1(cy + (u * Math.sin(a) + v * Math.cos(a)) * s)}`;
  };
  return (
    `M${P(5.2, 3.2)}C${P(3.4, 3.6)} ${P(2.6, 5.4)} ${P(3, 7.6)}C${P(4.4, 14.2)} ${P(9.8, 19.6)} ${P(16.4, 21)}C${P(18.6, 21.4)} ${P(20.4, 20.6)} ${P(20.8, 18.8)}` +
    `L${P(21.2, 16.4)}C${P(21.3, 15.6)} ${P(20.9, 15)} ${P(20.2, 14.7)}L${P(16.9, 13.4)}C${P(16.2, 13.1)} ${P(15.5, 13.3)} ${P(15.1, 13.9)}L${P(14, 15.4)}` +
    `C${P(11.6, 14.2)} ${P(9.8, 12.4)} ${P(8.6, 10)}L${P(10.1, 8.9)}C${P(10.7, 8.5)} ${P(10.9, 7.8)} ${P(10.6, 7.1)}L${P(9.3, 3.8)}C${P(9, 3.1)} ${P(8.4, 2.7)} ${P(7.6, 2.8)}Z`
  );
};

/** An incoming call, drawn in screen px (pass it through Handset's `screen`). */
export const CallScreen: React.FC<CallP> = ({w, h, frame, name, label = 'მობილური', avatar, state = 'ringing', at = Infinity, uid}) => {
  const out = state !== 'ringing' && frame >= at;
  const k = out ? punch(frame, at) : 0; // the button's pop
  const go = out ? ease((frame - at - 6) / 12) : 0; // the screen's change after the pop
  const green = toneBig('up');
  const red = toneBig('down');
  const ink = C.ink;
  const ink2 = C.ink2;
  const shown = mtav(name);
  const size0 = w * 0.125;
  const font = (px: number) => `600 ${px}px ${F.sans}`;
  const fit = Math.min(size0, (size0 * w * 0.84) / Math.max(1, textWidth(shown, font(size0))));
  const ringing = !out;
  const pulse = ringing ? 1 + 0.04 * (0.5 - 0.5 * Math.cos((frame / 30) * Math.PI * 2)) : 1;
  const ay = h * (0.3 - (state === 'answer' ? 0.1 * go : 0));
  const ar = w * 0.17 * (state === 'answer' ? 1 - 0.35 * go : 1);
  const ny = h * (0.47 - (state === 'answer' ? 0.17 * go : 0));
  const by = h * 0.83;
  const br = w * 0.1;
  const secs = state === 'answer' && out ? Math.max(0, Math.floor((frame - at - 8) / 30)) : 0;
  const timer = `00:${String(secs).padStart(2, '0')}`;
  const sink = state === 'decline' ? go : 0;
  const bg = C.screen;
  const panel = mix(bg, C.ink, 0.07);
  const btn = (x: number, which: 'decline' | 'answer') => {
    const on = out && state === which;
    const fill = on ? (which === 'answer' ? green : red) : panel;
    const s = on ? 1 + 0.12 * Math.sin(Math.PI * Math.min(1, (frame - at) / 10)) * (1 - Math.min(1, (frame - at) / 10)) + 0.0 * k : 1;
    const hide = state === 'answer' && out && which === 'decline' ? 1 - go : 1;
    const xx = state === 'answer' && out && which === 'answer' ? x + (w / 2 - x) * go : x;
    return (
      <g opacity={hide} transform={`translate(${n1(xx)} ${n1(by)}) scale(${n1(s * 100) / 100})`}>
        <circle r={br} fill={fill} />
        {!on ? <circle r={br - 1.2} fill="none" stroke={ink2} strokeWidth={1.6} opacity={0.6} /> : null}
        <path d={receiver(0, 0, br * 0.95, which === 'decline')} fill={on ? C.onInk : ink} />
      </g>
    );
  };
  return (
    <g>
      <rect width={w} height={h} fill={bg} />
      {/* a soft wallpaper glow behind the caller */}
      <ellipse cx={w / 2} cy={ay} rx={w * 0.7} ry={h * 0.22} fill={paint(uid, 'glow-ink')} opacity={dark() ? 0.08 : 0.05} />
      <g transform={`translate(0 ${n1(sink * h)})`} opacity={1 - sink * 0.9}>
        <g transform={`translate(${n1(w / 2)} ${n1(ay)}) scale(${n1(pulse * 1000) / 1000})`}>
          <circle r={ar} fill={tone(5)} />
          {typeof avatar === 'string' || avatar === undefined ? (
            <text className={TXT} y={ar * 0.36} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={ar} fill={C.il0}>
              {mtav((typeof avatar === 'string' ? avatar : Array.from(name)[0] ?? '').slice(0, 2))}
            </text>
          ) : (
            <g transform={`scale(${n1(ar * 100) / 100})`}>{avatar}</g>
          )}
        </g>
        <text className={TXT} x={w / 2} y={ny} textAnchor="middle" fontFamily={F.sans} fontWeight={600} fontSize={fit} fill={ink}>
          {shown}
        </text>
        <text className={TXT} x={w / 2} y={ny + w * 0.1} textAnchor="middle" fontFamily={F.mono} fontSize={w * 0.05} letterSpacing={w * 0.004} fill={ink2}>
          {state === 'answer' && out ? timer : mtav(label)}
        </text>
        {btn(w * 0.27, 'decline')}
        {btn(w * 0.73, 'answer')}
      </g>
    </g>
  );
};

// ---- the hand that holds it ------------------------------------------------------------------------------------------------
type GripP = Place & {uid: string; part?: 'back' | 'front' | 'both'; sleeve?: number; time?: Time; thumb?: number};
type KP = [number, number] | [number, number, 1];
/** A smooth closed outline through points in phone-width units (a third item 1 makes a corner). */
const outline = (pts: KP[], w: number) => {
  const n = pts.length;
  const P = (i: number) => pts[((i % n) + n) % n];
  const c = (i: number) => P(i).length === 3;
  let d = `M${n1(P(0)[0] * w)} ${n1(P(0)[1] * w)}`;
  for (let i = 0; i < n; i++) {
    const p1 = P(i);
    const p2 = P(i + 1);
    const p0 = c(i) ? p1 : P(i - 1);
    const p3 = c(i + 1) ? p2 : P(i + 2);
    d += `C${n1((p1[0] + (p2[0] - p0[0]) / 6) * w)} ${n1((p1[1] + (p2[1] - p0[1]) / 6) * w)} ${n1((p2[0] - (p3[0] - p1[0]) / 6) * w)} ${n1((p2[1] - (p3[1] - p1[1]) / 6) * w)} ${n1(p2[0] * w)} ${n1(p2[1] * w)}`;
  }
  return d + 'Z';
};
/** A right hand holding the phone from below: four fingertips wrap the left edge (behind the phone), the heel of the
 *  hand and the wrist show under it, the thumb lies along the right edge in front. `thumb` 0..1 swings the thumb's tip
 *  down onto the screen (to the lower right: the answer button). */
export const HandGrip: React.FC<GripP> = (p) => {
  const {transform} = placeOf(p);
  const w = p.w;
  const part = p.part ?? 'both';
  const time = p.time ?? 'day';
  const u = (v: number) => v * w;
  const sleeve = p.sleeve ?? 4;
  const th = clamp(p.thumb ?? 0, 0, 1);
  const hw = Math.max(1.2, w * 0.0035);
  const back = (
    <g>
      {/* the heel of the hand and the wrist (behind the phone, showing under it), then the sleeve */}
      <Solid uid={p.uid} d={outline([[-0.4, 0.62], [-0.45, 0.95], [-0.4, 1.24], [-0.28, 1.56], [-0.22, 2.3, 1], [0.66, 2.3, 1], [0.66, 1.62], [0.64, 1.22], [0.56, 0.86], [0.1, 0.5]], w)} tone="skin" rim outline time={time} />
      <path d={outline([[-0.36, 1.18], [-0.24, 1.5], [-0.12, 1.9, 1], [0.0, 1.9, 1], [-0.12, 1.4], [-0.2, 1.1]], w)} fill={C.ilSkin2} opacity={0.45} />
      <Solid uid={p.uid} d={outline([[-0.34, 1.78], [0.2, 1.7], [0.74, 1.76], [0.8, 2.4, 1], [-0.3, 2.4, 1]], w)} tone={sleeve} rim outline time={time} />
      <path d={outline([[-0.33, 1.8], [0.2, 1.72], [0.74, 1.78], [0.75, 1.86], [0.2, 1.8], [-0.32, 1.88]], w)} fill={tone(sleeve + 0.8)} opacity={0.7} />
      {/* four fingertips round the left edge, tight together, the little finger smallest */}
      {[0.24, 0.37, 0.5, 0.62].map((y, i) => {
        const r = [0.064, 0.066, 0.062, 0.052][i];
        const tip = [-0.548, -0.556, -0.55, -0.537][i];
        return (
          <g key={i}>
            <Solid uid={p.uid} d={capsule(u(-0.3), u(y + 0.03), u(r * 1.08), u(tip + r), u(y), u(r))} tone="skin" rim outline time={time} />
            <path d={capsule(u(-0.5), u(y + r * 0.45), u(r * 0.55), u(tip + r * 0.9), u(y + r * 0.35), u(r * 0.5))} fill={C.ilSkin2} opacity={0.5} />
          </g>
        );
      })}
    </g>
  );
  // the thumb and the ball of the thumb in front: one outline; reaching for a button it swings about its base joint
  // and bends toward the glass (foreshortened along its own axis), so the tip lands at (0.21, 0.65) w: the answer button
  const piv: [number, number] = [0.62, 1.0];
  const front = (
    <g
      transform={`translate(${n1(u(piv[0]))} ${n1(u(piv[1]))}) rotate(${n1(-31 * th - 18.3)}) scale(1 ${n1((1 - 0.45 * th) * 1000) / 1000}) rotate(18.3) translate(${n1(-u(piv[0]))} ${n1(-u(piv[1]))})`}
    >
      <Solid
        uid={p.uid}
        d={outline([[0.23, 0.12], [0.27, 0.05], [0.34, 0.035], [0.41, 0.09], [0.49, 0.22], [0.56, 0.37], [0.62, 0.56], [0.67, 0.76], [0.68, 0.96], [0.62, 1.12], [0.5, 1.18], [0.42, 1.08], [0.4, 0.9], [0.37, 0.7], [0.32, 0.48], [0.26, 0.29], [0.21, 0.19]], w)}
        tone="skin"
        rim
        outline
        time={time}
      />
      {/* the shaded inner edge, the nail, the knuckle's crease */}
      <path d={outline([[0.42, 1.06], [0.41, 0.9], [0.38, 0.7], [0.33, 0.5], [0.27, 0.31], [0.3, 0.32], [0.37, 0.5], [0.43, 0.72], [0.47, 0.92], [0.5, 1.08]], w)} fill={C.ilSkin2} opacity={0.5} />
      <path d={outline([[0.27, 0.085], [0.33, 0.06], [0.39, 0.1], [0.4, 0.17], [0.33, 0.2], [0.27, 0.16]], w)} fill={mix(C.ilSkin, C.il0, 0.6)} />
      <path d={outline([[0.27, 0.085], [0.33, 0.06], [0.39, 0.1], [0.4, 0.17], [0.33, 0.2], [0.27, 0.16]], w)} fill="none" stroke={C.ilSkin2} strokeWidth={hw} opacity={0.7} />
      <path d={`M${n1(u(0.36))} ${n1(u(0.36))}Q${n1(u(0.43))} ${n1(u(0.33))} ${n1(u(0.5))} ${n1(u(0.36))}`} fill="none" stroke={C.ilSkin2} strokeWidth={hw * 1.2} opacity={0.85} strokeLinecap="round" />
    </g>
  );
  return <g transform={transform}>{part === 'back' ? back : part === 'front' ? front : (<>{back}{front}</>)}</g>;
};
