#!/bin/bash
# Throwaway (2026-10-22): the marches of characteristics of the 5-caliber
# Von Karman nose (2 calibers of cylinder) at Mach 2: the scan of nj = 20,
# then the lines of the 5-caliber Mach 1.5 marches (90 to 138) on nj = 20,
# 40 and 80, 640, 1280 and 2560 intervals.
cd /tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/haack/lane || exit 1
D=tests/tmp-haackmoc
if [ ! -s $D/scan-L5c2M2r1.txt ]; then
  echo "$(date -u +%FT%TZ) start scan-L5c2M2" >> $D/marches.log
  env C=0 L=5 M=2 CYL=2 MOC_R=1 MOC_FILES=$D/L5c2M2r1 MOC_LINES=scan MOC_OUT=$D/scan-L5c2M2r1.txt ONLY=$D/moc.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-scanL5c2M2.out 2>&1
  echo "$(date -u +%FT%TZ) done scan-L5c2M2" >> $D/marches.log
fi
if [ ! -s $D/moc-L5c2M2.txt ]; then
  echo "$(date -u +%FT%TZ) start marches-L5c2M2" >> $D/marches.log
  env C=0 L=5 M=2 CYL=2 MOC_R=1,2,4 MOC_FILES=$D/L5c2M2r1,$D/L5c2M2r2,$D/L5c2M2r4 MOC_LINES=90,102,114,126,138 MOC_RUN=640,1280,2560 MOC_OUT=$D/moc-L5c2M2.txt ONLY=$D/moc.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-mocL5c2M2.out 2>&1
  echo "$(date -u +%FT%TZ) done marches-L5c2M2" >> $D/marches.log
fi
