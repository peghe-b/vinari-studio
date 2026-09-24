// Quick visual check without a full render: bundles once and writes PNG stills.
//   node tools/stills.mjs <id> [frames...]      default: the middle frame of every scene
// Output: out/stills/<id>-<frame>.png at half size (540x960).
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const [id, ...rest] = process.argv.slice(2);
if (!id) throw new Error('usage: node tools/stills.mjs <id> [frames...]');

// the subtitles live in the voice timeline: refresh both so a changed spec shows up
execFileSync('python3', [path.join(root, 'tools/vo.py'), id], {stdio: 'ignore', cwd: root}); // vo.py finds variants and translations by id
execFileSync('node', [path.join(root, 'tools/build-index.mjs'), id], {stdio: 'inherit'});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const composition = await selectComposition({serveUrl, id, ...renderOpts()});
let frames = rest.map(Number);
if (!frames.length) {
  const {spec, timeline} = composition.props;
  const starts = spec.beats.map((b, i) => (b.scene || i === 0 ? Math.round(timeline.beats[i].start * 30) : null)).filter((x) => x !== null);
  starts.push(composition.durationInFrames);
  frames = starts.slice(0, -1).map((s, i) => Math.round(s + (starts[i + 1] - s) * 0.7));
}
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
for (const frame of frames) {
  const output = path.join(root, `out/stills/${id}-${frame}.png`);
  await renderStill({serveUrl, composition, frame, output, scale: 0.5, ...renderOpts()});
  console.log(output);
}
