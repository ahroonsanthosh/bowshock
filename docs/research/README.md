# Research records and work in progress

Nothing in this folder is used by the solver or the pages, and nothing here
is an accepted design. It keeps the evidence and the unfinished work behind
the design records in [`docs/design`](../design), so that it can be checked
and is not lost. Accepted results move into a design record, with tests,
before anything is served.

Linting, formatting and type checking skip this folder: the files are kept
as their authors wrote them.

## `total-drag/`: research for Phase B (total drag)

- The draft design record for total drag that these files support is now
  [0008](../design/0008-total-drag.md) (status draft), revised after two
  independent audits (`audit/audit.md`, `audit/round2/audit_round2.md`);
  its earlier versions are in this folder's history (`draft.md`).
- `data/`: transcriptions (ARCAS, RM A53D02, TN 3097, TN 3819 fig. 18) and
  the outputs of the scripts.
- `scripts/`: the computations and digitising aids (Python 3, numpy and
  Pillow).
- `reference-files/`: the Turbulence Modeling Resource's SA flat-plate
  file used by `scripts/sa_vs_vd.py` (its van Driest II file is in
  `tests/friction/data/`).
- `audit/`: the first audit, its own figure readings with their methods, its
  independent re-implementations (van Driest II, the exact double wedge,
  linear 3D fin drag by the supersonic area rule), and two overlays of TN
  3819 fig. 18 showing where the disputed curve readings fall; and
  `audit/round2/`, the second audit, of the revision, with its second
  readings of the new transcriptions; and `audit/round3/`, the second
  readings of TN 3819 fig. 35 (the fins-on-base factor: it and its band
  agree with 0008 section 3.4 within 0.015) and of the fig. 18 values read
  once (agreeing within 0.0013; the same reader as round 1, by another
  method); and `audit/round4/`, the second readings of the blunt-edge data
  (TR 1109, RM A51J25, TN 3819 fig. 5, TN D-1056, TN 2960: every band
  holds) and the Basic Finner's fin trailing-edge area, 0.32 cal^2, decided
  from its measured mass properties without any drag value; and
  `audit/round5/`, the Basic Finner's total re-implemented blind from the
  records and compared with the second gate run (no bug in the code; the
  findings on the records and two bands are acted on in 0010 section 10).
- `overlays/d4014/`: the revision's overlays of its TN D-4014 readings.
  Several scripts read page images rendered from the reports, which are
  not copied here (see below).

The source reports themselves (NACA and NASA, from the NASA Technical
Reports Server) are not copied here; each file cites its report by its NTRS
number.

## `fin-wave-drag/`: measurements behind 0009

The runners and outputs of the measurements quoted in
[0009](../design/0009-fin-wave-drag.md) (the fin wave-drag library,
`src/fins/`) that are not committed tests: the research's and the audit's
fin scripts re-run, a resolution study of the audit's area-rule code, the
throwaway vitest runs (quadrature convergence, the strip-theory table, the
planar Euler sections), and `compare.py`, which derives the summaries the
record quotes. Its README says how to re-run each.

## `base-and-total/`: measurements behind 0010

The throwaway vitest runs behind [0010](../design/0010-base-drag-and-total.md)
(the base-drag and total-drag libraries, `src/base/` and `src/total/`):
the compiled curve's band and interpolation bound, the fins-on-base rows,
the Basic Finner partial sum per shot (the first gate run), the check of
the round-4 second readings, the laminar trailing-edge band per shot,
the second gate run and its tolerances re-derived after the round 5
audit. Its README says how to re-run each.

## `subtip/`: noses whose tip flow is axially subsonic

The measurements behind "What serving these tips would need" in
[0006](../design/0006-shock-fitting.md): the fitted and captured runs
(`results/*.jsonl`), the scripts that analysed them (`analysis/`), the
runners (`runners/`, which ran from `tests/tmp-subtip/` against a copy of
the code), and that copy's changes from the commit it was taken at
(`snapshot-changes/`: the tip refusal removed, x0 as a parameter, a column
anchor, a progress callback; `snap2` adds the corner patch of
`docs/design/patches/0006-corner-one-sided.diff`).

## `interface/`: screenshots of the interface's phase checks

Every page at 390, 768 and 1440 px wide, as `scripts/interface-check.mjs`
takes them for the phase checks of
[0012](../design/0012-interface.md) section 8 (headless Chromium on
software WebGPU, so a flow is shown as far as it has converged in the time
allowed), kept for review and taken again at each phase.

## `wip/`: code in progress, not yet validated

Diffs of work on branches that exist only locally, kept here so that it
survives. None of it is merged into the solver; each is merged only once
its own validation passes.

- `haack-grid.diff` (commits in `haack-grid.log`): the two-scale C grid for
  Von Karman (Haack) and power-series noses, and sharp tips whose bow shock
  stands off ahead of them. Measured on two grids so far; the third is
  running.
- `transonic.diff` (commits in `transonic.log`): the transonic solver for
  Mach 1 to 1.2 (the body followed past its base as a long cylinder, far
  boundaries about 100 body radii out with a characteristic condition,
  the shock captured, implicit LU-SGS steps; H grids for sharp noses and C
  grids for ellipsoids). Its record calls itself 0007 and will be
  renumbered. Measured so far: cones at Mach 1.2 to the supersonic
  standard (2.3e-5 of the exact value on the finest grid, the band
  containing it), at 1.1 within 3.5e-4 without a settled order, at 1.05 at
  first order; at Mach 1 the drag depends on the far boundary (1.8% low at
  100 radii on a cone, 10% on an ogive), so it rests on an extrapolation
  in that distance; on blunt noses at Mach 1.2 the stagnation pressure
  error does not converge. Not served.

Each diff names its base commit in its first line, and applies there with
`git apply`. A diff whose work is merged is removed from here (the changes
for blunt noses at Mach 1.2 to 1.5 were merged in eeaa537).
