#!/usr/bin/env python3
"""The „კიდევ ამინთო" promo's timeline and its whole sound (2026-10-31), built from the measured Gemini takes (voices.py) and
their word times (words.py), into:

  src/amintho/timeline.json      shots, events and subtitles (every word's start) in seconds
  public/vo/amintho/mix.wav      the mastered film sound (gitignored)

    python3 src/amintho/build/plan.py [--no-audio]

The story: on a dark road the check lamp lights AGAIN; the driver yells at it, his swear ends in a bleep and the camera
jumps far up into the sky where the bleep echoes small and muffled; three mechanics, three guesses, 1 100 ₾, the lamp back
every time; then VINARI reads the car in half a minute: a loose fuel cap. Every voice is laid down whole, cut only at its
own pauses; the narrator is ONE continuous take in three pieces (the driver speaks between them). Master: -10.5 LUFS.
"""
import os
import sys

import numpy as np

from common import OUT, SFX, SR, STUDIO, load, load_json, loudness, read_wav, save_json, write_wav

HERE = os.path.dirname(os.path.abspath(__file__))
TL = os.path.join(STUDIO, "src", "amintho", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
TAKE = {k: read_wav(os.path.join(OUT, V[k]["file"])) for k in ("man", "m1", "m2", "m3", "narr")}
W = {k: load_json(os.path.join(OUT, f"words-{k}.json"))["words"] for k in TAKE}
assert [len(W[k]) for k in ("man", "m1", "m2", "m3", "narr")] == [17, 4, 4, 3, 49], [len(W[k]) for k in W]


def env10(a):
    w = int(0.01 * SR)
    c = np.convolve(a * a, np.ones(w) / w, mode="same")
    return 10 * np.log10(c + 1e-12)


def quiet_near(a, t, lo, hi):
    """the quietest 10 ms point of the take in [t + lo, t + hi] (seconds)"""
    e = env10(a)
    i0, i1 = max(0, int((t + lo) * SR)), min(len(a) - 1, int((t + hi) * SR))
    if i1 <= i0:
        return t
    return (i0 + int(np.argmin(e[i0:i1]))) / SR


def cut(a, s, e, fin=0.006, fout=0.025):
    x = a[int(max(0, s) * SR): int(min(len(a) / SR, e) * SR)].copy()
    ni, no = int(fin * SR), int(fout * SR)
    if ni:
        x[:ni] *= np.linspace(0, 1, ni)
    if no:
        x[-no:] *= np.linspace(1, 0, no)
    return x


def own(name):
    return read_wav(os.path.join(OUT, "sfx", name + ".wav"))


def kit(name):
    p = os.path.join(SFX, name + (".wav" if os.path.exists(os.path.join(SFX, name + ".wav")) else ".m4a"))
    return load(p) if p.endswith(".m4a") else read_wav(p)


def mono(x):
    return x.mean(axis=1) if x.ndim > 1 else x


class Mix:
    def __init__(self, sec):
        self.n = int(sec * SR) + SR
        self.voice = np.zeros(self.n)
        self.fx = np.zeros(self.n)
        self.bed = np.zeros(self.n)

    def put(self, track, x, at, gain_db=0.0):
        x = mono(x)
        s = int(round(at * SR))
        if s < 0:
            x, s = x[-s:], 0
        e = min(self.n, s + len(x))
        getattr(self, track)[s:e] += x[: e - s] * 10 ** (gain_db / 20)


def far_bleep(sec=0.46):
    """the bleep heard from far up: the 1 kHz tone, band-limited and soft, with three echoes off the hills and a short
    diffuse tail (a decaying noise convolution), each echo darker and quieter"""
    from scipy import signal

    t = np.arange(int(sec * SR)) / SR
    tone = np.sin(2 * np.pi * 1000 * t)
    n = int(0.01 * SR)
    tone[:n] *= np.linspace(0, 1, n)
    tone[-n:] *= np.linspace(1, 0, n)
    out = np.zeros(int(2.6 * SR))
    for k, (d, g, lp) in enumerate(((0.0, 1.0, 2600), (0.34, 0.42, 1700), (0.68, 0.2, 1300), (1.02, 0.09, 1100))):
        b, a = signal.butter(2, lp / (SR / 2))
        y = signal.lfilter(b, a, tone) * g
        s = int(d * SR)
        out[s: s + len(y)] += y
    rng = np.random.default_rng(3)
    ir = rng.standard_normal(int(0.9 * SR)) * np.exp(-np.arange(int(0.9 * SR)) / (0.28 * SR))
    wet = signal.fftconvolve(out, ir)[: len(out)]
    wet /= np.max(np.abs(wet)) + 1e-9
    y = 0.55 * out / (np.max(np.abs(out)) + 1e-9) + 0.45 * wet
    return y / (np.max(np.abs(y)) + 1e-9)


# ---------------------------------------------------------------------------------------------------------------------------
# the film, in order
# ---------------------------------------------------------------------------------------------------------------------------
DARK = {"dash", "head", "road", "aerial", "mech1", "dash2", "mech2", "dash3", "mech3", "curb", "black", "cap", "twist", "dashoff", "smile"}


def build():
    shots, ev, subs = [], {}, []
    mix = Mix(80)

    def shot(id_, at):
        shots.append({"id": id_, "from": round(at, 3)})

    def lay(who, w0, w1, at, pre=0.05, post=0.1, gain_db=0.0, tail_quiet=True):
        """lay take words w0..w1 at `at`; returns (start, end, word starts in film time)"""
        a, ws = TAKE[who], W[who]
        s = quiet_near(a, ws[w0]["s"] - pre, -0.05, 0.02)
        e = quiet_near(a, ws[w1]["e"] + post, -0.03, 0.12) if tail_quiet else ws[w1]["e"] + post
        x = cut(a, s, e)
        mix.put("voice", x, at, gain_db)
        starts = [at + (w["s"] - s) for w in ws[w0: w1 + 1]]
        return at, at + (e - s), starts

    def sub(text, starts, end, tone="white"):
        subs.append({"text": text, "start": round(starts[0], 3), "end": round(end, 3), "tone": tone, "words": [round(x, 3) for x in starts]})

    # ---- ACT 1: the road at night -------------------------------------------------------------------------------------
    shot("dash", 0.0)
    ev["lampOn"] = 0.12
    mix.put("fx", own("chime"), 0.12, -6)
    mix.put("fx", kit("real-indicator-loop"), 0.0, -16)
    s, e, st = lay("man", 0, 1, 0.5)
    ev["yell1"] = st[1]
    shot("head", st[1] - 0.12)
    sub("„კიდევ ამინთო?!“", st, e)
    # the swear: „ამის ცოლშვილი მო" and the bleep on the rest; the camera jumps up on the bleep
    a2 = e + 0.32
    shot("road", a2 - 0.1)
    man = W["man"]
    mo_end = man[4]["s"] + 0.19
    s2 = quiet_near(TAKE["man"], man[2]["s"] - 0.05, -0.05, 0.02)
    x = cut(TAKE["man"], s2, mo_end, fout=0.012)
    mix.put("voice", x, a2)
    st2 = [a2 + (w["s"] - s2) for w in man[2:5]]
    bleep_at = a2 + (mo_end - s2)
    ev["bleep"] = bleep_at
    ev["armsUp"] = st2[1]
    sub("„ამის ცოლშვილი მო#@%!“", st2, bleep_at + 0.4)
    shot("aerial", bleep_at)
    mix.put("fx", far_bleep(), bleep_at, -9)
    mix.put("fx", kit("asmr-flap-roll"), bleep_at + 0.18, -12)
    mix.put("fx", kit("synth-whoosh"), bleep_at - 0.08, -14)
    mix.put("bed", own("crickets"), bleep_at + 1.1, -6)
    aerial_end = bleep_at + 2.5
    ev["birds"] = bleep_at + 0.12

    # ---- three mechanics ------------------------------------------------------------------------------------------------
    cnt = []
    t = aerial_end
    for i, (who, parts, price, part) in enumerate((("m1", [(0, 1), (2, 3)], 80, "o2"), ("m2", [(0, 0), (1, 3)], 120, "plug"), ("m3", [(0, 0), (1, 2)], 900, "cat"))):
        sid = f"mech{i + 1}"
        shot(sid, t)
        mix.put("fx", kit("asmr-whoomp"), t, -14)
        at = t + 0.3
        lines = []
        for k, (w0, w1) in enumerate(parts):
            s_, e_, st_ = lay(who, w0, w1, at)
            lines.append((s_, e_, st_, w0, w1))
            at = e_ + (0.28 if k == 0 else 0)
        ev[f"part{i + 1}"] = lines[0][2][0]
        ev[f"price{i + 1}"] = lines[1][2][0]
        mix.put("fx", kit("asmr-count-roll"), lines[1][2][0] - 0.05, -14)
        mix.put("fx", kit("asmr-paper"), lines[1][2][0] + 0.35, -12)
        cnt.append(lines[1][2][0])
        txt = {"m1": ("„დაჩიკია, ძმაო.“", "„ოთხმოცი ლარი.“"), "m2": ("„სანთლებია.“", "„ას ოცი ლარი.“"), "m3": ("„კატალიზატორია...“", "„ცხრაასი ლარი.“")}[who]
        for k, (s_, e_, st_, w0, w1) in enumerate(lines):
            sub(txt[k], st_, e_)
        end_ = lines[-1][1]
        if i < 2:
            # the lamp back again: a short dash insert with the chime
            d = end_ + 0.3
            shot(f"dash{i + 2}", d)
            ev[f"again{i + 1}"] = d + 0.18
            mix.put("fx", own("chime"), d + 0.18, -7)
            t = d + 0.78
        else:
            t = end_ + 0.4
    ev["counter"] = cnt

    # ---- the curb -------------------------------------------------------------------------------------------------------
    shot("curb", t)
    mix.put("bed", own("wind"), t, -15)
    s, e, st = lay("man", 5, 10, t + 0.35)
    sub("„ათას ასი ლარი...“", st[0:3], st[3] - 0.15)
    sub("„და მაინც ანთია.“", st[3:6], e)
    ev["sigh"] = st[3]
    shot("black", e + 0.35)
    ev["icon"] = e + 0.45
    mix.put("fx", kit("asmr-sub"), e + 0.4, -10)
    t = e + 0.35 + 0.8

    # ---- ACT 2: VINARI -------------------------------------------------------------------------------------------------
    nw = W["narr"]
    s, e, st = lay("narr", 0, 21, t)
    shot("ask", t - 0.05)
    mix.put("fx", kit("asmr-swell"), t - 0.1, -14)
    ev["askQ"] = st[0]
    ev["askA"] = st[2]
    ev["askB"] = st[5]
    shot("plug", st[7] - 0.1)
    ev["adapter"] = st[7]
    ev["click"] = st[10] + 0.1
    mix.put("fx", kit("cc0-latch"), st[10] + 0.1, -8)
    shot("scan", st[12] - 0.1)
    ev["scan"] = st[12]
    ev["ticks"] = [st[13] + 0.25 * k for k in range(5)]
    ev["tell"] = st[16]
    for k in range(5):
        mix.put("fx", kit("asmr-ui-tick-soft"), st[13] + 0.25 * k, -16)
    shot("result", st[19] - 0.12)
    ev["code"] = st[19]
    mix.put("fx", kit("app-landed"), st[19] - 0.05, -12)
    N1 = [(0, 1, "ჩეკი ინთება?"), (2, 4, "ჯერ მანქანას ჰკითხე,"), (5, 6, "მერე ხელოსანს."), (7, 8, "პატარა ადაპტერი"),
          (9, 11, "საჭის ქვეშ ერთდება."), (12, 14, "Vinari ნახევარ წუთში"), (15, 15, "წაიკითხავს"), (16, 18, "და ქართულად გეტყვის:"),
          (19, 20, "„ავზის თავსახური"), (21, 21, "მოშვებულია.“")]

    def nsubs(chunks, st0, w_first, end_all, tone):
        for j, (a_, b_, txt) in enumerate(chunks):
            starts = st0[a_ - w_first: b_ - w_first + 1]
            nxt = st0[chunks[j + 1][0] - w_first] - 0.04 if j + 1 < len(chunks) else end_all
            sub(txt, starts, min(nxt, nw[b_]["e"] - nw[a_]["s"] + starts[0] + 0.05) if j + 1 < len(chunks) else end_all, tone)

    nsubs(N1, st, 0, e, "ink")
    # the driver, quietly
    a4 = e + 0.4
    shot("cap", a4 - 0.2)
    s4, e4, st4 = lay("man", 11, 11, a4)
    sub("„თავსახური?“", st4, e4)
    # the fix
    a5 = e4 + 0.35
    s, e, st = lay("narr", 22, 30, a5)
    shot("twist", a5 - 0.1)
    ev["twist"] = [st[1] + 0.1, st[1] + 0.42, st[2] + 0.2]
    for k in ev["twist"]:
        mix.put("fx", kit("cc0-click"), k, -8)
    shot("dashoff", st[3] - 0.1)
    ev["clear"] = st[4] + 0.15
    ev["off"] = st[8]
    mix.put("fx", kit("app-saved"), st[4] + 0.15, -12)
    mix.put("fx", kit("asmr-air-long"), st[8] - 0.05, -14)
    N2 = [(22, 24, "თავსახურს ბოლომდე მოუჭერ,"), (25, 27, "კოდს Vinari-ში წაშლი,"), (28, 30, "და ჩეკი ქრება.")]
    nsubs(N2, st, 22, e, "white")
    # the driver's last word: the old swear starts, then he laughs
    a6 = e + 0.4
    shot("smile", a6 - 0.2)
    s6, e6, st6 = lay("man", 12, 16, a6)
    sub("„ამის ცოლშვილი...“", st6[0:2], st6[2] - 0.12)
    sub("„კარგი, Vinari. კარგი.“", st6[2:5], e6)
    ev["laugh"] = st6[2]
    # the end card: the narrator's last piece; the card is the line, no subtitle
    a7 = e6 + 0.45
    s, e, st = lay("narr", 31, 48, a7)
    shot("end", a7 - 0.25)
    ev["mark"] = a7 - 0.1
    ev["badge1"] = st[2]
    ev["badge2"] = st[4]
    ev["free"] = st[6:11]
    ev["ask"] = st[11:18]
    ev["vinari"] = st[13]
    total = e + 1.0

    for i, s_ in enumerate(shots):
        s_["to"] = shots[i + 1]["from"] if i + 1 < len(shots) else round(total, 3)
    tl = {"total": round(total, 3), "fps": 30, "shots": shots, "events": {k: (round(v, 3) if isinstance(v, (int, float)) else [round(x, 3) for x in v]) for k, v in ev.items()}, "subs": subs, "music": {}}
    n = int(total * SR)
    voice, fx, bed = mix.voice[:n], mix.fx[:n], mix.bed[:n]
    # duck the beds and the effects a little under the words
    venv = np.convolve(np.abs(voice), np.ones(int(0.05 * SR)) / (0.05 * SR), mode="same")
    duck = 1 - 0.45 * np.clip(venv / (np.percentile(venv[venv > 1e-4], 90) + 1e-9), 0, 1)
    x = voice + fx * duck + bed * duck
    return x, tl


def main():
    x, tl = build()
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:8s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})")
    if "--no-audio" in sys.argv:
        return
    import mastering as P  # one gain, a true-peak limiter (the OBD promo's)

    path = os.path.join(OUT, "mix.wav")
    P.master(x, path, target=-10.5, tp=-1.6)
    import subprocess

    tmp = path + ".m2.wav"
    r = subprocess.run([sys.executable, os.path.join(HERE, "master2.py"), path, tmp, "-10.5", "-2.0"], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr[-800:])
    if r.returncode == 0:
        y = read_wav(tmp)
        os.remove(tmp)
        write_wav(path, np.stack([y, y], axis=1) if y.ndim == 1 else y, bits=24)
    print("mix.wav:", loudness(path))


if __name__ == "__main__":
    main()
