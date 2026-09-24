// Royalty-free by construction: a quiet "data news" music bed synthesised from scratch.
//   node tools/music.mjs [name] [bpm] [seconds]   -> public/music/<name>.m4a
// Sub pulse on every beat, a soft detuned pad (Am9 / Fmaj7 / Cmaj7 / G6) that breathes
// against the pulse, a sparse plucked arpeggio and off-beat noise ticks. No samples used.
import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const name = process.argv[2] ?? 'bed-pulse';
const bpm = Number(process.argv[3] ?? 100);
const secs = Number(process.argv[4] ?? 64);
const R = 48000;
const N = Math.round(secs * R);
const L = new Float32Array(N);
const Rt = new Float32Array(N);
const beat = 60 / bpm;
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

let seed = 7;
const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647) * 2 - 1;

// chords as MIDI notes, one per 2 bars (8 beats)
const chords = [
  [45, 57, 60, 64, 67, 71], // Am9
  [41, 53, 57, 60, 64, 69], // Fmaj7(9)
  [48, 55, 59, 62, 64, 67], // Cmaj7
  [43, 55, 59, 62, 64, 66], // G6-ish
];
const chordLen = 8 * beat;

// pad: sine + soft 2nd/3rd harmonics, detuned L/R, slow attack, ducked after each pulse
for (let c = 0; c * chordLen < secs; c++) {
  const notes = chords[c % chords.length];
  const t0 = c * chordLen;
  for (const m of notes.slice(1)) {
    const f = hz(m);
    const s0 = Math.floor(t0 * R);
    const len = Math.floor((chordLen + 1.2) * R);
    for (let i = 0; i < len && s0 + i < N; i++) {
      const t = i / R;
      const env = Math.min(1, t / 1.4) * Math.min(1, Math.max(0, (chordLen + 1.2 - t) / 1.2));
      const ph = 2 * Math.PI * t;
      const voice = (d) => Math.sin(ph * f * d) + 0.18 * Math.sin(ph * f * 2 * d) + 0.06 * Math.sin(ph * f * 3 * d);
      const k = 0.022 * env;
      L[s0 + i] += k * voice(0.9985);
      Rt[s0 + i] += k * voice(1.0015);
    }
  }
}

// sidechain-style breathing on the pad + sub pulse on every beat
for (let i = 0; i < N; i++) {
  const t = i / R;
  const bt = (t % beat) / beat;
  const duck = 0.55 + 0.45 * Math.min(1, bt * 3.2);
  L[i] *= duck;
  Rt[i] *= duck;
}
for (let b = 0; b * beat < secs; b++) {
  const chord = chords[Math.floor((b * beat) / chordLen) % chords.length];
  const f = hz(chord[0] - 12);
  const s0 = Math.floor(b * beat * R);
  let ph = 0;
  for (let i = 0; i < 0.5 * R && s0 + i < N; i++) {
    const t = i / R;
    ph += (2 * Math.PI * (f * (1 + 0.6 * Math.exp(-t / 0.03)))) / R;
    const v = Math.tanh(1.6 * Math.sin(ph)) * Math.exp(-t / 0.2) * 0.2;
    L[s0 + i] += v;
    Rt[s0 + i] += v;
  }
}

// sparse pluck arpeggio: 8ths on bars 2 and 4 of every chord, alternating sides
for (let c = 0; c * chordLen < secs; c++) {
  const notes = chords[c % chords.length];
  for (const bar of [1, 3]) {
    for (let s = 0; s < 8; s++) {
      const m = notes[1 + ((s * 3) % (notes.length - 1))] + 12;
      const f = hz(m);
      const s0 = Math.floor((c * chordLen + bar * 4 * beat + (s * beat) / 2) * R);
      const pan = s % 2 ? 0.7 : 0.3;
      for (let i = 0; i < 0.6 * R && s0 + i < N; i++) {
        const t = i / R;
        const v = (Math.sin(2 * Math.PI * f * t) + 0.3 * Math.sin(4 * Math.PI * f * t) * Math.exp(-t / 0.05)) * Math.exp(-t / 0.16) * 0.03;
        L[s0 + i] += v * (1 - pan);
        Rt[s0 + i] += v * pan;
      }
    }
  }
}

// off-beat ticks: filtered noise bursts
let prev = 0;
for (let b = 0; b * beat < secs; b++) {
  const s0 = Math.floor((b + 0.5) * beat * R);
  for (let i = 0; i < 0.04 * R && s0 + i < N; i++) {
    const n = rnd();
    const v = (n - prev) * 0.5 * Math.exp(-(i / R) / 0.008) * 0.035; // first difference = crude high-pass
    prev = n;
    L[s0 + i] += v * 0.8;
    Rt[s0 + i] += v;
  }
}

// fade in/out, normalise, write 16-bit stereo WAV, encode AAC with macOS afconvert
let peak = 0;
for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(L[i]), Math.abs(Rt[i]));
const g = 0.8 / (peak || 1);
const buf = Buffer.alloc(44 + N * 4);
buf.write('RIFF', 0);
buf.writeUInt32LE(36 + N * 4, 4);
buf.write('WAVEfmt ', 8);
buf.writeUInt32LE(16, 16);
buf.writeUInt16LE(1, 20);
buf.writeUInt16LE(2, 22);
buf.writeUInt32LE(R, 24);
buf.writeUInt32LE(R * 4, 28);
buf.writeUInt16LE(4, 32);
buf.writeUInt16LE(16, 34);
buf.write('data', 36);
buf.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  const t = i / R;
  const fade = Math.min(1, t / 0.4) * Math.min(1, (secs - t) / 2);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, L[i] * g * fade)) * 32767), 44 + i * 4);
  buf.writeInt16LE(Math.round(Math.max(-1, Math.min(1, Rt[i] * g * fade)) * 32767), 46 + i * 4);
}
const dir = path.join(root, 'public', 'music');
fs.mkdirSync(dir, {recursive: true});
const wav = path.join(dir, `${name}.wav`);
fs.writeFileSync(wav, buf);
execFileSync('afconvert', ['-f', 'm4af', '-d', 'aac', '-b', '160000', wav, path.join(dir, `${name}.m4a`)]);
fs.unlinkSync(wav);
console.log(`music: public/music/${name}.m4a (${secs}s, ${bpm} bpm)`);
