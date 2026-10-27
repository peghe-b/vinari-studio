#!/usr/bin/env python3
"""Phase 2's pixel guards on stills (tools/p2-stills.mjs writes them; src/lib/p2.mjs is the gate).

    python3 tools/ci/p2pixels.py <dir>        reads <dir>/shots.json and <id>-<frame>.png / -txt.png, writes
                                              <dir>/report.json and <dir>/<id>.sheet.png; exit 1 when a guard fails
    python3 tools/ci/p2pixels.py --test       the self-test (synthetic frames, no render)
    python3 tools/ci/p2pixels.py --film       the WHOLE film (tools/ci/guards.mjs, check.mjs, a P2 film): stdin {"scale",
                                              "key", "mark", "frames": [{"f", "pic", "txt"}]}, the probe's "pic" and "txt"
                                              passes every 6 frames; stdout one measure a sample (film_measure below)

The p2 prove run (2026-10-26) showed these guards only ever ran on the fixtures' stills: v136-lamp-two went out with amber,
red and green in one frame (54.5 s), white cards with nothing but lines on them (9-11.5 s), „∞" alone on a blank frame,
a headline under the figure's head and a glyph over the subtitle. So guards.mjs runs them on every sampled frame of a P2
film, and the hue test reads the studio's own data colours (DATA_HUES) instead of 30-degree bins: amber (38 deg) and red
(0 deg) were neighbouring bins and counted as one hue, and a thin green tick never reached the old 0.4 % share.

Guards (one still a shot: the settled frame, and frame 0):
  HUE_TWO     two non-grey hues in one frame (a shot with a real app screen is excepted: the product keeps its colour)
  EMPTY       less than 8 % of the stage (frame y 330..1440) carries ink (the luminance-spread test of the films audit; a white card counts)
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
EMPTY_MIN = 0.08  # measured on the fixtures: a frame-wide 260 px word over its line carries 9-11 %, a blank paper with one
# small label 2-4 %; the plan's 12 % failed honest typographic frames (KeywordLift), 8 % still catches the near-empty ones
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


# The studio's data colours (src/lib/p2.mjs P2_INK, P2_ACCENTS; tokens.ts up/down lines on both looks), as hue cores in
# degrees: the anti-aliased blend of two of them (a red strike over the amber lamp) falls between the cores and counts for
# neither. A saturated colour outside every core is "other" (a Film's own colour) and counts from OTHER_MIN.
DATA_HUES = {'red': (-10, 10), 'amber': (28, 48), 'green': (122, 152), 'teal': (180, 202), 'blue': (214, 236), 'violet': (244, 264)}
HUE_CORE_MIN = 0.0002  # a hue counts when its core covers 0.02 % of the frame: a thin tick or strike does (the prove run's 0.03-0.08 %)
OTHER_MIN = 0.004
WORD_COVER_PX = 8  # covered core pixels of one word (quarter size) ...
WORD_COVER_SHARE = 0.06  # ... and this share of it: a word with a mark, a figure or a photo through it


def data_hues(rgb):
    """The distinct data colours of a frame (names), each covering HUE_CORE_MIN of it, and 'other' for a big saturated rest."""
    a = rgb.astype(np.float32) / 255.0
    mx = a.max(axis=2)
    mn = a.min(axis=2)
    s = np.where(mx > 0, (mx - mn) / np.maximum(mx, 1e-6), 0)
    sat = (s > 0.45) & (mx > 0.3)
    if not sat.any():
        return []
    r, g, b = a[..., 0], a[..., 1], a[..., 2]
    d = np.maximum(mx - mn, 1e-6)
    h = (np.where(mx == r, ((g - b) / d) % 6, np.where(mx == g, (b - r) / d + 2, (r - g) / d + 4)) * 60)[sat]
    n = float(rgb.shape[0] * rgb.shape[1])
    out = []
    # at full size the Linux Chrome's subpixel (LCD) antialiasing paints black words with 1 px orange and blue fringes (the
    # fixtures' frame 0 read amber and blue); a data colour is a stroke 3 px and up, so a 1 px opening removes the fringe
    full = rgb.shape[1] >= 540
    if full:
        from scipy import ndimage
    hh = np.full(sat.shape, -1.0, np.float32)
    hh[sat] = h
    for name, (lo, hi) in DATA_HUES.items():
        m = ((hh >= lo % 360) & (hh <= hi)) if lo >= 0 else ((hh >= 360 + lo) | ((hh >= 0) & (hh <= hi)))
        if full:
            m = ndimage.binary_opening(m)
        if m.sum() / n >= HUE_CORE_MIN:
            out.append(name)
    # the blends between two cores are not a colour of their own; a big saturated rest is
    near = np.zeros(h.shape, bool)
    for lo, hi in DATA_HUES.values():
        near |= ((h >= (lo - 25) % 360) | (h <= hi + 25)) if lo - 25 < 0 else ((h >= lo - 25) & (h <= hi + 25))
    if (~near).sum() / n >= OTHER_MIN:
        out.append('other')
    return out


def ink_share(rgb):
    """The share of the stage that carries ink: pixels whose luminance is 18+ away from the stage's own field."""
    y0, y1 = STAGE_Y
    lum = rgb[y0:y1].astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
    field = np.median(lum)
    return float((np.abs(lum - field) > 10).mean())  # a white card on the paper (255 vs 243) is content too


def text_mask(rgb):
    m = np.abs(rgb.astype(np.int32) - KEY).sum(axis=2) > KEY_TOL
    m[:48, :48] = False  # the probe's subtitle mark (src/lib/guard.mjs PROBE_MARK), not text
    return m


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
    hs = data_hues(all_rgb)
    if len(hs) > 1 and scene not in SCREEN_SCENES:
        out.append(f'HUE_TWO: {len(hs)} hues ({", ".join(hs)}); colour carries data only, one at a time')
    share = ink_share(all_rgb)
    if share < EMPTY_MIN and (txt_rgb is None or tallest_text(txt_rgb) < 100):  # a big word alone (TypeDive's hold) is a frame
        out.append(f'EMPTY: {share * 100:.1f} % of the stage carries ink (at least {EMPTY_MIN * 100:.0f} %)')
    if txt_rgb is not None:
        e = text_edge(txt_rgb)
        if e and scene != 'TypeDive' and (e[0] < TEXT_X[0] or e[1] > TEXT_X[1]):  # TypeDive zooms through a letter on purpose
            out.append(f'TEXT_EDGE: text from x {e[0]} to {e[1]} (frame x {TEXT_X[0]}..{TEXT_X[1]})')
        if frame == 0 and hook and tallest_text(txt_rgb) < 110:
            out.append('HOOK_FRAME0: no claim readable at frame 0 (a line about 150 px or more)')
    return out


PALE = 14  # grey levels off the field that count as drawn (a pale paper map counts; a white card on the paper, 12, does not)
CARD_MIN = 0.03  # a white card covers this share of the picture band at least
CARD_EMPTY = 0.035  # ... and is empty under this share of ink inside (the prove run's cards with lines: 0.1-2.6 %; a card
# with a number, a quote or a table: 5.6 % and more on the fixtures and the films)


def emptiness(pic, scale):
    """The picture band (frame y 330..1440): "pale" its share drawn at all (PALE off the field), "card" the emptiest big white
    card's inner ink share (None without one). Measured 2026-10-27 on the prove run's sheets and the P2 fixtures: the empty
    frames (white cards with only lines, bare paper, a lone drawing) read pale 0.0-2.9 % or a card under 2.6 %; every fixture
    frame and every honest film frame pale 4.4 % and up with a card of 5.6 % and up."""
    g = pic.astype(np.float32) @ np.array([0.2126, 0.7152, 0.0722], np.float32)
    pb = g[int(round(330 * scale)):int(round(1440 * scale))]
    if not pb.size:
        return {'pale': None, 'card': None}
    med = float(np.median(pb))
    pale = float((np.abs(pb - med) > PALE).mean())
    card = None
    white = pb >= 250
    if white.any() and med < 248:
        from scipy import ndimage
        lab, n = ndimage.label(white)
        for k, sl in enumerate(ndimage.find_objects(lab), 1):
            if sl is None:
                continue
            area = int((lab[sl] == k).sum())
            if area < CARD_MIN * pb.size:
                continue
            box = pb[sl]
            inner = box[2:-2, 2:-2] if min(box.shape) > 6 else box
            ink = float((inner < 200).mean())
            card = ink if card is None else min(card, ink)
    return {'pale': round(pale, 4), 'card': None if card is None else round(card, 4)}


CLASH_DIFF = 45  # grey levels: a word's glyph or its 1 px halo standing on something this close to the word's own tone
CLASH_PX = 12  # ... at least this many pixels of one word (quarter size) ...
CLASH_SHARE = 0.05  # ... and this share of the word's glyph and halo: a head, a stroke or white paper under the word
CLASH_NEAR = 0.6  # a word at this part of CLASH_SHARE or more (and under it) is a near miss: p2-stills.mjs prints a note
PLATE_SOLID = 0.3  # an opaque plate in the text layer (a stamp, a chip, a price tag: lib/layer.ts puts the box in TXT, box
# and all): its own-tone fill is solid (this share survives a 2 px erosion at quarter size; a glyph's stroke never does:
# 0.0 for every word of the fixtures, 0.54 for WhoCard's „1976" stamp) ...
PLATE_INK = 0.1  # ... and holds ink of another tone inside its outline (this share of the fill, CLASH_PX at least: the stamp
# 0.24, a word's own counters are key green, 0-0.02). Its words stand on the plate, never on the picture it hides
# measured 2026-10-27 on the p3 prove films (v136-winter-digit, v137-dagen-h, rendered locally on estimated timings): a white
# claim on white paper while the iris opens 66-100 %, a white „W" on a washed-out photo 41 %, a key ring under white letters
# 20-25 %, a photo's own sticker lettering under „ახლიდან" 12-17 %, the receipt's ellipse through „რჩება" 5.7 % (22 px); every
# word on a clean card, on paper or on a calm dark photo 0-0.3 %


def clash_measure(txt, bare, core, text):
    """TEXT_CLASH (the p3 prove run, 2026-10-27): in the film the text layer is always on top, so nothing ever COVERS a word,
    but a word set over a figure's head, over a hand mark's stroke, over another picture's lettering or, white, over white
    paper while an iris opens, does not read. "bare" is the picture without its words (Promo's probe "bare"); for every
    word, its glyph and a 1 px halo round it are compared with what lies under them there: the pixels whose grey is within
    CLASH_DIFF of the word's own grey. A saturated red under a word is the strike-through itself, never counted.
    -> (number of clashing words, the worst share, [x0, y0, x1, y1] of the worst word in frame px at the caller's scale, the
    worst share of a word UNDER the stop when it is at least CLASH_NEAR of it, else 0: a near miss, which another machine's
    render may push over; the Mac read the WhoCard stamp at 3.1-4.9 %, the cloud at 5.1-5.7 %)"""
    from scipy import ndimage
    w = np.array([0.2126, 0.7152, 0.0722], np.float32)
    lt = txt.astype(np.float32) @ w
    b = bare.astype(np.float32)
    lb = b @ w
    red = (b[..., 0] > 150) & (b[..., 0] - np.maximum(b[..., 1], b[..., 2]) > 80)
    halo = ndimage.binary_dilation(core, iterations=1)
    # word by word (a 1 px dilation joins a word's letters, never two words): a stroke through one letter is a big share of it
    lab, n = ndimage.label(ndimage.binary_dilation(text, iterations=1))
    hits, worst, box, near = 0, 0.0, None, 0.0
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None:
            continue
        sel = lab[sl] == k
        g = core[sl] & sel
        if g.sum() < 12:
            continue
        own = float(np.median(lt[sl][g]))
        # an opaque plate is its words' own ground: the picture under it never reads through (CI 40441684606 failed the
        # story fixture on the white stamp's fill over the photo's bright wing, 5.1-5.7 % in the cloud, 3.1-4.9 % on the Mac)
        ink = ndimage.binary_fill_holes(g) & ~g & sel & text[sl] & (np.abs(lt[sl] - own) >= CLASH_DIFF)
        if int(ink.sum()) >= max(CLASH_PX, PLATE_INK * g.sum()) and ndimage.binary_erosion(g, iterations=2).sum() >= PLATE_SOLID * g.sum():
            continue
        reg = halo[sl] & sel & ~red[sl]
        if not reg.any():
            continue
        low = reg & (np.abs(lb[sl] - own) < CLASH_DIFF)
        nlow = int(low.sum())
        share = nlow / float(reg.sum())
        if nlow >= CLASH_PX and share >= CLASH_SHARE:
            hits += 1
            if share > worst:
                worst, box = share, [sl[1].start, sl[0].start, sl[1].stop, sl[0].stop]
        elif share >= CLASH_NEAR * CLASH_SHARE:
            near = max(near, share)
    return hits, round(worst, 3), box, round(near, 3)


def film_measure(pic, txt, scale, key, mark_rgb, mark_px, bare=None):
    """One sample of a P2 film (quarter size): the data hues of the picture, the text's horizontal extent (frame px), the
    text in the subtitle band (frame y 1440..1560, px at this scale) and whether a line was on (Promo's mark), the text the
    picture covers (core text pixels of the "txt" pass whose colour the "pic" pass does not show: a figure, a photo, a
    mark or another card over the words; a red strike is a strike, never counted), the tallest text (frame px) and its
    contrast with the picture round it."""
    H, W = pic.shape[:2]
    keyv = np.array(key, np.float32)
    t = txt.astype(np.float32)
    dist = np.sqrt(((t - keyv) ** 2).sum(axis=2))
    sub = False
    if mark_px:
        mp = int(np.ceil(mark_px * scale)) + 1
        sub = float(np.sqrt(((t[1, 1] - np.array(mark_rgb, np.float32)) ** 2).sum())) < 60
        dist[:mp, :mp] = 0
    text = dist > 110
    core = dist > 190
    out = {'hues': data_hues(pic), 'sub': sub, 'edge': None, 'band': 0, 'cover': 0, 'word': 0, 'clash': 0, 'clashShare': 0, 'clashBox': None, 'clashNear': 0, 'core': int(core.sum()), 'tall': 0, 'contrast': None, **emptiness(pic, scale)}
    if text.any():
        cols = np.where(text.any(axis=0))[0]
        out['edge'] = [round(float(cols.min()) / scale), round(float(cols.max() + 1) / scale)]
        y0, y1 = int(round(1440 * scale)), int(round(1560 * scale))
        out['band'] = int(text[y0:y1].sum())
        rows = text.any(axis=1)
        best = cur = 0
        for r in rows:
            cur = cur + 1 if r else 0
            best = max(best, cur)
        out['tall'] = round(best / scale)
    if core.any():
        p = pic.astype(np.float32)
        # a semi-transparent box (a stamp's or a chip's fill) is blended with the key green in this pass: not the word itself
        tg = t[..., 1] - np.maximum(t[..., 0], t[..., 2])
        pg = p[..., 1] - np.maximum(p[..., 0], p[..., 2])
        core = core & ~(tg - pg > 20)  # the key's green shows through it here, not in the picture
        # only a word's own colour counts: the anti-aliased edge of a red word on a see-through stamp is a blend of three
        # colours in this pass and of two in the picture (the humour fixture's „დაპირება" stamp read as covered)
        if core.any():
            from scipy import ndimage
            lab0, n0 = ndimage.label(ndimage.binary_dilation(text, iterations=3))
            if n0:
                own = np.zeros(core.shape, bool)
                for k in range(1, n0 + 1):
                    sel = core & (lab0 == k)
                    if not sel.any():
                        continue
                    med = np.median(t[sel], axis=0)
                    own |= sel & (np.abs(t - med).max(axis=2) <= 40)
                core = own
        if bare is not None and core.any():
            c, sh, bx, nr = clash_measure(txt, bare, core, text)
            out['clash'], out['clashShare'], out['clashNear'] = c, sh, nr
            out['clashBox'] = None if bx is None else [round(v / scale) for v in bx]
        # the two passes may lie a pixel apart (a small word's edges): a word pixel is covered only when no pixel round it in
        # the "txt" pass matches the picture
        diff = np.full(core.shape, 1e9, np.float32)
        for dy in (-1, 0, 1):
            for dx in (-1, 0, 1):
                ts = np.roll(np.roll(t, dy, axis=0), dx, axis=1)
                diff = np.minimum(diff, np.abs(p - ts).max(axis=2))
        # a red strike over the words is the strike-through itself (Ink "strike"), never a cover
        pr, pg, pb = p[..., 0], p[..., 1], p[..., 2]
        red = (pr > 150) & (pr - np.maximum(pg, pb) > 80)
        cov = core & (diff > 70) & ~red
        out['cover'] = int(cov.sum())
        # word by word: a thin mark through a small label is a small share of the frame's words but a big one of that label
        # (the prove run's ellipse through „შავი მოდენა")
        if cov.any():
            from scipy import ndimage
            lab, n = ndimage.label(ndimage.binary_dilation(text, iterations=3))
            if n:
                cc = np.bincount(lab[core], minlength=n + 1)
                cv = np.bincount(lab[cov], minlength=n + 1)
                share = np.where(cc > 0, cv / np.maximum(cc, 1), 0)
                hit = (cv >= WORD_COVER_PX) & (share >= WORD_COVER_SHARE)
                hit[0] = False
                out['word'] = int(hit.sum())
        ys, xs = np.nonzero(core)
        if ys.size:  # every word pixel may be a blend (a stamp alone): no contrast to read then
            lum = p @ np.array([0.2126, 0.7152, 0.0722], np.float32)
            ring = np.zeros_like(core)
            y0, y1, x0, x1 = max(0, ys.min() - 6), min(H, ys.max() + 7), max(0, xs.min() - 6), min(W, xs.max() + 7)
            ring[y0:y1, x0:x1] = True
            ring &= ~text
            if ring.any():
                out['contrast'] = round(abs(float(np.median(lum[core])) - float(np.median(lum[ring]))), 1)
    return out


def film_main():
    a = json.load(sys.stdin)
    s = float(a.get('scale', 0.25))
    mk = a.get('mark') or {'px': 0, 'rgb': [255, 0, 255]}
    res = []
    for fr in a['frames']:
        pic = np.asarray(Image.open(fr['pic']).convert('RGB'))
        txt = np.asarray(Image.open(fr['txt']).convert('RGB'))
        bare = np.asarray(Image.open(fr['bare']).convert('RGB')) if fr.get('bare') else None
        res.append({'f': fr['f'], **film_measure(pic, txt, s, a.get('key', [0, 255, 0]), mk['rgb'], mk['px'], bare)})
    print(json.dumps(res))
    return 0


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
    # the data hues (the prove run's 54.5 s: amber lamps, a red strike, a green tick, all thin)
    q = np.full((480, 270, 3), 243, np.uint8)
    q[100:160, 60:120] = (181, 122, 18)  # the amber lamp
    ok(data_hues(q) == ['amber'], f'one amber lamp: one hue ({data_hues(q)})')
    q2 = q.copy()
    q2[130:133, 50:130] = (224, 27, 27)  # a red strike over it
    q2[300:303, 60:90] = (15, 155, 55)  # a thin green tick
    ok(sorted(data_hues(q2)) == ['amber', 'green', 'red'], f'amber, a red strike and a green tick: three ({data_hues(q2)})')
    ok(any(p.startswith('HUE_TWO') for p in check_shot(np.asarray(Image.fromarray(q2).resize((1080, 1920), Image.NEAREST)), None, 'Receipt', 30)), 'the stills read them too')
    blend = q.copy()
    blend[100:160, 120:124] = (210, 80, 20)  # the anti-aliased seam between red and amber
    ok(data_hues(blend) == ['amber'], 'a seam between two data colours is no hue of its own')
    # the film measure: a headline under a figure, a glyph in the subtitle band, a strike that is a strike
    key = np.zeros((480, 270, 3), np.uint8)
    key[...] = (0, 255, 0)
    pic = np.full((480, 270, 3), 243, np.uint8)
    t = key.copy()
    t[100:140, 40:230] = 11  # a headline
    pic[100:140, 40:230] = 11
    m = film_measure(pic, t, 0.25, [0, 255, 0], [255, 0, 255], 24)
    ok(m['cover'] == 0 and m['band'] == 0 and m['edge'] == [160, 920] and m['tall'] == 160, f'a clean headline: nothing covered ({m})')
    pic2 = pic.copy()
    pic2[90:150, 100:140] = 40  # the figure's head over it (dark grey on black words: still another colour where it is grey)
    pic2[100:140, 100:140] = 120
    ok(film_measure(pic2, t, 0.25, [0, 255, 0], [255, 0, 255], 24)['cover'] > 1000, 'a head over the headline covers it')
    pic3 = pic.copy()
    pic3[118:122, 30:240] = (224, 27, 27)  # a red strike through it
    ok(film_measure(pic3, t, 0.25, [0, 255, 0], [255, 0, 255], 24)['cover'] == 0, 'a red strike through the words is a strike, not a cover')
    t4 = key.copy()
    t4[300:312, 100:170] = 11  # a small label
    pic4 = pic.copy()
    pic4[300:312, 100:170] = 11
    pic4[305:307, 90:180] = 120  # a hand-drawn ellipse's stroke through the label
    m4 = film_measure(pic4, t4, 0.25, [0, 255, 0], [255, 0, 255], 24)
    ok(m4['word'] == 1, f'an ellipse through a small label covers that word ({m4["cover"]} px of {m4["core"]})')
    t2 = key.copy()
    t2[350:400, 20:250] = 11  # a glyph down in the subtitle band
    t2[0:6, 0:6] = (255, 0, 255)  # a line is on
    m2 = film_measure(pic, t2, 0.25, [0, 255, 0], [255, 0, 255], 24)
    ok(m2['sub'] and m2['band'] > 0, f'a glyph in the subtitle band while a line is on ({m2["band"]} px)')
    # emptiness (the prove run's white cards with only lines, bare paper; the fixtures' honest typographic frames)
    paper = np.full((480, 270, 3), 242, np.uint8)
    lines = paper.copy()
    lines[150:260, 30:240] = 255  # a white card ...
    for y in (180, 210, 240):
        lines[y, 40:230] = 210  # ... with only hairlines on it
    e1 = emptiness(lines, 0.25)
    ok(e1['card'] is not None and e1['card'] < CARD_EMPTY, f'a white card with only lines is an empty card ({e1})')
    nums = lines.copy()
    nums[170:230, 60:200:6] = 11  # a big number's strokes inside it
    nums[170:230, 61:200:6] = 11
    ok(emptiness(nums, 0.25)['card'] >= CARD_EMPTY, 'a card with a big number on it is not')
    ok(emptiness(paper, 0.25)['pale'] == 0, 'bare paper: nothing drawn')
    # the fixtures' false alarms (the first cloud run, 2026-10-27)
    big = np.full((1920, 1080, 3), 243, np.uint8)
    big[600:760, 100:900] = 11
    big[600:760, 99] = (213, 136, 53)  # a 1 px LCD fringe each side of a black headline
    big[600:760, 900] = (12, 43, 91)
    ok(data_hues(big) == [], f'a black headline\'s 1 px LCD fringes are no data colour ({data_hues(big)})')
    big[800:860, 100:400] = (31, 71, 182)
    ok(data_hues(big) == ['blue'], 'the blue hero number still counts')
    stamp_t = key.copy()
    stamp_t[200:240, 60:200] = (153, 255, 153)  # a stamp's 60 % white fill over the key
    stamp_t[210:230, 80:180] = (224, 27, 27)  # its red word
    stamp_p = pic.copy()
    stamp_p[200:240, 60:200] = 255
    stamp_p[210:230, 80:180] = (224, 27, 27)
    ms_ = film_measure(stamp_p, stamp_t, 0.25, [0, 255, 0], [255, 0, 255], 24)
    ok(ms_['cover'] == 0 and ms_['word'] == 0, f'a stamp\'s see-through fill is not a cover ({ms_["cover"]})')
    sh_t = key.copy()
    sh_t[150:160, 100:160] = 255
    sh_p = np.full((480, 270, 3), 11, np.uint8)
    sh_p[150:160, 101:161] = 255  # the same white word one pixel to the right
    ok(film_measure(sh_p, sh_t, 0.25, [0, 255, 0], [255, 0, 255], 24)['word'] == 0, 'a word a pixel apart in the two passes is not covered')
    blend_t = key.copy()
    blend_t[200:240, 60:200] = (153, 255, 153)  # only a see-through fill, no word of its own colour
    ok(film_measure(pic, blend_t, 0.25, [0, 255, 0], [255, 0, 255], 24)['contrast'] is None, 'a frame whose only text is a see-through fill measures without failing')
    # TEXT_CLASH: what a word stands on in the film ("bare": the picture without its words)
    ck = key.copy()
    ck[100:140, 40:230] = 11  # a black headline
    cpic = pic.copy()
    cpic[100:140, 40:230] = 11
    cbare = np.full((480, 270, 3), 243, np.uint8)
    mc = film_measure(cpic, ck, 0.25, [0, 255, 0], [255, 0, 255], 24, cbare)
    ok(mc['clash'] == 0, f'a headline on clean paper: no clash ({mc["clashShare"]})')
    head = cbare.copy()
    head[90:150, 100:130] = 40  # a figure's dark head under it
    ok(film_measure(cpic, ck, 0.25, [0, 255, 0], [255, 0, 255], 24, head)['clash'] == 1, 'a head under the headline: a clash')
    wk = key.copy()
    wk[100:140, 40:230] = 245  # a white claim ...
    wpic = cpic.copy()
    wpic[100:140, 40:230] = 245
    ok(film_measure(wpic, wk, 0.25, [0, 255, 0], [255, 0, 255], 24, cbare)['clash'] == 1, 'a white claim on white paper: a clash')
    dark = np.full((480, 270, 3), 30, np.uint8)
    ok(film_measure(wpic, wk, 0.25, [0, 255, 0], [255, 0, 255], 24, dark)['clash'] == 0, 'a white claim on a calm dark photo: none')
    strike = cbare.copy()
    strike[118:122, 30:240] = (224, 27, 27)  # the red strike-through under the words
    ok(film_measure(cpic, ck, 0.25, [0, 255, 0], [255, 0, 255], 24, strike)['clash'] == 0, 'a red strike is the strike itself, never a clash')
    # an opaque plate (WhoCard's stamp: white fill, black border, black digits; all of it in the text layer) over a bright
    # photo: its digits stand on the plate, the photo under it never reads through
    pk = key.copy()
    pk[200:228, 150:208] = 11  # the border
    pk[202:226, 152:206] = 255  # the fill
    pk[207:221, 160:198] = 11  # the digits' block ...
    pk[210:218, 164:194] = 255  # ... with the fill between their strokes
    ppic = cpic.copy()
    ppic[200:228, 150:208] = pk[200:228, 150:208]
    bright = np.full((480, 270, 3), 236, np.uint8)  # a washed-out photo, the stamp's own tone
    ok(film_measure(ppic, pk, 0.25, [0, 255, 0], [255, 0, 255], 24, bright)['clash'] == 0, 'an opaque stamp over a bright photo: the plate is its own ground')
    bk = key.copy()
    bk[202:226, 152:206] = 255  # the same white fill with no ink on it is a white bar ...
    bpic = cpic.copy()
    bpic[202:226, 152:206] = 255
    ok(film_measure(bpic, bk, 0.25, [0, 255, 0], [255, 0, 255], 24, bright)['clash'] == 1, '... a blank white bar on white is still white on white')
    ok(film_measure(cpic, ck, 0.25, [0, 255, 0], [255, 0, 255], 24, head)['clash'] == 1, 'the plate rule leaves a solid black headline over a head a clash')
    # real pixels (CI run 40441684606, the story fixture's WhoCard at frame 12, Linux SwiftShader): the white „1976" stamp
    # over the photo's bright wing read 5.1 % and stopped the fixture; the plate rule makes it 0, and a dark block under
    # the name beside it still clashes
    here = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'testdata')
    ld = lambda m: np.asarray(Image.open(os.path.join(here, f'whocard-stamp-{m}.png')).convert('RGB')).copy()
    spic, stxt, sbare = ld('pic'), ld('txt'), ld('bare')
    sm = lambda p, b: film_measure(p, stxt, 0.25, [0, 255, 0], [255, 0, 255], 24, b)
    r0 = sm(spic, sbare)
    ok(r0['clash'] == 0, f'the cloud WhoCard stamp frame: no clash ({r0["clashShare"]}, near {r0["clashNear"]})')
    words = ~((stxt[..., 0] < 40) & (stxt[..., 1] > 200) & (stxt[..., 2] < 40))
    under = np.zeros(words.shape, bool)
    under[281:304, 34:177] = True  # the name „ნიკი ლაუდა" (quarter-size px)
    dpic, dbare = spic.copy(), sbare.copy()
    dbare[under] = 20
    dpic[under & ~words] = 20
    ok(sm(dpic, dbare)['clash'] >= 1, 'the same frame with a dark block under the name: a clash')
    global PLATE_SOLID, CLASH_SHARE
    keep = PLATE_SOLID, CLASH_SHARE
    try:
        PLATE_SOLID = 2.0  # the plate rule off: the stamp reads as a word on the bright wing again
        ok(sm(spic, sbare)['clash'] == 1, 'without the plate rule the cloud frame is the old TEXT_CLASH (the test sees the bug)')
        CLASH_SHARE = 0.06  # under a higher stop the same 5.1 % is a near miss
        rn = sm(spic, sbare)
        ok(rn['clash'] == 0 and rn['clashNear'] >= 0.05, f'a word under the stop but near it is reported as near ({rn["clashNear"]})')
    finally:
        PLATE_SOLID, CLASH_SHARE = keep
    print(f'{bad} failed' if bad else 'all ok')
    return 1 if bad else 0


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '--test':
        sys.exit(self_test())
    if len(sys.argv) > 1 and sys.argv[1] == '--film':
        sys.exit(film_main())
    sys.exit(main(sys.argv[1] if len(sys.argv) > 1 else 'out/p2'))
