#!/bin/bash
# Throwaway: the marches of characteristics of the Mach 3 references (3
# calibers on nj = 40 and 80; 1 caliber on nj = 20, 40 and 80).
cd /home/user/bowshock/.claude/worktrees/agent-abd83b26cc3489c03 || exit 1
D=tests/tmp-haackmoc
echo "$(date -u +%FT%TZ) start marches-L3M3" >> $D/marches.log
env C=0 L=3 M=3 CYL=2 MOC_R=2,4 MOC_FILES=$D/L3M3r2,$D/L3M3r4 MOC_LINES=140,180,230,290,350 MOC_RUN=640,1280,2560 MOC_OUT=$D/moc-L3M3.txt ONLY=$D/moc.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-mocL3M3r24.out 2>&1
echo "$(date -u +%FT%TZ) done marches-L3M3" >> $D/marches.log
echo "$(date -u +%FT%TZ) start marches-L1c1M3" >> $D/marches.log
env C=0 L=1 M=3 CYL=1 MOC_R=1,2,4 MOC_FILES=$D/L1c1M3r1,$D/L1c1M3r2,$D/L1c1M3r4 MOC_LINES=88,96,104,112,120,136 MOC_RUN=640,1280,2560 MOC_OUT=$D/moc-L1c1M3.txt ONLY=$D/moc.test.ts npx vitest run --config $D/vitest.config.ts > $D/run-mocL1M3.out 2>&1
echo "$(date -u +%FT%TZ) done marches-L1c1M3" >> $D/marches.log
