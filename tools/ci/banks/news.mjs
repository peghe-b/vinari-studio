// The news bank (phase 2, plan step 13): true, dated, sourced car news, Georgian sources first, written on the API credit by
// banks.yml. Two rounds: SCOUT (web search over the lanes below, up to 5 candidates each) and VERIFY (a separate request a
// candidate re-fetches every source and checks every fact). Kept: 1 primary source or 2 independent ones, every fact
// confirmed, the Georgian lines through the house linters. Never politics, crime, crashes with victims or private people.
//   node tools/ci/banks/run.mjs news [--max-usd N] [--days 30]
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {budget, recordBank, runBatch} from './common.mjs';
import {bannedIn} from '../words.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const FILE = path.join(root, 'ci', 'news-bank.json');
export const LANES = [
  'Georgia: fuel prices this month (Tbilisi stations, gpb.ge, the fuel importers), only the published figures',
  'Georgia: new or changed road rules, fines and inspections (matsne.gov.ge, police.ge, the Ministry of Internal Affairs), the law text and its start date',
  'Georgia: car imports, customs and the electric-car market (rs.ge, geostat.ge, customs figures), dated',
  'the car world: a new feature, a recall or a record a big maker or a regulator announced, with the primary source',
  'motorsport beyond Formula 1 (rally, endurance, Dakar, karting), a result with its date',
  'car technology claims and demos (flying cars, self-driving, batteries): who claims what, and whether it is a claim, a demo or a fact',
];
const SYSTEM = [
  'You research car news for a Georgian car app\'s short films. Return ONLY JSON. Every item must be true, dated and',
  'sourced: give its sources as fetched URLs (a primary source, or two independent ones), the event date, and how long',
  'it may be told ("useUntil": about 30 days after the event, 60 for a law). "status": "fact" for what happened, "claim"',
  'for what someone promises or says (then "who"), "demo" for a prototype shown. Never politics or politicians, crime,',
  'a crash with victims, or a private person. Georgian sources first for Georgia. The Georgian fields: plain everyday',
  'Georgian, informal, no em dash, no exclamation: "lines" (2 short lines that tell it), "twist" (one line), "kicker"',
  '(for a claim: a short line that says it is only a claim). "hinges": 2-3 Georgian word roots a joke could turn on.',
].join(' ');
const SCOUT = (lane, days, now) =>
  `Today is ${now.slice(0, 10)}. Find up to 5 news items from the last ${days} days on: ${lane}. JSON: {"items": [{"id": "kebab-case-id", "status": "fact|claim|demo", "who": "", "eventDate": "YYYY-MM-DD", "published": "YYYY-MM-DD", "useUntil": "YYYY-MM-DD", "sources": [{"url": "", "publisher": "", "date": ""}], "facts_en": [""], "figures": [""], "georgia": true, "ka": {"lines": ["", ""], "twist": "", "kicker": ""}, "hinges": [""], "setups": [""]}]}`;
const VERIFY = (item) =>
  `Fetch every source URL of this item and check every fact and figure against what the pages say. JSON: {"keep": true|false, "why": "", "facts_ok": [true|false per fact], "eventDate": "YYYY-MM-DD"}. Keep only when every fact is confirmed on a fetched page and the sources are a primary one or two independent ones.\n${JSON.stringify(item)}`;

const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ''));
export const validItem = (x) =>
  x && /^[a-z0-9-]{4,60}$/.test(x.id) && ['fact', 'claim', 'demo'].includes(x.status) && isDate(x.eventDate) && isDate(x.useUntil) &&
  Array.isArray(x.sources) && x.sources.length >= 1 && x.sources.every((s) => /^https:\/\//.test(s?.url ?? '')) && Array.isArray(x.facts_en) && x.facts_en.length >= 1 &&
  x.ka && typeof x.ka.twist === 'string' && !/[—!]/.test(JSON.stringify(x.ka)) && (x.status !== 'claim' || (x.who && x.ka.kicker));
/** the house linters on the Georgian text: no banned word, no em dash */
export const lintKa = (x) => bannedIn({beats: [{say: [...(x.ka?.lines ?? []), x.ka?.twist ?? '', x.ka?.kicker ?? ''].join(' ')}]}).length === 0;
const hostOf = (u) => {
  try {
    return new URL(u).hostname.replace(/^www\./, '');
  } catch {
    return '';
  }
};
export const enoughSources = (x) => x.sources.some((s) => /\.ge$|gov|police|matsne|rs\.ge|geostat|fia\.com|nhtsa|europa\.eu/.test(hostOf(s.url))) || new Set(x.sources.map((s) => hostOf(s.url))).size >= 2;

export const readBank = () => {
  try {
    return JSON.parse(fs.readFileSync(FILE, 'utf8'));
  } catch {
    return {items: []};
  }
};

export const run = async (client, {maxUsd = 16, days = 30, now = new Date().toISOString(), log = console.log} = {}) => {
  const est = LANES.length * 0.7 + LANES.length * 5 * 0.3;
  const b = budget(Math.min(est, maxUsd), 'news');
  log(b.why);
  if (!b.ok) return 0;
  const scout = await runBatch(client, LANES.map((lane, i) => ({id: `scout-${i}`, system: SYSTEM, user: SCOUT(lane, days, now), max: 16000, uses: 8})), {bank: 'news scout', log});
  const bank = readBank();
  const have = new Set((bank.items ?? []).map((x) => x.id));
  const cands = [...scout.results.values()].flatMap((r) => (Array.isArray(r.json?.items) ? r.json.items : [])).filter((x) => validItem(x) && !have.has(x.id) && enoughSources(x) && lintKa(x));
  const uniq = [...new Map(cands.map((x) => [x.id, x])).values()];
  log(`news: ${uniq.length} candidates pass the shape, the sources and the linters`);
  let usd = scout.usd;
  let kept = [];
  if (uniq.length) {
    const ver = await runBatch(client, uniq.map((x) => ({id: x.id, system: SYSTEM, user: VERIFY(x), max: 8000, uses: x.sources.length + 2})), {bank: 'news verify', log});
    usd += ver.usd;
    kept = uniq.filter((x) => ver.results.get(x.id)?.json?.keep === true && (ver.results.get(x.id).json.facts_ok ?? []).every(Boolean)).map((x) => ({...x, lane: 'news', usedBy: [], verified: now.slice(0, 10)}));
    log(`news: ${kept.length} of ${uniq.length} verified (${uniq.length ? Math.round((100 * kept.length) / uniq.length) : 0} %)`);
  }
  const fresh = (bank.items ?? []).filter((x) => !x.useUntil || Date.parse(x.useUntil) >= Date.parse(now) - 30 * 864e5);
  fs.writeFileSync(FILE, `${JSON.stringify({...bank, built: now.slice(0, 10), items: [...kept, ...fresh]}, null, 1)}\n`);
  recordBank('news', 0, kept.length); // the items only: runBatch recorded every batch and call as it went
  return kept.length;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const good = {id: 'fuel-oct', status: 'fact', eventDate: '2026-10-20', useUntil: '2026-11-20', sources: [{url: 'https://www.gpb.ge/x'}, {url: 'https://bm.ge/y'}], facts_en: ['Petrol is 2.9 GEL'], ka: {lines: ['ბენზინი გაიაფდა.'], twist: 'ბენზინი გაიაფდა.', kicker: ''}};
  ok(validItem(good) && enoughSources(good) && lintKa(good), 'a dated, sourced, linted item passes');
  ok(!validItem({...good, status: 'claim'}), 'a claim needs "who" and a kicker');
  ok(!validItem({...good, ka: {...good.ka, twist: 'ბენზინი — გაიაფდა!'}}), 'no em dash, no "!"');
  ok(!enoughSources({...good, sources: [{url: 'https://blog.example.com/a'}]}), 'one unofficial source is not enough');
  ok(enoughSources({...good, sources: [{url: 'https://matsne.gov.ge/a'}]}), 'one primary Georgian source is');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
