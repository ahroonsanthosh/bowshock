# Two-scale noses: measurements behind 0006 and 0004

The fits and marches of characteristics quoted in "Two-scale noses:
Haack, power series, detached tips" of
[0006](../../design/0006-shock-fitting.md) and in the two-scale grids of
[0004](../../design/0004-grids.md), which set the Von Karman nose's
allowance (`TWO_SCALE_DRAG_FLOOR`) and its served range
(`VON_KARMAN_REFERENCES`). Every runner ran against branch haack-grid at
a076072, from `tests/tmp-haack/` and `tests/tmp-haackmoc/` (gitignored)
of its worktree; the merged code gives the same grids bit for bit and
the same converged drag within 2.5e-12 (0006). The committed checks of
the merged code are `tests/analysis/two-scale-fit.test.ts` (the 1-caliber
nose at Mach 2 on nj = 20 and 40, against the values recorded here) and
`tests/gpu/fitted-flow-gpu.test.ts` (the page's path on the GPU).

## `fits/`

- `results.jsonl`: one record per grid from `runners/tmp-haack/fit.test.ts`
  (drag, iterations, gates, stagnation pressure, standoff, the wall
  entropy). The records from 2026-10-18T20:13 on are the final family:
  the 3-caliber nose at Mach 2 and 3 and the 5-caliber nose at Mach 1.5
  on nj = 20, 40 and 80, the LV-Haack and the power series on nj = 20
  and 40. Those of 2026-10-18T15:32 to 16:06 are the detached sharp tips
  of 0006's last table (measured ungated; their gate failures are
  recorded). The earlier ones are grids since replaced.
- `saved/*.json`: the heads of the fits saved for the marches
  (`runners/tmp-haackmoc/fitsave.test.ts`, or `fit.test.ts` with `SAVE`):
  drag, iterations, the early stop's remaining error and shock speed,
  gates, stagnation pressure. Named `L<calibers>[c<cylinder>]M<Mach>r<refinement>`
  (no `c`: 2 calibers of cylinder); r1, r2, r4 are nj = 20, 40, 80. They
  hold the 1-caliber families (Mach 1.5, 2, 3) and the 5-caliber noses at
  Mach 2 and 3 on nj = 20 and 40, besides saved copies of the families
  above. The cell states (`.bin`, 40 KB to 4.3 MB each) are not kept; the
  runners rebuild them.
- `queue-log.txt`, `queue-haackmoc-log.txt`, `lanex-log.txt`,
  `marches-log.txt`, `lane160-log.txt`, `lane160b-log.txt`,
  `lanecyl-log.txt`: when each run started and ended (the lanes' `.log`
  files, renamed because `*.log` is not tracked). `log-tmp-haack.txt`, `log-tmp-haackmoc.txt`: the runners' own
  progress logs. `geometry.txt`: the tip geometry
  (`runners/tmp-haack/geometry.test.ts`).

## `marches/`

- `moc.jsonl`: one record per line, grid and number of intervals of the
  march from the saved fits (`runners/tmp-haackmoc/moc.test.ts`): the
  line's x and least Mach number, the fitted drag downstream of it, the
  nose's drag, the march's drag, its mass balance. Rows without a `case`
  field (the first marches) are told apart by the nose's drag
  (`analysis/moc3.mjs`).
- The 5-caliber nose at Mach 2 (2 calibers of cylinder, `marches2.sh`,
  2026-10-22): `scan-L5c2M2r1.txt`, then lines 168 to 240 (x 0.08 to
  1.0) on nj = 20, 40 and 80 (`moc-L5c2M2.txt`, rows in `moc.jsonl`).
  A first run on lines 90 to 138 was stopped and set aside
  (`moc-L5c2M2-tiplines.txt` and `.jsonl`, not in `moc.jsonl`): this
  grid has 293 lines, against 168 on the 5-caliber nose at Mach 1.5, so
  those lines lie at x 6e-3 to 3e-2, near the tip.
- `moc*.txt`: the same runs as text. `scan-*.txt`: every line of nj = 20
  with its least Mach number and the drag downstream, from which the
  lines marched were chosen.

## `analysis/`

- `moc3.mjs`: from `moc.jsonl`, per case and line, the orders, the
  references (the march extrapolated over the grids plus the fitted drag
  upstream of the line, extrapolated, at the observed order and at
  second order), the lower bound (the finest grid's march plus the
  upstream part extrapolated), and the procedure's extrapolation and the
  finest grid against them: the table "Against the method of
  characteristics" of 0006 and the containment ratios of its allowance.
  `node analysis/moc3.mjs marches/moc.jsonl ["C0 L3 M2 cyl2"]`.

## `grids/`

- `dump.test.ts` (with `vitest.config.ts`, run from `tests/tmp-gridcmp/`):
  every line (x, y, dx, dy, h) of the generator's base grids at
  refinements 1, 2 and 4 for 16 ellipsoids of 0.5 to 6 calibers at Mach
  1.2 to 3 and, with `TWO=1`, the five two-scale noses and three detached
  sharp tips measured, written to `OUTFILE`.
- `compare.mjs`: whether two dumps are identical, grid by grid. On the
  merged tree of 235286d against main b86c308: the 48 ellipsoid grids
  identical; against haack-grid a076072: the 24 two-scale grids
  identical, the ellipsoids not (a076072 had changed them; the merge
  restores main's path). The dumps themselves (0.5 and 1.2 MB) are not
  kept.

## `ratio/`

- `ratio.test.ts` (with `vitest.config.ts`, run from `tests/tmp-ratio/`
  of the merged code, 2026-10-22, after main 7d8221c was merged): the
  first capture of a two-scale start as `bluntStart` runs it (3000 steps
  from the free stream on the generator's base grid, nj = 20), and on
  each line the captured shock's height (`capturedShockHeights`) over the
  generator's boundary height. `ratio.json`: the 3-caliber Von Karman
  nose with 2 calibers of cylinder at Mach 2 (`L=3 M=2 CYL=2`, the
  defaults). Ratio 0.126 at the tip, rising to 0.54 at 1.9 percent of the
  nose, 0.40 to 0.54 past its first percent, 0.42 at its middle, 0.40 at
  its base, 0.34 to 0.40 along the cylinder: the numbers quoted in 0004,
  0006 and `secondCapture`'s comment.

## The four-grid checks and the body length

The page verifies a value only from four grids or more (nj = 20 to
160, or 320), and before these checks no band of four grids had been
measured on a Von Karman nose. Both checks below passed; no band of
five grids has been checked. Lanes (`runners/tmp-haackmoc/`, started
2026-10-22):

- `lane160.sh`: the 1-caliber nose at Mach 2 on nj = 160, seeded from
  its nj = 80 fit. Finished 2026-10-24 (settled at 21000 iterations,
  `fits/saved/L1c1M2r8.json`); its check, `fits/check160-L1c1M2.json`:
  orders 1.84 and 1.90, band 8.32e-4 of the value, containing the
  references and the lowest bound (error 5.06e-5). The first four-grid
  check on a Von Karman nose (0006).
- `lane160b.sh`: the 3-caliber nose at Mach 2 on nj = 160 (fitted order
  1.49, the riskier case). Finished 2026-10-25 (settled at 23000
  iterations, `fits/saved/L3M2r8.json`); its check,
  `fits/check160-L3M2.json`: orders 1.49 and 1.65, band 9.55e-4 of the
  value, containing the references and the lowest bound (error
  3.41e-4). The cell states (`.bin`, 9.8 MB) are not kept.
- `lanecyl.sh`: the 3-caliber nose at Mach 2 with 0 and 30 calibers of
  cylinder on nj = 20 and 40, against the 2-caliber family: the page
  accepts 0 to 30 calibers of body, the references have 1 or 2.
  Finished: `fits/saved/L3c0M2r1`, `r2` and `L3c30M2r1`, `r2` (0006,
  "The allowance and the served region").

When a nj = 160 fit is saved, `check160.test.ts` (`TAG=L1c1M2` or
`TAG=L3M2`) gives the page's verdict on the four drags (orders of the
two finest triples, band with the allowance of 8e-4) against the
marches' references and lowest bound.

## The code the fits ran on

Branch haack-grid at a076072 (`docs/research/wip/haack-grid.diff`: the
diff from its base 6185a47 to a076072, to apply at 6185a47). Neither
commit is on main; both are on the branches `claude/wip/haack-grid` and
`claude/wip/archive`, which keep them reachable.

## `runners/`

The throwaway vitest files and the lane scripts as they ran (paths are
those of the worktree they ran in). To re-run one, copy its folder to
`tests/` at a076072 (or at the merged code) and run, from the repository
root, `ONLY=tests/tmp-haack/fit.test.ts SHAPE=haack C=0 L=3 M=2 CYL=2
REF=1 npx vitest run --config tests/tmp-haack/vitest.config.ts`; the
lane scripts give the environment of every run quoted. A finer grid's
fit was started from the saved coarser one (`seed.mjs`), which shortens
it only: the converged fit does not depend on its start.

## `outline/`: widening the outline (2026-10-27)

New references for the outline, registered before any run in 0006
("Widening the outline: registration"): 6 calibers at Mach 1.5, 2 and 3
and 5 calibers at Mach 3 (2 calibers of cylinder), judged by W5's
criteria unchanged; 4 calibers at Mach 3 only if neither case at Mach 3
passes. Branch `claude/wip/vk-outline`.

- `runners/`: the runners as they run, from a frozen tree (the src of
  main at 5ba98ff, its `COMMIT` file; the runners in `tests/vk/`).
  `fitsave.test.ts`, `seed.mjs` and `moc.test.ts` are W5's (the fit, its
  chunks and early stop, the seed, the march; `fitdata.ts` and
  `common.ts` unchanged), with three changes. Every checkpoint and save
  carries a fingerprint (the case, the chunk, the iteration limit, the
  stop's tolerances, and `fingerprint.ts`'s sha256 over the source files
  the runner reaches: the files under src/ as `numerics`, the runner's
  own as `runner`), and a checkpoint, seed or saved fit with another one
  is refused. The fit is checkpointed every 250 iterations inside a
  chunk, with the early stop's history, while the stop is still judged
  once per chunk. The march's lines are chosen by the registered rule
  (`auto`). `lane.sh` with `jobs-a.txt` and `jobs-b.txt`: the two lanes,
  resumable (a saved grid, or a march with its `.done` file, is skipped).
- `fits/smoke/`: the runner checked before the lanes started, on W5's
  1-caliber nose at Mach 2, nj = 20: stopped 300 iterations into a chunk
  at 1300 iterations, resumed, settled at 5000 iterations with the drag
  0.42909806331325262, against W5's 0.42909806331220435 (2.44e-12
  relative; corrected 2026-10-28 from 2.4e-11, which the message of
  3883113 also gives and which cannot be changed there); a checkpoint with another chunk size was refused
  (`log-mismatch.txt`). That save carries the runner hash from before the
  fingerprint check was moved ahead of the problem's construction, the
  only change made to the runner since.
- `analysis/judge.mjs`: the registered criteria applied to W5's marches
  and to the new ones (fits, line criterion, references, misses, the
  allowance by W5's rule, containment). On W5's `marches/moc.jsonl`
  (`analysis/judge-w5.txt`) it gives W5's passing lines, misses and
  containment ratios (1.73 on 5 calibers at Mach 2, 2.08 at Mach 1.5,
  2.27 on 3 calibers at Mach 2) and the allowance of 8e-4. One
  difference from 0006's text: the marched lines next to the one passing
  line of 5 calibers at Mach 2 (x = 0.41) are those at x = 0.27 and 0.64
  (misses up to 3.57e-4), not 0.18 and 0.27; the line at x = 0.18 is two
  lines away, and fails the change from 1280 intervals on nj = 20 and 40
  (6.7e-5 and 4.1e-5 of the drag) as well as nj = 80's mass balance. Its
  miss of 3.64e-4 and the 3.57e-4 both give an allowance of 8e-4.
- `fits/saved/`, `fits/log.txt`, `fits/queue-log.txt`: the saved fit
  heads (the cell states, 0.07 to 5.6 MB each, stay in the lanes' folder)
  and the lanes' logs; `marches/`: each case's march (`.txt`, `.jsonl`).
  `analysis/judge.txt` and `judge.json`: the verdicts (from this folder,
  `node outline/analysis/judge.mjs marches/moc.jsonl outline/fits/saved
  outline/marches --json outline/analysis/judge.json`).

Results, by the registered criteria (2026-10-28):

| Case             | nj = 20      | nj = 40      | nj = 80      | Order | Lines passing (x)  | Verdict |
| ---------------- | ------------ | ------------ | ------------ | ----- | ------------------ | ------- |
| 6 cal., Mach 1.5 | 0.0247060757 | 0.0245586673 | 0.0245288358 | 2.30  | one, 0.25 (90.8%)  | passes  |
| 6 cal., Mach 2   | 0.0235075806 | 0.0234152171 | 0.0233932940 | 2.07  | none               | fails   |
| 5 cal., Mach 3   | 0.0302101841 | 0.0301320717 | 0.0301044386 | 1.50  | one, 0.48 (82.1%)  | passes  |
| 6 cal., Mach 3   | 0.0218239931 | 0.0217627111 | 0.0217401958 | 1.44  | one, 0.49 (84.1%)  | passes  |

- 6 calibers at Mach 1.5 (iterations 5500, 9000, 15000; gates passed,
  wall cells at 71.5 deg or more): the one passing line misses by +1.11e-4
  and +1.21e-4, the marched lines next to it (x = 0.10 and 0.63) by up to
  1.67e-4; the band with the allowance contains the error against the
  lowest bound 2.40 times.
- 6 calibers at Mach 2 (iterations 5500, 8000, 14000; gates passed, wall
  cells at 76.6 deg or more) fails: no line passes the line criterion.
  The five lines at x = 0.002 to 0.17 fail both the mass balance (4.4e-5
  to 8.6e-3 on nj = 80) and the change from 1280 intervals, two of them
  without monotone marches; the line at x = 0.54 (81% of the drag) fails
  only the change from 1280 intervals on nj = 20 and 40 (4.91e-5 and
  3.54e-5, against 3.5e-5; 2.26e-5 on nj = 80), and the line at x = 1.78
  that change on every grid (8.7e-5 to 1.6e-4). Those two would miss by
  +3.51e-4 to +4.31e-4.
- 5 calibers at Mach 3 (iterations 5500, 8000, 13000; gates passed, wall
  cells at 79.4 deg or more; nj = 20 and 40 as W5's saved fits to
  6.38e-12 and 4.84e-15): the one passing line misses by -9.08e-5 and -6.29e-5, the
  lines next to it (x = 0.14 and 1.66) by up to 1.92e-4; containment 3.07.
- 6 calibers at Mach 3 (iterations 6000, 8000, 14000; gates passed, wall
  cells at 79.3 deg or more): the one passing line misses by -5.85e-5 and
  -1.84e-5, the lines next to it (x = 0.13 and 1.92) by up to 2.04e-4;
  containment 2.56.
- Every passing case rests on one line, as W5's 5 calibers at Mach 2. The
  largest miss counted stays W5's 3.57e-4, so the allowance stays 8e-4.
- The registration's hold: the outline of the passing cases has the
  corners (1, 1.5), (6, 1.5), (6, 3) and (1, 3), and the failed (6, 2)
  lies on its edge, so nothing is added until the owner decides;
  `VON_KARMAN_REFERENCES` keeps W5's seven (until 2026-10-29; 0006 gives
  the choices).
  `insideOutline` counts a point on the outline as inside, which is why
  (6, 2) on the edge holds them.
- The lines next to a passing line (recorded 2026-10-28): the
  registration did not define them; W5's text named the two lines ahead
  of 5 calibers at Mach 2's passing line, while `judge.mjs` counts one on
  each side, a rule fixed before any new data (it ran on W5's marches
  before the lanes started at 08:47 on 2026-10-27 and was committed in
  3883113 at 08:48:30; the first new fit was saved at 08:56, the first
  new march ran at 21:12). On W5's reading the allowance would be 9e-4
  with 5 calibers at Mach 3 (the second line ahead, x = 0.039, march
  order 0.23, misses by -4.48e-4) and 2e-3 with 6 calibers at Mach 3 (x =
  0.032, march order 0.10, -8.85e-4); with 6 calibers at Mach 1.5 alone
  it stays 8e-4. That reading decides the allowance if either Mach 3 case
  is added, so it is the owner's, with the choices. The independent
  review's view (2026-10-28, information for the owner): a line failing
  the line criterion on every grid gives no reference, so `judge.mjs`'s
  reading is the physically right one; over every line of the passing
  cases whose march's change from 1280 intervals is below 3.5e-5 on every
  grid, the largest miss is 3.57e-4 (checked here), so 8e-4 holds; the
  evidence supports (a') best.
- The owner's decision (2026-10-29; the owner's words "whatever is most
  accurate wins", applied by the coordinator; 0006 gives both reasons in
  full): option (a'). 5 and 6 calibers at Mach 3 join
  `VON_KARMAN_REFERENCES` (outline corners (1, 1.5), (5, 1.5), (6, 3),
  (1, 3)); 6 calibers at Mach 1.5 is not added, so the outline's edge
  passes 5.33 calibers at Mach 2, twice as far from the failed (6, 2) as
  (a)'s. The allowance is counted by `judge.mjs`'s reading, one line on
  each side: 8e-4 stays, since the lines W5's reading would count at Mach
  3 fail the line criterion on every grid and so give no reference. The
  registered criteria and the hold rule are unchanged.
- The lanes ran from 2026-10-27 08:47 to 2026-10-28 08:59 UTC, through
  four container restarts, each fit resuming from its last checkpoint
  (`fits/queue-log.txt`, `fits/log.txt`).

The refusal audit's population (`docs/research/refusals`, 2000 rockets,
8000 cases), served totals:

| Base, references                               | All bands | Mach 1.5 to 1.8 | Mach 1.8 to 3.0 |
| ---------------------------------------------- | --------- | --------------- | --------------- |
| main 5921198, W5's seven                       | 181       | 68              | 113             |
| main 5921198, with 6 cal. Mach 1.5 (interim)   | 198       | 84              | 114             |
| main 3e026a8, W5's seven                       | 155       | 53              | 102             |
| main 3e026a8, with 6 cal. Mach 1.5 (interim)   | 168       | 65              | 103             |
| main cdd26e6, W5's seven (the branch, held)    | 155       | 53              | 102             |
| main cdd26e6, with 6 cal. Mach 1.5, 5 cal. Mach 3 (a) | 213 | 71              | 142             |
| main cdd26e6, with 5 and 6 cal. Mach 3 (a')    | 204       | 55              | 149             |
| main cdd26e6, with all three passing cases (b, nothing cut out) | 242 | 73              | 169             |
| main 76899f1, W5's seven (the branch, held; 2026-10-28) | 184 | 73              | 111             |
| main 76899f1, with 6 cal. Mach 1.5, 5 cal. Mach 3 (a) | 253 | 99              | 154             |
| main 76899f1, with 5 and 6 cal. Mach 3 (a')    | 237       | 77              | 160             |
| main 76899f1, with all three passing cases (b, nothing cut out) | 288 | 103             | 185             |
| main 02549f2 (2026-10-29): the same four runs   | 184, 253, 237, 288 | 73, 99, 77, 103 | 111, 154, 160, 185 |

None below Mach 1.5 in any run. Each run with W5's seven gave main's
`impact.out` byte for byte, and every run's cross-check with `src/total`
agreed on 1200 of 1200 cases. The runs with added cases are for the
owner's decision only (`population/option-a`, `population/option-a-prime`
and `population/all-three` on cdd26e6, the same under `population/76899f1`
on 76899f1 and `population/02549f2` on 02549f2:
the run of `docs/research/refusals` on the merged head with those points
added to `VON_KARMAN_REFERENCES` for the run, then taken out); the
branch's own outputs are the held run, which is main's. Since the owner's
decision of 2026-10-29 (option (a'), branch `claude/wip/vk-a-prime` from
main 95673cd), the code serves 5 and 6 calibers at Mach 3 and
`docs/research/refusals/out/impact.out` is that run: 237 of 8000 (Mach
1.5 to 1.8: 77; 1.8 to 3.0: 160), the cross-check agreeing on 1200 of
1200. Its `impact.out` and `.json` are byte for byte the (a') run on
02549f2, `population/02549f2/option-a-prime` (committed 2026-10-29 with
the other two option runs on 02549f2; the sentence first named that run
before it was committed). Against `population/76899f1/option-a-prime`
the totals are the same (237, 77, 160) and only rows of fin reasons
differ, moved by main's fin changes between 76899f1 and 02549f2.
