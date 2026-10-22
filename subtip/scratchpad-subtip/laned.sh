#!/bin/bash
# Usage: laneb.sh NAME "CASE|RUNS|ANCHOR" ...   (runs sequentially; ANCHOR may be empty)
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
name=$1; shift
cd /home/user/bowshock
for job in "$@"; do
  IFS='|' read -r c r a <<< "$job"
  echo "$(date -Is) start $c $r anchor=$a" >> $S/$name.log
  ANCHOR=$a CASE=$c RUNS=$r OUT=$S/fits2.jsonl ONLY=tests/tmp-subtip/fit2.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/$name.log 2>&1
  echo "$(date -Is) end $c $r anchor=$a exit $?" >> $S/$name.log
done
echo "$(date -Is) lane done" >> $S/$name.log
