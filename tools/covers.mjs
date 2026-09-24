// The designed Reels covers (src/Cover.tsx), many at once from one bundle:
//   node tools/covers.mjs <id...>      the covers of these videos
//   node tools/covers.mjs all          every main film (v<n>-..., not the demos, hook variants or translations)
// Writes, per id, in the spec's own theme (a black film gets a black cover, a white film a white one):
//   out/<id>.cover.png       1080x1920, the Reels cover (upload it as the cover image)
//   out/<id>.cover-4x5.png   1080x1440, the centre 3:4 that Instagram's profile grid shows (a check;
//                            the name stays for tools/gallery.mjs)
// Everything that matters sits inside that 3:4 centre (y 240..1680). Runs under tools/lock.sh.
import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ffOptions, ffmpeg, nodeEnv, renderOpts} from './platform.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const env = nodeEnv();

const argv = process.argv.slice(2);
if (!argv.length) {
  console.error('usage: node tools/covers.mjs <id...> | all');
  process.exit(1);
}
if (!process.env.VS_LOCKED) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...argv], {stdio: 'inherit', env: {...env, VS_LOCKED: '1'}});
  process.exit(r.status ?? 1);
}

const main = /^v\d+-[a-z0-9-]+$/;
const ids =
  argv[0] === 'all'
    ? fs
        .readdirSync(path.join(root, 'specs'))
        .filter((f) => f.endsWith('.json') && !f.includes('--') && f.split('.').length === 2)
        .map((f) => f.slice(0, -5))
        .filter((id) => main.test(id))
        .sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)))
    : argv;

execFileSync('node', [path.join(root, 'tools/build-index.mjs')], {stdio: ['ignore', 'ignore', 'inherit'], cwd: root, env});
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});

let failed = 0;
for (const id of ids) {
  const cover = path.join(root, `out/${id}.cover.png`);
  const grid = path.join(root, `out/${id}.cover-4x5.png`);
  try {
    const composition = await selectComposition({serveUrl, id: `${id}-cover`, ...renderOpts()});
    const tmp = cover.replace(/\.png$/, '.tmp.png');
    await renderStill({serveUrl, composition, frame: 0, output: tmp, imageFormat: 'png', ...renderOpts()});
    fs.renameSync(tmp, cover);
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', cover, '-vf', 'crop=1080:1440:0:240', '-c:v', 'png', '-update', '1', grid], ffOptions());
    console.log(`${id}: out/${id}.cover.png + out/${id}.cover-4x5.png  (${composition.props.spec.theme ?? 'dark'})`);
  } catch (e) {
    failed++;
    console.error(`${id}: ${String(e.message ?? e).split('\n')[0]}`);
  }
}
process.exit(failed ? 1 : 0);
