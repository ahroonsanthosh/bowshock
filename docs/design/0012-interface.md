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
   total drag is validated. (Since 2026-10-21 that claim is suspended,
   every total an estimate, until BRL Report 934's range A tests the
   corrected fins-on-base factor: 0010 section 11.7. The Basic Finner
   stays the default, as the class kept for that test.)
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
`docs/research/interface/usability.md`, against the commit before U0
(`cacc38e`) and against main's tip. The ramp, the shock tube and the
live flow fit the window, and on a phone each tab of their sheets fits
too (the live flow's Case tab: 263 px of content in its 297 px at 390 by
844); the landing is shorter (881 px at 390 px wide, from 1212) but
still scrolls by 37 px in an 844 px window; no visible paragraph is over
32 words; help is one key away on every page in the shell (the drag page
joins it in U2).

### Review fixes

An independent review of U0 and U1 before merging found, and these fix:

- **One Basic Finner.** The flow page built its body exactly (the cone
  0.5 / tan 10 deg = 2.8356409 cal); the drag page from its fields,
  rounded to 2.836 and 7.164; their wave drags differed by 2.0e-4 of the
  value at Mach 2 on the first grid, three times the band's allowance of
  7e-5 of the value. Both now solve the exact body to six decimals
  (2.835641 and 7.164359; 0011 section 3): the drag page from its fields,
  the flow page from the same lengths read back (`basicFinnerBodyAsTyped`
  in `src/validation/basic-finner.ts`). On the first grid, 20 cells
  across, at Mach 2, both now give 0.104617 at 750 steps (the drag page
  gave 0.104596 with 2.836; the exact body typed in full converges at
  1000 steps to the same six decimals): `docs/research/interface/numbers.json`.
- **No value reads as more than it is.** The readout's running value is
  "wave Cd, this grid"; the end of a run is coloured by its outcome
  (green only for a measured band, amber for a value not verified, red
  where there is no value: refused, not converged, or a failed GPU), as
  help says it, and said once to screen readers (the
  pinned line, which changes at every check, is not a live region). A
  lost or failed GPU is reported as that, not as a refusal, and disables
  the runs; the grids solved again with more columns are reported as the
  drag page reports them; "a finer finest grid may verify it" is said
  only where one is offered.
- **Two solves never share the GPU.** A new run waits until the one it
  stops has released its grids.
- **Keys.** A focused select keeps only the arrows, paging, Space, Enter
  and Esc; a digit there is the page's (it picked an option and changed
  the case). H and ? close help as they open it; help's text takes
  focus, so that it scrolls by keyboard.
- **Contrast.** The readout has a backing (its text measured 1.0:1 over
  the top of the Mach colour map), unblurred, so that software rendering
  does not redraw a blur at every frame; panels are 0.9 opaque; the
  pressed mode shows an accent bar.
- **The flow is fitted clear** of the readout, the panels and the bottom
  row, and fitted again when a panel grows (it was drawn under the
  legend at 390 px and under the right panel at 768 px).
- **The PNG** carries the case, the value with its status, and the
  colour scale.
- **The ramp measures before it draws** each batch's frame: the same
  steps and the same state measured, so the same numbers, and its first
  result shows a frame sooner.
- **Tests that test what they claim.** The interface checks press a
  digit in a focused select, close help by its key and by Esc and check
  that focus returns, run at 390 px as at 1440, and run axe-core in every
  field of the flow page; the screenshots are kept as the browser takes
  them. The usability tasks count only once what they are for is in view
  (the band and the status both; the new result, changed). The numbers
  on fixed cases before and after are data (`scripts/numbers-check.mjs`,
  `docs/research/interface/numbers.json`): the ramp on the GPU and the
  CPU (also at -10 deg) and the shock tube's Toro tests 1 and 3 on the
  CPU and test 1 on the GPU are identical at every reading compared.
- **The page's own path changes no number.** `tests/gpu/flow-view.test.ts`
  solves the verified drag as the flow page asks it, to 80 cells across
  (checked every 1000 steps there), once unwatched and once watched, drawn
  between batches and paused (24 pauses): the two outcomes are equal in
  every field, each grid's drag and steps included (45 and 43 minutes on
  software WebGPU here).

### Second review

A second review of these fixes found, and these fix:

- **A saved PNG named the case being set up, not the case drawn.** After a
  run at Mach 2, choosing 3 and pressing K at once saved a file named and
  captioned Mach 3 over the Mach 2 flow, still drawn while the new run
  set up. The name and the caption now come from the case recorded when
  its grid was drawn (`src/app/drawn-case.ts`; the sequence is
  `tests/app/drawn-case.test.ts`, and the interface checks repeat it on
  the page), the colour scale from the frame the PNG draws, and K before
  any flow is drawn says there is nothing to save yet.
- **One body, to the last bit**, on the drag page and the flow page (the
  first item above).
- **Colours mean one thing.** A grid that did not converge is "Not
  converged", as the drag page says it, not "Refused"; red is for no
  value (refused, not converged, a failed GPU), and help says what each
  colour means on the pages that use them.
- **Each outcome is announced once:** the flow page's reason and the
  shock tube's status line are no longer live regions as well.
- **The Case tab fits a phone's sheet**: its note, which repeated help,
  is gone.
- **Failures are named first time:** a flow view that cannot be set up
  leaves a failed state; a GPU error waits for the device's loss before
  it is named; one Esc listener closes menus, in the top bar.
- **The records:** every screenshot taken again from the final build;
  the numbers check compares the ramp's converged reading and names the
  builds it compares; usability is measured against main's tip as well
  as the commit before U0, with the words a tab or disclosure away
  counted apart from those removed.
