#!/usr/bin/env bash
# The studio workflow's "setup" step (.github/workflows/studio.yml): everything a fresh ubuntu runner
# needs, in one step. Run from anywhere; it works in the studio root.
#   1. zsh (make.sh and tools/lock.sh are zsh scripts)
#   2. npm ci (the lockfile carries Remotion's Linux compositor: ffmpeg, ffprobe with libfdk_aac)
#   3. the Python packages (requirements.txt; tools/pylib is macOS-only and not in the repo)
#   4. Remotion's chrome-headless-shell (`npx remotion browser ensure`), kept in ~/.cache/remotion-browser
#      so actions/cache can carry it from run to run (npm ci wipes node_modules, where Remotion keeps it)
#   5. the shared libraries it loads (remotion.dev/docs/miscellaneous/linux-dependencies); the runner
#      image ships Google Chrome, so they are normally there and apt runs only for what is missing
#   6. a smoke test of each piece, so a broken install fails here and not twenty minutes later
set -euo pipefail
cd "$(dirname "$0")/../.."
t0=$SECONDS
group() { echo "::group::$*"; }
endgroup() { echo "::endgroup::"; }
apt_updated=0
apt_install() {
  (( apt_updated )) || { sudo apt-get update -qq; apt_updated=1; }
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y -qq --no-install-recommends "$@"
}

group "zsh"
command -v zsh >/dev/null || apt_install zsh
zsh --version
endgroup

group "npm ci"
npm ci --no-audit --no-fund --loglevel=error
endgroup

group "python packages"
python3 -m pip install --disable-pip-version-check -q -r requirements.txt
endgroup

group "chrome-headless-shell"
cache="$HOME/.cache/remotion-browser"
mkdir -p "$cache"
rm -rf node_modules/.remotion
ln -s "$cache" node_modules/.remotion
npx remotion browser ensure
shell=$(find -L node_modules/.remotion -type f -name chrome-headless-shell -perm -u+x 2>/dev/null | head -1)
[[ -n "$shell" ]] || { echo "::error::chrome-headless-shell was not downloaded"; exit 1; }
echo "browser: $shell"
missing=$(ldd "$shell" | awk '/not found/ {print $1}' || true)
if [[ -n "$missing" ]]; then
  echo "missing libraries: $missing"
  alsa=libasound2t64; apt-cache show libasound2t64 >/dev/null 2>&1 || alsa=libasound2
  apt_install libnss3 libdbus-1-3 libatk1.0-0 "$alsa" libxrandr2 libxkbcommon0 libxfixes3 libxcomposite1 \
    libxdamage1 libgbm1 libcups2 libcairo2 libpango-1.0-0 libatk-bridge2.0-0
  missing=$(ldd "$shell" | awk '/not found/ {print $1}' || true)
  [[ -z "$missing" ]] || { echo "::error::chrome-headless-shell still misses: $missing"; exit 1; }
fi
# VS_GL=angle-egl / egl (repo variable STUDIO_GL): WebGL on the system's EGL, i.e. Mesa's llvmpipe on a
# GPU-less runner, instead of Chrome's own SwiftShader (the default, swangle). An experiment for speed.
if [[ "${VS_GL:-}" == *egl* ]]; then
  apt_install libegl1 libegl-mesa0 libgl1-mesa-dri libgbm1
fi
echo "gl: $(node tools/platform.mjs --gl), concurrency $(node tools/platform.mjs --concurrency), $(nproc) cpus, $(free -g | awk '/Mem:/ {print $2}') GB"
endgroup

group "smoke test"
node tools/platform.mjs
ff=$(node tools/platform.mjs --ffmpeg)
encoders=$(cd "$(dirname "$ff")" && ./ffmpeg -hide_banner -encoders 2>/dev/null) || { echo "::error::the bundled ffmpeg does not start ($ff)"; exit 1; }
[[ "$encoders" == *libfdk_aac* ]] || { echo "::error::the bundled ffmpeg has no libfdk_aac ($ff)"; exit 1; }
python3 -c "import edge_tts, numpy, scipy, PIL; print('python', edge_tts.__version__ if hasattr(edge_tts, '__version__') else 'edge-tts', numpy.__version__, scipy.__version__, PIL.__version__)"
endgroup

echo "setup: done in $((SECONDS - t0)) s"
