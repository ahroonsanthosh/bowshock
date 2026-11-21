# Reader B: method note for NACA RM L55H09, figure 6

## Source

- PDF: `l55h09.pdf`, copied from the brief's path into this folder. I computed its SHA-256 with `sha256sum`: `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b` (also in `sha256.txt`). It matches the brief.
- Figure 6 is on PDF page 21 of 29. The figure page has no printed page number. Text pages carry their printed number at the top, and that number is the PDF page minus 1.
- The page holds a single 1-bit CCITT scan at 300 dpi (`pdfimages -list`: 2544 x 2868 px). The scan is badly degraded. Many symbol outlines are broken, blotted or merged with gridlines.

## Quoted text, transcribed word for word from the page images (not from the OCR layer)

**Caption (PDF p. 21):** "Figure 6.- Zero-lift drag-coefficient variation with Mach number for a fin-stabilized body of revolution as obtained from measurements in a slotted wind tunnel and in free flight."

**Legend (PDF p. 21, top of figure):**
- "——-○ Wind tunnel, fins off 13 × 10^6 < R < 14.6 × 10^6". The first number is garbled in the scan and reads like "13" or "1.3"; given the 50-psia Reynolds numbers in the text it is most likely 13.
- "— — -□ Wind tunnel, fins on 6.8 × 10^6 < R < 7.6 × 10^6"
- "- - -◇ Free-flight, fins on 30 × 10^6 < R < 70 × 10^6 (refs. 1 and 2)". The legend symbol is very faint and reads as a diamond. The "30" and "R" are partly broken.
- "Flagged symbols: Fixed transition"
- "Solid symbols: Data with fins on at fins-off R"

**Axis labels (PDF p. 21):**
- Panel a (top): "Total drag coefficient, C_DT", against "Mach number, M".
- Panel b (middle): "Base drag coefficient, C_Db", against "Mach number, M".
- Panel c (bottom): "Net drag coefficient, C_D", against "Mach number, M".
- Comma placement in the y labels is not legible in the scan.
- Tick labels: x from .80 to 1.44, labelled every 0.08. Panels a and c run y from 0 to .28, labelled every 0.04. Panel b runs y from -.04 to .04, labelled every 0.04. Gridlines are every 0.02 on both axes in all panels.

**Text (printed p. 5 = PDF p. 6):** "Both the body of revolution and the airplane model were mounted to single-component internal strain-gage balances which were sting supported in the wind tunnel (figs. 1 and 3)." … "The base pressures for both models were measured by inserting an open end tube through the center of the sting into an open section of the balance."

**Text (printed p. 6 = PDF p. 7):**
- "this wind tunnel has indicated that the model drag forces are affected by the intersection of wall-reflected model disturbances with the model in the Mach number range between about 1.04 and 1.13. Therefore, no drag data are presented for this Mach number range."
- "In order to avoid the effect on drag due to a possible variation in location of the boundary-layer transition point, both of the models were tested with transition fixed by roughness strips. These strips were constructed by blowing 0.001- to 0.002-inch-diameter carborundum particles on a strip of wet shellac. For the body of revolution, a 1/4-inch-wide roughness band was placed around the model 1 inch behind the nose of the body. Tests were also made with this model smooth to determine the effect of roughness on the drag level of the body."
- "The major portion of the tests of the fin-body combination was run at a reduced stagnation pressure of 25 psia in an effort to avoid excessive fin loads and thereby insure retainment of the fins for the duration of the tests. After testing was completed at 25-psia stagnation pressure, some additional check test points were obtained at 50-psia stagnation pressure. This higher stagnation pressure afforded better accuracy and a higher ultimate test Mach number. All the tests of the body without fins were made at 50-psia stagnation pressure."
- "The Reynolds number variation was between about 0.67 × 10^6 and 0.75 × 10^6 per inch for the 25-psia stagnation-pressure tests and between about 1.3 × 10^6 and 1.4 × 10^6 per inch for the 50-psia stagnation-pressure tests. The corresponding Mach number ranges were between 0.74 and 1.32 for the 25-psia stagnation pressure and between 0.8 and 1.4 for the 50-psia stagnation pressure."
- "The drag data measured at Mach numbers greater than about 1.13 were corrected for buoyancy effects resulting from longitudinal gradients in test section Mach number."

**Text (printed p. 7 = PDF p. 8):**
- Error table: "C_D for - Body of revolution ±0.010"; "M_o ±0.01"; "C_Db for - Body of revolution ±0.005". The heading reads "estimated maximum overall error in the faired curves".
- "The drag data for the fin-stabilized body of revolution are presented in coefficient form in figure 6. Presented are total drag coefficient, base drag coefficient, and net drag coefficient as a function of the free-stream Mach number. The differences in drag coefficient due to placing the roughness band around the nose of the wind-tunnel model were small and generally within the scatter of test data."
- "For comparative purposes, the corresponding drag coefficients as obtained from free-flight tests (refs. 1 and 2) are also presented in figure 6. It should be pointed out that the free-flight base drag coefficients presented are not those actually measured on the present body shape. … Hence, the base pressure drag obtained from base pressures measured in free flight on another body having an identical afterbody and fin, and a different nose but with no apparent rocket propellant residue in the model (ref. 2) has been used in the present analysis. The difference in base drag measurements indicated in figure 6 between the wind-tunnel and free-flight tests is believed to be due primarily to the effect on the wind-tunnel results of the presence of the model support sting."

**Text (printed p. 8 = PDF p. 9):**
- "The Reynolds numbers for the free-flight tests, however, were much larger than for the wind-tunnel tests - 30 × 10^6 to 70 × 10^6 as compared with 6.8 × 10^6 to 7.6 × 10^6. Inasmuch as the flight Reynolds numbers were large enough to result in turbulent boundary-layer flow over the major part of the configuration and the transition strips insured turbulent flow over the wind-tunnel model, …"
- "Based on the previous comparison of base pressure drags (fig. 6), however, it would appear that the base pressure differences could be neglected for the present afterbody shape …"

## How I read the figure

1. **Render.** I used `pdftoppm -r 600 -gray`, which is an exact 2x upsampling of the native 300-dpi bilevel scan. All pixel coordinates below are at 600 dpi.
2. **Axis calibration: pixel scan, per panel, per gridline.**
   - For every one of the 33 vertical gridlines (M = 0.80 to 1.44 in steps of 0.02), I located the line centre in narrow row bands between all pairs of horizontal gridlines. I took the dark-pixel-weighted centroid, searching within ±14 px of the expected position.
   - I fitted each line as x = a + b·y, with a 3-sigma outlier rejection to drop symbol and curve hits.
   - I did the same for every horizontal gridline: 15 in panels a and c (0 to 0.28), 5 in panel b (-0.04 to 0.04).
   - Fit residuals are 1 to 3 px RMS. Spacing is about 82 px per 0.02 M and about 78 px per 0.02 in C_D.
   - The page is slightly skewed: the slope is about 0.003 for verticals and about -0.004 for horizontals in panel a. The fitted lines carry this skew.
   - To convert a point (x, y), I evaluate all vertical lines at that y and interpolate M piecewise-linearly between the two neighbouring lines. I do the same for C between the horizontal lines evaluated at that x. In effect every gridline is a calibration point, far more than the two required per axis.
   - I checked the labels: ".80" sits under the first vertical line, ".88" under the 5th, ".96" under the 9th, "1.04" under the 13th; ".28" sits at the top line and "0" at the bottom line (panels a, c); "0" sits on the middle line of panel b.
3. **Symbol centres: by eye.**
   - I read every symbol centre on crops at 3x to 6x zoom of the 600-dpi render. Each crop had pixel tick marks every 10 px overlaid in its margins.
   - For each symbol I estimated the bounding box of its outline (squares are about 41 px and diamonds about 45 to 50 px vertex to vertex) and took the box centre.
   - I cross-checked symbol identity and Mach number between panels a, b and c, since the same test point appears in all three at the same M. Panel c is the cleanest and helped interpret the cluttered panel a.
   - I then converted the centres with the calibration. Last, I re-plotted every value onto the image as a check overlay (not handed in), to confirm that each row lands on its symbol.
4. **Curves without symbols (rule 4).**
   - In panels b and c the free-flight data appear only as a dashed curve, with no diamonds.
   - The stations fall exactly on vertical gridlines, so I read the dashed line in dark-pixel column profiles 12 to 36 px either side of each station gridline. I took the line centre and interpolated linearly across the gridline; across a dash gap, I interpolated between the neighbouring dashes.
   - Stations are every 0.02 from 0.82 to 1.04 and from 1.14 to 1.40, plus the visible ends. These rows have kind `curve` and legend_symbol `none (curve)`.
5. **Errors.**
   - x_error and y_error are my 1-standard-deviation reading errors, in axis units, covering both centre-finding and calibration.
   - Clean, isolated symbol: 0.0012 (about 5 px).
   - Broken or partly hidden symbol: 0.002.
   - Ambiguous, overlapping or blotted symbol: 0.004.
   - Curve stations: 0.0005 in M and 0.001 to 0.003 in C, as given per row.
   - Calibration alone contributes under 0.0005.

## Counts (rows in fig6.csv)

| Panel | Wind tunnel, fins off (circles) | Wind tunnel, fins on (squares) | Free flight, fins on |
|---|---|---|---|
| a, total drag | 13 rows (12 read + 1 illegible) | 23 | 47 diamond rows (44 read + 3 illegible) |
| b, base drag | 11 | 16 | 19 curve stations (no symbols) |
| c, net drag | 14 rows (13 read + 1 illegible) | 26 | 28 curve stations (no symbols) |

There are 197 data rows. Many of them are flagged ambiguous, with alternatives such as "single square only" or "not a symbol". A later user who wants a conservative set should drop rows whose alternative says the symbol may not exist.

## What each flag means here

- **overlap**: two or more symbols touch or overlap. Examples:
  - Paired open squares near M 0.83.
  - Paired solid squares near M 0.81 and 1.37.
  - Stacked squares near M 0.90, 0.95 and 1.27.
  - Overlapping diamonds in panel a.
  - Square-and-circle clusters in panel b.

  I read each component separately. The alternative usually gives the single-symbol reading.
- **partly-hidden**: part of the outline coincides with a gridline or the frame, or a fairing passes through it. The centre was estimated from the visible part.
- **ambiguous**: the identity, count or kind is uncertain because the outline is broken or blotted. The alternatives column states the other readings. "Kind flagged" or "kind open" means I could not tell whether a short tick was a flag or a scan fragment.
- **out-of-line**: one free-flight diamond at about M 0.94 (C_DT about 0.125) sits about 0.007 below its neighbours. It reads clearly as a separate diamond, and I read it as plotted.
- **illegible**: values left empty.
  - Panel a, free flight: three groups of broken strokes near M 0.81, 0.84 and 0.86, at C_DT about 0.125 to 0.135. They may be broken diamonds or pieces of the dash-dot free-flight fairing.
  - Panel a and panel c, fins off: a tick at the top end of the steep fins-off fairing near M 1.025. In panel b a circle is visible at about that Mach number, so a symbol may be hidden there in a and c.
- **curve**: dashed free-flight curve stations in panels b and c.

## Things a later user should know

- **Panel a free flight.** The free-flight diamonds in panel a form a dense chain, overlapped by the dash-dot fairing. The count of diamonds is uncertain by several, especially in the M 0.84 to 0.92 range and around the steep rise near M 0.98 to 1.02.
- **Panel c free-flight curve, subsonic.** Below M about 0.97 the dashed curve is not separately visible. A thickened C_D = 0.14 gridline suggests it runs along that gridline. The rows at M 0.82 to 0.96 (C_D 0.140) are flagged partly-hidden and ambiguous, with the alternative that the curve may start only at about M 0.97.
- **Panel b free-flight curve.**
  - Visible dashes run from about M 0.99 (C_Db about -0.004) to about M 1.22 (about +0.004 to +0.005).
  - From M 1.24 to 1.40 the only candidate is a line merged with the top of the zero gridline, at about +0.002. Those rows are flagged ambiguous: this may be a wind-tunnel fairing, and the free-flight curve may end at about M 1.22.
  - The dashes beyond M 1.40 sit slightly below the zero line, at about -0.001. I did not read them, because they lie outside the station list.
- **Squares hidden in panel b.** Some fins-off circles visible in panels a and c are hidden in panel b behind solid squares (near M 1.37 and 1.41) and behind the M 0.81 solid squares. I gave no row for a symbol that cannot be seen at all.
- **Flagged versus open.** This distinction is the weakest attribute in this reading. Ticks are short and often indistinguishable from scan noise.
- **Unread mark in panel a.** There is an isolated blob at about M 1.006, C_DT about 0.115, at the lower end of the steep fins-off fairing segment. I did not count it as a symbol.
- **Legend range for fins off.** As stated above, the fins-off Reynolds-number range in the legend is garbled in the scan.
