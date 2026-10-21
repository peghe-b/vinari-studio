#!/usr/bin/env python3
"""The navigator + CarPlay promo's own sounds, synthesised here ($0, no download, no licence), into public/vo/navpromo3/sfx/
(gitignored):

  heel0..2   a stiletto heel on wet stone: a hard tick (a 3 ms bright burst), the heel's small ring (about 2.3 kHz, damped in
             40 ms) and a soft low knock under it; three variants so a walk never repeats one sample

    python3 src/navpromo3/build/sfx_synth.py

Deterministic, 48 kHz mono, peaks at about -6 dBFS; the mixer sets their levels.
"""
import os

import numpy as np
from scipy import signal

from common import OUT, SR, write_wav

DST = os.path.join(OUT, "sfx")


def norm(x, peak_db=-6.0):
    return x / (np.max(np.abs(x)) + 1e-9) * 10 ** (peak_db / 20)


def heel(seed):
    rng = np.random.default_rng(100 + seed)
    n = int(0.16 * SR)
    t = np.arange(n) / SR
    burst = rng.standard_normal(n) * np.exp(-t / 0.0016)
    burst = signal.sosfilt(signal.butter(2, 2500, btype="high", fs=SR, output="sos"), burst)
    f = 2300 + 260 * seed
    ring = np.sin(2 * np.pi * f * t + rng.uniform(0, 6)) * np.exp(-t / 0.011) * 0.5
    ring += np.sin(2 * np.pi * f * 1.62 * t) * np.exp(-t / 0.007) * 0.18
    knock = np.sin(2 * np.pi * (140 + 12 * seed) * t) * np.exp(-t / 0.018) * 0.55
    x = burst * 0.9 + ring + knock
    a = int(0.0006 * SR)
    x[:a] *= np.linspace(0, 1, a)
    return norm(x, -6)


def main():
    os.makedirs(DST, exist_ok=True)
    for i in range(3):
        write_wav(os.path.join(DST, f"heel{i}.wav"), heel(i).astype(np.float32))
        print(f"heel{i}")


if __name__ == "__main__":
    main()
