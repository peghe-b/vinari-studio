#!/usr/bin/env python3
"""Check the cut lines (the obd3 way): join them with a short tone between, ask a Gemini text model to transcribe each
piece verbatim, so a cut that bleeds a syllable of the next line, or a misread word, shows up."""
import base64, io, json, os, sys, urllib.request, wave
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
STUDIO = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools'); sys.path.insert(0, HERE)
import vo  # noqa
from script import LINES
OUT = os.path.join(STUDIO, 'public', 'vo', 'crpromo'); SR = 24000
tag = sys.argv[sys.argv.index('--take') + 1] if '--take' in sys.argv else ''
parts = []
tone = (0.2 * np.sin(2 * np.pi * 1500 * np.arange(int(0.25 * SR)) / SR)).astype(np.float32)
for i in range(len(LINES)):
    w = wave.open(f'{OUT}/lines/{i:02d}{tag}.wav'); a = np.frombuffer(w.readframes(w.getnframes()), np.int16).astype(np.float32) / 32768
    parts += [a, np.zeros(int(0.3 * SR), np.float32), tone, np.zeros(int(0.3 * SR), np.float32)]
x = np.concatenate(parts); buf = io.BytesIO()
with wave.open(buf, 'wb') as w: w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x * 32767).astype(np.int16).tobytes())
prompt = (f'This Georgian audio has {len(LINES)} short pieces separated by a beep. Transcribe each piece exactly as spoken, '
          'in Georgian script, one numbered line per piece (00, 01, ...). Do not correct the words; if a piece holds two '
          'sentences, a cut word, or a stray syllable at its start or end, write what you hear. After the list write NOTES: '
          'in English: any mispronounced, unclear or cut-off word, and how natural the delivery sounds.')
body = {'contents': [{'parts': [{'text': prompt}, {'inline_data': {'mime_type': 'audio/wav', 'data': base64.b64encode(buf.getvalue()).decode()}}]}],
        'generationConfig': {'temperature': 0}}
for model in ('gemini-3.8-flash', 'gemini-flash-latest'):
    try:
        req = urllib.request.Request(f'{vo.GEMINI_BASE}/v1beta/models/{model}:generateContent', data=json.dumps(body).encode(),
                                     headers={'Content-Type': 'application/json', 'x-goog-api-key': vo.gemini_key()})
        j = json.loads(urllib.request.urlopen(req, timeout=180).read())
        txt = j['candidates'][0]['content']['parts'][0]['text']
        print(model); print(txt); open(f'{OUT}/asr{tag}.txt', 'w').write(txt); break
    except Exception as e: print(model, 'failed', str(e)[:120])
