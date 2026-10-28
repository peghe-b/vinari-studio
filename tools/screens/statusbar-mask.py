# The studio's ONE status bar (2026-10-26, plan step 1.2): a real iOS bar, cut once from two real captures, that every phone of
# the studio paints over the capture's own at render time (src/lib/statusbar.ts), so every screen reads 9:41, full signal,
# Wi-Fi and a full battery, whatever day and charge the capture was taken at. The capture files are never edited.
#   python3 tools/screens/statusbar-mask.py   ->  public/screens/_bar/statusbar.png (1080 x 120, black ink, the alpha is the glyph)
# Sources: the time, the signal and the Wi-Fi from 01-home (09-24, iPhone 16 Pro simulator at 9:41); the full battery (not the
# simulator's green charging one) from 23-home-104. Both on flat paper, so ink = (paper - pixel) / paper.
import os
import numpy as np
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SCR = os.path.join(ROOT, 'public', 'screens')
W, H = 1080, 120
# the parts, as boxes [x0, x1, y0, y1) on the mask; src/lib/statusbar.ts PARTS must match
PARTS = {'time': (156, 246, 56, 102), 'signal': (762, 823, 56, 102), 'wifi': (834, 889, 56, 102), 'battery': (898, 990, 56, 102)}


def ink(path, box, dx=0, dy=0):
    """the alpha of the dark glyphs in box (shifted by dx, dy on the source) against the paper above the bar"""
    a = np.asarray(Image.open(path).convert('L'), np.float32)
    x0, x1, y0, y1 = box
    paper = np.median(a[10:24, x0 + dx:x1 + dx], axis=0)
    cut = a[y0 + dy:y1 + dy, x0 + dx:x1 + dx]
    return np.clip((paper[None, :] - cut) / np.maximum(paper[None, :], 1), 0, 1)


def main():
    home = os.path.join(SCR, '_retired', '01-home.jpg')
    if not os.path.exists(home):
        home = os.path.join(SCR, '01-home.jpg')
    alpha = np.zeros((H, W), np.float32)
    for name in ('time', 'signal', 'wifi'):
        x0, x1, y0, y1 = PARTS[name]
        alpha[y0:y1, x0:x1] = ink(home, PARTS[name])
    # 23-home-104's battery sits 8 px right and 9 px lower than 01-home's (another simulator)
    x0, x1, y0, y1 = PARTS['battery']
    alpha[y0:y1, x0:x1] = ink(os.path.join(SCR, '23-home-104.jpg'), PARTS['battery'], dx=8, dy=9)
    alpha[alpha < 0.04] = 0  # the paper's JPEG noise
    out = np.zeros((H, W, 4), np.uint8)
    out[..., 3] = np.round(alpha * 255).astype(np.uint8)
    os.makedirs(os.path.join(SCR, '_bar'), exist_ok=True)
    Image.fromarray(out).save(os.path.join(SCR, '_bar', 'statusbar.png'), optimize=True)
    print('public/screens/_bar/statusbar.png')


if __name__ == '__main__':
    main()
