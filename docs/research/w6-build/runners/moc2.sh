#!/bin/bash
# Run from the repository root (or set ROOT to it).
# The second march (README section 6) on cases whose three grids are saved:
# the same lines as the first (auto, chosen on nj 20), entropy from the
# fitted shock. Results: tests/tmp-w6b/out/moc2-<case>.{txt,jsonl}, .done.
# Usage: moc2.sh "SHAPE CAL RATIO M" ...
W=${ROOT:-$PWD}
TREE=$W/tests/tmp-w6b/tree
D=$W/tests/tmp-w6b/out
cd "$TREE" || exit 1
Q=$D/queue.log
for c in "$@"; do
  set -- $c
  tag=$1$2rn$3M$4
  [ -f "$D/moc2-$tag.done" ] && continue
  rm -f "$D/moc2-$tag.txt" "$D/moc2-$tag.jsonl"
  echo "$(date -u +%FT%TZ) moc2 start $tag" >> "$Q"
  env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 MOC_R=1,2,4 MOC_ENTROPY=shock \
    MOC_FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 MOC_LINES=auto MOC_RUN=640,1280,2560 \
    MOC_OUT=$D/moc2-$tag.txt MOC_JSONL=$D/moc2-$tag.jsonl ONLY=tests/w6b/moc.test.ts \
    npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-moc2-$tag.out" 2>&1
  status=$?
  echo "$(date -u +%FT%TZ) moc2 done $tag exit $status" >> "$Q"
  [ "$status" = 0 ] && touch "$D/moc2-$tag.done"
done
