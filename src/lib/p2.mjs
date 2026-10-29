// The studio's phase 2 (the owner, 2026-10-26: "make the studio AMAZINGLY stronger, chew it through"; NO 3D, far more refined
// 2D graphics made for each film's idea, strong hooks, the free week + both stores at the end). One gate for all of it, read by
// the render (src/tokens.ts, src/Promo.tsx, the P2 kit), the lints (tools/ci/filmlint.mjs, tools/ci/p2lint.mjs, ending.mjs,
// stories.mjs, humor.mjs) and the brief (tools/ci/prompt.mjs). From film P2_FROM on:
//   - black and white: paper #F3F3F3, white cards, ink; colour carries data only (red a cost or a strike, green a gain or a
//     tick, ONE named data accent `spec.accent` on the hero number); no accent pair, no world tint; photos in greyscale;
//   - text measured before it is set (src/lib/textfit.mjs, src/lib/fit.ts): nothing wider than 860 px after the camera;
//   - the annotation layer (Ink, Callout), the app as ScreenFocus / TapTrail / ScreenDeck, the data and type kit, the hooks;
//   - the white EndStores card (free week + App Store + Google Play), never black;
//   - the retired clip-art parts are refused (src/lib/retired.mjs), and the P2 guards fail the film in the cloud.
// Every earlier film, its redos and its translations render and check exactly as they were made.
//
//   p2On(film)              true when film `film` (its id, or its number) is made with phase 2
//   node src/lib/p2.mjs --test    the self-test
//   node tools/ci/p2-next.mjs     the next film number in specs/ (what P2_FROM is set to at merge time)
import {filmKey} from '../scenes/illo/wardrobe.mjs';

/** The first phase-2 film. On the work branch studio-p2 it is the next number after the newest film on main and
 *  studio-power (v134; studio-power's phase-1 test film v135-bertha-road came in through a merge and was reverted here as
 *  it was on studio-power, the r3 verify, 2026-10-27), so the branch's own test films (req r-pwr...) are phase-2 films.
 *  AT MERGE it is set to the first film number made after the merge (`node tools/ci/p2-next.mjs --set` on main), so a
 *  film main made meanwhile renders as made. */
export const P2_FROM = 135;
/** Phase 2 ENDS here (the owner, 2026-10-29, on the round-3 test films: „ნაგავია... ტექსტებით სავსე, ისტორიას ვერ ყვება“):
 *  from film P2_UNTIL on the studio is the classic one again (colour, people, the scenes of v1-v134 that went viral), with
 *  the fresh app captures and the promo brief on top. Films 135-137 (and the replay fixtures) stay phase 2 as made. The next
 *  film number never goes under P2_UNTIL (tools/ci/prompt.mjs nextFloor). */
export const P2_UNTIL = 138;

export const p2On = (film) => {
  const n = typeof film === 'number' ? film : filmKey(film);
  // the self-tests' phase-2 fixtures (v900..v999, demo-p2-*) stay phase 2
  return Number.isFinite(n) && ((n >= P2_FROM && n < P2_UNTIL) || (n >= 900 && n < 1000));
};

/** The width text may take after the camera's zoom, in STAGE units (x 110..970 = frame x 67..1013 at STAGE.s 1.1), and the
 *  frame's text limits in FRAME px (TEXT_EDGE). */
export const P2_TEXT_W = 860;
export const P2_TEXT_X = Object.freeze([65, 1015]);
/** The kit sets its text this far inside the stage box on each side (stage px): every camera source that scales a shot
 *  (the kit's drift, the rig's free camera, the guards' breath) keeps it inside P2_TEXT_X. The kit's text width is
 *  P2_TEXT_W - 2 * P2_TEXT_INSET (808), which the lints measure against too. */
export const P2_TEXT_INSET = 26;
export const P2_KIT_TEXT_W = P2_TEXT_W - 2 * P2_TEXT_INSET;
/** The P2 kit's stage box (stage units): the guards' WHOLE_STAGE (src/lib/guard.mjs). The plan asked for graphics down to
 *  stage 1460, but that is frame 1528, inside the caption line; the subtitle band guard (frame 1440..1560) stays, so the kit
 *  fills the whole box above it instead (data graphics 80-90 % of its width, the hero phone its whole height), and photos
 *  bleed to the frame's edge under a caption scrim. Its top is 30 px under the guards' (frame 373): a 150 px Mtavruli line's
 *  caps stay clear of the label line (META_CLEAR; the first fixtures touched it). */
export const P2_STAGE = Object.freeze({left: 110, right: 970, top: 400, bottom: 1370, cx: 540, cy: 885});
/** TikTok's action column (src/tokens.ts SAFE_TT, provisional; the p2x round-2 story film: the 'E' of ROUGE and the last '9'
 *  of 1899 stood under the like and share buttons). FRAME x 930 and beyond from frame y 880 to 1110 (the Reels column takes
 *  over below); in STAGE units (frame = 540 + 1.1 (x - 540), 340 + 1.1 (y - 380)) x 894 and beyond from y 871 to 1080. No
 *  word, number or hand mark stands there: P2_TT_W is the widest centred line in that band (708 stage px). */
export const P2_TT_FRAME = Object.freeze({x: 930, top: 880, bottom: 1110});
export const P2_TT = Object.freeze({right: 894, top: 871, bottom: 1080});
export const P2_TT_W = 2 * (P2_TT.right - 540);
/** the widest a box from stage x `x` may be (align left) or centred on `cx` (align center) when its rows y0..y1 cross the
 *  action column's band; else `w` unchanged */
export const ttFitW = (w, {x = null, cx = null, y0, y1}) => {
  if (!(y1 > P2_TT.top && y0 < P2_TT.bottom)) return w;
  if (cx !== null) return Math.min(w, 2 * Math.max(0, P2_TT.right - cx));
  if (x !== null) return Math.min(w, Math.max(0, P2_TT.right - x));
  return w;
};
/** The P2 caption size (px): the same slot and the same clean line (no stroke, no shadow, no box). */
export const P2_CAPTION_PX = 68;
/** The P2 colours: data only. */
export const P2_INK = Object.freeze({paper: '#F3F3F3', card: '#FFFFFF', ink: '#0B0B0B', ink2: '#6A6A6A', red: '#E01B1B', green: '#0F9B37'});
/** The one extra data accent a film may name (`spec.accent`), only on the hero number or the highlighted row. */
export const P2_ACCENTS = Object.freeze({blue: '#1F47B6', amber: '#B57A12', violet: '#5B3FD0', teal: '#0F8BA6'});

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(!p2On('v134-winter-battery') && !p2On(134), 'v134 renders as made');
  ok(p2On(`v${P2_FROM}-anything`) && p2On(P2_FROM) && p2On(`v${P2_FROM + 2}-x-en`) && !p2On(P2_UNTIL) && !p2On(`v${P2_UNTIL + 3}-x`), 'phase 2 from P2_FROM to P2_UNTIL, the classic studio after it (the owner, 2026-10-29)');
  ok(!p2On('v120-tyres-r1'), 'a redo keeps its original number');
  ok(!p2On('demo-gallery'), 'a demo without a number is not a new film');
  ok(p2On('v900-p2-fixture'), 'the p2 fixtures (v900..) are phase-2 films');
  ok(P2_STAGE.right - P2_STAGE.left === P2_TEXT_W && 340 + 1.1 * (P2_STAGE.bottom - 380) <= 1440, 'the text box is the stage width, the stage ends over the subtitle band (frame 1440)');
  ok(P2_TT_W === 708 && Math.abs(540 + 1.1 * (P2_TT.right - 540) - P2_TT_FRAME.x) < 1 && Math.round(340 + 1.1 * (P2_TT.top - 380)) === P2_TT_FRAME.top, 'the action column in stage units is frame x 930 from y 880');
  ok(ttFitW(808, {cx: 540, y0: 800, y1: 1000}) === 708 && ttFitW(808, {cx: 540, y0: 400, y1: 700}) === 808 && ttFitW(808, {x: 136, y0: 900, y1: 960}) === 758, 'a line in the action column band is narrowed');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (typeof process !== 'undefined' && /p2\.mjs$/.test(process.argv?.[1] ?? '') && process.argv[2] === '--test') process.exit(selfTest());
