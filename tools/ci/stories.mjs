// Crazy car stories (category "stories", the owner 2026-10-06: "crazy car stories from history, people who survive,
// invent or create marvels, brands with a plot twist; drive and aura for TikTok"): the bank, the stories offered to one
// film, and the rules a recorded film must keep.
//   loadStories(root, cats)  the bank: ci/stories-sources.json (the category's "bank"): {cat, stories: [{id, rank, kind,
//                            title, facts, ka, plot, ending, hooks, legend, note, photos, carinfo, text}], byId, photos
//                            (the licence manifest), catalog (public/photos/photos.json)}. null when the category or the
//                            file is missing.
//   offerStories(bank, ...)  the stories the brief offers ONE film: the ones his idea names (their own Georgian words),
//                            else the best-ranked ones no recent film told, one of each kind; a redo gets its original's
//   crossTold(...)           the subjects the two banks share (a story and the car-knowledge facts about it): a film of
//                            either keeps the other off the next offers and out of --record
//   storyRules(spec, story)  what --record and check refuse in a story film: the app shown or named, no twist marked or
//                            a twist after 70 % of the film, a photo that is not the story's own, a licensed photo in a
//                            scene that shows no credit, a small photo shown full bleed
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
// a photo that fills the picture band (frame 1080 x 1110) only when blown up more than 1.5 times is a print or a window
export const tooSmall = (info) => Math.max(1080 / (Number(info?.w) || 1), 1110 / (Number(info?.h) || 1)) > 1.5;

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
/** The photos a spec shows in any scene: [{src, type, where, full}] ("full": shown edge to edge). */
const photoUses = (spec) => {
  const out = [];
  const walk = (sc, where) => {
    if (!sc || typeof sc !== 'object') return;
    const add = (src, full) => typeof src === 'string' && src && out.push({src: src.replace(/^photos\//, '').replace(/\.jpe?g$/i, ''), type: sc.type, where, full});
    if (sc.type === 'Photo') add(sc.src, true);
    if (sc.type === 'PhotoStory') {
      add(sc.src, !['print', 'window'].includes(sc.staging));
      for (const m of sc.more ?? []) add(m?.src, false);
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
  // the photos: the story's own, credited, never small and full bleed
  const own = new Set(story?.photos ?? []);
  for (const u of photoUses(spec)) {
    const info = bank?.catalog?.[u.src];
    if (!info?.license) continue; // an Unsplash file (no licence field): any film may show it
    if (!own.has(u.src)) out.push(`${u.where} shows ${u.src}, which is not this story's photo (${story?.id}: ${[...own].join(', ')})`);
    if (u.type === 'Photo') out.push(`${u.where}: ${u.src} is an archival photo with a licence; show it in ${PHOTO_SCENES}, which put its credit on screen (Photo does not)`);
    if (u.full && tooSmall(info)) out.push(`${u.where}: ${u.src} is small (${info.w}×${info.h}): a PhotoStory "print" or "window", Split or Timeline, never full bleed`);
  }
  return out;
};
/** A note, never a refusal: a twist so early that the setup has no room. */
export const storyNotes = (spec) => {
  const tw = twistAt(spec);
  return tw && tw.share < TWIST_EARLY ? [`the twist (beats[${tw.beat}]) starts at ${Math.round(tw.share * 100)} % of the spoken words: the setup may be too thin to make it land`] : [];
};
