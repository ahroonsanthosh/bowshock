# ARC R&M 3427 figs. 9 and 10: the boundary layers ahead of the base, first reading (method)

**Source.** Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011;
the PDF as in `method_rm3427_fig13.md`): fig. 9, "Boundary-layer profiles
on basic model, M = 0.8", and fig. 10, "Variation of boundary-layer
thickness with Mach number", PDF p. 36 (printed p. 35, the page turned).
Named band-setting by 0014 section 10.7 (k) before this reading. For
design record 0019, F4: the layer ahead of the section's base, against
the fins' (the thin-layer parameter, 0019 section 1.3).

**What they hold.** Fig. 9: pitot-traverse profiles, y in inches against
u* (u over its edge value), at the trailing edge (circles, 21) and 1 in
upstream of it (squares, 12), with a 1/7th power law drawn. Fig. 10:
delta/h against M_inf, symbols as fig. 9 (four squares at M 0.4 to 1.1,
one circle at 0.8); its two dashed flat-plate curves (turbulent from the
leading edge, laminar) are estimates and are not read. Section 3.1: the
station 1 in upstream "was chosen as the measuring station since ... the
surface pressure at that point was relatively insensitive to the
conditions on the base".

**Method.** As for figs. 15, 16 and 18 (`method_rm3427_figs15_16.md`): the
page at 300 dpi, figs. 9 and 10 cropped at page pixels (850, 170) and
(850, 1180); no grid, so the axes traced (fig. 9's lean 4 px over 420 px
and fall 3 px over 420 px; fig. 10's 2.7 and 0.8 px) and their ticks
found; values along the axes' tilt by least squares through the ticks
(`rm3427_fig9_axes.json`, `rm3427_fig10_axes.json`; rms 0.30 and 0.02 px
for fig. 9, 0.51 and 0.60 px for fig. 10, where the axis line, taken as
delta/h 0, sits 2.5 px off the ticks' line). Symbols fitted from rough
centres (`rm3427_fig9_rough.csv`, `rm3427_fig10_rough.csv`) with the
template sizes widened (`symfit.py --big`, these symbols being drawn
larger); from four displaced starts every fit returns within 0.5 px but
one: fig. 9's circle at y 0.076 in, which the displaced starts pull onto
the drawn curve; its centre was checked by eye at 10x and is allowed 1 px.
One rough centre (fig. 10's square at M 0.4) was first placed 28 px off
and the fit failed (score 0 at the search's edge); placed again by eye at
6x it fits.

**Errors (reading only).** Fig. 9: 0.001 to 0.003 in u*, 0.00013 to
0.0004 in y. Fig. 10: 0.0014 in M, 0.0004 in delta/h.

**Results** (`rm3427_fig9_first.csv`, `rm3427_fig10_first.csv`). Fig. 10,
1 in upstream: delta/h 0.120 at M 0.40, 0.125 at 0.80, 0.116 at 1.00,
0.101 at 1.10; at the trailing edge 0.144 at 0.80 (delta about 0.075 and
0.086 in on h = 0.6 in). Fig. 9 at M 0.8: the trailing-edge profile from
u* 0.527 at the wall reading (y 0.0001 in) to 0.9996 at y 0.115 in; 1 in
upstream, 0.708 at 0.003 in to 1.00 by about 0.08 in. Fig. 9's profiles
reach u* 0.99 at about 0.085 to 0.09 in (trailing edge) and 0.07 in (upstream),
consistent with fig. 10's delta at M 0.8 (0.086 and 0.075 in) to the
nearest traverse step (0.005 in).

**Points to watch.** The layers are turbulent at the trailing edge from M
0.4 (oil flow, section 3.1), thinner than a flat plate's turbulent from
the leading edge (fig. 10's upper curve) because of the wedge forebody;
a fin's square trailing edge sees its own layer, so the comparison is by
the layer parameter or delta/h, not by Mach number alone. One Reynolds
number per Mach number (fig. 1).

**Status.** First reading, by the 0019 reader, 2026-10-22. Read once.
