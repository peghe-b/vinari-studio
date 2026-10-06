#!/usr/bin/env python3
"""Plumbing test for tools/vo.py's Gemini backend and the recorded-voice guard, no key, no network:

    python3 tools/vo_test.py

A local mock of generateContent (http://127.0.0.1:<port>) answers with synthetic "speech": one
tone burst per word, 0.30 s pauses at commas, 0.45 s after a sentence, 0.55 s at a line break, quiet room noise. The
test checks the request (key header, voice, style), the 429 retry, the old-model request shape, the
daily-quota stop, the cache, the chunk timing against the audio itself, the sentence mode's pause
split, the whole-film mode (one request, its sentences one paragraph, and voice.wav IS that take sample for
sample: no cut, no re-spacing, never one request per sentence, not even for a take read in one breath; the
subtitle chunks on their own words in it; a beat's hold the one silence added, and left out where a run-on take
has no pause, never inside a word; an old film, voiced per sentence
or as a take one sentence per line, kept as it was built until a line changes), the request count, what a
change costs (any changed line is one request, the whole film again; the film's own model first; a film voiced
under an earlier director's note kept until a line changes), VO_NO_EDGE's stop and voice-quota.json,
a failed model (a 404 counted as absent, not as an error), an empty answer every time (two requests, then edge-tts,
and the job's next run asks nothing), an answer cut short or not JSON (asked again, never a crash), and that a
recorded timeline is kept, refreshed or backed up exactly as vo.py promises.
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
# GEMINI_KEY_FILE: never the owner's real key file (the "no key" check would read it and send it to the mock)
os.environ.update(VO_OUT=os.path.join(TMP, "vo"), VO_CACHE=os.path.join(TMP, "cache"), GEMINI_API_KEY="test-key",
                  VO_QUOTA_FILE=os.path.join(TMP, "ci", "voice-quota.json"), GEMINI_KEY_FILE=os.path.join(TMP, "no.key"))
os.environ.pop("VO_NO_EDGE", None)
os.environ.pop("GEMINI_TTS_SPLIT", None)
SR = 24000
LOG = []           # every request the mock saw
STATE = {"first429": True}


def speech(text, rate=SR, line_pause=0.55, sentence_pause=0.45):
    """Tone bursts: 0.35 s room noise, a burst per word (0.055 s per letter), 40 ms between words,
    0.30 s at a comma, `sentence_pause` after a sentence inside a line (a whole-film request is one paragraph
    since 2026-10-07), `line_pause` at a line break (until then a sentence per line), 0.5 s room noise at the
    end. A run-on reader (`line_pause` under 0.1 s) does not stop between sentences either.
    Returns int16 bytes and the burst times."""
    if line_pause < 0.1:
        sentence_pause = line_pause
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
    words = [(w, li < len(line.split()) - 1) for line in text.split("\n") for li, w in enumerate(line.split())]
    for wi, (w, inside) in enumerate(words):
        letters = len(re.sub(r"\W", "", w))
        a = t
        put(max(0.15, 0.055 * letters), 7000, 125)
        marks.append((a, t))
        if wi < len(words) - 1:
            put(0.30 if inside and w.endswith(",") else sentence_pause if inside and w[-1:] in ".?!"
                else 0.04 if inside else line_pause, 18, 0)
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
        if "gone" in model:  # a preview model retired or renamed
            return self.reply(404, {"error": {"code": 404, "status": "NOT_FOUND",
                                              "message": f"models/{model} is not found for API version v1beta"}})
        if "denied" in model:  # a key refused (the body can name the project: vo.py must not print it)
            return self.reply(403, {"error": {"code": 403, "status": "PERMISSION_DENIED",
                                              "message": "Consumer 'project:123456789' has been suspended.",
                                              "details": [{"reason": "CONSUMER_SUSPENDED"}]}})
        if "strict" in model and "voice" in vc:
            return self.reply(400, {"error": {"code": 400, "message": 'Invalid JSON payload received. Unknown name "voice" at \'generation_config.speech_config.voice_config\''}})
        if "junk" in model:  # a 200 that is not JSON (a proxy's error page)
            body = b"<html><body>502 Bad Gateway</body></html>"
            self.send_response(200)
            self.send_header("Content-Type", "text/html")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body)
        if vc.get("voice") == "Mute":  # a 200 with no audio, every time ("OTHER")
            return self.reply(200, {"candidates": [{"content": {"role": "model"}, "finishReason": "OTHER"}]})
        cut = "trunc" in model and model not in STATE.setdefault("cut", set())  # its first answer cut short, then fine
        if cut:
            STATE["cut"].add(model)
        text = part["text"].split(":\n", 1)[-1]  # an old-shape request carries the style as a prompt line
        if vc.get("voice") == "Runon":  # reads a whole film with no pause between the lines
            data, mime = wav_bytes(speech(text, line_pause=0.04)[0]), "audio/wav"
        elif vc.get("voice") == "Hires":  # a 48 kHz WAV: vo.py must resample it
            pcm, _ = speech(text, 48000)
            data, mime = wav_bytes(pcm, 48000), "audio/wav"
        elif "strict" in model:  # headerless PCM, as the older models send it
            data, mime = speech(text)[0], "audio/L16;codec=pcm;rate=24000"
        else:
            data, mime = wav_bytes(speech(text)[0]), "audio/wav"
        answer = {"candidates": [{"content": {"role": "model", "parts": [
            {"inlineData": {"mimeType": mime, "data": base64.b64encode(data).decode()}}]}, "finishReason": "STOP"}]}
        if cut:  # the whole length announced, half of it sent, the connection closed (IncompleteRead)
            body = json.dumps(answer).encode()
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            return self.wfile.write(body[:len(body) // 2])
        self.reply(200, answer)


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
tl = run(spec("t-chunk", beats, geminiSplit="chunk"))
check(len(LOG) == 5, f"4 chunks = 4 requests + 1 retry after the 429 (saw {len(LOG)})")
check(all(r["key"] == "test-key" and r["vc"] == {"voice": "Charon"} and r["modalities"] == ["AUDIO"] for r in LOG),
      "key header, {voice: Charon}, AUDIO modality on the 3.8 request shape")
check(all(r["style"] == vo.GEMINI_STYLE for r in LOG), "the default style rides in speech_metadata, the text stays verbatim")
check([r["text"] for r in LOG[1:]] == ["ერთი ორი სამი,", "ოთხი ხუთი.", "ექვსი შვიდი?", "რვა."], "one chunk per request, in order")
pcm, dur = load("t-chunk")
check(abs(dur - tl["duration"]) < 0.002, f"voice.wav length = timeline duration ({dur:.3f} / {tl['duration']})")
keys = {"i", "src", "start", "end", "speechStart", "speechEnd", "chunks"}
check(all(set(b) == keys for b in tl["beats"]) and set(tl) == {"id", "voice", "duration", "beats", "model"}, "timeline has exactly vo.py's fields")
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
tl2 = run(spec("t-chunk", beats, geminiSplit="chunk"))
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
tl4 = run(spec("t-old", beats[:1], geminiModel="gemini-3.9-strict-tts", style="calm documentary narrator", geminiSplit="chunk"))
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
except (SystemExit, vo.GeminiQuota) as e:
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

# 8. whole mode (the default; since 2026-10-07, the owner on v79: "every 1-2 seconds the voice breaks and a new one
# starts"): ONE request for the film, its sentences one paragraph, and that take IS the film's voice: never cut apart,
# never re-spaced by "gap"/"sentenceGap", never one request per sentence. The sentence and chunk borders found in it
# only time the subtitles and beats; a beat's "hold" is the one silence added, at that beat's border.
import contextlib  # noqa: E402


def quiet(fn, *a):
    """fn(*a) with its stderr captured: (result or the exception, stderr text)."""
    err = io.StringIO()
    with contextlib.redirect_stderr(err):
        try:
            return fn(*a), err.getvalue()
        except (Exception, SystemExit) as e:  # noqa: B902
            return e, err.getvalue()


def times(t):
    return [(c["start"], c["end"]) for b in t["beats"] for c in b["chunks"]]


def film(words):
    """Three beats, four sentence groups (2 chunks, 1, 1, 3), words from `words`."""
    w = words.split()
    return [{"say": f"{w[0]} {w[1]} {w[2]}, | {w[3]} {w[4]}."},
            {"say": f"{w[5]} {w[6]} {w[7]}. | {w[8]} {w[9]}."},
            {"say": f"{w[10]} {w[11]} {w[12]}, | {w[13]} {w[14]}, | {w[15]} {w[16]}."}]


def sentences(beats):
    """The sentence groups of a film as vo.build cuts them, each as one text."""
    out = []
    for b in beats:
        cur = []
        for ch in b["say"].split("|"):
            cur.append(ch.strip())
            if re.search(r"[.?!]\s*$", ch.strip()):
                out.append(" ".join(cur))
                cur = []
        if cur:
            out.append(" ".join(cur))
    return out


def edit(beats, old, new):
    out = json.loads(json.dumps(beats))
    for b in out:
        b["say"] = b["say"].replace(old, new)
    return out


def para(beats):
    """The request of a whole take: every sentence, one after another (vo.whole_text)."""
    return " ".join(sentences(beats))


def take_of(text, style=None, voice="gemini:Charon"):
    """The cached take of one request (what the mock answered), as int16 bytes."""
    p = vo.gemini_path(text, voice, vo.GEMINI_MODEL, style or vo.GEMINI_STYLE)
    return vo.read_wav_bytes(open(p, "rb").read()).tobytes()


def stretch(vid, a, b):
    pcm, _ = load(vid)
    return pcm[int(a * SR) * 2:int(b * SR) * 2]


def in_take(part, take):
    """Where a stretch of voice.wav sits in the take, sample for sample, in samples (-1: nowhere)."""
    k = take.find(part)
    while k >= 0 and k % 2:
        k = take.find(part, k + 1)
    return k // 2 if k >= 0 else -1


def on_words(tl, beats, text, at, part_start, line_pause=0.55):
    """The worst distance between a subtitle chunk's edges and its own words' bursts in the take (s): `at` is where
    voice.wav's sample `part_start` sits in the take."""
    _, marks = speech(text, line_pause=line_pause)
    shift = (int(part_start * SR) - at) / SR  # voice.wav time = take time + shift
    cs = [c for b in tl["beats"] for c in b["chunks"]]
    words = [len(c.split()) for b in beats for c in b["say"].split("|")]
    k, worst = 0, 0.0
    for c, nw in zip(cs, words):
        worst = max(worst, abs(c["start"] - (marks[k][0] + shift)), abs(c["end"] - (marks[k + nw - 1][1] + shift)))
        k += nw
    return worst


fa = film("მზე ამოვიდა ზღვაზე ტალღები წყნარია ნავი ნაპირთან დგას მეთევზე იღიმის ქალაქი იღვიძებს ნელა ქუჩები ივსება დღე იწყება")
n = len(LOG)
whole, err = quiet(run, spec("t-whole", fa, gap=1.0, sentenceGap=1.0))
text = " ".join(["მზე ამოვიდა ზღვაზე, ტალღები წყნარია.", "ნავი ნაპირთან დგას.", "მეთევზე იღიმის.",
                 "ქალაქი იღვიძებს ნელა, ქუჩები ივსება, დღე იწყება."])
check(len(LOG) == n + 1 and LOG[-1]["text"] == text == para(fa) and LOG[-1]["style"] == vo.GEMINI_STYLE,
      f"whole: the film in ONE request, every sentence word for word, one paragraph ({len(LOG) - n})")
check("one continuous take" in err and "per sentence" not in err, "whole: says it keeps one continuous take")
cs = [c for b in whole["beats"] for c in b["chunks"]]
take = take_of(text)
part = stretch("t-whole", 0.1 + 0.02, cs[-1]["end"] + vo.G_PAD_OUT - 0.02)
at = in_take(part, take)
check(at >= 0 and len(part) / 2 / SR > 4,
      f"whole: voice.wav from leadIn to the tail IS the take, sample for sample: no cut, no silence of ours "
      f"({len(part) / 2 / SR:.2f} s found at {at / SR:.3f} s of the take)")
worst = on_words(whole, fa, text, at, 0.12) if at >= 0 else 9
check(worst <= 0.025, f"whole: every subtitle chunk starts and ends on its own words in the take ({worst * 1000:.0f} ms)")
pauses = [round(cs[i + 1]["start"] - cs[i]["end"], 3) for i in (1, 2, 3)]  # the three sentence ends
check(all(abs(p - 0.45) < 0.03 for p in pauses),
      f"whole: between two sentences the take's own pause (0.45 s), not gap / sentenceGap (1.0 s): {pauses}")
b0, b1, b2 = whole["beats"]
check(b0["start"] == 0 and b0["end"] == b1["start"] and b1["end"] == b2["start"] and b2["end"] == whole["duration"]
      and all(abs(b["start"] - (b["chunks"][0]["start"] - vo.PAD_IN)) < 0.002 for b in (b1, b2))
      and abs(cs[0]["start"] - 0.2) < 0.012,
      "whole: beats chain, each starts PAD_IN before its first word, the first word at leadIn + PAD_IN")
check(all(0 < c["start"] < c["end"] <= whole["duration"] for c in cs) and all(a["end"] <= b["start"] for a, b in zip(cs, cs[1:])),
      "whole: every chunk inside the audio, in order, never overlapping")
n = len(LOG)
again, err = quiet(run, spec("t-whole", fa, gap=1.0, sentenceGap=1.0))
check(len(LOG) == n and times(again) == times(whole), "whole: a second run is served from the cache, the same timeline")

# a beat's hold is a real pause in the take, at that beat's border: the same request (no new one), silence added there
fh = json.loads(json.dumps(fa))
fh[1]["hold"] = 0.6
n = len(LOG)
held, _ = quiet(run, spec("t-hold", fh, gap=1.0, sentenceGap=1.0))
hc = [c for b in held["beats"] for c in b["chunks"]]
check(len(LOG) == n and abs(held["duration"] - whole["duration"] - 0.6) < 0.002
      and times(held)[:4] == times(whole)[:4] and all(abs(h[0] - w[0] - 0.6) < 0.002 for h, w in zip(times(held)[4:], times(whole)[4:])),
      f"hold: no request, 0.6 s more, only the beats after it move ({held['duration'] - whole['duration']:+.3f} s)")
gap12 = hc[4]["start"] - hc[3]["end"]
mid = (hc[3]["end"] + hc[4]["start"]) / 2
check(abs(gap12 - 0.45 - 0.6) < 0.03 and energy(load("t-hold")[0], mid - 0.2, mid + 0.2) < 1,
      f"hold: the take's own pause plus 0.6 s of silence at the beat border ({gap12:.3f} s)")
h1, h2 = held["beats"][1], held["beats"][2]
part1 = stretch("t-hold", 0.12, h1["chunks"][-1]["end"] + 0.1)
part2 = stretch("t-hold", h2["chunks"][0]["start"] - 0.1, hc[-1]["end"] + vo.G_PAD_OUT - 0.02)
a1, a2 = in_take(part1, take), in_take(part2, take)
check(a1 >= 0 and a2 >= 0 and abs((a2 - a1) / SR - ((h2["chunks"][0]["start"] - 0.1 - 0.12) - 0.6)) < 0.002
      and h1["end"] == h2["start"] and abs(h2["start"] - (h2["chunks"][0]["start"] - vo.PAD_IN)) < 0.002,
      "hold: before and after it the take sample for sample, the next beat starts PAD_IN before its first word")

# a beat with a style of its own in the middle (two sentences): two requests, two takes, each one continuous; where
# they meet, the pieces are faded and spaced by "gap" as anything voiced apart
fx = json.loads(json.dumps(fa))
fx[1]["style"] = "ხუმრობით."
n = len(LOG)
mixed, err = quiet(run, spec("t-mixed", fx, gap=1.0, sentenceGap=1.0))
mc = [c for b in mixed["beats"] for c in b["chunks"]] if isinstance(mixed, dict) else []
check(isinstance(mixed, dict) and len(LOG) == n + 2 and sorted(x["style"] for x in LOG[n:]) == sorted([vo.GEMINI_STYLE, "ხუმრობით."])
      and [x["text"] for x in LOG[n:] if x["style"] != vo.GEMINI_STYLE] == ["ნავი ნაპირთან დგას. მეთევზე იღიმის."]
      and abs((mc[3]["start"] - mc[2]["end"]) - 0.45) < 0.03
      and all(abs((mc[i + 1]["start"] - mc[i]["end"]) - (vo.G_PAD_OUT + 1.0 + vo.PAD_IN)) < 0.03 for i in (1, 3))
      and all(a["end"] <= b["start"] for a, b in zip(mc, mc[1:])),
      f"styled beat: two takes, its two sentences one continuous take, gap at the two borders "
      f"({[round(mc[i + 1]['start'] - mc[i]['end'], 2) for i in (1, 2, 3)] if mc else mixed})")

# a take with no pause between its sentences is still the film's voice: one request, never one per sentence
fc = film("ბავშვები თამაშობენ ეზოში ბურთი გორავს ძაღლი ყეფს ხმამაღლა დედა იძახის სადილი მზადაა ყველა შინ მიდის სიცილით ბოლოს")
n = len(LOG)
runon, err = quiet(run, spec("t-runon", fc, voice="gemini:Runon"))
rc = [c for b in runon["beats"] for c in b["chunks"]] if isinstance(runon, dict) else []
check(isinstance(runon, dict) and len(LOG) == n + 1 and "not sure" in err and "per sentence" not in err
      and all(0 < c["start"] < c["end"] <= runon["duration"] for c in rc) and all(a["end"] <= b["start"] for a, b in zip(rc, rc[1:])),
      f"whole: a run-on take (its borders not sure) is kept, ONE request, the chunks in order inside it ({len(LOG) - n})")
rpart = stretch("t-runon", 0.12, rc[-1]["end"] + vo.G_PAD_OUT - 0.02) if rc else b""
rat = in_take(rpart, take_of(para(fc), voice="gemini:Runon")) if rc else -1
rworst = on_words(runon, fc, para(fc), rat, 0.12, line_pause=0.04) if rat >= 0 else 9
check(rat >= 0 and rworst < 0.3, f"whole: its voice is the take as it came; borders placed where no pause is, the subtitles a little off at most ({rworst * 1000:.0f} ms)")


def silences_in_speech(vid, tl):
    """Runs of digital silence (>= 50 ms) in voice.wav between the first word and the last with speech on a side."""
    pcm, _ = load(vid)
    xs = [int.from_bytes(pcm[i:i + 2], "little", signed=True) for i in range(0, len(pcm) - 1, 2)]
    a0, a1 = int(tl["beats"][0]["chunks"][0]["start"] * SR), int(tl["beats"][-1]["chunks"][-1]["end"] * SR)
    out, k = [], a0
    while k < a1:
        if xs[k] == 0:
            j = k
            while j < a1 and xs[j] == 0:
                j += 1
            if j - k >= int(0.05 * SR) and (energy(pcm, k / SR - 0.03, k / SR) > 300 or energy(pcm, j / SR, j / SR + 0.03) > 300):
                out.append(round(k / SR, 3))
            k = j
        else:
            k += 1
    return out


# a beat's hold where the run-on take has no pause (its border placed where none is) is left out and said: silence there
# would cut a word in two, the break the owner heard (v79 has "hold" 0.1 on most beats)
fch = json.loads(json.dumps(fc))
for b in fch[:-1]:
    b["hold"] = 0.3
n = len(LOG)
rh, err = quiet(run, spec("t-runon-hold", fch, voice="gemini:Runon"))
cut_in = silences_in_speech("t-runon-hold", rh) if isinstance(rh, dict) else ["no timeline"]
check(isinstance(rh, dict) and len(LOG) == n and "is left out" in err and not cut_in,
      f"hold: a run-on take gets no silence inside its speech, the hold is left out and said ({cut_in})")

# the explicit sentence mode still exists: one request per sentence (separate takes, re-spaced: only on purpose)
n = len(LOG)
ref = run(spec("t-whole-ref", fa, geminiSplit="sentence"))
check(len(LOG) == n + 4, f"sentence mode: one request per sentence ({len(LOG) - n})")

# a film voiced before 2026-10-07 keeps its audio, no request, until a line changes: (a) per sentence
fb = film("ცა მოიღრუბლა სწრაფად ქარი ამოვარდა წვიმა დაიწყო მოულოდნელად ხალხი გარბის ქოლგები იშლება ქუჩა დაცარიელდა მალე ღამე მოვიდა")
cached_sent = run(spec("t-sent-first", fb, geminiSplit="sentence"))
n = len(LOG)
kept, err = quiet(run, spec("t-kept", fb))
check(len(LOG) == n and times(kept) == times(cached_sent) and "kept as it is" in err,
      "old film: voiced per sentence, kept as it was (no request, the same timeline)")
# (b) its take one sentence per line under the note before, cut and re-spaced as vo.py did then
old_note = vo.GEMINI_STYLES_BEFORE[0]
fl = film("მთვარე ამოდის ტყეზე ბუები ფხიზლობენ მდინარე ჩუხჩუხებს ქვებზე მელა იპარება ფრთხილად ჩიტები ჩუმდებიან ბუდეებში ღამე ჩამოწვა ნელა")
lpcm, _ = speech("\n".join(sentences(fl)))
open(vo.gemini_path("\n".join(sentences(fl)), "gemini:Charon", vo.GEMINI_MODEL, old_note), "wb").write(wav_bytes(lpcm))
n = len(LOG)
old, err = quiet(run, spec("t-legacy", fl, sentenceGap=1.0))
oc = [c for b in old["beats"] for c in b["chunks"]] if isinstance(old, dict) else []
inner = oc[3]["start"] - oc[2]["end"] if oc else 0  # beat 1's two sentences, re-spaced as then
check(len(LOG) == n and "kept as it is" in err and abs(inner - (vo.G_PAD_OUT + 1.0 + vo.PAD_IN)) < 0.03,
      f"old film: its take one sentence per line, kept as it was built (no request, re-spaced as then: {inner:.3f} s)")
n = len(LOG)
_, err = quiet(run, spec("t-legacy", edit(fl, "მელა იპარება", "მელა გარბის"), sentenceGap=1.0))
check(len(LOG) == n + 1 and LOG[-1]["text"] == para(edit(fl, "მელა იპარება", "მელა გარბის")) and LOG[-1]["style"] == vo.GEMINI_STYLE,
      f"old film: a changed line voices the whole film again, ONE continuous take with today's note ({len(LOG) - n})")
# (c) an old take that cannot be cut with confidence and no per-sentence takes: one continuous take, never per sentence
fu = film("ტრამვაი რეკავს კუთხეში მგზავრები ჩქარობენ ბაზარში ვაჭარი ყვირის ხმამაღლა ბიჭი ყიდის გაზეთებს ქალი ითვლის ხურდას ქუჩა ხმაურობს დილით")
upcm, _ = speech("\n".join(sentences(fu)), line_pause=0.04)
open(vo.gemini_path("\n".join(sentences(fu)), "gemini:Charon", vo.GEMINI_MODEL, old_note), "wb").write(wav_bytes(upcm))
n = len(LOG)
_, err = quiet(run, spec("t-legacy-runon", fu))
check(len(LOG) == n + 1 and LOG[-1]["text"] == para(fu) and LOG[-1]["style"] == vo.GEMINI_STYLE and "per sentence" not in err,
      f"old film whose take cannot be cut and has no per-sentence takes: ONE new continuous take, not 1 + 4 ({len(LOG) - n})")

# 9. the request count: vo.py's summary line says how many Gemini requests the run made
fd = film("მატარებელი ჩამოდის სადგურზე ბაქანი ხმაურობს კონდუქტორი უსტვენს კარი იღება მგზავრები ჩადიან ჩემოდნები მძიმეა გზა გრძელია ფანჯარა ღიაა")
out = io.StringIO()
with contextlib.redirect_stdout(out):
    quiet(vo.main, [spec("t-count", fd)])
with contextlib.redirect_stdout(io.StringIO()) as out2:
    quiet(vo.main, [spec("t-count", fd)])
line1, line2 = out.getvalue().splitlines()[0], out2.getvalue().splitlines()[0]
check("1 Gemini request)" in line1 and "0 Gemini requests)" in line2, f"summary line counts requests: {line1[-40:]!r}, then {line2[-40:]!r}")

# 9b. what a change costs: an unchanged film nothing; ANY changed line one request, the whole film again as one take
# (never that line alone, spliced in between the others: that patchwork is what the owner heard)
fe = film("ფანჯარა ღიაა ოთახში სიო შემოდის ფარდა ირხევა ნელა მაგიდაზე ყვავილია ლამაზი ვაზა დგას კუთხეში სკამი ცარიელია ჩუმად")
n = len(LOG)
e1, _ = quiet(run, spec("t-edit", fe))
check(len(LOG) == n + 1, f"edit: a new film is one request ({len(LOG) - n})")
fe2 = edit(fe, "ფარდა ირხევა", "ფარდა ქანაობს")  # beat 1's first sentence
n = len(LOG)
e2, err = quiet(run, spec("t-edit", fe2))
check(len(LOG) == n + 1 and LOG[-1]["text"] == para(fe2) and "only sentence" not in err,
      f"edit: one changed line is ONE request, the whole film again ({len(LOG) - n}: {LOG[-1]['text'][:40]!r}...)")
ec = [c for b in e2["beats"] for c in b["chunks"]]
check(in_take(stretch("t-edit", 0.12, ec[-1]["end"] + vo.G_PAD_OUT - 0.02), take_of(para(fe2))) >= 0,
      "edit: the edited film's voice is its new take sample for sample (nothing spliced in)")
n = len(LOG)
e3, _ = quiet(run, spec("t-edit", fe2))
check(len(LOG) == n and times(e3) == times(e2), "edit: the edited film run again costs nothing, same timeline")
fe3 = edit(edit(fe2, "მაგიდაზე ყვავილია", "მაგიდაზე წიგნია"), "ვაზა დგას", "ვაზა ჩანს")
n = len(LOG)
e4, _ = quiet(run, spec("t-edit", fe3))
check(len(LOG) == n + 1 and LOG[-1]["text"] == para(fe3), f"edit: two changed lines are one request, the whole film ({len(LOG) - n})")

# a film voiced per sentence before: a changed line is one request, the whole film as one take
fs = film("წყალი დუღს ქვაბში ჩაი მზადაა ფინჯანი თბილია შაქარი დნება ნელა კოვზი წკრიალებს დილა მშვიდია ფანჯრიდან მზე ანათებს")
quiet(run, spec("t-edit-s", fs, geminiSplit="sentence"))
n = len(LOG)
_, err = quiet(run, spec("t-edit-s", edit(fs, "ფინჯანი თბილია", "ფინჯანი ცხელია")))
check(len(LOG) == n + 1 and LOG[-1]["text"] == para(edit(fs, "ფინჯანი თბილია", "ფინჯანი ცხელია")),
      f"edit: a film voiced per sentence, one changed line: one request, the whole film as one take ({len(LOG) - n})")

# the model the film was voiced with goes first: a re-run costs nothing after an earlier model got its quota back
chain = vo.GEMINI_CHAIN
fm = spec("t-model", film("ღრუბელი მიცურავს ცაზე ჩიტი მღერის ტოტზე ბალახი მწვანეა ნამი ბრწყინავს დილით ბილიკი მიდის ტყისკენ შორს მთა მოჩანს"))
vo.GEMINI_CHAIN = ["gemini-3.8-quota-tts", "gemini-3.8-flash-tts"]
n = len(LOG)
m1, _ = quiet(lambda: asyncio.run(vo.build_any(fm)))
check(isinstance(m1, dict) and m1.get("model") == "gemini-3.8-flash-tts" and len(LOG) == n + 2,
      f"model: the first model out of quota, the film voiced on the next ({len(LOG) - n} calls)")
vo.GEMINI_CHAIN = ["gemini-3.8-flash-lite-tts", "gemini-3.8-flash-tts"]  # the earlier model has quota again
n = len(LOG)
m2, _ = quiet(lambda: asyncio.run(vo.build_any(fm)))
vo.GEMINI_CHAIN = chain
check(isinstance(m2, dict) and m2.get("model") == "gemini-3.8-flash-tts" and len(LOG) == n and times(m2) == times(m1),
      f"model: re-run keeps the film's own model and costs nothing ({len(LOG) - n} requests, {m2.get('model') if isinstance(m2, dict) else m2})")

# 9c. a new director's note (GEMINI_STYLE): a film voiced under an earlier one keeps its take for free; a changed
# line voices the whole film with today's note; VO_RESTYLE=1 voices it again with today's note
today, before = vo.GEMINI_STYLE, vo.GEMINI_STYLES_BEFORE
fo = film("ლამპა ანთია დერეფანში კატა სძინავს ხალიჩაზე საათი წიკწიკებს კედელზე ჩაიდანი შიშინებს ღუმელზე წვიმა წვეთავს სახურავზე ღამე გრძელია")
vo.GEMINI_STYLE = "ძველი შენიშვნა."
o1, _ = quiet(run, spec("t-note", fo))
vo.GEMINI_STYLE, vo.GEMINI_STYLES_BEFORE = today, ("ძველი შენიშვნა.",) + before
n = len(LOG)
o2, err = quiet(run, spec("t-note", fo))
check(len(LOG) == n and isinstance(o2, dict) and times(o2) == times(o1) and "kept as it is" in err,
      f"note: a film voiced under an earlier note is kept, no request ({len(LOG) - n})")
n = len(LOG)
_ = quiet(run, spec("t-note", edit(fo, "საათი წიკწიკებს", "საათი ჩერდება")))
check(len(LOG) == n + 1 and LOG[-1]["style"] == today and LOG[-1]["text"] == para(edit(fo, "საათი წიკწიკებს", "საათი ჩერდება")),
      f"note: a changed line voices the whole film with today's note, one request ({len(LOG) - n})")
os.environ["VO_RESTYLE"] = "1"
fo2 = film("ბაღში ვაშლი მწიფდება ღობეზე ვაზი ხვდება ეზოში ძაღლი ყეფს შორიდან ტრაქტორი გუგუნებს მინდორში ნისლი იფანტება მთებზე ცა ლურჯდება")
vo.GEMINI_STYLE = "ძველი შენიშვნა."
quiet(run, spec("t-note2", fo2))
vo.GEMINI_STYLE = today
n = len(LOG)
quiet(run, spec("t-note2", fo2))
os.environ.pop("VO_RESTYLE")
check(len(LOG) == n + 1 and LOG[-1]["style"] == today, f"note: VO_RESTYLE=1 voices it again with today's note ({len(LOG) - n})")
vo.GEMINI_STYLES_BEFORE = before

# 10. every model out of quota: VO_NO_EDGE=1 stops (exit 75, voice-quota.json); without it edge-tts with a warning
chain = vo.GEMINI_CHAIN
vo.GEMINI_CHAIN = ["gemini-3.8-quota-tts", "gemini-3.1-quota-tts"]
os.environ["VO_NO_EDGE"] = "1"
qpath = spec("t-noedge", [{"say": "თორმეტი ცამეტი."}])
res, err = quiet(vo.main, [qpath])
qf = os.environ["VO_QUOTA_FILE"]
q = json.load(open(qf)) if os.path.exists(qf) else {}
check(isinstance(res, SystemExit) and res.code == 75 and q.get("code") == "voice_quota" and "Tbilisi" in q.get("resets", "")
      and "fallback" not in q and "VOICE_QUOTA" in err,
      f"VO_NO_EDGE=1: exit {getattr(res, 'code', res)}, {q}, {err.strip().splitlines()[-1][:60] if err.strip() else ''}")
os.environ.pop("VO_NO_EDGE")
os.remove(qf) if os.path.exists(qf) else None


class EdgeCalled(Exception):
    pass


async def no_edge(*a, **k):
    raise EdgeCalled(a[1])


# the default, the Mac and the cloud alike (the owner, 2026-09-25): edge-tts, and the quota note says so
real_synth, vo.synth = vo.synth, no_edge
res, err = quiet(lambda: asyncio.run(vo.build_any(qpath)))
q = json.load(open(qf)) if os.path.exists(qf) else {}
check(isinstance(res, EdgeCalled) and str(res) == "ka-GE-GiorgiNeural" and "WARNING" in err and "NOT by the house voice" in err
      and q.get("code") == "voice_quota" and q.get("fallback") == "edge" and "Tbilisi" in q.get("resets", ""),
      f"the default: edge-tts (Giorgi for Charon) with a loud warning, quota note {q}")
fpath = spec("t-noedge-f", [{"say": "თოთხმეტი."}], voice="gemini:Achernar")
res, _ = quiet(lambda: asyncio.run(vo.build_any(fpath)))
check(isinstance(res, EdgeCalled) and str(res) == "ka-GE-EkaNeural", f"the female house voice falls back to Eka ({res})")
vo.synth, vo.GEMINI_CHAIN = real_synth, chain

# every run speaks for itself: a Gemini film removes an earlier run's note (the cloud voices a film twice)
had = os.path.exists(qf)
with contextlib.redirect_stdout(io.StringIO()):
    res, _ = quiet(vo.main, [spec("t-fresh", [{"say": "თხუთმეტი თექვსმეტი."}])])
check(had and isinstance(res, dict) and str(res.get("voice", "")).startswith("gemini:") and res.get("model") and not os.path.exists(qf),
      f"a Gemini run removes the earlier note ({res.get('voice') if isinstance(res, dict) else res}, note before: {had}, after: {os.path.exists(qf)})")
os.environ["VO_NO_EDGE"] = "true"
check(vo.no_edge(), "VO_NO_EDGE=true counts as on")
os.environ["VO_NO_EDGE"] = ""
check(not vo.no_edge(), "an empty VO_NO_EDGE (the repo variable not set) is off")
os.environ.pop("VO_NO_EDGE")

# 11. a model that fails for another reason than its quota (retired: 404, a refused key: 403) is skipped like a
# model out of quota: the next model reads the film, and after the last one edge-tts does (a film always comes
# out); the note then says why (not the quota), VO_NO_EDGE stops it as an ordinary failure, never exit 75
chain = vo.GEMINI_CHAIN
vo.GEMINI_CHAIN = ["gemini-3.8-quota-tts", "gemini-9.9-gone-tts", "gemini-3.1-next-tts"]
n = len(LOG)
res, err = quiet(lambda: asyncio.run(vo.build_any(spec("t-chain-err", [{"say": "ჩვიდმეტი თვრამეტი."}]))))
check(isinstance(res, dict) and res.get("model") == "gemini-3.1-next-tts" and "404" in err and "NOT_FOUND" in err
      and [x["model"] for x in LOG[n:]] == vo.GEMINI_CHAIN,
      f"a retired model (404) is skipped: {res.get('model') if isinstance(res, dict) else res}, asked {[x['model'] for x in LOG[n:]]}")
vo.GEMINI_CHAIN = ["gemini-3.8-quota-tts", "gemini-9.9-gone-tts", "gemini-9.9-denied-tts"]
real_synth, vo.synth = vo.synth, no_edge
epath = spec("t-chain-dead", [{"say": "ცხრამეტი ოცი."}])
res, err = quiet(lambda: asyncio.run(vo.build_any(epath)))
q = json.load(open(qf)) if os.path.exists(qf) else {}
check(isinstance(res, EdgeCalled) and q.get("fallback") == "edge" and q.get("why") == "gemini_error"
      and "123456789" not in err and "CONSUMER_SUSPENDED" in err,
      f"every model failed or out of quota: edge-tts, note {q}, project number kept out of the log: {'123456789' not in err}")
os.environ["VO_NO_EDGE"] = "1"
res, err = quiet(vo.main, [epath])
check(isinstance(res, SystemExit) and res.code != 75 and "VOICE_QUOTA" not in err,
      f"VO_NO_EDGE=1 with a failed model: an ordinary failure, not voice_quota (exit {getattr(res, 'code', res)!r:.80})")
os.environ.pop("VO_NO_EDGE")
os.remove(qf) if os.path.exists(qf) else None
vo.synth, vo.GEMINI_CHAIN = real_synth, chain


def note():
    return json.load(open(qf)) if os.path.exists(qf) else {}


# 12. a model that is not there (404) is absent, not an error: a day with [out of quota, 404, out of quota] is a quota
# day (the note has no "why", so publish.mjs sets post.json "geminiOut" and the site warns), and VO_NO_EDGE stops it
# as the quota (exit 75); a chain where no model said it was out of quota is still a Gemini error
chain = vo.GEMINI_CHAIN
vo.GEMINI_CHAIN = ["gemini-3.8-quota-tts", "gemini-9.9-gone-tts", "gemini-3.1-quota-tts"]
real_synth, vo.synth = vo.synth, no_edge
gpath = spec("t-chain-gone", [{"say": "ოცდაერთი ოცდაორი."}])
res, err = quiet(lambda: asyncio.run(vo.build_any(gpath)))
q = note()
check(isinstance(res, EdgeCalled) and q.get("fallback") == "edge" and "why" not in q and "NOT_FOUND" in err
      and err.count("no such model") == 1 and "failed" not in err.split("WARNING:")[-1].split(";")[0],
      f"[quota, 404, quota]: edge-tts, the note is the quota's (no why: geminiOut true): {q}")
os.environ["VO_NO_EDGE"] = "1"
res, err = quiet(vo.main, [gpath])
q = note()
check(isinstance(res, SystemExit) and res.code == 75 and "VOICE_QUOTA" in err and q.get("code") == "voice_quota" and "fallback" not in q,
      f"[quota, 404, quota] with VO_NO_EDGE=1: exit {getattr(res, 'code', res)!r:.60}, note {q}")
vo.GEMINI_CHAIN = ["gemini-9.9-gone-tts", "gemini-9.8-gone-tts"]
res, err = quiet(vo.main, [gpath])
check(isinstance(res, SystemExit) and res.code != 75 and "VOICE_QUOTA" not in err and "404" in str(res.code),
      f"[404, 404] with VO_NO_EDGE=1: no model said quota, an ordinary failure ({str(getattr(res, 'code', res))[:70]})")
os.environ.pop("VO_NO_EDGE")
res, err = quiet(lambda: asyncio.run(vo.build_any(gpath)))
check(isinstance(res, EdgeCalled) and note().get("why") == "gemini_error", f"[404, 404]: edge-tts, note {note()}")
os.remove(qf) if os.path.exists(qf) else None

# 13. a 200 with no audio, every time: two answers on the first model, then edge-tts at once (the other models are
# not asked: every answer costs a request of the free quota), and the film's text is marked for the job, so the
# second run of the job (check.mjs, then the voice step) asks Gemini nothing
vo.GEMINI_CHAIN = ["gemini-3.8-flash-tts", "gemini-3.8-flash-lite-tts", "gemini-3.1-next-tts", "gemini-2.5-next-tts"]
mark = os.path.join(TMP, "ci", "voice-noaudio.json")
mpath = spec("t-mute", [{"say": "ოცდასამი ოცდაოთხი."}], voice="gemini:Mute")
n = len(LOG)
res, err = quiet(lambda: asyncio.run(vo.build_any(mpath)))
q = note()
check(isinstance(res, EdgeCalled) and len(LOG) - n == vo.NO_AUDIO_TRIES <= 3 and q.get("fallback") == "edge"
      and q.get("why") == "gemini_error" and os.path.exists(mark) and "no audio for this film" in err,
      f"no audio, every time: {len(LOG) - n} requests (not 24), then edge-tts, note {q}, marked: {os.path.exists(mark)}")
n = len(LOG)
res, err = quiet(vo.main, [mpath])
check(isinstance(res, EdgeCalled) and len(LOG) == n and note().get("why") == "gemini_error" and "not asked again" in err,
      f"the job's second run of that film: {len(LOG) - n} requests, edge-tts, note {note()}")
os.environ["VO_NO_EDGE"] = "1"
res, err = quiet(vo.main, [mpath])
check(isinstance(res, SystemExit) and res.code != 75 and len(LOG) == n and "VOICE_QUOTA" not in err,
      f"the same with VO_NO_EDGE=1: an ordinary failure, no request ({str(getattr(res, 'code', res))[:60]})")
os.environ.pop("VO_NO_EDGE")
n = len(LOG)
res, _ = quiet(lambda: asyncio.run(vo.build_any(spec("t-mute-other", [{"say": "ოცდახუთი ოცდაექვსი."}]))))
check(isinstance(res, dict) and res.get("model") == "gemini-3.8-flash-tts" and len(LOG) == n + 1,
      f"another film in the same job still goes to Gemini ({len(LOG) - n} request)")
os.environ["GITHUB_RUN_ID"] = "4242"  # another job: an earlier job's mark counts for nothing
n = len(LOG)
res, _ = quiet(lambda: asyncio.run(vo.build_any(mpath)))
check(isinstance(res, EdgeCalled) and len(LOG) - n == vo.NO_AUDIO_TRIES, f"another job asks Gemini again ({len(LOG) - n})")
os.environ.pop("GITHUB_RUN_ID")
os.remove(qf) if os.path.exists(qf) else None
vo.synth = real_synth

# 14. an answer cut short or not JSON is asked again like a network error, never a crash: then the next model
vo.GEMINI_CHAIN = ["gemini-3.8-trunc-tts"]
n = len(LOG)
res, err = quiet(lambda: asyncio.run(vo.build_any(spec("t-trunc", [{"say": "ოცდაშვიდი ოცდარვა."}]))))
check(isinstance(res, dict) and res.get("model") == "gemini-3.8-trunc-tts" and len(LOG) - n == 2,
      f"an answer cut short (IncompleteRead) is asked again: {res.get('model') if isinstance(res, dict) else repr(res)[:80]}, {len(LOG) - n} calls")
sleep, vo.time.sleep = vo.time.sleep, lambda s: None  # six tries of a junk model without their 30 s of waiting
vo.GEMINI_CHAIN = ["gemini-9.9-junk-tts", "gemini-3.1-next-tts"]
n = len(LOG)
res, err = quiet(lambda: asyncio.run(vo.build_any(spec("t-junk", [{"say": "ოცდაცხრა ოცდაათი."}]))))
check(isinstance(res, dict) and res.get("model") == "gemini-3.1-next-tts" and "JSONDecodeError" in err
      and [x["model"] for x in LOG[n:]] == ["gemini-9.9-junk-tts"] * 6 + ["gemini-3.1-next-tts"],
      f"an answer that is not JSON: asked again, then the next model ({res.get('model') if isinstance(res, dict) else repr(res)[:80]})")
res, err = quiet(vo.main, [spec("t-junk-pin", [{"say": "ოცდაცხრა ოცდაათი."}], geminiModel="gemini-9.9-junk-tts")])
check(isinstance(res, SystemExit) and "junk" in str(res.code) and "Traceback" not in err,
      f"a pinned model that answers junk: a clean stop, no traceback ({str(getattr(res, 'code', res))[:60]})")
vo.time.sleep = sleep
vo.GEMINI_CHAIN = chain

srv.shutdown()
import shutil  # noqa: E402
shutil.rmtree(TMP, ignore_errors=True)
print(f"\n{'ALL OK' if not FAILS else f'{len(FAILS)} FAILED'} ({len(LOG)} mock requests)")
sys.exit(1 if FAILS else 0)
