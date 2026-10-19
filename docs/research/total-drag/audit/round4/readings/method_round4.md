# Round 4 second readings: calibration, method and reading error

All pages rendered at 300 dpi with pdftoppm from the copies in
`drag-research/pdfs/` (renders in `round4/work/`). Every value below was read
before the first reading was opened, except where marked "not blind".

## 1. NACA TR 1109 (NTRS 19930090968)

**Fig. 29, PDF p. 19** (`readings/tr1109_fig29.csv`)

- Calibration: gridlines found from darkness profiles in two bands and used
  as a sheared grid (`scripts/p29a.py`, `p29b.py`).
  - (a): X = c/[h Re^(1/5)] 0 to 5 every 0.5 (x 340 to 1281). p_b/p_inf 0 to
    1.0 every 0.2 (y 1243 to 775.5, with a 4 px tilt).
  - (b): X = c/[h Re^(1/2)] 0 to 0.20 every 0.02. Same ordinate grid
    (y 1900.5 to 1433).
  - About 94 px per grid step, so 1 px is 0.0021 in p_b/p_inf.
- Method: column scans (`scripts/colscan.py`) and a dense scan with
  assignment by order (`scripts/dense_lines.py`). Curve identity comes from
  the printed labels.
- Error: +-0.004, or +-0.006 where a curve lies on a gridline or crosses a
  label.

**Fig. 8, PDF p. 11** (`readings/tr1109_fig8_symbols.csv`)

- Calibration: a sheared grid for each panel (`scripts/read_fig8.py`).
  Panel (c)'s labels were checked on `work/v8cl.png`.
- Symbols: centres read on 4x to 8x zooms (`work/s8*.png`), with triangles
  at the centroid. Error +-0.02 in X and +-0.006 in p_b/p_inf.
- Faired curves: column scans (`scripts/p8a.py`, `p8b.py`, `p8c.py` with
  `colscan.py`), giving the values in `scripts/compare_round4.py` (C8).
  Error +-0.004.
- Two overlapping filled squares at M 2.0, X 2.25, were read as one.

## 2. NACA RM A51J25 fig. 7, PDF p. 14 (`readings/rm_a51j25_fig7.csv`)

- Calibration: axis ticks (`scripts/p7.py`).
  - M' 1, 2, 3, 4 at x 672, 942.5, 1217, 1490.5.
  - p_b/p' 1.0 to 0 at y 598.5, 732, 862.5, 994.5, 1126.5, 1256.5.
  - Piecewise linear. 1 px is 0.0015 in p_b/p'.
- Method: column scans (`scripts/scan7.py`) and 4x zooms.
- Error: +-0.004 where the line is clear, +-0.010 where it runs under
  symbols. Below M' 1.50 the line is under the PARD filled circles and was
  not read.
- **Correction, not blind.** M' 1.50 to 1.60 were re-read with a pixel trace
  (`work/fig7_trace.txt`) after the comparison. The blind values at 1.55 and
  1.60 had been read on the symbols, not on the line.
- **Symbols, not blind.** They were read after the first reading had been
  opened, on zooms `work/s7a.png` to `s7f.png`
  (`readings/rm_a51j25_fig7_symbols.csv`). Error +-0.005 in p_b/p'.

## 3. NACA TN 3819 fig. 5, PDF p. 36 (`readings/tn3819_fig5.csv`)

- Calibration: a sheared grid (`scripts/p5.py`).
  - 16 verticals, M 1.0 to 4.0 every 0.2.
  - 21 horizontals, P_B -0.80 to 0 every 0.04.
  - 1 px is 0.00038 in P_B.
- Method:
  - a dense scan every 2 px, skipping gridlines (`scripts/raw5.py`);
  - line following by linear prediction (`scripts/follow5.py`). The solid
    line gave 657 points, with a local-fit sd of 0.0001 to 0.0002;
  - line styles identified on 4x zooms carrying a P_B ruler
    (`work/z5_*.png`), with the legend from `work/v5leg.png`. The legend
    gives Chapman as long dash and short dash, ref. 25 as hatch strokes, the
    estimate from P_r as solid, and from P_r + 0.06 as dashed.
- Error:
  - solid +-0.0015;
  - dashed and Chapman +-0.003 above M 2.2. Below M 2.0 the two run within
    0.005 of each other and their order was not resolved.

## 4. NASA TN D-1056 table II, PDF p. 15 (`readings/tn-d-1056_table2.csv`)

- Method: retyped in full from the rotated page image (`work/x15h.png`), not
  from the OCR layer, with all 45 rows and every column.
- The orifice map is from fig. 5 (PDF p. 20): orifices 1, 2 and 3 are on the
  upper movable fin.
- Typing error: none expected beyond the table's own precision. The report
  gives Cp within +-0.02.

## 5. NACA TN 2960 (NTRS 19930084018)

**Fig. 5(c), PDF p. 20** (`readings/tn2960_fig5c.csv`,
`scripts/read_tn2960_fig5c.py`)

- Calibration:
  - theta from the vertical gridlines: 0 at x 552.5, 151.2 px per 20 deg;
  - P from the horizontal gridlines: 376 px per unit, 0 at y 1348.1.
  - 1 px is 0.0027 in P.
- Method: symbol centre dots, with flagged (-theta) twins averaged.
  - Front side: Simpson's rule on 15 deg steps, integral of P cos(theta) from
    0 to 90 deg, on the diameter. Trapezoid within 0.004.
  - Modified Newtonian: (2/3) Cp_pitot (Rayleigh), and also (2/3) P(0) as
    read.
- Error: +-0.005 in P for an isolated symbol, +-0.010 for overlapping ones.
- Faired curves at 45 deg were checked afterwards by column scans at 42.0 and
  48.6 deg (`scripts/compare_round4.py` section 6).

**Fig. 7, PDF p. 24** (`readings/tn2960_fig7.csv`)

- Calibration: rotated page (`work/f7r.png`). Cd gridlines every 0.2 (Cd 0
  at x 1856, 128 px per 0.2); Mach gridlines every 0.2 (M 0 at y 2447,
  128.2 px per 0.2).
- Method: symbol centres on 5x zooms, cross-checked with component centres
  (`scripts/blobs.py`).
- Error: +-0.005 in Cd for the isolated symbol at M 2.9, +-0.010 in the
  overlapping groups.

## 6. Basic Finner trailing-edge area (`scripts/te_area_massprops.py`, `readings/basic_finner_te_area.txt`)

- Sources: DREV TM 9703, fig. 2 (PDF p. 53, rendered `work/bf2-053.png`),
  table I (PDF p. 36) and table II (PDF p. 37). No drag value was used.
- Refs. 3 to 5 (BRL Report 934, BRL Report 799 and BuOrd Ballistic
  Technical Note 5) are not in the local folders and were not obtained.
- Method:
  - the body, the 10 deg cone and the four chordwise wedges (0.08 cal at the
    base) with a steel body and steel fins;
  - the nose density is solved so the mass is 1.58 kg;
  - Ix, Iy and the CG are computed for constant spanwise thickness
    (0.32 cal^2) and for linear spanwise taper to zero (0.16 cal^2);
  - an upper bound on Ix for the tapered reading, and density sensitivity.
