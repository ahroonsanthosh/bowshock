#!/bin/bash
# Throwaway: lane5's successor (agreed with main 2026-10-20): the nj = 40
# and 80 grids of the LD-Haack at Mach 3 (3 calibers) and the nj = 80 grid
# at Mach 1.5 (5 calibers), checkpointed and saving their final fields for
# the march of characteristics (tests/tmp-haackmoc); each started from the
# saved fit on the grid before (seed.mjs: the converged fit does not depend
# on its start); then the LV-Haack and power-series runs on nj = 20 and 40
# lane5 still had. The detached-tip ogive's nj = 80 is dropped (those tips
# stay refused). Skips runs already passed.
cd /home/user/bowshock/.claude/worktrees/agent-abd83b26cc3489c03 || exit 1
run() {
  local tag=$1; shift
  local out="tests/tmp-haack/run-$tag.out"
  if [ -f "$out" ] && grep -q "^done" "$out" && grep -q "Tests  1 passed" "$out"; then return; fi
  echo "$(date -u +%FT%TZ) start $tag" >> tests/tmp-haack/queue.log
  env "$@" npx vitest run --config tests/tmp-haack/vitest.config.ts > "$out" 2>&1
  echo "done" >> "$out"
  echo "$(date -u +%FT%TZ) done $tag" >> tests/tmp-haack/queue.log
}
# The checkpoint a run resumes from: the saved coarser fit, refined (once
# that save exists).
seed() {
  local src=$1 ck=$2
  if [ -f "$ck.json" ]; then return; fi
  until [ -f "$src.json" ] && ! grep -q placeholder "$src.json"; do sleep 60; done
  node tests/tmp-haackmoc/seed.mjs "$src" "$ck" >> tests/tmp-haack/queue.log
}
F=ONLY=tests/tmp-haack/fit.test.ts
seed tests/tmp-haackmoc/L3M3r1 tests/tmp-haack/ckpt-L3M3r2b
run fit-L3M3r2b SHAPE=haack C=0 L=3 M=3 CYL=2 REF=2 MAXIT=40000 CHECKPOINT=tests/tmp-haack/ckpt-L3M3r2b SAVE=tests/tmp-haackmoc/L3M3r2 $F
# fit-L5M1.5r4 stopped on the branch's pre-fit gate; it ran ungated in the
# extra lane (fit-L5M1.5r4u, done 2026-10-20 20:38).
seed tests/tmp-haackmoc/L3M3r2 tests/tmp-haack/ckpt-L3M3r4
run fit-L3M3r4 SHAPE=haack C=0 L=3 M=3 CYL=2 REF=4 MAXIT=40000 CHECKPOINT=tests/tmp-haack/ckpt-L3M3r4 CHUNK=250 SAVE=tests/tmp-haackmoc/L3M3r4 $F
run fit-LVL3M2r1b SHAPE=haack C=0.3333333333333333 L=3 M=2 CYL=2 REF=1 MAXIT=40000 $F
run fit-LVL3M2r2b SHAPE=haack C=0.3333333333333333 L=3 M=2 CYL=2 REF=2 MAXIT=40000 $F
run fit-P075L3M2r1b SHAPE=power N=0.75 L=3 M=2 CYL=2 REF=1 MAXIT=40000 $F
run fit-P075L3M2r2b SHAPE=power N=0.75 L=3 M=2 CYL=2 REF=2 MAXIT=40000 $F
echo "$(date -u +%FT%TZ) lane6 finished" >> tests/tmp-haack/queue.log
# Appended 2026-10-20 12:00 (main): the reference at the corner of the
# served region at 5 calibers (two of cylinder), Mach 3.
bash tests/tmp-haackmoc/family.sh L5c2M3 5 2 3 tests/tmp-haack/queue.log
echo "$(date -u +%FT%TZ) lane6 corner finished" >> tests/tmp-haack/queue.log
