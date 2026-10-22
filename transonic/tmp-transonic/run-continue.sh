#!/bin/sh
# One continuation lane: BODY MACH TAG as arguments (see continue.test.ts). Resumes from its checkpoint.
cd "$(dirname "$0")/../.." || exit 1
echo "$(date -u +%FT%TZ) start $*" >> "tests/tmp-transonic/continue-$3.log"
env BODY="$1" MACH="$2" TAG="$3" R=8 ONLY=tests/tmp-transonic/continue.test.ts \
  npx vitest run --config tests/tmp-transonic/vitest.config.ts < /dev/null >> "tests/tmp-transonic/continue-$3.log" 2>&1
echo "$(date -u +%FT%TZ) end $? $*" >> "tests/tmp-transonic/continue-$3.log"
