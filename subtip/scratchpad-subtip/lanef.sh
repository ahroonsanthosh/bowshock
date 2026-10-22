#!/bin/bash
# Usage: lanef.sh NAME JOB...  with JOB = family:CASE:FAMILY:SCALE:MAXREF or cold:CASE:REF (sequential)
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
name=$1; shift
cd /home/user/bowshock
for job in "$@"; do
  IFS=':' read -r kind a b c2 d <<< "$job"
  echo "$(date -Is) start $job" >> $S/$name.log
  if [ "$kind" = family ]; then
    CASE=$a FAMILY=$b SCALE=$c2 MAXREF=$d OUT=$S/family3.jsonl STATE=$S/state3 ONLY=tests/tmp-subtip/family.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/$name.log 2>&1
  else
    CASE=$a REF=$b OUT=$S/cold3.jsonl ONLY=tests/tmp-subtip/cold.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/$name.log 2>&1
  fi
  echo "$(date -Is) end $job exit $?" >> $S/$name.log
done
echo "$(date -Is) lane done" >> $S/$name.log
