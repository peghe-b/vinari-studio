// Phase 2's spec guards (src/lib/p2.mjs; plan step 10): what a P2 film's spec must and must not do, read before the voice is
// spent. check.mjs runs them (fatal in the cloud for a P2 film); the pixel guards on the frames are tools/ci/p2pixels.py.
//
//   p2Problems(spec, {timeline, prev, target, photos, filmCode})   one "CODE ..." line each, or []. timeline: the voice's (or
//                                        an estimate); prev: the specs of the 2 films before it (REPEAT_TEMPLATE); target: the
//                                        asked length in s (LENGTH); photos: the catalogue (OLD_CAR); filmCode(name): a Film
//                                        file's source or null (HUES)
//   node tools/ci/p2lint.mjs <id>        lint specs/<id>.json      node tools/ci/p2lint.mjs --test   the self-test
//
// Codes:
//   RETIRED          a retired scene (src/lib/retired.mjs): Drive, Windshield, Person, Pump, CarNight, the small Phone, the photo band
//   TEXT_WIDE        a headline, reveal, number label or cover title wider than 860 px at the smallest size its scene sets it
//   PLACEHOLDER      an empty value where a number or a word belongs (a row's value, a total, a stat)
//   CLUTTER          more than 3 hand marks in one shot
//   SCENE_REPEAT     the same scene type more than twice in one film (PICTURE_AGAIN's phase-2 half)
//   FILM_SHARE       the film's own Film scene draws more than 25 % of the shots
//   APP_TIME         an app film with less than 4 s of app (ScreenFocus, TapTrail, ScreenDeck)
//   HOOK_FRAME0      the first shot cannot read a claim at frame 0 (it is not a hook scene with its claim)
//   SHOT_LONG        a shot over 75 frames (a signature shot over 200)
//   KIT_MIN          fewer than 2 annotation or data parts in the film
//   TITLE_CARD       no FilmTitleCard, or more than one
//   KEYWORD_SUBS     a KeywordLift beat without "subs": "inPicture" (its words would show twice)
//   UNIT_SOURCE      a UnitGrid (or a grid title card) without whose figure it is
//   BARS_ZERO        a bar or a rank value below zero (bars start at zero)
//   TWIST_WORD       a Twist reveal over 7 Mtavruli letters a word
//   ONCE             TypeDive or ShapeMatch more than once
//   REPEAT_TEMPLATE  the hook type, the title card's kind or the hero object of either of the previous 2 films
//   HOOK_TYPE        the first shot is not the hook type the treatment picked (the prove run: the pitch promised a FreezeTag,
//                    the film opened on a dim KineticHeadline strip)
//   FILM_SHOTS       the film's own Film scene in more than 3 shots (the prove run: 8 hand-drawn diagram shots)
//   HUES             more than 2 data hues in the film (the accent, red, green: the prove run had all three, one frame too)
//   OLD_CAR          a photo of a car older than 2015 (public/photos/photos.json "era") outside a crazy story
//   LENGTH           the film under 80 % of the asked length (75 % on the estimate before the voice; not a free film)
//   LIFT_WORD        a KeywordLift lift word that the beat never SHOWS (the p3 prove run: lift „ოცდაათი" over the shown „30"
//                    lifted nothing, 2.5 s of bare paper with a small grey line)
//   PICTURE_AGAIN    one hero value („5W-30") the main picture of more than HERO_MAX shots whatever their scene types, or the
//                    same chart's data twice (the p3 run: „5W-30" in six shots, the same 5-vs-10 bars twice)
//   HOOK_SUBJECT     frame 0's claim is only a street word or a name-call („ჩერჩეტო,"): it must say what the film is about
//   SHAPE_MATCH      a ShapeMatch whose next shot does not open on its "to" shape (the p3 run: a coin into a bare black bar,
//                    then a quote card): a match cut that matches nothing is a primitive shape on paper
//   VOICE_HERO       a film told in the first person ("me") whose hero is a woman in a man's voice, or a man in a woman's (the
//                    one-narrator rule): match the voice, or tell it in the third person
//   (stories)        GRAPHIC_VARIETY fewer than 4 graphic types; PHOTO_SHARE photos over 40 % of the shots; MARK_MISSING a
//                    photo shot with no hand mark; GRAPHIC_THIN a photo held 2 s or more with no mark
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {P2_KIT_TEXT_W, p2On} from '../../src/lib/p2.mjs';
import {retiredScene} from '../../src/lib/retired.mjs';
import {fitLines, textW} from '../../src/lib/textfit.mjs';
import {estimateTimeline} from './fx.mjs';
import {vNumber} from './ending.mjs';
import {streetLoose} from './streetwords.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
export const TEXT_W = P2_KIT_TEXT_W; // 808: the kit's text width inside the drift's inset
export const APP_SCENES = new Set(['ScreenFocus', 'TapTrail', 'ScreenDeck']);
export const HOOK_SCENES = new Set(['FreezeTag', 'IrisDetail', 'KeywordLift', 'FilmTitleCard', 'ScreenFocus', 'Receipt', 'Twist', 'KineticHeadline', 'BigNumber', 'Film']);
/** the P2 annotation and data parts (steps 3 and 6) */
export const KIT_SCENES = new Set(['HeroObject', 'KeywordLift', 'Receipt', 'UnitGrid', 'ScaleReveal', 'RankShift', 'RouteTrace', 'WipeCompare', 'FilmTitleCard', 'ScreenFocus', 'TapTrail']);
/** the story kit (src/scenes: purpose-built story graphics) */
export const STORY_KIT = new Set(['WhoCard', 'QuoteCard', 'Versus', 'Standings', 'Ledger', 'DocCard', 'LapDelta', 'StoryMap']);
/** shots that are a photo (the story audit: photos at most 40 % of the shots, each one marked) */
const isPhotoShot = (sc) => ['Photo', 'PhotoStory'].includes(sc.type) || (['Split', 'Twist', 'FreezeTag', 'IrisDetail'].includes(sc.type) && Boolean(sc.src || sc.a?.src)) || ((sc.type === 'KineticHeadline' || sc.type === 'BigNumber') && Boolean(sc.bg?.src));
const SIGNATURE = new Set(['FilmTitleCard', 'TapTrail', 'Receipt', 'RankShift', 'Film', 'EndCard']);
/** the treatment's hook types (ci/prompt.md PITCH_P2) and the first shots that keep the promise; a `<Name>Hook` Film may
 *  draw the three that are not a scene type of their own */
export const HOOK_TYPES = Object.freeze({
  FreezeTag: ['FreezeTag'],
  IrisDetail: ['IrisDetail'],
  KeywordLift: ['KeywordLift'],
  FilmTitleCard: ['FilmTitleCard'],
  StruckNumber: ['BigNumber', 'FilmTitleCard', 'Receipt', 'FilmHook'],
  ResultFirst: ['ScreenFocus', 'FilmTitleCard', 'IrisDetail', 'FilmHook'],
  StakeCounter: ['BigNumber', 'FilmTitleCard', 'FilmHook'],
});
/** the most Film shots a P2 film may have (its signature moment, its hook, its reveal): the rest is the kit */
export const FILM_SHOTS_MAX = 3;
/** the oldest car a P2 photo may show outside a crazy story (the owner: modern cars only) */
export const CAR_ERA_MIN = 2015;
const LENGTH_MIN = 0.8;
const LENGTH_MIN_ESTIMATE = 0.75;
/** categories with no app in them (the owner, 2026-10-21): no APP_TIME */
const NO_APP = new Set(['stories', 'carinfo', 'humor', 'free']);

/** SHAPE_MATCH: the shots a ShapeMatch's "to" shape may cut into */
export const SHAPE_NEXT = Object.freeze({
  bar: ['Compare', 'RankShift', 'ScaleReveal', 'LapDelta', 'Standings', 'FilmTitleCard:bars', 'FilmTitleCard:versus'],
  phone: ['ScreenFocus', 'TapTrail', 'ScreenDeck', 'IrisDetail'],
  card: ['DocCard', 'QuoteCard', 'Receipt', 'WhoCard', 'Ledger', 'FilmTitleCard', 'Versus'],
  pill: ['Receipt', 'DocCard', 'FilmTitleCard', 'QuoteCard'],
  coin: ['BigNumber', 'UnitGrid', 'FilmTitleCard:stat', 'FilmTitleCard:grid'],
  dot: ['BigNumber', 'UnitGrid', 'RouteTrace', 'StoryMap', 'FilmTitleCard:stat', 'FilmTitleCard:grid'],
});
/** PICTURE_AGAIN: the most shots one hero value may be the main picture of */
export const HERO_MAX = 3;
/** the voices that are a woman's (Gemini's female voices; edge-tts Eka); every other named voice is a man's */
const FEMALE_VOICES = /^(gemini:)?(achernar|aoede|kore|leda|zephyr|callirrhoe|autonoe|despina|erinome|laomedeia|pulcherrima|sulafat|vindemiatrix|gacrux)$|eka/i;
const MALE_VOICES = /^(gemini:)?(algieba|charon|puck|fenrir|orus|enceladus|iapetus|umbriel|algenib|rasalgethi|alnilam|schedar|sadachbia|sadaltager|zubenelgenubi|achird)$|giorgi/i;
export const voiceSex = (voice) => (FEMALE_VOICES.test(String(voice ?? '')) ? 'f' : MALE_VOICES.test(String(voice ?? '')) ? 'm' : null);
/** the hero's sex: the Film's own "me" figure (role 'me', fem true|false), else the treatment's hero words */
export const heroSex = (spec, codes = []) => {
  for (const c of codes) {
    const m = /role:\s*['"]me['"][^}]*?\bfem:\s*(true|false)/.exec(String(c ?? ''));
    if (m) return m[1] === 'true' ? 'f' : 'm';
  }
  const t = `${spec?.treatment?.hero ?? ''}`;
  if (/\b(woman|girl|lady|she|her|mother|wife|daughter|sister)\b|ქალი|გოგო/i.test(t)) return 'f';
  if (/\b(man|guy|boy|he|his|father|husband|son|brother)\b|კაცი|ბიჭი/i.test(t)) return 'm';
  return null;
};
/** told in the first person: the treatment's hero is "me", or the voice says მე / ჩემი */
export const firstPerson = (spec) =>
  /^\s*(me|i)\b/i.test(String(spec?.treatment?.hero ?? '')) || (spec?.beats ?? []).some((b) => /(^|[\s„"(])(მე|ჩემ\p{L}*)(?=[\s.,!?:;"“)]|$)/u.test(String(b.say ?? '')));
const norm = (v) => String(v ?? '').toLowerCase().replace(/[\s„“"«».,!?:;()]+/g, '');
/** a shot's hero values: what it shows big (the word, the claim, the value, the lifted words, the card's values) */
export const heroValues = (sc) => {
  const out = new Set();
  const add = (v) => {
    const n = norm(v);
    if (n.length >= 2) out.add(n);
  };
  if (!sc || typeof sc !== 'object') return out;
  if (sc.type === 'BigNumber') add(`${sc.value ?? ''}${sc.unit ?? ''}`);
  else if (sc.type !== 'EndCard') {
    for (const k of ['word', 'claim', 'quote']) if (typeof sc[k] === 'string') add(sc[k]);
    if (sc.value !== undefined && (typeof sc.value === 'string' || typeof sc.value === 'number')) add(sc.value);
    if (Array.isArray(sc.lift)) add(sc.lift.join(' '));
    if (sc.type === 'ShapeMatch') add(sc.label);
    for (const r of [...(sc.fields ?? []), ...(sc.rows ?? []), ...(sc.total ? [sc.total] : [])]) if (r && (typeof r.value === 'string' || typeof r.value === 'number')) add(r.value);
  }
  return out;
};
/** a chart's data (Compare items, bars, rows with numbers): one string, or null */
const chartData = (sc) => {
  const list = Array.isArray(sc?.items) ? sc.items : Array.isArray(sc?.rows) ? sc.rows : null;
  if (!list || list.length < 2) return null;
  const vals = list.map((r) => `${norm(r?.label)}=${norm(r?.value ?? `${r?.a ?? ''}>${r?.b ?? ''}`)}`);
  return vals.every((v) => /=.+/.test(v)) ? vals.sort().join('|') : null;
};
const claimOf = (sc) => {
  if (!sc) return '';
  if (sc.type === 'KeywordLift') return (sc.lift ?? []).join(' ');
  if (sc.type === 'KineticHeadline') return (sc.lines ?? []).map((l) => (typeof l === 'string' ? l : l?.text ?? '')).join(' ');
  if (sc.type === 'BigNumber') return `${sc.value ?? ''}`;
  if (sc.type === 'FilmTitleCard') return `${sc.title ?? ''} ${sc.value ?? ''}`;
  return String(sc.claim ?? sc.word ?? '');
};

/** the shots: [{scene, beat, from, to}] in frames, from the timeline (a beat's scene runs until the next scene; cuts split it) */
export const shotsOf = (spec, timeline) => {
  const tl = timeline ?? estimateTimeline(spec);
  const out = [];
  (spec.beats ?? []).forEach((b, i) => {
    const tb = tl.beats[i];
    if (!tb) return;
    const start = Math.round(tb.start * FPS);
    if (b.scene) out.push({scene: b.scene, beat: i, from: start});
    for (const c of b.cuts ?? []) {
      const ch = tb.chunks?.[c.chunk];
      if (ch && c.scene) out.push({scene: c.scene, beat: i, from: Math.round(ch.start * FPS) - 2});
    }
  });
  const end = Math.round((tl.duration ?? tl.beats[tl.beats.length - 1]?.end ?? 0) * FPS);
  out.sort((a, b) => a.from - b.from);
  return out.map((s, k) => ({...s, to: k + 1 < out.length ? out[k + 1].from : end}));
};

const LETTERS = /\p{L}/gu;
const mtavLetters = (w) => (String(w).match(LETTERS) ?? []).length;

/** the text a scene sets, with the smallest size its scene fits it at and the lines it may take */
const textsOf = (sc) => {
  const t = [];
  const add = (text, min, lines = 1, weight = 700) => typeof text === 'string' && text.trim() && t.push({text, min, lines, weight});
  switch (sc.type) {
    case 'FilmTitleCard':
      add(sc.title, 72, 2);
      break;
    case 'FreezeTag':
      add(sc.claim, 110, 2);
      add(sc.tag, 56, 1);
      break;
    case 'IrisDetail':
      add(sc.claim, 100, 2);
      break;
    case 'KeywordLift':
      add((sc.lift ?? []).join(' '), 120, 2);
      break;
    case 'TypeDive':
      add(sc.word, 120, 1);
      break;
    case 'Twist':
      for (const r of sc.reveal ?? []) add(typeof r === 'string' ? r : r?.text, 120, 1);
      break;
    case 'KineticHeadline':
      for (const l of sc.lines ?? []) add(typeof l === 'string' ? l : l?.text, 72, 1);
      break;
    case 'BigNumber':
      add(sc.label, 44, 2, 600);
      break;
  }
  return t;
};
const marksOf = (sc) => (Array.isArray(sc.marks) ? sc.marks.length : 0) + (sc.mark ? 1 : 0);
const empty = (v) => v === undefined || v === null || (typeof v === 'string' && !v.trim());

/** every photo key a scene names (src, a.src, b.src, bg.src, more[].src, ...), as catalogue keys */
const photoKeys = (sc, out = []) => {
  if (!sc || typeof sc !== 'object') return out;
  for (const [k, v] of Object.entries(sc)) {
    if (k === 'src' && typeof v === 'string') out.push(v.replace(/^photos\//, '').replace(/\.(jpe?g|png|webp)$/i, ''));
    else if (v && typeof v === 'object') photoKeys(v, out);
  }
  return out;
};
/** the data hues a scene asks for in its props: "red", "green", "accent" */
const huesOf = (sc, out = new Set()) => {
  if (!sc || typeof sc !== 'object') return out;
  for (const [k, v] of Object.entries(sc)) {
    if (typeof v === 'string') {
      if ((k === 't' || k === 'tone') && /^(red|down)$/.test(v)) out.add('red');
      if ((k === 't' || k === 'tone') && /^(green|up)$/.test(v)) out.add('green');
      if ((k === 't' || k === 'tone') && v === 'accent') out.add('accent');
      if (k === 'kind' && v === 'strike') out.add('red');
      if (k === 'kind' && v === 'tick') out.add('green');
    } else if (v && typeof v === 'object') huesOf(v, out);
  }
  return out;
};
/** the data hues a Film file paints: tone('red'), C.downLine, ... */
const codeHues = (code) => {
  const out = new Set();
  if (!code) return out;
  if (/tone\(\s*['"]red['"]\s*\)|\bt=\{?["']red["']|C\.(down|downLine|red)\b/.test(code)) out.add('red');
  if (/tone\(\s*['"]green['"]\s*\)|\bt=\{?["']green["']|C\.(up|upLine|green)\b/.test(code)) out.add('green');
  if (/tone\(\s*['"]accent['"]\s*\)|dataAccent\(\)|\bt=\{?["']accent["']/.test(code)) out.add('accent');
  return out;
};
const loadPhotoCatalog = () => {
  try {
    return JSON.parse(fs.readFileSync(path.join(root, 'public', 'photos', 'photos.json'), 'utf8'));
  } catch {
    return {};
  }
};
const readFilm = (name) => {
  try {
    return /^[A-Z][A-Za-z0-9]*$/.test(String(name)) ? fs.readFileSync(path.join(root, 'src', 'scenes', 'film', `${name}.tsx`), 'utf8') : null;
  } catch {
    return null;
  }
};

export const p2Problems = (spec, {timeline = null, prev = [], target = null, photos = null, filmCode = readFilm} = {}) => {
  if (!p2On(vNumber(spec?.id))) return [];
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  let shots = [];
  try {
    shots = shotsOf(spec, timeline);
  } catch {
    shots = beats.filter((b) => b.scene).map((b, i) => ({scene: b.scene, beat: i, from: 0, to: 60}));
  }
  const scenes = shots.map((s) => s.scene);
  // RETIRED
  shots.forEach((s) => {
    const why = retiredScene(s.scene);
    if (why) out.push(`RETIRED beats[${s.beat}] ${s.scene.type}: ${why}`);
  });
  // TEXT_WIDE
  for (const s of shots)
    for (const x of textsOf(s.scene)) {
      const f = fitLines(x.text, TEXT_W, x.lines, x.min, {weight: x.weight, mtav: true, min: x.min});
      if (!f.fits) out.push(`TEXT_WIDE beats[${s.beat}] ${s.scene.type} "${x.text}" does not fit ${TEXT_W} px in ${x.lines} line${x.lines > 1 ? 's' : ''} even at ${x.min} px (${Math.round(Math.max(...f.lines.map((l) => textW(l, x.min, {mtav: true, weight: x.weight}))))} px): say it in fewer letters`);
    }
  if (spec?.cover?.title) {
    const lines = String(spec.cover.title).split('|');
    for (const l of lines) if (textW(l.trim(), 96, {mtav: true, weight: 700}) > TEXT_W * 1.5) out.push(`TEXT_WIDE cover.title line "${l.trim()}" is too long for the cover's two lines`);
  }
  // PLACEHOLDER, BARS_ZERO, UNIT_SOURCE, CLUTTER, TWIST_WORD
  for (const s of shots) {
    const sc = s.scene;
    const where = `beats[${s.beat}] ${sc.type}`;
    // MONEY_CAST (the r3 verify, 2026-10-27): Money's "cast" draws the illo Figure with a laughing face, a drawn face that
    // phase 2 retired (src/lib/retired.mjs WHY_PEOPLE); the render leaves it out in P2, the spec says so first
    if (sc.type === 'Money' && sc.cast) out.push(`MONEY_CAST ${where} "cast": "${sc.cast}" draws a person with a face: drawn faces are retired from phase 2: drop "cast" (the money is the picture), a person who must be seen is a sil.tsx silhouette in a Film`);
    for (const r of sc.rows ?? []) {
      if (sc.type === 'RankShift') {
        if (![r.a, r.b].every(Number.isFinite)) out.push(`PLACEHOLDER ${where} a row without both values (a, b)`);
        else if (r.a < 0 || r.b < 0) out.push(`BARS_ZERO ${where} "${r.label}" below zero: bars start at zero`);
      } else if (empty(r?.value)) out.push(`PLACEHOLDER ${where} row "${r?.label ?? '?'}" has no value: a grey bar where a value belongs never ships`);
      else if (typeof r.value === 'number' && r.value < 0) out.push(`BARS_ZERO ${where} "${r.label}" below zero: bars start at zero`);
    }
    if (sc.total && empty(sc.total.value)) out.push(`PLACEHOLDER ${where} the total has no value`);
    if (sc.type === 'FilmTitleCard' && (sc.kind === 'stat' || sc.kind === 'grid') && empty(sc.value)) out.push(`PLACEHOLDER ${where} a ${sc.kind} card without its value`);
    if ((sc.type === 'UnitGrid' || (sc.type === 'FilmTitleCard' && sc.kind === 'grid')) && empty(sc.source)) out.push(`UNIT_SOURCE ${where}: "N of 100" needs "source" (whose figure it is)`);
    if (marksOf(sc) > 3) out.push(`CLUTTER ${where}: ${marksOf(sc)} marks in one shot (3 at most)`);
    if (sc.type === 'Twist')
      for (const r of sc.reveal ?? []) {
        const w = String(typeof r === 'string' ? r : r?.text ?? '');
        if (w.split(/\s+/).some((x) => mtavLetters(x) > 7)) out.push(`TWIST_WORD ${where} "${w}": a reveal word is 7 Mtavruli letters at most`);
      }
  }
  // LIFT_WORD: a KeywordLift lifts the words it SHOWS (the p3 prove run: „ოცდაათი" said, „30" shown: nothing lifted)
  beats.forEach((b, i) => {
    for (const sc of [b.scene, ...(b.cuts ?? []).map((c) => c?.scene)]) {
      if (sc?.type !== 'KeywordLift') continue;
      const shown = new Set(String(b.show ?? b.say ?? '').split(/[\s|]+/).map(norm).filter(Boolean));
      for (const w of sc.lift ?? []) if (!shown.has(norm(w))) out.push(`LIFT_WORD beats[${i}] KeywordLift lifts "${w}", a word the beat never shows ("show": the line on screen): lift a word exactly as shown (a number as its digits), or the shot stays bare paper with a small grey line`);
    }
  });
  // PICTURE_AGAIN across scene types: one hero value in more than HERO_MAX shots; the same chart's data twice
  {
    const seen = new Map();
    const charts = new Map();
    for (const s of shots) {
      for (const v of heroValues(s.scene)) seen.set(v, [...(seen.get(v) ?? []), s]);
      const d = chartData(s.scene);
      if (d) charts.set(d, [...(charts.get(d) ?? []), s]);
    }
    for (const [v, list] of seen) if (list.length > HERO_MAX) out.push(`PICTURE_AGAIN "${v}" is the main picture of ${list.length} shots (${list.map((x) => `beats[${x.beat}] ${x.scene.type}`).join(', ')}; ${HERO_MAX} at most, whatever the scene type): each shot a NEW picture of the idea (the cause, the place, the consequence, the proof), never the same value again in another frame`);
    for (const list of charts.values()) if (list.length > 1) out.push(`PICTURE_AGAIN the same chart data twice (${list.map((x) => `beats[${x.beat}] ${x.scene.type}`).join(', ')}): show it once, then something new`);
  }
  // SHAPE_MATCH: the shape lands on the next shot's object
  shots.forEach((s, k) => {
    if (s.scene.type !== 'ShapeMatch') return;
    const next = shots[k + 1]?.scene;
    const fits = SHAPE_NEXT[s.scene.to] ?? null;
    const kind = next?.type === 'FilmTitleCard' ? `FilmTitleCard:${next.kind ?? ''}` : next?.type;
    if (fits && !(next && (fits.includes(next.type) || fits.includes(kind)))) out.push(`SHAPE_MATCH beats[${s.beat}] ShapeMatch ends as a ${s.scene.to} but the next shot is ${next?.type ?? 'nothing'}: the next shot opens on that shape (${fits.join(', ')}), or cut the ShapeMatch`);
  });
  // HOOK_SUBJECT: frame 0 names the subject, never only a name-call
  {
    const first0 = shots[0]?.scene;
    const claim = claimOf(first0);
    const words = (claim.match(/[\p{L}\p{N}]+/gu) ?? []).filter((w) => w.length >= 2 || /\d/.test(w));
    const street = new Set(streetLoose(claim).map((x) => x.form));
    if (first0 && words.length && !/\d/.test(claim) && words.every((w) => street.has(w))) out.push(`HOOK_SUBJECT frame 0 says only "${claim}" (a street word): the hook's claim says what the film is about (the thing, the number, the stake), the name-call goes in the voice or after it`);
  }
  // VOICE_HERO: one narrator, the hero's own voice when the film says "me"
  {
    const v = voiceSex(spec?.voice);
    const codesF = shots.filter((s) => s.scene.type === 'Film').map((s) => filmCode(s.scene.name));
    const h = heroSex(spec, codesF);
    if (v && h && v !== h && firstPerson(spec)) out.push(`VOICE_HERO the film says "me" and its hero is a ${h === 'f' ? 'woman' : 'man'}, in a ${v === 'f' ? "woman's" : "man's"} voice (${spec.voice}): one narrator is the hero's own voice: make the hero a ${v === 'f' ? 'woman' : 'man'}, or tell the story in the third person`);
  }
  // KEYWORD_SUBS
  beats.forEach((b, i) => {
    if (b.scene?.type === 'KeywordLift' && b.subs !== 'inPicture') out.push(`KEYWORD_SUBS beats[${i}] KeywordLift draws the spoken line itself: the beat says "subs": "inPicture" (else its words show twice)`);
  });
  // SCENE_REPEAT, FILM_SHARE, ONCE
  const count = new Map();
  for (const sc of scenes) if (sc.type !== 'EndCard') count.set(sc.type, (count.get(sc.type) ?? 0) + 1);
  for (const [t, n] of count) if (n > 2 && t !== 'Film') out.push(`SCENE_REPEAT ${t} ${n} times: the same scene type twice a film at most (a new picture every shot)`);
  const nonEnd = scenes.filter((s) => s.type !== 'EndCard').length;
  const films = count.get('Film') ?? 0;
  if (nonEnd >= 4 && films / nonEnd > 0.25) out.push(`FILM_SHARE the film's own Film scene draws ${films} of ${nonEnd} shots (25 % at most): compose the P2 kit for the rest`);
  for (const t of ['TypeDive', 'ShapeMatch']) if ((count.get(t) ?? 0) > 1) out.push(`ONCE ${t} ${count.get(t)} times: once a film at most`);
  // TITLE_CARD, KIT_MIN
  const cards = count.get('FilmTitleCard') ?? 0;
  if (cards !== 1) out.push(`TITLE_CARD ${cards} FilmTitleCard: exactly one, the film's signature infographic (the cover is the same card)`);
  const kit = scenes.filter((s) => KIT_SCENES.has(s.type) || STORY_KIT.has(s.type) || marksOf(s) > 0).length;
  if (kit < 2) out.push(`KIT_MIN ${kit} annotation or data part${kit === 1 ? '' : 's'}: at least 2 (Ink marks, Callout, Receipt, UnitGrid, RankShift, ScaleReveal, RouteTrace, WipeCompare, KeywordLift, the title card)`);
  // HOOK_FRAME0
  const first = shots[0]?.scene;
  if (first && !HOOK_SCENES.has(first.type)) out.push(`HOOK_FRAME0 the film opens on ${first.type}: open on a hook with its claim readable at frame 0 (FreezeTag, IrisDetail, KeywordLift, FilmTitleCard, a struck number, the result first)`);
  // HOOK_TYPE: the first shot keeps the treatment's promise
  const hookType = spec?.treatment?.hookType;
  if (first && typeof hookType === 'string' && HOOK_TYPES[hookType]) {
    const okTypes = HOOK_TYPES[hookType];
    const kind = first.type === 'Film' && /Hook$/.test(String(first.name ?? '')) ? 'FilmHook' : first.type;
    if (!okTypes.includes(kind)) out.push(`HOOK_TYPE the treatment's hook is ${hookType} but the film opens on ${first.type}${first.type === 'Film' ? ` "${first.name ?? ''}"` : ''}: open on ${okTypes.map((t) => (t === 'FilmHook' ? 'your <Name>Hook Film' : t)).join(' or ')}, the claim readable at frame 0 (or pick another treatment)`);
  }
  // FILM_SHOTS: the film's own drawing is its signature moment, never the whole film (the prove run: 8 diagram shots)
  const filmShots = shots.filter((s) => s.scene.type === 'Film').length;
  if (filmShots > FILM_SHOTS_MAX) out.push(`FILM_SHOTS the film's own Film scene draws ${filmShots} shots (${FILM_SHOTS_MAX} at most: the hook, the signature moment, the reveal): explain the rest with real photos and Ink marks, the data kit and the app's screens, never hand-drawn diagrams`);
  // HUES: two data hues a film at most (and one a frame: the pixel guard HUE_TWO)
  {
    const hues = new Set();
    if (typeof spec?.dataAccent === 'string' && spec.dataAccent) hues.add('accent');
    for (const s of shots) {
      if (APP_SCENES.has(s.scene.type) || s.scene.type === 'EndCard') continue;
      for (const h of huesOf(s.scene)) hues.add(h);
      if (s.scene.type === 'Film') for (const h of codeHues(filmCode(s.scene.name))) hues.add(h);
    }
    if (hues.size > 2) out.push(`HUES the film paints ${[...hues].join(', ')}: two data hues a film at most (paper and ink, colour on data only): drop the ${hues.has('green') ? 'green ticks' : 'red'} or the accent`);
  }
  // OLD_CAR: modern cars only (a crazy story shows its own era)
  if (spec.category !== 'stories') {
    const cat = photos ?? loadPhotoCatalog();
    const seen = new Set();
    for (const s of shots)
      for (const k of photoKeys(s.scene)) {
        const era = Number(cat?.[k]?.era);
        if (Number.isFinite(era) && era < CAR_ERA_MIN && !seen.has(k)) {
          seen.add(k);
          out.push(`OLD_CAR beats[${s.beat}] ${s.scene.type} shows "${k}" (a car of about ${era}): every car is a refined car of 2015 or later; pick another photo`);
        }
      }
  }
  // LENGTH: the asked length (the prove run: a story asked 45 s came out 25 s)
  if (Number.isFinite(Number(target)) && Number(target) > 0 && spec.category !== 'free') {
    let tl = timeline;
    try {
      tl = tl ?? estimateTimeline(spec);
    } catch {}
    const dur = Number(tl?.duration);
    const est = !timeline;
    const min = (est ? LENGTH_MIN_ESTIMATE : LENGTH_MIN) * Number(target);
    if (Number.isFinite(dur) && dur < min) out.push(`LENGTH the film is ${dur.toFixed(1)} s${est ? ' (estimated before the voice)' : ''}, the request asked ${target} s (${Math.round(min)} s at least): add beats that SHOW more of the idea (a graphic, a mark, a number landing), never slower words`);
  }
  // APP_TIME
  if (!NO_APP.has(spec.category)) {
    const app = shots.filter((s) => APP_SCENES.has(s.scene.type)).reduce((t, s) => t + (s.to - s.from), 0) / FPS;
    if (app < 4) out.push(`APP_TIME ${app.toFixed(1)} s of app in an app film (4 s at least: ScreenFocus, TapTrail, ScreenDeck)`);
  }
  // SHOT_LONG
  for (const s of shots) {
    const d = s.to - s.from;
    const max = SIGNATURE.has(s.scene.type) ? 200 : 75;
    if (d > max) out.push(`SHOT_LONG beats[${s.beat}] ${s.scene.type} holds ${d} frames (${max} at most): cut it, or split the sentence with "cuts"`);
  }
  // the stories (the owner, 2026-10-26: the same photo ten times, the talk without graphics)
  if (spec.category === 'stories') {
    const body = shots.filter((s) => s.scene.type !== 'EndCard');
    const graphics = new Set(body.filter((s) => !isPhotoShot(s.scene)).map((s) => s.scene.type));
    if (graphics.size < 4) out.push(`GRAPHIC_VARIETY ${graphics.size} graphic type${graphics.size === 1 ? '' : 's'} (${[...graphics].join(', ') || 'none'}): at least 4 of the story kit (WhoCard, QuoteCard, Versus, Standings, Ledger, DocCard, LapDelta, StoryMap) and the data kit`);
    const photos = body.filter((s) => isPhotoShot(s.scene));
    if (body.length && photos.length / body.length > 0.4) out.push(`PHOTO_SHARE ${photos.length} of ${body.length} shots are photos (40 % at most): the rest are purpose-built graphics`);
    for (const s of photos) {
      if (marksOf(s.scene) === 0) out.push(`MARK_MISSING beats[${s.beat}] ${s.scene.type}: a photo shot carries a hand mark ("marks": [{"kind", "box", "at"}]) on what the line is about`);
      if (marksOf(s.scene) === 0 && s.to - s.from >= 60) out.push(`GRAPHIC_THIN beats[${s.beat}] ${s.scene.type} holds an unmarked photo ${((s.to - s.from) / FPS).toFixed(1)} s: mark it, or cut to a graphic`);
    }
  }
  // REPEAT_TEMPLATE
  const sig = (sp) => {
    const sc = (sp?.beats ?? []).map((b) => b.scene).filter(Boolean);
    return {hook: sc[0]?.type ?? null, card: sc.find((x) => x.type === 'FilmTitleCard')?.kind ?? null, hero: String(sp?.treatment?.heroObject ?? sp?.treatment?.hero ?? '').trim().toLowerCase() || null};
  };
  const me = sig(spec);
  for (const p of prev.slice(0, 2)) {
    const o = sig(p);
    if (me.hook && me.hook === o.hook) out.push(`REPEAT_TEMPLATE the film opens on ${me.hook} like ${p.id}: a different hook type than the last 2 films`);
    if (me.card && me.card === o.card) out.push(`REPEAT_TEMPLATE the title card is a "${me.card}" like ${p.id}'s: a different signature graphic than the last 2 films`);
    if (me.hero && me.hero === o.hero) out.push(`REPEAT_TEMPLATE the hero object "${me.hero}" is ${p.id}'s: a new hero`);
  }
  return out;
};

/** the specs of the 2 films before film `id` (by number, the base films only) */
export const prevSpecs = (id, specsDir = path.join(root, 'specs')) => {
  const n = vNumber(id);
  let files = [];
  try {
    files = fs.readdirSync(specsDir).filter((f) => /^v\d+-[a-z0-9-]+\.json$/.test(f) && !/-r\d+\.json$/.test(f) && !/-(en|ru)\.json$/.test(f));
  } catch {}
  return files
    .map((f) => ({f, n: vNumber(f)}))
    .filter((x) => x.n < n && x.n > 0)
    .sort((a, b) => b.n - a.n)
    .slice(0, 2)
    .map((x) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(specsDir, x.f), 'utf8'));
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

const selfTest = async () => {
  const {P2_FROM} = await import('../../src/lib/p2.mjs');
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const id = `v${P2_FROM}-test`;
  const end = {say: 'შეგიძლია ერთი კვირა უფასოდაც სცადო.', scene: {type: 'EndCard', tagline: 'შეგიძლია ერთი კვირა უფასოდაც სცადო.'}, hold: 0.4};
  const good = {
    id,
    category: 'obd',
    beats: [
      {say: 'ექვსი ათასი კილომეტრი.', scene: {type: 'FilmTitleCard', title: 'ერთი ბარათი', kind: 'stat', value: '6000', unit: 'კმ'}},
      {say: 'აი, | რას გეუბნება.', scene: {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 400, h: 500}}},
      {say: 'სამ შეხებაში | გახსნი, | დაიწყებ | და წაიკითხავ.', scene: {type: 'TapTrail', steps: [{screen: '23-home-104', tap: {x: 540, y: 1500}, verb: 'გახსენი'}, {screen: '22-obd-result', tap: {x: 540, y: 1400}, verb: 'წაიკითხე'}]}},
      {say: 'ხელოსანი, | ნაწილი.', scene: {type: 'Receipt', rows: [{label: 'ხელოსანი', value: '80 ₾'}], total: {label: 'სულ', value: '80 ₾'}}},
      end,
    ],
  };
  const codes = (sp, o) => p2Problems(sp, o).map((l) => l.split(' ')[0]);
  ok(codes(good).length === 0, `a P2 film built from the kit passes (${p2Problems(good).join(' / ')})`);
  ok(p2Problems({...good, id: `v${P2_FROM - 1}-old`}).length === 0, 'an older film: no P2 rule');
  const swap = (i, sc, extra = {}) => ({...good, beats: good.beats.map((b, k) => (k === i ? {...b, scene: sc, ...extra} : b))});
  ok(codes(swap(1, {type: 'Drive'})).includes('RETIRED'), 'a Drive scene: RETIRED');
  ok(codes(swap(0, {type: 'FilmTitleCard', title: 'გამარჯვებულიგამარჯვებულიგამარჯვებულიგამარჯვებული', kind: 'stat', value: '1'})).includes('TEXT_WIDE'), 'an endless title: TEXT_WIDE');
  ok(codes(swap(3, {type: 'Receipt', rows: [{label: 'ა', value: ''}], total: {label: 'ბ', value: '1'}})).includes('PLACEHOLDER'), 'an empty value: PLACEHOLDER');
  ok(codes(swap(3, {type: 'UnitGrid', n: 30, label: 'ა'})).includes('UNIT_SOURCE'), 'a UnitGrid without a source: UNIT_SOURCE');
  ok(codes(swap(3, {type: 'RankShift', rows: [{label: 'ა', a: -3, b: 4}]})).includes('BARS_ZERO'), 'a bar below zero: BARS_ZERO');
  ok(codes(swap(0, {type: 'Stat', value: 3})).includes('HOOK_FRAME0'), 'a film opening on a calm Stat: HOOK_FRAME0');
  ok(codes(swap(2, {type: 'Receipt', rows: [{label: 'ა', value: '1'}], total: {label: 'ბ', value: '1'}})).includes('APP_TIME'), 'an app film with one short app shot: APP_TIME');
  ok(!codes({...swap(2, {type: 'Receipt', rows: [{label: 'ა', value: '1'}], total: {label: 'ბ', value: '1'}}), category: 'stories'}).includes('APP_TIME'), 'a story has no APP_TIME');
  ok(codes(swap(0, {type: 'KeywordLift', lift: ['ექვსი']})).includes('KEYWORD_SUBS'), 'KeywordLift without subs inPicture: KEYWORD_SUBS');
  ok(!codes(swap(0, {type: 'KeywordLift', lift: ['ექვსი']}, {subs: 'inPicture'})).includes('KEYWORD_SUBS'), 'KeywordLift with subs inPicture passes');
  ok(codes(swap(0, {type: 'Twist', reveal: ['გამარჯვებული']})).includes('TWIST_WORD'), 'a 12-letter Twist word: TWIST_WORD');
  ok(codes(swap(3, {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 1, h: 1}, marks: [1, 2, 3, 4]})).includes('CLUTTER'), 'four marks in a shot: CLUTTER');
  const noCard = swap(0, {type: 'FreezeTag', claim: 'ორასი ლარი', src: 'dash-warning-lights', tag: 'ეს მე'});
  ok(codes(noCard).includes('TITLE_CARD'), 'no title card: TITLE_CARD');
  const long = {...good, beats: [...good.beats.slice(0, 4), {say: 'ა '.repeat(60), scene: {type: 'UnitGrid', n: 3, label: 'ა', source: 'ბ'}}, end]};
  ok(codes(long).includes('SHOT_LONG'), 'a 4 s UnitGrid: SHOT_LONG');
  const prev = [{id: 'v1-a', beats: [{scene: {type: 'FilmTitleCard', kind: 'stat'}}]}];
  ok(codes(good, {prev}).filter((c) => c === 'REPEAT_TEMPLATE').length === 2, 'the same hook type and card kind as the film before: REPEAT_TEMPLATE');
  const three = {...good, beats: [good.beats[0], ...[1, 2, 3].map(() => ({say: 'ა ბ.', scene: {type: 'ScreenFocus', screen: '22-obd-result', row: {y: 1, h: 1}}})), end]};
  ok(codes(three).includes('SCENE_REPEAT'), 'ScreenFocus three times: SCENE_REPEAT');
  const story = {
    id,
    category: 'stories',
    beats: [
      {say: 'ა ბ.', scene: {type: 'FilmTitleCard', title: 'სამი წუთი', kind: 'versus', rows: [{label: 'ა', value: '1'}, {label: 'ბ', value: '2'}]}},
      {say: 'ა ბ.', scene: {type: 'PhotoStory', src: 'story-lauda-1976', staging: 'bleed', marks: [{kind: 'circle', box: {x: 300, y: 600, w: 200, h: 120}}]}},
      {say: 'ა ბ.', scene: {type: 'WhoCard', src: 'story-lauda-1976', name: 'ლაუდა', role: 'მრბოლელი'}},
      {say: 'ა ბ.', scene: {type: 'Ledger', entries: [{year: '1976', text: 'ა'}]}},
      {say: 'ა ბ.', scene: {type: 'LapDelta', a: {label: 'ა', value: 1, shown: '1'}, b: {label: 'ბ', value: 2, shown: '2'}, gap: '1'}},
      {say: 'ა ბ.', scene: {type: 'EndCard', tagline: 'ა ბ.'}},
    ],
  };
  ok(!codes(story).some((c) => ['GRAPHIC_VARIETY', 'PHOTO_SHARE', 'MARK_MISSING'].includes(c)), `a story of graphics and one marked photo passes (${codes(story).join(', ')})`);
  const photoStory = {...story, beats: [story.beats[0], ...[1, 2, 3, 4].map(() => ({say: 'ა ბ.', scene: {type: 'PhotoStory', src: 'story-lauda-1976', staging: 'bleed'}})), story.beats[5]]};
  const pc = codes(photoStory);
  ok(pc.includes('GRAPHIC_VARIETY') && pc.includes('PHOTO_SHARE') && pc.includes('MARK_MISSING'), 'a slideshow of unmarked photos: GRAPHIC_VARIETY, PHOTO_SHARE, MARK_MISSING');
  // the prove run's codes (2026-10-26)
  const hooked = {...good, treatment: {hookType: 'FreezeTag'}};
  ok(codes(hooked).includes('HOOK_TYPE'), 'a FreezeTag treatment opening on a FilmTitleCard: HOOK_TYPE');
  ok(!codes({...good, treatment: {hookType: 'FilmTitleCard'}}).includes('HOOK_TYPE'), 'the promised hook type passes');
  ok(!codes({...swap(0, {type: 'Film', name: 'V1XHook'}), treatment: {hookType: 'StakeCounter'}}).includes('HOOK_TYPE'), 'a <Name>Hook Film may draw a StakeCounter');
  const filmy = {...good, beats: [good.beats[0], ...[1, 2, 3, 4].map((k) => ({say: 'ა ბ.', scene: {type: 'Film', name: 'V1X', shot: String(k)}})), ...good.beats.slice(1)]};
  ok(codes(filmy).includes('FILM_SHOTS'), 'four Film shots: FILM_SHOTS');
  const hues = {...swap(3, {type: 'Receipt', rows: [{label: 'ა', value: '1', t: 'red'}], total: {label: 'ბ', value: '1'}, marks: [{kind: 'tick', box: {x: 1, y: 1, w: 1, h: 1}}]}), dataAccent: 'amber'};
  ok(codes(hues).includes('HUES'), 'the accent, a red row and a green tick: HUES');
  ok(!codes({...hues, dataAccent: undefined}).includes('HUES'), 'red and green without an accent: two hues pass');
  ok(codes(good, {filmCode: () => null}).every((c) => c !== 'HUES'), 'no hue: no HUES');
  ok(codes(swap(3, {type: 'FreezeTag', claim: 'ა', src: 'volga-parked-portrait', tag: 'ბ'}), {photos: {'volga-parked-portrait': {era: 1980}}}).includes('OLD_CAR'), 'the old Volga photo: OLD_CAR');
  ok(!codes({...swap(3, {type: 'PhotoStory', src: 'volga-parked-portrait', staging: 'bleed'}), category: 'stories'}, {photos: {'volga-parked-portrait': {era: 1980}}}).includes('OLD_CAR'), 'a story shows its own era');
  ok(codes(good, {target: 45}).includes('LENGTH'), 'a 5 s film asked 45 s: LENGTH');
  ok(!codes({...good, category: 'free'}, {target: 45}).includes('LENGTH'), 'a free film: his words decide the length');
  // the p3 prove run's codes (2026-10-27)
  const lift = swap(0, {type: 'KeywordLift', lift: ['ოცდაათი']}, {subs: 'inPicture', show: '30 კი თბილი ძრავისაა.', say: 'ოცდაათი კი თბილი ძრავისაა.'});
  ok(codes(lift).includes('LIFT_WORD'), 'lift „ოცდაათი" over the shown „30": LIFT_WORD');
  ok(!codes(swap(0, {type: 'KeywordLift', lift: ['30']}, {subs: 'inPicture', show: '30 კი თბილი ძრავისაა.', say: 'ოცდაათი კი თბილი ძრავისაა.'})).includes('LIFT_WORD'), 'lift „30" as shown passes');
  const oil = {...good, beats: [good.beats[0], ...['TypeDive', 'DocCard', 'ShapeMatch', 'Receipt'].map((t) => ({say: 'ა ბ.', scene: t === 'TypeDive' ? {type: t, word: '5W-30'} : t === 'DocCard' ? {type: t, title: 'ა', fields: [{label: 'ბ', value: '5W-30'}]} : t === 'ShapeMatch' ? {type: t, from: 'coin', to: 'bar', label: '5W-30'} : {type: t, rows: [{label: 'ა', value: '10W-30'}], total: {label: 'ბ', value: '5W-30'}}})), ...good.beats.slice(1)]};
  ok(codes(oil).includes('PICTURE_AGAIN'), '„5W-30" the main picture of four shots of four types: PICTURE_AGAIN');
  const bars = {type: 'Compare', items: [{label: '5W', value: 5}, {label: '10W', value: 10}]};
  ok(codes({...good, beats: [good.beats[0], {say: 'ა.', scene: bars}, ...good.beats.slice(1, 4), {say: 'ბ.', scene: {...bars, title: 'ბიძის ბოთლი'}}, end]}).includes('PICTURE_AGAIN'), 'the same 5-vs-10 bars twice: PICTURE_AGAIN');
  ok(!codes(good).includes('PICTURE_AGAIN'), 'a film of new pictures passes');
  ok(codes(swap(1, {type: 'Money', value: 5, cast: 'me'})).includes('MONEY_CAST') && !codes(swap(1, {type: 'Money', value: 5})).includes('MONEY_CAST'), 'a P2 Money with "cast" (a drawn laughing face): MONEY_CAST; without it none');
  ok(codes(swap(0, {type: 'KeywordLift', lift: ['ჩერჩეტო']}, {subs: 'inPicture', say: 'ბიძა: ჩერჩეტო,', show: 'ბიძა: ჩერჩეტო,'})).includes('HOOK_SUBJECT'), 'frame 0 only „ჩერჩეტო,": HOOK_SUBJECT');
  ok(!codes(swap(0, {type: 'FreezeTag', claim: '04:50', src: 'x', tag: 'y'})).includes('HOOK_SUBJECT'), 'frame 0 „04:50" passes');
  const me = {...good, voice: 'gemini:Algieba', treatment: {hero: 'Me, a made-up young woman in a ski puffer with a high ponytail'}, beats: [{...good.beats[0], say: 'ახლა ციფრებს მე გავარჩევ.'}, ...good.beats.slice(1)]};
  ok(codes(me).includes('VOICE_HERO'), 'a woman as "me" in Algieba\'s voice: VOICE_HERO');
  ok(!codes({...me, voice: 'gemini:Achernar'}).includes('VOICE_HERO'), 'the same woman in Achernar\'s voice passes');
  ok(!codes({...me, treatment: {hero: 'A young woman in a ski puffer'}, beats: good.beats}).includes('VOICE_HERO'), 'told in the third person passes');
  ok(heroSex({}, ["const ME = {role: 'me', fem: true, age: 0}"]) === 'f' && heroSex({}, ["const ME = {role: 'me', fem: false}"]) === 'm', 'the hero read from the Film\'s "me" figure');
  const shape = (next) => ({...good, beats: [good.beats[0], {say: 'ა ბ.', scene: {type: 'ShapeMatch', from: 'coin', to: 'bar', label: '5W-30'}}, {say: 'გ დ.', scene: next}, ...good.beats.slice(1)]});
  ok(codes(shape({type: 'QuoteCard', quote: 'სქელი ჯობია', who: 'ა'})).includes('SHAPE_MATCH'), 'a coin into a bar, then a quote card: SHAPE_MATCH');
  ok(!codes(shape({type: 'Compare', items: [{label: 'ა', value: 1}, {label: 'ბ', value: 2}]})).includes('SHAPE_MATCH'), 'a coin into a bar, then the bars: passes');
  // the fixtures in ci/fixtures/p2/: each names the codes it must raise
  const dir = path.join(root, 'ci', 'fixtures', 'p2');
  for (const f of fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => x.endsWith('.json')) : []) {
    const fx = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const films = fx.films ?? {};
    const got = new Set(codes({...fx.spec, id: fx.spec.id.replace(/^v\d+/, `v${P2_FROM}`)}, {prev: fx.prev ?? [], target: fx.target ?? null, filmCode: (n) => films[n] ?? null}));
    const want = new Set(fx.expect ?? []);
    const same = [...want].every((c) => got.has(c)) && (want.size || got.size === 0) && (fx.only === false || [...got].every((c) => want.has(c)));
    ok(same, `fixture ${f}: expects [${[...want].join(', ')}], got [${[...got].join(', ')}]`);
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(await selfTest());
  const id = process.argv[2];
  if (id) {
    const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
    let timeline = null;
    try {
      timeline = JSON.parse(fs.readFileSync(path.join(root, 'public', 'vo', id, 'timeline.json'), 'utf8'));
    } catch {}
    let target = Number(process.env.STUDIO_LENGTH) || null;
    try {
      target = JSON.parse(fs.readFileSync(path.join(root, 'out', 'ci', 'request.json'), 'utf8')).length ?? target;
    } catch {}
    const found = p2Problems(spec, {timeline, prev: prevSpecs(id), target});
    found.forEach((l) => console.log(l));
    console.log(found.length ? `${id}: ${found.length} P2 problem${found.length === 1 ? '' : 's'}` : `${id}: P2 clean`);
    process.exit(found.length ? 1 : 0);
  }
}
