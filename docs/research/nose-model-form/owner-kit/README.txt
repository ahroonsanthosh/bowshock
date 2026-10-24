Owner's GPU run kit: TN 4233 rows below indicated Mach 1.078 at r = 8
(design record 0022 section 8 item 9; 0014 10.7 (w))

WHAT IT DOES

Solves the transonic family of design record 0013 on TN 4233's 7 deg
cone-cylinder at the 27 distinct indicated Mach numbers of the 30 table rows
below 1.078 (0.600 to 1.064), on grids r = 1, 2, 4 and 8, on this machine's
GPU through WebGPU in a headless Chromium. It is the same job as
blind-run-3-solve.test.ts beside this folder (same domain, same grid
sequence, the driver's settling tests and constants unchanged), but on the
page's GPU engine: two-float state and residual, red-black implicit steps
with 2 sweeps (the CPU job uses LU-SGS steps). Both iterate to the same
steady solution; the GPU's step count differs.

For each Mach number it writes

  docs/research/nose-model-form/out/blind-run-3/solves-gpu/M<mach>.json

with each grid's drag, steps, time and noise, the finest grid's wall
pressures, the engine, and the WebGPU adapter (vendor, architecture, device,
description, browser). Rows below Mach 1 are solved but NOT evaluated until
the owner's verification plan for the solver below Mach 1 is registered.

NEEDS

- Node 22.12 or newer, git, and a GPU with WebGPU support in Chromium
  (12 GB or more is plenty: the r = 8 grid needs under 100 MB).
- About 1 GB of disk for the checkpoints.

ONE-TIME SETUP

  git clone --branch claude/wip/nose-model-form https://github.com/ahroonsanthosh/bowshock.git
  cd bowshock
  npm ci
  npx playwright install chromium

THE ONE COMMAND (from the repository root)

  npx vitest run --config docs/research/nose-model-form/owner-kit/vitest.config.ts

It runs until every Mach number is done (from 1.064 down). Leave it running.
If it stops (Ctrl-C, sleep, reboot), run the same command again: finished
Mach numbers are skipped and an unfinished one resumes at the next grid
after its last finished one (checkpoints in owner-kit/checkpoints/, which
are not to be committed).

Progress: owner-kit/progress.txt, rewritten at every check, for example

  2026-10-25T09:00:00Z M1.064 r=8 steps=12000 drag=0.102843 residual=3.1e-7 s=640

IF IT SAYS "the adapter is software" OR "no WebGPU adapter"

Headless Chromium on some systems has no hardware WebGPU. Then run headed
(a browser window opens and must stay open):

  HEADED=1 npx vitest run --config docs/research/nose-model-form/owner-kit/vitest.config.ts

On Windows (PowerShell): $env:HEADED="1"; npx vitest run --config ...
To use your own Chrome or Chromium: CHROMIUM_PATH=/path/to/chrome.
On Linux the Vulkan driver of the GPU must be installed.

The kit refuses a software adapter (SwiftShader) for the real run, so a
result file always comes from hardware. It also checks once, on the first
grid of each Mach number, that this GPU's two-float residual matches the
CPU's double-precision one (the page's own check); a GPU that fails it
stops with a "loses the low parts" message.

OPTIONS

  MACHS=1.064,1.062   only these Mach numbers
  FINEST=1            stop at r = 1 (a quick check; written to owner-kit/check/,
                      never to the results)
  SOFTWARE=1          use SwiftShader (the kit's own check only)

A quick first check that the GPU works (a minute or two):

  FINEST=1 MACHS=1.064 npx vitest run --config docs/research/nose-model-form/owner-kit/vitest.config.ts

Its r = 1 drag should be 0.102491 (the CPU engine's 0.10249138836927248,
within about 1e-7 of it relative).

SENDING THE RESULTS BACK (either way)

1. Commit the result files only and push to the same branch:

     git add docs/research/nose-model-form/out/blind-run-3/solves-gpu/*.json
     git commit -m "TN 4233 transonic solves below Mach 1.078 at r = 8 on <your GPU>"
     git pull --no-rebase origin claude/wip/nose-model-form
     git push origin HEAD:claude/wip/nose-model-form

2. Or zip that folder (solves-gpu) and send it, with progress.txt.

EXPECTED TIME (ESTIMATES, NOT MEASURED: no hardware GPU has run this)

Per Mach number on a modern discrete GPU: about 10 minutes to 2 hours,
longest for the rows below Mach 1 and nearest Mach 1, where the CPU needed
five or more times the steps. Whole run: very roughly half a day to two
days. The progress file shows the real rate after the first grids.
