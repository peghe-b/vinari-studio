#!/bin/zsh
# The creator story's local assets (all under public/vo/crpromo, gitignored; rebuilt by this script):
#  - stockA/, stockB/: two FREE Pexels clips (Pexels License: free commercial use, no attribution, no login), graded to
#    the film's calm look (a little less saturation, a gentle lift), as 30 fps JPEG frames:
#      A https://www.pexels.com/video/a-woman-in-high-heels-standing-next-to-a-green-car-16120743/  (paashuu)
#      B https://www.pexels.com/video/a-woman-in-a-white-dress-and-green-car-16120737/             (paashuu)
#    downloaded into their own folder (untrusted data) by curl from videos.pexels.com, never executed.
#  - rec/: the real vinari.ge path (capture.cjs), onb01/onb15: the app's real first-open screens (Marketing/26).
set -e
cd "${0:A:h}/../../.."
FF=~/.vinari-tools/opuscar/bin/ffmpeg
DL=/private/tmp/claude-501/cr/stock_dl
O=public/vo/crpromo
mkdir -p $DL $O/stockA $O/stockB $O/rec
[[ -f $DL/16120743.mp4 ]] || curl -s -o $DL/16120743.mp4 https://videos.pexels.com/video-files/16120743/16120743-uhd_1440_2560_30fps.mp4
[[ -f $DL/16120737.mp4 ]] || curl -s -o $DL/16120737.mp4 https://videos.pexels.com/video-files/16120737/16120737-uhd_1440_2560_30fps.mp4
G="eq=saturation=0.84:contrast=0.96:gamma=1.05:brightness=0.012,colorbalance=rs=0.01:bs=-0.01:rh=0.015:bh=-0.01"
$FF -v error -y -ss 0 -t 3.2 -i $DL/16120743.mp4 -vf "fps=30,scale=1080:1920:flags=lanczos,$G,unsharp=5:5:0.25" -q:v 2 $O/stockA/f%03d.jpg
$FF -v error -y -ss 0 -t 6.2 -i $DL/16120737.mp4 -vf "fps=30,scale=810:1440:flags=lanczos,$G,unsharp=5:5:0.2" -q:v 2 $O/stockB/f%03d.jpg
cp /private/tmp/claude-501/cr/rec/*.jpg /private/tmp/claude-501/cr/rec/manifest.json $O/rec/
python3 - <<'PY'
from PIL import Image
base = '/Users/admin/Documents/Claude Projects/Vinari/Marketing/26 — ონბორდინგი/ახლა/'
for src, dst in [('01-დავიწყოთ.png', 'onb01.jpg'), ('15-როგორ-მოგვაგნე.png', 'onb15.jpg')]:
    im = Image.open(base + src).convert('RGB').resize((1080, 2348), Image.LANCZOS).crop((0, 1, 1080, 2347))
    im.save('public/vo/crpromo/' + dst, quality=95)
PY
ls $O/stockA | wc -l; ls $O/stockB | wc -l; ls $O/rec | wc -l
# the app's Mercedes-era captures (no Toyota anywhere): home, the diagnostics hub, the VIN result
for f in 23-home-104 26-diagnostics-hub 34-vin-result; do cp ~/.vinari-tools/opuscar/lib/films/_shared/$f.jpg $O/$f.jpg; done
