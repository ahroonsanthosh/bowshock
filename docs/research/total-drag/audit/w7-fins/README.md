# W7's fin terms near Mach 1: first readings (design record 0019)

The figures and tables that set the bands of the fin terms near Mach 1
(0019 sections 3.2 to 3.5), each named band-setting by 0014 section 10.7
(k) before it was read. Each is read here once, by the 0019 reader, with
its source (NTRS id or AERADE handle, PDF page), its calibration and its
per-row errors; a blind second reading is arranged by the coordinator, and
no band is set until both are held and paired. Downloads are kept outside
the repository; only readings, methods and scripts are here.

| File                                                                             | Source                                                        | What                                                                                                                | Status                       |
| -------------------------------------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| `rm3348_table3_first.csv`, `method_rm3348_table3.md`                             | ARC R&M 3348 (AERADE 1826.2/3929), table 3, PDF pp. 32 to 38  | base pressure of the single-wedge wing, 852 values (F4, its sweep)                                                  | read twice; paired (below)   |
| `rm3427_fig13_first.csv`, `method_rm3427_fig13.md`                               | ARC R&M 3427 (AERADE 1826.2/4011), fig. 13, PDF p. 37         | base pressure of the 10% blunt section, holes 5 to 7, M 0.2 to 1.12 (F4)                                            | read once; second to arrange |
| `rm3427_fig9_first.csv`, `rm3427_fig10_first.csv`, `method_rm3427_figs9_10.md`   | ARC R&M 3427 (AERADE 1826.2/4011), figs. 9 and 10, PDF p. 36  | the boundary layers ahead of the base: profiles at M 0.8, delta/h at M 0.4 to 1.1 (F4)                              | not shown to be blind; not used (rounds 10 and 12 paired at 36c5a61 are the record) |
| `rm3427_fig15_first.csv`, `rm3427_fig16_first.csv`, `method_rm3427_figs15_16.md` | ARC R&M 3427 (AERADE 1826.2/4011), figs. 15 and 16, PDF p. 39 | base pressure across the span (M 1.0, 0.8, 0.4, with a pitot traverse) and across the base (alpha 0 and 2 deg) (F4) | read once; second to arrange |
| `rm3427_fig18_first.csv`, `method_rm3427_fig18.md`                               | ARC R&M 3427 (AERADE 1826.2/4011), fig. 18, PDF p. 41         | base pressure at M 0.8 against the chord Reynolds number, 2.3e6 to 4.5e6 (F4)                                       | read once; second to arrange |
| `rm3427_fig39_first.csv`, `method_rm3427_fig39.md` | ARC R&M 3427 (AERADE 1826.2/4011), fig. 39, PDF p. 56 | surface pressures upstream of the base at M 0.8: basic model, splitter plate, step (F4; 10.7 (l)) | read once; second to arrange |
| `tn3548_fig6_first.csv`, `method_tn3548_fig6.md` | NACA TN 3548 (NTRS 19930084307), fig. 6, PDF p. 17 | the slab wing's base pressure, two slits, free flight, M 0.62 to 1.61, 76 symbols (F4; 10.7 (k)) | read once; second to arrange |
| `rm3348_fig30a_first.csv`, `rm3348_fig30b_first.csv`, `method_rm3348_fig30.md` | ARC R&M 3348 (AERADE 1826.2/3929), fig. 30 (a) and (b), PDF p. 68 | base pressure of the swept single-wedge wings against M_0 (50 symbols) and M_0 cos(phi) (48, with Goin's 8) (F4; 10.7 (k)) | read once; round 10's blind reading to pair |
| `rm3348_fig31b_first.csv`, `method_rm3348_fig31b_32.md` | ARC R&M 3348 (AERADE 1826.2/3929), fig. 31(b), PDF p. 69 | the single-wedge forebody's reduced chordwise force against M_0 cos(phi), 36 symbols (F3, F2's check; 10.7 (k)) | read once; round 10's blind reading to pair |
| `rm3348_fig32_first.csv`, `method_rm3348_fig31b_32.md` | ARC R&M 3348 (AERADE 1826.2/3929), fig. 32, PDF p. 70 | the 0 deg single wedge in transonic similarity form, 9 circles (F3; 10.7 (k)); Knechtel's curve not read | read once; round 10's blind reading to pair |
| `cr149372_fig8a_first.csv`, `method_cr149372_fig8a.md` | NASA CR-149372 (NTRS 19770008057), fig. 8a, PDF p. 25 | the circular cylinder's Cp against theta at M 0.6 to 0.9, 95 symbols (a check of F2's ordering; 10.7 (k)) | read once; round 10's blind reading to pair |
| `rm3348_figs47_52_te_first.csv`, `method_rm3348_figs47_52.md` | ARC R&M 3348 (AERADE 1826.2/3929), figs. 47 to 52, PDF pp. 81 to 86 | the envelope of p/H over x/c 0.975 to 0.990, 30 panels (M_0 0.70 to 1.16, phi 0 to 60 deg); per-curve values at x/c 0.995 not separable (10.7 (l)) | read once; a check that sets nothing (10.7 (r)), no second reading |
| `rma51j25_fig7_below15_first.csv`, `method_rma51j25_fig7.md` | NACA RM A51J25 (NTRS 20030067332), fig. 7, PDF p. 14 | p_b/p' below M' 1.5: the curve-and-PARD-symbols band at M' 1.20 to 1.50, and four open symbols (F4; 10.7 (k)) | read once; second to arrange |
| `rm3427_fig13_hole4_first.csv`, `method_rm3427_fig13_hole4.md` | ARC R&M 3427 (AERADE 1826.2/4011), fig. 13 lower panel, PDF p. 37 | hole 4 (x/h -0.167), surface pressure against M 0.4 to 1.05 (F4; 10.7 (m)) | read once; second to arrange |

**Pairings.**

- R&M 3348 tables 2(b) and 3: paired by the coordinator on 2026-10-22: 852
  of 852 values identical, table 2(b) 6 of 6. The second, blind typing is
  round 8's (`../round8/`, commit ffbac76); its reader did not open this
  typing. `tests/base/rm3348-table3-readings.test.ts` holds the two equal,
  value for value.

**Scripts** (`scripts/`; each reads the image or data passed to it and
writes only the outputs named, run with `python3 -I`):

- `lines.py`: grid-line centres inside a box (dark-pixel fraction).
- `gridtrace.py`: one grid line traced along its length, for skew and bow.
- `zoom.py`: a zoomed view with a pixel ruler, for placing centres by eye.
- `symfit.py`: symbol centres refined by an outline template (circle,
  square, triangle), with an overlay for checking by eye.
- `calib.py`: centres to plot values, interpolated locally between the
  traced grid lines.
- `ticks.py`: the ticks of an axis on a plot with no grid.
- `tickcal.py`: centres to plot values on such a plot, along the axes'
  own tilt, by a least-squares line through the ticks.

Fig. 13 of R&M 3427 is reproduced by `symfit.py` on
`rm3427_fig13_rough.csv`, then `calib.py` with `rm3427_fig13_grid.json`,
on the page rendered by `pdftoppm -r 300 -f 37 -l 37` and cropped at
(473, 1386), 1491 by 1258.
