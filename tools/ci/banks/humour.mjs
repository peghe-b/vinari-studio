// The humour bank (phase 2, plan steps 13 and 14): scene setups and setup-and-twist pairs for the „იუმორი" films, written
// and judged on the API credit by banks.yml. Round 1 writes 3 pairs a fresh verified news item (ci/news-bank.json) plus
// 20 standalone Tbilisi street setups; round 2 has three judges score every pair in one request (a Tbilisi TikTok
// viewer, a fact checker who sees the news item, a brand guard); the best ~30 are kept. Only content safe to publish
// (this repo is public): the house linters run on every Georgian line, a mother insult is never written.
//   node tools/ci/banks/run.mjs humour [--max-usd N]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {budget, recordBank, runBatch} from './common.mjs';
import {bannedIn} from '../words.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FILE = path.join(root, 'ci', 'humour-bank.json');
const MOTHER = /დედ(?:ა|ას|ის|ით|ამ|ან)|დედი/u;
const SYSTEM = [
  'You write 15-20 second street-humour openings for a Georgian car app\'s films, in Tbilisi\'s own humour. A pair is',
  '{setup: a jam or street scene in English, line_ka: the made-up driver\'s 1-2 sentence shout in Georgian (a mild street',
  'word at most, never a mother insult: end the line on „{bleep}" where one would come), hinge_ka: the Georgian word root',
  'the joke turns on, twist_ka: the true news item told plainly (a claim as a claim, with whose it is and „ჯერ',
  'დაპირებაა"), bridge_ka: one line that carries the joke into the app}. Never a real person or brand in the shout, never',
  'politics, never anyone hurt. Plain everyday Georgian, informal, no em dash. Return ONLY JSON.',
].join(' ');
const WRITE = (item) => `Write 3 different pairs on this verified news item. JSON: {"pairs": [{"setup": "", "line_ka": "", "hinge_ka": "", "twist_ka": "", "bridge_ka": ""}]}\n${JSON.stringify({id: item.id, status: item.status, who: item.who, facts_en: item.facts_en, ka: item.ka, hinges: item.hinges})}`;
const SETUPS = 'Write 20 different Tbilisi street scenes a short car joke could open on (a jam, parking, a marshrutka, a taxi, a car wash, a yard, a mountain road), each with the shout. JSON: {"setups": [{"setup": "", "line_ka": "", "hinge_ka": ""}]}';
const JUDGE = (pairs, item) =>
  `Three judges score every pair 0-10: "viewer" (a Tbilisi TikTok viewer: would I stop scrolling and laugh?), "facts" (does the twist say only what the news item says, a claim as a claim?), "brand" (safe for a car brand: no real person, brand or group put down, no cruelty). JSON: {"scores": [{"i": 0, "viewer": 0, "facts": 0, "brand": 0}]}\nItem: ${JSON.stringify({status: item?.status, facts_en: item?.facts_en, who: item?.who})}\nPairs: ${JSON.stringify(pairs)}`;

export const cleanPair = (p) =>
  p && typeof p.line_ka === 'string' && p.line_ka.length < 160 && !MOTHER.test(p.line_ka.replace(/\{bleep\}/g, '')) && !/[—]/.test(JSON.stringify(p)) &&
  bannedIn({beats: [{say: [p.line_ka, p.twist_ka ?? '', p.bridge_ka ?? ''].join(' ').replace(/\{bleep\}/g, '')}]}).length === 0;

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
  const w = await runBatch(client, jobs, {bank: 'humour write', log});
  const byItem = fresh.map((x) => ({item: x, pairs: (w.results.get(`pairs-${x.id}`)?.json?.pairs ?? []).filter(cleanPair)})).filter((g) => g.pairs.length);
  const j = await runBatch(client, byItem.map((g) => ({id: `judge-${g.item.id}`, system: SYSTEM, user: JUDGE(g.pairs, g.item), max: 4000, web: false})), {bank: 'humour judge', log});
  const scored = byItem.flatMap((g) =>
    g.pairs.map((p, i) => {
      const s = (j.results.get(`judge-${g.item.id}`)?.json?.scores ?? []).find((x) => x.i === i) ?? {};
      return {...p, news: g.item.id, score: {viewer: s.viewer ?? 0, facts: s.facts ?? 0, brand: s.brand ?? 0}};
    }),
  );
  // a pair must pass the fact checker and the brand guard (7+), then the viewer ranks
  const kept = scored.filter((p) => p.score.facts >= 7 && p.score.brand >= 7).sort((a, b) => b.score.viewer - a.score.viewer).slice(0, 30);
  const setups = (w.results.get('setups')?.json?.setups ?? []).filter(cleanPair).slice(0, 60);
  let bank = {};
  try {
    bank = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {}
  fs.writeFileSync(FILE, `${JSON.stringify({...bank, built: now.slice(0, 10), setups: [...setups, ...(bank.setups ?? [])].slice(0, 60), pairs: kept}, null, 1)}\n`);
  recordBank('humour', w.usd + j.usd, kept.length);
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
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
