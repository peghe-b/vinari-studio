// Royalty-free by construction: "wood-mallet", a calm music bed synthesised from scratch (no samples, no downloads).
//   node tools/music/wood-mallet.mjs [--wav <copy.wav>]   -> public/music/wood-mallet.m4a
// Soft wooden mallets (a modal marimba bar, modes 1 : 3.93 : 9.24, struck with felt) play a sparse A major
// pentatonic figure with rests over a warm, voice-led pad (Amaj9 / F#m7 / Dmaj9 / E6sus), a felt bass and a
// small damped stereo reverb (Freeverb). 80 bpm, so 32 bars fill the 96 s loop exactly (84 would end mid-bar).
// Seeded PRNG: every run writes the same file. 48 kHz stereo, a seamless loop: everything that rings past the
// end is rendered on and added back onto the head, the filters and the reverb run circularly, so sample 0
// follows the last sample as if the bed had always been playing. -20 LUFS integrated, true peak <= -3 dBTP.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const started = Date.now();
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NAME = 'wood-mallet';
const OUT = path.join(root, 'public', 'music', `${NAME}.m4a`);
const argWav = process.argv.indexOf('--wav');
const WAV_COPY = argWav > 0 ? process.argv[argWav + 1] : null;

const R = 48000;
const LOOP = 96; // seconds
const TAIL = 9; // seconds rendered past the loop: every note has died away by then
const N = LOOP * R;
const M = N + TAIL * R;
const BPM = 80;
const BEAT = 60 / BPM;
const E8 = BEAT / 2;
const SPAN = 8 * BEAT; // one chord: two bars, 6 s
const SPANS = Math.round(LOOP / SPAN); // 16
const TARGET_LUFS = -20;
const TP_CEIL = -3.4; // dBTP before the AAC encode (it adds a few tenths)
const TAU = 2 * Math.PI;

// ---- deterministic randomness (mulberry32), never Math.random or the clock
let seed = 0x7a11e7;
const rand = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), seed | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
const gauss = () => (rand() + rand() + rand() + rand() - 2) * Math.sqrt(3); // ~N(0, 1)
const hz = (m) => 440 * 2 ** ((m - 69) / 12);
const wrap = (t) => ((t % LOOP) + LOOP) % LOOP;
const db = (x) => 20 * Math.log10(Math.max(x, 1e-12));

// ---- harmony: A major pentatonic (A B C# E F#) over four chords, one per two bars.
// pad: five voice-led lines (common tones held, the others move by a step); mal: the mallets' four tones.
const CHORDS = [
  {name: 'Amaj9', bass: 45, pad: [52, 59, 61, 64, 68], mal: [69, 71, 73, 76]}, // A2 | E3 B3 C#4 E4 G#4
  {name: 'F#m7', bass: 42, pad: [52, 57, 61, 64, 69], mal: [69, 73, 76, 78]}, // F#2 | E3 A3 C#4 E4 A4
  {name: 'Dmaj9', bass: 38, pad: [54, 57, 61, 64, 69], mal: [66, 69, 73, 76]}, // D2 | F#3 A3 C#4 E4 A4
  {name: 'E6sus', bass: 40, pad: [52, 59, 61, 64, 69], mal: [71, 73, 76, 78]}, // E2 | E3 B3 C#4 E4 A4
];
const chordAt = (k) => CHORDS[((k % 4) + 4) % 4];

// the figure: [slot (eighths inside the two-bar chord), tone index]. 3+3+2 lilts, and a breathing one.
const FIG = {
  a: [[0, 2], [3, 1], [6, 3], [8, 2], [11, 0], [14, 1]],
  b: [[0, 3], [3, 2], [6, 1], [9, 2], [12, 0]],
  c: [[0, 1], [2, 2], [6, 3], [8, 2], [11, 1]],
  d: [[0, 2], [6, 1], [11, 3]],
};
const PLAN = ['abad', 'cbad', 'acbd', 'bacd']; // one figure per chord, per 24 s cycle

// ---- the score: every onset, humanised (a few ms, velocities), all inside [0, LOOP)
const ev = [];
for (let k = 0; k < SPANS; k++) {
  const c = chordAt(k);
  const cyc = Math.floor(k / 4);
  const t0 = k * SPAN;
  const dyn = [0.92, 1, 0.97, 0.9][cyc];
  const jit = () => Math.max(-0.011, Math.min(0.011, gauss() * 0.0045));
  // felt bass, the root, once per chord
  ev.push({kind: 'bass', t: t0 + Math.abs(gauss()) * 0.003, m: c.bass, v: (0.85 + 0.1 * rand()) * dyn, pan: 0.5});
  // a soft roll into the chord: the pad's middle tones, upward
  for (let i = 0; i < 3; i++) {
    ev.push({kind: 'low', t: t0 + 0.004 + i * 0.07 + Math.abs(gauss()) * 0.006, m: c.pad[i + 1], v: (0.5 - 0.06 * i) * (0.9 + 0.2 * rand()) * dyn, pan: 0.7 - 0.2 * i});
  }
  // one low answer late in the second bar, on most chords
  if (k % 2 === 1 || rand() < 0.3) {
    ev.push({kind: 'low', t: t0 + 12 * E8 + jit(), m: c.pad[1 + (k % 2)], v: 0.34 * (0.9 + 0.2 * rand()) * dyn, pan: 0.44});
  }
  // the mallet figure
  FIG[PLAN[cyc][k % 4]].forEach(([slot, idx], n) => {
    if (k > 0 && n > 0 && rand() < 0.18) return; // a few notes left out (rests); the first chord states the figure whole
    let i = idx;
    if (n > 0 && rand() < 0.1) i = Math.max(0, Math.min(3, idx + (rand() < 0.5 ? -1 : 1)));
    const swing = slot % 2 ? 0.018 : 0;
    const acc = slot % 8 === 0 ? 0.8 : slot % 8 === 3 ? 0.66 : slot % 8 === 6 ? 0.7 : 0.6;
    // the first note lands with the top of the roll (a pianist's rolled chord)
    const t = t0 + slot * E8 + swing + (slot === 0 ? 0.14 + Math.abs(gauss()) * 0.004 : jit());
    const m = c.mal[i];
    const v = acc * (0.92 + 0.16 * rand()) * dyn * (1 - 0.03 * n);
    ev.push({kind: 'mel', t, m, v, pan: 0.5 + (m - 73) / 28});
    if (slot === 0 && rand() < 0.35 && i >= 2) {
      // two mallets: a softer lower tone under the first note
      const j = i - 2;
      ev.push({kind: 'mel', t: t + 0.006, m: c.mal[j], v: v * 0.55, pan: 0.5 + (c.mal[j] - 73) / 28});
    }
  });
}

// ---- buses (events render into [0, M) and are folded back; the pad is periodic by construction)
const melL = new Float32Array(M), melR = new Float32Array(M);
const lowL = new Float32Array(M), lowR = new Float32Array(M);
const bassB = new Float32Array(M);
const send = new Float32Array(M);

const scratch = new Float64Array(TAIL * R);
// a struck wooden bar: damped modes (two-pole resonators), the felt's low-pass on the higher modes,
// a soft contact (a few ms onset), and the resonator tube's slightly longer, beating fundamental
function mallet(e, o, bL, bR) {
  const f = hz(e.m);
  const s0 = Math.round(wrap(e.t) * R);
  const tau = o.tau * (440 / f) ** 0.7;
  const fc = o.felt * (0.6 + 0.8 * e.v);
  const modes = [
    [1, 1, tau],
    [1 + 0.3 / f, 0.3, tau * 1.35], // the resonator tube
    [3.93, 0.5, tau * 0.22],
    [9.24, 0.25, tau * 0.07],
  ];
  const len = Math.min(TAIL * R, Math.ceil(tau * 1.35 * 6.5 * R));
  scratch.fill(0, 0, len);
  for (const [r, a, tm] of modes) {
    const fr = f * r;
    if (fr > 9000) continue;
    const A = a / (1 + (fr / fc) ** 2);
    const w = (TAU * fr) / R;
    const d = Math.exp(-1 / (tm * R));
    const c1 = 2 * d * Math.cos(w);
    const c2 = -d * d;
    let ya = 0;
    let yb = d * Math.sin(w);
    const nmax = Math.min(len, Math.ceil(tm * 7 * R));
    for (let n = 0; n < nmax; n++) {
      scratch[n] += A * ya;
      const yn = c1 * yb + c2 * ya;
      ya = yb;
      yb = yn;
    }
  }
  const g = o.amp * e.v ** 1.4;
  const gl = Math.cos((e.pan * Math.PI) / 2) * g * Math.SQRT2;
  const gr = Math.sin((e.pan * Math.PI) / 2) * g * Math.SQRT2;
  const gs = g * o.send;
  const ka = 1 / (o.contact * R);
  const fadeFrom = Math.floor(len * 0.75);
  for (let n = 0; n < len; n++) {
    let v = scratch[n] * (1 - Math.exp(-n * ka));
    if (n > fadeFrom) v *= 0.5 + 0.5 * Math.cos((Math.PI * (n - fadeFrom)) / (len - fadeFrom));
    const i = s0 + n;
    bL[i] += v * gl;
    bR[i] += v * gr;
    send[i] += v * gs;
  }
}

// a felt-struck low string: sine with a little 2nd and 3rd (so a phone speaker hears the pitch), soft onset
function bass(e) {
  const f = hz(e.m);
  const s0 = Math.round(wrap(e.t) * R);
  const len = Math.round(8.5 * R);
  const g = 0.1 * e.v;
  const fadeFrom = Math.round(6.8 * R);
  for (let n = 0; n < len; n++) {
    const t = n / R;
    const ph = TAU * f * t;
    let v = (1 - Math.exp(-t / 0.014)) * Math.exp(-t / 1.5) *
      (Math.sin(ph) + 0.42 * Math.exp(-t / 0.9) * Math.sin(2 * ph) + 0.18 * Math.exp(-t / 0.45) * Math.sin(3 * ph));
    if (n > fadeFrom) v *= 0.5 + 0.5 * Math.cos((Math.PI * (n - fadeFrom)) / (len - fadeFrom));
    bassB[s0 + n] += v * g;
  }
}

const MEL = {tau: 0.42, felt: 3200, contact: 0.003, amp: 0.2, send: 0.42};
const LOW = {tau: 0.5, felt: 1500, contact: 0.006, amp: 0.2, send: 0.32};
for (const e of ev) {
  if (e.kind === 'mel') mallet(e, MEL, melL, melR);
  else if (e.kind === 'low') mallet(e, LOW, lowL, lowR);
  else bass(e);
}

// fold what rang past the end back onto the head: the loop's start hears the end's tails, as on a repeat
const fold = (b) => {
  for (let i = 0; i < TAIL * R; i++) b[i] += b[N + i];
  return b.subarray(0, N);
};

// ---- the pad: one wavetable oscillator pair per (voice, pitch), each tuned to a whole number of cycles
// per loop (a 0.05-cent nudge) and drifting +-1.2 cents on slow sines that fit the loop a whole number of
// times, so it is exactly periodic; a held tone keeps sounding across a chord change, a moving one
// crossfades (equal power) over 1.8 s into its neighbour.
const TN = 4096;
const TAB = new Float32Array(TN + 1);
for (let h = 1; h <= 12; h++) {
  const a = h ** -1.6 * (h % 2 ? 1 : 0.75);
  for (let i = 0; i < TN; i++) TAB[i] += a * Math.sin((TAU * h * i) / TN);
}
TAB[TN] = TAB[0];
const PRE = 0.3;
const POST = 1.5;
function padEnv(on, t) {
  const k = Math.floor(t / SPAN);
  const u = t - k * SPAN;
  let b;
  let x;
  if (u < POST) [b, x] = [k, u];
  else if (u > SPAN - PRE) [b, x] = [k + 1, u - SPAN];
  else return on[k % SPANS] ? 1 : 0;
  const prev = on[(b - 1 + SPANS) % SPANS];
  const next = on[b % SPANS];
  if (prev === next) return prev ? 1 : 0;
  const p = (x + PRE) / (PRE + POST);
  return next ? Math.sin((p * Math.PI) / 2) : Math.cos((p * Math.PI) / 2);
}
const breathe = (t) => 0.84 + 0.16 * Math.sin((Math.PI * (t % SPAN)) / SPAN) ** 2;
const padL = new Float32Array(N);
const padR = new Float32Array(N);
const VOICE_AMP = [1, 0.8, 0.74, 0.62, 0.5];
const VOICE_PAN = [0.5, 0.7, 0.3, 0.38, 0.62];
const BLOCK = 32;
for (let v = 0; v < 5; v++) {
  const pitches = [...new Set(CHORDS.map((c) => c.pad[v]))];
  for (const p of pitches) {
    const on = Array.from({length: SPANS}, (_, k) => chordAt(k).pad[v] === p);
    const fq = (cents) => Math.round(hz(p) * 2 ** (cents / 1200) * LOOP) / LOOP;
    const ia = (fq(-3) / R) * TN;
    const ib = (fq(3) / R) * TN;
    let pa = rand() * TN;
    let pb = rand() * TN;
    const drift = () => ({k: 5 + Math.floor(rand() * 9), ph: rand() * TAU, d: ((1 + 0.4 * rand()) * Math.LN2) / 1200});
    const va = drift();
    const vb = drift();
    const base = 0.03 * VOICE_AMP[v];
    const cl = Math.cos((VOICE_PAN[v] * Math.PI) / 2) * Math.SQRT2 * base;
    const cr = Math.sin((VOICE_PAN[v] * Math.PI) / 2) * Math.SQRT2 * base;
    let e0 = padEnv(on, 0) * breathe(0);
    for (let i0 = 0; i0 < N; i0 += BLOCK) {
      const e1 = padEnv(on, (i0 + BLOCK) / R) * breathe((i0 + BLOCK) / R);
      const da = ia * (1 + va.d * Math.sin((TAU * va.k * i0) / N + va.ph));
      const dbb = ib * (1 + vb.d * Math.sin((TAU * vb.k * i0) / N + vb.ph));
      if (e0 === 0 && e1 === 0) {
        pa = (pa + da * BLOCK) % TN;
        pb = (pb + dbb * BLOCK) % TN;
        e0 = e1;
        continue;
      }
      for (let j = 0; j < BLOCK; j++) {
        const env = e0 + ((e1 - e0) * j) / BLOCK;
        const ja = pa | 0;
        const jb = pb | 0;
        const sa = TAB[ja] + (TAB[ja + 1] - TAB[ja]) * (pa - ja);
        const sb = TAB[jb] + (TAB[jb + 1] - TAB[jb]) * (pb - jb);
        pa += da;
        if (pa >= TN) pa -= TN;
        pb += dbb;
        if (pb >= TN) pb -= TN;
        padL[i0 + j] += env * cl * (0.74 * sa + 0.26 * sb);
        padR[i0 + j] += env * cr * (0.26 * sa + 0.74 * sb);
      }
      e0 = e1;
    }
  }
}

// ---- filters and the reverb, run circularly: primed with the loop's last seconds, then the whole loop
function circular(xL, xR, step) {
  const o = new Float64Array(2);
  const yL = new Float32Array(N);
  const yR = new Float32Array(N);
  for (let i = N - TAIL * R; i < N; i++) step(xL[i], xR[i], o);
  for (let i = 0; i < N; i++) {
    step(xL[i], xR[i], o);
    yL[i] = o[0];
    yR[i] = o[1];
  }
  return [yL, yR];
}
function biquad(type, f0, Q) {
  const w = (TAU * f0) / R;
  const cw = Math.cos(w);
  const al = Math.sin(w) / (2 * Q);
  const a0 = 1 + al;
  const b = type === 'lp' ? [(1 - cw) / 2, 1 - cw, (1 - cw) / 2] : [(1 + cw) / 2, -(1 + cw), (1 + cw) / 2];
  return {b0: b[0] / a0, b1: b[1] / a0, b2: b[2] / a0, a1: (-2 * cw) / a0, a2: (1 - al) / a0};
}
// a stereo chain of biquads (transposed direct form II, one state per channel)
function filters(...specs) {
  const stages = specs.map(([t, f, q]) => ({...biquad(t, f, q), z: [0, 0, 0, 0]}));
  return (l, r, o) => {
    for (const F of stages) {
      const yl = F.b0 * l + F.z[0];
      F.z[0] = F.b1 * l - F.a1 * yl + F.z[1];
      F.z[1] = F.b2 * l - F.a2 * yl;
      const yr = F.b0 * r + F.z[2];
      F.z[2] = F.b1 * r - F.a1 * yr + F.z[3];
      F.z[3] = F.b2 * r - F.a2 * yr;
      l = yl;
      r = yr;
    }
    o[0] = l;
    o[1] = r;
  };
}
// Freeverb (Jezar's public-domain design): 8 damped combs and 4 allpasses per side, mono in, stereo out
function freeverb({room = 0.8, damp = 0.6, width = 0.85, predelay = 0.02}) {
  const sc = R / 44100;
  const mk = (n) => ({buf: new Float64Array(n), i: 0, store: 0});
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617];
  const aps = [556, 441, 341, 225];
  const sp = Math.round(23 * sc);
  const cL = combs.map((n) => mk(Math.round(n * sc)));
  const cR = combs.map((n) => mk(Math.round(n * sc) + sp));
  const aL = aps.map((n) => mk(Math.round(n * sc)));
  const aR = aps.map((n) => mk(Math.round(n * sc) + sp));
  const fb = room * 0.28 + 0.7;
  const d1 = damp * 0.4;
  const d2 = 1 - d1;
  const pd = new Float64Array(Math.round(predelay * R));
  let pi = 0;
  const comb = (c, x) => {
    const y = c.buf[c.i];
    c.store = y * d2 + c.store * d1;
    c.buf[c.i] = x + c.store * fb;
    if (++c.i >= c.buf.length) c.i = 0;
    return y;
  };
  const ap = (a, x) => {
    const b = a.buf[a.i];
    a.buf[a.i] = x + b * 0.5;
    if (++a.i >= a.buf.length) a.i = 0;
    return b - x;
  };
  const w1 = width / 2 + 0.5;
  const w2 = (1 - width) / 2;
  return (l, r, o) => {
    const x = pd[pi];
    pd[pi] = (l + r) * 0.015;
    if (++pi >= pd.length) pi = 0;
    let yl = 0;
    let yr = 0;
    for (let k = 0; k < 8; k++) {
      yl += comb(cL[k], x);
      yr += comb(cR[k], x);
    }
    for (let k = 0; k < 4; k++) {
      yl = ap(aL[k], yl);
      yr = ap(aR[k], yr);
    }
    o[0] = yl * w1 + yr * w2;
    o[1] = yr * w1 + yl * w2;
  };
}

const MIX = {mel: 1, low: 1, bass: 1, pad: 1, wet: 1.25};
const mL = fold(melL), mR = fold(melR);
const lL = fold(lowL), lR = fold(lowR);
const bB = fold(bassB);
const sB = fold(send);
// the pad: warm low-pass, no mud under the bass
const [pL, pR] = circular(padL, padR, filters(['hp', 110, 0.707], ['lp', 1300, 0.707]));
for (let i = 0; i < N; i++) sB[i] += 0.12 * (pL[i] + pR[i]);
// the room: Freeverb, its low end and highs trimmed (no boom, no fizz)
const [wL0, wR0] = circular(sB, sB, freeverb({room: 0.8, damp: 0.62, width: 1, predelay: 0.022}));
const [wL, wR] = circular(wL0, wR0, filters(['hp', 200, 0.707], ['lp', 4500, 0.707]));

const rms = (a, b) => {
  let s = 0;
  for (let i = 0; i < N; i++) s += a[i] * a[i] + (b ? b[i] * b[i] : a[i] * a[i]);
  return Math.sqrt(s / (2 * N));
};
const busDb = {
  mel: db(rms(mL, mR) * MIX.mel),
  low: db(rms(lL, lR) * MIX.low),
  bass: db(rms(bB) * MIX.bass),
  pad: db(rms(pL, pR) * MIX.pad),
  wet: db(rms(wL, wR) * MIX.wet),
};

const xL = new Float32Array(N);
const xR = new Float32Array(N);
for (let i = 0; i < N; i++) {
  const b = bB[i] * MIX.bass;
  xL[i] = mL[i] * MIX.mel + lL[i] * MIX.low + b + pL[i] * MIX.pad + wL[i] * MIX.wet;
  xR[i] = mR[i] * MIX.mel + lR[i] * MIX.low + b + pR[i] * MIX.pad + wR[i] * MIX.wet;
}
// master: high-pass 45 Hz (4th order Butterworth: no sub booms), soft highs (2nd order low-pass 7 kHz)
const [yL, yR] = circular(xL, xR, filters(['hp', 45, 0.5412], ['hp', 45, 1.3066], ['lp', 7000, 0.707]));

// gentle tape-like saturation on the peaks (memoryless, so the loop stays seamless)
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(yL[i]), Math.abs(yR[i]));
const SAT = 0.75;
for (let i = 0; i < N; i++) {
  yL[i] = Math.tanh((SAT * yL[i]) / peak) / SAT;
  yR[i] = Math.tanh((SAT * yR[i]) / peak) / SAT;
}

// ---- loudness (ITU-R BS.1770-4: K-weighting, 400 ms blocks, absolute and relative gates)
function integratedLufs(a, b) {
  const kw = (x) => {
    const y = new Float64Array(N);
    const st = [
      [1.53512485958697, -2.69169618940638, 1.19839281085285, -1.69065929318241, 0.73248077421585],
      [1, -2, 1, -1.99004745483398, 0.99007225036621],
    ];
    for (let pass = 0; pass < 2; pass++) {
      // primed circularly with the loop's last second
      const [b0, b1, b2, a1, a2] = st[pass];
      const src = pass === 0 ? x : y.slice();
      let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
      for (let k = -R; k < N; k++) {
        const xi = src[(k + N) % N];
        const yi = b0 * xi + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
        x2 = x1;
        x1 = xi;
        y2 = y1;
        y1 = yi;
        if (k >= 0) y[k] = yi;
      }
    }
    return y;
  };
  const ka = kw(a);
  const kb = kw(b);
  const blk = 0.4 * R;
  const hop = 0.1 * R;
  const z = [];
  for (let s = 0; s + blk <= N; s += hop) {
    let sa = 0;
    let sb = 0;
    for (let i = s; i < s + blk; i++) {
      sa += ka[i] * ka[i];
      sb += kb[i] * kb[i];
    }
    z.push((sa + sb) / blk);
  }
  const L = (m) => -0.691 + 10 * Math.log10(m);
  const g1 = z.filter((m) => L(m) > -70);
  const rel = L(g1.reduce((s, m) => s + m, 0) / g1.length) - 10;
  const g2 = g1.filter((m) => L(m) > rel);
  return L(g2.reduce((s, m) => s + m, 0) / g2.length);
}
// true peak: 4x oversampling with a 65-tap windowed sinc (Blackman), the loop treated as circular
function truePeak(a, b) {
  const h = new Float64Array(65);
  for (let k = 0; k < 65; k++) {
    const x = (k - 32) / 4;
    const sinc = x === 0 ? 1 : Math.sin(Math.PI * x) / (Math.PI * x);
    const w = 0.42 - 0.5 * Math.cos((TAU * k) / 64) + 0.08 * Math.cos((2 * TAU * k) / 64);
    h[k] = sinc * w;
  }
  let pk = 0;
  const P = new Float64Array(N + 17); // P[j] = x[j - 8], wrapped
  for (const x of [a, b]) {
    for (let j = 0; j < N + 17; j++) P[j] = x[(j - 8 + N) % N];
    for (let n = 0; n < N; n++) {
      pk = Math.max(pk, Math.abs(x[n]));
      for (let p = 1; p < 4; p++) {
        let y = 0;
        for (let i = 0; i < 16; i++) y += h[p + 4 * i] * P[n + 16 - i];
        if (y > pk) pk = y;
        else if (-y > pk) pk = -y;
      }
    }
  }
  return db(pk);
}

let lufs = integratedLufs(yL, yR);
let gain = 10 ** ((TARGET_LUFS - lufs) / 20);
for (let i = 0; i < N; i++) {
  yL[i] *= gain;
  yR[i] *= gain;
}
let tp = truePeak(yL, yR);
if (tp > TP_CEIL) {
  // never expected at this crest factor; keep the ceiling rather than the loudness
  const g = 10 ** ((TP_CEIL - tp) / 20);
  for (let i = 0; i < N; i++) {
    yL[i] *= g;
    yR[i] *= g;
  }
  console.warn(`wood-mallet: true peak ${tp.toFixed(2)} dBTP over the ceiling, lowered by ${(TP_CEIL - tp).toFixed(2)} dB`);
  tp = TP_CEIL;
}
lufs = integratedLufs(yL, yR);

// ---- the seam: the jump from the last sample to the first, against the largest jump inside the file
let jump = 0;
let maxStep = 0;
for (const x of [yL, yR]) {
  jump = Math.max(jump, Math.abs(x[0] - x[N - 1]));
  for (let i = 1; i < N; i++) maxStep = Math.max(maxStep, Math.abs(x[i] - x[i - 1]));
}
const rmsSpan = (from, to) => {
  let s = 0;
  for (let i = from; i < to; i++) s += yL[i] * yL[i] + yR[i] * yR[i];
  return db(Math.sqrt(s / (2 * (to - from))));
};
const headDb = rmsSpan(0, R / 2);
const tailDb = rmsSpan(N - R / 2, N);

// ---- write a 24-bit WAV, encode AAC 160 kb/s with the studio's ffmpeg (libfdk_aac: its file decodes to exactly
// 96.000 s in ffmpeg, which Remotion renders with; afconvert's leaves 960 samples of padding), afconvert as fallback
const wav = path.join(os.tmpdir(), `${NAME}-${process.pid}.wav`);
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
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, yL[i])) * 8388607), 44 + i * 6, 3);
  buf.writeIntLE(Math.round(Math.max(-1, Math.min(1, yR[i])) * 8388607), 47 + i * 6, 3);
}
fs.writeFileSync(wav, buf);
if (WAV_COPY) fs.copyFileSync(wav, WAV_COPY);
fs.mkdirSync(path.dirname(OUT), {recursive: true});
let encoder = 'libfdk_aac';
try {
  try {
    const {ffmpeg, ffOptions} = await import('../platform.mjs');
    execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', wav, '-c:a', 'libfdk_aac', '-b:a', '160k', '-f', 'mp4', OUT], ffOptions({stdio: 'pipe'}));
  } catch (err) {
    if (process.platform !== 'darwin') throw err;
    encoder = 'afconvert';
    execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', '-q', '127', wav, OUT]);
  }
} finally {
  fs.unlinkSync(wav);
}

const notes = ev.length;
console.log(`music: public/music/${NAME}.m4a (${LOOP} s loop, ${BPM} bpm, ${notes} notes, ${encoder}, ${(fs.statSync(OUT).size / 1e6).toFixed(2)} MB)`);
console.log(`  buses rms dBFS (pre-gain): ${Object.entries(busDb).map(([k, v]) => `${k} ${v.toFixed(1)}`).join(', ')}`);
console.log(`  loudness ${lufs.toFixed(2)} LUFS, true peak ${tp.toFixed(2)} dBTP (before the encode)`);
console.log(`  seam: |x[0] - x[last]| ${jump.toExponential(2)} (largest step inside ${maxStep.toExponential(2)}), rms first 0.5 s ${headDb.toFixed(1)} dBFS, last 0.5 s ${tailDb.toFixed(1)} dBFS`);
console.log(`  ${((Date.now() - started) / 1000).toFixed(1)} s`);
