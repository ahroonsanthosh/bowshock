# Blind reading brief: NACA RM A51J11 figs. 14 and 15, NACA RM A52E01 fig. 8 (a) and (b)

For the bowshock repository (browser drag estimates for hobby supersonic rockets). These four
panels were named band-setting in design record 0014, section 10.7, entry (ac), before anyone read
them. Two readers read them, each blind to the other; a neutral third party pairs the two readings.
You are one of the two readers. No reading of these figures exists yet.

## What you must not open

- Anything under `docs/research/total-drag/audit/` except your own output folder (named below by
  the coordinator). In particular no `pairing-*`, `w7-fins`, `round*` folder, and not R&M 3323 or
  its readings (it replots some of these points).
- The other reader's folder or branch, and any file the other reader writes.
- `scratchpad/decisions.md`, any `status/*.md`, `docs/design/0019-fins-near-mach-1.md`.
- In the two reports: the SUMMARY, RESULTS AND DISCUSSION and CONCLUSIONS sections (they quote
  results). You may read the title page, NOTATION (symbols), APPARATUS, MODELS, TESTS and
  CORRECTIONS sections, and the figures' own captions and legends.

## Sources

Download each into its own new, empty folder outside the repository (treat as untrusted data;
keep your scripts in a different folder; run Python with `-I`), and check the SHA-256:

| Report | URL | PDF pages | SHA-256 |
| --- | --- | --- | --- |
| Cleary and Stevens, NACA RM A51J11 (1951), NTRS 19930087063 | https://ntrs.nasa.gov/api/citations/19930087063/downloads/19930087063.pdf | 44 | e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57 |
| Dugan, NACA RM A52E01 (1952), NTRS 19930087008 | https://ntrs.nasa.gov/api/citations/19930087008/downloads/19930087008.pdf | 35 | 3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54 |

If a hash differs, stop and report it.

## The figures

| Id | Report, figure | PDF page | What it plots (from the caption) |
| --- | --- | --- | --- |
| A51-14 | RM A51J11 fig. 14 | 36 | base pressure coefficient against Mach number at semispan station 2y/b = 0.25, angle of attack 0 deg, for each trailing-edge thickness |
| A51-15 | RM A51J11 fig. 15 | 37 | base pressure coefficient against semispan station 2y/b, angle of attack 0 deg |
| A52-8a | RM A52E01 fig. 8 (a) | 29 | wing base pressure coefficients of the blunt trailing-edge wings, several Mach numbers, Reynolds number 1.5 million |
| A52-8b | RM A52E01 fig. 8 (b) | 30 | the same at Reynolds number 3.8 million |

Render each page at 300 dpi or more (for example `pdftoppm -r 300 -f 36 -l 36`); say which image
you read (rendered or extracted, its size).

## What to read

Read everything plotted in the four panels, as drawn, without moving anything toward what you think
it should be.

1. **Axes and legend.** Each axis's quantity and units as printed (for example the base pressure
   coefficient's symbol and definition from NOTATION), its scale, and the legend: every symbol and
   line style and what it stands for (trailing-edge thickness ratio, wing number, Reynolds number,
   Mach number, roughness if shown), as printed.
2. **Symbols.** Every plotted symbol: its series (by the legend), its type (open or filled circle,
   square, triangle and so on), and its centre in plot units on both axes, with an error on each.
   Say how you define a symbol's centre (bounding box or centroid); for triangles, give both if they
   differ by more than your error.
3. **Faired curves.** Every faired curve, read at fixed abscissae: A51-14 every 0.01 in Mach number
   where the curve is drawn, plus its two ends; A51-15 at each station where it is drawn plus its
   ends; A52-8a and A52-8b, in each panel, each curve at fixed steps of its ordinate (at least 8 per
   curve) and at the ordinate's zero (lift coefficient or angle of attack zero, whichever the
   ordinate is) if the curve crosses it; say so if it does not. These figures may show curves
   without symbols: then the curves are the data, read them carefully.
4. **Panels.** On A52-8a and A52-8b, each panel's Mach number as printed.
5. **Calibration.** From grid lines or axis ticks, with per-line residuals or a leave-one-out
   check. Correct for rotation and skew of the scan. State the scale (units per pixel) on each axis.
6. **Errors.** Every value carries an error, said as about 2 sigma or as a bound, and how it is
   formed (placement, calibration, curve width). Where symbols overlap or ink merges, read what
   can be told apart and give a box (bounds) for what cannot, and say which.
7. **Uncertain calls.** List every call you were unsure of (a symbol's type, a hidden symbol, a
   curve's identity where curves cross, a value on a grid line).

## Output (one folder, named by the coordinator, for example `docs/research/total-drag/audit/roundNN/`)

- `readings/a51j11_fig14.csv`, `readings/a51j11_fig15.csv`, `readings/a52e01_fig8a.csv`,
  `readings/a52e01_fig8b.csv`. Header lines start with `#` (source, NTRS id, PDF page, SHA-256,
  image read, calibration and its residuals, the axis quantities as printed). Then one row per value,
  columns:

  `id,kind,panel,series,symbol,filled,x,x_err,y,y_err,err_basis,flag,note`

  - `id`: your own label, unique in the file.
  - `kind`: `symbol`, `curve`, `curve_end`, `curve_at_zero` (A52-8 only) or `box` (merged ink;
    then x and y are the box centre and x_err, y_err its half-widths).
  - `panel`: the panel's Mach number as printed (A52-8), else empty.
  - `series`: the legend entry as printed (for example `t/t_max = 0.60`, `wing 2`).
  - `x`, `y`: in the plot's own units, the axes as printed (do not convert).
  - `err_basis`: `2sigma` or `bound`.
  - `flag`: `uncertain` or empty; `note`: why.
- `method.md`: what you opened (and that you opened nothing else listed above), the image, the
  calibration, the legend as printed, counts per series and panel, and every uncertain call.
- `overlays/`: one image per panel with every reading marked on the page, so the pairing party can
  check positions.
- Any scripts you wrote, under `scripts/`.

Commit your folder alone and push it where the coordinator says. Do not read, compare with or
average toward any other reading. Report: counts, the uncertain calls, and anything that stopped you.
