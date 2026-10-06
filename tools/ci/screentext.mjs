#!/usr/bin/env node
// The text on screen (the owner, 2026-10-06: "the films are mostly text, the subtitle is there anyway; show it, do not
// write it"). One pure module, no React, read by tools/check.mjs (fatal in the cloud for a new film), tools/build-index.mjs
// (warnings on the Mac), tools/ci/prompt.mjs (the brief's numbers) and tools/ci/visual.mjs (the registry's stagings).
//
//   import {loadRegistry, textProblems, summary} from './ci/screentext.mjs'
//   textProblems(spec, {reg, timeline, length, ci, isNew, filmCode}) -> [{id, severity, line}]
//     severity 'error' (only with ci && isNew), 'warning' or 'note'; every line starts with its id and says what to do
//   summary(spec, opts) -> 'pictures 82 % · text 0 % · cards 0 · max 3 words · 9 scenes'
//   sceneList(spec, reg, {timeline}) -> the shots as Promo plans them (beat.cuts split a beat), with their class,
//     subtitle chunks, weight and the text items they draw
//
//   node tools/ci/screentext.mjs <id> [--len 15|20|30|45] [--new] [--ci]   one spec: its lines and the summary
//   node tools/ci/screentext.mjs --last 15 [--new]                       the newest base films (the oracle's input)
//   node tools/ci/screentext.mjs --test                                  the built-in cases and the oracle (spec 7.6)
//
// The rules (src/data/scenes.json gives every scene type its class, its text props and their word caps):
//   TEXT_SHARE     text-class scenes take at most 30 % of the non-EndCard time
//   PICTURE_SHARE  picture-class scenes take at least 50 % of it
//   TEXT_CARDS     text scenes: at most 1 (15 and 20 s), 2 (30 s), 3 (45 s); never two in a row; never the first scene
//   SCREEN_WORDS   the words one scene draws: its registry cap ("words"; 5, Chat 9, Notification 8, data 8), and every
//                  item its own cap ("max": a label 3, a bubble 4)
//   PUNCH_WORDS    a punch (`word`, a Title or KineticHeadline line, a Twist reveal, a speech bubble) at most 3 words; at
//                  most 3 `*punch*` marks a scene
//   DUP_SUBTITLE   no text item whose content words are all in the subtitle shown with it (identity labels excepted)
//   LIST_TEXT      a List only as a comparison ("compare": true): 2 or 3 rows, 3 words a row, one a film; strike only there
//   LINEART        every Film has "look": "illustrated" or "diagram"; at most one diagram Film a film
//   PACE           non-EndCard scenes (beat.cuts count): at least 4 (15 s), 5 (20 s), 8 (30 s), 12 (45 s)
//   SCENE_LONG     a scene runs past its registry max ("dur"[2]); a note on the Mac
//   STICK_FIGURE   a Film draws a person or a car without the kit (../illo/figure, ../illo/car)
// A new film (its number at least ci/fx.json "from"; TEXT_FROM without the file) in the cloud: the first eight are errors,
// PACE, SCENE_LONG and STICK_FIGURE warnings. Older films, their redos and everything on the Mac: warnings (SCENE_LONG a
// note), so old films still render.
//
// Counting words: whitespace tokens with a letter; a token with a digit counts 0 ("1963", "300 000 ₾"; "42 დღე" is 1);
// `*` punch marks are not letters. Not counted: "source", the meta bar, the subtitles, Phone screen pixels. A Film's own
// Georgian (string literals and JSX text in src/scenes/film/<Name>.tsx; a `p.x ?? '...'` default only while the spec leaves
// x unset) is the Film's text like its props.
// Shares: before the voice weighted by subtitle chunks (a cut splits its beat's chunks); with the voice's timeline by time.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

export const LENGTHS = [15, 20, 30, 45];
export const TEXT_MAX = {15: 1, 20: 1, 30: 2, 45: 3}; // text scenes a film
export const MIN_SCENES = {15: 4, 20: 5, 30: 8, 45: 12}; // a new picture every 2 to 3 s
export const TEXT_SHARE_MAX = 0.3;
export const PICTURE_SHARE_MIN = 0.5;
export const PUNCH_MAX = 3; // words in one punch
export const PUNCH_MARKS = 3; // `*punch*` marks in one scene
export const TEXT_FROM = 77; // the first new film when ci/fx.json is not there (its "from": the motion layer's rollout)
// the brief's letter budget (tools/ci/prompt.mjs LETTERS): a spec's length class before the voice, and about 10.3 letters
// a second, gaps and holds included, for a scene's seconds
const LETTERS = {15: 150, 20: 210, 30: 310, 45: 465};
const LPS = LETTERS[45] / 45;
const LOOKS = ['illustrated', 'diagram'];

export const IDS = ['TEXT_SHARE', 'PICTURE_SHARE', 'TEXT_CARDS', 'SCREEN_WORDS', 'PUNCH_WORDS', 'DUP_SUBTITLE', 'LIST_TEXT', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'];
// [cloud for a new film, everywhere else]
const SEVERITY = {
  TEXT_SHARE: ['error', 'warning'],
  PICTURE_SHARE: ['error', 'warning'],
  TEXT_CARDS: ['error', 'warning'],
  SCREEN_WORDS: ['error', 'warning'],
  PUNCH_WORDS: ['error', 'warning'],
  DUP_SUBTITLE: ['error', 'warning'],
  LIST_TEXT: ['error', 'warning'],
  LINEART: ['error', 'warning'],
  PACE: ['warning', 'warning'],
  SCENE_LONG: ['warning', 'note'],
  STICK_FIGURE: ['warning', 'warning'],
};

// ---- the registry (src/data/scenes.json) -------------------------------------------------------------------------------
const regCache = new Map();
/** The scene registry: {Type: {cls, clsIf, stagings, text, words, dur, ...}} ("_about" left out); {} when it is missing. */
export const loadRegistry = (root = ROOT) => {
  const file = path.join(root, 'src', 'data', 'scenes.json');
  if (!regCache.has(file)) {
    let reg = {};
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'));
      reg = Object.fromEntries(Object.entries(j).filter(([k, v]) => !k.startsWith('_') && v && typeof v === 'object'));
    } catch {}
    regCache.set(file, reg);
  }
  return regCache.get(file);
};

/** The film number from which the rules are errors in the cloud: ci/fx.json "from", else TEXT_FROM. */
export const textFrom = (root = ROOT) => {
  try {
    const n = Number(JSON.parse(fs.readFileSync(path.join(root, 'ci', 'fx.json'), 'utf8')).from);
    if (Number.isInteger(n) && n > 0) return n;
  } catch {}
  return TEXT_FROM;
};
const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id))?.[1] ?? 0);
/** A new film for the text rules: its number (a redo's original's) at least textFrom(). Demos and hook variants are not. */
export const isNewFilm = (id, root = ROOT) => vNumber(id) >= textFrom(root);

// ---- words --------------------------------------------------------------------------------------------------------------
const tokens = (s) => String(s ?? '').replace(/\*/g, '').split(/\s+/).filter(Boolean);
/** Words on screen: tokens with a letter and no digit. */
export const countWords = (s) => tokens(s).filter((t) => /\p{L}/u.test(t) && !/\p{N}/u.test(t)).length;
/** `*punch*` marks in a text. */
export const punchMarks = (s) => (String(s ?? '').match(/\*[^*\s][^*]*\*/g) ?? []).length;

// DUP_SUBTITLE (spec 7.1): normalise (lowercase, punctuation and hyphens out without splitting: "Vinari-ს" -> "vinariს"),
// drop the stop words, stem = the first 5 letters of a word of 6 or more, else the word (3 letters at least). Vinari's own
// name is not a stop word.
export const STOP = new Set('და რომ არ ეს ის შენ მე კი ხო აბა ჰოდა მაგრამ თუ ან ვერ ნუ რა ვინ სად როგორ ერთი უკვე ახლა მერე ჯერ ისევ მაინც'.split(' '));
export const stems = (s) =>
  String(s ?? '')
    .toLowerCase()
    .replace(/\*/g, '')
    .split(/\s+/)
    .map((t) => t.replace(/[^\p{L}\p{M}\p{N}]/gu, ''))
    .filter((w) => w && !/\p{N}/u.test(w) && !STOP.has(w) && [...w].length >= 3)
    .map((w) => ([...w].length >= 6 ? [...w].slice(0, 5).join('') : w));
const stemMatch = (a, b) => a === b || ([...a].length >= 4 && [...b].length >= 4 && (a.startsWith(b) || b.startsWith(a)));
/** Every content stem of `text` is in `subtitle` (and it has one at all). Numbers never count. */
export const isDup = (text, subtitle) => {
  const mine = stems(text);
  if (!mine.length) return false;
  const theirs = stems(subtitle);
  return mine.every((m) => theirs.some((t) => stemMatch(m, t)));
};

// ---- the text items a scene draws -----------------------------------------------------------------------------------------
// The registry's "text": [{path, max, dup, except, punch}]: a dotted path, "[]" maps over an array, a string element or
// an object's `text` is the text, "*" any top-level prop not in `except` (a Film's own props). The common `word` prop (the
// punch every illustrated scene takes) counts on every scene. A punch: `word`, the paths below, any entry with
// "punch": true, and a path ending in bubble, speech or say (a speech bubble).
const PUNCH_PATHS = {Title: ['lines[]'], KineticHeadline: ['lines[]'], Twist: ['reveal[]', 'setup.lines[]'], Callback: ['lines[]']};
const isPunchPath = (type, p, entry) => entry?.punch === true || p === 'word' || (PUNCH_PATHS[type] ?? []).includes(p) || /(?:^|\.)(?:bubble|speech|say)(?:\[\])?$/.test(p);
// props that never draw words, whatever the scene (enum-like values, the camera, the shot's accent)
const NEVER_TEXT = new Set(['type', 'name', 'look', 'staging', 'tone', 'source', 'camera', 'transition', 'time', 'seed', 'theme', 'src', 'fx', 'mark', 'format', 'unit']);
// a value that reads as a setting, not as words: "down", "phoneEar", "turn-left", "#fff", "1.2s"
const enumLike = (s) => /^[a-z][A-Za-z0-9_-]*$/.test(s) || /^#[0-9a-f]{3,8}$/i.test(s) || /^[\d.]+(?:s|px|%)?$/.test(s);
const atOf = (v) => (v && typeof v === 'object' && !Array.isArray(v) && (typeof v.at === 'number' || typeof v.at === 'string') ? v.at : undefined);

const walkPath = (sc, p) => {
  // -> [{text, at, path}]
  const out = [];
  const segs = p.split('.');
  const step = (v, k, at, where) => {
    if (k === segs.length) {
      const text = typeof v === 'string' ? v : v && typeof v === 'object' && typeof v.text === 'string' ? v.text : null;
      if (text !== null) out.push({text, at: atOf(v) ?? at, path: where});
      return;
    }
    const seg = segs[k];
    const many = seg.endsWith('[]');
    const key = many ? seg.slice(0, -2) : seg;
    const x = v && typeof v === 'object' ? v[key] : undefined;
    if (x === undefined || x === null) return;
    const name = where ? `${where}.${key}` : key;
    if (many) (Array.isArray(x) ? x : [x]).forEach((y, i) => step(y, k + 1, atOf(y) ?? at, `${name}[${i}]`));
    else step(x, k + 1, atOf(x) ?? at, name);
  };
  step(sc, 0, atOf(sc), '');
  return out;
};
// "*": a top-level prop that draws words: a string, a list of strings, or a list of objects (their text, label, name, title)
const walkStar = (sc, except) => {
  const out = [];
  const skip = new Set([...NEVER_TEXT, ...(except ?? [])]);
  const add = (text, at, where) => {
    if (typeof text === 'string' && text.trim() && !enumLike(text.trim())) out.push({text, at, path: where});
  };
  for (const [k, v] of Object.entries(sc ?? {})) {
    if (skip.has(k) || /At$/.test(k)) continue;
    if (typeof v === 'string') add(v, atOf(sc), k);
    else if (Array.isArray(v))
      v.forEach((y, i) => {
        if (typeof y === 'string') add(y, atOf(sc), `${k}[${i}]`);
        else if (y && typeof y === 'object') for (const f of ['title', 'name', 'label', 'text']) add(y[f], atOf(y) ?? atOf(sc), `${k}[${i}].${f}`);
      });
    else if (v && typeof v === 'object') for (const f of ['title', 'name', 'label', 'text']) add(v[f], atOf(v) ?? atOf(sc), `${k}.${f}`);
  }
  return out;
};

/** A Film's own Georgian, read from its code: [{text, path}] (comments out; a `p.x ?? ...` default only while x is unset). */
export const filmText = (code, sc = {}) => {
  if (!code) return [];
  const c = String(code)
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  const GEO = /[ა-ჿ]/;
  const out = [];
  // the defaults: `p.x ?? '...'`, `p.x ?? [...]`
  const DEF = /p\.(\w+)\s*\?\?\s*(\[[^\]]*\]|'[^'\n]*'|"[^"\n]*")/g;
  for (const m of c.matchAll(DEF)) {
    if (sc[m[1]] !== undefined) continue;
    for (const s of m[2].match(/'[^'\n]*'|"[^"\n]*"/g) ?? []) if (GEO.test(s)) out.push({text: s.slice(1, -1), path: `code: ${m[1]} default`});
  }
  const rest = c.replace(DEF, '');
  for (const s of rest.match(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g) ?? []) if (GEO.test(s)) out.push({text: s.slice(1, -1).replace(/\$\{[^}]*\}/g, ' '), path: 'code'});
  for (const m of rest.matchAll(/>([^<>{}]*[ა-ჿ][^<>{}]*)</gu)) out.push({text: m[1].trim(), path: 'code'});
  // the same label written twice (a ternary, a shadow copy) is drawn once
  const seen = new Set();
  return out.filter((x) => !seen.has(x.text) && seen.add(x.text));
};

/** The class of a scene: its registry "cls", changed by "clsIf" ({when: {prop: value | '*'}, cls, maxWords}). Unknown: picture. */
export const classOf = (sc, reg, words = 0) => {
  const e = reg?.[sc?.type];
  if (!e) return sc?.type === 'EndCard' ? 'end' : 'picture';
  for (const c of Array.isArray(e.clsIf) ? e.clsIf : []) {
    const when = c?.when && typeof c.when === 'object' ? Object.entries(c.when) : [];
    const ok = when.length && when.every(([k, v]) => (v === '*' ? sc[k] !== undefined && sc[k] !== null && sc[k] !== false && sc[k] !== '' : sc[k] === v));
    if (ok && (typeof c.maxWords !== 'number' || words <= c.maxWords)) return c.cls;
  }
  return e.cls ?? 'picture';
};

/** The text items of one scene: [{path, text, words, at, dup, punch, max}]. */
export const textItems = (sc, reg, {filmCode = null} = {}) => {
  const e = reg?.[sc?.type];
  const entries = Array.isArray(e?.text) ? e.text : [{path: '*', max: 3}];
  const items = [];
  for (const t of entries) {
    if (!t || typeof t.path !== 'string') continue;
    const found = t.path === '*' ? walkStar(sc, t.except) : walkPath(sc, t.path);
    for (const x of found) {
      // a "*" item's own key decides ("word" is a punch on a Film too)
      const p = t.path === '*' ? x.path.replace(/\[\d+\]/g, '[]').replace(/\.text$/, '') : t.path;
      items.push({...x, words: countWords(x.text), dup: t.dup !== false, punch: isPunchPath(sc.type, p, t), max: typeof t.max === 'number' ? t.max : null});
    }
  }
  if (sc?.word !== undefined && !entries.some((t) => t?.path === 'word' || t?.path === '*'))
    for (const x of walkPath(sc, 'word')) items.push({...x, words: countWords(x.text), dup: true, punch: true, max: PUNCH_MAX});
  if (sc?.type === 'Film' && typeof sc.name === 'string' && filmCode)
    for (const x of filmText(filmCode(sc.name), sc)) items.push({...x, at: undefined, words: countWords(x.text), dup: true, punch: false, max: 3});
  return items;
};

// ---- the shots ------------------------------------------------------------------------------------------------------------
const chunkTexts = (b) => String(b?.show ?? b?.say ?? '').split('|').map((s) => s.trim());
const letters = (s) => (String(s).match(/\p{L}/gu) ?? []).length;

/** The shots as src/Promo.tsx planScenes makes them: a beat with a scene starts one, a beat without continues the last,
 *  `beat.cuts` [{chunk, scene}] starts one at that chunk. Each: {k, beat, type, scene, cls, chunks: [text], secs, est,
 *  items, words}. `secs` from the timeline (null without), `est` from the letters. */
export const sceneList = (spec, reg = loadRegistry(), {timeline = null, filmCode = null} = {}) => {
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const tl = timeline && Array.isArray(timeline.beats) && timeline.beats.length === beats.length ? timeline : null;
  const shots = [];
  beats.forEach((b, i) => {
    const chunks = chunkTexts(b);
    let last = 0;
    const cuts = (Array.isArray(b?.cuts) ? b.cuts : [])
      .filter((c) => c && c.scene && typeof c.scene.type === 'string' && Number.isInteger(c.chunk) && c.chunk >= 1 && c.chunk < chunks.length)
      .sort((x, y) => x.chunk - y.chunk)
      .filter((c) => (c.chunk > last ? ((last = c.chunk), true) : false));
    const segs = [{chunk: 0, scene: b?.scene && typeof b.scene === 'object' ? b.scene : null}, ...cuts];
    segs.forEach((s, j) => {
      const c0 = s.chunk;
      const c1 = j + 1 < segs.length ? segs[j + 1].chunk : chunks.length;
      if (s.scene || !shots.length) {
        const sc = s.scene ?? {type: '?'};
        const from = tl ? (c0 === 0 ? tl.beats[i].start : tl.beats[i].chunks?.[c0]?.start ?? tl.beats[i].start) : null;
        shots.push({k: shots.length, beat: i, cut: c0 > 0, type: String(sc.type), scene: sc, chunks: [], from, est: 0});
      }
      const shot = shots[shots.length - 1];
      for (let c = c0; c < c1; c++) {
        shot.chunks.push(chunks[c]);
        shot.est += letters(chunks[c]) / LPS;
      }
    });
  });
  shots.forEach((s, k) => {
    s.secs = tl ? (k + 1 < shots.length ? shots[k + 1].from : tl.duration ?? tl.beats.at(-1)?.end ?? s.from) - s.from : null;
    s.items = textItems(s.scene, reg, {filmCode});
    s.words = s.items.reduce((n, x) => n + x.words, 0);
    s.cls = classOf(s.scene, reg, s.words);
    s.entry = reg?.[s.type] ?? null;
  });
  return shots;
};

/** The film's length class: the one asked for, else the timeline's duration, else the letters of its "say" lines (the
 *  brief's budget: 150, 210, 310, 465 letters). */
export const lengthClass = (spec, {length = null, timeline = null} = {}) => {
  if (LENGTHS.includes(Number(length))) return Number(length);
  const near = (x, table) => LENGTHS.reduce((best, l) => (Math.abs(table[l] - x) < Math.abs(table[best] - x) ? l : best), LENGTHS[0]);
  if (typeof timeline?.duration === 'number' && timeline.duration > 0) return near(timeline.duration, Object.fromEntries(LENGTHS.map((l) => [l, l])));
  const n = (Array.isArray(spec?.beats) ? spec.beats : []).reduce((s, b) => s + letters(String(b?.say ?? '').replace(/\|/g, ' ')), 0);
  return near(n, LETTERS);
};

// the chunk an `at` points at, inside its shot: a chunk index, or "1.2s" from the shot's start
const chunkAt = (at, shot) => {
  if (typeof at === 'number' && Number.isFinite(at)) return Math.max(0, Math.round(at));
  const m = typeof at === 'string' ? /^(\d+(?:\.\d+)?)s$/.exec(at.trim()) : null;
  if (!m) return null;
  let t = Number(m[1]);
  for (let c = 0; c < shot.chunks.length; c++) {
    t -= letters(shot.chunks[c]) / LPS;
    if (t < 0) return c;
  }
  return shot.chunks.length - 1;
};
const subtitleFor = (item, shot) => {
  const k = chunkAt(item.at, shot);
  if (k === null) return shot.chunks.join(' ');
  const two = shot.chunks.slice(k, k + 2);
  return (two.length ? two : shot.chunks.slice(-1)).join(' ');
};

// ---- STICK_FIGURE ---------------------------------------------------------------------------------------------------------
// A Film whose identifiers or comments name a person, a body part or a car body, and that imports nothing from ../illo/:
// it draws them with lines (v76's driver: a circle head and four strokes). The kit has Figure and Car for that.
const FIGURE_WORDS = /^(?:driver|drivers|person|people|man|men|woman|women|head|heads|arm|arms|leg|legs|hand|hands|body|mom|mum|friend|friends|car|cars|sedan|sedans|wheel|wheels)$/;
/** The person and car words a Film's code names without the kit ([] when it imports ../illo/ or names none). */
export const stickFigure = (code, name = '') => {
  const c = String(code ?? '');
  if (!c || /from\s+['"]\.\.\/illo\//.test(c)) return [];
  const comments = (c.match(/\/\*[\s\S]*?\*\/|(?:^|[^:\\])\/\/.*$/gm) ?? []).join(' ');
  const codeOnly = c.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1').replace(/'[^'\n]*'|"[^"\n]*"|`[^`]*`/g, ' ');
  const parts = [];
  for (const id of codeOnly.match(/[A-Za-z_$][\w$]*/g) ?? []) {
    if (id === name) continue;
    parts.push(id.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2').replace(/[_$]+/g, ' '));
  }
  // Vinari's car card (the app's screen), a steering wheel and a film's own id ("v70-in-hand") name no person and no car
  const text = `${parts.join(' . ')} . ${comments}`.toLowerCase().replace(/\bcar(?:'s)?\s+cards?\b|\bsteering\s+wheels?\b|\bv\d+(?:-[a-z0-9]+)+/g, ' ');
  return [...new Set((text.match(/[a-z]+/g) ?? []).filter((w) => FIGURE_WORDS.test(w)))];
};

// ---- the rules ------------------------------------------------------------------------------------------------------------
const pct = (x) => `${Math.round(x * 100)} %`;
const q = (s) => `"${String(s).replace(/\s+/g, ' ').trim().slice(0, 60)}"`;
const where = (s) => `beats[${s.beat}]${s.cut ? ' (cut)' : ''} ${s.type}`;
const defaultFilmCode = (root) => (name) => {
  if (typeof name !== 'string' || !/^[A-Z][A-Za-z0-9]{2,63}$/.test(name)) return null;
  try {
    return fs.readFileSync(path.join(root, 'src', 'scenes', 'film', `${name}.tsx`), 'utf8');
  } catch {
    return null;
  }
};

/** Every problem of `spec`'s text on screen: [{id, severity, line}].
 *  reg: the registry; timeline: the voice's (time-weighted shares, exact scene seconds); length: 15|20|30|45 (else
 *  guessed); ci + isNew: the cloud's errors; filmCode(name) -> the Film's code (default: src/scenes/film/<name>.tsx; null
 *  turns the Film checks that read code off). */
export const textProblems = (spec, {reg = loadRegistry(), timeline = null, length = null, ci = false, isNew = true, filmCode, root = ROOT} = {}) => {
  const code = filmCode === undefined ? defaultFilmCode(root) : filmCode;
  const shots = sceneList(spec, reg, {timeline, filmCode: code});
  const body = shots.filter((s) => s.cls !== 'end');
  const len = lengthClass(spec, {length, timeline});
  const out = [];
  const add = (id, line) => out.push({id, severity: SEVERITY[id][ci && isNew ? 0 : 1], line: `${id} ${line}`});
  const w = (s) => (timeline && s.secs !== null ? s.secs : s.chunks.length);
  const total = body.reduce((n, s) => n + w(s), 0);
  const share = (cls) => (total > 0 ? body.filter((s) => s.cls === cls).reduce((n, s) => n + w(s), 0) / total : 0);
  const beatsOf = (list) => [...new Set(list.map((s) => s.beat))].join(', ');
  const by = timeline ? 'of the time' : 'of the subtitle chunks';

  // TEXT_SHARE / PICTURE_SHARE
  const text = body.filter((s) => s.cls === 'text');
  if (total > 0 && share('text') > TEXT_SHARE_MAX)
    add('TEXT_SHARE', `text cards hold ${pct(share('text'))} ${by} (${pct(TEXT_SHARE_MAX)} at most): show the moments instead (CLAUDE.md, Story moments): beats ${beatsOf(text)}`);
  if (total > 0 && share('picture') < PICTURE_SHARE_MIN)
    add('PICTURE_SHARE', `pictures hold ${pct(share('picture'))} ${by} (${pct(PICTURE_SHARE_MIN)} at least): a moment drawn, a real screen or a photo, not a card or a chart${text.length ? `: beats ${beatsOf(text)} are text` : ''}`);
  // TEXT_CARDS
  if (body[0]?.cls === 'text') add('TEXT_CARDS', `${where(body[0])} opens the film on a text card: frame 0 is a picture (a punch word may sit on it)`);
  for (let k = 1; k < body.length; k++)
    if (body[k].cls === 'text' && body[k - 1].cls === 'text') add('TEXT_CARDS', `${where(body[k - 1])} and ${where(body[k])} are two text cards in a row: make one of them a picture`);
  if (text.length > TEXT_MAX[len]) add('TEXT_CARDS', `${text.length} text scenes in a ${len} s film (${TEXT_MAX[len]} at most): beats ${beatsOf(text)}; show the moments instead`);
  // SCREEN_WORDS / PUNCH_WORDS / DUP_SUBTITLE per scene
  let compares = 0;
  for (const s of body) {
    const cap = s.entry ? s.entry.words : 5;
    if (typeof cap === 'number' && s.words > cap)
      add('SCREEN_WORDS', `${where(s)} draws ${s.words} words (${cap} at most): keep the punch, the subtitle says the rest${s.items.length ? `: ${s.items.filter((x) => x.words).map((x) => q(x.text)).join(', ')}` : ''}`);
    for (const x of s.items) {
      const max = x.punch ? Math.min(x.max ?? PUNCH_MAX, PUNCH_MAX) : x.max;
      if (typeof max === 'number' && x.words > max) add(x.punch ? 'PUNCH_WORDS' : 'SCREEN_WORDS', `${where(s)} ${x.path} ${q(x.text)} is ${x.words} words (${x.punch ? 'a punch is' : 'this one is'} ${max} at most)`);
    }
    const marks = s.items.reduce((n, x) => n + punchMarks(x.text), 0);
    if (marks > PUNCH_MARKS) add('PUNCH_WORDS', `${where(s)} has ${marks} *punch* marks (${PUNCH_MARKS} a scene at most)`);
    // a diagram's labels (2 words at most) name the part they point at, whatever the voice says (spec 8: "labels ≤ 2 words")
    const diagram = s.type === 'Film' && s.scene.look === 'diagram';
    for (const x of s.items) {
      if (!x.dup || !x.words || (diagram && x.words <= 2)) continue;
      const sub = subtitleFor(x, s);
      if (isDup(x.text, sub)) add('DUP_SUBTITLE', `${where(s)} ${x.path} ${q(x.text)} is what the subtitle says (${q(sub)}): show something else, or nothing`);
    }
    // LIST_TEXT
    if (s.type === 'List') {
      const rows = Array.isArray(s.scene.items) ? s.scene.items : [];
      const strike = rows.some((r) => r && typeof r === 'object' && r.strike);
      if (s.scene.compare !== true) add('LIST_TEXT', `${where(s)} is a list${strike ? ' with a strike' : ''}: a List only as a 2 or 3 row comparison ("compare": true, 3 words a row${strike ? ', strike only there' : ''}); otherwise show the moment`);
      else {
        compares++;
        const long = rows.filter((r) => countWords(typeof r === 'string' ? r : r?.text) > 3);
        if (rows.length < 2 || rows.length > 3) add('LIST_TEXT', `${where(s)} compares ${rows.length} rows (2 or 3)`);
        if (long.length) add('LIST_TEXT', `${where(s)} ${long.map((r) => q(typeof r === 'string' ? r : r.text)).join(', ')}: 3 words a row at most`);
        if (compares === 2) add('LIST_TEXT', `${where(s)} is the second comparison List: one a film`);
      }
    } else if (s.items.some((x) => /^items\[\d+\]/.test(x.path)) && (Array.isArray(s.scene.items) ? s.scene.items : []).some((r) => r && typeof r === 'object' && r.strike))
      add('LIST_TEXT', `${where(s)} strikes a row: a strike only in a comparison List`);
  }
  // LINEART
  const films = body.filter((s) => s.type === 'Film');
  for (const s of films)
    if (!LOOKS.includes(s.scene.look))
      add('LINEART', `${where(s)} ${s.scene.name ?? ''} has no "look"${s.scene.look !== undefined ? ` (${q(s.scene.look)} is not one)` : ''}: "illustrated" for a moment (people and cars from ../illo), "diagram" for how a part works (line art only there)`);
  const diagrams = films.filter((s) => s.scene.look === 'diagram');
  if (diagrams.length > 1) add('LINEART', `${diagrams.length} diagram Films (beats ${beatsOf(diagrams)}): one a film at most, the others illustrated`);
  // PACE
  if (body.length < MIN_SCENES[len]) add('PACE', `${body.length} scene${body.length === 1 ? '' : 's'} in a ${len} s film (${MIN_SCENES[len]} at least): a new picture every 2 to 3 s, "cuts" split a long sentence`);
  // SCENE_LONG
  for (const s of body) {
    const max = Array.isArray(s.entry?.dur) ? s.entry.dur[2] : null;
    const secs = timeline && s.secs !== null ? s.secs : s.est;
    if (typeof max === 'number' && secs > max) add('SCENE_LONG', `${where(s)} runs ${timeline ? '' : 'about '}${secs.toFixed(1)} s (${max} s at most): split it with "cuts", a new picture on a chunk`);
  }
  // STICK_FIGURE
  if (code) {
    const done = new Set();
    for (const s of films) {
      if (done.has(s.scene.name)) continue;
      done.add(s.scene.name);
      const hits = stickFigure(code(s.scene.name), s.scene.name);
      if (hits.length) add('STICK_FIGURE', `${where(s)} ${s.scene.name} draws ${hits.slice(0, 4).join(', ')} without the kit: draw people with Figure and cars with Car from ../illo, never lines`);
    }
  }
  return out;
};

/** One line: 'pictures 82 % · text 0 % · cards 0 · max 3 words · 9 scenes'. */
export const summary = (spec, {reg = loadRegistry(), timeline = null, filmCode, root = ROOT} = {}) => {
  const code = filmCode === undefined ? defaultFilmCode(root) : filmCode;
  const body = sceneList(spec, reg, {timeline, filmCode: code}).filter((s) => s.cls !== 'end');
  const w = (s) => (timeline && s.secs !== null ? s.secs : s.chunks.length);
  const total = body.reduce((n, s) => n + w(s), 0) || 1;
  const sh = (cls) => pct(body.filter((s) => s.cls === cls).reduce((n, s) => n + w(s), 0) / total);
  const max = body.reduce((m, s) => Math.max(m, s.words), 0);
  return `pictures ${sh('picture')} · text ${sh('text')} · data ${sh('data')} · cards ${body.filter((s) => s.cls === 'text').length} · max ${max} word${max === 1 ? '' : 's'} · ${body.length} scene${body.length === 1 ? '' : 's'}`;
};

// ---- the oracle (spec 7.6) and the cases --------------------------------------------------------------------------------
// The rules on v62..v76, chunk-weighted, isNew forced: exactly the ids each film shows. The spec's table (S) and what it
// did not list (+), each found and explained (scenes.md 7.6: "if the implementation disagrees with a row, find out why"):
// + PICTURE_SHARE v76: 11 of its 25 chunks are pictures (44 %); with 56 % text the rest cannot reach 50 %.
// + TEXT_CARDS v76 is "scene 0" and "in a row" but not "3 > 2": v76 says 466 letters, the brief's 45 s budget (465), where
//   3 text scenes are allowed. The spec took it for a 30 s film. (Its PACE is then 4 of 12.)
// + SCREEN_WORDS v66, v67, v69 (a Film's own text: v66 draws 3 lines and a label, 8 words; v67 the chat, 9; v69 11 words
//   and a 4-word row), v74 and v67 again (a 4-word Photo caption, a 4-word Phone callout, in 3-word slots): the spec
//   counted the scene totals of spec props only, not a Film's own text and not the per-item caps of the registry.
// + DUP_SUBTITLE v62, v71, v74, v76's Film and v64's Film: a Film's labels carry no `at`, so they meet every chunk the Film
//   is on (9 to 19 of them): "საბაჟო" under "საბაჟოზე ...", "ინჟექტორი" under the line that says it. A diagram Film's
//   labels of 1 or 2 words are the diagram's own (never DUP), so "look": "diagram" fixes the old diagrams.
// + SCENE_LONG (notes on the Mac): the Films and Titles of 9 to 19 s that the spec's audit measured as 5 to 7 s a scene.
// + STICK_FIGURE: the Films that draw a car, a driver, a hand or an arm in lines, every one before the kit (v64's car
//   card label, v71's pedal arm and v75's pulley "wheel" are the rule's honest false alarms: warnings).
// PACE: 14 of the 15 ("most PACE"); v67 has 6 scenes in a 20 s film.
export const ORACLE = {
  'v62-two-questions': ['DUP_SUBTITLE', 'LINEART', 'PACE', 'STICK_FIGURE'],
  'v63-price-ride': ['SCREEN_WORDS', 'LIST_TEXT', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
  'v64-cat-gallery': ['TEXT_SHARE', 'TEXT_CARDS', 'DUP_SUBTITLE', 'LIST_TEXT', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
  'v65-blocked-exit': ['LINEART', 'PACE', 'STICK_FIGURE'],
  'v66-car-talks': ['SCREEN_WORDS', 'LINEART', 'PACE', 'STICK_FIGURE'],
  'v67-three-drivers': ['SCREEN_WORDS', 'LIST_TEXT', 'LINEART', 'STICK_FIGURE'],
  'v68-rare-car': ['LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
  'v69-code-nod': ['SCREEN_WORDS', 'LINEART', 'PACE'],
  'v70-in-hand': ['LINEART', 'PACE'],
  'v71-neutral-myth': ['DUP_SUBTITLE', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
  'v72-vin-letters': ['LINEART', 'PACE'],
  'v73-tank-arrow': ['TEXT_SHARE', 'TEXT_CARDS', 'LINEART', 'PACE', 'STICK_FIGURE'],
  'v74-bid-budget': ['DUP_SUBTITLE', 'SCREEN_WORDS', 'LINEART', 'PACE'],
  'v75-one-belt': ['LIST_TEXT', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
  'v76-phone-pump': ['TEXT_SHARE', 'PICTURE_SHARE', 'TEXT_CARDS', 'SCREEN_WORDS', 'DUP_SUBTITLE', 'LIST_TEXT', 'LINEART', 'PACE', 'SCENE_LONG', 'STICK_FIGURE'],
};
// the spec's rows (S), which must hold whatever the additions above become
const ORACLE_SPEC = {
  'v76-phone-pump': ['TEXT_SHARE', 'TEXT_CARDS', 'SCREEN_WORDS', 'DUP_SUBTITLE', 'LIST_TEXT', 'LINEART', 'PACE'],
  'v64-cat-gallery': ['TEXT_SHARE', 'TEXT_CARDS', 'LIST_TEXT', 'DUP_SUBTITLE'],
  'v73-tank-arrow': ['TEXT_SHARE', 'TEXT_CARDS', 'PACE'],
  'v63-price-ride': ['SCREEN_WORDS', 'LIST_TEXT'],
  'v67-three-drivers': ['SCREEN_WORDS', 'LIST_TEXT'],
  'v75-one-belt': ['LIST_TEXT'],
};
// what each oracle film must NOT show (the spec's explicit "no")
const ORACLE_NOT = {'v67-three-drivers': ['DUP_SUBTITLE'], 'v76-phone-pump': ['PUNCH_WORDS']};
// the shares the spec measured (chunk-weighted text share)
const ORACLE_TEXT = {'v76-phone-pump': 56, 'v64-cat-gallery': 35, 'v73-tank-arrow': 33, 'v63-price-ride': 18, 'v67-three-drivers': 15, 'v75-one-belt': 15};

const baseSpecs = (root, n) => {
  const dir = path.join(root, 'specs');
  return fs
    .readdirSync(dir)
    .filter((f) => /^v\d+-[a-z0-9-]+\.json$/.test(f) && !/-r\d+\.json$/.test(f) && !/--h\d+/.test(f))
    .map((f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8')))
    .filter((s) => typeof s.id === 'string' && (s.lang ?? 'ka') === 'ka')
    .sort((a, b) => vNumber(a.id) - vNumber(b.id))
    .slice(-n);
};

const selfTest = async () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) {
      bad++;
      console.log(`  FAIL ${what}`);
    }
  };
  const ids = (list) => [...new Set(list.map((p) => p.id))].sort();
  // words
  ok(countWords('1963') === 0 && countWords('300 000 ₾') === 0 && countWords('42 დღე') === 1 && countWords('*ბუმ*?') === 1 && countWords(' + მუხტი') === 1, 'countWords');
  ok(punchMarks('ეს *ბუმ* და *ვაიმე*') === 2, 'punchMarks');
  // DUP: the hyphen, the prefix stems, stop words, numbers, identity labels
  ok(isDup('Vinari', 'Vinari-ს გახსნი.'), 'DUP Vinari-ს');
  ok(isDup('დედა:', 'ბენზინს ასხამ, დედა გწერს.'), 'DUP დედა');
  ok(!isDup('სად ხარ?', 'დედა გწერს. უპასუხებ და'), 'DUP სად ხარ: ხარ is not said');
  ok(!isDup('და რომ', 'და რომ'), 'DUP stop words only');
  ok(!isDup('300 ₾', 'ფასი 300 ₾'), 'DUP numbers');
  ok(isDup('ტექპასპორტი', 'ტექპასპორტს ეძებ.'), 'DUP a case ending');
  // the classes: a Title with a picture behind it and 3 words is a picture, with 4 words still text
  const reg = loadRegistry();
  ok(classOf({type: 'Title', bg: 'photos/x', lines: [{text: 'ერთი ორი სამი'}]}, reg, 3) === 'picture', 'clsIf bg, 3 words');
  ok(classOf({type: 'Title', bg: 'photos/x'}, reg, 4) === 'text', 'clsIf bg, 4 words');
  ok(classOf({type: 'List', compare: true}, reg) === 'data' && classOf({type: 'Film', look: 'diagram'}, reg) === 'data' && classOf({type: 'Film', look: 'illustrated'}, reg) === 'picture', 'clsIf compare, look');
  // the length class: the letters, or the length asked for
  ok(lengthClass({beats: [{say: 'ა'.repeat(466)}]}) === 45 && lengthClass({beats: [{say: 'ა'.repeat(300)}]}) === 30 && lengthClass({beats: []}, {length: 20}) === 20, 'lengthClass');
  // a cut splits a beat: two shots, the chunks split at the cut, `at` counted from the cut
  const cutSpec = {
    beats: [
      {say: 'ა | ბ | გ', show: 'ბენზინს ასხამ, | დედა გწერს. | უპასუხებ?', scene: {type: 'Phone', src: 'x'}, cuts: [{chunk: 1, scene: {type: 'Title', lines: [{text: 'დედა', at: 0}]}}]},
      {say: 'დ', scene: {type: 'EndCard', tagline: 'დ'}},
    ],
  };
  const sh = sceneList(cutSpec, reg);
  ok(sh.length === 3 && sh[0].chunks.length === 1 && sh[1].chunks.length === 2 && sh[1].cut && sh[2].cls === 'end', 'cuts split a beat');
  ok(ids(textProblems(cutSpec, {reg, length: 15, filmCode: null})).includes('DUP_SUBTITLE'), 'cut: at 0 is the cut chunk');
  // the timeline weights by time: a long picture and a short card
  const tlSpec = {beats: [{say: 'ა | ბ', scene: {type: 'Phone', src: 'x'}}, {say: 'გ | დ', scene: {type: 'Title', lines: ['ჰოპ']}}, {say: 'ე', scene: {type: 'EndCard'}}]};
  const tl = {duration: 10, beats: [{start: 0, end: 8, chunks: [{start: 0}, {start: 4}]}, {start: 8, end: 9, chunks: [{start: 8}, {start: 8.5}]}, {start: 9, end: 10, chunks: [{start: 9}]}]};
  ok(!ids(textProblems(tlSpec, {reg, timeline: tl, filmCode: null})).includes('TEXT_SHARE') && ids(textProblems(tlSpec, {reg, filmCode: null})).includes('TEXT_SHARE'), 'timeline weights by time');
  // severity: errors only for a new film in the cloud; SCENE_LONG a note on the Mac
  const v76 = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', 'v76-phone-pump.json'), 'utf8'));
  ok(textProblems(v76, {reg, ci: true, isNew: true}).some((p) => p.severity === 'error') && !textProblems(v76, {reg, ci: true, isNew: false}).some((p) => p.severity === 'error'), 'severity: new in the cloud only');
  ok(textProblems(v76, {reg, ci: false}).every((p) => p.severity !== 'error'), 'severity: never an error on the Mac');
  // a compare List: 2..3 rows, 3 words a row, one a film
  const cmp = (items, n = 1) => ({beats: [{say: 'ა | ბ | გ', scene: {type: 'Phone', src: 'x'}}, ...Array.from({length: n}, () => ({say: 'ა | ბ', scene: {type: 'List', compare: true, items}}))]});
  ok(!ids(textProblems(cmp([{text: 'ახალი'}, {text: 'ძველი', strike: true}]), {reg, filmCode: null})).includes('LIST_TEXT'), 'compare List passes');
  ok(ids(textProblems(cmp([{text: 'ა'}, {text: 'ბ'}, {text: 'გ'}, {text: 'დ'}]), {reg, filmCode: null})).includes('LIST_TEXT'), 'compare List of 4 rows');
  ok(ids(textProblems(cmp([{text: 'ერთი ორი სამი ოთხი'}, {text: 'ბ'}]), {reg, filmCode: null})).includes('LIST_TEXT'), 'compare row of 4 words');
  ok(ids(textProblems(cmp([{text: 'ა'}, {text: 'ბ'}], 2), {reg, filmCode: null})).includes('LIST_TEXT'), 'two compare Lists');
  // the illustrated scenes (a registry entry like spec 4.3's Call): the name is an identity label, the punch is capped
  const regA = {
    ...reg,
    Call: {cls: 'picture', stagings: ['hand', 'desk'], text: [{path: 'name', max: 3, dup: false}, {path: 'label', max: 2, dup: false}, {path: 'word', max: 3}], words: 5, dur: [1.2, 3, 6]},
    Person: {cls: 'picture', stagings: ['solo', 'pair'], text: [{path: 'acts[].say', max: 3}, {path: 'word', max: 3}], words: 5, dur: [1.2, 3, 6]},
    Chat: {cls: 'picture', stagings: ['thread', 'bubble'], text: [{path: 'messages[]', max: 4}, {path: 'contact', max: 2, dup: false}, {path: 'word', max: 3}], words: 9, dur: [1.5, 3, 6]},
  };
  const call = {beats: [{say: 'ა | ბ | გ', show: 'ბენზინს ასხამ, | დედა გწერს. | ჰო', scene: {type: 'Call', staging: 'hand', name: 'დედა', word: {text: 'ბუმ ბუმ ბუმ ბუმ', at: 1}}}]};
  const pc = textProblems(call, {reg: regA, length: 15, filmCode: null});
  ok(!ids(pc).includes('DUP_SUBTITLE') && pc.some((p) => p.id === 'PUNCH_WORDS' && p.line.includes('word')), 'Call: name is identity, word is a punch');
  const talk = {beats: [{say: 'ა | ბ', show: 'სად ხარ? | გზაში ვარ', scene: {type: 'Person', staging: 'pair', acts: [{at: 1, say: 'გზაში ვარ'}]}}]};
  ok(ids(textProblems(talk, {reg: regA, length: 15, filmCode: null})).includes('DUP_SUBTITLE'), 'Person: a bubble that says the subtitle');
  const chat = {beats: [{say: 'ა', show: 'დედა გწერს', scene: {type: 'Chat', staging: 'thread', contact: 'დედა', messages: [{text: 'სად ხარ?', at: 0}, {text: 'გზაში ვარ', at: 0}, {text: 'კარგი, მოდი', at: 0}]}}]};
  ok(!ids(textProblems(chat, {reg: regA, length: 15, filmCode: null})).some((x) => x === 'SCREEN_WORDS' || x === 'DUP_SUBTITLE'), 'Chat: 6 words fit its 9');
  // LINEART: no look, two diagrams; the illustrated Film with the kit passes STICK_FIGURE
  const film = (look, n = 1) => ({beats: Array.from({length: n}, (_, i) => ({say: 'ა | ბ', scene: {type: 'Film', name: `V90Test${i}`, ...(look ? {look} : {})}}))});
  ok(ids(textProblems(film(null), {reg, filmCode: null})).includes('LINEART') && ids(textProblems(film('diagram', 2), {reg, filmCode: null})).includes('LINEART') && !ids(textProblems(film('illustrated', 2), {reg, filmCode: null})).includes('LINEART'), 'LINEART');
  ok(stickFigure("import {Figure} from '../illo/figure';\nconst driverHead = 1;").length === 0, 'STICK_FIGURE: the kit');
  ok(stickFigure('// the driver\nconst headR = 3; const carX = 2;', 'V90X').join() === 'head,car,driver', 'STICK_FIGURE: names');
  ok(stickFigure('const alarm = 1; const handle = 2; const cardY = 3;').length === 0, 'STICK_FIGURE: whole words only');
  // a Film's own text: a default counts only while its prop is unset
  ok(filmText("const a = p.label ?? 'ერთ აპში'; const b = 'მიწა';", {label: 'x'}).map((x) => x.text).join() === 'მიწა', 'filmText defaults');
  // the visual rules (tools/ci/visual.mjs): the registry's stagings joined, HOOK_REPEAT, MOMENT_REPEAT, IDEA_REPEAT
  const vis = await import('./visual.mjs');
  ok(vis.STAGINGS.Phone[0] === 'device' && vis.STAGINGS.Notification[0] === 'float' && vis.STAGINGS.Twist?.[0] === 'crash', 'STAGINGS: the registry joined, the six keep their order');
  vis.STAGINGS.Call ??= ['hand', 'desk', 'mount', 'pocket', 'missed']; // as the wave A registry entry will (spec 4.3)
  const callAt = (staging, extra = {}) => ({type: 'Call', staging, name: 'დედა', ...extra});
  const mk = (id, ...scenes) => ({id, beats: scenes.map((scene) => ({say: 'ა', scene}))});
  const filmOf = (s) => ({id: s.id, visual: vis.signature(s)});
  const earlier = [mk('v80-a', callAt('hand', {where: 'station'}), {type: 'Phone', src: 'x'}), mk('v81-b', {type: 'Phone', src: 'y'}, callAt('desk')), mk('v82-c', {type: 'Twist', staging: 'whip'}, callAt('hand', {where: 'road'}))];
  const specs = new Map(earlier.map((s) => [s.id, s]));
  const films = earlier.map(filmOf);
  const mom = (s) => vis.momentRepeats(s, films, {specOf: (id) => specs.get(id) ?? null});
  ok(mom(mk('v83-d', {type: 'Twist', staging: 'whip'})).some((l) => l.startsWith('HOOK_REPEAT')), 'HOOK_REPEAT: opens as one of the last 2');
  ok(!mom(mk('v83-d', callAt('hand', {where: 'station'}))).some((l) => l.startsWith('HOOK_REPEAT')), 'HOOK_REPEAT: the 3rd last is free');
  ok(mom(mk('v83-d', {type: 'Phone', src: 'z'}, callAt('hand', {where: 'garage'}))).some((l) => /^MOMENT_REPEAT Call:hand is in v80-a and v82-c/.test(l)), 'MOMENT_REPEAT: 3 of 5');
  ok(!mom(mk('v83-d', {type: 'Phone', src: 'z'}, callAt('desk', {where: 'garage'}))).some((l) => l.startsWith('MOMENT_REPEAT')), 'MOMENT_REPEAT: 2 of 5 is fine');
  ok(mom(mk('v83-d', {type: 'Phone', src: 'z'}, callAt('hand', {where: 'road'}))).some((l) => /^MOMENT_REPEAT Call:hand · name=დედა · where=road is the picture v82-c/.test(l)), 'MOMENT_REPEAT: the same picture');
  ok(!mom(mk('v83-d', {type: 'Phone', src: 'y'}, {type: 'Phone', src: 'y'})).some((l) => l.startsWith('MOMENT_REPEAT')), 'MOMENT_REPEAT: the app screens are the signature rule');
  // a Film composed of the kit's parts: the same composition again, and another one
  const kitFilm = (who, where, pose) => `import {Figure} from '../illo/figure';\nimport {Backdrop} from '../illo/backdrop';\nimport {Handset} from '../illo/handset';\nimport {IlloDefs} from '../illo/solid';\nexport const X = () => (<><IlloDefs uid="a" /><Backdrop kind="${where}" time={'night'} /><Figure cast={{is: '${who}', pose: '${pose}'}} face="worried" x={540} /><Handset w={300} screen={(w, h) => (w > h ? null : null)} /></>);`;
  const codes = {V80Film: kitFilm('mom', 'station', 'phoneEar'), V83Film: kitFilm('mom', 'station', 'phoneEar'), V84Film: kitFilm('mechanic', 'garage', 'shrug')};
  ok([...vis.compositionOf(codes.V80Film)].sort().join() === 'Backdrop,Figure,Handset,face:worried,is:mom,kind:station,pose:phoneEar,time:night', `compositionOf (${[...vis.compositionOf(codes.V80Film)].join()})`);
  const ideaFilms = [{id: 'v80-a', visual: ['Film:V80Film']}];
  ok(vis.ideaRepeats(mk('v83-d', {type: 'Film', name: 'V83Film'}), ideaFilms, {filmCode: (n) => codes[n] ?? null}).some((l) => l.startsWith('IDEA_REPEAT V83Film composes')), 'IDEA_REPEAT: the same kit composition');
  ok(!vis.ideaRepeats(mk('v84-e', {type: 'Film', name: 'V84Film'}), ideaFilms, {filmCode: (n) => codes[n] ?? null}).length, 'IDEA_REPEAT: a new composition');
  ok(vis.ideaRepeats(mk('v83-d'), ideaFilms, {ideaOf: () => 'Mom calls at the pump: the phone rings in his hand while the tank fills', idea: 'At the pump mom calls: his phone rings in the hand as the tank fills up'}).some((l) => l.startsWith('IDEA_REPEAT the new visual')), 'IDEA_REPEAT: the same idea line');
  // no old film repeats the idea of its category's last 3 (they were all new)
  const ledger = (() => {
    try {
      return JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', '.studio.json'), 'utf8'));
    } catch {
      return {};
    }
  })();
  const entries = Object.values(ledger).filter((e) => e && typeof e.id === 'string' && typeof e.idea === 'string');
  const ideaOf = (id) => entries.find((e) => e.id === id)?.idea ?? null;
  let falseIdeas = 0;
  for (const e of entries) {
    const prior = entries
      .filter((x) => x.category === e.category && vNumber(x.id) < vNumber(e.id))
      .sort((x, y) => vNumber(x.id) - vNumber(y.id))
      .map((x) => ({id: x.id, visual: []}));
    falseIdeas += vis.ideaRepeats({beats: []}, prior, {ideaOf, idea: e.idea}).length;
  }
  ok(falseIdeas === 0, `IDEA_REPEAT: no old film's idea repeats (${falseIdeas})`);
  delete vis.STAGINGS.Call;

  // the oracle
  // (the 15 films the spec measured, by id: later films do not move the oracle)
  const last = Object.keys(ORACLE).map((id) => JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', `${id}.json`), 'utf8')));
  ok(last.length === 15 && last.every((s, k) => vNumber(s.id) === 62 + k), 'the oracle is v62..v76');
  for (const spec of last) {
    const got = ids(textProblems(spec, {reg, ci: true, isNew: true}));
    ok(got.includes('LINEART'), `oracle ${spec.id}: LINEART (no look)`);
    const want = [...(ORACLE[spec.id] ?? [])].sort();
    ok(want.join() === got.join(), `oracle ${spec.id}: want ${want.join(' ')}, got ${got.join(' ')}`);
    const spec7 = (ORACLE_SPEC[spec.id] ?? []).filter((x) => !got.includes(x));
    ok(!spec7.length, `oracle ${spec.id}: the spec's row (${spec7.join(' ')} missing)`);
    for (const x of ORACLE_NOT[spec.id] ?? []) ok(!got.includes(x), `oracle ${spec.id}: no ${x}`);
    if (ORACLE_TEXT[spec.id] !== undefined) {
      const sum = summary(spec, {reg});
      const t = Number(/text (\d+) %/.exec(sum)?.[1]);
      ok(t === ORACLE_TEXT[spec.id], `oracle ${spec.id}: text ${ORACLE_TEXT[spec.id]} %, got ${t} % (${sum})`);
    } else ok(/text 0 %/.test(summary(spec, {reg})), `oracle ${spec.id}: text 0 %`);
  }
  // the details the spec names
  const lines = (id) => textProblems(JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', `${id}.json`), 'utf8')), {reg, ci: true, isNew: true}).map((p) => p.line);
  const l76 = lines('v76-phone-pump');
  ok(l76.some((l) => /^DUP_SUBTITLE .*"დედა:"/.test(l)), 'v76: DUP "დედა:"');
  ok(l76.some((l) => /^SCREEN_WORDS beats\[2\] List draws 7 words/.test(l)) && l76.some((l) => /^SCREEN_WORDS beats\[8\] Title draws 7 words/.test(l)), 'v76: List 7, Title 7');
  ok(l76.some((l) => /^TEXT_CARDS beats\[0\] Title opens/.test(l)) && l76.some((l) => /^TEXT_CARDS .*Title and .*List are two text cards in a row/.test(l)), 'v76: scene 0, in a row');
  ok(l76.some((l) => /^LIST_TEXT .*with a strike/.test(l)), 'v76: strike without compare');
  ok(lines('v64-cat-gallery').some((l) => /^DUP_SUBTITLE .*"Vinari"/.test(l)), 'v64: DUP "Vinari"');
  ok(lines('v63-price-ride').some((l) => /^SCREEN_WORDS .*List draws 7 words/.test(l)), 'v63: List 7');
  ok(lines('v67-three-drivers').some((l) => /^SCREEN_WORDS .*List draws 9 words/.test(l)), 'v67: List 9');
  ok(lines('v73-tank-arrow').some((l) => /^TEXT_CARDS beats\[0\] Title opens/.test(l)), 'v73: scene 0');
  const pace = last.filter((s) => textProblems(s, {reg, ci: true, isNew: true}).some((p) => p.id === 'PACE')).length;
  ok(pace >= 8, `most of the 15 are PACE (${pace})`);
  console.log(bad ? `screentext: ${bad} case${bad === 1 ? '' : 's'} failed` : 'screentext: every case and the oracle pass');
  return bad ? 1 : 0;
};

// ---- CLI -------------------------------------------------------------------------------------------------------------------
// (not a top-level await: the test imports visual.mjs, which imports this module, and must find it evaluated)
const main = async () => {
  const args = process.argv.slice(2);
  if (args[0] === '--test') return selfTest();
  const flag = (k) => args.includes(k);
  const opt = (k) => {
    const i = args.indexOf(k);
    return i >= 0 ? args[i + 1] : undefined;
  };
  const reg = loadRegistry();
  const readSpec = (id) => {
    const dir = path.join(ROOT, 'specs');
    const f = path.join(dir, `${id}.json`);
    if (fs.existsSync(f)) return JSON.parse(fs.readFileSync(f, 'utf8'));
    for (const g of fs.readdirSync(dir).filter((x) => x.endsWith('.json') && !x.startsWith('.'))) {
      try {
        const s = JSON.parse(fs.readFileSync(path.join(dir, g), 'utf8'));
        if (s.id === id) return s;
      } catch {}
    }
    return null;
  };
  const timelineOf = (spec) => {
    try {
      const t = JSON.parse(fs.readFileSync(path.join(ROOT, 'public', 'vo', spec.id, 'timeline.json'), 'utf8'));
      return t.beats?.length === spec.beats?.length ? t : null;
    } catch {
      return null;
    }
  };
  const n = opt('--last');
  const specs = n ? baseSpecs(ROOT, Number(n) || 15) : [readSpec(args.find((a) => !a.startsWith('-') && a !== opt('--len')))];
  if (!specs.length || !specs[0]) {
    console.error('usage: node tools/ci/screentext.mjs <id> [--len 15|20|30|45] [--new] [--ci] | --last 15 [--new] | --test');
    return 2;
  }
  let errors = 0;
  for (const spec of specs) {
    const timeline = flag('--chunks') ? null : timelineOf(spec);
    const isNew = flag('--new') || Boolean(n) || isNewFilm(spec.id.replace(/-r\d+$/, ''));
    const found = textProblems(spec, {reg, timeline, length: opt('--len'), ci: flag('--ci') || Boolean(n), isNew});
    console.log(`${spec.id}  ${summary(spec, {reg, timeline})}${timeline ? '  (by time)' : ''}  ${lengthClass(spec, {length: opt('--len'), timeline})} s${isNew ? '' : ', older film: warnings only'}`);
    for (const p of found) console.log(`  ${p.severity === 'error' ? 'ERROR ' : p.severity === 'note' ? 'note ' : ''}${p.line}`);
    errors += found.filter((p) => p.severity === 'error').length;
  }
  return errors && !n ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().then((code) => process.exit(code));
