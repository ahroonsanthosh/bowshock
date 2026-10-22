# bowshock: handoff to a new session (2026-10-22)

Written by the coordinating session at the end of its run. Read this whole file before acting. It is
the coordinator's view. The design records in `docs/design/` are the authority on methods and claims:
where this file and a record disagree, the record wins and this file is stale.

Companion files on the branch `claude/wip/handoff`:
- `status/*.md`: one per workstream, in that workstream's own words where it reported, with commits.
- `advice/fable-2026-10-22.md`: the advisor's report (Fable, asked by the owner to advise). Eight
  ranked recommendations, with file and section citations.
- `coordinator/RESTART.md`, `coordinator/watch.py`, `coordinator/markers.json`: the lane restart
  commands, the job watcher and its markers.

## 0. First steps

1. The clone is fresh, so fetch the work branches:
   `git fetch origin 'refs/heads/claude/wip/*:refs/remotes/origin/claude/wip/*'`.
   Each active workstream is on `claude/wip/<name>` (section 4). Compute results and the lane scripts
   are on `claude/wip/results` (section 5).
2. Set the authorship the owner asked for, in the clone's `.git/config` (committer and signing are
   preconfigured as Claude, `noreply@anthropic.com`, ssh-signed):
   `git config author.name "Ahroon Santhosh"` and
   `git config author.email 276453980+ahroonsanthosh@users.noreply.github.com`.
3. Develop and push only to `claude/eloquent-dirac-ek9hcf`. That is the repository's default branch;
   the owner calls it main, and so does this file. The `claude/wip/*` branches were pushed with the
   owner's permission for this handoff. Treat them as sources to merge or cherry-pick from. Ask before
   pushing new work to them, and ask before deleting them.
4. Check CI on main's head (section 3).
5. Read section 2's rules, then work section 8's queue, asking the owner section 7's open questions
   where they block.

## 1. The project

bowshock is an AGPL browser solver for the supersonic drag of model rockets, running on the user's GPU
through WebGPU. It is for DIY rocketeers and small teams with little simulation experience.
- Live site: https://ahroonsanthosh.github.io/bowshock/
  - The drag page: `demos/nose-drag.html`. The flow page: `demos/flow-view.html`.
  - Pages are deployed from main on every push by `.github/workflows/pages.yml`.
- Deployments: https://github.com/ahroonsanthosh/bowshock/deployments
- CI: `.github/workflows/ci.yml` has two jobs:
  - format, lint, typecheck, unit tests and build (about 6 minutes);
  - GPU tests in headless Chromium on SwiftShader (about 33 minutes).

**What it computes.** Each component carries a measured band or is refused:
- **Nose wave drag:** fitted-shock Euler, its band measured from nested grids (0005, 0006).
- **Skin friction:** 0007.
- **Fin drag:** 0009, 0016.
- **Base drag** with the fins-on-base factor: 0010, 0015.
- **The total:** 0008, 0011.

**Labels** (README "What works today"; 0014 section 10.2):
- verified;
- validated, or estimated on component data;
- an estimate, not validated;
- bounded, not measured;
- refused, with every reason.

**Pre-registration** (0014 section 10):
- Held-back free-flight sets are the tests: the PARD standard body, BRL 934, Eglin "4-Fin Circular" and TN 3320.
- Each is run once per registered Mach range, after its methods are committed.
- Changes go only into dated amendments, 10.7 (a), (b) and so on.

**Coverage today** (docs/research/refusals/out/impact.out, on an assumed population of 8000 cases):
- Totals are served for 153 cases (1.9%): none below Mach 1.5, 2.5% at Mach 1.5 to 1.8, 5.2% at 1.8 to 3.0.
- The nose wave drag alone is served for about 24% at Mach 1.2 to 3.0.
- Below Mach 1.5, every total is refused: the fins' own drag band was measured only at Mach 1.5 to 2.96 (0014 10.7 (f)).

## 2. The owner, and the rules

**Priorities, in order:**
1. Accuracy. The owner's words: "insanely accurate", "accuracy is key", error ranges minimal; hundreds will scrutinise it.
2. Usability for DIY rocketeers.
3. Looks.

The project is headed for a Reddit launch, and YC and a16z scouts will look at the repository.

The owner also said:
- "we can't just refuse everything";
- "dont refuse under mach 1.2, just must be accurate": serve Mach 1.0 to 1.2 wherever an honest band exists.

**Owner decisions in force:**
- **Basic Finner validated claim:** "follow the rule". The claim stays suspended (0008 section 6.1) until BRL 934 range A tests the corrected factor. That test has now run (section 4.1); the consequence is the owner's decision (section 7, item 1).
- **Interface (0017):**
  - one page, full width;
  - a Cd vs Mach curve;
  - OpenRocket .ork import, in this pass;
  - keep calibers, grid and cells on the home screen;
  - FluidX3D-like colours. The owner's reference is an F1 render by FluidX3D. Learn from its README and pictures at https://github.com/ProjectPhysX/FluidX3D, never its code.
  - The flat 2D glow look was rejected ("very 2d ... cheap bad lookalike"), so a real 3D renderer was built.
- **Advisor:** "use fable as an advisor". Spawn an Agent with model `fable` for independent advice on strategy and hard decisions.

**Communication:**
- No em dashes, anywhere: chat, commits, docs.
- Plain language for the owner, who is not an aerodynamicist.
- Keep updates short.
- The owner reads in the Claude app, so files meant for them go in the working directory or the scratchpad.

**Git:**
- **Branch:** develop and push only to `claude/eloquent-dirac-ek9hcf`, with `git push -u origin claude/eloquent-dirac-ek9hcf`. Retry only on network errors (2, 4, 8, 16 s).
- **No PRs** unless asked. Never push to another branch without permission.
- **Commit message footer:** every message ends with exactly these two lines:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: <the new session's URL>
  ```
  Use the new session's own attribution reminder if it gives different lines.
- **No model identifier** anywhere else in the repository.
- **Authorship:** author is the owner (section 0, step 2); committer is Claude, signed.
- **Stop hook:** the session's stop hook refuses to end with uncommitted or unpushed changes, or with a commit whose committer is not `noreply@anthropic.com`.
- **Before merging any branch**, check its committers:
  `git log --format='%h %ce' main..BRANCH | grep -v noreply@anthropic.com`.
  Old agent branches carry duplicate commits with the owner as committer. Cherry-pick their new commits instead of merging them; `subtip-tangent` is the known case.
- **`git merge -F -` does not read stdin here.** Write the message to a file and use `-F file`.
- **History rewrite:** rewriting old commits to the owner's authorship (old task 25) needs the owner's explicit confirmation. Force-pushes need it too.

**Process rules:**
- **Band-setting figures:** every one is read twice, the second time blind, by a reader who never opens the first reading. A neutral party, never the readers, pairs the two readings. The band is the envelope of both. A source inconsistency (for example R&M 3348 fig. 30 against its table 3) is kept as an envelope, never resolved toward the narrower value.
- **Held-back sets** never set or shape a band: PARD body totals, BRL 934 Table III and Graphs I and II, Eglin Table D-3, TN 3320.
- **Naming data before use:** a figure sets nothing until a dated 10.7 entry names it, before it is read.
- **Amendment letters** in 10.7:
  - main has (a) to (i);
  - `brl934-range-a` has (n);
  - `w7-fins` has (j) to (m);
  - the next free letter is (o).

  Allocate letters centrally, so branches never collide.
- **Independent review:** every merge of a method gets one, by a fresh agent given the code, not the coordinator's conclusions. Its findings are fixed, or answered with the case and the reason, before merge.
- **Reviewers and readers are AI agents.** The advisor recommends saying so plainly in the README (section 7, item 7).
- **Labels** never claim more than was measured (see the transonic review's S6).
- **Refusals** carry every reason, in plain words.

**Safety:**
- **Permission laundering:** never do, on an agent's behalf, an action its permissions refused; surface it to the owner instead. Known cases:
  - The reader's NSWCDD/TR-92/509 table files (round 6) were refused a commit by the safety check. They are still uncommitted in this container's worktree `agent-adeeb9721ee747758` and were NOT pushed. Ask the owner.
  - The transonic agent was refused killing its own lane. The coordinator did not kill it either.
- **Processes:** never kill by pattern or by working directory. Kill only by an exact PID or process group you started.
- **Working directory:** keep the shell's cwd at the repository root. Use subshells or `git -C` for worktrees; a bare `cd` moves the session's cwd.
- **User email:** the user's email address is for authorship only.

## 3. Main at handoff

- **Head:** `7d8221c` (the second tangent-ogive reference, cherry-picked from subtip-tangent). Today, in order:
  - `bfe997e`: blind-reading rounds 6 to 9 merged. Main's code already cited rounds 6 and 7, which had lived only on reader branches.
  - `b86c308`: W1 merged, the rebuilt fins-on-base factor (0015), reviewed twice.
  - `f003330`: CI fix for the drag-page GPU test after W1.
  - `7d8221c`: F's record.
- **CI:**
  - Green on `bfe997e`.
  - Red on `b86c308`: the GPU job's tests/gpu/nose-drag-page.test.ts expected the old refusal reasons. Fixed in `f003330`, where the file passes 6 of 6 locally.
  - `f003330`'s run was cancelled by the next push.
  - `7d8221c`: both jobs green (run 39752671892, finished 09:20 UTC).
- **Advisor's rule, adopted:** never merge to main with the GPU job red on the branch, and run the GPU job on the branch before merging anything that touches the page or the refusal reasons.

## 4. Workstreams

Each workstream has a status file under `status/` with its commits, exact numbers and restart
commands.

| Workstream | Pushed as | Head | State | Next |
|---|---|---|---|---|
| BRL 934 range A, the registered hold-out run | `claude/wip/brl934-range-a` | `d8479a3` | **Done, once, as registered.** The present model passes; W1 is refused at every round | The owner decides the consequence (7.1). Then merge, and update the "Not run" texts |
| Transonic, Mach 1.0 to 1.2 (0013) | `claude/wip/transonic-mach1` | `ad0e20e` | Steps 1 to 6 built. The independent review found B1 and S1 to S7: B1, S4 and S1 (WIP) are fixed; the GPU sweeps fixed at 2 | S2/S3 (owner decision, 7.3), then S5, S6, S7 and the minor items. Then a fresh re-review, then merge |
| W7, fin drag near Mach 1 (0019) | `claude/wip/w7-fins` | `9f4d89f` | 0019 3.2 and 3.3 rewritten to the review (d7548b7) | Re-review. Then F4, F3, F5, F1, F2 (orderings, 8.6) |
| Haack and Von Karman noses | `claude/wip/haack-merge` (and `haack-grid`) | `299f786` | Claims and evidence complete. Final CPU tests not finished (the machine was overloaded) | Finish the checks, then an independent review, then merge |
| Interface (0017, 0018) | `claude/wip/interface` | `eceab88` | Page, curve, .ork import and 3D view built. Node tests pass | GPU page tests, the 3D third-page failure, usability numbers. Then review, then merge |
| Subtip (tangent tips, 0006) | `claude/wip/subtip-tangent` | `61457ed` (F on main as `7d8221c`) | F merged. G and A computing | G's record when its lanes finish. A is admitted only after the cross-check (7.6) |
| Round 10 blind readings | `claude/wip/round10-w7-figures` | `5c7c746` | R&M 3348 figs. 30a/b, 31b and 32, CR-149372 fig. 8a, and R&M 3427 figs. 13, 9 and 10, all read blind | Pair each against W7's first reading. R&M 3427 figs. 15 and 16 still to read |
| Older agent branches | `claude/wip/archive` | `b8183a6` | An empty-tree commit whose parents are eight old branch heads, kept so nothing is lost | Nothing; delete it once the owner agrees |

### 4.1 BRL 934 range A (details: `status/brl934-range-a.md`)

A neutral agent ran it once at the pre-run commit `1af3786`, which holds the inputs, the rounds and
amendment (n). Ten rounds were admitted.

- **Present model: passes.** At all seven rounds it serves, the residuals are +3.9% to +11.0% (mean
  +7.3%), against tolerances of about -27% to +27%. The closest round is still 16 points inside.
- **Rebuilt factor W1: refused at every round.** The Basic Finner's wedges diverge to a blunt trailing
  edge at the base, and no source measures that. By rule 3, W1 has no hold-out from BRL 934.
- **Sensitivities** (rounded C_D', DREV's edge radius, the halved trailing-edge term): all rounds stay
  inside.
- **Still to update:** the README, 0008 section 6.4, 0010 section 11.7 and 0014 (b) still say "Not run".

### 4.2 Transonic (details: `status/transonic.md`, `status/transonic-review.md`)

**Certified offline on the CPU, 7 deg cone:**

| Mach | Drag | Band | Note |
|---|---|---|---|
| 1.2 | 0.0830132 | 8.9e-6 | a validation case only: the driver serves below 1.2 |
| 1.1 | 0.0944950 | 9.8e-6 | grids r = 2 to 16 |
| 1.05 | 0.1071116 | 8.4e-5 | |

- **Taylor-Maccoll:** the exact cone solution lies inside the band at 1.2 and 1.1.
- **Below Mach 1.05:** refused (B1).
- **Mach 1.0:** refused by the registered rule; the far-field effect decays like a power of distance.

**Engine and timing:**
- The GPU two-float engine equals the CPU to about 1e-7 with 2 sweeps. With 4 sweeps it falls into a
  limit cycle.
- r = 8 takes 15 to 37 hours on SwiftShader. On a real GPU the estimate is 1 to 5 minutes, unmeasured.
- The interface must follow the API changes listed in `status/transonic.md`.

### 4.3 W7 (details: `status/w7.md`)

The review rejected 3.2 and accepted 3.3 with changes. The rewrite does the following:
- **Lower bound:** the trailing edge as a line sink, with a margin of 2.
- **Refused:** trailing edges with |xi_TE| < 1.175, and free streams below Mach 1.06.
- **Upper bound:** on Bryson's stationarity, capped at normal Mach 0.8.
- **Gap data:** the measured values in fig. 32's gap.

**Cost:** fin terms served at Mach 1.0 to 1.2 fall from 35.2% to 17.4%. Only 55 of 801 rounded edges
below normal Mach 1.0 pass.

### 4.4 Haack (details: `status/haack.md`)

- **Served:** Von Karman noses inside the convex hull of six MOC-referenced cases, from 1 to 5 calibers
  and Mach 1.5 to 3.
- **Allowance:** 5e-4, twice the largest MOC miss.
- **Running:** two corner runs, 5 calibers at Mach 2 and at Mach 3 (nj 80), would widen the hull.

### 4.5 Interface (details: `status/interface.md`)

Built:
- one full-width page;
- the Cd vs Mach curve, Mach 1.0 to 3.0, with refused points shown with their reasons;
- the .ork import;
- the 3D view as the main canvas, with FluidX3D-style keys and a 2D fallback;
- CSV and PNG export;
- a numbers test: what the page shows equals the logic's own output.

Not yet reviewed. The transonic path is designed but not wired.

### 4.6 Subtip (details: `status/subtip.md`)

Admitted:
- tangent tips with axially subsonic but surface-supersonic flow, on two references: E at Mach 1.35
  and F at Mach 1.6, which is on main.

Not admitted:
- surface-subsonic tips (A, P). They wait for the transonic solver's value for case A, and for the
  advisor's three further requirements (7.6).

### 4.7 Blind readings (details: `status/round10-reader.md`)

**Waiting for pairing**, by a neutral party (never the readers), against W7's first readings:

| Figures | State |
|---|---|
| R&M 3427 figs. 13, 9 and 10 | both readings exist |
| R&M 3348 figs. 30a/b, 31b and 32; CR-149372 fig. 8a | W7's first readings do not exist yet |

**Inconsistency in the source:** R&M 3348 fig. 30's points at Mach 1.11 to 1.20 lie below its own
table 3. It has not been shown to W7, so that W7's first reading of fig. 30 stays independent.

### 4.8 Not pushed, needs the owner

- **Round 6 reader's files:** the NSWCDD/TR-92/509 table files are uncommitted in the old worktree
  `agent-adeeb9721ee747758`.
  - A safety check refused that agent's commit. The coordinator did not commit them on its behalf
    (permission laundering), and they die with this container.
  - W1's labels name NSWCDD/TR-92/509's table as read once. If the owner wants the table read twice, a
    fresh reader must type it again.
- **The FluidX3D reference image** the owner sent is a third party's picture. It was deliberately not
  pushed.

## 5. Compute results and lanes

`claude/wip/results` (`c462d46`) holds every lane's scripts, results, logs and small checkpoints. Its
`README.md` says where each folder goes back. `claude/wip/results-states` (`76380c3`) holds the
transonic checkpoints (217 MB). The owner asked that it be deleted once those runs finish.

**Running at handoff**, all CPU, `nice` 5 to 10, started with `setsid nohup`:

| Lane | Job | Where it had got to |
|---|---|---|
| Transonic ogive10 | Mach 1.1, r = 16 | 2,200 steps |
| Transonic s12 | 5-caliber ogive, Mach 1.1, r = 16 | 800 steps |
| Transonic ogive3 | case A, Mach 1.2 | r = 8 running |
| Haack lane6 | 5 calibers, Mach 3, nj 80 | 4,000 iterations |
| Haack lanex | 5 calibers, Mach 2, nj 80 | finished at 10:31 UTC (results branch cde6af4) |
| Subtip lane A | G's families | G at nj 80 |
| Subtip lane B | A's default family | nj 160, from 13,600 iterations |

Restart commands are in each status file and in `coordinator/RESTART.md`. The scripts hard-code this
container's paths (`/home/user/bowshock/.claude/worktrees/...`, the scratchpad), so edit their `cd` or
`S=` line first. Finished jobs skip quickly, provided their results and checkpoints are restored.

**Load:** seven lanes on 4 cores pushed the load to about 27 to 30. CPU-heavy unit tests then time out
locally (characteristics, euler2d and others). They pass alone and in CI. Run only 3 or 4 lanes while
agents test, or pause lanes before a full local suite.

## 6. How this session worked, and what to keep or change

- **Agents.** One per workstream in its own worktree (`isolation: "worktree"`). Reviewers and blind
  readers are fresh agents. Brief reviewers with the code, not with your conclusions. Readers never see
  the first reading. The coordinator pairs readings with a script and reviews diffs before merging.
- **Usage limits.** With 7 or 8 agents at once, the session limit hit about every 4 to 5 hours (resets
  seen at 03:40, 09:20, 14:50, 22:40 and 08:40 UTC). When it hits, every agent stops mid-step, and each
  must be resumed with SendMessage once the limit resets. Keep about 4 or 5 agents running at once.
- **Container restarts.** About every 4 to 5 hours (seen at 04:24, 09:50, about 12:35, 17:46, 03:52 and
  08:42 UTC). Every background process dies. Restart lanes from checkpoints, tell agents their processes
  are gone, and push anything that matters, because the container is ephemeral.
- **Watcher.** `coordinator/watch.py`, run with Bash `run_in_background`, re-invokes the session when a
  marker fires. A marker is a regex on a file, or a process group that has died. Re-arm it after every
  fire, and update the process-group markers after a restart. `send_later` check-ins (the
  claude-code-remote tools) are the fallback.
- **GPU tests locally:** set `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`. CI
  installs its own browser. The GPU job takes 33 minutes.
- **Mistakes not to repeat:**
  - merging with the GPU job unrun (the W1 merge went red);
  - merging an old branch wholesale (it pulled an unverified duplicate commit);
  - a bare `cd` into a worktree (the cwd moved three times);
  - pushing before local checks finished.

## 7. Open decisions for the owner

Ask these; each has the coordinator's recommendation.

1. **BRL 934's consequence for the Basic Finner's claim.** 0014 10.7 (b) says: on a pass, "the class is
   validated over what that range supports". Inside the class (Mach 1.799 to 2.15, Reynolds number
   1.19e7 to 2.0e7), range A supports only Mach 1.80 to 1.83, at Reynolds numbers 0.80e7 to 1.20e7
   (below the class's floor), with sharp fin edges. The options:
   - (a) restore "validated" for Mach 1.799 to 1.83 only, saying it was tested at Reynolds numbers at
     and below the class floor;
   - (b) keep the whole claim suspended, because the Reynolds numbers lie outside the class;
   - (c) restore the whole class. The coordinator rejects (c) as reading more into the test than it
     covers.

   Recommendation: (a), worded exactly. Then merge the run, update the "Not run" texts, and state in
   the README that W1 has no hold-out pass.
2. **The default 3D look.** Glowing shells with streamlines, the shock and a cutaway, no slice. Still
   unanswered.
3. **Mach 1.0 transonic.** The transonic agent proposes a four-domain S2/S3 rule, which would serve
   Mach 1.0 with a band of about 2% on the cone and 14% on the 5-caliber ogive. The advisor proposes
   the pre-registered next step instead (family at 224.2 radii, neighbours 100.6 and 408.7, limit kept
   at 0.6). Both agree not to build a Guderley sonic far field now. Recommendation: the advisor's
   step, then the S2/S3 rule for the sign-reversal cases, written into 0013 before any code.
4. **GPU relaxation.** Accept 2 sweeps on the evidence, or build a relaxation that contracts by
   construction. Recommendation: 2 sweeps now, pinned by the G3 test, and measure r = 4 and 8.
5. **W7, rounded leading edges below normal Mach 1.0.** The options are to serve them "bounded, not
   measured" (a linearised lower bound with a margin of 2), or to refuse them until NASA TM X-653 is
   named in 10.7 and read. The advisor recommends refusing: the gain is 6.9% of those edges. Also to
   decide: the cap at normal Mach 0.8 or 0.75, and the free-stream floor of Mach 1.06.
   Recommendation: refuse until TM X-653 is read, and keep the rest of the rewrite.
6. **Surface-subsonic tips.** Adopt the advisor's four requirements before admitting any:
   - the transonic cross-check;
   - the start-plane sensitivities, plus a perturbed imposed state;
   - an admission domain bounded by the measured cases;
   - widening the band to the families' difference if it exceeds half the floor.

   Recommendation: adopt all four.
7. **Transparency in the README.** The advisor recommends saying on the first screen that readers and
   reviewers are AI agents with enforced blindness, that no human aerodynamicist has reviewed the
   methods, and inviting exactly that review. Recommendation: yes.
8. **Refused totals.** The advisor recommends that a refused total still show every served component
   with its band, plus a one-sided floor labelled "a floor, not an estimate". Today 0011 section 2
   shows only the reasons. Recommendation: yes, through an independent review.
9. **Haack.** Quote only re-measured GPU agreement. Check one Von Karman case at nj 160 before serving
   the page's four-grid run.
10. **NSWCDD/TR-92/509 files** (4.8): commit them, or have them re-typed by a fresh reader?
11. **Old task 25:** rewrite old commits to the owner's authorship. This needs explicit confirmation
    and a force-push.
12. **Branch cleanup:** delete the `claude/wip/*` branches once merged, and `results-states` once its
    runs finish.

## 8. Queue for the new session, in order

1. **Main's public face** (the advisor's first item).
   - The README is stale: it says "at most 0.2% in any Mach band", against 1.9%, 2.5% and 5.2% in
     `impact.out`, and calls W1 unbuilt. Generate the coverage sentence from `impact.out`. Fix the
     page's static text as well; its rounded-edge paragraph is out of date since 0016.
   - Label every coverage percentage as measured on an assumed population (0014 section 9).
   - Do this after decision 7.1, so the Basic Finner's text is written once.
2. **BRL 934:** apply decision 7.1. Check its committers, merge `claude/wip/brl934-range-a`, update 0008
   section 6.4, 0010 section 11.7 and 0014 (b), and run the GPU job before merging.
3. **Transonic:** S2/S3 (after decision 7.3), S5, S6, S7, the minor items and the before-and-after
   table. Then a fresh re-review, then merge. Case A's value goes to the subtip comparison when r = 8
   lands.
4. **Haack:** the remaining checks, then an independent review, then merge with the current outline.
   Widen it after the corner runs.
5. **Interface:** the GPU page tests on `eceab88`, the 3D third-page failure, the usability numbers.
   Then an independent review, then merge. Then the README hero from the 3D view. After the transonic
   merge, wire its path, label its points, give them their own zoom, and sample Mach 1.0 to 1.2
   densely: the cone's drag peak lies between Mach 1.01 and 1.05.
6. **W7:**
   - Re-review 0019 3.2 and 3.3, with decision 7.5 applied.
   - Then the terms in the advisor's order: F4 first, then F1 (before F2), then F3, F5, and F2 last.
     F1 needs RM L55H09's body checked first; also name RM L9I30 and RM L51F29 in 10.7 before opening
     them.
   - Pair round 10's readings as W7's first readings land.
   - Fig. 30 against table 3: keep both (the envelope). Use R&M 3348 as band-setting up to Mach 1.00
     and as a flagged check at 1.11 to 1.20.
   - Re-run `docs/research/refusals/` before and after each term.
7. **Subtip:** commit G's record (cherry-pick) when its lanes finish. Compare case A with the transonic
   value, then apply decision 7.6.
8. **Blind readings:** R&M 3427 figs. 15 and 16 (round 10's queue); fig. 18 needs a blind reader.
   Amendment (m)'s hole 4 and fig. 39 are named and await first readings.
9. **Coverage plan** (the advisor's section 1):
   - Merge W5 (Haack). Then W6, tangent caps on the C grid, after a one-day grid probe. Then F4 and
     F1, the fins below Mach 1.5. Then W11 and W9. F2 comes last.
   - Do not extend below Mach 1.0 before launch: no hold-out is registered there. Say in one sentence
     that subsonic users should use OpenRocket.
   - BRL 934 range B's row in 10.5 names W2 and W1 only, while amendment (f) made F1 a gate. Amend it
     before that run.
10. **Before launch:**
    - Run three real GPUs and show a device record in Details.
    - Show three significant figures in the headline when the band exceeds 1%.
    - Put "axisymmetric solution, revolved; fins not in the airflow" on the 3D legend.
    - The nose band is numerical only: the inviscid model is 8 to 9% off one ogive's tunnel pressures
      (README lines 236 to 247). Name TN 3716 fig. 3 and RM A53E01 in 10.7 and carry a model-form
      allowance, or label the band "numerical".
    - Publish OpenRocket's Basic Finner result beside the DREV points, "as reported, not validated".
    - Merge W7's 10.7 (j) to (m) to main before any of those figures sets a band.

## 9. Where things are

**Design records** (`docs/design/`):

| Record | Subject |
|---|---|
| 0001, 0002 | architecture |
| 0003 | 2D solver |
| 0004 | grids |
| 0005 | solution verification |
| 0006 | shock fitting and nose families |
| 0007 | skin friction |
| 0008 | total drag, and the reading rule |
| 0009 | fin wave drag |
| 0010 | base drag and the total |
| 0011 | the total on the page |
| 0012 | interface |
| 0013 | transonic; main's copy is older than the branch's |
| 0014 | refusals, the pre-registration (section 10) and its amendments (10.7) |
| 0015 | fins at the base (W1) |
| 0016 | fin edges of flat plates |
| 0017 | rocketeer interface (interface branch) |
| 0018 | OpenRocket import (interface branch) |
| 0019 | fins near Mach 1 (w7-fins) |
| 0020 | BRL 934 range A (brl934-range-a) |

**Data and audits:**
- `docs/research/total-drag/`: data transcriptions, scripts, and the reading audits by round. Rounds 2
  to 9 are on main; round 10 is on its branch.
- `docs/research/refusals/`: the coverage audit (`out/impact.out`).

**Sources:** the PDFs were downloaded into this container's scratchpad and were not pushed. Each
record cites its source with an NTRS or DTIC number, a URL and the SHA-256 of the file used.

**Advice:** `advice/fable-2026-10-22.md` on this branch.
