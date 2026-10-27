// The check's stamp (the r3 verify of MUST-FIX 3, 2026-10-27: the car film's writer ended its session and the film gate's own
// check found HUE_TWO twice at once; the public log could not tell a writer that stopped on a failing or stale check from a
// check that answers differently on the same files). Every `node tools/check.mjs <id>` leaves out/ci/check-<id>.json:
//   {id, verdict: "ready" | "not_ready" | "quota", codes: ["HUE_TWO 4.8-5.6 s", ...], inputs: <sha256>, at}
// `inputs` hashes what the writer controls (specs/<id>.json and the film's own src/scenes/film/<Name>*.tsx, by name and
// content), so the gate can say which of four things happened before it checks again:
//   NO_CHECK   the writer never ran the check (or it never reached its end)
//   STALE      the spec or a Film file changed after the writer's last check
//   FAILING    the writer's last check said NOT READY, and the writer handed the film over anyway
//   DRIFT      the writer's last check said "ready" on these very files and the gate's check does not: the check is not
//              deterministic (a render or a pixel guard): the codes of both go in the log
//   AGREE      both said the same
// The writer cannot forge the stamp: its tools write only under specs/ and src/scenes/film/ (ci/tools.json). The codes are the
// public form (codeOf: the code and its time range, never the line's words): the run logs are public.
//
//   node tools/ci/checkstamp.mjs --test    the self-test (no render)
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {isOwnFilm} from './visual.mjs';

const self = fileURLToPath(import.meta.url);

/** check.mjs's stdout -> its PROBLEM lines (full text) (moved here from filmgate.mjs, which re-exports it) */
export const problemsOf = (stdout) =>
  String(stdout ?? '')
    .split('\n')
    .filter((l) => /^\s*PROBLEM /.test(l))
    .map((l) => l.replace(/^\s*PROBLEM /, '').trim());

/** a problem line -> its public form: the code (the first ALL_CAPS token with an underscore or of 4+ letters) and its time
 *  range, never its words (moved here from filmgate.mjs, which re-exports it) */
export const codeOf = (line) => {
  const s = String(line ?? '');
  const code = (/\b[A-Z][A-Z0-9]*_[A-Z0-9_]+\b/.exec(s) ?? /\b[A-Z][A-Z0-9]{3,}\b/.exec(s))?.[0] ?? 'CHECK';
  const t = /\b(\d{1,3}(?:\.\d)?-\d{1,3}(?:\.\d)? s)\b/.exec(s)?.[1];
  return t ? `${code} ${t}` : code;
};

/** sha256 of the writer's inputs: specs/<id>.json and the film's own src/scenes/film/<Name>*.tsx (isOwnFilm), sorted, by name and content */
export const inputsHash = (root, id) => {
  const h = crypto.createHash('sha256');
  const add = (rel) => {
    let buf;
    try {
      buf = fs.readFileSync(path.join(root, rel));
    } catch {
      buf = Buffer.from('\u0000missing');
    }
    h.update(`${rel}\u0000${buf.length}\u0000`);
    h.update(buf);
  };
  add(`specs/${id}.json`);
  // a redo (-rN) draws with its original's Films (tools/ci/visual.mjs isOwnFilm)
  const base = String(id).replace(/-r\d+$/, '');
  let films = [];
  try {
    films = fs.readdirSync(path.join(root, 'src/scenes/film')).filter((f) => f.endsWith('.tsx') && isOwnFilm(f.slice(0, -4), base)).sort();
  } catch {}
  for (const f of films) add(`src/scenes/film/${f}`);
  return h.digest('hex');
};

export const stampFile = (root, id) => path.join(root, 'out/ci', `check-${id}.json`);

/** check.mjs, at every end: the verdict, the problems' public codes, the inputs it checked (hashed at its start) */
export const writeStamp = (root, id, {verdict, problems = [], inputs}) => {
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(stampFile(root, id), `${JSON.stringify({id, verdict, codes: problems.map(codeOf), inputs, at: new Date().toISOString()})}\n`);
  } catch {}
};

export const readStamp = (root, id) => {
  try {
    const s = JSON.parse(fs.readFileSync(stampFile(root, id), 'utf8'));
    return s && s.id === id && typeof s.inputs === 'string' ? s : null;
  } catch {
    return null;
  }
};

/** the writer's last check (`stamp`, read BEFORE the gate checks again), the inputs now, the gate's check ({ok, codes}) ->
 *  NO_CHECK | STALE | FAILING | DRIFT | AGREE */
export const agreement = (stamp, inputsNow, gate) => {
  if (!stamp) return 'NO_CHECK';
  if (stamp.inputs !== inputsNow) return 'STALE';
  if (stamp.verdict !== 'ready') return gate.ok ? 'DRIFT' : 'FAILING';
  return gate.ok ? 'AGREE' : 'DRIFT';
};

/** one public log line about it (codes only) */
export const agreementLine = (how, stamp, gate) => {
  const w = stamp ? `${stamp.verdict}${stamp.codes?.length ? ` (${stamp.codes.join('; ')})` : ''}` : 'none';
  const g = gate.ok ? 'ready' : `not_ready${gate.codes?.length ? ` (${gate.codes.join('; ')})` : ''}`;
  const why = {
    NO_CHECK: 'the writer never finished a check',
    STALE: 'the spec or a Film file changed after the writer\'s last check',
    FAILING: 'the writer handed over a film its own last check failed',
    DRIFT: 'the SAME files checked twice gave two answers: the check is not deterministic',
    AGREE: 'the writer and the gate agree',
  }[how];
  return `film gate: writer vs gate ${how}: ${why} (writer: ${w}; gate: ${g})`;
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const tmp = fs.mkdtempSync(path.join(path.dirname(path.dirname(path.dirname(self))), 'out', 'stamp-test-'));
  try {
    fs.mkdirSync(path.join(tmp, 'specs'), {recursive: true});
    fs.mkdirSync(path.join(tmp, 'src/scenes/film'), {recursive: true});
    fs.writeFileSync(path.join(tmp, 'specs/v136-oil-slope.json'), '{"id":"v136-oil-slope"}');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V136OilSlope.tsx'), 'export const V136OilSlope = () => null;');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V136OilSlopeHook.tsx'), 'export const V136OilSlopeHook = () => null;');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V137Other.tsx'), 'x');
    const h0 = inputsHash(tmp, 'v136-oil-slope');
    ok(/^[0-9a-f]{64}$/.test(h0) && h0 === inputsHash(tmp, 'v136-oil-slope'), 'the inputs hash is stable');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V137Other.tsx'), 'y');
    ok(inputsHash(tmp, 'v136-oil-slope') === h0, 'another film\'s file is not an input');
    fs.writeFileSync(path.join(tmp, 'src/scenes/film/V136OilSlopeHook.tsx'), 'export const V136OilSlopeHook = () => 1;');
    const h1 = inputsHash(tmp, 'v136-oil-slope');
    ok(h1 !== h0, 'an edit of the film\'s own second file changes it');
    writeStamp(tmp, 'v136-oil-slope', {verdict: 'not_ready', problems: ['HUE_TWO 4.8-5.6 s (shot 3, Receipt): red, green in one frame: „ზეთი"'], inputs: h1});
    const s = readStamp(tmp, 'v136-oil-slope');
    ok(s && s.verdict === 'not_ready' && s.codes[0] === 'HUE_TWO 4.8-5.6 s' && !/[^\x20-\x7e]/.test(JSON.stringify(s.codes)), 'the stamp keeps the codes only');
    ok(readStamp(tmp, 'v136-other') === null, 'no stamp: null');
    const fail = {ok: false, codes: ['HUE_TWO 4.8-5.6 s']};
    const pass = {ok: true, codes: []};
    ok(agreement(null, h1, fail) === 'NO_CHECK', 'no stamp: NO_CHECK');
    ok(agreement({...s, inputs: h0}, h1, fail) === 'STALE', 'edited after the check: STALE');
    ok(agreement(s, h1, fail) === 'FAILING', 'handed over failing: FAILING');
    ok(agreement({...s, verdict: 'ready', codes: []}, h1, fail) === 'DRIFT', 'ready, then not ready on the same files: DRIFT');
    ok(agreement(s, h1, pass) === 'DRIFT', 'not ready, then ready on the same files: DRIFT');
    ok(agreement({...s, verdict: 'ready'}, h1, pass) === 'AGREE', 'both ready: AGREE');
    const l = agreementLine('DRIFT', {...s, verdict: 'ready', codes: []}, fail);
    ok(/DRIFT/.test(l) && /writer: ready/.test(l) && /HUE_TWO 4\.8-5\.6 s/.test(l) && /^[\x20-\x7e]+$/.test(l), `the log line: ${l}`);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
  console.log(bad ? `checkstamp: ${bad} failed` : 'checkstamp: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  if (process.argv[2] === '--test') process.exit(selfTest());
  console.log('usage: node tools/ci/checkstamp.mjs --test');
  process.exit(2);
}
