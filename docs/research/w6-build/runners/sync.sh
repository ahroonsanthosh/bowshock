#!/bin/bash
# Run from the repository root (or set ROOT to it).
# Copy the lanes' records (not the cell states) into docs/research/w6-build/results/lanes.
W=${ROOT:-$PWD}
O=$W/tests/tmp-w6b/out
R=$W/docs/research/w6-build/results/lanes
mkdir -p "$R/saved"
cp "$O/results.jsonl" "$O/log.txt" "$O/queue.log" "$R/" 2>/dev/null
for f in "$O"/moc-*.jsonl "$O"/moc-*.txt; do [ -f "$f" ] && cp "$f" "$R/"; done
for f in "$O"/*r[1248].json; do [ -f "$f" ] && cp "$f" "$R/saved/"; done
true
