#!/usr/bin/env node
// Free recorded sounds for the Vinari kit: CC0 packs by Kenney (kenney.nl), no account, no
// attribution required, commercial use allowed. The packs stay outside the repo; only the chosen
// sounds, converted and levelled, land in public/sfx/cc0-<name>.wav.
//
//   node tools/sfx-import.mjs --fetch      download the 5 zips in PACKS (about 3.9 MB) into
//                                          ../_research_scratch/sfx-packs/ (gitignored). The owner
//                                          asked for more free ASMR / haptic-like sounds (2026-09-24).
//   node tools/sfx-import.mjs              unzip, convert every PICK (Remotion's ffmpeg → 48 kHz 16-bit
//                                          stereo), trim (onset 3 ms in like the kit, the tail cut above
//                                          the recording's own noise floor), EQ, level, check, merge into
//                                          public/sfx/asmr.json, rewrite public/sfx/LICENSES.md, write
//                                          out/sfx-audition-cc0.wav (+ .txt), refresh out/sfx-audition.wav
//   node tools/sfx-import.mjs --list       every audio file in the packs with length, centroid, hf share,
//                                          crest, hiss, stereo correlation, inner gap and source clipping
//   node tools/sfx-import.mjs --licenses   only rewrite public/sfx/LICENSES.md
//   node tools/sfx-import.mjs --audition   only rewrite out/sfx-audition-cc0.wav (+ .txt)
//
// LEVEL. Each file sits where the synthesised kit sits: its loudest 100 ms at suggestedVolume is
// `rel` LU under the voice (tools/asmr.mjs VOICE_LUFS), then +3 dB for the film: common.tsx gives
// asmr- cues ASMR_TRIM (1.41) because the voice plays on both channels; cc0- cues do not get it, so
// the files carry it. Do NOT add cc0- to ASMR_TRIM.
//
// CHOICE (2026-09-24, every file of the 5 packs drawn as a spectrogram and measured, see --list):
// Interface Sounds is synthetic (tonal blips, pitch sweeps, 20 Hz click trains, FM squiggles): none
// of it fits a kit with no melody, so nothing is taken from it. RPG bookPlace1-3 and bookClose clip in
// the source; creak, coins, belts, knives and metal pots ring or rattle; Impact metal, glass, bell,
// plate and tin ring. What is left and kept: real small plastic clicks and switches (UI Audio), a
// latch and a clasp, clay chips, cards on felt, a page, cloth, small leather, a carpet pat, light wood.
// Tried and dropped after processing (do not re-add without listening): mouseclick1 / mouserelease1
// (44-82 % of the energy above 8 kHz even tamed), chip-lay-1 and chips-collide-3 (bright duplicates of
// chip), cards-pack-take-out-1 and cloth1 (0.5 s of broadband noise), bookFlip2 (paper crackle peaking
// at -11 dBFS), impactSoft_medium and impactWood_medium (pitched low thuds, 42-43 dB tonal, lost on a
// phone speaker), switch30 (a third take of the rocker).

import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {SR, LEAD, FADE, VOICE_LUFS, readWav, writeWav, analyse, loudness, truePeak, filt, phoneLoss, readManifest, writeManifest} from './asmr.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SFX = path.join(ROOT, 'public', 'sfx');
// SFX_PACK_DIR: another folder of packs (a test)
const PACK_DIR = process.env.SFX_PACK_DIR ? path.resolve(process.env.SFX_PACK_DIR) : path.resolve(ROOT, '..', '_research_scratch', 'sfx-packs');
const FILM_TRIM = 1.41; // = common.tsx ASMR_TRIM
const CC0 = {name: 'CC0 1.0 Universal (public domain dedication)', url: 'https://creativecommons.org/publicdomain/zero/1.0/', legal: 'https://creativecommons.org/publicdomain/zero/1.0/legalcode'};

// Checked 2026-09-24 on each pack page ("License: Creative Commons CC0") and by HEAD request;
// downloaded 2026-09-24, sizes as listed (the License.txt inside each zip says CC0 too).
const PACKS = [
  {id: 'interface-sounds', title: 'Interface Sounds', page: 'https://kenney.nl/assets/interface-sounds', zip: 'https://kenney.nl/media/pages/assets/interface-sounds/fa43c1dd4d-1677589452/kenney_interface-sounds.zip', bytes: 834536},
  {id: 'ui-audio', title: 'UI Audio', page: 'https://kenney.nl/assets/ui-audio', zip: 'https://kenney.nl/media/pages/assets/ui-audio/490d233f68-1677590494/kenney_ui-audio.zip', bytes: 411949},
  {id: 'impact-sounds', title: 'Impact Sounds', page: 'https://kenney.nl/assets/impact-sounds', zip: 'https://kenney.nl/media/pages/assets/impact-sounds/87b4ddecda-1677589768/kenney_impact-sounds.zip', bytes: 800850},
  {id: 'casino-audio', title: 'Casino Audio', page: 'https://kenney.nl/assets/casino-audio', zip: 'https://kenney.nl/media/pages/assets/casino-audio/2472606a04-1721639069/kenney_casino-audio.zip', bytes: 876839},
  {id: 'rpg-audio', title: 'RPG Audio', page: 'https://kenney.nl/assets/rpg-audio', zip: 'https://kenney.nl/media/pages/assets/rpg-audio/8e99002d76-1677590336/kenney_rpg-audio.zip', bytes: 964837},
];

// A gentle high shelf: recorded clicks, chips and paper are brighter than the kit (centroids of
// 6-10 kHz against the kit's 0.2-4.7 kHz); this takes the edge off without dulling the contact.
const tame = (f, g) => [['highshelf', f, 0.7, g]];

// The picks: close, soft, dry, no melody.
//   from   candidate file names in order (matched without case, extension or punctuation, so
//          "card-slide-1", "cardSlide1" and "card_slide_1" are the same)
//   win    [start, end] seconds of the source to use (a part of a file)
//   hp     high-pass (Hz, 4th order; default 30): table thump and handling rumble out of paper, cloth
//          and small clicks (17-65 % of their energy sat under 200 Hz)
//   eq     extra filters after the high-pass: [type, Hz, q, dB] (asmr.mjs coefs)
//   rel    LU under the voice at suggestedVolume (the kit: ticks -22..-24, keys -19, paper -17,
//          taps -15, knock -14, land -12, haptics -16..-24)
//   kit    the kit sound it stands next to; role: replace (a recorded take of the same event),
//          layer (plays with the kit sound on the same frame), new (an event the kit has no sound for)
//   event  what it is for in a film (the next agent wires it); leadFrames: B starts that many frames
//          before the kit sound (the audition plays it so)
const PICKS = [
  // ui: fingers on real buttons and switches (the owner's "haptic-like" sounds)
  {name: 'click-soft', pack: 'ui-audio', from: ['rollover5'], hp: 120, family: 'ui', rel: -21, kit: 'asmr-haptic-selection', role: 'layer',
    use: 'a soft, real plastic button click: a chip, tab or option chosen', event: 'a chip or option is picked: the Wave pick chip, a List dot mark, a Phone highlight arriving'},
  {name: 'click', pack: 'ui-audio', from: ['click1'], hp: 120, family: 'ui', rel: -21, kit: 'asmr-tap', role: 'layer',
    use: 'a close, firm plastic click: a real button pressed', event: 'the press under a Phone tap ring (same frame as asmr-tap), or the side button 2 frames before asmr-screen'},
  {name: 'click-tiny', pack: 'ui-audio', from: ['rollover2'], hp: 120, family: 'ui', rel: -22, kit: 'asmr-notch', role: 'replace',
    use: 'the smallest real click (40 ms): one notch of a stepper or slider', event: 'a value moves one step: a year, a day of a countdown, a budget notch'},
  {name: 'switch', pack: 'ui-audio', from: ['switch11'], eq: tame(7000, -3), family: 'ui', rel: -20, kit: 'asmr-haptic-rigid', role: 'layer',
    use: 'a small toggle switch flipped: a short spring ring behind the click', event: 'something turns on: a reminder armed (Calendar mark), the Wave mic starts listening'},
  {name: 'toggle', pack: 'ui-audio', from: ['switch28'], eq: tame(7000, -3), family: 'ui', rel: -20, kit: 'asmr-haptic-rigid', role: 'layer',
    use: 'a rocker switch pressed: a short, dry click with body', event: 'a setting flips, a mode changes (QR quiet hours switched on)'},
  {name: 'toggle-b', pack: 'ui-audio', from: ['switch26'], eq: tame(7000, -3), family: 'ui', rel: -20, kit: 'asmr-haptic-rigid', role: 'layer',
    use: 'a second take of the rocker switch (alternate with toggle on repeated switches)', event: 'as toggle'},
  // mech: small mechanisms
  {name: 'latch', pack: 'rpg-audio', from: ['metalLatch'], eq: tame(6000, -3), family: 'mech', rel: -20, kit: 'asmr-haptic-rigid', role: 'replace',
    use: 'a small latch snapping shut: a value locks, a bracket snaps on', event: 'Wire3D highlight brackets snap onto a part; the QR viewfinder locks'},
  {name: 'clasp', pack: 'rpg-audio', from: ['metalClick'], eq: tame(6000, -3), family: 'mech', rel: -20, kit: 'asmr-haptic-success', role: 'layer',
    use: 'a small metal clasp: two clicks 0.28 s apart, the second firmer', event: 'a confirmed good event (29/29, a green check): under the success haptic'},
  {name: 'chip', pack: 'casino-audio', from: ['chip-lay-3'], family: 'mech', rel: -19, kit: 'asmr-pop', role: 'replace',
    use: 'one clay chip laid on felt: a single marker placed', event: 'the MapPin lands on the car, a StripPlot marker (median, mean) is placed'},
  {name: 'chips-stack', pack: 'casino-audio', from: ['chips-stack-1'], eq: tame(6000, -4), family: 'mech', rel: -20, kit: null, role: 'new',
    use: 'a few clay chips stacking: an amount piling up', event: 'a Compare bar or a Squares block reaches its value (with asmr-land)'},
  // paper
  {name: 'card-slide', pack: 'casino-audio', from: ['card-slide-1'], hp: 120, family: 'paper', rel: -17, kit: 'asmr-paper', role: 'replace',
    use: 'a card slides across felt and stops: a card or panel slides into place', event: 'the QRCard or a Notification card slides in'},
  {name: 'card-place', pack: 'casino-audio', from: ['card-place-1'], hp: 120, family: 'paper', rel: -18, kit: 'asmr-haptic-soft', role: 'layer',
    use: 'a card laid down flat: a card settles', event: 'a card or panel comes to rest (with the soft haptic)'},
  {name: 'card-fan', pack: 'casino-audio', from: ['card-fan-1'], hp: 150, family: 'paper', rel: -19, kit: null, role: 'new',
    use: 'cards fanned out: a riffle that ends on a flick at 0.47 s (hitMs)', event: 'several items spread into a row: List rows or Squares arriving one after another'},
  {name: 'page-turn', pack: 'rpg-audio', from: ['bookFlip3'], eq: tame(7000, -3), family: 'paper', rel: -20, kit: 'asmr-flap', role: 'new',
    use: 'a quick page turn (0.2 s): the next month, the next document', event: 'the Calendar moves to the next month; the next screen of the same kind'},
  {name: 'book-open', pack: 'rpg-audio', from: ['bookOpen'], hp: 100, family: 'paper', rel: -18, kit: null, role: 'new',
    use: 'a soft cover opening: a document or a wallet opens', event: 'the wallet or a document screen opens (Phone showing the wallet)'},
  // cloth
  {name: 'cloth', pack: 'rpg-audio', from: ['cloth2'], hp: 100, family: 'cloth', rel: -20, kit: 'asmr-slide', role: 'layer', leadFrames: 5,
    use: 'a short cloth rustle: a phone comes out of a pocket', event: 'the Phone entrance: start it 5 frames before asmr-slide'},
  {name: 'leather', pack: 'rpg-audio', from: ['handleSmallLeather'], hp: 90, family: 'cloth', rel: -19, kit: null, role: 'new',
    use: 'a small leather wallet handled', event: 'the wallet, documents, a card holder'},
  {name: 'leather-drop', pack: 'rpg-audio', from: ['dropLeather'], hp: 50, family: 'cloth', rel: -18, kit: 'asmr-haptic-soft', role: 'layer',
    use: 'a small leather pouch set down: a soft, low settle', event: 'something soft settles: the Phone at rest, the wallet laid down'},
  {name: 'carpet', pack: 'impact-sounds', from: ['footstep_carpet_003'], hp: 50, family: 'cloth', rel: -19, kit: 'asmr-end', role: 'layer',
    use: 'a muffled pat on carpet: a soft, dry settle', event: 'the end card mark settles (under asmr-end), a Title line lands softly'},
  // impact: light wood
  {name: 'wood-tap', pack: 'impact-sounds', from: ['impactWood_light_003'], family: 'impact', rel: -15, kit: 'asmr-knock', role: 'replace',
    use: 'a light tap on wood: a chip, line or card appears', event: 'every asmr-knock event: a List row, a chip, a card appears'},
  {name: 'wood-knock', pack: 'impact-sounds', from: ['impactWood_light_001'], family: 'impact', rel: -15, kit: 'asmr-knock', role: 'replace',
    use: 'a second light wood take (alternate with wood-tap on repeated knocks)', event: 'as wood-tap'},
];

const MAX_DUR = 1.4; // seconds kept after the onset; longer sounds get a soft fade
const FADE_OUT = 0.05; // the tail's fade (at most a quarter of the sound)
const AUDIO = /\.(ogg|wav|mp3|flac)$/i;
const key = (s) => s.toLowerCase().replace(/\.[a-z0-9]+$/, '').replace(/[^a-z0-9]/g, '');
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));
const n = (s) => Math.max(0, Math.round(s * SR));
const rel = (p) => path.relative(ROOT, p);
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ── fetch ──────────────────────────────────────────────────────────────────────────────────
const fetchPacks = async () => {
  fs.mkdirSync(PACK_DIR, {recursive: true});
  for (const p of PACKS) {
    const out = path.join(PACK_DIR, path.basename(p.zip));
    if (fs.existsSync(out) && fs.statSync(out).size === p.bytes) { console.log(`have  ${path.basename(out)}`); continue; }
    const res = await fetch(p.zip);
    if (!res.ok) throw new Error(`${p.zip}: HTTP ${res.status}`);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > 20e6) throw new Error(`${p.zip}: ${buf.length} bytes, more than expected`);
    fs.writeFileSync(out, buf);
    console.log(`got   ${path.basename(out)} (${(buf.length / 1e6).toFixed(2)} MB)${buf.length === p.bytes ? '' : `, expected ${p.bytes} bytes`}`);
  }
};

// ── packs on disk ──────────────────────────────────────────────────────────────────────────
const unpack = (p) => {
  const zip = path.join(PACK_DIR, path.basename(p.zip)), dir = path.join(PACK_DIR, p.id);
  if (!fs.existsSync(dir) && fs.existsSync(zip)) execFileSync('unzip', ['-q', '-o', zip, '-d', dir]);
  if (!fs.existsSync(dir)) return null;
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, {withFileTypes: true})) { const f = path.join(d, e.name); if (e.isDirectory()) walk(f); else files.push(f); } };
  walk(dir);
  const lic = files.find((f) => /licen[cs]e/i.test(path.basename(f)) && /\.txt$/i.test(f));
  return {dir, zip, audio: files.filter((f) => AUDIO.test(f) && !path.basename(f).startsWith('._')).sort(), licence: lic ? fs.readFileSync(lic, 'utf8').trim() : null};
};

// any audio file → 48 kHz 16-bit stereo PCM, read back as float channels
// decoded copies are cached next to the packs (gitignored), never in public/
const DECODED = path.join(PACK_DIR, '_decoded');
// Remotion's own ffmpeg, called directly (about 0.02 s a file instead of 1.1 s through npx); npx
// remotion ffmpeg when the compositor is not where it is expected
const COMPOSITOR = path.join(ROOT, 'node_modules', '@remotion', `compositor-${process.platform}-${process.arch}`);
const FFMPEG = fs.existsSync(path.join(COMPOSITOR, 'ffmpeg')) ? path.join(COMPOSITOR, 'ffmpeg') : null;
const ffmpeg = (args, capture = false) => {
  const stdio = ['ignore', capture ? 'pipe' : 'ignore', capture ? 'pipe' : 'inherit'];
  return FFMPEG
    ? execFileSync(FFMPEG, args, {cwd: COMPOSITOR, env: {...process.env, DYLD_LIBRARY_PATH: COMPOSITOR, LD_LIBRARY_PATH: COMPOSITOR}, stdio, maxBuffer: 256e6})
    : execFileSync('npx', ['remotion', 'ffmpeg', ...args], {cwd: ROOT, stdio, maxBuffer: 256e6});
};
const hash = (s) => { let h = 0; for (const c of s) h = (Math.imul(h, 31) + c.charCodeAt(0)) | 0; return h; };
const decode = (src) => {
  const out = path.join(DECODED, `${key(path.basename(src))}-${(hash(src) >>> 0).toString(16)}.wav`);
  if (!fs.existsSync(out)) {
    fs.mkdirSync(DECODED, {recursive: true});
    ffmpeg(['-hide_banner', '-loglevel', 'error', '-y', '-i', src, '-ar', String(SR), '-ac', '2', '-c:a', 'pcm_s16le', out]);
  }
  return readWav(out).chs;
};
// "It plays": an independent decoder (ffmpeg, not readWav) reads the written file to the end without
// an error. Returns the number of stereo frames it decoded, -1 on an error.
// (Remotion's ffmpeg is a small build: no raw s16le muxer, so it decodes into a WAV stream on stdout)
const plays = (file) => {
  try {
    const b = ffmpeg(['-hide_banner', '-v', 'error', '-i', file, '-map_metadata', '-1', '-c:a', 'pcm_s16le', '-ac', '2', '-ar', String(SR), '-f', 'wav', '-'], true);
    const at = b.indexOf('data', 12, 'ascii');
    return at < 0 ? -1 : (b.length - at - 8) / 4;
  } catch { return -1; }
};

// 10 ms RMS windows of the mid channel
const windows = (L, R) => {
  const w = n(0.01), out = [];
  for (let s = 0; s + w <= L.length; s += w) { let e = 0; for (let i = s; i < s + w; i++) { const m = 0.5 * (L[i] + R[i]); e += m * m; } out.push(Math.sqrt(e / w)); }
  return out;
};

// Clipping in the recording itself: runs of 3+ samples within 0.1 dB of the file's own maximum,
// when that maximum is near full scale (-0.5 dBFS). A clipped source cannot be repaired by levelling.
const clipped = ([L, R]) => {
  let pk = 0;
  for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk < 10 ** (-0.5 / 20)) return 0;
  let runs = 0;
  for (const x of [L, R]) {
    let run = 0;
    for (let i = 0; i < x.length; i++) {
      if (Math.abs(x[i]) >= pk * 0.989) { run++; if (run === 3) runs++; } else run = 0;
    }
  }
  return runs;
};

// The longest stretch inside the kept sound (between its onset and its end) that sits 45 dB or more
// under its loudest 10 ms: a sound with a hole in it (two events with silence between) shows here.
const longestGap = (L, R) => {
  const win = windows(L, R), top = Math.max(...win), th = top * 10 ** (-45 / 20);
  const first = win.findIndex((v) => v >= th);
  let last = win.length - 1;
  while (last > 0 && win[last] < th) last--;
  let best = 0, run = 0;
  for (let i = first; i <= last; i++) { if (win[i] < th) { run++; best = Math.max(best, run); } else run = 0; }
  return best * 0.01;
};

// hiss: the quietest 20 ms anywhere (the silence before and after the sound), against the loudest
// 20 ms, in dB. A file with no silence at all measures its own content here (then it reads 0..-25).
const floorOf = ([L, R]) => {
  const win = windows(L, R);
  let lo = Infinity, hi = 0;
  for (let i = 0; i + 1 < win.length; i++) { const v = Math.hypot(win[i], win[i + 1]) / Math.SQRT2; lo = Math.min(lo, v); hi = Math.max(hi, v); }
  return Number.isFinite(lo) && hi > 0 ? db(lo) - db(hi) : 0;
};

// DC and rumble out (30 Hz), the pick's EQ, its window of the source, silence trimmed so the onset
// sits LEAD (3 ms) in. The tail ends where the sound falls 50 dB under its loudest 10 ms, or, in a
// recording with a noise floor, 8 dB above that floor (never later than -36 dB): the hiss of the room
// the pack was recorded in is not kept. Half-cosine fades at both ends, then the DC offset removed.
const shape = ([L0, R0], pick = {}) => {
  const hp = pick.hp ?? 30;
  let L = filt(filt(L0, 'hp', hp, 0.707), 'hp', hp, 0.707), R = filt(filt(R0, 'hp', hp, 0.707), 'hp', hp, 0.707);
  for (const [type, f, q, g] of pick.eq ?? []) { L = filt(L, type, f, q, g); R = filt(R, type, f, q, g); }
  if (pick.win) { const [a, b] = pick.win.map(n); L = L.slice(a, b); R = R.slice(a, b); }
  let pk = 1e-9;
  for (let i = 0; i < L.length; i++) pk = Math.max(pk, Math.abs(L[i]), Math.abs(R[i]));
  if (pk < 1e-4) return null; // silent
  const win = windows(L, R), top = Math.max(...win);
  let quiet = Infinity;
  for (let i = 0; i + 1 < win.length; i++) quiet = Math.min(quiet, Math.hypot(win[i], win[i + 1]) / Math.SQRT2);
  const floor = floorOf([L, R]);
  // the onset: the mid first reaches -30 dB of the peak (where analyse() puts it), or 20 dB over the
  // quietest 20 ms in a recording whose noise would trigger that earlier
  const onAt = Math.max(pk * 10 ** (-30.5 / 20), (Number.isFinite(quiet) ? quiet : 0) * 10);
  const on = L.findIndex((v, i) => Math.abs(0.5 * (v + R[i])) > onAt);
  if (on < 0) return null;
  const start = on - n(0.0015) - n(LEAD); // 1.5 ms of the rise kept before the threshold
  const thDb = floor < -30 ? clamp(floor + 8, -50, -36) : -50;
  let last = win.length - 1;
  while (last > 0 && win[last] < top * 10 ** (thDb / 20)) last--;
  const end = Math.min(L.length, (last + 1) * n(0.01) + n(0.01), on + n(MAX_DUR));
  const cut = (x) => { const y = new Float64Array(end - start); for (let i = 0; i < y.length; i++) { const j = start + i; y[i] = j >= 0 && j < x.length ? x[j] : 0; } return y; };
  L = cut(L); R = cut(R);
  const len = L.length, fi = n(FADE), fo = Math.max(n(FADE), Math.min(n(FADE_OUT), Math.round(len * 0.25)));
  // A source cut short by its author (a click whose file ends at -20 dB) gets a natural decay: the
  // last 20..80 ms fall exponentially to -40 dB before the fade, like a damped body, not a hard stop.
  const w2 = windows(L, R), endDb = db(Math.max(...w2.slice(-2))) - db(Math.max(...w2));
  const dec = endDb > -40 ? Math.max(n(0.02), Math.min(n(0.08), Math.round(len * 0.35))) : 0;
  for (const x of [L, R]) {
    for (let i = 0; i < len; i++) {
      let g = 1;
      if (i < fi) g *= 0.5 - 0.5 * Math.cos((Math.PI * i) / fi);
      if (dec && i >= len - dec) g *= 10 ** ((-40 * (i - (len - dec))) / dec / 20);
      if (i >= len - fo) g *= 0.5 - 0.5 * Math.cos((Math.PI * (len - 1 - i)) / fo);
      x[i] *= g;
    }
    let s1 = 0, s2 = 0;
    for (let i = 0; i < len; i++) { s1 += x[i]; s2 += Math.sin((Math.PI * i) / (len - 1)) ** 2; }
    const c = s1 / (s2 || 1);
    for (let i = 0; i < len; i++) x[i] -= c * Math.sin((Math.PI * i) / (len - 1)) ** 2;
  }
  return {L, R, cutLong: end === on + n(MAX_DUR), floor, thDb, decayed: dec > 0};
};

// ── pick resolution ────────────────────────────────────────────────────────────────────────
const resolve = (pick, pack, used) => {
  const byKey = new Map(pack.audio.map((f) => [key(path.basename(f)), f]));
  for (const c of pick.from) { const f = byKey.get(key(c)); if (f && !used.has(f)) return f; }
  return null; // no guessing: a missing name is a failed pick
};

// ── LICENSES.md ────────────────────────────────────────────────────────────────────────────
// The lines of a pack's License.txt that carry the licence (not the donate / social lines)
const licenceLines = (txt) => txt.split('\n').map((s) => s.trim()).filter((s) => s && !/^-+$/.test(s) && !/^@/.test(s) && !/donate|request|patreon|twitter|follow on/i.test(s));
const writeLicenses = (packs) => {
  const cc0 = readManifest().filter((e) => e.name.startsWith('cc0-') && fs.existsSync(path.join(ROOT, 'public', e.file)));
  const usedPacks = new Set(cc0.map((e) => e.source.pack));
  const lines = [
    '# Sound licences: public/sfx',
    '',
    `Written by tools/sfx-import.mjs (${new Date().toISOString().slice(0, 10)}). Every sound here may be used in paid, commercial`,
    'videos without credit.',
    '',
    '| files | origin | licence |',
    '|---|---|---|',
    '| `asmr-*.wav` | Synthesised from code in this repository (tools/asmr.mjs). No samples, no third-party audio. | Project\'s own work |',
    '| `app-*.m4a` | The Vinari app\'s own UI sounds, synthesised by Design/sounds/make.py. | Project\'s own work |',
    '| `synth-*.wav` | Older synthesised tests (tools/sfx-synth.mjs). Not used by any scene. | Project\'s own work |',
    `| \`cc0-*.wav\` | Recordings from Kenney's free packs (kenney.nl), converted, trimmed, EQ'd and levelled by tools/sfx-import.mjs. | [${CC0.name}](${CC0.url}) |`,
    '',
    '## CC0 1.0 in plain words',
    '',
    'Kenney (Kenney Vleugels, kenney.nl) dedicated these packs to the public domain under Creative Commons',
    'CC0 1.0 Universal. CC0 waives every copyright and related right the author can waive, worldwide: anyone',
    'may copy, change, distribute and sell the sounds, for any purpose, commercial included, without asking',
    'and without credit. No trademark or patent rights are granted, and the work comes without warranties.',
    `Credit is welcome but not required ("Kenney.nl"). Summary: ${CC0.url} · full legal code: ${CC0.legal}`,
    '',
    '## The packs',
    '',
    'Downloaded 2026-09-24, no account. The zips stay outside the repo in `../_research_scratch/sfx-packs/`',
    '(gitignored); only the converted picks listed below are in public/sfx.',
    '',
    '| pack | page | download | size | licence | used |',
    '|---|---|---|---|---|---|',
    ...PACKS.map((p) => `| ${p.title} | ${p.page} | ${p.zip} | ${(p.bytes / 1e6).toFixed(2)} MB | CC0 1.0 (pack page and License.txt, checked 2026-09-24) | ${usedPacks.has(`Kenney ${p.title}`) ? `${cc0.filter((e) => e.source.pack === `Kenney ${p.title}`).length} files` : 'none (tonal / synthetic)'} |`),
    '',
  ];
  const texts = packs.filter((p) => p.pack?.licence);
  if (texts.length) {
    lines.push('The licence text shipped inside each zip (License.txt), verbatim without the donate and social lines:', '');
    for (const p of texts) lines.push(`- **${p.title}**: ${licenceLines(p.pack.licence).join(' · ')}`);
    lines.push('');
  }
  lines.push('## cc0 files in public/sfx', '');
  if (!cc0.length) lines.push('None yet: the packs have not been downloaded (`node tools/sfx-import.mjs --fetch`, then `node tools/sfx-import.mjs`).', '');
  else {
    lines.push('| file | pack | original file | page | licence |', '|---|---|---|---|---|');
    for (const e of cc0) lines.push(`| \`${path.basename(e.file)}\` | ${e.source.pack} | ${e.source.file} | ${e.source.page} | CC0 1.0 |`);
    lines.push('');
  }
  fs.writeFileSync(path.join(SFX, 'LICENSES.md'), lines.join('\n'));
  console.log(`wrote ${rel(path.join(SFX, 'LICENSES.md'))} (${cc0.length} cc0 files)`);
};

// ── the cc0 audition: each kit sound, then the recorded sound(s) that go with it ────────────────
// Every sound at its level in a film: asmr- cues at their volume x ASMR_TRIM (haptics at the
// Haptic component's own volumes), cc0- cues at suggestedVolume. A layered pair is also played as
// the film would play it (A+B on the same frame, or B `leadFrames` earlier). One gain for the whole
// reel (the loudest peak at -6 dBFS), so every balance is the film's.
const HAPTIC_VOL = {selection: 0.3, light: 0.4, medium: 0.46, heavy: 0.4, rigid: 0.38, soft: 0.46, success: 0.42, warning: 0.38, error: 0.36}; // = common.tsx HAPTIC_VOL
const auditionCc0 = (wavPath) => {
  const man = readManifest(), byName = new Map(man.map((e) => [e.name, e]));
  const cc0 = man.filter((e) => e.name.startsWith('cc0-') && fs.existsSync(path.join(ROOT, 'public', e.file)));
  const ORDER = ['ui', 'mech', 'paper', 'cloth', 'impact'];
  const pickOf = (e) => PICKS.find((p) => `cc0-${p.name}` === e.name) ?? {};
  cc0.sort((a, b) => ORDER.indexOf(a.family) - ORDER.indexOf(b.family) || PICKS.indexOf(pickOf(a)) - PICKS.indexOf(pickOf(b)));
  const vol = (name) => name.startsWith('asmr-haptic-') ? HAPTIC_VOL[name.slice(12)] ?? 0.5 : byName.get(name)?.suggestedVolume ?? 0.5;
  const gain = (name) => vol(name) * (name.startsWith('asmr-') ? FILM_TRIM : 1); // = <Sfx> in common.tsx
  const fileOf = (name) => path.join(ROOT, 'public', byName.get(name).file);
  const items = [];
  let lastKit;
  for (const e of cc0) {
    const kit = e.kit && byName.get(e.kit) ? e.kit : null;
    if (kit && kit !== lastKit) items.push({ab: 'A', name: kit, family: e.family, layers: [{name: kit, at: 0}], note: `kit, what plays today (${e.role === 'replace' ? 'B replaces it' : e.role === 'layer' ? 'B layers on it' : 'B is a new event near it'})`});
    lastKit = kit;
    items.push({ab: 'B', name: e.name, family: e.family, layers: [{name: e.name, at: 0}], note: `${e.role === 'new' ? `new${kit ? ` (near ${kit})` : ''}` : `${e.role} ${kit}`}: ${e.event}`});
    if (kit && e.role === 'layer') {
      const lead = pickOf(e).leadFrames ?? 0;
      items.push({ab: 'A+B', name: `${kit} + ${e.name}`, family: e.family, layers: [{name: e.name, at: 0}, {name: kit, at: n(lead / 30)}], note: `as the film plays them${lead ? ` (B ${lead} frames before A)` : ' (same frame)'}`});
    }
  }
  const lines = [], parts = [];
  let o = n(0.8), prev = null;
  for (const it of items) {
    if (prev) o += it.ab === 'A' ? n(1.9) : n(prev.ab === 'A' ? 0.7 : 1.0);
    if (prev && it.family !== prev.family && it.ab === 'A') o += n(0.6);
    let len = 0;
    for (const ly of it.layers) {
      const {chs} = readWav(fileOf(ly.name));
      const [l, r] = chs.length === 2 ? chs : [chs[0], chs[0]];
      const g = gain(ly.name);
      parts.push({o: o + ly.at, l: l.map((v) => v * g), r: r.map((v) => v * g)});
      len = Math.max(len, ly.at + l.length);
    }
    const t = o / SR;
    lines.push(`${String(lines.length + 1).padStart(2)}  ${Math.floor(t / 60)}:${(t % 60).toFixed(1).padStart(4, '0')}  ${it.ab.padEnd(3)}  ${it.name.padEnd(40)} ${it.family.padEnd(7)} ${it.note}`);
    o += len;
    prev = it;
  }
  const total = o + n(0.6), L = new Float64Array(total), R = new Float64Array(total);
  for (const p of parts) for (let i = 0; i < p.l.length; i++) { L[p.o + i] += p.l[i]; R[p.o + i] += p.r[i]; }
  let top = 1e-9;
  for (let i = 0; i < total; i++) top = Math.max(top, Math.abs(L[i]), Math.abs(R[i]));
  const k = 10 ** (-6 / 20) / top;
  for (let i = 0; i < total; i++) { L[i] *= k; R[i] *= k; }
  fs.mkdirSync(path.dirname(wavPath), {recursive: true});
  writeWav(wavPath, L, R, 77);
  const txt = wavPath.replace(/\.wav$/, '.txt');
  fs.writeFileSync(txt, [
    `Vinari cc0 audition (${path.basename(wavPath)}, ${(total / SR).toFixed(1)} s, no voice, ${cc0.length} recorded sounds).`,
    'A = the synthesised kit sound that plays for that event today, B = the recorded CC0 sound (Kenney) that',
    'replaces it, layers on it, or gives a new event near it a sound; A+B = a layered pair as the film would play it.',
    'A to B 0.7 s, B to the next 1.0 s, a new pair after 1.9 s.',
    'Each sound at its level in a film (asmr- x ASMR_TRIM, haptics at the Haptic volumes, cc0- at suggestedVolume 0.5);',
    `the whole file is raised so its loudest peak is -6 dBFS (x${k.toFixed(2)}), the balance untouched.`,
    'Haptics and soft thuds live low: listen on earbuds or headphones.',
    '',
    ` #  time    AB   ${'name'.padEnd(40)} family  role / event`,
    ...lines, '',
  ].join('\n'));
  console.log(`audition: ${rel(wavPath)} (${(total / SR).toFixed(1)} s, ${items.length} items, ${cc0.length} cc0), order ${rel(txt)}`);
};

// ── main ───────────────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const flag = (f) => args.includes(f);
const packs = PACKS.map((p) => ({...p, pack: flag('--fetch') ? null : unpack(p)}));
const AUDITION = path.join(ROOT, 'out', 'sfx-audition-cc0.wav');

if (flag('--fetch')) {
  await fetchPacks();
  console.log(`\nnext: node tools/sfx-import.mjs`);
  process.exit(0);
}
if (flag('--licenses')) { writeLicenses(packs); process.exit(0); }
if (flag('--audition')) { auditionCc0(AUDITION); process.exit(0); }

const missing = packs.filter((p) => !p.pack);
if (missing.length === PACKS.length) {
  console.log(`no packs in ${PACK_DIR}.\nThey are CC0 zips from kenney.nl (${(PACKS.reduce((a, p) => a + p.bytes, 0) / 1e6).toFixed(1)} MB in all):`);
  for (const p of PACKS) console.log(`  ${path.basename(p.zip).padEnd(34)} ${(p.bytes / 1e6).toFixed(2)} MB  ${p.page}`);
  console.log('Download them with --fetch, then run this again.');
  writeLicenses(packs);
  process.exit(2);
}
for (const p of missing) console.log(`pack missing: ${p.id} (${path.basename(p.zip)})`);

if (flag('--list')) {
  for (const p of packs.filter((x) => x.pack)) {
    console.log(`\n${p.title} (${p.pack.audio.length} files)`);
    for (const f of p.pack.audio) {
      const raw = decode(f), s = shape(raw);
      if (!s) { console.log(`  ${path.basename(f).padEnd(34)} silent`); continue; }
      const {L, R} = s, a = analyse([L, R], SR), c = clipped(raw), gp = longestGap(L, R);
      console.log(`  ${path.basename(f).padEnd(34)} ${a.dur.toFixed(2).padStart(5)} s  centroid ${String(Math.round(a.centroid)).padStart(5)} Hz  hf ${a.hf.toFixed(0).padStart(3)} %  crest ${a.crest.toFixed(1).padStart(5)} dB  hiss ${floorOf(raw).toFixed(0).padStart(4)} dB  corr ${a.corr.toFixed(2).padStart(5)}  gap ${gp.toFixed(2)} s${c ? `  CLIP x${c}` : ''}`);
    }
  }
  process.exit(0);
}

const used = new Set(), own = [], rows = [];
let failed = 0;
for (const pick of PICKS) {
  const p = packs.find((x) => x.id === pick.pack);
  if (!p?.pack) { rows.push(`${pick.name.padEnd(13)} pack ${pick.pack} missing   FAIL`); failed++; continue; }
  const src = resolve(pick, p.pack, used);
  if (!src) { rows.push(`${pick.name.padEnd(13)} none of ${pick.from.join(', ')} in ${pick.pack}   FAIL`); failed++; continue; }
  used.add(src);
  const vol = pick.vol ?? 0.5;
  const raw = decode(src), shaped = shape(raw, pick);
  if (!shaped) { rows.push(`${pick.name.padEnd(13)} ${path.basename(src)} is silent   FAIL`); failed++; continue; }
  const {L, R, cutLong, floor, decayed} = shaped;
  const now = loudness([L, R], SR).fast;
  let g = 10 ** ((VOICE_LUFS + pick.rel - 20 * Math.log10(vol) - now) / 20) * FILM_TRIM;
  const tp = Math.max(truePeak(L), truePeak(R)) * g;
  const limited = db(tp) > -3.2;
  if (limited) g *= 10 ** ((-3.2 - db(tp)) / 20);
  const file = path.join(SFX, `cc0-${pick.name}.wav`);
  writeWav(file, L.map((v) => v * g), R.map((v) => v * g), 9000 + own.length);
  // checks on the written file
  const {chs} = readWav(file), a = analyse(chs, SR), spk = phoneLoss(chs, SR);
  const decoded = plays(file), gap = longestGap(chs[0], chs[1]);
  const srcClip = clipped(pick.win ? raw.map((x) => x.slice(n(pick.win[0]), n(pick.win[1]))) : raw);
  let hard = 0;
  for (const c of chs) for (const v of c) if (Math.abs(v) >= 0.999) hard++;
  const problems = [];
  if (!fs.existsSync(file) || decoded !== chs[0].length) problems.push(`plays? (ffmpeg decoded ${decoded} of ${chs[0].length} frames)`);
  if (a.dur < 0.03 || a.dur > MAX_DUR + 0.05) problems.push(`duration ${a.dur.toFixed(3)} s`);
  if (a.tp > -3) problems.push('peak');
  if (a.peak < -45) problems.push('too quiet');
  if (hard || srcClip) problems.push(`clipping (${srcClip} runs in the source, ${hard} full-scale samples)`);
  if (gap > 0.15) problems.push(`silence inside (${gap.toFixed(2)} s)`);
  if (a.onset > 6) problems.push(`onset ${a.onset.toFixed(1)} ms`);
  if (a.dc > 1e-4) problems.push('dc');
  if (a.edge > 0) problems.push('edge');
  // the end: the last 5 ms (before the final 1 ms) 40 dB under the peak; a sound of 0.1 s or more
  // also passes the kit's own test (its last 20 ms 45 dB under the peak)
  const e0 = chs[0].length - n(0.006), e1 = chs[0].length - n(0.001);
  let ee = 0;
  for (let i = e0; i < e1; i++) ee += (0.5 * (chs[0][i] + chs[1][i])) ** 2;
  const endDb = db(Math.sqrt(ee / (e1 - e0))) - a.peak;
  if (endDb > -40 || (a.dur >= 0.1 && a.tail > -45)) problems.push(`tail (end ${endDb.toFixed(0)} dB, last 20 ms ${a.tail.toFixed(0)} dB)`);
  if (problems.length) failed++;
  const vsVoice = a.fast + 20 * Math.log10(vol) - VOICE_LUFS - 20 * Math.log10(FILM_TRIM); // comparable with the asmr- rows
  rows.push(`${pick.name.padEnd(13)}${pick.family.padStart(7)}${a.dur.toFixed(3).padStart(7)}${a.onset.toFixed(1).padStart(6)}${a.peakAt.toFixed(0).padStart(6)}${a.peak.toFixed(1).padStart(7)}${a.tp.toFixed(1).padStart(7)}` +
    `${vsVoice.toFixed(1).padStart(7)}${String(Math.round(a.centroid)).padStart(7)}${spk.toFixed(1).padStart(7)}${floor.toFixed(0).padStart(6)}${gap.toFixed(2).padStart(6)}  ${path.basename(src)}` +
    (limited ? '  (peak-limited)' : '') + (floor > -45 && floor < -30 ? `  (noise floor ${floor.toFixed(0)} dB: tail cut above it)` : '') + (cutLong ? `  (cut at ${MAX_DUR} s)` : '') + (decayed ? '  (source cut short: decay added)' : '') + (problems.length ? `   FAIL: ${problems.join(', ')}` : ''));
  own.push({
    name: `cc0-${pick.name}`,
    file: `sfx/cc0-${pick.name}.wav`,
    family: pick.family,
    durationSec: +a.dur.toFixed(3),
    use: pick.use,
    event: pick.event,
    kit: pick.kit ?? null,
    role: pick.role,
    ...(pick.leadFrames ? {leadFrames: pick.leadFrames} : {}),
    suggestedVolume: vol,
    sync: 'a recording, silence trimmed: its onset sits 3 ms in, so at = the frame of the first contact; hitMs = its loudest 10 ms',
    hitMs: Math.round(a.peakAt),
    peakDbfs: +a.peak.toFixed(1),
    centroidHz: Math.round(a.centroid),
    loudnessVsVoiceLU: +vsVoice.toFixed(1),
    phoneSpeakerDb: +spk.toFixed(1),
    filmTrim: 'included (+3 dB, like ASMR_TRIM for asmr- cues); do not add cc0- to ASMR_TRIM',
    source: {pack: `Kenney ${p.title}`, file: path.basename(src), page: p.page, licence: 'CC0 1.0'},
  });
}
// cc0- files are this tool's own output: a file whose pick is gone is removed, so asmr.json and the
// folder always agree
for (const f of fs.readdirSync(SFX)) if (/^cc0-.*\.wav$/.test(f) && !own.some((e) => e.file === `sfx/${f}`)) { fs.unlinkSync(path.join(SFX, f)); console.log(`removed ${f} (no longer a pick)`); }
writeManifest(own, (name) => name.startsWith('cc0-'));

console.log(`\nVinari cc0 sounds: ${own.length} of ${PICKS.length} picks, 48 kHz 16-bit stereo, levelled against the voice (${VOICE_LUFS} LUFS)\n`);
console.log('sound         family  dur s onset   hit   peak  tpeak  LU vs    cent    spk floor   gap  source');
console.log('                             ms    ms   dBFS   dBFS  voice      Hz     dB    dB     s');
for (const r of rows) console.log(r);
console.log(`\n${failed ? `${failed} pick(s) failed` : 'all checks pass'}: ffmpeg decodes every file to its last frame, 0.03 s <= duration <= ${MAX_DUR} s, true peak <= -3 dBFS, peak >= -45 dBFS,` +
  '\nno clipping in the source or the file, no silence > 0.15 s inside, onset <= 6 ms, |DC| < 1e-4, first/last sample 0, last 5 ms < -40 dB (and last 20 ms < -45 dB from 0.1 s)');
console.log(`wrote ${rel(path.join(SFX, 'asmr.json'))}`);
writeLicenses(packs);
auditionCc0(AUDITION);

// the combined audition of every new sound (the fresh asmr- ones and these), made by tools/asmr.mjs
try { execFileSync('node', [path.join(HERE, 'asmr.mjs'), '--audition-only'], {cwd: ROOT, stdio: ['ignore', 'inherit', 'inherit']}); } catch (e) { console.log(`(out/sfx-audition.wav not refreshed: ${e.message.split('\n')[0]})`); }
process.exit(failed ? 1 : 0);
