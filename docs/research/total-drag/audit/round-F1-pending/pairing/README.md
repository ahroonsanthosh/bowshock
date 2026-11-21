# RM L55H09 fig. 6: the pairing rule (written before any comparison)

The neutral pairing of the two blind readings of RM L55H09 fig. 6 that
item 7 of the dated entry "2026-11-20, RM L55H09 and RM L9I30 seen for
their geometry only; F1's figures named before any is read"
(docs/design/0014-refusals.md section 10.7) asks for. The pairing party
reads no value of the figure, never opened the PDF, sets no band and
computes no drag model, ratio or band.

This file was written, and committed, before `pair_fig6.py` was written
or run and before any value of reader A was set against any value of
reader B. The only things looked at in the two CSVs before writing it
were their column names, the labels they use for panels,
configurations, legend symbols and kinds, the flags, and the error
values each reader states (to know their form). The rule below is not
changed after the comparison; if it had to be, the change would be a new
dated section below, with the reason, and the first result kept.

## Inputs

- `../A/fig6.csv` and `../B/fig6.csv`, the readers' files as handed in,
  copied unchanged from their folders (their SHA-256 in `sha256.txt`
  here, computed when the pairing runs).
- Both readers report the PDF SHA-256
  `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b`
  (`../A/sha256.txt`, `../B/sha256.txt`), the hash the brief names and
  the legend check recorded. Checked by the pairing party with
  `sha256sum` on the brief's PDF and on each reader's copy, without
  opening it: all three match.

## The rule

1. **Panels.** A's "top (total drag)", "middle (base drag)", "bottom (net
   drag)" are B's "a (top): total drag", "b (middle): base drag", "c
   (bottom): net drag". Rows are matched only within one panel.

2. **Groups (configuration and the kinds that define it).** Within a
   panel, rows are matched only within one group:
   - `FO`, wind tunnel, fins off (circles), kind open or flagged (or a
     kind left empty);
   - `FN`, wind tunnel, fins on (squares), kind open or flagged: the
     25 psia points by the legend;
   - `FS`, wind tunnel, fins on at the fins-off R (solid squares): A
     writes the configuration "wind tunnel, fins on, data at fins-off R",
     kind solid; B writes "Wind tunnel, fins on", kind solid. Solid
     against not solid is a configuration difference (50 against 25
     psia), so a solid square in one reading and an open or flagged one
     in the other are never matched: each is read once;
   - `FF-sym`, free flight, symbols (diamonds);
   - `FF-curve`, free flight, a curve read at stations (kind `curve`).
     A curve station in one reading and a symbol in the other are never
     matched.

3. **Open against flagged.** Within `FO` and `FN`, kind open and kind
   flagged are both the same configuration at the same stagnation
   pressure (the legend's flag means fixed transition). A pair whose
   kinds differ (one open, one flagged) is still matched and tested on
   its values; its `kind_status` is `kind-differs`, and the summary
   counts agreed pairs both with and without such pairs. Nothing is
   settled about which kind is right.

4. **Matching by Mach number (symbols and curve stations alike).** Two
   rows of one panel and one group are candidates when
   |x_A - x_B| <= max(e_xA, e_xB) + 0.01, with each reader's x error as
   written. Matching is one to one, greedy over all candidate pairs of
   the group sorted by |x_A - x_B| ascending; an exact tie in
   |x_A - x_B| is broken by the smaller |y_A - y_B|, then by A's row
   order, then by B's. Each row is used at most once. The y value plays
   no part in matching except to break an exact tie in x. Curve stations
   are matched by this same rule (stations are 0.02 apart, more than the
   window), which pairs the same station in the two readings and pairs
   curve ends only where they lie within the window.

5. **Rows that cannot be matched.** A row with an empty x or y (flagged
   `illegible`) is never matched. Every row not matched, for whatever
   reason, is **read once** and sets nothing.

6. **The registered test (item 6 (ii) and item 7).** A matched pair
   **agrees** only if |x_A - x_B| <= e_xA + e_xB and
   |y_A - y_B| <= e_yA + e_yB, each reader's stated errors as written
   (both are one-standard-deviation reading errors by their method
   notes), the sum taken exactly in decimal arithmetic on the strings as
   written. Otherwise it **disagrees** and sets nothing, with the amount
   beyond recorded. Nothing is averaged, rounded, corrected or settled:
   both readings stay side by side in `pairing.csv`.

7. **Alternatives.** Both readers write alternatives as free text (a
   possible second symbol, a possible flag, "not a symbol"). They are
   not machine-testable, so they are carried through verbatim in
   `pairing.csv` and not used to make a pair agree or to create a
   match. A row whose alternative says it may not be a symbol stays in
   the pairing as read; the summary does not drop it.

8. **The summary for item 6.** For the bottom panel (net drag) and the
   middle panel (base drag), for groups `FO` and `FS`, the summary lists
   the Mach numbers (both readings' x) of agreed pairs, on each side of
   the tunnel's data gap of Mach 1.04 to 1.13: **below** when both
   readings' x are at or below 1.04, **above** when both are at or above
   1.13 and at or below 1.41, otherwise listed as straddling or outside.
   For the net drag only (item 2: base drags set nothing), each agreed
   `FS` pair is also marked, without forming any value, for whether a
   fins-off value could be taken for it under item 7's last sentence: an
   agreed `FO` pair of the same panel whose x lies within 0.01 of the
   `FS` pair's x in both readings, or two agreed `FO` pairs on the same
   side of the gap, no more than 0.05 apart in Mach in both readings, one
   at or below and one at or above the `FS` pair's x in both readings.
   Only existence is checked; no interpolation is computed. The summary
   then states whether item 6 (v)'s "fewer than two qualifying points on
   a side" holds as far as item 6 (ii) and item 7's fins-off rule reach;
   items 6 (iii) and (iv) need the model and are not the pairing party's.

## Outputs

- `pair_fig6.py`: the script that applies this rule (run with
  `python3 -I pair_fig6.py` from this folder).
- `pairing.csv`: every matched pair (both readings side by side, the
  differences, the summed errors, the status) and every row read once.
- `summary.md`: the counts and the item 6 listing.
- `sha256.txt`: SHA-256 of the two readers' CSVs and of the outputs.
