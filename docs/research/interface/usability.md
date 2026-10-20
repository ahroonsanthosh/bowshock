# Usability before and after U0 and U1

Measured by `scripts/usability.mjs` (headless Chromium on software
WebGPU, SwiftShader, on a shared 4-core machine): before, a build of
`cacc38e` (the commit before U0); after, this branch. Data in
`usability-before.json` and `usability-after.json`.

- **Words, controls, longest paragraph:** what a reader sees, scrolling
  included (closed disclosures and hidden tabs excluded).
- **First result:** seconds from loading to the default case's first
  result on the page (landing: the GPU's status; ramp: the first ramp
  pressure; shock tube: the first L1 error after Run; live flow: the first
  drag on the first grid). **Converged:** the ramp's run to convergence.
- **Actions:** clicks, taps, key presses or scrolls; "none": the page did
  not offer it.

| Page | Width | Words | Controls | Longest paragraph | Height | First result (s) | Converged (s) | See the result (actions) | Band and status (actions) | Mach (actions) | Help (actions) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landing | 390 | 129 to 96 | 3 to 10 | 32 to 32 | 1212 to 881 | 0.5 to 1.0 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| landing | 1440 | 129 to 107 | 3 to 12 | 32 to 32 | 915 to 900 | 0.6 to 0.2 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| ramp | 390 | 122 to 43 | 5 to 16 | 42 to 0 | 961 to 844 | 11.5 to 8.5 | 56.9 to 47.5 | 0 to 0 | 0 to 0 | 1 to 1 | none to 1 |
| ramp | 1440 | 122 to 107 | 5 to 20 | 42 to 21 | 1158 to 900 | 8.1 to 9.0 | 64.5 to 59.3 | 1 to 0 | 1 to 0 | 1 to 1 | none to 1 |
| shock-tube | 390 | 61 to 49 | 7 to 14 | 25 to 0 | 1065 to 844 | 2.2 to 2.3 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| shock-tube | 1440 | 61 to 61 | 7 to 16 | 25 to 7 | 995 to 900 | 2.1 to 2.3 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| flow | 390 | 108 | 16 | 28 | 844 | 11.1 | none | 0 | 0 | 1 | 1 |
| flow | 1440 | 137 | 22 | 28 | 900 | 16.2 | none | 0 | 0 | 1 | 1 |

Better or equal: words, the longest paragraph, the page's height (every
page now fits the window, nothing to scroll), the actions to see a result
and its status, and help (none before).

Worse, with the reasons:

- **Controls** (3 to 10 on the landing, 5 to 20 on the ramp, 7 to 16 on
  the shock tube): the shell every page now shares, the top bar's menus,
  help and full screen (6 on a desktop, 4 on a phone), the panels' collapse
  buttons (2), the canvas (focusable, so the keyboard can pan), and new
  functions: pause and run again, grid lines, and on the ramp one button
  per field where a select stood (switching field takes 1 action, not 2).
  The landing adds the live flow page's link.
- **First result** on the landing (0.5 to 1.0 s at 390 px) and the shock
  tube (0.1 to 0.2 s): within what repeated runs of the same page vary
  here (the landing at 1440 px moved the other way, 0.6 to 0.2 s).
- **The ramp's first result at 1440 px** (8.1 to 9.0 s; converged 64.5 to
  59.3 s, faster): software WebGPU cannot present a canvas, so each frame
  is copied to the page, and the window-wide view copies more pixels than
  the old 1024 px canvas; copied frames are drawn at half resolution to
  hold that cost. With a hardware GPU the frame goes straight to the
  canvas.
- The live flow page is new; its first result waits for the first
  convergence check (250 steps) on software WebGPU.
