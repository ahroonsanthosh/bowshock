#!/bin/bash
# Diagnostic: the fitted flow across lines on nj 20, 40, 80. Usage: profile.sh SHAPE CAL RATIO M LINES
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475
cd "$W/tests/tmp-w6b/tree" || exit 1
D=$W/tests/tmp-w6b/out
tag=$1$2rn$3M$4
env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 LINES=$5 \
  OUT=$D/profile-$tag.json ONLY=tests/w6b/profile.test.ts \
  npx vitest run --config tests/w6b/vitest.config.ts >> "$D/profile.out" 2>&1
echo "exit $? $tag" >> "$D/profile.out"
