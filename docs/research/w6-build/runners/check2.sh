#!/bin/bash
# Run from the repository root (or set ROOT to it).
# The fixed geometry (tree2: the branch's src after the review's fixes)
# against the lanes' first grids: two nj 20 fits from the free stream.
cd "${ROOT:-$PWD}/tests/tmp-w6b/tree2" || exit 1
D=../out
for c in "vk 5 0.03 1.3" "ogive 3 0.15 3"; do
  set -- $c
  env SHAPE=$1 CAL=$2 RATIO=$3 M=$4 REF=1 CHUNK=500 OUT=$D/check2.jsonl LOG=$D/check2-log.txt \
    ONLY=tests/w6b/fit.test.ts npx vitest run --config tests/w6b/vitest.config.ts >> $D/check2.out 2>&1
done
echo "exit $?" >> $D/check2.out
