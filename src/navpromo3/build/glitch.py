#!/usr/bin/env python3
"""The glitch scan of a rendered film (the brief's test): a frame that differs from BOTH its neighbours while the neighbours
match each other is a glitch (a one-frame flash, a torn or missing layer, a frame from elsewhere). A cut never trips it (the
frames on its two sides differ from each other), steady motion never trips it (each frame lies between its neighbours).

    python3 src/navpromo3/build/glitch.py <video> [--thr 3.0]     exit 0 clean, 1 glitches found

Frames are compared at 108 x 192 in grey (mean absolute difference, 0..255): a glitch is a frame whose difference to each
neighbour is over `thr` and over 2.5 times the neighbours' difference to each other (+1).
"""
import glob
import os
import shutil
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMP = os.path.join(HERE, "..", "..", "..", "node_modules", "@remotion", "compositor-darwin-arm64")


def main():
    src = sys.argv[1]
    thr = float(sys.argv[sys.argv.index("--thr") + 1]) if "--thr" in sys.argv else 3.0
    tmp = tempfile.mkdtemp(prefix="glitch-")
    try:
        subprocess.run([os.path.join(COMP, "ffmpeg"), "-v", "error", "-i", src, "-vf", "scale=108:192", os.path.join(tmp, "f%05d.png")],
                       env=dict(os.environ, DYLD_LIBRARY_PATH=COMP), check=True)
        f = np.stack([np.asarray(Image.open(p).convert("L"), np.float32) for p in sorted(glob.glob(os.path.join(tmp, "*.png")))])
    finally:
        shutil.rmtree(tmp)
    d = lambda a, b: float(np.mean(np.abs(f[a] - f[b])))
    bad = []
    for i in range(1, len(f) - 1):
        a, b, c = d(i - 1, i), d(i, i + 1), d(i - 1, i + 1)
        if a > thr and b > thr and min(a, b) > 2.5 * c + 1:
            bad.append((i, round(i / 30, 2), round(a, 1), round(b, 1), round(c, 1)))
    print(f"{os.path.basename(src)}: {len(f)} frames scanned, glitches: {len(bad)}")
    for g in bad:
        print(f"  frame {g[0]} ({g[1]} s): to the previous {g[2]}, to the next {g[3]}, the neighbours to each other {g[4]}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
