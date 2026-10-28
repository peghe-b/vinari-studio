#!/usr/bin/env python3
"""The art director's sheet of a rendered film (studio.yml "art director", tools/ci/artdirector.mjs final): one frame a
second, 180 x 320 each, 8 to a row, the second written on every tile, on one PNG.

    python3 tools/ci/adsheet.py <film.mp4> <sheet.png> [--every 30] [--max 64]
    python3 tools/ci/adsheet.py --test

The p2 prove run (2026-10-26): the step called a plain `ffmpeg` with `fps` and `tile` filters; the runner has no ffmpeg on
its PATH ("ffmpeg: command not found", exit 127) and the step's continue-on-error hid it, so the art director never looked at
a single render. Remotion's bundled ffmpeg (what the render and tools/flicker.py use) has no fps, tile or rawvideo either:
it decodes every frame small through `scale` into a PNG pipe, and Pillow keeps one a second and lays the sheet out.
"""
import io
import os
import struct
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W, H = 180, 320
COLS = 8
PAD = 6
BG = (40, 40, 40)


def pngs(data):
    """Split a stream of concatenated PNG files (the bundled ffmpeg's image2pipe)."""
    i = 0
    while i + 8 <= len(data):
        j = i + 8
        while True:
            n = struct.unpack(">I", data[j:j + 4])[0]
            kind = data[j + 4:j + 8]
            j += 12 + n
            if kind == b"IEND":
                break
        yield data[i:j]
        i = j


def frames(path):
    node_bin = os.path.expanduser("~/.local/node/bin")
    search = os.environ.get("PATH", "")
    env = dict(os.environ, PATH=node_bin + os.pathsep + search if os.path.isdir(node_bin) else search)
    raw = subprocess.run(
        ["npx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-i", os.path.abspath(path), "-an",
         "-vf", f"scale={W}:{H}:flags=area", "-f", "image2pipe", "-c:v", "png", "-"],
        cwd=ROOT, env=env, check=True, capture_output=True).stdout
    return list(pngs(raw))


def pick(n, every=30, most=64):
    """The frame indices to show: the middle of every second (frame 15, 45, ...), at most `most`, spread over the film."""
    idx = list(range(min(every // 2, max(0, n - 1)), n, every)) if n else []
    if len(idx) > most:
        step = len(idx) / most
        idx = [idx[int(k * step)] for k in range(most)]
    return idx


def sheet(tiles, labels):
    rows = (len(tiles) + COLS - 1) // COLS
    im = Image.new("RGB", (PAD + COLS * (W + PAD), PAD + max(1, rows) * (H + PAD)), BG)
    d = ImageDraw.Draw(im)
    for k, (t, lab) in enumerate(zip(tiles, labels)):
        x, y = PAD + (k % COLS) * (W + PAD), PAD + (k // COLS) * (H + PAD)
        im.paste(t.convert("RGB").resize((W, H)), (x, y))
        d.rectangle([x, y, x + 34, y + 14], fill=(255, 255, 255))
        d.text((x + 3, y + 2), lab, fill=(200, 0, 0))
    return im


def main(argv):
    if len(argv) < 2:
        print(__doc__)
        return 2
    src, dst = argv[0], argv[1]
    every = int(argv[argv.index("--every") + 1]) if "--every" in argv else 30
    most = int(argv[argv.index("--max") + 1]) if "--max" in argv else 64
    fr = frames(src)
    idx = pick(len(fr), every, most)
    if not idx:
        print(f"adsheet: no frames in {src}")
        return 1
    tiles = [Image.open(io.BytesIO(fr[i])) for i in idx]
    sheet(tiles, [f"{i / 30:.1f}s" for i in idx]).save(dst)
    print(f"adsheet: {len(idx)} frames of {len(fr)} -> {dst}")
    return 0


def self_test():
    bad = 0

    def ok(c, what):
        nonlocal bad
        bad += 0 if c else 1
        print(f"{'ok  ' if c else 'FAIL'} {what}")

    ok(pick(1800) == list(range(15, 1800, 30)), "a 60 s film: one frame a second, its middle")
    ok(len(pick(3600)) == 64 and pick(3600)[0] == 15, "a 120 s film: 64 tiles spread over it")
    ok(pick(10) == [9], "a clip under a second: its last frame")
    buf = io.BytesIO()
    a = io.BytesIO()
    Image.new("RGB", (4, 4), (255, 0, 0)).save(a, "PNG")
    b = io.BytesIO()
    Image.new("RGB", (4, 4), (0, 0, 255)).save(b, "PNG")
    buf.write(a.getvalue() + b.getvalue())
    parts = list(pngs(buf.getvalue()))
    ok(len(parts) == 2 and Image.open(io.BytesIO(parts[1])).getpixel((0, 0)) == (0, 0, 255), "the PNG pipe splits into its frames")
    im = sheet([Image.new("RGB", (W, H), (243, 243, 243))] * 10, [f"{k}.5s" for k in range(10)])
    ok(im.size == (PAD + COLS * (W + PAD), PAD + 2 * (H + PAD)), f"10 tiles: two rows of 8 ({im.size})")
    print(f"{bad} failed" if bad else "all ok")
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        sys.exit(self_test())
    sys.exit(main(sys.argv[1:]))
