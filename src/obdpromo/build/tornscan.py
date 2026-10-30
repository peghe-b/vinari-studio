#!/usr/bin/env python3
"""Find torn frames in a rendered clip (render.sh runs it on every part and on the joined film).

    python3 src/obdpromo/build/tornscan.py <video> [first-frame-number]     exit 0 clean, 1 torn frames found

A torn frame (seen 2026-10-15 in v2's renders: the owner's „artifact when the phone rises" was one): headless Chrome on ANGLE/
Metal, under memory load, now and then composites a frame with every tile showing the frame's top-left tile (the picture
repeated 2 x 4, the WebGL phone gone). It is never the scene's code (a re-render of the same frames is clean), so the part is
rendered again. Two tests on the frames at 108 x 192: glitch.py's (a frame unlike both neighbours that match each other) and a
motion-aware one (a frame far from the midpoint of its neighbours, beyond what their own change explains), which also catches
a torn frame inside a fast change (the reveal's white bloom).
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
    off = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    tmp = tempfile.mkdtemp(prefix="tornscan-")
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
        m = float(np.mean(np.abs(f[i] - (f[i - 1] + f[i + 1]) / 2)))
        if (a > 4 and b > 4 and min(a, b) > 2.5 * c + 1) or (m > 8 and m > c + 4 and min(a, b) > 4):
            bad.append((i + off, round(a, 1), round(b, 1), round(c, 1), round(m, 1)))
    print(f"{os.path.basename(src)}: {len(f)} frames, torn: {bad or 'none'}")
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
