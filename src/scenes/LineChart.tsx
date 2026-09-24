import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {GEOSTAT_SOURCE, GEOSTAT_USED_CAR_INDEX} from '../data/geostat';
import {ease, prog, spr, typeOn} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, L, T, THEME} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, Haptic, lead, Sfx, SourceLine, vary} from './common';

type P = {
  series: number[] | 'geostat'; // real values only; "geostat" = the app's 187-month used-car index
  tone?: 'up' | 'down' | 'neutral';
  label?: string; // line above the chart
  source?: string; // mono source line; "geostat" defaults to "საქსტატი · 2011.01 · 2026.07"
  fromLabel?: string; // mono label under the left end of the axis
  toLabel?: string; // mono label under the right end
  at?: number; // chunk where the line starts drawing
};

// A real time series drawing itself on, the way the app's live chart looks: monotone curve,
// the 3-pass glow (halo 3.4x at 13 %, mid 2x at 26 %, core), a gradient area under it and a
// glowing tip dot that leads the line and then breathes. The y axis carries no numbers:
// an index level means nothing to a viewer, and an unlabelled axis cannot mislead.

const X0 = L.side;
const X1 = 1080 - L.side;
const YT = 590; // highest point of the line
const YB = 930; // lowest point of the line
const AXIS = 975;
const CORE = 4;

// app glow strengths per trend (Semantic.swift glowNear / glowFar)
const GLOW = {up: [0.44, 0.16], down: [0.76, 0.28], neutral: [0.5, 0.18]} as const;

type Geo = {pts: [number, number][]; cum: number[]; total: number; d: string; area: string; y: (x: number) => number};

// Fritsch-Carlson monotone cubic (what Swift Charts' .monotone draws), sampled densely so the
// drawn length at any x is known exactly and the dash can stop right under the tip dot.
const buildGeo = (vals: number[]): Geo => {
  const n = vals.length;
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const span = hi - lo || 1;
  const xs = vals.map((_, i) => X0 + ((X1 - X0) * i) / (n - 1));
  const ys = vals.map((v) => YB - ((v - lo) / span) * (YB - YT));
  const dx = (X1 - X0) / (n - 1);
  const sl = ys.slice(1).map((y, i) => (y - ys[i]) / dx);
  const m = ys.map((_, i) => (i === 0 ? sl[0] : i === n - 1 ? sl[n - 2] : sl[i - 1] * sl[i] <= 0 ? 0 : (sl[i - 1] + sl[i]) / 2));
  for (let i = 0; i < n - 1; i++) {
    if (sl[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / sl[i];
    const b = m[i + 1] / sl[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * sl[i];
      m[i + 1] = t * b * sl[i];
    }
  }
  const sub = n > 60 ? 3 : 8;
  const pts: [number, number][] = [];
  for (let i = 0; i < n - 1; i++) {
    for (let k = 0; k < sub; k++) {
      const t = k / sub;
      const t2 = t * t;
      const t3 = t2 * t;
      const y = (2 * t3 - 3 * t2 + 1) * ys[i] + (t3 - 2 * t2 + t) * dx * m[i] + (-2 * t3 + 3 * t2) * ys[i + 1] + (t3 - t2) * dx * m[i + 1];
      pts.push([xs[i] + dx * t, y]);
    }
  }
  pts.push([xs[n - 1], ys[n - 1]]);
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const d = pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`).join('');
  const area = `${d}L${X1} ${AXIS}L${X0} ${AXIS}Z`;
  const y = (x: number) => {
    const f = Math.min(pts.length - 1.0001, Math.max(0, ((x - X0) / (X1 - X0)) * (pts.length - 1)));
    const i = Math.floor(f);
    return pts[i][1] + (pts[i + 1][1] - pts[i][1]) * (f - i);
  };
  return {pts, cum, total: cum[cum.length - 1], d, area, y};
};

const lenAt = (g: Geo, x: number) => {
  const f = Math.min(g.pts.length - 1.0001, Math.max(0, ((x - X0) / (X1 - X0)) * (g.pts.length - 1)));
  const i = Math.floor(f);
  return g.cum[i] + (g.cum[i + 1] - g.cum[i]) * (f - i);
};

export const LineChart: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const geostat = p.series === 'geostat';
  if (geostat && GEOSTAT_USED_CAR_INDEX.length < 2) throw new Error('LineChart: series "geostat" has no data in src/data/geostat.ts');
  const vals = geostat ? GEOSTAT_USED_CAR_INDEX.map((r) => r[1]) : (p.series as number[]);
  if (!Array.isArray(vals) || vals.length < 2 || vals.some((v) => typeof v !== 'number' || !isFinite(v)))
    throw new Error('LineChart: "series" must be "geostat" or an array of at least 2 real numbers');
  const months = geostat ? GEOSTAT_USED_CAR_INDEX.map((r) => r[0].replace('-', '.')) : null;
  const g = useMemo(() => buildGeo(vals), [p.series]); // eslint-disable-line react-hooks/exhaustive-deps
  const tone = p.tone ?? 'neutral';
  const col = tone === 'up' ? C.upLine : tone === 'down' ? C.downLine : C.ink;
  const [near, far] = GLOW[tone];
  const n = vals.length;

  // timing: frame, axis and start dot are composed in ~12 frames, the line then draws itself
  const drawAt = p.at !== undefined ? Math.max(base + 8, cueFrame(ctx, p.at)) : base + 10;
  // about half the scene, but always leaving ~0.7 s for the tip to breathe before the cut
  const drawDur = Math.round(Math.min(78, Math.max(30, Math.min(ctx.dur * 0.5, ctx.dur - drawAt - 22))));
  const drawEnd = drawAt + drawDur;
  const t = prog(frame, drawAt, drawDur, ease.drawOn);
  const xr = X0 + (X1 - X0) * t;
  const shown = lenAt(g, xr);
  const tipY = g.y(xr);
  const axisIn = prog(frame, base, 10, ease.drawOn);
  const idx = Math.min(n - 1, Math.round(((xr - X0) / (X1 - X0)) * (n - 1)));

  // year ticks for the Geostat months (every January); for short series, one per point
  const ticks: number[] = geostat ? months!.map((m, i) => (m.endsWith('.01') ? i : -1)).filter((i) => i >= 0) : n <= 30 ? vals.map((_, i) => i) : [];
  const tickX = (i: number) => X0 + ((X1 - X0) * i) / (n - 1);
  const tickFrames = ticks.map((i) => drawAt + Math.round(drawDur * inverseDrawOn((tickX(i) - X0) / (X1 - X0)))).filter((f, k, a) => k === 0 || f - a[k - 1] >= 2);

  // the tip breathes like the app's EndDot (0.85 s swell, 0.55 s rest): at the start while it
  // waits for its cue, and at the end once it has landed
  const since = frame - drawEnd;
  const waiting = frame - (base + 4);
  const cyc = since >= 0 ? (since % 42) / 26 : waiting >= 0 && frame < drawAt - 6 ? (waiting % 42) / 26 : 2;
  const pulse = cyc <= 1 ? 1 - Math.pow(1 - cyc, 3) : -1;
  // a soft glint travels along the finished line every 3 s: the data is live, not a picture
  const glintT = since > 20 ? ((since - 20) % 90) / 60 : 2;
  const startLevel = g.pts[0][1];

  const fromLabel = p.fromLabel ?? (geostat ? months![0].slice(0, 4) : undefined);
  const toLabel = p.toLabel ?? (geostat ? months![n - 1].slice(0, 4) : undefined);
  const source = p.source ?? (geostat ? `${GEOSTAT_SOURCE} · ${months![0]} · ${months![n - 1]}` : undefined);
  const rideTag = months ? months[idx] : null;
  const tagIn = prog(frame, drawAt, 8);
  const tagTop = YT - 74;
  const endLand = spr(frame, drawEnd - 2, 'land');
  const drawing = frame >= drawAt;

  return (
    <>
      {p.label ? (
        <div style={{position: 'absolute', top: 420, left: L.side, right: L.side, fontFamily: F.sans, fontWeight: 500, fontSize: 46, lineHeight: 1.2, color: C.ink, opacity: spr(frame, base), transform: `translateY(${(1 - spr(frame, base)) * 18}px)`}}>
          {p.label}
        </div>
      ) : null}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <defs>
          <linearGradient id="lc-fill" x1="0" y1={YT} x2="0" y2={AXIS} gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor={col} stopOpacity={tone === 'neutral' ? 0.09 : 0.14} />
            <stop offset="0.55" stopColor={col} stopOpacity={(tone === 'neutral' ? 0.09 : 0.14) * 0.28} />
            <stop offset="1" stopColor={col} stopOpacity={0} />
          </linearGradient>
          <clipPath id="lc-reveal">
            <rect x={X0 - 20} y={0} width={Math.max(0, xr - X0 + 20)} height={1920} />
          </clipPath>
          <filter id="lc-soft" x="-10%" y="-40%" width="120%" height="180%">
            <feGaussianBlur stdDeviation={3} />
          </filter>
          <filter id="lc-dot" x="-300%" y="-300%" width="700%" height="700%">
            <feDropShadow dx={0} dy={0} stdDeviation={7} floodColor={col} floodOpacity={(near + 0.3) * THEME.glow} />
            <feDropShadow dx={0} dy={0} stdDeviation={16} floodColor={col} floodOpacity={(far + 0.2) * THEME.glow} />
          </filter>
        </defs>

        {/* axis: a hairline that draws from the left, ticks appear as the line passes them */}
        <line x1={X0} x2={X0 + (X1 - X0) * axisIn} y1={AXIS} y2={AXIS} stroke={C.rule} strokeWidth={2} />
        {ticks.map((i) => {
          const x = tickX(i);
          const on = drawing && xr >= x - 0.5 ? 1 : 0.35;
          return <line key={i} x1={x} x2={x} y1={AXIS} y2={AXIS + 12} stroke={C.ink3} strokeWidth={2} opacity={axisIn * on} />;
        })}

        {/* where the series started: a dashed level, so the ending reads against it */}
        <line x1={X0} x2={X1} y1={startLevel} y2={startLevel} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="3 9" opacity={0.45 * prog(frame, base + 4, 14)} />

        {/* the whole series as a faint trace first: frame 0 is already a chart, the glow then walks it */}
        <path d={g.d} fill="none" stroke={C.ink} strokeWidth={2} strokeLinejoin="round" opacity={0.13 * prog(frame, base, 10)} />
        <path d={g.area} fill="url(#lc-fill)" clipPath="url(#lc-reveal)" />
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeDasharray={`${shown} ${g.total + 10}`}>
          {/* the halo and the mid pass: a glow on the black film; on paper a dark halo only thickens the
              line, so it keeps a whisper of it (THEME.glow) */}
          <path d={g.d} stroke={col} strokeWidth={CORE * 3.4} opacity={0.13 * THEME.glow} filter="url(#lc-soft)" />
          <path d={g.d} stroke={col} strokeWidth={CORE * 2} opacity={0.26 * THEME.glow} />
          <path d={g.d} stroke={col} strokeWidth={CORE} opacity={drawing ? 1 : 0} />
        </g>
        {glintT <= 1 ? (
          <path d={g.d} fill="none" stroke={C.ink} strokeWidth={CORE * 1.6} strokeLinecap="round" strokeDasharray={`90 ${g.total + 200}`} strokeDashoffset={-(g.total + 90) * ease.camera(glintT) + 90} opacity={0.35 * Math.sin(Math.PI * glintT)} filter="url(#lc-soft)" />
        ) : null}

        {/* a dashed rule from the tip to the axis (the app's RuleMark) */}
        <line x1={xr} x2={xr} y1={rideTag ? tagTop + 44 : tipY + 16} y2={AXIS} stroke={C.ink2} strokeWidth={1.5} strokeDasharray="3 5" opacity={0.5 * tagIn} />

        {/* tip: leads the line, then breathes */}
        {pulse >= 0 ? <circle cx={xr} cy={tipY} r={10 * (1 + 2.4 * pulse)} fill={col} opacity={0.42 * (1 - pulse)} /> : null}
        <circle cx={xr} cy={tipY} r={10 * (1 + 0.18 * Math.sin(Math.min(1, endLand) * Math.PI))} fill={col} filter="url(#lc-dot)" opacity={prog(frame, base + 4, 8)} />
      </svg>

      {rideTag ? (
        // a cursor readout riding the rule: left-aligned at the start, right-aligned at the end
        <div style={{position: 'absolute', left: xr, top: tagTop, transform: `translateX(${-100 * t}%)`, padding: '0 10px', fontFamily: F.mono, fontSize: T.label, letterSpacing: '0.05em', color: C.ink, opacity: tagIn, whiteSpace: 'nowrap', fontFeatureSettings: '"tnum" 1'}}>
          {rideTag}
        </div>
      ) : null}
      {fromLabel ? <AxisLabel text={fromLabel} at={base + 6} x={X0} align="left" frame={frame} /> : null}
      {toLabel ? <AxisLabel text={toLabel} at={base + 10} x={X1} align="right" frame={frame} /> : null}
      <SourceLine text={source} at={base + 14} y={1062} />

      {/* graphite along BEZ.drawOn: the 2 s stroke for a long draw, the 0.95 s one for a short draw, cut where the tip stops */}
      <Sfx name={drawDur >= 44 ? 'asmr-pencil-long' : 'asmr-pencil'} at={drawAt} volume={0.46} len={drawDur + 2} fade={6} /* event: the line draws itself */ />
      {/* a detent per year the tip passes, like a timeline scrolled by a crown */}
      {tickFrames.map((f, i) => <Sfx key={i} name="asmr-detent" at={f} volume={0.32 * vary(i, 0.3)} /* event: the line passes a year tick */ />)}
      <Sfx name="asmr-pop" at={drawEnd - 2} volume={0.46} /* event: the tip lands on the last value */ />
      <Haptic kind="medium" at={drawEnd - 2} volume={0.42} /* event: the tip lands on the last value */ />
    </>
  );
};

// ease.drawOn is monotone, so the frame when the line reaches x is found by bisection
const inverseDrawOn = (target: number) => {
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 24; k++) {
    const mid = (lo + hi) / 2;
    if (ease.drawOn(mid) < target) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
};

const AxisLabel: React.FC<{text: string; at: number; x: number; align: 'left' | 'right'; frame: number}> = ({text, at, x, align, frame}) => (
  <div
    style={{
      position: 'absolute',
      top: AXIS + 22,
      ...(align === 'left' ? {left: x} : {right: 1080 - x}),
      fontFamily: F.mono,
      fontSize: T.label,
      letterSpacing: '0.05em',
      color: C.ink3,
      whiteSpace: 'nowrap',
      fontFeatureSettings: '"tnum" 1',
    }}
  >
    {typeOn(capsLatin(text), frame, at, 1.2)}
  </div>
);
