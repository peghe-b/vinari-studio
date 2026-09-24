#!/bin/zsh
# One command per video, all local and free. The default is the delivery and nothing else: ONE voiced
# film in the spec's own look (spec "theme", dark when unset). Every other file is made only when its
# flag is passed (the owner, 2026-09-24: unrequested silent/light copies filled the MacBook).
#   ./make.sh v1-customs-cliff            voice + render + loudness  -> out/v1-customs-cliff.mp4 (+ cover)
#   ./make.sh v1-customs-cliff --still 90 one frame as PNG, for a quick look
#   ./make.sh v1-customs-cliff --mix      no video: renders the voice and the sound kit as two audio stems
#                                         (temporary) and prints voice vs sound-effect loudness
#   only when asked for:
#   ./make.sh v1-customs-cliff --formats  also 4:5, 1:1 and 16:9 versions (in the spec's own look)
#   ./make.sh v1-customs-cliff --silent   no voice: the subtitle line is the primary text
#                                         -> out/v1-customs-cliff.silent.mp4 (same timing, same sound kit)
#   ./make.sh v1-customs-cliff --light    the other look for a comparison (--dark on a light spec)
#                                         -> out/v1-customs-cliff.light.mp4 (+ .light.cover.png);
#                                         a flag that names the spec's own look changes nothing
#   ./make.sh studio                      live preview of every video in the browser
#   ./make.sh app                         the one-click page: type an idea, get a video
#
# CI (the GitHub Actions workflow, .github/workflows/studio.yml): VS_CI=1 ./make.sh <id> makes only the
# film. The voice step ran tools/vo.py before (kept when its timeline exists), and the cover step
# (tools/covers.mjs) and the upload follow, so no cover, no gallery here.
set -e
cd "${0:A:h}"
# the Mac's node lives in ~/.local/node/bin; a runner already has node on PATH
[[ -d "$HOME/.local/node/bin" ]] && export PATH="$HOME/.local/node/bin:$PATH"
# the browser, --gl and --chrome-mode of this machine (tools/platform.mjs): the Mac's own Chrome with
# ANGLE, Remotion's chrome-headless-shell with software GL on Linux
BROWSER=(${(f)"$(node tools/platform.mjs --flags-lines)"})
(( $#BROWSER )) || { echo "tools/platform.mjs gave no browser flags"; exit 1; }

if [[ "$1" == "app" ]]; then
  (sleep 1.2; open "http://127.0.0.1:4777") &
  exec node tools/app.mjs
fi

if [[ "$1" == "studio" ]]; then
  for s in specs/*.json; do python3 tools/vo.py "$s" >/dev/null || echo "voice failed: $s"; done  # cached: no network
  node tools/build-index.mjs
  exec npx remotion studio src/index.ts "${BROWSER[@]}"
fi

# ---- many videos (tools/variants.mjs; the procedure: ../.claude/skills/video/SKILL.md) ----------
#   ./make.sh all [--missing]                        every spec except demo-*, one render at a time,
#                                                    then the gallery; --missing skips an mp4 newer than its spec
#   ./make.sh variants <id> [hooks.json] [--stills] [--append]
#                                                    one idea, one video per opening: specs/<id>--h1.json ...
#                                                    -> out/<id>-h1.mp4 ... (hooks default: specs/hooks/<id>.json)
#                                                    --stills: no render, only the openings side by side
#                                                    in out/stills/<id>-hooks.png
#   ./make.sh <id>-h2 [--still <frame>]              one variant (specs/<id>--h2.json): any spec is found by its id
# VS_COOL=<seconds> between two renders (default 10: the 8 GB M1 runs hot).
cool() { sleep "${VS_COOL:-10}"; }
gallery() {
  local g=(tools/gallery*.(mjs|py|sh)(N))
  (( $#g )) || return 0
  case $g[1] in *.mjs) node $g[1];; *.py) python3 $g[1];; *.sh) zsh $g[1];; esac || echo "gallery failed: $g[1]"
}

if [[ "$1" == "all" ]]; then
  node tools/variants.mjs --sync   # a variant follows its edited original
  made=() failed=() kept=()
  for f in specs/*.json; do
    vid=$(node -e 'process.stdout.write(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).id)' "$f") || { failed+=("$f"); continue; }
    [[ "$vid" == demo-* ]] && continue
    if [[ "$2" == "--missing" && "out/$vid.mp4" -nt "$f" ]]; then kept+=("$vid"); continue; fi
    (( $#made + $#failed )) && cool
    echo "== $vid"
    if ./make.sh "$vid"; then made+=("$vid"); else failed+=("$vid"); fi
  done
  gallery
  echo "rendered ${#made}: ${made[*]}"
  (( $#kept )) && echo "already up to date ${#kept}: ${kept[*]}"
  (( $#failed )) && { echo "FAILED ${#failed}: ${failed[*]}"; exit 1; }
  exit 0
fi

if [[ "$1" == "variants" ]]; then
  base="$2"; hooks="$3"; opts=("${@:3}")
  [[ -z "$base" ]] && { echo "usage: ./make.sh variants <id> [hooks.json] [--stills] [--append]"; exit 1; }
  [[ "$hooks" == --* ]] && hooks=""
  # a relative hooks path may be relative to where make.sh was started (we cd'ed above)
  [[ -n "$hooks" && "$hooks" != /* && ! -f "$hooks" && -f "$OLDPWD/$hooks" ]] && hooks="$OLDPWD/$hooks"
  pass=(); (( ${opts[(Ie)--append]} )) && pass+=(--append)
  report=$(node tools/variants.mjs "$base" ${hooks:+"$hooks"} "${pass[@]}")   # a bad hook stops here
  print -r -- "$report"
  ids=(${=${${(M)${(f)report}:#ids: *}#ids: }})
  (( $#ids )) || { echo "no variants were written"; exit 1; }
  if (( ${opts[(Ie)--stills]} )); then
    python3 tools/vo.py "specs/$base.json" | head -1   # voices outside the lock: the lock is for Chrome
    for v in $ids; do python3 tools/vo.py "specs/${v%-h*}--h${v##*-h}.json" | head -1; done
    tools/lock.sh node tools/variants.mjs --stills "$base" $ids
    exit 0
  fi
  failed=(); n=0
  for v in $ids; do
    (( n++ )) && cool
    ./make.sh "$v" || failed+=("$v")
  done
  gallery
  (( $#failed )) && { echo "FAILED: ${failed[*]}"; exit 1; }
  echo done: out/${^ids}.mp4
  exit 0
fi

# any spec by its id: plain (specs/<id>.json), a hook variant (<id>--h2.json has the id <id>-h2)
# or a translation (<id>.en.json has the id <id>-en)
spec_of() { node -e 'const fs = require("fs"); for (const f of fs.readdirSync("specs").filter((f) => f.endsWith(".json")).sort()) { try { if (JSON.parse(fs.readFileSync(`specs/${f}`, "utf8")).id === process.argv[1]) { process.stdout.write(`specs/${f}`); break; } } catch {} }' "$1"; }

id="$1"
spec="specs/$id.json"
[[ -n "$id" && ! -f "$spec" ]] && spec=$(spec_of "$id")
[[ -z "$id" || -z "$spec" || ! -f "$spec" ]] && { echo "usage: ./make.sh <spec id> [--still <frame>] [--mix] [--formats] [--silent] [--light | --dark]"; ls specs; exit 1; }
[[ "$spec" == *--h<->.json ]] && node tools/variants.mjs --sync "${id%-h*}" >/dev/null   # never older than its original

node tools/build-index.mjs "$id"   # lint first: fail before spending a render
# CI: the workflow's voice step already made it (cached anyway; skipping it keeps a Gemini model that
# ran out of quota between the two from being asked again)
if [[ -n "$VS_CI" && -f "public/vo/$id/timeline.json" && "public/vo/$id/timeline.json" -nt "$spec" ]]; then
  echo "voice: public/vo/$id (made by the voice step)"
else
  python3 tools/vo.py "$spec"
fi
node tools/build-index.mjs "$id"

# The spec's own look ("theme", dark when unset) is the film: out/<id>.mp4. --light / --dark render the
# OTHER look as a comparison copy (out/<id>.light.mp4 / .dark.mp4); a flag naming the spec's own look
# changes nothing. --silent (only on request) drops the voice; spec "narration": false is a silent film
# by design and keeps the plain name. --props merges over the composition's defaultProps (spec +
# timeline stay), so Promo only sees the flags.
sval() { node -e 'const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")); const v = s[process.argv[2]]; process.stdout.write(v === undefined || v === null ? "" : String(v))' "$spec" "$1"; }
own=$(sval theme); [[ "$own" == light ]] || own=dark
want="$own"
(( ${@[(Ie)--light]} )) && want=light
(( ${@[(Ie)--dark]} )) && want=dark
(( ${@[(Ie)--light]} && ${@[(Ie)--dark]} )) && { echo "--light and --dark: pick one"; exit 1; }
silent=0; (( ${@[(Ie)--silent]} )) && silent=1
[[ "$(sval narration)" == false ]] && silent=2   # the spec itself is silent: no suffix
name="$id"; flags=()
[[ "$want" != "$own" ]] && { name="$name.$want"; flags+=("\"theme\":\"$want\""); }
(( silent == 1 )) && { name="$name.silent"; flags+=('"silent":true'); }
props=(); (( $#flags )) && props=(--props="{${(j:,:)flags}}")

# The voice track is leveled BEFORE the render (tools/master.py voice, in place; the source is kept as
# voice.src.wav, and a second run on a leveled file changes nothing): a gentle compressor and a
# true-peak limiter bring its peaks to VS_VOICE_PLR (11) dB over its loudness, which stays the same.
# The TTS voices peak 16-18 dB over their loudness, and -10 LUFS at -1 dBTP leaves room for about 9 in
# the mix (the film plays the mono file on both channels, 3 dB under it). Leveled here, the film's mix is
# set against the voice as it will sound (scenes/common.tsx setMix measures this file), and the mix
# needs only a light limiter at the end: limiting the finished mix that hard took 3.5-5 LU off the
# voice alone and brought the loudest sounds to 1 LU of it (v9, v11, v12, 2026-09-24).
if (( ! silent )) && [[ "$2" != "--still" ]]; then
  lv=$(python3 tools/master.py voice "public/vo/$id/voice.wav" --plr "${VS_VOICE_PLR:-11}") || { echo "voice: leveling failed"; exit 1; }
  echo "voice: $lv"
fi

# --mix: voice vs sound kit, measured on two audio-only renders of the voiced film (Promo's debug prop
# "stem": "voice" / "sfx"; about 15 s each). Nothing is kept. The figures (BS.1770 K-weighting): the
# voice's integrated loudness, each sound event's loudest 100 ms in LU under it (tokens.ts MIX_VOICED
# aims the loud ones at 5 or more, no stack closer than 5), the room tone in the pauses, and the final
# levels after make.sh's -10 LUFS (about).
if (( ${@[(Ie)--mix]} )); then
  (( silent )) && { echo "--mix measures the voiced film; this one is silent"; exit 1; }
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/vinari-mix.XXXXXX")
  trap 'rm -rf "$tmp"' EXIT
  STEM_ID="$id" STEM_OUT="$tmp" STEM_THEME="$want" tools/lock.sh node --input-type=module <<'JS' || exit 1
import {bundle} from '@remotion/bundler';
import {renderMedia, selectComposition} from '@remotion/renderer';
import path from 'node:path';
import {concurrency, renderOpts} from './tools/platform.mjs';
const root = process.cwd();
const id = process.env.STEM_ID;
const serveUrl = await bundle({entryPoint: path.join(root, 'src/index.ts'), publicDir: path.join(root, 'public')});
for (const stem of ['voice', 'sfx']) {
  const inputProps = {stem, theme: process.env.STEM_THEME};
  const composition = await selectComposition({serveUrl, id, inputProps, ...renderOpts()});
  await renderMedia({serveUrl, composition, codec: 'wav', outputLocation: path.join(process.env.STEM_OUT, `${stem}.wav`), inputProps,
    ...renderOpts(), concurrency, logLevel: 'error', timeoutInMilliseconds: 120000});
}
JS
  python3 - "$tmp/voice.wav" "$tmp/sfx.wav" <<'PY'
import math, sys, numpy as np
from scipy.io import wavfile
from scipy.signal import lfilter
def load(p):
    fs, x = wavfile.read(p)
    x = x.astype(np.float64) / (np.iinfo(x.dtype).max + 1.0) if np.issubdtype(x.dtype, np.integer) else x.astype(np.float64)
    return (x if x.ndim == 2 else x[:, None]), fs
def kw(x, fs):  # BS.1770 K-weighting at any rate
    A = 10 ** (3.99984385397 / 40); w0 = 2 * math.pi * 1681.9744509555319 / fs; al = math.sin(w0) / (2 * 0.7071752369554193); c = math.cos(w0)
    a0 = A + 1 - (A - 1) * c + 2 * math.sqrt(A) * al
    y = lfilter([A * (A + 1 + (A - 1) * c + 2 * math.sqrt(A) * al) / a0, -2 * A * (A - 1 + (A + 1) * c) / a0, A * (A + 1 + (A - 1) * c - 2 * math.sqrt(A) * al) / a0],
                [1, 2 * (A - 1 - (A + 1) * c) / a0, (A + 1 - (A - 1) * c - 2 * math.sqrt(A) * al) / a0], x, axis=0)
    w0 = 2 * math.pi * 38.13547087613982 / fs; al = math.sin(w0) / (2 * 0.5003270373253953)
    return lfilter([1, -2, 1], [1, -2 * math.cos(w0) / (1 + al), (1 - al) / (1 + al)], y, axis=0)
def win(k, fs, w, h):
    c = np.concatenate([[0], np.cumsum((k ** 2).sum(axis=1))]); n, s = int(w * fs), int(h * fs)
    st = np.arange(0, len(c) - 1 - n + 1, s); return st / fs, (c[st + n] - c[st]) / n
L = lambda z: -0.691 + 10 * np.log10(np.maximum(z, 1e-20))
def integ(k, fs):
    _, z = win(k, fs, 0.4, 0.1); l = L(z); z1 = z[l > -70]; r = L(z1.mean()) - 10; return L(z[(l > -70) & (l > r)].mean())
v, fs = load(sys.argv[1]); s, _ = load(sys.argv[2]); n = min(len(v), len(s)); v, s = v[:n], s[:n]
kv, ks = kw(v, fs), kw(s, fs); vi = integ(kv, fs); mi = integ(kw(v + s, fs), fs)
t, z = win(ks, fs, 0.1, 0.01); l = L(z); ev = []
for i in range(1, len(l) - 1):  # events: local 100 ms maxima standing 5 LU over their surroundings
    lo, hi = max(0, i - 30), min(len(l), i + 30)
    if l[i] < -60 or l[i] < l[lo:hi].max() or l[i] - min(l[lo:i + 1].min(), l[i:hi].min()) < 5: continue
    if ev and t[i] - ev[-1][0] < 0.15:
        if l[i] > ev[-1][1]: ev[-1] = (t[i], l[i])
        continue
    ev.append((t[i], l[i]))
u = np.array([vi - e[1] for e in ev]); _, z4 = win(ks, fs, 0.4, 0.1); room = np.percentile(L(z4), 10); g = -10 - mi
print(f"mix: voice {vi:.1f} LUFS; {len(ev)} sound events, loudest 100 ms each under the voice: min {u.min():.1f}, p10 {np.percentile(u, 10):.1f}, median {np.median(u):.1f}, p90 {np.percentile(u, 90):.1f} LU")
print("mix: the five loudest: " + ", ".join(f"{e[0]:.2f} s {vi - e[1]:.1f} LU under" for e in sorted(ev, key=lambda e: -e[1])[:5]))
print(f"mix: room tone in the pauses {vi - room:.1f} LU under the voice; after -10 LUFS: events median {np.median([e[1] for e in ev]) + g:.1f} LUFS, room {room + g:.1f} LUFS")
PY
  exit $?
fi

if [[ "$2" == "--still" ]]; then
  tools/lock.sh npx remotion still src/index.ts "$id" "out/$name-f${3:-0}.png" --frame="${3:-0}" "${BROWSER[@]}" --log=error "${props[@]}"
  exit 0
fi

render() { tools/lock.sh npx remotion render src/index.ts "$id" "out/$name.raw.mp4" "${BROWSER[@]}" --log=error "${props[@]}" "$@"; }
render
# A parallel render (3 Chrome tabs under ANGLE) now and then drops a layer or writes a corrupted
# frame (a tiled copy of an older one) on a single frame. tools/flicker.py finds such frames;
# then the whole video renders again one frame at a time, which has never shown them.
# The threshold is 0.7 (flicker.py's own default is 0.8): a Wire3D frame whose thin lines went missing
# scored 0.80 and slipped through. The film's own motion can score too: a notification's buzz (the
# phone shakes left-right every frame) scores 0.66 on the dark film and 0.8 on the light one. So a frame
# flagged AGAIN in the one-at-a-time render, and flagged in the parallel one at least as high, is the
# film's own motion (it rendered the same twice) and is accepted; any other survivor stops the build.
# VS_FLICKER_THRESHOLD overrides the threshold, VS_NOFLICKER=1 skips the check.
thr="${VS_FLICKER_THRESHOLD:-0.7}"
if [[ -z "$VS_NOFLICKER" ]]; then
  par=$(python3 tools/flicker.py "out/$name.raw.mp4" --threshold "$thr") && print -r -- "$par" || {
    print -r -- "$par"
    echo "rendering again with --concurrency=1"
    render --concurrency=1
    seq=$(python3 tools/flicker.py "out/$name.raw.mp4" --threshold "$thr") && print -r -- "$seq" || {
      print -r -- "$seq"
      new=$(node -e 'const grab = (t) => new Map([...t.matchAll(/f(\d+) \(([\d.]+)\)/g)].map((m) => [m[1], Number(m[2])]));
        const [p, q] = [grab(process.argv[1]), grab(process.argv[2])];
        console.log([...q].filter(([f, v]) => !(p.has(f) && p.get(f) >= v - 0.15)).map(([f, v]) => `f${f} (${v})`).join(", "));' -- "$par" "$seq")
      [[ -n "$new" ]] && { echo "FLICKER: glitches survive a --concurrency=1 render ($new); look at out/$name.raw.mp4 (VS_NOFLICKER=1 accepts it)"; exit 1; }
      echo "flicker: the frames flagged again rendered the same both times: the film's own motion (a buzz, a flap), accepted"
    }
  }
fi

# ---- loudness (tools/master.py mix) ---------------------------------------------------------------
# One constant gain to the integrated target (BS.1770) and a true-peak limiter (4x oversampled, 1.5 ms
# look-ahead, 40 ms release) for the few peaks the leveled voice leaves (a click on a word), then the
# AAC encode (libfdk_aac 256k: ffmpeg's own aac at 192k pushed a limited click from -1.5 to +0.01 dBTP
# on v12; fdk moves it by about 0.1), measured with ffmpeg's own meter. A miss of more than 0.1 LU is
# aimed again, a true peak over the target lowers the ceiling by the overshoot (1 dB at most), three
# rounds at most. No gain rides with the programme, so nothing pumps: the room tone and the sounds
# between the words keep their balance.
# ffmpeg's loudnorm could not do this (tools/master.py, header): its linear mode gives up on these
# peaks and its dynamic mode left the films at -11.3 to -12.3 LUFS for -10 (v11 at -0.41 dBTP).
#   voiced: VS_LUFS (default -10) LUFS, -1 dBTP: Reels / TikTok play loud (about -9..-11), and at -14
#           the owner found everything too quiet (2026-09-24).
#   silent: VS_SILENT_LUFS (default -20) LUFS, -2 dBTP. The sound kit alone sat near -28 LUFS: too quiet
#           next to other posts, while speech level would pump the room tone up.
# (braces on every variable in a filter string: zsh reads "$x:l" as its lowercase modifier)
measure() {  # file [I TP] -> "I TP LRA thresh offset" of the input (ffmpeg loudnorm's meter)
  npx remotion ffmpeg -hide_banner -nostats -i "$1" -vn -af "loudnorm=I=${2:--10}:TP=${3:--1}:LRA=50:print_format=json" -f null - 2>&1 |
    node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => { const m = /\{[^{}]*"input_i"[^{}]*\}/.exec(s); const j = m ? JSON.parse(m[0]) : {}; console.log([j.input_i, j.input_tp, j.input_lra, j.input_thresh, j.target_offset].map((x) => x ?? "x").join(" ")); });'
}
master() {  # in out I TP
  local mi mtp oi otp j next aim ceil tmp _
  aim=$(node -e 'console.log((Number(process.argv[1]) + 0.1).toFixed(2))' -- "$3")  # the encode and ffmpeg's meter read ~0.1 lower
  ceil=$(node -e 'console.log((Number(process.argv[1]) - 0.5).toFixed(2))' -- "$4")  # room for the AAC overshoot
  read mi mtp _ <<< "$(measure "$1" "$3" "$4")"
  [[ "$mi" == x || "$mi" == -inf ]] && { echo "loudness: could not measure $1 (got '$mi'); it is kept"; return 1; }
  tmp=$(mktemp -d "${TMPDIR:-/tmp}/vinari-master.XXXXXX")
  npx remotion ffmpeg -hide_banner -loglevel error -y -i "$1" -vn -c:a pcm_s24le "$tmp/in.wav" || { rm -rf "$tmp"; return 1; }
  for round in 1 2 3; do
    j=$(python3 tools/master.py mix "$tmp/in.wav" "$tmp/out.wav" "$aim" "$ceil") || { rm -rf "$tmp"; return 1; }
    # +faststart: the index (moov) goes to the front, so a phone plays the file before it has all of it
    npx remotion ffmpeg -hide_banner -loglevel error -y -i "$1" -i "$tmp/out.wav" -map 0:v -map 1:a -c:v copy -c:a libfdk_aac -b:a 256k -movflags +faststart "$2" || { rm -rf "$tmp"; return 1; }
    read oi otp _ <<< "$(measure "$2" "$3" "$4")"
    next=$(node -e 'const [t, p, o, q, a, c] = process.argv.slice(1).map(Number);
      const miss = t - o, over = q - p;
      if (!(Number.isFinite(o) && Number.isFinite(q)) || (Math.abs(miss) <= 0.1 && over <= 0)) process.exit(0);
      console.log((a + Math.max(-2, Math.min(2, miss))).toFixed(2), Math.max(p - 1.5, over > 0 ? c - over - 0.1 : c).toFixed(2));' -- "$3" "$4" "$oi" "$otp" "$aim" "$ceil")
    [[ -z "$next" ]] && break
    (( round < 3 )) && read aim ceil <<< "$next"
  done
  rm -rf "$tmp"
  node -e 'const [t, p, o, q] = process.argv.slice(1).map(Number); if (!(Math.abs(t - o) <= 0.3 && q <= p)) console.log(`loudness: WARNING the film ended at ${o} LUFS / ${q} dBTP for ${t} / ${p}`)' -- "$3" "$4" "$oi" "$otp"
  echo "loudness: $mi LUFS / $mtp dBTP -> $oi LUFS / $otp dBTP (target $3 / $4; limiter $(node -e 'const j = JSON.parse(process.argv[1]); console.log(`${j.limited_pct} % of the film over 1 dB, at most ${j.limiter_db_max} dB`)' -- "$j"))"
}

if (( silent )); then
  master "out/$name.raw.mp4" "out/$name.mp4" "${VS_SILENT_LUFS:--20}" -2 || exit 1
  rm -f "out/$name.raw.mp4"
  echo "done: out/$name.mp4"
  exit 0
fi
master "out/$name.raw.mp4" "out/$name.mp4" "${VS_LUFS:--10}" -1 || exit 1
rm -f "out/$name.raw.mp4"
# out/<name>.cover.png: the spec's "cover" frame (default 0) in this film's look. tools/cover.mjs renders
# the spec's own look by itself and the light one with --light; it has no --dark, so a dark comparison
# copy of a light spec gets no cover (it would overwrite the spec's own).
if [[ "$want" == "$own" ]]; then cover=()
elif [[ "$want" == light ]]; then cover=(--light)
else cover=(skip); fi
if [[ -n "$VS_CI" ]]; then echo "cover: made by the workflow's cover step (tools/covers.mjs)"
elif [[ "$cover[1]" == skip ]]; then echo "cover: skipped for the dark comparison copy"
else node tools/cover.mjs "$id" "${cover[@]}" >/dev/null 2>&1 || echo "cover failed (the video is fine)"; fi
if (( ${@[(Ie)--formats]} )); then
  # tools/formats.mjs crops out/<id>.mp4 and renders <id>-wide, both in the spec's own look
  if [[ "$want" != "$own" ]]; then echo "--formats: the 4:5 / 1:1 / 16:9 versions are made of the spec's own look only (out/$id.mp4)"
  else node tools/formats.mjs "$id" --wide; fi                                            # 4:5, 1:1, 16:9
fi
[[ -n "$VS_CI" ]] || gallery
echo "done: out/$name.mp4"
