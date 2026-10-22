#!/bin/sh
# The branch's checks before each push: format, typecheck, lint and the transonic unit tests.
cd "$(dirname "$0")/../.." || exit 1
npx prettier --check src tests/engine-gpu tests/analysis tests/verification tests/grid tests/engine-cpu tests/gpu docs/design/0013-transonic.md || exit 1
npm run -s typecheck || exit 1
npm run -s lint || exit 1
npx vitest run tests/analysis/transonic-drag.test.ts tests/analysis/nose-drag-solve.test.ts \
  tests/verification/domain-allowance.test.ts tests/verification/iterative-convergence.test.ts \
  tests/grid/transonic-grid.test.ts tests/engine-cpu/implicit.test.ts tests/engine-gpu/two-float-checks.test.ts 2>&1 | tail -8
