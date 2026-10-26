"""The frame guards' measurements for tools/ci/guards.mjs (src/lib/guard.mjs; check.mjs, a film from GUARD_FROM on).

stdin: {"mode": "obj" | "fig" | "pic", "scale", "key": [r, g, b], "tol", "edge" (frame px), "band": {top, bottom, left, right}
        (frame px), "meta": {top, bottom, left, right} (frame px: the meta line's strip), "mark": {px, rgb} (the subtitle
        mark), "frames": [{"f", "path"}], for "pic" also "lag" (samples), "shot" per frame (the shot's index), "empty"
        {top, bottom} (frame px: the picture band read for EMPTY) and "shard" (the largest share of the frame a sliver
        may cover)}
stdout: obj / fig: [{"f", "sides": "lrtb" letters the marked things touch, "band": px of them inside the subtitle band, "box":
        [x0, y0, x1, y1] frame px of everything marked or null, "sub": a subtitle line is on screen (Promo's mark in the
        top left corner, left out of the rest)}]
        obj / fig also "meta": px of them inside the meta line's strip
        pic: [{"f", "mad": the most any frame of the window (the `lag` samples up to this one, in one shot) differs from the
        window's first frame, as a mean absolute grey difference (0..255, 108 x 192), or null, "ink": the share of the
        picture band farther than 24 grey levels from its own median (an almost empty frame: under EMPTY_SHARE), "shards":
        [[area px, x0, y0, x1, y1], ...] the thin slivers of another tone touching the frame's top edge (guard.mjs SHARD_AREA)}]
The probe frames show only the marked things (lib/layer.ts OBJ / FIG) on a key-green field: a pixel farther than `tol` from the
key (RGB distance) is a thing; a soft shadow on the green stays under it. Pillow, numpy and scipy (requirements.txt)."""
import json, sys
import numpy as np
from PIL import Image
from scipy import ndimage


def shards(g, most):
    """Thin slivers of another tone at the frame's top edge (a pillar's tip a camera uncovered, a corner of another shot):
    on a light picture the dark parts, on a dark one the light parts, touching the top edge, at most `most` of the frame,
    a corner wedge at most 4 % of the width across or a strip at most 2 % of the height tall."""
    H, W = g.shape
    med = float(np.median(g))
    if med > 150:
        m = g < med - 110
    elif med < 100:
        m = g > med + 110
    else:
        return []
    if not m[0].any():
        return []
    lab, n = ndimage.label(m)
    out = []
    for k, sl in enumerate(ndimage.find_objects(lab), 1):
        if sl is None or sl[0].start != 0:
            continue
        y0, y1, x0, x1 = sl[0].start, sl[0].stop, sl[1].start, sl[1].stop
        area = int((lab[sl] == k).sum())
        if area < 6 or area > most * W * H:
            continue
        bw, bh = x1 - x0, y1 - y0
        corner = x0 == 0 or x1 == W
        if (corner and min(bw, bh) <= 0.04 * W) or bh <= 0.02 * H:
            out.append([area, x0, y0, x1, y1])
    return out

a = json.load(sys.stdin)
s = a["scale"]
out = []
if a["mode"] in ("obj", "fig"):
    key = np.array(a["key"], np.float32)
    e = max(1, int(round(a["edge"] * s)))
    b = a["band"]
    by0, by1 = int(round(b["top"] * s)) + 1, int(round(b["bottom"] * s))
    bx0, bx1 = int(round(b["left"] * s)), int(round(b["right"] * s))
    mk = a.get("mark") or {"px": 0, "rgb": [255, 0, 255]}
    mpx = int(np.ceil(mk["px"] * s)) + 1 if mk["px"] else 0
    mrgb = np.array(mk["rgb"], np.float32)
    mb = a.get("meta") or {"top": 0, "bottom": 0, "left": 0, "right": 0}
    my0, my1 = int(round(mb["top"] * s)), int(round(mb["bottom"] * s))
    mx0, mx1 = int(round(mb["left"] * s)), int(round(mb["right"] * s))
    for fr in a["frames"]:
        im = np.asarray(Image.open(fr["path"]).convert("RGB"), np.float32)
        sub = bool(mpx) and float(np.sqrt(((im[1, 1] - mrgb) ** 2).sum())) < 60
        m = np.sqrt(((im - key) ** 2).sum(axis=2)) > a["tol"]
        if mpx:
            m[:mpx, :mpx] = False
        sides = ""
        if m[:, :e].any():
            sides += "l"
        if m[:, -e:].any():
            sides += "r"
        if m[:e, :].any():
            sides += "t"
        if m[-e:, :].any():
            sides += "b"
        ys, xs = np.nonzero(m)
        box = None if not ys.size else [round(float(xs.min()) / s), round(float(ys.min()) / s), round(float(xs.max() + 1) / s), round(float(ys.max() + 1) / s)]
        out.append({"f": fr["f"], "sides": sides, "band": int(m[by0:by1, bx0:bx1].sum()), "meta": int(m[my0:my1, mx0:mx1].sum()), "box": box, "sub": sub})
else:
    lag = a["lag"]
    em = a.get("empty") or {"top": 330, "bottom": 1440}
    most = float(a.get("shard") or 0.004)
    grey, ink, shard = [], [], []
    for fr in a["frames"]:
        full = np.asarray(Image.open(fr["path"]).convert("L"), np.float32)
        H = full.shape[0]
        pb = full[int(round(em["top"] * s)):int(round(em["bottom"] * s)), :]
        ink.append(round(float((np.abs(pb - np.median(pb)) > 24).mean()), 4) if pb.size else None)
        shard.append(shards(full, most))
        g = np.asarray(Image.fromarray(full.astype(np.uint8)).resize((108, 192), Image.BOX), np.float32)
        grey.append(g)
    for i, fr in enumerate(a["frames"]):
        j = i - lag
        mad = None
        # the window's frames against its first one: the most any of them moved away from it (a still window: all close)
        if j >= 0 and a["frames"][j]["shot"] == fr["shot"]:
            mad = round(max(float(np.abs(grey[k] - grey[j]).mean()) for k in range(j + 1, i + 1)), 3)
        out.append({"f": fr["f"], "mad": mad, "ink": ink[i], "shards": shard[i]})
print(json.dumps(out))
