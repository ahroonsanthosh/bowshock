#!/bin/bash
# Lane B after the captured checks of F and G (done): P (default to nj=160, density 1.5 to nj=80), then A (default to nj=160).
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
exec $S/lanef.sh laneB-family "family:P:default:1:8" "family:P:dense:1.5:4" "family:A:default:1:8"
