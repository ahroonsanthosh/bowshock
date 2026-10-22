#!/bin/bash
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until grep -q "lane done" $S/lane3.log 2>/dev/null; do sleep 30; done
exec $S/laned.sh lane6 "B|1:1e-3|" "C|1:1e-3|" "B|2:1e-3|" "C|2:1e-3|" "B|4:1e-3|" "C|4:1e-3|"
