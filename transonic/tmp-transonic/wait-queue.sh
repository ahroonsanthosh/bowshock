#!/bin/sh
# Wait for a process to exit, then run a queue (run-queue.sh).
while kill -0 "$1" 2>/dev/null; do sleep 20; done
exec sh tests/tmp-transonic/run-queue.sh "$2"
