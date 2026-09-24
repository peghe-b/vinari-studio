#!/bin/zsh
# Double-click in Finder: starts the one-click video maker and opens it in the browser.
cd "${0:A:h}"
export PATH="/Users/admin/.local/node/bin:$PATH"
(sleep 1.2; open "http://127.0.0.1:4777") &
node tools/app.mjs
