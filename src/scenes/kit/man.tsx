// v4 (the owner, 2026-10-14: "draw the passer-by properly and beautifully"): HIM, the young man who scans her card, drawn
// for this film alone in the studio's "Silhouette light" style: a refined adult of about seven and a half heads (the kit's
// SilHead in profile, a clean short cut, clean-shaven, no cartoon face), a tailored dark wool overcoat to mid-thigh with its
// collar up, slim dark trousers a step lighter than the coat, leather sneakers with a pale sole, his phone in his hand. A
// crisp near-black silhouette; only the skin (the face, a sliver of neck, the hands) is lit by the scene's one light.
//
// He walks (a real gait: the stance leg carries him, the swing leg bends and passes, the arms swing against the legs, the
// coat's hem and the body rise and fall), stops, and raises his phone at her windscreen: the near arm lifts the phone to
// his eye line, the head drops a little to its screen.
//
// Units: 1000 u = his height, the floor at y = 0, facing +x (`flip` faces him left). Pure drawing code, frame-driven.
import {FIG} from '../../lib/layer';
import React from 'react';
import {mix} from '../illo/palette';
import {ap, chain, dir, ik2, rot, scl, tr, type Mx, type Pt} from '../illo/rig';
import {pathOf, SilHead, type HeadLook, type SilExpr, type SilPal, type V} from './sil/silhead';

const LOOK: HeadLook = {fem: false, age: 0, hair: 'swept', hairCol: '#0B0B0B', beard: null, glasses: null, hat: null, hatCol: '#0B0B0B', earring: null};
const EX: SilExpr = {lid: 0.36, smile: 0, brow: 0, browTilt: 0, curve: 0, open: 0, look: -0.2};

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

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
const HK = 1.3; // head units -> u (a 130 u head on a 1000 u man: about 7.7 heads)
const HEAD_PIVOT: Pt = [6, -893];
const NECK_BASE: Pt = [0, -815];
const SHOULDER: Pt = [-6, -800];
const HIP: Pt = [-2, -505];
const UPPER = 182;
const FORE = 160;
const THIGH = 245;
const SHIN = 232;

/** a man's pose: the walk's phase (0..1, null = standing), how far the phone is raised (0..1), the head's nod */
export type MPose = {walk: number | null; stride?: number; raise: number; nod: number; settle?: number};

export type ManP = {uid: string; x: number; y: number; size: number; pose: MPose; pal: SilPal; flip?: boolean; opacity?: number; phone?: boolean};

export const Man: React.FC<ManP> = ({uid, x, y, size, pose: p, pal, flip = false, opacity = 1, phone = true}) => {
  const id = (n: string) => `mn${uid.replace(/[^A-Za-z0-9_-]/g, '')}-${n}`;
  const k = size / 1000;
  const [deep, shadow, half, hi] = pal.lit;
  const ink = pal.ink;
  const ink2 = mix(pal.ink, pal.dark ? '#4A4A4A' : '#6A6A6A', 0.4);
  const walking = p.walk !== null;
  const ph = walking ? (((p.walk as number) % 1) + 1) % 1 : 0;
  const L = p.stride ?? 300;
  // the gait: each foot's place along the floor and its lift; the body bobs twice a cycle (lowest at the double support)
  const foot = (q: number): {x: number; lift: number; roll: number} => {
    const u = ((q % 1) + 1) % 1;
    if (u < 0.6) {
      const s = u / 0.6;
      return {x: lerp(L / 2, -L / 2, s), lift: 0, roll: s > 0.8 ? (s - 0.8) / 0.2 : 0};
    }
    const s = (u - 0.6) / 0.4;
    const e = 0.5 - 0.5 * Math.cos(Math.PI * s);
    return {x: lerp(-L / 2, L / 2, e), lift: Math.sin(Math.PI * s) * 70 * (1 - 0.4 * s), roll: s < 0.3 ? 1 - s / 0.3 : 0};
  };
  const set = p.settle ?? 1; // 0 walking .. 1 stood still
  const bob = walking ? -12 * (0.5 - 0.5 * Math.cos(4 * Math.PI * ph)) * (1 - set) : 0;
  const lean = walking ? 3 * (1 - set) : 0; // walking, the body leans a little into the step
  const up: Mx = chain(tr(0, bob), rot(lean, HIP[0], HIP[1]));
  const U = (q: Pt): V => ap(up, q[0], q[1]);
  const hipN: Pt = [HIP[0], HIP[1] + bob];
  const hipF: Pt = [HIP[0] + 6, HIP[1] + bob - 2];
  type Leg = {hip: Pt; knee: Pt; ank: Pt; roll: number; lift: number};
  const legTo = (hip: Pt, ank: Pt, roll: number, lift: number): Leg => {
    const q = ik2(hip[0], hip[1], ank[0], ank[1], THIGH, SHIN, -1);
    const knee: Pt = [hip[0] + THIGH * dir(q[0])[0], hip[1] + THIGH * dir(q[0])[1]];
    return {hip, knee, ank, roll, lift};
  };
  const fn = walking ? foot(ph) : {x: 0, lift: 0, roll: 0};
  const ff = walking ? foot(ph + 0.5) : {x: 0, lift: 0, roll: 0};
  const stN: Pt = [-6, -36];
  const stF: Pt = [30, -36];
  const LN = legTo(hipN, [lerp(fn.x - 6, stN[0], set), lerp(-40 - fn.lift, stN[1], set)], fn.roll * (1 - set), fn.lift * (1 - set));
  const LF = legTo(hipF, [lerp(ff.x - 6, stF[0], set), lerp(-40 - ff.lift, stF[1], set)], ff.roll * (1 - set), ff.lift * (1 - set));
  // the arms: swinging against the legs while he walks; the near one lifts the phone to his eye line
  const sh: Pt = ap(up, SHOULDER[0], SHOULDER[1]);
  const shF: Pt = ap(up, SHOULDER[0] + 8, SHOULDER[1] - 4);
  const swingN = walking ? -16 * Math.sin(2 * Math.PI * ph) * (1 - set) : 0;
  const swingF = -swingN;
  const hang = (s0: Pt, sw: number, bendE: number): {el: Pt; wr: Pt; ha: number} => {
    const a1 = 4 + sw;
    const el: Pt = [s0[0] + UPPER * dir(a1)[0], s0[1] + UPPER * dir(a1)[1]];
    const a2 = a1 + bendE + Math.max(0, sw) * 0.6;
    const wr: Pt = [el[0] + FORE * dir(a2)[0], el[1] + FORE * dir(a2)[1]];
    return {el, wr, ha: a2};
  };
  const Hm0 = (nod: number): Mx => chain(up, rot(-nod * 0.4, NECK_BASE[0], NECK_BASE[1]), tr(HEAD_PIVOT[0], HEAD_PIVOT[1]), rot(nod * 0.6), scl(HK), tr(4, -30));
  const nod = p.nod + 8 * p.raise;
  const Hm = Hm0(nod);
  const H = (q: Pt): Pt => ap(Hm, q[0], q[1]);
  // the phone up: the wrist in front of his chest at the eye's height, the forearm rising toward the car
  const eye = H([28, 0]);
  const raised: Pt = [eye[0] + 168, eye[1] + 96];
  const hangN = hang(sh, swingN, 14);
  const wrT: Pt = [lerp(hangN.wr[0], raised[0], p.raise), lerp(hangN.wr[1], raised[1], p.raise)];
  const qN = ik2(sh[0], sh[1], wrT[0], wrT[1], UPPER, FORE, -1);
  const elN: Pt = [sh[0] + UPPER * dir(qN[0])[0], sh[1] + UPPER * dir(qN[0])[1]];
  const AN = {el: elN, wr: wrT, ha: lerp(hangN.ha, 172, p.raise)};
  const AF = hang(shF, swingF - 6, 6);

  // ---- the coat: shoulders, chest, the collar up, to mid-thigh; its hem swings with the stride ----
  const kneeF = Math.max(LN.knee[0], LF.knee[0]);
  const kneeB = Math.min(LN.knee[0], LF.knee[0]);
  const hemY = -400 + bob;
  const coat: V[] = [
    U([-30, -860]),
    U([0, -868]),
    U([30, -858]),
    U([34, -832]),
    U([50, -800]),
    U([62, -760]),
    U([64, -700]),
    U([58, -620]),
    U([56, -540]),
    [Math.max(60, kneeF + 18), -470 + bob],
    [Math.max(66, kneeF + 30) + 6, hemY + 4, 0.3],
    [lerp(Math.max(66, kneeF + 30), Math.min(-66, kneeB - 30), 0.5), hemY + 10],
    [Math.min(-64, kneeB - 32) - 6, hemY, 0.3],
    [Math.min(-60, kneeB - 14), -470 + bob],
    U([-58, -540]),
    U([-60, -640]),
    U([-66, -730]),
    U([-62, -800]),
    U([-48, -846]),
  ];
  // the trousers (a step lighter than the coat: his legs read apart from it) and the sneakers
  const legD = (Lg: Leg) => pathOf(limb([[Lg.hip[0], Lg.hip[1] - 20], Lg.knee, Lg.ank], [50, 34, 25], [0, -4]));
  const shoe = (Lg: Leg) => {
    const a = Lg.ank;
    const r = rot(-Lg.roll * 22 + Lg.lift * 0.06, a[0] + 80, a[1] + 36);
    const P = (q: Pt): V => ap(r, q[0], q[1]);
    const f0 = a[1] + 36; // the floor under this foot (a lifted foot carries its shoe up)
    const upper: V[] = [P([a[0] - 30, f0 - 46]), P([a[0] + 16, f0 - 58]), P([a[0] + 62, f0 - 44]), P([a[0] + 104, f0 - 32]), [...P([a[0] + 116, f0 - 18]), 0.5] as V, P([a[0] + 106, f0 - 10]), P([a[0] - 32, f0 - 10])];
    const sole: V[] = [[...P([a[0] - 36, f0 - 14]), 0.3] as V, P([a[0] + 112, f0 - 14]), [...P([a[0] + 120, f0 - 4]), 0.4] as V, [...P([a[0] + 108, f0]), 0.3] as V, [...P([a[0] - 32, f0]), 0.3] as V];
    return {upper: pathOf(upper), sole: pathOf(sole)};
  };
  const SN = shoe(LN);
  const SF = shoe(LF);
  // the hands: a relaxed hand (walking), the phone hand (closed round the phone)
  const HAND: V[] = [[-15, 0], [15, 0], [19, 26], [19, 54], [14, 80], [4, 92, 0.6], [-6, 86], [-9, 62], [-11, 46], [-21, 38, 0.5], [-24, 26, 0.5], [-18, 10]];
  const GRIP: V[] = [[-14, 0], [14, 0], [19, 18], [24, 34], [22, 52], [12, 60, 0.5], [2, 56], [-6, 62, 0.5], [-14, 54], [-15, 40], [-22, 30, 0.5], [-21, 18, 0.5], [-16, 8]];
  const handM = (wr: Pt, ha: number): Mx => chain(tr(wr[0], wr[1]), rot(-ha));
  const nF = H([14, 47]);
  const nB = H([-21.6, 27.6]);
  const neck: V[] = [nB, U([-26, -838]), U([24, -836]), nF, H([0, 44])];
  // his phone in the raised hand: a dark slab, its screen's glow on his hand and face
  const phoneM = chain(handM(AN.wr, AN.ha), tr(4, 46), rot(-AN.ha + 186 + 80 * (1 - p.raise)));
  const tf = `translate(${x.toFixed(2)} ${y.toFixed(2)}) scale(${(flip ? -k : k).toFixed(5)} ${k.toFixed(5)})`;
  return (
    <g className={FIG} transform={tf} opacity={opacity}>
      <defs>
        <linearGradient id={id('skin')} gradientUnits="userSpaceOnUse" x1={80} y1={-700} x2={-60} y2={-640}>
          <stop offset="0" stopColor={hi} />
          <stop offset="0.3" stopColor={half} />
          <stop offset="0.66" stopColor={shadow} />
          <stop offset="1" stopColor={deep} />
        </linearGradient>
        <linearGradient id={id('coat')} gradientUnits="userSpaceOnUse" x1={70} y1={-800} x2={-40} y2={-500}>
          <stop offset="0" stopColor={mix(ink, '#FFFFFF', 0.1)} />
          <stop offset="0.35" stopColor={ink} />
        </linearGradient>
        <filter id={id('soft')} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation={6} />
        </filter>
      </defs>
      {!pal.dark ? <ellipse cx={8} cy={-1} rx={170} ry={10} fill="#000" opacity={0.08} /> : null}
      {/* the far arm and its hand (behind him) */}
      <path d={pathOf(limb([AF.el === undefined ? shF : shF, AF.el, AF.wr], [30, 25, 20], [2, 2]))} fill={ink2} />
      <path d={pathOf(HAND, true, handM(AF.wr, AF.ha))} fill={mix(shadow, deep, 0.5)} />
      {/* the far leg and sneaker */}
      <path d={legD(LF)} fill={mix(ink2, '#000', 0.2)} />
      <path d={SF.upper} fill={mix(ink2, '#000', 0.2)} />
      <path d={SF.sole} fill={pal.dark ? '#7A7A7A' : '#D4D4D4'} />
      {/* the near leg and sneaker */}
      <path d={legD(LN)} fill={ink2} />
      <path d={SN.upper} fill={ink} />
      <path d={SN.sole} fill={pal.dark ? '#9A9A9A' : '#F2F2F2'} />
      <path d={SN.sole} fill="none" stroke={pal.dark ? '#5A5A5A' : '#BDBDBD'} strokeWidth={2} />
      {/* the neck, the coat over it */}
      <path d={pathOf(neck)} fill={`url(#${id('skin')})`} />
      <path d={pathOf(coat)} fill={`url(#${id('coat')})`} />
      {/* the coat's collar (up), its lapel line and a button */}
      <path d={pathOf([U([-40, -852]), U([-20, -900]), U([10, -896]), U([28, -862]), U([14, -846]), U([-18, -842])])} fill={ink} />
      <path d={pathOf([U([26, -846]), U([44, -770]), U([48, -700])], false)} stroke={mix(ink, '#FFFFFF', 0.2)} strokeWidth={2.4} fill="none" opacity={0.7} />
      <path d={pathOf([U([-62, -790]), U([-66, -700]), U([-60, -600])], false)} stroke={mix(ink, '#FFFFFF', 0.16)} strokeWidth={8} fill="none" opacity={0.5} filter={`url(#${id('soft')})`} />
      {/* the head */}
      <g transform={`matrix(${Hm.map((v) => v.toFixed(5)).join(' ')})`}>
        <SilHead view="profile" look={LOOK} ex={{...EX, look: -0.2 - 0.5 * p.raise}} pal={pal} uid={`${uid}h`} tilt={-nod} />
      </g>
      {/* the near arm (the coat's sleeve), the hand, the phone */}
      <path d={pathOf(limb([sh, AN.el, AN.wr], [34, 28, 22], [3, 2]))} fill={ink} />
      <path d={pathOf(limb([sh, AN.el, AN.wr], [34, 28, 22], [3, 2]))} fill="none" stroke={mix(ink, '#FFFFFF', 0.16)} strokeWidth={3} opacity={0.6} />
      {phone ? (
        <g>
          {/* edge-on: a thin dark slab, its screen's cold light on the side that faces him */}
          <path d={pathOf([[-7, -76, 0.3], [7, -76, 0.3], [7, 76, 0.3], [-7, 76, 0.3]], true, phoneM)} fill="#1A1A1E" />
          <path d={pathOf([[-7, -70], [-3, -70], [-3, 70], [-7, 70]], true, phoneM)} fill="#BFD0F0" opacity={0.55 * p.raise} />
        </g>
      ) : null}
      <path d={pathOf(p.raise > 0.4 ? GRIP : HAND, true, handM(AN.wr, AN.ha))} fill={`url(#${id('skin')})`} />
    </g>
  );
};
