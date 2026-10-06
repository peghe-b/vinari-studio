// A demo's voice timeline without a voice: node tools/fake-timeline.mjs <demo-id>
// Writes public/vo/<id>/timeline.json from the letters (about 11.5 a second, tools/ci/fx.mjs estimateTimeline), so a
// silent demo ("narration": false) of new scenes, transitions and camera moves renders without a Gemini request (the
// free quota is for films). Only demo-* specs: a real film is always voiced by tools/vo.py.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {estimateTimeline} from './ci/fx.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const id = process.argv[2];
if (!id || !/^demo-[a-z0-9-]+$/.test(id)) {
  console.error('usage: node tools/fake-timeline.mjs demo-<name>   (demos only: a film is voiced by tools/vo.py)');
  process.exit(2);
}
const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
if (spec.narration !== false) {
  console.error(`${id}: a fake timeline is for a silent demo; set "narration": false (there is no voice.wav)`);
  process.exit(1);
}
const t = estimateTimeline(spec);
const dir = path.join(root, 'public', 'vo', id);
fs.mkdirSync(dir, {recursive: true});
fs.writeFileSync(path.join(dir, 'timeline.json'), `${JSON.stringify({...t, voice: 'none'}, null, 1)}\n`);
console.log(`${id}: ${t.duration.toFixed(1)} s, ${t.beats.length} beats (letters only, no voice)`);
