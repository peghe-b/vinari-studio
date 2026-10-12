// Quick visual check without a full render: bundles once and writes PNG stills.
//   node tools/stills.mjs <id> [frames...] [--light | --dark]      default: the middle frame of every scene
// Output: out/stills/<id>-<frame>.png at half size (540x960); with --light / --dark the look is forced (the input prop
// "theme", as make.sh --light) and the file is out/stills/<id>-<look>-<frame>.png.
// A silent demo (demo-*, "narration": false) is never voiced: its timeline comes from the letters (tools/fake-timeline.mjs),
// so checking a demo costs no Gemini request.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const argv = process.argv.slice(2);
const look = argv.includes('--light') ? 'light' : argv.includes('--dark') ? 'dark' : null;
const [id, ...rest] = argv.filter((a) => !a.startsWith('--'));
if (!id) throw new Error('usage: node tools/stills.mjs <id> [frames...] [--light | --dark]');

// the subtitles live in the voice timeline: refresh both so a changed spec shows up
let silentDemo = false;
try {
  silentDemo = /^demo-/.test(id) && JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8')).narration === false;
} catch {
  silentDemo = false;
}
if (silentDemo) execFileSync('node', [path.join(root, 'tools/fake-timeline.mjs'), id], {stdio: 'inherit', cwd: root});
else execFileSync('python3', [path.join(root, 'tools/vo.py'), id], {stdio: 'ignore', cwd: root}); // vo.py finds variants and translations by id
execFileSync('node', [path.join(root, 'tools/build-index.mjs'), id], {stdio: 'inherit'});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const inputProps = look ? {theme: look} : {};
const composition = await selectComposition({serveUrl, id, inputProps, ...renderOpts()});
let frames = rest.map(Number);
if (!frames.length) {
  const {spec, timeline} = composition.props;
  const starts = spec.beats.map((b, i) => (b.scene || i === 0 ? Math.round(timeline.beats[i].start * 30) : null)).filter((x) => x !== null);
  starts.push(composition.durationInFrames);
  frames = starts.slice(0, -1).map((s, i) => Math.round(s + (starts[i + 1] - s) * 0.7));
}
fs.mkdirSync(path.join(root, 'out/stills'), {recursive: true});
for (const frame of frames) {
  const output = path.join(root, `out/stills/${id}${look ? `-${look}` : ''}-${frame}.png`);
  await renderStill({serveUrl, composition, frame, output, scale: 0.5, inputProps, ...renderOpts()});
  console.log(output);
}
