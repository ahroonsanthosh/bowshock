# RM L55H09 fig. 6: pairing summary

Produced by `pair_fig6.py` under the rule in `README.md` (written and
committed before the comparison). Every pair and every row read once is
in `pairing.csv`, both readings side by side. No value was averaged, and
no drag model, ratio or band was computed.

Rows: A 191, B 197. Readers' PDF SHA-256: A matches, B matches the brief's `5b6897abf162dfdd8babdbb40ff4d46ff99ecc5a4eef126b5690c54750e2418b`.

## Counts per panel and group

"Agreed (kind differs)" is the part of "agreed" whose kinds are open in one
reading and flagged in the other (rule 3).

| Panel | Group | Agreed | of which kind differs | Disagreed | Read once (A) | Read once (B) |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| top (total drag) | FO: wind tunnel, fins off | 11 | 6 | 1 | 3 | 1 |
| top (total drag) | FN: wind tunnel, fins on (open or flagged) | 16 | 1 | 1 | 0 | 1 |
| top (total drag) | FS: wind tunnel, fins on at fins-off R (solid) | 5 | 0 | 0 | 0 | 0 |
| top (total drag) | FF-sym: free flight, symbols | 42 | 0 | 1 | 11 | 4 |
| middle (base drag) | FO: wind tunnel, fins off | 11 | 5 | 0 | 4 | 0 |
| middle (base drag) | FN: wind tunnel, fins on (open or flagged) | 10 | 2 | 0 | 3 | 1 |
| middle (base drag) | FS: wind tunnel, fins on at fins-off R (solid) | 5 | 0 | 0 | 0 | 0 |
| middle (base drag) | FF-curve: free flight, curve stations | 8 | 0 | 0 | 3 | 11 |
| bottom (net drag) | FO: wind tunnel, fins off | 13 | 8 | 0 | 2 | 1 |
| bottom (net drag) | FN: wind tunnel, fins on (open or flagged) | 17 | 4 | 0 | 0 | 4 |
| bottom (net drag) | FS: wind tunnel, fins on at fins-off R (solid) | 5 | 0 | 0 | 0 | 0 |
| bottom (net drag) | FF-curve: free flight, curve stations | 19 | 0 | 0 | 0 | 9 |
| all | all | 162 | 26 | 3 | 26 | 32 |

Contested pairs: 93 of 165. A pair is marked `contested` in
`pairing.csv` when either of its rows had more than one candidate within the
matching window (rule 4), so the one-to-one nearest-in-Mach choice decided
the partner. The pairing is as the rule makes it; the mark is for a later
user who wants to see where the match itself was a choice.

## Item 6: agreed fins-off and solid fins-on pairs by side of the gap

Side (rule 8): below when both readings' Mach are at or below 1.04; above
when both are at or above 1.13 and at or below 1.41. Mach numbers are given
as A / B. `(k)` marks a pair whose kinds differ (open against flagged).

### bottom (net drag)

- FO (wind tunnel, fins off):
  - below: 6: 0.8067 / 0.8057, 0.8344 / 0.8362 (k), 0.9120 / 0.9162 (k), 0.9495 / 0.9494, 0.9744 / 0.9736, 1.0051 / 1.0050 (k)
  - above: 7: 1.1612 / 1.1606 (k), 1.1834 / 1.1835 (k), 1.2349 / 1.2332 (k), 1.2651 / 1.2657, 1.3251 / 1.3251 (k), 1.3388 / 1.3422, 1.3941 / 1.3927 (k)
  - straddles-or-outside: 0: none
- FS (wind tunnel, fins on at fins-off R (solid)):
  - below: 2: 0.8089 / 0.8088, 0.8135 / 0.8131
  - above: 3: 1.3187 / 1.3183, 1.3246 / 1.3243, 1.3961 / 1.3956
  - straddles-or-outside: 0: none

### middle (base drag)

- FO (wind tunnel, fins off):
  - below: 6: 0.8420 / 0.8422, 0.9084 / 0.9073 (k), 0.9473 / 0.9458, 0.9707 / 0.9706, 1.0146 / 1.0141, 1.0210 / 1.0214 (k)
  - above: 5: 1.1629 / 1.1613 (k), 1.1844 / 1.1843, 1.2299 / 1.2305 (k), 1.2358 / 1.2339, 1.2650 / 1.2663 (k)
  - straddles-or-outside: 0: none
- FS (wind tunnel, fins on at fins-off R (solid)):
  - below: 2: 0.8093 / 0.8093, 0.8122 / 0.8127
  - above: 3: 1.3180 / 1.3181, 1.3245 / 1.3245, 1.3966 / 1.3960
  - straddles-or-outside: 0: none

### Net drag: can each agreed solid square take a fins-off value (item 7)?

Existence only, per rule 8; no value is formed.

- FS 0.8089 / 0.8088 (below): yes; within 0.01: 0.8067 / 0.8057 | bracketed: 0.8067 / 0.8057 and 0.8344 / 0.8362
- FS 0.8135 / 0.8131 (below): yes; within 0.01: 0.8067 / 0.8057 | bracketed: 0.8067 / 0.8057 and 0.8344 / 0.8362
- FS 1.3187 / 1.3183 (above): yes; within 0.01: 1.3251 / 1.3251
- FS 1.3246 / 1.3243 (above): yes; within 0.01: 1.3251 / 1.3251
- FS 1.3961 / 1.3956 (above): yes; within 0.01: 1.3941 / 1.3927

### Item 6 (v), as far as item 6 (ii) and item 7's fins-off rule reach

- below the gap: 2 candidate qualifying point(s) (Mach A / B: 0.8089 / 0.8088, 0.8135 / 0.8131); two or more: item 6 (v)'s condition is NOT met on this side. Counting only pairs whose kinds agree (and fins-off partners whose kinds agree): 2.
- above the gap: 3 candidate qualifying point(s) (Mach A / B: 1.3187 / 1.3183, 1.3246 / 1.3243, 1.3961 / 1.3956); two or more: item 6 (v)'s condition is NOT met on this side. Counting only pairs whose kinds agree (and fins-off partners whose kinds agree): 0.

Items 6 (iii) and (iv) (the model refused or not converged; total
uncertainty above half the modelled own drag) need the model and are
not applied here: they can only remove candidates.

Also recorded, not decided here: item 4 says the band applies only within
the span of a side's qualifying points and never below Mach 1.0. Every
candidate listed below the gap lies below Mach 1.0 in both readings
(their Mach numbers above), so whatever they qualify for, the span they
give below the gap lies wholly below 1.0. Above the gap, the counts that
drop to zero when kind disagreements are excluded do so because the
fins-off partners within 0.01 are open in one reading and flagged in the
other (rule 3 does not let a kind difference block agreement; the strict
count is given for the coordinator). The legend keys the flag as fixed
transition.
