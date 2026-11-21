# The power-1/2 outline: runs (2026-11-21)

New references for the power-1/2 nose (the power series of exponent 1/2,
a paraboloid), registered before any run in 0006 ("The power-1/2
outline: registration", commit 0eb106f9) and pointed to from 0014
section 10.7. Six cases with 2 calibers of cylinder: (3, 1.5), (5, 1.5),
(3, 3), (5, 3), (4, 2) and (5, 2) (calibers, Mach). The Von Karman
outline's runners and criteria, with each march ended at the end of the
nose, ahead of the corner where the nose meets the cylinder
(`MOC_END=nose`, `characteristicsFrom`'s `end`); the allowance fixed at
8e-4 (`judge.mjs --allowance 8e-4`). Nothing here changes the code that
serves noses: that changes only after the results are recorded in 0006
and judged.

## Where the runs are

Outside the repository, so that they survive the worktree:

- `/home/user/bowshock-runs/pow/tree/`: the frozen tree (the src of
  0eb106f9, its `COMMIT` file; the runners in `tests/vk/`, as in
  `../runners/`; `node_modules` a link to the main checkout's).
- `/home/user/bowshock-runs/pow/runners/`: `lane.sh` and
  `jobs-pow-{a,b,c}.txt`, as committed in `../runners/`.
- `/home/user/bowshock-runs/pow/out/`: everything the lanes write:
  `queue.log` (each job's start and end), `log.txt` (every fit's
  progress, fingerprint, gates and saved drag), `run-*.out` (vitest's
  output per job), `ckpt-*` (checkpoints), `L<cal>c2M<mach>r<ref>.json`
  and `.bin` (saved fits), `moc-*.txt`, `.jsonl` and `.done` (marches),
  `nohup-lane-*.out` (each lane's own output).

Lanes (one core each, `nice -n 10`): a, 3 calibers at Mach 1.5 and 3;
b, 5 calibers at Mach 1.5 and 3; c, 4 and 5 calibers at Mach 2. Each
runs nj = 20 for both its cases, then nj = 40, then nj = 80 and the
marches of the first case, then nj = 80 and the marches of the second.

Started: lane a only, 2026-11-21 00:17 UTC (the lane's shell PID 17876), on the one core the
LV-Haack lanes (`/home/user/bowshock-runs/lvh/`, three lanes) leave
free. Lanes b and c wait for cores: start each when an LV-Haack lane has
logged "finished" in `/home/user/bowshock-runs/lvh/out/queue.log` (the
machine has four cores; do not run more than four lanes in all).

Expected: the first fit, 3 calibers at Mach 1.5 on nj = 20, has 86
lines and settled at 5000 iterations in 47 s; at 3.6 calibers and Mach 2
the grid has 149 lines. That second grid is from a smoke test of the
runners on the frozen tree before the lanes started, on a case that is
not registered: a fit stopped at 500 iterations, unconverged, then
marched on 80 and 160 intervals with `MOC_END=nose`, to check that the
march ends at the nose and the records carry `"end":"nose"`. Its numbers
judge nothing and are not kept. The LV-Haack grids on nj = 20 have 138 to 500 lines, so a
power-1/2 lane should take no longer than an LV-Haack lane, and less
than the Von Karman lanes' 16 hours of running for two cases (their
nj = 80 fits 2 to 5 hours, their marches 35 to 70 minutes); half a day
to a day per lane is the estimate, not a measurement.

## Monitor

```
R=/home/user/bowshock-runs/pow
cat $R/out/queue.log
tail -f $R/out/log.txt
ps -eo pid,ni,pcpu,etime,cmd | grep -E 'lane.sh|vitest' | grep -v grep
```

A fit that settles logs "settled early at N iterations ... saved"; one
that reaches 40000 iterations times the refinement logs "NOT converged"
(it is still saved, and fails by the registration). "REFUSED" means a
checkpoint or seed of another fingerprint: stop and find out why; do not
delete it to get past. Each march's text log (`moc-*.txt`) says "ended
at the end of the nose" on its first line; a march without it was not
run as registered.

## Start or resume a lane

The same command starts a lane and continues it where it stopped (a
saved grid or a march with its `.done` file is skipped, a fit resumes
from its last checkpoint, at most 250 iterations lost). A resumption is
the same fit, not a re-run; nothing in the tree, the jobs or the
settings may change.

```
R=/home/user/bowshock-runs/pow
cd $R
l=a   # or b, c
SHAPE=power N=0.5 MOC_END=nose S=$R nohup nice -n 10 bash $R/runners/lane.sh \
  $R/runners/jobs-pow-$l.txt $l > $R/out/nohup-lane-$l.out 2>&1 < /dev/null &
```

Start a lane only if it is not running already (check `ps`; lanes of
another folder, such as the LV-Haack ones, are other lanes). A march
interrupted half way has no `.done` file and starts again from its first
line (its partial `.txt` and `.jsonl` are removed): the march is
deterministic, so this gives the same numbers.

## Judge (once every lane has logged "finished")

From `docs/research/two-scale-noses/`:

```
R=/home/user/bowshock-runs/pow
mkdir -p outline/power-half/fits/saved outline/power-half/marches outline/power-half/analysis
cp $R/out/L*c2M*r[124].json outline/power-half/fits/saved/
cp $R/out/log.txt outline/power-half/fits/log.txt
cp $R/out/queue.log outline/power-half/fits/queue-log.txt
cp $R/out/moc-*.txt $R/out/moc-*.jsonl outline/power-half/marches/
node outline/analysis/judge.mjs marches/moc.jsonl outline/power-half/fits/saved \
  outline/power-half/marches --allowance 8e-4 \
  --json outline/power-half/analysis/judge.json > outline/power-half/analysis/judge.txt
```

The cell states (`.bin`) stay in the lanes' folder. The verdicts of the
`power n0.5 ...` cases are the power-1/2 ones (the W5 Von Karman cases
are listed too, for the allowance by W5's rule, which is reported but
does not apply). Record every case's result in 0006, under the
registration, whatever it is; a failed case is not re-run. If a failed
case lies inside or on the hull of the passing ones, nothing is added
until the owner decides. The code changes the registration names follow
only a pass.
