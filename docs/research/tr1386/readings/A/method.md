# Reader A: method for reading NACA TR 1386 figures

## Sources and rules followed

- Only two inputs were opened: `tr1386/reader-brief.txt` and `tr1386/NACA-TR-1386.pdf`. Nothing else in `tr1386/` (no crops, no thumbnails, never `tr1386/B/`) and nothing from the bowshock repository or any branch. No web search.
- The PDF was checked before work began and again after each of two container restarts: 18189447 bytes, SHA-256 `96b125ca12dda9df9acd5e372f8b4ef7589710f7034fee5c059ee718e7e4a25b`, which matches the brief.
- Part A and Part B were both read. Nothing was committed.

## Rendering

- `pdfimages -list` shows every page is one 300 dpi JPEG scan. I rendered all 21 pages with `pdftoppm -r 600 -gray` (exactly 2x the scan resolution). All pixel numbers in the CSV files, the notes and this file are pixels of these 600 dpi renders (`work/p600-NN.png`, NN = PDF page).
- To read text I viewed enlarged crops of the renders. The PDF's own OCR text layer is poor, so I used it only to find pages, never as a source for a quotation (one exception, flagged in the notes: a few right-column symbol definitions on p6, which I later checked on the image).

## Calibration

For every panel I calibrated on the printed grid, not just two ticks:

1. I found every grid line by taking darkness profiles across narrow strips of the panel. A grid line shows up as a narrow peak about 6 to 8 px wide.
2. I then tracked each line along its whole length every 20 to 40 px. At each step I took the darkness-weighted centre of the line within plus or minus 7 px of where it was expected. I fitted a straight line to those centres (x = c0 + c1*y for vertical lines, y = c0 + c1*x for horizontal lines), throwing out outliers where a curve or symbol crossed the line. The fit residuals are 0.5 to 1.1 px rms (median about 0.65 px).
3. A symbol's value is found by linear interpolation between the two fitted grid lines on either side of it, evaluated at the symbol's own position. This follows small skews and stretches in the scan, about 1 to 10 px across a panel.
4. Only labelled lines carry printed numbers. The lines between them were given values by counting grid divisions, and every labelled line I used is listed in `readerA_calibration.csv`, with its pixel position where it meets the panel edge. In every panel I checked each labelled line against the value the count gave, so each calibration rests on many labelled ticks far apart, not two.

Special cases and judgement calls in calibration:

- **Shifted scales (figures 4(a), 4(b), 7(a), 7(b)).** Each curve has its own column of labels to the left of the panel.
  - In figure 4(a) and 4(b), each column has its Mach number printed at its foot. For each column I matched the line labelled 0 to a grid line using the label's position. The zeros fall on the 11th, 12th and 13th horizontal lines counted from the top frame. In 4(a) that is y about 2368, 2543 and 2719 px for M=3.10, 1.97 and 1.50. In 4(b) it is y about 5172, 5345 and 5525 px for M=3.06, 1.97 and 1.54.
  - In figures 7(a) and 7(b), each column sits under a rotated "d/D=..." label. I checked the rows of labels against grid lines. Both panels have 0.05 per grid line. In 7(a) the zeros for d/D .50, .30, .15 and .075 are at y about 1527, 1650, 1774 and 1898 px. In 7(b) they are at y about 3395, 3607, 3823 and 4037 px. Each row in the CSV says which column it was read on.
- **Figure 4(a) has no x-axis label and no x tick numbers.** It has the same ten divisions as 4(b), so I assumed 0 to 1.0. All 4(a) rows carry flag AXIS, and the calibration rows say "value assumed".
- **Grid lines hidden behind model sketches.**
  - In 4(a), one line (P=1.0 on the M=3.10 scale) is almost entirely covered by the sketch, so I left it out. The points around it are interpolated across two divisions.
  - In 4(b), two lines were left out for the same reason.
  - In 4(c), the P=1.4, 1.2 and 1.0 lines step by about 5 px where they pass behind the sketch. I fitted them only over x 3320 to 3700, where the nose points are.
  - In figure 5, the C_DW=0.4 line is broken by the key, so I left it out.
  - In figure 8, the M=1.96 panel's 0.1 line is hidden by the key on the left. I fitted it on its visible right part and fixed its slope to that of its neighbours.

## Reading symbols

- For each symbol shape I drew a matching outline template: circle, square, diamond, triangles and the D shapes. I sized each one to a clean example on the same page (circles and squares about 28 to 30 px, diamonds 40 to 42 px, triangles about 23 to 27 px).
- I found candidates by normalized cross-correlation. Each was then refined to the best match within plus or minus 5 to 12 px of a centre I gave by hand, with sub-pixel parabolic interpolation.
- Every point was checked by eye on enlarged crops, with the centre marked (overlay images in `work/crops/`). The low-scoring matches in figure 4 were inspected one by one. All sat on the visible symbol centre.
- Where the template could not be trusted, I placed the centre from the symbol's outline and did not use a template. This applied to:
  - triangles and right triangles (figures 7(a) and 16), which are small and sit on top of curves
  - symbols partly hidden by another symbol (figure 8 squares under circles, figure 5 square under circle)
  - clusters of touching symbols (figure 7(b))

  For these I printed the darkness values as a character map, found the edges of the outline, and took the middle of its bounding box. For partly hidden squares I used the visible edges and the known symbol size. These rows say so in their note, and their uncertainty includes 3 to 6 px more.
- Doubled symbols (two copies drawn a few pixels apart) were transcribed as two points, each flagged OVERLAP. There are such pairs in figure 7(a) (three), figure 7(b) (one), figure 16 (one) and figure 8 (one possible).
- I flagged OVERLAP automatically wherever two symbol centres in the same panel are closer than about one symbol width (24 to 30 px), and named the neighbour in the note.
- **Uncertainty per value:** half a symbol width converted with the local grid scale, plus 3 to 6 px for overlapping or outline-placed symbols. This meets the brief's minimum and is much larger than my centre repeatability (about 1 px) and grid-fit residuals (about 0.7 px).

## Reading curves (figure 5 only)

- Part B asks for every plotted series of figure 5, so I read its two curves: solid "Estimated from experiment, ref. 16 and 17" and dashed "Empirical formula". They are marked source_kind=curve, flag CURVE, measured_or_estimate=estimate.
- At each station I took single-pixel columns and recorded the centre of each dark run that is not a grid line.
- I told the two lines apart by their gaps: the dashed line has gaps. At low Mach the dashed curve is above the solid one; at high Mach it is below.
- From about M=2.1 to 5.25 the two lines run together within one line width. There both get the same value, with flag OVERLAP and a larger uncertainty.
- Stations were taken at the ends of each curve, where the curves bend sharply near M=1 to 2, and at even steps elsewhere. I skipped the stretch near M=1.5 to 2 where symbols cover the curves.
- No other curve in any figure was transcribed.

## Assigning points to series, Mach and Reynolds number

- **Mach and Reynolds numbers.** Panel-printed values are used where printed. Where they are not printed on the panel, I took them from the text (figure 4: p8, "about 4x10^6"). Two cases need explanation:
  - Figure 7(a) and figure 16 print Reynolds numbers at the top with dashed leader lines down to Mach columns. I matched each leader to its column and took the nominal Mach from the p8 table. The x column holds the Mach as read from the axis.
  - In figure 7(b) the only Mach is the axis value, so mach = the x reading. The air-off Reynolds number is printed only as Re=0.8M x10^6, so that column is blank and the formula is given in the note.
- **Model numbers.** These are printed only in figures 5 and 16. Elsewhere the model column is blank, flagged OTHER, and the note gives the figure 1 model with that d/D.
- **Figure 8 at M=1.44.** The panel prints two Reynolds numbers but the report never says which symbol belongs to which. The Reynolds number is left blank and flagged SERIES.

## Text read for Part B and notes

I read pages 5 to 11, 13 to 15 and 19 as images, enough to find:

- how each quantity was obtained
- every statement of uncertainty
- the Reynolds number table
- the figure captions, keys and axis labels

The quotations in `readerA_notes.txt` were typed from those images, with PDF page numbers.

## Files

- `readerA_pressures.csv`, `readerA_drag.csv`, `readerA_geometry.csv`, `readerA_calibration.csv`, `readerA_notes.txt`, `method.md`.
- `scripts/`: the scripts used.
  - `digi.py`: templates and matching
  - `calib.py` and `panel.py`: grid fitting and conversion
  - `cfg_*.py`: per-panel settings and hand-given starting centres
  - `curve5.py`: the figure 5 curves
  - `build_outputs.py`: writes the CSV files
- `work/`: renders, crops, per-panel results (`res_*.json`), `quotes.txt` and `progress.txt`.
