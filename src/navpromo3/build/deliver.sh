#!/bin/zsh
# The navigator + CarPlay promo's delivery, after render.sh: into the Marketing folder
#   ნავიგატორი-CarPlay-პრომო.mp4                   the film at full quality (as rendered: h264 8 Mbps, AAC 320k)
#   ნავიგატორი-CarPlay-პრომო-ტელეფონისთვის.mp4     the same at crf 23 (a light file for the phone)
#   ნავიგატორი-CarPlay-პრომო-კადრები.png           a contact sheet: one still every 1.5 s of the final film
# and the glitch scan of the final film (glitch.py: a frame unlike both neighbours that match each other).
#   zsh src/navpromo3/build/deliver.sh
set -e
cd "${0:A:h}/../../.."
DEST="/Users/admin/Documents/Claude Projects/Vinari/Marketing/19 — ნავიგატორი CarPlay პრომო"
SRC=out/navpromo3/vinari-navcarplay-promo.mp4
COMP=node_modules/@remotion/compositor-darwin-arm64
FF() { DYLD_LIBRARY_PATH=$COMP $COMP/ffmpeg -hide_banner -nostdin -y "$@" }
mkdir -p "$DEST"
cp "$SRC" "$DEST/ნავიგატორი-CarPlay-პრომო.mp4"
FF -v error -i "$SRC" -c:v libx264 -preset slow -crf 23 -pix_fmt yuv420p -c:a aac -b:a 160k -movflags +faststart "$DEST/ნავიგატორი-CarPlay-პრომო-ტელეფონისთვის.mp4"
# the contact sheet: a still every 1.5 s, named by frame number (sheet.py prints the frame and the second under each)
TMP=$(mktemp -d)
DUR=$(DYLD_LIBRARY_PATH=$COMP $COMP/ffprobe -v error -show_entries format=duration -of csv=p=0 "$SRC")
python3 - "$DUR" "$TMP" <<'EOF'
import sys
dur, tmp = float(sys.argv[1]), sys.argv[2]
t = 0.0
with open(f"{tmp}/times.txt", "w") as f:
    while t < dur - 0.05:
        f.write(f"{t:.3f} {round(t * 30):04d}\n")
        t += 1.5
EOF
while read -r T F; do
  FF -v error -ss "$T" -i "$SRC" -frames:v 1 -vf scale=540:960 "$TMP/s-$F.png"
done < "$TMP/times.txt"
python3 src/navpromo3/build/sheet.py "$DEST/ნავიგატორი-CarPlay-პრომო-კადრები.png" $TMP/s-*.png
rm -rf "$TMP"
python3 src/navpromo3/build/glitch.py "$SRC" || true
ls -la "$DEST"
