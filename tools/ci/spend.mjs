// The API credits' ledger (plan step 2.2, 2026-10-26). The studio's script step may run on the Anthropic API key (the
// repo secret ANTHROPIC_API_KEY: the Max plan's monthly API credits, about $200, no card and no auto-reload, so an empty
// balance is the hard cap) instead of the owner's Claude token (tools/ci/claude-run.mjs). At about $5 to $7 a film the
// credits carry about 30 films a month, against about 140 made: this ledger spreads them over the month, keeps the total
// under the monthly cap (STUDIO_API_MONTH_USD, default 190) and lets the cheap quality passes (tools/ci/director.mjs)
// go first. Every film the ledger turns away runs on the Claude token, exactly as before.
//
//   import {mayWrite, mayPlan, record, markEmpty, readLedger} from './spend.mjs'
//   node tools/ci/spend.mjs may write|plan     one JSON line {ok, why, ...}; exit 0 when the API may be used, 3 when not
//   node tools/ci/spend.mjs add <kind> <usd>   this run's spend (kind: write | plan | fix), from the result's estimate
//   node tools/ci/spend.mjs empty <why>        the API said the balance is empty (billing_error): the next runs skip it
//   node tools/ci/spend.mjs summary            "api $x.xx · month $y / 190 · engine api|oauth" into the job summary
//   node tools/ci/spend.mjs --test             the self-test
//
// The file, tools/.spend/ledger.json (STUDIO_SPEND_FILE), travels from run to run through actions/cache like the voice
// cache ("restore spend" / "save spend" in studio.yml, saved even when the run fails, so a failed film counts too). A
// lost cache (evicted after 7 days unused) only forgets the month so far: the balance itself stays the hard cap.
//   {"v": 1, "entries": [{"at", "run", "req", "kind", "usd"}], "empty": {"at", "why"} | null}
//
// The month is the credits' cycle: from STUDIO_API_CYCLE_DAY (default 2, UTC: the October credits expire on 2 November)
// to the same day of the next month. The writer may use the API when
//   - the balance was not found empty in the last 24 h of this cycle (markEmpty; a new cycle forgets it),
//   - the month still has the writer's own cap left (STUDIO_API_FILM_MAX, 12: claude-run.mjs's maxBudgetUsd), and
//   - today's share is not used up yet: what was left of the month before today, split over the days left (today
//     counted), is more than today's spend so far. A film starts while the share lasts, so a day overshoots it by one
//     film at most and the next days' shares shrink by as much.
// So unused days roll over, and the last day of a cycle may spend everything left. The director (about $0.3) only needs
// a dollar left in the month and no empty mark: the passes come first.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DAY = 86400e3;
const num = (v, d, lo, hi) => {
  const n = Number(v);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : d;
};

/** The knobs, from the env (repo variables in studio.yml), sane or their defaults. */
export const knobs = (env = process.env) => ({
  cap: num(env.STUDIO_API_MONTH_USD, 190, 0, 10000),
  cycleDay: Math.round(num(env.STUDIO_API_CYCLE_DAY, 2, 1, 28)),
  filmMax: num(env.STUDIO_API_FILM_MAX, 12, 1, 100),
  file: env.STUDIO_SPEND_FILE || path.join(root, 'tools/.spend/ledger.json'),
  // STUDIO_SPEND_EXTERNAL=0: the ledger file alone, without the committed banks' and seed files (a self-test's own world:
  // judge.mjs's looks on a temp ledger must not find today's share used by the real month)
  ...(env.STUDIO_SPEND_EXTERNAL === '0' ? {banks: false} : {}),
});

/** The cycle around `now`: {start, end} (ms, UTC midnight of the cycle day). */
export const cycleOf = (now, cycleDay) => {
  const d = new Date(now);
  let y = d.getUTCFullYear();
  let m = d.getUTCMonth();
  if (d.getUTCDate() < cycleDay) m -= 1;
  const start = Date.UTC(y, m, cycleDay);
  const end = Date.UTC(y, m + 1, cycleDay);
  return {start, end};
};
const dayStart = (now) => {
  const d = new Date(now);
  return Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
};

export const readLedger = (file) => {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    const entries = Array.isArray(j?.entries)
      ? j.entries.filter((e) => e && Number.isFinite(Date.parse(e.at)) && Number.isFinite(Number(e.usd)) && Number(e.usd) >= 0)
      : [];
    const empty = j?.empty && Number.isFinite(Date.parse(j.empty.at)) ? {at: j.empty.at, why: String(j.empty.why ?? '').slice(0, 60)} : null;
    return {v: 1, entries, empty};
  } catch {
    return {v: 1, entries: [], empty: null};
  }
};
const writeLedger = (file, ledger, now) => {
  // keep about two cycles: older lines never count again
  const keep = ledger.entries.filter((e) => Date.parse(e.at) > now - 70 * DAY).slice(-2000);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify({v: 1, entries: keep, empty: ledger.empty ?? null}, null, 1)}\n`);
  fs.renameSync(tmp, file);
};

/** The banks' spend (phase 2, plan step 13): ci/banks/spend.json is COMMITTED by banks.yml, so a film run's cached ledger
 *  can never overwrite it; the month counts it too (read here, never written into the film ledger). */
export const bankEntries = (file = path.join(root, 'ci', 'banks', 'spend.json')) => {
  try {
    const j = JSON.parse(fs.readFileSync(file, 'utf8'));
    return (Array.isArray(j?.entries) ? j.entries : []).filter((e) => e && Number.isFinite(Date.parse(e.at)) && Number.isFinite(Number(e.usd)) && Number(e.usd) >= 0);
  } catch {
    return [];
  }
};

/** The other branches' spend (2026-10-27, the r3x panel): actions/cache is branch-scoped, so a branch's first film restores
 *  no ledger and would not see the month (studio-r3 started at $0 while studio-p2 had spent $49.18 and studio-power
 *  $27.94). ci/spend-seed.json is COMMITTED: those runs' spend from their 'spend' log lines, read like the banks' file
 *  (added to the month and its day, never written into the ledger). A seed line whose run the ledger already holds is
 *  skipped, so a branch that inherits a ledger never counts a run twice. */
export const seedEntries = (file = path.join(root, 'ci', 'spend-seed.json')) => bankEntries(file);
const external = (ledger, k) => {
  if (k.banks === false) return [];
  const runs = new Set(ledger.entries.map((e) => String(e.run ?? '')).filter(Boolean));
  const seed = k.seed === false ? [] : seedEntries(k.seedFile).filter((e) => !runs.has(String(e.run ?? '')));
  return [...bankEntries(k.bankFile), ...seed];
};

/** The month so far: {spent, before (before today), today, daysLeft, left, share, expect, empty, cycle}. */
export const state = (ledger, now, k) => {
  const cycle = cycleOf(now, k.cycleDay);
  const today = dayStart(now);
  let spent = 0;
  let before = 0;
  for (const e of [...ledger.entries, ...external(ledger, k)]) {
    const at = Date.parse(e.at);
    if (at < cycle.start || at >= cycle.end) continue;
    spent += Number(e.usd);
    if (at < today) before += Number(e.usd);
  }
  const daysLeft = Math.max(1, Math.ceil((cycle.end - today) / DAY));
  const share = Math.max(0, k.cap - before) / daysLeft;
  // a film's usual cost: the last ten writers that ran (any cycle), else 7; never under 3 or over the cap
  const writes = ledger.entries.filter((e) => e.kind === 'write' && Number(e.usd) > 0).slice(-10);
  const avg = writes.length >= 3 ? writes.reduce((s, e) => s + Number(e.usd), 0) / writes.length : 7;
  const expect = Math.min(k.filmMax, Math.max(3, avg));
  const emptyAt = ledger.empty ? Date.parse(ledger.empty.at) : NaN;
  const empty = Number.isFinite(emptyAt) && emptyAt >= cycle.start && now - emptyAt < DAY ? ledger.empty : null;
  return {spent, before, today: spent - before, daysLeft, left: k.cap - spent, share, expect, empty, cycle};
};

const usd = (n) => `$${(Math.round(n * 100) / 100).toFixed(2)}`;

/** May the writer (the script step) use the API now? {ok, why, ...state} */
export const mayWrite = (ledger, now = Date.now(), k = knobs()) => {
  const s = state(ledger, now, k);
  const base = {spent: +s.spent.toFixed(2), today: +s.today.toFixed(2), share: +s.share.toFixed(2), cap: k.cap, daysLeft: s.daysLeft};
  if (k.cap <= 0) return {ok: false, why: 'the monthly cap is 0', ...base};
  if (s.empty) return {ok: false, why: `the API balance was empty at ${s.empty.at} (${s.empty.why || 'billing'})`, ...base};
  if (s.left < k.filmMax) return {ok: false, why: `the month has ${usd(s.left)} of ${usd(k.cap)} left, under one film's cap ${usd(k.filmMax)}`, ...base};
  if (s.today >= s.share) return {ok: false, why: `today's share ${usd(s.share)} is used (${usd(s.today)} today; a film costs about ${usd(s.expect)})`, ...base};
  return {ok: true, why: `today ${usd(s.today)} of its ${usd(s.share)} share, month ${usd(s.spent)} of ${usd(k.cap)}`, ...base};
};

/** May the director (two Messages API calls, about $0.3) run? */
export const mayPlan = (ledger, now = Date.now(), k = knobs()) => {
  const s = state(ledger, now, k);
  const base = {spent: +s.spent.toFixed(2), cap: k.cap};
  if (k.cap <= 0) return {ok: false, why: 'the monthly cap is 0', ...base};
  if (s.empty) return {ok: false, why: `the API balance was empty at ${s.empty.at}`, ...base};
  if (s.left < 1) return {ok: false, why: `the month has ${usd(s.left)} left`, ...base};
  return {ok: true, why: `month ${usd(s.spent)} of ${usd(k.cap)}`, ...base};
};

/** Add this run's spend (never negative, never NaN; a zero is kept as a line too: the attempt is the record). */
export const record = (kind, amount, {now = Date.now(), k = knobs(), env = process.env} = {}) => {
  const ledger = readLedger(k.file);
  const v = Number(amount);
  ledger.entries.push({
    at: new Date(now).toISOString(),
    run: String(env.GITHUB_RUN_ID ?? ''),
    req: /^r-[0-9a-z-]{6,24}$/.test(String(env.STUDIO_REQ ?? '')) ? env.STUDIO_REQ : '',
    kind: ['write', 'plan', 'fix', 'ad'].includes(kind) ? kind : 'other',
    usd: Number.isFinite(v) && v > 0 ? Math.round(v * 10000) / 10000 : 0,
  });
  writeLedger(k.file, ledger, now);
  return ledger;
};

/** The API refused for the balance (billing_error): the next runs go straight to the Claude token for 24 h (or until
 *  the next cycle), instead of finding out again. A wrong key is not this (claude-run.mjs hands over every time). */
export const markEmpty = (why, {now = Date.now(), k = knobs()} = {}) => {
  const ledger = readLedger(k.file);
  ledger.empty = {at: new Date(now).toISOString(), why: String(why ?? '').replace(/[^\w .:-]/g, '').slice(0, 60)};
  writeLedger(k.file, ledger, now);
};

/** This run's line for the job summary. */
export const summaryLine = (ledger, {now = Date.now(), k = knobs(), run = process.env.GITHUB_RUN_ID, engine = ''} = {}) => {
  const s = state(ledger, now, k);
  const mine = ledger.entries.filter((e) => run && e.run === String(run)).reduce((a, e) => a + Number(e.usd), 0);
  return `api ${usd(mine)} · month ${usd(s.spent)} / ${k.cap} · engine ${engine || '?'}`;
};

/** The whole film's cost (the p2x technical judge, 2026-10-27: the only spend line came after the script step, the two art
 *  director looks were never summed, and the token writer's cost was not written anywhere): this run's API entries by kind,
 *  their total, and the Claude token writer's own estimate (`total_cost_usd` of the Claude Code result: not billed to the
 *  API credits, the owner's Max plan). out/ci/cost.json carries it into post.json and error.json. */
export const filmCost = (ledger, {run = process.env.GITHUB_RUN_ID, engine = '', token = null} = {}) => {
  const mine = ledger.entries.filter((e) => run && e.run === String(run));
  const byKind = {};
  for (const e of mine) byKind[e.kind] = Math.round(((byKind[e.kind] ?? 0) + Number(e.usd)) * 10000) / 10000;
  const api = Math.round(mine.reduce((a, e) => a + Number(e.usd), 0) * 10000) / 10000;
  return {api, byKind, token: Number.isFinite(token) && token >= 0 ? Math.round(token * 10000) / 10000 : null, engine: engine || null};
};
export const filmCostLine = (c, s, k) =>
  `film cost: api ${usd(c.api)}${Object.keys(c.byKind).length ? ` (${Object.entries(c.byKind).map(([n, v]) => `${n} ${usd(v)}`).join(', ')})` : ''}${c.token !== null ? ` · token writer ${usd(c.token)} (Max plan, not the credits)` : ''} · engine ${c.engine ?? '?'} · month ${usd(s.spent)} / ${k.cap}`;
/** the token writer's cost from the action's messages file (its last "result" line), or null */
export const tokenCostOf = (file) => {
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    const r = (Array.isArray(m) ? m : [m]).filter((x) => x?.type === 'result').pop();
    const v = Number(r?.total_cost_usd);
    return Number.isFinite(v) ? v : null;
  } catch {
    return null;
  }
};

// ---- the command line ------------------------------------------------------------------------------------------
const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  // banks: false: the test's ledgers alone (the real ci/banks/spend.json, once banks.yml has run, filled today's share)
  const k = {cap: 190, cycleDay: 2, filmMax: 12, file: '/dev/null', banks: false};
  const at = (s) => Date.parse(s);
  // the cycle: 26 Oct is in 2 Oct .. 2 Nov; 1 Nov too; 2 Nov starts the next
  let c = cycleOf(at('2026-10-26T12:00:00Z'), 2);
  ok(c.start === at('2026-10-02T00:00:00Z') && c.end === at('2026-11-02T00:00:00Z'), 'cycle of 26 Oct');
  c = cycleOf(at('2026-11-01T23:59:00Z'), 2);
  ok(c.end === at('2026-11-02T00:00:00Z'), 'cycle of 1 Nov ends 2 Nov');
  c = cycleOf(at('2026-11-02T00:00:00Z'), 2);
  ok(c.start === at('2026-11-02T00:00:00Z'), 'a new cycle on 2 Nov');
  c = cycleOf(at('2027-01-01T00:00:00Z'), 2);
  ok(c.start === at('2026-12-02T00:00:00Z') && c.end === at('2027-01-02T00:00:00Z'), 'the cycle over new year');
  // an empty ledger on 26 Oct: 7 days left, a share of 27.14, a film may go
  const now = at('2026-10-26T12:00:00Z');
  let L = {entries: [], empty: null};
  let r = mayWrite(L, now, k);
  ok(r.ok && r.daysLeft === 7 && Math.abs(r.share - 190 / 7) < 0.01, `empty ledger: ${JSON.stringify(r)}`);
  // four films today at 6 each: 24 < 27.1 (a fifth may go), five films: 30 >= 27.1
  const e = (t, usd, kind = 'write') => ({at: t, run: '1', req: '', kind, usd});
  L = {entries: [e('2026-10-26T08:00:00Z', 6), e('2026-10-26T09:00:00Z', 6), e('2026-10-26T10:00:00Z', 6), e('2026-10-26T10:30:00Z', 6)], empty: null};
  ok(mayWrite(L, now, k).ok, 'four films today: a fifth may go');
  L.entries.push(e('2026-10-26T11:00:00Z', 6));
  r = mayWrite(L, now, k);
  ok(!r.ok && /share/.test(r.why), `five films today: paced (${r.why})`);
  // the first day of a 30-day cycle (share 6.33, under one film) still makes its film
  r = mayWrite({entries: [], empty: null}, at('2026-11-02T09:00:00Z'), k);
  ok(r.ok && r.daysLeft === 30, `a new cycle's first day: ${JSON.stringify(r)}`);
  // yesterday's spend lowers today's share; spend before the cycle does not count
  L = {entries: [e('2026-10-01T10:00:00Z', 100), e('2026-10-25T10:00:00Z', 50)], empty: null};
  r = mayWrite(L, now, k);
  ok(r.ok && Math.abs(r.share - 140 / 7) < 0.01 && r.spent === 50, `yesterday counts, last cycle not: ${JSON.stringify(r)}`);
  // the cap: 185 spent leaves 5, under one film's 12
  L = {entries: [e('2026-10-20T10:00:00Z', 185)], empty: null};
  r = mayWrite(L, now, k);
  ok(!r.ok && /left/.test(r.why), `the month's cap: ${r.why}`);
  ok(mayPlan(L, now, k).ok, 'the director may still plan with $5 left');
  L = {entries: [e('2026-10-20T10:00:00Z', 189.5)], empty: null};
  ok(!mayPlan(L, now, k).ok, 'the director stops under $1');
  // the last day may spend all that is left
  L = {entries: [e('2026-10-20T10:00:00Z', 150)], empty: null};
  r = mayWrite(L, at('2026-11-01T10:00:00Z'), k);
  ok(r.ok && Math.abs(r.share - 40) < 0.01 && r.daysLeft === 1, `the last day: ${JSON.stringify(r)}`);
  // empty: holds 24 h in the cycle, never into the next
  L = {entries: [], empty: {at: '2026-10-26T08:00:00Z', why: 'billing_error'}};
  ok(!mayWrite(L, now, k).ok && !mayPlan(L, now, k).ok, 'empty: both skip');
  ok(mayWrite(L, at('2026-10-27T09:00:00Z'), k).ok, 'empty: tried again after 24 h');
  L = {entries: [], empty: {at: '2026-11-01T20:00:00Z', why: 'billing_error'}};
  ok(mayWrite(L, at('2026-11-02T01:00:00Z'), k).ok, 'empty: a new cycle forgets it');
  // the usual cost follows the last films
  L = {entries: [e('2026-10-20T10:00:00Z', 4), e('2026-10-21T10:00:00Z', 4), e('2026-10-22T10:00:00Z', 4)], empty: null};
  ok(Math.abs(state(L, now, k).expect - 4) < 1e-9, 'the usual cost: the average of the last films');
  // a cap of 0 turns the API off
  ok(!mayWrite({entries: [], empty: null}, now, {...k, cap: 0}).ok, 'cap 0: off');
  // the summary: this run's lines only
  L = {entries: [{...e('2026-10-26T10:00:00Z', 5.5), run: '42'}, {...e('2026-10-26T10:00:00Z', 0.3, 'plan'), run: '42'}, e('2026-10-25T10:00:00Z', 6)], empty: null};
  ok(summaryLine(L, {now, k, run: '42', engine: 'api'}) === 'api $5.80 · month $11.80 / 190 · engine api', summaryLine(L, {now, k, run: '42', engine: 'api'}));
  // the file: a round trip, junk lines dropped
  const tmp = path.join(fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'spend-')), 'l.json');
  const kf = {...k, file: tmp};
  record('write', 4.6219, {now, k: kf, env: {GITHUB_RUN_ID: '7', STUDIO_REQ: 'r-test01-abcd'}});
  record('plan', 'NaN', {now, k: kf, env: {}});
  markEmpty('billing_error <script>', {now, k: kf});
  const back = readLedger(tmp);
  ok(back.entries.length === 2 && back.entries[0].usd === 4.6219 && back.entries[1].usd === 0 && back.entries[0].req === 'r-test01-abcd', `round trip: ${JSON.stringify(back)}`);
  ok(back.empty?.why === 'billing_error script', `empty why cleaned: ${back.empty?.why}`);
  fs.writeFileSync(tmp, '{"entries": [{"at": "x", "usd": 1}, {"at": "2026-10-26T00:00:00Z", "usd": -3}, {"at": "2026-10-26T00:00:00Z", "usd": 2}]}');
  ok(readLedger(tmp).entries.length === 1, 'junk lines dropped');
  fs.writeFileSync(tmp, 'not json');
  ok(readLedger(tmp).entries.length === 0, 'a broken file reads as empty');
  fs.rmSync(path.dirname(tmp), {recursive: true, force: true});
  {
    // the whole film's cost: plan + two art director looks on the API, the writer on the token (the r1 car film)
    const L2 = {entries: [{at: '2026-10-27T06:00:00Z', run: '7', kind: 'plan', usd: 0.53}, {at: '2026-10-27T06:28:00Z', run: '7', kind: 'ad', usd: 0.02}, {at: '2026-10-27T06:31:00Z', run: '7', kind: 'ad', usd: 0.03}, {at: '2026-10-27T05:00:00Z', run: '6', kind: 'write', usd: 9}], empty: null};
    const c = filmCost(L2, {run: '7', engine: 'oauth', token: 10.85});
    ok(c.api === 0.58 && c.byKind.plan === 0.53 && c.byKind.ad === 0.05 && c.token === 10.85 && c.engine === 'oauth', `film cost: ${JSON.stringify(c)}`);
    const line = filmCostLine(c, {spent: 46.66}, {cap: 190});
    ok(line === 'film cost: api $0.58 (plan $0.53, ad $0.05) · token writer $10.85 (Max plan, not the credits) · engine oauth · month $46.66 / 190', `film cost line: ${line}`);
    ok(record.length >= 2 && filmCost({entries: [], empty: null}, {run: '1'}).api === 0, 'no entries: $0');
  }
  {
    // the seed (ci/spend-seed.json): another branch's spend counts on the month and its day; a run the ledger holds, once
    const dir = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'spend-seed-'));
    const seedFile = path.join(dir, 'seed.json');
    const bankFile = path.join(dir, 'banks.json');
    fs.writeFileSync(bankFile, JSON.stringify({entries: [{at: '2026-10-27T11:36:00Z', run: '9', bank: 'news', usd: 2}]}));
    fs.writeFileSync(seedFile, JSON.stringify({entries: [{at: '2026-10-26T18:00:00Z', run: '100', usd: 15.38}, {at: '2026-10-27T11:25:00Z', run: '101', usd: 33.8}, {at: '2026-09-20T10:00:00Z', run: '99', usd: 70}]}));
    const ks = {cap: 135, cycleDay: 2, filmMax: 12, file: '/dev/null', seedFile, bankFile};
    const n27 = at('2026-10-27T18:30:00Z');
    let s = state({entries: [], empty: null}, n27, ks);
    ok(Math.abs(s.spent - 51.18) < 1e-9 && Math.abs(s.today - 35.8) < 1e-9, `an empty ledger sees the seed and the banks: ${JSON.stringify(s)}`);
    r = mayWrite({entries: [], empty: null}, n27, ks);
    ok(!r.ok && /share/.test(r.why), `today's share already used on another branch: ${r.why}`);
    ok(/month \$51\.18 \/ 135/.test(summaryLine({entries: [], empty: null}, {now: n27, k: ks, run: '5', engine: 'oauth'})), `the summary's month has the seed: ${summaryLine({entries: [], empty: null}, {now: n27, k: ks, run: '5', engine: 'oauth'})}`);
    s = state({entries: [{at: '2026-10-27T11:25:00Z', run: '101', kind: 'write', usd: 33.8}], empty: null}, n27, ks);
    ok(Math.abs(s.spent - 51.18) < 1e-9, `a seeded run already in the ledger counts once: ${s.spent}`);
    ok(state({entries: [], empty: null}, n27, {...ks, seed: false}).spent === 2, 'seed: false leaves the banks only');
    ok(state({entries: [], empty: null}, at('2026-11-03T10:00:00Z'), ks).spent === 0, 'a new cycle forgets the seed');
    // the real file: it parses and every line has a run
    const real = seedEntries();
    ok(real.length > 0 && real.every((e) => /^\d+$/.test(String(e.run))), `ci/spend-seed.json: ${real.length} lines with runs`);
    fs.rmSync(dir, {recursive: true, force: true});
  }
  console.log(fails ? `spend.mjs: ${fails} failed` : 'spend.mjs: all passed');
  process.exit(fails ? 1 : 0);
};

const main = () => {
  const [cmd, a, b] = process.argv.slice(2);
  const k = knobs();
  if (cmd === '--test') return selfTest();
  if (cmd === 'may') {
    const r = (a === 'plan' ? mayPlan : mayWrite)(readLedger(k.file), Date.now(), k);
    console.log(JSON.stringify(r));
    process.exit(r.ok ? 0 : 3);
  }
  if (cmd === 'add') {
    record(a, b, {k});
    return;
  }
  if (cmd === 'empty') {
    markEmpty(a, {k});
    return;
  }
  if (cmd === 'summary') {
    // never fails the run: a summary line is a nicety
    try {
      let engine = '';
      try {
        engine = fs.readFileSync(path.join(root, 'out/ci/engine'), 'utf8').trim().replace(/[^a-z]/g, '');
      } catch {}
      const line = summaryLine(readLedger(k.file), {k, engine});
      console.log(line);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${line}\n`);
    } catch (e) {
      console.log(`spend summary: ${e.message}`);
    }
    return;
  }
  if (cmd === 'film') {
    // the last word on the film's cost (studio.yml "spend (film)", after the art director, also on a failure): never fails
    try {
      let engine = '';
      try {
        engine = fs.readFileSync(path.join(root, 'out/ci/engine'), 'utf8').trim().replace(/[^a-z]/g, '');
      } catch {}
      const ledger = readLedger(k.file);
      const tmp = process.env.RUNNER_TEMP || path.join(root, 'out/ci');
      // the token writer's result, or the estimate claude-run.mjs "timeout" left when it ran out of time (the p2x car film's
      // cost was null), plus a fix round the token made when the day's API share was used
      let token = engine === 'oauth' ? (tokenCostOf(path.join(tmp, 'claude-execution-output.json')) ?? tokenCostOf(path.join(tmp, 'claude-execution-partial.json'))) : null;
      try {
        const fx = Number(JSON.parse(fs.readFileSync(path.join(root, 'out/ci/fix-token.json'), 'utf8')).usd);
        if (Number.isFinite(fx) && fx > 0) token = (token ?? 0) + fx;
      } catch {}
      const c = filmCost(ledger, {engine, token});
      const line = filmCostLine(c, state(ledger, Date.now(), k), k);
      console.log(line);
      fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
      fs.writeFileSync(path.join(root, 'out/ci/cost.json'), `${JSON.stringify(c)}\n`);
      if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, `\n${line}\n`);
    } catch (e) {
      console.log(`film cost: ${e.message}`);
    }
    return;
  }
  console.error('usage: node tools/ci/spend.mjs may write|plan | add <kind> <usd> | empty <why> | summary | film | --test');
  process.exit(2);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
