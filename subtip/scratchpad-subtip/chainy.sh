#!/bin/bash
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until grep -q "lane done" $S/lane33.log; do sleep 30; done
exec $S/lanec3.sh lane36 F G
