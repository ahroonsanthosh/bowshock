# 0001: Overall architecture

- **Status:** Proposed (awaiting owner approval; no solver code is written until this is accepted)
- **Date:** 2026-10-14

This record sets out the physics model, numerical method, technology stack,
validation plan and milestone plan for bowshock, together with the trade-offs
behind each choice. Decisions marked **Open** need the owner's input.

## 1. Physics model

### Decision: axisymmetric, inviscid (Euler) flow, plus analytic corrections

bowshock solves the compressible Euler equations for a body of revolution at
zero angle of attack. Viscous drag components come from published engineering
correlations layered on top of the flow solution.

| Drag component | How it is obtained | Expected fidelity |
|---|---|---|
| Wave / pressure drag (nose, body, boat-tail) | **Solved** by the Euler solver | Better than hobby tools; this is the point of the project |
| Skin friction | Compressible turbulent flat-plate correlation (e.g. van Driest II) | Same as existing hobby tools |
| Base drag (power off) | Published empirical base-pressure correlation | Same as existing hobby tools. Inviscid base flow is physically wrong, so the solver's own base pressure is not used |
| Fins | Supersonic thin-airfoil theory plus fin skin friction, as a labelled correction | Correlation level; fins are not simulated in v1 |
| Motor plume (power on) | Out of scope | n/a |

**Why not RANS?** A turbulence model, wall treatment and the meshing it needs
is a very large effort to build from scratch and validate to a trustworthy
level, and it is slow on consumer GPUs. Wave drag is where hobby tools are
weakest and where an Euler solver gives a real improvement.

**Why axisymmetric rather than 3D?** A 2D axisymmetric grid of about half a
million cells runs at interactive speed on an integrated GPU. A useful 3D grid
needs tens of millions of cells and around a gigabyte of memory. The kernels
are structured so the flux function and limiter can be reused by a later 3D
solver, but 3D (and therefore fins and angle of attack) is not promised.

**Honest consequence:** results are power-off, zero angle of attack, and the
total drag is part solved and part estimated. Every export will report the
components separately so users can see which is which.

## 2. Numerical method

- **Discretisation:** cell-centred finite volume.
- **Flux:** HLLC approximate Riemann solver (Toro, Spruce and Speares 1994),
  with Einfeldt/Davis wave-speed estimates. It resolves contact and shear
  waves well and is cheap. A Rusanov flux is kept as a simple, robust
  debugging fallback.
  - *Alternatives:* AUSM+-up is equally good and better at low Mach, which we
    do not need. Rusanov alone is too diffusive for drag-quality pressures.
- **Reconstruction:** MUSCL on primitive variables with a selectable limiter
  (minmod first, as it is the most robust; van Albada once validated).
- **Time stepping:** SSP Runge-Kutta (2nd order for steady runs, 3rd order for
  the transient visual mode), with **local time stepping** to reach steady
  state quickly. Convergence is judged on the integrated drag force as well
  as the density residual.
- **Axisymmetric source term:** the pressure term in the radial momentum
  equation, discretised in a well-balanced way so that uniform free stream
  stays exactly uniform.
- **Precision:** 32-bit floats on the GPU (WGSL has no 64-bit floats), with
  nondimensionalised variables. Known risk: convergence can stall at the
  level of float round-off; we will measure this.
- **Known numerical risk:** the "carbuncle" instability of HLLC at strong
  bow shocks on grid-aligned shocks. Mitigation: switch to a more
  dissipative flux near strong shocks if it appears.

### Geometry: **Open** (decided at milestone M4 with evidence)

Two credible options:

1. **Cartesian cut-cell grid** (recommended starting point). The user draws a
   radius-versus-length profile, and the same grid works for every rocket with
   no meshing step. Main difficulty: very small cut cells force tiny time steps
   ("small-cell problem"), solved with cell merging or flux redistribution.
   Accuracy of the wall pressure needs care, and wall pressure is exactly what
   drag depends on.
2. **Body-fitted structured grid** following the body surface. Better wall
   accuracy per cell and no small-cell problem, but it needs a simple mesh
   generator and curvilinear metric terms, and blunt noses and boat-tails make
   a single-block grid awkward.

Proposal: build cut-cells in M4 and judge them against the wedge and cone
validation cases. If the wall pressure error is too large, switch to a
body-fitted grid before going further. Because this is an architectural
change, it will be brought back to the owner either way.

## 3. Technology stack

- **Language and build:** TypeScript, Vite, static site deployable to GitHub
  Pages. Tests with Vitest. All dependencies MIT, BSD or Apache-2.0, which are
  compatible with AGPL-3.0-or-later.
- **Primary engine:** WebGPU compute shaders (WGSL). Conserved variables are
  stored as separate float arrays in GPU buffers, ping-ponged between steps.
  The visualisation (schlieren, Mach number, pressure) is rendered straight
  from those buffers without copying data back to the CPU.
- **Reference engine:** a plain TypeScript implementation of the *same*
  scheme. It serves three purposes:
  1. It lets CI test the numerics without a GPU.
  2. GPU kernels are checked against it on identical inputs.
  3. It is the fallback engine, running in a Web Worker on a coarser grid,
     for browsers or devices without WebGPU.

  Scheme constants and choices (limiter, gamma, CFL) live in one shared module
  that feeds both engines, so they cannot silently drift apart.
- **No WebGL2 solver.** It would be a second GPU code base with awkward
  texture-based data handling, and WebGPU is now available in all major
  desktop browsers. Browsers without it get the CPU fallback and a clear
  message explaining the reduced resolution.
- **GPU safety:** the step loop is split into short dispatches to avoid
  browser GPU watchdog timeouts; grid size is chosen from the adapter's
  reported limits.

### Testing the GPU against the CPU

The CPU engine uses 64-bit floats and the GPU 32-bit, and limiters switch
discontinuously near shocks. Requiring the two to agree step by step on shock
problems would produce false failures. So:

- On smooth problems, GPU and CPU must agree to a tight tolerance.
- On shock problems, *each* engine is checked independently against the exact
  solution, with the same error tolerance.

GPU tests run in a browser test page and, best effort, in headless Chromium
in CI. They will not block merges until they prove reliable.

## 4. Validation ladder

Each case gets a page in `validation/` with the reference, the setup, plots,
error numbers, the tolerance and the grid used. A capability is presented as
reliable only after its cases pass.

1. **Sod shock tube** and the Toro 1D test suite (Toro, *Riemann Solvers and
   Numerical Methods for Fluid Dynamics*, ch. 4), compared to an exact Riemann
   solver.
2. **Order of accuracy** on smooth 1D flow (expect 2nd order).
3. **2D Riemann problems** (Lax and Liu 1998) and **free-stream
   preservation** around an embedded body.
4. **Oblique shock on a wedge**: theta-beta-Mach relation (NACA Report 1135).
5. **Prandtl-Meyer expansion** over a convex corner.
6. **Taylor-Maccoll cone flow** (tabulated in NASA SP-3004): the key
   axisymmetric test.
7. **Bow shock standoff** on a sphere-cylinder (Billig 1967 correlation).
8. **Ogive and cone-cylinder surface pressure**: compare with second-order
   shock-expansion theory (Syvertson and Dennis, NACA Report 1328) and with
   wind-tunnel data (specific NACA/NASA reports still to be located).
9. **Whole-rocket Cd versus Mach** against published flight or wind-tunnel
   data (data sets still to be located and verified).

Every quoted drag number comes with a three-grid convergence study.

References marked "to be located" will not be cited until they have been
checked against the original document.

## 5. Drag export format

- **Primary:** CSV with a mandatory comment header (bowshock version,
  geometry summary, reference area and length conventions, conditions).
  Columns:
  `mach, cd_total, cd_pressure, cd_friction, cd_base, cd_fins, converged`.
  Reference area is the maximum body cross-section unless stated otherwise.
- **Sidecar:** JSON with full metadata (geometry, grid, scheme, residual
  history, version and git commit).
- **Other simulators:** the format is documented and versioned. Converters
  for specific tools (for example RASAero II or OpenRocket) will be added only
  after their actual import mechanism has been checked and a round trip
  tested. We will not claim compatibility before then. **Open:** the owner's
  private simulator should be able to read the format; feedback on the column
  set is welcome.

## 6. Milestones

Each milestone ends with a working demo page and passing tests.

| | Milestone | Demo |
|---|---|---|
| M0 | Scaffold: Vite, TypeScript, Vitest, CI, licence, docs | Page that detects WebGPU and reports adapter limits |
| M1 | 1D Euler in TypeScript (HLLC, MUSCL, SSP-RK) and exact Riemann solver; Toro tests in CI | Live Sod shock tube plot |
| M2 | Same 1D scheme on WebGPU, checked against M1 | Sod on GPU with exact solution overlaid |
| M3 | 2D planar Euler, CPU and GPU; live schlieren rendering | Supersonic flow over a wedge and a corner |
| M4 | Embedded body (cut-cell), local time stepping, force integration | Wedge as an embedded body; geometry decision gate |
| M5 | Axisymmetric source term; cone and ogive validation | First validated pressure drag numbers |
| M6 | Rocket pipeline: profile editor, Mach sweep, corrections, export, CPU fallback | Release v0.1 |

Later, not promised: fins in 3D, angle of attack, transient mode, full 3D.

## 7. Risks and limitations to document publicly

- Wall pressure accuracy on embedded-boundary grids (highest technical risk;
  gated at M4).
- Transonic results (about Mach 0.8 to 1.2) are lower confidence: shock
  positions there are sensitive to viscous effects, convergence is slow, and
  far-field boundaries must be placed far away.
- Base drag, boat-tail separation and fin effects are correlation-level, not
  simulated. The visuals must not imply otherwise; each export carries a
  confidence note.
- 32-bit float convergence limits.
- Browser GPU limits: buffer size caps, watchdog timeouts, mobile GPUs.

## 8. Independence and licensing

- No FluidX3D code is read while writing bowshock code, nor copied or
  adapted. Methods come from published papers and textbooks, cited in the
  source file that implements them and in `NOTICE`.
- bowshock shares no code with the owner's private simulator; they connect
  only through the exported file format.
