# Round 4: second readings for 0008 step B1 (blunt trailing edges, rounded leading edges, Basic Finner trailing-edge area)

This round checks the first readings on the branch at 2b538da:

- `docs/design/0008-total-drag.md` sections 3.4 and 4.1;
- `docs/research/total-drag/data/blunt_te_2d_base.md` and `.csv`;
- `le_bluntness.md` and `.csv`;
- `blunt_te_2d.py`, its output, and the TN 2960 outputs.

Nothing in the repository was edited.

- **Readings:** `round4/readings/`. Calibration, method and error for every
  item are in `readings/method_round4.md`.
- **Comparison:** `scripts/compare_round4.py`, with its output in
  `readings/compare_round4_output.txt`.

Every second reading was made before the first reading was opened, with three
exceptions, each marked "not blind" in the files:

- the RM A51J25 fig. 7 symbols;
- the fig. 7 curve at M' 1.50 to 1.60, corrected after the comparison;
- the TN 2960 fig. 5(c) faired-curve check at 45 deg.

## 1. Agreement per item

| Item | Second-reading error | First minus second | Verdict |
| --- | --- | --- | --- |
| TR 1109 fig. 29(a), turbulent curves | +-0.004 (+-0.006 on gridlines) | M 1.5: 0.000 to +0.002. M 2.0: +0.001 to +0.003. M 3.1: +0.003 to +0.005 | Agree. At M 3.1 the first reads a small, uniform 0.003 to 0.005 high. That is 0.5% in P_B |
| TR 1109 fig. 29(b), laminar curves | +-0.004 | -0.002 to +0.004 at all common abscissae, 0.006 to 0.175 | Agree. The M 1.5 and 2.0 crossing near 0.016 to 0.022 is confirmed (one merged run at 0.016) |
| TR 1109 fig. 8, symbols | +-0.006 | Median -0.007 at M 1.5 and 3.1, -0.002 at M 2.0. Ranges: -0.018 to -0.001 at M 1.5, -0.024 to 0.000 at M 3.1 | Mostly within the combined error. The first reads about 0.007 low. One first-reading point (M 3.1, X 2.0, 0.275, below the curve) does not exist: the zoom shows a filled square at 0.291 and a circle at 0.300, both above the curve. It does not set a band end |
| TR 1109 fig. 8, faired curves | +-0.004 | M 1.5: -0.005 to +0.004. M 2.0: -0.008 to 0.000. M 3.1: -0.011 to -0.004 | The M 3.1 panel is read about 0.007 low throughout. The axis labels confirm the second calibration (filled circle at 0.421, not 0.410). The offset is common to symbols and curve, so the band hardly moves |
| RM A51J25 fig. 7, curve | +-0.004 clear, +-0.010 under symbols | -0.005 to +0.003 at M' 1.50 to 4.00 (base drag 0.995 to 1.009) | Agree. Below M' 1.50 the line is under the PARD circles: the first reading's 1.167, 1.295 and 1.40 values are not checkable |
| RM A51J25 fig. 7, symbols (not blind) | +-0.005 | Within 0.006, apart from abscissae. The diamond near M' 1.95 lies at 1.961, not 1.94, and the Ames square at 1.492, not 1.475 | The band ends move (section 2) |
| TN 3819 fig. 5 | Solid +-0.0015, dashed and Chapman +-0.003 | Solid: -0.0005 to +0.0005 at M 1.5, 2.0, 2.5 and 3.0. Line A: -0.0001 to +0.0014, but +0.005 at M 2.0. Line B: -0.0004 to +0.0005, but +0.004 at M 2.0 | Agree. The corrected solid value at M 1.5, -0.307, is confirmed (second -0.3075); -0.324 was a hatch tick. At M 2.0, A and B are merged in the second reading too |
| TN D-1056 table II | Typing | The full retype of 45 rows equals the first typing in all 23 rows used (the power-off rows without speed brakes) | Agree exactly. The orifice map is confirmed. The note says "19 points" at M 1.52 to 3.24; there are 18 |
| TN 2960 fig. 5(c), symbols | +-0.005 (+-0.010 overlapping) | Within 0.016, except at 45 deg (next row) and on the rear plateau (up to 0.027 at single angles). The first reading took faired curves and the second took symbols | Agree within the combined error, apart from 45 deg at M 1.98 |
| TN 2960 fig. 5(c), faired curve at 45 deg (not blind) | +-0.005 | M 1.98: first 0.918, second curve 0.884 (+0.034). M 2.90: +0.005. M 1.49: +0.002 | **One first-reading error** at M 1.98, 45 deg. It changes that Mach number's front ratio from 1.049 to 1.043. The band ends do not move |
| TN 2960 front-side integral | Under 0.01 | Front: 1.014 / 1.156 / 1.232 (first) against 1.019 / 1.153 / 1.228 (second). Over (2/3) Cp_pitot: 0.995 / 1.049 / 1.056 against 1.000 / 1.046 / 1.053 | Agree within 0.005 |
| TN 2960 fig. 7 | +-0.005 isolated, +-0.010 groups | M 2.9: 1.346 against 1.336 (component centre 1.332). M 2.0: the first takes one box centre, 1.424 at M 1.951. The second reads three diamonds at M 1.978: 1.482, 1.470 and 1.422 | The first is 0.010 high at M 2.9; the report's own text supports 1.333 to 1.34. Fig. 7 is used only as a check on the integration, which still holds within 2.5% (section 2) |

## 2. The bands recomputed from the second readings

| Band (0008 / data notes) | First | Second | Note |
| --- | --- | --- | --- |
| TR 1109 fig. 8, base drag over own curve | 0.969 to 1.082 | **0.953 to 1.072** | By M: 0.953 to 1.044 (M 1.5); 0.966 to 1.072 (2.0); 0.983 to 1.015 (3.1) |
| TR 1109 fig. 29(a) over fig. 8 (orifice position) | 0.933 to 1.010 | **0.946 to 1.011** | The low end is M 1.5 at X 4.5 in both |
| RM A51J25 fig. 7, 11 symbols at M' 1.45 to 3.2 | 0.961 to 1.067 | **0.939 to 1.057** | The low end is one Ames square at M' 1.49, where the curve is under the PARD band: 0.935 to 0.955 depending on the curve there. The high end is the diamond at 1.961 |
| X-15 fin, flat-sided (M' = M), M 1.52 to 3.24 | 0.934 to 1.201 | **0.936 to 1.204** | 0.936 to 1.041 below M 2.5; 1.093 to 1.204 above |
| X-15 fin, local conditions behind the 5 deg face | 1.27 to 1.72 | 1.27 to 1.45 | The second curve stops at M' 1.50, so the low-M' points that give the first reading's 1.72 are not recomputed |
| Together, on the term at M 1.5 to 3.2 (0008 section 3.4) | 0.93 to 1.20 (0.93 to 1.08 below M 2.5) | **0.94 to 1.20 (0.94 to 1.07 below M 2.5)** | **The adopted band 0.93 to 1.20 stands** and covers both readings |
| TN 3819 line A over the RM A51J25 curve (a reading check) | 0.987 to 1.018 | 0.992 to 1.024 | Passes |
| Love's solid estimate against line A | 8% to 13% less base drag | 10% to 12% less | Agree |
| Laminar over turbulent at the fins' c/h and Re (0008 section 3.4: -13% to +26%) | 0.87 / 1.26 / 0.94 at X_lam 0.010 | 0.878 / 1.265 / 0.945 at 0.010 | Agree at 0.010. But see finding 3 |
| TN 2960 front side over modified Newtonian (0008 section 4.1: 0.99 to 1.06) | 0.995 to 1.056 | **1.000 to 1.053** on (2/3) Cp_pitot; 1.008 to 1.052 on (2/3) P(0) as read | **Stands** |
| TN 2960 integrated total over fig. 7 | 0.985 to 1.001 | 0.981 / 0.975 / 0.996 against the mean of the diamonds | 0.996 at M 2.9. At M 1.5 and 2.0 the integral lies at the low edge of the symbol scatter (1.474 to 1.511; 1.422 to 1.482). The check holds to about 2.5% |

## 3. Findings

1. **The B1 band (0.93 to 1.20 on the term) is confirmed** by the second
   readings: 0.936 to 1.204. Below M 2.5 the range is 0.94 to 1.07, against
   the first reading's 0.93 to 1.08. No change is needed.

2. **The TN 2960 band (0.99 to 1.06) is confirmed**, at 1.00 to 1.05. One
   faired-curve value in `le_bluntness.md` is wrong: M 1.98 at 45 deg is
   0.884, not 0.918. The M 1.98 ratio becomes 1.043. The fig. 7 value at
   M 2.9 is 1.336, not 1.346.

3. **The laminar input band is evaluated at one abscissa only.**
   - 0008 section 3.4's -13% to +26% is the laminar/turbulent ratio at
     c/[h Re^(1/2)] = 0.010. The fins' own range, from the note's section G,
     is 0.0089 to 0.0115.
   - Over that range the second reading gives 0.846 to 0.878 at M 2.0,
     1.19 to 1.27 at M 1.5 (1.32 extrapolated to 0.0089, below where the
     M 1.5 laminar curve starts, near 0.0095) and 0.914 to 0.96 at M 3.1.
   - That is about **-15% to +29%**, or +32% extrapolated, not -13% to +26%.
     The widening comes from the abscissa range, not from reading error. The
     two readings agree within 0.004 at 0.010.

4. **Small first-reading errors that move no band end:**
   - TR 1109 fig. 8 panel (c) is read about 0.007 low, symbols and curve
     alike, and there is one nonexistent symbol at X 2.0, 0.275;
   - "19 points" for the X-15 should be 18;
   - the RM A51J25 fig. 7 abscissae of two symbols are read 0.02 low.

5. **Not checkable:** the RM A51J25 curve below M' 1.50, which is under the
   PARD circles. The first reading's 0.588, 0.545 and 0.517 at M' 1.17 to
   1.40 are the symbol band, not a separable line. That matters only for the
   X-15 "local conditions" use (the first reading's 1.72), which the note
   already rejects.

## 4. The Basic Finner's trailing-edge base area: 0.32 cal^2

**What the report shows.** Fig. 2 gives the fins only:

- in side view, as a chordwise wedge from a sharp leading edge
  (R 0.004 cal) to 0.08 cal at the base;
- in planform, as 1 cal by 1 cal rectangles.

No view shows a spanwise section. The text's "thickness of 0.08 cal at the
base" therefore leaves two readings:

- constant thickness along the span: 4 x 0.08 x 1.0 = **0.32 cal^2**, 41%
  of the body base;
- thickness tapering to zero at the tip: **0.16 cal^2**, 20%.

**Measured mass properties decide it.** The model is a steel body and steel
fins, a 10 deg cone of 2.84 cal, and a 1 cal by 10 cal body, with the nose
density solved so the mass is the measured 1.58 kg
(`scripts/te_area_massprops.py`, `readings/basic_finner_te_area.txt`):

| | Ix, kg cm^2 | Iy, kg cm^2 | CG, cal from nose | Nose density, g/cc |
| --- | --- | --- | --- | --- |
| Constant spanwise thickness (0.32 cal^2) | **1.911** | 98.33 | 5.528 | 17.6 (a tungsten alloy) |
| Tapered to zero at the tip (0.16 cal^2) | **1.706** | 97.32 | 5.447 | 18.5 |
| Measured: table I | 1.92 | 97.85 | 5.50 | |
| Measured: table II, 9 rounds | 1.91 to 1.93 | 97.7 to 98.2 | 5.50 to 5.54 | |

- **Iy does not decide it.** Both readings are within 0.6%.
- **Ix does.** The fins carry 0.33 kg cm^2 of Ix at constant thickness and
  0.11 tapered. The tapered reading is 11% below every measured round.
- **No plausible body rescues the tapered fins.**
  - With a weightless nose and all the remaining mass in a solid cylinder of
    any density, Ix is at most 1.873. That is below the lowest measured
    1.91, and that arrangement would also move the CG to about 6.4 cal.
  - Tungsten tapered fins give 1.856.
  - A brass body gives 1.750.
- **Only constant thickness fits.** With steel fins it matches Ix within
  0.01 and the CG within 0.03 cal. It needs only the usual dense nose insert.
- **A fin cross-check.** Aluminium fins of constant thickness would give
  1.713. The measured Ix also says the fins are steel-dense.

**Conclusion.**

- The trailing-edge base is **0.32 cal^2**: four edges, each 0.08 cal thick
  over the full 1 cal span.
- The 20% (0.16 cal^2) alternative in 0008 section 3.4 can be dropped.
- No drag value from the report was used.
- Refs. 3 to 5 (BRL Reports 934 and 799, BuOrd Ballistic Technical Note 5)
  are not in the local folders and were not reached.
