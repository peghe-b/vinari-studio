// Which look the next new video gets: prints "dark" or "light" and nothing else on stdout.
// The owner (2026-09-24): the looks alternate in production order, black, white, black, white ...,
// starting with black. So every new spec sets "theme" from this tool:
//
//   node tools/next-theme.mjs <id>     reserve the look for the new video <id> and print it. Asking again
//                                      for the same id prints the same look. A hook variant (<id>-h2), a
//                                      translation (<id>-en, <id>-ru) or a demo-* is never recorded: it
//                                      prints its own spec's look, or its original's when not written yet.
//   node tools/next-theme.mjs          the next look, without reserving it
//   node tools/next-theme.mjs --list   the ledger, oldest first, and the next look
//
// The ledger is specs/.themes.json: one {id, theme} per video, oldest first. A spec that exists is the
// truth for its own look when it sets "theme"; the ledger adds the production order and holds the
// reservation until the spec says it, so two sessions writing specs at once still alternate. A spec
// the ledger first meets without "theme" is recorded as "dark" (that is how it renders).
// A video the ledger has not seen yet is added in v-number order (v2 before v10), others by id.
// Edit the ledger by hand only to fix a mistake (delete a line to free a reservation).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specsDir = path.join(root, 'specs');
const ledgerFile = path.join(specsDir, '.themes.json');
const lockDir = path.join(specsDir, '.themes.lock');
const TR = ['en', 'ru']; // translations: specs/<id>.<lang>.json, id <id>-<lang> (build-index.mjs LANGS)
const opposite = (t) => (t === 'light' ? 'dark' : 'light');
const lookOf = (spec) => (spec?.theme === 'light' ? 'light' : 'dark'); // Promo.tsx themeOf: else dark
const note = (s) => process.stderr.write(`next-theme: ${s}\n`);

const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch {
    return null;
  }
};

// every spec by id: {file, spec, base}; base = not a demo, not a hook variant, not a translation
const specs = () => {
  const byId = new Map();
  for (const f of fs.readdirSync(specsDir).filter((f) => f.endsWith('.json') && !f.startsWith('.')).sort()) {
    const spec = readJson(path.join(specsDir, f));
    if (!spec || typeof spec.id !== 'string') continue;
    const base = /^[^.]+\.json$/.test(f) && !f.startsWith('demo-') && !/--h\d+\.json$/.test(f);
    byId.set(spec.id, {file: f, spec, base});
  }
  return byId;
};

// production order for videos the ledger has not seen: v<N> by N, then anything else by id
const orderKey = (id) => {
  const m = /^v(\d+)-/.exec(id);
  return m ? [0, Number(m[1]), id] : [1, 0, id];
};
const byOrder = (a, b) => {
  const [x, y] = [orderKey(a), orderKey(b)];
  return x[0] - y[0] || x[1] - y[1] || x[2].localeCompare(y[2]);
};

const readLedger = () => {
  if (!fs.existsSync(ledgerFile)) return [];
  const j = readJson(ledgerFile);
  if (!j || !Array.isArray(j.videos)) {
    note(`${path.relative(root, ledgerFile)} is not a valid ledger ({"videos": [{"id", "theme"}]}); fix it or delete it to rebuild it from the specs`);
    process.exit(1);
  }
  return j.videos.filter((v) => v && typeof v.id === 'string').map((v) => ({id: v.id, theme: v.theme === 'light' ? 'light' : 'dark'}));
};

const writeLedger = (videos) => {
  const body = [
    '{',
    '  "about": "tools/next-theme.mjs: every new video in production order, oldest first, and its look. The looks alternate dark, light, dark ... A spec\'s own \\"theme\\" wins over its line here.",',
    '  "videos": [',
    videos.map((v) => `    ${JSON.stringify({id: v.id, theme: v.theme})}`).join(',\n'),
    '  ]',
    '}',
    '',
  ].join('\n');
  const tmp = `${ledgerFile}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, body);
  fs.renameSync(tmp, ledgerFile);
};

// The ledger with every base spec in it: an existing spec's look comes from the spec, a spec the
// ledger has not seen is appended in production order. `skip` is left out (the id being reserved).
const synced = (all, skip) => {
  const videos = readLedger();
  const known = new Set(videos.map((v) => v.id));
  let changed = false;
  for (const v of videos) {
    const s = all.get(v.id);
    // a spec's own "theme" wins; a spec without one keeps its reservation (lint asks for the field)
    if (s && s.spec.theme !== undefined && lookOf(s.spec) !== v.theme) {
      v.theme = lookOf(s.spec);
      changed = true;
    }
  }
  const fresh = [...all.values()].filter((s) => s.base && !known.has(s.spec.id) && s.spec.id !== skip).map((s) => s.spec.id).sort(byOrder);
  for (const id of fresh) videos.push({id, theme: lookOf(all.get(id).spec)});
  return {videos, changed: changed || fresh.length > 0};
};
const nextOf = (videos) => (videos.length ? opposite(videos[videos.length - 1].theme) : 'dark');

// one writer at a time (two sessions reserving at once); a lock older than 30 s is stale
const locked = (fn) => {
  const nap = new Int32Array(new SharedArrayBuffer(4));
  for (let i = 0; ; i++) {
    try {
      fs.mkdirSync(lockDir);
      break;
    } catch {
      try {
        if (Date.now() - fs.statSync(lockDir).mtimeMs > 30000) fs.rmSync(lockDir, {recursive: true, force: true});
      } catch {}
      if (i > 200) {
        note(`${path.relative(root, lockDir)} is held; remove it if no other next-theme is running`);
        process.exit(1);
      }
      Atomics.wait(nap, 0, 0, 50);
    }
  }
  try {
    return fn();
  } finally {
    fs.rmSync(lockDir, {recursive: true, force: true});
  }
};

const arg = process.argv[2];
const all = specs();

if (!arg || arg === '--list') {
  const theme = locked(() => {
    const {videos, changed} = synced(all);
    if (changed) writeLedger(videos);
    if (arg) for (const v of videos) process.stdout.write(`${v.id} ${v.theme}${all.has(v.id) ? '' : ' (reserved, no spec yet)'}\n`);
    return nextOf(videos);
  });
  process.stdout.write(arg ? `next: ${theme}\n` : `${theme}\n`);
  process.exit(0);
}

// an id, or a spec path (specs/v11-x.json)
let id = arg;
if (arg.endsWith('.json')) {
  const s = readJson(path.resolve(arg)) ?? readJson(path.join(specsDir, path.basename(arg)));
  id = typeof s?.id === 'string' ? s.id : path.basename(arg, '.json');
}
if (!/^[a-z0-9-]+$/.test(id)) {
  note(`"${id}" is not a spec id ([a-z0-9-])`);
  process.exit(1);
}

// a demo, a hook variant or a translation takes a look, it never adds one to the order
const own = all.get(id);
const original = (x) => {
  const m = new RegExp(`^(.+?)(?:-h\\d+)?(?:-(?:${TR.join('|')}))?$`).exec(x);
  return m && m[1] !== x ? all.get(m[1]) : undefined;
};
if (id.startsWith('demo-') || (own && !own.base) || (!own && original(id))) {
  const from = own ?? original(id);
  process.stdout.write(`${from ? lookOf(from.spec) : 'dark'}\n`);
  process.exit(0);
}

const theme = locked(() => {
  const {videos, changed} = synced(all, id);
  const had = videos.find((v) => v.id === id);
  if (had) {
    if (changed) writeLedger(videos);
    if (own && own.spec.theme === undefined) note(`write "theme": "${had.theme}" into specs/${own.file}${had.theme === 'light' ? ' (without it the film renders dark)' : ''}`);
    return had.theme;
  }
  const next = nextOf(videos);
  // a spec already written with its own "theme" keeps it (the spec is the truth); without one it
  // takes the next look, and the spec has to say so before it renders
  const t = own && own.spec.theme !== undefined ? lookOf(own.spec) : next;
  if (t !== next) note(`${id} already says "theme": "${t}"; the alternation wanted "${next}"`);
  if (own && own.spec.theme === undefined) note(`write "theme": "${t}" into specs/${own.file}${t === 'light' ? ' (without it the film renders dark)' : ''}`);
  videos.push({id, theme: t});
  writeLedger(videos);
  return t;
});
process.stdout.write(`${theme}\n`);
