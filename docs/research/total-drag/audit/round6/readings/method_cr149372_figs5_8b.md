# NASA CR-149372 figs. 5 and 8b: second reading, method

Macha, NASA CR-149372 (Texas A&M report 3318-76-01, 1976), NTRS
19770008057, the PDF from
`https://ntrs.nasa.gov/api/citations/19770008057/downloads/19770008057.pdf`
(39 pages; bilevel 300 ppi scans, strongly dithered). Fig. 5 is PDF p. 22
(printed page 21), fig. 8b PDF p. 26 (printed 25). Downloaded and read by
this reader alone; no other agent's files opened. Toolkit and error model as
in `method_tn3819_figs32-35.md`; specs `../scripts/specs/cr149372_fig*.json`.

## Fig. 8b: Cp against theta, M 1.0, 1.1, 1.2, 1.91 cm model

Axes: theta 0 to 180 deg (7 lines, 30 apart), Cp 1.6 to -1.2 (8 lines, 0.4
apart; two short line fragments at 1.0 and 0.9 ignored). Symbols (all with
centre dots: circles M 1.0, squares M 1.1, triangles M 1.2) by outline
template, kept only with a centre dot and an empty interior (template
threshold raised to 0.75 for the dithered scan; legend excluded): 27
circles, 30 squares, 13 triangles; a few triangles are missed. The faired
curves read by guided column reads at every 5 deg from 0 to 100 (the 90 deg
column is left out: the axis label "90" sits on the Cp = 0 line there).
Errors 0.0008 in Cp for symbols, 0.002 to 0.004 for the curves (dithered
ink), plus the x calibration through the slope (in `how`).

## Fig. 5: Cp against theta, M 1.0, four model diameters

Axes: theta 0 to 180 (lines 30 apart; the 120 line is missing in this
hand-drafted panel and is interpolated across), Cp lines at 0.4, 0, -0.4,
-0.8. The -1.2 label has no gridline beside it: the bottom frame lies at
about -1.30. Values below -0.8 are extrapolated on the uniform 0.4-per-590
px spacing of the lines above (the -1.2 label's centre sits at the
extrapolated -1.2 position, within 2 px), so they carry the -0.4 to -0.8
interval's scale.

Symbols: the legend's four (1.91 cm open circle, 2.54 cm square, 3.81 cm
circle, 5.08 cm triangle). In the scan the 3.81 cm circles are visibly
larger than the 1.91 cm ones and no centre dots survive the dithering, so
the templates are a small circle (r 22 px), a large circle (r 29), a square
and a triangle. Shape naming is not reliable on this scan. Above theta 88
each symbol is named by the plateau curve it lies on (`scripts/assign.py`:
triangles at Cp about -0.66, large circles -0.77, squares -1.07, small
circles -1.14, identified by eye on a full-resolution crop); a few
detections on the -0.8 gridline (Cp -0.785 to -0.796) fall more than 15 px
from every plateau and are dropped. Below theta 88 the four curves run on
top of one another and the symbols keep their template names, marked
uncertain. The faired curves were not read (they coincide below 88 deg).

Not read: nothing out of reach. Fig. 5's curves.
