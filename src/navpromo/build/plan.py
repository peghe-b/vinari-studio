#!/usr/bin/env python3
"""The navigator promo's timeline and its whole sound, built from the measured voices (src/navpromo/build/voices.py) and the
synthesised sounds (sfx_synth.py):

  src/navpromo/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/navpromo/mix.wav      the mastered film sound: voices, app clips, sound design (gitignored)
  public/vo/navpromo/mix-paid.wav the paid cut: the lost man's clean „დევიკარგე, დედა ჩემო!" instead of the honked curse

    python3 src/navpromo/build/plan.py

The narrator's ONE take is cut only at its sentence ends (the storyboard: the app's clips sit between them); the lost man's
ONE take is cut at its phrase ends. Nothing is sped up. Master: -10 LUFS, true peak under -1 dBTP, no music (the owner adds
his; his drop, hit and lift points are in timeline.json "music").
"""
import json
import os
import sys

import numpy as np
from scipy import signal

from common import FFMPEG, OUT, SFX, SR, STUDIO, env_db, ff, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

HERE = os.path.dirname(os.path.abspath(__file__))
TL = os.path.join(STUDIO, "src", "navpromo", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
# the narrator a touch quicker (Algieba's deep take ran the film to 62 s; the owner's cap is 60): atempo keeps the pitch
NARR_TEMPO = float(os.environ.get("NARR_TEMPO", "1.07"))
_narr_src = os.path.join(OUT, V["narrator"]["file"])
if abs(NARR_TEMPO - 1) > 1e-3:
    _narr_fast = _narr_src[:-4] + f".t{NARR_TEMPO:.3f}.wav"
    if not os.path.exists(_narr_fast):
        import subprocess
        subprocess.run([FFMPEG, "-loglevel", "error", "-y", "-i", _narr_src, "-filter:a", f"atempo={NARR_TEMPO}", "-c:a", "pcm_s24le", _narr_fast], check=True, cwd=os.path.dirname(FFMPEG))
    _narr_src = _narr_fast
NARR = read_wav(_narr_src)
MAN = read_wav(os.path.join(OUT, V["man"]["file"]))
# the hook's shout (voices.py --shout), a take of its own
SHOUT_FILE = "gemini/fenrir-d6d73613f47e4876.wav"
SHOUT = read_wav(os.path.join(OUT, SHOUT_FILE))
WHISPER_FILE = "gemini/algieba-76c88ed3b693639f.wav"
WHISPER = read_wav(os.path.join(OUT, WHISPER_FILE))


def clip(name):
    return read_wav(os.path.join(OUT, "clips", name + ".wav"))


def gps(name):
    return read_wav(os.path.join(OUT, "gps", name + ".wav"))


def own(name):
    return read_wav(os.path.join(OUT, "sfx", name + ".wav"))


def kit(name):
    p = os.path.join(SFX, name + (".wav" if os.path.exists(os.path.join(SFX, name + ".wav")) else ".m4a"))
    return load(p) if p.endswith(".m4a") else read_wav(p)


def cut(a, s, e, fin=0.008, fout=0.03):
    x = a[int(max(0, s) * SR): int(min(len(a) / SR, e) * SR)].copy()
    ni, no = int(fin * SR), int(fout * SR)
    if ni:
        x[:ni] *= np.linspace(0, 1, ni)
    if no:
        x[-no:] *= np.linspace(1, 0, no)
    return x


# ---- the narrator's take: 17 islands of speech, cut at its sentence ends ------------------------------------------------
def islands(a, min_len=0.15, rel=-38.0):
    on, off = speech_span(a, -40)
    ps = [p for p in pauses(a, min_len, rel) if p[0] > on + 0.05 and p[1] < off - 0.05]
    out, s = [], on
    for p0, p1 in ps:
        out.append((s, p0))
        s = p1
    out.append((s, off))
    return out


ISL = islands(NARR)
if len(ISL) != 17:
    sys.exit(f"narrator: expected 17 speech islands, found {len(ISL)}: {[(round(a, 2), round(b, 2)) for a, b in ISL]}")


def narr(i, j=None, pre=0.05, post=0.12):
    j = i if j is None else j
    s, e = ISL[i][0] - pre, ISL[j][1] + post
    return cut(NARR, s, e), pre


def dip_between(a, s, e, frac):
    """The quietest 20 ms near the letter-proportional point `frac` of a..e (within +-0.22 s): a chunk border inside a line."""
    t = s + (e - s) * frac
    lo, hi = max(s + 0.1, t - 0.22), min(e - 0.1, t + 0.22)
    w = int(0.02 * SR)
    best, bt = 1e9, t
    x = lo
    while x < hi:
        seg = a[int(x * SR): int(x * SR) + w]
        v = float(np.sqrt(np.mean(seg * seg)) + 1e-9)
        if v < best:
            best, bt = v, x + 0.01
        x += 0.005
    return bt


# Algieba's take (2026-10-12) breathes in other places than the first take: transcribed island by island, its 17 islands
# are 0 "აი, ზუსტად ამიტომ შევქმენით ვინარი." (one breath), 1 "საქართველოში პირველად!", 2 "ნავიგატორი ... გელაპარაკება.",
# 3 "რუკა," 4 "ძებნა და ხმა" (a breath between), 5 "ტელეფონშივეა.", 6..14 as the script, 15 "ვინარი ჩაიწერე,",
# 16 "გამოგვყევი და მომავლისთვის მზად იყავი.". The film's 17 slots are the script's phrases, so: split 0 after "ამიტომ",
# join 3 and 4, and move "გამოგვყევი" from 16 to 15 (each split at the quietest 20 ms near its letter share).
_I = ISL
_d0 = dip_between(NARR, _I[0][0], _I[0][1], 17 / 35)
_d16 = dip_between(NARR, _I[16][0], _I[16][1], 11 / 38)
ISL = [(_I[0][0], _d0), (_d0 + 0.02, _I[0][1]), _I[1], _I[2], (_I[3][0], _I[4][1]), *_I[5:15], (_I[15][0], _d16), (_d16 + 0.02, _I[16][1])]
ISL_RUKA_SPLIT = _I[4][0]  # "ძებნა" starts here (the why shot's second icon)
assert len(ISL) == 17



# ---- effects ---------------------------------------------------------------------------------------------------------------
def sos_f(kind, f, order=2):
    return signal.butter(order, f, btype=kind, fs=SR, output="sos")


def reverb(x, size=0.35, mix=0.2, damp=3500, seed=3, pre=0.0):
    rng = np.random.default_rng(seed)
    n = int(size * SR)
    ir = rng.standard_normal(n) * np.exp(-np.arange(n) / (n / 5))
    ir = signal.sosfilt(sos_f("low", damp), ir)
    ir /= np.sqrt(np.sum(ir ** 2)) + 1e-9
    d = int(pre * SR)
    wet = np.zeros(len(x) + n + d)
    c = signal.fftconvolve(x, ir)
    wet[d: d + len(c)] = c[: len(wet) - d]
    out = np.zeros(len(wet))
    out[: len(x)] += x * (1 - mix)
    return out + wet * mix


def phone(x, far=False):
    """The foreign GPS through a phone's speaker in the open: band-passed, a little grit, a small outdoor room."""
    y = signal.sosfilt(sos_f("high", 320, 4), x)
    y = signal.sosfilt(sos_f("low", 2600 if far else 4000, 4), y)
    y = np.tanh(y * 3.2) / 3.2 * 1.25  # the grit of a small speaker driven hard
    return reverb(y, 0.5 if far else 0.3, 0.32 if far else 0.16, 2500 if far else 4000, seed=5)


def echo(x, delay=0.18, fb=0.2, n=3, lpf=1800):
    out = np.zeros(len(x) + int(delay * SR * (n + 1)))
    out[: len(x)] += x
    tap = x.copy()
    for k in range(1, n + 1):
        tap = signal.sosfilt(sos_f("low", lpf), tap) * fb
        d = int(delay * SR * k)
        out[d: d + len(tap)] += tap
    return reverb(out, 0.6, 0.18, 2800, seed=9)


def cabin(x):
    """Heard through the car's own speakers in a closed cabin: a little body, the top rounded off, a short dense room."""
    y = signal.sosfilt(sos_f("high", 110), x)
    b, a = signal.iirpeak(180, 1.2, fs=SR)
    y = y + 0.35 * signal.lfilter(b, a, y)
    y = signal.sosfilt(sos_f("low", 8500), y)
    return reverb(y, 0.12, 0.22, 6000, seed=11)


def lufs(x):
    tmp = os.path.join(OUT, ".lufs.wav")
    write_wav(tmp, x)
    i, _ = loudness(tmp)
    os.remove(tmp)
    return i


def match(x, target):
    return x * 10 ** ((target - lufs(x)) / 20)


def peak100(x):
    w = int(0.1 * SR)
    if len(x) < w:
        return 20 * np.log10(np.sqrt(np.mean(x * x)) + 1e-9)
    c = np.convolve(x * x, np.ones(w) / w, mode="valid")
    return 10 * np.log10(c.max() + 1e-12)


# ---- the tracks ------------------------------------------------------------------------------------------------------------
class Mix:
    def __init__(self, sec):
        self.n = int(sec * SR) + SR
        self.voice = np.zeros(self.n)
        self.fx = np.zeros(self.n)
        self.bed = np.zeros(self.n)
        self.words = []  # (start, end) of speech, for the beds' dip

    def put(self, track, x, at, gain=1.0):
        s = int(round(at * SR))
        if s < 0:
            x, s = x[-s:], 0
        e = min(self.n, s + len(x))
        getattr(self, track)[s:e] += x[: e - s] * gain


VO_LUFS = -18.0  # the voices as placed (the master lifts the whole film to -10 later)
REF100 = None  # the narrator's loudest-100 ms level, set below
VPEAK = None  # the narrator's peaks (99.95th percentile), set below


def sfx_gain(x, volume=0.5, closer=0.0):
    """A cue's gain: its loudest 100 ms at (narrator - 9 dB) for volume 0.5, scaled by the volume, never closer than 4 dB
    under the voice (the studio's voiced kit: present and clear, the voice always on top)."""
    want = REF100 - 9 + 20 * np.log10(max(volume, 1e-3) / 0.5) + closer
    want = min(want, REF100 - 4)
    g = 10 ** ((want - peak100(x)) / 20)
    # a click's 100 ms says little about its peak: no cue's sample peak over the voice's own peaks less 4 dB
    pk = np.max(np.abs(x)) * g + 1e-9
    return g * min(1.0, 10 ** ((VPEAK - 4) / 20) / pk)


def build(paid=False):
    global REF100
    ev, shots, subs, music = {}, [], [], {}
    narr_l = lufs(NARR)
    ng = 10 ** ((VO_LUFS - narr_l) / 20)  # the narrator take as one, at VO_LUFS
    REF100 = peak100(NARR * ng)
    global VPEAK
    VPEAK = 20 * np.log10(np.percentile(np.abs(NARR * ng), 99.95))
    man_g = 10 ** ((VO_LUFS + 1.5 - lufs(MAN)) / 20)
    mx = Mix(64)
    cues = []  # (name, x, at, volume, closer)

    def sfx(name, at, volume=0.5, closer=0.0, src=None, rate=1.0):
        x = src if src is not None else kit(name)
        if rate != 1.0:
            x = signal.resample(x, int(len(x) / rate))
        cues.append((name, x, at, volume, closer))

    def say(x, at, track="voice", gain=1.0, word=True, dry=None):
        mx.put(track, x, at, gain)
        if word:
            mx.words.append((at, at + len(x) / SR))
        return at + (len(x) if dry is None else dry) / SR

    def sub(text, s, e, tone="ink"):
        subs.append({"text": text, "start": round(s, 3), "end": round(e, 3), "tone": tone})

    def shot(name, s, e, **kw):
        shots.append({"id": name, "from": round(s, 3), "to": round(e, 3), **kw})

    def nline(i, j, at, chunks=None, tone="ink"):
        """Place narrator islands i..j at `at` (the first word's onset); subtitles: [(text, letters_fraction|None)]."""
        x, pre = narr(i, j)
        start = at - pre
        say(x * ng, start)
        s0, e0 = ISL[i][0], ISL[j][1]
        on = lambda t: at + (t - s0)  # noqa: E731
        if chunks:
            borders = [s0]
            for k in range(1, len(chunks)):
                b = chunks[k][1]
                if isinstance(b, tuple) and len(b) == 1:  # an island border: (island index,) -> its start
                    borders.append(ISL[b[0]][0])
                elif isinstance(b, tuple):  # ("in", island, fraction of its letters): a border inside that island
                    borders.append(dip_between(NARR, ISL[b[1]][0], ISL[b[1]][1], b[2]))
                else:
                    borders.append(dip_between(NARR, s0, e0, b))
            borders.append(e0)
            for k, (text, _) in enumerate(chunks):
                sub(text, on(borders[k]), on(borders[k + 1]), tone if isinstance(tone, str) else tone[k])
        return on(e0)

    def aclip(name, at, chunks, s=None, e=None, fx=None, track="voice"):
        """An app clip, clean, loudness-matched to the narrator; `at` is its first word. chunks: [(text, t_in_clip)]."""
        m = V["clips"][name]
        a = clip(name)
        s = m["on"] - 0.03 if s is None else s
        e = m["off"] + 0.1 if e is None else e
        x = match(cut(a, s, e), VO_LUFS)
        if fx:
            x = match(fx(x), VO_LUFS - 1.5)
        on = m["on"]
        film = lambda ct: at + (ct - on)  # noqa: E731  clip time -> film time (the first word on `at`)
        say(x, film(s))
        end = film(min(e - 0.08, m["off"]))
        for k, (text, ct) in enumerate(chunks):
            c1 = chunks[k + 1][1] if k + 1 < len(chunks) else None
            sub(text, film(max(ct, on)), film(c1) if c1 is not None else end)
        return end

    # ====================================================== ACT 1: the forest =================================================
    t = 0.0
    bed = own("night-bed")
    # S0 the hook (the owner, 2026-10-12: "at the start a Georgian voice that grabs attention, he shouts loud: where am I?!"):
    # from the sky over the black forest his shout rings out and echoes; the camera dives toward the one small light
    sh_g = 10 ** ((VO_LUFS + 3.5 - lufs(SHOUT[int(0.15 * SR): int(3.48 * SR)])) / 20)
    sh1 = cut(SHOUT, 0.15, 1.12) * sh_g
    sh2 = cut(SHOUT, 1.98, 3.48) * sh_g
    gap = np.zeros(int(0.2 * SR))
    hook = np.concatenate([sh1, gap, sh2])
    at0 = 0.06
    mx.put("voice", echo(hook), at0)
    mx.words.append((at0, at0 + len(hook) / SR))
    e0 = at0 + len(hook) / SR
    ev["shout1"] = at0
    ev["shout2"] = at0 + (len(sh1) + len(gap)) / SR
    sub("„სად ვარ?!“", at0, ev["shout2"], "white")
    sub("„სად ვარ აქანა?!“", ev["shout2"], e0 + 0.12, "white")
    sfx("asmr-air-long", 0.0, 0.4)
    s0_end = e0 + 0.22
    shot("s0", 0.0, s0_end)
    # S1 wide
    T0 = s0_end
    g1 = phone(gps("gps-1"))
    ev["gps1"] = T0 + 0.12
    e = say(match(g1, VO_LUFS - 3.5), T0 + 0.12, dry=len(gps("gps-1")))
    sub("In 300 meters, turn right.", T0, e, "white")
    sfx("asmr-sub", T0, 0.5)
    ind = kit("real-indicator-loop")
    for k in range(3):
        sfx("real-indicator-loop", T0 + 0.05 + k * len(ind) / SR, 0.35)
    s1_end = e + 0.06
    shot("s1", T0, s1_end)
    # S2 face: rait?
    x = cut(MAN, 0.28, 0.76) * man_g
    at = s1_end + 0.04
    ev["rait"] = at
    e = say(x, at)
    sub("„რაით?“", at, e + 0.15, "white")
    ev["qmark"] = at + 0.05
    sfx("asmr-air", s1_end - 0.03, 0.4)
    sfx("asmr-pop", at + 0.05, 0.35)
    s2_end = e + 0.12
    shot("s2", s1_end, s2_end)
    # S3 crude phone: Turn left
    at = s2_end + 0.04
    g2 = phone(gps("gps-2"))
    e = say(match(g2, VO_LUFS - 3.5), at, dry=len(gps("gps-2")))
    sub("Turn left.", at, e, "white")
    ev["arrow1"], ev["arrow2"] = at + 0.18, at + 0.38
    sfx("asmr-ui-tick", ev["arrow1"], 0.45)
    sfx("asmr-ui-tick", ev["arrow2"], 0.5)
    s3_end = e + 0.04
    shot("s3", s2_end, s3_end)
    # S4 spin: left? where is left?
    at = s3_end + 0.06
    e = say(cut(MAN, 1.2, 1.66) * man_g, at)
    sub("„ლეფთ?“", at, e)
    at2 = e + 0.1
    e = say(cut(MAN, 2.7, 3.56) * man_g, at2)
    subs[-1]["end"] = round(at2, 3)
    sub("„ლეფთი სადაა?“", at2, e)
    for s_ in subs[-2:]:
        s_["tone"] = "white"
    ev["spin"] = at
    sfx("synth-whoosh", at - 0.05, 0.35)
    s4_end = e - 0.04
    shot("s4", s3_end, s4_end)
    # S5 crude phone: bars drop, Recalculating (starts under his last word)
    at = s4_end + 0.0
    g3 = phone(gps("gps-3"))
    ev["bars"] = [at + 0.08 + k * 0.13 for k in range(4)]
    for k, b in enumerate(ev["bars"]):
        sfx("asmr-tick-fine", b, 0.5)
    sfx("asmr-haptic-error", ev["bars"][-1] + 0.02, 0.35)
    e = say(match(g3, VO_LUFS - 3.5), at + 0.05, dry=len(gps("gps-3")))
    sub("Recalculating...", at + 0.05, e, "white")
    s5_end = e + 0.04
    shot("s5", s4_end, s5_end)
    # S6 top-down: You have arrived (far, muffled)
    at = s5_end + 0.05
    g4 = phone(gps("gps-4"), far=True)
    e = say(match(g4, VO_LUFS - 7), at, dry=len(gps("gps-4")))
    sub("You have arrived.", at, e + 0.1, "white")
    ev["arrived"] = at
    ev["select"] = s5_end + 0.12
    ev["owl"] = e - 0.05
    sfx("owl", ev["owl"], 0.42, src=own("owl"))
    sfx("asmr-air", s5_end - 0.05, 0.4)
    s6_end = e + 0.12
    shot("s6", s5_end, s6_end)
    # S7 the curse; the horn covers it from „დედა"
    at = s6_end + 0.04
    ev["curse"] = at
    if paid:
        x = cut(MAN, 7.12, 8.42) * man_g
        e = say(x, at)
        sub("„დევიკარგე, დედა ჩემო“", at, e + 0.1, "white")
        ev["honk"] = None
    else:
        x = cut(MAN, 3.74, 4.6, fout=0.015) * man_g
        e = say(x, at)
        ev["honk"] = at + (4.585 - 3.74)
        sfx("horn", ev["honk"], 0.62, closer=2.5, src=own("horn"))
        e = ev["honk"] + 0.72
        sub("„დევიკარგე, შენ #@%&“", at, e, "white")
    ev["punch"] = [at, at + 0.38, at + 0.7]
    ev["crows"] = at + 0.25
    s7_end = e + 0.06
    cr = own("crows")[: int((s7_end + 0.08 - ev["crows"]) * SR)].copy()
    cr[-int(0.06 * SR):] *= np.linspace(1, 0, int(0.06 * SR))
    sfx("crows", ev["crows"], 0.4, src=cr)  # they leave with the cut: the next line must stay clear
    shot("s7", s6_end, s7_end)
    # S8 arms up: can't understand, language; the cow; cut dead
    at = s7_end + 0.04
    ev["ver"] = at
    x1 = cut(MAN, 5.1, 5.84) * man_g
    x2 = cut(MAN, 6.08, 7.16) * man_g
    line = np.concatenate([x1, np.zeros(int(0.1 * SR)), x2])
    wet = echo(line)
    mx.put("voice", wet, at)
    mx.words.append((at, at + len(line) / SR))
    e = at + len(line) / SR
    ev["ena"] = at + len(x1) / SR + 0.1
    sub("„ვერ გევიგე, ენა არ მესმის“", at, e + 0.12, "white")
    ev["cowIn"] = e - 0.45
    ev["moo"] = e + 0.1
    sfx("cc0-click-tiny", ev["cowIn"] + 0.1, 0.25)
    black = ev["moo"] + 0.15
    cues.append(("moo", own("moo")[: int((black - ev["moo"]) * SR)], ev["moo"], 0.55, 1.5))
    shot("s8", s7_end, black)
    ev["black"] = black
    # the bed runs under the whole act and dies with the cut
    nb = int(black * SR)
    reps = int(np.ceil(nb / len(bed)))
    b = np.tile(bed, reps)[:nb]
    mx.bed[:nb] += b * 10 ** ((REF100 - 21 - peak100(bed)) / 20)
    # the cut to black: every sound of the act stops on this sample (echo and reverb tails included)
    for name, x_, at_, vol, closer in cues:
        mx.put("fx", x_, at_, sfx_gain(x_, vol, closer))
    cues.clear()
    nbk = int(black * SR)
    for tr in (mx.voice, mx.fx, mx.bed):
        tr[nbk:] = 0.0
    music["drop"] = round(black, 3)

    # ====================================================== ACT 2: the reveal =================================================
    # the owner (2026-10-12): "a 2-3 s pause where the screen goes black, then the phone rises": a full second more of black
    t = black + 1.35
    ev["seams"] = t
    sfx("asmr-air-long", t, 0.45)
    # N1: აი, ზუსტად ამიტომ / შევქმენით Vinari.
    at = t + 0.22
    ev["n1"] = at
    tl1 = ("აი, ზუსტად ამიტომ", "შევქმენით Vinari.")
    e = nline(0, 1, at, [(tl1[0], None), (tl1[1], (1,))])
    # the whiteout lands on the second chunk's first word
    n1b = subs[-1]["start"]
    ev["whiteout"] = n1b
    ev["screenOn"] = n1b + 0.22
    ev["rim"] = at + 0.9
    sfx("asmr-swell", at + 0.3, 0.45)
    sfx("asmr-shimmer", ev["rim"], 0.35)
    sfx("asmr-land", ev["whiteout"], 0.55)
    sfx("asmr-screen", ev["screenOn"], 0.45)
    subs[-2]["tone"] = "white"
    subs[-1]["tone"] = "ink"
    ev["wordmark"] = e + 0.08
    sfx("app-landed", ev["wordmark"], 0.35)
    reveal_end = e + 0.36
    shot("reveal", black, reveal_end)  # it holds the black itself, then the edge light opens
    # N2: the slam, no subtitle (the headline is the line)
    at = reveal_end + 0.04
    ev["slam1"] = at - 0.03
    x, pre = narr(2)
    say(x * ng, at - pre)
    # the second word's onset
    ev["slam2"] = dip_between(NARR, ISL[2][0], ISL[2][1], 12 / 20) - ISL[2][0] + at
    e = at + ISL[2][1] - ISL[2][0]
    ev["hairline"] = e + 0.05
    sfx("asmr-sub", ev["slam1"], 0.5)
    sfx("asmr-land", ev["slam1"], 0.55)
    sfx("asmr-land", ev["slam2"], 0.6)
    sfx("asmr-pencil-short", ev["hairline"], 0.4)
    music["hit"] = round(ev["slam2"], 3)
    slam_end = e + 0.6  # a real breath after it: the moment lands (a voice-free hold for his music, the reference ad's trick)
    shot("slam", reveal_end, slam_end)
    # N3: the claim, scoped, over the real map
    at = slam_end + 0.1
    ev["n3"] = at
    e = nline(3, 3, at, [("ნავიგატორი, რომელიც", None), ("ქართულად გელაპარაკება.", ("in", 3, 16 / 35))])
    ev["kartulad"] = subs[-1]["start"]
    ev["mapGlide"] = e - 0.25
    sfx("asmr-slide", slam_end - 0.05, 0.4)
    sfx("app-pick", ev["kartulad"], 0.35)
    claim_end = e + 0.3
    shot("claim", slam_end, claim_end)

    # ====================================================== the features ======================================================
    # S13 mountains, no signal: Alice offline
    t = claim_end
    ev["iris1"] = t
    sfx("asmr-whoomp", t, 0.4)
    ev["arcs"] = [t + 0.12, t + 0.22, t + 0.32]
    for a_ in ev["arcs"]:
        sfx("asmr-tick-fine", a_, 0.5)
    ev["slash"] = t + 0.42
    sfx("asmr-haptic-error", ev["slash"], 0.35)
    at = t + 0.5
    ev["alice1"] = at
    e = aclip("alice-offline", at, [("„ინტერნეტი არ არის,", 0.06), ("მაინც წაგიყვან.“", 1.16)])
    drv = kit("real-interior-drive")
    cues.append(("real-interior-drive", drv, t, 0.15, -6))
    mtn_end = e + 0.08
    shot("mountain", t, mtn_end)
    # S14 why offline: map, search and voice live in the phone; then „აბა, მოუსმინე."
    at = mtn_end + 0.08
    e = nline(4, 5, at, [("რუკა, ძებნა და ხმა", None), ("ტელეფონშივეა.", (5,))])
    l5 = ISL[5][1] - ISL[5][0]
    ev["icons"] = [at + 0.02, at + (ISL_RUKA_SPLIT - ISL[4][0]) + 0.02, at + (ISL[4][1] - ISL[4][0]) - 0.3]
    ev["glow"] = subs[-1]["start"] + 0.05
    for k_, a_ in enumerate(ev["icons"]):
        sfx("asmr-pop", a_ + 0.18, 0.45)
    sfx("asmr-land", ev["glow"], 0.4)
    at = e + 0.22
    ev["aba"] = at
    e = nline(6, 6, at, [("აბა, მოუსმინე.", None)])
    ev["irisVoices"] = e + 0.1
    sfx("asmr-whoomp", ev["irisVoices"], 0.45)
    why_end = ev["irisVoices"]
    shot("why", mtn_end, why_end)
    # S15 the two voices: 1903 / 1909
    t = why_end
    sfx("asmr-paper", t + 0.02, 0.45)
    at = t + 0.1
    ev["nelsonIntro"] = at
    e = aclip("nelson-intro", at, [("„გამარჯობა, მე ნელსონი ვარ.“", 0.06)], e=2.3)
    at = e + 0.06
    ev["aliceIntro"] = at
    e = aclip("alice-intro", at, [("„გამარჯობა, მე ალისა ვარ.“", 0.06)], e=2.1)
    ev["sticker"] = ev["aliceIntro"] + 0.95
    sfx("asmr-pop", ev["sticker"], 0.45)
    ev["bin"] = ev["aliceIntro"] + 1.45
    sfx("synth-whoosh", ev["bin"], 0.3)
    sfx("cc0-latch", ev["bin"] + 0.42, 0.45)
    voices_end = e + 0.08
    shot("voices", t, voices_end)
    # S16 street names: the Georgian answer to the forest's English line
    t = voices_end
    ev["tap19"] = t + 0.04
    sfx("asmr-tap", ev["tap19"], 0.5)
    at = t + 0.08
    ev["c300"] = at
    e = aclip("nelson-300m", at, [("„300 მეტრში მარჯვნივ მოუხვიე.“", 0.06)])
    at = e + 0.06
    ev["cstreet"] = at
    e = aclip("nelson-street", at, [("„შოთა რუსთაველის გამზირზე.“", 0.06)])
    streets_end = e + 0.06
    shot("streets", t, streets_end)
    # S17 roundabout
    t = streets_end
    at = t + 0.06
    ev["round"] = at
    m = V["clips"]["alice-roundabout"]
    b = dip_between(clip("alice-roundabout"), m["on"], m["off"], 11 / 26)
    e = aclip("alice-roundabout", at, [("„წრეზე მეორე", 0.05), ("გასასვლელით გადი.“", b)])
    ev["exit1"], ev["exit2"] = at + 0.35, at + 0.62
    sfx("asmr-tick-fine", ev["exit1"], 0.5)
    sfx("asmr-tick-fine", ev["exit2"], 0.55)
    sfx("asmr-check", ev["exit2"] + 0.4, 0.4)
    round_end = e + 0.05
    shot("round", t, round_end)
    # S18 lanes
    t = round_end
    at = t + 0.06
    ev["lane"] = at
    e = aclip("alice-lane", at, [("„მარჯვენა ზოლი დაიკავე.“", 0.06)])
    sfx("asmr-slide", at + 0.5, 0.35)
    lane_end = e + 0.05
    shot("lane", t, lane_end)
    # S19 the camera that is just a box
    t = lane_end
    ev["sign"] = t + 0.06
    sfx("asmr-pop", ev["sign"], 0.45)
    at = t + 0.06
    ev["cam"] = at
    e = aclip("nelson-camera", at, [("„წინ კამერაა.", 0.06), ("ლიმიტში თუ ხარ,", 1.12), ("ის უბრალოდ ყუთია.“", 2.03)])
    ev["check"] = at + 1.15
    sfx("asmr-check", ev["check"], 0.45)
    ev["box"] = at + 2.0
    sfx("asmr-camera", ev["box"] - 0.12, 0.35)
    sfx("cc0-card-place", ev["box"] + 0.2, 0.5)
    cam_end = e + 0.25
    shot("camera", t, cam_end)
    # S20 settings: unpaved roads, humour off, (whisper) boring; a cricket
    t = cam_end
    at = t + 0.1
    ev["n6a"] = at
    e = nline(7, 7, at, [("გრუნტის გზას აგარიდებს.", None)])
    sfx("cc0-click-soft", at + 0.1, 0.4)
    at = e + 0.18
    ev["n6b"] = at
    ev["scroll"] = at - 0.2
    sfx("asmr-ui-tick-roll", ev["scroll"], 0.35)
    e = nline(8, 9, at, [("ხუმრობა არ გინდა?", None), ("გამორთე.", (9,))])
    ev["gamorte"] = subs[-1]["start"]
    sfx("cc0-click-soft", ev["gamorte"], 0.4)
    ev["mainOnly"] = ev["gamorte"] + 0.45
    # the whisper
    ws, we_ = speech_span(WHISPER, -40)
    at = e + 0.25
    ev["whisper"] = at
    wx = cut(WHISPER, ws - 0.04, we_ + 0.12)
    wx = match(wx, VO_LUFS + 0.5)
    say(wx * 1.0, at - 0.04)
    sub("მოსაწყენო.", at, at + (we_ - ws) + 0.1)
    e = at + (we_ - ws)
    ev["cricket"] = e + 0.18
    sfx("cricket", ev["cricket"], 0.42, src=own("cricket"))
    set_end = ev["cricket"] + 0.36
    shot("settings", t, set_end)
    # S21 CarPlay: a promise
    t = set_end
    at = t + 0.1
    ev["now"] = at
    e = aclip("nelson-now", at, [("„ახლა მარჯვნივ მოუხვიე.“", 0.06)], fx=cabin)
    at = e + 0.18
    ev["wake"] = at - 0.05
    sfx("asmr-screen", ev["wake"], 0.5)
    ev["chip"] = at + 0.35
    sfx("asmr-pop", ev["chip"], 0.45)
    e = nline(11, 12, at, [("მალე CarPlay-ზეც ნახავ,", None), ("სიტყვას გაძლევთ.", (12,))])
    sfx("asmr-air-long", at + 0.6, 0.35)
    cp_end = e + 0.25
    shot("carplay", t, cp_end, live=False)
    # S22 arrival: the payoff of „You have arrived"
    t = cp_end
    ev["strike"] = t + 0.08
    sfx("asmr-strike", ev["strike"], 0.45)
    at = t + 0.14
    ev["arrivedClip"] = at
    e = aclip("nelson-arrived", at, [("„მოვედით,", 0.06), ("მარჯვენა მხარესაა.“", 0.73)])
    ev["pin"] = at + 0.3
    sfx("asmr-pop", ev["pin"], 0.45)
    ev["dance"] = at + 0.7
    for k in range(6):
        sfx("cc0-click-tiny", ev["dance"] + k * 0.2, 0.22)
    music["lift"] = round(ev["dance"], 3)
    arr_end = e + 0.12
    shot("arrival", t, arr_end)
    # S23 redemption: the forest redrawn, the route on, '+' chips
    t = arr_end
    at = t + 0.1
    ev["n8"] = at
    e = nline(13, 13, at, [("აწი აღარ დაიკარგები.", None)])
    cues.append(("real-interior-drive", drv, t, 0.12, -8))
    at = e + 0.25
    ev["rise"] = at - 0.15
    ev["n9"] = at
    e = nline(14, 14, at, [("ეს მხოლოდ დასაწყისია.", None)])
    sfx("asmr-pencil-long", ev["rise"], 0.35)
    ev["chips"] = [ev["n9"] + 0.15 + k * 0.32 for k in range(3)]
    for c_ in ev["chips"]:
        sfx("asmr-ui-tick-soft", c_, 0.45)
    red_end = e + 0.1
    shot("redeem", t, red_end)
    # S24 the end card
    t = red_end
    ev["rimRun"] = t
    sfx("asmr-whoomp", t + 0.05, 0.35)
    at = t + 0.18
    ev["n10"] = at
    e = nline(15, 16, at, [("Vinari ჩაიწერე, გამოგვყევი", None), ("და მომავლისთვის მზად იყავი.", (16,))])
    ev["endHit"] = e + 0.02
    sfx("asmr-end", ev["endHit"], 0.4)
    total = e + 0.34
    shot("end", t, total)

    # ---- the sound design onto its track, the beds' dip under words ----------------------------------------------------
    for name, x, at, vol, closer in cues:
        g = sfx_gain(x, vol, closer)
        mx.put("fx", x, at, g)
    # the room tone under act 2, very low
    rt = kit("asmr-room")
    s0 = int(black * SR)
    nroom = int((total - black) * SR)
    rr = np.tile(rt, int(np.ceil(nroom / len(rt))))[:nroom]
    mx.bed[s0 + int(0.35 * SR): s0 + nroom] += rr[: nroom - int(0.35 * SR)] * 10 ** ((REF100 - 40 - peak100(rt)) / 20)
    dip = np.ones(mx.n)
    for s_, e_ in mx.words:
        dip[int(s_ * SR): int(e_ * SR)] = 0.7
    dip = np.convolve(dip, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same")
    vbus = compress(mx.voice, VO_LUFS - 3, ratio=2.5)
    out = vbus + mx.fx + mx.bed * dip
    # hard silence on the black (the comic beat), and nothing after the end
    out[int(black * SR): int((black + 0.35) * SR)] *= 0.0
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    return out, {"total": round(total, 3), "fps": 30, "shots": shots, "events": ev, "subs": subs, "music": music}


def compress(x, thr_db, ratio=3.0, attack=0.005, release=0.1, win=0.01):
    """A feed-forward compressor on a 10 ms RMS level (the voice bus): the crest factor comes down so the film can be loud
    without a limiter squashing every word."""
    w = int(win * SR)
    lvl = 10 * np.log10(np.convolve(x * x, np.ones(w) / w, mode="same") + 1e-12)
    over = np.maximum(0.0, lvl - thr_db)
    want = -over * (1 - 1 / ratio)  # dB, <= 0
    ka, kr = np.exp(-1.0 / (attack * SR)), np.exp(-1.0 / (release * SR))
    g = np.empty_like(want)
    cur = 0.0
    for i, v in enumerate(want.tolist()):
        cur = v + (cur - v) * (ka if v < cur else kr)
        g[i] = cur
    return x * 10 ** (g / 20)


def limiter(x, ceiling_db, look=0.002, release=0.06):
    """A look-ahead peak limiter on the 4x oversampled signal (a true-peak ceiling): instant attack, smooth release."""
    up = np.abs(signal.resample_poly(x, 4, 1))
    need = np.minimum(1.0, 10 ** (ceiling_db / 20) / np.maximum(up, 1e-9))
    need = need[: len(x) * 4].reshape(-1, 4).min(axis=1)
    from scipy.ndimage import minimum_filter1d

    w = max(1, int(look * SR))
    need = minimum_filter1d(need, size=2 * w + 1, mode="nearest")
    k = np.exp(-1.0 / (release * SR))
    g = np.empty_like(need)
    cur = 1.0
    for i, v in enumerate(need.tolist()):
        cur = v if v < cur else v + (cur - v) * k
        g[i] = cur
    return x * g


def soft_clip(x, ceil_db, knee=0.55):
    """An oversampled soft clipper: under knee * ceiling nothing changes, above it the peaks round off toward the ceiling.
    Speech's crest factor is mostly single pitch-period spikes; rounding them is what lets a voiced film sit at -10 LUFS
    without the limiter pumping every syllable down (measured: the limiter alone stalled at -12.4 LUFS)."""
    up = signal.resample_poly(x, 4, 1)
    c = 10 ** (ceil_db / 20)
    k = knee * c
    a = np.abs(up)
    y = np.where(a <= k, up, np.sign(up) * (k + (c - k) * np.tanh((a - k) / (c - k))))
    return signal.resample_poly(y, 1, 4)[: len(x)]


def master(x, path, target=-10.0, tp=-1.0):
    """One gain to target LUFS, then the limiter only where the true peak needs it; aimed again by the miss."""
    # measured as the stereo file it ships as (dual mono reads +3 dB over the mono signal on a BS.1770 meter)
    tmp = path + ".m.wav"
    write_wav(tmp, np.stack([x, x], axis=1), bits=24)
    i, p = loudness(tmp)
    g = target - i + 1.5
    for attempt in range(8):
        y = limiter(soft_clip(x * 10 ** (g / 20), tp - 0.3), tp - 0.4)
        write_wav(tmp, np.stack([y, y], axis=1), bits=24)
        i2, p2 = loudness(tmp)
        print(f"master {os.path.basename(path)}: {i:.2f} -> {i2:.2f} LUFS, true peak {p2:.2f} dBTP (gain {g:+.2f} dB)")
        if abs(i2 - target) <= 0.15 and p2 <= tp:
            break
        g += (target - i2) * 0.7
    write_wav(path, np.stack([y, y], axis=1), bits=24)
    os.remove(tmp)
    return i2, p2


def main():
    x, tl = build(paid=False)
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:9s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})")
    # -1.8 dBTP in the wav: the AAC encode of the mp4 overshoots by about 0.7 dB (measured: a -1.40 wav read -0.67 in the mp4)
    master(x, os.path.join(OUT, "mix.wav"), tp=-1.8)
    if "--paid" in sys.argv:
        xp, tlp = build(paid=True)
        save_json(os.path.join(OUT, "timeline-paid.json"), tlp)
        master(xp, os.path.join(OUT, "mix-paid.wav"), tp=-1.8)


if __name__ == "__main__":
    main()
