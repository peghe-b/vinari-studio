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
/** the scout's candidates still to verify (r3: run 40497380246's verify batch waited 45 min, 13 of 15 were cut and the
 *  $3.69 scout was lost): kept between runs, never read by a film; a candidate leaves it when it is verified or dropped */
export const PENDING = path.join(root, 'ci', 'banks', 'news-pending.json');
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
const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(String(s ?? ''));
// VERIFY (r3, 2026-10-27): run 40424676292 kept 1 of 9 (11 %) and the public log could not say why. Now the verifier
// answers each fact on its own, says in a CODE why it drops an item (the log counts the codes, never model text), and
// says whether the Georgian lines tell only what it confirmed ("ka_ok"). An item whose sources hold some of its facts is
// kept with THOSE facts only (the rest dropped), when its Georgian lines need nothing else; never one that is unsafe, off
// the subject or without a primary source or two independent ones.
export const REASONS = ['ok', 'fetch_failed', 'fact_wrong', 'date_wrong', 'source_weak', 'off_topic', 'unsafe'];
const VERIFY = (item) =>
  `Fetch every source URL of this item and check every fact and figure against what the pages say (a page that will not load: try the publisher's other copy or a search for the same report). JSON: {"keep": true|false, "reason": "${REASONS.join('|')}", "facts_ok": [true|false per fact, in order], "eventDate": "YYYY-MM-DD as the pages give it", "ka_ok": true|false (the Georgian "lines", "twist" and "kicker" say ONLY confirmed facts, a claim as a claim with whose it is)}. "keep": every fact confirmed on a fetched page, and the sources a primary one or two independent ones. "reason": "ok" when kept, else the main reason ("unsafe": politics, crime, victims or a private person).\n${JSON.stringify(item)}`;

/** what the verifier's answer keeps of a candidate: the item with its confirmed facts only, or null; and the code */
export const verdictOf = (x, v, now = new Date().toISOString()) => {
  if (!v || typeof v !== 'object') return {item: null, code: 'no_answer'};
  const reason = REASONS.includes(v.reason) ? v.reason : v.keep === true ? 'ok' : 'unknown';
  const oks = Array.isArray(v.facts_ok) ? v.facts_ok : [];
  const facts = (x.facts_en ?? []).filter((_, i) => oks[i] === true);
  if (['unsafe', 'off_topic', 'source_weak'].includes(reason)) return {item: null, code: reason};
  if (!facts.length) return {item: null, code: reason === 'ok' ? 'no_fact' : reason};
  if (v.ka_ok !== true) return {item: null, code: 'ka_unconfirmed'};
  // a figure stays only when its digits are in a confirmed fact
  const digits = (t) => String(t).match(/\d+(?:[.,]\d+)?/g) ?? [];
  const confirmedDigits = new Set(facts.flatMap(digits));
  const figures = (x.figures ?? []).filter((f) => digits(f).every((d) => confirmedDigits.has(d)));
  const eventDate = isDate(v.eventDate) ? v.eventDate : x.eventDate;
  if (Date.parse(eventDate) > Date.parse(now)) return {item: null, code: 'date_wrong'};
  const partial = facts.length < (x.facts_en ?? []).length;
  return {item: {...x, eventDate, facts_en: facts, figures, lane: 'news', usedBy: [], verified: now.slice(0, 10), ...(partial ? {partial: true} : {})}, code: partial ? 'kept_partial' : 'kept'};
};

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

const readPending = (now) => {
  try {
    const j = JSON.parse(fs.readFileSync(PENDING, 'utf8'));
    // a candidate waits a week at most, and only while it may still be told
    return (j.items ?? []).filter((x) => validItem(x) && Date.parse(x.scouted ?? 0) >= Date.parse(now) - 7 * 864e5 && Date.parse(x.useUntil) >= Date.parse(now));
  } catch {
    return [];
  }
};
const writePending = (items) => {
  fs.mkdirSync(path.dirname(PENDING), {recursive: true});
  fs.writeFileSync(PENDING, `${JSON.stringify({about: 'News candidates the scout found and the verifier has not answered yet (tools/ci/banks/news.mjs). Never offered to a film: only ci/news-bank.json is.', items}, null, 1)}\n`);
};

/** `verifyOnly`: no scout, only the candidates an earlier run left pending (bank "news-verify") */
export const run = async (client, {maxUsd = 16, days = 30, now = new Date().toISOString(), log = console.log, verifyOnly = false} = {}) => {
  const bank = readBank();
  const have = new Set((bank.items ?? []).map((x) => x.id));
  const pending = readPending(now).filter((x) => !have.has(x.id));
  const est = (verifyOnly ? 0 : LANES.length * 0.7) + (pending.length + (verifyOnly ? 0 : LANES.length * 3)) * 0.12;
  const b = budget(Math.min(est, maxUsd), 'news');
  log(b.why);
  if (!b.ok) return 0;
  let usd = 0;
  let cands = [...pending];
  if (!verifyOnly) {
    const scout = await runBatch(client, LANES.map((lane, i) => ({id: `scout-${i}`, system: SYSTEM, user: SCOUT(lane, days, now), max: 16000, uses: 8})), {bank: 'news scout', log});
    usd += scout.usd;
    cands.push(...[...scout.results.values()].flatMap((r) => (Array.isArray(r.json?.items) ? r.json.items : [])).filter((x) => validItem(x) && !have.has(x.id) && enoughSources(x) && lintKa(x)).map((x) => ({...x, scouted: now})));
  }
  const uniq = [...new Map(cands.map((x) => [x.id, x])).values()];
  log(`news: ${uniq.length} candidates pass the shape, the sources and the linters (${pending.length} pending from an earlier run)`);
  // saved BEFORE the verifier runs: a run that dies or is cut keeps what its scout paid for
  writePending(uniq);
  let kept = [];
  if (uniq.length) {
    // plain calls, 3 at a time (the verify batch of run 40497380246 sat 45 min in the queue): about 1 to 2 min each
    const ver = await runBatch(client, uniq.map((x) => ({id: x.id, system: SYSTEM, user: VERIFY(x), max: 8000, uses: x.sources.length + 2})), {bank: 'news verify', log, mode: 'direct'});
    usd += ver.usd;
    const codes = {};
    const retry = [];
    for (const x of uniq) {
      const {item, code} = verdictOf(x, ver.results.get(x.id)?.json, now);
      codes[code] = (codes[code] ?? 0) + 1;
      if (item) {
        const {scouted, ...clean} = item;
        kept.push(clean);
      } else if (code === 'no_answer') retry.push(x);
    }
    writePending(retry);
    log(`news verify codes: ${Object.entries(codes).map(([k, n]) => `${k} ${n}`).join(', ')}`);
    log(`news: ${kept.length} of ${uniq.length} verified (${uniq.length ? Math.round((100 * kept.length) / uniq.length) : 0} %), ${retry.length} left pending, $${usd.toFixed(2)}`);
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
  const two = {...good, facts_en: ['Petrol is 2.9 GEL', 'Diesel is 3.1 GEL'], figures: ['2.9 GEL', '3.1 GEL']};
  const now = '2026-10-27T10:00:00Z';
  const all = verdictOf(two, {keep: true, reason: 'ok', facts_ok: [true, true], ka_ok: true, eventDate: '2026-10-20'}, now);
  ok(all.code === 'kept' && all.item.facts_en.length === 2 && !all.item.partial, 'every fact confirmed: kept whole');
  const half = verdictOf(two, {keep: false, reason: 'fact_wrong', facts_ok: [true, false], ka_ok: true}, now);
  ok(half.code === 'kept_partial' && half.item.facts_en.join() === 'Petrol is 2.9 GEL' && half.item.figures.join() === '2.9 GEL' && half.item.partial, 'one fact confirmed: kept with that fact and its figure only');
  ok(verdictOf(two, {keep: false, reason: 'fact_wrong', facts_ok: [true, false], ka_ok: false}, now).item === null, 'the Georgian lines need the unconfirmed fact: dropped');
  ok(verdictOf(two, {keep: true, reason: 'unsafe', facts_ok: [true, true], ka_ok: true}, now).code === 'unsafe', 'unsafe is never kept');
  ok(verdictOf(two, {keep: false, reason: 'fetch_failed', facts_ok: [false, false], ka_ok: true}, now).code === 'fetch_failed', 'nothing confirmed: its code is counted');
  ok(verdictOf(two, {keep: true, reason: 'ok', facts_ok: [true, true], ka_ok: true, eventDate: '2026-11-20'}, now).code === 'date_wrong', 'an event after today is not news');
  ok(verdictOf(two, null, now).code === 'no_answer', 'no answer: no_answer');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
