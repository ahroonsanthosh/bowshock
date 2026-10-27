# 0017: The rocketeer's interface (plan)

- **Status:** Built, on the interface branch, for the owner's review; this
  record is the plan, updated with what was built and the decisions taken
  on the way (section 14). Nothing here changes a number: the drag logic
  and the libraries (`src/app/total-drag.ts`'s computations, `src/total`,
  `src/base`, `src/fins`, `src/friction`, `src/analysis`, `src/engine*`,
  `src/verification`) are called, never changed, and every status, reason
  and text shown comes from what they return.
- **Date:** 2026-10-21
- **Owner's direction (2026-10-21):** accuracy, then usability, then looks.
  One page, full width: the rocket builder on the left, the airflow filling
  the rest, the drag result pinned. The main result is a C_D against Mach
  curve, Mach 1.0 to 3.0, its points filling in one by one, each with its
  band and a plain status. OpenRocket import in this pass. Calibres, grid
  and cells stay on the main screen. The main view is a 3D scene, built by
  another agent in `src/render3d/`; the 2D views of 0012 stay as secondary
  views.
- **Inputs:** [0011](0011-total-drag-on-the-page.md) (the total on the
  page), [0012](0012-interface.md) (the shell and the 2D flow view),
  [0014](0014-refusals.md) (what the logic refuses today, and why), and the
  paused branch of U2, merged here (section 10).

## 1. The users and their five tasks

DIY rocketeers and small rocketry teams flying beyond Mach 1, who know
OpenRocket and have little experience of simulation software. In order of
how often they will come:

1. **See what it does:** open the page, watch the air flow round a rocket,
   read its drag curve.
2. **Their own rocket by hand:** type the diameter, the nose, the body, the
   fins and the flight, and get its curve.
3. **Their OpenRocket design:** import the .ork, see what was taken and
   what could not be, and get its curve.
4. **Read the answer:** C_D at a Mach number, with its band and what the
   status means; for a point without a number, why, and what they could
   change.
5. **Take it away:** the curve as CSV (for OpenRocket's or RASAero's drag
   override, or a spreadsheet), and a picture of the flow.

## 2. The page

`/` becomes the app (the landing's text moves to About). The canvas spans
the whole window behind the panels, as in 0012; the panels float over it,
each collapsible, and the scene is fitted into the part left uncovered.

At 1440 by 900:

```
┌──────────────────────────────────────────────────────────────────────────────────────────────┐
│ bowshock   Rocket: [Basic Finner ▾] [Import .ork]  Units [mm|in]       Validation About ? ⤢ │
├────────────────────────┬──────────────────────────────────────────────────┬──────────────────┤
│ ROCKET              ⌄  │ M 2.00  0°  grid 382 × 40 cells (2 of 4)          │ DRAG CURVE    ⌄  │
│ ┌────────────────────┐ │ step 1 500  shock speed 2e-6  86 kcell/s          │ C_D              │
│ │ ◁═══════════|▟ 50mm│ │ SwiftShader  Solving point 3 of 11                │ 0.6┤ ┬           │
│ └────────────────────┘ │                                                   │    │ ●┬          │
│ Diameter  30 mm =1 cal │            3D VIEW (main canvas, black)           │ 0.5┤  ◆ ◆┬       │
│ Nose [◁][◖][◗][◜][◝]   │   the rocket with its fins, the shock surface,    │    │      ◆ ◇    │
│  Cone                  │   the airflow revolved about the axis; behind     │ 0.4┤         ◆   │
│  Length 85.07 mm       │   the base: marked "not simulated"                │ ───┼──┬──┬──┬──  │
│         = 2.836 cal    │                                                   │ no │× ×  ×       │
│ Body tube 214.9 mm     │                                                   │ number           │
│         = 7.164 cal    │                                                   │  1.0  2.0  3.0   │
│ Overall 10.00 cal      │                                                   │ Mach 2.00 ◆      │
│ Fins 4  root 30 mm ... │                                                   │ C_D 0.5501       │
│  (tip, span, sweep,    │                                                   │ 0.4823 to 0.6493 │
│   thickness, edges)    │                                                   │ ● Estimate: each │
│ Flight up to Mach 3.0  │                                                   │  part ... (1 line│
│  at altitude 0 m       │                                                   │ [Details][Table] │
│ Finest grid 160 cells  │ [3D | Side] legend: Mach 1.83 ▬▬▬▬▬ 2.12          │ [CSV] [PNG]      │
│  across: gives a band, │                                                   │ [Stop]           │
│  ~7 h a point here     │                                                   │                  │
└────────────────────────┴──────────────────────────────────────────────────┴──────────────────┘
   340 px                       about 720 px for the scene                      380 px
```

At 390 by 844 (phones, below 700 px, the 0012 sheet):

```
┌──────────────────────────────────┐
│ bowshock  [Basic Finner ▾]  ? ⋯ │ 44 px; Import and units under ⋯
├──────────────────────────────────┤
│ 3D VIEW (top 40%, about 330 px)  │
│ M 2.00  grid 382 × 40 (2 of 4)   │
├──────────────────────────────────┤
│ M 2.00  C_D 0.5501  0.482-0.649  │ pinned: the current point, always in view
│ ◆ Estimate          point 3 / 11 │
├──────────────────────────────────┤
│ The axisymmetric solution, re-   │ what the picture is, and what a
│ volved; fins are not in the air- │ cross means: always in view (the
│ flow. Hatched: behind the base.  │ View tab has the full note)
│ ✕ No number: the drag there ...  │
├──────────────────────────────────┤
│ [ Rocket ] [ Curve ] [ View ]    │ tabs
│ Rocket: the drawing, then the    │ the sheet scrolls; the canvas and
│ fields; Curve: chart, table, CSV;│ the pinned line do not
│ View: 3D or Side, fields, legend │
└──────────────────────────────────┘
```

Without WebGPU the note's first line says instead that this browser has
no WebGPU, so no airflow is solved here, and to open the page in a recent
Chrome or Edge; the cross's line stays (`scripts/app-view-checks.mjs`
checks both at 390 px).

## 3. Components

| Module                                    | What                                                                                                                                                                                                                | DOM |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- |
| `src/rocket/design.ts`                    | The rocket model (section 4.1). Committed with this plan.                                                                                                                                                           | no  |
| `src/rocket/adapter.ts`                   | RocketDesign and a Mach number to TotalDragForm (calibres), or every feature it cannot represent, with the reason (section 4.2).                                                                                    | no  |
| `src/rocket/geometry.ts`                  | The rocket's outside in calibres: the profile from `noseRadius`, the fins' outlines and their side-view projection for any count (section 7). One geometry for the builder's drawing, the 2D view and the 3D scene. | no  |
| `src/rocket/presets.ts`                   | The Basic Finner and two examples (section 9).                                                                                                                                                                      | no  |
| `src/rocket/units.ts`                     | mm and inches, and the calibre value beside each length.                                                                                                                                                            | no  |
| `src/app/curve.ts`                        | The curve: its points, their order, each point's state (section 8), cancel; the GPU solve and the logic passed in, so it is tested with a stand-in solver.                                                          | no  |
| `src/app/status-words.ts`                 | Every claim, refusal reason and solve outcome to its plain word and sentence (section 5), exhaustive by type, so a new kind from the logic fails the build until it is worded.                                      | no  |
| `src/app/curve-csv.ts`                    | The CSV (section 8.4).                                                                                                                                                                                              | no  |
| `src/ui/rocket-drawing.ts`                | The builder's drawing: SVG, shaded, with the fins and a scale bar in the user's units.                                                                                                                              | yes |
| `src/ui/builder.ts`                       | The builder panel: fields, units toggle (remembered), nose and edge pictures.                                                                                                                                       | yes |
| `src/ui/curve-chart.ts`                   | The chart (SVG) and the table: bands, status marks, the "no number" row.                                                                                                                                            | yes |
| `src/app/rocket.ts`, `index.html`         | The page: the shell of 0012, the builder, the scene, the result; the import flow.                                                                                                                                   | yes |
| `src/rocket/scene-rocket.ts`              | The 3D scene's rocket from the same geometry (section 6.1).                                                                                                                                                         | no  |
| `src/app/scene3d.ts`, `scene-keys.ts`     | The 3D scene's loader and legend; the app's one key map, the 3D view's keys and menu items (section 6.1).                                                                                                           | no  |
| `src/app/import-summary.ts`               | What an OpenRocket import took, noted and ignored, for the page (with `src/import/`, 0018).                                                                                                                         | no  |
| `src/render3d/` (another agent)           | The 3D scene (section 6).                                                                                                                                                                                           | yes |
| `src/ui/flow-view.ts`, `src/render/` (U1) | The 2D side view, secondary (section 6.3).                                                                                                                                                                          | yes |

The old drag page (`demos/nose-drag.html`, now 0012's U2 in the shell)
stays as **"All inputs (calibres)"**, linked from the result's details: it
has the inputs the builder does not ask (transition, wall temperature,
roughness, the section's ridge and bevels as fractions), and its GPU test
stays. `demos/flow-view.html` is replaced by the app and redirects to it.

## 4. The rocket model and the adapter

### 4.1 `RocketDesign` (committed)

Absolute lengths in metres, as OpenRocket stores them (radii given as
diameters), angles in degrees, positions from the nose's tip. It holds the
rocket's outside as it is, including what the logic cannot represent, so
that nothing is dropped on the way in: a nose (`NoseShape` of
`src/geometry/nose.ts`, OpenRocket's own shape definitions), body sections
front to back (tubes and transitions), fin sets (trapezoidal, elliptical or
freeform; thickness; a section: flat with each edge square, rounded or
bevelled, a wedge, a diamond, or OpenRocket's airfoil; position, rotation,
cant, fillets), other outside parts (lugs, rail buttons, pods, each with
its size, front and roll where the source gives them), the flight (the
highest Mach number it flies to, the altitude, and where these came from:
an OpenRocket file's simulation, the preset's figure, or as typed), notes
for what the source held that the model has no place for, and the source
(preset, .ork, typed). A transition may be `clipped`, OpenRocket's default
profile for the ellipsoid, power and Haack shapes (the part of a nose of
the larger diameter between the two diameters), drawn so.

### 4.2 The adapter: what maps, what is flagged

`designForm(design, mach)` returns the logic's `TotalDragForm` (lengths
over the body diameter; the flight condition by `flightConditionOf`, as
the drag page's `conditionOf` does) or, for each feature the logic cannot
represent, a flag with its reason and what to change. A flagged rocket
gets no number ("Not modelled", section 5). Tests: on the Basic Finner the
form equals the drag page's `formOf` for the same values field for field,
and every row below has its case.

| The design has                                        | Maps to                                                                                                                      | Or is flagged because                                                                                                        |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| a nose, then tubes of the nose's diameter             | `body`: the nose, one cylinder of their summed length                                                                        |                                                                                                                              |
| a transition (clipped or not), a tube of another size |                                                                                                                              | the logic takes one diameter to a flat base (a boat-tail is also refused by `src/base`, B2)                                  |
| one trapezoidal fin set (rectangular as a case)       | `planform`: rectangular, or trapezoidal with the leading-edge sweep atan(sweep / span) and the trailing edge's               | more than one fin set; elliptical or freeform fins (no planform for them); no fins                                           |
| flat fin, neither edge bevelled, any planform         | `flat-plate` (main since `c223856`): the thickness absolute (in calibres), each edge square or rounded (a full round)        | (the logic then serves or refuses each edge itself: a square leading edge, a rounded trailing edge, flat plates at the base) |
| flat fin, both edges bevelled, constant chord         | `hexagonal`, the bevels as fractions of the root chord                                                                       | tapered: the section in chord units would thin toward the tip                                                                |
| bevelled leading, square trailing edge                |                                                                                                                              | `src/fins` has it but `TotalDragForm` does not (0014, F12): a change for the logic's agents                                  |
| other pairs of a bevel and a square or rounded edge   |                                                                                                                              | no section form for them                                                                                                     |
| wedge (the Basic Finner's), constant chord            | `single-wedge`, its leading-edge radius                                                                                      | tapered, as for bevels                                                                                                       |
| diamond, constant chord                               | `double-wedge`, its ridge                                                                                                    | tapered, as for bevels                                                                                                       |
| an airfoil section                                    |                                                                                                                              | no section form for it                                                                                                       |
| launch lugs, rail buttons, pods, fillets, cant        | asked first ("Compute without it"); once chosen, the form without them, every number labelled "without the launch lug"       | (never dropped silently, never given a guessed allowance)                                                                    |
| fins at a position                                    | `trailingEdgeAheadOfBase` = base station minus (root leading edge plus root chord), within 1e-9 m of the base taken as at it |                                                                                                                              |
| flight: altitude; each Mach number of the curve       | Reynolds number and temperature by `flightConditionOf`, the diameter in mm                                                   |                                                                                                                              |

## 5. Status words

Each point shows one word and one sentence, beside its colour and mark;
Details shows the logic's own text, word for word (the claim, every
reason with its component and type, the class conditions, the notes, the
component table). The wording below must say the same as the logic's
claim, no more and no less. The word "Validated" is the logic's alone: it
appears only for its validated claim, and the point block then shows that
claim's text and caveats word for word.

**Points with a number** (`totalDragView` kind `total`):

| Logic                                                               | Word                   | Sentence                                                                                                                                                                         | Mark            |
| ------------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| claim `estimate`, text `ESTIMATE_CLAIM` (outside the class)         | Estimate               | Each part is computed inside its own band's range, but no measurement of a whole rocket like this checks the total, and the parts' bands are estimates here.                     | amber, ◆        |
| claim `estimate`, text `CLASS_CLAIM` (inside the class, suspended)  | Estimate, tested class | An estimate: this rocket and speed lie inside the one class tested in free flight (the Basic Finner), but that test's claim is suspended until a corrected part is tested again. | amber, ◆        |
| claim `estimate`, `BOUNDED_REASON` among its reasons (above M 2.56) | Estimate, bounded      | An estimate with one part bounded, not measured: the fins' effect on the base drag, whose band runs from no effect to its value at the last speed measured.                      | blue, ■         |
| claim `estimate`, `W1_BOUNDED_REASON` (the rebuilt factor, W1)      | Estimate, bounded      | An estimate with one part bounded, not measured: the fins' effect on the base drag, whose band the rebuilt factor sets from bounds, not from a measurement of these fins.        | blue, ■         |
| claim `validated` (the BRL sub-class, main's cb632df)               | Validated              | Tested once in free flight at these conditions (BRL Report 934, seven rounds) and passed, inside a wide tolerance; only for this narrow sub-class of the Basic Finner.           | green, ●        |
| our own: the nose still solving                                     | Provisional            | Not finished: the nose is solved on grid k of n; no band yet.                                                                                                                    | grey, ○, no bar |

The logic makes two kinds of claim: validated, only inside the Basic
Finner's narrow BRL sub-class (0014 section 10.7 (q)), and an estimate
everywhere else (the class's own claim stays suspended, 0010 section
11.7); the words follow its text and reasons. The curve's regular points
never fall in the sub-class's Mach windows (1.801 to 1.827 and 2.423 to
2.468), so a rocket the logic places inside the sub-class gets a point in
each window (section 8.1), noted "Mach window BRL Report 934 tested
(a to b)" in the table, the chart (a green band, "BRL 934 tested") and
the CSV row, and in the point block beside the logic's claim (alone on a
point without a number), so that it never reads as a result; the point
block shows the logic's claim text and caveats word for word. With a nose
term not verified, no claim is more than an estimate (0011 section 4) (`tests/app/tested-windows.test.ts`,
`tests/app/numbers.test.ts`). A new kind fails the build
(`src/app/status-words.ts`) until it is worded here and there.

**Points without a number** (kind `refused`, the nose solve's outcomes,
and the adapter's flags): the word is **No number**, the mark a red ✕ in
the chart's "no number" row, and the sentence "The drag here cannot be
given to a known accuracy:" with its plain reason, or, where the logic
gives several, "two (three, ...) reasons, each listed below" and every
reason in plain words, each once, in the point block and the table (the
logic's own text in Details). Then what the user could change, for all
the reasons together: "To get a number: ..." only where there is one
reason; "Nothing about the rocket changes this" where any reason has no
change about the rocket ("or the browser" beside the no-WebGPU reason);
otherwise "No one change gives a number here: each reason needs its own"
with each change. A change is never offered as giving a number while
another refusal stands (`tests/app/refusal-list.test.ts`, every preset,
with and without WebGPU).

| Reason (component)                                          | Plain reason                                                                                                                                                                                                                                                                                                    | What you could change                                                                                                                                                             |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `mach-range` (body base, fins-on-base factor)               | the drag behind the base is known from measurements only at other speeds                                                                                                                                                                                                                                        | nothing in the rocket; this speed has no number yet                                                                                                                               |
| `mach-range` (fin trailing-edge base)                       | a square trailing edge's drag is measured only at other speeds                                                                                                                                                                                                                                                  | a bevelled (sharp) trailing edge                                                                                                                                                  |
| `afterbody`                                                 | base drag is measured only for a straight body to a flat base                                                                                                                                                                                                                                                   | a body without a boat-tail or flare                                                                                                                                               |
| `laminar-base`, `laminar-trailing-edge`                     | the air would reach the base smooth (laminar); base drag is measured with turbulent air only                                                                                                                                                                                                                    | (only from an input of the advanced page)                                                                                                                                         |
| `fins-near-base`                                            | fins ending less than a root chord ahead of the base: no measurement of the base drag with them there                                                                                                                                                                                                           | the fins' trailing edges at the base, or a root chord or more ahead of it                                                                                                         |
| `fin-count`                                                 | with fins at the base, the base drag is measured with four fins only                                                                                                                                                                                                                                            | four fins, or fins a root chord or more ahead of the base                                                                                                                         |
| `fin-thickness`                                             | with fins at the base, the base drag is measured for fins 5% to 10% as thick as their root chord                                                                                                                                                                                                                | that thickness, or fins a root chord or more ahead of the base                                                                                                                    |
| `fin-sweep`                                                 | with fins at the base, the base drag behind wedge or bevelled fins is measured only unswept or at a few sweeps (a tapered fin has a swept edge); flat fins with a square, unswept trailing edge are taken at any leading-edge sweep, but below Mach 1.62 only unswept or swept 45 deg or more (0015 section 12) | flat fins with a square, unswept trailing edge (below Mach 1.62, unswept or swept 45 deg or more); unswept fins of constant chord; or fins a root chord or more ahead of the base |
| `fin-sweep` (flat fins swept under 45 deg, below Mach 1.62) | below Mach 1.62 the base drag behind flat fins at the base is measured only with fins swept 45 deg, and nothing measured shows a lighter sweep gives the same (0014 10.7 (z), the note of 2026-10-27)                                                                                                           | flat fins swept 45 deg or more at the leading edge, or unswept ones; or fins a root chord or more ahead of the base                                                               |
| `flat-plate-fins` (main since `e42d5d4`)                    | flat plates at the base lower the base drag by up to 15% in the one measurement of them, not covered                                                                                                                                                                                                            | fins a root chord or more ahead, or wedge or bevelled fins at the base                                                                                                            |
| `fin-trailing-edge` (main since W1, `b86c308`)              | measured here only for flat fins with square trailing edges or sharp ones, not a wedge's thick end or a round                                                                                                                                                                                                   | those trailing edges, or fins a root chord or more ahead of the base                                                                                                              |
| `rounded-trailing-edge`                                     | a rounded trailing edge's drag is not shown to be below a square edge's, so it cannot be bounded yet                                                                                                                                                                                                            | square or bevelled trailing edges                                                                                                                                                 |
| `square-leading-edge`                                       | a square-cut leading edge's drag cannot yet be bounded from measurements                                                                                                                                                                                                                                        | rounded or bevelled leading edges                                                                                                                                                 |
| `swept-trailing-edge`                                       | a swept square trailing edge's drag is not measured                                                                                                                                                                                                                                                             | an unswept trailing edge, or a bevelled one                                                                                                                                       |
| `thick-layer`                                               | the square trailing edge is thin against the air's boundary layer there; not measured                                                                                                                                                                                                                           | a thicker trailing edge, or a bevelled one                                                                                                                                        |
| `beyond-read-range`, `input`, `planform`                    | the logic's message, as it says it                                                                                                                                                                                                                                                                              | from the message                                                                                                                                                                  |
| `input`, the fins' place below zero                         | the fins reach past the base                                                                                                                                                                                                                                                                                    | first: fins whose trailing edges are at the base or ahead of it; the rocket's other checks are made only then                                                                     |
| `subsonic-free-stream`                                      | at Mach 1 and below the fins' method does not apply                                                                                                                                                                                                                                                             | nothing in the rocket; this speed has no number yet                                                                                                                               |
| `fins-own-drag-mach` (main since `7411c70`)                 | the fins' own drag is checked against flight measurements only from Mach 1.5 to 2.96, its error growing below                                                                                                                                                                                                   | nothing in the rocket; this speed has no number yet                                                                                                                               |
| `detached-shock`, `subsonic-behind-shock`                   | the fin's edge turns the air more than it can at this speed: the shock stands off the edge                                                                                                                                                                                                                      | a sharper leading edge (a longer bevel) or a thinner fin                                                                                                                          |
| `compression-corner`, `expansion-limit`                     | the fin's section has a corner the method does not model                                                                                                                                                                                                                                                        | another section                                                                                                                                                                   |
| `reflected-wave`                                            | a wave from the leading edge's shock could land on the fin; not modelled                                                                                                                                                                                                                                        | a longer bevel or a thinner fin                                                                                                                                                   |
| `swept-leading-edge`                                        | a swept rounded leading edge's drag is not measured                                                                                                                                                                                                                                                             | an unswept leading edge, or a bevelled one                                                                                                                                        |
| `leading-edge-range`                                        | measured only where the Mach number across the edge is 1.0 to 3.0, and for edge sizes in its data                                                                                                                                                                                                               | a bevelled leading edge                                                                                                                                                           |
| `leading-edge-geometry`                                     | a rounded leading edge is modelled only on a wedge-shaped fin, not on this one                                                                                                                                                                                                                                  | a bevelled leading edge                                                                                                                                                           |
| `not-verified` (the nose: no band)                          | the airflow round the nose did not settle to a measured accuracy on the grids solved                                                                                                                                                                                                                            | the finer grid (320 cells across), where 160 was used                                                                                                                             |
| the nose solve refused (`invalid`, a thrown case)           | the airflow solver does not serve this nose at this speed: its reason                                                                                                                                                                                                                                           | from the reason (a more slender nose, a higher speed)                                                                                                                             |
| `not-converged`                                             | the airflow solve did not settle                                                                                                                                                                                                                                                                                | the other grid                                                                                                                                                                    |
| `not-computed`                                              | a method failed: its message                                                                                                                                                                                                                                                                                    |                                                                                                                                                                                   |
| no WebGPU; the GPU lost or failed                           | this browser cannot run the airflow solver; the GPU failed                                                                                                                                                                                                                                                      | another browser; reload                                                                                                                                                           |
| the flight condition (altitude out of range)                | the condition's own reason                                                                                                                                                                                                                                                                                      | an altitude within the range                                                                                                                                                      |
| the adapter (section 4.2): Not modelled                     | the row's reason                                                                                                                                                                                                                                                                                                | the row's change                                                                                                                                                                  |

Below Mach 1.2 every point is computed as at any other Mach number and
shows what the logic returns there (today: refused, with its reasons).

## 6. The airflow: the 3D scene, the side view, and what is true

### 6.1 What the page hands the 3D scene

The page owns the rocket, the curve and the GPU device; the scene
(`src/render3d/`, merged from its branch) draws. As built
(`src/app/rocket.ts`, `src/app/scene3d.ts`, `src/app/scene-keys.ts`):

| Call                                       | What the page gives                                                                                                                                                                                                                                                                                                                                                                                               |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `FlowScene3D.create(device, canvas, ...)`  | the solver's own device (the live fit's buffers are read where they are), the presentation for the adapter, `liveDuty` = `FRAME_BUDGET` (section 6.4); loaded on its own once the GPU is up                                                                                                                                                                                                                       |
| `setRocket(rocket)`                        | `sceneRocketOf(design)` (`src/rocket/scene-rocket.ts`): the body the solver is given and the fin set as `src/rocket/geometry.ts` draws it (outline, thickness at its own size, place, roll), equal to the logic's own for every preset; what it cannot draw is named in the note                                                                                                                                  |
| `setUnits`                                 | the free stream's temperature at the point, for speeds in m/s and temperatures in K                                                                                                                                                                                                                                                                                                                               |
| `setFlow(liveFitSource(live))`, `freeze()` | each grid's live fit; freeze when it ends. Both views get every grid; only the view shown draws live                                                                                                                                                                                                                                                                                                              |
| `setStatus`                                | the steps and the measured cell rate, for its PNG's readout                                                                                                                                                                                                                                                                                                                                                       |
| `setLayers({ overlay: false })`            | the page draws its own readout, legend and notes (HTML, accessible, the same in both views); the scene's text is in its PNG                                                                                                                                                                                                                                                                                       |
| `onScale(listener)`                        | the page's legend: the quantity, its unit and range, the free stream's value, the shells' values, the cells' extremes where the bar clips them, what black means, the hatch                                                                                                                                                                                                                                       |
| `fit(rect)`                                | the part of the window the panels leave free, a little inset (the scene lets the shock's far reaches leave the view, never the rocket)                                                                                                                                                                                                                                                                            |
| `pngBlob(lines)`                           | the rocket (and the parts left out), C_D, band and status; then the scene's grid, steps, Mach number, legend and notes                                                                                                                                                                                                                                                                                            |
| `attachControls(..., { keys: false })`     | drag (or one finger) to turn the view any way, a trackball with no limit about the rocket's centre on its axis, which stays at the centre of the view (over the top, underneath, nose-on; the orientation a unit quaternion, `src/render3d/camera.ts`), F or 0 back to the first view and the pivot back to the rocket; right or Shift drag to pan, the wheel or a pinch to zoom; the keys are the page's one map |

**One key map.** The page's keys (V, Space, R, F or 0, + and -, the
arrows, K, H) act in both views. The 3D view's (FluidX3D's: 1 rocket,
2 slice, 3 streamlines, 4 shells, 5 shock, 6 cutaway, Z colour, T slice
orientation, Q and E; and bowshock's 7, the slice's look, and 8,
the dense streaks) act only while it is shown, through render3d's own `sceneKey`
and `sceneExtraKey`; the side view's (1 to 4 fields, 5 glow, D, G, S) only while
it is. A binding has `when` and a help `group`, and the help lists each
view's keys under its name; the View menu and the phone's View tab have
a button for each. A test holds that every key has one action in either
view. **The default look** (section 6.6, 2026-10-23, after the owner's
"still not detailed enough, make it look more like fluidx3d") is
FluidX3D's particle mode as far as this flow allows: tens of thousands of
short lit streaks along the computed flow through the whole revolved
region (key 8: still, moving, off), the 20 to 40 iso-surfaces of the
colour quantity as thin glowing sheets behind them (key 4: solid, none,
glowing), the shock as one crisp sheet, the body coloured by its computed
surface pressure, and a thin box over a dim floor grid; the slice (key 2,
its fibres or schlieren by key 7) and streamlines (key 3) are off. With no airflow shown the 3D view follows the builder; when the
rocket changes the flow is cleared, so that no view shows one rocket
with another's flow.

### 6.2 What must be true in every view

At zero incidence the axisymmetric field revolved about the axis (3D) or
mirrored (2D) is exact; outside the fitted bow shock the flow is the free
stream, exactly, and is shown so (the 2D view does, `fca08a8`); behind
the base the solver computes nothing, and that region is marked "not
simulated", never painted, and never in the colour that means uniform
flow; the fins are drawn as geometry, with the note "The axisymmetric
solution, revolved; fins are not in the airflow" on the 3D legend and in
the 3D PNG (the advisor's item 10, 2026-10-22: the shells look like a
3D solver's picture, so the page says this flow is not 3D), and "the fins' drag is
computed separately"; every colour or brightness channel has a legend with
real values and units, and says what dark means.

### 6.3 The side view (2D), secondary

The 2D flow view of 0012 U1 stays: a "3D | Side" switch on the view (key
V), with schlieren, Mach, Cp and density (keys 1 to 4), split, grid lines
and the shock line. It is also the fallback where the 3D scene cannot run,
and what the GPU tests probe. It gets the rules of 6.2 that it lacks: the
fins drawn in projection, the region behind the base hatched and labelled
"not simulated", the body shaded as a solid. On the owner's notes it draws
in the 3D scene's spectrum, uniform flow black, its default the glow (the
Mach number in colour, brightest where the density changes, key 5), with
the brightness channel in the legend.

### 6.4 Frame pacing: what drawing live costs the solver

The claim (0012 U1, `tests/gpu/flow-view-cost.test.ts`, unchanged):
drawing the flow live costs the solver less than a tenth of its steps.
On a real GPU a frame costs about a millisecond. On a software adapter
(SwiftShader, as on CI) the frames and the solver share the same CPU
cores, and a fixed 30 frames a second took 13% of the steps on CI (drawn
over unwatched 0.868, against the test's 0.9).

What the page does now (`src/ui/flow-view.ts`):

- Each live frame's cost is measured: from the moment the work queued
  before it (the solver's) is done to the moment the frame is done and
  shown (`onSubmittedWorkDone` before and after its submission, and the
  presentation). Work completes in order, so this is the frame's own GPU
  time, not the solver's. It is smoothed (0.7 of the last estimate, 0.3
  of the new frame).
- The next live frame is due no sooner than cost / `FRAME_BUDGET` after
  the last, with `FRAME_BUDGET` = 0.04, and at most 30 a second. Frames
  so take about 4% of the time on any adapter: on a fast GPU the view
  draws 30 frames a second; on SwiftShader on this machine, loaded by the
  solver runs, a 1280 x 720 frame cost about 0.2 s and the view drew 0.2
  frames a second.
- A change the user makes (a field, a pan, a zoom) is drawn at once, as
  before; only the live redraws are paced.
- Only the view shown draws live. The hidden one (3D or side) keeps its
  box and its last frame, not seen and out of the accessibility tree; it
  draws no live frames, only once as each grid begins and ends (a few
  frames a point), so that a switch shows a recent frame at once.
- The 3D scene is held to the same share: the page creates it with
  `liveDuty` = `FRAME_BUDGET` (its own pacing, by its frames' measured
  cost, the same way).

Measured with the test as it is (SwiftShader, 4 cores loaded by other
solver runs): steps per second without the view 34, 29 and 33; drawn
live 34, 36 and 35; 0.2 frames drawn a second; cost -5.6%, within the
noise, against the threshold of 10%.

### 6.5 When the 3D view does not set up (investigated 2026-10-22)

The import screenshot of `eceab88` (`docs/research/interface/app-import-1440.png`)
was taken in a third browser page in which the 3D view did not set up: the
side view showed, with its field mode bar and no 3D | Side switch. The
toast that said why had gone after 8 s, and nothing else recorded it.

SwiftShader limiting concurrent WebGPU pages is not the cause.
`docs/research/interface/3d-setup/pages.mjs` opens N app pages in one
Chromium on SwiftShader, each left open and solving on its own device:
with N = 3, 4 and 8 (the machine loaded at about 10), the 3D view set up
in every page; with an .ork imported as the page opened, it set up too.
What reproduces the screenshot exactly is the 3D view's own code failing
to load: it is a chunk of its own, fetched when the GPU is up, so a
dropped connection or a site rebuilt while the page was open (new chunk
names) makes the import fail; with `BLOCK=1` the script refuses that
chunk and the page falls back exactly as in the screenshot. Whether
that run rebuilt the site beside open pages was not recorded, so the
cause of that one picture is not proven; it is the one cause found.

The fallback now says which step failed, plainly, in three places: the
toast ("The 3D view could not be set up: its code could not be fetched
(...); reloading the page may fix it", or "the GPU did not set it up
(...)" with the GPU's own message), the airflow's note, which stays, and
the console as an error, so that `scripts/interface-check.mjs` fails on
a page whose 3D view did not set up instead of taking its picture.

### 6.6 The look: opaque lit sheets of the real field (2026-10-23)

The owner's reference is FluidX3D's F1 render (its pictures only, never
its code). What makes that look, and what bowshock takes from it:

- **Opaque, lit surfaces.** FluidX3D's structures are opaque surfaces
  shaded per pixel by a directional light, so their ridges band light and
  dark and the picture has depth. The 3D view's iso-surfaces are now
  opaque and depth-tested (`shell_lit_fs`, `src/render3d/shaders/revolve.wgsl`):
  the palette's colour times an ambient share and the diffuse light from
  over the viewer's shoulder, a little specular, darker where a sheet
  turns from the eye. The additive glowing shells stay as key 4's third
  state (solid, none, glowing).
- **Density from the real field.** 20 to 40 levels at round values of
  the colour range (`ISO_SURFACES` = 40 asked; round steps give between
  half and all of that), each an iso-surface of the computed field,
  revolved; where the cutaway cuts them, each sheet's edge is a line of
  its colour, so neighbouring sheets read as separate. Details ("The 3D
  picture") and the PNG say how many and how far apart ("28 shells, every
  0.01 from 1.66 to 1.93").
- **The shock** is one thin pale sheet where the solver fits it (the
  density's jump), brightest edge-on as in a schlieren picture, with a
  crisp white line where the wedge cuts it.
- **The spectrum** runs blue, azure, cyan, green, yellow, orange, red,
  with magenta at the top (FluidX3D's order); one table for the 3D view
  and the side view (`src/render/colormap.ts`).
- **Restraint.** Black background, a thin dim box, the fins a solid lit
  grey (geometry, not in the airflow), no streamlines by default;
  streamlines (key 3) are a few lit tubes (6 a plane, 8 azimuths, also in
  the cutaway), not a mat of 1-pixel lines. The page's note and legend sit
  compact in the bottom left corner, not over the flow. The legend is
  short (the owner, 2026-10-23): the colour bar and its range, the two
  honesty lines of section 6.2 ("the axisymmetric solution, revolved;
  fins are not in the airflow, their drag computed separately";
  "hatched: behind the base, not simulated"), always shown, and one line
  for each layer shown that needs it ("texture follows the computed
  flow"; "body: computed surface pressure, blue low, red high";
  "streaks follow the computed flow; start points spread by the page") and the
  drag hint ("Drag to turn it; 0 resets"). A button folds the layer lines
  and the hint away; the honesty lines stay, folded or not. Beside it the
  airflow's note box says only what the legend does not (the rocket's
  parts the 3D view cannot draw), so the base line is said once. The rest (the free stream's value, the shells' count and
  spacing, the cells beyond the bar, what black means, each layer's
  numbers and source) is in Details under "The 3D picture", and the PNG
  keeps the fuller text.

**The cutaway (2026-10-23, the owner's choice after the side-by-side:
more of the inner sheets).** The wedge opens 150 degrees, centred where
the quarter cut was. Tried 90, 150 and 180: at 150 the nested sheets
show from the shock to the body across most of the picture, the rocket
and two fins are in plain sight, and the 210 degrees left still read as
a solid of revolution; at 180 the default view is a flat half-section.

**Detail from the computed field (2026-10-23, the owner: "too generic").**
Every layer below is drawn from the solver's field; the only thing in
them it did not compute is the noise the fibres are made from, which
carries direction and nothing else, and the legend says so.

| Layer                                                                   | What it shows                                                                                                                                                          | Where it comes from                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The field's image (`src/render3d/field-image.ts`, `field-image-gpu.ts`) | not drawn itself: the texture the faces and the sheets' fibres sample                                                                                                  | the dual mesh rasterised on the GPU: velocity, the value shown, the schlieren, linear across each quad; square texels, about as many across as the view (512 to 1280, half in a draft)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| Fibres on the slice (key 7: fibres)                                     | a fine grain along the flow, coloured by the quantity                                                                                                                  | line integral convolution: each texel the mean of white noise along the streamline through it, traced both ways (32 steps of a grain each, second order) in the image's velocity; the noise's grains are at least a screen pixel (texels per pixel of the fitted view, 1 to 6), so a small face (a phone, the live view's draft) shows fibres, not grain                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Fibres on the sheets                                                    | streaks along each sheet's meridians, strongest where the flow runs along the sheet                                                                                    | the flow has no swirl, so on a sheet of revolution it runs along the meridians; streak noise laid along them, its strength the computed velocity's share along the sheet                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Schlieren (key 7: schlieren)                                            | black to white: where the density changes fast                                                                                                                         | log10 of the density gradient's magnitude times the calibre over the free stream's density, from the grid's own metric (central differences), 5th to 99.5th percentile; the shock's jump is not in it (the computed region starts at the shock, which is fitted), and the shock is drawn separately as a line where the solver fits it (key 5)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| The body's colour                                                       | the computed surface pressure coefficient, blue (suction) through light grey (0) to red                                                                                | the pressure in the cells on the wall, along the body; the fins and the base stay grey (the fins are not in the airflow; nothing is computed behind the base)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| Dense streaks (key 8: still by default, moving, off)                    | tens of thousands of short lit streaks, coloured by the quantity, brighter at their heads, through the whole revolved region (few in the cutaway, so the rocket shows) | traced on the GPU in the field's image (`streaks-compute.wgsl`): from each start, 6 steps of 0.9% of the region's length along the computed velocity, second order; the steady flow's pathlines are its streamlines. The starts are the page's: 25% near the body, 15% near the shock, the rest even in volume, each at an azimuth of its own. 60 000 streaks on a hardware adapter, 40 000 on a software one, fewer (down to 4 000) if a frame takes over 4 s; moving, the starts slide along their streamlines at one pace (not the flow's speed) and the streaks are traced again each frame, at most half the time (the live share while the solver runs). The count only goes down. `tests/gpu/streaks.test.ts` holds them to a synthetic field's exact streamlines (circular arcs: downstream, every step one step long, on its arc to second order), with the moving lead, the cutaway's thinning and the stop at the base |

One face of the cutaway carries the slice's texture and the other is left
open, so the sheets show beside it. The fins already had their real
thickness and edge shapes (round, bevel or square, `rocket-mesh.ts`).
**The grid drawn** is the one the solver is on, the finest so far; the
readout says which ("grid 318 x 40 (2 of 4)") and the PNG's caption gives
its size; the image samples it with linear interpolation at about the
view's resolution.

**The rocket in plain sight (2026-10-23).** The streaks in front of the
rocket buried it in the page's own view; it is now drawn a second time,
last, its near side only, where something stands in front of it (the depth test
reversed), at 0.6 opacity, so it shows through the streaks and sheets
from any view, while solving too.

**Framing and light (2026-10-23).** A dim floor grid under the box, the
first view 1.25 times closer than the one that fits the whole region (the
shock's far reaches may leave the view, never the rocket), the streaks lit
as thin tubes and dimmed with distance from the eye (a depth cue). Not
done: screen-space ambient occlusion and shadows. Both need the depth of
the frame as a texture (a depth pass of its own, as the frame is
multisampled), about doubling a frame's cost on a software adapter, where
frames already take seconds; a later pass can add them for hardware
adapters only.

**What is not taken, and why.** FluidX3D's F1 shows turbulence: vortex
tubes, wakes, fine-grained texture, all of a 3D, viscous, unsteady
solution. This flow is axisymmetric, inviscid and steady at zero
incidence: it has no vortices and no turbulence, and every surface
drawn is a sheet of the computed field, smooth because the field is
smooth. So the 3D view looks cleaner than FluidX3D's, on purpose. Nothing
is drawn behind the base (hatched, "not simulated"), and the legend and
PNG keep "the axisymmetric solution, revolved; fins are not in the
airflow".

**Cost.** The revolved surfaces are one indexed draw (each point turned
once per azimuth, 144 sectors a turn, 64 in a draft), cut at the base on
the CPU so the depth test runs before shading; lines are one draw of six
vertices a quad, not an instance a quad (SwiftShader pays per instance).
Outer sheets are drawn first. Measured on SwiftShader at 1440 x 900, the
old and new default frames back to back on the loaded machine (load 4 to
7): old 1.8 to 2.6 s, new 2.2 to 2.6 s; drafts 0.7 to 0.9 s for both. Live
frames keep `FRAME_BUDGET` (section 6.4); while the viewer turns, pans
or zooms on a slow adapter the frames are drafts and a full frame
follows 350 ms after the last move. With the detail layers (the field's
image and fibres are built once per flow, not per frame), the default
frame measured 2.1 to 3.7 s at 1440 x 900 and 1.0 to 1.6 s at 390 x 844 on
the same loaded machine; moving streaks draw drafts.
`tests/gpu/render3d.test.ts` (every layer and look, full and draft),
`tests/gpu/render3d-cost.test.ts` and `tests/gpu/app-page.test.ts` pass.

## 7. The rocket drawing

`src/rocket/geometry.ts`, tested without the DOM: the nose's profile
sampled from `noseRadius` (denser near the tip), the tubes, the fins'
outlines. In the side view fin k at roll angle phi_k = rotation + 360 k /
n spans y from R cos phi to (R + span) cos phi; fins toward the viewer are
drawn over the body, those away from it behind (hidden where the body
covers them), and a fin seen edge on is its thickness. So four fins at 0
deg show two in full and one edge on, three fins show one in full and two
foreshortened to half their span beyond the body. Tests: the profile
against `noseRadius`, the projected areas for 3 and 4 fins at several
rotations, the hidden parts. The builder's SVG shades the body as a
cylinder (light from above), the fins flat with their edges, and puts a
scale bar of a round length in the user's units (10, 20, 50 or 100 mm, or
1, 2 or 5 in).

## 8. The curve

### 8.1 Points and order

Mach 1.0 to 3.0 whatever the rocket flies to, every 0.2 by default (11
points), every 0.1 as the other choice (21). Where the rocket and its
flight lie inside the Basic Finner's BRL sub-class (the logic's own
check, `brl934SubClass`, at that Mach number), the curve adds a point in
each Mach window BRL Report 934's range A tested, the windows read from
the logic (`BRL934_SUB_CLASS`): the window's centre rounded to the
curve's two decimals, the precision every Mach number is shown to, so
that the point shown is the point solved, kept only strictly inside the
window (1.81 in 1.801 to 1.827, 2.45 in 2.423 to 2.468). They are solved
and labelled like any point, Validated only where the logic says so; no
point is added for any other rocket, nor without WebGPU (it could never
be solved there). The flight's highest Mach
number is marked on the chart and said beside it with where it came from
(an OpenRocket file's own simulation is often subsonic: 15 of its 16
examples fly below Mach 1). At
the start every point is put to the logic with the nose pending
(`totalDragView` with `{ kind: 'pending' }`): a point refused for reasons
other than the nose is final at once, with its reasons. The others are
solved one at a time, coarse to fine (1.0 and the top first, then the
middle, then the middles between), so that a curve stopped early still
spans its range; the chart marks the point being solved. Amended
2026-10-24 (0011 section 10, the owner's decision 7.8): after those, the
points refused for reasons other than the nose are solved too, in the
same coarse-to-fine order, for their nose's part alone, so that each
shows its nose wave drag among the parts served and, where 0011 section
10.3 allows, a floor; while solving such a point shows as solving, before
and after as a cross with its reasons, and the selection does not follow
it (a finished curve shows the last point with a number, as before). A
stop or a failed GPU leaves such a point's refusal as it was. Without
WebGPU none is solved. (This section said until 2026-10-24 that a curve
refused at every point solved its top point for the airflow alone; the
code never did, and does not.)

### 8.2 One point

The nose by `verifiedFittedDragGpu` on nested grids to the finest chosen
(160 cells across, four grids, by default; 320, five grids, the other
choice), exactly as the drag page calls it. After each grid the point is
**provisional**: the logic's total with the nose at that grid's value
(given to `totalDragView` as a solved nose of zero band, for this alone),
drawn as a hollow mark without a bar, with no band or claim shown, "grid k
of n"; it is never exported. When the solve ends, the
point is `totalDragView(form, noseStateOf(outcome))`: a number with its
band and claim, or no number with every reason. Stop cancels between
convergence checks (the solver's signal); the page stays responsive (the
solver yields between batches, as on the live flow page).

### 8.3 Time, measured

The work of one point at 160 cells across, the Basic Finner at Mach 2, as
the page solves it on SwiftShader here (`docs/research/interface/timing/`):
191 x 20 cells for 750 steps (48 s, with the page's start), 382 x 40 for
2 000 (432 s) and 764 x 80 for 3 000 (3 096 s, 52 min), measured; 1528 x
160 had not reached its first check (every 2 000 steps) after an hour at
55 kcell/s, about 7 h by that rate. That is about 2.2e9 cell updates a
point, 88% of them on the finest grid; at 320 cells across, about 1.8e10,
eight times as many.

| Where                                  | Cell rate                                 | One point, 160 across | The Basic Finner's 7 solved points |
| -------------------------------------- | ----------------------------------------- | --------------------- | ---------------------------------- |
| SwiftShader, here (4 cores, loaded)    | 55 to 96 kcell/s, measured                | about 8 hours         | about 2 to 3 days                  |
| A real GPU (an estimate, not measured) | 2e7 to 3e8 cell updates a second, assumed | about 10 s to 2 min   | about 1 to 14 min                  |

The real-GPU row is an assumption (integrated to discrete GPUs, these
grids' sizes), not a measurement: the owner can replace it by reading the
cell rate off the readout on their own GPU (one run of the live page).
The page measures its own: after the first grid it states "about N
minutes a point on this GPU" from its measured rate and the cell updates
above, and after the first point, from that point's time. The grid choice
says its consequence beside it: "160 cells across: gives a band; about N a
point here" and "320 cells across: a band from five grids; about 8 times
as long".

### 8.4 Chart, table, CSV

The chart: C_D against Mach 1.0 to 3.0, each number with its band as a
bar, its mark and colour by status (section 5); below the axis a labelled
"no number" row where refused points sit as red ✕ at their Mach number, so
that a refused point reads as a result, not a gap; points still to come as
faint ticks on the axis. Selecting a point (click, or arrows with the chart
focused) shows it as the current point. The table is the chart's text:
Mach, C_D, band, status word, and the plain reason or the one-line claim.
CSV, one row per point, after a header naming the rocket, the altitude, the
grid and the build:

```
mach,cd,cd_low,cd_high,status,reason
2.0,0.5501,0.4823,0.6493,estimate,"<the logic's claim text> Because: <its reasons>."
1.4,,,,refused,"body base (mach-range): the base-pressure correlation's band ..."
```

`cd_low` and `cd_high` are the model-form band rounded outward (as shown);
`status` is the logic's kind (`estimate` today, or `refused`, or no number
for a point not modelled, asking about its parts, or not finished);
`reason` the logic's claim text and its reasons, prefixed "Computed without
..." when parts were left out. A test pins the format. Since 2026-10-24
(0011 section 10) a refused row's `reason` also carries the parts served,
each with its band and label, and the floor with its label (or why none
is given), and a seventh column, `floor`, holds the floor alone; it is
never written in `cd`, `cd_low` or `cd_high`, and the chart draws no mark
for it.

### 8.5 The points near Mach 1 (1.0 to 1.2): planned, not wired

The transonic agent's solve (`verifiedTransonicDrag(body, options,
gpuTransonicEngine(device, { sweeps }))`, branch `transonic-mach1`, under
independent review) gives the nose term from Mach 1.0 up to, not
including, 1.2 (its RangeError says so); the fitted solve keeps 1.2 and
up. Nothing of it is on the page until it is reviewed and on main, and no
prototype uses its GPU path (it cycled with 4 sweeps; the fix comes with
its S5 commit). Until then the points below Mach 1.2 are put to the logic
as every point is: today it refuses them (the fins' own drag below Mach
1.5, the base), and the curve shows them as results with their reasons.
The result type is final; the page will take it so:

- **Which solve.** The curve's solver is chosen by Mach number, the
  transonic one below 1.2 (`CurveRun` takes both, a stand-in for each in
  its tests). Its outcome goes to the logic through the solve's own bridge,
  `transonicNoseTerm(result)` (`{ kind: 'solved', solve: { value,
uncertainty, grids } }` for `noseComponentOf`, `band` being a half-width
  as `VerifiedDrag.uncertainty`; `{ kind: 'refused', message }`; null when
  cancelled): the page never combines bands. `noseComponentOf`'s label
  names the fitted solver (0006) today; for these points it must name the
  transonic solver and its record (0013), a change to
  `src/app/total-drag.ts`'s label (not its numbers) to make with the
  wiring.
- **While it runs (minutes a point).** "Solving", then, after each grid
  (`onLevel`), "Provisional" with the logic's total at that grid's nose
  term, no band, as for the fitted points. The progress line and the
  readout follow `onProgress` (`TransonicProgress`): "grid 2 of 3, 382 x
  40 cells, step 4 000, C_D 0.11069"; then "allowance: the far boundaries,
  the smaller domain" and "the larger domain" (domains 0 and 2; the middle
  one is the base grid, reported as grid 1), and the same for the
  cylinder. Stop, in view beside the progress line while it runs, cancels
  through `signal` (the solve has no pause: Space pauses the fitted points
  only, and the line says so). The page's own measured time a point is
  kept apart for these points.
- **Solved.** The number with the logic's band and status, as any point.
  Details gives the nose term's band in its parts, as the solve gives them
  (`parts`: the grids, the floor, the far boundaries, the cylinder, each
  with its share of the band), the reference note, and the solve's `label`
  word for word ("verified by grid convergence", the reference or its
  absence).
- **Refused.** "No number" and the plain reason by its code: `mach-1` (at
  Mach 1.0 the far boundaries move the drag, and their allowance rule is
  not yet tested there), `blunt-nose` (the far boundaries' allowance needs
  nested domains, which a blunt nose's grids do not have yet), `no-band`
  (the grids give no error band), `far-field` and `cylinder` (that
  allowance could not be measured); the solve's `message` in Details. Each
  is a row of section 5's table when it lands, the build failing until it
  is worded. With `finer` set, the point offers the finer grid as a choice
  the user must press: "Solve Mach 1.10 on the finer grid (320 cells
  across): up to N here", N = (`cellUpdates` + `repeatedCellUpdates`) /
  the page's measured cell rate, since a solve to r = 16 repeats the
  refused solve's work first; "up to", the solve's step prediction running
  high (9 800 predicted against 7 300 for the cone at Mach 1.1). The curve
  never runs it by itself.
- **Not converged.** By its code, `not-settled` ("the airflow near the
  nose did not settle on grid k, so no band can be given here") or
  `not-finite` ("the airflow solve broke down on grid k"), with the grids
  that ran (`levels`).
- **Stopped.** "Stopped before it finished: no number", the grids that
  finished in Details; Compute starts it again.
- **The airflow.** `onLive` hands the page each grid's field as it starts
  (a `FlowSource`: nodes placed, mirrored, no fitted shock, the state
  refreshed every 64 steps) and null just before its buffers go, when the
  views freeze it, as for the fitted solve (one hook for both, through
  `solveNoseDrag`). Its bounds are the whole domain, 100 radii from the
  body (224 on the larger allowance grid), so fitting them would show the
  body as a speck: these views get their own frame, the nose and body
  with the near flow (a few body lengths), and the legend says the domain
  reaches further.

## 9. Presets

| Preset                                   | What                                                                                                                                                         | What the logic gives today (nose stand-in for the claim)                                                                                                             |
| ---------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Basic Finner (reference test rocket)     | the reference projectile whose free flights (DREV TM 9703) tested the total, 30 mm, exactly as 0011's (the body to six decimals)                             | refused at Mach 1.0 to 1.6 (at 1.6 its wedges' thick trailing edges at the base); Estimate, tested class at 1.8 and 2.0; Estimate at 2.2 and 2.4; bounded 2.6 to 3.0 |
| Example: 54 mm high-power rocket, 4 fins | tangent ogive, minimum diameter; four rectangular fins of 1/4 in (6.35 mm) sheet, both edges bevelled over 20 mm, at the base; Mach 2.4                      | refused at 1.0 to 1.4 (the fins' own drag below 1.5); Estimate at 1.6 to 2.4 (at 1.6 by W1's rebuilt factor); Estimate, bounded at 2.6 to 3.0                        |
| Example: 98 mm rocket, 3 fins            | the commonest hobby layout: three tapered swept plates of 3/16 in sheet with rounded leading and square trailing edges at the base; Mach 1.6                 | refused at 1.0 to 1.4 (the fins' own drag below 1.5); a number from 1.6 to 3.0                                                                                       |
| Example: 98 mm, rounded trailing edges   | the same rocket with rounded trailing edges too, and two rail buttons (asked about first); one click from the one above (a button under its curve), and back | no number at any Mach number (a rounded trailing edge at the base), with the reasons and changes                                                                     |

Each example is labelled "Example, not a real rocket", and shows what the
page does with a common rocket today. On the advisor's item 8
(2026-10-22), the 98 mm example is the commonest layout the logic serves
(a rounded leading and a square trailing edge), and the variant with
rounded trailing edges, which
gets no number, is one click from it (a button under its curve), with
its reasons on every point. Its reasons were checked against the logic
on this date: the body base (`fin-trailing-edge`) and the fins' trailing
edge at the base (`rounded-trailing-edge`) at every Mach number, with the
fins' own drag and leading edges below Mach 1.5; three fins at the base
are not among them. The 54 mm example's fins were flat plates (a rounded
leading and a square trailing edge) until main refused flat plates at the
base (`e42d5d4`); bevelled sheet fins are as common, and served. Main's W1
(`b86c308`, the rebuilt fins-on-base factor) serves it from Mach 1.6.

## 10. From 0012: kept, and superseded

Kept: the shell (top bar, panels and the phone's sheet, help, toasts, the
key map), the tokens and faces, the readout, the 2D flow view drawn from
the GPU's buffers (U1) with its free stream outside the shock (`fca08a8`)
and its probe test, the drawn-case PNG naming, the keys (Space, R, 1 to 4,
D, G, S, F, K, H, Esc), the shared flow controls and nose status words
(`13131bd`), the interface, usability and numbers checks in `scripts/`,
and the rule of 0012 section 9. Superseded: section 3's layout (the right
panel is the curve, the left the builder), section 5's "Fields" and
section 2's "no rainbow colour maps" (the 3D scene's spectrum, and the
side view's on the owner's notes of 2026-10-21), section 7 (`/` is the
app), and phases U2 to U4 (this record's build order replaces them; U2's
page stays as "All inputs").

## 11. Usability targets and the novice-task test

| #   | Target                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------- |
| U1  | From opening the page: the Basic Finner's curve running with no action; another preset's in one (choosing it)                       |
| U2  | Their own rocket by hand in at most 14 fields, all in the builder without opening anything, each length with its calibres beside it |
| U3  | An .ork in two actions (Import, choose the file) to a drawn rocket, a running curve, and every feature not modelled listed          |
| U4  | The current point's C_D, band and status word visible without scrolling at 390 by 844 and 1440 by 900                               |
| U5  | Every status with its one sentence (at most 32 words) beside it; the logic's full text one action away                              |
| U6  | Every refused point has a mark in the "no number" row and a table row with its reason and what to change                            |
| U7  | Calibres, grid (ni x nj cells, grid k of n) and steps on the first screen; the grid choice in its own terms with its consequence    |
| U8  | The canvas spans the full width at 1440 px; no horizontal scroll at 390 and 1440 px                                                 |
| U9  | CSV and PNG one action each                                                                                                         |
| U10 | Keyboard alone; axe: no serious or critical violations; no console errors                                                           |

The test: `scripts/usability.mjs` gains the five tasks of section 1,
scripted in Chromium at 390 and 1440 px, each counting its actions and the
fields filled, and checking what each target says is in view (by its text
and its box inside the window). It records the timings it can on
SwiftShader. Before launch, the owner may run the same five tasks with
three to five rocketeers, unaided, noting where each one stops.

### 11.1 Measured (2026-10-22)

`scripts/usability.mjs` on this branch's build (`fbd8426`, main's README
merged), headless Chromium on SwiftShader, on the shared 4-core machine;
the raw numbers are in `docs/research/interface/usability-app.json`. An
action is a click, tap, key press or scroll, counted only once what the
task is for is in view; on the phone a tap on the sheet's tab that holds
the result counts as one more action. Two faults of the measure itself
were fixed first: it looked only at the page's first dialog (the app's
closed drawer comes before the help), and it gave no count to a task
whose result lay in the phone sheet's other tab.

| Target                                                                            | 390 by 844                    | 1440 by 900       | Met                                               |
| --------------------------------------------------------------------------------- | ----------------------------- | ----------------- | ------------------------------------------------- |
| U1 the Basic Finner's curve, no action; its first value (provisional, first grid) | 0 actions; 25.1 s             | 0 actions; 27.4 s | yes                                               |
| U1 another preset (choose it, then see its curve)                                 | 2 (the choice, the Curve tab) | 1                 | yes at 1440; the phone's extra tap is the sheet's |
| U2 fields of a rocket by hand, in the builder                                     | 13                            | 13                | yes (at most 14)                                  |
| U3 an .ork to its notes on the curve (Import, the file)                           | 3 (the Curve tab)             | 2                 | yes at 1440                                       |
| U4 the current point's C_D, band and status in view                               | 0 actions                     | 0 actions         | yes                                               |
| The next point of the curve                                                       | 2                             | 1                 |                                                   |
| U9 CSV                                                                            | 2 (the Curve tab)             | 1                 | yes at 1440                                       |
| U9 PNG (key K)                                                                    | 1                             | 1                 | yes                                               |
| The side view (key V)                                                             | 1                             | 1                 |                                                   |
| Help (key H)                                                                      | 1                             | 1                 |                                                   |
| U8 page height (no page scroll)                                                   | 844                           | 900               | yes                                               |
| Words shown; a tab away                                                           | 217; 132                      | 340; 0            |                                                   |
| Controls shown                                                                    | 31                            | 39                |                                                   |
| Longest paragraph shown, words                                                    | 28                            | 43                |                                                   |

U5 (each status sentence at most 32 words) is checked word for word by
`tests/app/status-words.test.ts`; the 43-word paragraph at 1440 px is
not a status sentence. U10: `scripts/interface-check.mjs` on the same
build, app and About at 390 and 1440 px: every key and tab stop works,
no console errors, no serious or critical axe violations. U6 is checked
by `tests/gpu/app-page.test.ts`; U7 is seen in the interface check's
screenshots (calibres, grid and steps on the first screen); neither by this measure. The times are SwiftShader's on a loaded
machine; a hardware GPU has not been measured.

## 12. Build order and checks

Small commits, each tested: the model (with this plan); the adapter and
its table; the presets; the geometry and its projection; the status words;
the curve runner with a stand-in solver, and the CSV; the layout; the
builder and its drawing; the chart, table and result; the side view's
fins, hatch and shading; the 3D scene, merged from its branch; the import
button, wired to `src/import/`, merged from its branch. Main is merged whenever it
moves (merge, never rebase), and the status words follow what the logic
returns. Before each report: tsc, eslint, prettier, the build, tests/ui,
tests/render, tests/app, the interface check at 390 and 1440 px, the
numbers check (every number, band, status and reason shown equal to the
logic's for the Basic Finner, a refused case, an estimate, and a bounded
case once it exists; the nose term from a recorded solve, plus one point
solved end to end on SwiftShader), and the GPU drag-page test.
Screenshots of the final build in `docs/research/interface/`.

**As run for the review (2026-10-22, main `7d8221c` merged).** tsc,
eslint, prettier and the build pass; the node tests of the interface, the
3D view, the importer and the geometry pass (417, with main's own suites
of the logic). The interface check passes at 390 and 1440 px on the app
and About: every key and the tab order, V in a focused select, help by
its key and Esc, no console errors, no serious or critical axe
violations, no horizontal scroll. The numbers check is in two parts.
`tests/app/numbers.test.ts`: for the Basic Finner inside its class (Mach
2.0), an estimate outside it (the 54 mm example, 2.0), a bounded case
(the Basic Finner, 2.8), a case the rebuilt factor bounds (flat plates at
the base, 2.0) and a refused one (the Basic Finner, 1.4), every number,
band, status and reason of the point as shown and of its CSV row equals
the logic's, computed independently, for a nose outcome of the solve's
own shape. `tests/gpu/app-page.test.ts`: the page in a browser, the
points the logic refuses before any solve with its reasons in plain
words, the view of the airflow with its truth notes, and the first
point's provisional C_D equal to the logic's total at that grid's nose
term (it passed on SwiftShader before W1; to run again). One point solved
end to end on SwiftShader is not run: about 8 hours here (section 8.3).
The GPU drag-page, app-page and builder tests, and the flow-view and
render3d GPU tests, are to run again on this merge (the machine's solver
lanes make them slow; they passed before it, apart from the drag-page
test's reasons, which main has since updated for W1). The screenshots of
this build are in `docs/research/interface/` (app and About at 390 and
1440 px: the 3D view, the slice, the side view, Mach, glow; the phone's
Curve tab).

## 13. Open questions for the owner

1. **The 3D view's default look**: opaque lit iso-surfaces, the shock
   sheet, a wedge cut away (section 6.6, 2026-10-23); or with the slice
   (key 2) or streamlines (key 3).
2. **The real-GPU timing**: an estimate until the owner reads the cell
   rate off the readout on a real GPU (section 8.3).

## 14. Decisions taken while building (2026-10-21)

1. **Tapered fins of constant thickness** map to the logic's flat plates
   (main's `c223856`, W34); combinations it cannot represent stay flagged
   with the reason (section 4.2).
2. **Lugs, rail buttons, fillets, cant**: a plain note naming each part
   with its size, and one button, "Compute without it", which the user
   must press; every number is then labelled "without the launch lug" (or
   whichever parts) on the curve, the table, the CSV and the PNG. Never
   dropped silently; no guessed allowance.
3. **Points**: every 0.2 in Mach number by default (11), 0.1 the other
   choice; the curve always Mach 1.0 to 3.0, the flight marked on it.
4. **The 3D hand-off** as section 6.1; the side view the fallback (key V).
5. **Timing**: the page's own measured time a point; the real-GPU figure
   labelled an estimate; the SwiftShader hours not shown as typical.
6. **F12** (a bevelled leading edge with a square trailing edge) goes to
   the logic's agents: `src/app/total-drag.ts` is not changed here.
7. **Lengths** shown to 0.01 mm (0.001 in); a preset's exact value kept
   until the field is edited, the calibres beside it to six decimals
   (2.835641 cal), tested.
8. **Frame pacing** (section 6.4), the same budget for both views.
9. **The importer** (0018): each other part's size, front and roll held in
   the model; transitions' clipping held and drawn; fins at the base at
   the base; a rounded edge shown in the builder as a full round with its
   radius, so that the user can correct it; the flight's source said
   beside it.
