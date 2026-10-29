// Crazy car stories (category "stories", the owner 2026-10-06: "crazy car stories from history, people who survive,
// invent or create marvels, brands with a plot twist; drive and aura for TikTok"): the bank, the stories offered to one
// film, and the rules a recorded film must keep.
//   loadStories(root, cats)  the bank: ci/stories-sources.json (the category's "bank"): {cat, stories: [{id, rank, kind,
//                            title, facts, names, ka, plot, ending, hooks, legend, note, photos, carinfo, text}], byId, photos
//                            (the licence manifest), catalog (public/photos/photos.json)}. null when the category or the
//                            file is missing.
//   offerStories(bank, ...)  the stories the brief offers ONE film: the ones his idea names (their own Georgian words),
//                            else the best-ranked ones no recent film told, one of each kind; a redo gets its original's
//   crossTold(...)           the subjects the two banks share (a story and the car-knowledge facts about it): a film of
//                            either keeps the other off the next offers and out of --record
//   storyRules(spec, story)  what --record and check refuse in a story film: the app shown or named, no twist marked or
//                            a twist after 70 % of the film, a photo that is not the story's own, a licensed photo in a
//                            scene that shows no credit, a photo with a brand's wordmark shown other than whole
//                            (brandProblems: build-index refuses it in every film)
//   photoNotes(spec)         (in storyNotes) the photo shots the render draws whole instead of full bleed: a small, square
//                            or landscape photo (the fit: fitsBox, photoShape, fitMisses; the numbers of src/lib/bleed.ts)
//   storyTelling(spec, story) (in storyRules) the listener test (the owner, 2026-10-07, on v79): the story's "names"
//                            said (the lead by beats[1], the payoff's from the twist on), each person with who they
//                            are, no run of fragments: STORY_NAMES, STORY_WHO, STORY_PAYOFF, STORY_CHOPPY lines.
//                            nameWords(bank, story): its names, which POST_ECHO (words.mjs postEcho) never counts.
//                            `node tools/ci/stories.mjs --test` runs v79 and its retelling through it.
// A film records its story as `--story <id>`; the ledger keeps it in "facts" (one id), the field the car-knowledge films
// use, so publish.mjs and check.mjs carry it with no change. Read by tools/ci/prompt.mjs and tools/check.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {recentFilms, usedFacts} from './carinfo.mjs';
import {contentWords} from './words.mjs';

const readJson = (f, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
export const STORY_CATEGORY = 'stories';
export const RECENT_STORIES = 30; // a story one of the category's last 30 films told is not offered or recorded again (half the bank)
export const CROSS_FILMS = 12; // a carinfo film among the last 12 that used a fact of the story's subject keeps it off too
export const OFFERED = 4; // stories per dice offer, one of each kind
export const CLOSEST_MAX = 3; // stories whose own words are closest to his idea
export const TWIST_MAX = 0.7; // the twist starts before 70 % of the film (the owner's brief: the twist lands early enough)
export const TWIST_EARLY = 0.35; // before this, a note: the setup has no room
// ---- the photos' fit (the owner, 2026-10-07, on v79's Split: "the photos are spread full screen but you cannot make
// them out; when nothing shows, make them smaller again"). The numbers are src/data/scenes.json "_fit" and each scene's
// "fit", the ones src/lib/bleed.ts renders by: a photo bleeds only when covering its box keeps at least 60 % of its
// width (or height) and it is not small; otherwise the render shows it WHOLE on the clean field (a plate at its own
// aspect, Split's pair), on its own, so the checks only tell (photoNotes) and the brief marks each photo's shape.
const SCENES = readJson(new URL('../../src/data/scenes.json', import.meta.url), {}) ?? {};
const FIT = {min: 0.6, small: 1.5, band: [1080, 1110], boxes: {frame: 0.5625}, ...(SCENES._fit ?? {})};
const CATALOG = readJson(new URL('../../public/photos/photos.json', import.meta.url), {}) ?? {};
// a photo that fills the picture band (frame 1080 x 1110) only when blown up more than 1.5 times is small: never full bleed
export const tooSmall = (info) => Math.max(FIT.band[0] / (Number(info?.w) || 1), FIT.band[1] / (Number(info?.h) || 1)) > FIT.small;
/** The share of the photo a box of aspect `box` (w/h) keeps when the photo covers it (1 = whole). */
export const keptShare = (info, box) => {
  const a = Number(info?.w) / Number(info?.h);
  return a > 0 && box > 0 ? Math.min(a / box, box / a) : 1;
};
/** Does the photo fill the box (a name of "_fit".boxes) and stay recognisable? Unknown sizes: yes (nothing to measure). */
export const fitsBox = (info, box = 'frame') => {
  const b = FIT.boxes?.[box];
  if (!(Number(info?.w) > 0 && Number(info?.h) > 0) || !b) return true;
  return keptShare(info, b) >= FIT.min && !tooSmall(info);
};
/** "tall" (fills the 9:16 frame: may bleed), "wide" (square or landscape: shown whole) or "small" (shown whole). */
export const photoShape = (info) => (tooSmall(info) ? 'small' : fitsBox(info, 'frame') ? 'tall' : 'wide');
/** The brief's words for a photo's shape (the offer's photo lines). A wide photo still fills a Split stack's panel (a
 *  wide box: 127 of the 141 wide story photos fit both), so the line says which panel it fills. */
export const shapeNote = (info) => {
  const shape = photoShape(info);
  if (shape === 'tall') return 'tall: fills the frame';
  if (shape === 'small') return 'small: shown whole, never full bleed';
  const stack = fitsBox(info, 'foot') ? '; fills either panel of a Split stack' : fitsBox(info, 'top') ? "; fills a Split stack's top panel" : '';
  return `wide: shown whole on the field (a bleed, a Twist, a bg, a Split wipe or slide draw it as a whole plate${stack})`;
};
const atPath = (o, p) => String(p).split('.').reduce((v, k) => (v && typeof v === 'object' ? v[k] : undefined), o);
const isSet = (v) => v !== undefined && v !== null && v !== false && v !== '';
const holds = (sc, c) =>
  Object.entries(c ?? {}).every(([p, want]) => {
    const v = atPath(sc, p);
    if (want === '*') return isSet(v);
    if (Array.isArray(want)) return want.some((w) => (w === null ? v === undefined || v === null : v === w));
    return v === want;
  });
const keyOfPhoto = (src) => String(src).replace(/^photos\//, '').replace(/\.jpe?g$/i, '');
/** The photos of one scene that its staging would cut beyond recognition, so the render shows them whole (bleed.ts
 *  photosFit, and PhotoStory's 4:5 window): [{src, box, kept}]; [] when the scene bleeds as written or has no photo. */
export const fitMisses = (sc, catalog = CATALOG) => {
  const reg = SCENES[sc?.type];
  const rule = reg?.bleed;
  const bleeds = rule === true || (Array.isArray(rule) && rule.some((c) => c && typeof c === 'object' && holds(sc, c)));
  const out = [];
  const miss = (src, box) => {
    const info = typeof src === 'string' && src ? catalog?.[keyOfPhoto(src)] : null;
    if (info && !fitsBox(info, box)) out.push({src: keyOfPhoto(src), box, kept: keptShare(info, FIT.boxes[box] ?? 1)});
  };
  if (bleeds) for (const r of Array.isArray(reg?.fit) ? reg.fit : []) if (!r.when || holds(sc, r.when)) for (const [p, box] of Object.entries(r)) if (p !== 'when' && typeof box === 'string') miss(atPath(sc, p), box);
  if (sc?.type === 'PhotoStory' && sc.staging === 'window') miss(sc.src, 'window');
  return out;
};

/** The stories bank, or null. */
export const loadStories = (root, cats = null) => {
  const list = cats ?? readJson(path.join(root, 'ci/categories.json'), {})?.categories ?? [];
  const cat = list.find((c) => c?.id === STORY_CATEGORY && c?.bank);
  if (!cat) return null;
  const side = readJson(path.join(root, cat.bank), null);
  if (!side?.stories) return null;
  const stories = Object.entries(side.stories).map(([id, s]) => ({
    id,
    ...s,
    text: [s.title, s.plot, ...Object.values(s.ka ?? {}), ...(s.hooks ?? [])].join(' '),
  }));
  return {
    cat,
    stories,
    byId: new Map(stories.map((s) => [s.id, s])),
    photos: side.photos ?? {},
    kinds: side.kinds ?? {},
    catalog: readJson(path.join(root, 'public/photos/photos.json'), {}) ?? {},
  };
};

const familyOf = (id) => String(id).replace(/-r\d+$/, '');
const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id))?.[1] ?? 0);

/** story id -> the film (newest) of the category's last RECENT_STORIES that told it. */
export const recentlyTold = (bank, ledger, exceptFamily = null) => {
  const recent = new Set(recentFilms(ledger, bank.cat.id, RECENT_STORIES, exceptFamily).map((e) => e.id));
  const out = new Map();
  for (const [sid, ids] of usedFacts(ledger, bank.cat.id, exceptFamily)) {
    const hit = ids.filter((x) => recent.has(x));
    if (hit.length) out.set(sid, hit.at(-1));
  }
  return out;
};
/** The subjects the two banks share. `storyByFact`: carinfo fact id -> the stories film (of the last CROSS_FILMS) that
 *  told its story; `factByStory`: story id -> the carinfo film (of the last CROSS_FILMS) that used one of its facts. */
export const crossTold = (bank, ledger, carinfoId = 'carinfo', exceptFamily = null) => {
  const storyByFact = new Map();
  const factByStory = new Map();
  if (!bank) return {storyByFact, factByStory};
  const lastStories = new Set(recentFilms(ledger, bank.cat.id, CROSS_FILMS, exceptFamily).map((e) => e.id));
  for (const [sid, ids] of usedFacts(ledger, bank.cat.id, exceptFamily)) {
    const film = ids.filter((x) => lastStories.has(x)).at(-1);
    if (film) for (const f of bank.byId.get(sid)?.carinfo ?? []) storyByFact.set(f, film);
  }
  const lastCarinfo = new Set(recentFilms(ledger, carinfoId, CROSS_FILMS, exceptFamily).map((e) => e.id));
  const factFilm = new Map();
  for (const [fid, ids] of usedFacts(ledger, carinfoId, exceptFamily)) {
    const film = ids.filter((x) => lastCarinfo.has(x)).at(-1);
    if (film) factFilm.set(fid, film);
  }
  for (const s of bank.stories) {
    const film = (s.carinfo ?? []).map((f) => factFilm.get(f)).filter(Boolean).sort((a, b) => vNumber(a) - vNumber(b)).at(-1);
    if (film) factByStory.set(s.id, film);
  }
  return {storyByFact, factByStory};
};

/** The stories whose own Georgian shares the rarer words of his idea, best first (a name, a brand, a place). */
export const closestStories = (bank, topic, max = CLOSEST_MAX) => {
  const want = new Set(contentWords(topic).map((w) => w.stem));
  if (!want.size) return [];
  const stems = bank.stories.map((s) => new Set(contentWords(s.text).map((w) => w.stem)));
  const df = new Map();
  for (const set of stems) for (const st of set) if (want.has(st)) df.set(st, (df.get(st) ?? 0) + 1);
  const n = bank.stories.length;
  const scored = bank.stories
    .map((s, i) => [s, [...stems[i]].filter((st) => want.has(st) && df.get(st) <= 6).reduce((sum, st) => sum + Math.log(n / df.get(st)), 0)])
    .filter(([, sc]) => sc > 0)
    .sort((a, b) => b[1] - a[1] || a[0].rank - b[0].rank);
  if (!scored.length) return [];
  const best = scored[0][1];
  return scored.filter(([, sc]) => sc >= best * 0.6).slice(0, max).map(([s]) => s);
};

/** The stories offered to one film: {how: "base" | "topic" | "dice", matched, stories: [{...story, toldBy, crossBy}]}.
 *  Deterministic (no seed needed: the ranks order it), so a retried run gets the same offer. */
export const offerStories = (bank, {ledger = {}, topic = '', baseStory = null, exceptFamily = null} = {}) => {
  const told = recentlyTold(bank, ledger, exceptFamily);
  const {factByStory} = crossTold(bank, ledger, 'carinfo', exceptFamily);
  const ever = usedFacts(ledger, bank.cat.id, exceptFamily);
  const mark = (s) => ({...s, toldBy: told.get(s.id) ?? null, crossBy: factByStory.get(s.id) ?? null});
  if (baseStory && bank.byId.has(baseStory)) return {how: 'base', matched: true, stories: [mark(bank.byId.get(baseStory))]};
  const free = (s) => !told.has(s.id) && !factByStory.has(s.id);
  const dice = (skip = new Set()) => {
    const order = [...bank.stories].filter((s) => !skip.has(s.id)).sort((a, b) => Number(!free(a)) - Number(!free(b)) || Number(ever.has(a.id)) - Number(ever.has(b.id)) || a.rank - b.rank);
    const out = [];
    const kinds = new Set();
    for (const s of order) {
      if (out.length >= OFFERED) break;
      if (kinds.has(s.kind) && order.some((x) => !kinds.has(x.kind) && free(x) && !out.includes(x))) continue;
      kinds.add(s.kind);
      out.push(s);
    }
    return out.map(mark);
  };
  if (topic) {
    const near = closestStories(bank, topic);
    if (near.length) return {how: 'topic', matched: true, stories: near.map(mark)};
    return {how: 'topic', matched: false, stories: dice()};
  }
  return {how: 'dice', matched: false, stories: dice()};
};

const PHOTO_SCENES = 'PhotoStory, Split, Timeline, Twist, or a KineticHeadline / BigNumber "bg"';
/** The photos a spec shows in any scene: [{src, type, where, full, whole}] ("full": shown edge to edge; "whole": shown
 *  uncropped, as a PhotoStory print or one of its `more` prints). */
export const photoUses = (spec) => {
  const out = [];
  const walk = (sc, where) => {
    if (!sc || typeof sc !== 'object') return;
    const add = (src, full, whole = false) => typeof src === 'string' && src && out.push({src: src.replace(/^photos\//, '').replace(/\.jpe?g$/i, ''), type: sc.type, where, full, whole});
    if (sc.type === 'Photo') add(sc.src, true);
    if (sc.type === 'PhotoStory') {
      add(sc.src, !['print', 'window'].includes(sc.staging), sc.staging === 'print');
      for (const m of sc.more ?? []) add(m?.src, false, sc.staging === 'print');
    }
    if (sc.type === 'Split') {
      add(sc.a?.src, false);
      add(sc.b?.src, false);
    }
    if (sc.type === 'Timeline') for (const e of sc.events ?? []) add(e?.src, false);
    if (sc.type === 'Twist') {
      add(sc.src, true);
      add(sc.setup?.src, true);
    }
    if ((sc.type === 'KineticHeadline' || sc.type === 'BigNumber') && sc.bg) add(sc.bg.src, true);
  };
  (Array.isArray(spec?.beats) ? spec.beats : []).forEach((b, i) => {
    walk(b?.scene, `beats[${i}]`);
    (Array.isArray(b?.cuts) ? b.cuts : []).forEach((c, k) => walk(c?.scene, `beats[${i}].cuts[${k}]`));
  });
  return out;
};
/** A photo whose catalogue line has `brand` (a sponsor's wordmark on the car, e.g. the 1984 McLaren's Marlboro sidepod)
 *  is shown only WHOLE, as a PhotoStory print: cropped in (a bleed, a window, Split, Timeline, Twist, a bg) the wordmark
 *  becomes the frame's subject (v78 sample, 2026-10-06: "Marlboro" filled Split's lower panel), and tobacco branding is a
 *  risk on TikTok and Instagram. One line per use; read by storyRules and by build-index for every film. */
export const brandProblems = (spec, catalog) =>
  photoUses(spec)
    .filter((u) => typeof catalog?.[u.src]?.brand === 'string' && !u.whole)
    .map((u) => `${u.where}: ${u.src} carries a brand's wordmark (${catalog[u.src].brand}): show it only whole, as a PhotoStory "print" (or one of its "more" prints), never cropped in (${u.type}${u.type === 'PhotoStory' ? ` ${u.full ? 'bleed' : 'window'}` : ''}), where the wordmark becomes the picture`);
const lettersOf = (s) => [...String(s ?? '')].filter((c) => /[\p{L}\p{N}]/u.test(c)).length;
/** Where the twist starts, as a share of the film's spoken letters (before the voice; the timeline is not there yet), and
 *  the beat: the first beat whose scene (or a cut's) is a Twist, or that says "twist": true. */
export const twistAt = (spec) => {
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const k = beats.findIndex((b) => b?.twist === true || b?.scene?.type === 'Twist' || (Array.isArray(b?.cuts) && b.cuts.some((c) => c?.scene?.type === 'Twist')));
  if (k < 0) return null;
  const total = beats.reduce((n, b) => n + lettersOf(b?.say), 0);
  const before = beats.slice(0, k).reduce((n, b) => n + lettersOf(b?.say), 0);
  return {beat: k, share: total ? before / total : 0};
};

/** What --record (and check, again before the voice) refuses in a story film: one line each. */
export const storyRules = (spec, story, {bank, isFollow = () => false}) => {
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  // no app: never shown, never named (the follow line excepted)
  const phones = beats.flatMap((b, i) => (b?.scene?.type === 'Phone' || (Array.isArray(b?.cuts) && b.cuts.some((c) => c?.scene?.type === 'Phone')) ? [i] : []));
  if (phones.length) out.push(`a story film never shows the app: take out the Phone beat${phones.length > 1 ? 's' : ''} (beats ${phones.join(', ')})`);
  const named = beats.findIndex((b) => /ვინარ|vinari/iu.test(`${b?.say ?? ''} ${b?.show ?? ''} ${JSON.stringify(b?.scene ?? {})}`) && !isFollow(b?.say ?? ''));
  if (named >= 0) out.push(`beats[${named}] names the app: a story film never names it (the follow line excepted)`);
  // the twist: marked, and early enough
  const tw = twistAt(spec);
  if (!tw) out.push('mark the twist: its beat takes a Twist scene, or "twist": true on the beat whose line turns the story (the camera crashes into it, and the hold after it is where his TikTok sound hits)');
  else if (tw.share > TWIST_MAX) out.push(`the twist (beats[${tw.beat}]) starts at ${Math.round(tw.share * 100)} % of the spoken words: it lands before ${Math.round(TWIST_MAX * 100)} %, so the payoff and the last line have room. Shorten the setup, or turn the story earlier`);
  // told so one viewing is enough: the names said, each person said with who they are, the payoff named, no fragments
  out.push(...storyTelling(spec, story, {isFollow}));
  // the photos: the story's own, credited. A small or a wide photo in a full-bleed staging is no refusal since
  // 2026-10-07: the render shows it whole on the field by itself (src/lib/bleed.ts), so nothing looks broken and a
  // refusal would only cost a round; photoNotes (storyNotes) says which shots turn into whole plates
  const own = new Set(story?.photos ?? []);
  for (const u of photoUses(spec)) {
    const info = bank?.catalog?.[u.src];
    if (!info?.license) continue; // an Unsplash file (no licence field): any film may show it
    if (!own.has(u.src)) out.push(`${u.where} shows ${u.src}, which is not this story's photo (${story?.id}: ${[...own].join(', ')})`);
    if (u.type === 'Photo') out.push(`${u.where}: ${u.src} is an archival photo with a licence; show it in ${PHOTO_SCENES}, which put its credit on screen (Photo does not)`);
  }
  out.push(...brandProblems(spec, bank?.catalog));
  return out;
};
/** Notes, never refusals: the photo shots the render draws whole on the field instead of full bleed (fitMisses). */
export const photoNotes = (spec, catalog = CATALOG) => {
  const out = [];
  const walk = (sc, where) => {
    const m = sc && typeof sc === 'object' ? fitMisses(sc, catalog) : [];
    if (!m.length) return;
    const box = {frame: 'a full-bleed frame', half: 'half the frame', top: "the stack's top panel", foot: "the stack's lower panel", window: 'its 4:5 window'};
    const what = m.map((x) => `${x.src} (${photoShape(catalog?.[x.src]) === 'small' ? 'small' : `${box[x.box] ?? x.box} keeps ${Math.round(x.kept * 100)} %`})`).join(', ');
    const split = sc.type === 'Split';
    const win = m.every((x) => x.box === 'window');
    const hint = split
      ? 'for a Split that fills the frame, take the stack with two wide photos (each photo line says which stack panel it fills); a wipe always shows the pair'
      : win
        ? 'a 4:5 or taller photo keeps the window'
        : 'for a shot that fills the frame, pick a tall (portrait) photo of the story';
    out.push(`${where} ${sc.type}${sc.staging ? ` ${sc.staging}` : sc.mode ? ` ${sc.mode}` : ''}: ${what}: the film shows ${split ? 'the two photos whole, one above the other or side by side' : 'the photo whole, a plate on the clean field'}, ${win ? 'not the window' : 'not full bleed'}. Fine as it is; ${hint}`);
  };
  (Array.isArray(spec?.beats) ? spec.beats : []).forEach((b, i) => {
    walk(b?.scene, `beats[${i}]`);
    (Array.isArray(b?.cuts) ? b.cuts : []).forEach((c, k) => walk(c?.scene, `beats[${i}].cuts[${k}]`));
  });
  return out;
};
/** Notes, never refusals: a twist so early that the setup has no room; the photo shots drawn whole (photoNotes). */
export const storyNotes = (spec) => {
  const tw = twistAt(spec);
  return [...(tw && tw.share < TWIST_EARLY ? [`the twist (beats[${tw.beat}]) starts at ${Math.round(tw.share * 100)} % of the spoken words: the setup may be too thin to make it land`] : []), ...photoNotes(spec)];
};

// ---- told so one viewing is enough (the owner, 2026-10-07, on v79-tractor-man: "I couldn't understand anything it says;
// it should tell it fully, continuously, so a person gets it"). v79 never said Lamborghini's name ("ეს კაცი"), said
// "ენცო" with no word of who he is, never said that the company he founded IS Lamborghini (only the Twist card did), and
// told it in nine sentences of four words. The listener test, made mechanical: STORY_NAMES, STORY_WHO, STORY_PAYOFF and
// STORY_CHOPPY lines (storyRules: --record refuses them, check stops the cloud on them before the voice, notes on the Mac).
// The names are each story's "names" in the bank: {name (as a film says it, with what it is), say (the word starts that
// count as saying it: "x" a word starting with x, "x$" the word x, "a b" two words in a row), who (a person's other cues:
// the given name, the nationality, a role of their own), when: "early" (by beats[1]) | "payoff" (from the twist on) |
// "any" (somewhere) | "if" (not required; when said, said with who it is)}.
export const STORY_WORDS = 12; // a story sentence runs up to 12 words (build-index, on `show`) ...
export const STORY_LETTERS = 70; // ... and about 70 letters in `say`: still one breath (the house rule elsewhere: 9 and 55)
export const CHOPPY_MEAN = 5; // fewer words than this a sentence on average (the last line left out): a telegram
export const FRAGMENT = 3; // a sentence of 1 to 3 words ...
export const FRAGMENT_RUN = 3; // ... three of them in a row: fragments
// what a person is, said next to the name (a word start; each name's own "who" adds the given name and the like)
const ROLES = [
  'პატრონ', 'უფროს', 'მფლობელ', 'დამფუძნ', 'შემქმნ', 'მრბოლ', 'პილოტ', 'ჩემპიონ', 'ინჟინერ', 'კონსტრუქტორ', 'დიზაინერ',
  'ექიმ', 'მფრინავ', 'მძღოლ', 'მექანიკოს', 'გამომგონ', 'პრეზიდენტ', 'ოფიცერ', 'ჟურნალისტ', 'შტურმან', 'მეგობ', 'ცოლ',
  'ქმარ', 'შვილ', 'ვაჟ', 'ქალიშვილ', 'მამა', 'დედა', 'გუნდელ', 'მეტოქ', 'მეწარმ', 'ბიზნესმენ', 'ასტრონავტ', 'ხელმძღვანელ',
  'მენეჯერ', 'მწარმოებ', 'ფორმულ', 'რეკორდსმენ', 'იტალიელ', 'ფრანგ', 'ბრიტანელ', 'ინგლისელ', 'ამერიკელ', 'გერმანელ',
  'ავსტრიელ', 'ავსტრალიელ', 'ბრაზილიელ', 'არგენტინელ', 'პოლონელ', 'იაპონელ', 'შვედ', 'ხორვატ', 'ბელგიელ', 'მექსიკელ', 'ესპანელ',
];
const wordsOf = (text) => String(text ?? '').replace(/\s*\|\s*/g, ' ').toLowerCase().match(/[ა-ჿ]+|[a-z0-9]+/g) ?? [];
/** True when a name pattern is among the words: "x" a word that starts with x, "x$" the word x, "a b" two in a row. */
export const saysName = (words, pat) => {
  const parts = String(pat ?? '').toLowerCase().split(/\s+/).filter(Boolean);
  const hit = (w, p) => w !== undefined && (p.endsWith('$') ? w === p.slice(0, -1) : w.startsWith(p));
  return parts.length > 0 && words.some((_, i) => parts.every((p, k) => hit(words[i + k], p)));
};
/** The sentences the ear hears in one `say` (a full stop, a question or an exclamation ends one). */
export const sentencesOf = (say) =>
  String(say ?? '').replace(/\s*\|\s*/g, ' ').split(/(?<=[.?!…])\s+/).map((s) => s.trim()).filter((s) => /\p{L}/u.test(s));
const wordCount = (s) => s.split(/\s+/).filter((w) => /[\p{L}\p{N}]/u.test(w)).length;
/** The listener test of a story film: one line each, each starting with its code. */
export const storyTelling = (spec, story, {isFollow = () => false} = {}) => {
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const said = beats.map((b) => (isFollow(String(b?.say ?? '')) ? [] : wordsOf(b?.say)));
  const tw = twistAt(spec);
  for (const n of Array.isArray(story?.names) ? story.names : []) {
    const say = (Array.isArray(n?.say) ? n.say : []).filter((p) => typeof p === 'string' && p.trim());
    if (!say.length) continue;
    const at = said.flatMap((w, i) => (say.some((p) => saysName(w, p)) ? [i] : []));
    if (n.when === 'early' && !at.some((i) => i <= 1))
      out.push(`STORY_NAMES ${at.length ? `"${n.name}" first comes in beats[${at[0]}]` : `the voice never says "${n.name}"`}: a viewer who never heard the story hears who or what it is about by the second line (beats[0], or beats[1] right after a teaser hook), by name`);
    else if (n.when === 'any' && !at.length) out.push(`STORY_NAMES the voice never says "${n.name}": say the name (the screen alone does not tell the story, the voice does)`);
    else if (n.when === 'payoff' && !at.some((i) => i >= (tw?.beat ?? 0)))
      out.push(`STORY_PAYOFF the voice never says "${n.name}" ${tw ? `from the twist (beats[${tw.beat}]) on` : 'in the payoff'}: the story lands on that name, so say it plainly (a Twist card or a photo alone is not enough; when the Twist card shows the name, say it in the beat after, since a card never repeats its subtitle: DUP_SUBTITLE)`);
    // a person, the first time: the full name or what they are (in that beat; a hook's teaser name, in the next one)
    if (Array.isArray(n.who) && at.length) {
      const first = at[0];
      const words = (first === 0 ? [0, 1] : [first]).flatMap((i) => said[i] ?? []);
      const cues = [...say, ...n.who, ...ROLES].filter((p, i, a) => a.indexOf(p) === i && saysName(words, p));
      if (cues.length < 2) out.push(`STORY_WHO beats[${first}] names ${String(n.name).split(',')[0]} with no word of who that is: the first time, the full name or what they are ("${n.name}")`);
    }
  }
  // told, not listed: the sentences the ear hears (the last line, a callback or the follow line, left out)
  const last = beats.length && beats.at(-1)?.scene?.type === 'EndCard' ? beats.length - 1 : -1;
  const sents = beats.flatMap((b, i) => (i === last || !said[i].length ? [] : sentencesOf(b?.say).map((s) => ({i, s, n: wordCount(s)}))));
  if (sents.length >= 4) {
    const mean = sents.reduce((a, x) => a + x.n, 0) / sents.length;
    let run = [];
    let worst = [];
    for (const x of sents) {
      run = x.n <= FRAGMENT ? [...run, x] : [];
      if (run.length > worst.length) worst = run;
    }
    const why = [];
    if (mean < CHOPPY_MEAN) why.push(`its ${sents.length} sentences average ${mean.toFixed(1)} words (a story sentence runs 6 to ${STORY_WORDS})`);
    if (worst.length >= FRAGMENT_RUN) why.push(`${worst.length} sentences of 1 to ${FRAGMENT} words in a row (beats[${worst[0].i}] to beats[${worst.at(-1).i}]: "${worst.map((x) => x.s).join(' ')}")`);
    if (why.length)
      out.push(`STORY_CHOPPY the story comes in fragments: ${why.join('; and ')}. Tell it the way a friend tells it in one breath: join them into sentences that lead into each other (ჰოდა, მერე, ამიტომ, მაგრამ, და), the cause and what came of it, two a beat at most`);
  }
  return out;
};
/** A test for the words of the story names (a post that names the person echoes nothing): the story's own, or, with no
 *  story, every story's. For POST_ECHO (tools/ci/words.mjs postEcho's `exempt`). */
export const nameWords = (bank, story = null) => {
  const pats = (story ? [story] : bank?.stories ?? [])
    .flatMap((s) => (Array.isArray(s?.names) ? s.names : []).flatMap((n) => [...(n?.say ?? []), ...(n?.who ?? [])]))
    .filter((p) => typeof p === 'string' && p && !/\s/.test(p));
  return (word) => pats.some((p) => (p.endsWith('$') ? word === p.slice(0, -1) : String(word).startsWith(p)));
};

// ---- self-test: node tools/ci/stories.mjs --test (the listener test on v79-tractor-man and its retelling, the post
// echo, and every story's "names" in the bank) ------------------------------------------------------------------------
const selfTest = async () => {
  const {postEcho} = await import('./words.mjs');
  const root = path.resolve(path.dirname(decodeURIComponent(new URL(import.meta.url).pathname)), '../..');
  const lambo = {
    id: 'lamborghini-tractor',
    names: [
      {name: 'ფერუჩო ლამბორგინი', say: ['ლამბორგინ'], who: ['ფერუჩო'], when: 'early'},
      {name: 'ლამბორგინი', say: ['ლამბორგინ'], when: 'payoff'},
      {name: 'ენცო ფერარი, ფერარის პატრონი', say: ['ენცო', 'ფერარის პატრონ'], who: ['ფერარ'], when: 'any'},
    ],
  };
  const follow = '„ვინარი“ დაწერე კომენტარში, | ლინკს მოგწერთ. გვერდიც გამოიწერე.';
  const film = (says, post) => ({
    beats: [...says.map((say, i) => ({say, ...(i === 4 ? {scene: {type: 'Twist'}} : {})})), {say: follow, scene: {type: 'EndCard', tagline: follow}}],
    post: {description: post},
  });
  const isFollow = (t) => t.includes('ვინარი');
  const v79 = film(
    ['ეს კაცი | ტრაქტორებს აწყობდა.', 'ორმოცდარვა წლიდან. | თვითონ კი | ფერარით დადიოდა.', 'გადაბმულობა | სულ უფუჭდებოდა. | მარანელოში | ისევ და ისევ ასწორებდნენ.', 'ენცოსთან მივიდა | და დაიჩივლა. | ენცომ ყური არ ათხოვა.', 'ფერარს რომ შეჯიბრებოდა, | სამოცდასამში | თავისი კომპანია დააარსა.', 'ტრაქტორებს დღესაც | მისი სახელით აკეთებენ.'],
    'ფერუჩო ლამბორგინი ტრაქტორებს აწყობდა და ფერარით დადიოდა. გადაბმულობაზე ენცომ ყური არ ათხოვა და 1963-ში თავისი კომპანია დააარსა.',
  );
  const told = (beat3) =>
    film(
      ['ეს კაცი ტრაქტორებს აწყობდა, | მერე ფერარს გაეჯიბრა.', 'ფერუჩო ლამბორგინი | ორმოცდარვა წლიდან ტრაქტორებს აწყობდა, | თვითონ კი ფერარით დადიოდა.', 'ჰოდა, ფერარის გადაბმულობა | სულ ფუჭდებოდა | და მარანელოში ისევ და ისევ უკეთებდნენ.', beat3, 'ამიტომ სამოცდასამში | თავისი კომპანია დააარსა. | ასე დაიბადა ლამბორგინი.', 'ტრაქტორებს კი | მისი სახელით დღესაც აკეთებენ.'],
      'ტრაქტორების ქარხანა და მანქანების კომპანია 1973 წლიდან სულ სხვადასხვა ფირმებია. შენ რომელს აირჩევდი, ფერარს თუ ლამბორგინის?',
    );
  const codes = (spec) => storyTelling(spec, lambo, {isFollow}).map((l) => l.split(' ')[0]).sort().join(',');
  const exempt = nameWords(null, lambo);
  const cases = [
    ['v79 as made: no name, Enzo unexplained, no payoff, fragments', codes(v79), 'STORY_CHOPPY,STORY_NAMES,STORY_PAYOFF,STORY_WHO'],
    ['v79 told in one breath', codes(told('ერთ დღეს ფერარის პატრონს, | ენცოს შეჩივლა, | მაგრამ ენცომ ყური არ ათხოვა.')), ''],
    ['the same with a bare „ენცო"', codes(told('ერთ დღეს ენცოს შეჩივლა, | მაგრამ ენცომ ყური არ ათხოვა.')), 'STORY_WHO'],
    ['v79 post: the voice retold', String(Boolean(postEcho(v79, {skip: isFollow, exempt}))), 'true'],
    ['a post that adds a fact and asks', String(Boolean(postEcho(told('ერთ დღეს ფერარის პატრონს, | ენცოს შეჩივლა.'), {skip: isFollow, exempt}))), 'false'],
    // naming a person the way the voice does („ენცო ფერარი, ფერარის პატრონი", the brief's model) is no run of the voice
    ['a post that names Enzo as the voice did', String(Boolean(postEcho({...told('ენცო ფერარს, ფერარის პატრონს, | შეჩივლა, | მაგრამ ენცომ ყური არ ათხოვა.'), post: {description: 'ენცო ფერარი, ფერარის პატრონი, ამ უარს მერე ალბათ ინანებდა. შენ რას იზამდი მის ადგილას?'}}, {skip: isFollow, exempt}))), 'false'],
  ];
  // every story of the bank: names, each with words to say and a valid "when", one said early
  const bank = loadStories(root);
  const WHEN = new Set(['early', 'any', 'payoff', 'if']);
  const badNames = (bank?.stories ?? []).filter((s) => !Array.isArray(s.names) || !s.names.some((n) => n.when === 'early') || s.names.some((n) => !WHEN.has(n.when) || !Array.isArray(n.say) || !n.say.length || n.say.some((p) => typeof p !== 'string' || p !== p.toLowerCase() || !p.trim()) || (n.who !== undefined && !Array.isArray(n.who))));
  cases.push(['the bank: every story has valid names', badNames.map((s) => s.id).join(',') || 'ok', 'ok']);
  let failed = 0;
  for (const [what, got, want] of cases) {
    const ok = got === want;
    if (!ok) failed++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}${ok ? '' : `: got "${got}", want "${want}"`}`);
  }
  console.log(failed ? `${failed} failed` : 'all passed');
  return failed ? 1 : 0;
};
if (process.argv[2] === '--test' && process.argv[1] && path.resolve(process.argv[1]) === decodeURIComponent(new URL(import.meta.url).pathname)) process.exit(await selfTest());
