// A film's visual signature, and the rule against repeating the looks of a category's last films (the owner,
// 2026-09-27: "the same graphics are generated every time ... each time refined AND different").
//   signature(spec)  the ordered scenes as short tokens: "QRCard:night", "Phone:tilt/05-customs",
//                    "Wire3D:hero/sedan-sports", "Title" ... (EndCard left out: every film ends on it)
//   repeats(spec, category, specsDir, ledger)  the problems, one line each, or []: the category's signature scene
//                    (the first of each type in ci/categories.json "signature") repeating the staging of either of
//                    the category's last 2 films, or the whole signature equal to one of its last 5.
//   filmScenes(spec) / filmName(id)  the film's own scenes ("type": "Film", src/scenes/film/<Name>.tsx): one new visual
//                    per film, written for it (CLAUDE.md, Scenes: Film scenes); a Film token is "Film:<Name>".
// Read by tools/ci/prompt.mjs (--record stores the signature; the brief lists the last ones) and tools/check.mjs.
import fs from 'node:fs';
import path from 'node:path';

// every staged scene type: its stagings, the default first (CLAUDE.md, Scenes; src/scenes/*.tsx and staging/)
export const STAGINGS = {
  QRCard: ['windshield', 'street', 'night', 'topdown'],
  MapPin: ['city', 'walk', 'floors'],
  Wave: ['mic', 'radial', 'seismo'],
  Calendar: ['month', 'tearoff', 'ruler'],
  Notification: ['float', 'lock', 'desk', 'stack'], // the default is "lock" when the lock prop is on, else "float"
  Phone: ['device', 'tilt', 'loupe'],
};
const LAST_STAGING = 2; // a signature scene never repeats the staging of the category's last 2 films
const LAST_WHOLE = 5; // the whole signature never equals one of the category's last 5

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
/** The spec's Film scenes, in order: [{i (beat), name}]. */
export const filmScenes = (spec) =>
  (Array.isArray(spec?.beats) ? spec.beats : []).flatMap((b, i) => (b?.scene?.type === 'Film' ? [{i, name: typeof b.scene.name === 'string' ? b.scene.name : ''}] : []));
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
export const signature = (spec) => (Array.isArray(spec?.beats) ? spec.beats.map((b) => b?.scene).filter((sc) => sc && sc.type && sc.type !== 'EndCard').map(token) : []);
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
  for (const b of spec?.beats ?? []) {
    const sc = b?.scene;
    if (sc?.staging !== undefined && STAGINGS[sc.type] && !STAGINGS[sc.type].includes(sc.staging))
      out.push(`${sc.type} "staging": "${String(sc.staging).slice(0, 30)}" is not one of ${STAGINGS[sc.type].map((s) => `"${s}"`).join(', ')}`);
    else if (sc?.staging !== undefined && !STAGINGS[sc?.type]) out.push(`${sc?.type} has no "staging" (only ${Object.keys(STAGINGS).join(', ')})`);
  }
  return [...new Set(out)];
};
