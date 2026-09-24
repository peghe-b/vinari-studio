import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, lerp, prog, rand, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {C, F, halo, L} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, Sfx, SourceLine, vary} from './common';

type P = {
  dots?: number; // listings drawn as dots (default 21). Schematic: no prices, no axis numbers
  outlierAt?: number; // chunk where the far-right dot inflates and drags the mean after it
  meanLabel?: string; // default "საშუალო" (grey, dashed)
  medianLabel?: string; // default "მედიანა" (green, solid)
  markersAt?: number; // chunk where the median is counted in from both ends and both markers appear
  source?: string; // mono source line, e.g. "myauto.ge · ცოცხალი განცხადებები"
};

// Geometry (px, 1080 x 1920 frame)
// (the content box grew to stage 1280: the plot sits lower and its dots are a touch bigger; the axis and
// "ფასი" at its right end stay above stage 1080, where the like column starts)
const AX0 = 150; // value 0
const AX1 = 930; // value 1
// (the whole plot, from the mean's label to the median's under the axis, is centred on the content box:
// 40 px lower than the first pass, the axis and "ფასი" still above stage 1080)
const AXIS_Y = 995;
const ROW_Y = 858; // centre line of the dot swarm
const R = 17; // dot radius
const MEAN_TOP = 652;
const MED_TOP = 716;
const OUT_V = 0.9; // the far-right listing
const X = (v: number) => AX0 + v * (AX1 - AX0);

type Dot = {v: number; x: number; y: number};

/** Deterministic listing prices (a cluster plus one far-right listing, always last) laid out as
 *  a beeswarm: each dot, in price order, takes the nearest free height to the centre line. */
const layout = (n: number): Dot[] => {
  const vals = Array.from({length: n}, (_, i) => {
    if (i === n - 1) return OUT_V;
    const a = 0.6 * rand(i * 3 + 1.3) + 0.4 * rand(i * 3 + 2.7); // wide and flat, a little denser in the middle
    return 0.05 + 0.58 * a;
  });
  const order = vals.map((_, i) => i).sort((a, b) => vals[a] - vals[b]);
  const ys = new Array<number>(n).fill(0);
  const placed: number[] = [];
  const d = 2 * R + 8;
  for (const i of order) {
    for (let k = 0; k < 80; k++) {
      const off = k === 0 ? 0 : (k % 2 ? -1 : 1) * Math.ceil(k / 2) * 3;
      const ok = placed.every((j) => {
        const dx = X(vals[i]) - X(vals[j]);
        const dy = off - ys[j];
        return dx * dx + dy * dy >= d * d;
      });
      if (ok) {
        ys[i] = off;
        break;
      }
    }
    placed.push(i);
  }
  return vals.map((v, i) => ({v, x: X(v), y: ROW_Y + ys[i]}));
};

// Why the app shows the median, not the mean. Listings drop in as dots on a price axis
// without numbers; the median is found by counting in from both ends (the middle dot turns
// green), the mean is a grey dashed line. When one far-right listing inflates, the mean
// slides after it and leaves a ghost behind; the median does not move.
export const StripPlot: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  // the axis, its ticks and the first listings are already there on a later scene's cut frame (the
  // entrance starts before the cut), so the cut lands on the plot forming, never on black. The
  // counting, the median, the outlier and every sound stay on base (the cut is the event)
  const e = entrance(ctx);
  const n = Math.max(5, Math.round(p.dots ?? 21));
  const dots = layout(n);
  const out = n - 1;
  const sorted = dots.map((_, i) => i).sort((a, b) => dots[a].v - dots[b].v);
  const half = Math.floor(n / 2);
  const medIdx = n % 2 ? [sorted[half]] : [sorted[half - 1], sorted[half]];
  const medV = medIdx.reduce((s, i) => s + dots[i].v, 0) / medIdx.length;

  // timeline
  const axisIn = prog(frame, e, 16, ease.drawOn);
  const dropAt = dots.map((_, i) => e + 3 + Math.floor(rand(i * 5.3 + 11) * (ctx.index === 0 ? 13 : 16)));
  const mk = Math.max(base + 12, p.markersAt !== undefined ? cueFrame(ctx, p.markersAt) : base + 26);
  const pairAt = (k: number) => mk + Math.round(k * 1.5); // pair k = k-th cheapest and k-th dearest, dimmed together
  const medAt = pairAt(Math.ceil(n / 2) - 1) + 2;
  const recoverAt = medAt + 12;
  const meanAt = medAt + 4;
  const oa = p.outlierAt !== undefined ? Math.max(base + 20, cueFrame(ctx, p.outlierAt)) : null;
  const inflS = oa !== null ? spr(frame, oa, 'enterXL') : 0; // dot size, may overshoot a hair
  const inflT = oa !== null ? prog(frame, oa + 2, 30, ease.enter) : 0; // mean slide, no overshoot

  // the inflated listing weighs K extra in value units: the mean moves by K / n (about a quarter axis)
  const K = 0.25 * n;
  const sum = dots.reduce((s, d) => s + d.v, 0);
  const mean0 = sum / n;
  const meanV = (sum + K * inflT) / n;
  const meanX = X(meanV);
  const medX = X(medV);

  const dimOf = (i: number) => {
    const rank = sorted.indexOf(i);
    const k = Math.min(rank, n - 1 - rank);
    if (medIdx.includes(i)) return 0;
    return prog(frame, pairAt(k), 5) * (1 - prog(frame, recoverAt, 16));
  };
  const medOn = prog(frame, medAt, 8);
  const medLine = prog(frame, medAt + 1, 14, ease.drawOn);
  const meanLine = prog(frame, meanAt, 14, ease.drawOn);
  const labelMed = spr(frame, medAt + 4);
  const labelMean = spr(frame, meanAt + 4);

  // live: every ~0.9 s one listing pings, like a fresh price arriving
  const pings: {i: number; t: number}[] = [];
  for (let k = 0; k < 40; k++) {
    const t = base + 30 + k * 27;
    if (t > frame) break;
    if (frame - t < 24) pings.push({i: Math.floor(rand(k * 9.1 + 3) * (n - 1)), t});
  }
  const clampX = (x: number) => Math.min(1080 - L.side - 70, Math.max(L.side + 70, x));
  const medColor = C.upLine;

  return (
    <>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <defs>
          <filter id={`spGlow${ctx.index}`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="7" />
          </filter>
        </defs>
        {/* axis without numbers: a hairline with quiet ticks, drawn from the left */}
        <line x1={L.side} x2={L.side + (1080 - 2 * L.side) * axisIn} y1={AXIS_Y} y2={AXIS_Y} stroke={C.ink2} strokeWidth={1.6} />
        {Array.from({length: 14}, (_, k) => {
          const x = AX0 + (k * (AX1 - AX0)) / 13;
          return <line key={k} x1={x} x2={x} y1={AXIS_Y} y2={AXIS_Y + 9} stroke={C.rule} strokeWidth={1.4} opacity={prog(frame, e + 2 + k * 0.8, 6)} />;
        })}

        {/* mean: ghost of where it stood, the drift arrow, and the live dashed line */}
        {oa !== null && inflT > 0.02 ? (
          <g opacity={Math.min(1, inflT * 3)}>
            <line x1={X(mean0)} x2={X(mean0)} y1={MEAN_TOP + 40} y2={AXIS_Y} stroke={C.ink2} strokeWidth={1.4} strokeDasharray="2 7" opacity={0.45} />
            {meanX - X(mean0) > 26 ? (
              <>
                <line x1={X(mean0) + 6} x2={meanX - 10} y1={MEAN_TOP + 40} y2={MEAN_TOP + 40} stroke={C.ink2} strokeWidth={1.6} />
                <path d={`M ${meanX - 20} ${MEAN_TOP + 33} L ${meanX - 9} ${MEAN_TOP + 40} L ${meanX - 20} ${MEAN_TOP + 47}`} fill="none" stroke={C.ink2} strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round" />
              </>
            ) : null}
          </g>
        ) : null}
        <line x1={meanX} x2={meanX} y1={AXIS_Y} y2={lerp(AXIS_Y, MEAN_TOP, meanLine)} stroke={C.ink2} strokeWidth={2} strokeDasharray="8 9" />

        {/* median: solid green, drawn up from the axis through the middle dot */}
        <line x1={medX} x2={medX} y1={AXIS_Y} y2={lerp(AXIS_Y, MED_TOP, medLine)} stroke={medColor} strokeWidth={6} opacity={0.35 * medLine} filter={`url(#spGlow${ctx.index})`} />
        <line x1={medX} x2={medX} y1={AXIS_Y} y2={lerp(AXIS_Y, MED_TOP, medLine)} stroke={medColor} strokeWidth={2.6} />
        <path d={`M ${medX - 8} ${AXIS_Y + 16} L ${medX} ${AXIS_Y + 4} L ${medX + 8} ${AXIS_Y + 16} Z`} fill={medColor} opacity={medLine} />

        {/* pings behind the dots */}
        {pings.map(({i, t}) => {
          const q = (frame - t) / 24;
          const d = dots[i];
          return <circle key={`p${t}`} cx={d.x} cy={d.y} r={R + 4 + q * 22} fill="none" stroke={C.ink} strokeWidth={1.4} opacity={0.4 * (1 - q) * (1 - dimOf(i))} />;
        })}

        {dots.map((d, i) => {
          const s = spr(frame, dropAt[i], 'land');
          const breathe = 1.6 * Math.sin(frame / 22 + i * 1.7);
          const y = d.y - (1 - s) * 46 + breathe;
          const isMed = medIdx.includes(i);
          const dim = dimOf(i);
          if (i === out) {
            const hollow = Math.min(1, inflS * 1.4);
            const r = R * (1 + 2.2 * inflS) * (1 + 0.025 * hollow * Math.sin(frame / 14));
            const ring = oa !== null ? (frame - oa) / 30 : -1;
            return (
              <g key={i} opacity={Math.min(1, s * 1.5) * (1 - 0.62 * dim)}>
                {ring > 0 && ring < 1 ? <circle cx={d.x} cy={y} r={R * 3.2 + 4 + ring * 40} fill="none" stroke={C.ink} strokeWidth={1.3} opacity={0.4 * (1 - ring)} /> : null}
                <circle cx={d.x} cy={y} r={r} fill={C.ink} fillOpacity={0.9 - 0.76 * hollow} stroke={C.ink} strokeWidth={2} strokeOpacity={0.9 * hollow} />
                {/* the original dot stays visible inside: one listing, blown up */}
                <circle cx={d.x} cy={y} r={R * 0.55} fill={C.ink} opacity={0.85 * hollow} />
              </g>
            );
          }
          return (
            <g key={i} opacity={Math.min(1, s * 1.5)}>
              {isMed ? <circle cx={d.x} cy={y} r={R + 10} fill={medColor} opacity={0.35 * medOn} filter={`url(#spGlow${ctx.index})`} /> : null}
              <circle cx={d.x} cy={y} r={R + (isMed ? 3 * medOn : 0)} fill={isMed && medOn > 0 ? medColor : C.ink} fillOpacity={0.9 - 0.62 * dim} />
            </g>
          );
        })}
      </svg>

      {/* labels: mean above the swarm (grey), median under the axis (green); they never collide */}
      <div
        className={TXT}
        style={{
          position: 'absolute',
          top: MEAN_TOP - 58,
          left: clampX(meanX) - 200,
          width: 400,
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 500,
          fontSize: 36,
          color: C.ink2,
          opacity: labelMean,
          transform: `translateY(${(1 - labelMean) * 10}px)`,
        }}
      >
        {mtav(p.meanLabel ?? 'საშუალო')}
      </div>
      <div
        className={TXT}
        style={{
          position: 'absolute',
          top: AXIS_Y + 24,
          left: clampX(medX) - 200,
          width: 400,
          textAlign: 'center',
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: 38,
          color: C.upText,
          opacity: labelMed,
          transform: `translateY(${(1 - labelMed) * -10}px)`,
          textShadow: `0 0 26px ${halo(C.upLine, 0.33)}`,
        }}
      >
        {mtav(p.medianLabel ?? 'მედიანა')}
      </div>
      <div className={TXT} style={{position: 'absolute', top: AXIS_Y + 26, right: L.side, fontFamily: F.mono, fontSize: 24, letterSpacing: '0.05em', color: C.ink3, opacity: prog(frame, e + 12, 10)}}>{mtav('ფასი')}</div>
      <SourceLine text={p.source} at={medAt + 8} y={1104} />

      {/* event: listings drop in as dots (those landing after the cut: the cut's air covers the ones before it) */}
      {[...new Set(dropAt)].filter((f) => f >= 1).sort((a, b) => a - b).filter((f, k, a) => k === 0 || f - a[k - 1] >= 2).slice(0, 8).map((f, k) => (
        <Sfx key={`d${k}`} name="asmr-pop" at={f} volume={0.32 * vary(k, 0.35)} />
      ))}
      {Array.from({length: Math.ceil(n / 2) - 1}, (_, k) => pairAt(k)).filter((f, k, a) => k === 0 || f - a[k - 1] >= 2).map((f, k) => (
        <Sfx key={`c${k}`} name="asmr-tick-fine" at={f} volume={0.42 * vary(k, 0.3)} /* event: a pair is counted in from both ends */ />
      ))}
      <Land at={medAt} volume={0.56} /* event: the middle dot is the median */ />
      <Sfx name="asmr-pencil-short" at={meanAt} volume={0.26} /* event: the mean's dashed line draws (14 frames) */ />
      {oa !== null ? <Sfx name="asmr-pop" at={oa} volume={0.44} /* event: the far-right listing swells */ /> : null}
      {oa !== null ? <Haptic kind="light" at={oa} /* event: the far-right listing swells */ /> : null}
      {oa !== null ? <Sfx name="asmr-air-long" at={oa - 6} volume={0.28} len={44} fade={12} /* event: the mean slides after it (30 frames) */ /> : null}
      {oa !== null ? <Sfx name="asmr-knock" at={oa + 26} volume={0.3} /* event: the mean settles next to it */ /> : null}
      {oa !== null ? <Haptic kind="soft" at={oa + 26} volume={0.4} /* event: the mean settles next to it */ /> : null}
    </>
  );
};
