#!/usr/bin/env node
// Street words (ci/street-words.json; the owner, 2026-10-06: "mild Georgian folk insults make a film real and get it
// shared; the heaviest make the brand ugly"): the words a film may say, the ones it may never say, where, how often and
// in whose mouth. One module, read by tools/check.mjs (before the voice: fatal in the cloud), tools/build-index.mjs
// (warnings; errors for the post), tools/ci/prompt.mjs (the brief's street paragraph, --record's refusals and the
// ledger's "street"), tools/ci/filmlint.mjs (never written into a Film file) and tools/ci/publish.mjs (the ledger line).
//
//   import {streetProblems, streetWords, streetHistory, streetGate, checkStreet, REFRAIN, STREET} from './ci/streetwords.mjs'
//   streetWords(spec)              the allowed street words the film says or shows, once each, in order (the ledger's
//                                  "street"; build-index, check and --record count them)
//   streetProblems(spec, {skip, own, gate, onlyOwn})  [{code, where, msg, fatal}], the rules below; `skip(text)` leaves
//                                  a line out (the follow reminder), `own` is what the co-founder typed (his words are
//                                  his), `gate` is streetGate()'s verdict for this film (frequency and rotation),
//                                  `onlyOwn` a free film's rule (only the street words he typed)
//   streetHistory(specsDir, ledger, {except})   [{id, words}] one per film (its newest version), oldest first, by film
//                                  number: the words its spec says now, else the ledger's "street"
//   streetGate(history, {own})     {ok, why, recent, lastId}: may this film say a street word at all (never two films in
//                                  a row, at most one in three), and the words the last street film said (rotation)
//   checkStreet(text, {last})      the old one-text check: {errors, used} (the CLI below)
//
//   node tools/ci/streetwords.mjs "<text>" [--last ბოზი,ჩუჩელა]   prints the result; exit 1 on an error
//   node tools/ci/streetwords.mjs --test                            the built-in cases
//
// The rules (each line starts with its code; fatal = a failure of the cloud check, --record refuses it too):
//   BANNED_WORD   a "banned" stem or a "bannedRe" pattern anywhere a viewer hears or reads it (voice, subtitle, meta,
//                 scene text, cover, post, tags): fatal
//   STREET_MAX    more than perFilm.max allowed words in the film: fatal
//   STREET_ZONE   an allowed word in a zone (the cover, a meta label, the EndCard tagline or note, the post, a tag): fatal
//   STREET_REAL   an allowed word in a sentence that names a real person or brand ("realNames"), or in a quote („... ხარო")
//                 whose reporting sentence names one: never a vulgar or invented quote in a real mouth: fatal
//   STREET_TARGET ბოზი about a woman ("notAtWoman"), or any street word next to a mother insult ("mother"): fatal
//   STREET_SHOW   a street word on a subtitle or a scene that the voice does not say (the same beat or the one before): fatal
//   STREET_OFTEN  the film says one although the last film did, or one of the last (atMostOneIn - 1) films did: fatal,
//                 except for the words he typed himself (a note)
//   STREET_AGAIN  a word the last street film said (rotation): fatal, except for his own words (a note)
//   STREET_OWN    a free film (onlyOwn) says a street word he did not type: fatal
//   STREET_FRAME  a street word in a sentence with no "me", no quote and no vocative: aimed at the viewer? (a warning)
// Matching: a word matches with its Georgian case endings and particles (ბოზს, ჩუჩელავ, უმაქნისოო), never inside another
// word (სირია, სირცხვილი, ვირუსი, ბოთლი, ღორღი pass). A "plain" word (an everyday meaning too: a rat, a donkey, rubbish)
// counts only in an insult frame (შე ..., ... ხარ, ... ხარო, მეძახის) or said as a vocative (ვირო, ვირთხავ).
// What a list cannot judge (a slur aimed at a group in other words, sexual content, an insult at the viewer) stays the
// brief's and the gate's rule.

import {readFileSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {dirname, join} from 'node:path';
import {stem as roughStem} from './words.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
let LIST;
try {
  LIST = JSON.parse(readFileSync(join(HERE, '..', '..', 'ci', 'street-words.json'), 'utf8'));
  if (!Array.isArray(LIST.allowed) || !Array.isArray(LIST.banned)) throw new Error('no "allowed" or "banned" list');
} catch (e) {
  throw new Error(`ci/street-words.json is missing or broken (${e.message}): the street-word rules fail closed`);
}
export const STREET = LIST;

const G = '[\\u10D0-\\u10FF]';
const rx = (src, flags = 'u') => new RegExp(String(src).replaceAll('{G}', G), flags);
const norm = (s) => String(s ?? '').toLowerCase().normalize('NFC');
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// a word's stem: the word minus its final vowel when that leaves at least 3 letters (ბოზი -> ბოზ, ჩუჩელა -> ჩუჩელ)
const stemOf = (w) => {
  const n = norm(w);
  return [...n].length > 3 && /[იაეო]$/.test(n) ? n.slice(0, -1) : n;
};
// the syncopated stems Georgian makes (საქონელი -> საქონლის, ნაგავი -> ნაგვის)
const EXTRA = {საქონელი: ['საქონლ'], ნაგავი: ['ნაგვ']};
// what may follow a stem: a vowel, one case ending or the plural, and the "also" / quote / vocative particles
const ENDING = `(?:[იაეოუ]?(?:ს|მ|მა|ით|ად|ვ|ში|ზე|თან|ივით|ისთვის|ისგან|იდან|ებ${G}{0,7}|ობ${G}{0,5})?)(?:ც|ო|ოო|ვე)?`;
const PLAIN = new Set((LIST.plain ?? []).map(norm));
const NOT_AT_WOMAN = new Set((LIST.notAtWoman ?? []).map(norm));
const ALLOWED = LIST.allowed.map((word) => {
  const stems = [stemOf(word), ...(EXTRA[word] ?? [])];
  return {word, plain: PLAIN.has(norm(word)), notAtWoman: NOT_AT_WOMAN.has(norm(word)), re: new RegExp(`^(?:${stems.map(esc).join('|')})${ENDING}$`, 'u')};
});
const FRAME = rx(LIST.frame ?? '(?!)');
const REPORTED = rx(LIST.reported ?? '(?!)');
const WOMAN = rx(LIST.woman ?? '(?!)');
const MOTHER = rx(LIST.mother ?? '(?!)');
const REAL = rx(LIST.realNames ?? '(?!)');
// a reporting verb: the sentence names its own speaker („მამამ მითხრა, ... ხარო")
const SPEAKER = /მითხრ|მეუბნ|უთხრ|თქვა|თქვეს|ეძახ|მეძახ|დამიძახ|მიწოდ|მიყვირ|უყვირ/u;
const BANNED_RE = (LIST.bannedRe ?? []).map((b) => ({re: rx(b.re), why: b.why ?? 'never in a film'}));
const MAX = Number(LIST.perFilm?.max ?? 3);
const ONE_IN = Math.max(1, Number(LIST.frequency?.atMostOneIn ?? 3));

/** The refrain of the aura openings (არაუშავს, საქმე მაქვს ...), as words.mjs stems: the opening freshness rules skip it. */
export const REFRAIN = new Set((LIST.refrain ?? []).map((w) => roughStem(w)));

/** The Georgian words of a text, lower case, with where each starts. */
const tokens = (text) => [...norm(text).matchAll(/[ა-ჿ]+/gu)].map((m) => ({w: m[0], i: m.index}));
/** A text in sentences (a "|" is a subtitle break, not a sentence end). */
export const sentencesOf = (text) =>
  String(text ?? '')
    .replace(/\s*\|\s*/g, ' ')
    .split(/(?<=[.?!:;])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
const vocative = (form) => /(?:ო|ოო|ავ)$/u.test(form);

/** The allowed street words in one sentence: [{word, form}]. A "plain" word counts only in an insult frame or a vocative. */
export const streetHits = (sentence) => {
  const s = String(sentence ?? '');
  const framed = FRAME.test(norm(s));
  const out = [];
  for (const {w} of tokens(s)) {
    const a = ALLOWED.find((x) => x.re.test(w));
    if (!a) continue;
    if (a.plain && !framed && !vocative(w)) continue;
    out.push({word: a.word, form: w, notAtWoman: a.notAtWoman});
  }
  return out;
};
/** Every allowed word in a text whatever the frame (a Film file's strings, the zones): [{word, form}]. */
export const streetLoose = (text) =>
  tokens(text)
    .map(({w}) => [ALLOWED.find((x) => x.re.test(w)), w])
    .filter(([a]) => a)
    .map(([a, w]) => ({word: a.word, form: w}));
/** The banned words in a text: [{form, why}] (a banned stem at a word start, or a bannedRe pattern). */
export const bannedHits = (text) => {
  const t = norm(text);
  const out = [];
  for (const b of LIST.banned) {
    const m = new RegExp(`(?<![\\p{L}\\p{M}])${esc(norm(b)).replace(/ /g, '\\s+')}[\\p{L}\\p{M}]*`, 'u').exec(t);
    if (m) out.push({form: m[0], why: `"${b}…" (ci/street-words.json "banned")`});
  }
  for (const b of BANNED_RE) {
    const m = b.re.exec(t);
    if (m) out.push({form: m[0], why: b.why});
  }
  return out;
};

// ---- where a spec says and shows things ----------------------------------------------------------------------------
const beatsOf = (spec) => (Array.isArray(spec?.beats) ? spec.beats : []);
const scenesOf = (b) => [b?.scene, ...(Array.isArray(b?.cuts) ? b.cuts.map((c) => c?.scene) : [])].filter((x) => x && typeof x === 'object');
// a scene's own words: every string with a Georgian letter, any depth, but the EndCard's tagline and note (zones)
const sceneStrings = (sc, path) => {
  const out = [];
  const walk = (v, p) => {
    if (typeof v === 'string') {
      if (/[ა-ჿ]/u.test(v)) out.push([p, v]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(x, `${p}[${i}]`));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) if (!(sc.type === 'EndCard' && (k === 'tagline' || k === 'note'))) walk(x, `${p}.${k}`);
  };
  walk(sc, path);
  return out;
};
/** The zones of a spec (never a street word): [[where, text]]. */
const zonesOf = (spec) => {
  const out = [];
  const cover = spec?.cover && typeof spec.cover === 'object' ? spec.cover : {};
  for (const k of ['title', 'tag', 'sub']) if (typeof cover[k] === 'string') out.push([`cover.${k}`, cover[k]]);
  beatsOf(spec).forEach((b, i) => {
    (Array.isArray(b?.meta) ? b.meta : []).forEach((m, j) => typeof m === 'string' && out.push([`beats[${i}].meta[${j}]`, m]));
    for (const sc of scenesOf(b)) if (sc.type === 'EndCard') for (const k of ['tagline', 'note']) if (typeof sc[k] === 'string') out.push([`beats[${i}].scene.${k}`, sc[k]]);
  });
  const post = spec?.post && typeof spec.post === 'object' ? spec.post : {};
  if (typeof post.description === 'string') out.push(['post.description', post.description]);
  (Array.isArray(post.tags) ? post.tags : []).forEach((t, j) => typeof t === 'string' && out.push([`post.tags[${j}]`, t]));
  return out;
};
/** Everything a viewer hears or reads: [[where, text]]. */
const everyText = (spec) => {
  const out = [];
  beatsOf(spec).forEach((b, i) => {
    if (typeof b?.say === 'string') out.push([`beats[${i}].say`, b.say]);
    if (typeof b?.show === 'string') out.push([`beats[${i}].show`, b.show]);
    scenesOf(b).forEach((sc, k) => out.push(...sceneStrings(sc, k ? `beats[${i}].cuts[${k - 1}].scene` : `beats[${i}].scene`)));
  });
  return [...out, ...zonesOf(spec)];
};

/** The allowed street words a film says (its voice) or shows (subtitles, scene text): once each, in order. */
export const streetWords = (spec, {skip = () => false} = {}) => {
  const words = [];
  beatsOf(spec).forEach((b) => {
    for (const t of [b?.say, b?.show]) if (typeof t === 'string' && !skip(t)) for (const s of sentencesOf(t)) for (const h of streetHits(s)) if (!words.includes(h.word)) words.push(h.word);
    for (const sc of scenesOf(b)) if (sc.type !== 'EndCard') for (const [, t] of sceneStrings(sc, '')) for (const h of streetLoose(t)) if (!words.includes(h.word)) words.push(h.word);
  });
  return words;
};

/** The words of his own (the topic and the note he typed) among `words`. */
const hisWords = (own) => new Set(streetLoose(own ?? '').map((h) => h.word));

/** The rules on one spec: [{code, where, msg, fatal}]. Georgian base specs only (a translation skips them). */
export const streetProblems = (spec, {skip = () => false, own = '', gate = null, onlyOwn = false} = {}) => {
  const out = [];
  const add = (code, where, msg, fatal = true) => out.push({code, where, msg, fatal});
  // BANNED_WORD: anywhere
  for (const [where, text] of everyText(spec)) for (const h of bannedHits(text)) add('BANNED_WORD', where, `"${h.form}" is never said or shown (${h.why}): a mild word of ci/street-words.json "allowed", in a "me" line, or none`);
  if ((spec?.lang ?? 'ka') !== 'ka') return out;
  // STREET_ZONE: the cover, the meta, the EndCard line and note, the post, the tags
  for (const [where, text] of zonesOf(spec)) for (const h of streetLoose(text)) add('STREET_ZONE', where, `"${h.form}": ${where.split(/[.[]/)[0] === 'post' ? 'the post' : where.startsWith('cover') ? 'the cover' : 'this place'} stays clean (ci/street-words.json "zones"); a street word lives in the voice of a "me" line`);
  // the voice, sentence by sentence
  const said = []; // [{beat, word}]
  beatsOf(spec).forEach((b, i) => {
    if (typeof b?.say !== 'string' || skip(b.say)) return;
    const ss = sentencesOf(b.say);
    ss.forEach((s, k) => {
      const hits = streetHits(s);
      for (const h of hits) said.push({beat: i, word: h.word});
      if (!hits.length) return;
      const where = `beats[${i}].say`;
      const real = REAL.exec(s);
      const before = k > 0 ? ss[k - 1] : i > 0 && typeof beatsOf(spec)[i - 1]?.say === 'string' ? sentencesOf(beatsOf(spec)[i - 1].say).at(-1) ?? '' : '';
      // a quote („... ხარო") whose speaker is not in its own sentence: the sentence before reports it („ფერარიმ მითხრა.")
      const quoteOf = !SPEAKER.test(norm(s)) && /ო[.?!]?$/u.test(s.trim()) ? REAL.exec(before) : null;
      if (real || quoteOf)
        add('STREET_REAL', where, `"${hits[0].form}" next to "${(real ?? quoteOf)[0]}": never a street word in a real person's or brand's mouth or at them (a quote they never said); give the made-up "me" line its own sentence, the names another`);
      if (hits.some((h) => h.notAtWoman) && WOMAN.test(norm(s))) add('STREET_TARGET', where, `"${hits.find((h) => h.notAtWoman).form}" is never said about a woman`);
      if (MOTHER.test(norm(s))) add('STREET_TARGET', where, `no mother insult next to a street word ("${hits[0].form}")`);
      if (!REPORTED.test(norm(s))) add('STREET_FRAME', where, `"${hits[0].form}": aimed at the viewer? A street word lives in a "me" line or a made-up character's line („მამამ მითხრა, ... ხარო"), never at the viewer`, false);
    });
  });
  // STREET_SHOW: a street word on screen that the voice does not say (this beat or the one before)
  beatsOf(spec).forEach((b, i) => {
    const voice = new Set(said.filter((x) => x.beat === i || x.beat === i - 1).map((x) => x.word));
    const shown = [];
    if (typeof b?.show === 'string' && !skip(b.show)) shown.push([`beats[${i}].show`, b.show]);
    scenesOf(b).forEach((sc, k) => sc.type !== 'EndCard' && shown.push(...sceneStrings(sc, k ? `beats[${i}].cuts[${k - 1}].scene` : `beats[${i}].scene`)));
    for (const [where, text] of shown) for (const h of streetLoose(text)) if (!voice.has(h.word)) add('STREET_SHOW', where, `"${h.form}" is shown but not said here: the screen shows what the voice says (a punch word the voice says), or nothing`);
  });
  // STREET_MAX
  const words = streetWords(spec, {skip});
  if (words.length > MAX) add('STREET_MAX', 'beats', `${words.length} street words (${words.join(', ')}); ${MAX} at most a film: keep the one that lands hardest`);
  // a free film (the free idea) says only the street words he typed
  if (onlyOwn) {
    const his = hisWords(own);
    const extra = words.filter((w) => !his.has(w));
    if (extra.length) add('STREET_OWN', 'beats', `${extra.join(', ')}: a free film says only the street words he typed (${his.size ? [...his].join(', ') : 'none here'}); take ${extra.length === 1 ? 'it' : 'them'} out`);
  }
  // frequency and rotation (streetGate): his own words are his (a note)
  if (gate && words.length) {
    const his = hisWords(own);
    const ours = words.filter((w) => !his.has(w));
    if (!gate.ok) {
      if (ours.length) add('STREET_OFTEN', 'beats', `${ours.join(', ')}: ${gate.why}; this film says none (the owner: only here and there, never two films in a row, at most one in ${ONE_IN})`);
      else add('STREET_OFTEN', 'beats', `${words.join(', ')}: ${gate.why}; kept, because the co-founder typed ${words.length === 1 ? 'it' : 'them'}`, false);
    }
    const again = words.filter((w) => (gate.recent ?? []).includes(w));
    const againOurs = again.filter((w) => !his.has(w));
    if (againOurs.length) add('STREET_AGAIN', 'beats', `${againOurs.join(', ')}: ${gate.lastId} said ${againOurs.length === 1 ? 'it' : 'them'}, the newest film with street words: another word (ci/street-words.json "allowed") or none`);
  }
  return out;
};

// ---- the page's history: which films said street words -------------------------------------------------------------
const vNumber = (id) => Number(/^v(\d+)-/.exec(id)?.[1] ?? 0);
const redoNumber = (id) => Number(/-r(\d+)$/.exec(id)?.[1] ?? 0);
const familyOf = (id) => String(id).replace(/-r\d+$/, '');
/** [{id, words}] one per film (its newest version), oldest first by number: the words its spec says now (the spec is the
 *  truth), else the ledger's "street". Demos, hook variants, translations and throwaway specs are not films. */
export const streetHistory = (specsDir, ledger = {}, {except = null} = {}) => {
  const byId = new Map();
  let files = [];
  try {
    files = readdirSync(specsDir);
  } catch {}
  for (const f of files) {
    if (!/^v\d+-[^.]*\.json$/.test(f) || /--h\d+\.json$/.test(f)) continue;
    try {
      const spec = JSON.parse(readFileSync(join(specsDir, f), 'utf8'));
      if (typeof spec?.id === 'string' && Array.isArray(spec.beats) && (spec.lang ?? 'ka') === 'ka') byId.set(spec.id, {id: spec.id, words: streetWords(spec)});
    } catch {}
  }
  for (const e of Object.values(ledger ?? {})) {
    if (!e || typeof e.id !== 'string' || !vNumber(e.id) || byId.has(e.id)) continue;
    byId.set(e.id, {id: e.id, words: Array.isArray(e.street) ? e.street.filter((w) => typeof w === 'string') : []});
  }
  const fams = new Map();
  for (const v of [...byId.values()].filter((x) => familyOf(x.id) !== except).sort((a, b) => vNumber(a.id) - vNumber(b.id) || redoNumber(a.id) - redoNumber(b.id))) fams.set(familyOf(v.id), v);
  return [...fams.values()];
};
/** May the next film say a street word (never two films in a row, at most one in atMostOneIn), and the words of the newest
 *  film that said any (rotation). `history`: streetHistory() without the film itself. */
export const streetGate = (history) => {
  const back = ONE_IN > 1 ? history.slice(-(ONE_IN - 1)) : []; // slice(-0) would be the whole history
  const hit = [...back].reverse().find((v) => v.words.length);
  const lastStreet = [...history].reverse().find((v) => v.words.length) ?? null;
  return {
    ok: !hit,
    why: hit ? `${hit.id} said ${hit.words.join(', ')}${back.at(-1)?.id === hit.id ? ', the film right before this one' : `, one of the last ${back.length} films`}` : '',
    recent: lastStreet ? lastStreet.words : [],
    lastId: lastStreet ? lastStreet.id : null,
  };
};

/** The old one-text check (the CLI): {errors, used}. */
export function checkStreet(text, {last = []} = {}) {
  const errors = bannedHits(text).map((h) => `banned word "${h.form}": never in a film (${h.why})`);
  const used = [];
  for (const s of sentencesOf(text)) for (const h of streetHits(s)) if (!used.includes(h.word)) used.push(h.word);
  if (used.length > MAX) errors.push(`${used.length} street words (${used.join(', ')}): at most ${MAX} per film`);
  const again = used.filter((w) => last.map(norm).includes(norm(w)));
  if (again.length) errors.push(`"${again.join('", "')}" was in the last street film: rotate (ci/street-words.json "allowed" has ${LIST.allowed.length})`);
  return {errors, used};
}

function selfTest() {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) {
      bad++;
      console.log(`FAIL: ${what}`);
    }
  };
  // [text, last, errors?, used]
  const cases = [
    ['მამამ მითხრა, უმაქნისი ხარო. არაუშავს!', [], 0, ['უმაქნისი']],
    ['შე ჩუჩელავ, სად იყავი?', [], 0, ['ჩუჩელა']],
    ['მანქანა მოგეყვანა, შე უმაქნისოო.', [], 0, ['უმაქნისი']],
    ['საქონელი ხარ, ზეთს არ ცვლიო.', [], 0, ['საქონელი']],
    ['შე ვირთხავ, მანქანა ვერ იპოვე?', [], 0, ['ვირთხა']],
    ['ბოზი ხარ რა.', [], 0, ['ბოზი']],
    ['ბოზებო, სად ხართ?', [], 0, ['ბოზი']],
    ['დედაშენი რეკავს, აიღე ტელეფონი', [], 0, []],
    ['ფეები და მანქანები', [], 0, []],
    ['სირიაში ომია. სირიის საზღვარი. სირცხვილია.', [], 0, []],
    ['ვირუსი შეიჭრა. ვირტუალური რეალობა. ტრაქტორებს აკეთებდა.', [], 0, []],
    ['საქონელი ჩამოვიყვანეთ. ვირთხამ სადენები გადაღრღნა. ვირი ბალახს ჭამს.', [], 0, []],
    ['ჩაყლაპა. ყლუპი წყალი. ბოზბაში. ბოთლი. ღორღი. ნაგავსაყრელი.', [], 0, []],
    ['შე პიდარასტო', [], 1, []],
    ['ყლეობაა ეს', [], 1, []],
    ['რა ყლე ხარ', [], 1, []],
    ['დედას მოგიტყნავ', [], 1, []],
    ['ზანგი', [], 1, []],
    ['დაუნი ხარ', [], 1, []],
    ['ტუტუცი ხარ, ბოთე ხარ, ჩერჩეტი ხარ და ვირი ხარ.', [], 1, ['ტუტუცი', 'ბოთე', 'ჩერჩეტი', 'ვირი']],
    ['შე ჩუჩელავ', ['ჩუჩელა'], 1, ['ჩუჩელა']],
  ];
  for (const [text, last, nErr, used] of cases) {
    const r = checkStreet(text, {last});
    ok((nErr === 0 ? r.errors.length === 0 : r.errors.length >= 1) && JSON.stringify(r.used) === JSON.stringify(used), `${text} -> ${JSON.stringify(r)}`);
  }
  // whole specs
  const spec = (beats, extra = {}) => ({id: 'v1-t', beats: beats.map((say) => ({say, show: say})), ...extra});
  const codes = (s, o) => streetProblems(s, o).map((p) => p.code);
  ok(codes(spec(['მამამ მითხრა, უმაქნისი ხარო.', 'არაუშავს.'])).length === 0, 'a "me" line passes');
  ok(codes(spec(['ფერარიმ მითხრა: შე უმაქნისო.'])).includes('STREET_REAL'), 'a street word in a real mouth');
  ok(codes(spec(['ფერარიმ მითხრა.', 'უმაქნისი ხარო.'])).includes('STREET_REAL'), 'a quote of a real person');
  ok(!codes(spec(['მოგწონს ვინარი?', 'მამამ მითხრა, უმაქნისი ხარო.'])).includes('STREET_REAL'), 'a quote with its own speaker is not the sentence before\'s');
  ok(codes(spec(['შეყვარებული ბოზი აღმოჩნდა.'])).includes('STREET_TARGET'), 'ბოზი about a woman');
  ok(codes(spec(['უმაქნისი ხარ.'])).includes('STREET_FRAME'), 'aimed at the viewer (a warning)');
  ok(!streetProblems(spec(['უმაქნისი ხარ.'])).find((p) => p.code === 'STREET_FRAME').fatal, 'STREET_FRAME is a warning');
  ok(codes(spec(['მამამ მითხრა, უმაქნისი ხარო.'], {cover: {title: 'უმაქნისი | ხარ'}})).includes('STREET_ZONE'), 'the cover is a zone');
  ok(codes(spec(['მამამ მითხრა, ჩუჩელა ხარო.'], {post: {description: 'ჩუჩელა ხარ', tags: []}})).includes('STREET_ZONE'), 'the post is a zone');
  ok(codes(spec(['მამამ მითხრა, ტუტუცი ხარო.', 'მერე ბოთე ხარო.', 'ჩერჩეტი ხარო.', 'ბრიყვი ხარო.'])).includes('STREET_MAX'), 'four words');
  ok(codes({id: 'v1-t', beats: [{say: 'მამამ მითხრა.', show: 'უმაქნისი ხარო.'}]}).includes('STREET_SHOW'), 'shown, not said');
  ok(codes(spec(['ეს ყლეობაა.'])).includes('BANNED_WORD'), 'banned in the voice');
  // frequency and rotation
  const hist = [{id: 'v1-a', words: []}, {id: 'v2-b', words: ['ბოზი']}, {id: 'v3-c', words: []}];
  if (ONE_IN > 1) ok(!streetGate(hist).ok && streetGate(hist.slice(0, 1)).ok, 'one in three');
  else ok(streetGate(hist).ok, 'every film may say one');
  ok(streetGate([...hist, {id: 'v4-d', words: []}]).ok && streetGate([...hist, {id: 'v4-d', words: []}]).recent[0] === 'ბოზი', 'rotation remembers the last street film');
  const g = streetGate(hist);
  if (ONE_IN > 1) ok(codes(spec(['მამამ მითხრა, უმაქნისი ხარო.']), {gate: g}).includes('STREET_OFTEN'), 'too often');
  if (ONE_IN > 1) ok(!streetProblems(spec(['მამამ მითხრა, უმაქნისი ხარო.']), {gate: g, own: 'მამამ მითხრა უმაქნისი ხარო'}).find((p) => p.code === 'STREET_OFTEN').fatal, 'his own words are a note');
  ok(codes(spec(['მამამ მითხრა, ბოზი ხარო.']), {gate: streetGate([...hist, {id: 'v4-d', words: []}, {id: 'v5-e', words: []}])}).includes('STREET_AGAIN'), 'rotation');
  ok(codes(spec(['მამამ მითხრა, უმაქნისი ხარო.']), {onlyOwn: true, own: 'მოგწონს კონტენტი?'}).includes('STREET_OWN'), 'a free film: only his words');
  ok(!codes(spec(['მამამ მითხრა, უმაქნისი ხარო.']), {onlyOwn: true, own: 'მამამ მითხრა უმაქნისი ხარო'}).includes('STREET_OWN'), 'a free film: his own word');
  ok(REFRAIN.has(roughStem('არაუშავს')), 'the refrain');
  console.log(bad ? `${bad} failed` : `ok: ${cases.length} texts and the spec rules`);
  return bad ? 1 : 0;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  const args = process.argv.slice(2);
  if (args[0] === '--test') process.exit(selfTest());
  const i = args.indexOf('--last');
  const last = i >= 0 ? (args[i + 1] || '').split(',').filter(Boolean) : [];
  const text = args.filter((a, k) => k !== i && k !== i + 1).join(' ');
  const r = checkStreet(text, {last});
  console.log(JSON.stringify(r, null, 1));
  process.exit(r.errors.length ? 1 : 0);
}
