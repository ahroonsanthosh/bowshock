# ARC R&M 3348 figs. 47 to 52 near the trailing edge: first reading (method)

**Source.** ARC R&M 3348 (AERADE 1826.2/3929), the copy and sha256 of
`method_rm3348_fig30.md`. Figs. 47 to 52, "Pressure distributions on
single-wedge section at M_0 =" 0.70, 0.80, 0.90, 1.00, 1.11 and 1.16, PDF
pp. 81 to 86 (printed pp. 80 to 85). Each has five panels, (a) to (e) for
phi 0, 15, 30, 45 and 60 deg. Each panel shows p/H (H the stagnation
pressure) against x/c at the pressure-plotting station, as faired curves
without symbols, labelled by incidence. The report's holes are on the
upper surface only (section 2.1): the solid curves are positive incidence
and 0 deg, the broken ones negative incidence. Named by 0014 section
10.7 (l) for the surface pressure just ahead of the base (x/c 0.995).

**Blindness.** I opened no round 10, 11 or 12 file and no pairing
folder. I read table 3's header row from my own typing in this folder
(for its incidences), not its values.

**What can be read at x/c 0.995.** Near the trailing edge all the curves
of a panel converge into a bundle about 0.02 to 0.19 high in p/H. They
turn up into the frame line at x/c 1.0, and x/c 0.995 lies on the frame
line's edge, 2 to 3 px from its centre. One by one, the curves cannot be
told apart there, nor followed to x/c 0.995. Several broken curves end
before it, at about x/c 0.93 to 0.97. So the reading is the envelope of
the curves' ink over x/c 0.975 to 0.990, its least and greatest p/H.
Within that band, the solid curves and those broken curves that reach it
fall inside the envelope. It is not a value per incidence, and the 0 deg
curve is not separated.

**Method.** The pages rendered at 300 dpi and deskewed
(`scripts/linerow.py` measures a long frame line's slope, and
`scripts/deskew.py` rotates by it: -0.35, 0.29, 1.75, 0.10, 0.03 and
-0.32 deg for pp. 81 to 86). For each panel (`scripts/te_all.py`, boxes
from quarter-scale views), `scripts/te_panel.py` finds the frame (x/c 0
and 1.0, p/H 0 and 1.0) and the left axis's four ticks (0.2 to 0.8).
p/H is a straight line through the frame and the ticks, with residuals
of at most 0.004. `scripts/te_band.py` then takes the dark pixels in
every column from x/c 0.975 to 0.990 (steps of 0.0025), between p/H 0.1
and 0.88 (above the hatched model), less the rows of the axis ticks.
`scripts/te_emit.py` writes the CSV. Every panel was checked by eye on
`scripts/te_view.py`'s views (x/c 0.8 to 1.0, p/H 0.3 to 0.9, 2x). One
exclusion was made: in fig. 50(e), a speck at p/H 0.79, x/c 0.98. err in
the CSV: 0.004 calibration and 1 px, 0.006 in p/H.

**Reading** (`rm3348_figs47_52_te_first.csv`): 30 panels, each a least and
a greatest p/H over x/c 0.975 to 0.990.
- At M_0 0.70 the bundles lie at 0.57 to 0.71.
- At 0.80, at 0.48 to 0.64.
- At 0.90, at 0.41 to 0.59.
- At 1.00, at 0.34 to 0.56.
- At 1.11, at 0.34 to 0.57.
- At 1.16, at 0.32 to 0.53.
- The bundles are narrowest at phi 60 deg (0.02 to 0.07 high).

**For the pairing and the record.**
- The registered quantity, p/H at x/c 0.995 per curve, is not readable
  from these figures as drawn. A second reader should read the same
  envelope, over the same band, so that the two can be paired. What 0014
  10.7 (l) intended (the local M' and p' ahead of the base, compared with
  table 3 at each incidence) would need the report's tabulated pressures
  at x/c 0.995, if it has any, or per-curve values that this scan does
  not separate. Whether to name another source, or to use the envelope
  as a band on p', is the coordinator's decision.
- Converting p/H to the local Mach number M' needs H at each M_0; not
  done here.

Read once.
