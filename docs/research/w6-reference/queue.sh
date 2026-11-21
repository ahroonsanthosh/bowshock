#!/bin/bash
# SU2's cases in order, inside one of the session's two-hour background
# windows. A case with a result.json is skipped; a case stopped between
# levels goes on from its first level without a record (w6ref.py). The
# queue stops, to be started again, at the first level that could not
# finish before the window closes (w6ref.py exits 3 without starting it).
# Usage: queue.sh SU2_CFD THREADS WINDOW_SECONDS RUN_DIR ...
SU2=$1
T=$2
W=$3
shift 3
export W6REF_DEADLINE=$(( $(date +%s) + W ))
for d in "$@"; do
  [ -f "$d/result.json" ] && continue
  echo "== $(basename "$d") $(date -u +%T)"
  python3 -I docs/research/w6-reference/w6ref.py case "$d/spec.json" "$d" "$SU2" "$T"
  c=$?
  if [ $c -eq 3 ]; then
    echo "window closing: $(basename "$d") goes on in the next one"
    exit 3
  fi
  [ $c -ne 0 ] && echo "$(basename "$d") stopped with exit $c"
done
echo "queue done $(date -u +%T)"
