// Hook A/B testing: one idea, one video per opening. Everything after beat 0 stays identical,
// so the only thing a Reels/TikTok comparison can measure is the hook.
//
//   node tools/variants.mjs <id> [hooks.json] [--append]
//       hooks.json (default specs/hooks/<id>.json) lists the openings:
//         [{"name": "question", "say": "...", "show": "...", "scene": {...}, "meta": ["..."]}, ...]
//       Only "say" is required (a bare string is a hook too). A hook replaces beat 0 of
//       specs/<id>.json; "show", "scene", "meta", "sfx", "hold", "gap", "voice", "rate", "pitch"
//       replace that beat's field when given. The original "show" is dropped whenever "say"
//       changes: it belongs to the original words.
//       Writes specs/<id>--h1.json, --h2 ... with the ids <id>-h1, <id>-h2 ... and lints them.
//       Without --append the set is replaced (higher-numbered leftovers are removed); with
//       --append the new hooks are numbered after the existing ones.
//       The last stdout line is "ids: <id>-h1 <id>-h2 ..." (./make.sh variants reads it).
//
//   node tools/variants.mjs --sync [id]
//       Rebuilds every variant (of <id>, or of all specs) whose original spec is newer than it:
//       beats 1.. and the top-level fields come from the original again, the hook's own fields
//       stay. ./make.sh all and ./make.sh <id>-hN run this first, so a variant is never stale.
//
//   tools/lock.sh node tools/variants.mjs --stills <id> [variant ids...]
//       The opening of the original and of every variant: frame 0 (the thumbnail) and the frame
//       the hook's last word lands on, as out/stills/<vid>-f<frame>.png, plus one side-by-side
//       sheet out/stills/<id>-hooks.png. One bundle for all of them. Heavy: always via the lock.
//       (tools/stills.mjs cannot open a variant: it expects specs/<id>.json.)
//
//   node tools/variants.mjs --list <id>      the variant ids of <id>, one per line
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const specsDir = path.join(root, 'specs');
const rel = (f) => (path.relative(root, f).startsWith('..') ? f : path.relative(root, f));
const FPS = 30;
const LETTERS_PER_S = 11.5; // CLAUDE.md budget
const FIELDS = ['show', 'scene', 'meta', 'sfx', 'hold', 'gap', 'voice', 'rate', 'pitch'];
const USAGE = 'usage: node tools/variants.mjs <id> [hooks.json] [--append] | --sync [id] | --stills <id> [ids...] | --list <id>';

const die = (msg) => {
  console.error(msg);
  process.exit(1);
};
const readJson = (f) => {
  try {
    return JSON.parse(fs.readFileSync(f, 'utf8'));
  } catch (e) {
    return die(`${rel(f)}: ${e.code === 'ENOENT' ? 'not found' : e.message}`);
  }
};
const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const chunks = (s) => s.split('|');
const letters = (s) => (s.match(/\p{L}/gu) ?? []).length;
const secs = (s) => (letters(s) / LETTERS_PER_S).toFixed(1);

/** <base>-h<n> -> specs/<base>--h<n>.json */
const variantFile = (vid) => {
  const m = /^(.+)-h(\d+)$/.exec(vid);
  return m ? path.join(specsDir, `${m[1]}--h${m[2]}.json`) : null;
};
/** hook numbers of the variants of <id> that exist on disk, ascending */
const existing = (id) =>
  fs
    .readdirSync(specsDir)
    .map((f) => new RegExp(`^${esc(id)}--h(\\d+)\\.json$`).exec(f))
    .filter(Boolean)
    .map((m) => Number(m[1]))
    .sort((a, b) => a - b);

/** The variant spec: the original with beat 0 rebuilt from the hook's fields. */
const compose = (base, baseId, n, hook) => {
  const fields = Object.keys(hook).filter((k) => k === 'say' || FIELDS.includes(k));
  const beat = {...base.beats[0]};
  if ('say' in hook) delete beat.show; // the original subtitle belongs to the original words
  for (const k of fields) beat[k] = hook[k];
  const {id: _id, title, beats, variantOf: _v, hook: _h, ...rest} = base;
  return {
    id: `${baseId}-h${n}`,
    title: `${title ?? baseId} · h${n}`,
    variantOf: baseId,
    hook: {n, ...(hook.name ? {name: hook.name} : {}), fields},
    ...rest,
    beats: [beat, ...beats.slice(1)],
  };
};

/** Words the brief forbids or restricts (Marketing/VINARI — app brief.md §5, §6, §9). Warnings: a
 *  hook may name them to deny them ("it will not tell you who owns the car"). */
const RISKY = [
  [/დიაგნოზ|გამოავლენ|დაადგენ/u, 'the app never diagnoses; it names the sound\'s character only'],
  [/ჯარიმ/u, 'the app never shows fines'],
  [/ვისია|ვინ ფლობს/u, 'the app never shows the owner'],
  [/ნომრით|ნომერზე მოძებნ/u, 'nothing finds a car by its plate'],
  [/სრულ\p{L}* ისტორი/u, 'the auction history is incomplete, never "full"'],
  [/%|პროცენტ/u, 'no percentages'],
  [/ანდროიდ|android/iu, 'no Android date'],
  [/უფასო/u, 'only one car and its price are free'],
];

const lintOne = (vid) => {
  const r = spawnSync('node', [path.join(root, 'tools/build-index.mjs'), vid], {cwd: root, encoding: 'utf8'});
  const mine = `${r.stdout}\n${r.stderr}`.split('\n').filter((l) => l.trimStart().startsWith(`${vid}:`));
  mine.forEach((l) => console.error(l));
  return r.status === 0;
};

function write(id, hooksArg, append) {
  if (!id) die(USAGE);
  const baseFile = path.join(specsDir, `${id}.json`);
  if (!fs.existsSync(baseFile)) {
    const vf = variantFile(id);
    die(vf && fs.existsSync(vf) ? `${id} is a variant; give the original id` : `no specs/${id}.json`);
  }
  const base = readJson(baseFile);
  if (base.variantOf) die(`${id} is itself a variant of ${base.variantOf}`);
  const hooksFile = hooksArg ? path.resolve(hooksArg) : path.join(specsDir, 'hooks', `${id}.json`);
  let hooks = readJson(hooksFile);
  if (!Array.isArray(hooks)) hooks = hooks?.hooks;
  if (!Array.isArray(hooks) || !hooks.length) die(`${rel(hooksFile)}: expected a non-empty list of hooks, [{"say": "...", "show"?, "scene"?}, ...]`);
  hooks = hooks.map((h) => (typeof h === 'string' ? {say: h} : h));

  const b0 = base.beats[0];
  const problems = [];
  const notes = [];
  hooks.forEach((h, k) => {
    const where = `hook ${k + 1}${h?.name ? ` (${h.name})` : ''}`;
    if (!h || typeof h.say !== 'string' || !/[\p{L}\p{N}]/u.test(h.say)) return problems.push(`${where}: "say" is required`);
    const unknown = Object.keys(h).filter((key) => key !== 'say' && key !== 'name' && !FIELDS.includes(key));
    if (unknown.length) problems.push(`${where}: unknown field ${unknown.join(', ')} (allowed: say, name, ${FIELDS.join(', ')})`);
    if (h.show !== undefined && chunks(h.show).length !== chunks(h.say).length)
      problems.push(`${where}: "show" has ${chunks(h.show).length} chunks, "say" has ${chunks(h.say).length}`);
    if (h.scene !== undefined && (typeof h.scene !== 'object' || !h.scene?.type)) problems.push(`${where}: "scene" needs a "type"`);
    if (!h.scene && b0.scene && chunks(h.say).length !== chunks(b0.say).length)
      notes.push(`${where}: ${chunks(h.say).length} chunks, the original opening has ${chunks(b0.say).length}; the kept ${b0.scene.type} scene counts its "at" cues in chunks, so they now land on other words. Give the hook its own "scene" if that matters.`);
    for (const s of [h.say, h.show ?? '']) for (const [re, why] of RISKY) if (re.test(s)) notes.push(`${where}: check "${s.match(re)[0]}": ${why}`);
  });
  if (problems.length) die(`${rel(hooksFile)}:\n  ${problems.join('\n  ')}`);

  const had = existing(id);
  const start = append && had.length ? had[had.length - 1] : 0;
  const ids = [];
  console.log(`original ${id}: "${b0.say}"  ${letters(b0.say)} letters ≈ ${secs(b0.say)} s`);
  hooks.forEach((h, k) => {
    const n = start + k + 1;
    const v = compose(base, id, n, h);
    fs.writeFileSync(variantFile(v.id), `${JSON.stringify(v, null, 2)}\n`);
    ids.push(v.id);
    console.log(`${rel(variantFile(v.id))}: "${h.say}"  ${letters(h.say)} letters ≈ ${secs(h.say)} s${h.scene ? `, scene ${h.scene.type}` : ''}`);
  });
  if (!append)
    for (const n of had.filter((x) => x > hooks.length)) {
      const f = path.join(specsDir, `${id}--h${n}.json`);
      if (readJson(f).variantOf === id) {
        fs.rmSync(f);
        console.log(`removed the leftover ${rel(f)}`);
      }
    }
  notes.forEach((x) => console.error(`  note: ${x}`));
  const bad = ids.filter((vid) => !lintOne(vid));
  if (bad.length) die(`lint failed: ${bad.join(', ')}. Fix ${rel(hooksFile)} and run again.`);
  console.log(`ids: ${ids.join(' ')}`);
}

function sync(only) {
  const files = fs.readdirSync(specsDir).filter((f) => /--h\d+\.json$/.test(f));
  let n = 0;
  for (const f of files) {
    const file = path.join(specsDir, f);
    const v = readJson(file);
    if (!v.variantOf || (only && v.variantOf !== only)) continue;
    const baseFile = path.join(specsDir, `${v.variantOf}.json`);
    if (!fs.existsSync(baseFile)) {
      console.error(`  ${v.id}: its original specs/${v.variantOf}.json is gone; delete ${rel(file)} or restore it`);
      continue;
    }
    if (fs.statSync(baseFile).mtimeMs <= fs.statSync(file).mtimeMs) continue;
    const fields = v.hook?.fields ?? ['say', 'show', 'scene', 'meta'];
    const hook = Object.fromEntries(fields.filter((k) => k in v.beats[0]).map((k) => [k, v.beats[0][k]]));
    if (v.hook?.name) hook.name = v.hook.name;
    const next = compose(readJson(baseFile), v.variantOf, v.hook?.n ?? Number(/-h(\d+)$/.exec(v.id)[1]), hook);
    fs.writeFileSync(file, `${JSON.stringify(next, null, 2)}\n`);
    console.log(`refreshed ${rel(file)} from specs/${v.variantOf}.json`);
    n++;
  }
  return n;
}

async function stills(id, vids) {
  if (!id) die(USAGE);
  vids = vids.length ? vids : existing(id).map((n) => `${id}-h${n}`);
  if (!vids.length) die(`no variants of ${id}; first: node tools/variants.mjs ${id} <hooks.json>`);
  sync(id);
  const files = {[id]: path.join(specsDir, `${id}.json`)};
  for (const v of vids) files[v] = variantFile(v);
  // voice (cached, no network for unchanged words) and index; the original first: it is the control
  const ready = [];
  for (const v of [id, ...vids]) {
    if (!files[v] || !fs.existsSync(files[v])) {
      console.error(`  ${v}: no spec file, skipped`);
      continue;
    }
    const r = spawnSync('python3', [path.join(root, 'tools/vo.py'), files[v]], {cwd: root, encoding: 'utf8'});
    if (r.status !== 0) {
      console.error(`  ${v}: voice failed, skipped: ${(r.stderr || r.stdout).trim().split('\n').slice(-1)[0]}`);
      continue;
    }
    console.log(r.stdout.split('\n')[0]);
    if (lintOne(v)) ready.push(v);
    else console.error(`  ${v}: lint failed, skipped`);
  }
  if (!ready.length) die('nothing to render');

  const {bundle} = await import('@remotion/bundler');
  const {renderStill, selectComposition} = await import('@remotion/renderer');
  const opts = renderOpts();
  const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
  fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
  const columns = [];
  for (const v of ready) {
    const composition = await selectComposition({serveUrl, id: v, ...opts});
    const {spec, timeline} = composition.props;
    const next = spec.beats.findIndex((b, i) => i > 0 && b.scene);
    const sceneEnd = next > 0 ? Math.round(timeline.beats[next].start * FPS) : composition.durationInFrames;
    // just after the hook's last word: its subtitle is still up and the scene has answered it
    const landed = Math.max(1, Math.min(sceneEnd - 2, Math.round(timeline.beats[0].speechEnd * FPS) + 4));
    const shots = [];
    for (const frame of [0, landed]) {
      const output = path.join(root, `out/stills/${v}-f${frame}.png`);
      await renderStill({serveUrl, composition, frame, output, scale: 0.5, ...opts});
      console.log(rel(output));
      shots.push(output);
    }
    columns.push({label: v === id ? `${v} (original)` : v, say: spec.beats[0].say.replace(/\s*\|\s*/g, ' '), shots});
  }

  // one sheet to compare the openings at a glance (Pillow is in the system python; skipped if not)
  const sheet = path.join(root, `out/stills/${id}-hooks.png`);
  const py = `
import json, sys
from PIL import Image, ImageDraw, ImageFont
cols, out, font = json.loads(sys.argv[1]), sys.argv[2], sys.argv[3]
W, H, G, TOP = 360, 640, 24, 118
rows = max(len(c["shots"]) for c in cols)
sheet = Image.new("RGB", (G + len(cols) * (W + G), TOP + rows * (H + G) + G), "#0B0B0E")
d = ImageDraw.Draw(sheet)
f1, f2 = ImageFont.truetype(font, 24), ImageFont.truetype(font, 19)
def wrap(text, width):
    lines, cur = [], ""
    for w in text.split():
        t = (cur + " " + w).strip()
        if d.textlength(t, font=f2) > width and cur:
            lines.append(cur); cur = w
        else:
            cur = t
    return lines + [cur] if cur else lines
for i, c in enumerate(cols):
    x = G + i * (W + G)
    d.text((x, 18), c["label"], fill="#EDEDF2", font=f1)
    for k, line in enumerate(wrap(c["say"], W)[:3]):
        d.text((x, 52 + k * 22), line, fill="#8E8E99", font=f2)
    for r, p in enumerate(c["shots"]):
        sheet.paste(Image.open(p).convert("RGB").resize((W, H), Image.LANCZOS), (x, TOP + r * (H + G)))
sheet.save(out)
`;
  const r = spawnSync('python3', ['-c', py, JSON.stringify(columns), sheet, path.join(root, 'public/fonts/FiraGO-Regular.otf')], {encoding: 'utf8'});
  if (r.status === 0) console.log(`sheet: ${rel(sheet)} (columns: ${columns.map((c) => c.label).join(' | ')}; rows: frame 0, hook landed)`);
  else console.error(`  sheet skipped: ${r.stderr.trim().split('\n').slice(-1)[0]}`);
}

const args = process.argv.slice(2);
const flags = new Set(args.filter((a) => a.startsWith('--')));
const pos = args.filter((a) => !a.startsWith('--'));
const unknownFlags = [...flags].filter((f) => !['--append', '--sync', '--stills', '--list'].includes(f));
if (unknownFlags.length) die(`unknown option ${unknownFlags.join(' ')}\n${USAGE}`);
if (flags.has('--stills')) await stills(pos[0], pos.slice(1));
else if (flags.has('--sync')) {
  if (!sync(pos[0])) console.log('variants: all up to date');
} else if (flags.has('--list')) {
  if (!pos[0]) die(USAGE);
  existing(pos[0]).forEach((n) => console.log(`${pos[0]}-h${n}`));
} else write(pos[0], pos[1], flags.has('--append'));
