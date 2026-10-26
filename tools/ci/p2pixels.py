#!/usr/bin/env python3
"""Phase 2's pixel guards on stills (tools/p2-stills.mjs writes them; src/lib/p2.mjs is the gate).

    python3 tools/ci/p2pixels.py <dir>        reads <dir>/shots.json and <id>-<frame>.png / -txt.png, writes
                                              <dir>/report.json and <dir>/<id>.sheet.png; exit 1 when a guard fails
    python3 tools/ci/p2pixels.py --test       the self-test (synthetic frames, no render)

Guards (one still a shot: the settled frame, and frame 0):
  HUE_TWO     two non-grey hues in one frame (a shot with a real app screen is excepted: the product keeps its colour)
  EMPTY       less than 12 % of the stage (frame y 330..1440) carries ink (the luminance-spread test of the films audit)
  TEXT_EDGE   a text pixel (the text-only pass, key green elsewhere) outside frame x 65..1015
  HOOK_FRAME0 frame 0 of a film shows no text of 150 px or taller (the claim must read at frame 0)
"""
import json
import os
import sys

import numpy as np
from PIL import Image

KEY = np.array([0, 255, 0])
KEY_TOL = 110
TEXT_X = (65, 1015)
STAGE_Y = (330, 1440)
EMPTY_MIN = 0.12
HUE_MIN_SHARE = 0.004  # a hue counts when it covers 0.4 % of the frame (a hairline or a dot does not)
SCREEN_SCENES = {'ScreenFocus', 'TapTrail', 'ScreenDeck', 'Phone', 'PhoneDesk', 'WipeCompare'}


def hues(rgb):
    """The distinct non-grey hues of a frame, as 30-degree bins that each cover HUE_MIN_SHARE of it."""
    a = rgb.astype(np.float32) / 255.0
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    sat = (s > 0.38) & (mx > 0.22)
    if not sat.any():
        return []
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60
    hb = ((h[sat] + 15) // 30).astype(int) % 12
    counts = np.bincount(hb, minlength=12) / float(rgb.shape[0] * rgb.shape[1])
    # neighbouring bins are one hue (a red's anti-aliasing spills into orange)
    bins = [i for i in range(12) if counts[i] >= HUE_MIN_SHARE]
    groups = []
    for i in bins:
        if groups and (i - groups[-1][-1]) <= 1:
            groups[-1].append(i)
        else:
            groups.append([i])
    if len(groups) > 1 and groups[0][0] == 0 and groups[-1][-1] == 11:
        groups[0] = groups.pop() + groups[0]
    return [g[0] * 30 for g in groups]


def ink_share(rgb):
    """The share of the stage that carries ink: pixels whose luminance is 18+ away from the stage's own field."""
    y0, y1 = STAGE_Y
    lum = rgb[y0:y1].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    field = np.median(lum)
    return float((np.abs(lum - field) > 18).mean())


def text_mask(rgb):
    return np.abs(rgb.astype(np.int32) - KEY).sum(axis=2) > KEY_TOL


def text_edge(rgb):
    m = text_mask(rgb)
    cols = np.where(m.any(axis=0))[0]
    if not len(cols):
        return None
    return int(cols.min()), int(cols.max())


def tallest_text(rgb):
    """The tallest run of text rows (px): a rough cap height of the biggest line on screen."""
    rows = text_mask(rgb).any(axis=1)
    best = cur = 0
    for r in rows:
        cur = cur + 1 if r else 0
        best = max(best, cur)
    return best


def check_shot(all_rgb, txt_rgb, scene, frame, hook=True):
    out = []
    hs = hues(all_rgb)
    if len(hs) > 1 and scene not in SCREEN_SCENES:
        out.append(f'HUE_TWO: {len(hs)} hues ({", ".join(str(h) for h in hs)} deg); colour carries data only, one at a time')
    share = ink_share(all_rgb)
    if share < EMPTY_MIN:
        out.append(f'EMPTY: {share * 100:.1f} % of the stage carries ink (at least {EMPTY_MIN * 100:.0f} %)')
    if txt_rgb is not None:
        e = text_edge(txt_rgb)
        if e and (e[0] < TEXT_X[0] or e[1] > TEXT_X[1]):
            out.append(f'TEXT_EDGE: text from x {e[0]} to {e[1]} (frame x {TEXT_X[0]}..{TEXT_X[1]})')
        if frame == 0 and hook and tallest_text(txt_rgb) < 110:
            out.append('HOOK_FRAME0: no claim readable at frame 0 (a line about 150 px or more)')
    return out


def sheet(paths, out):
    tiles = [Image.open(p).convert('RGB').resize((270, 480)) for p in paths]
    if not tiles:
        return
    cols = min(6, len(tiles))
    rows = (len(tiles) + cols - 1) // cols
    im = Image.new('RGB', (cols * 280 + 10, rows * 490 + 10), (40, 40, 40))
    for i, t in enumerate(tiles):
        im.paste(t, (10 + (i % cols) * 280, 10 + (i // cols) * 490))
    im.save(out)


def main(d):
    shots = json.load(open(os.path.join(d, 'shots.json')))
    report = {'shots': [], 'failed': 0}
    by_id = {}
    for s in shots:
        a = os.path.join(d, f"{s['id']}-{s['frame']}.png")
        t = os.path.join(d, f"{s['id']}-{s['frame']}-txt.png")
        all_rgb = np.asarray(Image.open(a).convert('RGB'))
        txt_rgb = np.asarray(Image.open(t).convert('RGB')) if os.path.exists(t) else None
        probs = check_shot(all_rgb, txt_rgb, s.get('scene', ''), s['frame'], s.get('hook', True))
        report['shots'].append({**s, 'problems': probs})
        report['failed'] += bool(probs)
        by_id.setdefault(s['id'], []).append(a)
        print(f"{'FAIL' if probs else 'ok  '} {s['id']} @{s['frame']} {s.get('scene', '')}" + ''.join(f'\n     {p}' for p in probs))
    for i, ps in by_id.items():
        sheet(ps, os.path.join(d, f'{i}.sheet.png'))
    json.dump(report, open(os.path.join(d, 'report.json'), 'w'), indent=1, ensure_ascii=False)
    print(f"p2 pixels: {len(shots)} shots, {report['failed']} failed")
    return 1 if report['failed'] else 0


def self_test():
    bad = 0

    def ok(c, what):
        nonlocal bad
        bad += 0 if c else 1
        print(f"{'ok  ' if c else 'FAIL'} {what}")

    paper = np.full((1920, 1080, 3), 243, np.uint8)
    f = paper.copy()
    f[600:1000, 200:900] = 11  # an ink card: plenty of ink
    ok(check_shot(f, None, 'Receipt', 30) == [], 'paper and ink pass')
    ok(any(p.startswith('EMPTY') for p in check_shot(paper, None, 'Receipt', 30)), 'an empty paper frame fails EMPTY')
    two = f.copy()
    two[400:500, 200:500] = (224, 27, 27)  # red
    two[400:500, 600:900] = (31, 71, 182)  # blue
    ok(any(p.startswith('HUE_TWO') for p in check_shot(two, None, 'Receipt', 30)), 'red and blue in one frame fail HUE_TWO')
    ok(not any(p.startswith('HUE_TWO') for p in check_shot(two, None, 'ScreenFocus', 30)), 'a real screen keeps its colour')
    one = f.copy()
    one[400:500, 200:500] = (224, 27, 27)
    ok(not any(p.startswith('HUE_TWO') for p in check_shot(one, None, 'Receipt', 30)), 'one data hue passes')
    txt = np.zeros((1920, 1080, 3), np.uint8)
    txt[...] = KEY
    txt[700:900, 300:800] = 11
    ok(check_shot(f, txt, 'X', 30) == [], 'text inside x 65..1015 passes')
    wide = txt.copy()
    wide[700:900, 20:1060] = 11
    ok(any(p.startswith('TEXT_EDGE') for p in check_shot(f, wide, 'X', 30)), 'text past the edges fails TEXT_EDGE')
    small = np.zeros((1920, 1080, 3), np.uint8)
    small[...] = KEY
    small[700:740, 300:800] = 11
    ok(any(p.startswith('HOOK_FRAME0') for p in check_shot(f, small, 'X', 0)), 'frame 0 with only small text fails HOOK_FRAME0')
    ok(not any(p.startswith('HOOK_FRAME0') for p in check_shot(f, txt, 'X', 0)), 'frame 0 with a big claim passes')
    print(f'{bad} failed' if bad else 'all ok')
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        sys.exit(self_test())
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'out/p2'))
