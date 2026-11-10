#!/usr/bin/env python3
"""The creator story's narrator: ONE take (Algieba) of the whole script, the approved setup of ~/.vinari-tools/zd/obd3/voice.py
(same model order, same buddy STYLE; only its film-specific pronunciation notes are this film's), cut into lines/NN.wav at
its real pauses by the obd70 letter DP. Writes public/vo/crpromo/take.wav and lines/NN.wav.
    python3 src/crpromo/build/voice.py [--again]"""
import os, sys, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools'); sys.path.insert(0, HERE)
import vo  # noqa
from script import LINES
OUT = os.path.join(STUDIO, 'public', 'vo', 'crpromo'); os.makedirs(f'{OUT}/lines', exist_ok=True)
STYLE = ('ოცდაათი წლის თბილისელი ბიჭი, მეგობარს მაგიდასთან ერთი ამოსუნთქვით უყვება ხრიკს, რაც ახლახან გაიგო: ბუნებრივად, '
         'ცოცხლად, თბილად, ოდნავ ეშმაკურად, არც დიქტორი, არც რეკლამა. გრძელი წინადადებები ერთ ნაკადად: მძიმეებთან მხოლოდ მცირე '
         'პაუზა, წერტილებთან მოკლე სუნთქვა. პირველი სიტყვა „თუ“ ცოცხლად, თითქოს ახლა ხედავ. „ვინარი“ ერთი სიტყვაა, '
         'ვი-ნა-რი. „ჩატჯიპიტი“ ერთი სიტყვაა. „ტიკტოკი“, „ინსტაგრამი“ და „იუთუბი“ ქართულად, ბუნებრივად.')
tag = sys.argv[sys.argv.index('--take') + 1] if '--take' in sys.argv else ''
take = f'{OUT}/take{tag}.wav'
if not os.path.exists(take):
    text = ' '.join(s for s, _ in LINES)
    for m in ['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts', 'gemini-3.1-flash-tts-preview', 'gemini-2.5-flash-preview-tts']:
        try: pcm = np.asarray(vo.gemini_request(text, 'gemini:Algieba', m, STYLE), dtype=np.int16); break
        except (vo.GeminiQuota, vo.GeminiUnavailable) as e: print(m, type(e).__name__)
    else: raise SystemExit('no take')
    with wave.open(take, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(vo.SR); w.writeframes(pcm.tobytes())
    print(m, f'{len(pcm) / vo.SR:.2f}s')
import importlib.util
spec = importlib.util.spec_from_file_location('v70', os.path.expanduser('~/.vinari-tools/zd/obd70/voices.py'))
src = open(spec.origin).read(); split_src = src[src.index('def read('):src.index("for spk in 'NBSG':")]
ns = {'np': np, 'wave': wave}; exec(split_src, ns)
a, sr = ns['read'](take); segs = ns['split'](a, sr, len(LINES), [len(s) for s, _ in LINES])
import json
json.dump([[x / sr, y / sr] for x, y in segs], open(f'{OUT}/segs{tag}.json', 'w'))
for i, (x, y) in enumerate(segs):
    x = max(0, x - int(0.04 * sr)); y = min(len(a), y + int(0.08 * sr)); seg = a[x:y]
    with wave.open(f'{OUT}/lines/{i:02d}{tag}.wav', 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(sr); w.writeframes((seg * 32767).astype(np.int16).tobytes())
    print(f'{i:02d} {x / sr:6.2f}..{y / sr:6.2f} {len(seg) / sr:5.2f}s {len(LINES[i][0]) / (len(seg) / sr):5.1f} l/s  {LINES[i][0]}')
print(f'take {len(a) / sr:.2f}s')
