// The writer's reading, precomputed (r3-cost, 2026-10-27). The p2x writers spent 24-45 Reads and 11-31 Greps a film on the
// "Read only this" list: promo-dna.md, five to seven HOOKS.md ranges by offset, docs/scenes.md by Grep, and a scene's own
// file for every story-kit scene whose props docs/scenes.md leaves to "(their files)". Every one of those is a model round,
// and each round re-sends the whole context. tools/ci/prompt.mjs now writes the same text into two files, read in ONE reply:
//
//   out/ci/rules.now.md    ci/promo-dna.md whole and the HOOKS.md sections this film's brief names (the buddy tone, the
//                          rubric, the templates, the angle bank, and the story films / the lesson / H14 / the aura section
//                          when the brief has them), each under its own heading with its HOOKS.md line range
//   out/ci/scenes.now.md   the scene catalog: docs/scenes.md's Phase 2 section, then every scene a phase-2 film may use, its
//                          one-paragraph header and its props exactly as its file declares them (`type P` and the types it
//                          names), never a retired scene (src/lib/retired.mjs)
//
// Nothing is new or reworded: the files are cut from the sources, so a rule changed there changes here on the next brief. Each
// stays under READ_TOKENS (one Read; Claude Code's Read refuses a file over 25,000 tokens, and a refused Read costs rounds).
//
//   node tools/ci/catalog.mjs [--stories|--carinfo|--humor|--wild|--aura]   write both files, print their sizes
//   node tools/ci/catalog.mjs --test                                       the self-test
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {RETIRED_SCENES} from '../../src/lib/retired.mjs';
import {R3_SCENES} from '../../src/lib/r3.mjs';
import {PHYS_SCENES} from './physlint.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(self), '../..');
export const RULES_REL = 'out/ci/rules.now.md';
export const SCENES_REL = 'out/ci/scenes.now.md';
/** one Read's budget in tokens, under Claude Code's 25,000 with room for the tokenizer's spread on Georgian */
export const READ_TOKENS = 20000;

/** a cautious token estimate: ASCII at 3.2 characters a token, any other character (Georgian) a token of its own */
export const tokensOf = (text) => {
  let ascii = 0;
  let other = 0;
  for (const ch of String(text ?? '')) ch.charCodeAt(0) < 128 ? ascii++ : other++;
  return Math.ceil(ascii / 3.2 + other);
};

// ---- the rules: HOOKS.md sections by heading ------------------------------------------------------------------------
/** HOOKS.md's sections: [{line, level, head, end}] (line numbers 1-based, end inclusive) */
export const sectionsOf = (text) => {
  const lines = String(text).split('\n');
  const heads = lines.map((l, i) => [i + 1, /^(#{2,3}) /.exec(l)?.[1].length, l]).filter((h) => h[1]);
  return heads.map((h, k) => ({line: h[0], level: h[1], head: h[2], end: (heads.slice(k + 1).find((x) => x[1] <= h[1])?.[0] ?? lines.length + 1) - 1}));
};
/** the sections the brief names, by flag (prompt.mjs fills the same ranges into "Read only this") */
export const RULE_SECTIONS = [
  ['Buddy tone', /^## Buddy tone /, () => true],
  ['the rubric', /^## 2\. /, () => true],
  ['the length templates and closing lines', /^## 3\. /, () => true],
  ['the angle bank', /^## 5\. /, () => true],
  ['the story films', /^## Story films /, (f) => f.stories],
  ['the lesson', /^## The lesson /, (f) => f.carinfo],
  ['the playful hooks (H14)', /^### H14 /, (f) => f.wild],
  ['the aura truth table and ready openings', /^### Aura truth table /, (f) => f.aura],
];
export const rulesNow = (flags = {}, {hooks = fs.readFileSync(path.join(root, 'HOOKS.md'), 'utf8'), dna = fs.readFileSync(path.join(root, 'ci/promo-dna.md'), 'utf8')} = {}) => {
  const lines = hooks.split('\n');
  const secs = sectionsOf(hooks);
  const out = [
    '# The rules for this film (out/ci/rules.now.md: cut from ci/promo-dna.md and HOOKS.md by tools/ci/catalog.mjs; read it once, whole)',
    '',
    '## ci/promo-dna.md (whole)',
    '',
    dna.replace(/^# .*\n+/, '').trim(),
    '',
  ];
  for (const [label, re, on] of RULE_SECTIONS) {
    if (!on(flags)) continue;
    const s = secs.find((x) => re.test(x.head));
    if (!s) continue;
    out.push(`## HOOKS.md lines ${s.line}-${s.end}: ${label}`, '', ...lines.slice(s.line, s.end).join('\n').trim().split('\n'), '');
  }
  out.push('A hook formula\'s own section (H01 ... H22) is in HOOKS.md: Read it by the line range the brief gives, only for the formula you use.');
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
};

// ---- the scenes: each file's header and props ------------------------------------------------------------------------
/** the scenes a phase-2 film may use, by the brief's flags: the P2 kit and the story kit always, the category's own after */
export const KIT = ['FilmTitleCard', 'KeywordLift', 'Receipt', 'UnitGrid', 'ScaleReveal', 'RankShift', 'RouteTrace', 'WipeCompare', 'ScreenFocus', 'TapTrail', 'ScreenDeck', 'HeroObject', 'FreezeTag', 'IrisDetail', 'ShapeMatch', 'TypeDive'];
export const STORY_KIT = ['WhoCard', 'QuoteCard', 'Versus', 'Standings', 'Ledger', 'DocCard', 'LapDelta', 'StoryMap'];
export const LIBRARY = ['BigNumber', 'Stat', 'Compare', 'KineticHeadline', 'Twist', 'EndCard'];
export const BY_FLAG = [
  [(f) => f.stories, ['PhotoStory', 'Timeline']],
  [(f) => f.carinfo, ['Photo', 'Dashboard']],
  [(f) => f.humor, ['JamGrid', 'ShoutType', 'SideCar', 'NewsCard']],
  [(f) => !f.stories, ['PhoneDesk', 'Chat', 'Money']],
];
export const scenesFor = (flags = {}) => [...new Set([...KIT, ...R3_SCENES, ...PHYS_SCENES, ...STORY_KIT, ...LIBRARY, ...BY_FLAG.flatMap(([on, list]) => (on(flags) ? list : []))])].filter((n) => !(n in RETIRED_SCENES));

/** the balanced text of a `type X = {...};` (or a one-line `type X = ...;`) starting at index i */
const typeAt = (src, i) => {
  const eq = src.indexOf('=', i);
  let k = eq + 1;
  while (/\s/.test(src[k] ?? '')) k++;
  if (src[k] !== '{') return src.slice(i, src.indexOf(';', k) + 1);
  let depth = 0;
  for (let j = k; j < src.length; j++) {
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) {
      const semi = /^\s*;?/.exec(src.slice(j + 1))[0];
      return src.slice(i, j + 1 + semi.length);
    }
  }
  return src.slice(i);
};
/** a scene file's props: `type P` and the local types it names (transitively), in file order */
export const propsOf = (src) => {
  const decls = new Map();
  for (const m of src.matchAll(/^(?:export )?type ([A-Z][A-Za-z0-9]*)\b[^=\n]*=/gm)) decls.set(m[1], {at: m.index, text: typeAt(src, m.index).replace(/^export /, '')});
  const main = decls.has('P') ? 'P' : decls.has('Props') ? 'Props' : null;
  if (!main) return '';
  const want = new Set([main]);
  for (let grew = true; grew; ) {
    grew = false;
    for (const n of [...want]) {
      for (const [name] of decls) {
        if (!want.has(name) && new RegExp(`\\b${name}\\b`).test(decls.get(n).text)) {
          want.add(name);
          grew = true;
        }
      }
    }
  }
  return [...want].sort((a, b) => decls.get(a).at - decls.get(b).at).map((n) => decls.get(n).text).join('\n');
};
/** the comment right above `export const <Name>` (the scene's own description), or the file's first comment block */
export const headerOf = (src, name) => {
  const lines = src.split('\n');
  const at = lines.findIndex((l) => new RegExp(`^export (?:const|function) ${name}\\b`).test(l));
  const grab = (end) => {
    const out = [];
    for (let k = end; k >= 0 && /^\s*\/\//.test(lines[k]); k--) out.unshift(lines[k].replace(/^\s*\/\/ ?/, ''));
    return out;
  };
  let text = at > 0 ? grab(at - 1) : [];
  if (!text.length) {
    const first = lines.findIndex((l) => /^\/\//.test(l));
    if (first >= 0) {
      let end = first;
      while (end + 1 < lines.length && /^\/\//.test(lines[end + 1])) end++;
      text = grab(end);
    }
  }
  // one paragraph: a scene's history (the dated notes that follow) stays in its file
  return text.join(' ').replace(/\s+/g, ' ').trim().slice(0, 700);
};
export const scenesNow = (flags = {}, {dir = path.join(root, 'src/scenes'), doc = fs.readFileSync(path.join(root, 'docs/scenes.md'), 'utf8')} = {}) => {
  const p2 = /## Phase 2 kit[\s\S]*?(?=\n## |$)/.exec(doc)?.[0]?.trim() ?? '';
  const out = [
    '# The scenes for this film (out/ci/scenes.now.md: cut from docs/scenes.md and each scene\'s own file by tools/ci/catalog.mjs; read it once, whole)',
    '',
    'Every scene a phase-2 film may use, with its props exactly as its file declares them (`?` optional; a `/** ... */` line says what a prop does). A retired scene is not here (src/lib/retired.mjs). Read a scene\'s own file only for a prop this page does not show.',
    '',
    p2.replace(/^## /, '## docs/scenes.md: '),
    '',
  ];
  for (const name of scenesFor(flags)) {
    let src = '';
    try {
      src = fs.readFileSync(path.join(dir, `${name}.tsx`), 'utf8');
    } catch {
      continue;
    }
    const props = propsOf(src);
    if (!props) continue;
    out.push(`## ${name}`, '', headerOf(src, name), '', '```ts', props, '```', '');
  }
  return `${out.join('\n').replace(/\n{3,}/g, '\n\n')}\n`;
};

/** write both files for the brief's flags; {rules, scenes} as {rel, bytes, tokens} */
export const writeCatalog = (flags = {}, base = root) => {
  const res = {};
  for (const [k, rel, text] of [
    ['rules', RULES_REL, rulesNow(flags)],
    ['scenes', SCENES_REL, scenesNow(flags)],
  ]) {
    const f = path.join(base, rel);
    fs.mkdirSync(path.dirname(f), {recursive: true});
    fs.writeFileSync(`${f}.tmp`, text);
    fs.renameSync(`${f}.tmp`, f);
    res[k] = {rel, bytes: Buffer.byteLength(text), tokens: tokensOf(text)};
  }
  return res;
};

const selfTest = () => {
  let fails = 0;
  const ok = (c, m) => {
    if (!c) {
      fails++;
      console.error(`FAIL ${m}`);
    }
  };
  ok(tokensOf('abcdefgh') === 3 && tokensOf('ბაბუა') === 5 && tokensOf('') === 0, 'the token estimate');
  const hooks = '# H\n\n## 1. Hook formulas\n\n### H14 · Playful\nplay\n\n## Buddy tone (x)\nbuddy line\n\n## 2. Scoring\nrubric\n## 3. Structure\ntemplates\n## 5. Angle bank\nangles\n## Story films (y)\nstory\n## The lesson (z)\nlesson\n## Sources\n';
  const r = rulesNow({stories: true}, {hooks, dna: '# Promo DNA\n\nthe spine\n'});
  ok(/the spine/.test(r) && /buddy line/.test(r) && /rubric/.test(r) && /templates/.test(r) && /angles/.test(r) && /story/.test(r) && !/\blesson\b/.test(r) && !/\bplay\b/.test(r), `rules: the brief's sections only:\n${r}`);
  ok(/## HOOKS\.md lines 8-10: Buddy tone/.test(r), 'rules: each section with its HOOKS.md lines');
  ok(/\blesson\b/.test(rulesNow({carinfo: true}, {hooks, dna: ''})) && /\bplay\b/.test(rulesNow({wild: true}, {hooks, dna: ''})), 'rules: the lesson for car knowledge, H14 for a wild film');
  // the real files: every brief's pair fits one Read, and nothing retired is offered
  for (const flags of [{stories: true}, {carinfo: true}, {humor: true}, {wild: true}, {aura: true}, {}]) {
    const rr = rulesNow(flags);
    const ss = scenesNow(flags);
    ok(tokensOf(rr) <= READ_TOKENS, `rules ${JSON.stringify(flags)}: ${tokensOf(rr)} tokens, over one Read's ${READ_TOKENS}`);
    ok(tokensOf(ss) <= READ_TOKENS, `scenes ${JSON.stringify(flags)}: ${tokensOf(ss)} tokens, over one Read's ${READ_TOKENS}`);
    for (const n of Object.keys(RETIRED_SCENES)) ok(!new RegExp(`^## ${n}$`, 'm').test(ss), `scenes: the retired ${n} is not offered`);
    for (const n of [...KIT, ...R3_SCENES, ...PHYS_SCENES, ...STORY_KIT]) ok(new RegExp(`^## ${n}$`, 'm').test(ss), `scenes ${JSON.stringify(flags)}: the kit's ${n} is there`);
  }
  // the props as the file declares them, with the types they name
  const src = "import x from 'y';\ntype Side = {label: string; value?: number};\ntype Other = {z: 1};\ntype P = {\n  /** two sides */\n  a: Side;\n  b: Side;\n  at?: number;\n};\n\n// Versus: two sides.\n// more.\nexport const Versus = () => null;\n";
  const pr = propsOf(src);
  ok(/type Side = \{label: string; value\?: number\};/.test(pr) && /type P = \{[\s\S]*at\?: number;\n\};/.test(pr) && !/Other/.test(pr) && pr.indexOf('Side') < pr.indexOf('type P'), `props: P and the types it names:\n${pr}`);
  ok(headerOf(src, 'Versus') === 'Versus: two sides. more.', `header: ${headerOf(src, 'Versus')}`);
  const st = scenesNow({stories: true});
  ok(/^## WhoCard$/m.test(st) && /name: string;/.test(st) && /^## PhotoStory$/m.test(st) && !/^## JamGrid$/m.test(st), 'scenes: a story film gets WhoCard\'s props and PhotoStory, not the humour kit');
  ok(/^## JamGrid$/m.test(scenesNow({humor: true})), 'scenes: a humour film gets its kit');
  console.log(fails ? `catalog.mjs: ${fails} failed` : 'catalog.mjs: all passed');
  process.exit(fails ? 1 : 0);
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  if (process.argv[2] === '--test') selfTest();
  else {
    const flags = Object.fromEntries(process.argv.slice(2).filter((a) => a.startsWith('--')).map((a) => [a.slice(2), true]));
    const res = writeCatalog(flags);
    for (const v of Object.values(res)) console.log(`${v.rel}: ${v.bytes} bytes, about ${v.tokens} tokens`);
  }
}
