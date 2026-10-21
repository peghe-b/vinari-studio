#!/bin/zsh
# The navigator + CarPlay promo, final: the film (out/navpromo3/vinari-navcarplay-promo.mp4) with the voices and the sound
# (public/vo/navpromo3/mix.wav). One heavy job at a time on the 8 GB machine: every Chrome job goes through the machine-wide
# lock (/private/tmp/claude-501/glock.sh) and the studio's tools/lock.sh, at concurrency 1.
#   zsh src/navpromo3/build/render.sh [--concurrency 1] [--parts 10] [--only NAME]
# (a copy of the diagnostics promo's render.sh; its notes follow)
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
GLOCK=/private/tmp/claude-501/glock.sh
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
CONC=1
PARTS=10
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
# v1.3: the parts plan (out/navpromo3/parts/plan.txt, one "name first last" line a part, in film order): a part whose file is
# there is reused, a missing one is rendered. Without a plan the film is cut into PARTS equal parts (part0..), as before. When
# an edit moves everything after it by whole frames (plan.py keeps the sub-frame phase), the old parts after the edit stay
# valid at their moved frame numbers: the plan lists them under their old names with their new ranges, and only the new
# head and tail are rendered.
PLAN=out/navpromo3/parts/plan.txt
if [[ ! -s $PLAN ]]; then
  STEP=$(( (TOTAL + PARTS - 1) / PARTS ))
  : > $PLAN
  for (( i = 0; i < PARTS; i++ )); do
    A=$(( i * STEP )); B=$(( (i + 1) * STEP - 1 )); (( B > TOTAL - 1 )) && B=$(( TOTAL - 1 ))
    echo "part$i $A $B" >> $PLAN
  done
fi
# the plan must cover every frame once, in order
NEXT=0
while read -r NAME A B; do
  [[ -z $NAME ]] && continue
  (( A != NEXT )) && { echo "parts plan: $NAME starts at $A, expected $NEXT"; exit 1; }
  NEXT=$(( B + 1 ))
done < $PLAN
(( NEXT != TOTAL )) && { echo "parts plan ends at frame $(( NEXT - 1 )), the film has $TOTAL frames"; exit 1; }
COMP=node_modules/@remotion/compositor-darwin-arm64
NFRAMES() { DYLD_LIBRARY_PATH=$COMP $COMP/ffprobe -v error -count_packets -select_streams v:0 -show_entries stream=nb_read_packets -of csv=p=0 "$1" </dev/null }
while read -r NAME A B; do
  [[ -z $NAME ]] && continue
  [[ -n $ONLY && $ONLY != $NAME ]] && continue
  OUTP=out/navpromo3/parts/$NAME.mp4
  if [[ -s $OUTP && -z $ONLY ]]; then
    N=$(NFRAMES $OUTP)
    (( N != B - A + 1 )) && { echo "part $NAME: $N frames on disk, the plan wants $(( B - A + 1 )) ($A-$B): delete it or fix the plan"; exit 1; }
    echo "part $NAME: cached ($OUTP, frames $A-$B)"; continue
  fi
  for (( try = 1; ; try++ )); do
    echo "part $NAME: frames $A-$B (try $try)"
    "$GLOCK" zsh tools/lock.sh npx remotion render src/navpromo3/index.ts NavCarPlay $OUTP \
      "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/navpromo3/remotion.config.ts --frames=$A-$B --muted --props='{"audio":false}' </dev/null
    python3 src/navpromo3/build/tornscan.py $OUTP $A </dev/null && break
    (( try >= 3 )) && { echo "part $NAME: still torn after $try tries"; exit 1; }
  done
done < $PLAN
[[ -n $ONLY ]] && exit 0
FF() { DYLD_LIBRARY_PATH=$COMP $COMP/ffmpeg -hide_banner -nostdin -y "$@" }
LIST=out/navpromo3/parts/list.txt
: > $LIST
while read -r NAME A B; do [[ -n $NAME ]] && echo "file '$PWD/out/navpromo3/parts/$NAME.mp4'" >> $LIST; done < $PLAN
FF -f concat -safe 0 -i $LIST -c copy out/navpromo3/parts/joined.mp4
FF -i out/navpromo3/parts/joined.mp4 -i public/vo/navpromo3/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/navpromo3/vinari-navcarplay-promo.mp4
python3 src/navpromo3/build/tornscan.py out/navpromo3/vinari-navcarplay-promo.mp4 || echo "WARNING: torn frames in the joined film (at a part's edge): render that part again with --only"
echo "done: out/navpromo3/vinari-navcarplay-promo.mp4"
