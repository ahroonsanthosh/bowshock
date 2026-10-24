#!/bin/bash
# Detach a probe job: launch.sh SCRIPT ARGS... ; prints the PGID.
W=/home/user/bowshock/.claude/worktrees/agent-aebcae66a0febc475/tests/tmp-w6
setsid nohup nice -n 10 bash "$@" > /dev/null 2>&1 < /dev/null &
pid=$!
sleep 1
echo "pid $pid pgid $(ps -o pgid= -p $pid 2>/dev/null) : $*" | tee -a "$W/out/pgids.log"
