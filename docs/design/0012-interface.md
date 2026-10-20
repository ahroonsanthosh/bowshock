# 0012: The interface (draft)

- **Status:** Draft, accepted by the owner 2026-10-20 (the four decisions
  of section 6). U0 and U1 implemented (section 10).
- **Scope:** the look, layout and interaction of every page. The physics,
  the numbers and their bands are out of scope: no change here may change
  a number the solver or the libraries report.

## 1. Aim

bowshock should feel like FluidX3D: open the page and the flow is already
forming, full window, on a dark ground, with a few keys that change what you
see. It must stay clear, easy to use and uncluttered. Unlike FluidX3D it has
a setup panel (FluidX3D's cases are written in C++), and its error bands and
verification status are always on screen, never behind a key: they are what
makes bowshock different.

Inspiration only: no FluidX3D code, shader, asset, colour table or name is
used (its licence does not permit it; bowshock is AGPL). The README credits
the inspiration.

## 2. What is taken from FluidX3D, and what is not

Taken:

1. **The view is the product.** A full-window canvas on a near-black ground;
   everything else floats over it and can be hidden.
2. **A text readout of live statistics** in a monospace face.
3. **Keyboard first**: number keys switch the field shown, H shows help with
   the keys and the colour scale, the mouse moves the view.
4. **It opens on a running case.**
5. **Beautiful by default**: no configuration needed for a good picture.

Not taken, or changed:

- Setup is a panel, not code: a preset, the nose and the Mach number
  visible, everything else under "More".
- The drag coefficient, its band and its status (verified, estimate,
  refused) are always visible.
- Every key has a visible control as well, for touch and mouse users.
- No rainbow colour maps: they show edges where the field has none, and
  in a shock solver the only sharp lines on screen must be real shocks.

## 3. Layout

Desktop:

```
┌────────────────────────────────────────────────────────────────────────┐
│ ▲ bowshock        Rocket   View   Validation   About          ?   ⤢   │
│ ┌─────────────┐  M 2.00  α 0°  grid 640×80          ┌───────────────┐ │
│ │ ROCKET      │  step 4 120  residual 3e-10         │ DRAG          │ │
│ │ Preset    ▾ │  212 Mcell/s · your GPU             │ Cd 0.4746     │ │
│ │ Nose      ▾ │                                     │ 0.417–0.559 ✓ │ │
│ │ Mach ━━●━━━ │        live flow field, full        │ ▇▇▇▅▃ parts   │ │
│ │ More ▸      │        window: bow shock around     │ Details ▸     │ │
│ └─────────────┘        the body, mirrored at axis   └───────────────┘ │
│ ▭▭▭▭▭▭▭ Mach 0.4 … 3.1     1 Schlieren  2 Mach  3 Cp  4 ρ   G grid    │
└────────────────────────────────────────────────────────────────────────┘
```

- **Top bar** (40 px, translucent): name, menus (Rocket, View, Validation,
  About), help, full screen.
- **Viewport**: the whole window behind everything.
- **Readout** (top left of the viewport): Mach number, incidence, grid,
  step, residual, throughput (cell updates per second), GPU, and the run's
  state.
- **Rocket panel** (left, collapsible): preset, nose, Mach; "More" opens the
  rest (lengths, fins, flight condition, transition, wall temperature).
- **Drag panel** (right, collapsible): C_D with its band and status badge,
  the components as bars with their bands, "Details" for the grids, the
  extrapolation, every label and the design records.
- **Legend and modes** (bottom): the colour scale with units and range, and
  the field buttons with their keys.

Phone (below about 700 px): the viewport takes the top 55%; a bottom sheet
holds three tabs (Rocket, Drag, View); C_D and its band stay pinned in one
line above the sheet.

## 4. Interaction

| Key        | Action                                                       |
| ---------- | ------------------------------------------------------------ |
| Space      | pause or resume                                              |
| R          | run again                                                    |
| 1, 2, 3, 4 | schlieren, Mach number, pressure coefficient, density        |
| D          | split view: schlieren above the axis, the chosen field below |
| G          | grid lines                                                   |
| S          | the fitted shock as a line                                   |
| F          | fit the body to the view                                     |
| + and -    | zoom (also wheel or pinch)                                   |
| arrows     | pan (also drag)                                              |
| K          | save a PNG of the view                                       |
| H or ?     | help: keys, the colour scale, what the band means            |
| Esc        | close an overlay                                             |

Keys are ignored while a text field has focus. Every action also has a
button. Focus order follows the layout; overlays trap focus and return it.

## 5. Look

- **Ground and panels:** viewport #07090c; panels translucent dark with a
  12 px blur, a 1 px light border at 8% and 10 px corners.
- **Text:** #e6e8eb, muted #8b94a3; tabular numerals everywhere a number
  can change.
- **Accent:** bowshock's red, lightened for the dark ground (about
  #ff5a6e). **Status:** verified or validated green, estimate amber,
  refused red, each with a word as well as a colour.
- **Faces:** Inter for the interface, JetBrains Mono for the readout and
  numbers; both under the SIL Open Font License, self-hosted with the site
  (no third-party requests), with system fallbacks.
- **Fields:** the existing perceptual (OKLab) colour map of `src/render`;
  schlieren in greyscale, bright shocks on the dark ground.
- **Motion:** the converging flow is the motion. Interface transitions
  about 150 ms, off under `prefers-reduced-motion`.

## 6. Decisions (owner, 2026-10-20)

1. **The app opens on a running case** (auto-run on a small grid; Space
   pauses).
2. **Schlieren is light on dark.**
3. **The default rocket is the Basic Finner**, the one configuration whose
   total drag is validated.
4. **Inter and JetBrains Mono**, self-hosted.

## 7. Information architecture

- `/` is the app.
- **Validation** menu: the supersonic ramp and the shock tube, restyled in
  the same shell, presented as the solver against exact theory.
- **About**: what is validated and what is not, word for word from the
  README's claims, with links to the design records and the repository.

## 8. Phases

Every phase ships on its own and passes, before it merges: screenshots at
390, 768 and 1440 px wide; no console errors; operable by keyboard alone;
no serious accessibility violations; and the same numbers as before on a
fixed case.

| Phase               | Ships                                                                                                                   | Must show                                                                                           |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| U0 Shell            | tokens, faces, top bar, panels, readout, help, legend, key map, on every page; no physics change                        | numbers identical to before                                                                         |
| U1 Flow view        | the solver's fields drawn from GPU memory while it converges, mirrored, pan and zoom, split view, the fitted shock line | values at probe points equal the solver's cell values; drawing costs the solver under 10%           |
| U2 Panels           | presets, total drag (the module of 0011), badges, component bars with bands, Details                                    | the Basic Finner preset gives the gate's per-shot totals; every number shown has a band and a label |
| U3 Sweep and export | C_D against Mach with its band, CSV in a documented format, PNG, a link that restores the case                          | a test pins the CSV format; a reload from the link restores the case                                |
| U4 First impression | the app at `/`, About, a README animation captured from the live app                                                    |                                                                                                     |
| U5 Robustness       | a clear path without WebGPU, size budgets, phone polish                                                                 |                                                                                                     |

## 9. Unchanged

No number without its band and its status; refusals show their reasons;
nothing labelled validated that the records do not call validated.

## 10. Done

### U0: the shell

`src/ui/`: one stylesheet of the tokens of section 5 (`style.css`), Inter
4.001 and JetBrains Mono 2.211 self-hosted (Latin and Greek subsets,
105 KB; a Greek file loads only when a page uses a Greek letter), and the
components: top bar with menus, side panels and the phone's sheet,
readout, help, legend, mode bar, toasts and the key map. The landing, the
supersonic ramp and the shock tube use them.

Numbers unchanged: on fixed settings each page reported the same values
at every reading before and after (the ramp at Mach 2.5, +10 deg, on the
GPU to convergence and on the CPU, and at -10 deg on the CPU; the shock
tube's Toro tests 1 and 3 on the CPU and test 1 on the GPU).

### U1: the flow view

`src/render/flow-renderer.ts` and its shaders draw a solver's flow from
its own buffers: the fields of `src/render/flow-fields.ts` per cell, each
drawn at its cell's centre and blended linearly between centres, the
moving grid of a fitted shock placed on the GPU from the line grid's
buffers, mirrored about the axis. `src/ui/flow-view.ts` adds pan, zoom,
the fields, the split view, grid lines, the shock line and a PNG;
`demos/flow-view.html` runs the drag page's solve for the Basic Finner's
body and draws it.

The solver takes two hooks that change no number: `onLive` (the fit's
buffers while it runs) and `gate` (awaited between batches of steps, to
pause). A fit watched, drawn every batch and paused ends bitwise where an
unwatched one does (`tests/gpu/flow-view.test.ts`).

Measured (`tests/gpu/flow-view.test.ts`, the Mach 2 cone on its first
grid, after 250 and 500 steps): the nodes placed on the GPU lie within
1.3e-7 of the solver's grid; the value drawn at each cell's centre is the
solver's cell value within 2.2e-7 of the field's largest for the Mach
number, 4.0e-7 for Cp and 9.9e-8 for the density, the same mirrored;
schlieren's gradient matches its TypeScript twin within 4.3e-5 of the
largest; the colour drawn there is the
colour map's within 1.5 of 255.

Cost (`tests/gpu/flow-view-cost.test.ts`, the drag page's first grid of
the Basic Finner's body, 191 x 20 cells, drawn at 1280 x 720, the best of
three runs each on software WebGPU): 34 steps a second without the view,
33 with it, 2.1%, within the runs' scatter. The view draws at most
30 frames a second while the flow is live, and a frame only once the GPU
has finished the one before, so frames never queue behind the solver's
steps.

### Usability

Measured by `scripts/usability.mjs` before and after, at 390 and 1440 px,
with the reasons where a measure got worse:
`docs/research/interface/usability.md`. The ramp, the shock tube and the
live flow fit the window; the landing is shorter (881 px at 390 px wide,
from 1212) but still scrolls by 37 px in an 844 px window; no visible
paragraph is over 32 words; help is one key away on every page in the
shell (the drag page joins it in U2).
