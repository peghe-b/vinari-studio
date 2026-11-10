#!/usr/bin/env python3
"""v3 (owner, 10 Nov): the v2 take stays exactly as it is; only two short phrases are voiced, each its own request,
with the same voice (Algieba), the same model order (gemini-3.8-flash-tts first) and the SAME STYLE as voice.py:
„შენთვის კარგი ამბავი გვაქვს.“ (the opening) and „წარმატებები.“ (the closing wish). Writes public/vo/crpromo/ph_open.wav,
ph_wish.wav (24 kHz mono, as the take).
The wish voiced alone came out higher and punchier than the narrator's last line, so it is also voiced after its own
sentence („ბმული სტორიშივეა. წარმატებები.“, two requests) and cut at the pause: ph_wish_c0/c1. Take 1 continued the voice
best (a blind A-D comparison by Gemini ranked it first twice, in two orders); phrases_export.py delivers it."""
import os, sys, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools')
import vo  # noqa
src = open(os.path.join(HERE, 'voice.py')).read()
STYLE = eval(src[src.index('STYLE = (') + len('STYLE = '):src.index("tag = sys.argv")].strip())
OUT = os.path.join(STUDIO, 'public', 'vo', 'crpromo')
for name, text in [('ph_open', 'შენთვის კარგი ამბავი გვაქვს.'), ('ph_wish', 'წარმატებები.')]:
    path = f'{OUT}/{name}.wav'
    if os.path.exists(path): print(name, 'cached'); continue
    for m in ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']:
        try: pcm = np.asarray(vo.gemini_request(text, 'gemini:Algieba', m, STYLE), dtype=np.int16); break
        except (vo.GeminiQuota, vo.GeminiUnavailable) as e: print(m, type(e).__name__)
    else: raise SystemExit('no take')
    with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(vo.SR); w.writeframes(pcm.tobytes())
    print(name, m, f'{len(pcm) / vo.SR:.2f}s')

# the wish after its own sentence, cut at the longest pause (keeps 0.1 s before the word)
for k in range(2):
    path = f'{OUT}/ph_wishctx{k}.wav'
    if not os.path.exists(path):
        pcm = np.asarray(vo.gemini_request('ბმული სტორიშივეა. წარმატებები.', 'gemini:Algieba', 'gemini-3.8-flash-tts', STYLE), dtype=np.int16)
        with wave.open(path, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(vo.SR); w.writeframes(pcm.tobytes())
    w = wave.open(path); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float64) / 32768
    hop = vo.SR // 100; env = np.array([np.sqrt(np.mean(a[i:i + hop] ** 2)) for i in range(0, len(a) - hop, hop)])
    on = env > env.max() * 10 ** (-38 / 20); idx = np.where(on)[0]; s0, s1 = idx[0], idx[-1]; best = (0, 0, 0); i = s0
    while i < s1:
        if not on[i]:
            j = i
            while j < s1 and not on[j]: j += 1
            if j - i > best[0]: best = (j - i, i, j)
            i = j
        else: i += 1
    with wave.open(f'{OUT}/ph_wish_c{k}.wav', 'wb') as o:
        o.setnchannels(1); o.setsampwidth(2); o.setframerate(vo.SR); o.writeframes((a[max(0, best[2] * hop - int(0.1 * vo.SR)):] * 32767).astype(np.int16).tobytes())
