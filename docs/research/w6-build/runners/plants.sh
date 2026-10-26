#!/bin/bash
# Run from the repository root (or set ROOT to it).
# Plant the second review's three faults in the Von Karman series of
# src/geometry/nose.ts one at a time and run the geometry tests; each must
# fail. The file is backed up first and restored after each plant. The
# line numbers are those of commit 3d55b01.
cd "${ROOT:-$PWD}" || exit 1
mkdir -p tests/tmp-w6b
S=tests/tmp-w6b/nose-good.ts
cp src/geometry/nose.ts "$S"
for plant in "330s/theta < 0.1/theta < 1/" "333s#2 / 15#2 / 16#" "330s/theta < 0.1/theta < 0.001/"; do
  cp "$S" src/geometry/nose.ts
  sed -i "$plant" src/geometry/nose.ts
  echo "plant: $plant"
  npx vitest run tests/geometry/nose.test.ts 2>&1 | grep -E "Tests |×"
done
cp "$S" src/geometry/nose.ts
cmp "$S" src/geometry/nose.ts && echo restored
