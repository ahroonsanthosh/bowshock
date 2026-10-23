#!/bin/sh
# The 3D fins' CPU lane (docs/design/0021-3d-euler-fins.md section 5.2): the research runs named as
# arguments, one after the other, from the repository root. Each run writes into out/ and checkpoints its
# own progress, so the lane can be started again after a restart.
#   setsid nohup nice -n 10 sh docs/research/solver3d/run-lane.sh rung-a rung-b0 > lane.log 2>&1 &
cd "$(dirname "$0")/../../.." || exit 1
for run in "$@"; do
  echo "== $run $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  ONLY="./$run.test.ts" npx vitest run --config docs/research/solver3d/vitest.config.ts
done
echo "== done $(date -u +%Y-%m-%dT%H:%M:%SZ)"
