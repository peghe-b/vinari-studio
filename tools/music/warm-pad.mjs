// Royalty-free by construction: "warm-pad", a warm ambient music bed synthesised from scratch. No samples used.
//   node tools/music/warm-pad.mjs   -> public/music/warm-pad.m4a (a 96 s seamless loop, 48 kHz stereo, about -20 LUFS)
// No rhythm at all: five slowly drifting, detuned voices (Cmaj9 / Am9 / Fmaj7(#11) / G6sus, a chord every 8 s, the
// common tones held, the moving voices a step away) through a soft low-pass that opens and closes, a soft sine bass on
// the roots, a faint shimmer an octave up and a small, damped stereo reverb (Freeverb). Seeded PRNG, no clock: the same
// file every run. The whole piece is periodic in the loop; it is rendered with a pre-roll and 3 s past the end, and the
// tail is crossfaded onto the head, so the last sample runs straight into the first.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAME = 'warm-pad';
const R = 48000;
// 96.02 s: Apple's AAC encoder puts 2112 priming samples in front, and 2112 + N fills whole 1024-sample frames, so the
// m4a has no padding at the end: a decoder that skips the priming (ffmpeg, Apple) gives back exactly N samples.
const N = 4608960;
const LOOP = N / R; // seconds in the file
const XF = 3; // seconds rendered past the end, crossfaded onto the head
const PRE = 12; // seconds of pre-roll: the reverb and the filters settle, so the head is the tail's continuation
const OFF = PRE * R; // buffer index of the file's first sample (absolute sample 0)
const XN = XF * R;
const W = OFF + N + XN;
const CHS = N / 12; // samples per chord (384080, about 8 s): 12 chords per loop, 3 phrases of 4
const PHR = 4;
const BLOCK = 32; // control rate: envelopes, drifts and the filter sweep move every 32 samples
const TARGET_LUFS = -20;
const TAU = 2 * Math.PI;
const HALF_PI = Math.PI / 2;
const CENT = Math.LN2 / 1200;
const t0 = Date.now(); // run time only; nothing musical reads the clock

// ---- seeded randomness: every note's humanising depends only on its place in the loop ----
const mulberry32 = (a) => () => {
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const SEED = 20261002;
const rngFor = (...keys) => {
  let h = SEED ^ 0x9e3779b9;
  for (const k of keys) {
    h = Math.imul(h ^ (k + 0x7f4a7c15), 0x85ebca6b);
    h ^= h >>> 13;
    h = Math.imul(h, 0xc2b2ae35);
    h ^= h >>> 16;
  }
  return mulberry32(h);
};
const mod = (a, n) => ((a % n) + n) % n;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---- harmony: [bass, v1..v5]; every adjacent pair a 2nd or wider, no minor 2nd or minor 9th anywhere ----
const CHORDS = [
  [36, 52, 55, 59, 62, 67], // Cmaj9        C2 | E3 G3 B3 D4 G4
  [33, 52, 55, 60, 64, 71], // Am9          A1 | E3 G3 C4 E4 B4
  [41, 52, 57, 60, 64, 71], // Fmaj7(#11)   F2 | E3 A3 C4 E4 B4
  [43, 52, 55, 60, 62, 69], // G6sus(9)     G2 | E3 G3 C4 D4 A4
];
// shimmer, an octave over the top voices, a different colour in each 32 s phrase: [v5], [v4 v5], [v4]
const SHIMMER = [[4], [3, 4], [3]];

// chord indices rendered: whole phrases from -32 s to 128 s, so the pre-roll and the 3 s tail repeat the loop exactly
const K0 = -PHR;
const K1 = 4 * PHR;

// One note per run of the same pitch inside a phrase: common tones are held, every voice is re-struck at a phrase start.
function runs(pitchAt) {
  const out = [];
  for (let k = K0; k < K1; ) {
    const m = pitchAt(k);
    let k2 = k + 1;
    while (k2 < K1 && mod(k2, PHR) !== 0 && pitchAt(k2) === m) k2++;
    if (m != null) out.push({m, k, k2});
    k = k2;
  }
  return out;
}

// ---- wavetables (band-limited, linear interpolation) ----
const TS = 4096;
function table(harmonics) {
  const t = new Float64Array(TS + 1);
  let peak = 0;
  for (let i = 0; i < TS; i++) {
    let s = 0;
    for (const [n, a, ph = 0] of harmonics) s += a * Math.sin((TAU * n * i) / TS + ph);
    t[i] = s;
    peak = Math.max(peak, Math.abs(s));
  }
  for (let i = 0; i < TS; i++) t[i] /= peak;
  t[TS] = t[0];
  return t;
}
// warm soft saw: 1/n^1.4, evens a touch lower, an extra roll-off; 18 harmonics (B4 x 18 = 8.9 kHz, no aliasing)
const PAD_TAB = table(Array.from({length: 18}, (_, i) => [i + 1, Math.pow(i + 1, -1.4) * (i % 2 ? 0.85 : 1) * Math.exp(-(i + 1) / 17)]));
const BASS_TAB = table([[1, 1], [2, 0.1], [3, 0.035]]);
const SHIM_TAB = table([[1, 1], [2, 0.16, 0.6], [3, 0.04, 1.1]]);

// ---- buffers (absolute sample a lives at index a + OFF) ----
const buf = () => new Float32Array(W);
const padL = buf(), padR = buf(), bass = buf(), shL = buf(), shR = buf();

// Render one note into outL/outR. nt: {m, k, k2}; o: the layer's sound.
function note(nt, layer, v, o, outL, outR) {
  const r = rngFor(layer, v, mod(nt.k, 12));
  const rOff = rngFor(layer, v, mod(nt.k2, 12), 7);
  const f = hz(nt.m);
  const s0 = nt.k * CHS + Math.round(o.onset(v, r()) * R); // humanised onset
  const D = nt.k2 * CHS + Math.round(rOff() * o.offJitter * R) - s0; // release starts (note-local)
  const A = Math.round(o.att * (0.85 + 0.3 * r()) * R);
  const T = o.tau * R;
  const len = Math.round(D + 7 * T);
  if (s0 + len < -OFF || s0 >= W - OFF) return;
  const amp = o.amp * Math.pow(10, (r() * 3 - 1.5) / 20); // velocity +-1.5 dB
  const wobRate = o.wobLo + (o.wobHi - o.wobLo) * r();
  const wobPh = TAU * r();
  const oscs = o.oscs.map(([cents, gl, gr]) => ({
    cents: cents + (r() - 0.5) * o.detJitter,
    gl: gl * (1 - o.pan[v]),
    gr: gr * (1 + o.pan[v]),
    dRate: 0.035 + 0.07 * r(),
    dPh: TAU * r(),
    ph: r(),
  }));
  const env = (n) => {
    let e = n < A ? Math.sin((HALF_PI * Math.max(0, n)) / A) ** 2 : 1;
    if (n > D) {
      const x = (n - D) / T;
      e *= Math.exp(-x);
      if (x > 5) e *= Math.cos(HALF_PI * Math.min(1, (x - 5) / 2)) ** 2;
    }
    return e;
  };
  const tab = o.tab;
  const no = oscs.length;
  const inc = new Float64Array(no), ph = new Float64Array(no), gl = new Float64Array(no), gr = new Float64Array(no);
  for (let q = 0; q < no; q++) (ph[q] = oscs[q].ph), (gl[q] = oscs[q].gl), (gr[q] = oscs[q].gr);
  let yl = 0, yr = 0;
  for (let b = 0; b < len; b += BLOCK) {
    const e = Math.min(len, b + BLOCK);
    const t = b / R;
    const w = 1 + o.wob * Math.sin(TAU * wobRate * t + wobPh);
    const eA = env(b), eB = env(e);
    const gA = amp * eA * w, gB = amp * eB * w;
    for (let q = 0; q < no; q++) {
      const c = oscs[q].cents + o.drift * Math.sin(TAU * oscs[q].dRate * t + oscs[q].dPh);
      inc[q] = (f * (1 + c * CENT)) / R;
    }
    // per-note low-pass that blooms with the envelope (an analog pad's filter envelope); 1 = open
    const fc = o.lpLo ? o.lpLo + (o.lpHi - o.lpLo) * Math.pow(eA, 1.5) : 0;
    const cf = fc ? 1 - Math.exp((-TAU * fc) / R) : 1;
    const step = (gB - gA) / (e - b);
    let g = gA;
    const j0 = s0 + OFF;
    for (let n = b; n < e; n++, g += step) {
      let sl = 0, sr = 0;
      for (let q = 0; q < no; q++) {
        const x = ph[q] * TS;
        const i = x | 0;
        const s = tab[i] + (x - i) * (tab[i + 1] - tab[i]);
        sl += s * gl[q];
        sr += s * gr[q];
        ph[q] += inc[q];
        if (ph[q] >= 1) ph[q] -= 1;
      }
      yl += cf * (sl - yl);
      yr += cf * (sr - yr);
      const j = j0 + n;
      if (j >= 0 && j < W) {
        outL[j] += g * yl;
        outR[j] += g * yr;
      }
    }
  }
}

// ---- the pad: 5 voices, 3 detuned oscillators each (left, centre, right) ----
const PAD = {
  tab: PAD_TAB,
  oscs: [[-7, 0.9, 0.28], [0, 0.6, 0.6], [7, 0.28, 0.9]],
  detJitter: 3, // cents
  drift: 2.5, // cents, slow
  pan: [0, -0.18, 0.15, -0.25, 0.25],
  onset: (v, u) => 0.006 + 0.012 * v + 0.022 * u, // a soft upward roll, a few to tens of ms
  offJitter: 0.1,
  att: 2.6,
  tau: 0.6, // the leaving voice falls fast, so a step never smears into a clash
  amp: 0.1,
  wob: 0.07,
  wobLo: 0.04,
  wobHi: 0.11,
  lpLo: 650,
  lpHi: 3200,
};
const VOICE_W = [1, 0.95, 0.9, 0.8, 0.6]; // the top voice softest: no line to follow
for (let v = 0; v < 5; v++) {
  for (const nt of runs((k) => CHORDS[mod(k, 4)][1 + v])) note(nt, 1, v, {...PAD, amp: PAD.amp * VOICE_W[v]}, padL, padR);
}

// ---- the bass: a soft sine on the roots, mono ----
const BASS = {
  tab: BASS_TAB,
  oscs: [[0, 1, 1]],
  detJitter: 0,
  drift: 1.2,
  pan: [0],
  onset: (v, u) => 0.004 * u,
  offJitter: 0.06,
  att: 1.8,
  tau: 0.7,
  amp: 0.1,
  wob: 0.03,
  wobLo: 0.05,
  wobHi: 0.09,
  lpLo: 0,
  lpHi: 0,
};
// mono: both sides land in the one buffer (twice the level; the level is set below against the pad)
for (const nt of runs((k) => CHORDS[mod(k, 4)][0])) note(nt, 2, 0, BASS, bass, bass);

// ---- the shimmer: the top voices an octave up, near-sine, slow tremolo, wide ----
const SHIM = {
  tab: SHIM_TAB,
  oscs: [[-4, 0.95, 0.12], [4, 0.12, 0.95]],
  detJitter: 2,
  drift: 3,
  pan: [0, 0, 0, -0.15, 0.15],
  onset: (v, u) => 0.15 + 0.25 * u,
  offJitter: 0.2,
  att: 4,
  tau: 1.4,
  amp: 0.1,
  wob: 0.3, // tremolo
  wobLo: 0.12,
  wobHi: 0.22,
  lpLo: 0,
  lpHi: 0,
};
for (const v of [3, 4]) {
  const pitchAt = (k) => (SHIMMER[mod(Math.floor(k / PHR), 3)].includes(v) ? CHORDS[mod(k, 4)][1 + v] + 12 : null);
  for (const nt of runs(pitchAt)) note(nt, 3, v, SHIM, shL, shR);
}

// ---- filters ----
// TPT state-variable low-pass (stable under modulation); cutoff per block from fcAt(absolute sample)
function svfLP(x, fcAt, Q) {
  const k = 1 / Q;
  let ic1 = 0, ic2 = 0;
  for (let b = 0; b < W; b += BLOCK) {
    const g = Math.tan((Math.PI * fcAt(b - OFF)) / R);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const e = Math.min(W, b + BLOCK);
    for (let i = b; i < e; i++) {
      const v3 = x[i] - ic2;
      const v1 = a1 * ic1 + a2 * v3;
      const v2 = ic2 + a2 * ic1 + a3 * v3;
      ic1 = 2 * v1 - ic1;
      ic2 = 2 * v2 - ic2;
      x[i] = v2;
    }
  }
}
// RBJ biquad, in place
function biquad(x, type, fc, Q) {
  const w = (TAU * fc) / R, c = Math.cos(w), al = Math.sin(w) / (2 * Q);
  let b0, b1, b2;
  if (type === 'lp') (b0 = (1 - c) / 2), (b1 = 1 - c), (b2 = (1 - c) / 2);
  else (b0 = (1 + c) / 2), (b1 = -(1 + c)), (b2 = (1 + c) / 2);
  const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
  const B0 = b0 / a0, B1 = b1 / a0, B2 = b2 / a0, A1 = a1 / a0, A2 = a2 / a0;
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const x0 = x[i];
    const y0 = B0 * x0 + B1 * x1 + B2 * x2 - A1 * y1 - A2 * y2;
    x2 = x1, x1 = x0, y2 = y1, y1 = y0;
    x[i] = y0;
  }
}
function onePole(x, type, fc) {
  const a = 1 - Math.exp((-TAU * fc) / R);
  let y = 0;
  for (let i = 0; i < x.length; i++) {
    y += a * (x[i] - y);
    x[i] = type === 'lp' ? y : x[i] - y;
  }
}

// the pad's slow filter LFOs: 5 and 2 cycles per loop (periodic in the loop), about 1200 to 4000 Hz
const padCut = (a) => 2200 * Math.pow(2, 0.55 * Math.sin((TAU * 5 * a) / N + 0.4) + 0.3 * Math.sin((TAU * 2 * a) / N + 2.1));
svfLP(padL, padCut, 0.7);
svfLP(padR, padCut, 0.7);
for (const x of [shL, shR]) biquad(x, 'lp', 5500, 0.707);

// ---- air: a whisper of band-limited noise, periodic (hashed from the sample's place in the loop) ----
const noise = (a, ch) => {
  let h = Math.imul(mod(a, N) ^ (ch ? 0x68e31da4 : 0x27d4eb2d), 0x165667b1);
  h ^= h >>> 15;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return (h >>> 0) / 2147483648 - 1;
};
const airL = buf(), airR = buf();
for (let j = 0; j < W; j++) {
  const a = j - OFF;
  const lfo = 0.55 + 0.45 * Math.sin((TAU * 3 * a) / N + 0.3);
  airL[j] = noise(a, 0) * lfo;
  airR[j] = noise(a, 1) * lfo;
}
for (const x of [airL, airR]) onePole(x, 'hp', 350), svfLP(x, () => 1500, 0.6);

// ---- levels: every layer set against the pad (RMS over the loop), so the balance is exact ----
const rms = (...xs) => {
  let s = 0;
  for (const x of xs) for (let j = OFF; j < OFF + N; j++) s += x[j] * x[j];
  return Math.sqrt(s / (N * xs.length));
};
const padRms = rms(padL, padR);
const scaleTo = (xs, db) => {
  const g = (padRms * Math.pow(10, db / 20)) / (rms(...xs) || 1);
  for (const x of xs) for (let j = 0; j < W; j++) x[j] *= g;
};
scaleTo([bass], -8); // soft roots, no boom
scaleTo([shL, shR], -14); // faint
scaleTo([airL, airR], -34); // a whisper

// ---- reverb: Freeverb (8 damped combs + 4 allpasses per side), pre-delay, send high-passed and darkened ----
function freeverb(inL, inR, {room, damp, width, pre}) {
  const sc = R / 44100;
  const combT = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((x) => Math.round(x * sc));
  const apT = [556, 441, 341, 225].map((x) => Math.round(x * sc));
  const spread = Math.round(23 * sc);
  const fb = room * 0.28 + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  const mk = (n) => ({b: new Float64Array(n), i: 0, s: 0});
  const cL = combT.map(mk), cR = combT.map((n) => mk(n + spread));
  const aL = apT.map(mk), aR = apT.map((n) => mk(n + spread));
  const P = Math.round(pre * R);
  const pd = new Float64Array(P + 1);
  let pi = 0;
  const oL = buf(), oR = buf();
  const w1 = width / 2 + 0.5, w2 = (1 - width) / 2;
  for (let j = 0; j < W; j++) {
    pd[pi] = (inL[j] + inR[j]) * 0.015;
    pi = pi === P ? 0 : pi + 1;
    const inp = pd[pi];
    let l = 0, r = 0;
    for (let q = 0; q < 8; q++) {
      let c = cL[q], y = c.b[c.i];
      c.s = y * d2 + c.s * d1;
      c.b[c.i] = inp + c.s * fb;
      if (++c.i === c.b.length) c.i = 0;
      l += y;
      c = cR[q];
      y = c.b[c.i];
      c.s = y * d2 + c.s * d1;
      c.b[c.i] = inp + c.s * fb;
      if (++c.i === c.b.length) c.i = 0;
      r += y;
    }
    for (let q = 0; q < 4; q++) {
      let a = aL[q], bo = a.b[a.i];
      a.b[a.i] = l + bo * 0.5;
      l = bo - l;
      if (++a.i === a.b.length) a.i = 0;
      a = aR[q];
      bo = a.b[a.i];
      a.b[a.i] = r + bo * 0.5;
      r = bo - r;
      if (++a.i === a.b.length) a.i = 0;
    }
    oL[j] = l * w1 + r * w2;
    oR[j] = r * w1 + l * w2;
  }
  return [oL, oR];
}
const sendL = buf(), sendR = buf();
for (let j = 0; j < W; j++) {
  sendL[j] = padL[j] * 0.7 + shL[j] * 1.2 + airL[j];
  sendR[j] = padR[j] * 0.7 + shR[j] * 1.2 + airR[j];
}
for (const x of [sendL, sendR]) onePole(x, 'hp', 170), onePole(x, 'lp', 5000);
const [wetL, wetR] = freeverb(sendL, sendR, {room: 0.86, damp: 0.5, width: 1, pre: 0.022});
scaleTo([wetL, wetR], -4); // a wide room around the pad, a little under it

// ---- mix, gentle saturation, master filters, the slow swell ----
const L = buf(), Rt = buf();
for (let j = 0; j < W; j++) {
  L[j] = padL[j] + bass[j] + shL[j] * 0.8 + airL[j] * 0.35 + wetL[j];
  Rt[j] = padR[j] + bass[j] + shR[j] * 0.8 + airR[j] * 0.35 + wetR[j];
}
{
  const g = 0.16 / rms(L, Rt); // the saturation sees the same level every run
  const d = 1.1, b = 0.06, tb = Math.tanh(d * b), norm = d * (1 - tb * tb);
  for (const x of [L, Rt]) for (let j = 0; j < W; j++) x[j] = (Math.tanh(d * (x[j] * g + b)) - tb) / norm;
}
for (const x of [L, Rt]) {
  biquad(x, 'hp', 45, 0.5412); // 4th-order Butterworth high-pass at 45 Hz: no sub boom
  biquad(x, 'hp', 45, 1.3066);
  biquad(x, 'lp', 7500, 0.707); // soft top
}
for (let j = 0; j < W; j++) {
  const a = j - OFF;
  const s = 1 + 0.1 * Math.sin((TAU * 2 * a) / N + 0.7) + 0.05 * Math.sin((TAU * 7 * a) / N + 1.9);
  L[j] *= s;
  Rt[j] *= s;
}

// ---- the loop: the 3 s past the end crossfaded onto the head, constant power for the measured correlation ----
const yL = L.slice(OFF, OFF + N), yR = Rt.slice(OFF, OFF + N);
let sxy = 0, sxx = 0, syy = 0, dmax = 0;
for (let i = 0; i < XN; i++) {
  for (const x of [L, Rt]) {
    const h = x[OFF + i], t = x[OFF + N + i];
    sxy += h * t;
    sxx += h * h;
    syy += t * t;
    dmax = Math.max(dmax, Math.abs(h - t));
  }
}
const corr = Math.max(0, Math.min(1, sxy / Math.sqrt(sxx * syy)));
for (let i = 0; i < XN; i++) {
  const s = (i + 0.5) / XN;
  const fi = Math.sin(HALF_PI * s), fo = Math.cos(HALF_PI * s);
  const k = 1 / Math.sqrt(1 + 2 * corr * fi * fo); // equal power for uncorrelated, equal gain for identical
  yL[i] = k * (fi * L[OFF + i] + fo * L[OFF + N + i]);
  yR[i] = k * (fi * Rt[OFF + i] + fo * Rt[OFF + N + i]);
}

// ---- loudness (ITU-R BS.1770-4, gated) and true peak (4x sinc interpolation around the peaks) ----
function lufs(xl, xr) {
  const kw = (x) => {
    const y = new Float64Array(x.length);
    const st = [
      [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
      [1, -2, 1, -1.99004745483398, 0.99007225036621],
    ];
    for (let i = 0; i < x.length; i++) y[i] = x[i];
    for (const [b0, b1, b2, a1, a2] of st) {
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      // prime with the loop's last second (it is a loop)
      for (let i = x.length - R; i < x.length; i++) {
        const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1, x1 = y[i], y2 = y1, y1 = v;
      }
      for (let i = 0; i < x.length; i++) {
        const v = b0 * y[i] + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1, x1 = y[i], y2 = y1, y1 = v;
        y[i] = v;
      }
    }
    return y;
  };
  const a = kw(xl), b = kw(xr);
  const blk = 0.4 * R, hop = 0.1 * R;
  const z = [];
  for (let s = 0; s + blk <= a.length; s += hop) {
    let p = 0;
    for (let i = s; i < s + blk; i++) p += a[i] * a[i] + b[i] * b[i];
    z.push(p / blk);
  }
  const L_ = (p) => -0.691 + 10 * Math.log10(p);
  const abs = z.filter((p) => L_(p) > -70);
  const rel = L_(abs.reduce((s, p) => s + p, 0) / abs.length) - 10;
  const g = abs.filter((p) => L_(p) > rel);
  return L_(g.reduce((s, p) => s + p, 0) / g.length);
}
function truePeak(xs) {
  const H = 24;
  const kern = (d) => (d === 0 ? 1 : (Math.sin(Math.PI * d) / (Math.PI * d)) * (0.5 + 0.5 * Math.cos((Math.PI * d) / (H + 1))));
  let peak = 0;
  for (const x of xs) for (let i = 0; i < x.length; i++) peak = Math.max(peak, Math.abs(x[i]));
  let tp = peak;
  for (const x of xs) {
    const n = x.length;
    for (let i = 0; i < n; i++) {
      if (Math.abs(x[i]) < 0.5 * peak) continue;
      for (const fr of [0.25, 0.5, 0.75]) {
        let s = 0;
        for (let q = -H + 1; q <= H; q++) s += x[mod(i + q, n)] * kern(q - fr);
        tp = Math.max(tp, Math.abs(s));
      }
    }
  }
  return 20 * Math.log10(tp);
}
const db = (v) => 20 * Math.log10(v);
const before = lufs(yL, yR);
const gain = Math.pow(10, (TARGET_LUFS - before) / 20);
for (let i = 0; i < N; i++) (yL[i] *= gain), (yR[i] *= gain);
const loud = lufs(yL, yR);
const tp = truePeak([yL, yR]);
if (tp > -3.5) throw new Error(`true peak ${tp.toFixed(2)} dBTP: over the -3.5 dBTP limit before encoding`);

// ---- the seam, measured on what is written ----
let jump = 0, maxStep = 0;
for (const x of [yL, yR]) {
  jump = Math.max(jump, Math.abs(x[0] - x[N - 1]));
  for (let i = 1; i < N; i++) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]));
}
const rmsDb = (s, e) => {
  let p = 0;
  for (const x of [yL, yR]) for (let i = s; i < e; i++) p += x[i] * x[i];
  return 10 * Math.log10(p / (2 * (e - s)));
};

// ---- 24-bit WAV, AAC with macOS afconvert ----
const dir = path.join(root, 'public', 'music');
fs.mkdirSync(dir, {recursive: true});
const wav = path.join(dir, `${NAME}.tmp.wav`);
const out = path.join(dir, `${NAME}.m4a`);
const bytes = N * 6;
const wb = Buffer.alloc(44 + bytes);
wb.write('RIFF', 0);
wb.writeUInt32LE(36 + bytes, 4);
wb.write('WAVEfmt ', 8);
wb.writeUInt32LE(16, 16);
wb.writeUInt16LE(1, 20);
wb.writeUInt16LE(2, 22);
wb.writeUInt32LE(R, 24);
wb.writeUInt32LE(R * 6, 28);
wb.writeUInt16LE(6, 32);
wb.writeUInt16LE(24, 34);
wb.write('data', 36);
wb.writeUInt32LE(bytes, 40);
for (let i = 0, o = 44; i < N; i++, o += 6) {
  wb.writeIntLE(Math.round(Math.max(-1, Math.min(1, yL[i])) * 8388607), o, 3);
  wb.writeIntLE(Math.round(Math.max(-1, Math.min(1, yR[i])) * 8388607), o + 3, 3);
}
fs.writeFileSync(wav, wb);
try {
  fs.rmSync(out, {force: true});
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-q', '127', wav, out]);
} finally {
  fs.rmSync(wav, {force: true});
}
const mb = fs.statSync(out).size / 1048576;
console.log(`music: public/music/${NAME}.m4a  ${LOOP.toFixed(2)} s loop, 48 kHz stereo, ${mb.toFixed(2)} MB, ${((Date.now() - t0) / 1000).toFixed(1)} s`);
console.log(`  loudness ${loud.toFixed(2)} LUFS (was ${before.toFixed(2)}), true peak ${tp.toFixed(2)} dBTP (before AAC)`);
console.log(`  seam: head vs the rendered tail corr ${corr.toFixed(6)}, max diff ${db(dmax * gain).toFixed(1)} dBFS; ` +
  `wrap jump ${db(jump).toFixed(1)} dBFS (largest step anywhere ${db(maxStep).toFixed(1)} dBFS); ` +
  `RMS first 0.5 s ${rmsDb(0, R / 2).toFixed(1)} dBFS, last 0.5 s ${rmsDb(N - R / 2, N).toFixed(1)} dBFS, first 0.3 s ${rmsDb(0, 0.3 * R).toFixed(1)} dBFS`);
