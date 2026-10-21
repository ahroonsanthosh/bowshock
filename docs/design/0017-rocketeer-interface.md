# 0017: The rocketeer's interface (plan)

- **Status:** Plan, for the owner's review. Nothing here changes a number:
  the drag logic and the libraries (`src/app/total-drag.ts`'s
  computations, `src/total`, `src/base`, `src/fins`, `src/friction`,
  `src/analysis`, `src/engine*`, `src/verification`) are called, never
  changed, and every status, reason and text shown comes from what they
  return. Committed with it: the rocket model, `src/rocket/design.ts`
  (section 4.1), so that the OpenRocket importer can map into it.
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
│ [ Rocket ] [ Curve ] [ View ]    │ tabs
│ Rocket: the drawing, then the    │ the sheet scrolls; the canvas and
│ fields; Curve: chart, table, CSV;│ the pinned line do not
│ View: 3D or Side, fields, legend │
└──────────────────────────────────┘
```

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
cant, fillets), other outside parts (lugs, rail buttons, pods), the flight
(highest Mach number, altitude), notes for what the source held that the
model has no place for, and the source (preset, .ork, typed).

### 4.2 The adapter: what maps, what is flagged

`designForm(design, mach)` returns the logic's `TotalDragForm` (lengths
over the body diameter; the flight condition by `flightConditionOf`, as
the drag page's `conditionOf` does) or, for each feature the logic cannot
represent, a flag with its reason and what to change. A flagged rocket
gets no number ("Not modelled", section 5). Tests: on the Basic Finner the
form equals the drag page's `formOf` for the same values field for field,
and every row below has its case.

| The design has                                  | Maps to                                                                                                        | Or is flagged because                                                                                                      |
| ----------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| a nose, then tubes of the nose's diameter       | `body`: the nose, one cylinder of their summed length                                                          |                                                                                                                            |
| a transition, a tube of another diameter        |                                                                                                                | the logic takes one diameter to a flat base (a boat-tail is also refused by `src/base`, B2)                                |
| one trapezoidal fin set (rectangular as a case) | `planform`: rectangular, or trapezoidal with the leading-edge sweep atan(sweep / span) and the trailing edge's | more than one fin set; elliptical or freeform fins (no planform for them)                                                  |
| flat fin, both edges bevelled                   | `hexagonal`, the bevels as fractions of the root chord                                                         |                                                                                                                            |
| flat fin, rounded leading, square trailing edge | `single-wedge`: the trailing edge the fin's thickness, a leading-edge radius of half of it (the same shape)    | (the logic then refuses it itself, F3: a rounded wedge needs r < h)                                                        |
| wedge (the Basic Finner's)                      | `single-wedge`, its leading-edge radius                                                                        |                                                                                                                            |
| diamond                                         | `double-wedge`, its ridge                                                                                      |                                                                                                                            |
| a square leading edge; a rounded trailing edge  |                                                                                                                | no section form for them (0014, F1 and F2)                                                                                 |
| bevelled leading, square trailing edge          |                                                                                                                | `src/fins` has it but `TotalDragForm` does not (0014, F12): a change to the logic's form, not the interface's              |
| an airfoil section                              |                                                                                                                | no section form for it                                                                                                     |
| a tapered fin of constant thickness             | (see open question 1)                                                                                          | the logic's section is the same in chord units along the span, so its fin thins toward the tip where the real one does not |
| cant, fillets, launch lugs, rail buttons, pods  |                                                                                                                | not represented by `src/total` (see open question 2)                                                                       |
| fins at a position                              | `trailingEdgeAheadOfBase` = base station minus (root leading edge plus root chord)                             | fins not on the last tube                                                                                                  |
| flight: altitude; each Mach number of the curve | Reynolds number and temperature by `flightConditionOf`, the diameter in mm                                     |                                                                                                                            |

## 5. Status words

Each point shows one word and one sentence, beside its colour and mark;
Details shows the logic's own text, word for word (the claim, every
reason with its component and type, the class conditions, the notes, the
component table). The wording below must say the same as the logic's
claim, no more and no less; the word "validated" is the logic's alone and
appears only inside its own text in Details.

**Points with a number** (`totalDragView` kind `total`):

| Logic                                                       | Word                    | Sentence                                                                                                                                                                         | Mark            |
| ----------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------- |
| claim `validated` (`VALIDATED_CLAIM`)                       | Inside the tested class | This rocket and speed lie inside the one class whose total drag passed a test against flight measurements it was not tuned on (the Basic Finner); that test's tolerance is wide. | green, ●        |
| claim `estimate` (`ESTIMATE_CLAIM`)                         | Estimate                | Each part is computed inside its own band's range, but no measurement of a whole rocket like this checks the total, and the parts' bands are estimates here.                     | amber, ◆        |
| "bounded, not measured" (to come with fig. 35's correction) | Bounded, not measured   | Worded from the logic's text when it lands; until then the build fails on the unworded kind.                                                                                     | blue, ■         |
| our own: the nose still solving                             | Provisional             | Not finished: the nose is solved on grid k of n; no band yet.                                                                                                                    | grey, ○, no bar |

**Points without a number** (kind `refused`, the nose solve's outcomes,
and the adapter's flags): the word is **No number**, the mark a red ✕ in
the chart's "no number" row, and the sentence "The drag here cannot be
given to a known accuracy:" with the plain reason of the first refusal (all
of them in Details), then what the user could change.

| Reason (component)                                | Plain reason                                                                                          | What you could change                                                     |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `mach-range` (body base, fins-on-base factor)     | the drag behind the base is known from measurements only at other speeds                              | nothing in the rocket; this speed has no number yet                       |
| `mach-range` (fin trailing-edge base)             | a square trailing edge's drag is measured only at other speeds                                        | a bevelled (sharp) trailing edge                                          |
| `afterbody`                                       | base drag is measured only for a straight body to a flat base                                         | a body without a boat-tail or flare                                       |
| `laminar-base`, `laminar-trailing-edge`           | the air would reach the base smooth (laminar); base drag is measured with turbulent air only          | (only from an input of the advanced page)                                 |
| `fins-near-base`                                  | fins ending less than a root chord ahead of the base: no measurement of the base drag with them there | the fins' trailing edges at the base, or a root chord or more ahead of it |
| `fin-count`                                       | with fins at the base, the base drag is measured with four fins only                                  | four fins, or fins a root chord or more ahead of the base                 |
| `fin-thickness`                                   | with fins at the base, the base drag is measured for fins 5% to 10% as thick as their root chord      | that thickness, or fins a root chord or more ahead of the base            |
| `swept-trailing-edge`                             | a swept square trailing edge's drag is not measured                                                   | an unswept trailing edge, or a bevelled one                               |
| `thick-layer`                                     | the square trailing edge is thin against the air's boundary layer there; not measured                 | a thicker trailing edge, or a bevelled one                                |
| `beyond-read-range`, `input`, `planform`          | the logic's message, as it says it                                                                    | from the message                                                          |
| `subsonic-free-stream`                            | at Mach 1 and below the fins' method does not apply                                                   | nothing in the rocket; this speed has no number yet                       |
| `detached-shock`, `subsonic-behind-shock`         | the fin's edge turns the air more than it can at this speed: the shock stands off the edge            | a sharper leading edge (a longer bevel) or a thinner fin                  |
| `compression-corner`, `expansion-limit`           | the fin's section has a corner the method does not model                                              | another section                                                           |
| `reflected-wave`                                  | a wave from the leading edge's shock could land on the fin; not modelled                              | a longer bevel or a thinner fin                                           |
| `swept-leading-edge`                              | a swept rounded leading edge's drag is not measured                                                   | an unswept leading edge, or a bevelled one                                |
| `leading-edge-range`                              | a rounded leading edge's drag is measured only at Mach 1.49 to 3.0 and edge sizes within its data     | a bevelled leading edge                                                   |
| `leading-edge-geometry`                           | a rounded leading edge is modelled only on a wedge-shaped fin, not on this one                        | a bevelled leading edge                                                   |
| `not-verified` (the nose: no band)                | the airflow round the nose did not settle to a measured accuracy on the grids solved                  | the finer grid (320 cells across), where 160 was used                     |
| the nose solve refused (`invalid`, a thrown case) | the airflow solver does not serve this nose at this speed: its reason                                 | from the reason (a more slender nose, a higher speed)                     |
| `not-converged`                                   | the airflow solve did not settle                                                                      | the other grid                                                            |
| `not-computed`                                    | a method failed: its message                                                                          |                                                                           |
| no WebGPU; the GPU lost or failed                 | this browser cannot run the airflow solver; the GPU failed                                            | another browser; reload                                                   |
| the flight condition (altitude out of range)      | the condition's own reason                                                                            | an altitude within the range                                              |
| the adapter (section 4.2): Not modelled           | the row's reason                                                                                      | the row's change                                                          |

Below Mach 1.2 every point is computed as at any other Mach number and
shows what the logic returns there (today: refused, with its reasons).

## 6. The airflow: the 3D scene, the side view, and what is true

### 6.1 What the page hands the 3D scene

The page owns the rocket, the curve and the GPU device; the scene draws.
Proposed to the `src/render3d/` agent (to agree before either side
builds on it):

| Call                         | What the page gives                                                                                                                                                                                |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `create(device, canvas)`     | the page's GPU device (the one the solver uses: buffers are shared, nothing is copied)                                                                                                             |
| `setRocket(geometry)`        | `rocketGeometry(design)` of `src/rocket/geometry.ts`, in calibres (the solver's unit, body radius 0.5): the profile r(x), each fin's outline, section thickness, root station and roll angle       |
| `setFlow(source)`            | the live fit as a `FlowSource` (`src/render/flow-renderer.ts`, from `liveFitSource`): its state buffer, the line grid's node buffers, ni and nj, gamma, the free stream, the bounds; null for none |
| `freeze()`, `setLive(live)`  | as the 2D view's: keep drawing after the solver releases its buffers; draw continuously while it runs                                                                                              |
| `onScale(listener)`          | the scene reports each colour channel's range and units, for the page's legend                                                                                                                     |
| `fit(rect)`, `pngBlob(text)` | the part of the window left uncovered; a PNG with the case as its caption                                                                                                                          |

The page keeps its own HTML readout over the scene (M, grid ni x nj cells
and grid k of n, steps, shock speed, cell rate, GPU, state) and the
legend, so that both are accessible text and the same in 3D and 2D.

### 6.2 What must be true in every view

At zero incidence the axisymmetric field revolved about the axis (3D) or
mirrored (2D) is exact; outside the fitted bow shock the flow is the free
stream, exactly, and is shown so (the 2D view does, `fca08a8`); behind
the base the solver computes nothing, and that region is marked "not
simulated", never painted, and never in the colour that means uniform
flow; the fins are drawn as geometry, with the note "The airflow shown is
around the body; the fins' drag is computed separately"; every colour or
brightness channel has a legend with real values and units, and says what
dark means.

### 6.3 The side view (2D), secondary

The 2D flow view of 0012 U1 stays: a "3D | Side" switch on the view (key
V), with schlieren, Mach, Cp and density (keys 1 to 4), split, grid lines
and the shock line. It is also the fallback where the 3D scene cannot run,
and what the GPU tests probe. It gets the rules of 6.2 that it lacks: the
fins drawn in projection, the region behind the base hatched and labelled
"not simulated", the body shaded as a solid (prototyped, about 150 lines;
the 2D glow look is dropped).

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
- Only the view shown draws live. The hidden one (3D or side) draws
  nothing until it is shown, and keeps its last frame to show at once.
- The 3D scene is held to the same share: the page creates it with
  `liveDuty` = `FRAME_BUDGET` (its own pacing, by its frames' measured
  cost, the same way).

Measured with the test as it is (SwiftShader, 4 cores loaded by other
solver runs): steps per second without the view 34, 29 and 33; drawn
live 34, 36 and 35; 0.2 frames drawn a second; cost -5.6%, within the
noise, against the threshold of 10%.

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

Mach 1.0 to the flight's highest Mach number (at most 3.0), every 0.2 by
default (11 points to Mach 3.0), every 0.1 as the other choice (21). At
the start every point is put to the logic with the nose pending
(`totalDragView` with `{ kind: 'pending' }`): a point refused for reasons
other than the nose is final at once, with its reasons, and costs no GPU
time. The others are solved one at a time, coarse to fine (1.0 and the top
first, then the middle, then the middles between), so that a curve stopped
early still spans its range; the chart marks the point being solved. If
every point is refused before solving, the top point is solved for the
airflow alone, and labelled so.

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
191 x 20 cells for 750 steps (48 s, with the page's start) and 382 x 40 for
2 000 (432 s), measured; each grid has needed about twice the steps of the
one before, so 764 x 80 for about 4 000 and 1528 x 160 for about 8 000
(the third and fourth grids are being measured now). That is about 2.2e9
cell updates, 88% of them on the finest grid; at 320 cells across, about
1.8e10, eight times as many.

| Where                                  | Cell rate                                 | One point, 160 across | The Basic Finner's 7 solved points |
| -------------------------------------- | ----------------------------------------- | --------------------- | ---------------------------------- |
| SwiftShader, here (4 cores, loaded)    | 66 to 96 kcell/s, measured                | about 6 to 9 hours    | about 2 to 3 days                  |
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
2.0,0.5501,0.4823,0.6493,estimate,"Estimate, not validated: ..."
1.4,,,,refused,"body base (mach-range): the base-pressure correlation's band ..."
```

`cd_low` and `cd_high` are the model-form band rounded outward (as shown);
`status` is the logic's kind (`validated`, `estimate`, `refused`, and the
bounded kind when it lands); `reason` its text. A test pins the format.

## 9. Presets

| Preset                                   | What                                                                                                                                          | What the logic gives today (nose pending)                                                  |
| ---------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| Basic Finner (reference test rocket)     | the reference projectile whose free flights (DREV TM 9703) tested the total, 30 mm, exactly as 0011's (the body to six decimals)              | refused at Mach 1.0 to 1.6; inside the tested class at 1.8 and 2.0; estimate at 2.2 to 3.0 |
| Example: 54 mm high-power rocket, 4 fins | tangent ogive, minimum diameter; four swept fins of constant chord (100 mm, 40 deg), 6.35 mm (1/4 in) thick, bevelled both edges, at the base | refused at 1.0 to 1.6; estimate at 1.8 to 3.0                                              |
| Example: 98 mm rocket, 3 fins            | the commonest hobby layout: three tapered flat fins with rounded edges at the base                                                            | no number at any Mach number, with the reasons and the changes                             |

Each example is labelled "Example, not a real rocket", and shows what the
page does with a common rocket today: the second one honestly, with no
number.

## 10. From 0012: kept, and superseded

Kept: the shell (top bar, panels and the phone's sheet, help, toasts, the
key map), the tokens and faces, the readout, the 2D flow view drawn from
the GPU's buffers (U1) with its free stream outside the shock (`fca08a8`)
and its probe test, the drawn-case PNG naming, the keys (Space, R, 1 to 4,
D, G, S, F, K, H, Esc), the shared flow controls and nose status words
(`13131bd`), the interface, usability and numbers checks in `scripts/`,
and the rule of 0012 section 9. Superseded: section 3's layout (the right
panel is the curve, the left the builder), section 5's "Fields" and
section 2's "no rainbow colour maps" (the 3D scene's colours are the 3D
agent's, on the owner's decision of 2026-10-21), section 7 (`/` is the
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

## 12. Build order and checks

Small commits, each tested: the model (with this plan); the adapter and
its table; the presets; the geometry and its projection; the status words;
the curve runner with a stand-in solver, and the CSV; the layout; the
builder and its drawing; the chart, table and result; the side view's
fins, hatch and shading; the 3D scene, when its API lands; the import
button, wired to `src/import/` when it lands. Main is merged whenever it
moves (merge, never rebase), and the status words follow what the logic
returns. Before each report: tsc, eslint, prettier, the build, tests/ui,
tests/render, tests/app, the interface check at 390 and 1440 px, the
numbers check (every number, band, status and reason shown equal to the
logic's for the Basic Finner, a refused case, an estimate, and a bounded
case once it exists; the nose term from a recorded solve, plus one point
solved end to end on SwiftShader), and the GPU drag-page test.
Screenshots of the final build in `docs/research/interface/`.

## 13. Open questions for the owner

1. **Tapered fins of constant thickness.** The logic's fin keeps its
   section in chord units along the span, so it models a tapered flat fin
   as thinning toward its tip. Recommended: flag it as not modelled (no
   number) until the logic carries constant thickness; the alternative is
   a number with that difference stated beside it.
2. **Lugs, rail buttons, fillets, cant.** Not in `src/total`. Recommended:
   no number while they are on the rocket, with "remove it to see the
   drag without it"; the alternative is the number for the rocket without
   them, labelled so beside the number.
3. **The default point spacing**: 0.2 (11 points) as proposed, or 0.1.
