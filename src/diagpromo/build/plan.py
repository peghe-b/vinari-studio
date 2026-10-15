#!/usr/bin/env python3
"""The diagnostics promo's timeline and its whole sound, built from the measured Gemini takes (voices.py) and the sounds
(public/vo/diagpromo/sfx from sfx_synth.py, public/sfx):

  src/diagpromo/timeline.json      shots, events and subtitles in seconds (the film reads it; no audio, nothing secret)
  public/vo/diagpromo/mix.wav      the mastered film sound: the voices, the bleep, the sound design (gitignored)

    python3 src/diagpromo/build/plan.py

The narrator is ONE continuous Algieba take (voices.py NARR), laid down whole in three pieces at its big beats (islands
0..17, the callback in the garage between, 18..21, the two „მალე" chips, 22..25); never re-spaced inside a piece, never
cut into sentences. The mechanic's and the owner's takes are cut only at their breaths. The owner's swear is never voiced:
his line stops at „გამი-" and the bleep covers the rest of the word. The mechanic's call is heard through a phone's
speaker. Master: aimed at -11 LUFS with at most 3 dB of limiting (about -12 in practice), true peak under -1.8 dBTP in the wav, no music, no beds (no room tone, no hiss): the voices
and quiet purposeful cues on silence, every cue ducked under the words. No pencil or pen sound anywhere.
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


# the takes' islands (transcribed 2026-10-15: the whole takes, and every island on its own between beeps)
# narrator (26): 0 საქართველოში პირველად:  1 მანქანის დიაგნოსტიკა  2 და OBD სკანერი, ქართულად.
#  3 მანქანა ყოველთვის გეუბნება, რა სჭირს.  4 უბრალოდ, აქამდე არავინ გითარგმნიდა.  5 საჭის ქვეშ პატარა ბუდეა,  6 OBD.
#  7 იაფ ადაპტერს ჩადებ და ვინარი მანქანას დაელაპარაკება.  8 ერთი სკანი  9 და ქართულად გეტყვის:  10 რა სჭირს,
#  11 რამდენად სერიოზულია და შეგიძლია თუ არა იარო.  12 მანქანის ყიდვამდეც შეამოწმებ,  13 რომ ჩეკი არავინ დაგიმალოს.
#  14 ადაპტერი არ გაქვს?  15 მანქანის ხმა ჩაწერე.  16 გეტყვის, რამდენად სასწრაფოა,
#  17 რა შეიძლება იყოს და ხელოსანს ზუსტად რა უთხრა.  18 მანქანაში თუ არ ერკვევი,  19 აღარც დაგჭირდება.
#  20 და ეს მხოლოდ დასაწყისია:  21 ვინარი ყოველ განახლებაზე ახალს მატებს.  22 ვინარი ჩაიწერე,
#  23 ეპ სთორსა და გუგლ ფლეიზეა.  24 შენი მანქანა  25 ქართულად ალაპარაკდა.
# mechanic (10): 0 აბა...  1 სანთლებიც შესაცვლელია,  2 კოჭაც,  3 ესეც...  4 ძმაო,  5 აბა,  6 ახლა გადაცემათა
#  7 კოლოფიც ვნახოთ...  8 ჰო.  9 კი, ბატონო.
# owner (7): 0 ხუთასი ლარი გამი-  1 და  2 ჩეკი ისევ ანთია!  3 ნახე:  4 პე-ნული-სამასი,  5 ცილინდრი ტოვებს.
#  6 ჯერ სანთლები შეამოწმე.
NI = islands(NA)
MI = islands(ME)
OI = islands(OW)
for nm, isl, n in (("narrator", NI, 26), ("mechanic", MI, 10), ("owner", OI, 7)):
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


def build():
    global REF100, VPEAK
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(NA)) / 20)
    REF100 = peak100(NA * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(NA * ng), 99.95))
    mg = 10 ** ((VO_LUFS - lufs(ME)) / 20)
    og = 10 ** ((VO_LUFS - lufs(OW)) / 20)
    mx = Mix(100)
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

    def chunks(take, isl, k, t, parts, tone, **kw):
        """island k (placed at t = (start, end)) as subtitle chunks [(text, None | letter fraction)]"""
        s0, e0 = isl[k]
        a, b = t
        bs = [a] + [a + dip_between(take, s0, e0, f) - s0 for _, f in parts[1:]] + [b]
        for m, (text, _) in enumerate(parts):
            sub(text, bs[m], bs[m + 1], tone, **kw)

    # ============================================ ACT 1: the problem (night garage) ============================================
    # 1 garage: the car on the lift under the amber pendants; the mechanic at its nose with a wrench, the owner aside, arms
    # crossed. „აბა..." (the mechanic leans in, looks)
    m0 = piece(ME, MI, mg, 0, 0, 0.35, fx=garage_voice)
    sub("„აბა...“", *m0[0], "white")
    ev["m0"] = m0[0][0]
    sfx("cc0-cloth", 0.25, 0.25)
    m1 = piece(ME, MI, mg, 1, 3, m0[0][1] + 0.38, fx=garage_voice)
    ev["m1"] = m1[1][0]
    ev["m2"] = m1[2][0]
    ev["m3"] = m1[3][0]
    # v2 (the art director): the garage opens close on the open engine bay under the work lamp, the mechanic bent into it,
    # the owner a step back; it runs into „სანთლებიც" (he comes up out of the bay with the wrench), so the close shot of him
    # pointing into the bay is under 2 s
    garage_end = m1[1][0] + 0.8
    shot("garage", 0.0, garage_end)
    # 2 mech: closer on him beside the open bay: on „სანთლებიც" the wrench points into the bay, on „კოჭაც" again
    sub("„სანთლებიც შესაცვლელია,", m1[1][0], m1[1][1], "white")
    sfx("cc0-chip", ev["m1"] + 0.1, 0.22)  # the wrench taps the sill
    sfx("cc0-chip", ev["m2"] + 0.05, 0.2)
    mech_end = m1[3][0] - 0.16
    shot("mech", garage_end, mech_end)
    # 3 dash: „ესეც..." over the glowing amber check light in the car's cluster (the camera drifts in on it)
    sub("კოჭაც, ესეც...“", m1[2][0], m1[3][1], "white")
    ev["dash"] = mech_end
    sfx("chime", mech_end + 0.12, 0.3)
    dash_end = m1[3][1] + 0.12
    shot("dash", mech_end, dash_end)
    # 4 receipt: a long receipt rolls out of the counter's dark, line by line (a soft tick per line), the total lands
    t = dash_end
    ev["rcpt"] = t
    lines = [t + 0.14 + 0.13 * i for i in range(4)]
    ev["rcptLines"] = lines
    for x_ in lines:
        sfx("asmr-tick-fine", x_, 0.3)
    ev["total"] = lines[-1] + 0.3
    sfx("cc0-click-soft", ev["total"], 0.35)
    rcpt_end = ev["total"] + 0.62
    shot("receipt", t, rcpt_end)
    # 5 morning: the cluster at dawn: the start (the real engine starting), the warning lights' self-test, all go out,
    # and the check light comes back on, with the chime
    t = rcpt_end
    ev["start"] = t + 0.06
    st = kit("real-start")
    sfx("start", ev["start"], 0.42, src=st, dur=1.9)
    ev["test"] = ev["start"] + 0.22
    ev["testOff"] = ev["start"] + 0.6
    ev["checkBack"] = ev["start"] + 0.88
    sfx("chime", ev["checkBack"], 0.34)
    # 6 rage: the owner in the driver's seat, hands to his head: „ხუთასი ლარი გამი-" BLEEP „და ჩეკი ისევ ანთია!"
    # v2: the owner's shout a little lower (it measured about 215 Hz and was heard as high); the rage shot begins before
    # his first word, so the whole line is under him (and its subtitle never ends on a cut)
    angry = lambda x: car_voice(pitch_down(x, 1.5))
    o0 = piece(OW, OI, og, 0, 0, ev["checkBack"] + 0.5, fx=angry, gain_db=1.0)
    ev["o0"] = o0[0][0]
    morning_end = o0[0][0] - 0.15
    shot("morning", t, morning_end)
    ev["bleep"] = o0[0][0] + (1.58 - OI[0][0])
    bl = own("bleep")
    blg = 10 ** ((VO_LUFS - 4 - lufs(bl)) / 20)
    mx.put("voice", bl * blg, ev["bleep"])
    bleep_end = ev["bleep"] + len(bl) / SR
    mx.words.append((ev["bleep"], bleep_end))
    # a beat after the bleep (the joke lands; the censored line holds at least a second)
    o1 = piece(OW, OI, og, 1, 2, max(bleep_end + 0.06, ev["bleep"] + 1.05), fx=angry, gain_db=1.0)
    ev["o1"] = o1[1][0]
    sub("„ხუთასი ლარი გამი", o0[0][0], ev["bleep"], "white")
    subs.append({"text": "„ხუთასი ლარი გამი#@%ა", "start": round(ev["bleep"], 3), "end": round(o1[1][0] - 0.02, 3), "tone": "white", "censor": True})
    sub("და ჩეკი ისევ ანთია!“", o1[1][0], o1[2][1], "white")
    ev["slap"] = o1[2][0] + 0.05  # his palm on the wheel on „ჩეკი"
    sfx("cc0-leather-drop", ev["slap"], 0.3)
    # 6b again: back on the cluster, the check light glowing on: „და ჩეკი ისევ ანთია!"
    again_at = o1[1][0] - 0.1
    shot("rage", morning_end, again_at)
    rage_end = o1[2][1] + 0.2
    shot("again", again_at, rage_end)
    # 7 call: his phone on the dash mount, a call on the speaker from „ხელოსანი": „ძმაო, აბა ახლა გადაცემათა კოლოფიც
    # ვნახოთ..." (through the phone's speaker)
    t = rage_end
    ev["call"] = t
    m2 = piece(ME, MI, mg, 4, 5, t + 0.25, fx=lambda x: phone_voice(x, 0.08, 0.16), gain_db=1.0)
    m2.update(piece(ME, MI, mg, 6, 7, m2[5][1] + 0.24, fx=lambda x: phone_voice(x, 0.08, 0.16), gain_db=1.0))
    ev["m4"] = m2[4][0]
    ev["m6"] = m2[6][0]
    ev["m7"] = m2[7][0]
    sub("„ძმაო, აბა,", m2[4][0], m2[5][1], "white", phone=True)
    sub("ახლა გადაცემათა", m2[6][0], m2[6][1], "white", phone=True)
    sub("კოლოფიც ვნახოთ...“", m2[7][0], m2[7][1], "white", phone=True)
    # 8 bin: lari notes flutter down into a bin, the last one settling (on „კოლოფიც")
    call_end = m2[7][0] - 0.12
    shot("call", t, call_end)
    ev["bin"] = call_end
    ev["notes"] = [call_end + 0.15 + 0.22 * i for i in range(5)]
    for i, x_ in enumerate(ev["notes"]):
        sfx("cc0-page-turn", x_ + 0.3, 0.16 if i else 0.22)
    bin_end = m2[7][1] + 0.15
    shot("bin", call_end, bin_end)
    flush()
    nb = int(bin_end * SR)
    for tr in (mx.fx, mx.air):
        tail = tr[nb:].copy()
        tr[nb:] = 0.0
        k = min(len(tail), int(0.08 * SR))
        tr[nb: nb + k] = tail[:k] * np.linspace(1, 0, k)

    # ============================================ ACT 2-3: the narrator ============================================
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

    # 9 reveal: black; a rim of light finds the phone far off in the dark, it rises; on „საქართველოში" the white opens out
    # of its screen and the headline slams in word by word; „მანქანის დიაგნოსტიკა და OBD სკანერი, ქართულად." the big
    # line moves up into the kicker and the title slams in under it, word by word; the screen goes home -> menu ->
    # „დიაგნოსტიკა" -> the OBD scanner (the headline is the line: no subtitle)
    t = bin_end
    ev["rim"] = t + 0.12
    sfx("asmr-shimmer", ev["rim"], 0.3)
    sfx("asmr-swell", t + 0.22, 0.38)
    ev["wake"] = t + 0.42
    sfx("asmr-screen", ev["wake"], 0.35)
    T0 = t + 1.36
    endA = npiece(0, 17, T0)
    ev["whiteout"] = nt(0) - 0.7
    ev["slam1"] = nt(0)
    ev["slam2"] = ndip(0, 12 / 21)
    sfx("asmr-land", ev["slam1"], 0.5)
    sfx("asmr-sub", ev["slam1"], 0.4)
    sfx("asmr-land", ev["slam2"], 0.55)
    ev["n1"] = nt(1)
    # v2 (the art director: the steps were unreadable under the title): on „მანქანის" the big line settles into the kicker
    # while the phone pushes in BIG and the steps play on it (menu -> „დიაგნოსტიკა" -> the scanner); then the phone steps
    # back and the title slams in, word by word
    ev["big"] = nt(1) - 0.08
    sfx("asmr-air", ev["big"], 0.3)
    ev["menuTap"] = nt(1) + 0.3
    sfx("asmr-tap", ev["menuTap"], 0.35)
    sfx("asmr-haptic-light", ev["menuTap"] + 0.02, 0.28)
    ev["diagTap"] = ev["menuTap"] + 0.62
    sfx("asmr-tap", ev["diagTap"], 0.35)
    sfx("asmr-haptic-light", ev["diagTap"] + 0.02, 0.28)
    ev["sheet"] = ev["diagTap"] + 0.14
    sfx("app-sheet", ev["sheet"], 0.3)
    t1 = ev["sheet"] + 0.6
    ev["title"] = [t1, max(ndip(2, 3 / 27), t1 + 0.32), max(ndip(2, 9 / 27), t1 + 0.5), max(ndip(2, 18 / 27), t1 + 0.8)]
    for x_ in ev["title"]:
        sfx("asmr-land", x_, 0.36)
    reveal_end = ne(2) + 0.3
    shot("reveal", t, reveal_end)
    # 10 codes: the white studio, the cobalt car; its words come out as codes: P0300, P0420, P0171 rise in a calm column
    # „მანქანა ყოველთვის გეუბნება, რა სჭირს."
    t = reveal_end
    nsub(3, [("მანქანა ყოველთვის გეუბნება,", None), ("რა სჭირს.", 27 / 37)])
    ev["codes"] = [nt(3) + 0.2, nt(3) + 0.75, ndip(3, 27 / 37)]
    for x_ in ev["codes"]:
        sfx("asmr-pop", x_, 0.3)
    codes_end = nt(4) - 0.12
    shot("codes", t, codes_end)
    # 11 flip: one code card, P0300, big; „უბრალოდ, აქამდე არავინ გითარგმნიდა." on „გითარგმნიდა" it flips over into
    # Georgian: „ცილინდრი ტოვებს"
    t = codes_end
    nsub(4, [("უბრალოდ, აქამდე", None), ("არავინ გითარგმნიდა.", 15 / 35)])
    ev["flip"] = ndip(4, 13 / 35)
    sfx("asmr-flap-roll", ev["flip"] - 0.05, 0.3)
    sfx("asmr-flap", ev["flip"] + 0.35, 0.4)
    flip_end = ne(4) + 0.3
    shot("flip", t, flip_end)
    # 12 port: under the dashboard: the camera glides down past the steering column, the 16-pin port lights up
    t = flip_end
    sfx("asmr-air-long", t + 0.05, 0.3)
    sub("საჭის ქვეშ პატარა ბუდეა, OBD.", nt(5), ne(6), "white")
    ev["portGlow"] = nt(6) - 0.05
    sfx("asmr-shimmer", ev["portGlow"], 0.3)
    port_end = nt(7) - 0.1
    shot("port", t, port_end)
    # 13 plug: the small adapter slides in and clicks home, its LED wakes: „იაფ ადაპტერს ჩადებ"
    t = port_end
    b7 = ndip(7, 18 / 53)
    nsub(7, [("იაფ ადაპტერს ჩადებ", None), ("და Vinari მანქანას დაელაპარაკება.", 18 / 53)], "white")
    ev["click"] = b7 - 0.32
    sfx("cc0-latch", ev["click"], 0.5)
    sfx("asmr-haptic-rigid", ev["click"] + 0.01, 0.35)
    ev["led"] = ev["click"] + 0.18
    sfx("asmr-ui-tick-soft", ev["led"], 0.3)
    plug_end = b7 - 0.06
    shot("plug", t, plug_end)
    # 14 link: the adapter and the phone: calm pulses travel from the adapter to the phone, the scanner wakes; the small
    # honest note „iPhone: Wi-Fi ან BLE ადაპტერი"
    t = plug_end
    ev["pulses"] = [t + 0.25 + 0.42 * i for i in range(4)]
    for x_ in ev["pulses"]:
        sfx("asmr-ui-tick-soft", x_ + 0.3, 0.18)
    ev["note"] = t + 0.5
    link_end = ne(7) + 0.3
    shot("link", t, link_end)
    # 15 scan: the OBD scanner big; the band on „სკანირება", tapped on „სკანი"; the result slides up
    t = link_end
    sub("ერთი სკანი", nt(8), ne(8))
    sub("და ქართულად გეტყვის:", nt(9), ne(9))
    ev["scanBand"] = nt(8) - 0.1
    sfx("asmr-ui-tick", ev["scanBand"], 0.35)
    ev["scanTap"] = ndip(8, 0.6)
    sfx("asmr-tap", ev["scanTap"], 0.45)
    sfx("asmr-haptic-light", ev["scanTap"] + 0.02, 0.3)
    ev["resultIn"] = nt(9) + 0.05
    sfx("app-landed", ev["resultIn"] + 0.3, 0.32)
    scan_end = nt(10) - 0.15
    shot("scan", t, scan_end)
    # 16 result: the result screen; „რა სჭირს," the band on the cause („ცილინდრის გამოტოვებაა"), „რამდენად სერიოზულია"
    # the code row (P0300) lifts out
    t = scan_end
    sub("რა სჭირს,", nt(10), ne(10))
    b11 = ndip(11, 19 / 45)
    nsub(11, [("რამდენად სერიოზულია", None), ("და შეგიძლია თუ არა იარო.", 19 / 45)])
    ev["causeBand"] = nt(10) - 0.05
    sfx("asmr-ui-tick", ev["causeBand"], 0.35)
    ev["codeLift"] = nt(11) + 0.1
    sfx("cc0-card-slide", ev["codeLift"], 0.3)
    sfx("asmr-pop", ev["codeLift"] + 0.15, 0.32)
    result_end = b11 - 0.05
    shot("result", t, result_end)
    # 17 verdict: the verdict card lifts out of the real screen, big: „იარე, მაგრამ მალე ხელოსანთან"
    t = result_end
    ev["verdict"] = t + 0.1
    sfx("cc0-card-slide", ev["verdict"], 0.3)
    sfx("asmr-pop", ev["verdict"] + 0.2, 0.4)
    sfx("asmr-haptic-soft", ev["verdict"] + 0.22, 0.3)
    verdict_end = ne(11) + 0.3
    shot("verdict", t, verdict_end)
    # 18 lot: a used-car lot in the day, the seller's smile, his car: „მანქანის ყიდვამდეც შეამოწმებ,"
    t = verdict_end
    sub("მანქანის ყიდვამდეც შეამოწმებ,", nt(12), ne(12))
    ev["seller"] = t + 0.2
    lot_end = nt(13) - 0.08
    shot("lot", t, lot_end)
    # 19 hidden: the scanner: „ყიდვამდე შემოწმება" tapped, then the result's check-light row lifts: „ანთია · 1 კოდი"
    t = lot_end
    sub("რომ ჩეკი არავინ დაგიმალოს.", nt(13), ne(13))
    ev["buyTap"] = t + 0.14
    sfx("asmr-tap", ev["buyTap"], 0.42)
    sfx("asmr-haptic-light", ev["buyTap"] + 0.02, 0.3)
    ev["lampRow"] = max(ndip(13, 9 / 26), t + 0.72)
    sfx("cc0-card-slide", ev["lampRow"], 0.3)
    sfx("asmr-pop", ev["lampRow"] + 0.15, 0.4)
    hidden_end = ne(13) + 0.3
    shot("hidden", t, hidden_end)
    # 20 ask: „ადაპტერი არ გაქვს?" the sound diagnosis: „როდის გაწუხებს მანქანა?", the tap on „ორმოებზე"
    t = hidden_end
    sub("ადაპტერი არ გაქვს?", nt(14), ne(14))
    ev["potTap"] = ne(14) - 0.15
    sfx("asmr-tap", ev["potTap"], 0.42)
    sfx("asmr-haptic-selection", ev["potTap"] + 0.02, 0.3)
    ask_end = nt(15) - 0.1
    shot("ask", t, ask_end)
    # 21 record: the phone held at the front wheel, recording; the knock of the suspension, the waveform alive
    t = ask_end
    sub("მანქანის ხმა ჩაწერე.", nt(15), ne(15))
    ev["rec"] = t + 0.15
    sfx("asmr-ui-tick-soft", ev["rec"], 0.35)
    ev["knocks"] = [t + 0.45, t + 0.95, t + 1.45]
    clunk = kit("real-clunk")
    for x_ in ev["knocks"]:
        sfx("clunk", x_, 0.22, src=clunk, dur=0.45)
    record_end = ne(15) + 0.25
    shot("record", t, record_end)
    # 22 urgency: the diagnosis screen, the band on its urgency („ორ კვირაში"), lifted a little
    t = record_end
    sub("გეტყვის, რამდენად სასწრაფოა,", nt(16), ne(16))
    ev["urgent"] = ndip(16, 0.4)
    sfx("cc0-card-slide", ev["urgent"], 0.3)
    sfx("asmr-pop", ev["urgent"] + 0.15, 0.32)
    urgency_end = nt(17) - 0.1
    shot("urgency", t, urgency_end)
    # 23 tell: „რა შეიძლება იყოს" the band on the causes; „და ხელოსანს ზუსტად რა უთხრა." the mechanic's sentence lifts
    t = urgency_end
    b17 = ndip(17, 16 / 46)
    nsub(17, [("რა შეიძლება იყოს", None), ("და ხელოსანს ზუსტად რა უთხრა.", 16 / 46)])
    ev["causes"] = nt(17) + 0.05
    sfx("asmr-ui-tick", ev["causes"], 0.32)
    ev["quote"] = b17 + 0.12
    sfx("cc0-card-slide", ev["quote"], 0.3)
    sfx("asmr-pop", ev["quote"] + 0.15, 0.36)
    shot("tell", t, b17 - 0.05)
    tell_end = ne(17) + 0.35
    shot("quote", b17 - 0.05, tell_end)

    # ============================================ the callback (the same garage, daylight) ============================================
    t = tell_end
    ev["cb"] = t
    o2 = piece(OW, OI, og, 3, 3, t + 0.22, fx=garage_voice, gain_db=0.5)
    at = o2[3][1] + 0.24
    o3 = piece(OW, OI, og, 4, 4, at, fx=garage_voice, gain_db=0.5)
    at = o3[4][1] + 0.24
    o4 = piece(OW, OI, og, 5, 5, at, fx=garage_voice, gain_db=0.5)
    at = o4[5][1] + 0.26
    o5 = piece(OW, OI, og, 6, 6, at, fx=garage_voice, gain_db=0.5)
    ev["show"] = o2[3][0]
    sub("„ნახე: P0300,", o2[3][0], o3[4][1], "ink")
    sub("ცილინდრი ტოვებს.", o4[5][0], o4[5][1], "ink")
    sub("ჯერ სანთლები შეამოწმე.“", o5[6][0], o5[6][1], "ink")
    sfx("cc0-cloth", ev["show"] - 0.15, 0.25)
    show_end = o4[5][0] - 0.12
    shot("show", t, show_end)
    # the phone close (his hand, the result screen, the code P0300 and the cause in Georgian)
    shot("showPhone", show_end, o5[6][1] + 0.12)
    t = o5[6][1] + 0.12
    m3 = piece(ME, MI, mg, 8, 8, t + 0.3, fx=garage_voice, gain_db=-1.0)
    at = m3[8][1] + 0.45
    m4 = piece(ME, MI, mg, 9, 9, at, fx=garage_voice, gain_db=-1.5)
    ev["ho"] = m3[8][0]
    ev["kiBatono"] = m4[9][0]
    sub("„ჰო.", m3[8][0], m3[8][1] + 0.25, "ink")
    sub("კი, ბატონო.“", m4[9][0], m4[9][1], "ink")
    small_end = m4[9][1] + 0.28
    shot("small", t, small_end)

    # ============================================ ACT 4: more, and the end ============================================
    t = small_end
    T1 = t + 0.22
    endB = npiece(18, 21, T1)
    # 24 calm: the cluster in the daylight, quiet: no check light, the needle at rest: „მანქანაში თუ არ ერკვევი, აღარც დაგჭირდება."
    sub("მანქანაში თუ არ ერკვევი,", nt(18), ne(18))
    sub("აღარც დაგჭირდება.", nt(19), ne(19))
    ev["calmOk"] = nt(19) + 0.1
    sfx("asmr-check", ev["calmOk"], 0.3)
    calm_end = nt(20) - 0.12
    shot("calm", t, calm_end)
    # 25 more: „და ეს მხოლოდ დასაწყისია: ვინარი ყოველ განახლებაზე ახალს მატებს." the app's other real screens rise in a
    # calm flow; 26 soon: two honest chips, „CarPlay · მალე" and „Android Auto · მალე"
    t = calm_end
    sub("და ეს მხოლოდ დასაწყისია:", nt(20), ne(20))
    nsub(21, [("Vinari ყოველ განახლებაზე", None), ("ახალს მატებს.", 25 / 39)])
    more_end = ndip(21, 25 / 39) - 0.12
    step = (more_end - t) / 6
    ev["tiles"] = [t + step * i for i in range(6)]
    for i, x_ in enumerate(ev["tiles"]):
        sfx("asmr-air", x_ + 0.02, 0.18)
    shot("more", t, more_end)
    t = more_end
    ev["chips"] = [t + 0.08, t + 0.36]
    for x_ in ev["chips"]:
        sfx("asmr-pop", x_, 0.36)
        sfx("asmr-haptic-light", x_ + 0.02, 0.25)
    T2 = endB + (NI[22][0] - NI[21][1]) + 0.32
    endC = npiece(22, 25, T2)
    soon_end = nt(22) - 0.3
    shot("soon", t, soon_end)
    # 27 the store and the end card: the REAL App Store page in the phone, „Get" tapped, the two store pills; then the card:
    # the mark, the wordmark, the last line word by word (the card is the line: no subtitle), the pills, „7 დღე უფასოდ"
    t = soon_end
    ev["endIn"] = t
    sfx("asmr-whoomp", t + 0.05, 0.32)
    sub("Vinari ჩაიწერე,", nt(22), ne(22))
    sub("App Store-სა და Google Play-ზეა.", nt(23), ne(23))
    ev["storeBand"] = nt(22) - 0.05
    sfx("asmr-ui-tick", ev["storeBand"], 0.36)
    ev["getTap"] = ne(22) - 0.1
    sfx("asmr-tap", ev["getTap"], 0.45)
    sfx("asmr-haptic-light", ev["getTap"] + 0.02, 0.3)
    ev["pill1"] = nt(23) + 0.02
    ev["pill2"] = ndip(23, 6 / 27)
    sfx("cc0-click-soft", ev["pill1"], 0.42)
    sfx("cc0-click-soft", ev["pill2"], 0.42)
    ev["card"] = ne(23) + 0.2
    sfx("asmr-air", ev["card"], 0.32)
    ev["mark"] = ev["card"] + 0.18
    sfx("cc0-wood-tap", ev["mark"], 0.28)
    ev["tag"] = [nt(24), ndip(24, 5 / 13), nt(25), ndip(25, 9 / 20)]
    ev["free"] = ev["card"] + 0.8
    sfx("cc0-click-soft", ev["free"], 0.35)
    ev["endHit"] = ne(25) + 0.05
    sfx("asmr-end", ev["endHit"], 0.36)
    total = ne(25) + 1.35
    shot("end", t, total)
    ev["narrA"] = [T0, endA]
    ev["narrB"] = [T1, endB]
    ev["narrC"] = [T2, endC]

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
DARK = {"garage", "mech", "dash", "receipt", "morning", "rage", "again", "call", "bin", "port", "plug", "link", "calm"}


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
