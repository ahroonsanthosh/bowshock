# Validation candidates for the total, and sting-free base pressure (draft 0008)

The claim the set must match: finned body, cylindrical afterbody, Mach 1 to 3,
zero incidence, power off, free flight preferred; fins clear of the base
asked for. Each candidate below was opened; figures read once are marked
"first reading; second pending". The Basic Finner has its own file
(`basic_finner_ada636861.md`).

## Summary

| Candidate | Support | Afterbody | Fins | Mach in 1 to 3 | Status |
| --- | --- | --- | --- | --- | --- |
| Basic Finner, DTIC ADA636861 | free flight (range) | cylinder | 4 rectangular, at the base, blunt TE | 1.06 to 2.97 | transcribed (tables) |
| RM L55G28a model 1 | free flight (rocket) | cylinder (cone-cylinder) | 4, at the base, blunt LE and TE | 2.5 to 3.0 | geometry and table I transcribed; fig. 5 first reading |
| TN 3320 (RM-10) | free flight (rocket) | parabolic, cut at 81.25% (boat-tailed) | 4, 60 deg swept, at the base | 0.85 to 3.3 | text and accuracy read; fig. 9 base pressure first reading |
| TR R-100, cylindrical-afterbody configurations | free flight (helium gun) | cylinder | at the base | about 1.0 to 1.3 only | surveyed; outside M 1.5 to 3 |
| TN 3372 (Peck) | free flight (rocket) | cylinder (A, B, C) | 4, at the base, square TE | 1.0 to 1.2 only | text read; not transcribed |
| ARCAS, TN D-4014 | tunnel, sting | boat-tail with reflexed lip | 0.27 in ahead of the base | 1.5 to 2.96 | transcribed, see `arcas_tn-d-4014_tn-d-4013.md` |
| RM A53D02 | free flight (gun) | cylinder | at the base, subsonic LE below M 3.16 | 1.04 to 3.3 | transcribed, see `rm-a53d02.md` |

No case with fins clear of the base (one chord or more ahead of it) in
free flight at Mach 1 to 3 was found among the sources opened. The only
fins-forward data opened are TN 2360's tunnel base pressures (sting d/h 0.4),
which give no total drag.

## NACA RM L55G28a (Rumsey 1955), NTRS 19930088905

Free-flight measurements of drag to M 6.9 of a fin-stabilized cone-cylinder.
Opened (22 pages).

Geometry (fig. 1(a), PDF p. 16, dimensions in inches; text pp. 4 to 5):
length 150, body diameter 7.0 (fineness 21.4, p. 1), conical nose of 10 deg
total angle and 40 long; four steel fins "welded to the body at the base",
root chord 18, tip chord 10, 25 across the tips (exposed span 9.0, computed);
model 1 fins 0.2 thick at the root and 0.1 at the tip (t/c 0.011 and 0.01 as
printed), leading edge a 5 deg included wedge rounded to 0.03 radius (".032
rad" on the drawing), blunt trailing edge; model 2 fins 0.3 at the root, 45
deg wedge 0.06 thick then a 10 deg half-angle slope (p. 5). Model 1 carried
a total-pressure tube on a double-wedge pylon (p. 5). Nose skin polished,
about 5 microinches rms (p. 4). The drawing's "1" at the fin trailing edge
was not resolved (offset of the trailing edge from the base, or its
thickness): to be read again at higher resolution.

Conditions and accuracy (pp. 9 to 10, table I): M 2.5 to 3.0 from model 1
coasting after booster separation (p. 11); Reynolds number on length 180e6
at M 2.75 (table I); wall hot but below recovery (body Tw/T0 1.74 estimated
at M 2.75, T0 the free-stream static temperature, table I). Mach number
within +-0.01, Reynolds number +-2%, "maximum probable error in CD is within
+-7 percent" for model 1 (p. 9).

Measured total CD (fig. 5, PDF p. 22, telemeter circles). Two readings:

| M | First (`rm-l55g28a_fig5_first_reading.txt`, `scripts/l55_fig5.py`) | Second (round-2 audit, cluster centres, +-0.003) |
| --- | --- | --- |
| 2.46 to 2.50 | 0.387 (M 2.50) | 0.390 (M 2.46) |
| 2.55 | | 0.383 |
| 2.65 | 0.371 | 0.376 |
| 2.75 | 0.368 | 0.368 |
| 2.85 | 0.365 | |
| 2.92 | 0.361 | 0.363 |

They agree within 0.005 (at M 2.65, about the combined error). Cautions from
the second reading: three detections in the first reading's raw file are not
data (0.409 at M 2.85 is the "Model 1" leader arrow; 0.330 and 0.326 at M 2.95
to 3.03 are the dashed fairing); the radar squares sit about 0.01 to 0.015
below the telemeter circles, and the values here are telemeter only. The
second reading also reads the report's estimate symbol at M 2.74 as 0.353
against 0.3511 in table I, a calibration check.

The report's own component estimate at M 2.75 (table I, PDF p. 15, read on
the page image): fin friction 0.0473, fin base 0.0197, fin leading edge
0.0416, body friction 0.1052, body base 0.1080, cone pressure 0.0293, total
0.3511 (turbulent body; fin transition assumed at R = 4e6). The report calls
the agreement at M 2.75 "good" (p. 11); against the first reading at M 2.75
it is 4.6% low (computed: 0.3511/0.368).

Fit: free flight, cylindrical afterbody, fins at the base; blunt fin
leading edges (12% of the estimated total is leading-edge drag) and a hot
wall; only M 2.5 to 3.0 inside the range; CD +-7%.

## NACA TN 3320 (Jackson, Rumsey and Chauvin 1954), NTRS 19930084086

RM-10 in free flight, total drag and base pressure, M 0.85 to 3.3. Opened
(22 pages).

Geometry (text p. 3, fig. 1): parabolic-arc body of basic fineness 15 cut
off at 81.25% of its length (fineness 12.2), blunt base around the rocket
nozzle; four untapered fins swept 60 deg, total aspect ratio 2.04,
circular-arc section 10% thick normal to the leading edge (5% streamwise),
at the base. Full scale 12.2 ft long, frontal area 0.785 sq ft; half scale
6.1 ft, 0.196 sq ft. Base to frontal area 0.367 (p. 5). Contours within
0.020 in of design, "smooth and highly polished" (p. 6).

Reynolds number on length: 14e6 to 210e6 full scale, 15e6 to 110e6 half
scale (p. 1, fig. 4). Data from the coasting flight after burnout (p. 5).

Accuracy (pp. 5 to 6): total CD mean curves "probably around +-0.005 over
the supersonic speeds"; maximum discrepancy between models of one scale
+-0.008 (full) and +-0.015 (half); base-drag coefficient +-0.01 at transonic
speeds, +-0.003 at M = 2.5. Base pressure from an open-ended tube between the
nozzle and the skin, assumed to act over the whole base (p. 5). Half-scale
base drag 25 to 50% below full scale, possibly from Reynolds number,
internal base volume or afterburning of the half-scale sustainer; the
full-scale value "is more representative of the true base drag" (p. 7).

Base-pressure coefficient of full-scale model 1 (fig. 9, PDF p. 21; first
reading, second pending; `tn3320_fig9_first_reading.txt`, script
`scripts/tn3320_fig9.py`): -0.135 at M 1.00 (transonic peak), -0.096 to
-0.097 at M 1.10 to 1.28, -0.104 at 1.36 to 1.43, -0.106 at 1.52 to 1.62,
-0.109 to -0.112 at 1.72 to 2.25, -0.109 at 2.36, -0.106 at 2.45 to 2.56
(ring-template centres with score at least 0.74; the lower-score rows in the
file are half-scale symbols). The round-2 audit read all 64 symbols by shape:
its full-scale circles agree with the 20 true matches here within 0.001 in
P_B and 0.003 in M, and it finds that 7 rows of the first reading's file are
not full-scale circles (a half-scale square at M 1.526, a phantom at 0.980,
low-score hits at 0.982, 1.009, 2.219 and 2.419) and that the circles at M
0.966, 1.035 (the peak, -0.138) and 1.161 were missed. Not used by the draft. Times 0.367: base drag on the frontal area
0.038 to 0.041 at M 1.4 to 2.6 (computed), consistent with the report's "average value
of approximately 0.04" (p. 7).

Fit: free flight and sting-free base pressure with fins at the base, Mach 1
to 3.3; but a boat-tailed parabolic body (no cylindrical afterbody) with a
nozzle in the base. Useful as a sting-free check of a boat-tail base model,
not of the cylinder correlation.

## NASA TR R-100 (Stoney 1961), NTRS 19630004995

Survey of the configurations with a cylindrical afterbody (A_b/A_max = 1.00,
zero base slope, from tables I and II): configurations 1 to 8, 22, 78, 92,
98 and 113 to 117. Viewed on the page images (PDF pp. 25, 39, 95, 109, 115,
130 to 132): every one is a "helium-gun test" with fins at the base, and the
helium gun ejected models "at Mach numbers up to 1.4" (p. 2). The data stop
at about M 1.3 to 1.4. Not usable at M 1.5 to 3; possible transonic cases
(M 1.0 to 1.3) later. CD accuracy +-0.01 and M +-0.01 from repeat models
(pp. 2 to 3).

## NACA TN 3372 (Peck 1955), NTRS 19930084618

Flight base pressures, M 0.7 to 1.2, on a 5 in ogive-cylinder with four fins
of 0.09 in duralumin, rounded leading edges of 0.045 in radius, square
trailing edges, at the base (configurations A to C: cylindrical afterbody,
fineness 11.1; D: converging afterbody) (pp. 1 to 2). Records "very
oscillatory" for the cylindrical afterbodies; identical models disagree by up
to 0.06 in dp/q at subsonic speeds (p. 3). Only M 1.0 to 1.2 lies in the
range, with large scatter: not transcribed.

## Sting-free base pressure at Mach 1 to 3: what exists among the sources opened

| Source | Mach | Body | Fins | Result as data over compiled curve | Status |
| --- | --- | --- | --- | --- | --- |
| Herrin and Dutton, via Tucker's slides | 2.46 | cylinder, no fins; support arrangement not stated in the slides **[not verified]** | none | 0.824 to 0.885 | visual reading of slides; original not opened |
| TN 3819 fig. 18 free-flight curve (Langley, R 30e6 to 35e6) | 1.06 to 1.21 | cylinder | none (fig. 18 is for bodies without fins) | 1.027 to 1.122 | read, `love18_ff_output.txt` |
| TN 3320 full-scale RM-10 | 1.0 to 2.6 | parabolic boat-tail, nozzle | at the base | not comparable (boat-tail) | first reading |
| TN 3372 | 0.7 to 1.2 | cylinder | at the base | not transcribed | text read |

So at Mach 1.5 to 3 the only candidate sting-free point on a cylindrical
afterbody without fins is Herrin and Dutton, at one Mach number, and its
support is not verified.
