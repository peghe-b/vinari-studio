#!/bin/zsh
# The diagnostics promo, final: the film (out/diagpromo/vinari-diag-promo.mp4) with the voices and the sound
# (public/vo/diagpromo/mix.wav). One heavy job at a time: every Chrome job goes through scripts/heavy.sh and tools/lock.sh.
#   zsh src/diagpromo/build/render.sh [--concurrency 2] [--parts 3] [--only N]
# Before it: python3 src/diagpromo/build/voices.py (cached takes), sfx_synth.py, plan.py (timeline.json + mix.wav).
# v2 (121 s, past heavy.sh's 25-minute watch for one command): the picture is rendered in PARTS (frame ranges, video only,
# each its own heavy job), joined by stream copy (the same encoder settings, so the joins are seamless) and the mastered mix
# muxed once as AAC 320k (no audio seam at the joins).
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
HEAVY="/Users/admin/Documents/Claude Projects/Vinari/scripts/heavy.sh"
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
CONC=2
PARTS=3
ONLY=
while (( $# )); do
  case $1 in
    --concurrency) CONC=$2; shift ;;
    --parts) PARTS=$2; shift ;;
    --only) ONLY=$2; shift ;;
  esac
  shift
done
mkdir -p out/diagpromo/parts
TOTAL=$(node -e "const t=require('./src/diagpromo/timeline.json');console.log(Math.round(t.total*30))")
STEP=$(( (TOTAL + PARTS - 1) / PARTS ))
for (( i = 0; i < PARTS; i++ )); do
  [[ -n $ONLY && $ONLY != $i ]] && continue
  A=$(( i * STEP ))
  B=$(( (i + 1) * STEP - 1 ))
  (( B > TOTAL - 1 )) && B=$(( TOTAL - 1 ))
  OUTP=out/diagpromo/parts/part$i.mp4
  if [[ -s $OUTP && -z $ONLY ]]; then echo "part $i: cached ($OUTP)"; continue; fi
  echo "part $i: frames $A-$B"
  sh "$HEAVY" zsh tools/lock.sh npx remotion render src/diagpromo/index.ts DiagPromo $OUTP \
    "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/diagpromo/remotion.config.ts --frames=$A-$B --muted --props='{"audio":false}'
done
[[ -n $ONLY ]] && exit 0
COMP=node_modules/@remotion/compositor-darwin-arm64
FF() { DYLD_LIBRARY_PATH=$COMP $COMP/ffmpeg -hide_banner -nostdin -y "$@" }
LIST=out/diagpromo/parts/list.txt
: > $LIST
for (( i = 0; i < PARTS; i++ )); do echo "file '$PWD/out/diagpromo/parts/part$i.mp4'" >> $LIST; done
FF -f concat -safe 0 -i $LIST -c copy out/diagpromo/parts/joined.mp4
FF -i out/diagpromo/parts/joined.mp4 -i public/vo/diagpromo/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/diagpromo/vinari-diag-promo.mp4
echo "done: out/diagpromo/vinari-diag-promo.mp4"
