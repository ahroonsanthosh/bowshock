# Reference data for the skin-friction tests

## cf_vandriestII.dat

- **What:** van Driest II skin friction against Re_theta, computed from the
  Karman-Schoenherr relation, for four flat-plate cases (Mach 2 with an
  adiabatic wall; Mach 5 with Tw/Taw of 0.2, 0.5 and 1.0), free-stream
  temperature 300 K, Taw from the recovery factor 0.89.
- **Published by:** the NASA Turbulence Modeling Resource, now hosted by the
  AIAA Turbulence Model Benchmarking Working Group, on its page "2D Zero
  Pressure Gradient High Mach Number Flat Plate Validation"
  (<https://tmbwg.github.io/turbmodels/ZPGflatplateSS_val.html>, last
  updated 03/12/2025 per the page). The page states that the data are
  theory (van Driest II), not measurements, and that the correlations are
  imperfect.
- **File URL:**
  <https://tmbwg.github.io/turbmodels/ZPGflatplateSS_validation/cf_vandriestII.dat>
- **Downloaded:** 2026-10-18, byte for byte, unmodified. SHA-256
  `06ee88290744e17c63add43d60d0b8064988edb3fa92fb4e0760495bfbec4a04`
  (checked by `tests/friction/van-driest.test.ts`).
- **Licence:** none stated; the resource says its data are "provided as-is
  and accuracy is not guaranteed" (see `docs/validation/sources.md`).
