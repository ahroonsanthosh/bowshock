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

## `runners/`

The throwaway vitest files and the lane scripts as they ran (paths are
those of the worktree they ran in). To re-run one, copy its folder to
`tests/` at a076072 (or at the merged code) and run, from the repository
root, `ONLY=tests/tmp-haack/fit.test.ts SHAPE=haack C=0 L=3 M=2 CYL=2
REF=1 npx vitest run --config tests/tmp-haack/vitest.config.ts`; the
lane scripts give the environment of every run quoted. A finer grid's
fit was started from the saved coarser one (`seed.mjs`), which shortens
it only: the converged fit does not depend on its start.
