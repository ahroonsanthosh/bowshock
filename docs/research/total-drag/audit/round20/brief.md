# Readers' brief: NACA TN 2360, figures 5 and 7 (0014 10.7 (ah), round 20)

For two blind readings of two figures. Each reader gets only this brief and
the PDF named below. The brief holds no value from the repository or from
any earlier reading: what to read and how only.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search the
   bowshock repository, any branch, worktree or copy of it, its website or
   its issues. Readings of these figures exist there; a reading made after
   seeing them is not blind and cannot be used.
2. **Use only the PDF given.** It is
   `/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/f5-readers/pdf/tn2360.pdf`
   (SHA-256 `95937173fa78bdd41e24a3caded6d06779df885263b66c23f13225a18d742a59`;
   check it). Copy it into your own folder and work there. Do not look for
   these figures' values anywhere else: no other report, compilation, web
   page or tool that quotes them.
3. **Stay in your own folder.** Your folder is `f5-readers/A` or
   `f5-readers/B` under the scratchpad above, as your task says. Do not
   open, list or search any other folder of that scratchpad (it holds other
   readings of this report). Do not open the other reader's folder.
4. **Read every measured symbol as plotted.** Do not round, correct, smooth
   or interpolate. Lines drawn through or near the symbols (fairings,
   averages, theory) are not data: do not read them. If a figure has no
   symbols at all, say so and read nothing from it. If a symbol looks out
   of line, read it as plotted and flag it.
5. **Ambiguous symbols keep every reading.** If a symbol could belong to
   more than one configuration, Mach number or curve, if symbols overlap,
   or if a symbol is partly hidden (by a line, another symbol or the
   frame), give the most likely reading and every other plausible one in
   `alternatives`, flag it, and say in the method note what you saw.
6. **Illegible symbols stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.

## 2. What to read

- TN 2360, figure 5 (every panel) and figure 7 (every panel). Find them in
  the PDF yourself. Read **every** measured symbol in each panel, for every
  configuration, Mach number and Reynolds number shown, including the body
  without tail surfaces.
- For each figure and panel, copy word for word the title, caption, axis
  labels and legend (each symbol's meaning), and any sentence in the
  report's text that says what the figure shows, at what Reynolds numbers,
  with what support (sting size) and what boundary-layer state. Give page
  numbers.
- Calibrate the axes from at least two labelled gridlines or tick marks on
  each axis. A log axis (Reynolds number is often plotted on one) must be
  calibrated as a log axis; say which axes are. State how you calibrated
  (pixel scan, overlay, by eye at what zoom) and the render resolution.

## 3. What to hand in

In your folder:

- `f5f7.csv` with columns
  `figure,panel,mach,configuration,legend_symbol,x_quantity,x,y_quantity,y,x_error,y_error,flags,alternatives`.
  One row per measured symbol. `x_quantity` and `y_quantity` name the axes
  as the figure labels them (for example Reynolds number, base pressure
  coefficient). Values as the axes give them, sign as plotted. Errors are
  your reading errors, one standard of your own choosing, stated in the
  note. Flags: `illegible`, `ambiguous`, `partly-hidden`, `out-of-line`,
  `overlap`, separated by `;`.
- `method.md`: how you read, the axis calibration, the render resolution,
  the quoted titles, captions, legends and text, every flag explained, and
  anything about the figures a later user should know.
- `sha256.txt`: the PDF's SHA-256 as you computed it.

Do not commit anything to any repository. When done, report the folder's
file list and the number of symbols read in each panel, by configuration
and Mach number. Do not report the values themselves in your final
message.
