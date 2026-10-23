# ARC R&M 3323 figs. 4 and 5: sources traced, then first reading (method)

**Source.** Nash, "A review of research on two-dimensional base flow",
ARC R&M 3323 (AERADE 1826.2/3903), downloaded on 2026-10-23 from
`reports.aerade.cranfield.ac.uk` (bitstream `arc-rm-3323.pdf`) into a new
empty directory outside the repository: 28 PDF pages, 2000913 bytes,
sha256 2f1976e99c2cf610d2a57624a666343eb6b6ff7123b75447614cd55638933c3a.
Fig. 4, "The variation of base-pressure coefficient with trailing-edge
thickness at transonic speeds" (zero incidence), four panels at M 0.6,
0.8, 1.0 and 1.2, PDF p. 23 (printed p. 22). Fig. 5, "Variation of
base-pressure coefficient with Mach number", PDF p. 24 (printed p. 23).
Named band-setting by 0014 section 10.7 (k): "figs. 4 and 5, each plotted
set once its source is traced; a set that appears elsewhere in this table
is counted once".

**Blindness.** No other reading of these figures is known to exist in the
repository; I opened no file under `audit/round10/`, `round11/`,
`round12/` or any `pairing-*` folder.

## 1. The sources, traced before reading (2026-10-23)

From the report's text (section 2.3, printed p. 7) and its reference list
(printed pp. 16 and 17). Fig. 4's legend gives a symbol per reference;
filled symbols are free-flight tests, flagged symbols models with a
roughness band. Fig. 5's curves are labelled by h/c and reference; solid
without a roughness band, broken with one.

| Ref. | Source                                                                                                                                        | Fig. 4 symbol                    | Fig. 5 curve      | Elsewhere in 10.7 (k)?                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 31   | Sawyer and Daum, NACA RM L8B13 (1948): the wing-flow wedge                                                                                     | half circle, flat side down      |                   | yes, RM L8B13 fig. 4(c) to (e): counted once                                                                             |
| 32   | Cleary and Stevens, NACA RM A51J11 (1951): a wing with a 4% circular-arc section, its trailing edge thickened                                  | triangle, point down             | h/c 0.012         | no; only through R&M 3323                                                                                                |
| 33   | Dugan, NACA RM A52E01 (1952): a tapered wing of aspect ratio 3.1, 3% biconvex section, three blunt trailing edges                             | half circle, flat side up        |                   | no; only through R&M 3323                                                                                                |
| 34   | Morrow and Katz, NACA TN 3548 (1955): the slab wing in free flight                                                                             | diamond (filled: free flight)    |                   | yes, TN 3548 fig. 6: counted once                                                                                        |
| 35   | Rogers, Berry and Quincey, ARC 23,180 (1961), published as R&M 3348: the single wedge, h/c 0.14                                                | triangle, point up               | h/c 0.14          | yes, R&M 3348 table 3: counted once                                                                                      |
| 38   | Nash, Quincey and Callinan, "report in preparation", published as R&M 3427: the 10% blunt section                                              | circle                           | h/c 0.10          | yes, R&M 3427 fig. 13: counted once                                                                                      |
| 39   | Pearcey, unpublished work (NPL)                                                                                                                | square                           | h/c 0.06          | no; unpublished, only here                                                                                               |
| 40   | Holder, Pearcey and Nash, "Some aerodynamic advantages of thick trailing edges in high-speed flight", paper to the RAeS, February 1962        | right triangle, flag to the left | h/c 0.025         | no; only here                                                                                                            |
| 41   | Saltzman, NASA TN D-1056 (1961): the X-15's vertical fin in flight                                                                             | right triangle (filled: flight)  |                   | not in (k); its table II is already typed for the present curve's band above Mach 1.5 (`src/base/blunt-te-2d.ts`)         |
| 50   | Korst: the steady-flow theory                                                                                                                  |                                  | "Steady flow"     | a theory, not data: not read                                                                                             |

What this means for counting (the coordinator decides how each is used,
in 0019 section 3.4, before a band is set):

- Refs. 31, 34, 35 and 38 are sets already named in (k) at their own
  reports. Read here as plotted, but counted once: where both are read,
  the source's own figure or table is the set, and R&M 3323's replot is a
  check of it (and of how Nash plotted it).
- Refs. 32, 33, 39 and 40 reach this work only through R&M 3323. 39 is
  unpublished and 40 a society paper; neither is traceable further here.
  32 and 33 are three-dimensional wings (the 4% arc wing, the aspect-ratio
  3.1 tapered wing), not two-dimensional sections; RM A51J11 and RM
  A52E01 are NACA reports that could be opened, but they are not named in
  10.7, so they are not opened for this reading.
- Ref. 41: the X-15 point at M 1.2 in fig. 4 is from TN D-1056; whether
  that table's rows below Mach 1.5 serve is not decided here (only rows at
  1.52 to 3.24 are used by the present curve's band).
- The report's own conditions are not given per set: Mach number is the
  free stream (M_inf on fig. 5; M on fig. 4), Cp_b the base-pressure
  coefficient on the free stream's pressure and dynamic pressure, so the
  sets are on M_0 and p_0 as 0019 section 3.4 requires; Reynolds numbers
  and layer states are those of each source and are not in R&M 3323.

## 2. Fig. 4: first reading (2026-10-23)

**Method.** The page rendered at 300 dpi (`pdftoppm -r 300 -f 23 -l 23`,
2421 by 3221 px) and cut into its four panels (crops in
`scripts/rm3323_fig4_run.py`). Grid lines every 5% in h/c and 0.2 in Cp_b,
found from column and row profiles (`scripts/gridfind.py`,
`scripts/lines.py`) and listed per panel in `rm3323_fig4{A..D}_grid.json`;
`scripts/calib.py` traces each along its length (it drifts 3 to 5 px over
a panel's height, so the trace matters) and interpolates between the two
lines either side of a point. The symbols are small (about 12 px) and of
nine kinds, several half-circles and flagged triangles that the outline
templates of `symfit.py` do not cover, so each was placed by eye:
`scripts/blobs.py` lists the ink blobs with the grid lines blanked, and
each blob was viewed at 6x to 14x with a pixel ruler; a centre is the
centre of the symbol body's bounding box, flags left out
(`rm3323_fig4_place.csv`, with a placement error of 1 px for a clear
symbol, 1.5 for one touching another or a grid line, 2 to 2.5 where two
overlap). `scripts/rm3323_fig4_run.py` turns the placements into values
and draws an overlay; every placement was checked on it by eye. One
placement was corrected on the overlay check: B03 (the circle at M 0.8)
had been put 3.5 px left of its centre, misled by the grid line through
it.

**Errors** (in the CSV, per row): the placement and 0.5 px of grid trace
in quadrature, and for triangles 2 px more in Cp_b (the bounding box's
centre against the centroid). At about 29.3 px per 1% in h/c and 585 to
590 px per unit in Cp_b: 0.04 to 0.09% in h/c, 0.002 to 0.006 in Cp_b.

**Reading** (`rm3323_fig4_first.csv`): 61 symbols, 16 at M 0.6, 21 at
0.8, 15 at 1.0 and 9 at 1.2. By reference: 32 (RM A51J11) 18, at h/c
about 1.2, 2.4 and 4.0%, flagged and not; 33 (RM A52E01) 13, at about 1.5,
1.6 and 3.0%; 34 (TN 3548, filled) 4, at 6.0%; 35 (R&M 3348) 3 open
triangles at 13.9 to 14.0%; 38 (R&M 3427) 4 circles at 9.8 to 10.0%; 39
(Pearcey) 6 squares at 6.0%; 40 (Holder, Pearcey and Nash, all flagged)
9, at 0.0 to 0.26% and about 2.4 to 2.5%; 41 (X-15, filled) 1, at M 1.2,
h/c 10.0%, Cp_b -0.42. No symbol of ref. 31 (Sawyer and Daum) was found on
any panel, though the legend lists it (its wedge may lie beyond h/c 15%,
the axis's end; not checked, RM L8B13 not opened).

At M 1.0 (the panel that matters most for F4) the symbols lie at Cp_b
-0.89 to -0.56 for h/c 1.2 to 14%, and +0.06 and +0.14 for ref. 40's two
symbols at h/c 0.26% and 0.0%.

**Uncertain calls.**
- _Three heavy triangles_ (B02, C10, D06), one per panel at M 0.8, 1.0
  and 1.2, at h/c 13.9 to 14.0%, each just below ref. 35's open triangle:
  drawn partly filled, with a flag at the upper right on D06 (and a mark
  there on C10 and B02). The legend has no such symbol. Filled means free
  flight (caption), but no free-flight model of h/c 0.14 is among the
  references; flagged means a roughness band. Their source is **not
  traced**: they are kept in the CSV as "35?", source uncertain, and by
  (k)'s own condition ("each plotted set once its source is traced") they
  set nothing until it is. Whether R&M 3348 tested its single wedge with
  a roughness band would decide it (R&M 3348 was not opened for this).
- _Overlaps_: A04 and A05, A06 and A07, B11 to B13, C07 and C08 are
  pairs or triples drawn over each other; the kinds were told apart at 12x
  to 14x and the placements carry 1.5 to 2.5 px.
- _B17_: a down-triangle with a stub at its upper right corner; whether
  the stub is a flag is uncertain (flag "?").
- Ref. 40's symbols are all flagged, consistent with fig. 5's broken
  (roughness band) 0.025 (40) curve.

## 3. Fig. 5: not read; stopped and reported (2026-10-23)

Fig. 5 is faired curves with no symbols: h/c 0.14 (35), 0.10 (38) and
0.06 (39) and 0.012 (32) solid (without a roughness band), 0.06 (39) and
0.025 (40) broken (with one), and Korst's steady-flow theory (not data).
The registered quantity is "each plotted set", that is each curve. At
300 dpi (PDF p. 24; M 0.2 per 198.7 px, Cp_b 0.2 per 199 px) the curves
are drawn about 3 px wide and can be followed one by one left of M 0.95.
Near M 1.0 they converge, as the text says they do ("to a value of Cp_b
around -0.7"), and the solid curves of h/c 0.10 and 0.06 meet at about
M 1.00, Cp_b -0.77 (page px 1333, 1100), in a knot that the rising broken
0.025 curve and the M 1.0 grid line also pass through. Two curves enter
it and two leave it nearly parallel, so the ink does not show which
leaving line is which: the 0.06 (39) solid curve beyond M 1.0 (its only
copy, ref. 39 being unpublished) cannot be assigned. The other curves
(0.14, both broken curves, 0.012) can be followed through the region.

Reading the curves only where they can be assigned, or reading the pair
as an envelope beyond M 1.0, would each be a quantity chosen after
seeing the ink (0014 10.7 (r)). So fig. 5 is not read: no value of it is
recorded, and the coordinator decides whether a partial reading is
registered first. A tracker was tried on the page to see whether the
curves could be followed (it lost the broken curves in their gaps and
could not settle the knot); its output was not kept.

_Added 2026-10-23, after opening RM L8B13 (`method_rml8b13_fig4.md`)._
Sawyer and Daum's wedge (ref. 31) has h/c 0.14 (chord 2.5 in, included
angle 8 deg). So ref. 31's symbols, not found above, would plot at h/c
0.14, where the three heavy symbols of untraced source stand (B02, C10,
D06); they may be ref. 31's half circles, drawn filled as a flight
(wing-flow) test. A possibility only: they stay "source not traced".

Read once (fig. 4); fig. 5 not read.

**Status, 2026-10-23 (0014 10.7 (s)).** Fig. 5 is a check that sets
nothing (its 0.06 and 0.10 solid curves cannot be told apart beyond M
1.0); it is not read. Fig. 4 stays registered, read once, a blind second
reading needed. Its three heavy symbols at h/c 0.14 stay "source not
traced" and set nothing.
