# Readers' brief: boat-tail side and base pressures (0014 10.7 (ae))

For the first reading and the blind second reading of the figures below.
Each reader gets only this brief (handed over by the coordinator) and the
PDFs they fetch themselves. The brief holds no value from the repository:
identifiers and what to read only. The method the readings feed (design
record 0023) is not needed to read, and readers do not open it.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search
   the bowshock repository, any branch of it, its website, its issues,
   or any copy of its files, and no other reader's files. Computed
   results for these bodies exist there; a reading made after seeing them
   is not blind and cannot be used as one.
2. **Use only the PDFs.** Fetch each report yourself from the address
   below into a new, empty folder. Do not look for these figures' values
   anywhere else: no other paper, data compilation, web page or tool that
   quotes them. Do not open NACA TN 3320 at all, and in TN 3819 do not
   open the page of figure 26 (PDF page 57).
3. **The second reader never sees the first reading,** and neither reader
   sees any comparison with a computed solution. A neutral party pairs the
   two readings after both are committed.
4. **Read every point as plotted.** Do not round, correct, smooth or
   interpolate. If a point looks wrong (out of line with its neighbours,
   a symbol the legend does not explain), read it as plotted and flag it.
5. **Ambiguous points keep every reading.** If a symbol can be assigned
   to more than one curve or configuration, or two symbols overlap, give
   the most likely reading and every other plausible one in
   `alternatives`, and say in the method note what you saw.
6. **Illegible points stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.
7. **Measured points only.** Read the experimental symbols. Lines drawn
   as theory, as a method's prediction or as a fairing are not data: do
   not read them, except where this brief asks for a curve by name (then
   flag every value read from it `curve`).
8. **Only zero incidence and no jet flow.** Read only the points the
   figure or its legend gives at zero angle of attack and with no jet
   flow (RM E51F26 calls it "no jet"; on its jet-pressure-ratio figures
   the no-jet point is not asked for here).
9. **Record what you opened.** List every file and page you opened, in
   order, in the method note.

## 2. The sets

For each report: where to fetch it, and exactly what to read. Record the
SHA-256 of the file you used, its byte size and the address you fetched
it from. PDF page numbers below are those of the NTRS file (pages
counted from 1); check them against the captions.

### 2.1 NACA RM E51F26

E. M. Cortright, Jr. and A. H. Schroeder, "Investigation at Mach number
1.91 of side and base pressure distributions over conical boattails
without and with jet flow issuing from base", NACA RM E51F26, 1951. NTRS
19930086724, https://ntrs.nasa.gov/citations/19930086724.

- **Text, "Apparatus and procedure" (PDF pages 5 to 7), and figure 6 (PDF page 28):**
  the model geometry: body length and diameter, the nose (its length and
  the equation or reference that defines it), the cylinder, each
  boat-tail's angle, length and base-to-body diameter ratio, the nozzle
  exit diameter, the orifice stations, the Mach and Reynolds numbers, and
  what the text says about boundary-layer transition and the trip wire.
  Into `geometry.csv`.
- **Figures 7 and 8 (PDF pages 29 and 30):** every plotted point at zero
  incidence and no jet: the configuration (boat-tail angle and base
  ratio, as the figure labels it), the angular station or symbol, the
  axial station as plotted (x, with its unit as the axis states it) and
  the pressure coefficient.
- **Figure 24 (PDF page 48):** every plotted point: the boat-tail angle,
  the base-to-body diameter ratio, the Mach number the legend gives for
  it (and which Mach number that is: free-stream or just ahead of the
  base, as the figure says), and the base pressure coefficient (state
  which coefficient the axis shows, and its reference conditions).
- **Figures 29 and 30 (PDF pages 56 and 57):** every plotted point of
  each component (side, base, total, as the legend names them) against
  boat-tail angle. If a component is drawn only as a curve through the
  tested angles, read the curve at each tested angle and flag it `curve`.

### 2.2 NACA TN 3819

E. S. Love, "Base pressure at supersonic speeds on two-dimensional
airfoils and on bodies of revolution with and without fins having
turbulent boundary layers", NACA TN 3819, 1957. NTRS 19930084517,
https://ntrs.nasa.gov/citations/19930084517.

For each figure below: every experimental point (not the method's
curves), with its Mach number, its configuration as the figure, its
sketch or its legend gives it (cone angle, afterbody length or fineness
ratio, boat-tail angle, base-to-body diameter ratio), its symbol and the
source the legend gives for it, and the base pressure coefficient
(state the axis's quantity and reference).

- **Figure 19 (PDF page 50):** cone-cylinders of varying afterbody length.
- **Figure 21 (PDF page 52):** cone-cylinders of fineness ratio 5 against
  Mach number.
- **Figure 23 (PDF page 54):** conical boat-tailing, several
  configurations, Mach about 2.9.
- **Figure 24 (PDF page 55):** conical boat-tailing and cut-off length,
  Mach 1.91.
- **Figure 25(b) (PDF page 56):** the experimental points at Mach 3.24
  (part (a) is calculated: not read).
- **The text of report pp. 16 to 18 (PDF pages 18 to 20):** any geometry or condition of these
  models it states, each with its page, into `geometry.csv`.

### 2.3 NACA RM A52E20

J. O. Reller, Jr. and F. M. Hamaker, "An experimental investigation of
the base pressure characteristics of nonlifting bodies of revolution at
Mach numbers from 2.73 to 4.98", NACA RM A52E20, 1952. NTRS 19930087153,
https://ntrs.nasa.gov/citations/19930087153.

- **Figure 1(c) (PDF page 26) and the text's model description (PDF page 6):** model 8
  (the boat-tailed body) and the unboat-tailed body it is compared with:
  every dimension given (nose, cylinder, the boat-tail's profile, length
  and base diameter, the body diameter), into `geometry.csv`.
- **Figure 15 (PDF page 44):** every plotted point, with and without the
  boat-tail, with its Mach number, Reynolds number if given, the
  boundary-layer state the legend gives (laminar, turbulent, transition
  fixed), and the base pressure coefficient.

### 2.4 NACA TN 3372

R. F. Peck, "Flight measurements of base pressure on bodies of
revolution with and without simulated rocket chambers", NACA TN 3372,
1955. NTRS 19930084618, https://ntrs.nasa.gov/citations/19930084618.

- **Figure 1 (PDF pages 9 and 10) and the text's model description (PDF page 4):**
  configuration D: every dimension given, the converging afterbody's
  length, profile and base diameter, the fins' position (in particular
  how far their trailing edges lie ahead of the base), the orifices on
  the base.
- **Figure 10 (PDF page 19):** every plotted point of configuration D:
  Mach number and base pressure coefficient, with the orifice or model
  each belongs to.
- **Figure 12 (PDF page 20):** configuration D's points or curve as
  plotted (flag a curve `curve`).

## 3. What to deliver

One folder per reader, committed where the coordinator says, before any
pairing:

- `method.md`: what you opened (rule 9); for each report the address,
  SHA-256, byte size, the pages read and the resolution you viewed them
  at; how each figure was read; every ambiguous or illegible point and
  what you saw; the axis calibration of every figure (at least two
  labelled ticks per axis, their pixel positions, the page and dpi) and
  how point centres were found.
- `geometry.csv`: one row per report and quantity:
  `source,quantity,value,unit,page,note`.
- One CSV per figure, named for it (`rme51f26_fig7.csv`,
  `rme51f26_fig8.csv`, `rme51f26_fig24.csv`, `rme51f26_fig29.csv`,
  `rme51f26_fig30.csv`, `tn3819_fig19.csv`, `tn3819_fig21.csv`,
  `tn3819_fig23.csv`, `tn3819_fig24.csv`, `tn3819_fig25b.csv`,
  `rma52e20_fig15.csv`, `tn3372_fig10.csv`, `tn3372_fig12.csv`), with
  these columns:

  | Column | What |
  | --- | --- |
  | `source` | the report (`RM E51F26`, `TN 3819`, `RM A52E20`, `TN 3372`) |
  | `item` | the figure (`fig. 7`, ...) and part, if any |
  | `series` | the curve or symbol as the legend names it |
  | `configuration` | the configuration as the figure or legend labels it (angles, ratios, lengths) |
  | `mach` | the Mach number of the point, as given; say which Mach number in `note` if the figure says |
  | `x` | the abscissa as read |
  | `x_quantity` | what the abscissa is, with its unit, as the axis states it |
  | `y` | the ordinate as read; empty if illegible |
  | `y_quantity` | what the ordinate is, as the axis states it |
  | `alternatives` | other plausible readings, separated by `;` |
  | `flag` | `ok`, `ambiguous`, `illegible`, `curve`, `untraced` |
  | `page` | the PDF page |
  | `note` | anything else (trip wire, boundary-layer state, overlapping symbols) |

## 4. Errors to avoid

- Reading a jet-on point, or one at an angle of attack.
- Reading a method's or theory's curve as data (rule 7).
- Assigning a point to the wrong configuration where several share a
  figure: check the legend and the symbol's fill and flag.
- Dropping a minus sign; base pressure coefficients here are mostly
  negative.
- Reading an axis in a different unit or reference from the one it
  states (pressure coefficient on free-stream or on local conditions).
- Resolving an ambiguity because a value "looks smoother": keep both.
- Opening anything not listed in rule 2, or TN 3819's figure 26 page.
