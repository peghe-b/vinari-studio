#!/usr/bin/env node
// The aura drop (the owner, 2026-10-07, on the first aura films, v81-flood-ex among them: "I don't like these aura videos.
// They are not emotional, they bring no aura and they make no good jump. A SAD opening and BOOM. „არაუშავს! ახლა თემას
// ვღეჭავ.": a STRONG transition, so the topic becomes THE topic and gives people drive. It's TikTok style"). v81 said
// „არაუშავს." calmly, with a full stop, as its FOURTH beat, on a plain Person pair, with no transition and no hit, and
// went on at the same pace. An aura opening (HOOKS.md H21, H22) is now two acts and a drop:
//   act 1, the hurt   beats[0] (or beats[0..1]), 2.5 to 4 s: the put-down, the dump or the doubt said quietly
//                     ("style": "hurt": tools/vo.py voices the whole act as one take, one extra Gemini request) over a
//                     picture that feels it (an illustrated moment, a Film, a PhotoStory: tools/ci/fx.mjs grades it grey,
//                     dim and cold, pushes in slowly and cross-fades), ending on a "hold" of 0.2 to 0.4 s (with the
//                     gap between the two takes about 0.8 s of near-silence his TikTok sound drops into; the picture
//                     inhales through it: it pushes in and goes dark)
//   the drop          the beat marked "drop": true opens on „არაუშავს!" (its first chunk, the film's one "!") on a hard
//                     cut (the plan's "drop": a white flash, a lens tear, the picture slamming in from big and bright and
//                     shaking, a camera kick, the asmr-drop boom); its own scene slams the word ON the cut ("at": "0s": a
//                     later scene's entrance starts 10 frames early, so without it the word already stands when the boom
//                     hits): the glow-up itself (a Person in shades, "charge" crackling, "word": {"text": "არაუშავს!",
//                     "at": "0s"}), or a KineticHeadline "slam", an Impact "word", a Film prop; that chunk's "show" is
//                     left empty: the slam is the line
//   act 2, the drive  the persona's bold line, then the topic: three new pictures within DRIVE.within s of the drop (beat
//                     "cuts"), voiced with energy (the spec's "style": "drive": after the hurt the film is one take anyway)
// Pure ESM, no React. Read by tools/check.mjs (before the voice: AURA_DROP lines, fatal in the cloud, notes on the Mac),
// tools/ci/prompt.mjs --record (refused) and, through dropBeatOf, tools/ci/fx.mjs (the "aura-drop" opening).
//   node tools/ci/aura.mjs <id>     one spec's AURA_DROP lines and its acts on the letters' estimate
//   node tools/ci/aura.mjs --test   the built-in cases (v81's flat shape refused rule by rule, the drop shape passes)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {dropBeatOf, DROP_WORD, estimateTimeline, FPS, planShots, sceneClass} from './fx.mjs';
import {countWords, loadRegistry} from './screentext.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const ACT1 = [2.2, 4.6]; // seconds to the drop's cut on the letters' estimate (the owner's 2.5 to 4, with its slack)
export const HOLD = [0.2, 0.4]; // the hold before the drop (+ the gap between the two takes: about 0.8 s of near-silence)
export const DRIVE = {cuts: 3, within: 4.8}; // new pictures after the drop's cut, and within how many seconds
export const STYLE_HURT = 'hurt';
export const STYLE_DRIVE = 'drive';
const WORD = /არაუშავს/u;

/** The aura formulas (ci/categories.json "openers".aura "formulas"). */
export const auraFormulas = (root = ROOT) => {
  try {
    const f = JSON.parse(fs.readFileSync(path.join(root, 'ci', 'categories.json'), 'utf8'))?.openers?.aura?.formulas;
    return Array.isArray(f) ? f : [];
  } catch {
    return [];
  }
};
/** An aura opening: its recorded hook is H21 or H22, or its spec drops ("opening": "aura-drop", a beat "drop": true). */
export const isAuraOpening = (spec, hook, root = ROOT) =>
  (typeof hook === 'string' && auraFormulas(root).includes(hook)) || spec?.opening === 'aura-drop' || (Array.isArray(spec?.beats) && spec.beats.some((b) => b?.drop === true));

const hasWord = (v) => (typeof v === 'string' ? WORD.test(v) : Array.isArray(v) ? v.some(hasWord) : v && typeof v === 'object' ? Object.values(v).some(hasWord) : false);
/** The scene slams „არაუშავს" on screen: a KineticHeadline or Title line, an Impact (or any illustrated scene's) punch
 *  `word`, a Film's own prop. */
export const slams = (sc) => {
  if (!sc || typeof sc !== 'object') return false;
  if (sc.type === 'KineticHeadline' || sc.type === 'Title') return hasWord(sc.lines);
  if (sc.type === 'Film') return hasWord(Object.fromEntries(Object.entries(sc).filter(([k]) => !['type', 'name', 'look'].includes(k))));
  return hasWord(sc.word);
};
/** When the scene slams „არაუშავს": the line's or the word's `at` (null: none given; undefined: a Film, not read). */
export const slamAt = (sc) => {
  if (!sc || typeof sc !== 'object' || sc.type === 'Film') return undefined;
  if (sc.type === 'KineticHeadline' || sc.type === 'Title') {
    const line = (Array.isArray(sc.lines) ? sc.lines : []).find((l) => hasWord(l));
    return line && typeof line === 'object' && line.at !== undefined ? line.at : null;
  }
  return sc.word && typeof sc.word === 'object' && sc.word.at !== undefined ? sc.word.at : null;
};
/** A picture (the registry's class, its clsIf by the props; a Film by its look), not a text card, data or the app. */
const pictureOf = (sc, reg) => {
  if (!sc || typeof sc.type !== 'string') return false;
  if (sc.type === 'Film') return sc.look === 'illustrated' || sc.bleed === true;
  let cls = reg[sc.type]?.cls;
  for (const c of reg[sc.type]?.clsIf ?? []) if (Object.entries(c.when ?? {}).every(([k, v]) => (v === '*' ? sc[k] !== undefined : sc[k] === v))) cls = c.cls;
  return cls === 'picture';
};
const shotWhere = (p) => `beats[${p.beats[0]}]${p.c0 ? `.cuts (chunk ${p.c0})` : '.scene'}`;

/** The acts on the letters' estimate: {drop, t, shot, at, drive} (t: seconds to the drop's cut; drive: new pictures within
 *  DRIVE.within s of it), or null without a drop beat. */
export const auraActs = (spec, timeline = estimateTimeline(spec)) => {
  const d = dropBeatOf(spec, true);
  if (d < 0) return null;
  const shots = planShots(spec, timeline);
  const k = shots.findIndex((p) => p.beats[0] === d && p.c0 === 0);
  const at = k >= 0 ? shots[k].from : Math.round(timeline.beats[d].start * FPS);
  const drive = k >= 0 ? shots.filter((p) => p.from > at && p.from <= at + DRIVE.within * FPS).length : 0;
  return {drop: d, t: timeline.beats[d].start, shot: k, at, drive, shots};
};

/** AURA_DROP lines: [{code, where, msg, line}]. Every rule of the drop (HOOKS.md H21); [] when the opening drops. */
export const auraDropProblems = (spec, {root = ROOT} = {}) => {
  const out = [];
  const add = (where, msg) => out.push({code: 'AURA_DROP', where, msg, line: `AURA_DROP ${where}: ${msg}`});
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const acts = auraActs(spec);
  if (!acts) {
    add('beats', 'no drop: after the hurt (beats[0], or beats[0] and [1]) the next beat opens on „არაუშავს!" on a hard cut, marked "drop": true (HOOKS.md H21)');
    return out;
  }
  const d = acts.drop;
  const b = beats[d];
  if (d === 0) {
    add('beats[0]', 'the drop is the first beat: the hurt comes first (beats[0], or beats[0] and [1], 2.5 to 4 s), then „არაუშავს!"');
    return out;
  }
  if (b.drop !== true) add(`beats[${d}]`, 'mark the drop: "drop": true (the planner cuts, flashes and booms there)');
  if (d > 2) add(`beats[${d}]`, `„არაუშავს" comes as beat ${d + 1}: the hurt is beats[0] (and beats[1]) only, then the drop (v81 said it calmly as its fourth beat)`);
  // the drop's words: „არაუშავს!" alone (or with „ძმაო"), with energy
  const say = String(b.say ?? '').split('|');
  const show = String(b.show ?? b.say ?? '').split('|');
  const c0 = (say[0] ?? '').trim();
  if (!DROP_WORD.test(c0)) add(`beats[${d}].say`, 'the drop opens on „არაუშავს!", its first chunk');
  else {
    if (!/!\s*$/u.test(c0)) add(`beats[${d}].say`, `"${c0}" is said calmly: the drop is „არაუშავს!" with its "!" (the film's one), a shout, not a shrug (v81: „არაუშავს.")`);
    if (countWords(c0) > 2) add(`beats[${d}].say`, `"${c0}": the drop chunk is „არაუშავს!" alone (or „არაუშავს, ძმაო!"); the bold line is the next chunk`);
  }
  // its picture slams the word, and the subtitle leaves it to the slam
  const sc = b.scene;
  if (!sc) add(`beats[${d}]`, 'the drop needs a scene of its own: the hard cut lands on „არაუშავს!"');
  else if (!slams(sc)) add(`beats[${d}].scene`, `the drop's picture slams „არაუშავს!" on screen ({"type": "KineticHeadline", "staging": "slam", "align": "center", "lines": ["*არაუშავს!*"]}, or an Impact with "word": "არაუშავს!"); a ${sc.type} does not`);
  else {
    if (sc.type === 'KineticHeadline' && sc.staging !== 'slam') add(`beats[${d}].scene`, 'the drop\'s KineticHeadline takes "staging": "slam" (the word lands from big)');
    const at = slamAt(sc);
    if (at !== undefined && !(at === 0 || at === '0s'))
      add(`beats[${d}].scene`, `the slam must land ON the cut: ${sc.type === 'KineticHeadline' || sc.type === 'Title' ? 'its „არაუშავს!" line' : 'its "word"'} takes "at": "0s"${at === null ? ` (${sc.type === 'KineticHeadline' || sc.type === 'Title' ? 'a later scene\'s entrance starts 10 frames before its cut, so the word already stands when the boom hits' : 'a plain "word" string lands 40 frames in, long after the boom'})` : ` (it is ${JSON.stringify(at)})`}: {"text": "არაუშავს!", "at": "0s"}`);
    if ((show[0] ?? '').trim()) add(`beats[${d}].show`, `leave the drop chunk's subtitle empty ("show": " |${show.slice(1).join('|')}"): the slam is the line, the same word twice in one frame reads as a mistake (DUP_SUBTITLE)`);
  }
  // the voice: the hurt quieter and slower (one take of its own), the drop and the drive with energy (one take)
  for (let i = 0; i < d; i++) if (beats[i]?.style !== STYLE_HURT) add(`beats[${i}]`, `the hurt is said quieter and slower: "style": "${STYLE_HURT}"${beats[i]?.style ? ` (it is "${beats[i].style}")` : ''} (tools/vo.py: the whole act is one take, one extra Gemini request)`);
  const hold = Number(beats[d - 1]?.hold);
  if (!(hold >= HOLD[0] - 1e-9 && hold <= HOLD[1] + 1e-9)) add(`beats[${d - 1}]`, `"hold": ${HOLD[0]} to ${HOLD[1]} on the hurt's last line (${Number.isFinite(hold) ? `it is ${hold}` : 'none'}): the near-silence his TikTok drop lands in`);
  if (spec.style !== STYLE_DRIVE) add('style', `"style": "${STYLE_DRIVE}" at the top of the spec${spec.style ? ` (it is "${spec.style}")` : ''}: the drop and everything after it said with energy (no extra request: after the hurt the film is one take anyway)`);
  for (let i = d; i < beats.length; i++)
    if (beats[i]?.style !== undefined && beats[i].style !== spec.style) add(`beats[${i}]`, `a style of its own ("${beats[i].style}"): from the drop on the film is one take in the spec's "${STYLE_DRIVE}" (another style is another Gemini request)`);
  // the timing, on the letters' estimate (a hurt beat counts slower)
  if (acts.t < ACT1[0] || acts.t > ACT1[1]) add('beats', `the hurt runs ${acts.t.toFixed(1)} s before the drop (the letters' estimate, the hold included): about 2.5 to 4 s, one or two short sentences`);
  // the hurt's pictures: ones the grade reaches and that feel it
  const reg = loadRegistry(root);
  for (const p of acts.shots.slice(0, Math.max(0, acts.shot))) {
    const t = p.spec.type;
    if (t === 'Photo') add(shotWhere(p), 'a Photo takes no grade, so the hurt would not look grey and dim: show the photo in a PhotoStory ("staging": "bleed"), or an illustrated moment');
    else if (!pictureOf(p.spec, reg) || sceneClass(t) === 'self')
      add(shotWhere(p), `the hurt is a picture that feels it (a Chat left on read, a missed Call, Person slumped or turned away, a Drive alone at night in the rain, your illustrated Film, a PhotoStory), not a ${t}: the app, the data and the words come after the drop`);
  }
  // the drive: a new picture every 1 to 1.5 s right after the drop
  if (acts.shot > 0 && acts.drive < DRIVE.cuts)
    add(`beats[${d}]`, `after the drop ${acts.drive} new picture${acts.drive === 1 ? '' : 's'} in ${DRIVE.within} s: the drive cuts every 1 to 1.5 s (at least ${DRIVE.cuts}: "cuts" on the drop beat's chunks, short beats after it)`);
  return out;
};

/** One line for check.mjs when the drop is in order. */
export const auraSummary = (spec) => {
  const a = auraActs(spec);
  return a ? `the drop at beats[${a.drop}], ${a.t.toFixed(1)} s in (estimate), then ${a.drive} new pictures in ${DRIVE.within} s` : 'no drop';
};

// ---- the CLI and the self-test ---------------------------------------------------------------------------------------
const ok = (cond, what) => {
  if (!cond) {
    console.error(`FAIL ${what}`);
    process.exitCode = 1;
  } else console.log(`ok   ${what}`);
};
const selfTest = () => {
  const codes = (s) => auraDropProblems(s).map((p) => `${p.where}: ${p.msg}`);
  // the drop shape (the demo's): passes
  const good = {
    id: 'demo-aura-test',
    style: 'drive',
    beats: [
      {say: 'ძმაკაცებმა მითხრეს, | ბოთე ხარო.', style: 'hurt', hold: 0.3, scene: {type: 'Chat', staging: 'group', messages: [{text: 'ჰაჰა', from: 'friend'}]}, cuts: [{chunk: 1, scene: {type: 'Drive', staging: 'rear', weather: 'rain', time: 'night', speed: 0}}]},
      {
        say: 'არაუშავს! | ახლა წყალში ნამყოფს | შორიდან ვცნობ.',
        show: ' | ახლა წყალში ნამყოფს | შორიდან ვცნობ.',
        drop: true,
        scene: {type: 'KineticHeadline', staging: 'slam', align: 'center', lines: [{text: '*არაუშავს!*', at: '0s'}]},
        cuts: [{chunk: 1, scene: {type: 'Person', cast: 'me'}}, {chunk: 2, scene: {type: 'Windshield'}}],
      },
      {say: 'ჯერ სავარძლის ქვეშ | ტალახს ვეძებ.', scene: {type: 'Film', name: 'X', look: 'illustrated'}},
      {say: 'მერე ჟანგს.', scene: {type: 'EndCard', tagline: 'ჟანგი არ იტყუება.'}},
    ],
  };
  ok(codes(good).length === 0, `the drop shape passes${codes(good).length ? `: ${codes(good).join('; ')}` : ''}`);
  // v81's flat shape: refused rule by rule
  let v81 = null;
  try {
    v81 = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', 'v81-flood-ex.json'), 'utf8'));
  } catch {}
  if (v81) {
    const c = codes(v81).join('\n');
    ok(/beats\[3\]: mark the drop/.test(c), 'v81: the drop is not marked');
    ok(/comes as beat 4/.test(c), 'v81: „არაუშავს" as the fourth beat');
    ok(/is said calmly/.test(c), 'v81: „არაუშავს." with a full stop');
    ok(/beats\[3\]\.scene: the drop's picture slams/.test(c), 'v81: a plain Person pair, no slam');
    ok(/beats\[0\]: the hurt is said quieter/.test(c), 'v81: the hurt not styled');
    ok(/beats\[2\]: "hold"/.test(c), 'v81: no hold before the drop');
    ok(/^style: /m.test(c), 'v81: no "drive"');
    ok(/the hurt runs/.test(c), 'v81: the hurt runs too long');
  }
  const variant = (f) => {
    const s = JSON.parse(JSON.stringify(good));
    f(s);
    return codes(s).join('\n');
  };
  ok(/is said calmly/.test(variant((s) => (s.beats[1].say = s.beats[1].say.replace('არაუშავს!', 'არაუშავს.')))), 'a calm „არაუშავს." is refused');
  ok(/subtitle empty/.test(variant((s) => delete s.beats[1].show)), 'the subtitle under the slam is refused');
  ok(/not a Phone/.test(variant((s) => (s.beats[0].scene = {type: 'Phone', src: '01-home'}))), 'the app in the hurt is refused');
  ok(/takes no grade/.test(variant((s) => (s.beats[0].scene = {type: 'Photo', src: 'x', mode: 'bleed'}))), 'a Photo in the hurt is refused');
  ok(/style of its own/.test(variant((s) => (s.beats[2].style = 'hurt'))), 'a second style after the drop is refused');
  ok(/new picture/.test(variant((s) => delete s.beats[1].cuts)), 'a slow drive is refused');
  ok(/"hold"/.test(variant((s) => (s.beats[0].hold = 1.2))), 'a long hold is refused');
  ok(/"hold"/.test(variant((s) => (s.beats[0].hold = 0.6))), 'the old 0.6 hold (about 1.1 s of silence) is refused');
  ok(/land ON the cut/.test(variant((s) => (s.beats[1].scene.lines = ['*არაუშავს!*']))), 'a slam already standing at the cut (no "at") is refused');
  ok(/lands 40 frames in/.test(variant((s) => (s.beats[1].scene = {type: 'Person', cast: 'me', word: 'არაუშავს!'}))), 'a plain Person word string (lands 40 frames late) is refused');
  ok(variant((s) => (s.beats[1].scene = {type: 'Person', staging: 'solo', cast: 'me', charge: {at: '0s'}, acts: [{at: 0, face: 'cool', pose: 'confident'}], word: {text: 'არაუშავს!', at: '0s', tone: 'accent'}})) === '', 'the glow-up (a Person in shades, the word on the cut) passes');
  ok(/first beat/.test(variant((s) => (s.beats[0].drop = true))), 'a drop on beats[0] is refused');
  ok(isAuraOpening({beats: []}, 'H21') && !isAuraOpening({beats: []}, 'H05') && isAuraOpening(good, null), 'isAuraOpening');
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--test') selfTest();
  else if (arg && /^[a-z0-9-]+$/.test(arg)) {
    const spec = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', `${arg}.json`), 'utf8'));
    const found = auraDropProblems(spec);
    found.forEach((p) => console.log(p.line));
    console.log(found.length ? `${found.length} AURA_DROP line${found.length === 1 ? '' : 's'}` : `ok: ${auraSummary(spec)}`);
  } else {
    console.error('usage: node tools/ci/aura.mjs <id> | --test');
    process.exit(2);
  }
}
