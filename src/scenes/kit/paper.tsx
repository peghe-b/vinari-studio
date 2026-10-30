// The paper kit's shared parts, only what the humour scenes need (ShoutType, JamGrid, SideCar, NewsCard and the hand marker
// kit/ink.tsx). Ported on 2026-10-31 from phase 2's src/scenes/kit/p2.tsx (tag before-rollback-1030) WITHOUT the phase-2
// look: no data-accent switch, no black-and-white swap; the colours are the film's own tokens (C), so a humour film renders
// in the studio's normal light or dark look. Text is measured before it is set (src/lib/textfit.mjs).
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {STAGE, TEXT_INSET, TEXT_W as STAGE_TEXT_W, ttFitW} from '../../lib/stagebox.mjs';
import {fitLines} from '../../lib/textfit.mjs';
import {C, F, isLight} from '../../tokens';

/** The slow drift a paper shot carries (1.5 % over the shot) and the inset it needs: text at the kit's edges stays inside
 *  frame x 65..1015 at the deepest push. */
export const DRIFT = 0.015;
/** The stage box (stage units): everything whole inside it; the caption band starts under its foot. The kit sets its text
 *  inside left..right (the stage less the drift's inset). */
export const S = {...STAGE, left: STAGE.left + TEXT_INSET, right: STAGE.right - TEXT_INSET};
export const TEXT_W = Math.min(STAGE_TEXT_W, S.right - S.left);

export type PaperTone = 'ink' | 'quiet' | 'red' | 'green' | 'accent';
/** The colours, read at render (the theme may be dark): ink, a quiet grey, red for a cost or a claim; a gain and the marker's
 *  strike and tick read in ink. */
export const tone = (t: PaperTone | undefined) => (t === 'quiet' ? C.ink2 : t === 'red' ? C.downLine : C.ink);
export const card = () => C.surface;
export const hair = () => (isLight() ? 'rgba(11,11,11,0.10)' : 'rgba(245,245,245,0.14)');
export const shadow = (k = 1) => (isLight() ? `0 ${18 * k}px ${48 * k}px rgba(11,11,11,${(0.1 * k).toFixed(3)}), 0 ${2 * k}px ${6 * k}px rgba(11,11,11,0.06)` : 'none');

/** Text set in its box at the biggest size that fits (fitLines), Mtavruli unless `latin`, rising in line by line. */
export const FitText: React.FC<{
  text: string;
  x: number;
  y: number;
  w?: number;
  size?: number;
  min?: number;
  maxLines?: number;
  weight?: 500 | 600 | 700;
  align?: 'left' | 'center' | 'right';
  t?: PaperTone;
  at?: number;
  anim?: 'rise' | 'slam' | 'none';
  latin?: boolean;
  lineHeight?: number;
  tracking?: number;
  style?: React.CSSProperties;
}> = ({text, x, y, w = TEXT_W, size = 96, min = 40, maxLines = 2, weight = 700, align = 'left', t, at = 0, anim = 'rise', latin = false, lineHeight = 1.04, tracking = -0.01, style}) => {
  const frame = useCurrentFrame();
  // nothing under TikTok's action column (src/lib/stagebox.mjs TT): a line box in its band ends at stage x 894
  w = align === 'right' ? w : ttFitW(w, {...(align === 'center' ? {cx: x} : {x}), y0: y, y1: y + maxLines * size * lineHeight});
  const fit = fitLines(text, w, maxLines, size, {weight, mtav: !latin, min, tracking});
  const px = fit.size;
  return (
    <>
      {fit.lines.map((ln, i) => {
        const a = at + i * 3;
        const s = anim === 'none' ? 1 : anim === 'slam' ? spr(frame, a, 'punch') : prog(frame, a, 9, ease.whipOut);
        const scale = anim === 'slam' ? 1.25 - 0.25 * Math.min(1, s) : 1;
        const dy = anim === 'rise' ? (1 - s) * px * 0.32 : 0;
        return (
          <div
            key={i}
            className={TXT}
            style={{
              position: 'absolute',
              left: align === 'left' ? x : align === 'center' ? x - w / 2 : x - w,
              width: w,
              top: y + i * px * lineHeight,
              textAlign: align,
              fontFamily: F.sans,
              fontWeight: weight,
              fontSize: px,
              lineHeight: `${Math.round(px * lineHeight)}px`,
              letterSpacing: `${tracking}em`,
              color: tone(t),
              whiteSpace: 'nowrap',
              opacity: anim === 'none' ? 1 : frame < a ? 0 : Math.min(1, s * 1.4),
              transform: `translateY(${dy.toFixed(2)}px) scale(${scale.toFixed(4)})`,
              transformOrigin: align === 'center' ? 'center center' : `${align} center`,
              clipPath: anim === 'rise' ? 'inset(-20% -5% -20% -5%)' : undefined,
              ...style,
            }}
          >
            {latin ? ln : mtav(ln)}
          </div>
        );
      })}
    </>
  );
};

/** A card on the field: a soft shadow on the light look, a hairline on the dark one. A thing the guards keep whole. */
export const Card: React.FC<{x: number; y: number; w: number; h: number; r?: number; children?: React.ReactNode; style?: React.CSSProperties; whole?: boolean}> = ({x, y, w, h, r = 28, children, style, whole = true}) => (
  <div
    className={whole ? OBJ : undefined}
    style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: card(), boxShadow: shadow(), border: isLight() ? undefined : `2px solid ${hair()}`, overflow: 'hidden', ...style}}
  >
    {children}
  </div>
);

/** The slow camera drift a paper shot carries (DRIFT over the shot towards its focus), as a transform for the shot's root. */
export const drift = (frame: number, dur: number, focus: {x: number; y: number} = {x: S.cx, y: S.cy}, amount = DRIFT) => {
  const u = Math.min(1, Math.max(0, frame / Math.max(1, dur)));
  const s = 1 + Math.min(DRIFT, amount) * ease.drift(u);
  const fx = Math.min(S.cx + 150, Math.max(S.cx - 150, focus.x));
  const fy = Math.min(S.bottom - 100, Math.max(S.top + 100, focus.y));
  return {transform: `scale(${s.toFixed(5)})`, transformOrigin: `${fx}px ${fy}px`} as React.CSSProperties;
};
