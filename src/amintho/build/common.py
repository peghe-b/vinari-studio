"""Shared helpers for the diagnostics promo's audio build (src/obdpromo/build/*.py), copied from the QR promo's.

Everything audible lands in public/vo/obdpromo/ (gitignored: the studio repo is public, and the app's own voice
clips and the paid Gemini takes must never be committed). Audio is handled as 48 kHz mono float32 numpy arrays.
"""
import json
import os
import subprocess
import sys
import wave

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, "..", "..", ".."))
REPO = os.environ.get("VINARI_REPO") or "/Users/admin/Documents/Claude Projects/Vinari"
OUT = os.path.join(STUDIO, "public", "vo", "amintho")
NAVVOICE = os.path.join(REPO, "Vinari", "Resources", "NavVoice")
SFX = os.path.join(STUDIO, "public", "sfx")
SR = 48000
FPS = 30

COMP = os.path.join(STUDIO, "node_modules", "@remotion", "compositor-darwin-arm64")
FFMPEG = os.path.join(COMP, "ffmpeg")
ENV = dict(os.environ, DYLD_LIBRARY_PATH=COMP)


def ff(*args, capture=False):
    """Remotion's bundled ffmpeg (it needs its own dylibs on the library path)."""
    cmd = [FFMPEG, "-hide_banner", "-nostdin", "-y", *args]
    r = subprocess.run(cmd, env=ENV, cwd=COMP, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(f"ffmpeg failed: {' '.join(args)[:300]}\n{r.stderr[-1500:]}")
    return r.stderr if capture else None


def load(path, sr=SR):
    """Any audio file -> mono float32 at `sr` (decoded through ffmpeg into a temp wav)."""
    tmp = os.path.join(OUT, ".tmp-load.wav")
    os.makedirs(OUT, exist_ok=True)
    ff("-i", os.path.abspath(path), "-ac", "1", "-ar", str(sr), "-c:a", "pcm_s24le", tmp)
    a = read_wav(tmp)
    os.remove(tmp)
    return a


def read_wav(path):
    """Any PCM / float WAV (WAVE_FORMAT_EXTENSIBLE too) -> mono float32 at SR."""
    from scipy.io import wavfile

    sr, a = wavfile.read(path)
    if a.dtype == np.int16:
        a = a.astype(np.float32) / 32768.0
    elif a.dtype == np.int32:  # scipy puts 24-bit samples in the top bytes of int32
        a = a.astype(np.float32) / 2147483648.0
    elif a.dtype == np.uint8:
        a = (a.astype(np.float32) - 128) / 128.0
    else:
        a = a.astype(np.float32)
    if a.ndim > 1:
        a = a.mean(axis=1)
    if sr != SR:
        tmp = path + ".rs.wav"
        ff("-i", os.path.abspath(path), "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s24le", tmp)
        a = read_wav(tmp)
        os.remove(tmp)
    return a.astype(np.float32)


def write_wav(path, a, sr=SR, bits=16):
    """Mono (1-D) or stereo (N x 2) float -> WAV (16-bit, or 32-bit float for intermediate mixes)."""
    os.makedirs(os.path.dirname(path), exist_ok=True)
    a = np.asarray(a, dtype=np.float32)
    ch = 1 if a.ndim == 1 else a.shape[1]
    if bits == 16:
        data = (np.clip(a, -1, 1) * 32767).astype("<i2").tobytes()
        with wave.open(path, "wb") as w:
            w.setnchannels(ch)
            w.setsampwidth(2)
            w.setframerate(sr)
            w.writeframes(data)
    else:  # 24-bit PCM for the mixes
        v = (np.clip(a, -1, 1) * 8388607).astype(np.int32).reshape(-1)
        b = np.stack([v & 255, (v >> 8) & 255, (v >> 16) & 255], axis=1).astype(np.uint8)
        with wave.open(path, "wb") as w:
            w.setnchannels(ch)
            w.setsampwidth(3)
            w.setframerate(sr)
            w.writeframes(b.tobytes())


def rms_db(a):
    return 20 * np.log10(np.sqrt(np.mean(np.square(a))) + 1e-12)


def env_db(a, win=0.01):
    """Short-time level (dB) per `win` seconds."""
    n = int(SR * win)
    k = len(a) // n
    if k == 0:
        return np.array([-120.0])
    x = a[: k * n].reshape(k, n)
    return 20 * np.log10(np.sqrt(np.mean(x * x, axis=1)) + 1e-9)


def speech_span(a, floor_db=-45.0, win=0.01):
    """(on, off) seconds of the first and last window louder than floor_db relative to the clip's peak window."""
    e = env_db(a, win)
    thr = e.max() + floor_db
    idx = np.where(e > thr)[0]
    if len(idx) == 0:
        return 0.0, len(a) / SR
    return idx[0] * win, (idx[-1] + 1) * win


def pauses(a, min_len=0.12, rel_db=-38.0, win=0.01):
    """Silent stretches (start, end) seconds: windows quieter than the peak + rel_db, at least min_len long."""
    e = env_db(a, win)
    thr = e.max() + rel_db
    quiet = e < thr
    out, s = [], None
    for i, q in enumerate(quiet):
        if q and s is None:
            s = i
        if not q and s is not None:
            if (i - s) * win >= min_len:
                out.append((s * win, i * win))
            s = None
    if s is not None and (len(quiet) - s) * win >= min_len:
        out.append((s * win, len(quiet) * win))
    return out


def fade(a, fin=0.006, fout=0.012):
    a = a.copy()
    ni, no = int(fin * SR), int(fout * SR)
    if ni:
        a[:ni] *= np.linspace(0, 1, ni)
    if no:
        a[-no:] *= np.linspace(1, 0, no)
    return a


def loudness(path):
    """Integrated loudness (LUFS) and true peak (dBTP) of a file: the bundled ffmpeg has no ebur128, so loudnorm's own
    measurement pass (its input_i / input_tp, the same BS.1770 meter)."""
    err = ff("-i", os.path.abspath(path), "-af", "loudnorm=I=-10:TP=-1:LRA=50:print_format=json", "-f", "null", "-", capture=True)
    j = json.loads(err[err.rindex("{"): err.rindex("}") + 1])
    return float(j["input_i"]), float(j["input_tp"])


def save_json(path, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=1)


def load_json(path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)
