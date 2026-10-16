# bowshock

Supersonic airflow around model rockets, simulated in your browser on your
own GPU.

bowshock is for amateur and student rocketry teams who fly beyond Mach 1 and
need drag predictions they can trust, without installing or learning
professional CFD software. Open the page, describe or import your rocket,
watch the shock waves form, and export drag coefficient versus Mach number
with an honest uncertainty band.

> **Status: early development.** Verified 1D and 2D (planar and
> axisymmetric) Euler solvers run on both the CPU and the GPU (WebGPU), with
> their test suites and live demos; the rocket solver does not exist yet.
> Nothing here should be used for flight decisions yet. The plan is in
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

Validated so far, each with its tests and recorded accuracy:

- 1D: exact Riemann problems (Toro's five tests), on the CPU and the GPU.
- 2D: oblique shocks and Prandtl-Meyer expansions against exact theory,
  converged to round-off; second-order accuracy on curved grids.
- Axisymmetric: sharp cones against the Taylor-Maccoll solution. For a
  Mach 3, 20 degree cone the surface pressure error falls as -0.22%,
  -0.12% and -0.061% on successively halved grids, converging at about
  first order.
- Grids generated automatically from rocket noses and bodies (sharp noses,
  Mach 1.2 to 5; a few short noses with steep tips are still refused,
  being fixed): cone-cylinders within 0.3% of Taylor-Maccoll on the
  coarsest grid, converging with refinement (measured at Mach 1.1 and
  1.15 on two grids only). On a tangent-ogive cylinder at Mach 1.98 the
  surface pressure matches an independent exact inviscid solution (method
  of characteristics, itself proven on cones) within 4e-4 in Cp; the NACA
  wind-tunnel pressures lie above both by up to 0.022, for a physical
  reason not yet established.
- The Taylor-Maccoll solution itself reproduces the cone tables of NASA
  SP-3004 within 3e-5 in Cp.

Not yet: viscous flow, blunt noses, fins and the base, and drag. Until
those pass their own validation, bowshock does not report a drag
coefficient.

Limits are stated plainly: power off, zero angle of attack, no motor plume;
base drag is the least certain component; transonic results carry wider
bands.

## Try it

```sh
npm ci
npm run dev
```

Then open the demos:

- **Supersonic ramp:** oblique shocks and Prandtl-Meyer expansion fans,
  solved live on your GPU and drawn as numerical schlieren or colour-mapped
  fields, with the ramp pressure compared against exact theory as the run
  converges.
- **Shock tube:** the 1D solver, on the CPU or the GPU, against the exact
  solution of Toro's five Riemann problems.

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: `npm run check` runs
formatting, linting, type checking and the unit tests; `npm run test:gpu`
runs the WebGPU kernel tests in headless Chromium.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

bowshock is an independent implementation of published numerical methods. It
does not contain or derive from FluidX3D code.
