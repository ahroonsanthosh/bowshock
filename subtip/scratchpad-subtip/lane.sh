#!/bin/bash
# Usage: lane.sh NAME "CASE|RUNS" "CASE|RUNS" ...   (runs sequentially)
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
name=$1; shift
cd /home/user/bowshock
for job in "$@"; do
  c=${job%%|*}; r=${job#*|}
  echo "$(date -Is) start $c $r" >> $S/$name.log
  CASE=$c RUNS=$r OUT=$S/fits.jsonl ONLY=tests/tmp-subtip/fit.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/$name.log 2>&1
  echo "$(date -Is) end $c $r exit $?" >> $S/$name.log
done
echo "$(date -Is) lane done" >> $S/$name.log
