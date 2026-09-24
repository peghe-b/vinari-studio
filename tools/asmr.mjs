#!/usr/bin/env node
// Vinari ASMR sound kit. Deterministic, zero dependencies, 48 kHz 16-bit stereo WAV.
//
//   node tools/asmr.mjs                  render every sound into public/sfx/asmr-*.wav, write asmr.json, print the report
//   node tools/asmr.mjs land knock       render only these (asmr.json is still rewritten from the files on disk)
//   node tools/asmr.mjs --check          analyse the files already on disk, render nothing
//   node tools/asmr.mjs --reel [file]    also write one audition file, every sound in a row at its mix level
//                                        (default out/asmr-reel.wav)
//   node tools/asmr.mjs --sheet [file]   also draw every sound as a spectrogram PNG (default out/asmr-sheet.png)
//   node tools/asmr.mjs --measure f.wav  print the analysis of any 16-bit PCM WAV (the voice, an app sound)
//   node tools/asmr.mjs --fresh          render and report only the sounds added on 2026-09-24 (haptic-*,
//                                        ui-tick*, notch, detent*, whoomp, shimmer); the older files stay
//                                        bit-identical
//   node tools/asmr.mjs --audition-only [file]  only write the audition of the new sounds (the fresh
//                                        asmr- ones and every cc0- one in asmr.json): out/sfx-audition.wav
//                                        and its text index out/sfx-audition.txt (also: --audition)
//
// FAMILY. These are the app's own sounds (Design/sounds/make.py) heard through a close microphone:
// struck wood and felt, modal bodies whose inharmonic partials die 4-9x faster than the fundamental,
// no melody, no glass, no sweeps, no synth risers. What the video adds is what a close mic hears:
// a crisp but quiet contact, a soft body, a tiny stereo width and a hint of a small room.
// HAPTICS (2026-09-24): the iPhone Taptic Engine as a camera hears it (taptic() below): 8-40 ms
// bursts at 120-260 Hz, braked dead, a faint contact click, and the case's 2nd/3rd harmonic buzz so
// a phone speaker still hears them. The `spk` column says how much survives a phone speaker.
// asmr.json also lists the recorded cc0- sounds of tools/sfx-import.mjs; each tool rewrites only its
// own entries, and every entry has a `family` (haptic, ui, mech, paper, cloth, air, impact, surface,
// tone, room).
//
// LEVELS. Every file is pre-balanced against the Vinari voice (edge-tts, measured below), so a sound
// played at its `suggestedVolume` (0.5, the default volume of <Sfx> and of a spec cue) already sits
// where it should under the voice. `air` is balanced for 0.16, the fixed volume Promo gives cutSfx.
// Nothing in the kit is loud: file peaks sit between -16 and -28 dBFS (the room at -44), so even at
// volume 1 every sound stays far below the voice's -5 dBFS peaks.
//
// SYNC. Every transient's onset is 3 ms into the file (after the 3 ms fade-in), so `at` = the frame of
// the event. Sounds with a build (swell, air) say where their peak is in `sync` in asmr.json.

import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, '..');
const SFX = path.join(ROOT, 'public', 'sfx');
const SR = 48000;
const TAU = 2 * Math.PI;
const LEAD = 0.003; // onset of every transient: right after the fade-in
const FADE = 0.003; // half-cosine fade at both ends of every one-shot

// Integrated loudness (BS.1770, gated) of the Vinari voice, measured with --measure on
// public/vo/v1-customs-cliff/voice.wav (-23.2 LUFS) and v4-deadlines (-22.2). Every `rel` below is
// "loudest 100 ms of the sound at its suggestedVolume, in LU relative to this".
// For scale, the sounds the scenes use today (same measure): app-landed at 0.55 sits at -10 LU,
// app-pick at 0.5 at -13, app-tick at 0.3 at -21.5, and synth-whoosh as the cut (0.16) at -3.5.
const VOICE_LUFS = -22.7;

const n = (s) => Math.max(0, Math.round(s * SR));
const db = (x) => 20 * Math.log10(Math.max(1e-12, x));
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

// ── randomness: seeded, so every render is bit-identical ─────────────────────────────────────
const rng = (seed) => {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
const white = (len, r) => Float64Array.from({length: len}, () => r() * 2 - 1);
// Paul Kellet's refined pink noise: the spectrum of air and of a room, -3 dB per octave
const pink = (len, r) => {
  const x = new Float64Array(len);
  let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
  for (let i = 0; i < len; i++) {
    const w = r() * 2 - 1;
    b0 = 0.99886 * b0 + w * 0.0555179; b1 = 0.99332 * b1 + w * 0.0750759; b2 = 0.969 * b2 + w * 0.153852;
    b3 = 0.8665 * b3 + w * 0.3104856; b4 = 0.55 * b4 + w * 0.5329522; b5 = -0.7616 * b5 - w * 0.016898;
    x[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
    b6 = w * 0.115926;
  }
  return x;
};
// leaky integrator: the rumble of a building, -6 dB per octave
const brown = (len, r) => {
  const x = new Float64Array(len);
  let y = 0;
  for (let i = 0; i < len; i++) x[i] = y = 0.997 * y + (r() * 2 - 1) * 0.05;
  return x;
};
// a smooth random curve in [-1, 1] with `hz` new targets per second: a hand, not an LFO
const wander = (len, hz, r) => {
  const step = SR / hz;
  const pts = Array.from({length: Math.ceil(len / step) + 2}, () => r() * 2 - 1);
  const x = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const p = i / step, k = Math.floor(p), w = 0.5 - 0.5 * Math.cos(Math.PI * (p - k));
    x[i] = pts[k] * (1 - w) + pts[k + 1] * w;
  }
  return x;
};
const rmsOf = (x) => Math.sqrt(x.reduce((s, v) => s + v * v, 0) / Math.max(1, x.length));
const unit = (x) => { const r = rmsOf(x) || 1; return x.map((v) => v / r); };

// ── filters ──────────────────────────────────────────────────────────────────────────────────
// RBJ biquads. Q stays low everywhere (0.5-0.9): a resonant filter on noise is exactly the
// sci-fi whistle the app's sounds avoid. Filters here only cut; they never sing.
const coefs = (type, f, q = 0.7071, gainDb = 0, sr = SR) => {
  const w0 = (TAU * Math.min(f, sr * 0.49)) / sr, c = Math.cos(w0), s = Math.sin(w0), al = s / (2 * q), A = 10 ** (gainDb / 40);
  let b0, b1, b2, a0, a1, a2;
  if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'hp') { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = b0; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'bp') { b0 = al; b1 = 0; b2 = -al; a0 = 1 + al; a1 = -2 * c; a2 = 1 - al; }
  else if (type === 'peak') { b0 = 1 + al * A; b1 = -2 * c; b2 = 1 - al * A; a0 = 1 + al / A; a1 = -2 * c; a2 = 1 - al / A; }
  else {
    const sq = 2 * Math.sqrt(A) * al;
    if (type === 'lowshelf') { b0 = A * (A + 1 - (A - 1) * c + sq); b1 = 2 * A * (A - 1 - (A + 1) * c); b2 = A * (A + 1 - (A - 1) * c - sq); a0 = A + 1 + (A - 1) * c + sq; a1 = -2 * (A - 1 + (A + 1) * c); a2 = A + 1 + (A - 1) * c - sq; }
    else { b0 = A * (A + 1 + (A - 1) * c + sq); b1 = -2 * A * (A - 1 + (A + 1) * c); b2 = A * (A + 1 + (A - 1) * c - sq); a0 = A + 1 - (A - 1) * c + sq; a1 = 2 * (A - 1 - (A + 1) * c); a2 = A + 1 - (A - 1) * c - sq; }
  }
  return [b0 / a0, b1 / a0, b2 / a0, a1 / a0, a2 / a0];
};
const biquad = (x, [b0, b1, b2, a1, a2]) => {
  const y = new Float64Array(x.length);
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = x[i], o = b0 * v + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2;
    x2 = x1; x1 = v; y2 = y1; y1 = o; y[i] = o;
  }
  return y;
};
const filt = (x, type, f, q, g) => biquad(x, coefs(type, f, q, g));
// Zero-delay-feedback state-variable filter: stays clean while its centre moves with a gesture.
// fc(i) in Hz. 'bp' is normalised to 0 dB at the centre.
const svf = (x, fc, q = 0.7, mode = 'bp') => {
  const y = new Float64Array(x.length), k = 1 / q;
  let ic1 = 0, ic2 = 0;
  for (let i = 0; i < x.length; i++) {
    const g = Math.tan((Math.PI * clamp(fc(i), 20, SR * 0.45)) / SR);
    const a1 = 1 / (1 + g * (g + k)), a2 = g * a1, a3 = g * a2;
    const v3 = x[i] - ic2, v1 = a1 * ic1 + a2 * v3, v2 = ic2 + a2 * ic1 + a3 * v3;
    ic1 = 2 * v1 - ic1; ic2 = 2 * v2 - ic2;
    y[i] = mode === 'bp' ? k * v1 : mode === 'lp' ? v2 : x[i] - k * v1 - v2;
  }
  return y;
};

// ── bodies (make.py, ported) ─────────────────────────────────────────────────────────────────
// (ratio, amplitude, decay factor). The third column matters most: the uppers must die 4-9x faster
// than the fundamental, so the strike has colour for 15-25 ms and then only a warm body remains.
const WOOD = [[1, 1, 1], [2.74, 0.115, 0.22], [5.38, 0.03, 0.09]]; // free bar
const FELT = [[1, 1, 1], [2.61, 0.048, 0.14]]; // soft and warm, the second tone dies at once
const CAP = [[1, 1, 1], [2.32, 0.3, 0.34], [4.25, 0.11, 0.17], [6.8, 0.045, 0.1]]; // a keycap: small plastic
const TABLE = [[1, 1, 1], [1.47, 0.28, 0.45], [2.18, 0.13, 0.3], [2.74, 0.08, 0.2], [5.38, 0.02, 0.09]]; // a wooden desk
const PIN = [[1, 1, 1], [1.53, 0.5, 0.6], [2.37, 0.25, 0.4]]; // a watch's escapement: tiny and dry
const CARD = [[1, 1, 1], [2.3, 0.45, 0.5], [3.9, 0.2, 0.3]]; // a split-flap card
const MECH = [[1, 1, 1], [1.83, 0.55, 0.5], [3.12, 0.3, 0.3]]; // shutter blades

// Half-cosine attack (never a root curve: it reaches half height in the first millisecond and the
// ear hears a click) and an exponential decay (never a power curve: it hangs like a synth tail).
const env = (len, attack, tau) => {
  const a = Math.max(1, attack * SR), out = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const ga = i < a ? 0.5 - 0.5 * Math.cos((Math.PI * i) / a) : 1;
    out[i] = ga * Math.exp(-Math.max(0, i - a) / SR / tau);
  }
  return out;
};

// A struck body. `glide` is the tiny settle of a real body as its amplitude falls (0.8 % max,
// make.py): weight, not motion. Anything above 0.008 turns into a laser.
const body = (f0, dur, {tau, shape = WOOD, attack = 0.005, glide = 0.008, glideT = 0.008}) => {
  const len = n(dur), out = new Float64Array(len), a = Math.max(1, attack * SR);
  const norm = shape.reduce((s, [, h]) => s + h, 0);
  for (const [ratio, h, ts] of shape) {
    const f = f0 * ratio;
    if (f > SR * 0.45) continue;
    let ph = 0;
    for (let i = 0; i < len; i++) {
      ph += (TAU * f * (1 + glide * Math.exp(-i / SR / glideT))) / SR;
      const ga = i < a ? 0.5 - 0.5 * Math.cos((Math.PI * i) / a) : 1;
      out[i] += h * Math.sin(ph) * ga * Math.exp(-Math.max(0, i - a) / SR / (tau * ts));
    }
  }
  return out.map((v) => v / norm);
};

// The stick meeting the body: filtered noise, never a click. Quiet by design: a transient that
// beats the body is what makes a sound cheap (make.py's main lesson).
const contact = (dur, {lp, hp, bp, q = 0.7, attack = 0.0008, tau, seed}) => {
  const len = n(dur);
  let x = white(len, rng(seed));
  if (bp) x = filt(x, 'bp', bp, q);
  if (lp) x = filt(filt(x, 'lp', lp, q), 'lp', lp, q);
  if (hp) x = filt(x, 'hp', hp, q);
  const e = env(len, attack, tau);
  return x.map((v, i) => v * e[i]);
};

// Paper tooth, fibres, grit: a Poisson rain of tiny impulses with heavy-tailed sizes.
const grains = (len, rate, amp, r, alpha = 2.4) => {
  const x = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    if (r() < rate(i) / SR) x[i] += (r() < 0.5 ? -1 : 1) * Math.min(6, (1 - r()) ** (-1 / alpha)) * amp(i);
  }
  return x;
};

// CSS cubic-bezier, the same curves the scenes animate with (src/tokens.ts BEZ)
const bezier = (x1, y1, x2, y2) => {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const sx = (t) => ((ax * t + bx) * t + cx) * t, sy = (t) => ((ay * t + by) * t + cy) * t;
  return (x) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let lo = 0, hi = 1, t = x;
    for (let k = 0; k < 40; k++) { if (sx(t) < x) lo = t; else hi = t; t = (lo + hi) / 2; }
    return sy(t);
  };
};
const COUNT_UP = bezier(0.16, 1, 0.3, 1); // BEZ.countUp: the Stat number
const DRAW_ON = bezier(0.65, 0, 0.35, 1); // BEZ.drawOn: every line that draws itself
// speed along a 0..1 easing, sampled per output sample, normalised to a peak of 1
const speedOf = (ease, len) => {
  const v = new Float64Array(len);
  for (let i = 0; i < len; i++) v[i] = ease((i + 1) / len) - ease(i / len);
  let m = 1e-12;
  for (const x of v) m = Math.max(m, x);
  return v.map((x) => x / m);
};

// ── stereo ───────────────────────────────────────────────────────────────────────────────────
// Level panning only: no inter-channel delay, so the sound folds to a phone's mono speaker intact.
const panGains = (p) => {
  const th = ((clamp(p, -1, 1) + 1) * Math.PI) / 4;
  return [Math.SQRT2 * Math.cos(th), Math.SQRT2 * Math.sin(th)];
};
class Mix {
  constructor(dur) { this.len = n(dur); this.L = new Float64Array(this.len); this.R = new Float64Array(this.len); }
  /** pan: a number, or a function of progress 0..1 through `x` (a gesture that travels) */
  add(x, at, gain = 1, pan = 0) {
    const o = n(at), fn = typeof pan === 'function';
    let [gl, gr] = fn ? [1, 1] : panGains(pan);
    for (let i = 0; i < x.length && o + i < this.len; i++) {
      if (fn && (i & 15) === 0) [gl, gr] = panGains(pan(i / x.length));
      this.L[o + i] += x[i] * gain * gl;
      this.R[o + i] += x[i] * gain * gr;
    }
    return this;
  }
  addLR(l, r, at, gain = 1) {
    const o = n(at);
    for (let i = 0; i < l.length && o + i < this.len; i++) { this.L[o + i] += l[i] * gain; this.R[o + i] += r[i] * gain; }
    return this;
  }
}
// two noise channels that share `corr` of their power: width without phase tricks
const pairOf = (make, len, seed, corr = 0.75) => {
  const c = make(len, rng(seed)), l = make(len, rng(seed + 1)), r = make(len, rng(seed + 2));
  const a = Math.sqrt(corr), b = Math.sqrt(1 - corr);
  return [c.map((v, i) => a * v + b * l[i]), c.map((v, i) => a * v + b * r[i])];
};

// ── the small room ───────────────────────────────────────────────────────────────────────────
// Early reflections (a desk, a near wall), three short allpass diffusers, then an 8-line feedback
// delay network with damping. Outputs are taken with orthogonal signs, so the tail is decorrelated
// between the ears while the dry sound stays in the middle. `db` is the tail's level against the
// dry sound: -20 dB is "a hint of a room".
const allpass = (x, ms, g) => {
  const d = Math.max(1, Math.round((ms * SR) / 1000)), buf = new Float64Array(d), y = new Float64Array(x.length);
  let p = 0;
  for (let i = 0; i < x.length; i++) { const z = buf[p], w = x[i] + g * z; y[i] = z - g * w; buf[p] = w; p = (p + 1) % d; }
  return y;
};
const room = (L, R, {rt60 = 0.32, pre = 0.004, damp = 5200, size = 1, db: level = -20, hp = 220, lp = 7500}) => {
  const len = L.length;
  const src = filt(Float64Array.from(L, (v, i) => 0.5 * (v + R[i])), 'hp', hp, 0.6);
  const wl = new Float64Array(len), wr = new Float64Array(len);
  [[2.3, 0.42, 0], [3.9, 0.36, 1], [5.6, 0.3, 0], [7.7, 0.25, 1], [9.8, 0.2, 0], [12.9, 0.16, 1]].forEach(([ms, g, side]) => {
    const d = Math.round((ms * size * SR) / 1000);
    for (let i = d; i < len; i++) { const v = src[i - d] * g; if (side) { wr[i] += v; wl[i] += 0.3 * v; } else { wl[i] += v; wr[i] += 0.3 * v; } }
  });
  let x = allpass(allpass(allpass(src, 1.13 * size, 0.62), 2.31 * size, 0.6), 3.71 * size, 0.55);
  const P = Math.round(pre * SR);
  const D = [7.13, 8.91, 10.69, 12.31, 14.23, 16.39, 18.71, 21.29].map((ms) => Math.round((ms * size * SR) / 1000));
  const bufs = D.map((d) => new Float64Array(d)), ptr = D.map(() => 0), lps = D.map(() => 0);
  const gains = D.map((d) => 10 ** ((-3 * d) / SR / rt60)), dampA = 1 - Math.exp((-TAU * damp) / SR);
  const sIn = [1, -1, 1, 1, -1, 1, -1, -1], sL = [1, -1, 1, -1, 1, -1, 1, -1], sR = [1, 1, -1, -1, 1, 1, -1, -1];
  const o = new Float64Array(8);
  for (let i = 0; i < len; i++) {
    let sum = 0;
    for (let j = 0; j < 8; j++) { lps[j] += dampA * (bufs[j][ptr[j]] - lps[j]); o[j] = lps[j]; sum += o[j]; }
    sum *= 0.25; // Householder reflection, 2/N
    const inp = i >= P ? x[i - P] * 0.35 : 0;
    let al = 0, ar = 0;
    for (let j = 0; j < 8; j++) {
      bufs[j][ptr[j]] = (o[j] - sum) * gains[j] + inp * sIn[j];
      ptr[j] = (ptr[j] + 1) % D[j];
      al += o[j] * sL[j]; ar += o[j] * sR[j];
    }
    wl[i] += al * 0.3; wr[i] += ar * 0.3;
  }
  const outL = filt(wl, 'lp', lp, 0.6), outR = filt(wr, 'lp', lp, 0.6);
  const k = (10 ** (level / 20) * Math.sqrt(rmsOf(L) ** 2 + rmsOf(R) ** 2)) / (Math.sqrt(rmsOf(outL) ** 2 + rmsOf(outR) ** 2) || 1);
  return {L: outL.map((v) => v * k), R: outR.map((v) => v * k)};
};

// ── the close microphone ─────────────────────────────────────────────────────────────────────
// Proximity warmth (+1.5 dB low shelf), a smooth dip where ears are harshest (-2 dB at 3.2 kHz),
// and a gentle top (low-Q low-pass). The DC high-pass at 24 Hz keeps the sub intact.
const mic = (x, top) => filt(filt(filt(filt(x, 'hp', 24, 0.707), 'lowshelf', 160, 0.7, 1.5), 'peak', 3200, 0.8, -2), 'lp', top, 0.55);

const halfCos = (i, m) => 0.5 - 0.5 * Math.cos((Math.PI * i) / m);
const finish = (m, s) => {
  let {L, R} = m;
  if (s.room) { const w = room(L, R, s.room); L = L.map((v, i) => v + w.L[i]); R = R.map((v, i) => v + w.R[i]); }
  L = mic(L, s.top ?? 14000);
  R = mic(R, s.top ?? 14000);
  if (s.loop) {
    // Seamless: render longer than the loop, then fold the overflow over the head with an
    // equal-power crossfade (the two halves are uncorrelated noise, so power stays flat). The last
    // sample of the loop is then followed by exactly the sample that came after it in the render.
    // The loop point itself is put where the render is calm, as a loop editor would: of the starts
    // in the first 0.5 s (10 ms apart), the one whose seam has the smallest 10 ms level change.
    const N = n(s.loop), X = n(1.5), w = n(0.01);
    const lvl = (a, b) => { let e = 0; for (let i = a; i < b; i++) e += L[i] * L[i] + R[i] * R[i]; return 10 * Math.log10(e / (b - a) + 1e-30); };
    let o = 0, best = Infinity;
    for (let c = 0; c + N + X <= L.length && c <= n(0.5); c += w) {
      const d = Math.abs(lvl(c + N - w, c + N) - lvl(c + N, c + N + w));
      if (d < best) { best = d; o = c; }
    }
    const fold = (x) => {
      const y = x.slice(o, o + N);
      for (let i = 0; i < X; i++) { const t = (Math.PI / 2) * (i / X); y[i] = x[o + i] * Math.sin(t) + x[o + N + i] * Math.cos(t); }
      const mean = y.reduce((a, v) => a + v, 0) / N;
      return y.map((v) => v - mean);
    };
    return {L: fold(L), R: fold(R)};
  }
  const len = L.length, f = n(FADE), tf = n(s.tailFade ?? 0);
  const shape = (x) => {
    for (let i = 0; i < len; i++) {
      let g = 1;
      if (i < f) g *= halfCos(i, f);
      if (i >= len - f) g *= halfCos(len - 1 - i, f);
      if (tf && i >= len - tf) g *= halfCos(len - 1 - i, tf);
      x[i] *= g;
    }
    // DC: subtract a Hann-shaped offset, so the correction itself is zero at both ends
    let s1 = 0, s2 = 0;
    for (let i = 0; i < len; i++) { s1 += x[i]; s2 += Math.sin((Math.PI * i) / (len - 1)) ** 2; }
    const c = s1 / (s2 || 1);
    for (let i = 0; i < len; i++) x[i] -= c * Math.sin((Math.PI * i) / (len - 1)) ** 2;
    return x;
  };
  return {L: shape(L), R: shape(R)};
};

// ── gestures ─────────────────────────────────────────────────────────────────────────────────

// One soft key: the fingertip meets the cap (a breath), the cap bottoms out 8 ms later (the thock:
// a small plastic body plus the case under it), and springs back up lighter and higher.
const keystroke = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1, up = 0.062}) => {
  const r = rng(seed * 977);
  m.add(contact(0.012, {bp: 3800, q: 0.7, attack: 0.0004, tau: 0.0014, seed: seed * 7 + 1}), at, 0.08 * level, pan);
  const t = at + 0.008 + r() * 0.002;
  m.add(body(330 * pitch, 0.09, {tau: 0.013, shape: CAP, attack: 0.0006, glide: 0.006, glideT: 0.004}), t, 0.9 * level, pan);
  m.add(contact(0.01, {bp: 4200, q: 0.8, attack: 0.0002, tau: 0.0011, seed: seed * 7 + 2}), t, 0.32 * level, pan);
  m.add(body(125 * pitch, 0.07, {tau: 0.016, shape: FELT, attack: 0.002}), t, 0.3 * level, pan);
  const u = t + up;
  m.add(body(392 * pitch, 0.05, {tau: 0.007, shape: CAP, attack: 0.0005}), u, 0.28 * level, pan);
  m.add(contact(0.008, {bp: 5000, q: 0.8, attack: 0.0002, tau: 0.0008, seed: seed * 7 + 3}), u, 0.1 * level, pan);
};

// A watch escapement: three micro-impacts inside 3 ms (the pallet, the wheel, the stop) and the
// case answering, all under 30 ms. Tiny and dry.
const microTick = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1}) => {
  [[0, 1], [0.0011, 0.5], [0.0026, 0.28]].forEach(([dt, a], k) => {
    m.add(body(2650 * pitch, 0.02, {tau: 0.0022, shape: PIN, attack: 0.00015, glide: 0}), at + dt, 0.5 * a * level, pan);
    m.add(contact(0.006, {bp: 6200, q: 0.7, attack: 0.0001, tau: 0.0004, seed: seed * 13 + k}), at + dt, 0.3 * a * level, pan);
  });
  m.add(body(880 * pitch, 0.03, {tau: 0.004, shape: WOOD, attack: 0.0004, glide: 0}), at, 0.35 * level, pan);
};

// A fingertip on phone glass: the skin arrives soft (1.2 ms), the glass gives a short crisp edge,
// the phone's body a small thud.
const fingerTap = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1}) => {
  m.add(body(205 * pitch, 0.05, {tau: 0.0085, shape: FELT, attack: 0.0012, glide: 0.008, glideT: 0.003}), at, level, pan);
  m.add(contact(0.02, {lp: 700, q: 0.6, attack: 0.001, tau: 0.004, seed: seed + 1}), at, 0.25 * level, pan);
  m.add(contact(0.01, {bp: 3400, q: 0.6, attack: 0.0003, tau: 0.0009, seed}), at + 0.0004, 0.4 * level, pan);
  m.add(body(2950 * pitch, 0.012, {tau: 0.0018, shape: [[1, 1, 1], [1.62, 0.5, 0.6]], attack: 0.0002, glide: 0}), at + 0.0004, 0.1 * level, pan);
};

// Graphite on paper. The pencil moves with the scene's own easing: speed brightens the hiss a
// little and thickens the paper tooth (physics, not a filter sweep). Pressure lands in 18 ms,
// wavers like a hand, lifts at the end. The stroke travels across the stereo field with the line.
const graphite = (m, at, dur, {seed, ease = DRAW_ON, pan0 = -0.18, pan1 = 0.18, level = 1, bright = 1, touch = true, lift = 0.045}) => {
  const len = n(dur), r = rng(seed), v = speedOf(ease, len), wob = wander(len, 5, r), chat = wander(len, 140, r);
  const pr = Float64Array.from({length: len}, (_, i) => {
    const t = i / SR, down = Math.min(1, t / 0.018), up = Math.min(1, (dur - t) / lift);
    return halfCos(Math.max(0, down), 1) * halfCos(Math.max(0, up), 1) * (1 + 0.1 * wob[i]);
  });
  const s = v.map((x) => 0.3 + 0.7 * x);
  const toothF = (i) => 2600 + 1000 * s[i] * bright, hissF = (i) => 1500 + 1500 * s[i] * bright;
  const tooth = svf(svf(grains(len, (i) => 500 + 3200 * s[i], (i) => pr[i], r), toothF, 0.7), toothF, 0.9);
  const hiss = svf(svf(white(len, r), hissF, 0.6), hissF, 0.9);
  const table = filt(white(len, r), 'lp', 320, 0.6);
  const x = filt(Float64Array.from({length: len}, (_, i) =>
    0.5 * tooth[i] + 0.55 * hiss[i] * pr[i] * s[i] ** 0.8 * (1 + 0.35 * chat[i]) + 0.14 * table[i] * pr[i] * s[i]), 'lp', 7000, 0.6);
  m.add(x, at, level, (p) => pan0 + (pan1 - pan0) * ease(p));
  if (touch) m.add(contact(0.008, {bp: 2800, q: 0.7, attack: 0.0002, tau: 0.0012, seed: seed + 5}), at, 0.35 * level, pan0);
};

// A felt-tip marker: smoother and lower than graphite, a soft pad touch at the start, the swipe
// follows the strike-through line's drawOn easing from left to right.
const marker = (m, at, dur, {seed, pan0 = -0.22, pan1 = 0.22, level = 1}) => {
  const len = n(dur), r = rng(seed), v = speedOf(DRAW_ON, len), chat = wander(len, 90, r);
  const s = v.map((x) => 0.25 + 0.75 * x);
  const pr = Float64Array.from({length: len}, (_, i) => {
    const t = i / SR;
    return halfCos(Math.min(1, t / 0.012), 1) * halfCos(Math.min(1, (dur - t) / 0.03), 1);
  });
  const hiss = svf(white(len, r), (i) => 1500 + 1100 * s[i], 0.55);
  const felt = svf(white(len, r), () => 650, 0.7);
  const fib = svf(grains(len, (i) => 250 + 900 * s[i], (i) => pr[i], r), () => 3000, 0.6);
  const x = filt(Float64Array.from({length: len}, (_, i) =>
    pr[i] * (0.7 * hiss[i] * s[i] * (1 + 0.2 * chat[i]) + 0.22 * felt[i] * s[i]) + 0.25 * fib[i]), 'lp', 5000, 0.6);
  m.add(x, at, level, (p) => pan0 + (pan1 - pan0) * DRAW_ON(p));
  m.add(contact(0.03, {lp: 1200, q: 0.6, attack: 0.0008, tau: 0.005, seed: seed + 9}), at, 0.3 * level, pan0);
  m.add(contact(0.01, {bp: 2500, q: 0.7, attack: 0.0004, tau: 0.001, seed: seed + 10}), at + dur - 0.012, 0.06 * level, pan1);
};

// One split-flap card: a crisp clack against the stop, a small bounce 9 ms later, the board frame.
const flapHit = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1}) => {
  m.add(contact(0.008, {bp: 3000, q: 0.7, attack: 0.0001, tau: 0.0009, seed}), at, 0.5 * level, pan);
  m.add(body(1320 * pitch, 0.03, {tau: 0.006, shape: CARD, attack: 0.0002, glide: 0.004, glideT: 0.002}), at, 0.32 * level, pan);
  m.add(body(1360 * pitch, 0.02, {tau: 0.004, shape: CARD, attack: 0.0002, glide: 0}), at + 0.009, 0.12 * level, pan);
  m.add(contact(0.006, {bp: 3300, q: 0.7, attack: 0.0001, tau: 0.0006, seed: seed + 1}), at + 0.009, 0.16 * level, pan);
  m.add(body(520 * pitch, 0.06, {tau: 0.01, shape: WOOD, attack: 0.0006}), at, 0.25 * level, pan);
};

// Shutter blades: three micro-impacts in 3 ms and the camera body under them.
const shutter = (m, at, {pitch = 1, level = 1, seed = 1}) => {
  [[0, 1], [0.0013, 0.6], [0.0031, 0.35]].forEach(([dt, a], k) => {
    m.add(body(1650 * pitch, 0.02, {tau: 0.004, shape: MECH, attack: 0.0002, glide: 0}), at + dt, 0.3 * a * level, 0);
    m.add(contact(0.008, {bp: 3900, q: 0.7, attack: 0.0001, tau: 0.0007, seed: seed + k}), at + dt, 0.35 * a * level, 0);
  });
  m.add(body(260 * pitch, 0.06, {tau: 0.011, shape: FELT, attack: 0.0008}), at, 0.55 * level, 0);
};

// One soft wooden note, a marimba bar under a soft mallet, with its resonator.
const woodNote = (m, at, {f = 440, level = 1, seed = 1, pan = 0.03}) => {
  m.add(body(f, 0.55, {tau: 0.075, shape: WOOD, attack: 0.0015, glide: 0.006, glideT: 0.006}), at, level, pan);
  m.add(body(f, 0.55, {tau: 0.12, shape: [[1, 1, 1]], attack: 0.003, glide: 0}), at, 0.25 * level, pan);
  m.add(contact(0.012, {bp: 1600, q: 0.6, attack: 0.0003, tau: 0.0012, seed}), at, 0.12 * level, pan);
};

// Air: a breath, not a whoosh. Two soft formants of an exhale through the lips (1.2 and 2.6 kHz),
// a little high air on top, slightly brighter when louder (as a real breath is), no sweep.
const breath = (dur, {seed, rise, fall, peakAt, bright = 1, corr = 0.7, lifeHz = 0, lifeDepth = 0}) => {
  const len = n(dur), pk = n(peakAt);
  const e = Float64Array.from({length: len}, (_, i) => {
    if (i < pk) return halfCos(i, pk) ** 1.4;
    return Math.exp(-(i - pk) / SR / fall);
  });
  const life = lifeHz ? wander(len, lifeHz, rng(seed + 50)) : null;
  const [a, b] = pairOf(pink, len, seed, corr);
  const shape = (x) => {
    const f1 = svf(x, (i) => 1200 * (0.9 + 0.2 * e[i] * bright), 0.8);
    const f2 = svf(x, (i) => 2600 * (0.9 + 0.2 * e[i] * bright), 0.9);
    const hi = filt(filt(x, 'hp', 5200, 0.6), 'lp', 9000, 0.6);
    const y = Float64Array.from({length: len}, (_, i) => (0.8 * f1[i] + 0.45 * f2[i] + 0.2 * hi[i] * e[i]) * e[i] * (life ? 1 + lifeDepth * life[i] : 1));
    return filt(filt(y, 'lp', 7000, 0.6), 'hp', 250, 0.6);
  };
  return [shape(a), shape(b)];
};

// ── haptics (added 2026-09-24: the owner asked for iPhone-like haptic sounds) ─────────────────
// The Taptic Engine as a camera next to the phone hears it. It is a linear resonant actuator: a
// small mass on a spring that rings at 120-260 Hz. iOS drives it for one to four cycles with a
// square-ish wave and then brakes it with half a cycle in anti-phase, so it stops dead: the whole
// event is 8-40 ms. What reaches a microphone is the case moving with the mass (the resonator), a
// little of the square drive's odd harmonics (the reason a haptic reads on a phone speaker at all,
// which cannot play 150 Hz), a faint high contact where the mass meets its end stop, and the case's
// own tiny tick. No pitch movement, no ring after the brake: a haptic that rings is a bell.
//   f      resonance in Hz          cycles  how long it is driven (1 = selection, 4 = heavy)
//   q      how freely it rings      sq      0 = sine drive (soft), 1 = square drive (rigid)
//   brake  anti-phase half cycle    click   the end-stop contact, relative to the body's peak
const taptic = (m, at, {f = 190, cycles = 2, q = 3, sq = 0.5, brake = 0.85, attack = 0.0006, click = 0.2, clickF = 4200, caseF = 2300, caseLvl = 0.1, rattle = 0.3, level = 1, pan = 0, seed = 1}) => {
  const T = cycles / f, B = brake ? 0.5 / f : 0, len = n(T + B + 0.05), a = Math.max(1, attack * SR);
  const k = 0.6 + 6 * sq, tk = Math.tanh(k), drive = new Float64Array(len);
  for (let i = 0; i < len; i++) {
    const t = i / SR;
    if (t >= T + B) break;
    const w = Math.tanh(k * Math.sin(TAU * f * t)) / tk;
    drive[i] = t < T ? w * (i < a ? halfCos(i, a) : 1) : -brake * w;
  }
  const res = filt(drive, 'bp', f, q);
  let rp = 1e-9;
  for (const v of res) rp = Math.max(rp, Math.abs(v));
  const x0 = res.map((v) => v / rp);
  // The case against a desk or a palm buzzes at the 2nd and 3rd harmonic (360-780 Hz): the part of
  // a haptic that a phone speaker can play. Chebyshev terms on the case motion, DC and rumble cut.
  const buzz = filt(filt(x0.map((v) => 0.55 * v * v + 0.3 * (4 * v ** 3 - 3 * v)), 'hp', 280, 0.7), 'lp', 3000, 0.6);
  const leak = filt(filt(drive, 'lp', 2600, 0.6), 'hp', 300, 0.6); // the drive's odd harmonics through the case
  const x = x0.map((v, i) => v + rattle * buzz[i] + 0.3 * sq * leak[i]);
  let pk = 1e-9;
  for (const v of x) pk = Math.max(pk, Math.abs(v));
  m.add(x.map((v) => v / pk), at, level, pan);
  if (click) m.add(contact(0.006, {bp: clickF, q: 0.8, attack: 0.0001, tau: 0.00035, seed}), at, click * level, pan);
  if (caseLvl) m.add(body(caseF, 0.014, {tau: 0.0012, shape: PIN, attack: 0.00015, glide: 0}), at + 0.0004, caseLvl * level, pan);
  if (click && brake) m.add(contact(0.005, {bp: clickF * 0.9, q: 0.8, attack: 0.0001, tau: 0.0003, seed: seed + 1}), at + T, 0.35 * click * level, pan);
};
// The UIKit feedback styles, as parameters of the same engine. Heavier = lower, longer, more square.
const HAPTIC = {
  selection: {f: 240, cycles: 1, q: 2.2, sq: 0.3, click: 0.3, clickF: 4600, caseF: 2600, caseLvl: 0.14, rattle: 0.3},
  light: {f: 215, cycles: 1.5, q: 2.6, sq: 0.4, click: 0.24, clickF: 4400, caseLvl: 0.1, rattle: 0.4},
  medium: {f: 185, cycles: 2.5, q: 3, sq: 0.5, click: 0.2, clickF: 4000, caseLvl: 0.09, rattle: 0.55},
  heavy: {f: 150, cycles: 4, q: 3.4, sq: 0.6, click: 0.16, clickF: 3600, caseF: 2000, caseLvl: 0.08, rattle: 0.75},
  rigid: {f: 258, cycles: 1.5, q: 1.8, sq: 0.95, brake: 1, attack: 0.0002, click: 0.42, clickF: 5000, caseF: 2900, caseLvl: 0.2, rattle: 0.45},
  soft: {f: 140, cycles: 3, q: 2.4, sq: 0, brake: 0, attack: 0.004, click: 0.04, clickF: 1800, caseLvl: 0, rattle: 0.4},
};
const haptic = (m, at, style, extra = {}) => taptic(m, at, {...HAPTIC[style], ...extra});

// A picker wheel's detent heard up close: a dry plastic tick (a small cap body that is gone in 2-3
// ms) and the wheel's hub under it. No glass: nothing high is allowed to ring.
const uiTick = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1, soft = 0}) => {
  m.add(contact(0.006, {bp: (3300 - 1200 * soft) * pitch, q: 0.75, attack: 0.00012, tau: 0.00045 + 0.0003 * soft, seed}), at, (0.45 - 0.22 * soft) * level, pan);
  m.add(body((1480 - 560 * soft) * pitch, 0.02, {tau: 0.0024 + 0.0012 * soft, shape: CAP, attack: 0.00018 + 0.0003 * soft, glide: 0}), at, 0.55 * level, pan);
  m.add(body(240 * pitch, 0.03, {tau: 0.004, shape: FELT, attack: 0.0008}), at, (0.2 + 0.15 * soft) * level, pan);
};

// A slider or stepper passing one notch: the selection haptic's little body with a soft plastic
// tick on it, rounder and quieter than uiTick.
const notch = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1}) => {
  taptic(m, at, {f: 230 * pitch, cycles: 1, q: 2.2, sq: 0.25, brake: 0.9, click: 0.1, clickF: 3000, caseLvl: 0.04, level: 0.8 * level, pan, seed});
  m.add(body(1050 * pitch, 0.02, {tau: 0.0022, shape: CAP, attack: 0.0003, glide: 0}), at + 0.0008, 0.26 * level, pan);
};

// A sprung ball leaving one groove (a faint pre-tick) and dropping into the next 6 ms later: the
// main tick with a round low body under it. A scroll wheel, a crown, a flap board's step.
const detent = (m, at, {pitch = 1, level = 1, pan = 0, seed = 1}) => {
  m.add(contact(0.005, {bp: 2600 * pitch, q: 0.7, attack: 0.0001, tau: 0.0003, seed}), at, 0.12 * level, pan);
  const t = at + 0.006;
  m.add(contact(0.006, {bp: 3000 * pitch, q: 0.7, attack: 0.0001, tau: 0.0005, seed: seed + 1}), t, 0.34 * level, pan);
  m.add(body(720 * pitch, 0.03, {tau: 0.004, shape: WOOD, attack: 0.0003, glide: 0}), t, 0.45 * level, pan);
  taptic(m, t, {f: 170 * pitch, cycles: 1, q: 2.4, sq: 0.3, brake: 0.8, click: 0, caseLvl: 0, level: 0.55 * level, pan, seed: seed + 2});
};

// ── the kit ──────────────────────────────────────────────────────────────────────────────────
// rel: loudest 100 ms at suggestedVolume, LU against the voice. vol: suggestedVolume.
// family: haptic, ui, mech, paper, air, impact, surface, tone, room. fresh: in the audition reel.
const SOUNDS = [
  {
    name: 'key', dur: 0.22, rel: -19, vol: 0.5, room: {db: -24},
    use: 'one soft keyboard key: a single letter or word typing on',
    sync: 'the key bottoms out 11 ms in: at = the frame the letter appears',
    make() { const m = new Mix(this.dur); keystroke(m, LEAD, {seed: 11}); return m; },
  },
  {
    name: 'key-roll', dur: 0.62, rel: -18, vol: 0.5, room: {db: -24},
    use: '8 quick soft keys over 0.42 s: a monospace label or the meta line typing on (at 1.4 characters per frame that is about 18 characters)',
    sync: 'first key at 11 ms: at = the frame the label starts typing',
    make() {
      const m = new Mix(this.dur);
      const t = [0, 0.058, 0.121, 0.172, 0.236, 0.301, 0.349, 0.418];
      const p = [1, 1.05, 0.96, 1.02, 0.94, 1.07, 0.99, 1.03];
      const l = [0.95, 0.8, 0.9, 0.78, 1, 0.85, 0.82, 0.92];
      const pan = [-0.12, 0.05, -0.02, 0.14, -0.08, 0.1, -0.15, 0.03];
      const up = [0.05, 0.066, 0.055, 0.07, 0.052, 0.061, 0.058, 0.064];
      t.forEach((dt, k) => keystroke(m, LEAD + dt, {pitch: p[k], level: l[k], pan: pan[k], up: up[k], seed: 20 + k}));
      return m;
    },
  },
  {
    name: 'tick-fine', dur: 0.05, rel: -22, vol: 0.5, room: null, top: 12000,
    use: 'a watch-like micro tick: one step of a count, a small value changing, a grid cell',
    sync: 'onset 3 ms',
    make() { const m = new Mix(this.dur); microTick(m, LEAD, {seed: 31}); return m; },
  },
  ...[['count-roll', 1.0], ['count-roll-long', 1.2]].map(([name, T]) => ({
    name, dur: T + 0.08, rel: -18, vol: 0.5, room: {db: -26}, top: 12000,
    use: T === 1
      ? 'a roll of fine ticks slowing down along the Stat count-up curve (30 frames, BEZ.countUp); pair with land at the landing frame. With Stat landAt the count runs longer: start the roll at the count, it ends early, which is right because BEZ.countUp has covered 97 % of the value at half time'
      : 'the same roll for Stat values of 100 000 and more (36 frames)',
    sync: `first tick at 3 ms = the frame the count starts; the last tick lands before ${Math.round((T - 0.04) * 1000)} ms, so land can take the landing frame`,
    make() {
      // Tick rate follows the number's speed (compressed, with a floor so it never stalls):
      // a fast ratchet while the digits blur, single ticks while it settles.
      const m = new Mix(this.dur), r = rng(T === 1 ? 41 : 42), steps = n(T);
      const v = speedOf(COUNT_UP, steps);
      let ph = 0.999, k = 0;
      const bed = new Float64Array(steps);
      for (let i = 0; i < steps && i / SR < T - 0.04; i++) {
        ph += (7 + 31 * v[i] ** 0.55) / SR;
        bed[i] = v[i] ** 0.8;
        if (ph >= 1) {
          ph -= 1;
          const dense = v[i] ** 0.5;
          microTick(m, LEAD + i / SR, {pitch: (k % 2 ? 0.955 : 1) * (1 + 0.015 * (r() * 2 - 1)), level: (0.6 + 0.4 * (1 - dense)) * (1 + 0.1 * (r() * 2 - 1)), pan: k % 2 ? 0.04 : -0.04, seed: 400 + k});
          k++;
        }
      }
      // the mechanism's whisper under the ticks, only while it runs fast
      const hush = svf(white(steps, r), () => 1800, 0.6);
      m.add(hush.map((x, i) => x * bed[i] * 0.05), LEAD);
      return m;
    },
  })),
  {
    name: 'land', dur: 0.5, rel: -12, vol: 0.5, room: {rt60: 0.32, db: -21},
    use: 'a number lands: felt thump with a tiny wood knock on top (the app\'s landed, closer and softer)',
    sync: 'onset 3 ms: at = the landing frame (not landAt - 1)',
    make() {
      const m = new Mix(this.dur);
      m.add(body(110, 0.48, {tau: 0.07, shape: FELT, attack: 0.003, glide: 0.008, glideT: 0.01}), LEAD, 1);
      m.add(contact(0.04, {lp: 650, q: 0.6, attack: 0.0012, tau: 0.007, seed: 21}), LEAD, 0.2);
      m.add(body(523.25, 0.12, {tau: 0.017, shape: WOOD, attack: 0.0008, glide: 0.006}), LEAD + 0.0015, 0.26);
      m.add(contact(0.01, {bp: 2600, q: 0.7, attack: 0.0002, tau: 0.0008, seed: 22}), LEAD + 0.0015, 0.06);
      return m;
    },
  },
  {
    name: 'knock', dur: 0.36, rel: -14, vol: 0.5, room: {rt60: 0.35, db: -21},
    use: 'a knuckle on a wooden desk, close: an element, card or chip appears',
    sync: 'onset 3 ms',
    make() {
      const m = new Mix(this.dur);
      m.add(body(196, 0.33, {tau: 0.038, shape: TABLE, attack: 0.0012, glide: 0.008, glideT: 0.006}), LEAD, 1, -0.04);
      m.add(contact(0.02, {bp: 1500, q: 0.6, attack: 0.0005, tau: 0.0028, seed: 31}), LEAD, 0.22, -0.04);
      m.add(contact(0.01, {bp: 5200, q: 0.7, attack: 0.0002, tau: 0.0006, seed: 32}), LEAD, 0.05, -0.04);
      return m;
    },
  },
  {
    name: 'tap', dur: 0.12, rel: -15, vol: 0.5, room: {db: -26},
    use: 'a finger on phone glass, crisp but soft: the tap ring in Phone',
    sync: 'onset 3 ms: at = the frame the tap ring appears',
    make() { const m = new Mix(this.dur); fingerTap(m, LEAD, {seed: 51}); return m; },
  },
  {
    name: 'double-tap', dur: 0.24, rel: -15, vol: 0.5, room: {db: -26},
    use: 'two taps 105 ms apart, the second a touch lighter',
    sync: 'first tap 3 ms, second 108 ms',
    make() { const m = new Mix(this.dur); fingerTap(m, LEAD, {seed: 61}); fingerTap(m, LEAD + 0.105, {pitch: 1.015, level: 0.82, seed: 63}); return m; },
  },
  ...[['pencil', 0.95, 'graphite drawing a line (0.95 s along BEZ.drawOn): a bar, an underline, an axis drawing on', -0.18, 0.18],
      ['pencil-short', 0.36, 'a quick graphite stroke (0.36 s): a tick mark, a short divider, a small label rule', -0.1, 0.1],
      ['pencil-long', 2.0, 'a long graphite line (2.0 s along BEZ.drawOn): LineChart draw (42-78 frames), a path across the screen', -0.22, 0.22]]
    .map(([name, T, use, a, b], k) => ({
      name, dur: T + 0.1, rel: -17, vol: 0.5, room: {db: -25}, top: 13000, use,
      sync: `the stroke starts at 3 ms and lifts at ${Math.round((T + LEAD) * 1000)} ms, panning left to right with the line`,
      make() { const m = new Mix(this.dur); graphite(m, LEAD, T, {seed: 70 + k * 10, pan0: a, pan1: b}); return m; },
    })),
  {
    name: 'paper', dur: 0.7, rel: -17, vol: 0.5, room: {db: -24}, top: 13000,
    use: 'a sheet slides across a desk and settles: a card or panel slides into place',
    sync: 'the slide peaks 85 ms in and settles with a faint pat at 360 ms',
    make() {
      const m = new Mix(this.dur), T = 0.5, len = n(T), r = rng(101), tau = 0.085;
      const v = Float64Array.from({length: len}, (_, i) => { const t = i / SR / tau; return t * Math.exp(1 - t); });
      const pos = new Float64Array(len);
      for (let i = 1; i < len; i++) pos[i] = pos[i - 1] + v[i];
      const total = pos[len - 1];
      const [pa, pb] = pairOf(pink, len, 102, 0.8);
      const sheet = (x, seed) => {
        const rr = rng(seed), fr = svf(x, (i) => 1100 + 1900 * v[i], 0.55);
        const gr = svf(grains(len, (i) => 150 + 1100 * v[i], (i) => v[i], rr), () => 3800, 0.7);
        const air = filt(white(len, rr), 'lp', 380, 0.6);
        return filt(Float64Array.from({length: len}, (_, i) => fr[i] * v[i] ** 0.9 * 3 + 0.25 * gr[i] + 0.15 * air[i] * v[i]), 'lp', 7500, 0.6);
      };
      const l = sheet(pa, 103), rr = sheet(pb, 104);
      const pan = Float64Array.from({length: len}, (_, i) => 0.2 * (1 - pos[i] / total));
      for (let i = 0; i < len; i++) { const [gl, gr] = panGains(pan[i]); l[i] *= gl; rr[i] *= gr; }
      m.addLR(l, rr, LEAD);
      m.add(body(170, 0.08, {tau: 0.012, shape: FELT, attack: 0.0015}), LEAD + 0.36, 0.1);
      m.add(contact(0.02, {lp: 900, q: 0.6, attack: 0.0008, tau: 0.003, seed: 105}), LEAD + 0.36, 0.04);
      return m;
    },
  },
  {
    name: 'paper-tear', dur: 0.74, rel: -16, vol: 0.5, room: {db: -25}, top: 13000,
    use: 'a slow, close paper tear: something old is torn away, a price ripped off',
    sync: 'the tear starts at 3 ms, runs 0.62 s, the last fibres let go at 615 and 630 ms',
    make() {
      const m = new Mix(this.dur), T = 0.62, len = n(T), r = rng(111), stut = wander(len, 11, r), zip = wander(len, 55, r);
      const e = Float64Array.from({length: len}, (_, i) => {
        const t = i / SR, rise = halfCos(Math.min(1, t / 0.07), 1), fall = halfCos(Math.min(1, (T - t) / 0.1), 1);
        return rise * fall * (0.55 + 0.45 * (0.5 + 0.5 * stut[i]));
      });
      const tear = (seed) => {
        const rr = rng(seed);
        const a = filt(svf(grains(len, (i) => 1200 + 4200 * e[i], (i) => e[i], rr), () => 3300, 0.55), 'hp', 900, 0.6);
        const b = svf(grains(len, (i) => 150 + 500 * e[i], (i) => 1.6 * e[i], rr), () => 1500, 0.7);
        const rip = svf(white(len, rr), () => 2000, 0.9);
        const flut = filt(white(len, rr), 'lp', 320, 0.6);
        return filt(Float64Array.from({length: len}, (_, i) => 0.5 * a[i] + 0.35 * b[i] + e[i] * (0.3 * rip[i] * (1 + 0.3 * zip[i]) + 0.12 * flut[i])), 'lp', 8000, 0.6);
      };
      const c = tear(112), l = tear(113), rr = tear(114);
      m.add(c, LEAD, 0.85, (p) => 0.12 - 0.16 * p);
      m.addLR(l, rr, LEAD, 0.3);
      m.add(contact(0.01, {bp: 2600, q: 0.7, attack: 0.0002, tau: 0.001, seed: 115}), LEAD + 0.612, 0.2, -0.04);
      m.add(contact(0.01, {bp: 2300, q: 0.7, attack: 0.0002, tau: 0.001, seed: 116}), LEAD + 0.628, 0.13, -0.05);
      return m;
    },
  },
  {
    name: 'air', dur: 0.42, rel: -18, vol: 0.16, room: null, top: 12000,
    use: 'the scene cut: a soft breath of air, not a whoosh. Drop-in for cutSfx (Promo plays it 3 frames before the cut at volume 0.16)',
    sync: 'peak at 100 ms = exactly the cut when started 3 frames early',
    make() {
      const m = new Mix(this.dur);
      const [l, r] = breath(0.4, {seed: 121, peakAt: 0.1, fall: 0.085, corr: 0.7});
      m.addLR(l.map((v, i) => v * panGains(-0.1 + 0.2 * (i / l.length))[0]), r.map((v, i) => v * panGains(-0.1 + 0.2 * (i / r.length))[1]), 0.002);
      return m;
    },
  },
  {
    name: 'air-long', dur: 1.7, rel: -19, vol: 0.5, room: null, top: 12000, tailFade: 0.3,
    use: 'a slow breath of air under a reveal or a long camera move',
    sync: 'rises for 0.8 s, then eases away over 0.9 s',
    make() {
      const m = new Mix(this.dur);
      const [l, r] = breath(1.68, {seed: 131, peakAt: 0.8, fall: 0.24, corr: 0.6, bright: 0.8, lifeHz: 1.5, lifeDepth: 0.15});
      m.addLR(l.map((v, i) => v * panGains(-0.15 + 0.3 * (i / l.length))[0]), r.map((v, i) => v * panGains(-0.15 + 0.3 * (i / r.length))[1]), 0.002);
      return m;
    },
  },
  {
    name: 'swell', dur: 1.36, rel: -15, vol: 0.5, room: {rt60: 0.5, db: -22}, top: 12000,
    use: 'a soft rising air for a reveal: no pitch, it only thickens (a warm band, then air, then fine grains)',
    sync: 'peaks at 1.2 s and lets go in 70 ms: at = reveal frame - 36',
    make() {
      const m = new Mix(this.dur), T = 1.2, R70 = 0.07, len = n(T + R70), r = rng(141);
      const g = Float64Array.from({length: len}, (_, i) => { const t = i / SR; return t <= T ? t / T : halfCos(Math.max(0, T + R70 - t), R70); });
      const layer = (seed) => {
        const rr = rng(seed), p = pink(len, rr);
        const warm = filt(filt(p, 'bp', 700, 0.5), 'lp', 1800, 0.6), air = filt(filt(white(len, rr), 'hp', 4000, 0.6), 'lp', 8500, 0.6);
        const sand = svf(svf(grains(len, (i) => 20 + 880 * g[i] ** 2, () => 1, rr), () => 3800, 0.7), () => 3800, 0.9);
        return Float64Array.from({length: len}, (_, i) => 2.2 * warm[i] * g[i] ** 2.2 + 0.3 * air[i] * g[i] ** 3.2 + 0.14 * sand[i] * g[i] ** 1.5);
      };
      const [c, l, rr] = [layer(142), layer(143), layer(144)];
      m.addLR(c.map((v, i) => 0.8 * v + 0.6 * l[i]), c.map((v, i) => 0.8 * v + 0.6 * rr[i]), LEAD);
      return m;
    },
  },
  {
    name: 'sub', dur: 1.0, rel: -12, vol: 0.5, room: null, tailFade: 0.2,
    use: 'a very soft low felt thump under the hook, felt more than heard (earbuds); its felt overtone keeps it alive on a phone speaker',
    sync: 'onset 3 ms: at = the hook frame',
    make() {
      const m = new Mix(this.dur);
      m.add(body(52, 0.99, {tau: 0.2, shape: [[1, 1, 1], [2.61, 0.16, 0.3]], attack: 0.006, glide: 0.008, glideT: 0.012}), LEAD, 1);
      m.add(contact(0.06, {lp: 240, q: 0.6, attack: 0.002, tau: 0.012, seed: 151}), LEAD, 0.22);
      return m;
    },
  },
  {
    name: 'flap', dur: 0.1, rel: -17, vol: 0.5, room: {db: -26},
    use: 'one split-flap card falling: one per flap in SplitFlap (4 frames apart)',
    sync: 'onset 3 ms, bounce at 12 ms',
    make() { const m = new Mix(this.dur); flapHit(m, LEAD, {seed: 161}); return m; },
  },
  {
    name: 'flap-roll', dur: 0.66, rel: -16, vol: 0.5, room: {db: -25},
    use: 'half a second of a split-flap board turning over, 12 cards, slowing slightly, the last one settles',
    sync: 'first flap 3 ms, last flap at about 500 ms',
    make() {
      const m = new Mix(this.dur), r = rng(171);
      let t = LEAD;
      for (let k = 0; k < 12; k++) {
        const last = k === 11;
        flapHit(m, t, {pitch: 1 + 0.05 * (r() * 2 - 1), level: last ? 1.05 : 0.8 + 0.2 * r(), pan: 0.18 * (r() * 2 - 1), seed: 172 + k * 3});
        t += 0.036 + (0.016 * k) / 11 + 0.003 * (r() * 2 - 1);
      }
      return m;
    },
  },
  {
    name: 'check', dur: 0.17, rel: -18, vol: 0.5, room: {db: -26}, top: 13000,
    use: 'a tiny pencil tick for a check mark: a short down-stroke, a pivot, a quick flick up',
    sync: 'down-stroke 3-38 ms, pivot tick at 38 ms, flick lifts at about 100 ms',
    make() {
      const m = new Mix(this.dur);
      graphite(m, LEAD, 0.035, {seed: 181, ease: (x) => x, pan0: -0.06, pan1: -0.02, level: 0.8, lift: 0.01});
      m.add(body(990, 0.03, {tau: 0.004, shape: WOOD, attack: 0.0003, glide: 0}), LEAD + 0.035, 0.18, -0.02);
      graphite(m, LEAD + 0.036, 0.062, {seed: 182, ease: (x) => 1 - (1 - x) ** 2, pan0: -0.02, pan1: 0.08, level: 0.9, bright: 1.25, touch: false, lift: 0.04});
      return m;
    },
  },
  {
    name: 'strike', dur: 0.48, rel: -16, vol: 0.5, room: {db: -25}, top: 13000,
    use: 'a felt-tip marker swiping a strike-through: List strike (12 frames, BEZ.drawOn)',
    sync: 'touch at 3 ms, lift at 403 ms: at = the frame the strike starts drawing (List: at + 14)',
    make() { const m = new Mix(this.dur); marker(m, LEAD, 0.4, {seed: 191}); return m; },
  },
  {
    name: 'pop', dur: 0.18, rel: -16, vol: 0.5, room: {db: -24},
    use: 'a soft bubble for a dot or a pin appearing: a 20 ms droplet rise, not a cartoon pop',
    sync: 'onset 3 ms',
    make() {
      const m = new Mix(this.dur), len = n(0.1), x = new Float64Array(len), x2 = new Float64Array(len), a = 0.0012 * SR;
      let ph = 0, ph2 = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR, f = 780 * (1 + 0.32 * (1 - Math.exp(-t / 0.009)));
        ph += (TAU * f) / SR; ph2 += (TAU * f * 2.3) / SR;
        const ga = i < a ? halfCos(i, a) : 1;
        x[i] = Math.sin(ph) * ga * Math.exp(-Math.max(0, i - a) / SR / 0.016);
        x2[i] = Math.sin(ph2) * ga * Math.exp(-Math.max(0, i - a) / SR / 0.004);
      }
      m.add(x, LEAD, 0.7);
      m.add(x2, LEAD, 0.05);
      m.add(body(190, 0.06, {tau: 0.009, shape: FELT, attack: 0.001}), LEAD, 0.3);
      m.add(contact(0.008, {lp: 2200, q: 0.6, attack: 0.0003, tau: 0.0007, seed: 201}), LEAD, 0.06);
      return m;
    },
  },
  {
    name: 'slide', dur: 0.62, rel: -17, vol: 0.5, room: {db: -25},
    use: 'a phone sliding in on a smooth desk and coming to rest: the Phone scene entrance',
    sync: 'moves with the enterXL spring: fastest at 95 ms, rests with a faint touch at 345 ms',
    make() {
      const m = new Mix(this.dur), T = 0.5, len = n(T), tau = 0.095;
      const v = Float64Array.from({length: len}, (_, i) => { const t = i / SR / tau; return t * Math.exp(1 - t); });
      const [pa, pb] = pairOf(pink, len, 211, 0.75);
      const side = (x, seed) => {
        const rr = rng(seed), wob = wander(len, 30, rr);
        const fr = svf(x, (i) => 600 + 900 * v[i], 0.5);
        const rum = filt(white(len, rr), 'lp', 220, 0.6);
        const grit = svf(grains(len, (i) => 80 + 900 * v[i], (i) => v[i], rr), () => 5200, 0.7);
        return filt(Float64Array.from({length: len}, (_, i) => 3 * fr[i] * v[i] ** 0.9 * (1 + 0.12 * wob[i]) + 0.4 * rum[i] * v[i] + 0.12 * grit[i]), 'lp', 6000, 0.6);
      };
      m.addLR(side(pa, 212), side(pb, 213), LEAD);
      m.add(body(150, 0.08, {tau: 0.014, shape: FELT, attack: 0.002}), LEAD + 0.342, 0.12);
      return m;
    },
  },
  {
    name: 'screen', dur: 0.3, rel: -18, vol: 0.5, room: {db: -24}, top: 13000,
    use: 'a screen waking: a tiny tick, a soft round felt blip and a breath of light air',
    sync: 'onset 3 ms, the air blooms by 25 ms',
    make() {
      const m = new Mix(this.dur), len = n(0.28);
      m.add(body(1174.66, 0.03, {tau: 0.005, shape: WOOD, attack: 0.0004, glide: 0}), LEAD, 0.3);
      m.add(body(587.33, 0.25, {tau: 0.045, shape: FELT, attack: 0.006, glide: 0.004}), LEAD + 0.002, 0.3);
      const [a, b] = pairOf(white, len, 221, 0.5);
      const e = env(len, 0.022, 0.065);
      const bloom = (x) => { const y = filt(filt(x, 'bp', 2600, 0.5), 'lp', 7000, 0.6); return y.map((v, i) => v * e[i]); };
      m.addLR(bloom(a), bloom(b), LEAD, 0.22);
      return m;
    },
  },
  {
    name: 'notif', dur: 0.62, rel: -14, vol: 0.5, room: {rt60: 0.5, db: -19},
    use: 'a notification: two soft wooden notes of the same pitch (A4), 135 ms apart. No melody, never two pitches',
    sync: 'first note 3 ms, second 138 ms',
    make() { const m = new Mix(this.dur); woodNote(m, LEAD, {seed: 231}); woodNote(m, LEAD + 0.135, {level: 0.72, seed: 232}); return m; },
  },
  {
    name: 'camera', dur: 0.26, rel: -15, vol: 0.5, room: {db: -25}, top: 11000,
    use: 'a soft mechanical shutter: a scan, a VIN or QR captured',
    sync: 'first curtain 3 ms, second 77 ms',
    make() {
      const m = new Mix(this.dur);
      shutter(m, LEAD, {seed: 241});
      m.add(contact(0.05, {bp: 2400, q: 1.0, attack: 0.003, tau: 0.012, seed: 244}), LEAD + 0.004, 0.08);
      shutter(m, LEAD + 0.074, {pitch: 0.93, level: 0.8, seed: 245});
      return m;
    },
  },
  {
    name: 'end', dur: 3.4, rel: -11, vol: 0.5, room: {rt60: 1.25, pre: 0.009, damp: 4200, size: 1.6, db: -14}, tailFade: 0.6,
    use: 'the end card: one warm felt hit (D3) with a long soft tail in a small room',
    sync: 'onset 3 ms: at = the frame the end card lands; the tail breathes out over 3.4 s',
    make() {
      const m = new Mix(this.dur);
      m.add(body(146.83, 3.3, {tau: 0.52, shape: [[1, 1, 1], [2.61, 0.05, 0.14], [1.42, 0.07, 0.22]], attack: 0.004, glide: 0.008, glideT: 0.01}), LEAD, 1);
      m.add(contact(0.08, {lp: 900, q: 0.6, attack: 0.002, tau: 0.009, seed: 251}), LEAD, 0.16);
      m.add(contact(0.02, {bp: 2400, q: 0.6, attack: 0.0006, tau: 0.0014, seed: 252}), LEAD, 0.03);
      return m;
    },
  },
  // ── haptic family (2026-09-24) ──
  ...[
    ['selection', -24, 'the tiniest haptic: one row of a picker, a chip or tab becoming selected, a toggle between two values'],
    ['light', -21, 'a light impact: a small card or chip lands, a dot snaps to a line, a highlight band arrives'],
    ['medium', -18, 'a medium impact: a panel or phone screen snaps into place, a bar reaches its value'],
    ['heavy', -16, 'a heavy impact: the hero number or the car model lands, the one moment of weight in a scene'],
    ['rigid', -20, 'a rigid, precise impact: a value locks, a grid cell fills, a bracket snaps onto a part'],
    ['soft', -19, 'a soft, cushioned impact: something settles gently (a sheet, a sticker, the end of a slide)'],
  ].map(([style, rel, use]) => ({
    name: `haptic-${style}`, dur: style === 'heavy' || style === 'soft' ? 0.1 : 0.08, rel, vol: 0.5, room: null, top: 12000, family: 'haptic', fresh: true, use,
    sync: 'onset 3 ms, the whole event is over in 8-40 ms: at = the frame of the impact',
    make() { const m = new Mix(this.dur); haptic(m, LEAD, style, {seed: 500 + style.length}); return m; },
  })),
  {
    name: 'haptic-success', dur: 0.2, rel: -18, vol: 0.5, room: null, top: 12000, family: 'haptic', fresh: true,
    use: 'success: two quick taps, the second firmer. A green check lands, a value is confirmed (only with a green, good-for-the-viewer event)',
    sync: 'first tap 3 ms, second 98 ms: at = the frame the check appears',
    make() { const m = new Mix(this.dur); haptic(m, LEAD, 'light', {level: 0.72, seed: 521}); haptic(m, LEAD + 0.095, 'medium', {f: 190, seed: 523}); return m; },
  },
  {
    name: 'haptic-warning', dur: 0.3, rel: -18, vol: 0.5, room: null, top: 12000, family: 'haptic', fresh: true,
    use: 'warning: three even taps. A deadline comes close, a reminder fires, a countdown enters its last days',
    sync: 'taps at 3, 98 and 193 ms: at = the frame the warning appears',
    make() {
      const m = new Mix(this.dur);
      [[0, 1], [0.095, 0.78], [0.19, 0.9]].forEach(([dt, l], k) => haptic(m, LEAD + dt, 'medium', {f: 176 * (1 - 0.01 * k), level: l, seed: 531 + 3 * k}));
      return m;
    },
  },
  {
    name: 'haptic-error', dur: 0.28, rel: -17, vol: 0.5, room: null, top: 12000, family: 'haptic', fresh: true,
    use: 'error: four fast, rough taps. Something costs the viewer: a wrong price, a missed date, a red number (only with a red event)',
    sync: 'taps at 3, 61, 119 and 177 ms: at = the frame the red value appears',
    make() {
      const m = new Mix(this.dur);
      [0.9, 1, 0.84, 0.94].forEach((l, k) => haptic(m, LEAD + 0.058 * k, 'medium', {f: 156, cycles: 2.5, sq: 0.75, q: 2.6, level: l, seed: 541 + 3 * k}));
      return m;
    },
  },
  // ── ui ticks, notch, detent ──
  {
    name: 'ui-tick', dur: 0.05, rel: -22, vol: 0.5, room: null, top: 12000, family: 'ui', fresh: true,
    use: 'a dry picker-wheel tick (no glass ring): one step of a list, a digit changing, a row passing under a selector',
    sync: 'onset 3 ms',
    make() { const m = new Mix(this.dur); uiTick(m, LEAD, {seed: 551}); return m; },
  },
  {
    name: 'ui-tick-soft', dur: 0.05, rel: -24, vol: 0.5, room: null, top: 12000, family: 'ui', fresh: true,
    use: 'a softer, lower tick for dense steps: many cells or dots appearing in a row (play one per step with vary())',
    sync: 'onset 3 ms',
    make() { const m = new Mix(this.dur); uiTick(m, LEAD, {soft: 1, seed: 561}); return m; },
  },
  {
    name: 'ui-tick-roll', dur: 0.66, rel: -20, vol: 0.5, room: {db: -28}, top: 12000, family: 'ui', fresh: true,
    use: 'a picker wheel flicked and coming to rest: 9 ticks slowing down, the last one lands with a selection haptic. A value scrolls to its answer',
    sync: 'first tick 3 ms, the last (the landing) at 498 ms: at = landing frame - 15',
    make() {
      const m = new Mix(this.dur), r = rng(571);
      let t = LEAD;
      for (let k = 0; k < 9; k++) {
        const last = k === 8;
        uiTick(m, t, {pitch: 1 + 0.03 * (r() * 2 - 1), level: last ? 1 : 0.62 + 0.25 * (k / 8) + 0.08 * r(), pan: 0.1 * (r() * 2 - 1), seed: 572 + k * 2});
        if (last) haptic(m, t, 'selection', {level: 0.5, click: 0, seed: 590});
        if (!last) t += 0.03 * 1.2 ** k;
      }
      return m;
    },
  },
  {
    name: 'notch', dur: 0.06, rel: -21, vol: 0.5, room: null, top: 12000, family: 'ui', fresh: true,
    use: 'a slider or stepper passing one notch: a value moves one step (a year, a budget, a day). Repeat per step with vary()',
    sync: 'onset 3 ms',
    make() { const m = new Mix(this.dur); notch(m, LEAD, {seed: 601}); return m; },
  },
  {
    name: 'detent', dur: 0.07, rel: -20, vol: 0.5, room: null, top: 12000, family: 'mech', fresh: true,
    use: 'a mechanical detent: one step of a scroll, a crown, a flap board or a dial clicking into place',
    sync: 'a faint pre-tick at 3 ms, the detent lands at 9 ms: at = the frame of the step',
    make() { const m = new Mix(this.dur); detent(m, LEAD, {seed: 611}); return m; },
  },
  {
    name: 'detent-roll', dur: 0.56, rel: -19, vol: 0.5, room: {db: -28}, top: 12000, family: 'mech', fresh: true,
    use: 'a dial or crown turned by hand: 8 detents in half a second, a little uneven. A list or a timeline scrolls a few steps',
    sync: 'first detent lands 9 ms, the last at about 460 ms',
    make() {
      const m = new Mix(this.dur), r = rng(621);
      let t = LEAD;
      for (let k = 0; k < 8; k++) {
        detent(m, t, {pitch: 1 + 0.025 * (r() * 2 - 1), level: 0.75 + 0.25 * r(), pan: -0.12 + 0.24 * (k / 7), seed: 622 + k * 3});
        t += 0.058 + 0.012 * (r() * 2 - 1) + (k > 4 ? 0.006 * (k - 4) : 0);
      }
      return m;
    },
  },
  // ── reveal and confirmation ──
  {
    name: 'whoomp', dur: 0.8, rel: -15, vol: 0.5, room: {rt60: 0.42, db: -24}, top: 11000, tailFade: 0.15, family: 'air', fresh: true,
    use: 'a subtle low push of air for a big reveal: the whole frame changes, the hero number or model arrives. Felt more than heard; not a whoosh, no sweep',
    sync: 'onset 3 ms, the push peaks about 30 ms in: at = the reveal frame',
    make() {
      const m = new Mix(this.dur), len = n(0.72), a = n(0.016);
      // the push: a soft membrane at 60 Hz that starts 13 % higher and settles in 40 ms (a kick
      // drum's physics, much softer), gone in about 0.25 s so it stays a push and never becomes
      // asmr-sub's tone, with its felt overtone so a phone speaker hears it too
      const x = new Float64Array(len);
      let ph = 0;
      for (let i = 0; i < len; i++) {
        const t = i / SR;
        ph += (TAU * 60 * (1 + 0.13 * Math.exp(-t / 0.04))) / SR;
        x[i] = Math.sin(ph) * (i < a ? halfCos(i, a) : 1) * Math.exp(-Math.max(0, i - a) / SR / 0.07);
      }
      m.add(x, LEAD, 1);
      m.add(body(157, 0.3, {tau: 0.045, shape: FELT, attack: 0.01, glide: 0.008}), LEAD, 0.24);
      // the air it moves: a warm, wide band that blooms in 22 ms and falls away
      const [pa, pb] = pairOf(pink, len, 631, 0.6), e = env(len, 0.022, 0.1);
      const air = (p) => unit(filt(filt(filt(p, 'lp', 850, 0.6), 'lp', 850, 0.6), 'hp', 110, 0.6)).map((v, i) => v * e[i]);
      m.addLR(air(pa), air(pb), LEAD, 0.45);
      const [ha, hb] = breath(0.3, {seed: 635, peakAt: 0.028, fall: 0.06, corr: 0.6, bright: 0.6});
      m.addLR(ha, hb, LEAD, 0.35);
      return m;
    },
  },
  {
    name: 'shimmer', dur: 0.7, rel: -25, vol: 0.5, room: {rt60: 0.5, db: -22}, top: 14000, tailFade: 0.12, family: 'tone', fresh: true,
    use: 'a gentle high shimmer for a green check or a good result: three very quiet inharmonic partials that glint and fade together, no melody, no chime',
    sync: 'onset 3 ms, the partials bloom by 15-30 ms and are gone by 600 ms: at = the frame the check lands',
    make() {
      const m = new Mix(this.dur), len = n(0.64);
      [[4180, 0, 0.19, 1, -0.22], [6070, 0.009, 0.15, 0.62, 0.12], [7930, 0.017, 0.11, 0.42, 0.28]].forEach(([f, dt, tau, amp, pan], k) => {
        const r = rng(641 + k), life = wander(len, 11 + 3 * k, r), x = new Float64Array(len), at = n(0.012);
        let ph = r() * TAU;
        for (let i = 0; i < len; i++) {
          ph += (TAU * f * (1 + 0.0012 * life[i])) / SR;
          x[i] = Math.sin(ph) * (i < at ? halfCos(i, at) : 1) * Math.exp(-Math.max(0, i - at) / SR / tau) * (1 + 0.28 * life[i]);
        }
        m.add(x, LEAD + dt, amp, pan);
      });
      // a little dust: sparse fine grains high up that thin out with the partials
      const dust = (seed) => svf(grains(len, (i) => 250 * Math.exp(-i / SR / 0.14), () => 1, rng(seed)), () => 7200, 0.7);
      m.addLR(dust(650), dust(651), LEAD, 0.05);
      return m;
    },
  },
  {
    name: 'room', dur: 12, loop: 10, rel: -38, vol: 0.5,
    use: 'a 10 s seamless loop of very quiet room tone: under the whole video, so the silences between sounds are never digital',
    sync: 'loop it: <Audio loop>; 10.000 s = 300 frames exactly. Fade it in and out with the volume callback',
    make() {
      const len = n(this.dur);
      const bed = (seed) => {
        const r = rng(seed);
        const low = unit(filt(filt(brown(len, r), 'lp', 140, 0.6), 'hp', 28, 0.7));
        const mid = unit(filt(filt(pink(len, r), 'lp', 2400, 0.5), 'hp', 180, 0.5));
        const air = unit(filt(filt(white(len, r), 'hp', 5500, 0.6), 'lp', 12000, 0.6));
        const br = wander(len, 0.18, r);
        return Float64Array.from({length: len}, (_, i) => 0.5 * low[i] + mid[i] * (1 + 0.15 * br[i]) + 0.2 * air[i]);
      };
      const c = bed(261), l = bed(262), r = bed(263);
      const m = new Mix(this.dur);
      m.addLR(c.map((v, i) => 0.55 * v + 0.835 * l[i]), c.map((v, i) => 0.55 * v + 0.835 * r[i]), 0);
      return m;
    },
  },
];

// ── analysis ─────────────────────────────────────────────────────────────────────────────────
const fft = (re, im) => {
  const N = re.length;
  for (let i = 1, j = 0; i < N; i++) {
    let bit = N >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) { [re[i], re[j]] = [re[j], re[i]]; [im[i], im[j]] = [im[j], im[i]]; }
  }
  for (let size = 2; size <= N; size <<= 1) {
    const h = size >> 1, ang = -TAU / size;
    for (let k = 0; k < h; k++) {
      const wr = Math.cos(ang * k), wi = Math.sin(ang * k);
      for (let i = k; i < N; i += size) {
        const j = i + h, tr = re[j] * wr - im[j] * wi, ti = re[j] * wi + im[j] * wr;
        re[j] = re[i] - tr; im[j] = im[i] - ti; re[i] += tr; im[i] += ti;
      }
    }
  }
};

// BS.1770 K-weighting, designed for any rate (the voice is 24 kHz)
const kweight = (x, sr) => biquad(biquad(x, coefs('highshelf', 1681.97, 0.70718, 3.99984, sr)), coefs('hp', 38.1355, 0.50033, 0, sr));
const loudness = (chs, sr) => {
  const k = chs.map((x) => kweight(x, sr)), len = chs[0].length;
  const blocks = (win, hop) => {
    const w = Math.round(win * sr), h = Math.round(hop * sr), out = [];
    for (let s = 0; s < Math.max(1, len - Math.round(0.01 * sr)); s += h) {
      let e = 0;
      for (const y of k) for (let i = s; i < Math.min(len, s + w); i++) e += y[i] * y[i];
      out.push(e / w);
      if (s + w >= len) break;
    }
    return out;
  };
  const L = (ms) => -0.691 + 10 * Math.log10(Math.max(1e-20, ms));
  const fast = Math.max(...blocks(0.1, 0.005).map(L));
  const mom = blocks(0.4, 0.1);
  const g1 = mom.filter((b) => L(b) > -70);
  const rel = L(g1.reduce((a, b) => a + b, 0) / Math.max(1, g1.length)) - 10;
  const g2 = g1.filter((b) => L(b) > rel);
  const integrated = g2.length ? L(g2.reduce((a, b) => a + b, 0) / g2.length) : -Infinity;
  return {fast, momentary: Math.max(...mom.map(L)), integrated};
};

// 4x oversampled peak (windowed sinc), the peak a DAC or an AAC encoder will actually see
const truePeak = (x) => {
  const taps = 16, ph = [0.25, 0.5, 0.75].map((fr) => {
    const c = [];
    for (let k = -taps + 1; k <= taps; k++) { const t = k - fr, w = 0.5 + 0.5 * Math.cos((Math.PI * t) / (taps + 1)); c.push(t === 0 ? 1 : (Math.sin(Math.PI * t) / (Math.PI * t)) * w); }
    return c;
  });
  let m = 0;
  for (let i = 0; i < x.length; i++) {
    m = Math.max(m, Math.abs(x[i]));
    for (const c of ph) {
      let s = 0;
      for (let k = 0; k < c.length; k++) { const j = i + k - taps + 1; if (j >= 0 && j < x.length) s += x[j] * c[k]; }
      m = Math.max(m, Math.abs(s));
    }
  }
  return m;
};

const analyse = (chs, sr) => {
  const len = chs[0].length, mid = Float64Array.from({length: len}, (_, i) => chs.reduce((s, c) => s + c[i], 0) / chs.length);
  let peak = 0, e = 0;
  for (const c of chs) for (const v of c) { peak = Math.max(peak, Math.abs(v)); e += v * v; }
  const rms = Math.sqrt(e / (len * chs.length));
  const tp = Math.max(...chs.map(truePeak));
  const dc = Math.max(...chs.map((c) => Math.abs(c.reduce((a, v) => a + v, 0) / len)));
  // spectral centroid: per 2048-sample Hann frame, magnitude-weighted, then averaged over the frames
  // within 40 dB of the loudest one, weighted by frame energy (silent frames carry no colour)
  // frames are centred (F/2 of silence padded at both ends), so the attack at 3 ms gets a whole frame
  const F = 2048, hop = 256, frames = [];
  for (let s = -F / 2; s < len - F / 2; s += hop) {
    const re = new Float64Array(F), im = new Float64Array(F);
    let fe = 0;
    for (let i = 0; i < F; i++) { const j = s + i, v = (j >= 0 && j < len ? mid[j] : 0) * (0.5 - 0.5 * Math.cos((TAU * i) / F)); re[i] = v; fe += v * v; }
    fft(re, im);
    let num = 0, den = 0, hi = 0, all = 0;
    for (let b = 1; b < F / 2; b++) {
      const f = (b * sr) / F, mag = Math.hypot(re[b], im[b]);
      if (f < 20 || f > 20000) continue;
      num += f * mag; den += mag; all += mag * mag; if (f >= 6000) hi += mag * mag;
    }
    frames.push({fe, c: den ? num / den : 0, hi, all});
  }
  const top = Math.max(...frames.map((f) => f.fe)), live = frames.filter((f) => f.fe > top * 1e-4);
  const w = live.reduce((a, f) => a + f.fe, 0) || 1;
  const centroid = live.reduce((a, f) => a + f.c * f.fe, 0) / w;
  const hf = (100 * live.reduce((a, f) => a + f.hi, 0)) / (live.reduce((a, f) => a + f.all, 0) || 1);
  const onset = mid.findIndex((v) => Math.abs(v) > peak * 0.03);
  const w10 = Math.round(0.01 * sr);
  let best = -1, peakAt = 0;
  for (let s = 0; s + w10 <= len; s += Math.round(w10 / 4)) {
    let e2 = 0;
    for (let i = s; i < s + w10; i++) e2 += mid[i] * mid[i];
    if (e2 > best) { best = e2; peakAt = s + w10 / 2; }
  }
  const pre = n(0.003), tw = n(0.02);
  const tail = Math.sqrt(mid.slice(Math.max(0, len - pre - tw), len - pre).reduce((a, v) => a + v * v, 0) / tw);
  let corr = 1;
  if (chs.length === 2) {
    let lr = 0, ll = 0, rr = 0;
    for (let i = 0; i < len; i++) { lr += chs[0][i] * chs[1][i]; ll += chs[0][i] ** 2; rr += chs[1][i] ** 2; }
    corr = lr / (Math.sqrt(ll * rr) || 1);
  }
  const edge = Math.max(...chs.map((c) => Math.max(Math.abs(c[0]), Math.abs(c[len - 1]))));
  return {dur: len / sr, peakAt: (peakAt * 1000) / sr, peak: db(peak), tp: db(tp), rms: db(rms), crest: db(peak) - db(rms), dc, centroid, hf, onset: (onset * 1000) / sr, tail: db(tail) - db(peak), corr, edge, ...loudness(chs, sr)};
};

// The loop's seam must look like any other point of the loop. The loop is rotated by half, so the
// seam sits in the middle on a window boundary, and filtered as a circle (two copies back to back,
// the second kept), so no filter state starts at the seam. Then the seam is ranked among every
// other point of the loop:
//  step: |sample after - sample before| at the seam, as a percentile of all sample steps
//  level: the level change between the 10 ms before and the 10 ms after the seam, as a percentile of
//         the changes between all neighbouring 10 ms windows, raw and above 200 Hz (a 10 ms window
//         of rumble holds one cycle, so the raw level swings a lot by itself)
// A seamless loop ranks anywhere; a seam that ranks above 99 % in any test fails.
const seam = (chs, sr) => {
  const w = Math.round(0.01 * sr);
  return chs.map((c) => {
    const len = c.length, h = Math.floor(len / 2 / w) * w;
    const rot = Float64Array.from({length: len}, (_, i) => c[(i + len - h) % len]); // seam now between h-1 and h
    const circ = (x) => { const two = new Float64Array(2 * len); two.set(x); two.set(x, len); return biquad(two, coefs('hp', 200, 0.7, 0, sr)).slice(len); };
    const pct = (arr, v) => (100 * arr.filter((x) => x < v).length) / arr.length;
    const steps = [];
    for (let i = 1; i < len; i++) steps.push(Math.abs(rot[i] - rot[i - 1]));
    const levelRank = (x) => {
      const lv = [];
      for (let s = h % w; s + w <= len; s += w) lv.push(db(rmsOf(x.slice(s, s + w))));
      const diffs = lv.slice(1).map((v, i) => Math.abs(v - lv[i]));
      const k = (h - (h % w)) / w; // window k starts at the seam
      return {d: diffs[k - 1], rank: pct(diffs, diffs[k - 1])};
    };
    const raw = levelRank(rot), hi = levelRank(circ(rot));
    return {step: pct(steps, steps[h - 1]), raw, hi, head: db(rmsOf(c.slice(0, w))), tail: db(rmsOf(c.slice(len - w)))};
  });
};

// ── WAV ──────────────────────────────────────────────────────────────────────────────────────
const writeWav = (file, L, R, seed) => {
  const len = L.length, b = Buffer.alloc(44 + len * 4), r = rng(seed), f = n(FADE);
  b.write('RIFF', 0); b.writeUInt32LE(36 + len * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(len * 4, 40);
  const q = (v, i) => {
    // TPDF dither of one LSB keeps the quiet tails from turning into quantisation grit; it is
    // faded with the sound, so the first and last samples are exactly zero
    const edge = Math.min(1, i / f, (len - 1 - i) / f);
    return clamp(Math.round(v * 32767 + (r() - r()) * edge), -32768, 32767);
  };
  for (let i = 0; i < len; i++) { b.writeInt16LE(q(L[i], i), 44 + i * 4); b.writeInt16LE(q(R[i], i), 46 + i * 4); }
  fs.writeFileSync(file, b);
};
const writeLoopWav = (file, L, R, seed) => {
  const len = L.length, b = Buffer.alloc(44 + len * 4), r = rng(seed);
  b.write('RIFF', 0); b.writeUInt32LE(36 + len * 4, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(2, 22); b.writeUInt32LE(SR, 24); b.writeUInt32LE(SR * 4, 28);
  b.writeUInt16LE(4, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(len * 4, 40);
  for (let i = 0; i < len; i++) {
    b.writeInt16LE(clamp(Math.round(L[i] * 32767 + (r() - r())), -32768, 32767), 44 + i * 4);
    b.writeInt16LE(clamp(Math.round(R[i] * 32767 + (r() - r())), -32768, 32767), 46 + i * 4);
  }
  fs.writeFileSync(file, b);
};
const readWav = (file) => {
  const b = fs.readFileSync(file);
  if (b.toString('ascii', 0, 4) !== 'RIFF' || b.toString('ascii', 8, 12) !== 'WAVE') throw new Error(`${file}: not a WAV`);
  let p = 12, ch = 0, sr = 0, bits = 0, fmt = 0, data = null;
  while (p + 8 <= b.length) {
    const id = b.toString('ascii', p, p + 4), size = b.readUInt32LE(p + 4);
    if (id === 'fmt ') { fmt = b.readUInt16LE(p + 8); ch = b.readUInt16LE(p + 10); sr = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
    if (id === 'data') data = b.subarray(p + 8, p + 8 + Math.min(size, b.length - p - 8));
    p += 8 + size + (size & 1);
  }
  if (!data || (fmt !== 1 && fmt !== 65534) || bits !== 16) throw new Error(`${file}: only 16-bit PCM is read here (fmt ${fmt}, ${bits} bit)`);
  const frames = Math.floor(data.length / (2 * ch)), chs = Array.from({length: ch}, () => new Float64Array(frames));
  for (let i = 0; i < frames; i++) for (let c = 0; c < ch; c++) chs[c][i] = data.readInt16LE((i * ch + c) * 2) / 32768;
  return {chs, sr};
};

// ── the sheet: every sound as a spectrogram, to be looked at ─────────────────────────────────
// Log-frequency 30 Hz..20 kHz (bottom..top, faint lines at 100 Hz, 1 kHz, 10 kHz), 70 dB of range
// under each panel's own maximum, an amplitude strip underneath. Room shows its last and first
// second back to back with the seam in the middle.
// 3x5 capitals, rows top to bottom
const FONT = Object.fromEntries(Object.entries({'A': '.#. #.# ### #.# #.#', 'B': '##. #.# ##. #.# ##.', 'C': '.## #.. #.. #.. .##', 'D': '##. #.# #.# #.# ##.', 'E': '### #.. ##. #.. ###', 'F': '### #.. ##. #.. #..', 'G': '.## #.. #.# #.# .##', 'H': '#.# #.# ### #.# #.#', 'I': '### .#. .#. .#. ###', 'J': '..# ..# ..# #.# .#.', 'K': '#.# #.# ##. #.# #.#', 'L': '#.. #.. #.. #.. ###', 'M': '#.# ### ### #.# #.#', 'N': '##. #.# #.# #.# #.#', 'O': '.#. #.# #.# #.# .#.', 'P': '##. #.# ##. #.. #..', 'Q': '.#. #.# #.# ##. .##', 'R': '##. #.# ##. #.# #.#', 'S': '.## #.. .#. ..# ##.', 'T': '### .#. .#. .#. .#.', 'U': '#.# #.# #.# #.# ###', 'V': '#.# #.# #.# #.# .#.', 'W': '#.# #.# ### ### #.#', 'X': '#.# #.# .#. #.# #.#', 'Y': '#.# #.# .#. .#. .#.', 'Z': '### ..# .#. #.. ###', '0': '### #.# #.# #.# ###', '1': '.#. ##. .#. .#. ###', '2': '##. ..# .#. #.. ###', '3': '##. ..# .#. ..# ##.', '4': '#.# #.# ### ..# ..#', '5': '### #.. ##. ..# ##.', '6': '.## #.. ### #.# ###', '7': '### ..# .#. .#. .#.', '8': '### #.# ### #.# ###', '9': '### #.# ### ..# ##.', '-': '... ... ### ... ...', '.': '... ... ... ... .#.', ' ': '... ... ... ... ...'}).map(([k, v]) => [k, v.replaceAll(' ', '')]));
const crcT = Array.from({length: 256}, (_, k) => { let c = k; for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcT[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const png = async (file, W, H, rgb) => {
  const zlib = await import('node:zlib');
  const raw = Buffer.alloc(H * (W * 3 + 1));
  for (let y = 0; y < H; y++) { raw[y * (W * 3 + 1)] = 0; rgb.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3); }
  const chunk = (t, d) => { const l = Buffer.alloc(4); l.writeUInt32BE(d.length); const td = Buffer.concat([Buffer.from(t), d]); const c = Buffer.alloc(4); c.writeUInt32BE(crc(td)); return Buffer.concat([l, td, c]); };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(W, 0); ih.writeUInt32BE(H, 4); ih[8] = 8; ih[9] = 2;
  fs.writeFileSync(file, Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ih), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
};
const sheet = async (file) => {
  const PW = 420, SH = 150, AH = 26, LH = 16, COLS = 4, GAP = 10;
  const rowsN = Math.ceil(SOUNDS.length / COLS), W = COLS * (PW + GAP) + GAP, H = rowsN * (LH + SH + AH + GAP) + GAP;
  const img = Buffer.alloc(W * H * 3, 12);
  const put = (x, y, [r, g, b]) => { if (x < 0 || y < 0 || x >= W || y >= H) return; const o = (y * W + x) * 3; img[o] = r; img[o + 1] = g; img[o + 2] = b; };
  const text = (x, y, str) => { let cx = x; for (const ch of str.toUpperCase()) { const g = FONT[ch] ?? '.'.repeat(15); for (let r = 0; r < 5; r++) for (let c = 0; c < 3; c++) if (g[r * 3 + c] === '#') for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) put(cx + c * 2 + dx, y + r * 2 + dy, [220, 220, 228]); cx += 8; } };
  const heat = (t) => { t = clamp(t, 0, 1); return [Math.round(255 * clamp(1.6 * t - 0.1, 0, 1)), Math.round(255 * clamp(1.9 * t - 0.8, 0, 1) ** 1.2), Math.round(255 * (clamp(3 * t, 0, 1) * 0.55 * (1 - t) + clamp(2.2 * t - 1.3, 0, 1)))]; };
  for (const [k, s] of SOUNDS.entries()) {
    if (!fs.existsSync(fileOf(s))) continue;
    const {chs} = readWav(fileOf(s));
    let mid = Float64Array.from(chs[0], (v, i) => 0.5 * (v + chs[1][i]));
    if (s.loop) { const q = SR; mid = Float64Array.from({length: 2 * q}, (_, i) => (i < q ? mid[mid.length - q + i] : mid[i - q])); }
    const x0 = GAP + (k % COLS) * (PW + GAP), y0 = GAP + Math.floor(k / COLS) * (LH + SH + AH + GAP);
    text(x0, y0 + 2, `${s.name} ${(s.loop ? 2 : mid.length / SR).toFixed(2)}s${s.loop ? ' seam' : ''}`);
    const F = 1024, cols = [];
    let top = -Infinity;
    for (let c = 0; c < PW; c++) {
      const centre = Math.round(((c + 0.5) / PW) * mid.length), re = new Float64Array(F), im = new Float64Array(F);
      for (let i = 0; i < F; i++) { const j = centre - F / 2 + i; re[i] = (j >= 0 && j < mid.length ? mid[j] : 0) * (0.5 - 0.5 * Math.cos((TAU * i) / F)); }
      fft(re, im);
      const col = new Float64Array(SH);
      for (let y = 0; y < SH; y++) {
        const f = 30 * (20000 / 30) ** (y / (SH - 1)), f2 = 30 * (20000 / 30) ** ((y + 1) / (SH - 1));
        const b1 = Math.max(1, Math.floor((f * F) / SR)), b2 = Math.max(b1, Math.ceil((f2 * F) / SR));
        let e = 0;
        for (let b = b1; b <= Math.min(F / 2 - 1, b2); b++) e = Math.max(e, re[b] * re[b] + im[b] * im[b]);
        col[y] = 10 * Math.log10(e + 1e-20);
        top = Math.max(top, col[y]);
      }
      let a = 0;
      const lo = Math.floor((c / PW) * mid.length), hi = Math.floor(((c + 1) / PW) * mid.length);
      for (let i = lo; i < Math.max(lo + 1, hi); i++) a = Math.max(a, Math.abs(mid[i] ?? 0));
      cols.push({col, a});
    }
    const amax = Math.max(...cols.map((c) => c.a)) || 1;
    cols.forEach(({col, a}, c) => {
      for (let y = 0; y < SH; y++) put(x0 + c, y0 + LH + SH - 1 - y, heat((col[y] - top + 70) / 70));
      const h = Math.round((a / amax) * (AH - 4));
      for (let y = 0; y < h; y++) put(x0 + c, y0 + LH + SH + AH - 2 - y, [150, 150, 160]);
    });
    for (const f of [100, 1000, 10000]) { const y = Math.round((Math.log(f / 30) / Math.log(20000 / 30)) * (SH - 1)); for (let c = 0; c < PW; c += 3) put(x0 + c, y0 + LH + SH - 1 - y, [70, 70, 80]); }
    if (s.loop) for (let y = 0; y < SH; y += 2) put(x0 + PW / 2, y0 + LH + y, [90, 90, 100]);
  }
  fs.mkdirSync(path.dirname(file), {recursive: true});
  await png(file, W, H, img);
  console.log(`sheet: ${file} (${W}x${H})`);
};

// ── main ─────────────────────────────────────────────────────────────────────────────────────
const fileOf = (s) => path.join(SFX, `asmr-${s.name}.wav`);
const MANIFEST = path.join(SFX, 'asmr.json');

// The families of the sounds made before 2026-09-24 (new sounds carry their own `family`).
const FAMILY_OF = {
  'key': 'ui', 'key-roll': 'ui', 'tap': 'ui', 'double-tap': 'ui', 'pop': 'ui', 'screen': 'ui', 'notif': 'ui',
  'tick-fine': 'mech', 'count-roll': 'mech', 'count-roll-long': 'mech', 'flap': 'mech', 'flap-roll': 'mech', 'camera': 'mech',
  'land': 'impact', 'knock': 'impact', 'sub': 'impact', 'end': 'impact',
  'pencil': 'paper', 'pencil-short': 'paper', 'pencil-long': 'paper', 'paper': 'paper', 'paper-tear': 'paper', 'check': 'paper', 'strike': 'paper',
  'air': 'air', 'air-long': 'air', 'swell': 'air', 'slide': 'surface', 'room': 'room',
};
const familyOf = (s) => s.family ?? FAMILY_OF[s.name] ?? 'ui';

// A phone's own speaker plays almost nothing under 400 Hz. `spk` is how much of the loudest 100 ms
// survives a 400 Hz 4th-order high-pass, in dB: 0 = all of it, -20 = a haptic you only hear on earbuds.
const phoneLoss = (chs, sr) => {
  const hp = chs.map((c) => biquad(biquad(c, coefs('hp', 400, 0.5412, 0, sr)), coefs('hp', 400, 1.3066, 0, sr)));
  return loudness(hp, sr).fast - loudness(chs, sr).fast;
};

// asmr.json holds every sound a spec can name: the asmr- kit from SOUNDS and the recorded cc0-
// sounds that tools/sfx-import.mjs adds. Each tool rewrites only its own entries.
const readManifest = () => { try { return JSON.parse(fs.readFileSync(MANIFEST, 'utf8')); } catch { return []; } };
const writeManifest = (own, isOwn) => {
  const keep = readManifest().filter((e) => !isOwn(e.name));
  fs.writeFileSync(MANIFEST, JSON.stringify([...own, ...keep], null, 2) + '\n');
};

// The audition: every sound of the list once, at its mix balance, with a gap (a longer one between
// families), no voice. `index` is written next to it as text: number, start time, name, family, use.
const audition = (items, wavPath) => {
  const gap = n(1.0), famGap = n(2.2), lines = [], parts = [];
  let o = n(0.8), last = null;
  for (const it of items) {
    if (last && it.family !== last) o += famGap - gap;
    const {chs} = readWav(it.file);
    const [l, r] = chs.length === 2 ? chs : [chs[0], chs[0]];
    const g = (it.vol / 0.5) * (it.trim ?? 1);
    parts.push({o, l: l.map((v) => v * g), r: r.map((v) => v * g)});
    const t = o / SR;
    lines.push(`${String(lines.length + 1).padStart(2)}  ${String(Math.floor(t / 60))}:${(t % 60).toFixed(1).padStart(4, '0')}  ${it.name.padEnd(24)} ${it.family.padEnd(8)} ${it.use}`);
    o += l.length + gap;
    last = it.family;
  }
  const total = o + n(0.5), L = new Float64Array(total), R = new Float64Array(total);
  for (const p of parts) { L.set(p.l, p.o); R.set(p.r, p.o); }
  // one gain for the whole reel (loudest peak at -6 dBFS): audible on its own, the balance untouched
  let top = 1e-9;
  for (let i = 0; i < total; i++) top = Math.max(top, Math.abs(L[i]), Math.abs(R[i]));
  const k = 10 ** (-6 / 20) / top;
  for (let i = 0; i < total; i++) { L[i] *= k; R[i] *= k; }
  fs.mkdirSync(path.dirname(wavPath), {recursive: true});
  writeLoopWav(wavPath, L, R, 2);
  const txt = wavPath.replace(/\.wav$/, '.txt');
  fs.writeFileSync(txt, [
    `Vinari sound audition (${path.basename(wavPath)}, ${(total / SR).toFixed(1)} s, no voice).`,
    'Each sound plays once at its balance in a film (suggestedVolume against the voice), 1 s apart, 2.2 s between families.',
    'The whole file is raised so the loudest peak is -6 dBFS: the quiet ones (haptic-selection, shimmer) are meant to be quiet.',
    'Haptics live at 120-260 Hz: listen on earbuds or headphones; a phone speaker plays only their click.',
    '',
    ' #  time    name                     family   use',
    ...lines, '',
  ].join('\n'));
  console.log(`audition: ${path.relative(ROOT, wavPath)} (${(total / SR).toFixed(1)} s, ${items.length} sounds), index ${path.relative(ROOT, txt)}`);
};

// The sounds added on 2026-09-24: the fresh asmr- ones, then every recorded cc0- one in asmr.json.
const runAudition = (wavPath) => {
  const ORDER = ['haptic', 'ui', 'mech', 'air', 'tone', 'paper', 'cloth', 'surface', 'impact'];
  const cc0 = readManifest().filter((e) => e.name.startsWith('cc0-') && fs.existsSync(path.join(ROOT, 'public', e.file)))
    .map((e) => ({name: e.name, file: path.join(ROOT, 'public', e.file), family: e.family, vol: e.suggestedVolume, use: e.use}))
    .sort((a, b) => ORDER.indexOf(a.family) - ORDER.indexOf(b.family));
  audition([
    // asmr- files get +3 dB in the film (common.tsx ASMR_TRIM); cc0- files carry it already
    ...SOUNDS.filter((s) => s.fresh).map((s) => ({name: `asmr-${s.name}`, file: fileOf(s), family: familyOf(s), vol: s.vol, trim: 1.41, use: s.use})),
    ...cc0,
  ], wavPath);
};

const main = async () => {
  const args = process.argv.slice(2);
  const flag = (f) => args.includes(f);
  const argAfter = (f, def) => { const i = args.indexOf(f); return i >= 0 && args[i + 1] && !args[i + 1].startsWith('--') ? path.resolve(args[i + 1]) : def; };

  if (flag('--measure')) {
    for (const f of args.filter((a) => !a.startsWith('--'))) {
      const {chs, sr} = readWav(f), a = analyse(chs, sr);
      console.log(`${path.basename(f)}  ${chs.length}ch ${sr} Hz  ${a.dur.toFixed(3)} s  peak ${a.peak.toFixed(1)} dBFS  rms ${a.rms.toFixed(1)}  ` +
        `integrated ${a.integrated.toFixed(1)} LUFS  momentary max ${a.momentary.toFixed(1)}  100 ms max ${a.fast.toFixed(1)}  centroid ${a.centroid.toFixed(0)} Hz`);
    }
    return 0;
  }
  if (flag('--audition-only')) { runAudition(argAfter('--audition-only', path.join(ROOT, 'out', 'sfx-audition.wav'))); return 0; }

  fs.mkdirSync(SFX, {recursive: true});
  const only = args.filter((a) => !a.startsWith('--') && SOUNDS.some((s) => s.name === a));
  const fresh = flag('--fresh'); // render only the sounds added on 2026-09-24

  if (!flag('--check')) {
    for (const [k, s] of SOUNDS.entries()) {
      if (only.length && !only.includes(s.name)) continue;
      if (fresh && !s.fresh) continue;
      const t0 = Date.now();
      const {L, R} = finish(s.make(), s);
      // level: the loudest 100 ms at suggestedVolume sits `rel` LU from the voice
      const now = loudness([L, R], SR).fast;
      const g = 10 ** ((VOICE_LUFS + s.rel - 20 * Math.log10(s.vol) - now) / 20);
      const l = L.map((v) => v * g), r = R.map((v) => v * g);
      (s.loop ? writeLoopWav : writeWav)(fileOf(s), l, r, 7000 + k);
      process.stderr.write(`  ${s.name.padEnd(18)} ${String(Date.now() - t0).padStart(5)} ms\n`);
    }
  }

  // report + asmr.json, always from the files on disk
  const rows = [], manifest = [];
  let failed = 0;
  for (const s of SOUNDS) {
    if (!fs.existsSync(fileOf(s))) { console.log(`missing ${fileOf(s)}`); failed++; continue; }
    const {chs, sr} = readWav(fileOf(s)), a = analyse(chs, sr);
    const problems = [];
    if (sr !== 48000 || chs.length !== 2) problems.push('format');
    if (a.tp > -3) problems.push('peak');
    if (a.dc > 1e-4) problems.push('dc');
    if (!s.loop && a.edge > 0) problems.push('edge');
    if (!s.loop && a.tail > -45) problems.push('tail');
    let loopNote = '';
    if (s.loop) {
      const sm = seam(chs, sr);
      loopNote = sm.map((x, c) => `${'LR'[c]}: first 10 ms ${x.head.toFixed(1)} dBFS, last 10 ms ${x.tail.toFixed(1)} dBFS. Seam ranks among all points of the loop: ` +
        `sample step ${x.step.toFixed(1)} %, level change ${x.raw.d.toFixed(1)} dB = ${x.raw.rank.toFixed(1)} %, above 200 Hz ${x.hi.d.toFixed(1)} dB = ${x.hi.rank.toFixed(1)} %`).join('\n      ');
      if (sm.some((x) => x.step > 99 || x.raw.rank > 99 || x.hi.rank > 99)) problems.push('seam');
    }
    if (problems.length) failed++;
    const spk = s.loop ? 0 : phoneLoss(chs, sr);
    rows.push({s, a, problems, loopNote, spk});
    manifest.push({
      name: `asmr-${s.name}`,
      file: `sfx/asmr-${s.name}.wav`,
      family: familyOf(s),
      durationSec: +a.dur.toFixed(3),
      use: s.use,
      suggestedVolume: s.vol,
      sync: s.sync,
      ...(s.loop ? {loop: true} : {}),
      peakDbfs: +a.peak.toFixed(1),
      centroidHz: Math.round(a.centroid),
      loudnessVsVoiceLU: +(a.fast + 20 * Math.log10(s.vol) - VOICE_LUFS).toFixed(1),
      ...(s.loop ? {} : {phoneSpeakerDb: +spk.toFixed(1)}),
    });
  }
  writeManifest(manifest, (name) => name.startsWith('asmr-'));

  const pad = (v, w) => String(v).padStart(w);
  const show = rows.filter(({s}) => !fresh || s.fresh);
  console.log(`\nVinari ASMR kit: ${rows.length} sounds${fresh ? ` (showing the ${show.length} added 2026-09-24)` : ''}, 48 kHz 16-bit stereo, voice reference ${VOICE_LUFS} LUFS\n`);
  console.log('sound               family  dur s  onset  loud  peak  tpeak    rms  crest  100ms@vol  centroid  >6k   spk   L/R     DC      tail  edges');
  console.log('                                     ms  at ms  dBFS   dBFS   dBFS    dB   LU vs VO       Hz     %    dB  corr               dB');
  for (const {s, a, problems, loopNote, spk} of show) {
    const atVol = a.fast + 20 * Math.log10(s.vol) - VOICE_LUFS;
    console.log(
      `${s.name.padEnd(19)}${familyOf(s).padStart(7)}${pad(a.dur.toFixed(3), 7)}${pad(a.onset.toFixed(1), 7)}${pad(a.peakAt.toFixed(0), 6)}${pad(a.peak.toFixed(1), 6)}${pad(a.tp.toFixed(1), 7)}${pad(a.rms.toFixed(1), 7)}` +
      `${pad(a.crest.toFixed(1), 7)}${pad(atVol.toFixed(1), 11)}${pad(a.centroid.toFixed(0), 10)}${pad(a.hf.toFixed(1), 6)}${pad(s.loop ? '-' : spk.toFixed(1), 6)}${pad(a.corr.toFixed(2), 6)}` +
      `${pad(a.dc.toExponential(0), 8)}${pad(s.loop ? 'loop' : a.tail.toFixed(0), 8)}${pad(s.loop ? 'loop' : a.edge === 0 ? '0/0' : a.edge.toFixed(5), 7)}` +
      (problems.length ? `   FAIL: ${problems.join(', ')}` : ''),
    );
    if (loopNote) console.log(`      ${loopNote}`);
  }
  console.log(`\n${failed ? `${failed} sound(s) failed a check` : 'all checks pass'}: true peak <= -3 dBFS, |DC| < 1e-4, first/last sample 0 (3 ms half-cosine fades), tail < -45 dB before the fade, loop seam continuous`);
  console.log(`wrote ${path.relative(ROOT, MANIFEST)}`);

  if (flag('--reel')) {
    // every sound in a row, in the balance it has in a video at its suggestedVolume, 0.6 s apart
    const reelPath = argAfter('--reel', path.join(ROOT, 'out', 'asmr-reel.wav'));
    const gap = n(0.6), parts = [];
    for (const s of SOUNDS) {
      if (s.loop) continue;
      const {chs} = readWav(fileOf(s));
      parts.push(chs.map((c) => c.map((v) => (v * s.vol) / 0.5)));
    }
    const total = parts.reduce((a, p) => a + p[0].length + gap, gap);
    const L = new Float64Array(total), R = new Float64Array(total);
    let o = gap;
    for (const p of parts) { L.set(p[0], o); R.set(p[1], o); o += p[0].length + gap; }
    let top = 1e-9;
    for (let i = 0; i < total; i++) top = Math.max(top, Math.abs(L[i]), Math.abs(R[i]));
    const k = 10 ** (-6 / 20) / top;
    for (let i = 0; i < total; i++) { L[i] *= k; R[i] *= k; }
    fs.mkdirSync(path.dirname(reelPath), {recursive: true});
    writeLoopWav(reelPath, L, R, 1);
    console.log(`reel: ${reelPath} (${(total / SR).toFixed(1)} s)`);
  }
  if (flag('--audition')) runAudition(argAfter('--audition', path.join(ROOT, 'out', 'sfx-audition.wav')));
  if (flag('--sheet')) await sheet(argAfter('--sheet', path.join(ROOT, 'out', 'asmr-sheet.png')));
  return failed ? 1 : 0;
};

// tools/sfx-import.mjs reuses the reader, writer, analysis and the voice reference
export {SR, LEAD, FADE, VOICE_LUFS, readWav, writeWav, analyse, loudness, truePeak, filt, biquad, coefs, rng, phoneLoss, readManifest, writeManifest, MANIFEST};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) process.exit(await main());
