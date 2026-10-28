// The film gate (studio.yml "film gate", after "gate" and before "voice"; the p3 prove run, 2026-10-27). The P2 pixel guards,
// p2lint and every other check ran only inside the writer's own `node tools/check.mjs` loop: nothing after the writer ran them
// again, so a writer that ended with a failing check (or edited after its last check) got its film voiced, rendered and
// published, and the art director's "fail 4/12" changed nothing. Now:
//   1. tools/check.mjs <id> runs again here, on the spec and Film files as the writer left them (VS_CI=1: every fatal line is a
//      problem; the voice is cached, so it costs no Gemini request);
//   2. when it passes, the art director looks at its sheet (tools/ci/artdirector.mjs assess, kind "gate"): a FAIL (a hard row
//      under 1: whole, one hue, crafted) is a problem too;
//   3. on a problem: ONE fix round (FIX_ROUNDS, repo variable STUDIO_FIX_ROUNDS 0..2) of Claude Code on the API key
//      (tools/ci/claude-run.mjs fix: the problems and the art director's fixes as a short brief, 100 turns, $4), then 1 and 2
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
import {agreement, agreementLine, clearLoop, codeOf, inputsHash, problemsOf, readStamp} from './checkstamp.mjs';
import {GATE_HARD_MIN, HARD, ROWS as ROWS_AD, gateHolds} from './artdirector.mjs';
import {softOn} from './softgate.mjs';

export {GATE_HARD_MIN, gateHolds};

export {codeOf, problemsOf};

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../..');

// The repo variable STUDIO_FIX_ROUNDS reaches here as "" when it is not set (studio.yml passes `${{ vars.X }}`), and
// Number("") is 0, a valid count: the gate then stopped every film with no fix round (the p4 re-prove car film). Only a
// single digit 0, 1 or 2 counts; unset, empty, blank or anything else is the default, FIX_ROUNDS_DEFAULT.
// 2 since the r3x round-2 panel (2026-10-28): all three films stayed at 7/12 after ONE round that could only tweak props; a
// second round (on the Claude token when the API share is used: no credit) gives the rewrite a look at its own result.
export const FIX_ROUNDS_DEFAULT = 2;
export const fixRounds = (env = process.env) => {
  const s = String(env.STUDIO_FIX_ROUNDS ?? '').trim();
  return /^[0-2]$/.test(s) ? Number(s) : FIX_ROUNDS_DEFAULT;
};

/** out/<id>.shots.json (tools/check.mjs): the sheet's shot numbers -> the spec's beats, as "shot N = beats[i] Type" lines */
export const shotMap = (id, dir = path.join(root, 'out')) => {
  try {
    const list = JSON.parse(fs.readFileSync(path.join(dir, `${id}.shots.json`), 'utf8'));
    return (Array.isArray(list) ? list : []).map((x) => `shot ${x.shot} = beats[${x.beat}]${x.cut ? ` (its cut at chunk ${x.cut})` : ''} ${x.type}, ${x.from}-${x.to} s`);
  } catch {
    return [];
  }
};

/** What the gate asks of the art director before any voice is spent (the r1 car film, 2026-10-27: the gate let "fix 6/12"
 *  with every row at 1 through, then the rendered film failed "crafted 0" and the voice and render were thrown away): a
 *  PASS (9/12 or more, no hard row under 1) AND a margin on the hard rows, whole, one hue and crafted at 2. A "fix" verdict,
 *  or a hard row at 1, is a fix round, then the film stops if it is still short. */
export const gateWhy = (v, scores) => {
  const low = HARD.filter((r) => (scores?.[r] ?? 0) < GATE_HARD_MIN);
  return [v?.verdict !== 'pass' ? `${v?.verdict ?? '?'} ${v?.total ?? '?'}/12, a pass is 9` : '', low.length ? `${low.join(', ')} under ${GATE_HARD_MIN}` : ''].filter(Boolean).join('; ');
};
/** the art director's fixes as "shot N: what", one line each, safe for the public log (no controls, cut) */
export const fixLines = (fixes) => (fixes ?? []).map((f) => `shot ${Number(f?.shot) || '?'}: ${String(f?.what ?? '').replace(/[\u0000-\u001f\u007f]+/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 240)}`);

/** the fix round's brief */
export const fixBrief = (id, problems, ad, {draft = false, map = []} = {}) =>
  [
    draft
      ? `You are finishing the studio film ${id}: specs/${id}.json and the film's own Film files in src/scenes/film/ (the ones it already has, or the one its spec names and that is missing; never another file there). Its writer RAN OUT OF TIME: this is its draft. Read the spec, keep its story, facts and treatment, finish what is missing (a Film file the spec names, a beat, the ending) and fix what is listed below. Do not start over.`
      : `You are finishing the studio film ${id}: specs/${id}.json and the film's own Film files in src/scenes/film/ (the ones it already has; never another file there). The film is written, but the studio's gate stopped it before the voice. This is a REWRITE round, not a touch-up: every item below is a task you must close. Keep the story, the facts, the treatment and the hook's idea; everything else may change: replace a shot's scene type, cut a shot, merge two beats, give a beat "cuts", reword a line (still true, still the buddy tone), and fill the film back to its asked length with beats that show more.`,
    '',
    `Make every fix in ONE reply (all your Edits as parallel calls in one message), then \`node tools/check.mjs ${id} --lint\` (seconds: every rule before the voice at once) until it says lint clean. Bash runs only these two commands as written: never cd, a pipe, timeout, cat, sed, grep or python3 (refused, a wasted round); Read and Grep do the looking.`,
    '',
    `Then run \`node tools/check.mjs ${id}\` until it ends with "ready to render", and look at out/${id}.sheet.png yourself (every shot: nothing cut, nothing over a word, no empty frame, one data colour). A problem you cannot fix in the picture: cut that shot or change the scene. The rules are the ones you know (CLAUDE.md, src/scenes/film/_template.tsx, ci/prompt.md).`,
    '',
    'The check\'s problems:',
    ...(problems.length ? problems.map((p) => `- ${p}`) : ['- none (the check passed)']),
    ...(ad
      ? [
          '',
          `The art director (it looked at out/${id}.sheet.png, one settled frame of every shot; "shot N" is the tile whose label starts with N): ${ad.v.verdict.toUpperCase()} ${ad.v.total}/12 (${ROWS_AD.map((r) => `${r} ${ad.out.scores?.[r] ?? '?'}`).join(', ')})${ad.v.hardFail.length ? `, hard rows under 1: ${ad.v.hardFail.join(', ')}` : ''}. Its fixes, each a task (do it, or replace that shot with a better picture):`,
          ...(ad.out.fixes ?? []).map((f) => `- shot ${f.shot}${map[f.shot - 1] ? ` (${map[f.shot - 1].replace(/^shot \d+ = /, '')})` : ''}: ${String(f.what).replace(/[\u0000-\u001f]+/g, ' ').slice(0, 300)}`),
          ...(map.length ? ['', 'The sheet\'s shots and the spec\'s beats:', ...map.map((l) => `  ${l}`)] : []),
          '',
          'Every row under 2 is a task too. legible: every caption and label reads (a word on a busy photo moves to the paper, or the photo is calmer); whole: every car, phone, card and ring whole inside the frame (a photo fits, never a hard crop); explained: every shot SHOWS what its line says; fresh: no two shots the same picture, no number or chart twice; crafted: no lone word or number on bare paper, no drawn map, no template slide.',
          '',
          'The same craft faults come back film after film (the r3 story films): check EVERY shot against them, whether or not the list above names it. (1) A car photo, phone or card cut by the frame: pick a photo whose subject sits whole in the frame, or draw the car whole, never push a photo in until the car is cut. (2) An empty card, black rectangle or half-empty Versus/WhoCard: every slot holds a real value of this film\'s own data, else replace the shot with a photo and an Ink mark. (3) A ring, circle or underline off-centre of what it marks: re-measure its box on the picture, centred on the object. (4) A chart not proportional to its numbers (ScaleReveal, bars, rings): the lengths and areas are the numbers\' true ratio (100 against 50 is exactly twice). (5) A made-up map or a stock-slide look: replace it with a real photo and marks.',
          '',
          `The film goes to the voice only on a PASS with whole, one hue and crafted at 2 each${ad.out.scores ? ` (now: ${HARD.map((r) => `${r} ${ad.out.scores[r]}`).join(', ')})` : ''}. A shot that is not crafted (clip art, a template or stock-slide look, a hand-drawn diagram or primitive shapes) is REPLACED, not polished: a real photo with Ink marks on it, a current app screen in ScreenFocus or ScreenDeck, or a kit data part (Receipt, UnitGrid, ScaleReveal, RankShift, RangeScale, TimeRace, WipeCompare), filled with this film's own numbers. Never a drawn diagram, a drawn car or person, or a bare title on paper.`,
        ]
      : []),
    '',
    `End with one line: "${id} · fixed".`,
  ].join('\n');

/** the check's env: never the owner's Claude token (it is in this step's env only for the fix round's hand-over) */
export const checkEnv = (env) => {
  // STUDIO_LOOP off: the gate's own checks do not count toward the writer's run of identical failures (checkstamp.mjs)
  const e = {...env, VS_CI: '1', STUDIO_LOOP: 'off'};
  delete e.CLAUDE_CODE_OAUTH_TOKEN;
  return e;
};
const runCheck = (id, env) => {
  const r = spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), id], {cwd: root, env: checkEnv(env), encoding: 'utf8', maxBuffer: 64 << 20});
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

const runFix = (brief, env) => spawnSync(process.execPath, [path.join(root, 'tools/ci/claude-run.mjs'), 'fix', brief], {cwd: root, env, stdio: 'inherit'}).status;

/** the gate; `deps` replaces the check, the art director and the fix round in the self-test */
export const pre = async (id, env = process.env, deps = {}) => {
  if (!/^[a-z0-9][a-z0-9-]{0,79}$/.test(id ?? '')) {
    console.log('usage: node tools/ci/filmgate.mjs pre <id>');
    return 2;
  }
  if (env.STUDIO_MODE === 'slides' || !(deps.p2On ?? p2On)(id.replace(/-r\d+$/, ''))) {
    console.log(`film gate: ${id} is not a phase-2 film: the writer's check stands`);
    return 0;
  }
  const assess = deps.assess ?? (await import('./artdirector.mjs')).assess;
  const check = deps.runCheck ?? runCheck;
  const fix = deps.runFix ?? runFix;
  const rounds = fixRounds(env);
  // the soft gate (tools/ci/softgate.mjs): the art director's "fix" buys at most one fix round, then the film goes on
  const soft = softOn(env);
  const log = {id, rounds: [], soft};
  // the writer's last check (tools/ci/checkstamp.mjs), read before the gate's own check writes its stamp over it
  const stamp0 = readStamp(root, id);
  const inputs0 = inputsHash(root, id);
  for (let k = 0; ; k++) {
    const c = check(id, env);
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
      if (deps.assess || fs.existsSync(sheet)) {
        // two looks, the lower score of each row (the r1 car film: one look said "fix 6/12" before the voice, the same
        // film scored "fail 5/12, crafted 0" after the render)
        const a = await assess(id, sheet, 'gate', env, {looks: 2});
        if (a.skip) console.log(`film gate: no art director (${a.skip})`);
        else {
          ad = a;
          adFail = !gateHolds(a.v, a.out.scores);
          say(`film gate, art director (before the voice): ${a.v.verdict} ${a.v.total}/12 (${Object.entries(a.out.scores).map(([r, v]) => `${r} ${v}`).join(', ')}), $${a.usd.toFixed(2)}${adFail ? `: not enough for the voice (${gateWhy(a.v, a.out.scores)})` : ''}`, env);
          // each look's own scores (the r3x round-2 panel: 5 of 6 looks gave the same 1,2,1,1,1,1: anchored, or the films?)
          if (Array.isArray(a.looks) && a.looks.length > 1) say(`  the looks: ${a.looks.map((sc, i) => `${i + 1}: ${ROWS_AD.map((r) => sc?.[r] ?? '?').join(',')}`).join('; ')} (${ROWS_AD.join(',')}; the gate takes the lower of each row)`, env);
          for (const l of fixLines(a.out.fixes)) say(`  ${l}`, env);
        }
      }
    }
    const codes = c.problems.map(codeOf);
    log.rounds.push({check: c.ok, problems: codes, ad: ad ? {verdict: ad.v.verdict, total: ad.v.total} : null});
    if (c.ok && !adFail) {
      say(`film gate: ${id} passed${k ? ` after ${k} fix round${k === 1 ? '' : 's'}` : ''}`, env);
      if (!deps.runCheck) writeLog(log);
      return 0;
    }
    if (c.ok && soft && (k >= 1 || rounds === 0)) {
      say(`::warning::FILM_GATE_SOFT the art director did not pass ${id} (${gateWhy(ad.v, ad.out.scores)})${k ? ` after ${k} fix round${k === 1 ? '' : 's'}` : ''}: it goes on (STUDIO_GATE_MODE=soft)`, env);
      if (!deps.runCheck) writeLog({...log, softPass: true});
      return 0;
    }
    say(`film gate: ${c.ok ? 'the check passed, the art director did not pass it' : `${c.problems.length || 'the check failed,'} problem${c.problems.length === 1 ? '' : 's'}${c.problems.length ? `: ${codes.join('; ')}` : ` (${c.tail.replace(/[^\x20-\x7e]/g, '?').slice(0, 80)})`}`}`, env);
    if (k >= rounds) break;
    const brief = path.join(env.RUNNER_TEMP || path.join(root, 'out/ci'), `fix-${k + 1}.md`);
    fs.mkdirSync(path.dirname(brief), {recursive: true});
    fs.writeFileSync(brief, fixBrief(id, c.problems.length ? c.problems : c.ok ? [] : [c.tail], ad, {draft: k === 0 && (deps.draft ?? fs.existsSync(path.join(root, 'out/ci/writer-timeout.json'))), map: deps.shotMap ? deps.shotMap(id) : shotMap(id)}));
    say(`film gate: fix round ${k + 1} of ${rounds}`, env);
    // the writer's run of identical failures ended with its session; the fix round counts its own
    clearLoop(root, id);
    // the fix round's Stop hook (tools/ci/stopcheck.mjs) knows the film by this id
    if (fix(brief, {...env, STUDIO_FIX_ID: id, STUDIO_FIX_MIN: env.STUDIO_FIX_MIN || '36'}) !== 0) {
      say('film gate: the fix round did not finish', env);
      // soft: what the round left is checked once more; a clean check goes on (the art director's word is a warning)
      if (soft) {
        k = Math.max(k, rounds - 1);
        continue;
      }
      break;
    }
  }
  if (!deps.runCheck) writeLog(log);
  console.log(`::error::FILM_GATE the film did not pass the gate (the check's problems or the art director's FAIL above): it is not voiced, rendered or published`);
  return 1;
};

const writeLog = (log) => {
  try {
    fs.mkdirSync(path.join(root, 'out/ci'), {recursive: true});
    fs.writeFileSync(path.join(root, 'out/ci/filmgate.json'), `${JSON.stringify(log)}\n`);
  } catch {}
};

const selfTest = async () => {
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
  ok(/specs\/v136-x\.json/.test(b) && /EMPTY_P2 21\.6/.test(b) && /shot 3: Move the head/.test(b) && !/\u0007/.test(b) && /FAIL 4\/12 \(legible \?, .*\), hard rows under 1: whole/.test(b), 'the fix brief: the lines in full, the art director clean');
  {
    const fr = (v) => fixRounds(v === undefined ? {} : {STUDIO_FIX_ROUNDS: v});
    const D = FIX_ROUNDS_DEFAULT;
    const want = [[undefined, D], ['', D], [' ', D], ['\n', D], ['0', 0], ['1', 1], ['2', 2], [' 2 ', 2], ['3', D], ['9', D], ['-1', D], ['1.5', D], ['abc', D], ['0x1', D], ['1e0', D], [null, D]];
    const off = want.filter(([v, n]) => fr(v) !== n).map(([v, n]) => `${JSON.stringify(v)} gave ${fr(v)}, not ${n}`);
    ok(D === 2 && !off.length, `the fix rounds knob: unset, "" and blank give ${D}; "0" 0; "1" 1; "2" 2; garbage ${D}${off.length ? ` (${off.join('; ')})` : ''}`);
  }
  ok(!p2On('v120-old') && p2On('v136-x'), 'only a phase-2 film is gated here');
  ok(!('CLAUDE_CODE_OAUTH_TOKEN' in checkEnv({CLAUDE_CODE_OAUTH_TOKEN: 't', A: '1'})) && checkEnv({}).VS_CI === '1', "the check never gets the owner's Claude token");
  ok(/node tools\/check\.mjs v136-x --lint/.test(b) && /ONE reply/.test(b) && /never cd, a pipe, timeout/.test(b), 'the fix brief (r3-cost): every fix in one reply, --lint first, no refused Bash');
  ok(/RAN OUT OF TIME/.test(fixBrief('v1-x', ['TEXT_CLASH 1.0-2.0 s'], null, {draft: true})) && !/RAN OUT OF TIME/.test(fixBrief('v1-x', [], null)), "a timed-out writer's draft: the fix brief says finish it, not start over");
  // the r1 car film (2026-10-27): the art director said "fix 6/12", every row 1, and the gate let it through to the voice
  {
    const sc = (o) => ({legible: 2, oneHue: 2, whole: 2, explained: 2, fresh: 2, crafted: 2, ...o});
    const {verdictOf} = await import('./artdirector.mjs');
    const all1 = sc({legible: 1, oneHue: 1, whole: 1, explained: 1, fresh: 1, crafted: 1});
    ok(!gateHolds(verdictOf(all1), all1), 'a "fix" 6/12 is not enough for the voice');
    const edge = sc({crafted: 1});
    ok(verdictOf(edge).verdict === 'pass' && !gateHolds(verdictOf(edge), edge) && /crafted under 2/.test(gateWhy(verdictOf(edge), edge)), 'a pass with crafted at 1 sits on the edge: a fix round');
    ok(gateHolds(verdictOf(sc({fresh: 1, legible: 1})), sc({fresh: 1, legible: 1})), 'a pass 10/12 with the hard rows at 2 goes on');
    const run = async (looks, fixOk = true, extra = {}) => {
      const lines = [];
      const log0 = console.log;
      console.log = (x) => lines.push(String(x));
      let n = 0;
      let fixes = 0;
      let brief = '';
      let rc;
      try {
        rc = await pre('v999-gate-selftest', {RUNNER_TEMP: path.join(root, 'out/ci/selftest'), ...extra}, {
          p2On: () => true,
          runCheck: () => ({ok: true, quota: false, problems: [], status: 0, tail: 'ready to render'}),
          assess: async () => {
            const scores = looks[Math.min(n++, looks.length - 1)];
            return {v: verdictOf(scores), out: {scores, fixes: [{shot: 4, what: 'Replace the drawn belt diagram with a photo of a buckle and an Ink circle.'}]}, usd: 0.02};
          },
          shotMap: () => ['shot 1 = beats[0] FilmTitleCard, 0-2 s', 'shot 2 = beats[1] ScreenFocus, 2-4 s', 'shot 3 = beats[2] TapTrail, 4-7 s', 'shot 4 = beats[3] Film, 7-9 s'],
          runFix: (b) => {
            fixes++;
            brief = fs.readFileSync(b, 'utf8');
            return fixOk ? 0 : 1;
          },
        });
      } finally {
        console.log = log0;
      }
      return {rc, lines, fixes, brief};
    };
    const r1 = await run([all1, sc({})]);
    ok(r1.rc === 0 && r1.fixes === 1 && r1.lines.some((l) => /fix round 1 of 2/.test(l)) && r1.lines.some((l) => /passed after 1 fix round/.test(l)), 'a "fix" 6/12 before the voice: fix round 1 of 2, then it passes');
    ok(r1.lines.some((l) => /^ {2}shot 4: Replace the drawn belt/.test(l)), "the art director's fixes are in the step log as 'shot N: what'");
    ok(/shot 4 \(beats\[3\] Film, 7-9 s\): Replace the drawn belt/.test(r1.brief) && /REPLACED, not polished/.test(r1.brief) && /crafted 1/.test(r1.brief), 'the fix brief carries its fixes (with the shot\'s beat) and the crafted rule');
    ok(/half-empty Versus/.test(r1.brief) && /exactly twice/.test(r1.brief) && /whole in the frame/.test(r1.brief), 'the fix brief repeats the craft faults that come back (cropped, empty, off-centre, not proportional)');
    {
      const dir = path.join(root, 'out/ci/selftest-map');
      fs.mkdirSync(dir, {recursive: true});
      fs.writeFileSync(path.join(dir, 'v999-x.shots.json'), JSON.stringify([{shot: 1, type: 'FreezeTag', beat: 0, cut: null, from: 0, to: 1.5}, {shot: 2, type: 'Photo', beat: 0, cut: 2, from: 1.5, to: 3}]));
      const m = shotMap('v999-x', dir);
      ok(m.length === 2 && m[1] === 'shot 2 = beats[0] (its cut at chunk 2) Photo, 1.5-3 s' && shotMap('v999-none', dir).length === 0, `the sheet's shot map (${m.join(' | ')})`);
      fs.rmSync(dir, {recursive: true, force: true});
    }
    const r2 = await run([all1, all1, all1]);
    ok(r2.rc === 1 && r2.fixes === 2 && r2.lines.some((l) => /fix round 2 of 2/.test(l)) && r2.lines.some((l) => /FILM_GATE/.test(l)), 'still "fix" after both rounds: the film stops before the voice');
    const r4 = await run([all1, all1, sc({})]);
    ok(r4.rc === 0 && r4.fixes === 2 && r4.lines.some((l) => /passed after 2 fix rounds/.test(l)), 'the second round can still carry it to the voice');
    ok(/REWRITE round/.test(r1.brief) && /replace a shot's scene type/.test(r1.brief) && /legible: every caption/.test(r1.brief), 'the fix brief lets the round change scene types and names every row as a task (the r3x round-2 panel)');
    const r3 = await run([sc({})]);
    ok(r3.rc === 0 && r3.fixes === 0 && r3.lines.some((l) => /passed$/.test(l)), 'a clean pass needs no fix round');
    // the soft gate (STUDIO_GATE_MODE=soft, 2026-10-28): the art director's word buys one round, then a warning
    const SOFT = {STUDIO_GATE_MODE: 'soft', STUDIO_FIX_ROUNDS: '2'};
    const s1 = await run([all1, all1, all1], true, SOFT);
    ok(s1.rc === 0 && s1.fixes === 1 && s1.lines.some((l) => /FILM_GATE_SOFT/.test(l)) && !s1.lines.some((l) => /::error::FILM_GATE/.test(l)), 'soft: still "fix" after one round: it goes on with a warning (one round, not two)');
    const s2 = await run([all1, all1], false, {STUDIO_GATE_MODE: 'soft', STUDIO_FIX_ROUNDS: '1'});
    ok(s2.rc === 0 && s2.fixes === 1 && s2.lines.some((l) => /did not finish/.test(l)) && s2.lines.some((l) => /FILM_GATE_SOFT/.test(l)), 'soft: a fix round that did not finish, a clean check: it goes on');
    const s3 = await run([all1], true, {STUDIO_GATE_MODE: 'soft', STUDIO_FIX_ROUNDS: '0'});
    ok(s3.rc === 0 && s3.fixes === 0, 'soft with no fix rounds: a warning at once');
    const s4 = await run([sc({})], true, SOFT);
    ok(s4.rc === 0 && s4.fixes === 0 && s4.lines.some((l) => /passed$/.test(l)) && !s4.lines.some((l) => /SOFT/.test(l)), 'soft: a clean pass is a plain pass');
    fs.rmSync(path.join(root, 'out/ci/selftest'), {recursive: true, force: true});
  }
  console.log(bad ? `filmgate: ${bad} failed` : 'filmgate: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  const [cmd, id] = process.argv.slice(2);
  if (cmd === '--test') process.exit(await selfTest());
  if (cmd === 'pre') process.exit(await pre(id));
  console.log('usage: node tools/ci/filmgate.mjs pre <id> | --test');
  process.exit(2);
}
