#!/bin/zsh
# The hook, final: the picture (muted, the promo's encoder settings) and the mastered mix muxed once as AAC 320k.
#   zsh src/navhook/build/render.sh      (before it: build/voices.py, build/plan.py)
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
HEAVY="/Users/admin/Documents/Claude Projects/Vinari/scripts/heavy.sh"
sh "$HEAVY" zsh tools/lock.sh npx remotion render src/navhook/index.ts NavHook out/navhook/picture.mp4 \
  --gl=angle "--browser-executable=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --chrome-mode=chrome-for-testing \
  --log=error --concurrency=2 --config=src/navhook/remotion.config.ts --muted --props='{"audio":false}'
FF=~/.vinari-tools/opuscar/bin/ffmpeg
$FF -hide_banner -v error -nostdin -y -i out/navhook/picture.mp4 -i public/vo/navhook/mix.wav -map 0:v:0 -map 1:a:0 -c:v copy -c:a aac -b:a 320k -ar 48000 -shortest -movflags +faststart out/navhook/vinari-navhook.mp4
echo "done: out/navhook/vinari-navhook.mp4"
