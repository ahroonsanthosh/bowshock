#!/bin/bash
# After the captured lane (lane8) is done: fitted A at nj=160.
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until grep -q "lane done" $S/lane8.log; do sleep 30; done
exec $S/laneb.sh lane13 "A|8:1e-3|"
