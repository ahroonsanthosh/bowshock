# Independent review of transonic-mach1 at aed95b0 (2026-10-22), and the coordinator's decisions

Reviewer's probes: in the results branch under `review-transonic-aed95b0/` (tests/zreview/
adversarial.test.ts, bands.test.ts, noise-inversion.test.ts, far-probe.test.ts;
tests/gpu/zreview-transonic.test.ts) and outputs under `review-aed95b0/`. Adopt them as tests where
useful. Branch tests at aed95b0: 24 unit tests pass, 5 of 5 GPU transonic tests pass on SwiftShader.
Locally, GPU tests need CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome (the build
Playwright 1.64.1 expects is not installed in these containers); CI installs its own.

Verified correct: two-float formulas (two_sum, quick_two_sum, 4097 split, two_prod, df_div, df_sqrt,
exact with or without fusion of products); no 32-bit quantity on the path to the fixed point; the
implicit parts change the path only (fixed point R = 0); GPU holds the CPU's converged drag within
about 1e-11; nested grids share their nodes exactly; the procedure uses the four finest grids and their
largest noise; no number without a settled grid; the offline record numbers match the jsonl files.

Every finding must be fixed before merge. The transonic agent was fixing them one commit each; see its
status for which are done.

- **B1 (blocking).** Mach 1 refused only at exactly 1 (transonic-drag.ts:187, 306 at 4aef318); 1.001
  to 1.005 served "verified" on an untested rule. DECISION: refuse below 1.05 (lowest Mach with a
  certified case and negligible far-field allowance) until the fixed rule passes its pre-registered
  test lower down; a named constant and reason code; tests at 1.0, 1.001, 1.0499, 1.05.
- **S1.** Noise misses slow damped oscillations; a geometric remaining of Infinity counts as 0
  (transonic-drag.ts:445-449). Nested CPU runs at Mach 1.01 and 1.02 sit 2.8e-6 to 3.4e-6 from their
  limit while about 1e-7 is reported. DECISION: Infinity means not settled; noise at least the envelope
  of a damped-oscillation fit; "settled" also requires the residual to fall.
- **S2.** The allowance rule's "decaying" branch is not a bound near Mach 1.01 to 1.02: c3 reverses
  sign (cone: 1.01: +2.857e-3, +9.03e-4, -4.0e-5; 1.015: c2 +6.92e-5, c3 -4.8e-6; 1.017: +1.622e-3,
  -6.04e-5, +7.2e-7; 1.019: +1.041e-3, -1.029e-4, +2.2e-6; 1.02: +7.69e-4, -1.03e-4, +2.0e-6).
  DECISION: write a corrected, pre-registered rule into 0013 before coding it, robust to sign
  reversal, never below the measurability level, tested on that table and on synthetic A1.
- **S3.** "Negligible" branch: (a) slow decay laws under-covered (minor in practice); (b) more noise
  can turn a refusal into a pass. DECISION: add the measurability level (2 x noise x value) to every
  allowance.
- **S4.** Long noses (12.5 to 25 radii, including the 10-caliber ogive) crash after the whole family
  (transonic-grid.ts:233 vs FAR_FIELD_DOMAINS[0] = 50). DECISION: size domains to max(R, L) or check
  up front; allowances solved first; GpuMemoryLimitError and domain errors become refusal codes; the
  router catches them.
- **S5.** Two-float trust: DECISION: once per solve compare the GPU residual with the CPU's and refuse
  ('device-precision') if low parts are lost; test the self-test's refusal path; write the plan's G3
  test (SwiftShader cone r = 1 and 2 against the CPU). ALSO FOUND by the transonic agent: the page
  engine's default of 4 sweeps falls into a limit cycle (drag 0.067 to 0.164, period about 4,700
  steps at Mach 1.1); 2 sweeps converge (reviewer's probe: 1,200 steps, within 1.2e-7 of the CPU).
  Fix the default and pin it with the G3 test.
- **S6.** Labels claim more than measured. DECISION: "exact solution ... band contains its error" only
  where the driver itself computes and reports the Taylor-Maccoll comparison for that cone and Mach;
  when the far-field allowance exceeds the grid band, say the band is mostly an assumed-decay
  allowance checked against no reference.
- **S7.** Record: Mach 1.1 band 9.757e-6 (rounds to 9.8e-6) on r = 2 to 16 (refused on 1 to 8); Mach
  1.2 is a validation case, not servable (the driver throws at 1.2); all three from offline CPU
  families; 0013 must state 8.4e-5 for 1.05 (lines 352-353, 919-922, 950 still say 1.14e-4); stale
  lines 8, 148-149, 1696-1697, 1703; steps 4b and 5 text from 0e668c9.
- **Minor.** Allowances solved after the family (fix with S4); "settled" never checks the residual (fix
  with S1); floor comment units; Dekker (1971) and Knuth into docs/validation/sources.md; Haack and
  power-law noses refused with the 'blunt-nose' reason though pointed (own code).

Certified offline (recomputed by the reviewer):

| Case | Value | Band | Parts | Taylor-Maccoll |
|---|---|---|---|---|
| 7 deg cone, Mach 1.2 | 0.0830132 | 8.903e-6 | grids 3.076e-6, floor 5.811e-6, far 8.7e-9, cylinder 7.9e-9 | 0.0830113, error +1.90e-6, inside |
| 7 deg cone, Mach 1.1 (r = 2 to 16) | 0.0944950 | 9.757e-6 | grids 3.129e-6 (order 1.31), floor 6.615e-6 | 0.0944976, error -2.61e-6, inside |
| 7 deg cone, Mach 1.05 | 0.1071116 | 8.435e-5 | grids 7.044e-5 (order 1.21), floor 7.50e-6, far 6.41e-6, cylinder 6e-9 | none |

Mach 1.0 (transonic agent's test (b), nested far boundaries 55.1, 100.6, 224.2, 408.7 radii; cylinder
effect below 1e-11): cone c1..c3 = +1.927e-3, +1.213e-3, +3.60e-4 (ratios 0.63, 0.30), C(408.7) -
C(100.6) = +1.573e-3 (1.7% of the drag); 5-caliber ogive +1.639e-3, +1.236e-3, +4.61e-4 (0.75, 0.37),
+1.70e-3 (9.9%). Changes fall as a power of distance, exponent about 1.1 to 1.3 (cone), 0.8 to 1.0
(ogive). Refused today by the registered rule. The advisor (Fable) recommends NOT building a Guderley
sonic far field now, and instead running the pre-registered next step: move the family's own domain
to 224.2 radii with 100.6 and 408.7 as nested neighbours (ratio there 0.29 on the regridded data, an
allowance of about 0.5%), keeping DECAY_LIMIT at 0.6.
