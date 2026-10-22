#!/bin/bash
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until grep -q "lane done" $S/lane24.log; do sleep 30; done
exec $S/lanef.sh lane25 "family:P:default:1:8"
