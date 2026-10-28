# Readers' brief: pressures on the flat face of flat-faced cylinders (0014 10.7 (af))

For the first reading and the blind second reading of the figures and
tables below. Each reader gets only this brief (handed over by the
coordinator) and the PDFs they fetch themselves. The brief holds no value
from the repository: identifiers and what to read only. The method the
readings test (design record 0016 section 21) is not needed to read, and
readers do not open it.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search
   the bowshock repository, any branch of it, its website, its issues,
   or any copy of its files, and no other reader's files. Computed
   results for flat faces exist there; a reading made after seeing them
   is not blind and cannot be used as one.
2. **Use only the PDFs.** Fetch each report yourself from the address
   below into a new, empty folder. Do not look for these figures' values
   anywhere else: no other paper, data compilation, web page or tool that
   quotes them. Do not open NASA TR R-274 (the same tests as TN D-5392).
3. **The second reader never sees the first reading,** and neither reader
   sees any comparison with a computed solution or a bound. A neutral
   party pairs the two readings after both are committed.
4. **Read every point as plotted or tabulated.** Do not round, correct,
   smooth or interpolate. If a point looks wrong (out of line with its
   neighbours, a symbol the legend does not explain), read it as plotted
   and flag it.
5. **Ambiguous points keep every reading.** If a symbol can be assigned
   to more than one curve, model or configuration, or two symbols
   overlap, give the most likely reading and every other plausible one in
   `alternatives`, and say in the method note what you saw.
6. **Illegible points stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.
7. **Measured points only.** Read the experimental symbols and tabulated
   measurements. Lines drawn as theory, as a calculation or as a fairing
   are not data: do not read them.
8. **Only zero incidence.** Read only the points the figure, table or
   legend gives at zero angle of attack. Where a figure mixes incidences,
   read the zero-incidence points only and say how you told them apart.
9. **Every orifice, with where it is.** For each point give the
   orifice's position as the figure or table gives it (for example r/R,
   s/d or x/r, with the quantity named), and whether it lies on the flat
   face, on a corner radius or shoulder, or on the cylindrical afterbody,
   as the report's sketch or orifice table shows it (`location` column).
   Read the afterbody and shoulder points too where the figure or table
   asked for has them, flagged by location.
10. **Record what you opened.** List every file and page you opened, in
    order, in the method note.

## 2. The sets

For each report: where to fetch it, and exactly what to read. Record the
SHA-256 of the file you used, its byte size and the address you fetched
it from. PDF page numbers below are those of the NTRS file (pages
counted from 1); check them against the captions.

### 2.1 NACA TN 4300

W. E. Stoney, Jr. and J. T. Markley, "Heat-transfer and pressure
measurements on flat-faced cylinders at a Mach number of 2", NACA TN
4300, 1958. NTRS 19930085034,
https://ntrs.nasa.gov/citations/19930085034.

- **The text's description of the models, the jets and the test
  conditions, and table I (PDF page 24):** each model's diameter, its
  corner (sharp or radius), the orifice positions, the Mach number, the
  total pressure and temperature, the Reynolds number, the stated
  accuracy of the pressure measurements, and what the pressures are
  normalised by. Into `geometry.csv`. If table I holds pressures, read
  them into `tn4300_table1.csv` as well.
- **Figure 3 (PDF page 27):** the orifice locations, into
  `geometry.csv`.
- **Figure 7 (PDF page 31):** every plotted pressure point (not the
  velocity distribution), with the model and the jet it was measured in
  if the legend says, its position and the pressure quantity as the axis
  states it.
- **Figure 16 (PDF page 40):** every plotted point, with its position
  and quantity.

### 2.2 NACA RM L57C18

H. S. Carter and W. E. Bressette, "Heat-transfer and pressure
distribution on six blunt noses at a Mach number of 2", NACA RM L57C18,
1957. NTRS 19930089669,
https://ntrs.nasa.gov/citations/19930089669.

- **Figure 1 (PDF page 17 and the next, if it continues):** which of the
  six models have a flat face; for each of those, the face's diameter,
  the corner's shape and size, and the orifice positions. Into
  `geometry.csv`.
- **Table I (PDF page 15) and the text:** the Mach number, Reynolds
  number, total pressure and temperature of the pressure tests, the
  stated pressure accuracy, and what the pressures are normalised by.
  Into `geometry.csv`.
- **Figure 5 (PDF pages 22 to 27):** for the flat-faced models only,
  every plotted point at zero incidence, with the model, its position
  and the quantity as the axis states it.

### 2.3 NASA TM X-19

P. B. Burbank and R. L. Stallings, Jr., "Heat-transfer and pressure
measurements on a flat-face cylinder at a Mach number range of 2.49 to
4.44", NASA TM X-19, 1959. NTRS 19980223601,
https://ntrs.nasa.gov/citations/19980223601.

- **Figure 2 (PDF page 15) and the text:** the model's diameter, its
  corner, the orifice positions, the Mach and Reynolds numbers of the
  pressure tests, the stated pressure accuracy, and what the pressures
  are normalised by. Into `geometry.csv`.
- **Figure 5 (after figure 4; about PDF page 20: find it by its caption
  and say which page it is):** the local pressures on the flat face.
  Every plotted point at zero incidence, with its position, its Mach and
  Reynolds number if the legend gives them, and the quantity as the axis
  states it.

### 2.4 NASA TN D-5392

R. L. Stallings, Jr. and D. T. Howell, "Experimental pressure
distributions for a family of blunt bodies at Mach numbers from 2.49 to
4.63 and angles of attack from 0 deg to 15 deg", NASA TN D-5392, 1969.
NTRS 19690025922, https://ntrs.nasa.gov/citations/19690025922.

- **Figure 1 (PDF page 67) and the text:** which model is the flat-face
  cylinder (zero shoulder radius and a flat nose, as the figure's table
  gives them), its diameter, its orifice positions, and the test
  conditions and stated accuracy. Into `geometry.csv`.
- **Tables I, II and III (PDF pages 13 to 30, 31 to 48 and 49 to 66;
  Mach 2.49, 4.06 and 4.63):** for the flat-face cylinder only, every
  tabulated pressure at zero incidence, with its orifice position and
  the quantity as the table heads it. Into `tnd5392_table1.csv`,
  `tnd5392_table2.csv` and `tnd5392_table3.csv`.

## 3. What to deliver

One folder per reader, committed where the coordinator says, before any
pairing:

- `method.md`: what you opened (rule 10); for each report the address,
  SHA-256, byte size, the pages read and the resolution you viewed them
  at; how each figure was read; every ambiguous or illegible point and
  what you saw; the axis calibration of every figure (at least two
  labelled ticks per axis, their pixel positions, the page and dpi) and
  how point centres were found.
- `geometry.csv`: one row per report and quantity:
  `source,quantity,value,unit,page,note`.
- One CSV per figure or table, named for it (`tn4300_fig7.csv`,
  `tn4300_fig16.csv`, `tn4300_table1.csv` if it holds pressures,
  `rml57c18_fig5.csv`, `tmx19_fig5.csv`, `tnd5392_table1.csv`,
  `tnd5392_table2.csv`, `tnd5392_table3.csv`), with these columns:

  | Column | What |
  | --- | --- |
  | `source` | the report (`TN 4300`, `RM L57C18`, `TM X-19`, `TN D-5392`) |
  | `item` | the figure or table (`fig. 7`, `table I`, ...) and part, if any |
  | `model` | the model as the report names it (size, letter or its geometry) |
  | `mach` | the free-stream Mach number of the point, as given |
  | `reynolds` | the Reynolds number as given, with its length in `note` |
  | `position` | the orifice's position as read |
  | `position_quantity` | what the position is, with its unit or reference, as stated |
  | `location` | `face`, `corner` (on a corner radius or shoulder), `afterbody`, or `unclear` |
  | `value` | the pressure as read; empty if illegible |
  | `value_quantity` | what it is, as the axis or table states it (for example p/p_t2, p/p_t, C_p), and its reference |
  | `alternatives` | other plausible readings, separated by `;` |
  | `flag` | `ok`, `ambiguous`, `illegible`, `untraced` |
  | `page` | the PDF page |
  | `note` | anything else (the jet, the incidence check, overlapping symbols) |

## 4. Errors to avoid

- Reading a point at an angle of attack other than zero.
- Reading a faired curve, a theory or a calculated distribution as data
  (rule 7).
- Reading a model that is not flat-faced in RM L57C18, or a model other
  than the flat-face cylinder in TN D-5392.
- Assigning a point to the wrong model or jet where several share a
  figure: check the legend, the symbol and its fill.
- Losing an orifice's location: a point on the corner or the afterbody
  read as a face point, or the reverse (rule 9).
- Reading a pressure in a different normalisation from the one the axis
  or table states.
- Resolving an ambiguity because a value "looks smoother": keep both.
- Opening anything not listed in rule 2.
