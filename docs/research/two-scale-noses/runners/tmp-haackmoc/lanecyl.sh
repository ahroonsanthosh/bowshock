#!/bin/bash
# Throwaway (2026-10-22): does the body behind a Von Karman nose move its
# drag? The 3-caliber nose at Mach 2 with 0 calibers of cylinder (solved
# with the shortest cylinder the fit solves, 1 caliber) and with 30, on
# nj = 20 and 40, against the 2-caliber family (L3M2r1, r2). Waits for the
# process groups given as arguments to end first. Skips saved runs.
cd /tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/haack/lane || exit 1
D=tests/tmp-haackmoc
LOG=$D/lanecyl.log
for g in "$@"; do
  echo "$(date -u +%FT%TZ) waiting for process group $g" >> $LOG
  while kill -0 -- -"$g" 2>/dev/null; do sleep 60; done
done
one() {
  local tag=$1 cyl=$2 r=$3 name=$1r$3
  if [ -f "$D/$name.json" ]; then return; fi
  echo "$(date -u +%FT%TZ) start $name" >> $LOG
  env SHAPE=haack C=0 L=3 M=2 CYL=$cyl REF=$r UNGATED=1 CHUNK=500 CHECKPOINT=$D/ckpt-$name SAVE=$D/$name ONLY=$D/fitsave.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-$name.out 2>&1
  echo "$(date -u +%FT%TZ) done $name" >> $LOG
}
seed() {
  local from=$D/$1r1 to=$D/ckpt-$1r2
  if [ -f "$to.json" ] || [ ! -f "$from.json" ]; then return; fi
  node $D/seed.mjs "$from" "$to" >> $LOG
}
one L3c0M2 0 1
seed L3c0M2
one L3c0M2 0 2
one L3c30M2 30 1
seed L3c30M2
one L3c30M2 30 2
echo "$(date -u +%FT%TZ) lanecyl finished" >> $LOG
