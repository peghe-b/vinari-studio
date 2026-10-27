// Rolling digits that only ever show VALID values (phase 2; the p3 prove run, 2026-10-27). The kit's RollDigits spun every
// cell through 10 or 20 digits on its own, so a clock going to 05:00 read „00:00" and „05:97" on the way and the „1-2%" card
// flipped „0-0%", „0-7%", „7-7%": numbers that never existed. Now a cell shows only a glyph the number really has:
//   from -> text   (same length): every cell that changes flips AT ONCE (an odometer's carry: 04:59 -> 05:00 reads 04:59, then
//                  05:00, never 05:59 or 04:00), the old glyph leaving upwards, the new one rising into its clip;
//   a whole number ("83", "2026", "₾40", "83%"): it COUNTS (0, 1, ... 83; a year from 100 under it), each frame a real value;
//   anything else ("1-2%", "05:00", "3.5", "1/2"): no count can be true, so each glyph RISES into its clip, left to right.
// One glyph a cell at every frame, inside its clip. Used by src/scenes/kit/p2.tsx RollDigits (a Film's clock passes `from`).
//
//   rollCells({text, from, u, settled})   -> [{ch, dy, op}] a cell each: the glyph, its offset in cell heights, its opacity
//   node src/lib/roll.mjs --test

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const FIGURE_SPACE = ' '; // a digit's width (tabular figures): a count keeps its width as it grows
export const WHOLE = /^(\D*?)(\d+)(\D*)$/;

/** the number's mode: 'flip' (from -> text), 'count' (a whole number) or 'rise' (several numbers, a time, a decimal) */
export const rollMode = (text, from) => {
  const t = String(text ?? '');
  if (typeof from === 'string' && from.length === t.length && from !== t) return 'flip';
  return WHOLE.test(t) ? 'count' : 'rise';
};

/** u: 0..1 through the roll (eased by the caller); i0 the stagger of cell i in u (rise only) */
export const rollCells = ({text, from, u, settled = false, stagger = 0.08}) => {
  const t = String(text ?? '');
  const cells = [...t];
  if (settled || u >= 1) return cells.map((ch) => ({ch, dy: 0, op: 1}));
  const mode = rollMode(t, from);
  if (mode === 'flip') {
    const f = [...from];
    // every changed cell flips together: the first half the old glyph leaves, the second the new one lands
    return cells.map((ch, i) => {
      if (f[i] === ch) return {ch, dy: 0, op: 1};
      if (u < 0.5) return {ch: f[i], dy: -0.55 * (u / 0.5), op: 1 - 0.7 * (u / 0.5)};
      const k = (u - 0.5) / 0.5;
      return {ch, dy: 0.55 * (1 - k), op: 0.3 + 0.7 * k};
    });
  }
  if (mode === 'count') {
    const [, pre, digits, post] = WHOLE.exec(t);
    const n = Number(digits);
    const n0 = n >= 1000 ? Math.max(0, n - 100) : 0;
    const v = Math.round(n0 + (n - n0) * clamp01(u));
    const s = String(v).padStart(digits.length, FIGURE_SPACE);
    return [...pre, ...s, ...post].map((ch) => ({ch, dy: 0, op: 1}));
  }
  // rise: each glyph comes up into its own clip, left to right; before its turn the cell is empty (never a wrong glyph)
  const n = cells.length;
  const span = Math.max(0.2, 1 - stagger * (n - 1));
  return cells.map((ch, i) => {
    const k = clamp01((u - stagger * i) / span);
    return k <= 0 ? {ch: FIGURE_SPACE, dy: 0, op: 0} : {ch, dy: 0.6 * (1 - k), op: k};
  });
};

/** the string a frame shows (the self-test, and anyone checking a roll's values) */
export const shownAt = (o) =>
  rollCells(o)
    .map((c) => (c.op > 0.01 ? c.ch : FIGURE_SPACE))
    .join('');

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const us = Array.from({length: 41}, (_, i) => i / 40);
  // the clock 04:59 -> 05:00: only the two real times
  const clock = new Set(us.map((u) => shownAt({text: '05:00', from: '04:59', u})));
  ok([...clock].every((s) => s === '04:59' || s === '05:00'), `04:59 -> 05:00 shows only ${[...clock].join(', ')}`);
  // 1-2%: never a digit it does not have
  const range = us.map((u) => shownAt({text: '1-2%', u}));
  ok(range.every((s) => [...s].every((c, i) => c === FIGURE_SPACE || c === '1-2%'[i])), `„1-2%" rises glyph by glyph (${[...new Set(range)].slice(0, 4).join(' | ')} ...)`);
  // 05:00 without a from: no 00:00, no 05:97
  ok(us.every((u) => !/00:00|05:9|0[0-4]:[1-9]/.test(shownAt({text: '05:00', u}))), 'a clock without its from never reads 00:00 or 05:97');
  // a whole number counts through real values only
  const c83 = us.map((u) => shownAt({text: '83', u}).replace(new RegExp(FIGURE_SPACE, 'g'), ''));
  ok(c83.every((s) => /^\d+$/.test(s) && Number(s) <= 83) && c83[c83.length - 1] === '83', `83 counts 0..83 (${c83.filter((_, i) => i % 10 === 0).join(', ')})`);
  ok(shownAt({text: '1967', u: 0}).trim() === '1867' && shownAt({text: '1967', u: 1}) === '1967', 'a year counts its last hundred');
  ok(shownAt({text: '83%', u: 0.5}).endsWith('%') && rollMode('₾40') === 'count', 'a unit stays put while the number counts');
  ok(rollMode('1-2%') === 'rise' && rollMode('05:00') === 'rise' && rollMode('3.5') === 'rise' && rollMode('05:00', '04:59') === 'flip', 'the modes');
  ok(rollCells({text: '05:00', from: '04:59', u: 0.3}).every((c) => c.dy <= 0), 'a flip: the old glyph leaves upwards first');
  ok(shownAt({text: '1-2%', u: 0.4, settled: true}) === '1-2%', 'settled: the number from frame 0');
  console.log(bad ? `roll: ${bad} failed` : 'roll: all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /roll\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
