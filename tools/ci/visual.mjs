// A film's visual signature, and the rule against repeating the looks of a category's last films (the owner,
// 2026-09-27: "the same graphics are generated every time ... each time refined AND different").
//   signature(spec)  the ordered scenes as short tokens: "QRCard:night", "Phone:tilt/05-customs",
//                    "Wire3D:hero/sedan-sports", "Title" ... (EndCard left out: every film ends on it)
//   repeats(spec, category, specsDir, ledger)  the problems, one line each, or []: the category's signature scene
//                    (the first of each type in ci/categories.json "signature") repeating the staging of either of
//                    the category's last 2 films, or the whole signature equal to one of its last 5.
//   filmScenes(spec) / filmName(id)  the film's own scenes ("type": "Film", src/scenes/film/<Name>.tsx): one new visual
//                    per film, written for it (CLAUDE.md, Scenes: Film scenes); a Film token is "Film:<Name>".
//   pageFilms / feedRepeats / picturesText  the same for the whole page (every category): the illustrated scenes and the
//                    kit are shared, so a picture never comes back within the page's last 3 films (FEED_REPEAT)
//   screensShown(root, spec)  the app screens a spec shows (the free idea's FREE_SCREEN rule)
// Read by tools/ci/prompt.mjs (--record stores the signature; the brief lists the last ones) and tools/check.mjs.
import fs from 'node:fs';
import path from 'node:path';
import {loadRegistry} from './screentext.mjs';

// every staged scene type: its stagings, the default first (CLAUDE.md, Scenes; src/scenes/*.tsx and staging/)
export const STAGINGS = {
  QRCard: ['windshield', 'street', 'night', 'topdown'],
  MapPin: ['city', 'walk', 'floors'],
  Wave: ['mic', 'radial', 'seismo'],
  Calendar: ['month', 'tearoff', 'ruler'],
  Notification: ['float', 'lock', 'desk', 'stack'], // the default is "lock" when the lock prop is on, else "float"
  Phone: ['device', 'tilt', 'loupe'],
  // the story scenes (2026-10-06): src/scenes/PhotoStory.tsx and friends, the stories category's signature
  PhotoStory: ['bleed', 'print', 'window', 'depth'],
  KineticHeadline: ['mask', 'slam', 'stack', 'strike', 'type'],
  BigNumber: ['odometer', 'rewind', 'scrub'],
  Twist: ['crash', 'whip', 'glitch'],
  Split: ['wipe', 'stack', 'slide'],
  Timeline: ['ruler', 'feed', 'zoom'],
};
const LAST_STAGING = 2; // a signature scene never repeats the staging of the category's last 2 films
const LAST_WHOLE = 5; // the whole signature never equals one of the category's last 5

// The scene registry's stagings (src/data/scenes.json; the illustrated scenes, 2026-10-06): every scene type with
// stagings joins the rules here, the ones above keep theirs and their order (the first is the default).
for (const [type, e] of Object.entries(loadRegistry())) if (!STAGINGS[type] && Array.isArray(e?.stagings) && e.stagings.length) STAGINGS[type] = e.stagings.map(String);

/** The staging a scene is drawn in: its own, or its type's default. */
export const stagingOf = (sc) => {
  const list = STAGINGS[sc?.type];
  if (!list) return null;
  if (sc.staging && list.includes(sc.staging)) return sc.staging;
  if (sc.type === 'Notification') return sc.lock ? 'lock' : 'float';
  return list[0];
};
const models = (m) =>
  (Array.isArray(m) ? m : [m])
    .map((x) => (typeof x === 'string' ? x : x?.name))
    .filter(Boolean)
    .join('+');
/** The Film scene name of an id: v26-night-scan -> V26NightScan, v26-night-scan-r1 -> V26NightScanR1. */
export const filmName = (id) =>
  String(id)
    .split(/[^a-z0-9]+/i)
    .filter(Boolean)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join('');
/** A valid film scene name (src/scenes/film/<Name>.tsx; a leading "_" is never a film). */
export const FILM_NAME = /^[A-Z][A-Za-z0-9]{2,63}$/;
/** Every scene of a beat: its own and its mid-beat cuts' (fx films: "cuts": [{chunk, scene}]). */
export const beatScenes = (b) => [b?.scene, ...(Array.isArray(b?.cuts) ? b.cuts.map((c) => c?.scene) : [])].filter((sc) => sc && typeof sc === 'object');
/** The spec's Film scenes, in order: [{i (beat), name}]. */
export const filmScenes = (spec) =>
  (Array.isArray(spec?.beats) ? spec.beats : []).flatMap((b, i) => beatScenes(b).filter((sc) => sc.type === 'Film').map((sc) => ({i, name: typeof sc.name === 'string' ? sc.name : ''})));
/** One scene as a token. */
export const token = (sc) => {
  const t = String(sc?.type ?? '?');
  if (t === 'Film') return `Film:${String(sc.name ?? '?').slice(0, 64)}`;
  if (t === 'Wire3D') return `Wire3D:${sc.shot ?? 'hero'}/${models(sc.models) || '?'}`;
  if (t === 'Phone') return `Phone:${stagingOf(sc)}/${sc.src ?? '?'}`;
  const st = stagingOf(sc);
  return st ? `${t}:${st}` : t;
};
/** The film's visual signature: its scenes in order, as tokens (EndCard left out). */
export const signature = (spec) => (Array.isArray(spec?.beats) ? spec.beats.flatMap(beatScenes).filter((sc) => sc.type && sc.type !== 'EndCard').map(token) : []);
/** A token's type and staging ("Phone:tilt/05-customs" -> ["Phone", "tilt"]). */
const split = (tok) => {
  const [type, rest = ''] = String(tok).split(':');
  return [type, rest.split('/')[0]];
};
/** The first staging of each type in a signature: {QRCard: "night", ...}. */
const firstStagings = (sig) => {
  const out = {};
  for (const tok of sig) {
    const [type, st] = split(tok);
    if (STAGINGS[type] && !(type in out)) out[type] = st;
  }
  return out;
};
export const sigLine = (sig) => sig.join(' > ');

const vNumber = (id) => Number(/^v(\d+)-/.exec(id)?.[1] ?? 0);
const redoNumber = (id) => Number(/-r(\d+)$/.exec(id)?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, '');
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};

/** The category's films, oldest first, one per family (its newest version), each with its signature: from its spec
 *  when the file is there, else from the ledger's stored "visual". `except` is a family to leave out (the film being
 *  checked). Demos, hook variants, translations and throwaway specs (a leading "_") are not films. */
export const categoryFilms = (category, specsDir, ledger = {}, except = null) => {
  const byId = new Map();
  for (const f of fs.readdirSync(specsDir)) {
    if (!/^[^._][^.]*\.json$/.test(f) || f.startsWith('demo-') || /--h\d+\.json$/.test(f)) continue;
    const spec = readJson(path.join(specsDir, f));
    if (!spec || typeof spec.id !== 'string' || !Array.isArray(spec.beats)) continue;
    byId.set(spec.id, {id: spec.id, category: spec.category ?? null, visual: signature(spec)});
  }
  for (const e of Object.values(ledger ?? {})) {
    if (!e || typeof e.id !== 'string') continue;
    const v = byId.get(e.id) ?? {id: e.id, category: e.category ?? null, visual: Array.isArray(e.visual) ? e.visual.map(String) : []};
    v.category ??= e.category ?? null;
    byId.set(e.id, v);
  }
  const fams = new Map();
  for (const v of [...byId.values()].filter((x) => x.category === category && familyOf(x.id) !== except).sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id))) fams.set(familyOf(v.id), v);
  return [...fams.values()].filter((v) => v.visual.length);
};

/** The category's signature types (ci/categories.json "signature"), else every staged type. */
export const signatureTypes = (cat) => (Array.isArray(cat?.signature) && cat.signature.length ? cat.signature.filter((t) => STAGINGS[t]) : Object.keys(STAGINGS));

// ---- the moments (the illustrated scenes, src/scenes/illo/, 2026-10-06; the owner: "the scenes must not rotate: every
// time the studio invents new graphics that fit the video"). The kit is a box of parts, so these look at what a film
// SHOWS, beyond the signature scene above. Read by tools/check.mjs before the voice.
//   HOOK_REPEAT    the film opens on the scene token one of the category's last 2 films opened on (a failure in the cloud)
//   MOMENT_REPEAT  a story scene (every staged type but the app's own six) as a type:staging that 2 of the category's
//                  last 4 films showed (3 of 5 with this one), or the very picture (type, staging, who, where, what) one
//                  of the last 2 showed
//   IDEA_REPEAT    a Film that composes the kit's parts (../illo: who, pose, car, place) as one of the category's last 3
//                  Films did, or a recorded new visual ("--idea") that reads like one of theirs
export const LAST_HOOKS = 2;
const MOMENT_FILMS = 4;
const MOMENT_MAX = 2;
const LAST_PICTURES = 2;
const LAST_IDEAS = 3;
const APP_TYPES = new Set(['QRCard', 'MapPin', 'Wave', 'Calendar', 'Notification', 'Phone']);
const isStory = (tok) => {
  const [type] = split(tok);
  return Boolean(STAGINGS[type]) && !APP_TYPES.has(type);
};
// what a story scene shows besides its staging: who (a Cast preset, a caller), where, the car, the part, the weather
const SALIENT = ['name', 'cast', 'who', 'avatar', 'where', 'backdrop', 'body', 'view', 'time', 'weather', 'light', 'part', 'subject', 'fuel', 'season', 'sign', 'glass', 'think'];
const valuesOf = (v) => (v == null || v === false ? [] : Array.isArray(v) ? v.flatMap(valuesOf) : typeof v === 'object' ? valuesOf(v.is ?? null) : [String(v).slice(0, 40)]);
/** The scenes of a spec in order, mid-beat cuts included, EndCard left out. */
export const sceneObjects = (spec) =>
  (Array.isArray(spec?.beats) ? spec.beats : [])
    .flatMap((b) => [b?.scene, ...(Array.isArray(b?.cuts) ? b.cuts.map((c) => c?.scene) : [])])
    .filter((sc) => sc && typeof sc === 'object' && sc.type && sc.type !== 'EndCard');
/** A scene's picture: "Call:hand · name=დედა · where=station". */
export const pictureKey = (sc) => [token(sc), ...SALIENT.flatMap((k) => valuesOf(sc?.[k]).map((v) => `${k}=${v}`)).sort()].join(' · ');

/** HOOK_REPEAT and MOMENT_REPEAT lines for `spec` against the category's earlier films (categoryFilms); specOf(id) gives
 *  an earlier film's spec (null: its signature only). */
export const momentRepeats = (spec, films, {specOf = () => null} = {}) => {
  const out = [];
  const sig = signature(spec);
  for (const f of films.slice(-LAST_HOOKS))
    if (sig[0] && f.visual[0] === sig[0]) out.push(`HOOK_REPEAT the film opens on ${sig[0]}, as ${f.id} did (one of the category's last ${LAST_HOOKS}): open on another picture (another scene, or another "staging")`);
  const recent = films.slice(-MOMENT_FILMS);
  for (const tok of [...new Set(sig.filter(isStory))]) {
    const used = recent.filter((f) => f.visual.includes(tok));
    if (used.length >= MOMENT_MAX) out.push(`MOMENT_REPEAT ${tok} is in ${used.map((f) => f.id).join(' and ')} too (${used.length + 1} of the category's last ${MOMENT_FILMS + 1} films): stage the moment another way, or show another one (CLAUDE.md, Story moments)`);
  }
  const theirs = films.slice(-LAST_PICTURES).flatMap((f) => {
    const s = specOf(f.id);
    return s ? sceneObjects(s).filter((sc) => isStory(token(sc))).map((sc) => [f.id, pictureKey(sc)]) : [];
  });
  for (const sc of sceneObjects(spec).filter((x) => isStory(token(x)))) {
    const key = pictureKey(sc);
    const same = key.includes(' · ') && theirs.find(([, k]) => k === key);
    if (same) out.push(`MOMENT_REPEAT ${key} is the picture ${same[0]} showed: change the staging, who is in it or where it happens`);
  }
  return [...new Set(out)];
};

// a Film's composition: the kit components it draws (../illo imports used as JSX) and the parts they are given
const KIT_PLUMBING = new Set(['IlloDefs', 'DefsSvg', 'Solid', 'Shadow', 'Glint']);
const KIT_ATTRS = new Set(['is', 'cast', 'preset', 'pose', 'face', 'hold', 'body', 'view', 'kind', 'where', 'time', 'weather', 'staging', 'light', 'part', 'item', 'icon', 'crop']);
/** The kit parts a Film's code composes: {"Figure", "is:mom", "pose:phoneEar", "Car", "body:suv", "Backdrop", "kind:station"}. */
export const compositionOf = (code) => {
  const c = String(code ?? '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:\\])\/\/.*$/gm, '$1');
  const kit = new Set();
  for (const m of c.matchAll(/import\s*\{([^}]*)\}\s*from\s*['"]\.\.\/illo\/[\w-]+['"]/g))
    for (const part of m[1].split(',')) {
      const local = part.trim().replace(/^type\s+/, '').split(/\s+as\s+/).pop();
      if (local && !KIT_PLUMBING.has(local)) kit.add(local);
    }
  const out = new Set();
  if (!kit.size) return out;
  for (const m of c.matchAll(/<([A-Z]\w*)\b/g)) {
    if (!kit.has(m[1])) continue;
    out.add(m[1]);
    // the element's attributes, up to its closing ">" outside braces
    let depth = 0;
    let attrs = '';
    for (let i = m.index + m[0].length; i < c.length && attrs.length < 2000; i++) {
      const ch = c[i];
      if (ch === '{') depth++;
      else if (ch === '}') depth--;
      else if (ch === '>' && depth === 0) break;
      attrs += ch;
    }
    // a literal (kind="station", {is: 'mom'}) or a prop's literal default (kind={p.where ?? 'station'})
    for (const a of attrs.matchAll(/\b(\w+)\s*[=:]\s*\{?\s*(?:'([^'\n]*)'|"([^"\n]*)")|\b(\w+)\s*=\s*\{[^{}]*?\?\?\s*(?:'([^'\n]*)'|"([^"\n]*)")/g)) {
      const [k, v] = a[1] ? [a[1], a[2] ?? a[3]] : [a[4], a[5] ?? a[6]];
      if (KIT_ATTRS.has(k)) out.add(`${k === 'cast' || k === 'preset' ? 'is' : k}:${v}`);
    }
  }
  return out;
};
// (and the framing words every idea line uses: "top-down", "the camera pulls back", "line-art")
const EN_STOP = new Set(
  ('the and its his her him their this that then than with from into onto over under while when where who what which one two three four five six off out are was has have each every both after before them they there here you your our ' +
    'top down camera pull push back close wide view shot frame line art drawn draw slow slowly big small tiny little new old first last')
    .split(' '),
);
/** The content words of a recorded idea line (English), lightly stemmed. */
export const ideaWords = (s) =>
  new Set(
    (String(s ?? '').toLowerCase().match(/[a-z]+/g) ?? [])
      .filter((w) => w.length >= 3 && !EN_STOP.has(w))
      .map((w) => w.replace(/(?:ing|ed|es|s)$/, ''))
      .filter((w) => w.length >= 3),
  );
/** IDEA_REPEAT lines: `spec`'s Films against the Films of the category's last 3 films (filmCode(name) -> the code), and
 *  its recorded idea against theirs (ideaOf(id) -> the ledger's "idea"). */
export const ideaRepeats = (spec, films, {filmCode = () => null, ideaOf = () => null, idea = null} = {}) => {
  const out = [];
  const recent = films.slice(-LAST_IDEAS);
  for (const f of filmScenes(spec)) {
    const mine = compositionOf(filmCode(f.name));
    if (mine.size < 3) continue;
    for (const g of recent)
      for (const name of g.visual.filter((t) => t.startsWith('Film:')).map((t) => t.slice(5))) {
        if (name === f.name) continue;
        const theirs = compositionOf(filmCode(name));
        const shared = [...mine].filter((x) => theirs.has(x));
        if (shared.length >= 4 && shared.length / new Set([...mine, ...theirs]).size >= 0.6)
          out.push(`IDEA_REPEAT ${f.name} composes the picture of ${g.id}'s ${name} again (${shared.slice(0, 6).join(', ')}): compose a new one from the kit for this film (another who, pose, car, place or prop)`);
      }
  }
  if (typeof idea === 'string' && idea.trim()) {
    const a = ideaWords(idea);
    for (const g of recent) {
      const theirs = ideaOf(g.id);
      if (typeof theirs !== 'string') continue;
      const b = ideaWords(theirs);
      const shared = [...a].filter((x) => b.has(x));
      if (shared.length >= 5 && shared.length / Math.max(1, Math.min(a.size, b.size)) >= 0.6)
        out.push(`IDEA_REPEAT the new visual reads like ${g.id}'s ("${theirs.slice(0, 70)}"): ${shared.join(', ')}; find another picture for this film`);
    }
  }
  return [...new Set(out)];
};

// ---- the page (2026-10-06, the owner: "the graphics must not rotate as a fixed set: every film invents NEW pictures
// that fit it"). The kit's scenes and parts are shared by every category, so the viewer of the page sees a repeat that
// the category rules above never compare: a parking film's "mom calls" right after a reminders film's. Page-wide, by film
// number, one film per family (its newest version):
//   FEED_REPEAT  a story picture (pictureKey: the type, staging, who, where, what) one of the page's last 3 films showed,
//                or a Film composing the kit's parts (compositionOf) as one of the page's last 3 Films did
// The designed scenes are references, not templates: change who, where or the staging, or compose the moment as the
// film's own Film from the kit (Figure, Car, Handset, Backdrop, fx, icons).
export const LAST_FEED = 3;
/** Every film of the page (all categories), oldest first, one per family, each with its signature (categoryFilms for the
 *  whole page). */
export const pageFilms = (specsDir, ledger = {}, except = null) => {
  const byId = new Map();
  for (const f of fs.readdirSync(specsDir)) {
    if (!/^v\d+-[^.]*\.json$/.test(f) || /--h\d+\.json$/.test(f)) continue;
    const spec = readJson(path.join(specsDir, f));
    if (!spec || typeof spec.id !== 'string' || !Array.isArray(spec.beats) || (spec.lang ?? 'ka') !== 'ka') continue;
    byId.set(spec.id, {id: spec.id, category: spec.category ?? null, visual: signature(spec)});
  }
  for (const e of Object.values(ledger ?? {})) {
    if (!e || typeof e.id !== 'string' || !vNumber(e.id) || byId.has(e.id)) continue;
    byId.set(e.id, {id: e.id, category: e.category ?? null, visual: Array.isArray(e.visual) ? e.visual.map(String) : []});
  }
  const fams = new Map();
  for (const v of [...byId.values()].filter((x) => familyOf(x.id) !== except).sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id))) fams.set(familyOf(v.id), v);
  return [...fams.values()].filter((v) => v.visual.length);
};
/** FEED_REPEAT lines for `spec` against the page's last films (pageFilms); specOf(id) and filmCode(name) as above. */
export const feedRepeats = (spec, films, {specOf = () => null, filmCode = () => null} = {}) => {
  const out = [];
  const recent = films.slice(-LAST_FEED);
  const theirs = recent.flatMap((f) => {
    const s = specOf(f.id);
    return s ? sceneObjects(s).filter((sc) => isStory(token(sc))).map((sc) => [f, pictureKey(sc)]) : [];
  });
  for (const sc of sceneObjects(spec).filter((x) => isStory(token(x)))) {
    const key = pictureKey(sc);
    const same = key.includes(' · ') && theirs.find(([, k]) => k === key);
    if (same) out.push(`FEED_REPEAT ${key} is the picture ${same[0].id} (${same[0].category ?? '?'}) showed, one of the page's last ${LAST_FEED} films: the designed scenes are references, not templates; change who, where or the staging, or compose this moment as your own Film from the kit`);
  }
  for (const f of filmScenes(spec)) {
    const mine = compositionOf(filmCode(f.name));
    if (mine.size < 3) continue;
    for (const g of recent)
      for (const name of g.visual.filter((t) => t.startsWith('Film:')).map((t) => t.slice(5))) {
        if (name === f.name) continue;
        const them = compositionOf(filmCode(name));
        const shared = [...mine].filter((x) => them.has(x));
        if (shared.length >= 4 && shared.length / new Set([...mine, ...them]).size >= 0.6)
          out.push(`FEED_REPEAT ${f.name} composes the picture of ${g.id}'s ${name} again (${shared.slice(0, 6).join(', ')}), one of the page's last ${LAST_FEED} films: compose a new one from the kit (another who, pose, car, place or prop)`);
      }
  }
  return [...new Set(out)];
};
/** The pictures the page's and the category's last films showed, for the brief: one line per film, newest first
 *  ("v80-a (parking) · Call:hand · name=დედა · where=station; Film V80A: Figure, is:mom, pose:phoneEar, Car"). */
export const picturesText = (catFilms, feedFilms, {specOf = () => null, filmCode = () => null, n = 4} = {}) => {
  const rows = new Map();
  for (const f of [...catFilms.slice(-n), ...feedFilms.slice(-LAST_FEED)]) rows.set(f.id, f);
  const lines = [...rows.values()]
    .sort((a, b) => vNumber(b.id) - vNumber(a.id))
    .map((f) => {
      const s = specOf(f.id);
      const pics = s ? [...new Set(sceneObjects(s).filter((sc) => isStory(token(sc))).map(pictureKey))] : [];
      const comps = f.visual
        .filter((t) => t.startsWith('Film:'))
        .map((t) => {
          const parts = [...compositionOf(filmCode(t.slice(5)))];
          return parts.length ? `${t} (${parts.slice(0, 8).join(', ')})` : '';
        })
        .filter(Boolean);
      const all = [...pics, ...comps];
      return all.length ? `${f.id} (${f.category ?? '?'}) · ${all.join('; ')}` : '';
    })
    .filter(Boolean);
  return lines.length ? lines.join('\n') : '(none yet: every picture is yours to compose)';
};

// ---- the app screens a spec shows (the free idea, 2026-10-06: a screen only for a feature his words name) -------------
/** The names of public/screens/*.jpg (without .jpg) that a spec shows: named anywhere in the spec, or in the text of its
 *  Film scene files (read as text, never imported). */
export const screensShown = (root, spec) => {
  let names = [];
  try {
    names = fs.readdirSync(path.join(root, 'public', 'screens')).filter((f) => f.endsWith('.jpg')).map((f) => f.slice(0, -4));
  } catch {}
  const text = JSON.stringify(spec ?? {});
  const own = filmScenes(spec)
    .map((f) => {
      try {
        return fs.readFileSync(path.join(root, 'src', 'scenes', 'film', `${f.name}.tsx`), 'utf8');
      } catch {
        return '';
      }
    })
    .join('\n');
  return names.filter((s) => text.includes(s) || own.includes(s));
};

/** What the rule refuses in `spec` (a list of one-line problems), given the category's earlier films. */
export const repeats = (spec, films, types) => {
  const sig = signature(spec);
  const out = [];
  const mine = firstStagings(sig);
  for (const f of films.slice(-LAST_STAGING)) {
    const theirs = firstStagings(f.visual);
    for (const type of types) {
      if (mine[type] && mine[type] === theirs[type]) {
        const free = STAGINGS[type].filter((s) => !films.slice(-LAST_STAGING).some((g) => firstStagings(g.visual)[type] === s));
        out.push(`VISUAL_REPEAT ${type} "${mine[type]}" is how ${f.id} staged it (one of the category's last ${LAST_STAGING}): give the first ${type} "staging": ${free.length ? free.map((s) => `"${s}"`).join(' or ') : 'another one'} (CLAUDE.md, Scenes)`);
      }
    }
  }
  const whole = sigLine(sig);
  const same = films.slice(-LAST_WHOLE).find((f) => sigLine(f.visual) === whole);
  if (same) out.push(`VISUAL_REPEAT the whole film looks like ${same.id} (${whole}): change a staging, a scene type or its order`);
  // unknown stagings would silently fall back to the default
  for (const sc of (spec?.beats ?? []).flatMap(beatScenes)) {
    if (sc?.staging !== undefined && STAGINGS[sc.type] && !STAGINGS[sc.type].includes(sc.staging))
      out.push(`${sc.type} "staging": "${String(sc.staging).slice(0, 30)}" is not one of ${STAGINGS[sc.type].map((s) => `"${s}"`).join(', ')}`);
    else if (sc?.staging !== undefined && !STAGINGS[sc?.type]) out.push(`${sc?.type} has no "staging" (only ${Object.keys(STAGINGS).join(', ')})`);
  }
  return [...new Set(out)];
};

// ---- motion (2026-10-06: the same openings, cuts and trails in every film) ------------------------------------------------
// A film's motion signature is its plan's (tools/ci/fx.mjs motionOf): the opening, the ending, the transitions, the camera
// moves. The planner already keeps them apart; these are the checks check.mjs prints (warnings), and the motifs of a
// Film scene read as text: the old template's grammar repeated film after film.
export const LAST_OPENINGS = 2;
/** MOTION_REPEAT lines: the same opening as one of the category's last 2 films, the same ending as the last one (a
 *  stories film), the same first two transitions as the last one. `mine`, `theirs`: motionOf() objects ({id} added). */
export const motionRepeats = (mine, theirs, stories = false) => {
  if (!mine) return [];
  const out = [];
  const last = theirs[theirs.length - 1];
  for (const t of theirs.slice(-LAST_OPENINGS)) if (t && t.opening === mine.opening && mine.opening !== 'classic') out.push(`MOTION_REPEAT the opening "${mine.opening}" is how ${t.id} opened (one of the category's last ${LAST_OPENINGS}): give scene 0 another opening ("opening" in the spec, or a scene 0 that fits another one)`);
  if (stories && last && last.ending === mine.ending && mine.ending !== 'none') out.push(`MOTION_REPEAT the ending "${mine.ending}" is ${last.id}'s: pick another ("ending": card, stamp, loop or callback)`);
  if (last && mine.transitions.length >= 2 && last.transitions.length >= 2 && mine.transitions[0] === last.transitions[0] && mine.transitions[1] === last.transitions[1])
    out.push(`MOTION_REPEAT the first two cuts (${mine.transitions.slice(0, 2).join(', ')}) are ${last.id}'s: set "transition" on scene 1 or 2`);
  return out;
};
/** The motifs a Film scene leans on, read from its code (the regexes of the 2026-10-06 audit). */
export const motifsOf = (code) => {
  const c = String(code ?? '');
  const m = [];
  if (/strokeDash(?:array|offset)/.test(c) && /strokeDashoffset=\{[^}]*\(1\s*-/.test(c)) m.push('drawon');
  if (/\br=\{[^}]*\+[^}]*\}/.test(c) && /opacity=\{[^}]*1\s*-/.test(c)) m.push('ripple');
  if (/translateY\(\$\{\(1\s*-\s*\w+\)\s*\*\s*\d+/.test(c)) m.push('risein');
  if (/scale\(\$\{0\.\d+\s*\+\s*0\.\d+\s*\*\s*(?:spr|\w+)/.test(c)) m.push('pop');
  if (/lerp\(\s*1\s*,\s*1\.0\d+/.test(c)) m.push('ownpush');
  return m;
};
/** MOTIF_REPEAT lines for a new Film scene: the draw-on route again when 2 of the category's last 3 Films drew one, its own
 *  scene-wide push (the camera rig moves the camera now), or 3 or more of the overused motifs at once. */
export const motifRepeats = (name, code, earlierCodes = []) => {
  const mine = motifsOf(code);
  const out = [];
  const drew = earlierCodes.slice(-3).filter((c) => motifsOf(c).includes('drawon')).length;
  if (mine.includes('drawon') && drew >= 2) out.push(`MOTIF_REPEAT ${name} draws a route on again (${drew} of the category's last 3 Films did): find another picture for the moment`);
  if (mine.includes('ownpush')) out.push(`MOTIF_REPEAT ${name} pushes its own camera over the whole scene (lerp(1, 1.0x)): leave the camera to the rig (src/lib/camera.tsx), use CameraLayer depths instead`);
  if (mine.length >= 3) out.push(`MOTIF_REPEAT ${name} leans on ${mine.join(', ')}: the overused motifs (draw-on routes, travelling dots, ripple rings, rise-in words, pops), use one at most`);
  return out;
};
