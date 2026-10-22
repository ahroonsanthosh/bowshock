# NACA TN 3548 fig. 6: the slab wing's base pressure, first reading (method)

**Source.** Morrow and Katz, NACA TN 3548 (1955), NTRS 19930084307,
downloaded from NTRS on 2026-10-22 into a new empty directory: 21 PDF
pages, sha256
5a6e1b5bffedbf9f9d36503915e3aa609dcc2b8dea1462e5f9c26b67b066acd6. No hash
was recorded before (`docs/validation/sources.md` does not list this
report); this one is the reference for the second reading. Fig. 6, PDF p.
17 (printed p. 15). Named band-setting by 0014 section 10.7 (k), as 10.1
names it, before this reading. Figs. 7 to 10 (the PARD standard body's
totals, held back) were not opened; the text was read only for the slits
and the accuracy. Read blind to round 10 and to round 4.

**What the figure holds.** Cp_b of the 6% slab wing (rectangular, aspect
ratio 2.7) in rocket-model free flight, from two slits 0.02 by 2.5 in in
the central part of the base (text, PDF p. 6): circles the outboard slit,
squares the inboard slit, M 0.62 to 1.61, with a faired curve, the body of
revolution of its ref. 2 (dashed) and the vacuum limit (dash-dot). Only
the symbols are read. The report: "The accuracy of the base pressure
coefficients is estimated to be +-0.02 at a Mach number of 0.800 and
+-0.005 at a Mach number of 1.400", Mach number within +-0.01, and "the
base-pressure slits did not necessarily measure average suction over the
entire base because they were located in the central part of the base".

**Method.** The page rendered at 300 dpi (`pdftoppm -r 300 -f 17 -l 17`;
the scan's own 300 ppi, colour JPEG), page pixels.

- _Grid._ Lines every 0.05 in M (M 0.6 at x 852 to 1.65 at 2010) and in
  Cp_b (-0.9 at y 527 to -0.25 at 1251), found from the column and row
  profiles and traced along their length by `scripts/calib.py`
  (`tn3548_fig6_grid.json`); the vertical lines lean by up to 4 px over
  the plot's height, which the trace follows. About 1100 px per unit M,
  1110 per unit Cp_b.
- _Symbols._ 76 (37 circles, 39 squares), rough centres placed by eye on
  zoomed views with pixel rulers (`scripts/zoom.py`, 4 to 6 times),
  `tn3548_fig6_rough.csv`; refined by `scripts/symfit.py`, every fit
  checked on its overlay. Where the fit moved more than 2.5 px (13 of
  76, all with a grid line through or beside the symbol, which pulls the
  template) the hand centre is kept (`scripts/tn3548_merge.py`; `source`
  hand in the CSV). Where a circle and a square overlap (M 0.62, 0.68,
  0.76, 0.80, 0.86 to 0.98), each was placed on its own outline.
- _Errors_ (reading only): placement 1 px (fit) or 2.5 px (hand) with 0.5
  px for the grid trace, in quadrature, over the local scale: 0.0010 or
  0.0023 in both M and Cp_b. The report's own accuracy (above) is much
  larger and is carried separately when a band is formed.

**Reading** (`tn3548_fig6_first.csv`, `scripts/emit_tn3548.py`). Outboard
(circles) and inboard (squares) about -0.55 to -0.59 from M 0.62 to 0.89,
the outboard slit 0.01 to 0.04 more negative from M 0.89; the peak at M
0.984, -0.827 and -0.832; -0.729 and -0.703 at 1.023; -0.479 and -0.462
at 1.199; -0.331 and -0.315 at 1.52; -0.309 and -0.293 at 1.608.

Read once. A blind second reading is to be arranged by the coordinator;
no band is set until both are held and paired. Note for the pairing: 0014
10.7 (k) counts this with RM A51J25 fig. 7's PARD set as one set.
