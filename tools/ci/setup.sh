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
#   7. Remotion's own agent rules (github.com/remotion-dev/skills, pinned) for the cloud Claude's Film scenes, read only
#      when a film needs a technique; text only, never run, never committed (optional: a failed fetch only warns)
#   8. the API engine (tools/ci/engine/install.sh: the Agent SDK, the Anthropic SDK, zod, one Claude Code binary) when
#      the workflow says STUDIO_API_ENGINE=1 (the repo has the API key and the run is not on the Claude token only);
#      optional: a failed install only warns, and the script step runs on the Claude token as before
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

group "remotion skills"
# pinned (2026-10-16): to update, git ls-remote https://github.com/remotion-dev/skills HEAD, read the diff, change the sha
SKILLS_SHA=1441a11e95db35443bd76bb318386c0d3ca00053
dest=.claude/skills/remotion-best-practices
if [[ ! -f $dest/SKILL.md ]]; then
  tmp=$(mktemp -d)
  if curl -fsSL --max-time 30 "https://codeload.github.com/remotion-dev/skills/tar.gz/$SKILLS_SHA" | tar -xz -C "$tmp" 2>/dev/null &&
     [[ -f "$tmp/skills-$SKILLS_SHA/skills/remotion-best-practices/SKILL.md" ]]; then
    mkdir -p .claude/skills
    rm -rf "$dest"
    mv "$tmp/skills-$SKILLS_SHA/skills/remotion-best-practices" "$dest"
    # rules only: its scripts, sample code and agent configs out (the cloud Claude reads; it never installs or runs them)
    find "$dest" -type f ! -name '*.md' -delete
    echo "remotion skills: $(find "$dest" -name '*.md' | wc -l | tr -d ' ') rule files at ${SKILLS_SHA:0:7}"
  else
    echo "::warning::the Remotion skills could not be fetched; the films go on without them"
  fi
  rm -rf "$tmp"
fi
endgroup

group "the API engine"
if [[ "${STUDIO_API_ENGINE:-}" == 1 ]]; then
  # its own bash process, so its "set -e" holds (an if condition would switch it off)
  if bash tools/ci/engine/install.sh; then
    echo "ready: the script step runs on the API key, the Claude token when it hands over"
  else
    rm -rf tools/ci/engine/bin
    echo "::warning::the API engine did not install: the script step runs on the Claude token"
  fi
else
  echo "not needed (no API key in the repo's secrets, or the run is on the Claude token only)"
fi
endgroup

echo "setup: done in $((SECONDS - t0)) s"
