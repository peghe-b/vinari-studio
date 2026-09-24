import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {capsLatin, fmt, NumFormat} from '../lib/format';
import {C, F, halo, L, T, Tone, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, Land, lead, Sfx, SourceLine} from './common';

type P = {
  value: number;
  from?: number;
  format?: NumFormat;
  decimals?: number;
  tone?: Tone;
  at?: number; // chunk index where the count starts
  landAt?: number; // chunk index where it lands: the count then runs under the voice until that word
  chips?: string[]; // mono spec chips above, typed one by one
  label?: string; // small line above the number
  caption?: string; // line under the number
  source?: string; // mono "source · date" line, required for real numbers
  delta?: {text: string; tone?: Tone};
};

// A true number counting up and landing (app .snappy spring + the app's "landed" sound).
export const Stat: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const countAt = p.at !== undefined ? cueFrame(ctx, p.at) : base + 8;
  const countDur = p.landAt !== undefined ? Math.max(20, cueFrame(ctx, p.landAt) - countAt + 20) : Math.abs(p.value) >= 100000 ? 36 : 30;
  const landAt = countAt + countDur;
  const t = prog(frame, countAt, countDur, ease.countUp);
  const from = p.from ?? 0;
  const v = t >= 0.92 ? p.value : from + (p.value - from) * t;
  const land = spr(frame, landAt, 'land');
  const bump = 1 + 0.02 * Math.sin(Math.min(1, land) * Math.PI);
  const visible = frame >= countAt;
  const blur = visible ? (1 - prog(frame, countAt, countDur * 0.8)) * 5 : 0;
  const chips = p.chips ?? [];
  const top = 540;
  return (
    <>
      {chips.length ? (
        <div style={{position: 'absolute', top, left: L.side, display: 'flex', gap: 16}}>
          {chips.map((c, i) => {
            const s = spr(frame, base + 4 + i * 5);
            return (
              <div
                key={i}
                style={{
                  fontFamily: F.mono,
                  fontSize: 30,
                  letterSpacing: '0.04em',
                  color: C.ink,
                  border: `2px solid ${C.rule}`,
                  borderRadius: 10,
                  padding: '10px 18px 12px',
                  opacity: s,
                  transform: `translateY(${(1 - s) * 16}px)`,
                }}
              >
                {capsLatin(c)}
              </div>
            );
          })}
        </div>
      ) : null}
      {p.label ? (
        <div style={{position: 'absolute', top: top + (chips.length ? 120 : 60), left: L.side, fontFamily: F.sans, fontWeight: 500, fontSize: T.caption, color: C.ink2, opacity: spr(frame, base + 2)}}>
          {p.label}
        </div>
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: top + (chips.length ? 180 : 120),
          left: L.side + 4,
          fontFamily: F.sans,
          fontWeight: 600,
          fontSize: T.stat,
          lineHeight: 1,
          letterSpacing: '-0.02em',
          fontFeatureSettings: '"tnum" 1, "lnum" 1',
          color: toneText(p.tone),
          opacity: visible ? 1 : 0,
          filter: blur > 0.3 ? `blur(${blur}px)` : undefined,
          transform: `scale(${bump})`,
          transformOrigin: 'left center',
          textShadow: p.tone && p.tone !== 'neutral' ? `0 0 38px ${halo(toneLine(p.tone), 0.27)}` : undefined,
          whiteSpace: 'nowrap',
        }}
      >
        {fmt(v, p.format ?? 'int', p.decimals ?? 0)}
      </div>
      {p.delta ? (
        <div
          style={{
            position: 'absolute',
            top: top + (chips.length ? 180 : 120) - 50,
            left: L.side + 2,
            fontFamily: F.sans,
            fontWeight: 600,
            fontSize: 44,
            fontFeatureSettings: '"tnum" 1',
            color: toneText(p.delta.tone ?? p.tone),
            opacity: spr(frame, landAt + 4),
          }}
        >
          {p.delta.text}
        </div>
      ) : null}
      {p.caption ? (
        <div style={{position: 'absolute', top: top + (chips.length ? 400 : 340), left: L.side, right: L.side, fontFamily: F.sans, fontWeight: 400, fontSize: T.caption, lineHeight: 1.3, color: C.ink2, opacity: spr(frame, landAt + 2)}}>
          {p.caption}
        </div>
      ) : null}
      <SourceLine text={p.source} at={landAt + 6} />
      <Sfx name={Math.abs(p.value) >= 100000 ? 'asmr-count-roll-long' : 'asmr-count-roll'} at={countAt} volume={0.42} /* event: the number starts counting up */ />
      <Land at={landAt} volume={0.6} /* event: the number lands */ />
    </>
  );
};
