# Contributing to bowshock

Thank you for helping. bowshock aims to give rocketry teams drag predictions
they can trust, so correctness comes before features.

## Ground rules

1. **Published methods only, implemented from scratch.** Cite the paper or
   book (with equation numbers where possible) in a comment next to the code
   that implements it, and add it to [NOTICE](NOTICE).
2. **No FluidX3D code.** Do not copy, adapt or translate code from FluidX3D
   (its licence is incompatible), and do not read its source while writing
   bowshock code.
3. **No unverified numbers.** Reference data and citations must come from a
   source you have checked. If you could not check it, say so in the code or
   document and keep it out of the validation record.
4. **Every change is tested.** New numerics need tests against exact or
   published solutions. Bug fixes need a test that failed before the fix.
5. **Readable over clever.** Prefer clear names and straightforward loops.
   Explain the physics and the reason for each numerical choice.

## Development

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev        # local development server
npm run check      # format check, lint, typecheck, unit tests
npm run test:gpu   # WGSL kernel tests in headless Chromium
```

`npm run test:gpu` needs Chromium. Either run `npx playwright install chromium`
or set `CHROMIUM_PATH` to an existing Chromium binary. Without a hardware GPU
Chromium falls back to SwiftShader (software WebGPU), which is slow but runs
the same shaders.

## Testing GPU code

The GPU uses 32-bit floats and WGSL allows a few units of rounding error in
operations such as division and square root, so GPU results are never compared
bit for bit with the CPU. Instead:

- small kernels are compared with their TypeScript twins at a tolerance of a
  few units in the last place;
- smooth flow problems are compared with the CPU engine at a tight relative
  tolerance;
- problems with shocks are checked by comparing each engine separately with
  the exact or reference solution.

## Licence

By contributing you agree that your contributions are licensed under
AGPL-3.0-or-later.
