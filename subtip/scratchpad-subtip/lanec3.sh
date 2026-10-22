#!/bin/bash
# Usage: lanec.sh NAME CASE...   captured-shock runs, sequentially
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
name=$1; shift
cd /home/user/bowshock
for c in "$@"; do
  echo "$(date -Is) start captured $c" >> $S/$name.log
  CASE=$c OUT=$S/captured3.jsonl ONLY=tests/tmp-subtip/captured3.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/$name.log 2>&1
  echo "$(date -Is) end captured $c exit $?" >> $S/$name.log
done
echo "$(date -Is) lane done" >> $S/$name.log
