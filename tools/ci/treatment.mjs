// The written treatment (plan step 1.3, 2026-10-26: "make films the way the promos are made"). Before a single beat, the
// cloud Claude writes three pitches, scores them on ci/promo-dna.md's rubric (the QR, navigator and diagnostics promos:
// 100K views in 21 h with no ads), keeps the best and writes it out as the spec's "treatment" (src/types.ts Treatment):
// the logline, the ONE hero, the obstacle, a hook that is an EVENT with its own SOUND in 0..2 s, Act 1 with three
// escalations, the turn and the reveal, the real screens in the order the film shows them, the payoff with the same hero.
//
//   import {treatmentProblems, treatmentOn, kindOf} from './ci/treatment.mjs'   (tools/check.mjs, before the voice)
//   node tools/ci/treatment.mjs <id>     the lines for specs/<id>.json, exit 1 when one is fatal
//   node tools/ci/treatment.mjs --test   the self-test
//
// The lines (each {code, line, fatal}); check.mjs decides what stops the run (VS_CI=1: everything fatal here; a redo and a
// free film keep only TREATMENT fatal; on the Mac the same from film TREATMENT_FROM on, notes before):
//   TREATMENT       the field is missing or not whole: 3 pitches scored 0..12, the kept one the best and PITCH_MIN or more,
//                   the logline, hero, obstacle, hook {event, sound}, 3+ act1 escalations, turn, reveal {beat, what},
//                   screens [{screen, step}], payoff
//   HOOK_SOUND      the hook's sound is not heard in the first 2 s: beat 0's "sfx" names it at 2 s or earlier (or its
//                   chunk 0 or 1), its "say" bleeps ("bleep"), or beat 0's own Film plays it
//   HOOK_CALM       (feature films) the film opens on a calm narrator question: open on the event; a typed opening of his
//                   is a note (his words win)
//   HOOK_LIBRARY    the hook (beat 0 and its cuts) on a library Person, Drive or Windshield: compose it (a Film, a real
//   REVEAL_LIBRARY  photo, the real screen); the same for the reveal beat
//   SCREEN_FLOW     (feature films) fewer than 3 real current screens, a screen that is not a capture (or a retired one), or
//                   the film shows them in another order than the treatment lists them (carinfo, stories, free: only
//                   real and in order, no minimum)
//   ACT1_SHARE      a note: the reveal beat starts before 20 % or after 60 % of the spoken letters (the promos: 25..35 %)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {beatScenes, namesScreen, retiredScreens} from './visual.mjs';
import {vNumber} from './ending.mjs';
import {P2_FROM, p2On} from '../../src/lib/p2.mjs';

const root0 = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** The first film held to it: v131 (the next number on main when the rule came, 2026-10-26). Older films, their redos on the
 *  Mac and their translations render as made. */
export const TREATMENT_FROM = 131;
// phase 2 (src/lib/p2.mjs): every pitch names its hero OBJECT, its signature graphic (the FilmTitleCard kind) and its hook type;
// the kept treatment carries the three (tools/ci/p2lint.mjs REPEAT_TEMPLATE reads them against the last 2 films)
export const P2_GRAPHICS = ['stat', 'bars', 'versus', 'receipt', 'grid'];
export const P2_HOOKS = ['FreezeTag', 'IrisDetail', 'KeywordLift', 'FilmTitleCard', 'StruckNumber', 'ResultFirst', 'StakeCounter', 'Decode'];
export const treatmentOn = (id) => vNumber(id) >= TREATMENT_FROM;
/** The kept pitch scores at least this on ci/promo-dna.md's rubric (12 max), like HOOKS.md's "ship at 9" for a hook alone. */
export const PITCH_MIN = 8;
/** The library scenes a hook or a reveal may not stand on (the plan: they are the generic look the promos never had). */
export const NOT_IN_HOOK = ['Person', 'Drive', 'Windshield'];
export const HOOK_SOUND_S = 2;

/** feature | carinfo | stories | free, from the film's category (ci/categories.json): the treatment's shape differs. */
export const kindOf = (cat) => (cat?.needsTopic ? 'free' : cat?.bank ? (cat.id === 'stories' ? 'stories' : 'carinfo') : 'feature');

const str = (v, min = 4, max = 400) => typeof v === 'string' && [...v.trim()].length >= min && [...v].length <= max;
const said = (b) => String(b?.say ?? '').replace(/\{bleep(?::[^}]*)?\}/g, '#@%').replace(/\|/g, ' ');

/** Every real capture's id: public/screens/<id>.jpg and public/screens/carplay/<id>.png (never _retired). */
export const captureIds = (root = root0) => {
  const list = (dir, ext) => {
    try {
      return fs.readdirSync(dir).filter((f) => f.endsWith(ext)).map((f) => f.slice(0, -ext.length));
    } catch {
      return [];
    }
  };
  return [...list(path.join(root, 'public/screens'), '.jpg'), ...list(path.join(root, 'public/screens/carplay'), '.png')];
};
const sfxNames = (root) => {
  try {
    return new Set(fs.readdirSync(path.join(root, 'public/sfx')).filter((f) => /\.(wav|m4a)$/.test(f)).map((f) => f.replace(/\.(wav|m4a)$/, '')));
  } catch {
    return new Set();
  }
};
const filmCodeOf = (root, name) => {
  try {
    return fs.readFileSync(path.join(root, 'src/scenes/film', `${name}.tsx`), 'utf8');
  } catch {
    return '';
  }
};

/** The real captures the film's beats show, in the order they first appear (a scene's JSON, then a Film's code, by
 *  position); the cover and the treatment never count. */
export const screenOrder = (spec, {root = root0, filmCode = (n) => filmCodeOf(root, n)} = {}) => {
  const ids = captureIds(root);
  const seen = [];
  for (const b of Array.isArray(spec?.beats) ? spec.beats : []) {
    for (const sc of beatScenes(b)) {
      const texts = [JSON.stringify(sc), sc.type === 'Film' && typeof sc.name === 'string' ? filmCode(sc.name) : ''];
      for (const t of texts) {
        const at = ids
          .map((s) => [s, t.search(new RegExp(`(?<![a-z0-9-])${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9-])`))])
          .filter(([, i]) => i >= 0)
          .sort((a, b) => a[1] - b[1]);
        for (const [s] of at) if (!seen.includes(s)) seen.push(s);
      }
    }
  }
  return seen;
};

/** Is the treatment's hook sound heard in 0..2 s? */
const hookHeard = (spec, sound, {filmCode}) => {
  const b0 = spec?.beats?.[0];
  if (!b0 || !sound) return false;
  if (sound === 'bleep') return /\{bleep[:}]/.test(String(b0.say ?? ''));
  const early = (c) => c?.name === sound && (Number.isFinite(c.at) ? c.at <= HOOK_SOUND_S : Number.isInteger(c.chunk) ? c.chunk <= 1 : true);
  if ((Array.isArray(b0.sfx) ? b0.sfx : []).some(early)) return true;
  // beat 0's own Film (its scene, or a cut on chunk 0 or 1) playing it
  const films = [b0.scene, ...(Array.isArray(b0.cuts) ? b0.cuts.filter((c) => Number(c?.chunk) <= 1).map((c) => c.scene) : [])].filter((sc) => sc?.type === 'Film' && typeof sc.name === 'string');
  return films.some((sc) => new RegExp(`["'\`]${sound.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}["'\`]`).test(filmCode(sc.name)));
};

/** The first sentence of beat 0, as heard. */
const firstSentence = (spec) => {
  const t = said(spec?.beats?.[0]).trim();
  const m = /^[^.?!…]*[.?!…]+/.exec(t);
  return (m ? m[0] : t).trim();
};

/** The problems of `spec`'s treatment: [{code, line, fatal}] (fatal = this rule's own weight; check.mjs may soften it). */
export const treatmentProblems = (spec, opts = {}) => {
  const root = opts.root ?? root0;
  const kind = opts.kind ?? 'feature';
  const filmCode = opts.filmCode ?? ((n) => filmCodeOf(root, n));
  const out = [];
  const P = (code, line, fatal = true) => out.push({code, line: `${code} ${line}`, fatal});
  const t = spec?.treatment;
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  if (!t || typeof t !== 'object' || Array.isArray(t)) {
    P('TREATMENT', 'the spec has no "treatment": write it first (ci/prompt.md step 1, ci/promo-dna.md): three pitches scored on the rubric, the best one written out as {pitches, picked, logline, hero, obstacle, hook {event, sound}, act1 [3+], turn, reveal {beat, what}, screens [{screen, step}], payoff}');
    return out;
  }
  // ---- the pitches ----
  const pitches = Array.isArray(t.pitches) ? t.pitches : [];
  if (pitches.length !== 3) P('TREATMENT', `"pitches" holds ${pitches.length}: exactly 3, each {logline, hook, score}, from different angles (ci/promo-dna.md)`);
  pitches.forEach((p, i) => {
    if (!str(p?.logline, 12, 320)) P('TREATMENT', `pitches[${i}].logline: one sentence, who wants what and what stands in the way (12 to 320 characters)`);
    if (!str(p?.hook, 4, 220)) P('TREATMENT', `pitches[${i}].hook: the event that opens it and its sound`);
    if (!Number.isInteger(p?.score) || p.score < 0 || p.score > 12) P('TREATMENT', `pitches[${i}].score: its total on ci/promo-dna.md's rubric, a whole number 0 to 12`);
  });
  const p2 = p2On(vNumber(spec?.id));
  if (p2)
    pitches.forEach((p, i) => {
      if (!str(p?.heroObject, 3, 120)) P('PITCH_P2', `pitches[${i}].heroObject: the ONE real object the film is built round (the OBD plug, the tyre's DOT code, the customs paper), never a drawn person`);
      if (!P2_GRAPHICS.includes(p?.graphic)) P('PITCH_P2', `pitches[${i}].graphic: its signature graphic, the FilmTitleCard kind (${P2_GRAPHICS.join(', ')})`);
      if (!P2_HOOKS.includes(p?.hookType)) P('PITCH_P2', `pitches[${i}].hookType: how frame 0 opens (${P2_HOOKS.join(', ')})`);
    });
  const lines = pitches.map((p) => String(p?.logline ?? '').trim().toLowerCase());
  if (new Set(lines).size < lines.length) P('TREATMENT', 'two pitches have the same logline: three different ideas');
  const scores = pitches.map((p) => (Number.isInteger(p?.score) ? p.score : -1));
  if (!Number.isInteger(t.picked) || t.picked < 0 || t.picked >= pitches.length) P('TREATMENT', `"picked": the index of the kept pitch (0 to ${Math.max(0, pitches.length - 1)})`);
  else if (scores.length && scores[t.picked] < Math.max(...scores)) P('TREATMENT', `"picked" is pitch ${t.picked} (${scores[t.picked]}), but pitch ${scores.indexOf(Math.max(...scores))} scored ${Math.max(...scores)}: keep the best`);
  else if (scores[t.picked] >= 0 && scores[t.picked] < PITCH_MIN) P('TREATMENT', `the kept pitch scores ${scores[t.picked]}: under ${PITCH_MIN} of 12, pitch again (a conflict hook you can hear, the problem lived, the same hero at the end)`);
  // ---- the kept one, written out ----
  for (const [k, min, what] of [
    ['logline', 12, 'one sentence: who wants what, what stands in the way, how it turns'],
    ['hero', 3, 'the ONE person (or car) the story follows, the same in the hook and the payoff'],
    ['obstacle', 4, 'what stands in the hero\'s way'],
    ['turn', 4, 'the beat before the reveal: silence, black, the twist'],
    ['payoff', 8, 'the same hero at the end, changed, and the line that answers the hook'],
  ])
    if (!str(t[k], min, 400)) P('TREATMENT', `"${k}": ${what}`);
  const hook = t.hook && typeof t.hook === 'object' ? t.hook : {};
  if (!str(hook.event, 6, 300)) P('TREATMENT', '"hook.event": what HAPPENS in the first 2 s (a scream at the phone, a crash, a stranger yelling through a speaker), never a question to the viewer');
  else if (/\?\s*$/.test(hook.event.trim())) P('TREATMENT', '"hook.event" is a question: write the event itself');
  const sound = typeof hook.sound === 'string' ? hook.sound.trim() : '';
  const sounds = sfxNames(root);
  if (!sound) P('TREATMENT', '"hook.sound": the sound of the event, a public/sfx name ("real-door", "real-phone-buzz", "asmr-haptic-heavy" ...) or "bleep"');
  else if (sound !== 'bleep' && sounds.size && !sounds.has(sound)) P('TREATMENT', `"hook.sound" "${sound.slice(0, 40)}" is not a sound of public/sfx (or "bleep")`);
  const act1 = Array.isArray(t.act1) ? t.act1 : [];
  if (act1.length < 3 || act1.some((x) => !str(x, 6, 300))) P('TREATMENT', `"act1": the problem lived, 3 escalations or more, each worse than the last (found ${act1.length})`);
  const rv = t.reveal && typeof t.reveal === 'object' ? t.reveal : {};
  const lastBeat = beats.length - 1;
  if (!Number.isInteger(rv.beat) || rv.beat < 1 || rv.beat >= Math.max(1, lastBeat)) P('TREATMENT', `"reveal.beat": the index of the beat the answer arrives on (1 to ${Math.max(1, lastBeat - 1)}, never the EndCard)`);
  if (!str(rv.what, 4, 300)) P('TREATMENT', '"reveal.what": what the viewer sees at the reveal');
  const steps = Array.isArray(t.screens) ? t.screens : null;
  if (!steps) P('TREATMENT', '"screens": the real captures in the order the film shows them, [{screen, step}] ([] when the film shows no app)');
  if (p2 && Number.isInteger(t.picked) && pitches[t.picked]) {
    const k = pitches[t.picked];
    for (const f of ['heroObject', 'graphic', 'hookType'])
      if (t[f] !== k[f]) P('PITCH_P2', `"${f}": the kept pitch's own ("${k[f] ?? ''}"), written into the treatment`);
  }
  if (out.length) return out; // the shape first: the rest reads it

  // ---- the film keeps it ----
  if (!hookHeard(spec, sound, {filmCode}))
    P('HOOK_SOUND', `the hook's sound "${sound}" is not heard in the first ${HOOK_SOUND_S} s: put it in beats[0]: "sfx": [{"name": "${sound === 'bleep' ? 'real-…' : sound}", "at": 0.1}]${sound === 'bleep' ? ' (or bleep a word of beat 0: „…{bleep:…}")' : ''}, or let beat 0's own Film play it`);
  if (kind === 'feature') {
    const s0 = firstSentence(spec);
    if (/\?\s*$/.test(s0) && !/[!?]\?$|\?!$/.test(s0.replace(/\s/g, '')) && !/[„“"]/.test(s0))
      P('HOOK_CALM', `beats[0] opens on a calm question („${s0.slice(0, 60)}"): open on the event itself (heard and seen), a person mid-trouble; a question may follow it`);
  }
  const libIn = (i) => (beats[i] ? beatScenes(beats[i]).map((sc) => String(sc.type)).filter((x) => NOT_IN_HOOK.includes(x)) : []);
  const h = libIn(0);
  if (h.length) P('HOOK_LIBRARY', `beats[0] stands on the library ${[...new Set(h)].join(', ')}: the hook is composed for this film (your Film from the kit, a real photo, the real screen), never ${NOT_IN_HOOK.join(', ')}`);
  if (beats[rv.beat] && !beats[rv.beat].scene) P('REVEAL_LIBRARY', `beats[${rv.beat}] (the reveal) has no scene of its own: the reveal opens on its own picture`);
  const r = libIn(rv.beat);
  if (r.length) P('REVEAL_LIBRARY', `beats[${rv.beat}] (the reveal) stands on the library ${[...new Set(r)].join(', ')}: the reveal is the film's own picture (the phone rising, your Film), never ${NOT_IN_HOOK.join(', ')}`);
  // the screens: real, current, in the film's order
  const ids = new Set(captureIds(root));
  const retired = new Set(retiredScreens(root));
  const named = steps.map((s) => (typeof s === 'string' ? s : s?.screen)).map((s) => String(s ?? '').replace(/^carplay\//, '').replace(/\.(jpg|png)$/, ''));
  named.forEach((s, i) => {
    if (retired.has(s)) P('SCREEN_FLOW', `screens[${i}] "${s}" is a retired capture (public/screens/_retired): use a current one`);
    else if (!ids.has(s)) P('SCREEN_FLOW', `screens[${i}] "${s.slice(0, 40)}" is not a capture of public/screens (or public/screens/carplay)`);
    if (typeof steps[i] === 'object' && !str(steps[i]?.step, 3, 200)) P('SCREEN_FLOW', `screens[${i}].step: the one plain verb of this step ("tap QR ბარათი", "the code in Georgian")`);
  });
  const distinct = [...new Set(named.filter((s) => ids.has(s)))];
  if (kind === 'feature' && distinct.length < 3)
    P('SCREEN_FLOW', `the treatment names ${distinct.length} real screen${distinct.length === 1 ? '' : 's'}: a feature film proves it on 3 or more, in the order you tap them (the home 23-home-104, the menu 25-menu-104, the feature's own, its result)`);
  const shown = screenOrder(spec, {root, filmCode});
  const missing = distinct.filter((s) => !shown.includes(s));
  if (missing.length) P('SCREEN_FLOW', `the film never shows ${missing.join(', ')} of its treatment: show each step on its real screen (a Phone beat, StepShot, Phone3)`);
  else {
    const order = shown.filter((s) => distinct.includes(s));
    if (order.join(' ') !== distinct.join(' ')) P('SCREEN_FLOW', `the film shows the screens as ${order.join(' > ')}, the treatment's flow is ${distinct.join(' > ')}: one order, the way you tap them`);
  }
  // Act 1's room (a note): the promos revealed at 25..35 %
  if (kind === 'feature' && beats.length > 3) {
    const letters = beats.map((b) => said(b).replace(/[^\p{L}\p{N}]/gu, '').length);
    const total = letters.reduce((a, b) => a + b, 0) || 1;
    const before = letters.slice(0, rv.beat).reduce((a, b) => a + b, 0) / total;
    if (before < 0.2 || before > 0.6) P('ACT1_SHARE', `the reveal (beats[${rv.beat}]) comes after ${Math.round(before * 100)} % of the voice: the promos lived the problem for 25 to 35 % first`, false);
  }
  return out;
};

// ---- the self-test (node tools/ci/treatment.mjs --test) ---------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const codes = (spec, o = {}) => treatmentProblems(spec, {root: root0, filmCode: () => '', ...o}).map((p) => p.code);
  const tr = {
    pitches: [
      {logline: 'A woman yells at a foreign GPS that talks in feet, then finds a Georgian voice.', hook: 'her scream at the phone, bleeped', score: 11},
      {logline: 'A taxi driver loses a fare to a wrong turn and finds the lane strip.', hook: 'a horn behind him', score: 8},
      {logline: 'A father on a mountain road with no signal finds the map offline.', hook: 'the phone beeps no signal', score: 9},
    ],
    picked: 0,
    logline: 'A woman yells at a foreign GPS that talks in feet, then finds a Georgian voice.',
    hero: 'ნინო, 30, driving to dinner at night',
    obstacle: 'a GPS that speaks feet and mangles street names',
    hook: {event: 'she screams at the phone as it says five hundred feet', sound: 'real-phone-buzz'},
    act1: ['she misses the turn', 'the phone slides under the seat', 'it asks for a U-turn on a one-way street'],
    turn: 'a black beat, silence',
    reveal: {beat: 3, what: 'the phone rises into light with the navigator'},
    screens: [
      {screen: '23-home-104', step: 'open the app'},
      {screen: '17-nav-drive', step: 'the route in Georgian'},
      {screen: '17-nav-lanes', step: 'the lane strip'},
    ],
    payoff: 'ნინო arrives calm: „მოვედით."',
  };
  const beats = [
    {say: 'რა ფუტი, შე {bleep:ბოზო}?!', sfx: [{name: 'real-phone-buzz', at: 0.1}], scene: {type: 'Film', name: 'V131Nav'}},
    {say: 'ისევ გამოვტოვე.', scene: {type: 'Film', name: 'V131Nav'}},
    {say: 'ტელეფონი სავარძლის ქვეშ.', scene: {type: 'Film', name: 'V131NavHook'}},
    {say: 'ნავიგატორი ქართულად.', scene: {type: 'Phone', src: '23-home-104'}, cuts: [{chunk: 1, scene: {type: 'Phone', src: '17-nav-drive'}}]},
    {say: 'ზოლსაც გეტყვის.', scene: {type: 'Phone', src: '17-nav-lanes'}},
    {say: 'მოვედით.', scene: {type: 'EndCard', tagline: 'მოვედით.'}},
  ];
  const good = {id: 'v131-nav-feet', category: 'nav', treatment: tr, beats};
  ok(codes(good).length === 0, `a whole treatment the film keeps passes (${codes(good).join(', ') || 'none'})`);
  ok(codes({...good, treatment: undefined}).join() === 'TREATMENT', 'no treatment: TREATMENT');
  // phase 2: the pitches name the hero object, the signature graphic and the hook type, and the kept one carries them
  const P2 = `v${P2_FROM}-nav-feet`;
  ok(codes({...good, id: P2}).includes('PITCH_P2'), 'phase 2: pitches without hero object, graphic and hook type: PITCH_P2');
  const p2pitches = tr.pitches.map((p, i) => ({...p, heroObject: ['the phone in its holder', 'the lane strip', 'the offline map'][i], graphic: ['stat', 'bars', 'versus'][i], hookType: ['FreezeTag', 'KeywordLift', 'IrisDetail'][i]}));
  const p2tr = {...tr, pitches: p2pitches, heroObject: 'the phone in its holder', graphic: 'stat', hookType: 'FreezeTag'};
  ok(!codes({...good, id: P2, treatment: p2tr}).includes('PITCH_P2'), 'phase 2: a whole P2 treatment passes');
  ok(codes({...good, id: P2, treatment: {...p2tr, graphic: 'bars'}}).includes('PITCH_P2'), "phase 2: the kept treatment's graphic differs from its pitch: PITCH_P2");
  ok(!codes(good).includes('PITCH_P2'), 'an older film: no P2 pitch fields');
  ok(codes({...good, treatment: {...tr, pitches: tr.pitches.slice(0, 2)}}).includes('TREATMENT'), 'two pitches: TREATMENT');
  ok(codes({...good, treatment: {...tr, picked: 1}}).includes('TREATMENT'), 'keeping a weaker pitch: TREATMENT');
  ok(codes({...good, treatment: {...tr, pitches: tr.pitches.map((p) => ({...p, score: 6}))}}).includes('TREATMENT'), 'every pitch under 8: TREATMENT');
  ok(codes({...good, treatment: {...tr, act1: ['one', 'two']}}).includes('TREATMENT'), 'two escalations: TREATMENT');
  ok(codes({...good, treatment: {...tr, hook: {event: 'where did you park?', sound: 'real-door'}}}).includes('TREATMENT'), 'a question as the hook event: TREATMENT');
  ok(codes({...good, treatment: {...tr, hook: {...tr.hook, sound: 'no-such-sound'}}}).includes('TREATMENT'), 'a sound that is not in public/sfx: TREATMENT');
  ok(codes({...good, beats: [{...beats[0], sfx: [{name: 'real-phone-buzz', at: 2.6}]}, ...beats.slice(1)]}).includes('HOOK_SOUND'), 'the hook sound at 2.6 s: HOOK_SOUND');
  ok(codes({...good, treatment: {...tr, hook: {...tr.hook, sound: 'bleep'}}}).length === 0, 'a bleep in beat 0 is the hook sound');
  ok(codes({...good, beats: [{...beats[0], sfx: []}, ...beats.slice(1)]}, {filmCode: (n) => (n === 'V131Nav' ? "<Sfx name='real-phone-buzz' at={2} />" : '')}).length === 0, "beat 0's own Film playing it passes");
  const calm = {...good, beats: [{...beats[0], say: 'მანქანა სად დატოვე?'}, ...beats.slice(1)]};
  ok(codes(calm).includes('HOOK_CALM'), 'a calm narrator question in a feature film: HOOK_CALM');
  ok(!codes({...calm, beats: [{...calm.beats[0], say: '„სად დავტრიალდე, აქ?!"'}, ...beats.slice(1)]}).includes('HOOK_CALM'), 'a character yelling a question is an event');
  ok(!codes(calm, {kind: 'carinfo'}).includes('HOOK_CALM'), 'a car-knowledge tip may open on its question');
  ok(codes({...good, beats: [{...beats[0], scene: {type: 'Person'}}, ...beats.slice(1)]}).includes('HOOK_LIBRARY'), 'a library Person in the hook: HOOK_LIBRARY');
  ok(codes({...good, beats: [beats[0], {...beats[1], cuts: [{chunk: 1, scene: {type: 'Drive'}}]}, ...beats.slice(2)]}).length === 0, 'a Drive outside the hook and the reveal passes');
  ok(codes({...good, beats: [...beats.slice(0, 3), {...beats[3], scene: {type: 'Windshield'}}, ...beats.slice(4)]}).includes('REVEAL_LIBRARY'), 'a Windshield at the reveal: REVEAL_LIBRARY');
  ok(codes({...good, treatment: {...tr, screens: tr.screens.slice(0, 2)}}).includes('SCREEN_FLOW'), 'two screens in a feature film: SCREEN_FLOW');
  ok(!codes({...good, category: 'carinfo', treatment: {...tr, screens: []}}, {kind: 'carinfo'}).includes('SCREEN_FLOW'), 'car knowledge with no app: no screens needed');
  ok(codes({...good, treatment: {...tr, screens: [tr.screens[1], tr.screens[0], tr.screens[2]]}}).includes('SCREEN_FLOW'), 'screens in another order than the film: SCREEN_FLOW');
  ok(codes({...good, treatment: {...tr, screens: [...tr.screens, {screen: '21-obd-hub', step: 'the old hub'}]}}).includes('SCREEN_FLOW'), 'a retired capture: SCREEN_FLOW');
  ok(codes({...good, treatment: {...tr, screens: [...tr.screens, {screen: '22-obd-result', step: 'the code'}]}}).includes('SCREEN_FLOW'), 'a treatment screen the film never shows: SCREEN_FLOW');
  ok(screenOrder({beats: [{scene: {type: 'Phone', src: '13-diagnosis-108'}}, {scene: {type: 'Phone', src: 'carplay/f18-03-home-car'}}]}).join() === '13-diagnosis-108,f18-03-home-car', 'screenOrder: whole ids, CarPlay captures too (13-diagnosis-108 is not 13-diagnosis)');
  ok(treatmentOn('v131-x') && !treatmentOn('v130-airbag-gap') && treatmentOn('v140-y-r1'), 'treatmentOn: from v131');
  ok(kindOf({id: 'stories', bank: 'x'}) === 'stories' && kindOf({id: 'carinfo', bank: 'y'}) === 'carinfo' && kindOf({id: 'free', needsTopic: true}) === 'free' && kindOf({id: 'qr'}) === 'feature', 'kindOf');
  console.log(bad ? `treatment: ${bad} failed` : 'treatment: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const arg = process.argv[2];
  if (arg === '--test') process.exit(selfTest());
  if (!arg || !/^[a-z0-9-]+$/.test(arg)) {
    console.error('usage: node tools/ci/treatment.mjs <id> | --test');
    process.exit(2);
  }
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(path.join(root0, 'specs', `${arg}.json`), 'utf8'));
  } catch (e) {
    console.error(`treatment: specs/${arg}.json: ${e.message}`);
    process.exit(2);
  }
  let cats = [];
  try {
    cats = JSON.parse(fs.readFileSync(path.join(root0, 'ci/categories.json'), 'utf8')).categories ?? [];
  } catch {}
  const found = treatmentProblems(spec, {kind: kindOf(cats.find((c) => c.id === spec.category))});
  found.forEach((p) => console.log(p.line));
  if (!found.length) console.log(`treatment ${arg}: ok`);
  process.exit(found.some((p) => p.fatal) ? 1 : 0);
}
