# bowshock

Supersonic airflow around model rockets, simulated in your browser on your
own GPU.

bowshock is for amateur and student rocketry teams who fly beyond Mach 1 and
need drag predictions they can trust, without installing or learning
professional CFD software. The aim: open the page, describe or import your
rocket, watch the shock waves form, and export drag coefficient versus Mach
number with an honest uncertainty band.

**Try it in your browser: <https://ahroonsanthosh.github.io/bowshock/>**
(needs WebGPU: a recent Chrome or Edge, for example).

> **Status: early development.** Verified 1D and 2D (planar and
> axisymmetric) Euler solvers run on both the CPU and the GPU (WebGPU), with
> their test suites and live demos, and the inviscid forebody wave drag of
> sharp-nosed bodies and ellipsoid noses is computed with a measured error
> band. Skin friction, fin wave drag and base drag exist as libraries, each
> measured against wind-tunnel or flight data
> ([0007](docs/design/0007-skin-friction.md),
> [0009](docs/design/0009-fin-wave-drag.md),
> [0010](docs/design/0010-base-drag-and-total.md)), and their sum, the
> total drag, has passed its one validation test: the Basic Finner in free
> flight, 11 shots at Mach 1.8 to 3.0, measured drag within -7.7% to +4.5%
> of the model, inside a tolerance that is wide (about -20% to +31%). That
> claim covers that class of rocket only, and the total is not yet on the
> drag page. Nothing here should be used for flight decisions yet. The plan
> is in [docs/design/0002-architecture.md](docs/design/0002-architecture.md).

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

Validated so far, each with its recorded accuracy (tests guard most of
them; the fitted-drag families are recorded in
[0006](docs/design/0006-shock-fitting.md)):

- 1D: exact Riemann problems (Toro's five tests), on the CPU and the GPU.
- 2D: oblique shocks and Prandtl-Meyer expansions against exact theory,
  iterated to round-off residuals, with the wall pressure within 0.05% of
  exact theory; second-order accuracy on curved grids.
- Axisymmetric: sharp cones against the Taylor-Maccoll solution. For a
  Mach 3, 20 degree cone the surface pressure error at one station falls
  as -0.22%, -0.12% and -0.061% on successively halved grids, converging
  at about first order.
- Grids generated automatically from rocket noses and bodies, first with
  the shock captured (sharp noses): cone-cylinders at Mach 1.1 to 3.12
  whose conical surface flow is supersonic within 0.3% of Taylor-Maccoll
  on the coarsest grid, converging with
  refinement (the slender cones at Mach 1.1 to 1.2 measured on two grids
  only). On a tangent-ogive cylinder at Mach 1.98 the surface pressure
  matches an independent inviscid reference solution (a method of
  characteristics, converged to about 1e-6 in drag and checked against
  Taylor-Maccoll on cones) within 4e-4 in Cp; the NACA wind-tunnel
  pressures lie above both by up to 0.022, for a physical reason not yet
  established. Integrated into nose drag, wind-tunnel pressures at Mach
  1.98 on two tangent ogives fall on either side of the inviscid value
  computed for each: 3% below on the 5.75-caliber ogive of NACA RM A53E01
  (whose report attributes its low forward pressures to the model's nose
  angle and surface slope errors) and 8 to 9% above on the 3-caliber ogive
  of TN 3716 (not explained). Pressures measured to +-0.004 to 0.005 in Cp
  test the wave drag only to about 10%, not to the precision of the error
  bands.
- The Taylor-Maccoll solution itself reproduces the cone tables of NASA
  SP-3004 within 3e-5 in Cp.
- The bow shock fitted as the grid's outer boundary, with the exact jump
  conditions across it, on the CPU and the GPU
  ([0006](docs/design/0006-shock-fitting.md)). Forebody drag then
  converges at close to second order (observed orders 1.6 to 2.4 on the
  families measured): with the drag page's GPU solver, extrapolated at
  second order from 20, 40 and 80 cells across, it lies within 3.2e-7 of
  its value from Taylor-Maccoll on a bare Mach 3, 20 degree cone (measured
  before the domain was extended past the base; re-measured since on the
  CPU, the same to three figures on 20 and 40 cells across) and
  within 9.4e-6 from the method of characteristics on the TN 3716 ogive
  (within 3e-7 at its observed order, 2.06).
  On a hemisphere-cylinder the stagnation pressure is within 0.008% of
  its exact value on 20 cells across (capture: up to 9.7%). The GPU's
  fitted drag is within 8e-7 of the CPU's on the same grids for cones,
  ogives and hemispheres at Mach 1.98 to 5 (compared on 20 cells across,
  and 40 on a blunt nose), and within 3.8e-6 on ellipsoids at Mach 1.2,
  where the page's fit stops (a twentieth of its allowance of 7e-5).
- Forebody pressure (wave) drag of sharp-nosed bodies, inviscid, at zero
  incidence, on the [nose wave drag page](demos/nose-drag.html): each
  result is solved on your GPU with the bow shock fitted, on nested grids
  of 20 to 160 (or 320) cells across, and reported as the finest grid's
  value with its error band, measured from the grids and including an
  allowance of 7e-5 of the value for an error the grid family cannot
  show (about twice the largest error measured of the procedure's own
  extrapolation); where no band can be measured the value is shown as
  not verified. On the families measured against exact or converged
  reference solutions (on the CPU, which the GPU matches within 8e-7 on
  these families on 20 cells across:
  cones of 5 to 30 deg at Mach 1.3 to 3 on three grids, and at Mach 3
  and 5 on two; 3-caliber tangent ogives at Mach 1.5 to 4, a 5-caliber
  one at Mach 2, and 3-caliber secant-ogive and parabolic noses at Mach
  2.5), the value extrapolated from three grids lies within 3.4e-5 of
  the reference, relative, where its order has settled, and every band
  measured contains the error of the value shown (7.8e-5 on 160 cells
  across for a Mach 1.3, 5 degree cone). On 10-caliber noses at Mach 1.2
  and 1.5, which converge faster than second order, the extrapolation
  misses by up to 6.0e-4, but their bands still contain their errors (by
  1.56 to 2.05 times). Other
  shapes, lengths and Mach numbers are computed the same way but have
  not been compared with a reference. Refused, with the reason: tips
  whose shock detaches; tips whose flow crosses the solver's starting
  plane, just behind the tip, at an axial Mach number below 1, except
  where the flow on the tip's surface is supersonic and the nose meets
  the body without a corner (measured on a 3-caliber tangent ogive at
  Mach 1.35: two differently laid out grid families agree within 1.5e-5);
  of 40 noses of 1 to 3 calibers tried at Mach 1.2 before that exception,
  19 detach their shock and 13 were refused by this test; tips steeper
  than about 40 deg (a limit of the present grids, set on measurement);
  bodies whose flow at their end is subsonic; grids failing the other
  quality gates, as on some long bodies, unless the family solved again
  with 1.5 times the columns along the body passes them (its result is
  then shown with the reason).
- Ellipsoid noses (blunt) on the drag page, the shock standing off ahead
  of the tip on a grid wrapped round the nose: their fitted drag
  converges at observed orders of 1.99 to 2.21, and behind the sonic line
  it agrees with a method of characteristics started from the solution
  within 1e-5 of the nose's drag (3:1 and 2:1 ellipsoids at Mach 2, the
  3:1 at Mach 3; 0006). At Mach 1.2 to 1.5, where the shock stands far
  off, a short body behind the nose is solved longer than asked, to keep
  the grid's cells even (the drag is still that of the body asked for,
  whose flow leaves its end supersonically): of ellipsoids of 0.5 to 6
  calibers with 1, 2 or 5 calibers of body at Mach 1.2, 1.3 and 1.5, all
  pass the page's checks on the coarsest grid but the 6-caliber nose at
  Mach 1.2 (its wall cells near the tip too skewed for the present
  grids); four of them converge on three
  grids at observed orders 1.91 to 2.17, and behind the sonic line the
  method of characteristics agrees within 3.2e-6 of the nose's drag at
  Mach 1.5 and within 6.3e-5 at Mach 1.2, where the flow it starts from
  is barely supersonic. Ahead of the sonic line, where the flow is
  subsonic and no independent reference exists, the drag rests on the
  grids' convergence and the exact stagnation pressure.

- Skin friction, as a library not yet on the drag page
  ([0007](docs/design/0007-skin-friction.md), `src/friction/`): van
  Driest II for turbulent flow, the compressible laminar similarity
  solution, transition at a given Reynolds number, and the friction drag
  of a body of revolution. The implementation reproduces the NASA
  Turbulence Modeling Resource's van Driest II tabulation within 5e-7 and
  van Driest's laminar results (NACA TN 2597) within 0.84%. Against
  measurements, turbulent friction on wind-tunnel cylinders (NACA TN 3097)
  and on the RM-10 body in flight (NACA RM L54G14) lay between 0.88 and
  1.19 times the model in all 23 comparisons: that, -12% to +19%, is the
  band the evidence supports for smooth, adiabatic turbulent layers at
  Mach 1 to 3.6.

- Base drag and the total, as libraries not on the drag page
  ([0010](docs/design/0010-base-drag-and-total.md), `src/base/`,
  `src/total/`): the compiled base-pressure correlation of NACA TN 3819
  with its band (measured over correlation 0.82 to 1.08), the factor for
  fins ending at the base, the base drag of blunt fin trailing edges and
  the drag of rounded fin leading edges (both analogies, with bands set
  from component data read twice), and the sum of the components with
  their bands added linearly. Its one hold-out test, the Basic Finner in
  free flight at Mach 1.8 to 3.0, passes at all 11 shots: measured over
  modelled -7.7% to +4.5% (mean -1.9%), inside a tolerance of -19.5% to
  -26.2% and +26.5% to +31.4%, which is wide; the two shots at Mach 2.97
  lie 5.4% and 7.6% below the model.

Not yet: viscous flow in the solver; friction, fins and the base on the
drag page; Von Karman (Haack) and power-series noses (their tips need
grids being designed); Mach numbers below 1.2; the total drag on the page
(in progress), and a total validated outside the Basic Finner's class.

Limits: power off, zero angle of attack, no motor plume. The widest
component bands are the fins' own drag (measured over model 1.01 to 1.59)
and the base (0.82 to 1.08); transonic results will carry wider bands.

## Try it

Online at <https://ahroonsanthosh.github.io/bowshock/>, built from this
branch on every push. Or locally:

```sh
npm ci
npm run dev
```

Then open the page Vite prints (usually http://localhost:5173/) and pick a
demo. They need a browser with WebGPU (recent Chrome or Edge, for
example); the ramp and the shock tube fall back to the CPU without it.

- **Nose wave drag:** the inviscid forebody pressure (wave) drag
  coefficient of a cone, tangent or secant ogive, parabolic-series or
  ellipsoid nose and its body, not the rocket's total drag, refined on nested
  grids on your GPU and reported with its measured error band, or as not
  verified.
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
| `src/gpu/`           | WebGPU detection                                                              |
| `src/solver/`        | Solver pieces shared by the engines, and the CPU shock fitting                |
| `src/analysis/`      | Integrated forces and the verified forebody drag                              |
| `src/friction/`      | Skin friction: van Driest II, laminar similarity, transition, bodies          |
| `src/fins/`          | Fin wave drag: exact sharp sections, linear 3D drag of the planform           |
| `src/base/`          | Base drag: the compiled base-pressure curve, the fins-on-base factor          |
| `src/total/`         | Total drag from its components, the bands combined linearly                   |
| `src/verification/`  | Discretisation error from nested grids                                        |
| `src/validation/`    | Exact and reference solutions, and digitised wind-tunnel data                 |
| `src/render/`        | Display fields, colour map and WebGPU rendering                               |
| `src/app/`, `demos/` | The demo pages                                                                |
| `tests/`             | Unit and validation tests (`tests/gpu/` runs in headless Chromium)            |
| `docs/design/`       | Design records: what was decided, why, and the measurements behind each claim |
| `docs/research/`     | Research records and work in progress, not used by the solver                 |

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
- [0007](docs/design/0007-skin-friction.md): skin friction (draft), the
  first component of total drag, measured against wind-tunnel and flight
  data.
- [0008](docs/design/0008-total-drag.md): total drag (draft): the method
  and measured band of each component, and the one validation set found
  that matches a simple finned rocket (the Basic Finner in free flight,
  Mach 1.8 to 3.0), audited twice.
- [0009](docs/design/0009-fin-wave-drag.md): fin wave drag (draft), a
  library not yet on the drag page: exact section drag of sharp fins and
  the linear 3D drag of the planform, with the limits of each measured.
- [0010](docs/design/0010-base-drag-and-total.md): base drag and the total
  (draft), libraries not on the drag page, and the Basic Finner gate,
  which the total passes at all 11 shots (the second run; the first was
  refused).

- [0012](docs/design/0012-interface.md): the interface (draft): a
  full-window, dark, visualization-first layout inspired by FluidX3D's,
  with the drag, its band and its status always on screen.

Research records and unfinished work behind them (not used by the solver,
not accepted designs): [docs/research](docs/research/README.md).

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
