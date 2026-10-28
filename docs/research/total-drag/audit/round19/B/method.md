# NACA TR 1051, figure 23(b): blind reading, reader B

## 1. Source and checks

- PDF: `f23b-readers/pdf/tr1051.pdf`, copied to this folder as `tr1051.pdf`.
  SHA-256 computed: `7f1ef2febdb72a404ea698b0c77d91246cf03302fd4b7ef2f125040929f5b6d4`
  (matches the brief; also in `sha256.txt`). The brief's own SHA-256 was checked and matched.
- 25 pages, scanned (Adobe Paper Capture), each page one embedded RGB JPEG at 300 ppi.
- Figure 23 is on PDF page 21. That page carries printed page number 1205 (top right, under a
  yellowed patch; PDF pages 20 and 22 read 1204 and 1206) and a handwritten "-19-" at the foot.
  Panel (a) is at upper left, panel (b) at lower left of that page. Throughout, PDF page n
  corresponds to printed page 1184 + n.
- Nothing outside this folder and the `pdf` folder was opened. No other source was consulted.

## 2. Rendering and resolution

- Measurement image: the page's embedded JPEG extracted unchanged with `pdfimages -j`
  (2544 x 3292 px, 300 ppi). All pixel coordinates below are in this native image.
- Scale in panel (b): about 200 px per 0.2 of d/h (1 px = 0.0010 in d/h) and about 195 px per
  0.08 of P_b (1 px = 0.00041 in P_b).
- Cross-check render: `pdftoppm -r 600` of page 21 (5092 x 6592 px). Gridline fitting and the
  circle and square centring were repeated independently on it. Every converted value agreed with
  the native result to 4 decimals. This only shows the pipeline does not depend on resolution; the
  600 dpi render holds no extra information, since it resamples the same 300 ppi JPEG.
- Visual inspection: crops upsampled 3x (Lanczos), 8x to 16x (nearest neighbour, with a 5 px
  guide grid) and 14x (bicubic).
- Tools: poppler (`pdfimages`, `pdftoppm`, `pdftotext`), Python 3 with Pillow, NumPy and SciPy.
  PyMuPDF was not installed and was not needed. Scripts are in `scripts/`, images in `img/`.

## 3. Axis calibration

Labelled gridlines used: all six vertical lines (d/h = 0, .2, .4, .6, .8, 1.0; 0 and 1.0 are the
frame) and all five horizontal lines (P_b = 0, -.08, -.16, -.24, -.32; 0 and -.32 are the frame).
The labels are printed "0", ".2", ".4", ".6", ".8", "1.0" on the abscissa and "-.32", "-.24",
"-.16", "-.08", "0" on the ordinate. A single "0" at the lower left corner serves both axes.

Method (pixel scan): each gridline was tracked row by row (vertical lines) or column by column
(horizontal lines), taking the darkness-weighted centroid within +/-5 px. A straight line was then
fitted with iterative 2.5-sigma rejection, which removes points where curves, symbols or lettering
cross. Fits (native px):

| line | fit | scatter (px) |
|---|---|---|
| d/h = 0.0 | x = 241.50 - 0.01034 y | 0.14 |
| d/h = 0.2 | x = 445.59 - 0.01095 y | 0.17 |
| d/h = 0.4 | x = 651.11 - 0.01367 y | 0.30 |
| d/h = 0.6 | x = 847.78 - 0.01281 y | 0.24 |
| d/h = 0.8 | x = 1050.43 - 0.01350 y | 0.79 |
| d/h = 1.0 | x = 1252.18 - 0.01507 y | 0.44 |
| P_b = -0.32 | y = 2144.99 + 0.00976 x | 0.27 |
| P_b = -0.24 | y = 2342.10 + 0.00946 x | 0.22 |
| P_b = -0.16 | y = 2536.33 + 0.01020 x | 0.27 |
| P_b = -0.08 | y = 2731.22 + 0.00966 x | 0.36 |
| P_b = 0 | y = 2925.77 + 0.00979 x | 0.64 |

The scan is rotated by about 0.56 degrees: verticals lean left going down and horizontals fall to
the right. The 30 gridline intersections were fitted with one global affine map. Its residuals are
at most 0.0024 in d/h (rms 0.0011) and at most 0.0004 in P_b (rms 0.0003). Most of the d/h
residual is real unevenness of the printed grid spacing (199 to 203 px per 0.2).

Conversion actually used: local interpolation between the two bracketing gridlines. d/h is
interpolated between the neighbouring vertical lines evaluated at the symbol's row, and P_b
between the neighbouring horizontal lines evaluated at the symbol's column. This honours local
grid irregularities. The global affine map was used as a check: it agrees with the local values
within 0.0010 in d/h and 0.0003 in P_b for 14 symbols, and within 0.0018 in d/h for the symbol at
the lower right frame corner.

By-eye check: a fine overlay grid (every 0.02 in d/h, every 0.01 in P_b) was drawn from the
calibration onto the native image and viewed at 3x to 6x. All 15 symbols read by eye agreed with
the pixel results to about 0.002 in d/h and 0.001 in P_b.

## 4. Symbols found

The whole plotting area was scanned in overlapping tiles at 3x, including the empty upper part,
the lower left region and the legend area. There are 15 plotted data symbols: 7 circles,
4 triangles and 4 squares. No other marks in the field are data symbols; the specks visible are
scan dust. The three legend symbols are not data and were not read.

Mach assignment: the legend gives only symbol, model sketch, Re x 10^-6 and L/h, and does not name
Mach numbers. The Mach numbers come from the curve labels "M∞=1.5", "M∞=2.0" and "M∞=2.9".
Every circle lies on the M∞=1.5 fairing, every triangle on the M∞=2.0 fairing and every square on
the M∞=2.9 fairing. The exception is the circle at d/h = 1.0, where all three fairings end (see
flags).

Symbol ids used in this note (left to right; centres in native px):

| id | Mach | symbol | centre x | centre y | d/h | P_b |
|---|---|---|---|---|---|---|
| C1 | 1.5 | circle | 563.93 | 2512.27 | 0.347 | -0.1723 |
| C2 | 1.5 | circle | 712.83 | 2489.89 | 0.496 | -0.1821 |
| C3 | 1.5 | circle | 814.13 | 2455.14 | 0.598 | -0.1967 |
| C4 | 1.5 | circle | 914.63 | 2408.99 | 0.697 | -0.2161 |
| C5 | 1.5 | circle | 1015.15 | 2376.19 | 0.797 | -0.2300 |
| C6 | 1.5 | circle | 1114.73 | 2375.59 | 0.897 | -0.2306 |
| C7 | 1.5 (ambiguous) | circle | 1206.93 | 2920.37 | 0.999 | -0.0071 |
| T1 | 2.0 | triangle | 514.22 | 2595.31 | 0.298 | -0.1379 |
| T2 | 2.0 | triangle | 605.85 | 2593.08 | 0.390 | -0.1392 |
| T3 | 2.0 | triangle | 813.23 | 2556.05 | 0.598 | -0.1553 |
| T4 | 2.0 | triangle | 1113.57 | 2470.58 | 0.898 | -0.1916 |
| S1 | 2.9 | square | 511.63 | 2656.71 | 0.296 | -0.1127 |
| S2 | 2.9 | square | 612.33 | 2650.28 | 0.397 | -0.1157 |
| S3 | 2.9 | square | 813.12 | 2622.45 | 0.599 | -0.1280 |
| S4 | 2.9 | square | 1113.88 | 2589.34 | 0.900 | -0.1429 |

Counts: M∞=1.5: 7 (6 unambiguous plus C7); M∞=2.0: 4; M∞=2.9: 4.

## 5. How symbol centres were found

All symbols are open; their interiors are clean white, and the fairings and gridlines stop at or
merely touch the outline. The exceptions are T1, where the fairing crosses the upper part of the
triangle, and T2, where the fairing covers the apex.

- Circles: 72 rays were cast from the hole; the inner edge of the ring (half-level 130 of 255) was
  found with sub-pixel interpolation, and a least-squares circle was fitted with outlier rejection
  and four iterations. Inner radius 4.6 to 4.9 px; fit scatter 0.09 to 0.20 px. Lines outside the
  ring do not affect the inner edge.
- Squares: the inner edges were found the same way, left/right along 11 rows and top/bottom along
  11 columns about the centre, and the centre was taken as the midpoint of the medians. Inner size
  9.5 to 10 px (S1: 9.8 x 8.8).
- Triangles: the stroke is thick relative to the symbol, and lines cross several of them, so the
  inner hole is unreliable. The outer silhouette was used instead:
  - x is the mean of the left/right side-stroke midpoints on clean rows, together with the apex
    column where visible;
  - y is the centroid, (2 x base-bottom + apex-top)/3 - w/6, with stroke width w = 2.5 px. Base
    bottom and apex top are half-level crossings along several columns.
  - The apex is measurable on T1 and T4 (outer heights 13.18 and 13.34 px). On T2 it is hidden
    under the fairing, and on T3 it merges with the -.16 horizontal and 0.6 vertical gridlines.
    For T2 and T3 the apex was placed at base-bottom minus the mean height of T1 and T4
    (13.26 px).
  - Convention: the centroid (incentre) of the triangle is taken as the plotted point. Using the
    bounding-box centre instead would move every triangle up the page by about 2.2 px, that is
    about 0.0009 more negative in P_b.
- Every centre was overlaid as a crosshair on 12x crops and checked by eye
  (`img/overlay_native.png`).

## 6. Errors (columns d_over_h_error, p_b_error)

These are one standard deviation of my reading error, estimated as the root-sum-square of:

- calibration: about 0.001 in d/h and 0.0003 in P_b (grid fit scatter, local versus affine
  differences);
- centring: 0.3 px for circles and squares, 0.5 to 1 px for triangles;
- for triangles, half of the centroid versus bounding-box convention shift (0.00045 in P_b).

Each total was then rounded up:

- circles and squares: 0.0015 in d/h, 0.0005 in P_b;
- T1 and T4: 0.0015 in d/h, 0.0008 in P_b;
- T3 (apex inferred): 0.0015 in d/h, 0.001 in P_b;
- T2 (apex inferred, right base corner merged with the 0.4 gridline): 0.002 in d/h, 0.001 in P_b;
- C7 (at the frame corner, where local and affine conversions differ by 0.0018): 0.002 in d/h,
  0.0005 in P_b.

These errors do not include any inaccuracy in how the original draftsman placed the symbols.

## 7. Quoted text (word for word)

Notation: the long dash printed after "FIGURE 23." is written here as "--", because this note
avoids the long-dash character. Italic and subscript formatting is not reproduced except as noted.

Figure title (PDF page 21, printed 1205, under panel (a)):
> FIGURE 23.--Effect of support diameter on base pressure.

Panel captions (PDF page 21):
> (a) Laminar.

> (b) Turbulent.
> FIGURE 23.--Concluded.

The caption under panel (b) is the two lines above.

Panel (b) axis labels:
- ordinate: "Base pressure coefficient, P_b" (subscript b; it is small but legible at 10x);
- abscissa: "Ratio of support diameter to base diameter, d/h".

Curve labels in panel (b): "M∞=1.5", "M∞=2.0", "M∞=2.9". Panel letter: "(b)".

Panel (b) legend, laid out as a table with headings "Re ×10⁻⁶" and "L/h" (printed "Re x10" with
superscript "-6"):

| symbol | model sketch | Re ×10⁻⁶ | L/h |
|---|---|---|---|
| ○ circle | long ogive-nosed cylinder | 4.0 | 7.0 |
| △ triangle | cone-cylinder (line at the shoulder) | 4.0 | 5.0 |
| □ square | cone-cylinder (line at the shoulder) | 7.5 | 5.0 |

No length ratio other than L/h is given in the legend, and no d/h or Mach number appears in it.
For comparison, panel (a)'s legend differs in its third row: □, a short ogive body, 5.0, 3.3.

Text that says what figure 23(b) shows (PDF page 21, printed 1205, left column):
> The corresponding results for turbulent boundary-layer flow are shown in figure 23 (b). At Mach
> numbers of 1.5 and 2.0 these data show the same trends as for laminar boundary-layer flow, but
> at a Mach number of 2.9 the trend is not the same. At Mach numbers near 3, and possibly higher,
> it appears that the relative importance of the two above-mentioned effects of increasing d/h
> depends on the condition of the boundary-layer flow.

The "laminar" trends it refers to (about figure 23(a)) start on PDF page 20 (printed 1204, right
column) and run onto page 21:
> The results of base-pressure measurements for various support diameters with laminar
> boundary-layer flow are shown in figure 23 (a). The data for a Mach number of 1.5 (reported by
> Perkins in reference 11) show the expected increase, and then eventual decrease in base drag as
> the support diameter is progressively increased. At a Mach number of 2.9 the data show a
> monotonic decrease in base drag as the support diameter is increased.

The "two above-mentioned effects" (PDF page 20, printed 1204, left column):
> For a fixed Mach and Reynolds number, an increase in the support diameter brings about two
> different effects. First, the wake thickness is increased, thereby making it possible for lower
> base pressures to exist. (See fig. 6.) A second effect resulting from an increase in support
> diameter is that the appropriate dimensionless boundary-layer thickness δ/(h-d) is increased,
> thereby tending to increase the base pressure. The two effects, therefore, oppose each other.

Support, PDF page 21 (printed 1205, right column):
> Unfortunately, an investigation of support interference for turbulent boundary-layer flow has not
> been made using a side support. Definite quantitative statements about the possible effects of
> support interference in the turbulent-flow data (figs. 14, 15, 18, 19, and 20) cannot be made at
> present.

Support, same page, about the laminar data and the standard sting (context for d/h = 0.4):
> At all the other Mach numbers, where special interference measurements were not made, the base
> pressure was measured with a constant value of 0.4 for the ratio d/h.

Support, PDF page 20 (printed 1204, Appendix B, left column):
> When a body of revolution is tested in a wind tunnel it is usually supported from the rear by a
> cylindrical rod.

> If, as is the case for the experiments referred to herein, the support length is much greater
> than the base diameter, then the only appreciable interference must arise from the "diameter
> effect" of the rod.

Same page, right column:
> Since support lengths of over 4 body diameters have been used in all subsequent tests, it is
> concluded that any interference in the wind-tunnel measurements of base pressure at M=2.0 and 2.9
> is not attributable to effects of support length.

Support, PDF page 11 (printed 1195, right column, running onto page 12):
> Most of these data have been obtained from wind-tunnel measurements on bodies of revolution
> mounted from the rear by a cylindrical support.

> It will suffice for the present purposes to state that the wind-tunnel measurements were taken
> with a support sting of sufficient unobstructed length so that no interference effect of support
> length is present in the data. Likewise, no appreciable interference resulting from the reflected
> bow wave is present in the data.

The second sentence of that last quote continues onto PDF page 12 ("reflected bow wave is present
in the data.").

PDF page 12 (printed 1196, left column):
> As regards the effects of support diameter, it is known from a relatively complete set of
> interference measurements made by Perkins (reference 11), part of which is presented later, that
> the data taken at M=1.5 are essentially free of support interference. At the higher Mach numbers,
> however, a complete set of support-diameter interference measurements was not made.
> Consequently, some effect may be present in the data taken at M=2.0 and M=2.9. For consistency,
> these data which may be affected to a small extent by support-diameter interference have been
> taken with a fixed value of 0.4 for the ratio of support diameter to base diameter.

> All bodies of revolution used in the present experiments consisted of either a cone-cylinder
> (10° semiangle of cone) or an ogive-cylinder (10-caliber ogival radius) combination.

Tripping, PDF page 12 (printed 1196, right column):
> The experiments representing the case of laminar boundary-layer flow were conducted on bodies of
> revolution with polished surfaces, and those representing turbulent flow were conducted on the
> same models with artificial roughness added in the form of a narrow transition strip. (See
> reference 12.) Although for simplicity the data are referred to simply as representing either
> laminar or turbulent flow, in a few cases the actual boundary layer may be in the transition
> state. It is to be noted that with smooth models transition (insofar as it affects base
> pressure) probably begins at Reynolds numbers of the order of 4 million. Likewise, with roughness
> added in order to obtain turbulent flow, the artificial roughness may not bring about complete
> transition ahead of the base at Reynolds numbers less than about 2 million.

I found no sentence that states the trip used specifically for the figure 23(b) models. The
transition-strip statement above is the report's general one.

## 8. Flags

- **C7, ambiguous** (d/h 0.999, P_b -0.0071). A single open circle sits on the d/h = 1.0 frame
  line just above the P_b = 0 frame line, and all three fairings (M∞ = 1.5, 2.0, 2.9) run down into
  it. Its shape is a circle, so by the legend it is the M∞ = 1.5 model's symbol, and that is the
  reading given. But it is equally the terminal point of the M∞ = 2.0 and 2.9 fairings, and may
  stand for all three Mach numbers. The alternatives column lists M∞ = 2.0 and M∞ = 2.9.
  - At 16x the ring is one clean circle with no triangle or square outline under or beside it, so
    it is not an overlap of several symbols.
  - Its centre is 1.2 px left of the frame line (d/h 0.9987, equal to 1.0 within error) and 17 px
    above the zero line (P_b -0.0071). It may have been drawn just above the axis to clear the
    frame, but it is read as plotted.
  - At d/h = 1.0 the support fills the base, so this may be a limiting value rather than a
    measurement. The figure does not say which.
- **C6, out-of-line** (M∞ = 1.5, d/h 0.897). The fairing passes below and to the left of the circle
  without entering its interior. Its perpendicular distance is about 6.5 px from the centre, and
  the fairing touches only the outer ring at lower left. At C6's d/h the fairing lies about 11 px
  lower, so the circle is about 0.005 more negative in P_b than the curve drawn through it.
- **T2, out-of-line** (M∞ = 2.0, d/h 0.390). The triangle hangs below the fairing: the fairing
  covers its apex and passes about 7.8 px above its centroid, so the symbol is about 0.0032 less
  negative than the curve. Its right base corner touches the d/h = 0.4 gridline, so its centre
  reads 0.390, not 0.40. The text says the standard sting was d/h = 0.4 for M = 2.0 and 2.9 data,
  and the neighbouring square S2 reads 0.397. Whether the draftsman offset the triangle to clear
  the gridline cannot be told from the figure; it is read as plotted.

Other symbols sit off their fairing by smaller amounts that I judged to be normal scatter, not
flagged. Perpendicular distance of the fairing centreline from the symbol centre (px; + means the
symbol is below the curve, that is less negative):

| id | offset (px) | approx. in P_b | remark |
|---|---|---|---|
| C1 | +0.1 | 0.0000 | |
| C2 | +2.1 | +0.0009 | |
| C3 | +1.4 | +0.0006 | |
| C4 | -4.8 | -0.0021 | circle above the fairing, which runs along its lower edge |
| C5 | +4.7 | +0.0021 | fairing runs through the upper part of the ring |
| T1 | +1.5 | +0.0006 | |
| T3 | +0.5 | +0.0002 | |
| T4 | -3.9 | -0.0017 | triangle sits on the fairing with its base |
| S1 | +1.0 | +0.0004 | |
| S2 | +5.3 | +0.0022 | fairing runs along the square's top edge |
| S3 | -3.9 | -0.0016 | |
| S4 | -2.5 | -0.0011 | |

No symbol was illegible. No two data symbols overlap each other, so no symbol carries the
`overlap` flag. Symbols that touch lines:
- C3, C5, T3 and S3 are crossed by the d/h = 0.6 or 0.8 gridline;
- S2 touches the 0.4 gridline, and T2's corner touches it;
- T3's apex touches the -.16 gridline.

These line contacts are handled in the centring and the errors.

## 9. Notes for later users

- Thinnest sting with a measured symbol: M∞ = 1.5 at d/h 0.347 (C1); M∞ = 2.0 at d/h 0.298 (T1);
  M∞ = 2.9 at d/h 0.296 (S1).
- Thickest sting with an unambiguous symbol: about 0.90 for all three (C6 0.897, T4 0.898,
  S4 0.900). The only symbol beyond is the shared circle C7 at d/h 1.0.
- The fairings extend to the left of the first symbols, and those extensions carry no data. They
  begin at about d/h 0.30 (M∞ = 1.5), 0.27 (M∞ = 2.0) and 0.25 (M∞ = 2.9).
- Between d/h 0.9 and 1.0 the fairings are drawn without any symbol except C7.
- Panel (b) has no d/h = 0 (side-support) point, consistent with the text's statement that no
  side-support investigation was made for turbulent flow.
- Sting stations: M∞ = 2.0 and 2.9 both have symbols near d/h 0.3, 0.4, 0.6 and 0.9. M∞ = 1.5
  has symbols near 0.35, 0.5, 0.6, 0.7, 0.8 and 0.9.
- Sign: P_b is negative throughout, as the axis labels give it.
- The legend's Re values are 4.0, 4.0 and 7.5 (x 10^6) and the L/h values 7.0, 5.0 and 5.0 for
  circle, triangle and square. These differ from panel (a)'s legend in the third row.
- Files: `f23b.csv` (one row per symbol, in the order of the table in section 4);
  `scripts/` holds the calibration (`fitgrid.py`), centring (`measure.py`, `run_native.py`),
  conversion (`convert.py`), fairing offsets (`fairing.py`) and the 600 dpi check
  (`r600_check.py`); `img/` holds the extracted page, zoom tiles and overlays.
