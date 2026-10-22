#!/bin/bash
# Throwaway: one LD-Haack family for a reference of the served region
# (nj = 20, 40 and 80, the fields saved for the march of characteristics),
# each finer fit started from the saved coarser one (seed.mjs), ungated
# before the fit (the fitted grid's gates are recorded with its fields).
# Usage: family.sh TAG L CYL M LOG   (lengths in body radii' units: L = calibers)
cd /home/user/bowshock/.claude/worktrees/agent-abd83b26cc3489c03 || exit 1
TAG=$1; L=$2; CYL=$3; M=$4; LOG=$5
D=tests/tmp-haackmoc
one() {
  local r=$1 chunk=$2 name=${TAG}r$1
  if [ -f "$D/$name.json" ]; then return; fi
  echo "$(date -u +%FT%TZ) start $name" >> "$LOG"
  env SHAPE=haack C=0 L=$L M=$M CYL=$CYL REF=$r UNGATED=1 CHUNK=$chunk CHECKPOINT=$D/ckpt-$name SAVE=$D/$name ONLY=$D/fitsave.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-$name.out 2>&1
  echo "$(date -u +%FT%TZ) done $name" >> "$LOG"
}
seed() {
  local from=$D/${TAG}r$1 to=$D/ckpt-${TAG}r$2
  if [ -f "$to.json" ] || [ ! -f "$from.json" ]; then return; fi
  node $D/seed.mjs "$from" "$to" >> "$LOG"
}
one 1 500
seed 1 2
one 2 500
seed 2 4
one 4 250
