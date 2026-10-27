#!/usr/bin/env python3
"""The judge's key frames (tools/ci/judge.mjs, the r3 CI art director): a few frames of the RENDERED film at a size where
a word, an edge or a crop can be read (the 1-frame-a-second sheet, tools/ci/adsheet.py, is 180 x 320 a tile: a cut letter or a
phone's edge at the frame's border does not show there). One PNG board, 360 x 640 a tile, 4 to a row, each tile labelled
with its time and why it was picked ("hook", "shot 4 Receipt", "end").

    python3 tools/ci/keyframes.py <film.mp4> <board.png> --at 0:hook,45:hook+1.5s,312:shot-4 [--fps 30]
    python3 tools/ci/keyframes.py <stills-dir> <board.png> --at ...     PNG stills named <anything>-<frame>.png (the Mac's
                                                                         visual proof: `npx remotion still` frames)
    python3 tools/ci/keyframes.py --test

Each frame of a film is decoded on its own (`-ss` before `-i`, one frame, scaled): the runner has no ffmpeg on its PATH, and
Remotion's bundled ffmpeg (tools/ci/adsheet.py) has `scale` but no `select`, `fps` or `tile`. The frame guides are drawn
OUTSIDE each tile (a tick on the margin at the caption band and at TikTok's action column), never over the picture.
"""
import io
import os
import re
import subprocess
import sys

from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
W, H = 360, 640
COLS = 4
PAD = 14
LABEL_H = 18
BG = (40, 40, 40)
# the frame's own lines, in 1080 x 1920 px (src/lib/p2.mjs P2_TT_FRAME; the caption band of the guards, src/lib/guard.mjs)
CAPTION_BAND = (1440, 1560)
TT_BAND = (880, 1110)


def parse_at(s):
    """'0:hook,45:hook+1.5s' -> [(0, 'hook'), (45, 'hook+1.5s')]; labels are cut to plain ASCII."""
    out = []
    for part in (s or "").split(","):
        part = part.strip()
        if not part:
            continue
        f, _, lab = part.partition(":")
        if not re.fullmatch(r"\d{1,6}", f):
            raise ValueError(f"not a frame: {f!r}")
        out.append((int(f), re.sub(r"[^\x20-\x7e]", "?", lab)[:28]))
    return out


def env_path():
    node_bin = os.path.expanduser("~/.local/node/bin")
    search = os.environ.get("PATH", "")
    return dict(os.environ, PATH=node_bin + os.pathsep + search if os.path.isdir(node_bin) else search)


def frame_of_film(path, frame, fps):
    """One frame of the film, W x H, decoded by Remotion's bundled ffmpeg; None when there is none. A seek onto the film's
    very last frame can land past it and decode nothing (p2-check, Linux: frame 59 of a 60-frame clip): then a little earlier."""
    for back in (0.0, 2 / fps, 0.25):
        t = max(0.0, frame / fps - back)
        raw = subprocess.run(
            ["npx", "remotion", "ffmpeg", "-hide_banner", "-loglevel", "error", "-ss", f"{t:.3f}", "-i", os.path.abspath(path),
             "-an", "-frames:v", "1", "-vf", f"scale={W}:{H}:flags=area", "-f", "image2pipe", "-c:v", "png", "-"],
            cwd=ROOT, env=env_path(), check=True, capture_output=True).stdout
        if raw:
            return Image.open(io.BytesIO(raw)).convert("RGB")
    return None


def frame_of_stills(folder, frame):
    """The still of `frame` in a folder of <anything>-<frame>.png, or None: never another frame's still under this frame's
    label (the Mac proof's first board showed a missing still's neighbour as "shot 6")."""
    for name in sorted(os.listdir(folder)):
        m = re.search(r"-(\d+)\.png$", name)
        if m and int(m.group(1)) == frame:
            return Image.open(os.path.join(folder, name)).convert("RGB").resize((W, H), Image.LANCZOS)
    return None


def board(tiles):
    """tiles: [(Image, label)] -> one PNG board, 4 a row; the guides as ticks on the margin right of each tile."""
    rows = (len(tiles) + COLS - 1) // COLS
    tw, th = W + PAD, H + LABEL_H + PAD
    im = Image.new("RGB", (PAD + COLS * tw, PAD + max(1, rows) * th), BG)
    d = ImageDraw.Draw(im)
    for k, (t, lab) in enumerate(tiles):
        x, y = PAD + (k % COLS) * tw, PAD + (k // COLS) * th
        d.text((x + 2, y + 3), lab, fill=(235, 235, 235))
        im.paste(t, (x, y + LABEL_H))
        sy = H / 1920
        for (a, b), col in ((CAPTION_BAND, (90, 160, 255)), (TT_BAND, (255, 140, 60))):
            d.line([(x + W + 3, y + LABEL_H + a * sy), (x + W + 3, y + LABEL_H + b * sy)], fill=col, width=3)
    return im


def main(argv):
    if len(argv) < 2 or "--at" not in argv:
        print(__doc__)
        return 2
    src, dst = argv[0], argv[1]
    at = parse_at(argv[argv.index("--at") + 1])
    fps = float(argv[argv.index("--fps") + 1]) if "--fps" in argv else 30.0
    tiles = []
    for f, lab in at[:12]:
        im = frame_of_stills(src, f) if os.path.isdir(src) else frame_of_film(src, f, fps)
        if im is not None:
            tiles.append((im, f"{f / fps:.1f}s {lab}".strip()))
    if not tiles:
        print(f"keyframes: no frames in {src}")
        return 1
    board(tiles).save(dst)
    print(f"keyframes: {len(tiles)} of {len(at)} frames -> {dst}")
    return 0


def self_test():
    bad = 0

    def ok(c, what):
        nonlocal bad
        bad += 0 if c else 1
        print(f"{'ok  ' if c else 'FAIL'} {what}")

    ok(parse_at("0:hook,45:hook+1.5s, 312:shot-4 Receipt") == [(0, "hook"), (45, "hook+1.5s"), (312, "shot-4 Receipt")], "the --at list")
    ok(parse_at("7:ჩუჩელა x")[0][1] == "?????? x", "a label is plain ASCII")
    try:
        parse_at("x:hook")
        ok(False, "a bad frame is refused")
    except ValueError:
        ok(True, "a bad frame is refused")
    im = board([(Image.new("RGB", (W, H), (243, 243, 243)), f"{k}.0s t") for k in range(6)])
    ok(im.size == (PAD + COLS * (W + PAD), PAD + 2 * (H + LABEL_H + PAD)), f"6 tiles: two rows of 4 ({im.size})")
    px = im.getpixel((PAD + 10, PAD + LABEL_H + 10))
    ok(px == (243, 243, 243), "the guides stay off the picture")
    import tempfile

    with tempfile.TemporaryDirectory() as tmp:
        for f, col in ((0, (255, 0, 0)), (90, (0, 0, 255))):
            Image.new("RGB", (540, 960), col).save(os.path.join(tmp, f"demo-p2-x-{f}.png"))
        ok(frame_of_stills(tmp, 0).getpixel((5, 5)) == (255, 0, 0) and frame_of_stills(tmp, 90).getpixel((5, 5)) == (0, 0, 255), "a stills folder: the still of the frame")
        ok(frame_of_stills(tmp, 120) is None, "a missing still is missing, never its neighbour")
        out = os.path.join(tmp, "b.png")
        ok(main([tmp, out, "--at", "0:hook,90:shot-2,95:none"]) == 0 and Image.open(out).size[0] == PAD + COLS * (W + PAD), "a board from stills")
    print(f"{bad} failed" if bad else "all ok")
    return 1 if bad else 0


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        sys.exit(self_test())
    sys.exit(main(sys.argv[1:]))
