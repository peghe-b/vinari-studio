#!/usr/bin/env python3
"""Listen-check a take island by island: ONE Gemini text-model request per take (audio in, numbered text out).

    python3 src/navpromo3/build/islands_check.py nav|her|narr

The take's speech islands (plan.py's own cut: pauses of 0.15 s under the peak - 38 dB) are laid end to end with 1.2 s of
silence between them, and the model writes what each numbered segment says. Cached next to the take
(<take>.islands.txt), so a second look costs nothing. The key is read by tools/vo.py and never printed.
"""
import base64
import json
import os
import sys
import urllib.request

import numpy as np

from common import OUT, SR, STUDIO, ff, load_json, pauses, read_wav, speech_span, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
MODEL = "gemini-3.8-flash"


def islands(a, min_len=0.15, rel=-38.0):
    on, off = speech_span(a, -40)
    ps = [p for p in pauses(a, min_len, rel) if p[0] > on + 0.05 and p[1] < off - 0.05]
    out, s = [], on
    for p0, p1 in ps:
        out.append((s, p0))
        s = p1
    out.append((s, off))
    return out


def main():
    name = sys.argv[1]
    V = load_json(os.path.join(OUT, "voices.json"))
    src = os.path.join(OUT, V[name]["file"])
    cache = src + ".islands.txt"
    if os.path.exists(cache):
        print(open(cache, encoding="utf-8").read())
        return
    a = read_wav(src)
    isl = islands(a)
    gap = np.zeros(int(1.2 * SR), np.float32)
    parts = []
    for s, e in isl:
        parts += [a[int(max(0, s - 0.03) * SR): int((e + 0.06) * SR)], gap]
    tmp = os.path.join(OUT, ".tmp-isl.wav")
    write_wav(tmp, np.concatenate(parts))
    mp3 = os.path.join(OUT, ".tmp-isl.mp3")
    ff("-i", tmp, "-ac", "1", "-ar", "24000", "-b:a", "64k", mp3)
    data = base64.b64encode(open(mp3, "rb").read()).decode()
    os.remove(tmp)
    os.remove(mp3)
    lang = "English" if name == "nav" else "Georgian (Mkhedruli script)"
    ask = (
        f"This audio has exactly {len(isl)} short speech segments separated by 1.2-second silences. For each segment, in order, "
        f"write one line 'N: <the exact words you hear, in {lang}>' (N from 0). Write exactly what is said, including cut-off, "
        "repeated or garbled words; mark a breath or non-speech sound as [sound]. Then a line NOTES: and in English say whether "
        "any word sounds wrong, mispronounced, cut off or unclear, and how the delivery sounds (pace, emotion, loud or shrill)."
    )
    import vo

    body = {
        "contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "audio/mp3", "data": data}}, {"text": ask}]}],
        "generationConfig": {"temperature": 0},
    }
    req = urllib.request.Request(
        f"{vo.GEMINI_BASE}/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": vo.gemini_key()},
    )
    j = json.loads(urllib.request.urlopen(req, timeout=180).read())
    text = "".join(p.get("text", "") for p in j["candidates"][0]["content"]["parts"])
    text = "\n".join(f"# island {i}: {s:.2f}-{e:.2f}" for i, (s, e) in enumerate(isl)) + "\n" + text
    with open(cache, "w", encoding="utf-8") as f:
        f.write(text)
    print(text)


if __name__ == "__main__":
    main()
