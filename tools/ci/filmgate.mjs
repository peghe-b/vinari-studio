// The film gate (studio.yml "film gate", after "gate" and before "voice"; the p3 prove run, 2026-10-27). The P2 pixel guards,
// p2lint and every other check ran only inside the writer's own `node tools/check.mjs` loop: nothing after the writer ran them
// again, so a writer that ended with a failing check (or edited after its last check) got its film voiced, rendered and
// published, and the art director's "fail 4/12" changed nothing. Now:
//   1. tools/check.mjs <id> runs again here, on the spec and Film files as the writer left them (VS_CI=1: every fatal line is a
//      problem; the voice is cached, so it costs no Gemini request);
//   2. when it passes, the art director looks at its sheet (tools/ci/artdirector.mjs assess, kind "gate"): a FAIL (a hard row
//      under 1: whole, one hue, crafted) is a problem too;
//   3. on a problem: ONE fix round (FIX_ROUNDS, repo variable STUDIO_FIX_ROUNDS 0..2) of Claude Code on the API key
//      (tools/ci/claude-run.mjs fix: the problems and the art director's fixes as a short brief, 60 turns, $4), then 1 and 2
//      again; still a problem, or no API to fix with: the film STOPS here (exit 1, "failure note" names the script step),
//      before any voice or render is spent.
// A phase-2 film only (src/lib/p2.mjs); a Story set and an older film pass. The public log gets the problem CODES and their
// times only (this repo's run logs are public), never the lines' words; the writer's brief gets the lines in full.
//
//   node tools/ci/filmgate.mjs pre <id>    the gate (studio.yml)
//   node tools/ci/filmgate.mjs --test      the self-test (no render, no network)
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {p2On} from '../../src/lib/p2.mjs';
import {agreement, agreementLine, codeOf, inputsHash, problemsOf, readStamp} from './checkstamp.mjs';

export {codeOf, problemsOf};

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../..');

// The repo variable STUDIO_FIX_ROUNDS reaches here as "" when it is not set (studio.yml passes `${{ vars.X }}`), and
// Number("") is 0, a valid count: the gate then stopped every film with no fix round (the p4 re-prove car film). Only a
// single digit 0, 1 or 2 counts; unset, empty, blank or anything else is the default, 1.
export const fixRounds = (env = process.env) => {
  const s = String(env.STUDIO_FIX_ROUNDS ?? '').trim();
  return /^[0-2]$/.test(s) ? Number(s) : 1;
};

/** the fix round's brief */
export const fixBrief = (id, problems, ad) =>
  [
    `You are finishing the studio film ${id}: specs/${id}.json and the film's own Film files in src/scenes/film/ (the ones it already has; never another file there). The film is written, but the studio's gate stopped it before the voice. Fix ONLY what is listed below, in the spec or in those Film files, keeping the story, the facts, the treatment and every line that is not part of a problem.`,
    '',
    `Then run \`node tools/check.mjs ${id}\` until it ends with "ready to render", and look at out/${id}.sheet.png yourself (every shot: nothing cut, nothing over a word, no empty frame, one data colour). A problem you cannot fix in the picture: cut that shot or change the scene. The rules are the ones you know (CLAUDE.md, src/scenes/film/_template.tsx, ci/prompt.md).`,
    '',
    'The check\'s problems:',
    ...(problems.length ? problems.map((p) => `- ${p}`) : ['- none (the check passed)']),
    ...(ad
      ? [
          '',
          `The art director (it looked at out/${id}.sheet.png, one settled frame of every shot; "shot N" is the Nth tile): ${ad.v.verdict.toUpperCase()} ${ad.v.total}/12${ad.v.hardFail.length ? `, hard rows under 1: ${ad.v.hardFail.join(', ')}` : ''}. Its fixes:`,
          ...(ad.out.fixes ?? []).map((f) => `- shot ${f.shot}: ${String(f.what).replace(/[\u0000-\u001f]+/g, ' ').slice(0, 300)}`),
        ]
      : []),
    '',
    `End with one line: "${id} · fixed".`,
  ].join('\n');

const runCheck = (id, env) => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), id], {cwd: root, env: {...env, VS_CI: '1'}, encoding: 'utf8', maxBuffer: 64 << 20});
  const out = `${r.stdout ?? ''}`;
  const ok = r.status === 0 && /ready to render/.test(out);
  const quota = /VOICE_QUOTA/.test(out) || r.status === 75;
  return {ok, quota, problems: problemsOf(out), status: r.status, tail: out.trim().split('\n').slice(-1)[0] ?? ''};
};

const say = (line, env) => {
  console.log(line);
  if (env.GITHUB_STEP_SUMMARY) {
    try {
      fs.appendFileSync(env.GITHUB_STEP_SUMMARY, `${line}\n`);
    } catch {}
  }
};

const pre = async (id, env = process.env) => {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id ?? '')) {
    console.log('usage: node tools/ci/filmgate.mjs pre <id>');
    return 2;
  }
  if (env.STUDIO_MODE === 'slides' || !p2On(id.replace(/-r\d+$/, ''))) {
    console.log(`film gate: ${id} is not a phase-2 film: the writer's check stands`);
    return 0;
  }
  const {assess} = await import('./artdirector.mjs');
  const rounds = fixRounds(env);
  const log = {id, rounds: []};
  // the writer's last check (tools/ci/checkstamp.mjs), read before the gate's own check writes its stamp over it
  const stamp0 = readStamp(root, id);
  const inputs0 = inputsHash(root, id);
  for (let k = 0; ; k++) {
    const c = runCheck(id, env);
    if (k === 0 && !c.quota) {
      const gate = {ok: c.ok, codes: c.problems.map(codeOf)};
      const how = agreement(stamp0, inputs0, gate);
      log.writer = {how, verdict: stamp0?.verdict ?? null, codes: stamp0?.codes ?? []};
      say(agreementLine(how, stamp0, gate), env);
    }
    if (c.quota) {
      say('film gate: the voice quota is gone: the voice step stops the run', env);
      return 0;
    }
    let ad = null;
    let adFail = false;
    if (c.ok) {
      const sheet = path.join(root, 'out', `${id}.sheet.png`);
      if (fs.existsSync(sheet)) {
        const a = await assess(id, sheet, 'gate', env);
        if (a.skip) console.log(`film gate: no art director (${a.skip})`);
        else {
          ad = a;
          adFail = a.v.verdict === 'fail';
          say(`film gate, art director (before the voice): ${a.v.verdict} ${a.v.total}/12 (${Object.entries(a.out.scores).map(([r, v]) => `${r} ${v}`).join(', ')}), $${a.usd.toFixed(2)}`, env);
        }
      }
    }
    const codes = c.problems.map(codeOf);
    log.rounds.push({check: c.ok, problems: codes, ad: ad ? {verdict: ad.v.verdict, total: ad.v.total} : null});
    if (c.ok && !adFail) {
      say(`film gate: ${id} passed${k ? ` after ${k} fix round${k === 1 ? '' : 's'}` : ''}`, env);
      writeLog(log);
      return 0;
    }
    say(`film gate: ${c.ok ? 'the check passed, the art director failed it' : `${c.problems.length || 'the check failed,'} problem${c.problems.length === 1 ? '' : 's'}${c.problems.length ? `: ${codes.join('; ')}` : ` (${c.tail.replace(/[^\x20-\x7e]/g, '?').slice(0, 80)})`}`}`, env);
    if (k >= rounds) break;
    const brief = path.join(env.RUNNER_TEMP || path.join(root, 'out/ci'), `fix-${k + 1}.md`);
    fs.mkdirSync(path.dirname(brief), {recursive: true});
    fs.writeFileSync(brief, fixBrief(id, c.problems.length ? c.problems : c.ok ? [] : [c.tail], ad));
    say(`film gate: fix round ${k + 1} of ${rounds}`, env);
    const f = spawnSync(process.execPath, [path.join(root, 'tools/ci/claude-run.mjs'), 'fix', brief], {cwd: root, env, stdio: 'inherit'});
    if (f.status !== 0) {
      say('film gate: the fix round did not finish', env);
      break;
    }
  }
  writeLog(log);
  console.log(`::error::FILM_GATE the film did not pass the gate (the check's problems or the art director's FAIL above): it is not voiced, rendered or published`);
  return 1;
};

const writeLog = (log) => {
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(path.join(root, 'out/ci/filmgate.json'), `${JSON.stringify(log)}\n`);
  } catch {}
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const out = [
    '  guards  298 frames x 3 probes in 106 s, 3 lines above',
    '  PROBLEM EMPTY_P2 21.6-23.8 s (shot 11, KeywordLift): the picture is almost empty (0.2 % ...): „30 კი თბილი"',
    '  PROBLEM TEXT_CLASH 25.8-26.2 s (shot 12, IrisDetail): a word stands on something of its own tone',
    '  PROBLEM FILM V136WinterDigit: SIL_FACE a SilFigure with face "cool"',
    '  PROBLEM PICTURE_AGAIN „5W-30" is the main picture of 6 shots',
    '',
    'NOT READY: 4 problems above',
  ].join('\n');
  const ps = problemsOf(out);
  ok(ps.length === 4 && ps[0].startsWith('EMPTY_P2 21.6'), `the PROBLEM lines (${ps.length})`);
  const cs = ps.map(codeOf);
  ok(cs[0] === 'EMPTY_P2 21.6-23.8 s' && cs[1] === 'TEXT_CLASH 25.8-26.2 s' && cs[2] === 'SIL_FACE' && cs[3] === 'PICTURE_AGAIN', `the public codes: ${cs.join(' | ')}`);
  ok(cs.every((c) => /^[\x20-\x7e]+$/.test(c)), 'the public codes carry no Georgian words');
  ok(codeOf('the voice of the request is not the one asked') === 'CHECK', 'a line with no code: CHECK');
  const b = fixBrief('v136-x', ps, {v: {verdict: 'fail', total: 4, hardFail: ['whole']}, out: {fixes: [{shot: 3, what: 'Move the head off the headline.\u0007'}]}});
  ok(/specs\/v136-x\.json/.test(b) && /EMPTY_P2 21\.6/.test(b) && /shot 3: Move the head/.test(b) && !/\u0007/.test(b) && /FAIL 4\/12, hard rows under 1: whole/.test(b), 'the fix brief: the lines in full, the art director clean');
  {
    const fr = (v) => fixRounds(v === undefined ? {} : {STUDIO_FIX_ROUNDS: v});
    const want = [[undefined, 1], ['', 1], [' ', 1], ['\n', 1], ['0', 0], ['1', 1], ['2', 2], [' 2 ', 2], ['3', 1], ['9', 1], ['-1', 1], ['1.5', 1], ['abc', 1], ['0x1', 1], ['1e0', 1], [null, 1]];
    const off = want.filter(([v, n]) => fr(v) !== n).map(([v, n]) => `${JSON.stringify(v)} gave ${fr(v)}, not ${n}`);
    ok(!off.length, `the fix rounds knob: unset, "" and blank give 1; "0" 0; "2" 2; garbage 1${off.length ? ` (${off.join('; ')})` : ''}`);
  }
  ok(!p2On('v120-old') && p2On('v136-x'), 'only a phase-2 film is gated here');
  console.log(bad ? `filmgate: ${bad} failed` : 'filmgate: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const [cmd, id] = process.argv.slice(2);
  if (cmd === '--test') process.exit(selfTest());
  if (cmd === 'pre') process.exit(await pre(id));
  console.log('usage: node tools/ci/filmgate.mjs pre <id> | --test');
  process.exit(2);
}
