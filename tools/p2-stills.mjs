// Phase 2's visual check (src/lib/p2.mjs): the SETTLED frame of every shot of every P2 fixture film (specs/demo-p2-*.json,
// silent demos: no voice request) as full 1080 x 1920 stills, ONE bundle for all of them, then the pixel guards
// (tools/ci/p2pixels.py: HUE_TWO, EMPTY, TEXT_EDGE on the text layer) and one contact sheet per fixture.
//   node tools/p2-stills.mjs [demo-p2-...]        all fixtures, or the ones named
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

// the WHOLE film's P2 guards (tools/ci/guards.mjs p2Lines: what check.mjs runs on every P2 film since the p2 prove run,
// 2026-10-26): every fixture sampled every 6 frames through the probes; a P2 line on a fixture fails the job (the fixtures are
// the kit's good examples, so they are the calibration). `--no-film` skips it.
let filmFailed = 0;
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
process.exit(stillsFailed || filmFailed ? 1 : 0);
