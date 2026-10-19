"""The frame guards' measurements for tools/ci/guards.mjs (src/lib/guard.mjs; check.mjs, a film from GUARD_FROM on).

stdin: {"mode": "obj" | "fig" | "pic", "scale", "key": [r, g, b], "tol", "edge" (frame px), "band": {top, bottom, left, right}
        (frame px), "frames": [{"f", "path"}], for "pic" also "lag" (samples) and "shot" per frame (the shot's index)}
stdout: obj / fig: [{"f", "sides": "lrtb" letters the marked things touch, "band": px of them inside the subtitle band, "box":
        [x0, y0, x1, y1] frame px of everything marked or null}]
        pic: [{"f", "mad": the most any frame of the window (the `lag` samples up to this one, in one shot) differs from the
        window's first frame, as a mean absolute grey difference (0..255, 108 x 192), or null}]
The probe frames show only the marked things (lib/layer.ts OBJ / FIG) on a key-green field: a pixel farther than `tol` from the
key (RGB distance) is a thing; a soft shadow on the green stays under it. Pillow and numpy only (requirements.txt)."""
import json, sys
import numpy as np
from PIL import Image

a = json.load(sys.stdin)
s = a["scale"]
out = []
if a["mode"] in ("obj", "fig"):
    key = np.array(a["key"], np.float32)
    e = max(1, int(round(a["edge"] * s)))
    b = a["band"]
    by0, by1 = int(round(b["top"] * s)) + 1, int(round(b["bottom"] * s))
    bx0, bx1 = int(round(b["left"] * s)), int(round(b["right"] * s))
    for fr in a["frames"]:
        im = np.asarray(Image.open(fr["path"]).convert("RGB"), np.float32)
        m = np.sqrt(((im - key) ** 2).sum(axis=2)) > a["tol"]
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
        out.append({"f": fr["f"], "sides": sides, "band": int(m[by0:by1, bx0:bx1].sum()), "box": box})
else:
    lag = a["lag"]
    grey = []
    for fr in a["frames"]:
        g = np.asarray(Image.open(fr["path"]).convert("L").resize((108, 192), Image.BOX), np.float32)
        grey.append(g)
    for i, fr in enumerate(a["frames"]):
        j = i - lag
        mad = None
        # the window's frames against its first one: the most any of them moved away from it (a still window: all close)
        if j >= 0 and a["frames"][j]["shot"] == fr["shot"]:
            mad = round(max(float(np.abs(grey[k] - grey[j]).mean()) for k in range(j + 1, i + 1)), 3)
        out.append({"f": fr["f"], "mad": mad})
print(json.dumps(out))
