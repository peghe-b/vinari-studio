// v4 (the owner, 2026-10-14, on v3's woman: "she looks like a stick"; and on her groan at 0.1 s: "why does she bend so
// stupidly? it must be normal and refined"): HER, drawn for this film alone in the studio's "Silhouette light" style. An
// attractive, feminine, elegant woman of about eight heads: a small sculpted head (the kit's SilHead, profile, closed or
// lowered eyes, no cartoon face) on a long neck, real curves (the bust, a narrow waist, the hips), a fitted black midi
// dress with a V neckline and wide straps, bare arms, black pumps, long dark hair falling down her back. The dress and the
// hair are crisp near-black shapes; only the skin (the face, the neck and the V of the chest, the arms, the calves) is
// revealed by ONE warm light from where she faces; a satin sheen of the same light runs inside the dress's front curves
// (never an outline along its back).
//
// The body moves the way a person does: the hips and the feet stay planted, the chest leans a few degrees about the waist,
// the shoulders rise and drop with a breath (`shrug`), the NECK and the HEAD tilt about their own joints (`neck`, `head`),
// the arms reach real targets on her own head (a hand to the forehead, a lipstick to the lips) by two-bone IK.
//
// Units: 1000 u = her standing height in heels, the floor at y = 0, facing +x; `flip` mirrors her (a reflection). Pure
// drawing code, frame-driven, deterministic.
import React from 'react';
import {mix} from '../../scenes/illo/palette';
import {ap, chain, dir, ik2, rot, scl, tr, type Mx, type Pt} from '../../scenes/illo/rig';
import {pathOf, SilHead, type HeadLook, type SilExpr, type SilPal, type V} from './sil/silhead';
import {silPal} from './sil/sil';

export const WARM = '#EBA468';
/** her warm palette (the room's lamp); `level` brightens or dims the light, `dark` the ground she stands on */
export const womanPal = (level = 1, dark = true, hue = WARM): SilPal => silPal({light: !dark, hue, b: '#C9A46A', time: dark ? 'night' : 'day', level});

const LOOK: HeadLook = {fem: true, age: 0, hair: 'long', hairCol: '#0B0B0B', beard: null, glasses: null, hat: null, hatCol: '#0B0B0B', earring: 'stud'};

export type Hand = 'relax' | 'palm' | 'hold' | 'hair';
/** an arm: a target for the wrist (body space, or on her head: 'forehead' | 'lips' | 'temple' | 'hair'), the elbow's
 *  side (+1 out/down in front, -1 behind), the hand's shape and its angle offset */
type HeadKey = 'forehead' | 'lips' | 'temple';
/** 'hang': the arm straight down from its shoulder (whatever the shrug), the elbow a touch forward: in a strict profile the
 *  far arm hangs hidden behind her body (v4 fix: the far arm stuck out behind her back as a pale strip) */
type HangKey = 'hang';
/** an arm: where the wrist goes (a body point, before the chest's lean; or a point on her own head plus an offset in body
 *  units), the elbow's side, the hand's shape and its direction (an absolute limb angle: 0 down, 90 forward, 180 up) */
export type Arm = {to: Pt | HeadKey | HangKey; off?: Pt; bend?: 1 | -1; hand?: Hand; ha: number};
export type WPose = {
  head: number; // degrees, + = the chin up and the head back
  neck: number; // degrees, + = the neck back
  chest: number; // degrees, + = the chest back about the waist (a few at most)
  shrug: number; // u, + = the shoulders up
  near: Arm;
  far: Arm;
  /** the legs: 'stand' (weight on the near leg, the far knee a little forward, its heel up) or a walk phase (0..1) */
  legs: 'stand' | number;
  stride?: number; // the walk's step length (u)
  ex: SilExpr;
  hold?: 'lipstick' | 'keys' | null;
  bob?: number; // u, the body's rise and fall in a walk
};

export const EX_CALM: SilExpr = {lid: 0.12, smile: 0, brow: 0, browTilt: 0, curve: 0.12, open: 0, look: 0};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const lerpP = (a: Pt, b: Pt, t: number): Pt => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const mixEx = (a: SilExpr, b: SilExpr, t: number): SilExpr => ({
  lid: lerp(a.lid, b.lid, t),
  smile: lerp(a.smile, b.smile, t),
  brow: lerp(a.brow, b.brow, t),
  browTilt: lerp(a.browTilt, b.browTilt, t),
  curve: lerp(a.curve, b.curve, t),
  open: lerp(a.open, b.open, t),
  look: lerp(a.look, b.look, t),
});
const mixArm = (a: Arm, b: Arm, t: number, A: (x: Arm) => Pt): Arm => (t <= 0 ? a : t >= 1 ? b : {...(t < 0.5 ? a : b), to: lerpP(A(a), A(b), t), off: undefined, ha: lerp(a.ha, b.ha, t)});

/** a smooth limb outline through joints with a radius each; `bulge` swells one side mid-segment (+ the left of the
 *  direction of travel, - the right) */
const limb = (pts: Pt[], r: number[], bulge: number[] = []): V[] => {
  const n = pts.length;
  const nrm: Pt[] = pts.map((_, i) => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(n - 1, i + 1)];
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    return [-dy / L, dx / L];
  });
  const L: V[] = [];
  const R: V[] = [];
  for (let i = 0; i < n; i++) {
    L.push([pts[i][0] + nrm[i][0] * r[i], pts[i][1] + nrm[i][1] * r[i]]);
    R.push([pts[i][0] - nrm[i][0] * r[i], pts[i][1] - nrm[i][1] * r[i]]);
    if (i < n - 1 && bulge[i]) {
      const mx = (pts[i][0] + pts[i + 1][0]) / 2;
      const my = (pts[i][1] + pts[i + 1][1]) / 2;
      const rm = (r[i] + r[i + 1]) / 2;
      const nx = (nrm[i][0] + nrm[i + 1][0]) / 2;
      const ny = (nrm[i][1] + nrm[i + 1][1]) / 2;
      L.push([mx + nx * (rm + Math.max(0, bulge[i])), my + ny * (rm + Math.max(0, bulge[i]))]);
      R.push([mx - nx * (rm + Math.max(0, -bulge[i])), my - ny * (rm + Math.max(0, -bulge[i]))]);
    }
  }
  const e = pts[n - 1];
  const d = [pts[n - 1][0] - pts[n - 2][0], pts[n - 1][1] - pts[n - 2][1]];
  const dl = Math.hypot(d[0], d[1]) || 1;
  const capE: V = [e[0] + (d[0] / dl) * r[n - 1] * 0.85, e[1] + (d[1] / dl) * r[n - 1] * 0.85];
  const s = pts[0];
  const d0 = [pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]];
  const dl0 = Math.hypot(d0[0], d0[1]) || 1;
  const capS: V = [s[0] - (d0[0] / dl0) * r[0] * 0.85, s[1] - (d0[1] / dl0) * r[0] * 0.85];
  return [...L, capE, ...R.reverse(), capS];
};

// ---- the body (u) ------------------------------------------------------------------------------------------------------
const WAIST: Pt = [-2, -622];
const NECK_BASE: Pt = [-4, -820];
const HEAD_PIVOT: Pt = [2, -900]; // where the head turns on the neck (head space (-4, 30))
const HK = 1.25; // head units -> u (the head 125 u: eight heads)
const SHOULDER: Pt = [-8, -798];
const HIP: Pt = [-4, -522];
const UPPER = 172;
const FORE = 150;
const THIGH = 226;
const SHIN = 206;
const HEM = -262; // the midi dress's hem, just under the knee

// the torso's outline above the waist (it leans with the chest) and below it (it stays): front top-down, back top-down
// v4 fix (the art director: "a hard pointed cone"): a soft, round bust, its fullest point low (5), the underside full
const FRONT_UP: V[] = [[26, -814], [36, -795], [47, -776], [57, -757], [63, -740], [65, -724], [60, -708], [49, -698, 0.8], [38, -686], [33, -662]];
const BACK_UP: V[] = [[-34, -830], [-49, -800], [-53, -758], [-46, -712], [-37, -668]];
const FRONT_LO: V[] = [[27, -622], [34, -578], [43, -530], [45, -484]];
const BACK_LO: V[] = [[-30, -618], [-44, -580], [-70, -534], [-76, -502], [-66, -458]];

/** the head's matrix (head space -> body space), given the chest, neck and head tilts */
const headM = (p: WPose, up: Mx): Mx => chain(up, rot(-p.neck, NECK_BASE[0], NECK_BASE[1]), tr(HEAD_PIVOT[0], HEAD_PIVOT[1]), rot(-p.head), scl(HK), tr(4, -30));

/** the targets on her head (head space) */
const HEAD_PTS: Record<HeadKey, Pt> = {forehead: [22, -26], lips: [36, 30], temple: [8, -12]};
/** the wrist's default place from the head point it serves (body units): under the lips for a lipstick, in front of and
 *  below the brow for a palm on the forehead */
const HEAD_OFF: Record<HeadKey, Pt> = {forehead: [46, 48], lips: [-4, 88], temple: [30, 70]};

export type WomanP = {
  uid: string;
  x: number;
  y: number; // the floor under her
  size: number; // her height in px
  pose: WPose;
  pal: SilPal;
  flip?: boolean;
  /** the light's x on the body (u): where the skin is brightest (her front, by default) */
  rim?: number; // a warm rim on a dark ground (0..1)
  opacity?: number;
  /** draw only from the head down to this y (u), e.g. -560 for a bust (nothing below is drawn) */
  cropY?: number;
};

export const Woman: React.FC<WomanP> = ({uid, x, y, size, pose: p, pal, flip = false, rim = 0.6, opacity = 1, cropY}) => {
  const id = (n: string) => `wm${uid.replace(/[^A-Za-z0-9_-]/g, '')}-${n}`;
  const k = size / 1000;
  const [deep, shadow, half, hi] = pal.lit;
  const ink = pal.ink;
  const ink2 = mix(pal.ink, pal.dark ? '#3A3634' : '#5A5A5A', 0.45);
  const bob = p.bob ?? 0;
  // the upper body leans about the waist; everything above the waist goes through `up`
  const up: Mx = chain(tr(0, bob), rot(-p.chest, WAIST[0], WAIST[1]));
  const lo: Mx = tr(0, bob);
  const U = (q: V | Pt): V => {
    const [a, b] = ap(up, q[0], q[1]);
    return q.length > 2 ? [a, b, (q as V)[2] as number] : [a, b];
  };
  const Hm = headM(p, up);
  const H = (q: Pt): Pt => ap(Hm, q[0], q[1]);
  const sh: Pt = ap(up, SHOULDER[0], SHOULDER[1] - p.shrug);
  const shFar: Pt = ap(up, SHOULDER[0] + 6, SHOULDER[1] - p.shrug - 3);

  // ---- the legs ----
  const hipN: Pt = ap(lo, HIP[0], HIP[1]);
  const hipF: Pt = ap(lo, HIP[0] + 4, HIP[1] - 2);
  // a foot: its flat ankle `a0` (the ankle where the shoe stands flat) and its heel's lift; the shoe rolls about its ball
  // (heel up, the toe stays down) and the leg ends in the rolled ankle, so the leg and its shoe never part (v4 fix: the
  // far leg ended in a stump above the floor, its shoe lying apart on the floor)
  type Leg = {hip: Pt; knee: Pt; ank: Pt; a0: Pt; heel: number};
  const footM = (a0: Pt, heel: number): Mx => rot(heel * 17, a0[0] + 92, a0[1] + 93);
  const legIK = (hip: Pt, a0: Pt, heel = 0): Leg => {
    const ank = ap(footM(a0, heel), a0[0], a0[1]);
    const q = ik2(hip[0], hip[1], ank[0], ank[1], THIGH, SHIN, -1); // the knee bends forward
    const knee: Pt = [hip[0] + THIGH * dir(q[0])[0], hip[1] + THIGH * dir(q[0])[1]];
    return {hip, knee, ank, a0, heel};
  };
  let LN: Leg;
  let LF: Leg;
  if (p.legs === 'stand') {
    LN = legIK(hipN, [-10, -96]);
    LF = legIK(hipF, [2, -96], 0.55); // the far foot by the near one, its heel lifted a little (the knee eases forward)
  } else {
    // a calm, short walk in a fitted dress: the feet trade places, the lifted one swings forward
    const ph = p.legs;
    const L = p.stride ?? 120;
    const foot = (q: number): {x: number; lift: number} => {
      const u = ((q % 1) + 1) % 1;
      // stance 0..0.6 (the foot moves back on the floor), swing 0.6..1 (forward, lifted)
      if (u < 0.6) return {x: lerp(L / 2, -L / 2, u / 0.6), lift: 0};
      const s = (u - 0.6) / 0.4;
      return {x: lerp(-L / 2, L / 2, 0.5 - 0.5 * Math.cos(Math.PI * s)), lift: Math.sin(Math.PI * s) * 34};
    };
    const fn = foot(ph);
    const ff = foot(ph + 0.5);
    LN = legIK(hipN, [fn.x - 4, -96 - fn.lift], fn.lift > 1 ? 0.6 : 0);
    LF = legIK(hipF, [ff.x - 4, -96 - ff.lift], ff.lift > 1 ? 0.6 : 0);
  }

  // ---- the arms ----
  const target = (a: Arm, s0: Pt): Pt => {
    if (a.to === 'hang') return [s0[0] - 3, s0[1] + UPPER + FORE - 1.5];
    if (typeof a.to === 'string') {
      const t = H(HEAD_PTS[a.to]);
      const o = a.off ?? HEAD_OFF[a.to];
      return [t[0] + o[0], t[1] + o[1]];
    }
    return ap(up, a.to[0], a.to[1]);
  };
  type ArmOut = {sh: Pt; el: Pt; wr: Pt; ha: number; hand: Hand};
  const arm = (a: Arm, s0: Pt): ArmOut => {
    const t = target(a, s0);
    const q = ik2(s0[0], s0[1], t[0], t[1], UPPER, FORE, a.bend ?? -1);
    const el: Pt = [s0[0] + UPPER * dir(q[0])[0], s0[1] + UPPER * dir(q[0])[1]];
    const wr: Pt = [el[0] + FORE * dir(q[0] + q[1])[0], el[1] + FORE * dir(q[0] + q[1])[1]];
    return {sh: s0, el, wr, ha: a.ha + p.chest, hand: a.hand ?? 'relax'};
  };
  const AN = arm(p.near, sh);
  const AF = arm(p.far, shFar);

  // ---- paths ----
  const torsoFront = FRONT_UP.map(U);
  const torsoBack = BACK_UP.map(U);
  // the skirt: from the hips down to the hem over both knees (a fitted pencil line that follows the legs)
  const kneeFront = Math.max(LN.knee[0], LF.knee[0]) + 27;
  const kneeBack = Math.min(LN.knee[0], LF.knee[0]) - 33;
  const hemY = HEM + bob;
  const kF = Math.max(LN.knee[1], LF.knee[1]);
  void kF;
  const hemFront: V = [kneeFront, hemY + 2, 0.25];
  const hemBack: V = [Math.min(kneeBack, -30), hemY - 3, 0.25];
  const lower: V[] = FRONT_LO.map((q) => [q[0], q[1] + bob] as V);
  const lowerBack: V[] = BACK_LO.map((q) => [q[0], q[1] + bob] as V);
  // the dress: the strap over the shoulder, the V's edge, the front down to the hem, the back up to the strap
  const vTop = U([18, -826]);
  const vBot = U([34, -776]); // v4 fix: the V's bottom raised (classy, never deep)
  const strapBack = U([-28, -836]);
  const dress: V[] = [
    U([-14, -838]),
    vTop,
    [vBot[0], vBot[1], 0.1],
    ...torsoFront.slice(3),
    ...lower,
    [lerp(lower[3][0], hemFront[0], 0.5) + 2, lerp(lower[3][1], hemFront[1], 0.45)],
    hemFront,
    [lerp(hemFront[0], hemBack[0], 0.5), hemY + 6, 0.6],
    hemBack,
    [lerp(lowerBack[4][0], hemBack[0], 0.5) - 2, lerp(lowerBack[4][1], hemBack[1], 0.5)],
    ...[...lowerBack].reverse(),
    ...[...torsoBack].reverse().slice(0, 4),
    strapBack,
  ];
  // the skin of the neck and the chest (under the dress): from the head's neck down into the V
  const nF = H([14, 47]);
  const nB = H([-21.6, 27.6]);
  const neckSkin: V[] = [nB, [lerp(nB[0], torsoBack[0][0], 0.5) + 3, lerp(nB[1], torsoBack[0][1], 0.5)], torsoBack[0], U([-20, -812]), U([0, -800]), U([24, -786]), [vBot[0] + 4, vBot[1] + 6], torsoFront[3], torsoFront[2], torsoFront[1], torsoFront[0], [lerp(nF[0], torsoFront[0][0], 0.45) + 2, lerp(nF[1], torsoFront[0][1], 0.5)], nF, H([10, 30]), H([-8, 18]), H([-20, 18])];

  // ---- the hands ----
  // hand space: the wrist at the origin, the fingers along +y, the thumb toward -x (her near hand seen from its back)
  const HAND: Record<Hand, V[]> = {
    relax: [[-11, 0], [11, 0], [14, 22], [15, 44], [12, 62], [8, 78], [2, 88, 0.6], [-4, 84], [-7, 66], [-8, 50], [-16, 44, 0.5], [-19, 32, 0.5], [-14, 14]],
    palm: [[-12, 0], [12, 0], [16, 24], [17, 50], [14, 74], [8, 92, 0.6], [0, 96, 0.6], [-6, 88], [-9, 66], [-11, 46], [-22, 36, 0.5], [-24, 26, 0.5], [-15, 12]],
    hold: [[-12, 0], [12, 0], [16, 22], [17, 42], [12, 56], [2, 60, 0.5], [-8, 56], [-12, 46], [-20, 40, 0.5], [-21, 28, 0.5], [-14, 12]],
    hair: [[-12, 0], [12, 0], [15, 24], [18, 46], [16, 70], [10, 86, 0.6], [2, 88, 0.6], [-6, 78], [-10, 58], [-12, 42], [-20, 34, 0.5], [-21, 24, 0.5], [-15, 10]],
  };
  const handM = (A: ArmOut, far: boolean): Mx => chain(tr(A.wr[0], A.wr[1]), rot(-A.ha), scl(far ? 0.94 : 1));
  const handD = (A: ArmOut, far: boolean) => pathOf(HAND[A.hand], true, handM(A, far));
  const fingerLines = (A: ArmOut) => {
    if (A.hand === 'hold') return '';
    const m = handM(A, false);
    const f = A.hand === 'palm' ? [[2.5, 50, 90], [7.5, 48, 86]] : [[3, 46, 82], [8, 44, 76]];
    return f.map(([fx, a, b]) => pathOf([[fx, a], [fx + 0.6, (a + b) / 2], [fx, b]] as V[], false, m)).join('');
  };
  const armD = (A: ArmOut, far: boolean) => {
    const r = far ? [24, 15, 10.5] : [26, 16.5, 11];
    // two capsules that overlap round the elbow (a folded arm keeps a round elbow, never a spike)
    return pathOf(limb([A.sh, A.el], [r[0], r[1]], [far ? 3 : 4])) + pathOf(limb([A.el, A.wr], [r[1], r[2]], [3]));
  };
  const armGrad = (A: ArmOut, key: string, far: boolean) => {
    const xs = [A.sh[0], A.el[0], A.wr[0]];
    const ys = [A.sh[1], A.el[1], A.wr[1]];
    const x1 = Math.max(...xs) + 30;
    const x0 = Math.min(...xs) - 30;
    const ym = (Math.min(...ys) + Math.max(...ys)) / 2;
    return (
      <linearGradient id={id(key)} gradientUnits="userSpaceOnUse" x1={x1} y1={ym - 30} x2={x0} y2={ym + 30}>
        <stop offset="0" stopColor={far ? mix(deep, ink, 0.45) : half} />
        <stop offset="0.5" stopColor={far ? mix(deep, ink, 0.55) : mix(half, shadow, 0.6)} />
        <stop offset="1" stopColor={far ? mix(deep, ink, 0.62) : mix(shadow, deep, 0.4)} />
      </linearGradient>
    );
  };
  // the prop in the near hand
  const prop = (() => {
    if (!p.hold) return null;
    const m = handM(AN, false);
    if (p.hold === 'lipstick') {
      const c = ap(m, 2, 52);
      const tm = chain(tr(c[0], c[1]), rot(-AN.ha + 180));
      return (
        <g>
          <path d={pathOf([[-7, -18, 0.2], [7, -18, 0.2], [7, 20, 0.2], [-7, 20, 0.2]], true, tm)} fill="#B88A4E" />
          <path d={pathOf([[-6, -34, 0.6], [5, -30, 0.2], [6, -18, 0.2], [-6, -18, 0.2]], true, tm)} fill="#8A2232" />
          <path d={pathOf([[-4, -18], [-2, -18], [-2, 20], [-4, 20]], true, tm)} fill="#F1D8A4" opacity={0.7} />
        </g>
      );
    }
    // keys: a fob and two keys hanging from the fingers
    const c = ap(m, 0, 66);
    const tm = tr(c[0], c[1]);
    return (
      <g>
        <circle cx={c[0]} cy={c[1] + 6} r={9} fill="none" stroke="#C9A46A" strokeWidth={3} />
        <path d={pathOf([[-10, 14], [10, 14], [12, 44], [-12, 44]], true, tm)} fill="#1A1A1A" />
        <path d={pathOf([[4, 12], [10, 12], [12, 58], [6, 58]], true, tm)} fill="#C9C9C9" />
      </g>
    );
  })();

  // ---- the shoes and the feet ----
  const shoe = (L: Leg, far: boolean) => {
    // an elegant pump in the ankle's frame (u): the heel cup and a stiletto under the ankle, the arch, the ball, a pointed
    // toe; the instep's skin above the vamp. A lifted heel rolls it about the ball.
    void far;
    const a = L.a0;
    const m = footM(L.a0, L.heel);
    const P = (q: Pt): V => ap(m, a[0] + q[0], a[1] + q[1]);
    const S = (q: Pt, k: number): V => [...P(q), k] as V;
    const foot: V[] = [P([-15, -4]), P([13, -8]), P([30, 20]), P([50, 48]), P([70, 66]), P([40, 60]), P([4, 44]), P([-18, 22])];
    const pump: V[] = [
      P([-16, 10]),
      P([-21, 44]),
      S([-17, 58], 0.3),
      S([-13, 95], 0.1),
      S([-7, 95], 0.1),
      S([-4, 60], 0.3),
      P([22, 72]),
      P([50, 86]),
      P([76, 93]),
      S([112, 92], 0.25),
      S([116, 87], 0.25),
      P([96, 78]),
      P([70, 66]),
      P([46, 58]),
      P([18, 46]),
      P([-4, 28]),
    ];
    return {foot: pathOf(foot), pump: pathOf(pump)};
  };
  const legD = (L: Leg, far: boolean) => pathOf(limb([[L.hip[0], L.hip[1] - 20], L.knee, L.ank], far ? [44, 25, 12] : [46, 26, 12.5], [0, -12]));
  const SN = shoe(LN, false);
  const SF = shoe(LF, true);

  // ---- the long hair down her back: from the skull's back (it turns with the head) falling down behind the shoulders ----
  const hb = [H([-30, -40]), H([-44, -20]), H([-50, 6])];
  const fall: V[] = [
    H([-20, -46]),
    hb[0],
    hb[1],
    hb[2],
    [hb[2][0] - 12, hb[2][1] + 70],
    U([-74, -760]),
    U([-70, -712]),
    U([-60, -676, 0.6]),
    U([-48, -686]),
    U([-40, -720]),
    U([-34, -780]),
    U([-36, -818]),
    H([-26, 26]),
    H([-30, 4]),
  ];

  const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(flip ? -k : k).toFixed(5)} ${k.toFixed(5)})`;
  const clip = cropY !== undefined;
  return (
    <g transform={tf} opacity={opacity}>
      <defs>
        <linearGradient id={id('skin')} gradientUnits="userSpaceOnUse" x1={60} y1={-800} x2={-40} y2={-760}>
          <stop offset="0" stopColor={mix(half, hi, 0.15)} />
          <stop offset="0.35" stopColor={half} />
          <stop offset="0.7" stopColor={shadow} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        {armGrad(AN, 'arm', false)}
        {armGrad(AF, 'farm', true)}
        <linearGradient id={id('leg')} x1="1" y1="0" x2="0" y2="0.1">
          <stop offset="0" stopColor={half} />
          <stop offset="0.4" stopColor={shadow} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={id('far')} x1="1" y1="0" x2="0" y2="0.1">
          <stop offset="0" stopColor={mix(shadow, deep, 0.4)} />
          <stop offset="1" stopColor={mix(deep, ink, 0.55)} />
        </linearGradient>
        <linearGradient id={id('sat')} gradientUnits="userSpaceOnUse" x1={70} y1={0} x2={10} y2={0}>
          <stop offset="0" stopColor={hi} stopOpacity={0.55} />
          <stop offset="0.5" stopColor={shadow} stopOpacity={0.16} />
          <stop offset="1" stopColor={shadow} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={id('hair')} gradientUnits="userSpaceOnUse" x1={-20} y1={-900} x2={-80} y2={-700}>
          <stop offset="0" stopColor={mix(ink, '#FFFFFF', 0.12)} />
          <stop offset="0.5" stopColor={ink} />
        </linearGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
        <clipPath id={id('legs')}>
          <rect x={-500} y={HEM + bob - 70} width={1000} height={400} />
        </clipPath>
        <clipPath id={id('dress')}>
          <path d={pathOf(dress)} />
        </clipPath>
        {clip ? (
          <clipPath id={id('crop')}>
            <rect x={-400} y={-1200} width={800} height={1200 + (cropY as number)} />
          </clipPath>
        ) : null}
      </defs>
      <g clipPath={clip ? `url(#${id('crop')})` : undefined}>
        {/* the far arm, behind her (in shadow) */}
        <path d={armD(AF, true)} fill={`url(#${id('farm')})`} />
        <path d={handD(AF, true)} fill={`url(#${id('farm')})`} />
        {/* the far leg and shoe (the legs only below the skirt: the dress hides the thighs) */}
        <path d={legD(LF, true)} fill={`url(#${id('far')})`} clipPath={`url(#${id('legs')})`} />
        <path d={SF.foot} fill={`url(#${id('far')})`} />
        <path d={SF.pump} fill={ink2} />
        {/* the near leg and shoe */}
        <path d={legD(LN, false)} fill={`url(#${id('leg')})`} clipPath={`url(#${id('legs')})`} />
        <path d={SN.foot} fill={`url(#${id('leg')})`} />
        <path d={SN.pump} fill={ink} />
        <path d={pathOf([[LN.ank[0] + 30, -30], [LN.ank[0] + 70, -6], [LN.ank[0] + 104, -4]], false)} stroke={half} strokeWidth={2.4} fill="none" opacity={0.35} strokeLinecap="round" />
        {/* the neck and the chest's V (skin), then the dress over it */}
        <path d={pathOf(neckSkin)} fill={`url(#${id('skin')})`} />
        {/* the shadow the jaw throws on the neck: a soft deeper step under the chin */}
        <path d={pathOf([H([-14, 34]), H([12, 46]), H([8, 58]), H([-12, 56])])} fill={deep} opacity={0.22} filter={`url(#${id('soft')})`} />
        <path d={pathOf(dress)} fill={ink} />
        {/* the satin's sheen: the warm light inside the dress's front curves (bust, belly, hip, thigh), soft */}
        <g clipPath={`url(#${id('dress')})`}>
          <path d={pathOf([[torsoFront[3][0] - 12, torsoFront[3][1] + 8], [torsoFront[4][0] - 14, torsoFront[4][1] + 2], [torsoFront[5][0] - 18, torsoFront[5][1] - 2], [torsoFront[5][0] - 34, torsoFront[5][1] - 4], [torsoFront[4][0] - 32, torsoFront[4][1]], [torsoFront[3][0] - 26, torsoFront[3][1] + 10]])} fill={half} opacity={0.2 * rim} filter={`url(#${id('soft')})`} />
          <path d={pathOf([[lower[1][0] - 4, lower[1][1]], [lower[2][0] - 2, lower[2][1]], [lower[3][0] - 3, lower[3][1] + 40], [lower[3][0] - 10, lower[3][1] + 110], [lower[3][0] - 30, lower[3][1] + 60], [lower[2][0] - 26, lower[2][1]], [lower[1][0] - 22, lower[1][1] + 10]])} fill={hi} opacity={0.16 * rim} filter={`url(#${id('soft')})`} />
          <path d={pathOf([U([-58, -760]), U([-52, -700]), U([-40, -640]), U([-56, -560]), U([-66, -506]), U([-58, -506]), U([-48, -566]), U([-34, -640]), U([-44, -700]), U([-50, -760])])} fill={mix(ink, '#FFFFFF', 0.1)} opacity={0.5} filter={`url(#${id('soft')})`} />
        </g>
        {/* the V's edge: a hairline of light on the dress's lapel */}
        <path d={pathOf([vTop, [vBot[0], vBot[1]]], false)} stroke={half} strokeWidth={2} fill="none" opacity={0.4} />
        {/* the hair's fall down her back */}
        <path d={pathOf(fall)} fill={`url(#${id('hair')})`} />
        <path d={pathOf([hb[0], hb[1], hb[2], [hb[2][0] - 10, hb[2][1] + 60], U([-66, -740])], false)} stroke={mix(ink, '#FFFFFF', 0.22)} strokeWidth={2} fill="none" opacity={0.6} />
        {/* the head */}
        <g transform={`matrix(${Hm.map((v) => v.toFixed(5)).join(' ')})`}>
          <SilHead view="profile" look={LOOK} ex={p.ex} pal={pal} uid={`${uid}h`} tilt={-(p.head + p.neck + p.chest)} />
        </g>
        {/* the near arm and hand, over her */}
        <path d={armD(AN, false)} fill={`url(#${id('arm')})`} />
        <path d={pathOf([U([-26, -838]), U([6, -838]), [AN.sh[0] + 20, AN.sh[1] - 2], [AN.sh[0] + 8, AN.sh[1] + 12], [AN.sh[0] - 16, AN.sh[1] + 10], [AN.sh[0] - 24, AN.sh[1] - 8]])} fill={ink} />
        {p.hold === 'keys' ? null : prop}
        <path d={handD(AN, false)} fill={`url(#${id('arm')})`} />
        <path d={fingerLines(AN)} stroke={deep} strokeWidth={1.4} fill="none" opacity={0.45} />
        {/* a thin gold bangle */}
        {(() => {
          const c = lerpP(AN.wr, AN.el, 0.1);
          const dx = AN.el[0] - AN.wr[0];
          const dy = AN.el[1] - AN.wr[1];
          const L = Math.hypot(dx, dy) || 1;
          const nx = -dy / L;
          const ny = dx / L;
          return <line x1={c[0] + nx * 12.5} y1={c[1] + ny * 12.5} x2={c[0] - nx * 12.5} y2={c[1] - ny * 12.5} stroke="#D9B477" strokeWidth={4} strokeLinecap="round" opacity={0.85} />;
        })()}
        {p.hold === 'keys' ? prop : null}
      </g>
    </g>
  );
};

/** her poses (WPose): the film's moments */
const AT_SIDE: Arm = {to: [30, -494], bend: -1, hand: 'relax', ha: 14};
const FAR_SIDE: Arm = {to: 'hang', bend: 1, hand: 'relax', ha: 0};
export const POSES = {
  // at the mirror, the lipstick at her lips, the chin a touch up toward the glass
  lipstick: {head: 6, neck: 2, chest: 0, shrug: 0, near: {to: 'lips', bend: -1, hand: 'hold', ha: 178}, far: FAR_SIDE, legs: 'stand', ex: {...EX_CALM, lid: 0.45, look: 0.3}, hold: 'lipstick'} as WPose,
  // the lipstick lowered, still, listening (the voice message)
  listen: {head: -5, neck: -2, chest: 0, shrug: 3, near: {to: [122, -652], bend: -1, hand: 'hold', ha: 160}, far: FAR_SIDE, legs: 'stand', ex: {...EX_CALM, lid: 0.32, curve: -0.25, brow: 0.6, browTilt: 5, look: -0.2}, hold: 'lipstick'} as WPose,
  // „აუუუ": the head back on the neck, the shoulders up with the breath, a palm to the forehead
  groan: {head: 18, neck: 9, chest: 3, shrug: 12, near: {to: 'forehead', off: [36, 26], bend: -1, hand: 'palm', ha: 234}, far: FAR_SIDE, legs: 'stand', ex: {lid: 0.05, smile: 0, brow: 1.5, browTilt: 12, curve: -0.6, open: 0.55, look: 0}, hold: null} as WPose,
  // the sigh out: the shoulders drop, the head comes forward, the hand still at the brow
  sigh: {head: 5, neck: 2, chest: 1, shrug: -6, near: {to: 'forehead', off: [38, 22], bend: -1, hand: 'palm', ha: 232}, far: FAR_SIDE, legs: 'stand', ex: {lid: 0.05, smile: 0, brow: 0.6, browTilt: 14, curve: -0.7, open: 0.25, look: 0}, hold: null} as WPose,
  // calm, at ease: a hand resting at her collarbone, the chin up into the light, a small smile
  calm: {head: 9, neck: 3, chest: 0, shrug: -2, near: {to: [94, -730], bend: -1, hand: 'relax', ha: 214}, far: FAR_SIDE, legs: 'stand', ex: {lid: 0.08, smile: 0.6, brow: 0.4, browTilt: 0, curve: 0.75, open: 0, look: 0}, hold: null} as WPose,
  stand: {head: 3, neck: 1, chest: 0, shrug: 0, near: AT_SIDE, far: FAR_SIDE, legs: 'stand', ex: EX_CALM, hold: null} as WPose,
  worried: {head: -8, neck: -3, chest: -1, shrug: 4, near: AT_SIDE, far: FAR_SIDE, legs: 'stand', ex: {lid: 0.3, smile: 0, brow: 0.8, browTilt: 12, curve: -0.4, open: 0, look: -0.2}, hold: null} as WPose,
};

/** where an arm's wrist is in a pose, in body space before the chest's lean (a head point through that pose's head) */
const wristOf = (q: WPose, A: Arm): Pt => {
  if (A.to === 'hang') return [SHOULDER[0] + 3, SHOULDER[1] - q.shrug + UPPER + FORE - 4.5];
  if (typeof A.to !== 'string') return A.to;
  const up: Mx = rot(-q.chest, WAIST[0], WAIST[1]);
  const t0 = ap(headM(q, up), HEAD_PTS[A.to][0], HEAD_PTS[A.to][1]);
  const o = A.off ?? HEAD_OFF[A.to];
  return ap(rot(q.chest, WAIST[0], WAIST[1]), t0[0] + o[0], t0[1] + o[1]);
};

/** a pose between two (the arms through their wrists: never a joint flipping) */
export const mixW = (a: WPose, b: WPose, t: number): WPose => {
  if (t <= 0) return a;
  if (t >= 1) return b;
  return {
    head: lerp(a.head, b.head, t),
    neck: lerp(a.neck, b.neck, t),
    chest: lerp(a.chest, b.chest, t),
    shrug: lerp(a.shrug, b.shrug, t),
    near: mixArm(a.near, b.near, t, (A) => wristOf(A === a.near ? a : b, A)),
    far: mixArm(a.far, b.far, t, (A) => wristOf(A === a.far ? a : b, A)),
    legs: t < 0.5 ? a.legs : b.legs,
    stride: lerp(a.stride ?? 120, b.stride ?? 120, t),
    ex: mixEx(a.ex, b.ex, t),
    hold: t < 0.5 ? a.hold : b.hold,
    bob: lerp(a.bob ?? 0, b.bob ?? 0, t),
  };
};
