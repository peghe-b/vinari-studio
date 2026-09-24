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
