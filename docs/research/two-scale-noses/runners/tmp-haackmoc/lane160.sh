#!/bin/bash
# Throwaway (2026-10-22): the 1-caliber Von Karman nose (one caliber of
# cylinder) at Mach 2 on nj = 160, seeded from its nj = 80 fit, so the
# page's four-grid run (nj = 20 to 160) can be checked on one Von Karman
# case. Waits for lanex (process group given as $1) to end first, so only
# one Haack lane computes at a time. Skips when the save exists.
cd /tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/haack/lane || exit 1
D=tests/tmp-haackmoc
LOG=$D/lane160.log
WAIT=$1
if [ -n "$WAIT" ]; then
  echo "$(date -u +%FT%TZ) waiting for process group $WAIT" >> $LOG
  while kill -0 -- -"$WAIT" 2>/dev/null; do sleep 60; done
fi
name=L1c1M2r8
if [ ! -f "$D/$name.json" ]; then
  if [ ! -f "$D/ckpt-$name.json" ]; then node $D/seed.mjs $D/L1c1M2r4 $D/ckpt-$name >> $LOG; fi
  echo "$(date -u +%FT%TZ) start $name" >> $LOG
  env SHAPE=haack C=0 L=1 M=2 CYL=1 REF=8 UNGATED=1 CHUNK=125 CHECKPOINT=$D/ckpt-$name SAVE=$D/$name ONLY=$D/fitsave.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-$name.out 2>&1
  echo "$(date -u +%FT%TZ) done $name" >> $LOG
fi
echo "$(date -u +%FT%TZ) lane160 finished" >> $LOG
