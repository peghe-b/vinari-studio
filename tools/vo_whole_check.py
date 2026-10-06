#!/usr/bin/env python3
"""Offline check of tools/vo.py's one-request-per-film Gemini mode ("geminiSplit": "whole"). No network,
no key, no Gemini request: it only reads the real takes already in tools/.vo_cache.

    python3 tools/vo_whole_check.py                     joined films: border errors, sure and not sure
    python3 tools/vo_whole_check.py --films 200 --seed 3
    python3 tools/vo_whole_check.py --timeline v11-vin-photo   one real film through vo.build
    python3 tools/vo_whole_check.py --takes             every real cached whole-film take: old cut vs new timing

Since 2026-10-07 a whole take is the film's voice as it came (vo.take_views): it is never cut apart and never
falls back to one request per sentence, so a split that is not sure is still used, and only its subtitles can
be off. A whole-film take is made here by joining real per-sentence Gemini clips (the same voice and model) with
pauses between them: "natural" 0.25-0.7 s and "tight" 0.12-0.2 s (shorter than many pauses inside a sentence).
take_views must find every sentence, and pause_split every "|" chunk, where the sentence mode finds them on the
clip on its own. Reported, for the sure splits and the rest apart: the border errors in ms (median, p95, max)
and the films with a sentence border on the wrong pause (more than 0.3 s off: must be 0 for the sure ones).

--timeline <id>: the film's own sentence clips, in order, joined with natural pauses, go through vo.build
with gemini_request replaced (the whole text gets the joined clip); the timeline's structure is compared with
public/vo/<id>/timeline.json (its times differ by design: the old one was re-spaced). Writes only to a temp folder.

--takes: every real whole-film take in the cache (until 2026-10-07 one sentence per line, under the note of
then): where the old cut (whole_cut, when it was sure) put each sentence and chunk, and where take_views puts
them in the same take. Nothing is written.

The clips are found by their cache keys: every sentence of every spec in specs/, in this repo's git
history and, when this folder sits inside the Vinari repo, in that repo's video-studio/specs history.
"""
import argparse
import array
import contextlib
import glob
import io
import json
import os
import random
import re
import shutil
import statistics
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
os.environ.update(GEMINI_BASE_URL="http://127.0.0.1:9", GEMINI_API_KEY="offline", GEMINI_KEY_FILE=os.devnull)
sys.path.insert(0, HERE)
import vo  # noqa: E402

SR = vo.SR


def git(repo, *args):
    r = subprocess.run(["git", "-C", repo, *args], capture_output=True, text=True)
    return r.stdout if r.returncode == 0 else ""


def spec_versions():
    """Every version of every spec: the working tree, this repo's history, the Vinari repo's history."""
    out = []
    for f in glob.glob(os.path.join(ROOT, "specs", "*.json")):
        try:
            out.append(json.load(open(f, encoding="utf-8")))
        except ValueError:
            pass
    repos = [(ROOT, "specs/")]
    parent = git(os.path.dirname(ROOT), "rev-parse", "--show-toplevel").strip()
    if parent and os.path.realpath(parent) != os.path.realpath(ROOT):
        repos.append((parent, os.path.relpath(ROOT, parent) + "/specs/"))
    for repo, prefix in repos:
        for c in git(repo, "log", "--format=%h", "--", prefix).split():
            for f in git(repo, "ls-tree", "--name-only", c, prefix).splitlines():
                if f.endswith(".json"):
                    try:
                        out.append(json.loads(git(repo, "show", f"{c}:{f}")))
                    except ValueError:
                        pass
    return out


def sentences_of(spec):
    """The sentence groups of a spec, as vo.build cuts them: [chunk texts]."""
    out = []
    for b in spec.get("beats", []):
        chunks, cur = b.get("say", "").split("|"), []
        for ci, ch in enumerate(chunks):
            cur.append(chunks[ci].strip())
            if re.search(r"[.?!]\s*$", ch.strip()) or ci == len(chunks) - 1:
                out.append(cur)
                cur = []
    return out


def discover():
    """{cache path: {model, voice, chunks}} for every cached per-sentence Gemini clip of a known text."""
    specs = spec_versions()
    texts = {}
    styles = {vo.GEMINI_STYLE, *vo.GEMINI_STYLES_BEFORE}
    for s in specs:
        for x in [s] + s.get("beats", []):
            if isinstance(x, dict) and x.get("style"):
                styles.add(x["style"])
        for chunks in sentences_of(s):
            texts.setdefault(" ".join(chunks), chunks)
    models = set(vo.GEMINI_CHAIN) | {s["geminiModel"] for s in specs if s.get("geminiModel")}
    found = {}
    for text, chunks in texts.items():
        for model in models:
            for voice in ("gemini:Algieba", "gemini:Achernar"):
                for style in styles:
                    p = vo.gemini_path(text, voice, model, style)
                    if os.path.exists(p):
                        found[p] = {"model": model, "voice": voice, "chunks": chunks, "text": text}
    return found


def load(path, meta, cache={}):
    if path not in cache:
        pcm = vo.read_wav_bytes(open(path, "rb").read())
        on, off = vo.speech_bounds(pcm)
        spans, _ = vo.pause_split(pcm, meta["chunks"])
        cache[path] = dict(meta, path=path, pcm=pcm, on=on, off=off, spans=spans)
    return cache[path]


def join(clips, gaps):
    """A whole-film take: every clip's speech, each pause made of the clip before's own tail and the
    clip after's own lead (zeros where a clip has too little). -> pcm, where each clip's 0 s lands."""
    out, offs = array.array("h"), []
    for i, c in enumerate(clips):
        pcm = c["pcm"]
        a = 0 if i == 0 else int((c["on"] - gaps[i - 1] / 2) * SR)
        if a < 0:
            out += array.array("h", bytes(-2 * a))
            a = 0
        offs.append(len(out) / SR - a / SR)
        z = len(pcm) if i == len(clips) - 1 else int((c["off"] + gaps[i] - gaps[i] / 2) * SR)
        out += pcm[a:min(z, len(pcm))]
        if z > len(pcm):
            out += array.array("h", bytes(2 * (z - len(pcm))))
    return out, offs


def check_film(clips, gaps):
    """-> (sentence border errors, chunk border errors, wrong split?, sure?, why): the film's joined take timed by
    vo.take_views, as vo.py now times every whole take (no fallback)."""
    pcm, offs = join(clips, gaps)
    with contextlib.redirect_stderr(io.StringIO()):  # its "listen:" notes
        take, why = vo.take_views(pcm, [c["chunks"] for c in clips], ["check"] * len(clips))
    s_err, c_err, wrong = [], [], False
    for i, (c, v) in enumerate(zip(clips, take.views)):
        got = v["spans"]
        known = [(offs[i] + a, offs[i] + b) for a, b in c["spans"]]
        edges = ([abs(got[0][0] - known[0][0])] if i else []) + ([abs(got[-1][1] - known[-1][1])] if i < len(clips) - 1 else [])
        s_err += edges
        wrong |= any(e > 0.3 for e in edges)
        c_err += [abs(g[0] - k[0]) for g, k in zip(got[1:], known[1:])] + [abs(g[1] - k[1]) for g, k in zip(got[:-1], known[:-1])]
    return s_err, c_err, wrong, why is None, why


def ms(xs):
    if not xs:
        return "none"
    xs = sorted(xs)
    return (f"median {statistics.median(xs) * 1000:.0f} ms, p95 {xs[int(0.95 * (len(xs) - 1))] * 1000:.0f} ms, "
            f"max {xs[-1] * 1000:.0f} ms ({len(xs)} borders)")


def run_films(clips_by_model, n_films, seed, lo, hi, label):
    rng = random.Random(seed)
    models = sorted(m for m, ks in clips_by_model.items() if len(ks) >= 5)
    out = {True: dict(n=0, S=[], C=[], wrong=0), False: dict(n=0, S=[], C=[], wrong=0)}
    why_count = {}
    for f in range(n_films):
        ks = clips_by_model[models[f % len(models)]]
        clips = rng.sample(ks, rng.randint(5, min(8, len(ks))))
        gaps = [rng.uniform(lo, hi) for _ in clips[1:]]
        S, C, wrong, sure, why = check_film(clips, gaps)
        o = out[sure]
        o["n"] += 1
        o["S"] += S
        o["C"] += C
        o["wrong"] += wrong
        if not sure:
            kind = re.sub(r"\d+(\.\d+)?", "N", why.split(":")[0].split(";")[0])
            why_count[kind] = why_count.get(kind, 0) + 1
    print(f"{label}: {n_films} films, every one kept as one take; {out[False]['n']} not sure ({out[False]['n'] / n_films:.0%})")
    for sure, name in ((True, "sure"), (False, "not sure")):
        o = out[sure]
        print(f"  {name}: {o['wrong']} of {o['n']} with a sentence border on the wrong pause (> 0.3 s off)")
        print(f"    sentence borders  {ms(o['S'])}")
        print(f"    chunk borders     {ms(o['C'])}")
    for k, v in sorted(why_count.items(), key=lambda x: -x[1]):
        print(f"  not sure x{v}: {k}")
    return dict(films=n_films, unsure=out[False]["n"], wrong=out[True]["wrong"], wrong_unsure=out[False]["wrong"])


def timeline_check(vid, found, seed):
    spec_path = vo.spec_file(vid)
    spec = json.load(open(spec_path, encoding="utf-8"))
    old = json.load(open(os.path.join(vo.VO_OUT, spec["id"], "timeline.json"), encoding="utf-8"))
    model = spec.get("geminiModel") or old.get("model")
    voice = spec["voice"]
    sents = sentences_of(spec)
    # the film's default note: today's, or an earlier one its clips were voiced with (vo.GEMINI_STYLES_BEFORE)
    default = next((s for s in (vo.GEMINI_STYLE, *vo.GEMINI_STYLES_BEFORE)
                    if all(os.path.exists(vo.gemini_path(" ".join(t), voice, model, spec.get("style", s))) for t in sents)),
                   vo.GEMINI_STYLE)
    style = spec.get("style", default)
    paths = [vo.gemini_path(" ".join(t), voice, model, style) for t in sents]
    missing = [" ".join(t) for t, p in zip(sents, paths) if not os.path.exists(p)]
    if missing:
        raise SystemExit(f"{vid}: no cached {model} clip for: {missing}")
    rng = random.Random(seed)
    clips = [load(p, {"chunks": t, "model": model}) for t, p in zip(sents, paths)]
    gaps = [rng.uniform(0.25, 0.70) for _ in clips[1:]]
    whole_pcm, _ = join(clips, gaps)
    whole_text = vo.whole_text([" ".join(t) for t in sents])
    asked = []

    def fake_request(text, voice_, model_, style_, tries=6):
        asked.append(text)
        if text == whole_text:
            return whole_pcm
        raise RuntimeError(f"offline check: nothing for {text!r}")

    tmp = tempfile.mkdtemp(prefix="vo-whole-")
    saved = vo.CACHE, vo.VO_OUT, vo.gemini_request, vo.GEMINI_STYLE
    try:
        vo.CACHE, vo.VO_OUT, vo.gemini_request = os.path.join(tmp, "cache"), os.path.join(tmp, "vo"), fake_request
        vo.GEMINI_STYLE = default
        import asyncio
        new = asyncio.run(vo.build(spec_path, {"geminiModel": model} if not spec.get("geminiModel") else None))
    finally:
        vo.CACHE, vo.VO_OUT, vo.gemini_request, vo.GEMINI_STYLE = saved
        shutil.rmtree(tmp, ignore_errors=True)
    print(f"{vid} ({len(sents)} sentences, {model}), joined with pauses {', '.join(f'{g:.2f}' for g in gaps)} s")
    print(f"  requests: {len(asked)} ({'the whole film in one' if asked == [whole_text] else 'NOT the whole film in one'})")
    same = (set(new) == set(old) and len(new["beats"]) == len(old["beats"])
            and all(set(a) == set(b) and len(a["chunks"]) == len(b["chunks"])
                    and [c["text"] for c in a["chunks"]] == [c["text"] for c in b["chunks"]]
                    for a, b in zip(new["beats"], old["beats"])))
    print(f"  structure: {'the same' if same else 'DIFFERENT'} (keys, beats, chunks per beat, subtitle texts)")
    diffs = []
    for a, b in zip(new["beats"], old["beats"]):
        for k in ("start", "end", "speechStart", "speechEnd"):
            diffs.append((abs(a[k] - b[k]), f"beat {a['i']} {k}"))
        for i, (ca, cb) in enumerate(zip(a["chunks"], b["chunks"])):
            for k in ("start", "end"):
                diffs.append((abs(ca[k] - cb[k]), f"beat {a['i']} chunk {i} {k}"))
    worst = max(diffs)
    print(f"  times against the old timeline (re-spaced then, so they differ by design): median "
          f"{statistics.median(d for d, _ in diffs) * 1000:.0f} ms, max {worst[0] * 1000:.0f} ms ({worst[1]}); "
          f"duration {new['duration']:.3f} s vs {old['duration']:.3f} s")
    return same, worst[0]


def takes_check(found):
    """Every real whole-film take in the cache (one sentence per line, before 2026-10-07): the old cut against
    take_views on the same audio. Prints the sentence starts and the chunk borders of both, and their distance."""
    takes = {}
    for s in spec_versions():
        if not isinstance(s, dict) or not str(s.get("voice", "")).startswith("gemini:"):
            continue
        sents = sentences_of({"beats": [b for b in s.get("beats", []) if isinstance(b, dict) and not b.get("style")]})
        if len(sents) < 2:
            continue
        for model in vo.GEMINI_CHAIN:
            for style in (vo.GEMINI_STYLE, *vo.GEMINI_STYLES_BEFORE):
                for text in ("\n".join(" ".join(t) for t in sents), vo.whole_text([" ".join(t) for t in sents])):
                    p = vo.gemini_path(text, s["voice"], model, style)
                    if os.path.exists(p) and p not in takes:
                        takes[p] = (s["id"], model, sents)
    if not takes:
        print("no whole-film take in the cache")
        return 0
    S, C, worst_all = [], [], 0.0
    for p, (vid, model, sents) in sorted(takes.items(), key=lambda x: x[1][0]):
        pcm = vo.read_wav_bytes(open(p, "rb").read())
        origins = []
        with contextlib.redirect_stderr(io.StringIO()):
            cut, why = vo.whole_cut(pcm, sents, ["check"] * len(sents), origins)
            take, doubt = vo.take_views(pcm, sents, ["check"] * len(sents))
        print(f"{vid} ({model}, {len(sents)} sentences, {len(pcm) / SR:.1f} s): old cut "
              f"{'sure' if cut else 'NOT sure (' + why + ')'}; new timing {'sure' if doubt is None else 'not sure (' + doubt + ')'}")
        if not cut:
            continue
        old = [[(o + a, o + b) for a, b in spans] for (_, spans), o in zip(cut, origins)]
        new = [v["spans"] for v in take.views]
        d_s = [abs(a[0][0] - b[0][0]) for a, b in zip(old, new)]
        d_c = [abs(x - y) for a, b in zip(old, new) for sa, sb in zip(a, b) for x, y in zip(sa, sb)]
        S += d_s
        C += d_c
        worst_all = max(worst_all, *d_c)
        print("   sentence starts  old " + " ".join(f"{a[0][0]:6.2f}" for a in old))
        print("                    new " + " ".join(f"{b[0][0]:6.2f}" for b in new))
        print(f"   every chunk edge: max {max(d_c) * 1000:.0f} ms apart")
    print(f"all takes: sentence starts {ms(S)}; chunk edges {ms(C)}")
    return worst_all


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--films", type=int, default=120, help="films per variant (default 120)")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--timeline", metavar="ID", help="one real film through vo.build instead")
    ap.add_argument("--takes", action="store_true", help="the real cached whole-film takes: old cut vs new timing")
    a = ap.parse_args()
    found = discover()
    if a.timeline:
        same, worst = timeline_check(a.timeline, found, a.seed)
        sys.exit(0 if same else 1)
    if a.takes:
        sys.exit(0 if takes_check(found) < 0.05 else 1)
    by = {}
    for p, meta in sorted(found.items()):  # sorted: the same films on every run (set order is random)
        if meta["voice"] == "gemini:Algieba":
            by.setdefault(meta["model"], []).append(load(p, meta))
    print(f"{sum(len(v) for v in by.values())} cached Algieba sentence clips: "
          + ", ".join(f"{m} {len(v)}" for m, v in sorted(by.items())))
    r1 = run_films(by, a.films, a.seed, 0.25, 0.70, "natural pauses 0.25-0.70 s")
    r2 = run_films(by, a.films, a.seed, 0.12, 0.20, "tight pauses 0.12-0.20 s")
    sys.exit(1 if r1["wrong"] or r2["wrong"] else 0)


if __name__ == "__main__":
    main()
