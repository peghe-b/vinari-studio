// src/scenes/illo/hand.tsx: the close-up Hand of the "Graphite" kit (spec 3.7): a big right hand seen from the back, for
// moments the camera is close to (tapping a screen, a key fob in the fingers, a thumbs up, a stop palm, a gauge held on a
// valve). The Figure kit draws its own small hands; this one is for the frame-filling close-ups. The phone grip lives in
// handset.tsx (HandGrip), because it wraps the phone's own outline.
//
//   <Hand uid x y size angle pose side sleeve press frame time/>
//     x, y     the wrist's centre (stage px); the hand points up from it, turned by `angle` degrees (clockwise)
//     size     wrist to the middle fingertip, stage px (default 420)
//     pose     point | thumb | palm | fist | hold | pinch   (default point); `curl` [4] and `thumbAt` override it
//     side     right (default) | left (mirrored)
//     sleeve   the cuff's ramp step (default 4: the hoodie); null draws no cuff
//     press    0..1: the index finger pushes in (a tap: it shortens and the hand dips toward the screen)
//   handAnchor(pose, ...) gives the stage point where a held item sits (between the thumb and the fingers) or where the
//   index tip touches, so a scene can place a key fob, a gauge or a tap ring there.
//
// Pure drawing code: frame-driven, deterministic, colours only from C (skin through ilSkin / ilSkin2), no hooks.
import React from 'react';
import {C} from '../../tokens';
import {deepFreeze, mix, tone, type Time} from './palette';
import {capsule, Solid} from './solid';

export type HandPose = 'point' | 'thumb' | 'palm' | 'fist' | 'hold' | 'pinch';
export const HAND_POSES: HandPose[] = ['point', 'thumb', 'palm', 'fist', 'hold', 'pinch'];
deepFreeze(HAND_POSES);

const n1 = (v: number) => +v.toFixed(1);
type Pt = [number, number];

// units: the wrist at (0, 0), up is -y; the middle finger's tip is 196 units out (a right hand from the back: the thumb on
// the left). Fingers: base point on the knuckle line, length, radius at the base.
const FINGERS: [Pt, number, number][] = [
  [[-33, -100], 80, 11.6],
  [[-11, -106], 90, 12.2],
  [[12, -103], 83, 11.4],
  [[33, -95], 64, 9.8],
];
const THUMB_BASE: Pt = [-36, -24];
// roll: a curled finger shows its folded phalanx (a side view of the fist); knuckle: only the knuckle's bump shows (seen
// from the back, the folded finger goes away from the viewer)
const POSES: Record<HandPose, {curl: number[]; spread: number[]; thumb: number; thumbCurl: number; angle: number; fold: 'roll' | 'knuckle'}> = {
  point: {curl: [0, 1, 1, 1], spread: [-2, 0, 0, 0], thumb: 22, thumbCurl: 0.7, angle: 0, fold: 'knuckle'},
  thumb: {curl: [1, 1, 1, 1], spread: [0, 0, 0, 0], thumb: -68, thumbCurl: 0, angle: 90, fold: 'roll'},
  palm: {curl: [0, 0, 0, 0], spread: [-9, -3, 3, 10], thumb: -34, thumbCurl: 0, angle: 0, fold: 'roll'},
  fist: {curl: [1, 1, 1, 1], spread: [0, 0, 0, 0], thumb: 30, thumbCurl: 0.75, angle: 0, fold: 'knuckle'},
  hold: {curl: [0.75, 0.8, 0.82, 0.85], spread: [0, 0, 0, 0], thumb: 14, thumbCurl: 0.35, angle: -90, fold: 'roll'},
  pinch: {curl: [0.55, 1, 1, 1], spread: [6, 0, 0, 0], thumb: 22, thumbCurl: 0.2, angle: -20, fold: 'roll'},
};
deepFreeze(POSES);
deepFreeze(FINGERS);

const rot = ([x, y]: Pt, deg: number): Pt => {
  const a = (deg * Math.PI) / 180;
  return [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
};
const add = (a: Pt, b: Pt): Pt => [a[0] + b[0], a[1] + b[1]];

/** Where the item a pose holds sits, or where the index tip is (hand units, before placement). */
const anchorUnits = (pose: HandPose): Pt => (pose === 'point' ? [-35, -182] : pose === 'pinch' ? [-46, -150] : pose === 'hold' ? [-20, -112] : [-10, -120]);

type HandP = {
  uid: string;
  x: number;
  y: number;
  size?: number;
  angle?: number;
  pose?: HandPose;
  side?: 'right' | 'left';
  sleeve?: number | null;
  press?: number;
  curl?: number[];
  thumbAt?: number;
  time?: Time;
  opacity?: number;
};

/** The stage point a pose holds an item at (or the index tip), for a hand placed with the same props. */
export const handAnchor = (p: Pick<HandP, 'x' | 'y' | 'size' | 'angle' | 'pose' | 'side'>): Pt => {
  const pose = p.pose ?? 'point';
  const s = (p.size ?? 420) / 196;
  const flip = p.side === 'left' ? -1 : 1;
  const [ax, ay] = rot(anchorUnits(pose), (p.angle ?? POSES[pose].angle) * flip);
  return [p.x + ax * s * flip, p.y + ay * s];
};

export const Hand: React.FC<HandP> = (p) => {
  const pose = p.pose ?? 'point';
  const P = POSES[pose];
  const s = (p.size ?? 420) / 196;
  const flip = p.side === 'left' ? -1 : 1;
  const angle = (p.angle ?? P.angle) * flip;
  const time = p.time ?? 'day';
  const press = Math.min(1, Math.max(0, p.press ?? 0));
  const curl = p.curl ?? P.curl;
  const hw = Math.max(1.2, 2.2 * s * 0.6);
  const U = (v: number) => v * s;
  const C2 = (a: Pt): Pt => [U(a[0]), U(a[1])];
  const cap = (a: Pt, ra: number, b: Pt, rb: number) => capsule(U(a[0]), U(a[1]), U(ra), U(b[0]), U(b[1]), U(rb));
  const nail = (tip: Pt, dir: Pt, r: number) => {
    // a rounded nail just behind the tip, along the finger's direction
    const a = add(tip, [-dir[0] * r * 0.55, -dir[1] * r * 0.55]);
    const b = add(tip, [-dir[0] * r * 1.75, -dir[1] * r * 1.75]);
    return cap(a, r * 0.6, b, r * 0.66);
  };
  const crease = (at: Pt, dir: Pt, r: number) => {
    const nx = -dir[1];
    const ny = dir[0];
    const a = C2(add(at, [nx * r * 0.62, ny * r * 0.62]));
    const b = C2(add(at, [-nx * r * 0.62, -ny * r * 0.62]));
    const m = C2(add(at, [dir[0] * r * 0.22, dir[1] * r * 0.22]));
    return `M${n1(a[0])} ${n1(a[1])}Q${n1(m[0])} ${n1(m[1])} ${n1(b[0])} ${n1(b[1])}`;
  };
  // fingers: an extended finger is two phalanx capsules with a nail; a curled one shows only the folded knuckle,
  // foreshortened toward the viewer (a short rounded block over the knuckle line)
  const fingers = FINGERS.map(([base, len, r], i) => {
    const c = Math.min(1, Math.max(0, curl[i] ?? 0));
    const sp = P.spread[i] ?? 0;
    const pr = i === 0 ? press : 0;
    const dir = rot([0, -1], sp);
    const L = len * (1 - 0.62 * c) * (1 - 0.18 * pr);
    const mid = add(base, [dir[0] * L * 0.56, dir[1] * L * 0.56]);
    const tip = add(base, [dir[0] * L, dir[1] * L]);
    const r2 = r * (0.86 - 0.04 * c);
    return {i, c, base, dir, mid, tip, r, r2, L};
  });
  // the thumb: from its base at the lower left, swung by P.thumb degrees (+ tucks it across the palm), curled
  const th = p.thumbAt ?? P.thumb;
  const tdir = rot([-0.42, -1], th);
  const tl = 78 * (1 - 0.45 * P.thumbCurl);
  const tmid = add(THUMB_BASE, [tdir[0] * tl * 0.52, tdir[1] * tl * 0.52]);
  const ttip = add(tmid, rot([tdir[0] * tl * 0.48, tdir[1] * tl * 0.48], 14 * P.thumbCurl));
  const tuck = th > 10;
  const palmD = (() => {
    const pts: Pt[] = [[-42, 4], [-47, -40], [-48, -82], [-41, -104], [-22, -112], [0, -115], [22, -110], [40, -100], [47, -78], [45, -38], [40, 4]];
    const q = pts.map(C2);
    let d = `M${n1(q[0][0])} ${n1(q[0][1])}`;
    for (let k = 0; k < q.length; k++) {
      const a = q[(k - 1 + q.length) % q.length];
      const b = q[k];
      const c = q[(k + 1) % q.length];
      const e = q[(k + 2) % q.length];
      d += `C${n1(b[0] + (c[0] - a[0]) / 6)} ${n1(b[1] + (c[1] - a[1]) / 6)} ${n1(c[0] - (e[0] - b[0]) / 6)} ${n1(c[1] - (e[1] - b[1]) / 6)} ${n1(c[0])} ${n1(c[1])}`;
    }
    return d + 'Z';
  })();
  const nailFill = mix(C.ilSkin, C.il0, 0.55);
  const thumbParts = (
    <g>
      <Solid uid={p.uid} d={cap(THUMB_BASE, 20, tmid, 15)} tone="skin" rim outline time={time} />
      <Solid uid={p.uid} d={cap(tmid, 15, ttip, 12.5)} tone="skin" rim outline time={time} />
      {P.thumbCurl < 0.5 ? <path d={nail(ttip, [ttip[0] - tmid[0], ttip[1] - tmid[1]].map((v) => v / Math.hypot(ttip[0] - tmid[0], ttip[1] - tmid[1])) as Pt, 11.5)} fill={nailFill} /> : null}
      <path d={crease(tmid, [tdir[0], tdir[1]], 13.5)} fill="none" stroke={C.ilSkin2} strokeWidth={hw} strokeLinecap="round" opacity={0.85} />
    </g>
  );
  return (
    <g transform={`translate(${n1(p.x)} ${n1(p.y + press * U(6))}) scale(${flip} 1) rotate(${n1(angle * flip)})`} opacity={p.opacity}>
      {/* the cuff of the sleeve */}
      {p.sleeve !== null ? <Solid uid={p.uid} d={`M${n1(U(-50))} ${n1(U(8))}Q${n1(U(-52))} ${n1(U(-4))} ${n1(U(-40))} ${n1(U(-6))}Q${n1(U(0))} ${n1(U(-12))} ${n1(U(40))} ${n1(U(-6))}Q${n1(U(52))} ${n1(U(-4))} ${n1(U(50))} ${n1(U(8))}L${n1(U(56))} ${n1(U(110))}L${n1(U(-56))} ${n1(U(110))}Z`} tone={p.sleeve ?? 4} rim outline time={time} /> : null}
      {p.sleeve !== null ? <path d={`M${n1(U(-50))} ${n1(U(14))}Q${n1(U(0))} ${n1(U(6))} ${n1(U(50))} ${n1(U(14))}`} fill="none" stroke={tone((p.sleeve ?? 4) + 1)} strokeWidth={hw * 1.4} opacity={0.6} /> : null}
      {!tuck ? thumbParts : null}
      <Solid uid={p.uid} d={palmD} tone="skin" rim outline time={time} />
      {/* the back of the hand: the tendons' soft ridges and the knuckles' light */}
      {[-30, -10, 11, 31].map((x, i) => (
        <path key={i} d={`M${n1(U(x * 0.55))} ${n1(U(-20))}L${n1(U(x))} ${n1(U(-92))}`} stroke={mix(C.ilSkin, C.il0, 0.35)} strokeWidth={U(4)} strokeLinecap="round" opacity={0.2} />
      ))}
      <path d={`M${n1(U(44))} ${n1(U(-80))}Q${n1(U(46))} ${n1(U(-30))} ${n1(U(38))} ${n1(U(2))}`} fill="none" stroke={C.ilSkin2} strokeWidth={U(9)} opacity={0.4} strokeLinecap="round" />
      {fingers
        .slice()
        .sort((a, b) => a.c - b.c)
        .map((g) =>
          g.c > 0.5 && P.fold === 'knuckle' ? (
            <g key={g.i}>
              <Solid uid={p.uid} d={cap(add(g.base, [0, 8]), g.r * 1.05, add(g.base, [0, -4]), g.r * 1.08)} tone="skin" rim outline time={time} />
              <path d={crease(add(g.base, [0, 2]), [0, -1], g.r)} fill="none" stroke={C.ilSkin2} strokeWidth={hw} opacity={0.7} strokeLinecap="round" />
            </g>
          ) : g.c > 0.5 ? (
            <g key={g.i}>
              <Solid uid={p.uid} d={cap(add(g.base, [0, 6]), g.r * 1.08, add(g.base, [g.dir[0] * 24, -24]), g.r * 1.12)} tone="skin" rim outline time={time} />
              <path d={crease(add(g.base, [0, -12]), [0, -1], g.r)} fill="none" stroke={C.ilSkin2} strokeWidth={hw} opacity={0.8} strokeLinecap="round" />
            </g>
          ) : (
            <g key={g.i}>
              <Solid uid={p.uid} d={cap(add(g.base, [0, 4]), g.r, g.mid, g.r * 0.94)} tone="skin" rim outline time={time} />
              <Solid uid={p.uid} d={cap(g.mid, g.r * 0.94, g.tip, g.r2)} tone="skin" rim outline time={time} />
              <path d={nail(g.tip, g.dir, g.r2)} fill={nailFill} />
              <path d={crease(g.mid, g.dir, g.r * 0.94) + crease(add(g.base, [g.dir[0] * g.L * 0.8, g.dir[1] * g.L * 0.8]), g.dir, g.r2)} fill="none" stroke={C.ilSkin2} strokeWidth={hw} opacity={0.8} strokeLinecap="round" />
            </g>
          ),
        )}
      {tuck ? thumbParts : null}
    </g>
  );
};
