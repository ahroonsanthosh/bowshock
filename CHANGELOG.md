# Changelog

Each release of bowshock is tagged in git as `vX.Y.Z`.

## bowshock 0.11.0 (2026-11-05)

- Fin shock reflections on hexagonal fin sections studied by the planar
  method of characteristics and Euler runs; the refusal is kept.
- README status and screenshot brought up to date.

## bowshock 0.10.0 (2026-10-29)

- Von Karman noses served at Mach 3 up to 6 calibers.
- Fin edge bands extended: fins near the base, rounded leading edges and
  square trailing edges below Mach 1.5.
- Body base band (0.77 to 1.17) checked against every body-alone base
  pressure in the domain.
- Unswept flat plates at the base refused below Mach 1.62.

## bowshock 0.9.0 (2026-10-24)

- The rocketeer page: one page with a drag curve, OpenRocket import and a
  3D view with flow streaks and schlieren.
- Transonic nose solver for Mach 1.05 to 1.2.
- BRL Report 934 range A hold-out run.
- Refused totals report the parts served and a floor.

## bowshock 0.8.0 (2026-10-21)

- The interface: shell, tokens and a flow view drawn from the solver's own
  buffers.
- Round 5 audit and BRL Report 934 as a second Basic Finner hold-out.

## bowshock 0.7.0 (2026-10-19)

- Fin wave drag: exact section drag and linear 3D planform drag.
- Base drag and total drag; the Basic Finner validation passes at all 11
  shots.
- Demos published with GitHub Pages.

## bowshock 0.6.0 (2026-10-18)

- Ellipsoid (blunt) noses validated against the method of characteristics.
- Skin friction library: van Driest II, laminar similarity and transition.

## bowshock 0.5.0 (2026-10-17)

- Steady bow-shock fitting on CPU and GPU.
- Drag page with the fitted bow shock and a measured floor.
- Refusals where the flow is subsonic at the tip or base.

## bowshock 0.4.0 (2026-10-16)

- Grid convergence error bands and verified forebody pressure drag on the
  GPU.

## bowshock 0.3.0 (2026-10-15)

- Nose cone profiles compatible with OpenRocket and grids generated from
  rocket bodies.
- Verification by manufactured solution and against NASA SP-3004.

## bowshock 0.2.0 (2026-10-15)

- 2D Euler solver on WebGPU, a live supersonic ramp demo and Taylor-Maccoll
  cone validation.

## bowshock 0.1.0 (2026-10-14)

- Project scaffold, CI, and 1D Euler solvers on CPU and WebGPU.

## bowshock 0.0.0 (2026-10-14)

- Initial commit: licence, README and architecture record.
