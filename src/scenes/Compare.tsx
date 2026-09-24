import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {fmt, NumFormat} from '../lib/format';
import {C, F, halo, L, T, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Land, lead, MonoLabel, Sfx, SourceLine, vary} from './common';

type Item = {label: string; value: number; tone?: Tone; at?: number};
type P = {items: Item[]; format?: NumFormat; delta?: {text: string; tone?: Tone; at?: number}; title?: string; source?: string};

// Before/after bars from a common zero baseline (never a truncated axis). The bar that
// hurts or helps the viewer gets its data colour; the old level stays as a dashed line.
export const Compare: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const e = entrance(ctx); // the frame (baseline, title) stands on the cut frame of a later scene
  const n = p.items.length;
  const baseline = 1010;
  const maxH = p.delta || p.title ? 360 : 470; // leave the top-left free for the delta / title
  const max = Math.max(1e-9, ...p.items.map((i) => i.value));
  const barW = n === 2 ? 250 : 190;
  const gap = n === 2 ? 130 : 70;
  const totalW = n * barW + (n - 1) * gap;
  const x0 = (1080 - totalW) / 2;
  const starts = p.items.map((it, i) => (it.at !== undefined ? cueFrame(ctx, it.at) : base + 6 + i * 8));
  const lastLand = Math.max(...starts) + 30;
  return (
    <>
      {p.title ? (
        <div style={{position: 'absolute', top: 420, left: L.side, right: L.side, fontFamily: F.sans, fontWeight: 500, fontSize: 48, color: C.ink, opacity: spr(frame, e)}}>{p.title}</div>
      ) : null}
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        <line x1={L.side} x2={1080 - L.side} y1={baseline} y2={baseline} stroke={C.rule} strokeWidth={2} strokeDasharray="6 8" opacity={prog(frame, e, 12)} />
        {p.items.map((it, i) => {
          const h = (it.value / max) * maxH;
          const x = x0 + i * (barW + gap);
          const draw = prog(frame, starts[i], 24, ease.drawOn);
          const grow = prog(frame, starts[i], 26, ease.enter);
          const hh = h * grow;
          const color = toneLine(it.tone);
          const fill = it.tone && it.tone !== 'neutral' ? color : C.ink;
          const per = 2 * (barW + h);
          return (
            <g key={i}>
              <rect x={x} y={baseline - hh} width={barW} height={hh} fill={fill} opacity={0.12 * grow} />
              <rect
                x={x}
                y={baseline - h}
                width={barW}
                height={h}
                fill="none"
                stroke={color}
                strokeWidth={it.tone && it.tone !== 'neutral' ? 3 : 2}
                strokeDasharray={per}
                strokeDashoffset={per * (1 - draw)}
                style={{filter: it.tone && it.tone !== 'neutral' ? `drop-shadow(0 0 14px ${halo(color, 0.53)})` : undefined}}
              />
            </g>
          );
        })}
        {n >= 2 ? (
          <line
            x1={x0 + barW}
            x2={x0 + barW + gap + barW}
            y1={baseline - (p.items[0].value / max) * maxH}
            y2={baseline - (p.items[0].value / max) * maxH}
            stroke={C.ink2}
            strokeWidth={2}
            strokeDasharray="5 7"
            opacity={prog(frame, starts[1], 14)}
          />
        ) : null}
      </svg>
      {p.items.map((it, i) => {
        const h = (it.value / max) * maxH;
        const x = x0 + i * (barW + gap);
        const t = prog(frame, starts[i], 30, ease.countUp);
        const v = t > 0.92 ? it.value : it.value * t;
        const land = spr(frame, starts[i] + 30, 'land');
        return (
          <React.Fragment key={i}>
            <div
              style={{
                position: 'absolute',
                left: x - 60,
                width: barW + 120,
                top: baseline - h - 84,
                textAlign: 'center',
                fontFamily: F.sans,
                fontWeight: 600,
                fontSize: 64,
                fontFeatureSettings: '"tnum" 1',
                color: toneLine(it.tone), // one shade per shot: the bar's own colour
                opacity: frame >= starts[i] ? 1 : 0,
                transform: `scale(${1 + 0.02 * Math.sin(Math.min(1, land) * Math.PI)})`,
                whiteSpace: 'nowrap',
              }}
            >
              {fmt(v, p.format ?? 'int')}
            </div>
            <MonoLabel text={it.label} at={starts[i] + 4} style={{position: 'absolute', left: x - 40, width: barW + 80, top: baseline + 22, textAlign: 'center'}} size={T.label} sfx={false} />
            <Sfx name="asmr-count-roll" at={starts[i]} volume={0.36 * vary(i, 0.1)} /* event: the bar grows and its number counts up */ />
            <Land at={starts[i] + 30} volume={0.52} /* event: the number lands */ />
          </React.Fragment>
        );
      })}
      {p.delta ? (
        <div
          style={{
            position: 'absolute',
            left: L.side,
            top: 430,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: T.statM,
            fontFeatureSettings: '"tnum" 1',
            color: toneLine(p.delta.tone ?? 'down'),
            opacity: spr(frame, p.delta.at !== undefined ? cueFrame(ctx, p.delta.at) : lastLand + 4),
          }}
        >
          {p.delta.text}
        </div>
      ) : null}
      <SourceLine text={p.source} at={base + 12} y={1100} />
      {p.delta ? <Sfx name="asmr-knock" at={p.delta.at !== undefined ? cueFrame(ctx, p.delta.at) : lastLand + 4} volume={0.42} /* event: the delta appears */ /> : null}
      {p.delta ? <Haptic kind="rigid" at={p.delta.at !== undefined ? cueFrame(ctx, p.delta.at) : lastLand + 4} /* event: the difference locks in under the bars */ /> : null}
    </>
  );
};
