// Stills of the diagnostics promo from ONE bundle (run it through tools/lock.sh: it is a heavy job):
//   node src/navpromo3/build/stills.mjs [--every 1.5] [--frames 10,200,...] [--scale 0.5] [--comp NavCarPlay] [--tag name] [--props '{...}']
// writes out/navpromo3/stills/<tag>-<frame>.png and, with more than one frame, a contact sheet out/navpromo3/stills/<tag>.sheet.png
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from '../../../tools/platform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const arg = (name, d) => {
  const i = process.argv.indexOf(`--${name}`);
  return i > 0 ? process.argv[i + 1] : d;
};
const comp = arg('comp', 'NavCarPlay');
const scale = Number(arg('scale', '0.5'));
const tag = arg('tag', comp === 'NavCarPlay' ? 'f' : comp.toLowerCase());
const outDir = path.join(root, 'out/navpromo3/stills');
const extra = arg('props') ? JSON.parse(arg('props')) : {};
const inputProps = {audio: false, ...extra};
fs.mkdirSync(outDir, {recursive: true});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/navpromo3/index.ts'), publicDir: path.join(root, 'public')});
// every bundle copies public/ (about 200 MB): remove it when this run ends, or a day of stills fills the disk (2026-10-12)
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});
const composition = await selectComposition({serveUrl, id: comp, inputProps, ...renderOpts()});
let frames;
if (arg('frames')) frames = arg('frames').split(',').map(Number);
else {
  const every = Number(arg('every', '1.5'));
  frames = [];
  for (let s = 0; s * 30 < composition.durationInFrames; s += every) frames.push(Math.min(composition.durationInFrames - 1, Math.round(s * 30)));
}
const files = [];
for (const frame of frames) {
  const output = path.join(outDir, `${tag}-${String(frame).padStart(4, '0')}.png`);
  await renderStill({serveUrl, composition, frame, output, scale, inputProps, ...renderOpts()});
  files.push(output);
  console.log(output);
}
if (files.length > 1) {
  const sheet = path.join(outDir, `${tag}.sheet.png`);
  execFileSync('python3', [path.join(root, 'src/navpromo3/build/sheet.py'), sheet, ...files], {stdio: 'inherit'});
}
