# Readers' brief: NACA TR 1051, figure 23(b) (0014 10.7 (ah), round 19)

For two blind readings of one figure. Each reader gets only this brief and
the PDF named below. The brief holds no value from the repository or from
any earlier reading: what to read and how only.

## 1. The rules

1. **Work without the repository.** Do not open, clone, list or search the
   bowshock repository, any branch, worktree or copy of it, its website or
   its issues. Readings of this figure exist there; a reading made after
   seeing them is not blind and cannot be used.
2. **Use only the PDF given.** It is
   `/tmp/claude-0/-home-user-bowshock/dd60fc51-836c-5183-86f3-15ab54467394/scratchpad/f23b-readers/pdf/tr1051.pdf`
   (SHA-256 `7f1ef2febdb72a404ea698b0c77d91246cf03302fd4b7ef2f125040929f5b6d4`;
   check it). Copy it into your own folder and work there. Do not look for
   this figure's values anywhere else: no other report, compilation, web
   page or tool that quotes them.
3. **Stay in your own folder.** Your folder is `f23b-readers/A` or
   `f23b-readers/B` under the scratchpad above, as your task says. Do not
   open, list or search any other folder of that scratchpad (it holds other
   readings of this figure). Do not open the other reader's folder.
4. **Read every measured symbol as plotted.** Do not round, correct, smooth
   or interpolate. Lines drawn through the symbols are fairings, not data:
   do not read them. If a symbol looks out of line, read it as plotted and
   flag it.
5. **Ambiguous symbols keep every reading.** If a symbol could belong to
   more than one Mach number or curve, or symbols overlap, give the most
   likely reading and every other plausible one in `alternatives`, and say
   in the method note what you saw.
6. **Illegible symbols stay empty.** Leave the value empty and flag it
   `illegible`. Never guess.

## 2. What to read

- TR 1051, figure 23(b) (on or near PDF page 21): base pressure against
  sting diameter over base diameter. Read **every** measured symbol in
  panel (b), at every Mach number it shows, from the thinnest sting to the
  thickest.
- Also copy, word for word, the figure's title, its panel caption and its
  legend (each symbol's Mach number, Reynolds number and any length ratio),
  and any sentence in the report's text that says what figure 23(b) shows
  or how its models were supported and tripped. Give page numbers.
- Calibrate the axes from at least two labelled gridlines on each axis.
  State how you did it (pixel scan, overlay, by eye at what zoom) and the
  render resolution.

## 3. What to hand in

In your folder:

- `f23b.csv` with columns
  `mach,legend_symbol,d_over_h,p_b,d_over_h_error,p_b_error,flags,alternatives`.
  One row per measured symbol. `p_b` is the base pressure coefficient as
  the axis gives it, sign as plotted. Errors are your reading errors, one
  standard of your own choosing, stated in the note. Flags: `illegible`,
  `ambiguous`, `out-of-line`, `overlap`, separated by `;`.
- `method.md`: how you read, the axis calibration, the render resolution,
  the quoted title, caption, legend and text, every flag explained, and
  anything about the figure a later user should know (for example which
  Mach number has its first symbol at which sting).
- `sha256.txt`: the PDF's SHA-256 as you computed it.

Do not commit anything to any repository. When done, report the folder's
file list, the number of symbols read at each Mach number, and the thinnest
sting at which each Mach number has a measured symbol. Do not report the
pressure values themselves in your final message.
