// The end of the studio workflow (.github/workflows/studio.yml), after the voice, render and cover steps.
//
//   node tools/ci/publish.mjs package   the three deliverables, named as the site expects them, in
//                                       $RUNNER_TEMP/studio/: video.mp4, cover.png, post.json, and
//                                       thumb.jpg when it can be made (the cover 360 px wide, for the
//                                       site's grid; optional). The upload steps take them from there as
//                                       single-file artifacts
//   (STUDIO_MODE=slides: a Story set's package and commit, tools/ci/slides.mjs packageSet / publishSet)
//   node tools/ci/publish.mjs publish   commits specs/<id>.json, specs/.themes.json and specs/.studio.json, and the
//                                       film's own Film scenes (src/scenes/film/<Name>*.tsx, named after the id: one to
//                                       three) when it has them, back to the branch as vinari-studio-bot, then writes the job summary
//
// Env: STUDIO_REQ (required), STUDIO_ID (the voice step's resolve; checked against the ledger),
// STUDIO_TOPIC / STUDIO_BASE / STUDIO_VOICE (the inputs, fallbacks only), RUNNER_TEMP, GITHUB_OUTPUT,
// GITHUB_STEP_SUMMARY, STUDIO_BRANCH (default GITHUB_REF_NAME, else main).
// Outside GitHub Actions (no GITHUB_ACTIONS=true) or with --dry-run, publish commits nothing: it prints
// what it would commit. tools/ci/rehearse.sh runs the whole tail locally that way.
//
// post.json: {"req", "id", "topic", "category", "description" (ci/endings.json "postLine", a blank line, the spec's
//             post.description; and a blank line and the credit line of each CC BY real sound the film plays, while
//             ci/sounds.json "creditLines" is on, and of each CC BY / CC BY-SA archival photo it shows), "tags": [3], "theme": "dark|light", "seconds",
//             "title" (the cover headline, "|" removed), "voice": "m|f",
//             "voiceSource": "gemini|edge" (the timeline's voice; null without one), "voiceModel" (the Gemini model,
//             or the edge-tts voice, e.g. "ka-GE-GiorgiNeural"), "geminiOut": true when vo.py's quota note
//             out/ci/voice-quota.json exists without "why": "gemini_error" (every Gemini model that is there
//             was out of today's quota in the voice step; a retired model's 404 does not count as a failure),
//             "music": the bed under the film ("felt-piano": every third film, tools/ci/music.mjs; a spec's own) or
//             null (the site ignores it), "engine": "api|oauth" (who wrote the script, plan step 2.1; null on the Mac;
//             the site ignores it)}
import {execFileSync, spawnSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {LEDGER, ledgerLine} from './coverlog.mjs';
import {ffOptions, ffprobe} from '../platform.mjs';
import {endingOfSpec, loadEndings} from './ending.mjs';
import {loadMusic, musicName, musicOf} from './music.mjs';
import {loadSounds, realCues} from './carinfo.mjs';
import {loadPhotos, needsCredit, photosOf} from './fx.mjs';
import {readLedger, resolve, writeLedger} from './resolve.mjs';

// the longest post text the site keeps (web/api/studio.js and web/studio.html: str(description, 1200))
const POST_MAX = 1200;
import {ownFilms} from './visual.mjs';
import {STREET, streetWords} from './streetwords.mjs';

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
/** The owner's master recipe (Instagram quality, 2026-10-22; the p2x technical judge, 2026-10-27), read from ffprobe's
 *  video stream: 1080x1920 H.264, 30/1, yuv420p, BT.709 in all three tags, tv range, level 4.2 at most. [] when it holds;
 *  `soft` lines (the level, the bit rate) only warn, so a film is never thrown away over a tag after its render was paid for. */
export const encodeProblems = (v, format = {}) => {
  const hard = [];
  const soft = [];
  if (!v) return {hard: ['no video stream'], soft};
  if (v.codec_name !== 'h264' || v.width !== 1080 || v.height !== 1920) hard.push(`${v.codec_name} ${v.width}x${v.height}, not h264 1080x1920`);
  if (v.r_frame_rate !== '30/1') hard.push(`${v.r_frame_rate} fps, not 30/1`);
  if (v.pix_fmt !== 'yuv420p') hard.push(`${v.pix_fmt}, not yuv420p`);
  const tags = [v.color_space, v.color_transfer, v.color_primaries];
  if (!tags.every((t) => t === 'bt709')) hard.push(`colour tags ${tags.join('/')}, not bt709 x3`);
  if (v.color_range !== 'tv') hard.push(`range ${v.color_range}, not tv`);
  if (Number(v.level) > 42) soft.push(`H.264 level ${(Number(v.level) / 10).toFixed(1)}, over 4.2`);
  const mbps = Number(v.bit_rate ?? format.bit_rate) / 1e6;
  if (Number.isFinite(mbps) && mbps > 0 && mbps < 4) soft.push(`${mbps.toFixed(1)} Mbps: the recipe's CRF 12 gives about 6-20`);
  if (Number.isFinite(mbps) && mbps > 21) soft.push(`${mbps.toFixed(1)} Mbps: over the 20 Mbps ceiling`);
  return {hard, soft};
};

const pngSize = (file) => {
  const b = fs.readFileSync(file);
  if (b.length < 24 || b.toString('latin1', 1, 4) !== 'PNG') fail(`${path.relative(root, file)} is not a PNG`);
  return [b.readUInt32BE(16), b.readUInt32BE(20)];
};

// the voice the film was really read with: the timeline's (vo.py falls back to edge-tts, same gender, when every
// Gemini model is out of today's free quota, unless the repo variable STUDIO_NO_EDGE is on)
const FEMALE = new Set(['Achernar', 'Sulafat', 'Kore', 'Leda', 'Aoede', 'Callirrhoe', 'Autonoe', 'Despina', 'Erinome',
  'Laomedeia', 'Gacrux', 'Pulcherrima', 'Vindemiatrix', 'Zephyr', 'ka-GE-EkaNeural', 'en-US-AvaNeural', 'ru-RU-SvetlanaNeural']);
const timelineOf = (id) => {
  try {
    const tl = JSON.parse(fs.readFileSync(path.join(root, 'public/vo', id, 'timeline.json'), 'utf8'));
    return tl && typeof tl === 'object' ? tl : null;
  } catch {
    return null;
  }
};
const voiceOf = (tl, spec) => {
  const v = typeof tl?.voice === 'string' ? tl.voice : spec.voice;
  if (typeof v !== 'string') return process.env.STUDIO_VOICE === 'f' ? 'f' : 'm';
  return FEMALE.has(v.replace(/^gemini:/, '')) ? 'f' : 'm';
};
// "gemini" and the model, or "edge" and the Microsoft voice (ka-GE-GiorgiNeural); null when there is no timeline
const sourceOf = (tl) => {
  const v = typeof tl?.voice === 'string' ? tl.voice : '';
  if (v.startsWith('gemini:')) return {voiceSource: 'gemini', voiceModel: typeof tl.model === 'string' ? tl.model : null};
  if (/^[a-z]{2}-[A-Z]{2}-\w+Neural$/.test(v)) return {voiceSource: 'edge', voiceModel: v};
  return {voiceSource: null, voiceModel: null};
};
// vo.py's note of this run's voice step (out/ci/voice-quota.json): every Gemini model was out of today's quota
const QUOTA_NOTE = process.env.VO_QUOTA_FILE || path.join(root, 'out', 'ci', 'voice-quota.json');

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
  {
    const e = encodeProblems(v, j.format);
    if (e.hard.length) fail(`out/${id}.mp4 is off the master recipe: ${e.hard.join('; ')}`);
    for (const w of e.soft) warn(`out/${id}.mp4: ${w}`);
    console.log(`encode: h264 ${v.profile ?? '?'} level ${(Number(v.level) / 10).toFixed(1)}, ${v.r_frame_rate}, ${v.pix_fmt}, bt709 ${v.color_range}, ${(Number(v.bit_rate ?? j.format?.bit_rate) / 1e6).toFixed(1)} Mbps`);
  }
  if (!a || a.codec_name !== 'aac') fail(`out/${id}.mp4 has no AAC sound`);
  if (!(seconds > 3)) fail(`out/${id}.mp4 lasts ${j.format?.duration} s`);
  const [cw, ch] = pngSize(cover);
  if (cw !== 1080 || ch !== 1920) fail(`out/${id}.cover.png is ${cw}x${ch}, not 1080x1920`);

  const {description: own, tags} = postText(spec);
  // The owner, 2026-10-02: every post starts with the comment ask ("comment „ვინარი" and we DM you the link") as its
  // own paragraph, then the film's own text. It lives in ci/endings.json ("postLine"), never in the spec: build-index
  // keeps the spec's post free of the app's name and of any call to action.
  const postLine = (spec.lang ?? 'ka') === 'ka' ? loadEndings().postLine : '';
  // a CC BY real sound (public/sfx/real.json "credit"): its credit line closes the post, one per sound. Only while
  // ci/sounds.json "creditLines" is on (build-index refuses such a cue otherwise, so none reaches here)
  const sounds = loadSounds(root);
  const credits = sounds.credits ? [...new Set(realCues(spec).map((c) => sounds.creditOf(c.name)).filter(Boolean))] : [];
  // an archival photo whose licence asks for attribution (CC BY, CC BY-SA; public/photos/photos.json "credit", shown on
  // screen by the story scenes): its credit line closes the post too, always (the licence requires it)
  {
    const photos = loadPhotos(root);
    for (const src of photosOf(spec)) {
      const info = photos[String(src).replace(/^photos\//, '').replace(/\.jpe?g$/i, '')];
      if (info && needsCredit(info.license) && typeof info.credit === 'string' && info.credit.trim() && !credits.includes(info.credit.trim())) credits.push(info.credit.trim());
    }
  }
  // The site keeps at most POST_MAX characters of it (web/api/studio.js and web/studio.html cut the end off there): the
  // film's own text gives way first, so the comment ask and a credit (CC BY: it must be there) are never what is lost
  const join = (o) => [postLine, o, credits.join('\n')].filter(Boolean).join('\n\n');
  let ownFit = own;
  if (join(own).length > POST_MAX) {
    const room = POST_MAX - join('').length - 2 - 1; // its blank line, and the "…"
    const cut = room > 0 ? own.slice(0, room) : '';
    ownFit = cut ? `${(cut.lastIndexOf(' ') > room / 2 ? cut.slice(0, cut.lastIndexOf(' ')) : cut).trimEnd()}…` : '';
  }
  const description = join(ownFit);
  const tl = timelineOf(id);
  const {voiceSource, voiceModel} = sourceOf(tl);
  // out of today's quota; not when a model failed some other way (vo.py's note says "why": "gemini_error"):
  // then the next film tries Gemini again, and the site must not say today's voices are gone
  const note = (() => {
    try {
      return JSON.parse(fs.readFileSync(QUOTA_NOTE, 'utf8'));
    } catch {
      return null;
    }
  })();
  const geminiOut = fs.existsSync(QUOTA_NOTE) && note?.why !== 'gemini_error';
  if (voiceSource === 'edge') warn(`the film is read by Microsoft's edge-tts (${voiceModel}), not Gemini${geminiOut ? ": every Gemini model was out of today's free quota" : note?.why === 'gemini_error' ? ': Gemini failed (see the voice step)' : ''}`);
  const post = {
    req: process.env.STUDIO_REQ,
    id,
    topic: String(entry.topic || process.env.STUDIO_TOPIC || spec.title || ''),
    description,
    tags,
    theme: spec.theme === 'light' ? 'light' : 'dark',
    seconds,
    title: coverTitle(spec),
    voice: voiceOf(tl, spec),
    // the category it was made for (a dice run learns its pick here; the site shows it on the tile)
    category: /^[a-z]{2,16}$/.test(String(entry.category || spec.category || '')) ? String(entry.category || spec.category) : null,
    // who really read it: the site labels an edge-tts film "Microsoft-ის ხმა" (the studio page only, never the
    // film, the cover or the post text) and warns before the next film until the quota is back (11:00 Tbilisi)
    voiceSource,
    voiceModel,
    geminiOut,
    // the bed build-index put under it (every third film, ci/music.json), by name; the site ignores it
    music: musicName(musicOf(spec, loadMusic(root))),
    // which engine wrote the script (plan step 2.1, studio.yml "script" writes out/ci/engine): "api" (the API key) or
    // "oauth" (the owner's Claude token); null on the Mac. The site ignores it
    engine: (() => {
      try {
        const e = fs.readFileSync(path.join(root, 'out/ci/engine'), 'utf8').trim();
        return e === 'api' || e === 'oauth' ? e : null;
      } catch {
        return null;
      }
    })(),
    // the film's cost (studio.yml "spend (film)", tools/ci/spend.mjs filmCost): {api, byKind, token, engine}, dollars; the site ignores it
    cost: (() => {
      try {
        const c = JSON.parse(fs.readFileSync(path.join(root, 'out/ci/cost.json'), 'utf8'));
        return Number.isFinite(c?.api) ? {api: c.api, byKind: c.byKind ?? {}, token: Number.isFinite(c.token) ? c.token : null} : null;
      } catch {
        return null;
      }
    })(),
  };

  fs.rmSync(outDir, {recursive: true, force: true});
  fs.mkdirSync(outDir, {recursive: true});
  fs.copyFileSync(video, path.join(outDir, 'video.mp4'));
  fs.copyFileSync(cover, path.join(outDir, 'cover.png'));
  // the cover's record (tools/covers.mjs): a cover whose net broke its guards too ships no thumb, and the site says so
  // („ქავერი ვერ შეიქმნა"); the film goes out all the same (the owner: a video must always come out)
  const coverRec = readCoverRecord(id);
  if (coverRec?.failed) {
    post.coverFailed = true;
    warn(`the cover failed its guards, the net's too (${(coverRec.problems ?? []).slice(0, 2).join('; ')}): the film is published without a cover thumb`);
  }
  if (coverRec?.comp) post.cover = {comp: coverRec.comp, how: coverRec.how ?? null};
  fs.writeFileSync(path.join(outDir, 'post.json'), `${JSON.stringify(post, null, 1)}\n`);
  const thumb = coverRec?.failed ? null : makeThumb(path.join(outDir, 'cover.png'), path.join(outDir, 'thumb.jpg'));
  if (process.env.GITHUB_OUTPUT) fs.appendFileSync(process.env.GITHUB_OUTPUT, `dir=${outDir}\n`);
  const mb = (f) => `${(fs.statSync(path.join(outDir, f)).size / 1e6).toFixed(1)} MB`;
  console.log(`package: ${outDir}\n  video.mp4  ${v.width}x${v.height} ${seconds} s  ${mb('video.mp4')}\n  cover.png  ${cw}x${ch}  ${mb('cover.png')}\n  thumb.jpg  ${thumb ? `${(fs.statSync(thumb).size / 1e3).toFixed(0)} KB` : 'none'}\n  post.json  ${JSON.stringify(post)}`);
};

/** out/<id>.cover.json, what tools/covers.mjs drew: {id, cat, comp, how, asset, pose, variant, sig, problems, failed} */
const readCoverRecord = (id) => {
  try {
    const r = JSON.parse(fs.readFileSync(path.join(root, 'out', `${id}.cover.json`), 'utf8'));
    return r && typeof r === 'object' ? r : null;
  } catch {
    return null;
  }
};

// thumb.jpg: the cover at 360 px wide, for the site's grid and live strip (a 1080x1920 PNG there is 1-2 MB per
// tile and about 8 MB of decoded bitmap in the phone's memory). Pillow is installed for the voice step (and
// tools/pylib has it on the Mac). Optional: without it the site shows cover.png, so a failure only warns.
const makeThumb = (src, dst) => {
  const py = [
    'import os, sys',
    "lib = os.path.join(sys.argv[3], 'tools', 'pylib')",
    'if os.path.isdir(lib): sys.path.append(lib)',
    'from PIL import Image',
    "im = Image.open(sys.argv[1]).convert('RGB')",
    'im.thumbnail((360, 640), Image.LANCZOS)',
    "im.save(sys.argv[2], 'JPEG', quality=72, optimize=True, progressive=True)",
  ].join('\n');
  const r = spawnSync('python3', ['-c', py, src, dst, root], {encoding: 'utf8'});
  if (r.status === 0 && fs.existsSync(dst) && fs.statSync(dst).size > 0 && fs.statSync(dst).size < 400e3) return dst;
  fs.rmSync(dst, {force: true});
  warn(`no thumb.jpg (${(r.stderr || r.error?.message || 'python3 failed').trim().split('\n').pop()}): the site shows cover.png in the grid`);
  return null;
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

// specs/.stills.json: {"<id>": ["<16 hex>", ...]}, the stills' difference hashes of the newest STILLS_KEEP films, one line a film
const STILLS_KEEP = 60;
export const mergeStills = (id, hashes, file = path.join(root, 'specs/.stills.json')) => {
  let led = {};
  try {
    led = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {}
  if (!led || typeof led !== 'object' || Array.isArray(led)) led = {};
  delete led[id];
  const keys = [...Object.keys(led).filter((k) => Array.isArray(led[k])), id].slice(-STILLS_KEEP);
  const all = {...led, [id]: hashes};
  fs.writeFileSync(file, `{\n${keys.map((k) => `  ${JSON.stringify(k)}: ${JSON.stringify(all[k])}`).join(',\n')}\n}\n`);
};

// One plain line of text for the public ledger: no control or invisible characters, capped.
const plain = (value, max) =>
  String(value ?? '')
    .normalize('NFKC')
    .replace(/[\p{Cf}\p{Co}\p{Cn}\u034F\u115F\u1160\u3164\uFFA0\uFE00-\uFE0F\u{E0100}-\u{E01EF}]/gu, '')
    .replace(/[\p{Cc}\p{Zl}\p{Zp}]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
// the first max characters, a "…" in place of the rest (a cut idea never passes for a whole one)
const capLine = (text, max) => ([...text].length > max ? `${[...text].slice(0, max - 1).join('').trimEnd()}…` : text);
const REQ_ID = /^r-[0-9a-z]{6,12}-[0-9a-z]{4,8}$/;

const commitBack = ({id, entry}) => {
  const req = process.env.STUDIO_REQ;
  const specRel = `specs/${id}.json`;
  const specBody = fs.readFileSync(path.join(root, specRel));
  // the film's own Film scenes (the new visuals it designed, one to three since plan step 1.3), the ones the spec uses:
  // committed with the spec, so the film and its redos render the same later. Only the files named after this id
  // (tools/ci/visual.mjs isOwnFilm; check.mjs refused any other change).
  let spec = null;
  try {
    spec = JSON.parse(specBody.toString('utf8'));
  } catch {}
  const filmFiles = (spec ? ownFilms(spec, id) : [])
    .map((n) => `src/scenes/film/${n}.tsx`)
    .filter((rel) => fs.existsSync(path.join(root, rel)))
    .map((rel) => [rel, fs.readFileSync(path.join(root, rel))]);
  // this run's versions, read before the working tree is reset to the branch
  const themesOurs = readText('specs/.themes.json');
  const themesBase = gitShow('HEAD', 'specs/.themes.json');
  // the ledger line from its known fields only, each cleaned and capped: it is committed to a public repo and
  // read into every later brief of its category, so nothing else the Claude step may have put there rides along
  const base = entry.base !== undefined ? entry.base : process.env.STUDIO_BASE || null;
  const line = {
    id,
    // a long idea (the site takes up to 5000 characters) keeps its first 300 here, marked "…": less of his typed
    // brainstorm in the repo for good (the run summary shows the same 300). post.json has it whole: a public repo's
    // artifact, so any signed-in GitHub user can fetch it until it expires (2 days), as before with shorter ideas.
    // A redo falls back to this line only when the site sent no topic (it sends none when it does not have the
    // whole idea: no copy on that device and no post.json read yet)
    topic: capLine(plain(entry.topic ?? process.env.STUDIO_TOPIC ?? '', 5000), 300),
    base: REQ_ID.test(String(base ?? '')) ? base : null,
    at: /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(String(entry.at ?? '')) ? entry.at : new Date().toISOString().replace(/\.\d{3}Z$/, 'Z'),
    ...(/^[a-z]{2,16}$/.test(String(entry.category ?? '')) ? {category: entry.category} : {}),
    ...(entry.angle ? {angle: plain(String(entry.angle).replace(/[<>`§{}]/g, ' '), 160)} : {}),
    ...(/^H\d\d$/.test(String(entry.hook ?? '')) ? {hook: entry.hook} : {}),
    ...(Array.isArray(entry.features) ? {features: entry.features.filter((f) => /^[a-z]{2,16}$/.test(String(f))).slice(0, 6)} : {}),
    // a car-knowledge film's bank facts (tools/ci/carinfo.mjs), or a stories film's one story (tools/ci/stories.mjs):
    // the next films take others
    ...(Array.isArray(entry.facts) ? {facts: entry.facts.map(String).filter((f) => /^[a-z0-9][a-z0-9-]{2,47}$/.test(f)).slice(0, 6)} : {}),
    // a dice film: the dice gives "carinfo" every other roll and "stories" every fourth, counted on these
    ...(entry.from === 'dice' ? {from: 'dice'} : {}),
    ...(Array.isArray(entry.visual) ? {visual: entry.visual.map(String).filter((t) => /^[A-Za-z0-9][A-Za-z0-9:/+._-]{0,90}$/.test(t)).slice(0, 16)} : {}),
    ...(entry.idea ? {idea: plain(String(entry.idea).replace(/[<>`§{}]/g, ' '), 160)} : {}),
    // a film that ends on the follow reminder (tools/ci/ending.mjs); a quote ending leaves the field out. Read from the
    // spec itself: the line resolve.mjs adds when --record never ran has no "ending" of its own
    ...((spec ? endingOfSpec(spec, loadEndings(root)) === 'follow' : entry.ending === 'follow') ? {ending: 'follow'} : {}),
    // the street words the film says (tools/ci/streetwords.mjs): the next films rotate them and keep the frequency (never
    // two films in a row). Read from the spec itself when it is there (the line resolve.mjs adds when --record never ran)
    ...(() => {
      const words = (spec ? streetWords(spec) : Array.isArray(entry.street) ? entry.street : []).filter((w) => typeof w === 'string' && STREET.allowed.includes(w)).slice(0, 4);
      return words.length ? {street: words} : {};
    })(),
    // the kit's first film number the line was recorded under (tools/ci/prompt.mjs --record; filmlint's self-test reads it:
    // a line from KIT_FROM on without it was made before the upgrade reached its branch). It was dropped here until 2026-10-26
    ...(Number.isInteger(entry.kit) && entry.kit > 0 && entry.kit < 100000 ? {kit: entry.kit} : {}),
    // phase 2: the news item the film told (ci/news-bank.json; tools/ci/humor.mjs NEWS_ROTATE, p2 NEWS_REPEAT read it)
    ...(() => {
      const n = spec?.news ?? entry.news;
      return typeof n === 'string' && /^[a-z0-9-]{3,60}$/.test(n) ? {news: n} : {};
    })(),
  };
  // the stills' hashes (tools/check.mjs, a film from KIT_FROM on): the next films' STILL_REPEAT reads them
  const stillHashes = (() => {
    const j = parse(readText('out/ci/stills-hash.json'));
    return j && j.id === id && Array.isArray(j.hashes) ? j.hashes.filter((h) => /^[0-9a-f]{16}$/.test(String(h))).slice(0, 40) : null;
  })();
  const files = [specRel, 'specs/.themes.json', 'specs/.studio.json', ...filmFiles.map(([rel]) => rel), ...(stillHashes?.length ? ['specs/.stills.json'] : [])];
  // the page's cover ledger (tools/ci/coverlog.mjs, 2026-10-27): the cover this film went out with, appended in a commit of
  // its own after the film's, so reverting a test film's commit never takes its line back (the gallery showed the cover)
  const coverRec = readCoverRecord(id);
  const coverLine = coverRec?.comp ? ledgerLine({req, id, cat: line.category ?? coverRec.cat, comp: coverRec.comp, asset: coverRec.asset, pose: coverRec.pose, variant: coverRec.variant, sig: coverRec.sig}) : null;
  if (dryRun) {
    const mine = parse(themesOurs)?.videos?.find((v) => v?.id === id);
    console.log(`publish: dry run, nothing is committed. It would commit ${files.join(', ')} with\n  specs/.studio.json["${req}"] = ${JSON.stringify(line)}${stillHashes?.length ? `\n  specs/.stills.json["${id}"] = ${stillHashes.length} hashes` : ''}\n  specs/.themes.json: ${mine ? JSON.stringify(mine) : `no line for ${id} yet (next-theme would record it)`}${themesOurs === themesBase ? ' (unchanged from HEAD)' : ''}${coverLine ? `\n  then, in a commit of its own, ${LEDGER} += ${JSON.stringify({...coverLine, sig: coverLine.sig ? '…' : null})}` : ''}`);
    return {sha: null, note: 'dry run'};
  }
  // it resets the working tree to the branch: only ever in the studio's own checkout, never in a bigger repo
  const top = spawnSync('git', ['rev-parse', '--show-toplevel'], {cwd: root, encoding: 'utf8'}).stdout?.trim();
  if (!top || fs.realpathSync(top) !== fs.realpathSync(root)) fail(`the studio root ${root} is not the top of its git checkout (${top || 'none'}); nothing is committed`);
  const branch = process.env.STUDIO_BRANCH || process.env.GITHUB_REF_NAME || 'main';
  // the id only: a typed topic stays out of the commit message (the ledger keeps it for redos)
  const message = `studio ${req}: ${id}`;
  let last = '';
  for (let attempt = 1; attempt <= 5; attempt++) {
    try {
      // start from the branch as it is now (someone may have pushed while the film rendered), then lay
      // this run's three files on it: the spec as written, the request's ledger line merged in, and the
      // film's line in the looks ledger (mergeThemes)
      git('fetch', '--no-tags', '--depth=1', 'origin', branch);
      git('reset', '-q', '--hard', 'FETCH_HEAD');
      fs.writeFileSync(path.join(root, specRel), specBody);
      if (filmFiles.length) fs.mkdirSync(path.join(root, 'src/scenes/film'), {recursive: true});
      for (const [rel, body] of filmFiles) fs.writeFileSync(path.join(root, rel), body);
      writeLedger({...readLedger(path.join(root, 'specs/.studio.json')), [req]: line}, path.join(root, 'specs/.studio.json'));
      mergeThemes({id, ours: themesOurs, base: themesBase, theirs: readText('specs/.themes.json')});
      if (stillHashes?.length) mergeStills(id, stillHashes);
      git('add', '--', ...files);
      if (spawnSync('git', ['diff', '--cached', '--quiet'], {cwd: root}).status === 0) return {sha: git('rev-parse', '--short', 'HEAD'), note: 'already on the branch'};
      git('-c', 'user.name=vinari-studio-bot', '-c', 'user.email=vinari-studio-bot@users.noreply.github.com', 'commit', '-q', '-m', message);
      if (coverLine) {
        fs.appendFileSync(path.join(root, LEDGER), `${JSON.stringify(coverLine)}\n`);
        git('add', '--', LEDGER);
        git('-c', 'user.name=vinari-studio-bot', '-c', 'user.email=vinari-studio-bot@users.noreply.github.com', 'commit', '-q', '-m', `${message} (cover ledger)`);
      }
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
    `| read by | ${post.voiceSource === 'edge' ? `Microsoft edge-tts \`${md(post.voiceModel)}\`${post.geminiOut ? " (Gemini's free quota was out)" : ''}` : post.voiceSource === 'gemini' ? `Gemini \`${md(post.voiceModel)}\`` : '?'} |`,
    // the run page is public: the same first 300 characters the public ledger keeps, never the whole idea
    `| topic | ${md(capLine(plain(post.topic ?? '', 5000), 300))} |`,
    `| post | ${md(post.description)} ${md((post.tags ?? []).join(' '))} |`,
    `| ledger | ${res.sha ? `\`${res.sha}\` ` : ''}${md(res.note)} |`,
    '',
    'Artifacts: `video.mp4`, `cover.png`, `post.json` (kept 2 days).',
    '',
  ];
  if (process.env.GITHUB_STEP_SUMMARY) fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, lines.join('\n'));
  else console.log(lines.join('\n'));
};

// a Story set (the workflow's mode "slides", tools/ci/slides.mjs): its own package (slide-N.png, highlight.png, post.json,
// thumb.jpg) and its own commit (the set, its graphic, specs/.slides.json)
if (process.env.STUDIO_MODE === 'slides' && (cmd === 'package' || cmd === 'publish')) {
  const sl = await import('./slides.mjs');
  if (cmd === 'package') sl.packageSet(root);
  else sl.publishSet(root, {dryRun});
} else if (cmd === '--test') {
  // the self-test: the stills' ledger (specs/.stills.json) keeps the newest STILLS_KEEP films, one line each, a film's line
  // replaced by its newer hashes
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'publish-'));
  const f = path.join(dir, 'stills.json');
  try {
    mergeStills('v110-a', ['0123456789abcdef'], f);
    mergeStills('v111-b', ['fedcba9876543210', '00000000ffffffff'], f);
    mergeStills('v110-a', ['1111111111111111'], f);
    const j = JSON.parse(fs.readFileSync(f, 'utf8'));
    ok(Object.keys(j).join(',') === 'v111-b,v110-a' && j['v110-a'][0] === '1111111111111111', 'a film\'s hashes are replaced and it moves to the end');
    ok(fs.readFileSync(f, 'utf8').split('\n').length === 5, 'one line a film');
    for (let i = 0; i < STILLS_KEEP + 5; i++) mergeStills(`v${200 + i}-x`, ['0000000000000000'], f);
    const k = Object.keys(JSON.parse(fs.readFileSync(f, 'utf8')));
    ok(k.length === STILLS_KEEP && k[k.length - 1] === `v${200 + STILLS_KEEP + 4}-x`, `the newest ${STILLS_KEEP} films are kept`);
    fs.writeFileSync(f, 'not json');
    mergeStills('v300-z', ['abcdefabcdefabcd'], f);
    ok(JSON.parse(fs.readFileSync(f, 'utf8'))['v300-z'].length === 1, 'a broken ledger starts again');
    ok(plain('a\u200bb\n<c>', 10) === 'a b c' || plain('a\u200bb\n<c>', 10).length <= 10, 'plain(): one line, capped');
    {
      const good = {codec_name: 'h264', width: 1080, height: 1920, r_frame_rate: '30/1', pix_fmt: 'yuv420p', color_space: 'bt709', color_transfer: 'bt709', color_primaries: 'bt709', color_range: 'tv', level: 42, bit_rate: '9800000'};
      const e0 = encodeProblems(good);
      ok(!e0.hard.length && !e0.soft.length, 'the recipe: a level 4.2, 9.8 Mbps master holds');
      const e1 = encodeProblems({...good, level: 50, bit_rate: '2580000'});
      ok(!e1.hard.length && e1.soft.length === 2, 'the p3 films (level 5.0, 2.6 Mbps): warnings, never a lost film');
      const e2 = encodeProblems({...good, r_frame_rate: '25/1', color_primaries: 'bt470bg', pix_fmt: 'yuv444p'});
      ok(e2.hard.length === 3, 'a wrong rate, pixel format or colour tag stops the package');
    }
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  console.log(bad ? `publish: ${bad} failed` : 'publish: all ok');
  process.exit(bad ? 1 : 0);
} else if (cmd === 'encode') {
  // node tools/ci/publish.mjs encode <file.mp4>: the recipe check alone (the p2 check renders a short clip through it)
  const file = process.argv[3];
  const j = probe(path.resolve(file ?? ''));
  const v = j.streams.find((x) => x.codec_type === 'video');
  const e = encodeProblems(v, j.format);
  console.log(`encode: h264 ${v?.profile ?? '?'} level ${(Number(v?.level) / 10).toFixed(1)}, ${v?.r_frame_rate}, ${v?.pix_fmt}, ${v?.color_primaries} ${v?.color_range}, ${(Number(v?.bit_rate ?? j.format?.bit_rate) / 1e6).toFixed(1)} Mbps`);
  for (const l of [...e.hard, ...e.soft]) console.log(`  ${e.hard.includes(l) ? 'PROBLEM' : 'warn'} ${l}`);
  // a short check clip: the level is a hard line too (the recipe must be in remotion.config.ts)
  process.exit(e.hard.length || e.soft.some((l) => /level/.test(l)) ? 1 : 0);
} else if (cmd === 'package') pack();
else if (cmd === 'publish') {
  const r = which();
  summary(commitBack(r), r.id);
}
else {
  console.error('usage: node tools/ci/publish.mjs package | publish [--dry-run] | --test');
  process.exit(2);
}
