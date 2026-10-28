#!/usr/bin/env python3
"""Build src/data/textw.mjs: the advance width (per 1 px of font size) of every character the films set, read from the
real font files at the weights the films use, so the lints (tools/ci/textfit.mjs, filmlint, --record, the cover) and the
render (src/lib/fit.ts) measure a line the same way, every time, with no browser.

The stack is the films' own (src/tokens.ts F.sans = 'FiraGO, NotoGeo'): FiraGO for Latin, digits, Mkhedruli and the lari
sign; Noto Sans Georgian (the condensed VF instance in public/fonts, weight axis 400..700) for the Mtavruli FiraGO lacks.
Kerning is left out: tools/ci/textfit.mjs adds a 2 % margin, which covers it.

    python3 tools/textfit-build.py          rebuild the table (only when a font file changes)
"""
import hashlib
import json
import os
import sys

from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FONTS = os.path.join(ROOT, 'public', 'fonts')
OUT = os.path.join(ROOT, 'src', 'data', 'textw.mjs')
FIRA = {400: 'FiraGO-Regular.otf', 500: 'FiraGO-Medium.otf', 600: 'FiraGO-SemiBold.otf', 700: 'FiraGO-Bold.otf'}
NOTO = 'NotoSansGeorgian-VF.ttf'

RANGES = [(0x20, 0x7E), (0xA0, 0xFF), (0x10D0, 0x10FF), (0x1C90, 0x1CBF), (0x2010, 0x2027), (0x2030, 0x203A), (0x20BE, 0x20BE), (0x2116, 0x2116), (0x2212, 0x2212)]


def sha(p):
    with open(p, 'rb') as f:
        return hashlib.sha256(f.read()).hexdigest()[:16]


def advances(font, chars):
    cmap = font.getBestCmap()
    hmtx = font['hmtx']
    upm = font['head'].unitsPerEm
    out = {}
    for c in chars:
        g = cmap.get(c)
        if g is not None:
            out[c] = round(hmtx[g][0] / upm, 4)
    return out


def main():
    chars = [c for a, b in RANGES for c in range(a, b + 1)]
    table = {'note': 'built by tools/textfit-build.py from public/fonts; advance per 1 px of size; never edit by hand', 'fonts': {}, 'w': {}}
    noto_vf = TTFont(os.path.join(FONTS, NOTO))
    table['fonts'][NOTO] = sha(os.path.join(FONTS, NOTO))
    for wt, fn in FIRA.items():
        table['fonts'][fn] = sha(os.path.join(FONTS, fn))
        fira = advances(TTFont(os.path.join(FONTS, fn)), chars)
        noto = advances(instantiateVariableFont(TTFont(os.path.join(FONTS, NOTO)), {'wght': wt}), [c for c in chars if 0x1C90 <= c <= 0x1CBF])
        row = {}
        for c in chars:
            v = noto.get(c) if 0x1C90 <= c <= 0x1CBF else fira.get(c)
            if v is not None:
                row[chr(c)] = v
        table['w'][str(wt)] = row
    del noto_vf
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write('// built by tools/textfit-build.py from public/fonts (never edit by hand)\nexport default ')
        json.dump(table, f, ensure_ascii=False, separators=(',', ':'), sort_keys=True)
        f.write(';\n')
    print(f'textw.mjs: {sum(len(r) for r in table["w"].values())} widths at {len(FIRA)} weights')


if __name__ == '__main__':
    sys.exit(main())
