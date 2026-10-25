#!/bin/bash
# Throwaway (2026-10-22): the 3-caliber Von Karman nose (2 calibers of
# cylinder) at Mach 2 on nj = 160, seeded from its nj = 80 fit: the second
# check of the page's four-grid run on Von Karman noses (the reviewer's
# riskier case, fitted order 1.49). Waits for the process groups given as
# arguments (the transonic lanes) to end first. Skips when the save exists.
cd /tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/haack/lane || exit 1
D=tests/tmp-haackmoc
LOG=$D/lane160b.log
for g in "$@"; do
  echo "$(date -u +%FT%TZ) waiting for process group $g" >> $LOG
  while kill -0 -- -"$g" 2>/dev/null; do sleep 60; done
done
name=L3M2r8
if [ ! -f "$D/$name.json" ]; then
  if [ ! -f "$D/ckpt-$name.json" ]; then node $D/seed.mjs $D/L3M2r4 $D/ckpt-$name >> $LOG; fi
  echo "$(date -u +%FT%TZ) start $name" >> $LOG
  env SHAPE=haack C=0 L=3 M=2 CYL=2 REF=8 UNGATED=1 CHUNK=125 CHECKPOINT=$D/ckpt-$name SAVE=$D/$name ONLY=$D/fitsave.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-$name.out 2>&1
  echo "$(date -u +%FT%TZ) done $name" >> $LOG
fi
echo "$(date -u +%FT%TZ) lane160b finished" >> $LOG
