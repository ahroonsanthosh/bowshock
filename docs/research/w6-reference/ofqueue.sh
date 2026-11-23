#!/bin/bash
# OpenFOAM's registered runs in turn, inside one window (README, "OpenFOAM's
# registration", O9):
#
#   LADDER_DEADLINE=<seconds since the epoch> bash ofqueue.sh <reference dir> <name>...
#
# Each run goes through `ofref.py case` (levels 0 to 3, widened as R3 says);
# a run that finished is not run again, and one the window stopped goes on
# from its last save when the queue is started again. The queue stops at the
# window's end (exit 3), at a run stopped from outside (exit 4), or at any
# other failure of the runner itself.
here=$(cd "$(dirname "$0")" && pwd)
ref=$1
shift
for name in "$@"; do
  python3 -I "$here/ofref.py" case "$ref" "$name"
  code=$?
  if [ $code -ne 0 ]; then
    echo "queue stopped at $name (exit $code)"
    exit $code
  fi
done
echo "queue done"
