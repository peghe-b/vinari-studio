#!/usr/bin/env python3
"""Voiceover + subtitle timing for one video spec (Georgian, English, Russian). Free: edge-tts, no ffmpeg.

    python3 tools/vo.py specs/<id>.json
    python3 tools/vo.py specs/v4-deadlines.en.json      (or its id: v4-deadlines-en)

The spec's "lang" is "ka" (default), "en" or "ru". With no "voice" the language's male voice
reads it (Giorgi / Andrew / Dmitry). A "voice" from another language keeps its gender and
switches language (Eka -> Ava / Svetlana, Giorgi -> Andrew / Dmitry), so a translation can
keep the Georgian spec's voice line; any voice of the spec's own language is used as is.

Reads the spec's beats, synthesises every sentence as one edge-tts request (so it keeps
natural prosody) with boundary="WordBoundary", trims the lead/tail silence using the word
offsets, joins sentences with "sentenceGap" and beats with "gap" (+ "hold") and writes:

    public/vo/<id>/voice.wav        24 kHz mono PCM, the whole voice track
    public/vo/<id>/timeline.json    beat and subtitle-chunk times on that track

A beat's "say" is split into subtitle chunks by "|". "show" (optional) is the on-screen
text with the same number of chunks: digits on screen, words in the voice. Chunk timing
always comes from the spoken words, so show may differ freely inside a chunk.

Every request is cached by content hash in tools/.vo_cache, so a re-render never touches
the network and a changed beat only re-synthesises that beat.

Three more voice sources besides edge-tts (a beat's own "voice" may mix them):

  "voice": "gemini:Charon"   Google Gemini TTS (free AI Studio key in env GEMINI_API_KEY, or on the
      first line of ~/.config/vinari/gemini.key; env GEMINI_KEY_FILE points elsewhere).
      Gemini gives no word timings, so every subtitle chunk is its own request and its timing is
      exact (the speech inside each returned clip is found by its energy). "geminiSplit":
      "sentence" instead reads a whole sentence in one request (better flow, fewer requests of the
      free daily quota) and puts the chunk borders in the pauses nearest to where they should be.
      "style" (spec or beat) is the director's note, e.g. "calm documentary narrator, unhurried";
      "geminiModel" (or env GEMINI_TTS_MODEL) picks the model, default gemini-3.8-flash-tts.
      "chunkGap" (default 0.05 s) is the extra silence between two chunks read separately.
      Any voice id works after "gemini:": the 30 prebuilt names, the voice library, or a
      designed/replicated "voice_..." id. "rate"/"pitch" do not apply (say it in "style").
  "voice": "recorded"        the owner's own voice from tools/record.mjs: never synthesised.
  A recorded timeline (public/vo/<id>/timeline.json with "source": "recorded") is kept as it is
  whatever the voice is, until the spec's words change: a changed "show" only updates the
  subtitle text, a changed "say" (or its "|" split) makes the recording stale. Then a
  "recorded" spec stops with the beats to record again; any other voice backs the recording
  up (voice.recorded.wav, timeline.recorded.json) and synthesises as usual.

Env for tests: VO_CACHE (cache folder), VO_OUT (instead of public/vo), GEMINI_BASE_URL, VO_FFMPEG=1
(decode with ffmpeg even where afconvert exists, as on Linux). VS_FFMPEG points at another ffmpeg.

Runs on the Mac (afconvert decodes) and on Linux, e.g. the GitHub Actions studio workflow (Remotion's
bundled ffmpeg decodes, the packages come from requirements.txt).
"""
import array
import asyncio
import base64
import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time
import urllib.error
import urllib.request
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
# tools/pylib holds packages installed on the Mac (python3 -m pip install --target tools/pylib ...), with
# macOS builds of the compiled ones (aiohttp). The Mac reads it first, as always; anywhere else the
# pip-installed packages (requirements.txt) come first and pylib only fills a gap.
if sys.platform == "darwin":
    sys.path.insert(0, os.path.join(HERE, "pylib"))
else:
    sys.path.append(os.path.join(HERE, "pylib"))
import edge_tts  # noqa: E402


class GeminiQuota(Exception):
    """A Gemini model's free daily quota is used up. A plain Exception on purpose: a SystemExit
    raised inside asyncio.to_thread escapes the event loop and build_any could never catch it."""

SR = 24000
# Word boundaries under-report the last vowel's decay (measured up to 0.23 s) and the first
# consonant's onset (up to 0.10 s), so the cut keeps generous pads and fades both ends.
PAD_IN, PAD_OUT, FADE = 0.10, 0.25, 0.010
CACHE = os.environ.get("VO_CACHE") or os.path.join(HERE, ".vo_cache")
VO_OUT = os.environ.get("VO_OUT") or os.path.join(os.path.dirname(HERE), "public", "vo")

# Decoding to 24 kHz mono 16-bit: macOS's afconvert, else Remotion's bundled ffmpeg (Linux).
AFCONVERT = None if os.environ.get("VO_FFMPEG") else shutil.which("afconvert")
# An MP3 decoder puts 529 samples of its own delay before the audio. afconvert drops them; ffmpeg
# cannot know to, since edge-tts streams carry no gapless header. Measured 2026-09-24 on the cached
# clips: ffmpeg's output is afconvert's shifted by exactly 529 samples (22 ms), same length, samples
# within 1 LSB. The word timings count from the audio, so the ffmpeg path drops the delay itself.
MP3_DECODER_DELAY = 529


def ffmpeg_bin():
    """Remotion's bundled ffmpeg for this machine (the one the renders use), else one on PATH."""
    if os.environ.get("VS_FFMPEG"):
        return os.environ["VS_FFMPEG"]
    import platform
    arch = {"x86_64": "x64", "amd64": "x64", "aarch64": "arm64", "arm64": "arm64"}.get(platform.machine().lower(), platform.machine().lower())
    names = [f"darwin-{arch}"] if sys.platform == "darwin" else [f"linux-{arch}-gnu", f"linux-{arch}-musl"]
    for n in names:
        p = os.path.join(os.path.dirname(HERE), "node_modules", "@remotion", f"compositor-{n}", "ffmpeg")
        if os.path.exists(p):
            return p
    p = shutil.which("ffmpeg")
    if p:
        return p
    raise SystemExit("vo.py: neither afconvert nor ffmpeg found (npm ci installs Remotion's; or set VS_FFMPEG)")


def ffmpeg_wav(src, dst, mp3=False):
    """src -> dst as a 24 kHz mono 16-bit PCM WAV through ffmpeg; an MP3 loses its decoder delay (and
    gets the same number of silent samples at the end, so it keeps afconvert's length)."""
    ff = ffmpeg_bin()
    d = os.path.dirname(ff)
    env = dict(os.environ, DYLD_LIBRARY_PATH=d) if sys.platform == "darwin" else None  # as Remotion runs it
    tmp = dst + ".ff.wav"
    subprocess.run([ff, "-hide_banner", "-loglevel", "error", "-nostdin", "-y", "-i", os.path.abspath(src),
                    "-map_metadata", "-1", "-fflags", "+bitexact", "-flags:a", "+bitexact",
                    "-ac", "1", "-ar", str(SR), "-c:a", "pcm_s16le", "-f", "wav", os.path.abspath(tmp)],
                   check=True, cwd=d if os.path.isabs(ff) else None, env=env)
    with wave.open(tmp) as w:
        data = w.readframes(w.getnframes())
    os.remove(tmp)
    if mp3:
        k = min(MP3_DECODER_DELAY * 2, len(data))
        data = data[k:] + b"\x00" * k
    with wave.open(dst, "wb") as o:
        o.setnchannels(1)
        o.setsampwidth(2)
        o.setframerate(SR)
        o.writeframes(data)

# The app ships in these three. Every voice here is checked against edge-tts's list_voices().
VOICES = {
    "ka": {"male": "ka-GE-GiorgiNeural", "female": "ka-GE-EkaNeural"},
    "en": {"male": "en-US-AndrewNeural", "female": "en-US-AvaNeural"},
    "ru": {"male": "ru-RU-DmitryNeural", "female": "ru-RU-SvetlanaNeural"},
}
GENDER = {v: g for by in VOICES.values() for g, v in by.items()}


def voice_for(voice, lang, where):
    """The voice that reads `lang`: the spec's own if it speaks that language, otherwise the
    same-gender default of the language (a translation keeps the Georgian voice's gender)."""
    if not voice:
        return VOICES[lang]["male"]
    if voice.split("-")[0].lower() == lang or "Multilingual" in voice or voice.startswith("gemini:") or voice == "recorded":
        return voice
    if voice in GENDER:
        mapped = VOICES[lang][GENDER[voice]]
        print(f"note: {where}: {voice} does not speak {lang}; {mapped} reads it (same gender)", file=sys.stderr)
        return mapped
    raise SystemExit(f"{where}: voice {voice} does not speak lang {lang!r}; use a {lang} voice, e.g. {VOICES[lang]['female']}")


def spec_file(arg):
    """A spec path, or an id. Ids and files differ for a translation ("<base>-en" lives in
    specs/<base>.en.json) and a hook variant ("<base>-h2" in specs/<base>--h2.json; both:
    "<base>-h2-en" in specs/<base>--h2.en.json), so tools that pass "specs/<id>.json" still work."""
    if os.path.exists(arg):
        return arg
    name = os.path.basename(arg)
    name = name[:-5] if name.endswith(".json") else name
    folder = os.path.dirname(arg) or os.path.join(os.path.dirname(HERE), "specs")
    tries = [os.path.join(folder, name + ".json")]
    langs = "|".join(k for k in VOICES if k != "ka")
    m = re.fullmatch(r"(.+?)(?:-(h\d+))?(?:-(%s))?" % langs, name)
    if m and (m[2] or m[3]):
        tries.append(os.path.join(folder, m[1] + (f"--{m[2]}" if m[2] else "") + (f".{m[3]}" if m[3] else "") + ".json"))
    for t in tries:
        if os.path.exists(t):
            return t
    raise SystemExit(f"no spec {arg} (looked for {', '.join(tries)})")


def norm(s):
    return re.sub(r"[^\w]", "", s, flags=re.UNICODE).lower()


def write_atomic(path, data):
    """A killed run must never leave a truncated file in the cache."""
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def spoken_tokens(text):
    """Whitespace tokens that carry at least one letter or digit, with their chunk index."""
    out = []
    for ci, chunk in enumerate(text.split("|")):
        for tok in chunk.split():
            if norm(tok):
                out.append((ci, tok))
    return out


async def synth(text, voice, rate, pitch, tries=5):
    key = hashlib.sha1(json.dumps([text, voice, rate, pitch]).encode()).hexdigest()[:16]
    mp3, meta = os.path.join(CACHE, key + ".mp3"), os.path.join(CACHE, key + ".json")
    if os.path.exists(mp3) and os.path.exists(meta):
        return mp3, json.load(open(meta, encoding="utf-8"))
    last = None
    for attempt in range(tries):
        try:
            comm = edge_tts.Communicate(text, voice, rate=rate, pitch=pitch, boundary="WordBoundary")
            audio, words = bytearray(), []
            async for ch in comm.stream():
                if ch["type"] == "audio":
                    audio += ch["data"]
                elif ch["type"] == "WordBoundary":
                    words.append({"text": ch["text"], "start": ch["offset"] / 1e7,
                                  "end": (ch["offset"] + ch["duration"]) / 1e7})
            if not audio or not words:
                raise RuntimeError("empty audio or no word boundaries")
            write_atomic(mp3, bytes(audio))
            write_atomic(meta, json.dumps(words, ensure_ascii=False).encode("utf-8"))
            return mp3, words
        except (ValueError, TypeError) as e:  # a bad rate/pitch/voice: retrying cannot help
            raise SystemExit(f"edge-tts rejected {text!r}: {e}")
        except Exception as e:  # network, 403, NoAudioReceived
            last = e
            if attempt < tries - 1:
                await asyncio.sleep(1.5 * (2 ** attempt))
    raise RuntimeError(f"edge-tts failed for {text!r}: {last}. Try: python3 -m pip install --target tools/pylib -U edge-tts")


def attach(tokens, events, lost=None):
    """Map word-boundary events onto spoken tokens by walking the normalised text, so one token
    may own several events ("09:00" -> "09", "00"; "rs.ge" -> "rs", "ge") and one event may
    cover several tokens: the en/ru voices report "3 days", "9 a.m." or "3 610 лари" as one
    word, and its time is then shared between those tokens by letters.
    Returns [(token_index, start, end)]. Events it cannot place go to `lost`."""
    if not tokens:
        return []
    stream, owner, ends = "", [], []
    for j, (_, tok) in enumerate(tokens):
        n = norm(tok)
        stream += n
        owner += [j] * len(n)
        ends.append(len(stream))
    starts = {e - len(norm(tok)) for e, (_, tok) in zip(ends, tokens)}
    out, pos = [], 0

    def put(j, s, e):
        if out and out[-1][0] == j:
            out[-1] = (j, out[-1][1], e)
        else:
            out.append((j, s, e))

    for ev in events:
        n = norm(ev["text"])
        cur = owner[min(pos, len(owner) - 1)]
        nxt = ends[min(cur + 1, len(ends) - 1)]
        # never jump past the next token
        k = stream.find(n, pos, nxt) if n else -1
        if k < 0 and n:
            # one event over three or more tokens: it still has to start by the next token
            k = stream.find(n, pos)
            k = k if 0 <= k < nxt else -1
        if k < 0 and n:
            # the voice skipped a word or read it as something else: pick the thread up again
            # at a word that starts with this event, at most two words further on
            far = ends[min(cur + 3, len(ends) - 1)]
            k = stream.find(n, pos, far)
            while k >= 0 and k not in starts:
                k = stream.find(n, k + 1, far)
        if k < 0:
            if lost is not None and n:
                lost.append(ev["text"])
            put(cur, ev["start"], ev["end"])  # something we cannot place stays on the current token
            continue
        pos = k + len(n)
        first, last = owner[k], owner[pos - 1]
        if first == last:
            put(first, ev["start"], ev["end"])
            continue
        dur = ev["end"] - ev["start"]
        for j in range(first, last + 1):
            a = max(k, ends[j] - len(norm(tokens[j][1]))) - k
            z = min(pos, ends[j]) - k
            put(j, ev["start"] + dur * a / len(n) if a else ev["start"],
                ev["start"] + dur * z / len(n) if z < len(n) else ev["end"])
    return out


def listen(say, events):
    """The listening proxy: words the voice gave no boundary for, and boundaries that match no
    word. Either means the voice read something other than the text (a digit, a symbol, Latin in
    a Georgian line), so the subtitle timing there is guessed."""
    tokens = spoken_tokens(say)
    lost = []
    got = {j for j, _, _ in attach(tokens, events, lost)}
    return [(ci, tok) for j, (ci, tok) in enumerate(tokens) if j not in got], lost


def chunk_times(say, events):
    """Start/end of every |-chunk, from the words spoken in it."""
    tokens = spoken_tokens(say)
    n_chunks = len(say.split("|"))
    spans = [[None, None] for _ in range(n_chunks)]
    for j, s, e in attach(tokens, events):
        ci = tokens[j][0]
        spans[ci][0] = s if spans[ci][0] is None else min(spans[ci][0], s)
        spans[ci][1] = e if spans[ci][1] is None else max(spans[ci][1], e)
    # a chunk with no matched word borrows its neighbours' boundary
    first, last = events[0]["start"], events[-1]["end"]
    for ci in range(n_chunks):
        if spans[ci][0] is None:
            prev_end = next((spans[k][1] for k in range(ci - 1, -1, -1) if spans[k][1] is not None), first)
            spans[ci] = [prev_end, prev_end]
    for ci in range(n_chunks - 1, -1, -1):
        if spans[ci][1] is None or spans[ci][1] < spans[ci][0]:
            spans[ci][1] = spans[ci + 1][0] if ci + 1 < n_chunks else last
    return spans


# ---- Gemini TTS ("voice": "gemini:<name>") -----------------------------------------------------
# https://ai.google.dev/gemini-api/docs/speech-generation (free tier: AI Studio key, no card).
GEMINI_MODEL = os.environ.get("GEMINI_TTS_MODEL", "gemini-3.8-flash-tts")
# Each Gemini TTS model has its own free daily quota. A video tries them in this order and never
# mixes two models (their takes of one voice differ); when all are used up it falls back to edge-tts.
GEMINI_CHAIN = [m.strip() for m in os.environ.get(
    "GEMINI_TTS_CHAIN",
    "gemini-3.8-flash-tts,gemini-3.8-flash-lite-tts,gemini-3.1-flash-tts-preview,gemini-2.5-flash-preview-tts",
).split(",") if m.strip()]
GEMINI_BASE = os.environ.get("GEMINI_BASE_URL", "https://generativelanguage.googleapis.com").rstrip("/")
# Written in Georgian on purpose (owner, 2026-09-24): with an English direction the model gave
# "ვინარი" an English stress. A Georgian direction keeps every word, the brand included, Georgian.
GEMINI_STYLE = ("მშვიდი, თბილი ქართველი მთხრობელი, მიკროფონთან ახლოს, წყნარ ოთახში. ლაპარაკობს აუჩქარებლად "
                "და დარწმუნებით, როგორც დოკუმენტური ფილმის მთხრობელი, მეგობრულად და ბუნებრივად, არასდროს "
                "როგორც რეკლამა. ყველა სიტყვა, მათ შორის „ვინარი\", წარმოთქვი ქართული გამოთქმით: ვი-ნა-რი.")
G_PAD_OUT = 0.12   # the energy edge is exact (no boundary under-report), so a shorter tail pad
_legacy_shape = {}  # model -> True once it refused the 3.8 request shape


def gemini_new_shape(model):
    """3.8+ takes {"voice": name} and a speech_metadata style; 2.x-3.7 prebuiltVoiceConfig and a prompt."""
    if model in _legacy_shape:
        return not _legacy_shape[model]
    m = re.match(r"gemini-(\d+)\.(\d+)", model)
    return not m or (int(m[1]), int(m[2])) >= (3, 8)


def gemini_body(text, name, style, new):
    part = {"text": text}
    if style and new:
        part["speech_metadata"] = {"style": style}
    elif style:  # the older models take the direction as a prompt line
        part["text"] = f"{style.rstrip('. ')}:\n{text}"
    vc = {"voice": name} if new else {"prebuiltVoiceConfig": {"voiceName": name}}
    return {"contents": [{"role": "user", "parts": [part]}],
            "generationConfig": {"responseModalities": ["AUDIO"], "speechConfig": {"voiceConfig": vc}}}


def read_wav_bytes(data):
    """24 kHz mono int16 samples from any PCM WAV; a WAV with another rate or channel count goes
    through afconvert. Reads the chunks itself (afconvert may write WAVE_FORMAT_EXTENSIBLE)."""
    pos, fmt, pcm = 12, None, None
    while pos + 8 <= len(data):
        cid, size = data[pos:pos + 4], int.from_bytes(data[pos + 4:pos + 8], "little")
        body = data[pos + 8:pos + 8 + size]
        if cid == b"fmt ":
            fmt = (int.from_bytes(body[2:4], "little"), int.from_bytes(body[4:8], "little"), int.from_bytes(body[14:16], "little"))
        elif cid == b"data":
            pcm = body
        pos += 8 + size + (size & 1)
    if not fmt or pcm is None:
        raise RuntimeError("not a PCM WAV")
    ch, rate, bits = fmt
    if (ch, rate, bits) == (1, SR, 16):
        return array.array("h", pcm[:len(pcm) // 2 * 2])
    with tempfile.TemporaryDirectory() as d:
        src, dst = os.path.join(d, "in.wav"), os.path.join(d, "out.wav")
        open(src, "wb").write(data)
        if AFCONVERT:
            subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", src, dst], check=True)
        else:
            ffmpeg_wav(src, dst)
        return read_wav_bytes(open(dst, "rb").read())


def gemini_audio(raw, mime):
    """Gemini returns a RIFF WAV (3.8 unary default) or headerless 16-bit PCM
    ("audio/L16;codec=pcm;rate=24000", little-endian in practice) -> 24 kHz mono int16."""
    if raw[:4] == b"RIFF":
        return read_wav_bytes(raw)
    m = re.search(r"rate=(\d+)", mime or "")
    rate = int(m[1]) if m else SR
    c = re.search(r"channels=(\d+)", mime or "")
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(int(c[1]) if c else 1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(raw[:len(raw) // 2 * 2])
    return read_wav_bytes(buf.getvalue())


GEMINI_KEY_FILE = os.environ.get("GEMINI_KEY_FILE") or os.path.expanduser("~/.config/vinari/gemini.key")


def gemini_key():
    """The Gemini key: env GEMINI_API_KEY (or GOOGLE_API_KEY), else the first line of
    ~/.config/vinari/gemini.key (env GEMINI_KEY_FILE points elsewhere). Never printed."""
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if key:
        return key.strip()
    try:
        with open(GEMINI_KEY_FILE, encoding="utf-8") as f:
            return (f.readline() or "").strip() or None
    except OSError:
        return None


def gemini_request(text, voice, model, style, tries=6):
    key = gemini_key()
    if not key:
        raise SystemExit("gemini: set GEMINI_API_KEY or put the key on the first line of "
                         f"{GEMINI_KEY_FILE} (a free key from https://aistudio.google.com/apikey)")
    name = voice.split(":", 1)[1]
    url = f"{GEMINI_BASE}/v1beta/models/{model}:generateContent"
    flipped = False
    for attempt in range(tries):
        new = gemini_new_shape(model)
        req = urllib.request.Request(url, data=json.dumps(gemini_body(text, name, style, new)).encode(),
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read())
        except urllib.error.HTTPError as e:
            msg = e.read().decode("utf-8", "replace")
            if e.code == 429:
                if re.search(r"PerDay|per day", msg, re.I):
                    raise GeminiQuota(f"gemini: the free daily quota of {model} is used up. Every line made so far is "
                                     "cached; run again after midnight Pacific time (or pick another model).")
                d = re.search(r'"retryDelay":\s*"(\d+(?:\.\d+)?)s"', msg)
                wait = float(d[1]) + 1 if d else 15.0 * (attempt + 1)
                print(f"gemini: rate limit, waiting {wait:.0f}s", file=sys.stderr)
                time.sleep(min(wait, 90))
                continue
            if e.code == 400 and not flipped and re.search(r"Unknown name|Invalid JSON payload|Cannot find field", msg):
                _legacy_shape[model] = new  # the other request shape
                flipped = True
                continue
            if e.code >= 500 and attempt < tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise SystemExit(f"gemini {e.code} for {text!r}: {msg[:400]}")
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt < tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise RuntimeError(f"gemini: {e}")
        parts = ((j.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
        inline = next((p.get("inlineData") or p.get("inline_data") for p in parts if p.get("inlineData") or p.get("inline_data")), None)
        if inline and inline.get("data"):
            return gemini_audio(base64.b64decode(inline["data"]), inline.get("mimeType") or inline.get("mime_type"))
        # TTS sometimes finishes with no audio ("OTHER"): asking again usually works
        print(f"gemini: no audio for {text!r} ({json.dumps(j)[:200]}), asking again", file=sys.stderr)
        time.sleep(1.5)
    raise RuntimeError(f"gemini: no audio for {text!r} after {tries} tries")


def voiced_runs(pcm, win=SR // 100):
    """Speech as runs of 10 ms windows well above the clip's noise floor. Runs closer than 250 ms
    merge (a plosive joins its vowel); a lone run under 90 ms is a click, not speech."""
    rms = []
    for i in range(0, max(0, len(pcm) - win) + 1, win):
        s = pcm[i:i + win]
        rms.append((sum(x * x for x in s) / max(1, len(s))) ** 0.5)
    if not rms or max(rms) <= 0:
        return [], rms, 0.0
    live = sorted(v for v in rms if v > 0)  # digital silence is not the room
    floor = live[len(live) // 10]
    thr = max(floor * 3.2, max(rms) * 10 ** (-38 / 20), 30.0)
    runs, cur = [], None
    for k, v in enumerate(rms):
        if v > thr:
            cur = [k, k + 1] if cur is None else [cur[0], k + 1]
        elif cur is not None:
            runs.append(cur)
            cur = None
    if cur is not None:
        runs.append(cur)
    merged = []
    for r in runs:
        if merged and r[0] - merged[-1][1] < 25:
            merged[-1][1] = r[1]
        else:
            merged.append(list(r))
    speech = [r for r in merged if r[1] - r[0] >= 9]
    return [(a * win / SR, b * win / SR) for a, b in speech], rms, thr


def speech_bounds(pcm):
    runs, _, _ = voiced_runs(pcm)
    if not runs:
        return 0.0, len(pcm) / SR
    return runs[0][0], runs[-1][1]


def pause_split(pcm, chunk_texts):
    """Chunk borders inside one sentence read in one go: for each border, the silent gap (>= 60 ms)
    nearest to where the letters say it should be. Returns [(start, end)] per chunk, and the
    borders that had to be guessed."""
    on, off = speech_bounds(pcm)
    win = SR // 100
    _, rms, thr = voiced_runs(pcm)
    gaps = []  # every pause inside the speech: windows under the threshold for >= 60 ms
    k, n = 0, len(rms)
    while k < n:
        if rms[k] <= thr and on < k * win / SR < off:
            j = k
            while j < n and rms[j] <= thr:
                j += 1
            if j - k >= 6:
                gaps.append((k * win / SR, j * win / SR))
            k = j
        else:
            k += 1
    letters = [max(1, len(norm(t))) for t in chunk_texts]
    total, acc, borders, guessed, last = sum(letters), 0, [], [], on
    for ci in range(len(chunk_texts) - 1):
        acc += letters[ci]
        want = on + (off - on) * acc / total
        cands = [g for g in gaps if g[0] > last + 0.15 and abs((g[0] + g[1]) / 2 - want) < 0.35 * (off - on)]
        if cands:
            g = min(cands, key=lambda g: abs((g[0] + g[1]) / 2 - want) - 0.4 * min(0.5, g[1] - g[0]))
            borders.append(g)
            last = g[1]
        else:
            borders.append((want, want))
            guessed.append(ci)
            last = want
    edges = [on] + [x for g in borders for x in g] + [off]
    return [(edges[2 * i], edges[2 * i + 1]) for i in range(len(chunk_texts))], guessed


async def gemini_synth(text, voice, model, style):
    """One cached Gemini clip: 24 kHz mono int16 samples."""
    key = hashlib.sha1(json.dumps(["gemini", model, voice, style, text], ensure_ascii=False).encode()).hexdigest()[:16]
    path = os.path.join(CACHE, key + ".gemini.wav")
    if not os.path.exists(path):
        pcm = await asyncio.to_thread(gemini_request, text, voice, model, style)
        buf = io.BytesIO()
        with wave.open(buf, "wb") as w:
            w.setnchannels(1)
            w.setsampwidth(2)
            w.setframerate(SR)
            w.writeframes(pcm.tobytes())
        write_atomic(path, buf.getvalue())
    return read_wav_bytes(open(path, "rb").read())


def fade(seg):
    nf = min(int(FADE * SR), len(seg) // 2)
    for i in range(nf):
        g = i / nf
        seg[i] = int(seg[i] * g)
        seg[-1 - i] = int(seg[-1 - i] * g)
    return seg


async def gemini_group(chunk_texts, voice, model, style, split, chunk_gap, where):
    """One sentence for the timeline: (segment samples, [(start, end)] per chunk in the segment)."""
    if split == "sentence" and len(chunk_texts) > 1:
        pcm = await gemini_synth(" ".join(chunk_texts), voice, model, style)
        spans, guessed = pause_split(pcm, chunk_texts)
        for ci in guessed:
            print(f"listen: {where}: no pause after chunk {ci}; its border is placed by letters", file=sys.stderr)
        a = max(0.0, spans[0][0] - PAD_IN)
        z = min(len(pcm) / SR, spans[-1][1] + G_PAD_OUT)
        return fade(pcm[int(a * SR):int(z * SR)]), [(s - a, e - a) for s, e in spans]
    seg, spans = array.array("h"), []
    for ci, t in enumerate(chunk_texts):
        pcm = await gemini_synth(t, voice, model, style)
        on, off = speech_bounds(pcm)
        a, z = max(0.0, on - PAD_IN), min(len(pcm) / SR, off + G_PAD_OUT)
        if ci:
            seg += array.array("h", bytes(2 * int(chunk_gap * SR)))
        base = len(seg) / SR
        spans.append((base + on - a, base + off - a))
        seg += fade(pcm[int(a * SR):int(z * SR)])
    return seg, spans


# ---- recorded voice (tools/record.mjs) ----------------------------------------------------------
def said_hash(say):
    """What a recording of one beat depends on: its words and their "|" split (record.mjs: saidHash)."""
    return hashlib.sha1(" ".join(say.split()).encode("utf-8")).hexdigest()[:12]


def keep_recorded(spec, outdir, voice0):
    """The recorded timeline if it still matches the spec's words (subtitle text refreshed), else None."""
    tl_path = os.path.join(outdir, "timeline.json")
    tl = json.load(open(tl_path, encoding="utf-8")) if os.path.exists(tl_path) else None
    vid, beats = spec["id"], spec["beats"]
    if not tl or tl.get("source") != "recorded":
        if voice0 == "recorded":
            raise SystemExit(f"{vid}: \"voice\" is \"recorded\" but nothing is recorded yet: node tools/record.mjs {vid}")
        return None
    # a recorded beat's "src" is said_hash(say): the words it was read from
    stale = [bi for bi, b in enumerate(beats)
             if bi >= len(tl["beats"]) or tl["beats"][bi].get("src") != said_hash(b["say"])
             or len(tl["beats"][bi]["chunks"]) != len(b["say"].split("|"))]
    if len(tl["beats"]) != len(beats) and not stale:
        stale = [len(beats)]
    if stale:
        if voice0 == "recorded":
            raise SystemExit(f"{vid}: the words of beats {stale} changed since the recording; record them again: "
                             f"node tools/record.mjs {vid} (only the changed lines are asked for)")
        for f, g in (("voice.wav", "voice.recorded.wav"), ("timeline.json", "timeline.recorded.json")):
            if os.path.exists(os.path.join(outdir, f)):
                shutil.move(os.path.join(outdir, f), os.path.join(outdir, g))
        print(f"WARNING {vid}: the owner's recording no longer matches beats {stale}; it is kept as "
              f"voice.recorded.wav and {voice0} reads the new words. Record again: node tools/record.mjs {vid}",
              file=sys.stderr)
        return None
    changed = False
    for b, tb in zip(beats, tl["beats"]):
        shows = b.get("show", b["say"]).split("|")
        if len(shows) != len(tb["chunks"]):
            raise SystemExit(f"{vid} beat {tb['i']}: 'show' has {len(shows)} chunks, 'say' has {len(tb['chunks'])}")
        for c, s in zip(tb["chunks"], shows):
            if c["text"] != s.strip():
                c["text"], changed = s.strip(), True
    if changed:
        json.dump(tl, open(tl_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{vid}: the owner's recorded voice is kept" + (" (subtitle text updated)" if changed else ""), file=sys.stderr)
    return tl


async def build(spec_path, override=None):
    spec = json.load(open(spec_path, encoding="utf-8"))
    if override:  # set by build_any: the Gemini model of this attempt, or the edge-tts fallback voice
        spec = {**spec, **{k: v for k, v in override.items() if not k.startswith("_")}}
        if override.get("_dropBeatGemini"):
            spec["beats"] = [{k: v for k, v in b.items() if not (k == "voice" and str(v).startswith("gemini:"))}
                             for b in spec["beats"]]
    vid = spec["id"]
    outdir = os.path.join(VO_OUT, vid)
    os.makedirs(outdir, exist_ok=True)
    os.makedirs(CACHE, exist_ok=True)

    lang = spec.get("lang", "ka")
    if lang not in VOICES:
        raise SystemExit(f'{vid}: "lang" is {lang!r}; one of {", ".join(VOICES)}')
    voice0 = voice_for(spec.get("voice"), lang, vid)
    rate0, pitch0 = spec.get("rate", "+8%"), spec.get("pitch", "+0Hz")
    beats = spec["beats"]
    voices = [voice_for(b["voice"], lang, f"{vid} beats[{bi}]") if b.get("voice") else voice0 for bi, b in enumerate(beats)]
    kept = keep_recorded(spec, outdir, voice0)
    if kept:
        return kept
    if "recorded" in voices:
        raise SystemExit(f"{vid}: a beat's voice is \"recorded\" but there is no matching recording: node tools/record.mjs {vid}")

    # A beat is cut into sentences (a chunk ending in . ? ! closes one). Each sentence is its
    # own request, so it keeps its natural falling intonation, but the pause between two
    # sentences is ours ("sentenceGap") instead of edge-tts's ~0.9 s.
    groups = []  # (beat index, [chunk indices], text)
    for bi, b in enumerate(beats):
        cur = []
        chunks = b["say"].split("|")
        for ci, ch in enumerate(chunks):
            cur.append(ci)
            if re.search(r"[.?!]\s*$", ch.strip()) or ci == len(chunks) - 1:
                text = " ".join(chunks[k].strip() for k in cur)
                if not spoken_tokens(text):
                    raise SystemExit(f"beat {bi}: chunks {cur} have nothing to say: {text!r}")
                groups.append((bi, cur, text))
                cur = []

    sem = asyncio.Semaphore(4)  # small fleet
    gsem = asyncio.Semaphore(1)  # Gemini's free tier counts requests per minute: one at a time

    async def one(g):
        b = beats[g[0]]
        if voices[g[0]].startswith("gemini:"):
            texts = [b["say"].split("|")[k].strip() for k in g[1]]
            async with gsem:
                return ("gemini",) + await gemini_group(
                    texts, voices[g[0]], b.get("geminiModel", spec.get("geminiModel", GEMINI_MODEL)),
                    b.get("style", spec.get("style", GEMINI_STYLE)), b.get("geminiSplit", spec.get("geminiSplit", "sentence")),
                    float(b.get("chunkGap", spec.get("chunkGap", 0.05))), f"{vid} beat {g[0]}")
        async with sem:
            return await synth(g[2], voices[g[0]], b.get("rate", rate0), b.get("pitch", pitch0))

    results = await asyncio.gather(*(one(g) for g in groups))

    pcm = bytearray()
    lead = float(spec.get("leadIn", 0.1))
    pcm += b"\x00\x00" * int(lead * SR)
    cursor = lead
    sgap = float(spec.get("sentenceGap", 0.32))
    out_beats = []
    for bi, b in enumerate(beats):
        say_chunks = b["say"].split("|")
        show_chunks = b.get("show", b["say"]).split("|")
        if len(show_chunks) != len(say_chunks):
            raise SystemExit(f"beat {bi}: 'show' has {len(show_chunks)} chunks, 'say' has {len(say_chunks)}")
        beat_start = cursor if bi else 0.0
        chunks = []
        mine = [(g, r) for g, r in zip(groups, results) if g[0] == bi]
        for gi, (g, res) in enumerate(mine):
            if res[0] == "gemini":  # a segment and its chunk spans, already cut and faded
                _, seg, spans = res
                for k, (s0, e0) in zip(g[1], spans):
                    chunks.append({"text": show_chunks[k].strip(), "start": round(cursor + s0, 3), "end": round(cursor + e0, 3)})
                pcm += seg.tobytes()
                cursor += len(seg) / SR
                if gi < len(mine) - 1:
                    pcm += b"\x00\x00" * int(sgap * SR)
                    cursor += sgap
                continue
            mp3, events = res
            wav = mp3[:-4] + ".wav"
            if not os.path.exists(wav):
                if AFCONVERT:
                    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", mp3, wav + ".tmp.wav"], check=True)
                else:
                    ffmpeg_wav(mp3, wav + ".tmp.wav", mp3=True)
                os.replace(wav + ".tmp.wav", wav)
            with wave.open(wav) as w:
                assert w.getnchannels() == 1 and w.getframerate() == SR and w.getsampwidth() == 2, wav
                data = w.readframes(w.getnframes())
            a = max(0.0, events[0]["start"] - PAD_IN)
            z = min(len(data) / 2 / SR, events[-1]["end"] + PAD_OUT)
            samples = array.array("h", data[int(a * SR) * 2:int(z * SR) * 2])
            nf = min(int(FADE * SR), len(samples) // 2)
            for i in range(nf):  # 10 ms fades: no click where the cut meets silence
                gain = i / nf
                samples[i] = int(samples[i] * gain)
                samples[-1 - i] = int(samples[-1 - i] * gain)
            seg = samples.tobytes()
            shift = cursor - a
            spans = chunk_times("|".join(say_chunks[k] for k in g[1]), events)
            unheard, lost = listen("|".join(say_chunks[k] for k in g[1]), events)
            for ci, tok in unheard:
                print(f"listen: beat {bi} chunk {g[1][ci]}: no word boundary for {tok!r}; its subtitle timing is guessed", file=sys.stderr)
            for t in lost:
                print(f"listen: beat {bi}: the voice reported {t!r}, which matches no word of the text", file=sys.stderr)
            for k, (s0, e0) in zip(g[1], spans):
                chunks.append({"text": show_chunks[k].strip(), "start": round(s0 + shift, 3), "end": round(e0 + shift, 3)})
            pcm += seg
            cursor += len(seg) / 2 / SR
            if gi < len(mine) - 1:
                pcm += b"\x00\x00" * int(sgap * SR)
                cursor += sgap
        gap = float(b.get("gap", spec.get("gap", 0.28)))
        hold = float(b.get("hold", 0))
        pause = gap + hold if bi < len(beats) - 1 else float(spec.get("tail", 0.35)) + hold
        pcm += b"\x00\x00" * int(pause * SR)
        cursor += pause
        src = hashlib.sha1(json.dumps([b["say"], b.get("show"), b.get("voice"), b.get("rate"), b.get("pitch"),
                                       b.get("gap"), b.get("hold"), voice0, rate0, pitch0,
                                       spec.get("gap"), spec.get("sentenceGap"), spec.get("leadIn"), spec.get("tail")],
                                      ensure_ascii=False).encode()).hexdigest()[:12]
        out_beats.append({"i": bi, "src": src, "start": round(beat_start, 3), "end": round(cursor, 3),
                          "speechStart": chunks[0]["start"], "speechEnd": chunks[-1]["end"],
                          "chunks": chunks})

    with wave.open(os.path.join(outdir, "voice.wav"), "wb") as o:
        o.setnchannels(1)
        o.setsampwidth(2)
        o.setframerate(SR)
        o.writeframes(bytes(pcm))
    timeline = {"id": vid, "voice": voice0, "duration": round(len(pcm) / 2 / SR, 3), "beats": out_beats}
    if voice0.startswith("gemini:"):
        timeline["model"] = spec.get("geminiModel", GEMINI_MODEL)
    json.dump(timeline, open(os.path.join(outdir, "timeline.json"), "w", encoding="utf-8"),
              ensure_ascii=False, indent=1)
    return timeline


async def build_any(spec_path):
    """Gemini first, model by model (own free daily quota each), one model per video; when every
    model is used up today, the whole video falls back to edge-tts ("fallbackVoice", default Giorgi)."""
    spec = json.load(open(spec_path, encoding="utf-8"))
    gem = str(spec.get("voice", "")).startswith("gemini:") or any(str(b.get("voice", "")).startswith("gemini:") for b in spec["beats"])
    if not gem or spec.get("geminiModel") or any(b.get("geminiModel") for b in spec["beats"]):
        return await build(spec_path)
    for model in GEMINI_CHAIN:
        try:
            return await build(spec_path, {"geminiModel": model})
        except GeminiQuota:
            print(f"gemini: {model} has no free quota left today, trying the next model", file=sys.stderr)
    # same gender on edge-tts: the owner's picks are Algieba (male) and Achernar (female)
    female = {"Achernar", "Sulafat", "Kore", "Leda", "Aoede", "Callirrhoe", "Autonoe", "Despina", "Erinome",
              "Laomedeia", "Gacrux", "Pulcherrima", "Vindemiatrix", "Zephyr"}
    gv = str(spec.get("voice", "")).split(":", 1)[-1]
    fb = spec.get("fallbackVoice", "ka-GE-EkaNeural" if gv in female else "ka-GE-GiorgiNeural")
    print(f"gemini: every model is out of free quota today (resets 11:00 Tbilisi); this video uses {fb}", file=sys.stderr)
    return await build(spec_path, {"voice": fb, "_dropBeatGemini": True})


if __name__ == "__main__":
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    try:
        tl = asyncio.run(build_any(spec_file(sys.argv[1])))
    except GeminiQuota as e:  # a spec that pins "geminiModel" has no chain to fall back on
        raise SystemExit(str(e))
    print(f"{tl['id']}: voice {tl['duration']:.2f}s, {len(tl['beats'])} beats" + (f" ({tl['voice']} on {tl['model']})" if tl.get("model") else f" ({tl['voice']})"))
    for b in tl["beats"]:
        for c in b["chunks"]:
            print(f"  {c['start']:6.2f}-{c['end']:6.2f}  {c['text']}")
