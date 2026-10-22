#!/bin/bash
# Throwaway: the Haack agent's extra lane: the nj = 20 and 40 fields of the
# Mach 1.5 and Mach 3 families (bit-reproducible re-runs of lane5's fits,
# saved for the march of characteristics), and the 1-caliber LD-Haack
# (one caliber of cylinder) at Mach 2 on nj = 20, 40 and 80. Skips runs
# already saved.
cd /home/user/bowshock/.claude/worktrees/agent-abd83b26cc3489c03 || exit 1
run() {
  local tag=$1; shift
  if [ -f "tests/tmp-haackmoc/$tag.json" ]; then return; fi
  echo "$(date -u +%FT%TZ) start $tag" >> tests/tmp-haackmoc/lanex.log
  env "$@" SAVE=tests/tmp-haackmoc/$tag ONLY=tests/tmp-haackmoc/fitsave.test.ts npx vitest run --config tests/tmp-haackmoc/vitest.config.ts > tests/tmp-haackmoc/run-$tag.out 2>&1
  echo "$(date -u +%FT%TZ) done $tag" >> tests/tmp-haackmoc/lanex.log
}
run L5M1.5r1 SHAPE=haack C=0 L=5 M=1.5 CYL=2 REF=1
run L3M3r1 SHAPE=haack C=0 L=3 M=3 CYL=2 REF=1
run L5M1.5r2 SHAPE=haack C=0 L=5 M=1.5 CYL=2 REF=2 CHECKPOINT=tests/tmp-haackmoc/ckpt-L5M1.5r2
run L3M3r2 SHAPE=haack C=0 L=3 M=3 CYL=2 REF=2 CHECKPOINT=tests/tmp-haackmoc/ckpt-L3M3r2
run L1c1M2r1 SHAPE=haack C=0 L=1 M=2 CYL=1 REF=1
run L1c1M2r2 SHAPE=haack C=0 L=1 M=2 CYL=1 REF=2 CHECKPOINT=tests/tmp-haackmoc/ckpt-L1c1M2r2
run L1c1M2r4 SHAPE=haack C=0 L=1 M=2 CYL=1 REF=4 CHUNK=250 CHECKPOINT=tests/tmp-haackmoc/ckpt-L1c1M2r4
echo "$(date -u +%FT%TZ) lanex finished" >> tests/tmp-haackmoc/lanex.log
# Appended 2026-10-20 12:00: lane6's fit-L5M1.5r4 stopped before fitting on
# the branch's pre-fit gate (the generator's refined grid on the captured
# boundary: neighbouring cells 1.33, limit 1.3; the merged code gates only
# the grid the shock settles on), so it runs here ungated, from its seeded
# checkpoint, recording the fitted grid's gates.
if ! grep -q "done fit-L5M1.5r4u" tests/tmp-haack/queue.log; then
  cd /home/user/bowshock/.claude/worktrees/agent-abd83b26cc3489c03 && echo "$(date -u +%FT%TZ) start fit-L5M1.5r4u" >> tests/tmp-haack/queue.log && env SHAPE=haack C=0 L=5 M=1.5 CYL=2 REF=4 MAXIT=40000 UNGATED=1 CHECKPOINT=tests/tmp-haack/ckpt-L5M1.5r4 CHUNK=250 SAVE=tests/tmp-haackmoc/L5M1.5r4 ONLY=tests/tmp-haack/fit.test.ts npx vitest run --config tests/tmp-haack/vitest.config.ts > tests/tmp-haack/run-fit-L5M1.5r4u.out 2>&1; echo done >> tests/tmp-haack/run-fit-L5M1.5r4u.out; echo "$(date -u +%FT%TZ) done fit-L5M1.5r4u" >> tests/tmp-haack/queue.log
fi
# Appended 2026-10-20 12:00 (main): references at the open corners of the
# served region, 1 caliber (one of cylinder) at Mach 1.5 and 3, then 5
# calibers (two of cylinder) at Mach 2; lane6 takes 5 calibers at Mach 3.
bash tests/tmp-haackmoc/family.sh L1c1M1.5 1 1 1.5 tests/tmp-haackmoc/lanex.log
bash tests/tmp-haackmoc/family.sh L1c1M3 1 1 3 tests/tmp-haackmoc/lanex.log
bash tests/tmp-haackmoc/family.sh L5c2M2 5 2 2 tests/tmp-haackmoc/lanex.log
echo "$(date -u +%FT%TZ) lanex corners finished" >> tests/tmp-haackmoc/lanex.log
