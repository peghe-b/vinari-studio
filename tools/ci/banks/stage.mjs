// The banks job's staging step (banks.yml "commit"). It used to be one `git add a b c public/hero 2>/dev/null || true`:
// a path that does not exist (public/hero, unless the hero bank ran) makes git add refuse the WHOLE list, so nothing was
// staged and run 40424676292 said "nothing new", losing its verified news item and the spend lines ($5.33). Now each bank
// path that exists is added on its own, and bank files that changed but were not staged stop the step with an error.
//
//   node tools/ci/banks/stage.mjs          stage the bank files (exit 1 when a changed bank file was not staged)
//   node tools/ci/banks/stage.mjs --test   the self-test (a temp git repo)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../../..');

export const BANK_PATHS = ['ci/news-bank.json', 'ci/humour-bank.json', 'ci/stories-sources.json', 'ci/banks', 'public/photos', 'public/hero'];

const git = (cwd, ...args) => execFileSync('git', args, {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']});

/** -> {added: the paths that exist, changed: bank files git sees changed, staged: the staged files} */
export const stage = (cwd = root) => {
  const added = BANK_PATHS.filter((p) => fs.existsSync(path.join(cwd, p)));
  for (const p of added) git(cwd, 'add', '--', p);
  const changed = added.length ? git(cwd, 'status', '--porcelain', '--', ...added).split('\n').filter(Boolean) : [];
  const staged = git(cwd, 'diff', '--cached', '--name-only').split('\n').filter(Boolean);
  return {added, changed, staged};
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, what) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'banks-stage-'));
  try {
    git(tmp, 'init', '-q');
    git(tmp, 'config', 'user.email', 't@t');
    git(tmp, 'config', 'user.name', 't');
    fs.writeFileSync(path.join(tmp, 'README'), 'x');
    git(tmp, 'add', 'README');
    git(tmp, 'commit', '-q', '-m', 'init');
    // what run 40424676292 left: the news bank and the spend ledger, and no public/hero
    fs.mkdirSync(path.join(tmp, 'ci/banks'), {recursive: true});
    fs.writeFileSync(path.join(tmp, 'ci/news-bank.json'), '{"items":[{"id":"n1"}]}\n');
    fs.writeFileSync(path.join(tmp, 'ci/banks/spend.json'), '{"runs":[]}\n');
    // the old one-line add stages nothing (the bug, kept here so the test shows it)
    try {
      execFileSync('git', ['add', 'ci/news-bank.json', 'ci/humour-bank.json', 'ci/stories-sources.json', 'ci/banks', 'public/photos', 'public/hero'], {cwd: tmp, stdio: 'ignore'});
    } catch {}
    ok(git(tmp, 'diff', '--cached', '--name-only').trim() === '', 'the old one-line git add with a missing public/hero stages nothing');
    const r = stage(tmp);
    ok(r.staged.includes('ci/news-bank.json') && r.staged.includes('ci/banks/spend.json'), `stage: the news bank and the spend ledger are staged (${r.staged.join(', ')})`);
    ok(!r.added.includes('public/hero') && !r.added.includes('public/photos'), 'stage: a missing path is skipped, not fatal');
    ok(r.changed.length > 0, 'stage: the changed bank files are seen');
    git(tmp, 'commit', '-q', '-m', 'banks');
    const r2 = stage(tmp);
    ok(r2.staged.length === 0 && r2.changed.length === 0, 'stage: nothing new stages nothing');
  } catch (e) {
    ok(false, `the self-test ran: ${String(e?.message ?? e).split('\n')[0]}`);
  } finally {
    fs.rmSync(tmp, {recursive: true, force: true});
  }
  console.log(bad ? `banks/stage: ${bad} failed` : 'banks/stage: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  if (process.argv[2] === '--test') process.exit(selfTest());
  const r = stage(root);
  const unstaged = r.changed.filter((l) => !/^[AMDR]/.test(l));
  if (r.changed.length && !r.staged.length) {
    console.log(`::error::bank files changed but nothing was staged: ${r.changed.join('; ')}`);
    process.exit(1);
  }
  if (unstaged.length) console.log(`::warning::bank files not staged: ${unstaged.join('; ')}`);
  console.log(`banks: ${r.staged.length} file${r.staged.length === 1 ? '' : 's'} staged (${r.added.join(', ') || 'no bank path'})`);
}
