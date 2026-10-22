# ARC R&M 3427 figs. 15 and 16: the base pressure across the span and across the base, first reading (method)

**Source.** Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011;
the PDF and its sha256 as in `method_rm3427_fig13.md`). Fig. 15,
"Spanwise uniformity of base pressure", and fig. 16, "Variation of
pressure across base" ((a) zero incidence, (b) 2 deg), both on PDF p. 39
(printed p. 38). Named band-setting by 0014 section 10.7 (k) before this
reading. For design record 0019, F4: how far one hole stands for the
base's mean pressure.

**What they hold.** Fig. 15: Cp_b against the spanwise distance from the
centre-line, in inches, at M 1.0 (diamonds), 0.8 (circles, the tappings,
at -2.5, -1.0 and 0 in; crosses, a pitot probe traversed along the base
0.010 in from it, section 3.3) and 0.4 (squares, with a circle at -2.5 in
on the 0.4 line). Fig. 16: Cp_b against y/h across the base at M 1.0
(diamonds), 0.8 (circles) and 0.4 (squares); three holes in (a), five in
(b), "Upper surface" toward +y/h in (b).

**Method.** The page rendered at 300 dpi (the scan's own resolution),
figs. 15 and 16 cropped at page pixels (860, 640) and (820, 1560). The
plots have no grid, only ticks.

- _Axes._ Each axis line traced along its length (`scripts/gridtrace.py`)
  and its ticks found (`scripts/ticks.py`). The axes are not square to the
  pixels: fig. 15's horizontal axis rises 1.1 px over 540 px; fig. 16(a)'s
  horizontal axis falls 2.7 px over 250 px while its vertical axis leans
  3.0 px over 450 px; fig. 16(b)'s 2.4 and 4.3 px. Values are formed by
  moving each point along the lines of constant value (with the axes'
  own tilts) to where the ticks were measured, then by a least-squares
  straight line through the ticks (`scripts/tickcal.py`; the tick
  positions and tilts in `rm3427_fig15_axes.json`, `rm3427_fig16a_axes.json`,
  `rm3427_fig16b_axes.json`). The ticks' rms residuals: fig. 15, 0.79 px in
  x and 0.63 px in Cp_b; fig. 16(a), 0.27 and 0.36 px; fig. 16(b), 0.02 and
  0.51 px. The axes' zeros are their lines (fig. 15's -4 in and Cp_b 0,
  fig. 16's y/h -0.5), the other values their ticks.
- _Symbols._ Rough centres by eye on zoomed views
  (`rm3427_fig15_rough.csv`, `rm3427_fig16_rough.csv`), fitted by outline
  templates (`scripts/symfit.py`, which now takes diamonds and crosses as
  well). Restarted from four rough centres displaced by 1.5 px
  diagonally, every fit returns to the same centre except three of fig.
  15's (c3, s1, x8; by 0.25 to 0.5 px). One fit stopped at the search's
  edge from its first rough centre (fig. 15's circle at -1 in); restarted
  from a centre placed again by eye, it settles 0.25 px from where it
  stopped, and the record holds the second. Overlays of the fits on the
  scan, checked by eye, sit on every symbol.

**Errors (reading only).** Fit 0.5 px plus the start dependence, with the
ticks' rms, in quadrature: in Cp_b 0.0012 to 0.0016 (1 px is 0.0020); in
the abscissa 0.009 in. (fig. 15) and 0.002 in y/h (fig. 16).

**Results** (`rm3427_fig15_first.csv`, `rm3427_fig16_first.csv`).

- Fig. 15, M 1.0: -0.782, -0.781, -0.781 at -2.5, -1.0, 0 in. M 0.8:
  -0.703, -0.733, -0.744 (tappings); the traverse -0.686 to -0.745 from -3
  to +3 in, flat at -0.740 to -0.745 from -1.25 to +1.25 in. M 0.4: -0.605,
  -0.609, -0.626.
- Fig. 16(a), alpha 0, holes at y/h -0.26, 0.00, +0.14: M 1.0, -0.782,
  -0.786, -0.783; M 0.8, -0.704, -0.747, -0.734; M 0.4, -0.608, -0.630,
  -0.626.
- Fig. 16(b), alpha 2 deg, holes at y/h -0.27, -0.14, 0.00, +0.13, +0.27:
  M 1.0, -0.785 to -0.781; M 0.8, -0.652, -0.683, -0.693, -0.697, -0.668;
  M 0.4, -0.569, -0.594, -0.609, -0.612, -0.599.

**A check between figures.** Figs. 13, 15 and 16(a) plot the same
zero-incidence tests. Read separately, they agree: at M 0.8 the
centre-line -0.7465 (fig. 13, hole 6), -0.744 (fig. 15, 0 in) and -0.747
(fig. 16(a), y/h 0); the hole at y/h +0.14 -0.733 and -0.734 (fig. 13's
squares, hole 5); the hole at y/h -0.26 -0.703 and -0.704 (fig. 13's
triangles, hole 7); at M 0.4 the centre-line -0.627, -0.626 and -0.630,
and hole 7 -0.608 twice; at M 1.0 -0.782 in all three. The largest
difference is 0.003, twice the reading error. It confirms fig. 13's
symbols: circle hole 6, square hole 5 (on the +y/h side), triangle hole
7.

**Points to watch when the band is formed.**

- The three base holes sit at y/h -0.26, 0.00 and +0.14 as fig. 16(a)
  plots them, not symmetrically; fig. 3 gives only "0.1 in" between two of
  them. A mean across the base from three holes (or five at 2 deg) is an
  estimate; section 3.3 of the report says the mean "could not be
  estimated reliably". At M 0.8 the holes differ by up to 0.043 (fig.
  16(a)), and the traverse shows the spanwise fall to -0.686 at 3 in from
  the centre-line (the model spans 14 in), so a base drag on the
  centre-line hole is too high subsonically: by about 0.02 in Cp_b against
  the three holes' mean at M 0.8, more with the spanwise fall; at M 1.0
  the holes and the span agree to 0.005.
- Fig. 15's points at -2.5 in differ from the centre by 0.04 at M 0.8 and
  0.02 at M 0.4: "good" uniformity in the report's words, and part of the
  band.

**Status.** First reading, by the 0019 reader, 2026-10-22. Read once: a
blind second reading is to be arranged. Not yet used for anything.
