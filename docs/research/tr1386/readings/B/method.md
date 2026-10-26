# Reader B method, NACA Report 1386 figure reading

Reader B worked only from the brief and the PDF. The PDF hash was checked first (SHA-256
96b125ca12dda9df9acd5e372f8b4ef7589710f7034fee5c059ee718e7e4a25b, 18189447 bytes, matches the brief).
Page numbers are PDF pages. All scripts are in `B/scripts/`, intermediate results in `B/calib/` and
`B/digit/`, check images in `B/view/`.

## 1. Rendering

- The PDF holds one 300 ppi JPEG scan per page. Each page was rendered at 400 dpi with `pdftoppm`
  (about 3670 x 4730 px per page). Every pixel coordinate in my files refers to these 400 dpi renders.
- Text was read from the page images (crops at 0.5 to 0.55 scale of the 400 dpi render). The OCR text
  layer in the PDF is poor and was used only to find where things are, never as a quotation source.

## 2. Axis calibration

1. **Grid lines.** For each panel, `gridfind.py` projects dark pixels (grey below 190 or 200) onto rows
   and columns inside narrow bands and lists lines whose dark fraction is high. This gives the pixel
   position of every printed grid line.
2. **Labelled lines only.** I matched each grid line to its printed tick label by looking at the label
   column. Only labelled lines enter the fit (for example 0, .2, .4, .6, .8, 1.0 on figure 4 x; 0, .1, .2
   on each figure 8 panel; 1.0 to 3.8 on figure 16 x; .12 to 0 on figure 16 y).
3. **Two or three bands per line.** `calib.py` measures each labelled line at two (figure 16: three)
   places far apart along its length, as the darkness-weighted centre of the line, row by row (or column
   by column), and takes the median. Bands that cross text or symbols and give fewer than 20 samples are
   dropped automatically (the dropped ones are printed in the log).
4. **Fit.** Per panel and per axis, a least-squares affine fit `value = a*px + b*py + c`. The `b` term
   (for x) or `a` term (for y) absorbs the small rotation of the scan. Every axis has at least three
   labelled lines, measured at two places, so at least six points; the residuals are the check. Fit
   results are in `B/calib/fit_*.json`, the points in `readerB_calibration.csv` (with residuals in
   `B/calib/pts_*.csv`).
5. **Shifted scales.** Figures 4(a), 4(b), 7(a) and 7(b) put each curve on its own y scale printed in its
   own label column. I built one y fit per scale from that column's labels, read each series against its
   own fit, and say in the note which scale was used and how its zero is marked.

Calibration quality (rms of residuals, in axis units; largest residual in brackets):

| Figure | x axis | y axis |
|---|---|---|
| 4(a) | 0.0011 (0.0023), labels taken from 4(b) | 0.0022 to 0.0032 (0.0049) per M scale |
| 4(b) | 0.0016 (0.0027) | 0.0020 to 0.0030 (0.0057) per M scale |
| 4(c) | 0.0009 (0.0016) | 0.0019 (0.0037) |
| 5 | 0.0032 (0.0066) | 0.0011 (0.0018) |
| 7(a) | 0.0018 (0.0034) | 0.0001 to 0.0004 (0.0006) per d/D scale |
| 7(b) | 0.0083 (0.0215) | 0.0004 to 0.0007 (0.0012) per d/D scale |
| 8 | 0.0003 to 0.0008 (0.0012) per panel | 0.0002 to 0.0005 (0.0008) per panel |
| 10 | 0.0003 (0.0006) per panel | 0.0002 (0.0004) per panel |
| 16 | 0.0015 (0.0030) | 0.0002 (0.0005) |

The 7(b) x grid is hand drawn with slightly uneven spacing; its larger rms is carried into the x
uncertainty of every 7(b) point.

## 3. Symbol centres

1. **Rough picks.** I picked each symbol by eye on zoomed crops (2x to 10x, with a pixel grid), or took
   candidates from `detect.py`, which scores every pixel with an FFT template and keeps local maxima.
   Every candidate was looked at; text, key symbols and curve junctions were thrown out by eye.
2. **Template fit.** `symfit.py` fits a hollow outline of the right shape (circle, square, diamond,
   triangle, right triangle, D shape, quarter-rounded square, octagon) by maximising "mean darkness on
   the outline band minus mean darkness inside", over centre (search window of a few px) and size, then
   refines at half-pixel steps. For triangles the centre is the centroid of the outline.
3. **Overlapping symbols.** Where outlines touch or cross, I fitted the symbols together:
   `pairfit.py` (two symbols, one drawn over the other, both stacking orders tried) and `multifit.py`
   (a cluster, outlines treated as a transparent union, coordinate-wise search). `multifit.py` also
   reports how much of each outline is not shared with a neighbour; a symbol with little own outline is
   weak evidence and is flagged as such. A single symbol and a pair were both tried where an outline
   looked doubled; I kept the pair only when it clearly scored better, and give the other reading as
   the alternative.
4. **Visual check.** Every fitted outline was drawn back on the page (`symfit.overlay`, `checkplot.py`)
   and checked by eye. Wrong fits (for example a fit pulled onto a curve) were corrected by hand and the
   correction is recorded in `scripts/assemble.py`.
5. **Conversion.** `assemble.py` maps each centre through the panel's fits and writes the CSV files.
   The pixel centre of each point is kept in its note so anyone can re-check it.

## 4. Reading uncertainty

For each point: `unc = sqrt( (slope * h)^2 + rms^2 )`, where `slope` is the axis scale per pixel, `h`
is half the symbol's extent along that axis (for example 8 to 9 px for a circle or square, 11 to 12 px
for a diamond), and `rms` is the calibration rms. That is half a symbol width plus the calibration
error. For overlapping symbols `h` is multiplied by 1.5 or 2. The centre fit itself repeats to about
1 px, much less than this, so the stated uncertainty is deliberately the conservative one the brief
asks for.

## 5. Curves (figure 5 only)

Figure 5 has two lines with no symbols. `trace5b.py` scans single pixel columns (3 columns averaged),
finds dark local minima of the grey level (curve ink is much darker than grid lines), and takes the
sub-pixel centre. I read at even column steps and at changes of slope, avoided columns that lie on
vertical grid lines, and marked readings where the line crosses a horizontal grid line. Dashes have gaps,
so the dashed line has fewer readings. The dashed line was told from the solid one by its gaps on zoomed
crops: at low M the dashed line is the upper one, from about M=2.2 to 5 the two coincide, above about
M=5.2 the solid line is the upper one. Uncertainty: about 3 px (5 px where the lines coincide) in y plus
calibration rms; 2 px in x plus calibration rms.

## 6. Judgement calls

- **Figure 4(a) x axis.** Panel (a) prints no x labels. Its grid has the same spacing and position as
  panel (b), whose labels are 0 to 1.0, so I used them; every 4(a) point carries AXIS.
- **Figure 4(c) M=3.80.** 14 points; no symbol found at the second station. Not filled in.
- **Mach and Reynolds numbers.** Taken as printed on the panel or key. Figure 4 Re is not printed; the
  text p. 8 value (about 4x10^6) is used. Figures 7(a) and 16 do not print Mach numbers per point; the
  nominal test Mach numbers of the p. 8 table are used, and the x value read is in the x column. Figure
  7(b) has no per-point Mach numbers; the x read is used as the Mach value.
- **Figure 8, M=1.44.** Flagged symbols mean Re=1.17x10^6 (key). Where I could not tell which of two
  touching circles carries the flag tick, Re is left blank with SERIES.
- **Model numbers.** Figures 7, 8 and 10 print bluntness, not model numbers, so the model column is blank
  and the note gives the figure 1 model numbers for that d/D.
- **Figure 16 key symbols.** Each symbol shape was checked at 9x zoom on the key (open circle, square,
  diamond, right-pointing triangle, right triangle, quarter-rounded square, D, octagon for models 1 to 9).
  The model 7, 8, 9 readings agree with figure 10 within about 0.002, which supports the identification
  against the similar open symbols of models 10 and 11.
- **Figure 16 model 2 at M=1.44.** Not found; not filled in.
- **Doubled outlines.** Several symbols in figures 7 and 8 look like two nearly coincident symbols; I give
  two rows with OVERLAP and state the one-symbol alternative in the note.
- **Figure 5 curves** were read although they are estimates, because Part B asks for every plotted series
  of figure 5; they are marked estimate, CURVE and NOSOURCE.
- No value was smoothed, averaged, rounded to a nicer number or corrected.
