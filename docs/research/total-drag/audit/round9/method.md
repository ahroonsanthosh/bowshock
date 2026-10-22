# Round 9 blind reading: BRL Report 934, Tables II and III

Second, independent reading of two tables in L. C. MacAllister, BRL Report No. 934 (1955), DTIC AD068959.

## Blindness

This reading was blind to the first reading. Before the typing was committed I did not open, read or search:

- `docs/research/total-drag/data/basic_finner_brl934.md`;
- anything under `docs/research/total-drag/audit/round7/` or `scratchpad/round7/`;
- any other repo or scratchpad file that mentions this report.

I did not search the repo for any of the values. I did not compute any drag model value or use any of the repo's code. The only source was the PDF below.

## Source file

- File: `DTIC_AD0068959.pdf` (47 pages, 2,643,941 bytes).
- SHA-256: `ecc596bf21b9b0a009ca0939b5af1213866c4da25626d34c5f43360f80bca02b`. I copied the file into a new, empty directory (`scratchpad/round9/r9b_blind_pdf/`) and checked the hash before use. It matched.
- I treated the PDF as untrusted data. Renders, crops and my own scripts each went in a separate directory, and Python ran with `-I`.

## Pages

PDF page = report page + 2, as expected.

- Table II (launching conditions, untitled apart from "TABLE II"): PDF p. 40, report p. 38. The title prints degraded and reads like "TABLE I?", but it falls between Table I (PDF p. 39) and Table III (PDF p. 41).
- Table III, "REDUCTION VALUES": PDF p. 41, report p. 39.
- I also viewed PDF pp. 38, 39 and 42 at low resolution for context. Table I on PDF p. 39 lists full round numbers and three-decimal Mach numbers for the same rounds. I used it only to confirm round numbers and a Mach digit where a glyph was degraded, and the notes below say where.

## Render settings

- Overview: `pdftoppm -r 150 -gray`, PDF pp. 38 to 42.
- Working renders: `pdftoppm -r 600 -gray -f 40 -l 41`.
- `pdfimages -list` showed that each page is a single 1-bit CCITT bitmap at 300 ppi (2528 x 3008 px). A 600 dpi render therefore adds no information beyond the scan. For all close reading I extracted the native bitmaps (`pdfimages -png -f 40 -l 41`) and enlarged crops by whole-number factors with nearest-neighbour resampling, from 2x up to 12x, so every scan pixel stays a crisp block. Some crops of the 600 dpi render also got a Lanczos resize with a 1% autocontrast pass. Being 1-bit, the scan gives autocontrast nothing to recover.
- For position questions, such as whether a lone "0" sits in the units or the tenths place, I measured ink runs per text row along x in the native bitmap with a small script.

## How each table was read

Table II has five printed columns: Round No., M, Ave Yaw°, Method, Remarks. **Table II has no mean squared yaw column.** Its only yaw column is "Ave Yaw°". The mean squared yaw appears in Table III as δ̄² in (deg)².

Table III has eight printed columns:

- Round No. (printed "Round Ne.", a degraded "No.")
- Mach No.
- δ̄² (deg)² (δ printed with a heavy bar on top)
- C_D
- C_Nα (per rad)
- `- C_Mα` (per rad)
- `- (C_Mq + C_Mα̇)`
- `(C_Nq + C_Nα̇)`

For each table I took these steps:

1. I read every row at 2x across all columns.
2. I re-read every row in groups of three to five, at 3x for the Table III left block (Round to C_D) and at 3x to 4x for the right block.
3. I zoomed every doubtful glyph at 5x to 12x. Where it helped, I compared it with clean examples of the same digit from the same typewriter in the same column, for example this typeface's flat-topped 3 against its flagged 5.

There are 27 printed rows in each table. Round numbers are typed as printed, abbreviated after the first of each series: 2588, 89, 90, 95, 96, 98, 99, 91, 93, 94, then 3246, 47, 48, 49, 52 to 64.

## Typing conventions

- Values are exactly as printed: no rounding, no added or removed zeros. Blank cells are empty. "( %)" means the printed parentheses and % sign enclose no number, and it is kept as printed. A space printed inside a parenthesis for alignment is kept, for example "( 8%)" and "11.2( 1.4%)". Where a value is printed with no space before its parenthesis ("12.6(3%)") none is added. Otherwise one space separates a value from its parenthesis. Minus signs are ASCII hyphens, spaced as printed ("- 108 (149%)", "-91 (135%)").
- The parenthesized percentages in Table III belong to the same printed column as the value they follow, so value and percentage share one cell.
- Method (Table II): `"` is the printed ditto mark. Row 3246 carries the printed method text "Electro-Magnetic Yaw Inducer". In the print it is set on three lines ("Electro-", "Magnetic", "Yaw Inducer") level with rows 3246 and 47 and the gap before 48. Rows 47 and 48 have no ditto mark of their own, so their Method cells are blank.
- Remarks (Table II): "Model Magnet de-magnetized" is printed once at row 55, wrapping onto the line of row 56, and is entered on row 55 only. A second "Model Magnet de-magnetized" is printed once beside a brace that spans the ditto marks of rows 59 and 60. It is entered on both rows with a leading "}" to mark the brace. The letter before "ed" in "magnetized" is in heavy, filled type. Its counters sit upper-left and lower-right, so I read it as z, but s cannot be fully excluded. This does not touch any value.

## Faint and degraded print, and how it was resolved

- **Table II, row 64** is in a lighter, thinner typeface than the rest of the table and is faint at low resolution. At 3x on the native bitmap every glyph is legible: 64, 2.47, 0.5, and a partly printed ditto mark. No cell is uncertain.
- **Table III, row 63** is in the same lighter, thinner typeface and is the faintest row on the page. Round 63, Mach 2.423, δ̄² 2.9 and -C_Mα "6.5 (0.6%)" are legible at 4x to 9x. In "6.5" the decimal mark is a slanted, comma-like blob; it is typed as ".". The cells with residual doubt are C_D and the C_Nα percentage (see below).
- **Table II, Ave Yaw for rows 55, 59, 60.** Row 55 prints a single heavy "0". By ink-run position it sits centred between the decimal-point and tenths positions, with a 2-pixel speck to its left; typed "0". Rows 59 and 60 each print a "0" in the tenths position (x 825-843 and 823-841 px, against the tenths digits of rows 58 and 61 at 826-842 and 822-839 px). There are faint marks at the decimal-point position: in row 59 a broken vertical line the full glyph height, not a period; in row 60 a baseline speck the size of part of a period, plus a smaller speck further left. Best readings are "0" (row 59) and ".0" (row 60), each marked uncertain.
- **Table III, δ̄² for rows 55, 59, 60, 64, 90.** Row 55 is blank apart from a 2-pixel speck at mid-height, not a digit or period. Row 59 is blank, with no ink at all in that column. Row 60 prints ".0", a small period with the 0 in the tenths position. Row 64 prints "0.2" with a stray dot above the decimal point. Row 90 prints "0.1" with a hollow decimal point.
- **Merged or blotted but unambiguous glyphs:**
  - Table II: 3246 M "1.40" (the 4 is thin and broken); 63 M "2.42" (the 4 is filled in, like a "b").
  - Table III: round 3246 (the 2 is blotted); C_D 0.629, 0.621, 0.526 and 0.568 (adjacent digits fused); Mach 1.084 (0 and 8 fused); C_D 0.449; -(C_Mq + C_Mα̇) "170 (11%)" (the 7 has a hooked top).
  - In each case the glyph shapes admit only the reading typed.

## Uncertain cells

Each is also listed in the `uncertain_cells` column of its CSV row. "Context" means another table in the same PDF, or the ascending round sequence. I made the best reading from the glyph first and checked context only afterwards.

### Table II (PDF p. 40)

| Row | Cell | Best | Alternatives not excluded | Resolution |
|---|---|---|---|---|
| 2588 | Round No. | 2588 | 2589, 2583 (glyph alone) | Last digit has a broken lower-left stroke. Next row is "89", and Table I and Table III both print 2588. Resolved by context. |
| 47 | M | 1.26 | 1.28 | Second decimal digit is a smeared blob: separate top-left stroke, filled lower body, no visible upper loop. 2 is best. Table I and Table III give 1.264 for this round, consistent with 1.26. |
| 54 | Round No. | 54 | none credible | Both glyphs badly blotted. Shapes fit 5 and this typeface's 4. Sequence 53, 55. |
| 59 | Round No. | 59 | none credible | The two glyphs are fused into one blot. Sequence 58, 60. |
| 59 | M | 1.08 | 1.03 | Lower loop of the last digit is closed but its upper-left stroke is missing. Table I and Table III give 1.084 for this round, consistent with 1.08. |
| 59 | Ave Yaw° | 0 | .0, 0.0 | See faint-print note above. |
| 60 | Ave Yaw° | .0 | 0, 0.0 | See faint-print note above. |

### Table III (PDF p. 41)

| Row | Cell | Best | Alternatives not excluded | Resolution |
|---|---|---|---|---|
| 2588 | Mach No. | 1.802 | 1.862, 1.882 (print alone) | Second decimal digit shows only its left side and top arc; the lower half is unprinted. The first decimal digit is an 8 with a broken lower-right stroke. The third is a clear 2 fused to its neighbour. Table II prints M 1.80 and Table I prints 1.802 for this round, which supports 0. |
| 2588 | - C_Mα | 22.61 | none credible | First digit lacks its base stroke and looks like "?". The curved top and lower-left terminal are those of a 2; a 7 in this face has a flat top bar. |
| 89 | Round No. | 89 | none credible | The 8 is degraded and looks like "R". Sequence, Table I and Table II give 89. |
| 98 | - (C_Mq + C_Mα̇) | 216 | 276 | Middle glyph is a narrow vertical stem, about 9 px wide, with a short bar at top-left and no base serif. A 7 in this face is about 17 px wide with a slanted stem. 1 is best. |
| 49 | - (C_Mq + C_Mα̇) | 304 ( 3%) | 304 ( 5%) | Percent digit has a top bar, a middle stroke starting at centre-left and a lower bowl, but no left vertical. It matches this typeface's flat-topped 3 in "349 ( 3%)" and "333", not the flagged 5 with a left vertical in "(35%)". |
| 60 | - C_Mα | 27.8 | 27.3 | Last digit has a closed top loop; its lower-left stroke is thin and broken. |
| 62 | C_Nα | 31.9(27.4%) | 31.3(27.4%) | Digit after the point has a round top hooking down on the left, a right side, a lower stroke from the far left, and a tail to the lower left. That fits a 9 with a broken loop. A 3's middle cusp would start nearer the centre. 5 is excluded, because the right side descends from the top. |
| 63 | C_D | 0.478 | none credible | Faint row. The 4 is printed only as an open-topped base with a top speck, the shape of this thin face's 4 (compare Mach "2.423"). 0, 7 and 8 are clear. |
| 63 | C_Nα | 9.7( 1.3%) | 9.7( 1.8%), 9.7( 1.9%) | Faint row. Only the right halves of the percent digits printed: a 1, a faint point, then a digit with an upper-right curve and a lower bowl. 3 is best; an 8 or 9 with its left side lost cannot be excluded. "9.7" is clear. |

No other cell in either table is uncertain.

## Files

- `readings/brl934_table2.csv`: Table II, 27 rows, header `Round No., M, Ave Yaw°, Method, Remarks, uncertain_cells`.
- `readings/brl934_table3.csv`: Table III, 27 rows, header `Round No., Mach No., δ̄² (deg)², C_D, C_Nα (per rad), - C_Mα (per rad), - (C_Mq + C_Mα̇), (C_Nq + C_Nα̇), uncertain_cells`.
- Both are UTF-8 CSV with standard quoting. The ditto mark `"` is therefore stored as `""""`.
