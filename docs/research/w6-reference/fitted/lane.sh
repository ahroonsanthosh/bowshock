#!/bin/bash
# The fitted solver's families that W6's lanes left without an nj = 80 grid
# (W6 README section 11), run as W6's lane.sh runs them: W6's own runners
# (docs/research/w6-build/runners at claude/wip/w6-build bf3c739: fit.test.ts,
# common.ts, seed.mjs, vitest.config.ts, copied unchanged into the tree's
# tests/w6b/) on a frozen tree of the lanes' source (ae794e4), nj = 20 from
# the free stream, then each finer grid seeded from the converged coarser one
# (seed.mjs). The lanes' cell states were not kept, so nj = 20 and 40 are
# fitted again; their drags are compared with the lanes' as a check.
# Resumable: a saved grid is skipped, an unfinished one resumes from its
# checkpoint.
# Usage: lane.sh TREE OUTDIR SHAPE:CAL:RATIO:M ...
TREE=$1
D=$2
shift 2
mkdir -p "$D"
cd "$TREE" || exit 1
for job in "$@"; do
  IFS=: read -r shape cal ratio m <<< "$job"
  tag=${shape}${cal}rn${ratio}M${m}
  prev=""
  for r in 1 2 4; do
    name=${tag}r$r
    if [ ! -f "$D/$name.json" ]; then
      if [ ! -f "$D/ckpt-$name.json" ] && [ -n "$prev" ]; then
        node tests/w6b/seed.mjs "$D/$prev" "$D/ckpt-$name" >> "$D/queue.log"
      fi
      echo "$(date -u +%FT%TZ) start $name" >> "$D/queue.log"
      env SHAPE="$shape" CAL="$cal" RATIO="$ratio" M="$m" REF=$r CHUNK=500 CHECKPOINT="$D/ckpt-$name" \
        SAVE="$D/$name" OUT="$D/results.jsonl" LOG="$D/log.txt" ONLY=tests/w6b/fit.test.ts \
        npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-$name.out" 2>&1
      echo "$(date -u +%FT%TZ) done $name exit $?" >> "$D/queue.log"
      [ -f "$D/$name.json" ] || { echo "$name not saved: family stopped" >> "$D/queue.log"; break; }
    fi
    prev=$name
  done
done
