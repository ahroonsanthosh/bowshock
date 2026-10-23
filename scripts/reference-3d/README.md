# The independent reference for the 3D fins (design record 0021, section 4.4)

SU2 8.1.0 on meshes from Gmsh 4.13.1, run on your own machine as separate
programs. Nothing of either is copied into bowshock; only inputs and results
are committed.

```sh
python3 scripts/reference-3d/reference3d.py smoke     # once: a small unregistered case, checks the setup (minutes)
python3 scripts/reference-3d/reference3d.py list      # the registered cases
python3 scripts/reference-3d/reference3d.py all       # everything; hours to days (estimate)
python3 scripts/reference-3d/reference3d.py all --cases e3,h1 --threads 8
```

- Needs Python 3.9 or newer and about 10 GB of free disk. The first run downloads
  SU2's release for your system (its SHA-256 is checked) and installs Gmsh
  into `.reference-3d/` in the repository (not committed).
- On Apple silicon the macOS build runs under Rosetta.
- Each level that finishes is collected into
  `docs/research/solver3d/reference/<case>/L<n>/`; an interrupted run
  continues where it stopped. Commit that folder (all of it, the
  `run-*.json` files of interrupted runs included) when it is done.
- The cases and their numbers are in `cases.json`, fixed with the
  registration (0014 10.7 (u)); do not edit them.
