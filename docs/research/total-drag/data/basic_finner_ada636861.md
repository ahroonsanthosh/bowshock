# Basic Finner in free flight (DREV aeroballistic range), M 1.05 to 4.5

Draft transcription for 0008. Everything below is copied from the report's
text, tables or drawing, or computed from them (script named).

## Source

A. D. Dupuis and W. Hathaway, _Aeroballistic Range Tests of the Basic Finner
Reference Projectile at Supersonic Velocities_, DREV TM 9703, Defence Research
Establishment Valcartier, 1997. DTIC ADA636861. DTIC itself refused every
request ("The request is blocked"); the copy opened is the Internet Archive
mirror, archive.org/download/DTIC_ADA636861/DTIC_ADA636861.pdf (saved as
`pdfs/ia/DTIC_ADA636861.pdf`). Tables were read on the page images, not only
the text layer.

## Geometry (fig. 2, PDF p. 53; text p. 3; Table I, PDF p. 36)

Dimensions in calibres, 1 cal = 30.0 mm (fig. 2 caption).

| Item | Value | Where |
| --- | --- | --- |
| Total length | 10.0 cal (Table I: l = 30.00 cm, d = 30.00 mm) | fig. 2, Table I |
| Nose | 20 deg cone (10 deg half-angle drawn), length 2.84 cal, tip radius 0.004 cal ("meplat") | fig. 2, p. 3 |
| Body | cylinder, diameter 1.0 cal, from the cone shoulder to the base | fig. 2 |
| Fins | four, rectangular, chord 1.0 cal, span 1.0 cal from the body surface, trailing edges at the base | fig. 2, p. 3 |
| Fin section | single wedge: sharp leading edge (radius 0.004 cal) to 0.08 cal thick at the trailing edge, which is blunt and lies in the base plane ("conical in shape with a thickness of 0.08 cal at the base of the fin", p. 3; the 0.08 dimension at the base in fig. 2) | fig. 2, p. 3 |
| Fin cant | 0, 2 and 4 deg nominal, so the 2 and 4 deg models spin in flight; measured per model in Table III (PDF p. 38: 0.0004 to 0.0010 deg, 2.0000 to 2.0007 deg, 4.0000 to 4.0005 deg); cant axis 0.50 cal ahead of the base (fig. 2) | p. 4, Table III, fig. 2 |
| Centre of gravity | 5.50 cal from the nose (Table I: 16.50 cm) | fig. 2 |
| Materials | nose high-density alloy; fins and cylinder steel | p. 4 |
| Roll pin | one roll pin added (fig. 3b); a second, smaller one clipped off | p. 4 |

Computed from the drawing (not stated in the report): fin wedge half-angle
atan(0.04/1.0) = 2.29 deg. The fin trailing-edge base area is an
interpretation of "conical in shape with a thickness of 0.08 cal at the base
of the fin" (p. 3): read as a trailing edge 0.08 cal thick across the whole
span (as fig. 2's side view suggests), the four fins add 4 x 0.08 x 1.0 =
0.32 cal^2 of blunt base, 41% of the body base of pi/4 = 0.785 cal^2; if
"conical" means the thickness also tapers to zero at the tip, 4 x 0.5 x 0.08 x
1.0 = 0.16 cal^2, 20% (the round-2 audit flags the same alternative).

Not given: surface finish of the models; the base shape (flat base assumed
from fig. 2, which shows no cavity).

## Conditions (Table V, PDF p. 41; text p. 6)

Range air at 20 deg C nominal, relative humidity about 45% (p. 3); Table V
gives per shot an air density of 1.156 to 1.203 kg/m^3 and a speed of sound
of 343.4 to 344.0 m/s. Reynolds number on the 0.300 m length, 0.699e7 at
M 1.056 to 0.299e8 at M 4.47 (per shot in the CSV). Muzzle velocities 340 to
1511 m/s (p. 5).

Transition: not stated. The only statement is that in the shadowgraphs "the
boundary layer growth along the projectiles is clearly seen" (p. 6, figs. 5
and 6). Treat transition as unknown: the model must be run with fully
turbulent flow and with the laminar run bounded, and the difference carried
as an input band.

## Quantity and accuracy

CX0 is "axial force coefficient at zero angle of attack" (nomenclature, p.
vii), the coefficients being on the cross-sectional area A (p. vii). At zero
yaw it is the total drag including base and fins, in free flight (no sting).

- Single-fit 6DOF values with their probable errors: Table VIII (PDF pp. 44
  to 47). Every CX0 used here prints a probable error of "(0.%)", that is
  below 0.5%. The yaw term CX2 was held constant (marked "(*)") in these
  fits: 6.5 at M 1.06 to 1.38, 4.3 at 1.8, 3.3 at 2.35 to 2.41, 2.9 at 2.66
  to 2.75, 2.5 at 2.97 to 3.34.
- Linear-theory values (CD at the flight's yaw, CD0 and CDSQ): Table VII (PDF
  p. 43).
- Multiple fits: Table IX (PDF pp. 48 to 49): CX0 0.863 at M 1.077 and 0.731
  at 1.293 (probable error "(0.%)"); 0.585 at 1.832, 0.484 at 2.375 and 0.373
  at 3.147 are marked "(*)" because "unique Cxo were solved for the
  multiple-shot groups at Mach number of 1.832, 2.375, 2.718 and 3.147 since
  the probable error of fits improved considerably when doing so" (p. 10).
- Spin: the single-fit CX0 plotted against Mach number with the nominal cant
  marked: "no specific trends can be inferred from Fig. 10 that would indicate
  such an effect" on CX0 (p. 12). The gated shots therefore mix cants of 0, 2
  and 4 deg; the report's finding is that this does not show in CX0.
- Comparison with earlier ranges (Refs. 3 and 4, M 1 to 3): "The agreement is
  excellent" (p. 15, fig. 17; fig. 17 not digitised).
- Fin ablation only at about 1520 m/s (shot DA14 lost; DA01 and DA11 at M
  about 4.4 slightly ablated, p. 11): outside the range used here.

Computed from the tables (`basic_finner_stats_output.txt`):

- 6DOF CX0 against linear-theory CD0, shots with DBSQ at most 5 deg^2: 0.0%
  to +1.1%. The one high-yaw shot at M 1.377 (DBSQ 15.8 deg^2) differs by
  13% (0.708 against 0.625), so it is excluded.
- Shots at nearly the same Mach number differ by more than the probable
  errors: M 1.80 to 1.85, -3.3% to +2.0% about the group mean 0.586; M 2.35
  to 2.41, -2.2% to +3.4% about 0.484; M 2.66 to 2.75, -7.6% to +4.5% about
  0.433 (0.400 at M 2.741 against 0.452 at 2.749); M 2.97, +-1.2%. The data
  uncertainty to carry at a single Mach number is therefore about +-3% to
  +-8% (the group range), not the "(0.%)" probable error.

Second reading: the round-2 audit read Tables V, VII, VIII and IX and fig. 2
independently on the page images; all 19 Table VIII rows and all 8 Table IX
groups agree exactly, including the M 2.375 entry of Table IX (0.484) that
this transcription had from the text layer only (research folder,
audit/round2/readings/basic_finner_table8_table9.csv).

## Data (M 1.05 to 3.0, hold-out set)

`basic_finner_ada636861.csv`, sixteen shots with DBSQ at most 5 deg^2 at M
1.056 to 2.970 (column use = Y; none between M 1.332 and 1.799, so the gate
covers M 1.80 to 2.97 in four clusters: 1.80 to 1.85, 2.35 to 2.41, 2.66 to
2.75, 2.97), plus three rows kept for reference (M 1.377
high yaw; M 3.31 and 3.34 above the range).

| M | CX0 | M | CX0 |
| --- | --- | --- | --- |
| 1.056 | 0.868 | 2.348 | 0.500 |
| 1.058 | 0.868 | 2.364 | 0.478 |
| 1.116 | 0.854 | 2.414 | 0.473 |
| 1.254 | 0.760 | 2.663 | 0.446 |
| 1.332 | 0.701 | 2.741 | 0.400 |
| 1.799 | 0.594 | 2.749 | 0.452 |
| 1.846 | 0.598 | 2.969 | 0.385 |
| 1.850 | 0.567 | 2.970 | 0.376 |

## Fit to the claim envelope

Matches: free flight (no support), cylindrical afterbody, four fins, zero
yaw available, Mach 1 to 3, Reynolds numbers of a small rocket (7e6 to 2e7 on
length), sharp fin leading edges.

Does not match: the fins end at the base, with blunt trailing edges that add
41% (or 20%, see above) to the base area; there is no fins-clear-of-base case
in this set. The nose is a sharp cone. Transition is not stated. No
component (base, friction) was measured.
