# Audit, round 3: second readings for step B1 of 0008

Scope: second readings of two TN 3819 (NTRS 19930084517) figures for `docs/design/0008-total-drag.md` (status draft):

- **Fig. 35:** base pressure with 10%-thick circular-arc fins ending at the base.
- **Fig. 18:** the curve values that 0008 lists as read once.

Then the fins-on-base factor and band of 0008 section 3.4 are recomputed from my reading.

My readings were done and saved before I opened the first reading (`data/love_fig35_*`) and section 3.4. Method: `readings/method_round3.md`. Everything is under `drag-audit/round3/`.

## 0. Verdict

**The readings agree, and the fins-on-base band stands as computed.**

- **Fig. 35:** every value agrees with the first reading within the stated errors. The largest differences are 0.0008 on a symbol and 0.0003 on the free-flight curve, against errors of ±0.001 and ±0.002 to ±0.005.
- **Factor and band:** recomputed from my reading, they match 0008 section 3.4 within 0.015 at every Mach number (table in section 3).
- **Fig. 18:** the second reading agrees with the adopted values within 0.0004 at M 1.5, 1.935, 1.939, 2.0 and 3.0. At M 3.24 to 3.50 the three lines merge into one stroke; my bundle value differs from the adopted pair by at most 0.0013 (at M 3.24), inside ±0.0015.

Two limits on how independent these readings are:

1. **Fig. 35, M 1.75 to 2.35:** both readings identified the free-flight line the same way. In that range it runs 0.003 to 0.005 from estimate B, and neither reading can tell them apart from the scan alone. The first reading's ±0.005 there covers a swap.
2. **Fig. 18:** the round-1 values that 0008 adopted are mine. Round 3 is a second reading by the same reader with a different calibration and new column choices, not a different person.

Two points on the band's construction should be fixed in the text (section 4). They change its width by a few percent of the base term at most, and do not overturn it.

## 1. Fig. 35

### Calibration
- **Grid:** gridlines every 0.1 M and every 0.02 in P_B, each measured in two bands. The scan is sheared: the lines lean 14 to 16 px and fall 15 px. Interpolated as in round 1.
- **Check:** the figure's body-alone line reproduces the fig. 18 less negative curve within 0.001 at M 1.0 to 2.5. The first reading made the same check over M 1.85 to 2.95.

### Curve identity
The text and leaders fix which line is which (TN 3819 pp. 22 to 23):
- Estimates A and B start at M 1.5. The "Estimate B" leader ends on the steep line that starts at P_B -0.295; the "Estimate A" leader on the line that starts at -0.256.
- The free-flight line is the only one starting at M 1.0, and it "levels off at the lower Mach numbers".
- Estimate B ends near M 2.56.
- Where the lines separate (M 2.4 to 3.0), the free-flight line is the most negative with-fin line.

### Per-point agreement
| Item | First | Mine | Difference | Errors (first; mine) |
| --- | --- | --- | --- | --- |
| Circle, fins, M 1.50 | -0.325 | -0.3251 | 0.0001 | ±0.001; ±0.0006 |
| Circle, no fins, 1.50 | -0.194 | -0.1941 | 0.0001 | same |
| Square, fins, 2.00 | -0.208 | -0.2077 | 0.0003 | same |
| Square, no fins, 2.00 | -0.150 | -0.1500 | 0.0000 | same |
| Diamond, fins, 2.41 | -0.164 | -0.1648 | 0.0008 | same |
| Diamond, no fins, 2.41 | -0.120 | -0.1202 | 0.0002 | ±0.001; ±0.0009 |
| Free flight, 1.80 / 1.90 / 2.00 / 2.10 | -0.2362 / -0.2108 / -0.1905 / -0.1746 | -0.2361 / -0.2107 / -0.1903 / -0.1745 | ≤0.0002 | ±0.005; ±0.004 |
| Free flight, 2.20 / 2.30 / 2.40 | -0.1649 / -0.1587 / -0.1538 | -0.1652 / -0.1587 / -0.1539 | ≤0.0003 | ±0.002; ±0.004 (2.2, 2.3), ±0.002 |
| Free flight, 2.50 / 2.60 / 2.70 / 2.80 | -0.1490 / -0.1445 / -0.1401 / -0.1359 | -0.1490 / -0.1443 / -0.1399 / -0.1358 | ≤0.0002 | ±0.002; ±0.002 |
| Free flight, 2.97 / 3.00 (extrapolated) | -0.1288 / -0.1275 | -0.1290 / -0.1278 | 0.0002 / 0.0003 | first extrapolated from 2.7 to 2.8; mine traced to M 2.99 |
| Estimate A, 2.50 / 2.80 | -0.1402 / -0.1264 | -0.1403 / -0.1263 | 0.0001 | |
| Estimate B, 2.50 | -0.1353 | -0.1354 | 0.0001 | |

Tunnel factors from my symbol readings: 1.675 at M 1.50, 1.385 at 2.00 and 1.371 at 2.41. The first reading has 1.675, 1.387 and 1.367.

## 2. Fig. 18, the values 0008 lists as read once

### Calibration and method
- **Calibration:** a global bilinear least-squares fit to all gridline crossings, with rms residuals of 0.73 px in x and 0.31 px in y. This replaces round 1's piecewise interpolation.
- **Columns:** chosen clear of the symbols and gridlines that sit on the curves at these Mach numbers (the circle at M 1.503, the arch and D symbols at M 1.93 to 1.96, the ticked triangle at 3.24, the -0.08 gridline at 3.50), then interpolated to the target Mach number.

### Agreement
| M | More negative, round 3 / adopted | Less negative, round 3 / adopted | Error (round 3) |
| --- | --- | --- | --- |
| 1.500 | -0.1774 / -0.1775 | -0.1730 / -0.1733 | ±0.0012 |
| 1.935 | -0.1536 / -0.1539 | -0.1483 / -0.1486 | ±0.0012 |
| 1.939 | -0.1534 / -0.1536 | -0.1481 / -0.1484 | ±0.0012 |
| 2.000 | -0.1494 / -0.1496 | -0.1444 / -0.1447 | ±0.0008 |
| 3.000 | -0.0974 / -0.0978 | -0.0962 / -0.0964 | ±0.0012 (Gabeaud -0.1005 / -0.1002) |
| 3.243 | bundle -0.0898 to -0.0886 / -0.0885, -0.0881 | (same bundle) | ±0.0015 |
| 3.497 | bundle -0.0805 / -0.0803, -0.0803 | (same bundle) | ±0.0015 |

Effect on the base band's high end (1.078 in 0008): it comes from the first reading's symbol at M 3.24 (-0.095) over the less negative curve (-0.0881). Against the lower edge of my bundle (-0.0886) the ratio is 1.072. So "1.08" stands as rounded, or reads 1.07.

## 3. The factor and band of 0008 section 3.4, recomputed

`readings/fig35_factor_recomputed.txt`, from `scripts/factor35.py`. The definition and rule are 0008's:
- F = finned free-flight P_B over the fig. 18 less negative curve.
- Low end = half the increment, minus half the reading error.
- High end = the larger of the free-flight factor plus its error and the tunnel factor; the tunnel factor exists only up to M 2.41.

| M | F free flight (mine / 0008) | Band (mine) | Band (0008) |
| --- | --- | --- | --- |
| 1.8 | 1.505 / 1.505 | 1.240 to 1.530 | 1.237 to 1.537 |
| 2.0 | 1.315 / 1.317 | 1.144 to 1.386 | 1.141 to 1.387 |
| 2.4 | 1.257 / 1.257 | 1.121 to 1.371 | 1.120 to 1.367 |
| 2.6 | 1.284 / 1.284 | 1.133 to 1.302 | 1.133 to 1.302 |
| 2.97 | 1.324 / 1.320 | 1.147 to 1.355 | 1.150 to 1.341 |

The half-width is at most 11.0% of the midpoint (M 2.2), matching 0008's "at most ±11%". **The band stands.**

## 4. Points to fix in the text (none overturns the band)

**4.1 The high end drops at M 2.41.**
- **What happens:** the tunnel pairs stop at M 2.41, so the high end falls from 1.371 at M 2.4 to 1.288 at M 2.5.
- **Why it matters:** at all three tunnel Mach numbers the tunnel factor exceeds the free-flight factor (by about 0.14 at 1.5, 0.07 at 2.0, 0.11 at 2.41). TN 3819 p. 23 says so too.
- **Fix, one of:**
  - (a) Drop the tunnel from the high end. The Basic Finner flies free, and the tunnel excess is plausibly sting-related. The high end at M 1.8 to 2.4 then becomes 1.27 to 1.53.
  - (b) Carry the tunnel excess to M 3. The high end at M 2.5 to 3.0 then becomes about 1.36 to 1.47, and the half-width about ±12%.
- **Size:** either way, a few percent of the base term, about 1% of CX0.

**4.2 Reference curve.**
- **Problem:** F is defined against the less negative (Love) curve. Taken against the more negative (Chapman) curve it is 2% to 3.5% smaller (1.453 instead of 1.505 at M 1.8).
- **Fix:** B3 must apply F to the curve it was derived against, and should say so.

**4.3 Independence notes for the B1 record.**
- Fig. 35 at M 1.75 to 2.35: both readings made the same identification of the free-flight line, so record the ±0.005 there as covering an identity swap, not only reading scatter.
- Fig. 18: record that the second reading is by the same reader, with a different calibration and different columns.
- A reading by a third person would close both.

## 5. Files (all in `drag-audit/round3/`)

- `audit_round3.md`: this report.
- `readings/`:
  - `tn3819_fig35.csv`: symbols and curves.
  - `tn3819_fig18_round3.csv`.
  - `fig35_factor_recomputed.txt`.
  - `method_round3.md`.
- `scripts/`:
  - `grid35.py`, `scan35.py`, `dense35.py`, `dense35b.py`, `raw35.py`, `track35.py` (an automatic line tracker that did not work and was not used), `read_fig35.py`: the fig. 35 reading.
  - `fig18_affine.py`, `scan18b.py`: the fig. 18 reading.
  - `factor35.py`: the factor recomputation.
- `work/`: zoom images.
