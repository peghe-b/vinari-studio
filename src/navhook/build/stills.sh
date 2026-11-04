#!/bin/zsh
# Half-size stills of the hook at the given frames (out/navhook/s-<frame>.png) from the prebuilt bundle (out/navhook/bundle).
#   zsh src/navhook/build/stills.sh 25 80 130
cd "${0:A:h}/../../.."
export PATH=/Users/admin/.local/node/bin:$PATH
for f in "$@"; do
  zsh tools/lock.sh npx remotion still out/navhook/bundle NavHook out/navhook/s-$f.png --frame=$f --props='{"audio":false}' --log=error --scale=0.5 \
    --gl=angle "--browser-executable=/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --chrome-mode=chrome-for-testing
done
