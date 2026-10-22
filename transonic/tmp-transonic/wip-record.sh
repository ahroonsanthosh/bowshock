#!/bin/sh
# Write the branch's WIP record (the diff from its base, and its log) in
# the format of docs/research/wip on main, under tests/tmp-transonic/wip/
# (gitignored), for the coordinator to copy; the main checkout is not
# touched from this worktree.
cd /home/user/bowshock/.claude/worktrees/agent-a9685e852221ade15 || exit 1
base=$(git rev-parse 72e6565)
head=$(git rev-parse HEAD)
mkdir -p tests/tmp-transonic/wip
{
  echo "# Base: $base. Head: $head (branch transonic-mach1). Apply with git apply from the base."
  git diff "$base" HEAD
} > tests/tmp-transonic/wip/transonic.diff
git log --oneline --first-parent "$base"..HEAD > tests/tmp-transonic/wip/transonic.log
wc -c tests/tmp-transonic/wip/transonic.diff tests/tmp-transonic/wip/transonic.log
