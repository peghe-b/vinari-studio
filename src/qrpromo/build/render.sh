#!/bin/zsh
# The QR promo, final: the film (out/qrpromo/vinari-qr-promo.mp4) with both voices and the sound (public/vo/qrpromo/mix.wav).
# One heavy job at a time: every Chrome job goes through scripts/heavy.sh and tools/lock.sh.
#   zsh src/qrpromo/build/render.sh [--concurrency 1]
# Before it: python3 src/qrpromo/build/voices.py (cached takes), sfx_synth.py, plan.py (timeline.json + mix.wav).
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
HEAVY="/Users/admin/Documents/Claude Projects/Vinari/scripts/heavy.sh"
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
CONC=3
while (( $# )); do
  case $1 in
    --concurrency) CONC=$2; shift ;;
  esac
  shift
done
mkdir -p out/qrpromo
sh "$HEAVY" zsh tools/lock.sh npx remotion render src/qrpromo/index.ts QrPromo out/qrpromo/vinari-qr-promo.mp4 \
  "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/qrpromo/remotion.config.ts --audio-bitrate=320k --props='{"audio":true}'
