#!/bin/zsh
# The OBD promo, final: the film (out/obdpromo/vinari-obd-promo.mp4) with the voices and the sound
# (public/vo/obdpromo/mix.wav). One heavy job at a time: every Chrome job goes through scripts/heavy.sh and tools/lock.sh.
#   zsh src/obdpromo/build/render.sh [--concurrency 2] [--parts 8] [--only N]
# Before it: python3 src/obdpromo/build/voices.py (cached takes), sfx_synth.py, plan.py (timeline.json + mix.wav).
# v2 (121 s, past heavy.sh's 25-minute watch for one command): the picture is rendered in PARTS (frame ranges, video only,
# each its own heavy job), joined by stream copy (the same encoder settings, so the joins are seamless) and the mastered mix
# muxed once as AAC 320k (no audio seam at the joins).
# v2.1 (31 Oct, the reviewers measured the picture 45 ms behind the sound): with -use_editlist 0 the video starts at its
# 2-frame B-frame delay (66.7 ms) and the AAC priming (1024 samples, 21.3 ms) stays in; the mix is delayed 45 ms to match.
# v2.2 (the owner saw a torn frame as the phone rose): every part is scanned for torn frames (tornscan.py: headless Chrome on
# ANGLE/Metal now and then composites a frame from one repeated tile) and rendered again until clean (3 tries); the joined film
# is scanned once more (the parts' first and last frames). Smaller parts, so a retry costs little.
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
HEAVY="/Users/admin/Documents/Claude Projects/Vinari/scripts/heavy.sh"
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
CONC=2
PARTS=8
ONLY=
while (( $# )); do
  case $1 in
    --concurrency) CONC=$2; shift ;;
    --parts) PARTS=$2; shift ;;
    --only) ONLY=$2; shift ;;
  esac
  shift
done
mkdir -p out/obdpromo/parts
TOTAL=$(node -e "const t=require('./src/obdpromo/timeline.json');console.log(Math.round(t.total*30))")
STEP=$(( (TOTAL + PARTS - 1) / PARTS ))
for (( i = 0; i < PARTS; i++ )); do
  [[ -n $ONLY && $ONLY != $i ]] && continue
  A=$(( i * STEP ))
  B=$(( (i + 1) * STEP - 1 ))
  (( B > TOTAL - 1 )) && B=$(( TOTAL - 1 ))
  OUTP=out/obdpromo/parts/part$i.mp4
  if [[ -s $OUTP && -z $ONLY ]]; then echo "part $i: cached ($OUTP)"; continue; fi
  for (( try = 1; ; try++ )); do
    echo "part $i: frames $A-$B (try $try)"
    sh "$HEAVY" zsh tools/lock.sh npx remotion render src/obdpromo/index.ts ObdPromo $OUTP \
      "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/obdpromo/remotion.config.ts --frames=$A-$B --muted --props='{"audio":false}'
    python3 src/obdpromo/build/tornscan.py $OUTP $A > out/obdpromo/parts/scan.txt && { cat out/obdpromo/parts/scan.txt; break }
    cat out/obdpromo/parts/scan.txt
    if (( try >= 3 )); then
      # v2.1 (31 Oct): a tear that comes back the same every time sits on a static picture (the next shot's WebGL canvas mounting
      # under it): fixframes.py puts the frame before in its place (only where the two neighbours match), then scan again
      LOCAL=($(python3 -c "import re,sys; print(' '.join(str(int(m)-$A) for m in re.findall(r'\((\d+),', open('out/obdpromo/parts/scan.txt').read())))"))
      python3 src/obdpromo/build/fixframes.py $OUTP $LOCAL && python3 src/obdpromo/build/tornscan.py $OUTP $A && break
      echo "part $i: still torn after $try tries"; exit 1
    fi
  done
done
[[ -n $ONLY ]] && exit 0
COMP=node_modules/@remotion/compositor-darwin-arm64
FF() { DYLD_LIBRARY_PATH=$COMP $COMP/ffmpeg -hide_banner -nostdin -y "$@" }
LIST=out/obdpromo/parts/list.txt
: > $LIST
for (( i = 0; i < PARTS; i++ )); do echo "file '$PWD/out/obdpromo/parts/part$i.mp4'" >> $LIST; done
FF -f concat -safe 0 -i $LIST -c copy out/obdpromo/parts/joined.mp4
FF -i out/obdpromo/parts/joined.mp4 -i public/vo/obdpromo/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -af adelay=45:all=1 -c:a aac -b:a 320k -ar 48000 -shortest -use_editlist 0 -movflags +faststart out/obdpromo/vinari-obd-promo.mp4
python3 src/obdpromo/build/tornscan.py out/obdpromo/vinari-obd-promo.mp4 || echo "WARNING: torn frames in the joined film (at a part's edge): render that part again with --only"
echo "done: out/obdpromo/vinari-obd-promo.mp4"
