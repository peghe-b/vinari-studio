#!/usr/bin/env python3
"""The creator story's timeline from the measured take (public/vo/crpromo/take.wav, its line spans segs.json):
every word's start (the studio's vo.word_starts: letters + the take's own pauses, ~50 ms), the subtitle chunks (the studio
standard: 58 px, a chunk as wide as the safe band allows, about 4-5 words, broken after a comma once it is 12+ letters),
and the named cues the shots are cut to. Writes src/crpromo/timeline.json.  python3 src/crpromo/build/plan.py"""
import json, os, re, sys, wave
import numpy as np
from PIL import ImageFont
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools'); sys.path.insert(0, HERE)
import vo  # noqa
from script import LINES
OUT = os.path.join(STUDIO, 'public', 'vo', 'crpromo')
TAKE_AT = 0.10          # the take starts this far into the film (its first word ~0.3 s: the voice in the first second)
END_HOLD = 1.55         # the end card holds this long after the last word
FONT = ImageFont.truetype(os.path.join(STUDIO, 'public', 'fonts', 'NotoSansGeorgian-VF.ttf'), 58)
try: FONT.set_variation_by_axes([500])
except Exception: pass
MAXW = 730              # px: the subtitle band (110..870 under y 1110) minus a little air
mt = lambda s: ''.join(chr(ord(c) + 0xbc0) if 'ა' <= c <= 'ჺ' else (c.upper() if c.isascii() else c) for c in s)
width = lambda s: FONT.getlength(mt(s))

w = wave.open(f'{OUT}/take.wav'); pcm = np.frombuffer(w.readframes(w.getnframes()), np.int16)
segs = json.load(open(f'{OUT}/segs.json'))
on, off, _, rms, loud = vo.whole_pauses(pcm.astype(np.int64).tolist())[:5]

def speech(s, e):
    k0, k1 = int(s * 100), min(len(loud), int(e * 100))
    ks = [k for k in range(k0, k1) if loud[k]]
    return (ks[0] / 100, (ks[-1] + 1) / 100) if ks else (s, e)

lines, chunks, words_all = [], [], []
for i, ((say, show), (s, e)) in enumerate(zip(LINES, segs)):
    s, e = speech(s, e)
    said = [t for t in say.split() if vo.norm(t)]
    st = vo.word_starts(s, e, said, loud)
    shown = show.split()
    sh = vo.shown_starts(said, st, shown, at=s)
    words = [{'w': t, 't': round(TAKE_AT + x, 3)} for t, x in zip(shown, sh)]
    lines.append({'say': say, 'show': show, 'start': round(TAKE_AT + s, 3), 'end': round(TAKE_AT + e, 3), 'words': words})
    # chunks: clause by clause (a comma, a stop or a closing quote ends one); a clause wider than the band is split
    # where the widest piece is narrowest; a lone short word joins its neighbour when the pair still fits
    clauses, cur = [], []
    for k, wd in enumerate(words):
        if wd['w'].startswith('„') and cur:
            clauses.append(cur); cur = []
        cur.append(wd)
        if re.search(r'[,.?!:]$|[?!.]“$', wd['w']) or k == len(words) - 1:
            clauses.append(cur); cur = []
    if cur: clauses.append(cur)
    pieces = []
    for cl in clauses:
        n = len(cl)
        best = None
        for parts in range(1, n + 1):
            # the best split of cl into `parts` runs: brute force over cut sets (clauses are short)
            import itertools
            for cuts in itertools.combinations(range(1, n), parts - 1):
                runs = [cl[a:b] for a, b in zip((0,) + cuts, cuts + (n,))]
                ws = [width(' '.join(x['w'] for x in r)) for r in runs]
                if max(ws) <= MAXW and (best is None or max(ws) < best[0]):
                    best = (max(ws), runs)
            if best: break
        pieces += best[1] if best else [[x] for x in cl]
    merged = []
    for r in pieces:
        txt = ' '.join(x['w'] for x in r)
        if merged and len(txt) <= 8 and width(' '.join(x['w'] for x in merged[-1] + r)) <= MAXW:
            merged[-1] = merged[-1] + r
        else:
            merged.append(r)
    for j, r in enumerate(merged):
        end_t = merged[j + 1][0]['t'] if j + 1 < len(merged) else round(TAKE_AT + e, 3)
        chunks.append({'text': ' '.join(x['w'] for x in r), 'start': r[0]['t'], 'end': end_t, 'words': [dict(x) for x in r], 'line': i})
    words_all += [(i, k, x) for k, x in enumerate(words)]
# a chunk that would leave a lone short word: merge it back if it fits
total = round(lines[-1]['end'] + END_HOLD, 3)

def cue(line, word, nth=0):
    hits = [x for (i, k, x) in words_all if i == line and word in x['w']]
    return hits[nth]['t']
cues = {
    'kodit': cue(0, 'კოდით'), 'gadakhda': cue(0, 'გადახდიდან'), 'wili': cue(0, 'წილი'),
    'manqana': cue(1, 'მანქანა'), 'gza': cue(1, 'გზა'), 'teqnika': cue(1, 'ტექნიკა'), 'tiktok': cue(1, 'TikTok'), 'insta': cue(1, 'Instagram'), 'yt': cue(1, 'YouTube'), 'sul': cue(1, 'სულ'),
    'plus': cue(2, 'VINARI'), 'chagirtavt': cue(2, 'ჩაგირთავთ'), 'piradi': cue(2, 'პირად'),
    'mayurebeli': cue(3, 'მაყურებელი'), 'gakhsnis': cue(3, 'გახსნის'), 'ekranze': cue(3, 'ეკრანზე'), 'rogor': cue(3, 'როგორ'), 'shens': cue(3, 'შენს'), 'chawers': cue(3, 'ჩაწერს'),
    'itvleba': cue(4, 'ითვლება'), 'namdvili': cue(4, 'ნამდვილი'), 'tviuri': cue(4, 'თვიური'), 'wliuri': cue(4, 'წლიური'), 'ganakhleba': cue(4, 'განახლებაც'),
    'tan': cue(5, 'თან'), 'faili': cue(5, 'ფაილს'), 'chatgpt': cue(5, 'ChatGPT'), 'skrinebs': cue(5, 'სქრინებს'), 'frazas': cue(5, 'ფრაზას'),
    'saitze': cue(6, 'საიტზე'), 'bolomde': cue(6, 'ბოლომდე'), 'blokis': cue(6, 'ბლოკს'), 'daachire': cue(6, 'დააჭირე'), 'mokle': cue(6, 'მოკლე'), 'shეavse': cue(6, 'შეავსე'),
    'sakheli': cue(7, 'სახელი'), 'meili': cue(7, 'მეილი'), 'arkhi': cue(7, 'არხი'), 'auditoria': cue(7, 'აუდიტორია'), 'tema': cue(7, 'თემა'), 'tankhmoba': cue(7, 'თანხმობა'), 'gagzavna': cue(7, 'გაგზავნა'),
    'chven': cue(8, 'ჩვენ'), 'arkhebs': cue(8, 'არხებს'), 'kods': cue(8, 'კოდს'), 'meilze': cue(8, 'მეილზე'),
    'bmuli': cue(9, 'ბმული'),
}
cues = {k.replace('ე', 'e'): v for k, v in cues.items()}
tl = {'total': total, 'fps': 30, 'takeAt': TAKE_AT, 'lines': lines, 'chunks': chunks, 'cues': cues}
json.dump(tl, open(os.path.join(STUDIO, 'src', 'crpromo', 'timeline.json'), 'w'), ensure_ascii=False, indent=1)
for c in chunks: print(f"{c['start']:6.2f}..{c['end']:6.2f} {round(width(c['text'])):4d}px  {c['text']}")
print('total', total)
print(json.dumps(cues, ensure_ascii=False))
