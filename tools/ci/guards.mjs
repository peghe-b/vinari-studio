// The frame guards' review of a film's own frames (src/lib/guard.mjs; check.mjs runs it for a film from GUARD_FROM on). The
// stills the old review read (one per shot, at 70 % of it) missed what the owner saw frame by frame on 2026-10-19: v110's car
// ran off the right edge for 1.6 s between two stills, and the edge test only looked when the four corners of the picture
// band were one flat colour (a sky over a ground never is). So the film is sampled every STEP frames, quarter size, three
// times, through Promo's input prop "guardProbe":
//   obj  only the things that must stay WHOLE (lib/layer.ts OBJ: every phone, the kit's cars, a Film's own cards) on key green
//        -> EDGE_CUT: one touches the frame's edge across FAST_S or more (a fast entry, an exit, a whip may touch it);
//           SUB_BAND: one stands in the subtitle band across FAST_S or more WHILE A LINE IS ON SCREEN (Promo marks those
//           frames: PROBE_MARK; a phone rising through the band between two lines hides no word)
//   fig  only the people, the hands and the steering wheel (FIG) -> SUB_BAND the same way (a figure may be cropped by the frame)
//   pic  the picture alone (no subtitle, no meta bar) and WITHOUT Promo's breath -> STATIC_HOLD: a window of STATIC_MAX_S in one
//        shot where no frame moves farther than STILL_MAD from the window's first one (the EndCard is left out). The breath
//        keeps every long shot from standing still in the film itself; the review asks for a real event (a tap, a turn, a
//        cut) on a shot that only breathes, so STATIC_HOLD is always a note, never a stop.
// From film POLISH_FROM on (src/lib/guard.mjs (e), 2026-10-26, after v131-three-minutes) also:
//   obj  draws the figures too (FIG, but not a library staging's deliberate full-bleed part, BLEED): EDGE_CUT holds for a
//        person, a hand, a steering wheel or a flag as for a phone; META_COVER: a marked thing (obj or fig) in the meta
//        line's strip (META_BAND) across FAST_S or more
//   pic  SHARD: a thin sliver of another tone at the frame's top edge across FAST_S or more (a pillar's tip, a corner of
//        another shot); EMPTY_FRAME: the picture band almost one flat colour (under EMPTY_SHARE of it inked) on two samples
//        in a row inside one shot (the EndCard is left out)
// They stop the cloud's check from POLISH_FROM on; before it the probe draws as it did and they are notes.
// Only the marked things are measured: a phone, a car, a card, a chart, a display, a 3D canvas (OBJ) and a person, a hand, a
// wheel (FIG) in the kit and the library scenes. A Film's own card or drawing it does not mark is not seen here: the still
// review's clean-field EDGE_CUT (stillreview.py) still looks at those.
// tools/ci/guardreview.py reads the PNGs (numpy, Pillow). The lines go to check.mjs ({line, fatal}): EDGE_CUT and SUB_BAND are
// problems in the cloud from GUARD_STRICT_FROM on (the probe proves itself on the first guarded films first: notes to fix
// before that), notes on the Mac; STATIC_HOLD is a note everywhere.
//
//   node tools/ci/guards.mjs --test     the self-test of the decisions (no browser)
import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {EDGE_PX, EMPTY_SHARE, FAST_S, guardOn, META_BAND, polishOn, PROBE_KEY, PROBE_MARK, PROBE_TOL, runsOf, SHARD_AREA, STATIC_MAX_S, SUB_BAND, SUB_BAND_STAGE, WHOLE_STAGE} from '../../src/lib/guard.mjs';
import {filmKey} from '../../src/scenes/illo/wardrobe.mjs';
import {P2_TEXT_X, p2On} from '../../src/lib/p2.mjs';

const self = fileURLToPath(import.meta.url);
const root = path.dirname(path.dirname(path.dirname(self)));
/** frames between two probe samples (5 a second): a touch seen on three samples in a row lasted FAST_S (12 frames) or more */
export const STEP = 6;
export const SCALE = 0.25;
/** marked pixels (at SCALE) inside the subtitle band that count as standing in it */
export const BAND_PX = 6;
/** samples a static window spans: STATIC_MAX_S and a little (13 x 6 = 78 frames, 2.6 s) */
export const LAG = Math.ceil((STATIC_MAX_S * 30) / STEP);
/** the most a frame of a still window may differ from its first frame (mean absolute grey 0..255 at 108 x 192), measured
 *  without the breath (the "pic" pass draws none). On v110 with estimated timings (2026-10-19, without the guards): the step
 *  shot that held four seconds 0.85 at the least (only its phone's float moved), the flat phone under the 1 % drift 1.5,
 *  the cabin's road in snow 1.3 (with the breath the step shot read 3.5: a breath alone never trips this) */
export const STILL_MAD = 1.0;
/** From this film on the guards' lines stop the cloud's check (before it they are lines to fix, not a stop). */
export const GUARD_STRICT_FROM = 120;
export const guardStrict = (film) => {
  const n = typeof film === 'number' ? film : filmKey(film);
  return Number.isFinite(n) && n >= GUARD_STRICT_FROM && n < 100000;
};

const SIDE = {l: 'left', r: 'right', t: 'top', b: 'bottom'};
const sec = (f, fps) => (f / fps).toFixed(1);
/** shots [{k, type, start, end}] -> the shot a frame is in */
const shotAt = (shots, f) => shots.find((s) => f >= s.start && f < s.end) ?? null;
const where = (shots, a, z, fps) => {
  const s = shotAt(shots, a);
  return `${sec(a, fps)}-${sec(z, fps)} s${s ? ` (shot ${s.k + 1}, ${s.type})` : ''}`;
};

/** a line for check.mjs: `fatal` = may stop the cloud's check (from GUARD_STRICT_FROM on) */
const L = (line, fatal = true) => ({line, fatal});

/** obj samples [{f, sides, band}] -> EDGE_CUT lines: a whole thing touching the frame's edge across FAST_S or more
 *  (`polish`: the obj pass drew the figures too, POLISH_FROM) */
export const edgeLines = (samples, shots = [], fps = 30, step = STEP, polish = false) =>
  Object.entries(SIDE).flatMap(([c, side]) =>
    runsOf(samples.map((x) => ({f: x.f, hit: x.sides.includes(c)})), step, FAST_S * fps).map((r) =>
      L(
        `EDGE_CUT ${where(shots, r.from, r.to, fps)}: ${polish ? 'a phone, a car, a card, a person, a hand, the wheel or a flag' : 'a phone, a car or a card'} touches the frame's ${side} edge for ${((r.to - r.from) / fps).toFixed(1)} s or more: keep it WHOLE inside the frame (only a fast entry or exit, under ${FAST_S} s, may touch the edge): smaller, nearer the middle, or the camera wider (a library scene: another staging)${polish ? '; mark it ALWAYS (className={OBJ} or {FIG}, never only in some shots); a full-bleed background stays unmarked' : ''}`,
      ),
    ),
  );

/** META_PX marked pixels (at SCALE) inside the meta line's strip count as covering it */
export const META_PX = 6;
/** obj and fig samples [{f, meta}] -> META_COVER lines: a marked thing in the meta line's strip across FAST_S or more */
export const metaLines = (obj, fig, shots = [], fps = 30, step = STEP, fatal = true) => {
  const hit = new Map();
  for (const x of [...obj, ...fig]) hit.set(x.f, (hit.get(x.f) ?? false) || (x.meta ?? 0) >= META_PX);
  const frames = [...hit.keys()].sort((a, b) => a - b);
  return runsOf(frames.map((f) => ({f, hit: hit.get(f)})), step, FAST_S * fps).map((r) =>
    L(
      `META_COVER ${where(shots, r.from, r.to, fps)}: something stands in the meta line's strip (frame y ${META_BAND.top}..${META_BAND.bottom}, the film's name and the shot count): nothing may cover it: keep every thing under stage y ${Math.ceil((META_BAND.bottom + 78) / 1.1)} (a label from LABEL_TOP, src/lib/guard.mjs), a flag or a sign lower, the camera wider`,
      fatal,
    ),
  );
};

/** pic samples [{f, shards}] -> SHARD lines: a thin sliver of another tone at the frame's top edge across FAST_S or more */
export const shardLines = (samples, shots = [], fps = 30, step = STEP, fatal = true) =>
  runsOf(
    samples.filter((x) => shotAt(shots, x.f)?.type !== 'EndCard').map((x) => ({f: x.f, hit: (x.shards ?? []).length > 0})),
    step,
    FAST_S * fps,
  ).map((r) => {
    const sh = samples.find((x) => x.f === r.from)?.shards?.[0];
    const side = !sh ? 'top' : sh[1] === 0 ? 'top left corner' : sh[3] >= 1080 * SCALE - 1 ? 'top right corner' : 'top edge';
    return L(
      `SHARD ${where(shots, r.from, r.to, fps)}: a thin dark (or light) sliver shows at the frame's ${side}: a pillar's tip, a shape's corner or another shot peeking in past the camera: draw that shape wholly off-frame or wholly in, or keep the camera from uncovering it`,
      fatal,
    );
  });

/** pic samples [{f, ink}] -> EMPTY_FRAME lines: the picture band almost one flat colour (under EMPTY_SHARE inked) on two
 *  samples in a row inside one shot (not the EndCard): a shot that opens on nothing, or empties out */
export const emptyLines = (samples, shots = [], fps = 30, step = STEP, fatal = true) => {
  const out = [];
  for (const s of shots) {
    if (s.type === 'EndCard') continue;
    const mine = samples.filter((x) => x.f >= s.start && x.f < s.end);
    for (const r of runsOf(mine.map((x) => ({f: x.f, hit: typeof x.ink === 'number' && x.ink < EMPTY_SHARE})), step, step))
      out.push(
        L(
          `EMPTY_FRAME ${where(shots, r.from, r.to, fps)}: the picture is almost empty (a line or a faint word on a flat field): every moment shows a clear picture: land the shot's thing with the cut, never a bare stage while it draws in`,
          fatal,
        ),
      );
  }
  return out;
};

/** obj and fig samples [{f, band, sub}] -> SUB_BAND lines: something standing in the subtitle band across FAST_S or more
 *  while a line is on screen (`sub` false: no line, the band is free; unmarked samples count) */
export const bandLines = (obj, fig, shots = [], fps = 30, step = STEP) => {
  const hit = new Map();
  for (const x of [...obj, ...fig]) hit.set(x.f, (hit.get(x.f) ?? false) || (x.band >= BAND_PX && x.sub !== false));
  const frames = [...hit.keys()].sort((a, b) => a - b);
  const what = (f) => {
    const o = obj.find((x) => x.f === f)?.band >= BAND_PX;
    const g = fig.find((x) => x.f === f)?.band >= BAND_PX;
    return o && g ? 'a person and a phone, car or card' : o ? 'a phone, a car or a card' : 'a person, a hand or the wheel';
  };
  return runsOf(frames.map((f) => ({f, hit: hit.get(f)})), step, FAST_S * fps).map((r) =>
    L(
      `SUB_BAND ${where(shots, r.from, r.to, fps)}: ${what(r.from)} stands in the subtitle band (frame y ${SUB_BAND.top}..${SUB_BAND.bottom}): the line must read, nothing but the ground, sky or road there: keep people and things above stage y 1380 (src/lib/guard.mjs SUB_BAND_STAGE; feet, a phone's foot, a wheel's rim; a library scene: another staging)`,
    ),
  );
};

/** pic samples [{f, mad}] (mad: a window's largest move, null outside a whole window) -> STATIC_HOLD lines, one a shot */
export const staticLines = (samples, shots = [], fps = 30, step = STEP, lag = LAG) => {
  const out = [];
  for (const s of shots) {
    if (s.type === 'EndCard') continue;
    const still = samples.filter((x) => x.f >= s.start && x.f < s.end && x.mad !== null && x.mad < STILL_MAD);
    if (!still.length) continue;
    const a = Math.max(s.start, still[0].f - lag * step);
    const z = still[still.length - 1].f;
    out.push(
      L(
        `STATIC_HOLD shot ${s.k + 1} (${s.type}) only breathes ${sec(a, fps)}-${sec(z, fps)} s (${((z - a) / fps).toFixed(1)} s; at most ${STATIC_MAX_S} s with nothing happening): give it an event (a tap, a turn, a lift on a chunk) or cut it shorter (a "cuts" entry)`,
        false,
      ),
    );
  }
  return out;
};

/** Render the three probes and measure them. Needs the bundle, the composition, a browser (check.mjs's own) and
 *  @remotion/renderer's renderFrames; `props`: more input props (a test: {"guard": false} renders the film unguarded).
 *  -> {lines: [{line, fatal}], ms, samples, obj, fig, pic} or throws. */
export const reviewFilm = async ({id, serveUrl, composition, browser, renderFrames, opts, concurrency, shots, props = {}}) => {
  const t0 = Date.now();
  const dir = path.join(root, 'out', `guards-${id}`);
  fs.rmSync(dir, {recursive: true, force: true});
  fs.mkdirSync(dir, {recursive: true});
  const fps = composition.fps;
  const frames = Array.from({length: Math.ceil(composition.durationInFrames / STEP)}, (_, i) => i * STEP);
  const shoot = async (mode) => {
    await renderFrames({
      serveUrl, composition, inputProps: {...props, guardProbe: mode}, frames, imageFormat: 'png', scale: SCALE, concurrency, outputDir: null, muted: true,
      onFrameBuffer: (buf, f) => fs.writeFileSync(path.join(dir, `${mode}-${f}.png`), buf),
      onStart: () => {}, onFrameUpdate: () => {}, ...opts, puppeteerInstance: browser,
    });
    return frames.map((f) => ({f, path: path.join(dir, `${mode}-${f}.png`), shot: shotAt(shots, f)?.k ?? -1}));
  };
  const polish = polishOn(id.replace(/-r\d+$/, ''));
  const measure = (mode, list) => {
    const job = {mode, scale: SCALE, key: PROBE_KEY, tol: PROBE_TOL, edge: EDGE_PX, band: SUB_BAND, meta: META_BAND, mark: PROBE_MARK, lag: LAG, empty: {top: 330, bottom: 1440}, shard: SHARD_AREA, frames: list};
    const py = spawnSync('python3', [path.join(root, 'tools/ci/guardreview.py')], {input: JSON.stringify(job), encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000});
    if (py.error) throw py.error;
    if (py.status !== 0) throw new Error((py.stderr ?? '').trim().split('\n').pop() || `python3 exit ${py.status}`);
    return JSON.parse(py.stdout);
  };
  const p2 = p2On(id.replace(/-r\d+$/, ''));
  try {
    const obj = measure('obj', await shoot('obj'));
    const fig = measure('fig', await shoot('fig'));
    const picFrames = await shoot('pic');
    const pic = measure('pic', picFrames);
    // phase 2: the words alone, and the pixel guards on every sample (p2Lines above)
    let p2m = [];
    if (p2) {
      const txtFrames = await shoot('txt');
      // the picture without its words (TEXT_CLASH: what each word stands on in the film, where the text layer is on top)
      const bareFrames = await shoot('bare');
      const job = {scale: SCALE, key: PROBE_KEY, mark: PROBE_MARK, frames: picFrames.map((x, i) => ({f: x.f, pic: x.path, txt: txtFrames[i].path, bare: bareFrames[i].path}))};
      const py = spawnSync('python3', [path.join(root, 'tools/ci/p2pixels.py'), '--film'], {input: JSON.stringify(job), encoding: 'utf8', maxBuffer: 64 << 20, timeout: 300000});
      if (py.error) throw py.error;
      if (py.status !== 0) throw new Error((py.stderr ?? '').trim().split('\n').pop() || `p2pixels exit ${py.status}`);
      p2m = JSON.parse(py.stdout);
    }
    const lines = [
      ...edgeLines(obj, shots, fps, STEP, polish),
      ...bandLines(obj, fig, shots, fps),
      ...staticLines(pic, shots, fps),
      // the polish guards (POLISH_FROM): problems from then on, notes before
      ...metaLines(obj, fig, shots, fps, STEP, polish),
      ...shardLines(pic, shots, fps, STEP, polish),
      // a phase-2 film: EMPTY_P2 (calibrated on its paper and cards) is the stop; the old 1 % EMPTY_FRAME read the P2 paper
      // map's pale roads, a chart's bars rising from zero and white cards as empty, so for P2 it is a note
      ...emptyLines(pic, shots, fps, STEP, polish && !p2),
      ...(p2 ? p2Lines(p2m, pic, shots, fps) : []),
    ];
    return {lines, ms: Date.now() - t0, samples: frames.length, obj, fig, pic, p2: p2m};
  } finally {
    if (!process.env.VS_GUARDS_KEEP) fs.rmSync(dir, {recursive: true, force: true});
  }
};

// ---- phase 2's guards on the WHOLE film (src/lib/p2.mjs; the p2 prove run, 2026-10-26) -------------------------------------
// The pixel guards ran only on the fixtures' stills (tools/p2-stills.mjs), so v136-lamp-two went out with amber, red and green
// in one frame, white cards with nothing but lines, „∞" alone on blank paper, a headline under the figure's head, a word cut at
// the frame's left edge and a glyph over the subtitle. A P2 film is now sampled a fourth time, through the "txt" probe (only
// the words, on the key green, no breath, like "pic"), and tools/ci/p2pixels.py --film reads every sample of "pic" and "txt":
//   HUE_TWO      two data colours in one frame (the real app screen and the end card excepted)
//   EMPTY_P2     a white card with only lines on it, or bare paper with no big word, for 0.6 s or more inside one shot
//                (emptyP2 below; EMPTY_FRAME's 1 % let the prove run's white cards with lines through)
//   TEXT_EDGE    a word past frame x 65..1015 (the stage's text box); a TypeDive's own dive (its last DIVE_FRAMES) excepted
//   TEXT_SUB     a word in the subtitle band (frame y 1440..1560) while a line is on
//   TEXT_COVER   words the picture does not show where they are set: a figure, a photo, a mark or another card over them
//   HOOK_FRAME0  frame 0 shows no line 110 px tall, or one that hardly stands off its ground (contrast under HOOK_CONTRAST)
//   TEXT_CLASH   a word stands on something of its own tone (a fifth pass, "bare": the picture without its words): a head under
//                a headline, a mark's stroke or a route line through a label, a photo's lettering, white on white (the p3 run)
// Two samples in a row (6 frames) make a run (a cut's few frames are not one); every line is fatal in the cloud.
/** EMPTY_P2 (tools/ci/p2pixels.py emptiness; measured 2026-10-27 on the prove run's sheets and the fixtures): a frame is almost
 *  empty when it holds a white card with under P2_CARD_EMPTY ink inside while under P2_CARD_PALE of the picture is drawn,
 *  or when under P2_BARE of it is drawn and no word stands P2_BIG_WORD px tall (a big number alone on paper is a frame) */
export const P2_CARD_EMPTY = 0.035;
export const P2_CARD_PALE = 0.12;
export const P2_BARE = 0.035;
export const P2_BIG_WORD = 100;
export const emptyP2 = (x) =>
  (typeof x.card === 'number' && x.card < P2_CARD_EMPTY && (x.pale ?? 1) < P2_CARD_PALE) || (typeof x.pale === 'number' && x.pale < P2_BARE && (x.tall ?? 0) < P2_BIG_WORD);
/** the first shots whose claim must read at frame 0 (HOOK_FRAME0): a cold open on a picture event (JamGrid) or the result
 *  first (ScreenFocus) carries its hook in the picture */
export const CLAIM_HOOKS = new Set(['FreezeTag', 'IrisDetail', 'KeywordLift', 'FilmTitleCard', 'KineticHeadline', 'BigNumber', 'Twist', 'TypeDive']);
export const HOOK_TALL = 110;
export const HOOK_CONTRAST = 60;
export const COVER_PX = 25;
export const COVER_SHARE = 0.06;
export const TEXT_BAND_PX = 6;
const DIVE_FRAMES = 14;
/** shots whose picture is the real app (it keeps its own colours) or the white store card */
export const HUE_FREE = new Set(['ScreenFocus', 'TapTrail', 'ScreenDeck', 'Phone', 'PhoneDesk', 'WipeCompare', 'IrisDetail', 'EndCard']);

/** samples [{f, hues, edge, band, sub, cover, core, tall, contrast}] and pic samples [{f, ink}] -> the P2 lines */
export const p2Lines = (m, pic = [], shots = [], fps = 30, step = STEP) => {
  const out = [];
  const typeAt = (f) => shotAt(shots, f)?.type ?? '';
  const run = (hits, msg) => {
    for (const r of runsOf(hits, step, step)) out.push(L(msg(r)));
  };
  run(
    m.map((x) => ({f: x.f, hit: (x.hues ?? []).length > 1 && !HUE_FREE.has(typeAt(x.f))})),
    (r) => `HUE_TWO ${where(shots, r.from, r.to, fps)}: ${(m.find((x) => x.f === r.from)?.hues ?? []).join(', ')} in one frame: paper and ink, ONE data colour a frame (a strike's red, a tick's green and the accent never together): drop the tick or the strike, or move one to its own shot`,
  );
  for (const s of shots) {
    if (s.type === 'EndCard') continue;
    const mine = m.filter((x) => x.f >= s.start && x.f < s.end);
    // 0.6 s and more (a card that fills in within half a second, the Receipt's first line, is drawing in, not empty)
    for (const r of runsOf(mine.map((x) => ({f: x.f, hit: emptyP2(x)})), step, 3 * step)) {
      const x = mine.find((y) => y.f >= r.from && emptyP2(y));
      const why = typeof x?.card === 'number' && x.card < P2_CARD_EMPTY ? `a white card with nothing but ${(x.card * 100).toFixed(1)} % ink on it` : `${((x?.pale ?? 0) * 100).toFixed(1)} % of the picture drawn and no word ${P2_BIG_WORD} px tall`;
      out.push(L(`EMPTY_P2 ${where(shots, r.from, r.to, fps)}: the picture is almost empty (${why}): a white card with only lines, a lone glyph or bare paper never ships: the thing the line is about, big, from the shot's first frame`));
    }
  }
  const dive = (x) => {
    const s = shotAt(shots, x.f);
    return s?.type === 'TypeDive' && x.f >= s.end - DIVE_FRAMES;
  };
  run(
    m.map((x) => ({f: x.f, hit: Array.isArray(x.edge) && (x.edge[0] < P2_TEXT_X[0] || x.edge[1] > P2_TEXT_X[1]) && !dive(x)})),
    (r) => `TEXT_EDGE ${where(shots, r.from, r.to, fps)}: a word runs from frame x ${m.find((x) => x.f === r.from)?.edge?.join(' to ')} (the text box is ${P2_TEXT_X.join('..')}): it is cut by the frame: fewer letters, a smaller size, or the camera wider`,
  );
  run(
    m.map((x) => ({f: x.f, hit: x.sub && x.band >= TEXT_BAND_PX})),
    (r) => `TEXT_SUB ${where(shots, r.from, r.to, fps)}: a word of the picture stands in the subtitle band (frame y 1440..1560) while a line is on: the subtitle must read: keep every word above stage y 1370`,
  );
  run(
    m.map((x) => ({f: x.f, hit: (x.word ?? 0) > 0 || x.cover >= Math.max(COVER_PX, COVER_SHARE * (x.core ?? 0))})),
    (r) => `TEXT_COVER ${where(shots, r.from, r.to, fps)}: something stands over the words (a figure, a photo, a mark, another card): nothing covers a word: move the thing, the word, or cut to the next shot cleanly`,
  );
  // TEXT_CLASH (the p3 prove run): what a word STANDS ON in the film (the text layer is always on top, so TEXT_COVER never sees
  // a head under a headline, a hand mark's stroke through a label, a photo's own lettering under a claim, or a white claim on
  // white paper while an iris opens): p2pixels.py's "clash", from the "bare" pass
  run(
    m.map((x) => ({f: x.f, hit: (x.clash ?? 0) > 0})),
    (r) => {
      const x = m.find((y) => y.f >= r.from && (y.clash ?? 0) > 0);
      const b = x?.clashBox;
      return `TEXT_CLASH ${where(shots, r.from, r.to, fps)}: a word stands on something of its own tone${b ? ` (frame x ${b[0]}..${b[2]}, y ${b[1]}..${b[3]})` : ''}: ${Math.round((x?.clashShare ?? 0) * 100)} % of its letters sit on a figure, a mark's stroke, a line, another picture's lettering, or white on white: a word stands on clean paper, a clean card or a calm dark part of a photo: move the word or the thing, ring a mark round the word (never through it), or set the claim where the picture is calm`;
    },
  );
  const f0 = m.find((x) => x.f === 0);
  if (f0 && CLAIM_HOOKS.has(typeAt(0))) {
    if ((f0.tall ?? 0) < HOOK_TALL) out.push(L(`HOOK_FRAME0 frame 0 shows no claim (its tallest line is ${f0.tall ?? 0} px, ${HOOK_TALL} at least): the hook's claim reads at frame 0, big, on a clean ground`));
    else if (typeof f0.contrast === 'number' && f0.contrast < HOOK_CONTRAST) out.push(L(`HOOK_FRAME0 frame 0's claim hardly stands off its ground (contrast ${f0.contrast}, ${HOOK_CONTRAST} at least): ink on paper or white on a dark photo, never grey on grey`));
  }
  return out;
};

export {guardOn};

// ---- the self-test ---------------------------------------------------------------------------------------------------------
const selfTest = () => {
  let bad = 0;
  const ok = (cond, what) => {
    if (!cond) bad++;
    console.log(`${cond ? 'ok  ' : 'FAIL'} ${what}`);
  };
  const shots = [
    {k: 0, type: 'Film', start: 0, end: 90},
    {k: 1, type: 'Person', start: 90, end: 200},
    {k: 2, type: 'EndCard', start: 200, end: 300},
  ];
  const obj = (str, from = 0) => [...str].map((c, i) => ({f: from + i * STEP, sides: c === '.' ? '' : c, band: 0}));
  // v110: the parked car past the right edge from 21.7 to 23.3 s
  const car = edgeLines(obj('......rrrrrrrrr....', 90), shots);
  ok(car.length === 1 && /right edge/.test(car[0].line) && /shot 2, Person/.test(car[0].line) && car[0].fatal, `a car held past the right edge: ${car[0]?.line ?? 'nothing'}`);
  ok(edgeLines(obj('..rr....ll...')).length === 0, 'a whip or a fast exit (two samples) passes');
  ok(edgeLines(obj('bbbbb')).some((l) => /bottom edge/.test(l.line)), 'a phone cut at the bottom for a second');
  const band = (n) => [...Array(n)].map((_, i) => ({f: i * STEP, band: 40, sides: ''}));
  const none = (n) => [...Array(n)].map((_, i) => ({f: i * STEP, band: 0, sides: ''}));
  ok(bandLines(none(10), band(10), shots).some((l) => /person, a hand or the wheel/.test(l.line) && l.fatal), 'a standing man in the band (v104, v110)');
  ok(bandLines(band(10), none(10), shots).some((l) => /phone, a car or a card/.test(l.line)), 'a phone in the band');
  ok(bandLines(none(10), none(10), shots).length === 0, 'a clean band');
  const quiet = band(10).map((x) => ({...x, sub: false}));
  ok(bandLines(quiet, none(10), shots).length === 0, 'a phone rising through the band between two lines (no line on screen) passes');
  ok(bandLines(band(10).map((x, i) => ({...x, sub: i >= 4})), none(10), shots).length === 1, 'the same phone counts from the frame a line comes on');
  ok(bandLines(none(10), [{f: 0, band: 3, sides: ''}, {f: 6, band: 5, sides: ''}, {f: 12, band: 2, sides: ''}]).length === 0, 'a few stray pixels are not a figure');
  const pic = (mads, from = 0) => mads.map((m, i) => ({f: from + i * STEP, mad: m}));
  const nul = Array(LAG).fill(null);
  const st = staticLines(pic([...nul, 0.2, 0.3, 0.25, 0.3], 90), shots);
  ok(st.length === 1 && /shot 2 \(Person\) only breathes 3\.0-6\.2 s \(3\.2 s/.test(st[0].line) && !st[0].fatal, `a step shot that only breathes: a note, never a stop: ${st[0]?.line ?? 'nothing'}`);
  ok(staticLines(pic([...nul, 1.7, 2.4, 3.1], 90), shots).length === 0, 'a breathing shot passes');
  ok(staticLines(pic([0.1, 0.1, 0.1], 200), shots).length === 0, 'the end card may hold');
  ok(LAG * STEP >= STATIC_MAX_S * 30 && LAG * STEP < STATIC_MAX_S * 30 + STEP, `the window: ${LAG} samples, ${((LAG * STEP) / 30).toFixed(1)} s`);
  ok(!guardStrict('v113-x') && guardStrict('v120-x') && guardOn('v113-x') && !guardOn('v112-halo-boot'), 'strict from v120, on from v113');
  // the polish guards (v131-three-minutes, 2026-10-26)
  const wheel = edgeLines(obj('llllllllllllll'), shots, 30, STEP, true);
  ok(wheel.length === 1 && /person, a hand, the wheel or a flag/.test(wheel[0].line) && /mark it ALWAYS/.test(wheel[0].line) && wheel[0].fatal, `a steering wheel held past the left edge (0-4 s): ${wheel[0]?.line ?? 'nothing'}`);
  const metaS = (n, px, from = 0) => [...Array(n)].map((_, i) => ({f: from + i * STEP, meta: px, band: 0, sides: ''}));
  const flag = metaLines(none(10), metaS(10, 40), shots, 30, STEP, true);
  ok(flag.length === 1 && /^META_COVER/.test(flag[0].line) && flag[0].fatal, `a chequered flag over the meta line (39-40 s): ${flag[0]?.line ?? 'nothing'}`);
  ok(metaLines(metaS(10, 40), none(10), shots).length === 1, 'a wheel or a phone over the meta line');
  ok(metaLines(metaS(2, 40), none(2), shots).length === 0 && metaLines(metaS(10, 3), none(10), shots).length === 0, 'a fast pass, or a few stray pixels, pass');
  ok(metaLines(metaS(10, 40), none(10), shots, 30, STEP, false).every((l) => !l.fatal), 'before POLISH_FROM: a note');
  const shard = (str, from = 0) => [...str].map((c, i) => ({f: from + i * STEP, shards: c === 'x' ? [[172, 0, 0, 6, 52]] : []}));
  const sh = shardLines(shard('..xxxxxx..'), shots, 30, STEP, true);
  ok(sh.length === 1 && /^SHARD/.test(sh[0].line) && /top left corner/.test(sh[0].line) && sh[0].fatal, `a dark wedge in the top left corner (7 s): ${sh[0]?.line ?? 'nothing'}`);
  ok(shardLines(shard('..xx..x..')).length === 0, 'a sliver for a moment (a whip) passes');
  ok(shardLines(shard('xxxxx', 200), shots).length === 0, 'the end card is left out');
  const ink = (vals, from = 0) => vals.map((v, i) => ({f: from + i * STEP, ink: v}));
  const em = emptyLines(ink([0.36, 0.0036, 0.0097, 0.055, 0.92], 90), shots, 30, STEP, true);
  ok(em.length === 1 && /^EMPTY_FRAME 3\.2-3\.4 s \(shot 2, Person\)/.test(em[0].line) && em[0].fatal, `an almost empty timeline for 0.4 s (8 s): ${em[0]?.line ?? 'nothing'}`);
  ok(emptyLines(ink([0.0, 0.3, 0.0106, 0.0122, 0.3], 90), shots).length === 0, 'one blank sample (a cut) and a lone price tag (0.0106) pass');
  ok(emptyLines(ink([0.4, 0.004], 78).concat(ink([0.004, 0.4], 90)), [{k: 0, type: 'Film', start: 0, end: 90}, {k: 1, type: 'Film', start: 90, end: 200}]).length === 0, 'two blank samples across a cut (a fade through the field) pass');
  ok(emptyLines(ink([0, 0, 0, 0], 210), shots).length === 0, 'the end card may be bare');
  ok(fs.existsSync(path.join(root, 'tools/ci/guardreview.py')), 'the measurement script is there');
  // src/lib/guard.mjs's numbers against src/tokens.ts (read by regex, as tools/formats.mjs does)
  const tok = fs.readFileSync(path.join(root, 'src/tokens.ts'), 'utf8');
  const num = (k) => Number(new RegExp(`\\b${k}\\s*:\\s*(\\d+(?:\\.\\d+)?)`).exec(tok)?.[1]);
  const [sx, sy, maxW, size, gb, gt] = ['subtitleX', 'subtitleY', 'subtitleMaxW', 'subtitle', 'graphicsBottom', 'graphicsTop'].map(num);
  const s = Number(/const STAGE_S = (\d+(?:\.\d+)?)/.exec(tok)?.[1]);
  const toFrame = (y) => 340 - 380 * s + s * y; // STAGE.y + STAGE.s * y
  ok(Math.abs(toFrame(gb) - SUB_BAND.top) < 1 && SUB_BAND_STAGE.top === gb, `the band starts at the picture band's foot (stage ${gb} = frame ${Math.round(toFrame(gb))})`);
  ok(Math.abs(toFrame(SUB_BAND_STAGE.bottom) - SUB_BAND.bottom) < 1.2, 'the band in stage units and in frame px agree');
  ok(SUB_BAND.left === sx - maxW / 2 && SUB_BAND.right === sx + maxW / 2, "the band spans the line's widest box");
  ok(sy - 0.4 * size - 18 > SUB_BAND.top && sy + 0.35 * size + 18 < SUB_BAND.bottom, 'the line and its plate sit inside the band');
  ok(WHOLE_STAGE.top === gt && WHOLE_STAGE.bottom < SUB_BAND_STAGE.top, "whole things: from the picture band's top to over the band");
  ok(540 + (WHOLE_STAGE.right - 540) * 1.06 < 1080 && toFrame(0) < 0, 'a 6 % push keeps the whole box inside the frame');
    // phase 2 on the whole film (the p2 prove run, 2026-10-26)
  const p2shots = [
    {k: 0, type: 'KineticHeadline', start: 0, end: 60},
    {k: 1, type: 'Film', start: 60, end: 150},
    {k: 2, type: 'ScreenFocus', start: 150, end: 210},
    {k: 3, type: 'TypeDive', start: 210, end: 270},
    {k: 4, type: 'EndCard', start: 270, end: 330},
  ];
  const ms = (n, f) => [...Array(n)].map((_, i) => ({f: i * STEP, hues: [], edge: [200, 880], band: 0, sub: true, cover: 0, core: 2000, tall: 160, contrast: 200, pale: 0.2, card: null, ...f(i * STEP)}));
  const code = (ls) => ls.map((l) => l.line.split(' ')[0]);
  ok(p2Lines(ms(55, () => ({})), [], p2shots).length === 0, 'phase 2: a clean film passes');
  ok(code(p2Lines(ms(55, (f) => (f >= 120 && f < 140 ? {hues: ['amber', 'red', 'green']} : {})), [], p2shots)).includes('HUE_TWO'), 'phase 2: amber, red and green on four samples of the Film: HUE_TWO (54.5 s)');
  ok(!code(p2Lines(ms(55, (f) => (f >= 150 && f < 200 ? {hues: ['red', 'green']} : {})), [], p2shots)).includes('HUE_TWO'), 'phase 2: the real app screen keeps its colours');
  ok(!code(p2Lines(ms(55, (f) => (f === 120 ? {hues: ['amber', 'red']} : {})), [], p2shots)).includes('HUE_TWO'), 'phase 2: one sample (a cut) is no run');
  ok(code(p2Lines(ms(55, (f) => (f >= 66 && f < 90 ? {card: 0.015, pale: 0.09, tall: 60} : {pale: 0.2})), [], p2shots)).includes('EMPTY_P2'), 'phase 2: white cards with lines (1.5 % ink inside) for 0.8 s: EMPTY_P2');
  ok(code(p2Lines(ms(55, (f) => (f >= 66 && f < 90 ? {pale: 0.02, tall: 70} : {pale: 0.2})), [], p2shots)).includes('EMPTY_P2'), 'phase 2: bare paper and a small word: EMPTY_P2');
  ok(!code(p2Lines(ms(55, (f) => (f >= 66 && f < 90 ? {pale: 0.03, tall: 160, card: 0.068} : {pale: 0.2})), [], p2shots)).includes('EMPTY_P2'), 'phase 2: two cards with a big number each (the Versus) pass');
  ok(!code(p2Lines(ms(55, (f) => (f >= 270 ? {pale: 0.0, tall: 0} : {pale: 0.2})), [], p2shots)).includes('EMPTY_P2'), 'phase 2: the end card is left out');
  ok(code(p2Lines(ms(55, (f) => (f >= 210 && f < 240 ? {edge: [-40, 700]} : {})), [], p2shots)).includes('TEXT_EDGE'), 'phase 2: „კოდი" cut at the left edge before the dive: TEXT_EDGE');
  ok(!code(p2Lines(ms(55, (f) => (f >= 258 && f < 270 ? {edge: [-900, 1900]} : {})), [], p2shots)).includes('TEXT_EDGE'), 'phase 2: the dive itself may pass the edges');
  ok(code(p2Lines(ms(55, (f) => (f >= 240 && f < 270 ? {band: 400} : {})), [], p2shots)).includes('TEXT_SUB'), 'phase 2: the glyph over the subtitle: TEXT_SUB');
  ok(!code(p2Lines(ms(55, (f) => (f >= 240 && f < 270 ? {band: 400, sub: false} : {})), [], p2shots)).includes('TEXT_SUB'), 'phase 2: no line on, no TEXT_SUB');
  ok(code(p2Lines(ms(55, (f) => (f >= 60 && f < 90 ? {cover: 300} : {})), [], p2shots)).includes('TEXT_COVER'), 'phase 2: the head over „არაუშავს!": TEXT_COVER');
  ok(!code(p2Lines(ms(55, () => ({cover: 10})), [], p2shots)).includes('TEXT_COVER'), 'phase 2: a few anti-aliased pixels are no cover');
  ok(code(p2Lines(ms(55, (f) => (f >= 60 && f < 90 ? {cover: 12, word: 1} : {})), [], p2shots)).includes('TEXT_COVER'), 'phase 2: an ellipse through one small label: TEXT_COVER');
  ok(code(p2Lines(ms(55, (f) => (f >= 66 && f < 90 ? {clash: 1, clashShare: 0.42, clashBox: [92, 384, 296, 556]} : {})), [], p2shots)).includes('TEXT_CLASH'), 'phase 2: a white „W" on a washed-out photo (v136, 12.6 s): TEXT_CLASH');
  ok(!code(p2Lines(ms(55, (f) => (f === 66 ? {clash: 1, clashShare: 1} : {})), [], p2shots)).includes('TEXT_CLASH'), 'phase 2: one sample (a cut) is no TEXT_CLASH');
  ok(code(p2Lines(ms(55, (f) => (f === 0 ? {tall: 40} : {})), [], p2shots)).includes('HOOK_FRAME0'), 'phase 2: the tiny „გავჩერდე?" at frame 0: HOOK_FRAME0');
  ok(!code(p2Lines(ms(55, (f) => (f === 0 ? {tall: 0} : {})), [], [{k: 0, type: 'JamGrid', start: 0, end: 60}, ...p2shots.slice(1)])).includes('HOOK_FRAME0'), 'phase 2: a cold open on a picture event carries no claim');
  ok(code(p2Lines(ms(55, (f) => (f === 0 ? {contrast: 25} : {})), [], p2shots)).includes('HOOK_FRAME0'), 'phase 2: a grey claim on a grey photo at frame 0: HOOK_FRAME0');
  ok(p2Lines(ms(55, (f) => (f === 0 ? {tall: 40} : {})), [], p2shots).every((l) => l.fatal), 'phase 2: every line is fatal');
  console.log(bad ? `guards: ${bad} failed` : 'guards: all ok');
  return bad ? 1 : 0;
};
if (process.argv[1] && path.resolve(process.argv[1]) === self && process.argv[2] === '--test') process.exit(selfTest());
