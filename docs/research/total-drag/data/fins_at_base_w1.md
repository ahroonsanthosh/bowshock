# Fins at the base: the first readings for W1

The digitising record behind the rebuilt fins-on-base factor
([0015](../../../design/0015-fins-at-the-base.md), work item W1 of
[0014](../../../design/0014-refusals.md)). Every value is in
`fins_at_base_w1.csv`; the scripts are in `../scripts/w1/` (Python 3,
numpy and Pillow, run with `python3 -I` on page renders kept outside the
repository); their outputs are the `w1_*_output.txt` files beside this
one.

**These are first readings.** An independent reader is making blind
second readings of the same figures (0014 section 10.4); this reader has
not opened them. The band of 0015 is the envelope of both readings once
the second is in.

## The rules this reading followed

- Only figures 0014 section 10.1 names as band-setting were opened for
  values: TN 3819 figs. 33 to 35, TN 2360 fig. 6, RM L52J21a figs. 8 and
  38, RM L52E06 fig. 7. Figures of those reports that were not needed
  were not read (below).
- No held-back value was used. Three exposures are stated, none of them
  used: 0014 section 5.2 quotes TN 3697 fig. 5 by eye and 0008 section
  3.2 quotes TN 3320 and TR 1160's RM-10 base drag, both read as part of
  the records this work was asked to read first; and while reading RM
  L52E06's text on base pressures (p. 5) the first lines of its "Drag
  Data" section were read (a nose-sting increment of 0.009 in C_D,
  estimated), where reading stopped. RM L52E06's PDF pages 18 to 20
  (figs. 9 to 12) were not rendered or opened.
- **Not blind:** TN 3819 fig. 35 below M 1.8. Round 3's values there were
  in `src/base/tn3819-fig35.ts`, read before this reading was made. The
  second reader's reading of that range is the blind one.

## Common method

Each page is rendered at 300 dpi in greyscale (`pdftoppm -r 300 -gray`),
the scans' own resolution. Calibration (`cal.py`): every grid line in the
plot is located locally (the darkness-weighted centre of a +-7 px window,
the median over a 60 px segment, at 20 to 40 points along the line, a
straight line fitted with outliers from crossing curves dropped). Data
coordinates are interpolated linearly between the two fitted lines that
bracket the point, each evaluated at the point, which removes the
paper's non-affine distortion; an affine fit to all intersections is
printed as the calibration's own check (its residuals bound the
distortion, not the reading). Symbols (`sym.py`): normalised
cross-correlation of the dark mask with an outline template of the
symbol's measured size (circle, square, diamond), over +-6 to +-9 px
about a starting point; starting points come from a template scan down
each station line (`tn2360_fig6_scan.py`, `ov_tile.py`) or by eye on
zoomed crops with data-unit ticks, and each fitted centre was checked on a
zoomed crop. Curves (`tn3819_fig35.py`, `colruns.py`): the dark runs in
each pixel column of a narrow band, grid rows excluded, assigned to their
curve by order and dash pattern.

Reading errors are stated per figure; they include the symbol's centring
(about 2 px) and the calibration, not the source's own measurement
accuracy (stated separately where the source gives it).

## NACA TN 2360 (Spahr and Dickey 1951, NTRS 19930083086), fig. 6

PDF pp. 24 (M 1.5) and 25 (M 2.0). Delta P_b (P_b with tail minus without,
both in the tunnel) against x/c, trailing edge forward of the base over
the tail chord; plane (two fins) and cruciform (four) tails; circles t/c
0.05, squares t/c 0.10; rectangular unswept fins of circular-arc section,
chord 1.875 in on a 1.250 in body (fig. 2), sting d/h 0.4, the highest
Reynolds number of the tests, 4.5e6 (p. 7).

- Calibration: lines every 0.2 in x/c and every 0.05 in Delta P_b (labels
  -0.1, 0, 0.1, and -0.2, 0.2 on the cruciform panels). 6(a): 111 px per
  0.2 and per 0.05 (0.00045 per px); 6(b): 138 px (0.00036 per px).
  Affine residuals at most 0.0009 in Delta P_b.
- Read: every symbol at x/c = 1.0 to 0 (trailing edge at or ahead of the
  base, the positions the library takes). The symbols behind the base
  (x/c below 0) and the "simplified analysis" curves were not read.
- Identification: circles and squares as the legend gives them. Not
  found: circles at 0.8 and 0.6 on 6(a)'s plane panel and at 0.8, 0.6, 0.2
  on 6(b)'s cruciform panel; any circle on 6(b)'s plane panel; a square at
  0.8 on 6(b)'s plane panel. At x/c = 0 the cruciform t/c 0.10 has three
  stacked squares at both Mach numbers (repeat runs, each read); some
  stations have two.
- Error: +-0.002 in Delta P_b (centring +-2 px, and stacked or overlapping
  outlines). The source's own uncertainty is +-0.003 in P_b (p. 5).

## NACA TN 3819 (Love 1957, NTRS 19930084517)

**Fig. 33** (PDF p. 65, report p. 63; the page is landscape): P_B at x/c
= 0 against fin t/c, zero sweep; circles M 1.50 and squares M 2.00 (ref.
26, which is TN 2360), diamonds M 2.41 (Langley 9 in tunnel). Grid P_B
every 0.02 (95.6 px), t/c every 2% (95.3 px). All eight symbols read.
Error +-0.001 in P_B.

**Fig. 34** (same page): the NACA RM-10 (ref. 36), t/c 0.10, 60 deg
sweepback, with and without fins, tunnel, M 1.49 to 1.99. Grid P_B every
0.02, M every 0.1 (95.9 px). All eight symbols read. Error +-0.001. The
RM-10 is a boat-tailed parabolic body: its factor is with over without
on the same body.

**Fig. 35** (PDF p. 66): the free-flight line (ref. 12, dash-dot) at M
1.40 to 1.80, **not blind** (above). Calibration on all 437 intersections
(P_B every 0.02 at 79.0 px, M every 0.1 at 78.95 px; lines tilt about +9.4
px and lean about -14 px per 1000 px), affine residuals at most 0.001 in
P_B. From M 1.40 to 1.70 the line is the only one there (estimate A lies
below it, estimate B starts at M 1.5 and meets it near 1.65) and is traced
column by column; at 1.70 the three lines meet (+-0.003); at 1.75 and 1.80
the dash-dot line runs beside estimate B (0008's and round 3's
identity-swap range) and was read by eye on a 3x crop (+-0.004, +-0.003).
Error +-0.002 where traced. The tunnel pairs and the line above M 1.80
were not read again: they have two readings (`src/base/tn3819-fig35.ts`).

Figs. 32 (the same TN 2360 data as P_B curves, and the Langley symbols at
M 2.41 for x/c 0 to 1) was not read: 0015 uses TN 2360's own symbols, and
no position other than x/c = 0 above M 2.0.

## NACA RM L52J21a (Love and O'Donnell 1952, NTRS 19930087533)

Four 45 deg swept circular-arc fins about 8% thick, 3/4 in chord normal
to the edges, on a 0.900 in body, carried by the fins (no sting); the
fins cross the body inside the base section, the root trailing edge
about 0.9 in (0.8 root chords) ahead of the base, and the swept trailing
edge crosses the base plane about one diameter out (figs. 1, 5; dimensions
read from the drawings, +-0.05 in). The bodies without fins were sting
supported. Tunnel, M 1.62, 1.93, 2.41.

**Fig. 38(c)** (PDF p. 65; the page rotated upright), R = 8.06e6, the
right panel (cylindrical base, plain symbols; conical base, flagged): the
fin effect Delta P_B. The symbols overlap in clusters at each Mach number
on a 1-bit scan, so plain and flagged symbols cannot be told apart; the
reading is the cluster's envelope, its most negative and most positive
symbol centres at each Mach number. Grid Delta P_B every 0.02 (74.5 px), M
every 0.1 (75.2 px). Error +-0.002. The left panel (boattail and cusp
bases) and panels (a), (b) were not read.

**Fig. 8** (PDF p. 28), panel R = 8.06e6, right: the finned body's P_B,
cylindrical base (three noses) at each Mach number, used only to turn
fig. 38's Delta P_B into a factor; and the conical base at M 1.62, 1.93,
2.41 (its least negative symbols), recorded and not used (0015 section
3.5 takes the cylindrical base). Grid P_B every 0.02 (61.7 px), M every 0.1
(61.8 px); affine residuals at most 0.002. Error +-0.002 (+-0.003 for the
conical base at M 1.62, two of three symbols found).

Figs. 31 to 33 and 39 were not read (not used).

## NACA RM L52E06 (Hart 1952, NTRS 19930087048), fig. 7

PDF p. 17, upper half: rim and centre P_B against M of A (the finless
body, free flight; long dash rim, solid centre) and C (the same body with
four 0.091 in flat-plate fins with rounded leading edges and square
trailing edges at the base; medium dash rim, short dash centre), as the
legend's lines lead to the rim ring or the centre. C's lines end near M
1.11 (its data are TN 3372's flights, to M 1.15). Grid P_B every 0.04 (89
px), M every 0.05 (89.3 px); affine residuals at most 0.001. Read at M
1.06, 1.08 and 1.10 (column runs, +-5 px band). At 1.06 the two centre
lines merge (+-0.003). Error +-0.002. Figs. 6 and 8 were not read (fig. 8
is fig. 7's pressures over the whole base). TN 3372's figs. 7 to 12 (the
finned bodies alone, M 0.65 to 1.15) were not read: they carry no finless
body, and 0015 serves no flat-plate factor.

## What these readings give (computed in 0015 section 3)

| Member                                        | M 1.5                                                  | M 2.0                                     |
| --------------------------------------------- | ------------------------------------------------------ | ----------------------------------------- |
| tunnel P_B without fins (fig. 33)             | -0.1948                                                | -0.1507                                   |
| cruciform t/c 0.10, x/c 0, Delta P_b (fig. 6) | -0.1210, -0.1303, -0.1391                              | -0.0509, -0.0573, -0.0640                 |
| cruciform t/c 0.05, x/c 0                     | -0.0743 (fig. 6), -0.0752 (fig. 33)                    | -0.0321 (fig. 6), -0.0344 (fig. 33)       |
| plane t/c 0.10, x/c 0                         | -0.0685                                                | -0.0398                                   |
| plane t/c 0.05, x/c 0                         | -0.0337                                                | not tested                                |
| RM-10 (60 deg) with over without              | 1.229 (M 1.49) to 1.137 (1.59), 1.168 (1.78), 1.145 (1.98) |                                       |
| RM L52J21a, Delta P_B at R 8.06e6             | -0.0157 to +0.0017 (M 1.62)                            | -0.0066 to +0.0055 (1.93); -0.0069 to +0.0020 (2.41) |
| RM L52E06, C over A, M 1.06 to 1.10           | rim 0.852 to 0.882, centre 0.982                       |                                           |
