#!/bin/bash
# Usage, from tests/tmp-fins/ copies: run-euler.sh <case> <levels>, for
# example run-euler.sh hex 0,1,2. One Euler solve at a time.
cd "$(dirname "$0")/../.." || exit 1
CASE="$1" LEVELS="$2" ONLY=tests/tmp-fins/euler.test.ts npx vitest run --config tests/tmp-fins/vitest.config.ts > "tests/tmp-fins/euler-$1.log" 2>&1
echo "exit $?" >> "tests/tmp-fins/euler-$1.log"
