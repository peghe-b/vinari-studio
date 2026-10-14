#!/usr/bin/env python3
"""The QR promo's timeline and its whole sound, built from the two measured Gemini takes (voices.py) and the sounds
(public/sfx, sfx_synth.py):

  src/qrpromo/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/qrpromo/mix.wav      the mastered film sound: two voices, the bleep, the sound design (gitignored)

    python3 src/qrpromo/build/plan.py

Both takes are kept as they were voiced and cut only at their breaths (the woman: 5 islands, the narrator: 14); nothing is
sped up. The swear: her take stops at „მომი-", and the bleep starts on that last sample. Master: -10 LUFS, true peak under
-1 dBTP, no music.
"""
import os
import sys

import numpy as np
from scipy import signal

from common import OUT, SFX, SR, STUDIO, ff, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

TL = os.path.join(STUDIO, "src", "qrpromo", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
NARR = read_wav(os.path.join(OUT, V["narrator"]["file"]))
WOM = read_wav(os.path.join(OUT, V["woman"]["file"]))


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
# 3 „ნომერი საქარე მინაზე რამ დამაწერინა?" 4 „აი, ახლა კი მშვიდად." (transcribed 2026-10-14)
WISL = islands(WOM)
if len(WISL) != 5:
    sys.exit(f"woman: expected 5 speech islands, found {len(WISL)}: {[(round(a, 2), round(b, 2)) for a, b in WISL]}")
# the narrator's 14 islands (transcribed): 0 საქართველოში პირველად 1 ვინარის ქიუარ ბარათი 2 ნომერი 3 აღარ გჭირდება
# 4 ბარათზე მხოლოდ კოდია 5 ვისაც რამე უნდა 6 დაასკანერებს 7 აპიც არ სჭირდება 8 მიზეზს აირჩევს და ერთი დაჭერით გაგზავნის
# 9 შენ 10 შეტყობინება მოგივა 11 შენი ნომრის გარეშე 12 ნომერი 13 შენთან რჩება
NISL = islands(NARR)
if len(NISL) != 14:
    sys.exit(f"narrator: expected 14 speech islands, found {len(NISL)}: {[(round(a, 2), round(b, 2)) for a, b in NISL]}")

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




def room_voice(x):
    """Her voice in a small warm room: a whisper of early reflections, never an echo."""
    return reverb(x, 0.22, 0.1, 5000, seed=7)


def bleep_x():
    return own("bleep")


def build():
    global REF100, VPEAK
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(NARR)) / 20)
    REF100 = peak100(NARR * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(NARR * ng), 99.95))
    wg = 10 ** ((VO_LUFS - lufs(WOM)) / 20)
    mx = Mix(70)
    cues = []  # (name, x, at, volume, closer)

    def sfx(name, at, volume=0.5, closer=0.0, src=None, dur=None):
        x = src if src is not None else (own(name) if name in OWN else kit(name))
        if dur is not None:
            n = int(dur * SR)
            x = x[:n].copy()
            f = min(len(x), int(0.06 * SR))
            x[-f:] *= np.linspace(1, 0, f)
        cues.append((name, x, at, volume, closer))

    def sub(text, s, e, tone="ink"):
        subs.append({"text": text, "start": round(s, 3), "end": round(e, 3), "tone": tone})

    def shot(name, s, e, **kw):
        shots.append({"id": name, "from": round(s, 3), "to": round(e, 3), **kw})

    def wline(i, at, chunks=None, tone="white", fx=room_voice):
        """Her island i, its first word on `at`; chunks: [(text, border)] with border None (start) or a letter fraction."""
        s0, e0 = WISL[i]
        x = cut(WOM, s0 - 0.04, e0 + 0.1) * wg
        if fx:
            x = fx(x)
        mx.put("voice", x, at - 0.04)
        mx.words.append((at, at + e0 - s0))
        if chunks:
            borders = [s0] + [dip_between(WOM, s0, e0, b) for _, b in chunks[1:]] + [e0]
            for k, (text, _) in enumerate(chunks):
                sub(text, at + borders[k] - s0, at + borders[k + 1] - s0, tone)
        return at + (e0 - s0)

    def nline(i, j, at, chunks=None, tone="ink"):
        """Narrator islands i..j, the first word on `at`; chunks: [(text, border)], border None | ('isl', k) | fraction."""
        s0, e0 = NISL[i][0], NISL[j][1]
        x = cut(NARR, s0 - 0.05, e0 + 0.12) * ng
        mx.put("voice", x, at - 0.05)
        mx.words.append((at, at + e0 - s0))
        if chunks:
            borders = [s0]
            for _, b in chunks[1:]:
                if isinstance(b, tuple) and b[0] == "isl":
                    borders.append(NISL[b[1]][0])
                elif isinstance(b, tuple) and b[0] == "in":
                    borders.append(dip_between(NARR, NISL[b[1]][0], NISL[b[1]][1], b[2]))
                else:
                    borders.append(dip_between(NARR, s0, e0, b))
            borders.append(e0)
            for k, (text, _) in enumerate(chunks):
                sub(text, at + borders[k] - s0, at + borders[k + 1] - s0, tone)
        return at + (e0 - s0)

    def nat(i, at_first, k):
        """the film time of narrator island k's start when island i starts at at_first"""
        return at_first + NISL[k][0] - NISL[i][0]

    # ============================================ ACT 1: the problem (her voice) ============================================
    # v2 (the owner's own words, 2026-10-14: "ესე რო იწყებოდეს: აუუუ რა ტვინი მომი..."): the film OPENS on the groan.
    # 1 mirror: evening, she primps at the mirror and her phone on the vanity is already buzzing; she throws her head back:
    # „აუუუ," and „რა ტვინი მომი-" (the bleep) by 3 s. Then the cause: the call, the flood. Then the root: the paper.
    buzz = kit("real-phone-buzz-desk")
    b1 = cut(buzz, 0.0, 1.06, 0.004, 0.08)
    ev["primp"] = 0.0
    ev["ring"] = 0.0
    sfx("buzz", 0.0, 0.5, src=b1[: int(1.0 * SR)])
    sfx("asmr-screen", 0.02, 0.3)
    sfx("buzz", 1.3, 0.42, src=b1[: int(0.8 * SR)])
    sfx("asmr-air", 0.25, 0.3)
    at = 0.35
    ev["groan"] = at
    e1 = wline(1, at)
    at2 = e1 + 0.15
    ev["tvini"] = at2
    e2 = wline(2, at2, fx=None)
    # the bleep starts on the take's last sample of „მომი-": the word never sounds whole
    ev["bleep"] = e2 - 0.02
    bl = bleep_x()
    blg = 10 ** ((VO_LUFS - 4 - lufs(bl)) / 20)
    mx.put("voice", bl * blg, ev["bleep"])
    mx.words.append((ev["bleep"], ev["bleep"] + len(bl) / SR))
    bleep_end = ev["bleep"] + len(bl) / SR
    # the line builds with the voice; the censored end pops on the bleep (Subs: `censor`)
    sub("„აუუუ,", ev["groan"], ev["tvini"], "white")
    sub("„აუუუ, რა ტვინი მომი", ev["tvini"], ev["bleep"], "white")
    subs.append({"text": "„აუუუ, რა ტვინი მომი#@%ეს…“", "start": round(ev["bleep"], 3), "end": round(bleep_end + 0.2, 3), "tone": "white", "censor": True})
    ev["callCut"] = bleep_end + 0.3
    shot("mirror", 0.0, ev["callCut"])
    # 1b the call: the phone from above on the wood, „უცნობი ნომერი"; she declines with a sigh
    t = ev["callCut"]
    sfx("buzz", t - 0.02, 0.55, src=b1)
    at = t + 0.3
    ev["w0"] = at
    e = wline(0, at, [("„ისევ უცნობი ნომერი...“", None)])
    ev["decline"] = e + 0.15
    sfx("buzz", ev["decline"] - 1.0, 0.5, src=b1[: int(1.0 * SR)])
    sfx("asmr-tap", ev["decline"], 0.5)
    sfx("cc0-click", ev["decline"], 0.4)
    sfx("asmr-haptic-light", ev["decline"] + 0.02, 0.4)
    call_end = ev["decline"] + 0.5
    shot("call", t, call_end)
    # 2 the flood: the lock screen fills; every banner lifts out big enough to read, then drops into the stack
    t = call_end
    ev["banners"] = [t + 0.15 + 0.82 * k for k in range(4)]
    short = kit("real-phone-buzz")
    for k, b in enumerate(ev["banners"]):
        sfx("asmr-notif", b, 0.42 if k < 3 else 0.32)
        sfx("buzz", b + 0.02, 0.5, src=short)
        sfx("asmr-pop", b + 0.12, 0.25)
    flood_end = ev["banners"][-1] + 0.85
    shot("flood", t, flood_end)
    # 3 the paper: from her window the camera flies down the house to her car under the street lamp; her number under
    # the wiper
    t = flood_end
    ev["fly"] = t
    sfx("asmr-air-long", t + 0.05, 0.4)
    ev["landed"] = t + 1.45
    at = t + 1.5
    ev["w3"] = at
    e = wline(3, at, [("„ნომერი საქარე მინაზე", None), ("რამ დამაწერინა?“", 21 / 37)])
    ev["loupe"] = at + 0.55
    sfx("asmr-pop", ev["loupe"], 0.4)
    sfx("asmr-paper", ev["loupe"] + 0.05, 0.4)
    # the dim to black: a slow sine over 1.5 s (the navigator promo's pause), then the black beat
    ev["dim"] = e + 0.4
    ev["black"] = ev["dim"] + 1.5
    shot("paper", t, ev["black"])
    # the act's beds: the warm room inside, the street outside; both die with the dim
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
        mx.put("bed", y * 10 ** ((REF100 - lvl_db - peak100(x)) / 20), s)

    bed(rt, 0.0, ev["callCut"] + 0.1, 30, 0.05, 0.2)
    bed(rt, ev["callCut"], ev["fly"] + 0.2, 33, 0.1, 0.25)
    bed(city, ev["fly"], ev["black"], 24, 0.4, 1.5)
    # every act-1 cue onto its track, then the hard silence of the black
    for name, x_, at_, vol, closer in cues:
        mx.put("fx", x_, at_, sfx_gain(x_, vol, closer))
    cues.clear()
    nb = int(ev["black"] * SR)
    for tr in (mx.fx, mx.bed):
        tail = tr[nb:].copy()
        tr[nb:] = 0.0
        k = min(len(tail), int(0.08 * SR))
        tr[nb: nb + k] = tail[:k] * np.linspace(1, 0, k)

    # ============================================ ACT 2: the answer (the narrator) ==========================================
    # 4 the reveal: black; a rim of light catches the phone rising; its screen wakes on the real QR card; on
    # „საქართველოში" the white opens out of the phone and the headline slams in; „ვინარის ქიუარ ბარათი." the card lifts out
    t = ev["black"]
    ev["rim"] = t + 0.5
    sfx("asmr-shimmer", ev["rim"], 0.35)
    sfx("asmr-swell", t + 0.9, 0.42)
    ev["wake"] = t + 1.25
    sfx("asmr-screen", ev["wake"], 0.4)
    at = t + 2.4
    ev["n0"] = at
    ev["whiteout"] = at - 0.8  # the white opens out of the phone over ~26 frames, full on the first slam
    ev["slam1"] = at
    ev["slam2"] = at + dip_between(NARR, NISL[0][0], NISL[0][1], 12 / 21) - NISL[0][0]
    e = nline(0, 0, at)
    sfx("asmr-land", ev["slam1"], 0.55)
    sfx("asmr-sub", ev["slam1"], 0.45)
    sfx("asmr-land", ev["slam2"], 0.6)
    ev["hairline"] = e + 0.05
    sfx("asmr-pencil-short", ev["hairline"], 0.35)
    at = e + 0.62
    ev["n1"] = at
    e = nline(1, 1, at, [("Vinari-ს QR ბარათი.", None)])
    ev["lift"] = at + dip_between(NARR, NISL[1][0], NISL[1][1], 12 / 19) - NISL[1][0]
    # a tap on the real screen's „ამობეჭდვა და გაზიარება": the card comes out of the phone (printed)
    ev["printTap"] = ev["lift"] - 0.42
    sfx("asmr-tap", ev["printTap"], 0.45)
    sfx("asmr-haptic-light", ev["printTap"] + 0.02, 0.35)
    sfx("asmr-slide", ev["lift"] - 0.05, 0.4)
    sfx("app-landed", ev["lift"] + 0.25, 0.35)
    reveal_end = e + 0.65
    shot("reveal", t, reveal_end)
    # 5 the card: printed on white, the old paper struck out and gone, the card stands behind the windscreen
    t = reveal_end
    ev["carIn"] = t + 0.05
    sfx("asmr-swell", t + 0.02, 0.3)
    at = t + 0.45
    ev["n2"] = at
    e = nline(2, 3, at, [("ნომერი აღარ გჭირდება.", None)])
    ev["oldNote"] = at - 0.1
    sfx("cc0-card-slide", ev["oldNote"], 0.35)
    ev["strike"] = nat(2, at, 3) + 0.1
    sfx("asmr-strike", ev["strike"], 0.45)
    ev["noteGone"] = e + 0.05
    sfx("asmr-paper", ev["noteGone"], 0.3)
    ev["flyCard"] = max(ev["noteGone"] + 0.15, e + 0.15)
    sfx("synth-whoosh", ev["flyCard"], 0.35)
    ev["cardIn"] = ev["flyCard"] + 0.7
    sfx("cc0-card-place", ev["cardIn"], 0.5)
    at = max(e + 0.45, ev["cardIn"] - 0.25)
    ev["n4"] = at
    e = nline(4, 4, at, [("ბარათზე მხოლოდ კოდია.", None)])
    ev["cardLoupe"] = at + 0.35
    sfx("asmr-pop", ev["cardLoupe"], 0.4)
    card_end = e + 0.5
    shot("card", t, card_end)
    # 6 the scan: a passer-by raises a phone; the camera finds the card; the yellow frame locks; vinari.ge
    t = card_end
    ev["raise"] = t
    sfx("cc0-cloth", t + 0.05, 0.4)
    at = t + 0.45
    ev["n5"] = at
    e = nline(5, 6, at, [("ვისაც რამე უნდა,", None), ("დაასკანერებს.", ("isl", 6))])
    ev["lock"] = nat(5, at, 6) + 0.15
    sfx("asmr-camera", ev["lock"] - 0.25, 0.3)
    sfx("asmr-ui-tick", ev["lock"], 0.5)
    sfx("asmr-haptic-success", ev["lock"] + 0.02, 0.45)
    ev["chip"] = ev["lock"] + 0.35
    sfx("asmr-pop", ev["chip"], 0.45)
    at = e + 0.4
    ev["n7"] = at
    e = nline(7, 7, at, [("აპიც არ სჭირდება.", None)])
    ev["tapChip"] = at + 0.15
    sfx("asmr-tap", ev["tapChip"], 0.5)
    ev["page"] = ev["tapChip"] + 0.2
    sfx("asmr-slide", ev["page"], 0.4)
    scan_end = e + 0.35
    shot("scan", t, scan_end)
    # 7 the reason: the real page; a tap on „მანქანა გზას მიკეტავს"; sent
    t = scan_end
    at = t + 0.3
    ev["n8"] = at
    e = nline(8, 8, at, [("მიზეზს აირჩევს", None), ("და ერთი დაჭერით გაგზავნის.", 14 / 41)])
    ev["tapRow"] = subs[-1]["start"] - 0.15
    sfx("asmr-tap", ev["tapRow"], 0.5)
    sfx("asmr-haptic-selection", ev["tapRow"] + 0.02, 0.4)
    ev["rowLift"] = ev["tapRow"] + 0.12
    sfx("asmr-slide", ev["rowLift"], 0.35)
    ev["sent"] = e - 0.45
    sfx("asmr-check", ev["sent"], 0.5)
    sfx("asmr-haptic-success", ev["sent"] + 0.02, 0.45)
    ev["away"] = e + 0.05
    sfx("synth-whoosh", ev["away"], 0.3)
    reason_end = e + 0.4
    shot("reason", t, reason_end)
    # 8 the push: her phone; the real VINARI push; she walks out calmly, keys in hand
    t = reason_end
    at = t + 0.35
    ev["n9"] = at
    ev["push"] = at + 0.05
    sfx("asmr-notif", ev["push"], 0.5)
    sfx("buzz", ev["push"] + 0.03, 0.45, src=short)
    sfx("asmr-haptic-medium", ev["push"] + 0.05, 0.45)
    e = nline(9, 10, at, [("შენ შეტყობინება მოგივა.", None)])
    at = e + 0.5
    ev["n11"] = at
    ev["walk"] = at - 0.25
    sfx("keys", ev["walk"], 0.42)
    sfx("steps", ev["walk"] + 0.35, 0.35)
    e = nline(11, 11, at, [("შენი ნომრის გარეშე.", None)])
    ev["fob"] = e + 0.1
    sfx("real-fob-lock", ev["fob"], 0.32)
    push_end = e + 1.0
    shot("push", t, push_end)
    # 9 calm: the mirror again, the phone face down and silent
    t = push_end
    sfx("cc0-wood-tap", t + 0.0, 0.32)
    at = t + 0.5
    ev["w4"] = at
    e = wline(4, at, [("„აი, ახლა კი მშვიდად.“", None)], tone="white")
    calm_end = e + 0.55
    shot("calm", t, calm_end)
    # 10 the end card (white): the mark, „ნომერი შენთან რჩება." (said, not subtitled: the card is the line)
    t = calm_end
    ev["endIn"] = t
    sfx("asmr-whoomp", t + 0.05, 0.35)
    at = t + 0.4
    ev["n12"] = at
    e = nline(12, 13, at)
    ev["tag"] = at
    ev["tag2"] = nat(12, at, 13)
    ev["tag3"] = ev["tag2"] + dip_between(NARR, NISL[13][0], NISL[13][1], 6 / 12) - NISL[13][0]
    ev["endHit"] = e + 0.05
    sfx("asmr-end", ev["endHit"], 0.4)
    total = e + 1.8
    shot("end", t, total)

    # ---- act 2's cues, the room under it, the dip of the beds under words ------------------------------------------------
    for name, x, at, vol, closer in cues:
        mx.put("fx", x, at, sfx_gain(x, vol, closer))
    rt2 = kit("asmr-room")
    bed(rt2, ev["black"] + 0.4, total, 40, 0.5, 0.5)
    bed(rt, push_end, calm_end + 0.2, 30, 0.2, 0.3)
    dip = np.ones(mx.n)
    for s_, e_ in mx.words:
        dip[int(s_ * SR): int(e_ * SR)] = 0.7
    dip = np.convolve(dip, np.ones(int(0.05 * SR)) / int(0.05 * SR), mode="same")
    vbus = compress(mx.voice, VO_LUFS - 3, ratio=2.5)
    out = vbus + mx.fx + mx.bed * dip
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    return out, {"total": round(total, 3), "fps": 30, "shots": shots, "events": ev, "subs": subs, "music": {}}


OWN = {"bleep", "printer", "keys", "steps", "city", "room"}

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
    x, tl = build()
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:8s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})  frames {round(s['from'] * 30)}-{round(s['to'] * 30)}")
    # -1.8 dBTP in the wav: the AAC encode of the mp4 overshoots by about 0.7 dB (the navigator promo, measured)
    master(x, os.path.join(OUT, "mix.wav"), tp=-1.8)


if __name__ == "__main__":
    main()
