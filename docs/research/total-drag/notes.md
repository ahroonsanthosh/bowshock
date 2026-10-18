# Research log (scratch)

## RM A53D02 (NTRS 19930087740), fig 11 p33 of PDF (report p31)
Calibration (300 dpi render of PDF page 33): CD=0 at y=1671 px, 0.1 per 223.4 px (gridlines 1671,1450,1226.5,1003,778,554,331).
Mach gridlines x = 794.5 (1) ... 2815 (10): 224.5 px/M, M=0 at 570.
Points located by centre dot (3x3 min search), +-1 px => +-0.0005 CD, +-0.005 M.
fig M | CD     | Table I round M (pair by order)
1.038 | 0.5380 | 1.06
1.292 | 0.5139 | 1.32
1.430 | 0.4593 | 1.46?
1.452 | 0.4758 | 1.48?
1.506 | 0.4942 | 1.53?
1.561 | 0.4579 | 1.57/1.58
1.561 | 0.4461 | 1.57/1.58 (dot at 920.5,674.5 read from pixel dump; ring overlaps)
1.933 | 0.4472 | 1.95
2.098 | 0.4252 | 2.09
2.303 | 0.3908 | 2.30
2.552 | 0.3805 | 2.56
2.909 | 0.3236 | 2.91
3.296 | 0.2977 | 3.29
4.004 | 0.2408 | 3.99
Note: below M 2 digitised M is 0.02-0.03 below Table I M; above M 2 matches within 0.01.

## TN D-4014 (ARCAS M1.5-4.63), CA at alpha~0 (digitised, symbol bbox centre)
p25 fig5(a) cfg1 fins off: calib 0.4 at y=1304, 0.1 at 1724 => 1400 px/unit; alpha0 x=787, 36.1 px/deg
  M1.50 circle rows 1368-1387 -> 0.3475 (alpha +0.10)
  M1.80 square rows 1387-1407.5 -> 0.3334 (alpha +0.10)
  M2.30 diamond rows 1445-1471 -> 0.2900 (alpha 0.0)
  M2.96 triangle apex 1514.5 base 1535 -> 0.2424 bbox (centroid conv 0.2399) (alpha -0.3 and +0.9 same)
p28 fig5(b) cfg1 dF=0: calib 0.5 at y=1216, 0.2 at 1642.5 => 1421.7 px/unit; alpha0 x=914, 35.86 px/deg
  M1.50 circle rows 1155-1176 -> 0.5355 (alpha -0.28 and +0.86, same)
  M1.80 square rows ~1248-1267 -> 0.4707 (both squares, alpha -0.1, +1.1)
  M2.30 diamond rows 1371-1396.5 -> 0.382 (alpha -0.2)
  M2.96 triangle apex 1478.5 base 1498.5 -> 0.3083 bbox (centroid 0.306) (alpha -0.47, +0.70)
p34 fig6(a) cfg2 fins off: calib 0.4 at 1457.6, 0.1 at 1803 => 1151.3 px/unit; alpha0 x=938.7, 29.2 px/deg
  M1.80 squares: rows 1484-1500 (alpha -1.0) -> 0.3701; rows 1487-1502.5 (alpha +0.66) -> 0.3677
  M2.30 diamond rows 1533.5-1555.5 -> 0.3245 (alpha -0.06)
  M2.96 triangles apex 1600-1604, base 1615 -> 0.268-0.270 (apex hidden by grid stubs)
p37 fig6(b) cfg2 dF=0: calib 0.5 at 1331, 0.2 at 1669 => 1126.7 px/unit; alpha0 x=847.8, 29.1 px/deg
  M1.80 squares rows 1317.5-1333 -> 0.5051 (alpha -0.13); rows 1315-1330 -> 0.5075 (alpha +1.0)
  M2.30 diamonds rows 1421-1444.5 -> 0.4097 (alpha -0.17 and +0.9)
  M2.96 triangles apex 1510.5 base ~1524 -> 0.3347/0.3349 (alpha -0.4, +1.1)

## TN D-4013 (ARCAS M0.6-1.2), fig 11 (short, p62) and fig 12 (long, p63), faired curves, alpha~0, roll 0
fig11 calib: Mach gridlines every 0.05 M, 73.6 px; M1.0 x=1348, M1.2 x=1642.5 (labels checked).
  CA,corr ticks 0.05 per 72.3 px (1445.6 px/unit); page sheared: zero line 2086 at x=650, ~2079.2 at x=1350, ~2077.1 at x=1640.
  Using local zero: M1.003: dF=2 0.712, dF=0 0.685, fins off 0.421 (steep knee; 0.415-0.428 over M0.994-1.005)
                    M1.198: dF=2 0.613, dF=0 0.592, fins off 0.430
  (tick-based calibration gives +0.005: 0.690/0.716/0.425 and 0.598/0.619/0.436)
  CA,b (zero local ~2367 at x1350, ~2365.5 at x1640; 1445 px/unit): M1.0: dF0/dF2 ~0.015-0.018 (overlap), fins off -0.023
                    M1.2: dF2 0.0505, dF0 0.043, fins off 0.026
fig12 calib: M1.0 x=1290, M1.2 x=1571.5 (labels checked; 141 px per 0.1 M). CA,corr zero 1992.5, 1351.25 px/unit; CA,b zero 2263, 1348 px/unit.
  M1.003: dF2 0.744, dF0 0.728, fins off 0.372 ; CA,b 0.016 (dF2), 0.012 (dF0), -0.029 (fins off)
  M1.198: dF2 0.637, dF0 0.624, fins off 0.422 ; CA,b 0.032, 0.026, -0.043
Sting: 2.54 cm diameter, 29.21 cm long aft of base, then 19.2 deg half-angle flare (TN D-4013 p4). Trip No.120 carborundum 0.25 cm wide, 3.17 cm aft of nose, 1.27 cm aft of fin LE. Accuracy CA +-0.004, Cp,b +-0.01, M +-0.003.

## Love TN 3819 fig 18 (PDF p49, report p47): base pressure coefficient, cylindrical afterbodies, no fins, M0~Minf
Calib (300 dpi gray): Mach x = 397 + (M-1)*298.4 (0.2 M per 59.68 px; M5 gridline at 1590.5 checks).
P_B gridlines every 0.02 at 60.16 px; zero at y=1804.6 (gridline fit; frame line drawn at 1801-1803).
Check: dashed vacuum curve -2/(gM^2): M3.5 reads -0.1153..-0.1166 (exact -0.1166); M4.0 -0.0895..-0.0908 (exact -0.0893). => +-0.0015.
Data symbols (visual on ruler zoom, corrected, +-0.003):
 M1.52 -0.178 (circle, pixel centre row 1269), -0.152 (circle with tail, row ~1349)
 M1.63 -0.165, -0.152 ; M1.94 -0.150, -0.143 ; M2.00 -0.139 ; M2.42 -0.118, -0.115 ; M2.68 -0.102 ; M3.26 -0.095 ; M3.51 -0.083
Curves (Chapman compilation and Love basic curve, nearly coincident): M1.5 -0.173..-0.177; M2.0 -0.139..-0.145; M2.5 -0.116..-0.118; M3.0 -0.096..-0.101
Free-flight (Langley, R=30-35e6) near M1.0-1.2: about -0.19 to -0.20 (visual only).
Text: artificial transition raises base pressure 5-10% vs natural (p15, ref 23); tunnel base pressures with fins all lower than free flight (p23).
