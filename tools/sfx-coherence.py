# How coherently two kit sounds add up when they land together (the stack ceiling in
# src/scenes/common.tsx reads the result):
#   python3 tools/sfx-coherence.py   -> src/data/sfx-coherence.json
# Run it again after tools/asmr.mjs changes the kit.
#
# Two cues on the same frame do not simply add their power: a tap and a light haptic both open with
# a low thump 3 ms in, in phase, and their sum measured 2.7 dB over the tap alone (v11, 2026-09-24),
# where a power sum predicts 0.7. For every pair of kit sounds, 0 and 1 frame apart, this measures
# rho = cross energy / sqrt(Ea * Eb) (K-weighted, BS.1770) in the 100 ms window where their
# equal-level sum is loudest. A stack's loudest 100 ms is then sum(P) + 2 * rho * sqrt(Pa * Pb) per
# pair. Pairs under 0.15 are left out (they add as power).
import json, math, os
import numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..')
SFX = os.path.join(ROOT, 'public', 'sfx')
OUT = os.path.join(ROOT, 'src', 'data', 'sfx-coherence.json')
FS_FRAME = 30


def load(p):
    fs, x = wavfile.read(p)
    x = x.astype(np.float64) / (np.iinfo(x.dtype).max + 1.0) if np.issubdtype(x.dtype, np.integer) else x.astype(np.float64)
    return (x if x.ndim == 2 else x[:, None]).mean(axis=1), fs


def kweight(x, fs):
    A = 10 ** (3.99984385397 / 40)
    w0 = 2 * math.pi * 1681.9744509555319 / fs
    al = math.sin(w0) / (2 * 0.7071752369554193)
    c = math.cos(w0)
    a0 = A + 1 - (A - 1) * c + 2 * math.sqrt(A) * al
    y = lfilter([A * (A + 1 + (A - 1) * c + 2 * math.sqrt(A) * al) / a0, -2 * A * (A - 1 + (A + 1) * c) / a0, A * (A + 1 + (A - 1) * c - 2 * math.sqrt(A) * al) / a0],
                [1, 2 * (A - 1 - (A + 1) * c) / a0, (A + 1 - (A - 1) * c - 2 * math.sqrt(A) * al) / a0], x)
    w0 = 2 * math.pi * 38.13547087613982 / fs
    al = math.sin(w0) / (2 * 0.5003270373253953)
    return lfilter([1, -2, 1], [1, -2 * math.cos(w0) / (1 + al), (1 - al) / (1 + al)], y)


kit = [r for r in json.load(open(os.path.join(SFX, 'asmr.json'))) if 'loudnessVsVoiceLU' in r]
sig, rate = {}, None
for r in kit:
    p = os.path.join(SFX, r['name'] + '.wav')
    if not os.path.exists(p):
        continue
    x, fs = load(p)
    rate = rate or fs
    if fs != rate:
        continue
    sig[r['name']] = kweight(x, fs)
N = int(0.1 * rate)
names = sorted(sig)
pairs = []
for i, a in enumerate(names):
    for b in names[i + 1:]:
        for d in (0, 1):
            off = d * rate // FS_FRAME
            A, B = sig[a], sig[b]
            L = max(len(A), len(B) + off) + N
            ya, yb = np.zeros(L), np.zeros(L)
            ya[:len(A)] = A
            yb[off:off + len(B)] = B
            ca, cb = np.concatenate([[0], np.cumsum(ya ** 2)]), np.concatenate([[0], np.cumsum(yb ** 2)])
            ea, eb = (ca[N:] - ca[:-N]).max(), (cb[N:] - cb[:-N]).max()
            if ea <= 0 or eb <= 0:
                continue
            yb *= math.sqrt(ea / eb)
            s = ya + yb
            cs = np.concatenate([[0], np.cumsum(s ** 2)])
            j = int((cs[N:] - cs[:-N]).argmax())
            Ea, Eb, X = (ya[j:j + N] ** 2).sum(), (yb[j:j + N] ** 2).sum(), (ya[j:j + N] * yb[j:j + N]).sum()
            rho = X / math.sqrt(Ea * Eb + 1e-30)
            if rho >= 0.15:
                pairs.append([a, b, d, round(float(rho), 2)])
pairs.sort(key=lambda p: -p[3])
os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, 'w') as f:
    json.dump(pairs, f, separators=(',', ':'))
    f.write('\n')
print(f'{len(pairs)} coherent pairs (rho >= 0.15) of {len(names)} sounds -> {os.path.relpath(OUT, ROOT)}')
