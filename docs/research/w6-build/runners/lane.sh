#!/bin/bash
# Run from the repository root (or set ROOT to it).
# W6 build lanes (docs/research/w6-build). Runs the jobs of a job file in
# order, from the frozen tree (tests/tmp-w6b/tree: src of the commit in its
# COMMIT file, the runners in tests/w6b/), results in tests/tmp-w6b/out.
# Resumable: a finished grid (its save exists) or march (its .done file)
# is skipped, an unfinished fit resumes from its checkpoint, so after a
# container restart the same command continues where it stopped.
# Job lines:  fam SHAPE CAL RATIO M MAXREF   (nj 20 to 20 * MAXREF)
#             moc SHAPE CAL RATIO M          (marches on nj 20, 40, 80)
# Usage: lane.sh JOBFILE NAME
W=${ROOT:-$PWD}
TREE=${TREE:-$W/tests/tmp-w6b/tree}
D=$W/tests/tmp-w6b/out
PROBE=$W/tests/tmp-w6/out
JOBS=$1
NAME=${2:-lane}
cd "$TREE" || exit 1
mkdir -p "$D"
Q=$D/queue.log
say() { echo "$(date -u +%FT%TZ) $NAME $*" >> "$Q"; }

fam() { # SHAPE CAL RATIO M MAXREF
  local shape=$1 cal=$2 ratio=$3 m=$4 maxref=$5 r prev=""
  local tag=${shape}${cal}rn${ratio}M${m}
  for r in 1 2 4 8; do
    [ "$r" -gt "$maxref" ] && break
    local name=${tag}r$r
    if [ ! -f "$D/$name.json" ]; then
      if [ ! -f "$D/ckpt-$name.json" ]; then
        if [ -n "$prev" ] && [ -f "$D/$prev.json" ]; then
          node tests/w6b/seed.mjs "$D/$prev" "$D/ckpt-$name" >> "$Q"
        fi
        # The probe's converged fit of the same case and grid, where one
        # exists, as the start instead (the converged fit does not depend
        # on its start; only the iterations do).
        local p=$PROBE/rn${ratio}M${m}r$r
        if [ "$shape" = ogive ] && [ "$cal" = 5 ] && [ -f "$p.json" ]; then
          node tests/w6b/adopt.mjs "$p" "$D/ckpt-$name" >> "$Q"
        fi
      fi
      local chunk=500
      [ "$r" -ge 8 ] && chunk=125
      say "start $name"
      env SHAPE=$shape CAL=$cal RATIO=$ratio M=$m REF=$r CHUNK=$chunk CHECKPOINT=$D/ckpt-$name \
        SAVE=$D/$name OUT=$D/results.jsonl LOG=$D/log.txt ONLY=tests/w6b/fit.test.ts \
        npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-$name.out" 2>&1
      say "done $name exit $?"
      [ -f "$D/$name.json" ] || { say "$name not saved: family stopped"; return 1; }
    fi
    prev=$name
  done
}

moc() { # SHAPE CAL RATIO M
  local shape=$1 cal=$2 ratio=$3 m=$4
  local tag=${shape}${cal}rn${ratio}M${m}
  [ -f "$D/moc-$tag.done" ] && return 0
  for r in 1 2 4; do
    [ -f "$D/${tag}r$r.json" ] || { say "moc $tag: no saved fit r$r, skipped"; return 1; }
  done
  rm -f "$D/moc-$tag.txt" "$D/moc-$tag.jsonl"
  say "start moc $tag"
  env SHAPE=$shape CAL=$cal RATIO=$ratio M=$m MOC_R=1,2,4 \
    MOC_FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 MOC_LINES=auto MOC_RUN=640,1280,2560 \
    MOC_OUT=$D/moc-$tag.txt MOC_JSONL=$D/moc-$tag.jsonl ONLY=tests/w6b/moc.test.ts \
    npx vitest run --config tests/w6b/vitest.config.ts > "$D/run-moc-$tag.out" 2>&1
  local status=$?
  say "done moc $tag exit $status"
  [ "$status" = 0 ] && touch "$D/moc-$tag.done"
}

while read -r kind a b c d e; do
  case "$kind" in
    fam) fam "$a" "$b" "$c" "$d" "$e" ;;
    moc) moc "$a" "$b" "$c" "$d" ;;
    *) ;;
  esac
done < "$JOBS"
say "finished $JOBS"
