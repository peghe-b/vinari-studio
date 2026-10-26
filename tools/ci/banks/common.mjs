// The banks' shared engine (phase 2, plan step 13): Claude Opus 5.5 on the studio's API credit, through the Message Batches
// API (half price), with the web search and web fetch server tools, run ONLY in .github/workflows/banks.yml (the repo
// secret ANTHROPIC_API_KEY; never on the Mac, never a key in a file). The repo and its logs are public: this prints counts
// and dollars, never model text.
//
//   runBatch(client, jobs, {bank, rounds})   jobs [{id, system, user, max, web}] -> Map id -> {json, text, usd}; a request
//                                            that stops on pause_turn is resumed in the next round (up to `rounds`), a
//                                            refusal is dropped, an error is counted
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
export const recordBank = (bank, usd, items = 0) => {
  const j = readSpend();
  j.entries.push({at: new Date().toISOString(), run: String(process.env.GITHUB_RUN_ID ?? ''), bank, usd: Math.round(usd * 10000) / 10000, items});
  fs.mkdirSync(path.dirname(SPEND_FILE), {recursive: true});
  fs.writeFileSync(SPEND_FILE, `${JSON.stringify({about: 'What the banks spent on the API credit (tools/ci/banks/common.mjs; numbers only). tools/ci/spend.mjs adds it to the month.', ...j}, null, 1)}\n`);
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

/** One batch round after another: a paused request goes on in the next round with its own turn appended. */
export const runBatch = async (client, jobs, {bank = 'bank', rounds = 3, pollMs = 30_000, schema = null, log = console.log} = {}) => {
  const out = new Map();
  let pending = jobs.map((j) => ({...j, messages: [{role: 'user', content: j.user}]}));
  let usd = 0;
  let refused = 0;
  let errored = 0;
  for (let r = 0; r < rounds && pending.length; r++) {
    const requests = pending.map((j) => ({
      custom_id: j.id,
      params: {
        model: MODEL,
        max_tokens: j.max ?? 16000,
        // one cache breakpoint: the end of the fixed system prompt (the same for every item of a bank)
        system: [{type: 'text', text: j.system, cache_control: {type: 'ephemeral'}}],
        output_config: {effort: j.effort ?? 'high'},
        ...(j.web === false ? {} : {tools: TOOLS(j.uses ?? 6)}),
        messages: j.messages,
      },
    }));
    const batch = await client.messages.batches.create({requests});
    let b = batch;
    while (b.processing_status !== 'ended') {
      await sleep(pollMs);
      b = await client.messages.batches.retrieve(batch.id);
    }
    const next = [];
    const byId = new Map(pending.map((j) => [j.id, j]));
    for await (const res of await client.messages.batches.results(batch.id)) {
      const job = byId.get(res.custom_id);
      if (!job) continue;
      if (res.result.type !== 'succeeded') {
        errored++;
        if (res.result.type === 'errored' && /credit|billing/i.test(JSON.stringify(res.result.error ?? {}))) {
          try {
            markEmpty('billing_error');
          } catch {}
        }
        continue;
      }
      const m = res.result.message;
      usd += costOfUsage(m.usage);
      if (m.stop_reason === 'refusal') {
        refused++;
        continue;
      }
      if (m.stop_reason === 'pause_turn') {
        next.push({...job, messages: [...job.messages, {role: 'assistant', content: m.content}]});
        continue;
      }
      const text = textOf(m.content);
      out.set(job.id, {text, json: jsonOf(text, schema)});
    }
    pending = next;
  }
  log(`${bank}: ${jobs.length} asked, ${out.size} answered, ${[...out.values()].filter((x) => x.json).length} valid, ${refused} refused, ${errored} errored, ${pending.length} still paused, $${usd.toFixed(2)}`);
  return {results: out, usd};
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
  const {results, usd} = await runBatch(fake, jobs, {bank: 'test', pollMs: 0, log: () => {}});
  ok(results.has('pause') && results.has('plain') && !results.has('refuse'), 'a paused request resumes in the next round, a refusal is dropped');
  ok(calls.length === 2 && calls[1].length === 1 && calls[1][0].params.messages[1].role === 'assistant', 'the resume sends the paused turn back, no extra user message');
  ok(calls[0][0].params.system[0].cache_control?.type === 'ephemeral' && calls[0][0].params.tools?.[0].type === 'web_search_20260209' && !calls[0][2].params.tools, 'one cache breakpoint on the system prompt; the web tools only where asked');
  ok(usd > 0, 'the spend is counted');
  ok(bankCap({}) === 80 && bankCap({STUDIO_BANK_USD: '20'}) === 20, 'the banks cap: STUDIO_BANK_USD, default $80');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(await selfTest());
