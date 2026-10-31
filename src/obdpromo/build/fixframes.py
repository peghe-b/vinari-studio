#!/usr/bin/env python3
"""Replace single torn frames in a rendered part by their neighbour, re-encoding the part once with the film's x264 recipe.

    python3 src/obdpromo/build/fixframes.py <part.mp4> <local frame> [<local frame> ...]
    python3 src/obdpromo/build/fixframes.py --blend <part.mp4> <local frame> [...]   (v3: a run of torn frames on a slowly
        moving picture is rebuilt as a crossfade of the good frames on either side of it)

Why (31 Oct): one torn frame came out the same in three renders in a row (frame 1149: the first frame the next shot's WebGL
canvas is composited, warm under the paper card), so a re-render cannot clean it. Only a frame whose two neighbours match (a
static picture there) is replaced, by the frame before. Remotion's ffmpeg has no raw pipes, so the part goes through PNGs in a
temp folder next to it (about 1 GB, removed at once).
"""
import glob
import os
import shutil
import subprocess
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
COMP = os.path.join(HERE, "..", "..", "..", "node_modules", "@remotion", "compositor-darwin-arm64")
ENV = dict(os.environ, DYLD_LIBRARY_PATH=COMP)
FF = os.path.join(COMP, "ffmpeg")
TAGS = ["-color_range", "tv", "-colorspace", "bt709", "-color_trc", "bt709", "-color_primaries", "bt709"]


def main():
    args = sys.argv[1:]
    blend = args[0] == "--blend"
    if blend:
        args = args[1:]
    src = args[0]
    bad = sorted({int(x) for x in args[1:]})
    tmp = src + ".fix"
    os.makedirs(tmp, exist_ok=True)
    try:
        subprocess.run([FF, "-v", "error", "-i", src, "-vsync", "0", os.path.join(tmp, "f%05d.png")], env=ENV, check=True)
        fs = sorted(glob.glob(os.path.join(tmp, "f*.png")))
        if blend:
            # (31 Oct, v3: frames 1835-1836, the next shot's canvas waking under a floating phone, torn the same in three renders)
            runs = []
            for k in bad:
                if runs and k == runs[-1][-1] + 1:
                    runs[-1].append(k)
                else:
                    runs.append([k])
            for run in runs:
                a_, b_ = run[0] - 1, run[-1] + 1
                if a_ < 0 or b_ >= len(fs):
                    continue
                A = np.asarray(Image.open(fs[a_]).convert("RGB"), np.float32)
                B = np.asarray(Image.open(fs[b_]).convert("RGB"), np.float32)
                print(f"frames {run}: crossfade of {a_} and {b_} (they differ by {float(np.mean(np.abs(A - B))):.2f})")
                for j, k in enumerate(run):
                    w = (j + 1) / (len(run) + 1)
                    Image.fromarray(np.clip(A * (1 - w) + B * w + 0.5, 0, 255).astype(np.uint8)).save(fs[k])
            bad = []
        for k in bad:
            if not 0 < k < len(fs) - 1:
                continue
            a = np.asarray(Image.open(fs[k - 1]), np.int16)
            c = np.asarray(Image.open(fs[k + 1]), np.int16)
            d = float(np.mean(np.abs(a - c)))
            ok = d < 1.0
            print(f"frame {k}: neighbours differ by {d:.2f}" + (" -> replaced by the frame before" if ok else " -> NOT replaced (moving)"))
            if ok:
                shutil.copyfile(fs[k - 1], fs[k])
        out = src + ".fix.mp4"
        subprocess.run([FF, "-v", "error", "-y", "-framerate", "30", "-i", os.path.join(tmp, "f%05d.png"), "-c:v", "libx264", "-preset", "slower", "-tune", "film",
                        "-crf", "12", "-x264-params", "aq-mode=3", "-maxrate", "20M", "-bufsize", "40M", "-profile:v", "high", "-level", "4.2", "-pix_fmt", "yuv420p",
                        "-vf", "scale=out_color_matrix=bt709:out_range=tv", *TAGS, "-video_track_timescale", "90000", out], env=ENV, check=True)
        os.replace(out, src)
        print(f"{src}: {len(fs)} frames re-encoded")
    finally:
        shutil.rmtree(tmp, ignore_errors=True)


if __name__ == "__main__":
    main()
