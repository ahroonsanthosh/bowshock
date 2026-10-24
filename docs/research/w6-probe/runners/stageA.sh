#!/bin/bash
# Stage A: generator grids on one tree. Usage: stageA.sh main|hm
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6
cd "$W/$1" || exit 1
env OUT=$W/out/grids.jsonl TREE=$1 ONLY=tests/w6/grids.test.ts \
  npx vitest run --config tests/w6/vitest.config.ts > "$W/out/stageA-$1.out" 2>&1
echo "exit $?" >> "$W/out/stageA-$1.out"
