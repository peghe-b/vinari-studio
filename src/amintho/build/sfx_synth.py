#!/usr/bin/env python3
"""The diagnostics promo's own sounds, synthesised here ($0, no download, no licence), into public/vo/amintho/sfx/
(gitignored):

  bleep   the TV censor tone: a clean 1 kHz sine, 0.42 s, 4 ms edges (it covers the rest of the owner's swear)
  chime   a car's soft warning chime: one round bell-like tone pair (E6 then C6), short, no buzz (the check light)

    python3 src/amintho/build/sfx_synth.py

Deterministic, 48 kHz mono, peaks at about -6 dBFS; the mixer sets their levels.
"""
import os

import numpy as np

from common import OUT, SR, write_wav

DST = os.path.join(OUT, "sfx")


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def env(n, a, r):
    e = np.ones(n)
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, 1, na)
    if nr:
        e[-nr:] *= np.linspace(1, 0, nr)
    return e


def norm(x, peak_db=-6.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)


def bleep():
    t = t_(0.42)
    x = np.sin(2 * np.pi * 1000 * t)
    return norm(x * env(len(t), 0.004, 0.006), -3)


def bell(f, dur, decay):
    """a soft struck tone: the fundamental, a quiet octave and a fifth above, an exponential decay, a 3 ms attack"""
    t = t_(dur)
    x = np.sin(2 * np.pi * f * t) + 0.22 * np.sin(2 * np.pi * 2 * f * t) + 0.08 * np.sin(2 * np.pi * 3 * f * t)
    return x * np.exp(-t / decay) * env(len(t), 0.003, 0.03)


def chime():
    a = bell(1318.5, 0.55, 0.16)
    b = bell(1046.5, 0.8, 0.22)
    out = np.zeros(int(1.0 * SR))
    out[: len(a)] += a
    s = int(0.17 * SR)
    out[s: s + len(b)] += b * 0.9
    return norm(out, -6)


def wind():
    """the night road's air: 12 s of soft brown noise, band-limited 60..900 Hz, slowly breathing (seeded, loops cleanly)"""
    rng = np.random.default_rng(7)
    n = int(12 * SR)
    x = np.cumsum(rng.standard_normal(n))
    x -= np.convolve(x, np.ones(4801) / 4801, mode="same")
    from scipy import signal

    b, a = signal.butter(2, [180 / (SR / 2), 1600 / (SR / 2)], btype="band")
    x = signal.filtfilt(b, a, x)
    t = np.arange(n) / SR
    x *= 0.75 + 0.25 * np.sin(2 * np.pi * t / 6.0) * np.sin(2 * np.pi * t / 4.0 + 1.0)
    return norm(x * env(n, 0.5, 0.5), -12)


def crickets():
    """far crickets: short 4.6 kHz chirps in pairs, sparse, very quiet (the night field under the aerial)"""
    rng = np.random.default_rng(11)
    n = int(6 * SR)
    out = np.zeros(n)
    tc = t_(0.045)
    chirp = np.sin(2 * np.pi * 4600 * tc) * np.sin(np.pi * tc / 0.045) ** 2
    at = 0.2
    while at < 5.7:
        for k in range(3):
            s = int((at + k * 0.07) * SR)
            out[s: s + len(chirp)] += chirp * (0.6 + 0.4 * rng.random())
        at += 0.55 + rng.random() * 0.5
    return norm(out, -18)


def main():
    os.makedirs(DST, exist_ok=True)
    for name, fn in (("bleep", bleep), ("chime", chime), ("wind", wind), ("crickets", crickets)):
        write_wav(os.path.join(DST, name + ".wav"), fn().astype(np.float32))
        print(name)


if __name__ == "__main__":
    main()
