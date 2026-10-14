#!/usr/bin/env python3
"""The QR promo's own sounds, synthesised here ($0, no download, no licence), into public/vo/qrpromo/sfx/ (gitignored):

  bleep      the TV censor tone: a clean 1 kHz sine, 0.42 s, 4 ms edges (it covers the end of her swear)
  printer    a small inkjet: the head's stepper whirr in passes, the paper feed's roll, a last push
  keys       a key ring picked up: bright metal clinks
  steps      four calm heel steps on a hard floor
  city       a quiet evening street far below: low traffic rumble, a soft wind, one far car
  room       a warm small room: almost nothing, a low hum

    python3 src/qrpromo/build/sfx_synth.py

Deterministic (a fixed seed), 48 kHz mono, peaks at about -6 dBFS; the mixer sets their levels.
"""
import os

import numpy as np
from scipy import signal

from common import OUT, SR, write_wav

RNG = np.random.default_rng(20261014)
DST = os.path.join(OUT, "sfx")


def t_(sec):
    return np.arange(int(sec * SR)) / SR


def bp(x, lo, hi, order=2):
    return signal.sosfilt(signal.butter(order, [lo, hi], btype="band", fs=SR, output="sos"), x)


def lp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="low", fs=SR, output="sos"), x)


def hp(x, f, order=2):
    return signal.sosfilt(signal.butter(order, f, btype="high", fs=SR, output="sos"), x)


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


def room(x, size=0.3, mix=0.2, damp=4000):
    n = int(size * SR)
    ir = RNG.standard_normal(n) * np.exp(-np.arange(n) / (n / 5))
    ir = lp(ir, damp)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    c = signal.fftconvolve(x, ir)
    out = np.zeros(len(x) + n)
    out[: len(x)] += x * (1 - mix)
    out[: min(len(c), len(out))] += c[: len(out)] * mix
    return out


def bleep():
    t = t_(0.42)
    x = np.sin(2 * np.pi * 1000 * t)
    return norm(x * env(len(t), 0.004, 0.006), -3)


def printer():
    # passes of the print head: a stepper whine (a buzz at a step rate) with a little rattle, then the feed rolling out
    out = np.zeros(int(1.9 * SR))
    for k, (s, d, f) in enumerate([(0.0, 0.32, 410), (0.42, 0.3, 455), (0.82, 0.3, 430)]):
        t = t_(d)
        step = signal.square(2 * np.pi * f * t, 0.3) * 0.5 + 0.5 * np.sin(2 * np.pi * 2 * f * t)
        whine = bp(step, 600, 3800) * (0.6 + 0.4 * np.sin(2 * np.pi * 9 * t))
        rattle = bp(RNG.standard_normal(len(t)), 1800, 6000) * 0.25
        x = (whine + rattle) * env(len(t), 0.02, 0.05)
        i = int(s * SR)
        out[i: i + len(x)] += x
    # the feed: a soft paper roll
    t = t_(0.8)
    roll = bp(RNG.standard_normal(len(t)), 300, 2400) * (0.55 + 0.45 * np.sin(2 * np.pi * 14 * t)) * env(len(t), 0.05, 0.25)
    motor = np.sin(2 * np.pi * 120 * t + 2 * np.sin(2 * np.pi * 7 * t)) * 0.3 * env(len(t), 0.05, 0.25)
    i = int(1.1 * SR)
    out[i: i + len(t)] += roll * 0.7 + lp(motor, 600)
    return norm(room(out, 0.25, 0.15), -6)


def keys():
    out = np.zeros(int(0.8 * SR))
    hits = [0.0, 0.05, 0.11, 0.2, 0.29, 0.43]
    for k, h in enumerate(hits):
        t = t_(0.35)
        x = np.zeros(len(t))
        for f, a in [(3100 + 300 * k, 1.0), (5200 + 410 * k, 0.6), (7400 + 200 * k, 0.4), (2300 + 170 * k, 0.5)]:
            x += a * np.sin(2 * np.pi * f * t) * np.exp(-t * (16 + 3 * k))
        x += bp(RNG.standard_normal(len(t)), 3000, 9000) * np.exp(-t * 90) * 0.6
        i = int(h * SR)
        out[i: i + len(t)] += x[: len(out) - i] * (1 - 0.12 * k)
    return norm(room(out, 0.2, 0.2, 7000), -7)


def steps():
    out = np.zeros(int(2.4 * SR))
    for k, h in enumerate([0.0, 0.55, 1.1, 1.65]):
        t = t_(0.3)
        thump = np.sin(2 * np.pi * (110 - 30 * t) * t) * np.exp(-t * 38)
        click = bp(RNG.standard_normal(len(t)), 1500, 5500) * np.exp(-t * 120) * 0.5
        x = thump * 0.8 + click
        i = int(h * SR)
        out[i: i + len(t)] += x * (0.75 + 0.25 * (k % 2))
    return norm(room(out, 0.45, 0.28, 3500), -8)


def city():
    n = int(12 * SR)
    rumble = lp(RNG.standard_normal(n), 140, 3) * 3
    wind = bp(RNG.standard_normal(n), 300, 1500) * (0.3 + 0.2 * np.sin(2 * np.pi * 0.11 * np.arange(n) / SR))
    x = rumble + wind * 0.25
    # one far car passing
    t = np.arange(n) / SR
    pass_env = np.exp(-((t - 6.5) / 1.6) ** 2)
    car = bp(RNG.standard_normal(n), 120, 900) * pass_env * 0.9
    x = x + car
    fade = int(0.5 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return norm(x, -10)


def room_tone():
    n = int(10 * SR)
    hum = np.sin(2 * np.pi * 50 * np.arange(n) / SR) * 0.05 + np.sin(2 * np.pi * 100 * np.arange(n) / SR) * 0.02
    air = lp(RNG.standard_normal(n), 900) * 0.3
    x = air + hum
    fade = int(0.4 * SR)
    x[:fade] *= np.linspace(0, 1, fade)
    x[-fade:] *= np.linspace(1, 0, fade)
    return norm(x, -14)


def main():
    os.makedirs(DST, exist_ok=True)
    for name, fn in [("bleep", bleep), ("printer", printer), ("keys", keys), ("steps", steps), ("city", city), ("room", room_tone)]:
        x = fn()
        write_wav(os.path.join(DST, name + ".wav"), x)
        print(f"{name:8s} {len(x) / SR:5.2f}s")


if __name__ == "__main__":
    main()
