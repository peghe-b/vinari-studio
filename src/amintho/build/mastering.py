"""The OBD promo's mastering (copied from src/obdpromo/build/plan.py): a soft clip and a true-peak limiter around one gain."""
import os

import numpy as np

from common import SR, loudness, write_wav


def limiter(x, ceiling_db, look=0.002, release=0.06):
    from scipy import signal
    from scipy.ndimage import minimum_filter1d

    up = np.abs(signal.resample_poly(x, 4, 1))
    need = np.minimum(1.0, 10 ** (ceiling_db / 20) / np.maximum(up, 1e-9))
    need = need[: len(x) * 4].reshape(-1, 4).min(axis=1)
    w = max(1, int(look * SR))
    need = minimum_filter1d(need, size=2 * w + 1, mode="nearest")
    k = np.exp(-1.0 / (release * SR))
    g = np.empty_like(need)
    cur = 1.0
    for i, v in enumerate(need.tolist()):
        cur = v if v < cur else v + (cur - v) * k
        g[i] = cur
    return x * g


def soft_clip(x, ceil_db, knee=0.55):
    from scipy import signal

    up = signal.resample_poly(x, 4, 1)
    c = 10 ** (ceil_db / 20)
    k = knee * c
    a = np.abs(up)
    y = np.where(a <= k, up, np.sign(up) * (k + (c - k) * np.tanh((a - k) / (c - k))))
    return signal.resample_poly(y, 1, 4)[: len(x)]


def master(x, path, target=-10.5, tp=-1.6):
    """One gain to target LUFS, then the limiter only where the true peak needs it; aimed again by the miss."""
    tmp = path + ".m.wav"
    write_wav(tmp, np.stack([x, x], axis=1), bits=24)
    i, p = loudness(tmp)
    g0 = target - i
    g = g0 + 1.5
    for attempt in range(8):
        y = limiter(soft_clip(limiter(x * 10 ** (g / 20), tp - 0.2, look=0.005, release=0.12), tp - 0.3, knee=0.8), tp - 0.4)
        write_wav(tmp, np.stack([y, y], axis=1), bits=24)
        i2, p2 = loudness(tmp)
        print(f"master {os.path.basename(path)}: {i:.2f} -> {i2:.2f} LUFS, true peak {p2:.2f} dBTP (gain {g:+.2f} dB)")
        if (abs(i2 - target) <= 0.15 or g >= g0 + 4.5) and p2 <= tp:
            break
        g = min(g0 + 4.5, g + (target - i2) * 1.1)
    write_wav(path, np.stack([y, y], axis=1), bits=24)
    os.remove(tmp)
    return i2, p2


