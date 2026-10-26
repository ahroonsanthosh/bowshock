# The boat-tail measurements (0023)

The measurements behind [0023](../../design/0023-boat-tails.md) section 2:
the boat-tail's own pressure drag from the fitted solve, against the
method of characteristics with the shoulder's fan, with linearised theory
as a sanity check. Nothing here is used by the solver or the page.

| File | What it is |
| --- | --- |
| `cases.ts` | The reference cases: nose, cylinder, boat-tail angle and length, Mach number. Two sets: `CASES` (thirteen, Mach 1.5 to 3) and `RM_E51F26` (RM E51F26's six boat-tails behind two noses at Mach 1.91, whose march is the inviscid value of 0023 section 3) |
| `lane.test.ts` | The lane: for each case, linearised theory and the march on 640, 1280 and 2560 intervals; then the fitted families on nj = 20, 40, 80 and 160 (CPU), every case on one grid before any on the next, each finer grid started from the converged one before; resumable (below) |
| `out/<case>.jsonl` | Its results, one JSON line per value: `kind` `linear`, `moc` (with `intervals`) or `fit` (with `refinement`, the boat-tail and forebody drags, the steps, the grid's quality, the axial Mach number at the base, the page's refusal if any, and the wall's pressure coefficient from a caliber ahead of the shoulder to the base) |
| `out-first-layout/<case>.jsonl` | The same from the first column layout (before the outer cells were held within the aspect gate, 0023 section 2.1): eight of its thirteen cases fail the gate. Its linearised and characteristics lines were copied into `out/`: the march up to the base does not depend on the continuation past it (run again with the second layout on `o3-c5-bt16-l1-m1.5`, 640 intervals, it gives the boat-tail drag within 7e-13) |
| `summary.py` | The summary of `out/`: the references, the fitted values and their errors, observed orders and the procedure's band (`python3 -I docs/research/boat-tails/summary.py`) |
| `table.py` | The table of 0023 section 2.3 from `out/` |
| `shoulder.test.ts` | The wall pressure behind the shoulder against Prandtl-Meyer and the march (0023 section 2.4); appends to `out/shoulder.txt` |
| `readers/brief.md` | The brief for the two readings of the figures 0014 10.7 (ae) names (0023 section 5) |

## Running

From the repository root:

```sh
nice -n 10 npx vitest run --config docs/research/boat-tails/vitest.config.ts
```

`SET=e51f26` runs the second set instead of the first (its families on
nj = 20 and 40 only were run, with `REFINEMENTS=1,2`); `CASES` (names,
comma-separated) limits the cases; `REFINEMENTS` (default
`1,2,4,8`), `MOC` (default `640,1280,2560`), `SKIP_MOC=1` and `SKIP_FIT=1`
limit what is run; `OUT_DIR` and `CKPT` move the results and the
checkpoints. Every result already in `out/` is skipped, so a run stopped
anywhere resumes where it was: a fit is run in chunks of `CHUNK` steps
(default 100, times the refinement: about 20 minutes on nj = 160 on a loaded machine) and its state saved after each into
`CKPT` (default `./ckpt`, not committed; about 9 MB a case on nj = 160),
and each grid's converged state is kept there to start the next grid.
