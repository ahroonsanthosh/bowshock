#!/bin/bash
# A grid whose fit stalls short of the early stop (the drag oscillating
# about a value instead of settling): resumed from its checkpoint and run
# to MAXIT iterations per refinement, then saved as not converged, its
# last changes recorded in the log. Usage: finish.sh SHAPE CAL RATIO M REF MAXIT
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475
cd "$W/tests/tmp-w6b/tree" || exit 1
D=$W/tests/tmp-w6b/out
name=$1$2rn$3M$4r$5
[ -f "$D/$name.json" ] && exit 0
echo "$(date -u +%FT%TZ) finish start $name to $6 per refinement" >> "$D/queue.log"
env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 REF=$5 MAXIT=$6 CHUNK=500 CHECKPOINT=$D/ckpt-$name \
  SAVE=$D/$name OUT=$D/results.jsonl LOG=$D/log.txt ONLY=tests/w6b/fit.test.ts \
  npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-$name-finish.out" 2>&1
echo "$(date -u +%FT%TZ) finish done $name exit $?" >> "$D/queue.log"
