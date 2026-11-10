#!/usr/bin/env python3
"""The owner's safe zone, checked on the finished film: every text and graphic inside x 110..970 above y 1110, x 110..870
below it, y 260..1620. Samples 6 frames a second; reports any frame with ink (luma < 200 or a saturated colour) outside it,
and writes the 1 fps sheet with the boxes drawn.   python3 safecheck.py film.mp4 sheet.jpg"""
import subprocess, sys
import numpy as np
FF = '/Users/admin/.vinari-tools/opuscar/bin/ffmpeg'
src, sheet = sys.argv[1], sys.argv[2]
W, H = 1080, 1920
raw = subprocess.run([FF, '-v', 'error', '-i', src, '-vf', 'fps=6', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], capture_output=True, check=True).stdout
fr = np.frombuffer(raw, np.uint8).reshape(-1, H, W, 3)
ok = np.zeros((H, W), bool)
ok[260:1110, 110:970] = True
ok[1110:1620, 110:870] = True
bad = []
for i, f in enumerate(fr):
    x = f.astype(np.int16)
    luma = 0.2126 * x[..., 0] + 0.7152 * x[..., 1] + 0.0722 * x[..., 2]
    sat = x.max(axis=2) - x.min(axis=2)
    ink = (luma < 200) | (sat > 40)
    out = ink & ~ok
    n = int(out.sum())
    if n > 40:
        ys, xs = np.nonzero(out)
        bad.append((i / 6, n, int(xs.min()), int(xs.max()), int(ys.min()), int(ys.max())))
for b in bad: print(f't {b[0]:5.2f}s  {b[1]:6d} px outside  x {b[2]}..{b[3]}  y {b[4]}..{b[5]}')
print('frames checked', len(fr), 'with ink outside the safe zone:', len(bad))
vf = ('fps=1,drawbox=x=110:y=260:w=860:h=850:color=red@0.85:t=5,drawbox=x=110:y=1110:w=760:h=510:color=red@0.85:t=5,'
      'drawbox=x=887:y=1110:w=193:h=810:color=blue@0.25:t=fill,scale=270:-1,tile=8x6:padding=6:color=gray')
subprocess.run([FF, '-v', 'error', '-y', '-i', src, '-vf', vf, '-frames:v', '1', '-q:v', '3', sheet], check=True)
print(sheet)
