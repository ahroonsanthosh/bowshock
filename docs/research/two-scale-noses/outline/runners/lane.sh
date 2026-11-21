#!/bin/bash
# Lanes of the outline's new Von Karman references (0006, "Widening the
# outline: registration", 2026-10-27; branch wip/vk-outline). Runs
# the jobs of a job file in order, from the frozen tree (the src of the
# commit in its COMMIT file, the runners in tests/vk/), results in OUT.
# Resumable: a finished grid (its save exists) or march (its .done file)
# is skipped, an unfinished fit resumes from its checkpoint (written every
# SUB iterations), so after a container restart the same command continues
# where it stopped.
# Job lines:  fam CAL CYL M MAXREF   (Von Karman nose; nj 20 to 20 * MAXREF)
#             moc CAL CYL M          (marches on nj 20, 40, 80, lines "auto")
# Usage: lane.sh JOBFILE NAME
# Two settings from the environment, added 2026-11-20 for the LV-Haack
# registration (0006, "The LV-Haack outline: registration"), whose defaults
# are the Von Karman lanes' as they ran: C, the Haack parameter (0; the
# LV-Haack lanes pass 0.3333333333333333, which is 1/3 as a double), and
# S, the lanes' folder (/tmp/scratch/vk).
# Three more, added 2026-11-21 for the power-1/2 registration (0006, "The
# power-1/2 outline: registration"), whose defaults leave the Haack lanes
# as they ran: SHAPE (haack; the power-1/2 lanes pass power), N, the
# power-series exponent (0.75, common.ts's default, unused by a Haack
# nose; the power-1/2 lanes pass 0.5), and MOC_END (unset; the power-1/2
# lanes pass nose, which ends each march at the end of the nose, ahead of
# its corner: moc.test.ts).
C=${C:-0}
S=${S:-/tmp/scratch/vk}
SHAPE=${SHAPE:-haack}
N=${N:-0.75}
MOC_END=${MOC_END:-}
TREE=$S/tree
D=$S/out
JOBS=$1
NAME=${2:-lane}
cd "$TREE" || exit 1
mkdir -p "$D"
Q=$D/queue.log
say() { echo "$(date -u +%FT%TZ) $NAME $*" >> "$Q"; }

fam() { # CAL CYL M MAXREF
  local cal=$1 cyl=$2 m=$3 maxref=$4 r prev="" chunk
  local tag=L${cal}c${cyl}M${m}
  for r in 1 2 4 8; do
    [ "$r" -gt "$maxref" ] && break
    local name=${tag}r$r
    if [ ! -f "$D/$name.json" ]; then
      if [ ! -f "$D/ckpt-$name.json" ] && [ -n "$prev" ] && [ -f "$D/$prev.json" ]; then
        node tests/vk/seed.mjs "$D/$prev" "$D/ckpt-$name" >> "$Q" 2>&1 < /dev/null
      fi
      # W5's chunks (family.sh): 500 on nj 20 and 40, 250 on nj 80 (times the refinement).
      chunk=500
      [ "$r" -ge 4 ] && chunk=250
      say "start $name"
      env SHAPE=$SHAPE C=$C N=$N L=$cal M=$m CYL=$cyl REF=$r UNGATED=1 CHUNK=$chunk SUB=250 \
        CHECKPOINT=$D/ckpt-$name SAVE=$D/$name LOG=$D/log.txt ONLY=tests/vk/fitsave.test.ts \
        npx vitest run --config tests/vk/vitest.config.ts > "$D/run-$name.out" 2>&1 < /dev/null
      say "done $name exit $?"
      [ -f "$D/$name.json" ] || { say "$name not saved: family stopped"; return 1; }
    fi
    prev=$name
  done
}

moc() { # CAL CYL M
  local cal=$1 cyl=$2 m=$3
  local tag=L${cal}c${cyl}M${m}
  [ -f "$D/moc-$tag.done" ] && return 0
  for r in 1 2 4; do
    [ -f "$D/${tag}r$r.json" ] || { say "moc $tag: no saved fit r$r, skipped"; return 1; }
  done
  rm -f "$D/moc-$tag.txt" "$D/moc-$tag.jsonl"
  say "start moc $tag"
  env SHAPE=$SHAPE C=$C N=$N L=$cal M=$m CYL=$cyl MOC_R=1,2,4 MOC_END=$MOC_END \
    MOC_FILES=$D/${tag}r1,$D/${tag}r2,$D/${tag}r4 MOC_LINES=auto MOC_RUN=640,1280,2560 \
    MOC_OUT=$D/moc-$tag.txt MOC_JSONL=$D/moc-$tag.jsonl ONLY=tests/vk/moc.test.ts \
    npx vitest run --config tests/vk/vitest.config.ts > "$D/run-moc-$tag.out" 2>&1 < /dev/null
  local status=$?
  say "done moc $tag exit $status"
  [ "$status" = 0 ] && touch "$D/moc-$tag.done"
}

while read -r kind a b c d; do
  case "$kind" in
    fam) fam "$a" "$b" "$c" "$d" ;;
    moc) moc "$a" "$b" "$c" ;;
    *) ;;
  esac
done < "$JOBS"
say "finished $JOBS"
