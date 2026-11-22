# shockFluidHeun

OpenFOAM 13's `shockFluid` solver module (package `openfoam13` 20260624,
`/opt/openfoam13/applications/modules/shockFluid`), renamed
`shockFluidHeun` (every `shockFluid` replaced, the four boundary
conditions of its `derivedFvPatchFields` left out, since these runs use
none of them), with one change: with `nOuterCorrectors 2` each time step
is Heun's two-stage, strong-stability-preserving Runge-Kutta step.

Under local time stepping, shockFluid's two passes give y + dt R(y + dt
R(y)), which is not that step (README, set-up trial 5). Here the second
pass's mass, momentum and energy fluxes are the means of the first
pass's, from the state at the step's start, and its own, from the first
pass's state. Each update is linear in its flux, so the step is y + dt (R(y)
+ R(y + dt R(y))) / 2 exactly. The local time step is fixed for the step,
and no state between the passes is formed. With one pass it is
shockFluid. `heun.diff` is the whole change against the renamed
original.

Build (it installs `libshockFluidHeun.so` in OpenFOAM's user library
folder, where `foamRun` finds it for `solver shockFluidHeun;`):

```bash
cp -r shockFluidHeun /tmp/shockFluidHeun-build
```

```bash
cd /tmp/shockFluidHeun-build && bash -c "source /opt/openfoam13/etc/bashrc; wmake libso"
```

# cellVenkatakrishnanGrad

OpenFOAM 13's `cellLimitedGrad` gradient scheme with Venkatakrishnan's
limiter in its full form, with the smoothing term eps^2 = (K h)^3
(J. Comput. Phys. 118, 1995); OpenFOAM's own `Venkatakrishnan` limiter
is the form without it. For each face of a cell, with d2 the change the
gradient gives from the cell's centre to the face's and d1 the largest
change to a neighbour in d2's direction:

    psi = (d1^2 + eps^2 + 2 d1 d2)/(d1^2 + 2 d2^2 + d1 d2 + eps^2)

The cell's limiter is the least psi over its faces, capped at 1, per
component. h is the square root of the cell's wedge-face area for a cell
on a wedge patch, else the cube root of its volume. With K = 0 the
gradients are `cellLimited<Venkatakrishnan> Gauss linear 1`'s (to
round-off). Use:

    libs ("libcellVenkatakrishnanGrad.so");                (controlDict)
    gradSchemes { default cellVenkatakrishnan Gauss linear <K>; }

Build:

```bash
cp -r cellVenkatakrishnanGrad /tmp/cellVenkatakrishnanGrad-build
```

```bash
cd /tmp/cellVenkatakrishnanGrad-build && bash -c "source /opt/openfoam13/etc/bashrc; wmake libso"
```
