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
