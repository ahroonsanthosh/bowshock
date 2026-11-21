# Readers' brief: NACA RM L55H09, figure 6 (0014 10.7, the 2026-11-20 F1 entry, item 7)

For two blind readings of one figure. Each reader gets only this brief and
the PDF named below. The brief holds no value from the repository or from
any earlier reading: what to read and how only.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search the
   bowshock repository (/home/user/bowshock or any copy, branch or
   worktree of it, including anything under /home/user/bowshock/.claude),
   its website or its issues. Do not open /home/user/bowshock-runs either.
   A reading made after seeing anything there is not blind and cannot be
   used.
2. **Use only the PDF given.** It is `/tmp/scratch/f1-readers/pdf/l55h09.pdf`
   (SHA-256 `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b`;
   check it). Copy it into your own folder and work there. Do not look for
   this figure's values anywhere else: no other report, compilation, web
   page or tool that quotes them.
3. **Stay in your own folder.** Your folder is `/tmp/scratch/f1-readers/A`
   or `/tmp/scratch/f1-readers/B`, as your task says. Do not open, list or
   search any other folder under `/tmp/scratch` or the session scratchpad.
   Do not open the other reader's folder.
4. **Read every measured symbol as plotted.** Do not round, correct, smooth
   or interpolate. Lines drawn through or near the symbols (fairings) are
   not data: do not read them where symbols exist. If a curve in the
   figure has no symbols at all, read that curve at these Mach stations
   only: every 0.02 from 0.82 to 1.04, and every 0.02 from 1.14 to 1.40,
   plus each end of the curve; mark such rows `curve` in flags. If a
   symbol looks out of line, read it as plotted and flag it.
5. **Mark every symbol's kind.** The legend distinguishes open symbols,
   solid symbols and flagged symbols. Record for each symbol whether it is
   open, solid or flagged (column `kind`), and its shape.
6. **Ambiguous symbols keep every reading.** If a symbol could belong to
   more than one configuration or curve, if symbols overlap, or if a
   symbol is partly hidden (by a line, another symbol or the frame), give
   the most likely reading and every other plausible one in
   `alternatives`, flag it, and say in the method note what you saw.
7. **Illegible symbols stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.

## 2. What to read

- RM L55H09, figure 6, every panel (total drag, base drag and net drag
  against Mach number). Find it in the PDF yourself. Read **every**
  measured symbol in each panel, for every configuration shown (wind
  tunnel fins off, wind tunnel fins on, free flight, and any others).
- Copy word for word the caption, axis labels and legend (each symbol's
  meaning), and any sentence in the report's text that says what the
  figure shows, at what Reynolds numbers or stagnation pressures, with
  what support, and what boundary-layer state. Give page numbers.
- Calibrate the axes from at least two labelled gridlines or tick marks on
  each axis, per panel. State how you calibrated (pixel scan, overlay, by
  eye at what zoom) and the render resolution.

## 3. What to hand in

In your folder:

- `fig6.csv` with columns
  `figure,panel,configuration,legend_symbol,kind,x_quantity,x,y_quantity,y,x_error,y_error,flags,alternatives`.
  One row per measured symbol (or curve station, rule 4). `x_quantity` and
  `y_quantity` name the axes as the figure labels them. Values as the axes
  give them, sign as plotted. Errors are your reading errors, one standard
  of your own choosing, stated in the note. Flags: `illegible`,
  `ambiguous`, `partly-hidden`, `out-of-line`, `overlap`, `curve`,
  separated by `;`.
- `method.md`: how you read, the axis calibration, the render resolution,
  the quoted caption, legend and text, every flag explained, and anything
  about the figure a later user should know.
- `sha256.txt`: the PDF's SHA-256 as you computed it.

Do not commit anything to any repository. When done, report the folder's
file list and the number of symbols read in each panel, by configuration.
Do not report the values themselves in your final message.
