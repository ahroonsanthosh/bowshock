#!/bin/sh
# Run the jobs of a queue file one after another (one heavy process at a
# time per queue). Each line holds the environment of one family.test.ts
# job, e.g. "BODY=cone7 MACH=1.05 FAR=100 CYL=10 REFS=1,2,4". Jobs resume
# from their results files, so the queue can simply be started again
# after a restart. Lines starting with # are skipped.
cd /home/user/bowshock/.claude/worktrees/agent-a9685e852221ade15 || exit 1
queue="$1"
while IFS= read -r line; do
  case "$line" in
    '' | '#'*) continue ;;
  esac
  echo "$(date -u +%FT%TZ) start $line" >> "$queue.log"
  env ONLY=tests/tmp-transonic/family.test.ts $line npx vitest run --config tests/tmp-transonic/vitest.config.ts < /dev/null > /dev/null 2>&1
  echo "$(date -u +%FT%TZ) end $? $line" >> "$queue.log"
done < "$queue"
