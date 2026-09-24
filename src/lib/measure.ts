// Text width in px from the browser's own font metrics (the fonts are loaded before any frame
// renders: src/fonts.ts). Outside a browser it falls back to a rough per-character estimate.

let ctx2d: CanvasRenderingContext2D | null = null;

/** Width of `text` set in `font` (a CSS font shorthand, e.g. "600 112px FiraGO"), plus
 *  `letterSpacing` px after every character, the way CSS letter-spacing adds it. */
export const textWidth = (text: string, font: string, letterSpacing = 0): number => {
  const chars = Array.from(text).length;
  if (typeof document !== 'undefined') {
    ctx2d = ctx2d ?? document.createElement('canvas').getContext('2d');
    if (ctx2d) {
      ctx2d.font = font;
      return ctx2d.measureText(text).width + letterSpacing * chars;
    }
  }
  const px = Number(/(\d+(?:\.\d+)?)px/.exec(font)?.[1] ?? 16);
  return chars * px * 0.6 + letterSpacing * chars;
};
