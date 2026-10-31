#!/usr/bin/env python3
"""Word times of a take (for the word-by-word subtitles and the end card): ONE Gemini text-model request with the wav inline,
the tokens listed in order; the answer must list exactly those tokens. Written to public/vo/amintho/words-<name>.json as
[{w, s, e}] in take time (seconds). Cached: a second run reads the file. The key is read by tools/vo.py and never printed.

    python3 src/amintho/build/words.py narr|seller
"""
import base64
import json
import os
import sys
import urllib.request

from common import OUT, STUDIO, ff, load_json, read_wav, write_wav

sys.path.insert(0, os.path.join(STUDIO, "tools"))
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import voices  # noqa: E402

MODEL = "gemini-3.8-flash"


def tokens(name):
    spec = voices.TAKES[name]
    return spec["text"].split()


def main():
    name = sys.argv[1]
    out = os.path.join(OUT, f"words-{name}.json")
    if os.path.exists(out) and "--again" not in sys.argv:
        ws = load_json(out)["words"]
    else:
        V = load_json(os.path.join(OUT, "voices.json"))
        wav = os.path.join(OUT, V[name]["file"])
        mp3 = os.path.join(OUT, f".tmp-words-{name}.mp3")
        ff("-i", wav, "-ac", "1", "-ar", "24000", "-b:a", "96k", mp3)
        data = base64.b64encode(open(mp3, "rb").read()).decode()
        os.remove(mp3)
        W = tokens(name)
        prompt = (
            "This is a Georgian speech recording. The words spoken, in order, are:\n" + " ".join(W) +
            "\nReturn ONLY JSON: a list of objects {\"w\": word, \"s\": start_seconds, \"e\": end_seconds}, exactly one per item "
            "of THIS list, in this order, each \"w\" copied exactly (punctuation included): " + json.dumps(W, ensure_ascii=False) +
            "\nTimes from the start of the audio file, precision 0.01 s. Listen carefully to where each word begins and ends; "
            "a word's start is its first audible sound."
        )
        import vo

        body = {
            "contents": [{"parts": [{"inline_data": {"mime_type": "audio/mp3", "data": data}}, {"text": prompt}]}],
            "generationConfig": {"temperature": 0, "responseMimeType": "application/json"},
        }
        req = urllib.request.Request(
            f"{vo.GEMINI_BASE}/v1beta/models/{MODEL}:generateContent",
            data=json.dumps(body).encode(),
            headers={"Content-Type": "application/json", "x-goog-api-key": vo.gemini_key()},
        )
        j = json.loads(urllib.request.urlopen(req, timeout=300).read())
        ws = json.loads(j["candidates"][0]["content"]["parts"][0]["text"])
        got = [w["w"] for w in ws]
        if got != W:
            sys.exit(f"words: the answer's tokens differ from the script:\n{got}")
        with open(out, "w", encoding="utf-8") as f:
            json.dump({"file": V[name]["file"], "words": ws}, f, ensure_ascii=False, indent=0)
    for i, w in enumerate(ws):
        print(f"{i:3d} {w['s']:6.2f} {w['e']:6.2f} {w['w']}")


if __name__ == "__main__":
    main()
