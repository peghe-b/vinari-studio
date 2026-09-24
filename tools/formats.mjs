// One render, every platform. From out/<id>.mp4 (1080x1920, loudness-normalised by make.sh):
//   node tools/formats.mjs <id>                  -> out/<id>.4x5.mp4 (1080x1350) + out/<id>.1x1.mp4 (1080x1080)
//   node tools/formats.mjs <id> --wide           ... + out/<id>.16x9.mp4 (1920x1080, composition <id>-wide)
//   node tools/formats.mjs <id> --wide --fit frame   16:9 with the whole 9:16 frame 1080 tall (default: band)
//   node tools/formats.mjs <id> --only 16x9      one format only (4x5, 1x1, 16x9; comma separated)
//   node tools/formats.mjs <id> --check [frame]  also writes out/stills/<id>.<fmt>-<frame>.png to look at
//   node tools/formats.mjs <id> --y4x5 90 --y1x1 226   move a crop window (top edge, in 1080x1920 px)
//
// 4:5 and 1:1 are cut from the finished 9:16 with the bundled ffmpeg's crop filter (that build has no
// pad/overlay). The window is centred on the band that must survive: the meta bar (L.metaY) down to the
// bottom of the subtitle line (L.subtitleY + 0.6 * T.subtitle), read from src/tokens.ts so a layout
// change moves the crop too. Their audio is copied bit for bit from out/<id>.mp4.
// 16:9 is its own render of the <id>-wide composition (src/Wide.tsx) with the same loudness pass as
// make.sh (-14 LUFS, -2 dBTP), so it matches the 9:16 when both come from the same spec.
// Video: libx264 High, yuv420p, limited-range BT.709 with full VUI tags. Renders made before
// remotion.config.ts set bt709 are yuvj420p / full range / BT.601: converted, not just re-tagged.
//
// Heavy work runs under tools/lock.sh: the script re-runs itself inside the lock unless a parent
// process already holds it (so `tools/lock.sh node tools/formats.mjs <id>` works too, no deadlock).
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {binDir, cliFlags, ffOptions, nodeEnv} from './platform.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(self));
const out = (...p) => path.join(root, 'out', ...p);
const rel = (p) => path.relative(root, p);
const env = nodeEnv();

// ---------- args ----------
const argv = process.argv.slice(2);
const id = argv[0];
const flag = (name) => argv.includes(name);
const opt = (name, dflt) => {
  const i = argv.indexOf(name);
  if (i < 0) return dflt;
  const v = argv[i + 1];
  return v === undefined || v.startsWith('--') ? dflt : v;
};
const usage = 'usage: node tools/formats.mjs <id> [--wide [--fit band|frame]] [--only 4x5,1x1,16x9] [--check [frame]] [--y4x5 N] [--y1x1 N]';
if (!id || id.startsWith('--') || !/^[a-z0-9-]+$/.test(id)) {
  console.error(usage);
  process.exit(1);
}
const FORMATS = {
  '4x5': {w: 1080, h: 1350},
  '1x1': {w: 1080, h: 1080},
  '16x9': {w: 1920, h: 1080},
};
const only = opt('--only', flag('--wide') ? '4x5,1x1,16x9' : '4x5,1x1').split(',').map((x) => x.trim()).filter(Boolean);
for (const f of only) {
  if (!FORMATS[f]) {
    console.error(`unknown format "${f}" (4x5, 1x1, 16x9)\n${usage}`);
    process.exit(1);
  }
}
const fit = opt('--fit', 'band');
if (!['band', 'frame'].includes(fit)) {
  console.error(`--fit must be band or frame, not "${fit}"`);
  process.exit(1);
}
const src = out(`${id}.mp4`);
const crops = only.filter((f) => f !== '16x9');
if (crops.length && !fs.existsSync(src)) {
  console.error(`no ${rel(src)}: render it first with ./make.sh ${id}`);
  process.exit(1);
}

// ---------- lock: one heavy job at a time on this 8 GB M1 ----------
const holdsLock = () => {
  let pid = process.ppid;
  for (let i = 0; i < 8 && pid > 1; i++) {
    let line = '';
    try {
      line = execFileSync('ps', ['-o', 'ppid=,command=', '-p', String(pid)], {encoding: 'utf8'}).trim();
    } catch {
      return false;
    }
    const m = line.match(/^(\d+)\s+(.*)$/);
    if (!m) return false;
    if (/(^|\/)lock\.sh(\s|$)/.test(m[2])) return true;
    pid = Number(m[1]);
  }
  return false;
};
if (!holdsLock()) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...argv], {stdio: 'inherit', env});
  process.exit(r.status ?? 1);
}

// ---------- the bundled ffmpeg (Remotion's; it loads its libraries from its own folder; tools/platform.mjs) ----------
const direct = fs.existsSync(path.join(binDir, 'ffmpeg'));
const run = (tool, args, {quiet = false} = {}) => {
  const [cmd, full, opts] = direct ? [path.join(binDir, tool), args, ffOptions()] : ['npx', ['remotion', tool, ...args], {cwd: root, env}];
  const r = spawnSync(cmd, full, {...opts, encoding: 'utf8', maxBuffer: 64 << 20, stdio: quiet ? 'pipe' : ['ignore', 'pipe', 'inherit']});
  if (r.status !== 0) throw new Error(`${tool} failed (${r.status}): ${args.join(' ')}\n${r.stderr ?? ''}`);
  return r.stdout;
};
const probe = (file) => {
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], {quiet: true}));
  const v = j.streams.find((x) => x.codec_type === 'video');
  return {v, duration: Number(j.format.duration)};
};

// ---------- geometry from src/tokens.ts ----------
const tokens = fs.readFileSync(path.join(root, 'src/tokens.ts'), 'utf8');
const tok = (re, dflt) => Number(tokens.match(re)?.[1] ?? dflt);
const H = tok(/export const H = (\d+)/, 1920);
const W = tok(/export const W = (\d+)/, 1080);
const metaY = tok(/metaY:\s*(\d+)/, 300);
const subY = tok(/subtitleY:\s*(\d+)/, 1195);
const subFs = tok(/subtitle:\s*(\d+)/, 58);
const bandTop = metaY - 12; // the mono caps sit at metaY; a little air above
const bandBottom = Math.ceil(subY + 0.6 * subFs + 12); // line box bottom + the text shadow
const even = (n) => 2 * Math.round(n / 2);
const windowFor = (h, override) => {
  const y = override !== undefined ? Number(override) : (bandTop + bandBottom) / 2 - h / 2;
  if (!Number.isFinite(y)) throw new Error(`crop top must be a number, got "${override}"`);
  return Math.min(H - h, Math.max(0, even(y)));
};

// ---------- colour ----------
// swscale's default YUV<->RGB path is off by ~2 levels in limited range: always ask for accurate rounding.
const SWS = 'flags=accurate_rnd+full_chroma_int+full_chroma_inp';
const colourOf = (v) => ({full: v.color_range === 'pc' || /^yuvj/.test(v.pix_fmt), m601: ['bt470bg', 'smpte170m', 'bt601'].includes(v.color_space)});
const isBt709tv = (v) => {
  const c = colourOf(v);
  return !c.full && !c.m601 && v.pix_fmt === 'yuv420p';
};
const toBt709tv = (v) => {
  if (isBt709tv(v)) return '';
  const c = colourOf(v);
  return `,scale=in_range=${c.full ? 'pc' : 'tv'}:out_range=tv:in_color_matrix=${c.m601 ? 'bt601' : 'bt709'}:out_color_matrix=bt709:${SWS}`;
};
// ffmpeg 7 takes primaries/transfer from the frames (unset after a crop), so x264 writes the VUI itself
const X264 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-profile:v', 'high', '-pix_fmt', 'yuv420p',
  '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
  '-x264-params', 'colorprim=bt709:transfer=bt709:colormatrix=bt709:range=tv'];
// the same tags on an already-encoded BT.709 stream, without re-encoding it
const VUI = ['-bsf:v', 'h264_metadata=colour_primaries=1:transfer_characteristics=1:matrix_coefficients=1:video_full_range_flag=0'];

const made = [];
const finish = (tmp, dst) => {
  fs.renameSync(tmp, dst); // never leave a half-written file where the gallery looks
  made.push(dst);
};
const secs = (t0) => `${((Date.now() - t0) / 1000).toFixed(1)} s`;

// ---------- 4:5 and 1:1: crops of the finished 9:16 ----------
const s = fs.existsSync(src) ? probe(src) : null;
if (crops.length) {
  if (!s.v || s.v.width !== W || s.v.height !== H) {
    console.error(`${rel(src)} is ${s.v?.width}x${s.v?.height}, expected ${W}x${H}`);
    process.exit(1);
  }
}
for (const f of crops) {
  const {w, h} = FORMATS[f];
  const y = windowFor(h, opt(`--y${f}`));
  const dst = out(`${id}.${f}.mp4`);
  const tmp = out(`${id}.${f}.tmp.mp4`);
  const t0 = Date.now();
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-map', '0:v:0', '-map', '0:a:0?',
    '-vf', `crop=${w}:${h}:0:${y}${toBt709tv(s.v)},format=yuv420p`, ...X264, '-c:a', 'copy', '-movflags', '+faststart', tmp]);
  finish(tmp, dst);
  console.log(`${rel(dst)}  ${w}x${h}  window y ${y}..${y + h} (meta bar ${metaY}, subtitle bottom ${bandBottom})  ${secs(t0)}`);
}

// ---------- 16:9: the <id>-wide composition (src/Wide.tsx), same loudness pass as make.sh ----------
if (only.includes('16x9')) {
  execFileSync('node', [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, env, stdio: 'inherit'});
  const raw = out(`${id}.16x9.raw.mp4`);
  const t0 = Date.now();
  const r = spawnSync('npx', ['remotion', 'render', 'src/index.ts', `${id}-wide`, raw, `--props=${JSON.stringify({fit})}`,
    ...cliFlags(), '--log=error'], {cwd: root, env, stdio: 'inherit'});
  if (r.status !== 0) {
    fs.rmSync(raw, {force: true});
    console.error(`render of ${id}-wide failed (is "${id}" in the index? node tools/build-index.mjs lists it)`);
    process.exit(1);
  }
  const w = probe(raw);
  const video = isBt709tv(w.v) ? ['-c:v', 'copy', ...VUI] : ['-vf', `${toBt709tv(w.v).slice(1)},format=yuv420p`, ...X264];
  const dst = out(`${id}.16x9.mp4`);
  const tmp = out(`${id}.16x9.tmp.mp4`);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', raw, '-map', '0:v:0', '-map', '0:a:0?', ...video,
    '-af', 'loudnorm=I=-14:TP=-2:LRA=11', '-ar', '48000', '-c:a', 'aac', '-b:a', '192k', '-movflags', '+faststart', tmp]);
  fs.rmSync(raw, {force: true});
  finish(tmp, dst);
  console.log(`${rel(dst)}  1920x1080 (fit ${fit})  ${secs(t0)}`);
  if (s && Math.abs(w.duration - s.duration) > 0.2) {
    console.warn(`  note: the 16:9 is ${w.duration.toFixed(2)} s, out/${id}.mp4 is ${s.duration.toFixed(2)} s: the spec changed after the 9:16 render.`);
    console.warn(`  Re-run ./make.sh ${id} and then this tool so every format carries the same cut.`);
  }
}

// ---------- look before shipping ----------
if (flag('--check')) {
  fs.mkdirSync(out('stills'), {recursive: true});
  const asked = Number(opt('--check', NaN));
  for (const file of [...(s ? [src] : []), ...made]) {
    const p = probe(file);
    const frame = Number.isFinite(asked) ? asked : Math.round((p.duration * 30) / 2);
    const {full, m601} = colourOf(p.v);
    const tag = path.basename(file, '.mp4').slice(id.length + 1) || '9x16';
    const png = out('stills', `${id}.${tag}-${frame}.png`);
    fs.rmSync(png, {force: true});
    run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-ss', (frame / 30).toFixed(3), '-i', file, '-frames:v', '1',
      '-vf', `scale=in_range=${full ? 'pc' : 'tv'}:in_color_matrix=${m601 ? 'bt601' : 'bt709'}:${SWS},format=rgb24`, '-c:v', 'png', '-update', '1', png]);
    console.log(fs.existsSync(png) ? `check: ${rel(png)}` : `check: no frame ${frame} in ${rel(file)}`);
  }
}
