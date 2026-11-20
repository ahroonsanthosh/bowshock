# The LV-Haack outline: runs (2026-11-20)

New references for the LV-Haack nose (Haack, C = 1/3), registered before
any run in 0006 ("The LV-Haack outline: registration", commit cdf00d96)
and pointed to from 0014 section 10.7. Six cases with 2 calibers of
cylinder: (4, 1.5), (6, 1.5), (4, 3), (6, 3), (5, 2) and (6, 2)
(calibers, Mach). The Von Karman outline's runners and criteria,
unchanged; the allowance fixed at 8e-4 (`judge.mjs --allowance 8e-4`).
Nothing here changes the code: src changes only after the results are
recorded in 0006 and judged.

## Where the runs are

Outside the repository, so that they survive the worktree:

- `/home/user/bowshock-runs/lvh/tree/`: the frozen tree (the src of
  cdf00d96, its `COMMIT` file; the runners in `tests/vk/`, as in
  `../runners/`; `node_modules` a link to the main checkout's).
- `/home/user/bowshock-runs/lvh/runners/`: `lane.sh` and
  `jobs-lvh-{a,b,c}.txt`, as committed in `../runners/`.
- `/home/user/bowshock-runs/lvh/out/`: everything the lanes write:
  `queue.log` (each job's start and end), `log.txt` (every fit's
  progress, fingerprint, gates and saved drag), `run-*.out` (vitest's
  output per job), `ckpt-*` (checkpoints), `L<cal>c2M<mach>r<ref>.json`
  and `.bin` (saved fits), `moc-*.txt`, `.jsonl` and `.done` (marches).

Lanes (one core each, `nice -n 10`): a, 6 calibers at Mach 1.5 and 3;
b, 4 calibers at Mach 1.5 and 3; c, 5 and 6 calibers at Mach 2. Each
runs nj = 20 for both its cases, then nj = 40, then nj = 80 and the
marches of the first case, then nj = 80 and the marches of the second.
Expected: about a day of wall time (the Von Karman lanes took about 16
hours of running for two cases each; the nj = 80 fits 2 to 5 hours, the
marches 35 to 70 minutes).

## Monitor

```
R=/home/user/bowshock-runs/lvh
cat $R/out/queue.log
tail -f $R/out/log.txt
ps -eo pid,ni,pcpu,etime,cmd | grep -E 'lane.sh|vitest' | grep -v grep
```

A fit that settles logs "settled early at N iterations ... saved"; one
that reaches 40000 iterations times the refinement logs "NOT converged"
(it is still saved, and fails by the registration). "REFUSED" means a
checkpoint or seed of another fingerprint: stop and find out why; do not
delete it to get past.

## Resume (after a restart)

The same command continues where each lane stopped (a saved grid or a
march with its `.done` file is skipped, a fit resumes from its last
checkpoint, at most 250 iterations lost). This is a resumption of the
same fit, not a re-run; nothing in the tree, the jobs or the settings
may change.

```
R=/home/user/bowshock-runs/lvh
cd $R
for l in a b c; do
  C=0.3333333333333333 S=$R nohup nice -n 10 bash $R/runners/lane.sh \
    $R/runners/jobs-lvh-$l.txt $l > $R/out/nohup-lane-$l.out 2>&1 < /dev/null &
done
```

Start a lane only if it is not running already (check `ps`). A march
interrupted half way has no `.done` file and starts again from its first
line (its partial `.txt` and `.jsonl` are removed): the march is
deterministic, so this gives the same numbers.

## Judge (once every lane has logged "finished")

From `docs/research/two-scale-noses/`:

```
R=/home/user/bowshock-runs/lvh
mkdir -p outline/lv-haack/fits/saved outline/lv-haack/marches outline/lv-haack/analysis
cp $R/out/L*c2M*r[124].json outline/lv-haack/fits/saved/
cp $R/out/log.txt outline/lv-haack/fits/log.txt
cp $R/out/queue.log outline/lv-haack/fits/queue-log.txt
cp $R/out/moc-*.txt $R/out/moc-*.jsonl outline/lv-haack/marches/
node outline/analysis/judge.mjs marches/moc.jsonl outline/lv-haack/fits/saved \
  outline/lv-haack/marches --allowance 8e-4 \
  --json outline/lv-haack/analysis/judge.json > outline/lv-haack/analysis/judge.txt
```

The cell states (`.bin`) stay in the lanes' folder. The verdicts of the
`haack C0.3333333333333333 ...` cases are the LV-Haack ones (the W5 Von
Karman cases are listed too, for the allowance by W5's rule, which is
reported but does not apply). Record every case's result in 0006, under
the registration, whatever it is; a failed case is not re-run. If a
failed case lies inside or on the hull of the passing ones, nothing is
added until the owner decides. The code changes the registration names
follow only a pass.
