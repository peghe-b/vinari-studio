import React from 'react';
import {useCurrentFrame} from 'remotion';
import {ease, prog, rand, spr, typeOn} from '../lib/anim';
import {capsLatin} from '../lib/format';
import {C, F, halo, isLight, rgba, Tone, toneLine, toneText} from '../tokens';
import type {SceneCtx} from '../types';
import {cueFrame, entrance, Land, lead, Sfx, vary} from './common';

type P = {
  from: string; // what the board shows first, e.g. "2026" or "3 610 ₾"
  to: string; // where it lands, e.g. "2027" or "9 615 ₾"
  at?: number | string; // chunk where the flaps start falling, or seconds ("0.65s")
  label?: string; // mono line above the board
  tone?: string; // colour of the landed characters: "up", "down", "accent" or "neutral" (default)
  size?: number; // glyph size in px; default fits the board to the content width
  // full turns of the drum a digit makes before it lands. Unset: a short hop (under 4 cards) turns
  // once around first, so it still reads as a board flipping. 0 = the direct hop (6 -> 7 is one card).
  laps?: number;
};

// A mechanical split-flap board. Every changed character falls through its own flaps in the
// board's fixed order (digits count up, wrapping 9 to 0) and lands; unchanged characters
// never move. A flap is two halves: the old top falls away, the new bottom swings down.
//
// Honest money: only the first and the landed glyph are ever drawn in full ink. Every glyph in
// between is a blurred, half-bright smear, so a paused frame or a screenshot mid-flip never
// shows a clean price or time that is not in the spec. A non-digit target ("?") turns through
// blanks and dots, never through digits.
//
// Flat drawing on purpose: the flaps fold with scaleY(cos) and the board turns with one
// perspective transform, no preserve-3d / backface-visibility. Nested CSS 3D dropped tiles on
// single frames in parallel renders (concurrency 3 under ANGLE).

const ORDER = ' 0123456789';
const FLIP = 4; // frames per flap
const BLANKS = ['·', ' ', '·', ' ', '·']; // what a non-digit position turns through

const toneOf = (t?: string): Tone => (t === 'up' || t === 'down' || t === 'accent' ? t : 'neutral');

// the glyphs a position shows on its way from a to b, a first, b last
const path = (a: string, b: string, seed: number, laps?: number): string[] => {
  if (a === b) return [a];
  const ia = ORDER.indexOf(a);
  const ib = ORDER.indexOf(b);
  if (ia > 0 && ib > 0) {
    // digits run forward like a real drum; by default a short hop gets one full revolution first
    let steps = (ib - ia + 10) % 10;
    if (laps === undefined) {
      if (steps < 4) steps += 10;
    } else steps += 10 * Math.max(0, Math.round(laps));
    return Array.from({length: steps + 1}, (_, k) => ORDER[1 + ((ia - 1 + k) % 10)]);
  }
  if (ib > 0) {
    // into a digit from a blank or a sign: the last four cards of the drum before it
    return [a, ...Array.from({length: 3}, (_, j) => ORDER[1 + ((((ib - 1 - (3 - j)) % 10) + 10) % 10)]), b];
  }
  // into a sign ("?", "·", "₾"): blanks and dots, never a digit
  const k = 3 + Math.floor(rand(seed) * 3);
  const o = Math.floor(rand(seed * 3.7) * 2);
  return [a, ...Array.from({length: k}, (_, j) => BLANKS[(j + o) % BLANKS.length]), b];
};

export const SplitFlap: React.FC<{p: P; ctx: SceneCtx}> = ({p, ctx}) => {
  const frame = useCurrentFrame();
  const base = lead(ctx);
  const a = Array.from(p.from);
  const b = Array.from(p.to);
  const n = Math.max(a.length, b.length);
  const from = [...Array(n - a.length).fill(' '), ...a];
  const to = [...Array(n - b.length).fill(' '), ...b];
  const gapOnly = from.map((c, i) => c === ' ' && to[i] === ' ');
  const nTiles = gapOnly.filter((g) => !g).length;
  const gaps = n - nTiles;
  const size = p.size ?? Math.min(170, Math.floor(840 / (nTiles * 1.02 + gaps * 0.34)));
  const tw = Math.round(size * 0.92);
  const th = Math.round(size * 1.42);
  const gap = Math.round(size * 0.1);
  const widths = gapOnly.map((g) => (g ? Math.round(size * 0.22) : tw));
  const boardW = widths.reduce((s, w) => s + w, 0) + gap * (n - 1);
  const tone = toneOf(p.tone);
  const cy = 700;
  const top = cy - th / 2;

  const at = p.at !== undefined ? Math.max(base + 10, cueFrame(ctx, p.at)) : base + 16;
  const paths = from.map((c, i) => path(c, to[i], i + 1, p.laps));
  const starts = paths.map((_, i) => at + i * 2);
  const lands = paths.map((q, i) => starts[i] + (q.length - 1) * FLIP);
  const landAll = Math.max(...lands.filter((_, i) => paths[i].length > 1), at);
  const flapFrames = [...new Set(paths.flatMap((q, i) => q.slice(1).map((_, k) => starts[i] + k * FLIP)))].sort((x, y) => x - y).filter((f, k, arr) => k === 0 || f - arr[k - 1] >= 2);

  // camera: the board turns slowly in space for the whole scene (one flat perspective transform)
  const life = frame / Math.max(1, ctx.dur);
  const rotY = -9 + 15 * ease.camera(Math.min(1, life));
  const rotX = 7 - 3 * life;
  // a later board is already standing on the cut frame (entrance before the cut; sounds stay on base):
  // every tile has risen by then (a long board staggers its tiles closer, 4 frames from first to last)
  // and the label has typed on, so the cut never lands on a half-empty, near-black row
  const e = entrance(ctx);
  const label = p.label ? capsLatin(p.label) : '';
  const lbl = label ? typeOn(label, frame, e, Math.max(1.4, Array.from(label).length / Math.max(1, -e - 1))) : '';
  const stag = Math.min(1.5, 4 / Math.max(1, n - 1));
  // a soft sheen crosses the tiles every ~3 s, from the entrance on
  const sheenT = frame > base + 14 ? ((frame - base - 14) % 84) / 40 : 2;

  let x = 540 - boardW / 2;
  const cells = from.map((_, i) => {
    const cx = x;
    x += widths[i] + gap;
    return cx;
  });

  const floor = top + th + 12;
  const tiles = from.map((_, i) => {
    if (gapOnly[i]) return null;
    const q = paths[i];
    const last = q.length - 1;
    const ghost = (idx: number) => idx > 0 && idx < last; // a card between the first and the landed one
    const s = spr(frame, e + i * stag);
    const k = Math.max(0, Math.min(last, Math.floor((frame - starts[i]) / FLIP)));
    const moving = q.length > 1 && frame >= starts[i] && frame < lands[i];
    const u = moving ? ((frame - starts[i]) % FLIP) / FLIP : 0;
    const ci = moving ? k : frame >= lands[i] ? last : 0; // index of the card showing now
    const ni = moving ? k + 1 : ci; // and of the card coming in
    const changed = q.length > 1;
    const landed = changed && frame >= lands[i];
    const landS = landed ? spr(frame, lands[i], 'land') : 0;
    const glyphCol = landed ? toneText(tone) : C.ink;
    return (
      <div key={i} style={{position: 'absolute', left: cells[i], top, width: tw, height: th, opacity: s, transform: `translateY(${(1 - s) * 30}px) scale(${landed ? 1 + 0.025 * Math.sin(Math.min(1, landS) * Math.PI) : 1})`}}>
        <Tile w={tw} h={th} size={size} top={q[ni]} bottom={q[ci]} topGhost={ghost(ni)} bottomGhost={ghost(ci)} color={glyphCol} glow={landed && tone !== 'neutral' ? toneLine(tone) : undefined} />
        {moving && u < 0.5 ? (
          // the old top half falls forward onto the hinge
          <Half w={tw} h={th} size={size} ch={q[ci]} ghost={ghost(ci)} part="top" color={C.ink} angle={-90 * ease.exit(u * 2)} shade={u * 2} />
        ) : null}
        {moving && u >= 0.5 ? (
          // the new bottom half swings down into place
          <Half w={tw} h={th} size={size} ch={q[ni]} ghost={ghost(ni)} part="bottom" color={C.ink} angle={90 * (1 - ease.enter((u - 0.5) * 2))} shade={1 - (u - 0.5) * 2} />
        ) : null}
        <Hinge w={tw} h={th} />
        {landed ? <div style={{position: 'absolute', inset: -1, borderRadius: size * 0.08, border: `2px solid ${tone === 'neutral' ? C.ink2 : toneLine(tone)}`, opacity: 0.55 * Math.min(1, landS), boxShadow: tone === 'neutral' ? undefined : `0 0 ${18 + 10 * Math.sin(frame / 14)}px ${halo(toneLine(tone), 0.33)}`}} /> : null}
        {sheenT <= 1 ? (
          <div style={{position: 'absolute', inset: 0, borderRadius: size * 0.08, overflow: 'hidden', pointerEvents: 'none'}}>
            <div style={{position: 'absolute', top: -th, bottom: -th, width: tw * 0.5, left: -tw + (boardW + 2 * tw) * ease.camera(sheenT) - (cells[i] - cells[0]), background: `linear-gradient(90deg, transparent, ${rgba(C.ink, 0.07)}, transparent)`, transform: 'rotate(18deg)'}} />
          </div>
        ) : null}
      </div>
    );
  });

  return (
    <>
      {p.label ? (
        <div style={{position: 'absolute', top: top - 96, left: 0, right: 0, textAlign: 'center', fontFamily: F.mono, fontSize: 28, letterSpacing: '0.06em', color: C.ink2, whiteSpace: 'nowrap'}}>{lbl}</div>
      ) : null}
      <div style={{position: 'absolute', inset: 0}}>
        <div style={{position: 'absolute', inset: 0, transform: `perspective(1800px) rotateX(${rotX}deg) rotateY(${rotY}deg)`, transformOrigin: `540px ${cy}px`}}>
          {tiles}
          {/* the board stands on dark glass: a floor line and a faint mirrored copy under it */}
          <div style={{position: 'absolute', inset: 0, transform: 'scaleY(-1)', transformOrigin: `540px ${floor}px`, opacity: 0.16, WebkitMaskImage: `linear-gradient(180deg, transparent ${top + th * 0.35}px, #000 ${top + th}px)`, maskImage: `linear-gradient(180deg, transparent ${top + th * 0.35}px, #000 ${top + th}px)`}}>
            {tiles}
          </div>
          <div style={{position: 'absolute', left: 540 - boardW / 2 - 40, width: boardW + 80, top: floor, height: 2, background: `linear-gradient(90deg, transparent, ${C.rule}, transparent)`, opacity: 0.6 * prog(frame, e + 4, 12)}} />
        </div>
      </div>

      {/* the label types on with the cut: the meta bar's keys already sound there */}
      {flapFrames.map((f, i) => {
        const hits = paths.reduce((s, q, j) => s + (q.length > 1 && f >= starts[j] && f < lands[j] && (f - starts[j]) % FLIP === 0 ? 1 : 0), 0); // tiles falling together
        return <Sfx key={i} name="asmr-flap" at={f} volume={0.34 * vary(i, 0.35) * Math.min(1.45, 0.8 + 0.25 * hits) * (i === 0 ? 1.2 : 1)} /* event: a flap falls */ />;
      })}
      {/* event: a character clicks into place (a detent, like a drum stopping on its card); the last one is the number landing */}
      {[...new Set(lands.filter((_, i) => paths[i].length > 1 && lands[i] < landAll))]
        .sort((x, y) => x - y)
        .filter((f, k, arr) => k === 0 || f - arr[k - 1] >= 2)
        .map((f, k) => (
          <Sfx key={`d${k}`} name="asmr-detent" at={f} volume={0.36 * vary(k + 11, 0.2)} />
        ))}
      <Land at={landAll} volume={0.56} /* event: the last character lands */ />
    </>
  );
};

// the card's two halves: the top catches the light, the bottom sits in the board's shade (tokens: dark
// graphite on the black film, white on paper)
const surface = (part: 'top' | 'bottom') =>
  part === 'top' ? `linear-gradient(180deg, ${C.tileTop0} 0%, ${C.tileTop1} 100%)` : `linear-gradient(180deg, ${C.tileBot0} 0%, ${C.tileBot1} 100%)`;

// A card in passing is a smear: half bright, soft, stretched a little along the fall.
const Glyph: React.FC<{ch: string; w: number; h: number; size: number; color: string; offset: number; ghost?: boolean}> = ({ch, w, h, size, color, offset, ghost}) => (
  <div
    style={{
      position: 'absolute',
      left: 0,
      top: offset,
      width: w,
      height: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: F.sans,
      fontWeight: 600,
      fontSize: size,
      lineHeight: 1,
      color,
      fontFeatureSettings: '"tnum" 1, "lnum" 1',
      paddingBottom: size * 0.04,
      opacity: ghost ? 0.34 : 1,
      filter: ghost ? `blur(${(size * 0.028).toFixed(2)}px)` : undefined,
      transform: ghost ? 'scaleY(1.1)' : undefined,
      textShadow: ghost ? `0 ${Math.round(size * 0.05)}px ${Math.round(size * 0.03)}px ${color}, 0 ${-Math.round(size * 0.05)}px ${Math.round(size * 0.03)}px ${color}` : undefined,
    }}
  >
    {ch === ' ' ? '' : ch}
  </div>
);

const Half: React.FC<{w: number; h: number; size: number; ch: string; part: 'top' | 'bottom'; color: string; angle?: number; shade?: number; ghost?: boolean}> = ({
  w,
  h,
  size,
  ch,
  part,
  color,
  angle = 0,
  shade = 0,
  ghost,
}) => {
  const r = size * 0.08;
  const isTop = part === 'top';
  // a folding flap, drawn flat: its height is cos(angle) of the card's, hinged on the split
  const fold = angle ? Math.max(0.002, Math.cos((angle * Math.PI) / 180)) : 1;
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: isTop ? 0 : h / 2,
        width: w,
        height: h / 2,
        overflow: 'hidden',
        borderRadius: isTop ? `${r}px ${r}px 0 0` : `0 0 ${r}px ${r}px`,
        background: surface(part),
        border: `1.5px solid ${rgba(C.ink, 0.13)}`,
        borderBottom: isTop ? 'none' : `1.5px solid ${rgba(C.ink, 0.13)}`,
        borderTop: isTop ? `1.5px solid ${rgba(C.ink, 0.16)}` : 'none',
        boxSizing: 'border-box',
        transformOrigin: isTop ? '50% 100%' : '50% 0%',
        transform: fold < 1 ? `scaleY(${fold.toFixed(4)})` : undefined,
      }}
    >
      <Glyph ch={ch} w={w} h={h} size={size} color={color} offset={isTop ? 0 : -h / 2} ghost={ghost} />
      {/* the falling half turns from the light: on a dark card a deep shade; on a white card only a touch,
          or every flap strobes the whole board (and reads as a glitch to tools/flicker.py) */}
      {shade ? <div style={{position: 'absolute', inset: 0, background: C.shade, opacity: 0.55 * shade * (isLight() ? 0.2 : 1)}} /> : null}
    </div>
  );
};

const Tile: React.FC<{w: number; h: number; size: number; top: string; bottom: string; topGhost?: boolean; bottomGhost?: boolean; color: string; glow?: string}> = ({
  w,
  h,
  size,
  top,
  bottom,
  topGhost,
  bottomGhost,
  color,
  glow,
}) => (
  <div style={{position: 'absolute', inset: 0, filter: glow ? `drop-shadow(0 0 16px ${halo(glow, 0.25)})` : undefined}}>
    <Half w={w} h={h} size={size} ch={top} ghost={topGhost} part="top" color={color} />
    <Half w={w} h={h} size={size} ch={bottom} ghost={bottomGhost} part="bottom" color={color} />
  </div>
);

// the split and the two axle pins every real flap board shows
const Hinge: React.FC<{w: number; h: number}> = ({w, h}) => (
  <>
    <div style={{position: 'absolute', left: 0, right: 0, top: h / 2 - 1.5, height: 3, background: C.hinge}} />
    <div style={{position: 'absolute', left: 0, right: 0, top: h / 2 + 1.5, height: 1, background: rgba(C.ink, 0.06)}} />
    <div style={{position: 'absolute', left: 3, top: h / 2 - 5, width: 4, height: 10, borderRadius: 2, background: C.axle}} />
    <div style={{position: 'absolute', right: 3, top: h / 2 - 5, width: 4, height: 10, borderRadius: 2, background: C.axle}} />
  </>
);
