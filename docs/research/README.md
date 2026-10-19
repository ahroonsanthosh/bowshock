# Research records and work in progress

Nothing in this folder is used by the solver or the pages, and nothing here
is an accepted design. It keeps the evidence and the unfinished work behind
the design records in [`docs/design`](../design), so that it can be checked
and is not lost. Accepted results move into a design record, with tests,
before anything is served.

Linting, formatting and type checking skip this folder: the files are kept
as their authors wrote them.

## `total-drag/`: research for Phase B (total drag)

- `draft.md`: a draft design record for total drag (skin friction, base
  drag, fins, and the validation data for the total), titled 0008, the
  number it will take once accepted. **Status: revised after an
  independent audit (`audit/audit.md`), whose corrections it adopts. A
  second audit of the revision (`audit/round2/audit_round2.md`) found it
  fit to become a design record (status draft) after seven corrections,
  three of which narrow the claim (the Basic Finner gate covers Mach 1.8
  to 3.0, not 1.5 to 3; the fins-on-base increment the claim needs has no
  derived band above Mach 2; a failed gate must refuse, not widen a
  band); those corrections are in progress.** The audit confirmed the
  scripts and nearly all citations, and found misread curves of NACA TN
  3819 fig. 18, a calibration error and an unstated symbol convention in
  NASA TN D-4014 figs. 5 and 6, and three conclusions their sources did not
  support. The revision resolves the readings (a third, independent
  reading of TN D-4014 agrees with the audit's within 0.0011), states one
  reading rule for symbols, takes the friction band from
  [0007](../design/0007-skin-friction.md), restates the base band as
  asymmetric and the band sum as a minimum, derives the fin band, and
  adds a rule that no gate reuses data that set a band. Its validation
  search found one total-drag set matching a simple finned rocket, the
  Basic Finner in free flight (fins ending at the base), so a first
  release could claim only that configuration class, and only if that
  gate passes. Its "Changes from the first draft" list ends the file.
  Several new transcriptions have one reading so far (marked as such).
- `data/`: transcriptions (ARCAS, RM A53D02, TN 3097, TN 3819 fig. 18) and
  the outputs of the scripts.
- `scripts/`: the computations and digitising aids (Python 3, numpy and
  Pillow).
- `reference-files/`: the Turbulence Modeling Resource's SA flat-plate
  file used by `scripts/sa_vs_vd.py` (its van Driest II file is in
  `tests/friction/data/`).
- `audit/`: the audit, its own figure readings with their methods, its
  independent re-implementations (van Driest II, the exact double wedge,
  linear 3D fin drag by the supersonic area rule), and two overlays of TN
  3819 fig. 18 showing where the disputed curve readings fall.
- `overlays/d4014/`: the revision's overlays of its TN D-4014 readings.
  Several scripts read page images rendered from the reports, which are
  not copied here (see below).

The source reports themselves (NACA and NASA, from the NASA Technical
Reports Server) are not copied here; each file cites its report by its NTRS
number.

## `subtip/`: noses whose tip flow is axially subsonic

The measurements behind "What serving these tips would need" in
[0006](../design/0006-shock-fitting.md): the fitted and captured runs
(`results/*.jsonl`), the scripts that analysed them (`analysis/`), the
runners (`runners/`, which ran from `tests/tmp-subtip/` against a copy of
the code), and that copy's changes from the commit it was taken at
(`snapshot-changes/`: the tip refusal removed, x0 as a parameter, a column
anchor, a progress callback; `snap2` adds the corner patch of
`docs/design/patches/0006-corner-one-sided.diff`).

## `wip/`: code in progress, not yet validated

Diffs of work on branches that exist only locally, kept here so that it
survives. None of it is merged into the solver; each is merged only once
its own validation passes.

- `haack-grid.diff` (commits in `haack-grid.log`): the two-scale C grid for
  Von Karman (Haack) and power-series noses, and sharp tips whose bow shock
  stands off ahead of them. Measured on two grids so far; the third is
  running.
- `transonic.diff` (commits in `transonic.log`) and
  `transonic-uncommitted.diff`: the transonic prototype for Mach 1 to 1.2 (far field, the body followed
  past its base). Its design notes call themselves 0007 and will be
  renumbered.
- `low-mach-blunt.diff`: uncommitted changes for blunt noses at Mach 1.2 to
  1.5, whose fitted grids fail the size-ratio gate where column counts are
  rounded per interval along the body.

Each diff names its base commit in its first line, and applies there with
`git apply`.
