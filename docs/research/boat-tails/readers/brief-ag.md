# Readers' brief: boat-tail side pressures at more Mach numbers (0014 10.7 (ag))

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
   quotes them. Do not open NACA TN 3320 at all.
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
   as theory (several of these figures carry a method-of-characteristics
   curve), as a method's prediction or as a fairing are not data: do not
   read them, except where this brief asks for a curve by name (then flag
   every value read from it `curve`).
8. **Only zero incidence, jet off, no secondary flow.** Read only the
   points the figure, its legend or the text gives at zero angle of
   attack with no jet flow ("jet off", "power off", "no jet", or a jet
   pressure ratio the report itself calls jet off) and no secondary flow.
   Where a figure mixes jet-off and jet-on points, read only the jet-off
   ones, and say in `note` how the legend marks them. If a figure does
   not say which of its points are jet off, read none of it and flag the
   figure in the method note.
9. **Record what you opened.** List every file and page you opened, in
   order, in the method note.

## 2. The sets

For each report: where to fetch it, and exactly what to read. Record the
SHA-256 of the file you used, its byte size and the address you fetched
it from. PDF page numbers below are those of the NTRS file (pages
counted from 1); check them against the captions, and where a caption is
not on the page given, find the figure by its number and record its page.

For every report, into `geometry.csv`, from the text pages and figures
named as geometry: the body's overall length and maximum diameter; the
nose (its shape, length, and the equation or reference that defines it;
whether its tip is sharp); the cylinder's length; each boat-tail's
angle, length and base (or exit) diameter, and whether the boat-tail is
a body of revolution or made of flaps or facets; whether the shoulder
(where the boat-tail meets the cylinder) is sharp or rounded, and any
radius; the orifice stations on the boat-tail; the model support (sting
through the base, strut, wings) and where it attaches; the tunnel; the
Mach and Reynolds numbers; what the text says about boundary-layer
transition or a trip; and what the text says about the support's effect
on the boat-tail pressures, with its page.

### 2.1 NACA RM L54C16

C. A. de Moraes and A. M. Nowitzky, "Experimental effects of propulsive
jets and afterbody configurations on the zero-lift drag of bodies of
revolution at a Mach number of 1.59", NACA RM L54C16, 1954. NTRS
19930088187, https://ntrs.nasa.gov/citations/19930088187.

- **Geometry:** the text's model and test description (PDF pages 4 to
  6), figure 1 (the page before figure 2, if it is there), figure 2 (PDF
  page 19) and figure 3 (PDF page 20).
- **Figure 5 (PDF page 22):** every measured power-off point: the
  configuration (boat-tail angle, or as the figure labels it), the axial
  station as plotted (with its unit or reference length as the axis
  states it) and the pressure coefficient. If the figure also gives the
  power-off boat-tail pressure-drag coefficient of each configuration
  (as a number, a table or a plotted point), read the measured one (not
  the theory's) into the same file with `x_quantity` saying so.

### 2.2 NACA RM L54I22

R. M. O'Donnell and R. W. McDearmon, "Experimental investigation of
effects of primary jet flow and secondary flow through a zero-length
ejector on base and boattail pressures of a body of revolution at
free-stream Mach numbers of 1.62, 1.93, and 2.41", NACA RM L54I22, 1954.
NTRS 19930093718, https://ntrs.nasa.gov/citations/19930093718.

- **Geometry and support:** the text's apparatus, tests and procedure,
  and precision (PDF pages 4 to 6) and figure 1 (PDF page 15), including
  the wing supports' position relative to the boat-tail.
- **Figure 2 (PDF page 16):** every measured point of both shrouds at
  each Mach number, if the legend or text gives them as jet off (rule 8):
  the shroud, the Mach number, the station as plotted and the pressure
  coefficient.
- **Figures 7 (PDF pages 21 to 23), 14 (PDF pages 32 to 34) and 16 (PDF
  pages 36 to 38):** only their jet-off points with zero secondary flow,
  each with its shroud, nozzle, Mach number, station and pressure
  coefficient.

### 2.3 NACA RM E57E06

L. E. Baughman and F. D. Kochendorfer, "Jet effects on base pressures of
conical afterbodies at Mach 1.91 and 3.12", NACA RM E57E06, 1957. NTRS
19930089763, https://ntrs.nasa.gov/citations/19930089763.

- **Geometry and support:** the text's models, tunnel installation and
  support struts (PDF pages 7 to 9), figure 1 (PDF page 41), figure 2
  (PDF page 42) and figure 5 (PDF pages 47 and 48).
- **Figure 6 (PDF page 49):** every measured point with and without the
  struts (as the legend names them), boat-tail and base: the station,
  the pressure coefficient (or ratio, as the axis states), the
  configuration and Mach number.
- **Figure 7 (PDF pages 50 and 51):** the same on the cylindrical
  afterbody.
- **Figure 14 (PDF page 60):** every jet-off point on the conical
  boat-tails, with its Mach number, configuration, station and pressure
  coefficient (or ratio, as the axis states).

### 2.4 NASA TN D-6789

W. B. Compton III, "Jet effects on the drag of conical afterbodies at
supersonic speeds", NASA TN D-6789, 1972. NTRS 19720019347,
https://ntrs.nasa.gov/citations/19720019347.

- **Geometry and support:** the text's apparatus and procedure (PDF pages
  6 to 9), tables I and II (PDF page 16), figures 1 to 4 (PDF pages 17 to
  20) and figure 17 (PDF page 46). Say in particular whether the
  boat-tails are bodies of revolution or made of flaps, and where the
  strut meets the model.
- **Figure 5 (PDF page 21):** every jet-off point at each meridian, with
  the meridian angle as the legend gives it, the station and the
  pressure coefficient.
- **Figure 7 (PDF pages 23 to 28):** only the jet-off points: the
  configuration (boat-tail angle and length ratio), Mach number, meridian
  if given, station and pressure coefficient.
- **Figure 12 (PDF page 35):** every jet-off point: configuration, Mach
  number and boat-tail pressure-drag coefficient.
- **Figure 18 (PDF page 47) and figure 20 (PDF page 49):** the reference
  nozzle, jet off: in figure 18 every point (meridian, Mach number,
  station, pressure coefficient); in figure 20 every point (Mach number,
  boat-tail pressure-drag coefficient; repeat data flagged as the
  caption says).

### 2.5 NASA TM X-1960

W. B. Compton III and J. F. Runckel, "Jet effects on the boattail axial
force of conical afterbodies at subsonic and transonic speeds", NASA TM
X-1960, 1970. NTRS 19700013329, https://ntrs.nasa.gov/citations/19700013329.

Read only points at free-stream Mach numbers of 1.15 and above.

- **Geometry and support:** the text's apparatus and procedure (PDF pages
  8 to 12), appendix B and its calibration bodies (PDF pages 19 to 22),
  figures 1 to 4 (from about PDF page 28 to page 31) and figure 17 (PDF
  page 82). Say whether the boat-tails are bodies of revolution or made
  of flaps, and where the support meets the model.
- **Figures 5 (PDF pages 32 to 34), 6 (PDF pages 35 to 37) and 18 (PDF
  page 83):** the jet-off points at those Mach numbers: configuration,
  Mach number, meridian if given, station and pressure coefficient.
- **Figure 8 (PDF pages 42 to 45):** the jet-off points at those Mach
  numbers: configuration, Mach number and boat-tail axial-force
  coefficient.
- **Any other figure giving jet-off boat-tail axial force or pressure
  drag against Mach number** (look at the captions of figures 7, 9 and
  11): its jet-off points at those Mach numbers, into a file named for
  the figure.

## 3. What to deliver

One folder per reader, committed where the coordinator says, before any
pairing:

- `method.md`: what you opened (rule 9); for each report the address,
  SHA-256, byte size, the pages read and the resolution you viewed them
  at; how each figure was read; every ambiguous or illegible point and
  what you saw; how each figure marks its jet-off points (rule 8); the
  axis calibration of every figure (at least two labelled ticks per
  axis, their pixel positions, the page and dpi) and how point centres
  were found.
- `geometry.csv`: one row per report and quantity:
  `source,quantity,value,unit,page,note`.
- One CSV per figure, named for it (`rml54c16_fig5.csv`,
  `rml54i22_fig2.csv`, `rml54i22_fig7.csv`, `rml54i22_fig14.csv`,
  `rml54i22_fig16.csv`, `rme57e06_fig6.csv`, `rme57e06_fig7.csv`,
  `rme57e06_fig14.csv`, `tnd6789_fig5.csv`, `tnd6789_fig7.csv`,
  `tnd6789_fig12.csv`, `tnd6789_fig18.csv`, `tnd6789_fig20.csv`,
  `tmx1960_fig5.csv`, `tmx1960_fig6.csv`, `tmx1960_fig8.csv`,
  `tmx1960_fig18.csv`, and any further TM X-1960 figure as
  `tmx1960_fig<N>.csv`), with these columns:

  | Column | What |
  | --- | --- |
  | `source` | the report (`RM L54C16`, `RM L54I22`, `RM E57E06`, `TN D-6789`, `TM X-1960`) |
  | `item` | the figure (`fig. 5`, ...) and part, if any |
  | `series` | the curve or symbol as the legend names it |
  | `configuration` | the configuration as the figure or legend labels it (angles, ratios, lengths, shroud, nozzle) |
  | `mach` | the free-stream Mach number of the point, as given |
  | `meridian` | the meridian angle, if the figure gives one; else empty |
  | `x` | the abscissa as read |
  | `x_quantity` | what the abscissa is, with its unit, as the axis states it |
  | `y` | the ordinate as read; empty if illegible |
  | `y_quantity` | what the ordinate is, as the axis states it (pressure coefficient, pressure ratio, drag or axial-force coefficient, and its reference area if stated) |
  | `alternatives` | other plausible readings, separated by `;` |
  | `flag` | `ok`, `ambiguous`, `illegible`, `curve`, `untraced` |
  | `page` | the PDF page |
  | `note` | anything else (how jet off is marked, trip, boundary-layer state, overlapping symbols, struts on or off) |

## 4. Errors to avoid

- Reading a jet-on point, a point with secondary flow, or one at an angle
  of attack (rule 8).
- Reading a method's or theory's curve as data (rule 7).
- Assigning a point to the wrong configuration, shroud, meridian or Mach
  number where several share a figure: check the legend, the symbol's
  fill and flag, and the caption.
- Dropping a minus sign; boat-tail pressure coefficients here are mostly
  negative.
- Reading an axis in a different unit or reference from the one it
  states (pressure coefficient against pressure ratio; drag coefficient
  on maximum area or on another area).
- Resolving an ambiguity because a value "looks smoother": keep both.
- Opening anything not listed in rule 2.
