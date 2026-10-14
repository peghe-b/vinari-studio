#!/usr/bin/env python3
"""The navigator promo's own sounds, synthesised here ($0, no download, no licence): the forest's night bed, an owl, crows
with wing flaps, a car horn, a cow's moo and one cricket chirp. Written to public/vo/navpromo/sfx/ (gitignored).

    python3 src/navpromo/build/sfx_synth.py

Deterministic (a fixed seed), 48 kHz mono, peaks at about -6 dBFS; the mixer sets their levels.
"""
import os

import numpy as np
from scipy import signal

from common import OUT, SR, write_wav

RNG = np.random.default_rng(20261012)
DST = os.path.join(OUT, "sfx")


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def bp(x, lo, hi, order=2):
    sos = signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return signal.sosfilt(sos, x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


def reso(x, f, q):
    """A resonant band (a formant)."""
    b, a = signal.iirpeak(f, q, fs=SR)
    return signal.lfilter(b, a, x)


def env(n, a, r, sustain=1.0):
    e = np.ones(n) * sustain
    na, nr = int(a * SR), int(r * SR)
    if na:
        e[:na] = np.linspace(0, sustain, na)
    if nr:
        e[-nr:] = np.linspace(sustain, 0, nr) * e[-nr]
    return e


def room(x, size=0.4, mix=0.25, damp=3000):
    """A small soft reverb: exponentially decaying noise, low-passed."""
    n = int(size * SR)
    ir = RNG.standard_normal(n) * np.exp(-np.arange(n) / (n / 5))
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    wet = np.zeros(len(x) + n)
    c = signal.fftconvolve(x, ir)[: len(x) + n]
    wet[: len(c)] = c
    out = np.concatenate([x, np.zeros(n)]) * (1 - mix) + wet * mix
    return out


def norm(x, peak_db=-6.0):
    p = np.max(np.abs(x)) + 1e-9
    return x / p * 10 ** (peak_db / 20)


def fade(x, fin=0.004, fout=0.02):
    x = x.copy()
    a, b = int(fin * SR), int(fout * SR)
    if a:
        x[:a] *= np.linspace(0, 1, a)
    if b:
        x[-b:] *= np.linspace(1, 0, b)
    return x


# ---- the night bed: crickets near and far, a slow wind, leaves -----------------------------------------------------------
def cricket_chirp(f0=4700, pulses=4, rate=32, amp=1.0):
    period = 1.0 / rate
    n = int((pulses * period + 0.02) * SR)
    out = np.zeros(n)
    for k in range(pulses):
        s = int(k * period * SR)
        m = int(0.013 * SR)
        tt = np.arange(m) / SR
        w = np.sin(2 * np.pi * (f0 + 60 * np.sin(2 * np.pi * 9 * tt)) * tt) * np.hanning(m)
        w += 0.25 * np.sin(2 * np.pi * 2 * f0 * tt) * np.hanning(m)
        out[s: s + m] += w * (0.8 + 0.2 * (k == 1))
    return out * amp


def night_bed(sec=14.0):
    n = int(sec * SR)
    bed = np.zeros(n)
    # three crickets close by, each chirping on its own clock
    for f0, period, amp, pan in ((4650, 0.62, 1.0, 0), (5150, 0.83, 0.7, 0), (4300, 0.71, 0.5, 0)):
        tpos = RNG.uniform(0, period)
        while tpos < sec - 0.3:
            c = cricket_chirp(f0 + RNG.uniform(-40, 40), pulses=int(RNG.integers(3, 5)), amp=amp * RNG.uniform(0.85, 1.0))
            s = int(tpos * SR)
            bed[s: s + len(c)] += c[: max(0, n - s)]
            tpos += period * RNG.uniform(0.92, 1.08)
    # the far chorus: a band of noise around 4.5 kHz, trembling
    far = bp(RNG.standard_normal(n), 3800, 5600, 3)
    trem = 0.6 + 0.4 * np.sin(2 * np.pi * 28 * t_(sec)) ** 2
    bed += far * trem * 0.18
    # the wind: low noise, breathing slowly
    wind = lp(RNG.standard_normal(n), 450, 2)
    w_env = 0.55 + 0.45 * np.sin(2 * np.pi * 0.11 * t_(sec) + 1.3) * np.sin(2 * np.pi * 0.047 * t_(sec) + 0.4)
    bed += wind * w_env * 2.2
    # leaves: a soft rustle up high that follows the wind
    leaves = bp(RNG.standard_normal(n), 2200, 6500, 2)
    bed += leaves * np.clip(w_env - 0.45, 0, 1) * 0.35
    bed = hp(bed, 60)
    # loopable: cross-fade the last 1 s into the first
    k = int(1.0 * SR)
    bed[:k] = bed[:k] * np.linspace(0, 1, k) + bed[-k:] * np.linspace(1, 0, k)
    return norm(bed[:-k], -9)


# ---- the owl: hoo ... hoo-hoo -----------------------------------------------------------------------------------------------
def owl():
    out = np.zeros(int(1.6 * SR))

    def hoo(start, dur, f0):
        tt = t_(dur)
        f = f0 * (1 + 0.04 * np.exp(-tt * 10)) * (1 - 0.05 * tt / dur)
        ph = 2 * np.pi * np.cumsum(f) / SR
        w = np.sin(ph) + 0.18 * np.sin(2 * ph) + 0.05 * np.sin(3 * ph)
        w += 0.04 * lp(RNG.standard_normal(len(tt)), 1200)
        e = np.sin(np.pi * np.clip(tt / dur, 0, 1)) ** 1.6
        s = int(start * SR)
        out[s: s + len(tt)] += w * e

    hoo(0.0, 0.42, 395)
    hoo(0.62, 0.18, 410)
    hoo(0.86, 0.36, 400)
    return fade(norm(room(out, 0.9, 0.35, 2500), -8))


# ---- crows: three harsh caws and a flurry of wings ------------------------------------------------------------------------
def caw(dur=0.26, f0=560):
    tt = t_(dur)
    f = f0 * (1.12 - 0.25 * tt / dur)
    ph = 2 * np.pi * np.cumsum(f) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    rough = 1 + 0.6 * np.sin(2 * np.pi * 72 * tt)  # the rasp
    x = saw * rough + 0.9 * RNG.standard_normal(len(tt))
    y = reso(x, 1350, 4) * 1.0 + reso(x, 2500, 5) * 0.7 + reso(x, 700, 3) * 0.5
    e = np.minimum(1, tt / 0.02) * np.exp(-((tt / dur) ** 2) * 2.2)
    return y * e


def wings(dur=0.7):
    n = int(dur * SR)
    out = np.zeros(n)
    beat = 0.0
    while beat < dur - 0.06:
        m = int(0.07 * SR)
        b = lp(RNG.standard_normal(m), 900) * np.hanning(m)
        s = int(beat * SR)
        out[s: s + m] += b[: max(0, n - s)] * (1 - beat / dur) ** 0.5
        beat += RNG.uniform(0.075, 0.11)
    return out


def crows():
    out = np.zeros(int(1.4 * SR))
    for start, f0, amp in ((0.0, 560, 1.0), (0.22, 610, 0.8), (0.47, 520, 0.9)):
        c = caw(RNG.uniform(0.22, 0.3), f0) * amp
        s = int(start * SR)
        out[s: s + len(c)] += c
    w = wings(0.8) * 3.5
    out[: len(w)] += w
    return fade(norm(room(out, 0.7, 0.3, 4000), -6))


# ---- the car horn: two detuned notes, about 0.7 s ---------------------------------------------------------------------------
def horn(dur=0.72):
    tt = t_(dur)
    x = np.zeros(len(tt))
    for f in (415.0, 523.0):
        ph = 2 * np.pi * f * tt * (1 + 0.002 * np.sin(2 * np.pi * 5 * tt))
        sq = np.tanh(4 * np.sin(ph))
        x += sq
    x = bp(x, 280, 3600, 2)
    x = reso(x, 1500, 2) * 0.6 + x
    x = np.tanh(x * 1.5)
    e = env(len(tt), 0.012, 0.04)
    return fade(norm(room(x * e, 0.5, 0.18, 3000), -5))


# ---- the cow: mmm-OOO, low and slow (only its first moment is heard: the cut to black takes it) -------------------------------
def moo(dur=1.3):
    tt = t_(dur)
    f0 = 118 + 30 * np.exp(-((tt - 0.35) ** 2) / 0.05) - 22 * tt
    ph = 2 * np.pi * np.cumsum(f0) / SR
    saw = 2 * ((ph / (2 * np.pi)) % 1) - 1
    open_ = np.clip((tt - 0.12) / 0.3, 0, 1)  # the mouth opens: m -> oo
    f1 = 260 + 120 * open_
    y = np.zeros(len(tt))
    blk = int(0.01 * SR)
    for i in range(0, len(tt), blk):
        seg = saw[i: i + blk]
        y[i: i + blk] = seg  # formants applied below on the whole (a slow move is fine for a cow)
    y = reso(y, 330, 3) * 1.2 + reso(y, 720, 4) * 0.5 * 1.0 + reso(y, 2400, 6) * 0.08
    y = lp(y, 1500)
    e = np.minimum(1, tt / 0.12) * (0.6 + 0.4 * open_) * np.exp(-np.clip(tt - 1.0, 0, None) * 6)
    return fade(norm(room(y * e, 0.6, 0.25, 2000), -6))


def main():
    os.makedirs(DST, exist_ok=True)
    for name, x in (
        ("night-bed", night_bed()),
        ("owl", owl()),
        ("crows", crows()),
        ("horn", horn()),
        ("moo", moo()),
        ("cricket", fade(norm(room(cricket_chirp(4700, 4, 30), 0.3, 0.2, 7000), -8))),
    ):
        write_wav(os.path.join(DST, name + ".wav"), x.astype(np.float32))
        print(f"{name:10s} {len(x) / SR:5.2f}s")


if __name__ == "__main__":
    main()
