#!/usr/bin/env python3
"""The QR promo's timeline and its whole sound, built from the measured Gemini takes (voices.py) and the sounds
(public/vo/qrpromo/sfx from sfx_synth.py, public/sfx):

  src/qrpromo/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/qrpromo/mix.wav      the mastered film sound: the voices, the bleep, the sound design (gitignored)

    python3 src/qrpromo/build/plan.py

v5 (the owner, 2026-10-14: the explanation was thin): a new narrator take (voices.py NARR5): how and where the card is
made (in the app, printed on A4, behind the windscreen), no number and no plate on it, no spam, quiet at night, off at
any time; three new shots: print, spam, night.
v4 (the owner, 2026-10-14):
  - the narrator is ONE continuous Algieba take (voices.py NARR4), laid down whole: its islands 0..12 as one piece
    („საქართველოში პირველად" .. „შენი ნომრის გარეშე."), her calm line, then 13..16 as one piece; never re-spaced, never
    cut into sentences. The film is timed to the take.
  - the opening is filled with two strangers heard FROM her phone (voices.py CALLER1 Fenrir, CALLER2 Enceladus) through
    a phone speaker (300-3400 Hz, a little drive and compression, a small room): „მანქანა ხელს მიშლის, ტოოოო!" (the
    take's „ტო" drawn out by a WSOLA stretch of its vowel, pitch kept) and „შენი გაცნობა, ლამაზო?". Their subtitles are
    marked `phone` (Subs draws a small phone glyph before them).
  - many more shots (a cut every 1.5 to 2.5 s): speaker, mirror, groan, call, flood, facade, paper, reveal, card, street,
    ots, options (with three cut-away inserts opt1..opt3), push, walk, calm, end.
Her take is cut only at its breaths, the bleep starts on the last sample of „მომი-". Master: -11 LUFS, true peak under
-1.8 dBTP in the wav, no music. The whooshes, slides and swells sit on their own ducked bus (`air`).
"""
import os
import sys

import numpy as np
from scipy import signal

from common import OUT, SFX, SR, STUDIO, ff, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

TL = os.path.join(STUDIO, "src", "qrpromo", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
N5 = read_wav(os.path.join(OUT, V["narr5"]["file"]))
WOM = read_wav(os.path.join(OUT, V["woman"]["file"]))
C1_RAW = read_wav(os.path.join(OUT, V["caller1"]["file"]))
C2_RAW = read_wav(os.path.join(OUT, V["caller2"]["file"]))


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


def islands(a, min_len=0.15, rel=-38.0):
    on, off = speech_span(a, -40)
    ps = [p for p in pauses(a, min_len, rel) if p[0] > on + 0.05 and p[1] < off - 0.05]
    out, s = [], on
    for p0, p1 in ps:
        out.append((s, p0))
        s = p1
    out.append((s, off))
    return out


def dip_between(a, s, e, frac):
    """The quietest 20 ms near the letter-proportional point `frac` of s..e (within +-0.22 s): a chunk border in a line."""
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


# the woman's 5 islands: 0 „ისევ უცნობი ნომერი..." 1 „აუუუ," 2 „რა ტვინი მომი-" (cut off: the bleep follows)


# the woman's 5 islands: 0 „ისევ უცნობი ნომერი..." 1 „აუუუ," 2 „რა ტვინი მომი-" (cut off: the bleep follows)
# 3 „ნომერი საქარე მინაზე რამ დამაწერინა?" 4 „აი, ახლა კი მშვიდად." (transcribed 2026-10-14)
WISL = islands(WOM)
if len(WISL) != 5:
    sys.exit(f"woman: expected 5 speech islands, found {len(WISL)}: {[(round(a, 2), round(b, 2)) for a, b in WISL]}")
# the v5 narrator take's 29 islands (voices.py NARR5, transcribed 2026-10-14, the whole take and three spans on their own):
#  0 საქართველოში პირველად:  1 ვინარის ქიუარ ბარათი.  2 აპში  3 შექმნი,
#  4 ა-ოთხზე ამობეჭდავ და საქარე მინის მიღმა დადებ.  5 ბარათზე არც შენი ნომერია,  6 არც მანქანის ნომერი.  7 მხოლოდ კოდი.
#  8 ვისაც რამე უნდა,  9 დაასკანერებს.  10 აპიც არ სჭირდება.  11 სამ ღილაკს დაინახავს:  12 მანქანა გზას მიკეტავს,
#  13 შუქები ანთია,  14 მანქანასთან რაღაც ხდება.  15 მიზეზს აირჩევს და ერთი დაჭერით გაგზავნის.  16 შენ შეტყობინება მოგივა.
#  17 ზარი არა.  18 შენს ნომერს ვერავინ გაიგებს.  19 სპამი არ იქნება:  20 ერთი ბარათიდან ხშირად ვერავინ მოგწერს.
#  21 ღამით, თუ გინდა, უხმოდ მოვა.  22 ბარათს კი ნებისმიერ დროს გათიშავ.  23-24 ვინარი ჩაიწერე,
#  25 ეპ სთორსა  26 და გუგლ ფლეიზეა.  27 ნომერიც შენთან რჩება  28 და ნერვებიც.
NI = islands(N5)
if len(NI) != 29:
    sys.exit(f"narrator: expected 29 speech islands, found {len(NI)}: {[(round(a, 2), round(b, 2)) for a, b in NI]}")
SPLIT = 22  # islands 0..22 are one piece, 23..28 the other (her calm line between)


def _slow_first(a, isl, rate=1 / 1.22):
    """v5.1 (the owner, 2026-10-14: „საქართველოში პირველად" is fast, say it a little slower): island 0 of the take
    stretched by 1/rate with the pitch kept (WSOLA), every later island shifted by the added time"""
    s0, e0 = isl[0]
    p0, p1 = int((s0 - 0.03) * SR), int((e0 + 0.03) * SR)
    mid = wsola(a[p0:p1], rate, win=0.04, hop=0.01, tol=0.012)
    xf = int(0.01 * SR)
    r = np.linspace(0, 1, xf)
    head = a[:p0].copy()
    tail = a[p1:].copy()
    mid[:xf] = head[-xf:] * (1 - r) + mid[:xf] * r if len(head) >= xf else mid[:xf]
    mid[-xf:] = mid[-xf:] * (1 - r) + tail[:xf] * r
    out = np.concatenate([head[:-xf] if len(head) >= xf else head, mid, tail[xf:]]).astype(np.float32)
    d = (len(out) - len(a)) / SR
    return out, [(s0, e0 + d)] + [(x + d, y + d) for x, y in isl[1:]]




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


def wsola(x, rate, win=0.03, hop=0.0075, tol=0.009):
    """Time-stretch x by 1/rate (rate < 1 longer), pitch kept: waveform-similarity overlap-add (a sustained vowel)."""
    N = int(win * SR)
    Hs = int(hop * SR)
    T = int(tol * SR)
    w = np.hanning(N)
    out_len = int(len(x) / rate) + N
    y = np.zeros(out_len + N)
    norm = np.zeros(out_len + N)
    prev = 0
    k = 0
    while True:
        o = k * Hs
        a = int(o * rate)
        if a + N + T >= len(x) or o + N >= out_len:
            break
        if k == 0:
            best = a
        else:
            # the natural continuation of the last frame taken, matched inside +-T of the analysis point
            if prev + Hs + N > len(x):
                break
            nat = x[prev + Hs: prev + Hs + N]
            lo, hi = max(0, a - T), min(len(x) - N, a + T)
            best, bv = a, -1e9
            for c in range(lo, hi + 1, 2):
                v = float(np.dot(nat, x[c: c + N]))
                if v > bv:
                    bv, best = v, c
        y[o: o + N] += x[best: best + N] * w
        norm[o: o + N] += w
        prev = best
        k += 1
    n = (k - 1) * Hs + N if k else 0
    y, norm = y[:n], norm[:n]
    return (y / np.maximum(norm, 1e-3)).astype(np.float32)


def phone_voice(x, room=0.12, size=0.2, hiss=-90.0):
    """A voice heard from a phone's speaker (the owner: it must read as FROM the phone): band-limited 300-3400 Hz, the
    small speaker's honk near 1.8 kHz, a little drive and compression, a slight room, a whisper of line hiss."""
    y = signal.sosfilt(sos_f("high", 300, 4), x)
    y = signal.sosfilt(sos_f("low", 3400, 4), y)
    b, a = signal.iirpeak(1800, 1.4, fs=SR)
    y = y + 0.45 * signal.lfilter(b, a, y)
    pk = np.max(np.abs(y)) + 1e-9
    y = np.tanh(y / pk * 1.8) / np.tanh(1.8) * pk  # a little drive
    # a quick compressor (10 ms RMS, 3:1 over -14 dB of its peak)
    w = int(0.01 * SR)
    lvl = 10 * np.log10(np.convolve(y * y, np.ones(w) / w, mode="same") + 1e-12)
    thr = 20 * np.log10(pk) - 14
    g = 10 ** (-np.maximum(0, lvl - thr) * (1 - 1 / 3) / 20)
    g = signal.sosfilt(sos_f("low", 30, 1), g)
    y = y * g
    rng = np.random.default_rng(41)
    hs = signal.sosfilt(sos_f("band", [500, 3200], 2), rng.standard_normal(len(y))).astype(np.float32)
    hs *= 10 ** (hiss / 20) * np.sqrt(np.mean(y * y) + 1e-12) / (np.sqrt(np.mean(hs * hs)) + 1e-12)
    y = y + hs
    return reverb(y, size, room, 3000, seed=13).astype(np.float32)


# caller 1 (Fenrir): „მანქანა ხელს მიშლის, ტო!" as voiced (speech 0.32-1.91 s; „ტო"'s vowel steady from 1.50 s, the pitch
# falling 260 -> 130 Hz to 1.86 s). The owner wants the drawn-out „ტოოოო": its steady stretch 1.50-1.78 s is stretched
# 3.2 times (pitch kept), so the shout lasts about a second.
_c1on, _c1off = speech_span(C1_RAW, -40)
_V0, _V1, _STRETCH = 1.50, 1.78, 3.2
_mid = wsola(C1_RAW[int((_V0 - 0.015) * SR): int((_V1 + 0.015) * SR)], 1 / _STRETCH)
_xf = int(0.012 * SR)


def _join(a, b):
    """a and b cross-faded over 12 ms"""
    r = np.linspace(0, 1, _xf)
    return np.concatenate([a[:-_xf], a[-_xf:] * (1 - r) + b[:_xf] * r, b[_xf:]]).astype(np.float32)


C1 = _join(_join(C1_RAW[int((_c1on - 0.03) * SR): int(_V0 * SR)], _mid), C1_RAW[int(_V1 * SR): int((_c1off + 0.08) * SR)])
C1_TO = 1.42 - (_c1on - 0.03)  # where „ტო" starts in C1 (the closure before it at 1.40-1.44 s of the take)
C1_LEN = len(C1) / SR
# caller 2 (Enceladus): „შენი გაცნობა," 0.28-2.25 s, a 0.5 s breath, „ლამაზო?" 2.68-3.75 s: the breath shortened to 0.14 s
_c2a = cut(C2_RAW, 0.25, 2.27, 0.008, 0.1)
_c2b = cut(C2_RAW, 2.66, 3.80, 0.008, 0.12)
C2_GAP = 0.14
C2 = np.concatenate([_c2a, np.zeros(int(C2_GAP * SR), np.float32), _c2b]).astype(np.float32)
C2_B = (len(_c2a) / SR) + C2_GAP - 0.03  # where „ლამაზო" starts in C2
C2_LEN = len(C2) / SR - 0.05


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


N5, NI = _slow_first(N5, NI)


# ---- the tracks ------------------------------------------------------------------------------------------------------------
class Mix:
    def __init__(self, sec):
        self.n = int(sec * SR) + SR
        self.voice = np.zeros(self.n)
        self.fx = np.zeros(self.n)
        self.air = np.zeros(self.n)  # v3: the whooshes, slides and swells, ducked under words
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




def room_voice(x):
    """Her voice in a small warm room: a whisper of early reflections, never an echo."""
    return reverb(x, 0.22, 0.1, 5000, seed=7)


def bleep_x():
    return own("bleep")




def build():
    global REF100, VPEAK
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(N5)) / 20)
    REF100 = peak100(N5 * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(N5 * ng), 99.95))
    wg = 10 ** ((VO_LUFS - lufs(WOM)) / 20)
    mx = Mix(95)
    cues = []  # (name, x, at, volume, closer)
    ducks = []  # (start, end, dB): the fx bus ducked under a line

    def sfx(name, at, volume=0.5, closer=0.0, src=None, dur=None):
        x = src if src is not None else (own(name) if name in OWN else kit(name))
        if dur is not None:
            n = int(dur * SR)
            x = x[:n].copy()
            f = min(len(x), int(0.06 * SR))
            x[-f:] *= np.linspace(1, 0, f)
        cues.append((name, x, at, volume, closer))

    def flush():
        """every cue onto its track: the whooshes, slides, swells and big thumps lower, on the ducked `air` bus"""
        for name, x_, at_, vol, closer in cues:
            if name in AIR:
                mx.put("air", x_, at_, sfx_gain(x_, vol, closer + AIR[name]))
            else:
                mx.put("fx", x_, at_, sfx_gain(x_, vol, closer))
        cues.clear()

    def sub(text, s, e, tone="ink", **kw):
        subs.append({"text": text, "start": round(s, 3), "end": round(e, 3), "tone": tone, **kw})

    def shot(name, s, e, **kw):
        shots.append({"id": name, "from": round(s, 3), "to": round(e, 3), **kw})

    def wline(i, at, chunks=None, tone="white", fx=room_voice, gain_db=0.0):
        """Her island i, its first word on `at`; chunks: [(text, border)] with border None (start) or a letter fraction."""
        s0, e0 = WISL[i]
        x = cut(WOM, s0 - 0.04, e0 + 0.1) * wg * 10 ** (gain_db / 20)
        if fx:
            x = fx(x)
        mx.put("voice", x, at - 0.04)
        mx.words.append((at, at + e0 - s0))
        if chunks:
            borders = [s0] + [dip_between(WOM, s0, e0, b) for _, b in chunks[1:]] + [e0]
            for k, (text, _) in enumerate(chunks):
                sub(text, at + borders[k] - s0, at + borders[k + 1] - s0, tone)
        return at + (e0 - s0)

    # ---- the narrator: two pieces of ONE take, laid down whole ----
    base = {}

    def npiece(i, j, at):
        """islands i..j of the take as one piece, island i's first word on `at`"""
        s0, e0 = NI[i][0], NI[j][1]
        mx.put("voice", cut(N5, s0 - 0.05, e0 + 0.12) * ng, at - 0.05)
        for k in range(i, j + 1):
            base[k] = (at, s0)
            mx.words.append((at + NI[k][0] - s0, at + NI[k][1] - s0))
        return at + e0 - s0

    def nt(k):
        a, s0 = base[k]
        return a + NI[k][0] - s0

    def ne(k):
        a, s0 = base[k]
        return a + NI[k][1] - s0

    def ndip(k, frac):
        """a word border inside island k (its quietest 20 ms near the letter fraction), film time"""
        a, s0 = base[k]
        return a + dip_between(N5, NI[k][0], NI[k][1], frac) - s0

    def nsub(k, chunks, tone="ink"):
        """island k's subtitle: [(text, border)], border None (its start) or a letter fraction of the island"""
        bs = [nt(k)] + [ndip(k, b) for _, b in chunks[1:]] + [ne(k)]
        for m, (text, _) in enumerate(chunks):
            sub(text, bs[m], bs[m + 1], tone)

    def caller(x, at, gain_db=0.0, room=0.12, size=0.2):
        """a stranger's voice from her phone, its first word on `at`"""
        y = phone_voice(x, room, size)
        g = 10 ** ((VO_LUFS + gain_db - lufs(y)) / 20)
        mx.put("voice", y * g, at - 0.03)
        return y

    buzz = kit("real-phone-buzz-desk")
    b1 = cut(buzz, 0.0, 1.06, 0.004, 0.08)
    short = kit("real-phone-buzz")

    # ============================================ ACT 1: the problem ============================================
    # 1 speaker (0 s): her phone on the walnut, a call on the loudspeaker from „უცნობი ნომერი"; a stranger shouts
    # „მანქანა ხელს მიშლის, ტოოოო!" (the drawn-out „ტოოოო" builds on the subtitle letter by letter)
    on1 = 0.10
    ev["c1"] = on1
    caller(C1, on1, gain_db=0.5)
    c1to = on1 + C1_TO
    c1end = on1 + C1_LEN - 0.08
    ev["c1to"] = c1to
    ev["c1end"] = c1end
    mx.words.append((on1, c1end))
    sfx("asmr-screen", 0.0, 0.3)
    sub("„მანქანა ხელს მიშლის,", on1, c1to, "white", phone=True)
    oo = ["ტო", "ტოო", "ტოოო", "ტოოოო!“"]
    st = (c1end - c1to) / len(oo)
    for k, w_ in enumerate(oo):
        sub(f"„მანქანა ხელს მიშლის, {w_}", c1to + k * st, c1to + (k + 1) * st, "white", phone=True)
    ev["shout"] = c1to + 0.1
    speaker_end = c1end + 0.14
    shot("speaker", 0.0, speaker_end)
    # 2 mirror: the room, she does her lips at the mirror; on the vanity her phone plays a stranger's voice message:
    # „შენი გაცნობა, ლამაზო?" (sleazy); on „ლამაზო?" she stops, the lipstick comes down
    t = speaker_end
    ev["mirrorIn"] = t
    ev["vm"] = t + 0.08
    sfx("asmr-tap", ev["vm"], 0.32)
    on2 = t + 0.34
    ev["c2"] = on2
    caller(C2, on2, gain_db=-0.5, room=0.2, size=0.32)
    ev["lamazo"] = on2 + C2_B
    c2end = on2 + C2_LEN
    ev["c2end"] = c2end
    mx.words.append((on2, c2end))
    sub("„შენი გაცნობა,", on2, ev["lamazo"], "white", phone=True)
    sub("„შენი გაცნობა, ლამაზო?“", ev["lamazo"], c2end, "white", phone=True)
    ev["freeze"] = ev["lamazo"] + 0.15
    sfx("cc0-clasp", ev["freeze"] + 0.35, 0.3)  # the lipstick's cap
    mirror_end = c2end + 0.16
    # v4: on „ლამაზო?" a cut close onto her face and its reflection: she stops, the lipstick comes down
    ev["closeCut"] = ev["lamazo"] - 0.12
    shot("mirror", t, ev["closeCut"])
    shot("mirror2", ev["closeCut"], mirror_end)
    # 3 groan: closer; „აუუუ," the head tilts back on the neck, a sigh lifts and drops the shoulders, a hand to the
    # forehead; „რა ტვინი მომი-" and the bleep
    t = mirror_end
    at = t + 0.14
    ev["groan"] = at
    e1 = wline(1, at)
    at2 = e1 + 0.08
    ev["tvini"] = at2
    e2 = wline(2, at2, fx=None)
    ev["bleep"] = e2 - 0.02
    bl = bleep_x()
    blg = 10 ** ((VO_LUFS - 4 - lufs(bl)) / 20)
    mx.put("voice", bl * blg, ev["bleep"])
    mx.words.append((ev["bleep"], ev["bleep"] + len(bl) / SR))
    bleep_end = ev["bleep"] + len(bl) / SR
    sub("„აუუუ,", ev["groan"], ev["tvini"], "white")
    sub("„აუუუ, რა ტვინი მომი", ev["tvini"], ev["bleep"], "white")
    subs.append({"text": "„აუუუ, რა ტვინი მომი#@%ეს…“", "start": round(ev["bleep"], 3), "end": round(bleep_end + 0.12, 3), "tone": "white", "censor": True})
    sfx("cc0-cloth", ev["groan"] + 0.05, 0.25)
    ev["callCut"] = bleep_end + 0.15
    shot("groan", t, ev["callCut"])
    # 4 the call: the phone from above on the wood, „უცნობი ნომერი" again; she declines with a sigh
    t = ev["callCut"]
    sfx("buzz", t - 0.02, 0.55, src=b1)
    at = t + 0.12
    ev["w0"] = at
    e = wline(0, at, [("„ისევ უცნობი ნომერი...“", None)], gain_db=2.0)
    # v4 fix (the art director: her line was buried under the desk buzz, 6-8 dB under her other lines on earbuds): the fx bus
    # ducks 8 dB under her words, the call's first buzz hit stays at full level
    ducks.append((at + 0.16, e + 0.03, -8.0))
    ev["decline"] = e + 0.1
    sfx("buzz", ev["decline"] - 1.0, 0.5, src=b1[: int(1.0 * SR)])
    sfx("asmr-tap", ev["decline"], 0.5)
    sfx("cc0-click", ev["decline"], 0.4)
    sfx("asmr-haptic-light", ev["decline"] + 0.02, 0.4)
    call_end = ev["decline"] + 0.4
    shot("call", t, call_end)
    # 5 the flood: banners land faster and faster, each lifted out big enough to read
    t = call_end
    bs = [t + 0.1]
    for g_ in (0.62, 0.54, 0.46):
        bs.append(bs[-1] + g_)
    ev["banners"] = bs
    for k, b in enumerate(bs):
        sfx("asmr-notif", b, 0.42 if k < 3 else 0.32)
        sfx("buzz", b + 0.02, 0.5 if k == 0 else 0.36, src=short)  # v4: the later buzzes 3 dB lower (less desk rumble)
        sfx("asmr-pop", b + 0.12, 0.25)
    flood_end = bs[-1] + 0.66
    shot("flood", t, flood_end)
    # 6 facade: from her lit window the camera flies down the old house to the street; „ნომერი საქარე მინაზე"
    # 7 paper: cut close on her windscreen under the lamp, the paper with her number, the loupe; „რამ დამაწერინა?"
    t = flood_end
    ev["fly"] = t
    sfx("asmr-air-long", t + 0.05, 0.4)
    at = t + 0.4
    ev["w3"] = at
    s3, e3 = WISL[3]
    border = at + dip_between(WOM, s3, e3, 21 / 37) - s3
    e = wline(3, at, [("„ნომერი საქარე მინაზე", None), ("რამ დამაწერინა?“", 21 / 37)])
    ev["landed"] = border - 0.05
    ev["paperCut"] = border - 0.08
    shot("facade", t, ev["paperCut"])
    t = ev["paperCut"]
    ev["loupe"] = t + 0.28
    sfx("asmr-pop", ev["loupe"], 0.4)
    sfx("asmr-paper", ev["loupe"] + 0.05, 0.4)
    ev["dim"] = e + 0.15
    ev["black"] = ev["dim"] + 0.45
    shot("paper", t, ev["black"])
    rt = own("room")
    city = own("city")

    def bed(x, s, e_, lvl_db, fin=0.3, fout=0.3):
        n = int((e_ - s) * SR)
        if n <= 0:
            return
        y = np.tile(x, int(np.ceil(n / len(x))))[:n].copy()
        a, b = int(fin * SR), int(fout * SR)
        y[:a] *= np.linspace(0, 1, a)
        y[-b:] *= np.linspace(1, 0, b)
        # v5.1 (the owner, 2026-10-14: "remove the noise, I want it clean"): no room tone, no city bed; the film is the
        # voices and the cues on silence
        if os.environ.get("QR_BEDS"):
            mx.put("bed", y * 10 ** ((REF100 - lvl_db - peak100(x)) / 20), s)

    bed(rt, 0.0, ev["callCut"] + 0.1, 31, 0.05, 0.2)
    bed(rt, ev["callCut"], ev["fly"] + 0.2, 33, 0.1, 0.25)
    bed(city, ev["fly"], ev["black"], 24, 0.4, 0.55)
    flush()
    nb = int(ev["black"] * SR)
    for tr in (mx.fx, mx.air, mx.bed):
        tail = tr[nb:].copy()
        tr[nb:] = 0.0
        k = min(len(tail), int(0.08 * SR))
        tr[nb: nb + k] = tail[:k] * np.linspace(1, 0, k)

    # ============================================ ACT 2: the answer (the narrator, one take) ============================
    t = ev["black"]
    ev["rim"] = t + 0.1
    sfx("asmr-shimmer", ev["rim"], 0.35)
    sfx("asmr-swell", t + 0.2, 0.42)
    ev["wake"] = t + 0.35
    sfx("asmr-screen", ev["wake"], 0.4)
    T0 = t + 1.45
    endA = npiece(0, SPLIT, T0)
    # 8 the reveal: „საქართველოში პირველად:" (the headline is the line: no subtitle) „ვინარის ქიუარ ბარათი." „აპში შექმნი,"
    # (v5: the tap on „ამობეჭდვა და გაზიარება" and the card lifting out of the real screen land on „შექმნი")
    ev["n0"] = nt(0)
    ev["whiteout"] = nt(0) - 0.8
    ev["slam1"] = nt(0)
    ev["slam2"] = ndip(0, 12 / 21)
    sfx("asmr-land", ev["slam1"], 0.55)
    sfx("asmr-sub", ev["slam1"], 0.45)
    sfx("asmr-land", ev["slam2"], 0.6)
    ev["hairline"] = ne(0) + 0.05
    sfx("asmr-pencil-short", ev["hairline"], 0.35)
    ev["n1"] = nt(1)
    nsub(1, [("Vinari-ს QR ბარათი.", None)])
    sub("აპში შექმნი,", nt(2), ne(3))
    ev["printTap"] = nt(3) + 0.05
    ev["lift"] = ev["printTap"] + 0.36
    sfx("asmr-tap", ev["printTap"], 0.45)
    sfx("asmr-haptic-light", ev["printTap"] + 0.02, 0.35)
    sfx("asmr-slide", ev["lift"] - 0.05, 0.4)
    sfx("app-landed", ev["lift"] + 0.25, 0.35)
    reveal_end = ne(3) + 0.22
    shot("reveal", t, reveal_end)
    # 8b print (v5): an A4 sheet comes out of a home printer, the card printed at its head: „A4-ზე ამობეჭდავ"
    t = reveal_end
    ev["sheet"] = t + 0.1
    b4 = ndip(4, 17 / 45)
    print_end = b4 - 0.06
    sfx("printer", ev["sheet"], 0.22, dur=min(2.1, print_end - ev["sheet"] + 0.25))
    sub("A4-ზე ამობეჭდავ", nt(4), b4)
    sub("და საქარე მინის მიღმა დადებ.", b4, ne(4))
    shot("print", t, print_end)
    # 9 the card: „და საქარე მინის მიღმა დადებ." the printed card flies down and lands behind her windscreen; „ბარათზე არც
    # შენი ნომერია," her old paper lifts off the glass, is struck out and falls away; „არც მანქანის ნომერი. მხოლოდ კოდი."
    # the loupe on the card behind the glass
    t = print_end
    ev["carIn"] = t + 0.05
    sfx("asmr-swell", t + 0.02, 0.3)
    ev["flyCard"] = max(t + 0.62, ndip(4, 31 / 45) - 0.1)
    sfx("synth-whoosh", ev["flyCard"], 0.35)
    ev["cardIn"] = ev["flyCard"] + 0.5
    sfx("cc0-card-place", ev["cardIn"], 0.5)
    sfx("asmr-haptic-soft", ev["cardIn"] + 0.02, 0.35)
    nsub(5, [("ბარათზე არც შენი ნომერია,", None)])
    ev["oldNote"] = nt(5) - 0.1
    sfx("cc0-card-slide", ev["oldNote"], 0.35)
    ev["strike"] = ndip(5, 17 / 26) + 0.05
    sfx("asmr-strike", ev["strike"], 0.45)
    ev["noteGone"] = ne(5) + 0.05
    sfx("asmr-paper", ev["noteGone"], 0.3)
    nsub(6, [("არც მანქანის ნომერი.", None)])
    nsub(7, [("მხოლოდ კოდი.", None)])
    ev["cardLoupe"] = nt(6) + 0.1
    sfx("asmr-pop", ev["cardLoupe"], 0.4)
    card_end = ne(7) + 0.16
    shot("card", t, card_end)
    # 10 street: a real street around her car; a young man walks along the pavement, stops at its windscreen and raises
    # his phone; „ვისაც რამე უნდა," ... „დაასკანერებს."
    t = card_end
    ev["walkIn"] = t
    sfx("mansteps", t + 0.04, 0.32)
    bed(city, t, t + 2.4, 30, 0.2, 0.4)
    ev["n5"] = nt(8)
    nsub(8, [("ვისაც რამე უნდა,", None)])
    nsub(9, [("დაასკანერებს.", None)])
    scan_word = nt(9)
    ev["stop"] = scan_word - 0.55
    ev["raise"] = scan_word - 0.3
    sfx("cc0-cloth", ev["raise"], 0.32)
    street_end = scan_word + 0.12
    shot("street", t, street_end)
    # 11 ots: over his shoulder: his camera finds her windscreen, the yellow frame locks on the code, „vinari.ge"; on
    # „აპიც არ სჭირდება." a tap opens the REAL page (15-qr-web) in the browser
    t = street_end
    ev["ots"] = t
    sfx("asmr-air", t, 0.3)
    ev["lock"] = ne(9) - 0.06
    sfx("asmr-camera", ev["lock"] - 0.22, 0.3)
    sfx("asmr-ui-tick", ev["lock"], 0.5)
    sfx("asmr-haptic-success", ev["lock"] + 0.02, 0.45)
    ev["chip"] = ev["lock"] + 0.22
    sfx("asmr-pop", ev["chip"], 0.45)
    ev["n7"] = nt(10)
    nsub(10, [("აპიც არ სჭირდება.", None)], "white")
    ev["tapChip"] = nt(10) + 0.12
    sfx("asmr-tap", ev["tapChip"], 0.5)
    sfx("asmr-haptic-light", ev["tapChip"] + 0.02, 0.35)
    ev["page"] = ev["tapChip"] + 0.16
    sfx("asmr-slide", ev["page"], 0.4)
    ots_end = nt(11) - 0.32
    shot("ots", t, ots_end)
    # 12 options: the phone out of his hand, forward, the band on the three buttons „სამ ღილაკს დაინახავს:"; each reason
    # cuts to its own picture (opt1..opt3, drawn over this shot) with its real card; back on the phone „მიზეზს აირჩევს
    # და ერთი დაჭერით გაგზავნის." the pick, the tap, „გაიგზავნა"
    t = ots_end
    ev["release"] = t
    sfx("asmr-haptic-soft", t + 0.08, 0.3)
    ev["n2a"] = nt(11)
    nsub(11, [("სამ ღილაკს დაინახავს:", None)])
    ev["band3"] = nt(11) + 0.3
    sfx("asmr-ui-tick", ev["band3"], 0.45)
    labels = ["„მანქანა გზას მიკეტავს“,", "„შუქები ანთია“,", "„მანქანასთან რაღაც ხდება“."]
    ins = []
    for m, k in enumerate((12, 13, 14)):
        nsub(k, [(labels[m], None)], "white" if m == 1 else "ink")
        s_ = nt(k) - 0.22
        e_ = (nt(k + 1) - 0.22) if m < 2 else (ne(14) + 0.32)
        ins.append((s_, e_))
    ev["opt"] = [s_ + 0.06 for s_, _ in ins]
    for m, (s_, e_) in enumerate(ins):
        ev[f"opt{m + 1}"] = s_
        sfx("cc0-card-slide", s_ + 0.05, 0.3)
        sfx("asmr-pop", s_ + 0.16, 0.4)
        sfx("asmr-haptic-light", s_ + 0.18, 0.35)
    sfx("cc0-wood-knock", ins[0][0] + 0.55, 0.35)
    sfx("cc0-switch", ins[1][0] + 0.32, 0.4)
    ind = kit("real-indicator-loop")
    sfx("ind", ins[2][0] + 0.2, 0.42, src=ind, dur=min(len(ind) / SR, ins[2][1] - ins[2][0] - 0.15))
    ev["n8"] = nt(15)
    nsub(15, [("მიზეზს აირჩევს", None), ("და ერთი დაჭერით გაგზავნის.", 14 / 40)])
    ev["sink"] = nt(15) - 0.12
    ev["pick"] = nt(15) - 0.12
    sfx("asmr-haptic-soft", ev["sink"] + 0.3, 0.3)
    sfx("asmr-ui-tick-soft", ev["sink"] + 0.35, 0.35)
    ev["tapRow"] = ndip(15, 23 / 40)
    sfx("asmr-tap", ev["tapRow"], 0.5)
    sfx("asmr-haptic-selection", ev["tapRow"] + 0.02, 0.4)
    ev["back"] = ev["tapRow"] + 0.15
    sfx("cc0-card-slide", ev["back"], 0.3)
    ev["landRow"] = ev["back"] + 0.36
    sfx("asmr-ui-tick-soft", ev["landRow"], 0.45)
    sfx("asmr-haptic-light", ev["landRow"] + 0.02, 0.35)
    ev["sent"] = max(ev["landRow"] + 0.1, ndip(15, 31 / 40))
    sfx("asmr-check", ev["sent"], 0.5)
    sfx("asmr-haptic-success", ev["sent"] + 0.02, 0.45)
    ev["away"] = ne(15) + 0.05
    opt_end = min(ne(15) + 0.3, nt(16) - 0.1)
    shot("options", t, opt_end)
    for m, (s_, e_) in enumerate(ins):
        shot(f"opt{m + 1}", s_, e_, insert=True)
    # 13 push: her phone back on the walnut at home, dark and quiet; the REAL VINARI push lands, one short buzz, and lifts
    # out readable: „შენ შეტყობინება მოგივა."
    t = opt_end
    ev["pushIn"] = t
    ev["push"] = nt(16) + 0.04
    sfx("asmr-notif", ev["push"], 0.5)
    sfx("buzz", ev["push"] + 0.03, 0.45, src=short)
    sfx("asmr-haptic-medium", ev["push"] + 0.05, 0.45)
    ev["n9"] = nt(16)
    nsub(16, [("შენ შეტყობინება მოგივა.", None)], "white")
    push_end = nt(17) - 0.18
    shot("push", t, push_end)
    # 14 walk: the evening street, her car under the lamp, the card behind its glass; she walks to it calm, keys in hand,
    # and the fob blinks its lights twice: „ზარი არა. შენს ნომერს ვერავინ გაიგებს."
    t = push_end
    ev["walk"] = t
    sfx("keys", t + 0.05, 0.4)
    sfx("steps", t + 0.25, 0.35)
    ev["n11"] = nt(17)
    nsub(17, [("ზარი არა.", None)], "white")
    nsub(18, [("შენს ნომერს ვერავინ გაიგებს.", None)], "white")
    walk_end = ne(18) + 0.25
    ev["fob"] = (t + walk_end) / 2
    sfx("real-fob-lock", ev["fob"], 0.32)
    shot("walk", t, walk_end)
    bed(city, t, walk_end + 0.1, 27, 0.15, 0.3)
    # 14b spam (v5): her phone on the walnut, the push from before on its glass; the same card tries again and again, each
    # repeat is struck out and falls away, the phone never buzzes: „სპამი არ იქნება: ერთი ბარათიდან ხშირად ვერავინ მოგწერს."
    t = walk_end
    ev["spamIn"] = t
    nsub(19, [("სპამი არ იქნება:", None)], "white")
    nsub(20, [("ერთი ბარათიდან ხშირად ვერავინ მოგწერს.", None)], "white")
    reps = [nt(19) + 0.2, ndip(20, 0.3), ndip(20, 0.66)]
    ev["spam"] = reps
    for r_ in reps:
        sfx("asmr-pop", r_, 0.28)
        sfx("asmr-strike", r_ + 0.3, 0.32)
    spam_end = ne(20) + 0.06
    shot("spam", t, spam_end)
    # 14c night (v5): the same phone in the small hours, the moon of the quiet hours on its lock screen; a push slides in
    # without a sound: „ღამით, თუ გინდა, უხმოდ მოვა." then the card's own switch, tapped off: „ბარათს კი ნებისმიერ დროს გათიშავ."
    t = spam_end
    ev["nightIn"] = t
    nsub(21, [("ღამით, თუ გინდა, უხმოდ მოვა.", None)], "white")
    nsub(22, [("ბარათს კი ნებისმიერ დროს გათიშავ.", None)], "white")
    ev["moon"] = nt(21) + 0.05
    sfx("asmr-shimmer", ev["moon"], 0.22)
    ev["quiet"] = ndip(21, 17 / 29)
    ev["offCard"] = nt(22) - 0.1
    sfx("cc0-card-slide", ev["offCard"], 0.3)
    ev["offTap"] = ndip(22, 25 / 33)
    sfx("asmr-tap", ev["offTap"], 0.45)
    sfx("cc0-switch", ev["offTap"] + 0.03, 0.4)
    sfx("asmr-haptic-light", ev["offTap"] + 0.04, 0.35)
    night_end = ne(22) + 0.5
    shot("night", t, night_end)
    bed(rt, ev["spamIn"], night_end + 0.05, 32, 0.15, 0.25)
    # 15 calm: the mirror again, her phone face down and silent: „აი, ახლა კი მშვიდად."
    t = night_end
    sfx("cc0-wood-tap", t + 0.0, 0.32)
    ev["w4"] = t + 0.4
    e = wline(4, ev["w4"], [("„აი, ახლა კი მშვიდად.“", None)], tone="white")
    calm_end = e + 0.45
    shot("calm", t, calm_end)
    # 16 the store and the end card: „ვინარი ჩაიწერე, ეპ სთორსა და გუგლ ფლეიზეა." over the REAL App Store page, the two
    # pills; the card: „ნომერიც შენთან რჩება და ნერვებიც." written word by word (the card is the line: no subtitle)
    t = calm_end
    ev["endIn"] = t
    sfx("asmr-whoomp", t + 0.05, 0.35)
    sfx("asmr-screen", t + 0.32, 0.3)
    T1 = t + 0.5
    endB = npiece(SPLIT + 1, 28, T1)
    ev["n2s"] = nt(23)
    sub("Vinari ჩაიწერე,", nt(23), ne(24))
    sub("App Store-სა და Google Play-ზეა.", nt(25), ne(26))
    ev["storeBand"] = nt(23) - 0.05
    sfx("asmr-ui-tick", ev["storeBand"], 0.4)
    ev["getTap"] = ne(24) - 0.12
    sfx("asmr-tap", ev["getTap"], 0.5)
    sfx("cc0-click", ev["getTap"], 0.35)
    sfx("asmr-haptic-light", ev["getTap"] + 0.02, 0.35)
    ev["pill1"] = nt(25) + 0.02
    ev["pill2"] = ndip(26, 3 / 16)
    sfx("cc0-click-soft", ev["pill1"], 0.45)
    sfx("asmr-haptic-light", ev["pill1"] + 0.02, 0.3)
    sfx("cc0-click-soft", ev["pill2"], 0.45)
    sfx("asmr-haptic-light", ev["pill2"] + 0.02, 0.3)
    ev["card"] = ne(26) + 0.25
    sfx("asmr-air", ev["card"], 0.35)
    ev["mark"] = ev["card"] + 0.22
    sfx("cc0-wood-tap", ev["mark"], 0.3)
    ev["n2t"] = nt(27)
    ev["tag"] = [nt(27), ndip(27, 8 / 20), ndip(27, 15 / 20), nt(28), ndip(28, 3 / 11)]
    ev["endHit"] = ne(28) + 0.05
    sfx("asmr-end", ev["endHit"], 0.4)
    total = ne(28) + 1.5
    shot("end", t, total)
    ev["narrA"] = [T0, endA]
    ev["narrB"] = [T1, endB]

    # ---- act 2's cues, the beds, the dip of the beds under words, the duck of the air bus ----
    flush()
    # the fx bus's ducks under her lines (applied after the bus's limiter, or the limiter would give the dB back)
    fxenv = np.ones(mx.n)
    for s_, e_, db in ducks:
        a_, b_ = int(s_ * SR), int(e_ * SR)
        r = int(0.06 * SR)
        fxenv[a_:b_] = 10 ** (db / 20)
        fxenv[a_ - r: a_] = np.linspace(1, 10 ** (db / 20), r)
        fxenv[b_: b_ + r] = np.linspace(10 ** (db / 20), 1, r)
    rt2 = kit("asmr-room")
    bed(rt2, ev["black"] + 0.4, total, 40, 0.5, 0.5)
    bed(rt, push_end - (push_end - ev["pushIn"]), push_end + 0.05, 31, 0.1, 0.15)
    bed(rt, night_end, calm_end + 0.2, 30, 0.2, 0.3)
    said = np.zeros(mx.n)
    for s_, e_ in mx.words:
        said[int(s_ * SR): int(e_ * SR)] = 1.0
    w = int(0.05 * SR)
    said = np.convolve(said, np.ones(w) / w, mode="same")
    dip = 1.0 - 0.3 * said
    w = int(0.08 * SR)
    duck = 10 ** (-8 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    vbus = compress(mx.voice, VO_LUFS - float(os.environ.get("QR_VTHR", "7")), ratio=float(os.environ.get("QR_VRATIO", "3.5")), attack=0.004, release=0.12)
    vpk = 20 * np.log10(np.percentile(np.abs(vbus[np.abs(vbus) > 1e-4]), 99.9))
    # v5.1 (the owner: "the effects a bit lower, the printer and the loud ones get in the voice's way"): the whole fx bus
    # 4 dB down and ducked 6 dB more under every spoken word
    wduck = 10 ** (-6 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    fxbus = limiter(mx.fx, vpk - float(os.environ.get("QR_FXUNDER", "-2")), look=0.001, release=0.03) * fxenv * 10 ** (-4 / 20) * wduck
    if os.environ.get("QR_DEBUG"):
        for sec in range(int(total) + 1):
            a_, b_ = int(sec * SR), int((sec + 1) * SR)
            row = [f"{sec:3d}s"]
            for nm, tr in (("voice", vbus), ("fx", fxbus), ("air", mx.air * duck)):
                v = peak100(tr[a_:b_]) - REF100
                row.append(f"{nm} {v:6.1f}" if v > -60 else f"{nm}    -  ")
            print("  ".join(row))
    out = vbus + fxbus + mx.air * duck * 10 ** (-3 / 20) + mx.bed * dip
    if os.environ.get("QR_DUMP"):
        np.savez(os.environ["QR_DUMP"], voice=vbus, fx=fxbus, air=mx.air * duck, bed=mx.bed * dip)
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    shots.sort(key=lambda s: (s["from"], 1 if s.get("insert") else 0))
    return out, {"total": round(total, 3), "fps": 30, "shots": shots, "events": ev, "subs": subs, "music": {}}


AIR = {
    "synth-whoosh": -14,
    "asmr-slide": -12,
    "cc0-card-slide": -11,
    "asmr-air": -12,
    "asmr-air-long": -12,
    "asmr-swell": -12,
    "asmr-whoomp": -12,
    "asmr-paper": -8,
    "asmr-sub": -8,
    "asmr-land": -6,
}


OWN = {"bleep", "printer", "keys", "steps", "mansteps", "city", "room"}

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


KNEE = float(os.environ.get("QR_KNEE", "0.8"))
TARGET = float(os.environ.get("QR_LUFS", "-11"))


def master(x, path, target=-10.0, tp=-1.0):
    """One gain to target LUFS, then the limiter only where the true peak needs it; aimed again by the miss."""
    # measured as the stereo file it ships as (dual mono reads +3 dB over the mono signal on a BS.1770 meter)
    tmp = path + ".m.wav"
    write_wav(tmp, np.stack([x, x], axis=1), bits=24)
    i, p = loudness(tmp)
    g = target - i + 1.5
    for attempt in range(8):
        # v3.1: a smooth look-ahead limiter takes the peaks first (5 ms, 120 ms release), the soft clip only rounds what
        # is left over its high knee, the true-peak limiter last
        y = limiter(soft_clip(limiter(x * 10 ** (g / 20), tp - 0.2, look=0.005, release=0.12), tp - 0.3, knee=KNEE), tp - 0.4)
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
    x, tl = build()
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:8s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})  frames {round(s['from'] * 30)}-{round(s['to'] * 30)}")
    # -1.8 dBTP in the wav: the AAC encode of the mp4 overshoots by about 0.7 dB (the navigator promo, measured)
    master(x, os.path.join(OUT, "mix.wav"), target=TARGET, tp=-1.8)


if __name__ == "__main__":
    main()

