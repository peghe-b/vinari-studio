// The subtitle's colour over the picture under it (the owner, 2026-10-07, on v81-flood-ex: a light film's black line on a
// dark full-bleed ship photo, "barely readable: when there are frames like this, write the subtitles in white"). The line
// stays exactly the line (no shadow, no outline, no box, the same place, font and size: rule 19); only its COLOUR follows
// the picture: white (the dark film's ink #F5F5F5) over a dark picture, ink (the light film's #0B0B0B) over a light one.
//
//   node tools/subtone.mjs <id> [--spec specs/<file>.json] [--props '<json>'] [--debug]
//     make.sh runs it after the voice and the index, before the render, with the render's own --props (a --light or
//     --silent copy is measured in its own look and size), then build-index again, which embeds the result.
//   node tools/subtone.mjs --test     the decision's self-test (no browser)
//
// How: one bundle, one browser, the film sampled every STEP frames (6 a second) at SCALE with the input prop "subProbe":
// Promo draws everything but the line (the meta bar and the lens stay) and puts a bar as wide as the line on screen on
// the frame's top edge (layers/Subtitles.tsx PROBE_BAR), so the box measured is that line's own width, not the whole
// 754 px band, and a frame with no bar has no line (it does not vote). The box: the line's width plus MARGIN_X each side,
// its Mtavruli letters (about 0.40 size over the centre to 0.35 under it: 1477..1520 at 58 px) plus MARGIN_Y; the same
// box at the 16:9 frame's line (L.subtitleYWide, centred on 540) from the same frames, for Wide.tsx. Python (numpy +
// Pillow, requirements.txt, as check.mjs) reads the PNGs: relative luminance per pixel (WCAG) and the share of the box
// each colour reaches READ_MIN (and READ_KEEP) on. `follow()` walks the samples: a NEW line (the bar appears or its
// width changes) takes the colour `decide()` picks, the one that contrasts more, with the theme's own as the tie-break;
// a line on screen KEEPS its colour while it still reads (3:1 on KEEP of its box) and changes only when the picture
// under it makes it unreadable (a cut, a photo sliding in under it: about 2 % of the 223 lines measured on 9 films on
// 2026-10-07; one per line, the old design, left their first 10 to 15 frames unreadable), never on a slow drift where
// both colours read (v81's Volga brightening under „ტალახს ვეძებ." stays white). `smooth()` then drops a colour that
// holds for fewer than MIN_RUN samples (a flash, a lens glitch, a whip's blur: 3 to 8 frames), and each remaining
// change is pinned to its exact frame from the frames between the two samples (rendered too). The result is a TRACK:
// [[frame, tone], ...] from frame 0; a line takes the colour of the frame it is on (layers/Subtitles.tsx toneAt).
// renderFrames with the frame list keeps one page per tab: about 0.1 s a frame on the M1 (renderStill opened a page per
// frame: 0.5 to 0.8 s). Measured 2026-10-07: a 36 s film (216 frames) in about 20 s plus 3 s of bundle.
// Writes out/<id>.subtone.json {v, id, sig, theme, silent, scale, step, ms, track, wide, samples}; `sig` is the spec
// file and the timeline file hashed (read before the bundle), and build-index embeds the track only while both match.
// Never stops a film: on any error it warns, leaves no file, and the film renders as before (the theme's ink).
import {spawnSync} from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const self = fileURLToPath(import.meta.url);
const ROOT = path.dirname(path.dirname(self));
export const SUBTONE_V = 2;
// the frames' scale (env VS_SUBTONE_SCALE for a comparison): the widest box, 786 x 74 frame px, is 197 x 19 here; small
// keeps the cloud's software-GL frames cheap (0.25 and 0.5 gave the same colours on v81)
const SCALE = Number(process.env.VS_SUBTONE_SCALE) || 0.25;
export const STEP = 5; // frames between two samples: 6 a second
// a colour must hold for this many samples in a row (15 frames, half a second) to count; a flash (2 to 4 frames), a
// lens glitch (3 to 5) or a whip's blur (8) under the line would otherwise flick it to the other colour and back
export const MIN_RUN = 3;
const MARGIN_X = 16; // frame px either side of the line's own width
const MARGIN_Y = 10; // frame px over and under its letters
// a hard stop (env VS_SUBTONE_BUDGET, seconds) inside the render step's 110 minutes: past it the frames still to render
// are cancelled, and 15 s later a watchdog ends the process whatever it waits on: no file, the film renders in the
// theme's ink (2026-10-07: an error Remotion threw outside the awaited promise left a probe running for 14 minutes,
// holding the render lock, with Chrome asking for an index.html the clean-up had already removed)
const BUDGET_S = Number(process.env.VS_SUBTONE_BUDGET) || 600;

// ---- the decision ---------------------------------------------------------------------------------------------------
const lin = (v) => (v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
/** WCAG relative luminance of '#RRGGBB'. */
export const lumOf = (hex) => {
  const n = parseInt(hex.slice(1), 16);
  return 0.2126 * lin(((n >> 16) & 255) / 255) + 0.7152 * lin(((n >> 8) & 255) / 255) + 0.0722 * lin((n & 255) / 255);
};
const WHITE = lumOf('#F5F5F5'); // tokens.ts SUB_TONE.white (the dark film's ink)
const INK = lumOf('#0B0B0B'); // SUB_TONE.ink (the light film's ink)
// How much of the line reads: the share of the box's pixels against which a colour reaches READ_MIN:1. At 4.5 (WCAG
// AA) the two sides meet at the crossover where both colours contrast equally (Y 0.177, an sRGB grey of about 118):
// white reads on pixels up to Y_WHITE_MAX (0.164), ink on pixels from Y_INK_MIN (0.190), neither in between. So each
// pixel counts for the colour that contrasts more with it, as the owner sees it: a dark grey sea (sRGB about 100) takes
// white (5.3:1; black there is 3.4:1), a light grey tarmac (sRGB about 130) takes ink. At 3:1 the two overlapped over
// Y 0.110..0.271 and a light film kept its black line on a dark grey down to 3.0:1. On the 9 films measured on
// 2026-10-07 (223 lines) 3:1 and 4.5:1 chose the same colour for every line; they differ only on a mid grey.
// Not the mean (a dark car body under half the line and a bright sky under the rest average to a grey), not one tail
// (v78's hook, dark race-suit legs on lighter tarmac: white reads on 85 % of it, black on 55 %).
export const READ_MIN = 4.5;
export const Y_WHITE_MAX = (WHITE + 0.05) / READ_MIN - 0.05;
export const Y_INK_MIN = READ_MIN * (INK + 0.05) - 0.05;
// The theme's own colour stays unless the other reads on SWITCH_GAIN more of the box (20 points): a busy picture where
// neither reads well keeps the theme's ink instead of flipping with every frame.
export const SWITCH_GAIN = 0.2;
// A line on screen keeps its colour while it reaches READ_KEEP:1 (WCAG's minimum for large text: the line is 58 px, the
// silent one 66) on at least KEEP of its box; past that it changes when the other colour reads on SWITCH_GAIN more.
export const READ_KEEP = 3;
export const Y_WHITE_KEEP = (WHITE + 0.05) / READ_KEEP - 0.05; // 0.271
export const Y_INK_KEEP = READ_KEEP * (INK + 0.05) - 0.05; // 0.110
export const KEEP = 0.5;
// a new line: the bar's width changed by more than this (frame px; the bar is read at SCALE, 4 px a pixel)
export const WIDTH_TOL = 10;
/** y: the box's shares {fw, fi} (white and ink reach READ_MIN there); theme: the film's look. -> {tone, white, ink}. */
export const decide = (y, theme) => {
  const s = {white: y.fw, ink: y.fi};
  const own = theme === 'light' ? 'ink' : 'white';
  const other = own === 'ink' ? 'white' : 'ink';
  const tone = s[other] >= s[own] + SWITCH_GAIN ? other : own;
  return {tone, white: Math.round(s.white * 100) / 100, ink: Math.round(s.ink * 100) / 100};
};

/** samples [{f, width, y}] in frame order (width null: no line on screen; y the box's shares fw, fi at READ_MIN and kw,
 *  ki at READ_KEEP) -> [{f, tone}] (tone null where no line): a new line takes decide()'s colour, a line on screen keeps
 *  its colour while it reads on KEEP of the box. */
export const follow = (samples, theme) => {
  let cur = null;
  let width = null;
  return samples.map((x) => {
    if (x.width === null || x.width === undefined) {
      width = null;
      return {f: x.f, tone: null};
    }
    const fresh = width === null || Math.abs(x.width - width) > WIDTH_TOL;
    width = x.width;
    if (fresh || !cur) cur = decide(x.y, theme).tone;
    else {
      const [mine, other] = cur === 'white' ? [x.y.kw, x.y.ki] : [x.y.ki, x.y.kw];
      if (mine < KEEP && other >= mine + SWITCH_GAIN) cur = cur === 'white' ? 'ink' : 'white';
    }
    return {f: x.f, tone: cur};
  });
};

/** samples [{f, tone}] in frame order (tone null: no line on screen, it does not vote) -> the samples with a line, each
 *  run of one colour shorter than minRun samples turned into its neighbours' colour (shortest first, earliest on a tie). */
export const smooth = (samples, minRun = MIN_RUN) => {
  const s = samples.filter((x) => x.tone);
  const runs = [];
  for (const x of s) {
    const last = runs[runs.length - 1];
    if (last && last.tone === x.tone) last.n++;
    else runs.push({tone: x.tone, n: 1});
  }
  while (runs.length > 1) {
    let k = -1;
    for (let i = 0; i < runs.length; i++) if (runs[i].n < minRun && (k < 0 || runs[i].n < runs[k].n)) k = i;
    if (k < 0) break;
    // two colours: a run's neighbours are both the other one, and the blip joins them
    const left = k > 0 ? runs[k - 1] : null;
    const right = k + 1 < runs.length ? runs[k + 1] : null;
    const merged = {tone: runs[k].tone === 'white' ? 'ink' : 'white', n: runs[k].n + (left?.n ?? 0) + (right?.n ?? 0)};
    runs.splice(left ? k - 1 : k, (left ? 1 : 0) + 1 + (right ? 1 : 0), merged);
  }
  const out = [];
  let i = 0;
  for (const r of runs) for (let j = 0; j < r.n; j++) out.push({f: s[i++].f, tone: r.tone});
  return out;
};

/** The frames to render between two samples where the smoothed colour changes (each change is pinned to its frame). */
export const switchWindows = (smoothed, step = STEP) =>
  smoothed.flatMap((x, i) => {
    if (i === 0 || x.tone === smoothed[i - 1].tone) return [];
    const lo = Math.max(smoothed[i - 1].f, x.f - step);
    return Array.from({length: x.f - lo - 1}, (_, j) => lo + 1 + j);
  });

/** smoothed [{f, tone}] + the in-between frames' own tones (Map frame -> tone, null: no line) -> [[frame, tone], ...]
 *  from frame 0: a change starts on the earliest frame from which every frame with a line already takes the new colour. */
export const trackOf = (smoothed, between = new Map()) => {
  if (!smoothed.length) return null;
  const track = [[0, smoothed[0].tone]];
  for (let i = 1; i < smoothed.length; i++) {
    const {f, tone} = smoothed[i];
    if (tone === smoothed[i - 1].tone) continue;
    let at = f;
    for (let g = f - 1; g > smoothed[i - 1].f && between.has(g); g--) {
      const t = between.get(g);
      if (t && t !== tone) break;
      at = g;
    }
    track.push([at, tone]);
  }
  return track;
};

// ---- the file build-index reads -------------------------------------------------------------------------------------
export const subtoneFile = (root, id) => path.join(root, 'out', `${id}.subtone.json`);
export const sigOf = (specFile, timelineFile) =>
  crypto.createHash('sha1').update(fs.readFileSync(specFile)).update('\0').update(fs.readFileSync(timelineFile)).digest('hex').slice(0, 16);
const okTone = (t) => t === 'white' || t === 'ink';
const okTrack = (t) =>
  Array.isArray(t) &&
  t.length > 0 &&
  t[0]?.[0] === 0 &&
  t.every((x, i) => Array.isArray(x) && Number.isInteger(x[0]) && okTone(x[1]) && (i === 0 || x[0] > t[i - 1][0]));
/** The track for Promo (types.ts SubtoneIndex), or null: no file, another version, or measured on another spec or timeline. */
export const subtoneOf = (root, id, specFile, timelineFile) => {
  try {
    const j = JSON.parse(fs.readFileSync(subtoneFile(root, id), 'utf8'));
    if (j.v !== SUBTONE_V || j.id !== id || j.sig !== sigOf(specFile, timelineFile)) return null;
    if (!(j.theme === 'dark' || j.theme === 'light') || !okTrack(j.track)) return null;
    return {theme: j.theme, track: j.track.map(([f, t]) => [f, t]), ...(okTrack(j.wide) ? {wide: j.wide.map(([f, t]) => [f, t])} : {})};
  } catch {
    return null;
  }
};
/** "ink, white from 7.4 s, ink from 10.9 s" */
export const describe = (track, fps = 30) => track.map(([f, t], i) => (i ? `${t} from ${(f / fps).toFixed(1)} s` : t)).join(', ');

// ---- the probe ------------------------------------------------------------------------------------------------------
// tokens.ts by regex (as tools/formats.mjs reads metaY / subtitleY): the line's place and sizes
const tokenNum = (src, key) => {
  const m = new RegExp(`\\b${key}\\s*[:=]\\s*(\\d+(?:\\.\\d+)?)`).exec(src);
  if (!m) throw new Error(`tokens.ts: ${key} not found`);
  return Number(m[1]);
};

const MEASURE = String.raw`
import json, sys
import numpy as np
from PIL import Image
a = json.load(sys.stdin)
s = a["scale"]
P = [10, 50, 90]
def lum(px):
    c = px.astype(np.float64) / 255.0
    c = np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
    return 0.2126 * c[..., 0] + 0.7152 * c[..., 1] + 0.0722 * c[..., 2]
out = []
for st in a["stills"]:
    im = np.asarray(Image.open(st["path"]).convert("RGB"))
    H, W = im.shape[:2]
    # the probe bar on the top edge: the line's own extent (none = no line on screen)
    rows = im[: max(1, int(a["bar"] * s) - 1)].astype(int)
    hit = ((rows[..., 0] > 200) & (rows[..., 1] < 80) & (rows[..., 2] > 200)).all(axis=0)
    xs = np.nonzero(hit)[0]
    width = float((xs.max() + 1 - xs.min()) / s) if xs.size >= 2 else None
    r = {"frame": st["frame"], "width": None if width is None else round(width, 1), "boxes": {}}
    for name, b in a["boxes"].items():
        w = min(a["maxW"], width) if width is not None else a["maxW"]
        x0, x1 = b["cx"] - w / 2 - a["mx"], b["cx"] + w / 2 + a["mx"]
        X0, X1 = max(0, int(np.floor(x0 * s))), min(W, int(np.ceil(x1 * s)))
        Y0, Y1 = max(0, int(np.floor(b["y0"] * s))), min(H, int(np.ceil(b["y1"] * s)))
        y = lum(im[Y0:Y1, X0:X1, :3]).ravel()
        q = np.percentile(y, P)
        r["boxes"][name] = dict({"p%d" % p: round(float(v), 4) for p, v in zip(P, q)}, mean=round(float(y.mean()), 4),
                                fw=round(float((y <= a["yw"]).mean()), 4), fi=round(float((y >= a["yi"]).mean()), 4),
                                kw=round(float((y <= a["yw3"]).mean()), 4), ki=round(float((y >= a["yi3"]).mean()), 4))
    out.append(r)
print(json.dumps(out))
`;

const arg = (name) => {
  const i = process.argv.indexOf(name);
  if (i >= 0) return process.argv[i + 1];
  const eq = process.argv.find((a) => a.startsWith(`${name}=`));
  return eq ? eq.slice(name.length + 1) : undefined;
};
// a hook variant (<id>--h2.json) or a translation (<id>.en.json) is found by its id, as make.sh's spec_of does
const specFileOf = (id) => {
  const plain = path.join(ROOT, 'specs', `${id}.json`);
  if (fs.existsSync(plain)) return plain;
  for (const f of fs.readdirSync(path.join(ROOT, 'specs')).filter((f) => f.endsWith('.json')).sort()) {
    try {
      if (JSON.parse(fs.readFileSync(path.join(ROOT, 'specs', f), 'utf8')).id === id) return path.join(ROOT, 'specs', f);
    } catch {}
  }
  return plain;
};

const probe = async (id) => {
  const t0 = Date.now();
  const debug = process.argv.includes('--debug');
  const file = subtoneFile(ROOT, id);
  fs.rmSync(file, {force: true}); // a failure below leaves no file: the film renders with the theme's ink
  const tmp = path.join(ROOT, 'out', `subtone-${id}`);
  let serveUrl = null; // the bundle's folder (a copy of public/, about 200 MB): removed at the end, never left in $TMPDIR
  let timer = null;
  let browser = null;
  let done = false; // the file is written: a later hiccup (closing the browser) must not take it back
  // the way out when the normal one is gone: an error Remotion throws outside the awaited promise (2026-10-07 on v78:
  // renderFrames fetched the film's voice.wav, missing on this Mac, as an audio asset, and its readFile error escaped
  // as an uncaught exception), or the budget passed while something waits forever. Exit 0, so make.sh renders on.
  const bail = (why) => {
    fs.writeSync(2, `subtone: WARNING the probe ${why}; the subtitle keeps the theme's ink\n`);
    for (const p of [done ? null : file, debug ? null : tmp, serveUrl]) {
      try {
        if (p && (p !== serveUrl || /remotion-webpack-bundle-/.test(p))) fs.rmSync(p, {recursive: true, force: true});
      } catch {}
    }
    Promise.race([browser?.runner?.closeProcess?.(), new Promise((r) => setTimeout(r, 5000))])
      .catch(() => {})
      .finally(() => process.exit(0));
  };
  process.on('uncaughtException', (e) => bail(`failed (${String(e?.message ?? e).trim().split('\n')[0].slice(0, 160)})`));
  // a promise Remotion leaves behind (a page's bringToFront when the browser closes): nothing waits on it
  process.on('unhandledRejection', () => {});
  const watchdog = setTimeout(() => bail(`passed its ${BUDGET_S} s budget and was stopped`), BUDGET_S * 1000 + 15000);
  watchdog.unref();
  try {
    const specFile = arg('--spec') ?? specFileOf(id);
    const timelineFile = path.join(ROOT, 'public', 'vo', id, 'timeline.json');
    const sig = sigOf(specFile, timelineFile); // before the bundle: what the index was built from
    const fileTimeline = JSON.parse(fs.readFileSync(timelineFile, 'utf8'));
    const flags = JSON.parse(arg('--props') || '{}');
    const tok = fs.readFileSync(path.join(ROOT, 'src', 'tokens.ts'), 'utf8');
    const [sx, sy, syw, maxW, size, sizeSilent] = ['subtitleX', 'subtitleY', 'subtitleYWide', 'subtitleMaxW', 'subtitle', 'subtitleSilent'].map((k) => tokenNum(tok, k));
    const sub = fs.readFileSync(path.join(ROOT, 'src', 'layers', 'Subtitles.tsx'), 'utf8');
    const bar = tokenNum(sub, 'PROBE_BAR');

    const {bundle} = await import('@remotion/bundler');
    const {makeCancelSignal, openBrowser, renderFrames, selectComposition} = await import('@remotion/renderer');
    const {concurrency, renderOpts} = await import('./platform.mjs');
    const opts = {...renderOpts(), logLevel: 'error'};
    // three.js prints a deprecation line in every tab that mounts Wire3D (check.mjs drops it the same way)
    for (const k of ['log', 'warn', 'info']) {
      const print = console[k].bind(console);
      console[k] = (...a) => (a.some((x) => /THREE\.\w+: This module has been deprecated/.test(String(x))) ? undefined : print(...a));
    }
    // renderFrames hangs an abort listener per frame on one signal: Node's 'MaxListenersExceededWarning' is noise here
    (await import('node:events')).default.defaultMaxListeners = 1000;
    const {cancelSignal, cancel} = makeCancelSignal();
    timer = setTimeout(cancel, Math.max(1, BUDGET_S * 1000 - (Date.now() - t0)));
    const inputProps = {...flags, subProbe: true};
    serveUrl = await bundle({entryPoint: path.join(ROOT, 'src/index.ts'), publicDir: path.join(ROOT, 'public')});
    const tBundle = Date.now();
    browser = await openBrowser('chrome', opts);
    fs.rmSync(tmp, {recursive: true, force: true});
    fs.mkdirSync(tmp, {recursive: true});
    let comp;
    const shoot = async (frames) => {
      if (!frames.length) return [];
      await renderFrames({
        // muted, and Promo leaves its voice, bed and kit out in probe mode: renderFrames fetches every <Audio> the page
        // reports, and a voice.wav missing on this Mac (a film voiced elsewhere) failed the frames
        serveUrl, composition: comp, inputProps, frames, imageFormat: 'png', scale: SCALE, concurrency, outputDir: null, cancelSignal, muted: true,
        onFrameBuffer: (buf, frame) => fs.writeFileSync(path.join(tmp, `f${frame}.png`), buf),
        onStart: () => {}, onFrameUpdate: () => {}, ...opts, puppeteerInstance: browser,
      });
      return frames.map((frame) => ({frame, path: path.join(tmp, `f${frame}.png`)}));
    };
    let theme, silent, measure, samples, between;
    try {
      comp = await selectComposition({serveUrl, id, inputProps, ...opts, puppeteerInstance: browser});
      // the index must carry this very timeline (make.sh rebuilds it after the voice): else the frames are another film's
      const starts = (tl) => tl.beats.map((b) => b.chunks.map((c) => c.start).join(',')).join(';');
      if (starts(comp.props.timeline) !== starts(fileTimeline)) throw new Error('the index holds another timeline than public/vo; run node tools/build-index.mjs first');
      theme = (flags.theme ?? comp.props.spec.theme) === 'light' ? 'light' : 'dark';
      silent = Boolean(flags.silent) || comp.props.spec.narration === false;
      const fs_ = silent ? sizeSilent : size;
      const band = (cy) => ({y0: cy - 0.4 * fs_ - MARGIN_Y, y1: cy + 0.35 * fs_ + MARGIN_Y});
      const job = {scale: SCALE, bar, maxW, mx: MARGIN_X, yw: Y_WHITE_MAX, yi: Y_INK_MIN, yw3: Y_WHITE_KEEP, yi3: Y_INK_KEEP, boxes: {reels: {cx: sx, ...band(sy)}, wide: {cx: 540, ...band(syw)}}};
      measure = (stills) => {
        if (!stills.length) return new Map();
        const py = spawnSync('python3', ['-c', MEASURE], {input: JSON.stringify({...job, stills}), encoding: 'utf8', maxBuffer: 64 << 20, timeout: 180000});
        if (py.error) throw py.error;
        if (py.status !== 0) throw new Error(/No module named/.test(py.stderr ?? '') ? `python3 lacks numpy or Pillow (requirements.txt): ${py.stderr.trim().split('\n').pop()}` : (py.stderr ?? '').trim().split('\n').pop() || `python3 exit ${py.status}`);
        return new Map(JSON.parse(py.stdout).map((r) => [r.frame, r]));
      };
      const walk = (frames, m, box) => follow(frames.map((f) => ({f, width: m.get(f).width, y: m.get(f).boxes[box]})), theme);
      const grid = Array.from({length: Math.ceil(comp.durationInFrames / STEP)}, (_, i) => i * STEP);
      const seen = measure(await shoot(grid));
      const raw = {};
      const smoothed = {};
      for (const box of ['reels', 'wide']) smoothed[box] = smooth((raw[box] = walk(grid, seen, box)));
      const extra = [...new Set([...switchWindows(smoothed.reels), ...switchWindows(smoothed.wide)])].sort((a, b) => a - b);
      const got = measure(await shoot(extra));
      // the in-between frames walked together with the grid, so a line's colour carries in from the sample before
      for (const [f, r] of got) seen.set(f, r);
      const all = [...seen.keys()].sort((a, b) => a - b);
      between = {};
      for (const box of ['reels', 'wide']) {
        const toned = new Map(walk(all, seen, box).map((x) => [x.f, x.tone]));
        between[box] = new Map(extra.map((f) => [f, toned.get(f)]));
      }
      samples = {grid, got, smoothed, raw: new Map(raw.reels.map((x) => [x.f, x.tone]))};
    } finally {
      await browser.close({silent: true}).catch(() => {});
    }
    const track = trackOf(samples.smoothed.reels, between.reels);
    if (!track) throw new Error('no subtitle line found in the frames (no probe bar)');
    const wide = trackOf(samples.smoothed.wide, between.wide) ?? track;
    const ms = Date.now() - t0;
    const own = theme === 'light' ? 'ink' : 'white';
    const lit = samples.smoothed.reels;
    const otherShare = lit.filter((x) => x.tone !== own).length / Math.max(1, lit.length);
    fs.writeFileSync(file, `${JSON.stringify({v: SUBTONE_V, id, sig, theme, silent, scale: SCALE, step: STEP, ms, track, wide}, null, 1)}\n`);
    done = true;
    console.log(
      `subtone: ${describe(track)} (${Math.round(otherShare * 100)} % of the subtitled time in ${own === 'ink' ? 'white' : 'ink'}; 16:9: ${describe(wide)}); ` +
        `${samples.grid.length} + ${samples.got.size} frames in ${((ms - (tBundle - t0)) / 1000).toFixed(1)} s + bundle ${((tBundle - t0) / 1000).toFixed(1)} s = ${(ms / 1000).toFixed(1)} s -> out/${id}.subtone.json`,
    );
    if (debug) {
      // one character a sample: . no line, W / i the frame's own colour, upper case where smoothing kept it
      const kept = new Map(lit.map((x) => [x.f, x.tone]));
      const raw = samples.raw;
      const row = (f) => (raw.get(f) === null ? '.' : raw.get(f) === kept.get(f) ? (raw.get(f) === 'white' ? 'W' : 'I') : raw.get(f) === 'white' ? 'w' : 'i');
      for (let i = 0; i < samples.grid.length; i += 30) console.log(`  ${String(samples.grid[i]).padStart(5)} ${samples.grid.slice(i, i + 30).map(row).join('')}`);
      console.log('  (W / I: white / ink; lower case: a blip smoothing turned; .: no line on screen)');
      console.log(`  frames kept in out/subtone-${id}/`);
    }
  } catch (e) {
    fs.rmSync(file, {force: true});
    console.warn(`subtone: WARNING the probe failed (${String(e?.message ?? e).split('\n')[0].slice(0, 160)}); the subtitle keeps the theme's ink`);
  } finally {
    if (timer) clearTimeout(timer);
    if (!debug) fs.rmSync(tmp, {recursive: true, force: true});
    if (serveUrl && /remotion-webpack-bundle-/.test(serveUrl)) fs.rmSync(serveUrl, {recursive: true, force: true});
  }
};

// ---- the self-test --------------------------------------------------------------------------------------------------
const test = () => {
  let bad = 0;
  const check = (ok, what) => {
    if (!ok) bad++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const cases = [
    // [what, share of the box white reads on, share ink reads on, theme, expected]
    ['paper field, light film', 0, 1, 'light', 'ink'],
    ['black field, dark film', 1, 0, 'dark', 'white'],
    ['dark ship photo under the line, light film (v81)', 1, 0, 'light', 'white'],
    ['bright day scene, dark film', 0, 1, 'dark', 'ink'],
    ['light grey tarmac, light film (v81 b4c1, Y 0.2)', 0.02, 0.85, 'light', 'ink'],
    ['dark grey sea, light film (Y 0.13: black 3.4:1)', 1, 0, 'light', 'white'],
    ['a grey on the crossover neither reaches 4.5 on: the theme', 0.1, 0.1, 'dark', 'white'],
    ['dark legs on lighter tarmac, light film (v78 hook)', 0.85, 0.55, 'light', 'white'],
    ['busy photo, white a little better, light film: ink', 0.6, 0.45, 'light', 'ink'],
    ['busy photo, ink a little better, dark film: white', 0.6, 0.75, 'dark', 'white'],
  ];
  for (const [what, fw, fi, theme, want] of cases) {
    const d = decide({fw, fi}, theme);
    check(d.tone === want, `${what}: white ${d.white}, ink ${d.ink} -> ${d.tone}${d.tone === want ? '' : ` (want ${want})`}`);
  }
  check(Math.abs(Y_WHITE_MAX - 0.164) < 0.001 && Math.abs(Y_INK_MIN - 0.19) < 0.001, `4.5:1 bounds: white up to Y ${Y_WHITE_MAX.toFixed(3)}, ink from Y ${Y_INK_MIN.toFixed(3)}`);
  check(Math.abs(Y_WHITE_KEEP - 0.271) < 0.001 && Math.abs(Y_INK_KEEP - 0.11) < 0.001, `3:1 keep bounds: white up to Y ${Y_WHITE_KEEP.toFixed(3)}, ink from Y ${Y_INK_KEEP.toFixed(3)}`);
  // a line on screen keeps its colour while it reads (follow)
  const dark = {fw: 1, fi: 0, kw: 1, ki: 0};
  const grey = {fw: 0.2, fi: 0.67, kw: 1, ki: 1}; // v81's tarmac, Y about 0.2: white 3.9:1, ink 4.7:1
  const paper = {fw: 0, fi: 1, kw: 0, ki: 1};
  const photo = {fw: 0.77, fi: 0.21, kw: 0.82, ki: 0.26}; // demo-stories-b: the 1885 photo slides in under the line
  const walk = (xs, theme) => follow(xs.map(([width, y], i) => ({f: i * STEP, width, y})), theme).map((x) => (x.tone === null ? '.' : x.tone === 'white' ? 'W' : 'I')).join('');
  check(walk([[436, dark], [436, dark], [436, grey], [436, grey]], 'light') === 'WWWW', 'v81: a line that starts on the dark photo stays white while the photo brightens to a grey both read on');
  check(walk([[436, dark], [436, grey], [380, grey], [380, grey]], 'light') === 'WWII', 'the next line on that grey takes the colour that contrasts more (ink)');
  check(walk([[540, paper], [540, paper], [540, photo], [540, photo]], 'light') === 'IIWW', 'a dark photo sliding in under a black line: white at once (black reads on a quarter)');
  check(walk([[572, photo], [572, paper], [572, paper]], 'light') === 'WII', 'v78: the dark card moves off from under a white line: ink');
  check(walk([[436, dark], [null, null], [436, grey]], 'light') === 'W.I', 'after a pause the line is new, even at the same width');
  // smoothing and the track
  const seq = (str, step = STEP) => [...str].map((ch, i) => ({f: i * step, tone: ch === 'W' ? 'white' : ch === 'I' ? 'ink' : null}));
  const toStr = (xs) => xs.map((x) => (x.tone === 'white' ? 'W' : 'I')).join('');
  check(toStr(smooth(seq('IIIIIWIIIII'))) === 'IIIIIIIIIII', 'a one-sample flash under the line is a blip: dropped');
  check(toStr(smooth(seq('WWWWIIWWWW'))) === 'WWWWWWWWWW', 'a whip blur two samples long: dropped');
  check(toStr(smooth(seq('IIIIIWWWWWW'))) === 'IIIIIWWWWWW', 'a cut to a dark photo: kept');
  check(toStr(smooth(seq('IIIIWWWIIII'))) === 'IIIIWWWIIII', 'a dark shot of three samples (half a second): kept');
  check(toStr(smooth(seq('III..WWW..III'))) === 'IIIWWWIII', 'the pauses (no line) do not vote');
  check(new Set(toStr(smooth(seq('WIWIWIWIW')))).size === 1, 'a picture that flickers every sample settles on one colour');
  check(toStr(smooth(seq('WIIIIII'))) === 'IIIIIII', 'a blip on frame 0 joins the next run');
  const sm = smooth(seq('IIIIWWWW'));
  const win = switchWindows(sm);
  check(win.join(',') === '16,17,18,19', `the frames between the two samples are rendered (${win.join(',')})`);
  const t1 = trackOf(sm, new Map([[16, 'ink'], [17, 'ink'], [18, 'white'], [19, 'white']]));
  check(JSON.stringify(t1) === '[[0,"ink"],[18,"white"]]', `the change lands on the cut's own frame (${JSON.stringify(t1)})`);
  const t2 = trackOf(sm, new Map([[16, 'white'], [17, 'ink'], [18, 'white'], [19, 'white']]));
  check(JSON.stringify(t2) === '[[0,"ink"],[18,"white"]]', 'a transition that flickers: from the frame it holds');
  const gap = smooth(seq('III...WWW'));
  const t3 = trackOf(gap, new Map(switchWindows(gap).map((f) => [f, null])));
  check(JSON.stringify(t3) === '[[0,"ink"],[26,"white"]]', `over a pause the change waits for the new line (${JSON.stringify(t3)})`);
  check(trackOf(smooth(seq('....'))) === null, 'no line at all: no track (the probe then fails, no file)');
  // the file round trip: a changed timeline drops the track; an old (per-line) file is ignored
  const dir = fs.mkdtempSync(path.join(ROOT, 'out', 'subtone-test-'));
  try {
    const spec = path.join(dir, 'spec.json');
    const tl = path.join(dir, 'timeline.json');
    fs.writeFileSync(spec, '{"id":"t"}');
    fs.writeFileSync(tl, '{"beats":[]}');
    fs.mkdirSync(path.join(dir, 'out'), {recursive: true});
    const write = (j) => fs.writeFileSync(subtoneFile(dir, 't'), JSON.stringify({v: SUBTONE_V, id: 't', sig: sigOf(spec, tl), theme: 'light', ...j}));
    write({track: [[0, 'ink'], [224, 'white']], wide: [[0, 'ink']]});
    const a = subtoneOf(dir, 't', spec, tl);
    check(a?.theme === 'light' && a.track[1][0] === 224 && a.wide[0][1] === 'ink', 'a matching file is read');
    write({track: [[3, 'ink']]});
    check(subtoneOf(dir, 't', spec, tl) === null, 'a track that does not start on frame 0 is refused');
    write({track: [[0, 'ink'], [9, 'white'], [9, 'ink']]});
    check(subtoneOf(dir, 't', spec, tl) === null, 'a track out of order is refused');
    fs.writeFileSync(subtoneFile(dir, 't'), JSON.stringify({v: 1, id: 't', sig: sigOf(spec, tl), theme: 'light', chunks: [{b: 0, c: 0, start: 0.1, tone: 'white'}]}));
    check(subtoneOf(dir, 't', spec, tl) === null, 'a file of the old per-line version is ignored');
    write({track: [[0, 'ink']]});
    fs.writeFileSync(tl, '{"beats":[1]}');
    check(subtoneOf(dir, 't', spec, tl) === null, 'a changed timeline drops it');
  } finally {
    fs.rmSync(dir, {recursive: true, force: true});
  }
  console.log(bad ? `${bad} failed` : 'all ok');
  process.exit(bad ? 1 : 0);
};

if (process.argv[1] && path.resolve(process.argv[1]) === self) {
  if (process.argv.includes('--test')) test();
  else {
    const id = process.argv[2];
    if (!id || id.startsWith('--')) {
      console.error('usage: node tools/subtone.mjs <id> [--spec <file>] [--props <json>] [--debug] | --test');
      process.exit(2);
    }
    await probe(id);
    // done (or given up): leave even when something still holds the event loop (a Chrome page Remotion retries after a
    // tab closed, the bundler's esbuild service), so make.sh and the lock move on. After 3 s, so stdout is flushed.
    setTimeout(() => process.exit(0), 3000).unref();
  }
}
