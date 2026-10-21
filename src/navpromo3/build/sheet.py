#!/usr/bin/env python3
"""A contact sheet of stills: python3 sheet.py <out.png> <frame pngs...> (the frame number printed under each)."""
import os
import re
import sys

from PIL import Image, ImageDraw

out, files = sys.argv[1], sys.argv[2:]
ims = [Image.open(f).convert("RGB") for f in files]
tw = 270
th = int(ims[0].height * tw / ims[0].width)
cols = min(8, len(ims))
rows = (len(ims) + cols - 1) // cols
pad = 22
sheet = Image.new("RGB", (cols * (tw + 6) + 6, rows * (th + pad + 6) + 6), (128, 128, 128))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x = 6 + (i % cols) * (tw + 6)
    y = 6 + (i // cols) * (th + pad + 6)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    m = re.search(r"-(\d+)\.png$", os.path.basename(f))
    fr = int(m.group(1)) if m else 0
    d.text((x + 4, y + th + 4), f"{fr}  {fr / 30:.2f}s", fill=(0, 0, 0))
sheet.save(out)
print(out)
