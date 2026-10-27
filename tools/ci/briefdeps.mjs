// The brief's import guard (2026-10-27, r3x round 1). The studio's "brief" step runs tools/ci/prompt.mjs right after
// checkout, BEFORE "setup" runs npm ci (studio.yml: a request the pre-gate turns down ends before anything is installed).
// So nothing prompt.mjs reaches may import an npm package. Round 1 broke that: catalog.mjs -> physlint.mjs ->
// src/lib/physics.mjs -> matter-js, and all three films died in the brief with a Node stack trace, while p2-check stayed
// green because it runs after npm ci. This walks the static import graph (import/export ... from '...', import '...',
// and a literal import('...') at the top level of a module) from the entry files and refuses any specifier that is not
// relative and not a Node built-in, with one line naming the package and the chain that reaches it.
//
//   node tools/ci/briefdeps.mjs [entry ...]   default tools/ci/prompt.mjs; exit 0 clean, 1 with one ::error:: line each
//   node tools/ci/briefdeps.mjs --test        the self-test
//
// It imports nothing but node: modules itself (it runs in the brief step before prompt.mjs, and in p2-check before
// npm ci). A dynamic import inside a function (a self-test's lazy import) is not followed: it never runs in the brief.
import fs from 'node:fs';
import {builtinModules} from 'node:module';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const BUILTIN = new Set(builtinModules);

/** a module's source without comments and string contents that could fake an import (template literals kept simple) */
const stripComments = (src) => src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, '$1');

/** the specifiers a module loads when it is imported: static imports/re-exports, and a literal import() at column 0
 *  (a top-level await import); [{spec, line}] */
export const specifiersOf = (src) => {
  const s = stripComments(src);
  const out = [];
  const lineOf = (i) => s.slice(0, i).split('\n').length;
  const re = [
    /(?:^|[\n;])\s*import\s+(?:[\w*$\s{},]+?\s+from\s+)?['"]([^'"]+)['"]/g,
    /(?:^|[\n;])\s*export\s+(?:\*(?:\s+as\s+[\w$]+)?|\{[^}]*\})\s+from\s+['"]([^'"]+)['"]/g,
    /(?:^|\n)(?:(?:export\s+)?(?:const|let|var)\s+[^=\n]+=\s*)?await\s+import\(\s*['"]([^'"]+)['"]\s*\)/g,
  ];
  for (const r of re) for (const m of s.matchAll(r)) out.push({spec: m[1], line: lineOf(m.index + m[0].length)});
  return out;
};

const isBuiltin = (spec) => spec.startsWith('node:') || BUILTIN.has(spec) || BUILTIN.has(spec.split('/')[0]);
const pkgName = (spec) => (spec.startsWith('@') ? spec.split('/').slice(0, 2).join('/') : spec.split('/')[0]);

/** walk from the entries: {files, problems: [{pkg, spec, file, line, chain}]} (paths relative to base) */
export const walk = (entries, base = root) => {
  const seen = new Map();
  const problems = [];
  const queue = entries.map((e) => ({file: path.resolve(base, e), chain: [path.resolve(base, e)]}));
  while (queue.length) {
    const {file, chain} = queue.shift();
    if (seen.has(file)) continue;
    seen.set(file, chain);
    let src;
    try {
      src = fs.readFileSync(file, 'utf8');
    } catch {
      problems.push({pkg: null, spec: path.relative(base, file), file: path.relative(base, chain.at(-2) ?? file), line: 0, chain: chain.map((c) => path.relative(base, c)), missing: true});
      continue;
    }
    for (const {spec, line} of specifiersOf(src)) {
      if (spec.startsWith('.') || spec.startsWith('/')) {
        const next = path.resolve(path.dirname(file), spec);
        if (!seen.has(next)) queue.push({file: next, chain: [...chain, next]});
      } else if (!isBuiltin(spec)) {
        problems.push({pkg: pkgName(spec), spec, file: path.relative(base, file), line, chain: chain.map((c) => path.relative(base, c))});
      }
    }
  }
  return {files: [...seen.keys()].map((f) => path.relative(base, f)), problems};
};

export const problemLine = (p) =>
  p.missing
    ? `brief imports a file that is not in the repo: ${p.spec} (via ${p.chain.join(' > ')})`
    : `brief imports an npm package before install: ${p.pkg} via ${p.file}:${p.line} (${p.chain.join(' > ')})`;

const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'briefdeps-'));
  const w = (f, s) => {
    fs.mkdirSync(path.dirname(path.join(dir, f)), {recursive: true});
    fs.writeFileSync(path.join(dir, f), s);
  };
  try {
    // the round-1 chain, in miniature
    w('tools/ci/prompt.mjs', "import fs from 'node:fs';\nimport {writeCatalog} from './catalog.mjs';\n");
    w('tools/ci/catalog.mjs', "import path from 'path';\nimport {PHYS_SCENES} from './physlint.mjs';\n");
    w('tools/ci/physlint.mjs', "import {jarLayout} from '../../src/lib/physics.mjs';\nexport const PHYS_SCENES = new Set();\n");
    w('src/lib/physics.mjs', "// import x from 'not-this'\n/* import y from 'nor-this' */\nimport Matter from 'matter-js';\nexport const jarLayout = 1;\n");
    let r = walk(['tools/ci/prompt.mjs'], dir);
    ok(r.problems.length === 1 && r.problems[0].pkg === 'matter-js', `the round-1 chain is caught once: ${JSON.stringify(r.problems)}`);
    ok(r.problems[0]?.line === 3 && r.problems[0]?.file === 'src/lib/physics.mjs', `the line is named: ${JSON.stringify(r.problems[0])}`);
    ok(problemLine(r.problems[0]).includes('tools/ci/prompt.mjs > tools/ci/catalog.mjs > tools/ci/physlint.mjs > src/lib/physics.mjs'), `the chain is spelled out: ${problemLine(r.problems[0])}`);
    // the fix: the names in a module with no imports
    w('src/lib/physnames.mjs', 'export const PHYS_SCENES = new Set();\n');
    w('tools/ci/catalog.mjs', "import {PHYS_SCENES} from '../../src/lib/physnames.mjs';\n");
    r = walk(['tools/ci/prompt.mjs'], dir);
    ok(r.problems.length === 0 && r.files.includes('src/lib/physnames.mjs') && !r.files.includes('src/lib/physics.mjs'), `the fix is clean: ${JSON.stringify(r)}`);
    // the forms an import takes
    const forms = [
      ["import '@scope/pkg/sub';", '@scope/pkg'],
      ["import * as Z from 'zod';", 'zod'],
      ["import Def, {a, b as c} from 'pkg-a';", 'pkg-a'],
      ["import {\n  a,\n  b,\n} from 'pkg-b';", 'pkg-b'],
      ["export {x} from 'pkg-c';", 'pkg-c'],
      ["export * from 'pkg-d';", 'pkg-d'],
      ["const M = await import('pkg-e');", 'pkg-e'],
    ];
    for (const [src, pkg] of forms) {
      w('f/entry.mjs', `${src}\n`);
      const p = walk(['f/entry.mjs'], dir).problems;
      ok(p.length === 1 && p[0].pkg === pkg, `${JSON.stringify(src)} -> ${pkg}: ${JSON.stringify(p)}`);
    }
    // not followed: built-ins, a lazy import in a function, words in strings and comments
    w('f/entry.mjs', "import fs from 'fs';\nimport cp from 'node:child_process';\nimport {x} from 'fs/promises';\nconst lazy = async () => (await import('matter-js')).default;\nconst s = 'import y from \"zod\"';\n// import z from 'zod'\n");
    ok(walk(['f/entry.mjs'], dir).problems.length === 0, `built-ins, a lazy import and comments pass: ${JSON.stringify(walk(['f/entry.mjs'], dir).problems)}`);
    // a relative import of a file that is not there
    w('f/entry.mjs', "import {a} from './gone.mjs';\n");
    r = walk(['f/entry.mjs'], dir);
    ok(r.problems.length === 1 && r.problems[0].missing && problemLine(r.problems[0]).includes('f/gone.mjs'), `a missing file is named: ${JSON.stringify(r.problems)}`);
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  // the real brief, today
  const real = walk(['tools/ci/prompt.mjs']);
  ok(real.problems.length === 0, `the repo's brief imports no npm package: ${real.problems.map(problemLine).join(' | ')}`);
  ok(real.files.includes('tools/ci/catalog.mjs'), `the walk reaches catalog.mjs (${real.files.length} files)`);
  if (fails) {
    console.error(`briefdeps: ${fails} failed`);
    process.exit(1);
  }
  console.log(`briefdeps: ok (the brief reaches ${real.files.length} files, no npm package)`);
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  if (args[0] === '--test') selfTest();
  else {
    const {files, problems} = walk(args.length ? args : ['tools/ci/prompt.mjs']);
    for (const p of problems) console.log(`::error::${problemLine(p)}`);
    if (problems.length) process.exit(1);
    console.log(`briefdeps: the brief reaches ${files.length} files, no npm package`);
  }
}
