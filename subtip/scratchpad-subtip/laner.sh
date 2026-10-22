#!/bin/bash
# After the fit lane (lane7) is done: captured wall profile of A at nj=80, corner-patch fits, anchored x0 series.
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until grep -q "lane done" $S/lane7.log; do sleep 30; done
cd /home/user/bowshock
echo "$(date -Is) start capprofile A 4" >> $S/lane10.log
CASE=A REF=4 STEPS=12000 OUT=$S/capprofile.jsonl ONLY=tests/tmp-subtip/capprofile.test.ts npx vitest run --config tests/tmp-subtip/vitest.config.ts >> $S/lane10.log 2>&1
echo "$(date -Is) end capprofile A 4 exit $?" >> $S/lane10.log
$S/laned.sh lane11 "D|1:1e-3|" "D|2:1e-3|" "B|1:1e-3|" "B|2:1e-3|" "D|4:1e-3|" "B|4:1e-3|"
exec $S/laneb.sh lane12 "A|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "B|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "C|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "A|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2" "B|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2" "C|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2"
