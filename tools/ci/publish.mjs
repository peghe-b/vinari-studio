// The end of the studio workflow (.github/workflows/studio.yml), after the voice, render and cover steps.
//
//   node tools/ci/publish.mjs package   the three deliverables, named as the site expects them, in
//                                       $RUNNER_TEMP/studio/: video.mp4, cover.png, post.json (the upload
//                                       steps take them from there as single-file artifacts)
//   node tools/ci/publish.mjs publish   commits specs/<id>.json, specs/.themes.json and specs/.studio.json
//                                       back to the branch as vinari-studio-bot, then writes the job summary
//
// Env: STUDIO_REQ (required), STUDIO_ID (the voice step's resolve; checked against the ledger),
// STUDIO_TOPIC / STUDIO_BASE / STUDIO_VOICE (the inputs, fallbacks only), RUNNER_TEMP, GITHUB_OUTPUT,
// GITHUB_STEP_SUMMARY, STUDIO_BRANCH (default GITHUB_REF_NAME, else main).
// Outside GitHub Actions (no GITHUB_ACTIONS=true) or with --dry-run, publish commits nothing: it prints
// what it would commit. tools/ci/rehearse.sh runs the whole tail locally that way.
//
// post.json: {"req", "id", "topic", "description", "tags": [3], "theme": "dark|light", "seconds",
//             "title" (the cover headline, "|" removed), "voice": "m|f"}
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ffOptions, ffprobe} from '../platform.mjs';
import {readLedger, resolve, writeLedger} from './resolve.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [cmd, ...flags] = process.argv.slice(2);
const inActions = process.env.GITHUB_ACTIONS === 'true';
const dryRun = flags.includes('--dry-run') || !inActions;
const outDir = path.join(process.env.RUNNER_TEMP || os.tmpdir(), 'studio');

const fail = (msg) => {
  console.error(`::error::${msg}`);
  process.exit(1);
};
const warn = (msg) => console.error(`::warning::${msg}`);

const which = () => {
  const r = resolve({write: false});
  if (process.env.STUDIO_ID && process.env.STUDIO_ID !== r.id) fail(`STUDIO_ID ${process.env.STUDIO_ID} differs from the ledger's ${r.id}`);
  return r;
};

// ---- package ------------------------------------------------------------------------------------
const probe = (file) => {
  const r = spawnSync(ffprobe, ['-v', 'error', '-show_streams', '-show_format', '-of', 'json', file], ffOptions({encoding: 'utf8'}));
  if (r.status !== 0) fail(`ffprobe could not read ${path.relative(root, file)}: ${(r.stderr || '').trim()}`);
  return JSON.parse(r.stdout);
};
const pngSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') fail(`${path.relative(root, file)} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

// the voice the film was really read with (vo.py falls back to edge-tts when Gemini's quota is gone)
const FEMALE = new Set(['Achernar', 'Sulafat', 'Kore', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome',
  'Laomedeia', 'Gacrux', 'Pulcherrima', 'Vindemiatrix', 'Zephyr', 'ka-GE-EkaNeural', 'en-US-AvaNeural', 'ru-RU-SvetlanaNeural']);
const voiceOf = (id, spec) => {
  let v = spec.voice;
  try {
    v = JSON.parse(fs.readFileSync(path.join(root, 'public/vo', id, 'timeline.json'), 'utf8')).voice ?? v;
  } catch {}
  if (typeof v !== 'string') return process.env.STUDIO_VOICE === 'f' ? 'f' : 'm';
  return FEMALE.has(v.replace(/^gemini:/, '')) ? 'f' : 'm';
};

const postText = (spec) => {
  const p = spec.post && typeof spec.post === 'object' ? spec.post : {};
  const description = typeof p.description === 'string' ? p.description.trim() : '';
  const tags = Array.isArray(p.tags) ? p.tags.filter((t) => typeof t === 'string').map((t) => t.trim()) : [];
  if (!description) warn('the spec has no "post.description": post.json goes out without a text');
  if (tags.length !== 3 || !tags.every((t) => /^#\S+$/.test(t))) warn(`the spec's "post.tags" should be exactly 3 hashtags, got ${JSON.stringify(p.tags ?? null)}`);
  return {description, tags};
};

const coverTitle = (spec) => {
  const t = spec.cover && typeof spec.cover === 'object' && typeof spec.cover.title === 'string' ? spec.cover.title : spec.title ?? '';
  return String(t).split('|').map((s) => s.trim()).filter(Boolean).join(' ');
};

const pack = () => {
  const {id, entry, spec} = which();
  const video = path.join(root, 'out', `${id}.mp4`);
  const cover = path.join(root, 'out', `${id}.cover.png`);
  if (!fs.existsSync(video)) fail(`no out/${id}.mp4: the render step did not finish`);
  if (!fs.existsSync(cover)) fail(`no out/${id}.cover.png: the cover step did not finish`);

  const j = probe(video);
  const v = j.streams.find((s) => s.codec_type === 'video');
  const a = j.streams.find((s) => s.codec_type === 'audio');
  const seconds = Number(Number(j.format?.duration).toFixed(1));
  if (!v || v.codec_name !== 'h264' || v.width !== 1080 || v.height !== 1920) fail(`out/${id}.mp4 is not a 1080x1920 h264 film (${v ? `${v.codec_name} ${v.width}x${v.height}` : 'no video stream'})`);
  if (!a || a.codec_name !== 'aac') fail(`out/${id}.mp4 has no AAC sound`);
  if (!(seconds > 3)) fail(`out/${id}.mp4 lasts ${j.format?.duration} s`);
  const [cw, ch] = pngSize(cover);
  if (cw !== 1080 || ch !== 1920) fail(`out/${id}.cover.png is ${cw}x${ch}, not 1080x1920`);

  const {description, tags} = postText(spec);
  const post = {
    req: process.env.STUDIO_REQ,
    id,
    topic: String(entry.topic || process.env.STUDIO_TOPIC || spec.title || ''),
    description,
    tags,
    theme: spec.theme === 'light' ? 'light' : 'dark',
    seconds,
    title: coverTitle(spec),
    voice: voiceOf(id, spec),
  };

  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
  fs.copyFileSync(video, path.join(outDir, 'video.mp4'));
  fs.copyFileSync(cover, path.join(outDir, 'cover.png'));
  fs.writeFileSync(path.join(outDir, 'post.json'), `${JSON.stringify(post, null, 1)}\n`);
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dir=${outDir}\n`);
  const mb = (f) => `${(fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(1)} MB`;
  console.log(`package: ${outDir}\n  video.mp4  ${v.width}x${v.height} ${seconds} s  ${mb('video.mp4')}\n  cover.png  ${cw}x${ch}  ${mb('cover.png')}\n  post.json  ${JSON.stringify(post)}`);
};

// ---- publish: the ledger back to the branch, then the summary ------------------------------------
const git = (...args) => execFileSync('git', args, {cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe']}).trim();
const gitShow = (rev, rel) => {
  const r = spawnSync('git', ['show', `${rev}:./${rel}`], {cwd: root, encoding: 'utf8'}); // ./ = from the studio root
  return r.status === 0 ? r.stdout : null;
};
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const readText = (rel) => {
  try {
    return fs.readFileSync(path.join(root, rel), 'utf8');
  } catch {
    return null;
  }
};
const parse = (text) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

// specs/.themes.json as tools/next-theme.mjs writes it
const themesBody = (about, videos) =>
  ['{', `  "about": ${JSON.stringify(about ?? '')},`, '  "videos": [', videos.map((v) => `    ${JSON.stringify({id: v.id, theme: v.theme})}`).join(',\n'), '  ]', '}', ''].join('\n');

// The looks ledger after this run, on top of the branch as it is now. The Claude step reserved the film's
// look (next-theme appends it; a redo is placed right after its original by prompt.mjs --record). When
// nobody touched the ledger meanwhile, that version is kept as it is; otherwise the film's line goes into
// the branch's ledger after the same neighbour it has here. With no line at all, next-theme records it.
const mergeThemes = ({id, ours, base, theirs}) => {
  const rel = 'specs/.themes.json';
  const mine = parse(ours);
  const line = Array.isArray(mine?.videos) ? mine.videos.find((v) => v?.id === id) : null;
  if (line && (theirs === base || theirs === null)) {
    fs.writeFileSync(path.join(root, rel), ours);
    return;
  }
  const now = parse(theirs);
  if (line && Array.isArray(now?.videos)) {
    if (!now.videos.some((v) => v?.id === id)) {
      const i = mine.videos.indexOf(line);
      const before = i > 0 ? mine.videos[i - 1].id : null;
      const at = before ? now.videos.findIndex((v) => v?.id === before) : -1;
      now.videos.splice(at >= 0 ? at + 1 : now.videos.length, 0, {id, theme: line.theme === 'light' ? 'light' : 'dark'});
      fs.writeFileSync(path.join(root, rel), themesBody(now.about, now.videos));
    }
    return;
  }
  execFileSync(process.execPath, [path.join(root, 'tools/next-theme.mjs'), id], {cwd: root, stdio: ['ignore', 'ignore', 'inherit']});
};

const commitBack = ({id, entry}) => {
  const req = process.env.STUDIO_REQ;
  const specRel = `specs/${id}.json`;
  const specBody = fs.readFileSync(path.join(root, specRel));
  // this run's versions, read before the working tree is reset to the branch
  const themesOurs = readText('specs/.themes.json');
  const themesBase = gitShow('HEAD', 'specs/.themes.json');
  const line = {
    ...entry,
    id,
    topic: entry.topic ?? process.env.STUDIO_TOPIC ?? '',
    base: entry.base !== undefined ? entry.base : process.env.STUDIO_BASE || null,
    at: entry.at || new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
  };
  const files = [specRel, 'specs/.themes.json', 'specs/.studio.json'];
  if (dryRun) {
    const mine = parse(themesOurs)?.videos?.find((v) => v?.id === id);
    console.log(`publish: dry run, nothing is committed. It would commit ${files.join(', ')} with\n  specs/.studio.json["${req}"] = ${JSON.stringify(line)}\n  specs/.themes.json: ${mine ? JSON.stringify(mine) : `no line for ${id} yet (next-theme would record it)`}${themesOurs === themesBase ? ' (unchanged from HEAD)' : ''}`);
    return {sha: null, note: 'dry run'};
  }
  // it resets the working tree to the branch: only ever in the studio's own checkout, never in a bigger repo
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], {cwd: root, encoding: 'utf8'}).stdout?.trim();
  if (!top || fs.realpathSync(top) !== fs.realpathSync(root)) fail(`the studio root ${root} is not the top of its git checkout (${top || 'none'}); nothing is committed`);
  const branch = process.env.STUDIO_BRANCH || process.env.GITHUB_REF_NAME || 'main';
  const message = `studio ${req}: ${id}\n\n${String(line.topic).slice(0, 200)}`;
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // start from the branch as it is now (someone may have pushed while the film rendered), then lay
      // this run's three files on it: the spec as written, the request's ledger line merged in, and the
      // film's line in the looks ledger (mergeThemes)
      git('fetch', '--no-tags', '--depth=1', 'origin', branch);
      git('reset', '-q', '--hard', 'FETCH_HEAD');
      fs.writeFileSync(path.join(root, specRel), specBody);
      writeLedger({...readLedger(path.join(root, 'specs/.studio.json')), [req]: line}, path.join(root, 'specs/.studio.json'));
      mergeThemes({id, ours: themesOurs, base: themesBase, theirs: readText('specs/.themes.json')});
      git('add', '--', ...files);
      if (spawnSync('git', ['diff', '--cached', '--quiet'], {cwd: root}).status === 0) return {sha: git('rev-parse', '--short', 'HEAD'), note: 'already on the branch'};
      git('-c', 'user.name=vinari-studio-bot', '-c', 'user.email=vinari-studio-bot@users.noreply.github.com', 'commit', '-q', '-m', message);
      git('push', '-q', 'origin', `HEAD:refs/heads/${branch}`);
      return {sha: git('rev-parse', '--short', 'HEAD'), note: attempt > 1 ? `pushed on try ${attempt}` : 'pushed'};
    } catch (e) {
      last = String(e.stderr || e.message).trim().split('\n').slice(-2).join(' ');
      console.error(`publish: try ${attempt} failed: ${last}`);
      sleep(2000 * attempt);
    }
  }
  // the film is already uploaded: a missing ledger line must not hide it from the site
  warn(`could not push the spec and ledgers to ${branch} (${last}); the video is delivered, but a redo of ${req} will not find its spec`);
  return {sha: null, note: `not pushed: ${last}`};
};

const md = (s) => String(s ?? '').replace(/[|<>\r\n]/g, ' ').trim();
const summary = (res, id) => {
  let post = {id};
  try {
    post = JSON.parse(fs.readFileSync(path.join(outDir, 'post.json'), 'utf8'));
  } catch {}
  const lines = [
    `### ${md(post.title) || md(post.id)}`,
    '',
    '| | |',
    '|---|---|',
    `| request | \`${md(process.env.STUDIO_REQ)}\` |`,
    `| video | \`${md(post.id)}\`, ${post.seconds ?? '?'} s, ${md(post.theme)}, voice ${md(post.voice)} |`,
    `| topic | ${md(post.topic)} |`,
    `| post | ${md(post.description)} ${md((post.tags ?? []).join(' '))} |`,
    `| ledger | ${res.sha ? `\`${res.sha}\` ` : ''}${md(res.note)} |`,
    '',
    'Artifacts: `video.mp4`, `cover.png`, `post.json` (kept 2 days).',
    '',
  ];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  else console.log(lines.join('\n'));
};

if (cmd === 'package') pack();
else if (cmd === 'publish') {
  const r = which();
  summary(commitBack(r), r.id);
}
else {
  console.error('usage: node tools/ci/publish.mjs package | publish [--dry-run]');
  process.exit(2);
}
