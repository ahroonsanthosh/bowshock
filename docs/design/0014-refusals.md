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

**2026-10-24 (w): measured nose pressures, named for the nose's
model-form allowance before they are read** (rule 2 of 10.1; design
record 0022 as adopted at commit 305557f; the advisor's report of
2026-10-22, section 6 item 4; the owner's choice of 0022's Route 1). The
nose's band (0006) is the numerical error of the inviscid solve. An
allowance "inviscid model against measured pressures" is formed per nose
family and Mach number by 0022 sections 4.3 and 4.4, fixed and reviewed
before any value below is read. It is symmetric about the served value
(one body per box cannot show the error's direction; a one-sided band or
a sign per family only by a later dated entry, before any reading, for a
family with several bodies in one box), half-width a times the nose
term, a the largest |r| + u of every measured case whose box (+-0.05
Mach, +-0.25 calibers; the union of boxes, not their hull) contains the
case; it enters the total's model-form band linearly, as its own line,
beside the numerical band. Outside every box the nose is labelled
"numerical error of the inviscid solve; the model's own error is not in
this band".

1. _Band-setting, no value recorded:_ NACA TR 1386 (Perkins, Jorgensen
   and Sommer, 1958; NTRS 19930091022), its zero-incidence pressure
   distributions and foredrags of blunted cones and Karman ogives, the
   figures and tables named by a later dated entry when it is opened to
   see what it covers, before any value is read (not read before); NACA
   RM E52C10 (Jack and Gould), its zero-incidence plotted pressures on
   the five cone-cylinders at Mach 3.12, the figure named likewise
   (opened by the first session; whether its plots were looked at for values is not
   recorded, so it is disclosed as possibly seen); NASA TN D-3516
   (Czarnecki and Monta), fig. 5 and table II, the smooth model at Mach
   1.1 and 1.2, used only once the nose is served there (fig. 5 was read
   for the transonic work and its stagnation pressures' scatter, about
   0.005 in Cp, noted; no value recorded or compared with the model).
   This widens 10.1's "a check of the nose solve" for TR 1386 to
   band-setting for this allowance only.
2. _Each is read twice_, the second reading blind, paired by a neutral
   party; ambiguous cells keep every reading; the envelope, never
   resolved toward the narrower.
3. _Seen before this entry, widening only:_ NACA TN 3716 (table I(a) and
   fig. 3, zero incidence; typed once 2026-10-15, integrated once
   2026-10-17; every value public in the repository), NACA RM A53E01
   (table II(a), zero incidence; read once 2026-10-17) and NACA TN 4233
   (tables I(a) and (b); typed and compared in 0013). Registered after
   they were seen, as (g) records NSWCDD/TR-92/509. Each is read again
   twice, the second blind, by readers who work from the source file
   alone, without this repository, and whose briefs name no earlier
   value. The result may only widen the allowance of its box. It is never
   a test or a validation, and no claim rests on it as one. Where a box
   rests only on these sets the label says "formed from data seen before
   registration". This departs from (r)'s "not a band's end, not an
   allowance" for these sets only, because their use can only widen.
4. _The floor, a lower limit only:_ in TN 3716's box the half-width is
   never below 14.4% (published 0.1068 to 0.1080 against 0.09880, plus
   0.005 / 0.09880), and in RM A53E01's never below 16.1% (0.0298
   against 0.03074, plus 0.004 / 0.03074). Fresh readings enter under
   0022 section 4.3 beside the floor and can raise the half-width; they
   never replace or lower it. TN 4233 has no published integrated
   figure; its existing typing is carried in the envelope and does the
   floor's job. In TN 3716 the shoulder cell (x/d 2.95) counts as
   ambiguous, its first typing's -0.038 (5fcc92b) kept beside -0.036.
5. _Fixed first:_ the quantity, the integration script, the coverage
   threshold (a tenth of the drag outside the orifices, with its own
   term below that), the boxes and the sign rule are committed and
   reviewed before any reading reaches them. The script's first run is
   on the existing TN 3716 typing and is recorded as a run on seen data.
6. _Not settled here:_ NACA RM E51H17 (fig. 4(a); one value digitised
   and seen). Whether it sets anything is the owner's open question,
   decided by a later dated entry before it is read again.
7. _Never used:_ every held-back set of 10.1, the PARD standard body's
   fore drag (RM L52E06 figs. 9 to 12) included.
8. _Not changed:_ the nose's numerical band and its floor (0006), every
   other component's band, and every registered test.

_Added 2026-10-24 to (w): the owner settled its item 6._ NACA RM E51H17
counts like the other seen sets of item 3: fig. 4(a) is re-read twice,
the second blind, by readers working without the repository; its result
may only widen the allowance, and only inside its own measured box (its
nose shape, Mach number and fineness, 0022 section 4.4); its label names
its stated tunnel Reynolds number as far below flight and says "formed
from data seen before registration"; it is never a test. Recorded in
0022 section 8, item 6. By 0022 section 4.2 its one digitised value on
record (`docs/validation/sources.md`, Cp about 0.031) stays in the
envelope as an earlier reading. Nothing of it has been read again. Also
before any reading, on the independent review of the integration script
(3e26e9a), 0022 section 4.3 item 5 was revised (revision 4): the
measurement term acts over the area from the first orifice to the
shoulder, since the value held behind the last orifice carries the same
bias.

_Added 2026-10-24 to (w): the owner's decisions after the blind readings
were paired (6019bbd) and before TN 4233 and RM E51H17 were run (cce5621
stopped on both)._ Widening only, recorded in 0022 section 8, items 7 and
8: two values at one station (TN 4233's check orifices, RM E51H17's two
meridian symbols) enter as alternatives, every combination taken and the
widest counting; every TN 4233 row of tables I(a) and I(b) is run; RM
E51H17, which states no Cp uncertainty, takes the largest stated among
TN 3716, RM A53E01 and TN 4233. (w)'s registered text above is unchanged.

_Added 2026-10-24 to (w), after the second blind run (944f46f) and
before the rows below were run._ The owner clarified that RM E51H17's e is
the literal largest stated, +-0.006 (a clarification, not a change), and
decided that TN 4233's 30 rows below indicated Mach 1.078 are run against
the transonic solver of 0013 on its finest grid (0022 section 4.3 item 2),
widening only. Recorded in 0022 section 8, item 8's note and item 9.
(w)'s registered text above is unchanged.

**2026-10-24 (y): the transonic solver below Mach 1 and near Mach 1,
its verification registered before any such value is looked at** (the
owner's decisions of 2026-10-24: verify the solver first, with the
independent code; the advisor's plan and addendum of the same day). Design
record 0013's captured-shock solver is verified for Mach 1.0 to 1.2 (exact
references at 1.2 and 1.1, the procedure at 1.05). Amendment (w) and 0022
section 8 item 9 want its wall pressures at TN 4233's 30 rows below
indicated Mach 1.078, 16 of them below Mach 1 and 10 at 1.001 to 1.041
where the driver refuses (B1) and the far boundaries' effect had no tested
bound. This entry fixes, before any subsonic or near-sonic grid is solved:
the rungs, the quantities, the references, the tolerances, the pass or
fail rules and their consequences, the compute, and the labels. The rules
are coded in `src/validation/subsonic-verification.ts` (its constants are
this entry's numbers) and the evaluation in
`docs/research/nose-model-form/verify-subsonic.test.ts`, both committed
with this entry; the solves record what the rules need
(`docs/research/nose-model-form/solve-common.ts`). No measured TN 4233
value is read, compared or quoted in the verification: TN 4233's rows are
what the verified solver will later be compared against under (w), and
using them here would be circular. Nothing below Mach 1.05 is solved until
this entry is committed and independently reviewed (the scripts refuse
without `Y_REVIEWED=1`, which asserts that).

1. _What is verified, on what._ The CPU engine's transonic domain
   (LU-SGS, CFL to 1000, the driver's settling tests as `solve-common.ts`
   carries them) on TN 4233's cone-cylinder (6 deg 59 min, nose 8.169
   radii, base radius 1), on the family `transonicDomains` gives: below
   Mach 1.05 the moved family (224.2 radii, neighbours 100.6 and 408.7;
   10 calibers of cylinder, neighbours 5 and 20), from 1.05 the served
   family (100.6 radii, neighbours 55.1 and 224.2). Grids r = 1, 2, 4, 8;
   r = 16 only as item 5 (a) says. The owner's GPU (the page's two-float
   engine, 2 red-black sweeps) may solve the rows only after item 5 (h).
2. _The absolute scale S._ Below Mach 1 the inviscid drag is near zero,
   so every threshold the solve and the procedure take relative to the
   drag (the settling test's noise 1e-7, the geometric remainder 1e-9,
   the oscillation bound, the grids' noise, the procedure's noise) is
   taken relative to S = max(|CD|, 0.01) instead (`SUBSONIC_SCALE`; the
   settling test sees the drag shifted by 0.01, which changes no
   difference). 0.01 is about a tenth of the cone's drag at Mach 1. At
   Mach 1 and above nothing changes. The floor (0013's 7e-5 of the value)
   is replaced below Mach 1 by an absolute floor set by item 5 (b).
3. _The rungs._ Below Mach 1: indicated 0.600, 0.800, 0.901, 0.960 and
   0.991 (`SUBSONIC_RUNGS`; 0.6 is where the exact reference applies, 0.8
   the top of the range where the shoulder's sonic bubble is still small
   and the linear level check means something, the three others the drag
   rise, where no theory holds). Near Mach 1: 1.001, 1.020 and 1.041
   (`NEAR_SONIC_RUNGS`, item 8). The other rows get the same family, the
   same records and the same band rules, which the rungs validate, as
   0013's Mach 1.1 and 1.2 validated the procedure for 1.05.
4. _Quantities, recorded for every grid of every row:_ Q1 CD, the nose
   pressure drag on the base area (the driver's); Q2 Cp at the ten cone
   stations x/l 0.082 to 0.942 (TN 4233's orifices 1 to 10, positions
   only), interpolated on the grid, with a per-station band from r = 2, 4,
   8 (Richardson at the observed order capped at 2; the range where they
   oscillate; flagged where they do not shrink); Q3 the loss of total
   pressure on the cone wall ahead of x/l 0.9 and of any supersonic wall
   cell, and 3 calibers behind the shoulder; Q4 the far-field and
   cylinder allowances by `domainAllowance` on the nested base grids, with
   the base grids' station Cp; Q5 the pocket diagnostic: the largest wall
   Mach number and the supersonic wall cells.
5. _References, with the Mach range where each holds._
   - R1, exact (Mach 0.6 only as a pass or fail; an ordering check above
     it): the nose pressure drag of a nose on a semi-infinite cylinder in
     shock-free subsonic inviscid flow is exactly zero. The momentum
     balance on a large sphere pierced by the body: the zeroth-order
     term, minus rho U^2 pi R^2 from the missing disk, is cancelled by rho
     U times the net outflow, which mass conservation fixes at U pi R^2
     (the source-like far field); Lagally's theorem gives the same.
     Checked on the Rankine half-body (incompressible): Cp from 1 at the
     nose to a minimum of exactly -1/3, and the drag on the base area zero
     to 1e-14. The cylinder's faces add nothing, so the cone-face sum the
     driver computes must be zero. Validity: where the shoulder's sonic
     bubble carries no drag. An estimate from the convex-corner
     singularity (velocity like s^-0.037 for a 7 deg corner; the local
     flow reaching Cp* at distance s) puts the bubble at about 3e-4 radii
     at Mach 0.6 (drag below 1e-5), 1e-2 radii at 0.7, 0.2 at 0.8, 2 at
     0.9. So R1 is exact at 0.6 and an ordering check from 0.7.
   - R2, exact (every rung, ahead of the bubble): the total pressure is
     conserved on the cone wall ahead of the shoulder and of any
     supersonic wall cell (loss zero in shock-free flow). A loss d of p0
     is a Cp error of d (p / p_inf) / (gamma M^2 / 2): at Mach 0.6 a loss
     of 1e-4 of p0 is 4e-4 in Cp. This is where numerical dissipation
     shows; 0013 saw first-order wall losses of 0.25% on blunt noses at
     Mach 1.2, which would be 0.01 in Cp at Mach 0.6.
   - R3, a level check that sets nothing (Mach 0.6 to 0.8): the
     linearised compressible axisymmetric solution (Goethert's rule on the
     von Karman-Moore source integral: f(xi) = U tau^2 xi on the cone,
     none on the cylinder, the subsonic kernel), in closed form in
     `linearisedConeCylinderCp`, tested against its slender-body log form
     tau^2 [ln(4 (L - x) / (beta^2 tau^2 x)) - x / (L - x) - 2], which it
     matches to O(tau^4). Second-order terms make it a few percent of Cp
     from the Euler solution on a 7 deg cone, so it is a gross-error
     check only: the finest-grid Cp at the stations within 20% of it or
     0.01 absolute, reported, never a pass or fail. Its pedigree is C. W.
     Matthews, NACA Report 1155 (linearised theory against measured
     subsonic pressures on bodies of revolution; its data are not needed
     and not read). The subsonic limit of the transonic small-disturbance
     equation is this same linear equation wherever the flow is subsonic,
     so it adds nothing.
   - R4, published computations, checks that set nothing: Spreiter and
     Alksne, NASA TR R-2 (verified in sources.md; cone-cylinder results
     for subsonic streams per its abstract; whether it gives subsonic
     cone-cylinder formulas is to be confirmed when it is opened for this;
     its equations only, never its figure 20, which plots Page's measured
     points). Bailey, TN D-6582: no cone-cylinder (sources.md), not
     usable. Not required by this entry.
   - R5, an independent code, the only reference at Mach 0.9 to 0.99:
     SU2 8.1.0, axisymmetric Euler (AXISYMMETRIC = YES, an Euler wall,
     symmetry on the axis, far-field boundaries), on Gmsh 4.13.1 meshes,
     run by the owner on their own machine as separate programs
     (`docs/research/nose-model-form/su2/`, after
     `scripts/reference-3d/` of 0021 4.4 and (u)); only inputs and results
     are committed. The same body and domain (224.2 radii, 10 calibers),
     three mesh levels refined by 2 near the body, at the rungs 0.901,
     0.960 and 0.991. Its nose drag and station Cp are computed from its
     wall pressure by the script, not from SU2's force conventions. The
     comparison rule: the code's own band (0005's rule on its three
     levels) at most the larger of 0.035 of its value and 5e-4 absolute,
     else it is no reference ("not applicable"); then the two codes'
     finest values within the sum of the two bands plus 5e-4 absolute
     (`CODE_COMPARISON_MARGIN`), else the rung fails. The owner decided
     (2026-10-24) to run it.
6. _Tolerances and pass or fail_ (`judgeRung`; each rung judged on its
   own; a fail keeps the TN 4233 rows of that rung's box, +-0.05 Mach,
   out of (w)'s allowance, and the label says why):
   - (a) The family must give a band by `gridConvergence` (four grids,
     orders within 0.5, the measured noise on S). "Unresolved" with the
     finer triple monotone: r = 16 is added once (the cost stated before
     it runs); still unresolved, the rung fails.
   - (b) Mach 0.6, the exact check: |CD_r8| <= 2e-4 + the band
     (procedure + far field + cylinder). 2e-4 is a tenth of the
     measurement side's own term in 0022 (e = 0.002 in Cp over the base
     area is 2e-3 in CD), so a solver error of that size is immaterial
     for the use. A pass sets the subsonic absolute floor F = 2 times the
     larger of |CD_r8| and |extrapolated CD| at this rung (as 0005 set its
     floors at twice the measured miss against exact values), added to
     every subsonic band as an absolute term. A fail fails the rung.
     Written now, an exception that does not lift the fail: if Q5 shows
     supersonic wall cells at the shoulder on r = 8 and the loss behind
     the shoulder is at least 5 times the loss ahead of it, the drag is
     the bubble's; the check is recorded "not applicable at this Mach
     number", the rung still fails for want of a reference, and the owner
     decides by a new dated entry.
   - (c) Sign and ordering: CD_r8 + band >= 0 at every rung (entropy
     production can only add drag; a confidently negative drag is
     numerical); and across the rungs CD must not fall as Mach rises,
     each pair within the sum of its bands, and CD(0.991) must lie below
     0013's Mach 1.0 estimate 0.0932 by more than its band. A violation
     fails the rungs involved.
   - (d) The stations, the use: the per-station band on r = 8 (the grid
     band plus the per-station far-field allowance of item 9 plus the
     floor) at most 5e-4 in Cp, a quarter of TN 4233's stated 0.002.
     Above 5e-4 the rung is "verified, band too wide for the use" and the
     band enters 0022 as its own term u_num (item 11); above 2e-3 the rows
     stay out.
   - (e) R2: on r = 8 the largest loss ahead of x/l 0.9 at most 5e-4
     times gamma M^2 / 2 times p_inf / p_wall of p0 (1.3e-4 at Mach 0.6,
     2.8e-4 at 0.9), and falling across r = 2, 4, 8 at an observed order
     of at least 0.8. Otherwise the rung fails.
   - (f) The allowances: `domainAllowance` must not refuse the far field
     or the cylinder; a refusal fails the rung. The decaying branch is
     used only where the distance ratios do not shrink outward (the outer
     ratio D2 / D1 at least the inner D1 / D0), the pre-registered step of
     the re-review of `dd6c423` (0013, item 2), coded with this entry and
     tested on pure power laws of exponent 0.35 to 3 on every distance set
     the driver uses; on the moved family (ratios 2.23 then 1.82) every
     case is therefore the turning bound or refused. Reported, not pass
     or fail: the far-field changes' decay exponent at Mach 0.6 and 0.8,
     expected near 2 for a source-like far field; below 1 it is flagged.
   - (g) R3 and R4: reported; a miss is investigated, never a pass or
     fail.
   - (h) The GPU: no GPU family counts until the hardware match test
     passes on the owner's checkout: Mach 0.8, r = 1 and 2, the GPU's
     drag within 3e-7 absolute of the CPU engine's (as 0013's G3 test at
     Mach 1.1), the two-float self-test and the precision check on that
     hardware (`owner-kit/match-cpu.test.ts`, `MATCH=1` of the kit). The
     red-black 2-sweep relaxation's margin beyond r = 2 is unmeasured on
     any device, and never measured below Mach 1.05.
7. _Labels._ A rung that passes (a), (c), (d), (e), (f) at Mach 0.9 to
   0.99 with R5 passed: "verified by grid convergence and against an
   independent inviscid code; no exact reference at this Mach number; the
   procedure was checked against the exact zero-drag and total-pressure
   results at Mach 0.6". Without R5: "verified by grid convergence only;
   no exact reference ...; most of the band may be the far-field
   allowance". Page's appendix puts wall interference between indicated
   0.99 and 1.05 in both tunnels; that is 0022's problem with the 0.989
   and 0.991 rows, not the solver's, and the row's label says so.
8. _The rows at Mach 1.001 to 1.064 (14 rows, 11 Mach numbers)._ The
   four rows at 1.050, 1.062 and 1.064 are in the driver's served range
   (the served family, the rule tested at 1.05): nothing new, no wait.
   The ten rows at 1.001 to 1.041 are on the moved family, below B1,
   whose far-field allowance had these holes: the registered test (b) for
   the moved family was never run (it needs a fourth distance near 800
   radii, where the implicit steps diverged at Mach 1), and the decaying
   branch is not a bound there. For them: the allowance is the corrected
   rule with the distance condition of 6 (f) (turning or refused on the
   moved family; from the numbers on record, about 5.5e-3 at Mach 1.0, 6%
   of the drag; 3.9e-3 at 1.01; 4.4e-4 at 1.02; small from 1.025), and
   its pre-registered test is the fourth distance: the base grid on about
   800 radii (`FAR_800`, asked as 800; the grid's own radius recorded) at
   the three near-sonic rungs, solved by a path that does not diverge,
   tried in this order and the choice recorded (`far-800.test.ts`): (i)
   the engine's explicit SSPRK2 steps at CFL 0.8 (stable where the
   implicit steps were not; hours on one core), (ii) the implicit steps
   with the CFL number capped at 10. The value must settle under the
   fitted-window rule. Pass: the allowance from 100.6, 224.2 and 408.7
   radii contains C(800) - C(224.2) at every rung. A miss at any rung
   withdraws the moved family's allowance for all ten rows, which stay
   out until a rule that passes is registered; a value that settles by
   neither path keeps them out too (0013's consistency check, already
   labelled not a test, does not lift this). The ten rows wait for this
   test and for the review of this entry, and for nothing larger. The
   owner decided (2026-10-24) that all 14 rows are run, the large
   allowances at 1.001 to 1.011 (4e-3 to 6e-3 in Cp, two to three times
   the measurement's own term) being honest under widening only.
9. _The per-station Cp allowance for the far field_ (every row). 0013
   measured the far field's effect at Mach 1 as a nearly uniform shift of
   Cp (+0.0006 to +0.0007 from 224.2 to 408.7 radii, rms 0.0008). A
   uniform shift d in Cp is exactly d in CD on the base area, so each
   station's allowance is the drag's allowance plus a non-uniformity term:
   T (the rule's tail factor) times the station's deviation from the mean
   of the base-grid changes between the family's own domain and the larger
   one, plus the measurability level m (`stationCpAllowance`).
10. _The grid band near Mach 1_ is unchanged (four grids, the measured
    noise). r = 8 at Mach 1.001 and 1.008 is about 300,000 steps (0013's
    estimate), near the scripts' cap of 400,000, which is not raised after
    the fact: a grid that does not settle makes the row "not converged"
    and it stays out, never a value.
11. _Into 0022._ The verified rows' station bands (6 (d)) enter the
    allowance as a term u_num beside u_meas and u_unc, in the measure's
    units; and the rows below Mach 1 use the absolute measure of 0022
    section 8 item 10 (dated 2026-10-24, before any such row is
    evaluated): d = D_meas - D_inv in CD on the base area with u in the
    same units, boxes in absolute CD, the boundary fixed at indicated Mach
    1.000 (below it absolute, at and above it the ratio), and a box mixing
    the two forms giving at a nose term D the wider of a D and the
    absolute half-width (`noseBand`). Coverage below the boundary is by
    the uncovered base area (at most a tenth), since the share of a
    near-zero drag means nothing.
12. _Compute._ Step counts grow fast below Mach 1 (r = 1: 5,350 at Mach
    1.064, 25,800 at 0.8); a rung r = 1 to 8 is about 15 to 25 hours of
    one CPU core here, r = 16 four to five times that; the nested base
    grids about 10 to 30 minutes per Mach number. Plan: the CPU here for
    Mach 0.6 first (the floor), then 0.8, and the nested base grids and
    the 800-radius runs; the owner's GPU, after 6 (h), for the other rungs
    and rows (0013's unmeasured estimate: 15 to 40 minutes a family). The
    page's rate is measured, never assumed.
13. _Order._ (1) This entry, the rules' code and tests, the evaluation
    script, the solve scripts' records and scale, the fix of 6 (f), the
    match test, the SU2 kit: committed before any subsonic or near-sonic
    grid is solved; the running CPU job is stopped by its own process
    group after Mach 1.064 and restarted restricted to 1.062 and 1.050.
    (2) An independent review of this entry and its code; `Y_REVIEWED=1`
    only after it passes. (3) Mach 0.6 on the CPU; (b) and (e); the floor.
    (4) The other rungs, the rows, the 800-radius runs, the SU2 runs.
    (5) The results recorded in 0013 as a dated section "Below Mach 1" in
    the form of its Mach 1.2 and 1.1 sections; an independent review of
    the results before any row enters (w). (6) Only then does
    `blind-run-3.test.ts` evaluate the rows below Mach 1.078, under item 11.
14. _Risks, said now._ Numerical wall dissipation at low Mach turns a small
    total-pressure loss into a large Cp error, so (e) may fail honestly at
    0.6 (then the rows stay out until the wall treatment is improved). The
    Mach 1 runs settled in slow damped oscillations and Anderson wandered
    there; subsonic acoustic modes may be slower still, and the 408.7 and
    800-radius grids sit near the divergence seen at Mach 1. At Mach 0.6
    the drag is a cancellation between the cone's positive pressures and
    the shoulder's suction in the last 1% of r^2, at reduced order; a fail
    there is likelier a grid-spacing finding than a solver bug. The GPU
    path below Mach 1.05 is untested on any device. R1 and R2 are the only
    exact references and apply at 0.6 (R2 ahead of the bubble elsewhere);
    nothing at 0.9 to 0.99 is exact, and R5 depends on the owner's
    machine. The settling scale S is a choice made now; it is recorded
    with every grid.
15. _Not changed:_ every served number, B1, the page, (w)'s registered
    text, every other band and test. (Corrected by the revision below: the
    distance condition of 6 (f) does change served bands for long noses.)

_Revised 2026-10-24 after the independent review of 84474a6..69711ee,
before any result (no subsonic or near-sonic value exists). Each change
to the rules above, in the review's numbering:_

1. _Item 15 was false._ The served family's far boundary is 10 nose
   lengths for noses longer than 5 calibers (`transonicDomains`), so served
   long noses have distance ratios that shrink outward too: the grids' own
   radii are 55.1, 122.9, 224.2 for a 5.5-caliber nose, 82.3, 183.5, 334.6
   for 8 calibers and 100.6, 224.2, 408.7 for 10 (served at Mach 1.05 and
   above), and 122.9, 224.2, 499.3; 183.5, 334.6, 745.0; 224.2, 408.7,
   910.0 for the same noses below 1.05. The distance condition of 6 (f)
   therefore widens the far-field allowance of every served nose longer
   than 5 calibers whose changes decay: a 5.5-caliber nose at Mach 1.1 with
   a = 1e-3 and b = 4e-4 (rho 0.4) had 4e-4 / 0.6 = 6.7e-4 and now takes
   the turning bound 4e-4 + 4.27 x 1e-3 = 4.7e-3. The direction is safe
   (wider), and the page change needs its own review before it reaches
   main. The power-law test now covers those served sets and the real
   cylinder distances 5.5251, 10, 21.9986 calibers (`a608828`'s commit
   message, "nothing served changes", is corrected here and in 0013).
2. _The GPU match gates._ The kit unlocks only on a match file that
   records `passed: true` on hardware (not on the file's existence, not on
   a software run), and refuses every row below Mach 1.078 without it (6
   (h) and item 1 said 1.078; the code said 1.05). The evaluation judges
   nothing from a GPU run whose match did not pass.
3. _Ordering, 6 (c)._ The top rung's condition is CD + band below 0.0932
   (the whole band under the estimate; the code had it inverted), and a
   violation fails every rung it names (`applyOrdering`), not only prints.
4. _The measurability level below Mach 1_ is m = 2 nu S, not 2 nu max|C|:
   `domainAllowance` and the procedure (`gridConvergence`) take the scale
   S as an option, and the solves pass it below Mach 1.
5. _The per-station band, 6 (d),_ adds the cylinder's (outlet's)
   per-station allowance, formed as item 9 forms the far field's.
6. _A station whose changes do not shrink has no band_ (0005): it fails 6
   (d) for that rung; the independent code's levels likewise give no band
   where they do not shrink (R5 then "not applicable").
7. _R5 compares procedure bands only_ (both codes share the domain, so
   the far-field and cylinder allowances do not enter the margin), and
   the SU2 kit records whether each level stopped on its Cauchy criterion
   or hit ITER: a level that hit ITER gives no value.
8. _u_num is coded_ (`inviscidUncertainty` in `nose-model-form.ts`: the
   largest station band of 6 (d) over the bias area, in the measure's
   units), and a published floor (relative) never widens an absolute box.
9. _S is max(|CD|, 0.01)_ everywhere (the procedure's scale option, not a
   shift); the station noise is nu S; the near-sonic rows keep 0013's
   floor of 7e-5 of the value (item 10).
10. _6 (e)_ excludes the tip: the deviation is taken from the first
    station (x/l 0.082) to x/l 0.9; and below 1e-6 of p0 on r = 8 the
    order test is not required (`WALL_LOSS_ORDER_FLOOR`).
11. _6 (b)_ caps the procedure's own band at Mach 0.6 at 2e-4
    (`ZERO_DRAG_BAND_CAP`): above it the pass could not show the error is
    at most the tolerance, so (b) fails.
12. _The 800-radius test, item 8:_ the explicit steps run first under
    their own cap of 2,000,000 steps (about 8 hours of one core on the
    5,300-cell grid); the implicit steps at CFL 10 only after the explicit
    steps fail to settle; a failure is written to its own file and never
    blocks a retry; the grid asked for 800 radii has its first row at
    910.0 radii (129 x 41 cells), and that is the distance recorded.
13. _Item 9's m is counted twice_ (inside the drag's allowance and again
    per station): on the safe side, left so. _6 (a)'s r = 16_ is solved by
    the CPU script with `FINEST=16`, which extends a finished family from
    its checkpoints.

14. _Re-review of cb2d8f7, N1 to N3 (2026-10-24, still before any
    result)._ N1: cb2d8f7 had changed the procedure's default scale to
    the largest |value| of the whole family, which changed served output
    (`refineUntilVerified`, the fitted solver, and the transonic driver:
    five levels 1 + 1.6e-4 / 2^k gave a band of 1.5e-5 instead of
    1.25e-5). Restored: without a scale each test uses the largest
    |value| among the values it looks at (its triple, or the four
    finest), as before, so served output is bit-identical; a test pins
    that case to the old result; the scale option acts only where given
    (the subsonic rules). N2: item 6's consequence is coded: a failed rung
    keeps the TN 4233 rows within +-0.05 Mach out (`rowsKeptOut`; the
    evaluation lists them and `blind-run-3.test.ts` refuses them, and
    holds every row below Mach 1 until the results' review,
    `Y_RESULTS_REVIEWED=1`). N3: the last blockquote in 6 (f) and the
    stale comment on `pointwiseBand` are fixed; the not-shrinking test
    isolates the rule with changes of 1e-5.

15. _Re-check of 88e5d4c, R1 and R2 (2026-10-24, before any result; gates
    only, no criterion changes)._ R1: a box is released only by a rung
    judged a pass (or a pass with a band too wide for the use): a rung
    missing, not converged, or waiting for the floor keeps its box out with
    that reason ("not run", "not converged", "no floor"), so if Mach 0.6
    fails every row from 0.701 up stays out, and a Mach 0.8 that did not
    converge keeps 0.797, 0.800 and 0.850 out (`rowsKeptOut` over every
    registered rung, with the pending reasons from the evaluation). R2:
    `blind-run-3.test.ts` holds the rows at Mach 1.001 to 1.041 unless the
    evaluation records the 800-radius test passed and the results' review
    is asserted (`nearSonicHold`), with the reason in its held list; the
    rows at 1.05 and above (the served family) do not wait. Both tested.

16. _Re-check of 602d8f7 (2026-10-24, before any result; gates only)._
    Every gate a TN 4233 row passes before 0022's script evaluates it is
    one tested function, `rowGate`: (1) GPU solves count only with the
    kit's match record passed on hardware, for every row, 1.05 to 1.064
    included (6 (h)); (2) rows at 1.05 and above then pass, with u_num
    from the evaluation's per-row result where it exists; (3) rows below
    1.05 need the evaluation made on these same solves (the directory's
    name and a hash of every solve file, recorded by the evaluation and
    checked by the script), the results' review, not to be kept out by a
    rung, the 800-radius test where item 8 applies, a judged per-row
    result (so a row outside every rung's box, or not solved, or without
    a floor, is refused), and 6 (d) not failed for the row; then u_num is
    that row's largest station band (item 11, now wired as
    `inviscidUncertainty`). Each gate has a unit test with a case that
    would otherwise release a row.

17. _Re-check of 3c3f6c7 (2026-10-24, before any result; stricter, gates
    only)._ (1) Item 3's "same band rules" apply per row: any row below
    Mach 1.05 whose own verdict is a fail (an unresolved family (a), a
    negative drag (c), a wall loss (e), a refused allowance (f), as well as
    6 (d)) is refused, as a rung would be, whatever its pointwise bands.
    (2) Whether a solve came from the GPU is read from each solve file's
    own engine record (`engineKind`), never from its directory's name, in
    the evaluation and in the script; a file without an engine is refused;
    every GPU-engine file needs the passed hardware match. (3) The served
    family starts at `NEAR_SONIC_LIMIT` in the gate (no hard-coded 1.05),
    tested at 1.041 (held) and 1.05 (served).

18. _The stable stepping path for grids that diverge (the owner's
    decision of 2026-10-24; written AFTER a result was seen, disclosed
    here in full)._ At 18:20 UTC on 2026-10-24 the Mach 0.600 family's
    far-field allowance base grid at 408.7 radii (asked 400, r = 1,
    solved from the free stream by the implicit LU-SGS steps at CFL 1000)
    diverged: it converged to about 0.002941 by step 3,000, held there to
    about step 6,000, then its drag wandered and its residual grew from
    the first check's 4.49e-3 to 0.568 at step 9,750 (past 100 times, the
    registered divergence test), the same signature as 0013's 800-radius
    divergence at Mach 1. The registered scripts then recorded Mach 0.600
    as not converged. What had been seen when this item was written, and
    nothing else below Mach 1: the Mach 0.600 r = 1 record (drag
    0.0029476 in 35,450 steps, wall loss ahead 2.12e-3 of p0, largest wall
    Mach 0.732, no supersonic wall cell), the 100.6-radius allowance base
    grid's drag 0.00298282 (18,000 steps), and the divergence above; of
    Mach 0.800, its r = 1 and its 100.6-radius allowance base grid were
    running. No r = 2 or finer grid, no band, no station band and no
    allowance existed for any subsonic Mach number. The rule, from this
    item on: any grid of the CPU path (a family grid or an allowance base
    grid, at every rung and every row, the 800-radius test's three
    implicit base grids included) that diverges under the implicit CFL
    1000 steps (the residual growing past 100 times its first value, the
    registered test; never a step-cap miss, which stays "not converged")
    is re-solved from the same start by the far-800 path in its registered
    order: the explicit SSPRK2 steps at CFL 0.8 under their registered
    cap of 2,000,000 steps, then, if those do not settle, the implicit
    steps with the CFL number capped at 10 under the ordinary cap. A
    divergence or a step-cap miss of both still means "not converged".
    The path each grid settled by is recorded in its result (`path`). The
    steady state is the same whichever path reaches it (0013: the
    implicit steps change only the path), so no criterion, tolerance,
    cap, floor, allowance rule or label changes; a grid solved by the
    fallback carries the same settling tests, the same scale S and the
    same noise rules. The GPU kit's red-black path is NOT covered: a
    divergence there stays "not converged" (the kit runs no CPU fallback;
    a row the kit cannot converge is solved here on the CPU, if at all).
    The non-converged record of Mach 0.600 is kept in the branch under a
    "superseded" name, never deleted, and the family is solved again only
    after an independent review of this item and its code.

    _Addendum, dated 2026-10-24, after the re-review of 1f3b511 and
    c02eaff (its finding 1): the disclosure above was inaccurate at
    1f3b511's commit time (18:56:26 UTC). Mach 0.800 was not "running":
    its r = 1 had settled at 18:52:55 (drag 0.0087001196 in 25,400 steps,
    wall loss ahead 2.99e-3 of p0, largest wall Mach 1.226, 4 supersonic
    wall cells), its 100.6-radius allowance base grid had settled by
    18:54:25 (about 0.0087222), and its 408.7-radius allowance base grid
    had started at 18:54:25. That grid diverged at 18:59:11 (residual
    from 0.0102 to 1.162 at step 32,400; the last logged check, 32,350,
    read 0.752), after 1f3b511 and before
    c02eaff, and Mach 0.800 was recorded as not converged like 0.600.
    Both non-converged records are kept in the branch under a superseded
    name, never deleted. Its finding 2: the text says the explicit steps
    are followed by CFL 10 when they "do not settle"; the code at c02eaff
    fell back on a divergence only; the code now matches the text (an
    implicit-path cap miss is final; on the explicit path any failure,
    a divergence or its cap, goes on to CFL 10; the last path's failure
    is final). Its finding 3: the step count restarted at zero when a grid
    continued from a mid-grid checkpoint, so the cap was per process, not
    per grid; the step count, the first residual (the 100 times divergence
    test) and the largest residual are now saved and restored with the
    state, and a state without them is not continued from. For lane A's
    explicit 910-radius grid at Mach 1.001, running on the old code: how
    it was restarted is recorded in the run log (`y-runs/lanes.log`) and
    in the results commit._

_Tests added for the errors the review planted:_ the floor and the
cylinder term in the station band, p_inf / p_wall in the loss tolerance,
the top rung's ordering condition, the zero-drag fail just past the
limit, the band cap, the not-shrinking station, the loss order floor,
R5 on procedure bands only, `applyOrdering`, the scale in the procedure
and the allowance rule, the served long-nose distance sets.

The next free letter is (z); (x) is reserved for the W6 probe.
