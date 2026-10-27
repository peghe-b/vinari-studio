// The collected check, measured and tested (r3-cost, 2026-10-27). tools/check.mjs used to stop at the FIRST rule family that
// failed before the voice; a phase-2 film now goes through all of them and stops once, and `--lint` runs that part with the
// build-index lint and the studio's own rules in seconds. This replays the P2 fixtures of ci/fixtures/p2/ (the prove runs'
// real faulty films) through both, as the cloud check sees them (VS_CI=1), and counts what a writer learns from one run:
//
//   node tools/ci/checklint.mjs          the measure: for each fixture, the families one --lint lists against the one the old
//                                        stop showed (each further family cost the writer another check run and edit round)
//   node tools/ci/checklint.mjs --test   the self-test (npm run p2:test)
//
// Nothing is voiced: the old-stop run happens only on a fixture whose lint found a family before the voice (so it stops there
// too), with no Gemini key, VO_NO_EDGE=1 and a voice cache of its own. Every file it puts in place (the fixture's spec and Film
// files, out/ci/request.json, the check's stamp) is put back as it was.
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {p2On} from '../../src/lib/p2.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../..');
const FIX = path.join(root, 'ci/fixtures/p2');

/** what one run says: {status, ms, families, problems, lintClean, voiced, last} */
export const readRun = (r, ms) => {
  const out = String(r.stdout ?? '');
  return {
    status: r.status,
    ms,
    families: Number(/(\d+) rule famil(?:y|ies) before the voice/.exec(out)?.[1] ?? 0),
    problems: out.split('\n').filter((l) => /^\s*PROBLEM /.test(l)).length,
    lintClean: /\nlint clean: /.test(out),
    voiced: /^ {2}voice {3}/m.test(out),
    last: out.trim().split('\n').pop() ?? '',
  };
};

/** put a fixture in place, run fn(id), put everything back; {timelineBeats: n} also puts a voiced timeline of n beats in
 *  public/vo/<id>/ (where build-index reads it), as a full check that voiced the film before a shot was cut leaves it */
const withFixture = (fx, fn, {timelineBeats = null} = {}) => {
  const spec = fx.spec;
  const id = spec.id;
  const placed = [];
  const restore = [];
  const put = (file, text) => {
    if (fs.existsSync(file)) return false;
    fs.mkdirSync(path.dirname(file), {recursive: true});
    fs.writeFileSync(file, text);
    placed.push(file);
    return true;
  };
  const keep = (file) => {
    restore.push([file, fs.existsSync(file) ? fs.readFileSync(file) : null]);
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'checklint-'));
  try {
    if (!put(path.join(root, 'specs', `${id}.json`), `${JSON.stringify(spec, null, 1)}\n`)) return null;
    if (timelineBeats !== null) {
      const voDir = path.join(root, 'public/vo', id);
      if (fs.existsSync(voDir)) return null;
      placed.push(voDir);
      const beats = Array.from({length: timelineBeats}, (_, i) => ({start: i * 2, end: i * 2 + 2, words: []}));
      fs.mkdirSync(voDir, {recursive: true});
      fs.writeFileSync(path.join(voDir, 'timeline.json'), `${JSON.stringify({duration: timelineBeats * 2, voice: 'gemini:Algieba', beats})}\n`);
    }
    for (const [name, code] of Object.entries(fx.films ?? {})) put(path.join(root, 'src/scenes/film', `${name}.tsx`), String(code));
    const req = path.join(root, 'out/ci/request.json');
    const stamp = path.join(root, 'out/ci', `check-${id}.json`);
    keep(req);
    keep(stamp);
    fs.mkdirSync(path.dirname(req), {recursive: true});
    fs.writeFileSync(req, `${JSON.stringify({req: 'r-cltest-0001', mode: 'film', category: spec.category ?? null, length: Number(fx.length ?? spec.length ?? 45) || 45, voiceId: spec.voice ?? null, base: null, store: null})}\n`);
    const ledger = path.join(tmp, 'studio.json');
    fs.writeFileSync(ledger, '{}\n');
    const env = {...process.env, VS_CI: '1', VS_LOCKED: '1', STUDIO_LEDGER: ledger, GEMINI_API_KEY: '', VO_NO_EDGE: '1', VO_CACHE: path.join(tmp, 'vo'), VO_OUT: path.join(tmp, 'vo-out'), NODE_NO_WARNINGS: '1'};
    return fn(id, env, stamp);
  } finally {
    for (const f of placed) fs.rmSync(f, {recursive: true, force: true});
    for (const [f, buf] of restore) (buf === null ? fs.rmSync(f, {force: true}) : fs.writeFileSync(f, buf));
    fs.rmSync(tmp, {recursive: true, force: true});
  }
};

const run = (args, env) => {
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), ...args], {cwd: root, env, encoding: 'utf8', maxBuffer: 32 << 20, timeout: 120e3});
  return readRun(r, Date.now() - t0);
};

/** every P2 replay fixture: the lint, and the old first-family stop when the lint found a family before the voice */
export const measure = ({old = true} = {}) => {
  const rows = [];
  for (const f of fs.readdirSync(FIX).filter((x) => /^replay-.*\.json$/.test(x)).sort()) {
    const fx = JSON.parse(fs.readFileSync(path.join(FIX, f), 'utf8'));
    if (!fx.spec?.id || !p2On(fx.spec.id)) continue;
    const row = withFixture(fx, (id, env, stamp) => {
      const lint = run([id, '--lint'], env);
      const stampAfterLint = fs.existsSync(stamp);
      const first = old && lint.families > 0 ? run([id], {...env, VS_CHECK_FAILFAST: '1'}) : null;
      return {fixture: f, id, lint, first, stampAfterLint};
    });
    if (row) rows.push(row);
  }
  return rows;
};

const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  ok(readRun({status: 1, stdout: 'x\n  PROBLEM A_B 1\n  PROBLEM C_D 2\n\nNOT READY (lint): 2 rule families before the voice (2 lines above): fix them'}, 5).families === 2, 'readRun: the families');
  ok(readRun({status: 0, stdout: '  voice   ok\n\nlint clean: now'}, 5).lintClean && readRun({status: 0, stdout: '  voice   ok'}, 5).voiced, 'readRun: clean, voiced');
  const before = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'specs', 'src/scenes/film'], {cwd: root, encoding: 'utf8'}).stdout;
  const rows = measure();
  ok(rows.length >= 3, `the P2 replay fixtures ran (${rows.length})`);
  let many = 0;
  for (const r of rows) {
    ok(!r.lint.voiced && r.lint.ms < 60e3, `${r.fixture}: --lint voices nothing and takes seconds (${r.lint.ms} ms)`);
    ok(r.lint.status === 1 && !r.lint.lintClean && r.lint.problems >= Math.max(1, r.lint.families), `${r.fixture}: a faulty replay film fails the lint with its PROBLEM lines (${r.lint.status}, ${r.lint.problems} lines, ${r.lint.families} families)`);
    ok(!r.stampAfterLint, `${r.fixture}: --lint writes no stamp (only a full check does)`);
    if (r.first) {
      ok(!r.first.voiced && r.first.families === 0 && /^NOT READY: /.test(r.first.last), `${r.fixture}: the old first-family stop still stops before the voice (${r.first.last.slice(0, 80)})`);
      if (r.lint.families >= 2) many++;
    }
  }
  ok(many >= 1, `at least one replay film has two or more rule families that the old stop showed one run at a time (${many})`);
  // a voiced film that then lost a beat (a shot cut after a full check, as the brief and the fix brief allow): build-index
  // prints "skip <id>: spec has N beats, timeline M"; --lint never voices, so that is a note there, never a PROBLEM that only
  // tools/vo.py could clear. The same film lints to exactly the problems it has with no voice at all.
  {
    const fx = JSON.parse(fs.readFileSync(path.join(FIX, 'replay-v136-winter-digit.json'), 'utf8'));
    const n = fx.spec.beats.length;
    const plain = withFixture(fx, (id, env) => spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), id, '--lint'], {cwd: root, env, encoding: 'utf8', maxBuffer: 32 << 20, timeout: 120e3}));
    for (const beats of [n - 1, n + 1]) {
      const r = withFixture(fx, (id, env) => spawnSync(process.execPath, [path.join(root, 'tools/check.mjs'), id, '--lint'], {cwd: root, env, encoding: 'utf8', maxBuffer: 32 << 20, timeout: 120e3}), {timelineBeats: beats});
      const out = String(r?.stdout ?? '');
      const probs = (o) => String(o ?? '').split('\n').filter((l) => /^\s*PROBLEM /.test(l));
      ok(r && plain, `stale timeline (${beats} of ${n} beats): the fixture ran`);
      if (!r || !plain) continue;
      ok(!probs(out).some((l) => /PROBLEM skip |timeline/.test(l)), `stale timeline (${beats} of ${n} beats): --lint lists no "skip ... timeline" PROBLEM (${probs(out).filter((l) => /skip|timeline/.test(l)).join(' | ').slice(0, 160)})`);
      ok(new RegExp(`note\\s+skip ${fx.spec.id}: spec has ${n} beats, timeline ${beats}: .*voices the film again`).test(out), `stale timeline (${beats} of ${n} beats): --lint notes it (the full check voices again)`);
      ok(probs(out).length === probs(plain.stdout).length && r.status === plain.status, `stale timeline (${beats} of ${n} beats): the same problems as with no voice (${probs(out).length} vs ${probs(plain.stdout).length}, exit ${r.status} vs ${plain.status})`);
    }
    ok(!fs.existsSync(path.join(root, 'public/vo', fx.spec.id)), 'stale timeline: public/vo/<id> was put back');
  }
  // the full check keeps it an error (it voices first, so a mismatch there is a real fault)
  ok(/const stale = LINT \? mine\.filter\(staleVoice\) : \[\];/.test(fs.readFileSync(path.join(root, 'tools/check.mjs'), 'utf8')), 'check.mjs: only --lint turns the stale-timeline skip into a note');
  const after = spawnSync('git', ['status', '--porcelain', '--untracked-files=all', '--', 'specs', 'src/scenes/film'], {cwd: root, encoding: 'utf8'}).stdout;
  ok(before === after, 'every fixture file was put back');
  // an older film keeps the first-family stop (its check is as it was made); a phase-2 film collects
  const src = fs.readFileSync(path.join(root, 'tools/check.mjs'), 'utf8');
  ok(/let COLLECT = LINT;/.test(src) && /if \(p2On\(spec\.id\.replace\(\/-r\\d\+\$\/, ''\)\) && process\.env\.VS_CHECK_FAILFAST !== '1'\) COLLECT = true;/.test(src) && !p2On('v134-winter-battery') && p2On('v136-x'), 'check.mjs: collect for P2 films and --lint, the first-family stop for older ones');
  console.log(fails ? `checklint.mjs: ${fails} failed` : `checklint.mjs: all passed (${rows.length} replay films; ${rows.map((r) => `${r.id} ${r.lint.families}f/${r.lint.problems}p`).join(', ')})`);
  process.exit(fails ? 1 : 0);
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  if (process.argv[2] === '--test') selfTest();
  else {
    const rows = measure();
    for (const r of rows) {
      console.log(
        `${r.id.padEnd(24)} --lint: ${String(r.lint.families).padStart(2)} rule families, ${String(r.lint.problems).padStart(3)} problem lines in ${(r.lint.ms / 1000).toFixed(1)} s · old stop: ${r.first ? `1 family a run (${(r.first.ms / 1000).toFixed(1)} s)` : 'n/a'}`,
      );
    }
    const extra = rows.reduce((a, r) => a + Math.max(0, r.lint.families - 1), 0);
    console.log(`check runs (and edit rounds) the old stop needed to show the same: ${rows.reduce((a, r) => a + Math.max(1, r.lint.families), 0)}; with --lint: ${rows.length} (${extra} saved)`);
  }
}
