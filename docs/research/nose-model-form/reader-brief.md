# Readers' brief: measured nose pressures (0014 10.7 (w))

For the fresh first reading and the blind second reading of the four
sets below. Each reader gets only this brief and the PDFs they fetch
themselves. The brief holds no value from the repository: identifiers
and what to read only. The method behind it (design record 0022) is not needed to
read, and readers do not open it.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search
   the bowshock repository, any branch of it, its website, its issues, or
   any copy of its files, and no other reader's files. Earlier typings of
   these tables and results computed from them are in the repository; a
   reading made after seeing them is not blind and cannot be used as one.
2. **Use only the PDFs.** Fetch each report yourself from the address
   below into a new, empty folder. Do not look for these reports' values
   anywhere else: no other paper, data compilation, web page or tool
   that quotes them.
3. **The second reader never sees the first reading,** and neither reader
   sees any comparison with a computed solution. A neutral party pairs
   the two readings after both are committed.
4. **Read every cell as printed.** Do not round, correct, smooth or
   interpolate. Keep the printed sign and number of digits. If a printed
   value looks wrong (a typo, a sign, a digit out of line with its
   neighbours), copy it as printed and flag it; do not fix it.
5. **Ambiguous cells keep every reading.** If a digit or sign can be read
   more than one way, give the most likely reading in `cp` and every other
   plausible reading in `alternatives`. Say in the method note what you
   saw.
6. **Illegible cells stay empty.** Leave `cp` empty and flag the cell
   `illegible`. Never guess.
7. **Only zero incidence.** Read the zero angle-of-attack (and, where the
   report has roll angles, zero roll) data only.
8. **Record what you opened.** List every file and page you opened, in
   order, in the method note.

## 2. The sets

For each set: the report, where to fetch it, and exactly what to read. No
SHA-256 of these files is recorded yet: record the SHA-256 of the file you
used, its byte size and the address you fetched it from.

### 2.1 NACA TN 3716

E. W. Perkins and L. H. Jorgensen, "Comparison of experimental and
theoretical normal-force distributions (including Reynolds number
effects) on an ogive-cylinder body at Mach number 1.98", NACA TN 3716,
1956. NTRS 19930084497, https://ntrs.nasa.gov/citations/19930084497.

- **Table I(a):** the pressure coefficient at every orifice at zero
  angle of attack, with the orifice's station as the table gives it.
- **Figure 3:** the plotted zero-angle-of-attack measured points (not
  the theory curves): each point's station and pressure coefficient, read
  from the axes. This is a separate reading from the table; read it
  without looking back at your table values.
- **Figure 1 and the text:** the model geometry (nose length, ogive
  radius, body diameter, the orifice stations if listed), the free-stream
  Mach number and Reynolds number of the zero-incidence data, and the
  stated uncertainty of the pressure coefficients, each with its page.

### 2.2 NACA RM A53E01

E. W. Perkins and D. M. Kuehn, NACA RM A53E01, 1953 (pressure
distributions on a tangent-ogive body; take the title from the report).
NTRS 19930087544, https://ntrs.nasa.gov/citations/19930087544.

- **Table II(a):** the pressure coefficient at every orifice at zero
  angle of attack, with its station.
- **Figure 1 and the text:** the model geometry, the Mach and Reynolds
  numbers of the zero-incidence data, the stated uncertainty of the
  pressure coefficients, and anything the text says about the model's
  shape or tip, each with its page.

### 2.3 NACA TN 4233

W. A. Page, "Experimental study of the equivalence of transonic flow
about slender cone-cylinders of circular and elliptic cross section",
NACA TN 4233, 1958. NTRS 19930085182,
https://ntrs.nasa.gov/citations/19930085182.

- **Tables I(a) and I(b), the circular cone-cylinder only:** every row
  (each indicated Mach number, in each tunnel), the pressure coefficient
  at every orifice that lies on the cone (from the tip to the cone's
  shoulder; give the orifice numbers and stations from the table or
  figure 1). Also the check orifices on the opposite side, if the table
  has them, flagged `check`.
- **Figure 1 and the text:** the cone's semiapex angle and length, the
  orifice stations, each tunnel's name, the Reynolds number, and the
  stated uncertainties of Cp and Mach number, each with its page.

### 2.4 NACA RM E51H17

C. E. Jack, NACA RM E51H17, 1951 (pressures on a slender cone; take the
title from the report). NTRS 19930086899, https://ntrs.nasa.gov/citations/19930086899.

- **Figure 4(a):** every plotted measured point at zero angle of attack
  (not theory curves or marks the legend does not explain): its station
  and its pressure coefficient, read from the axes. Marks the legend does
  not explain are listed as `untraced`, not read.
- **The text and the model figure:** the cone's half-angle and length, the
  Mach and Reynolds numbers, and any stated uncertainty, each with its
  page.

## 3. What to deliver

One folder per reader, committed where the coordinator says, before any
pairing:

- `method.md`: what you opened (rule 8); for each report the address,
  SHA-256, byte size, the pages read and the resolution you viewed them
  at; how each table or figure was read; every ambiguous or illegible
  cell and what you saw; for figures, the axis calibration (at least two
  labelled ticks per axis, their pixel positions, the page and dpi) and
  how point centres were found.
- `geometry.csv`: one row per report and quantity:
  `source,quantity,value,unit,page,note`.
- One CSV per table or figure, named for it (for example
  `tn3716_table1a.csv`, `tn3716_fig3.csv`, `rma53e01_table2a.csv`,
  `tn4233_table1a.csv`, `tn4233_table1b.csv`, `rme51h17_fig4a.csv`), with
  these columns:

  | Column | What |
  | --- | --- |
  | `source` | the report (`TN 3716`, `RM A53E01`, `TN 4233`, `RM E51H17`) |
  | `item` | the table or figure (`table I(a)`, `fig. 3`, ...) |
  | `mach` | the Mach number of the row or curve, as printed |
  | `tunnel` | the tunnel, where the report has more than one; else empty |
  | `orifice` | the orifice number, if printed; else empty |
  | `station` | the station as printed (or, for a figure, as read) |
  | `station_unit` | what the station is measured in, as the report defines it (for example `x/d`, `x/l`, inches) |
  | `cp` | the pressure coefficient as printed (or read); empty if illegible |
  | `alternatives` | other plausible readings, separated by `;` |
  | `flag` | `ok`, `ambiguous`, `illegible`, `typo?`, `check`, `untraced` |
  | `page` | the PDF page |
  | `note` | anything else |

## 4. Errors to avoid

- Reading a neighbouring column (another angle of attack or roll angle)
  or the other model in TN 4233 (the elliptic one).
- Dropping a minus sign, or a leading zero misread as a decimal point.
- Stations in a different unit from the one the table states.
- Reading theory curves in a figure as data.
- Resolving an ambiguity because a value "looks smoother": keep both.
- Opening anything not listed in rule 2.
