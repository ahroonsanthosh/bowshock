# 0019: Fin drag near Mach 1 (the fin terms of 0014 W7)

- **Status:** Draft plan, with the coordinator's decisions of 2026-10-21
  recorded (section 5; 0014 section 10.7, amendments (f), (j) to (p)), and
  sections 3.2 and 3.3 rewritten after the independent review of
  2026-10-22 (3.2 rejected as first written, 3.3 accepted with changes);
  the rewrite is back with the reviewer. The owner decided on 2026-10-22
  that 3.2's edges stay refused until NASA TM X-653 is read (0014 section
  10.7 (o)); 3.2's bounded term is kept as a recorded candidate, not
  wired, and the rest of the rewrite stands. Of the code, the guard is done
  (fin friction and the wave drag of sharp sections refused below Mach
  1.5, amendment (f), on the main line; the band above Mach 2.96
  labelled, amendment (j)), and section 3.2's candidate term is in
  `src/fins/rounded-edge-bounded.ts`, not wired. One research script is
  added, `docs/research/refusals/w7-fins.test.ts`, with its output
  `docs/research/refusals/out/w7-plan.out` (the population's parameters
  near Mach 1, the present code's behaviour there, and the coverage of
  each variant of this plan). Readings so far
  (`docs/research/total-drag/audit/w7-fins/`): R&M 3348 table 3, read
  twice and paired; R&M 3427 fig. 13, read once. No band is set yet: every
  other value quoted from a source below is from its text, or from a first
  look at a figure to see what it covers (mine or the reviewer's), and is
  marked so.
- **Date:** 2026-10-21; sections 3.2 and 3.3 rewritten 2026-10-22, and
  3.2's decision changed by the owner the same day; section 3.4's
  variables (free-stream M_0 and p_0) decided 2026-10-23 (0014 section
  10.7 (r))
- **Inputs:** the owner's decision of 2026-10-21 (serve a total at Mach
  1.0 to 1.2 wherever it is accurate; 0014 W7 and section 10.5);
  [0014](0014-refusals.md) in full (section 10: what sets bands, what is
  held back, "bounded, not measured", the readings owed, the held-back
  sets' Mach ranges, the amendments to 2026-10-21 (e));
  [0007](0007-skin-friction.md), [0008](0008-total-drag.md) sections 4
  and 6, [0009](0009-fin-wave-drag.md), [0010](0010-base-drag-and-total.md)
  sections 3 and 5, [0016](0016-fin-edges-of-flat-plates.md) to section
  20 (on the main line since c223856 and e42d5d4); the code at e42d5d4
  (`src/total/finned-body.ts`, `src/fins`, `src/base`, `src/friction`);
  the population of [`docs/research/refusals/`](../research/refusals/README.md).

**No held-back set was opened or used** (0014 section 10.1): not the
PARD standard body's totals (TN 3697 fig. 5, TN 3650 fig. 4, RM L52E06
figs. 9 to 12), not BRL Report 934, not the Eglin "4-Fin Circular" set,
not TN 3320. Two reports met in the search carry the PARD standard body's
own drag and were not opened at their drag figures (section 2.4).

**Result in one paragraph.** At Mach 1.0 to 1.2 a total needs fin terms
that do not exist yet: the fins' own-drag band (today the ARCAS band of
Mach 1.5 to 2.96, carried below 1.5 without data), the rounded leading
edges of plates below a normal Mach number of 1.0 (91% of the
population's rounded edges at Mach 1.0 to 1.2), bevelled (sharp) leading
edges, the square trailing edges below Mach 1.5, and the wave drag of
thin sharp sections near Mach 1 (the present product of the exact 2D
section and the linear 3D ratio already serves some thin double wedges
from Mach 1.08, unmeasured). The search found band-setting data for the
trailing edges (NPL and NACA two-dimensional tests through Mach 1, a
swept-wing set, a free-flight slab wing), for bevelled edges (Bryson's
wedge forebodies, with Rogers, Berry and Quincey's swept wedge wings for
the sweep) and for thin sharp sections (three transonic-bump wing series
in transonic similarity variables, carried to double wedges as an
analogy). It found nothing that measures a semicircular nose on flat
faces at a subsonic normal Mach number, and only one candidate (not yet
opened at its figures) for a fin increment near Mach 1 that would set the
fins' own-drag band; those stay refused unless the data serve or the
owner decides otherwise (section 5). If the fins' own-drag band is found,
the fin terms of 14.5% of the population's cases at Mach 1.0 to 1.2 would
be served on data, and 15.6% as decided on 2026-10-22 (rounded edges
below M_n 1.0 refused until NASA TM X-653 is read; bevels to 10 deg,
measured across Bryson's gap once R&M 3348 fig. 32 is read twice; swept
trailing edges on R&M 3348; section 4; 15.7% with the rounded edges
bounded as the candidate now stands, 17.4% before the fins' thickness
entered its free-stream floor, 35.2% as first decided); the
rest stay refused for the
square-cut leading edges and rounded trailing edges of 0014 W11 (30.8%),
the rear bevels of hexagonal sections (20.6%, no source) and bevels
steeper than the data (21.9%).

## 1. What a total at Mach 1.0 to 1.2 needs from the fins

### 1.1 The terms, and the code at e42d5d4

| Term                                  | The code at Mach 1.0 to 1.2                                                                                                                          | Measured there?                                                                       | Here  |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- | ----- |
| Body friction                         | van Driest II, momentum integral; band 0.88 to 1.19 (0007)                                                                                           | yes: 7 of 0007's 23 comparisons are RM-10 flight points at Mach 1.04 to 1.20          | none  |
| Fin friction                          | van Driest II plates of the local chord; band 1.01 to 1.59, the fins' own-drag band from the ARCAS increments (0008 section 4.3), at any Mach number | no: ARCAS covers Mach 1.5 to 2.96                                                     | F1    |
| Fin wave drag, flat plates            | zero: the faces lie parallel to the stream                                                                                                           | exact by the geometry                                                                 | none  |
| Fin wave drag, sharp sections         | exact 2D section drag times the linear 3D ratio, from where the section's shock attaches; ARCAS band                                                 | no: 0009 has not measured linear theory anywhere, and its 2D factor fails near Mach 1 | F5    |
| Rounded leading edges                 | served at M_n 1.0 to 3.0 (0016 sections 11 and 12); refused below M_n 1.0                                                                            | from M_n 1.0 (CR-149372)                                                              | F2    |
| Bevelled leading edges (wedge-flat)   | no term of their own: inside the sharp section; refused while the bevel's shock is detached, which at Mach 1.0 to 1.2 is every bevel of 8 to 15 deg  | no                                                                                    | F3    |
| Rear bevels (hexagonal sections)      | as above                                                                                                                                             | no                                                                                    | F6    |
| Square trailing edges                 | refused outside Mach 1.5 to 3.2                                                                                                                      | no                                                                                    | F4    |
| Square-cut leading edges, rounded TEs | refused (0014 W11; 0016 section 6)                                                                                                                   | no                                                                                    | as is |

Two findings, measured with the present code (`w7-plan.out`, "The present
code near Mach 1"):

1. **The fins' own-drag band is carried below Mach 1.5 without data.**
   `FINS_OWN_DRAG_BAND` (1.01 to 1.59) is applied to fin friction and to
   fin wave drag at every Mach number. It was formed on the ARCAS
   increments at Mach 1.5 to 2.96 only, and their unexplained part grew as
   the Mach number fell (fins' own over measured 0.49 at Mach 1.5, 0.85 at
   2.96; 0008 section 4.3), so it cannot be carried down as a bound. No
   total is served below Mach 1.5 today (the body base refuses it), so no
   served number is affected; it would be as soon as W2 serves the base
   at Mach 1.2 to 1.5.
2. **Thin sharp sections are served near Mach 1 without data.** On the
   hobby planform of 0016 (root 120 mm, tip 48 mm, span 80 mm, 42 deg) a
   double wedge of t/c 0.015 is served from Mach 1.08 (3D ratio 0.75 at
   1.08, 0.90 at 1.10), of t/c 0.024 and 0.04 from 1.15; over the
   population at Mach 1.0 to 1.2 the present code serves the wave drag of
   109 of 636 double-wedge and hexagonal fins (5.5% of all cases), each
   with the ARCAS band. Linear theory's error has not been measured there
   (0009 section 6), and the 2D factor (shock-expansion at the free-stream
   Mach number) has no meaning for the swept, subsonic leading edges most
   of these fins have.

Both are closed by F1 and F5 below; until then the first step of the work
(section 6) adds the refusals that make them explicit.

### 1.2 Their size

An illustration, by hand, not a model value of any set: the hobby rocket
of 0016 (a 54 mm body, three 3 mm plates of root 120 mm, tip 48 mm, span 80
mm, leading edge swept 42 deg, rounded leading edges, square trailing
edges, at the base) at Mach 1.1 at sea level (Re 2.2e6 on the mean chord):

- the trailing edges, at a base pressure coefficient of -0.43 to -0.7
  (RM A51J25 fig. 7's curve at M' 1.167, as the code holds it, and Nash's
  "around -0.7" near Mach 1, R&M 3323 p. 7): 0.14 to 0.22 in C_D on the
  body's area;
- the fins' friction, turbulent: about 0.06;
- the leading edges, at M_n 0.82: refused (section 3.2: M_n above 0.8,
  and the unswept trailing edge transonic at Mach 1.1); the bound's high
  end there, 0.829 on q_n t, would be 0.14 in C_D, its low end below zero.

Together about 0.2 to 0.4 in C_D, of the order of the whole body's drag near
Mach 1. The fin terms' bands will dominate the total's band there.

### 1.3 The population near Mach 1

From `w7-plan.out` (2000 rockets, the impact run's draws at Mach 1.0 to
1.2):

| Quantity                                                | 5% / 50% / 95%        | Shares                                        |
| ------------------------------------------------------- | --------------------- | --------------------------------------------- |
| Rounded edges: M_n = M cos(sweep)                       | 0.52 / 0.78 / 1.04    | below 1.0: 91.3%; below 0.8: 56.4%            |
| Rounded edges at Mach 1.2 to 1.5: M_n                   | 0.65 / 0.95 / 1.31    | below 1.0: 58.7%                              |
| Bevels: M_n                                             | 0.53 / 0.78 / 1.08    | at most 0.9: 75.7%                            |
| Bevels: half-angle, deg                                 | 8.3 / 11.6 / 14.7     | at most 10 deg: 26.1%                         |
| Double wedges: t/c                                      | 0.015 / 0.024 / 0.043 |                                               |
| Double wedges: A tau^(1/3) (A of the fin and its image) | 0.19 / 0.49 / 0.97    | at most 1: 95.6%                              |
| Double wedges: xi = (M^2 - 1) / [(gamma + 1) tau]^(2/3) | 0.17 / 1.41 / 3.18    | below 1: 36.4%                                |
| Blunt trailing edges: h/c at the root                   | 0.014 / 0.024 / 0.043 | above 0.02: 68.4%                             |
| Blunt trailing edges: c/[h Re_c^(1/5)], larger end      | 1.5 / 2.4 / 4.0       | at most 4.5: 97.9%                            |
| Blunt trailing edges: swept                             |                       | 15.0% (none beyond 60 deg); at the base 72.2% |
| Fins: Re on the mean chord                              | 3.1e5 / 1.4e6 / 4.0e6 | below 1e6: 32.5%                              |

The sections at Mach 1.0 to 1.2: rounded leading edge and square trailing
edge 28.4%, both rounded 15.5%, both square 15.3%, bevelled both
(hexagonal) 20.6%, bevelled leading edge and square trailing edge 9.1%,
double wedge 11.3%.

## 2. The search

**What was looked for.** Measured zero-lift drag, or pressures that
integrate to it, at Mach 0.95 to 1.25 of: thin wings and fins of
rocket-like planforms (low aspect ratio, tapered, swept) and thicknesses
(2% to 10%); leading edges, rounded and bevelled; blunt trailing edges;
and fin increments (fins on minus fins off) with the base separated.
Free flight, rocket models, transonic bump, wing-flow and slotted-tunnel
tests alike.

**Where.** The NTRS API (keyword search is weak; titles found by other
routes were fetched by id), the Cranfield AERADE archive of ARC Reports
and Memoranda and Current Papers (reachable from this machine), and web
search. DTIC and HathiTrust refuse this machine (HTTP 403); the UNT
digital library fails TLS verification, which was not bypassed. Each PDF
was downloaded into its own folder and read as untrusted data.

### 2.1 Opened: the sources this plan would set bands on

None of these is a held-back set or carries one's drag. Each would be
named in 0014 section 10.1's band-setting table by an amendment committed
before it is used (section 5).

| Source                                                              | What it measures                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   | For        |
| ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| Bryson, NACA TR 1094, 1952 (NTRS 19930092136; also TN 2560)         | 2D wedges of semi-angle 4.53, 7.56, 10.00 and 26.57 deg followed by straight afterbodies, and an 8.8% circular-arc forebody; GALCIT 4 by 10 in tunnel, interferometer pressures, Re about 6e4 (laminar). Fig. 14 (C_D against M, the three thin wedges, with Vincenti and Wagoner's, Cole's and Guderley's theory) and fig. 13 (in transonic similarity variables). A first look at fig. 14: data at about M 0.6 to 0.9 and 1.2 to 1.47, none between (the tunnel); the report states the viscous effects at the leading edge and shoulder compensate, so the forebody's pressure drag is nearly inviscid (PDF p. 23, its ref. 25) | F3, F5     |
| Rogers, Berry and Quincey, ARC R&M 3348, 1963 (AERADE 1826.2/3929)  | NPL 18 by 14 in tunnel, untapered half wings with a single-wedge (14%) and a double-wedge (7%) section, leading-edge semi-angle 4.0 deg, swept 0, 15, 30, 45 and 60 deg, M 0.6 to 1.2, Re 1.3e6 to 3.4e6. Pressures at one station, base pressures of the single wedge across the span (table 3), forebody chordwise force against M cos(sweep) (figs. 31a, 31b), complete single- and double-wedge chordwise forces (figs. 33 to 36). The report's test of simple sweep theory in transonic flow; its base pressures "collapse to a considerable degree when plotted against M0 cos" (p. 21)                                      | F3, F4, F5 |
| Nash, Quincey and Callinan, ARC R&M 3427 (AERADE 1826.2/4011)       | 2D blunt-trailing-edge section (single-wedge forebody, parallel afterbody, h/c 0.10), M 0.2 to 1.12, Re 0.8e6 to 2.7e6, layers turbulent at the trailing edge from M 0.4; base pressure against M (fig. 13), the layers' thickness (figs. 9, 10); splitter plates, a semicircular trailing edge, a cavity                                                                                                                                                                                                                                                                                                                          | F4         |
| Nash, ARC R&M 3323, 1963 (AERADE 1826.2/3903)                       | Review. Fig. 4, base pressure against h/c at subsonic speeds; fig. 5, against M through the transonic range for a selection of sections, the curves converging near M 1 "to a value of Cpb around -0.7", and h/c above about 2% having little effect there (p. 7). Its sources (refs. 31 to 34 and the NPL programme) are to be traced before use, so that no set is counted twice                                                                                                                                                                                                                                                 | F4         |
| Morrow and Katz, NACA TN 3548, 1955 (NTRS 19930084307), fig. 6 only | Base pressure of a 6% slab wing (rectangular, aspect ratio 2.7, bevelled leading edge) in free flight, M 0.6 to 1.7, two slits at the base's centre; accuracy +-0.02 at M 0.8 and +-0.005 at M 1.4 (p. 4). Already named band-setting by 0014 section 10.1                                                                                                                                                                                                                                                                                                                                                                         | F4         |
| RM A51J25 fig. 7 below M' 1.5                                       | The thin-layer curve from M' 1.167 (read once below 1.5) and its symbols; already band-setting                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     | F4         |
| Johnston, NASA Memo 4-30-59L, 1959 (NTRS 19980228287)               | 2D 20% single wedge (semi-angle 5.7 deg) at M 0.70 to about 1.25: forces from pressures, base pressures, leading-edge radius 0 and 1% of the chord; a diamond of the same leading-edge angle                                                                                                                                                                                                                                                                                                                                                                                                                                       | F4, F5     |
| Sawyer and Daum, NACA RM L8B13, 1948 (NTRS 19930085324)             | Wing-flow pressures on the rear of unswept and 45 deg swept cylinders and on the rear and sides of a wedge through the speed of sound                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | F4         |
| Humphreys, NACA TN 3306, 1954 (NTRS 19930084050)                    | 2D 10% double wedge at M up to 1 (Langley 4 by 19 in); fore and aft pressure drag separately                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       | F5         |
| McDevitt, NACA TR 1253, 1955 (NTRS 19930092253)                     | 22 rectangular wings, NACA 63A00X, A 0.5 to 6, t/c 2% to 10%, M 0.40 to 1.10, Re 1.25e6 to 2.05e6 (Ames 16 ft, transonic bump), pressure drag (minimum drag less its value at M 0.7) in transonic similarity variables; "at the sonic speed, slender-body theory is adequate for rectangular wings of symmetrical profile if the product of the aspect ratio and the 1/3 power of the thickness ratio is less than unity" (summary)                                                                                                                                                                                                | F5         |
| Nelson, Allen and Krumm, NACA TN 3529, 1955 (NTRS 19930084232)      | 36 tapered wings (A 4, 3, 2; taper 0 to 0.72), NACA 63A00X, t/c 2% to 8%, M 0.6 to 1.1, Re 1.4e6 to 2.0e6 (Ames 16 ft bump); minimum drag and minimum pressure drag                                                                                                                                                                                                                                                                                                                                                                                                                                                                | F5         |
| Few and Fournier, NACA RM L54B25, 1954 (NTRS 19930093723)           | Thin highly tapered wings: A 4 (taper 0) and A 3 (taper 0.143), NACA 65A003, and 65A002 and 65A004.5 at one sweep; quarter-chord sweep -14.03 to 45 deg; M 0.60 to 1.18, Re 0.75e6 to 0.95e6 (Langley 7 by 10 ft bump); pressure-drag rise                                                                                                                                                                                                                                                                                                                                                                                         | F5         |
| Polhamus, NACA TN 3469, 1955 (NTRS 19930084231)                     | Summary of the Langley bump wings to M 1.15: the sonic pressure drag varies with (t/c)^(5/3); the effect of sweep on the peak                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | F5 (check) |

### 2.2 Opened and set aside

| Source                                                                                                      | Why it sets no band here                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Graham, ARC R&M 3465 (AERADE 1826.2/4044) and NPL Aero Report 1189 (DTIC AD0642155, the search's text only) | 2D circular-arc biconvex aerofoils blunted with leading-edge circles of 0.10 and 0.15 in on a 10 in chord (r about 0.12 and 0.18 of the thickness), M 0.7 to 1.4: blunting changes the pressure drag little, in some cases favourably. A blunted airfoil nose, not a semicircle on flat faces. A check of F2's ordering argument at most (its leading-edge cylinders' pressures at sonic speed agree with inviscid cylinder theory, AD0642155 section 8) |
| Wilby, ARC CP 921 (AERADE 1826.2/934)                                                                       | Six round leading edges on a 6.5% airfoil, transonic: airfoil noses                                                                                                                                                                                                                                                                                                                                                                                      |
| Randall, ARC CP 456 (AERADE 1826.2/469)                                                                     | Theory (Spreiter and Alksne's method extended to round noses)                                                                                                                                                                                                                                                                                                                                                                                            |
| Kyle and Feryn, NASA TN D-3634, 1966 (NTRS 19660028010)                                                     | A 67 deg slab wing with sharp, rounded and six-times-radius leading-edge extensions, M 1.5 to 4.63 (M_n 0.59 to 1.81), wing-body minimum drag: extensions faired onto a slab spar, not a semicircle on flat faces (0016's judgement, confirmed from its text). A check of F2 at most                                                                                                                                                                     |
| Pepper, NACA RM (NTRS 19930087226; abstract only, the download failed)                                      | A 45 deg swept NACA 65A009 wing with a blunter airfoil nose, free flight on a fineness-10 body: +0.002 in C_D at M 1.05 to 1.2 (abstract). An airfoil nose                                                                                                                                                                                                                                                                                               |
| Lawrence and Kell, ARC CP 145, 1954 (AERADE 1826.2/158)                                                     | RAE rocket-boosted wings by difference on an RAE body (6.5 in, two fins; not a held-back body), 14 swept and delta wings, RAE 101 sections 4% to 10%, Re 7e6 per ft of chord: round-nosed airfoils, wing plus interference. A check of F5 and F1                                                                                                                                                                                                         |
| Lindsey, Daley and Humphreys, NACA TN 1211, 1947 (NTRS 19930081941)                                         | 6% supersonic airfoils (double wedge, circular arc) in 2D at M 0.3 to 0.9: subsonic only. A check of F5                                                                                                                                                                                                                                                                                                                                                  |
| Spreiter and Alksne, NACA TR 1359 (NTRS 19930091016)                                                        | Transonic thin-airfoil theory, with comparisons at M 1. A check of F5's section-shape analogy                                                                                                                                                                                                                                                                                                                                                            |
| Vincenti, Dugan and Phelps, NACA TN 3225 (NTRS 19930084152)                                                 | A double wedge near shock attachment: Mach 1.2 and above, for later                                                                                                                                                                                                                                                                                                                                                                                      |
| Stoney and Sandahl, RM L53L24a (NTRS 19930088058)                                                           | As 0016 judged it: airfoil noses, the leading-edge radius's effect within the error                                                                                                                                                                                                                                                                                                                                                                      |

### 2.3 Found, not reached or not yet opened

- **Knechtel**, NASA (about 1959), "Experimental investigation at
  transonic speeds of pressure distributions over wedge and circular-arc
  airfoil sections and evaluation of perforated-wall interference" (a 4.4
  deg wedge with a parallel afterbody, and circular-arc sections, cited by
  R&M 3348 as its ref. 19). What it would add: wedge-forebody pressures in
  Bryson's gap, M 0.9 to 1.2, at higher Reynolds numbers, so that F3's
  bounded range could be measured. Not found on NTRS by keyword;
  HathiTrust refused (HTTP 403).
- **AEDC**, Smith and German (1971), "Aerodynamic characteristics of low
  aspect ratio fins at Mach numbers from 0.80 to 1.30", and Whoric (1972),
  "... several low aspect ratio stabilizer fins at Mach numbers from 0.8 to
  1.3". What they would add: fin-balance loads near Mach 1; if they hold
  the fins' axial force at zero incidence, a fins' own-drag band near Mach
  1 (F1), and if any fin is a plate with rounded or square edges, a
  measurement for F2 or W11. DTIC and HathiTrust refused (HTTP 403).
- These refusals were not worked around (no mirror, no other route); the
  sources stay listed with what they would add.
- **Howell and Braslow**, NACA RM L55H09 (NTRS 20050019382): the
  pressure-drag increment of the stabilizing fins of a fin-stabilized
  parabolic body, fins on minus fins off in the Langley transonic
  blowdown tunnel and by another method in free flight, Mach 0.81 to
  1.41. Read from its text only: the body's radius is a parabola in the
  distance from 0.6 of its length (its maximum diameter there), its
  dimensions scaled from the free-flight model of its ref. 1 (Hart and
  Katz, RM L9I30); the tunnel model's base pressure was measured through
  the sting, so the fins' effect on the base can be separated. Not the
  PARD standard body (an ogive-cylinder); that it is not the RM-10 (TN
  3320, held back whole) is to be confirmed from a geometry-only source
  before any of its figures is opened. Its drag figures were not opened.
  The one candidate found for F1.
- **Jorgensen, Spahr and Hill**, NASA TM X-653 (NTRS 19720065133): fins
  and flares on low-fineness bodies, M 0.6 to 3.8, including fin
  leading-edge bluntness. Not opened for this record. Named in 0014
  section 10.7 (o) (2026-10-22) as a candidate band-setting source for F2,
  before it is opened; rounded edges below M_n 1.0 are refused until it is
  read (section 3.2). The total-drag validation search had opened it for
  its totals and set it aside (`validation_candidates.md`); no fin-edge
  value was read there.
- **Cleary and Stevens**, NACA RM A51J11 (NTRS 19930087063): thickening
  the trailing edge of a 4% circular-arc wing at transonic speeds (base
  pressures at small h/c, cited by R&M 3348). Not opened.
- **Goin**, RM L52D21 (named band-setting by 0014; 45 deg swept blunt
  trailing edges at M 1.41 and 1.62, within R&M 3348's fig. 30b);
  **Katz and Stoney**, RM L51F29 (NTRS 19930086750) and **Hart and
  Katz**, RM L9I30 (NTRS 20050019251) (fin-stabilized parabolic bodies in
  free flight, M 0.8 to 1.4, base pressures; named for F1 in 0014 section
  10.7 (p), 2026-10-22, before they are opened); **Vincenti and Wagoner**, TR 1095 (the PDF download failed;
  its text is held); Valensi and Pruden (R&M 2482), Liepmann, Ashkenas and
  Cole, and Griffith (cited by Bryson). Not opened.

### 2.4 Two reports that carry the PARD standard body's drag

- **TN 3548** flew its wings on "wooden cylinders with pointed wooden
  ogival noses ... stabilized with four thin metal fins located near the
  base", and its fig. 4 (geometry, PDF p. 15) draws a 2.500 in radius from
  station 17.5 to the base at station 55.063, with four 0.091 in fins swept
  45 deg and a 1.380 in tip chord: the PARD standard body (5 in, L/D 11, a
  3.5-calibre nose, 0014 section 5.2). Its figs. 7 and
  9 are that body's wingless and winged totals from other flights, and
  figs. 8 and 10 are wing increments formed by subtracting them. They were
  not opened and are not used: they would shape a fin band with the
  held-back body's totals. Its fig. 6 (the slab wing's base pressure) is
  band-setting as 0014 names it; the PARD body's range B run (0014
  section 10.5) will then test a total whose trailing-edge term was set
  in part on a wing flown on that body, and its record must say so, as
  0014 section 10.1 does for RM L52E06's base pressures.
- **The PARD wing tests of 1949 to 1952** (for example Katz, Marley and
  Pepper, RM L50G31, wings "mounted on a pointed cylindrical body with
  four thin stabilizing fins"; Pepper and Hoffman, RM L52F02a) form wing
  drag the same way. Where the body is the PARD standard body, their
  increments come from held-back totals and set nothing; their bodies
  were not checked, and none is used.

## 3. Methods, and how each band is set

Every band below is the envelope of both readings of each figure that
sets it (0014 section 10.1, rule 5), with each reading's error, as 0016
does. A method used outside its data is refused unless a recorded
decision says otherwise; the decisions asked for are in section 5.

### 3.1 F1: friction

**Body friction: no change.** 0007's band, 0.88 to 1.19, contains seven
RM-10 flight points at Mach 1.04 to 1.20 and is stated for Mach 1.0 to
3.6; van Driest II has nothing that changes at Mach 1 on a flat plate.

**Fin friction: the fins' own-drag band below Mach 1.5 is not measured**
(finding 1). Three ways to set it, in the order to try:

1. **A fin increment near Mach 1, base separated.** RM L55H09's fins-on
   minus fins-off pressure-drag increments, tunnel and free flight, Mach
   0.81 to 1.41, on a body that is not held back. To open: its fins'
   sections and planform, whether its base pressure is measured (so the
   fins' effect on the base can be taken out, as the ARCAS chamber change
   was), and its Reynolds numbers. If it serves, the band is formed as
   ARCAS's was (0008 section 4.3): measured over modelled fins' own drag,
   the model being friction plus F3 to F5's terms for its fins.
2. **The bump wings' subsonic drag** (TR 1253, TN 3529, RM L54B25 at Mach
   0.6 to 0.7, where the reports take the minimum drag as friction): a
   fin alone, no body, at fin Reynolds numbers (0.75e6 to 2.05e6, inside
   the population's 3.1e5 to 4.0e6), transition free. It measures the
   flat-plate model's error on fins without interference; the state of
   the layer is unknown, so it bounds the model from below only. A check,
   or the low end.
3. **0007's band carried to fins**, labelled an analogy: friction is the
   same physics on a fin as on a body near Mach 1, but ARCAS showed fins'
   increments above the friction model by up to 1.59 at Mach 1.5, from
   causes the model does not hold (hardware, trip, edges, interference).
   Carrying 0.88 to 1.19 would narrow the high end below what ARCAS
   measured, so this is not proposed on its own.

Until one of these is read twice, fin friction and fin wave drag are
refused below Mach 1.5 with the reason "the fins' own-drag band (ARCAS,
Mach 1.5 to 2.96) is not measured below Mach 1.5" (a guard: no served
total changes, section 1.1). This gates W2's totals at Mach 1.2 to 1.5 as
well, and so is the coordinator's decision (section 5, item 1).

### 3.2 F2: rounded leading edges below M_n 1.0 (0014 W4(d))

**Measured: nothing.** No source opened by 0016 or here measures a
semicircular nose followed by flat faces at a subsonic normal Mach
number. Below M_n 1.0 the normal flow is subsonic and what lies behind the
nose is felt at it, so the cylinder's front side (TN 2960, CR-149372 below
M 1.0), which has a separated wake behind it, is not a plate's (0016
section 11). The bluntness series found (Graham's blunted biconvex
aerofoils, Wilby's round leading edges, Pepper's blunter 65A009 nose, Kyle
and Feryn's slab wing) are airfoil noses or faired extensions.

**Decided (the owner, 2026-10-22; 0014 section 10.7 (o), superseding
(k)'s item 1): refused until NASA TM X-653 is named and read.** Rounded
leading edges of flat plates below M_n 1.0 are refused, the refusal
saying that a bound is not served until TM X-653 (Jorgensen, Spahr and
Hill, tunnel tests of fins with blunt leading edges at Mach 0.6 to 3.8,
section 2.3) is read. If it measures such an edge, the term becomes
"estimated on component data"; if it does not, the bounded term below
goes back to the owner, with (U3)'s weakness named in its label.

**Kept as a recorded candidate, not wired.** The bounded term written out
below (first decided under 0014 section 10.7 (k), item 1, "bounded, not
measured" under 0014 section 10.2; reviewed 2026-10-22 by an independent
reviewer at 87145fc, rejected as first written, and rewritten to the
coordinator's decisions on the review's findings, section 5, item 2) is
kept with its code, `src/fins/rounded-edge-bounded.ts`, and one test per
case the review names (`tests/fins/rounded-edge-bounded.test.ts`), so
that the re-review can judge it and so that it is ready if TM X-653 does
not measure the edge. Nothing under `src/` imports it (a test pins that),
and the wired term (`roundedLeadingEdgeDrag`) refuses every such edge
with the TM X-653 reason (a test pins that on the review's case A, which
the candidate would serve).

**The setting.** In the plane normal to the edge (the independence
principle, as for W4(c)), a plate of thickness t with a semicircular nose
of radius t/2, faces parallel to the stream, then a trailing edge. Every
chord c in this section is streamwise (c/t 23 to 71 at the population's
roots, 8 to 40 at their tips); a distance normal to an edge is written
with its cosine, c cos(sweep). Only the nose's surface, from the
stagnation line to the shoulders at 90 deg, carries a force along the
stream; the faces carry none. The term is the nose's pressure drag per
unit span, C = D / (q_n t), on the normal dynamic pressure q_n and the
nose's frontal height t, its mean over the span where it varies.

**The upper bound: at M_n 0.8 or below, C does not exceed C(1.0), the
term at M_n 1.0 at its band's high end.** C(1.0) is kappa's high end at
M_n 1.0 in the code (CR-149372's node, 0.765 from 0.748 to 0.775 with both
readings and the round-7 re-read; the 0.764 and 0.772 first written here
were the first reading's) times modified Newtonian, (2/3) Cp_pitot(1.0) =
0.8504: 0.659. Where the Reynolds number on the normal component is
outside CR-149372's (1.9e5 to 3.3e5; a hobby edge has about 5.7e4) it is
widened by 0016 section 11's allowance, 3% of the term: 0.679 (review, G).
Times the sweep allowance's high end, 1.22 from 14.3 deg of sweep (0016
section 19), rounded up as the measured term rounds it: 0.805 and 0.829.
Every case served is swept (Mach 1.06 or more at M_n 0.8 or less needs 41
deg or more), so the swept values are the ones served. The review's 0.676
and 0.825 are the same steps on the first reading's node. At M_n 1.0 and
above the plate's nose sees the cylinder's flow (0016 section 11; Graham,
R&M 3465 section 8, Chushkin's sonic cylinder), so C(1.0) is a plate's
value. The ordering:

- _(U1) At low M_n, C is near zero:_ (L1) below.
- _(U2) Toward M_n 1, C rises to C(1.0)._ Bryson's stationarity (TR 1094,
  PDF pp. 15 and 16, eqs. 35 and 43; review, E): near M = 1 the detached
  bow wave lies far ahead and the flow behind its central part is as far
  below sonic as the stream is above it, so the local Mach numbers on the
  body are stationary at M = 1. Bryson extends this to "an infinite yawed
  cylinder (whose cross section may be finite or, if the angle of attack
  is 0, may extend infinitely far downstream)" at its normal Mach number:
  the plate's case. A forebody's pressure drag on its frontal height then
  rises through M_n 1 at dC/dM = (4 - 2C) / (gamma + 1), +1.1 at C 0.65
  (`stationaritySlope`), so just below M_n 1 C is below C(1.0); carried
  as frozen local Mach numbers, valid near 1 only, C(1.0) 0.659 gives 0.60
  at M_n 0.95, 0.54 at 0.9, 0.40 at 0.8. The cylinder's front side, the
  nearest measured body, rises monotonically from M 0.6 to 0.9 (CR-149372
  fig. 8a, PDF p. 25, a check under (k): the reviewer's first look, 0.21,
  0.29, 0.41, 0.55 at M 0.6, 0.7, 0.8, 0.9; queued for two readings). Not
  evidence, as the first version said: TR 1094 fig. 14 (PDF p. 24) has no
  points between about M 0.9 and 1.17, and fig. 23 (PDF p. 32) is drawn
  "on basis of constant Mach number distribution from M 0.96 to 1.20", its
  subsonic data another report's, and is a closed airfoil, not a forebody
  followed by a straight section.
- _(U3) At M_n 0.8 or below, the nose's front side stays below C(1.0)._
  Not because the cylinder bounds it: in inviscid flow a cylinder's front
  side is -1/3 on its diameter and the plate's nose 0 (the half-body
  theorem), so the plate is the fuller of the two (review, F). Three
  estimates of the nose's front side, each fuller than the cylinder's,
  from the cylinder's front pressures (fig. 8a, the reviewer's first look)
  or from none: (a) the suction behind the sonic point held at the sonic
  value Cp* (-0.19 at M 0.9): 0.62 at 0.9; (b) no suction beyond 45 deg
  from the stagnation line: 0.57 at 0.8, 0.65 at 0.9; (c) fuller still,
  modified-Newtonian pressures Cp_0 cos^2(theta) from 0 to 45 deg and no
  suction beyond, 0.589 Cp_0(M_n): 0.64 at 0.6, 0.665 at 0.7, 0.677 at
  0.75, 0.690 at 0.8 (the cylinder's measured pressures at 12 to 48 deg
  lie 3% to over 100% below Newtonian at M 0.8, first look). Against the
  high end without the sweep allowance, which multiplies both, 0.659 to
  0.679: over the fuller of (a) and (b), which is (b) at each of these, the
  margin is 16% to 20% at 0.8 (0.566), 8% to 11% at 0.85 (0.610, (b)
  interpolated between fig. 8a's M 0.8 and 0.9 sets; fig. 8a has no 0.85
  set) and 0.8% to 3.8% at 0.9 (0.654); over (a) alone, 6% to 10% at 0.9
  (recomputed 2026-10-22 from the reviewer's `fs8a.py`, re-review N5; the
  "about 1% to 10% at 0.85 to 0.9" first written here, and the code's "0.4%
  to 6%", were not one computation); (c) reaches it at M_n 0.70 to 0.75 and exceeds it by 2% to 5% at
  0.8. So the ordering holds at M_n 0.8 unless the nose's front pressures
  from 0 to 45 deg exceed the cylinder's by about a fifth (0.679 / 0.57),
  which (c) does and no measured subsonic body shows. Laminar edges (Re_D
  6.7e3 to 1e5) may separate at the shoulder and lose suction, the risk
  largest near 0.9. Served to M_n 0.8 (the coordinator's decision); 0.8 to
  0.9 only if fig. 8a, read twice, shows the margin there.
- _(U4) What is not shown._ That a semicircle on flat faces keeps within
  about a fifth of the cylinder's front pressures over 0 to 45 deg: the
  analogy (U3) rests on, not a measurement. The sweep allowance at
  subsonic M_n is unmeasured, as it is at M_n 1.0 to 1.95 (0016 section
  16); the bound carries its high end.
- _(U5) Barrowman's curve (review, H)._ OpenRocket's rounded leading edge
  (Niskanen 2009, eq. 3.89) is Barrowman's (1967 thesis, NTRS
  20010047838, printed pp. 50 to 52, PDF p. 60 for eqs. 4-17 to 4-19,
  fig. 4-5): (1 -
  M^2)^(-0.417) - 1 below M 0.9, 0.53 at M_n 0.8 and 0.999 at 0.9, above
  0.659 from M_n 0.84. It is not a measurement of a plate's nose: "a
  finite radius leading edge can be considered a circular cylinder in
  cross flow that effectively has no base drag", the curve a cylinder's
  total drag less a base-drag curve (his fig. 4-4, from his ref. 6). At
  M_n 0.84 to 0.9 it lies above the cylinder's own measured front side
  (0.41 at 0.8, 0.55 at 0.9, first look). At M_n 0.8 or below it lies
  inside this band (tested); the nominal served differs from it (about
  0.38 against 0.53 at 0.8). Rocketeers will set this term beside
  OpenRocket, so 0017's page text should say this where the two differ
  (for 0017's author; 0017 is not on this branch).

**The lower bound: C_L = 2 S_TE, twice the trailing edge's linearised
upstream influence, the span's mean; zero where the trailing edge's
normal Mach number is supersonic.**

- _(L1) The plate alone, shock free: C = 0._ A semi-infinite body whose
  faces become parallel to the stream carries no drag in steady
  shock-free inviscid flow: a momentum balance on a large contour that
  cuts the body far downstream, where the flow is uniform along the faces,
  leaves no force (the half-body theorem; its far field is a source of
  strength U t). Its nose, the only surface with a component along the
  stream, carries none.
- _(L2) With shocks: C > 0._ The drag of that body is then the entropy
  flux through its shocks, positive by the second law, and still carried
  by the nose alone.
- _(L3) Viscosity raises C._ The faces' layers thicken downstream, a body
  growing behind the nose; its induced velocity at the nose opposes the
  stream and raises the nose's pressure. A bubble at the shoulder lowers
  the suction there, on forward-facing surface. Both add drag.
- _(L4) The trailing edge lowers C below zero, by its upstream influence,
  which its own sweep and normal Mach number decide (review, A and B)._
  Behind the trailing edge the plate's displacement closes in its wake
  (Nash, R&M 3323 pp. 7 to 8): a sink of the plate's thickness. Taken as
  an infinite line along the trailing edge, swept Lambda_TE, of strength U
  cos(Lambda_TE) t per unit length, at the distance c cos(Lambda_TE)
  normal to it from the leading edge at a station of chord c: in the plane
  normal to it the flow is two-dimensional at M_TE = M cos(Lambda_TE), and
  linearised it induces u = U t / (2 pi beta_TE c) normal to the line, so
  the nose's pressure falls by S_TE = -(cos(Lambda_TE) /
  cos^2(Lambda_LE)) (t / c) / (pi beta_TE) of q_n (`trailingEdgeSinkShift`).
  With parallel edges, -(t / c_n) / (pi beta_n), c_n = c cos(Lambda). The
  first version took the chord streamwise and the leading edge's normal
  Mach number: too small by 1 / cos(Lambda) with parallel edges (1.35 at
  42 deg, 2 at 60; review case: both edges at 60 deg, c/t 23, Mach 1.2,
  -0.035 against -0.017), and by more where the trailing edge is swept
  less, its normal Mach number nearer 1 (leading edge 42 and trailing edge
  30 deg at Mach 1.10, tip c/t 16: -0.103 against -0.035; 45 and 25 deg at
  Mach 1.05, c/t 23: -0.082 against -0.021). Nor does the sink overstate
  the effect, as the first version said: R&M 3348 fig. 31b (PDF p. 69, the
  reviewer's first look) has its 60 deg single-wedge forebody at C_cf
  sec^2(phi) -0.007 to -0.0105 at M cos(phi) 0.55 to 0.60, -0.10 to -0.15
  on q_n t (c_n / t 7.1), against -0.12 to -0.17 from the sink on that
  wedge with closure one to two base heights behind its base (the
  reviewer's model); R&M 3348 p. 22 cites Knechtel finding such values
  once the afterbody was removed. With a supersonic trailing edge (M_TE >
  1, the stream then supersonic too) linear theory gives it no upstream
  influence: on a wing in a supersonic stream a point feels only what lies
  in its forward Mach cone, and a trailing edge swept less than the Mach
  angle's complement lies outside every leading-edge point's; there S_TE
  = 0. With a subsonic trailing edge in a supersonic stream, only its
  segments inside a station's forward Mach cone reach it, none at the
  root: the infinite line, which also counts segments inboard of the root
  that a fin does not have, overstates the effect, on the conservative
  side. Taken station by station with the local chord: the span's mean of
  t / c, for a straight-tapered fin t ln(c_tip / c_root) / (c_tip -
  c_root).
- _(L5) The margin, and where the argument fails._ C_L = 2 S_TE. A
  linearised estimate is not a physical limit (review, D), so it carries a
  stated margin, a factor of 2 (`LOWER_BOUND_MARGIN`), kept unless R&M
  3348 fig. 31b, read twice, shows a smaller one suffices; the sink is
  checked against fig. 31b and R&M 3348's p. 22 comparison once fig. 31b
  is read twice (queued, with fig. 32). The estimate is used only where its
  own nonlinear correction fits inside that margin. In the trailing edge's
  normal plane the small-disturbance equation's nonlinear term, the factor
  (gamma + 1) M_TE^2 times u / U, with u / U = 2 tau / (pi beta_TE) (the
  nose's source and the trailing edge's sink at mid-chord, linear; tau = t
  / (c cos(Lambda_TE))), may take at most half of 1 - M_TE^2, so that the
  local beta falls by at most 2^(1/2): beta_TE^3 >= (4 / pi) (gamma + 1)
  M_TE^2 tau, that is xi_TE = (1 - M_TE^2) / [(gamma + 1) M_TE^2
  tau]^(2/3) >= (4 / pi)^(2/3) = 1.175, at the shortest chord
  (`TRANSONIC_XI_MIN`; the review's case at M_n 0.9 and c/t 8, the
  parameter (1 - M^2) / ((gamma + 1) M^2) 0.098 against u / U 0.046, fails
  it). The same magnitude is required on the supersonic side, xi_TE <=
  -1.175, where linear theory gives the trailing edge no influence: the
  transonic range's width is set by the same nonlinear term either side
  of sonic. That is the conservative reading, not a separate argument, and
  it is the rule that refuses most (below). The free stream: below Mach 1
  the body's base, a three-dimensional sink, is felt at the fins' noses
  too (about -0.046 on q_n at a hobby rocket's root, the review's
  estimate) and is not bounded here; above Mach 1 linear theory gives the
  base no upstream influence, which needs the flow along the body to be
  supersonic with a margin. The boundary layer's displacement growth, at
  most 0.004 rad at the population's Reynolds numbers, compresses it by
  that angle; by the transonic Prandtl-Meyer function, nu = (2/3) (M^2 -
  1)^(3/2) / (gamma + 1), it stays supersonic if M^2 - 1 >= (3 (gamma + 1)
  theta / 2)^(2/3) = 0.06; with the same factor of 2, M^2 - 1 >= 0.12: Mach
  1.06 (`FREE_STREAM_FLOOR`). **That floor counted the boundary layer
  alone (re-review of 2026-10-22, N1).** The fins' own thickness turns
  the flow along the body too: n fins of thickness t add n t of section
  area per unit span over the leading edge's streamwise extent s
  tan(Lambda_LE), spread over the body's circumference 2 pi r, so theta_f
  = n t / (2 pi r tan(Lambda_LE)), the span cancelling. Taken as a
  two-dimensional turning, which overstates an axisymmetric compression
  (the conservative side), with the boundary layer's 0.004 and the same
  Prandtl-Meyer condition and factor of 2: M^2 - 1 >= 2 (3 (gamma + 1)
  (0.004 + theta_f) / 2)^(2/3) (`freeStreamFloor`; an unswept leading edge
  adds the thickness at once and has no floor). Three 3 mm fins on a 54
  mm body: the hobby fin (42 deg, theta_f 0.059) needs Mach 1.32, the
  review's case A (60 deg, 0.031) Mach 1.224, so case A at Mach 1.2 is
  refused. The floor now depends on the rocket, and the candidate takes
  the fin count and the body's radius as inputs. So the edge is refused
  with the free stream below that floor (and never below Mach 1.06; the
  review's unswept trailing edge at Mach 1.00 fails it and xi_TE), xi_TE inside +-1.175, M_n above 0.8 ((U3)), sweep
  beyond 60 deg, or the Reynolds number on the normal component outside
  6.7e3 to 1e6 (as W4(e)); the refusal lists every condition a case fails.
  (Until 2026-10-22 this item was printed with two of its lines broken
  into a numbered list by the formatter, at "(gamma + 1) M^2"; the text is
  unchanged.)
- _(L4) and (L5) treat two sinks unalike (re-review N1)._ Linear theory
  in a supersonic stream gives a point only what lies in its upstream Mach
  cone. A finite fin's trailing edge lies downstream of every
  leading-edge station unless the edge is swept far enough that inboard
  parts of it lie upstream within the cone, so linear theory gives it, in
  the cases served, no upstream influence; yet the candidate counts it as
  an infinite swept line sink. The body's base, a larger sink, is set to
  zero on that same linear theory. The two must be treated alike. The
  line sink is kept as a stated allowance for what the linear domain of
  dependence leaves out near Mach 1 (Mach angles of 56 to 71 deg at Mach
  1.06 to 1.2, and the subsonic flow of the trailing edge's normal plane),
  not as a linear result; by the same reasoning the base's sink must be
  counted as well, as a point sink of the base's area at its distance
  from each station in the linearised far field, before the candidate
  could serve anything. That term is not written. Until it is, the
  candidate is not consistent, and it is a condition of any later wiring,
  with TM X-653.
- _(L6) Data that check the sign._ The measured bluntness increments at
  subsonic normal Mach numbers are all positive or within their errors of
  zero: Pepper's blunter nose on a 45 deg 65A009 wing, +0.002 at Mach 1.05
  to 1.2 (M_n about 0.74 to 0.85; abstract); Sandahl and Stoney's 60 deg
  delta, no measurable effect (+-0.0007, M_n to 0.95); Kyle and Feryn's
  67 deg slab wing, bluntness raising the minimum drag at M_n 0.59 to 0.98.
  Graham's 2D blunted aerofoils show small and sometimes favourable
  changes, and R&M 3465 says where the favourable ones come from: the
  over-expansion round the leading-edge cylinder, whose low pressure "acts
  on forward facing areas of the surface" behind the shoulder (PDF pp. 4
  and 10). A plate's parallel faces have no such area, so Graham checks
  nothing here (review, item 6). These are increments of airfoil noses:
  checks of the sign, not of the size. Kyle and Feryn's increments are to
  be read twice and set against the bounds computed for their nose as a
  check.

**What the candidate would serve** (not served: refused until TM X-653 is
read, above): the midpoint of [C_L, C(1.0)], the
band the whole gap, on q_n t times the span and the count, labelled
"bounded, not measured: between no drag on the nose less twice the
trailing edge's linearised upstream influence (an inviscid argument, 0019
section 3.2) and the term at M_n 1.0 at its band's high end (CR-149372, TN
2960, with the allowances used)", with the gap in C_D beside it (the code's
label adds "a recorded candidate, not served: refused until NASA TM X-653
is read"). The
review's case with both edges swept 60 deg (c/t 23, Mach 1.2, M_n 0.6),
with the fins' thickness not counted: C from -0.069 to 0.829, 0.380
served; on three fins on a 54 mm body it is refused at Mach 1.2 for the
free stream (floor 1.224) and served at 1.25. The hobby fin of 0016 (leading edge
42 deg, trailing edge unswept, c/t 40 at the root and 16 at the tip) is
refused at every Mach number from 1.0 to 1.2: at 1.0 and 1.05 for the free
stream and its trailing edge (normal Mach 1.0 and 1.05, xi_TE 0 and
-0.34), at 1.1 and 1.15 for M_n (0.82, 0.85) and its trailing edge (xi_TE
-0.66, -0.95), at 1.2 for M_n (0.89); on a 54 mm body with three fins,
for the free stream as well at every one of them (floor 1.32). The first
version's 0.068 +- 0.071
in C_D at Mach 1.1 is withdrawn.

**Coverage** (`w7-plan.out`): of the population's rounded edges below M_n
1.0 at Mach 1.0 to 1.2, 5 of 801 (0.6%) would pass these rules with the
fins' thickness counted in the free-stream floor (55, 6.9%, with the
boundary layer alone, as first rewritten); refused as decided, none is
served, and the fin terms served at Mach 1.0 to 1.2 are 15.6% (variant
I, section 4; the reviewed candidate, variant G, would serve 15.7%). The
free stream refuses 98.6% of them, the trailing edge's transonic rule
84.0%, M_n above 0.8 38.2%, the sweep 7.5%, the Reynolds number 2.6%.

**What would replace it:** pressure distributions or drag on a flat plate
with a semicircular leading edge (r = t/2), two-dimensional or swept, at
M_n 0.5 to 1.0 and Re_D 1e4 to 1e6, read twice; or the drag of flat-plate
fins with full-radius against sharp leading edges at Mach 0.9 to 1.3, the
base separated. Candidates: the AEDC fin tests (section 2.3), Jorgensen,
Spahr and Hill's fin-bluntness models (NASA TM X-653, named in 0014
section 10.7 (o) on 2026-10-22, before it is opened for this term).
**What would relax the rules:** R&M
3348 figs. 31b and 32, read twice (the closure effect measured on a wedge
whose trailing edge is subsonic and near sonic, for the margin and the
transonic rule); CR-149372 fig. 8a, read twice (the margin at M_n 0.85 to
0.9).

### 3.3 F3: bevelled leading edges

A bevel is a wedge followed by a flat: Bryson's models exactly, in two
dimensions. **Reviewed 2026-10-22** (independent reviewer, at 87145fc):
accepted with seven changes, all adopted by the coordinator and made here
(review items 1 to 7). Nothing here is coded or served yet; the term is
built after its figures are read twice.

- _Method._ A new edge term, as the rounded edge's is (0016): the wedge
  forebody's pressure drag at the normal Mach number on the normal
  dynamic pressure (the independence principle, exact for the inviscid
  flow over an infinite swept wedge), per unit span times the span; the
  faces behind it carry none. Near Mach 1 it replaces the section product
  for the front bevel; at Mach 1.5 and above the present product stays.
- _Measured: the nominal and its band._ Bryson's three thin wedges (4.53,
  7.56 and 10.00 deg), in the transonic similarity variables of his fig.
  13, where his points lie: at M_n about 0.6 to 0.9 (75.7% of the
  population's bevels at Mach 1.0 to 1.2 lie at 0.9 or below) and about
  1.2 to 1.47. **And across his gap** (item 1): R&M 3348 fig. 32 (PDF p.
  70, band-setting under 0014 10.7 (k)) has its single-wedge forebody's
  points in and around the gap, at Re 1.3e6 to 3.4e6, with Knechtel's
  wedge-with-afterbody curve (R&M 3348's ref. 19; section 2.3 lists the
  report as not reached) drawn on them, rising monotonically with no
  maximum (the reviewer's first look: xi_0 -1.15 to +0.65, reduced drag
  0.10, 0.45, 1.0, 1.47, 1.9, 2.52). Once fig. 32 is read twice, thin
  bevels from xi about -0.35 to 0.65 are measured, not "bounded, not
  measured" (0014 10.2): the nominal from fig. 32's points, the band
  their scatter about it with both readings' errors. **Knechtel's curve
  sets nothing yet** (re-review N4): its report's title is about
  perforated-wall interference, so before it shapes any nominal its
  tunnel, its wall and blockage corrections and its Reynolds number are
  recorded here from that report or from R&M 3348's account of it; until
  then it is drawn beside fig. 32's points as a check only. The
  first version would have served about 1.95 +- 1.05 at xi 0 against about
  1.5 measured. The band elsewhere: the scatter of both readings' points
  about the interpolant, with the reading errors and the systematic
  variation with wedge angle that Bryson notes.
- _The similarity variables_ (item 6). Bryson's xi and reduced drag and
  R&M 3348's xi_0 and C-tilde are not the same variables: R&M 3348 forms
  them with M_0^2 factors and the section's t/c. Each set is converted to
  one form, the conversion written with the readings, before any point of
  one is set beside the other.
- _The gap's lower end_ (item 3) is xi about -0.35, the last subsonic
  point of fig. 13's 10 deg wedge, not -0.5.
- _What remains bounded._ Only where no measured point lies once fig. 32
  is read (between its highest, xi_0 about 0.65, and Bryson's first
  supersonic, xi about 0.9, if the conversion leaves a gap there), served
  between measured values, never on theory:
  - lower bound: the measured value at the gap's lower end, the low end of
    both readings with their errors. The ordering: fig. 32's points (and
    Knechtel's curve, a check until N4 is met) rise monotonically through the gap's neighbourhood
    with no maximum (item 4), and Bryson's stationarity gives a forebody's
    drag a positive slope at M = 1, dC/dM = (4 - 2C) / (gamma + 1) on its
    frontal height (TR 1094 eq. 43; section 3.2, (U2)). The first
    version's "forebodies measured through Mach 1" is withdrawn (section
    3.2, (U2): fig. 14 has no points between about M 0.9 and 1.17, and
    fig. 23 is a closed airfoil on a constant-Mach assumption);
  - upper bound: the highest reduced drag measured at supersonic speeds
    with its errors, and not below Vincenti's bars in fig. 14 (PDF p. 24;
    item 2), which at xi 0.5 to 0.75 reach a reduced drag of 2.9 to 3.06
    against fig. 13's plateau of about 2.9 to 3.0 (the reviewer's first
    look; both read twice before the bound is set). The ordering: the
    forebody's maximum lies at or after the gap's upper end, so nothing
    in it exceeds the plateau; fig. 32's monotonic rise and the theories
    (maximum near shock attachment) both say so. If either places a
    maximum in the gap above the bound, the bound is raised to it or the
    gap refused;
  - served: the midpoint, the band the whole gap, labelled "bounded, not
    measured: between measured wedge forebodies either side (TR 1094, R&M
    3348 fig. 32), interpolated across no data".
- _The sweep allowance: additive and two-sided_ (item 5). R&M 3348's
  forebody chordwise force against M cos(sweep) (fig. 31b, sweep 0 to 60
  deg): each swept point less the unswept curve at its own M cos(sweep),
  on q_n t, the allowance the envelope of those differences, both signs,
  added to the term; not a ratio, which is unbounded where the unswept
  curve crosses zero. The reviewer's first look: at 45 deg and M_n 0.82 to
  0.85 the swept points are +0.009 to +0.010 in C_cf against about 0
  unswept, about +0.14 on q_n t, and at M_n 0.64 to 0.71 the swept points
  lie below the unswept curve. These differences include the change in
  the trailing edge's upstream influence with sweep (on R&M 3348's swept
  wings both edges sweep together), which "The trailing edge" below also
  adds: counted twice, on the conservative side (wider), and said so when
  the band is formed (re-review N3). The case to test when the term is built: a
  bevel swept 45 deg at Mach 1.18 (M_n 0.83); today it is refused, by the
  guard below Mach 1.5 (`tests/total/fins-own-drag-guard.test.ts`).
- _The Reynolds number._ Bryson's 6e4 (laminar) against R&M 3348 (1.3e6
  to 3.4e6) and Johnston (1.2e6 to 1.4e6) at the same similarity
  parameter; the difference sets an allowance.
- _The trailing edge._ Its upstream influence (section 3.2, (L4)) acts on
  a bevel as on a rounded nose. The measured forebodies carry their own:
  R&M 3348's wedge has its base 7.1 thicknesses behind its leading edge
  (normal to it), with parallel edges; Bryson's afterbodies are his
  models'. When the term is built, the difference between the fin's
  line-sink shift and the model's is added to the band, under (L5)'s
  rules; named here so that it is not missed.
- _Low normal Mach numbers_ (item 7). Below Bryson's lowest point (about
  M_n 0.6, 5% of the population's bevels), bounded the same way between
  section 3.2's lower bound, as rewritten ((L1) to (L5), which hold for
  any forebody of a semi-infinite plate: twice the trailing edge's
  line-sink shift, the free stream above (L5)'s floor, the fins' thickness counted, the trailing edge
  outside the plate's transonic range) and an upper bound from the lowest
  measured point. **Not "the lowest measured point, the drag rising with
  the Mach number"** (re-review N2): that rise is not shown there. The
  first look at fig. 31b gives -0.10 to -0.15 on q_n t at M_n 0.55 to
  0.60, the trailing edge's suction outweighing the wedge's front
  pressure, and in linear subsonic flow a pressure coefficient scales as
  1/beta, so a negative value becomes less negative as the Mach number
  falls (times beta(0.6)/beta(0.5) = 0.92 from M_n 0.6 to 0.5), above a
  bound at the measured value. So the upper bound at M_n below the lowest
  point M_m is C_m + 2 max(0, -C_m) (1 - beta(M_m)/beta(M_n)), C_m that
  point's high end with both readings' errors: Prandtl-Glauert's change
  with (L5)'s factor of 2 where C_m is negative, and C_m itself where it
  is positive (the scaling then lowers the value as the Mach number
  falls). Prandtl-Glauert at a wedge's stagnation point is itself a
  small-disturbance estimate; the factor of 2 is its stated margin, as in
  (L5).
- _Bevels of 10 to 15 deg_ (73.9% of the population's bevels) only if TR
  1094 figs. 15 and 16, the 26.57 deg wedge at Mach 1.44, fall on the thin
  wedges' curve in the similarity variables within the band; then the
  interpolation in angle reaches 15 deg, labelled. Otherwise refused.
- _Stays refused._ Bevels steeper than the data allow; sweeps beyond 60
  deg; hexagons' rear bevels (F6).

### 3.4 F4: square trailing edges below Mach 1.5 (0014 W3(d))

The largest fin term near Mach 1 (section 1.2), and the best covered.

- _The variables, decided 2026-10-23_ (the coordinator's decision, on
  independent advice; 0014 section 10.7 (r)). F4's band is formed on the
  free-stream Mach number M_0 and the free-stream static pressure p_0,
  never on a local M' and p' ahead of the base. That is how the
  band-setting sets report base pressure: R&M 3348 fig. 30 and table 3
  (p_b/p_0 against M_0), Goin's points on fig. 30(b), TN 3548 fig. 6 (free
  flight), R&M 3427 fig. 13 (against the tunnel's M); and it is what the
  code serves, P_B(M) at the free stream (`src/base/fin-trailing-edge.ts`,
  0010 section 5.1). Three consequences:
  - RM A51J25 fig. 7's curve is defined on Chapman's M' and p', the local
    state just ahead of the base. It is served at M_0 for thin plates,
    where M' is close to M_0 (flat faces parallel to the stream, so no
    turning between the leading edge and the base), as the code does
    above Mach 1.5. No set is converted to M' and none is needed.
  - Near Mach 1, M' is not a usable variable in any case: the flow at the
    last holes ahead of a base is subsonic or barely sonic there, so the
    corner's upstream influence reaches them and a "local" state read
    there carries the base's own effect (Chapman's M' assumes a
    supersonic layer that the base cannot reach through). This is why
    R&M 3348 figs. 47 to 52 set nothing ((r), which also records that
    their quantity could not be read).
  - _The single wedge against a plate: a stated widening, not a
    correction._ R&M 3348's single-wedge section (leading-edge semi-angle
    4.0 deg, section 2.1 above) reaches its base with its faces inclined 4.0 deg
    to the chord line, where a fin plate's faces are parallel to the
    stream; R&M 3427's section has a single-wedge forebody and a parallel
    afterbody, and Johnston's single wedge a 5.7 deg semi-angle. At the
    same M_0 the inclined face changes the pressure and the layer at the
    base, so the wedge's p_b/p_0 is not a plate's. This physical
    difference is carried as a stated widening of the band where a
    wedge's points set it, written here with its basis before any code;
    the measured values are never shifted toward a plate's. Its size is
    not yet decided (it will be stated, and if no data separate the two
    shapes near Mach 1, said to rest on an argument, not a measurement).
  - R&M 3427 fig. 13's hole 4 (named for the local state ahead of the
    base, 0014 10.7 (m)) is therefore not needed for the band's
    coordinates; it stays named and read once, and whether it serves at
    all (it lies 0.1 in ahead of the base, inside the same upstream
    influence) is decided here before it sets anything.
- _Method._ As now (0010 section 5.1): -P_B(M) n h s / A_ref with a
  two-dimensional base pressure, integrated along the span on fins of
  varying chord (0016 W3(b)), the vacuum bound kept, M the free-stream
  Mach number. The curve from Mach 1.0 to 1.5: RM A51J25 fig. 7's curve,
  read a second time below M' 1.5, where it is read once from 1.167,
  served at M_0 as above, continued to 1.0 on the independent sets below
  (fig. 7 does not reach 1.0).
- _Band._ The envelope, over both readings, of the independent sets about
  the curve at their own free-stream Mach numbers and h/c (each set's
  base pressure on its own p_0, as reported): Nash's section (R&M 3427
  fig. 13, to M 1.12), R&M 3323 fig. 5's sections (their sources traced
  first), R&M 3348's table 3 (unswept, alpha 0 deg, to 1.2), TN 3548 fig.
  6 (free flight, to 1.7), Johnston's single wedge (to about 1.25), Sawyer
  and Daum's wedge (wing flow, where the model's free stream is the local
  flow over the wing) and RM A51J25 fig. 7's symbols (1.23 to 1.475),
  widened where a wedge's points set it as stated above.
  At Mach 1.5 it must meet the present 0.93 to 1.21 without a step. Wide
  near Mach 1, where the base pressure changes fastest: from about -0.7
  near Mach 1.0 (Nash, text) to -0.43 at M' 1.167 (the curve as the code
  holds it), a first look, not a reading.
- _Layers and h/c._ Nash finds h/c above about 2% has little effect near
  Mach 1 (R&M 3323 p. 7, fig. 4); 68.4% of the population's edges are
  above 2% at the root. Below 2%, or with the layer parameter beyond the
  data's (TR 1109 fig. 29(a)'s factor K is measured from Mach 1.5 only),
  the edge is served only if fig. 4 and Cleary and Stevens (small h/c,
  transonic) cover it; else refused.
- _Sweep, decided (0014 10.7 (k), item 3)._ R&M 3348's base pressures
  collapse "to a considerable degree" on M cos(sweep) (fig. 30b, with
  Goin's 45 deg points). Swept trailing edges at Mach 1.0 to 1.2 (15.0% of
  the population's blunt edges) are served if R&M 3348's table 3 and figs.
  30a and 30b, read twice, set the band directly: each swept point over
  the unswept curve at its own M cos(sweep), the envelope the allowance,
  the edge's nominal the unswept curve at M cos(sweep). This changes 0016
  section 6's ruling (W3(c)) for Mach 1.0 to 1.2 only. It is the edge's own
  base drag: W1's fins-on-base factor (rebuilt, on the main line since
  b86c308; 0015, 0014 10.7 (i)), which takes swept fins at the base with
  the exceptions 10.7 (i) lists, is a separate term, and R&M 3348 says
  nothing about it.
- _Fins at the base._ The edge in the base plane stays "an analogy, not a
  measurement" (its wake meets the body's base flow); 72.2% of the
  population's blunt edges are there.

The method, the band, the shape widening and the layer rule above are
made exact in section 3.4.1 (2026-10-26). Where 3.4.1 differs from the
bullets above (the curve below Mach 1.5, the sets that set the band, the
layer rule), 3.4.1 holds, with its reasons.

#### 3.4.1 F4's band below Mach 1.5, as built (2026-10-26)

Written before any value of RM A51J11 or RM A52E01 was read (0014 section
10.7 (ac); two blind readers were reading them while this was written).
Every other set below was read twice and paired before this was written,
and their values were looked at in writing it: the nominal below is
formed on two of them, and the shape widening's size on two of them.

1. **Domain.** Free-stream Mach number 1.00 to 1.50, unswept square
   trailing edges with a turbulent layer at the edge. Below Mach 1.5 a
   transition input that leaves the edge laminar is refused (TR 1109's
   laminar curves start at Mach 1.5, and nothing below is measured).
   Swept edges stay refused (the sweep bullet above is a later step).
   Every value is on the free-stream M_0 and p_0 (0014 10.7 (r)), as Cp_b
   = (p_b/p_0 - 1) / (0.7 M_0^2); base drag means -Cp_b.

2. **The sets, each point at its own M_0, both readings, both typings.**
   - _Flat faces at the base_ (parallel to the stream, as a fin plate's):
     TN 3548 fig. 6 (the slab wing in free flight, both slits; its
     report's Mach accuracy, +-0.01, is carried as an interval in M); R&M
     3427 fig. 13 (holes 5 to 7); RM A51J11 figs. 14 and 15 at h/c 0.040
     (faired parallel); RM A52E01 fig. 8, wing 2; RM A51J25 fig. 7's open
     symbols at M' 1.23 to 1.50, taken at M = M' as the code serves the
     curve above Mach 1.5 (its filled PARD circles are TN 3548's flights,
     counted there). Chapman warns that for airfoils the correction from
     the free stream to M' and p' "is important at low-supersonic Mach
     numbers where the bow wave is detached" (RM A51J25 p. 14), and gives
     no free-stream values, so below 1.5 these symbols' places are an
     approximation. They are kept, the wider choice: they set the band's
     low end at 1.35 to 1.45 (0.921, against the floor's 0.93).
   - _Faces diverging toward the base_ (single wedges): R&M 3348 table 3
     (unswept, alpha 0 deg, all six holes) and fig. 30a's unswept circles,
     kept as one envelope where they disagree (M 1.11 to 1.20; the
     coordinator's decision of 2026-10-26), face angle 4.0 deg; Johnston
     fig. 10(b) at alpha 0 deg (round 13's boxes of merged ink entered as
     boxes), 5.7 deg.
   - _Faces converging toward the base_: RM A51J11 at h/c 0.024 and 0.012
     (about 1.0 and 2.1 deg, from its description, 0014 (ac)); RM A52E01
     wings 4 and 3 (2.02 and 6.88 deg).
   - _Checks, which set nothing_: R&M 3323 fig. 4 (refs. 32 to 35 and 38
     are replots of the sets above; refs. 39 and 40 state no Reynolds
     number, layer or section, so neither the layer rule nor the shape
     rule can place them; ref. 41 is TN D-1056 below Mach 1.5, not
     registered for it; the three untraced glyphs set nothing, 10.7 (s));
     RM A51J25 fig. 7's ink band below M' 1.5 (the curve with the PARD
     circles, on M' and p'); RM A52E01 above Mach 1.5 (a check of the band
     above 1.5, 10.7 (ac)); Sawyer and Daum's fig. 4(c) sets nothing (10.7
     (t)).
   - Each set's layer parameter X = c / [h Re_c^(1/5)] and h/c are from
     its report: TN 3548 h/c 0.06 (X 0.67 to 0.86, chord 9.582 in, Re 2.8e6
     to 9.8e6); R&M 3427 0.10 (X 0.52 to 0.66); R&M 3348 0.14 (0.35 to
     0.43); Johnston 0.20 (0.30); RM A51J11 and RM A52E01 as 10.7 (ac)
     gives them.
   - _Each point's Mach interval_ (the coordinator's decision of
     2026-10-26: the wider, safer choice): the reading's error, or the
     report's stated Mach accuracy where it states one and it is wider.
     Stated: TN 3548, +-0.01 (PDF p. 6); Johnston, the test region's Mach
     number uniform to +-0.002 across and about +-0.010 up and down (PDF
     p. 6), so +-0.010. Stating none: R&M 3427 (its free-stream Mach
     numbers "may therefore be subject to slight inaccuracies", uncorrected
     for the slotted walls, no number); R&M 3348 (the Mach number from a
     calibrated hole upstream, no accuracy); RM A51J25 (a conference
     summary, none); RM A51J11 (the Mach number an average over the
     model's region on the bump, its contours in a figure not read, no
     accuracy stated); RM A52E01 (corrections stated, no accuracy). Sets
     stating none carry their readers' errors only.

3. **The nominal, flat faces, thin layer.** Not RM A51J25 fig. 7's curve
   below Mach 1.5. TN 3548's own points, on M_0 and p_0, are the flights
   behind fig. 7's PARD circles, and they lie above that curve served at
   M_0, in base drag, by 13% to 18% at M 1.18, 10% to 14% at 1.20, 7% to
   11% at 1.24 and 3% to 7% at 1.27, and lie within -4% to +5% of it from
   1.31 to 1.47: below
   about Mach 1.3, M' and p' ahead of this slab's base are not the free
   stream's, so the curve on M' does not serve at M_0 there. Chapman says
   as much of fig. 7 itself: "The filled point situated at the extreme
   left in this figure actually was taken at a flight Mach number of 1.0,
   but, on this graph, it plots in the position shown because of the
   large effect of profile shape on base pressure in the region of bow
   wave detachment" (RM A51J25 p. 16; that point lies at M' about 1.16 to
   1.19). The nominal
   is therefore piecewise linear in M_0 through nodes every 0.05 from 1.00
   to 1.45, each node the mean of the flat-faced thin-layer sets that
   reach it (TN 3548 and R&M 3427, each set the mean over its readings and
   its series, slits or holes, of its points interpolated linearly in M;
   R&M 3427 reaches 1.12), and at 1.50 fig. 7's curve as the code holds it
   above 1.5, so the nominal has no step at 1.5. This changes the bullet
   "_Method_" above (fig. 7's curve served at M_0 from its start at M'
   1.167); fig. 7's curve below 1.5 becomes a check.

4. **Thick layers.** Above Mach 1.5 a layer with X above 1 multiplies the
   thin-layer term by TR 1109 fig. 29(a)'s factor K(M, X), measured at M
   1.5, 2.0 and 3.1. Below 1.5, K is held at its Mach 1.5 value, nominal
   and both readings' ends (`thickLayerFactor(1.5, X)`). That is an
   approximation, not a measurement; its error is carried by the band,
   because every thick-layer point (RM A51J11, RM A52E01) is compared with
   the nominal times K(1.5, X) at its own X (at most 4.5, where fig.
   29(a)'s readings end; X above 4.5 takes K at 4.5, which lowers that
   point's ratio and so widens the band, never narrows it).

5. **The band.** For each point, base drag measured over modelled, r =
   Cp_b / (Cp_b,nominal(M_0) K_nom(1.5, X)), K = 1 for X up to 1, taken
   over the point's Mach interval (its reading error, or its report's
   stated Mach accuracy where larger), and widened by the shape rule
   (item 6). The band's ends at each node M_k are the least and greatest r
   of every band-setting point whose Mach interval meets [M_(k-1),
   M_(k+1)] (at 1.00, [1.00, 1.05]; at 1.50, [1.45, 1.50]); between nodes
   they are linear in M, so every point lies inside the band at its own
   Mach number (both nodes either side hold it). The band served has the
   form of the band above Mach 1.5 (0.93 to 1.21 times K's ends): [min(0.93,
   low(M)) K_low/K_nom, max(1.21, high(M)) K_high/K_nom]. It is never
   narrower than the band above 1.5, whose evidence (orifice position,
   facilities, flight) shows the least spread a correlation of base
   pressure carries, and it equals that band at Mach 1.5 unless points at
   1.45 to 1.50 lie outside 0.93 to 1.21. In that case the step at 1.5 is
   reported, not hidden, and the band above 1.5 is not changed (10.7
   (ac)). K's ends multiply the thick-layer points' ratios, which already
   carry K's error once: a double count, kept because it can only widen
   the band. (Amended 2026-10-26 before any value of RM A51J11 or RM
   A52E01 was read; first written with K's ends on 0.93 and 1.21 only.)

6. **The shape widening** (0014 10.7 (s), item 1; decided here). _The
   ordering, an argument:_ at a blunt base the flow leaving each face
   turns round the corner by the face's own inclination as well as into
   the wake, so faces that diverge toward the base turn it further and
   lower the base pressure, and faces that converge (a boattail) turn it
   less and raise it. At the same M_0, h/c and layer, a diverging section's
   base drag therefore bounds a flat-faced edge's from above, and a
   converging section's bounds it from below. _Measured:_ in one tunnel
   (the NPL 18 by 14 in), R&M 3348's 4.0 deg wedge (h/c 0.14) against R&M
   3427's parallel afterbody (h/c 0.10, interpolated linearly in M): the
   wedge's base drag is 7% to 9% higher at M_0 1.00 and 2% to 5% higher at
   1.11. Johnston's 5.7 deg wedge lies 18% to 22% above the nominal of
   item 3 at M_0 1.01 to 1.23, R&M 3348's 6% to 11%. _The size:_ S(delta)
   = S_NPL |delta| / 4.0 deg, S_NPL the largest of the NPL ratios less one
   (0.090, at M_0 1.00); linear in the face angle, an argument from one
   measured pair.
   _How it applies:_ each inclined set's point enters the envelope
   unshifted, and its range is extended by S on the side the ordering
   does not bound: downward for a diverging face, [r (1 - S), r], upward
   for a converging one, [r, r (1 + S)]. So a wedge's point at the band's
   high end is not widened further (a plate lies below it), and one that
   would set the low end is. _Registered fallback:_ where a pair measured
   in one facility contradicts the ordering (RM A52E01's wings 3 and 4,
   the same h/c with boattails of 6.88 and 2.02 deg; RM A51J11's three
   thickened profiles, read against each other at the same M_0), the
   widening becomes two-sided for every inclined set, [r (1 - S), r (1 +
   S)].

   _How RM A51J11's and RM A52E01's readings enter_ (written 2026-10-26
   after round 15's two blind readings were committed, from their method
   notes' account of the figures' axes, legends and series, before their
   values were looked at and before the neutral pairing):

   - _What the figures are._ Faired curves, no symbols, in every panel.
     The readings' curve rows (RM A51J11 fig. 14 every 0.01 in Mach
     number; fig. 15 at the four orifice stations and between; RM A52E01
     fig. 8 at fixed angles of attack) are the data; boxes of merged or
     hidden ink enter as boxes.
   - _RM A51J11's layer._ Fig. 14 has each thickness with and without
     surface roughness (No. 60 carborundum to 0.10 chord). With roughness
     the layer is turbulent from 0.10 chord: those curves set the band
     and the layer reach. Without roughness, and in fig. 15 (no roughness
     stated), the layer at Re about 2e6 may be laminar or transitional,
     so the turbulent layer parameter would overstate what they reach:
     they set the band (the wider choice) and not the layer reach.
   - _RM A52E01's zero incidence._ The ordinate is the body axis's
     nominal angle of attack (the wings have no incidence), so each
     curve's value at alpha 0 (the readings' curve_at_zero rows) is its
     point; a reading that gives no such row for a curve gives no point
     for it. Its panels' Mach numbers are as printed (1.2, 1.4, 1.7); the
     report states no Mach accuracy.
   - _RM A52E01's wings in the supersonic panels._ The two readers did not
     both identify the wings there (one names a wing for every line, the
     other none). Where both readings, as paired, give a line the same
     wing, it takes that wing's properties. Otherwise the line is taken
     as any of wings 2, 3 and 4 at once: its layer reach the least of
     theirs (wing 2's) and its shape widening the largest (upward by S at
     6.88 deg), the wider choice in each.

   _Three readings of RM A52E01 fig. 8, the coordinator's rule (dated
   2026-10-26, decided before it was applied to the band)._ The rules
   above were written for two readings; a third blind reading (round 17) and a three-way neutral pairing
   (`audit/pairing-2026-10-26-a52e01-three/`) followed. With three:

   - _Wing identity._ A drawn curve takes a wing's properties only if
     every reader who names a wing for it names the same wing, at least
     two readers name one, and none of them flags it uncertain.
     Otherwise, any firm dissent included (such as one reader's
     systematic swap of wings 2 and 4), it is "any of wings 2, 3 and 4":
     the least layer reach and the widest shape allowance. No majority
     vote.
   - _Values at alpha 0._ A curve's value sets the band only if at least
     two readings give one and at least one pair of them agrees (their
     errors summed). It then enters as the envelope of every reading's
     value for that curve, a third that disagrees included. Values read
     once, values no pair agrees on, and curves not linked across the
     readings set nothing.
   - _Away from alpha 0._ Not used, as above (so round 17's six box rows
     in fig. 8(a) at M 0.9 at Cp -1.79, likely a slip, do not enter;
     they are noted).

7. **What is refused below Mach 1.5**, each with its reason in plain
   words, at every station along the span on fins of varying chord: a
   layer parameter beyond the data (X above what the points of each of the
   two bracketing nodes' windows reach, each set counted at the least X of
   its test, and above 4.5; where no thick-layer set reaches a window,
   edges with X above the thin sets' are refused there); h/c outside the
   least and greatest h/c of all the band-setting sets below Mach 1.5 (h/c
   acts through the layer, which the rule before it bounds window by
   window; Nash finds little effect of h/c itself above about 2% near Mach
   1, and the band above 1.5 has no h/c limit); a laminar edge (item 1); a
   swept edge. (The h/c rule amended 2026-10-26 before any value of RM
   A51J11 or RM A52E01 was read: first written window by window, which
   above Mach 1.25 would have served TN 3548's h/c 0.06 alone.)

8. **Labels.** Free edges: "estimated on component data", naming the
   flat-faced sets, the inclined sets with their widening, the thick-layer
   factor held at its Mach 1.5 value, and "tested only in the total".
   Edges in the base plane: "an analogy, not a measurement", as above 1.5.

9. **Tests** (`tests/base/fin-trailing-edge-transonic.test.ts`): every
   band-setting point of both readings inside the band at its own Mach
   number; the nominal and the band equal from both sides of Mach 1.5;
   the nominal's nodes from the data; the NPL ratio; each refusal; and
   planted errors (a point moved, a node moved, the widening's side
   reversed) caught.

### 3.5 F5: thin sharp sections near Mach 1

Double wedges (11.3% of cases) and single wedges (the page's section, and
BRL 934's fins, whose range C, Mach 0.98 to 1.2, needs this term).

- _Method._ Linear theory, three-dimensional (0009's source sheet on a
  plane wall, the fin and its image), without the 2D exact factor, which
  has no meaning near Mach 1. The bump wings are exactly this geometry: a
  semispan wing on a reflection plane.
- _Band._ Measured over linear theory, the measured being the reports'
  pressure drag (minimum drag less its value at Mach 0.6 or 0.7), over
  both readings, for the wings whose similarity parameters bracket the
  case: xi, A tau^(1/3) (TR 1253's slender regime, A tau^(1/3) below 1,
  holds 95.6% of the population's double wedges), taper (TN 3529) and
  sweep (RM L54B25, TN 3469). Interpolated only inside the measured
  families, as 0010 section 1.3's rules do.
- _The section's shape._ The bump wings are NACA 63A and 65A sections, not
  double wedges; the band is carried to double wedges as an analogy and
  checked on the 2D double wedges (Humphreys' 10%, R&M 3348's 7%,
  Johnston's diamond) in similarity variables, with Spreiter and Alksne's
  sonic results for the shape's effect. Single wedges: R&M 3348's 14% and
  Johnston's 20% single wedges, and Bryson's forebodies for the face (with
  the free stream supersonic the face sees only the sonic shoulder ahead
  of the base).
- _The thinnest sections._ TR 1253 leaves its 2% wings out of its
  correlation, "because of the uncertainty of reading accurately the
  rather small transonic drag rise", and shows them separately "to
  illustrate the pronounced effect of the boundary layer for these
  thinnest profiles" (PDF text, figs. 6 and 7). The population's double
  wedges are 1.5% to 4.3% thick (median 2.4%): below 4% the band rests on
  the 2% wings of TN 3529 and RM L54B25 and on similarity from thicker
  ones, and is widened by what the 2% wings' boundary-layer effect shows,
  or refused where it cannot be read.
- _Domain._ Above Mach 1.0 (linear theory is singular at 1.0 itself; the
  quadrature near beta = 0 to be measured first), to Mach 1.10 on the Ames
  wings and 1.18 on the Langley wings; from 1.18 to 1.2 bridged to the
  present supersonic method only by a recorded decision. Hexagons are not
  thin sections (bevels of 8 to 15 deg): F3 and F6.
- _Stays refused._ A tau^(1/3) above 1 or outside the families; Mach 1.0
  exactly; sections other than double and single wedges.

### 3.6 F6: refused, and what would lift each

| Refused at Mach 1.0 to 1.2                         | Share of cases | What would lift it                                                                                                      |
| -------------------------------------------------- | -------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Rounded leading edges below M_n 1.0                | 37.3%          | section 3.2's rules as reviewed (93.1% of these edges fail them); data, or R&M 3348 figs. 31b and 32 to relax them      |
| Rear bevels of hexagonal sections                  | 20.6%          | pressures on a flat followed by a converging wedge to a sharp trailing edge, 2D or swept, at M_n 0.5 to 1.2; none found |
| Square-cut leading edges, rounded TEs (W11)        | 30.8%          | as 0016 section 6                                                                                                       |
| Bevels beyond 10 deg (unless the similarity holds) | 21.9%          | the 26.57 deg wedge's support, or wedge forebody data at 10 to 15 deg                                                   |
| Bevels at M_n 0.9 to 1.2 (unless measured)         | 7.2%           | R&M 3348 fig. 32 read twice (section 3.3); Knechtel's tests                                                             |
| Swept blunt trailing edges (unless decided)        | 7.9%           | R&M 3348's sweep collapse, by decision                                                                                  |
| The fins' own-drag band (all fins)                 | all            | F1: RM L55H09 or another fin increment near Mach 1                                                                      |

## 4. What would be served, and the coverage

`w7-plan.out`, the fin terms only, at Mach 1.0 to 1.2 (a case may be
refused for several reasons; F1 taken as served once its band is read):

| Variant                                                                                                                                               | Fin terms served            | Main refusals left                                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A: on data (bevels to 10 deg and M_n 0.9; unswept trailing edges)                                                                                     | 14.5%                       | rounded edges below M_n 1.0 37.0%; W11 30.8%; bevels beyond 10 deg 21.9%; rear bevels 20.6%                                                                                                  |
| B: A with swept trailing edges (R&M 3348)                                                                                                             | 14.9%                       | as A, less the swept trailing edges                                                                                                                                                          |
| C: B with rounded edges below M_n 1.0 bounded                                                                                                         | 38.0%                       | W11 30.8%; bevels beyond 10 deg 21.9%; rear bevels 20.6%                                                                                                                                     |
| D: C with bevels to 15 deg and M_n to 1.2, theory-bridged                                                                                             | 45.3%                       | rear bevels 20.6%; W11 30.8%                                                                                                                                                                 |
| **E: as decided** (rounded edges bounded to M_n 0.9; bevels to 10 deg, bounded at M_n 0.9 to 1.2; swept trailing edges)                               | **35.2%**                   | bevels beyond 10 deg 21.9%; rear bevels 20.6%; W11 30.8%; rounded edges at M_n 0.9 to 1.0 6.3%                                                                                               |
| F: E with bevels to 15 deg (if the 26.57 deg wedge supports the similarity)                                                                           | 41.5%                       | rear bevels 20.6%; W11 30.8%; rounded edges at M_n 0.9 to 1.0 6.3%                                                                                                                           |
| **G: as reviewed, 2026-10-22** (rounded edges by `boundedRoundedEdge`; bevels to 10 deg, to M_n 1.2 on fig. 32, 3.2's rules below M_n 0.6; swept TEs) | **15.7%** (17.4% before N1) | rounded edges: the free stream (with the fins' thickness, N1) 39.5%, the trailing edge's transonic rule 33.6%, M_n above 0.8 15.3%; bevels beyond 10 deg 21.9%; rear bevels 20.6%; W11 30.8% |
| H: G with bevels to 15 deg (if the 26.57 deg wedge supports the similarity)                                                                           | 21.4% (23.2% before N1)     | as G, less the bevels beyond 10 deg                                                                                                                                                          |
| **I: as decided by the owner, 2026-10-22** (G with rounded edges below M_n 1.0 refused until NASA TM X-653 is read, 0014 10.7 (o))                    | **15.6%**                   | rounded edges below M_n 1.0 40.0%; bevels beyond 10 deg 21.9%; rear bevels 20.6%; W11 30.8%                                                                                                  |
| J: I with bevels to 15 deg (if the 26.57 deg wedge supports the similarity)                                                                           | 21.3%                       | as I, less the bevels beyond 10 deg                                                                                                                                                          |

Variants E and F are the decisions as first made; G and H are as
reviewed (sections 3.2 and 3.3); I and J are G and H with the owner's
decision of 2026-10-22 (rounded edges below M_n 1.0 refused until NASA TM
X-653 is read, 0014 10.7 (o)), and I is the plan now. G to J were re-run
on 2026-10-22 after the re-review's N1, the fins' thickness entering 3.2's
free-stream floor (applied to the bevels below M_n 0.6 too). Variant D's
theory bridge is not done (0014 10.7 (k), item 2): it is kept to show
what the theory alone would add. These are ceilings on the
totals at Mach 1.0 to 1.2: a total there also needs the nose (0013), the
base below Mach 1.5 (W2), the fins at the base below Mach 1.5 (W1, on the
main line since b86c308, its rebuilt factor serving flat plates
"bounded, not measured", 0014 10.7 (i); 72% of the population's fins end
at the base), and the
nose shapes and tips (W5, W6, W8). Totals at Mach 1.0 to 1.2 are 0% today
and stay 0% until those land; the population run with all of them is made
in step 2 (section 6), before and after each term, as 0016 did.

Without F1 every fin term below Mach 1.5 stays refused, whatever the rest
(the guard, 0014 10.7 (f), now on the main line). Whether F2 reaches the
PARD standard body's range B (0014 section 10.5; its fins are rounded-edge
plates swept 45 deg, M_n 0.71 to 0.85 at Mach 1.0 to 1.2) depends on its
fins' trailing edges under section 3.2's (L5): at most Mach 1.06 to 1.13
of it (M_n 0.8 at 45 deg), to be found from its geometry (0014 section
5.2) when the term is wired, not from its drag.

## 5. Decisions (2026-10-21), and where they are recorded

1. **The guard below Mach 1.5 (F1): done.** Fin friction and the wave
   drag of sharp sections refused below Mach 1.5 (0014 10.7 (f), commit
   7411c70, on the main line); above Mach 2.96 the band carried and
   labelled (0014 10.7 (j)). Next, F1's data: RM L55H09, once its body is
   confirmed to be neither the RM-10 nor the PARD body.
2. **Rounded leading edges below M_n 1.0 (F2): bounded, not measured**,
   both orderings written in section 3.2, reviewed independently before
   anything is served (0014 10.7 (k), item 1). Writing the ordering out
   widened the lower bound below zero by the trailing edge's upstream
   influence and limited it to M_n 0.9. **Reviewed 2026-10-22: rejected as
   written; the coordinator's decisions on the findings**, made in
   section 3.2: (L4) and (L5) rewritten on the trailing edge (its sweep,
   its normal Mach number, the normal-plane chord); the cases that cannot
   be argued refused, with thresholds from the argument (the free stream
   below Mach 1.06, the trailing edge's normal Mach number inside the
   plate's transonic range, |xi_TE| < 1.175); the model to be checked
   against R&M 3348 fig. 31b and its p. 22 comparison once fig. 31b is read
   twice; the lower bound with a margin of 2; section 1.2 corrected; (L6)'s
   account of Graham corrected; the chords said to be streamwise; (U2)
   rewritten on Bryson's stationarity and (U3) on estimates of the nose's
   front side; the Reynolds-number allowance in the high end; Barrowman's
   curve addressed; service capped at M_n 0.8 until CR-149372 fig. 8a,
   read twice, shows the margin at 0.85 to 0.9. Each case the review names
   is a test. Nothing is wired or served until the same reviewer passes
   the rewrite. **The owner's decision, 2026-10-22 (0014 10.7 (o)):
   refused until NASA TM X-653 is named in 10.7 and read**; the bounded
   term kept as a recorded candidate, not wired, and the rest of the
   rewrite kept (the line sink with a margin of 2, the xi_TE rule, the
   Mach 1.06 floor, and 3.3's bevels across Bryson's gap).
3. **Bevels (F3): measured where Bryson's points lie; bounded, not
   measured, between his measured values across his gap**, the theory
   only in the ordering; 10 to 15 deg only if the 26.57 deg wedge
   supports the similarity (0014 10.7 (k), item 2; section 3.3).
   **Reviewed 2026-10-22: accepted with changes, all adopted** (section
   3.3): Bryson's gap is measured by R&M 3348 fig. 32 once it is read
   twice; the upper bound set against Vincenti's bars in fig. 14; the gap's
   lower end at xi -0.35; the ordering on fig. 32 and eq. 43; the sweep
   allowance additive and two-sided; the similarity variables converted;
   below M_n 0.6, section 3.2's rewritten lower bound.
4. **Swept trailing edges at Mach 1.0 to 1.2 (F4)**, if R&M 3348, read
   twice, sets the band directly; a change to 0016 section 6 for that
   range only, separate from W1's factor (0014 10.7 (k), item 3; section
   3.4).
5. **Registration: done** (0014 10.7 (k)), before any figure is read.

## 6. Readings owed, and the order of work

Each figure is read by me first and recorded with its source (NTRS id or
AERADE handle, PDF page), its calibration and per-row errors, under
`docs/research/total-drag/audit/w7-fins/`; until the blind second reading
arrives it is labelled "read once", and every band is the envelope of
both once it does. The order (the advisor's, which the coordinator
adopted on 2026-10-22, HANDOFF section 8): F4, then F1, then F3, F5, and
F2 last.

1. **The guard: done** (0014 10.7 (f) and (j); tests in
   `tests/total/fins-own-drag-guard.test.ts`; the Basic Finner's gated
   shots unchanged in number).
2. **F4, the trailing edges.** Readings, each with its state on
   2026-10-23 (the second readings are the coordinator's to arrange, and
   round 10's are paired by a neutral party):
   - read once, second to arrange: R&M 3427 fig. 39 (10.7 (l)) and fig.
     13's hole 4 (10.7 (m); whether it serves, section 3.4); TN 3548 fig.
     6; RM A51J25 fig. 7 below M' 1.5 (the curve-and-symbols band; the
     earlier reading there is audit round 4's); R&M 3427 figs. 15, 16 and
     18;
   - read once, round 10's blind reading to pair: R&M 3427 fig. 13 (holes
     5 to 7); R&M 3348 figs. 30a and 30b (the fig. 30 against table 3
     inconsistency raised at the pairing);
   - read twice and paired: R&M 3348 table 3 (typed, 852 of 852
     identical); R&M 3427 figs. 9 and 10, on the two blind readings of
     round 10 and round 12 (paired on `claude/wip/round10-w7-figures` at
     36c5a61: every symbol and line agrees within the errors but the
     laminar flat-plate line's right end, M 1.1787 against 1.2068, both
     kept). W7's earlier first reading of figs. 9 and 10 (9f4d89f) is
     "not shown to be blind" (its method note) and is not used;
   - a check that sets nothing: R&M 3348 figs. 47 to 52 (10.7 (r): the
     registered quantity, p/H at x/c 0.995 per incidence, cannot be read;
     the envelope read instead was defined after the ink was seen);
   - R&M 3323 fig. 4: sources traced (2026-10-23; refs. 31 to 35 and 38
     to 41, of which 31, 34, 35 and 38 are counted once with their own
     reports); read once (61 symbols), a blind second to arrange; its
     three heavy symbols at h/c 0.14 have no legend entry, stay "source
     not traced" and set nothing (0014 10.7 (s));
   - R&M 3323 fig. 5: a check that sets nothing (10.7 (s)): its h/c 0.10
     and 0.06 solid curves cannot be told apart beyond M 1.0; not read;
   - Johnston figs. 10(a), 10(b) and 10(c): read once (59, 98 and 57
     symbols), a blind second to arrange; figs. 4 to 9, 11 and 12 removed
     from the registration (10.7 (s)), not read;
   - RM L8B13: limited to figs. 4(c) (the wedge's base) and 4(e) (its
     sides) (10.7 (s); fig. 4(d) is the swept cylinder); marks its legend
     does not explain set nothing; fig. 4(e) read once (25 symbols);
     fig. 4(c) a check that sets nothing (10.7 (t)): its four series
     merge into clumps of ink from about M 0.85; not read
     (`method_rml8b13_fig4.md`);
   - R&M 3427 fig. 13's hole 4: left open (10.7 (s)); the size of the
     wedge-against-plate widening is decided in section 3.4 before any F4
     code.

   Then `src/base/fin-trailing-edge.ts` below Mach 1.5, tests against the
   data (each set's points inside the band, the step at 1.5), the record.

3. **F1, the fins' own-drag band.** Confirm from RM L55H09's text and fig.
   1, and from RM L9I30's model drawings (10.7 (p)), that its body is
   neither the RM-10 nor the PARD standard body; name its increment and
   base-pressure figures, and RM L51F29's, in 0014 10.7 before reading
   them; read them; form the band as 0008 section 4.3 formed ARCAS's.
4. **F3, bevelled leading edges.** Readings: TR 1094 figs. 13, 14, 15 and
   16, R&M 3348 figs. 31a, 31b and 32 (31b and 32 read blind by round 10,
   and once by W7 at 818d9f2 and 3c5a9f5, to pair; CR-149372 fig. 8a, F2's
   check, likewise at e94adb7); Knechtel's tunnel and corrections recorded
   before his curve sets anything (3.3, N4). Then a bevel term in
   `src/fins` (beside `rounded-leading-edge.ts`), `finned-body.ts`'s
   bevel-leading-edge and hexagonal paths below Mach 1.5, tests against
   Bryson's points.
5. **F5, thin sharp sections.** Readings: the bump wings' zero-lift drag
   figures, TN 3306, R&M 3348 figs. 35 and 36. First the linear code's
   convergence near beta = 0 (its quadrature error, against the area-rule
   support code of `tests/fins/support/area-rule.ts`), then the band.
6. **F2**, refused until NASA TM X-653 is read (0014 10.7 (o)): name its
   figures in 10.7 from its model drawings and list of figures, then read
   them twice. The candidate is `src/fins/rounded-edge-bounded.ts` with
   `tests/fins/rounded-edge-bounded.test.ts` (not wired; rejected as it
   stands by the re-review of 2026-10-22, its findings F, N1 and N5 made
   in 3.2, the base's sink still to be written, (L4) and (L5)); then the
   checks read twice (CR-149372 fig. 8a, R&M 3348 figs. 31b and 32; Kyle
   and Feryn's increments), the margin and the cap reconsidered on them,
   then the wiring.

Wiring into `src/total/finned-body.ts` waits for W1's branch and the main
line (the coordinator's word); the main line is merged, never rebased.
After each term the refusal population is re-run (`OUT_DIR` under
`docs/research/refusals/out/`), its cross-check against `src/total`
required to agree, and the coverage at Mach 1.0 to 1.2 reported before
and after.

## 7. Sources

Opened for this record (NTRS ids; AERADE handles under
`reports.aerade.cranfield.ac.uk/handle/`):

| Source                                                                     | Id                 |
| -------------------------------------------------------------------------- | ------------------ |
| Bryson, NACA TR 1094 (1952)                                                | NTRS 19930092136   |
| Rogers, Berry and Quincey, ARC R&M 3348 (1963)                             | AERADE 1826.2/3929 |
| Nash, Quincey and Callinan, ARC R&M 3427                                   | AERADE 1826.2/4011 |
| Nash, ARC R&M 3323 (1963)                                                  | AERADE 1826.2/3903 |
| Nash, ARC R&M 3344 (turbulent base flow and the approaching layer; theory) | AERADE 1826.2/3925 |
| Morrow and Katz, NACA TN 3548 (1955)                                       | NTRS 19930084307   |
| Johnston, NASA Memo 4-30-59L (1959)                                        | NTRS 19980228287   |
| Sawyer and Daum, NACA RM L8B13 (1948)                                      | NTRS 19930085324   |
| Humphreys, NACA TN 3306 (1954)                                             | NTRS 19930084050   |
| McDevitt, NACA TR 1253 (1955)                                              | NTRS 19930092253   |
| Nelson, Allen and Krumm, NACA TN 3529 (1955)                               | NTRS 19930084232   |
| Few and Fournier, NACA RM L54B25 (1954)                                    | NTRS 19930093723   |
| Polhamus, NACA TN 3469 (1955)                                              | NTRS 19930084231   |
| Spreiter and Alksne, NACA TR 1359                                          | NTRS 19930091016   |
| Vincenti, Dugan and Phelps, NACA TN 3225 (1954)                            | NTRS 19930084152   |
| Lindsey, Daley and Humphreys, NACA TN 1211 (1947)                          | NTRS 19930081941   |
| Graham, ARC R&M 3465                                                       | AERADE 1826.2/4044 |
| Wilby, ARC CP 921                                                          | AERADE 1826.2/934  |
| Randall, ARC CP 456                                                        | AERADE 1826.2/469  |
| Lawrence and Kell, ARC CP 145 (1954)                                       | AERADE 1826.2/158  |
| Kyle and Feryn, NASA TN D-3634 (1966)                                      | NTRS 19660028010   |
| Howell and Braslow, NACA RM L55H09 (text only, no figure)                  | NTRS 20050019382   |
| Stoney and Sandahl, NACA RM L53L24a                                        | NTRS 19930088058   |
| Katz, Marley and Pepper, NACA RM L50G31 (abstract and body description)    | NTRS 19930086334   |
