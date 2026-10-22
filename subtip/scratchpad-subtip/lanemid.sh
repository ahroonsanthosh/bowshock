#!/bin/bash
# Waits for 00:00 UTC on 2026-10-19, then runs the second (dense) families.
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
until [ $(date -u +%s) -ge $(date -u -d '2026-10-19 00:00:00' +%s) ]; do sleep 60; done
exec $S/lanef.sh lane22 "family:E:dense:1.5:8" "family:A:dense:1.5:8"
