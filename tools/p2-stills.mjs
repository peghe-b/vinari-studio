// Phase 2's visual check (src/lib/p2.mjs): the SETTLED frame of every shot of every P2 fixture film (specs/demo-p2-*.json,
// silent demos: no voice request) as full 1080 x 1920 stills, ONE bundle for all of them, then the pixel guards
// (tools/ci/p2pixels.py: HUE_TWO, EMPTY, TEXT_EDGE on the text layer) and one contact sheet per fixture.
//   node tools/p2-stills.mjs [demo-p2-...]        all fixtures, or the ones named
//   --repeat=<id>,<id>   run the whole-film guards of these fixtures twice (the r3 verify: the gate's check must answer
//                        the same twice on the cloud's own GL path; p2-check.yml). It fails when the LINES differ, or a
//                        sample's data hues or clash count (HUE_TWO and TEXT_CLASH, what stopped the p4 films): the
//                        cloud's SwiftShader jitters raw counts (core, pale, contrast, ink) between two renders of the same
//                        frame (first run 40454498229: 1 and 11 such fields), so those are a note with their spread
//   --det=<id>,<id>      the physics scenes' determinism (round 3, src/lib/physics.mjs): every physics shot's key frames
//                        rendered three ways, a cold page each in order, a cold page each in reverse order, and one page
//                        walking the shot frame by frame (renderFrames, concurrency 1): every pixel must be the same
// Output: out/p2/<id>-<frame>.png, out/p2/<id>.sheet.png, out/p2/report.json. The cloud runs it on every push of the
// branch (.github/workflows/p2-check.yml); on the 8 GB Mac only through scripts/heavy.sh (one heavy job at a time).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderFrames, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {concurrency, renderOpts} from './platform.mjs';
import {planShots} from './ci/fx.mjs';
import {reviewFilm} from './ci/guards.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const outDir = path.join(root, 'out', 'p2');
fs.mkdirSync(outDir, {recursive: true});
const named = process.argv.slice(2).filter((a) => !a.startsWith('--'));
const ids = (named.length ? named : fs.readdirSync(path.join(root, 'specs')).filter((f) => /^demo-p2-.*\.json$/.test(f)).map((f) => f.slice(0, -5))).sort();
for (const id of ids) execFileSync('node', [path.join(root, 'tools/fake-timeline.mjs'), id], {stdio: 'inherit', cwd: root});
execFileSync('node', [path.join(root, 'tools/build-index.mjs'), ...ids], {stdio: 'inherit', cwd: root});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});

const HOOKS = new Set(['FreezeTag', 'IrisDetail', 'TypeDive', 'KeywordLift', 'FilmTitleCard', 'ShapeMatch']);
const shots = [];
for (const id of ids) {
  const composition = await selectComposition({serveUrl, id, inputProps: {}, ...renderOpts()});
  const {spec, timeline} = composition.props;
  const starts = spec.beats.map((b, i) => (b.scene || i === 0 ? Math.round(timeline.beats[i].start * 30) : null)).filter((x) => x !== null);
  starts.push(composition.durationInFrames);
  // the settled frame: 80 % into the shot (after every mark and lift), plus frame 0 (the hook) for the first
  const frames = [0, ...starts.slice(0, -1).map((s, i) => Math.min(starts[i + 1] - 2, Math.round(s + (starts[i + 1] - s) * 0.8)))];
  // the scene on screen at a frame (the guards excuse a real app screen from HUE_TWO)
  const sceneAt = (f) => {
    let t = '';
    spec.beats.forEach((b, i) => {
      if (b.scene && Math.round(timeline.beats[i].start * 30) <= f) t = b.scene.type;
    });
    return t;
  };
  for (const frame of [...new Set(frames)]) {
    for (const layer of ['all', 'text']) {
      const output = path.join(outDir, `${id}-${frame}${layer === 'text' ? '-txt' : ''}.png`);
      // the text layer: the probe draws only the words (lib/layer.ts TXT) on the key-green field
      // the picture without the lens: its red and blue fringe on the graphics is no data colour (HUE_TWO read it as amber
      // and blue on the fixtures' frame 0); the film guards' "pic" pass draws without it too
      const inputProps = layer === 'text' ? {guardProbe: 'txt'} : {vhs: 0};
      const comp = await selectComposition({serveUrl, id, inputProps, ...renderOpts()});
      await renderStill({serveUrl, composition: comp, frame, output, scale: 1, inputProps, ...renderOpts()});
    }
    // frame 0 is held to HOOK_FRAME0 when the film opens on a hook (a fixture of another kit part is not a film's opening)
    const hook = frame === 0 && HOOKS.has(spec.beats[0]?.scene?.type);
    shots.push({id, frame, scene: sceneAt(frame), hook});
    console.log(`${id} @${frame}`);
  }
}
fs.writeFileSync(path.join(outDir, 'shots.json'), JSON.stringify(shots, null, 1));
let stillsFailed = 0;
try {
  execFileSync('python3', [path.join(root, 'tools/ci/p2pixels.py'), outDir], {stdio: 'inherit', cwd: root});
} catch {
  stillsFailed = 1;
}

// the physics scenes' determinism (--det=<ids>): every physics shot's key frames rendered four ways, a cold page each in
// order (a), a cold page each in reverse order (b), and two separate pages each walking the first physics shot frame by frame
// (w, v); the stills land in out/p2/det/. The same path twice must give the same pixels (a = b, w = v). Across the two paths
// (renderStill against renderFrames) the cloud's first run showed 2 to 96 pixels one grey level apart on the physics frames,
// cold twice and the physics state itself bit-identical: so a and w may differ by ONE level (a body that moved by a pixel
// differs by a hundred), and a control fixture with no physics (demo-p2-data-v901) is compared the same way to show the
// path's own noise.
const DET = (process.argv.find((a) => a.startsWith('--det='))?.slice(6) ?? '').split(',').filter(Boolean);
let detFailed = 0;
if (DET.length) {
  const PHYS = new Set(['PhysJar', 'PhysStack', 'PhysCount']);
  const detDir = path.join(outDir, 'det');
  fs.mkdirSync(detDir, {recursive: true});
  const opts = {...renderOpts(), logLevel: 'error'};
  const pairs = [];
  // the physics state each render drew (kit/phys.tsx physLog): `${id}|${scene}|${sf}` -> {tag: hash}
  const states = new Map();
  const logTo = (id, tag) => (log) => {
    const m = /^PHYS (\w+) sf=(\d+) h=([0-9a-f]{8})$/.exec(String(log?.text ?? '').trim());
    if (!m) return;
    const k = `${id}|${m[1]}|${m[2]}`;
    const e = states.get(k) ?? {};
    (e[tag] ??= new Set()).add(m[3]);
    states.set(k, e);
  };
  const PROBE = {physLog: 1};
  const walkTo = async (id, composition, walk, keys, tag) => {
    const browser = await openBrowser('chrome', opts);
    try {
      await renderFrames({serveUrl, composition, inputProps: PROBE, onBrowserLog: logTo(id, tag), frames: walk, imageFormat: 'png', scale: 1, concurrency: 1, outputDir: null, muted: true, onFrameBuffer: (buf, f) => (keys.includes(f) ? fs.writeFileSync(path.join(detDir, `${id}-${f}-${tag}.png`), buf) : null), onStart: () => {}, onFrameUpdate: () => {}, ...opts, puppeteerInstance: browser});
    } finally {
      await browser.close({silent: true}).catch(() => {});
    }
  };
  const file = (id, f, tag) => path.join(detDir, `${id}-${f}-${tag}.png`);
  for (const id of DET) {
    const composition = await selectComposition({serveUrl, id, inputProps: {}, ...opts});
    const {spec, timeline} = composition.props;
    const starts = spec.beats.map((b, i) => (b.scene ? Math.round(timeline.beats[i].start * 30) : null));
    const ends = starts.map((s, i) => (s === null ? null : (starts.slice(i + 1).find((x) => x !== null) ?? composition.durationInFrames)));
    const shots = spec.beats.map((b, i) => (b.scene && PHYS.has(b.scene.type) ? {i, s: starts[i], e: ends[i]} : null)).filter(Boolean);
    if (!shots.length) {
      console.log(`FAIL ${id} --det: no physics shot`);
      detFailed++;
      continue;
    }
    // key frames: mid-pour, the pile building, and the settled frame of every physics shot
    const keys = [...new Set(shots.flatMap(({s, e}) => [s + 14, s + 26, s + 40, Math.min(e - 2, s + Math.round((e - s) * 0.8))].filter((f) => f >= 0 && f < e)))].sort((a, b) => a - b);
    for (const [pass, order] of [['a', keys], ['b', [...keys].reverse()]])
      for (const frame of order) await renderStill({serveUrl, composition, frame, output: file(id, frame, pass), scale: 1, inputProps: PROBE, onBrowserLog: logTo(id, pass), ...opts});
    const first = shots[0];
    const wkeys = keys.filter((f) => f < first.e);
    const walk = Array.from({length: Math.max(...wkeys) - first.s + 1}, (_, k) => first.s + k);
    await walkTo(id, composition, walk, wkeys, 'w');
    await walkTo(id, composition, walk, wkeys, 'v');
    for (const f of keys) {
      pairs.push({id, f, kind: 'cold', a: file(id, f, 'a'), b: file(id, f, 'b')});
      if (wkeys.includes(f)) pairs.push({id, f, kind: 'warm', a: file(id, f, 'w'), b: file(id, f, 'v')}, {id, f, kind: 'path', a: file(id, f, 'a'), b: file(id, f, 'w')});
    }
  }
  // the control: a fixture with no physics, its frames by both paths (only when it is in this bundle)
  const CONTROL = 'demo-p2-data-v901';
  if (ids.includes(CONTROL)) {
    const composition = await selectComposition({serveUrl, id: CONTROL, inputProps: {}, ...opts});
    const ck = [20, 40];
    for (const f of ck) await renderStill({serveUrl, composition, frame: f, output: file(CONTROL, f, 'a'), scale: 1, inputProps: PROBE, ...opts});
    await walkTo(CONTROL, composition, Array.from({length: 41}, (_, k) => k), ck, 'w');
    await walkTo(CONTROL, composition, Array.from({length: 41}, (_, k) => k), ck, 'v');
    for (const f of ck) pairs.push({id: CONTROL, f, kind: 'control', a: file(CONTROL, f, 'a'), b: file(CONTROL, f, 'w')}, {id: CONTROL, f, kind: 'control2', a: file(CONTROL, f, 'w'), b: file(CONTROL, f, 'v')});
  }
  const py = execFileSync('python3', ['-c', `
import json, sys
import numpy as np
from PIL import Image
out = []
for p in json.load(sys.stdin):
    a = np.asarray(Image.open(p['a']).convert('RGBA'), dtype=np.int16)
    b = np.asarray(Image.open(p['b']).convert('RGBA'), dtype=np.int16)
    same = a.shape == b.shape
    d = np.abs(a - b) if same else None
    out.append({**p, 'same': bool(same and int(d.max()) == 0), 'px': int((d.max(axis=2) > 0).sum()) if same else -1, 'max': int(d.max()) if same else -1})
print(json.dumps(out))
`], {input: JSON.stringify(pairs), encoding: 'utf8', maxBuffer: 16 << 20});
  const res = JSON.parse(py);
  // THE decisive check: the physics state every render drew, by its hash, the same on every path (cold in order, cold
  // reversed, two walking pages): a world that diverged by one bit anywhere fails here, whatever the pixels show
  let compared = 0;
  for (const [k, e] of states) {
    const tags = Object.keys(e);
    const all = new Set(tags.flatMap((t) => [...e[t]]));
    if (tags.length < 2 && all.size < 2) continue;
    compared++;
    if (all.size > 1) {
      console.log(`FAIL det state ${k}: ${[...all].join(' / ')} on ${tags.join(', ')}: the world diverged`);
      detFailed++;
    }
  }
  console.log(compared ? `ok   det state: ${compared} physics frames drawn by two or more paths, every one the same state hash` : 'FAIL det state: no physics state was logged (kit/phys.tsx physLog)');
  if (!compared) detFailed++;
  // the pixels. The same frame on one path (cold twice) must match every pixel in the p2 check (VS_DET_STRICT=1); the Mac's
  // GPU is not bit-stable even there (2 pixels one level apart, the first local run: a note off CI). Across pages that
  // render a whole run (renderFrames) the cloud showed 2-96 pixels ONE grey level apart, on the no-physics control too, with
  // the state hashes equal: one level on 1 % of the frame at most is the rasterizer (a body that moved differs by a hundred).
  const strict = process.env.VS_DET_STRICT === '1';
  const NOISE_PX = 64;
  const NOISE_MAX = 2;
  const PATH_MAX = 1;
  const PATH_PX = 20736;
  const LABEL = {cold: 'cold twice (in order, reversed)', warm: 'two pages walking the shot', path: 'cold against walked (renderStill vs renderFrames)', control: 'CONTROL, no physics: cold against walked', control2: 'CONTROL, no physics: two pages walking'};
  let noisy = 0;
  for (const r of res) {
    const what = `${r.id} frame ${r.f} ${LABEL[r.kind]}`;
    if (r.kind.startsWith('control')) {
      console.log(`     det ${what}: ${r.same ? 'pixel-identical' : `${r.px} pixels differ (max ${r.max})`}`);
      continue;
    }
    if (r.same) {
      console.log(`ok   det ${what}: pixel-identical`);
      continue;
    }
    if (r.kind !== 'cold' && r.px >= 0 && r.max <= PATH_MAX && r.px <= PATH_PX) {
      console.log(`ok   det ${what}: ${r.px} pixel${r.px === 1 ? '' : 's'} one level apart (the rasterizer; the state hashes match)`);
      continue;
    }
    const noise = r.kind === 'cold' && r.px >= 0 && r.px <= NOISE_PX && r.max <= NOISE_MAX;
    if (noise && !strict) {
      noisy++;
      console.log(`ok   det ${what}: ${r.px} pixel${r.px === 1 ? '' : 's'} differ by ${r.max} level${r.max === 1 ? '' : 's'} (the Mac GPU's noise, not a moved body)`);
      continue;
    }
    console.log(`FAIL det ${what}: ${r.px} pixels differ (max ${r.max})${noise ? ' (strict: the same frame cold twice must match every pixel)' : ''}`);
    detFailed++;
  }
  if (noisy) console.log(`     (note) ${noisy} cold comparison${noisy === 1 ? '' : 's'} with the Mac GPU's noise only`);
  fs.writeFileSync(path.join(detDir, 'report.json'), JSON.stringify(res, null, 1));
  console.log(`physics determinism: ${compared} state hashes and ${res.filter((r) => !r.kind.startsWith('control')).length} pixel comparisons, ${detFailed} failed`);
}

// the WHOLE film's P2 guards (tools/ci/guards.mjs p2Lines: what check.mjs runs on every P2 film since the p2 prove run,
// 2026-10-26): every fixture sampled every 6 frames through the probes; a P2 line on a fixture fails the job (the fixtures are
// the kit's good examples, so they are the calibration). `--no-film` skips it.
let filmFailed = 0;
let driftFailed = 0;
const REPEAT = new Set((process.argv.find((a) => a.startsWith('--repeat='))?.slice(9) ?? '').split(',').filter(Boolean));
/** two runs of the same film's guards: {hard: what decides a code (the lines, a sample's hues or clash count), soft: raw
 *  counts that differ ("p2 f48 core 3268/3271")} */
const DECIDES = new Set(['hues', 'clash']);
const driftOf = (a, b) => {
  const hard = [];
  const soft = [];
  for (const pass of ['obj', 'fig', 'pic', 'p2']) {
    const x = a[pass] ?? [];
    const y = b[pass] ?? [];
    if (x.length !== y.length) hard.push(`${pass}: ${x.length} vs ${y.length} samples`);
    for (let i = 0; i < Math.min(x.length, y.length); i++)
      for (const k of new Set([...Object.keys(x[i] ?? {}), ...Object.keys(y[i] ?? {})])) {
        const u = JSON.stringify(x[i]?.[k]);
        const v = JSON.stringify(y[i]?.[k]);
        if (u !== v) (pass === 'p2' && DECIDES.has(k) ? hard : soft).push(`${pass} f${x[i]?.f ?? i} ${k} ${String(u).slice(0, 24)}/${String(v).slice(0, 24)}`);
      }
  }
  if (a.lines.map((l) => l.line).join('\n') !== b.lines.map((l) => l.line).join('\n')) hard.push('the lines');
  return {hard, soft};
};
if (!process.argv.includes('--no-film')) {
  const opts = {...renderOpts(), logLevel: 'error'};
  const browser = await openBrowser('chrome', opts);
  const P2_CODES = /^(HUE_TWO|EMPTY_P2|TEXT_EDGE|TEXT_SUB|TEXT_COVER|TEXT_CLASH|HOOK_FRAME0) /;
  const report = {};
  try {
    for (const id of ids) {
      const composition = await selectComposition({serveUrl, id, inputProps: {}, ...opts, puppeteerInstance: browser});
      const {spec, timeline} = composition.props;
      const shots2 = planShots(spec, timeline).map((p, k) => ({k, type: p.spec.type ?? '?', start: p.from, end: p.to}));
      process.env.VS_GUARDS_KEEP = '1';
      let res;
      try {
        res = await reviewFilm({id, serveUrl, composition, browser, renderFrames, opts, concurrency, shots: shots2});
      } catch (e) {
        console.log(`FAIL ${id} film guards did not run: ${String(e?.message ?? e).split('\n')[0]}`);
        filmFailed++;
        continue;
      }
      const p2 = res.lines.filter((l) => P2_CODES.test(l.line));
      // the evidence: the "pic" and "txt" samples of every flagged run's first frame, beside the stills
      const gdir = path.join(root, 'out', `guards-${id}`);
      for (const l of p2) {
        const sec = Number(/ (\d+(?:\.\d)?)-/.exec(l.line)?.[1] ?? (/^HOOK_FRAME0/.test(l.line) ? 0 : NaN));
        if (!Number.isFinite(sec)) continue;
        const f = Math.round((sec * 30) / 6) * 6;
        for (const mode of ['pic', 'txt', 'bare']) {
          const src = path.join(gdir, `${mode}-${f}.png`);
          if (fs.existsSync(src)) fs.copyFileSync(src, path.join(outDir, `diag-${id}-${l.line.split(' ')[0]}-${f}-${mode}.png`));
        }
      }
      fs.rmSync(gdir, {recursive: true, force: true});
      if (REPEAT.has(id)) {
        // the same film's guards again, same bundle, same browser: every sample must come out the same
        let again = null;
        try {
          again = await reviewFilm({id, serveUrl, composition, browser, renderFrames, opts, concurrency, shots: shots2});
        } catch (e) {
          console.log(`FAIL ${id} the repeat of the film guards did not run: ${String(e?.message ?? e).split('\n')[0]}`);
          driftFailed++;
        }
        fs.rmSync(gdir, {recursive: true, force: true});
        if (again) {
          const {hard, soft} = driftOf(res, again);
          console.log(hard.length ? `FAIL ${id} film guards twice: ${hard.length} deciding field${hard.length === 1 ? '' : 's'} differ (${hard.slice(0, 10).join('; ')}): the check is not deterministic` : `ok   ${id} film guards twice: the same lines, hues and clashes on ${res.samples} samples`);
          if (soft.length) console.log(`     (note) ${soft.length} raw count${soft.length === 1 ? '' : 's'} differ between the two renders (${soft.slice(0, 8).join('; ')})`);
          driftFailed += hard.length ? 1 : 0;
        }
      }
      report[id] = {lines: res.lines.map((l) => l.line), p2: res.p2};
      console.log(`${p2.length ? 'FAIL' : 'ok  '} ${id} film guards: ${res.samples} samples${res.lines.length ? '' : ', clean'}`);
      for (const l of res.lines) console.log(`     ${P2_CODES.test(l.line) ? '' : '(note) '}${l.line}`);
      // a word under the TEXT_CLASH stop but near it (p2pixels.py CLASH_NEAR): another machine's render may push it over
      // (the WhoCard stamp read 3.1-4.9 % on the Mac and 5.1-5.7 % in the cloud): never call such a fixture clean
      const near = (res.p2 ?? []).reduce((a, x) => ((x.clashNear ?? 0) > a.share ? {share: x.clashNear, f: x.f} : a), {share: 0, f: null});
      if (near.share > 0) console.log(`     (near) TEXT_CLASH: a word at ${Math.round(near.share * 1000) / 10} % at frame ${near.f}, under the stop: a cloud render may fail it; only the p2 check on the pushed commit says clean`);
      filmFailed += p2.length ? 1 : 0;
    }
  } finally {
    await browser.close({silent: true}).catch(() => {});
  }
  fs.writeFileSync(path.join(outDir, 'film-guards.json'), JSON.stringify(report, null, 1));
  console.log(`p2 film guards: ${ids.length} fixtures, ${filmFailed} with a P2 line`);
}
if (REPEAT.size) console.log(`p2 film guards twice: ${REPEAT.size} fixture${REPEAT.size === 1 ? '' : 's'}, ${driftFailed} not deterministic`);
process.exit(stillsFailed || filmFailed || driftFailed || detFailed ? 1 : 0);
