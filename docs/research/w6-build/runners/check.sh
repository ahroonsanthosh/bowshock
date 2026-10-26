#!/bin/bash
# Run from the repository root (or set ROOT to it).
# Reproduction check: the probe's first fit (5-caliber tangent ogive, 0.05 R
# cap, Mach 1.3, nj 20) from the free stream on the frozen tree.
cd "${ROOT:-$PWD}/tests/tmp-w6b/tree" || exit 1
D=../out
env SHAPE=ogive CAL=5 RATIO=0.05 M=1.3 REF=1 CHUNK=500 OUT=$D/check.jsonl LOG=$D/check-log.txt \
  ONLY=tests/w6b/fit.test.ts npx vitest run --config tests/w6b/vitest.config.ts > $D/check.out 2>&1
echo "exit $?" >> $D/check.out
