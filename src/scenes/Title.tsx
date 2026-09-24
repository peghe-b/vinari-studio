import React from 'react';
import {useCurrentFrame} from 'remotion';
import {prog, spr} from '../lib/anim';
import {mtav} from '../lib/format';
import {TXT} from '../lib/layer';
import {textWidth} from '../lib/measure';
import {C, F, L, Tone, toneBig, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Haptic, lead, Sfx, SourceLine, toneHaptic} from './common';

type Line = string | {text: string; at?: number; tone?: Tone};
type P = {
  lines: Line[];
  size?: number;
  strips?: boolean; // pollar cover look: dark text on light strips
  align?: 'left' | 'center';
  y?: number;
  kicker?: string; // small mono line above
  source?: string;
};

const MAX_W = 1080 - 2 * L.side;
// A strip reaches STRIP_OUT px left of the text column and pads the text by STRIP_PAD: its left edge
// lands on stage 114 = frame 71 (SAFE.left 70: the old 18 px put it at frame 58, outside), and the
// widest strip (text + both pads) still ends at stage 966 = frame 1009 (inside SAFE.right 1025).
const STRIP_OUT = 6;
const STRIP_PAD = 18;
const STRIP_MAX_W = MAX_W + 2 * STRIP_OUT - 2 * STRIP_PAD;
/** Set width of one line: its words (letter-spacing -0.01em) plus the 0.26em gaps between them. */
const lineWidth = (text: string, size: number) => {
  const words = text.split(' ');
  return words.reduce((w, x) => w + textWidth(x, `600 ${size}px ${F.sans}`, -0.01 * size), 0) + (words.length - 1) * size * 0.26;
};

// Big Georgian statement or question, in Mtavruli (lib/format.ts mtav()). Words rise in with the app's
// .smooth spring, 2 frames apart. The words are text (the text layer, clean); a strip is graphics (the
// lens layer). A line can wait for a subtitle chunk ("at") and carry a data tone.
// A line never wraps: the whole block shrinks until its widest line fits the 840 px content
// width, so the centring always counts the lines that are really there.
export const Title: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const align = p.align ?? 'left';
  const base = lead(ctx);
  const e = entrance(ctx); // lines without their own `at` already stand on a later scene's cut frame
  const lines = p.lines.map((l) => (typeof l === 'string' ? {text: mtav(l)} : {...l, text: mtav(l.text)}));
  const want = p.size ?? 84;
  const widest = Math.max(1, ...lines.map((l) => lineWidth(l.text, want)));
  const maxW = p.strips ? STRIP_MAX_W : MAX_W;
  const size = widest > maxW ? Math.floor((want * maxW) / widest) : want;
  const lineH = size * (p.strips ? 1.32 : 1.18);
  const top = p.y ?? Math.round((L.contentTop + L.contentBottom) / 2 - (lines.length * lineH) / 2);
  return (
    <>
      {p.kicker ? (
        <div className={TXT} style={{position: 'absolute', top: top - 70, left: L.side, right: L.side, textAlign: align, fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, opacity: prog(frame, e, 10)}}>
          {mtav(p.kicker)}
        </div>
      ) : null}
      {lines.map((l, li) => {
        const start = Math.max(e + li * 5, l.at !== undefined ? cueFrame(ctx, l.at) : e + li * 5);
        const words = l.text.split(' ');
        const toned = Boolean(l.tone && l.tone !== 'neutral');
        // a strip: the light strip with dark text on the black film, a white card with ink text on paper;
        // a toned line's strip is its data colour on both
        const color = p.strips ? (toned ? C.onInk : C.onStrip) : toneBig(l.tone);
        const stripP = prog(frame, start, 8);
        return (
          <div
            key={li}
            style={{
              position: 'absolute',
              top: top + li * lineH,
              left: L.side - (p.strips ? STRIP_OUT : 0),
              right: L.side - (p.strips ? STRIP_OUT : 0),
              textAlign: align,
              fontFamily: F.sans,
              fontWeight: 600,
              fontSize: size,
              lineHeight: 1.12,
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
              color,
            }}
          >
            <span style={{position: 'relative', display: 'inline-block', padding: p.strips ? `4px ${STRIP_PAD}px 10px` : 0}}>
              {p.strips ? (
                <span
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: toned ? toneBig(l.tone) : C.strip,
                    boxShadow: toned ? undefined : `inset 0 0 0 1.5px ${C.stripEdge}`,
                    transformOrigin: 'left center',
                    transform: `scaleX(${stripP})`,
                  }}
                />
              ) : null}
              {words.map((w, wi) => {
                const s = spr(frame, start + (p.strips ? 4 : 0) + wi * 2);
                return (
                  <span key={wi} className={TXT} style={{position: 'relative', display: 'inline-block', opacity: s, transform: `translateY(${(1 - s) * 24}px)`, marginRight: wi < words.length - 1 ? size * 0.26 : 0}}>
                    {w}
                  </span>
                );
              })}
            </span>
          </div>
        );
      })}
      <SourceLine text={p.source} at={base + 20} />
      {/* a line that waits for its own word lands with a sound; the entrance itself has the cut */}
      {lines.map((l, li) => {
        const start = Math.max(base + li * 5, l.at !== undefined ? cueFrame(ctx, l.at) : base + li * 5);
        const first = lines.findIndex((m, lj) => Math.max(base + lj * 5, m.at !== undefined ? cueFrame(ctx, m.at) : base + lj * 5) === start);
        if (start <= base + li * 5 || first !== li) return null; // lines rising together sound once
        return (
          <React.Fragment key={li}>
            {p.strips ? (
              <Sfx name="asmr-strike" at={start} volume={0.4} len={11} /* event: the strip swipes in (8 frames) */ />
            ) : (
              <Sfx name="asmr-knock" at={start + 2} volume={0.4} /* event: the line's words rise in */ />
            )}
            {/* the line lands; its haptic carries the line's data tone (a red line costs the viewer) */}
            <Haptic kind={toneHaptic(l.tone)} at={start + (p.strips ? 4 : 2)} volume={l.tone === 'down' ? 0.32 : 0.36} />
          </React.Fragment>
        );
      })}
    </>
  );
};
