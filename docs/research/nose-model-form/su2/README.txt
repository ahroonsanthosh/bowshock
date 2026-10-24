The independent code (R5 of 0014 10.7 (y)): SU2 axisymmetric Euler on TN 4233's cone-cylinder
at indicated Mach 0.901, 0.960 and 0.991

WHAT IT IS

The only reference the plan has at Mach 0.9 to 0.99, where no exact inviscid
result exists: a second, independent inviscid code solving the same body in
the same domain (far boundary 224.2 radii, 10 calibers of cylinder), with its
own three mesh levels, as 0021 section 4.4 and 0014 10.7 (u) used SU2 for
the 3D fins. Its result is compared with the transonic solver's under the
rule registered in (y) before any value existed:

  - the code's own band (from its three levels, 0005's rule) must be at most
    the larger of 0.035 of its value and 5e-4 absolute, or it is no reference;
  - the two codes' finest values must lie within the sum of the two bands
    plus 5e-4 (in CD on the base area); a miss fails that rung.

The settings, the mesh sizes and the Mach numbers are fixed by (y). Do not
edit su2_cone_cylinder.py beyond what the smoke step needs to run on your
machine; if something must change, say so when you send the results.

NEEDS

- Python 3.9 or newer, about 2 GB of free disk, and a network connection
  for the first run (SU2 8.1.0 and Gmsh 4.13.1 are downloaded into
  .reference-su2/ in the repository, not committed; the SU2 archive's
  SHA-256 is checked).
- On Linux, Gmsh's Python wheel needs the OpenGL and X libraries even without
  a display (Ubuntu: sudo apt-get install libglu1-mesa libxcursor1
  libxinerama1 libxft2). Windows and macOS need nothing extra. On Apple
  silicon the macOS build runs under Rosetta.

COMMANDS (from the repository root, branch claude/wip/nose-model-form)

  python3 docs/research/nose-model-form/su2/su2_cone_cylinder.py smoke

A coarse level at Mach 0.6, nothing committed, a few minutes. Its printed
"nose drag" should be small (a few 1e-3 or less; the exact inviscid value is
zero, R1). If it fails to run, send the message; nothing of SU2 is in this
repository and the script was NOT run in the container that wrote it.

  python3 docs/research/nose-model-form/su2/su2_cone_cylinder.py all

The three rungs, three levels each (coarse to fine; the fine level is about
20 times the coarse one's cells). Hours in all, the longest at Mach 0.991.
A level already collected is skipped, so an interrupted run resumes.
--machs 0.901 limits the rungs; --threads 8 sets SU2's threads.

WHAT TO SEND BACK

Commit the folder docs/research/nose-model-form/su2/results/ (every file in
it: the per-level results, the rung files M<mach>.json, the run-*.json
stamps) and push to claude/wip/nose-model-form, or zip it and send it. The
rung files are what verify-subsonic.test.ts reads (./su2/results/M0.901.json
and so on).

WHAT IS COMPUTED FROM SU2'S OUTPUT, AND BY WHOM

SU2 writes the wall pressure (surface_flow.csv). The nose pressure drag on
the base area (Cp integrated against r^2 over the cone) and the Cp at the ten
TN 4233 stations are computed by this script from that file, so that no
SU2 force convention (reference area, the axisymmetric factor) enters the
comparison. The settings: Euler, AXISYMMETRIC= YES, HLLC, MUSCL with the
Venkatakrishnan limiter, implicit Euler with FGMRES, far-field
characteristic boundaries on the inlet, top and outlet, an Euler wall on the
body, symmetry on the axis; converged on the drag (Cauchy over 500
iterations below 1e-9).
