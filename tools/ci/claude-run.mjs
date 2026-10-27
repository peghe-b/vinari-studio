// The script step's API engine (plan step 2.1, 2026-10-26). The same Claude Code that the Claude Code Action runs on the
// owner's Claude token, run here through the Agent SDK on the studio's own API key (the repo secret ANTHROPIC_API_KEY:
// the Max plan's monthly API credits, no card), so films stop eating the owner's Claude usage while the credits last.
// When the API cannot make this film, it hands over and the workflow runs today's Claude Code Action on the token
// instead ("claude oauth"): nothing changes for the site, the gate or the error codes.
//
//   node tools/ci/claude-run.mjs write   run the brief ($RUNNER_TEMP/plan.md, else brief.md) on the API
//   node tools/ci/claude-run.mjs args    the OAuth step's claude_args, from ci/tools.json (one list for both engines)
//   node tools/ci/claude-run.mjs denials [file]  the refused tools of a finished run, by name only (either engine)
//   node tools/ci/claude-run.mjs lastcheck [file]  the writer's last check (codes only) and where its turns went (names only)
//   node tools/ci/claude-run.mjs accept [file]  exit 0 when the token's run finished as a success (the action fails such a
//                                     run when its num_turns, a count of tool results, passes --max-turns, a count of rounds)
//   node tools/ci/claude-run.mjs timeout api|oauth  a writer that ran out of time: its partial messages, the note
//                                     out/ci/writer-timeout.json, the turns, last check and tokens (codes and numbers only)
//   node tools/ci/claude-run.mjs fix <brief.md>  a FIX ROUND on the API (tools/ci/filmgate.mjs, the p3 prove run): the same
//                                       Claude Code on a short brief (the gate's problems and the art director's fixes), a
//                                       smaller cap (STUDIO_FIX_TURNS, 60; STUDIO_FIX_MAX, $4). When the credits say no
//                                       or the API refuses at once, the owner's Claude token (CLAUDE_CODE_OAUTH_TOKEN,
//                                       the film gate step only) makes it, as the writer hands over: exit 0 when it
//                                       finished, 1 when it did not (the gate then stops the film)
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
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {mayWrite, readLedger, record, markEmpty, knobs} from './spend.mjs';
import {codeOf, problemsOf} from './checkstamp.mjs';
import {costOf} from './director.mjs';
import {filmIdOf, stopLine} from './stopcheck.mjs';

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
  const maxTurns = Number.isInteger(t.maxTurns) && t.maxTurns > 0 && t.maxTurns <= 400 ? t.maxTurns : 200;
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
// (r3-cost: also after `timeout 900` or an env assignment: the p2x round-3 writers wrapped 15 checks in `timeout`, which Claude
// Code lets through, and the log said "checks 0" and "last check: none". A `--lint` run is a lint, never the last check: it
// never says ready.)
const CHECK_CMD = /(?:^|[;&|(]\s*)(?:(?:timeout|gtimeout)\s+(?:-[a-z]+\s+)*\d+[smh]?\s+|[A-Z_][A-Z0-9_]*=\S*\s+)*node\s+tools\/check\.mjs\s+([a-z0-9][a-z0-9-]{0,79})\b/;
/** a check command: 'check' | 'lint' (check.mjs --lint) | null */
export const checkKind = (cmd) => (CHECK_CMD.test(String(cmd ?? '')) ? (/\s--lint\b/.test(String(cmd)) ? 'lint' : 'check') : null);
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
  // the turn in ROUNDS (one model reply: its assistant messages share a message id), the unit turnStats and the cap use (the
  // r1 car film's log said "turn 303 of 308" here and "113 rounds" in the turn line)
  const ids = new Set();
  let turn = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    const content = m?.message?.content;
    if (m?.type === 'assistant' && Array.isArray(content)) {
      const mid = m.message?.id;
      if (!mid || !ids.has(mid)) turn++;
      if (mid) ids.add(mid);
      for (const c of content) {
        if (c?.type !== 'tool_use') continue;
        const cmd = c.name === 'Bash' ? String(c.input?.command ?? '') : '';
        const hit = CHECK_CMD.exec(cmd);
        if (hit && checkKind(cmd) === 'check') pending.set(c.id, {id: hit[1], turn});
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
        `the writer's last check: ${lc.id} ${lc.verdict}${lc.codes.length ? ` (${lc.codes.join('; ')})` : ''}, round ${lc.turn} of ${lc.turns}, ${lc.editsAfter} edit${lc.editsAfter === 1 ? '' : 's'} after it, ${lc.checks} check${lc.checks === 1 ? '' : 's'} in all`,
        400,
      );

/**
 * The turn cap's two units (the r3 verify, MUST-FIX 2, 2026-10-27). The CLI's --max-turns (ci/tools.json maxTurns, both
 * engines) counts model ROUNDS; the result's num_turns counts every tool RESULT (each parallel or refused call adds one).
 * The p4 writers finished at num_turns 160 and 172 inside a 140-round cap, and the Claude Code Action (v1.0.233
 * run-claude-sdk.ts) throws on a finished success whose num_turns > maxTurns: the OAuth film was lost, though finished.
 *   roundsOf   distinct assistant message ids: the cap's own unit
 *   acceptOf   the token's run ended as a finished success: studio.yml takes it even when the action failed the step on
 *              that check (the film gate re-checks the film anyway)
 */
export const roundsOf = (msgs) => new Set((Array.isArray(msgs) ? msgs : []).filter((m) => m?.type === 'assistant' && m.message?.id).map((m) => m.message.id)).size;
export const acceptOf = (msgs) => {
  const r = (Array.isArray(msgs) ? msgs : []).filter((m) => m?.type === 'result').pop();
  const ok = Boolean(r && r.subtype === 'success' && r.is_error === false && (r.terminal_reason ?? 'completed') === 'completed');
  return {ok, toolResults: Number(r?.num_turns) || 0, rounds: roundsOf(msgs)};
};
/** a run's messages file (the action's claude-execution-output.json, or the API engine's), [] when missing or broken */
export const messagesOfFile = (file) => {
  try {
    const m = JSON.parse(fs.readFileSync(file, 'utf8'));
    return Array.isArray(m) ? m : [];
  } catch {
    return [];
  }
};
const runFile = (arg) => arg ?? path.join(process.env.RUNNER_TEMP || path.join(root, 'out/ci'), 'claude-execution-output.json');

/**
 * A writer that runs out of time (the p2x round-2 car film, 2026-10-27: the token writer hit the step's 50 minutes, the action
 * wrote NO messages file, and the log said "turns: 0 rounds", "last check: none", token cost null, cause "failed"). Two ways
 * to still know what it did:
 *   - the API engine streams every message to $RUNNER_TEMP/claude-api-stream.jsonl as it comes (a killed step keeps it) and
 *     stops itself at STUDIO_WRITE_MIN minutes (studio.yml: 3 under the step's limit), so it ends with its own lines;
 *   - Claude Code (the action's too) keeps its session transcript in ~/.claude/projects/<cwd>/<session>.jsonl while it
 *     runs: `timeout` reads the newest one, writes it as $RUNNER_TEMP/claude-execution-partial.json (with a result line of
 *     its own: subtype "error_writer_timeout" and the tokens' list-price estimate), and prints the turns, the writer's last
 *     check (codes only) and the estimate, never the words.
 * out/ci/writer-timeout.json {cause: "writer_timeout", engine, rounds, verdict, tokenUsd} then names the cause in error.json,
 * and a spec the writer left (a draft) goes to the film gate, whose fix round finishes it (studio.yml "script").
 */
export const STREAM_FILE = 'claude-api-stream.jsonl';
export const PARTIAL_FILE = 'claude-execution-partial.json';
/** the transcript lines of a Claude Code session file (jsonl), as messages ({type, message}); [] when unreadable */
export const messagesOfJsonl = (file) => {
  try {
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter(Boolean)
      .map((l) => {
        try {
          return JSON.parse(l);
        } catch {
          return null;
        }
      })
      .filter((m) => m && (m.type === 'assistant' || m.type === 'user' || m.type === 'result' || m.type === 'system') && (m.message || m.type === 'result' || m.type === 'system'));
  } catch {
    return [];
  }
};
/** the newest session transcript under the Claude config dirs written after `sinceMs`, or null */
export const newestTranscript = (dirs, sinceMs = 0) => {
  let best = null;
  const walk = (d, depth) => {
    let ents = [];
    try {
      ents = fs.readdirSync(d, {withFileTypes: true});
    } catch {
      return;
    }
    for (const e of ents) {
      const f = path.join(d, e.name);
      if (e.isDirectory() && depth < 3) walk(f, depth + 1);
      else if (e.isFile() && e.name.endsWith('.jsonl')) {
        const t = fs.statSync(f).mtimeMs;
        if (t >= sinceMs && (!best || t > best.t)) best = {f, t};
      }
    }
  };
  for (const d of dirs) walk(d, 0);
  return best?.f ?? null;
};
export const transcriptDirs = (env = process.env) =>
  [env.CLAUDE_CONFIG_DIR && path.join(env.CLAUDE_CONFIG_DIR, 'projects'), path.join(env.HOME || os.homedir(), '.claude', 'projects')].filter(Boolean);
/** the tokens' list-price estimate of a run's messages: one usage per assistant message id (a transcript repeats it per block) */
export const usageCostOf = (messages, model = 'claude-opus-5-5') => {
  const byId = new Map();
  for (const m of Array.isArray(messages) ? messages : []) {
    if (m?.type !== 'assistant' || !m.message?.usage) continue;
    byId.set(m.message.id ?? `n${byId.size}`, m.message.usage);
  }
  let usd = 0;
  for (const u of byId.values()) usd += costOf(u, model);
  return Math.round(usd * 100) / 100;
};
/** what a writer that ran out of time leaves: its messages with a result line of our own, and the public summary */
export const timeoutReport = (messages, {engine = 'oauth', model = 'claude-opus-5-5', minutes = null} = {}) => {
  const msgs = (Array.isArray(messages) ? messages : []).filter((m) => m?.type !== 'result');
  const lc = lastCheckOf(msgs);
  const st = turnStats(msgs);
  const tokenUsd = msgs.length ? usageCostOf(msgs, model) : null;
  const result = {type: 'result', subtype: 'error_writer_timeout', is_error: true, terminal_reason: 'writer_timeout', num_turns: st.calls, total_cost_usd: tokenUsd, result: ''};
  const note = {cause: 'writer_timeout', engine, rounds: st.rounds, verdict: lc.verdict, codes: lc.codes, tokenUsd, ...(minutes ? {minutes} : {})};
  return {messages: [...msgs, result], note, lines: [lastCheckLine(lc), turnLine(st), `the writer ran out of time${minutes ? ` after ${minutes} min` : ''}: ${st.rounds} rounds, tokens about ${tokenUsd === null ? '?' : `$${tokenUsd.toFixed(2)}`} at list price${engine === 'oauth' ? ' (Max plan, not the credits)' : ''}`]};
};
const writeTimeoutNote = (note) => {
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(path.join(root, 'out/ci/writer-timeout.json'), `${JSON.stringify(note)}\n`);
  } catch {}
};

/** The owner's Claude token for the fix round's hand-over (studio.yml "film gate"): cleaned of a terminal's line wrap. */
export const oauthTokenOf = (env = process.env) => {
  const t = String(env.CLAUDE_CODE_OAUTH_TOKEN ?? '').replace(/\s+/g, '');
  return t.length >= 20 ? t : '';
};
/** the env a Claude process gets on one engine: the API key OR the token, never both, nothing that could mint other tokens */
export const engineEnv = (env, engine, cred) => {
  const e = {...env};
  for (const v of ['ANTHROPIC_API_KEY', 'CLAUDE_CODE_OAUTH_TOKEN', 'ANTHROPIC_AUTH_TOKEN', 'ACTIONS_ID_TOKEN_REQUEST_URL', 'ACTIONS_ID_TOKEN_REQUEST_TOKEN', 'ALL_INPUTS']) delete e[v];
  if (engine === 'api') e.ANTHROPIC_API_KEY = cred;
  else e.CLAUDE_CODE_OAUTH_TOKEN = cred;
  // the API engine's prompt cache lives 5 minutes unless the repo variable STUDIO_CACHE_1H=1 asks for Claude Code's 1-hour TTL
  // (writes at 2x instead of 1.25x the input price; the token engine already gets it as a subscriber). The usage line says
  // after every run what the other TTL would have cost (usageStats ttl1h), so the switch follows numbers, not a guess.
  delete e.ENABLE_PROMPT_CACHING_1H;
  if (engine === 'api' && String(env.STUDIO_CACHE_1H ?? '') === '1') e.ENABLE_PROMPT_CACHING_1H = '1';
  return e;
};
/** the API writer's own deadline in minutes (STUDIO_WRITE_MIN; studio.yml sets it 3 under the step's limit), or null */
export const writeDeadlineMin = (env = process.env) => {
  const s = String(env.STUDIO_WRITE_MIN ?? '').trim();
  return /^\d{1,3}$/.test(s) && Number(s) >= 15 && Number(s) <= 200 ? Number(s) : null;
};

/**
 * Where a run's turns went, by NAME only (the run logs are public: no command input, no path, no Georgian): rounds, tool
 * calls, calls per tool (a Bash call by its script's file name when it runs one of ours, "node tools/check.mjs" ->
 * "check.mjs", else by its program's own name), check runs and how many said NOT READY, re-reads of a file already read
 * (a count) and image reads.
 */
const SCRIPT = /^\s*(?:node|python3)\s+tools\/(?:[a-z0-9_-]+\/)*([a-z0-9_-]+\.(?:mjs|py))\b/i;
export const turnStats = (messages) => {
  const by = new Map();
  const reads = new Map();
  const checkIds = new Set();
  let calls = 0;
  let rereads = 0;
  let images = 0;
  let checks = 0;
  let checksFailed = 0;
  let lints = 0;
  for (const m of Array.isArray(messages) ? messages : []) {
    const content = m?.message?.content;
    if (!Array.isArray(content)) continue;
    if (m.type === 'assistant') {
      for (const c of content) {
        if (c?.type !== 'tool_use') continue;
        calls++;
        const tool = /^[A-Za-z][A-Za-z0-9_.:-]{0,63}$/.test(String(c.name ?? '')) ? c.name : 'tool';
        let name = tool;
        if (tool === 'Bash') {
          const cmd = String(c.input?.command ?? '');
          const sc = SCRIPT.exec(cmd)?.[1] ?? (checkKind(cmd) ? 'check.mjs' : null);
          if (sc) name = `Bash(${sc}${checkKind(cmd) === 'lint' ? ' --lint' : ''})`;
          else {
            const prog = (cmd.trim().split(/[\s;|&<>()]+/)[0] ?? '').split('/').pop();
            name = /^[A-Za-z0-9][A-Za-z0-9._+-]{0,31}$/.test(prog ?? '') ? `Bash(${prog})` : 'Bash';
          }
          // the same match as lastCheckOf (CHECK_CMD: also after "cd x &&" or in a pipe): the r1 car film's log counted
          // "checks 1 (1 not ready)" here and "9 checks in all, ready" there
          if (checkKind(cmd) === 'check') checkIds.add(c.id);
          else if (checkKind(cmd) === 'lint') lints++;
        }
        if (tool === 'Read') {
          const f = String(c.input?.file_path ?? '');
          const key = `${f}#${c.input?.offset ?? ''}#${c.input?.limit ?? ''}`;
          if (reads.has(key)) rereads++;
          reads.set(key, 1);
          if (/\.(png|jpe?g|webp|gif)$/i.test(f)) images++;
        }
        by.set(name, (by.get(name) ?? 0) + 1);
      }
    }
    if (m.type === 'user') {
      for (const c of content) {
        if (c?.type !== 'tool_result' || !checkIds.has(c.tool_use_id)) continue;
        checks++;
        if (verdictOfCheck(textOf(c.content), Boolean(c.is_error)) !== 'ready') checksFailed++;
      }
    }
  }
  const tools = Object.fromEntries([...by].sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1)));
  return {rounds: roundsOf(messages), calls, tools, checks, checksFailed, lints, rereads, images};
};
/** one public log line of it */
export const turnLine = (st) =>
  clean(
    `turns: ${st.rounds} rounds, ${st.calls} tool calls (${Object.entries(st.tools).map(([n, c]) => `${n} ${c}`).join(', ') || 'none'}); checks ${st.checks} (${st.checksFailed} not ready); lints ${st.lints ?? 0}; re-reads ${st.rereads}; image reads ${st.images}`,
    600,
  );

/**
 * Where a run's MONEY went (r3-cost, 2026-10-27; numbers only, so the public log can carry it). The p2x writers cost $8.93 to
 * $11.59 and nobody could say on what: the context re-read every round, the cache writes, or the output (thinking and the
 * Edits' text). One usage per model reply (its assistant messages share an id; the largest of each field wins, a transcript
 * repeats it per block). A COLD round re-wrote most of its context (cache_creation >= half of the prompt and >= 20,000
 * tokens, after the first round): the 5-minute cache had expired, mostly behind a long tool call (a full check is 2.5 min
 * in the cloud, plus the reply's own minutes). `ttl1h` says what the 1-hour TTL (STUDIO_CACHE_1H=1) would have changed:
 * every write at 2x the input price instead of 1.25x, and no cold round re-written.
 *   -> {rounds, input, output, read, write, write1h, cold, coldWrite, usd: {input, output, read, write, total}, ttl1h}
 */
export const usageStats = (messages, model = 'claude-opus-5-5') => {
  const byId = new Map();
  for (const m of Array.isArray(messages) ? messages : []) {
    const u = m?.type === 'assistant' ? m.message?.usage : null;
    if (!u) continue;
    const id = m.message.id ?? `n${byId.size}`;
    const prev = byId.get(id) ?? {};
    const n = (k) => Math.max(Number(prev[k]) || 0, Number(u[k]) || 0);
    byId.set(id, {
      input_tokens: n('input_tokens'),
      output_tokens: n('output_tokens'),
      cache_read_input_tokens: n('cache_read_input_tokens'),
      cache_creation_input_tokens: n('cache_creation_input_tokens'),
      h1: Math.max(Number(prev.h1) || 0, Number(u.cache_creation?.ephemeral_1h_input_tokens) || 0),
    });
  }
  const [pi, po, pw, pr] = PRICE[model] ?? PRICE['claude-opus-5-5'];
  const st = {rounds: byId.size, input: 0, output: 0, read: 0, write: 0, write1h: 0, cold: 0, coldWrite: 0};
  let first = true;
  for (const u of byId.values()) {
    st.input += u.input_tokens;
    st.output += u.output_tokens;
    st.read += u.cache_read_input_tokens;
    st.write += u.cache_creation_input_tokens;
    st.write1h += u.h1;
    const prompt = u.input_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens;
    if (!first && u.cache_creation_input_tokens >= 20000 && u.cache_creation_input_tokens >= prompt / 2) {
      st.cold++;
      st.coldWrite += u.cache_creation_input_tokens;
    }
    first = false;
  }
  const r2 = (x) => Math.round(x * 100) / 100;
  // a 1-hour write costs 2x the input price, a 5-minute one 1.25x (pw)
  const writeUsd = ((st.write - st.write1h) * pw + st.write1h * pi * 2) / 1e6;
  const usd = {input: r2((st.input * pi) / 1e6), output: r2((st.output * po) / 1e6), read: r2((st.read * pr) / 1e6), write: r2(writeUsd)};
  usd.total = r2(usd.input + usd.output + usd.read + usd.write);
  // the other TTL: 1h -> every write at 2x, minus the cold rounds' re-writes (their prompt would have been read instead)
  const on1h = st.write1h > st.write / 2;
  const alt = on1h ? null : r2(((st.write - st.coldWrite) * pi * 2 + st.coldWrite * pr) / 1e6 - writeUsd);
  return {...st, usd, ttl1h: on1h ? 'on' : alt};
};
/** $ per million tokens: input, output, 5-minute cache write, cache read (the API's list prices, 2026-10) */
const PRICE = {'claude-opus-5-5': [4, 20, 5, 0.2], 'claude-sonnet-5-5': [2, 10, 2.5, 0.2]};
/** one public log line of it */
export const usageLine = (u) =>
  u.rounds
    ? clean(
        `tokens: ${u.rounds} replies, input ${u.input}, output ${u.output}, cache read ${u.read}, cache write ${u.write}${u.write1h ? ` (${u.write1h} at 1h)` : ''}; ${u.cold} cold round${u.cold === 1 ? '' : 's'} (${u.coldWrite} re-written); list price $${u.usd.total.toFixed(2)} = output $${u.usd.output.toFixed(2)} + cache read $${u.usd.read.toFixed(2)} + cache write $${u.usd.write.toFixed(2)} + input $${u.usd.input.toFixed(2)}${u.ttl1h === 'on' ? '; 1h TTL on' : `; the 1h TTL would have changed it by ${u.ttl1h >= 0 ? '+' : '-'}$${Math.abs(u.ttl1h).toFixed(2)}`}`,
        600,
      )
    : 'tokens: no usage in the messages';

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
  const childEnv = engineEnv(env, 'api', key);
  // its own deadline (the p2x car film timed out with nothing to show): stop in time to print what it did
  const deadline = writeDeadlineMin(env);
  const abortController = new AbortController();
  const timer = deadline ? setTimeout(() => abortController.abort(), deadline * 60e3) : null;
  const options = {
    model,
    abortController,
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
  console.log(`api: ${model}, up to ${tools.maxTurns} turns and $${budget}${deadline ? ` in ${deadline} min` : ''}${effort ? `, effort ${effort}` : ''}, brief ${path.basename(file)} (${prompt.length} characters)`);

  const messages = [];
  let result = null;
  let apiError = null;
  let crashed = null;
  let model0 = null;
  // every message to a file as it comes: a step killed from outside still leaves the turns and the last check
  const tmp0 = env.RUNNER_TEMP || path.join(root, 'out/ci');
  fs.mkdirSync(tmp0, {recursive: true});
  const stream = path.join(tmp0, STREAM_FILE);
  fs.writeFileSync(stream, '');
  try {
    for await (const m of query({prompt, options})) {
      messages.push(m);
      try {
        fs.appendFileSync(stream, `${JSON.stringify(m)}\n`);
      } catch {}
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
  if (timer) clearTimeout(timer);
  const elapsedMs = Date.now() - t0;
  const timedOut = abortController.signal.aborted && !result;
  if (timedOut) {
    // out of time: the same lines as a token writer's timeout, the partial messages for the gate and the cost, the note
    const rep = timeoutReport(messages, {engine: 'api', model, minutes: +(elapsedMs / 60e3).toFixed(1)});
    fs.writeFileSync(path.join(tmp0, PARTIAL_FILE), JSON.stringify(rep.messages, null, 2));
    writeTimeoutNote(rep.note);
    try {
      record('write', rep.note.tokenUsd ?? 0, {k});
    } catch {}
    for (const l of rep.lines) console.log(`api: ${l}`);
    console.log(`::error::the API writer ran out of time at ${deadline} min (writer_timeout): its draft, if any, goes to the film gate`);
    process.exit(1);
  }
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
      rounds: roundsOf(messages),
      tool_calls: result?.num_turns ?? null,
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
  // how often the Stop hook held the writer on a failing or stale check (tools/ci/stopcheck.mjs)
  {
    const held = stopLine(root, filmIdOf(root, env));
    if (held) console.log(`api: ${held}`);
  }
  // where the turns went (names only); a warning when the rounds come near the cap (the cap's unit is rounds)
  console.log(`api ${turnLine(turnStats(messages))}`);
  console.log(`api ${usageLine(usageStats(messages, model))}`);
  if (roundsOf(messages) >= 0.9 * tools.maxTurns) console.log(`::warning::the writer used ${roundsOf(messages)} of its ${tools.maxTurns} rounds`);
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

/** The fix round's own deadline in minutes (STUDIO_FIX_MIN; tools/ci/judge.mjs sizes it by the job's clock), or null. */
export const fixDeadlineMin = (env = process.env) => {
  const s = String(env.STUDIO_FIX_MIN ?? '').trim();
  return /^\d{1,2}$/.test(s) && Number(s) >= 5 && Number(s) <= 60 ? Number(s) : null;
};

/** The fix round's caps (tools/ci/filmgate.mjs): turns and dollars, from env, bounded. */
export const fixCaps = (env = process.env) => {
  const t = Number(env.STUDIO_FIX_TURNS);
  const usd = Number(env.STUDIO_FIX_MAX);
  return {maxTurns: Number.isInteger(t) && t >= 10 && t <= 140 ? t : 60, budget: Number.isFinite(usd) && usd >= 0.5 && usd <= 12 ? usd : 4};
};

/**
 * Which engine a fix round runs on (the p2x round-2 story film, 2026-10-27: the writer had run on the token because the day's
 * API share was used, the gate found three fixable faults, and "api fix: no fix round (credits: today's share ... is used)"
 * threw the $8.93 film away). The API when it may; else the owner's Claude token (studio.yml "film gate" passes it), the same
 * hand-over the writer makes. -> {engine: 'api'|'oauth'|null, why}
 */
export const fixEngineOf = ({key, token, pace}) => {
  if (key && pace?.ok) return {engine: 'api', why: pace.why};
  const why = !key ? 'no API key' : `credits: ${pace?.why ?? '?'}`;
  if (token) return {engine: 'oauth', why: `${why}: the Claude token makes the fix round`};
  return {engine: null, why};
};

const fix = async (briefFile) => {
  const t0 = Date.now();
  const env = process.env;
  const key = String(env.ANTHROPIC_API_KEY ?? '').replace(/\s+/g, '');
  const token = oauthTokenOf(env);
  const no = (why) => {
    console.log(`api fix: no fix round (${clean(why, 200)})`);
    process.exit(1);
  };
  const k = knobs();
  const pace = key ? mayWrite(readLedger(k.file), Date.now(), k) : null;
  let {engine, why} = fixEngineOf({key, token, pace});
  if (!engine) no(why);
  if (engine === 'oauth') console.log(`fix: ${clean(why, 200)}`);
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
  const tmp = env.RUNNER_TEMP || path.join(root, 'out/ci');
  fs.mkdirSync(tmp, {recursive: true});
  // the judge's fix round has the job's clock to keep (STUDIO_FIX_MIN): both engines together stop there
  const deadline = fixDeadlineMin(env);
  const abortController = new AbortController();
  const timer = deadline ? setTimeout(() => abortController.abort(), deadline * 60e3) : null;
  const once = async (eng) => {
    const options = {
      model,
      abortController,
      maxTurns: caps.maxTurns,
      // the dollar cap is the credits' (the token is the Max plan: the turn cap holds it, as for the token writer)
      ...(eng === 'api' ? {maxBudgetUsd: caps.budget} : {}),
      allowedTools: tools.allow,
      disallowedTools: tools.deny.length ? tools.deny : undefined,
      systemPrompt: {type: 'preset', preset: 'claude_code'},
      settingSources: ['user', 'project', 'local'],
      cwd: root,
      env: engineEnv(env, eng, eng === 'api' ? key : token),
      ...(fs.existsSync(bin) ? {pathToClaudeCodeExecutable: bin} : {}),
    };
    const tag = eng === 'api' ? 'api fix' : 'token fix';
    console.log(`${tag}: ${model}, up to ${caps.maxTurns} turns${eng === 'api' ? ` and $${caps.budget}` : ''}${deadline ? ` in ${deadline} min` : ''}`);
    const t1 = Date.now();
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
    // the judge's fix round keeps its own transcript (STUDIO_FIX_OUT=judge), never over the film gate's
    const outTag = /^[a-z0-9]{1,16}$/.test(String(env.STUDIO_FIX_OUT ?? '')) ? `-${env.STUDIO_FIX_OUT}` : '';
    fs.writeFileSync(path.join(tmp, eng === 'api' ? `claude-fix${outTag}-output.json` : `claude-fix${outTag}-token-output.json`), JSON.stringify(messages, null, 2));
    const cost = Number(result?.total_cost_usd) || 0;
    if (eng === 'api') {
      try {
        record('fix', cost, {k});
      } catch {}
    }
    const done = Boolean(result && result.subtype === 'success' && !result.is_error && !crashed);
    console.log(`${tag} result: ${JSON.stringify({subtype: result?.subtype ?? null, num_turns: result?.num_turns ?? null, rounds: roundsOf(messages), total_cost_usd: cost, duration_min: +((Date.now() - t1) / 60e3).toFixed(1), api_error: apiError})}${eng === 'oauth' ? ' (Max plan, not the credits)' : ''}`);
    const refused = deniedLine(result?.permission_denials);
    if (refused) console.log(`${tag} refused tools: ${refused}`);
    console.log(`${tag}: ${lastCheckLine(lastCheckOf(messages))}`);
    console.log(`${tag} ${turnLine(turnStats(messages))}`);
    console.log(`${tag} ${usageLine(usageStats(messages, model))}`);
    if (eng === 'oauth') {
      try {
        fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
        fs.writeFileSync(path.join(root, 'out/ci/fix-token.json'), `${JSON.stringify({usd: cost})}\n`);
      } catch {}
    }
    return {done, how: verdictOf({result, apiError, crashed, elapsedMs: Date.now() - t1}).how, apiError};
  };
  let r = await once(engine);
  // the API refused at once (the credits ran out between the ledger and the call, a rate limit, an outage): the token
  if (!r.done && engine === 'api' && r.how === 'handover' && token && !abortController.signal.aborted) {
    console.log(`fix: the API refused (${clean(r.apiError ?? 'no result', 60)}): the Claude token makes the fix round`);
    engine = 'oauth';
    r = await once('oauth');
  }
  if (timer) clearTimeout(timer);
  if (abortController.signal.aborted) console.log(`fix: stopped at its ${deadline} min deadline`);
  const held = stopLine(root, filmIdOf(root, env));
  if (held) console.log(`fix: ${held}`);
  console.log(`fix: ${r.done ? 'finished' : 'did not finish'} on the ${engine === 'api' ? 'API key' : 'Claude token'} in ${((Date.now() - t0) / 60e3).toFixed(1)} min`);
  process.exit(r.done ? 0 : 1);
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
  ok(t.maxTurns === 200 && t.allow.includes('Bash(node tools/check.mjs *)') && t.deny.includes('Read(//proc/**)'), 'ci/tools.json');
  const a = oauthArgs(t, 'claude-opus-5-5');
  ok(a.startsWith('--model claude-opus-5-5\n--max-turns 200\n--allowedTools "Read,Glob,Grep,Write(specs/**)'), `args: ${a.slice(0, 80)}`);
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
  // the turn cap's units (MUST-FIX 2): num_turns counts tool results, never the cap; a finished success over it is accepted
  ok(v({result: {subtype: 'success', is_error: false, num_turns: 172, terminal_reason: 'completed'}}).how === 'done', 'num_turns 172 over a 140 cap: still done (num_turns is not the cap)');
  ok(/maxTurns: tools\.maxTurns,/.test(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')), 'the API engine runs with ci/tools.json maxTurns');
  const R = (o) => [{type: 'system'}, {type: 'assistant', message: {id: 'm1', content: []}}, {type: 'result', ...o}];
  const fin = {subtype: 'success', is_error: false, terminal_reason: 'completed', num_turns: 160};
  ok(acceptOf(R(fin)).ok && acceptOf(R(fin)).toolResults === 160, 'accept: a finished success at num_turns 160');
  ok(acceptOf(R({...fin, terminal_reason: undefined})).ok, 'accept: a finished success with no terminal_reason');
  ok(!acceptOf(R({subtype: 'error_max_turns', is_error: true, terminal_reason: 'max_turns'})).ok, 'accept: out of rounds is not');
  ok(!acceptOf(R({...fin, is_error: true, terminal_reason: 'api_error'})).ok && !acceptOf(R({...fin, is_error: true})).ok, 'accept: an API error is not');
  ok(!acceptOf(R({...fin, terminal_reason: 'aborted_tools'})).ok, 'accept: an aborted run is not');
  ok(!acceptOf([{type: 'system'}]).ok && !acceptOf({}).ok && !acceptOf(null).ok && !acceptOf(messagesOfFile('/nonexistent/x.json')).ok, 'accept: no result, not a list, a missing file: not');
  {
    const r1 = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'accept', '/nonexistent/x.json'], {encoding: 'utf8'});
    ok(r1.status === 1, `accept on a missing file exits 1 (${r1.status})`);
    const tf = path.join(os.tmpdir(), `claude-run-accept-${process.pid}.json`);
    fs.writeFileSync(tf, JSON.stringify(R(fin)));
    const r2 = spawnSync(process.execPath, [fileURLToPath(import.meta.url), 'accept', tf], {encoding: 'utf8'});
    fs.rmSync(tf, {force: true});
    ok(r2.status === 0 && /accepted/.test(r2.stdout), `accept on a finished run exits 0 (${r2.status})`);
  }
  ok(roundsOf([{type: 'assistant', message: {id: 'a'}}, {type: 'assistant', message: {id: 'a'}}, {type: 'assistant', message: {id: 'b'}}, {type: 'user'}]) === 2 && roundsOf(null) === 0, 'rounds: distinct assistant message ids');
  {
    const wf = fs.readFileSync(path.join(root, '.github/workflows/studio.yml'), 'utf8');
    ok(/\$OAUTH == failure \]\] && node tools\/ci\/claude-run\.mjs accept/.test(wf), 'studio.yml: a token run the action failed is offered to "accept"');
    // the job's minutes (the p2x car film timed out at 50): the writer's limit, its own deadline under it, and the sum
    const lim = (name) => Number(new RegExp(`- name: ${name}\\n(?:(?!- name:)[\\s\\S])*?timeout-minutes: (\\d+)`).exec(wf)?.[1]);
    const job = Number(/timeout-minutes: (\d+)/.exec(wf)?.[1]);
    const [api, oauth, gate, render] = ['claude api', 'claude oauth', 'film gate', 'render'].map(lim);
    const dl = Number(/STUDIO_WRITE_MIN: "(\d+)"/.exec(wf)?.[1]);
    ok(api >= 75 && oauth >= 75 && dl > 0 && dl <= api - 2, `studio.yml: the writers get 75 minutes or more and the API stops itself first (api ${api}, oauth ${oauth}, deadline ${dl})`);
    ok(5 + 5 + FALLBACK_MIN + Math.max(api, oauth) + gate + 5 + render + 15 <= job, `studio.yml: setup, plan, a hand-over, the writer, the gate, the voice, the render and the rest fit the job's ${job} minutes (${api}/${oauth}/${gate}/${render})`);
    ok(/claude-run\.mjs timeout "\$eng"/.test(wf) && /cause=writer_timeout/.test(wf), 'studio.yml: a writer out of time is reported, its draft goes on, error.json says writer_timeout');
  }
  {
    // where the turns went: names only, never a command input, a path or Georgian
    const A = (id, ...c) => ({type: 'assistant', message: {id, content: c}});
    const U = (...c) => ({type: 'user', message: {content: c}});
    const use = (id, name, input) => ({type: 'tool_use', id, name, input});
    const res = (id, text, is_error = false) => ({type: 'tool_result', tool_use_id: id, content: [{type: 'text', text}], is_error});
    const msgs = [
      A('r1', use('a', 'Read', {file_path: '/home/runner/work/x/CLAUDE.md'}), use('b', 'Read', {file_path: '/home/runner/work/x/HOOKS.md', offset: 1, limit: 80})),
      U(res('a', 'x'), res('b', 'y')),
      A('r2', use('c', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'})),
      U(res('c', '  PROBLEM HUE_TWO 4.8-5.6 s (shot 3): „ზეთი"\n\nNOT READY: 1 problem above')),
      A('r3', use('d', 'Edit', {file_path: 'specs/v136-oil-slope.json', old_string: 'ზეთი', new_string: 'საიდუმლო'}), use('e', 'Read', {file_path: '/home/runner/work/x/CLAUDE.md'}), use('f', 'Read', {file_path: '/home/runner/work/x/out/v136.sheet.png'})),
      U(res('d', 'ok'), res('e', 'x'), res('f', 'img')),
      A('r4', use('g', 'Bash', {command: 'node tools/check.mjs v136-oil-slope'}), use('h', 'Bash', {command: 'cat /proc/self/environ'}), use('i', 'Bash', {command: 'python3 tools/vo.py v136-oil-slope'})),
      U(res('g', 'ready to render'), res('h', 'denied', true), res('i', 'ok')),
    ];
    const st = turnStats(msgs);
    const line = turnLine(st);
    ok(st.rounds === 4 && st.calls === 9 && st.checks === 2 && st.checksFailed === 1 && st.rereads === 1 && st.images === 1, `turn stats: ${JSON.stringify(st)}`);
    // the two counters agree (the r1 car film: "checks 1 (1 not ready)" against "9 checks in all, ready", "turn 303 of 308"
    // against "113 rounds"): a check after "cd x &&" counts in both, and the last check's turn is a round
    {
      const two = [
        {type: 'assistant', message: {id: 'm1', content: [use('p', 'Bash', {command: 'cd /home/runner/work/x && node tools/check.mjs v136-oil-slope'})]}},
        {type: 'assistant', message: {id: 'm1', content: [{type: 'text', text: 'checking'}]}},
        U(res('p', notReady)),
        {type: 'assistant', message: {id: 'm2', content: [use('q', 'Bash', {command: 'node tools/check.mjs v136-oil-slope 2>&1 | tail -40'})]}},
        U(res('q', ready)),
      ];
      const a = turnStats(two);
      const b = lastCheckOf(two);
      ok(a.checks === 2 && a.checksFailed === 1 && b.checks === 2 && b.verdict === 'ready' && b.turn === 2 && b.turns === 2 && a.rounds === 2, `the counters agree: ${JSON.stringify({a: [a.checks, a.checksFailed, a.rounds], b: [b.checks, b.turn, b.turns]})}`);
    }
    ok(st.tools.Read === 4 && st.tools['Bash(check.mjs)'] === 2 && st.tools['Bash(vo.py)'] === 1 && st.tools['Bash(cat)'] === 1 && st.tools.Edit === 1, 'turn stats by tool and script name');
    ok(/^[\x20-\x7e]+$/.test(line) && !/proc|environ|CLAUDE\.md|HOOKS|v136|sheet|HUE_TWO/.test(line), `the turns line, names only: ${line}`);
  }
  // the fix round's engine (the p2x story film: no fix round once the day's API share was used)
  ok(fixEngineOf({key: 'k', token: 't', pace: {ok: true, why: 'x'}}).engine === 'api', 'fix engine: the API when it may');
  ok(fixEngineOf({key: 'k', token: 't', pace: {ok: false, why: "today's share $29.10 is used"}}).engine === 'oauth', 'fix engine: the day share used -> the token');
  ok(fixEngineOf({key: '', token: 't', pace: null}).engine === 'oauth', 'fix engine: no key -> the token');
  ok(fixEngineOf({key: 'k', token: '', pace: {ok: false, why: 'x'}}).engine === null, 'fix engine: neither -> no fix round');
  ok(oauthTokenOf({CLAUDE_CODE_OAUTH_TOKEN: 'sk-ant-oat01-abcdefghij\n  klmnopqrstuv'}) === 'sk-ant-oat01-abcdefghijklmnopqrstuv' && oauthTokenOf({}) === '' && oauthTokenOf({CLAUDE_CODE_OAUTH_TOKEN: ' '}) === '', 'the token, cleaned of a line wrap');
  {
    const e0 = {ANTHROPIC_API_KEY: 'k', CLAUDE_CODE_OAUTH_TOKEN: 't', ACTIONS_ID_TOKEN_REQUEST_TOKEN: 'x', PATH: '/bin'};
    const ea = engineEnv(e0, 'api', 'k');
    const eo = engineEnv(e0, 'oauth', 't');
    ok(ea.ANTHROPIC_API_KEY === 'k' && !('CLAUDE_CODE_OAUTH_TOKEN' in ea) && !('ACTIONS_ID_TOKEN_REQUEST_TOKEN' in ea) && ea.PATH === '/bin', 'engine env: the API gets the key only');
    ok(eo.CLAUDE_CODE_OAUTH_TOKEN === 't' && !('ANTHROPIC_API_KEY' in eo), 'engine env: the token run gets the token only');
  }
  ok(writeDeadlineMin({STUDIO_WRITE_MIN: '72'}) === 72 && writeDeadlineMin({}) === null && writeDeadlineMin({STUDIO_WRITE_MIN: ''}) === null && writeDeadlineMin({STUDIO_WRITE_MIN: '5'}) === null, 'the writer deadline knob');
  {
    // a writer out of time: the transcript gives the turns, the last check (codes only) and the tokens
    const A = (id, usage, ...c) => ({type: 'assistant', message: {id, usage, content: c}});
    const U = (...c) => ({type: 'user', message: {content: c}});
    const use = (id, name, input) => ({type: 'tool_use', id, name, input});
    const res = (id, text) => ({type: 'tool_result', tool_use_id: id, content: [{type: 'text', text}]});
    const u = {input_tokens: 1000, output_tokens: 1000, cache_read_input_tokens: 100000, cache_creation_input_tokens: 0};
    const msgs = [A('m1', u, use('a', 'Bash', {command: 'node tools/check.mjs v140-cng-smell'})), A('m1', u, {type: 'text', text: 'x'}), U(res('a', '  PROBLEM TEXT_CLASH 1.0-2.0 s (shot 1): „ჩუჩელა"\n\nNOT READY: 1 problem above')), A('m2', u, use('b', 'Edit', {file_path: 'specs/v140-cng-smell.json'}))];
    const rep = timeoutReport(msgs, {engine: 'oauth'});
    const est = 2 * (1000 * 4 + 1000 * 20 + 100000 * 0.2) / 1e6;
    ok(rep.note.cause === 'writer_timeout' && rep.note.rounds === 2 && rep.note.verdict === 'not_ready' && rep.note.codes[0] === 'TEXT_CLASH 1.0-2.0 s', `timeout note: ${JSON.stringify(rep.note)}`);
    ok(Math.abs(rep.note.tokenUsd - Math.round(est * 100) / 100) < 1e-9, `timeout tokens: one usage per message id (${rep.note.tokenUsd})`);
    ok(rep.messages.at(-1).type === 'result' && rep.messages.at(-1).subtype === 'error_writer_timeout' && !acceptOf(rep.messages).ok, 'a timeout is never accepted as a finished script');
    ok(rep.lines.every((l) => /^[\x20-\x7e]+$/.test(l)) && !rep.lines.some((l) => /specs\/|ჩუჩ|PROBLEM/.test(l)), `the timeout lines, codes and numbers only: ${rep.lines.join(' | ')}`);
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-run-tr-'));
    fs.mkdirSync(path.join(dir, 'projects/-home-runner-work-x'), {recursive: true});
    const f = path.join(dir, 'projects/-home-runner-work-x/s1.jsonl');
    fs.writeFileSync(f, `${msgs.map((m) => JSON.stringify({...m, sessionId: 's1'})).join('\n')}\n{"type":"summary"}\nnot json\n`);
    const got = newestTranscript([path.join(dir, 'projects')], 0);
    ok(got === f && messagesOfJsonl(f).length === 4, 'the newest session transcript, read as messages');
    ok(newestTranscript([path.join(dir, 'projects')], Date.now() + 60e3) === null && newestTranscript(['/nonexistent'], 0) === null, 'an old or missing transcript: none');
    fs.rmSync(dir, {recursive: true, force: true});
    ok(timeoutReport([], {}).note.tokenUsd === null && timeoutReport([], {}).note.verdict === 'none', 'no transcript: unknown, not zero');
  }
  {
    // r3-cost: a check behind `timeout` is a check, a --lint run is a lint (never the last check), and both are counted
    ok(checkKind('timeout 900 node tools/check.mjs v136-oil-slope') === 'check' && checkKind('VS_CI=1 node tools/check.mjs v1-x') === 'check' && checkKind('node tools/check.mjs v1-x --lint') === 'lint' && checkKind('node tools/ci/p2lint.mjs v1-x') === null, 'checkKind: timeout and env prefixes, --lint');
    const A = (id, ...c) => ({type: 'assistant', message: {id, content: c}});
    const U = (...c) => ({type: 'user', message: {content: c}});
    const use = (id, name, input) => ({type: 'tool_use', id, name, input});
    const res = (id, text) => ({type: 'tool_result', tool_use_id: id, content: [{type: 'text', text}]});
    const msgs = [
      A('m1', use('a', 'Bash', {command: 'timeout 900 node tools/check.mjs v136-oil-slope'})),
      U(res('a', '  PROBLEM HUE_TWO 4.8-5.6 s (shot 3)\n\nNOT READY: 1 problem above')),
      A('m2', use('b', 'Edit', {file_path: 'specs/v136-oil-slope.json'}), use('c', 'Edit', {file_path: 'specs/v136-oil-slope.json'})),
      U(res('b', 'ok'), res('c', 'ok')),
      A('m3', use('d', 'Bash', {command: 'node tools/check.mjs v136-oil-slope --lint'})),
      U(res('d', '\nlint clean: now the full check')),
    ];
    const lc = lastCheckOf(msgs);
    const st = turnStats(msgs);
    ok(lc.verdict === 'not_ready' && lc.checks === 1 && lc.editsAfter === 2 && lc.codes[0] === 'HUE_TWO 4.8-5.6 s', `the last check behind timeout, the lint after it not a check: ${JSON.stringify(lc)}`);
    ok(st.checks === 1 && st.lints === 1 && st.tools['Bash(check.mjs)'] === 1 && st.tools['Bash(check.mjs --lint)'] === 1 && st.rounds === 3 && st.calls === 4, `turn stats count the lint: ${JSON.stringify(st)}`);
    ok(/lints 1;/.test(turnLine(st)), 'the turns line says the lints');
    // where the money went: one usage per reply, a cold round, the other TTL
    const Au = (id, u) => ({type: 'assistant', message: {id, usage: u, content: []}});
    const u1 = {input_tokens: 10, output_tokens: 1000, cache_read_input_tokens: 0, cache_creation_input_tokens: 50000};
    const u2 = {input_tokens: 10, output_tokens: 2000, cache_read_input_tokens: 50000, cache_creation_input_tokens: 5000};
    const u3 = {input_tokens: 10, output_tokens: 500, cache_read_input_tokens: 0, cache_creation_input_tokens: 60000};
    const us = usageStats([Au('a', u1), Au('a', {...u1, output_tokens: 10}), Au('b', u2), Au('c', u3), {type: 'user', message: {content: []}}]);
    ok(us.rounds === 3 && us.output === 3500 && us.read === 50000 && us.write === 115000 && us.cold === 1 && us.coldWrite === 60000, `usage: one per reply, the cold round: ${JSON.stringify(us)}`);
    const want = (30 * 4 + 3500 * 20 + 50000 * 0.2 + 115000 * 5) / 1e6;
    ok(Math.abs(us.usd.total - Math.round(want * 100) / 100) < 0.011, `usage: list price ${us.usd.total} vs ${want}`);
    ok(Math.abs(us.ttl1h - ((55000 * 8 + 60000 * 0.2) / 1e6 - (115000 * 5) / 1e6)) < 0.011, `usage: what the 1h TTL would have changed (${us.ttl1h})`);
    const ul = usageLine(us);
    ok(/^[\x20-\x7e]+$/.test(ul) && /1 cold round/.test(ul) && /1h TTL would have changed it by -\$0\.12/.test(ul), `usage line: ${ul}`);
    ok(usageStats([Au('a', {...u1, cache_creation: {ephemeral_1h_input_tokens: 50000}})]).ttl1h === 'on' && usageLine(usageStats([])) === 'tokens: no usage in the messages', 'usage: the 1h TTL seen, no usage');
    ok(engineEnv({STUDIO_CACHE_1H: '1'}, 'api', 'k').ENABLE_PROMPT_CACHING_1H === '1' && !('ENABLE_PROMPT_CACHING_1H' in engineEnv({}, 'api', 'k')) && !('ENABLE_PROMPT_CACHING_1H' in engineEnv({STUDIO_CACHE_1H: '1', ENABLE_PROMPT_CACHING_1H: '1'}, 'oauth', 't')), 'the 1-hour cache: the API engine on STUDIO_CACHE_1H=1 only');
  }
  ok(fixDeadlineMin({STUDIO_FIX_MIN: '25'}) === 25 && fixDeadlineMin({}) === null && fixDeadlineMin({STUDIO_FIX_MIN: ''}) === null && fixDeadlineMin({STUDIO_FIX_MIN: '2'}) === null && fixDeadlineMin({STUDIO_FIX_MIN: '600'}) === null, 'the fix round deadline knob');
  ok(/abortController,\n\s+maxTurns: caps\.maxTurns/.test(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8')), 'the fix round runs with its deadline');
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
    // the OAuth engine's writer too (the action writes the same messages file): codes only, and where its turns went
    const msgs = messagesOfFile(runFile(process.argv[3]));
    console.log(lastCheckLine(lastCheckOf(msgs)));
    console.log(turnLine(turnStats(msgs)));
    console.log(`${usageLine(usageStats(msgs, modelOf()))} (Max plan, not the credits)`);
    const held = stopLine(root, filmIdOf(root, process.env));
    if (held) console.log(held);
    return;
  }
  if (cmd === 'accept') {
    // the token's run, failed by the action only on its num_turns > maxTurns check: a finished success is a finished
    // script (exit 0); anything else exit 1. The film gate re-checks it either way.
    const a = acceptOf(messagesOfFile(runFile(process.argv[3])));
    console.log(a.ok ? `the token's run finished (${a.toolResults} tool results in ${a.rounds} rounds): the action's num_turns check is not the turn cap, accepted` : 'the token run did not finish');
    process.exit(a.ok ? 0 : 1);
  }
  if (cmd === 'timeout') {
    // studio.yml "script": a writer that left no finished messages file (the step's limit or its own deadline stopped it).
    // The API engine's stream, or Claude Code's own session transcript for the token: the partial messages, the note.
    const eng = process.argv[3] === 'api' ? 'api' : 'oauth';
    const tmp = process.env.RUNNER_TEMP || path.join(root, 'out/ci');
    if (eng === 'api' && fs.existsSync(path.join(root, 'out/ci/writer-timeout.json'))) {
      console.log('the API writer already reported its timeout');
      return;
    }
    let msgs = [];
    if (eng === 'api') msgs = messagesOfJsonl(path.join(tmp, STREAM_FILE));
    else {
      const f = newestTranscript(transcriptDirs(), Date.now() - 4 * 3600e3);
      msgs = f ? messagesOfJsonl(f) : [];
      if (!f) console.log("no Claude Code session transcript was found: the writer's turns are unknown");
    }
    const rep = timeoutReport(msgs, {engine: eng, model: modelOf()});
    fs.mkdirSync(tmp, {recursive: true});
    fs.writeFileSync(path.join(tmp, PARTIAL_FILE), JSON.stringify(rep.messages, null, 2));
    writeTimeoutNote(rep.note);
    for (const l of rep.lines) console.log(l);
    return;
  }
  if (cmd === 'denials') {
    // the OAuth engine's refusals too ("claude oauth" writes the same messages file): names only, never inputs
    const line = deniedLine(deniedOfFile(process.argv[3] ?? path.join(process.env.RUNNER_TEMP || path.join(root, 'out/ci'), 'claude-execution-output.json')));
    console.log(line ? `refused tools: ${line}` : 'refused tools: none');
    return;
  }
  console.error('usage: node tools/ci/claude-run.mjs write | fix <brief> | args | denials [file] | lastcheck [file] | accept [file] | timeout api|oauth | --test');
  process.exit(2);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
