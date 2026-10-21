#!/bin/zsh
# The diagnostics promo, final: the film (out/navpromo3/vinari-navcarplay-promo.mp4) with the voices and the sound
# (public/vo/navpromo3/mix.wav). One heavy job at a time: every Chrome job goes through scripts/heavy.sh and tools/lock.sh.
#   zsh src/navpromo3/build/render.sh [--concurrency 2] [--parts 8] [--only N]
# Before it: python3 src/navpromo3/build/voices.py (cached takes), sfx_synth.py, plan.py (timeline.json + mix.wav).
# v2 (121 s, past heavy.sh's 25-minute watch for one command): the picture is rendered in PARTS (frame ranges, video only,
# each its own heavy job), joined by stream copy (the same encoder settings, so the joins are seamless) and the mastered mix
# muxed once as AAC 320k (no audio seam at the joins).
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
mkdir -p out/navpromo3/parts
TOTAL=$(node -e "const t=require('./src/navpromo3/timeline.json');console.log(Math.round(t.total*30))")
STEP=$(( (TOTAL + PARTS - 1) / PARTS ))
for (( i = 0; i < PARTS; i++ )); do
  [[ -n $ONLY && $ONLY != $i ]] && continue
  A=$(( i * STEP ))
  B=$(( (i + 1) * STEP - 1 ))
  (( B > TOTAL - 1 )) && B=$(( TOTAL - 1 ))
  OUTP=out/navpromo3/parts/part$i.mp4
  if [[ -s $OUTP && -z $ONLY ]]; then echo "part $i: cached ($OUTP)"; continue; fi
  for (( try = 1; ; try++ )); do
    echo "part $i: frames $A-$B (try $try)"
    sh "$HEAVY" zsh tools/lock.sh npx remotion render src/navpromo3/index.ts NavCarPlay $OUTP \
      "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/navpromo3/remotion.config.ts --frames=$A-$B --muted --props='{"audio":false}'
    python3 src/navpromo3/build/tornscan.py $OUTP $A && break
    (( try >= 3 )) && { echo "part $i: still torn after $try tries"; exit 1; }
  done
done
[[ -n $ONLY ]] && exit 0
COMP=node_modules/@remotion/compositor-darwin-arm64
FF() { DYLD_LIBRARY_PATH=$COMP $COMP/ffmpeg -hide_banner -nostdin -y "$@" }
LIST=out/navpromo3/parts/list.txt
: > $LIST
for (( i = 0; i < PARTS; i++ )); do echo "file '$PWD/out/navpromo3/parts/part$i.mp4'" >> $LIST; done
FF -f concat -safe 0 -i $LIST -c copy out/navpromo3/parts/joined.mp4
FF -i out/navpromo3/parts/joined.mp4 -i public/vo/navpromo3/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/navpromo3/vinari-navcarplay-promo.mp4
python3 src/navpromo3/build/tornscan.py out/navpromo3/vinari-navcarplay-promo.mp4 || echo "WARNING: torn frames in the joined film (at a part's edge): render that part again with --only"
echo "done: out/navpromo3/vinari-navcarplay-promo.mp4"
