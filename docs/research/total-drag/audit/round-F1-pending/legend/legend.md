# RM L55H09 fig. 6: the legend check of F1's registration, item 1

The legend check that item 1 of the dated entry "2026-11-20, RM L55H09
and RM L9I30 seen for their geometry only; F1's figures named before
any is read" (docs/design/0014-refusals.md section 10.7) asks for. Done
on 2026-11-20 by a neutral party (a subagent that reads no value and
sets no band), in a folder of its own outside the repository. The round
number is the coordinator's to give; until then this record sits in
`round-F1-pending/legend/` (the entry puts the check in the round's
pairing folder; the coordinator moves it there when the round is
numbered).

**No data value of fig. 6, or of any other figure of RM L55H09, was
seen.** No plotted symbol, curve or point position was looked at, and
no tick label of any axis was looked at.

## The PDF

- Howell and Braslow, NACA RM L55H09, NTRS 20050019382, downloaded with
  `python3 -I docs/research/refusals/scripts/fetch_ntrs.py <dir>
  20050019382` into a new empty folder outside the repository.
- SHA-256 `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b`,
  29 PDF pages, 1029235 bytes. The entry names no hash to check
  against; this one is the hash the readers' briefs (item 7) are to name.

## Finding the page

From the text layer only (`pdftotext`, page by page, searching for
"Figure" and the caption's words; no figure page's text was printed
except its caption, axis titles and words, with digits masked):
fig. 6 is **PDF p. 21** (caption "Figure 6.- Zero-lift drag-coefficient
variation with Mach number for a fin-stabilized body of revolution as
obtained from measurements in a slotted wind tunnel and in free
flight."). Page size 612.479 by 690.0 pt.

## How the crop was made

1. A thumbnail of p. 21, 100 by 113 px (`pdftoppm -scale-to-x 100`),
   enlarged by 4 with nearest-neighbour pixels, was the only view of
   the whole page. At that size no value, tick or symbol can be read.
   It showed: a block of text lines at the top (the legend), three
   plot panels one above the other, and the caption at the bottom.
2. The page was rendered at 200 dpi and at 400 dpi (`pdftoppm -r`);
   neither render was looked at. Boundaries were found from ink counts
   computed by script (dark pixels per 2 pt row or column, printed as
   numbers only) and from the text layer's word boxes:
   - legend lines at y 50 to 126 pt, blank from 126 to 136 pt, the top
     panel's frame from 136 to 138 pt;
   - the rotated y-axis titles left of x 140 pt (tick labels start at
     x 142 pt, the frames at about 158 pt);
   - each x-axis title below its tick labels, separated by a blank row.
3. `crop_legend.py` (in this folder) cut these boxes, in PDF points
   (x0, y0, x1, y1, origin top left), from the 200 dpi render and
   stacked them on one sheet, `fig6_legend_crop.png`, the rotated
   titles turned to read left to right:

   | Piece                      | Box (pt)              |
   | -------------------------- | --------------------- |
   | legend                     | 100, 46, 465, 130     |
   | y-axis title, top panel    | 116, 136, 140, 272    |
   | y-axis title, middle panel | 110, 300, 127, 404    |
   | y-axis title, bottom panel | 124, 440, 139, 562    |
   | x-axis title, top panel    | 260, 283, 360, 294    |
   | x-axis title, middle panel | 260, 377, 360, 390    |
   | x-axis title, bottom panel | 260, 572.5, 360, 583  |
   | caption                    | 90, 597, 535, 640     |

   The middle panel's title box was first cut to y 366 and came out
   truncated; it was widened to y 404 (its text-layer box runs to y
   401 pt; ink counts show nothing below 400 pt in that strip).
   `fig6_legend_only_400dpi.png` is the legend box alone (100, 46, 465,
   130 pt) from the 400 dpi render, for legibility.
4. Only these two crops were looked at.

## What the legend shows

Typed, as read from the crops (characters the scan blurs are marked):

- A long-and-short dashed line with an open circle: "Wind tunnel, fins
  off 13 x 10^6 < R < 14.6 x 10^6" (the first number's second digit is
  blurred; it reads as 13).
- A dashed line with an open square: "Wind tunnel, fins on 6.8 x 10^6 <
  R < 7.6 x 10^6".
- A short-dashed line with a symbol too blurred to name (likely a
  diamond): "Free-flight, fins on 30 x 10^6 < R < 70 x 10^6 (refs. 1
  and 2)".
- "Flagged symbols: Fixed transition".
- "Solid symbols: Data with fins on at fins-off R".

Axis titles: top panel "Total drag coefficient C_DT"; middle panel "Base
drag coefficient C_D" with a subscript too blurred to read (C_Db by the
symbol list, PDF p. 4); bottom panel "Net drag coefficient C_D"; each
panel's x-axis "Mach number, M". One legend serves all three panels.

## Item 1's questions

- **Are tunnel points of the body with fins off plotted?** Yes: the
  legend has a key for them (wind tunnel, fins off, open circle). The
  legend says so for the figure as a whole; whether the circles appear
  in each of the three panels was not looked at.
- **At which stagnation pressure?** The legend states no pressure; it
  states Reynolds numbers based on body length. The fins-off range,
  13 x 10^6 to 14.6 x 10^6, is the 50 psia range: the text (p. 6) puts
  all fins-off tests at 50 psia, at 1.3e6 to 1.4e6 per in, which on
  the 10.150 in body is 13.2e6 to 14.2e6 (computed); the fins-on range,
  6.8 x 10^6 to 7.6 x 10^6, is the 25 psia range the text gives (p. 9).
  The legend's upper fins-off end (14.6 x 10^6) is above the computed
  14.2e6; recorded, not resolved.
- **The fins-on 50 psia check points.** "Solid symbols: Data with fins
  on at fins-off R": the fins-on check points at the fins-off Reynolds
  number (50 psia) are keyed, as solid symbols, so the fins-on and
  fins-off points at the same 50 psia can be told apart from the 25
  psia fins-on points.
- **Also recorded:** "Flagged symbols: Fixed transition" is a key, so
  some plotted points had fixed transition; which ones was not looked
  at. The readers' brief (item 7) should ask each reader to record, for
  every symbol, whether it is open, solid or flagged.

## The consequence, per the entry

Item 6 (i) fails the registration only if the legend check finds no
fins-off tunnel net drag at 50 psia. The legend keys fins-off tunnel
points at the 50 psia Reynolds number, and fins-on points at that same
Reynolds number, on a figure whose bottom panel is the net drag.
**The F1 route through RM L55H09 continues**: fig. 6 goes to the two
blind readings of item 7, under the PDF hash above. Whether enough
qualifying points exist on each side of the tunnel's gap is for the
readings and the pairing (item 6 (ii) to (v)) to decide, not this check.
