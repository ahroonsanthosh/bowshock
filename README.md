# claude/wip/results: compute results and tools at the handoff of 2026-10-22

Not part of the product. A snapshot of gitignored scratch directories from the coordinating session's
container, pushed with the owner's permission so a new session can resume long runs instead of redoing
them. See `HANDOFF.md` on `claude/wip/handoff` for what each workstream is doing.

| Folder | Copy back to | What it holds |
|---|---|---|
| `transonic/tmp-transonic/` | `tests/tmp-transonic/` in a checkout of `claude/wip/transonic-mach1` | queues (`queue-*.txt`), `run-queue.sh` (edit its hard-coded `cd`), family and nested-domain results (`results/*.jsonl`), progress, logs, the throwaway vitest configs and tests. Its `states/` (217 MB of checkpoints) is on `claude/wip/results-states` at `transonic/tmp-transonic/states/`: copy it in too, or finished jobs re-run |
| `transonic/df-settle2.txt` | the transonic worktree root | the GPU settle measurement in progress at handoff |
| `haack/tmp-haack/`, `haack/tmp-haackmoc/` | `tests/` in a checkout of `claude/wip/haack-grid` (the lanes' code) | lane6 and lanex scripts (edit their hard-coded `cd`), fits, saved states and checkpoints (`ckpt-*`), the marches, logs. `switch2.sh` was dropped: it killed processes by pattern |
| `subtip/scratchpad-subtip/` | any folder; edit `S=` in `lanef.sh` | the subtip lanes (`lanef.sh`), `family3.jsonl`, `captured3.jsonl`, checkpoints `state3/`, logs |
| `subtip/tests-tmp-subtip/` | `tests/tmp-subtip/` in a checkout of main | the harness the subtip lanes run (`family.test.ts`, `cold.test.ts`, vitest config) |
| `review-transonic-aed95b0/` | as tests on the transonic branch | the independent reviewer's probes (`probes/zreview/*.test.ts`, `probes/zreview-transonic.test.ts`) and outputs |
| `review-0019/scripts/` | reference | the 0019 reviewer's scripts (`fs8a.py`, `sink.py`, the line-sink model) |
| `coordinator/` | reference | `watch.py` (job watcher: markers of a line in a file or a live process group), `markers.json`, `fired.txt`, `RESTART.md` (lane commands and notes). PGIDs in them are this container's |

Every lane runs at `nice` 5 to 10, one process per lane, started with `setsid nohup`. Stop a lane only
by its own process group (`kill -- -PGID`), never by pattern.
