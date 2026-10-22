# ARC R&M 3348 table 3: base pressure on the single-wedge wing, first typing (method)

**Source.** E. W. E. Rogers, C. J. Berry and V. G. Quincey, "Tests at
transonic speeds on wings with wedge sections and sweep varying between 0
deg and 60 deg", ARC R&M 3348, 1963 (N.P.L.; replaces A.R.C. 23,180).
AERADE 1826.2/3929, `arc-rm-3348.pdf` (107 PDF pages). Named band-setting
by 0014 section 10.7 (k) before this typing. Typed for design record 0019
(F4: square trailing edges below Mach 1.5, and the sweep of item 3).

**What the table holds.** p_b / p_0, the base pressure over the tunnel
static pressure, at six holes in the chord plane of the base (table 2(b),
PDF p. 32: eta_b 0.10, 0.26, 0.425, 0.59, 0.75, 0.915 of the base span
from the root), for sweeps 0, 15, 30, 45 and 60 deg, stream Mach numbers
0.70, 0.80, 0.90, 1.00, 1.11, 1.16 (0 to 30 deg) or 1.20 (45 and 60 deg),
and incidences 0 to 8 deg (to 3, 4 or 6 deg at the highest Mach numbers).
30 sub-tables (a) to (dd), PDF pp. 33 to 38 (report pp. 32 to 37).

**The model** (pp. 3 to 4, table 1, PDF p. 31). An untapered half wing on
the tunnel wall, pivoted about the root trailing edge, so the chord normal
to the leading edge stays c = 4.00 in at every sweep (streamwise chord
4.00, 4.14, 4.62, 5.66, 8.00 in at 0, 15, 30, 45, 60 deg; mean semi-span
11.15, 11.29, 10.65, 9.30, 7.31 in). Single wedge of 14% thickness on c,
leading-edge semi-angle about 4.0 deg: a base 0.56 in high, parallel to the
leading edge, so the trailing edge is swept as the wing. Re on the
streamwise chord 1.25e6 to 3.41e6 (p. 4; stagnation 31 in Hg, 283 K).
Transition free: at zero incidence laminar regions with turbulent wedges
from leading-edge imperfections (section 2.3, which judges the laminar
regions to "have little effect on the base pressures"). With c / h = 7.1
and Re_c about 1.7e6 the layer parameter c / [h Re_c^(1/5)] is about 0.4:
a thin layer against the base.

**Method.** Each page rendered at 130 dpi (`pdftoppm -r 130`) and every
entry typed from the image, sub-table by sub-table, hole 6 to hole 1 as
printed, all incidence columns (only alpha = 0 is used by 0019). The
heading of each sub-table (its letter, M_0 and sweep) and the incidence
columns present were typed with it. As a check for slips, the typed values
were compared, page by page, with the PDF's own text layer (an OCR of the
scan): on PDF p. 33 the text layer holds 145 of the 150 values, and every
value it holds matches a typed one; on the later pages the text layer
loses most entries (89 of 144 on p. 36, 65 of 144 on p. 38), so it
confirms only what it holds, and none of it contradicts the typing. No
value was changed by the check.

**Errors.** The table prints three decimals: a typed value is exact unless
mistyped, and the blind second typing is the check. The report's own
accuracy is not stated for the base pressures; its section 5.1 discusses
the pressure distributions' validity (tunnel interference, the model's
finite span), to be quoted when the band is formed.

**Points to watch when the band is formed.**

- The pressures are referred to the tunnel static pressure p_0, as the
  report's p_b / p_0; convert to P_B = (p_b / p_0 - 1) / (0.7 M_0^2).
- The spread over the six holes at alpha = 0 (typed values): 0.011 to
  0.015 unswept from M 1.00; 0.055 to 0.102 unswept at M 0.70 to 0.90 (the
  vortex street); 0.038 to 0.287 swept, largest at 45 deg and M 1.00
  (0.608 at hole 1, 0.895 at hole 6), the holes nearest the root and the
  tip reading furthest from the middle. The report's simple-sweep
  correlation (fig. 30b) uses "a station near the mid-semi-span". Which
  holes stand for an infinite swept edge is decided from the report's own
  statements before any value is compared with a model.
- The single wedge's faces are inclined at about 4 deg, so the pressure
  and Mach number just ahead of its base differ from the free stream's;
  RM A51J25 fig. 7's curve is on the local values (M', p'). The surface
  pressure nearest the base (hole 16 of table 2(a), x/c 0.995) is needed
  before the two are compared; the figures that hold it are not among
  those 0014 10.7 (k) names, so they were named in 10.7 (l) (figs. 47 to
  52) before they are read.

**Status.** First typing, by the 0019 reader, 2026-10-21. Read twice:
the blind second typing (round 8, `../round8/readings/rm3348_table3.csv`
and `rm3348_table2b.csv`, commit ffbac76, its reader not having opened
this typing) was paired with this one by the coordinator on 2026-10-22:
852 of 852 values identical, on the same PDF pages, and table 2(b)'s six
hole positions identical. `tests/base/rm3348-table3-readings.test.ts`
holds the two typings equal. Not yet used for anything.
