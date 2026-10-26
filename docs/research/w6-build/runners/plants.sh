#!/bin/bash
# Run from the repository root (or set ROOT to it).
# Plant the reviews' faults in src/geometry/nose.ts one at a time and run
# the geometry tests; each must fail. The file is backed up first and
# restored after each plant. The plants find their lines by content:
# 1-3 the Von Karman series (threshold 0.1 to 1; 2/15 to 2/16; threshold
# to 0.001), 4 the cap's old formula, 5 the ogive's cone limit widened.
cd "${ROOT:-$PWD}" || exit 1
mkdir -p tests/tmp-w6b
S=tests/tmp-w6b/nose-good.ts
cp src/geometry/nose.ts "$S"
for plant in \
  's/^\( *\)theta < 0\.1$/\1theta < 1/' \
  's#(2 / 3 - th2 \* (2 / 15#(2 / 3 - th2 * (2 / 16#' \
  's/^\( *\)theta < 0\.1$/\1theta < 0.001/' \
  's/Math.sqrt(Math.max(0, xx \* (2 \* rn - xx)))/Math.sqrt(Math.max(0, rn * rn - (xx - rn) ** 2))/' \
  's/return shape.parameter < OGIVE_CONE_LIMIT;/return shape.parameter < 0.01;/'; do
  cp "$S" src/geometry/nose.ts
  sed -i "$plant" src/geometry/nose.ts
  if cmp -s "$S" src/geometry/nose.ts; then echo "plant did not apply: $plant"; continue; fi
  echo "plant: $plant"
  npx vitest run tests/geometry/nose.test.ts 2>&1 | grep -E "Tests |×"
done
cp "$S" src/geometry/nose.ts
cmp "$S" src/geometry/nose.ts && echo restored
