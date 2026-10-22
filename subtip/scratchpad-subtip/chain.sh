#!/bin/bash
# Waits for lane2 to finish, then runs the captured lane (B then A); waits for lane1, then anchored series then captured C.
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
which=$1
if [ "$which" = "x" ]; then
  until grep -q "lane done" $S/lane2.log; do sleep 30; done
  exec $S/lanec.sh lane3 B A
else
  until grep -q "lane done" $S/lane1.log; do sleep 30; done
  $S/laneb.sh lane4 "B|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "A|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "C|1:3e-3,1:1e-3,1:3e-4,1:1e-4|1e-2" "B|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2" "A|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2" "C|2:3e-3,2:1e-3,2:3e-4,2:1e-4|1e-2"
  exec $S/lanec.sh lane5 C
fi
