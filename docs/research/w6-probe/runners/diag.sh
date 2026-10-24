#!/bin/bash
# Diagnostic: drag by region for one case's saved grids. Usage: diag.sh RATIO M MAXREF
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6
cd "$W/hm" || exit 1
O=$W/out
saves=""
for r in 1 2 4; do
  [ "$r" -gt "$3" ] && break
  saves="$saves${saves:+,}$O/rn$1M$2r$r"
done
env RATIO=$1 M=$2 SAVES=$saves OUT=$O/diag.jsonl LOG=$O/log.txt ONLY=tests/w6/diag.test.ts \
  nice -n 10 npx vitest run --config tests/w6/vitest.config.ts > "$O/diag-rn$1M$2.out" 2>&1
echo "exit $?" >> "$O/diag-rn$1M$2.out"
