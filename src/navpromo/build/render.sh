#!/bin/zsh
# The navigator promo, final: the film (out/navpromo/vinari-navigator-promo.mp4) and its Reels cover (.cover.png).
# One heavy job at a time: every Chrome job goes through scripts/heavy.sh and tools/lock.sh.
#   zsh src/navpromo/build/render.sh [--cover-only] [--concurrency 1]   (1: the studio's second pass when tools/flicker.py
#   finds a corrupted, tiled frame from a parallel render)
# The film renders with its own config (src/navpromo/remotion.config.ts: the studio's, but 8 Mbps instead of crf 16, which
# gave this flat white film 1.8 Mbps; the brief asks for 6 to 10 Mbps).
set -e
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
HEAVY="/Users/admin/Documents/Claude Projects/Vinari/scripts/heavy.sh"
FLAGS=(${(f)"$(node tools/platform.mjs --flags-lines)"})
COVER_ONLY=0
CONC=3
while (( $# )); do
  case $1 in
    --cover-only) COVER_ONLY=1 ;;
    --concurrency) CONC=$2; shift ;;
  esac
  shift
done
mkdir -p out/navpromo
if (( ! COVER_ONLY )); then
  sh "$HEAVY" tools/lock.sh npx remotion render src/navpromo/index.ts NavPromo out/navpromo/vinari-navigator-promo.mp4 \
    "${FLAGS[@]}" --log=error --concurrency="$CONC" --config=src/navpromo/remotion.config.ts --audio-bitrate=320k --props='{"audio":true}'
fi
sh "$HEAVY" tools/lock.sh npx remotion still src/navpromo/index.ts NavCover out/navpromo/vinari-navigator-promo.cover.png --frame=0 "${FLAGS[@]}" --log=error
