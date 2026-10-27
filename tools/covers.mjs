// The designed Reels covers (src/Cover.tsx), many at once from one bundle:
//   node tools/covers.mjs <id...>                 the covers of these videos (composition "<id>-cover")
//   node tools/covers.mjs all                     every main film (v<n>-..., not the demos, hook variants or translations)
//   node tools/covers.mjs --spec <file> ...       a cover from a spec file alone, no voice timeline (composition
//                                                 "cover-preview"); --net-spec <file> the same with the net forced (the spec's
//                                                 own cover skipped); --out <dir> where they go (default out/); --fresh the
//                                                 page's ledger starts empty and each cover of the run joins it in turn (the
//                                                 design's simulated gallery), else the real one is read
// Writes, per cover, always on the light paper (purpose-built, black and white, never a film frame, never the logo):
//   <out>/<id>.cover.png       1080x1920, the Reels cover (upload it as the cover image)
//   <out>/<id>.cover-4x5.png   1080x1440, the centre 3:4 the site's tile and Instagram's profile grid show (a check;
//                              the name stays for tools/gallery.mjs)
//   <out>/<id>.cover.json      what was drawn: {id, cat, comp, how, asset, pose, variant, look, ST, sig, problems, failed}; the
//                              publish step appends it to the page's ledger (specs/.covers.jsonl, tools/ci/coverlog.mjs)
// Node decides the cover (src/cover/pick.mjs with the files: the spec's own, an older one read as today's, or the net built
// from the film's data) and the page's ledger hands it its pose, tilt and variant; the browser only draws it. After the
// render its pixels are checked (tools/ci/cover.mjs COVER_COLOUR, COVER_GRID, COVER_EMPTY, COVER_TOP_INK, COVER_TWIN against the
// page's last 12, mirrored too): a cover
// that breaks them is replaced by the net, loudly; if the net breaks them too, the run exits 1 and the record says
// "failed" (the film still goes out without a cover thumb: the owner, a video must always come out). Runs under tools/lock.sh.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ffOptions, ffmpeg, nodeEnv, renderOpts} from './platform.mjs';
import {coverLint, coverPixels, coverSig, resolveFor, twinProblems} from './ci/cover.mjs';
import {allowedFor, capturesFor, ledgerLine, PAGE, readLedger, repeatProblems} from './ci/coverlog.mjs';
import {coverAsset} from '../src/cover/comps.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const env = nodeEnv();

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('usage: node tools/covers.mjs <id...> | all | --spec <file> [--net-spec <file>] [--out <dir>] [--fresh]');
  process.exit(1);
}
if (!process.env.VS_LOCKED) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...argv], {stdio: 'inherit', env: {...env, VS_LOCKED: '1'}});
  process.exit(r.status ?? 1);
}

// ---- what to render ---------------------------------------------------------------------------------------------------
const targets = [];
let outDir = path.join(root, 'out');
let fresh = false;
const forceAll = process.env.VS_COVER_FORCE_NET === '1';
for (let i = 0; i < argv.length; i++) {
  const a = argv[i];
  if (a === '--spec' || a === '--net-spec') {
    const file = path.resolve(argv[++i]);
    const spec = JSON.parse(fs.readFileSync(file, 'utf8'));
    targets.push({name: path.basename(file).replace(/\.json$/, ''), spec, file, net: a === '--net-spec' || forceAll});
  } else if (a === '--out') outDir = path.resolve(argv[++i]);
  else if (a === '--fresh') fresh = true;
  else if (a === 'all') {
    const main = /^v\d+-[a-z0-9-]+$/;
    fs.readdirSync(path.join(root, 'specs'))
      .filter((f) => f.endsWith('.json') && !f.includes('--') && f.split('.').length === 2)
      .map((f) => f.slice(0, -5))
      .filter((id) => main.test(id))
      .sort((x, y) => parseInt(x.slice(1)) - parseInt(y.slice(1)))
      .forEach((id) => targets.push({name: id, id, net: forceAll}));
  } else targets.push({name: a, id: a, net: forceAll});
}
fs.mkdirSync(outDir, {recursive: true});

execFileSync('node', [path.join(root, 'tools/build-index.mjs')], {stdio: ['ignore', 'ignore', 'inherit'], cwd: root, env});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
// every bundle copies public/ (hundreds of MB): remove it when this run ends, or a day of runs fills the disk (2026-10-12)
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});

// the page's ledger: the real one (read only here; the publish step appends), or an empty one each cover of this run joins
let ledger = fresh ? [] : readLedger(root);
let tick = Date.parse('2026-10-27T10:00:00Z');

const render = async (t, resolved, coverCtx, output) => {
  if (t.spec) {
    const inputProps = {spec: t.spec, coverResolved: resolved.cover, coverCtx};
    const composition = await selectComposition({serveUrl, id: 'cover-preview', inputProps, ...renderOpts()});
    await renderStill({serveUrl, composition, frame: 0, output, imageFormat: 'png', inputProps, ...renderOpts()});
    return t.spec;
  }
  const base = await selectComposition({serveUrl, id: `${t.id}-cover`, ...renderOpts()});
  const inputProps = {...base.props, coverResolved: resolved.cover, coverCtx};
  const composition = await selectComposition({serveUrl, id: `${t.id}-cover`, inputProps, ...renderOpts()});
  await renderStill({serveUrl, composition, frame: 0, output, imageFormat: 'png', inputProps, ...renderOpts()});
  return base.props.spec;
};

let failed = 0;
for (const t of targets) {
  const cover = path.join(outDir, `${t.name}.cover.png`);
  const grid = path.join(outDir, `${t.name}.cover-4x5.png`);
  const record = path.join(outDir, `${t.name}.cover.json`);
  const tmp = cover.replace(/\.png$/, '.tmp.png');
  try {
    let spec = t.spec ?? JSON.parse(fs.readFileSync(path.join(root, 'specs', `${t.id}.json`), 'utf8'));
    const cat = String(spec.category ?? '');
    const here = {caps: capturesFor(root, cat), carplay: spec?.cover?.kind === 'carplay'};
    const a = allowedFor(cat, ledger, here);
    const recent = ledger.filter((l) => !l.test).slice(0, PAGE);
    // what the page's ledger hands this cover: the phone's pose, the polaroid's tilt, the stat's slab, the versus's black
    // card, and what the variety rule allows (the net picks among those first)
    const coverCtx = {pose: a.pose, polSign: a.polSign, slab: a.slab, dark: a.dark, allowed: a.allowed};
    // a spec on its own (the test set): the cloud's own lint first, so a cover the cloud would refuse (a stale capture, a
    // missing speaker) is never shown as one it can make
    if (t.spec) for (const x of coverLint(root, spec, {needKind: true})) console.error(`${t.name}: LINT ${x}`);
    const tryOne = async (forceNet) => {
      const r = resolveFor(root, spec, {forceNet, coverCtx});
      spec = await render(t, r, coverCtx, tmp);
      const sig = coverSig(tmp);
      const blocking = r.layout.problems.filter((p) => !p.startsWith('COVER_TITLE_FIT'));
      const pixels = [...coverPixels(tmp, {st: r.layout.ST}), ...twinProblems(sig, recent)];
      return {r, sig, problems: [...blocking, ...pixels], notes: r.layout.problems.filter((p) => p.startsWith('COVER_TITLE_FIT'))};
    };
    let res = await tryOne(t.net);
    if (res.problems.length && !res.r.how.startsWith('net')) {
      res.problems.forEach((x) => console.error(`${t.name}: ${x}`));
      console.error(`${t.name}: WARNING the cover (${res.r.cover.kind}) broke its guards above: the net builds one from the film (fix the spec's "cover")`);
      res = await tryOne(true);
    }
    // the variety rule on what was drawn (the spec's own cover in the cloud is checked before the voice: check.mjs); a net
    // cover outside it is said loudly
    for (const x of repeatProblems({comp: res.r.cover.kind, asset: coverAsset(res.r.cover), variant: res.r.layout.variant}, cat, ledger, here)) console.error(`${t.name}: ${res.r.how.startsWith('net') ? 'NET ' : ''}${x}`);
    const bad = res.problems.length > 0;
    if (bad) {
      failed++;
      res.problems.forEach((x) => console.error(`${t.name}: ${x}`));
      console.error(`${t.name}: the net's cover breaks the guards too: the film goes out without a cover thumb (coverFailed)`);
    }
    fs.renameSync(tmp, cover);
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', cover, '-vf', 'crop=1080:1440:0:240', '-c:v', 'png', '-update', '1', grid], ffOptions());
    const c = res.r.cover;
    const pose = res.r.layout.pose ?? (c.kind === 'polaroid' ? (coverCtx.polSign > 0 ? 'cw' : 'ccw') : null);
    const variant = res.r.layout.variant ?? (c.kind === 'stat' && (c.stat?.variant === 'slab' || coverCtx.slab) ? 'slab' : null);
    const rec = {id: spec.id ?? t.name, cat: cat || null, comp: c.kind, how: res.r.how, asset: coverAsset(c), pose, variant, look: res.r.layout.look ?? null, ST: res.r.layout.ST, sig: res.sig, problems: [...res.problems, ...res.notes], failed: bad};
    fs.writeFileSync(record, `${JSON.stringify(rec, null, 1)}\n`);
    if (fresh) ledger = [ledgerLine({at: new Date((tick += 600000)).toISOString().replace(/\.\d{3}Z$/, 'Z'), id: rec.id, cat, comp: rec.comp, asset: rec.asset, pose, variant, look: rec.look, sig: rec.sig}), ...ledger];
    console.log(`${t.name}: ${path.relative(root, cover)} + 4x5 + record  (${c.kind}${res.r.layout.variant ? ` ${res.r.layout.variant}` : ''}${pose ? ` ${pose}` : ''}, ${res.r.how}${res.notes.length ? `; ${res.notes.length} headline note(s)` : ''})`);
  } catch (e) {
    failed++;
    try {
      fs.rmSync(tmp, {force: true});
    } catch {}
    console.error(`${t.name}: ${String(e.message ?? e).split('\n')[0]}`);
  }
}
process.exit(failed ? 1 : 0);
