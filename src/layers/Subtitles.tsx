import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {mtav} from '../lib/format';
import {C, F, L, rgba, SUB_TONE, SubTone, T} from '../tokens';

// bleep: the frame a bleep cuts the line off (tools/vo.py, a chunk with "bleep"): the kept part until then, then „#@%"
// words: the frame each whitespace token of the line shows from (the word-by-word build); absent = the whole line at once
// (the hook's line, which is up on frame 0)
export type SubChunk = {text: string; from: number; to: number; fadeIn: boolean; fadeOut: boolean; bleep?: number; words?: number[]}; // absolute frames

/** The line's words, as the render lays them out (whitespace tokens; tools/vo.py's "words" count the same ones). */
export const tokensOf = (text: string) => text.split(/\s+/).filter(Boolean);

// How long a word takes to say, in letter units (tools/vo.py word_weight, fitted on the cached edge-tts clips against their
// real word boundaries): a vowel 1.6, a digit or a sign said as a word (₾ $ € £ % + & №) 3, any other letter 0.8, a word 1
// more, the line's last word 2 more (it is drawn out). A token the voice does not say („—", „·") comes with the next word.
const VOWELS = new Set([...'აეიოუaeiouyаеёиоуыэюя']);
const WORD_EACH = 1;
const WORD_LAST = 2;
const LETTER = /[\p{L}\p{N}]/u;
const SAID = /[\p{L}\p{N}\u20be$\u20ac\u00a3%+&\u2116]/u;
export const wordWeight = (tok: string) =>
  [...tok.toLowerCase()].reduce((a, ch) => a + (!SAID.test(ch) ? 0 : !LETTER.test(ch) || /\p{N}/u.test(ch) ? 3 : VOWELS.has(ch) ? 1.6 : 0.8), 0) + WORD_EACH;

/** A chunk with no word times from the voice (a timeline from before 2026-10-22, a recording): each word's start by its
 *  letters over the chunk's speech, from its start to its end (or the bleep, where the kept words stop), in seconds. */
export const letterStarts = (toks: string[], a: number, z: number): number[] => {
  const said = toks.map((t, k) => (SAID.test(t) ? k : -1)).filter((k) => k >= 0);
  const out: (number | undefined)[] = toks.map(() => undefined);
  if (said.length) {
    const w = said.map((k) => wordWeight(toks[k]));
    w[w.length - 1] += WORD_LAST;
    const total = Math.max(1e-9, w.reduce((x, y) => x + y, 0) - WORD_EACH);
    let acc = 0;
    said.forEach((k, j) => {
      out[k] = a + ((Math.max(a, z) - a) * acc) / total;
      acc += w[j];
    });
  }
  let next: number | undefined;
  for (let k = toks.length - 1; k >= 0; k--) next = out[k] = out[k] ?? next;
  let prev = a;
  return out.map((x) => (prev = Math.max(prev, x ?? prev)));
};

// One centred line per voice phrase (pollar style), timed from the voice. It appears 2 frames before the first word and
// builds WORD BY WORD (the owner, 2026-10-22): the whole line is laid out once (its size measured, never wrapped), and each
// word pops in (WORD_POP) one frame before it is heard, so the words already up never move. A chunk followed closely by the
// next one is swapped in place (no fade either side, so nothing blinks; the next line starts with its first word); after a
// long pause its first word fades up alone. The hook's line is already up WHOLE on frame 0 when the voice starts within
// HOOK_LEAD seconds: frame 0 is the cover and the loop point, and with the sound off it must still say the hook.
const HOOK_LEAD = 1;
const WORD_LEAD = 1; // frames before the word is heard
export const buildSubs = (chunks: {text: string; start: number; end: number; bleep?: number; words?: number[]}[], fps: number): SubChunk[] =>
  chunks
    .filter((c) => c.text.trim().length > 0)
    .map((c, i, all) => {
      const hook = i === 0 && c.start <= HOOK_LEAD;
      const from = hook ? 0 : Math.max(0, Math.round(c.start * fps) - 2);
      const prev = all[i - 1];
      const next = all[i + 1];
      const nextFrom = next ? Math.max(0, Math.round(next.start * fps) - 2) : Infinity;
      const tight = next !== undefined && next.start - c.end < 0.5;
      const naturalEnd = Math.round((c.end + 0.35) * fps);
      const to = Math.min(nextFrom, Math.max(tight ? nextFrom : Math.min(naturalEnd, nextFrom), from + 12));
      const toks = tokensOf(c.text);
      const said = Array.isArray(c.words) && c.words.length === toks.length && c.words.every((x) => Number.isFinite(x)) ? c.words : null;
      const secs = said ?? letterStarts(toks, c.start, typeof c.bleep === 'number' ? c.bleep : c.end);
      // the first word with the line; every word at least a few frames on screen before the line goes
      const last = Math.max(from, to - 3);
      let at = from;
      const words = hook ? undefined : secs.map((t, k) => (at = k === 0 ? from : Math.min(last, Math.max(at, Math.round(t * fps) - WORD_LEAD))));
      return {
        text: c.text,
        from,
        to,
        fadeIn: !hook && (!prev || c.start - prev.end >= 0.5),
        fadeOut: !tight,
        ...(typeof c.bleep === 'number' ? {bleep: Math.round(c.bleep * fps)} : {}),
        ...(words ? {words} : {}),
      };
    });

/** A word's pop (the owner's demo, 2026-10-22): it fades up in about 70 ms and rises the last ~14 px (at the 58 px line)
 *  in about 100 ms, easing out; before its frame it is laid out but not drawn. */
export const WORD_POP = {fade: 0.07, rise: 14, riseS: 0.1} as const;
export const popOf = (frame: number, at: number, fps: number, fs: number) => {
  const k = frame - at;
  const rise = (WORD_POP.rise * fs) / T.subtitle;
  if (k < 0) return {opacity: 0, y: rise};
  const p = Math.min(1, (k + 1) / (WORD_POP.riseS * fps));
  return {opacity: Math.min(1, (k + 1) / (WORD_POP.fade * fps)), y: rise * (1 - p) ** 2};
};

// Always one line: the size is measured, never wrapped. Georgian is wider than Latin (Mtavruli ~9 %
// more than Mkhedruli), so a long chunk shrinks instead of spilling into the platform UI. The line
// sits low, in the free band over Instagram's username row (L.subtitleY 1500, frame pixels, outside the
// stage and the lens: a plain, clean line), left of the like / comment column. Its Georgian is set in
// Mtavruli (lib/format.ts mtav(): every letter between the same two lines). `silent`: no voice, so the
// line is the primary text: larger and a step heavier, same timing. `centreX`/`centreY`: no platform UI
// (the 16:9 frame). Its colour (the owner, 2026-10-07): still a clean line, no shadow, outline or box; `track` (tools/
// subtone.mjs measured the picture under the line along the film) gives the colour of the frame it is on, white (the dark
// film's ink) or ink (the light film's), so a line over a cut changes with the picture; no track keeps the theme's C.ink.
let measure: CanvasRenderingContext2D | null = null;
const sizeFor = (text: string, base: number, weight: number, maxW: number) => {
  if (typeof document === 'undefined') return base;
  measure = measure ?? document.createElement('canvas').getContext('2d');
  if (!measure) return base;
  measure.font = `${weight} ${base}px ${F.sans}`;
  const w = measure.measureText(text).width;
  return w <= maxW ? base : Math.max(40, Math.floor((base * maxW) / w));
};

// One size for the whole film: a line that shrank on its own made the size jump from line to line (the
// owner reads one steady line). The film's size is the one at which about 80 % of its lines fit, never
// under FLOOR px of the full size; only a rare longer line shrinks further, on its own.
const FILM_SHARE = 0.8;
const FLOOR = 50 / 58;
const filmSize = (texts: string[], base: number, weight: number, maxW: number) => {
  const fits = texts.map((t) => sizeFor(t, base, weight, maxW)).sort((a, b) => b - a);
  if (!fits.length) return base;
  const at = fits[Math.min(fits.length - 1, Math.floor(FILM_SHARE * (fits.length - 1)))];
  return Math.max(Math.round(base * FLOOR), Math.min(base, at));
};

// The probe (tools/subtone.mjs, input prop "subProbe"): the line is not drawn, so the picture under it can be measured,
// and a solid bar as wide as the line would be (PROBE_BAR px tall, PROBE_COLOR) sits on the frame's top edge instead, so
// the probe reads the line's own extent from the same still. The meta bar sits far lower (frame y 268).
export const PROBE_BAR = 8;
export const PROBE_COLOR = '#FF00FF';
/** The plate (sizes in units of the line's font size): a calm rounded field of the line's opposite colour, a little wider
 *  than its words, its edge feathered by a soft glow of itself, never an outline or a hard box. White words sit on near-black
 *  at 0.66 (the picture still shows through), ink words on paper white at 0.88. */
export const PLATE = {
  padX: 0.5,
  padY: 0.12,
  radius: 0.34,
  soft: 0.36,
  spread: 0.08,
  onInk: {color: '#F5F5F5', alpha: 0.88},
  onWhite: {color: '#0B0B0B', alpha: 0.66},
} as const;
const widthOf = (text: string, size: number, weight: number) => {
  if (typeof document === 'undefined') return L.subtitleMaxW;
  measure = measure ?? document.createElement('canvas').getContext('2d');
  if (!measure) return L.subtitleMaxW;
  measure.font = `${weight} ${size}px ${F.sans}`;
  return Math.min(L.subtitleMaxW, measure.measureText(text).width);
};

/** The plate's track (tools/subtone.mjs, a film from GUARD_FROM on): [frame, 0 | 1] from frame 0, each holding until the next. A
 *  line sits on its plate for its whole time when the track asks for one anywhere in it (no plate popping in mid-line); no
 *  track (not measured) = `unmeasured`: no plate (the owner, 2026-10-19: boxes only as the last resort, never by default;
 *  input prop "subPlate": true forces one for a before-and-after still). */
export const plateDuring = (track: readonly (readonly [number, number])[] | undefined, from: number, to: number, unmeasured = false) => {
  if (!track || !track.length) return unmeasured;
  for (let i = 0; i < track.length; i++) {
    const a = track[i][0];
    const z = i + 1 < track.length ? track[i + 1][0] : Infinity;
    if (track[i][1] && a < to && z > from) return true;
  }
  return false;
};

/** White-ish words (the dark film's ink, or SUB_TONE.white): their plate is the dark one. */
const lightInk = (hex: string) => {
  const n = parseInt(hex.replace('#', '').slice(0, 6), 16);
  return Number.isFinite(n) && 0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255) > 128;
};

/** The track's colour on `frame`: [frame, tone] pairs from frame 0, each holding until the next. */
export const toneAt = (track: readonly (readonly [number, SubTone])[] | undefined, frame: number): SubTone | undefined => {
  let tone: SubTone | undefined;
  for (const [f, t] of track ?? []) {
    if (f > frame) break;
    tone = t;
  }
  return tone;
};

/** The bleeped line (the owner, 2026-10-15): the kept part alone until the bleep, then the „#@%" (the subtitle's own colour: it
 *  never takes an accent) pops in and shakes with
 *  it, each glyph its own small kick (the QR promo's censor line); the rest stays still. */
const CENSOR = '#@%';
const Censored: React.FC<{text: string; k: number}> = ({text, k}) => {
  const i = text.indexOf(CENSOR);
  if (i < 0) return <>{text}</>;
  if (k < 0) return <>{text.slice(0, i)}</>;
  const pop = Math.min(1, k / 5);
  const back = 1 + 0.55 * (1 - pop) ** 2 - 0.12 * Math.sin(Math.PI * pop);
  return (
    <>
      {text.slice(0, i)}
      {[...CENSOR].map((g, j) => {
        const kk = k - j;
        const amp = kk >= 0 && kk < 12 ? 5 * (1 - kk / 12) : 0;
        const dx = amp * Math.sin(kk * 2.3 + j * 1.7);
        const dy = amp * 0.7 * Math.cos(kk * 2.9 + j);
        const rot = amp * 1.6 * Math.sin(kk * 1.9 + j * 2.1);
        return (
          <span key={j} style={{display: 'inline-block', transform: `translate(${dx.toFixed(2)}px, ${dy.toFixed(2)}px) rotate(${rot.toFixed(2)}deg) scale(${back.toFixed(3)})`}}>
            {g}
          </span>
        );
      })}
      {text.slice(i + CENSOR.length)}
    </>
  );
};

/** The built line (the owner, 2026-10-22): every word in its place from the start, drawn from its own frame on with its pop;
 *  the bleeped word's kept part pops with the word and its „#@%" (and the rest after it) with the bleep, as Censored does. */
const Built: React.FC<{text: string; words: number[]; frame: number; fps: number; fs: number; bleep?: number}> = ({text, words, frame, fps, fs, bleep}) => {
  const toks = tokensOf(text);
  return (
    <>
      {toks.map((tok, k) => {
        const at = words[k] ?? words[words.length - 1] ?? 0;
        const {opacity, y} = popOf(frame, at, fps, fs);
        const style: React.CSSProperties = {display: 'inline-block', opacity, transform: y ? `translateY(${y.toFixed(2)}px)` : undefined};
        const cut = bleep !== undefined ? tok.indexOf(CENSOR) : -1;
        // the „#@%" is laid out from the start too (hidden until the bleep), so the line never shifts when it pops
        const kick = Math.max(at, bleep ?? at);
        return (
          <React.Fragment key={k}>
            {k ? ' ' : null}
            {cut < 0 ? (
              <span style={style}>{tok}</span>
            ) : (
              <span style={style}>
                {tok.slice(0, cut)}
                <span style={{opacity: frame >= kick ? 1 : 0}}>
                  <Censored text={tok.slice(cut)} k={Math.max(0, frame - kick)} />
                </span>
              </span>
            )}
          </React.Fragment>
        );
      })}
    </>
  );
};

export const Subtitles: React.FC<{
  subs: SubChunk[];
  silent?: boolean;
  centreX?: number;
  centreY?: number;
  track?: readonly (readonly [number, SubTone])[];
  probe?: boolean;
  /** the frame guards (src/lib/guard.mjs, a film from GUARD_FROM on): the line sits on a soft plate where the picture under
   *  its words would swallow it in BOTH colours (`plate`, measured by tools/subtone.mjs; unmeasured: never) */
  guard?: boolean;
  plate?: readonly (readonly [number, number])[];
  /** without a measured plate track: no plate (true only for a forced before-and-after still) */
  plateUnmeasured?: boolean;
}> = ({subs, silent = false, centreX = L.subtitleX, centreY = L.subtitleY, track, probe = false, guard = false, plate, plateUnmeasured = false}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const cur = subs.find((s) => frame >= s.from && frame < s.to);
  if (!cur) return null;
  // the word-by-word build (not the hook's line, which is up whole; not the silent film, where the line is the primary
  // text and there is no voice to follow): each word pops in itself, so the line does not fade or rise in as a whole
  const built = !silent && cur.words !== undefined;
  const tIn = cur.fadeIn ? interpolate(frame, [cur.from, cur.from + 3], [0, 1], {extrapolateRight: 'clamp'}) : 1;
  const tOut = cur.fadeOut ? interpolate(frame, [cur.to - 4, cur.to], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}) : 1;
  const weight = silent ? 600 : 500;
  const maxW = L.subtitleMaxW;
  const text = mtav(cur.text);
  const base = filmSize(
    subs.map((x) => mtav(x.text)),
    silent ? T.subtitleSilent : T.subtitle,
    weight,
    maxW,
  );
  const fs = sizeFor(text, base, weight, maxW);
  if (probe) {
    const w = widthOf(text, fs, weight);
    return (
      <AbsoluteFill style={{pointerEvents: 'none'}}>
        <div style={{position: 'absolute', left: centreX - w / 2, width: w, top: 0, height: PROBE_BAR, backgroundColor: PROBE_COLOR}} />
      </AbsoluteFill>
    );
  }
  const tone = toneAt(track, frame);
  const ink = tone ? SUB_TONE[tone] : C.ink;
  // the plate (the owner, 2026-10-19: "the subtitle must always read"): the line's opposite, soft-edged, just around its words
  const plated = guard && plateDuring(plate, cur.from, cur.to, plateUnmeasured);
  const pc = lightInk(ink) ? PLATE.onWhite : PLATE.onInk;
  const pw = widthOf(text, fs, weight) + 2 * PLATE.padX * fs;
  const ph = fs * (1.2 + 2 * PLATE.padY);
  return (
    <AbsoluteFill style={{pointerEvents: 'none'}}>
      {plated ? (
        <div
          style={{
            position: 'absolute',
            left: centreX - pw / 2,
            width: pw,
            top: centreY - ph / 2,
            height: ph,
            borderRadius: PLATE.radius * fs,
            backgroundColor: rgba(pc.color, pc.alpha),
            boxShadow: `0 0 ${(PLATE.soft * fs).toFixed(1)}px ${(PLATE.spread * fs).toFixed(1)}px ${rgba(pc.color, pc.alpha * 0.55)}`,
            opacity: Math.min(tIn, tOut),
            transform: `translateY(${(1 - tIn) * 10}px)`,
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          left: centreX - maxW / 2,
          width: maxW,
          top: centreY - fs * 0.6,
          textAlign: 'center',
          whiteSpace: 'nowrap',
          fontFamily: F.sans,
          fontWeight: weight,
          fontSize: fs,
          lineHeight: 1.2,
          color: ink,
          opacity: built ? tOut : Math.min(tIn, tOut),
          transform: built ? undefined : `translateY(${(1 - tIn) * 10}px)`,
          fontFeatureSettings: '"tnum" 1',
        }}
      >
        {built ? (
          <Built text={text} words={cur.words!} frame={frame} fps={fps} fs={fs} bleep={cur.bleep} />
        ) : cur.bleep !== undefined ? (
          <Censored text={text} k={frame - cur.bleep} />
        ) : (
          text
        )}
      </div>
    </AbsoluteFill>
  );
};
