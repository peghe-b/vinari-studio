import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog} from '../lib/anim';
import {useCamera} from '../lib/camera';
import {FilmCtx} from '../lib/film';
import {textWidth} from '../lib/measure';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {Words} from '../lib/textfx';
import {C, F, L, Tone, toneLine} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, Sfx} from './common';
import {KHLine, normLines} from './KineticHeadline';

// ---- Callback: the hook comes back (2026-10-06, the stories category; one a film) -----------------------------------------
// The film's own first picture returns, frozen on one frame (default: the cover's frame, else 70 % into the hook), muted,
// under a slow push, and at `at` something lands on it: the twist written over the hook.
//   mark "strip" (default)  a pollar strip with lines[0]
//   mark "strike"           a neutral strike through lines[0], set over the picture (what we believed)
//   mark "ring"             a ring drawn around `ring` {x, y, r} (stage px)
// Props: frame, lines, mark, at (chunk or "1.2s"; default the entrance + 14), ring, tone. Only in an fx film (Promo
// provides the hook); elsewhere it draws its lines alone.

type At = number | string;
type P = {frame?: number; lines?: KHLine[]; mark?: 'strike' | 'ring' | 'strip'; at?: At; ring?: {x: number; y: number; r?: number}; tone?: Tone};

export const cbAt = (p: P, ctx: SceneCtx) => {
  const e = entrance(ctx);
  return p.at !== undefined ? Math.max(e + 6, cueFrame(ctx, p.at)) : e + 14;
};
export const cbKicks = (p: P, ctx: SceneCtx) => [cbAt(p, ctx)];

export const Callback: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const film = React.useContext(FilmCtx);
  const e = entrance(ctx);
  const at = cbAt(p, ctx);
  const cam = useCamera(1, {move: false});
  const mark = p.mark ?? 'strip';
  const lines = normLines(p.lines);
  const first = lines[0]?.text ?? '';
  const t = Math.min(1.2, Math.max(0, (frame - e) / Math.max(1, ctx.dur - e)));
  const f0 = p.frame ?? film?.hook.cover ?? Math.round((film?.hook.dur ?? 60) * 0.7);
  const veil = 0.35 * prog(frame, at - 6, 10);
  let over: React.ReactNode = null;
  if (mark === 'ring' && p.ring) {
    const r = p.ring.r ?? 150;
    const len = 2 * Math.PI * r;
    const k = prog(frame, at, 12, ease.drawOn);
    over = (
      <>
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <circle cx={p.ring.x} cy={p.ring.y} r={r} fill="none" stroke={toneLine(p.tone ?? 'neutral')} strokeWidth={3} strokeDasharray={len} strokeDashoffset={len * (1 - k)} transform={`rotate(-80 ${p.ring.x} ${p.ring.y})`} strokeLinecap="round" />
        </svg>
        <Sfx name="asmr-pencil-short" at={Math.max(0, at)} volume={0.4} />
      </>
    );
  } else if (first) {
    const size = 76;
    const w = Math.min(820, textWidth(mtav(first.replace(/\*/g, '')), `600 ${size}px ${F.sans}`) + 40);
    const strip = prog(frame, at, 8, ease.whipOut);
    over =
      mark === 'strike' ? (
        <div style={{position: 'absolute', left: L.side, top: L.contentMid - 50, whiteSpace: 'nowrap'}}>
          <Words text={first} at={e} fx="rise" size={size} strikeAt={at} strikeTone={p.tone === 'down' ? 'down' : 'neutral'} />
        </div>
      ) : (
        <>
          <div className={TXT} style={{position: 'absolute', left: L.side - 6, top: L.contentMid + 120, width: w, height: size * 1.36, backgroundColor: C.strip, boxShadow: `inset 0 0 0 1.5px ${C.stripEdge}`, transformOrigin: 'left center', transform: `scaleX(${strip.toFixed(4)})`}} />
          <div style={{position: 'absolute', left: L.side + 14, top: L.contentMid + 126, whiteSpace: 'nowrap'}}>
            <Words text={first} at={at + 4} fx="mask" size={size} color={C.onStrip} tone={undefined} />
          </div>
          <Sfx name="asmr-strike" at={Math.max(0, at)} volume={0.4} len={11} />
          <Haptic kind="light" at={Math.max(0, at + 4)} />
        </>
      );
  }
  return (
    <>
      <div style={{position: 'absolute', inset: 0, clipPath: `inset(${L.graphicsTop}px 0 ${1920 - L.graphicsBottom}px 0)`}}>
        <div style={{position: 'absolute', inset: 0, ...cam}}>
          <div style={{position: 'absolute', inset: 0, transform: `scale(${(1 + 0.03 * ease.drift(Math.min(1, t))).toFixed(5)})`, transformOrigin: `540px ${L.contentMid}px`, opacity: 1 - veil}}>{film ? film.frozen(0, f0) : null}</div>
        </div>
      </div>
      {over}
    </>
  );
};
