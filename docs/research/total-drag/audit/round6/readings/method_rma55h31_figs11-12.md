# RM A55H31 figs. 11 and 12: second reading, method

Goodwin, Creager and Winkler, NACA RM A55H31, NTRS 19930088843, the PDF
from `https://ntrs.nasa.gov/api/citations/19930088843/downloads/19930088843.pdf`
(46 pages, 300 ppi; the figure pages are landscape). Fig. 11 is PDF p. 40,
fig. 12 p. 41. Read blind. Toolkit and error model as in
`method_tn3819_figs32-35.md`; specs `../scripts/specs/rma55h31_fig1[12].json`.
Figs. 9 and 10 were not read (deprioritised by the coordinator).

Axes: yaw angle 0 to 90 deg (10 lines, 10 deg apart), and the ratio 0 to
1.0 (6 lines, 0.2 apart), every gridline used. Calibration residual of
the straight-line fit 0.1 deg (fig. 11) and 0.03 deg (fig. 12) in yaw.

Symbols (open, no centre dots): circles, present tests at M 3.9; squares,
ref. 1 at M 6.9. Each was located by eye and centred by outline-template
fit (search +-18 px, half-size +-4 px; the template centre is the
bounding-box centre). Symbols touching a curve or each other carry an
extra half stroke width ("touch"). Fig. 11 at yaw 0: one square on the
curve's start at 1.0; a circle there, if plotted, is hidden under it. The
curves of equations (10c) and (14) (theory) were not read.

Fig. 11: p(x=0)/p_t2 at yaw 0, 14.4, 30, 45, 60, 75 deg (squares) and 30, 45,
60 deg (circles). Fig. 12: C_Dp(yawed)/C_Dp(0), front side, at 14, 29.4,
44.9, 59.6, 75 deg (squares) and 29.9, 44.7, 59.8 deg (circles). The
ratio's reading error is 0.001 to 0.002.
