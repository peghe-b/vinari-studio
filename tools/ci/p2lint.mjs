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
//   APP_TIME         an app film with less than 4 s of app (ScreenFocus, TapTrail, ScreenDeck, ScreenTour)
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
//   HUES             more than ONE data hue in the film (the accent, red, green resolve to one in the kit; a Film's literal
//                    C.downLine / C.upLine counts as its own; the p2x round-2 story film: teal, a red strike, a red gap)
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
//   CARD_ONCE        a story card (WhoCard, QuoteCard, Versus, Standings, Ledger, DocCard, LapDelta) twice in a film
//   CARD_RUN         more than two card shots in a row (the p2x round-2 story film: five white cards in a row)
//   SCENE_TWICE      the same scene type in two shots in a row
//   LAPDELTA_GAP     a LapDelta of two years, or a gap under 15 % of the longer bar (a stub, not a gap)
//   STANDINGS_YEARS  a Standings ranked by years;  VERSUS_UNIT  a Versus of two different quantities (a place, a year)
//   LATIN_CARD       a card's main text in the Latin script (the name in Georgian, the original a small caption)
//   WHO_PHOTO        a WhoCard over a photo with no person in it;  REWIND_FROM  a BigNumber rewind with no "from"
//   CODE_PART, STAKE_STEPS, TOUR_POINTS, RANGE_ZONES, RANGE_SOURCE, RACE_TIME   the r3 kit's props (src/lib/r3.mjs r3Problems):
//                    a CodeAnatomy part not in its code, a StakeCounter total that shrinks or 1 step, a ScreenTour spot off the
//                    capture, a RangeScale off its zones or without its source, a TimeRace whose slow way is not the longer
//   YEAR_AGE         „1899 წელია" for an age;  BARE_ELEKTRO  „ელექტრო" alone as a noun;  SPEED_UNIT  a speed said with no unit
//   (stories)        GRAPHIC_VARIETY fewer than 4 graphic types; PHOTO_SHARE photos over 40 % of the shots; MARK_MISSING a
//                    photo shot with no hand mark; GRAPHIC_THIN a photo held 2 s or more with no mark
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {P2_KIT_TEXT_W, p2On} from '../../src/lib/p2.mjs';
import {retiredScene} from '../../src/lib/retired.mjs';
import {R3_SCENES, r3Problems} from '../../src/lib/r3.mjs';
import {fitLines, textW} from '../../src/lib/textfit.mjs';
import {estimateTimeline} from './fx.mjs';
import {vNumber} from './ending.mjs';
import {streetLoose} from './streetwords.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const FPS = 30;
export const TEXT_W = P2_KIT_TEXT_W; // 808: the kit's text width inside the drift's inset
export const APP_SCENES = new Set(['ScreenFocus', 'TapTrail', 'ScreenDeck', 'ScreenTour']);
export const HOOK_SCENES = new Set(['FreezeTag', 'IrisDetail', 'KeywordLift', 'FilmTitleCard', 'ScreenFocus', 'Receipt', 'Twist', 'KineticHeadline', 'BigNumber', 'Film', 'CodeAnatomy', 'StakeCounter']);
/** the P2 annotation and data parts (steps 3 and 6) */
export const KIT_SCENES = new Set(['HeroObject', 'KeywordLift', 'Receipt', 'UnitGrid', 'ScaleReveal', 'RankShift', 'RouteTrace', 'WipeCompare', 'FilmTitleCard', 'ScreenFocus', 'TapTrail', ...R3_SCENES]);
/** the story kit (src/scenes: purpose-built story graphics) */
export const STORY_KIT = new Set(['WhoCard', 'QuoteCard', 'Versus', 'Standings', 'Ledger', 'DocCard', 'LapDelta', 'StoryMap']);
/** shots that are a photo (the story audit: photos at most 40 % of the shots, each one marked) */
const isPhotoShot = (sc) => ['Photo', 'PhotoStory'].includes(sc.type) || (['Split', 'Twist', 'FreezeTag', 'IrisDetail'].includes(sc.type) && Boolean(sc.src || sc.a?.src)) || ((sc.type === 'KineticHeadline' || sc.type === 'BigNumber') && Boolean(sc.bg?.src));
// RangeScale too (the review of 08a2624: its ruler, ticks, slide, landing and underline need about 4 s; 75 frames cut it short)
const SIGNATURE = new Set(['FilmTitleCard', 'TapTrail', 'Receipt', 'RankShift', 'Film', 'EndCard', 'CodeAnatomy', 'StakeCounter', 'ScreenTour', 'TimeRace', 'RangeScale']);
/** the treatment's hook types (ci/prompt.md PITCH_P2) and the first shots that keep the promise; a `<Name>Hook` Film may
 *  draw the three that are not a scene type of their own */
export const HOOK_TYPES = Object.freeze({
  FreezeTag: ['FreezeTag'],
  IrisDetail: ['IrisDetail'],
  KeywordLift: ['KeywordLift'],
  FilmTitleCard: ['FilmTitleCard'],
  StruckNumber: ['BigNumber', 'FilmTitleCard', 'Receipt', 'FilmHook'],
  ResultFirst: ['ScreenFocus', 'FilmTitleCard', 'IrisDetail', 'FilmHook'],
  StakeCounter: ['StakeCounter', 'BigNumber', 'FilmTitleCard', 'FilmHook'],
  Decode: ['CodeAnatomy', 'FilmHook'],
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
  phone: ['ScreenFocus', 'TapTrail', 'ScreenDeck', 'IrisDetail', 'ScreenTour'],
  card: ['DocCard', 'QuoteCard', 'Receipt', 'WhoCard', 'Ledger', 'FilmTitleCard', 'Versus'],
  pill: ['Receipt', 'DocCard', 'FilmTitleCard', 'QuoteCard'],
  coin: ['BigNumber', 'UnitGrid', 'StakeCounter', 'FilmTitleCard:stat', 'FilmTitleCard:grid'],
  dot: ['BigNumber', 'UnitGrid', 'RouteTrace', 'StoryMap', 'TimeRace', 'RangeScale', 'FilmTitleCard:stat', 'FilmTitleCard:grid'],
});
/** PICTURE_AGAIN: the most shots one hero value may be the main picture of */
export const HERO_MAX = 3;
/** LapDelta's gap: under this share of the longer bar it reads as a stub, not a gap */
export const LAPDELTA_GAP = 0.15;
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
// spaces, quotes, punctuation and hyphens or dashes out (the p2x panel: „5W30" and „5W-30" were two values)
const norm = (v) => String(v ?? '').toLowerCase().replace(/[\s„“"«».,!?:;()\-‐-―]+/g, '');
/** a value's lead: its first word when that word carries a digit („5W-30 ზეთი", „5W-30-ს", „04:50-ზე"), letters and digits
 *  only, a Georgian case ending dropped; null otherwise. „5W-30 ზეთი" and „5W30" are one picture. */
export const leadOf = (v) => {
  const first = String(v ?? '').trim().split(/\s+/)[0] ?? '';
  if (!/\d/.test(first)) return null;
  const lead = first.toLowerCase().replace(/[^0-9a-z\u10d0-\u10ff]+/g, '').replace(/[\u10d0-\u10ff]+$/u, '');
  return lead.length >= 2 ? `#${lead}` : null;
};
/** a shot's hero values: what it shows big (the word, the claim, the value, the lifted words, the card's values) */
export const heroValues = (sc) => {
  const out = new Set();
  const add = (v) => {
    const n = norm(v);
    if (n.length >= 2) out.add(n);
    const l = leadOf(v);
    if (l) out.add(l);
  };
  if (!sc || typeof sc !== 'object') return out;
  if (sc.type === 'BigNumber') add(`${sc.value ?? ''}${sc.unit ?? ''}`);
  else if (sc.type !== 'EndCard') {
    for (const k of ['word', 'claim', 'quote']) if (typeof sc[k] === 'string') add(sc[k]);
    if (sc.value !== undefined && (typeof sc.value === 'string' || typeof sc.value === 'number')) add(sc.value);
    if (Array.isArray(sc.lift)) add(sc.lift.join(' '));
    if (sc.type === 'ShapeMatch') add(sc.label);
    for (const r of [...(sc.fields ?? []), ...(sc.rows ?? []), ...(sc.total ? [sc.total] : [])]) if (r && (typeof r.value === 'string' || typeof r.value === 'number')) add(r.value);
    // the story kit's figures too (the p2x round-2 story film: „1899" was the picture of the hook, a Ledger, a QuoteCard's
    // "who", a Versus, a Standings, a LapDelta and the cover, and PICTURE_AGAIN counted two of them)
    for (const side of [sc.a, sc.b]) if (side && (typeof side.value === 'string' || typeof side.value === 'number')) add(side.value);
    for (const side of [sc.a, sc.b]) if (side && typeof side.shown === 'string') add(side.shown);
    for (const e of sc.entries ?? []) if (e && (typeof e.year === 'string' || typeof e.year === 'number')) add(e.year);
    for (const k of ['stamp', 'year']) if (typeof sc[k] === 'string' || typeof sc[k] === 'number') add(sc[k]);
    if (sc.type === 'QuoteCard' && /^\d{3,4}$/.test(String(sc.who ?? '').trim())) add(sc.who);
  }
  return out;
};
/** a four-digit year (1800..2100) as a number or a string */
const isYearV = (v) => /^\s*(1[89]\d\d|20\d\d|2100)\s*$/.test(String(v ?? ''));
/** the story kit's cards: a white-card template (CARD_ONCE, CARD_RUN) */
export const CARD_SCENES = new Set(['WhoCard', 'QuoteCard', 'Versus', 'Standings', 'Ledger', 'DocCard', 'LapDelta']);
/** letters in the Latin script, and in the Georgian */
const latinShare = (t) => {
  const l = (String(t ?? '').match(/[A-Za-z\u00C0-\u024F]/g) ?? []).length;
  const g = (String(t ?? '').match(/[\u10A0-\u10FF\u1C90-\u1CBF]/g) ?? []).length;
  return l + g ? l / (l + g) : 0;
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
/** the data hues a Film file paints with LITERAL colours (C.downLine, C.upLine, C.red, C.green): those never resolve to the
 *  film's one hue */
const literalHues = (code) => {
  const out = new Set();
  if (!code) return out;
  if (/C\.(down|downLine|downText|red)\b/.test(code)) out.add('red');
  if (/C\.(up|upLine|upText|green)\b/.test(code)) out.add('green');
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
  // CARD_ONCE, CARD_RUN, SCENE_TWICE (the p2x round-2 story film: five white cards in a row, QuoteCard twice in 4 s, Versus,
  // DocCard and Standings in one 5 s beat: a library-template look): each story card once a film, two card shots in a row at
  // most, and never the same scene type in two shots in a row (a Film's shots, FILM_SHOTS, and the app's screens excepted)
  for (const t of CARD_SCENES) if ((count.get(t) ?? 0) > 1) out.push(`CARD_ONCE ${t} ${count.get(t)} times: each story card once a film (a white card again reads as a template): the second one is a photo with Ink marks, a kit data part, or a purpose-built picture`);
  {
    let run = [];
    const flush = () => {
      if (run.length > 2) out.push(`CARD_RUN ${run.length} card shots in a row (${run.map((x) => `beats[${x.beat}] ${x.scene.type}`).join(', ')}): two at most; then a real photo with Ink marks, a hero object or a data part that fills the frame`);
      run = [];
    };
    for (const s of shots) {
      if (CARD_SCENES.has(s.scene.type) || (s.scene.type === 'FilmTitleCard' && run.length)) run.push(s);
      else flush();
    }
    flush();
    for (let k = 1; k < shots.length; k++) {
      const a = shots[k - 1].scene;
      const b = shots[k].scene;
      if (a.type === b.type && a.type !== 'EndCard' && a.type !== 'Film' && !APP_SCENES.has(a.type)) out.push(`SCENE_TWICE beats[${shots[k - 1].beat}] and beats[${shots[k].beat}] are both ${a.type}${a.type === 'Film' ? ` ${a.name}` : ''}: never the same picture template in two shots in a row`);
    }
  }
  // the Georgian of the most visible lines (the p2x round-2 story judge): „1899 წელია" says "it is the year 1899", not "it is
  // from 1899"; „ელექტრო" alone is no noun; a speed said without its unit („საათში ას ხუთს")
  {
    const lines = [
      ...['title', 'post'].map((k) => [k, spec?.[k]]),
      ['cover.title', spec?.cover?.title],
      ...beats.flatMap((b, i) => [[`beats[${i}].say`, b?.say], [`beats[${i}].show`, b?.show]]),
    ].filter(([, t]) => typeof t === 'string' && t);
    for (const [where, t] of lines) {
      const m = /(?:^|[^\d])((?:1[89]|20)\d\d)\s*(?:-?\s*)წელია/.exec(t);
      if (m) out.push(`YEAR_AGE ${where} "${m[1]} წელია" says "it is the year ${m[1]}": an age is „${m[1]} წლისაა" (or „${m[1]}-იდანაა"), a span „N წლისაა"`);
      if (/(^|[\s„"“(|])ელექტრო(?=$|[\s,.?!»"“”|:;])/u.test(t)) out.push(`BARE_ELEKTRO ${where} uses „ელექტრო" alone, as a noun: say „ელექტრომანქანა" or „ელექტრომობილი"`);
      if (/^beats\[\d+\]\.say$/.test(where) && /საათში/.test(t) && /(^|\s)(\d|ასი?\b|ას\s|ორას|სამას|ოთხას|ორმოც|სამოც|ოთხმოც|ოცდა|ოცი|ათი)/u.test(t.split('საათში')[1] ?? '') && !/კილომეტრ|კმ|მილ|მეტრ/.test(t)) out.push(`SPEED_UNIT ${where} says a speed with no unit („საათში ... "): „საათში ას ხუთ კილომეტრს"`);
    }
  }
  // the story kit's data must mean something (the p2x round-2 story film): LapDelta of two years (1899 against 2026: two equal
  // bars and a stub), a Standings ranked by years, a Versus of two places
  for (const s of shots) {
    const sc = s.scene;
    const where = `beats[${s.beat}] ${sc.type}`;
    if (sc.type === 'LapDelta') {
      const a = Number(sc.a?.value);
      const b = Number(sc.b?.value);
      if (isYearV(sc.a?.value) || isYearV(sc.b?.value) || isYearV(sc.a?.shown) || isYearV(sc.b?.shown)) out.push(`LAPDELTA_GAP ${where} compares years (${sc.a?.shown ?? sc.a?.value} and ${sc.b?.shown ?? sc.b?.value}): two years draw two equal bars; an age is a BigNumber („125" with „წელი") or a Ledger of the two years`);
      else if (Number.isFinite(a) && Number.isFinite(b) && Math.max(a, b) > 0 && Math.abs(a - b) / Math.max(a, b) < LAPDELTA_GAP) out.push(`LAPDELTA_GAP ${where} the gap is ${Math.round((Math.abs(a - b) / Math.max(a, b)) * 100)} % of the longer bar (${Math.round(LAPDELTA_GAP * 100)} % at least): a gap this small is a BigNumber of the gap, not two bars`);
    }
    if (sc.type === 'Standings' && (sc.rows ?? []).some((r) => isYearV(r?.value))) out.push(`STANDINGS_YEARS ${where} ranks rows by years: a standings' values are scores (points, times, places); a year is a Ledger`);
    if (sc.type === 'Versus') {
      const kind = (v) => (isYearV(v) ? 'year' : /\d/.test(String(v ?? '')) ? 'number' : 'word');
      const ka = kind(sc.a?.value);
      const kb = kind(sc.b?.value);
      if (ka !== kb || (ka === 'year' && kb === 'year') || ka === 'word') out.push(`VERSUS_UNIT ${where} sets "${sc.a?.value ?? ''}" against "${sc.b?.value ?? ''}": the two sides are the same quantity in the same unit (a speed and a speed, a price and a price), never a place or a year against another`);
    }
    // LATIN_CARD: a card's big words in the Latin script for a Georgian audience (the p2x run: Le Diable Rouge, La Jamais
    // Contente, Camille Jenatzy, Achères · Paris as the cards' main text): the name in Georgian, the original a small caption
    const big = sc.type === 'QuoteCard' ? [sc.quote] : sc.type === 'WhoCard' ? [sc.name] : sc.type === 'Ledger' ? (sc.entries ?? []).map((e) => e?.text) : sc.type === 'Versus' ? [sc.a?.label, sc.b?.label] : sc.type === 'Standings' ? [sc.title, ...(sc.rows ?? []).map((r) => r?.name)] : sc.type === 'DocCard' ? [sc.title] : sc.type === 'TypeDive' ? [sc.word] : sc.type === 'KeywordLift' ? sc.lift ?? [] : [];
    const latin = big.filter((t) => typeof t === 'string' && t.trim() && latinShare(t) > 0.5 && !/^[A-Z0-9][A-Z0-9 .\-+]{0,7}$/.test(t.trim()));
    if (latin.length) out.push(`LATIN_CARD ${where} sets "${latin[0]}" in the Latin script as its main text: the audience reads Georgian: write the name in Georgian (კამილ ჟენაცი, ლონერ-პორშე, პარიზის გამოფენა), the original only as a small caption (a source line); a short brand or model code (BMW, 5W-30) is fine`);
    if (sc.type === 'WhoCard' && photos && sc.src && photos[sc.src] && photos[sc.src].people !== true) out.push(`WHO_PHOTO ${where} names a person over ${sc.src}, a photo with no person in it (photos.json "people"): a WhoCard shows the person; a car's story is a PhotoStory of the car`);
    // REWIND_FROM: a year's rewind needs its start (frame 0 reads `from`, the claim's year)
    if (sc.type === 'BigNumber' && sc.staging === 'rewind' && !Number.isFinite(Number(sc.from))) out.push(`REWIND_FROM ${where} rewinds with no "from": frame 0 must read the year it rewinds from (today's, the claim's)`);
  }
  // the r3 kit's props (src/lib/r3.mjs): CODE_PART, STAKE_STEPS, TOUR_POINTS, RANGE_ZONES, RANGE_SOURCE, RACE_TIME
  for (const s of shots) out.push(...r3Problems(s.scene, `beats[${s.beat}]`));
  // TITLE_CARD, KIT_MIN
  const cards = count.get('FilmTitleCard') ?? 0;
  if (cards !== 1) out.push(`TITLE_CARD ${cards} FilmTitleCard: exactly one, the film's signature infographic (the cover is the same card)`);
  const kit = scenes.filter((s) => KIT_SCENES.has(s.type) || STORY_KIT.has(s.type) || marksOf(s) > 0).length;
  if (kit < 2) out.push(`KIT_MIN ${kit} annotation or data part${kit === 1 ? '' : 's'}: at least 2 (Ink marks, Callout, Receipt, UnitGrid, RankShift, ScaleReveal, RouteTrace, WipeCompare, KeywordLift, CodeAnatomy, StakeCounter, RangeScale, TimeRace, the title card)`);
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
    // ONE data hue a film (the p2x round-2 story film: teal, then a red strike and a red gap). The kit's tones resolve to
    // one (kit/p2 tone: with a dataAccent red, green and accent are the accent; without one red stays red, green is ink),
    // so a spec's tones and a Film's tone() calls count as that one; a Film's literal colours (C.downLine, C.upLine, a hex)
    // count as their own
    const accent = typeof spec?.dataAccent === 'string' && spec.dataAccent ? 'accent' : null;
    const kitHue = (h) => (accent ? 'accent' : h === 'red' ? 'red' : null);
    const hues = new Set();
    for (const s of shots) {
      if (APP_SCENES.has(s.scene.type) || s.scene.type === 'EndCard') continue;
      for (const h of huesOf(s.scene)) {
        const k = kitHue(h);
        if (k) hues.add(k);
      }
      if (s.scene.type === 'Film') {
        const code = filmCode(s.scene.name);
        for (const h of codeHues(code)) {
          const k = kitHue(h);
          if (k) hues.add(k);
        }
        for (const h of literalHues(code)) hues.add(h);
      }
    }
    if (hues.size > 1) out.push(`HUES the film paints ${[...hues].join(', ')}: ONE data colour a film (its dataAccent, or red when it names none): paint data with tone('red' | 'green' | 'accent') from ../kit/p2 (they resolve to the one), never C.downLine, C.upLine or a colour of your own`);
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
  ok(!codes(hues).includes('HUES'), 'the accent, a red row and a tick: the kit resolves them to the one accent, no HUES');
  {
    const lit = {...swap(3, {type: 'Film', name: 'V1Lit'}), dataAccent: 'teal'};
    ok(codes(lit, {filmCode: () => "<div style={{color: C.downLine}} />"}).includes('HUES'), "a teal accent and a Film's literal C.downLine: HUES (the p2x round-2 story film's red beside teal)");
    ok(!codes(lit, {filmCode: () => "<div style={{color: tone('red')}} />"}).includes('HUES'), "a Film's tone('red') with a teal accent is the teal: no HUES");
  }
  {
    // the p2x round-2 story film's own spec (ci/fixtures/p2/replay-v135-grandma-ev.json runs it whole): its kit lints
    const st = (sc) => ({...good, category: 'stories', beats: [good.beats[0], {say: 'ა ბ.', scene: sc}, ...good.beats.slice(1)]});
    ok(codes(st({type: 'LapDelta', a: {label: '1899', value: 1899, shown: '1899'}, b: {label: '2026', value: 2026, shown: '2026'}, gap: '125+'})).includes('LAPDELTA_GAP'), 'LapDelta of two years: LAPDELTA_GAP');
    ok(codes(st({type: 'LapDelta', a: {label: 'ა', value: 210, shown: '3:30'}, b: {label: 'ბ', value: 200, shown: '3:20'}, gap: '10'})).includes('LAPDELTA_GAP'), 'a gap of 5 %: LAPDELTA_GAP');
    ok(!codes(st({type: 'LapDelta', a: {label: 'ა', value: 300, shown: '5:00'}, b: {label: 'ბ', value: 120, shown: '2:00'}, gap: '3 წუთი'})).includes('LAPDELTA_GAP'), 'a real gap passes');
    ok(codes(st({type: 'Standings', title: 'პარიზი', rows: [{name: 'ა', value: '1899'}, {name: 'ბ', value: '1900'}]})).includes('STANDINGS_YEARS'), 'a Standings of years: STANDINGS_YEARS');
    ok(codes(st({type: 'Versus', a: {label: 'აშერი', value: '1899'}, b: {label: 'პარიზი', value: '1900'}})).includes('VERSUS_UNIT'), 'a Versus of two years: VERSUS_UNIT');
    ok(!codes(st({type: 'Versus', a: {label: 'ა', value: '105 კმ/სთ'}, b: {label: 'ბ', value: '100 კმ/სთ'}})).includes('VERSUS_UNIT'), 'a Versus of two speeds passes');
    ok(codes(st({type: 'QuoteCard', quote: 'Le Diable Rouge', who: 'Camille Jenatzy'})).includes('LATIN_CARD'), 'a QuoteCard in French: LATIN_CARD');
    ok(!codes(st({type: 'QuoteCard', quote: '„წითელი ეშმაკი"', who: 'Le Diable Rouge'})).includes('LATIN_CARD'), 'the Georgian name, the original as the caption: passes');
    ok(codes(st({type: 'BigNumber', value: 1899, staging: 'rewind'})).includes('REWIND_FROM'), 'a rewind with no from: REWIND_FROM');
    const three = {...good, beats: [good.beats[0], ...['Versus', 'DocCard', 'Standings'].map((t) => ({say: 'ა ბ.', scene: t === 'Versus' ? {type: t, a: {label: 'ა', value: '1'}, b: {label: 'ბ', value: '2'}} : t === 'DocCard' ? {type: t, title: 'ა', fields: []} : {type: t, rows: [{name: 'ა', value: '1'}]}})), ...good.beats.slice(1)]};
    ok(codes(three).includes('CARD_RUN'), 'Versus, DocCard and Standings in a row: CARD_RUN');
    const qq = {...good, beats: [good.beats[0], {say: 'ა.', scene: {type: 'QuoteCard', quote: 'ა', who: 'ბ'}}, {say: 'ბ.', scene: {type: 'KeywordLift', lift: ['ბ']}, subs: 'inPicture', show: 'ბ.'}, {say: 'გ.', scene: {type: 'QuoteCard', quote: 'გ', who: 'დ'}}, ...good.beats.slice(1)]};
    ok(codes(qq).includes('CARD_ONCE'), 'QuoteCard twice: CARD_ONCE');
    const lang = {...good, cover: {...(good.cover ?? {}), title: 'ახალი გეგონა? | 1899 წელია'}, beats: [{...good.beats[0], say: 'ელექტრო ახალი გგონია?', show: 'ელექტრო ახალი გგონია?'}, {...good.beats[1], say: 'ამ მანქანამ საათში ას ხუთს გადააჭარბა.'}, ...good.beats.slice(2)]};
    const lc = codes(lang);
    ok(lc.includes('YEAR_AGE') && lc.includes('BARE_ELEKTRO') && lc.includes('SPEED_UNIT'), `the p2x story's Georgian: YEAR_AGE, BARE_ELEKTRO, SPEED_UNIT (${lc.filter((c) => /YEAR|ELEK|SPEED/.test(c)).join(', ')})`);
    const fixed = {...good, cover: {...(good.cover ?? {}), title: 'ახალი გეგონა? | 1899 წლისაა'}, beats: [{...good.beats[0], say: 'ელექტრომანქანა ახალი გგონია?', show: 'ელექტრომანქანა ახალი გგონია?'}, {...good.beats[1], say: 'ამ მანქანამ საათში ას ხუთ კილომეტრს გადააჭარბა.'}, ...good.beats.slice(2)]};
    ok(!codes(fixed).some((c) => /YEAR_AGE|BARE_ELEKTRO|SPEED_UNIT/.test(c)), 'the fixed lines pass');
  }
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
  {
    // one value, four spellings (the p2x panel): „5W30", „5W-30", „5W-30 ზეთი", „5W-30-ს"
    const spell = ['5W30', '5W-30', '5W-30 ზეთი', '5W-30-ს'];
    const four = {...good, beats: [good.beats[0], ...spell.map((w, i) => ({say: 'ა ბ.', scene: i % 2 ? {type: 'TypeDive', word: w} : {type: 'DocCard', title: 'ა', fields: [{label: 'ბ', value: w}]}})), ...good.beats.slice(1)]};
    ok(codes(four).includes('PICTURE_AGAIN'), 'one value in four spellings (5W30, 5W-30, „5W-30 ზეთი", „5W-30-ს"): PICTURE_AGAIN');
    ok(leadOf('04:50-ზე') === '#0450' && leadOf('ზეთი 5W') === null && leadOf('5W-30 ზეთი') === '#5w30', 'the lead of a value: its first word with a digit, a case ending dropped');
  }
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
  // the r3 kit (src/lib/r3.mjs): good props pass in a film, broken ones are refused, the new hook types keep their promise
  {
    const r3 = [
      {type: 'CodeAnatomy', code: 'P0300', kind: 'OBD კოდი', parts: [{part: 'P', means: 'ძრავი'}, {part: '0300', means: 'აალება ირევა'}]},
      {type: 'StakeCounter', label: 'დახარჯული', unit: '₾', steps: [{value: 40, note: 'დიაგნოსტიკა'}, {value: 220, note: 'სენსორი'}, {value: 300, note: 'ხელობა'}]},
      {type: 'RangeScale', unit: 'V', min: 11.5, max: 13, value: 12.2, zones: [{to: 12.2, label: 'სუსტი', bad: true}, {to: 12.5, label: 'ნორმა'}, {to: 13, label: 'სავსე'}], source: 'მწარმოებლის ცხრილი'},
      {type: 'TimeRace', fast: {label: 'აპით', secs: 120, shown: '2 წუთი'}, slow: {label: 'ხელოსანთან', secs: 10800, shown: '3 საათი'}},
    ];
    for (const sc of r3) ok(!codes(swap(3, sc)).some((c) => /^(CODE_PART|STAKE_STEPS|RANGE_ZONES|RANGE_SOURCE|RACE_TIME|TEXT_WIDE|RETIRED)$/.test(c)), `r3: a good ${sc.type} passes the props rules`);
    ok(codes(swap(3, {...r3[0], parts: [{part: 'X9', means: 'ა'}]})).includes('CODE_PART'), 'r3: a CodeAnatomy part not in its code: CODE_PART');
    ok(codes(swap(3, {...r3[1], steps: [{value: 300, note: 'ა'}, {value: 40, note: 'ბ'}]})).includes('STAKE_STEPS'), 'r3: a running total that shrinks: STAKE_STEPS');
    ok(codes(swap(3, {...r3[2], source: ''})).includes('RANGE_SOURCE'), 'r3: a RangeScale without whose figure: RANGE_SOURCE');
    ok(codes(swap(3, {...r3[3], slow: {label: 'ა', secs: 60, shown: 'წუთი'}})).includes('RACE_TIME'), 'r3: a TimeRace whose slow way is quicker: RACE_TIME');
    const tour = {type: 'ScreenTour', screen: '22-obd-result', points: [{x: 466, y: 870, w: 260, h: 70, label: 'კოდი'}, {x: 316, y: 1241, w: 423, h: 118, label: 'რა ნიშნავს'}]};
    ok(!codes(swap(2, tour)).includes('TOUR_POINTS') && !codes(swap(2, tour)).includes('APP_TIME'), 'r3: a ScreenTour is app time and passes its points rule');
    ok(codes(swap(2, {...tour, points: [tour.points[0], {x: 2000, y: 1500, w: 200, h: 80, label: 'ბ'}]})).includes('TOUR_POINTS'), 'r3: a ScreenTour spot off the capture: TOUR_POINTS');
    ok(codes(swap(1, {...r3[1], steps: [...r3[1].steps.slice(0, 2), {value: 400, note: 'მეორედ მისვლა ხელოსანთან'}]})).includes('TEXT_WIDE'), 'r3: a StakeCounter note that does not fit its 508 px: TEXT_WIDE');
    // the kit's example film (specs/demo-p2-r3-v906.json) is clean as a NEW film: its props, its widths, and no label says
    // what the voice says (DUP_SUBTITLE is an error in the cloud; the review of 08a2624: 10 of them)
    {
      const demo = JSON.parse(fs.readFileSync(path.join(root, 'specs', 'demo-p2-r3-v906.json'), 'utf8'));
      const own = demo.beats.flatMap((b, i) => (b.scene ? r3Problems(b.scene, `beats[${i}]`) : []));
      ok(own.length === 0, `r3: the fixture passes the r3 props and width rules${own.length ? `: ${own.join(' | ')}` : ''}`);
      const {textProblems} = await import('./screentext.mjs');
      const dup = textProblems(demo, {ci: true, isNew: true, length: 45}).filter((x) => x.id === 'DUP_SUBTITLE' || x.severity === 'error');
      ok(dup.length === 0, `r3: the fixture has no DUP_SUBTITLE or other screen-text error as a new film${dup.length ? `: ${dup.map((x) => x.line).join(' | ')}` : ''}`);
    }
    const codeHook = {...swap(0, r3[0]), treatment: {hookType: 'Decode'}};
    ok(!codes(codeHook).includes('HOOK_FRAME0') && !codes(codeHook).includes('HOOK_TYPE'), 'r3: a film may open on CodeAnatomy (hook type Decode)');
    ok(!codes({...swap(0, r3[1]), treatment: {hookType: 'StakeCounter'}}).includes('HOOK_TYPE'), 'r3: the StakeCounter hook opens on the StakeCounter scene');
    ok(codes({...swap(0, r3[3]), treatment: {hookType: 'Decode'}}).includes('HOOK_TYPE'), 'r3: a Decode hook that opens on something else: HOOK_TYPE');
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
    // an old voice of a film since cut or grown by a shot is not this film's timeline (check.mjs voicedTimeline): estimate
    if (timeline?.beats?.length !== spec.beats?.length) timeline = null;
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
