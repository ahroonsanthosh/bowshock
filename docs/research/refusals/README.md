# The refusal audit: scripts, population and outputs (0014)

The measurements behind [0014](../../design/0014-refusals.md): which of
the drag page's and the libraries' refusals a realistic supersonic
amateur or student rocket triggers, and how often. Nothing here is used
by the solver or the page.

## Files

| File | What it is |
| --- | --- |
| `population.ts` | The population of rockets (seeded, deterministic) and the flight conditions: diameters, noses, tips, fins, sections, positions, boat-tails; Mach bands; the standard atmosphere to 20 km |
| `evaluate.ts` | Every refusal a rocket at a condition triggers, each tested on its own (mirroring the code named in 0014's inventory), and the library's own verdict for the cross-check |
| `impact.test.ts` | The run: outcome per Mach band, rate per refusal, sole blockers, the work packages (the share each is needed for, the greedy order, totals after each step of 0014's order), the altitude ends, two sensitivity variants, the cross-check against `src/total` |
| `edges.test.ts` | The parameters the fin-edge packages turn on, over the same cases: the trailing edges' thin-layer parameter, the leading edges' normal Mach and Reynolds numbers, the trailing-edge angle of fins at the base |
| `vitest.config.ts` | The runs' config (one file, one worker, no time limit) |
| `out/impact.out`, `out/impact.json`, `out/edges.out` | The runs' tables, as 0014 quotes them (the code of 5245241) |
| `out/impact-w34.out`, `out/impact-w34.json` | The same run after the fin edges of flat plates (design record 0016): `evaluate.ts` mirrors the code it was run with (`EDGES`, default `w34`) |
| `scripts/or_survey.py` | Survey of OpenRocket's example designs and component presets (nose shapes and fineness, fin sets, cross-sections) |
| `out/openrocket-survey.out` | Its output, on OpenRocket commit 591c5e5 |
| `scripts/ntrs.py`, `scripts/fetch_ntrs.py` | NTRS search and download helpers used to open the sources 0014 cites (each download in its own directory; run with `python3 -I`) |

## Re-running

From the repository root (any machine with the repository's
`node_modules`):

```sh
nice -n 10 npx vitest run --config docs/research/refusals/vitest.config.ts
```

`N_ROCKETS` (default 2000, the quoted run) and `CROSS_CHECK` (rockets
whose cases are checked against `src/total`, default 300) set the size.
It writes `out/impact.out` and `out/impact.json`; `OUT_NAME=impact-w34`
writes `out/impact-w34.out` and `.json` instead (0016's run).
`evaluate.ts` mirrors the refusals of the code since 0016 (flat plates,
swept rounded edges on the normal components, thick layers and tapered
trailing edges); `EDGES=before` gives the decomposition 0014 measured,
without the cross-check, which needs that commit's code. On a loaded four-core
machine it takes about five minutes; the slow part is the fitted
solver's tip test (`sharpFitProblem`, 0.3 s a call), called only where
the tip cone's Taylor-Maccoll solution does not already decide it, and
cached. The edge parameters:

```sh
ONLY=./edges.test.ts nice -n 10 npx vitest run --config docs/research/refusals/vitest.config.ts
```

The OpenRocket survey: clone `https://github.com/openrocket/openrocket`
(sparse: `core/src/main/resources/datafiles`) into its own directory
outside the repository, then

```sh
python3 -I docs/research/refusals/scripts/or_survey.py <clone>/core/src/main/resources/datafiles/examples <clone>/core/src/main/resources/datafiles/components/internal
```

## The population, and what each part rests on

Each rocket is drawn once and evaluated at one condition in each Mach
band (1.0 to 1.2, 1.2 to 1.5, 1.5 to 1.8, 1.8 to 3.0), the Mach number
uniform in the band, so every band holds the same rockets. Sources are
cited where one exists; everything else is an assumption, stated as one,
and the two sensitivity variants of `impact.test.ts` move the weights the
results depend on most.

| Variable | Drawn as | Grounds |
| --- | --- | --- |
| Diameter | 38 mm 15%, 54 mm 30%, 75 mm 20%, 98 mm 20%, 152 mm 15% | Assumption: the motor-mount and airframe sizes of minimum-diameter and student rockets (38 to 98 mm motors; 6 in student airframes such as RIT's 6.25 in). Diameter enters only through Reynolds numbers |
| Nose shape | Von Karman (LD-Haack) 45%, LV-Haack 3%, tangent ogive 30%, conical 12%, ellipsoid 3%, parabolic (K = 1) 4%, power 1/2 3% | Kits for supersonic flight ship filament-wound 5:1 Von Karman noses with metal tips (Wildman Rocketry: the Scarab 54's "5:1 Von Karman fiberglass nose cone with metal tip", the Punisher SS's "5-1 filament wound aluminum tipped nose cone", eRockets and RocketryForum listings); Space Team Aachen's Aquila (Mach 1.8) "von Karman shaped ogive" with an aluminium tip; RIT's KONG a 5:1 tangent ogive with a machined aluminium tip. OpenRocket's legacy presets (138 noses of 38 mm and over: 76 ogives, 46 ellipsoids, 8 cones, 6 parabolic, 2 Haack) are low-power plastic noses and are not taken as representative. The shares are an assumption shaped by these |
| Nose fineness | Haack 4 to 6, ogive, cone, parabolic and power 3 to 5, ellipsoid 2 to 3 | The kits' 3:1, 4:1 and 5:1 noses; RIT's 5:1 |
| Tip | rounded in 50% of non-ellipsoid noses, r_n / R 0.03 to 0.15; below 0.02 counted sharp | Assumption. Molded and filament-wound noses end in a radius or a machined metal tip of a few millimetres; 0.02 of R (about 7e-4 in C_D at pitot pressure, 0.15% of a total near 0.5) is taken as the threshold below which a tip is called sharp, as the Basic Finner's 0.004 cal meplat is (0011, "Not represented") |
| Overall length | 8 to 18 calibres, at least nose + fins + 1 calibre | Assumption (minimum-diameter rockets 10 to 16; student rockets longer) |
| Fin count | 3 in 55%, 4 in 45% | RIT: "configurations of both three and four fins are fairly common"; Wildman's kits three fins; Aquila four; OpenRocket's examples 12 of 17 multi-fin sets with three (`out/openrocket-survey.out`) |
| Planform | rectangular 5%; clipped delta (trailing edge unswept, taper 0.2 to 0.6) 65%; trailing edge swept back (leading edge 20 to 60 deg, taper 0.3 to 0.7) 30% | Assumption, matching "trapezoidal and clipped delta with leading-edge sweep 0 to 60 deg"; OpenRocket's high-power example sweeps 13 to 58 deg |
| Root chord, span | 1.0 to 2.5 and 0.6 to 1.5 calibres | Assumption; RIT 12 in on 6.25 in (1.9 cal), 5.8 in span (0.9) |
| Section | flat plate, rounded leading edge, square trailing edge 30%; rounded both 15%; square both 15%; bevelled (sharp) both 20%; bevelled leading edge, square trailing edge 10%; sharp double wedge or airfoil 10% | Hobby fins are flat sheet (G10, plywood, carbon plate: Wildman's 1/16 in G10, RIT's 1/4 in carbon); OpenRocket's examples: square 24, rounded 8, airfoil 2 cross-sections. The NACA's own rocket models used the same fin (the Langley PARD standard body: 0.091 in plate, rounded leading edges, square trailing edges; TN 3697, RM L52E06, TN 3372). The split between square, rounded and bevelled is an assumption |
| Thickness | by diameter: 1.6 to 2.4 mm (38), 1.6 to 3.2 (54), 2.4 to 3.2 (75), 3.2 to 4.8 (98), 3.2 to 6.4 (152) | Sheet stock 1/16 to 1/4 in; t/c follows (5%, median, 95%: printed in `out/impact.out`) |
| Bevel | half-angle 8 to 15 deg | Assumption |
| Fin position | without a boat-tail: trailing edges at the base 85%, within a chord 10%, 1 to 1.5 chords ahead 5%; with a boat-tail, 0.3 to 0.9 chords ahead (as drawn: at the base 72.5%, within a chord 23.4%, a chord or more ahead 4.0%) | Assumption; RIT's 6 in boat-tail behind its 12 in fins |
| Boat-tail | 15% | Aquila and RIT carry one; minimum-diameter rockets rarely do. Assumption |
| Altitude at the condition | 60% at 0 to 5 km, 30% at 5 to 12 km, 10% at 12 to 20 km | Assumption; the run also puts every condition at 0 km and at 20 km |

## What the evaluation does not model

- The nose solve's outcomes that only solving shows: grids failing the
  gates even with 1.5 times the columns, fits that do not converge,
  families whose band cannot be measured ("not verified"). A nose inside
  the documented domain is counted as served, so the nose figures are an
  upper bound.
- The tip test (`sharpFitProblem`) is called at the rocket's own Mach
  number and fineness (cached), after a screen with the tip cone's
  Taylor-Maccoll solution; the ellipsoid domain is 0006's measured one.
- Each refusal's condition is tested on its own, so a case lists every
  reason; the libraries stop at the first. `impact.test.ts` checks the
  decomposition against `finnedBodyComponents` on every case the library
  can represent (refused or not must agree).
