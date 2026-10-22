# bowshock

**Supersonic CFD for model rockets, in your browser, on your own GPU.**
bowshock computes the drag of rockets flying faster than sound, for amateur
and student teams going past Mach 1. Nothing to install, no cluster, no
licence fee.

**[Try it in your browser](https://ahroonsanthosh.github.io/bowshock/)**
(needs WebGPU, for example a recent Chrome or Edge).

![The live flow page: the Basic Finner's nose cone and body at Mach 2, schlieren above the axis and Mach number below](docs/images/hero.webp)

> Early development. Don't use it for flight decisions yet.

## Why it matters

Teams flying supersonic rockets need a drag curve, and today they get one
from expensive commercial CFD or from rough empirical tools that never say
how wrong they might be. bowshock solves the flow properly on the GPU you
already have, and every number it shows says how far it has been checked.
Where its methods don't reach, it refuses and tells you why, instead of
guessing.

## What works today

| Capability                                                                    | Status                                                                                                                                                                         |
| ----------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Nose wave drag** (cones, ogives, parabolic, ellipsoid and Von Karman noses) | **Verified**, Mach 1.2 to 5: each result carries an error band measured from nested grids. Von Karman noses only at Mach 1.5 to 3 and 1 to 5 calibers long (up to 3 at Mach 3) |
| **Live flow view**                                                            | The same solve, drawn as it converges (schlieren, Mach, pressure, density)                                                                                                     |
| **Solver checks**                                                             | **Verified** against exact solutions: shock tube, oblique shocks, expansions, cones                                                                                            |
| **Skin friction**                                                             | **Validated**: within -12% to +19% of all 23 wind-tunnel and flight measurements                                                                                               |
| **Fin and base drag**                                                         | **Estimated** from component wind-tunnel data, with bands                                                                                                                      |
| **Total drag** (nose, body and fins)                                          | **An estimate, not validated yet.** Refused for most realistic rockets until the missing components are built                                                                  |
| **Mach 1 to 1.2**                                                             | Prototype, not served                                                                                                                                                          |
| **Viscous flow (RANS)**, angle of attack, motor plume                         | Not built yet                                                                                                                                                                  |

What the labels mean: **verified** means the numerical error was measured;
**validated** means it was compared with real measurements; **estimated**
means a band from component data, not yet tested on a whole rocket;
**refused** means no number, with the reason.

The total drag passed its first hold-out test (the Basic Finner reference
rocket, 11 free-flight shots at Mach 1.8 to 3.0, all within tolerance).
One input was later corrected, so that result no longer counts. The next
registered test (BRL Report 934) will decide whether the claim comes back.

## How accuracy is kept honest

- **Tests are registered before they're run.** Validation data is held
  back, and how it will be used is committed before any model sees it.
- **Every figure is read twice**, independently, from the source.
- **Independent audits** of the method, the readings and the code.
- **Refusals over guesses.** No measured band, no number.

The full record, with every measurement behind every claim, is in
[docs/design/](docs/design/) and [docs/validation/sources.md](docs/validation/sources.md).

## Run it locally

Requires Node.js 22.12 or newer.

```sh
npm ci
npm run dev        # serve the pages, open the address Vite prints
npm run check      # formatting, lint, types and unit tests
npm run test:gpu   # WebGPU tests in headless Chromium
```

## What's next

- A viscous (RANS) solver with a turbulence model, for friction, base and
  fin drag computed directly
- A total drag validated for the rockets teams actually fly, including
  swept fins and Von Kármán noses
- Mach 1 to 1.2
- Whole-rocket grids with fins, no meshing needed
- Export drag versus Mach as a file for flight simulators

## Contributing

Correctness first: published methods only, written from scratch and cited
in the code, every change tested. See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE). bowshock
is an independent implementation of published methods and contains no
FluidX3D code; its interface is inspired by FluidX3D's look.
