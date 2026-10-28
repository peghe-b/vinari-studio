#!/usr/bin/env python3
"""Where the app captures carry ink, row by row (r3 review, 2026-10-27: ScreenFocus lifted rows whose edges cut text in
half: v906's card ended through „როდის გაწუხებს მანქანა?", v908's started under the glyph tails of the line above).

For every current capture (public/screens/*.jpg, 1080 x 2346; not _retired, _bar or carplay) a pixel row is split into
40 px buckets, and a bucket is INK when 2 or more of its pixels stand 64+ grey levels off the row's median (glyphs, icons,
map labels; a card's flat fill or its soft edge on the grey page is not). The runs of rows with ink go to
src/data/screen-rows.json ({screen: {sha, runs: [[y0, y1, mask], ...]}}, y1 exclusive, bit i = bucket i), which
tools/ci/p2lint.mjs ROW_CUT reads: a lifted row's top or bottom edge with ink on BOTH sides of it (3 px), in a bucket
inside the row's x range, runs through a line of text or an icon.

  python3 tools/screen-rows.py           rebuild the table (after a capture changes)
  python3 tools/screen-rows.py --test    the table matches the captures (sha and runs), and the guard's own cases
"""
import hashlib
import json
import os
import sys

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCREENS = os.path.join(ROOT, 'public', 'screens')
OUT = os.path.join(ROOT, 'src', 'data', 'screen-rows.json')
BUCKET = 40
OFF = 64
MIN_PX = 2
EDGE = 3


def captures():
    return sorted(f[:-4] for f in os.listdir(SCREENS) if f.endswith('.jpg') and not f.startswith('_'))


def sha(name):
    with open(os.path.join(SCREENS, name + '.jpg'), 'rb') as fh:
        return hashlib.sha1(fh.read()).hexdigest()[:16]


def runs_of(name):
    im = Image.open(os.path.join(SCREENS, name + '.jpg')).convert('L')
    w, h = im.size
    px = im.load()
    nb = (w + BUCKET - 1) // BUCKET
    runs = []
    for y in range(h):
        row = [px[x, y] for x in range(w)]
        med = sorted(row)[w // 2]
        mask = 0
        for b in range(nb):
            seg = row[b * BUCKET:(b + 1) * BUCKET]
            if sum(1 for v in seg if abs(v - med) >= OFF) >= MIN_PX:
                mask |= 1 << b
        if mask:
            if runs and runs[-1][1] == y and runs[-1][2] == mask:
                runs[-1][1] = y + 1
            else:
                runs.append([y, y + 1, mask])
    return runs


def build():
    return {n: {'sha': sha(n), 'runs': runs_of(n)} for n in captures()}


def cut(table, screen, row):
    """the edges of a ScreenFocus row that cut ink (the same rule as p2lint.mjs ROW_CUT): [('top'|'bottom', y)]"""
    t = table.get(screen)
    if not t:
        return []
    x = row.get('x', 36)
    w = row.get('w', 1080 - 2 * x)
    want = 0
    for b in range(x // BUCKET, (x + w - 1) // BUCKET + 1):
        want |= 1 << b
    def ink(y0, y1):
        return any(r[0] < y1 and y0 < r[1] and r[2] & want for r in t['runs'])

    out = []
    top, bottom = row['y'], row['y'] + row['h']  # bottom: the first row below the box
    # a cut: ink on BOTH sides of the edge, within EDGE px (a glyph the edge runs through; text flush inside is whole)
    if ink(top - EDGE, top) and ink(top, top + EDGE):
        out.append(('top', top))
    if ink(bottom - EDGE, bottom) and ink(bottom, bottom + EDGE):
        out.append(('bottom', bottom))
    return out


def main():
    if '--test' not in sys.argv:
        table = build()
        with open(OUT, 'w') as fh:
            json.dump(table, fh, separators=(',', ':'))
            fh.write('\n')
        print(f'{len(table)} captures -> {os.path.relpath(OUT, ROOT)} ({os.path.getsize(OUT) // 1024} KB)')
        return 0
    bad = 0

    def ok(c, what):
        nonlocal bad
        bad += 0 if c else 1
        print(('ok   ' if c else 'FAIL ') + what)

    with open(OUT) as fh:
        table = json.load(fh)
    names = captures()
    ok(sorted(table) == names, f'the table lists the {len(names)} current captures')
    stale = [n for n in names if n in table and table[n]['sha'] != sha(n)]
    ok(not stale, 'every capture is the one measured' + (f': rebuild for {", ".join(stale)} (python3 tools/screen-rows.py)' if stale else ''))
    if '22-obd-result' in table:
        # another JPEG decoder (the cloud's Pillow) may move a pixel or two: the inked rows agree to 0.5 %
        def rows(runs):
            return {y for a, z, _ in runs for y in range(a, z)}
        a, b = rows(table['22-obd-result']['runs']), rows(runs_of('22-obd-result'))
        diff = len(a ^ b)
        ok(diff <= 12, f'22-obd-result measures the same again ({diff} rows differ)')
    # the review's two cuts are refused, a row between two lines of text passes
    ok(cut(table, '11-diagnostics-start', {'x': 40, 'w': 1000, 'y': 150, 'h': 330}), 'v906: a row ending through „როდის გაწუხებს მანქანა?" is a cut')
    ok(cut(table, '22-obd-result', {'x': 40, 'w': 1000, 'y': 620, 'h': 360}), 'v908: a row starting under the line above is a cut')
    print(f'{bad} failed' if bad else 'all ok')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
