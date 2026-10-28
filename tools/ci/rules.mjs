// The slim CLAUDE.md's promise (plan step 2.5, 2026-10-26): the owner's hard rules stay ENFORCED by the linters while the
// file that every cloud run loads stays short. Its history moved to docs/; CLAUDE.md keeps each rule in one line and names
// the gate (a code such as `MYAUTO`, `TREATMENT`, `EDGE_CUT`) that enforces it.
//
//   node tools/ci/rules.mjs --test
//     - every gate code CLAUDE.md names (`UPPER_CASE` in backticks) is still emitted by a tool (tools/, src/lib/): a linter
//       removed or renamed without updating the rule fails here
//     - every file CLAUDE.md's map names exists, and every docs/*.md is on the map
//     - the rules are numbered 1..n without a gap, and CLAUDE.md stays within MAX_BYTES (the cloud context's budget: it
//       grows back into a history book otherwise; history goes to docs/)
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const MAX_BYTES = 16 * 1024;

/** Every file under dir (recursively) whose name matches re. */
const files = (dir, re, out = []) => {
  let list = [];
  try {
    list = fs.readdirSync(dir, {withFileTypes: true});
  } catch {
    return out;
  }
  for (const e of list) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) files(p, re, out);
    else if (re.test(e.name)) out.push(p);
  }
  return out;
};

/** The gate codes CLAUDE.md names, and the ones no tool emits any more. */
export const gateCheck = (text = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8')) => {
  const codes = [...new Set([...text.matchAll(/`([A-Z][A-Z0-9]*(?:_[A-Z0-9]+)+|[A-Z]{3,})`/g)].map((m) => m[1]))];
  const self = fileURLToPath(import.meta.url);
  const code = [...files(path.join(root, 'tools'), /\.(mjs|js|py|sh)$/), ...files(path.join(root, 'src', 'lib'), /\.(mjs|ts|tsx)$/)]
    .filter((f) => f !== self)
    .map((f) => fs.readFileSync(f, 'utf8'))
    .join('\n');
  const missing = codes.filter((c) => !new RegExp(`(?<![A-Za-z0-9_])${c}(?![A-Za-z0-9_])`).test(code));
  return {codes, missing};
};

const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const text = fs.readFileSync(path.join(root, 'CLAUDE.md'), 'utf8');
  const {codes, missing} = gateCheck(text);
  ok(codes.length >= 30, `CLAUDE.md names the gates that enforce its rules (${codes.length})`);
  ok(!missing.length, `every gate it names is still in a tool (${missing.length ? `gone: ${missing.join(', ')}` : 'all there'})`);
  ok(gateCheck('`NO_SUCH_GATE_EVER`').missing.length === 1, 'a gate no tool emits is caught');
  const named = [...new Set([...text.matchAll(/`((?:docs|ci|\.claude|src)\/[^`\s<>*]+\.(?:md|json|tsx?))`/g)].map((m) => m[1]))];
  const gone = named.filter((f) => !fs.existsSync(path.join(root, f)));
  ok(named.length >= 10 && !gone.length, `every file on the map exists (${gone.length ? `missing: ${gone.join(', ')}` : `${named.length}`})`);
  const docs = fs.existsSync(path.join(root, 'docs')) ? fs.readdirSync(path.join(root, 'docs')).filter((f) => f.endsWith('.md')) : [];
  const off = docs.filter((f) => !text.includes(`docs/${f}`));
  ok(docs.length > 0 && !off.length, `every docs/ file is on the map (${off.length ? `not: ${off.join(', ')}` : docs.length})`);
  const rules = text.split('## The owner')[1]?.split('\n## ')[0] ?? '';
  const nums = [...rules.matchAll(/^(\d+)\. \*\*/gm)].map((m) => Number(m[1]));
  ok(nums.length >= 29 && nums.every((n, i) => n === i + 1), `the rules are numbered 1..${nums.length} without a gap`);
  const size = Buffer.byteLength(text);
  ok(size <= MAX_BYTES, `CLAUDE.md is ${(size / 1024).toFixed(1)} KB (at most ${MAX_BYTES / 1024}: history goes to docs/)`);
  console.log(bad ? `rules: ${bad} failed` : 'rules: all ok');
  return bad ? 1 : 0;
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  if (process.argv[2] === '--test') process.exit(selfTest());
  const {codes, missing} = gateCheck();
  console.log(`CLAUDE.md names ${codes.length} gates${missing.length ? `; no tool emits ${missing.join(', ')}` : ', every one in a tool'}`);
  process.exit(missing.length ? 1 : 0);
}
