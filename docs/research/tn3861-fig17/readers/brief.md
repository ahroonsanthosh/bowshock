# Readers' brief: NACA TN 3861 figure 17, the crossflow drag (0014 10.7 (ab), second addendum)

For a fresh first reading and a blind second reading of one figure. Each
reader gets only this brief (handed over by the coordinator) and the PDF
they fetch themselves. The brief holds no value from the repository:
identifiers and what to read only. The use the reading is put to (design
record 0016 section 21.2) is not needed to read, and readers do not open
it.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search
   the bowshock repository, any branch of it, its website, its issues,
   or any copy of its files, and no other reader's files. An earlier
   reading of this figure exists there; a reading made after seeing it is
   not blind and cannot be used.
2. **Use only the PDF.** Fetch the report yourself from the address
   below into a new, empty folder. Do not look for this figure's values
   anywhere else: no other paper, data compilation, web page or tool that
   quotes them.
3. **Read only figure 17.** You may read the report's symbol list, its
   text about figure 17 and the figure's legend and caption, to identify
   the axes and the symbols. Do not read values from figures 15 and 16 or
   any other figure.
4. **The second reader never sees the first reading,** and neither reader
   sees any comparison with another figure, a computation or a bound. A
   neutral party pairs the two readings after both are committed.
5. **Read every point as plotted.** Do not round, correct, smooth or
   interpolate. If a point looks wrong (out of line with its neighbours,
   a symbol the legend does not explain), read it as plotted and flag it.
6. **Ambiguous points keep every reading.** If a symbol can be assigned
   to more than one series, or two symbols overlap, give the most likely
   reading and every other plausible one in `alternatives`, and say in
   the method note what you saw.
7. **Illegible points stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.
8. **Measured points only.** Read the plotted symbols. Lines drawn as
   theory, as a calculation or as a fairing are not data: do not read
   them.
9. **Calibrate on the grid across the figure.** The scan may be rotated
   or sheared by a fraction of a degree: fit the calibration to grid
   lines detected across the whole plot, not to one axis line, and give
   it.
10. **Record what you opened.** List every file and page you opened, in
    order, in the method note.

## 2. The figure

P. J. Penland, NACA TN 3861, 1957. NTRS 19930084664,
https://ntrs.nasa.gov/citations/19930084664. Record the SHA-256 of the
file you used, its byte size and the address you fetched it from.

**Figure 17** (about PDF page 33: find it by its caption and say which
page it is): the drag coefficient of a circular cylinder against the
crossflow Mach number. Read **every plotted symbol**: the crossed ones
(the report marks with a cross the data obtained through crossflow
study, yawed cylinders) and the uncrossed ones (cylinders normal to the
stream). For each: its series as the legend names it, verbatim (the
source, and, where the legend distinguishes them, pressure-integrated or
force-measured drag), whether it is crossed, its abscissa and its
ordinate as the axes state them.

## 3. What to deliver

One folder per reader, committed where the coordinator says, before any
pairing:

- `method.md`: what you opened (rule 10); the address, SHA-256, byte
  size, the page read and the resolution you viewed it at; the axis
  calibration (every grid line used, its pixel position and value, the
  fitted mapping and its residual); how symbol centres were found; every
  ambiguous or illegible point and what you saw; the legend as printed.
- `tn3861_fig17.csv`, with these columns:

  | Column | What |
  | --- | --- |
  | `series` | the legend's words for the symbol, verbatim |
  | `crossed` | `yes` or `no` |
  | `x` | the abscissa as read |
  | `x_quantity` | what it is, as the axis states it |
  | `x_err` | your reading error in x |
  | `value` | the ordinate as read; empty if illegible |
  | `value_quantity` | what it is, as the axis states it |
  | `value_err` | your reading error in the ordinate |
  | `px` | the symbol centre in pixels of the page image, with its dpi in `note` |
  | `alternatives` | other plausible readings, separated by `;` |
  | `flag` | `ok`, `ambiguous`, `illegible` |
  | `page` | the PDF page |
  | `note` | anything else (overlaps, the text's statement about the point) |

## 4. Errors to avoid

- Reading a faired curve or a theory line as data (rule 8).
- Assigning a symbol to the wrong series where the legend's symbols look
  alike (crossed and uncrossed, pressure and force); say how you told
  them apart.
- Calibrating on one axis line of a rotated scan.
