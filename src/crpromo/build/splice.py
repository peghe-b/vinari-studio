#!/usr/bin/env python3
"""NOT USED for a delivered film: the owner stopped the v3 render and lays the two phrases on himself (phrases_export.py).
v3 (owner, 10 Nov): the v2 take untouched, with two phrases voiced alone (phrases.py) laid on: „შენთვის კარგი ამბავი
გვაქვს.“ before it and „წარმატებები.“ after it. Each phrase is matched to its neighbour's speech level (the RMS of its
voiced 10 ms windows: the opening to v2's first sentence, the wish to „ბმული სტორიშივეა.“ and 1 dB under it, warm), its own
silence trimmed to a 40 ms lead and a natural decay with soft fades, and joined by short breaths of the take's own pause
length (0.34 s and 0.42 s, the v2 take's sentence pauses run 0.3 to 0.5 s). Writes public/vo/crpromo/take.wav (the v2 take
is kept in v2/take.wav) and segs.json (12 lines).
The wish: voiced alone („წარმატებები.“) it came out higher and punchier than the take's last line, an audible seam; voiced
after its own sentence („ბმული სტორიშივეა. წარმატებები.“, two requests, the wish cut at the pause: ph_wish_c0/c1) take 1
continued the voice naturally (a blind A-D comparison by Gemini ranked it first twice, in two orders). Only that one word
of it is used; the sentence before it stays the v2 take's own."""
import json, os, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.abspath(os.path.join(HERE, '..', '..', '..')), 'public', 'vo', 'crpromo')
SR = 24000
def rd(p):
    w = wave.open(p); assert w.getframerate() == SR
    return np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
def voiced(a):
    hop = SR // 100; env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    return env, env > max(0.006, env.max() * 10 ** (-38 / 20))
def span(a):
    env, on = voiced(a); k = np.where(on)[0]; return k[0] / 100, (k[-1] + 1) / 100
def level(a, s=None, e=None):
    x = a[int((s or 0) * SR): int((e or len(a) / SR) * SR)]
    env, on = voiced(x); return 20 * np.log10(np.sqrt(np.mean(env[on] ** 2)))
def fade(x, fi=0.012, fo=0.06):
    x = x.copy(); ni, no = int(fi * SR), int(fo * SR)
    x[:ni] *= np.linspace(0, 1, ni); x[-no:] *= np.linspace(1, 0, no) ** 1.5; return x
take = rd(f'{OUT}/v2/take.wav'); segs = json.load(open(f'{OUT}/v2/segs.json'))
op, wi = rd(f'{OUT}/' + os.environ.get('OPEN_SRC', 'ph_open.wav')), rd(f'{OUT}/' + os.environ.get('WISH_SRC', 'ph_wish_c1.wav'))
os0, os1 = span(op); ws0, ws1 = span(wi); t0, t1 = span(take)
g_open = level(take, segs[0][0], segs[0][1]) - level(op, os0, os1)
g_wish = level(take, segs[-1][0], segs[-1][1]) - 1.0 - level(wi, ws0, ws1)
op_c = fade(op[int((os0 - 0.04) * SR): int(min(len(op) / SR, os1 + 0.12) * SR)]) * 10 ** (g_open / 20)
wi_c = fade(wi[int((ws0 - 0.04) * SR): int(min(len(wi) / SR, ws1 + 0.22) * SR)], fo=0.12) * 10 ** (g_wish / 20)
tk_c = take[int((t0 - 0.04) * SR): int(min(len(take) / SR, t1 + 0.12) * SR)]
GAP_OPEN, GAP_WISH = 0.34, float(os.environ.get('GAP_WISH', '0.42'))
z = lambda s: np.zeros(int(s * SR))
out = np.concatenate([op_c, z(GAP_OPEN - 0.12 - 0.04), tk_c, z(GAP_WISH - 0.12 - 0.04), wi_c, z(0.25)])
a_take = len(op_c) / SR + GAP_OPEN - 0.16 - (t0 - 0.04)   # where the v2 take's clock 0 lands on the new one
new_segs = [[0.0, len(op_c) / SR + (GAP_OPEN - 0.16) / 2]]
new_segs += [[x + a_take, y + a_take] for x, y in segs]
new_segs[1][0] = new_segs[0][1]
w0 = len(op_c) / SR + GAP_OPEN - 0.16 + len(tk_c) / SR + (GAP_WISH - 0.16) / 2
new_segs[-1][1] = w0
new_segs.append([w0, len(out) / SR])
with wave.open(f'{OUT}/take.wav', 'wb') as w:
    w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(out, -1, 1) * 32767).astype(np.int16).tobytes())
json.dump(new_segs, open(f'{OUT}/segs.json', 'w'))
print(f'opening gain {g_open:+.1f} dB, wish gain {g_wish:+.1f} dB; v2 take shifted by {a_take:+.3f} s; new take {len(out) / SR:.2f}s')
print('levels: v2 first line', round(level(take, *segs[0]), 1), 'opening', round(level(op_c), 1), '| v2 last line', round(level(take, *segs[-1]), 1), 'wish', round(level(wi_c), 1))
for i, (x, y) in enumerate(new_segs): print(i, round(x, 2), round(y, 2))
