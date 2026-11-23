# The OpenFOAM set-up trials' scripts

The scripts behind the set-up trials in `../../README.md` ("The second
solver: OpenFOAM's set-up trials"), as run. They write their cases
outside the repository (paths inside them point at the session's scratch
folder). `ladder.py` runs levels 0 to L-1 of a case, each level from the
one below (`mapFields`); `heuntrial.py` runs it with `shockFluidHeun`
(`LADDER_UPLAIN=1`: `linearUpwind` for the momentum, `LADDER_TARGET`: stop
a level once its residual is at or below that power of ten);
`limtrial.py` the cone's level 1 with another gradient limiter;
`wedgetest2.py` the wedge-angle trial; `levels.py`, `conecheck.py` and
`conewall.py` measure the runs (stagnation, drag and changes between
levels; the cone's wall against Taylor-Maccoll).

Item 16: `l3trial.py` restarts a saved state with another gradient scheme
for a set number of iterations; `resh.py` prints a run's residual history;
`where.py` and `wheretxt.py` locate where a run's flow moves between two
saves; `gradcmp.py` compares gradient fields written by `foamPostProcess`
(`cellVenkatakrishnanGrad` at K = 0 against OpenFOAM's limiter).
`limmap.py` maps where OpenFOAM's limiter acts and switches (limited
against unlimited gradients from `foamPostProcess`); `oftrial.py` runs a
case's levels through the registered runner (`ofref.run_case`) with
`cellVenkatakrishnan` at a given K.
`wallp0.py` tabulates the wall's total pressure over pitot's by bands of
angle on a hemisphere (from a level's `wall.csv`); `outerwhere.py` finds
where on the outer boundary |Cp| is largest and prints that column of
cells inward.
`rehash.py` moves a trial case made before the runner's hash left out the
iteration limits to the new hash, after checking each level against the
old one.
