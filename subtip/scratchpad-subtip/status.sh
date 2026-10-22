#!/bin/bash
S=/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip
date; uptime
grep '"kind":"checkpoint"' $S/family3.jsonl | tail -3 | python3 -c "
import sys,json
for l in sys.stdin:
    d=json.loads(l); print('ckpt',d['t'][:19],d['id'],d['family'],d['refinement'],d['iterations'],'%.10f'%d['drag'],d['remaining'],'%.1e'%d['speed'])"
python3 $S/fam.py
