# bowshock

Supersonic airflow around model rockets, simulated in your browser on your
own GPU.

bowshock is for amateur and student rocketry teams who fly beyond Mach 1 and
need drag predictions they can trust, without installing or learning
professional CFD software. The aim: open the page, describe or import your
rocket, watch the shock waves form, and export drag coefficient versus Mach
number with an honest uncertainty band.

> **Status: early development.** Verified 1D and 2D (planar and
> axisymmetric) Euler solvers run on both the CPU and the GPU (WebGPU), with
> their test suites and live demos, and the inviscid forebody wave drag of
> sharp-nosed bodies is computed with a measured error band. The full
> rocket solver (viscous flow, base and fins) does not exist yet, so
> bowshock gives no total drag coefficient. Nothing here should be used for
> flight decisions yet. The plan is in
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
  Mach 3, 20 degree cone the surface pressure error at one station falls
  as -0.22%, -0.12% and -0.061% on successively halved grids, converging
  at about first order.
- Grids generated automatically from rocket noses and bodies (sharp noses,
  Mach 1.2 to 5; a few short noses with steep tips are still refused,
  being fixed): cone-cylinders within 0.3% of Taylor-Maccoll on the
  coarsest grid, converging with refinement (the slender cones at Mach 1.1
  to 1.2 measured on two grids only). On a tangent-ogive cylinder at Mach
  1.98 the surface pressure matches an independent exact inviscid solution
  (method of characteristics, itself proven on cones) within 4e-4 in Cp;
  the NACA wind-tunnel pressures lie above both by up to 0.022, for a physical
  reason not yet established. Integrated into nose drag, two wind-tunnel
  data sets at Mach 1.98 bracket the exact inviscid value: 3% below (NACA
  RM A53E01, whose report traces it to its model's shape) and 8 to 9% above
  (TN 3716). Measured data of this kind (+-0.005 in Cp) confirm the
  inviscid wave drag to about 10%, not to the precision of the error bands.
- The Taylor-Maccoll solution itself reproduces the cone tables of NASA
  SP-3004 within 3e-5 in Cp.
- The bow shock fitted as the grid's outer boundary, with the exact jump
  conditions across it, on the CPU and the GPU
  ([0006](docs/design/0006-shock-fitting.md)). Forebody drag then
  converges at second order: extrapolated from 20, 40 and 80 cells
  across it lies within 1.2e-7 of Taylor-Maccoll on a Mach 3 cone and
  within 2.4e-6 of the method of characteristics on the TN 3716 ogive.
  On a hemisphere-cylinder the stagnation pressure is within 0.008% of
  its exact value on 20 cells across (capture: up to 9.7%). The GPU's
  fitted drag is within 8e-7 of the CPU's on the same grids. Not yet
  used by the drag page.
- Forebody pressure (wave) drag of sharp-nosed bodies, inviscid, on the
  [nose wave drag page](demos/nose-drag.html): each result is solved on
  nested grids up to 160 or more cells across and reported with its
  measured error band, plus a floor of 0.1% of the value for the error
  that refinement does not remove; where no band can be measured the
  value is shown as not verified. On the drag families checked against
  exact solutions (cones at Mach 2 and 3, an ogive at Mach 1.98) every band
  given contains the true error; the ogive's grids give no band yet (their
  observed orders disagree).

Not yet: viscous flow, blunt noses on the drag page (solved with the
shock fitted, but Von Karman and power-series noses are still refused
by the grid), fins and the base. Until those pass their own validation,
bowshock reports no total drag coefficient.

Limits are stated plainly: power off, zero angle of attack, no motor plume;
base drag is the least certain component; transonic results carry wider
bands.

## Try it

```sh
npm ci
npm run dev
```

Then open the page Vite prints (usually http://localhost:5173/) and pick a
demo. They need a browser with WebGPU (recent Chrome or Edge, for
example); the ramp and the shock tube fall back to the CPU without it.

- **Nose wave drag:** the forebody pressure (wave) drag coefficient of a
  sharp-nosed body of your choice, refined on nested grids on your GPU and
  reported with its measured error band, or as not verified.
- **Supersonic ramp:** oblique shocks and Prandtl-Meyer expansion fans,
  solved live on your GPU and drawn as numerical schlieren or colour-mapped
  fields, with the ramp pressure compared against exact theory as the run
  converges.
- **Shock tube:** the 1D solver, on the CPU or the GPU, against the exact
  solution of Toro's five Riemann problems.

`npm run build` writes a static site to `dist/` that works from any path
on a static host.

## Repository layout

| Path                 | Contents                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| `src/scheme/`        | Gas model, numerical fluxes, limiters, reconstruction, exact Riemann solver   |
| `src/engine-cpu/`    | The double-precision reference engines (1D, and 2D planar or axisymmetric)    |
| `src/engine-gpu/`    | The WebGPU engines and their WGSL shaders, twins of the CPU engines           |
| `src/geometry/`      | Nose and body profiles                                                        |
| `src/grid/`          | Structured grids, the generators for rocket bodies, quality checks            |
| `src/analysis/`      | Integrated forces and the verified forebody drag                              |
| `src/verification/`  | Discretisation error from nested grids                                        |
| `src/validation/`    | Exact and reference solutions, and digitised wind-tunnel data                 |
| `src/render/`        | Display fields, colour map and WebGPU rendering                               |
| `src/app/`, `demos/` | The demo pages                                                                |
| `tests/`             | Unit and validation tests (`tests/gpu/` runs in headless Chromium)            |
| `docs/design/`       | Design records: what was decided, why, and the measurements behind each claim |

The design records, in order:

- [0001](docs/design/0001-architecture.md): first architecture, inviscid
  only (superseded by 0002).
- [0002](docs/design/0002-architecture.md): architecture and milestones,
  with the accuracy-first rules.
- [0003](docs/design/0003-2d-solver.md): the 2D and axisymmetric solver.
- [0004](docs/design/0004-grids.md): grids generated from body profiles.
- [0005](docs/design/0005-solution-verification.md): every result
  carries its measured discretisation error.
- [0006](docs/design/0006-shock-fitting.md): the bow shock fitted as the
  outer boundary instead of captured.

Validation data and how far each source has been checked:
[docs/validation/sources.md](docs/validation/sources.md).

## Development

See [CONTRIBUTING.md](CONTRIBUTING.md). In short: `npm run check` runs
formatting, linting, type checking and the unit tests; `npm run test:gpu`
runs the WebGPU kernel tests in headless Chromium.

## License

AGPL-3.0-or-later. See [LICENSE](LICENSE) and [NOTICE](NOTICE).

bowshock is an independent implementation of published numerical methods. It
does not contain or derive from FluidX3D code.
