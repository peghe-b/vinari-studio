// The banks' shared engine (phase 2, plan step 13): Claude Opus 5.5 on the studio's API credit, through the Message Batches
// API (half price), with the web search and web fetch server tools, run ONLY in .github/workflows/banks.yml (the repo
// secret ANTHROPIC_API_KEY; never on the Mac, never a key in a file). The repo and its logs are public: this prints counts
// and dollars, never model text.
//
//   runBatch(client, jobs, {bank, rounds})   jobs [{id, system, user, max, web}] -> Map id -> {json, text, usd}; a request
//                                            that stops on pause_turn is resumed in the next round (up to `rounds`), a
//                                            refusal is dropped, an error is counted. SMALL requests or fewer go as plain
//                                            API calls (full price, nothing to wait on); a bigger round is a batch that
//                                            waits BATCH_WAIT_MS at most, then is cancelled and its finished part kept.
//                                            Every batch is written to the spend file the moment it is created (its
//                                            ceiling), then settled to what it really cost; every plain call right after it
//   sweepBatches(client)                     at the start of a run: cancels a batch an earlier run left running and
//                                            records what an unrecorded batch cost (the p2 prove run, 2026-10-26: a news
//                                            batch ran 5 hours, the job hit its 300-minute timeout, nothing was recorded)
//   budget(estimate, bank)                   {ok, why}: the estimate fits both caps (STUDIO_BANK_USD for all banks, the
//                                            month's left in the film ledger) before anything is sent
//   recordBank(bank, usd, items)             ci/banks/spend.json (committed: a parallel film run cannot overwrite it)
//   jsonOf(text, schema)                     the reply's JSON (a fenced block or the first object), checked by the zod schema
//   node tools/ci/banks/common.mjs --test    the self-test on a fake client (no network)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {knobs, markEmpty, mayPlan, readLedger} from '../spend.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
export const MODEL = 'claude-opus-5-5';
export const SPEND_FILE = path.join(root, 'ci', 'banks', 'spend.json');
/** $ per million tokens (input, output), at batch price (half), and per web search */
const PRICE = {in: 4 / 2, out: 20 / 2, cacheRead: 0.2 / 2, search: 10 / 1000};
export const TOOLS = (uses = 6) => [
  {type: 'web_search_20260209', name: 'web_search', max_uses: uses},
  {type: 'web_fetch_20260209', name: 'web_fetch', max_uses: uses},
];
export const bankCap = (env = process.env) => {
  const v = Number(env.STUDIO_BANK_USD);
  return Number.isFinite(v) && v >= 0 ? v : 80;
};

export const readSpend = () => {
  try {
    const j = JSON.parse(fs.readFileSync(SPEND_FILE, 'utf8'));
    return {entries: Array.isArray(j.entries) ? j.entries : []};
  } catch {
    return {entries: []};
  }
};
export const bankSpent = () => readSpend().entries.reduce((s, e) => s + (Number(e.usd) || 0), 0);
const writeSpend = (j) => {
  fs.mkdirSync(path.dirname(SPEND_FILE), {recursive: true});
  fs.writeFileSync(SPEND_FILE, `${JSON.stringify({about: 'What the banks spent on the API credit (tools/ci/banks/common.mjs; numbers only). tools/ci/spend.mjs adds it to the month.', entries: j.entries}, null, 1)}\n`);
};
/** `extra`: {batch: id, provisional: true} for a batch's ceiling written when it is created */
export const recordBank = (bank, usd, items = 0, extra = {}) => {
  const j = readSpend();
  j.entries.push({at: new Date().toISOString(), run: String(process.env.GITHUB_RUN_ID ?? ''), bank, usd: Math.round(usd * 10000) / 10000, items, ...extra});
  writeSpend(j);
};
/** a batch's provisional entry set to what it really cost (or a new entry when none was written) */
export const settleBank = (batch, bank, usd, items = 0) => {
  const j = readSpend();
  const e = j.entries.find((x) => x.batch === batch);
  if (e) {
    e.usd = Math.round(usd * 10000) / 10000;
    e.items = items;
    delete e.provisional;
    e.settled = new Date().toISOString();
    writeSpend(j);
  } else recordBank(bank, usd, items, {batch});
};
/** the ceiling of one request: its input (the system, the turns, about INPUT_GUESS tokens of fetched pages a search) and
 *  its max output, at the price it goes at */
const INPUT_GUESS = 6000;
export const ceilingOf = (params, batch = true) => {
  const uses = (params.tools ?? []).reduce((n, t) => n + (t.max_uses ?? 0), 0);
  const chars = JSON.stringify(params.system ?? '').length + JSON.stringify(params.messages ?? '').length;
  const k = batch ? 1 : 2;
  return k * (((chars / 3 + uses * INPUT_GUESS) * PRICE.in + (params.max_tokens ?? 16000) * PRICE.out) / 1e6) + uses * PRICE.search;
};

export const budget = (estimate, bank, env = process.env) => {
  const cap = bankCap(env);
  const spent = bankSpent();
  if (spent + estimate > cap) return {ok: false, why: `${bank}: $${estimate.toFixed(2)} would pass the banks' cap ($${spent.toFixed(2)} of $${cap} spent)`};
  const k = knobs(env);
  const m = mayPlan(readLedger(k.file), Date.now(), k);
  if (!m.ok) return {ok: false, why: `${bank}: the month: ${m.why}`};
  if (m.cap - m.spent < estimate) return {ok: false, why: `${bank}: the month has $${(m.cap - m.spent).toFixed(2)} left for $${estimate.toFixed(2)}`}; // m.spent counts the banks too (spend.mjs bankEntries)
  return {ok: true, why: `${bank}: $${estimate.toFixed(2)} fits ($${spent.toFixed(2)} of $${cap} spent)`};
};

export const costOfUsage = (u) =>
  ((u?.input_tokens ?? 0) * PRICE.in + (u?.output_tokens ?? 0) * PRICE.out + (u?.cache_read_input_tokens ?? 0) * PRICE.cacheRead + (u?.cache_creation_input_tokens ?? 0) * PRICE.in * 1.25) / 1e6 +
  (u?.server_tool_use?.web_search_requests ?? 0) * PRICE.search;

export const jsonOf = (text, schema = null) => {
  const s = String(text ?? '');
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(s)?.[1];
  const cand = fence ?? (() => {
    const a = s.indexOf('{');
    const b = s.lastIndexOf('}');
    return a >= 0 && b > a ? s.slice(a, b + 1) : '';
  })();
  try {
    const v = JSON.parse(cand);
    if (!schema) return v;
    const r = schema.safeParse(v);
    return r.success ? r.data : null;
  } catch {
    return null;
  }
};

const textOf = (content) => (Array.isArray(content) ? content.filter((b) => b?.type === 'text').map((b) => b.text).join('\n') : '');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** A bank of this many requests or fewer goes as plain API calls: nothing to wait on in a queue (the prove run's news batch
 *  of 6 waited 5 hours), at full price. */
export const SMALL = 8;
/** One batch waits at most this long; then it is cancelled and what finished is kept. */
export const BATCH_WAIT_MS = 45 * 60_000;
/** A plain call's own limit. */
export const CALL_TIMEOUT_MS = 10 * 60_000;

const paramsOf = (j) => ({
  model: MODEL,
  max_tokens: j.max ?? 16000,
  // one cache breakpoint: the end of the fixed system prompt (the same for every item of a bank)
  system: [{type: 'text', text: j.system, cache_control: {type: 'ephemeral'}}],
  output_config: {effort: j.effort ?? 'high'},
  ...(j.web === false ? {} : {tools: TOOLS(j.uses ?? 6)}),
  messages: j.messages,
});

const billing = (err) => {
  if (/credit|billing/i.test(JSON.stringify(err ?? {}))) {
    try {
      markEmpty('billing_error');
    } catch {}
  }
};

/** Plain API calls, a few at a time; a paused turn goes on at once; every call's cost is recorded right after it. */
const runDirect = async (client, jobs, {bank, rounds, schema, log, parallel = 3}) => {
  const out = new Map();
  let usd = 0;
  let refused = 0;
  let errored = 0;
  let paused = 0;
  const one = async (j) => {
    let messages = [{role: 'user', content: j.user}];
    for (let r = 0; r < rounds; r++) {
      let m;
      try {
        m = await client.messages.create(paramsOf({...j, messages}), {timeout: CALL_TIMEOUT_MS});
      } catch (e) {
        errored++;
        billing(e?.error ?? e?.message);
        return;
      }
      const c = 2 * costOfUsage(m.usage); // full price: twice the batch price costOfUsage reads
      usd += c;
      recordBank(bank, c, 0, {direct: true});
      if (m.stop_reason === 'refusal') {
        refused++;
        return;
      }
      if (m.stop_reason === 'pause_turn') {
        messages = [...messages, {role: 'assistant', content: m.content}];
        continue;
      }
      const text = textOf(m.content);
      out.set(j.id, {text, json: jsonOf(text, schema)});
      return;
    }
    paused++;
  };
  const queue = [...jobs];
  await Promise.all(Array.from({length: Math.min(parallel, queue.length)}, async () => {
    while (queue.length) await one(queue.shift());
  }));
  log(`${bank}: ${jobs.length} asked (plain calls), ${out.size} answered, ${[...out.values()].filter((x) => x.json).length} valid, ${refused} refused, ${errored} errored, ${paused} still paused, $${usd.toFixed(2)}`);
  return {results: out, usd};
};

/** One batch round after another: a paused request goes on in the next round with its own turn appended. `mode`: "auto"
 *  (SMALL or fewer as plain calls), "batch" or "direct". */
export const runBatch = async (client, jobs, {bank = 'bank', rounds = 3, pollMs = 30_000, waitMs = BATCH_WAIT_MS, schema = null, log = console.log, mode = 'auto', now = () => Date.now()} = {}) => {
  if (mode === 'direct' || (mode === 'auto' && jobs.length <= SMALL)) return runDirect(client, jobs, {bank, rounds, schema, log});
  const out = new Map();
  let pending = jobs.map((j) => ({...j, messages: [{role: 'user', content: j.user}]}));
  let usd = 0;
  let refused = 0;
  let errored = 0;
  let cut = 0;
  for (let r = 0; r < rounds && pending.length; r++) {
    const requests = pending.map((j) => ({custom_id: j.id, params: paramsOf(j)}));
    const batch = await client.messages.batches.create({requests});
    // the ceiling goes to the spend file NOW: a run that dies while it waits still leaves the batch counted
    recordBank(bank, requests.reduce((t, q) => t + ceilingOf(q.params), 0), 0, {batch: batch.id, provisional: true});
    let b = batch;
    const t0 = now();
    let cancelled = false;
    while (b.processing_status !== 'ended') {
      if (!cancelled && now() - t0 > waitMs) {
        log(`${bank}: the batch waited ${Math.round(waitMs / 60000)} min: cancelled, its finished part kept`);
        try {
          b = await client.messages.batches.cancel(batch.id);
        } catch {}
        cancelled = true;
      }
      if (b.processing_status === 'ended') break;
      await sleep(pollMs);
      b = await client.messages.batches.retrieve(batch.id);
    }
    let roundUsd = 0;
    const next = [];
    const byId = new Map(pending.map((j) => [j.id, j]));
    for await (const res of await client.messages.batches.results(batch.id)) {
      const job = byId.get(res.custom_id);
      if (!job) continue;
      if (res.result.type !== 'succeeded') {
        if (res.result.type === 'canceled' || res.result.type === 'expired') cut++;
        else errored++;
        if (res.result.type === 'errored') billing(res.result.error);
        continue;
      }
      const m = res.result.message;
      roundUsd += costOfUsage(m.usage);
      if (m.stop_reason === 'refusal') {
        refused++;
        continue;
      }
      if (m.stop_reason === 'pause_turn') {
        if (!cancelled) next.push({...job, messages: [...job.messages, {role: 'assistant', content: m.content}]});
        continue;
      }
      const text = textOf(m.content);
      out.set(job.id, {text, json: jsonOf(text, schema)});
    }
    settleBank(batch.id, bank, roundUsd, out.size);
    usd += roundUsd;
    pending = cancelled ? [] : next;
  }
  log(`${bank}: ${jobs.length} asked, ${out.size} answered, ${[...out.values()].filter((x) => x.json).length} valid, ${refused} refused, ${errored} errored, ${cut} cut by the wait, ${pending.length} still paused, $${usd.toFixed(2)}`);
  return {results: out, usd};
};

/** At the start of a banks run (one at a time: banks.yml's concurrency group): a batch still running is an earlier run's
 *  orphan, so it is cancelled; an ended batch of the last 40 days that the spend file does not know is costed from its
 *  results and recorded ("orphan"). -> {cancelled, recorded, usd} */
export const sweepBatches = async (client, {log = console.log, now = Date.now(), limit = 40, pollMs = 20_000} = {}) => {
  const known = new Set(readSpend().entries.map((e) => e.batch).filter(Boolean));
  let cancelled = 0;
  let recorded = 0;
  let usd = 0;
  let n = 0;
  for await (const b of await client.messages.batches.list({limit: 20})) {
    if (++n > limit) break;
    const age = now - Date.parse(b.created_at ?? 0);
    if (age > 40 * 864e5) break;
    let st = b.processing_status;
    if (st === 'in_progress' || st === 'canceling') {
      try {
        if (st === 'in_progress') await client.messages.batches.cancel(b.id);
        cancelled++;
      } catch {}
      // a cancelled batch ends within a minute or two: wait for it, then cost it below (else the next run's sweep does)
      for (let k = 0; k < 6 && st !== 'ended'; k++) {
        await sleep(pollMs);
        try {
          st = (await client.messages.batches.retrieve(b.id)).processing_status;
        } catch {
          break;
        }
      }
    }
    if (st !== 'ended' || known.has(b.id)) continue;
    let c = 0;
    try {
      for await (const res of await client.messages.batches.results(b.id)) if (res.result?.type === 'succeeded') c += costOfUsage(res.result.message?.usage);
    } catch {}
    recordBank('orphan', c, 0, {batch: b.id});
    recorded++;
    usd += c;
  }
  log(`banks sweep: ${cancelled} running batch${cancelled === 1 ? '' : 'es'} cancelled, ${recorded} unrecorded batch${recorded === 1 ? '' : 'es'} recorded ($${usd.toFixed(2)})`);
  return {cancelled, recorded, usd};
};

/** The API client from tools/ci/engine (installed in the cloud only), or null with why. */
export const clientOf = async (env = process.env) => {
  const key = String(env.ANTHROPIC_API_KEY ?? '').trim();
  if (!key) return {client: null, why: 'no API key'};
  try {
    const {Anthropic} = await import('../engine/api.mjs');
    return {client: new Anthropic({apiKey: key, maxRetries: 2}), why: ''};
  } catch (e) {
    return {client: null, why: `the engine is not installed: ${e.code || e.message}`};
  }
};

const selfTest = async () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  ok(jsonOf('here:\n```json\n{"a": 1}\n```') ?.a === 1 && jsonOf('x {"b": 2} y').b === 2 && jsonOf('nothing') === null, 'jsonOf reads a fence or the first object');
  ok(Math.abs(costOfUsage({input_tokens: 1e6, output_tokens: 1e6, server_tool_use: {web_search_requests: 10}}) - (2 + 10 + 0.1)) < 1e-9, 'batch price: half of $4 / $20, plus $10 a thousand searches');
  // a fake Batches client: one paused request resumed, one refusal dropped, one answered
  const calls = [];
  const fake = {
    messages: {
      batches: {
        create: async ({requests}) => {
          calls.push(requests);
          return {id: `b${calls.length}`, processing_status: 'ended'};
        },
        retrieve: async (id) => ({id, processing_status: 'ended'}),
        results: async () =>
          (async function* () {
            const reqs = calls.at(-1);
            for (const q of reqs) {
              const resumed = q.params.messages.length > 1;
              const stop = q.custom_id === 'refuse' ? 'refusal' : q.custom_id === 'pause' && !resumed ? 'pause_turn' : 'end_turn';
              yield {custom_id: q.custom_id, result: {type: 'succeeded', message: {stop_reason: stop, usage: {input_tokens: 1000, output_tokens: 100}, content: [{type: 'text', text: '{"ok": true}'}]}}};
            }
          })(),
      },
    },
  };
  const jobs = [{id: 'pause', system: 's', user: 'u'}, {id: 'refuse', system: 's', user: 'u'}, {id: 'plain', system: 's', user: 'u', web: false}];
  // the spend file is the real one: the test keeps it as it was
  const saved = fs.existsSync(SPEND_FILE) ? fs.readFileSync(SPEND_FILE) : null;
  const restore = () => (saved ? fs.writeFileSync(SPEND_FILE, saved) : fs.rmSync(SPEND_FILE, {force: true}));
  const {results, usd} = await runBatch(fake, jobs, {bank: 'test', pollMs: 0, log: () => {}, mode: 'batch'});
  ok(results.has('pause') && results.has('plain') && !results.has('refuse'), 'a paused request resumes in the next round, a refusal is dropped');
  ok(calls.length === 2 && calls[1].length === 1 && calls[1][0].params.messages[1].role === 'assistant', 'the resume sends the paused turn back, no extra user message');
  ok(calls[0][0].params.system[0].cache_control?.type === 'ephemeral' && calls[0][0].params.tools?.[0].type === 'web_search_20260209' && !calls[0][2].params.tools, 'one cache breakpoint on the system prompt; the web tools only where asked');
  ok(usd > 0, 'the spend is counted');
  ok(bankCap({}) === 80 && bankCap({STUDIO_BANK_USD: '20'}) === 20, 'the banks cap: STUDIO_BANK_USD, default $80');
  const sp = readSpend().entries.filter((e) => e.bank === 'test');
  ok(sp.length === 2 && sp.every((e) => e.batch && !e.provisional && e.settled), `every batch was written when it was created and settled after (${sp.length} entries)`);
  // a batch that never ends (the prove run's 5 hours): cancelled after the wait, its finished part kept and recorded
  let t = 0;
  const stuck = [];
  const slow = {
    messages: {
      batches: {
        create: async ({requests}) => {
          stuck.push(requests);
          return {id: 'slow1', processing_status: 'in_progress'};
        },
        retrieve: async (id) => ({id, processing_status: stuck.cancelled ? 'ended' : 'in_progress'}),
        cancel: async (id) => {
          stuck.cancelled = true;
          return {id, processing_status: 'canceling'};
        },
        results: async () =>
          (async function* () {
            yield {custom_id: 'a', result: {type: 'succeeded', message: {stop_reason: 'end_turn', usage: {input_tokens: 1000, output_tokens: 100}, content: [{type: 'text', text: '{"a": 1}'}]}}};
            yield {custom_id: 'b', result: {type: 'canceled'}};
          })(),
      },
    },
  };
  const many = Array.from({length: SMALL + 1}, (_, i) => ({id: i === 0 ? 'a' : i === 1 ? 'b' : `x${i}`, system: 's', user: 'u'}));
  const r2 = await runBatch(slow, many, {bank: 'test-slow', pollMs: 0, waitMs: 1000, log: () => {}, now: () => (t += 400)});
  ok(stuck.cancelled && r2.results.has('a') && !r2.results.has('b'), 'a batch past its wait is cancelled; what finished is kept');
  const slowE = readSpend().entries.filter((e) => e.batch === 'slow1');
  ok(slowE.length === 1 && !slowE[0].provisional && slowE[0].usd > 0, 'the cancelled batch is recorded at what it cost');
  // a small bank: plain calls, every one recorded at full price
  const direct = [];
  const plain = {
    messages: {
      create: async (params) => {
        direct.push(params);
        const resumed = params.messages.length > 1;
        return {stop_reason: direct.length === 1 && !resumed ? 'pause_turn' : 'end_turn', usage: {input_tokens: 1000, output_tokens: 100}, content: [{type: 'text', text: '{"ok": 1}'}]};
      },
      batches: {create: async () => {
        throw new Error('no batch for a small bank');
      }},
    },
  };
  const r3 = await runBatch(plain, [{id: 'p', system: 's', user: 'u'}, {id: 'q', system: 's', user: 'u'}], {bank: 'test-direct', log: () => {}});
  const dE = readSpend().entries.filter((e) => e.bank === 'test-direct');
  ok(r3.results.size === 2 && direct.length === 3 && dE.length === 3 && Math.abs(r3.usd - 3 * 2 * costOfUsage({input_tokens: 1000, output_tokens: 100})) < 1e-9, 'a small bank goes as plain calls (a paused one goes on), each recorded at full price');
  ok(ceilingOf({max_tokens: 16000, tools: TOOLS(8), system: 'x', messages: []}) > 0.3, 'a request\'s ceiling counts its output and its searches');
  // the sweep: a running orphan is cancelled, an unrecorded ended one costed
  const sw = [];
  const lister = {
    messages: {
      batches: {
        list: async () =>
          (async function* () {
            yield {id: 'orph-run', processing_status: 'in_progress', created_at: new Date().toISOString()};
            yield {id: 'orph-done', processing_status: 'ended', created_at: new Date().toISOString()};
            yield {id: 'slow1', processing_status: 'ended', created_at: new Date().toISOString()};
          })(),
        cancel: async (id) => sw.push(id),
        retrieve: async (id) => ({id, processing_status: 'ended'}),
        results: async () =>
          (async function* () {
            yield {custom_id: 'z', result: {type: 'succeeded', message: {usage: {input_tokens: 1e6, output_tokens: 0}}}};
          })(),
      },
    },
  };
  const swr = await sweepBatches(lister, {log: () => {}, pollMs: 0});
  ok(sw.includes('orph-run') && swr.cancelled === 1 && swr.recorded === 2 && Math.abs(swr.usd - 4) < 1e-9, 'the sweep cancels a running orphan and records it and an unrecorded ended one, never one it knows');
  restore();
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(await selfTest());
