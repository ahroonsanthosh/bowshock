#!/bin/bash
# W6 probe lanes (docs/research/w6-probe). Run from the probe tree root
# (a checkout of claude/wip/haack-merge ee4b57a with cap.patch applied and
# the runners in tests/w6/). Each family: nj = 20, 40, 80 (or up to MAXREF),
# each finer grid seeded from the saved coarser one; finished grids skip
# (their save exists), unfinished ones resume from their checkpoint.
# Usage: run.sh LANE   (lane1 | lane2 | grids)
TREE=${TREE:-/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6/hm}
cd "$TREE" || exit 1
D=$TREE/../out
mkdir -p "$D"
QUEUE=$D/queue.log

family() { # RATIO M MAXREF
  local ratio=$1 m=$2 maxref=$3 r prev=""
  for r in 1 2 4; do
    [ "$r" -gt "$maxref" ] && break
    local name=rn${ratio}M${m}r$r
    if [ ! -f "$D/$name.json" ]; then
      if [ -n "$prev" ] && [ ! -f "$D/ckpt-$name.json" ] && [ -f "$D/$prev.json" ]; then
        node tests/w6/seed.mjs "$D/$prev" "$D/ckpt-$name" >> "$QUEUE"
      fi
      echo "$(date -u +%FT%TZ) start $name" >> "$QUEUE"
      env RATIO=$ratio M=$m REF=$r CHUNK=500 CHECKPOINT=$D/ckpt-$name SAVE=$D/$name \
        OUT=$D/results.jsonl LOG=$D/log.txt ONLY=tests/w6/fit.test.ts \
        npx vitest run --config tests/w6/vitest.config.ts > "$D/run-$name.out" 2>&1
      echo "$(date -u +%FT%TZ) done $name exit $?" >> "$QUEUE"
      [ -f "$D/$name.json" ] || { echo "$(date -u +%FT%TZ) $name not saved: family stopped" >> "$QUEUE"; return; }
    fi
    prev=$name
  done
}

case "$1" in
  lane1)
    family 0.05 1.3 4
    family 0.03 1.3 4
    family 0.15 1.3 4
    ;;
  lane2)
    family 0.05 2 4
    family 0.05 3 4
    family 0.03 2 2
    family 0.15 2 2
    family 0.03 3 2
    family 0.15 3 2
    ;;
esac
echo "$(date -u +%FT%TZ) $1 finished" >> "$QUEUE"
