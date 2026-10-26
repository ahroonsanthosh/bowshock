#!/bin/bash
# Plant the reviewer's three faults in the Von Karman series one at a time
# and run the geometry tests; restore the good file after each.
cd /home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475 || exit 1
S=/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/nose-good.ts
for plant in "330s/theta < 0.1/theta < 1/" "333s#2 / 15#2 / 16#" "330s/theta < 0.1/theta < 0.001/"; do
  cp "$S" src/geometry/nose.ts
  sed -i "$plant" src/geometry/nose.ts
  echo "plant: $plant"
  npx vitest run tests/geometry/nose.test.ts 2>&1 | grep -E "Tests |×"
done
cp "$S" src/geometry/nose.ts
cmp "$S" src/geometry/nose.ts && echo restored
