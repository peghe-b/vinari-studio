// Shared by QRCard and its stagings (staging/qr.tsx): the passer-by page's reasons and icons, and the card's
// QR-like module pattern (finder eyes, timing lines, seeded noise; not a real code).
import {rand} from '../../lib/anim';

export const QN = 25; // modules per side

// The real page a passer-by opens (web/c/index.html): heading, host, three reasons, same icons.
export const REASONS = ['მანქანა გზას მიკეტავს', 'შუქები ანთია', 'მანქანასთან რაღაც ხდება'];
export const ICONS = [
  ['M3 12h11', 'M10 8l4 4-4 4', 'M19 4v16'],
  ['M10 5.5a6.5 6.5 0 0 0 0 13z', 'M13.5 12h7M13.5 8.2l5.6-2.4M13.5 15.8l5.6 2.4'],
  ['M12 4.5 21 19.5H3z', 'M12 10v4', 'M12 17h.01'],
];

const finder = (r: number, c: number, r0: number, c0: number) => {
  const y = r - r0;
  const x = c - c0;
  if (y < 0 || y > 6 || x < 0 || x > 6) return null;
  return y === 0 || y === 6 || x === 0 || x === 6 || (y >= 2 && y <= 4 && x >= 2 && x <= 4);
};

/** A QR-like module pattern: finder eyes, timing lines, seeded noise. Not a real code. */
export const MODULES: [number, number][] = (() => {
  const out: [number, number][] = [];
  for (let r = 0; r < QN; r++)
    for (let c = 0; c < QN; c++) {
      const f = finder(r, c, 0, 0) ?? finder(r, c, 0, QN - 7) ?? finder(r, c, QN - 7, 0);
      const nearFinder = (r < 8 && c < 8) || (r < 8 && c >= QN - 8) || (r >= QN - 8 && c < 8);
      let on: boolean;
      if (f !== null) on = f;
      else if (nearFinder) on = false;
      else if (r === 6 || c === 6) on = (r + c) % 2 === 0;
      else if (r >= 16 && r <= 20 && c >= 16 && c <= 20) on = r === 16 || r === 20 || c === 16 || c === 20 || (r === 18 && c === 18);
      else on = rand(r * 31.7 + c * 17.3 + 5) > 0.53;
      if (on) out.push([r, c]);
    }
  return out;
})();

