# Round 8: R&M 3348 tables 2(b) and 3, typed blind

Typed from the scan. I did not open any earlier typing of these tables
(commit bfedc3f, the w7-fins worktree, its `audit/w7-fins/` folder, or the
scratch folders `w7scripts/` and `w7img/`) before this typing was
committed.

## Source

ARC R&M 3348 (Rogers, Berry and Quincey, "Tests at transonic speeds on wings
with wedge sections and sweep varying between 0 and 60 deg"). File
`report.pdf`, SHA-256
`d2f35d8a07f34916a386ae0cf379e947ff5d06248c5555dbbfc313eab383e158`, 107
pages. I copied it into its own empty scratch folder before reading it. Each
page is a 300 dpi CCITT bilevel scan. I extracted the scans losslessly
(`pdfimages -png`) and read crops of them scaled by 0.7 to 1.0 (Lanczos;
`scripts/crop.py`), with single cells at 3x where needed
(`scripts/cellsheet.py`).

| Table | PDF page | Printed page |
|---|---|---|
| 2(b) | 32 | 31 |
| 3 (a) to (e) | 33 | 32 |
| 3 (f) to (j) | 34 | 33 |
| 3 (k) to (o) | 35 | 34 |
| 3 (p) to (t) | 36 | 35 |
| 3 (u) to (y) | 37 | 36 |
| 3 (z) to (dd) | 38 | 37 |

## What the tables say

* Table 2, "Positions of Pressure Holes". Part (b): "On base of single-wedge
  wing, where eta_b denotes the position of the hole from the root, as a
  fraction of the span of the base". Columns: "Hole No." and "Spanwise
  position (eta_b)". There are 6 holes (`readings/rm3348_table2b.csv`).
  * Holes 3 and 6 are printed 0·42 and 0·91 with a subscript 5. This is the
    printer's half unit in the last place, so the values are 0.425 and
    0.915. The CSV keeps both forms.
* Table 3, "Base Pressure on Single-Wedge Wing": "Tabulated quantities are
  p_b/p_0 where p_b is the base pressure and p_0 is the tunnel static
  pressure."
  * There are 30 sub-tables, (a) to (dd). Each states only M_0 and the sweep
    phi. Within a sweep they run in M_0 order:
    * 0.70, 0.80, 0.90, 1.00, 1.11 and 1.16 at phi 0, 15 and 30 deg;
    * 0.70, 0.80, 0.90, 1.00, 1.11 and 1.20 at phi 45 and 60 deg.
  * Rows are holes 6 down to 1. The columns are incidence alpha = 0, 2, 4, 6
    and 8 deg, except (f) (M_0 1.16, phi 0), whose own headings are
    alpha = 0, 2 and 3 deg.
  * Sub-table (a) also prints an eta column (0·91 with subscript 5, 0·75,
    0·59, 0·42 with subscript 5, 0·26, 0·10). It matches table 2(b).
  * 852 values in all (`readings/rm3348_table3.csv`, one row per value).

Shape notes, also given per row in the CSV:

* **Column headings.** Only (a), (f), (g), (k), (p), (u) and (z) print
  them. I typed the other sub-tables by column position under the nearest
  headed sub-table above them on the same page; the column rules line up.
* **Empty columns.**
  * (l) (M_0 1.16, phi 15) and (x) (M_0 1.20, phi 45) have values for
    alpha 0, 2 and 4 only; their 6 and 8 deg columns are drawn and left
    empty.
  * (r) (M_0 1.16, phi 30) and (dd) (M_0 1.20, phi 60) have values up to
    6 deg; the 8 deg column is empty.

## How it was typed and checked

1. **Typing by eye.** I typed every sub-table from crops covering one or
   two sub-tables (`readings/rm3348_table3_typed.txt`, the source of the
   CSV, written by `scripts/make_csv.py`).
2. **Glyph-consistency check** (`scripts/glyphcheck.py`; output in
   `readings/rm3348_table3_glyphcheck.json`). This checks the typing against
   the scan by a different method.
   * The page ink is split into connected components and grouped into
     words.
   * Every word shaped like "0", point and three digits is a tabulated
     value. Those words are put into lines and columns, in the order of
     the typing.
   * Shape check: every line holds the number of values typed for that row,
     apart from 11 cells. A speck of dust touches each of those 11, so
     segmentation did not isolate them.
   * Digit check: each of the 2523 isolated digit glyphs (all 2556 but
     those 11 cells) was compared with the mean glyph of every digit, built
     from the typing with the glyph itself left out (best normalised
     correlation over +-2 px).
   * For every glyph, the nearest mean was the digit I typed, by a margin
     of at least 0.05 over the next digit. So no glyph is flagged.
3. **The 11 speck cells** were viewed at 3x on one contact sheet. All read
   with certainty, as typed:
   * (c) hole 5, 2 deg: 0.476
   * (g) hole 6, 2 deg: 0.799
   * (g) hole 1, 4 deg: 0.768
   * (j) hole 4, 0 deg: 0.432
   * (l) hole 6, 2 deg: 0.507
   * (t) hole 4, 4 deg: 0.857
   * (u) hole 6, 2 deg: 0.923
   * (x) hole 5, 4 deg: 0.613
   * (z) hole 3, 2 deg: 0.913
   * (bb) hole 1, 2 deg: 0.749
   * (dd) hole 2, 4 deg: 0.788
4. **Table 2(b)** is six entries, read at 1x; all clear.

## Legibility

* Every character of both tables is legible, and none needed an
  alternative reading. The `legibility` column is "certain" throughout.
* The scan is clean apart from dust specks beside 11 values, noted per row;
  no speck falls on a digit.
* The checks above test the typing against the scan, not the printed
  values against anything else. Any misprint in the original would be typed
  faithfully.
