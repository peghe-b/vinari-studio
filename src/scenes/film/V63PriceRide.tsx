// v63-price-ride: the 187 measured months of Geostat's used-car index built as a rollercoaster track (the real
// values, copied verbatim from src/data/geostat.ts), and a small cart riding it month by month while the camera
// follows; the month readout turns, a tick on every new year, and the cart stops on today's point.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {cueFrame, entrance, Haptic, lead, PictureBand, Sfx, vary} from '../common';
import {C, F, rgba, toneBig, type Tone} from '../../tokens';
import {ease, lerp, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {TXT} from '../../lib/layer';
import type {SceneCtx} from '../../types';

type P = {
  at?: number | string; // chunk (or "1.2s") where the cart tips over the first hill
  end?: string; // the word at the last point
  label?: string; // a quiet mono line under the readout
  tone?: Tone; // the ridden track
};

// Geostat used-car index, 2011-01 .. 2026-07 (187 months), verbatim
const V = [
  100.9347, 102.038, 101.1196, 98.8398, 99.3339, 99.436, 98.9956, 97.8037, 97.6439, 97.3956, 97.4518, 98.0889,
  97.3088, 96.7765, 96.1897, 94.7833, 94.3197, 94.5883, 95.7053, 95.5107, 96.4838, 97.1262, 97.7068, 96.653,
  96.8455, 96.8374, 95.9724, 95.1297, 86.5845, 87.166, 87.4116, 87.6545, 86.6758, 86.3749, 86.3813, 88.0611,
  91.2445, 89.1259, 89.0935, 90.0281, 90.4869, 88.1763, 86.8735, 85.1359, 85.4122, 85.3886, 85.6069, 93.3798,
  92.5415, 98.0602, 101.8156, 102.3781, 103.0931, 95.9009, 95.6452, 97.3137, 99.3535, 96.064, 95.1881, 95.8216,
  93.7798, 95.2718, 87.9062, 83.9676, 78.7916, 77.3068, 82.7187, 78.9529, 78.7064, 78.7403, 81.5358, 88.9644,
  93.5442, 94.7493, 89.6139, 86.8564, 87.6562, 87.1382, 85.7327, 84.8738, 88.4968, 89.7383, 98.1545, 89.6574,
  84.9607, 83.8705, 81.623, 79.8306, 78.7973, 76.9291, 75.488, 75.9764, 76.9644, 77.1747, 75.8911, 77.907,
  77.6373, 77.0307, 77.1155, 77.0456, 76.5089, 77.4971, 79.9904, 81.5349, 83.5252, 82.9538, 83.243, 81.3059,
  80.5568, 79.5516, 86.978, 87.8508, 90.2651, 83.1892, 84.3847, 83.827, 87.0317, 87.0189, 88.3193, 87.4855,
  87.6068, 87.2374, 86.6919, 86.0875, 86.286, 84.5005, 85.8243, 86.4165, 87.0056, 86.0505, 86.0147, 87.2919,
  88.9235, 89.6737, 90.6474, 90.7929, 90.2921, 90.7055, 89.8311, 88.715, 88.9528, 88.3297, 88.9359, 87.5325,
  87.2153, 88.8772, 88.4421, 88.8658, 88.9968, 89.1008, 90.0923, 91.0282, 90.7743, 90.8411, 91.3605, 92.7762,
  94.1798, 93.692, 93.7698, 93.1217, 93.1834, 93.3698, 92.915, 92.3849, 92.5523, 93.3187, 93.0768, 94.0282,
  94.3322, 94.3355, 94.785, 94.3935, 93.913, 93.5398, 93.1614, 92.8451, 93.2422, 93.1194, 93.0867, 90.2689,
  90.8634, 90.5495, 90.7524, 91.0701, 91.2631, 91.3077, 93.176,
];

const X0 = 150; // the first month's x (world, stage units)
const DX = 15; // one month
const TOP = 600; // the highest value's y
const LOW = 1080; // the lowest value's y
const GROUND = 1168;
const GAUGE = 12; // the second rail under the first
const START = 1; // the cart waits on the first hill (2011-02)
const VIEW = 400; // where the camera keeps the cart

/** The price line as a rollercoaster: a cart rides the 187 real months and stops on today. */
export const V63PriceRide: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const e = entrance(ctx);
  const base = lead(ctx);
  const n = V.length;
  let lo = V[0];
  let hi = V[0];
  for (let i = 0; i < n; i++) {
    lo = Math.min(lo, V[+i]);
    hi = Math.max(hi, V[+i]);
  }
  const wx = (i: number) => X0 + i * DX;
  const wy = (i: number) => LOW - ((V[+i] - lo) / (hi - lo)) * (LOW - TOP);

  const go = Math.max(base + 12, cueFrame(ctx, p.at ?? 1));
  const stop = Math.max(go + 60, ctx.dur - 16);
  const ride = (f: number) => lerp(START, n - 1, prog(f, go, stop - go, ease.camera));
  const pos = ride(frame);
  const k = Math.min(n - 2, Math.floor(pos));
  const u = pos - k;
  const cx = lerp(wx(k), wx(k + 1), u);
  const cy = lerp(wy(k), wy(k + 1), u);
  const angle = (Math.atan2(wy(k + 1) - wy(k), DX) * 180) / Math.PI;
  const down = Math.max(0, Math.min(1, angle / 30)); // arms up on the way down

  const worldEnd = wx(n - 1);
  const cam = Math.max(0, Math.min(worldEnd - 930, cx - VIEW));
  const appear = prog(frame, e, 24, ease.drawOn);
  const push = lerp(1.04, 1, prog(frame, e, ctx.dur, ease.camera));
  const arrived = frame >= stop;
  const land = spr(frame, stop, 'land');
  const tone = p.tone ?? 'neutral';

  // the track: the whole line, and the ridden part over it
  let rail = '';
  let rail2 = '';
  let ridden = '';
  for (let i = 0; i < n; i++) {
    rail += `${i ? 'L' : 'M'} ${wx(i)} ${wy(i).toFixed(1)} `;
    rail2 += `${i ? 'L' : 'M'} ${wx(i)} ${(wy(i) + GAUGE).toFixed(1)} `;
    if (i <= k) ridden += `${i ? 'L' : 'M'} ${wx(i)} ${wy(i).toFixed(1)} `;
  }
  ridden += `L ${cx.toFixed(1)} ${cy.toFixed(1)}`;

  const ties: React.ReactNode[] = [];
  const posts: React.ReactNode[] = [];
  const years: React.ReactNode[] = [];
  for (let i = 0; i < n; i++) {
    ties.push(<line key={i} x1={wx(i)} y1={wy(i)} x2={wx(i)} y2={wy(i) + GAUGE} stroke={rgba(C.ink, 0.35)} strokeWidth={1.2} />);
    if (i % 3 === 0) posts.push(<line key={i} x1={wx(i)} y1={wy(i) + GAUGE} x2={wx(i)} y2={GROUND} stroke={rgba(C.ink, i % 12 === 0 ? 0.3 : 0.14)} strokeWidth={i % 12 === 0 ? 1.5 : 1} />);
    if (i % 12 === 0)
      years.push(
        <div key={i} className={TXT} style={{position: 'absolute', left: wx(i) - 60, width: 120, top: GROUND + 14, textAlign: 'center', fontFamily: F.mono, fontSize: 24, color: C.ink2, opacity: pos >= i - 0.5 ? 1 : 0.45}}>
          {2011 + i / 12}
        </div>,
      );
  }

  // a fine tick on every new year the cart passes
  const ticks: React.ReactNode[] = [];
  let prev = ride(go);
  for (let f = go + 1; f <= stop; f++) {
    const now = ride(f);
    if (Math.floor(now / 12) > Math.floor(prev / 12)) ticks.push(<Sfx key={f} name="asmr-tick-fine" at={f} volume={0.3 * vary(f)} />);
    prev = now;
  }

  const m = Math.round(pos);
  const readout = `${2011 + Math.floor(m / 12)}.${String((m % 12) + 1).padStart(2, '0')}`;
  const endWord = mtav(p.end ?? 'დღეს');

  return (
    <PictureBand>
      <div style={{position: 'absolute', inset: 0, opacity: appear, transform: `scale(${push})`, transformOrigin: `540px 880px`}}>
        <div style={{position: 'absolute', left: 0, top: 0, width: 4000, height: 1920, transform: `translateX(${-cam}px)`}}>
          <svg width={4000} height={1920} style={{position: 'absolute', inset: 0}}>
            <line x1={X0 - 60} y1={GROUND} x2={worldEnd + 80} y2={GROUND} stroke={rgba(C.ink, 0.4)} strokeWidth={1.5} />
            {posts}
            {ties}
            <path d={rail2} fill="none" stroke={rgba(C.ink, 0.22)} strokeWidth={1.4} strokeLinejoin="round" />
            <path d={rail} fill="none" stroke={rgba(C.ink, 0.32)} strokeWidth={2} strokeLinejoin="round" />
            <path d={ridden} fill="none" stroke={toneBig(tone)} strokeWidth={3.2} strokeLinejoin="round" strokeLinecap="round" />
            {arrived ? <circle cx={wx(n - 1)} cy={wy(n - 1)} r={16 + 40 * land} fill="none" stroke={rgba(C.ink, 0.5)} strokeWidth={1.5} opacity={1 - land * 0.7} /> : null}
            <g transform={`translate(${cx} ${cy - 2}) rotate(${angle}) scale(1.45)`}>
              <line x1={-4} y1={-40} x2={-14 - 6 * down} y2={-58 - 10 * down} stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
              <line x1={8} y1={-40} x2={16 + 6 * down} y2={-58 - 10 * down} stroke={C.ink} strokeWidth={2.2} strokeLinecap="round" />
              <circle cx={2} cy={-46} r={8} fill={C.bg} stroke={C.ink} strokeWidth={2} />
              <path d="M -32 -34 L 30 -34 Q 36 -34 34 -26 L 30 -12 Q 28 -8 22 -8 L -26 -8 Q -32 -8 -32 -14 Z" fill={C.bg} stroke={C.ink} strokeWidth={2.2} strokeLinejoin="round" />
              <line x1={-26} y1={-24} x2={26} y2={-24} stroke={rgba(C.ink, 0.4)} strokeWidth={1.2} />
              <circle cx={-18} cy={-4} r={6} fill={C.bg} stroke={C.ink} strokeWidth={2} />
              <circle cx={18} cy={-4} r={6} fill={C.bg} stroke={C.ink} strokeWidth={2} />
            </g>
          </svg>
          {years}
          <div className={TXT} style={{position: 'absolute', left: wx(n - 1) - 150, width: 300, top: wy(n - 1) - 130, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: 52, color: C.ink, opacity: arrived ? land : 0, transform: `translateY(${(1 - land) * 16}px)`}}>
            {endWord}
          </div>
        </div>
      </div>
      <div className={TXT} style={{position: 'absolute', left: 120, top: 410, fontFamily: F.mono, fontSize: 60, letterSpacing: 2, color: C.ink, opacity: appear}}>
        {readout}
      </div>
      {p.label ? (
        <div className={TXT} style={{position: 'absolute', left: 122, top: 490, fontFamily: F.mono, fontSize: 24, color: C.ink2, opacity: appear}}>
          {mtav(p.label)}
        </div>
      ) : null}
      <Sfx name="asmr-knock" at={go} volume={0.4} />
      <Haptic kind="light" at={go} />
      <Sfx name="asmr-air-long" at={go + 2} volume={0.35} />
      {ticks}
      <Sfx name="asmr-land" at={stop} volume={0.45} />
      <Haptic kind="medium" at={stop} />
    </PictureBand>
  );
};
