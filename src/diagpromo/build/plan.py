#!/usr/bin/env python3
"""The diagnostics promo's timeline and its whole sound, built from the measured Gemini takes (voices.py) and the sounds
(public/vo/diagpromo/sfx from sfx_synth.py, public/sfx):

  src/diagpromo/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/diagpromo/mix.wav      the mastered film sound: the voices, the bleep, the sound design (gitignored)

    python3 src/diagpromo/build/plan.py

v2 (the owner, 2026-10-15: chew the theme, a real fight as the hook, the connection step by step): the narrator is ONE
continuous Algieba take (voices.py NARR), laid down whole in pieces at its big beats only (the problem; the reveal and how
it connects; what it tells you; the diagnosis; the end), never re-spaced inside a piece, never cut into sentences; the
take's one slip (it said the ending's three lines early, islands 25..28) falls between two pieces and is never laid. The
characters' takes are cut only at their breaths. The owner's hook line is a NEW take whose heavy word was never sent to the
voice: a mild stand-in of its length carries the rhythm and is cut out whole, the bleep laid exactly in its place. The
mechanic's call is heard through a phone's speaker. Master: aimed at -11 LUFS with at most 3 dB of limiting, true peak
under -1.8 dBTP in the wav, no music, no beds (no room tone, no hiss): the voices and quiet purposeful cues on silence,
every cue ducked under the words. No pencil or pen sound anywhere.
"""
import os
import sys

import numpy as np
from scipy import signal

from common import OUT, SFX, SR, STUDIO, ff, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

TL = os.path.join(STUDIO, "src", "diagpromo", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
NA = read_wav(os.path.join(OUT, V["narr"]["file"]))
ME = read_wav(os.path.join(OUT, V["mechanic"]["file"]))
OW = read_wav(os.path.join(OUT, V["owner"]["file"]))
OW2 = read_wav(os.path.join(OUT, V["owner2"]["file"]))
ME2 = read_wav(os.path.join(OUT, V["mech2"]["file"]))


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


# the takes' islands (the v2 takes listen-checked 2026-10-15 in one request, public/vo/diagpromo/islands-check-v2.txt; the
# v1 takes transcribed 2026-10-15)
# narrator v2 (40): 0 ჩეკი მხოლოდ იმას გეუბნება, რომ რაღაც ცუდადაა.  1 რა,  2 ამას არ გეუბნება.  3 და გამოცნობაში ფულს შენ იხდი.
#  4 საქართველოში პირველად:  5 მანქანის დიაგნოსტიკა და OBD სკანერი,  6 ქართულად.  7 მანქანა ყოველთვის გეუბნება, რა სჭირს.
#  8 უბრალოდ, აქამდე არავინ გითარგმნიდა.  9 მანქანის კომპიუტერი ხარვეზებს კოდებად იმახსოვრებს.  10 საჭის ქვეშ პატარა ბუდეა,
#  11 OBD.  12 თითქმის ყველა თანამედროვე მანქანას აქვს.  13 ნებისმიერ იაფ ELM327 ადაპტერს ჩადებ,
#  14 აპში სკანირებას დააჭერ და ვინარი თვითონ იპოვის.  15 P0300  16 შენთვის არაფერს ნიშნავს.  17 ვინარი ქართულად გეტყვის:
#  18 ცილინდრის გამოტოვებაა.  19 რამდენად სერიოზულია და შეგიძლია თუ არა იარო.  20 მანქანას ყიდულობ?
#  21 ვინარი შეამოწმებს, ჩეკი ახლახან ხომ არ წაუშლიათ  22 და VIN-კოდი საბუთს ემთხვევა თუ არა.  23 ადაპტერი არ გაქვს?
#  24 მანქანის ხმა ჩაწერე.  25..28 THE TTS's SLIP: it jumped ahead and said the ending's three lines here („და ეს მხოლოდ
#  დასაწყისია. გაემზადე მომავლისთვის. შენი მანქანა ქართულად ალაპარაკდა.") before going back; they are never laid down
#  (the same lines are said again in their place, 33, 35, 38-39), the take is laid in pieces round them
#  29 გეტყვის, რამდენად სასწრაფოა,  30 რა შეიძლება იყოს და ხელოსანს ზუსტად რა უთხრა.  31 მანქანაში თუ არ ერკვევი,
#  32 აღარც დაგჭირდება.  33 და ეს მხოლოდ დასაწყისია:  34 ვინარი ყოველ განახლებაზე ახალს მატებს.  35 გაემზადე მომავლისთვის.
#  36 ვინარი ჩაიწერე,  37 App Store-სა და Google Play-ზეა.  38 შენი მანქანა  39 ქართულად ალაპარაკდა.
# owner v2 (3): 0 ათას ორასი ლარი რა [ჯანდაბას: the stand-in, cut out, the bleep in its place] მივეცი?!  1 ეს რაღა აინთო ახლა?
#  2 ისევ?!
# mechanic v2 (8): 0 მე რა ვიცი, ძმაო,  1 მანქანაა!  2 ესეც კარგია,  3 კარგიააა.  4 აბა,  5 (a breath, never laid)
#  6 ახლა სხვა ნაწილი ვნახოთ,  7 მოიყვანე.
# mechanic v1 (10): 0 აბა...  1 სანთლებიც შესაცვლელია,  2 კოჭაც,  3 ესეც...  (4..7 v1's call, unused)  8 ჰო.  9 კი, ბატონო.
# owner v1 (7): (0..2 v1's bleeped line, unused)  3 ნახე:  4 პე-ნული-სამასი,  5 ცილინდრი ტოვებს.  6 ჯერ სანთლები შეამოწმე.
NI = islands(NA)
MI = islands(ME)
OI = islands(OW)
O2 = islands(OW2)
M2 = islands(ME2)
for nm, isl, n in (("narrator", NI, 40), ("mechanic", MI, 10), ("owner", OI, 7), ("owner2", O2, 3), ("mech2", M2, 8)):
    if len(isl) != n:
        sys.exit(f"{nm}: expected {n} speech islands, found {len(isl)}: {[(round(a, 2), round(b, 2)) for a, b in isl]}")
# the stand-in word in the owner's shout (measured on its spectrogram, 2026-10-15: the closure before its „ჯ" at 1.795 s, its
# final „ს" gone by 2.452 s; „რა" before it ends 1.78, „მივეცი" after it starts 2.46): cut out whole, the bleep laid there
STANDIN = (1.795, 2.452)
if not (O2[0][0] < STANDIN[0] < STANDIN[1] < O2[0][1]):
    sys.exit("owner2: the stand-in word is not inside the shout's island (a new take? measure it again)")


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


def phone_voice(x, room=0.1, size=0.2):
    """A voice heard from a phone's speaker: band-limited 300-3400 Hz, the small speaker's honk near 1.8 kHz, a little drive
    and compression, a slight room. No line hiss (the owner: no noise of any kind)."""
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


def garage_voice(x):
    """a voice in the small tiled workshop: a few close reflections, never an echo"""
    return reverb(x, 0.3, 0.12, 4200, seed=7).astype(np.float32)


def car_voice(x):
    """a voice inside the car: very close, a whisper of the cabin"""
    return reverb(x, 0.12, 0.06, 5000, seed=9).astype(np.float32)


def pitch_down(x, semis):
    """the take a little lower (the owner's shout read high, about 215 Hz): ffmpeg's asetrate lowers the pitch and the
    formants, atempo restores the timing (WSOLA), so every word keeps its place"""
    if semis <= 0:
        return x
    r = 2 ** (-semis / 12)
    tmp = os.path.join(OUT, ".pitch-in.wav")
    tmp2 = os.path.join(OUT, ".pitch-out.wav")
    write_wav(tmp, x, bits=24)
    ff("-i", tmp, "-af", f"asetrate={SR * r:.3f},aresample={SR},atempo={1 / r:.6f}", "-ac", "1", "-c:a", "pcm_s24le", tmp2)
    y = read_wav(tmp2)
    os.remove(tmp)
    os.remove(tmp2)
    n = len(x)
    y = y[:n] if len(y) >= n else np.concatenate([y, np.zeros(n - len(y), np.float32)])
    return y.astype(np.float32)


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


def sfx_gain(x, volume=0.5, closer=0.0):
    """A cue's gain: its loudest 100 ms at (narrator - 9 dB) for volume 0.5, scaled by the volume, never closer than 4 dB
    under the voice."""
    want = REF100 - 9 + 20 * np.log10(max(volume, 1e-3) / 0.5) + closer
    want = min(want, REF100 - 4)
    g = 10 ** ((want - peak100(x)) / 20)
    pk = np.max(np.abs(x)) * g + 1e-9
    return g * min(1.0, 10 ** ((VPEAK - 4) / 20) / pk)


def bleep_tone(sec):
    """the TV censor tone, exactly `sec` long: a clean 1 kHz sine, 4 ms edges (sfx_synth.py's, cut to the stand-in's length)"""
    t = np.arange(int(sec * SR)) / SR
    x = np.sin(2 * np.pi * 1000 * t)
    n = int(0.004 * SR)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return (x * 10 ** (-3 / 20)).astype(np.float32)


def build():
    global REF100, VPEAK
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(NA)) / 20)
    REF100 = peak100(NA * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(NA * ng), 99.95))
    mg = 10 ** ((VO_LUFS - lufs(ME)) / 20)
    og = 10 ** ((VO_LUFS - lufs(OW)) / 20)
    o2g = 10 ** ((VO_LUFS - lufs(OW2)) / 20)
    m2g = 10 ** ((VO_LUFS - lufs(ME2)) / 20)
    mx = Mix(140)
    cues = []

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
                mx.put("air", x_, at_, sfx_gain(x_, vol, closer + AIR[name]))
            else:
                mx.put("fx", x_, at_, sfx_gain(x_, vol, closer))
        cues.clear()

    def sub(text, s, e, tone="white", **kw):
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

    phone = lambda x: phone_voice(x, 0.08, 0.16)

    # ============================================ ACT 1: the problem ============================================
    # 1 fight (the hook, frame 1): the night garage, the bonnet up under the work lamp; the owner steps in on the mechanic, arms
    # thrown wide: „ათას ორასი ლარი რა [BLEEP] მივეცი?!" (the stand-in word cut out whole, the bleep exactly in its place)
    o_at = 0.12
    s0, e0 = O2[0]
    shout = cut(OW2, s0 - 0.04, e0 + 0.1) * o2g * 10 ** (1.5 / 20)
    a_, b_ = int((STANDIN[0] - (s0 - 0.04)) * SR), int((STANDIN[1] - (s0 - 0.04)) * SR)
    k_ = int(0.004 * SR)
    shout[a_ - k_: a_] *= np.linspace(1, 0, k_)
    shout[a_:b_] = 0.0
    shout[b_: b_ + k_] *= np.linspace(0, 1, k_)
    shout = garage_voice(pitch_down(shout, 1.0))
    mx.put("voice", shout, o_at - 0.04)
    o_end = o_at + e0 - s0
    ev["bleep"] = o_at + STANDIN[0] - s0
    bl = bleep_tone(STANDIN[1] - STANDIN[0])
    mx.put("voice", bl * 10 ** ((VO_LUFS - 3 - lufs(np.tile(bl, 3))) / 20), ev["bleep"])
    mx.words.append((o_at, o_end))
    ev["step"] = o_at + 0.1
    ev["throw"] = ev["bleep"] - 0.12
    sfx("cc0-leather", ev["step"] + 0.05, 0.3)
    sfx("cc0-cloth", ev["throw"], 0.3)
    sub("„1200 ლარი რა", o_at, ev["bleep"], "white")
    sub("დ#@%ს მივეცი?!“", ev["bleep"], o_end, "white", censor=True)
    fight_end = o_end + 0.08
    shot("fight", 0.0, fight_end)
    # 2 retort: the mechanic backs off, the wrench up, a shrug: „მე რა ვიცი, ძმაო, მანქანაა!" (a punch-in on „მანქანაა!")
    r0 = piece(ME2, M2, m2g, 0, 1, fight_end + 0.16, fx=garage_voice, gain_db=1.0)
    ev["r0"] = r0[0][0]
    ev["r1"] = r0[1][0]
    sub("„მე რა ვიცი, ძმაო,", r0[0][0], r0[0][1], "white")
    sub("მანქანაა!“", r0[1][0], r0[1][1], "white")
    sfx("cc0-chip", ev["r0"] + 0.25, 0.22)  # the wrench knocks the bench as he backs off
    sfx("cc0-cloth", ev["r1"] - 0.05, 0.28)
    retort_end = r0[1][1] + 0.22
    shot("retort", fight_end, retort_end)
    # 3 rewind: a clean rewind to how it started; the small kicker „ერთი კვირით ადრე" (white)
    t = retort_end
    ev["rew"] = t
    sfx("asmr-air-long", t + 0.02, 0.32)
    sfx("asmr-ui-tick-roll", t + 0.1, 0.18)
    rewind_end = t + 0.95
    shot("rewind", t, rewind_end)
    # 4 drive: the evening avenue, the graphite crossover gliding through the lamps (a soft pass-by)
    t = rewind_end
    sfx("real-pass-by", t + 0.0, 0.2, dur=1.6)
    drive_end = t + 1.45
    shot("drive", t, drive_end)
    # 5 pop: the cluster close at an angle: the amber check light pops on (the chime); „ეს რაღა აინთო ახლა?"
    t = drive_end
    ev["pop"] = t + 0.3
    sfx("chime", ev["pop"], 0.32)
    o1 = piece(OW2, O2, o2g, 1, 1, ev["pop"] + 0.62, fx=car_voice, gain_db=0.0)
    ev["o1"] = o1[1][0]
    sub("„ეს რაღა აინთო ახლა?“", o1[1][0], o1[1][1], "white")
    pop_end = o1[1][1] + 0.12
    shot("pop", t, pop_end)
    # (the search on his phone, (c) of the brief, is left out: the brief's script already runs past 100 s at the narrator's
    # own tempo, so the optional beat goes first)
    # 7 bay: the garage again, the side of the open bay: the mechanic bent deep into the engine, the owner by the door:
    # „აბა... სანთლებიც შესაცვლელია,"
    t = pop_end
    m0 = piece(ME, MI, mg, 0, 0, t + 0.3, fx=garage_voice)
    ev["m0"] = m0[0][0]
    sub("„აბა...", m0[0][0], m0[0][1], "white")
    sfx("cc0-cloth", t + 0.15, 0.22)
    m1 = piece(ME, MI, mg, 1, 3, m0[0][1] + 0.42, fx=garage_voice)
    ev["m1"] = m1[1][0]
    ev["m2"] = m1[2][0]
    ev["m3"] = m1[3][0]
    sub("სანთლებიც შესაცვლელია,", m1[1][0], m1[1][1], "white")
    bay_end = m1[1][1] + 0.08
    shot("bay", t, bay_end)
    # 8 coils: the engine close from above: the wrench taps along the coils („კოჭაც,"), then waves at a hose („ესეც...")
    sub("კოჭაც, ესეც...“", m1[2][0], m1[3][1], "white")
    ev["taps"] = [m1[2][0] + 0.02, m1[2][0] + 0.17, m1[2][0] + 0.32]
    for x_ in ev["taps"]:
        sfx("cc0-chip", x_, 0.2)
    coils_end = m1[3][1] + 0.2
    shot("coils", bay_end, coils_end)
    # 9 bill: the payment terminal on the counter: the lines tick in, the total rolls up to 1 200 ₾, his card taps, paid
    t = coils_end
    ev["bill"] = [t + 0.12 + 0.2 * i for i in range(4)]
    for x_ in ev["bill"]:
        sfx("asmr-tick-fine", x_, 0.3)
    ev["total"] = ev["bill"][-1] + 0.26
    sfx("asmr-count-roll", ev["total"] - 0.05, 0.2, dur=0.3)
    sfx("cc0-click-soft", ev["total"] + 0.25, 0.32)
    ev["cardTap"] = ev["total"] + 0.62
    sfx("asmr-tap", ev["cardTap"], 0.3)
    ev["paid"] = ev["cardTap"] + 0.22
    sfx("app-landed", ev["paid"], 0.28)
    bill_end = ev["paid"] + 0.42
    shot("bill", t, bill_end)
    # 10 morning: the start button pressed close, the cluster wakes soft behind it; the amber check comes back on
    t = bill_end
    ev["press"] = t + 0.2
    sfx("cc0-click", ev["press"], 0.3)
    sfx("start", ev["press"] + 0.12, 0.38, src=kit("real-start"), dur=1.6)
    ev["checkBack"] = ev["press"] + 0.95
    sfx("chime", ev["checkBack"], 0.32)
    morning_end = ev["checkBack"] + 0.55
    shot("morning", t, morning_end)
    # 11 again: through the windscreen from outside, his forehead sinks to the wheel: „ისევ?!"
    t = morning_end
    o2 = piece(OW2, O2, o2g, 2, 2, t + 0.32, fx=car_voice, gain_db=0.5)
    ev["isev"] = o2[2][0]
    sub("„ისევ?!“", o2[2][0], o2[2][1], "white")
    sfx("cc0-leather-drop", ev["isev"] + 0.45, 0.24)
    again_end = o2[2][1] + 0.55
    shot("again", t, again_end)
    # 12 seat: his phone face up on the passenger seat, the call on the speaker: „ესეც კარგია, კარგიააა."
    t = again_end
    ev["call"] = t
    c1 = piece(ME2, M2, m2g, 2, 3, t + 0.32, fx=phone, gain_db=1.0)
    ev["c2"] = c1[2][0]
    ev["c3"] = c1[3][0]
    sub("„ესეც კარგია, კარგიააა.", c1[2][0], c1[3][1], "white", phone=True)
    seat_end = c1[3][1] + 0.12
    shot("seat", t, seat_end)
    # 13 lounge: the mechanic in his garage, leaning on the tool chest, the phone at his ear, smoking:
    # „აბა ახლა სხვა ნაწილი ვნახოთ, მოიყვანე."
    c2 = piece(ME2, M2, m2g, 4, 4, seat_end + 0.3, fx=phone, gain_db=1.0)
    c3 = piece(ME2, M2, m2g, 6, 6, c2[4][1] + 0.38, fx=phone, gain_db=1.0)
    c4 = piece(ME2, M2, m2g, 7, 7, c3[6][1] + 0.5, fx=phone, gain_db=1.0)
    ev["c4"] = c2[4][0]
    ev["c6"] = c3[6][0]
    ev["c7"] = c4[7][0]
    sub("აბა ახლა სხვა ნაწილი ვნახოთ,", c2[4][0], c3[6][1], "white", phone=True)
    sub("მოიყვანე.“", c4[7][0], c4[7][1], "white", phone=True)
    lounge_end = c4[7][1] + 0.25
    shot("lounge", seat_end, lounge_end)
    flush()
    nb = int(lounge_end * SR)
    for tr in (mx.fx, mx.air):
        tail = tr[nb:].copy()
        tr[nb:] = 0.0
        k = min(len(tail), int(0.08 * SR))
        tr[nb: nb + k] = tail[:k] * np.linspace(1, 0, k)

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

    def nsub(k, parts, tone="ink"):
        bs = [nt(k)] + [ndip(k, f) for _, f in parts[1:]] + [ne(k)]
        for m, (text, _) in enumerate(parts):
            sub(text, bs[m], bs[m + 1], tone)

    pieces = []
    # ---- piece A (0..3): the problem, chewed ----
    TA = lounge_end + 0.4
    pieces.append((TA, npiece(0, 3, TA)))
    # 14 wires: on the dark, a dozen of the engine's parts, every one wired to ONE lamp: „ჩეკი მხოლოდ იმას გეუბნება,"
    # 15 lamp: close on that one lamp: it lights amber: „რომ რაღაც ცუდადაა."
    b0 = ndip(0, 26 / 41)
    nsub(0, [("ჩეკი მხოლოდ იმას გეუბნება,", None), ("რომ რაღაც ცუდადაა.", 26 / 41)])
    ev["wires"] = nt(0) + 0.1
    sfx("asmr-shimmer", ev["wires"], 0.22)
    shot("wires", lounge_end, b0 - 0.08)
    ev["lampOn"] = b0 + 0.35
    sfx("chime", ev["lampOn"], 0.26)
    shot("lamp", b0 - 0.08, nt(1) - 0.12)
    # 16 roulette: the guess: three reels of parts spin and stop on nothing sure: „რა, ამას არ გეუბნება."
    sub("რა, ამას არ გეუბნება.", nt(1), ne(2))
    ev["spin"] = nt(1) - 0.05
    sfx("asmr-detent-roll", ev["spin"], 0.26)
    ev["stops"] = [ne(2) - 0.55, ne(2) - 0.35, ne(2) - 0.15]
    for x_ in ev["stops"]:
        sfx("asmr-detent", x_, 0.26)
    shot("roulette", nt(1) - 0.12, nt(3) - 0.12)
    # 17 drain: the lari notes slip one by one through a street drain's grate at night: „და გამოცნობაში ფულს შენ იხდი."
    sub("და გამოცნობაში ფულს შენ იხდი.", nt(3), ne(3))
    ev["notes"] = [nt(3) + 0.1 + 0.28 * i for i in range(5)]
    for i, x_ in enumerate(ev["notes"]):
        sfx("cc0-page-turn", x_ + 0.18, 0.16 if i else 0.2)
    drain_end = ne(3) + 0.32
    shot("drain", nt(3) - 0.12, drain_end)

    # ---- piece B (4..14): the reveal and how it works ----
    # 18 reveal: black; the phone rises SLOWLY out of the dark (1.25 s, a soft settle), its screen wakes on VINARI's home;
    # on „საქართველოში" the white opens out of its screen: the small kicker „საქართველოში პირველად" and the big black
    # headline word by word (the headline is the line: no subtitle)
    t = drain_end
    ev["rise"] = t + 0.1
    sfx("asmr-swell", t + 0.15, 0.34)
    ev["wake"] = t + 1.0
    sfx("asmr-screen", ev["wake"], 0.3)
    TB = t + 1.85
    pieces.append((TB, npiece(4, 14, TB)))
    ev["whiteout"] = nt(4) - 0.55
    sfx("asmr-shimmer", ev["whiteout"], 0.3)
    ev["kick"] = nt(4)
    sfx("asmr-land", ev["kick"], 0.36)
    ev["title"] = [nt(5), ndip(5, 21 / 33), nt(6)]
    for x_ in ev["title"]:
        sfx("asmr-land", x_, 0.42)
    sfx("asmr-sub", ev["title"][0], 0.32)
    reveal_end = ne(6) + 0.35
    shot("reveal", t, reveal_end)
    # 19 speaks: the graphite crossover in the white studio, a speech bubble from its nose full of its own language
    nsub(7, [("მანქანა ყოველთვის გეუბნება,", None), ("რა სჭირს.", 27 / 35)])
    ev["bubble"] = nt(7) + 0.25
    sfx("asmr-pop", ev["bubble"], 0.3)
    ev["bytes"] = [nt(7) + 0.5 + 0.18 * i for i in range(6)]
    for x_ in ev["bytes"]:
        sfx("asmr-ui-tick-soft", x_, 0.14)
    shot("speaks", reveal_end, nt(8) - 0.1)
    # 20 noone: the translator that never was: the car's line on top, under it only a blinking cursor
    nsub(8, [("უბრალოდ,", None), ("აქამდე არავინ გითარგმნიდა.", 8 / 33)])
    ev["blank"] = nt(8) + 0.3
    noone_end = ne(8) + 0.3
    shot("noone", nt(8) - 0.1, noone_end)
    # 21 ecu: the crossover as an x-ray: the sensors' pulses run to its computer, the codes land in its memory as tags
    nsub(9, [("მანქანის კომპიუტერი", None), ("ხარვეზებს კოდებად იმახსოვრებს.", 19 / 49)])
    ev["pulses"] = [nt(9) + 0.15 + 0.3 * i for i in range(3)]
    for x_ in ev["pulses"]:
        sfx("asmr-ui-tick-soft", x_ + 0.3, 0.16)
    ev["ecuIn"] = ndip(9, 19 / 49) - 0.1
    ev["tags"] = [ndip(9, 30 / 49) + 0.1 * i for i in range(3)] if False else [ndip(9, 26 / 49), ndip(9, 34 / 49), ndip(9, 42 / 49)]
    for x_ in ev["tags"]:
        sfx("asmr-pop", x_, 0.26)
    shot("ecu", noone_end, nt(10) - 0.1)
    # 22 port: the driver's footwell in the day: the port under the wheel lights, a lens lifts it up big with its 16 pins
    sub("საჭის ქვეშ პატარა ბუდეა, OBD.", nt(10), ne(11))
    ev["portGlow"] = nt(11) - 0.25
    sfx("asmr-shimmer", ev["portGlow"], 0.26)
    ev["lens"] = nt(11) - 0.05
    sfx("asmr-pop", ev["lens"], 0.3)
    shot("port", nt(10) - 0.1, nt(12) - 0.1)
    # 23 cars: a row of today's cars, a port badge pops over each in turn: „თითქმის ყველა თანამედროვე მანქანას აქვს."
    sub("თითქმის ყველა თანამედროვე მანქანას აქვს.", nt(12), ne(12))
    ev["badges"] = [nt(12) + 0.2 + 0.28 * i for i in range(5)]
    for x_ in ev["badges"]:
        sfx("asmr-pop", x_, 0.2)
    shot("cars", nt(12) - 0.1, nt(13) - 0.1)
    # 24 adapter: step 1: a cheap ELM327 adapter, then (a cut) it plugs into the port, the ignition on, its LED wakes
    b13 = ndip(13, 23 / 41)
    nsub(13, [("ნებისმიერ იაფ ELM327", None), ("ადაპტერს ჩადებ,", 23 / 41)])
    ev["adapterIn"] = nt(13) - 0.05
    sfx("asmr-air", ev["adapterIn"], 0.26)
    shot("adapter", nt(13) - 0.1, b13 - 0.1)
    ev["click"] = ne(13) - 0.45
    sfx("cc0-latch", ev["click"], 0.42)
    sfx("asmr-haptic-rigid", ev["click"] + 0.01, 0.3)
    ev["led"] = ev["click"] + 0.28
    sfx("asmr-ui-tick-soft", ev["led"], 0.26)
    shot("plug", b13 - 0.1, ne(13) + 0.12)
    # 25 app: step 2: his hand brings the phone up SLOWLY (1 s, a soft settle) on the OBD scanner; the tap on „სკანირება"
    b14 = ndip(14, 22 / 41)
    nsub(14, [("აპში სკანირებას დააჭერ", None), ("და ვინარი თვითონ იპოვის.", 22 / 41)])
    ev["appRise"] = ne(13) + 0.12
    sfx("asmr-slide", ev["appRise"], 0.22)
    ev["scanTap"] = ndip(14, 16 / 41)
    sfx("asmr-tap", ev["scanTap"], 0.42)
    sfx("asmr-haptic-light", ev["scanTap"] + 0.02, 0.28)
    shot("app", ne(13) + 0.12, b14 - 0.06)
    # 26 found: step 3: the phone finds the adapter by itself (BLE), or (Wi-Fi) you join its network in Settings; the link
    # and the scan; the honest small note „iPhone: Wi-Fi ან BLE ადაპტერი · Android: ნებისმიერი". Held a breath longer
    # than the voice (a beat of the film, the take's piece ends here)
    ev["radar"] = b14 + 0.05
    sfx("asmr-ui-tick-roll", ev["radar"], 0.16)
    ev["found"] = ne(14) - 0.1
    sfx("asmr-check", ev["found"], 0.34)
    ev["wifi"] = ne(14) + 0.35
    sfx("asmr-ui-tick", ev["wifi"], 0.28)
    ev["scanRun"] = ne(14) + 0.9
    sfx("asmr-count-roll", ev["scanRun"], 0.16, dur=0.9)
    ev["note"] = ne(14) + 0.2
    found_end = ne(14) + 1.6
    shot("found", b14 - 0.06, found_end)

    # ---- piece B2 (15..24): what it tells you ----
    TB2 = found_end + 0.3
    pieces.append((TB2, npiece(15, 24, TB2)))
    # 27 code: P0300 alone, big, a code among a rain of others: „P0300 შენთვის არაფერს ნიშნავს."
    sub("P0300 შენთვის არაფერს ნიშნავს.", nt(15), ne(16))
    ev["codeIn"] = nt(15) - 0.05
    sfx("asmr-land", ev["codeIn"], 0.32)
    shot("code", found_end, nt(17) - 0.1)
    # 28 morph: its letters scramble into the Georgian, a cylinder skips under it: „ვინარი ქართულად გეტყვის:
    # ცილინდრის გამოტოვებაა."
    sub("ვინარი ქართულად გეტყვის:", nt(17), ne(17))
    sub("ცილინდრის გამოტოვებაა.", nt(18), ne(18))
    ev["scramble"] = ne(17) - 0.15
    sfx("asmr-flap-roll", ev["scramble"], 0.3)
    ev["word"] = nt(18) + 0.05
    sfx("asmr-flap", ev["word"] + 0.25, 0.36)
    ev["misfire"] = nt(18) + 0.6
    sfx("misfire", ev["misfire"], 0.16, src=kit("real-misfire"), dur=0.9)
    shot("morph", nt(17) - 0.1, nt(19) - 0.1)
    # 29 scale: three answers on a ladder, the marker settles on the middle one: „რამდენად სერიოზულია"
    # 30 verdict: the phone leaning on the dash, the real result; its verdict lifts: „და შეგიძლია თუ არა იარო."
    b19 = ndip(19, 19 / 41)
    nsub(19, [("რამდენად სერიოზულია", None), ("და შეგიძლია თუ არა იარო.", 19 / 41)])
    ev["ladder"] = nt(19) + 0.05
    ev["marker"] = nt(19) + 0.3
    sfx("asmr-detent", ev["marker"], 0.3)
    shot("scale", nt(19) - 0.1, b19 - 0.06)
    ev["verdictRise"] = b19 - 0.06
    ev["verdict"] = b19 + 0.75
    sfx("cc0-card-slide", ev["verdict"], 0.3)
    sfx("asmr-pop", ev["verdict"] + 0.2, 0.36)
    shot("verdict", b19 - 0.06, nt(20) - 0.1)
    # 31 lot: a used-car lot in the day, the seller all smiles by the car: „მანქანას ყიდულობ?"
    sub("მანქანას ყიდულობ?", nt(20), ne(20))
    ev["seller"] = nt(20) + 0.1
    shot("lot", nt(20) - 0.1, nt(21) - 0.1)
    # 32 checks: the four questions VINARI asks before a purchase, row by row; the first answers
    # 33 vin: the two VINs, the engine computer's and the document's, compared character by character: they match
    sub("ვინარი შეამოწმებს,", nt(21), ndip(21, 18 / 45))
    sub("ჩეკი ახლახან ხომ არ წაუშლიათ", ndip(21, 18 / 45), ne(21))
    ev["rows"] = [nt(21) + 0.15 + 0.16 * i for i in range(4)]
    for x_ in ev["rows"]:
        sfx("asmr-ui-tick-soft", x_, 0.2)
    ev["cleared"] = ndip(21, 18 / 45) + 0.35
    sfx("asmr-pop", ev["cleared"], 0.3)
    shot("checks", nt(21) - 0.1, nt(22) - 0.1)
    sub("და VIN-კოდი საბუთს ემთხვევა თუ არა.", nt(22), ne(22))
    ev["vinRun"] = nt(22) + 0.1
    sfx("asmr-ui-tick-roll", ev["vinRun"], 0.16)
    ev["vinOk"] = ne(22) - 0.15
    sfx("asmr-check", ev["vinOk"], 0.32)
    shot("vin", nt(22) - 0.1, nt(23) - 0.1)
    # 34 nosound: no adapter: the sound diagnosis's first question in his hand by the car; the tap on „ორმოებზე"
    sub("ადაპტერი არ გაქვს?", nt(23), ne(23))
    ev["askRise"] = nt(23) - 0.1
    ev["potTap"] = ne(23) + 0.1
    sfx("asmr-tap", ev["potTap"], 0.4)
    sfx("asmr-haptic-selection", ev["potTap"] + 0.02, 0.26)
    shot("nosound", nt(23) - 0.1, nt(24) - 0.1)
    # 35 record: the phone at the front wheel, recording: the knocks of the suspension, the waveform alive (held: the
    # recording is the beat; the take's piece ends here)
    sub("მანქანის ხმა ჩაწერე.", nt(24), ne(24))
    ev["rec"] = nt(24) + 0.1
    sfx("asmr-ui-tick-soft", ev["rec"], 0.3)
    ev["knocks"] = [ne(24) + 0.05, ne(24) + 0.55, ne(24) + 1.05]
    clunk = kit("real-clunk")
    for x_ in ev["knocks"]:
        sfx("clunk", x_, 0.24, src=clunk, dur=0.45)
    record_end = ne(24) + 1.3
    shot("record", nt(24) - 0.1, record_end)

    # ---- piece C (29..30): the diagnosis ----
    TC = record_end + 0.3
    pieces.append((TC, npiece(29, 30, TC)))
    # 36 diag: the diagnosis on the workbench: the urgency lifts („ორ კვირაში"), the band runs down to the causes
    b30 = ndip(30, 16 / 46)
    sub("გეტყვის, რამდენად სასწრაფოა,", nt(29), ne(29))
    sub("რა შეიძლება იყოს", nt(30), b30)
    ev["urgent"] = nt(29) + 0.75
    sfx("cc0-card-slide", ev["urgent"], 0.28)
    sfx("asmr-pop", ev["urgent"] + 0.15, 0.3)
    ev["causes"] = nt(30) + 0.05
    sfx("asmr-ui-tick", ev["causes"], 0.3)
    shot("diag", record_end, b30 - 0.05)
    # 37 tell: the very sentence to say to the mechanic, lifted as a speech bubble: „და ხელოსანს ზუსტად რა უთხრა."
    sub("და ხელოსანს ზუსტად რა უთხრა.", b30, ne(30))
    ev["quote"] = b30 + 0.15
    sfx("cc0-card-slide", ev["quote"], 0.28)
    sfx("asmr-pop", ev["quote"] + 0.15, 0.32)
    tell_end = ne(30) + 0.35
    shot("tell", b30 - 0.05, tell_end)

    # ============================================ the callback (the same garage, daylight) ============================================
    t = tell_end
    ev["cb"] = t
    q3 = piece(OW, OI, og, 3, 3, t + 0.3, fx=garage_voice, gain_db=0.5)
    q4 = piece(OW, OI, og, 4, 4, q3[3][1] + 0.24, fx=garage_voice, gain_db=0.5)
    q5 = piece(OW, OI, og, 5, 5, q4[4][1] + 0.24, fx=garage_voice, gain_db=0.5)
    q6 = piece(OW, OI, og, 6, 6, q5[5][1] + 0.3, fx=garage_voice, gain_db=0.5)
    ev["show"] = q3[3][0]
    sub("„ნახე: P0300,", q3[3][0], q4[4][1], "ink")
    sub("ცილინდრი ტოვებს.", q5[5][0], q5[5][1], "ink")
    sub("ჯერ სანთლები შეამოწმე.“", q6[6][0], q6[6][1], "ink")
    sfx("cc0-cloth", ev["show"] - 0.15, 0.24)
    show_end = q5[5][1] + 0.15
    shot("show", t, show_end)
    ev["sanTlebi"] = q6[6][0]
    smart_end = q6[6][1] + 0.12
    shot("smart", show_end, smart_end)
    t = smart_end
    h3 = piece(ME, MI, mg, 8, 8, t + 0.3, fx=garage_voice, gain_db=-1.0)
    h4 = piece(ME, MI, mg, 9, 9, h3[8][1] + 0.5, fx=garage_voice, gain_db=-1.5)
    ev["ho"] = h3[8][0]
    ev["kiBatono"] = h4[9][0]
    sub("„ჰო.", h3[8][0], h3[8][1] + 0.25, "ink")
    sub("კი, ბატონო.“", h4[9][0], h4[9][1], "ink")
    ho_end = h4[9][1] + 0.3
    shot("ho", t, ho_end)

    # ============================================ ACT 4: more, and the end ============================================
    # ---- piece D (31..34) ----
    TD = ho_end + 0.25
    pieces.append((TD, npiece(31, 34, TD)))
    # 38 out: the roll-up door goes up on the day, the crossover rolls out into the street: „მანქანაში თუ არ ერკვევი,
    # აღარც დაგჭირდება."
    sub("მანქანაში თუ არ ერკვევი,", nt(31), ne(31))
    sub("აღარც დაგჭირდება.", nt(32), ne(32))
    sfx("real-pass-by", nt(32) - 0.4, 0.14, dur=1.6)
    shot("out", ho_end, nt(33) - 0.12)
    # 39 more: one phone in the white world, rising slowly; each half turn shows a new feature (its name above it)
    sub("და ეს მხოლოდ დასაწყისია:", nt(33), ne(33))
    nsub(34, [("ვინარი ყოველ განახლებაზე", None), ("ახალს მატებს.", 25 / 37)])
    ev["moreRise"] = nt(33) - 0.12
    ev["turns"] = [ne(33) + 0.05, ne(33) + 0.05 + (ne(34) - ne(33)) / 3, ne(33) + 0.05 + 2 * (ne(34) - ne(33)) / 3]
    for x_ in ev["turns"]:
        sfx("asmr-air", x_, 0.2)
    more_end = ne(34) + 0.3
    shot("more", nt(33) - 0.12, more_end)
    # 40 soon: two honest chips, black and white: „CarPlay · მალე", „Android Auto · მალე" (the take's piece ends here)
    ev["chips"] = [more_end + 0.08, more_end + 0.36]
    for x_ in ev["chips"]:
        sfx("asmr-pop", x_, 0.32)
        sfx("asmr-haptic-light", x_ + 0.02, 0.22)
    soon_end = more_end + 1.15
    shot("soon", more_end, soon_end)
    # ---- piece E (35..39) ----
    TE = soon_end + 0.25
    pieces.append((TE, npiece(35, 39, TE)))
    # 41 future: „გაემზადე მომავლისთვის." the headline is the line (no subtitle): the crossover drives on into the light
    ev["future"] = nt(35)
    ev["futureWords"] = [nt(35), ndip(35, 9 / 21)]
    for x_ in ev["futureWords"]:
        sfx("asmr-land", x_, 0.34)
    shot("future", soon_end, nt(36) - 0.12)
    # 42 store: the App Store page in his hand (rising slowly), „Get" tapped; the two store pills
    sub("VINARI ჩაიწერე,", nt(36), ne(36))
    sub("App Store-სა და Google Play-ზეა.", nt(37), ne(37))
    ev["storeRise"] = nt(36) - 0.12
    ev["getTap"] = ne(36) - 0.05
    sfx("asmr-tap", ev["getTap"], 0.4)
    sfx("asmr-haptic-light", ev["getTap"] + 0.02, 0.26)
    ev["pill1"] = nt(37) + 0.02
    ev["pill2"] = ndip(37, 9 / 24)
    sfx("cc0-click-soft", ev["pill1"], 0.38)
    sfx("cc0-click-soft", ev["pill2"], 0.38)
    store_end = nt(38) - 0.3
    shot("store", nt(36) - 0.12, store_end)
    # 43 end: the mark, the wordmark, the last line built word by word (the card is the line: no subtitle), the two pills
    t = store_end
    sfx("asmr-whoomp", t + 0.05, 0.3)
    ev["mark"] = t + 0.12
    sfx("cc0-wood-tap", ev["mark"], 0.26)
    ev["tag"] = [nt(38), ndip(38, 4 / 11), nt(39), ndip(39, 9 / 19)]
    ev["endHit"] = ne(39) + 0.05
    sfx("asmr-end", ev["endHit"], 0.34)
    total = ne(39) + 1.35
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
    if os.environ.get("DIAG_DEBUG"):
        for sec in range(int(total) + 1):
            a_, b_ = int(sec * SR), int((sec + 1) * SR)
            row = [f"{sec:3d}s"]
            for nm, tr in (("voice", vbus), ("fx", fxbus), ("air", mx.air * duck)):
                v = peak100(tr[a_:b_]) - REF100
                row.append(f"{nm} {v:6.1f}" if v > -60 else f"{nm}    -  ")
            print("  ".join(row))
    out = vbus + fxbus + mx.air * duck * 10 ** (-3 / 20)
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    shots.sort(key=lambda s: (s["from"], 1 if s.get("insert") else 0))
    # the subtitle's colour follows the picture under it: white over the dark shots, ink over the white world
    for sb in subs:
        under = [s_ for s_ in shots if s_["from"] <= sb["start"] + 0.07 < s_["to"]]
        if under:
            sb["tone"] = "white" if under[-1]["id"] in DARK else "ink"
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
    "asmr-flap-roll": -8,
}

OWN = {"bleep", "chime"}
DARK = {"fight", "retort", "rewind", "drive", "pop", "bay", "coils", "bill", "morning", "again", "seat", "wires", "lamp", "roulette", "drain", "reveal", "port", "plug", "verdict"}


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
