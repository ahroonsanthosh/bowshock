# RM L52J21a figs. 8, 31 to 33, 38, 39: second reading, method

Love and O'Donnell, NACA RM L52J21a (1952), NTRS 19930087533, the PDF from
`https://ntrs.nasa.gov/api/citations/19930087533/downloads/19930087533.pdf`
(67 pages, 300 ppi). Fig. 8 is PDF p. 28; figs. 31, 32, 33 pp. 58, 59, 60
(four panels each: (a) cusp, (b) conical, (c) boattail, (d) cylindrical
base); fig. 38 p. 65 (printed sideways: the page image is turned 270 deg
for reading, `"rotate": 270`); fig. 39 p. 66. Read blind. Toolkit and error
model as in `method_tn3819_figs32-35.md`; specs `../scripts/specs/rml52j21a_*.json`.

This report's symbols are small (35 to 55 px at 600 dpi), have centre dots,
and at each Mach number or Reynolds-number station stand in stacks of up
to six overlapping symbols. That limits what could be read.

## Axes

Each panel's gridlines were assigned values from its own printed labels,
checked on 600-dpi strips of the axes: the frames do not all start on a
labelled value, and the detected first line is R = 0, 1 or 2 (x 10^6) or
M 1.5, 1.6 or 1.7 depending on the panel (the specs record it). Fig. 32
(a), (b) have an extra row above -0.20 (frame at -0.22).

## Fig. 39 (fin effect on base A against M, three Reynolds numbers)

All nine symbols (open circles with dots, M 1.62, 1.93, 2.41) read by
circle-template fit. Clean.

## Fig. 38 (fin effects, six panels)

Only panel (a) boattail/cusp at M 1.62 is read: its six symbols are apart
and were named by eye (shape = nose: circle conical, square ogive, diamond
radome; flagged = cusp base, plain = boattail base, from the legend
table) and centred by template fit. Every other station of every panel is
a stack of four to six symbols overlapping by more than half their size;
neither the members' series nor their centres can be told apart in the
scan. Not read.

## Figs. 31 to 33 (unfinned body, P_B against R at M 1.62, 1.93, 2.41)

Read by an automatic scan (`scripts/symscan.py`): outline-template
correlation for squares (conical nose), triangles (ogive nose) and circles
(radome nose), each candidate kept only if it has a centre dot and an
empty interior; where two shapes coincide the better match is kept. The
reading is the template centre (bounding-box centre; for triangles one
third of the height above the base). Coverage is incomplete: symbols
whose dot merges with a faired curve or a neighbour, and some triangles,
are missed, and a few symbols may carry the wrong shape where two overlap
(the template score is in `how`; scores under about 0.75 deserve doubt).
Counts per panel (expected about 30): 31(a) 37, (b) 23, (c) 32, (d) 33;
32(a) 27, (b) 29, (c) 24, (d) 21; 33(a) 45, (b) 35, (c) 40, (d) 29
(counts above 30 include duplicates of one symbol found as two shapes or
two positions within 12 px; compare by position). The faired curves were
not read.

## Fig. 8 (finned body, P_B against M, three Reynolds numbers)

Same scan, restricted to the three test Mach numbers (bands of +-40 px at
M 1.62, 1.93, 2.41), the base named from the group the symbol falls in
(boattail or cylindrical above, cusp or conical below), and, at R 2.91e6,
"flagged" (fixed transition) from ink in a short sector outside the
outline to the upper right. Coverage is poor because of the stacks: R 2.91e6
left 20 of about 36, right 20 of 36; R 5.12e6 left 16 of 18, right 8 of 18;
R 8.06e6 left 10 of 18, right 6 of 18. The flag test and the shape test are
unreliable inside stacks. Treat fig. 8 as partly read.

## Not read or not reachable

Fig. 38 except panel (a) at M 1.62; the faired curves of figs. 8 and 31 to
33; the members of fig. 8's stacks that the scan did not separate. All
because overlapping symbols could not be told apart, not because the
pages were out of reach.
