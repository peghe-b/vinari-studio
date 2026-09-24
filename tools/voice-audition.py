#!/usr/bin/env python3
"""Voice audition: the same two Georgian lines read by every free voice we can reach today.

    python3 tools/voice-audition.py             all takes (cached in tools/.vo_cache, like vo.py)
    python3 tools/voice-audition.py --list      only print the takes it would make
    GEMINI_API_KEY=... python3 tools/voice-audition.py --gemini
                                                the same lines by ten calm Gemini TTS voices (G1..G10)
                                                -> out/voices/audition-gemini.m4a / .txt

Writes
    out/voices/audition.m4a          every take in a row, a soft tick before each one
    out/voices/audition.txt          the numbered list (voice, rate, pitch, start time, notes)
    out/voices/takes/NN-<voice>.m4a  every take on its own

A take is built exactly the way tools/vo.py builds a video's voice: one request per sentence,
cut on the word boundaries with vo.py's pads and fades, sentences joined with a 0.30 s gap and
the two lines with a 0.45 s gap. What the owner hears here is what a spec with that "voice",
"rate" and "pitch" would sound like. Every take is levelled to the same speech loudness (RMS)
so a louder voice does not win by volume.

Only voices that need no account: edge-tts's two Georgian voices at a few settings, and every
edge-tts "Multilingual" voice (they read any language they detect). A voice that returns audio
but no word boundaries for Georgian is still in the audition (flagged), because vo.py cannot
time subtitles with it; the gemini: backend times per chunk instead (see tools/vo.py).
"""
import array
import asyncio
import hashlib
import json
import math
import os
import re
import subprocess
import sys
import wave

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "pylib"))
import edge_tts  # noqa: E402
import vo  # noqa: E402  (same cache, same cut, same pads)

SR = vo.SR
OUT = os.environ.get("VO_AUDITION_OUT") or os.path.join(ROOT, "out", "voices")  # env: tests only
GEMINI = "--gemini" in sys.argv
# calm narrators from Gemini's 30 prebuilt voices (docs: Charon "Informative", Algieba "Smooth", ...)
GEMINI_VOICES = [("Charon", "კაცი, ინფორმატიული"), ("Algieba", "კაცი, რბილი"), ("Schedar", "კაცი, თანაბარი"),
                 ("Sadaltager", "კაცი, მცოდნე"), ("Iapetus", "კაცი, მკაფიო"), ("Orus", "კაცი, მტკიცე"),
                 ("Sulafat", "ქალი, თბილი"), ("Achernar", "ქალი, რბილი"), ("Vindemiatrix", "ქალი, ნაზი"),
                 ("Kore", "ქალი, მტკიცე")]
TAKES = os.path.join(OUT, "takes")
TICK = os.path.join(ROOT, "public", "sfx", "asmr-tick-fine.wav")

# The two lines, as a spec would write them: "|" is a subtitle chunk, a chunk ending in . ? !
# closes a sentence (one request each).
LINES = [
    "შენი მანქანა დღეს რამდენი ღირს? | ვინარი გეტყვის.",
    "პირველ იანვარს განბაჟება საფეხურით იზრდება, | ნახე წინასწარ.",
]
SENTENCE_GAP, LINE_GAP = 0.30, 0.45
BEFORE_TICK, AFTER_TICK = 0.75, 0.40
TARGET_RMS_DB, PEAK_DB = -20.0, -1.5

# Georgian voices: the current default first (the reference), then rate alone, pitch alone,
# and the calmest combination (slower and a little lower).
KA_SETTINGS = [
    ("+8%", "+0Hz", "ახლანდელი ვიდეოების პარამეტრი (შედარებისთვის)"),
    ("+0%", "+0Hz", "ნორმალური სიჩქარე"),
    ("-4%", "+0Hz", "ოდნავ ნელა"),
    ("+0%", "-4Hz", "ოდნავ დაბლა"),
    ("+0%", "+4Hz", "ოდნავ მაღლა"),
    ("-4%", "-4Hz", "ყველაზე მშვიდი: ნელა და დაბლა"),
]


def sentences(line):
    """Split a line the way vo.py does: a chunk ending in . ? ! closes a sentence."""
    out, cur = [], []
    chunks = line.split("|")
    for ci, ch in enumerate(chunks):
        cur.append(ch.strip())
        if re.search(r"[.?!]\s*$", ch.strip()) or ci == len(chunks) - 1:
            out.append(" ".join(cur))
            cur = []
    return out


async def synth_any(text, voice, rate, pitch, tries=4):
    """vo.synth, except a voice that gives audio but no word boundaries is accepted (and not
    cached under vo.py's key, so vo.py never takes it for a complete result)."""
    key = hashlib.sha1(json.dumps([text, voice, rate, pitch]).encode()).hexdigest()[:16]
    mp3, meta = os.path.join(vo.CACHE, key + ".mp3"), os.path.join(vo.CACHE, key + ".json")
    if os.path.exists(mp3) and os.path.exists(meta):
        return mp3, json.load(open(meta, encoding="utf-8"))
    nob = os.path.join(vo.CACHE, key + ".nobound.mp3")
    if os.path.exists(nob):
        return nob, []
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
            if not audio:
                raise RuntimeError("no audio")
            if words:
                vo.write_atomic(mp3, bytes(audio))
                vo.write_atomic(meta, json.dumps(words, ensure_ascii=False).encode("utf-8"))
                return mp3, words
            vo.write_atomic(nob, bytes(audio))
            return nob, []
        except Exception as e:  # network, 403, NoAudioReceived
            last = e
            if attempt < tries - 1:
                await asyncio.sleep(1.5 * (2 ** attempt))
    raise RuntimeError(f"{voice}: {last}")


def read_pcm(mp3):
    wav = mp3[:-4] + ".wav"
    if not os.path.exists(wav):
        subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", mp3, wav + ".tmp.wav"], check=True)
        os.replace(wav + ".tmp.wav", wav)
    with wave.open(wav) as w:
        assert w.getnchannels() == 1 and w.getframerate() == SR and w.getsampwidth() == 2, wav
        return array.array("h", w.readframes(w.getnframes()))


def energy_bounds(pcm, thr_db=-42.0):
    """First/last 10 ms window above the threshold (for a voice without word boundaries)."""
    win = SR // 100
    peak = max(1, max((abs(x) for x in pcm), default=1))
    thr = peak * 10 ** (thr_db / 20)
    loud = [i for i in range(0, len(pcm) - win, win) if max(abs(x) for x in pcm[i:i + win]) > thr]
    if not loud:
        return 0.0, len(pcm) / SR
    return loud[0] / SR, (loud[-1] + win) / SR


def cut(pcm, words):
    """vo.py's cut: word-boundary edges with its pads and 10 ms fades."""
    total = len(pcm) / SR
    if words:
        a, z = max(0.0, words[0]["start"] - vo.PAD_IN), min(total, words[-1]["end"] + vo.PAD_OUT)
    else:
        a, z = energy_bounds(pcm)
        a, z = max(0.0, a - 0.05), min(total, z + 0.12)
    seg = pcm[int(a * SR):int(z * SR)]
    nf = min(int(vo.FADE * SR), len(seg) // 2)
    for i in range(nf):
        g = i / nf
        seg[i] = int(seg[i] * g)
        seg[-1 - i] = int(seg[-1 - i] * g)
    return seg


def silence(sec):
    return array.array("h", bytes(2 * int(sec * SR)))


def level(pcm):
    """Every take at the same speech RMS (-20 dBFS over the voiced windows), peak <= -1.5 dBFS."""
    win = SR // 50
    rms = []
    for i in range(0, len(pcm) - win, win):
        s = sum(x * x for x in pcm[i:i + win]) / win
        rms.append(math.sqrt(s))
    loud = sorted(r for r in rms if r > 0)
    voiced = loud[len(loud) // 3:] or loud  # skip the pauses
    cur = math.sqrt(sum(r * r for r in voiced) / max(1, len(voiced))) or 1.0
    gain = 32767 * 10 ** (TARGET_RMS_DB / 20) / cur
    peak = max(1, max(abs(x) for x in pcm))
    gain = min(gain, 32767 * 10 ** (PEAK_DB / 20) / peak)
    return array.array("h", (max(-32768, min(32767, int(x * gain))) for x in pcm))


def load_tick():
    tmp = os.path.join(OUT, ".tick24k.wav")
    subprocess.run(["afconvert", "-f", "WAVE", "-d", f"LEI16@{SR}", "-c", "1", TICK, tmp], check=True)
    with wave.open(tmp) as w:
        t = array.array("h", w.readframes(w.getnframes()))
    os.remove(tmp)
    return array.array("h", (int(x * 0.8) for x in t))


def write_wav(path, pcm):
    with wave.open(path, "wb") as o:
        o.setnchannels(1)
        o.setsampwidth(2)
        o.setframerate(SR)
        o.writeframes(pcm.tobytes())


def to_m4a(wav, m4a):
    subprocess.run(["afconvert", "-f", "m4af", "-d", "aac@44100", "-b", "96000", wav, m4a + ".tmp.m4a"], check=True)
    os.replace(m4a + ".tmp.m4a", m4a)


def slug(voice):
    return re.sub(r"(Multilingual)?Neural$", "", voice.split("-", 2)[-1]).lower()


async def plan():
    if GEMINI:
        return [{"voice": f"gemini:{v}", "rate": "", "pitch": "", "note": f"Gemini {vo.GEMINI_MODEL}, {d}"} for v, d in GEMINI_VOICES]
    takes = []
    for v in ("ka-GE-GiorgiNeural", "ka-GE-EkaNeural"):
        for rate, pitch, note in KA_SETTINGS:
            takes.append({"voice": v, "rate": rate, "pitch": pitch, "note": note})
    voices = await edge_tts.list_voices()
    multi = sorted((x for x in voices if "Multilingual" in x["ShortName"]), key=lambda x: (x["Gender"] != "Male", x["ShortName"]))
    for x in multi:
        takes.append({"voice": x["ShortName"], "rate": "+0%", "pitch": "+0Hz",
                      "note": f"მრავალენოვანი ({x['Locale']}, {'კაცი' if x['Gender'] == 'Male' else 'ქალი'})"})
    return takes


async def main():
    takes = await plan()
    if "--list" in sys.argv:
        for i, t in enumerate(takes, 1):
            print(f"{i:2d}  {t['voice']:34s} {t['rate']:>4s} {t['pitch']:>5s}  {t['note']}")
        return
    os.makedirs(TAKES, exist_ok=True)
    os.makedirs(vo.CACHE, exist_ok=True)
    sents = [sentences(l) for l in LINES]
    sem = asyncio.Semaphore(4)  # small fleet, same as vo.py

    gsem = asyncio.Semaphore(1)  # Gemini's free tier: one request at a time

    async def one(t, text):
        if t["voice"].startswith("gemini:"):
            async with gsem:
                try:
                    return ("gemini", await vo.gemini_synth(text, t["voice"], vo.GEMINI_MODEL, vo.GEMINI_STYLE))
                except (Exception, SystemExit) as e:
                    return RuntimeError(str(e))
        async with sem:
            try:
                return await synth_any(text, t["voice"], t["rate"], t["pitch"])
            except Exception as e:
                return e

    jobs = [(ti, li, si) for ti in range(len(takes)) for li, ss in enumerate(sents) for si in range(len(ss))]
    res = await asyncio.gather(*(one(takes[ti], sents[li][si]) for ti, li, si in jobs))
    got = {j: r for j, r in zip(jobs, res)}

    tick = load_tick()
    reel = array.array("h")
    rows = []
    for ti, t in enumerate(takes):
        n = ti + 1
        pcm, fails, words_ok, words_all, lost_all = array.array("h"), [], 0, 0, []
        for li, ss in enumerate(sents):
            if li:
                pcm += silence(LINE_GAP)
            for si, text in enumerate(ss):
                if si:
                    pcm += silence(SENTENCE_GAP)
                r = got[(ti, li, si)]
                if isinstance(r, Exception):
                    fails.append(str(r))
                    continue
                if r[0] == "gemini":  # no word timings: the speech is found by its energy (vo.py does the same)
                    on, off = vo.speech_bounds(r[1])
                    seg = r[1][int(max(0.0, on - vo.PAD_IN) * SR):int(min(len(r[1]) / SR, off + vo.G_PAD_OUT) * SR)]
                    pcm += vo.fade(seg)
                    words_all += len(vo.spoken_tokens(text))
                    continue
                mp3, words = r
                pcm += cut(read_pcm(mp3), words)
                unheard, lost = vo.listen(text, words) if words else ([None] * len(vo.spoken_tokens(text)), [])
                words_all += len(vo.spoken_tokens(text))
                words_ok += len(vo.spoken_tokens(text)) - len(unheard)
                lost_all += lost
        t["n"] = f"G{n}" if GEMINI else str(n)
        if fails or not len(pcm):
            t["status"] = "აუდიო არ დაბრუნდა: " + "; ".join(sorted(set(fails)))[:160]
            rows.append(t)
            print(f"{n:2d} {t['voice']}: FAILED {t['status']}")
            continue
        pcm = level(pcm)
        name = (f"G{n:02d}-{t['voice'].split(':', 1)[1].lower()}" if GEMINI else
                f"{n:02d}-{slug(t['voice'])}-r{t['rate'].replace('%', '')}-p{t['pitch'].replace('Hz', '')}")
        wav = os.path.join(TAKES, name + ".wav")
        write_wav(wav, pcm)
        to_m4a(wav, os.path.join(TAKES, name + ".m4a"))
        os.remove(wav)
        reel += silence(BEFORE_TICK if n > 1 else 0.3)
        reel += tick
        reel += silence(AFTER_TICK)
        t["at"] = len(reel) / SR
        t["dur"] = len(pcm) / SR
        t["file"] = f"takes/{name}.m4a"
        reel += pcm
        if GEMINI:
            t["status"] = "სიტყვების დრო არ მოდის: vo.py თითო სუბტიტრს ცალკე ითხოვს, ასე დრო ზუსტია"
        elif words_ok == words_all and not lost_all:
            t["status"] = f"სიტყვების დრო: {words_ok}/{words_all}, სუბტიტრები ზუსტად ჯდება"
        elif words_ok == 0:
            t["status"] = f"სიტყვების დრო არ მოდის (0/{words_all}): vo.py-ით ვერ გამოვიყენებთ, მხოლოდ ნაწილ-ნაწილ (gemini-ს გზით)"
        else:
            t["status"] = f"სიტყვების დრო: {words_ok}/{words_all}" + (f", უცნობი: {' '.join(lost_all)[:60]}" if lost_all else "")
        rows.append(t)
        print(f"{t['n']:>3s} {t['voice']:34s} {t['rate']:>4s} {t['pitch']:>5s}  {t['dur']:5.2f}s  {t['status']}")
    reel += silence(0.8)

    base = "audition-gemini" if GEMINI else "audition"
    wav = os.path.join(OUT, base + ".wav")
    write_wav(wav, reel)
    to_m4a(wav, os.path.join(OUT, base + ".m4a"))
    os.remove(wav)

    lines = [
        ("Gemini TTS-ის აუდიცია (უფასო AI Studio გასაღებით): იგივე ორი ფრაზა ათი მშვიდი ხმით." if GEMINI else
         "ხმის აუდიცია: ორი ერთი და იგივე ფრაზა ყველა უფასო ხმით, რაც დღეს ანგარიშის გარეშე ხელმისაწვდომია."),
        "",
        "  1) " + LINES[0].replace(" | ", " "),
        "  2) " + LINES[1].replace(" | ", " "),
        "",
        f"{base}.m4a-ში ყოველ ხმას წინ რბილი ტიკი უსწრებს. დრო (წთ:წმ) აჩვენებს, სად იწყება.",
        "ცალკე ფაილები: takes/ საქაღალდეში, ნომრით. ყველა ხმა ერთნაირ სიხმამაღლეზეა დაყვანილი.",
        "Gemini-ს ხმებს რეჟისორის შენიშვნა აქვს: " + vo.GEMINI_STYLE if GEMINI else "rate = სიჩქარე (+8% ახლანდელია), pitch = ტონი (Hz).",
        "",
    ]
    for t in rows:
        at = f"{int(t['at'] // 60)}:{t['at'] % 60:05.2f}" if "at" in t else "  -  "
        lines.append(f"{t['n']:>3s}.  {at}  {t['voice']}" + ("" if GEMINI else f"  rate {t['rate']}  pitch {t['pitch']}"))
        lines.append(f"        {t['note']}. {t['status']}")
    lines += [
        "",
        "რომელიმე მოგეწონოს, სპეკში ასე ჩაიწერება: \"voice\": \"gemini:Charon\" (გასაღები: GEMINI_API_KEY).",
    ] if GEMINI else [
        "",
        "რომელიმე ნომერი რომ მოგეწონოს, სპეკში ასე ჩაიწერება (მაგალითად):",
        '  "voice": "ka-GE-GiorgiNeural", "rate": "-4%", "pitch": "-4Hz"',
        "მრავალენოვანი (Multilingual) ხმები უცხოენოვანი ხმებია, ქართულს თვითონ ცნობენ და კითხულობენ;",
        "შეიძლება აქცენტი ჰქონდეთ, ყურით შეამოწმე. სუბტიტრებისთვის სიტყვების დრო სჭირდება: ზემოთ ეწერება, მოდის თუ არა.",
    ]
    open(os.path.join(OUT, base + ".txt"), "w", encoding="utf-8").write("\n".join(lines) + "\n")
    print(f"out/voices/{base}.m4a: {len(reel) / SR:.1f}s, {len(rows)} takes; list in out/voices/{base}.txt")


if __name__ == "__main__":
    asyncio.run(main())
