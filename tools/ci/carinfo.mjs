// Car-knowledge films (category "carinfo", the owner 2026-10-05): a sourced fact bank, the facts offered to one film,
// the rules a recorded film must keep, and the real sounds a film may open with.
//   loadBank(root, cats)  the bank: ci/carinfo-sources.json (the category's "bank"), its "lines" ("<id>: <Georgian>")
//                         and by id each fact's theme, source site, app link, tip flag and sounds. null when the category
//                         or the file is missing. The lines live there, not in ci/categories.json: the briefs that read
//                         that file whole would otherwise carry the whole bank. An app link to an id that is not among
//                         `cats` (a retired category, an unknown id, or one still locked by the App Store gate when the
//                         caller passes the active list) becomes null: no film is told to end on a feature it may not show.
//   loadSounds(root)      public/sfx/real.json and ci/sounds.json: which real- cues a film may use today
//   usedFacts(ledger)     fact id -> the films that used it (the ledger's "facts", newest last)
//   offer(bank, ...)      the facts the brief offers ONE film: a few themes, least used first, or the ones his idea
//                         (a fact whose subject a recent stories film told counts as used: `toldElsewhere`)
//                         names, the facts whose own words are closest to his idea first; facts the category's last
//                         films used are left out (or marked, when he asked). The category's "tipEvery": n (the owner,
//                         2026-10-06, reel-style films): when none of its last n - 1 films used a tip ("tip": true), the
//                         dice's offer is tips only ({tips: true}), so about every n-th film is a practical tip
//   filmRules(spec, ...)  what --record refuses in a carinfo film: an app shown with no linked fact (or none shown
//                         with one), a sound fact with no real sound early, a credit cue while credits are off
// Read by tools/ci/prompt.mjs, tools/build-index.mjs and tools/ci/publish.mjs.
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {contentWords} from './words.mjs';

const readJson = (f, fallback = null) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return fallback;
  }
};
export const BANK_CATEGORY = 'carinfo';
export const FACT_ID = /^[a-z0-9][a-z0-9-]{2,47}$/;

/** The fact bank of the category that has one: {cat, facts: [{id, theme, ka, app, sounds, tip}], byId, themes}. */
export const loadBank = (root, cats = null) => {
  const list = cats ?? readJson(path.join(root, 'ci/categories.json'), {})?.categories ?? [];
  const ids = new Set(list.map((c) => c?.id).filter(Boolean));
  // the car-knowledge bank by its id: the stories category has a bank of its own (tools/ci/stories.mjs), a different shape
  const cat = list.find((c) => c?.id === BANK_CATEGORY && c?.bank);
  if (!cat) return null;
  const side = readJson(path.join(root, cat.bank), null);
  if (!side?.facts) return null;
  const facts = [];
  for (const line of Array.isArray(side.lines) ? side.lines : []) {
    const m = /^([a-z0-9][a-z0-9-]{2,47}): ([\s\S]+)$/.exec(String(line));
    if (!m || !side.facts[m[1]]) continue;
    const s = side.facts[m[1]];
    let source = '';
    try {
      source = new URL(s.source_url).hostname.replace(/^www\./, '');
    } catch {}
    // a link to a category the caller does not list (retired, unknown, or locked until the App Store release) is no link
    const app = typeof s.app === 'string' && ids.has(s.app) ? s.app : null;
    facts.push({id: m[1], theme: s.theme, ka: m[2].trim(), app, sounds: Array.isArray(s.sounds) ? s.sounds : null, tip: s.tip === true, source});
  }
  return {cat, facts, byId: new Map(facts.map((f) => [f.id, f])), themes: side.themes ?? {}};
};

/** The real sounds: {all: [entry], byName, credits: bool, usable(name), creditOf(name)}. */
export const loadSounds = (root) => {
  const all = readJson(path.join(root, 'public/sfx/real.json'), []) ?? [];
  const credits = readJson(path.join(root, 'ci/sounds.json'), {})?.creditLines === true;
  const byName = new Map(all.map((e) => [e.name, e]));
  const needsCredit = (name) => byName.get(name)?.credit?.required === true;
  return {
    all,
    byName,
    credits,
    needsCredit,
    usable: (name) => byName.has(name) && (credits || !needsCredit(name)),
    creditOf: (name) => (needsCredit(name) ? byName.get(name).credit.line : null),
  };
};
/** The real- cues a spec plays: [{name, beat}]. */
export const realCues = (spec) =>
  (Array.isArray(spec?.beats) ? spec.beats : []).flatMap((b, i) => (Array.isArray(b?.sfx) ? b.sfx : []).filter((c) => /^real-/.test(String(c?.name ?? ''))).map((c) => ({name: c.name, beat: i})));
/** The first sound of a fact a film may use today, or null. */
export const soundOf = (fact, sounds) => (fact?.sounds ?? []).find((n) => sounds.usable(n)) ?? null;

const vNumber = (id) => Number(/^v(\d+)-/.exec(String(id))?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, '');
/** fact id -> [film ids that used it], oldest first, one per family (the ledger's "facts" of the category's films). */
export const usedFacts = (ledger, category = BANK_CATEGORY, exceptFamily = null) => {
  const fams = new Map();
  for (const e of Object.values(ledger ?? {})) {
    if (!e || e.category !== category || typeof e.id !== 'string' || !Array.isArray(e.facts)) continue;
    if (exceptFamily && familyOf(e.id) === exceptFamily) continue;
    fams.set(familyOf(e.id), e); // a later redo of the family speaks for it
  }
  const out = new Map();
  for (const e of [...fams.values()].sort((a, b) => vNumber(a.id) - vNumber(b.id))) for (const f of e.facts) out.set(f, [...(out.get(f) ?? []), e.id]);
  return out;
};
export const RECENT_FILMS = 12; // a fact one of the category's last 12 films used is not offered again
export const THEMES_OFFERED = 3; // themes per film (the dice)
export const PER_THEME = 10; // facts per theme (the dice)
export const PER_THEME_ASKED = 16; // facts per theme when his idea names it
export const CLOSEST_MAX = 5; // facts whose own words are closest to his idea, offered first whatever theme they sit in
export const CLOSEST_DF = 6; // a word of his counts toward "closest" only when at most this many facts use it
/** The bank facts whose Georgian shares the rarer words of his idea, best first (up to `max`): a word only a few
 *  facts use ("ნეიტრალ", "წარწერ") picks them out; a word many use ("საბურავ", "საწვავ") is left to the themes. */
export const closest = (bank, topic, {max = CLOSEST_MAX, order = () => 0} = {}) => {
  const want = new Set(contentWords(topic).map((w) => w.stem));
  if (!want.size) return [];
  const stems = bank.facts.map((f) => new Set(contentWords(f.ka).map((w) => w.stem)));
  const df = new Map();
  for (const set of stems) for (const st of set) if (want.has(st)) df.set(st, (df.get(st) ?? 0) + 1);
  const n = bank.facts.length;
  const scored = bank.facts
    .map((f, i) => [f, [...stems[i]].filter((st) => want.has(st) && df.get(st) <= CLOSEST_DF).reduce((sum, st) => sum + Math.log(n / df.get(st)), 0)])
    .filter(([, sc]) => sc > 0)
    .sort((a, b) => b[1] - a[1] || order(a[0]) - order(b[0]));
  if (!scored.length) return [];
  const best = scored[0][1];
  return scored.filter(([, sc]) => sc >= best * 0.6).slice(0, max).map(([f]) => f);
};
/** The films (newest last) of the category, one id per family, from the ledger. */
export const recentFilms = (ledger, category, n, exceptFamily) => {
  const fams = new Map();
  for (const e of Object.values(ledger ?? {})) if (e?.category === category && typeof e.id === 'string' && familyOf(e.id) !== exceptFamily) fams.set(familyOf(e.id), e);
  return [...fams.values()].sort((a, b) => vNumber(a.id) - vNumber(b.id)).slice(-n);
};

/** The facts offered to one film. {themes: [{id, label, facts: [{...fact, usedBy}]}], how: "dice" | "topic" | "base",
 *  matched: bool (his words named a theme), tips: bool (a tip-only offer, "tipEvery")}. A deterministic order for one
 *  request (the seed): a retried run gets the same offer. */
export const offer = (bank, {ledger = {}, topic = '', seed = '', baseFacts = null, exceptFamily = null, toldElsewhere = new Map()} = {}) => {
  const used = usedFacts(ledger, bank.cat.id, exceptFamily);
  const recent = recentFilms(ledger, bank.cat.id, RECENT_FILMS, exceptFamily);
  const recentIds = new Set(recent.map((e) => e.id));
  // a fact whose subject a recent film of another bank told (`toldElsewhere`: fact id -> that film; the stories bank's
  // story about the same thing, tools/ci/stories.mjs crossTold) counts as recently used too
  const recentUse = (f) => [...(used.get(f.id) ?? []).filter((id) => recentIds.has(id)), ...(toldElsewhere.has(f.id) ? [toldElsewhere.get(f.id)] : [])];
  // the newest film number that used a theme (0 = never)
  const themeLast = new Map();
  for (const [fid, ids] of used) {
    const t = bank.byId.get(fid)?.theme;
    if (t) themeLast.set(t, Math.max(themeLast.get(t) ?? 0, ...ids.map(vNumber)));
  }
  const hash = (s) => crypto.createHash('sha1').update(`${seed}:${s}`).digest().readUInt32BE(0);
  const themeIds = Object.keys(bank.themes);
  const pick = (t, cap, keepUsed, skip = new Set(), tipsOnly = false) => {
    const all = bank.facts.filter((f) => f.theme === t && !skip.has(f.id) && (!tipsOnly || f.tip)).map((f) => ({...f, usedBy: recentUse(f)}));
    const fresh = all.filter((f) => !f.usedBy.length);
    const chosen = (keepUsed ? [...fresh, ...all.filter((f) => f.usedBy.length)] : fresh).sort((a, b) => (a.usedBy.length > 0) - (b.usedBy.length > 0) || (used.has(a.id) > 0) - (used.has(b.id) > 0) || hash(a.id) - hash(b.id));
    return {id: t, label: bank.themes[t]?.label ?? t, facts: chosen.slice(0, cap)};
  };
  // a redo: the themes its original used, every fact of them
  if (Array.isArray(baseFacts) && baseFacts.length) {
    const ts = [...new Set(baseFacts.map((f) => bank.byId.get(f)?.theme).filter(Boolean))];
    if (ts.length) return {how: 'base', matched: true, themes: ts.map((t) => pick(t, PER_THEME_ASKED, true))};
  }
  // his idea: first the facts whose own words are closest to it (whatever their theme, so the cap never drops the
  // one he means), then the themes whose words match it the most (up to two), every fact of them, the used ones marked
  if (topic) {
    const near = closest(bank, topic, {order: (f) => (recentUse(f).length ? 1 : 0) + hash(f.id) / 2 ** 33}).map((f) => ({...f, usedBy: recentUse(f)}));
    const nearIds = new Set(near.map((f) => f.id));
    const first = near.length ? [{id: 'closest', label: 'closest to his words', facts: near}] : [];
    const score = (t) =>
      (bank.themes[t]?.words ?? []).reduce((sum, w) => {
        try {
          return sum + [...(new RegExp(w, 'iu').exec(topic)?.[0] ?? '')].length;
        } catch {
          return sum;
        }
      }, 0);
    const hits = themeIds.map((t) => [t, score(t)]).filter(([, s]) => s > 0).sort((a, b) => b[1] - a[1]).slice(0, 2);
    // no theme named: the theme of the closest fact stands in for it
    if (!hits.length && near.length) hits.push([near[0].theme, 1]);
    if (hits.length) return {how: 'topic', matched: true, themes: [...first, ...hits.map(([t]) => pick(t, PER_THEME_ASKED, true, nearIds))].filter((t) => t.facts.length)};
  }
  // a reel-style tip film ("tipEvery": n, the owner 2026-10-06): when none of the category's last n - 1 films used a tip,
  // this dice offer is tips only (a typed idea or a redo, above, decides for itself)
  const tipsOnly = !topic && tipDue(bank, ledger, exceptFamily);
  // the dice: the themes used longest ago (never used first), ties in a per-request order, each with facts left
  const order = themeIds
    .map((t) => [t, themeLast.get(t) ?? 0, hash(t)])
    .sort((a, b) => a[1] - b[1] || a[2] - b[2])
    .map(([t]) => pick(t, PER_THEME, false, new Set(), tipsOnly))
    .filter((t) => t.facts.length);
  return {how: topic ? 'topic' : 'dice', matched: false, tips: tipsOnly && order.length > 0, themes: order.slice(0, THEMES_OFFERED)};
};

/** True when the category's "tipEvery": n asks for a tip film now: none of its last n - 1 films used a tip fact. */
export const tipDue = (bank, ledger, exceptFamily = null) => {
  const n = Number(bank?.cat?.tipEvery);
  if (!(n >= 2) || !bank.facts.some((f) => f.tip)) return false;
  return !recentFilms(ledger, bank.cat.id, n - 1, exceptFamily).some((e) => (Array.isArray(e.facts) ? e.facts : []).some((f) => bank.byId.get(f)?.tip));
};
/** A tip film: every fact it used is a practical tip. */
export const isTipFilm = (facts) => facts.length > 0 && facts.every((f) => f?.tip);

/** The app categories the offered (or used) facts link: ids in order of first use. */
export const linkedApps = (facts) => [...new Set(facts.map((f) => f.app).filter(Boolean))];

/** What --record refuses in a carinfo film, given the facts it used: one line each. */
export const filmRules = (spec, facts, {cats, sounds, isFollow = () => false}) => {
  const out = [];
  const beats = Array.isArray(spec?.beats) ? spec.beats : [];
  const apps = linkedApps(facts);
  const phones = beats.flatMap((b, i) => (b?.scene?.type === 'Phone' ? [{i, src: String(b.scene.src ?? '').replace(/\.(en|ru)$/, '')}] : []));
  if (apps.length) {
    const screens = new Set(apps.flatMap((a) => cats.find((c) => c.id === a)?.screens ?? []));
    if (!phones.some((p) => screens.has(p.src)))
      out.push(`your facts link the app (${apps.join(', ')}): end the film by showing it, a Phone beat before the EndCard with ${[...screens].join(' or ')} and one plain line ("ეს ვინარშიც არის" in your own words), that feature's facts and never-list holding`);
  } else {
    if (phones.length) out.push(`no fact you used links the app, so this is a film without it: take out the Phone beat${phones.length > 1 ? 's' : ''} (beats ${phones.map((p) => p.i).join(', ')}), or record a fact that links one`);
    const named = beats.findIndex((b) => /ვინარ|vinari/iu.test(`${b?.say ?? ''} ${b?.show ?? ''}`) && !isFollow(b?.say ?? ''));
    if (named >= 0) out.push(`beats[${named}] names the app, but no fact you used links it: a film without the app never names it (the follow line excepted)`);
  }
  const cues = realCues(spec);
  const wantSound = facts.map((f) => [f, soundOf(f, sounds)]).filter(([, s]) => s);
  if (wantSound.length && !cues.some((c) => c.beat <= 1))
    out.push(`the topic is a sound (${wantSound.map(([f, s]) => `${f.id}: ${s}`).join('; ')}): play the real sound early, beats[0] "sfx": [{"name": "${wantSound[0][1]}", "at": 0}] with "leadIn" 0.8 to 1.2, so it is heard alone before the first word`);
  for (const c of cues) if (!sounds.usable(c.name)) out.push(`beats[${c.beat}] plays ${c.name}, which needs a credit line (CC BY) while ci/sounds.json "creditLines" is off: take a CC0 sound instead`);
  return out;
};
