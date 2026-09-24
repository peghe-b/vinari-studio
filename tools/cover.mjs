// Cover images for the upload screens. out/<id>.cover.png is the DESIGNED cover (src/Cover.tsx: the lockup,
// the headline, the film's picture; spec "cover"), --plain takes the film's own frame instead. Many at once:
// node tools/covers.mjs <id...> | all (one bundle).
//   node tools/cover.mjs <id> [frame]            -> out/<id>.cover.png        1080x1920, the Reels/TikTok/Shorts cover
//                                                   out/<id>.cover-4x5.png    1080x1440, the Instagram profile-grid tile
//   node tools/cover.mjs <id> [frame] --wide     ... + out/<id>.cover-16x9.jpg 1280x720, YouTube's thumbnail size (< 2 MB)
//   node tools/cover.mjs <id> [frame] --from-video   take the frame from out/<id>.mp4 instead of rendering it
//   node tools/cover.mjs <id> [frame] --light    the light theme: out/<id>.light.cover.png (+ -4x5, -16x9),
//                                                   from out/<id>.light.mp4 with --from-video
//
// The frame: the argument, else the spec's "cover" (a frame number), else 0. The first scene is composed
// at frame 0 on purpose (CLAUDE.md: thumbnail and loop point), the meta bar is already typed, and the
// hook's subtitle is already up when the voice starts within 1 s (layers/Subtitles.tsx), so frame 0
// reads with the sound off. A spec sets "cover" when a later frame says the hook better.
// The cover is rendered losslessly from the composition (sharper than a decoded h264 frame). If the
// spec does not build right now, it falls back to the finished out/<id>.mp4 (--from-video).
// The grid tile is the centre 1080x1440 of the cover: exactly the part Instagram's 3:4 profile grid
// shows of a 9:16 Reel. Cropped with the bundled ffmpeg's png encoder.
// Rendering runs under tools/lock.sh (re-runs itself inside the lock unless a parent holds it).
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

const argv = process.argv.slice(2);
const pos = argv.filter((a) => !a.startsWith('--'));
const [id, frameArg] = pos;
const fromVideo = argv.includes('--from-video');
const wide = argv.includes('--wide');
const light = argv.includes('--light');
const plain = argv.includes('--plain'); // the old cover: the film's own frame instead of the designed one (src/Cover.tsx)
// the spec's own cover frame: any spec is found by its id (plain, a hook variant, a translation)
const specCover = () => {
  const dir = path.join(root, 'specs');
  for (const f of fs.readdirSync(dir).filter((f) => f.endsWith('.json')).sort()) {
    try {
      const j = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      if (j.id === id) return typeof j.cover === 'object' ? j.cover?.frame : j.cover;
    } catch {}
  }
  return undefined;
};
const frame = frameArg !== undefined ? Number(frameArg) : Number(specCover() ?? 0);
if (!id || !/^[a-z0-9-]+$/.test(id) || !Number.isInteger(frame) || frame < 0) {
  console.error('usage: node tools/cover.mjs <id> [frame] [--wide] [--from-video] [--light]   (a spec "cover" must be a whole frame number)');
  process.exit(1);
}
const base = light ? `${id}.light` : id; // the file names of this look
const themeProps = light ? {theme: 'light'} : undefined;
const video = out(`${base}.mp4`);
if (fromVideo && !fs.existsSync(video)) {
  console.error(`no ${rel(video)}: render it with ./make.sh ${id}, or drop --from-video`);
  process.exit(1);
}

// ---------- lock (only needed when Chrome renders) ----------
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
if ((!fromVideo || wide) && !holdsLock()) {
  const r = spawnSync(path.join(root, 'tools/lock.sh'), [process.execPath, self, ...argv], {stdio: 'inherit', env});
  process.exit(r.status ?? 1);
}

// ---------- bundled ffmpeg (tools/platform.mjs: this machine's compositor package) ----------
const direct = fs.existsSync(path.join(binDir, 'ffmpeg'));
const run = (tool, args) => {
  const [cmd, full, opts] = direct ? [path.join(binDir, tool), args, ffOptions()] : ['npx', ['remotion', tool, ...args], {cwd: root, env}];
  const r = spawnSync(cmd, full, {...opts, encoding: 'utf8', maxBuffer: 64 << 20});
  if (r.status !== 0) throw new Error(`${tool} failed (${r.status}): ${args.join(' ')}\n${r.stderr ?? ''}`);
  return r.stdout;
};
const SWS = 'flags=accurate_rnd+full_chroma_int+full_chroma_inp';
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};
const kb = (file) => `${Math.round(fs.statSync(file).size / 1024)} KB`;

const still = (composition, dst, props, at = frame) => {
  const tmp = dst.replace(/\.png$/, '.tmp.png');
  const args = ['remotion', 'still', 'src/index.ts', composition, tmp, `--frame=${at}`, '--image-format=png',
    ...cliFlags(), '--log=error'];
  if (props) args.push(`--props=${JSON.stringify(props)}`);
  const r = spawnSync('npx', args, {cwd: root, env, stdio: ['ignore', 'inherit', 'inherit']});
  if (r.status !== 0 || !fs.existsSync(tmp)) {
    fs.rmSync(tmp, {force: true});
    return false;
  }
  fs.renameSync(tmp, dst);
  return true;
};

// ---------- 1080x1920 cover ----------
const cover = out(`${base}.cover.png`);
fs.mkdirSync(out(), {recursive: true});
let how = 'rendered';
let rendered = false;
if (!fromVideo) {
  const b = spawnSync('node', [path.join(root, 'tools/build-index.mjs'), id], {cwd: root, env, encoding: 'utf8'});
  if (b.status === 0 && fs.readFileSync(path.join(root, 'src/generated/videos.ts'), 'utf8').includes(`"id": "${id}"`)) {
    rendered = plain ? still(id, cover, themeProps) : still(`${id}-cover`, cover, themeProps, 0) || still(id, cover, themeProps);
  } else {
    console.warn(`${id} does not build right now:\n${(b.stderr || b.stdout).trim()}`);
  }
  if (!rendered) {
    if (!fs.existsSync(video)) {
      console.error(`could not render ${id} and there is no ${rel(video)} to take the frame from`);
      process.exit(1);
    }
    console.warn(`falling back to the frame in ${rel(video)}`);
  }
}
if (!rendered) {
  const tmp = out(`${base}.cover.tmp.png`);
  fs.rmSync(tmp, {force: true});
  const j = JSON.parse(run('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-show_streams', '-of', 'json', video]));
  const v = j.streams[0];
  const full = v.color_range === 'pc' || /^yuvj/.test(v.pix_fmt);
  const m601 = ['bt470bg', 'smpte170m'].includes(v.color_space);
  // frame-exact: decode from the start and keep only the n-th frame (a seek could land on a neighbour;
  // the bundled build has no select filter, trim by frame number does the same)
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', video, '-vf',
    `trim=start_frame=${frame}:end_frame=${frame + 1},scale=in_range=${full ? 'pc' : 'tv'}:in_color_matrix=${m601 ? 'bt601' : 'bt709'}:${SWS},format=rgb24`,
    '-frames:v', '1', '-c:v', 'png', '-update', '1', tmp]);
  if (!fs.existsSync(tmp)) {
    console.error(`no frame ${frame} in ${rel(video)} (is it past the end?); nothing was changed`);
    process.exit(1);
  }
  fs.renameSync(tmp, cover);
  how = `frame ${frame} of ${rel(video)}`;
}
const [cw, ch] = pngSize(cover);
console.log(`${rel(cover)}  ${cw}x${ch}  ${kb(cover)}  (${how}, frame ${frame})`);

// ---------- 1080x1440 profile-grid tile: the centre of the cover ----------
const GRID_H = Math.round((cw * 4) / 3); // 3:4
const y = Math.max(0, Math.round((ch - GRID_H) / 4) * 2);
const grid = out(`${base}.cover-4x5.png`);
run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', cover, '-vf', `crop=${cw}:${GRID_H}:0:${y}`, '-c:v', 'png', '-update', '1', grid]);
console.log(`${rel(grid)}  ${cw}x${GRID_H}  ${kb(grid)}  (centre crop, y ${y}..${y + GRID_H})`);

// ---------- 16:9 thumbnail (YouTube: 1280x720, JPEG, under 2 MB) ----------
if (wide) {
  const big = out(`${base}.cover-16x9.tmp-full.png`);
  if (!still(`${id}-wide`, big, {fit: 'band', ...themeProps})) {
    console.error(`could not render ${id}-wide (Root.tsx registers it from src/Wide.tsx for every indexed spec)`);
    process.exit(1);
  }
  const thumb = out(`${base}.cover-16x9.jpg`);
  run('ffmpeg', ['-hide_banner', '-loglevel', 'error', '-y', '-i', big, '-vf', 'scale=1280:720:flags=lanczos+accurate_rnd+full_chroma_int+full_chroma_inp,format=yuvj444p',
    '-c:v', 'mjpeg', '-q:v', '2', '-update', '1', thumb]);
  fs.rmSync(big, {force: true});
  console.log(`${rel(thumb)}  1280x720  ${kb(thumb)}`);
}
