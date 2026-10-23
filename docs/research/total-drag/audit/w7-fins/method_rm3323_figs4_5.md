# ARC R&M 3323 figs. 4 and 5: sources traced, then first reading (method)

**Source.** Nash, "A review of research on two-dimensional base flow",
ARC R&M 3323 (AERADE 1826.2/3903), downloaded on 2026-10-23 from
`reports.aerade.cranfield.ac.uk` (bitstream `arc-rm-3323.pdf`) into a new
empty directory outside the repository: 28 PDF pages, 2000913 bytes,
sha256 2f1976e99c2cf610d2a57624a666343eb6b6ff7123b75447614cd55638933c3a.
Fig. 4, "The variation of base-pressure coefficient with trailing-edge
thickness at transonic speeds" (zero incidence), four panels at M 0.6,
0.8, 1.0 and 1.2, PDF p. 23 (printed p. 22). Fig. 5, "Variation of
base-pressure coefficient with Mach number", PDF p. 24 (printed p. 23).
Named band-setting by 0014 section 10.7 (k): "figs. 4 and 5, each plotted
set once its source is traced; a set that appears elsewhere in this table
is counted once".

**Blindness.** No other reading of these figures is known to exist in the
repository; I opened no file under `audit/round10/`, `round11/`,
`round12/` or any `pairing-*` folder.

## 1. The sources, traced before reading (2026-10-23)

From the report's text (section 2.3, printed p. 7) and its reference list
(printed pp. 16 and 17). Fig. 4's legend gives a symbol per reference;
filled symbols are free-flight tests, flagged symbols models with a
roughness band. Fig. 5's curves are labelled by h/c and reference; solid
without a roughness band, broken with one.

| Ref. | Source                                                                                                                                        | Fig. 4 symbol                    | Fig. 5 curve      | Elsewhere in 10.7 (k)?                                                                                                   |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 31   | Sawyer and Daum, NACA RM L8B13 (1948): the wing-flow wedge                                                                                     | half circle, flat side down      |                   | yes, RM L8B13 fig. 4(c) to (e): counted once                                                                             |
| 32   | Cleary and Stevens, NACA RM A51J11 (1951): a wing with a 4% circular-arc section, its trailing edge thickened                                  | triangle, point down             | h/c 0.012         | no; only through R&M 3323                                                                                                |
| 33   | Dugan, NACA RM A52E01 (1952): a tapered wing of aspect ratio 3.1, 3% biconvex section, three blunt trailing edges                             | half circle, flat side up        |                   | no; only through R&M 3323                                                                                                |
| 34   | Morrow and Katz, NACA TN 3548 (1955): the slab wing in free flight                                                                             | diamond (filled: free flight)    |                   | yes, TN 3548 fig. 6: counted once                                                                                        |
| 35   | Rogers, Berry and Quincey, ARC 23,180 (1961), published as R&M 3348: the single wedge, h/c 0.14                                                | triangle, point up               | h/c 0.14          | yes, R&M 3348 table 3: counted once                                                                                      |
| 38   | Nash, Quincey and Callinan, "report in preparation", published as R&M 3427: the 10% blunt section                                              | circle                           | h/c 0.10          | yes, R&M 3427 fig. 13: counted once                                                                                      |
| 39   | Pearcey, unpublished work (NPL)                                                                                                                | square                           | h/c 0.06          | no; unpublished, only here                                                                                               |
| 40   | Holder, Pearcey and Nash, "Some aerodynamic advantages of thick trailing edges in high-speed flight", paper to the RAeS, February 1962        | right triangle, flag to the left | h/c 0.025         | no; only here                                                                                                            |
| 41   | Saltzman, NASA TN D-1056 (1961): the X-15's vertical fin in flight                                                                             | right triangle (filled: flight)  |                   | not in (k); its table II is already typed for the present curve's band above Mach 1.5 (`src/base/blunt-te-2d.ts`)         |
| 50   | Korst: the steady-flow theory                                                                                                                  |                                  | "Steady flow"     | a theory, not data: not read                                                                                             |

What this means for counting (the coordinator decides how each is used,
in 0019 section 3.4, before a band is set):

- Refs. 31, 34, 35 and 38 are sets already named in (k) at their own
  reports. Read here as plotted, but counted once: where both are read,
  the source's own figure or table is the set, and R&M 3323's replot is a
  check of it (and of how Nash plotted it).
- Refs. 32, 33, 39 and 40 reach this work only through R&M 3323. 39 is
  unpublished and 40 a society paper; neither is traceable further here.
  32 and 33 are three-dimensional wings (the 4% arc wing, the aspect-ratio
  3.1 tapered wing), not two-dimensional sections; RM A51J11 and RM
  A52E01 are NACA reports that could be opened, but they are not named in
  10.7, so they are not opened for this reading.
- Ref. 41: the X-15 point at M 1.2 in fig. 4 is from TN D-1056; whether
  that table's rows below Mach 1.5 serve is not decided here (only rows at
  1.52 to 3.24 are used by the present curve's band).
- The report's own conditions are not given per set: Mach number is the
  free stream (M_inf on fig. 5; M on fig. 4), Cp_b the base-pressure
  coefficient on the free stream's pressure and dynamic pressure, so the
  sets are on M_0 and p_0 as 0019 section 3.4 requires; Reynolds numbers
  and layer states are those of each source and are not in R&M 3323.
