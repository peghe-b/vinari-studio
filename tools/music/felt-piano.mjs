// Felt piano: a muffled upright with felt hammers playing slow broken chords in D major at 70 bpm
// (Dmaj9 - Bm7(11) - Gmaj9 - A6sus4 > A6, with F#m7, Em9 and D/F# variants), the sustain pedal changed
// on every chord, a whisper-quiet warm pad underneath and a small stereo room (Freeverb). A calm, intimate
// product-explainer underscore that sits under a voice: body in 150-800 Hz, little in 1-4 kHz, no drums.
//   node tools/music/felt-piano.mjs   -> public/music/felt-piano.m4a (96 s = 28 bars, 48 kHz stereo,
//                                        seamless loop, -20 LUFS, true peak <= -3 dBTP, AAC 160 kb/s)
// Encoded with the bundled ffmpeg's libfdk_aac: its MP4 edit list trims the encoder delay AND the padding,
// so ffmpeg (Remotion) and Apple both decode exactly 4,608,000 samples. afconvert (the fallback) declares
// a 960-sample remainder that ffmpeg does not trim: 20 ms of silence at every loop there.
// Royalty-free by construction: every sample is synthesised here (additive piano partials, sines and
// seeded noise). No samples, no downloads. Deterministic: seeded PRNGs, never Math.random or the clock.
//
// The loop: the 28 bars are rendered with 4 s of tail (pedal release, room) and the tail is overlap-added
// onto the head, so the file is one period of the piece played forever: the last sample runs into sample 0
// with no click and no gap, and the first chord still lands at full strength on sample 0 (a crossfade would
// fade that first downbeat in). Every filter runs before the fold, only gains run after it.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {ffmpeg, ffOptions} from '../platform.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const OUT = path.join(root, 'public', 'music', 'felt-piano.m4a');

const R = 48000;
const BPM = 70;
const BEAT = 60 / BPM;
const BAR = 4 * BEAT;
const BARS = 28; // 28 bars of 4/4 at 70 bpm = exactly 96 s
const LOOP_N = Math.round(BARS * BAR * R);
const TAIL_N = 4 * R;
const TOT_N = LOOP_N + TAIL_N;
const TARGET_LUFS = -20;
const TP_CEIL = -4; // dBTP before the AAC encode (the encode adds a few tenths)

// mulberry32, one stream per job (score humanising, partial phases, hammer noise)
const prng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const rScore = prng(70);
const rPhase = prng(2026);
const rNoise = prng(1002);
const gauss = (r) => Math.sqrt(-2 * Math.log(1 - r())) * Math.cos(2 * Math.PI * r());
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);
const db = (v) => 20 * Math.log10(Math.max(v, 1e-12));
const panGains = (p) => [Math.cos(((p + 1) * Math.PI) / 4), Math.sin(((p + 1) * Math.PI) / 4)];

// ---------------------------------------------------------------- the score
// bass | left-hand fifth/tenth | right-hand voicing (voice-led, mostly common tones) | pad | high chord tones
const CH = {
  D: {bass: 38, lh: [45, 52], rh: [57, 61, 64, 66], pad: [50, 57, 61], top: [69, 73, 76]}, // Dmaj9  D2 | A2 E3 | A3 C#4 E4 F#4
  Bm: {bass: 35, lh: [42, 50], rh: [57, 62, 64, 66], pad: [47, 54, 57], top: [69, 74, 71]}, // Bm7(11) B1 | F#2 D3 | A3 D4 E4 F#4
  G: {bass: 43, lh: [50, 55], rh: [59, 62, 66, 69], pad: [50, 55, 59], top: [74, 71, 78]}, // Gmaj9  G2 | D3 G3 | B3 D4 F#4 A4
  Asus: {bass: 45, lh: [52, 57], rh: [62, 64, 66, 69], pad: [52, 57, 64], top: [74, 76]}, // A6sus4 A2 | E3 A3 | D4 E4 F#4 A4
  A6: {bass: 45, lh: [52, 57], rh: [61, 64, 66, 69], pad: [52, 57, 64], top: [73, 76]}, //    A6  the 4th falls to C#4
  Fsm: {bass: 42, lh: [49, 52], rh: [57, 61, 64, 69], pad: [49, 54, 57], top: [69, 73, 76]}, // F#m7  F#2 | C#3 E3 | A3 C#4 E4 A4
  Em: {bass: 40, lh: [47, 52], rh: [55, 59, 62, 66], pad: [47, 52, 55], top: [71, 74, 78]}, // Em9   E2 | B2 E3 | G3 B3 D4 F#4
  Dfs: {bass: 42, lh: [50, 57], rh: [61, 64, 66, 69], pad: [50, 54, 57], top: [73, 69]}, // D/F#  F#2 | D3 A3 | C#4 E4 F#4 A4
};
// four-bar phrases; the last bar is the cadence: sus4 for two beats, then the pedal changes and it resolves
const PHRASE = {
  A: [['D'], ['Bm'], ['G'], ['Asus', 'A6']],
  B: [['D'], ['Fsm'], ['G'], ['Asus', 'A6']],
  C: [['Bm'], ['G'], ['D'], ['Asus', 'A6']], // enters as a deceptive cadence (A6 > Bm)
  D: [['Em'], ['Dfs'], ['G'], ['Asus', 'A6']], // the bass climbs E F# G A into the cadence
};
// [phrase, arpeggio, dynamics, sparse high chord tones (never a tune)]; 7 x 4 bars, ends on A6 > loops to D
const FORM = [
  ['A', 'flow', 0.92, false],
  ['B', 'wave', 0.96, true],
  ['C', 'flow', 1.0, false],
  ['A', 'sparse', 0.9, true],
  ['D', 'wave', 1.0, false],
  ['C', 'flow', 0.97, true],
  ['B', 'sparse', 0.93, false],
];
// [eighth-note slot, voice, velocity factor]; b = bass, l0/l1 = left hand, r0..r3 = right hand
const PAT = {
  flow: [[0, 'b', 1], [1, 'l0', 0.8], [2, 'l1', 0.78], [3, 'r1', 0.85], [4, 'r2', 0.9], [5, 'r3', 0.82], [6, 'r1', 0.74]],
  wave: [[0, 'b', 1], [1, 'l1', 0.76], [2, 'r0', 0.8], [3, 'r2', 0.86], [4, 'l0', 0.7], [5, 'r3', 0.84], [6, 'r1', 0.76]],
  sparse: [[0, 'b', 1], [0, 'r1', 0.6], [2, 'l1', 0.74], [3, 'r2', 0.8], [5, 'r3', 0.76], [6, 'r0', 0.66]],
};
const SUS = {
  flow: [[0, 'b', 1], [1, 'l0', 0.8], [2, 'r0', 0.86], [3, 'r2', 0.8], [4, 'r0', 0.84], [5, 'l1', 0.7], [6, 'r1', 0.76], [7, 'r2', 0.66]],
  wave: [[0, 'b', 1], [1, 'l1', 0.76], [2, 'r2', 0.8], [3, 'r0', 0.86], [4, 'r0', 0.82], [5, 'r1', 0.76], [6, 'r3', 0.72], [7, 'l1', 0.62]],
  sparse: [[0, 'b', 1], [0, 'r2', 0.6], [2, 'r0', 0.82], [4, 'r0', 0.8], [5, 'l1', 0.68], [6, 'r1', 0.7], [7, 'r2', 0.62]],
};
const BAR_SHAPE = [1.0, 0.95, 1.04, 0.93];
const pick = (c, v) => (v === 'b' ? c.bass : v[0] === 'l' ? c.lh[+v[1]] : c.rh[+v[1]]);

const notes = []; // {t, off, m, vel}
const padBars = []; // pad tones per bar
FORM.forEach(([ph, style, dyn, tops], pi) => {
  PHRASE[ph].forEach((segs, b) => {
    const bar = pi * 4 + b;
    const t0 = bar * BAR;
    const t1 = t0 + BAR;
    const split = segs.length === 2;
    const pat = split ? SUS[style] : PAT[style];
    padBars.push(CH[segs[0]].pad);
    let lastSlot = -1;
    for (const [slot, v, k] of pat) {
      const second = slot >= 4 && split;
      const c = CH[segs[second ? 1 : 0]];
      const m = pick(c, v);
      // a few ms of human timing, a hair behind the beat off the downbeat, rolled when two notes share a slot
      let t = t0 + (slot * BEAT) / 2 + (slot > 0 ? 0.006 : 0.0015) + clamp(gauss(rScore) * 0.0035, -0.009, 0.009);
      if (slot === lastSlot) t += 0.016 + 0.01 * rScore();
      lastSlot = slot;
      t = Math.max(0.0015, t);
      const off = v === 'b' ? t1 + 0.03 : (split && !second ? t0 + 2 * BEAT : t1) + 0.03 + 0.012 * rScore();
      const vel = clamp(0.46 * dyn * BAR_SHAPE[b] * k * (slot % 2 ? 0.95 : 1) * (1 + 0.06 * gauss(rScore)), 0.12, 0.85);
      notes.push({t, off, m, vel});
    }
    if (tops && (b === 0 || b === 2)) {
      const c = CH[segs[0]];
      const m = c.top[(pi + b) % c.top.length];
      const t = t0 + 2 * BEAT + 0.024 + clamp(gauss(rScore) * 0.004, -0.009, 0.009);
      notes.push({t, off: t1 + 0.03, m, vel: clamp(0.46 * dyn * 0.56 * (1 + 0.05 * gauss(rScore)), 0.12, 0.6)});
    }
  });
});

// ---------------------------------------------------------------- the felt piano
const pianoL = new Float32Array(TOT_N);
const pianoR = new Float32Array(TOT_N);
const nb = new Float64Array(9 * R); // one note, mono

function addPartial(f, a, ph, tau, rel, tauD, len) {
  const w = (2 * Math.PI * f) / R;
  const r1 = Math.exp(-1 / (tau * R));
  const r2 = r1 * Math.exp(-1 / (tauD * R));
  let c = Math.cos(w) * r1;
  let s = Math.sin(w) * r1;
  let re = a * Math.cos(ph);
  let im = a * Math.sin(ph);
  const n1 = Math.min(rel, len);
  for (let i = 0; i < n1; i++) {
    nb[i] += im;
    const t = re * c - im * s;
    im = re * s + im * c;
    re = t;
  }
  c = Math.cos(w) * r2;
  s = Math.sin(w) * r2;
  for (let i = n1; i < len; i++) {
    nb[i] += im;
    const t = re * c - im * s;
    im = re * s + im * c;
    re = t;
  }
}
const lenFor = (a, tau, rel, tauD) => {
  const nat = tau * Math.log(Math.max(a, 1e-9) / 1e-6) * R;
  if (nat <= rel) return Math.max(0, Math.ceil(nat));
  const left = a * Math.exp(-rel / (tau * R));
  const tc = 1 / (1 / tau + 1 / tauD);
  return rel + Math.ceil(tc * Math.log(Math.max(left, 1e-9) / 1e-6) * R);
};

function piano({t, off, m, vel}) {
  const s0 = Math.round(t * R);
  const f0 = hz(m);
  const B = 0.00007 * Math.pow(2, (m - 45) / 14); // inharmonicity: stiffer, shorter strings to the treble
  const fc = 650 + 2000 * vel * vel + 0.7 * f0; // felt between hammer and string: a soft blow keeps the highs down
  const tau1 = clamp(3.6 * Math.pow(2, -(m - 45) / 20), 0.9, 4.5); // the slow (aftersound) decay of partial 1
  const tauD = m < 50 ? 0.17 : 0.11; // felt dampers once the pedal lifts
  const rel = Math.max(1, Math.round((off - t) * R));
  const amp = Math.pow(vel, 1.6) * (m < 48 ? 0.9 : m > 68 ? 0.62 : 0.85);
  const cents = 0.3 + 0.5 * rScore(); // the unison strings, a little apart: a slow shimmer
  const d = Math.pow(2, cents / 1200);
  let len = 0;
  for (let n = 1; n <= 18; n++) {
    const fn = n * f0 * Math.sqrt(1 + B * n * n);
    if (fn > 6500) break;
    const strike = 0.4 + 0.6 * Math.abs(Math.sin(n * Math.PI * 0.12)); // hammer at ~1/8 of the string
    const felt = 1 / (1 + (fn / fc) ** 2);
    const board = (fn * fn) / (fn * fn + 100 * 100); // a small upright radiates little under ~100 Hz
    const a = (amp * strike * felt * board) / Math.pow(n, 0.85);
    if (a < amp * 0.0015) continue;
    const tau = tau1 / (1 + 0.25 * (n - 1) + 0.015 * (n - 1) ** 2) / (1 + fn / 3000);
    const ph = 2 * Math.PI * rPhase();
    // two strings struck together: the prompt sound dies fast, the aftersound lingers (double decay)
    const lp = Math.min(nb.length, TOT_N - s0, lenFor(a * 0.6, tau / 4.5, rel, tauD));
    const la = Math.min(nb.length, TOT_N - s0, lenFor(a * 0.4, tau, rel, tauD));
    addPartial(fn / d, a * 0.6, ph, tau / 4.5, rel, tauD, lp);
    addPartial(fn * d, a * 0.4, ph, tau, rel, tauD, la);
    len = Math.max(len, lp, la);
  }
  // the felt hammer: no sharp edge (a few ms of rise), plus a soft knock of filtered noise and wood
  const att = 0.004 + 0.005 * (1 - vel);
  for (let i = 0; i < Math.min(len, Math.ceil(att * 10 * R)); i++) nb[i] *= 1 - Math.exp(-i / (att * R));
  const thN = Math.min(Math.round(0.07 * R), TOT_N - s0);
  const aLo = 1 - Math.exp((-2 * Math.PI * 520) / R);
  const aHi = 1 - Math.exp((-2 * Math.PI * 140) / R);
  let l1 = 0, l2 = 0, h = 0;
  const kn = amp * 0.55;
  for (let i = 0; i < thN; i++) {
    const tt = i / R;
    l1 += aLo * (rNoise() * 2 - 1 - l1);
    l2 += aLo * (l1 - l2);
    h += aHi * (l2 - h);
    const env = (1 - Math.exp(-tt / 0.0018)) * Math.exp(-tt / 0.012);
    nb[i] += (l2 - h) * kn * env + amp * 0.035 * Math.sin(2 * Math.PI * 185 * tt) * env * Math.exp(-tt / 0.02);
  }
  len = Math.max(len, thN);
  const [gl, gr] = panGains(clamp((m - 57) / 34, -0.45, 0.45));
  for (let i = 0; i < len; i++) {
    pianoL[s0 + i] += nb[i] * gl;
    pianoR[s0 + i] += nb[i] * gr;
    nb[i] = 0;
  }
}
for (const n of notes) piano(n);

// ---------------------------------------------------------------- the pad (whisper-quiet, warm)
const padL = new Float32Array(TOT_N);
const padR = new Float32Array(TOT_N);
const pb = [new Float64Array(20 * R), new Float64Array(20 * R)];
function pad(t0, t1, m) {
  const s0 = Math.round(t0 * R);
  const hold = Math.round((t1 - t0) * R);
  const aN = Math.round(1.5 * R);
  const rN = Math.round(2.0 * R);
  const len = Math.min(hold + rN, TOT_N - s0, pb[0].length);
  const f = hz(m);
  [[-4, 0], [4, 1]].forEach(([cents, side]) => {
    const buf = pb[side];
    for (let hN = 1; hN <= 4; hN++) {
      const fh = f * hN * Math.pow(2, cents / 1200);
      const a = ([1, 0.3, 0.1, 0.04][hN - 1] / (1 + (fh / 700) ** 2)) * 0.1;
      const w = (2 * Math.PI * fh) / R;
      const c = Math.cos(w), s = Math.sin(w);
      const ph = 2 * Math.PI * rPhase();
      let re = a * Math.cos(ph), im = a * Math.sin(ph);
      for (let i = 0; i < len; i++) {
        buf[i] += im;
        const t = re * c - im * s;
        im = re * s + im * c;
        re = t;
      }
    }
  });
  const [l0, r0] = panGains(-0.55);
  const [l1, r1] = panGains(0.55);
  for (let i = 0; i < len; i++) {
    const env = (i < aN ? 0.5 - 0.5 * Math.cos((Math.PI * i) / aN) : 1) * (i < hold ? 1 : 0.5 + 0.5 * Math.cos((Math.PI * (i - hold)) / rN));
    const a = pb[0][i] * env, b = pb[1][i] * env;
    padL[s0 + i] += a * l0 + b * l1;
    padR[s0 + i] += a * r0 + b * r1;
    pb[0][i] = 0;
    pb[1][i] = 0;
  }
}
// a pad tone that the next bar keeps is tied over instead of struck again
const open = new Map(); // midi -> start bar
for (let bar = 0; bar <= BARS; bar++) {
  const now = bar < BARS ? new Set(padBars[bar]) : new Set();
  for (const [m, start] of [...open]) {
    if (!now.has(m)) {
      pad(start * BAR + 0.02, bar * BAR + 0.05, m);
      open.delete(m);
    }
  }
  for (const m of now) if (!open.has(m)) open.set(m, bar);
}

// ---------------------------------------------------------------- filters and the room
function biquad(type, f, Q, gainDb = 0) {
  const w = (2 * Math.PI * f) / R, cw = Math.cos(w), al = Math.sin(w) / (2 * Q), A = Math.pow(10, gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') [b0, b1, b2, a0, a1, a2] = [(1 - cw) / 2, 1 - cw, (1 - cw) / 2, 1 + al, -2 * cw, 1 - al];
  else if (type === 'hp') [b0, b1, b2, a0, a1, a2] = [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2, 1 + al, -2 * cw, 1 - al];
  else [b0, b1, b2, a0, a1, a2] = [1 + al * A, -2 * cw, 1 - al * A, 1 + al / A, -2 * cw, 1 - al / A]; // peak
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
}
function filt(x, [b0, b1, b2, a1, a2]) {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i];
    const y = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = y;
    x[i] = y;
  }
}
const rms = (...bufs) => {
  let s = 0, n = 0;
  for (const b of bufs) for (let i = 0; i < LOOP_N; i++) { s += b[i] * b[i]; n++; }
  return Math.sqrt(s / n);
};

// Freeverb (Jezar's public-domain design), tunings scaled to 48 kHz; damped highs, a small warm room
function freeverb(inp, room, damp) {
  const sc = R / 44100;
  const fb = room * 0.28 + 0.7, d1 = damp * 0.4, d2 = 1 - d1;
  return [0, 23].map((sp) => {
    const cb = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((n) => new Float64Array(Math.round((n + sp) * sc)));
    const ab = [556, 441, 341, 225].map((n) => new Float64Array(Math.round((n + sp) * sc)));
    const ci = new Int32Array(8), ai = new Int32Array(4), cs = new Float64Array(8);
    const out = new Float32Array(inp.length);
    for (let i = 0; i < inp.length; i++) {
      const x = inp[i];
      let acc = 0;
      for (let k = 0; k < 8; k++) {
        const b = cb[k], j = ci[k], y = b[j];
        cs[k] = y * d2 + cs[k] * d1;
        b[j] = x + cs[k] * fb;
        acc += y;
        ci[k] = j + 1 === b.length ? 0 : j + 1;
      }
      for (let k = 0; k < 4; k++) {
        const b = ab[k], j = ai[k], bo = b[j];
        b[j] = acc + bo * 0.5;
        acc = bo - acc;
        ai[k] = j + 1 === b.length ? 0 : j + 1;
      }
      out[i] = acc;
    }
    return out;
  });
}

const pianoRms = rms(pianoL, pianoR);
const padGain = (pianoRms * Math.pow(10, -17 / 20)) / (rms(padL, padR) || 1); // the pad 17 dB under the piano
const send = new Float32Array(TOT_N);
const PRE = Math.round(0.02 * R);
for (let i = 0; i + PRE < TOT_N; i++) send[i + PRE] = (pianoL[i] + pianoR[i] + (padL[i] + padR[i]) * padGain) * 0.5;
filt(send, biquad('hp', 170, 0.707)); // no mud in the room
filt(send, biquad('lp', 4200, 0.707));
const [wetA, wetB] = freeverb(send, 0.8, 0.5);
const wetGain = (pianoRms * Math.pow(10, -8 / 20)) / (rms(wetA, wetB) || 1); // the room 8 dB under the dry piano
const L = new Float32Array(TOT_N);
const Rr = new Float32Array(TOT_N);
for (let i = 0; i < TOT_N; i++) {
  const wa = wetA[i] * wetGain, wb = wetB[i] * wetGain;
  L[i] = pianoL[i] + padL[i] * padGain + 0.88 * wa + 0.12 * wb;
  Rr[i] = pianoR[i] + padR[i] * padGain + 0.88 * wb + 0.12 * wa;
}
// master EQ: 4th-order high-pass at 45 Hz (no sub), a soft pocket for the voice, highs rolled off ~5.5 kHz
for (const ch of [L, Rr]) {
  filt(ch, biquad('hp', 45, 0.5412));
  filt(ch, biquad('hp', 45, 1.3066));
  filt(ch, biquad('peak', 2800, 0.8, -2.5));
  filt(ch, biquad('lp', 5800, 0.707));
}

// ---------------------------------------------------------------- fold the tail onto the head (the loop)
for (let i = 0; i < TAIL_N; i++) {
  const fade = i < TAIL_N - 0.25 * R ? 1 : (TAIL_N - i) / (0.25 * R); // the last 0.25 s of a -80 dB tail
  L[i] += L[LOOP_N + i] * fade;
  Rr[i] += Rr[LOOP_N + i] * fade;
}
const outL = L.subarray(0, LOOP_N);
const outR = Rr.subarray(0, LOOP_N);

// ---------------------------------------------------------------- loudness (BS.1770) and true peak
function lufs(a, b) {
  const k = [[1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585], [1, -2, 1, -1.99004745483398, 0.99007225036621]];
  const sq = new Float64Array(a.length);
  for (const ch of [a, b]) {
    const x = Float32Array.from(ch);
    filt(x, k[0]);
    filt(x, k[1]);
    for (let i = 0; i < x.length; i++) sq[i] += x[i] * x[i];
  }
  const blk = Math.round(0.4 * R), hop = Math.round(0.1 * R), z = [];
  const cum = new Float64Array(sq.length + 1);
  for (let i = 0; i < sq.length; i++) cum[i + 1] = cum[i] + sq[i];
  for (let s = 0; s + blk <= sq.length; s += hop) z.push((cum[s + blk] - cum[s]) / blk);
  const ld = (v) => -0.691 + 10 * Math.log10(v);
  const g1 = z.filter((v) => ld(v) > -70);
  const rel = ld(g1.reduce((p, v) => p + v, 0) / g1.length) - 10;
  const g2 = g1.filter((v) => ld(v) > rel);
  return ld(g2.reduce((p, v) => p + v, 0) / g2.length);
}
function truePeak(a, b) {
  const H = 12, P = 4, ker = [];
  for (let p = 1; p < P; p++) {
    const fr = p / P, k = [];
    for (let j = -H + 1; j <= H; j++) {
      const x = j - fr;
      const w = 0.42 + 0.5 * Math.cos((Math.PI * x) / H) + 0.08 * Math.cos((2 * Math.PI * x) / H); // Blackman
      k.push(x === 0 ? 1 : (Math.sin(Math.PI * x) / (Math.PI * x)) * w);
    }
    ker.push(k);
  }
  let pk = 0;
  for (const x of [a, b]) {
    const n = x.length;
    for (let i = 0; i < n; i++) {
      const v = Math.abs(x[i]);
      if (v > pk) pk = v;
      if (v < pk * 0.6) continue; // an inter-sample peak needs a big neighbour
      for (const k of ker) {
        let acc = 0;
        for (let j = 0; j < k.length; j++) acc += k[j] * x[(i - H + 1 + j + n) % n]; // circular: it is a loop
        if (Math.abs(acc) > pk) pk = Math.abs(acc);
      }
    }
  }
  return db(pk);
}

const before = lufs(outL, outR);
let g = Math.pow(10, (TARGET_LUFS - before) / 20);
for (let i = 0; i < LOOP_N; i++) { outL[i] *= g; outR[i] *= g; }
let tp = truePeak(outL, outR);
if (tp > TP_CEIL) {
  // a memoryless soft knee (seamless on a loop) for the rare loud peak, then back to the target loudness
  for (let round = 0; round < 4 && tp > TP_CEIL; round++) {
    const T = Math.pow(10, (TP_CEIL - 3) / 20), C = Math.pow(10, (TP_CEIL - 0.4 - round * 0.3) / 20);
    const knee = (v) => { const a = Math.abs(v); return a <= T ? v : Math.sign(v) * (T + (C - T) * Math.tanh((a - T) / (C - T))); };
    for (let i = 0; i < LOOP_N; i++) { outL[i] = knee(outL[i]); outR[i] = knee(outR[i]); }
    const fix = Math.pow(10, (TARGET_LUFS - lufs(outL, outR)) / 20);
    for (let i = 0; i < LOOP_N; i++) { outL[i] *= fix; outR[i] *= fix; }
    tp = truePeak(outL, outR);
  }
}
const loud = lufs(outL, outR);

// seam: the jump from the last sample to sample 0 against the biggest jump anywhere inside the file
let jumpIn = 0;
for (const x of [outL, outR]) for (let i = 1; i < LOOP_N; i++) jumpIn = Math.max(jumpIn, Math.abs(x[i] - x[i - 1]));
const seam = Math.max(Math.abs(outL[0] - outL[LOOP_N - 1]), Math.abs(outR[0] - outR[LOOP_N - 1]));
const rmsSpan = (s, e) => { let q = 0; for (let i = s; i < e; i++) q += outL[i] ** 2 + outR[i] ** 2; return db(Math.sqrt(q / (2 * (e - s)))); };
const half = R / 2;

// ---------------------------------------------------------------- 24-bit WAV > AAC (macOS afconvert)
const buf = Buffer.alloc(44 + LOOP_N * 6);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + LOOP_N * 6, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(R, 24);
buf.writeUInt32LE(R * 6, 28);
buf.writeUInt16LE(6, 32);
buf.writeUInt16LE(24, 34);
buf.write('data', 36);
buf.writeUInt32LE(LOOP_N * 6, 40);
for (let i = 0; i < LOOP_N; i++) {
  buf.writeIntLE(Math.round(clamp(outL[i], -1, 1 - 1 / 8388608) * 8388608), 44 + i * 6, 3);
  buf.writeIntLE(Math.round(clamp(outR[i], -1, 1 - 1 / 8388608) * 8388608), 47 + i * 6, 3);
}
fs.mkdirSync(path.dirname(OUT), {recursive: true});
const wav = path.join(os.tmpdir(), `felt-piano-${process.pid}.wav`);
fs.writeFileSync(wav, buf);
let encoder = 'libfdk_aac';
try {
  execFileSync(ffmpeg, ['-v', 'error', '-y', '-i', wav, '-c:a', 'libfdk_aac', '-b:a', '160k', '-f', 'mp4', '-movflags', '+faststart', OUT], ffOptions({stdio: 'inherit'}));
} catch {
  encoder = 'afconvert';
  execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-s', '0', '-q', '127', wav, OUT]);
} finally {
  fs.unlinkSync(wav);
}
console.log(JSON.stringify({
  out: path.relative(root, OUT),
  encoder,
  seconds: LOOP_N / R,
  notes: notes.length,
  lufs: +loud.toFixed(2),
  truePeak: +tp.toFixed(2),
  seamJump: +seam.toFixed(5),
  maxJumpInside: +jumpIn.toFixed(5),
  rmsFirst05: +rmsSpan(0, half).toFixed(2),
  rmsLast05: +rmsSpan(LOOP_N - half, LOOP_N).toFixed(2),
  sizeMB: +(fs.statSync(OUT).size / 1e6).toFixed(2),
}));
