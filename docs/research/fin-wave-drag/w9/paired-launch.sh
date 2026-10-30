#!/usr/bin/env bash
# Starts or resumes the solves of 0009 section 9.13 at levels 2 to 4: one
# detached process per case, at normal priority, each single-threaded and
# one solve at a time, at most four at once (one solve per core), in the
# order K1, K2, K3, E2, K5, so K5 starts when a core frees. Once every case
# is done it runs the judge (paired-verdict.out).
#
# Safe to run at any time, and again after a restart of the machine: a case
# that is done or still running is left alone; a case whose process is
# gone is started again, skips the solves recorded in paired.jsonl and
# resumes a solve in progress from its checkpoint. A case whose process
# exited with an error is not started again (its .failed file says so);
# read its log, then remove the file to retry. Kills nothing.
#
#   bash docs/research/fin-wave-drag/w9/paired-launch.sh
#
# Logs and process files: tests/tmp-w9/paired-<case>.log, .pid, .failed;
# tests/tmp-w9/paired-launch.log; tests/tmp-w9/paired-judge.log.

set -u
cd "$(dirname "$0")/../../../.." || exit 1
W=docs/research/fin-wave-drag/w9
TMP=tests/tmp-w9
mkdir -p "$TMP"
exec 9>"$TMP/paired-launch.lock"
flock 9

CASES="K1 K2 K3 E2 K5"
MAX=4

# Whether a case has both solves at levels 2, 3 and 4 in paired.jsonl.
done_case() {
  node -e '
const fs = require("fs");
const p = process.argv[1];
const c = process.argv[2];
const rows = fs.existsSync(p) ? fs.readFileSync(p, "utf8").split("\n").filter(Boolean) : [];
const have = new Set();
for (const r of rows) {
  try {
    const l = JSON.parse(r);
    have.add(l.case + "|" + l.kind + "|" + l.level);
  } catch {}
}
const need = [2, 3, 4].flatMap((k) => ["hexagon", "reference"].map((kind) => c + "|" + kind + "|" + k));
process.exit(need.every((n) => have.has(n)) ? 0 : 1);
' "$W/paired.jsonl" "$1"
}

# Whether the process recorded for a case is alive and is that case's run.
running_case() {
  local f="$TMP/paired-$1.pid"
  [ -f "$f" ] || return 1
  local pid
  pid=$(cat "$f")
  [ -n "$pid" ] && [ -r "/proc/$pid/cmdline" ] && tr '\0' ' ' < "/proc/$pid/cmdline" | grep -q "CASES=$1 LEVELS=2,3,4 "
}

echo "launch $(date -u +%FT%TZ)"
# A case counts against the four cores only while it is neither done nor
# failed: a process that has just finished calls this script before it
# exits, and must not hold a core then.
running=0
for c in $CASES; do
  if ! done_case "$c" && [ ! -f "$TMP/paired-$c.failed" ] && running_case "$c"; then
    running=$((running + 1))
  fi
done
all_done=1
for c in $CASES; do
  if done_case "$c"; then
    echo "$c: done"
    continue
  fi
  all_done=0
  if [ -f "$TMP/paired-$c.failed" ]; then
    echo "$c: FAILED, not started again (see $TMP/paired-$c.log; remove $TMP/paired-$c.failed to retry)"
    continue
  fi
  if running_case "$c"; then
    echo "$c: running (pid $(cat "$TMP/paired-$c.pid"))"
    continue
  fi
  if [ "$running" -ge "$MAX" ]; then
    echo "$c: waiting for a core"
    continue
  fi
  rm -f "$TMP/paired-$c.pid"
  setsid nohup bash -c "echo \$\$ > $TMP/paired-$c.pid; CASES=$c LEVELS=2,3,4 ONLY=./paired.test.ts npx vitest run --config $W/vitest.config.ts --silent=false >> $TMP/paired-$c.log 2>&1; code=\$?; echo \"exit \$code \$(date -u +%FT%TZ)\" >> $TMP/paired-$c.log; if [ \$code -ne 0 ]; then touch $TMP/paired-$c.failed; fi; bash $W/paired-launch.sh >> $TMP/paired-launch.log 2>&1" 9>&- > /dev/null 2>&1 &
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    [ -s "$TMP/paired-$c.pid" ] && break
    sleep 0.2
  done
  running=$((running + 1))
  echo "$c: started (pid $(cat "$TMP/paired-$c.pid" 2>/dev/null))"
done

if [ "$all_done" -eq 1 ]; then
  if [ ! -f "$TMP/paired-judged" ] || [ "$W/paired.jsonl" -nt "$TMP/paired-judged" ]; then
    if ONLY=./paired-judge.test.ts npx vitest run --config "$W/vitest.config.ts" >> "$TMP/paired-judge.log" 2>&1; then
      touch "$TMP/paired-judged"
      echo "judge: run, see $W/paired-verdict.out"
    else
      echo "judge: FAILED, see $TMP/paired-judge.log"
    fi
  else
    echo "judge: already run, see $W/paired-verdict.out"
  fi
fi
