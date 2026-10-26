// The story bank's growth (phase 2, plan steps 12 and 13): new true car stories beyond racing, on the API credit, by
// banks.yml. SCOUT (one request a lane: Georgian car history, discoveries, motorsport beyond F1, crazy true stories),
// duplicates out (titles and people already in ci/stories-sources.json), RESEARCH+WRITE (each candidate: its facts with
// fetched sources, figures for the graphics, visual ideas, the Georgian draft), VERIFY (a separate request re-fetches
// every fact). Accepted stories go to ci/banks/stories-new.json, never straight into the bank: `run.mjs stories-merge`
// moves them in after the photos bank found them 5 licensed photos each.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {budget, recordBank, runBatch} from './common.mjs';
import {bannedIn} from '../words.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const NEW_FILE = path.join(root, 'ci', 'banks', 'stories-new.json');
const BANK = path.join(root, 'ci', 'stories-sources.json');
export const SCOUT_LANES = {
  georgia: 'Georgian car history (Soviet-era Georgian cars and factories, the Kutaisi automobile plant, Georgian drivers, inventors and road stories)',
  discovery: 'car discoveries and inventions with a twist (who invented it, how it was found, what it changed)',
  racing: 'motorsport beyond Formula 1 (rally, Dakar, endurance, hill climbs, land speed)',
  crazy: 'crazy but true car stories (odd records, strange factories, lost and found cars, brand origin twists)',
};
const SYSTEM = [
  'You research TRUE car stories for 30-45 s Georgian films. Every fact must stand on a page you fetched (Wikipedia and',
  'the primary source it cites, museum or maker archives, newspapers). Never politics, never anyone mocked, no rumour told',
  'as fact (a legend is marked "legend"). Plain everyday Georgian, informal, no em dash, no exclamation. Return ONLY JSON.',
].join(' ');
const SCOUT = (lane, known) => `Find 15 candidate stories: ${SCOUT_LANES[lane]}. Not these (already told): ${known.join('; ').slice(0, 3000)}. JSON: {"candidates": [{"id": "kebab-id", "title_en": "", "people": [""], "years": [0], "why": ""}]}`;
const RESEARCH = (c, lane) =>
  `Research this story and write it for the bank. JSON: {"id": "${c.id}", "lane": "${lane}", "kind": "georgian_history|discovery|motorsport|crazy_true", "title": "<Georgian title>", "years": [0], "people": [""], "plot": "<English: setup, escalation, twist, payoff>", "facts": [{"en": "", "sources": [""]}], "figures": ["<a number with its unit and whose figure it is>"], "visual": ["<a purpose-built graphic idea: a map, a ledger, a versus, a receipt>"], "ka": {"setup": "", "escalation": "", "twist": "", "payoff": ""}, "hooks": [""], "ending": "", "names": [{"name": "", "say": [""], "who": [""], "when": "early"}], "photoQueries": ["<a Wikimedia Commons search that finds its real photos>"]}\nCandidate: ${JSON.stringify(c)}`;
const VERIFY = (s) => `Fetch every source of every fact and check it. JSON: {"keep": true|false, "facts_ok": [true|false per fact], "why": ""}\n${JSON.stringify({id: s.id, facts: s.facts, figures: s.figures, years: s.years})}`;

export const validStory = (s) =>
  s && /^[a-z0-9-]{4,60}$/.test(s.id) && typeof s.title === 'string' && Array.isArray(s.facts) && s.facts.length >= 3 && s.facts.every((f) => Array.isArray(f?.sources) && f.sources.some((u) => /^https:\/\//.test(u))) &&
  s.ka && ['setup', 'escalation', 'twist', 'payoff'].every((k) => typeof s.ka[k] === 'string' && s.ka[k].length > 4) && !/[—!]/.test(JSON.stringify(s.ka)) &&
  bannedIn({beats: [{say: Object.values(s.ka).join(' ')}]}).length === 0 && Array.isArray(s.names) && s.names.some((n) => n?.when === 'early');

export const run = async (client, {maxUsd = 45, perLane = 15, now = new Date().toISOString(), log = console.log} = {}) => {
  const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
  const known = Object.values(bank.stories ?? {}).flatMap((s) => [s.title, ...(s.people ?? [])]);
  const est = 4 * 0.6 + 4 * perLane * (0.55 + 0.3);
  const b = budget(Math.min(est, maxUsd), 'stories');
  log(b.why);
  if (!b.ok) return 0;
  const sc = await runBatch(client, Object.keys(SCOUT_LANES).map((lane) => ({id: `scout-${lane}`, system: SYSTEM, user: SCOUT(lane, known), max: 8000, uses: 6})), {bank: 'stories scout', log});
  const seen = new Set([...Object.keys(bank.stories ?? {}), ...known.map((x) => String(x).toLowerCase())]);
  const cands = Object.keys(SCOUT_LANES).flatMap((lane) =>
    (sc.results.get(`scout-${lane}`)?.json?.candidates ?? []).filter((c) => /^[a-z0-9-]{4,60}$/.test(c?.id ?? '') && !seen.has(c.id) && !(c.people ?? []).some((p) => seen.has(String(p).toLowerCase()))).slice(0, perLane).map((c) => ({c, lane})),
  );
  const rs = await runBatch(client, cands.map(({c, lane}) => ({id: c.id, system: SYSTEM, user: RESEARCH(c, lane), max: 16000, uses: 10})), {bank: 'stories research', log});
  const drafts = cands.map(({c}) => rs.results.get(c.id)?.json).filter(validStory);
  const vr = await runBatch(client, drafts.map((s) => ({id: s.id, system: SYSTEM, user: VERIFY(s), max: 6000, uses: s.facts.length + 2})), {bank: 'stories verify', log});
  const kept = drafts.filter((s) => vr.results.get(s.id)?.json?.keep === true && (vr.results.get(s.id).json.facts_ok ?? []).every(Boolean));
  let prev = {stories: {}};
  try {
    prev = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  } catch {}
  for (const s of kept) prev.stories[s.id] = {...s, verified: now.slice(0, 10), photos: []};
  fs.mkdirSync(path.dirname(NEW_FILE), {recursive: true});
  fs.writeFileSync(NEW_FILE, `${JSON.stringify({about: 'New stories waiting for their photos (tools/ci/banks/stories.mjs); `run.mjs stories-merge` moves the ones with 5 licensed photos into ci/stories-sources.json.', ...prev}, null, 1)}\n`);
  recordBank('stories', sc.usd + rs.usd + vr.usd, kept.length);
  log(`stories: ${kept.length} verified of ${drafts.length} drafts (${cands.length} candidates)`);
  return kept.length;
};

/** Moves the new stories that have 5+ licensed photos into the bank (ranked after the old ones). */
export const merge = ({log = console.log} = {}) => {
  const bank = JSON.parse(fs.readFileSync(BANK, 'utf8'));
  const raw = fs.readFileSync(BANK, 'utf8');
  let neu = {stories: {}};
  try {
    neu = JSON.parse(fs.readFileSync(NEW_FILE, 'utf8'));
  } catch {}
  let n = Object.keys(bank.stories).length;
  let moved = 0;
  for (const [id, s] of Object.entries(neu.stories ?? {})) {
    if ((s.photos ?? []).length < 5 || bank.stories[id]) continue;
    const {photoQueries, verified, ...rest} = s;
    bank.stories[id] = {rank: ++n, score: 7, ...rest};
    delete neu.stories[id];
    moved++;
  }
  const ind = /\n( +)"/.exec(raw)?.[1].length ?? 1;
  fs.writeFileSync(BANK, `${JSON.stringify(bank, null, ind)}\n`);
  fs.writeFileSync(NEW_FILE, `${JSON.stringify(neu, null, 1)}\n`);
  log(`stories-merge: ${moved} moved into the bank`);
  return moved;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const s = {id: 'kutaisi-truck', title: 'ქუთაისის სატვირთო', facts: [1, 2, 3].map(() => ({en: 'x', sources: ['https://en.wikipedia.org/wiki/KAZ']})), ka: {setup: 'ქუთაისში ქარხანა იყო.', escalation: 'სატვირთოებს აკეთებდნენ.', twist: 'მთაში ყველაზე კარგად დადიოდა.', payoff: 'დღესაც ახსოვთ.'}, names: [{name: 'ა', say: ['ა'], when: 'early'}]};
  ok(validStory(s), 'a sourced story with its Georgian draft and an early name passes');
  ok(!validStory({...s, facts: s.facts.slice(0, 2)}), 'fewer than 3 facts: not yet');
  ok(!validStory({...s, ka: {...s.ka, twist: 'ა — ბ'}}), 'no em dash in the Georgian');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
