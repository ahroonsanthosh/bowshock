#!/bin/bash
# Wait up to 570 s for the count of finished grids to exceed $1; print state.
Q=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6/out
for _ in $(seq 57); do
  [ "$(grep -c 'done rn\|stopped\|finished' "$Q/queue.log")" -gt "$1" ] && break
  sleep 10
done
echo "count $(grep -c 'done rn\|stopped\|finished' "$Q/queue.log")"
tail -2 "$Q/queue.log"
grep 'iterations, maxSpeed' "$Q/log.txt" | tail -2 | cut -c1-200
