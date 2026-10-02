// Royalty-free by construction: "soft-keys", a cozy lo-fi music bed synthesised from scratch (no samples).
//   node tools/music/soft-keys.mjs   -> public/music/soft-keys.m4a (a 96 s loop, 48 kHz stereo, AAC 160 kb/s)
// A mellow FM electric piano (soft tine, warm bark, low-passed, gentle stereo tremolo) comps Fmaj9 - Em7 -
// Dm9 - G13sus in a slow, swung, humanised pattern at 80 bpm (32 bars = one 96 s loop: 76 bpm would end
// it mid-bar), a round upright-like bass on the changes, a whisper of brushed shaker, a damped stereo
// Freeverb. No drums, no lead melody, no vinyl crackle. Deterministic: a seeded PRNG, never the clock.
// Seamless loop: everything is rendered circularly, so the tail of every note and of the reverb past 96 s
// is overlap-added onto the head and sample 0 follows the last sample as in an endless render.
// Normalised to -20 LUFS integrated (BS.1770-4 K-weighting and gating), true peak under -3 dBTP.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAME = 'soft-keys';
const R = 48000;
// 96 s less 64 samples: afconvert puts 2112 priming samples in front, so N + 2112 is a whole number of
// 1024-sample AAC frames and no decoder pads the end of the loop with a silent remainder
const N = 4607936;
const SECS = N / R; // 95.9987 s
const BARS = 32;
const BEAT = SECS / (BARS * 4); // 0.74999 s
const BPM = 60 / BEAT; // 80.001
const BAR = 4 * BEAT;
const SWING = 0.6; // the off-beat 8th lands 60 % into the beat: lazy, not a shuffle
const TARGET_LUFS = -20;
const TP_CEIL = -3.8; // dBTP before the AAC encode, which adds a few tenths
const TAU = 2 * Math.PI;
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const t0 = Date.now(); // only to print the run time; never feeds the sound

// mulberry32, seeded
let seed = 0x5f4b1e77 >>> 0;
const rand = () => {
  seed = (seed + 0x6d2b79f5) >>> 0;
  let t = seed;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => {
  let s = 0;
  for (let i = 0; i < 6; i++) s += rand();
  return Math.max(-2.5, Math.min(2.5, (s - 3) * Math.SQRT2));
};
const wrap = (i) => ((i % N) + N) % N;

const keysL = new Float32Array(N);
const keysR = new Float32Array(N);
const bassM = new Float32Array(N);
const shkL = new Float32Array(N);
const shkR = new Float32Array(N);

// ---- instruments (each writes circularly: a tail past 96 s lands on the head) ----

// Electric piano: two 1:1 FM pairs (the second 2 cents sharp, a slow warm beat), a 14:1 tine pair that
// only sounds for the first few ms, a 2nd harmonic ("bark") and a soft 3rd..6th harmonic series that fade
// faster than the body, a two-pole low-pass that closes after the strike, two-stage decay, a damper on key-up.
function epiano(at, m, vel, dur) {
  const f = hz(m);
  let idx = wrap(Math.round(at * R));
  const reg = Math.sqrt(262 / f); // low notes ring longer
  const tau1 = 0.42 * reg;
  const tau2 = 3.4 * reg;
  // (e1: the strike's quick drop; e2: the long ring)
  const rel = 0.14;
  const off = Math.round(dur * R);
  const len = off + Math.round(rel * 9 * R);
  const w = (TAU * f) / R;
  const w2 = w * 1.0012; // 2 cents
  const gain = 0.1 * vel ** 1.3 * (220 / f) ** 0.12;
  const bright = Math.min(1, Math.sqrt(330 / f)); // less FM up high: the top stays soft
  const d1 = Math.exp(-1 / (tau1 * R));
  const d2 = Math.exp(-1 / (tau2 * R));
  const dr = Math.exp(-1 / (rel * R));
  const dIa = Math.exp(-1 / (0.1 * R));
  const dIb = Math.exp(-1 / (2.5 * R));
  const dTi = Math.exp(-1 / (0.012 * R));
  const dTa = Math.exp(-1 / (0.3 * R));
  const dBk = Math.exp(-1 / (0.6 * R));
  const dFe = Math.exp(-1 / (0.3 * R));
  let e1 = 0.4;
  let e2 = 0.6;
  let er = 1;
  let iA = 2.6 * vel * bright;
  let iB = 1.6 * vel * bright;
  let iT = 1.5 * vel;
  let aT = 0.2 * vel;
  let aB = 0.3 * vel;
  // 3rd..6th harmonics: about -14, -24, -33, -42 dB at a medium touch, each fading faster than the last
  const hA = [0.2 * vel ** 0.5, 0.075 * vel, 0.03 * vel ** 1.5, 0.012 * vel ** 2];
  const hD = hA.map((_, j) => Math.exp(-1 / ((1.4 / (j + 1) ** 0.7) * R)));
  let h3 = hA[0];
  let h4 = hA[1];
  let h5 = hA[2];
  let h6 = hA[3];
  let fe = 1;
  const fcA = 3000 + 2500 * vel * vel;
  const fcS = 1800 + 1200 * vel;
  let c = 0;
  let l1 = 0;
  let l2 = 0;
  let r1 = 0;
  let r2 = 0;
  const pan = Math.min(0.8, Math.max(0.2, 0.5 + (0.3 * (m - 57)) / 12));
  const gl = Math.cos((pan * Math.PI) / 2) * Math.SQRT2 * gain;
  const gr = Math.sin((pan * Math.PI) / 2) * Math.SQRT2 * gain;
  const atkN = Math.round(0.0025 * R);
  let ph = 0;
  let ph2 = 0;
  for (let k = 0; k < len; k++) {
    if ((k & 15) === 0) c = 1 - Math.exp((-TAU * (fcS + (fcA - fcS) * fe)) / R);
    const I = iA + iB;
    // the two body pairs lean to opposite sides: their slow 1.3-cent beat becomes a gentle stereo shimmer
    const p1 = Math.sin(ph + I * Math.sin(ph));
    const p2 = Math.sin(ph2 + 0.9 * I * Math.sin(ph2));
    // sin(k ph) by the Chebyshev recurrence: one cos for the whole series
    const s1 = Math.sin(ph);
    const c2 = 2 * Math.cos(ph);
    const s2 = c2 * s1;
    const s3 = c2 * s2 - s1;
    const s4 = c2 * s3 - s2;
    const s5 = c2 * s4 - s3;
    const s6 = c2 * s5 - s4;
    const common = aT * Math.sin(ph + iT * Math.sin(14 * ph)) + aB * s2 + h3 * s3 + h4 * s4 + h5 * s5 + h6 * s6;
    const xl = 0.7 * p1 + 0.3 * p2 + common;
    const xr = 0.3 * p1 + 0.7 * p2 + common;
    l1 += c * (xl - l1);
    l2 += c * (l1 - l2);
    r1 += c * (xr - r1);
    r2 += c * (r1 - r2);
    let a = (e1 + e2) * er;
    if (k < atkN) a *= 0.5 - 0.5 * Math.cos((Math.PI * k) / atkN);
    keysL[idx] += l2 * a * gl;
    keysR[idx] += r2 * a * gr;
    if (++idx === N) idx = 0;
    ph += w;
    if (ph > TAU) ph -= TAU;
    ph2 += w2;
    if (ph2 > TAU) ph2 -= TAU;
    e1 *= d1;
    e2 *= d2;
    iA *= dIa;
    iB *= dIb;
    iT *= dTi;
    aT *= dTa;
    aB *= dBk;
    h3 *= hD[0];
    h4 *= hD[1];
    h5 *= hD[2];
    h6 *= hD[3];
    fe *= dFe;
    if (k >= off) er *= dr;
  }
}

// Upright-like bass: six slightly stretched partials, the upper ones brighter at the pluck and dying
// first, a pitch that settles from 10 cents sharp, a soft tanh, a 900 Hz low-pass. Round, not boomy.
function bass(at, m, vel, dur) {
  const f = hz(m);
  let idx = wrap(Math.round(at * R));
  const rel = 0.09;
  const off = Math.round(dur * R);
  const len = off + Math.round(rel * 9 * R);
  const amps = [1, 0.62, 0.4, 0.2, 0.1, 0.05];
  const K = amps.length;
  const env = Float64Array.from(amps);
  const dec = Float64Array.from(amps, (_, j) => Math.exp(-1 / ((R * 1.9) / (j + 1) ** 0.85)));
  const pl = Float64Array.from(amps, (a, j) => 0.5 * j * a);
  const stretch = Float64Array.from(amps, (_, j) => (j + 1) * (1 + 0.0005 * (j + 1) * (j + 1)));
  const dP = Math.exp(-1 / (0.045 * R));
  const dG = Math.exp(-1 / (0.05 * R));
  const dr = Math.exp(-1 / (rel * R));
  const c = 1 - Math.exp((-TAU * 1100) / R);
  const atkN = Math.round(0.006 * R);
  const w = (TAU * f) / R;
  const g = 0.115 * vel;
  let pk = 1;
  let glide = 0.006;
  let er = 1;
  let ph = 0;
  let lp = 0;
  for (let k = 0; k < len; k++) {
    let x = 0;
    for (let j = 0; j < K; j++) x += (env[j] + pl[j] * pk) * Math.sin(stretch[j] * ph);
    x = Math.tanh(1.4 * 0.55 * x) / 1.4;
    lp += c * (x - lp);
    let a = er;
    if (k < atkN) a *= 0.5 - 0.5 * Math.cos((Math.PI * k) / atkN);
    bassM[idx] += lp * a * g;
    if (++idx === N) idx = 0;
    ph += w * (1 + glide);
    glide *= dG;
    for (let j = 0; j < K; j++) env[j] *= dec[j];
    pk *= dP;
    if (k >= off) er *= dr;
  }
}

// Brushed shaker: band-passed noise with a soft swell and a short tail. A whisper.
function shaker(at, vel, pan) {
  let idx = wrap(Math.round(at * R));
  const len = Math.round(0.2 * R);
  const f0 = 4300 + 700 * rand();
  const w0 = (TAU * f0) / R;
  const al = Math.sin(w0) / (2 * 0.8);
  const a0 = 1 + al;
  const b0 = al / a0;
  const b2 = -al / a0;
  const a1 = (-2 * Math.cos(w0)) / a0;
  const a2 = (1 - al) / a0;
  const dRise = Math.exp(-1 / (0.012 * R));
  const dFall = Math.exp(-1 / (0.055 * R));
  const g = 0.05 * vel;
  const gl = Math.cos((pan * Math.PI) / 2) * Math.SQRT2 * g;
  const gr = Math.sin((pan * Math.PI) / 2) * Math.SQRT2 * g;
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  let rise = 1;
  let fall = 1;
  for (let k = 0; k < len; k++) {
    const x = rand() * 2 - 1;
    const y = b0 * x + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1;
    x1 = x;
    y2 = y1;
    y1 = y;
    const e = (1 - rise) * (1 - rise) * fall;
    shkL[idx] += y * e * gl;
    shkR[idx] += y * e * gr;
    if (++idx === N) idx = 0;
    rise *= dRise;
    fall *= dFall;
  }
}

// ---- the score ----

// voicings (MIDI; C4 = 60), chosen so the hands move by steps from chord to chord
const CH = {
  Fa: {root: 41, keys: [52, 57, 60, 67]}, // Fmaj9: E3 A3 C4 G4 over F2
  Ea: {root: 40, keys: [50, 55, 59, 64]}, // Em7: D3 G3 B3 E4 over E2
  Da: {root: 38, keys: [48, 53, 57, 64]}, // Dm9: C3 F3 A3 E4 over D2
  Ga: {root: 43, keys: [50, 53, 57, 60, 64]}, // G13sus: D3 F3 A3 C4 E4 over G2
  Fb: {root: 41, keys: [57, 60, 64, 67]}, // Fmaj9, higher: A3 C4 E4 G4
  Eb: {root: 40, keys: [55, 59, 62, 64]}, // Em7: G3 B3 D4 E4
  Db: {root: 38, keys: [53, 57, 60, 64]}, // Dm9: F3 A3 C4 E4
  Gb: {root: 43, keys: [53, 57, 62, 64]}, // G13sus: F3 A3 D4 E4
};
const A = ['Fa', 'Ea', 'Da', 'Ga', 'Fa', 'Ea', 'Da', 'Ga'];
const B = ['Fb', 'Eb', 'Db', 'Gb', 'Fb', 'Eb', 'Db', 'Ga'];
const FORM = [...A, ...B, ...A, ...B];

// comp patterns: e = 8th of the bar (0..7, odd ones swung), sel = which notes, v = velocity,
// d = length in beats, roll = ms between the notes of a rolled chord (bottom up)
// (held to the bar line, so the bed never drops out before a change)
const PAT = {
  hold: [{e: 0, sel: 'all', v: 0.62, d: 3.95, roll: 22}],
  push: [
    {e: 0, sel: 'all', v: 0.6, d: 1.5, roll: 14},
    {e: 3, sel: 'up', v: 0.42, d: 1.3, roll: 8},
    {e: 6, sel: 'lo', v: 0.34, d: 1.0, roll: 6},
  ],
  two: [
    {e: 0, sel: 'all', v: 0.6, d: 2.0, roll: 16},
    {e: 4, sel: 'all', v: 0.4, d: 1.95, roll: 10},
  ],
  late: [
    {e: 0, sel: 'lo', v: 0.58, d: 3.95, roll: 6},
    {e: 1, sel: 'up', v: 0.46, d: 3.35, roll: 20},
  ],
  and: [
    {e: 0, sel: 'all', v: 0.58, d: 3.0, roll: 14},
    {e: 5, sel: 'top', v: 0.36, d: 1.35, roll: 0},
  ],
  spread: [{e: 0, sel: 'all', v: 0.56, d: 3.9, roll: 70}],
};
const COMP = [
  'hold', 'push', 'and', 'late', 'two', 'push', 'and', 'spread',
  'late', 'push', 'two', 'and', 'hold', 'push', 'and', 'spread',
  'hold', 'and', 'push', 'late', 'two', 'and', 'push', 'spread',
  'late', 'two', 'push', 'and', 'hold', 'push', 'and', 'spread',
];
const pos8 = (e) => Math.floor(e / 2) + (e % 2 ? SWING : 0); // in beats
const pick = (keys, sel) =>
  sel === 'all' ? keys : sel === 'up' ? keys.slice(1) : sel === 'lo' ? keys.slice(0, 2) : keys.slice(-1);

let notes = 0;
for (let bar = 0; bar < BARS; bar++) {
  const ch = CH[FORM[bar]];
  const barT = bar * BAR;
  for (const ev of PAT[COMP[bar]]) {
    const at = barT + pos8(ev.e) * BEAT + 0.006 + 0.005 * gauss(); // a hair behind the beat
    const ns = pick(ch.keys, ev.sel);
    const evV = ev.v * (1 + 0.06 * gauss());
    ns.forEach((m, j) => {
      const voice = ns.length > 1 ? (j === ns.length - 1 ? 1.08 : j === 0 ? 0.92 : 1) : 1;
      const v = Math.min(0.9, evV * voice * (1 + 0.05 * gauss()));
      const roll = j * ev.roll * (1 + 0.2 * gauss()) * 0.001 + 0.002 * gauss() * (j > 0 ? 1 : 0);
      epiano(at + Math.max(0, roll), m, v, ev.d * BEAT * (1 + 0.06 * gauss()));
      notes++;
    });
  }
  // bass: the root on every change, a soft fifth leading back at the end of each 4-bar line
  const bt = barT + 0.003 * gauss();
  const bv = 0.62 * (1 + 0.05 * gauss());
  if (bar % 4 === 3) {
    bass(bt, ch.root, bv, 1.6 * BEAT);
    bass(barT + pos8(5) * BEAT + 0.004 * gauss(), ch.root + 7, 0.4 * (1 + 0.05 * gauss()), 1.1 * BEAT);
  } else {
    bass(bt, ch.root, bv, 3.8 * BEAT);
  }
  // shaker: swung 8ths, the off-beats a little stronger, a few left out
  for (let e = 0; e < 8; e++) {
    if (rand() < 0.08) continue;
    const v = (e % 2 ? 0.55 : 0.3) * (1 + 0.15 * gauss());
    shaker(barT + pos8(e) * BEAT + 0.004 * gauss(), v, 0.64);
  }
}

// ---- circular processing: every stateful stage first runs over the loop's last `warm` seconds, so its
// state at sample 0 is the state an endless render would have there ----

function biquad(type, f, q, db = 0) {
  const w0 = (TAU * f) / R;
  const cs = Math.cos(w0);
  const al = Math.sin(w0) / (2 * q);
  const A = 10 ** (db / 40);
  let b;
  let a;
  if (type === 'lp') (b = [(1 - cs) / 2, 1 - cs, (1 - cs) / 2]), (a = [1 + al, -2 * cs, 1 - al]);
  else if (type === 'hp') (b = [(1 + cs) / 2, -(1 + cs), (1 + cs) / 2]), (a = [1 + al, -2 * cs, 1 - al]);
  else (b = [1 + al * A, -2 * cs, 1 - al * A]), (a = [1 + al / A, -2 * cs, 1 - al / A]); // peaking
  return {b0: b[0] / a[0], b1: b[1] / a[0], b2: b[2] / a[0], a1: a[1] / a[0], a2: a[2] / a[0]};
}
function filterLoop(x, stages, warm = 1) {
  const y = new Float32Array(N);
  for (const s of stages) {
    const src = s === stages[0] ? x : y;
    let x1 = 0;
    let x2 = 0;
    let y1 = 0;
    let y2 = 0;
    const out = new Float32Array(N);
    for (let j = -Math.round(warm * R); j < N; j++) {
      const i = j < 0 ? j + N : j;
      const v = src[i];
      const o = s.b0 * v + s.b1 * x1 + s.b2 * x2 - s.a1 * y1 - s.a2 * y2;
      x2 = x1;
      x1 = v;
      y2 = y1;
      y1 = o;
      if (j >= 0) out[i] = o;
    }
    y.set(out);
  }
  return y;
}
const rms = (...xs) => {
  let s = 0;
  for (const x of xs) for (let i = 0; i < N; i++) s += x[i] * x[i];
  return Math.sqrt(s / (N * xs.length));
};
const db = (x) => 20 * Math.log10(x);

// keys: gentle tanh saturation (only the loudest strikes are touched), then a slow stereo tremolo
// (2 cycles a beat: 256 whole cycles in the loop, so it is seamless too)
{
  let pk = 0;
  for (let i = 0; i < N; i++) pk = Math.max(pk, Math.abs(keysL[i]), Math.abs(keysR[i]));
  const s = 0.85 / pk;
  const trem = 0.24;
  const rate = 2 / BEAT;
  for (let i = 0; i < N; i++) {
    const lfo = Math.sin((TAU * rate * i) / R);
    keysL[i] = (Math.tanh(s * keysL[i]) / s) * (1 - trem * (0.5 + 0.5 * lfo));
    keysR[i] = (Math.tanh(s * keysR[i]) / s) * (1 - trem * (0.5 - 0.5 * lfo));
  }
}

// reverb send: mono, 24 ms pre-delay, 200 Hz .. 4.5 kHz, then a stereo Freeverb (8 damped combs and 4
// all-passes a side, the classic tunings scaled to 48 kHz, right side spread by 23 samples)
const send = new Float32Array(N);
{
  const pre = Math.round(0.024 * R);
  for (let i = 0; i < N; i++) {
    const j = i - pre < 0 ? i - pre + N : i - pre;
    send[i] = 0.5 * (keysL[j] + keysR[j]) + 0.12 * bassM[j] + 0.5 * (shkL[j] + shkR[j]) * 0.8;
  }
}
const sendF = filterLoop(send, [biquad('hp', 200, 0.707), biquad('lp', 4500, 0.707)]);
const wetL = new Float32Array(N);
const wetR = new Float32Array(N);
{
  const sc = R / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const apT = [556, 441, 341, 225];
  const mk = (t, sp) => ({buf: new Float32Array(Math.round((t + sp) * sc)), i: 0, st: 0});
  const sides = [0, 23].map((sp) => ({combs: combT.map((t) => mk(t, sp)), aps: apT.map((t) => mk(t, sp))}));
  const fb = 0.88;
  const damp = 0.42;
  const warm = Math.round(12 * R); // the tail is long gone after 12 s
  for (let j = -warm; j < N; j++) {
    const i = j < 0 ? j + N : j;
    const inp = sendF[i] * 0.015;
    for (let s = 0; s < 2; s++) {
      const side = sides[s];
      let acc = 0;
      for (const c of side.combs) {
        const o = c.buf[c.i];
        c.st = o * (1 - damp) + c.st * damp;
        c.buf[c.i] = inp + c.st * fb;
        if (++c.i === c.buf.length) c.i = 0;
        acc += o;
      }
      for (const a of side.aps) {
        const bo = a.buf[a.i];
        a.buf[a.i] = acc + bo * 0.5;
        if (++a.i === a.buf.length) a.i = 0;
        acc = bo - acc;
      }
      if (j >= 0) (s ? wetR : wetL)[i] = acc;
    }
  }
}

// mix: the reverb sits about 8 dB under the dry keys (cozy, not washy)
const outL = new Float32Array(N);
const outR = new Float32Array(N);
{
  const dry = rms(keysL, keysR);
  const wg = (dry * 10 ** (-8 / 20)) / rms(wetL, wetR);
  for (let i = 0; i < N; i++) {
    outL[i] = keysL[i] + bassM[i] + shkL[i] + wetL[i] * wg;
    outR[i] = keysR[i] + bassM[i] + shkR[i] + wetR[i] * wg;
  }
  console.log(
    `stems (dBFS rms, before gain): keys ${db(dry).toFixed(1)}  bass ${db(rms(bassM)).toFixed(1)}  ` +
      `shaker ${db(rms(shkL, shkR)).toFixed(1)}  reverb ${db(rms(wetL, wetR) * wg).toFixed(1)}`,
  );
}

// glue: a slow, soft-knee RMS compressor on the whole mix (2:1 above 3 dB over the mix's own level), so a
// strike does not jump out of the bed; run circularly like everything else
{
  const W = Math.round(2 * R);
  const aAtt = Math.exp(-1 / (0.03 * R));
  const aRel = Math.exp(-1 / (0.45 * R));
  const thr = db(rms(outL, outR)) + 3;
  const ratio = 2;
  const knee = 6;
  const gainAt = new Float32Array(N);
  let env = 0;
  for (let j = -W; j < N; j++) {
    const i = j < 0 ? j + N : j;
    const p = 0.5 * (outL[i] * outL[i] + outR[i] * outR[i]);
    env = p > env ? aAtt * env + (1 - aAtt) * p : aRel * env + (1 - aRel) * p;
    if (j < 0) continue;
    const lv = 10 * Math.log10(env + 1e-12);
    const over = lv - thr;
    const red =
      over <= -knee / 2 ? 0 : over >= knee / 2 ? over * (1 - 1 / ratio) : ((1 - 1 / ratio) * (over + knee / 2) ** 2) / (2 * knee);
    gainAt[i] = 10 ** (-red / 20);
  }
  let most = 0;
  for (let i = 0; i < N; i++) {
    outL[i] *= gainAt[i];
    outR[i] *= gainAt[i];
    most = Math.max(most, -db(gainAt[i]));
  }
  console.log(`glue: up to ${most.toFixed(1)} dB of gain reduction`);
}

// master: 45 Hz high-pass (24 dB/oct, no sub), soft top (6 kHz), a small dip where the voice speaks
const master = [
  biquad('hp', 45, 0.5412),
  biquad('hp', 45, 1.3066),
  biquad('lp', 6000, 0.707),
  biquad('peak', 2600, 0.9, -2),
];
const L = filterLoop(outL, master);
const Rt = filterLoop(outR, master);

// ---- loudness (BS.1770-4) and true peak (4x oversampled), both over the loop ----
function lufs(l, r) {
  const st1 = {b0: 1.53512485958697, b1: -2.69169618940638, b2: 1.19839281085285, a1: -1.69065929318241, a2: 0.73248077421585};
  const st2 = {b0: 1, b1: -2, b2: 1, a1: -1.99004745483398, a2: 0.99007225036621};
  const blk = Math.round(0.4 * R);
  const hop = Math.round(0.1 * R);
  const cum = new Float64Array(N + 1);
  for (const x of [l, r]) {
    const k = filterLoop(x, [st1, st2]);
    let s = 0;
    for (let i = 0; i < N; i++) {
      s += k[i] * k[i];
      cum[i + 1] += s;
    }
  }
  const z = [];
  for (let s = 0; s + blk <= N; s += hop) z.push((cum[s + blk] - cum[s]) / blk);
  const lk = (v) => -0.691 + 10 * Math.log10(v);
  const mean = (a) => a.reduce((p, v) => p + v, 0) / a.length;
  let g = z.filter((v) => lk(v) > -70);
  const rel = lk(mean(g)) - 10;
  g = g.filter((v) => lk(v) > rel);
  return lk(mean(g));
}
function truePeak(...xs) {
  const T = 12;
  const ker = [0.25, 0.5, 0.75].map((p) => {
    const h = [];
    for (let k = -T + 1; k <= T; k++) {
      const u = k - p;
      const win = 0.5 + 0.5 * Math.cos((Math.PI * u) / T);
      h.push((Math.sin(Math.PI * u) / (Math.PI * u)) * win);
    }
    return h;
  });
  let tp = 0;
  for (const x of xs) {
    let sp = 0;
    for (let i = 0; i < N; i++) sp = Math.max(sp, Math.abs(x[i]));
    tp = Math.max(tp, sp);
    for (let i = 0; i < N; i++) {
      if (Math.abs(x[i]) < 0.5 * sp && Math.abs(x[(i + 1) % N]) < 0.5 * sp) continue;
      for (const h of ker) {
        let v = 0;
        for (let k = -T + 1, q = 0; k <= T; k++, q++) v += x[wrap(i + k)] * h[q];
        tp = Math.max(tp, Math.abs(v));
      }
    }
  }
  return db(tp);
}

const I0 = lufs(L, Rt);
let gain = 10 ** ((TARGET_LUFS - I0) / 20);
let tp = truePeak(L, Rt) + db(gain);
if (tp > TP_CEIL) {
  // too peaky for -20 LUFS: a soft knee above the ceiling instead of a quieter bed
  console.log(`true peak ${tp.toFixed(2)} dBTP at ${TARGET_LUFS} LUFS: soft-clipping the peaks`);
  const ceil = 10 ** (TP_CEIL / 20) / gain;
  const knee = 0.7 * ceil;
  for (const x of [L, Rt])
    for (let i = 0; i < N; i++) {
      const a = Math.abs(x[i]);
      if (a > knee) x[i] = Math.sign(x[i]) * (knee + (ceil - knee) * Math.tanh((a - knee) / (ceil - knee)));
    }
  gain = 10 ** ((TARGET_LUFS - lufs(L, Rt)) / 20);
  tp = truePeak(L, Rt) + db(gain);
}
for (let i = 0; i < N; i++) {
  L[i] *= gain;
  Rt[i] *= gain;
}

// seam: the jump from the last sample to sample 0 against the jumps inside the loop
let jumpSeam = 0;
let jumpMax = 0;
for (const x of [L, Rt]) {
  jumpSeam = Math.max(jumpSeam, Math.abs(x[0] - x[N - 1]));
  for (let i = 1; i < N; i++) jumpMax = Math.max(jumpMax, Math.abs(x[i] - x[i - 1]));
}
const winRms = (a, b) => {
  let s = 0;
  for (const x of [L, Rt]) for (let i = a; i < b; i++) s += x[i] * x[i];
  return db(Math.sqrt(s / (2 * (b - a))));
};
const half = R / 2;

// ---- write a 24-bit WAV, encode AAC 160 kb/s with macOS afconvert, delete the WAV ----
const buf = Buffer.alloc(44 + N * 6);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 6, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(R, 24);
buf.writeUInt32LE(R * 6, 28);
buf.writeUInt16LE(6, 32);
buf.writeUInt16LE(24, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 6, 40);
for (let i = 0; i < N; i++) {
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, L[i])) * 8388607), 44 + i * 6, 3);
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, Rt[i])) * 8388607), 47 + i * 6, 3);
}
const dir = path.join(root, 'public', 'music');
fs.mkdirSync(dir, {recursive: true});
const wav = path.join(dir, `${NAME}.wav`);
const m4a = path.join(dir, `${NAME}.m4a`);
fs.writeFileSync(wav, buf);
try {
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-q', '127', wav, m4a]);
} finally {
  fs.unlinkSync(wav);
}
console.log(
  `music: public/music/${NAME}.m4a  ${SECS.toFixed(4)} s, ${BPM.toFixed(3)} bpm, ${notes} keys notes  ` +
    `${TARGET_LUFS} LUFS (was ${I0.toFixed(2)} before gain), true peak ${tp.toFixed(2)} dBTP  ` +
    `seam jump ${jumpSeam.toFixed(5)} (largest jump inside ${jumpMax.toFixed(5)}), ` +
    `rms first/last 0.5 s ${winRms(0, half).toFixed(1)} / ${winRms(N - half, N).toFixed(1)} dBFS  ` +
    `${(fs.statSync(m4a).size / 1048576).toFixed(2)} MB  ${((Date.now() - t0) / 1000).toFixed(1)} s`,
);
