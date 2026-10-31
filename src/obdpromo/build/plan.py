#!/usr/bin/env python3
"""The OBD promo's timeline and its whole sound (the used-car story „ქალს ჰყავდა", 2026-10-30), built from the measured
Gemini takes (voices.py), their word times (words.py, snapped to the takes' own silences here) and the sounds
(public/vo/obdpromo/sfx from sfx_synth.py, public/sfx):

  src/obdpromo/timeline.json      shots, events and subtitles (with every word's start) in seconds
  public/vo/obdpromo/mix.wav      the mastered film sound (gitignored)

    python3 src/obdpromo/build/plan.py [--no-audio] [--words]

The narrator is ONE continuous Algieba take, laid down whole in pieces at the story's big beats only (where the seller
speaks), never re-spaced inside a piece. The seller's take (four short lines) is cut only at its breaths; his third line's
stand-in word was never the swear: it is cut out whole and the 1 kHz bleep laid exactly in its place. Master: -10.5 LUFS,
true peak under -1.6 dBTP; no music, no beds: the voices and quiet purposeful cues, every cue ducked under the words.
"""
import os
import sys

import numpy as np

from common import OUT, SFX, SR, STUDIO, env_db, load, load_json, loudness, pauses, read_wav, save_json, speech_span, write_wav

TL = os.path.join(STUDIO, "src", "obdpromo", "timeline.json")
V = load_json(os.path.join(OUT, "voices.json"))
NA = read_wav(os.path.join(OUT, V["narr"]["file"]))
SE = read_wav(os.path.join(OUT, V["seller"]["file"]))
NW0 = load_json(os.path.join(OUT, "words-narr.json"))["words"]


def declick(a):
    """The take's mouth clicks (the reviewers measured two lifted to the limiter by the voice compressors, 31 Oct): every pause
    of the take is held 20 dB down (10 ms ramps, its edges kept), and the one click inside a word (8.794 s) is bridged."""
    a = a.copy()
    r = int(0.01 * SR)
    for p0, p1 in pauses(a, 0.1, -38.0):
        i0, i1 = int((p0 + 0.015) * SR), int((p1 - 0.015) * SR)
        if i1 - i0 <= 2 * r:
            continue
        g = np.ones(i1 - i0) * 0.1
        g[:r] = np.linspace(1, 0.1, r)
        g[-r:] = np.linspace(0.1, 1, r)
        a[i0:i1] *= g
    # v3 (31 Oct, the reviewers measured a loud click at mix 58.14 s and smaller ones at 12.05, 36.17, 49.15 s): every short
    # high-frequency burst the take has inside a quiet stretch (found by its 1 ms band energy >3 kHz, 12 dB over a context
    # under peak -42 dB; bursts of 6 ms or less, so no consonant is touched) is bridged by a straight line
    for t0, t1 in ((2.263, 2.264), (7.614, 7.616), (8.794, 8.797), (9.979, 9.979), (28.316, 28.316), (35.709, 35.711), (38.194, 38.194), (46.762, 46.766), (74.969, 74.970)):
        i0, i1 = int((t0 - 0.0016) * SR), int((t1 + 0.0016) * SR)
        a[i0:i1] = np.linspace(a[i0 - 1], a[i1], i1 - i0)
    return a


NA = declick(NA)
SW0 = load_json(os.path.join(OUT, "words-seller.json"))["words"]
assert len(NW0) == 155, len(NW0)
assert len(SW0) == 20, len(SW0)
PUNCT = (".", ",", ":", "?", "!", "“")


def onset(a, t0, win=0.02, look=0.6):
    """The first 20 ms window after t0 that is speech: loud (peak - 24 dB) or voiced (above peak - 42 dB with few zero crossings)."""
    e = env_db(a, win)
    mx = e.max()
    n = int(win * SR)
    for i in range(int(t0 / win), min(len(e), int((t0 + look) / win))):
        x = a[i * n:(i + 1) * n]
        z = np.mean(np.abs(np.diff(np.sign(x)))) * SR / 2
        if e[i] > mx - 24 or (e[i] > mx - 42 and z < 2500):
            return i * win
    return t0


def refine(words, a):
    """Gemini's word times drift (a few tenths of a second over a long take): every real silence in the take (a pause of 0.1 s or
    more; two pauses split by a click under 60 ms are one) is matched to a gap between two words by one monotonic alignment
    (dynamic programming): a pause prefers the gap after a full stop, then after a comma or colon, then any gap, and a sentence
    end left without its pause costs the most. (v1 matched greedily to the nearest gap and put two pauses one word off, so two
    narrator pieces were cut inside speech; the reviewers measured it, 31 Oct.) The words between two anchors stretch linearly;
    the take's first and last sound are anchors too."""
    on, off = speech_span(a, -40)
    ps0 = pauses(a, 0.1, -38.0)
    ps0 = [p for p in ps0 if p[0] > on + 0.05 and p[1] < off - 0.05]
    ps = []
    for p0, p1 in ps0:
        if ps and p0 - ps[-1][1] < 0.1:
            ps[-1] = (ps[-1][0], p1)
        else:
            ps.append((p0, p1))
    n = len(words)
    gs = [(words[i]["e"] + words[i + 1]["s"]) / 2 for i in range(n - 1)]
    kind = [2 if words[i]["w"].rstrip("“”\"").endswith((".", "?", "!")) else 1 if (words[i]["w"].rstrip("“”\"").endswith((",", ":")) or words[i + 1]["w"].startswith("„")) else 0 for i in range(n - 1)]
    MISS_GAP = (0.0, 0.35, 1.2)
    MATCH = (0.45, 0.12, 0.0)
    m = len(ps)
    INF = 1e9
    D = np.full((m + 1, n), INF)
    B = np.zeros((m + 1, n), dtype=np.int8)
    D[0, 0] = 0.0
    for j in range(1, n):
        D[0, j] = D[0, j - 1] + MISS_GAP[kind[j - 1]]
        B[0, j] = 1
    for i in range(1, m + 1):
        p0, p1 = ps[i - 1]
        c, dur = (p0 + p1) / 2, p1 - p0
        skip = 0.3 + 2.0 * dur
        D[i, 0] = D[i - 1, 0] + skip
        B[i, 0] = 2
        for j in range(1, n):
            g = j - 1
            best, how = D[i, j - 1] + MISS_GAP[kind[g]], 1
            v = D[i - 1, j] + skip
            if v < best:
                best, how = v, 2
            d = abs(gs[g] - c)
            if d < 1.0:
                v = D[i - 1, j - 1] + d + MATCH[kind[g]] * (1.0 if dur < 0.25 else 3.0)
                if v < best:
                    best, how = v, 3
            D[i, j], B[i, j] = best, how
    anchors = {}
    i, j = m, n - 1
    while i > 0 or j > 0:
        how = B[i, j]
        if how == 3:
            anchors[j - 1] = ps[i - 1]
            i, j = i - 1, j - 1
        elif how == 2:
            i -= 1
        else:
            j -= 1
    cp = [(words[0]["s"], on)]
    for g, (p0, p1) in sorted(anchors.items()):
        cp.append((words[g]["e"], p0))
        cp.append((words[g + 1]["s"], p1))
    cp.append((words[-1]["e"], off))
    xs = np.array([c[0] for c in cp])
    ys = np.array([c[1] for c in cp])
    order = np.argsort(xs, kind="stable")
    xs, ys = xs[order], ys[order]
    ys = np.maximum.accumulate(ys)
    f = lambda t: float(np.interp(t, xs, ys))
    out = []
    for i, w in enumerate(words):
        s = anchors[i - 1][1] if (i - 1) in anchors else f(w["s"])
        e = anchors[i][0] if i in anchors else f(w["e"])
        out.append({"w": w["w"], "s": round(s, 3), "e": round(max(e, s + 0.05), 3)})
    # a sentence after a pause usually starts with a breath (0.2-0.4 s of quiet noise): the word itself starts at the first
    # loud or voiced 20 ms after it ("s", for the subtitles); the piece is still cut in at the pause's end ("c", breath kept)
    starts = {0: on, **{g + 1: p1 for g, (p0, p1) in anchors.items()}}
    for k, p1 in starts.items():
        out[k]["c"] = round(p1, 3)
        out[k]["s"] = round(min(onset(a, p1), out[k]["e"] - 0.08), 3) if out[k]["e"] - 0.08 > p1 else out[k]["s"]
    lost = [words[g]["w"] for g in range(n - 1) if kind[g] == 2 and g not in anchors]
    if lost:
        print(f"refine: sentence ends with no silence anchored: {lost}")
    return out, len(anchors)


NW, NANC = refine(NW0, NA)
# two word starts read off the take's envelope by hand (31 Oct; no pause between them to anchor on): „ყველაფერი" (the „ყ" burst)
# and „ჩანს" (the „ჩ" affricate at 46.12, its „ს" ends 46.38)
for k_, t_ in {90: 45.56, 91: 46.10}.items():
    NW[k_]["s"] = t_
    NW[k_ - 1]["e"] = min(NW[k_ - 1]["e"], t_)
SW, SANC = refine(SW0, SE)
# the stand-in in the seller's third line (measured 2026-10-30 on its band energies: the vowel of „შე" ends 7.01 s, the „ს" of
# „საყვარელო" starts 7.02; its „ო" is gone by 7.51 and the „ს" of „სუფთა" starts 7.52): cut out whole, the bleep laid there
STANDIN = (7.015, 7.515)
if not (SW[12]["s"] < STANDIN[0] < SW[14]["s"] + 0.25):
    sys.exit(f"seller: the stand-in word moved (a new take? measure it again): {SW[12]} {SW[13]} {SW[14]}")


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
        self.air = np.zeros(self.n)
        self.words = []
        self.bleeps = []

    def put(self, track, x, at, gain=1.0):
        s = int(round(at * SR))
        if s < 0:
            x, s = x[-s:], 0
        e = min(self.n, s + len(x))
        getattr(self, track)[s:e] += x[: e - s] * gain


VO_LUFS = -18.0
RISE_CLEAR = 0.66
REF100 = None
VPEAK = None
BLEEPS = []
BLEEP_RMS = -10.0  # dBFS on the mastered mix: the old promo's bleeps sat at -15 .. -9, the seller's line 50 ms RMS p90 is about -8


def sfx_gain(x, volume=0.5, closer=0.0):
    want = REF100 - 9 + 20 * np.log10(max(volume, 1e-3) / 0.5) + closer
    want = min(want, REF100 - 4)
    g = 10 ** ((want - peak100(x)) / 20)
    pk = np.max(np.abs(x)) * g + 1e-9
    return g * min(1.0, 10 ** ((VPEAK - 4) / 20) / pk)


def bleep_tone(sec):
    t = np.arange(int(sec * SR)) / SR
    x = np.sin(2 * np.pi * 1000 * t)
    n = int(0.004 * SR)
    x[:n] *= np.linspace(0, 1, n)
    x[-n:] *= np.linspace(1, 0, n)
    return (x * 10 ** (-3 / 20)).astype(np.float32)


# the narrator's sentences (word index ranges, voices.NARR_LINES order) and each one's subtitle chunks (index ranges)
CHUNKS = {
    0: [(0, 2), (3, 4)],
    1: [(5, 8), (9, 10)],
    2: [(11, 13), (14, 15), (16, 19)],
    3: [(20, 22), (23, 26), (27, 28), (29, 30), (31, 32)],
    4: [(33, 34), (35, 36)],
    5: [(37, 39), (40, 41), (42, 44), (45, 46), (47, 48)],
    6: [(49, 51), (52, 54), (55, 56)],  # 57..60: the card is the line
    7: [(61, 63), (64, 65), (66, 67), (68, 69)],
    8: [(70, 73), (74, 77)],
    9: [(78, 80), (81, 82), (83, 86)],
    10: [(87, 88)],  # v3: „ახლა ყველაფერი ჩანს." (89..91) is cut out of the take: it overclaimed (engine and emissions only)
    11: [(92, 93), (94, 98), (99, 100)],
    12: [(101, 102)],
    13: [(103, 104), (105, 106), (107, 108), (109, 111)],
    14: [(112, 113), (114, 115), (116, 117)],
    15: [(118, 120), (121, 124), (125, 127), (128, 129)],
    16: [(130, 132), (133, 134), (135, 136)],
}
SENT = [(0, 4), (5, 10), (11, 19), (20, 32), (33, 36), (37, 48), (49, 60), (61, 69), (70, 77), (78, 86), (87, 91), (92, 100), (101, 102), (103, 111), (112, 117), (118, 129), (130, 136), (137, 142), (143, 147), (148, 154)]
SLINE = [(0, 4), (5, 8), (9, 15), (16, 19)]

# the dark shots (a white subtitle); lib.ts DARK is the same list
DARK = {"night", "cluster", "plug", "week", "again", "bay"}


def build():
    global REF100, VPEAK
    ev, shots, subs = {}, [], []
    ng = 10 ** ((VO_LUFS - lufs(NA)) / 20)
    sg = 10 ** ((VO_LUFS + 0.5 - lufs(SE)) / 20)
    REF100 = peak100(NA * ng)
    VPEAK = 20 * np.log10(np.percentile(np.abs(NA * ng), 99.95))
    mx = Mix(130)
    cues = []

    def sfx(name, at, volume=0.5, closer=0.0, dur=None):
        x = own(name) if name in OWN else kit(name)
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

    def shot(name, s, e, **kw):
        shots.append({"id": name, "from": round(s, 3), "to": round(e, 3), **kw})

    nbase = {}

    def npiece(a, b, at, upto=None):
        """sentences a..b of the one take laid whole, the first word on `at` (`upto`: end at that word instead)"""
        i0, i1 = SENT[a][0], (SENT[b][1] if upto is None else upto)
        s0, e0 = NW[i0]["s"], NW[i1]["e"]
        c0 = min(s0, NW[i0].get("c", s0))
        mx.put("voice", cut(NA, c0 - 0.06, e0 + 0.14) * ng, at - (s0 - c0) - 0.06)
        for k in range(i0, i1 + 1):
            nbase[k] = at - s0
        for k in range(a, b + 1):
            mx.words.append((at + NW[SENT[k][0]]["s"] - s0, at + NW[min(i1, SENT[k][1])]["e"] - s0))
        return at + e0 - s0

    ns = lambda k: NW[k]["s"] + nbase[k]
    ne = lambda k: NW[k]["e"] + nbase[k]
    nts = lambda k: ns(SENT[k][0])
    nte = lambda k: ne(SENT[k][1])

    def nsubs(k, after=None):
        for m, (i, j) in enumerate(CHUNKS.get(k, [])):
            text = " ".join(NW[x]["w"] for x in range(i, j + 1))
            words = [round(ns(x), 3) for x in range(i, j + 1)]
            s = words[0]
            if after is not None and m == 0 and s < after:
                s = after
            subs.append({"text": text, "start": round(s, 3), "end": round(ne(j), 3), "tone": "ink", "words": words})

    sbase = {}

    def spiece(n, at, gain_db=0.0, upto=None, bleep=False):
        """the seller's line n (its first word on `at`); with `bleep` the stand-in is cut out and the bleep laid in its place"""
        i0, i1 = SLINE[n]
        if upto is not None:
            i1 = upto
        s0, e0 = SW[i0]["s"], SW[i1]["e"]
        x = cut(SE, s0 - 0.05, e0 + 0.12) * sg * 10 ** (gain_db / 20)
        if bleep:
            a_, b_ = int((STANDIN[0] - (s0 - 0.05)) * SR), int((STANDIN[1] - (s0 - 0.05)) * SR)
            k_ = int(0.004 * SR)
            x[a_ - k_: a_] *= np.linspace(1, 0, k_)
            x[a_:b_] = 0.0
            x[b_: b_ + k_] *= np.linspace(0, 1, k_)
            bl = bleep_tone(STANDIN[1] - STANDIN[0])
            at_b = at + STANDIN[0] - s0
            # v3 (31 Oct, the reviewers: laid into the voice bus, the bleep swelled 14 dB as the compressors recovered from „შე"):
            # it is added after the voice compressors, flat, at the speech's own loud level (set in build())
            mx.bleeps.append((bl, at_b))
            ev["bleep"] = round(at_b, 3)
        mx.put("voice", x, at - 0.05)
        for k in range(i0, i1 + 1):
            sbase[k] = at - s0
        mx.words.append((at, at + e0 - s0))
        return at + e0 - s0

    ss = lambda k: SW[k]["s"] + sbase[k]
    se = lambda k: SW[k]["e"] + sbase[k]

    def ssub(i, j, first=False, last=False, censor=False, **kw):
        idx = list(range(i, j + 1))
        toks = [("#@%?" if (censor and x == 13) else SW[x]["w"]) for x in idx]
        if first:
            toks[0] = "„" + toks[0]
        if last:
            toks[-1] = toks[-1] + "“"
        words = [(ev["bleep"] if (censor and x == 13) else round(ss(x), 3)) for x in idx]
        subs.append({"text": " ".join(toks), "start": words[0], "end": round(se(j), 3), "tone": "ink", "words": words, **({"censor": True} if censor else {}), **kw})

    # ================= HOOK: the seller slaps the bonnet: „ქალს ჰყავდა. მარტო სამსახურში დადიოდა." =================
    t0 = 0.12
    e = spiece(0, t0)
    ev["slap"] = 0.07
    sfx("real-clunk", 0.07, 0.34, dur=0.5)
    ev["slap2"] = ss(2) - 0.05
    sfx("real-clunk", ev["slap2"], 0.2, dur=0.5)
    # „ქალს ჰყავდა." is the hook's own headline (big type in the top third, whole on frame 0): no subtitle under it
    ev["hookWords"] = [round(ss(0), 3), round(ss(1), 3)]
    ssub(2, 4, first=True, last=True)
    hook_end = e + 0.3
    cut1 = ss(2) - 0.12
    shot("hook", 0, cut1)
    shot("hook2", cut1, hook_end)

    # ================= piece A: „ამ ქალს ყველა გამყიდველი იცნობს." three sellers, three cars, three slaps =================
    TA = hook_end + 0.1
    npiece(0, 0, TA)
    nsubs(0)
    ev["slaps"] = [nts(0) + 0.1, nts(0) + 0.75]
    for i, x_ in enumerate(ev["slaps"]):
        sfx("real-clunk", x_, 0.22 - 0.05 * i, dur=0.45)
    sellers_end = nte(0) + 0.3
    shot("sellers", hook_end, sellers_end)

    # ================= seller: „ნახე, ჩეკიც არ ანთია!" the cluster, the lamp dark, a marker circle =================
    t = sellers_end + 0.15
    e = spiece(1, t)
    ssub(5, 8, first=True, last=True)
    ev["circle"] = ss(7)
    sfx("asmr-sub", ev["circle"], 0.2)
    cluster_end = e + 0.3
    shot("cluster", sellers_end, cluster_end)

    # ================= piece B: night, xray, pocket, plug =================
    TB = cluster_end + 0.15
    npiece(1, 3, TB)
    nsubs(1)
    ev["off"] = ns(10) - 0.05
    sfx("asmr-tap", ev["off"], 0.3)
    night_end = ns(11) - 0.15
    shot("night", cluster_end, night_end)
    nsubs(2)
    ev["lampOff"] = ns(12)
    ev["fault"] = ns(16)
    sfx("asmr-shimmer", ev["fault"] - 0.1, 0.18)
    ev["arrow"] = ns(18)
    xray_end = ns(20) - 0.15
    shot("xray", night_end, xray_end)
    nsubs(3)
    ev["adapter"] = ns(22)
    sfx("cc0-cloth", ev["adapter"] - 0.1, 0.25)
    ev["chip"] = ns(24) + 0.1
    sfx("asmr-pop", ev["chip"], 0.26)
    pocket_end = ns(27) - 0.12
    shot("pocket", xray_end, pocket_end)
    ev["knee"] = ns(29)
    sfx("asmr-sub", ev["knee"], 0.18)
    ev["click"] = ne(32) - 0.15
    sfx("cc0-latch", ev["click"], 0.42)
    ev["led"] = ev["click"] + 0.35
    sfx("asmr-haptic-light", ev["led"], 0.2)
    plug_end = ne(32) + 0.5
    shot("plug", pocket_end, plug_end)

    # ================= seller (bleeped): „რას ეძებ მანდ, შე #@%? სუფთა მანქანაა!" =================
    t = plug_end + 0.12
    e = spiece(2, t, gain_db=1.0, bleep=True)
    ssub(9, 13, first=True, censor=True)
    ssub(14, 15, last=True)
    bleep_end = e + 0.3
    shot("bleep", plug_end, bleep_end)

    # ================= piece C: hub, selfcheck, ring, cleared, honest =================
    TC = bleep_end + 0.75
    npiece(4, 7, TC)
    ev["rise"] = bleep_end + 0.05
    sfx("asmr-swell", ev["rise"], 0.22)
    nsubs(4, after=ev["rise"] + RISE_CLEAR)
    ev["tap"] = ns(35) + 0.1
    sfx("asmr-tap", ev["tap"], 0.38)
    sfx("asmr-haptic-light", ev["tap"] + 0.02, 0.24)
    hub_end = ns(37) - 0.15
    shot("hub", bleep_end, hub_end)
    nsubs(5)
    ev["ticks"] = [ns(38) + 0.16 * i for i in range(8)]
    for x_ in ev["ticks"]:
        sfx("asmr-ui-tick-soft", x_, 0.14)
    ev["wipe"] = ns(44) - 0.1
    sfx("cc0-card-slide", ev["wipe"], 0.3)
    selfcheck_end = ns(49) - 0.15
    shot("selfcheck", hub_end, selfcheck_end)
    nsubs(6)
    ev["ring"] = ns(49) + 0.1
    sfx("asmr-count-roll", ev["ring"], 0.12, dur=1.6)
    ev["half"] = ns(52)
    ring_end = ns(57) - 0.12
    shot("ring", selfcheck_end, ring_end)
    ev["card"] = ring_end + 0.02
    sfx("cc0-card-slide", ev["card"], 0.3)
    ev["cardWords"] = [round(ns(k), 3) for k in range(57, 61)]
    for x_ in ev["cardWords"]:
        sfx("asmr-land", x_, 0.24)
    cleared_end = ns(61) - 0.12
    shot("cleared", ring_end, cleared_end)
    nsubs(7)
    ev["q"] = ns(68)
    sfx("asmr-pop", ev["q"], 0.22)
    honest_end = nte(7) + 0.3
    shot("honest", cleared_end, honest_end)

    # ================= seller: „აკუმულატორი? ჰო, აკუმულატორი შევცვალე!" =================
    t = honest_end + 0.1
    e = spiece(3, t)
    ssub(16, 16, first=True)
    ssub(17, 19, last=True)
    ev["battery"] = ss(18)
    sfx("asmr-pop", ev["battery"], 0.32)
    battery_end = e + 0.3
    shot("battery", honest_end, battery_end)

    # ================= piece D: walk, week =================
    TD = battery_end + 0.2
    npiece(8, 9, TD)
    nsubs(8)
    walk_end = ns(78) - 0.15
    shot("walk", battery_end, walk_end)
    nsubs(9)
    d0, d1 = ns(78), nte(9) - 0.2
    ev["days"] = [round(d0 + (d1 - d0) * i / 6, 3) for i in range(7)]
    for x_ in ev["days"]:
        sfx("asmr-flap", x_, 0.1)
    ev["relight"] = ev["days"][1] + 0.05
    sfx("chime", ev["relight"], 0.16)
    sfx("real-pass-by", ns(78), 0.12, dur=2.4)
    week_end = nte(9) + 0.25
    shot("week", walk_end, week_end)

    # ================= piece D2 (the take's own pause, 0.45 s longer: the phone rises first): again .. leave =================
    # v3 (31 Oct): „ახლა ყველაფერი ჩანს." overclaimed (the scanner reads the engine and emissions only) and is cut out of the
    # take, no re-voice: „ისევ ამოწმებ." runs into „ჩეკი ანთია" over the take's own sentence pause before „ჩეკი" (0.51 s)
    TD2 = week_end + 0.72
    e10 = npiece(10, 10, TD2, upto=88)
    npiece(11, 15, e10 + (NW[92]["s"] - NW[91]["e"]) + 0.04)
    ev["again"] = week_end + 0.02
    sfx("asmr-swell", ev["again"], 0.2)
    nsubs(10, after=ev["again"] + RISE_CLEAR)
    ev["scanLift"] = ns(87)
    sfx("asmr-check", ev["scanLift"] + 0.25, 0.12)
    again_end = ns(92) - 0.15
    shot("again", week_end, again_end)
    nsubs(11)
    ev["lampCard"] = ns(92)
    ev["km"] = ns(97)
    sfx("asmr-sub", ev["km"], 0.24)
    lamp_end = ns(101) - 0.1
    shot("lamp240", again_end, lamp_end)
    nsubs(12)
    ev["whistle"] = ns(101)
    work_end = ns(103) - 0.15
    shot("work", lamp_end, work_end)
    nsubs(13)
    nsubs(14)
    ev["code1"] = ns(107)
    ev["code2"] = ns(110)
    sfx("asmr-flap-roll", ev["code1"] - 0.1, 0.2)
    sfx("asmr-flap-roll", ev["code2"] - 0.1, 0.2)
    ev["ready"] = ns(112) - 0.2
    ev["evap"] = ns(116)
    sfx("asmr-sub", ev["evap"], 0.22)
    codes_end = ns(118) - 0.15
    shot("codes", work_end, codes_end)
    nsubs(15)
    ev["tick"] = ne(120) - 0.1
    sfx("asmr-check", ev["tick"], 0.22)
    bay_from = ns(121) - 0.14
    shot("leave", codes_end, bay_from)
    ev["show"] = ns(125)
    sfx("asmr-pop", ev["show"], 0.16)
    leave_end = nte(15) + 0.35
    shot("bay", bay_from, leave_end)

    # ================= the seller, far: „ქალს ჰყავდა..." to the next buyer (the hook's own words) =================
    t = leave_end + 0.3
    ev["slap3"] = t - 0.14
    sfx("real-clunk", ev["slap3"], 0.16, dur=0.45)
    e = spiece(0, t, gain_db=-5.0, upto=1)
    subs.append({"text": "„ქალს ჰყავდა...“", "start": round(ss(0), 3), "end": round(se(1), 3), "tone": "ink", "words": [round(ss(0), 3), round(ss(1), 3)]})
    callback_end = e + 0.6
    shot("callback", leave_end, callback_end)

    # ================= piece E: fleet, the end card =================
    TE = callback_end + 0.2
    npiece(16, 19, TE)
    nsubs(16)
    ev["fleet"] = [ns(130) + 0.3 * i for i in range(5)]
    for x_ in ev["fleet"]:
        sfx("asmr-check", x_ + 0.2, 0.14)
    ev["inf"] = ns(132)
    sfx("asmr-land", ev["inf"], 0.26)
    fleet_end = ns(137) - 0.25
    shot("fleet", callback_end, fleet_end)
    t = fleet_end
    sfx("asmr-whoomp", t + 0.05, 0.28)
    ev["mark"] = t + 0.12
    sfx("cc0-wood-tap", ev["mark"], 0.22)
    ev["badge1"] = ns(138)
    ev["badge2"] = ns(141)
    sfx("cc0-click-soft", ev["badge1"], 0.34)
    sfx("cc0-click-soft", ev["badge2"], 0.34)
    ev["free"] = [round(ns(k), 3) for k in range(143, 148)]
    ev["ask"] = [round(ns(k), 3) for k in range(148, 155)]
    ev["vinari"] = round(ns(150), 3)
    sfx("cc0-wood-tap", ev["vinari"] + 0.15, 0.2)
    ev["endHit"] = ne(154) + 0.05
    sfx("asmr-end", ev["endHit"], 0.1)
    total = ne(154) + 0.85
    shot("end", t, total)

    flush()
    said = np.zeros(mx.n)
    for s_, e_ in mx.words:
        said[int(s_ * SR): int(e_ * SR)] = 1.0
    w = int(0.05 * SR)
    said = np.convolve(said, np.ones(w) / w, mode="same")
    w = int(0.08 * SR)
    duck = 10 ** (-8 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    vbus = compress(compress(mx.voice, VO_LUFS - 7, ratio=3.5, attack=0.004, release=0.12), VO_LUFS - 12, ratio=2.2, attack=0.01, release=0.25)
    vpk = 20 * np.log10(np.percentile(np.abs(vbus[np.abs(vbus) > 1e-4]), 99.9))
    wduck = 10 ** (-10 * np.convolve(said, np.ones(w) / w, mode="same") / 20)
    fxbus = limiter(mx.fx, vpk + 2, look=0.001, release=0.03) * 10 ** (-4 / 20) * wduck
    if os.environ.get("OBD_DEBUG"):
        for sec in range(int(total) + 1):
            a_, b_ = int(sec * SR), int((sec + 1) * SR)
            row = [f"{sec:3d}s"]
            for nm, tr in (("voice", vbus), ("fx", fxbus), ("air", mx.air * duck)):
                v = peak100(tr[a_:b_]) - REF100
                row.append(f"{nm} {v:6.1f}" if v > -60 else f"{nm}    -  ")
            print("  ".join(row))
    out = vbus + fxbus + mx.air * duck * 10 ** (-3 / 20)
    # v3: the bleeps go on after the master (main), flat: the voice bus and the master's limiter never touch them
    BLEEPS.extend(mx.bleeps)
    out = out[: int(total * SR)]
    tail = int(0.3 * SR)
    out[-tail:] *= np.linspace(1, 0, tail) ** 2
    shots.sort(key=lambda s: s["from"])
    for sb in subs:
        under = [s_ for s_ in shots if s_["from"] <= sb["start"] + 0.07 < s_["to"]]
        if under:
            sb["tone"] = "white" if under[-1]["id"] in DARK else "ink"
    return out, {"total": round(total, 3), "fps": 30, "shots": shots, "events": ev, "subs": subs, "music": {}}


AIR = {
    "asmr-slide": -12,
    "cc0-card-slide": -11,
    "asmr-air": -12,
    "asmr-swell": -12,
    "asmr-whoomp": -12,
    "asmr-sub": -8,
    "asmr-land": -6,
    "asmr-flap-roll": -8,
    "real-pass-by": -6,
}
OWN = {"bleep", "chime"}


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
    from scipy import signal
    from scipy.ndimage import minimum_filter1d

    up = np.abs(signal.resample_poly(x, 4, 1))
    need = np.minimum(1.0, 10 ** (ceiling_db / 20) / np.maximum(up, 1e-9))
    need = need[: len(x) * 4].reshape(-1, 4).min(axis=1)
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
    from scipy import signal

    up = signal.resample_poly(x, 4, 1)
    c = 10 ** (ceil_db / 20)
    k = knee * c
    a = np.abs(up)
    y = np.where(a <= k, up, np.sign(up) * (k + (c - k) * np.tanh((a - k) / (c - k))))
    return signal.resample_poly(y, 1, 4)[: len(x)]


def master(x, path, target=-10.5, tp=-1.6):
    """One gain to target LUFS, then the limiter only where the true peak needs it; aimed again by the miss."""
    tmp = path + ".m.wav"
    write_wav(tmp, np.stack([x, x], axis=1), bits=24)
    i, p = loudness(tmp)
    g0 = target - i
    g = g0 + 1.5
    for attempt in range(8):
        y = limiter(soft_clip(limiter(x * 10 ** (g / 20), tp - 0.2, look=0.005, release=0.12), tp - 0.3, knee=0.8), tp - 0.4)
        write_wav(tmp, np.stack([y, y], axis=1), bits=24)
        i2, p2 = loudness(tmp)
        print(f"master {os.path.basename(path)}: {i:.2f} -> {i2:.2f} LUFS, true peak {p2:.2f} dBTP (gain {g:+.2f} dB)")
        if (abs(i2 - target) <= 0.15 or g >= g0 + 4.5) and p2 <= tp:
            break
        g = min(g0 + 4.5, g + (target - i2) * 1.1)
    write_wav(path, np.stack([y, y], axis=1), bits=24)
    os.remove(tmp)
    return i2, p2


def main():
    print(f"word times: narrator {NANC} silences anchored, seller {SANC}")
    x, tl = build()
    save_json(TL, tl)
    print(f"timeline: {tl['total']:.2f} s, {len(tl['shots'])} shots, {len(tl['subs'])} subtitle lines")
    for s in tl["shots"]:
        print(f"  {s['id']:10s} {s['from']:6.2f} - {s['to']:6.2f}  ({s['to'] - s['from']:.2f})")
    if "--words" in sys.argv:
        for i, w in enumerate(NW):
            print(f"  n{i:3d} {NW0[i]['s']:6.2f} -> {w['s']:6.2f} {w['w']}")
        for i, w in enumerate(SW):
            print(f"  s{i:3d} {SW0[i]['s']:6.2f} -> {w['s']:6.2f} {w['w']}")
    if "--no-audio" in sys.argv:
        return
    path = os.path.join(OUT, "mix.wav")
    master(x, path, target=-10.5, tp=-1.6)
    # the last dB: the studio's own meter and limiter (video-studio/tools/master.py) with a gain bisection to -10.5 LUFS, true
    # peak -1.7 dBTP (this plan's limiter stalls near -11.5 on this film's dense voice)
    import subprocess
    tmp = path + ".m2.wav"
    r = subprocess.run([sys.executable, os.path.join(os.path.dirname(os.path.abspath(__file__)), "master2.py"), path, tmp, "-10.5", "-2.4"], capture_output=True, text=True)
    print(r.stdout.strip() or r.stderr[-800:])
    if r.returncode == 0:
        y = read_wav(tmp)
        os.remove(tmp)
        write_wav(path, np.stack([y, y], axis=1), bits=24)
    # v3 (31 Oct, the reviewers: the bleep swelled as the compressors and the limiter recovered from „შე"): the 1 kHz bleep is
    # laid on the mastered mix, flat at BLEEP_RMS, exactly in the stand-in's place (the voice there is silence)
    y = read_wav(path)
    y = y.mean(axis=1) if y.ndim > 1 else y
    for bl, at_b in BLEEPS:
        x_ = bl / np.sqrt(np.mean(bl[int(0.01 * SR):-int(0.01 * SR)] ** 2)) * 10 ** (BLEEP_RMS / 20)
        i0 = int(round(at_b * SR))
        y[i0: i0 + len(x_)] += x_[: len(y) - i0]
    write_wav(path, np.stack([y, y], axis=1), bits=24)
    print("mix.wav:", loudness(path))


if __name__ == "__main__":
    main()
