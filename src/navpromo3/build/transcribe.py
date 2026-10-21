#!/usr/bin/env python3
"""Listen-check a Georgian take: ONE Gemini text-model request (audio in, verbatim text out).

    python3 src/navpromo3/build/transcribe.py <wav> [--start S --end E]

The key is read by tools/vo.py (env or ~/.config/vinari/gemini.key) and never printed. The answer is cached next to the
wav (<wav>.transcript.txt), so a second look costs nothing.
"""
import base64
import json
import os
import sys
import urllib.request

from common import OUT, STUDIO, ff, read_wav, write_wav, SR

sys.path.insert(0, os.path.join(STUDIO, "tools"))

MODEL = "gemini-3.8-flash"
ASK = (
    "Transcribe this Georgian speech VERBATIM in Georgian script (Mkhedruli), exactly the words you hear, including repeated, "
    "garbled or missing-sounding words; mark a whispered word as [whisper: ...] and a non-speech sound as [sound]. "
    "Then on a new line write NOTES: and in English say whether any word sounds wrong, mispronounced, cut off or unclear, "
    "and how the delivery sounds (pace, emotion, loud or quiet)."
)


def main():
    src = sys.argv[1]
    start = float(sys.argv[sys.argv.index("--start") + 1]) if "--start" in sys.argv else None
    end = float(sys.argv[sys.argv.index("--end") + 1]) if "--end" in sys.argv else None
    tag = "" if start is None else f".{start:.2f}-{end:.2f}"
    cache = src + tag + ".transcript.txt"
    if os.path.exists(cache):
        print(open(cache, encoding="utf-8").read())
        return
    a = read_wav(src)
    if start is not None:
        a = a[int(start * SR): int(end * SR)]
    tmp = os.path.join(OUT, ".tmp-tr.wav")
    write_wav(tmp, a)
    mp3 = os.path.join(OUT, ".tmp-tr.mp3")
    ff("-i", tmp, "-ac", "1", "-ar", "24000", "-b:a", "64k", mp3)
    data = base64.b64encode(open(mp3, "rb").read()).decode()
    os.remove(tmp)
    os.remove(mp3)
    import vo

    body = {
        "contents": [{"role": "user", "parts": [{"inline_data": {"mime_type": "audio/mp3", "data": data}}, {"text": ASK}]}],
        "generationConfig": {"temperature": 0},
    }
    req = urllib.request.Request(
        f"{vo.GEMINI_BASE}/v1beta/models/{MODEL}:generateContent",
        data=json.dumps(body).encode(),
        headers={"Content-Type": "application/json", "x-goog-api-key": vo.gemini_key()},
    )
    j = json.loads(urllib.request.urlopen(req, timeout=180).read())
    text = "".join(p.get("text", "") for p in j["candidates"][0]["content"]["parts"])
    with open(cache, "w", encoding="utf-8") as f:
        f.write(text)
    print(text)


if __name__ == "__main__":
    main()
