// The daily cap's counting filter (phase 2, plan step 15): studio.yml "check request" counts today's films with one jq
// filter; this test runs THE SAME filter, read out of the workflow file, on a fixture, so an internal run (a req r-pwr*,
// r-pwr2-*, r-li*, or a meta with "test" / "internal") can never count toward the co-founder's daily cap again.
//   node tools/ci/capcount.mjs --test      (needs jq, as the runner has)
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/** the filter as jq receives it: the text between --jq " and the closing quote, unescaped from the bash double quotes */
export const filterOf = (yml = fs.readFileSync(path.join(root, '.github/workflows/studio.yml'), 'utf8')) => {
  const m = /--jq "(\.workflow_runs\[\][\s\S]*?else \\"film\\" end)"/.exec(yml);
  if (!m) throw new Error('studio.yml: the counting filter was not found');
  return m[1].replace(/\\"/g, '"').replace(/\\\$/g, '$').replace(/\$GITHUB_RUN_ID/g, '999999');
};
const run = (id, title) => ({id, display_title: title});
export const FIXTURE = {
  workflow_runs: [
    run(1, 'studio r-mvx1abcd-aaaa'),
    run(2, 'studio r-mvx2abcd-bbbb'),
    run(3, 'studio r-mvx3abcd-cccc {"k":"f"}'),
    run(4, 'studio r-mvx4abcd-dddd'),
    run(5, 'studio r-mvx5abcd-eeee'),
    run(6, 'studio r-pwr2te-0001'),
    run(7, 'studio r-pwr2te-0002'),
    run(8, 'studio r-pwr2te-0003'),
    run(9, 'studio r-mvx9abcd-ffff {"test":true}'),
    run(10, 'studio r-mvxaabcd-gggg {"k":"s"}'),
  ],
};

const selfTest = () => {
  let bad = 0;
  const ok = (c, w) => {
    if (!c) bad++;
    console.log(`${c ? 'ok  ' : 'FAIL'} ${w}`);
  };
  const kinds = execFileSync('jq', ['-r', filterOf()], {input: JSON.stringify(FIXTURE), encoding: 'utf8'}).trim().split('\n');
  const n = (k) => kinds.filter((x) => x === k).length;
  ok(n('film') === 5, `5 public films count as 5 (got ${n('film')})`);
  ok(n('internal') === 4, `3 r-pwr2 runs and 1 meta test are internal (got ${n('internal')})`);
  ok(n('slides') === 1, 'a Story set counts as slides');
  console.log(bad ? `${bad} failed` : 'all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url) && process.argv[2] === '--test') process.exit(selfTest());
