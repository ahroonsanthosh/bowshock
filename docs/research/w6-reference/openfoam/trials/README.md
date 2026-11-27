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

The level 4 trial (the off-list ogive, 4 calibers, r_n/R 0.10, Mach 1.3;
`oftrial.py ... 10 ogive 4 0.10 1.3 5 1,1,1,2,4
30000,40000,60000,40000,100000`): `O13K10/` keeps each level's
`record.json`, `monitor.csv` and `wall.csv` as the runner wrote them (its
saved fields stay in the scratch folder). `trialv4.py` applies V4's two
tests (`ofjudge.check_v4`) to it and prints each item it filled or waived
for levels made before the review's change 6; `trialv4.out` is its output
(2026-11-27). Its fill of a level's wall-cell total pressure reads that
level's final save, so it reruns only where the saves are; the values it
used are in `trialv4.out`.

The trials on level 4's cycle (`../../README.md`, after the owner's
choice to find why level 4 cycles): `l4x.py` copies a case's latest
save into a new case, changes only the named settings (the Courant
number, the time step's smoothing, the outer correctors, the limiter's
K) and runs it for a set number of iterations on the source's processes;
`l4xshow.py` prints a run's residual and drag per block of iterations.
`L4x/` keeps each run's monitor (`<run>.csv`: iteration, log10 of the
residual, drag) and its output line. `limmap4.py` writes a save's
gradients with the limiter at K and unlimited, and prints where the
limiter acts between the wall and the shock on the cap's rays.
