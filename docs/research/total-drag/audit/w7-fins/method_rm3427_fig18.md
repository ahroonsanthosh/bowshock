# ARC R&M 3427 fig. 18: the Reynolds number's effect on base pressure, first reading (method)

**Source.** Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011;
the PDF as in `method_rm3427_fig13.md`), fig. 18, "Effect of Reynolds
number on base pressure", PDF p. 41 (printed p. 40). Named band-setting by
0014 section 10.7 (l) before this reading. For design record 0019, F4:
whether the section's base pressure depends on the Reynolds number at
the population's fin Reynolds numbers (3.1e5 to 4.0e6 on the mean chord).

**What it holds.** Cp_b at M 0.8 at three chord Reynolds numbers, the
tunnel's stagnation pressure raised for the higher two (section 3.4: "the
effect of doubling the chord Reynolds number was to increase the
base-pressure coefficient by less than 1%"). The hole is not named; the
report compares tests by hole 6 (section 3.3), and the lowest point
agrees with fig. 13's hole 6 at M 0.8 (below).

**Method.** As for figs. 15 and 16 (`method_rm3427_figs15_16.md`): the page
at 300 dpi, cropped at page pixels (830, 1000); no grid, so the axes
traced (the vertical one leans 5 px over 540 px, the horizontal one falls
2 px over 540 px) and their ticks found against the axis's local position
(Cp_b -0.8, -0.75, -0.7; Re 0, 2e6, 4e6, 6e6; the Cp_b axis is broken
below -0.7); values along the axes' tilt by a least-squares line through
the ticks (`rm3427_fig18_axes.json`; rms 0.44 px in Cp_b, 0.08 px in Re).
The three circles fitted from rough centres (`rm3427_fig18_rough.csv`),
returning to the same centres from four displaced starts.

**Errors (reading only).** 0.00013 in Cp_b (1 px is 0.0002: the axis
spans 0.1 in Cp_b over 497 px) and 0.005e6 in Re.

**Results** (`rm3427_fig18_first.csv`). Re 2.32e6, 3.38e6, 4.51e6: Cp_b
-0.7453, -0.7435, -0.7413. Doubling the Reynolds number (2.32e6 to 4.51e6)
raises Cp_b by 0.0040, 0.5% of it: the report's "less than 1%". The
lowest point, the tunnel's usual stagnation pressure, is 0.0012 above fig.
13's hole 6 at M 0.80 (-0.7465), inside the two readings' errors and the
drawing's.

**Point to watch.** One Mach number (0.8, in the vortex-street regime),
Re 2.3e6 to 4.5e6, turbulent layers: it says nothing below Re 2.3e6 or
near Mach 1, where the population's fins with laminar layers (Re below
1e6 on the mean chord, 32.5% of the cases) would need another source.

**Status.** First reading, by the 0019 reader, 2026-10-22. Read once.
