// `npm run p2:test`: every phase-2 self-test (src/lib/p2.mjs; the plan's ground rule: no step is done while this fails), then
// the spec lint on the fixtures in ci/fixtures/p2/ (each fixture names the codes it must raise: "expect": [] passes clean).
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const TESTS = [
  ['node', 'src/lib/p2.mjs', '--test'],
  ['node', 'src/lib/ink.mjs', '--test'],
  ['node', 'tools/ci/textfit.mjs', '--test'],
  ['python3', 'tools/ci/p2pixels.py', '--test'],
];
const extra = (f, cmd = 'node') => (fs.existsSync(path.join(root, f)) ? [[cmd, f, '--test']] : []);
const ALL = [
  ...TESTS,
  ...extra('src/lib/physics.mjs'),
  ...extra('tools/ci/physlint.mjs'),
  ...extra('src/lib/retired.mjs'),
  ...extra('src/lib/r3.mjs'),
  ...extra('src/lib/gltrans.mjs'),
  ...extra('tools/ci/glprobe.py', 'python3'),
  ...extra('tools/ci/p2lint.mjs'),
  ...extra('tools/ci/ending.mjs'),
  ...extra('tools/ci/humor.mjs'),
  ...extra('tools/ci/streetwords.mjs'),
  ...extra('tools/ci/news.mjs'),
  ...extra('tools/ci/stories.mjs'),
  ...extra('tools/ci/photoledger.mjs'),
  ...extra('tools/ci/director.mjs'),
  ...extra('tools/ci/artdirector.mjs'),
  ...extra('tools/ci/prompt.mjs'),
  ...extra('tools/ci/claude-run.mjs'),
  ...extra('tools/ci/treatment.mjs'),
  ...extra('tools/ci/filmlint.mjs'),
  ...extra('tools/ci/slides.mjs'),
  ...extra('tools/ci/screentext.mjs'),
  ...extra('tools/ci/fx.mjs'),
  ...extra('tools/ci/banks/common.mjs'),
  ...extra('tools/ci/banks/news.mjs'),
  ...extra('tools/ci/banks/humour.mjs'),
  ...extra('tools/ci/banks/stories.mjs'),
  ...extra('tools/ci/banks/photos.mjs'),
  ...extra('tools/ci/banks/stage.mjs'),
  ...extra('tools/ci/spend.mjs'),
  ...extra('tools/ci/capcount.mjs'),
  ...extra('tools/ci/guards.mjs'),
  ...extra('tools/ci/filmgate.mjs'),
  ...extra('tools/ci/checkstamp.mjs'),
  ...extra('tools/ci/stopcheck.mjs'),
  ...extra('tools/ci/judge.mjs'),
  ...extra('tools/ci/keyframes.py', 'python3'),
  ...extra('tools/ci/rejected.mjs'),
  ...extra('tools/ci/publish.mjs'),
  ...extra('src/lib/roll.mjs'),
  ...extra('tools/ci/adsheet.py', 'python3'),
  ...extra('tools/ci/rules.mjs'),
  ...extra('tools/ci/catalog.mjs'),
  ...extra('tools/ci/checklint.mjs'),
  ...extra('tools/vo_test.py', 'python3').map(() => ['python3', 'tools/vo_test.py']),
];
let failed = 0;
for (const [cmd, ...args] of ALL) {
  const name = args.join(' ');
  try {
    const out = execFileSync(cmd, args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], env: {...process.env, NODE_NO_WARNINGS: '1'}});
    const last = out.trim().split('\n').pop();
    console.log(`ok   ${name}: ${last}`);
  } catch (e) {
    failed++;
    console.log(`FAIL ${name}\n${String(e.stdout ?? '').split('\n').filter((l) => /FAIL|Error|error/.test(l)).slice(0, 12).join('\n')}\n${String(e.stderr ?? '').slice(0, 800)}`);
  }
}
console.log(failed ? `p2:test: ${failed} failed` : 'p2:test: all ok');
process.exit(failed ? 1 : 0);
