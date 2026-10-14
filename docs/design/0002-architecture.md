# 0002: Architecture (revised)

- **Status:** Proposed. Supersedes [0001](0001-architecture.md).
  Foundations that hold under any option here (project scaffold, CPU
  reference engine, exact solutions, GPU test harness) are being built now.
  The physics fidelity, grid strategy and implicit solver decisions below
  await the owner's approval before solver work depends on them.
- **Date:** 2026-10-14
- **Inputs:** an independent architecture review, a literature and data
  source survey (see [validation sources](../validation/sources.md)), a
  drag-budget study of three representative rockets, and a WebGPU spike.

## 1. Why 0001 was not enough

0001 proposed an inviscid (Euler) solver with skin friction, base drag and fin
drag taken from the same empirical correlations that OpenRocket and RASAero
use. A drag budget for three representative supersonic rockets (54, 98 and
152 mm diameter, Mach 0.8 to 3.5; scoping estimates from textbook methods,
not measurements) shows why that cannot meet the goal:

| Component         | Share of total Cd (supersonic, power off) | Notes                                                                                          |
| ----------------- | ----------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Skin friction     | roughly 40 to 60%                         | Slender rockets (length about 25 diameters). Dominated by roughness and transition uncertainty |
| Base drag         | roughly 15 to 40%                         | Largest physics-reducible error; also where RANS is weakest                                    |
| Fin pressure drag | roughly 2 to 35%                          | Set by leading and trailing edge shape far more than thickness ratio                           |
| Nose wave drag    | roughly 3 to 10%                          | Existing methods already do this well above Mach 1.5                                           |

Solving only the nose wave drag improves a small part of the total. To move
the total, the solver must resolve friction, base flow and fins.

## 2. What accuracy claim is honest

The goal is to be substantially more accurate than existing hobby tools. Two
facts bound what can be _demonstrated_:

1. Good wind-tunnel Cd data carry an uncertainty of a few percent, and
   flight-derived Cd for amateur rockets considerably more. No tool can show
   an advantage smaller than the uncertainty of the data it is checked
   against.
2. RASAero II is built on USAF DATCOM and Missile DATCOM methods (per its
   author) and is compared by its authors against wind-tunnel and flight data
   for conventional rockets. On those configurations it is a strong baseline.
   OpenRocket's own documentation describes it as reasonably accurate up to
   about Mach 1.5.

So bowshock's claims will be:

- **Every Cd comes with an uncertainty band** combining iterative,
  discretisation (grid convergence) and model-form error, the last measured
  on the validation cases. Semi-empirical tools give no error bars.
- **Physics-resolved results where correlations extrapolate:** the transonic
  drag rise, real fin edge shapes, fin-body interference, boat-tails,
  unusual noses and multi-diameter bodies.
- **Accuracy at least comparable to the best existing tool on conventional
  rockets**, shown case by case against published wind-tunnel and flight
  data, and better wherever the validation record shows it.

The project will not claim to be "more accurate" anywhere the validation
record does not show it.

## 3. Physics model

**Compressible Reynolds-averaged Navier-Stokes (RANS)**, wall-resolved, with
the **Spalart-Allmaras model in its SA-neg form**, implemented exactly as
documented on the NASA Turbulence Modeling Resource (now hosted by the AIAA
Turbulence Model Benchmarking Working Group). That resource publishes
grid-converged reference results from two established codes, which is the
only credible way for a new code to prove its turbulence model is
implemented correctly.

- **Roughness:** the SA roughness extension (Aupoix and Spalart, 2003), with
  the user choosing a surface finish. Painted and fibreglass surfaces can be
  transitionally rough at high Reynolds number, which changes friction by
  several percent or more; the roughness value itself is uncertain, so it is
  shown as a band.
- **Transition:** fully turbulent by default; laminar and fully turbulent
  results bracket the uncertainty for small, high-altitude cases. A
  transition model is a later option.
- **Compressibility:** the SA compressibility correction listed on the same
  resource, evaluated and reported, not silently enabled.
- **Base flow:** solved by RANS and validated against the Herrin and Dutton
  supersonic base-flow experiment. RANS is known to struggle with base
  pressure, so a published base-pressure correlation stays available for
  comparison until the validation record decides the default.
- **Gas model:** calorically perfect air (gamma = 1.4). Stagnation
  temperatures reach about 900 K at Mach 4 in the stratosphere, where gamma
  of real air is lower; documented as a limitation.
- **Scope:** power off, zero angle of attack. Plumes, angle of attack and
  roll are out of scope until the core is validated.

## 4. Geometry and grids: no meshing for the user

Rocket geometry is parametric (nose, body sections, transitions, boat-tail,
fins), so grids are generated automatically. The user never meshes.

- **Input:** a built-in rocket editor, and import of OpenRocket `.ork`
  (a ZIP archive containing `rocket.ork` XML) and RASAero `.CDX1` (XML)
  designs. Unsupported components are listed explicitly, never ignored
  silently.
- **Axisymmetric body and base:** a structured, body-fitted, three-block
  grid (body, base region, wake), point-matched at block interfaces, with
  wall spacing for y+ of about 1 (first cell of order 1 micrometre at full
  scale, the drag-budget study confirms). Metrics are computed in double
  precision on the CPU.
- **Fins (3D):** at zero angle of attack an N-fin rocket repeats every
  360/N degrees and is mirror-symmetric, so only a 360/(2N) degree sector is
  solved, cutting cost by a factor of 2N. The first approach to try is
  extruding the axisymmetric blocks around the axis and representing the fin
  as a displacement of the sector's symmetry face. This is the main grid
  risk (fin tips and edges) and is de-risked by an early spike.
- **Quality gates:** every generated grid is checked for positive volumes,
  skewness and achieved y+, and refused with a message if it fails.
- **Cut-cell grids are dropped:** they cannot give the wall resolution RANS
  needs.

## 5. Numerical method

- **Finite volume**, second order, on structured multiblock grids.
- **Inviscid flux:** HLLC is implemented and verified (M1). For RANS, Roe
  (the convention of the reference codes) and SLAU2 (all-speed, resistant
  to the carbuncle instability at blunt noses) will be compared on the
  validation ladder and the default chosen by evidence. Finding from M1
  testing: with Einfeldt wave speeds, HLLC can underestimate the speed of a
  shock produced by a strong collision of two supersonic streams; the scheme
  stays conservative, but this is noted for the flux comparison.
- **Reconstruction:** MUSCL on primitive variables with a smooth limiter
  (van Albada or Venkatakrishnan) that can be frozen late in convergence.
- **Steady-state solver:** implicit, using **data-parallel line relaxation
  (DPLR)**, which solves the stiff wall-normal direction exactly line by
  line and relaxes the others; designed for parallel hardware and suited to
  WebGPU. Built in two steps: point-implicit first, then lines. Explicit
  SSP Runge-Kutta stays for Euler milestones, the live transient view, and
  as the fallback if DPLR fails its gate.
- **Convergence:** judged on drag, not only residuals: Cd must change by
  less than 1e-4 over a window, and the remaining iterative error is
  estimated and reported.

## 6. Running in the browser

- **WebGPU compute (WGSL)** is the primary engine. WGSL has no 64-bit
  floats, and there is no plan in the standard to add them, so the GPU works
  in 32-bit with nondimensional variables, double-precision metrics from the
  CPU, deterministic fixed-order reductions, and force integration in double
  precision on the CPU.
- **TypeScript CPU reference engine** (double precision) implements the same
  scheme. It is the oracle for tests and the fallback for browsers without
  WebGPU (Firefox on Linux and Android, at the time of writing).
- **Measured in the M0 spike:** headless Chromium runs WebGPU compute on a
  software adapter, so GPU kernels are tested automatically in CI. In the
  same spike only about 70% of 32-bit GPU results were bit-identical to a
  32-bit emulation on the CPU (WGSL permits a few units of rounding error in
  division and square root), so GPU tests compare at tolerances, never
  bitwise.
- **Performance estimates (to be measured):** axisymmetric RANS at about
  120,000 cells should take well under a minute per Mach point on a laptop
  GPU. A 3D fin sector at 1 to 3 million cells takes minutes on a desktop
  GPU. Full Mach sweeps therefore use axisymmetric runs at every Mach
  number plus 3D runs at a few Mach numbers to obtain the fin increment,
  which is interpolated and reported as such.

## 7. Usability: the FluidX3D lesson

Open the page, choose or import a rocket, press run, and watch the flow
develop: a coarse grid gives a live picture within seconds while finer grids
refine the numbers. Results show Cd versus Mach with uncertainty bands and a
per-component breakdown, and export in one click. Defaults are chosen so a
first-time user gets a sound answer without touching a setting; expert
settings exist but are never required.

## 8. Export

CSV with a commented header (version, geometry summary, reference area and
length, conditions, confidence notes) and columns `mach, cd_total,
cd_total_low, cd_total_high, cd_friction, cd_pressure, cd_base, cd_fins,
converged`, plus a JSON file with full provenance (geometry, grids, scheme,
convergence history, version and commit).

Findings on other tools: RASAero II cannot import a Cd curve; OpenRocket has
no native import, but a simulation extension can replace aerodynamic forces.
Converters or plugins will be built only after a round trip has been tested.
RocketPy accepts drag curves as files and is a likely first target (to be
verified).

## 9. Testing and validation

Three kinds of GPU-versus-CPU test, so none is flaky: kernel-by-kernel
comparison at a few units in the last place; smooth flows compared engine to
engine at tight relative tolerance; shock and RANS cases compared each
against the reference solution, never engine against engine.

The validation ladder, in order, each with a fixed tolerance:

1. Exact Riemann problems and order of accuracy (done in M1).
2. 2D: free-stream preservation on distorted grids, oblique shock,
   Prandtl-Meyer expansion, manufactured solutions.
3. Axisymmetric: Taylor-Maccoll cones (NASA SP-3004, NACA Report 1135).
4. Laminar flat plate (Blasius, compressible similarity solution).
5. RANS verification against the reference codes on the Turbulence
   Modeling Resource flat plate and bump cases.
6. Compressible turbulent flat plate against van Driest II at Mach 2.
7. Axisymmetric transonic bump (Bachalo and Johnson), supersonic base flow
   (Herrin and Dutton), cone-cylinder and ogive-cylinder pressures (NACA RM
   E52C10, NACA TN 3716).
8. Whole vehicles: ARCAS sounding rocket wind-tunnel data (NASA TN D-4013
   and D-4014, Mach 0.6 to 4.63), finned-body free flight (NACA RM A53D02),
   Army-Navy Basic Finner range data.
9. Amateur flight data: plausibility only, never a pass/fail gate.

Regression baselines, property-based tests and mutation checks (planting
bugs to confirm tests catch them) are used throughout.

## 10. Milestones and decision gates

|     | Milestone                                                     | Gate                                                                                               |
| --- | ------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| M0  | Scaffold, CI, WebGPU detection, headless GPU tests            | Done                                                                                               |
| M1  | 1D Euler CPU reference, exact Riemann solver                  | Done: order 2.00 on smooth flow; Toro tests                                                        |
| M2  | 1D Euler on WebGPU, kernel comparison harness                 | GPU matches exact solutions as the CPU does                                                        |
| M3  | 2D curvilinear multiblock Euler (CPU and GPU), live schlieren | Free stream, wedge, expansion, manufactured solutions                                              |
| M4  | Axisymmetric terms, grid generator v1                         | Taylor-Maccoll within 1%; grids pass quality checks on 100 random rockets. **Gate: grid approach** |
| M5  | Implicit solver (point-implicit, then DPLR)                   | Converges in under 500 iterations; same answer as explicit. **Gate: DPLR on WebGPU**               |
| M6  | Laminar Navier-Stokes                                         | Blasius within 1%; order 2                                                                         |
| M7  | SA-neg, wall distance, roughness                              | Within about 1% of the reference codes on the flat plate and bump                                  |
| M8  | Axisymmetric RANS rocket body and base                        | Body drag within 3% of data. **Gate: RANS or correlation for base**                                |
| M9  | Mach sweeps, uncertainty bands, export, imports, CPU fallback | Release 0.1 (axisymmetric; fins by labelled correlation)                                           |
| M10 | 3D sector Euler with fins                                     | Fin wave drag against supersonic thin-airfoil theory                                               |
| M11 | 3D RANS sector; Basic Finner                                  | Within 5% at Mach 1.5 to 3. **Gate: cost on laptops**                                              |
| M12 | Transition option, flux decision, full validation report      | Release 1.0                                                                                        |

Spikes to run early: DPLR convergence in 32-bit on stretched grids; the fin
grid on 50 real fin planforms; a literature survey of RANS base-pressure
results; and running OpenRocket and RASAero on the validation set to show
where they miss.

## 11. Limitations to publish

Power off, zero angle of attack, no plume; base drag is the least certain
component; transonic results carry wider bands; roughness and transition are
user inputs; constant-gamma gas. The visuals must never suggest more fidelity
than the numbers have.
