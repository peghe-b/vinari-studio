// The „იუმორი" category's rules (phase 2, plan step 14; the owner, 2026-10-26: a 15-20 s Tbilisi street scene with partly
// bleeped swearing, a pause, a current-news twist, then about 5 s of the app). Read by check.mjs (fatal in the cloud), the
// brief and the self-test. A humour film's spec:
//   "category": "humor", "pair": "<feature id>" (its facts and screens), "news": "<id of ci/news-bank.json>",
//   every beat an "act": cold | twist | app | end, in that order; the PAUSE is the last COLD beat's "hold" (0.6 to 1.0 s:
//   the shout freezes, the marker circles the hinge word: ShoutType and SideCar draw it after the voice ends);
//   the character's lines (COLD only, 1-2 sentences): the beat's own "voice" (never the narrator's), "speaker": {"sex":
//   "m" | "f"}, "subs": "inPicture", and a scene that shows him speaking (SideCar or ShoutType, its "sex" the same).
//
//   humorProblems(spec, {bank, timeline, ledger, now})   one "CODE ..." line each, or []
//   node tools/ci/humor.mjs --test                       the self-test (the 10 example scripts in ci/fixtures/humor/)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateTimeline} from './fx.mjs';
import {censorsIn} from './words.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ACTS = ['cold', 'twist', 'app', 'end'];
export const PAUSE_S = [0.6, 1.0];
export const LEN = [15, 20];
/** each act's seconds [min, max] */
export const ACT_S = {cold: [3, 7.5], twist: [3, 7], app: [3, 7], end: [1.5, 5]}; // the end: the free-week line said over the store card (about 3.5 s) and its short hold
export const VOICES = {m: ['gemini:Fenrir', 'gemini:Algenib'], f: ['gemini:Kore', 'gemini:Pulcherrima']};
export const CHARACTER_SCENES = new Set(['SideCar', 'ShoutType']);
const MOTHER = /დედ(?:ა|ას|ის|ით|ამ|ან)|დედი|მამიკო|ბებია(?:შენ|ს)/u;
const ATTRIB = /(?:ამბობ|აცხად|ჰპირდ|პირდებ|წერ(?:ს|ენ)|იტყობინ|უთქვამს|თქვა)|(?:\p{L}(?:ო|სო))(?=[\s.,!?…]|$)/u;
const KICKER = /ჯერ\s+(?:დაპირება|არ\s|მხოლოდ)|დაპირებაა|ჯერჯერობით|ნახავ(?:თ)?\s*(?:რა|თუ)/u;
const ALREADY = /(?<![\p{L}])(?:უკვე|შეგიძლია)(?![\p{L}])/u;
const FRESH_WORD = /(?<![\p{L}])(?:ახლა|ახალი|ახალ|დღეს)(?![\p{L}])/u;
const TODAY = /(?<![\p{L}])დღეს(?![\p{L}])/u;
const TRAFFIC = /საცობ|ტრაფიკ|გადატვირთ|ჯემ|პრობკ/u;
const UNLIMITED = /ულიმიტ/u;
const NO_UNLIMITED = new Set(['qr', 'reminders', 'widgets', 'auction', 'docs']);
const BRANDS = /ტოიოტ|მერსედეს|ბმვ|bmw|აუდ|ფოლკსვაგენ|ტესლ|ჰონდა|ნისან|ჰიუნდაი|კია|ფორდ|შევროლე|ლექსუს|მაზდ|სუბარუ|ოპელ|პორშე|ფერარ|ლამბორგინ|ჯიპ|ლადა|ბოლტ|იანდექს|ვოლტ/iu;

const say = (b) => String(b?.say ?? '').replace(/\|/g, ' ');
const sentences = (t) => String(t).split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter((x) => /\p{L}/u.test(x));
const roots = (t) => (String(t).toLowerCase().match(/[ა-ჿ]{5,}/g) ?? []).map((w) => w.slice(0, 4));
const days = (a, b) => (Date.parse(b) - Date.parse(a)) / 864e5;

/** the news bank, read (empty when it is missing) */
export const loadNews = (base = root) => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'news-bank.json'), 'utf8'));
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
};

export const humorProblems = (spec, {news = loadNews(), timeline = null, recent = [], now = new Date().toISOString()} = {}) => {
  if (spec?.category !== 'humor') return [];
  const out = [];
  const P = (code, line) => out.push(`${code} ${line}`);
  const beats = Array.isArray(spec.beats) ? spec.beats : [];
  let tl = timeline;
  try {
    tl ??= estimateTimeline(spec);
  } catch {
    tl = null;
  }
  const dur = tl ? tl.duration ?? tl.beats.at(-1)?.end ?? 0 : 0;
  if (dur && (dur < LEN[0] - 0.3 || dur > LEN[1] + 0.3)) P('HUMOR_LEN', `the film runs ${dur.toFixed(1)} s: ${LEN[0]} to ${LEN[1]} s`);
  // the acts, in order, each within its seconds
  const acts = beats.map((b) => b?.act);
  if (acts.some((a) => !ACTS.includes(a))) P('HUMOR_ACTS', `every beat names its "act" (${ACTS.join(', ')})`);
  const order = acts.map((a) => ACTS.indexOf(a));
  if (order.some((x, i) => i && x < order[i - 1])) P('HUMOR_ACTS', `the acts run in order (${ACTS.join(' > ')}): found ${acts.join(' > ')}`);
  for (const a of ACTS) if (!acts.includes(a)) P('HUMOR_ACTS', `no "${a}" act`);
  if (tl)
    for (const a of ACTS) {
      const idx = acts.map((x, i) => (x === a ? i : -1)).filter((i) => i >= 0);
      if (!idx.length) continue;
      const s = tl.beats[idx[idx.length - 1]].end - tl.beats[idx[0]].start;
      const [lo, hi] = ACT_S[a];
      if (s < lo - 0.15 || s > hi + 0.3) P('HUMOR_ACTS', `the ${a} act runs ${s.toFixed(1)} s (${lo} to ${hi} s)`);
    }
  // the pause: the last COLD beat holds 0.6 to 1.0 s, frozen
  const lastCold = acts.lastIndexOf('cold');
  const hold = Number(beats[lastCold]?.hold ?? 0);
  if (lastCold >= 0 && (hold < PAUSE_S[0] || hold > PAUSE_S[1])) P('HUMOR_ACTS', `the pause: the last COLD beat (beats[${lastCold}]) holds ${hold} s after its line (${PAUSE_S[0]} to ${PAUSE_S[1]} s, "hold")`);
  // the hook: a horn (or a named sound) at 0.1 s or earlier
  const b0 = beats[0];
  if (!(b0?.sfx ?? []).some((c) => typeof c?.name === 'string' && (c.at ?? 0) <= 0.1)) P('HUMOR_HOOK', 'beats[0] opens on its sound at 0.1 s or earlier (a horn: "sfx": [{"name": "horn-short", "at": 0}])');
  // the character
  const narrator = String(spec.voice ?? '');
  const charBeats = beats.map((b, i) => [b, i]).filter(([b]) => b?.speaker);
  const lines = charBeats.flatMap(([b]) => sentences(say(b)));
  const closing = charBeats.filter(([b]) => b.act === 'end' && sentences(say(b)).every((x) => x.split(/\s+/).length <= 3));
  if (!charBeats.length) P('CHAR_LINES', 'no character line: COLD has 1 or 2 sentences of a made-up character ("speaker": {"sex"}, his own "voice")');
  if (lines.length - closing.length > 2) P('CHAR_LINES', `${lines.length} character sentences: 2 at most (and one closing line of 3 words or fewer)`);
  for (const [b, i] of charBeats) {
    if (b.act !== 'cold' && !closing.some(([x]) => x === b)) P('CHAR_LINES', `beats[${i}]: the character speaks in COLD only`);
    const sex = b.speaker?.sex;
    if (!['m', 'f'].includes(sex)) P('CHAR_LINES', `beats[${i}].speaker.sex: "m" or "f"`);
    if (!b.voice || b.voice === narrator) P('CHAR_LINES', `beats[${i}]: the character's own voice, never the narrator's (${narrator})`);
    else if (sex && !VOICES[sex]?.includes(b.voice)) P('CHAR_LINES', `beats[${i}].voice ${b.voice} does not match a ${sex === 'm' ? 'man' : 'woman'} (${VOICES[sex]?.join(', ')})`);
    if (!CHARACTER_SCENES.has(b.scene?.type) || (b.scene?.sex && b.scene.sex !== sex)) P('CHAR_VISIBLE', `beats[${i}]: the speaker is on screen while he speaks (SideCar or ShoutType, "sex": "${sex}")`);
    if (b.subs !== 'inPicture' || b.scene?.type !== 'ShoutType' && b.scene?.type !== 'SideCar') P('HUMOR_SUBS', `beats[${i}]: a character beat says "subs": "inPicture" and its scene shows every word`);
    if (BRANDS.test(say(b))) P('HUMOR_REAL', `beats[${i}]: the character's line never names a real brand or person`);
  }
  // the narrator is one voice from TWIST to END
  const narr = beats.filter((b) => ['twist', 'app', 'end'].includes(b?.act) && !b?.speaker);
  if (narr.some((b) => b.voice && b.voice !== narrator)) P('CHAR_LINES', 'from TWIST to END the narrator is one continuous voice (no beat voice of its own)');
  // the bleep
  const marks = beats.flatMap((b, i) => censorsIn(String(b?.say ?? '')).map((m) => ({...m, i, act: b.act})));
  if (marks.length > 1) P('BLEEP_PLACE', `${marks.length} bleeps: 1 at most`);
  for (const m of marks) if (m.act !== 'cold') P('BLEEP_PLACE', `beats[${m.i}]: the bleep lives in COLD only`);
  beats.forEach((b, i) => {
    for (const t of [b?.say, b?.show].filter(Boolean)) if (MOTHER.test(String(t).replace(/\{bleep(?::[^}]*)?\}/g, ''))) P('MOTHER', `beats[${i}]: a mother insult is never heard or written: end the line on „{bleep}" (the full swallow)`);
    for (const m of censorsIn(String(b?.say ?? ''))) if (m.hidden && MOTHER.test(m.hidden)) P('MOTHER', `beats[${i}]: a mother insult is swallowed whole („{bleep}"), never hinted („{bleep:...}" shows its last letters)`);
  });
  // the news twist
  const item = news.find((x) => x?.id === spec.news) ?? null;
  const twist = beats.filter((b) => b?.act === 'twist').map(say).join(' ');
  if (!item) P('NEWS_BANK', `"news": "${spec.news ?? ''}" is not an item of the verified news bank (ci/news-bank.json)`);
  else {
    if (item.useUntil && Date.parse(now) > Date.parse(item.useUntil)) P('NEWS_BANK', `the news item ${item.id} expired on ${item.useUntil}`);
    if (item.status === 'claim') {
      if (!ATTRIB.test(twist)) P('NEWS_TRUE', `${item.id} is a CLAIM: say whose (ამბობს, ჰპირდება, -ო/-სო)`);
      if (!KICKER.test(twist)) P('NEWS_TRUE', `${item.id} is a CLAIM: a kicker that says so („ჯერ დაპირებაა")`);
      if (ALREADY.test(twist)) P('NEWS_TRUE', `${item.id} is a CLAIM: never „უკვე" or „შეგიძლია" on it`);
    }
    const age = item.eventDate ? days(item.eventDate, now) : Infinity;
    if (FRESH_WORD.test(twist) && age > 30) P('NEWS_FRESH', `„ახლა/ახალი" on news ${Math.round(age)} days old (30 at most)`);
    if (TODAY.test(twist) && age > 2) P('NEWS_FRESH', `„დღეს" on news ${Math.round(age)} days old (2 at most)`);
    const used = recent.filter((r) => r.news === item.id);
    if (used.some((r) => r.at && days(r.at, now) < 14)) P('NEWS_ROTATE', `${item.id} was told in the last 14 days (${used.map((r) => r.id).join(', ')})`);
    if (recent[0]?.news === item.id) P('NEWS_ROTATE', `${item.id} was the previous film's twist too`);
    if (item.who && charBeats.some(([b]) => say(b).toLowerCase().includes(String(item.who).toLowerCase().slice(0, 5)))) P('HUMOR_REAL', `the character's line names ${item.who}: a real name never sits next to a street word or a bleep`);
  }
  // the hinge: a word root of the character's line comes back in the twist
  const ch = new Set(charBeats.flatMap(([b]) => roots(say(b))));
  if (ch.size && !roots(twist).some((r) => ch.has(r))) P('HINGE', 'no word of the character\'s line comes back in the twist: the joke turns on one shared word (mark it with HingeMark)');
  // the app act keeps the paired feature true
  const app = beats.filter((b) => b?.act === 'app' || b?.act === 'end').map(say).join(' ');
  if (spec.pair === 'nav' && TRAFFIC.test(app)) P('APP_TRUE', 'the navigator never talks about traffic or jams');
  if (NO_UNLIMITED.has(spec.pair) && UNLIMITED.test(beats.map(say).join(' '))) P('APP_TRUE', `„ულიმიტო" is not true of ${spec.pair}`);
  if (!spec.pair) P('APP_TRUE', 'no "pair": the feature whose facts and screens the APP act shows');
  // the cover
  if (spec.cover && /\{bleep|#@%/.test(String(spec.cover.title ?? ''))) P('HUMOR_COVER', 'the cover never carries the bleep or the swear');
  if (spec.cover && !spec.cover.kind) P('HUMOR_COVER', 'the cover is purpose-built (a "kind"), black and white');
  return out;
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const dir = path.join(root, 'ci', 'fixtures', 'humor');
  const fx = fs.existsSync(dir) ? fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort() : [];
  const bank = JSON.parse(fs.readFileSync(path.join(dir, '_news.json'), 'utf8')).items;
  const now = '2026-10-26T12:00:00Z';
  let good = 0;
  for (const f of fx.filter((x) => !x.startsWith('_'))) {
    const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
    const got = [...new Set(humorProblems(j.spec, {news: bank, now, recent: j.recent ?? []}).map((l) => l.split(' ')[0]))];
    const want = j.expect ?? [];
    const same = want.every((c) => got.includes(c)) && (want.length || !got.length);
    ok(same, `${f}: expects [${want.join(', ')}], got [${got.join(', ')}]${same ? '' : ` (${humorProblems(j.spec, {news: bank, now, recent: j.recent ?? []}).join(' / ')})`}`);
    if (!want.length) good++;
  }
  ok(good >= 3, `${good} example scripts pass clean`);
  ok(humorProblems({category: 'nav', beats: []}).length === 0, 'another category: no humour rule');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
