#!/bin/bash
# Run from the repository root (or set ROOT to it).
# The TR 1386 check (README section 8): W6's capped cones for the pressure
# models 4p and 5p on nj 20, 40 and 80 (lane.sh with jobs-tr1386.txt, from
# the frozen tree tests/tmp-w6b/tree3), then the wall pressure and surface
# Mach number of each (wallcp.test.ts). Resumable like the lanes.
W=${ROOT:-$PWD}
export ROOT=$W
TREE=$W/tests/tmp-w6b/tree3
D=$W/tests/tmp-w6b/out
TREE=$TREE bash "$TREE/tests/w6b/lane.sh" "$TREE/tests/w6b/jobs-tr1386.txt" tr1386
cd "$TREE" || exit 1
for c in "cone 3 0.3 1.5" "cone 3 0.3 1.97" "cone 3 0.3 3.1" "cone 3 0.5 1.54" "cone 3 0.5 1.97" "cone 3 0.5 3.06"; do
  set -- $c
  tag=$1$2rn$3M$4
  [ -f "$D/wallcp-$tag.json" ] && continue
  [ -f "$D/${tag}r4.json" ] || continue
  env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 \
    OUT=$D/wallcp-$tag.json ONLY=tests/w6b/wallcp.test.ts \
    npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-wallcp-$tag.out" 2>&1
  echo "$(date -u +%FT%TZ) tr1386 wallcp $tag exit $?" >> "$D/queue.log"
done
