#!/usr/bin/env python3
"""The GL transitions' pixel check (src/lib/gltrans.mjs; tools/gltrans-stills.mjs writes <dir>/gl.json and the stills).

  python3 tools/ci/glprobe.py <dir>     check the gl-probe-diff stills, write the contact sheets; exit 1 on a failure
  python3 tools/ci/glprobe.py --test    the self-test

A diff still (1080 x 2000): the WebGL mask at p 0.5 (left 540 x 960) beside the CPU twin (right), the rims below, and a status
strip at y 1920..2000: green when WebGL 2 drew the left half, red when the CPU fallback did. It fails when the strip is not
green (no WebGL on this GL backend), when a mask is trivial (all one shot at p 0.5), or when the halves disagree: the mean
alpha difference over 1.5 / 255, or more than 0.5 % of the pixels off by over 64 (an anti-aliased step may move one pixel).
"""
import json
import os
import sys

import numpy as np
from PIL import Image

MEAN_MAX = 1.5
FAR = 64
FAR_SHARE = 0.005


def compare(a, b):
    d = np.abs(a.astype(np.int16) - b.astype(np.int16))
    return float(d.mean()), float((d > FAR).mean())


def check_diff(rgb):
    """problems of one diff still (an RGB array 2000 x 1080), [] when it passes"""
    probs = []
    strip = rgb[1930:1990, 10:90].reshape(-1, 3).mean(axis=0)
    if not (strip[1] > 150 and strip[0] < 80):
        probs.append(f'GL_ENGINE the status strip is not green ({strip.round().tolist()}): WebGL 2 did not draw (the CPU fallback did)')
    g = rgb[:, :, 1]
    for name, y0, trivial_ok in (('mask', 0, False), ('rim', 960, True)):
        left, right = g[y0:y0 + 960, 0:540], g[y0:y0 + 960, 540:1080]
        mean, far = compare(left, right)
        if mean > MEAN_MAX or far > FAR_SHARE:
            probs.append(f'GL_TWIN the {name} differs from its CPU twin: mean {mean:.2f}/255, {far * 100:.2f} % of the pixels off by over {FAR}')
        share = float(left.mean()) / 255
        if not trivial_ok and not (0.03 < share < 0.97):
            probs.append(f'GL_TRIVIAL the mask at p 0.5 shows {share * 100:.1f} % of the incoming (all one shot)')
    return probs


def sheet(paths, out, cols, w=216, h=384):
    tiles = [Image.open(p).convert('RGB').resize((w, h)) for p in paths]
    if not tiles:
        return
    cols = min(cols, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    im = Image.new('RGB', (cols * (w + 10) + 10, rows * (h + 10) + 10), (40, 40, 40))
    for i, t in enumerate(tiles):
        im.paste(t, (10 + (i % cols) * (w + 10), 10 + (i // cols) * (h + 10)))
    im.save(out)


def main(d):
    rep = json.load(open(os.path.join(d, 'gl.json')))
    failed = 0
    out = {'diff': []}
    for p in rep.get('diff', []):
        rgb = np.asarray(Image.open(p).convert('RGB'))
        probs = check_diff(rgb)
        g = rgb[:, :, 1]
        m, _ = compare(g[0:960, 0:540], g[0:960, 540:1080])
        out['diff'].append({'png': os.path.basename(p), 'mean': round(m, 3), 'problems': probs})
        failed += bool(probs)
        print(f"{'FAIL' if probs else 'ok  '} {os.path.basename(p)}: GL vs CPU mean {m:.3f}/255" + ''.join(f'\n     {x}' for x in probs))
    if rep.get('diff'):
        sheet(rep['diff'], os.path.join(d, 'diff.sheet.png'), 7, 216, 400)
    if rep.get('show'):
        sheet(rep['show'], os.path.join(d, 'show.sheet.png'), 5)
    films = {}
    for f in rep.get('film', []):
        films.setdefault(f['id'], []).append(f['png'])
    for i, ps in films.items():
        sheet(ps, os.path.join(d, f'{i}.sheet.png'), 4)
    json.dump(out, open(os.path.join(d, 'glprobe.json'), 'w'), indent=1)
    print(f"gl probe: {len(rep.get('diff', []))} diff stills, {failed} failed")
    return 1 if failed else 0


def self_test():
    bad = 0

    def ok(cond, what):
        nonlocal bad
        bad += 0 if cond else 1
        print(f"{'ok  ' if cond else 'FAIL'} {what}")

    rgb = np.zeros((2000, 1080, 3), np.uint8)
    rgb[0:960, 0:270] = 255
    rgb[0:960, 540:810] = 255
    rgb[1920:2000, :] = (0, 200, 0)
    ok(check_diff(rgb) == [], 'a GL mask equal to its twin, the strip green: passes')
    red = rgb.copy()
    red[1920:2000, :] = (220, 0, 0)
    ok(any(p.startswith('GL_ENGINE') for p in check_diff(red)), 'the CPU fallback drew it: GL_ENGINE')
    off = rgb.copy()
    off[0:960, 540:1080] = 0
    ok(any(p.startswith('GL_TWIN') for p in check_diff(off)), 'the halves disagree: GL_TWIN')
    flat = rgb.copy()
    flat[0:960, :] = 0
    ok(any(p.startswith('GL_TRIVIAL') for p in check_diff(flat)), 'nothing of the incoming at p 0.5: GL_TRIVIAL')
    print('glprobe: all ok' if not bad else f'glprobe: {bad} failed')
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        sys.exit(self_test())
    sys.exit(main(sys.argv[1]))
