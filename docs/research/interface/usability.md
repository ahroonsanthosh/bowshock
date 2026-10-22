# Usability before and after U0 and U1

Measured by `scripts/usability.mjs` (headless Chromium on software
WebGPU, SwiftShader, on a shared 4-core machine under load) on three
builds at the same time, side by side, so that all saw the same load:

- **before:** `cacc38e`, the commit before U0 (`usability-before.json`);
- **main:** main's tip, `68ae3ee`, this branch's merge base
  (`usability-main.json`); its ramp and shock tube are cacc38e's pages,
  its landing has main's later text;
- **after:** this branch with both reviews' fixes (`usability-after.json`).

What is measured:

- **Words, controls, longest paragraph:** what a reader sees, scrolling
  included (text for screen readers only excluded).
- **Words a tab or disclosure away:** words not shown but one tap away,
  in a phone sheet's other tab or a closed disclosure. They are counted
  here, not as removed.
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
  the value marked "Not verified" with the reason; the band shows in the
  same place when it is measured. The page is new; it has no before.

## Against the commit before U0 (cacc38e)

| Page | Width | Words | Words a tab or disclosure away | Controls | Longest paragraph | Height | First result (s) | Converged (s) | See the result (actions) | Band and status (actions) | Mach (actions) | Help (actions) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landing | 390 | 129 to 96 | 0 to 39 | 3 to 10 | 32 to 32 | 1212 to 881 | 1.1 to 0.4 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| landing | 1440 | 129 to 107 | 0 to 39 | 3 to 12 | 32 to 32 | 915 to 900 | 0.2 to 3.3 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| ramp | 390 | 122 to 41 | 0 to 51 | 5 to 16 | 42 to 0 | 961 to 844 | 12.6 to 6.8 | 84.7 to 82.7 | 0 to 0 | 0 to 0 | 1 to 1 | none to 1 |
| ramp | 1440 | 122 to 105 | 0 to 0 | 5 to 20 | 42 to 21 | 1158 to 900 | 13.1 to 9.7 | 93.0 to 109.2 | 1 to 0 | 1 to 0 | 1 to 1 | none to 1 |
| shock-tube | 390 | 61 to 47 | 0 to 8 | 7 to 14 | 25 to 0 | 1065 to 844 | 2.5 to 2.4 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| shock-tube | 1440 | 61 to 59 | 0 to 0 | 7 to 16 | 25 to 7 | 995 to 900 | 2.5 to 2.2 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| flow | 390 | 70 | 101 | 16 | 16 | 844 | 17.4 | none | 0 | 0 | 1 | 1 |
| flow | 1440 | 99 | 66 | 22 | 16 | 900 | 17.8 | none | 0 | 0 | 1 | 1 |

## Against main's tip (68ae3ee)

| Page | Width | Words | Words a tab or disclosure away | Controls | Longest paragraph | Height | First result (s) | Converged (s) | See the result (actions) | Band and status (actions) | Mach (actions) | Help (actions) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| landing | 390 | 167 to 96 | 0 to 39 | 3 to 10 | 60 to 32 | 1332 to 881 | 0.3 to 0.4 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| landing | 1440 | 167 to 107 | 0 to 39 | 3 to 12 | 60 to 32 | 963 to 900 | 0.8 to 3.3 | none to none | 0 to 0 | none to none | none to none | none to 1 |
| ramp | 390 | 122 to 41 | 0 to 51 | 5 to 16 | 42 to 0 | 961 to 844 | 11.8 to 6.8 | 81.2 to 82.7 | 0 to 0 | 0 to 0 | 1 to 1 | none to 1 |
| ramp | 1440 | 122 to 105 | 0 to 0 | 5 to 20 | 42 to 21 | 1158 to 900 | 14.2 to 9.7 | 102.2 to 109.2 | 1 to 0 | 1 to 0 | 1 to 1 | none to 1 |
| shock-tube | 390 | 61 to 47 | 0 to 8 | 7 to 14 | 25 to 0 | 1065 to 844 | 2.3 to 2.4 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |
| shock-tube | 1440 | 61 to 59 | 0 to 0 | 7 to 16 | 25 to 7 | 995 to 900 | 2.1 to 2.2 | none to none | 2 to 1 | 1 to 0 | none to none | none to 1 |

## Where the words went at 390 px

Fewer words in view at 390 px is not words removed. One tap away:

- the landing, 39 words at both widths: the GPU's limits, in a closed
  disclosure ("Your GPU and its limits");
- the ramp, 51: the comparison against exact theory, in the sheet's
  Exact tab (its result, the ramp pressure, the exact one and their
  difference, stays in view on the pinned line);
- the shock tube, 8: its Exact tab (the L1 error stays in view on the
  pinned line);
- the live flow, 101 at 390 px (66 at 1440 px): the Drag and View tabs,
  and "What this value is" (the value and its status stay in view on the
  pinned line).

Words removed, and where they went: the ramp's and the shock tube's long
paragraphs (42 and 25 words) became short panel text, with the rest in
help (H); the landing's text is main's README claims, shorter.

## Better or equal

Words in view, the longest paragraph, the page's height (the ramp, the
shock tube and the live flow fit the window, each phone tab fitting its
sheet; the landing is shorter but still 881 px in an 844 px window at
390 px, so it scrolls by 37 px), the ramp's first result, the actions to
see a result and its band and status, and help (none before).

## Worse, with the reasons

- **Controls** (3 to 10 or 12 on the landing, 5 to 16 or 20 on the ramp,
  7 to 14 or 16 on the shock tube): the shell every page now shares, the
  top bar's menus, help and full screen (6 on a desktop, 4 on a phone),
  the panels' collapse buttons (2), the canvas (focusable, so the
  keyboard can pan), and new functions: pause and run again, grid lines,
  and on the ramp one button per field where a select stood (switching
  field takes 1 action, not 2). The landing adds the live flow page's
  link.
- **The landing's first result at 1440 px** (0.2 to 3.3 s here): one slow
  load among three browsers starting at once. Timed alone, five times
  each, alternating builds, the medians are 0.20 s before, 0.39 s on
  main and 0.25 s after at 1440 px (0.21, 0.08 and 0.14 s at 390 px); the
  slowest single load after was 1.5 s.
- **The shock tube's first result at 390 px against main** (2.3 to 2.4 s):
  within what runs of the same page vary here; against the commit before
  U0 it is 2.5 to 2.4 s.
- **The ramp's convergence at 1440 px** (93.0 to 109.2 s against cacc38e,
  102.2 to 109.2 s against main; at 390 px 84.7 to 82.7 and 81.2 to 82.7
  s): software WebGPU cannot present a canvas, so each frame is copied to
  the page, and the window-wide view copies more pixels than the old
  1024 px canvas (copied frames are drawn at half resolution to hold that
  cost). With a hardware GPU the frame goes straight to the canvas. The
  numbers it converges to are the same (`numbers.json`), and its first
  result comes sooner: the ramp now measures before it draws each batch's
  frame.
