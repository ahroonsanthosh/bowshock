#!/bin/bash
# Run from the repository root (or set ROOT to it).
# The third march (README section 9, V2) on cases whose three grids are
# saved: the same lines as the first march (auto, chosen on nj 20), the
# first march's entropy (cells), characteristicsFromShocked, on 640, 1280,
# 2560 and 5120 intervals. Runs from the frozen tree TREE (default
# tests/tmp-w6b/tree4: the src of the commit in its COMMIT file, the
# runners in tests/w6b/). Results: tests/tmp-w6b/out/moc3-<case>.{txt,jsonl},
# and .done when finished; a case with .done is skipped, an unfinished one
# starts again.
# Usage: moc3.sh "SHAPE CAL RATIO M" ...
W=${ROOT:-$PWD}
TREE=${TREE:-$W/tests/tmp-w6b/tree4}
D=$W/tests/tmp-w6b/out
cd "$TREE" || exit 1
Q=$D/queue.log
for c in "$@"; do
  set -- $c
  tag=$1$2rn$3M$4
  [ -f "$D/moc3-$tag.done" ] && continue
  rm -f "$D/moc3-$tag.txt" "$D/moc3-$tag.jsonl"
  echo "$(date -u +%FT%TZ) moc3 start $tag" >> "$Q"
  env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 MOC_R=1,2,4 MOC_MARCH=shocked \
    MOC_FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 MOC_LINES=auto MOC_RUN=640,1280,2560,5120 \
    MOC_OUT=$D/moc3-$tag.txt MOC_JSONL=$D/moc3-$tag.jsonl ONLY=tests/w6b/moc.test.ts \
    npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-moc3-$tag.out" 2>&1
  status=$?
  echo "$(date -u +%FT%TZ) moc3 done $tag exit $status" >> "$Q"
  [ "$status" = 0 ] && touch "$D/moc3-$tag.done"
done
