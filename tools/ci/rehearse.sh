#!/usr/bin/env bash
# Rehearse the studio workflow's tail on this machine, for a spec that already exists: the same commands
# the workflow's voice, render, cover, package and publish steps run, minus the upload and the push.
#   tools/ci/rehearse.sh <id>          e.g. tools/ci/rehearse.sh v11-vin-photo
# A made-up request id goes into a temporary copy of specs/.studio.json (STUDIO_LEDGER), so the real
# ledger is never touched; the three deliverables land in a temporary folder, printed at the end.
# The voice must already be cached: Gemini is pointed at a dead address, so a cache miss fails instead
# of spending the small free quota (REHEARSE_NETWORK=1 lets it through).
set -euo pipefail
cd "$(dirname "$0")/../.."
id="${1:?usage: tools/ci/rehearse.sh <spec id>}"
[[ -f "specs/$id.json" ]] || { echo "no specs/$id.json"; exit 1; }
[[ -d "$HOME/.local/node/bin" ]] && export PATH="$HOME/.local/node/bin:$PATH"

tmp=$(mktemp -d "${TMPDIR:-/tmp}/vinari-rehearse.XXXXXX")
export STUDIO_REQ="r-$(date +%y%m%d%H)-test"
export STUDIO_LEDGER="$tmp/studio.json" RUNNER_TEMP="$tmp" VS_CI=1
[[ -n "${REHEARSE_NETWORK:-}" ]] || export GEMINI_BASE_URL="http://127.0.0.1:9"
if [[ -f specs/.studio.json ]]; then cp specs/.studio.json "$STUDIO_LEDGER"; else echo '{}' > "$STUDIO_LEDGER"; fi
node --input-type=module -e '
import {readLedger, writeLedger} from "./tools/ci/resolve.mjs";
const [req, id] = process.argv.slice(1);
writeLedger({...readLedger(), [req]: {id, topic: "rehearsal", base: null, at: new Date().toISOString().replace(/\.\d{3}Z$/, "Z")}});
' "$STUDIO_REQ" "$id"
echo "rehearse: request $STUDIO_REQ -> $id (ledger $STUDIO_LEDGER)"
t0=$SECONDS
lap() { echo "rehearse: $1 done at $((SECONDS - t0)) s"; }

# voice
STUDIO_ID=$(node tools/ci/resolve.mjs); export STUDIO_ID
python3 tools/vo.py "$STUDIO_ID"
lap voice
# render
./make.sh "$STUDIO_ID"
lap render
# cover
node tools/covers.mjs "$STUDIO_ID"
lap cover
# package (the workflow uploads these three files)
node tools/ci/publish.mjs package
# publish (dry run: prints what it would commit, and the job summary)
node tools/ci/publish.mjs publish --dry-run
lap publish
ls -l "$RUNNER_TEMP/studio"
echo "rehearse: deliverables in $RUNNER_TEMP/studio"
