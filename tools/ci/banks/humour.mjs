// The humour bank (phase 2, plan steps 13 and 14): scene setups and setup-and-twist pairs for the „იუმორი" films, written
// and judged on the API credit by banks.yml. Round 1 writes 3 pairs a fresh verified news item (ci/news-bank.json) plus
// 20 standalone Tbilisi street setups; round 2 has three judges score every pair in one request (a Tbilisi TikTok
// viewer, a fact checker who sees the news item, a brand guard); the best ~30 are kept. Only content safe to publish
// (this repo is public): the house linters run on every Georgian line, a mother insult is never written.
//   node tools/ci/banks/run.mjs humour [--max-usd N]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {budget, recordBank, runBatch} from './common.mjs';
import {bannedIn} from '../words.mjs';
import {BRANDS, itemText, MOTHER as MOTHER_FILM, numsOf, roots, twistProblems} from '../humor.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FILE = path.join(root, 'ci', 'humour-bank.json');
const MOTHER = /დედ(?:ა|ას|ის|ით|ამ|ან)|დედი/u;
const SYSTEM = [
  'You write 15-20 second street-humour openings for a Georgian car app\'s films, in Tbilisi\'s own humour. A pair is',
  '{setup: a jam or street scene in English, line_ka: the made-up driver\'s 1-2 sentence shout in Georgian (a mild street',
  'word at most, never a mother insult: end the line on „{bleep}" where one would come), hinge_ka: the Georgian word root',
  'the joke turns on, twist_ka: the true news item told plainly (a claim as a claim, with whose it is and „ჯერ',
  'დაპირებაა"), bridge_ka: one line that carries the joke into the app}. Never a real person or brand in the shout, never',
  'politics, never anyone hurt. Plain everyday Georgian, informal, no em dash. The film\'s rules, checked by a machine:',
  'the shout is 1 or 2 sentences and a „{bleep}" only as its last word; the twist_ka repeats the hinge word\'s root (the',
  'joke turns on it), uses no number the facts do not hold, and on a claim says whose it is (ამბობს/ამბობენ or -ო/-სო),',
  'ends on „ჯერ დაპირებაა" and never says „უკვე" or „შეგიძლია". A film has 3 to 7 seconds for the twist: twist_ka is',
  '1 or 2 short sentences, 14 words at most, with when it happened. bridge_ka claims nothing about the app beyond carrying',
  'the joke on (the film adds the feature\'s true facts). Return ONLY JSON.',
].join(' ');
const WRITE = (item) => `Write 3 different pairs on this verified news item. JSON: {"pairs": [{"setup": "", "line_ka": "", "hinge_ka": "", "twist_ka": "", "bridge_ka": ""}]}\n${JSON.stringify({id: item.id, status: item.status, who: item.who, facts_en: item.facts_en, ka: item.ka, hinges: item.hinges})}`;
const SETUPS = 'Write 20 different Tbilisi street scenes a short car joke could open on (a jam, parking, a marshrutka, a taxi, a car wash, a yard, a mountain road), each with the shout. JSON: {"setups": [{"setup": "", "line_ka": "", "hinge_ka": ""}]}';
const JUDGE_SETUPS = (setups) =>
  `Two judges score every street scene 0-10: "viewer" (a Tbilisi TikTok viewer: is this my street, would I stop scrolling?), "brand" (safe for a car brand: no real person, brand or group put down, no cruelty, never a woman as the butt of it). JSON: {"scores": [{"i": 0, "viewer": 0, "brand": 0}]}\nScenes: ${JSON.stringify(setups.map((x) => ({setup: x.setup, line_ka: x.line_ka})))}`;
const JUDGE = (pairs, item) =>
  `Three judges score every pair 0-10: "viewer" (a Tbilisi TikTok viewer: would I stop scrolling and laugh?), "facts" (does the twist say only what the news item says, a claim as a claim?), "brand" (safe for a car brand: no real person, brand or group put down, no cruelty). JSON: {"scores": [{"i": 0, "viewer": 0, "facts": 0, "brand": 0}]}\nItem: ${JSON.stringify({status: item?.status, facts_en: item?.facts_en, who: item?.who})}\nPairs: ${JSON.stringify(pairs)}`;

export const cleanPair = (p) =>
  p && typeof p.line_ka === 'string' && p.line_ka.length < 160 && !MOTHER.test(p.line_ka.replace(/\{bleep\}/g, '')) && !MOTHER_FILM.test(p.line_ka.replace(/\{bleep\}/g, '')) && !/[—]/.test(JSON.stringify(p)) &&
  bannedIn({beats: [{say: [p.line_ka, p.twist_ka ?? '', p.bridge_ka ?? ''].join(' ').replace(/\{bleep\}/g, '')}]}).length === 0 &&
  // the shout: 1 or 2 sentences, never a real brand, one full swallow at most and only at its end (tools/vo.py censor_spec)
  (p.line_ka.match(/[.!?…]+(?=\s|$)/g) ?? []).length <= 2 && !BRANDS.test(p.line_ka) && (p.line_ka.match(/\{bleep/g) ?? []).length <= 1 &&
  (!/\{bleep/.test(p.line_ka) || /\{bleep\}[\s.,!?…]*$/.test(p.line_ka));

/** a pair a humour film can use as it is (tools/ci/humor.mjs rules): its twist told true for its item, its numbers the
 *  item's, the hinge (a word root of the shout) back in the twist, the item's "who" never in the shout */
export const pairFits = (p, item, now = new Date().toISOString()) => {
  if (!cleanPair(p) || typeof p.twist_ka !== 'string' || !p.twist_ka.trim()) return false;
  if (twistProblems(p.twist_ka, item, now).length) return false;
  const have = new Set(numsOf(itemText(item)));
  const [year, , day] = String(item.eventDate ?? '').split('-').map(Number);
  if (numsOf(p.twist_ka).some((n) => !have.has(n) && n !== year && n !== day)) return false;
  const shout = new Set(roots(p.line_ka));
  if (!roots(p.twist_ka).some((r) => shout.has(r))) return false;
  if (item.who && p.line_ka.toLowerCase().includes(String(item.who).toLowerCase().slice(0, 5))) return false;
  return true;
};
const idOf = (t) => crypto.createHash('sha1').update(String(t)).digest('hex').slice(0, 8);

export const run = async (client, {maxUsd = 10, now = new Date().toISOString(), log = console.log} = {}) => {
  let news = [];
  try {
    news = JSON.parse(fs.readFileSync(path.join(root, 'ci', 'news-bank.json'), 'utf8')).items ?? [];
  } catch {}
  const fresh = news.filter((x) => !x.useUntil || Date.parse(x.useUntil) >= Date.parse(now)).slice(0, 12);
  const b = budget(Math.min(maxUsd, 0.25 * fresh.length * 2 + 1.5), 'humour');
  log(b.why);
  if (!b.ok) return 0;
  const jobs = [...fresh.map((x) => ({id: `pairs-${x.id}`, system: SYSTEM, user: WRITE(x), max: 8000, web: false})), {id: 'setups', system: SYSTEM, user: SETUPS, max: 16000, web: false}];
  const w = await runBatch(client, jobs, {bank: 'humour write', log, mode: 'direct'}); // plain calls: a batch can sit 45 min in the queue (run 40497380246)
  const byItem = fresh.map((x) => ({item: x, pairs: (w.results.get(`pairs-${x.id}`)?.json?.pairs ?? []).filter((p) => pairFits(p, x, now))})).filter((g) => g.pairs.length);
  const rawSetups = (w.results.get('setups')?.json?.setups ?? []).filter(cleanPair).slice(0, 30);
  const judges = [...byItem.map((g) => ({id: `judge-${g.item.id}`, system: SYSTEM, user: JUDGE(g.pairs, g.item), max: 4000, web: false})), ...(rawSetups.length ? [{id: 'judge-setups', system: SYSTEM, user: JUDGE_SETUPS(rawSetups), max: 4000, web: false}] : [])];
  const j = await runBatch(client, judges, {bank: 'humour judge', log, mode: 'direct'});
  const scored = byItem.flatMap((g) =>
    g.pairs.map((p, i) => {
      const s = (j.results.get(`judge-${g.item.id}`)?.json?.scores ?? []).find((x) => x.i === i) ?? {};
      return {id: `${g.item.id}-p${i}`, ...p, news: g.item.id, status: g.item.status, score: {viewer: s.viewer ?? 0, facts: s.facts ?? 0, brand: s.brand ?? 0}};
    }),
  );
  // a pair must pass the fact checker and the brand guard (7+), then the viewer ranks
  const kept = scored.filter((p) => p.score.facts >= 7 && p.score.brand >= 7).sort((a, b) => b.score.viewer - a.score.viewer).slice(0, 30);
  // a scene setup: the brand guard 7+, the viewer 6+
  const setups = rawSetups
    .map((p, i) => {
      const sc = (j.results.get('judge-setups')?.json?.scores ?? []).find((x) => x.i === i) ?? {};
      return {id: `s-${idOf(p.line_ka)}`, ...p, score: {viewer: sc.viewer ?? 0, brand: sc.brand ?? 0}};
    })
    .filter((p) => p.score.brand >= 7 && p.score.viewer >= 6)
    .sort((a, b) => b.score.viewer - a.score.viewer);
  log(`humour filters: ${fresh.length} news items, ${byItem.reduce((n, g) => n + g.pairs.length, 0)} pairs fit the film rules, ${rawSetups.length} setups clean, ${setups.length} pass their judges`);
  let bank = {};
  try {
    bank = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {}
  fs.writeFileSync(FILE, `${JSON.stringify({...bank, built: now.slice(0, 10), setups: [...new Map([...setups, ...(bank.setups ?? [])].map((x) => [x.id ?? idOf(x.line_ka), x])).values()].slice(0, 60), pairs: kept}, null, 1)}\n`);
  recordBank('humour', 0, kept.length); // the items only: runBatch recorded every batch and call as it went
  log(`humour: ${kept.length} pairs kept of ${scored.length}, ${setups.length} setups`);
  return kept.length;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  ok(cleanPair({line_ka: 'რას მისიგნალებ, შენ {bleep}!', twist_ka: 'ამბობენ, გაფრინდება. ჯერ დაპირებაა.', bridge_ka: 'მანამდე ნავიგატორი.'}), 'a clean pair with a full swallow passes');
  ok(!cleanPair({line_ka: 'შენ დედას...'}), 'a written mother insult never enters the bank');
  ok(!cleanPair({line_ka: 'ა — ბ'}), 'no em dash');
  const item = {id: 'fx-fly', status: 'claim', who: 'Elon Musk', eventDate: '2026-10-20', facts_en: ['A company head says its car will fly in 2027.'], ka: {twist: 'ამბობენ, მანქანა გაფრინდება.', kicker: 'ჯერ დაპირებაა.'}};
  const now = '2026-10-27T10:00:00Z';
  const pair = {line_ka: 'რას მისიგნალებ, გადავაფრინდე? შენ {bleep}', twist_ka: 'ამბობენ, მანქანა 2027 წელს გადაფრინდება. ჯერ დაპირებაა.', bridge_ka: 'მანამდე ნავიგატორი.'};
  ok(pairFits(pair, item, now), 'a pair that keeps the film rules fits');
  ok(!pairFits({...pair, twist_ka: 'მანქანა უკვე გადაფრინდება.'}, item, now), 'a claim told as done never fits');
  ok(!pairFits({...pair, twist_ka: 'ამბობენ, მანქანა 2030 წელს გადაფრინდება. ჯერ დაპირებაა.'}, item, now), 'a number the item does not have never fits');
  ok(!pairFits({...pair, twist_ka: 'ამბობენ, ავტომობილი იფრენს. ჯერ დაპირებაა.'}, item, now), 'no hinge word shared with the shout: does not fit');
  ok(!pairFits({...pair, line_ka: 'შენ {bleep}, რას მისიგნალებ?'}, item, now), 'a bleep in the middle of the shout: does not fit');
  ok(!pairFits({...pair, line_ka: 'ტესლა გადავაფრინდე?'}, item, now), 'a brand in the shout: does not fit');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
