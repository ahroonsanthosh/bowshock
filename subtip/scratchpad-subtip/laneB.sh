#!/bin/bash
# Lane B: captured cross-checks of F and G, then P (default to nj=160, density 1.5 to nj=80), then A (default to nj=160).
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
$S/lanec3.sh laneB-captured F G
exec $S/lanef.sh laneB-family "family:P:default:1:8" "family:P:dense:1.5:4" "family:A:default:1:8"
