// The phase-2 kit's shared parts (src/lib/p2.mjs): black and white, colour on data only, every text measured before it is
// set (src/lib/textfit.mjs), the shared curves (BEZ.pen, BEZ.data). The P2 scenes (KeywordLift, Receipt, UnitGrid,
// ScaleReveal, RankShift, RouteTrace, WipeCompare, FilmTitleCard, ScreenFocus, TapTrail, ScreenDeck, FreezeTag, IrisDetail,
// TypeDive, ShapeMatch) and a film's own Film scene compose these.
import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, spr} from '../../lib/anim';
import {mtav} from '../../lib/format';
import {OBJ, TXT} from '../../lib/layer';
import {P2_STAGE, P2_TEXT_INSET, P2_TEXT_W} from '../../lib/p2.mjs';
import {fitLines} from '../../lib/textfit.mjs';
import {ScreenImg} from '../../lib/screen';
import {C, dataAccent, F, isLight, rgba} from '../../tokens';

/** The slow drift every P2 shot carries (1.5 % over the shot) and the inset it needs: text set at the kit's edges stays
 *  inside frame x 65..1015 at the deepest push of everything that may scale a shot at once (this drift, the rig's free
 *  camera 0.8 %, and the guards' breath 3.5 % on a shot held past 2.5 s: src/lib/guard.mjs BREATH), whatever the focus
 *  (clamped to 150 px of the centre). The cloud stills had text at frame x 33 under a 3.5 % drift, then x 52 under all three. */
export const DRIFT = 0.015;
const INSET = P2_TEXT_INSET;
/** The P2 stage box (stage units): everything whole inside it; the caption band starts under its foot. The kit sets its
 *  text inside left..right (the stage less the drift's inset). */
export const S = {...P2_STAGE, left: P2_STAGE.left + INSET, right: P2_STAGE.right - INSET};
export const TEXT_W = Math.min(P2_TEXT_W, S.right - S.left);

export type P2Tone = 'ink' | 'quiet' | 'red' | 'green' | 'accent';
/** The colours, read at render (the theme may be dark): ink, a quiet grey, red a cost or a strike, green a gain or a tick,
 *  the film's ONE data accent (or the ink when it has none). */
export const tone = (t: P2Tone | undefined) =>
  t === 'quiet' ? C.ink2 : t === 'red' ? C.downLine : t === 'green' ? C.upLine : t === 'accent' ? dataAccent() : C.ink;
export const card = () => C.surface;
export const paper = () => C.bg;
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
  t?: P2Tone;
  at?: number;
  anim?: 'rise' | 'slam' | 'none';
  latin?: boolean;
  lineHeight?: number;
  tracking?: number;
  style?: React.CSSProperties;
}> = ({text, x, y, w = TEXT_W, size = 96, min = 40, maxLines = 2, weight = 700, align = 'left', t, at = 0, anim = 'rise', latin = false, lineHeight = 1.04, tracking = -0.01, style}) => {
  const frame = useCurrentFrame();
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

/** The height FitText takes for these props (lines x size x lineHeight). */
export const fitHeight = (text: string, w: number, size: number, maxLines = 2, weight = 700, latin = false, lineHeight = 1.04, min = 40) => {
  const f = fitLines(text, w, maxLines, size, {weight, mtav: !latin, min});
  return f.lines.length * f.size * lineHeight;
};

/** A white card on the paper: a soft shadow on the light look, a hairline on the dark one. A thing the guards keep whole. */
export const Card: React.FC<{x: number; y: number; w: number; h: number; r?: number; children?: React.ReactNode; style?: React.CSSProperties; whole?: boolean}> = ({x, y, w, h, r = 28, children, style, whole = true}) => (
  <div
    className={whole ? OBJ : undefined}
    style={{position: 'absolute', left: x, top: y, width: w, height: h, borderRadius: r, background: card(), boxShadow: shadow(), border: isLight() ? undefined : `2px solid ${hair()}`, overflow: 'hidden', ...style}}
  >
    {children}
  </div>
);

/** A small quiet line: a source, a date, a unit (FiraGO 34 px, the ink's grey; 34 px is the kit's smallest text). */
export const Quiet: React.FC<{text: string; x: number; y: number; w?: number; at?: number; align?: 'left' | 'center' | 'right'; latin?: boolean}> = ({text, x, y, w = 600, at = 0, align = 'left', latin}) => {
  const frame = useCurrentFrame();
  return (
    <div
      className={TXT}
      style={{position: 'absolute', left: align === 'left' ? x : align === 'center' ? x - w / 2 : x - w, width: w, top: y, textAlign: align, fontFamily: F.sans, fontWeight: 500, fontSize: 34, lineHeight: '42px', color: C.ink2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'clip', opacity: prog(frame, at, 8)}}
    >
      {latin ? text : mtav(text)}
    </div>
  );
};

/** The slow camera drift every P2 shot carries (DRIFT over the shot towards its focus), as a transform for the shot's root. */
export const drift = (frame: number, dur: number, focus: {x: number; y: number} = {x: S.cx, y: S.cy}, amount = DRIFT) => {
  const u = Math.min(1, Math.max(0, frame / Math.max(1, dur)));
  const s = 1 + Math.min(DRIFT, amount) * ease.drift(u);
  const fx = Math.min(S.cx + 150, Math.max(S.cx - 150, focus.x));
  const fy = Math.min(S.bottom - 100, Math.max(S.top + 100, focus.y));
  return {transform: `scale(${s.toFixed(5)})`, transformOrigin: `${fx}px ${fy}px`} as React.CSSProperties;
};

/** A soft scrim on a photo under the caption band (never a box behind the words): the frame's foot darkens or lightens. */
export const CaptionScrim: React.FC<{dark?: boolean}> = ({dark = true}) => (
  <div style={{position: 'absolute', left: -60, right: -60, top: 1180, height: 760, pointerEvents: 'none', background: `linear-gradient(180deg, ${rgba(dark ? '#000000' : '#FFFFFF', 0)} 0%, ${rgba(dark ? '#000000' : '#FFFFFF', 0.55)} 55%, ${rgba(dark ? '#000000' : '#FFFFFF', 0.7)} 100%)`}} />
);

/** Exactly one digit per cell (the films audit: rolling digits showed ghosts): each digit rolls inside its own clip. */
export const RollDigits: React.FC<{text: string; at: number; size: number; t?: P2Tone; dur?: number; weight?: number; seed?: number; settled?: boolean}> = ({text, at, size, t, dur = 18, weight = 700, seed = 1, settled = false}) => {
  const frame = useCurrentFrame();
  const cellH = Math.round(size * 1.08);
  return (
    <span className={TXT} style={{display: 'inline-flex', fontFamily: F.sans, fontWeight: weight, fontSize: size, lineHeight: `${cellH}px`, color: tone(t), fontFeatureSettings: '"tnum" 1, "lnum" 1', letterSpacing: '-0.02em'}}>
      {[...text].map((ch, i) => {
        if (!/[0-9]/.test(ch)) return <span key={i}>{ch}</span>;
        const d = Number(ch);
        const spins = 1 + ((i + seed) % 2); // a cell passes 10 or 20 digits before it lands
        // settled: the number reads from frame 0 (a hook's claim), no roll
        const u = settled ? 1 : ease.data(Math.min(1, Math.max(0, (frame - at - i * 2) / dur)));
        const pos = (spins * 10 + d) * u; // digits passed so far
        // one glyph a cell, always: the cell shows the digit it is on (never a strip between two), nudged down a little
        // inside its clip while it rolls, so the roll reads as motion without a second glyph ever entering the cell
        const shown = u >= 1 ? d : Math.floor(pos) % 10;
        const nudge = u >= 1 ? 0 : (pos % 1) * 0.14 * cellH;
        return (
          <span key={i} style={{display: 'inline-block', position: 'relative', height: cellH, overflow: 'hidden', clipPath: 'inset(0)', width: '0.62em', textAlign: 'center'}}>
            <span style={{display: 'block', transform: `translateY(${nudge.toFixed(2)}px)`, opacity: u >= 1 ? 1 : 0.92}}>{shown}</span>
          </span>
        );
      })}
    </span>
  );
};

// ---- the hero phone (phase 2, the films audit: a whole phone at 40 % of the width could not be read) --------------------
/** The captures are 1080 x 2346 (public/screens). */
export const CAP = {w: 1080, h: 2346} as const;
/** A whole phone `h` tall (stage), its screen inset by the bezel: the body, the screen rect, the corner radii (the screen's
 *  radius plus the bezel is the body's: concentric). */
export const phoneGeom = (h: number, cx: number = S.cx, cy: number = S.cy) => {
  const bezel = Math.round(h * 0.014);
  const sh = h - 2 * bezel;
  const sw = (sh * CAP.w) / CAP.h;
  const w = sw + 2 * bezel;
  const x = cx - w / 2;
  const y = cy - h / 2;
  const sr = Math.round(sw * 0.115);
  return {x, y, w, h, bezel, r: sr + bezel, screen: {x: x + bezel, y: y + bezel, w: sw, h: sh, r: sr}, k: sw / CAP.w};
};
/** The tallest whole phone the P2 stage holds (WHOLE: never cropped, never under the caption band). */
export const HERO_H = S.bottom - S.top - 20;

/** A whole, flat, refined phone: a black body, the real capture (ScreenImg: the one status bar), the island. `children`
 *  draw on the screen in capture px (scaled), e.g. a dim with a cut-out. */
export const HeroPhone: React.FC<{g: ReturnType<typeof phoneGeom>; screen: string; style?: React.CSSProperties; children?: React.ReactNode}> = ({g, screen, style, children}) => (
  <div className={OBJ} style={{position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h, borderRadius: g.r, background: '#0B0B0B', boxShadow: shadow(1.2), ...style}}>
    <div style={{position: 'absolute', left: g.bezel, top: g.bezel, width: g.screen.w, height: g.screen.h, borderRadius: g.screen.r, overflow: 'hidden', background: '#FFFFFF'}}>
      <ScreenImg src={screen} style={{position: 'absolute', left: 0, top: 0, width: g.screen.w, height: g.screen.h}} />
      <div style={{position: 'absolute', left: 0, top: 0, width: CAP.w, height: CAP.h, transform: `scale(${g.k})`, transformOrigin: '0 0'}}>{children}</div>
    </div>
    <div style={{position: 'absolute', left: g.w / 2 - g.screen.w * 0.15, top: g.bezel + g.screen.h * 0.012, width: g.screen.w * 0.3, height: g.screen.h * 0.017, borderRadius: 999, background: '#0B0B0B'}} />
  </div>
);

// ---- the marks a P2 scene takes from its spec ("marks": [{kind, box, at}], `at` a chunk index or "1.2s") -----------------
export type SpecMark = {kind: string; box: {x: number; y: number; w: number; h: number}; at?: number | string; seed?: number; label?: string};
/** A spec's marks with their `at` resolved to scene frames (a chunk index, "1.2s", or `fallback` frames). */
export const marksAt = <T extends SpecMark>(marks: T[] | undefined, frameOf: (at: unknown, fb: number) => number, fallback: number) =>
  (marks ?? []).map((m, i) => ({...m, at: frameOf(m.at, fallback + i * 10)})) as unknown as (Omit<T, 'at'> & {at: number})[];
