#!/bin/zsh
# Runs one heavy job at a time on this 8 GB M1, whoever asks (you, an agent, make.sh):
#   tools/lock.sh <command...>
# A lock older than 20 minutes is treated as left behind by a killed job.
LOCK="${0:A:h}/../out/.render.lock"
mkdir -p "${0:A:h}/../out"
while ! mkdir "$LOCK" 2>/dev/null; do
  if [[ -n $(find "$LOCK" -maxdepth 0 -mmin +20 2>/dev/null) ]]; then rmdir "$LOCK" 2>/dev/null; continue; fi
  sleep 2
done
trap 'rmdir "$LOCK" 2>/dev/null' EXIT INT TERM
"$@"
