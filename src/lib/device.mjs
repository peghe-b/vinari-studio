// The phone mockup's look, shared by the render (src/scenes/Phone.tsx, src/Promo.tsx) and the tools (tools/ci/fx.mjs,
// tools/ci/visual.mjs, tools/build-index.mjs).
//
// The owner (2026-10-12): "the videos' 3D motion graphics, I hope you did not delete them; and the mockups: those will be in
// 3D too, refined." From film number PHONE3D_FROM on, a Phone scene is a real 3D iPhone (src/scenes/three/phone3d.tsx: a
// titanium frame, thin black bezels, the Dynamic Island, the real capture as the lit display, soft studio light, a slow
// camera); every earlier film, a redo of one and its translations keep the line-art device they were made with. The
// spec's `"mode": "3d"` / `"flat"` forces one look; the "loupe" staging is always the flat device with its loupe.
//
//   phoneMode(sc, film)   "3d" | "flat" for a Phone scene of the film `film` (its id, or its number from filmKey); null
//                         for any other scene
//   isWebgl3dPhone(sc, film)   true when that Phone draws in WebGL (one canvas, like Wire3D: the planner keeps transitions
//                         from mounting it early, the drift leaves it alone)
//   phoneProblems(sc)     the spec mistakes, one line each ([] when fine)
//
//   node src/lib/device.mjs --test   the self-test
import {filmKey} from '../scenes/illo/wardrobe.mjs';

export const PHONE3D_FROM = 94; // v93-hood-cat was the last film made before the ask: it renders as made
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
  return Number.isFinite(n) && n >= PHONE3D_FROM && n < 100000 ? '3d' : 'flat';
};

export const isWebgl3dPhone = (sc, film) => phoneMode(sc, film) === '3d';

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
