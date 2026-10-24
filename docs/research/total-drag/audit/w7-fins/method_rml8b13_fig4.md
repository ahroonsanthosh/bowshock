# NACA RM L8B13 fig. 4(c) and 4(e): fig. 4(e) read once, fig. 4(c) stopped (2026-10-23)

**Source.** Sawyer and Daum, "Measurement through the speed of sound of
static pressures on the rear of unswept and sweptback circular cylinders
and on the rear and sides of a wedge by the NACA wing-flow method", NACA
RM L8B13 (July 1948; NTRS 19930085324), downloaded on 2026-10-23 from
`ntrs.nasa.gov/api/citations/19930085324/downloads/19930085324.pdf` into
a new empty directory outside the repository: 15 PDF pages, 6497673
bytes, sha256
9104583c592195e52275e1b81b0f315b793366519552867b802313fa7679d824. Fig. 4,
"Variation of pressure ratio p/p_0 with Mach number M for the several
cylinders and wedge tested", PDF p. 15 (printed p. 13), five panels.
Named band-setting by 0014 section 10.7 (k): "fig. 4(c) to 4(e) (the
wedge's base and sides)"; not used, "the cylinders' figs. 4(a) and 4(b)".

**The wedge** (text, printed pp. 2 and 3). Chord 2.5 in, span 10 in, included
angle 8 deg (so h/c = 2 tan 4 deg = 0.14), mounted normal to the P-51D's
wing at 45% chord, free to align with the local flow, an end plate at the
wing. Base orifices at 1/2, 1 1/4, 4 and 8 in from the wing (fig. 4(c):
square, circle, diamond, triangle); one orifice at midchord on each face
(fig. 4(e): circle, square). Mach number and p_0 are "the effective
free-stream static pressure and Mach number ... at the orifice location",
from surveys without the model: the local wing flow, so the sets are on
M_0 and p_0 as 0019 section 3.4 takes them. M 0.7 to about 1.2,
Reynolds number 4e5 to 7e5 on the chord; pressure +-0.2 in of water, M
+-0.005.

**Findings before any reading** (for the coordinator):

1. _(k) names fig. 4(d) as part of the wedge; it is not._ Fig. 4(d) is
   the 45 deg sweptback cylinder (orifices at 0.44, 2.47 and 5.30 in).
   (k)'s own description, "the wedge's base and sides", covers figs. 4(c)
   and 4(e) only, and its "not used" column names only 4(a) and 4(b). By
   number 4(d) is registered; by description it is not. It is not read
   until the coordinator says which was meant.
2. _Fig. 4(c) carries marks its legend does not explain._ Besides the
   four base-orifice symbols (each with an arrowhead tick toward its
   orifice, per the figure's note), panel (c) has "x" marks (near M 0.72,
   0.80, 0.93, about 1.06 and 1.20) and short dashes; the legend of (c)
   lists no "x" (in (e) "x" is reference 5, the oblique-shock theory, not
   data). Their source is not traced, so they would set nothing.
3. _The symbols of (c) are small (about 15 px at 300 dpi), hand-plotted,
   often inked solid, and chained over one another_ where the four
   orifices read alike (M 0.75 to 0.95 and 1.0 to 1.15). The quantity
   (p/p_0 per orifice) looks readable, with identity calls flagged in the
   chains; it has not been read in this session.
4. _A link to R&M 3323 fig. 4._ This wedge is h/c 0.14, so R&M 3323's
   ref. 31 symbols (half circles, flat side down), which were not found
   on R&M 3323's fig. 4, would plot at h/c 0.14: the three heavy, partly
   filled symbols there at h/c 13.9 to 14.0% (B02, C10, D06, "source not
   traced") may be ref. 31's, drawn filled as a flight (wing-flow) test.
   This is a possibility, not a tracing; nothing is changed by it.


## After 0014 10.7 (s) (2026-10-23)

The registration is limited to figs. 4(c) and 4(e); marks the legend
does not explain set nothing. Each was then opened for reading on the
page rendered at 300 dpi (`pdftoppm -r 300 -f 15 -l 15`, 2355 by 3105,
a photographed page on tinted paper). Grid lines every 0.05 in M (M 0.7 at
x 477 to 1.2 at 1356, about 1755 px per unit) and every 0.2 in p/p_0
(about 430 px per unit), traced along their length by `scripts/calib.py`.

**Fig. 4(e), the wedge's faces: read once** (`rml8b13_fig4e_first.csv`,
placements `rml8b13_fig4e_place.csv`, grid `rml8b13_fig4e_grid.json`,
`scripts/rml8b13_fig4e_emit.py`). 25 symbols, M 0.72 to 1.17, p/p_0
1.05 to 1.34, each placed by eye at the centre of its outline on views
at 3x to 6x with a pixel ruler (1.5 to 2.5 px). Errors: M 0.0009 to
0.0015, p/p_0 0.0037 to 0.0059. The "x" at M 1.20 is reference 5 (the
oblique-shock theory) and is not read. _Uncertain calls:_ at this scan the
circles (one face) and squares (the other) are both drawn as rounded
boxes about 17 px across; 8 of the 25 cannot be told apart and are marked
"uncertain" (the two faces are alike on a symmetric wedge free to align
with the flow, so the value, not the face, is what is read); e08 is two
outlines drawn over each other, placed as one; e25 is a second outline
partly hidden under e22.

**Fig. 4(c), the wedge's base: stopped, not read.** Its four series
(orifices at 1/2, 1 1/4, 4 and 8 in: square, circle, diamond, triangle)
read alike, so the symbols, about 15 px across and often inked solid,
are drawn over one another in chains. From about M 0.85 to 1.0, and
almost everywhere from M 1.05 to 1.2 (p/p_0 about 0.43 to 0.48), they
merge into solid clumps of ink in which neither the number of symbols,
nor their shapes, nor their centres can be read (for example page px
1280 to 1350, 1585 to 1615, at M 1.15 to 1.19). Left of M 0.85 most
symbols separate. Reading only the symbols that separate would leave out
the clumps, where the four orifices agree, and so choose the data after
seeing the ink. So the registered quantity, p/p_0 per orifice, cannot be
read over the transonic range, and no value was recorded: the
coordinator decides (for example, a check that sets nothing, as (g),
(r) and (s) ruled for other figures). Its untraced "x" marks and dashes
(see above) would set nothing in any case.

Read once (fig. 4(e)); fig. 4(c) not read.

**Status, 2026-10-23 (0014 10.7 (t)).** Fig. 4(c) is a check that sets
nothing; it is not read. Fig. 4(e) stays registered, read once.
