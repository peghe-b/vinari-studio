// The paper kit's stage geometry: the box the humour scenes (ShoutType, JamGrid, SideCar, NewsCard: src/scenes/kit/shout.tsx,
// src/scenes/kit/paper.tsx) and their measured text (src/lib/textfit.mjs, src/lib/shout.mjs, src/lib/ink.mjs) keep inside.
// Ported on 2026-10-31 from phase 2's src/lib/p2.mjs (tag before-rollback-1030) WITHOUT its gate: no film changes look by
// its number here; only the scenes that import this use it. The values are the ones the humour kit was proven with.
//
//   node src/lib/stagebox.mjs --test    the self-test

/** The width text may take after the camera's zoom, in STAGE units (x 110..970 = frame x 67..1013 at STAGE.s 1.1). */
export const TEXT_W = 860;
/** The kit sets its text this far inside the stage box on each side (stage px), so a slow drift keeps it in frame. */
export const TEXT_INSET = 26;
/** The kit's stage box (stage units): everything whole inside it, the caption band under its foot (frame 1440..1560). */
export const STAGE = Object.freeze({left: 110, right: 970, top: 400, bottom: 1370, cx: 540, cy: 885});
/** TikTok's action column: FRAME x 930 and beyond from frame y 880 to 1110; in STAGE units x 894 and beyond from y 871 to
 *  1080. No word, number or hand mark stands there. */
export const TT_FRAME = Object.freeze({x: 930, top: 880, bottom: 1110});
export const TT = Object.freeze({right: 894, top: 871, bottom: 1080});
/** the widest a box from stage x `x` may be (align left) or centred on `cx` (align center) when its rows y0..y1 cross the
 *  action column's band; else `w` unchanged */
export const ttFitW = (w, {x = null, cx = null, y0, y1}) => {
  if (!(y1 > TT.top && y0 < TT.bottom)) return w;
  if (cx !== null) return Math.min(w, 2 * Math.max(0, TT.right - cx));
  if (x !== null) return Math.min(w, Math.max(0, TT.right - x));
  return w;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(STAGE.right - STAGE.left === TEXT_W && 340 + 1.1 * (STAGE.bottom - 380) <= 1440, 'the text box is the stage width, the stage ends over the subtitle band (frame 1440)');
  ok(Math.abs(540 + 1.1 * (TT.right - 540) - TT_FRAME.x) < 1 && Math.round(340 + 1.1 * (TT.top - 380)) === TT_FRAME.top, 'the action column in stage units is frame x 930 from y 880');
  ok(ttFitW(808, {cx: 540, y0: 800, y1: 1000}) === 708 && ttFitW(808, {cx: 540, y0: 400, y1: 700}) === 808 && ttFitW(808, {x: 136, y0: 900, y1: 960}) === 758, 'a line in the action column band is narrowed');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /stagebox\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
