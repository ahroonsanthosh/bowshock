# 0014: Refusals, what they cost, and how to lift them (draft)

- **Status:** Draft. Research and planning only: nothing in `src/` changes
  with this record. The measurements are in
  [`docs/research/refusals/`](../research/refusals/README.md). Section 10
  registers the owner's decisions of 2026-10-20 (the hold-outs and the
  data that set bands, the "bounded, not measured" label, the Basic
  Finner's factor), committed before any method work starts.
- **Date:** 2026-10-20
- **Inputs:** the code as it stands (the refusals in `src/analysis`,
  `src/grid`, `src/fins`, `src/base`, `src/total`, `src/app` and the drag
  page), [0006](0006-shock-fitting.md), [0008](0008-total-drag.md) to
  [0011](0011-total-drag-on-the-page.md), the transonic record 0013 and
  the two-scale nose grids on their branches, and the sources opened for
  this record (section 8).
- **The owner's instruction:** "on the side focused on refused objects, we
  need to come to a accurate satisfactory result. we can't just refuse
  everything. accuracy is key". So: turn refusals into accurate, measured
  results, in order of impact, and never serve a number whose error is
  not measured.

## 1. Summary

A population of 2000 rockets drawn to resemble amateur and student
rockets that fly beyond Mach 1 (section 3), each at one flight condition
in each Mach band, run through every refusal of the page and its
libraries (section 4):

| Mach band  | Total drag | Nose wave drag only | Nothing |
| ---------- | ---------- | ------------------- | ------- |
| 1.0 to 1.2 | 0.0%       | 0.0%                | 100%    |
| 1.2 to 1.5 | 0.0%       | 23.9%               | 76.2%   |
| 1.5 to 1.8 | 0.2%       | 24.6%               | 75.2%   |
| 1.8 to 3.0 | 0.3%       | 24.6%               | 75.2%   |

Today the page gives a total for almost no realistic rocket, and this does
not depend on the population's weights: the two sensitivity variants give
at most 0.5% in any band. The reasons, in order of how many rockets need
each lifted:

1. **Fins at the base** (96% of cases, every band). Nearly every rocket
   in the population ends its fins at the base or within a chord of it
   (96%, behind a boat-tail among them), and the fins-on-base
   factor serves only four fins 5% to 10% thick at Mach 1.8 to 3.0. Hobby
   fins are thinner (median t/c 0.024), often three, and the factor is
   refused below Mach 1.8.
2. **The fin edges hobby fins have** (68%): flat plates with rounded or
   square-cut edges. Rounded leading edges are served only on unswept
   single wedges of constant chord at Mach 1.49 to 3.0; blunt trailing
   edges only for thin boundary layers, which thin fins almost never have
   (0.5% of the population's blunt edges, all at Mach 1.8 to 3.0).
3. **The nose**: Von Karman and other Haack noses are not offered (52%);
   blunted tips cannot be entered (50%).
4. **The base below Mach 1.5** (every case at Mach 1.0 to 1.5).

Four findings from the sources change how these should be lifted
(section 5): flat-plate fins with square trailing edges _reduce_ base drag
in free flight at Mach 1.0 to 1.3 (RM L52E06), where the circular-arc
fins behind today's factor raise it by about half (TN 3819 fig. 35's
free-flight line over the compiled curve, 1.49 to 1.54 at Mach 1.1 to 1.3
on round 3's reading), so the factor must be rebuilt on the fins'
trailing-edge slope and sweep, not extended in t/c; a hold-out for the
hobby class exists (the Langley PARD standard body: four flat-plate fins
with rounded leading edges, total drag of six models at Mach 1.0 to 2.1,
TN 3697); the trailing edges' thick-layer limit can be lifted from data
already transcribed twice (TR 1109 fig. 29(a), which covers 99% of the
population's edges); and most hobby leading edges run at a subsonic
normal Mach number, where the rounded-edge band is not yet measured.

The top five work items (section 6): **W1** fins at the base rebuilt for
the fins rockets fly; **W3 and W4** the fin edges of flat plates (blunt
trailing edges of thin fins; rounded leading edges on flat, tapered, swept
fins); **W5** Haack noses (in progress on another branch); **W2** the base
below Mach 1.5; **W6** blunted nose tips. With those done the population
gets a total in 25% of cases (32% to 34% of each band from Mach 1.2); the
rest need the sharp-section, square-edge, boat-tail and transonic items
(section 6.1).

## 2. The inventory

Every way the drag page and its libraries decline to give a number. Kind:
**data** (no measurement covers the case, though the method may), **method**
(the method is invalid there), **grids** (a limit of the present grids or
numerics, not of the flow), **input** (a value the page or the libraries
cannot take or represent). "Population" is the share of the cases of
section 4 that trigger the refusal (all four Mach bands; a case may
trigger several; `out/impact.out` has every band).

### 2.1 The nose solve (`src/analysis`, `src/grid`, the page)

| #   | Refused when                                                                                                                                     | Where                                                                                             | Record                                                          | Kind          | Population                   |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ------------- | ---------------------------- |
| N1  | Mach below 1.2                                                                                                                                   | the page's input; the fitted solver's tip, shock and outflow assumptions                          | 0006, 0013 (branch `transonic-mach1`)                           | method        | 25.0% (all of M 1.0 to 1.2)  |
| N2  | Haack (Von Karman, LV) and power-series noses                                                                                                    | not offered; their tips (r ~ x^(3/4), x^(1/2)) need the two-scale grids                           | README "Not yet"; 0006 "Two-scale noses" (branch `haack-merge`) | grids         | 52.0%                        |
| N3  | a rounded (blunted) tip on a cone or ogive                                                                                                       | no shape has a tip radius; a capped cone meets the cylinder at a corner, which the C grid refuses | 0011 "Not represented"; `bluntBodyGrid`                         | input, grids  | 49.7%                        |
| N4  | the tip's conical shock detaches                                                                                                                 | `sharpFitProblem`                                                                                 | 0006                                                            | method        | 5.1% (20.5% at M 1.0 to 1.2) |
| N5  | the tip flow crosses the starting plane axially subsonic at a corner, or is subsonic on the surface                                              | `sharpFitProblem`                                                                                 | 0006, `docs/research/subtip`                                    | method, grids | 4.2% (14.8% at M 1.0 to 1.2) |
| N6  | a tip steeper than 40 deg                                                                                                                        | the fitted grids' 50 deg wall-cell gate on vertical lines                                         | 0006 "The quality gates on fitted grids"                        | grids         | 0%                           |
| N7  | the fitted grid fails its gates even with 1.5 times the columns                                                                                  | `fittedGridFailure`                                                                               | 0006                                                            | grids         | not modelled                 |
| N8  | the flow leaves the grid, or the end of the body, axially subsonic                                                                               | `fittedCaseFailure` (`outflowMach`, `baseMach`)                                                   | 0006                                                            | method        | not modelled                 |
| N9  | the fit does not converge; no band can be measured (order not settled)                                                                           | `verifiedFittedDragGpu`; `noseStateOf` ("not verified" refuses the total)                         | 0005, 0011                                                      | grids         | not modelled                 |
| N10 | the finest grid exceeds the GPU's memory (the coarser grids' band is kept; refused only on the first grid)                                       | `GpuMemoryLimitError`                                                                             | 0006                                                            | grids         | not modelled                 |
| N11 | blunt noses not tangent to the body, blunter than a sphere of 10 base radii, or reaching the outer boundary; the 6-calibre ellipsoid at Mach 1.2 | `bluntBodyGrid`, the gates                                                                        | 0004; 0006 "Ellipsoids at low Mach numbers"                     | grids         | 0%                           |
| N12 | no WebGPU                                                                                                                                        | the page                                                                                          | 0011                                                            | input         | not modelled                 |

N7 to N10 can only be known by solving, so the population counts a nose
inside the documented domain as served: the nose figures are an upper
bound. The captured-shock path (`verifiedForebodyDrag` with `bodyGrid`)
is not used by the page and is left out.

### 2.2 Fins (`src/fins`, `src/total`)

| #   | Refused when                                                                                                                                | Where                                              | Record                 | Kind                      | Population                            |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- | ---------------------- | ------------------------- | ------------------------------------- |
| F1  | a square-cut (blunt, unrounded) leading edge                                                                                                | `validateSymmetricSection`: no section form for it | 0008 section 4.1       | input, data               | 15.3%                                 |
| F2  | a rounded trailing edge                                                                                                                     | no section form for it                             | none                   | input, data               | 15.5%                                 |
| F3  | a rounded leading edge on a flat plate (h = r)                                                                                              | `roundedWedge` (needs h > r)                       | 0010 section 5.2       | method (the construction) | 43.9%                                 |
| F4  | a rounded leading edge on fins of varying chord                                                                                             | `finnedBodyComponents`                             | 0010 section 3         | method                    | 41.8%                                 |
| F5  | a swept rounded leading edge                                                                                                                | `roundedLeadingEdgeDrag`                           | 0008 section 4.1       | data                      | 41.8%                                 |
| F6  | a rounded leading edge outside Mach 1.49 to 3.0                                                                                             | `roundedLeadingEdgeDrag`                           | 0010 section 5.2       | data                      | 21.5%                                 |
| F7  | a rounded leading edge outside Re_D 6.7e3 to 1e6                                                                                            | `roundedLeadingEdgeDrag`                           | 0010 sections 5.2, 10  | data                      | 0.3% (14.6% with every case at 20 km) |
| F8  | a sharp section whose leading-edge shock detaches, or with subsonic flow behind it                                                          | `exactSectionDrag`                                 | 0009 section 2.1       | method                    | 16.2% (35.3% at M 1.0 to 1.2)         |
| F9  | a sharp section on which a wave reflected from the leading-edge shock can land ahead of the trailing edge                                   | `exactSectionDrag`                                 | 0009 sections 2.1, 2.4 | method                    | 14.6% (29.0% at M 1.8 to 3.0)         |
| F10 | a compression corner; expansion past the Prandtl-Meyer limit; Mach 1 or below                                                               | `exactSectionDrag`, `linearWaveDrag`               | 0009                   | method                    | 0%                                    |
| F11 | a leading edge swept forward; a tip chord of zero or less                                                                                   | `validatePlanform`                                 | 0009                   | input                     | 0%                                    |
| F12 | a wedge-flat section with a blunt trailing edge, which the library takes, is not offered (the page has single wedge, double wedge, hexagon) | `demos/nose-drag.html`, `configurationOf`          | 0011                   | input                     | 9.1%                                  |

### 2.3 Bases (`src/base`, `src/total`)

| #   | Refused when                                                                                             | Where                                  | Record                 | Kind                                       | Population                           |
| --- | -------------------------------------------------------------------------------------------------------- | -------------------------------------- | ---------------------- | ------------------------------------------ | ------------------------------------ |
| B1  | the body base outside Mach 1.5 to 3.0                                                                    | `checkCompiledCurveMach`               | 0008 section 3.3       | data                                       | 50.0% (all of M 1.0 to 1.5)          |
| B2  | a boat-tail or flare                                                                                     | `bodyBaseDrag`                         | 0008 sections 3.2, 6.2 | data, method                               | 15.8%                                |
| B3  | a laminar layer at the base (a transition input past the base)                                           | `bodyBaseDrag`, `finnedBodyComponents` | 0008                   | data                                       | inputs only                          |
| B4  | fins ending within a chord of the base                                                                   | `bodyBaseDrag`                         | 0010 section 1.4       | data (TN 2360's variation not transcribed) | 23.4%                                |
| B5  | fins at the base, not four                                                                               | `finsOnBaseFactor`                     | 0010 section 1.3       | data                                       | 40.2%                                |
| B6  | fins at the base, t/c outside 0.05 to 0.10                                                               | `finsOnBaseFactor`                     | 0010 section 1.3       | data                                       | 71.7%                                |
| B7  | fins at the base, Mach outside 1.798 to 3.0                                                              | `finsOnBaseFactor`                     | 0010 section 1.3       | data                                       | 54.3% (72% of each band below M 1.8) |
| B8  | fins at the base swept at either edge, so any tapered planform (since 2026-10-21, section 10.7)          | `finsOnBaseFactor`                     | 0010 section 11.5      | data                                       | 69.0% (sole blocker 0.01%)           |
| T1  | a blunt trailing edge on fins of varying chord                                                           | `finnedBodyComponents`                 | 0010 section 3         | method (implementation)                    | 49.8%                                |
| T2  | a swept blunt trailing edge                                                                              | `finTrailingEdgeBaseDrag`              | 0008 section 3.4       | data                                       | 7.9%                                 |
| T3  | a blunt trailing edge outside Mach 1.5 to 3.2                                                            | `finTrailingEdgeBaseDrag`              | 0010 section 5.1       | data                                       | 26.4%                                |
| T4  | a thick layer at the trailing edge, c / [h Re_c^(1/5)] above 1.0                                         | `finTrailingEdgeBaseDrag`              | 0010 section 5.1       | data (read to 4.5, not carried)            | 52.6%                                |
| T5  | a laminar layer at the trailing edge; the laminar input more than one read interval past TR 1109 fig. 29 | `finTrailingEdgeBaseDrag`              | 0010 sections 5.1, 10  | data                                       | inputs only                          |

### 2.4 The total and the page

| #   | Refused when                                                                                                                                                                                                     | Where             | Record           | Kind             |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------- | ---------------- | ---------------- |
| P1  | any component refused, or the nose not solved or not verified                                                                                                                                                    | `totalDragView`   | 0011             | as the component |
| P2  | inputs: non-positive values, fins longer than the cylinder, a roughness band without a source                                                                                                                    | `configurationOf` | 0011             | input            |
| P3  | a method fails (the laminar similarity solution not found)                                                                                                                                                       | `totalDragView`   | 0011             | grids            |
| P4  | not inputs at all: a tip radius, a boat-tail, flat-plate edge shapes, fins placed other than by a distance ahead of the base, altitude and speed (the page asks for the Reynolds number; no standard atmosphere) | the page          | README "Not yet" | input            |

Not refusals: the class rule ("estimate, not validated", inside the class
too since the claim was suspended on 2026-10-21, section 10.7; before
that "validated on the Basic Finner" inside it; 0011 sections 3 and 4)
and the vacuum clamp (0010
section 10) label or bound a number; they never withhold one. The README's
"Limits" (power off, zero incidence, no plume) lie outside the page's
scope.

## 3. The population

`docs/research/refusals/population.ts`, seeded, 2000 rockets; each is
evaluated at one condition in each band, so every band holds the same
rockets. The README there gives every weight with its source or marks it
an assumption. In short:

| Variable         | Drawn as                                                                                                                                                                                       | Grounds                                                                                                                                                                                                                                             |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Nose             | Von Karman 45%, tangent ogive 30%, cone 12%, parabolic 4%, LV-Haack 3%, power 1/2 3%, ellipsoid 3%; fineness 4 to 6 (Haack), 3 to 5, 2 to 3 (ellipsoid)                                        | kits for supersonic flight ship filament-wound 5:1 Von Karman noses with metal tips (Wildman Rocketry); Space Team Aachen's Aquila (Mach 1.8) a Von Karman nose; RIT's 2023 entry a 5:1 tangent ogive; the shares are an assumption shaped by these |
| Tip              | rounded in 50% (r_n / R 0.03 to 0.15)                                                                                                                                                          | assumption; molded and wound noses end in a radius or a machined metal tip                                                                                                                                                                          |
| Fins             | 3 (56%) or 4; clipped delta 65%, swept trailing edge 30%, rectangular 5%; leading-edge sweep median 45 deg                                                                                     | RIT: "configurations of both three and four fins are fairly common"; Wildman's kits three; OpenRocket's examples 12 of 17 multi-fin sets three                                                                                                      |
| Section          | flat plate: rounded leading edge and square trailing edge 28%, both rounded 15%, both square 15%, bevelled leading edge and square trailing edge 9%; bevelled both 21%; sharp double wedge 11% | hobby fins are sheet (G10, plywood, carbon plate); OpenRocket's examples: square 24, rounded 8, airfoil 2 cross-sections; NACA's own rocket models used the rounded-edge plate (TN 3697)                                                            |
| Thickness        | 1.6 to 6.4 mm by diameter; t/c 0.014, 0.024, 0.043 (5%, median, 95%)                                                                                                                           | sheet stock 1/16 to 1/4 in                                                                                                                                                                                                                          |
| Fins at the base | 72.5%; within a chord 23.4% (every boat-tail puts them there); a chord or more ahead 4%                                                                                                        | assumption; RIT's boat-tail behind its fins                                                                                                                                                                                                         |
| Boat-tail        | 15.8%                                                                                                                                                                                          | Aquila and RIT carry one; assumption                                                                                                                                                                                                                |
| Diameter         | 38 to 152 mm                                                                                                                                                                                   | assumption (enters through Reynolds numbers)                                                                                                                                                                                                        |
| Condition        | Mach uniform in each band; altitude 0 to 5 km (60%), 5 to 12 (30%), 12 to 20 (10%), standard atmosphere                                                                                        | assumption; also run with every case at 0 and at 20 km                                                                                                                                                                                              |

The decomposition (each refusal tested on its own, so a case lists every
reason) agrees with `finnedBodyComponents` on all 824 cases the library
can represent.

## 4. Impact

### 4.1 Outcome today

The table of section 1. Counting a blunted tip as the page would serve it
if typed as sharp (a number with the tip "not represented", its error not
measured) raises "nose wave drag only" to 46% to 48% of each band from
Mach 1.2 and leaves totals unchanged (0.0% to 0.3%). Every condition at
0 km or at 20 km gives the same outcomes; altitude moves only the rounded
edges' Reynolds-number refusal (0% at 0 km, 14.6% at 20 km).

### 4.2 What each work package is needed for

A package's share is the share of cases whose refusals include one of
its own: no such case gets a total until the package is done. Lifting any
one package alone gives at most 1.4% totals: almost every rocket is
blocked by several.

| Package                                                                 | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 | All   |
| ----------------------------------------------------------------------- | ------------ | ---------- | ---------- | ---------- | ----- |
| W1 fins at the base (count, thickness, Mach 1.5 to 1.8, within a chord) | 95.8%        | 95.8%      | 96.0%      | 95.8%      | 95.8% |
| W3 blunt trailing edges of thin fins                                    | 52.7%        | 52.7%      | 52.7%      | 52.7%      | 52.7% |
| W5 Haack and power-series noses                                         | 52.0%        | 52.0%      | 52.0%      | 52.0%      | 52.0% |
| W2 base below Mach 1.5                                                  | 100%         | 100%       | 0%         | 0%         | 50.0% |
| W6 blunted nose tips                                                    | 49.7%        | 49.7%      | 49.7%      | 49.7%      | 49.7% |
| W4 rounded leading edges on flat, tapered, swept fins                   | 43.9%        | 43.9%      | 43.9%      | 43.9%      | 43.9% |
| W9 sharp sections: reflected waves, detached bevel shocks               | 35.5%        | 29.6%      | 29.4%      | 29.0%      | 30.9% |
| W11 square-cut leading edges, rounded trailing edges                    | 30.8%        | 30.8%      | 30.8%      | 30.8%      | 30.8% |
| W7 Mach 1.0 to 1.2 nose solve                                           | 100%         | 0%         | 0%         | 0%         | 25.0% |
| W10 boat-tails                                                          | 15.8%        | 15.8%      | 15.8%      | 15.8%      | 15.8% |
| W8 steep, detached and subsonic sharp tips                              | 35.3%        | 2.0%       | 0%         | 0%         | 9.3%  |
| W12 the page's missing wedge-flat section                               | 9.1%         | 9.1%       | 9.1%       | 9.1%       | 9.1%  |

W3 and W4 overlap: a flat plate with a rounded leading edge and a square
trailing edge needs both. Together with W11 they cover every flat-plate
fin, 68% of the population.

### 4.3 Robustness

Two variants move the weights the result depends on most: more four-fin,
sharp-edged high-power fins (four fins 70%, bevelled or double-wedge
sections 60%, boat-tails 5%), and fewer Haack noses and blunt tips (Von
Karman 25%, rounded tips 20%). Totals today stay at 0.0% to 0.5% in every
band, and W1 is needed by 95% to 96% of cases in both. With sharp-edged
fins the fin-edge packages fall to 30% (W3) and 25% (W4) and W9 rises to
49%, overtaking them; with fewer Haack noses the nose packages fall to
29% (W5) and 19% (W6), behind W2. The rest of section 6's order holds.

## 5. What the sources say that changes the plan

**5.1 The fins-on-base factor should be rebuilt, not extended.** The
factor is measured on four unswept 10%-thick circular-arc fins (TN 3819
fig. 35). What moves it, from the sources opened:

- _Trailing-edge slope._ TN 2360 (pp. 9 to 11) traces the increment to the
  fins' pressures near the base, "proportional to the local slopes of the
  surface", and names sections with small trailing-edge angles (a double
  wedge, a blunt trailing edge) "the most favorable". TN 3819 fig. 33 (P_B
  at t/c 0, 0.05 and 0.10, x/c = 0, Mach 1.50, 2.00, 2.41): the 5% fins
  already carry about 60% of the 10% fins' increment (read by eye, once),
  so the increment is not linear in t/c below 5%.
- _Flat plates with square trailing edges reduce base drag._ RM L52E06
  (Hart 1952) flew the same 5 in body with and without four fins of 0.091
  in plate, rounded leading edges, square trailing edges, 45 deg swept and
  tapered, at the base: "Throughout the present test range the
  stabilizing fins had the effect of decreasing the base drag" (p. 5;
  figs. 7, 8: about 0.21 against 0.23 to 0.25 near Mach 1.05 to 1.15, read
  by eye). That is a factor near 0.9, where the circular-arc fins' line of
  fig. 35 gives 1.49 to 1.54 at Mach 1.1 to 1.3 (round 3's reading over the
  compiled curve) and today's factor 1.24 to 1.54 at Mach 1.8.
- _Sweep._ Love and O'Donnell (RM L52J21a, four 45 deg swept 8%
  circular-arc fins, Mach 1.62 to 2.41): the fins' effects on base
  pressure are "essentially viscous effects that are, for the most part,
  eliminated" once the body's layer is turbulent. TN 3819 fig. 34 (RM-10,
  10% fins swept 60 deg, in a tunnel): about 1.13 to 1.24 at Mach 1.5 to
  2.0 (by eye), against 1.39 to 1.68 for the unswept 10% fins in a tunnel
  (TN 2360's pairs at Mach 2.0 and 1.5).
- _Count._ TN 2360: a cruciform tail's increment is less than twice a
  plane tail's (pp. 10 to 11); three fins lie between the two.

Hobby fins at the base are 69% square- or rounded-edged (trailing-edge
slope zero), with median sweep 45 deg (`out/edges.out`). Extending the
present factor in t/c to them would be wrong in size, and near Mach 1 in
sign. The rebuilt factor (W1) is keyed on trailing-edge slope, sweep,
count and position. The Basic Finner's single wedges end in a blunt
trailing edge at 2.3 deg, so the circular-arc factor, carried to them by
analogy, may overstate F; that is the sign of the offset at Mach 2.97
(model 5% to 8% high, 0010 section 4.2). Nothing is changed on that
hold-out: it is a reason to test the rebuilt factor first on BRL 934.

**5.2 A hold-out exists for the hobby class.** The Langley PARD "standard
body": a 5 in ogive-cylinder, L/D 11, a 3.5-calibre nose, four 0.091 in
flat-plate fins with rounded leading edges and square trailing edges, 45
deg leading-edge sweep, tapered (root 8.38 in, tip 1.38 in), 25 in across
the tips, at the base. In free flight:

- total drag of six models at Mach 1.0 to 2.1 (TN 3697 fig. 5, Pittel;
  about 0.050 at Mach 1.05 falling to 0.040 at 1.6 to 2.1 on the report's
  200 sq in, so about 0.51 to 0.41 on the body's frontal area, read by
  eye);
- totals of the same body at Mach 0.7 to 1.6 (TN 3650, Welsh, fig. 4) and
  0.7 to 1.3 (RM L52E06, configurations E and G, "less than 4 percent"
  probable error), with base pressures with and without fins (RM L52E06)
  and with the 0.045 in leading-edge radius stated (TN 3372, Peck).

With BRL 934 (the Basic Finner class, Mach 0.98 to 2.47, already
transcribed) and the Eglin "4-Fin Circular" (flat plates t/c 0.025 at the
base, Mach 1.42 to 3.42, opened earlier;
`docs/research/total-drag/data/validation_candidates.md`), there are
three free-flight sets covering the fins rockets fly. All three are held
back as tests, and the data that set the bands are named figure by
figure, in section 10.

**5.3 Hobby leading edges run mostly at subsonic normal Mach numbers.**
For the rounded edges of the population, M cos(sweep) is below 1 in 59%
of cases at Mach 1.2 to 1.5 and 29% at 1.5 to 1.8, and between 1 and 1.49
in 41% and 62% (`out/edges.out`). TN 2960's front-side band is set at
1.49 to 2.90. The term is large: three 3 mm plates of 80 mm span swept
45 deg on a 54 mm body at Mach 2 carry about 0.16 in C_D at the
independence principle's normal Mach number and pitot pressure,
of the order of a quarter of such a rocket's total (an illustration, not
a model value).

**5.4 The trailing edges' thick-layer limit can be lifted from data in
hand.** The population's blunt edges have c / [h Re_c^(1/5)] of about
1.3 to 3.8 (the middle 90% in every band); TR 1109 fig. 29(a), already
transcribed twice (`src/base/blunt-te-2d.ts`), is read to 4.5 at Mach
1.5, 2.0 and 3.1 and covers 98.9% to 99.6% of them, band by band.

**5.5 Below Mach 1.5 the base will carry a wider band.** RM L52E06's
finless body near Mach 1.1 to 1.3 (fig. 8, by eye about 0.23 to 0.25)
lies about 1.2 to 1.3 times the compiled curve (0.18 at Mach 1.2), above
fig. 18's own free-flight curve (1.03 to 1.12 over it, 0008 section
3.2). Free-flight data at Mach 1.3 to 1.5 were not found.

**5.6 Boat-tail side pressures are not inviscid.** Cortright and Schroeder
(RM E51F26, Mach 1.91): the measured boat-tail pressures lie above the
method of characteristics, which overpredicts the side pressure drag by
about 20%. A boat-tail solved inviscidly needs an allowance of that order,
measured.

## 6. The ranked work

Ranked by the share of the population that needs each (section 4.2),
items that only unlock together kept together. "In progress" items belong
to other branches and are ranked only for completeness. Effort: small
(data in hand, code and tests), medium (one to three sources read twice,
then code), large (several sources, a model and its band, and grid or
solver work).

| Rank | Item                                                            | Needed by                 | Effort                                                      | Expected band where served                                                    |
| ---- | --------------------------------------------------------------- | ------------------------- | ----------------------------------------------------------- | ----------------------------------------------------------------------------- |
| 0    | V: the hold-outs and band-setting data, registered (section 10) | all claims                | done                                                        |                                                                               |
| 1    | W1 fins at the base, rebuilt for the fins rockets fly           | 96%                       | large                                                       | about +-10% to +-20% of the body base term (3% to 8% of the total)            |
| 2    | W3 blunt trailing edges of thin fins                            | 53%                       | small (thick layer, taper), medium (sweep, Mach 1.0 to 1.5) | about +-15% of the term (a term of 5% to 15% of the total)                    |
| 2    | W4 rounded leading edges on flat, tapered, swept fins           | 44%                       | medium                                                      | +-5% to +-10% of the term, plus the faces' stated gap                         |
| 3    | W5 Haack and power-series noses (in progress, `haack-merge`)    | 52%                       | large                                                       | the fitted band (5.8e-4 of the nose drag on the 3-calibre LD-Haack at Mach 2) |
| 4    | W2 the base below Mach 1.5                                      | 50% (all of M 1.0 to 1.5) | medium                                                      | about 0.85 to 1.3 on the term, to be measured                                 |
| 5    | W6 blunted nose tips                                            | 50%                       | medium to large                                             | as for ellipsoids: the grids' band and the allowance                          |
| 6    | W9 sharp sections: reflected waves, detached bevel shocks       | 31%                       | medium (CPU)                                                | a measured allowance under the fins' own band                                 |
| 7    | W11 square-cut leading edges, rounded trailing edges            | 31%                       | small                                                       | bounded: the whole difference between the bounds                              |
| 8    | W7 Mach 1.0 to 1.2 nose solve (in progress, 0013)               | 25%                       | large                                                       | as 0013 measures                                                              |
| 9    | W10 boat-tails                                                  | 16%                       | large                                                       | about +-20% on the boat-tail and base terms, to be measured                   |
| 10   | W8 steep, detached and subsonic sharp tips                      | 9%                        | with W5 and W7                                              |                                                                               |
| 11   | W12 the page's missing wedge-flat section                       | 9%                        | small                                                       | the library's                                                                 |

### 6.1 Totals as the work is done

Cumulative, in the order above (W3 and W4 together), on the baseline
population:

| After     | All bands | M 1.0 to 1.2 | 1.2 to 1.5 | 1.5 to 1.8 | 1.8 to 3.0 |
| --------- | --------- | ------------ | ---------- | ---------- | ---------- |
| W1        | 1.4%      | 0%           | 0%         | 2.8%       | 2.8%       |
| W3 and W4 | 4.3%      | 0%           | 0%         | 8.5%       | 8.5%       |
| W5        | 8.5%      | 0%           | 0%         | 17.0%      | 17.1%      |
| W2        | 12.6%     | 0%           | 16.3%      | 17.0%      | 17.1%      |
| W6        | 24.7%     | 0%           | 32.1%      | 33.2%      | 33.5%      |
| W9        | 37.3%     | 0%           | 48.7%      | 50.2%      | 50.2%      |
| W11       | 57.1%     | 0%           | 74.8%      | 76.8%      | 76.8%      |
| W7        | 69.5%     | 49.5%        | 74.8%      | 76.8%      | 76.8%      |
| W10       | 82.4%     | 58.8%        | 89.0%      | 90.9%      | 90.9%      |
| W8        | 90.9%     | 90.9%        | 90.9%      | 90.9%      | 90.9%      |
| W12       | 100%      | 100%         | 100%       | 100%       | 100%       |

Every number here is an upper bound on what the page would serve: the
nose's grid-dependent refusals (N7 to N10) are not modelled, and each item
keeps its own refusals (below). Both sensitivity variants give the same
shape: 25% to 29% after the first five, 89% to 91% after all but W12.

### 6.2 The items

**V. Register the hold-outs first.** Done: section 10, by the owner's
decisions of 2026-10-20, committed before any method work.

**W1. Fins at the base, rebuilt for the fins rockets fly.** Lifts B4 to
B7.

- _Method._ The factor F = P_B with fins over P_B without, as now, but as
  a function of what the data show moves it, interpolated only inside
  measured families: the trailing-edge half-angle (circular arcs at t/c
  0, 0.05, 0.10: TN 3819 fig. 33, TN 2360 fig. 6, the free-flight line of
  fig. 35; square-edged plates: RM L52E06 figs. 6 to 8, TN 3372 figs. 7
  to 12), the sweep (45 deg: RM L52J21a figs. 8, 31 to 33, 38, 39; 60 deg:
  TN 3819 fig. 34 from RM E50D28), the count (two and four fins, TN 2360 fig. 6; three
  bracketed between them, since the increment grows with count but less
  than in proportion), the position (x/c from -1 to +1: TN 2360 fig. 6,
  TN 3819 fig. 32), and Mach 1.5 to 1.8 (fig. 35's line, read from Mach
  1.1 by round 3 only: a second reading; TN 2360's tunnel pairs at 1.5).
- _Band._ The envelope over the family members that bracket a case, with
  each reading's error, by 0010 section 1.3's rules. Expected about +-10%
  to +-20% of the body base term where a case is bracketed (today's
  family carries +-10.8% to +-12.2%); the body base is roughly 25% to 40%
  of a total at these Mach numbers (an estimate), so 3% to 8% of the
  total.
- _Stays refused._ More than four fins; trailing-edge slopes or
  thicknesses beyond the measured (a 10% circular arc, about 11 deg);
  sweeps beyond 60 deg; x/c beyond +-1 (a chord or more ahead keeps the
  plain curve, labelled, as now); Mach outside each family's range.
- _Hold-out._ Section 10: BRL 934 first, then the PARD standard body's
  and the Eglin set's totals.
- _Effort._ Large: TN 2360 fig. 6, TN 3819 figs. 32 to 34, the second
  reading of fig. 35 below 1.8, RM L52E06 figs. 6 to 8, TN 3372 figs. 7
  to 12 and RM L52J21a's finned base pressures, each read twice; the
  model, its tests, a record section; about the size of 0010 section 1.3.

**W3. Blunt trailing edges of thin fins.** Lifts T1 to T4.

- _Method._ (a) Thick layers: TR 1109 fig. 29(a)'s turbulent curves, read
  twice to c / [h Re_c^(1/5)] = 4.5 at Mach 1.5, 2.0 and 3.1, as a ratio
  on the thin-layer term, interpolated in Mach. (b) Fins of varying chord
  with an unswept edge (clipped deltas): the term integrated along the
  span with the local chord's thin-layer parameter. (c) Swept edges: RM
  L52D21 (Goin: 45 deg swept untapered wings at Mach 1.41, 1.62, 1.96, the
  base pressure against the Mach number normal to the edges; its summary
  warns that spanwise variations on swept wings are "very large") with RM
  A51J25 p. 17. (d) Mach 1.0 to 1.5: TN 3548 (Morrow and Katz: a blunt
  trailing-edge airfoil in flight at Mach 0.6 to 1.7; found, not opened)
  and RM A51J25 fig. 7 below M' 1.5 (read once).
- _Band._ Today's 0.93 to 1.21 with fig. 29(a)'s two readings' spread
  added; expected about +-15% of the term. On a 54 mm body with three
  3 mm plates of 80 mm span the term is about 0.07 in C_D at Mach 2
  (illustration), an eighth of the total.
- _Stays refused._ c / [h Re_c^(1/5)] beyond 4.5 (0.5% of the
  population); laminar edges (an input); sweeps beyond RM L52D21's.
- _Hold-out._ The PARD standard body (square trailing edges).
- _Effort._ Small for (a) and (b): the data are in the library. Medium
  for (c) and (d).

**W4. Rounded leading edges on flat, tapered and swept fins.** Lifts F3
to F7.

- _Method._ (a) A flat plate is the present rounded wedge's limit, face
  angle zero: its nose is the front half of a cylinder, exactly what TN
  2960 measured. (b) On a plate the edge is the same at every station, so
  the term is per unit span times the span, whatever the chord. (c)
  Sweep by the independence principle: the front side at the normal Mach
  number M cos(sweep) on the normal dynamic pressure, exact for inviscid
  flow over an infinite swept cylinder; its error measured on RM A55H31
  (Mach 3.9, sweep 0 to 44 deg; the pressure drag down 60% at 44 deg) and
  TN 3861 (Penland, Mach 6.86: stagnation pressure and crossflow drag
  against crossflow Mach number, figs. 15 and 16). (d) Normal Mach numbers
  below 1.49: TN 2960 figs. 5(a) and 5(b) (front-side pressures at
  subsonic Mach numbers, sub- and supercritical); across the transonic
  gap, about 0.9 to 1.49, only if the measured-over-modelled ratio either
  side agrees; otherwise refused there.
- _Band._ 0.99 to 1.06 at a normal Mach number of 1.49 to 2.90, as now
  (with the +-3% Reynolds allowance where it applies); at subsonic normal
  Mach numbers the envelope of TN 2960's front sides over the model, to
  be measured; plus a sweep allowance from RM A55H31 and TN 3861.
  Expected +-5% to +-10% of the term. The faces' overexpansion behind the
  shoulder stays the analogy's stated gap, as for the Basic Finner's
  wedges, until a planar blunt solve measures it (0008 B4).
- _Stays refused._ The transonic normal-Mach gap unless bridged; Re_D
  outside 6.7e3 to 1e6.
- _Amended 2026-10-20 (0016 section 11), accepted by the coordinator
  before any hold-out run._ (d) on flat plates from normal Mach number
  1.0: NASA CR-149372 (Macha) measures the cylinder's front side at M 1.0,
  1.1 and 1.2 (figs. 8b and 5), where the normal flow is sonic or faster
  and the plate's nose sees the cylinder's flow. Between its 1.2 and TN
  2960's 1.49 the ratios either side do not agree (0.90 and 0.99), so the
  condition above fails; the gap is bridged instead by the
  bracketing-node band, from the lower node's lowest reading to the upper
  node's highest, each with its error, on the measured monotone rise of
  the ratio at every node pair (0.77, 0.835, 0.90, 0.994, 1.035, 1.049 at
  M 1.0 to 2.9) and its physical approach to modified Newtonian as the
  normal Mach number rises, and the term there is labelled "an analogy,
  interpolated across an unmeasured Mach range". Below M_n 1.49 the sweep
  allowance, extrapolated from M_n 3.4, is twice its measured deviation
  from 1. Below M_n 1.0 the gap stays refused.
- _Amended 2026-10-21 (0016 sections 12 and 16)._ The amendment above
  holds for rounded wedges too, the present term's own section (0016
  section 12): up to its tangent points a wedge's nose sees the cylinder's
  flow from M_n 1.0 as a plate's does, and the Basic Finner's gated shots
  are bit for bit unchanged. The sweep allowance on every swept edge
  served (all at M_n 3.0 or less, below the checks' 3.37) is extrapolated
  in normal Mach number and contains every yawed datum at served sweeps
  and normal Mach numbers: 0.95 to 1.21 (0.95 to 1.22 from 14.3 deg of sweep
  up, tapered below, since 0016 sections 18 and 19), RM A55H31's own tests at 45 and
  60 deg counted (the report's suspicion of three-dimensional flow, from
  the 1 in model in the 3 in stream, is a finite-length effect a fin's
  edge may share). TN 3861 figs. 15 and 16, read twice (with fig. 17, read
  once), hold one crossflow point at a served sweep, an estimate inside
  that allowance. No yawed datum lies below M_n 1.95 at a served sweep
  (r at the tests' stated yaws, 0016 section 18).
- _Amended 2026-10-21, the coordinator's decision under the owner's rule
  (serve rather than refuse wherever an honest band can be given, and say
  plainly what it rests on; 0016 section 16)._ Swept edges at M_n 1.0 to
  1.95, where no yawed datum lies at a served sweep, are served with the
  sweep allowance that contains every yawed datum, 0.95 to 1.22 from 14.3
  deg of sweep up (0016 sections 18 and 19), labelled
  "the sweep allowance extrapolated in normal Mach number" and "no yawed
  datum below M_n 1.95 at a served sweep". What would replace the
  extrapolation: front-side pressures on yawed cylinders or swept blunt
  leading edges at M_n 1.0 to 1.95 and sweeps up to 45 deg, read twice.
  None is held; candidates to open are O'Neal's free-flight swept blunt
  leading edges (36.75 and 45 deg, M 1.78 to 2.99, NTRS 19980227361, heat
  transfer, pressures not known) and Holdaway, Lazzeroni and Hatfield's 45
  deg swept wing with blunted leading edges to M 2.20 (NTRS 19980223578,
  drag increments only, a check at most).
- _Hold-out._ The PARD standard body's totals, whose fins are exactly
  this edge (section 10). RM L52E06 fig. 11, their drag increments, is
  derived from held-back totals and sets nothing.
- _Effort._ Medium: TN 2960 figs. 5(a) and 5(b), RM A55H31 figs. 9 to 12
  (fig. 12 not yet read, 0008 B1) and TN 3861 figs. 15 and 16, each read
  twice; a small code change; tests.

**W5. Haack and power-series noses** (in progress on `haack-merge`). The
two-scale C grid is measured on the CPU: the 3-calibre LD-Haack at Mach 2
converges at an observed order of 1.49 on three grids, with a band of
5.8e-4 of the drag, eight times the allowance (0006 on that branch). Still
needed for the page: the GPU path; a reference independent of the
family (the method of characteristics behind the sonic line, as for
ellipsoids in 0006; TR 1386's measured foredrag of a fineness-3 Karman
ogive at Mach 1.24 to 7.4, friction removed, as a check); the shape on
the page.

**W2. The base below Mach 1.5.** Lifts B1 below 1.5, and with W1 the
fins at the base there.

- _Method._ The compiled curve continued below 1.5 (fig. 18's rows at
  Mach 1.0, 1.2 and 1.4 are read once: a second reading), with a band set
  on free-flight data: fig. 18's free-flight curve (Mach 1.06 to 1.21),
  RM L52E06's finless body (Mach 0.7 to 1.3, +-0.013 in P_B at 1.25;
  figs. 6 to 8). TR R-100's helium-gun bodies (fins at the base, totals
  only, to about Mach 1.3 to 1.4) set no band. Fins at the base below 1.5:
  fig. 35's free-flight line (round 3, from Mach 1.1) and the flat plates
  of RM L52E06 and TN 3372. Mach 1.3 to 1.5, where no free-flight data
  were found, interpolated with the band of both sides.
- _Band._ Wide: about 0.85 to 1.3 on the term, to be measured (5.5); the
  base is roughly 35% to 45% of the total near Mach 1.1 (an estimate).
- _Hold-out._ BRL 934's rounds at Mach 0.98 to 1.5.
- _Effort._ Medium.

**W6. Blunted nose tips.**

- _Method._ A tip radius on every nose shape (a sphere cap tangent to the
  profile) and on the page. Capped noses that meet the body tangentially
  (tangent ogives, Haack, parabolic K = 1) are blunt noses the C grid and
  0006's blunt-nose checks (stagnation pressure, observed orders near 2,
  the method of characteristics behind the sonic line) already serve.
  Capped cones and secant ogives meet the cylinder at a corner, which the
  C grid refuses: corners on the C grid are new grid work.
- _Validation._ TR 1386 (fineness-3 hemispherically blunted cones:
  pressure distributions and drags at Mach 1.24 to 7.4) as the measured
  check; the method of characteristics as the independent one.
- _Band._ As for ellipsoids: the grids' band and the allowance.
- _Stays refused._ Capped cones until corners on the C grid are measured.
  Today a capped nose gets a number only if typed as sharp, with its
  error unmeasured; this item measures it.
- _Effort._ Medium (tangent caps) to large (corners).

**W9. Sharp sections: reflected waves and detached bevel shocks.**
(a) Planar Euler solves (0009 section 2.4's set-up) on the bevelled family
(bevel half-angles 5 to 15 deg, Mach 1.5 to 3) to measure what neglecting
the reflected waves costs, then the shock-expansion value with the
reflections neglected and that allowance (0009 saw under 0.5% on one
case, sign unresolved, against a fins' own band of 1.01 to 1.59). (b)
Detached bevel shocks at Mach 1.0 to 1.6: the captured planar solve on
nested grids; there the linear 3D factor (subsonic leading edges) is the
larger unknown and stays labelled. Effort medium, and CPU-heavy (one
hexagon's fourth grid took 28 minutes).

**W11. Square-cut leading edges and rounded trailing edges.** No opened
source isolates either at these conditions. The owner has allowed them
as "bounded, not measured" (section 10.2): a square-cut edge between the
rounded edge's term and pitot pressure on the whole face; a rounded
trailing edge between no base drag and the square edge's term; the band
the whole gap. RM A53D02 fig. 17 (square-cut edges on 71.6 deg fins, read
once in 0008) is a check of the first, not a bound.

**W7. Mach 1.0 to 1.2** (in progress, 0013 on `transonic-mach1`; as its
latest commits state): cones meet the supersonic standard at Mach 1.2; at
1.1 the finest grid lies within 6.7e-5 of the exact drag but the
procedure refuses it; at Mach 1 the value is labelled a fitted estimate;
blunt noses and Mach 1 to 1.2 are not served. A total there
also needs W2 and W1 below 1.5, W4 at subsonic normal Mach numbers, W3(d),
and the fins' linear 3D theory near Mach 1, which 0009 has not measured.

**W10. Boat-tails.** The boat-tail's own pressure drag from the nose solve
continued over the converging afterbody (a new profile; attached
supersonic flow), with a viscous allowance measured on RM E51F26 (5.6);
the base pressure by Love's method (TN 3819 figs. 19 to 26) or Cortright's
semi-empirical coefficient, fed the Mach number and pressure ahead of the
base from the solve; band set on RM E51F26, TN 3819 fig. 25 (Kurzweg,
Mach 3.24), RM L52J21a's base shapes (with fins, fig. 8), TN 3372's
configuration D (a converging afterbody in flight, Mach 0.7 to 1.2), RM
A52E20 (Reller and Hamaker, Mach 2.73 to 4.98; not opened); hold-out TN
3320 (the RM-10 in flight, boat-tailed with fins at the base, Mach 0.9 to
3.3; held back whole, section 10). Fins ending ahead of the boat-tail
come from W1's x/c. Effort large.

**W8. Steep, detached and subsonic sharp tips.** 35% of cases at Mach
1.0 to 1.2, 2% at 1.2 to 1.5: the two-scale grids (W5's branch, detached
tips measured on two grids) and 0013 cover them; no separate item.

**W12. The page's wedge-flat section with a blunt trailing edge** (a
bevelled leading edge on a square-edged plate), which the library already
takes. Small; do it with the page inputs W3, W4, W6, W10 and W11 need
(edge shapes, tip radius, boat-tail, altitude and speed with a standard
atmosphere).

## 7. Refusals that should stay

- **The grid and numerics refusals** (N7 to N10, P3): a fit that does not
  converge, a band that cannot be measured, a grid that fails its gates,
  flow leaving the body subsonically. They are the statement that a
  number's error is not known. Lift them only by better grids, measured.
- **Laminar layers at the base and at blunt trailing edges as the nominal
  state** (B3, T5): base pressure then depends strongly on Reynolds
  number (TR 1109, TN 2360 p. 8). They stay inputs, shown as bands.
- **Fins at the base other than three or four** (B5 after W1): TN 2360
  has two and four only.
- **Forward-swept leading edges, compression corners, the Prandtl-Meyer
  limit** (F10, F11): rare, and outside every method's verification.
- **Blunt noses far from the measured** (N11): near-flat faces and
  untangent blunt noses until corners on C grids are measured (W6).
- **Beyond the data**: thin-layer parameters past 4.5, Re_D outside 6.7e3
  to 1e6, Mach above 3.0 for the bases (the page's nose goes to 5; the
  bands are stated to 3.0).
- **The class rule** is not a refusal and stays: outside the Basic
  Finner's class a total is "an estimate, not validated" until a hold-out
  of its own class passes (and inside it too, while its claim is
  suspended, section 10.7).

## 8. Sources

Opened for this record (NTRS numbers; PDF pages where cited):

| Source                                                                      | Used for                                                                                                                |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Love, NACA TN 3819, 1957 (19930084517)                                      | figs. 32 to 35 (fin location, thickness, RM-10 sweep, Mach), pp. 19 to 24, references                                   |
| Spahr and Dickey, NACA TN 2360, 1951 (19930083086)                          | summary; thickness, count, location, Mach (pp. 8 to 11); fig. 6 not read                                                |
| Hart, NACA RM L52E06, 1952 (19930087048)                                    | the standard body with and without fins, Mach 0.7 to 1.3; accuracy (pp. 4 to 5); figs. 7, 8 by eye; figs. 10, 11 listed |
| Peck, NACA TN 3372, 1955 (19930084618)                                      | the standard body's fins (0.09 in, 0.045 in radius, square trailing edges); configuration D's converging afterbody      |
| Pittel, NACA TN 3697, 1956 (19930084447)                                    | the standard body (pp. 3 to 4, figs. 1(a), 2(a)); fig. 5, six models, Mach 1.0 to 2.1, by eye                           |
| Welsh, NACA TN 3650, 1956 (19930084426)                                     | the wingless body's drag, Mach 0.7 to 1.6 (fig. 4, not read)                                                            |
| Love and O'Donnell, NACA RM L52J21a, 1952 (19930087533)                     | summary; the 45 deg swept 8% fins (fig. 5 text)                                                                         |
| Jackson, Rumsey and Chauvin, NACA TN 3320, 1954 (19930084086)               | summary (the RM-10 in flight)                                                                                           |
| Perkins, Jorgensen and Sommer, NACA TR 1386, 1958 (19930091022)             | summary: blunted cones and Karman ogives, Mach 1.24 to 7.4                                                              |
| Gowen and Perkins, NACA TN 2960, 1953 (19930084018)                         | pressure distributions at subsonic and supersonic Mach numbers (pp. 5 to 6)                                             |
| Goodwin, Creager and Winkler, NACA RM A55H31 (19930088843)                  | summary: Mach 3.9, yaw 0 to 44 deg                                                                                      |
| Penland, NACA TN 3861, 1957 (19930084664)                                   | summary; crossflow results (figs. 15, 16 listed)                                                                        |
| Goin, NACA RM L52D21, 1952 (19930087183)                                    | summary: blunt trailing edges, 45 deg sweep, Mach 1.41 to 1.96                                                          |
| Cortright and Schroeder, NACA RM E51F26, 1951 (19930086724)                 | summary of results: boat-tails at Mach 1.91                                                                             |
| Bromm and Goodwin, NACA TN 3708 (19930093738)                               | summary: seven boat-tail bodies, mostly laminar                                                                         |
| Chapman, NACA TR 1051, 1951 (19930082917)                                   | the Mach numbers of its data (1.5, 2.0, 2.9)                                                                            |
| RIT Launch Initiative, Spaceport America Cup 2023 technical report, team 84 | population: nose, fins, boat-tail practice                                                                              |
| Space Team Aachen, Aquila (spaceteamaachen.de/projects/aquila)              | population: Von Karman nose, four fins, boat-tail, Mach 1.8                                                             |
| Wildman Rocketry kit listings (eRockets; RocketryForum)                     | population: 5:1 Von Karman metal-tipped noses, 1/16 in G10 fins, three fins                                             |
| OpenRocket, commit 591c5e5, `core/src/main/resources/datafiles`             | population: example designs and presets (`out/openrocket-survey.out`)                                                   |

Found, not opened: TN 3548 (Morrow and Katz, 19930084307), RM L51F29
(Katz and Stoney, 19930086750). Not reached: Faro, Bumblebee Report 106
(APL 1949; fig. 35's free-flight source; not on NTRS); Hill and Alpher
(J. Aero. Sci. 1949); Beckwith and Gallagher, NASA TR R-104 (not found by
NTRS search); transonic cylinder pressures (e.g. Macha, J. Aircraft 1977;
not tried); the USAF DATCOM (not opened); RM A52E20 and RM E50D28 (not
searched). The earlier hold-out search's "not reached" list stands
(`docs/research/total-drag/data/validation_candidates.md`).

## 9. Open

The three decisions this section first asked for (the partition of the
hobby-class sets, bounded estimates, the Basic Finner's factor) were made
by the owner on 2026-10-20 and are registered in section 10.

Two proposals this section then made (runs per Mach range; BRL 934's run
also testing the present model) were accepted by the coordinator with
conditions, and are registered in sections 10.5 and 10.6.

For the work:

- The population is assembled from a few cited designs and stated
  assumptions; a survey of Spaceport America Cup and IREC technical
  reports would replace the weights. W1's lead, and the order of the rest
  but for the shifts section 4.3 notes, hold under the two variants
  tried.
- The nose's grid-dependent refusals (N7 to N10) can be measured only by
  solving the population's noses on the GPU; until then the nose figures
  are upper bounds.
- Every figure read by eye in section 5 is one reading; each needs two
  before it sets or tests a band (section 10.4).

## 10. Registration: the owner's decisions of 2026-10-20

Registered before any work on W1 to W12 starts, and committed as such.
Nothing below changes except by a recorded decision made before the data
it concerns are run.

### 10.1 What sets bands, and what tests them

**Rules.**

1. The free-flight total-drag sets of the table below (the owner's three,
   and TN 3320, added by this record and accepted by the coordinator) are
   held back as independent tests. No figure, table or value in them sets
   or shapes a band, chooses a method, or decides between interpretations.
2. Component and tunnel data set the bands: the second table, by figure
   or table. A figure not named there sets nothing until a later record
   names it, before it is used.
3. Each held-back set is run once in each of its Mach ranges (section
   10.5, fixed now), after every method that range's cases need and each
   method's band are committed. Its result is recorded whatever it is:
   residuals, passes, failures and refusals alike. No range is run again
   for the same cases, and no range is redrawn. A failure refuses the
   configuration it tests and does not widen a band or retune a method
   (0008 section 6.1).
4. A pass is 0010's: every case's measured over modelled within its
   tolerance, built from the model-form band, the input bands and the
   set's own spread as 0010 sections 6.2 and 10.3 build it.
5. Before a set is run, and before a figure sets a band, it is read twice
   (0008's reading rule; section 10.4 lists what has one reading or none).

**Held back: the tests.**

| Set                                                                                                             | Held back (every drag value in these)                                                                                                                                                             | Not held back                                                                                                                                                                                                                                                         |
| --------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The Langley PARD standard body                                                                                  | TN 3697 fig. 5 (six models, Mach 1.0 to 2.1); TN 3650 fig. 4 (the wingless body, Mach 0.7 to 1.6); RM L52E06 figs. 9 to 12 (its totals, the fin-drag increments derived from them, the fore drag) | RM L52E06 figs. 6 to 8 and TN 3372 figs. 7 to 12 (base pressures: band-setting, below); the geometry (TN 3697 figs. 1, 2; RM L52E06 fig. 1 and table I; TN 3372 fig. 1), used only to describe the body; the winged totals of TN 3697 and TN 3650, which are not used |
| BRL Report 934 (DTIC AD068959)                                                                                  | Table III, Graphs I and II                                                                                                                                                                        | Table I and the text's geometry, used to describe the models. Transcribed (`docs/research/total-drag/data/basic_finner_brl934.md`), its scatter computed; no model run on it                                                                                          |
| The Eglin "4-Fin Circular" set (AFRL-MN-EG-TR-2001-7082, DTIC ADA395037)                                        | Table D-3                                                                                                                                                                                         | fig. 4 (geometry). Opened, not transcribed                                                                                                                                                                                                                            |
| TN 3320 (the RM-10 in flight, boat-tailed, fins at the base): added by this record, accepted by the coordinator | every figure: its totals and its base pressures                                                                                                                                                   | Held back whole for W10, so that none of its base pressures sets a term its totals would test. Not one of the owner's three: added by this record, its holding back accepted by the coordinator on 2026-10-20                                                         |

Where one body appears on both sides: RM L52E06's and TN 3372's base
pressures (the PARD body, finless and finned, Mach 0.7 to 1.3) set the
flat-plate fins-on-base factor and the base below Mach 1.5, while the same
body's totals are held back. The totals come from other flights, so the
test is independent data, but at Mach 1.0 to 1.3 it tests a total whose
base term was set on that body; the run's record says so. Above Mach 1.3
no PARD data sets any band.

**Band-setting: component and tunnel data.**

| Source                            | Sets bands with                                                                                                                                                        | Not used to set bands                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- |
| TN 3819 (Love)                    | figs. 32 to 35 (fins at the base: location, thickness, sweep, Mach; fig. 35's free-flight line is base pressure, component data); fig. 18 as now; figs. 19 to 26 (W10) | the rest                                    |
| TN 2360 (Spahr and Dickey)        | figs. 5 to 7 (base pressure with tails: Reynolds number, location, count, thickness, Mach)                                                                             | fig. 1 (a compilation of other reports)     |
| RM L52J21a (Love and O'Donnell)   | fig. 8 (the finned body's base pressures), figs. 31 to 33 (unfinned, against Reynolds number), figs. 38, 39 (fin effects)                                              | the rest, unless a later record names them  |
| RM L52E06 (Hart)                  | figs. 6 to 8 (base pressures: the sting's effect, rim and centre with and without fins, base drag of A and C)                                                          | figs. 9 to 12, held back                    |
| TN 3372 (Peck)                    | figs. 7 to 12 (base pressures of configurations A to D, D for W10)                                                                                                     | it has no total drag                        |
| TR 1109, RM A51J25, TN D-1056     | as now (figs. 8 and 29; fig. 7; table II)                                                                                                                              |                                             |
| RM L52D21 (Goin)                  | figs. 3, 4 and 7 to 16 (base pressures of blunt trailing edges, unswept and swept)                                                                                     | figs. 1, 2, 5, 6 (models, photographs)      |
| TN 3548 (Morrow and Katz)         | its base pressures on the blunt trailing-edge airfoil (figures named when it is opened)                                                                                | its diamond and circular-arc airfoils' drag |
| TN 2960 (Gowen and Perkins)       | figs. 5(a) to 5(e) (pressure distributions), 6, 7 (drag against Reynolds and Mach numbers; figs. 5(c) and 7 as now)                                                    | figs. 8, 9                                  |
| RM A55H31 (Goodwin et al.)        | figs. 9 to 12 (pressure ratios on the yawed cylinder, pressure drag against yaw)                                                                                       | the heat-transfer figures                   |
| TN 3861 (Penland)                 | figs. 15, 16 (crossflow results) and the pressure distributions behind them                                                                                            | the rest                                    |
| By the same rule, for W5, W6, W10 | TR 1386 (nose pressures and foredrags: a check of the nose solve, as 0006 uses TN 3716, not a total); RM E51F26 (boat-tail side and base pressures, no jet)            | RM E51F26's jet-on data                     |

RM A53D02 fig. 17 (square-cut leading edges, a total-drag increment, read
once in 0008 and so not blind) sets no bound of W11; it may check the
square-edge bounds once they are committed.

### 10.2 "Bounded, not measured"

The owner allows a number whose band is the whole gap between two bounds,
for square-cut leading edges and rounded trailing edges. Defined:

- **When it applies.** No measurement covers the component at the case's
  conditions, but it lies between a lower and an upper bound, each either
  a measured term with its own band or a physical limit (the pitot
  pressure, the vacuum bound, zero area), and that it lies between them
  (the ordering) is shown by a measurement or by a physical argument
  written in the record before the number is served. Without the
  ordering shown, the case stays refused.
- **What is served.** The midpoint of the bounds, with a band from the
  lower bound's low end to the upper bound's high end: the whole gap, the
  bounds' own bands included, nothing narrowing it. It enters the total's
  band linearly, as every component's does.
- **The label.** "bounded, not measured: between <lower bound> (<its
  source>) and <upper bound> (<its source>)", with the gap's size in C_D
  beside the component. A total that contains one is at best "an
  estimate, not validated", whatever its class, and its claim names the
  bounded component.
- **Where.** Square-cut leading edges: lower, the rounded edge of the same
  thickness (W4's term at its band's low end; TN 2960); upper, pitot
  pressure over the whole face (a physical limit); the ordering to show,
  that a flat face carries at least a half-cylinder's front-side drag.
  Rounded trailing edges: lower, no base drag; upper, the square-cut edge
  of the same thickness (W3's term at its band's high end; TR 1109, RM
  A51J25, TN D-1056); the ordering to show, that the rounded edge carries
  neither thrust nor more than the square edge's base drag. Anywhere else
  only by a recorded decision, and never where a measured method covers
  the case.

### 10.3 The Basic Finner's factor

- The validated total of the Basic Finner's class keeps the present
  fins-on-base factor (0010 section 1.3, `src/base/fins-on-base.ts`) and
  its labels unchanged, for every case inside the class, even where the
  rebuilt factor (W1) would also cover it.
- The rebuilt factor replaces it inside the class only after the rebuilt
  factor passes its own hold-out, BRL 934 first, and then only by a
  recorded decision. Once replaced, the class's validated claim rests on
  the hold-out the rebuilt factor passed: the DREV gate tested the
  present factor, and a changed term is not validated by it (0008
  section 6.1).
- Outside the class the rebuilt factor is served once committed, as every
  component is: with its band, labelled estimated on component data, the
  total "an estimate, not validated" until a hold-out of its class passes.
- BRL 934's run in its range A (sections 10.5, 10.6) also reports the
  present model at its rounds at Mach 1.798 to 2.47, beside the rebuilt
  one: a second test of the present claim. If the present model fails
  there by rule 4 of 10.1, the Basic Finner's validated claim is
  withdrawn. Accepted by the coordinator on 2026-10-20, on the condition
  that the inputs BRL 934 does not state are decided first (10.6).

### 10.4 Readings still owed

Before any of these sets a band or tests anything, each is read twice:

- **One reading, by eye, in this record** (section 5): TN 3697 fig. 5; RM
  L52E06 figs. 7 and 8; TN 3819 figs. 33 and 34. They are quoted only to
  plan the work.
- **One reading:** TN 3819 fig. 35 below Mach 1.8 (round 3 only); TN 3819
  fig. 18's rows at Mach 1.0, 1.2 and 1.4; BRL 934's Graph I (its tables
  were read twice by the same reader; a second reader is pending, 0010
  section 9).
- **Not read:** TN 3819 fig. 32; TN 2360 figs. 5 to 7; RM L52E06 fig. 6;
  TN 3372 figs. 7 to 12; RM L52J21a's figures; RM L52D21's; TN 2960 figs.
  5(a), 5(b), 5(d), 5(e) and 6; RM A55H31 figs. 9 to 12; TN 3861 figs. 15
  and 16; TN 3548; TR 1386; RM E51F26. And of the held-back sets: TN 3650
  fig. 4, RM L52E06 figs. 9 to 12, the Eglin Table D-3.

### 10.5 Each held-back set's Mach ranges, fixed now

Accepted by the coordinator on 2026-10-20: a held-back set is run once
in each of the ranges below, each when the methods listed for it are
committed, so that the partition cannot depend on any result. A case
belongs to the range that contains its Mach number, the lower end
included. A range is run when its methods are committed, whatever the
state of the set's other ranges, and never again.

| Set                                                                              | Range                                      | Run once when these are committed (with their bands)                                                                                                                                                                                 |
| -------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| The PARD standard body (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06 figs. 9 to 12) | A: Mach 1.2 and above (the data reach 2.1) | the body's nose solved from its coordinate table (RM L52E06 table I, TN 3697 fig. 1(a)) or refused; W1 (flat plates, swept, at the base); W2 (the base at 1.2 to 1.5); W3 (square trailing edges); W4 (rounded leading edges, swept) |
|                                                                                  | B: Mach 1.0 to 1.2                         | in addition W7 and the fin terms at Mach 1.0 to 1.2 (W3(d), W4 at subsonic normal Mach numbers, the linear 3D theory near Mach 1). Values below Mach 1.0 are not used                                                                |
| BRL Report 934                                                                   | A: Mach 1.5 to 2.47                        | W1; the run also reports the present model at 1.798 to 2.47 (10.3, 10.6)                                                                                                                                                             |
|                                                                                  | B: Mach 1.2 to 1.5                         | W2, with W1's part below Mach 1.5                                                                                                                                                                                                    |
|                                                                                  | C: Mach 0.98 to 1.2                        | W7 and the components at Mach 1.0 to 1.2                                                                                                                                                                                             |
| The Eglin "4-Fin Circular" set                                                   | A: Mach 1.5 to 3.0 (shots at 2.25 to 2.34) | W1, and the methods its fins' edges need, those edges decided from evidence without its drag and registered before the run (its fig. 4 does not draw them)                                                                           |
|                                                                                  | B: Mach 1.2 to 1.5 (shots at 1.42 to 1.47) | W2                                                                                                                                                                                                                                   |
|                                                                                  | C: above Mach 3.0 (3.08 to 3.42)           | only if a later record extends the bases above Mach 3.0                                                                                                                                                                              |
| TN 3320 (the RM-10)                                                              | A: Mach 1.2 to 3.0                         | W10; W1 (60 deg swept circular-arc fins at the base)                                                                                                                                                                                 |
|                                                                                  | B: Mach 1.0 to 1.2                         | W7 and the components at Mach 1.0 to 1.2. Values below Mach 1.0 are not used                                                                                                                                                         |
|                                                                                  | C: above Mach 3.0 (to 3.3)                 | only if a later record extends the bases above Mach 3.0                                                                                                                                                                              |

_Amended by 10.7 (u), 2026-10-23:_ the Eglin set's range A is run at the
earlier of the commit of design record 0021's Stage A verdict (pass or
fail) and 2027-06-30, and not before, whatever other methods are
committed by then; the owner's decision. _Withdrawn by 10.7 (v),
2026-10-24,_ when Stage A was frozen.

### 10.6 BRL Report 934: the inputs it does not state, decided before its run

Accepted by the coordinator on 2026-10-20, on this condition: every input
the run needs that BRL 934 does not state is decided here from evidence
other than its drag, each with the rule that would change it before the
run. The evidence is the transcription
(`docs/research/total-drag/data/basic_finner_brl934.md`, sections 2, 8
and 9); its measured drag values were transcribed and their scatter
computed, but no model value has been computed or looked at, and none of
the decisions below uses a drag value.

1. **Model diameter: 0.78 to 0.82 in, an input range.** Evidence: Graph
   IV's legend (centre-of-gravity groups in calibres) against Table I (the
   same in inches): 0.781 to 0.816 in per calibre over the five groups,
   rounded outward to 0.01 in. Fig. 3's photograph (0.72 to 0.81 in, with
   an unknown perspective) does not set it. Both ends are run; the
   Reynolds-number difference they make is an input band. Rule: a BRL or
   BuOrd source stating the models' diameter, reached before the run,
   replaces the range.
2. **Range air: 288 to 298 K at 1 atm, an input range.** The report prints
   no air conditions; this is an assumption for an enclosed gallery,
   stated as one. The Mach numbers are measured, so the air moves only the
   Reynolds number and the cold-wall input's temperature. Both ends are
   run, as an input band with the diameter's. Rule: a BRL record of the
   range air for rounds 2588 to 3264, reached before the run, replaces it.
3. **Fin leading-edge radius: sharp (no rounded-edge term).** Evidence:
   the period drawings of the Basic Finner opened, Kermeen (DTIC AD146516
   fig. 1, PDF p. 11: a sharp wedge "0.080" thick at the base) and NAVORD
   6652 fig. 1 (NOL's tunnel model, no radius drawn). DREV's 0.004 cal
   (TM 9703 p. 3) is stated for DREV's own models, not BRL's; on BRL's
   models of about 20 mm it would be 0.08 mm, below what the shadowgraphs
   of figs. 7 and 8 resolve, so they cannot decide it. The run reports,
   beside the verdict, the values with DREV's 0.004 cal edge where the
   library serves it, as a stated sensitivity; the verdict is the
   nominal's. Rule: a drawing or statement of BRL's own models (BuOrd
   Ballistic Technical Note 5, BRL Report 799), reached before the run,
   decides instead.
4. **Trailing-edge area: constant thickness, 0.32 cal^2** (0.08 cal over
   the 1 cal span, each of four fins). Evidence: the same design as DREV's,
   whose 0.32 cal^2 was decided on DREV's measured mass properties (0010
   section 4.1); BRL's Table I cannot separate the fins' share of the
   inertia, its models' construction not being described. The tapered
   alternative (0.16 cal^2), which the library refuses, is reported beside
   the verdict as the trailing-edge term halved, a bound by hand, not a
   verdict. Rule: a drawing of BRL's models, reached before the run,
   decides instead.
5. **The transcription's other choices** (its section 9), adopted as
   proposed there, with its open points decided by these rules, none of
   which uses a drag value:
   - _Rounds:_ those in the range's Mach numbers whose mean squared yaw is
     printed and at most 5 deg^2, and which neither reading of Graph I
     marks laminar. So 3255 (yaw not printed) is out; 2598 (5.6 deg^2)
     and 3256 (6.6 deg^2) are out; 3249 is out if both readings mark it
     laminar; 3264 is used at Table III's values (the primary record),
     once the independent reading of Table III agrees.
   - _Zero-yaw value:_ CD0 from Graph II's curve; the text's rounded C_D'
     reported beside it.
   - _Transition:_ fully turbulent nominal (the report's own observation
     for the admitted rounds), with 0008's transition input band and the
     fins' trailing-edge laminar input as for DREV.
   - _Wall:_ adiabatic nominal, the cold-wall input at the range air's
     temperature.
   - _Nose:_ a sharp 10 deg cone (Taylor-Maccoll).
   - _Tolerance:_ rule 4 of 10.1, the spread per Mach cluster from the
     admitted rounds, the diameter and air ranges as input bands.
   - _Readings:_ the independent reader's second reading of Table III's
     drag columns, Table II's yaw and Graph I's symbols (the transcription's
     section 10) is done before the run.
6. **What the present model's test covers.** BRL's Reynolds numbers
   (about 0.7 times DREV's: below, or at the top of the diameter and air
   ranges near, the page's class floor of 1.19e7 on length) and, with
   sharp edges, its leading-edge radius lie outside the class as the page
   decides it (0011 section 3). The run therefore tests
   the claim's configuration at BRL's conditions; by the decision
   registered in 10.3, a failure of the present model there withdraws the
   claim all the same.

### 10.7 Amendments, dated

Added below the registered text, never written over it: sections 10.1
to 10.6 stand as registered on 2026-10-20, and each change to what they
decide is a dated entry here, made before the data it concerns are run.

**2026-10-21 (a): fins at the base above the end of TN 3819 fig. 35's
free-flight curve**, a recorded decision under 10.2's "Anywhere else
only by a recorded decision". First written as a bullet inside 10.2's
list on 2026-10-21 (commit 9b089bb), and moved here unchanged the same
day, except that its reference to W1's record, not yet on the main
branch, is reworded:

> **Recorded decision, 2026-10-20: fins at the base above the end of TN
> 3819 fig. 35's free-flight curve** (M 2.56 to 3.0; 0010 section 11.5).
> Lower, no fin effect (F = 1 for the present factor, defined on the
> basic curve; the zero member's low end for the rebuilt factor, W1's
> record, pending); upper, the factor at the curve's end, its band's high
> end, carried as a ratio; the ordering argued there from Love's
> "decrease in fin effects as Mach number increases" (TN 3819 p. 23) and
> TN 2360's dependence on the fins' thickness and slope, written before
> the number was served.

**2026-10-21 (b): the present factor corrected, and the Basic Finner's
validated claim suspended** (10.3; 0010 sections 11 and 11.7; 0008
section 6.4).

- _The correction._ The present factor's free-flight line, as this
  record and 0010 section 1.3 knew it, followed Love's estimate B, a
  prediction, above about Mach 2.15; the factor was corrected on
  2026-10-21 to two readings of fig. 35's free-flight curve as
  identified, which ends at Mach 2.563, with the identity-swap allowance
  re-derived (0.005 to 0.0077) and, above the end, the bounded factor of
  amendment (a). The class had been narrowed to Mach 1.799 to 2.15 the
  day before (0010 section 7).
- _What moved._ Inside the class the body base, and so the total, moves
  by +0.00105, -0.00031 and -0.00042 in C_D at the three shots (Mach
  1.799, 1.846, 1.85: -0.07% to +0.17% of the total), and by -0.00082
  and -0.00123 at Mach 2.0 and 2.15; the served defaults by +0.17%,
  -0.15% and -0.24% at Mach 1.8, 2.0 and 2.15. Above the class the total
  falls by 0.7% to 1.0% at Mach 2.35 to 2.41 and by 2.6% to 3.0% at 2.66
  to 2.97. The gate re-run is a recorded correction, not a test:
  residuals -5.1% to +7.5% (mean -0.4%), every shot inside its tolerance
  (0010 section 11.6).
- _The owner's decision._ By 0008 section 6.1 (a term changed after a
  test is not validated by it), the Basic Finner's total is "an
  estimate, not validated" everywhere, inside the class too, until a
  held-back set tests the corrected factor. 10.3's first bullet ("the
  validated total of the Basic Finner's class keeps the present factor
  ... unchanged") therefore holds no validated total meanwhile: the class
  keeps the corrected present factor, and its rule (Mach 1.799 to 2.15,
  Reynolds number 1.19e7 to 2.0e7, 216.65 to 320 K, each dimension
  within 0.5%; 0011 section 3) is kept for the next test, which covers
  its Mach range at BRL's conditions, not the whole class (10.6, item 6).
- _The route back._ BRL Report 934's range A (Mach 1.5 to 2.47, 10.5),
  run once as registered, after its second reading and the decisions of
  10.6, is the test of the corrected factor: the present model reported
  at its rounds at Mach 1.798 to 2.47, as 10.3's last bullet registers.
  If it passes by rule 4 of 10.1, the class is validated over what that
  range supports; if it fails, the claim is withdrawn, as registered.
  Not run (as written on 2026-10-21). Run once on 2026-10-22, as
  registered in amendment (n): the present model passed at all seven
  rounds (0020). Range A supports nothing inside the class, so the class
  stays suspended, and a narrow sub-class at the tested conditions is
  validated instead: amendment (q).
- _History._ The second run (0010 section 4.2), round 5's tolerances
  (0010 section 10) and the correction's residuals (0010 section 11.6)
  are kept in the record as they were.

**2026-10-21 (c): readings.** Fig. 35's free-flight curve is now read
twice, at Mach 1.0 to 2.56, by two readers (0010 section 11.3), so 10.4's
"TN 3819 fig. 35 below Mach 1.8 (round 3 only)" no longer applies to
that curve; round 3's reading is superseded above about Mach 2.15, where
it followed estimate B.

**2026-10-21 (d): swept fins at the base refused; the ordering of (a)
restated** (0010 section 11.5; after the independent review of the
correction).

- _Which fins._ Amendment (a)'s lower bound, no fin effect, rests on
  sources that measure four unswept fins 5% to 10% thick at the base
  (TN 3819 figs. 33 and 35, TN 2360). The present factor took no sweep:
  the review found four 8% double wedges swept 45 deg at both edges, at
  the base, served at Mach 2.0 as an analogy (F 1.258) and at 2.8 as
  bounded, 1 to 1.3612, where RM L52J21a measures about 0.96 to 1.12 for
  four 45 deg swept 8% fins (W1's reading, pending on its branch). The
  factor now refuses fins swept at either edge, and so any tapered
  planform, in the measured and the bounded parts alike (`fin-sweep`;
  section 2.3, B8), until the rebuilt factor (W1) serves them. Its other
  inputs were checked against its sources the same way: four fins and t/c
  0.05 to 0.10 were already refused otherwise; sections other than
  circular arcs stay "an analogy, not a measurement" (0008 section 3.4);
  span and chord, which the sources do not vary, are not refused (0011
  section 6).
- _What it costs before W1_ (`docs/research/refusals/`, the same 2000
  rockets, its `out/2026-10-21-swept-at-base/`; the library agrees with
  the decomposition on all 824 cases it can represent): the refusal
  applies to 69.0% of cases, but nearly all of them are refused already
  (thickness, count, edges); it is the sole blocker in 0.01%. Totals
  served at Mach 1.8 to 3.0 go from 5 of 2000 rockets to 4 (0.25% to
  0.20%), over all four bands from 9 of 8000 cases to 8; in the
  sensitivity with more four-fin, sharp-edged fins from 9 to 8 at Mach
  1.8 to 3.0, and with fewer Haack noses unchanged at 7. W1's share of
  cases is 96.0% (95.8% before). Sections 1 to 6 quote the run before
  this change.
- _The ordering, restated._ (a) argued the upper bound from Love's
  "decrease in fin effects as Mach number increases". Fig. 35 shows that
  decrease from Mach 1.7 to 2.56, not above: both of Love's predictions,
  in both readings, rise from Mach 2.6 to 3.0 (A: F 1.20 to 1.23; B:
  1.29 to 1.33). The bound holds by its margin: the free-flight factor at
  the curve's end is 1.153, and 1.18 at Mach 3.0 with the fin effect at
  2.56 held fixed in P_B; the upper bound, 1.3612, lies above both by the
  carried tunnel excess (0.2083) and above both predictions. That the
  predictions lie inside the band checks two predictions, not the bound.
- _The step at Mach 2.56._ The served nominal falls from 1.2020 (the M
  2.56 row) to 1.1806, about -0.0024 in the Basic Finner's body base C_D
  (-0.55% of its total), and the low end from 1.043 to 1.

**2026-10-21 (e): flat plates at the base refused** (0016 sections 18 and
20; after W1's review). 0016 section 18 served fins at the base thinner
than the factor's 5% data with the factor's low end at no fin effect (F =
1), on the argument that thinner fins lower the base pressure less. For
flat plates that is not a lower bound: the only flat-plate source, RM
L52E06 fig. 7 (four plates at the base), measures relief, F 0.85 to 0.88.
Until W1's rebuilt factor serves plates with that relief as its low end,
the present factor refuses flat-faced fins (flat plates with square or
rounded edges) at the base (`flat-plate-fins`): "flat plates at the base
lower the base drag by up to 15% (RM L52E06 fig. 7, F 0.85 to 0.88), which
this factor's data do not cover; the rebuilt factor will serve them". The
thin-fins extension stays for the wedge, circular-arc and hexagonal
families. It applies to 43.5% of the population's cases and refuses 3 of
the 20 totals served (all at Mach 1.8 to 3.0: 13 of 2000 rockets to 10;
`docs/research/refusals/out/2026-10-21-plates-at-base/`, the library
agreeing with the decomposition on all 1200 cases checked).

**2026-10-21 (f): the fins' own-drag band refused below Mach 1.5** (the
coordinator's decision on design record 0019's finding, branch
`w7-fins`; the fin terms of W7). The fins' own-drag band, 1.01 to 1.59
(0008 section 4.3), was formed on the ARCAS increments at Mach 1.5 to 2.96
only, yet `src/total` applied it to fin friction and to the wave drag of
sharp sections at every Mach number. The increments' shortfall against
the model grows as the Mach number falls (fins' own over measured 0.49 at
Mach 1.5, 0.85 at 2.96), so the band measured at 1.5 bounds nothing below
it. Below Mach 1.5 fin friction and the wave drag of sharp sections (the
exact 2D section drag times the linear 3D ratio, 0009, tested only
through that band) are now refused (`fins-own-drag-mach`); a flat
plate's faces, of no wave drag by the geometry, stay served. Before it
the library served the wave drag of thin double wedges from where their
2D shock attaches (from Mach 1.08 at t/c 0.015 on the hobby planform of 0016) with the ARCAS band: 109 of the 2000 population cases at Mach 1.0
to 1.2 (0019, `docs/research/refusals/out/w7-plan.out` on `w7-fins`). No
served total changes: every total below Mach 1.5 is refused by the body
base (B1). It must land before or with W1, which opens the body base at
Mach 1.0 to 1.5. Lifted only by a fin increment near Mach 1, read twice
(RM L55H09 the candidate; 0019 section 3.1), and, for sharp sections, by
the measured near-Mach-1 method of 0019 (F5). The band's upper end
(2.96) is not enforced: the body base and the fins at the base refuse
above Mach 3.0, and 2.96 to 3.0 is carried, as before. Coverage (the same
population and run, `docs/research/refusals/out/2026-10-21-w7-guard/`,
its cross-check against `src/total` agreeing on all 1200 cases): the
outcomes are those of `out/2026-10-21-plates-at-base/` in every band; the
refusal applies to every case below Mach 1.5 and is the sole blocker in
none. In 0014's ranked order the totals at Mach 1.2 to 1.5 now wait for
the fin terms of W7 as well as W2 (0% until W7; before, 16.3% after W2
and 74.8% after W11).

**2026-10-21 (g): NSWCDD/TR-92/509, and the true order of events.**
Commit 6497a66 (2026-10-20, 22:58 UTC) added NSWCDD/TR-92/509 to 10.1's
table as band-setting, "decided by the coordinator on 2026-10-20, before
any use", and to 10.4's one-reading list. The order was the other way: its
Table 2 had been transcribed and examined against W1's swept bracket in
commit 10beeff (19:39 UTC the same day; `w1b_w2_proposal.md` section 1.3,
"Is the effect bracketed?"), which found every value at the base inside
the bracket, before it was registered. That row is removed from 10.1 and
10.4, which read again as registered (68ae3ee), and the registration is
recorded here as what it was, a decision taken after the data were seen:
Table 2's zero-incidence rows with the fins undeflected and Table 1 (the
configuration index), four fins at the base with the leading edge swept
43.9 deg and the trailing edge unswept, t/c 0.05 to 0.15, Mach 2.0 to 3.0,
C_DB to about +-5%, for W1's ordering of moderate sweeps (W1b, 0015
section 3.4); not its fins ahead of the base, its angle-of-attack and
deflection data, its empirical model or Mach numbers above 3.0. Since it
was seen first, it is a check of the ordering, never a test of it, and no
claim rests on it as one. Its Table 2 has one transcription (a blind
second requested).

**2026-10-21 (h): the reading status of every figure 10.4 lists**, as of
this date (each record named holds the pairing):

- TN 3697 fig. 5: one reading, by eye, in this record; held back and not
  to be read further before its run.
- RM L52E06 fig. 7: two readings (0015 section 7). Fig. 8: two readings
  of A (0015 section 11.3). Fig. 6: not read.
- TN 3819 figs. 33 and 34: two readings (0015 section 7). Fig. 35's
  free-flight curve: two readings at Mach 1.0 to 2.56 (0010 section
  11.3; amendment c), the tunnel symbols three. Fig. 18's rows at Mach
  1.0, 1.2 and 1.4: two readings (round 1, round 7), the basic curve's
  row at 1.4 found a misread and replaced by round 7's on the third
  evidence of fig. 35's no-fin curve (0015 section 7). Fig. 32: not read.
- BRL 934's Graph I: as 0010 section 9 states (its tables read twice by
  one reader, a second reader pending); W1's work did not change it.
- TN 2360 fig. 6: two readings (0015 section 7), four symbols found by
  one reader alone, flagged where they set a band's end. Figs. 5 and 7:
  not read.
- TN 3372 figs. 7 to 12: not read.
- RM L52J21a: fig. 8 at R 8.06e6, two readings of the base pressures and
  the noses called by three readers (this work, rounds 6 and 7; two calls
  left out on pairing, the conical and radome noses at Mach 2.41 called
  by round 7 alone; 0015 section 7); figs. 31 to 33 panel (d) at R 7e6 to
  9.5e6, two readings (this work, round 7); fig. 38(c), one reading, which
  the scan does not allow a second of and which no longer sets a band;
  its other figures not read.
- RM L52D21 fig. 11: one reading (0016 section 8); the rest not read.
- TN 2960 figs. 5(a), 5(b), 5(d), 5(e): two readings (0016 section 13);
  figs. 5(c) and 7 as before (0010); fig. 6 read by round 6.
- RM A55H31 figs. 11 and 12: two readings (0016 section 14); figs. 9 and
  10 not read.
- TN 3861 figs. 15 and 16: two readings, fig. 17 one (0016).
- TN 3548, TR 1386, RM E51F26: not read.
- Held back: TN 3650 fig. 4, RM L52E06 figs. 9 to 12, the Eglin Table
  D-3: not read.

**2026-10-21 (i): which factor serves fins at the base, superseding
amendment (e)** (the coordinator's decision under the owner's rule to
serve each case from the data that cover it; after the independent review
of W1, commit e254989). The present factor serves only the fin families
it was measured on: unswept wedge, circular-arc and hexagonal sections,
5% to 10% thick, the Basic Finner's family among them, with 0016 section
18's extension below 5% for those families only. Flat-faced fins (plates,
and plates bevelled at the leading edge only) go to the rebuilt factor's
flat-plate value, "bounded, not measured", with RM L52E06's relief as its
low end (0015 section 4); amendment (e)'s refusal stands only where the
rebuilt factor refuses too (a rounded trailing edge, a plate thicker than
10% at a station, or a sweep it does not take). Swept fins go to the
rebuilt factor as before, except that a sharp section with its trailing
edge swept aft is refused closer to the base than 0.9 root chords, and
one with it swept forward anywhere: no such fins are measured there (RM
L52J21a's 45 deg fins, the one set with a swept trailing edge, sweep it
aft and end 0.85 +-0.05 root chords ahead of the base, and the RM-10's
trailing-edge sweep is not stated), and linear theory puts the faces
behind a swept trailing edge above the unswept fin's (0015 section 3.4).
(As first written this said 0.8 root chords, either way; the second
review of 2026-10-22 found RM L52J21a's position 0.85 +-0.05 from its own
dimensions, so the threshold is the far end, 0.9, and a forward sweep has
no measurement anywhere. Neither change moves a served total, 0015
section 8.)
Plates with a rounded trailing edge, which the present factor served as
four unswept fins at Mach 1.8 to 3.0 until amendment (e), stay refused:
no circular arc bounds a rounded edge (its half-thickness falls as the
square root of the distance to the edge), so neither bound of the bracket
is shown, and no measurement at the base covers them. The third bullet of
10.3, "outside the class the rebuilt factor is served", is read with
this: outside the class the present factor still serves its own families,
the Basic Finner's wedges among them, the rebuilt factor the rest.

What it costs and gains (0015 section 8; `docs/research/refusals/out/impact.out`):
totals of all bands 2.1% before the review to 2.0% (Mach 1.5 to 1.8: 2.7%
to 2.5%; 1.8 to 3.0: 5.5% to 5.2%), ten cases lost, all to the swept
trailing edge, which no band shown covers. No plate case is lost: three
totals served move from the present factor to the flat-plate value, and
the 3 of 20 totals amendment (e) refused on main are served here. The
rounded-trailing-edge plates that amendment (e) refused are 0.2% of the
cases at Mach 1.8 to 3.0, and every one is refused by its edge term
anyway (W11), so no total moves with them. No case is newly refused that
an honest band covers. With amendment (f) merged after it, totals at Mach
1.0 to 1.5 are 0% on the W1 branch too: W2 serves the body base there,
and fin friction refuses every case (the six totals at Mach 1.2 to 1.5,
double wedges, are refused for it); totals of all bands 1.9% (Mach 1.5 to
1.8: 2.5%; 1.8 to 3.0: 5.2%), the cross-check agreeing on all 1200
cases.

**2026-10-21 (j): the fins' own-drag band above Mach 2.96 labelled** (the
coordinator's decision on amendment (f)). Above the ARCAS increments'
highest Mach number, 2.96, the band is carried, not refused, and the
labels of fin friction and of the wave drag of sharp sections now say so:
"at Mach M the band is carried d in Mach beyond its measurements (the
ARCAS increments end at Mach 2.96)", d at most 0.04 for a total (the body
base and the fins at the base refuse above Mach 3.0). The Basic Finner's
gated shot at Mach 2.97 carries the words; no number changes. First
lettered (g); re-lettered (j) on 2026-10-22, the letters (g) to (i) being
W1's.

**2026-10-21 (k): the band-setting data of W7's fin terms, named before
any is read** (rule 2 of 10.1; the coordinator's decisions of 2026-10-21
on design record 0019). No figure below has been read for a value; each
was opened only to see what it covers (0019 section 2). Each is read
twice, by this record's reader and blind by a second, before it sets a
band. First lettered (h); re-lettered (k) on 2026-10-22, as (j).

| Source                                                        | Sets bands with                                                                                                                                                                                                                                  | Not used to set bands                                                                                              |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Bryson, NACA TR 1094 (NTRS 19930092136)                       | figs. 13 and 14 (the thin wedges' forebody drag against Mach number, and in transonic similarity variables); figs. 15 and 16 (the 26.57 deg wedge at Mach 1.44, for whether the similarity reaches bevels of 10 to 15 deg); fig. 1 (the models)  | figs. 22 and 23 (the 12% biconvex airfoil): a check of 0019's ordering for rounded edges only; the rest            |
| Rogers, Berry and Quincey, ARC R&M 3348 (AERADE 1826.2/3929)  | table 3 (base pressures, typed twice); figs. 30a and 30b (base pressure against Mach number and M cos(sweep)); figs. 31a, 31b and 32 to 36 (forebody and complete chordwise forces, single and double wedge); figs. 2 and 3 (planform, sections) | the normal-force and shock-position figures                                                                        |
| Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011) | figs. 9, 10, 13, 15 and 16 (the layers; base pressure against Mach number; its spanwise and sectionwise variation); figs. 2 and 3 (the model, the tappings)                                                                                      | the splitter plates, the step and the cavity; its semicircular trailing edge (W11's, for a later record)           |
| Nash, ARC R&M 3323 (AERADE 1826.2/3903)                       | figs. 4 and 5, each plotted set once its source is traced; a set that appears elsewhere in this table is counted once                                                                                                                            | the rest                                                                                                           |
| Morrow and Katz, NACA TN 3548 (NTRS 19930084307)              | fig. 6, as 10.1 names it; it appears to be RM A51J25 fig. 7's PARD set (0016's `fin_edges_w34.md` section 6), so the two are counted as one set                                                                                                  | figs. 7 to 10: they carry the PARD standard body's totals (its fig. 4 is that body), so they are held back with it |
| RM A51J25                                                     | fig. 7, as 10.1 names it, below M' 1.5 too                                                                                                                                                                                                       |                                                                                                                    |
| Johnston, NASA Memo 4-30-59L (NTRS 19980228287)               | figs. 4 to 12 (the sharp single wedge: forces from pressures, base pressure and drag), 13 (the leading-edge radius), 16 to 23 (the diamond, and the two compared)                                                                                | figs. 14 and 15 (pressure pulsations)                                                                              |
| Sawyer and Daum, NACA RM L8B13 (NTRS 19930085324)             | fig. 4(c) to 4(e) (the wedge's base and sides)                                                                                                                                                                                                   | the cylinders' figs. 4(a) and 4(b)                                                                                 |
| Humphreys, NACA TN 3306 (NTRS 19930084050)                    | figs. 7 to 9 (zero-lift pressure drag, its fore and aft parts, in transonic similarity variables)                                                                                                                                                | the rest                                                                                                           |
| McDevitt, NACA TR 1253 (NTRS 19930092253)                     | figs. 6 to 8 (the symmetrical wings' minimum pressure drag: its correlation, against Mach number, its summary)                                                                                                                                   | the cambered wings                                                                                                 |
| Nelson, Allen and Krumm, NACA TN 3529 (NTRS 19930084232)      | fig. 14 (minimum pressure drag against Mach number) and the basic drag data at zero lift it is formed from (figs. 4 to 32)                                                                                                                       | lift and moments                                                                                                   |
| Few and Fournier, NACA RM L54B25 (NTRS 19930093723)           | figs. 5 to 20 at zero lift (the basic drag data), figs. 21 and 22 (the summary and the pressure-drag rise)                                                                                                                                       | lift and moments                                                                                                   |
| Howell and Braslow, NACA RM L55H09 (NTRS 20050019382)         | the fins-on minus fins-off pressure-drag increments and the tunnel's base pressures, their figures named here before they are read, and only once its text and fig. 1 (the model) show its body is neither the PARD standard body nor the RM-10  | its airplane model; everything, if its body is a held-back one                                                     |
| NASA CR-149372 (Macha)                                        | as 10.1 names it for W4                                                                                                                                                                                                                          | fig. 8a (subsonic front sides): a check of 0019's ordering for rounded edges only                                  |

Checks, which set nothing: TN 3469, TR 1359, ARC CP 145, TN 1211, ARC
R&M 3465, TN D-3634 (the blunt extensions' minimum-drag increments, a
check of the rounded-edge bounds), RM L53L24a, and Pepper's blunt-nosed
65A009 wing (its abstract). Not used: the PARD wing tests whose wing
increments are formed on the PARD standard body (RM L50G31, RM L52F02a and
the like), unless a later record shows the body is another.

Decisions recorded with this registration (the coordinator's, under the
owner's rule):

1. **Rounded leading edges of flat plates below M_n 1.0** are served
   "bounded, not measured" (10.2): from no drag on the nose to the term at
   M_n 1.0 at its band's high end, both orderings written in 0019 section
   3.2 with their physics and the data that check them, and served only
   after an independent review of that argument. Where the written
   argument finds a bound can be crossed, that bound is widened to what
   the argument supports, or the range it cannot support is refused,
   before the review.
2. **Bevelled leading edges at M_n 0.9 to 1.2**, where TR 1094 has no
   points, only "bounded, not measured" between measured values, its
   ordering written in 0019 section 3.3; transonic small-disturbance
   theory is never the nominal. Bevels of 10 to 15 deg only if TR 1094's
   26.57 deg wedge supports the similarity in the data; otherwise refused.
3. **Swept blunt trailing edges at Mach 1.0 to 1.2** are served if R&M
   3348's swept single-wedge wings, read twice (table 3, figs. 30a and
   30b), set the band directly. This changes 0016 section 6's ruling
   (W3(c)) for Mach 1.0 to 1.2 only. It concerns the edge's own base drag:
   the fins-on-base factor (W1), which refuses swept trailing edges at the
   base, where nothing measures them, is a separate term and is not
   changed by it.

**2026-10-21 (l): further band-setting figures for W7's fin terms, named
before they are read** (rule 2 of 10.1, as (k)). Found while typing R&M
3348 table 3 and opening R&M 3427; none has been read for a value. First
lettered (i); re-lettered (l) on 2026-10-22, as (j).

| Source                                                        | Sets bands with                                                                                                                                                                                                                                                     | Not used to set bands      |
| ------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| Rogers, Berry and Quincey, ARC R&M 3348 (AERADE 1826.2/3929)  | figs. 47 to 52, the single-wedge section's pressure distributions at the pressure-plotting station, Mach 0.70 to 1.20: the surface pressure just ahead of the base (x/c 0.995), for the local M' and p' with which table 3's base pressures are compared            | the rest of figs. 40 to 58 |
|                                                               | tables 4 and 5 and fig. 59, the balance results (single and double wedge; the report notes the single wedge's drag includes its raked tip edge): candidates for the fins' own drag near Mach 1 (F1) and for F5, what each sets decided by a later record before use |                            |
| Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011) | fig. 18 (the Reynolds number's effect on base pressure); fig. 39 (the base conditions' effect on the surface pressures upstream of the base)                                                                                                                        |                            |

**2026-10-22 (m): R&M 3427 fig. 13's hole 4, named before it is read**
(rule 2 of 10.1, as (k)). Fig. 13 of Nash, Quincey and Callinan (ARC R&M
3427, AERADE 1826.2/4011, PDF p. 37) is named by (k) for its base
pressures (holes 5, 6 and 7), read once (0019's reader) with a blind
second reading queued. Its lower panel holds the surface pressure on the
parallel afterbody at four holes; hole 4, at x/h -0.167 (0.1 in ahead of
the base, fig. 3), is now named band-setting, for the local Mach number
and static pressure just ahead of the base, with which the section's base
pressures are compared with RM A51J25 fig. 7's curve (on M', p') and with
R&M 3348's table 3 (on its own local values, from figs. 47 to 52, (l)).
Holes 1 to 3 (x/h -0.330, -0.667, -1.667) are not used to set bands. No
value of hole 4 has been read; it is read twice before use.

**2026-10-22 (n): BRL Report 934's range A: its readings, rounds and
inputs, fixed before its run** (10.3, 10.5, 10.6; letters (j) to (m) are
reserved for another branch). Written and committed by the run's
operator before any model value was computed for any BRL 934 round; no
comparison of a BRL value with a model value exists before this commit.
The run follows once this commit exists, at this commit, once, and its
result is recorded whatever it is (rule 3 of 10.1), in
`docs/design/0020-brl934-range-a.md`.

- _Readings: 10.4's line on BRL 934 brought up to date._ 10.4 listed
  "BRL 934's Graph I (its tables were read twice by the same reader; a
  second reader is pending, 0010 section 9)" as read once. Now: Tables II
  and III are read twice, the second blind by a second reader (round 9,
  `docs/research/total-drag/audit/round9/`), paired by the coordinator on
  2026-10-22 with 0 differences on M, mean squared yaw, C_D and -C_Ma
  (Table III) and on M and average yaw (Table II), all 27 rounds (the
  pairing repeated by `tests/validation/brl934-readings.test.ts`); Graph
  I's symbols are read by two readers (the transcription's section 7, the
  csv's graph1 column; round 7, `audit/round7/method.md` item 5, paired in
  `readings/brl934_graph1_pairing.csv`); Graph II is read twice by two
  methods, by one reader (the transcription's section 7). Every value the
  run uses is read twice (rule 5 of 10.1).
- _Rounds_ (10.6 item 5's rule, `admission` in `src/validation/brl934.ts`;
  no drag value used). Of the 16 rounds of Table III in range A, ten are
  in: 3254 (M 1.506, 3.7 deg^2), 2595 (1.784, 0.6), 2599 (1.788, 1.5),
  2591 (1.801, 0.2), 2588 (1.802, 0.4), 2590 (1.803, 0.1), 2596 (1.814,
  1.5), 2589 (1.827, 0.7), 3263 (2.423, 2.9) and 3264 (2.468, 0.2), each
  with its mean squared yaw printed and at most 5 deg^2 in both readings
  of Table III, and marked laminar by neither reading of Graph I (the
  phase-1 rounds carry only the consolidation symbol; 3254 a plus and a
  dot in both; 3263 and 3264 below). Six are out: 2593 (53.4 deg^2), 2594
  (36.2), 2598 (5.6) and 3256 (6.6) for their yaw; 3255, no mean squared
  yaw printed (blank in both readings; Table II average yaw 0, "Model
  Magnet de-magnetized"); 3249, marked laminar (an open circle,
  "corrected for yaw and full turbulent B.L.") by both readings. 3264 is
  used at Table III's values (C_D 0.449), round 9 reading them alike;
  Graph I's only mark at M 2.47 lies at C_D 0.471 to 0.474 in both
  readings, nothing near 0.449. The present model is run at the seven at
  M 1.798 and above (2591, 2588, 2590, 2596, 2589, 3263, 3264), the
  rebuilt factor at all ten.
- _Inputs_, each with its item of 10.6:
  - Item 1, model diameter: 0.78 to 0.82 in, run at both ends; the
    nominal at the midpoint, 0.80 in. No BRL or BuOrd source stating it
    was reached.
  - Item 2, range air: 288 to 298 K at 101325 Pa, run at both ends; the
    nominal at the midpoint, 293 K. With the diameter: the total at the
    four corners (0.78 and 0.82 in, 288 and 298 K) against the total at
    the nominal, as one input band ("diameter and air"). The Reynolds
    number on the diameter is rho M a d / mu, a = (1.4 x 287.05 T)^0.5,
    rho = p / (287.05 T), mu by Sutherland's law (1.458e-6, 110.4 K). No
    BRL record of the range air was reached.
  - Item 3, fin leading edge: sharp, no rounded-edge term. Sensitivity
    beside the verdict: DREV's 0.004 cal edge, computed in full (its
    nominal, corners and tolerance) and reported where the library
    serves it.
  - Item 4, trailing-edge area: constant thickness, 0.32 cal^2 (0.08 cal
    over the 1 cal span, four fins). Sensitivity beside the verdict: the
    tapered alternative as the trailing-edge term halved by hand: its
    nominal, its model-form band ends, its laminar change in every
    transition state and its value at every corner, each times 0.5.
  - Item 5, rounds: above.
  - Item 5, zero-yaw value: CD0 = C_D - C_D'(M) dbar^2 (dbar^2 in rad^2),
    C_D' the mean of Graph II's two readings, each linear between its
    points. Each reading alone moves no admitted round's CD0 by 1e-4.
    Beside it, the text's rounded C_D' (report p. 8): the line through 15.0
    at M 1.4 and 8.9 at 2.4, continued beyond 2.4 for 3263 and 3264 (as
    the transcription's section 7 computes it), with the cluster spreads
    recomputed from those values.
  - Item 5, transition: fully turbulent nominal; 0008's transition input
    as for the DREV gate, laminar runs to Re_T 5e5, 1.6e6 and 3e6, each a
    state of the boundary layer with the body also taken turbulent, the
    fins' trailing-edge laminar term in the states that reach it (0010
    section 10.1).
  - Item 5, wall: adiabatic nominal; the input the wall at the nominal
    air temperature, 293 K.
  - Item 5, nose: a sharp 10 deg cone, 0.5 / tan 10 deg = 2.836 cal long,
    its wave drag the exact Taylor-Maccoll value; the cylinder to 10.0
    cal; four rectangular fins of 1 cal chord and span at the base,
    unswept and uncanted, an 8% single wedge 0.08 cal thick at the
    trailing edge. Free-stream edge conditions for friction, as for DREV.
  - Item 5, tolerance: rule 4 of 10.1 as the DREV gate builds it
    (`tests/validation/basic-finner.test.ts`; 0010 sections 4.1, 6.2 and
    10.3): over the modelled total, the model-form band, the input bands
    (transition, wall, roughness at zero, and diameter and air) and the
    spread of the round's Mach cluster (its least and greatest CD0 over
    its mean, minus 1). Clusters: M 1.50 to 1.51, 1.78 to 1.83, 2.42 to
    2.47. Each model's spread is taken over the rounds it is run at: for
    the present model the five at M 1.80 to 1.83 (CD0 0.6033 to 0.6436)
    and the two at 2.42 to 2.47; for the rebuilt factor one, seven and
    two. The residual is CD0 / modelled - 1; a round passes inside its
    tolerance, and a model passes when every one of its rounds does.
- _What is known before the run, from the records alone._ 0015 sections
  1, 4, 6 and 9 state that the rebuilt factor refuses fins whose faces
  diverge to a blunt trailing edge, "the Basic Finner's wedges among
  them", so that range A "tests the present factor (10.3) and records the
  rebuilt one's refusal". The run asks the rebuilt factor at every
  admitted round all the same and records what it gives. W2 serves the
  body base below Mach 1.5 only; every admitted round lies at M 1.506 or
  above, so it serves none. The library itself serves the present factor
  from M 1.798, so its own total at 3254, 2595 and 2599 goes to the
  rebuilt factor; the run reports that routing beside each round.
- _Where the text leaves a choice, decided now._
  - "Which neither reading of Graph I marks laminar" (item 5) and "3249
    is out if both readings mark it laminar" differ in wording; on the
    readings as recorded only 3249 is marked, by both, so they admit the
    same rounds. Round 7 first called 3263's lower symbol an open circle,
    at low confidence ("could be a dot"); its third look, after the
    pairing, found it a dot (the "hole" the wedge between the blob and
    the faired curve) and is recorded as replacing that call for any use;
    the first reading calls it a dot. Graph I's laminar groups show a
    dot and an open circle beneath the plus, and 3263's group has one
    mark there. 3263 is admitted on the readings as recorded. Since the
    blind call was not a dot, the run also reports, beside the verdict
    and not as it, 3264 with 3263 out (3264's cluster then one round, its
    spread zero).
  - The present model's spread at M 1.80 to 1.83 is the five rounds' it
    is run at, the transcription's section 9 item 9 as 10.6 item 5
    adopts it, and the narrower: 2595 and 2599, admitted for the rebuilt
    factor, would widen it (-3.5% to +5.0% for -2.6% to +3.9%). The
    seven-round spread is reported beside the verdict, not as it.
  - The air range is item 2's 288 to 298 K, not the transcription
    script's 288.15 to 298.15 K; the nominals are the ranges' midpoints,
    the band covering both ends.
- _The harness._ `src/validation/hold-out-run.ts`, validated on the DREV
  gate's 11 shots, whose recorded values it reproduces, and its rebuilt
  body base held equal to the library's wherever the library routes to
  the rebuilt factor (`tests/validation/hold-out-run.test.ts`); the data,
  readings and admission in `src/validation/brl934.ts` and
  `tests/validation/brl934-readings.test.ts`; the run,
  `tests/validation/brl934-range-a.test.ts`, its expectations placeholders
  until the run's values are recorded.

**2026-10-22 (o): NASA TM X-653, named before it is opened for F2, and
rounded leading edges below M_n 1.0 refused until it is read** (rule 2 of
10.1, as (k); the owner's decision 7.5 of 2026-10-22, which supersedes
(k)'s decision 1). Jorgensen, Spahr and Hill, "Comparison of the
effectiveness of flares with that of fins for stabilizing low fineness
ratio bodies at Mach numbers from 0.6 to 5.8", NASA TM X-653 (A-575), May
1962, NTRS 19720065133 (the catalogue record and its abstract only: tunnel
tests at Mach 0.6 to 3.8 of normal force, centre of pressure and drag of
conical noses with cylindrical midsections and finned or flared
aftersections, among them "fin leading-edge bluntness"). It is named a
candidate band-setting source for F2 (0019 section 3.2), for the drag of
fins with blunt or rounded leading edges against the same fins with
sharp ones, at subsonic normal Mach numbers of the leading edge. Which of
its figures or tables set what is decided by a further dated entry, made
after its model drawings and list of figures are seen and before any
value is read: the fins' sections, edge shape and radius, sweep and
Reynolds numbers, and whether its drag includes the base, decide whether
it measures a rounded plate edge at all. Its body is a low-fineness
conical-nosed cylinder, not a held-back body; if a figure carries a
held-back set it is not used. A record kept honestly: the total-drag
validation search (`docs/research/total-drag/data/validation_candidates.md`)
lists TM X-653 as set aside after opening, for its totals ("tunnel, drag
without base drag"); no fin-edge value from it was read or recorded there
or anywhere in this repository. Until it is read (twice, as (k)), rounded
leading edges of flat plates below M_n 1.0 are refused, with that reason;
the bounded term of 0019 section 3.2 is kept as a recorded candidate,
not wired. If TM X-653 measures such an edge, the term becomes
"estimated on component data"; if it does not, the bounded term is put
to the owner again with its ordering (U3)'s weakness named in its label.

_A note on (k), item 3._ Its last sentence describes the fins-on-base
factor (W1) as it stood on 2026-10-21, before W1 was on the main branch.
Since W1's merge (b86c308), 0015 section 3.4 governs: sharp sections with
the trailing edge swept at the base are refused, fins with the leading
edge swept 45 to 60 deg are served with the trailing edge unswept, or
swept aft no more than the leading edge only 0.9 to 1 root chord ahead of
the base, and the present factor refuses swept fins at the base (0015
section 5). Item 3's decision on the edge's own base drag is unchanged,
and it remains a term separate from that factor.

_A check that sets nothing, added to (k)'s list_ (the re-review of
2026-10-22, N7): Barrowman's 1967 thesis (NTRS 20010047838; eqs. 4-17 to
4-19 and fig. 4-5, PDF p. 60), the rounded leading-edge curve OpenRocket
uses. 0019 section 3.2 (U5) sets it beside the bounds; it sets no band.

**2026-10-22 (p): RM L9I30 and RM L51F29, named before they are opened
for F1** (rule 2 of 10.1, as (k)). Neither has been opened; each is known
here from its NTRS catalogue record only.

- Hart and Katz, "Flight investigations at high-subsonic, transonic, and
  supersonic speeds to determine zero-lift drag of fin-stabilized bodies
  of revolution having fineness ratios of 12.5, 8.91, and 6.04 and varying
  positions of maximum diameter", NACA RM L9I30, 1949, NTRS 20050019251:
  rocket-powered free flight, cut-off sterns, equal base, frontal and
  exposed fin areas. RM L55H09's body is scaled from it (0019 section
  2.3), so it is first a geometry source: whether that body is the RM-10
  (TN 3320, held back whole) or the PARD standard body is settled from
  its model drawings before any of its drag figures is opened.
- Katz and Stoney, "Base pressures measured on several parabolic-arc
  bodies of revolution in free flight at Mach numbers from 0.8 to 1.4 and
  at large Reynolds numbers", NACA RM L51F29, 1951, NTRS 19930086750: the
  base pressures with which a free-flight fin-stabilized total of such a
  body is split into its base and the rest.

Both are candidate band-setting sources for F1 (0019 section 3.1, the
fins' own drag near Mach 1, base separated), with RM L55H09. Which
figures or tables set what is decided by a further dated entry, after
the model drawings are seen and before any value is read. Any body in
them that is the RM-10 or the PARD standard body is held back with its
set, and nothing flown on it is used.

**2026-10-22 (q): the Basic Finner after BRL Report 934's range A: a
narrow validated sub-class at the tested conditions, the class still
suspended** (10.3; amendment (b)'s route back; the run's record,
`docs/design/0020-brl934-range-a.md`; letters (o) and (p) are reserved for
another branch). The owner's decision, made on 2026-10-22 after the run
and final.

- _What the run found, and why it does not reopen the class._ The present
  model passed range A by rule 4 of 10.1 at all seven rounds it serves
  (0020 section 2). Amendment (b) registered that on a pass "the class is
  validated over what that range supports". Range A supports nothing
  inside the class as the page decides it (Mach 1.799 to 2.15, Reynolds
  number 1.19e7 to 2.0e7 on length, DREV's 0.004 cal fin leading edge;
  0011 section 3): the five rounds inside its Mach range (M 1.801 to
  1.827) flew at Reynolds numbers of 7.96e6 to 8.87e6 on length, wholly
  below its floor, the two at M 2.423 and 2.468 lie above its Mach range,
  and every round was run with sharp fin leading edges (10.6 item 3). The
  test and the class overlap in nothing.
- _The decision._ A new, narrow sub-class is validated at exactly the
  tested conditions, and nowhere else. The class itself is unchanged in
  its limits and its values, and stays "an estimate, not validated"
  (amendment (b)); only its stated reason changes, since the registered
  test has now been run and passed, at conditions outside it.
- _The sub-class_, every bound from the run's inputs (10.6, amendment
  (n)) and its output (`docs/research/base-and-total/runs/brl934-range-a.json`),
  none wider than tested:
  - Geometry: the Basic Finner as transcribed, each dimension within 0.5%
    as the class takes it (a cone 0.5 / tan 10 deg = 2.836 cal long, sharp,
    on a cylinder to a flat base, 10.0 cal overall; four rectangular fins
    of 1.0 cal root chord and span, unswept, their trailing edges at the
    base), with sharp fin leading edges (radius 0, 10.6 item 3) and
    single-wedge sections to a blunt trailing edge 0.08 cal thick, its
    thickness constant across the span, 0.32 cal^2 over the four fins, as
    the run assumed (10.6 item 4). A rounded leading edge of any radius is
    outside it. The nose is the sharp cone the run took (its wave drag
    the exact Taylor-Maccoll value; on the page, the page's solve of that
    cone). 2026-10-23: that solve must be verified (its band within the
    solver's tolerance) for the claim to be validated; this was implicit
    and is now explicit, and a case with an unverified nose term is an
    estimate with that reason.
  - (As first written; superseded by the correction below.) Two disjoint
    windows of Mach and Reynolds number on length, with no
    interpolation across the gap (Mach 1.827 to 2.423 was not tested; its
    rounds 3249, 3255 and 3256 were out by 10.6 item 5): Mach 1.801 to
    1.827 with Reynolds number 7.965e6 to 8.870e6, and Mach 2.423 to 2.468
    with 1.072e7 to 1.198e7. The Mach ends are the rounds' own. The
    Reynolds ends are the least and greatest over the run's four corners
    (diameter 0.78 and 0.82 in, air 288 and 298 K) at the rounds in each
    window, 7.9642e6 to 8.8708e6 and 1.07147e7 to 1.19832e7 in the json,
    rounded inward to four significant figures: 0020 section 2's 7.96e6
    and 1.20e7, rounded outward to three, lie 0.05% and 0.14% beyond what
    was run, so they are not used. The windows are boxes over those
    ranges: the run's Reynolds number rises with its Mach number within a
    window, so a box's corners (M 1.801 at 8.87e6, say) lie up to 1.4%
    (first window) and 1.8% (second) beyond the Reynolds numbers the
    nearest round reached,
    as the class's own box has corners no shot flew (0011 section 3).
  - _Correction, 2026-10-22, after the independent review of bee550c_
    (made before this amendment reached the main branch, and before any
    new data were looked at): the boxes are replaced. Their corners were
    validated though no round flew there: Mach 1.801 at 8.87e6, 1.44%
    above the highest Reynolds number round 2591 reached at any corner
    (8.7446e6), and Mach 2.468 at 1.072e7, 1.77% below the lowest of round
    3264 (1.0914e7). In the run the Reynolds number on length over the
    Mach number is one range at all seven rounds, 4.422072e6 to
    4.855414e6, since it depends only on the diameter and the air. The
    rule keeps the two Mach windows, 1.801 to 1.827 and 2.423 to 2.468,
    nothing between, and takes the Reynolds number on length within
    4.423e6 to 4.855e6 times the Mach number (the json's range rounded
    inward to four figures): at Mach 1.801, 7.966e6 to 8.744e6; at 2.468,
    1.092e7 to 1.198e7. Every case it admits lies within the Reynolds
    numbers the run's corners spanned at that Mach number. The Reynolds
    number and the temperature are still checked apart, so the page
    accepts pairs the run never had (288 K at the lowest Reynolds number
    per unit Mach number, where the run's 288 K corners lay at the
    higher end); at a given Reynolds number the temperature moves the
    total by at most 9.4e-5 of its value from 293 K to either end of
    288 to 298 K at the windows' ends (about 2e-4 end to end) (`tests/app/brl934-sub-class.test.ts`), and by at most
    0.13% over the class's 216.65 to 320 K (0011 section 3). The 0.5%
    tolerance on each dimension is the class's, for typing; the run tested
    the nominal shape only.
  - Static temperature 288 to 298 K, the run's air range (10.6 item 2).
  - Zero incidence, power off, as the page computes every total.
  - The inputs (transition, wall temperature, roughness) are not part of
    the rule, as for the class: they move no nominal value and are shown
    apart.
- _Checked before the code._ The page's own path (`totalDragView` in
  `src/app/total-drag.ts`) serves a total at all seven rounds, on the
  present factor, with sharp edges at the run's nominal conditions (0.80
  in, 293 K), and with the run's nose (Taylor-Maccoll with the fitted
  solver's allowance) its total, model-form band and every component and
  input band equal the run's recorded values exactly (difference 0 in
  double precision). On the page the nose term is the page's solve of the
  cone. Its difference from the Taylor-Maccoll value was not measured on
  the page at these rounds; it is bounded from 0006's measured agreement:
  on cones of 5 to 30 deg at Mach 1.3 to 3 the fitted solve's converged
  value lies at most 3.4e-5 of the value from it (the page's GPU solver
  matches the CPU within 8e-7 there, 0011 section 3), so at these rounds
  (nose terms 0.0947 to 0.1105) the page's total should lie within about
  4e-6 in C_D of the run's (the 7e-5 allowance alone is under 8e-6),
  below the fourth decimal shown. A GPU page test drives the page's own
  solve at round 3263's conditions (`tests/gpu/nose-drag-page.test.ts`),
  asserting the validated label and the run's total inside the page's
  band; on software WebGPU it did not finish in two hours, so it runs
  only when asked (`VITE_SLOW_GPU=1`) and has not yet been run to the
  end. The page's Basic Finner body, typed to six
  decimals, moves the total by under 1e-8 (6e-9).
- _The label for a case inside it_, plainly and in a few sentences:
  "validated", tested once against BRL Report 934's range A (seven
  rounds); measured over modelled +3.9% to +11.0%, so the model reads low
  at every round (mean +7.3%), inside tolerances of about +-27%, a width
  at which a pass alone says little (0008 section 6.3); the diameter, the
  air and the trailing-edge area at the test were assumed, not printed in
  the report (10.6); with DREV's 0.004 cal edge in place of the sharp one
  the residuals at Mach 2.42 and 2.47 fall to -1.1% and -4.2%, a
  sensitivity, not a verdict. (Corrected with the windows, after the same
  review: the tolerances are said as +-25% to +-28%, as 0008 has them;
  the label also says that halving the trailing-edge area, the run's
  largest sensitivity, raises the residuals to +14.5% to +22.3%, and that
  DREV's edge was refused at the five rounds at Mach 1.80 to 1.83.) The full list (each round's residual and
  tolerance, the trailing-edge term halved, the alternative readings) is
  in the page's details and in 0020.
- _The class's reason, revised._ "Until ... is run and passes" is no
  longer true. The class's reason now says that the factor was corrected
  after the DREV gate, so by 0008 section 6.1 the gate no longer validates
  it, and that the corrected factor's registered test, range A, was run
  and passed at conditions outside the class (its Reynolds numbers below
  the floor, its fin leading edges sharp), so nothing has tested the
  corrected factor inside it; it validates only the sub-class. The class
  stays kept, with its limits, for a test that covers it; none is
  registered.
- _What does not change._ No method, band, factor or tolerance; no value
  of any total, inside the class, the sub-class or outside both. The
  rebuilt factor (W1) is refused at every round of range A (in 0020,
  section 3) and has no hold-out of its own, from range A or elsewhere: it
  stays "estimated on component data", served outside the class as
  amendment (i) has it. Range A is not run again (rule 3 of 10.1).

**2026-10-23 (r): R&M 3348 figs. 47 to 52 become a check that sets
nothing** (the coordinator's decision, on independent advice, after W7's
first reading at 15f4bc2 and its method note at 8e9263e; precedent:
amendment (g)). Amendment (l) registered figs. 47 to 52 of Rogers, Berry
and Quincey (ARC R&M 3348, AERADE 1826.2/3929, PDF pp. 81 to 86) for one
quantity: the surface pressure p/H just ahead of the base, at x/c 0.995,
one value per incidence, for the local M' and p' with which table 3's base
pressures are compared.

- _That quantity cannot be read._ The figures are faired curves with no
  points plotted. Near the trailing edge the curves of a panel converge
  into one bundle and turn up into the frame line at x/c 1.0; x/c 0.995
  lies 2 to 3 px (at 300 dpi) from the frame line's centre, so no curve can
  be told from another or followed to it; several broken curves stop
  short, at x/c 0.93 to 0.97. No value per incidence exists to read.
- _What was read instead, and why it sets nothing._ The first reader then
  read the envelope of the curves' ink over x/c 0.975 to 0.990, the least
  and greatest p/H across all incidences, in each of the 30 panels
  (`docs/research/total-drag/audit/w7-fins/rm3348_figs47_52_te_first.csv`).
  That quantity was defined after the ink had been seen. By the rule of
  10.1 and as amendment (g) ruled for a set examined before it was
  registered, figs. 47 to 52 are therefore a check that sets nothing: not
  a band, not a band's end, not an allowance, and not a value for M' or
  p'. The envelope reading is kept as the record of what was done, labelled
  so. No second reading of it is arranged, and no other quantity of these
  figures is registered in its place.
- _Table 3, seen while checking incidences._ To see which incidences table
  3 covers, the reader printed seven rows of its own typing of table 3
  (M_0 0.70, phi 0 deg, alpha 0 to 8 deg; p_b/p_0 0.73 to 0.79). Those
  values were already read twice and paired (amendment (k); round 8's
  blind typing), so seeing them leaks nothing new, and they were not used
  in the figure reading.
- _Physics, for whoever reads the check._ Table 3 is used at alpha 0 deg
  only (0019 section 3.4: the code serves zero incidence). The envelope's
  height (0.02 to 0.19 in p/H in a panel, 0.07 to 0.18 at phi 0 deg; 0.14
  to 0.23 over a figure's five sweeps, the figure as the method note
  summarises it) is the spread of the incidence sweep (positive and
  negative incidence on the upper-surface holes; over a figure, the sweep
  angle too), not an uncertainty in the surface pressure at zero lift, and
  must not be read as one. And near Mach 1 the flow at the last holes is
  subsonic or barely sonic, so the corner's upstream influence reaches
  them: the pressure there is not an undisturbed local state independent
  of the base. Chapman's local Mach number M' ahead of the base is a
  supersonic idea (the base flow cannot reach upstream through a
  supersonic layer); at M_0 0.7 to 1.2 a local M' from the last holes
  would carry the base's own effect. This is one reason 0019 section 3.4
  now forms F4's band on the free-stream M_0 and p_0 (as R&M 3348 fig.
  30, Goin and TN 3548 report base pressure) and not on M' and p'.
- _What does not change._ Table 3 (alpha 0 deg) and figs. 30a and 30b stay
  band-setting under (k), on M_0 and p_0. R&M 3427 fig. 13's hole 4
  ((m)) stays named; whether it is used, given the same upstream
  influence, is for 0019 section 3.4 to decide before it sets anything.

**2026-10-23 (s): W7's F4 registrations narrowed** (the coordinator's
decisions on W7's reports of R&M 3323, Johnston and RM L8B13, written
before anything further is read; each narrows (k), (l) or (m), none
widens them).

1. _R&M 3427 fig. 13's hole 4 ((m))._ It stays named and read once. It is
   not needed for the band's coordinates, which are M_0 and p_0 ((r);
   0019 section 3.4), and it lies 0.1 in ahead of the base, inside the
   corner's upstream influence near Mach 1. Whether it serves at all is
   left open. The size of the widening for a wedge's inclined faces
   against a plate's parallel ones is decided and written in 0019 section
   3.4 before any F4 code, not now.
2. _R&M 3323 fig. 5 becomes a check that sets nothing._ Its solid curves
   for h/c 0.06 (ref. 39) and 0.10 (ref. 38) meet near M 1.00, Cp_b -0.77,
   and two nearly parallel lines leave the meeting point. The ink does not
   show which is which, so the 0.06 curve beyond M 1.0 cannot be assigned.
   A partial reading, or an envelope of the two, would choose the quantity
   after the ink had been seen. By the precedent of (g) and (r), fig. 5
   sets nothing; no value of it was recorded. Fig. 4 stays registered
   (read once, a blind second reading needed). Fig. 4's three heavy
   symbols at h/c 0.14 with no legend entry stay "source not traced" and
   set nothing.
3. _Johnston figs. 4 to 9, 11 and 12 are removed from (k)'s
   registration._ They are lift, moment and faired cross-plots of the same
   pressure points as figs. 4, 7 and 10, not independent data, and F4 and
   F5 use neither lift nor moment. They are not read. Figs. 10(a), 10(b)
   and 10(c) stay (read once).
4. _RM L8B13: (k)'s "fig. 4(c) to 4(e) (the wedge's base and sides)" was
   a slip._ Fig. 4(d) is the 45 deg sweptback cylinder. The registration
   is limited to figs. 4(c) (the wedge's base) and 4(e) (its sides).
   Marks the legend does not explain (fig. 4(c)'s "x" marks and dashes)
   are recorded as untraced and set nothing. Figs. 4(c) and 4(e) are then
   read once, by the same method, explained symbols only.

_A correction to (r), recorded here as well._ The height of the envelope
of figs. 47 to 52 is 0.02 to 0.19 in p/H per panel and 0.14 to 0.23 over a
figure's five sweeps. (r) states both; the coordinator's brief had
"0.14 to 0.22".

**2026-10-23 (t): RM L8B13 fig. 4(c) becomes a check that sets nothing**
(the coordinator's decision on W7's report at 2acdd2a; precedent: (g),
(r), (s)). Fig. 4(c) of Sawyer and Daum (NACA RM L8B13, PDF p. 15), the
wing-flow wedge's base pressure at four orifices, was registered under
(k) and limited by (s). Its four series read alike, and their small,
often solid symbols merge into clumps of ink from about M 0.85, and almost
everywhere from M 1.05 to 1.2. In these clumps the number of symbols,
their shapes and their centres cannot be read. Reading only the symbols
that separate would choose the data after seeing the ink. So fig. 4(c)
sets nothing: no band, no band's end. No value of it was recorded. Fig.
4(e) (the wedge's faces) stays registered, read once
(`docs/research/total-drag/audit/w7-fins/rml8b13_fig4e_first.csv`).

**2026-10-23 (u): Stage A of the 3D fin solve (design record 0021,
revision 3b), registered before any 3D number exists** (the coordinator's
allocation; the owner's answers of 2026-10-23). Written after 0021's
revision 3a (26dd4f2: the junction tests, the upstream check's exclusion,
the independent reference's width limit, the two-float rerun before a
GPU-CPU failure) and its evidence rule for the Eglin set's edges were
committed. No Stage A solver code had run, and no 3D value of any fin
existed, when this entry was written.

- _The ladder._ 0021 section 4's cases and pass criteria (4.0 to 4.5),
  its band procedure (4.6: four grids at ratio 1.5, subject to rung (b0);
  allowances A1 to A3 in full), its floor, floor families, test families
  and references (4.7), its kill criteria (4.9), its judge's rules and its
  manifest of GPU cases (5.3) are fixed as written at the commit that adds
  this entry. "No band" is a failure where 0021 says so. None changes
  after a rung's numbers are seen; a failure is recorded and a new record
  decides. The blunt-edge floor (normal Mach 1.5) changes, in either
  direction, only by a new record, and is never lowered before the Eglin
  set's range A has run.
- _The independent code._ SU2 8.1.0 (LGPL-2.1) with meshes from Gmsh
  4.13.1 (GPL), run by the owner on their own machine as separate
  programs (0021 4.4, `scripts/reference-3d/`); only their inputs and
  results are committed. Its reference is used only within 0021 4.4's
  width limit (its full band at most 0.035 of its value).
- _The noise, the precision and the GPU-CPU tolerance._ 0021 section 3.5:
  the GPU's fin drag within 1e-5 of the CPU's on every level both run; a
  miss is rerun in two-float, and only a two-float miss fails.
- _The model-form bands._ The fins' own-drag band is formed again with
  Stage A's nominal on the same ARCAS increments by 0008 section 4.3's
  arithmetic; the rounded edge's band is formed again on the Euler strip
  from TN 2960 figs. 5(c) and 5(e), both readings (0021 6.2).
  Band-setting, not tests. Amendment (f) is unchanged.
- _Square edges._ Served in a total only under 10.2, the band the whole
  gap between the bounds and the nominal Stage A's value, once (1) 10.2 is
  amended to allow a solved nominal and (2) the ordering is shown by a
  written argument, both recorded in a later entry before any square-edge
  value is computed. Until then square edges are a component only.
- _The Basic Finner._ Inside the class and the validated sub-class of (q)
  the tested product rule is served (10.3), and the 3D value is not shown
  there. BRL Report 934's range A is not run again, and no record computes
  the 3D fin model at its rounds for comparison with their drag.
- _The tests._ The PARD body's range A cannot test Stage A: its fins'
  normal Mach number (M cos 45 deg) reaches 1.5 only from Mach 2.12,
  beyond its data. TN 3697 fig. 5 was read once by eye for section 5.2,
  so that set is not wholly unseen. **The owner decided (2026-10-23) that
  the Eglin set's range A waits:** it is run at the earlier of the commit
  of Stage A's verdict, pass or fail, and 2027-06-30, and not before
  (10.5, amended above); the trigger does not depend on Stage A's results.
  When it is run, it reports the total with today's fin methods and, where
  Stage A serves and its verdict is a pass, with the fins solved, each
  with its verdict by rule 4. Its fins' edges and sweep are decided by
  0021 section 6.6's evidence rule (the report's text, fig. 4 and any
  other non-drag description of the models, by a reader who does not open
  Table D-3), recorded in a dated entry before the run; where no such
  source states them they are not assumed, and the range cannot test
  Stage A. Ranges B and C of the Eglin set, BRL Report 934's ranges B and
  C, and TN 3320 cannot test Stage A (0021 6.6).
- _Not tests._ ARCAS (TN D-4014: band-setting; TN D-4013: read, the same
  models), RM A53D02, and RM A53D02 fig. 17 for square edges (read once,
  not blind) set nothing for Stage A and test nothing; each may be
  reported as a check.
- _Labels._ 0021 section 6.3; the total where it uses Stage A: "an
  estimate, not validated: fins solved, inviscid; friction and base
  estimated".

**2026-10-24 (v): Stage A frozen, and the Eglin set's wait of (u)
withdrawn** (the owner's decision of 2026-10-24, on independent advice).
Design record 0021's Stage A is frozen: its junction test J1 failed as
registered (0021 section 12, revision 3g: the relative near-junction
error rose from 2.67e-2 to 3.18e-2, and the criterion away from the
junction failed at 2.4e-2 rad), so by 0021 section 4.9 no blunt edge is
served, and the work is not continued. 0021 and the record of its runs
stay on the branch `claude/wip/solver3d`; nothing of Stage A is served.
Because Stage A will give no verdict, the wait that (u) registered for
the Eglin set's range A is withdrawn: that range runs when today's
methods are ready for it, under 10.1 and 10.5 as first registered,
without waiting for 2027-06-30. The withdrawal is made before any Stage A
value of any fin was compared with anything, and before the Eglin set's
range A has been run; it depends on no result of that range. The rest of
(u) stays recorded as written, and applies again only if a later record
resumes Stage A, which would then need a held-back test of its own.

**2026-10-26 (z): flat-faced fins at the base served at every
leading-edge sweep with the trailing edge unswept (A1 of the refusal
plan)** (the owner's decision of 2026-10-26 to lift refusals by verified
work only; the coordinator's allocation of this letter). Written before
the code, with no new data: the bounds are section 4's of design record
0015 as they stand (RM L52E06 fig. 7's relief and the unswept circular-arc
member at least as thick), and the ordering, in 0015 section 12, is that
neither bound uses the leading edge: the upper rests on TN 2360's
mechanism (the increment follows the faces' slope near the trailing edge,
zero on a flat face at any sweep) and the lower on a relief Hart traces to
the fin-body junctures and the square edge, which lies in one plane
parallel to the base (the base plane itself for fins at the base; this
entry said "in the base plane" until A1's review of 2026-10-26), and
which the leading-edge sweep does not move when the trailing edge is
unswept. 0015
section 3.4's refusal of leading-edge sweeps 0 to 45 deg below Mach 2.0
and above 60 deg was written for sharp sections, whose face pressures the
sweep moves through a swept edge; it is kept for them and no longer
applied to flat faces. A plate with a swept trailing edge keeps section
4's sweeps (45 to 60 deg, the trailing edge swept no more than the leading
edge); sharp sections, rounded and diverging trailing edges and the
present factor are untouched. The label stays "bounded, not measured",
and names the sweep. No held-back set is opened or run. What it costs and
gains is recorded below this entry from `docs/research/refusals/` run
before and after (400 rockets, 1,600 cases), with the cross-check
against `src/total` required to agree.

What it costs and gains (0015 section 12;
`docs/research/refusals/out/2026-10-26-a1-plates-any-sweep/`): the
rebuilt factor's sweep refusal falls from 43.6% of cases to 22.4%;
totals of all bands 2.6% to 2.9% (Mach 1.5 to 1.8: 3.8% to 5.0%; 1.8 to
3.0: 6.5%, unchanged; below 1.5: 0%, amendment (f)); with the nose
assumed served, 123 to 144 of 1,600, read from each run's greedy table
(the row after its first two steps, W5 and W6, which lift every nose
refusal at Mach 1.5 and above: 7.7% and 9.0% of all bands; since the
review of 2026-10-26 the audit prints these counts, and the after run,
re-made with that table alone added, prints 144). Both runs
were made with `N_ROCKETS=400 CROSS_CHECK=100`, so the cross-check
covers the first 100 rockets' 400 cases, and agrees on all 400 in each
run. No case is newly refused; no served number
moves: a swept plate at the base takes the unswept plate's bracket
exactly (its test holds the three band values to 1e-12). What still
refuses most of the plates reached is listed in 0015 section 12.
At the audit's default size (2,000 rockets, 8,000 cases,
`out/impact.out`, the run 0014 quotes): totals of all bands 1.9% to 2.4%
(Mach 1.5 to 1.8: 2.5% to 4.1%; 1.8 to 3.0: 5.2% to 5.4%), the cross-check
agreeing on all 1,200 cases checked.

_A2 of the same plan (2026-10-26), noted here, recorded in 0009 section
8:_ shock-expansion theory is taken as exact when no reflected wave can
reach a face with slope, since faces parallel to the chord carry no drag;
a wedge followed by a flat to a square trailing edge is served exactly,
hexagons stay refused. No data enter and no band moves, so it takes no
letter.

_2026-10-27, a note under (z): the ruling after the review of A1's
fixes, which narrows A1._ The review asked 0015 section 12 to say which
way each driver the sweep moves acts on F, and the record now says the
juncture vortex's direction is not shown. Under section 10.2 ("without
the ordering shown, the case stays refused") the coordinator ruled:
flat-faced fins with the trailing edge unswept and the leading edge
swept more than 0 and under 45 deg are not shown to lie between the
unswept plate and RM L52E06's 45 deg plates below Mach 1.62, where the
floor is those plates' relief alone, and are refused there, at the base
term, the page's words naming the missing measurement (base pressures
with such plates at the base below Mach 1.62). From Mach 1.62 they stay
served: there RM L52J21a allows at most 6.2% relief with fins near the
base (0015 section 3.5's zero member, 0.9378; "at most 5%" here until
2026-10-28), against a floor 16% down (F 0.838). Plates swept 45 deg or
more, and the unswept plate, are not changed. The code went in first
(ad7b970) and this note the same day, the ruling having come after the
code was reviewed; no data enter and no band moves. At the audit's
default size, after main's audit fix (5921198): totals served 228 of
8,000 without the ruling and 209 with it (Mach 1.5 to 1.8: 111 to 92;
1.8 to 3.0: 117 either way), against main's 181; with the nose assumed
served 743 and 687.

_2026-10-27, the second ruling under this note:_ flat-faced fins with
the trailing edge unswept and the leading edge swept beyond 60 deg are
refused below Mach 1.62 as well, on the same rule: the juncture vortex's
direction is not shown, and beyond 60 deg the plate is not even between
two measured ends, it lies past the last one, so its ordering is not
shown. The page's words name the missing measurement (base pressures
with plates swept beyond 60 deg at the base below Mach 1.62). Exactly 60
deg, and 45 to 60, stay as 0015 section 4 serves them; from Mach 1.62
these plates stay served on the same ground as those under 45 deg (RM
L52J21a's at most 6.2% relief, "5%" here until 2026-10-28; since
2026-10-28 only where M cos L is at least 1, below). The code went in
first (b3308ed), this line after it. No total moves at the audit's
default size (209 of 8,000; 687 with the nose assumed served): the
plates it reaches are refused for something else as well; the rebuilt
factor's sweep refusal goes from 36.0% to 38.0% of cases.

_2026-10-28, the counts on main with A5:_ after main's A5 (f88ecbe; (ad)
below) the audit's default run serves 179 totals of 8,000 against main's
155 (Mach 1.5 to 1.8: 53 to 73; 1.8 to 3.0: 102 to 106; none below 1.5),
614 with the nose assumed served: A1's gain over main is 24, against 28
before A5 (181 to 209), the 4 lost all at Mach 1.8 to 3.0. The earlier
dated counts above stay as they were measured.

_2026-10-28, after main's A3 and A4 (3e026a8; (aa) and (ab)):_ 184
totals of 8,000 against main's 155 (Mach 1.5 to 1.8: 53 to 73; 1.8 to
3.0: 102 to 111), 628 with the nose assumed served; A1's gain is 29, 5
more than before A3 and A4, all at Mach 1.8 to 3.0, where a rounded
leading edge that (ab) bounds past 60 deg can now meet A1's plates at
the base.

_2026-10-28, after main's B1 and the body base band (cdd26e6 and
0b2def5; (ac) and (ah)):_ unchanged, 184 totals of 8,000 against main's
155 (Mach 1.5 to 1.8: 53 to 73; 1.8 to 3.0: 102 to 111), 628 with the
nose assumed served (633 with the page's section offered); A1's gain
stays 29, and the cross-check agrees on 1,200 of 1,200. Neither moves a
total here: B1 newly serves square trailing edges below Mach 1.5, where the
fins' own-drag guard still refuses every total, and widens a band near
Mach 1.7; (ah) widens the body base's band and leaves its served value
unchanged from Mach 1.5.

Main's unswept plates (10.7 (i)), registered and reviewed earlier on a
physical argument, are not changed by this ruling, and whether they stay
served below Mach 1.62 is an open question for the owner. The review's
reasoning: below Mach 1.62 the floor of the flat-plate bracket is RM
L52E06's relief with plates swept 45 deg alone, measured at Mach 1.06 to
1.10, F 0.852 at 1.06 against the floor's 0.838, a margin of 0.014; Hart
traces that relief to the fin-body junctures' low-momentum air, and the
unswept plate stands the strongest juncture vortex of any sweep; nothing
measured says whether a stronger vortex adds relief or takes it away, so
an unswept plate could relieve more than the floor allows there, and no
base pressure with unswept plates at the base below Mach 1.62 says it
does not. By the rule applied above it would be refused; it was
registered and reviewed under (i) as an argument from the slope
mechanism and the measured relief, so the owner decides. (Plates swept
beyond 60 deg below Mach 1.62, which 0015 section 12 named with the same
open direction, are refused by the second ruling above.)

_2026-10-28, rulings under this entry after the independent review of A1
(main at 76899f1) and A2, both passed; under 10.2, written before the
code (0015 section 12, its rulings of this date):_ (1) From Mach 1.62
the plates 0015 section 12 serves rest on a 2.6 times margin over RM
L52J21a's measured relief, not on a measurement at their conditions: the
floor, 0.838, allows 16.2% relief, and RM L52J21a at most 6.2%. Its fins
are sharp circular arcs swept 45 deg at both edges, whose edges see M
cos L of 1.15 to 1.70, the weakest juncture case; a plate swept beyond
60 deg sees M cos L below 1 at Mach 1.62 to 2.0, RM L52E06's regime,
where the relief measured was largest (15%). So flat-faced fins at the
base, and within a chord, with the leading edge swept beyond 60 deg are
refused where M cos L is below 1; where it is at least 1, from Mach 2.0,
they stay served. The same ground, a margin and not a measurement,
carries main's unswept plates ((i)) from Mach 1.62; whether they stay
served on it is put to the owner with the question above, and they are
not changed. (2) "At most 5% relief" understated the record's own zero
member, 6.2%; corrected where it stood, here and in 0015 sections 4 and
12, the margin to 0.838 still about 0.10. (3) A plate's trailing-edge
sweep: 0015 section 12 served it "either way (RM L52E06's plates and the
RM-10 bracket it; ...)", wording that commit 6ae4336 (2026-10-26) put in
after the population run so that the record matched the code, not a
reading of the sources. Read now: RM L52E06's trailing edge is unswept
(its p. 3 and fig. 1(c), p. 11), and the RM-10's is swept 60 deg aft (RM
E50D28, TN 3819's ref. 36, p. 5 and fig. 2, p. 17). A plate is served
with the trailing edge unswept, or swept aft no more than a leading edge
swept 45 to 60 deg, as before; one swept forward is refused at the base
and within a chord, with words that say so. No data enter and no band
moves. What it costs is recorded below when run.

_2026-10-28, what the rulings cost,_ the run after the code
(`out/impact.out`, 2,000 rockets, 8,000 cases; the run before is the
same file as committed before it): the rule on subsonic edges refuses
the base term of 81 cases, 49 at Mach 1.62 to 1.8 and 32 at 1.8 to 3.0
(the rebuilt factor's sweep refusal 28.6% to 29.3% of cases; some of the
81 were refused for a section outside the 10% arc before, which the
sweep now names first): 44 plates with a rounded leading edge, 31 with a
square-cut one, 6 bevelled. None was a total: totals served stay 184 of
8,000 (Mach 1.5 to 1.8: 73; 1.8 to 3.0: 111), and 628 with the nose
assumed served. Every one is refused for something else too: 38 of the
rounded-edge plates for the edge's normal Mach number alone (the rounded
term needs M cos L of at least 1, as the review said), 25 of the
square-cut plates for the square-cut edge alone (refused, 0016 section
21.6; if it is lifted, these now need the base too), and 3 of the
bevelled plates for the page's section alone (the page does not offer a
plate bevelled at the leading edge only, W12), one of them ahead of the
base where its position is refused too: with that section offered too,
811 totals become 809 (Mach 1.5 to 1.8: 299 to 298; 1.8 to 3.0: 512 to
511), the other two plates (one rocket, swept 67.2 deg, at Mach 1.71 and
2.17). The rule on forward-swept trailing edges refuses no case: the
population sweeps every swept trailing edge aft. The cross-check agrees
on 1,200 of 1,200; the reflected-wave split (`out/reflected-split.out`)
is unchanged; the counts by section and by what else refuses are from a
probe of the same cases, not committed.

_2026-10-28, later, the ruling on (3)'s reading, under 10.2, written
before the code:_ the strict reading. The plates' floor is RM L52E06's
relief, measured only with the trailing edge unswept; the RM-10 (RM
E50D28) gives the bracket's 60 deg end in leading-edge sweep, but its
fins are circular arcs whose trailing edge is swept 60 deg aft and below
sonic at its Mach numbers, so it does not show that a plate's floor
holds with a swept trailing edge (this ground replaces the wording of
48d95b1, the note below); and 0015 section 12's argument does not cover
a square edge carried out of one plane parallel to the base. So a plate
with the trailing edge swept, aft or forward, is refused at the base and
within a chord, the words naming why. This replaces (3)'s service of
plates swept aft; what RM L52E06 and RM E50D28 state stays recorded.
Sharp sections with the RM-10's 60 deg aft trailing edge stay refused as
they are; opening the RM-10's measured case would need its own
registered procedure (readings, pairing, domain), recorded in 0015
section 3.4 as a possible later item. No total is expected to move; the
run is recorded below when made.

_2026-10-28, what the strict reading costs,_ the run after its code
(`out/impact.out`, 2,000 rockets, 8,000 cases): no total moves, as
expected: 184 of 8,000 served (Mach 1.5 to 1.8: 73; 1.8 to 3.0: 111),
628 with the nose assumed served, 809 with the page's section offered
too, the cross-check agreeing on 1,200 of 1,200 and the reflected-wave
split unchanged. The rule refuses the base term of 632 cases, 158
rockets at each of the four Mach bands (356 with a rounded leading edge,
192 square-cut, 84 bevelled); some were refused for their sweep already
(a leading edge outside 45 to 60 deg, or a trailing edge swept more than
it), and the rebuilt factor's sweep refusal goes from 29.3% to 33.3% of
cases, about 320 more. Every one has its swept square trailing edge
refused by that edge's own term (0016), so none was a total; in 103 that
term was the only other reason besides the nose, so lifting it alone
(W3) would now serve none of them, the swept edge's share as sole
blocker 0.24% to 0% of cases. The breakdown is from the same uncommitted
probe of the cases.

_2026-10-28, corrected after the quick look of 9056ebb..1796dfe:_ the
strict reading's ground above replaces the wording of 48d95b1, which set
the RM-10 apart from the plates' bracket altogether; that contradicted
the standing ground for plates swept 45 to 60 deg with the trailing edge
unswept (0015 section 4, RM L52E06's plates and the RM-10 bracketing
that range, and the second ruling of 2026-10-27 above). The ground is
narrowed to the trailing edge; the rule is unchanged. A plate at exactly
60 deg with its edge below sonic has its sweep inside the measured ends
of the bracket (the RM-10's 60 deg), not past them; just beyond 60 deg
it lies past the last measured sweep, hence the step at 60 (at Mach 1.7,
60.0 deg served and 60.1 deg refused).

_Corrected 2026-10-28, after the quick look of 1796dfe..95daded:_ the
step line above said, as e604e68 wrote it the same day, that the plate
at 60 deg is served "on the RM-10's measured end of the bracket, not on
the margin". That holds in sweep only: the ends are measured at Mach
1.06 to 1.10 and 1.49 to 1.98, and from Mach 1.62 the floor is carried
in Mach number on a margin, as the rulings of 2026-10-28 say. The line
now says the plate's sweep lies inside the measured ends, not past them,
and the label of a plate swept 45 to 60 deg says the same ("its sweep
inside the bracket's measured ends, not past them").

**2026-10-26 (ac): RM A51J11 and RM A52E01, named before they are opened,
for F4's thin trailing edges and thick layers below Mach 1.5** (rule 2 of
10.1, as (k); 0019 section 3.4, "Layers and h/c"). Neither has been
opened. Each is known here from its NTRS catalogue record (title, number,
date; neither record has an abstract) and from R&M 3323's reference list,
where they are refs. 32 and 33 (`method_rm3323_figs4_5.md`).

- Cleary and Stevens, "The effects at transonic speeds of thickening the
  trailing edge of a wing with a 4-percent-thick circular-arc airfoil",
  NACA RM A51J11, 1951, NTRS 19930087063.
- Dugan, "Effects of three types of blunt trailing edges on the
  aerodynamic characteristics of a plane tapered wing of aspect ratio 3.1,
  with a 3-percent-thick biconvex section", NACA RM A52E01, 1952, NTRS 19930087008.

_Why._ Below Mach 1.5 every set that 0019 section 3.4 sets F4's band on
measures the base with a thin layer against the edge. The layer
parameter c/[h Re_c^(1/5)] is about 0.30 for Johnston's wedge (h/c 0.20,
Re 1.2e6 to 1.4e6), 0.35 to 0.43 for R&M 3348's (0.14, 1.25e6 to 3.41e6)
and 0.52 to 0.66 for R&M 3427's section (0.10, 0.8e6 to 2.7e6). The
population's square trailing edges have 1.5 to 4.0 (5% and 95%, the
larger of root and tip; `docs/research/refusals/out/w7-plan.out`), and
TR 1109 fig. 29(a)'s thick-layer factor is measured from Mach 1.5 only.
0019 section 3.4 serves such edges only where R&M 3323 fig. 4 and
Cleary and Stevens cover them. Fig. 4 (read twice, paired 2026-10-23,
`audit/pairing-2026-10-23b/`) plots these two reports' points at h/c 1.2%
to 4.0% at M 0.6, 0.8, 1.0 and 1.2, but not their chords, Reynolds
numbers or layer states, so it cannot say which layer parameters they
cover.

_What each is named for._ A candidate band-setting source for F4 at
Mach 1.0 to 1.5, for edges thinner than the sets above or with thicker
layers against them:

1. its model description and test conditions (chord, trailing-edge
   thickness, section, Reynolds numbers, transition and roughness), which
   place its points, and fig. 4's points of refs. 32 and 33, in h/c and
   in the layer parameter;
2. its base-pressure figures or tables against Mach number for each
   trailing-edge thickness. Which of them set what is decided in a second
   part of this entry, dated, added after the report's list of figures,
   its model description and its test conditions have been seen (as text
   only, by the F4 workstream) and before any value is read.

Each figure or table named there is read twice, by two readers who do not
see each other's reading and neither of whom is the F4 workstream, and
the two readings are paired by a neutral party before either sets
anything. Fig. 4's points of refs. 32 and 33 are then counted once with
their own reports, as (k) rules for a set that appears twice: the
report's own figure sets, fig. 4's replot is a check of it.

_Not used to set bands._ Lift, pitching moment and the wings' drag from
the balance (the fins' own drag near Mach 1 is F1's, 0019 section 3.1);
any figure that carries a held-back set.

_Shape._ Both sections are airfoils (a circular arc, and a biconvex
section) with the trailing edge thickened, by the titles; how their faces
meet the base is taken from the model descriptions. Where they are not
parallel to the stream, as a fin plate's are, the difference is carried
by 0019 section 3.4's shape widening, written with its basis before any
of these values is read, as the single wedge's is; the measured values
are never shifted toward a plate's.

_Relabelled, 2026-10-26:_ first written as (w) (commit 9699737), which
another branch already holds; relabelled (ac) by the coordinator's
allocation before any value of either report was read (by then only RM
A51J11's model and test sections had been seen, as text, as item 1
allows); content unchanged.

_Second part, 2026-10-26: the figures, named before any value is read._
Written after each report's model description, test conditions and
figure captions were seen as text (`pdftotext` of the NTRS PDFs, each
downloaded into its own new folder: RM A51J11, 44 PDF pages, SHA-256
e6b779125d8359e968ad6b4d2b2c43d651ef5024f42bdb5574a6f7b93a8fdf57; RM
A52E01, 35 pages,
3f090609fb3a170703523cc14f26aa9cab55e6afe4718b397b289bbcf33efe54). Seen:
RM A51J11's apparatus, tests and corrections sections and its notation
for R; RM A52E01's apparatus, models table, tests and notation, and the
one paragraph of its discussion that says what each figure compares; the
captions of both (fig. 8's caption, as extracted, carries its abscissa's
tick labels, no data). No figure page was viewed, and neither report's
summary, results or conclusions were read for their findings.

- _RM A51J11_ (Ames 16 ft tunnel, transonic bump; model rectangular,
  effective aspect ratio 4): the 4% circular arc with its trailing edge
  built up to 0.3, 0.6 and 1.0 times the maximum thickness (h/c 0.012,
  0.024, 0.040), faired back to the section by straight lines; M 0.60 to
  1.10, the leading-edge shock never attached; Reynolds number 1.7e6 to
  2.2e6 on the mean aerodynamic chord; roughness (No. 60 carborundum to
  0.10 chord) in some force tests; base pressure at one orifice at each of
  25, 37.5, 62.5 and 87.5% semispan. Layer parameter about 1.35 to 1.42
  (h/c 0.040), 2.2 to 2.4 (0.024) and 4.5 to 4.7 (0.012). The fairing
  meets the base, by the description (a straight line from the built-up
  edge tangent to the arc, computed on a parabolic arc), parallel to the
  chord at h/c 0.040 and converging by about 1.0 and 2.1 deg at 0.024 and
  0.012.
- _RM A52E01_ (Ames 6 by 6 ft supersonic tunnel, wing on a sting-mounted
  body): a tapered wing, aspect ratio 3.1, taper 0.39, mean aerodynamic
  chord 0.944 ft, 3% biconvex section. Wing 2 has constant thickness from
  midchord (h/c 0.030, its faces parallel to the chord at the base);
  wings 3 and 4 end at half the maximum thickness (h/c 0.015) with
  boattail angles of 6.88 and 2.02 deg; M 0.6 to 0.925 and 1.2 to 1.7;
  Reynolds number 1.5e6 and 3.8e6 on the mean aerodynamic chord; base
  pressure at one orifice in the trailing edge at about 50% semispan.
  Layer parameter about 1.6 to 1.9 (wing 2) and 3.2 to 3.9 (wings 3 and
  4).

Named band-setting for F4 below Mach 1.5, each to be read twice and
paired as above before it sets anything; how each set enters the band
(the shape and the layer, which set directly, which only with a stated
widening, which only as a check) is written in 0019 section 3.4 before
any of their values is read:

1. RM A51J11 fig. 14 (PDF p. 36): base pressure coefficient against Mach
   number at semispan station 0.25, alpha 0 deg, for each trailing-edge
   thickness. Used at M 1.00 to 1.10.
2. RM A51J11 fig. 15 (PDF p. 37): base pressure coefficient against
   semispan station, alpha 0 deg: the spread across the four stations, so
   that fig. 14's one station is carried with that spread, not taken as
   the span's mean.
3. RM A52E01 fig. 8 (a) and (b) (PDF pp. 29 and 30): the wing
   base-pressure coefficients of wings 2, 3 and 4 at the Mach numbers
   shown, Reynolds numbers 1.5e6 and 3.8e6, at zero lift (by the figure's
   ordinate, read as printed). Used at M 1.2 to 1.5. Its points at M 1.5
   to 1.7 are a check of the present band above Mach 1.5 (0.93 to 1.21,
   with TR 1109's thick-layer factor), which sets nothing there unless a
   later entry decides; points below Mach 1.0 are not used (the term is
   served from 1.0).

Not used: RM A51J11 figs. 13 (incidence) and 16 to 20 (the boattailed
edge, forces, wake fluctuations), the force and moment figures of both,
and each report's Reynolds-number figure (the text's ranges are used).
R&M 3323 fig. 4's points of refs. 32 and 33 become checks of these
figures, as said above.

Letters are allocated by the coordinator; (w) to (ab) are held by other
branches. _(Corrected 2026-10-28, on merging main at 3e026a8 into the
trailing-edge branch: (aa), (ab) and (af) are main's entries below; (w)
to (z) remain the other branches'.)_

**2026-10-26 (aa): square-cut leading edges served "bounded, not
measured", between the sonic and the pitot pressure on the whole face**
(a recorded decision under 10.2's "Anywhere else only by a recorded
decision", the coordinator's, on the advisor's plan of 2026-10-22,
recommendation 4; it changes 10.2's "Where" for square-cut leading
edges). 10.2 named the rounded edge of the same thickness as the lower
bound, with the ordering still to show; 0016 section 6 could not show it,
and the edges stayed refused. The lower bound becomes the sonic pressure
p* (0.5283 of the pitot pressure, the sonic pressure of the streamline
that wets the face) on the whole face, a physical limit; the upper stays
the pitot pressure on the whole face. Both are taken on the flow normal
to the edge (the independence principle, 0016 section 5); swept, each is
widened by the sweep allowance served on rounded edges (0.95 to 1.22
from 14.3 deg, tapered below it to none unswept), the lower bound's low
end by its low end, the upper's high end by its high end.

- _The ordering_ is argued in 0016 section 21.1, committed with this
  entry and before any code: the face, wetted by the one streamline that
  crosses the bow shock where it is normal, carries at most its total
  pressure, and, lying inside the subsonic region behind the shock with
  the sonic line at its corners, at least its sonic pressure; swept, the
  allowance carries the principle's measured error.
- _The domain_: normal Mach numbers 1.0 to 3.0, sweep up to 60 deg, the
  Reynolds number on the thickness (normal component) at least 6.7e3.
  Refused outside it, with every reason.
- _A computed check that sets nothing_ (0016 section 21.3, its pass and
  fail criteria registered there before it is run): planar Euler
  solutions of a flat face with its corner rounded to 4% and 2% of the
  half-thickness, at M 1.2, 1.5, 2.0 and 3.0, on three nested grids. If
  the straight face goes sonic, or below p*, beyond the solutions' own
  error, or the computed face mean does not clear the lower bound by the
  margin 21.3 registers, square-cut edges stay refused and the result is
  recorded.
- _No measured data sets either bound_, and no figure is named or read
  for this entry, so no blind reading is owed. RM A53D02 fig. 17 (square
  edges on fins swept 71.6 deg, read once in 0008) lies outside the
  domain and is not used.
- _(u)'s item on square edges_ (a solved nominal from Stage A) does not
  apply: Stage A is frozen ((v)). This entry is under 10.2 as written:
  the value served is the midpoint of the band, the band the whole gap.
- _The label_: "bounded, not measured: between the sonic pressure behind
  a normal shock (p*) and the pitot pressure on the whole face", with the
  gap's size in C_D beside the component; a total that contains it is at
  best an estimate, not validated, and names it.

**2026-10-26 (ab): rounded leading edges swept beyond 60 deg served
"bounded, not measured"** (a recorded decision under 10.2's "Anywhere
else only by a recorded decision", the coordinator's, on the advisor's
plan of 2026-10-22). Lower bound: the rounded edge's term at the actual
sweep (the independence principle, 0016 sections 5 and 11) at its band's
low end, the sweep allowance's 0.95 included; upper: the same term at 60
deg of sweep, at the case's Mach and Reynolds numbers, at its band's high
end, the allowance's 1.22 included. Served only where both are: the
normal Mach number at the actual sweep at least 1.0, the Reynolds number's
normal component in range at both sweeps.

- _The ordering_ is argued in 0016 section 21.2, committed with this
  entry and before any code: the term falls strictly with sweep (the
  principle), and the front side's drag per unit span falls with yaw on
  every measured series; the lower ordering beyond 60 deg rests on the
  principle and one yawed point.
- _The data named for that use_ (rule 2 of 10.1, for a new use of
  figures already named there): RM A55H31 fig. 12, both readings and the
  third looks (0016 sections 5, 14 and 16), for the fall of the front
  side's drag with yaw; and Penland's 75.1 deg point on it (RM A55H31's
  reference 1, set apart from the sweep allowance for the end effect TN
  3861 p. 10 reports), as evidence of the ordering only, never a band's
  end. Every value was read twice before this entry, for 0016; nothing new
  is read, so no blind reading is owed.
- _The label_: "bounded, not measured: between the independence
  principle at S deg (the front side at the normal Mach number, at its
  band's low end) and the same term at 60 deg, the largest sweep checked
  on yawed cylinders (at its band's high end); the lower bound's ordering
  beyond 60 deg rests on one yawed point", with the gap's size in C_D
  beside the component; a total that contains it is at best an estimate,
  not validated, and names it.

_(aa)'s computed check, recorded 2026-10-26._ It failed as registered
(0016 section 21.3, its protocol amended before the registered runs): the
finest-grid solutions at Mach 2.0 with the smaller corner radius and at
Mach 3.0 with both did not settle, and in their oscillation the face's
pressure was not shown clear of p* (at Mach 3.0 it fell below it). Where
the solutions settled (Mach 1.2, 1.5, and 2.0 with the larger radius) the
face stayed subsonic and above p* by 0.11 to 0.12 of p02. By (aa),
square-cut leading edges stay refused; the bounded term is kept unwired.
(ab) is unaffected: its bounds are measured terms, not this computation.

**2026-10-26 (af): measured flat-face pressures, named before they are
read, to test the premises of (aa)'s bounds** (route (c) of 0016 section
21.3, the coordinator's decision of 2026-10-26; the owner's rule admits
no unverified estimate, so (aa)'s argument is not served on its own).
Written before any figure or table below is read by anyone for this
repository.

_What was seen in choosing them._ The sets were found by searching NTRS
and the open web for measured pressures on a flat face normal to a
supersonic stream. Each is named from its title, its summary or abstract
and its figure and table captions; the search engine's excerpts also
showed parts of their summaries and text (for example the qualitative
statements that a flat face's pressure distribution changed little with
Mach or Reynolds number over the ranges tested). No plotted or tabulated
pressure of any of them has been looked at.

_No planar or swept set exists in the range._ No open report found
measures the pressure across a planar flat face, a square-cut leading
edge or a swept flat face at Mach 1.0 to 3.0. The nearest planar one,
NACA TN 4142 (Creager, 1957: a 1 in slab with a square leading edge),
is at Mach 4 in a low-density stream with one orifice on the face, at
its centre, so it gives no distribution; it is not used. Flat-faced fins
on plates (blunt-fin interaction studies) are at Mach 4.9 and measure the
plate. Swept blunt slabs (AD0255893, Mach 1.71 to 7.6) have cylindrical
leading edges. Every set below is axisymmetric: flat-faced cylinders.

_Why an axisymmetric flat face tests the premises of 0016 section 21.1_
(argued before any reading). The band needs only two things of the face,
not its mean:

- (P1) _p at most p02 on the face_: the face is wetted by the streamline
  that crosses the bow shock where it is normal. On a flat-faced
  cylinder that streamline is the axis, and the same holds. Every face
  orifice tests it.
- (P2) _p at least p\* on the face_: the face lies in the subsonic region
  behind the shock, the sonic line attached at its sharp corner. The
  corner's choking is a property of the flow near the corner, which is
  planar in the meridian plane (the edge's radius of curvature, the
  body's radius, is large against the region where the flow turns), so a
  flat-faced cylinder's corner is the same test. Every face orifice
  tests it, the outermost ones (nearest the corner) most closely; and
  they do so in a real flow, with its boundary layer, so they also test
  item 4's corner reach at the Reynolds numbers of the tests.
- What they do not test: where the planar face's pressure lies between
  the bounds (its mean, which the band does not use); the corner's reach
  at Reynolds numbers far below those tested (they are of order 1e6 on
  the diameter; the served floor, 6.7e3 on the thickness, rests on item
  4's estimate); sweep (no swept face is measured).

_The sets named_ (each read twice, the second blind, then paired by a
neutral party; zero incidence only; measured symbols only, not faired
curves or theory):

1. NACA TN 4300 (Stoney and Markley, "Heat-transfer and pressure
   measurements on flat-faced cylinders at a Mach number of 2", 1958;
   NTRS 19930085034). Mach 2 free jet, 4 in and 12 in models, sea-level
   Reynolds numbers. Fig. 7, "Pressure distribution and velocity
   distribution over flat face" (the pressures only); fig. 16, "Pressure
   measured on 12-inch model"; fig. 3, "Location of pressure orifices
   and thermocouples"; table I; the text's model and test conditions.
   Tests P1 and P2 at Mach 2 on two sizes (the summary reports a laminar
   face on one and a turbulent one on the other).
2. NACA RM L57C18 (Carter and Bressette, "Heat-transfer and pressure
   distribution on six blunt noses at a Mach number of 2", 1957; NTRS
   19930089669). Fig. 1, "Drawings and photographs of the six blunt-nose
   models", to identify the flat-faced ones and their corners; fig. 5,
   "Pressure distributions for the six models", the flat-faced models
   only, at zero incidence; table I, "Sequence of tests". Tests P1 and P2
   at Mach 2 with the corner designs the report compares.
3. NASA TM X-19 (Burbank and Stallings, "Heat-transfer and pressure
   measurements on a flat-face cylinder at a Mach number range of 2.49
   to 4.44", 1959; NTRS 19980223601). Fig. 2, "Details of model and
   thermocouple location"; fig. 5, the local pressures on the flat face
   (its caption is not legible in the file's text layer; the text says
   fig. 5 presents them at Mach 2.49, Reynolds number 0.90e6, incidence
   up to 15 deg: zero incidence only). Tests P1 and P2 at Mach 2.49.
4. NASA TN D-5392 (Stallings and Howell, "Experimental pressure
   distributions for a family of blunt bodies at Mach numbers from 2.49
   to 4.63 and angles of attack from 0 deg to 15 deg", 1969; NTRS
   19690025922). Fig. 1, "Model geometry", to identify the flat-face
   cylinder (zero shoulder radius, flat nose) and its orifices; table I,
   "Tabulation of pressure measurements at M = 2.49", and tables II
   (Mach 4.06) and III (Mach 4.63), that model's face orifices at zero
   incidence only. Tests P1 and P2 at Mach 2.49, and at 4.06 and 4.63,
   beyond the domain, whether they hold as the Mach number rises.
   NASA TR R-274 (Stallings, 1967) plots the same tests and is not read.

_The criteria_, applied to the readings converted to p / p02, p02 from
Rayleigh's formula at the free-stream Mach number each report states
(or the report's own measured stagnation-point pressure where it
normalises by that, as stated), with p*/p02 = 0.5283; "face" means the
orifices on the flat face, not on a corner radius, shoulder or
afterbody; a is the report's stated pressure accuracy as a fraction of
p02, or 0.01 where it states none:

- (i) P1: every face reading, the higher of the two readings, at most
  1 + a;
- (ii) P2: every face reading, the lower of the two readings, at least
  0.5283 - a;
- (iii) item 4's margin: the mean of the face distribution over the
  radius (trapezoids through the lower readings, the outermost reading
  held to the corner), with zero pressure in place of the readings over
  the outer fifth of the radius (a tenth of a planar face's height at
  each corner, on the half-height), at least 0.5283;
- each at every set, model and Mach number read. **Pass** if all hold;
  **fail** otherwise. No criterion changes after any value is seen.

_On a pass_, square-cut leading edges are wired (the term of 0016
section 21.1, its band the whole gap between the physical bounds,
unchanged: the readings set no band and no nominal) with:

- the domain narrowed to the normal Mach numbers between the lowest
  measured, 2.0, and 3.0 (inside the measured 2.0 to 4.63); below 2.0
  refused, no flat face being measured there;
- swept edges to 60 deg with 21.1 item 6's sweep allowance, labelled an
  analogy: no swept flat face is measured, as no swept rounded edge's
  shape is;
- the Reynolds floor of 21.1 item 7 (6.7e3 on the thickness), labelled
  "extrapolated in Reynolds number" below the lowest Reynolds number of
  the sets;
- the label naming the sets as tests of the bounds' premises, not of
  the value.

_On a fail_, square-cut leading edges stay refused, the term unwired,
the result recorded in 0016 section 21; route (b) of 21.3 stays open.

The readers' brief, with identifiers and what to read only, is
`docs/research/square-edge/readers/brief.md`.

**2026-10-27: addendum to (ab), after the review of 2026-10-27** (the
independent review of 3389a04..2fbe1a3, which found (ab)'s label and its
lower ordering wanting; 0016 section 21.5). (ab)'s text above stands as
written; this addendum changes it as follows.

- _The data named for the lower ordering beyond 60 deg_ (rule 2 of
  10.1, a new use of figures already read): TN 3861 figs. 15 and 16
  (each read twice, the second blind, for 0016 section 16) and fig. 17
  (read once), at their three crossflow points at sweeps beyond 60 deg:
  Lord and Ulmann's at 70 and 75 deg and Penland's at 75.1 deg. They
  are evidence of the ordering only, never a band's end. Nothing new is
  read, so no blind reading is owed for this use; fig. 17's second
  reading, if wanted, is the coordinator's to arrange.
- _Penland's point on RM A55H31 fig. 12_ stays named, but the lower
  ordering no longer rests on it: within its reading error r spans 0.877
  to 1.149, and RM A55H31 fig. 11 puts the same test's stagnation
  pressure at 0.631 and 0.738 of Rayleigh's, against TN 3861's 1.17
  (both disclosed in 0016 section 21.2). The claim that its end effect
  raised it is withdrawn.
- _Beyond 75.1 deg_, the largest sweep among those points, the lower
  ordering rests on the principle alone, and the label says so.
- _The label_ is no longer the one quoted above. It carries each term
  whole, the lower and the upper, each with its own sources, regime and
  limits, and no longer calls the 60 deg term "the largest sweep checked
  on yawed cylinders" (at its own normal Mach number none may be); the
  component's band text names each bound's source, band and regime. The
  label was changed in 9c5e5dd, before this addendum, and its clause
  beyond 75.1 deg added with this addendum, in 70551b3; neither change
  reads a value or sets a band.
- _The upper ordering's least margin_ is 1.234 of the term at the sweep
  (M 2.2, just past 60 deg), not the 1.29 first written in 0016 section
  21.2: 1.4% over the largest measured r, 1.217, at normal Mach numbers
  where no yawed cylinder is measured.

**2026-10-27: addendum to (af), after the review of 2026-10-27, before
any reading.** Written after the independent review of 3389a04..2fbe1a3
(with 5e47532) and before any reading of the sets (af) names has been
paired, compared or seen by anyone for this repository; the readers are
still working blind and are not told of it. (af)'s text above stands as
written; where this addendum differs, it governs.

- (a) _Criterion (ii) counts the error against the claim._ P2 passes
  only if every face reading, the lower of the two readings, is at least
  0.5283 + a, not 0.5283 - a. No face orifice is excluded, the ones
  nearest the corner included. If those nearest the corner fail it, P2
  fails, and square-cut leading edges stay refused.
- (b) _Which sets test P1._ Where a report gives its face pressures over
  its own measured stagnation-point pressure, P1 (at most p02) holds by
  construction and that set does not test it; a set tests P1 only where
  its face pressures are given over a reference not measured on the face
  (the free stream's static or total pressure, or p02 from the stated
  Mach number). Which sets do which is not known from the captions and
  summaries seen; it is taken from each report's own statement, which
  both readers record (`geometry.csv`, "what the pressures are
  normalised by"), and the pairing's record names, before any value is
  compared, the sets that test P1 and those that do not. P1's criterion
  stays: every face reading, the higher of the two readings, at most 1 +
  a, on the sets that test it. If no set tests it, P1 rests on 0016
  section 21.1's argument alone, the record says so, and the owner
  decides whether square-cut edges may then be wired.
- (c) _Criterion (iii) is information only._ An axisymmetric face's mean
  is not a planar face's, so criterion (iii) does not test the planar
  face's margin (0016 section 21.1, items 4 and 5). It is computed and
  recorded, and passes or fails nothing. On a pass, the label says the
  planar face's margin is an analogy, not tested.
- (d) _The Reynolds number._ (af)'s floor on a pass, 6.7e3 on the
  thickness (21.1 item 7), rests on an estimate that uses the failed
  computed check (the stagnation-point velocity gradient of 21.3's
  solutions), which the owner's rule against unverified estimates
  forbids; it is withdrawn. On a pass, square-cut leading edges are
  served only where the face Reynolds number (on the face's height: a
  fin's thickness, a set's cylinder diameter; the normal component on a
  swept edge) lies inside the range the paired sets measured, from the
  least to the largest. Outside it they are refused, in plain words:
  "a square-cut leading edge is served only where the air's Reynolds
  number across its face lies within the range measured on flat faces,
  X to Y; this edge's is Z". No trend criterion is registered to extend
  it: TN 4300's 4 in and 12 in models differ by a factor of three in
  Reynolds number, far less than the gap below. Any extension below the
  measured range is the owner's to agree later; by default there is
  none. For scale: the sets' Reynolds numbers are of order 1e6 on the
  diameter (the least seen in their summaries and text, 0.90e6, TM
  X-19), while a hobby fin 1 to 6 mm thick at Mach 2 near sea level has
  a face Reynolds number of about 5e4 to 3e5 (4.7e7 per metre), and less
  at altitude; so a pass alone would serve no hobby fin unless a set's
  measured range reaches down to it.
- (e) _Sweep and Mach number stand._ Swept edges to 60 deg, labelled an
  analogy, and the normal Mach numbers 2.0 to 3.0 stand as (af) wrote
  them.

**2026-10-27: the Reynolds number of (af) addendum (d), defined** (the
coordinator's definition). It is taken on free-stream conditions, on the
face height (a fin's thickness, a measured cylinder's diameter), with
the velocity's component normal to the edge for a swept edge. Each
report's stated basis is converted to it. _Written after (af) was
applied:_ the request reached this branch after b0590ba had applied (af)
and recorded its verdict, so this line does not precede the application,
as was asked. b0590ba formed the range from three numbers:

- TM X-19's 0.90e6, as both readers give it, "based on model diameter";
- TN D-5392's 1.88e6, "based on afterbody diameter";
- RM L57C18's free-stream 14e6 per ft, times its paired face diameters.

Whether TM X-19's and TN D-5392's bases are free-stream conditions is
not in what either reader records. Whether b0590ba's range stands under
this definition is the coordinator's to decide. Square-cut leading edges
stay unwired meanwhile.

**2026-10-27: (af) applied, with its addendum: pass.** The sets were
read twice, the second blind (370c1c4), and paired by a neutral party
(eaee32b). Before any value was compared, the pairing found that RM
L57C18 tests P1, that TM X-19 does not, and that for TN 4300 and TN
D-5392 it is not established, so they do not test it. (af) was then
applied by script, `docs/research/square-edge/af/apply_af.py`, with its
rules fixed in its header before it was first run (0016 section 21.6).

- _(ii)_ holds at every face orifice of every set, model and Mach number
  read: the lower reading is at least 0.5283 + a. The least margin is
  +0.027, at TM X-19's orifice nearest the corner. TN D-5392 table II
  orifice 65* is at +0.054, on B's 0.5844 (A read 0.9844).
- _(i)_ holds on RM L57C18, the one set that tests P1: the largest
  higher reading is 0.987 of p02, against 1.01.
- _(iii)_, information only, is 0.74 to 0.80.
- _Disclosed:_
  - both RM L57C18 fig. 5 readings saw its table II, and nothing is set
    from it;
  - fig. 5(f)'s calibrations differ and are not settled;
  - the pairing party saw (aa)'s computed-check record in words and
    compared nothing with it.
- _By (af), square-cut leading edges are wired:_
  - normal Mach numbers 2.0 to 3.0;
  - sweep to 60 deg with the sweep allowance, an analogy;
  - face Reynolds numbers (on the thickness, normal component) 0.90e6 to
    4.32e6. That is TM X-19's on its diameter up to RM L57C18 model D's
    per-foot value times its paired face diameter. TN 4300 does not
    widen the range, its per-foot value not shown to belong to its
    pressure tests;
  - refused outside these, in plain words;
  - the label names the sets as tests of the bounds' premises, not of
    the value, and the planar face's margin an analogy, not tested.
- No extension below 0.90e6 is made; any is the owner's to agree.

**2026-10-27: (af)'s Reynolds range recomputed; the wiring deferred**
(the coordinator's ruling on the entries above). The pass stands for the
premises, criteria (i) to (iii). The range computed before the
definition was pinned, 0.90e6 to 4.32e6, does not stand.

- _Recomputed under the definition_, a set counting only where the
  readers' paired records show its basis:
  - TM X-19 and TN D-5392 do not count: their numbers are "based on" a
    diameter, on conditions neither reader records;
  - TN 4300 does not count;
  - RM L57C18's models C and D count, on its free-stream per-foot value
    times their paired face diameters.
- _The range surely measured_ is 3.85e6 to 4.32e6.
- _Coverage:_ none of the population's 1220 square-cut cases (of 8000)
  lies in either range; the largest face Reynolds number among them is
  2.9e5.
- _Square-cut leading edges stay unwired and refused._ The premises
  pass, but no hobby-scale fin face lies inside the measured Reynolds
  range, so wiring is deferred (0016 section 21.6).

_Note, 2026-10-28 (Fable's review of 3e026a8):_ (af) registered, before
any reading, "_On a pass_, square-cut leading edges are wired". It
passed, and they are not wired. That is a deviation from (af) as
registered, made by the coordinator's ruling above, not by (af)'s
criteria. It is in the refusing direction: what (af) would have served
stays refused. On the refusal audit's population the coverage is zero
either way: none of its 1220 square-cut cases lies in the range (af)
would have wired on (0.90e6 to 4.32e6) or in the recomputed one (3.85e6
to 4.32e6) (0016 sections 21.6 and 21.10).

**2026-10-27: second addendum to (ab), after the re-review of
2026-10-27** (the review of 5e47532..ef7fc7d). (ab)'s text and its first
addendum stand as written; where this one differs, it governs.

- _Fig. 17's reading does not count._ The lower ordering from 60 to 75.1
  deg rests on the front side estimated with TN 3861 fig. 17's drag (0016
  section 21.2). Fig. 17 was read once on 2026-10-21, for 0016 section
  16, before any entry named it: 10.1 names figs. 15 and 16 only, and the
  first addendum above named fig. 17 afterwards. That reading does not
  count.
- _Named now, before it is read again:_ TN 3861 fig. 17, for:
  - its crossflow points of yawed cylinders swept beyond 60 deg: Lord
    and Ulmann's at 70 and 75 deg, and Penland's at 75.1 deg;
  - for the estimate's error, the cylinders normal to the stream
    replotted on it (Gowen and Perkins, which is TN 2960).

  It is to be read twice afresh, the second reading blind, and paired by
  a neutral party, to the readers' brief
  `docs/research/tn3861-fig17/readers/brief.md`, which gives identifiers
  only.

- _Until then_, rounded leading edges swept beyond 60 deg are refused, as
  main refuses them. The bounded term is kept unwired
  (`roundedLeadingEdgeBeyond60` in `src/fins/rounded-leading-edge.ts`).
- _After the pairing_, 0016 section 21.2's rule is applied as written to
  the paired values, by script, and 60 to 75.1 deg is served again only
  if it holds. Written out now, before any reading:
  - F = C_D (fig. 17) + Cp_down (fig. 16) at each point, taken on every
    combination of the two fig. 17 readings and the two fig. 16
    readings; figs. 15 and 16 were named and read twice before this.
    Penland's point takes fig. 17's pressure-integrated series, as
    section 16 did. MN is (2/3) Cp_pitot at the crossflow Mach number.
  - The estimate's error, e, is the largest difference, over every
    combination, between F/MN and TN 2960's integrated front side over
    MN at TN 2960's three cylinders replotted on figs. 16 and 17.
  - A point's sweep is 90 deg less its stated angle of attack (Penland
    14.9 deg; Lord and Ulmann's crossflow Mach number 1.04 point 15 deg,
    TN 3861 p. 11). Where no angle is stated (Lord and Ulmann's 70 deg
    point), it is 90 deg less asin(M_c / M), from each paired M_c.
  - The rule holds if, at all three points, on the lowest combination:
    - (a) the stagnation pressure (fig. 15) and F each lie above the
      principle: over Rayleigh's pitot pressure, and over the term at
      the point's sweep and Mach number, respectively;
    - (b) F/MN less e is at least the lower bound's end there over MN:
      the term at the point's sweep and Mach number times its band's low
      end. Where the point's Reynolds number is not stated, the highest
      low end over the regimes the term serves there is used.
  - If the rule fails at any point, sweeps beyond 60 deg stay refused.
- _Beyond 75.1 deg_, the largest sweep at which a yawed cylinder is
  measured, the edge is refused at any Mach number, after the pairing
  too: the principle alone does not show the ordering.

_Correction, 2026-10-28_ (the re-review of ef7fc7d..5159cac). The
addendum above calls 75.1 deg "the largest sweep at which a yawed
cylinder is measured". That is false. Fig. 17 also has Lord and Ulmann's
point at 80.1 deg (P01, crossflow Mach number 0.695). What is true: 75.1
deg is the largest sweep at which a yawed cylinder's front side is
estimated and the bounds' ordering checked. Fig. 16 has no downstream
pressure for the 80.1 deg point, so no front side is estimated there.
The rule and its verdict are unaffected. The code's words, the page's
words and 0017 now say this; the addendum's text stands as written.

**2026-10-27: 21.2's rule applied to the paired fig. 17: it holds; 60 to
75.1 deg served again.**

- _The readings._ TN 3861 fig. 17 was read twice afresh, the second
  reading blind, to the brief of the second (ab) addendum (d0094f2), and
  paired by a neutral party (3d7dd16). All 25 symbols pair and all 25
  agree, with no label differences.
- _The rule, applied as written, by script_
  (`docs/research/tn3861-fig17/rule/`, out/verdict.txt). Every
  combination of the readings is taken, and each pair's envelope in the
  direction against the claim. Figs. 15 and 16 are as read twice for
  0016 section 16.
- _The estimate's error e_ is 0.0233, the largest over TN 2960's three
  replotted cylinders (P04, P08, P12). The fig. 17 reading that does not
  count had put it at 0.086.
- _The 70 deg point is P03._ The pairing left it open among P01, P03 and
  P09. By the addendum's own definition, a point's sweep is 90 deg less
  asin(M_c / M) from its paired crossflow Mach number. That puts P01 at
  80.1 deg, P03 at 69.7, P09 at 60.3 and P02 at 74.9 (the stated 75 deg
  point). Only P03 is at 70 deg.
- _The rule holds at all three points_, on the lowest combination:

  | Point                               | Stagnation over Rayleigh's | F over the term | Margin of (b) |
  | ----------------------------------- | -------------------------- | --------------- | ------------- |
  | Lord and Ulmann's 70 deg point, P03 | 1.0656                     | 1.0774          | +0.1842       |
  | Lord and Ulmann's 75 deg point, P02 | 1.4972                     | 1.7896          | +0.6879       |
  | Penland's 75.1 deg point, P06       | 1.1715                     | 1.1474          | +0.1870       |

  The lower bound's end is taken as the highest over the regimes the
  term serves, which is stricter than the addendum asks where a point's
  Reynolds number is stated.

- _So rounded leading edges swept beyond 60 deg and up to 75.1 deg are
  served bounded again_, as 0016 section 21.2 and the addenda say. The
  label names fig. 17 as read twice. Beyond 75.1 deg they stay refused,
  at any Mach number.

_Recomputed, 2026-10-28_ (the re-review of ef7fc7d..5159cac). The entry
above took fig. 17's two primaries only. Ambiguous points keep every
reading, so the rule is now taken over every reading either reader
states for a point: the primaries, the alternatives, and the cross-stroke
and bounding-box readings.

- e becomes 0.0341 (0.0233 on the primaries). Its largest is P08, the
  Gowen and Perkins cylinder at M_c 1.96, on B's bounding-box reading
  of 1.458 (A's alternative, 1.456).
- The margins of (b) become +0.1734 at P03, +0.6771 at P02 and +0.1756
  at P06.
- F over the term becomes 1.0774, 1.7896 and 1.1465.
- The stagnation ratios are unchanged.
- **The verdict does not change: the rule holds at all three points.**

**2026-10-26 (ad): fins ending within a chord ahead of the base (A5 of
the refusal plan): bounded, not measured, below Mach 1.5; TN 3819 fig.
32's Langley symbols to be read a second time for Mach 2.0 to 3.0; and
NSWCDD/TR-92/509's fins ahead of the base a check only** (a recorded
decision under 10.2's "Anywhere else only by a recorded decision", on the
coordinator's route of 2026-10-26; written before the code and before any
new reading). The rebuilt fins-on-base factor (0015) refuses fins whose
trailing edge ends 0 to 1 root chord ahead of the base outside Mach 1.5
to 2.0, the only Mach numbers where TN 2360 fig. 6 measures positions
ahead of the base (`fins-near-base`).

- _Below Mach 1.5 (Mach 1.0 to 1.5): bounded, not measured._ Lower bound
  the zero member there (RM L52E06 fig. 7's relief with flat plates at
  the base, F 0.838, read twice; for flat-faced fins the same relief, as
  at the base); upper bound the same fins at the base, that is the upper
  member of their bracket at x/c = 0 (below Mach 1.5 always the
  reference, four unswept 10% circular arcs on TN 3819 fig. 35's
  free-flight line, read twice, stated on W2's term as 0015 section 11.2
  states it). Served: the midpoint, the band the whole gap (about +-32%
  to +-35% of the factor on W2's term), labelled "bounded, not measured",
  the gap in C_D beside it.
- _The ordering, from band-setting data already registered and read
  twice_ (TN 2360 fig. 6, 10.1; both readings, 0015 section 7; with fig.
  33's body alone for the factors). At both of its Mach numbers, for every
  member it measures ahead of the base (two and four fins, t/c 0.05 and
  0.10): (1) the increment with the trailing edge x/c ahead (0 < x/c <= 1)
  is no larger than the same fins' at the base, within the reading
  errors: at Mach 1.5 smaller by 0.015 to 0.076 in dPb, each end moved by
  its error toward more suction; at Mach 2.0 smaller by 0.005 and 0.010
  for two 10% and four 5% fins, while four 10% fins keep their at-base
  increment to x/c 0.4 (at 0.2, -0.0642 +-0.002 against -0.0644 +-0.0002
  and -0.064 +-0.002 at the base: equal within the errors, 0.0002 apart
  either way); (2) the most relief ahead of the base, as F over fig. 33's
  body alone with both errors toward more relief, is 0.910 at Mach 1.5
  (four 10% fins at x/c 1.0) and 0.944 at 2.0 (four 5% fins at x/c 1.0),
  above the zero member at each (0.838 below Mach 1.62, 0.938 from it).
  TN 2360's own account (pp. 7, 9 to 11; NTRS 19930083086) gives the
  mechanism and its direction in Mach number: the fins' pressure field
  reaches the dead-air region behind the base along isobars inclined
  farther rearward as the Mach number rises, so "the base pressure is
  influenced by the tail surfaces at tail positions farther forward than
  at lower Mach numbers"; with the tail well forward "no effect" is
  expected, and the decrease "was small for the tail located well forward
  of the base but, for the normal tail position, x/c ~ 0, ... nearly the
  maximum". The data agree in direction: at x/c 0.4 the three members
  measured at both Mach numbers keep 6% to 63% of their largest at-base increment
  at Mach 1.5 and 64% to 98% at 2.0. So going down from Mach 1.5 the
  at-base upper bound holds with a growing margin. The relief side rests
  on less: the relief a chord ahead grows from Mach 2.0 to 1.5 (1 - F
  0.056 to 0.090, with errors), which carried linearly to Mach 1.0 is
  0.124, inside the zero member's 0.162; no measurement with fins ahead
  of the base below Mach 1.5 is known.
- _Above Mach 2.0: still refused._ The same direction says the at-base
  bound is not safe going up (the fins reach the base from farther
  forward as the Mach number rises), so the bounded value is not carried
  above 2.0. The refusal's words say so.
- _At Mach 1.5 to 2.0_ nothing changes: every member measured at a Mach
  number has stations at x/c 0 and 1.0 there, so every position is
  bracketed between measured stations, and a member measured at one of
  the two Mach numbers only (two 5% fins, Mach 1.5) widens the bracket
  outward elsewhere (0015 sections 3.2, 3.3, 3.6).
- _TN 3819 fig. 32_ (Love; NTRS 19930084517, PDF p. 64): band-setting
  since 10.1's registration ("figs. 32 to 35 ... location"). Amendment
  (h) lists it as not read; that was wrong when written: round 6 read it
  once, blind (`docs/research/total-drag/audit/round6/readings/`,
  `tn3819_fig32.csv` and the method file there), including the Langley
  9-in. tunnel's symbols at Mach 2.41 (plain and flagged triangles) and
  the faired curve through them at x/c 0 to 1. Nothing has used it. Its
  Mach 2.41 symbols are named here for the position members at Mach 2.0
  to 3.0 (route (i) of A5), each as its increment over the same model's
  increment at x/c 0, with fig. 33's Mach 2.41 body alone. A blind second
  reading is requested now; the coordinator arranges the reader and a
  neutral party pairs the two. It sets nothing until paired, and the
  method that uses it is written in 0015 before its code. A note in
  `docs/research/total-drag/data/w1b_w2_proposal.md` (section 1.4)
  records a look by eye, not a reading, at a Mach 2.41 symbol one chord
  ahead lying on the relief side of the zero member; it sets nothing, but
  if the paired reading confirms a relief beyond the zero member a chord
  ahead at Mach 2.41, the relief side of the bounded value below Mach 1.5
  is to be re-examined before route (i) is served.
- _NSWCDD/TR-92/509's fins one and two chords ahead_ (Table 1's
  configurations 11 to 16): transcribed once (`nswc_tr92_509_table2.csv`)
  and their factors computed (F 1.00 to 1.14 at Mach 2.0 to 3.0,
  `w1b_w2_proposal.md` section 1.4) before any registration, as (g)
  records for the set. So by rule 2 of 10.1 they never set or shape a
  band: they are a check that sets nothing (the precedents (g), (r), (s),
  (t)), and only after Table 2's blind second transcription (requested in
  (g); round 6's was never committed). Fins two chords ahead check the
  plain curve's use a chord or more ahead (0010 section 1.4), nothing
  else.
- _Not changed:_ the sweep refusals (checked before the position), the
  present factor, any served number at the base or at Mach 1.5 to 3.0,
  and every total: below Mach 1.5 every total is still refused by (f), so
  this serves the body base term only. No held-back set is opened or run.

_Narrowed the same day, 2026-10-26, before review or merge (the
coordinator's decision, accuracy first):_ below Mach 1.5 the bounded
value serves only fins ending at most **0.4 root chords** ahead of the
base. Up to x/c 0.4 TN 2360 fig. 6 measures no relief at all with the
fins ahead of the base: every symbol at x/c 0.2 and 0.4, at both Mach
numbers and for every member, moved by its reading error toward relief,
still shows a suction (dPb at most -0.0028, F at least 1.014), so the zero
member's lower bound has its whole 0.162 to spare there. Relief appears
from x/c 0.6 (four 5% fins at Mach 1.5) and grows toward a chord ahead
and as the Mach number falls; below Mach 1.5 its size rests only on the
linear carry above, and the by-eye note on fig. 32 suggests it can be
larger. So fins ending more than 0.4 root chords ahead (0.4 < x/c < 1)
stay refused below Mach 1.5 (`fins-near-base`), the words saying why.
After fig. 32's pairing this is revisited, before route (i) is served:
if the paired reading shows relief beyond the zero member at x/c 0.4 or
closer at Mach 2.41, the bounded value at x/c up to 0.4 below Mach 1.5 is
re-examined; and whether the measured relief there bounds positions
beyond 0.4 below Mach 1.5 is decided then, not now.

What it costs and gains is recorded below this entry from
`docs/research/refusals/` run before and after, with the cross-check
against `src/total` required to agree (0015 section 8).

What it cost and gained as first built (0 < x/c < 1 below Mach 1.5;
0015 section 8; `docs/research/refusals/out/impact.out` at commit
5c81b5b, the run before reproducing main's committed output byte for
byte): the position refusal falls from 6.0% of the cases to 0% at Mach 1.0 to 1.2
and at 1.2 to 1.5, and stays 11.5% at 1.8 to 3.0 (all above Mach 2.0)
and 0% at 1.5 to 1.8; 5.9% to 2.9% over all bands. No total moves: 153
of 8000 (1.9%), 0% below Mach 1.5 by (f); the cross-check agrees on all
1200 cases. No case is newly refused. What it serves is the body base
term below Mach 1.5 for those cases, until the fin terms near Mach 1
(0019) let a total through.

What it costs and gains as narrowed (x/c up to 0.4 below Mach 1.5; the
same population and run, `out/impact.out` now, against main's at
3389a04): the position refusal falls from 6.0% of the cases to 4.4% at
Mach 1.0 to 1.2 and at 1.2 to 1.5 (about 32 of 2000 rockets in each band
now take the bounded value), stays 0% at 1.5 to 1.8 and 11.5% at 1.8 to
3.0; 5.9% to 5.1% over all bands; sole blocker of a total 0.11%,
unchanged. W1's package appears in 76.5% of the cases below Mach 1.5,
from 78.0%. No total moves (153 of 8000, 1.9%); the cross-check agrees on
all 1200 cases; no case is newly refused against main.

**2026-10-26, narrowing (ad) after the independent review of
3389a04..245a88e** (the coordinator's decision, accuracy first, under the
owner's rule of no unverified estimates; this narrows (ad), whose text
above stands as written, the runs it quotes being those at commits
5c81b5b and 245a88e).

- _The review's finding (blocking), quoted:_ "the basis for serving x/c up
  to 0.4 below Mach 1.5 contradicts the record's own Mach direction.
  TN 2360's relief crossing for four 5% fins moves from x/c 0.88 at M 2.0
  to 0.51 at M 1.5. That is faster than sqrt(M^2-1) scaling, which
  predicts 0.57. Carried down, the crossing falls inside 0.4 below about M
  1.35: about 0.38 at M 1.3, 0.30 at M 1.2 and 0.21 at M 1.1. For four
  10% fins it is about 0.45 at M 1.2 and 0.31 at M 1.1." And TN 2360 p. 7,
  which (ad) left out: "In addition, the airfoil pressure coefficient at
  any chord location decreases with increasing Mach number." So as the
  Mach number falls the fins' pressures grow as well as their isobars
  steepen, "no relief at all" up to x/c 0.4 is measured at Mach 1.5 and
  2.0 only, and below about Mach 1.35 the low side would rest on the
  unmeasured relief carry the first narrowing meant to avoid. The revisit
  trigger above (relief at x/c 0.4 or closer at Mach 2.41) pointed where
  TN 3819 fig. 32 shows none, so it could not fire.
- _Decided: below Mach 1.5 every position ahead of the base (x/c > 0) is
  refused._ No measurement with fins ahead of the base below Mach 1.5 is
  known, and the ordering's direction, the relief carry and a reach
  scaled by beta are all carries, not measurements; none is used. The
  refusal names what is missing: any measurement below Mach 1.5 with fins
  ahead of the base. Finding one is the revisit trigger, replacing the one
  above. It costs no served total today: below Mach 1.5 the fins' own
  drag refuses every total ((f)).
- _At Mach 1.5 to 2.0,_ where TN 2360 measured positions (x/c 0 to 1.0),
  the measured brackets of 0015 sections 3.2 and 3.3 stay, inside the
  chord rule below. Above Mach 2.0 fins ahead of the base stay refused:
  TN 3819 fig. 32 now has two readings (round 6, round 14; pairing
  `docs/research/total-drag/audit/pairing-2026-10-26-fig32/`) that
  disagree on 3 of its 12 symbols, a third blind reading is under way, and
  it sets nothing until they are settled and its method is written in 0015.
- _The chord rule (the review's second finding)._ TN 2360 measured
  positions on one geometry: a tail chord of 1.875 in on a 1.250 in body
  (its fig. 2 and p. 4), a root chord of 1.5 body diameters. In its
  superposition model (pp. 6 and 7, fig. 4) the fins' pressure field
  reaches the dead-air region behind the base along isobars inclined at
  the Mach angle, so where it reaches depends on the body radius times
  beta against the chord; the review finds the at-base upper bound holds
  in that model only while the body radius times beta stays under half
  the chord. At Mach 2.0 TN 2360's own geometry is past that limit (0.625
  in times 1.732, 1.08 in, against 0.94 in), and there its four 10% fins
  keep their at-base increment to x/c 0.4, as the model leads one to
  expect: the bound at that geometry rests on the measurement. Nothing
  measured shows how the position effect carries to a shorter or longer
  chord. So the served domain for fins ahead of the base is no wider than
  what TN 2360 measured in chord over diameter at each Mach number: a
  root chord of 1.5 body diameters, within 0.5% (the precedent of 0011
  section 3, each dimension within 0.5% of the configuration measured;
  that reason corrected 2026-10-28, the entry of that date below),
  at Mach 1.5 to 2.0. Every other chord is refused there, at every
  position 0 < x/c < 1 (the swept fins served from 0.9 root chords ahead
  among them, whose members there are TN 2360's), in plain words; so is a
  chord the caller does not give.
- _Below about Mach 1.2_ the at-base upper bound rests on its margin, not
  on TN 2360's mechanism (the review): the linear superposition loses its
  meaning as the Mach number nears 1, beta tending to zero and the
  airfoil pressures it superposes growing without bound. Moot below Mach
  1.5 after this decision, and recorded so that the record stays true.
- _Also from the review, not blocking, fixed with this:_ the refusal's
  words below Mach 1.5 name the missing measurement instead of fig. 32,
  which at Mach 2.41 cannot settle them; above Mach 2.0 they say fig.
  32's readings disagree, not that a second reading is awaited; a plate
  with a rounded trailing edge within a chord ahead of the base is refused
  for its trailing edge in words that say near the base, not at it, with
  its position's reasons beside; and 0015 section 3.3's figure "on the
  curve itself" is corrected (on Love's curve the zero member is 0.8379
  times 1.065, 0.892; times 1.04, 0.871, since (ah) was merged).

What it costs and gains is recorded below from `docs/research/refusals/`
run before (245a88e) and after, with the cross-check required to agree
(0015 section 8).

What it costs (the same 2000 rockets, `out/impact.out` after this
narrowing, against main's at 3389a04): the position refusal is 6.0% of
the cases at Mach 1.0 to 1.2 and 1.2 to 1.5 (as on main), 7.4% at 1.5 to
1.8 (0% on main) and 12.6% at 1.8 to 3.0 (11.5%), 8.0% over all bands
(5.9%); as the sole blocker of a total, 0.15% (0.11%). The chord rule
costs three totals: 150 of 8000 are served (153 on main), 47 at Mach 1.5
to 1.8 (49) and 103 at 1.8 to 3.0 (104), none below 1.5. The
cross-check agrees on all 1200 cases.

**2026-10-26, how TN 3819 fig. 32's three readings are used** (the
coordinator's decision, made before any of them is set against a
method). Fig. 32 now has three blind readings (round 6; round 14, commit
e15934c; round 16, commit c69858e) and a three-way neutral pairing
(`docs/research/total-drag/audit/pairing-2026-10-26-fig32-three/`,
commit 7f8c898): readings 2 and 3 agree on all 12 symbols, with the same
identities; reading 1 differs from both at the open symbol at x/c 0.8,
the flagged symbols at x/c 0.6 and 0.4, and the faired curve's left end
at x/c 1.0, gives one value per station from 0.8 to 0.0 with no
identities, and recorded no file hash. Where all three agree, the agreed
values are used; where reading 1 differs, the envelope of all three
readings is used, reading 1 not being dropped because two readings
outvote it. That is the wider of the choices, taken on purpose. Fig. 32
is at Mach 2.41, so after the narrowing above it bears only on what
(ad) assigns it at higher Mach numbers: route (i), the position members
at Mach 2.0 to 3.0, whose method is still to be written in 0015 before
its code. It does not bear on Mach 1.5 or below, where every position
ahead of the base is refused and the revisit trigger is a measurement
below Mach 1.5. (ad)'s rules apply to it as written; a case they do not
cover is stopped and taken to the coordinator, not decided after seeing
values.

**2026-10-26, route (i) deferred** (the coordinator's decision, on the
cases above that (ad)'s rules do not cover). Fig. 32 at Mach 2.0 to 3.0
is not pursued now, and nothing uses it; any future route (i) needs a
fresh registration here, written before it is used. Its four open
questions are in 0015 section 10, in plain words. The first is the
lower bound: the three-way pairing's values were seen while the pairing
was checked and were used for nothing, and its symbols a chord ahead of
the base lie far on the relief side of the zero member.

**2026-10-27, fins a chord or more ahead of the base: the plain curve
withdrawn** (the coordinator's decision, accuracy first, on the
re-review of A5 at 245a88e..c7af8cf, which passed A5 and found this in
main's rule; written before the code). 0010 section 1.4 served fins
ending one root chord or more ahead of the base with the plain curve
(no fin effect), labelled not validated with fins, on TN 2360's finding
that the increment is nearly zero a chord fore or aft.

- _The reviewer's case, quoted:_ "four unswept 10% circular arcs, root
  chord 1.5 diameters, trailing edge exactly one chord ahead, M 2.0. It
  is served 0.1447 with a band of 0.1187 to 0.1563. TN 2360 measured dPb
  -0.0096 (both readings) on a body-alone P_B of -0.1507, which gives
  1.107 times the curve, and at least 1.09 with every error moved toward
  less suction. So the truth is outside the band. With a 1.0 diameter
  chord, one chord ahead is TN 2360's x/c 0.67, where F is about 1.16 to
  1.18." In the population, 81 of 2000 rockets have fins a chord or more
  ahead, and they carried 15 of the 150 totals served.
- _Decided:_ fins ending ahead of the base are served only where TN 2360
  measured them: a root chord of 1.5 body diameters within 0.5% (the
  chord rule above), x/c from 0 to 1.0 inclusive, and Mach 1.5 to 2.0,
  through the measured factor (0015 sections 3.2 and 3.3), not the plain
  curve. A trailing edge exactly one chord ahead takes TN 2360's station
  at x/c 1.0. Every position beyond x/c 1.0, at any chord, is refused,
  because nothing measures it, and the words say so plainly. The plain
  curve of 0010 section 1.4 is withdrawn (its text stays as written, with
  a dated note). Expected cost, about 15 totals; the exact count is
  recorded below from the population run (15 before main's Von Karman
  noses were counted, 17 on the merged head).
- _Also recorded (the review's N3), for the owner, with no rule added
  now:_ TN 2360's fins are rectangular, of aspect ratio 2.33 (its
  summary), and neither span nor taper is constrained by the chord rule:
  a fin of TN 2360's root chord with another span or a tapered planform
  is served at the measured positions as if it were TN 2360's.
- _And fixed with it (the review's N1, N2, N4):_ the hold-out run passes
  the root chord over diameter to the factor; the page's advice for a
  rounded plate near the base no longer leads into another refusal; and
  every piece of advice to move fins "a root chord or more ahead of the
  base" is removed, since that position is now refused.
- _How the refusals carry every reason, in the code (nothing more is
  served; heading and text corrected after the review of b323511, whose
  finding 1 showed the first wording promised more than the code did):_
  ahead of the base the position is checked before the fins' section,
  sweep, count or thickness, so no refusal of those is named where every
  section would still be refused. A blunt trailing edge that the faces
  widen or narrow to (the Basic Finner's wedges), which the rebuilt factor
  refuses at every position, is refused ahead of the base in words of its
  own, near the base and not "at this speed"; its words say that at the
  base four unswept wedges like the Basic Finner's are measured from Mach
  1.8, and its change is sharp trailing edges at the base. More than a
  chord ahead, a plate's rounded trailing edge or such a blunt one is
  named beside the position. Where fins ahead of the base are refused for
  their position or for such a trailing edge, the words send the
  rocketeer to the base, so the fins are run at the base as the words'
  change makes them: for a refusal of the position the same fins; for a
  plate's rounded trailing edge the same plate with square trailing
  edges; for a blunt edge the faces widen or narrow to, a symmetric
  double wedge of the same thickness ratio standing for "sharp trailing
  edges". Refused there, that refusal is carried with the first, in its
  message and in its words, which name both and give both changes (or
  none, where nothing about the rocket changes the second); served there,
  the first reason alone is named. The review's case, three 5%
  double wedges on a clipped delta with the leading edge swept 34.2 deg,
  the trailing edge unswept, a root chord of 2.0 diameters, x/c 0.5, Mach
  1.8, was refused for its position and told to move the fins to the
  base, where they are refused again for their sweep; its words now name
  both. Until the review of e232dca the same fins were run at the base
  for the trailing-edge refusals too, where they are refused for the
  same edge again, so a plate's or a wedge's sweep, count and thickness
  at the base were never checked: in the population the change the words
  advise was still refused for 22 of 36 rounded plates per band from Mach
  1.0 to 1.8 (for sweep) and 6 of 36 at 1.8 to 3.0; the fins as the change
  makes them are run since. Still not checked: a sharp section other
  than that double wedge, which may meet a refusal of its own shape
  (steep bevels, say); and, until 2026-10-28, the changes that the
  refusal at the base names in turn, so a chain of more than two reasons
  was not followed (followed since: the entry of 2026-10-28 below). A
  change named never moves the fins further ahead.
- _What it cost (the same 2000 rockets, `docs/research/refusals/`):_ on
  the merged head (main at 5921198 merged at 1ec9df1, whose audit counts
  the Von Karman noses the page serves), 155 of 8000 cases serve a total
  (53 at Mach 1.5 to 1.8, 102 at 1.8 to 3.0, none below 1.5;
  `out/impact.out`). The same head with fins more than a chord ahead put
  back on the plain curve, one line changed for that run only
  (`out/impact-merged-plain-curve.out`), serves 172 (62 and 110): the
  withdrawal costs 17 totals there, all on the 81 rockets with fins a
  chord or more ahead, and gains none. Main itself serves 181 (68 and
  113), so this branch's earlier rules for fins within a chord (the chord
  rule after the review) cost the other 9 on the merged head. Before the
  merge, on main at 3389a04, the withdrawal cost the 15 the review counted
  (150 to 135; the run of e69a9ff). The variants move alike (altitude 0
  km 174 to 157, 20 km 143 to 128, the lenient tip 334 to 310). The
  position refusal now covers every position ahead of the base that TN
  2360 does not measure: 23.8% of the cases at Mach 1.0 to 1.2 and 1.2 to
  1.5, 23.6% at 1.5 to 1.8 and 23.7% at 1.8 to 3.0 (20.4%, 20.4%, 20.3%
  and 20.4% with the plain curve), the sole blocker of a total in 0.57%
  (0.36%). The rebuilt factor's sweep and section refusals fell from the
  run of f8f7c71 (sweep 43.4% to 32.7% over all bands, steep bevels 6.0%
  to 4.3%, in both runs on the merged head) because ahead of the base the
  position is now named first. The cross-check against
  `src/total` agrees on all 1200 cases checked, in each run.
- _Noted 2026-10-28, after (ah) was merged (the coordinator's ruling):_
  the reviewer's case rests partly on the plain curve's band missing TN
  2360's measurement a chord ahead (0.1187 to 0.1563 against 0.1603 at
  Mach 2.0). With the compiled curve's band since (ah), 0.77 to 1.13,
  that band would be 0.1114 to 0.1635 and would hold 0.1603 (0.1114 to
  0.1693 with 0.77 to 1.17, since round 20). The
  withdrawal stands on section 10.2: nothing measures fins more than a
  chord ahead, and at x/c 1.0 TN 2360's own increments are not zero (the
  two-fin tail, 10% thick: -0.0101 on -0.1948 at Mach 1.5 and -0.0137 on
  -0.1507 at 2.0, about +5% and +9% in base drag), so the plain curve's
  assumption of no fin effect is not shown there.
  `fins-on-base-routing.test.ts` holds the numbers, 0.1563, 0.1635 and
  0.1693.

**2026-10-28, the review of 86bcf73 (PASS, with minor items) and the
merge with main's A1.** The review (Fable's, on A5 as main holds it,
f88ecbe, and on this branch's follow-ups) asked that code and record
match: where the record does not name a served case, either a registered
argument is cited for it or it is refused under section 10.2.

- _Sharp fins swept ahead of the base (its items 1 and 2):_ refused under
  section 10.2. A sharp section with the leading edge swept and the
  trailing edge unswept was served at every measured position ahead of
  the base, though 0015 section 3.4 names it at the base and, as a
  trailing edge swept no more than the leading edge, from 0.9 root
  chords (RM L52J21a's position); no measurement or registered argument
  covers it between. It is now served ahead of the base only from 0.9
  root chords. W1b's moderate sweeps, argued at the base only, were
  served ahead of it at exactly Mach 2.0; they are refused ahead of it.
  0015 section 3.4 has a note of this date.
- _Flat plates ahead of the base (item 3):_ the argument cited, nothing
  refused. 0015 section 4's "counts and positions of section 3" covers
  the measured positions ahead of the base (x/c 1.0 among them since
  2026-10-27), with the lower end the at-base relief, 0.838, taken by
  reference to section 4's argument (amendment i); the relief measured
  ahead of the base, RM L52J21a's, is at most 6.2% (0015 section 3.5's
  zero member, 0.9378; "at most 5%" as merged from lift-near-base,
  corrected on merging it into the A1 follow-up, 2026-10-28, as (z)'s
  note of that date corrected the same phrase), inside it. 0015 section
  4 now says so in a paragraph of this date.
- _The chord rule's 0.5% (item 4):_ 0011 section 3's tolerance is for the
  Basic Finner's own inputs, "not for other rockets", so it was no
  precedent. The 0.5% stands on TN 2360's resolution in position: 0.5% of
  the 1.5-diameter chord is 0.0075 diameters, moving a position given in
  chords by at most 0.005 chords, a fortieth of the 0.2 chords between
  TN 2360's stations (0015 section 3.3, a correction of this date).
- _Words and messages (items 5 to 10):_ the withdrawal says "no
  band-setting source measures" fins more than a chord ahead, naming
  NSWCDD/TR-92/509's configurations 11 to 16, one and two chords ahead at
  Mach 2.0 to 3.0, as the check that sets nothing (above); a position is
  printed with digits enough to show which side of one chord it lies
  (1.000000002, not 1); 0015's list of figures not read is corrected for
  TN 3819 fig. 32, read three times since; the position's words say that
  one reading at Mach 2.41 is not yet settled and that the chord counts
  within 0.5%; the sweep's words for a sharp section ahead of the base
  are worded for fins ahead of it (0017's rows follow, a new one for it);
  and the hold-out run's rebuilt model is routed as the library routes
  fins (`rebuiltFinsOnBase`), so a trailing edge within 1e-9 of a chord is
  one chord there too, and a blunt edge ahead of the base has the
  library's words.
- _Every reason (item 11):_ only the first refusal at the base was named,
  so a rocket with three reasons still got advice that fell short. The
  review's probe, five 12% double wedges with the leading edge swept 34
  deg, a root chord of 2 diameters, x/c 0.5, Mach 1.8, was told "the
  fins' trailing edges at the base, and four fins", then refused for its
  sweep, then its thickness. Now, where a refusal's words advise a
  mechanical change of the fins (the position, the edge, the count, the
  sweep, a thickness of 5% to 10%), the change is made and the body base
  asked again, until it is served, a reason comes again, no such change
  is advised, or six changes are made; every reason met is carried with
  the change that met it, in the message and in the words, which give
  every change. The probe is now refused for its position, its count,
  its sweep and its thickness, its change "the fins' trailing edges at
  the base, four fins, ..., and fins of that thickness". This applies at
  the base as well as ahead of it. Still not followed: a change the words
  do not make mechanically (a section's shape, a speed, an afterbody),
  and a sharp section other than the double wedge that stands for "sharp
  trailing edges".
- _Merged with A1 (main 76899f1):_ A1 named a flat plate's sweep refused
  below Mach 1.62 inside a refusal of its position; this branch's chain
  carries the same sweep as the refusal at the base. In `bodyBaseDrag`
  the chain alone names it now, once; the factor called directly keeps
  A1's single combined refusal (0015 section 12, a note of this date).
- _Population (the same 2000 rockets):_ main's run at 76899f1 serves 184
  of 8000 cases a total (73 at Mach 1.5 to 1.8, 111 at 1.8 to 3.0); this
  branch after these items gives `out/impact.out` and `.json` byte for
  byte as main's: no case moves, no total is lost or gained, and the
  cross-check agrees on all 1200 cases. No case of the population changes
  its outcome or the first reason the audit records for it: the new sweep
  refusals meet no case it serves, and the words and the chain of
  reasons change no count.

**2026-10-28, the review of 55a76d2 (NOT PASS on one finding), fixed.**

- _The blocking finding:_ the rebuilt factor refuses with `fin-thickness`
  both fins thicker than 10% and a section whose faces near the edges are
  steeper than the 10% circular arc's, the members' bound (0015 section
  6: "sections outside the 10% arc"); the page worded both as thickness,
  "fins of that thickness". For bevelled sections that is false: with
  bevels over a fifth of the chord any fin thicker than 6.4% is refused
  (the arc's slope near the edges), so four unswept hexagonal fins 8%
  thick at the base, Mach 1.7, were told to take a thickness they had;
  and the chain's thickness change (to 5% to 10%) left them refused.
  Now the factor's message names the shape and the thickness at which a
  section of that shape is served (its thickness times 0.1 over the arc it
  would need, rounded down), the page words it as a shape ("fins at most
  6.4% thick with this section, or longer bevels"), and the chain's change
  scales the section by 0.1 over that arc, which puts it on the 10% arc
  exactly, so it is served. The record's rule is unchanged; only the
  words and the change were wrong.
- _The replay, as the review asked_ (`docs/research/refusals/advice-replay.test.ts`,
  `out/advice-replay.out`; the baseline population's 2000 rockets at four
  Mach bands, the body base asked as `evaluate.ts` asks it): 8000 cases,
  2192 served at once, and of the 5808 refused every chain of advised
  changes ends served (5808), none ending without a mechanical change,
  none falling short. With the thickness change put back as it was (a
  plant), 1027 fall short, every one of them bevelled, the shape refused
  again after the change.
- _Minor items:_ the sweep's words for sharp fins ahead of the base now
  say what is measured, RM L52J21a's 45 deg at 0.85 +-0.05 root chords
  (the RM-10's 60 deg at the base), and what is taken from it; the
  changes of a chain are listed between semicolons, each one item; a
  further refusal's message is the one-step message (tested); the end of
  a chain where a reason comes again, or the steps run out, is tested on
  `followAdvice` itself, since no case of the replay reaches it now; and
  the page's filter for a plate's sweep named twice, unreachable since
  the merge with A1, is removed. The review's optional offer of TN 2360's
  root chord in the position's words is not taken: that change is not
  followed by the chain, so it could fall short unseen.
- _Population:_ `out/impact.out` and `.json` byte for byte as main's at
  76899f1 (184 of 8000 totals; cross-check 1200 of 1200): the words and
  the changes move no count.

**2026-10-28, the re-check of 174490b (PASS), its three small items.** A
double wedge or a circular arc thicker than 10%, which lies inside a
circular arc of its own thickness, is refused for its thickness
alone and worded so ("fins of that thickness", the change 10%); the
shape's words name bevels only where the section has them (a flat middle
between bevels, `hasBevels`), so a double wedge with its ridge off the
middle is told a thickness, not longer bevels. The advice replay is a
guard: it fails if any chain ends with a reason met again or its steps run
out, and if the committed `out/advice-replay.out` differs from a fresh run.
The shape's stated limit is rounded down, tested where it is not a round
number (bevels over 17% of the chord, 8% thick: 0.056, served at it,
refused 0.001 above), with rounding up planted.

**2026-10-28, the quick look of 5a9ce16 (NOT PASS, narrowly), fixed.**
The test of a section's shape (`sectionBracket`'s tauEq, the largest of its
half-thickness over 2 s (1 - s) along the chord and of its edges'
half-slopes) asks whether the section lies inside the 10%-thick circular
arc everywhere, not near its edges. The message, the page's words and
0017's row said "its faces near the edges are steeper", false for a double
wedge with its ridge off the middle: at ridge 0.3 and t/c 0.10 its edge
half-slopes, 0.083 and 0.036, are shallower than the arc's 0.100, and it
reaches outside the arc at its ridge (tauEq 1.19 times its thickness).
Now `sectionBracket` returns the station that sets tauEq, and the message
and the words say the section does not lie inside the arc everywhere and
where it reaches outside: at its ridge (a double wedge), where a bevel
meets its flat middle, the bevel too steep for its thickness (a hexagonal
section; that junction is the binding station, checked, not assumed), or
at an edge, where its faces are steeper than the arc's. The advice, a
thickness at which the shape is served (8.4% at ridge 0.3), is unchanged
and served. This entry's note of the 55a76d2 review, "a section whose
faces near the edges are steeper than the 10% circular arc's", holds
only where the binding station is an edge or a bevel's end. The
population and the advice replay are byte for byte as before (184 of
8000 totals).

**2026-10-28, the quick look of 0e56581 (NOT PASS, narrowly), fixed.** The
shape's words offered "or longer bevels" for every section with bevels,
but thicker than 10% no bevel length serves a section (the longest, a
double wedge, needs an arc of its own t/c): a hexagonal section 12% thick
with bevels over 20%, 40% or 49% of the chord, and 10.5% thick with
bevels over 49%, was offered bevels that are refused again. Now longer
bevels are offered only at most 10% thick, with the least length that
serves: a bevel of length b reaches the 10% arc where t / (4 b (1 - b)) =
0.10, so bevels each at least (1 - sqrt(1 - t / 0.10)) / 2 of the chord
serve, rounded up to 0.1% (8% thick: 27.7%; served at it and at the
longest, refused at 27.6%). 0017's row and note follow. The symmetric
hexagon's test accepts either bevel junction as its binding station, the
two tying. Population and advice replay byte for byte as before (184 of
8000 totals).

_Relabelled 2026-10-26:_ this entry was first written as (aa), which the
coordinator's registry had given to another branch; it is (ad) by that
registry, its content unchanged by the relabelling.

**2026-10-27 (ah): the compiled curve's band corrected, an omission found
by review** (0008 section 3.3; 0010 section 1.2; 0015 section 11.1; the
coordinator's decision of 2026-10-27; letter (ah) allocated by the
coordinator). Widened only: the band of Love's basic curve, measured over
curve, goes from 0.82 to 1.08 to **0.77 to 1.18** at Mach 1.5 to 3.0;
**0.77 to 1.13** since the third addendum below (2026-10-28), and
**0.77 to 1.17** since round 20 (the fourth addendum, applied), which puts
TR 1051 in at its measured symbols.

- _The omission._ 0008 section 3.3 sets the band by a rule: "every base
  data set opened at these conditions is used to set this band". The rule
  was not applied to body-alone base pressures opened inside the curve's
  domain after the band was set, nor to one 0008 opened itself (fig. 35's
  no-fin tunnel symbol at M 1.50, -0.194, in 0008 section 3.4's table). An
  independent review noted that this point, TN 2360's body without fins,
  lies at 1.124 times the curve, outside 0.82 to 1.08. The served band
  missed a valid measurement of a configuration it claims.
- _The domain, as stated before this entry_ (0008 section 3.3,
  `src/base/compiled-curve.ts`): Mach 1.5 to 3.0, a cylindrical
  afterbody, a turbulent layer at the base, no fins near it, power off.
  No limit on Reynolds number, boundary-layer thickness, afterbody length
  or nose shape is stated, and the band's tunnel evidence is all
  sting-supported. Every set below lies inside it.
- _The sets now used: every body-alone base pressure read twice inside
  the domain, each paired reading, against both curves as 0008 forms the
  band_ (`BODY_ALONE_IN_DOMAIN`); the sets opened there and read once are
  named below and set nothing:
  - TN 2360's body alone (TN 3819's ref. 26: a 10-calibre-radius tangent
    ogive on a 1.250 in cylinder, turbulent, sting d/h 0.4 four diameters
    long, Ames 1 by 3 ft tunnel, R 4.5e6) at M 1.5 and 2.0: TN 3819 fig. 33
    at t/c 0 (W1's first reading, -0.1948 and -0.1507; round 6's, -0.1947
    and -0.1505) and fig. 35's no-fin tunnel symbol (0008's first reading,
    -0.194 and -0.150; round 3's, -0.1941 and -0.150; round 6's, -0.194 and
    -0.1502). Over the curves 1.003 to 1.124.
  - The Langley 9 in tunnel's body alone at M 2.41, the same figures (fig.
    33: -0.1219, -0.1213; fig. 35: -0.120, -0.1202, -0.1202): 0.964 to
    1.001.
  - RM L52J21a figs. 31 to 33 panel (d): the unfinned bodies with
    cylindrical bases, sting-supported, conical, ogive and radome noses at
    M 1.62, 1.93 and 2.41, every symbol both W1's first reading and round
    7's found at R 7.0e6 to 9.1e6: the 10 pairs within W1's window of 0.6e6
    about R 8.06e6 (`L52J21A_FIG31_33D`) and the 14 outside it
    (`L52J21A_FIG31_33D_OTHER_R`; the second addendum below), 48 values:
    0.773 to 1.024. The
    radome nose at M 1.62 (-0.1338, first; -0.1331, round 7) sets the low
    end: round 7's value over the more negative curve, 0.7731 (0.7959
    over the served curve alone).
  - TR 1051 fig. 23(b), as first entered (superseded by the third
    addendum below, which takes the thinnest measured symbol at each Mach
    number): the faired curves read at d/h 0.35 (base_sources.md
    section 2: the first reading, revised, and the round-1 audit's, which
    had seen the draft's values, so independent but not blind): -0.174 and
    -0.176 at M 1.5, -0.141 and -0.147 at 2.0, -0.115 and -0.118 at 2.9.
    Over the curves 0.943 to 1.178; the audit's value at M 2.9 set the
    high end. TR 1051's model description was read for this entry (PDF
    pp. 12 and 21, its text and fig. 23(b)'s legend; SHA-256 of the copy
    `7f1ef2fe...b5d4`): every body a cone-cylinder (10 deg semiangle) or an
    ogive-cylinder (10-calibre ogival radius); the turbulent data on "the
    same models with artificial roughness added in the form of a narrow
    transition strip", which "may not bring about complete transition
    ahead of the base at Reynolds numbers less than about 2 million"; a
    rear sting more than 4 base diameters long; fig. 23(b)'s legend gives
    R 4.0e6 and L/h 7.0 at M 1.5, 4.0e6 and 5.0 at 2.0, 7.5e6 and 5.0 at
    2.9. Inside the domain by every stated limit, so used. Artificial
    transition raises the base pressure 5 to 10% (TN 3819 p. 15; 0008
    section 3.2), toward less base drag, so it does not explain a point
    above the curve. Thicker stings of the same figure (to d/h 0.85, 1.31
    to 1.43 times the curve) measure the sting effect itself, which 0008
    section 3.3 lists apart and which no served rocket has; they are not
    used.
- _Opened in the domain and read once, so checked and not used to set
  the band_ (against both curves, as the sets above; first stated against
  the served curve only, corrected by the second addendum below): TN 2360
  figs. 5 and 7 (the same body, round 6 only: fig. 5 1.100 to 1.133 at M
  1.5 over R 1.95e6 to 4.42e6 and 1.144 to 1.172 at R 0.76e6 on a partly
  hidden symbol, 0.987 to 1.044 at M 2.0; fig. 7's two symbols 1.007 to
  1.123; rule 5 of 10.1 asks two readings); fig. 7's faired average of TN
  2360's refs. 1 to 3 (a compilation, read once, 0.983 to 1.085 at M 1.5
  to 3.0); NSWCDD/TR-92/509's configuration 1 (one transcription,
  strut-supported: 0.886 to 0.954, 0.842 to 1.001 with its +-5%); RM
  L52J21a's round 7 second square outline at M 1.93, R 7.33e6 (-0.1494,
  1.003 against the served curve, 0.969 against the other). Every one lies
  inside 0.77 to 1.18; against 0.77 to 1.13, TN 2360 fig. 5's body alone
  at M 1.5 does not (the third addendum below). (Since 2026-10-28, round
  20: TN 2360 figs. 5 and 7's body alone is read twice blind and enters
  the band, and the round 6 values here are superseded; fig. 7's average
  of refs. 1 to 3 is an average, not data, and is no longer checked: the
  fourth addendum, applied below.)
- _The band._ With fig. 18's tunnel symbols (0.856 to 1.078) and Herrin
  and Dutton (0.824 to 0.885) the envelope is 0.7731 to 1.1782, rounded
  outward as 0008 rounds it: 0.77 to 1.18 (0.7731 to 1.1253 and 0.77 to
  1.13 since the third addendum below; 0.7731 to 1.1691 and 0.77 to 1.17
  since round 20). TN 2360's body alone by itself
  would give 1.13 at the high end. Every reading named above lies inside
  the band `bodyBaseDrag` serves (`compiled-curve.test.ts`); on the code
  before this entry the tests failed at TN 2360's M 1.5 point (0.1948
  above the band's 0.1872), RM L52J21a's radome nose at M 1.62 (0.1338
  below 0.1371) and TR 1051 at M 2.9 (0.115 above 0.1085).
- _Below Mach 1.5_ (W2, 0015 section 11.1): the low end is this band's
  carried down, 0.77 (0.82 before), and the nominal is the band's
  midpoint, 1.04 (1.065 before), both by 0015's own rules; the high end,
  1.31, is unchanged. No total is served below Mach 1.5.
- _What was known when the band was widened._ Every value above was known:
  TN 2360's and RM L52J21a's were read for W1 (0015 section 7), TR 1051's
  for 0008's sting effect, and the review found the miss. No figure was
  named before it was used, as 10.1 rule 2 asks; TR 1051 fig. 23(b) is
  named here for the first time as band-setting. This is acceptable here
  because the rule that takes these values is 0008 section 3.3's, written
  before any of them was opened for this purpose and applying to them as
  it stood; because the change only widens (no band end moves inward,
  nothing is retuned, the served value from Mach 1.5, the curve itself,
  is unchanged); and because no held-back value was opened, used or
  looked at to make it.
- _The hold-outs that used this band._ The DREV gate (0010 sections 4.2
  and 11.6) and BRL 934's range A (0020) formed their tolerances with
  0.82 to 1.08. This widens a band after both hold-outs were used. It
  moves no modelled total and no residual, only the tolerances' ends,
  each by the change in the body base's band end over the modelled total;
  their records keep the values of the runs, and
  `basic-finner.test.ts`, `hold-out-run.test.ts`, `brl934-range-a.test.ts`
  and the page's tests check the widening against them exactly. The DREV
  gate's tolerances go from -20.0% to -27.0% and +23.3% to +28.6% to
  -21.5% to -28.5% and +26.8% to +31.6% (its model-form band from about
  -13% and +19% to about -15% and +22%); BRL 934's range A's from -24.8%
  to -27.1% and +27.0% to +28.0% to -26.5% to -29.0% and +30.7% to
  +31.4%. (With 0.77 to 1.13, the third addendum below: the DREV gate's
  -21.5% to -28.5% and +25.1% to +30.1%, BRL 934's -26.5% to -29.0% and
  +28.9% to +29.7%. With 0.77 to 1.17, since round 20: +26.5% to +31.3%
  and +30.4% to +31.0%.) No verdict changes: the DREV gate's eleven shots were inside and
  stay inside; BRL 934's range A still passes at all seven rounds of the
  present model and is still refused at all ten for the rebuilt factor. A
  wider tolerance can only keep a pass a pass, so the pass says less than
  it did: the page's validated claim and the two published tables say so
  beside the run's values, which they keep.
- _The population_ (`docs/research/refusals`, on main's audit at
  5921198, which counts the Von Karman noses the page serves): served
  totals are unchanged, 181 of 8000 cases before and after (68 at Mach 1.5
  to 1.8, 113 at 1.8 to 3.0; `out/2026-10-27-base-band-before/` and
  `out/impact.out`); on the audit before 5921198 also unchanged, 153. The
  band refuses nothing.

**2026-10-27 (ah), addendum: TR 1051 enters at its thinnest measured
symbol** (the coordinator's ruling of 2026-10-27, after the independent
review of 5921198..6f44814, which did not pass). Written before any new
reading of TR 1051 fig. 23(b) is used, and before the band is changed for
it.

- _What the review found._ In fig. 23(b) the first measured symbols at
  Mach 2.0 and 2.9 lie at d/h 0.30; the faired curves start at 0.27 and
  0.26. Only at Mach 1.5 is the first symbol at d/h 0.35. So the values
  (ah) used at Mach 2.0 and 2.9, both readings at d/h 0.35, are readings
  of the fairing, not of the thinnest measured sting, and the band's high
  end, 1.1782, rests on the audit's faired -0.118 at Mach 2.9.
- _The ruling._ (ah)'s criterion, the thinnest sting, stands as written,
  applied to measured symbols: a fairing is not data, here as everywhere
  else in the band.
- _How TR 1051 enters._ At each Mach number, at its thinnest measured
  sting symbol, read twice blind (round 19: two fresh blind readers of
  every symbol in fig. 23(b), started by the coordinator) and paired by a
  neutral party. It enters as the envelope of the paired readings, against
  both curves, rounded outward with the other sets.
- _Where a symbol cannot be paired._ If the thinnest symbol at a Mach
  number cannot be paired, the present faired d/h 0.35 values stay for
  that Mach number, labelled as faired values: undecidable, so the wider
  choice.
- _Until the pairing._ The band stays 0.77 to 1.18, its high end on the
  faired values, and is not changed for TR 1051 until the paired readings
  are sent by the coordinator. (They were; the band was 0.77 to 1.13 from
  the third addendum below, and is 0.77 to 1.17 since round 20.)
- _Disclosed._ The reviewer scanned the figure (about -0.113 at d/h 0.30,
  Mach 2.9), and the coordinator saw that value before this addendum. The
  implementer of (ah) viewed fig. 23(b) at page resolution on 2026-10-27
  to read its legend for (ah) and took no value from its symbols.

**2026-10-27 (ah), second addendum: the review's other findings**
(the independent review of 5921198..6f44814; the coordinator's rulings of
2026-10-27). None of these moves the band.

- _RM L52J21a, completeness._ (ah) took only the symbols of figs. 31 to
  33 (d) within 0.6e6 of R 8.06e6. That window is W1's rule for pairing
  the finned and unfinned bodies (0015 section 3.5), not a limit of the
  compiled curve's domain. The 14 pairs outside it, at R 7.0e6 to 7.5e6
  and 8.7e6 to 9.1e6, each within its combined reading error
  (`w1_round7_pairing_output.txt`), now enter
  (`L52J21A_FIG31_33D_OTHER_R`; W1's zero member is unchanged). They span
  0.7766 to 1.0241 against both curves; the set's range becomes 0.7731 to
  1.0241, and the band stays 0.77 to 1.18 (0.77 to 1.13 since the third
  addendum below, 0.77 to 1.17 since round 20; each moves the high end
  only). Round 7's second square at M
  1.93, R 7.33e6, read once, stays out; so does the first reading's
  "radome" at M 2.41, R 7.54e6, which round 7 shows to be the conical
  square paired at R 7.52e6.
- _Wording._ (ah) said the band takes "every body-alone base pressure
  opened" in the domain. What is true: every one read twice there; the
  sets opened there and read once are named in the entry and set nothing.
  The label, 0010 section 1.2, `compiled-curve.ts` and this entry now say
  so.
- _The checked sets' ranges_ were stated against the served curve only;
  they are now against both curves, as the band is formed (above).
- _The served value_ is unchanged from Mach 1.5 (the curve itself).
  Below Mach 1.5 W2's nominal, the band's midpoint, goes from 1.065 to
  1.04 (0015 section 11.1), so the body base served there falls 2.3%; no
  total is served there.
- _Labels._ W2's label now says its low end is the band of Mach 1.5 to
  3.0 carried down, set by a sting-supported tunnel body with a radome
  nose at Mach 1.62. A test pins the body base's band text the page shows
  (`total-drag-display.test.ts`).
- _Stale numbers._ Statements of 1.065 and of W2's old values in 0015
  sections 3.6, 5, 10 and 11.2, and of 0.82 to 1.08 in 0008 section 6.2's
  table, now carry a dated note giving the new values.

**2026-10-28 (ah), third addendum: TR 1051 at its thinnest measured
symbols, from round 19** (the coordinator's instructions of 2026-10-28,
after round 19's pairing; the first addendum's rule applied). The band
becomes **0.77 to 1.13** at Mach 1.5 to 3.0. (0.77 to 1.17 since round
20, the fourth addendum applied below; the numbers in this addendum are
those of 0.77 to 1.13, and its finding on TN 2360 fig. 5(a) is settled
there.)

- _Round 19._ Two fresh blind readers read every symbol of TR 1051 fig.
  23(b), and a neutral party paired them: 15 matched pairs, every one
  within the summed stated errors on both d/h and P_B, none unpaired. The
  readers' CSVs and methods, the brief, the pairing script, its CSV and
  report, and the coordinator's hash files are committed verbatim in
  `docs/research/total-drag/audit/round19/` (the readers' working images,
  117 files and 93 MB, and their binary arrays are left out). The
  committed files' SHA-256 match the hash files exactly (`A.sha256`,
  `B.sha256`, `pairing/sha256.txt`):

  | File                   | SHA-256                                                            |
  | ---------------------- | ------------------------------------------------------------------ |
  | `A/f23b.csv`           | `32ee1fcf39dcaf2d0afcfa9123230b45ec6b824b223c64940bf7f5770b2bff89` |
  | `A/method.md`          | `1e2ee051bb591250ababdbf1108cdd6fb89d54f34e4e7d3430fb1c31f56afe58` |
  | `B/f23b.csv`           | `86bb7d8c0d78b820438098d0d048aa6853eee3139144f2a74de2ccdedfe9c724` |
  | `B/method.md`          | `20c62a4c132ff31e1a514543fc4fd6e2591e3c0c114b54377a1a7bb99a563b22` |
  | `pairing/pair_f23b.py` | `673c1f0e13060b0811a4733d29edadebe49a19de7d5983b6c4bdc38ca9a4e8d7` |
  | `pairing/pairing.csv`  | `2fcfd35194f361a2d9cfab48f92a79064ff344f1f3e3ad7e21dbac3f5d1c570b` |
  | `pairing/pairing.txt`  | `7433f22712056f2eb5bcac5e0a25b60fa4f928b7bdbc9799b79ee5b1a152355a` |

  Both readers worked from the PDF whose SHA-256 (`7f1ef2fe...b5d4`) is
  the copy (ah) read for the legend.

- _What the agreement tests (noted 2026-10-28, after the re-review of
  6f44814..cbb42b2)._ As with round 20, the readers agree to within
  0.0001 in P_B at the three symbols used (within 0.0002 at all 15), so
  their agreement mostly tests their calibrations, not two independent
  placements of each symbol. The reviewer's independent scan confirms
  the first measured symbol at Mach 2.9 at d/h 0.30.

- _TR 1051 enters at these three symbols only_, the thinnest measured
  sting at each Mach number, as the plain envelope of the paired readings,
  both readings' values, not widened by reading errors
  (`TR1051_FIG23B_THINNEST`):

  | M   | d/h (A, B)    | P_B A (err)      | P_B B (err)      | over the more negative curve | over the served curve |
  | --- | ------------- | ---------------- | ---------------- | ---------------------------- | --------------------- |
  | 1.5 | 0.3467, 0.347 | -0.1722 (0.0003) | -0.1723 (0.0005) | 0.9701, 0.9707               | 0.9937, 0.9942        |
  | 2.0 | 0.2977, 0.298 | -0.1380 (0.0005) | -0.1379 (0.0008) | 0.9225, 0.9218               | 0.9537, 0.9530        |
  | 2.9 | 0.2961, 0.296 | -0.1126 (0.0003) | -0.1127 (0.0005) | 1.1077, 1.1087               | 1.1243, 1.1253        |

  The set spans 0.9218 (reader B at M 2.0 over the more negative curve)
  to 1.1253 (reader B at M 2.9 over the served curve). Every one of the
  three is AGREES in the pairing; the thicker stings of the figure are
  not used, as before.

- _The band, each set's minimum and maximum against both curves:_ TN
  2360's body alone 1.0027 to 1.1241; the Langley 9 in tunnel's 0.9639 to
  1.0006; RM L52J21a 0.7731 to 1.0241; TR 1051 0.9218 to 1.1253; fig.
  18's tunnel symbols 0.8563 to 1.0783; Herrin and Dutton 0.8237 to
  0.8849. Envelope 0.7731 (RM L52J21a's radome nose at M 1.62, round 7,
  over the more negative curve) to 1.1253 (TR 1051 at M 2.9, round 19's
  reader B, over the served curve); rounded outward, **0.77 to 1.13**.
  The low end does not move, so W2's band below Mach 1.5 (0.77 to 1.31)
  and its nominal (1.04) do not move either (0015 section 11.1).
- _Superseded, kept as the record_ (`TR1051_FIG23B_FAIRED_SUPERSEDED`):
  the faired d/h 0.35 values (ah) first used, -0.174 and -0.176 at M 1.5,
  -0.141 and -0.147 at 2.0, -0.115 and -0.118 at 2.9, 0.9425 to 1.1782
  against both curves. They set nothing; the tests hold TR 1051's band
  data to the pairing, so none of them can come back unnoticed.
- _Information only, not used:_ the pairer's widened envelope (each end
  widened by its own reader's stated error) is -0.1728 to -0.1719 at M
  1.5, -0.1385 to -0.1371 at 2.0 and -0.1132 to -0.1123 at 2.9. Over the
  curves it would span 0.9164 to 1.1303, which rounded outward would put
  the high end at 1.14; 0008's band is formed from the readings, not
  widened by their errors, so it is not.
- _The earlier readings at Mach 1.5 were not blind and differ._ At M 1.5
  the symbol is at d/h 0.347, so the values first used there, -0.174
  (0008's first reader) and -0.176 (the round-1 audit), are readings of
  the same symbol. They lie 0.0017 to 0.0038 more negative than the blind
  pair, beyond round 19's summed errors (0.0008). Other sets in the band
  that came from the same readers: fig. 18's twelve tunnel symbols (the
  first reading and the round-1 audit's, `TN3819_FIG18_TUNNEL`; they have
  no blind reading), the curve table itself (the round-1 audit's), fig.
  35's no-fin tunnel symbol in TN 2360's set (0008's first reading) and
  Herrin and Dutton (0008's reading of Tucker's slides). What it bears on:
  the tunnel symbols' values, which rest on these two readings alone.
  Shifted by 0.004 in P_B either way, they span 0.8338 to 1.0329 or
  0.8789 to 1.1237 over the curves (0.8563 to 1.0783 as read); neither
  end of the band (0.7731, 1.1253) moves. Herrin and Dutton, shifted the
  same way, span 0.791 to 0.918 (0.8237 to 0.8849 as read): no end moves.
  The curve table was read again blind in round 7 and agrees within the
  combined errors at M 1.5, 2.0, 2.5 and 3.0 (its one misread, at M 1.4,
  below the band's range, was replaced then). Fig. 35's no-fin symbol
  agrees with rounds 3's and 6's readings within 0.0002 at M 1.5 and 2.0;
  by itself it is 1.1194 at M 1.5, and the set's high end, 1.1241, is W1's
  reading of fig. 33. The same first reading and
  audit also give 0008 section 3.2's sting-effect sizes (0.064, 0.049 and
  0.027 from d/h 0.35 to 0.85); round 19's symbols give 0.058 at M 1.5
  (d/h 0.347 to 0.897), 0.054 at 2.0 (0.298 to 0.898) and 0.030 at 2.9
  (0.296 to 0.900). Those set no band and no code uses them; recorded,
  not changed.
- _Checked and not used, against the new band:_ TN 2360 fig. 5(a)'s body
  alone at M 1.5 (round 6, read once) now lies above it: -0.1964 at R
  1.95e6 and at 4.42e6, 1.1333 over the served curve (the served band's
  end at M 1.5 is 0.1958 in -P_B; 0.0006 above it, against a reading
  error of 0.0002), and -0.2031 at R 0.76e6 on a partly hidden symbol,
  1.1720 (error 0.003). With 0.77 to 1.18 they lay inside. By 10.1 rule 5
  a value read once sets nothing, so they do not move the band; whether
  fig. 5(a) is read a second time, blind, is the coordinator's to rule.
  Every other set checked and not used still lies inside: fig. 5 at M 2.0
  (0.987 to 1.044), fig. 7's two symbols (1.007 to 1.123), fig. 7's
  compilation (0.983 to 1.085), NSWCDD/TR-92/509 (0.842 to 1.001 with its
  +-5%) and round 7's second square (0.969 to 1.003).
- _What moves._ Only the band's high end, from 1.18 to 1.13: the body
  base's band from Mach 1.5 is narrower than (ah) first made it and still
  wider than 0.82 to 1.08. The served value does not move. The label,
  the page's band text, `bodyBaseDrag`, W2 from Mach 1.5 (0015 section
  11.2's steps: the wedges' high ends 0.2812 at M 1.5, 0.2779 at 1.6,
  0.2746 and 0.2757 at 1.62), the vacuum fractions (0.9199 at M 3.0 with
  fins at the base, 0.686 without) and the records follow. Every reading
  in `BODY_ALONE_IN_DOMAIN` lies inside the served band
  (`compiled-curve.test.ts`).
- _The hold-outs._ The DREV gate's tolerances with this band are -21.5%
  to -28.5% and +25.1% to +30.1% (+21.0% to +24.7% without the wall),
  its model-form band -13.9% to -15.4% and +19.8% to +20.7%; BRL 934's
  range A's -26.5% to -29.0% and +28.9% to +29.7%. The records keep the
  runs' values; no total, residual or verdict changes: the DREV gate's
  eleven shots are inside, BRL 934's range A passes at all seven rounds
  for the present model and is refused at all ten for the rebuilt factor.
  The page's validated claim and both published tables' captions state
  these tolerances, and a test now computes them from the library and
  holds the words to them.
- _Checks_ (`docs/research/base-and-total/runs/2026-10-27-ah-checks.out`,
  its 2026-10-28 section): every error planted before, and five new ones
  (the faired value back for the M 2.9 symbol, TR 1051 widened by its
  reading error, the claim's and both captions' tolerances left at 1.18's),
  is caught. The refusal population (`docs/research/refusals`) is
  unchanged, as the band refuses nothing (`out/impact.out`).
- _Merged with (ad) (A5, main at f88ecbe, 2026-10-28)._ (ad) and 0015
  sections 3.3 and 3.6 state factors on W2's term with its nominal 1.065
  and bands from 0.82 to 1.08; on the merged code they are 1.04 and 0.77
  to 1.13, and dated notes beside them give the merged values
  (`base-w2.test.ts` holds them). One thing for the coordinator: (ad)
  withdrew the plain curve a chord ahead because its band missed TN
  2360's measurement there (the reviewer's case at M 2.0: band 0.1187 to
  0.1563, measured 0.1603, at least 1.09 times the curve). With 0.77 to
  1.13 that band would be 0.1114 to 0.1635, which holds the measurement.
  Nothing is changed for it: A5's routing stands as merged, and
  `fins-on-base-routing.test.ts` holds both numbers. (Ruled 2026-10-28:
  the withdrawal stands on section 10.2; the note at the end of (ad)'s
  entry of 2026-10-27.)
- _Every TN 2360 base pressure against the band served_ (the review's
  comparison, made permanent after the merge: `tn2360-served.test.ts`).
  Each reading the library holds, at its own geometry (four or two
  rectangular circular-arc fins, root chord 1.5 body diameters, the
  trailing edge 0 to 1 chord ahead; fig. 6's increments on each of the
  five body-alone readings), as read: 424 values at Mach 1.5 and 2.0,
  none outside and none refused. The closest is the body alone at M 1.5,
  0.1948 against the band's 0.1958 (0.6% of the term); before A5, the 30
  readings at x/c 1.0 lay outside the plain curve's band. Errors planted
  in the code are caught (the band's high end left at 1.08: 173 outside;
  a trailing edge exactly a chord ahead refused); a misread of the data
  themselves moves the bands built on them and is caught by the tests
  that hold those data, not by this one.

**2026-10-28 (ah), fourth addendum: TN 2360 figs. 5 and 7 read twice
blind (round 20), and how they enter** (the coordinator's ruling of
2026-10-28 on the third addendum's finding). Written before any round 20
value is used or seen, and before the band is changed for it.

- _The ruling._ A body-alone value inside the domain that lies above the
  band served cannot stay out because it was read once. TN 2360 figs. 5
  and 7 are read again, every symbol of every panel, by two fresh blind
  readers (round 20, started by the coordinator), and the readings are
  paired by a neutral party.
- _What enters._ Paired symbols of figs. 5 and 7 inside the compiled
  curve's domain, as 0008 section 3.3 stated it before this addendum,
  enter the band as every other set does: the plain envelope of the
  paired readings (both readers' values, not widened by their errors),
  against both curves, rounded outward with the other sets. Inside the
  domain means the body alone ("tail off" in fig. 5, "without tail" in
  fig. 7) at Mach 1.5 or 2.0, at a Reynolds number judged inside below.
  The symbols with a tail (fig. 5's x/c -1.0 to 1.0, fig. 7's cruciform
  tail at x/c 0) have fins at, near or behind the base, outside this
  domain; this addendum decides nothing about them for the fins-on-base
  factors.
- _Not data._ Fig. 5's faired lines, and fig. 7's dashed curve of ref. 4
  and solid average of refs. 1 to 3, are fairings and averages, not
  measurements. They are not used, as nowhere else in the band.
- _A partly hidden or ambiguous symbol_ keeps every reading either reader
  gives. If it pairs on any of its readings, the envelope over all its
  readings enters.
- _A symbol that cannot be paired_ stays checked and not used, and is
  recorded with both readings.
- _The Reynolds numbers, judged now, by the domain as stated._ 0008
  section 3.3 states no Reynolds number limit; it requires a turbulent
  layer at the base. TN 2360's own text says where its body had one. Its
  models carried a 1/4 in salt band on the nose "to insure local
  transition to a turbulent boundary layer", at R 0.5e6 to 4.5e6 on the
  body length (p. 5). On p. 8: "with roughness added to the body near the
  nose to achieve this condition [a fully developed turbulent boundary
  layer] the base-pressure coefficient was essentially independent of
  Reynolds number above about 2 million for the body alone and in
  combination with the tail surfaces"; its runs with a smooth nose showed
  a laminar layer, the base pressure falling as R rose (fig. 5 is
  captioned "roughness added to body"). Its conclusion 3 puts the tails'
  increment as independent of R "from a value of 2 million to 6 million".
  On p. 8 it compares fig. 7's body alone with previous results "obtained
  at Reynolds numbers from about 2 to 16 million", and on p. 11 finds them
  in essential agreement. So, for every Reynolds number the record lists
  for these figures (round 6's readings, `audit/round6/readings/`, and the
  third addendum), on the body length:

  | Figure | M        | Stations as the record lists them                       | Judged                                                                                                                                  |
  | ------ | -------- | ------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
  | 5(a)   | 1.5      | the lowest, about 0.56e6 to 0.80e6 (tail off at 0.76e6) | outside: below about 2 million TN 2360 does not show the layer at the base turbulent                                                    |
  | 5(a)   | 1.5      | 1.95e6, 3.26e6, 4.42e6                                  | inside: the station at about 2 million is the first of the range the source calls independent of R                                      |
  | 5(b)   | 2.0      | the lowest, about 0.48e6 to 0.65e6 (tail off at 0.48e6) | outside, as at M 1.5                                                                                                                    |
  | 5(b)   | 2.0      | 1.85e6, 3.31e6, 4.42e6                                  | inside, as at M 1.5                                                                                                                     |
  | 7      | 1.5, 2.0 | none listed                                             | inside: no R is listed, and TN 2360 offers these as turbulent results; with no limit stated, the wider choice, as in the first addendum |

  No station lies between about 0.8e6 and 1.8e6: a symbol round 20 places
  below 1.0e6 belongs to the lowest station and is outside; one above it
  belongs to the second station (about 1.8e6 to 1.95e6) or a higher one
  and is inside. The line is the source's, not the values'.

- _Disclosed._ Round 6's values for these figures are in the repository
  and known to the coordinator and to the implementer, as are the ratios
  the third addendum gives at M 1.5: 1.1333 (R 1.95e6 and 4.42e6) and
  1.1720 (R 0.76e6, the partly hidden symbol). The judgement above puts
  the symbol at R 0.76e6 outside, and so it matters: with round 6's
  values the stations judged inside would put the band's high end at
  1.14, and the lowest station would put it at 1.18. It rests on TN
  2360's text, quoted above, which the implementer read on 2026-10-28
  for this addendum (pp. 5 to 11, the conclusions and the figure
  captions; NTRS 19930083086, PDF SHA-256
  `95937173fa78bdd41e24a3caded6d06779df885263b66c23f13225a18d742a59`),
  taking no value from any figure, as TR 1051's text was read for (ah).
- _Until the pairing._ The band stays 0.77 to 1.13 and is not changed for
  figs. 5 and 7 until the coordinator sends the paired readings. The
  implementer does not open the readers' folder before then.

**2026-10-28 (ah), fourth addendum, corrected: every tripped station of
figs. 5 and 7 is inside** (the coordinator's correction, made before any
round 20 value is used; the addendum above is kept as written).

- _What was wrong._ 0008 section 3.3's domain requires a turbulent layer
  at the base and states no Reynolds number limit. TN 2360 p. 5 says the
  salt band was there "to insure local transition" on its runs at R 0.5e6
  to 4.5e6. Its p. 8, "essentially independent of Reynolds number above
  about 2 million", describes how P_B varies with R; it does not say the
  layer is laminar or transitional below that. Putting the lowest station
  outside added a limit the domain does not state, inferred with round
  6's values known, and it narrowed. A case the stated domain does not
  decide takes the wider choice.
- _Corrected._ Every tripped (salt-band) station of figs. 5 and 7 is
  inside the domain, the lowest included: fig. 5(a)'s at about 0.56e6 to
  0.80e6 (the tail-off symbol at 0.76e6) and fig. 5(b)'s at about 0.48e6
  to 0.65e6 (the tail-off symbol at 0.48e6), with every higher station
  and fig. 7's symbols. Only runs the source itself says had a laminar or
  transitional layer are outside: the smooth-nosed runs of p. 8, which
  fig. 5, captioned "roughness added to body", does not plot. The table's
  two "outside" rows and the line drawn at 1.0e6 no longer apply.
- _It widens._ With round 6's values the band's high end would go to
  about 1.18 (1.1720 at R 0.76e6, rounded outward), not 1.14.
- _Information only._ Whether the station at 1.85e6 to 1.95e6 is TN
  2360's "about 2 million" no longer decides anything, since every
  tripped station is inside.
- _Disclosed._ The correction was made by the coordinator with round 6's
  values known, before the pairing; the implementer records it as given.

**2026-10-28 (ah), a note on the correction: the evidence against it,
and a question for the owner** (the coordinator's, after the re-review of
6f44814..cbb42b2, which passed; recorded as given).

- _What the correction left out._ TN 2360 p. 8 describes the signature of
  transition: while the layer is laminar the base-pressure coefficient
  grows more negative as R rises, and transition brings a positive
  increment. Fig. 5(a)'s lowest station is the most negative point of its
  run, -0.2026 (round 20, R 0.765e6) against about -0.196 above 2 million
  (-0.1953 to -0.1968), which fits a station still in transition. TN
  2360's ref. 1 is Chapman's TN 2137, published as TR 1051, which says
  roughness "may not bring about complete transition ahead of the base at
  Reynolds numbers less than about 2 million".
- _So_ the source does not settle the layer's state at the lowest
  station. The ruling stays "undecided, take the wider choice", as in the
  first addendum, and the band's high end, 1.17, probably rests on a point
  whose layer was not fully turbulent. Without it the high end would be
  1.14 (fig. 5(a) at R 4.41e6, 1.1356).
- _Open question for the owner:_ whether TN 2360 fig. 5's lowest station
  (R about 0.48e6 to 0.80e6, tripped but below where its own text shows
  the base pressure independent of R) belongs in the compiled curve's
  domain. Until the owner decides, it is inside and the band is 0.77 to
  1.17.
- _Timing, disclosed (the re-review)._ Reader B's fig. 7 values in data
  units existed 3 s before the correction (4d7d5c9) was committed. Fig. 7
  lists no Reynolds number, so the correction does not bear on it: its
  two body-alone symbols were inside under the fourth addendum as first
  written too.

**2026-10-28 (ah), the fourth addendum applied: TN 2360 figs. 5 and 7
from round 20** (the coordinator's instructions of 2026-10-28, after
round 20's pairing; the fourth addendum and its correction, 4d7d5c9,
applied as registered). The band becomes **0.77 to 1.17** at Mach 1.5 to
3.0.

- _Round 20._ Two blind readers read every symbol of TN 2360 figs. 5
  and 7, all panels, from the PDF whose SHA-256 the fourth addendum
  records; a neutral party paired them. 60 of 60 symbols agree within
  the summed stated errors, the ten body-alone symbols among them, and
  testing every reader's alternatives changes no verdict. The readers'
  CSVs and methods, the brief, the pairing script, its CSV and report,
  and the hash files are committed verbatim in
  `docs/research/total-drag/audit/round20/` (no images, renders or
  working files). Each committed file hashes to the value its hash file
  gives:

  | File                   | SHA-256                                                            |
  | ---------------------- | ------------------------------------------------------------------ |
  | `A/f5f7.csv`           | `22d48e5592687e991c1d484bd1529088c30f7ef35910680699c23d8e2b86ea23` |
  | `A/method.md`          | `29cd3bc375572de7c648c5ffaed375c14c267b140309af204bd4a3a3e5311265` |
  | `B/f5f7.csv`           | `a426b5ff4c0c83d6c4c0da3aae3c72558dc3e80c04636f3446e4cd5a46741f75` |
  | `B/method.md`          | `6b579c3c84bd809edbb054e1ea208fc356d0dc2715181760c251cc47cf3c3df1` |
  | `pairing/pair_f5f7.py` | `78eb7754cbf7f98067ec533067cd667e18a82d98b37a0239452ca7027bee5292` |
  | `pairing/pairing.csv`  | `19abec8cbfca03187a0c873da240a95a4cf1fb00c95d3efacfc823e6b76f2b60` |
  | `pairing/pairing.txt`  | `9f9636a1e35012002101770fcf8b0848b0f46733a2571e12fd4c84b5296e2b64` |

- _What the agreement tests._ The pairer notes (relayed by the
  coordinator) that both readers took nearly the same pixel positions on
  the same scan, so their agreement mostly tests their calibrations, not
  two independent placements of each symbol.
- _What enters_, by the fourth addendum as corrected: all ten body-alone
  symbols, every station tripped, each as the plain envelope of every
  reading of both readers, against both curves (`TN2360_FIG5_FIG7_BODY_ALONE`):

  | Figure | M   | R (A)   | P_B, every reading | Over the more negative curve | Over the served curve |
  | ------ | --- | ------- | ------------------ | ---------------------------- | --------------------- |
  | 5(a)   | 1.5 | 0.765e6 | -0.2026 to -0.2018 | 1.1369 to 1.1414             | 1.1645 to 1.1691      |
  | 5(a)   | 1.5 | 1.954e6 | -0.1962 to -0.1961 | 1.1048 to 1.1054             | 1.1316 to 1.1321      |
  | 5(a)   | 1.5 | 3.263e6 | -0.1955 to -0.1953 | 1.1003 to 1.1014             | 1.1269 to 1.1281      |
  | 5(a)   | 1.5 | 4.414e6 | -0.1968 to -0.1966 | 1.1076 to 1.1087             | 1.1344 to 1.1356      |
  | 5(b)   | 2.0 | 0.475e6 | -0.1487 to -0.1486 | 0.9933 to 0.9940             | 1.0270 to 1.0276      |
  | 5(b)   | 2.0 | 1.832e6 | -0.1475 to -0.1473 | 0.9846 to 0.9860             | 1.0180 to 1.0194      |
  | 5(b)   | 2.0 | 3.308e6 | -0.1493 to -0.1492 | 0.9973 to 0.9980             | 1.0311 to 1.0318      |
  | 5(b)   | 2.0 | 4.431e6 | -0.1516 to -0.1512 | 1.0107 to 1.0134             | 1.0449 to 1.0477      |
  | 7      | 1.5 | none    | -0.1951 to -0.1949 | 1.0980 to 1.0992             | 1.1246 to 1.1258      |
  | 7      | 2.0 | none    | -0.1511 to -0.1508 | 1.0080 to 1.0100             | 1.0422 to 1.0442      |

  The symbol at R 0.765e6 is partly hidden; both readers give
  alternatives (A three readings, B two), and all five enter. TN 2360's
  set now spans 0.9846 (fig. 5(b) at R 1.83e6, reader B's -0.1473, over
  the more negative curve) to 1.1691 (fig. 5(a) at R 0.765e6, reader B's
  -0.2026, over the served curve); 1.0027 to 1.1241 with TN 3819 figs. 33
  and 35 alone.

- _The band, each set's minimum and maximum against both curves:_ TN
  2360's body alone 0.9846 to 1.1691; the Langley 9 in tunnel's 0.9639 to
  1.0006; RM L52J21a 0.7731 to 1.0241; TR 1051 0.9218 to 1.1253; fig.
  18's tunnel symbols 0.8563 to 1.0783; Herrin and Dutton 0.8237 to
  0.8849. Envelope 0.7731 (RM L52J21a's radome nose at M 1.62) to 1.1691
  (TN 2360 fig. 5(a) at R 0.765e6); rounded outward, **0.77 to 1.17**.
  Without the lowest station, which the correction of the fourth
  addendum put inside, the high end would be 1.1356 (fig. 5(a) at R
  4.41e6) and the band 0.77 to 1.14. The low end does not move, so W2's
  band below Mach 1.5 (0.77 to 1.31) and its nominal (1.04) do not move.
- _Superseded, kept as the record_ (`TN2360_FIG5_FIG7_ROUND6_SUPERSEDED`):
  round 6's single readings of the same ten symbols, which (ah) listed as
  checked and not used, 0.9873 to 1.1720 against both curves. They set
  nothing. Round 20 reads the partly hidden symbol at R 0.765e6 at -0.2018
  to -0.2026, where round 6 read -0.2031 (error 0.003). Fig. 7's average of
  refs. 1 to 3 is an average, not data, and is no longer checked.
- _What moves._ Only the band's high end, from 1.13 to 1.17. The served
  value does not move. The label, the page's band text, `bodyBaseDrag`
  (at M 1.5 without fins: 0.1733, band 0.1334 to 0.2028), 0015 section
  11.2's steps (the wedges' high ends 0.2892 at M 1.5,
  0.2857 at 1.6, 0.2824 and 0.2838 at 1.62), 0015 section 3.3's steps at
  M 1.5 with fins ahead (high ends 0.2082, 0.2804 and 0.2271), the vacuum fractions
  (0.9486 at M 3.0 with fins at the base, 0.711 without) and the records
  follow. With 1.17 the plain curve's band a chord ahead at M 2.0 would
  be 0.1114 to 0.1693; the withdrawal stands on section 10.2 (the note to
  (ad)).
- _The hold-outs._ The DREV gate's tolerances with this band are -21.5%
  to -28.5% and +26.5% to +31.3% (+22.2% to +25.9% without the wall), its
  model-form band -13.9% to -15.4% and +21.0% to +22.2%; BRL 934's range
  A's -26.5% to -29.0% and +30.4% to +31.0%. The records keep the runs'
  values; no total, residual or verdict changes: the DREV gate's eleven
  shots are inside, BRL 934's range A passes at all seven rounds for the
  present model and is refused at all ten for the rebuilt factor. The
  page: the gate's shot DA95021308 0.5940 (0.5052 to 0.7234, -15.0% to
  +21.8%); BRL 934's round at M 2.423 0.4314 (0.3652 to 0.5320, -15.4%
  to +23.4%).
- _Every TN 2360 base pressure against the band served_
  (`tn2360-served.test.ts`), now with figs. 5 and 7's 23 readings: 447
  values, none outside and none refused. The closest is the one that
  sets the band's end: fig. 5(a) at R 0.765e6, reader B's 0.2026 against
  0.2028.
- _Merged with B1 (main at cdd26e6, 2026-10-28)._ 0019 section 3.4.1's
  F4 widens the trailing edges' band at the DREV gate's Mach 1.799 shot,
  also after the gate was used. With both widenings the gate's model-form
  band is -13.9% to -15.6% and +21.0% to +22.2% (-15.4% without F4), and
  its tolerances stay -21.5% to -28.5% and +26.5% to +31.3% (+22.2% to
  +25.9% without the wall) at one decimal; recomputed by running
  (`basic-finner.test.ts`, `hold-out-run.test.ts`). The gate table's
  caption names both widenings.

Letters are allocated by the coordinator (the registry in the
coordinator's letters file); the next free letter is the coordinator's to
allocate. _(Corrected 2026-10-28, the re-review's R4: this branch's
text here said (w) to (ac) were allocated on other branches; (ac) is this
branch's F4 entry, above, and on merging main at 3e026a8 main's sentence
replaces that one.)_
