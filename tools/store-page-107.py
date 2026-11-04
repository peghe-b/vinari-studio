"""26-appstore-page for 1.0.7: the real 14 Oct App Store capture with the 1.0.7 name, subtitle and screenshots
(the ones submitted with 1.0.7), the tab bar's glass rebuilt over the new screenshots and its icons lifted from the capture."""
import sys
import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
SRC, SHOTS, OUT = sys.argv[1], sys.argv[2], sys.argv[3]
old = Image.open(SRC).convert('RGB')
A = np.asarray(old).astype(np.float32)
im = old.copy()
d = ImageDraw.Draw(im)
SF = '/System/Library/Fonts/SFNS.ttf'
def font(size, weight):
    f = ImageFont.truetype(SF, size); f.set_variation_by_axes([100, 28 if size < 40 else 32, 400, weight]); return f
def fit(text, width, weight):
    s = 40
    while font(s + 1, weight).getlength(text) <= width: s += 1
    return s
# --- the name and subtitle: the old text's sizes measured by width, then the 1.0.7 words in the same places
d.rectangle((420, 640, 1075, 850), fill=(0, 0, 0))
ts = fit('Vinari: VIN &', 343, 600); ss = fit('Customs, deadlines, navigator', 569, 400)
tf, sf = font(ts, 600), font(ss, 400)
asc = lambda f, t: f.getbbox(t)[1]
d.text((428 - tf.getbbox('V')[0], 650 - asc(tf, 'V')), 'Vinari: Car Care &', font=tf, fill=(255, 255, 255))
d.text((428 - tf.getbbox('N')[0], 724 - asc(tf, 'N')), 'Navigator', font=tf, fill=(255, 255, 255))
d.text((429 - sf.getbbox('O')[0], 802 - asc(sf, 'O')), 'Offline GPS, OBD, VIN check', font=sf, fill=(150, 150, 155))
# --- the screenshots: two cards as on the page (x 53 and 711, top 1328, 631 wide, radius 63)
d.rectangle((0, 1300, 1080, 2346), fill=(0, 0, 0))
for i, x in enumerate((53, 711)):
    s = Image.open(f'{SHOTS}/vinari-ios-{i + 1}.png').convert('RGB')
    s = s.resize((631, round(631 * s.height / s.width)), Image.LANCZOS)
    m = Image.new('L', s.size, 0); ImageDraw.Draw(m).rounded_rectangle((0, 0, s.width - 1, s.height - 1), 63, fill=255)
    im.paste(s, (x, 1328), m)
# --- the tab bar: liquid glass as on the capture (owner 4 Nov: "more glass, like the original"): the screenshots stay
# visible through it, lightly blurred and dimmed, bent near the rim like a lens, a bright rim on top, the selected tab
# a denser grey pill
from scipy import ndimage
P = (58, 2116, 1022, 2280); SEL = (782, 2127, 1012, 2269)
U = np.asarray(im).astype(np.float32)
def pill_sdf(box, h, w):
    x0, y0, x1, y1 = box; r = (y1 - y0) / 2
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    cx = np.clip(xx, x0 + r, x1 - r); cy = (y0 + y1) / 2
    return np.hypot(xx - cx, yy - cy) - r, xx, yy, cx, cy   # < 0 inside
H, W = U.shape[:2]
sd, xx, yy, cx, cy = pill_sdf(P, H, W)
inside = sd < 0
band = 30.0
k = np.clip(1 + sd / band, 0, 1) ** 2 * inside      # 1 at the rim, 0 deeper than the band
nx, ny = xx - cx, yy - cy; nn = np.hypot(nx, ny) + 1e-6
src_x = xx + nx / nn * k * 16; src_y = yy + ny / nn * k * 16   # the rim samples from further out: a lens
bent = np.stack([ndimage.map_coordinates(U[..., c], [src_y, src_x], order=1, mode='nearest') for c in range(3)], -1)
soft = np.stack([ndimage.gaussian_filter(bent[..., c], 3.2) for c in range(3)], -1)
glass = soft * 0.46 + 46
sd2 = pill_sdf(SEL, H, W)[0]
selin = np.clip(0.5 - sd2, 0, 1)[..., None]
glass = glass * (1 - selin) + (soft * 0.34 + 52) * selin
# the rim: bright along the top, fainter round the sides, gone at the bottom; a soft shade under the bottom edge
ring = np.clip(1 - np.abs(sd + 1.5) / 1.6, 0, 1)
topness = np.clip((cy - yy) / ((P[3] - P[1]) / 2), -1, 1)
glass += (ring * (0.35 + 0.45 * np.clip(topness, 0, 1)) * 150)[..., None]
inner = np.clip(1 + sd / 10, 0, 1) * inside * np.clip(-topness, 0, 1)
glass -= (inner * 18)[..., None]
alpha = np.clip(0.5 - sd, 0, 1)[..., None]
U = U * (1 - alpha) + glass * alpha
im = Image.fromarray(np.clip(U, 0, 255).astype(np.uint8))
# the icons and labels, lifted from the capture: cores of pure ink only (white: every channel >= 226; cyan: blue far over
# red), grown by 2 px for their soft edges, the edge alpha read against the glass's own grey; never off the pill's rim
reg = A[P[1]:P[3], P[0]:P[2]]
mn = reg.min(2); cb = reg[..., 2] - reg[..., 0]
sdl = pill_sdf((0, 0, P[2] - P[0], P[3] - P[1]), P[3] - P[1], P[2] - P[0])[0]
keep = np.clip((-sdl - 8) / 4, 0, 1)
cw = (mn >= 226) & (keep > 0); cc = (cb >= 110) & (reg[..., 1] >= 140) & (keep > 0)
cw = ndimage.binary_opening(cw, iterations=1) | (cw & ndimage.binary_dilation(ndimage.binary_opening(cw, iterations=1), iterations=2))
nearw = ndimage.binary_dilation(cw, iterations=2); nearc = ndimage.binary_dilation(cc, iterations=2)
aw = np.where(cw, 1.0, np.clip((mn - 150) / 105, 0, 1) * nearw) * keep
ac = np.where(cc, 1.0, np.clip((cb - 20) / 110, 0, 1) * nearc) * keep
aw = np.where(ac > 0, 0, aw)
aw[106:] = 0; ac[106:] = 0   # the labels are drawn below in SF Pro (lifting lost their thin strokes)
cur = np.asarray(im).astype(np.float32)
blk = cur[P[1]:P[3], P[0]:P[2]]
blk = blk * (1 - aw[..., None]) + np.array([252, 252, 252], np.float32) * aw[..., None]
blk = blk * (1 - ac[..., None]) + np.array([52, 200, 236], np.float32) * ac[..., None]
cur[P[1]:P[3], P[0]:P[2]] = blk
K = 4
lay = Image.new('RGBA', ((P[2] - P[0]) * K, (P[3] - P[1]) * K), (0, 0, 0, 0)); g = ImageDraw.Draw(lay)
def lf(size):
    f = ImageFont.truetype(SF, size); f.set_variation_by_axes([100, 17, 400, 650]); return f
s = 20
while lf((s + 1) * K).getlength('Today') <= 79 * K: s += 1
f = lf(s * K)
for word, cxl, col in (('Today', 183.5, (252, 252, 252)), ('Games', 362, (252, 252, 252)), ('Apps', 539, (252, 252, 252)), ('Arcade', 717.5, (252, 252, 252)), ('Search', 895.5, (52, 200, 236))):
    bb = f.getbbox(word); base = f.getmetrics()[0]
    g.text(((cxl - P[0]) * K - (bb[0] + bb[2]) / 2, (2250 - P[1]) * K - base), word, font=f, fill=col + (255,))
lay = lay.resize((P[2] - P[0], P[3] - P[1]), Image.LANCZOS)
blk = Image.fromarray(np.clip(cur[P[1]:P[3], P[0]:P[2]], 0, 255).astype(np.uint8)).convert('RGBA')
cur[P[1]:P[3], P[0]:P[2]] = np.asarray(Image.alpha_composite(blk, lay).convert('RGB')).astype(np.float32)
print('labels', s)
Image.fromarray(np.clip(cur, 0, 255).astype(np.uint8)).save(OUT, quality=93)
print('->', OUT, 'title', ts, 'sub', ss)

# --- the status bar (owner 4 Nov: 9:41 and a full battery; the signal full too): the old marks painted out with the sky
# above and below them (a vertical blend per column), then drawn again at 4x and scaled down (soft edges)
im = Image.open(OUT).convert('RGB')
B = np.asarray(im).astype(np.float32)
for x0, y0, x1, y1 in ((118, 48, 236, 98), (816, 48, 850, 94), (924, 46, 1014, 96)):
    top, bot = B[y0 - 2, x0:x1], B[y1 + 2, x0:x1]
    t = np.linspace(0, 1, y1 - y0)[:, None, None]
    B[y0:y1, x0:x1] = top[None] * (1 - t) + bot[None] * t
im = Image.fromarray(np.clip(B, 0, 255).astype(np.uint8))
K = 4
lay = Image.new('RGBA', (1080 * K, 140 * K), (0, 0, 0, 0))
g = ImageDraw.Draw(lay)
INK = (12, 12, 14, 255)
# 9:41, SF semibold, digits as tall as the old ones (y 56-88), centred where the old time was
tf = ImageFont.truetype(SF, 45 * K); tf.set_variation_by_axes([100, 28, 400, 600])
bb = tf.getbbox('9:41')
s = 33 * K / (bb[3] - bb[1])
tf = ImageFont.truetype(SF, round(45 * K * s)); tf.set_variation_by_axes([100, 28, 400, 600])
bb = tf.getbbox('9:41')
cx = 174.5 * K
g.text((cx - (bb[0] + bb[2]) / 2, 56 * K - bb[1]), '9:41', font=tf, fill=INK)
for x0, x1, y0 in ((821, 830, 59), (835, 845, 53)):
    g.rounded_rectangle((x0 * K, y0 * K, x1 * K, 89 * K), 3 * K, fill=INK)
g.rounded_rectangle((930 * K, 52 * K, 1001 * K, 91 * K), 12 * K, fill=INK)
g.rounded_rectangle((1003 * K, 65 * K, 1008 * K, 78 * K), 2 * K, fill=(12, 12, 14, 150))
lay = lay.resize((1080, 140), Image.LANCZOS)
top = im.crop((0, 0, 1080, 140)).convert('RGBA')
im.paste(Image.alpha_composite(top, lay).convert('RGB'), (0, 0))
im.save(OUT, quality=93)
print('status bar: 9:41, full battery and signal')
