# 0007: Skin friction

- **Status:** Draft. A library with tests (`src/friction/`); nothing on the
  drag page.
- **Date:** 2026-10-18
- **Inputs:** NACA TN 3097, NACA RM L54G14, NACA TN 2597, NACA RM A53D02
  (method only) and the Turbulence Modeling Resource (TMR) van Driest II
  file (`docs/validation/sources.md`); step B2 of the total-drag research
  draft, whose numbers were recomputed here, not taken over.

Every number below is produced by a test named with it, or by the
measurement recorded in it. Ratios are model over data minus one unless
stated.

## 1. What is implemented

- `karman-schoenherr.ts`: the Karman-Schoenherr law 0.242 / sqrt(CF) =
  log10(Re_x CF) (as TN 3097 p. 9 and RM L54G14 p. 10 state it) and its
  exact local forms, Re_theta = Re_x CF / 2 and cf = dY / dRe_x; the TMR's
  curve fit of it in Re_theta.
- `van-driest.ts`: van Driest II as the TMR page states it; adiabatic wall
  at the recovery factor 0.89 or a given wall temperature; Sutherland's law
  with S = 110.4 K.
- `laminar.ts`: the compressible laminar similarity solution (constant
  Prandtl number, default 0.72; Sutherland's law), by shooting with RK4 and
  Newton's method.
- `flat-plate.ts`: laminar to a given transition Reynolds number, then
  turbulent from a virtual origin with the same momentum thickness (TN 3097
  pp. 8 to 9; RM A53D02 p. 8).
- `body-friction.ts`: the axial friction drag of a body of revolution at
  free-stream conditions, C_D on the cross-section and the average cf on
  the wetted area, by one of two methods the caller names: the flat plate at
  the local Reynolds number of the surface distance from the tip
  (`local-reynolds`), or the axisymmetric momentum integral d(r theta)/ds =
  r cf / 2 closed by the flat-plate cf(Re_theta) (`momentum-integral`).

Assumed by all (docstrings): edge conditions equal to the free stream, no
pressure gradient, a smooth wall at one temperature, transition as a step,
flat-plate closures.

## 2. Verification: the implementation against exact and published solutions

| Check                                                                           | Measured                      | Test                        |
| ------------------------------------------------------------------------------- | ----------------------------- | --------------------------- |
| van Driest II against the TMR file, all 9924 points of its 4 cases              | 2.4e-7 to 4.7e-7 relative     | `van-driest.test.ts`        |
| TMR curve fit against the exact local Karman-Schoenherr law, Re_theta 200-25000 | 1.84e-4                       | `karman-schoenherr.test.ts` |
| Laminar, C = 1 (Blasius 0.664115) and constant C (sqrt(C) times Blasius)        | 1e-9                          | `laminar.test.ts`           |
| Laminar, Pr = 1: Crocco-Busemann temperature; recovery factor 1                 | 1e-8; 1e-9                    | `laminar.test.ts`           |
| Laminar, C = 1, Pr = 0.72: recovery factor against Pohlhausen's quadrature      | 1e-6                          | `laminar.test.ts`           |
| Laminar, step and domain                                                        | 1e-9, fourth order            | `laminar.test.ts`           |
| Laminar against van Driest, TN 2597 fig. 3 (Pr 0.75), 32 points, M 0.26 to 10.3 | -0.34% to +0.84%, mean +0.38% | `laminar.test.ts`           |
| Body, both methods, against closed forms on cones and cylinders                 | 1e-6                          | `body-friction.test.ts`     |
| Body, momentum integral, laminar cone: Mangler's factor sqrt(3)                 | 1e-6                          | `body-friction.test.ts`     |
| Body, panels; seven nose shapes                                                 | second order; 2e-6            | `body-friction.test.ts`     |

The TMR file was computed with the TMR's rounded fit of Karman-Schoenherr,
so the 1e-6 comparison uses that fit; the library's own law is the exact
form, 1.84e-4 from the fit over the file's range. The TN 2597 points were
read from the scan (`src/validation/laminar-tn2597.ts`); the report claims
0.5%, and the readings may sit about 0.4% low (its Blasius point reads
1.323 against 1.328).

## 3. Model-form error against data

### 3.1 NACA TN 3097 table III: cylinders, tunnel

Cylinders 1 in in diameter behind a 20 degree cone, fineness 8, 13, 23,
direct force, tripped, referred to fully turbulent flow from a zero-thickness
origin, adiabatic; table III (p. 33) is CF / (CF_i)exp, the cylinders' own
incompressible friction as reference. Model: van Driest II flat plate,
adiabatic at r = 0.89, over Karman-Schoenherr at the same Re.

The report does not state the stagnation temperature (searched: the text
layer, the notation, every figure caption and figure page). Its tunnel
blew down from a reservoir whose total temperature fell about 4 F per
minute (p. 14), so it is bracketed at 250 to 310 K; Re is bracketed at
6e6 to 16e6 (fig. 19).

| M    | (a)   | (b)   | Model, Re 1e7, T0 280 K | vs (a) | vs (b) | Over the brackets |
| ---- | ----- | ----- | ----------------------- | ------ | ------ | ----------------- |
| 1.99 | 0.745 | 0.757 | 0.7942                  | +6.6%  | +4.9%  | +4.3% to +7.4%    |
| 2.49 | 0.671 | 0.672 | 0.7256                  | +8.1%  | +8.0%  | +7.0% to +9.3%    |
| 2.95 | 0.623 | 0.630 | 0.6685                  | +7.3%  | +6.1%  | +4.8% to +8.9%    |
| 3.36 | 0.578 | 0.571 | 0.6231                  | +7.8%  | +9.1%  | +6.2% to +11.1%   |
| 3.60 | 0.551 | 0.552 | 0.5990                  | +8.7%  | +8.5%  | +6.7% to +10.9%   |

Sensitivities at Re 1e7 and 280 K: T0 of 250 and 310 K, +0.2 to +0.6% and
-0.2 to -0.5%; Re of 6e6 and 16e6, +0.5 to +1.3% and -0.4 to -1.1%; the
report's Sutherland constant (216 R = 120 K), +0.2 to +0.5%; r = 0.91,
-0.4 to -0.7%; the wall measured at M = 3.4 (Tw / Tt = 0.940, fig. 11(a),
against 0.924 for r = 0.89), -0.5%. The research draft's range (+3.5% to
+11.7%, with T0 of 290 to 330 K and Re of 4e6 to 3e7) is consistent.

The comparison is of the compressibility transformation. The cylinders'
incompressible level lies 2.5% below to 1.4% above Karman-Schoenherr (L/D 8
to 23, p. 18), which moves the absolute comparison by that much.

TN 3097's own fig. 1 (p. 35) labels a curve "Van Driest (II)" that lies far
above its data (about 0.9 near Mach 4). The report is of 1954, so that
label cannot name the 1956 method used here: names of theories in the
reports of the time are not to be read as today's methods.

### 3.2 NACA RM L54G14 fig. 10: the RM-10 body in flight

The full-scale parabolic RM-10 body, smooth (below 60 microinches), friction
averaged over the wetted area ahead of a rake at station 125 from the
measured momentum; fig. 10 gives CF / CF_i at zero heating, CF_i
Karman-Schoenherr at the same Re, "most" points at Re about 60e6 (p. 8).
Thirteen points were digitised from the scan, centre dot by centre dot, to
about +-0.002 in CF / CF_i (method in `src/validation/skin-friction-rm-l54g14.ts`).
The report compares with "Van Driest's theory" of 1950 (its ref. 2), not
shown to be van Driest II, so its "7 percent" is not reused.

Model at Re 60e6 and 250 K, adiabatic, on the body ahead of the rake (body
methods) or as a flat plate at the rake's Re:

| M     | Measured | Flat plate      | Momentum integral | Local Reynolds number |
| ----- | -------- | --------------- | ----------------- | --------------------- |
| 1.040 | 0.9527   | 0.9221 (-3.2%)  | 0.9320 (-2.2%)    | 0.8627 (-9.5%)        |
| 1.078 | 0.9379   | 0.9169 (-2.2%)  | 0.9268 (-1.2%)    | 0.8578 (-8.5%)        |
| 1.102 | 0.9865   | 0.9136 (-7.4%)  | 0.9235 (-6.4%)    | 0.8546 (-13.4%)       |
| 1.141 | 1.0093   | 0.9082 (-10.0%) | 0.9180 (-9.1%)    | 0.8494 (-15.8%)       |
| 1.168 | 0.9314   | 0.9043 (-2.9%)  | 0.9141 (-1.9%)    | 0.8458 (-9.2%)        |
| 1.180 | 0.9676   | 0.9026 (-6.7%)  | 0.9124 (-5.7%)    | 0.8442 (-12.8%)       |
| 1.200 | 1.0100   | 0.8997 (-10.9%) | 0.9094 (-10.0%)   | 0.8414 (-16.7%)       |
| 1.840 | 0.8395   | 0.8000 (-4.7%)  | 0.8088 (-3.7%)    | 0.7468 (-11.1%)       |
| 2.380 | 0.7825   | 0.7144 (-8.7%)  | 0.7225 (-7.7%)    | 0.6658 (-14.9%)       |
| 2.559 | 0.6653   | 0.6873 (+3.3%)  | 0.6951 (+4.5%)    | 0.6401 (-3.8%)        |
| 2.700 | 0.7950   | 0.6666 (-16.2%) | 0.6742 (-15.2%)   | 0.6205 (-22.0%)       |
| 2.741 | 0.7740   | 0.6607 (-14.6%) | 0.6682 (-13.7%)   | 0.6149 (-20.6%)       |
| 2.901 | 0.7117   | 0.6381 (-10.3%) | 0.6454 (-9.3%)    | 0.5936 (-16.6%)       |
| Mean  |          | -7.3%, sd 5.4%  | -6.3%, sd 5.4%    | -13.4%, sd 5.1%       |

Neither the per-point Reynolds number nor the free-stream temperature is
given: bracketing T at 216.65 to 288.15 K and Re at 40e6 to 100e6 moves
each value by 0.6% at most (momentum integral over all brackets: -15.7% to
+5.0%). The data themselves spread: seven points at Mach 1.04 to 1.20 span
0.931 to 1.009, which the report attributes to differences between models,
not to scatter within one (p. 7).

On this body the momentum integral gives 1.1% more friction than the flat
plate at the rake's Re, and the local Reynolds number method 6.4 to 7.0%
less: it weights the low friction of long strips by the large aft radius
without the thinner layer an expanding body has.

### 3.3 A laminar run on the RM-10 body

Transition at station 20 (Re_s of 9.7e6), against turbulent from the tip:

| M   | Momentum integral | Local Reynolds number |
| --- | ----------------- | --------------------- |
| 1.2 | -2.6%             | +0.5%                 |
| 2.0 | -2.5%             | +0.6%                 |
| 2.9 | -2.4%             | +0.7%                 |

The report estimates -1.5% (p. 7; its method is not given). The local
method raises the friction: its virtual-origin shift applies at every
downstream strip, weighted by the large aft radius, while the laminar
saving lies where the radius is small. That is an artefact of the method.

## 4. The band this evidence supports

Measured over modelled turbulent friction:

- TN 3097 (flat plate on cylinders): 0.900 to 0.959 over all the brackets;
  0.878 to 0.973 with each cylinder's incompressible level.
- RM-10 in flight (momentum integral): 0.953 to 1.186 over all the
  brackets, mean 1.07.

So measured friction lay between 0.88 and 1.19 times van Driest II: a band
of -12% to +19% about the model contains all 23 comparisons (the 5 Mach
numbers of TN 3097 in both columns, the 13 RM-10 points). The sets lie on
opposite sides (cylinders below the model, RM-10 above), so no correction
is justified, and the band cannot be stated as a coverage fraction from
two sets. It holds for smooth, adiabatic, turbulent layers from a known
origin, Mach 1.0 to 3.6, Re 6e6 to 16e6 (tunnel) and about 60e6 (flight),
on a cylinder behind a cone and on one parabolic body. It says nothing of
laminar or transitional friction (verified against theory only, no data
compared), roughness, fins, heated or cooled walls, or pressure gradients
beyond these bodies'. The research draft's "at least +-11%" is narrower
than the point-by-point evidence.

For bodies the evidence favours the momentum integral: 6.3% below the
flight data on average against 13.4% for the local Reynolds number method,
which also gives a laminar run the wrong sign.

## 5. Not verified, open

- TN 3097's stagnation temperature (not in the report; bracketed, below
  0.7% in effect).
- RM L54G14: per-point Re and free-stream temperature (bracketed); fig. 10
  read once, checked by eye; figs. 7 and 8 not transcribed; whether its
  1950 "Van Driest's theory" is van Driest II.
- No measured laminar friction was compared.
- The momentum integral's turbulent thinning on expanding bodies has no
  data check of its own beyond the RM-10 comparison.
- Hopkins and Inouye (1971), the standard evaluation of these methods, not
  opened.
- The laminar solver is measured to converge for adiabatic walls to Mach
  10 and walls at 0.25 to 6 times the edge temperature to Mach 5 only.
