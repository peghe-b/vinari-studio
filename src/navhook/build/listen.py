#!/usr/bin/env python3
"""Listen-check the hook's takes: one Gemini text-model request a take (audio in, verbatim text + notes out), cached next to
the wav (<wav>.transcript.txt). The key is read by the studio's tools/vo.py and never printed.
    python3 src/navhook/build/listen.py mom gio ...
"""
import base64, json, os, sys, urllib.request
sys.path.insert(0, '/Users/admin/Documents/Claude Projects/Vinari/video-studio/tools')
import vo  # noqa
HERE = os.path.join(os.path.dirname(__file__), '..', '..', '..', 'public', 'vo', 'navhook')
ASK = ("Transcribe this Georgian speech VERBATIM in Georgian script (Mkhedruli), exactly the words you hear. Then on a new "
       "line write NOTES: and in English say whether any word sounds wrong, mispronounced, cut off or unclear, and how the "
       "delivery sounds (age and gender of the speaker, pace, emotion, loud or quiet, natural or robotic).")
for lid in sys.argv[1:]:
    wav = os.path.join(HERE, f'{lid}.wav')
    cache = wav + '.transcript.txt'
    if not os.path.exists(cache):
        body = {"contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "audio/wav", "data": base64.b64encode(open(wav, 'rb').read()).decode()}}, {"text": ASK}]}],
                "generationConfig": {"temperature": 0}}
        req = urllib.request.Request(f"{vo.GEMINI_BASE}/v1beta/models/gemini-3.8-flash:generateContent", data=json.dumps(body).encode(),
                                     headers={"Content-Type": "application/json", "x-goog-api-key": vo.gemini_key()})
        j = json.loads(urllib.request.urlopen(req, timeout=180).read())
        open(cache, 'w', encoding='utf-8').write("".join(p.get("text", "") for p in j["candidates"][0]["content"]["parts"]))
    print('==', lid); print(open(cache, encoding='utf-8').read().strip())
