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

/** The month so far: {spent, before (before today), today, daysLeft, left, share, expect, empty, cycle}. */
export const state = (ledger, now, k) => {
  const cycle = cycleOf(now, k.cycleDay);
  const today = dayStart(now);
  let spent = 0;
  let before = 0;
  for (const e of [...ledger.entries, ...(k.banks === false ? [] : bankEntries())]) {
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
    kind: ['write', 'plan', 'fix'].includes(kind) ? kind : 'other',
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

// ---- the command line ------------------------------------------------------------------------------------------
const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  const k = {cap: 190, cycleDay: 2, filmMax: 12, file: '/dev/null'};
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
  console.error('usage: node tools/ci/spend.mjs may write|plan | add <kind> <usd> | empty <why> | summary | --test');
  process.exit(2);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
