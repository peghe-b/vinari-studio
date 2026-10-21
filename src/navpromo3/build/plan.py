#!/usr/bin/env python3
"""The navigator + CarPlay promo's timeline and its whole sound, built from the measured takes (voices.py) and the sounds
(public/vo/navpromo3/sfx from sfx_synth.py, public/sfx):

  src/navpromo3/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/navpromo3/mix.wav      the mastered film sound: the voices, the real navigator clips, the sound design (gitignored)

    python3 src/navpromo3/build/plan.py

The owner's brief of 2026-10-21: a new problem (a glamorous woman driving to dinner at night, a foreign phone GPS that talks
feet and mangles the street name), the black beat, the phone in from the SIDE, the Georgian navigator, CarPlay („what you asked
for is here") and how to connect it, her calm drive and the arrival. The narrator is ONE continuous Algieba take, laid down
whole in pieces at its sentence ends only, never re-spaced inside a piece. The characters' takes are cut only at their
breaths. The foreign GPS is heard through a phone's speaker (muffled under the seat), the app's real clips clean in the white
world and through the car's speakers in the car. Master: aimed at -11 LUFS with at most 3 dB of limiting, true peak under
-1.8 dBTP, no music, no beds (no room tone, no hiss, no rain bed): the voices and quiet purposeful cues on silence, every cue
ducked under the words.
"""
import os
import sys

import numpy as np
from scipy import signal

from common import OUT, SFX, SR, STUDIO, ff, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

TL = os.path.join(STUDIO, "src", "navpromo3", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
NA = read_wav(os.path.join(OUT, V["narr"]["file"]))
HE = read_wav(os.path.join(OUT, V["her"]["file"]))
NV = read_wav(os.path.join(OUT, V["nav"]["file"]))
CL = {k: read_wav(os.path.join(OUT, v["file"])) for k, v in V["clips"].items()}


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


def islands(a, min_len=0.15, rel=-38.0, blip=0.15):
    on, off = speech_span(a, -40)
    ps = [p for p in pauses(a, min_len, rel) if p[0] > on + 0.05 and p[1] < off - 0.05]
    out, s = [], on
    for p0, p1 in ps:
        out.append((s, p0))
        s = p1
    out.append((s, off))
    # a click or a breath of under `blip` seconds is no word (the narrator's take has one at 24.9 s)
    return [x for x in out if x[1] - x[0] >= blip]


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


# the takes' islands (listen-checked 2026-10-21 island by island, build/islands_check.py: one request per take)
# NAV_EN (8): 0 In five hundred feet,  1 turn left  2 onto  3 Tchav...  4 Tchavtchavadze  5 Avenue.  6 Recalculating.
#   7 Make a U-turn when possible.
# HER (6): 0 ფუტი?!  1 ფუტი რამდენი მეტრია?!  2 აუ, ისევ გამოვტოვე.  3 სად დავტრიალდე, აქ?!  4 ამდენი წვალება ერთი
#   ვახშმისთვის...  5 აი, ასე.
# NARR (22, its one 0.07 s click dropped): 0 ამ წვალებას ერთი რამე ჯობია:  1 ნავიგატორი,  2 რომელიც ქართულად გელაპარაკება.
#   3 ვინარში ნელსონი ან ალისა გზას ქართულად გეტყვიან,  4 მეტრებით.  5 წრეზე გასასვლელს დაგითვლის,  6 ზოლს მიგითითებს და
#   დატრიალებასაც გარკვევით გეტყვის.  7 კამერას, ბორცვს და რკინიგზის გადასასვლელს წინასწარ გეტყვის.  8 ინტერნეტიც არ
#   სჭირდება:  9 რუკაც და ხმაც ტელეფონშია.  10 და რასაც ითხოვდით,  11 უკვე აქაა:  12 ვინარი ქარფლეიზეცაა.  13 აიფონი მანქანას
#   შეაერთე,  14 კაბელით ან უსადენოდ, და ეკრანზე ვინარის ხატულას დააჭირე.  15 „სად"-ში აირჩიე, საით მიდიხარ,  16 და
#   „წავედით".  17 ტელეფონს ხელი აღარ სჭირდება:  18 რუკა მანქანის ეკრანზეა,  19 ხმა კი მანქანის დინამიკებში.
#   20 პირველი მგზავრობა საჩუქარია.  21 ვინარი ეპ სთორსა და გუგლ ფლეიზეა.
NI = islands(NA)
HI = islands(HE)
VI = islands(NV)
for nm, isl, n in (("narrator", NI, 22), ("her", HI, 6), ("nav", VI, 8)):
    if len(isl) != n:
        sys.exit(f"{nm}: expected {n} speech islands, found {len(isl)}: {[(round(a, 2), round(b, 2)) for a, b in isl]}")


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


def phone_voice(x, room=0.08, size=0.16):
    """A voice from a phone's speaker: band-limited 300-3400 Hz, the small speaker's honk near 1.8 kHz, a little drive and
    compression, a slight room. No line hiss (the owner: no noise of any kind)."""
    y = signal.sosfilt(sos_f("high", 300, 4), x)
    y = signal.sosfilt(sos_f("low", 3400, 4), y)
    b, a = signal.iirpeak(1800, 1.4, fs=SR)
    y = y + 0.45 * signal.lfilter(b, a, y)
    pk = np.max(np.abs(y)) + 1e-9
    y = np.tanh(y / pk * 1.8) / np.tanh(1.8) * pk
    w = int(0.01 * SR)
    lvl = 10 * np.log10(np.convolve(y * y, np.ones(w) / w, mode="same") + 1e-12)
    thr = 20 * np.log10(pk) - 14
    g = 10 ** (-np.maximum(0, lvl - thr) * (1 - 1 / 3) / 20)
    g = signal.sosfilt(sos_f("low", 30, 1), g)
    return reverb(y * g, size, room, 3000, seed=13).astype(np.float32)


def under_seat(x):
    """the phone's speaker from under the seat: the phone colour, the top dulled by the seat's foam, a small dark box"""
    y = phone_voice(x, 0.0, 0.1)
    y = signal.sosfilt(sos_f("low", 1500, 2), y) * 1.6
    return reverb(y, 0.14, 0.22, 1800, seed=21).astype(np.float32)


def car_voice(x):
    """a voice inside the car: very close, a whisper of the cabin"""
    return reverb(x, 0.12, 0.06, 5000, seed=9).astype(np.float32)


def car_speakers(x):
    """the app's clip through the car's own speakers: full range but a touch boxed, the cabin round it"""
    y = signal.sosfilt(sos_f("high", 120, 2), x)
    y = signal.sosfilt(sos_f("low", 9000, 2), y)
    return reverb(y, 0.16, 0.14, 4200, seed=17).astype(np.float32)


def street_voice(x):
    """her last line on the pavement: dry, a short reflection off the facade"""
    return reverb(x, 0.25, 0.08, 4000, seed=5, pre=0.012).astype(np.float32)


def lufs(x):
    tmp = os.path.join(OUT, ".lufs.wav")
    write_wav(tmp, x)
    i, _ = loudness(tmp)
    os.remove(tmp)
    return i


def peak100(x):
    w = int(0.1 * SR)
    if len(x) < w:
        return 20 * np.log10(np.sqrt(np.mean(x * x)) + 1e-9)
    c = np.convolve(x * x, np.ones(w) / w, mode="valid")
    return 10 * np.log10(c.max() + 1e-12)


class Mix:
    def __init__(self, sec):
        self.n = int(sec * SR) + SR
        self.voice = np.zeros(self.n)
        self.fx = np.zeros(self.n)
        self.air = np.zeros(self.n)  # the whooshes, slides and swells, ducked under words
        self.words = []  # (start, end) of speech

    def put(self, track, x, at, gain=1.0):
        s = int(round(at * SR))
        if s < 0:
            x, s = x[-s:], 0
        e = min(self.n, s + len(x))
        getattr(self, track)[s:e] += x[: e - s] * gain


VO_LUFS = -18.0
REF100 = None
VPEAK = None
REFM = None  # the narrator's reference on each meter (meters())

# v1.2 (the art director measured the bloom's shimmer 1.8 dB OVER the narrator on a K-weighted 50 ms meter, and the heels,
# the thud and the end hit only 3 to 3.4 dB under on a speech-band 100 ms meter, while the flat 100 ms meter said 9 dB): a
# cue is now measured on three meters, the K-weighted 50 ms peak (BS.1770's filter: the ear's own weighting of hiss), the
# speech-band 100 ms peak and the flat 100 ms peak (sub-bass), and set by the strictest; the cue's level in the FINAL mix is
# checked against the voice on all three (report_cues), at least 7 dB under everywhere
KB1 = ([1.53512485958697, -2.69169618940638, 1.19839281085285], [1.0, -1.69065929318241, 0.73248077421585])
KB2 = ([1.0, -2.0, 1.0], [1.0, -1.99004745483398, 0.99007225036621])
BAND = signal.butter(2, [250, 4500], btype="band", fs=SR, output="sos")


def win_levels(x, sec):
    w = max(1, int(sec * SR))
    if len(x) < w:
        x = np.pad(x, (0, w - len(x)))
    c = np.convolve(x.astype(np.float64) ** 2, np.ones(w) / w, mode="valid")
    return 10 * np.log10(c + 1e-12)


def meters(x):
    """the windowed levels of a signal on the three meters (dB arrays)"""
    k = signal.lfilter(*KB2, signal.lfilter(*KB1, x))
    return {"k50": win_levels(k, 0.05), "b100": win_levels(signal.sosfilt(BAND, x), 0.1), "u100": win_levels(x, 0.1)}


def voice_ref(x):
    """the voice's reference on each meter: the 95th percentile of its windows within 30 dB of its loudest"""
    out = {}
    for name, lv in meters(x).items():
        lv = lv[lv > lv.max() - 30]
        out[name] = float(np.percentile(lv, 95))
    return out


# the least a cue may sit under the voice BEFORE its bus (the fx bus takes 4 dB more, the air bus 3 dB): 7 dB in the mix
PRE_MIN = {"fx": 3.0, "air": 4.0}


def sfx_gain(x, volume=0.5, closer=0.0, bus="fx"):
    """A cue's gain: its loudest window at (narrator - 9 dB) for volume 0.5 on the strictest of the three meters, scaled by
    the volume, never closer than PRE_MIN under the voice before its bus."""
    margin = max(PRE_MIN[bus], 9 - 20 * np.log10(max(volume, 1e-3) / 0.5) - closer)
    m = meters(x)
    g = min(10 ** ((REFM[k] - margin - float(m[k].max())) / 20) for k in REFM)
    pk = np.max(np.abs(x)) * g + 1e-9
    return g * min(1.0, 10 ** ((VPEAK - 4) / 20) / pk)


def build():
    global REF100, VPEAK, REFM
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(NA)) / 20)
    REF100 = peak100(NA * ng)
    REFM = voice_ref(NA * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(NA * ng), 99.95))
    hg = 10 ** ((VO_LUFS - lufs(HE)) / 20)
    vg = 10 ** ((VO_LUFS - lufs(NV)) / 20)
    cg = {k: 10 ** ((VO_LUFS - lufs(np.tile(a, 2))) / 20) for k, a in CL.items()}
    mx = Mix(110)
    cues = []
    placed = []

    def sfx(name, at, volume=0.5, closer=0.0, src=None, dur=None):
        x = src if src is not None else (own(name) if name in OWN else kit(name))
        if dur is not None:
            n = int(dur * SR)
            x = x[:n].copy()
            f = min(len(x), int(0.08 * SR))
            x[-f:] *= np.linspace(1, 0, f)
        cues.append((name, x, at, volume, closer))

    def flush():
        for name, x_, at_, vol, closer in cues:
            if name in AIR:
                g_ = sfx_gain(x_, vol, closer + AIR[name], "air")
                mx.put("air", x_, at_, g_)
            else:
                g_ = sfx_gain(x_, vol, closer, "fx")
                mx.put("fx", x_, at_, g_)
            placed.append((name, at_, len(x_) / SR, "air" if name in AIR else "fx"))
        cues.clear()

    def sub(text, s, e, tone="white", after=None, **kw):
        if after is not None:
            s = max(s, after)
        subs.append({"text": text, "start": round(s, 3), "end": round(e, 3), "tone": tone, **kw})

    def shot(name, s, e, **kw):
        shots.append({"id": name, "from": round(s, 3), "to": round(e, 3), **kw})

    def piece(take, isl, gain, i, j, at, fx=None, gain_db=0.0):
        """islands i..j of a character's take as one piece, island i's first word on `at`; returns {k: (start, end)}"""
        s0, e0 = isl[i][0], isl[j][1]
        x = cut(take, s0 - 0.04, e0 + 0.1) * gain * 10 ** (gain_db / 20)
        if fx:
            x = fx(x)
        mx.put("voice", x, at - 0.04)
        out = {}
        for k in range(i, j + 1):
            out[k] = (at + isl[k][0] - s0, at + isl[k][1] - s0)
            mx.words.append(out[k])
        return out

    def clip(name, at, fx=None, gain_db=0.0):
        """a real navigator clip, its first word on `at`; returns (start, end) of its speech"""
        meta = V["clips"][name]
        x = CL[name] * cg[name] * 10 ** (gain_db / 20)
        if fx:
            x = fx(x)
        mx.put("voice", x, at - meta["on"])
        se = (at, at - meta["on"] + meta["off"])
        mx.words.append(se)
        return se

    def kdip(take, isl, k, frac, base):
        return base + dip_between(take, isl[k][0], isl[k][1], frac) - isl[k][0]

    # ============================================ ACT 1: the problem (night Tbilisi after rain) ============================================
    # 1 lap (the hook, frame 0): close from the passenger seat: her profile lit cold by the phone low in her lap, red nails, the
    # city sliding past behind her; the foreign GPS, stiff: „In five hundred feet, turn left onto"
    n0 = piece(NV, VI, vg, 0, 5, 0.22, fx=phone_voice, gain_db=-0.5)
    ev["prompt"] = 0.04
    sfx("asmr-ui-tick-soft", ev["prompt"], 0.2)
    sub("In 500 feet, turn left onto", n0[0][0], n0[2][1], "white", phone=True, small=True)
    lap_end = n0[3][0] - 0.12
    # v1.2 (the art director: open tight on her hand and cut sooner): the hook is tight on the hand and the glowing phone in
    # her lap, the camera tilting up to her lit face; the cut to the medium profile on „turn left"
    hook_end = n0[1][0] - 0.06
    shot("hook", 0.0, hook_end)
    shot("lap", hook_end, lap_end)
    # 2 screen: the phone in her hand, close: the cheap GPS's banner, the street name stuck („Tchav..."), then mangled
    sub("Tchav... Tchavtchavadze Avenue.", n0[3][0], n0[5][1], "white", phone=True, small=True)
    ev["stuck"] = n0[3][0]
    ev["name"] = n0[4][0]
    screen_end = n0[5][1] + 0.16
    shot("screen", lap_end, screen_end)
    # 3 face: her profile, close: the eyes from the road down to the phone, a brow up: „ფუტი?!"
    h0 = piece(HE, HI, hg, 0, 0, screen_end + 0.14, fx=car_voice)
    sub("„ფუტი?!“", h0[0][0], h0[0][1], "white")
    face_end = h0[0][1] + 0.12
    shot("face", screen_end, face_end)
    # 4 feet: the dark; „500 ft" lands big and white, then „= ? მ" beside it: „ფუტი რამდენი მეტრია?!"
    h1 = piece(HE, HI, hg, 1, 1, face_end + 0.14, fx=car_voice)
    sub("„ფუტი რამდენი მეტრია?!“", h1[1][0], h1[1][1], "white")
    ev["ft"] = face_end + 0.02
    sfx("asmr-land", ev["ft"], 0.34)
    ev["q"] = kdip(HE, HI, 1, 0.45, h1[1][0])
    sfx("asmr-pop", ev["q"], 0.3)
    feet_end = h1[1][1] + 0.3
    shot("feet", face_end, feet_end)
    # 5 sign: through the windscreen, the wet avenue at night; the street sign „ჭავჭავაძის გამზ." slides past on the left with
    # its turn; her indicator still ticking; „Recalculating."
    t = feet_end
    ev["indicator"] = t + 0.05
    sfx("real-indicator", ev["indicator"], 0.16, dur=1.5)
    ev["signPass"] = t + 1.35
    sfx("asmr-air", ev["signPass"] - 0.25, 0.22)
    n6 = piece(NV, VI, vg, 6, 6, t + 1.15, fx=phone_voice, gain_db=-0.5)
    sub("Recalculating.", n6[6][0], n6[6][1], "white", phone=True, small=True)
    sign_end = n6[6][1] + 0.25
    shot("sign", t, sign_end)
    # 6 missed: outside, the pearl saloon slides past the junction on the wet street, its lights in the puddles: „აუ, ისევ
    # გამოვტოვე."
    t = sign_end
    sfx("real-pass-by", t + 0.05, 0.18, dur=2.2)
    h2 = piece(HE, HI, hg, 2, 2, t + 0.32, fx=car_voice)
    sub("„აუ, ისევ გამოვტოვე.“", h2[2][0], h2[2][1], "white")
    missed_end = h2[2][1] + 0.2
    shot("missed", t, missed_end)
    # 7 drop: her lap, close: the phone slips from her fingers and falls into the dark
    t = missed_end
    ev["slip"] = t + 0.18
    sfx("cc0-cloth", ev["slip"], 0.2)
    ev["thud"] = t + 0.78
    drop_end = t + 0.9
    shot("drop", t, drop_end)
    # 8 floor: from above into the footwell: the phone face up between her heels by the pedals, still lit; from under the seat,
    # muffled: „Make a U-turn when possible."; her voice from above: „სად დავტრიალდე, აქ?!"
    sfx("cc0-leather-drop", ev["thud"], 0.2)
    sfx("asmr-haptic-soft", ev["thud"] + 0.02, 0.2)
    n7 = piece(NV, VI, vg, 7, 7, drop_end + 0.3, fx=under_seat, gain_db=1.5)
    sub("Make a U-turn when possible.", n7[7][0], n7[7][1], "white", phone=True, small=True)
    h3 = piece(HE, HI, hg, 3, 3, n7[7][1] + 0.22, fx=car_voice)
    sub("„სად დავტრიალდე, აქ?!“", h3[3][0], h3[3][1], "white")
    ev["reach"] = h3[3][0] - 0.2
    floor_end = h3[3][1] + 0.18
    shot("floor", drop_end, floor_end)
    # 9 sigh: wider, her profile against the windscreen and the night city on the hills; her hand goes to her hair:
    # „ამდენი წვალება ერთი ვახშმისთვის..."
    t = floor_end
    h4 = piece(HE, HI, hg, 4, 4, t + 0.3, fx=car_voice)
    b4 = kdip(HE, HI, 4, 14 / 34, h4[4][0])
    sub("„ამდენი წვალება", h4[4][0], b4, "white")
    sub("ერთი ვახშმისთვის...“", b4, h4[4][1], "white")
    ev["hair"] = t + 0.1
    sfx("cc0-cloth", ev["hair"] + 0.1, 0.18)
    sigh_end = h4[4][1] + 0.42
    shot("sigh", t, sigh_end)
    flush()
    # a hard cut to black: everything stops on the cut (no tail runs into the silence)
    nb = int(sigh_end * SR)
    for tr in (mx.fx, mx.air):
        tail = tr[nb:].copy()
        tr[nb:] = 0.0
        k = min(len(tail), int(0.05 * SR))
        tr[nb: nb + k] = tail[:k] * np.linspace(1, 0, k)
    black_end = sigh_end + 0.7
    shot("black", sigh_end, black_end)

    # ============================================ the narrator ============================================
    base = {}

    def npiece(i, j, at):
        s0, e0 = NI[i][0], NI[j][1]
        mx.put("voice", cut(NA, s0 - 0.05, e0 + 0.12) * ng, at - 0.05)
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
        a, s0 = base[k]
        return a + dip_between(NA, NI[k][0], NI[k][1], frac) - s0

    def nsub(k, parts, tone="ink", after=None, **kw):
        bs = [nt(k)] + [ndip(k, f) for _, f in parts[1:]] + [ne(k)]
        for m, (text, _) in enumerate(parts):
            sub(text, bs[m], bs[m + 1], tone, after=after if m == 0 else None, **kw)

    pieces = []
    # ---- ACT 2: the reveal: after the black beat the big phone comes in from the RIGHT, its navigator lit; the white opens out of
    # its screen on „ნავიგატორი" ----
    t = black_end
    ev["slide"] = t
    sfx("asmr-slide", ev["slide"] - 0.05, 0.3)
    sfx("asmr-whoomp", ev["slide"] + 0.42, 0.24)
    TA = t + 1.15
    pieces.append((TA, npiece(0, 2, TA)))
    sub("ამ წვალებას ერთი რამე ჯობია:", nt(0), ne(0), "white")
    ev["bloom"] = nt(1) - 0.32
    # v1.2 (the art director: the shimmer is nearly all above 4 kHz, a loud hiss on a K-weighted meter): a soft low swell
    sfx("asmr-swell", ev["bloom"] - 0.1, 0.2)
    ev["kword"] = ndip(2, 8 / 31)
    b2 = ndip(2, 8 / 31)
    sub("ნავიგატორი, რომელიც", nt(1), b2)
    sub("ქართულად გელაპარაკება.", b2, ne(2))
    ev["word"] = [nt(1), b2]
    reveal_end = ne(2) + 0.38
    shot("reveal", t, reveal_end)

    # ---- ACT 3: what it does ----
    # 10 voices: the app's real voice choice (19-nav-streets-offer) in a whole phone; on „ნელსონი" and „ალისა" their own rows
    # lift out of the screen; on „მეტრებით" the turn card (600 მ) of the drive screen; then Nelson himself, the app's clip
    TB = reveal_end + 0.25
    pieces.append((TB, npiece(3, 4, TB)))
    b3 = ndip(3, 25 / 50)
    # v1.2 (the art director: muted viewers lost the subject): the first half is subtitled too
    sub("ვინარში ნელსონი ან ალისა", nt(3), b3)
    sub("გზას ქართულად გეტყვიან,", b3, ne(3))
    sub("მეტრებით.", nt(4), ne(4))
    ev["nelson"] = ndip(3, 8 / 50)
    ev["alisa"] = ndip(3, 19 / 50)
    sfx("cc0-card-slide", ev["nelson"], 0.24)
    sfx("cc0-card-slide", ev["alisa"], 0.24)
    ev["lift"] = nt(4) - 0.05
    sfx("cc0-card-slide", ev["lift"], 0.26)
    c1 = clip("nelson-600", ne(4) + 0.4)
    ev["nelsonSays"] = c1[0]
    ev["nelsonEnd"] = c1[1]
    sub("„600 მეტრში მარჯვნივ მოუხვიე.“", c1[0], c1[1], "ink", phone=True)
    voices_end = c1[1] + 0.3
    nel0 = nt(4) - 0.12
    shot("voices", reveal_end, nel0)
    # 10b nelson: the lifted turn card big on the white, Nelson's name chip and his voice's wave under it
    shot("nelson", nel0, voices_end)
    # 11 round: a roundabout from above, the route in the app's black, the exits counted: 1, 2; then Nelson's own line (v1.2:
    # the art director: the real clip proves the feature)
    TC = voices_end + 0.2
    pieces.append((TC, npiece(5, 5, TC)))
    sub("წრეზე გასასვლელს დაგითვლის,", nt(5), ne(5))
    c_r = clip("nelson-round", ne(5) + 0.35)
    sub("„წრეზე მეორე გასასვლელით გადი.“", c_r[0], c_r[1], "ink", phone=True)
    ev["roundSays"] = c_r[0]
    ev["exits"] = [nt(5) + 0.6, c_r[0] + 0.55]
    for x_ in ev["exits"]:
        sfx("asmr-pop", x_, 0.24)
    round_end = c_r[1] + 0.3
    shot("round", voices_end, round_end)
    # 12 lane: the real lane screen (230 მ, მარჯვენა მხარე დაიჭირე): its lane arrows lift out: „ზოლს მიგითითებს"; held at
    # least 2 s (v1.2)
    TL6 = round_end + 0.5
    probe = NI[6][0] + dip_between(NA, NI[6][0], NI[6][1], 16 / 52) - NI[6][0]
    TL6 = max(TL6, round_end + 2.15 - (probe - NI[6][0]) - 0.25)
    pieces.append((TL6, npiece(6, 6, TL6)))
    b6 = ndip(6, 16 / 52)
    sub("ზოლს მიგითითებს", nt(6), b6)
    ev["lanes"] = round_end + 0.35
    sfx("cc0-card-slide", ev["lanes"], 0.24)
    lane_end = b6 + 0.22
    shot("lane", round_end, lane_end)
    # 13 turn: from above, a wide avenue: the route takes the left side and turns round: „და დატრიალებასაც გარკვევით
    # გეტყვის.", then Alice herself: „ახლა მარცხენა მხარე დაიკავე და დატრიალდი."
    sub("და დატრიალებასაც გარკვევით გეტყვის.", b6, ne(6))
    ev["uturn"] = b6 + 0.3
    sfx("asmr-air", ev["uturn"], 0.2)
    c2 = clip("alice-turnaround", ne(6) + 0.38)
    b_al = c2[0] + dip_between(CL["alice-turnaround"], V["clips"]["alice-turnaround"]["on"], V["clips"]["alice-turnaround"]["off"], 27 / 42) - V["clips"]["alice-turnaround"]["on"]
    sub("„ახლა მარცხენა მხარე დაიკავე", c2[0], b_al, "ink", phone=True)
    sub("და დატრიალდი.“", b_al, c2[1], "ink", phone=True)
    ev["aliceSays"] = c2[0]
    ev["aliceEnd"] = c2[1]
    turn_end = c2[1] + 0.3
    shot("turn", lane_end, turn_end)
    # 14 alerts: the road ahead in the white world, the camera driving on: the speed camera, the bump, the rail crossing stand up
    # beside it one by one; then Nelson: „სამას მეტრში სიჩქარის კამერაა." as the camera's badge comes up close (v1.2)
    TD = turn_end + 0.2
    pieces.append((TD, npiece(7, 7, TD)))
    b7 = ndip(7, 29 / 60)
    sub("კამერას, ბორცვს და რკინიგზის", nt(7), b7)
    sub("გადასასვლელს წინასწარ გეტყვის.", b7, ne(7))
    ev["badges"] = [nt(7) + 0.05, ndip(7, 9 / 60), ndip(7, 16 / 60)]
    for x_ in ev["badges"]:
        sfx("asmr-pop", x_, 0.26)
    c_c = clip("nelson-camera", ne(7) + 0.35)
    sub("„300 მეტრში სიჩქარის კამერაა.“", c_c[0], c_c[1], "ink", phone=True)
    ev["cameraSays"] = c_c[0]
    ev["cameraEnd"] = c_c[1]
    alerts_end = c_c[1] + 0.32
    shot("alerts", turn_end, alerts_end)
    # 15 offline: the mountains; the signal bars run out one by one, the route keeps going on the phone; „რუკა" and „ხმა"
    # settle into the phone
    TE = alerts_end + 0.2
    pieces.append((TE, npiece(8, 9, TE)))
    sub("ინტერნეტიც არ სჭირდება:", nt(8), ne(8))
    sub("რუკაც და ხმაც ტელეფონშია.", nt(9), ne(9))
    ev["bars"] = [nt(8) + 0.1 + 0.2 * i for i in range(4)]
    for x_ in ev["bars"]:
        sfx("asmr-ui-tick-soft", x_, 0.18)
    ev["inPhone"] = [nt(9) + 0.05, ndip(9, 8 / 26)]
    for x_ in ev["inPhone"]:
        sfx("asmr-pop", x_ + 0.3, 0.24)
    offline_end = ne(9) + 0.4
    shot("offline", alerts_end, offline_end)

    # ---- ACT 4: CarPlay (the car at night) ----
    # 16 cpwake: the cabin from the passenger seat, the dash and its wide screen asleep; „და რასაც ითხოვდით," the screen wakes on
    # CarPlay's home; „ვინარი CarPlay-ზეცაა." its icon breathes
    TF = offline_end + 0.35
    pieces.append((TF, npiece(10, 12, TF)))
    sub("და რასაც ითხოვდით,", nt(10), ne(10), "white")
    sub("უკვე აქაა:", nt(11), ne(11), "white")
    sub("VINARI CarPlay-ზეცაა.", nt(12), ne(12), "white")
    ev["wake"] = nt(11) - 0.1
    sfx("asmr-screen", ev["wake"], 0.3)
    ev["icon"] = nt(12) + 0.1
    sfx("asmr-swell", ev["icon"] - 0.1, 0.16)
    cpwake_end = ne(12) + 0.3
    shot("cpwake", offline_end, cpwake_end)
    # 17 plug: the console close: the iPhone, the cable clicks into it („კაბელით"), then the cable gone and the wireless waves
    # („ან უსადენოდ")
    TG = cpwake_end + 0.2
    pieces.append((TG, npiece(13, 14, TG)))
    b14 = ndip(14, 21 / 57)
    b14b = ndip(14, 39 / 57)
    sub("iPhone მანქანას შეაერთე,", nt(13), ne(13), "white")
    sub("კაბელით ან უსადენოდ,", nt(14), b14, "white")
    ev["plugIn"] = ndip(14, 6 / 57) - 0.05
    sfx("cc0-latch", ev["plugIn"], 0.32)
    sfx("asmr-haptic-light", ev["plugIn"] + 0.02, 0.22)
    ev["wireless"] = ndip(14, 13 / 57)
    sfx("asmr-ui-tick-roll", ev["wireless"], 0.16)
    plug_end = b14 - 0.04
    shot("plug", cpwake_end, plug_end)
    # 18 tapicon: the car screen close: her hand (red nails) taps the VINARI icon and the screen goes to „სად?"
    sub("და ეკრანზე ვინარის", b14, b14b, "white")
    sub("ხატულას დააჭირე.", b14b, ne(14), "white")
    ev["tapIcon"] = ne(14) - 0.25
    sfx("asmr-tap", ev["tapIcon"], 0.36)
    sfx("asmr-haptic-selection", ev["tapIcon"] + 0.02, 0.2)
    tapicon_end = ne(14) + 0.32
    shot("tapicon", plug_end, tapicon_end)
    # 19 where: „სად?": the finger on „სახლი", the route's preview, „წავედით", the guidance
    TH = tapicon_end + 0.18
    pieces.append((TH, npiece(15, 16, TH)))
    b15 = ndip(15, 16 / 31)
    sub("„სად?“-ში აირჩიე,", nt(15), b15, "white")
    sub("საით მიდიხარ,", b15, ne(15), "white")
    sub("და „წავედით“.", nt(16), ne(16), "white")
    ev["tapHome"] = b15 + 0.1
    sfx("asmr-tap", ev["tapHome"], 0.34)
    ev["preview"] = ev["tapHome"] + 0.3
    ev["tapGo"] = nt(16) + 0.32
    sfx("asmr-tap", ev["tapGo"], 0.36)
    sfx("asmr-haptic-light", ev["tapGo"] + 0.02, 0.2)
    ev["guide"] = ev["tapGo"] + 0.32
    sfx("asmr-whoomp", ev["guide"], 0.18)
    where_end = ne(16) + 0.45
    shot("where", tapicon_end, where_end)
    # 20 hands: wider: the phone asleep on the console's pad, untouched; the map on the car's screen; the door's speaker breathes
    TI = where_end + 0.2
    pieces.append((TI, npiece(17, 19, TI)))
    sub("ტელეფონს ხელი აღარ სჭირდება:", nt(17), ne(17), "white")
    sub("რუკა მანქანის ეკრანზეა,", nt(18), ne(18), "white")
    sub("ხმა კი მანქანის დინამიკებში.", nt(19), ne(19), "white")
    ev["speakers"] = nt(19) + 0.05
    hands_end = ne(19) + 0.35
    sp0 = nt(18) - 0.12
    shot("hands", where_end, sp0)
    # 20b speakers: the screen's map close at an angle, the door's speaker grille breathing with the voice
    shot("speakers", sp0, hands_end)

    # ---- ACT 5: the payoff ----
    # 21 calm: the same woman, calm and smiling, both hands on the wheel, the phone away; the CarPlay map glowing on her dash;
    # Alice through the car: „ახლა მარჯვნივ მოუხვიე."
    t = hands_end
    # v1.2 (the art director: Alice said „ახლა მარჯვნივ მოუხვიე" while the car's screen showed 1,6 km, keep right): her line is
    # now the one the real capture under it calls for (f18-12: 290 მ, მარჯვენა მხარე დაიჭირე)
    c3 = clip("alice-keep-right", t + 0.35, fx=car_speakers, gain_db=0.5)
    sub("„300 მეტრში მარჯვნივ დაიჭირე.“", c3[0], c3[1], "white", phone=True)
    ev["calmTurn"] = c3[1] - 0.2
    sfx("real-indicator", c3[1] - 0.6, 0.12, dur=1.2)
    calm_end = c3[1] + 0.55
    shot("calm", t, calm_end)
    # 22 arrived: the car's screen close: „მოვედით", Alice: „მოვედით."
    t = calm_end
    ev["arrive"] = t + 0.15
    c4 = clip("alice-arrived", t + 0.35, fx=car_speakers, gain_db=0.5)
    sub("„მოვედით.“", c4[0], c4[1], "white", phone=True)
    arrived_end = c4[1] + 0.5
    shot("arrived", t, arrived_end)
    # 23 out: the restaurant's warm windows on the wet street; the car door shuts, she walks to the door in heels, the car locks
    # behind her: „აი, ასე."
    t = arrived_end
    ev["door"] = t + 0.12
    sfx("real-door", ev["door"], 0.22, dur=1.0)
    ev["steps"] = [t + 0.62 + 0.42 * i for i in range(5)]
    for i, x_ in enumerate(ev["steps"]):
        sfx("heel", x_, 0.13, src=own(f"heel{i % 3}"))
    h5 = piece(HE, HI, hg, 5, 5, t + 1.0, fx=street_voice)
    sub("„აი, ასე.“", h5[5][0], h5[5][1], "white")
    ev["lock"] = h5[5][1] + 0.3
    sfx("real-fob-lock", ev["lock"], 0.11, dur=0.9)
    out_end = ev["lock"] + 0.75
    shot("out", t, out_end)
    # 24 end: the white; the mark and the wordmark, „ქართული ნავიგატორი. / ახლა CarPlay-ზეც."; „პირველი მგზავრობა საჩუქარია.";
    # the two store pills land on their names (the pills are the store line: no subtitle under them); the quiet note
    TJ = out_end + 0.55
    pieces.append((TJ, npiece(20, 21, TJ)))
    t = out_end
    sfx("asmr-whoomp", t + 0.05, 0.28)
    ev["mark"] = t + 0.12
    sfx("cc0-wood-tap", ev["mark"], 0.24)
    ev["tag"] = [t + 0.45, t + 0.8]
    sub("პირველი მგზავრობა საჩუქარია.", nt(20), ne(20), "ink")
    # v1.2 (the art director: the brief subtitles every Georgian line; the QR and diagnostics promos subtitled the store line)
    sub("ვინარი App Store-სა და Google Play-ზეა.", nt(21), ne(21), "ink")
    ev["pill1"] = ndip(21, 7 / 34) + 0.02
    ev["pill2"] = ndip(21, 22 / 34)
    sfx("cc0-click-soft", ev["pill1"], 0.34)
    sfx("cc0-click-soft", ev["pill2"], 0.34)
    ev["note"] = ne(21) + 0.2
    ev["endHit"] = ne(21) + 0.1
    sfx("asmr-end", ev["endHit"], 0.16)
    total = ne(21) + 1.6
    shot("end", t, total)
    ev["pieces"] = [[round(a, 3), round(b, 3)] for a, b in pieces]

    flush()
    said = np.zeros(mx.n)
    for s_, e_ in mx.words:
        said[int(s_ * SR): int(e_ * SR)] = 1.0
    w = int(0.05 * SR)
    said = np.convolve(said, np.ones(w) / w, mode="same")
    w = int(0.08 * SR)
    duck = 10 ** (-8 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    vbus = compress(mx.voice, VO_LUFS - 7, ratio=3.5, attack=0.004, release=0.12)
    vpk = 20 * np.log10(np.percentile(np.abs(vbus[np.abs(vbus) > 1e-4]), 99.9))
    # the fx bus 4 dB down and ducked 6 dB more under every spoken word (the QR promo's v5.1 balance)
    wduck = 10 ** (-6 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    fxbus = limiter(mx.fx, vpk + 2, look=0.001, release=0.03) * 10 ** (-4 / 20) * wduck
    if os.environ.get("NAV3_DEBUG"):
        for sec in range(int(total) + 1):
            a_, b_ = int(sec * SR), int((sec + 1) * SR)
            row = [f"{sec:3d}s"]
            for nm, tr in (("voice", vbus), ("fx", fxbus), ("air", mx.air * duck)):
                v = peak100(tr[a_:b_]) - REF100
                row.append(f"{nm} {v:6.1f}" if v > -60 else f"{nm}    -  ")
            print("  ".join(row))
    efx = fxbus + mx.air * duck * 10 ** (-3 / 20)
    report_cues(vbus, efx, placed)
    out = vbus + efx
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    shots.sort(key=lambda s: s["from"])
    # the subtitle's colour follows the picture under it: white over the dark shots, ink over the white world
    for sb in subs:
        under = [s_ for s_ in shots if s_["from"] <= sb["start"] + 0.07 < s_["to"]]
        if under:
            sb["tone"] = "white" if under[-1]["id"] in DARK else "ink"
    return out, {"total": round(total, 3), "fps": 30, "shots": shots, "events": ev, "subs": subs, "music": {}}


def report_cues(vbus, efx, placed):
    """every cue's loudest moment in the FINAL mix (all the effects together in its window) against the voices, on the three
    meters; a cue under 7 dB is flagged"""
    ref = voice_ref(vbus)
    mv = meters(efx)
    worst = 99.0
    rows = []
    for name, at, dur, bus in placed:
        row = []
        for k, sec in (("k50", 0.05), ("b100", 0.1), ("u100", 0.1)):
            a = max(0, int((at - 0.02) * SR))
            b = max(a + 1, int((at + dur) * SR) - int(sec * SR))
            seg = mv[k][a:b]
            if len(seg) == 0:
                continue
            row.append((ref[k] - float(seg.max()), k))
        m, k = min(row)
        worst = min(worst, m)
        rows.append((m, k, name, at))
    for m, k, name, at in sorted(rows)[:8]:
        print(f"  cue {name:22s} at {at:6.2f}s: {m:5.1f} dB under the voice ({k}){'  <-- under 7 dB' if m < 7 else ''}")
    print(f"cues: {len(placed)}, the closest {worst:.1f} dB under the voice (K-weighted 50 ms, speech band 100 ms, flat 100 ms)")


AIR = {
    "synth-whoosh": -14,
    "asmr-slide": -12,
    "cc0-card-slide": -11,
    "asmr-air": -12,
    "asmr-air-long": -12,
    "asmr-swell": -12,
    "asmr-whoomp": -12,
    "asmr-sub": -8,
    "asmr-land": -6,
}

OWN = {"heel"}
DARK = {"hook", "lap", "screen", "face", "feet", "sign", "missed", "drop", "floor", "sigh", "black", "cpwake", "plug", "tapicon", "where", "hands", "speakers", "calm", "arrived", "out"}


def compress(x, thr_db, ratio=3.0, attack=0.005, release=0.1, win=0.01):
    w = int(win * SR)
    lvl = 10 * np.log10(np.convolve(x * x, np.ones(w) / w, mode="same") + 1e-12)
    over = np.maximum(0.0, lvl - thr_db)
    want = -over * (1 - 1 / ratio)
    ka, kr = np.exp(-1.0 / (attack * SR)), np.exp(-1.0 / (release * SR))
    g = np.empty_like(want)
    cur = 0.0
    for i, v in enumerate(want.tolist()):
        cur = v + (cur - v) * (ka if v < cur else kr)
        g[i] = cur
    return x * 10 ** (g / 20)


def limiter(x, ceiling_db, look=0.002, release=0.06):
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
    up = signal.resample_poly(x, 4, 1)
    c = 10 ** (ceil_db / 20)
    k = knee * c
    a = np.abs(up)
    y = np.where(a <= k, up, np.sign(up) * (k + (c - k) * np.tanh((a - k) / (c - k))))
    return signal.resample_poly(y, 1, 4)[: len(x)]


def master(x, path, target=-11.0, tp=-1.8):
    """One gain to target LUFS, then the limiter only where the true peak needs it; aimed again by the miss."""
    tmp = path + ".m.wav"
    write_wav(tmp, np.stack([x, x], axis=1), bits=24)
    i, p = loudness(tmp)
    # never more than 3 dB of gain past the straight line to the target: the rest would only be the limiter squashing words
    g0 = target - i
    g = g0 + 1.5
    for attempt in range(8):
        y = limiter(soft_clip(limiter(x * 10 ** (g / 20), tp - 0.2, look=0.005, release=0.12), tp - 0.3, knee=0.8), tp - 0.4)
        write_wav(tmp, np.stack([y, y], axis=1), bits=24)
        i2, p2 = loudness(tmp)
        print(f"master {os.path.basename(path)}: {i:.2f} -> {i2:.2f} LUFS, true peak {p2:.2f} dBTP (gain {g:+.2f} dB)")
        if (abs(i2 - target) <= 0.15 or g >= g0 + 3.0) and p2 <= tp:
            break
        g = min(g0 + 3.0, g + (target - i2) * 1.1)
    write_wav(path, np.stack([y, y], axis=1), bits=24)
    os.remove(tmp)
    return i2, p2


def main():
    x, tl = build()
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:10s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})  frames {round(s['from'] * 30)}-{round(s['to'] * 30)}")
    if "--no-audio" in sys.argv:
        return
    master(x, os.path.join(OUT, "mix.wav"), target=-11.0, tp=-1.8)


if __name__ == "__main__":
    main()
