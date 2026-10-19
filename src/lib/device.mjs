// The phone mockup's look, shared by the render (src/scenes/Phone.tsx, src/Promo.tsx) and the tools (tools/ci/fx.mjs,
// tools/ci/visual.mjs, tools/build-index.mjs).
//
// The owner (2026-10-12): "the videos' 3D motion graphics, I hope you did not delete them; and the mockups: those will be in
// 3D too, refined." From film number PHONE3D_FROM on, a Phone scene is a real 3D iPhone (src/scenes/three/phone3d.tsx: a
// titanium frame, thin black bezels, the Dynamic Island, the real capture as the lit display, soft studio light, a slow
// camera); every earlier film, a redo of one and its translations keep the line-art device they were made with. The
// spec's `"mode": "3d"` / `"flat"` forces one look; the "loupe" staging is always the flat device with its loupe. From film
// PHONE_MIX_FROM on the two take turns: an even number is 3D, an odd one the classic moving line-art device.
//
//   phoneMode(sc, film)   "3d" | "flat" for a Phone scene of the film `film` (its id, or its number from filmKey); null
//                         for any other scene
//   isWebgl3dPhone(sc, film)   true when that Phone draws in WebGL (one canvas, like Wire3D: the planner keeps transitions
//                         from mounting it early, the drift leaves it alone)
//   phoneProblems(sc)     the spec mistakes, one line each ([] when fine)
//   SCENES_UP_FROM / upSceneProblems(sc, film) / isWebglScene(sc, film)   PhoneDesk and CarNight: gated to new films, WebGL
//
//   node src/lib/device.mjs --test   the self-test
import {filmKey} from '../scenes/illo/wardrobe.mjs';

export const PHONE3D_FROM = 94; // v93-hood-cat was the last film made before the ask: it renders as made
/** From this film on the two looks take turns (the owner, 2026-10-12: "keep the old moving mockups too, every time, and the
 *  3D one now and then: sometimes this, sometimes that, it depends on the video; mix them"): an even film number draws the
 *  3D iPhone, an odd one the classic line-art device, and the spec's "mode" picks one when the film's story asks for it. */
export const PHONE_MIX_FROM = 96;
/** From this film on a phone is always drawn WHOLE (the owner, 2026-10-12: "don't cut the mockups any more, never; I don't
 *  like them cut, they don't read well"): the flat device shows its whole screen and its rounded foot, the 3D iPhone its
 *  whole body, and neither pushes in past that (a highlight band and a tap still point at the row). `"whole": false` on a
 *  Phone scene brings the old window back for that one scene. */
export const PHONE_WHOLE_FROM = 96;

/** Whether a Phone scene of the film `film` is drawn whole (PHONE_WHOLE_FROM). */
export const phoneWhole = (sc, film) => {
  if (sc?.whole === true) return true;
  if (sc?.whole === false) return false;
  const n = filmNo(film);
  return Number.isFinite(n) && n >= PHONE_WHOLE_FROM && n < 100000;
};
export const PHONE_MODES = ['3d', 'flat'];
/** The stagings the 3D phone draws ("hero" is its own: a product reveal from the side; the flat device reads it as
 *  "tilt"). "loupe" stays the flat device beside its loupe. */
export const PHONE3D_STAGINGS = ['device', 'tilt', 'hero'];

const filmNo = (film) => (typeof film === 'number' ? film : filmKey(film));

export const phoneMode = (sc, film) => {
  if (sc?.type !== 'Phone') return null;
  if (sc.staging === 'loupe') return 'flat';
  if (sc.mode === '3d' || sc.mode === 'flat') return sc.mode;
  const n = filmNo(film);
  if (!Number.isFinite(n) || n < PHONE3D_FROM || n >= 100000) return 'flat';
  return n < PHONE_MIX_FROM || n % 2 === 0 ? '3d' : 'flat';
};

export const isWebgl3dPhone = (sc, film) => phoneMode(sc, film) === '3d';

/** The promo-grade library scenes (the owner, 2026-10-15: "the promos look great; give the studio more power so it creates
 *  graphics like the promos"): PhoneDesk (the 3D iPhone on a surface, its lock screen and banners) and CarNight (the solid
 *  3D car on a night street). Only films from SCENES_UP_FROM on use them: v106-supra-toast was the last film made before,
 *  so every older film, its redo and its translations render as made. */
export const SCENES_UP_FROM = 107;
export const UP_SCENES = ['PhoneDesk', 'CarNight'];
/** A scene drawn in WebGL (one canvas: never pre-rolled under a transition, never frozen under the card, never CSS-scaled
 *  by the camera rig): Wire3D, PhoneDesk, CarNight, the 3D Phone, and a Film built on the kit's 3D phone or car (build-index
 *  marks its scenes "webgl": true in the index, read from the film's imports: tools/ci/filmlint.mjs uses3d). */
export const isWebglScene = (sc, film) => sc?.type === 'Wire3D' || UP_SCENES.includes(sc?.type) || isWebgl3dPhone(sc, film) || (sc?.type === 'Film' && sc.webgl === true);
/** The spec mistake of a promo-grade scene in a film made before SCENES_UP_FROM, one line ([] when fine). */
export const upSceneProblems = (sc, film) => {
  if (!UP_SCENES.includes(sc?.type)) return [];
  const n = filmNo(film);
  return Number.isFinite(n) && n >= SCENES_UP_FROM ? [] : [`"${sc.type}" is a scene from film v${SCENES_UP_FROM} on (src/lib/device.mjs SCENES_UP_FROM): an older film keeps the scenes it was made with`];
};

export const phoneProblems = (sc) => {
  if (sc?.type !== 'Phone') return [];
  const out = [];
  if (sc.mode !== undefined && !PHONE_MODES.includes(sc.mode)) out.push(`Phone "mode": "${String(sc.mode).slice(0, 20)}" is not "3d" or "flat" (leave it out: the film's number picks)`);
  if (sc.mode === '3d' && sc.staging === 'loupe') out.push('Phone "staging": "loupe" is always the flat device: drop "mode": "3d" or pick "device", "tilt" or "hero"');
  return out;
};

// ---- the self-test --------------------------------------------------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const ph = (o = {}) => ({type: 'Phone', src: '17-nav-drive', ...o});
  ok(phoneMode(ph(), 'v93-hood-cat') === 'flat', 'v93 (made before the ask) keeps the flat device');
  ok(phoneMode(ph(), 'v94-anything') === '3d', 'v94 draws the 3D phone');
  ok(phoneMode(ph(), 'v89-rocket-doctor-r1') === 'flat', 'a redo keeps its original number');
  ok(phoneMode(ph(), 'v120-x-en') === '3d', 'a translation of a new film is 3D');
  ok(upSceneProblems({type: 'PhoneDesk'}, 'v106-supra-toast').length === 1, 'PhoneDesk is refused before SCENES_UP_FROM');
  ok(upSceneProblems({type: 'CarNight'}, 'v107-any').length === 0 && upSceneProblems({type: 'CarNight'}, 'v130-any-en').length === 0, 'CarNight from SCENES_UP_FROM on (and its translations)');
  ok(upSceneProblems({type: 'Phone'}, 'v50-old').length === 0, 'other scenes are not gated');
  ok(isWebglScene({type: 'PhoneDesk'}, 'v107-a') && isWebglScene({type: 'CarNight'}, 'v107-a') && isWebglScene({type: 'Wire3D'}, 'v50-a') && !isWebglScene({type: 'Call'}, 'v107-a'), 'the WebGL scenes');
  ok(isWebglScene({type: 'Film', name: 'V110X', webgl: true}, 'v110-x') && !isWebglScene({type: 'Film', name: 'V110X'}, 'v110-x'), 'a Film marked webgl (the kit\'s 3D) is a WebGL scene');
  ok(phoneMode(ph(), 'v95-turn-left') === '3d', 'v95, before the mix, is 3D');
  ok(phoneMode(ph(), 'v96-a') === '3d' && phoneMode(ph(), 'v97-b') === 'flat' && phoneMode(ph(), 'v98-c') === '3d', 'from v96 the looks take turns (even 3D, odd flat)');
  ok(phoneMode(ph({mode: '3d'}), 'v97-b') === '3d', 'the spec forces 3D on an odd film');
  ok(!phoneWhole(ph(), 'v95-turn-left') && phoneWhole(ph(), 'v96-a') && phoneWhole(ph(), 'v97-b'), 'from v96 every phone is whole');
  ok(!phoneWhole(ph({whole: false}), 'v97-b') && phoneWhole(ph({whole: true}), 'v50-old'), 'the spec\'s "whole" decides for its scene');
  ok(phoneMode(ph(), 'demo-phone3d-v94') === '3d', 'a demo named -v94 is 3D');
  ok(phoneMode(ph(), 'demo-gallery') === 'flat', 'a demo without a number stays flat');
  ok(phoneMode(ph({mode: '3d'}), 'v50-old') === '3d', 'the spec forces 3D on an old film');
  ok(phoneMode(ph({mode: 'flat'}), 'v120-new') === 'flat', 'the spec forces flat on a new film');
  ok(phoneMode(ph({staging: 'loupe'}), 'v120-new') === 'flat', 'the loupe is always flat');
  ok(phoneMode(ph({staging: 'hero'}), 120) === '3d', 'a number works as the film');
  ok(phoneMode({type: 'Title'}, 'v120-x') === null, 'not a Phone: null');
  ok(isWebgl3dPhone(ph(), 'v120-x') && !isWebgl3dPhone(ph(), 'v80-x'), 'isWebgl3dPhone follows the mode');
  ok(phoneProblems(ph({mode: '2d'})).length === 1, 'an unknown mode is a problem');
  ok(phoneProblems(ph({mode: '3d', staging: 'loupe'})).length === 1, '3D + loupe is a problem');
  ok(phoneProblems(ph({mode: 'flat'})).length === 0, 'flat is fine');
  console.log(bad ? `${bad} FAILED` : 'all ok');
  return bad ? 1 : 0;
};

// (the bundle has no `process`: the CLI only exists under Node)
if (typeof process !== 'undefined' && process.argv?.[2] === '--test' && /device\.mjs$/.test(process.argv[1] ?? '')) process.exit(selfTest());
