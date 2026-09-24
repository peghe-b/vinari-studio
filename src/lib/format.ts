// Numbers the Georgian way: "3 610 ₾" with a no-break space (FiraGO has U+00A0).
// Grouping is done by hand: Chrome's ICU formats ka-GE as "3,610", Node's as "3 610".
const group = (int: string) => int.replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');

export type NumFormat = 'gel' | 'usd' | 'int' | 'plain';

export const fmt = (v: number, format: NumFormat = 'int', decimals = 0) => {
  const [i, d] = Math.abs(v).toFixed(decimals).split('.');
  const n = `${v < 0 ? '−' : ''}${group(i)}${d ? `,${d}` : ''}`;
  if (format === 'gel') return `${n} ₾`;
  if (format === 'usd') return `$${n.replace(/ /g, ',')}`;
  if (format === 'plain') return String(Math.round(v));
  return n;
};

/** Uppercase Latin only. JS toUpperCase() turns Georgian into Mtavruli code points that
 *  most fonts lack, so Georgian letters are left untouched. */
export const capsLatin = (s: string) => s.replace(/[a-zа-яё]/g, (c) => c.toUpperCase()); // Latin + Cyrillic

/** Georgian in Mtavruli, the film's one-line capitals (the owner, 2026-09-24: every letter the same
 *  height between two lines, "on one line it is prettier"). Mkhedruli U+10D0..U+10FA -> U+1C90..U+1CBA,
 *  U+10FD..U+10FF -> U+1CBD..U+1CBF; Latin, digits and signs are untouched. Specs stay in Mkhedruli
 *  (build-index forbids Mtavruli there): this runs at render time, at the text entry points (Subtitles,
 *  MetaBar, the scenes' text). Never CSS text-transform (Chrome does not uppercase Georgian), never
 *  toUpperCase(). The glyphs come from NotoGeo (src/fonts.ts): FiraGO has none. The designed cover's
 *  own headline stays Mkhedruli (src/Cover.tsx does not call this). */
export const mtav = (s: string) =>
  s.replace(/[ა-ჺჽ-ჿ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0xbc0));

/** mtav() for an optional prop. */
export const mtavOpt = (s: string | undefined) => (s === undefined ? undefined : mtav(s));
