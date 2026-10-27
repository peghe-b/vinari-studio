import React from 'react';
import {interpolateColors, useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../lib/anim';
import {TXT} from '../lib/layer';
import {P2_TT_W} from '../lib/p2.mjs';
import {codeParts} from '../lib/r3.mjs';
import {sizeFor, textW} from '../lib/textfit.mjs';
import {C, F} from '../tokens';
import type {SceneCtx} from '../types';
import {card, drift, fitHeight, FitText, S, shadow, tone} from './kit/p2';
import type {P2Tone} from './kit/p2';
import {cueFrame, entrance, Sfx} from './common';

type Part = {
  /** a run of the code's own characters, exactly as printed („5W", „30", „P", „0300") */
  part: string;
  /** what it means, plain Georgian (4 words at most): the term; the voice says it another way (DUP_SUBTITLE) */
  means: string;
  /** the chunk this part is read on (default: evenly spaced) */
  at?: number | string;
};
type P = {
  /** the code as printed on the thing: an OBD code, an oil grade, a tyre's size or DOT, a VIN's part, an auction term
   *  (Latin, digits and signs, 16 characters at most) */
  code: string;
  /** what it is, a quiet line over it („ზეთის ბოთლზე", „OBD კოდი"; 3 words) */
  kind?: string;
  /** 1 to 4 parts in reading order, each found in `code` (tools/ci/p2lint.mjs CODE_PART) */
  parts: Part[];
  /** the whole thing in plain Georgian, said last (5 words at most) */
  sum?: {text: string; at?: number | string};
  /** the part being read: 'ink' (default: the others fade back) or the film's data accent */
  t?: P2Tone;
};

const CODE_MAX = 260;
const PANEL_H = 360;

// CodeAnatomy (r3, the craft audit's "decode" beat; the diagnostics promo's P0300 morphing into Georgian, v136's „5W-30"
// drawn by hand): a code nobody can read, taken apart. Frame 0 shows the code whole and big (a hook). On the first part the
// code rises to the top, a bracket draws under that part (BEZ.pen), its leader drops into a white panel and the panel says
// what the part means; the other characters fade back. Each next part moves the bracket; `sum` ends on the plain meaning.
// Every character sits where the font table measures it (src/lib/textfit.mjs), so the bracket is always under its part.
export const CodeAnatomy: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = entrance(ctx);
  const code = String(p.code ?? '');
  const parts = codeParts(code, p.parts ?? []).slice(0, 4);
  const n = parts.length;
  const steps = n + (p.sum ? 1 : 0);
  const per = Math.min(45, Math.max(24, Math.floor((ctx.dur - 30) / Math.max(1, steps))));
  const first = Math.max(base + 20, ctx.index === 0 ? 14 : 8);
  const at = parts.map((q, i) => (q.at !== undefined ? cueFrame(ctx, q.at) : first + i * per));
  const sumAt = p.sum ? (p.sum.at !== undefined ? cueFrame(ctx, p.sum.at) : (at[n - 1] ?? first) + per) : Infinity;
  // centred in the stage before the reading, the code crosses TikTok's action column band: 708 px wide at most there
  const size = sizeFor(code, P2_TT_W, CODE_MAX, {weight: 700});
  const codeW = textW(code, size, {weight: 700});
  const x0 = S.cx - codeW / 2;
  const lh = Math.round(size * 1.08);
  // where the code stands: centred in the stage before the first part, at the top once the reading starts
  const topY = S.top + (p.kind ? 64 : 10);
  const midY = S.cy - lh / 2 + (p.kind ? 30 : 0);
  const up = n ? prog(frame, at[0] - 4, 12, ease.whipOut) : 0;
  const codeY = midY + (topY - midY) * up;
  const cur = frame >= sumAt ? -1 : at.reduce((c, f, i) => (frame >= f ? i : c), -1);
  // the first part's marks wait for the code's rise to end (at[0] + 8): nothing draws across a moving word
  const go = at.map((f, i) => (i === 0 ? f + 8 : f));
  const bracketY = topY + lh + 14;
  const panelY = bracketY + 96;
  const panelOn = n ? spr(frame, go[0], 'enter') : 0;
  const hi = tone(p.t ?? 'ink');
  // the dimming of the parts not being read (back to ink on the sum)
  const dimAt = (i: number) => {
    if (cur < 0) return frame >= sumAt ? 1 - 0.7 * (1 - prog(frame, sumAt, 8)) : 1;
    const q = parts[cur];
    return i >= q.start && i < q.end ? 1 : 0.3 + 0.7 * (1 - prog(frame, at[cur], 6));
  };
  const chars = [...code];
  const xs = chars.map((_, i) => x0 + textW(chars.slice(0, i).join(''), size, {weight: 700}));
  const partX = (q: {start: number; end: number}) => [xs[q.start] ?? x0, q.end < chars.length ? xs[q.end] : x0 + codeW] as const;
  return (
    <div style={{position: 'absolute', inset: 0, ...drift(frame, ctx.dur, {x: S.cx, y: n ? panelY : S.cy})}}>
      {p.kind ? <FitText text={p.kind} x={S.left} y={codeY - 64} w={S.right - S.left} size={44} min={34} maxLines={1} weight={600} t="quiet" at={base + 2} anim="none" /> : null}
      {/* the code: every character at its measured x */}
      {chars.map((ch, i) => {
        const inCur = cur >= 0 && i >= parts[cur].start && i < parts[cur].end;
        const col = inCur ? interpolateColors(prog(frame, at[cur], 6), [0, 1], [C.ink, hi]) : C.ink;
        return (
          <div key={i} className={TXT} style={{position: 'absolute', left: xs[i], top: codeY, fontFamily: F.sans, fontWeight: 700, fontSize: size, lineHeight: `${lh}px`, color: col, whiteSpace: 'pre', opacity: dimAt(i) * Math.min(1, prog(frame, base, 6) * 1.5), fontFeatureSettings: '"tnum" 1, "lnum" 1'}}>
            {ch}
          </div>
        );
      })}
      {/* the bracket under the part being read and its leader into the panel */}
      <svg width={1080} height={1920} style={{position: 'absolute', left: 0, top: 0, overflow: 'visible', pointerEvents: 'none'}}>
        {parts.map((q, i) => {
          if (i !== cur) return null;
          const [a, b] = partX(q);
          const l = a + 6;
          const r = Math.max(l + 20, b - 6);
          const mid = (l + r) / 2;
          const u = prog(frame, go[i] + 2, 8, ease.pen);
          const v = prog(frame, go[i] + 8, 8, ease.pen);
          const bLen = 2 * 22 + (r - l);
          const lLen = panelY - (bracketY + 22);
          return (
            <g key={i} stroke={hi} strokeWidth={6} fill="none" strokeLinecap="round" strokeLinejoin="round">
              <polyline points={`${l},${bracketY} ${l},${bracketY + 22} ${r},${bracketY + 22} ${r},${bracketY}`} strokeDasharray={bLen} strokeDashoffset={bLen * (1 - u)} />
              <line x1={mid} y1={bracketY + 22} x2={mid} y2={panelY} strokeDasharray={lLen} strokeDashoffset={lLen * (1 - v)} />
            </g>
          );
        })}
      </svg>
      {/* the panel: the part big, what it means under it, both in with the card (the review of 08a2624: an empty card for 6
          frames, a lone chip for 12); the sum at the end, centred in the panel */}
      {n ? (
        <div className="vn-obj" style={{position: 'absolute', left: S.left, top: panelY, width: S.right - S.left, height: PANEL_H, borderRadius: 28, background: card(), boxShadow: shadow(), opacity: Math.min(1, panelOn * 1.4), transform: `translateY(${(1 - panelOn) * 50}px)`}} />
      ) : null}
      {parts.map((q, i) => {
        if (i !== cur) return null;
        const chipSize = Math.min(110, sizeFor(q.part, 560, 110, {weight: 700}));
        return (
          <React.Fragment key={i}>
            <div className={TXT} style={{position: 'absolute', left: S.left + 48, top: panelY + 36, fontFamily: F.sans, fontWeight: 700, fontSize: chipSize, lineHeight: `${Math.round(chipSize * 1.08)}px`, color: hi, whiteSpace: 'pre', opacity: prog(frame, go[i] + 1, 5), transform: `translateY(${(1 - prog(frame, go[i] + 1, 9, ease.whipOut)) * 30}px)`, fontFeatureSettings: '"tnum" 1'}}>
              {q.part}
            </div>
            <FitText text={q.means} x={S.left + 48} y={panelY + 60 + Math.round(chipSize * 1.08)} w={S.right - S.left - 96} size={72} min={40} maxLines={2} weight={700} at={go[i] + 4} />
          </React.Fragment>
        );
      })}
      {p.sum && frame >= sumAt ? <FitText text={p.sum.text} x={(S.left + S.right) / 2} align="center" y={panelY + (PANEL_H - fitHeight(p.sum.text, Math.min(S.right - S.left - 96, P2_TT_W), 130, 2, 700, false, 1.04, 56)) / 2} w={S.right - S.left - 96} size={130} min={56} maxLines={2} weight={700} at={sumAt + 4} anim="slam" /> : null}
      {at.map((f, i) => (
        <Sfx key={i} name="asmr-ui-tick" at={go[i] + 2} volume={0.3} /* event: the bracket starts under the part */ />
      ))}
      {p.sum ? <Sfx name="app-landed" at={sumAt + 4} volume={0.3} /* event: the plain meaning lands */ /> : null}
    </div>
  );
};
