#!/bin/zsh
# The creator story, final: render (ProRes HQ, silent) -> grade + encode (H.264 High, level 5.1, CRF 15, BT.709, 30 fps)
# with the mix -> the house master (-10.5 LUFS, words -13.2 LU, true peak under -1 dBTP).
#   zsh src/crpromo/build/render.sh [--concurrency 3]
# Before it: voice.py, plan.py, capture.cjs + assets.sh, mix.py.
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
FF=~/.vinari-tools/opuscar/bin/ffmpeg
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
CONC=1  # ONE tab: at 3 the subtitle layer dropped out of ~14 % of the frames (2026-11-10, measured; stills fine)
while (( $# )); do case $1 in --concurrency) CONC=$2; shift ;; esac; shift; done
mkdir -p out/crpromo
npx remotion render src/crpromo/index.ts CrPromo out/crpromo/film.mov "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/crpromo/remotion.config.ts --muted
# the finished picture a touch brighter (the owner, 5 Nov: the whole frame, not the lights), then the master encode
$FF -v error -y -i out/crpromo/film.mov -i public/vo/crpromo/mix.wav -map 0:v -map 1:a \
  -vf "eq=gamma=1.04:brightness=0.006,format=yuv420p" -r 30 \
  -c:v libx264 -profile:v high -level:v 5.1 -preset slower -tune film -crf 15 -x264-params aq-mode=3 -maxrate 20M -bufsize 40M \
  -colorspace bt709 -color_primaries bt709 -color_trc bt709 -color_range tv \
  -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart -use_editlist 0 out/crpromo/film-mix.mp4
python3 ~/.vinari-tools/house_master.py out/crpromo/film-mix.mp4 out/crpromo/creators-story-v2.mp4
~/.vinari-tools/opuscar/bin/ffprobe -v error -select_streams v:0 -show_entries stream=codec_name,profile,level,width,height,r_frame_rate,pix_fmt,color_space,color_primaries,color_transfer -of compact out/crpromo/creators-story-v2.mp4
