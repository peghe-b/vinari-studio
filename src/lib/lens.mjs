// Whether a film wears the VHS lens (src/layers/VHS.tsx), shared by the render (src/Promo.tsx) and the motion planner
// (tools/ci/fx.mjs), so a film without the lens is never planned a lens glitch.
//
// The owner (2026-10-12): "take this VHS effect off in the studio too; let's see how they look from now on; if anything,
// I'll have you add it back. For now remove it or switch it off for a while." From film VHS_OFF_FROM on the lens is off
// unless the spec's "vhs" asks for it; every earlier film, a redo of one and its translations keep the lens they were
// made with. To bring it back for new films, raise VHS_OFF_FROM past the newest film number (or set it to Infinity).
//
//   lensOff(film)   true when the film `film` (its id, or its number from filmKey) is drawn without the lens by default
//   node src/lib/lens.mjs --test   the self-test
import {filmKey} from '../scenes/illo/wardrobe.mjs';

export const VHS_OFF_FROM = 96; // v95-turn-left was the last film made with the lens on by default

export const lensOff = (film) => {
  const n = typeof film === 'number' ? film : filmKey(film);
  return Number.isFinite(n) && n >= VHS_OFF_FROM && n < 100000;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  ok(!lensOff('v95-turn-left'), 'v95 keeps the lens');
  ok(lensOff('v96-anything'), 'v96 is drawn without it');
  ok(lensOff('v120-x-en'), 'a translation of a new film is without it');
  ok(!lensOff('v89-rocket-doctor-r1'), 'a redo keeps its original number');
  ok(!lensOff('demo-gallery'), 'a demo without a number keeps the lens');
  ok(lensOff(97), 'a bare number works');
  console.log(bad ? `${bad} failed` : 'all ok');
  process.exit(bad ? 1 : 0);
};
if (typeof process !== 'undefined' && process.argv?.[1] && process.argv[1].endsWith('lens.mjs') && process.argv.includes('--test')) selfTest();
