#!/bin/bash
# Throwaway: the one heavy lane, on the final family (boundary smoothed and
# its last point continued, ff61d6f): every Haack and power-series case on
# nj = 20 and 40, the 3-caliber LD-Haack at Mach 2 on nj = 80 (checkpointed,
# early stop), then the Mach 1.5 ogive on nj = 80. Skips runs already passed.
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
F=ONLY=tests/tmp-haack/fit.test.ts
run fit-L3M2r1b SHAPE=haack C=0 L=3 M=2 CYL=2 REF=1 MAXIT=40000 $F
run fit-L3M2r2b SHAPE=haack C=0 L=3 M=2 CYL=2 REF=2 MAXIT=40000 $F
run fit-L3M2r4b SHAPE=haack C=0 L=3 M=2 CYL=2 REF=4 MAXIT=40000 CHECKPOINT=tests/tmp-haack/ckpt-L3M2r4b CHUNK=250 $F
run fit-L5M1.5r1b SHAPE=haack C=0 L=5 M=1.5 CYL=2 REF=1 MAXIT=40000 $F
run fit-L5M1.5r2b SHAPE=haack C=0 L=5 M=1.5 CYL=2 REF=2 MAXIT=40000 $F
run fit-L3M3r1b SHAPE=haack C=0 L=3 M=3 CYL=2 REF=1 MAXIT=40000 $F
run fit-L3M3r2b SHAPE=haack C=0 L=3 M=3 CYL=2 REF=2 MAXIT=40000 $F
run fit-LVL3M2r1b SHAPE=haack C=0.3333333333333333 L=3 M=2 CYL=2 REF=1 MAXIT=40000 $F
run fit-LVL3M2r2b SHAPE=haack C=0.3333333333333333 L=3 M=2 CYL=2 REF=2 MAXIT=40000 $F
run fit-P075L3M2r1b SHAPE=power N=0.75 L=3 M=2 CYL=2 REF=1 MAXIT=40000 $F
run fit-P075L3M2r2b SHAPE=power N=0.75 L=3 M=2 CYL=2 REF=2 MAXIT=40000 $F
run fit-OG1M1.5r4 SHAPE=ogive P=1 L=1 M=1.5 CYL=2 REF=4 MAXIT=60000 CHECKPOINT=tests/tmp-haack/ckpt-OG1M1.5r4 CHUNK=250 $F
echo "$(date -u +%FT%TZ) lane5 finished" >> tests/tmp-haack/queue.log
