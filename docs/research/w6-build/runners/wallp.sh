#!/bin/bash
# Diagnostic: the march's and the fitted wall pressure behind one line.
# Usage: wallp.sh SHAPE CAL RATIO M REF LINE [ENTROPY]
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475
cd "$W/tests/tmp-w6b/tree" || exit 1
D=$W/tests/tmp-w6b/out
tag=$1$2rn$3M$4
env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 REF=$5 FILE=$D/${tag}r$5 LINE=$6 N=2560 MOC_ENTROPY=${7:-cells} \
  OUT=$D/wallp-$tag-r$5-l$6-${7:-cells}.json ONLY=tests/w6b/wallp.test.ts \
  npx vitest run --config tests/w6b/vitest.config.ts >> "$D/wallp.out" 2>&1
echo "exit $? $tag r$5 l$6" >> "$D/wallp.out"
