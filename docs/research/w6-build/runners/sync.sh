#!/bin/bash
# Copy the lanes' records (not the cell states) into docs/research/w6-build/results/lanes.
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475
O=$W/tests/tmp-w6b/out
R=$W/docs/research/w6-build/results/lanes
mkdir -p "$R/saved"
cp "$O/results.jsonl" "$O/log.txt" "$O/queue.log" "$R/" 2>/dev/null
for f in "$O"/moc-*.jsonl "$O"/moc-*.txt; do [ -f "$f" ] && cp "$f" "$R/"; done
for f in "$O"/*r[1248].json; do [ -f "$f" ] && cp "$f" "$R/saved/"; done
true
