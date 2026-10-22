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
- `queue.log`, `lanex.log`, `marches.log`: when each run started and
  ended. `log-tmp-haack.txt`, `log-tmp-haackmoc.txt`: the runners' own
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

## `runners/`

The throwaway vitest files and the lane scripts as they ran (paths are
those of the worktree they ran in). To re-run one, copy its folder to
`tests/` at a076072 (or at the merged code) and run, from the repository
root, `ONLY=tests/tmp-haack/fit.test.ts SHAPE=haack C=0 L=3 M=2 CYL=2
REF=1 npx vitest run --config tests/tmp-haack/vitest.config.ts`; the
lane scripts give the environment of every run quoted. A finer grid's
fit was started from the saved coarser one (`seed.mjs`), which shortens
it only: the converged fit does not depend on its start.
