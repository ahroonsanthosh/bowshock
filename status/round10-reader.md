# Round 10 blind reader: status at handoff (2026-10-22)

Branch `round10-w7-figures` (pushed as `claude/wip/round10-w7-figures`), from main 7411c70. Clean tree.
Everything under `docs/research/total-drag/audit/round10/` (readings/, overlays/, scripts/, method.md).
The reader never opened W7's readings, scripts, or scratchpad/w7-review. Blind second readings of the
figures W7 registered in 0014 10.7 (k) and (l).

| Commit | Holds |
|---|---|
| 620c0a6 | R&M 3348 figs. 30a and 30b: symbols and faired curves (incl. Cleary and Stevens), calibrations, overlays, method, the table 3 check column |
| c8bb424 | R&M 3348 figs. 31b (all sweeps plus the 0 deg line) and 32 (9 single-wedge circles, Knechtel ref. 19 solid curve, ref. 30 theory dashed curve) |
| 9a2d488 | CR-149372 fig. 8a: 95 symbols (M 0.6 circles, 0.7 squares, 0.8 triangles, 0.9 hexagons), four faired curves (147 readings), affine alternatives; dpi label fix (600 to 300, label only) |
| 4300c90 | R&M 3427 fig. 13, base holes 5, 6 and 7 only (35 symbols, four lines, jump line at M 0.977). Surface holes 1 to 4 not read (hole 4 is registered as 10.7 (m) on w7-fins) |
| 5c7c746 | R&M 3427 figs. 9 and 10 (tick calibrations, `scripts/tick_calib.py`), plus fig. 15's calibration config |

PDF hashes in method.md (R&M 3348 d2f35d8a..., CR-149372 339f24fc..., R&M 3427 0e8b4d66...).

Queue left: R&M 3427 fig. 15 (calibrated only, entry `r3427f15`, no symbols read), fig. 16 a and b (not
started). W7's first readings of figs. 15, 16 (2c1cfdd) and 18 (0707bf2) are on w7-fins; a new blind
reader must not open them.

Pairing still to do (by a neutral party, never the readers): round 10 against W7's first readings, for
every figure both have read. None is paired yet.

## The fig. 30 against table 3 observation (for the pairing, not yet shown to W7)

At M_0 0.70 to 1.00 the plotted symbols agree with table 3 (hole 4, alpha 0) within 0.002, apart from
a30-1 (-0.004) and a30-5 (+0.008 at M_0 1.00, phi 30). At M_0 1.11 to 1.20 every plotted point lies
below the table (more suction) by 0.003 to 0.010, and by 0.017 and 0.022 at phi 45 and 60 at M_0 1.20.
The report does not say why. The advisor (Fable) recommends: keep both, use the envelope, never pick
the narrower; use R&M 3348 as band-setting to M 1.00 and as a flagged check at 1.11 to 1.20 (the report
applied no blockage correction and notes tunnel interference at the top of its range).

## Uncertain calls (full list in round10/method.md)

- Fig. 30: square a60-6 below its line; triangle a30-9 on no line; no triangle found for phi 30 at
  M_0 1.005 in (b); phi 60 at M_0 0.70 off the (b) scale; triangles centred on their bounding box
  (centroid would read +0.0023).
- Fig. 31b: some symbols score below 0.6 (errors raised); the pieces at -0.01 far left are gridline;
  the 0 deg line unread at 0.82 and 0.84.
- Fig. 32: Knechtel's curve merges with the zero gridline below xi_0 -1.3; theory curve unread at -1.2
  to -1.0; d-9 at about M_0 1.11.
- CR-149372 fig. 8a: m8-01 mostly hidden; m9-12 and m9-13 partly drawn (could be one hexagon twice);
  m9-10 on no line, left out; M 0.6 and 0.7 lines touch past 150 deg (assigned by the symbols each
  reaches); the knee 65 to 100 deg unread for M 0.6 to 0.8; hand-drawn grid, theta errors about
  +-0.85 deg.
- R&M 3427 fig. 13: hole identification by leaders, text, fig. 3 and fig. 16a (circle = 6, triangle =
  7, square = 5 by elimination); no squares at M 0.2 to 0.6 or 0.90 to 0.91; M 0.96 not read.
- Fig. 9: te-18 and te-21 typed as circles by shape; most of the 1/7 power-law line hidden.
- Fig. 10: three ticks per axis, errors about +-0.008 in M and +-0.0022 in delta/h.
