// The script step's API engine (plan step 2.1, 2026-10-26). The same Claude Code that the Claude Code Action runs on the
// owner's Claude token, run here through the Agent SDK on the studio's own API key (the repo secret ANTHROPIC_API_KEY:
// the Max plan's monthly API credits, no card), so films stop eating the owner's Claude usage while the credits last.
// When the API cannot make this film, it hands over and the workflow runs today's Claude Code Action on the token
// instead ("claude oauth"): nothing changes for the site, the gate or the error codes.
//
//   node tools/ci/claude-run.mjs write   run the brief ($RUNNER_TEMP/plan.md, else brief.md) on the API
//   node tools/ci/claude-run.mjs args    the OAuth step's claude_args, from ci/tools.json (one list for both engines)
//   node tools/ci/claude-run.mjs denials [file]  the refused tools of a finished run, by name only (either engine)
//   node tools/ci/claude-run.mjs fix <brief.md>  a FIX ROUND on the API (tools/ci/filmgate.mjs, the p3 prove run): the same
//                                       Claude Code on a short brief (the gate's problems and the art director's fixes), a
//                                       smaller cap (STUDIO_FIX_TURNS, 60; STUDIO_FIX_MAX, $4), never a hand-over: exit 0
//                                       when it finished, 1 when it did not (the gate then stops the film)
//   node tools/ci/claude-run.mjs --test  the self-test (no network)
//
// write ends in one of three ways (GITHUB_OUTPUT of the "claude api" step):
//   done=1      the run finished (a film written, or the gate's OFF_TOPIC: "gate" decides, as with the action)
//   fallback=1  handed over, exit 0: no key, the engine not installed, the credits paced or found empty
//               (tools/ci/spend.mjs), or the API refused within the first FALLBACK_MIN minutes (a wrong or revoked
//               key, no credits, a rate limit, an outage: they all come on the first requests). "clean for fallback"
//               then resets specs/ and src/scenes/film/ and the token runs the film from the start.
//   exit 1      the film itself failed after the window (turns, budget, time): an ordinary "script" failure. A hand-over
//               this late would not fit the job's time (script 50 + the window, studio.yml).
//
// The same choices as the action (anthropics/claude-code-action base-action/src/parse-sdk-options.ts at the pinned
// v1.0.233): the claude_code system prompt preset, every setting source (CLAUDE.md and .claude/skills/video/SKILL.md
// load from the project), the tool lists and the turn cap of ci/tools.json, and every message written as a JSON array
// to $RUNNER_TEMP/claude-execution-output.json, which "claude error" and "gate" read. The same Claude Code too:
// tools/ci/engine pins @anthropic-ai/claude-agent-sdk 0.3.281, whose native binary is Claude Code 2.1.281, the version
// the action installs. Different on purpose: maxBudgetUsd (STUDIO_API_FILM_MAX, 12: a runaway loop stops there), and
// the entrypoint is the SDK's own, not the action's.
//
// This repo is public and so are its run logs: only a cleaned result line is printed (model, turns, cost, how it
// ended), never the transcript, the brief or Claude's words. Claude Code itself scrubs the API key out of its Bash
// commands' env on GitHub Actions (GITHUB_ACTIONS=true; GEMINI_API_KEY is not on its list, vo.py keeps it), and the
// tool lists deny reading /proc and .git.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mayWrite, readLedger, record, markEmpty, knobs} from './spend.mjs';
import {codeOf, problemsOf} from './checkstamp.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
/** A refusal later than this is the film's failure, never a hand-over (the job's time: studio.yml timeout-minutes). */
export const FALLBACK_MIN = 10;
/** The assistant errors that mean "this key cannot work now" (the Agent SDK's SDKAssistantMessageError). */
export const REFUSED = ['authentication_failed', 'billing_error', 'account_on_hold', 'oauth_org_not_allowed', 'verification_required', 'rate_limit', 'overloaded', 'server_error', 'model_not_found', 'cloud_credential_error'];

export const loadTools = (file = path.join(root, 'ci/tools.json')) => {
  const t = JSON.parse(fs.readFileSync(file, 'utf8'));
  const list = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && x.trim() && !/[",\n]/.test(x)) : []);
  const allow = list(t.allow);
  const deny = list(t.deny);
  const maxTurns = Number.isInteger(t.maxTurns) && t.maxTurns > 0 && t.maxTurns <= 400 ? t.maxTurns : 140;
  if (!allow.length) throw new Error('ci/tools.json has no "allow" list');
  return {allow, deny, maxTurns};
};

/** The action's claude_args (it parses them like a shell line: one quoted, comma-joined list per flag). */
export const oauthArgs = (tools, model) =>
  [`--model ${model}`, `--max-turns ${tools.maxTurns}`, `--allowedTools "${tools.allow.join(',')}"`, ...(tools.deny.length ? [`--disallowedTools "${tools.deny.join(',')}"`] : [])].join('\n');

export const modelOf = (env = process.env) => (/^[a-z0-9][a-z0-9.\-[\]]{2,60}$/i.test(String(env.STUDIO_MODEL ?? '')) ? env.STUDIO_MODEL : 'claude-opus-5-5');

/**
 * How a write ended: 'done' | 'handover' | 'failed', and whether the balance is empty.
 * result: the SDK's result message (or null), apiError: the last assistant message's error, crashed: the query threw.
 */
export const verdictOf = ({result, apiError, crashed, elapsedMs}) => {
  const text = String(result?.result ?? '');
  const status = Number(result?.api_error_status) || 0;
  const empty = apiError === 'billing_error' || (Boolean(result?.is_error) && /credit balance|billing|purchase credits|insufficient (credit|funds)/i.test(text) && (status === 400 || status === 402 || !status));
  if (result && result.subtype === 'success' && !result.is_error && !crashed) return {how: 'done', empty: false};
  const apiRefused = Boolean(apiError && REFUSED.includes(apiError)) || result?.terminal_reason === 'api_error' || status >= 400 || empty;
  const early = elapsedMs < FALLBACK_MIN * 60e3;
  if (early && (crashed || !result || apiRefused)) return {how: 'handover', empty};
  return {how: 'failed', empty};
};

/**
 * The refused tools, by NAME (2026-10-26: the first API film had 10 refusals and the log could not say which, so nobody
 * knew what to allow): {name: count}, most first. Never an input: a Bash refusal adds only its program's own name (the
 * command's first word, when it is a plain word: "Bash(cat)"), a file tool or any other tool only its name. The run logs
 * are public, so nothing Claude wrote and nothing typed on the site may get in; the names are checked for that too.
 * `denials`: the result message's permission_denials ([{tool_name, tool_use_id, tool_input}]).
 */
export const deniedNames = (denials) => {
  const counts = new Map();
  for (const d of Array.isArray(denials) ? denials : []) {
    const tool = String(d?.tool_name ?? '');
    if (!/^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/.test(tool)) continue;
    let name = tool;
    if (tool === 'Bash') {
      const word = String(d?.tool_input?.command ?? '').trim().split(/[\s;|&<>()]+/)[0] ?? '';
      const prog = word.split('/').pop();
      if (/^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$/.test(prog ?? '')) name = `Bash(${prog})`;
    }
    counts.set(name, (counts.get(name) ?? 0) + 1);
  }
  return Object.fromEntries([...counts].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
};
/** One log line of them: "Bash(cat) x3, WebFetch x1", or "" when none. */
export const deniedLine = (denials) =>
  Object.entries(deniedNames(denials))
    .map(([n, c]) => `${n} x${c}`)
    .join(', ');
/** The refusals of a run's messages file (the action's claude-execution-output.json, or the API engine's). */
export const deniedOfFile = (file) => {
  try {
    const msgs = JSON.parse(fs.readFileSync(file, 'utf8'));
    const res = (Array.isArray(msgs) ? msgs : []).filter((m) => m && m.type === 'result').pop();
    return res?.permission_denials ?? [];
  } catch {
    return [];
  }
};

/**
 * The writer's LAST `node tools/check.mjs <id>` in a run's messages (the r3 verify, MUST-FIX 3: the car film's writer ended
 * and the gate's check found HUE_TWO twice; the log could not say what the writer's own check had said). Codes only, never
 * words (the run logs are public): {checks, id, verdict, codes, editsAfter, turn, turns}
 *   verdict  "ready" | "not_ready" | "quota" | "refused" (the tool was not allowed: a pipe, a cd) | "no_verdict" (cut off,
 *            timed out) | "none" (no check at all)
 *   editsAfter  Write/Edit calls on specs/ or src/scenes/film/ after that check (the film handed over is not the film checked)
 */
const CHECK_CMD = /(?:^|[;&|(]\s*)node\s+tools\/check\.mjs\s+([a-z0-9][a-z0-9-]{0,79})\b/;
const textOf = (c) => (typeof c === 'string' ? c : Array.isArray(c) ? c.map((x) => (typeof x === 'string' ? x : x?.type === 'text' ? String(x.text ?? '') : '')).join('\n') : '');
export const verdictOfCheck = (text, isError) => {
  const t = String(text ?? '');
  if (/\bVOICE_QUOTA\b/.test(t)) return 'quota';
  if (/\nNOT READY: |^NOT READY: /.test(t)) return 'not_ready';
  if (/\bready to render\b/.test(t)) return 'ready';
  if (isError && /permission|not allowed|denied|requires approval/i.test(t)) return 'refused';
  return 'no_verdict';
};
export const lastCheckOf = (messages) => {
  const pending = new Map();
  let last = null;
  let checks = 0;
  let turn = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    const content = m?.message?.content;
    if (m?.type === 'assistant' && Array.isArray(content)) {
      turn++;
      for (const c of content) {
        if (c?.type !== 'tool_use') continue;
        const cmd = c.name === 'Bash' ? String(c.input?.command ?? '') : '';
        const hit = CHECK_CMD.exec(cmd);
        if (hit) pending.set(c.id, {id: hit[1], turn});
        else if (/^(Write|Edit|MultiEdit)$/.test(String(c.name)) && last && /(^|\/)(specs|src\/scenes\/film)\//.test(String(c.input?.file_path ?? ''))) last.editsAfter++;
      }
    }
    if (m?.type === 'user' && Array.isArray(content)) {
      for (const c of content) {
        if (c?.type !== 'tool_result' || !pending.has(c.tool_use_id)) continue;
        const p = pending.get(c.tool_use_id);
        pending.delete(c.tool_use_id);
        const text = textOf(c.content);
        checks++;
        last = {id: p.id, verdict: verdictOfCheck(text, Boolean(c.is_error)), codes: problemsOf(text).map(codeOf), editsAfter: 0, turn: p.turn};
      }
    }
  }
  return last ? {checks, ...last, turns: turn} : {checks: 0, id: null, verdict: 'none', codes: [], editsAfter: 0, turn: null, turns: turn};
};
/** one public log line of it */
export const lastCheckLine = (lc) =>
  lc.verdict === 'none'
    ? `the writer's last check: none (it never ran node tools/check.mjs)`
    : clean(
        `the writer's last check: ${lc.id} ${lc.verdict}${lc.codes.length ? ` (${lc.codes.join('; ')})` : ''}, turn ${lc.turn} of ${lc.turns}, ${lc.editsAfter} edit${lc.editsAfter === 1 ? '' : 's'} after it, ${lc.checks} check${lc.checks === 1 ? '' : 's'} in all`,
        400,
      );

const output = (k, v) => {
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `${k}=${v}\n`);
};
const clean = (s, n = 160) => String(s ?? '').replace(/[\r\n\t]+/g, ' ').replace(/[^\x20-\x7e]/g, '?').slice(0, n);

const handOver = (why) => {
  console.log(`api: hand over to the Claude token (${clean(why, 200)})`);
  output('fallback', '1');
  process.exit(0);
};

const promptFile = (env = process.env) => {
  const tmp = env.RUNNER_TEMP || path.join(root, 'out/ci');
  for (const f of [env.STUDIO_PROMPT_FILE, path.join(tmp, 'plan.md'), path.join(tmp, 'brief.md')]) {
    if (f && fs.existsSync(f) && fs.statSync(f).size > 0) return f;
  }
  return null;
};

const write = async () => {
  const t0 = Date.now();
  const env = process.env;
  const key = String(env.ANTHROPIC_API_KEY ?? '').replace(/\s+/g, '');
  if (!key) handOver('no API key: the repo secret ANTHROPIC_API_KEY is empty');
  const k = knobs();
  const pace = mayWrite(readLedger(k.file), Date.now(), k);
  console.log(`api: credits ${pace.ok ? 'allow it' : 'say no'}: ${pace.why}`);
  if (!pace.ok) handOver(`credits: ${pace.why}`);
  const file = promptFile();
  if (!file) handOver('no brief file');
  const prompt = fs.readFileSync(file, 'utf8');
  let tools;
  try {
    tools = loadTools();
  } catch (e) {
    handOver(`ci/tools.json: ${e.message}`);
  }
  let query;
  try {
    ({query} = await import('./engine/agent.mjs'));
  } catch (e) {
    handOver(`the engine is not installed (tools/ci/setup.sh): ${e.code || e.message}`);
  }
  const bin = path.join(here, 'engine/bin/claude');
  const model = modelOf(env);
  const effort = ['low', 'medium', 'high', 'xhigh', 'max'].includes(env.STUDIO_EFFORT) ? env.STUDIO_EFFORT : undefined;
  const budget = k.filmMax;
  // the Claude process gets the step's env with the cleaned key; nothing that could mint other tokens
  const childEnv = {...env, ANTHROPIC_API_KEY: key};
  for (const v of ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_AUTH_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ALL_INPUTS']) delete childEnv[v];
  const options = {
    model,
    maxTurns: tools.maxTurns,
    maxBudgetUsd: budget,
    allowedTools: tools.allow,
    disallowedTools: tools.deny.length ? tools.deny : undefined,
    systemPrompt: {type: 'preset', preset: 'claude_code'},
    settingSources: ['user', 'project', 'local'],
    cwd: root,
    env: childEnv,
    ...(effort ? {effort} : {}),
    ...(fs.existsSync(bin) ? {pathToClaudeCodeExecutable: bin} : {}),
  };
  console.log(`api: ${model}, up to ${tools.maxTurns} turns and $${budget}${effort ? `, effort ${effort}` : ''}, brief ${path.basename(file)} (${prompt.length} characters)`);

  const messages = [];
  let result = null;
  let apiError = null;
  let crashed = null;
  let model0 = null;
  try {
    for await (const m of query({prompt, options})) {
      messages.push(m);
      if (m.type === 'system' && m.subtype === 'init') {
        model0 = m.model ?? null;
        console.log(`api: Claude Code started (${clean(model0, 40)})`);
      }
      if (m.type === 'assistant' && m.error) apiError = m.error;
      if (m.type === 'result') {
        result = m;
        // by the SDK's contract nothing follows a result (the action breaks here too: the iterator can stay open)
        break;
      }
    }
  } catch (e) {
    crashed = e;
  }
  const elapsedMs = Date.now() - t0;
  const {how, empty} = verdictOf({result, apiError, crashed, elapsedMs});
  // the action's file name for a finished run (gate and claude error read it); a hand-over keeps it aside, so the
  // token's own run writes the file those steps read
  const tmp = env.RUNNER_TEMP || path.join(root, 'out/ci');
  fs.mkdirSync(tmp, {recursive: true});
  fs.writeFileSync(path.join(tmp, how === 'handover' ? 'claude-api-output.json' : 'claude-execution-output.json'), JSON.stringify(messages, null, 2));
  const cost = Number(result?.total_cost_usd) || 0;
  try {
    record('write', cost, {k});
    if (empty) markEmpty(apiError || 'billing', {k});
  } catch (e) {
    console.log(`api: the spend ledger was not written (${clean(e.message)})`);
  }
  console.log(
    `api result: ${JSON.stringify({
      subtype: result?.subtype ?? null,
      is_error: result?.is_error ?? null,
      num_turns: result?.num_turns ?? null,
      total_cost_usd: cost,
      duration_min: +(elapsedMs / 60e3).toFixed(1),
      permission_denials_count: result?.permission_denials?.length ?? 0,
      terminal_reason: result?.terminal_reason ?? null,
      api_error_status: result?.api_error_status ?? null,
      api_error: apiError,
    })}`,
  );
  // the refused tools by name (never their inputs): what ci/tools.json might allow next
  const refused = deniedLine(result?.permission_denials);
  if (refused) console.log(`api refused tools: ${refused}`);
  // what the writer's own last check said (codes only), for the film gate's "writer vs gate" line
  console.log(`api: ${lastCheckLine(lastCheckOf(messages))}`);
  // an API error's own words are an error message, never the film: say it (the first line, cut)
  if (how !== 'done' && (apiError || result?.terminal_reason === 'api_error')) console.log(`api error: ${clean(String(result?.result ?? '').split('\n')[0], 200)}`);
  if (crashed) console.log(`api: the engine stopped: ${clean(crashed.message, 240)}`);
  if (how === 'done') {
    output('done', '1');
    output('usd', cost.toFixed(2));
    return;
  }
  if (how === 'handover') handOver(empty ? 'no API credits left (billing)' : apiError || (crashed ? 'the engine crashed' : result ? `api error ${result.api_error_status ?? ''}`.trim() : 'no result'));
  console.log(`::error::the API run ended without a film (${clean(result?.subtype ?? 'no result', 40)} after ${(elapsedMs / 60e3).toFixed(1)} min): too late to hand over`);
  process.exit(1);
};

/** The fix round's caps (tools/ci/filmgate.mjs): turns and dollars, from env, bounded. */
export const fixCaps = (env = process.env) => {
  const t = Number(env.STUDIO_FIX_TURNS);
  const usd = Number(env.STUDIO_FIX_MAX);
  return {maxTurns: Number.isInteger(t) && t >= 10 && t <= 140 ? t : 60, budget: Number.isFinite(usd) && usd >= 0.5 && usd <= 12 ? usd : 4};
};

const fix = async (briefFile) => {
  const t0 = Date.now();
  const env = process.env;
  const key = String(env.ANTHROPIC_API_KEY ?? '').replace(/\s+/g, '');
  const no = (why) => {
    console.log(`api fix: no fix round (${clean(why, 200)})`);
    process.exit(1);
  };
  if (!key) no('no API key');
  const k = knobs();
  const pace = mayWrite(readLedger(k.file), Date.now(), k);
  if (!pace.ok) no(`credits: ${pace.why}`);
  if (!briefFile || !fs.existsSync(briefFile)) no('no fix brief');
  const prompt = fs.readFileSync(briefFile, 'utf8');
  let tools;
  let query;
  try {
    tools = loadTools();
    ({query} = await import('./engine/agent.mjs'));
  } catch (e) {
    no(`the engine: ${e.code || e.message}`);
  }
  const bin = path.join(here, 'engine/bin/claude');
  const model = modelOf(env);
  const caps = fixCaps(env);
  const childEnv = {...env, ANTHROPIC_API_KEY: key};
  for (const v of ['CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_AUTH_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ALL_INPUTS']) delete childEnv[v];
  const options = {
    model,
    maxTurns: caps.maxTurns,
    maxBudgetUsd: caps.budget,
    allowedTools: tools.allow,
    disallowedTools: tools.deny.length ? tools.deny : undefined,
    systemPrompt: {type: 'preset', preset: 'claude_code'},
    settingSources: ['user', 'project', 'local'],
    cwd: root,
    env: childEnv,
    ...(fs.existsSync(bin) ? {pathToClaudeCodeExecutable: bin} : {}),
  };
  console.log(`api fix: ${model}, up to ${caps.maxTurns} turns and $${caps.budget}`);
  const messages = [];
  let result = null;
  let apiError = null;
  let crashed = null;
  try {
    for await (const m of query({prompt, options})) {
      messages.push(m);
      if (m.type === 'assistant' && m.error) apiError = m.error;
      if (m.type === 'result') {
        result = m;
        break;
      }
    }
  } catch (e) {
    crashed = e;
  }
  const tmp = env.RUNNER_TEMP || path.join(root, 'out/ci');
  fs.mkdirSync(tmp, {recursive: true});
  fs.writeFileSync(path.join(tmp, 'claude-fix-output.json'), JSON.stringify(messages, null, 2));
  const cost = Number(result?.total_cost_usd) || 0;
  try {
    record('fix', cost, {k});
  } catch {}
  const done = Boolean(result && result.subtype === 'success' && !result.is_error && !crashed);
  console.log(`api fix result: ${JSON.stringify({subtype: result?.subtype ?? null, num_turns: result?.num_turns ?? null, total_cost_usd: cost, duration_min: +((Date.now() - t0) / 60e3).toFixed(1), api_error: apiError})}`);
  const refused = deniedLine(result?.permission_denials);
  if (refused) console.log(`api fix refused tools: ${refused}`);
  console.log(`api fix: ${lastCheckLine(lastCheckOf(messages))}`);
  process.exit(done ? 0 : 1);
};

const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  const min = 60e3;
  const v = (o) => verdictOf({elapsedMs: 1 * min, ...o});
  ok(v({result: {subtype: 'success', is_error: false}}).how === 'done', 'a finished run is done');
  // what the SDK gives for a wrong key (measured 2026-10-26, Agent SDK 0.3.281): 401, authentication_failed
  const badKey = {subtype: 'success', is_error: true, api_error_status: 401, terminal_reason: 'api_error', result: 'Invalid API key · Fix external API key'};
  ok(v({result: badKey, apiError: 'authentication_failed'}).how === 'handover', 'a wrong key hands over');
  ok(verdictOf({result: badKey, apiError: 'authentication_failed', elapsedMs: 11 * min}).how === 'failed', 'too late to hand over');
  const broke = {subtype: 'success', is_error: true, api_error_status: 400, terminal_reason: 'api_error', result: 'Your credit balance is too low to access the Anthropic API.'};
  let r = v({result: broke});
  ok(r.how === 'handover' && r.empty, 'no credits: hand over, and the balance is marked empty');
  r = v({result: {subtype: 'success', is_error: true, terminal_reason: 'api_error', result: 'x'}, apiError: 'billing_error'});
  ok(r.how === 'handover' && r.empty, 'billing_error: empty');
  ok(v({result: {subtype: 'success', is_error: true, api_error_status: 429, terminal_reason: 'api_error', result: 'rate'}, apiError: 'rate_limit'}).how === 'handover', 'a rate limit early hands over');
  ok(!v({result: {subtype: 'success', is_error: true, api_error_status: 429}, apiError: 'rate_limit'}).empty, 'a rate limit is not an empty balance');
  ok(v({crashed: new Error('spawn ENOENT')}).how === 'handover', 'an engine crash early hands over');
  ok(v({result: null}).how === 'handover', 'no result early hands over');
  ok(v({result: {subtype: 'error_max_turns', is_error: true, terminal_reason: 'max_turns'}}).how === 'failed', 'out of turns is the film failing');
  ok(v({result: {subtype: 'error_max_budget_usd', is_error: true, terminal_reason: 'budget_exhausted'}}).how === 'failed', 'out of budget is the film failing');
  ok(v({result: {subtype: 'success', is_error: false, result: 'v131-x · ready to render'}}).how === 'done', 'OFF_TOPIC or a film: done, gate decides');
  // the tool lists: the same for both engines, the args the action parses
  const t = loadTools();
  ok(t.maxTurns === 140 && t.allow.includes('Bash(node tools/check.mjs *)') && t.deny.includes('Read(//proc/**)'), 'ci/tools.json');
  const a = oauthArgs(t, 'claude-opus-5-5');
  ok(a.startsWith('--model claude-opus-5-5\n--max-turns 140\n--allowedTools "Read,Glob,Grep,Write(specs/**)'), `args: ${a.slice(0, 80)}`);
  ok(/--disallowedTools "Read\(\/\/proc\/\*\*\),Read\(\.git\/\*\*\)/.test(a), 'disallowed args');
  ok(modelOf({STUDIO_MODEL: 'claude-opus-5-5'}) === 'claude-opus-5-5' && modelOf({STUDIO_MODEL: 'x; rm -rf /'}) === 'claude-opus-5-5' && modelOf({}) === 'claude-opus-5-5', 'the model knob');
  // the refused tools: names only, a Bash program's own name, never an input
  const den = [
    {tool_name: 'Bash', tool_input: {command: 'cat /proc/self/environ'}},
    {tool_name: 'Bash', tool_input: {command: '/usr/bin/cat specs/x.json | head'}},
    {tool_name: 'Bash', tool_input: {command: 'python3 -c "print(1)"'}},
    {tool_name: 'Bash', tool_input: {command: 'FOO=$(echo secret) node x.js'}},
    {tool_name: 'Bash', tool_input: {command: 'ჩემი იდეა'}},
    {tool_name: 'Write', tool_input: {file_path: 'out/secret-topic.txt', content: 'the typed topic'}},
    {tool_name: 'WebFetch', tool_input: {url: 'https://example.com/?q=topic'}},
    {tool_name: 'bad name with spaces', tool_input: {}},
  ];
  const names = deniedNames(den);
  ok(JSON.stringify(names) === JSON.stringify({Bash: 2, 'Bash(cat)': 2, 'Bash(python3)': 1, WebFetch: 1, Write: 1}), `refused names: ${JSON.stringify(names)}`);
  const line = deniedLine(den);
  ok(line === 'Bash x2, Bash(cat) x2, Bash(python3) x1, WebFetch x1, Write x1' && !/proc|environ|secret|topic|example|ჩემი|print/.test(line), `refused line: ${line}`);
  ok(deniedLine(undefined) === '' && deniedLine([]) === '', 'no refusals: no line');
  const tmpf = path.join(root, 'out', `claude-run-test-${process.pid}.json`);
  fs.mkdirSync(path.dirname(tmpf), {recursive: true});
  fs.writeFileSync(tmpf, JSON.stringify([{type: 'system'}, {type: 'result', permission_denials: den.slice(0, 2)}]));
  ok(deniedLine(deniedOfFile(tmpf)) === 'Bash(cat) x2', 'a messages file');
  fs.rmSync(tmpf, {force: true});
  ok(deniedOfFile('/nonexistent/x.json').length === 0, 'a missing file: none');
  // the writer's last check: codes only, the edits after it, a refused or cut-off check
  const A = (...c) => ({type: 'assistant', message: {content: c}});
  const U = (...c) => ({type: 'user', message: {content: c}});
  const use = (id, name, input) => ({type: 'tool_use', id, name, input});
  const res = (id, text, is_error = false) => ({type: 'tool_result', tool_use_id: id, content: [{type: 'text', text}], is_error});
  const notReady = '  voice   ...\n  PROBLEM HUE_TWO 4.8-5.6 s (shot 3, Receipt): red, green in one frame: „ზეთი"\n  PROBLEM HUE_TWO 8.0-13.0 s (shot 4, Ledger): amber, red\n\nNOT READY: 2 problems above';
  const ready = '  guards  300 frames x 3 probes\n\nready to render (the workflow, or ./make.sh on the Mac, renders the film)';
  let lc = lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'})), U(res('a', notReady)), A(use('b', 'Edit', {file_path: 'specs/v136-oil-slope.json'})), A(use('c', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'})), U(res('c', ready))]);
  ok(lc.verdict === 'ready' && lc.checks === 2 && lc.editsAfter === 0 && lc.turn === 3 && lc.turns === 3, `a last check that passed: ${JSON.stringify(lc)}`);
  lc = lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'})), U(res('a', ready)), A(use('b', 'Edit', {file_path: '/home/runner/work/vinari-studio/vinari-studio/src/scenes/film/V136OilSlope.tsx'}))]);
  ok(lc.verdict === 'ready' && lc.editsAfter === 1, 'an edit after the last check is counted');
  lc = lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'})), U(res('a', notReady))]);
  const ll = lastCheckLine(lc);
  ok(lc.verdict === 'not_ready' && lc.codes.join('|') === 'HUE_TWO 4.8-5.6 s|HUE_TWO 8.0-13.0 s' && /^[\x20-\x7e]+$/.test(ll) && !/Receipt|red|green/.test(ll), `a failing last check, codes only: ${ll}`);
  lc = lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v136-oil-slope 2>&1 | tail -40'})), U(res('a', 'Claude requested permissions to use Bash, but you have not granted it yet.', true))]);
  ok(lc.verdict === 'refused', 'a piped check the tools refuse: refused');
  ok(lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v1'})), U(res('a', 'Command timed out after 15m', true))]).verdict === 'no_verdict', 'a check cut off: no_verdict');
  ok(lastCheckOf([A(use('a', 'Bash', {command: 'ls specs'})), U(res('a', 'x'))]).verdict === 'none' && /none/.test(lastCheckLine(lastCheckOf([]))), 'no check: none');
  ok(lastCheckOf([A(use('a', 'Bash', {command: 'node tools/check.mjs v1'})), U(res('a', '\nVOICE_QUOTA ...', false))]).verdict === 'quota', 'the voice quota: quota');
  ok(fixCaps({}).maxTurns === 60 && fixCaps({}).budget === 4 && fixCaps({STUDIO_FIX_TURNS: '9999', STUDIO_FIX_MAX: '50'}).budget === 4 && fixCaps({STUDIO_FIX_TURNS: '80', STUDIO_FIX_MAX: '6'}).maxTurns === 80, 'the fix round caps');
  console.log(fails ? `claude-run.mjs: ${fails} failed` : 'claude-run.mjs: all passed');
  process.exit(fails ? 1 : 0);
};

const main = async () => {
  const cmd = process.argv[2];
  if (cmd === '--test') return selfTest();
  if (cmd === 'args') {
    process.stdout.write(`${oauthArgs(loadTools(), modelOf())}\n`);
    return;
  }
  if (cmd === 'write') return write();
  if (cmd === 'fix') return fix(process.argv[3]);
  if (cmd === 'lastcheck') {
    // the OAuth engine's writer too (the action writes the same messages file): codes only
    let msgs = [];
    try {
      msgs = JSON.parse(fs.readFileSync(process.argv[3] ?? path.join(process.env.RUNNER_TEMP || path.join(root, 'out/ci'), 'claude-execution-output.json'), 'utf8'));
    } catch {}
    console.log(lastCheckLine(lastCheckOf(msgs)));
    return;
  }
  if (cmd === 'denials') {
    // the OAuth engine's refusals too ("claude oauth" writes the same messages file): names only, never inputs
    const line = deniedLine(deniedOfFile(process.argv[3] ?? path.join(process.env.RUNNER_TEMP || path.join(root, 'out/ci'), 'claude-execution-output.json')));
    console.log(line ? `refused tools: ${line}` : 'refused tools: none');
    return;
  }
  console.error('usage: node tools/ci/claude-run.mjs write | args | denials [file] | --test');
  process.exit(2);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
