#!/bin/bash
# Copy the probe's results (not the cell states) into the committed folder.
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475
O=$W/tests/tmp-w6/out
R=$W/docs/research/w6-probe/results
mkdir -p "$R/saved"
cp "$O"/results.jsonl "$O"/grids.jsonl "$O"/log.txt "$O"/queue.log "$R"/ 2>/dev/null
cp "$O"/grids-prefix.jsonl "$R"/ 2>/dev/null
for f in "$O"/rn*.json; do [ -f "$f" ] && cp "$f" "$R/saved/"; done
for f in "$O"/stageA-*.out; do [ -f "$f" ] && cp "$f" "$R/"; done
true
