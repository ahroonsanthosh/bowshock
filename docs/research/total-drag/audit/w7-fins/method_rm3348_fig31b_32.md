# ARC R&M 3348 figs. 31(b) and 32: first readings (method)

**Source.** ARC R&M 3348 (AERADE 1826.2/3929), the copy and sha256 of
`method_rm3348_fig30.md` (d2f35d8a...b383e158, verified again on
download). Fig. 31(b), PDF p. 69 (printed p. 68); fig. 32, PDF p. 70
(printed p. 69). Both named band-setting by 0014 section 10.7 (k) before
these readings (F3; fig. 31b also checks 0019 3.2's line sink).

**Blindness.** Round 10 has read both figures; none of its files, nor
any pairing file, was opened. The reviewer's first-look numbers quoted in
0019 (sections 3.2 and 3.3) were in the record I was editing, so I had
seen them before reading. They are a few rough values. I did not use
them to place any symbol, and the readings were not compared with them.

**Method** (as `method_rm3348_fig30.md`). 300 dpi render; each figure
cropped (fig. 31b at page (560, 1590), fig. 32 at (380, 280)) and its
grid found (`scripts/gridfind.py`) and traced on the crop
(`scripts/calib.py`); grid files `rm3348_fig31b_grid.json`,
`rm3348_fig32_grid.json` in crop pixels; the CSVs give page pixels.
Rough centres on zoomed views (`scripts/zoom.py`), written by
`scripts/f31b_rough.py` and `scripts/f32_rough.py`; refined by
`scripts/symfit.py`, checked on overlays; `scripts/merge_fit.py` and
`scripts/emit_reading.py` as for fig. 30.

**Fig. 31(b)**, `rm3348_fig31b_first.csv`: C_cf sec^2(phi) against M_0
cos(phi), grid every 0.1 and 0.01 (about 1700 px per unit M_0 cos(phi),
11500 px per unit coefficient). 36 symbols: phi 0 deg 10 circles, 30 deg
8 crosses, 45 deg 10 triangles, 60 deg 8 pluses. The legend's four
symbols are not data. The faired 0 deg curve is not read. Hand-placed:
the eight pluses (no template), and o03 and x01, whose fits moved more
than 3 px (o03 sits where the 0 deg curve crosses the grid line M_0
cos(phi) 0.8, with triangle t08 just above it; x01 touches the circle
o01). Errors 0.0001 to 0.0002 in the coefficient and in M_0 cos(phi).

Uncertain calls: o03 and t08 at M_0 cos(phi) 0.80 overlap the curve and
each other; the grid line M_0 cos(phi) 0.5 is drawn only in part (two
trace samples), so the points near it (t01, p04) lean on its short
course; two specks above p04, near (0.51, -0.001), are not symbols.

**Fig. 32**, `rm3348_fig32_first.csv`: the reduced coefficient C~_cf
against xi_0, grid every 1.0 and 0.5 (about 173 px per unit xi_0, 230 per
unit C~_cf). The present tests' 9 circles, all fitted, from xi_0 -4.14
(C~ -0.47) to 0.65 (2.51). Knechtel's two-dimensional curve (ref. 19) and
the theory curve (ref. 30) are not read: under 0019 3.3 (N4) Knechtel's
curve sets nothing until its tunnel and corrections are recorded. The
top axis's M_0 scale is not read either. Errors about 0.0065 in xi_0 and
0.005 in C~_cf.

Uncertain calls: o01 (xi_0 -4.14) sits on the frame's -0.5 line, its
lower half on it; o07 and o06 lie on the drawn curves, which the fits
avoided (checked on the overlay).

Read once each. Round 10's blind readings exist; the pairing is a
neutral party's.
