#!/usr/bin/env python3
"""Plumbing test for tools/vo.py's Gemini backend and the recorded-voice guard, no key, no network:

    python3 tools/vo_test.py

A local mock of generateContent (http://127.0.0.1:<port>) answers with synthetic "speech": one
tone burst per word, 0.30 s pauses at commas, quiet room noise around. The test checks the
request (key header, voice, style), the 429 retry, the old-model request shape, the daily-quota
stop, the cache, the chunk timing against the audio itself, the sentence mode's pause split, and
that a recorded timeline is kept, refreshed or backed up exactly as vo.py promises.
Everything is written to a temp folder (VO_OUT, VO_CACHE); public/vo is never touched.
"""
import asyncio
import base64
import hashlib
import io
import json
import math
import os
import re
import sys
import tempfile
import threading
import wave
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

TMP = tempfile.mkdtemp(prefix="vo-test-")
os.environ.update(VO_OUT=os.path.join(TMP, "vo"), VO_CACHE=os.path.join(TMP, "cache"), GEMINI_API_KEY="test-key")
SR = 24000
LOG = []           # every request the mock saw
STATE = {"first429": True}


def speech(text, rate=SR):
    """Tone bursts: 0.35 s room noise, a burst per word (0.055 s per letter), 40 ms between words,
    0.30 s at a comma, 0.5 s room noise at the end. Returns int16 bytes and the burst times."""
    out, t, marks = bytearray(), 0.0, []

    def put(sec, amp, f0):
        nonlocal t
        n = int(sec * rate)
        for i in range(n):
            ramp = min(1.0, i / (0.005 * rate), (n - i) / (0.005 * rate))
            x = t + i / rate
            v = amp * ramp * (math.sin(2 * math.pi * f0 * x) + 0.4 * math.sin(2 * math.pi * 2 * f0 * x)) if f0 else \
                amp * math.sin(2 * math.pi * 3137 * x) * math.sin(2 * math.pi * 7 * x)  # faint room hiss
            out.extend(int(v).to_bytes(2, "little", signed=True))
        t += n / rate

    put(0.35, 18, 0)
    words = text.split()
    for wi, w in enumerate(words):
        letters = len(re.sub(r"\W", "", w))
        a = t
        put(max(0.15, 0.055 * letters), 7000, 125)
        marks.append((a, t))
        if wi < len(words) - 1:
            put(0.30 if w.endswith(",") else 0.04, 18, 0)
    put(0.5, 18, 0)
    return bytes(out), marks


def wav_bytes(pcm, rate=SR):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm)
    return buf.getvalue()


class Mock(BaseHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def reply(self, code, obj):
        body = json.dumps(obj).encode()
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self):
        m = re.fullmatch(r"/v1beta/models/([\w.\-]+):generateContent", self.path)
        body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
        part = body["contents"][0]["parts"][0]
        vc = body["generationConfig"]["speechConfig"]["voiceConfig"]
        LOG.append({"model": m and m[1], "key": self.headers.get("x-goog-api-key"), "text": part["text"],
                    "style": (part.get("speech_metadata") or {}).get("style"), "vc": vc,
                    "modalities": body["generationConfig"]["responseModalities"]})
        if not m or self.headers.get("x-goog-api-key") != "test-key":
            return self.reply(403, {"error": {"code": 403, "message": "bad key"}})
        model = m[1]
        if STATE["first429"]:
            STATE["first429"] = False
            return self.reply(429, {"error": {"code": 429, "status": "RESOURCE_EXHAUSTED", "details": [
                {"@type": "type.googleapis.com/google.rpc.QuotaFailure", "violations": [
                    {"quotaId": "GenerateRequestsPerMinutePerProjectPerModel-FreeTier"}]},
                {"@type": "type.googleapis.com/google.rpc.RetryInfo", "retryDelay": "1s"}]}})
        if "quota" in model:
            return self.reply(429, {"error": {"code": 429, "details": [{"violations": [
                {"quotaId": "GenerateRequestsPerDayPerProjectPerModel-FreeTier"}]}]}})
        if "strict" in model and "voice" in vc:
            return self.reply(400, {"error": {"code": 400, "message": 'Invalid JSON payload received. Unknown name "voice" at \'generation_config.speech_config.voice_config\''}})
        text = part["text"].split(":\n", 1)[-1]  # an old-shape request carries the style as a prompt line
        if vc.get("voice") == "Hires":  # a 48 kHz WAV: vo.py must resample it
            pcm, _ = speech(text, 48000)
            data, mime = wav_bytes(pcm, 48000), "audio/wav"
        elif "strict" in model:  # headerless PCM, as the older models send it
            data, mime = speech(text)[0], "audio/L16;codec=pcm;rate=24000"
        else:
            data, mime = wav_bytes(speech(text)[0]), "audio/wav"
        self.reply(200, {"candidates": [{"content": {"role": "model", "parts": [
            {"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}]}, "finishReason": "STOP"}]})


srv = ThreadingHTTPServer(("127.0.0.1", 0), Mock)
threading.Thread(target=srv.serve_forever, daemon=True).start()
os.environ["GEMINI_BASE_URL"] = f"http://127.0.0.1:{srv.server_address[1]}"

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vo  # noqa: E402  (after the env is set)

FAILS = []


def check(cond, what):
    print(("ok    " if cond else "FAIL  ") + what)
    if not cond:
        FAILS.append(what)


def spec(name, beats, **kw):
    s = {**dict(id=name, voice="gemini:Charon", leadIn=0.1, gap=0.28, sentenceGap=0.32, tail=0.35, beats=beats), **kw}
    path = os.path.join(TMP, name + ".json")
    json.dump(s, open(path, "w", encoding="utf-8"), ensure_ascii=False)
    return path


def load(vid):
    with wave.open(os.path.join(TMP, "vo", vid, "voice.wav")) as w:
        return w.readframes(w.getnframes()), w.getnframes() / w.getframerate()


def energy(pcm, a, b):
    s = pcm[int(a * SR) * 2:int(b * SR) * 2]
    xs = [int.from_bytes(s[i:i + 2], "little", signed=True) for i in range(0, len(s) - 1, 2)]
    return (sum(x * x for x in xs) / max(1, len(xs))) ** 0.5


def run(path):
    return asyncio.run(vo.build(path))


# 1. chunk mode: one request per chunk, a 429 on the first, then exact chunk times
beats = [{"say": "ერთი ორი სამი, | ოთხი ხუთი.", "show": "1 2 3, | 4 5."},
         {"say": "ექვსი შვიდი? | რვა.", "show": "6 7? | 8."}]
tl = run(spec("t-chunk", beats))
check(len(LOG) == 5, f"4 chunks = 4 requests + 1 retry after the 429 (saw {len(LOG)})")
check(all(r["key"] == "test-key" and r["vc"] == {"voice": "Charon"} and r["modalities"] == ["AUDIO"] for r in LOG),
      "key header, {voice: Charon}, AUDIO modality on the 3.8 request shape")
check(all(r["style"] == vo.GEMINI_STYLE for r in LOG), "the default style rides in speech_metadata, the text stays verbatim")
check([r["text"] for r in LOG[1:]] == ["ერთი ორი სამი,", "ოთხი ხუთი.", "ექვსი შვიდი?", "რვა."], "one chunk per request, in order")
pcm, dur = load("t-chunk")
check(abs(dur - tl["duration"]) < 0.002, f"voice.wav length = timeline duration ({dur:.3f} / {tl['duration']})")
keys = {"i", "src", "start", "end", "speechStart", "speechEnd", "chunks"}
check(all(set(b) == keys for b in tl["beats"]) and set(tl) == {"id", "voice", "duration", "beats"}, "timeline has exactly vo.py's fields")
chunks = [c for b in tl["beats"] for c in b["chunks"]]
check([c["text"] for c in chunks] == ["1 2 3,", "4 5.", "6 7?", "8."], "chunk text comes from show")
check(all(a["end"] <= b["start"] for a, b in zip(chunks, chunks[1:])) and all(c["start"] < c["end"] for c in chunks), "chunks are in order and never overlap")
good = all(energy(pcm, c["start"] - 0.05, c["start"] - 0.015) < 300 < energy(pcm, c["start"] + 0.015, c["start"] + 0.05)
           and energy(pcm, c["end"] - 0.05, c["end"] - 0.015) > 300 > energy(pcm, c["end"] + 0.015, c["end"] + 0.05) for c in chunks)
check(good, "every chunk starts and ends on the speech itself (checked in the written voice.wav, 15 ms)")
check(abs(chunks[0]["start"] - 0.2) < 0.012, f"first word at leadIn + PAD_IN = 0.20 s ({chunks[0]['start']})")
b0 = tl["beats"][0]
check(b0["speechStart"] == b0["chunks"][0]["start"] and b0["speechEnd"] == b0["chunks"][-1]["end"] and tl["beats"][1]["start"] == b0["end"], "beat spans chain like vo.py's")

# 2. the cache: nothing asked again
n = len(LOG)
tl2 = run(spec("t-chunk", beats))
check(len(LOG) == n and tl2 == tl, "a second run is served from the cache, same timeline")

# 3. sentence mode: one request for the two-chunk sentence, the border lands in the comma pause
n = len(LOG)
tl3 = run(spec("t-sent", beats[:1], geminiSplit="sentence"))
check(len(LOG) == n + 1 and LOG[-1]["text"] == "ერთი ორი სამი, ოთხი ხუთი.", "sentence mode: one request for the whole sentence")
c0, c1 = tl3["beats"][0]["chunks"]
_, marks = speech("ერთი ორი სამი, ოთხი ხუთი.")
pause = marks[3][0] - marks[2][1]
check(abs((c1["start"] - c0["end"]) - pause) < 0.03, f"border = the comma pause ({c1['start'] - c0['end']:.3f} s vs {pause:.3f} s)")
pcm3, _ = load("t-sent")
check(energy(pcm3, c0["end"] + 0.02, c1["start"] - 0.02) < 300, "nothing spoken between the two chunks")

# 4. an older model: the 3.8 shape is refused once, the old shape (prompt style, raw PCM) works
n = len(LOG)
tl4 = run(spec("t-old", beats[:1], geminiModel="gemini-3.9-strict-tts", style="calm documentary narrator"))
check(len(LOG) == n + 3 and "prebuiltVoiceConfig" in LOG[-1]["vc"], "400 on the new shape -> retried with prebuiltVoiceConfig")
check(LOG[-1]["text"].startswith("calm documentary narrator:\n"), "old shape: the style becomes a prompt line")
check(len(tl4["beats"][0]["chunks"]) == 2 and tl4["duration"] > 2, "headerless L16 audio decoded")

# 5. a 48 kHz answer is resampled
tl5 = run(spec("t-hires", beats[:1], voice="gemini:Hires"))
check(abs(load("t-hires")[1] - tl5["duration"]) < 0.002 and abs(tl5["duration"] - tl["beats"][0]["end"] - 0.35 + 0.28) < 0.05,
      f"48 kHz WAV resampled to 24 kHz ({tl5['duration']} s)")

# 6. the daily quota stops with a clear message, no key stops too
try:
    run(spec("t-quota", [{"say": "ცხრა ათი."}], geminiModel="gemini-3.8-quota-tts"))
    check(False, "daily quota stops")
except SystemExit as e:
    check("daily quota" in str(e), "daily quota: " + str(e)[:70])
key = os.environ.pop("GEMINI_API_KEY")
try:
    run(spec("t-nokey", [{"say": "თერთმეტი."}]))
    check(False, "no key stops")
except SystemExit as e:
    check("GEMINI_API_KEY" in str(e), "no key: " + str(e)[:70])
os.environ["GEMINI_API_KEY"] = key

# 7. a recorded timeline is kept, refreshed, or backed up
out = os.path.join(TMP, "vo", "t-rec")
os.makedirs(out, exist_ok=True)
rec = json.loads(json.dumps(tl))
rec.update(id="t-rec", voice="recorded", source="recorded")
for b, sb in zip(rec["beats"], beats):
    b["src"] = vo.said_hash(sb["say"])
json.dump(rec, open(os.path.join(out, "timeline.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
open(os.path.join(out, "voice.wav"), "wb").write(wav_bytes(b"\x01\x00" * 4800))
sig = hashlib.sha1(open(os.path.join(out, "voice.wav"), "rb").read()).hexdigest()
n = len(LOG)
kept = run(spec("t-rec", beats))
check(len(LOG) == n and kept["source"] == "recorded" and hashlib.sha1(open(os.path.join(out, "voice.wav"), "rb").read()).hexdigest() == sig,
      "same words: the recording is kept, nothing synthesised")
beats_show = json.loads(json.dumps(beats))
beats_show[1]["show"] = "6 7? | რვა."
kept = run(spec("t-rec", beats_show))
check(kept["beats"][1]["chunks"][1]["text"] == "რვა." and kept["beats"][1]["chunks"][1]["start"] == rec["beats"][1]["chunks"][1]["start"],
      "a changed show only updates the subtitle text")
beats_say = json.loads(json.dumps(beats))
beats_say[1]["say"] = "ექვსი შვიდი? | ცხრა."
try:
    run(spec("t-rec", beats_say, voice="recorded"))
    check(False, "voice recorded + changed words stops")
except SystemExit as e:
    check("[1]" in str(e) and "record.mjs" in str(e), "voice recorded + changed words: " + str(e)[:60])
new = run(spec("t-rec", beats_say))
check(os.path.exists(os.path.join(out, "voice.recorded.wav")) and os.path.exists(os.path.join(out, "timeline.recorded.json"))
      and "source" not in new and len(LOG) > n, "changed words + a TTS voice: recording backed up, Gemini reads the new words")
try:
    run(spec("t-none", beats, voice="recorded"))
    check(False, "voice recorded without a recording stops")
except SystemExit as e:
    check("nothing is recorded" in str(e), "no recording yet: " + str(e)[:60])

srv.shutdown()
import shutil  # noqa: E402
shutil.rmtree(TMP, ignore_errors=True)
print(f"\n{'ALL OK' if not FAILS else f'{len(FAILS)} FAILED'} ({len(LOG)} mock requests)")
sys.exit(1 if FAILS else 0)
