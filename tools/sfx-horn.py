#!/usr/bin/env python3
"""The humour category's horn set (phase 2, plan step 14), synthesised here, so no licence is involved (our own, CC0).
Additions only: no existing file of public/sfx changes.

    python3 tools/sfx-horn.py      writes public/sfx/horn-short.wav, horn-long.wav, horn-chorus.wav, window-motor.wav

A car horn is two detuned tones a major third apart (about 400 and 500 Hz), rich in odd harmonics (a clipped saw through a
gentle low-pass), a 12 ms attack and a 70 ms release; the chorus is three of them, at three pitches, overlapping like a
Tbilisi jam. 48 kHz, 16-bit stereo like the kit, peaks at -3 dBFS (the mix and the master set the level).
"""
import os
import wave

import numpy as np

SR = 48000
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'public', 'sfx')


def horn(dur, f1=405.0, f2=508.0, seed=0):
    rng = np.random.default_rng(seed)
    t = np.arange(int(dur * SR)) / SR
    def saw(f):
        ph = (t * f + rng.random()) % 1.0
        return 2 * ph - 1
    x = 0.55 * saw(f1) + 0.45 * saw(f2)
    x = np.tanh(2.2 * x)  # the horn's buzz
    # a one-pole low-pass at ~3.2 kHz and a little body resonance
    a = np.exp(-2 * np.pi * 3200 / SR)
    y = np.empty_like(x)
    acc = 0.0
    for i, v in enumerate(x):
        acc = (1 - a) * v + a * acc
        y[i] = acc
    env = np.minimum(1, t / 0.012) * np.minimum(1, (dur - t) / 0.07).clip(0, 1)
    wob = 1 + 0.03 * np.sin(2 * np.pi * 5.5 * t)
    return y * env * wob


def window_motor(dur=0.9, seed=3):
    rng = np.random.default_rng(seed)
    t = np.arange(int(dur * SR)) / SR
    hum = 0.5 * np.sin(2 * np.pi * (118 + 14 * t / dur) * t) + 0.25 * np.sin(2 * np.pi * 236 * t)
    noise = rng.standard_normal(len(t))
    a = np.exp(-2 * np.pi * 900 / SR)
    lp = np.empty_like(noise)
    acc = 0.0
    for i, v in enumerate(noise):
        acc = (1 - a) * v + a * acc
        lp[i] = acc
    env = np.minimum(1, t / 0.05) * np.minimum(1, (dur - t) / 0.08).clip(0, 1)
    thunk = np.zeros_like(t)
    k = int((dur - 0.06) * SR)
    thunk[k:k + 2400] = np.exp(-np.arange(min(2400, len(t) - k)) / 300) * np.sin(2 * np.pi * 90 * np.arange(min(2400, len(t) - k)) / SR)
    return (0.6 * hum + 0.5 * lp) * env + 0.8 * thunk


def write(name, mono, pan=0.0):
    peak = np.max(np.abs(mono)) or 1
    mono = mono / peak * 10 ** (-3 / 20)
    l = mono * (1 - max(0, pan))
    r = mono * (1 + min(0, pan))
    pcm = (np.stack([l, r], axis=1) * 32767).astype('<i2')
    with wave.open(os.path.join(OUT, f'{name}.wav'), 'wb') as w:
        w.setnchannels(2)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    print(f'{name}.wav {len(mono) / SR:.2f} s')


def main():
    write('horn-short', horn(0.32))
    write('horn-long', horn(1.1, seed=1))
    n = int(1.6 * SR)
    mix = np.zeros(n)
    for start, f1, f2, d, s in [(0.0, 405, 508, 0.9, 2), (0.22, 350, 440, 1.0, 3), (0.5, 470, 590, 0.7, 4)]:
        h = horn(d, f1, f2, s)
        k = int(start * SR)
        mix[k:k + len(h)] += h[: n - k]
    write('horn-chorus', mix)
    write('window-motor', window_motor())


if __name__ == '__main__':
    main()
