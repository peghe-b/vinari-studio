// Phase 2's visual check (src/lib/p2.mjs): the SETTLED frame of every shot of every P2 fixture film (specs/demo-p2-*.json,
// silent demos: no voice request) as full 1080 x 1920 stills, ONE bundle for all of them, then the pixel guards
// (tools/ci/p2pixels.py: HUE_TWO, EMPTY, TEXT_EDGE on the text layer) and one contact sheet per fixture.
//   node tools/p2-stills.mjs [demo-p2-...]        all fixtures, or the ones named
// Output: out/p2/<id>-<frame>.png, out/p2/<id>.sheet.png, out/p2/report.json. The cloud runs it on every push of the
// branch (.github/workflows/p2-check.yml); on the 8 GB Mac only through scripts/heavy.sh (one heavy job at a time).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

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
      const inputProps = layer === 'text' ? {guardProbe: 'txt'} : {};
      const comp = layer === 'text' ? await selectComposition({serveUrl, id, inputProps, ...renderOpts()}) : composition;
      await renderStill({serveUrl, composition: comp, frame, output, scale: 1, inputProps, ...renderOpts()});
    }
    // frame 0 is held to HOOK_FRAME0 when the film opens on a hook (a fixture of another kit part is not a film's opening)
    const hook = frame === 0 && HOOKS.has(spec.beats[0]?.scene?.type);
    shots.push({id, frame, scene: sceneAt(frame), hook});
    console.log(`${id} @${frame}`);
  }
}
fs.writeFileSync(path.join(outDir, 'shots.json'), JSON.stringify(shots, null, 1));
execFileSync('python3', [path.join(root, 'tools/ci/p2pixels.py'), outDir], {stdio: 'inherit', cwd: root});
