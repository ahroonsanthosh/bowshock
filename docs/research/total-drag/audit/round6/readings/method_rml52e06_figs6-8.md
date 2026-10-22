# RM L52E06 figs. 6 to 8: second reading, method

Hart, NACA RM L52E06 (1952), NTRS 19930087048, the PDF from
`https://ntrs.nasa.gov/api/citations/19930087048/downloads/19930087048.pdf`
(20 pages, 300 ppi). Fig. 6 is the lower half of PDF p. 16, figs. 7 and 8
are p. 17. Only those two pages were rendered; pp. 18 to 20 (figs. 9 to 12,
held back) were not opened, nor the text about them. Read blind. Toolkit
and error model as in `method_tn3819_figs32-35.md`; specs in
`../scripts/specs/rml52e06_*.json`.

The curves here are faired lines without symbols, so they are read on the
curve at fixed Mach numbers, by tracking (fig. 6) or by guided column
reads (figs. 7, 8): a path drawn through each curve from column-run
listings only picks which ink run belongs to the curve; the reading is the
run's centre, fitted over 7 columns (or 18 columns either side of a
vertical gridline, avoiding it). Steep parts (M 0.95 to 1.03) carry the x
calibration through the slope in the error.

## Fig. 6: rim P_B with and without the rear-support sting (A, B)

Axes: M 0.60 to 1.40 (17 lines, 0.05 apart), P_B 0 to -0.32 (9 lines, 0.04
apart). Curve A (without sting, solid) M 0.70 to 1.28; curve B (with sting,
dashed) M 0.80 to 1.28 (it starts at about M 0.79). At M 1.12 to 1.3 the two
lie within 0.002 to 0.005 of each other: extra error 0.002. The leaders
cross A at M 0.87 and B at M 1.0 to 1.03; B is read in three segments around
the crossing.

## Fig. 7: rim and centre P_B, configurations A (no fins) and C (fins)

Axes: M 0.65 to 1.40 (16 lines), P_B 0 to -0.48 (13 lines, 0.04 apart; the
labels -0.32, -0.24, -0.16, -0.08 sit on lines 4, 6, 8, 10). Which curve is
which, from the legend sketch's line styles measured with
`scripts/dashes.py` and a column profile: A rim, long dash (dashes about
145 px, gaps 44 to 48); A centre, solid; C rim, irregular medium dashes
(37 to 88 px, gaps 15 to 20); C centre, regular dashes (45 to 57 px, gaps
19 to 23; in the plot 30 to 44 px). In the legend each upper line runs to
the base's rim and each lower line to its centre. The A rim curve agrees
with fig. 6's curve A to 0.001. A runs to M 1.28, C to 1.10. Below M 0.8 the
A centre and C rim curves lie on each other at -0.122 (extra 0.002), and
the A centre curve lies on the -0.12 gridline to M 0.93 (extra 0.001).
Consistency check: the fins lower -P_B at both orifices, as the text (p. 6)
states.

## Fig. 8: C_DB of A and C (rim and centre pressures over their areas)

Axes: M 0.60 to 1.40, C_DB 0 to 0.28 (8 lines, 0.04; the 0.32 frame line
was not found and not used). A (solid) M 0.70 to 1.28; C (dashed) M 0.70 to
1.10. The two body sketches' leaders cross the curves at M 0.94 to 1.0
(extra 0.002). C at M 0.975 and 1.025 falls in dash gaps at the steepest
part and is left unread ("not traced"); M 1.0 comes from a short 2-D trace.

## Not read or not reachable

Nothing in figs. 6 to 8 was out of reach. Figs. 9 to 12 are held back and
were not opened.
