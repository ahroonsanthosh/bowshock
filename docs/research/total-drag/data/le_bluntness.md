# Drag of rounded and blunt fin leading edges, Mach 1.5 to 3

Transcriptions for a leading-edge bluntness method (0008 step B4; 0010
section 6 item 1). These are the data such a model would be measured on.
**First readings; second readings pending.** No Basic Finner data were used.

Values, readings and computations are in:

- `le_bluntness.csv` and `le_bluntness_output.txt`, from
  `scripts/le_bluntness.py`;
- `tn2960_fig5c_integration_output.txt` and
  `tn2960_fig7_first_reading.txt`.

## 1. Sources opened

| Source | What it gives | Status |
| --- | --- | --- |
| NACA TN 2960, Gowen and Perkins 1953 (NTRS 19930084018) | Pressure distributions and drag of circular cylinders normal to the stream, M 0.3 to 2.9 | Opened; summary and text pp. 1 to 8; figs. 5(c) (PDF p. 20) and 7 (PDF p. 24) read |
| NACA RM A55H31, yawed circular cylinder at M 3.9 (NTRS 19930088843) | Front-side pressure drag against yaw (sweep), and theory, eq. (14) | Opened; summary, pp. 13 to 15 (eq. 14 on PDF p. 15 read from the page image); fig. 12 not digitised |
| NACA RM A53D02, James and Carros 1953 (NTRS 19930087740) | Free-flight total drag with three fin leading-edge shapes, fig. 17 | Opened; p. 15, fig. 1 (PDF p. 23) and fig. 17 (PDF p. 38) read |
| NACA RM L55G28a, Rumsey 1955 (NTRS 19930088905) | A component estimate including fin leading-edge drag | Opened (table I transcribed earlier, `validation_candidates.md`) |
| Penland, NACA RM L54A14 (cylinder at M 6.86, RM A55H31 ref. 1) | Yawed cylinder, outside the range | **Not opened** |

NTRS searches for swept or yawed cylinders, and for leading-edge bluntness
or radius drag at supersonic speeds, found no other measurement at M 1.5 to
3. Searched with `scripts/ntrs2.py`:

- "leading-edge bluntness drag supersonic wing"
- "blunt leading edge drag supersonic airfoil"
- "yawed cylinder supersonic pressure distribution"
- "swept cylinder supersonic drag"
- "leading-edge radius drag supersonic"
- "inclined circular cylinder supersonic pressure"
- "cylinder cross flow drag Mach number"
- "fin leading edge rocket model drag"
- "blunt leading edges supersonic wings drag"
- "leading-edge sweep heat transfer cylinder Mach"

## 2. TN 2960: the cylinder normal to the stream

**Model and conditions** (pp. 1, 3, 6 to 8):

- A 1 in circular cylinder in the Ames 1 by 3 ft supersonic tunnels No. 1
  and 2.
- Pressure distributions at nine stations along it, with and without an end
  plate.
- Supersonic Reynolds numbers on the diameter "100,000 to 1,000,000".

**Statements:**

- "No effects of Reynolds number were found for flow in the supersonic Mach
  number range of the tests" (summary).
- The stagnation-point pressure coefficient "was, for all supersonic Mach
  numbers, in close agreement with the pitot-pressure coefficient calculated
  with the aid of Rayleigh's equation" (p. 6).
- The separation point lies at 100 to 120 deg (p. 6).
- Suction in the separated region is "only 10 percent" of the total drag at
  M 2.9 (p. 7).
- For M of 3.0 or more, the drag "may be predicted within approximately 5
  percent by Newtonian theory" (p. 8). The report calls the exact agreement
  at M 2.9 (1.333) fortuitous.
- End effects are negligible above fineness ratio 6 (p. 8).

**Fig. 7, total pressure drag** (`tn2960_fig7.py`):

- Calibration is by the grid lines.
- The symbols merge into clusters, and the box centres are used.
- The text gives "about 1.34 at a Mach number of 2.9" (summary).

| M | 1.483 | 1.951 | 2.897 |
| --- | --- | --- | --- |
| C_D | 1.487 | 1.424 | 1.346 |

**Fig. 5(c), pressure coefficient around the cylinder** (`tn2960_fig5c.py`):

- Calibration is by the grid lines (P every 0.4, theta every 20 deg, lean
  corrected).
- The faired curves were read by eye on `img/tn2960/f5c_front.png` and
  `f5c_rear.png`. Where the curve runs between a +theta symbol and its
  flagged -theta twin, the mean of the two is used.
- Conditions: M 1.49 at Re 5.8e5, M 1.98 at 5.5e5, M 2.90 at 7.2e5.

| theta, deg | 0 | 15 | 30 | 45 | 60 | 75 | 90 | 100 | 105 | 120 | 135 | 150 | 165 | 180 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M 1.49 | 1.511 | 1.431 | 1.172 | 0.769 | 0.354 | -0.002 | -0.285 | -0.39 | -0.434 | -0.457 | -0.46 | -0.46 | -0.46 | -0.46 |
| M 1.98 | 1.670 | 1.577 | 1.322 | 0.918 | 0.464 | 0.125 | -0.134 | -0.221 | -0.246 | -0.277 | -0.274 | -0.274 | -0.274 | -0.262 |
| M 2.90 | 1.750 | 1.664 | 1.380 | 0.979 | 0.546 | 0.241 | 0.020 | -0.056 | -0.072 | -0.096 | -0.096 | -0.096 | -0.096 | -0.096 |

The pitot-pressure coefficients at those Mach numbers, by Rayleigh's
equation, are 1.529, 1.654 and 1.750 (computed). The stagnation readings lie
within 0.02 of them, which checks the calibration.

**Integrated** (trapezoid rule, drag per unit span on the diameter):

| M | Front side (0 to 90 deg) | Rear side | Total | Fig. 7 | Front over modified Newtonian, (2/3) Cp_pitot | Front share |
| --- | --- | --- | --- | --- | --- | --- |
| 1.49 | 1.014 | 0.454 | 1.468 | 1.487 | 0.995 | 69% |
| 1.98 | 1.156 | 0.269 | 1.425 | 1.424 | 1.049 | 81% |
| 2.90 | 1.232 | 0.093 | 1.325 | 1.346 | 1.056 | 93% |

The integrated totals reproduce fig. 7 within 0.985 to 1.001, which checks
the reading. Plain Newtonian (4/3) exceeds the measured front side by 8% to
32%.

## 3. RM A55H31: the yawed cylinder

**Conditions** (summary and apparatus section):

- A 1 in cylinder at yaw 0 to 44 deg.
- Ames 8 in low-density tunnel, nominal M 3.9, Re 2.1e3 to 6.7e3.
- A 3 in usable stream. The report suspects three-dimensional flow at 45 and
  60 deg of yaw "due to the 1-inch-diameter model in the 3-inch-diameter
  stream" (p. 13).

**Statements:**

- At 44 deg of yaw "the pressure drag by 60 percent" is reduced over the
  front side (summary).
- The pressure-ratio distribution over the front half is "a unique function
  of the azimuth angle for yaw angles of 0 to 30 deg" over Re 6.7e3 to 1.4e5
  and M 2.48 to 6.86, with ref. 1 and ref. 14's data (pp. 13 to 14).
- Eq. (14) (p. 14): (C_D)_Lambda / (C_D)_Lambda=0 = (p_x=0 / p_t2) cos
  Lambda. Here p_x=0 is the pressure on the stagnation line, taken from
  Rayleigh's equation on the normal Mach number, and p_t2 is the stream
  impact pressure.
- "The agreement between equation (14) and the experimental points is good"
  (fig. 12, M 3.9 and 6.86).
- "at 45 deg of sweep the drag coefficient of the swept leading edge is only
  about 40 percent of its unswept value"; the ratio "approaches cos^3
  Lambda" at high Mach number (p. 15).

**Computed** (`le_bluntness.py` B):

- Eq. (14) gives 0.381 at M 3.9 and 44 deg, a 62% reduction against the
  text's 60%.
- It gives 0.362 at 45 deg, against "about 40 percent". cos^3 45 deg is
  0.354.
- At M 1.5 to 3 the equation is theory only. Its ratios are 0.90 to 0.91 at
  15 deg, 0.66 to 0.69 at 30 deg and 0.37 to 0.42 at 45 deg. At 60 deg and
  above, where the normal Mach number is subsonic, the equation is
  extrapolated with the isentropic stagnation pressure.

## 4. RM A53D02 fig. 17: square-cut against sharp leading edges, free flight

**Geometry** (fig. 1, PDF p. 23; text p. 15):

- Four trapezoidal fins, leading edges swept 71.6 deg, t/c 0.04: 0.030 in
  thick at the root and 0.015 in at the tip.
- Basic edge: an asymmetric 20 deg wedge (section A-A).
- Variant (b): a symmetric 40 deg bevel.
- Variant (c), "blunt": a square-cut face of the full local thickness,
  "composed of elements of the surface of revolution formed by rotating the
  fin plan form about the body axis". It is a flat face, not a radius.

**Conditions.** Free flight in the Ames supersonic free-flight tunnel, with
natural transition (R_T about 1.6e6) and R 1.5e6 to 4.9e6 on length at
M 1 to 3.3 (`rm-a53d02.md`).

**Statements** (p. 15):

- Replacing the basic edge by the blunt one "results in a nearly constant
  incremental increase of about 0.02 in total drag coefficient at Mach
  numbers below 5". That is "4 to 10 percent" of the total, or about 100
  percent of the fin wave drag.
- The bevel has "almost no effect".

**Reading** (`a53d02_fig17.py`):

- Calibration is by the grid lines.
- Circles (blunt) and the basic-configuration line were read by eye on
  `img/a53/f17_lo.png` and `f17_hi.png`. The column runs of the line
  (`a53d02_fig17_curve_output.txt`) are confused by symbols and legend, and
  were not used.

| M | 2.33 | 2.98 | 2.98 | 2.98 | 3.44 | 3.76 | 4.01 | 4.11 | 5.00 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Blunt C_D | 0.428 | 0.349 | 0.338 | 0.324 | 0.319 | 0.256 | 0.259 | 0.260 | 0.186 |
| Basic line | 0.4005 | 0.322 | 0.322 | 0.322 | 0.2785 | 0.251 | 0.233 | 0.2255 | 0.175 |
| Increment | +0.027 | +0.027 | +0.016 | +0.002 | +0.040 | +0.005 | +0.026 | +0.035 | +0.011 |

There is also a circle at M 0.97 (C_D 0.427). The basic line is almost
vertical there, so no increment was read.

Over M 1.5 to 3.0 the increments run +0.002 to +0.027. The three rounds at
M 2.98 alone span 0.025. For scale, each round's scatter about the faired
curve is under +-2% at M 2 (`rm-a53d02.md`), about +-0.006 to +-0.008 here.

**Scale, computed, not a model.** Take the four square faces at the
stagnation pressure of the normal Mach number, times cos^2 of the sweep, on
their frontal area (0.229 of the reference area). That gives 0.026 at
M 2.33 and 0.028 at M 2.98, with normal Mach numbers 0.74 and 0.94.

## 5. RM L55G28a

The report's own component estimate at M 2.75 (table I) puts the fin
leading-edge drag at 0.0416, out of a total of 0.3511. The edge is a 5 deg
wedge rounded to a 0.03 in radius on a 7.0 in body. This is an estimate,
not a measurement. Which of its refs. 8 to 11 it used for the edge is
**[not verified]**; ref. 11 is Moeckel's detached-shock data (RM E50D05).

## 6. The band each source would support

| Source | Supports | Limits |
| --- | --- | --- |
| TN 2960 figs. 5(c), 7 | The front-side pressure drag of an unswept circular edge, measured over modified Newtonian (2/3 Cp_pitot): **0.995 to 1.056** at M 1.49, 1.98, 2.90 (3 points, one facility, first reading) | Two-dimensional cylinder at Re_D 1e5 to 1e6. A fin's edge has the fin's faces behind its shoulder, not a separated wake, and no opened source measures how that changes the front-side pressures: carrying the cylinder over is an analogy |
| RM A55H31 | No band at M 1.5 to 3 (data at M 3.9 and, through ref. 1, 6.86 only); eq. (14) fits those within "good" agreement, not quantified here (fig. 12 not digitised) | Low density (Re 2e3 to 7e3); blockage at 45 deg and above |
| RM A53D02 fig. 17 | No band for a rounded edge. For a square-cut edge on 71.6 deg fins with subsonic normal Mach numbers, increments +0.002 to +0.027 at M 2.3 to 3.0, which a swept-face scale (0.026 to 0.028) brackets | One model family, scatter of the same order as the increment, a flat face not a radius, natural transition |
| RM L55G28a | Nothing: an estimate | |

So a leading-edge model for unswept rounded edges could be measured only as
"front half of a cylinder at modified-Newtonian pressure, band 0.99 to 1.06,
estimated on TN 2960". It would be labelled an analogy for fin edges, with
no gate. For swept rounded edges at M 1.5 to 3 there are no data among the
sources opened: eq. (14) would be an untested theory there and is refused
under 0008 section 6.1.

What none of them measures:

- The drag a rounded edge adds over a sharp one, on a fin, at M 1.5 to 3.
- The effect of the edge's entropy layer and of the expansion behind the
  shoulder on the fin faces.
- Edges whose Reynolds number on the diameter is below 1e5 at these Mach
  numbers. RM A55H31's p. 13 statement covers the front-side pressure ratio
  down to 6.7e3, but only at M 2.48 to 6.86.

## 7. Second readings pending

- TN 2960 figs. 5(c) and 7.
- RM A53D02 fig. 17.
- RM A55H31 fig. 12 (not yet read once).
