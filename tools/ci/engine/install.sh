#!/usr/bin/env bash
# The API engine's install, run by tools/ci/setup.sh in the cloud only (plan step 2.1): the packages of
# tools/ci/engine/package-lock.json without their optional per-platform Claude Code binaries (npm would install
# both the glibc and the musl one, about 230 MB each), then the ONE binary this runner needs, the version the
# lockfile pins, its integrity checked against the lockfile, into tools/ci/engine/bin/claude (claude-run.mjs passes
# it to the Agent SDK). Any failure exits non-zero and the films run on the Claude token as before.
set -euo pipefail
cd "$(dirname "$0")"
npm ci --omit=optional --no-audit --no-fund --loglevel=error
case "$(uname -s)-$(uname -m)" in
  Linux-x86_64) plat=linux-x64 ;;
  Linux-aarch64|Linux-arm64) plat=linux-arm64 ;;
  Darwin-arm64) plat=darwin-arm64 ;;
  Darwin-x86_64) plat=darwin-x64 ;;
  *) echo "no Claude Code binary for $(uname -s)-$(uname -m)" >&2; exit 1 ;;
esac
# a musl system (Alpine) needs the -musl build; the runner is glibc
if [[ $plat == linux-* ]] && ldd --version 2>&1 | grep -qi musl; then plat="$plat-musl"; fi
pkg="@anthropic-ai/claude-agent-sdk-$plat"
read -r ver want < <(node -e '
  const l = require("./package-lock.json").packages["node_modules/" + process.argv[1]] || {};
  console.log(l.version || "", l.integrity || "");' "$pkg")
[[ -n $ver && -n $want ]] || { echo "the lockfile has no $pkg" >&2; exit 1; }
tmp=$(mktemp -d)
trap 'rm -rf "$tmp"' EXIT
got=$(npm pack "$pkg@$ver" --pack-destination "$tmp" --json --loglevel=error | node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>console.log(JSON.parse(s)[0].integrity))')
[[ "$got" == "$want" ]] || { echo "$pkg@$ver: integrity $got is not the lockfile's" >&2; exit 1; }
tar -xzf "$tmp"/*.tgz -C "$tmp"
mkdir -p bin
install -m 755 "$tmp/package/claude" bin/claude
echo "the API engine: $(bin/claude --version) ($pkg@$ver)"
