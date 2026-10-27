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
import {newsProblems} from './news.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const ACTS = ['cold', 'twist', 'app', 'end'];
export const PAUSE_S = [0.6, 1.0];
export const LEN = [15, 20];
/** each act's seconds [min, max] */
export const ACT_S = {cold: [3, 7.5], twist: [3, 7], app: [3, 7], end: [1.5, 5]}; // the end: the free-week line said over the store card (about 3.5 s) and its short hold
export const VOICES = {m: ['gemini:Fenrir', 'gemini:Algenib'], f: ['gemini:Kore', 'gemini:Pulcherrima']};
export const CHARACTER_SCENES = new Set(['SideCar', 'ShoutType']);
export const MOTHER = /დედ(?:ა|ას|ის|ით|ამ|ან)|დედი|მამიკო|ბებია(?:შენ|ს)/u;
const ATTRIB = /(?:ამბობ|აცხად|ჰპირდ|პირდებ|წერ(?:ს|ენ)|იტყობინ|უთქვამს|თქვა)|(?:\p{L}(?:ო|სო))(?=[\s.,!?…]|$)/u;
const KICKER = /ჯერ\s+(?:დაპირება|არ\s|მხოლოდ)|დაპირებაა|ჯერჯერობით|ნახავ(?:თ)?\s*(?:რა|თუ)/u;
const ALREADY = /(?<![\p{L}])(?:უკვე|შეგიძლია)(?![\p{L}])/u;
const FRESH_WORD = /(?<![\p{L}])(?:ახლა|ახალი|ახალ|დღეს)(?![\p{L}])/u;
const TODAY = /(?<![\p{L}])დღეს(?![\p{L}])/u;
const TRAFFIC = /საცობ|ტრაფიკ|გადატვირთ|ჯემ|პრობკ/u;
const UNLIMITED = /ულიმიტ/u;
const NO_UNLIMITED = new Set(['qr', 'reminders', 'widgets', 'auction', 'docs']);
export const BRANDS = /ტოიოტ|მერსედეს|ბმვ|bmw|აუდ|ფოლკსვაგენ|ტესლ|ჰონდა|ნისან|ჰიუნდაი|კია|ფორდ|შევროლე|ლექსუს|მაზდ|სუბარუ|ოპელ|პორშე|ფერარ|ლამბორგინ|ჯიპ|ლადა|ბოლტ|იანდექს|ვოლტ/iu;

const say = (b) => String(b?.say ?? '').replace(/\|/g, ' ');
const sentences = (t) => String(t).split(/(?<=[.!?…])\s+/).map((x) => x.trim()).filter((x) => /\p{L}/u.test(x));
export const roots = (t) => (String(t).toLowerCase().match(/[ა-ჿ]{5,}/g) ?? []).map((w) => w.slice(0, 4));
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

/** The twist told TRUE for its bank item (also the humour bank's filter, tools/ci/banks/humour.mjs): a claim says whose it
 *  is, carries a kicker and never „უკვე/შეგიძლია"; „ახლა/ახალი" within 30 days, „დღეს" within 2. -> [[code, line]] */
export const twistProblems = (twist, item, now = new Date().toISOString()) => {
  const out = [];
  if (!item) return out;
  if (item.status === 'claim') {
    if (!ATTRIB.test(twist)) out.push(['NEWS_TRUE', `${item.id} is a CLAIM: say whose (ამბობს, ჰპირდება, -ო/-სო)`]);
    if (!KICKER.test(twist)) out.push(['NEWS_TRUE', `${item.id} is a CLAIM: a kicker that says so („ჯერ დაპირებაა")`]);
    if (ALREADY.test(twist)) out.push(['NEWS_TRUE', `${item.id} is a CLAIM: never „უკვე" or „შეგიძლია" on it`]);
  }
  const age = item.eventDate ? days(item.eventDate, now) : Infinity;
  if (FRESH_WORD.test(twist) && age > 30) out.push(['NEWS_FRESH', `„ახლა/ახალი" on news ${Math.round(age)} days old (30 at most)`]);
  if (TODAY.test(twist) && age > 2) out.push(['NEWS_FRESH', `„დღეს" on news ${Math.round(age)} days old (2 at most)`]);
  return out;
};

// ---- the twist is SOURCED from its bank item (r3, 2026-10-27) ---------------------------------------------------------
// NEWS_BANK proved only that the id exists: the writer could name a real item and tell another story, a bigger number or
// a wrong date on the card. TWIST_SOURCE: every number the twist says or the NewsCard shows is one of the item's (its
// confirmed facts, figures and Georgian lines); the twist shares a word root with the item's Georgian lines (it tells
// THIS item); the twist's NewsCard names the same item, its status, a source of the item and the item's date.
const KA_MONTHS = ['იანვარ', 'თებერვალ', 'მარტ', 'აპრილ', 'მაის', 'ივნის', 'ივლის', 'აგვისტო', 'სექტემბერ', 'ოქტომბერ', 'ნოემბერ', 'დეკემბერ'];
const NUM_KA = {ერთი: 1, ორი: 2, სამი: 3, ოთხი: 4, ხუთი: 5, ექვსი: 6, შვიდი: 7, რვა: 8, ცხრა: 9, ათი: 10, ოცი: 20, ასი: 100, ათასი: 1000};
const NUM_END = ['ს', 'ის', 'ით', 'ად', 'ზე', 'მდე', 'ამდე', 'ჯერ'];
export const numsOf = (t) => {
  const s = String(t ?? '');
  const out = (s.match(/\d+(?:[.,]\d+)?/g) ?? []).map((x) => Number(x.replace(',', '.')));
  for (const w of s.toLowerCase().match(/[ა-ჿ]+/g) ?? [])
    for (const [k, v] of Object.entries(NUM_KA)) {
      const stem = k.endsWith('ი') ? k.slice(0, -1) : k;
      if (w === k || (stem.length >= 3 && NUM_END.some((e) => w === stem + e))) out.push(v);
    }
  return out;
};
export const itemText = (item) => [...(item.facts_en ?? []), ...(item.figures ?? []), ...(item.ka?.lines ?? []), item.ka?.twist ?? '', item.ka?.kicker ?? ''].join(' ');
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
export const sourceProblems = (spec, beats, item) => {
  const out = [];
  const P = (line) => out.push(`TWIST_SOURCE ${line}`);
  const twistBeats = beats.filter((b) => b?.act === 'twist');
  const twist = twistBeats.map(say).join(' ');
  const card = twistBeats.map((b) => b?.scene).find((s) => s?.type === 'NewsCard') ?? null;
  // the numbers: said or shown, each one of the item's (a year and the card's day of the month are the date, checked below)
  const have = new Set(numsOf(itemText(item)));
  const [year, , day] = String(item.eventDate ?? '').split('-').map(Number); // the date is said too („8 ოქტომბერს")
  const extra = numsOf([twist, card?.headline ?? ''].join(' ')).filter((n) => !have.has(n) && n !== year && n !== day);
  if (extra.length) P(`the twist says ${[...new Set(extra)].join(', ')}: a number that is not in ${item.id} (its facts: ${(item.facts_en ?? []).join(' ').slice(0, 160)})`);
  // the subject: one word root of the item's own Georgian lines comes back in the twist
  const ir = new Set(roots([...(item.ka?.lines ?? []), item.ka?.twist ?? '', ...(item.hinges ?? [])].join(' ')));
  if (ir.size && !roots(`${twist} ${card?.headline ?? ''}`).some((r) => ir.has(r))) P(`the twist shares no word with ${item.id}'s own lines: it tells another story`);
  // the card
  if (!card) P('the twist shows its news on a NewsCard (news, headline, date, source, status)');
  else {
    if (card.news !== item.id) P(`the NewsCard names "${card.news ?? ''}", the spec's news is "${item.id}"`);
    if ((card.status ?? 'fact') !== (item.status ?? 'fact')) P(`the NewsCard stamps "${card.status ?? 'fact'}", ${item.id} is a ${item.status ?? 'fact'}`);
    const hosts = (item.sources ?? []).flatMap((x) => [hostOf(x.url), String(x.publisher ?? '').toLowerCase()]).filter(Boolean);
    const src = String(card.source ?? '').toLowerCase().replace(/^www\./, '');
    if (!src || !hosts.some((h) => h && (h === src || h.endsWith(src) || src.endsWith(h) || h.includes(src)))) P(`the NewsCard's source "${card.source ?? ''}" is not one of ${item.id}'s (${hosts.filter((h) => h.includes('.')).join(', ')})`);
    const [y, m, d] = String(item.eventDate ?? '').split('-').map(Number);
    const date = String(card.date ?? '');
    if (!date) P(`the NewsCard shows no date (${item.eventDate})`);
    else if (y && (!date.includes(String(y)) && !date.includes(KA_MONTHS[m - 1]) || (date.match(/\d{1,2}(?!\d)/g) ?? []).filter((x) => Number(x) <= 31).some((x) => Number(x) !== d && !String(y).endsWith(x)) || (KA_MONTHS.some((k, i) => i !== m - 1 && date.includes(k)))))
      P(`the NewsCard's date „${date}" is not ${item.id}'s ${item.eventDate}`);
  }
  return out;
};

/** the humour bank, read (empty when it is missing) */
export const loadHumour = (base = root) => {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(base, 'ci', 'humour-bank.json'), 'utf8'));
    return {pairs: Array.isArray(j.pairs) ? j.pairs : [], setups: Array.isArray(j.setups) ? j.setups : []};
  } catch {
    return {pairs: [], setups: []};
  }
};

/** The brief's humour offer (r3): the judged pairs on the news items offered to this film (2 an item at most, the viewer's
 *  favourites first) and 3 judged street setups, one line each. A film that takes a pair names it ("joke": "<id>"). */
export const offerHumour = (bank, newsItems, {max = 4, setups = 3} = {}) => {
  const ids = new Set((newsItems ?? []).map((x) => x?.id));
  const per = {};
  const pairs = (bank?.pairs ?? [])
    .filter((p) => p?.id && ids.has(p.news))
    .sort((a, b) => (b.score?.viewer ?? 0) - (a.score?.viewer ?? 0))
    .filter((p) => (per[p.news] = (per[p.news] ?? 0) + 1) <= 2)
    .slice(0, max);
  const sets = (bank?.setups ?? []).filter((x) => x?.line_ka).slice(0, setups);
  return [
    ...pairs.map((p) => `- [${p.id}] news ${p.news}: shout „${p.line_ka}" · hinge „${p.hinge_ka ?? ''}" · twist „${p.twist_ka}" · bridge „${p.bridge_ka ?? ''}" (${p.setup ?? ''})`),
    ...sets.map((x) => `- setup: ${x.setup ?? ''} · shout „${x.line_ka}"`),
  ];
};

export const humorProblems = (spec, {news = loadNews(), humour = null, timeline = null, recent = [], now = new Date().toISOString()} = {}) => {
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
    // r3: the street take (tools/vo.py GEMINI_STYLE_PRESETS.street): shouted from a car window, never read like the narrator
    if (b.act === 'cold' && (b.style ?? spec.style) !== 'street') P('CHAR_STYLE', `beats[${i}]: the character's line is shouted: "style": "street"`);
  }
  // the narrator is one voice from TWIST to END
  const narr = beats.filter((b) => ['twist', 'app', 'end'].includes(b?.act) && !b?.speaker);
  if (narr.some((b) => b.voice && b.voice !== narrator)) P('CHAR_LINES', 'from TWIST to END the narrator is one continuous voice (no beat voice of its own)');
  // the bleep
  const marks = beats.flatMap((b, i) => censorsIn(String(b?.say ?? '')).map((m) => ({...m, i, act: b.act})));
  // r3: a swear written as the glyphs („#@%") is READ ALOUD by the voice: the cut is always the marker (tools/vo.py
  // censor_spec), and the marker ends its chunk (the take stops there, the bleep starts BLEEP_LEAD before its last sample)
  beats.forEach((b, i) => {
    if (/#@%/.test(String(b?.say ?? ''))) P('BLEEP_PLACE', `beats[${i}]: „#@%" in a "say" is read aloud: write „{bleep}" (the voice stops, the bleep sounds)`);
    String(b?.say ?? '').split('|').forEach((ch, c) => {
      const m = /\{bleep(?::[^}]*)?\}/.exec(ch);
      if (m && ch.slice(m.index + m[0].length).replace(/[\s.,!?…:;]/g, '')) P('BLEEP_PLACE', `beats[${i}] chunk ${c}: the bleep ends its chunk (only punctuation after it): words after it are cut by the take`);
    });
  });
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
    for (const [code, line] of twistProblems(twist, item, now)) P(code, line);
    out.push(...sourceProblems(spec, beats, item));
    // a pair taken from the humour bank: it exists and is a pair on THIS news item
    if (spec.joke !== undefined) {
      const pair = (humour ?? loadHumour()).pairs.find((p) => p?.id === spec.joke);
      if (!pair) P('JOKE_BANK', `"joke": "${spec.joke}" is not a pair of the humour bank (ci/humour-bank.json)`);
      else if (pair.news !== item.id) P('JOKE_BANK', `the pair ${pair.id} is on ${pair.news}, the film tells ${item.id}`);
    }
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
    // r3: exactly the codes named (a bad fixture that also trips an unrelated rule proves nothing about its own)
    const same = want.length === got.length && want.every((c) => got.includes(c));
    ok(same, `${f}: expects [${want.join(', ')}], got [${got.join(', ')}]${same ? '' : ` (${humorProblems(j.spec, {news: bank, now, recent: j.recent ?? []}).join(' / ')})`}`);
    if (!want.length) good++;
  }
  ok(good >= 3, `${good} example scripts pass clean`);
  ok(humorProblems({category: 'nav', beats: []}).length === 0, 'another category: no humour rule');
  // r3: the humour fixture films (specs/demo-p2-humor-*.json with a "news"): each passes the humour gate and the news check
  // on the REAL verified bank (ci/news-bank.json), on the day after its item's event (inside its use window), and the pair
  // it names is in the real humour bank
  const realNews = loadNews();
  const specsDir = path.join(root, 'specs');
  const films = fs.readdirSync(specsDir).filter((f) => /^demo-p2-humor-.*\.json$/.test(f)).map((f) => JSON.parse(fs.readFileSync(path.join(specsDir, f), 'utf8'))).filter((x) => x.news);
  for (const film of films) {
    const item = realNews.find((x) => x.id === film.news);
    const day = item ? new Date(Date.parse(item.eventDate) + 864e5).toISOString() : new Date().toISOString();
    const lines = [...humorProblems(film, {news: realNews, now: day}), ...newsProblems(film, {items: realNews, now: day})];
    ok(item && !lines.length, `${film.id}: passes the humour gate on the real bank (${item ? `${item.id}, ${item.status}, ${item.eventDate}` : 'its item is not in ci/news-bank.json'})${lines.length ? `: ${lines.join(' / ')}` : ''}`);
  }
  const hb = {pairs: [{id: 'fx-fuel-fact-p0', news: 'fx-fuel-fact', line_ka: 'ა', twist_ka: 'ბ', score: {viewer: 8}}, {id: 'fx-fuel-fact-p1', news: 'fx-fuel-fact', line_ka: 'ა', twist_ka: 'ბ', score: {viewer: 9}}, {id: 'fx-fuel-fact-p2', news: 'fx-fuel-fact', line_ka: 'ა', twist_ka: 'ბ', score: {viewer: 7}}, {id: 'gone-p0', news: 'gone', line_ka: 'ა', twist_ka: 'ბ', score: {viewer: 10}}], setups: [{id: 's-1', setup: 'a yard', line_ka: 'გ'}]};
  const offer = offerHumour(hb, bank.filter((x) => x.id === 'fx-fuel-fact'));
  ok(offer.length === 3 && offer[0].startsWith('- [fx-fuel-fact-p1]') && !offer.some((l) => l.includes('gone-p0')) && offer[2].startsWith('- setup:'), `the offer: the offered item's best 2 pairs, then the setups (${offer.length} lines)`);
  const g2 = JSON.parse(fs.readFileSync(path.join(dir, 'good-2-fuel.json'), 'utf8')).spec;
  const jk = (joke) => humorProblems({...g2, joke}, {news: bank, now, humour: hb}).filter((l) => l.startsWith('JOKE_BANK')).length;
  ok(jk('fx-fuel-fact-p1') === 0 && jk('nope') === 1 && jk('gone-p0') === 1, 'JOKE_BANK: a named pair exists and is on the film\'s news item');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
