# 0019: Fin drag near Mach 1 (the fin terms of 0014 W7)

- **Status:** Draft plan, with the coordinator's decisions of 2026-10-21
  recorded (section 5; 0014 section 10.7, amendments (f), (j) and (k)). Of the
  code, only the guard is done (fin friction and the wave drag of sharp
  sections refused below Mach 1.5, amendment (f), on the main line; the
  band above Mach 2.96 labelled, amendment (j)). One research script is
  added, `docs/research/refusals/w7-fins.test.ts`, with its output
  `docs/research/refusals/out/w7-plan.out` (the population's parameters
  near Mach 1, the present code's behaviour there, and the coverage of
  each variant of this plan). No figure was read for a band: every value
  quoted from a source below is from its text, or from a first look at a
  figure to see what it covers, and is marked so.
- **Date:** 2026-10-21
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
be served on data, and 35.2% with the coordinator's decisions (rounded
edges bounded to M_n 0.9, bevels bounded across Bryson's gap, swept
trailing edges on R&M 3348; section 4); the rest stay refused for the
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
- the leading edges, at M_n 0.82: between none and 0.14 (the bound of
  section 3.2).

Together 0.2 to 0.4 in C_D, of the order of the whole body's drag near
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
  leading-edge bluntness. Not opened.
- **Cleary and Stevens**, NACA RM A51J11 (NTRS 19930087063): thickening
  the trailing edge of a 4% circular-arc wing at transonic speeds (base
  pressures at small h/c, cited by R&M 3348). Not opened.
- **Goin**, RM L52D21 (named band-setting by 0014; 45 deg swept blunt
  trailing edges at M 1.41 and 1.62, within R&M 3348's fig. 30b);
  **Katz and Stoney**, RM L51F29 and **Hart and Katz**, RM L9I30
  (fin-stabilized parabolic bodies in free flight, M 0.8 to 1.4, base
  pressures); **Vincenti and Wagoner**, TR 1095 (the PDF download failed;
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

**Decided (0014 section 10.7 (k), item 1): served "bounded, not
measured"** under 0014 section 10.2, its two orderings written here,
reviewed independently before anything is served.

**The setting.** In the plane normal to the edge (the independence
principle, as for W4(c)), a plate of thickness t with a semicircular nose
of radius t/2, faces parallel to the stream for a chord c (c/t 23 to 71 at
the population's roots, 8 to 40 at their tips), then a trailing edge. Only
the nose's surface, from the stagnation line to the shoulders at 90 deg,
carries a force along the stream; the faces carry none. The term is the
nose's pressure drag per unit span, C = D / (q_n t), on the normal dynamic
pressure q_n and the nose's frontal height t.

**The upper bound: C(M_n) cannot exceed C(1.0), the term at M_n 1.0 at
its band's high end.** C(1.0) is CR-149372's node (kappa 0.764, range
0.751 to 0.772) times modified Newtonian, (2/3) Cp_pitot(1.0) = 0.8504,
times the sweep allowance's high end (1.22 from 14.3 deg of sweep, 0016
section 19): 0.6565 unswept, 0.801 swept. At M_n 1.0 and above the plate's
nose sees the cylinder's flow (0016 section 11), so C(1.0) is a plate's
value. The ordering:

- _(U1) Below the critical normal Mach number C is near zero._ The plate's
  forebody alone, in shock-free inviscid flow, carries no drag (the
  lower bound's argument, (L1)), against C(1.0) = 0.66.
- _(U2) Above it, C rises with M_n through 1._ The nose then carries the
  wave drag of the local supersonic region at the shoulder, which grows
  as M_n rises. Every forebody followed by a straight section that has
  been measured through Mach 1 rises in drag coefficient to a maximum
  past M = 1: Bryson's three thin wedges (TR 1094 figs. 13 and 14: the
  subsonic points rise toward the supersonic plateau and lie below it),
  and the fore part of his 12% biconvex airfoil ("the fore drag
  coefficient has a maximum after M = 1", fig. 23, PDF p. 32). Bryson's
  models are of the plate's own kind: noses followed by straight
  afterbodies. The stagnation pressure, which acts over the front of the
  nose where most of its drag lies, rises with M_n too:
  Cp_0 = [(1 + 0.2 M_n^2)^3.5 - 1] / (0.7 M_n^2) goes from 1 to 1.2756.
- _(U3) A separated shoulder does not reach C(1.0)._ A laminar bubble at
  the shoulder (Re_D 1e4 to 1e5) loses suction over the nose's aft part,
  raising C. The largest effect is bounded by the cylinder's, whose
  separation is far larger and whose wake displaces the approaching flow:
  TN 2960's front sides are 0.10 to 0.41 of modified Newtonian at M 0.05
  to 0.70 (both readings), C = 0.067 to 0.31, all below 0.66. CR-149372's
  fig. 8a (subsonic front sides, named as a check by 0014 10.7 (k)) is
  read to show how the cylinder approaches C(1.0) between M 0.7 and 1.0;
  if any of it exceeds the bound, the range where it does is refused.
- _(U4) What is not shown._ That a semicircle on flat faces rises
  monotonically as these forebodies do: it is the closest analogy the
  data hold, not a measurement. The sweep allowance at subsonic M_n is
  unmeasured as it is at M_n 1.0 to 1.95 (0016 section 16); the bound
  carries its high end.

**The lower bound: C(M_n) cannot be below C_L = -(t / c) / (pi beta_n),
beta_n = (1 - M_n^2)^(1/2), at M_n up to 0.9.** The coordinator's
decision was "no drag on the nose"; writing the ordering out found that
zero can be crossed by a small amount, so the bound is widened to what the
argument supports (0014 10.7 (k), item 1):

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
- _(L4) The trailing edge can lower C below zero._ Behind the trailing
  edge the plate's displacement closes in its wake (the base, its dead
  air, and a waist about two base heights downstream; Nash, R&M 3323
  pp. 7 to 8). At most it is a sink of strength U t at least a chord c behind the
  nose. In linearized subsonic flow it induces at the nose a velocity U t
  / (2 pi beta_n x) along the stream, lowering the pressure there by at
  most t / (pi beta_n c) of q_n; on the frontal height t, C is lowered by
  at most (t / c) / (pi beta_n). The wake does not close its displacement
  entirely (its momentum deficit remains), and (L3) acts the other way, so
  this overstates the effect. On the population's roots (c/t 23 to 71) it
  is 0.010 to 0.032 at M_n 0.9 and 0.007 to 0.023 at 0.8; at the tips of
  tapered plates (c/t down to 8) up to 0.09. It is taken station by station
  along the span with the local chord.
- _(L5) Where it fails._ As M_n approaches 1 the linearized estimate
  diverges (beta_n to 0) and the upstream influence is transonic. So the
  bound is served to M_n 0.9; between 0.9 and 1.0 the edge stays refused
  ("no bound below M_n 1.0 is shown where the linearized upstream
  influence fails"), 6.3% of the cases at Mach 1.0 to 1.2.
- _(L6) Data that check the sign._ The measured bluntness increments at
  subsonic normal Mach numbers are all positive or within their errors of
  zero: Pepper's blunter nose on a 45 deg 65A009 wing, +0.002 at Mach 1.05
  to 1.2 (M_n about 0.74 to 0.85; abstract); Sandahl and Stoney's 60 deg
  delta, no measurable effect (+-0.0007, M_n to 0.95); Kyle and Feryn's
  67 deg slab wing, bluntness raising the minimum drag at M_n 0.59 to 0.98.
  Graham's 2D blunted aerofoils show small and sometimes favourable
  changes, but a closed aerofoil's rear changes with its nose ((L4) at its
  closest), so they check nothing here. These are increments of airfoil
  noses: checks of the sign, not of the size. Kyle and Feryn's increments
  are to be read twice and set against the bounds computed for their nose
  as a check.

**Served:** the midpoint of [C_L, C(1.0)], the band the whole gap, on q_n
t times the span and the count, at M_n up to 0.9 and Re_D 6.7e3 to 1e6 on
the normal component (as W4(e)), labelled "bounded, not measured: between
no drag on the nose less the trailing edge's upstream influence (an
inviscid argument, 0019 section 3.2) and the term at M_n 1.0 at its band's
high end (CR-149372, TN 2960)", with the gap in C_D beside it. On the
hobby example at Mach 1.1 (M_n 0.82, c/t 40 at the root and 16 at the
tip): C from -0.021 (integrated along the span) to 0.801, so 0.068 +-
0.071 in C_D.

**What would replace it:** pressure distributions or drag on a flat plate
with a semicircular leading edge (r = t/2), two-dimensional or swept, at
M_n 0.5 to 1.0 and Re_D 1e4 to 1e6, read twice; or the drag of flat-plate
fins with full-radius against sharp leading edges at Mach 0.9 to 1.3, the
base separated. Candidates: the AEDC fin tests (section 2.3), Jorgensen,
Spahr and Hill's fin-bluntness models.

### 3.3 F3: bevelled leading edges

A bevel is a wedge followed by a flat: Bryson's models exactly, in two
dimensions.

- _Method._ A new edge term, as the rounded edge's is (0016): the wedge
  forebody's pressure drag at the normal Mach number on the normal
  dynamic pressure (the independence principle, exact for the inviscid
  flow over an infinite swept wedge), per unit span times the span; the
  faces behind it carry none. Near Mach 1 it replaces the section product
  for the front bevel; at Mach 1.5 and above the present product stays.
- _Measured: the nominal and its band._ Bryson's three thin wedges (4.53,
  7.56 and 10.00 deg), interpolated in the transonic similarity variables
  of his fig. 13 between the measured wedges, where his points lie: at
  M_n about 0.6 to 0.9 (75.7% of the population's bevels at Mach 1.0 to
  1.2 lie at 0.9 or below) and about 1.2 to 1.47. The band: the scatter
  of both readings' points about the interpolant, with the reading errors
  and the systematic variation with wedge angle that Bryson notes. The
  sweep allowance: R&M 3348's forebody chordwise force against M
  cos(sweep) (fig. 31b, sweep 0 to 60 deg), measured over the unswept
  curve. The Reynolds number: Bryson's 6e4 (laminar) against R&M 3348
  (1.3e6 to 3.4e6) and Johnston (1.2e6 to 1.4e6) at the same similarity
  parameter; the difference sets an allowance.
- _Decided (0014 10.7 (k), item 2): Bryson's gap, bounded, not
  measured._ Between his last subsonic point (reduced Mach number xi_s,
  about -0.5) and his first supersonic one (xi_p, about 0.9) there are no
  points. A case there is served between two measured values, never on
  theory:
  - lower bound: the reduced drag measured at xi_s, the low end of both
    readings with their errors. The ordering: a forebody's drag rises with
    the Mach number through M = 1 (all three of Bryson's comparisons:
    Vincenti and Wagoner's, Cole's and Guderley and Yoshihara's theories;
    the measured subsonic points rise toward the supersonic plateau, TR
    1094 figs. 13 and 14; and section 3.2's (U2) for the forebodies
    measured through Mach 1);
  - upper bound: the highest reduced drag measured at supersonic speeds
    (the plateau's high end, both readings, with their errors). The
    ordering: the forebody's maximum lies at or after xi_p, so nothing in
    the gap exceeds the plateau. The data show the plateau falling only
    above about xi 1.3; that the maximum is not inside the gap rests on the
    theories, which put it near shock attachment, and on fig. 13's
    supersonic points beginning at the plateau's level. This is the
    argument the review must accept; if the theories place a maximum in
    the gap above the measured plateau, the upper bound is raised to it
    or the gap refused.
  - served: the midpoint, the band the whole gap, labelled "bounded, not
    measured: between Bryson's measured wedge forebodies either side of
    Mach 1 (TR 1094), interpolated across no data".
- _Low normal Mach numbers._ Below Bryson's lowest point (about M_n 0.6,
  5% of the population's bevels), bounded the same way between section
  3.2's lower bound (no drag less the trailing edge's upstream influence,
  (L1) to (L4), which hold for any forebody of a semi-infinite plate) and
  the lowest measured point, the drag rising with the Mach number.
- _Bevels of 10 to 15 deg_ (73.9% of the population's bevels) only if TR
  1094 figs. 15 and 16, the 26.57 deg wedge at Mach 1.44, fall on the thin
  wedges' curve in the similarity variables within the band; then the
  interpolation in angle reaches 15 deg, labelled. Otherwise refused.
- _Stays refused._ Bevels steeper than the data allow; sweeps beyond 60
  deg; hexagons' rear bevels (F6).

### 3.4 F4: square trailing edges below Mach 1.5 (0014 W3(d))

The largest fin term near Mach 1 (section 1.2), and the best covered.

- _Method._ As now (0010 section 5.1): -P_B(M) n h s / A_ref with a
  two-dimensional base pressure, integrated along the span on fins of
  varying chord (0016 W3(b)), the vacuum bound kept. The curve from Mach
  1.0 to 1.5: RM A51J25 fig. 7's curve, read a second time below M' 1.5,
  where it is read once from 1.167, continued to 1.0 on the independent
  sets below (fig. 7 does not reach 1.0).
- _Band._ The envelope, over both readings, of the independent sets about
  the curve at their own Mach numbers and h/c: Nash's section (R&M 3427
  fig. 13, to M 1.12), R&M 3323 fig. 5's sections (their sources traced
  first), R&M 3348's table 3 (unswept, to 1.2), TN 3548 fig. 6 (free
  flight, to 1.7), Johnston's single wedge (to about 1.25), Sawyer and
  Daum's wedge (wing flow) and RM A51J25 fig. 7's symbols (1.23 to 1.475).
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
  base drag: W1's fins-on-base factor, which refuses swept trailing edges
  at the base because nothing measures them there, is a separate term,
  and R&M 3348 says nothing about it.
- _Fins at the base._ The edge in the base plane stays "an analogy, not a
  measurement" (its wake meets the body's base flow); 72.2% of the
  population's blunt edges are there.

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
| Rounded leading edges below M_n 1.0                | 37.0%          | section 3.2: data, or the owner's decision on the bounded option                                                        |
| Rear bevels of hexagonal sections                  | 20.6%          | pressures on a flat followed by a converging wedge to a sharp trailing edge, 2D or swept, at M_n 0.5 to 1.2; none found |
| Square-cut leading edges, rounded TEs (W11)        | 30.8%          | as 0016 section 6                                                                                                       |
| Bevels beyond 10 deg (unless the similarity holds) | 21.9%          | the 26.57 deg wedge's support, or wedge forebody data at 10 to 15 deg                                                   |
| Bevels at M_n 0.9 to 1.2 (unless bridged)          | 7.2%           | Knechtel's tests, or the theory bridge by decision                                                                      |
| Swept blunt trailing edges (unless decided)        | 7.9%           | R&M 3348's sweep collapse, by decision                                                                                  |
| The fins' own-drag band (all fins)                 | all            | F1: RM L55H09 or another fin increment near Mach 1                                                                      |

## 4. What would be served, and the coverage

`w7-plan.out`, the fin terms only, at Mach 1.0 to 1.2 (a case may be
refused for several reasons; F1 taken as served once its band is read):

| Variant                                                                                                                 | Fin terms served | Main refusals left                                                                             |
| ----------------------------------------------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------------------------------- |
| A: on data (bevels to 10 deg and M_n 0.9; unswept trailing edges)                                                       | 14.5%            | rounded edges below M_n 1.0 37.0%; W11 30.8%; bevels beyond 10 deg 21.9%; rear bevels 20.6%    |
| B: A with swept trailing edges (R&M 3348)                                                                               | 14.9%            | as A, less the swept trailing edges                                                            |
| C: B with rounded edges below M_n 1.0 bounded                                                                           | 38.0%            | W11 30.8%; bevels beyond 10 deg 21.9%; rear bevels 20.6%                                       |
| D: C with bevels to 15 deg and M_n to 1.2, theory-bridged                                                               | 45.3%            | rear bevels 20.6%; W11 30.8%                                                                   |
| **E: as decided** (rounded edges bounded to M_n 0.9; bevels to 10 deg, bounded at M_n 0.9 to 1.2; swept trailing edges) | **35.2%**        | bevels beyond 10 deg 21.9%; rear bevels 20.6%; W11 30.8%; rounded edges at M_n 0.9 to 1.0 6.3% |
| F: E with bevels to 15 deg (if the 26.57 deg wedge supports the similarity)                                             | 41.5%            | rear bevels 20.6%; W11 30.8%; rounded edges at M_n 0.9 to 1.0 6.3%                             |

Variant D's theory bridge is not done (0014 10.7 (k), item 2): it is
kept to show what the theory alone would add. These are ceilings on the
totals at Mach 1.0 to 1.2: a total there also needs the nose (0013), the
base below Mach 1.5 (W2), the fins at the base below Mach 1.5 (W1, which
must serve flat plates there, since 0016 section 20 refuses them on the
present factor; 72% of the population's fins end at the base), and the
nose shapes and tips (W5, W6, W8). Totals at Mach 1.0 to 1.2 are 0% today
and stay 0% until those land; the population run with all of them is made
in step 2 (section 6), before and after each term, as 0016 did.

Without F1 every fin term below Mach 1.5 stays refused, whatever the rest
(the guard, 0014 10.7 (f), now on the main line). With F2 the PARD
standard body's range B (0014 section 10.5; its fins are rounded-edge
plates swept 45 deg, M_n 0.71 to 0.85 at Mach 1.0 to 1.2) can be run,
with its leading edges bounded, not measured.

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
   influence and limited it to M_n 0.9 (section 3.2, (L4) and (L5)).
3. **Bevels (F3): measured where Bryson's points lie; bounded, not
   measured, between his measured values across his gap**, the theory
   only in the ordering; 10 to 15 deg only if the 26.57 deg wedge
   supports the similarity (0014 10.7 (k), item 2; section 3.3).
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
both once it does.

1. **The guard: done** (0014 10.7 (f) and (j); tests in
   `tests/total/fins-own-drag-guard.test.ts`; the Basic Finner's gated
   shots unchanged in number).
2. **F4, the trailing edges.** Readings: RM A51J25 fig. 7 below M' 1.5
   (a second reading of the curve there, 0010's being the first, and its
   symbols), TN 3548 fig. 6, R&M 3427 figs. 9, 10, 13, 15, 16, R&M 3323
   figs. 4, 5 (their sources traced first), R&M 3348 table 3 (typed, not
   read by eye) and figs. 30a, 30b (the sweep), Johnston's figs. 4 to 12,
   RM L8B13 fig. 4(c) to 4(e). Then
   `src/base/fin-trailing-edge.ts` below Mach 1.5, tests against the data
   (each set's points inside the band, the step at 1.5), the record.
3. **F3, bevelled leading edges.** Readings: TR 1094 figs. 13, 14, 15 and
   16, R&M 3348 figs. 31a, 31b and 32. Then a bevel term in `src/fins` (beside
   `rounded-leading-edge.ts`), `finned-body.ts`'s bevel-leading-edge and
   hexagonal paths below Mach 1.5, tests against Bryson's points.
4. **F5, thin sharp sections.** Readings: the bump wings' zero-lift drag
   figures, TN 3306, R&M 3348 figs. 35 and 36. First the linear code's
   convergence near beta = 0 (its quadrature error, against the area-rule
   support code of `tests/fins/support/area-rule.ts`), then the band.
5. **F1, the fins' own-drag band.** Confirm from RM L55H09's text and fig.
   1 that its body is neither the RM-10 nor the PARD standard body; name
   its increment and base-pressure figures in 0014 10.7 before reading
   them; read them; form the band as 0008 section 4.3 formed ARCAS's.
6. **F2**, as decided: the checks (CR-149372 fig. 8a; Kyle and Feryn's
   increments) read, the orderings reviewed, then the term.

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
