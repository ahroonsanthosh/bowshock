# W7's fin terms near Mach 1: first readings (design record 0019)

The figures and tables that set the bands of the fin terms near Mach 1
(0019 sections 3.2 to 3.5), each named band-setting by 0014 section 10.7
(k) before it was read. Each is read here once, by the 0019 reader, with
its source (NTRS id or AERADE handle, PDF page), its calibration and its
per-row errors; a blind second reading is arranged by the coordinator, and
no band is set until both are held and paired. Downloads are kept outside
the repository; only readings, methods and scripts are here.

| File                                                 | Source                                                       | What                                                                     | Status                       |
| ---------------------------------------------------- | ------------------------------------------------------------ | ------------------------------------------------------------------------ | ---------------------------- |
| `rm3348_table3_first.csv`, `method_rm3348_table3.md` | ARC R&M 3348 (AERADE 1826.2/3929), table 3, PDF pp. 32 to 38 | base pressure of the single-wedge wing, 852 values (F4, its sweep)       | read twice; paired (below)   |
| `rm3427_fig13_first.csv`, `method_rm3427_fig13.md`   | ARC R&M 3427 (AERADE 1826.2/4011), fig. 13, PDF p. 37        | base pressure of the 10% blunt section, holes 5 to 7, M 0.2 to 1.12 (F4) | read once; second to arrange |

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

Fig. 13 of R&M 3427 is reproduced by `symfit.py` on
`rm3427_fig13_rough.csv`, then `calib.py` with `rm3427_fig13_grid.json`,
on the page rendered by `pdftoppm -r 300 -f 37 -l 37` and cropped at
(473, 1386), 1491 by 1258.
