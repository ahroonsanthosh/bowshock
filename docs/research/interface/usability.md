# Usability before and after U0 and U1

Measured by `scripts/usability.mjs` (headless Chromium on software
WebGPU, SwiftShader, on a shared 4-core machine under a load of 15 to
18): before, a build of `cacc38e` (the commit before U0); after, this
branch with the review's fixes. Both builds were measured at the same
time, side by side, so that both saw the same load. Data in
`usability-before.json` and `usability-after.json`.

- **Words, controls, longest paragraph:** what a reader sees, scrolling
  included (closed disclosures, hidden tabs and text for screen readers
  only excluded).
- **First result:** seconds from loading to the default case's first
  result on the page (landing: the GPU's status; ramp: the first ramp
  pressure; shock tube: the first L1 error after Run; live flow: the
  first drag on the first grid). **Converged:** the ramp's run to
  convergence.
- **Actions:** clicks, taps, key presses or scrolls; "none": the page did
  not offer it. A task counts only once what it is for is in view: the
  band and the status both, after the run's outcome (the ramp: the
  difference from the exact pressure, and Converged; the shock tube: the
  L1 error against the exact solution; the live flow: the value, with its
  band where one is measured, and its status); the new result after the
  Mach number changes, each of its parts changed.
- **The live flow page** is measured on its fixed case, the finest grid
  20 cells across (`?finest=1`), which software WebGPU here finishes in
  minutes. A band needs four grids (160 across), so here its outcome is
  the value marked "Not verified" with the reason; the band appears in
  the same place when it is measured. The page is new; it has no
  before.

| Page | Width | Words | Controls | Longest paragraph | Height | First result (s) | Converged (s) | See the result (actions) | Band and status (actions) | Mach (actions) | Help (actions) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landing | 390 | 129 to 96 | 3 to 10 | 32 to 32 | 1212 to 881 | 0.9 to 0.4 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| landing | 1440 | 129 to 107 | 3 to 12 | 32 to 32 | 915 to 900 | 0.7 to 0.2 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| ramp | 390 | 122 to 41 | 5 to 16 | 42 to 0 | 961 to 844 | 11.4 to 6.5 | 74.4 to 68.6 | 0 to 0 | 0 to 0 | 1 to 1 | none to 1 |
| ramp | 1440 | 122 to 105 | 5 to 20 | 42 to 21 | 1158 to 900 | 10.5 to 7.0 | 93.6 to 98.7 | 1 to 0 | 1 to 0 | 1 to 1 | none to 1 |
| shock-tube | 390 | 61 to 47 | 7 to 14 | 25 to 0 | 1065 to 844 | 2.0 to 2.5 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| shock-tube | 1440 | 61 to 59 | 7 to 16 | 25 to 7 | 995 to 900 | 2.1 to 2.2 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| flow | 390 | 104 | 16 | 28 | 844 | 16.1 | none | 0 | 0 | 1 | 1 |
| flow | 1440 | 133 | 22 | 28 | 900 | 21.0 | none | 0 | 0 | 1 | 1 |

Better or equal: words, the longest paragraph, the page's height (the
ramp, the shock tube and the live flow now fit the window; the landing
is shorter but still 881 px in an 844 px window at 390 px, so it
scrolls by 37 px), the first result on the landing and the ramp, the
actions to see a result and its status, and help (none before).

Worse, with the reasons:

- **Controls** (3 to 10 on the landing, 5 to 20 on the ramp, 7 to 16 on
  the shock tube): the shell every page now shares, the top bar's menus,
  help and full screen (6 on a desktop, 4 on a phone), the panels'
  collapse buttons (2), the canvas (focusable, so the keyboard can pan),
  and new functions: pause and run again, grid lines, and on the ramp one
  button per field where a select stood (switching field takes 1 action,
  not 2). The landing adds the live flow page's link.
- **The shock tube's first result** (2.0 to 2.5 s at 390 px, 2.1 to 2.2 s
  at 1440 px): within what the same page varies between runs here; in
  the run before this one, also side by side, it went the other way (2.6
  to 2.2 s and 2.3 to 2.0 s).
- **The ramp's convergence at 1440 px** (93.6 to 98.7 s; at 390 px it is
  faster, 74.4 to 68.6 s): software WebGPU cannot present a canvas, so
  each frame is copied to the page, and the window-wide view copies more
  pixels than the old 1024 px canvas (copied frames are drawn at half
  resolution to hold that cost). With a hardware GPU the frame goes
  straight to the canvas. Against the build the review saw (`282baeb`),
  side by side, it converges in the same time (95.5 and 95.6 s): the
  review's fixes cost nothing here.

The ramp's first result is sooner than before because the ramp now
measures before it draws each batch's frame (the same steps and the same
state measured, so the same numbers: `numbers.json`). Timed alone, three
times each, alternating builds (the medians): 13.9 to 9.6 s at 1440 px,
14.8 to 8.9 s at 390 px.
