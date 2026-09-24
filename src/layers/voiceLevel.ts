import {useEffect, useState} from 'react';
import {continueRender, delayRender, staticFile} from 'remotion';

// The voice's integrated loudness (ITU-R BS.1770: K-weighting, 400 ms blocks, -70 LUFS and -10 LU
// gates) as the film plays it. Remotion puts a mono voice.wav on both channels at equal power (-3 dB
// each), so the film's stereo voice measures the same as the mono file (checked on v10: the rendered
// voice stem -17.18, this meter on voice.wav -17.12, ffmpeg's loudnorm -16.92). The mix
// (scenes/common.tsx setMix) sets the sound kit against this number, so every voiced film keeps
// the same balance whatever the voice's own level (edge-tts about -23 LUFS, Gemini about -17).
// Measured once per browser tab from public/vo/<id>/voice.wav; a render waits for it (delayRender).

const cache = new Map<string, Promise<number>>();
const known = new Map<string, number>();

/** K-weighting biquads for sample rate fs (the BS.1770 pre-filter shelf and RLB high-pass). */
const kFilters = (fs: number) => {
  const shelf = (() => {
    const G = 3.99984385397;
    const Q = 0.7071752369554193;
    const fc = 1681.9744509555319;
    const A = 10 ** (G / 40);
    const w0 = (2 * Math.PI * fc) / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const c = Math.cos(w0);
    const a0 = A + 1 - (A - 1) * c + 2 * Math.sqrt(A) * alpha;
    return {
      b: [(A * (A + 1 + (A - 1) * c + 2 * Math.sqrt(A) * alpha)) / a0, (-2 * A * (A - 1 + (A + 1) * c)) / a0, (A * (A + 1 + (A - 1) * c - 2 * Math.sqrt(A) * alpha)) / a0],
      a: [(2 * (A - 1 - (A + 1) * c)) / a0, (A + 1 - (A - 1) * c - 2 * Math.sqrt(A) * alpha) / a0],
    };
  })();
  const hp = (() => {
    const Q = 0.5003270373253953;
    const fc = 38.13547087613982;
    const w0 = (2 * Math.PI * fc) / fs;
    const alpha = Math.sin(w0) / (2 * Q);
    const a0 = 1 + alpha;
    return {b: [1, -2, 1], a: [(-2 * Math.cos(w0)) / a0, (1 - alpha) / a0]};
  })();
  return [shelf, hp];
};

const biquad = (x: Float64Array, f: {b: number[]; a: number[]}) => {
  const y = new Float64Array(x.length);
  let x1 = 0;
  let x2 = 0;
  let y1 = 0;
  let y2 = 0;
  for (let i = 0; i < x.length; i++) {
    const v = f.b[0] * x[i] + f.b[1] * x1 + f.b[2] * x2 - f.a[0] * y1 - f.a[1] * y2;
    x2 = x1;
    x1 = x[i];
    y2 = y1;
    y1 = v;
    y[i] = v;
  }
  return y;
};

/** 16/24-bit PCM or 32-bit float WAV -> channels of samples in -1..1. */
const readWav = (buf: ArrayBuffer) => {
  const v = new DataView(buf);
  const tag = (o: number) => String.fromCharCode(v.getUint8(o), v.getUint8(o + 1), v.getUint8(o + 2), v.getUint8(o + 3));
  if (tag(0) !== 'RIFF' || tag(8) !== 'WAVE') throw new Error('not a WAV file');
  let fmt: {format: number; ch: number; fs: number; bits: number} | null = null;
  let o = 12;
  while (o + 8 <= v.byteLength) {
    const id = tag(o);
    const size = v.getUint32(o + 4, true);
    const body = o + 8;
    if (id === 'fmt ') fmt = {format: v.getUint16(body, true), ch: v.getUint16(body + 2, true), fs: v.getUint32(body + 4, true), bits: v.getUint16(body + 14, true)};
    if (id === 'data' && fmt) {
      const {ch, bits, format} = fmt;
      const bps = bits / 8;
      const end = Math.min(v.byteLength, body + (size === 0xffffffff || size === 0 ? v.byteLength : size));
      const n = Math.floor((end - body) / (bps * ch));
      const out = Array.from({length: ch}, () => new Float64Array(n));
      for (let i = 0; i < n; i++) {
        for (let c = 0; c < ch; c++) {
          const p = body + (i * ch + c) * bps;
          out[c][i] =
            format === 3 && bits === 32
              ? v.getFloat32(p, true)
              : bits === 16
                ? v.getInt16(p, true) / 32768
                : bits === 24
                  ? ((v.getUint8(p) | (v.getUint8(p + 1) << 8) | (v.getInt8(p + 2) << 16)) / 8388608)
                  : 0;
        }
      }
      return {fs: fmt.fs, chans: out};
    }
    o = body + size + (size % 2);
  }
  throw new Error('WAV without data');
};

/** Integrated loudness (LUFS) of the channels (a mono file measures as the film plays it). */
export const integratedLufs = (fs: number, chans: Float64Array[]) => {
  const [shelf, hp] = kFilters(fs);
  const k = chans.map((x) => biquad(biquad(x, shelf), hp));
  const n = Math.round(0.4 * fs);
  const hop = Math.round(0.1 * fs);
  const len = k[0].length;
  const cum = k.map((x) => {
    const c = new Float64Array(x.length + 1);
    for (let i = 0; i < x.length; i++) c[i + 1] = c[i] + x[i] * x[i];
    return c;
  });
  const z: number[] = [];
  for (let s = 0; s + n <= len; s += hop) z.push((cum.reduce((acc, c) => acc + (c[s + n] - c[s]), 0)) / n);
  const L = (p: number) => -0.691 + 10 * Math.log10(Math.max(p, 1e-20));
  const abs = z.filter((p) => L(p) > -70);
  if (!abs.length) return -Infinity;
  const rel = L(abs.reduce((a, b) => a + b, 0) / abs.length) - 10;
  const gated = abs.filter((p) => L(p) > rel);
  return L(gated.reduce((a, b) => a + b, 0) / gated.length);
};

const measure = (id: string) => {
  let p = cache.get(id);
  if (!p) {
    p = fetch(staticFile(`vo/${id}/voice.wav`))
      .then((r) => {
        if (!r.ok) throw new Error(`${r.status}`);
        return r.arrayBuffer();
      })
      .then((b) => {
        const {fs, chans} = readWav(b);
        const l = integratedLufs(fs, chans);
        if (!Number.isFinite(l)) throw new Error('silent voice');
        known.set(id, l);
        return l;
      });
    cache.set(id, p);
  }
  return p;
};

/** The voice level of video `id` (LUFS as played), `fallback` if it cannot be measured; null while
 *  it is being measured (the render waits: delayRender), or when id is null (a silent film). */
export const useVoiceLevel = (id: string | null, fallback: number): number | null => {
  const [level, setLevel] = useState<number | null>(() => (id ? known.get(id) ?? null : null));
  const [handle] = useState(() => (id && !known.has(id) ? delayRender(`voice loudness ${id}`) : null));
  useEffect(() => {
    if (!id || level !== null) return;
    let live = true;
    measure(id)
      .catch((e) => {
        console.warn(`voice loudness of ${id}: ${e instanceof Error ? e.message : e}; the mix assumes ${fallback} LUFS`);
        return fallback;
      })
      .then((l) => {
        if (live) setLevel(l);
      });
    return () => {
      live = false;
    };
  }, [id, level, fallback]);
  // release the frame only after the level has rendered (the cues' volumes read it)
  useEffect(() => {
    if (handle !== null && (level !== null || !id)) continueRender(handle);
  }, [handle, level, id]);
  return id ? level : null;
};
