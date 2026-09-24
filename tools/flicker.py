#!/usr/bin/env python3
"""Find single-frame glitches in a rendered video.

    python3 tools/flicker.py out/<id>.mp4 [--threshold 0.8] [--top 5]

A parallel render (Remotion concurrency 3, three Chrome tabs under ANGLE) can drop a layer or
write a corrupted frame now and then: a board that vanishes for one frame, a tile of an older
frame. Such a frame differs from BOTH neighbours much more than the neighbours differ from each
other. A hard cut differs from one neighbour only, and motion changes every frame about evenly,
so neither is flagged.

The video is decoded at 108x192 grey. For frame t:  spike = min(|t - (t-1)|, |t - (t+1)|) - |(t-1) - (t+1)|
(mean absolute difference, 0..255). Measured on the 2026-09-24 renders: dropped split-flap
tiles score 1.0 to 1.4, corrupted (tiled) frames 5 to 18, clean renders stay under 0.3.

Prints every frame over the threshold and exits 1 if there is one (make.sh then renders again
with --concurrency=1). Exit 0: clean.
"""
import io
import os
import struct
import subprocess
import sys

import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
W, H = 108, 192


def pngs(data):
    """Split a stream of concatenated PNG files (Remotion's ffmpeg has no rawvideo muxer)."""
    i = 0
    while i < len(data):
        j = i + 8  # signature
        while True:
            n = struct.unpack(">I", data[j:j + 4])[0]
            kind = data[j + 4:j + 8]
            j += 12 + n
            if kind == b"IEND":
                break
        yield data[i:j]
        i = j


def frames(path):
    # the Mac's node lives in ~/.local/node/bin (not on a GUI process's PATH); a runner has node on PATH
    node_bin = os.path.expanduser("~/.local/node/bin")
    search = os.environ.get("PATH", "")
    env = dict(os.environ, PATH=node_bin + os.pathsep + search if os.path.isdir(node_bin) else search)
    raw = subprocess.run(
        ["npx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", os.path.abspath(path),
         "-vf", f"scale={W}:{H}:flags=area,format=gray", "-f", "image2pipe", "-c:v", "png", "-"],
        cwd=ROOT, env=env, check=True, capture_output=True).stdout
    return np.stack([np.asarray(Image.open(io.BytesIO(b)).convert("L"), np.float32) for b in pngs(raw)])


def scan(fr):
    d1 = np.abs(fr[1:] - fr[:-1]).mean(axis=(1, 2))   # |t - (t-1)| for t = 1..n-1
    d2 = np.abs(fr[2:] - fr[:-2]).mean(axis=(1, 2))   # |(t+1) - (t-1)| for t = 1..n-2
    prev, nxt = d1[:-1], d1[1:]
    spike = np.minimum(prev, nxt) - d2
    return [(float(spike[i]), i + 1, float(prev[i]), float(nxt[i]), float(d2[i])) for i in range(len(spike))]


def main():
    args = sys.argv[1:]
    if not args:
        print(__doc__)
        sys.exit(2)
    path = args[0]
    thr = float(args[args.index("--threshold") + 1]) if "--threshold" in args else 0.8
    top = int(args[args.index("--top") + 1]) if "--top" in args else 0
    fr = frames(path)
    rows = scan(fr)
    bad = sorted([r for r in rows if r[0] > thr], key=lambda r: r[1])
    if top:
        for s, t, p, q, k in sorted(rows, reverse=True)[:top]:
            print(f"  f{t:4d} {t / 30:6.2f}s spike {s:5.2f}  prev {p:5.2f} next {q:5.2f} skip {k:5.2f}")
    if bad:
        print(f"flicker: {len(bad)} single-frame glitch(es) in {os.path.basename(path)} ({len(fr)} frames): "
              + ", ".join(f"f{t} ({s:.1f})" for s, t, *_ in bad))
        sys.exit(1)
    worst = max(rows)[0] if rows else 0
    print(f"flicker: clean ({len(fr)} frames, worst {worst:.2f} < {thr})")


if __name__ == "__main__":
    main()
