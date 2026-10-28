// The writer may not hand over a film its own check fails (r3-judge, the r3 verify's MUST-FIX 3, 2026-10-27: the car film's
// writer ended its session, and the film gate's `node tools/check.mjs` found HUE_TWO twice at once; the writer had stopped on
// a failing check, edited after its last one, or had it refused). Claude Code's Stop hook (.claude/settings.json, project
// settings: both engines load them, the Agent SDK on the API key and the Claude Code Action on the token) runs this script
// whenever the writer, or a fix round (tools/ci/filmgate.mjs, tools/ci/judge.mjs), tries to end its session:
//   - the film's check stamp (tools/ci/checkstamp.mjs, written by check.mjs at every end) must say "ready" (or "quota", the
//     voice is gone for today) for the files AS THEY ARE NOW (its inputs hash);
//   - else the stop is BLOCKED and Claude is told why: no check, a failing check (its problems' codes), or files changed after
//     the last check. It runs `node tools/check.mjs <id>` again and fixes until "ready to render".
// The writer and the gate share ONE deterministic check: the stamp is check.mjs's own, and the gate runs the same check.mjs.
// At most MAX_BLOCKS blocks a session (never a loop: the film gate and its fix round take over from there). Off unless
// STUDIO_STOPCHECK=1 (studio.yml sets it on the Claude steps only), so a Claude Code session on the Mac is never held. A
// request turned down (out/ci/rejected.json), a Story set, a film before P2_FROM or a session with no spec yet stops freely.
//
//   echo '{"hook_event_name":"Stop","session_id":"s"}' | node tools/ci/stopcheck.mjs     the hook (stdin: the hook's JSON)
//   node tools/ci/stopcheck.mjs line [id]    one public log line: how many stops were held, codes only
//   node tools/ci/stopcheck.mjs --test       the self-test
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {p2On} from '../../src/lib/p2.mjs';
import {inputsHash, readStamp, readLoop, LOOP_STOP} from './checkstamp.mjs';

const self = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(self), '../..');
export const MAX_BLOCKS = 3;
const ID = /^[a-z0-9][a-z0-9-]{0,79}$/;

/** which film this session is writing: the fix round's own id (STUDIO_FIX_ID), else this request's ledger line, else none */
export const filmIdOf = (root, env) => {
  if (ID.test(String(env.STUDIO_FIX_ID ?? ''))) return env.STUDIO_FIX_ID;
  try {
    const ledger = JSON.parse(fs.readFileSync(path.resolve(root, env.STUDIO_LEDGER || 'specs/.studio.json'), 'utf8'));
    const id = ledger?.[env.STUDIO_REQ]?.id;
    if (ID.test(String(id ?? ''))) return id;
  } catch {}
  return null;
};

const counterFile = (root, id) => path.join(root, 'out/ci', `stopcheck-${id}.json`);
const readCounter = (root, id) => {
  try {
    const j = JSON.parse(fs.readFileSync(counterFile(root, id), 'utf8'));
    return j && typeof j === 'object' && j.sessions ? j : {sessions: {}};
  } catch {
    return {sessions: {}};
  }
};

/**
 * The decision: {block: false, why} or {block: true, reason, why}. `why` is a short public word (codes only), `reason` is
 * what Claude reads (this session's own transcript, never the public log).
 */
export const decide = ({root = ROOT, env = process.env, input = {}} = {}) => {
  if (String(env.STUDIO_STOPCHECK ?? '') !== '1') return {block: false, why: 'off'};
  if (env.STUDIO_MODE === 'slides') return {block: false, why: 'slides'};
  if (fs.existsSync(path.join(root, 'out/ci/rejected.json'))) return {block: false, why: 'rejected'};
  const id = filmIdOf(root, env);
  if (!id) return {block: false, why: 'no_film'};
  if (!fs.existsSync(path.join(root, 'specs', `${id}.json`))) return {block: false, why: 'no_spec'};
  if (!p2On(id.replace(/-r\d+$/, ''))) return {block: false, why: 'before_p2'};
  const stamp = readStamp(root, id);
  const now = inputsHash(root, id);
  const fresh = stamp && stamp.inputs === now;
  if (fresh && (stamp.verdict === 'ready' || stamp.verdict === 'quota')) return {block: false, why: stamp.verdict};
  // the same problems LOOP_STOP checks in a row (checkstamp.mjs): the writer was told to end; the film gate's fix round takes over
  if ((readLoop(root, id)?.n ?? 0) >= LOOP_STOP) return {block: false, why: 'loop'};
  const why = !stamp ? 'no_check' : !fresh ? 'stale' : 'not_ready';
  const sid = /^[A-Za-z0-9-]{1,80}$/.test(String(input.session_id ?? '')) ? input.session_id : 'session';
  const c = readCounter(root, id);
  const n = Number(c.sessions[sid]?.blocks) || 0;
  if (n >= MAX_BLOCKS) return {block: false, why: `gave_up_${why}`};
  c.sessions[sid] = {blocks: n + 1, last: why, codes: fresh ? (stamp.codes ?? []).slice(0, 8) : [], at: new Date().toISOString()};
  try {
    fs.mkdirSync(path.dirname(counterFile(root, id)), {recursive: true});
    fs.writeFileSync(counterFile(root, id), `${JSON.stringify(c)}\n`);
  } catch {}
  const cmd = `node tools/check.mjs ${id}`;
  const state =
    why === 'no_check'
      ? `You have not finished a run of \`${cmd}\` on this film.`
      : why === 'stale'
        ? `specs/${id}.json or one of the film's own Film files changed AFTER your last \`${cmd}\` (it said ${stamp.verdict === 'ready' ? '"ready to render"' : 'NOT READY'} on the files as they were then).`
        : `Your last \`${cmd}\` said NOT READY on these very files: ${(stamp.codes ?? []).join('; ') || 'see its PROBLEM lines'}.`;
  const reason = [
    `NOT FINISHED: the studio's gate runs the same \`${cmd}\` on what you leave, and a film it fails is never voiced or published. ${state}`,
    `Run \`${cmd}\` exactly like that (no pipe, no "cd ... &&", no redirect: those are refused), fix every PROBLEM line in the spec or the film's own Film files, and run it again until it ends with "ready to render" on the files as they are. Then end. (${n + 1} of ${MAX_BLOCKS})`,
  ].join('\n');
  return {block: true, reason, why};
};

/** the public log line of a film's held stops (codes only): "" when none */
export const stopLine = (root, id) => {
  if (!ID.test(String(id ?? ''))) return '';
  const c = readCounter(root, id);
  const s = Object.values(c.sessions);
  if (!s.length) return '';
  const n = s.reduce((a, x) => a + (Number(x.blocks) || 0), 0);
  const last = s[s.length - 1];
  return `the stop hook held ${n} stop${n === 1 ? '' : 's'} in ${s.length} session${s.length === 1 ? '' : 's'} (the last: ${last.last}${last.codes?.length ? `, ${last.codes.join('; ')}` : ''})`.replace(/[^\x20-\x7e]/g, '?').slice(0, 400);
};

const hook = async () => {
  let raw = '';
  try {
    raw = fs.readFileSync(0, 'utf8');
  } catch {}
  let input = {};
  try {
    input = JSON.parse(raw || '{}');
  } catch {}
  if (input.hook_event_name && input.hook_event_name !== 'Stop' && input.hook_event_name !== 'SubagentStop') return 0;
  let d;
  try {
    d = decide({input});
  } catch {
    return 0; // never hold a session on a bug of our own
  }
  if (d.block) process.stdout.write(`${JSON.stringify({decision: 'block', reason: d.reason})}\n`);
  return 0;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'stopcheck-'));
  try {
    const id = 'v140-oil-slope';
    fs.mkdirSync(path.join(tmp, 'specs'), {recursive: true});
    fs.mkdirSync(path.join(tmp, 'src/scenes/film'), {recursive: true});
    fs.mkdirSync(path.join(tmp, 'out/ci'), {recursive: true});
    // a real fixture spec as the film (its own id): the hook reads only the stamp and the inputs
    const fx = JSON.parse(fs.readFileSync(path.join(ROOT, 'specs/demo-p2-data-v901.json'), 'utf8'));
    fs.writeFileSync(path.join(tmp, 'specs', `${id}.json`), JSON.stringify({...fx, id}));
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V140OilSlope.tsx'), 'export const V140OilSlope = () => null;');
    fs.writeFileSync(path.join(tmp, 'specs/.studio.json'), JSON.stringify({'r-abc123-x1y2': {id}}));
    const env = {STUDIO_STOPCHECK: '1', STUDIO_REQ: 'r-abc123-x1y2'};
    const stamp = (verdict, codes = [], inputs = inputsHash(tmp, id)) => fs.writeFileSync(path.join(tmp, 'out/ci', `check-${id}.json`), JSON.stringify({id, verdict, codes, inputs, at: 'x'}));
    const run = (e = env, input = {session_id: 's1'}) => decide({root: tmp, env: e, input});
    ok(run({}).block === false && run({}).why === 'off', 'off unless STUDIO_STOPCHECK=1 (a Mac session is never held)');
    ok(filmIdOf(tmp, env) === id && filmIdOf(tmp, {...env, STUDIO_FIX_ID: 'v141-x'}) === 'v141-x' && filmIdOf(tmp, {}) === null, 'the film: the fix round id, else the ledger line');
    let d = run();
    ok(d.block && d.why === 'no_check' && /node tools\/check\.mjs v140-oil-slope/.test(d.reason) && /no pipe/.test(d.reason), 'no check yet: held, told to run the check plainly');
    stamp('not_ready', ['HUE_TWO 4.8-5.6 s', 'HUE_TWO 8.0-13.0 s']);
    d = run();
    ok(d.block && d.why === 'not_ready' && /HUE_TWO 8\.0-13\.0 s/.test(d.reason), 'a failing last check: held, with its codes');
    // the same problems LOOP_STOP checks in a row: the writer was told to end, the hook lets it (the gate's fix round takes over)
    fs.writeFileSync(path.join(tmp, 'out/ci', `checkloop-${id}.json`), JSON.stringify({sig: 'SHOT_LONG beats[6]', n: LOOP_STOP}));
    d = run({...env}, {session_id: 'sloop'});
    ok(!d.block && d.why === 'loop', 'five identical failing checks: it may end');
    fs.rmSync(path.join(tmp, 'out/ci', `checkloop-${id}.json`));
    stamp('ready');
    ok(!run().block && run().why === 'ready', 'a passing check on these files: it may end');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V140OilSlope.tsx'), 'export const V140OilSlope = () => 1;');
    d = run({...env}, {session_id: 's2'});
    ok(d.block && d.why === 'stale' && /changed AFTER/.test(d.reason), 'an edit after the passing check: held (stale)');
    run({...env}, {session_id: 's2'});
    run({...env}, {session_id: 's2'});
    d = run({...env}, {session_id: 's2'});
    ok(!d.block && d.why === 'gave_up_stale', `at most ${MAX_BLOCKS} holds a session, never a loop`);
    stamp('quota');
    ok(!run({...env}, {session_id: 's3'}).block, "the voice quota is gone: it may end (the voice step stops the run)");
    const line = stopLine(tmp, id);
    ok(/held 5 stops in 2 sessions/.test(line) && /^[\x20-\x7e]+$/.test(line), `the public line: ${line}`);
    fs.writeFileSync(path.join(tmp, 'out/ci/rejected.json'), '{}');
    ok(run().why === 'rejected', 'a request turned down: it may end');
    fs.rmSync(path.join(tmp, 'out/ci/rejected.json'));
    ok(decide({root: tmp, env: {...env, STUDIO_FIX_ID: 'v120-old'}, input: {}}).why === 'no_spec', 'no spec: it may end');
    fs.writeFileSync(path.join(tmp, 'specs/v120-old.json'), '{}');
    ok(decide({root: tmp, env: {...env, STUDIO_FIX_ID: 'v120-old'}, input: {}}).why === 'before_p2', 'a film before P2_FROM: as it was');
    ok(decide({root: tmp, env: {...env, STUDIO_MODE: 'slides'}, input: {}}).why === 'slides', 'a Story set: as it was');
    // the project settings carry the hook, for both engines
    const st = JSON.parse(fs.readFileSync(path.join(ROOT, '.claude/settings.json'), 'utf8'));
    ok((st.hooks?.Stop ?? []).some((m) => (m.hooks ?? []).some((h) => h.type === 'command' && /tools\/ci\/stopcheck\.mjs/.test(h.command))), '.claude/settings.json: the Stop hook');
    const wf = fs.readFileSync(path.join(ROOT, '.github/workflows/studio.yml'), 'utf8');
    const stepEnv = (name) => new RegExp(`- name: ${name}\\n(?:(?!\\n      - name:)[\\s\\S])*?STUDIO_STOPCHECK: "1"`).test(wf);
    ok(['claude api', 'claude oauth', 'film gate', 'judge'].every(stepEnv), 'studio.yml: STUDIO_STOPCHECK on the writer, the gate and the judge steps');
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
  console.log(bad ? `stopcheck: ${bad} failed` : 'stopcheck: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const cmd = process.argv[2];
  if (cmd === '--test') process.exit(selfTest());
  if (cmd === 'line') {
    const l = stopLine(ROOT, process.argv[3] ?? filmIdOf(ROOT, process.env));
    console.log(l || 'the stop hook held no stop');
    process.exit(0);
  }
  process.exit(await hook());
}
