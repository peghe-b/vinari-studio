// src/scenes/kit/chart.tsx: bold data pictures for film scenes and the Story slides (2026-10-19): a new chart every time from
// the same few honest parts. Smooth monotone curves (no overshoot past the data), area fills, bars that grow with a spring, a
// value that rides the curve's end, a ring gauge. @remotion/paths draws the curve on (evolvePath) and finds its end point
// (getPointAtLength). Bold strokes only (the owner: no hairlines, no pen strokes); text black or white; data colours from
// toneLine (green good for the viewer, red costs him, one saturated colour a picture).
//
//   <Curve pts={[[0, 3], [1, 4], [2, 9]]} box={{x: 140, y: 600, w: 800, h: 420}} at={f} dur={30} tone="down" area dot/>
//   <Bars values={[120, 340, 90]} labels={['ა', 'ბ', 'გ']} box={{...}} at={f} tone="up" mark={1}/>
//   <Ring value={0.72} x={540} y={820} r={220} at={f} tone="a" label="72%"/>
// Data coordinates are mapped into `box` (stage or frame px); `min` / `max` fix the scale (default: the data's own, from 0).
// The frame guards (src/lib/guard.mjs, a film from v110 on): a chart is a thing kept WHOLE (lib/layer.ts OBJ) and places its
// box inside the frame and over the subtitle band (keepBox: slid, never scaled), its labels and value included.
import React, {useId} from 'react';
import {useCurrentFrame} from 'remotion';
import {evolvePath, getLength, getPointAtLength} from '@remotion/paths';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {keepBox} from '../../lib/guardrt';
import {C, F, rgba, toneLine, type Tone} from '../../tokens';
import {clamp, E, lerp, sp} from './lib';

export type Box = {x: number; y: number; w: number; h: number};
type XY = [number, number];

/** A monotone cubic through the points (Fritsch-Carlson): smooth, and never above or below the data between two points. */
export const monotonePath = (p: XY[]) => {
  const n = p.length;
  if (n < 2) return '';
  const dx = (i: number) => p[i + 1][0] - p[i][0];
  const s = Array.from({length: n - 1}, (_, i) => (p[i + 1][1] - p[i][1]) / (dx(i) || 1e-6));
  const m: number[] = [s[0], ...Array.from({length: n - 2}, (_, i) => (s[i] * s[i + 1] <= 0 ? 0 : (s[i] + s[i + 1]) / 2)), s[n - 2]];
  for (let i = 0; i < n - 1; i++) {
    if (s[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / s[i];
    const b = m[i + 1] / s[i];
    const h = a * a + b * b;
    if (h > 9) {
      const t = 3 / Math.sqrt(h);
      m[i] = t * a * s[i];
      m[i + 1] = t * b * s[i];
    }
  }
  let d = `M${p[0][0].toFixed(2)} ${p[0][1].toFixed(2)}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += ` C${(p[i][0] + h).toFixed(2)} ${(p[i][1] + m[i] * h).toFixed(2)} ${(p[i + 1][0] - h).toFixed(2)} ${(p[i + 1][1] - m[i + 1] * h).toFixed(2)} ${p[i + 1][0].toFixed(2)} ${p[i + 1][1].toFixed(2)}`;
  }
  return d;
};

const scaleOf = (vals: number[], min?: number, max?: number) => {
  const lo = min ?? Math.min(0, ...vals);
  const hi = max ?? Math.max(...vals);
  return (v: number) => (hi === lo ? 0.5 : (v - lo) / (hi - lo));
};

/** A smooth curve drawn on from `at` over `dur` frames; `area` fills under it, `dot` rides its end with `value` beside it. */
export const Curve: React.FC<{
  pts: XY[];
  box: Box;
  at: number;
  dur?: number;
  tone?: Tone;
  width?: number;
  area?: boolean;
  dot?: boolean;
  value?: string;
  min?: number;
  max?: number;
  base?: boolean;
}> = ({pts, box: box0, at, dur = 30, tone = 'neutral', width = 10, area = false, dot = true, value, min, max, base = true}) => {
  const f = useCurrentFrame();
  // the value rides over the curve's end (64 px text, 4 widths up), the dot's halo round it
  const over = value ? width * 4 + 64 : width * 2.4;
  const kb = keepBox({x: box0.x - width * 2.4, y: box0.y - over, w: box0.w + width * 4.8, h: box0.h + over + Math.max(4, width * 0.4)});
  const box = {...box0, x: kb.x + width * 2.4, y: kb.y + over};
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const xs = pts.map((q) => q[0]);
  const ys = pts.map((q) => q[1]);
  const sx = scaleOf(xs, Math.min(...xs), Math.max(...xs));
  const sy = scaleOf(ys, min, max);
  const P: XY[] = pts.map(([x, y]) => [box.x + sx(x) * box.w, box.y + box.h - sy(y) * box.h]);
  const d = monotonePath(P);
  const k = E.inOut(clamp((f - at) / dur));
  const ink = toneLine(tone);
  const len = d ? getLength(d) : 0;
  const end = d && k > 0 ? getPointAtLength(d, len * k) : null;
  const evo = d ? evolvePath(k, d) : {strokeDasharray: '0', strokeDashoffset: 0};
  const fill = area && d ? `${d} L${P[P.length - 1][0].toFixed(2)} ${box.y + box.h} L${P[0][0].toFixed(2)} ${box.y + box.h} Z` : '';
  return (
    <svg className={OBJ} width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
      <defs>
        <linearGradient id={`cf${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={ink} stopOpacity={0.26} />
          <stop offset="1" stopColor={ink} stopOpacity={0} />
        </linearGradient>
        <clipPath id={`cc${uid}`}>
          <rect x={box.x - width} y={box.y - 200} width={(end ? end.x - box.x : 0) + width} height={box.h + 400} />
        </clipPath>
      </defs>
      {base ? <rect x={box.x} y={box.y + box.h} width={box.w} height={Math.max(4, width * 0.4)} rx={2} fill={rgba(C.ink, 0.18)} /> : null}
      {fill ? <path d={fill} fill={`url(#cf${uid})`} clipPath={`url(#cc${uid})`} /> : null}
      {d ? <path d={d} fill="none" stroke={ink} strokeWidth={width} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={evo.strokeDasharray} strokeDashoffset={evo.strokeDashoffset} /> : null}
      {dot && end ? (
        <>
          <circle cx={end.x} cy={end.y} r={width * 2.4} fill={rgba(ink, 0.18)} />
          <circle cx={end.x} cy={end.y} r={width * 1.25} fill={ink} />
          <circle cx={end.x} cy={end.y} r={width * 0.5} fill={C.surface} />
        </>
      ) : null}
      {value && end && k > 0.85 ? (
        <text className={TXT} x={end.x} y={end.y - width * 4} textAnchor="middle" fontFamily={F.sans} fontWeight={700} fontSize={64} fill={C.ink} opacity={clamp((k - 0.85) / 0.15)}>
          {mtav(value)}
        </text>
      ) : null}
    </svg>
  );
};

/** Bars that grow from the base with a spring, `stagger` frames apart; `mark` is the one bar in the tone (the others ink at a
 *  low alpha); `labels` sit under the bars, `values` (or `shown`) land on their tops. */
export const Bars: React.FC<{values: number[]; box: Box; at: number; labels?: string[]; shown?: string[]; tone?: Tone; mark?: number; stagger?: number; gap?: number; max?: number; label?: number}> = ({
  values,
  box: box0,
  at,
  labels = [],
  shown,
  tone = 'neutral',
  mark,
  stagger = 4,
  gap = 0.34,
  max,
  label = 44,
}) => {
  const f = useCurrentFrame();
  // the values land over the bars (label * 1.5 up), the labels sit under them
  const top = shown ? label * 1.5 : 0;
  const kb = keepBox({x: box0.x - 40, y: box0.y - top, w: box0.w + 80, h: box0.h + top + (labels.length ? 18 + label * 1.2 : 0)});
  const box = {...box0, x: kb.x + 40, y: kb.y + top};
  const n = values.length;
  const hi = max ?? Math.max(1e-6, ...values);
  const bw = box.w / (n + (n - 1) * gap);
  return (
    <div className={OBJ} style={{position: 'absolute', inset: 0}}>
      {values.map((v, i) => {
        const k = sp(f, at + i * stagger, 150, 17);
        const h = (Math.max(0, v) / hi) * box.h * k;
        const x = box.x + i * bw * (1 + gap);
        const on = mark === undefined || mark === i;
        const fill = mark === undefined ? toneLine(tone) : on ? toneLine(tone) : rgba(C.ink, 0.16);
        return (
          <React.Fragment key={i}>
            <div style={{position: 'absolute', left: x, top: box.y + box.h - h, width: bw, height: h, borderRadius: Math.min(22, bw * 0.18), background: fill}} />
            {labels[i] ? (
              <div className={TXT} style={{position: 'absolute', left: x - 40, width: bw + 80, top: box.y + box.h + 18, textAlign: 'center', fontFamily: F.sans, fontWeight: 600, fontSize: label, color: on ? C.ink : C.ink2, whiteSpace: 'nowrap'}}>
                {mtav(labels[i])}
              </div>
            ) : null}
            {(shown?.[i] ?? null) !== null && k > 0.6 ? (
              <div className={TXT} style={{position: 'absolute', left: x - 60, width: bw + 120, top: box.y + box.h - h - label * 1.5, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: label * 1.15, color: C.ink, opacity: clamp((k - 0.6) / 0.3), whiteSpace: 'nowrap'}}>
                {mtav(String(shown?.[i] ?? ''))}
              </div>
            ) : null}
          </React.Fragment>
        );
      })}
    </div>
  );
};

/** A ring gauge filling to `value` (0..1) from `at`; `label` lands in its centre. */
export const Ring: React.FC<{value: number; x: number; y: number; r: number; at: number; dur?: number; tone?: Tone; width?: number; label?: string; size?: number}> = ({value, x: x0, y: y0, r, at, dur = 28, tone = 'neutral', width, label, size}) => {
  const f = useCurrentFrame();
  const k = E.out(clamp((f - at) / dur));
  const w = width ?? Math.max(14, r * 0.13);
  const kb = keepBox({x: x0 - r - w / 2, y: y0 - r - w / 2, w: 2 * r + w, h: 2 * r + w});
  const x = kb.x + r + w / 2;
  const y = kb.y + r + w / 2;
  const c = 2 * Math.PI * r;
  const v = clamp(value) * k;
  return (
    <div className={OBJ} style={{position: 'absolute', inset: 0}}>
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0, overflow: 'visible'}}>
        <circle cx={x} cy={y} r={r} fill="none" stroke={rgba(C.ink, 0.12)} strokeWidth={w} />
        <circle cx={x} cy={y} r={r} fill="none" stroke={toneLine(tone)} strokeWidth={w} strokeLinecap="round" strokeDasharray={`${(c * v).toFixed(2)} ${c.toFixed(2)}`} transform={`rotate(-90 ${x} ${y})`} />
      </svg>
      {label ? (
        <div className={TXT} style={{position: 'absolute', left: x - r, top: y - (size ?? r * 0.42) * 0.6, width: 2 * r, textAlign: 'center', fontFamily: F.sans, fontWeight: 700, fontSize: size ?? r * 0.42, lineHeight: 1.2, color: C.ink, opacity: clamp(k * 2)}}>
          {mtav(label)}
        </div>
      ) : null}
    </div>
  );
};

/** The value of a gauge or bar at frame f, for a number that counts with it (lerp from..to as the ring fills). */
export const along = (f: number, at: number, dur: number, from: number, to: number) => lerp(from, to, E.out(clamp((f - at) / dur)));
