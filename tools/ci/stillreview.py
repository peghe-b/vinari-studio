"""The stills' own review for tools/check.mjs (films from KIT_FROM on, src/lib/kit.mjs) and tools/slides.mjs (Story sets).

stdin:  {"tiles": [{"path", "label", "skip"}], "others": {"<id>": ["<16 hex>", ...]}, "band": [y0, y1] (optional, frame
         fractions of the picture band; default 330/1920 .. 1440/1920, the film's picture without the meta bar and subtitle)}
stdout: {"hashes": ["<16 hex>", ...] (one a reviewed tile), "lines": [{"line", "fatal"}]}

  STILL_REPEAT  a 64-bit difference hash (9 x 8 grey of the band) within NEAR bits of another tile of this film (a note) or of
                an earlier film's still (fatal: the same picture again; within NOTE bits: a note)
Pillow and numpy only (requirements.txt).

Its EDGE_CUT (ink at the frame's left or right side in the picture band, 2026-10-19 morning) is gone: it read one still a shot
(at 70 % of it), only when the band's four corners were one flat colour, only the two sides, and only as a note, so v110's car
past the right edge for 1.6 s on a sky over a ground (corners 242 over 208) was never looked at. The frame guards replaced it
(tools/ci/guards.mjs: the whole film every 6 frames, only the marked phones, cars and cards on a key colour, every side, the
subtitle band)."""
import json, sys
import numpy as np
from PIL import Image

NEAR = 4  # bits of 64: the same picture (a still re-rendered, a drift)
NOTE = 7  # bits: very close
a = json.load(sys.stdin)
y0f, y1f = a.get("band", [330 / 1920, 1440 / 1920])
others = {k: [int(h, 16) for h in v if isinstance(h, str) and len(h) == 16] for k, v in (a.get("others") or {}).items()}


def band(path):
    im = Image.open(path).convert("L")
    w, h = im.size
    return im.crop((0, int(h * y0f), w, int(h * y1f)))


def dhash(im):
    g = np.asarray(im.resize((9, 8), Image.BOX), np.int16)
    bits = (g[:, 1:] > g[:, :-1]).flatten()
    return int("".join("1" if b else "0" for b in bits), 2)


def bitsdiff(x, y):
    return bin(x ^ y).count("1")


hashes, lines = [], []
mine = []
for t in a["tiles"]:
    if t.get("skip"):
        continue
    im = band(t["path"])
    h = dhash(im)
    hashes.append("%016x" % h)
    for (lab, h2) in mine:
        d = bitsdiff(h, h2)
        if d <= NEAR:
            lines.append({"line": "STILL_REPEAT %s looks like %s (%d of 64 bits apart): two shots of one picture; give one its own" % (t["label"].split("  ")[0], lab, d), "fatal": False})
    mine.append((t["label"].split("  ")[0], h))
    best = None
    for k, hs in others.items():
        for h2 in hs:
            d = bitsdiff(h, h2)
            if best is None or d < best[1]:
                best = (k, d)
    if best and best[1] <= NOTE:
        fatal = best[1] <= NEAR
        lines.append({"line": "STILL_REPEAT %s is %s picture of %s (%d of 64 bits apart): never the same picture again; another place, light, camera or staging" % (t["label"].split("  ")[0], "the same" if fatal else "very close to a", best[0], best[1]), "fatal": fatal})
print(json.dumps({"hashes": hashes, "lines": lines}))
