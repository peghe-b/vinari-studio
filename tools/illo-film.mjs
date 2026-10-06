// A whole film's stills and a short silent mp4 in one bundle (the illustrated scenes' acceptance film, spec 10.3), without
// a voice or a Gemini request. Run it under tools/lock.sh (one Chrome job at a time).
//
//   node tools/illo-film.mjs <id> [--synthetic] [--frames a,b,c | --mid] [--looks dark,light] [--video] [--out <dir>]
//     --synthetic   write public/vo/<id>/timeline.json from the spec itself (voice "none"): a chunk lasts by its letters
//                   (0.075 s a letter + 0.32 s, at least 0.85 s), beats follow with the spec's gap and hold; then index
//                   the spec (build-index). Without it the spec's own (voiced) timeline is used.
//     --length <s>  with --synthetic: the speech scaled so the film lasts about that long (v76 was 30 s)
//     --frames      film frames to still;  --mid  one still in the middle of every scene (the default) plus frame 0
//     --video       the whole film, silent, half size (h264)
//     --out         where the stills and the mp4 go (default out/illo/<id>/)
// Stills are named <id>.<look>.<frame>.png and also tiled into <id>.<look>.sheet.png (6 a row, half size).
import {bundle} from '@remotion/bundler';
import {openBrowser, renderMedia, renderStill, selectComposition} from '@remotion/renderer';
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {renderOpts} from './platform.mjs';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const args = process.argv.slice(2);
const id = args.find((a) => !a.startsWith('--'));
const flag = (k) => args.includes(k);
const opt = (k) => {
  const i = args.indexOf(k);
  return i >= 0 ? args[i + 1] : undefined;
};
if (!id) {
  console.log('usage: node tools/illo-film.mjs <id> [--synthetic] [--frames a,b] [--looks dark,light] [--video] [--out dir]');
  process.exit(2);
}
const FPS = 30;
const spec = JSON.parse(fs.readFileSync(path.join(root, 'specs', `${id}.json`), 'utf8'));
const voDir = path.join(root, 'public/vo', id);
const tlFile = path.join(voDir, 'timeline.json');

if (flag('--synthetic')) {
  const lead = spec.leadIn ?? 0.2;
  const gap = spec.gap ?? 0.22;
  // --length <s>: scale the speech so the film lasts that long (a Gemini voice reads about 22 letters a second)
  const raw = (text) => 0.32 + 0.075 * Array.from(text).length;
  const allChunks = spec.beats.flatMap((b) => String(b.show ?? b.say).split('|').map((s) => s.trim()));
  const fixed = lead + spec.beats.reduce((a, b) => a + (b.hold ?? 0) + gap, 0) + 0.06 * allChunks.length + (spec.tail ?? 0.35);
  const want = Number(opt('--length') ?? 0);
  const k = want > fixed ? (want - fixed) / allChunks.reduce((a, c) => a + raw(c), 0) : 1;
  let t = lead;
  const beats = spec.beats.map((b, i) => {
    const chunks = String(b.show ?? b.say).split('|').map((s) => s.trim());
    const start = t;
    const cs = chunks.map((text) => {
      const d = Math.max(0.55, raw(text) * k);
      const c = {text, start: +t.toFixed(3), end: +(t + d).toFixed(3)};
      t += d + 0.06;
      return c;
    });
    const speechEnd = cs[cs.length - 1].end;
    t = speechEnd + (b.hold ?? 0) + gap;
    return {i, start: +(i === 0 ? 0 : start).toFixed(3), end: +t.toFixed(3), speechStart: cs[0].start, speechEnd, chunks: cs};
  });
  beats.forEach((b, i) => (b.end = i + 1 < beats.length ? beats[i + 1].start : b.end));
  const duration = +(t + (spec.tail ?? 0.35)).toFixed(3);
  beats[beats.length - 1].end = duration;
  fs.mkdirSync(voDir, {recursive: true});
  fs.writeFileSync(tlFile, `${JSON.stringify({id, voice: 'none', duration, beats}, null, 1)}\n`);
  console.log(`  synthetic timeline: ${beats.length} beats, ${duration.toFixed(1)} s -> ${path.relative(root, tlFile)}`);
  execFileSync('node', [path.join(root, 'tools/build-index.mjs'), id], {stdio: 'inherit'});
}
const tl = JSON.parse(fs.readFileSync(tlFile, 'utf8'));
const looks = (opt('--looks') ?? 'dark').split(',');
// the frames: given, or frame 0 and the middle of every scene (a scene starts at a beat with a "scene")
let frames;
if (opt('--frames')) frames = opt('--frames').split(',').map(Number);
else {
  const starts = spec.beats.map((b, i) => (b.scene || i === 0 ? Math.round(tl.beats[i].start * FPS) : null)).filter((x) => x !== null);
  const total = Math.ceil(tl.duration * FPS);
  frames = [0, ...starts.map((s, k) => Math.round((s + (starts[k + 1] ?? total)) / 2))];
}
const out = path.resolve(root, opt('--out') ?? path.join('out/illo', id));
fs.mkdirSync(out, {recursive: true});
const opts = {...renderOpts(), logLevel: 'error'};
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
const browser = await openBrowser('chrome', opts);
const t0 = Date.now();
const made = {};
try {
  for (const look of looks) {
    const composition = await selectComposition({serveUrl, id, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
    made[look] = [];
    for (const frame of frames) {
      const output = path.join(out, `${id}.${look}.${String(frame).padStart(4, '0')}.png`);
      await renderStill({serveUrl, composition, frame, output, scale: 0.5, inputProps: {theme: look}, ...opts, puppeteerInstance: browser});
      made[look].push(output);
    }
    console.log(`  ${look}: ${frames.length} stills`);
  }
  if (flag('--video')) {
    const composition = await selectComposition({serveUrl, id, inputProps: {theme: looks[0]}, ...opts, puppeteerInstance: browser});
    const output = path.join(out, `${id}.mp4`);
    await renderMedia({serveUrl, composition, codec: 'h264', outputLocation: output, muted: true, scale: 0.5, inputProps: {theme: looks[0]}, ...opts, puppeteerInstance: browser});
    console.log(`  video ${path.relative(root, output)}`);
  }
} finally {
  await browser.close({silent: true}).catch(() => {});
  fs.rmSync(serveUrl, {recursive: true, force: true});
}
// a contact sheet per look (Pillow)
const SHEET = String.raw`
import json, sys
from PIL import Image
a = json.load(sys.stdin)
tw = 270; th = 480; gap = 8; per = 6
for look, files in a["looks"].items():
    rows = (len(files) + per - 1) // per
    img = Image.new("RGB", (per * (tw + gap) + gap, rows * (th + gap) + gap), (92, 92, 96))
    for i, f in enumerate(files):
        im = Image.open(f).convert("RGB").resize((tw, th), Image.LANCZOS)
        img.paste(im, (gap + (i % per) * (tw + gap), gap + (i // per) * (th + gap)))
    p = a["out"] + "/" + a["id"] + "." + look + ".sheet.png"
    img.save(p, optimize=True)
    print("  sheet " + p)
`;
const py = spawnSync('python3', ['-c', SHEET], {input: JSON.stringify({looks: made, out, id}), encoding: 'utf8'});
process.stdout.write(py.stdout ?? '');
if (py.status !== 0) console.error((py.stderr ?? '').trim().split('\n').slice(-3).join('\n'));
console.log(`  ${((Date.now() - t0) / 1000).toFixed(0)} s -> ${path.relative(root, out)}/`);
