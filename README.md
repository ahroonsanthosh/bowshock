# bowshock

Supersonic airflow around model rockets, simulated in your browser on your
own GPU.

bowshock is for amateur and student rocketry teams who fly beyond Mach 1 and
need drag predictions they can trust, without installing or learning
professional CFD software. Open the page, describe or import your rocket,
watch the shock waves form, and export drag coefficient versus Mach number
with an honest uncertainty band.

> **Status: early development.** The verified 1D reference solver and its
> test suite exist; the rocket solver does not yet. Nothing here should be
> used for flight decisions yet. The plan is in
> [docs/design/0002-architecture.md](docs/design/0002-architecture.md).

## What it will do

- Solve the compressible Reynolds-averaged Navier-Stokes equations with the
  Spalart-Allmaras turbulence model, resolving the boundary layer, base flow
  and fins, which together make up most of a supersonic rocket's drag.
- Generate grids automatically from the rocket's shape: no meshing.
- Run entirely in the browser on WebGPU, with a CPU fallback.
- Report every drag coefficient with an uncertainty band built from grid
  convergence and from measured validation error, and split drag into
  friction, pressure, base and fin components.
- Export Cd versus Mach in a simple, documented file format.

## How accuracy is earned

No capability is presented as reliable until it passes validation against
exact solutions or published data, with fixed tolerances recorded in the
repository. The sources used, and how far each has been checked, are listed
in [docs/validation/sources.md](docs/validation/sources.md).

Limits are stated plainly: power off, zero angle of attack, no motor plume;
base drag is the least certain component; transonic results carry wider
bands.

## Try it

```sh
npm ci
npm run dev
```

Then open the shock tube demo, which runs the reference solver live against
the exact solution of Toro's five Riemann problems.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: `npm run check` runs
formatting, linting, type checking and the unit tests; `npm run test:gpu`
runs the WebGPU kernel tests in headless Chromium.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

bowshock is an independent implementation of published numerical methods. It
does not contain or derive from FluidX3D code.
