# Interface (0017, rocketeer page): status at handoff (2026-10-22)

Branch `worktree-agent-a2924fde6ca8a3d8c`, pushed as `claude/wip/interface`, head `eceab88` (clean;
main 7d8221c merged). Contains the 3D renderer (render3d-fluid), the .ork importer
(worktree-agent-a4ab3c876baf3cbf8) and the paused U2 work (worktree-agent-a94df6811cc8b4bd6).
Records: `docs/design/0017-rocketeer-interface.md` (decisions in section 14),
`docs/design/0018-openrocket-import.md`. NOT yet ready for its independent review.

## What it delivers

- One page, full width: builder on the left (mm or inches; calibre values to 6 decimals; lengths to
  0.01 mm); the airflow fills the window; the drag curve pinned right. Phones: a sheet with Rocket,
  Curve, View tabs and a pinned line for the current point.
- The C_D against Mach curve, Mach 1.0 to 3.0 at 0.2 (or 0.1): refused points as red crosses in a "No
  number" row with the logic's reasons; solving points provisional; finished points with band and
  status (words follow the logic's claim text, both bounded cases worded). The flight Mach is marked
  with its source. Lugs, rail buttons, pods, fillets, cant asked first ("Compute without it"), every
  number then labelled "without ...". CSV and PNG export. "Compute its curve" beside the curve.
- .ork import (own ZIP reader with DecompressionStream, own XML reader, 64 MiB cap): parts with size,
  front, roll; clipped transitions drawn clipped; rounded edges shown as full rounds; non-blocking load.
- 3D view (main canvas): the axisymmetric field revolved, Mach isosurfaces with a cutaway, streamlines,
  the shock surface; FluidX3D-style keys 1 to 6, Z, T, Q/E, H, 0; V switches to the 2D side view (the
  fallback). One key map across views; help, View menu and phone View tab list them. Live frames paced
  to about 4% of time (FRAME_BUDGET 0.04, liveDuty). The 3D PNG carries rocket, C_D, band, status. The
  3D rocket uses the builder's geometry.
- The 54 mm example's fins are now bevelled sheet (main refuses flat plates at the base); it gets a
  number from Mach 1.6.
- Transonic: designed only (0017 section 8.5) against the final TransonicDrag type; nothing wired; no
  prototype uses the GPU transonic path (its 4-sweep limit cycle is being fixed on transonic-mach1).

## Tests

- Pass: tsc, eslint, prettier, build; 417 node tests (interface, 3D, importer, geometry); main's
  tests/total, tests/fins, tests/base; the interface check on the final build (app and About at 390
  and 1440 px: every key and stop, no console errors, no serious/critical axe violations, no
  horizontal scroll); tests/app/numbers.test.ts (five cases: Basic Finner in class at 2.0, the 54 mm
  estimate at 2.0, present factor bounded at 2.8, W1 bounded flat plates at 2.0, refused at 1.4: the
  shown point and CSV row equal the logic's own output, computed independently).
- REMAIN on eceab88: the GPU page tests nose-drag-page (main's f003330 updated its reasons), app-page,
  builder, flow-view, render3d. All passed before the W1 merge (except the drag-page reasons main
  fixed). 30 to 60 minutes each under load. A point solved end to end on SwiftShader takes about 8 h
  here and was not run.
- Unexplained: in the import screenshot (a third browser page) the 3D view did not set up and fell back
  to the side view. Possibly SwiftShader limiting concurrent WebGPU pages. Investigate before review.

## Usability

`scripts/usability.mjs` measures the app's own tasks (preset, import, CSV, PNG, side view, builder
field count, taps to open a phone tab); its run on this merge was stopped, no numbers yet. Fixed by
hand: Compute was out of view (now beside the curve); the mode bar lost its place when 3D failed.

## Left before the independent review

1. Re-run the GPU page tests and the usability measure on eceab88.
2. Explain the 3D failing to set up in a third page.
3. Put the usability numbers into 0017 section 11.
Then an independent review (fresh agent, given the code), then merge, then final screenshots and a new
README hero from the 3D view.

## Screenshots

Committed in `docs/research/interface/`: app-1440, app-390 (3D while solving); app-slice-*,
app-side-*, app-mach-*, app-glow-*, app-3d-* at 390 and 1440; app-curve-390; app-example-54-1440;
app-import-1440 (side-view fallback); about-390, about-1440. The owner's colour reference is FluidX3D's
F1 car render (a third party's image, deliberately not pushed): a dark background with the flow shown
as glowing, translucent velocity-coloured structures around the body. The pictures in FluidX3D's README
(https://github.com/ProjectPhysX/FluidX3D) show the look; learn from them, never from its code.

## Open questions for the owner

1. The default 3D look: glowing shells with streamlines, the shock and a cutaway, no slice (key 2
   turns the slice on). Still unanswered.
2. Real-GPU timing is an estimate until someone reads the cell rate on a real GPU (the advisor: run
   three real GPUs before launch and show a device record in Details).

## When the transonic solve lands

noseComponentOf's label in src/app/total-drag.ts must name the transonic solver (0013) for those
points (a label change). Its views need their own frame near the body (the domain reaches 100 to 224
radii). The advisor adds: sample Mach 1.0 to 1.2 densely, since the 7 deg cone's drag peak lies between
Mach 1.01 and 1.05 and is 18% above the Mach 1.0 value, which the 0.2 spacing misses.
