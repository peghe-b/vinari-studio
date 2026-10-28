// The designed Reels covers (src/Cover.tsx), many at once from one bundle:
//   node tools/covers.mjs <id...>      the covers of these videos
//   node tools/covers.mjs all          every main film (v<n>-..., not the demos, hook variants or translations)
// Writes, per id, always on the light paper (2026-10-26: purpose-built, black and white, never a film frame; src/Cover.tsx),
// checked on its pixels (tools/ci/cover.mjs COVER_COLOUR, COVER_GRID; a broken one is replaced by the brand card, loudly):
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
import {coverPixels} from './ci/cover.mjs';

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
// every bundle copies public/ (hundreds of MB): remove it when this run ends, or a day of runs fills the disk (2026-10-12)
process.on('exit', () => {
  try {
    fs.rmSync(serveUrl, {recursive: true, force: true});
  } catch {}
});

let failed = 0;
for (const id of ids) {
  const cover = path.join(root, `out/${id}.cover.png`);
  const grid = path.join(root, `out/${id}.cover-4x5.png`);
  try {
    const composition = await selectComposition({serveUrl, id: `${id}-cover`, ...renderOpts()});
    const tmp = cover.replace(/\.png$/, '.tmp.png');
    await renderStill({serveUrl, composition, frame: 0, output: tmp, imageFormat: 'png', ...renderOpts()});
    // black and white and inside the profile grid, on the pixels (tools/ci/cover.mjs: COVER_COLOUR, COVER_GRID). check.mjs
    // refuses the same on its still before the voice, so this is the last net: a broken cover never ships; the brand card
    // takes its place, loudly, and the film still goes out (the owner: a video must always come out)
    const bad = coverPixels(tmp);
    if (bad.length) {
      bad.forEach((x) => console.error(`${id}: ${x}`));
      const safe = {...composition.props, coverSafe: true};
      const comp2 = await selectComposition({serveUrl, id: `${id}-cover`, inputProps: safe, ...renderOpts()});
      await renderStill({serveUrl, composition: comp2, frame: 0, output: tmp, imageFormat: 'png', inputProps: safe, ...renderOpts()});
      const still = coverPixels(tmp);
      if (still.length) throw new Error(`the brand card breaks the cover's guards too: ${still.join('; ')}`);
      console.error(`${id}: WARNING the cover broke its guards above: the brand card stands in (fix the spec's "cover")`);
    }
    fs.renameSync(tmp, cover);
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', cover, '-vf', 'crop=1080:1440:0:240', '-c:v', 'png', '-update', '1', grid], ffOptions());
    console.log(`${id}: out/${id}.cover.png + out/${id}.cover-4x5.png  (${composition.props.spec.cover?.kind ?? 'no kind: picked'})`);
  } catch (e) {
    failed++;
    console.error(`${id}: ${String(e.message ?? e).split('\n')[0]}`);
  }
}
process.exit(failed ? 1 : 0);
