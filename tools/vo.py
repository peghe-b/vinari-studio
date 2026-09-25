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
      Gemini gives no word timings, so the speech inside a returned clip is found by its energy.
      "geminiSplit" (beat, spec, env GEMINI_TTS_SPLIT) says how many requests a film costs; the
      free tier gives a model about ten a day:
        "whole" (the default): ONE request for the whole film, a sentence per line. The clip is
          cut into the sentences at their pauses (split_whole), then every sentence into its "|"
          chunks exactly as "sentence" does. When that split is not sure, the film falls back to
          "sentence" and says why. An unchanged film costs nothing; ONE changed line exactly one
          request, for that line alone (every line's piece of a whole take is cached as
          <key>.gemini-cut.wav; a film voiced before by "sentence" keeps its clips the same way).
        "sentence": one request per sentence; the chunk borders go in the pauses nearest to where
          the letters say they should be (pause_split).
        "chunk": one request per subtitle chunk (exact chunk timing, the most requests).
      The summary line says how many Gemini requests the run made.
      "style" (spec or beat) is the director's note, written in Georgian (default GEMINI_STYLE: someone
      telling a friend something, never an announcer);
      "geminiModel" (or env GEMINI_TTS_MODEL) pins the model; otherwise every film tries the model
      chain (GEMINI_CHAIN) in order, the model of its own timeline first, and never mixes two
      models. A model that is not there (404 NOT_FOUND: a preview model retired or renamed) is
      skipped as if it were not in the chain. A model that fails another way (the key refused:
      400/401/403, a 5xx, the network or an answer cut short or not JSON after every retry) is skipped
      the same way. Two answers with no audio for the same text end the chain at once (every answer
      costs a request of the free quota) and mark the film's text in out/ci/voice-noaudio.json: a later
      run in the same job (the cloud's check, then its voice step; 3 hours on the Mac) goes straight to
      edge-tts. When every model is out of quota (or failed), the film falls back to edge-tts (same
      gender) with a loud warning, on the Mac and in the cloud alike, and out/ci/voice-quota.json says so:
      {"code": "voice_quota", "fallback": "edge", "resets": "11:00 Tbilisi"}, plus "why":
      "gemini_error" when a model failed or none said it was out of quota (the studio site reads it
      through post.json's "geminiOut", which is only set for the quota). With env VO_NO_EDGE=1 (the
      cloud's repo variable STUDIO_NO_EDGE, off by default) it stops instead: exit 75, a "VOICE_QUOTA"
      line, and the same file without "fallback" (a failed model makes it an ordinary failure, not exit
      75; a 404 does not). Every run starts by removing an earlier run's file, so the file
      always describes the last run. The timeline's "voice" is the voice that really read the film
      (the edge-tts voice after a fallback) and "model" the Gemini model (absent for edge-tts).
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
(decode with ffmpeg even where afconvert exists, as on Linux), VO_QUOTA_FILE (instead of
out/ci/voice-quota.json; voice-noaudio.json goes next to it). VS_FFMPEG points at another ffmpeg.

Runs on the Mac (afconvert decodes) and on Linux, e.g. the GitHub Actions studio workflow (Remotion's
bundled ffmpeg decodes, the packages come from requirements.txt).
"""
import array
import asyncio
import base64
import collections
import hashlib
import http.client
import io
import json
import math
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


class GeminiUnavailable(Exception):
    """A Gemini model failed for another reason than its daily quota: retired or renamed (404), the key refused
    (400 API_KEY_INVALID, 401, 403), a 5xx or the network after every retry, no audio after every try. The chain
    moves on to the next model, and after the last one edge-tts reads the film, exactly as for the quota: a film
    must always come out (the owner, 2026-09-25). A plain Exception for the same reason as GeminiQuota."""


class GeminiMissing(GeminiUnavailable):
    """The model is not there (404 NOT_FOUND: a preview model of GEMINI_CHAIN retired or renamed). build_any skips
    it as if it were not in the chain: it says nothing about today's quota, and it is no Gemini failure either
    (a day with [out of quota, 404, out of quota] is a quota day, and the site must say so)."""


class GeminiNoAudio(GeminiUnavailable):
    """Gemini answered 200 with no audio NO_AUDIO_TRIES times for the same text on one model. Every answer costs a
    request of the free daily quota, and the other models would most likely answer the same: build_any stops the
    chain for this film, edge-tts reads it, and the film's text is marked for the rest of the job (mark_no_audio)."""


class VoiceQuota(Exception):
    """Every Gemini model is out of free quota today and edge-tts is not allowed (VO_NO_EDGE=1)."""


# How the cloud learns that today's Gemini voices are gone: the film fell back to edge-tts (tools/ci/publish.mjs
# turns the note into post.json's "geminiOut", the site warns before the next film), or, with VO_NO_EDGE=1, it
# stopped (the workflow turns the note into error.json "voice_quota").
VOICE_QUOTA_EXIT = 75  # EX_TEMPFAIL: tools/check.mjs recognises it
VOICE_QUOTA_FILE = os.environ.get("VO_QUOTA_FILE") or os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "out", "ci", "voice-quota.json")


def no_edge():
    """VO_NO_EDGE on (the cloud's repo variable STUDIO_NO_EDGE): never read a film with edge-tts."""
    return os.environ.get("VO_NO_EDGE", "").strip().lower() in ("1", "true", "yes", "on")


def quota_note(fallback=None, why=None):
    """out/ci/voice-quota.json: every Gemini model is out of today's free quota. fallback="edge": the film goes
    on with edge-tts; None: the run stops (VO_NO_EDGE). why="gemini_error": at least one model failed for
    another reason than its quota (tools/ci/publish.mjs then does not say today's quota is gone). Returns when
    the quota comes back ("11:00 Tbilisi")."""
    resets = quota_reset()
    note = {"code": "voice_quota", **({"fallback": fallback} if fallback else {}), **({"why": why} if why else {}),
            "resets": resets}
    try:
        os.makedirs(os.path.dirname(VOICE_QUOTA_FILE), exist_ok=True)
        write_atomic(VOICE_QUOTA_FILE, json.dumps(note).encode())
    except OSError as e:
        print(f"vo.py: could not write {VOICE_QUOTA_FILE}: {e}", file=sys.stderr)
    return resets


def clear_quota_note():
    """An earlier run's note must not speak for this one (the cloud voices a film twice: check, then the voice step)."""
    try:
        os.remove(VOICE_QUOTA_FILE)
    except FileNotFoundError:
        pass
    except OSError as e:
        print(f"vo.py: could not remove {VOICE_QUOTA_FILE}: {e}", file=sys.stderr)


# A film whose text Gemini answered with no audio (GeminiNoAudio) is not sent to Gemini again in the same job: the
# cloud voices a film twice (tools/check.mjs, then the voice step), and every empty answer costs a request of the
# free quota. Next to the quota note, which every run removes; this one stays: {"job", "films": {key: time}}.
NO_AUDIO_FILE = os.path.join(os.path.dirname(VOICE_QUOTA_FILE), "voice-noaudio.json")
NO_AUDIO_TTL = 3 * 3600  # the Mac has no job id: a mark counts this long (the cloud job's limit is 150 minutes)


def job_id():
    """This GitHub Actions job ("<run id>-<attempt>"), or "" on the Mac."""
    run = os.environ.get("GITHUB_RUN_ID", "")
    return f"{run}-{os.environ.get('GITHUB_RUN_ATTEMPT') or '1'}" if run else ""


def film_key(spec):
    """What a no-audio mark is about: the film's voices, styles and words (a changed line asks Gemini again)."""
    words = [[b.get("say"), b.get("voice"), b.get("style")] for b in spec.get("beats") or [] if isinstance(b, dict)]
    return hashlib.sha1(json.dumps([spec.get("voice"), spec.get("style"), words], ensure_ascii=False)
                        .encode()).hexdigest()[:16]


def no_audio_marks():
    """The films marked in this job, {key: time}; an earlier job's (or an older Mac run's) marks count for nothing."""
    try:
        with open(NO_AUDIO_FILE, encoding="utf-8") as f:
            m = json.load(f)
        if not isinstance(m, dict) or m.get("job") != job_id() or not isinstance(m.get("films"), dict):
            return {}
        return {k: float(t) for k, t in m["films"].items() if time.time() - float(t) < NO_AUDIO_TTL}
    except (OSError, ValueError, TypeError):
        return {}


def mark_no_audio(key):
    try:
        os.makedirs(os.path.dirname(NO_AUDIO_FILE), exist_ok=True)
        write_atomic(NO_AUDIO_FILE, json.dumps({"job": job_id(), "films": {**no_audio_marks(), key: time.time()}}).encode())
    except OSError as e:
        print(f"vo.py: could not write {NO_AUDIO_FILE}: {e}", file=sys.stderr)

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
# 2026-09-25 (the owner: the films should sound like a friend talking, not like a narrator): someone
# telling a friend something, conversational, still unhurried and clear, a short pause after every
# sentence (the whole-film cut splits at those pauses). The note is part of every cache key: a film
# voiced before this change keeps its earlier take for free (build: film_style) until one of its lines
# changes; then the whole film is voiced again with this note (one request).
GEMINI_STYLE = ("ქართველი, რომელიც მეგობარს რაღაც საინტერესოს უყვება, მიკროფონთან ახლოს, წყნარ ოთახში. "
                "ლაპარაკობს თბილად, მშვიდად და ბუნებრივად, ცოცხალი საუბრის ინტონაციით, და არა "
                "როგორც დიქტორი, დოკუმენტური ფილმის მთხრობელი ან რეკლამა. აუჩქარებლად და გარკვევით, ყოველი "
                "წინადადების ბოლოს მოკლე პაუზით. ყველა სიტყვა, მათ შორის „ვინარი\", წარმოთქვი ქართული "
                "გამოთქმით: ვი-ნა-რი.")
# The earlier default notes, newest first. vo.py never sends them again; their takes in tools/.vo_cache
# keep an unchanged old film as it is (film_style), and tools/vo_whole_check.py still measures on them.
GEMINI_STYLES_BEFORE = (
    "მშვიდი, თბილი ქართველი მთხრობელი, მიკროფონთან ახლოს, წყნარ ოთახში. ლაპარაკობს აუჩქარებლად "
    "და დარწმუნებით, როგორც დოკუმენტური ფილმის მთხრობელი, მეგობრულად და ბუნებრივად, არასდროს "
    "როგორც რეკლამა. ყველა სიტყვა, მათ შორის „ვინარი\", წარმოთქვი ქართული გამოთქმით: ვი-ნა-რი.",  # to 2026-09-25
)
G_PAD_OUT = 0.12   # the energy edge is exact (no boundary under-report), so a shorter tail pad
_legacy_shape = {}  # model -> True once it refused the 3.8 request shape
GEMINI_SPLITS = ("whole", "sentence", "chunk")
GEMINI_SPLIT = os.environ.get("GEMINI_TTS_SPLIT") or "whole"
# What this run asked of Gemini: "requests" = clips fetched (cache misses; each one is a request of the
# free daily quota), "calls" = HTTP calls made, retries and refusals included.
GEMINI_USED = {"requests": 0, "calls": 0}
NO_AUDIO_TRIES = 2  # a 200 with no audio this many times for one text on one model: GeminiNoAudio


def quota_reset():
    """When the free daily quota comes back, in Tbilisi time: midnight in California (11:00 in summer,
    12:00 in winter)."""
    try:
        import datetime
        from zoneinfo import ZoneInfo
        la = datetime.datetime.now(ZoneInfo("America/Los_Angeles"))
        midnight = (la + datetime.timedelta(days=1)).replace(hour=0, minute=0, second=0, microsecond=0)
        return midnight.astimezone(ZoneInfo("Asia/Tbilisi")).strftime("%H:%M") + " Tbilisi"
    except Exception:  # no tz database: the summer hour
        return "11:00 Tbilisi"


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
    empty = 0
    for attempt in range(tries):
        new = gemini_new_shape(model)
        req = urllib.request.Request(url, data=json.dumps(gemini_body(text, name, style, new)).encode(),
                                     headers={"Content-Type": "application/json", "x-goog-api-key": key})
        GEMINI_USED["calls"] += 1
        try:
            with urllib.request.urlopen(req, timeout=120) as r:
                j = json.loads(r.read())
            if not isinstance(j, dict):
                raise ValueError("not a JSON object")
        except urllib.error.HTTPError as e:
            try:
                msg = e.read().decode("utf-8", "replace")
            except (OSError, http.client.HTTPException):
                msg = ""
            if e.code == 429:
                if re.search(r"PerDay|per day", msg, re.I):
                    raise GeminiQuota(f"gemini: the free daily quota of {model} is used up. Every line made so far is "
                                     f"cached; run again after midnight Pacific time ({quota_reset()}), or pick another model.")
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
            # the status and Google's short reason only: the body can name the Cloud project, and the cloud
            # studio's logs are public
            if e.code == 404 or gemini_status(msg) == "NOT_FOUND":  # retired or renamed: build_any skips it
                raise GeminiMissing(f"gemini {e.code} from {model}{gemini_reason(msg)}")
            raise GeminiUnavailable(f"gemini {e.code} from {model}{gemini_reason(msg)}")
        except (urllib.error.URLError, TimeoutError, ConnectionError, http.client.HTTPException, ValueError) as e:
            # the network, or an answer cut short (IncompleteRead) or not JSON (a proxy's page): ask again
            if attempt < tries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise GeminiUnavailable(f"gemini: {model} did not answer ({type(e).__name__})")
        inline = gemini_inline(j)
        if inline:
            return gemini_audio(base64.b64decode(inline["data"]), inline.get("mimeType") or inline.get("mime_type"))
        # TTS sometimes finishes with no audio ("OTHER"): asking again usually works, once. Every answer costs a
        # request of the free daily quota, so the same empty answer again ends it (build_any: edge-tts at once)
        empty += 1
        if empty >= NO_AUDIO_TRIES:
            raise GeminiNoAudio(f"gemini: {model} gave no audio {empty} times for the same text")
        print(f"gemini: no audio for {text!r} ({json.dumps(j)[:200]}), asking again", file=sys.stderr)
        time.sleep(1.5)
    raise GeminiUnavailable(f"gemini: {model} gave no audio after {tries} tries")


def gemini_inline(j):
    """The audio part of a generateContent answer ({"mimeType", "data"}), or None: no audio, or another shape."""
    try:
        parts = ((j.get("candidates") or [{}])[0].get("content") or {}).get("parts") or []
        inline = next((p.get("inlineData") or p.get("inline_data") for p in parts
                       if isinstance(p, dict) and (p.get("inlineData") or p.get("inline_data"))), None)
    except (AttributeError, TypeError, IndexError, KeyError):
        return None
    return inline if isinstance(inline, dict) and inline.get("data") else None


def gemini_status(msg):
    """Google's status word out of a Gemini error body ("NOT_FOUND"), or ""."""
    try:
        return str((json.loads(msg).get("error") or {}).get("status") or "")
    except (ValueError, AttributeError):
        return ""


def gemini_reason(msg):
    """ " (NOT_FOUND, API_KEY_INVALID)" out of a Gemini error body: its status and the first reason, nothing else."""
    try:
        err = json.loads(msg).get("error") or {}
    except (ValueError, AttributeError):
        return ""
    words = [str(err.get("status") or "")]
    for d in err.get("details") or []:
        if isinstance(d, dict) and d.get("reason"):
            words.append(str(d["reason"]))
            break
    words = [re.sub(r"[^A-Z0-9_]", "", w)[:40] for w in words if w]
    return f" ({', '.join(w for w in words if w)})" if any(words) else ""


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


def gemini_path(text, voice, model, style):
    """The cache file of one Gemini request: the key is everything the request depends on, the whole text."""
    key = hashlib.sha1(json.dumps(["gemini", model, voice, style, text], ensure_ascii=False).encode()).hexdigest()[:16]
    return os.path.join(CACHE, key + ".gemini.wav")


async def gemini_synth(text, voice, model, style):
    """One cached Gemini clip: 24 kHz mono int16 samples."""
    path = gemini_path(text, voice, model, style)
    if not os.path.exists(path):
        pcm = await asyncio.to_thread(gemini_request, text, voice, model, style)
        GEMINI_USED["requests"] += 1
        write_atomic(path, pcm_wav(pcm))
    return read_wav_bytes(open(path, "rb").read())


def fade(seg):
    nf = min(int(FADE * SR), len(seg) // 2)
    for i in range(nf):
        g = i / nf
        seg[i] = int(seg[i] * g)
        seg[-1 - i] = int(seg[-1 - i] * g)
    return seg


def cut_sentence(pcm, chunk_texts, where, origin=None):
    """A clip that holds one sentence -> (segment, [(start, end)] per chunk in the segment): the "|"
    chunks at its pauses (pause_split), PAD_IN before the first word, G_PAD_OUT after the last, faded.
    `origin` (a list) gets where the segment starts in the clip, in seconds."""
    spans, guessed = pause_split(pcm, chunk_texts)
    for ci in guessed:
        print(f"listen: {where}: no pause after chunk {ci}; its border is placed by letters", file=sys.stderr)
    a = max(0.0, spans[0][0] - PAD_IN)
    z = min(len(pcm) / SR, spans[-1][1] + G_PAD_OUT)
    if origin is not None:
        origin.append(int(a * SR) / SR)
    return fade(pcm[int(a * SR):int(z * SR)]), [(s - a, e - a) for s, e in spans]


async def gemini_group(chunk_texts, voice, model, style, split, chunk_gap, where):
    """One sentence for the timeline: (segment samples, [(start, end)] per chunk in the segment)."""
    if split == "sentence" and len(chunk_texts) > 1:
        return cut_sentence(await gemini_synth(" ".join(chunk_texts), voice, model, style), chunk_texts, where)
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


# ---- the whole film in one request ("geminiSplit": "whole", the default) --------------------------------
# The free tier gives each model about ten requests a day, so the film's Gemini text goes out as ONE
# request: every sentence group the sentence mode would send, word for word, one per line. The clip is
# cut back in two stages, and the rest of vo.py gets the same (segment, spans) per group as before:
#   1. into the sentence groups at pauses: split_whole picks the n-1 borders among the film's pauses
#      (whole_pauses) with a small dynamic programme that wants every sentence spoken at the film's own
#      pace (speech_units) and prefers long pauses;
#   2. every sentence into its "|" chunks by pause_split, as the sentence mode cuts its own clip
#      (cut_sentence), after the sentence is cut out at the quietest point of the pauses around it.
# When the split is not sure, the film falls back to one request per sentence and says why: fewer clear
# pauses than borders, a border only the letters put there (a pause inside the sentences around it
# W_FORCE times longer, or a longer one within W_LOCAL of it), a sentence spoken too fast or too slow for
# its letters (W_RATE_TOL), all the sentences' paces together too far from their letters (W_CHI), or a
# clearly different split that fits almost as well (W_MARGIN; skipped when the borders are the n-1 longest
# pauses by a clear step, W_OBVIOUS).
# Calibrated offline on 59 real Algieba sentence clips of the four models, joined into whole films
# (tools/vo_whole_check.py, 2026-09-25, seeds 5, 7, 11, 23): with 0.25-0.7 s between sentences, 480 films,
# no sentence border on the wrong pause, borders 3 ms from the sentence mode's (median; p95 8 ms), 20 %
# fall back; with tight 0.12-0.2 s pauses (shorter than the pauses inside sentences) 84 % fall back and
# the rest split right too.
# Review, 2026-09-25 (joined takes that are NOT the text: two lines run together with no pause, a line
# skipped, a line read twice; 150 films each, two seeds): before W_CHI and W_CLICK_PAUSE 16-18 % of those
# split anyway, wrongly; with them 3-4 % (run together 6 and 15, skipped 1 and 1, twice 6 and 4 of 150), and
# the well-formed films fall back no more often than before (natural 0.25-0.7 s: 16-18 %).
W_CLEAR = 0.10      # a sentence border sits in a pause of at least 100 ms
W_SIGMA = 0.115     # the spread of one sentence's pace around the film's (ln), on held-out clips
W_RATE_TOL = 0.45   # a sentence faster or slower than the film's pace by more than e^0.45 (1.57x): not sure
W_PAUSE = 2.0       # weight of a border pause's length (ln) against the pace
W_MARGIN = 2.5      # the chosen split must beat every clearly different one by this much
W_NEAR = 0.30       # "clearly different": some border at least 0.3 s away from where it was
W_FORCE = 2.0       # a pause inside the two sentences around a border, this many times longer: forced
W_OBVIOUS = 1.3     # the borders are the n-1 longest pauses, this much longer than any other: no rival split
W_LOCAL = 0.5       # a longer pause within 0.5 s of a border: the letters chose the shorter one
W_WORD, W_SENT = 4.0, 6.5  # speaking time in letters: a word costs 4 more, a sentence 6.5 more
# The sum of every sentence's squared pace deviation (in W_SIGMA) is a chi-square with n-1 degrees of
# freedom for a take that is the text; above its 90th percentile the take is not sure (a line skipped,
# repeated or run into the next one moves speech between sentences). On the well-formed joined films it
# added about 0.3 % fallbacks; on the malformed ones (with W_CLICK_PAUSE) it turned 67 wrong splits of 450
# into 13. A split that a later change of these constants refuses costs nothing: its lines' pieces are cached.
W_CHI = 0.90
# A click between two pauses makes them one pause only when both are at least 100 ms long: a short
# syllable ("ეს") after a pause and before a 60 ms dip is speech (merging it once made a 450 ms "pause"
# out of a 300 ms one inside a sentence, and the sentence border went there).
W_CLICK_PAUSE = 10  # windows of 10 ms


def whole_pauses(pcm, reach=200):
    """The pauses of a whole film, found as pause_split finds them in one sentence (10 ms windows under
    the speech line for >= 60 ms), except that the -38 dB line follows the loudest window within `reach`
    windows (2 s, about a sentence) instead of the film's loudest one: a soft onset is speech here
    exactly when it is speech in a one-sentence clip. Two pauses of at least 100 ms around a click (< 90 ms)
    are one pause (W_CLICK_PAUSE).
    -> (speech start, speech end, [(pause start, pause end)], rms per window, speech? per window, [the pauses
    joined over any sound under 90 ms: a sentence end with its last consonant's release in it, for W_LOCAL])."""
    _, rms, _ = voiced_runs(pcm)
    live = sorted(v for v in rms if v > 0)
    if not live:
        return 0.0, len(pcm) / SR, [], rms, [False] * len(rms)
    floor = live[len(live) // 10]
    n = len(rms)
    near, dq, j = [0.0] * n, collections.deque(), 0
    for k in range(n):  # the loudest window of [k - reach, k + reach]
        while j < n and j <= k + reach:
            while dq and rms[dq[-1]] <= rms[j]:
                dq.pop()
            dq.append(j)
            j += 1
        while dq[0] < k - reach:
            dq.popleft()
        near[k] = rms[dq[0]]
    loud = [v > max(floor * 3.2, m * 10 ** (-38 / 20), 30.0) for v, m in zip(rms, near)]
    runs, k = [], 0  # speech runs as voiced_runs makes them: joined over < 250 ms, a lone one < 90 ms dropped
    while k < n:
        if loud[k]:
            j = k
            while j < n and loud[j]:
                j += 1
            if runs and k - runs[-1][1] < 25:
                runs[-1][1] = j
            else:
                runs.append([k, j])
            k = j
        else:
            k += 1
    runs = [r for r in runs if r[1] - r[0] >= 9]
    if not runs:
        return 0.0, len(pcm) / SR, [], rms, loud
    on, off = runs[0][0], runs[-1][1]
    gaps, spans, k = [], [], on  # spans: the same pauses, joined over ANY sound under 90 ms (for W_LOCAL)
    while k < off:
        if loud[k]:
            k += 1
            continue
        j = k
        while j < off and not loud[j]:
            j += 1
        if j - k >= 6:
            if gaps and k - gaps[-1][1] < 9 and j - k >= W_CLICK_PAUSE and gaps[-1][1] - gaps[-1][0] >= W_CLICK_PAUSE:
                gaps[-1][1] = j
            else:
                gaps.append([k, j])
            if spans and k - spans[-1][1] < 9:
                spans[-1][1] = j
            else:
                spans.append([k, j])
        k = j
    return (on / 100, off / 100, [(a / 100, b / 100) for a, b in gaps], rms, loud,
            [(a / 100, b / 100) for a, b in spans])


def chi2_quantile(k, p):
    """The p quantile of a chi-square with k degrees of freedom (Wilson-Hilferty; within 1 % for k >= 2)."""
    from statistics import NormalDist
    z = NormalDist().inv_cdf(p)
    return k * (1 - 2 / (9 * k) + z * math.sqrt(2 / (9 * k))) ** 3


def speech_units(chunk_texts):
    """How long a sentence takes to say, in letters: its letters, W_WORD more a word, W_SENT more a
    sentence (fitted on the cached Algieba clips: 0.046 s a letter, 0.187 s a word, 0.3 s a sentence;
    the pace spread falls from 0.13 to 0.11 against letters alone)."""
    words = sum(1 for t in chunk_texts for w in t.split() if norm(w))
    return sum(max(1, len(norm(t))) for t in chunk_texts) + W_WORD * words + W_SENT


def split_whole(pauses, sentences):
    """The speech of every sentence in a whole-film clip: ([(start, end)], None), or (None, why) when the
    split is not sure. `pauses` is whole_pauses(pcm); `sentences` the chunk texts of every group."""
    on, off, gaps = pauses[:3]
    n = len(sentences)
    if n == 1:
        return [(on, off)], None
    units = [speech_units(s) for s in sentences]
    glen = [b - a for a, b in gaps]
    G = len(gaps)
    pre = [0.0]  # pre[j]: the pauses before pause j, summed
    for x in glen:
        pre.append(pre[-1] + x)
    clear = sum(1 for x in glen if x >= W_CLEAR)
    if clear < n - 1:
        return None, f"{clear} clear pause{'' if clear == 1 else 's'} for {n - 1} sentence borders"
    voiced = off - on - pre[-1]
    if voiced <= 0:
        return None, "no speech in the clip"
    pace = sum(units) / voiced  # the film's own pace, in units a second of voiced time

    def spoken(a, b):  # the voiced time of a sentence from pause a to pause b (-1: speech start, G: speech end)
        return ((off if b >= G else gaps[b][0]) - (on if a < 0 else gaps[a][1])) - (pre[min(b, G)] - pre[a + 1])

    def cost(i, a, b):
        v = spoken(a, b)
        return math.inf if v <= 0.05 else 0.5 * (math.log(units[i] / (pace * v)) / W_SIGMA) ** 2

    bonus = [W_PAUSE * math.log(x / 0.06) for x in glen]

    def solve(allowed):  # the cheapest n-1 borders among the allowed pauses: (cost, [pause index])
        idx = [j for j in range(G) if allowed[j]]
        best = [dict() for _ in range(n - 1)]
        back = [dict() for _ in range(n - 1)]
        for b in idx:
            best[0][b] = cost(0, -1, b) - bonus[b]
        for i in range(1, n - 1):
            for b in idx:
                m, arg = math.inf, None
                for a, c0 in best[i - 1].items():
                    if a < b:
                        c = c0 + cost(i, a, b)
                        if c < m:
                            m, arg = c, a
                if arg is not None:
                    best[i][b], back[i][b] = m - bonus[b], arg
        m, arg = math.inf, None
        for a, c0 in best[n - 2].items():
            c = c0 + cost(n - 1, a, G)
            if c < m:
                m, arg = c, a
        if arg is None:
            return math.inf, None
        path = [arg]
        for i in range(n - 2, 0, -1):
            path.append(back[i][path[-1]])
        return m, path[::-1]

    total, path = solve([True] * G)
    if path is None:
        return None, "no split fits the letters"
    ends = [-1] + path + [G]
    for k, j in enumerate(path):
        if glen[j] < W_CLEAR:
            return None, f"sentence {k + 1} ends in a {glen[j] * 1000:.0f} ms pause: the letters put it there"
        inner = [glen[x] for x in range(ends[k] + 1, ends[k + 2]) if x != j]
        if inner and max(inner) > W_FORCE * glen[j]:
            return None, (f"sentence {k + 1} ends in a {glen[j] * 1000:.0f} ms pause, a {max(inner) * 1000:.0f} ms one "
                          "inside the sentences around it: the letters forced the border")
        c0, c1 = gaps[j]
        near = [glen[x] for x, (g0, g1) in enumerate(gaps) if x != j and max(g0 - c1, c0 - g1) < W_LOCAL]
        # and a pause that a short sound splits in two ("...უღებ" + its final release): its whole length
        near += [g1 - g0 for g0, g1 in (pauses[5] if len(pauses) > 5 else ())
                 if not (g0 <= c0 and c1 <= g1) and max(g0 - c1, c0 - g1) < W_LOCAL]
        if near and max(near) > glen[j]:
            return None, (f"sentence {k + 1} ends in a {glen[j] * 1000:.0f} ms pause, next to a longer {max(near) * 1000:.0f} ms "
                          "one: the letters chose the shorter")
    bounds = [((on if ends[i] < 0 else gaps[ends[i]][1]), (off if ends[i + 1] >= G else gaps[ends[i + 1]][0]))
              for i in range(n)]
    chi = 0.0
    for i in range(n):
        v = spoken(ends[i], ends[i + 1])
        r = units[i] / (pace * v)
        if abs(math.log(r)) > W_RATE_TOL:
            return None, (f"sentence {i + 1} is {v:.2f} s of speech for {units[i]:.0f} letter units: "
                          f"{'shorter' if r > 1 else 'longer'} than its letters allow")
        chi += (math.log(r) / W_SIGMA) ** 2
    if n > 2 and chi > chi2_quantile(n - 1, W_CHI):
        return None, (f"the sentences' paces are together too far from their letters (chi-square {chi:.1f} for "
                      f"{n - 1} degrees of freedom): a line may be missing, repeated or run into the next")
    # the borders are the n-1 longest pauses by a clear step (W_OBVIOUS) and the pace agrees: no rival split
    chosen = set(path)
    others = [x for k, x in enumerate(glen) if k not in chosen]
    if not others or min(glen[j] for j in path) >= W_OBVIOUS * max(others):
        return bounds, None
    for k, j in enumerate(path):
        c0, c1 = gaps[j]
        alt, _ = solve([max(0.0, g0 - c1, c0 - g1) >= W_NEAR for g0, g1 in gaps])
        if alt - total < W_MARGIN:
            return None, f"the end of sentence {k + 1} is not clear: another split fits almost as well ({alt - total:.1f})"
    return bounds, None


def quietest(rms, loud, a, b):
    """Where to cut between two sentences in the pause (a, b): in its longest silent stretch (a click inside
    the pause goes with the side it is not cut from), at the quietest 10 ms, the one nearest the stretch's
    middle among the nearly quietest, so a soft onset or a trailing breath stays with its own sentence."""
    ka, kb = int(round(a * 100)), int(round(b * 100))
    if kb - ka < 3:
        return (a + b) / 2
    best, k = (ka, kb), ka
    runs = []
    while k < kb:
        j = k
        while j < kb and not loud[j]:
            j += 1
        if j > k:
            runs.append((k, j))
        k = max(j, k + 1)
    if runs:
        best = max(runs, key=lambda r: r[1] - r[0])
    ka, kb = best
    low = min(rms[ka:kb])
    mid = (ka + kb - 1) / 2
    return (min((k for k in range(ka, kb) if rms[k] <= low * 1.5 + 1), key=lambda k: abs(k - mid)) + 0.5) / 100


def whole_cut(pcm, sentences, wheres, origins=None, takes=None):
    """A whole-film clip -> ([(segment, spans)] per sentence, None) as cut_sentence gives them, or (None, why).
    `origins` (a list) gets where every segment starts in the whole clip, in seconds (for the checks);
    `takes` (a list) gets every sentence's own piece of the clip, the one cut_sentence cut (gemini_whole
    keeps them, so a later change of one line re-voices that line alone)."""
    pauses = whole_pauses(pcm)
    bounds, why = split_whole(pauses, sentences)
    if bounds is None:
        return None, why
    rms, loud = pauses[3], pauses[4]
    cuts = [0.0] + [quietest(rms, loud, e, s) for (_, e), (s, _) in zip(bounds, bounds[1:])] + [len(pcm) / SR]
    out = []
    for i, (texts, (s, e)) in enumerate(zip(sentences, bounds)):
        lo, hi = cuts[i], cuts[i + 1]
        # a tight pause leaves less room than the pads: silence makes up the rest, so the segment has the
        # sentence mode's shape (PAD_IN before the first word, G_PAD_OUT after the last)
        zl = int(max(0.0, PAD_IN + 0.03 - (s - lo)) * SR)
        zr = int(max(0.0, G_PAD_OUT + 0.03 - (hi - e)) * SR)
        clip = array.array("h", bytes(2 * zl)) + pcm[int(lo * SR):int(hi * SR)] + array.array("h", bytes(2 * zr))
        at = []
        out.append(cut_sentence(clip, texts, wheres[i], at))
        if origins is not None:
            origins.append(int(lo * SR) / SR - zl / SR + at[0])
        if takes is not None:
            takes.append(clip)
    return out, None


def gemini_cut_path(text, voice, model, style):
    """One sentence's piece of a whole-film take (whole_cut): the key of the sentence's own request, another
    suffix, since it is no request (tools/check.mjs and vo_whole_check.py count only *.gemini.wav)."""
    return gemini_path(text, voice, model, style)[:-len(".gemini.wav")] + ".gemini-cut.wav"


def sentence_take(text, voice, model, style):
    """The newest cached take of one sentence, its own request's clip or its piece of a whole-film take,
    as a path; None when neither is cached."""
    have = [p for p in (gemini_path(text, voice, model, style), gemini_cut_path(text, voice, model, style))
            if os.path.exists(p)]
    return max(have, key=os.path.getmtime) if have else None


def pcm_wav(pcm):
    buf = io.BytesIO()
    with wave.open(buf, "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(SR)
        w.writeframes(pcm.tobytes())
    return buf.getvalue()


async def gemini_whole(sentences, voice, model, style, chunk_gap, wheres, film):
    """Every sentence group of a film (chunk texts each) in ONE request -> [(segment, spans)] per group.
    What it costs: an unchanged film nothing (its take, or every sentence's own take, is cached); a film
    with ONE new or changed line exactly one request, for that line alone (the other lines keep their
    voice: a whole take leaves every sentence's piece in the cache); any other film one request for the
    whole text. A whole take that does not split with confidence falls back to one request per sentence
    that has no cached take."""
    texts = [" ".join(t) for t in sentences]
    whole = "\n".join(texts)

    async def per_sentence():
        out = []
        for chunks, text, where in zip(sentences, texts, wheres):
            p = sentence_take(text, voice, model, style)
            pcm = read_wav_bytes(open(p, "rb").read()) if p else await gemini_synth(text, voice, model, style)
            out.append(cut_sentence(pcm, chunks, where))
        return out

    if len(sentences) > 1 and not os.path.exists(gemini_path(whole, voice, model, style)):
        new = [i for i, t in enumerate(texts) if not sentence_take(t, voice, model, style)]
        if not new:
            print(f"gemini: {film}: every sentence is cached from one request per sentence or an earlier take; "
                  "kept as it is", file=sys.stderr)
            return await per_sentence()
        if len(new) == 1:
            print(f"gemini: {film}: only sentence {new[0] + 1} is new; it alone is voiced (one request), the others "
                  "keep their cached voice", file=sys.stderr)
            return await per_sentence()
    pcm = await gemini_synth(whole, voice, model, style)
    takes = []
    cut, why = whole_cut(pcm, sentences, wheres, takes=takes)
    if cut is not None:
        if len(sentences) > 1:
            print(f"gemini: {film}: {len(sentences)} sentences read in one request, split at their pauses", file=sys.stderr)
            for text, clip in zip(texts, takes):  # the newest take of each line (sentence_take picks by time)
                write_atomic(gemini_cut_path(text, voice, model, style), pcm_wav(clip))
        return cut
    new = sum(1 for t in texts if not sentence_take(t, voice, model, style))
    print(f"gemini: {film}: the one-request take does not split with confidence ({why}); "
          f"this film falls back to one request per sentence ({new} more"
          + (f"; {len(texts) - new} already cached)" if new < len(texts) else ")"), file=sys.stderr)
    return await per_sentence()


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

    def film_style():
        """The note of the lines that set no "style": GEMINI_STYLE, or an earlier default (GEMINI_STYLES_BEFORE)
        when every such line of this film is cached under it for its voice and model. A film voiced before the
        note changed keeps its voice and costs nothing (`./make.sh studio` voices every spec) until one of its
        lines changes; then the whole film is voiced again with today's note. VO_RESTYLE=1: today's note."""
        own = [g for g in groups if voices[g[0]].startswith("gemini:") and "style" not in beats[g[0]] and "style" not in spec]
        if not own or os.environ.get("VO_RESTYLE") == "1":
            return GEMINI_STYLE
        for style in (GEMINI_STYLE, *GEMINI_STYLES_BEFORE):
            if all(sentence_take(g[2], voices[g[0]], beats[g[0]].get("geminiModel", spec.get("geminiModel", GEMINI_MODEL)),
                                 style) for g in own):
                if style != GEMINI_STYLE:
                    print(f"gemini: {vid}: voiced before the director's note changed; kept as it is (VO_RESTYLE=1 "
                          "voices it again with today's note, one request)", file=sys.stderr)
                return style
        return GEMINI_STYLE

    default_style = film_style()

    def gemini_of(g):
        """A Gemini group's request settings: voice, model, style, split, chunk gap, its chunk texts."""
        b = beats[g[0]]
        split = b.get("geminiSplit", spec.get("geminiSplit", GEMINI_SPLIT))
        if split not in GEMINI_SPLITS:
            raise SystemExit(f"{vid} beat {g[0]}: \"geminiSplit\" is {split!r}; one of {', '.join(GEMINI_SPLITS)}")
        return (voices[g[0]], b.get("geminiModel", spec.get("geminiModel", GEMINI_MODEL)),
                b.get("style", spec.get("style", default_style)), split, float(b.get("chunkGap", spec.get("chunkGap", 0.05))),
                [b["say"].split("|")[k].strip() for k in g[1]])

    # One Gemini group failed (quota, no audio, an error): build_any moves the film on to the next model or to
    # edge-tts, so the groups still queued behind gsem must not spend another request of the free quota. The
    # failing group marks it before it lets go of gsem; the next one sees it and stops without a request.
    gemini_stop = []

    async def one(g):
        b = beats[g[0]]
        if voices[g[0]].startswith("gemini:"):
            voice, model, style, split, chunk_gap, texts = gemini_of(g)
            async with gsem:
                if gemini_stop:
                    raise asyncio.CancelledError()
                try:
                    return ("gemini",) + await gemini_group(texts, voice, model, style, split, chunk_gap, f"{vid} beat {g[0]}")
                except BaseException:
                    gemini_stop.append(True)
                    raise
        async with sem:
            return await synth(g[2], voices[g[0]], b.get("rate", rate0), b.get("pitch", pitch0))

    # "whole": every group with the same voice, model and style goes out in one request (normally the film)
    results = [None] * len(groups)
    wholes = {}
    for gi, g in enumerate(groups):
        if voices[g[0]].startswith("gemini:"):
            voice, model, style, split, _, _ = gemini_of(g)
            if split == "whole":  # (a sentence read on its own never uses chunkGap)
                wholes.setdefault((voice, model, style), []).append(gi)
    for (voice, model, style), gis in wholes.items():
        cut = await gemini_whole([gemini_of(groups[gi])[5] for gi in gis], voice, model, style, 0.05,
                                 [f"{vid} beat {groups[gi][0]}" for gi in gis], vid)
        for gi, (seg, spans) in zip(gis, cut):
            results[gi] = ("gemini", seg, spans)
    rest = [gi for gi, r in enumerate(results) if r is None]
    tasks = [asyncio.ensure_future(one(groups[gi])) for gi in rest]
    try:
        done = await asyncio.gather(*tasks)
    except BaseException:
        # gather() hands on the first failure but leaves its siblings running: stop them, then collect them
        for t in tasks:
            t.cancel()
        await asyncio.gather(*tasks, return_exceptions=True)
        raise
    for gi, r in zip(rest, done):
        results[gi] = r

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


def film_model(spec):
    """The Gemini model of the film's own timeline (public/vo/<id>/timeline.json), when it was voiced by the
    spec's voice; else None."""
    try:
        tl = json.load(open(os.path.join(VO_OUT, spec["id"], "timeline.json"), encoding="utf-8"))
    except (OSError, ValueError, KeyError, TypeError):
        return None
    return tl.get("model") if isinstance(tl, dict) and tl.get("voice") == spec.get("voice") else None


async def build_any(spec_path):
    """Gemini first, model by model (own free daily quota each), one model per video. When every model
    is used up today: with env VO_NO_EDGE=1 VoiceQuota, else the whole video falls back to edge-tts
    ("fallbackVoice", default the same gender: Giorgi or Eka) with a loud warning and the quota note
    out/ci/voice-quota.json {"fallback": "edge"} (the owner, 2026-09-25: a video must always come out;
    the studio site warns before the next one and labels this one). A model that is not there (404) is skipped as
    if it were not in the chain; any other failure adds "why": "gemini_error" (so does a chain where no model said
    it was out of quota); an empty answer twice (GeminiNoAudio) ends the chain at once and marks the film's text
    for the rest of the job (mark_no_audio)."""
    spec = json.load(open(spec_path, encoding="utf-8"))
    gem = str(spec.get("voice", "")).startswith("gemini:") or any(str(b.get("voice", "")).startswith("gemini:") for b in spec["beats"])
    if not gem or spec.get("geminiModel") or any(b.get("geminiModel") for b in spec["beats"]):
        return await build(spec_path)
    # the model the film was voiced with last goes first: a re-run keeps its voice and its cache (0 requests)
    # even after an earlier model of the chain got its quota back
    last = film_model(spec)
    chain = [last] + [m for m in GEMINI_CHAIN if m != last] if last in GEMINI_CHAIN else GEMINI_CHAIN
    errors, quota, mute = [], 0, False
    key = film_key(spec)
    if key in no_audio_marks():  # the check's run met the empty answer: the voice step does not pay for it again
        errors.append("gemini: no audio for this film's text earlier in this job")
        mute, chain = True, []
        print(f"gemini: {spec.get('id', spec_path)}: Gemini gave no audio for this text earlier in this job; "
              "not asked again", file=sys.stderr)
    for model in chain:
        try:
            return await build(spec_path, {"geminiModel": model})
        except GeminiQuota:
            quota += 1
            print(f"gemini: {model} has no free quota left today, trying the next model", file=sys.stderr)
        except GeminiMissing as e:  # not there: as if it were not in the chain (no quota, no error)
            print(f"{e}: no such model (retired or renamed), skipped", file=sys.stderr)
        except GeminiNoAudio as e:
            errors.append(str(e))
            mute = True
            mark_no_audio(key)
            print(f"{e}: the other models are not asked (every empty answer costs a request of today's free quota)",
                  file=sys.stderr)
            break
        except GeminiUnavailable as e:
            errors.append(str(e))
            print(f"{e}: trying the next model", file=sys.stderr)
    # "voice_quota" only when a model said so and nothing else went wrong (a 404 is neither)
    failed = bool(errors) or not quota
    if no_edge():
        if failed:  # not (only) the quota: an ordinary failure, never "voice_quota"
            why = errors[-1] if errors else "no model of the chain is there (404)"
            raise SystemExit(f"every Gemini model failed or was out of quota ({why}), and VO_NO_EDGE=1 forbids the edge-tts fallback")
        raise VoiceQuota("every Gemini model is out of free quota today and VO_NO_EDGE=1 forbids the edge-tts fallback")
    # same gender on edge-tts: the owner's picks are Algieba (male) and Achernar (female)
    female = {"Achernar", "Sulafat", "Kore", "Leda", "Aoede", "Callirrhoe", "Autonoe", "Despina", "Erinome",
              "Laomedeia", "Gacrux", "Pulcherrima", "Vindemiatrix", "Zephyr"}
    gv = str(spec.get("voice", "")).split(":", 1)[-1]
    fb = spec.get("fallbackVoice", "ka-GE-EkaNeural" if gv in female else "ka-GE-GiorgiNeural")
    # written before the edge-tts build: the note is about Gemini's quota, and an edge-tts failure after it
    # stays an ordinary failure (the workflow reads "fallback" and never calls that one "voice_quota")
    resets = quota_note("edge", "gemini_error" if failed else None)
    what = ("Gemini gave no audio for this film" if mute else "every Gemini model is out of free quota today or failed"
            if failed and quota else "no Gemini model could read it" if failed else "every Gemini model is out of free quota today")
    bar = "!" * 78
    print(f"\n{bar}\nWARNING: {what}; {spec.get('id', spec_path)} is read by "
          f"Microsoft's edge-tts ({fb}),\nNOT by the house voice {spec.get('voice')}. Gemini is back at {resets}: for the "
          f"house voice, voice it again after that\n(python3 tools/vo.py {spec.get('id', spec_path)}). In the cloud studio "
          f"this is expected: the film goes on\nwith this voice and the site has told the owner.\n{bar}\n",
          file=sys.stderr)
    return await build(spec_path, {"voice": fb, "_dropBeatGemini": True})


def voice_quota_stop(why):
    """No voice today (VO_NO_EDGE): out/ci/voice-quota.json for the workflow (error.json -> the site), one
    distinctive line, exit 75 (tools/check.mjs turns it into "ხმის დღევანდელი ლიმიტი ამოიწურა")."""
    resets = quota_note()
    print(f"VOICE_QUOTA: {why}. No voice until {resets}: stop here.", file=sys.stderr)
    sys.exit(VOICE_QUOTA_EXIT)


def main(argv):
    if len(argv) != 1:
        raise SystemExit(__doc__)
    GEMINI_USED.update(requests=0, calls=0)
    clear_quota_note()
    try:
        tl = asyncio.run(build_any(spec_file(argv[0])))
    except VoiceQuota as e:
        voice_quota_stop(str(e))
    except GeminiQuota as e:  # a spec that pins "geminiModel" has no chain to fall back on
        if no_edge():
            voice_quota_stop(str(e).replace("gemini: ", "", 1).rstrip("."))
        raise SystemExit(str(e))
    except GeminiUnavailable as e:  # the same, for any other Gemini failure
        raise SystemExit(str(e))
    n = GEMINI_USED["requests"]
    used = f", {n} Gemini request{'' if n == 1 else 's'}" if tl.get("model") else ""
    print(f"{tl['id']}: voice {tl['duration']:.2f}s, {len(tl['beats'])} beats"
          + (f" ({tl['voice']} on {tl['model']}{used})" if tl.get("model") else f" ({tl['voice']})"))
    if GEMINI_USED["calls"] > n:
        print(f"gemini: {GEMINI_USED['calls']} calls for {n} request{'' if n == 1 else 's'} (retries and refused models)", file=sys.stderr)
    for b in tl["beats"]:
        for c in b["chunks"]:
            print(f"  {c['start']:6.2f}-{c['end']:6.2f}  {c['text']}")
    return tl


if __name__ == "__main__":
    main(sys.argv[1:])
