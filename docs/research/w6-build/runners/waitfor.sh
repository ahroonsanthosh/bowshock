#!/bin/bash
# Run from the repository root (or set ROOT to it).
# Wait (up to $2 seconds, default 7000) until the queue log has at least $1
# "done" or "stopped" or "finished" lines; then print the state.
Q=${ROOT:-$PWD}/tests/tmp-w6b/out
limit=${2:-7000}
start=$(date +%s)
while [ "$(grep -c ' done \| not saved\|finished' "$Q/queue.log")" -lt "$1" ]; do
  [ $(( $(date +%s) - start )) -ge "$limit" ] && break
  sleep 30
done
echo "count $(grep -c ' done \| not saved\|finished' "$Q/queue.log")"
grep ' not saved\|finished\|exit [1-9]' "$Q/queue.log" | tail -5
tail -3 "$Q/queue.log"
grep -E 'settled early after|converged after|NOT converged' "$Q/log.txt" | tail -4 | cut -c1-260
