#!/usr/bin/env python3
"""COVER_WEAK: measures a rendered cover's drawing (cover.art) the way the owner judges it (2026-11-04: "chaos, made
quickly, cheap; raise the engine from 2.0 to 5.0"). Reads the cover PNG (any scale of 1080x1920) and prints one JSON line:
  size     the drawing's bounding box (its strong edges) as a share of the art area under the headline: small = weak
  tones    how many grey levels the drawing really uses (8 bins, each over 1.5 % of its pixels): 2 = flat line art,
           5 and up = light, shading, materials
  busy     the share of edge pixels inside the drawing's box: high = scattered, chaotic
  weak     the reasons it fails, [] when it passes
    python3 tools/coverweak.py out/stills/<id>-cover.png [--top 800]
--top is where the art area starts in full-size pixels (under the headline); the grid's edge 1680 ends it."""
import json
import sys

import numpy as np
from PIL import Image

MIN_SIZE = 0.33
MIN_TONES = 4
MAX_BUSY = 0.125


def main():
    path = sys.argv[1]
    top = 800
    if '--top' in sys.argv:
        top = int(sys.argv[sys.argv.index('--top') + 1])
    im = Image.open(path).convert('L')
    im = im.resize((540, round(im.height * 540 / im.width)), Image.LANCZOS)  # one scale for every still: the half-size sheet's
    k = im.width / 1080
    a = np.asarray(im, dtype=np.float32)
    y0, y1 = int(top * k), int(1680 * k)
    reg = a[y0:y1]
    gy, gx = np.gradient(reg)
    mag = np.hypot(gx, gy)
    edges = mag > 18
    if edges.sum() < 50:
        print(json.dumps({'size': 0, 'tones': 0, 'busy': 0, 'weak': ['empty: no drawing under the headline']}))
        return
    ys, xs = np.nonzero(edges)
    bx0, bx1, by0, by1 = xs.min(), xs.max(), ys.min(), ys.max()
    size = float((bx1 - bx0) * (by1 - by0)) / (reg.shape[0] * reg.shape[1])
    box = reg[by0:by1 + 1, bx0:bx1 + 1]
    hist = np.histogram(box, bins=8, range=(0, 256))[0] / box.size
    tones = int((hist > 0.015).sum())
    busy = float(edges[by0:by1 + 1, bx0:bx1 + 1].mean())
    weak = []
    if size < MIN_SIZE:
        weak.append(f'small: the drawing fills {size:.0%} of the art area (at least {MIN_SIZE:.0%}): one object, big')
    if tones < MIN_TONES:
        weak.append(f'flat: {tones} grey levels (at least {MIN_TONES}): light it (Spot, Floor), shade its faces (Block, mat(), gradients), give it depth')
    if busy > MAX_BUSY:
        weak.append(f'busy: {busy:.0%} of its box is edges (at most {MAX_BUSY:.0%}): fewer, bigger shapes; one idea')
    print(json.dumps({'size': round(size, 3), 'tones': tones, 'busy': round(busy, 3), 'weak': weak}))


if __name__ == '__main__':
    main()
