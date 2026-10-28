// Text measured before it is set (phase 2, src/lib/p2.mjs; the films audit: „ᲒᲐᲛᲐᲠᲯᲕᲔᲑᲣᲚᲘ" ran off the frame, the v131 Twist
// slammed past both edges). One table (src/data/textw.mjs, built from the real font files by tools/textfit-build.py) and one
// set of functions, shared by the render (src/lib/fit.ts) and the lints (tools/ci/textfit.mjs, filmlint, p2lint, the cover),
// so a line measures the same in Node and in the film, every time, with no browser.
//
//   textW(text, px, {weight, mtav, tracking})        the line's width in px (kerning covered by a 2 % margin)
//   fitLines(text, maxW, maxLines, size0, opts)      {lines, size, fits}: the biggest size <= size0 at which the words
//                                                   break into at most maxLines lines no wider than maxW
//   maxWFor(camAmount)                              the width limit (860 px) divided by the shot's camera zoom
import TABLE from '../data/textw.mjs';
import {P2_TEXT_W} from './p2.mjs';

const MARGIN = 1.02;
const FALLBACK = 0.62; // a character the table lacks (an emoji, a rare sign): wide, so a line errs towards fitting

/** Mkhedruli -> Mtavruli, as src/lib/format.ts mtav() does at render. */
export const toMtav = (s) => String(s).replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xbc0));

const row = (weight) => {
  const w = Number(weight) || 400;
  const k = w >= 650 ? '700' : w >= 550 ? '600' : w >= 450 ? '500' : '400';
  return TABLE.w[k];
};

export const textW = (text, px, {weight = 700, mtav = false, tracking = 0} = {}) => {
  const s = mtav ? toMtav(text) : String(text);
  const r = row(weight);
  let em = 0;
  let n = 0;
  for (const ch of s) {
    em += r[ch] ?? FALLBACK;
    n++;
  }
  return em * px * MARGIN + tracking * px * Math.max(0, n - 1);
};

/** Break `words` greedily into lines no wider than maxW at `px` (a single word wider than maxW stays alone on its line). */
const breakAt = (words, px, maxW, opts) => {
  const lines = [];
  let cur = '';
  for (const w of words) {
    const t = cur ? `${cur} ${w}` : w;
    if (!cur || textW(t, px, opts) <= maxW) cur = t;
    else {
      lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

export const fitLines = (text, maxW, maxLines = 2, size0 = 200, opts = {}) => {
  const words = String(text ?? '').trim().split(/\s+/).filter(Boolean);
  if (!words.length) return {lines: [], size: size0, fits: true};
  const min = opts.min ?? 40;
  for (let px = Math.round(size0); px >= min; px -= px > 120 ? 4 : 2) {
    const lines = breakAt(words, px, maxW, opts);
    if (lines.length <= maxLines && lines.every((l) => textW(l, px, opts) <= maxW)) return {lines, size: px, fits: true};
  }
  const lines = breakAt(words, min, maxW, opts);
  return {lines, size: min, fits: lines.length <= maxLines && lines.every((l) => textW(l, min, opts) <= maxW)};
};

/** The text width limit of a shot whose camera pushes in by `amount` (0.06 = 6 %). */
export const maxWFor = (camAmount = 0) => Math.floor(P2_TEXT_W / (1 + Math.max(0, Number(camAmount) || 0)));

/** The biggest size at which ONE line (a slam word, a reveal) fits maxW, capped at `cap`. */
export const sizeFor = (text, maxW, cap = 360, opts = {}) => {
  const w1 = textW(text, 1, opts);
  return w1 > 0 ? Math.min(cap, Math.floor(maxW / w1)) : cap;
};
