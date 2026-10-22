# Lane restart commands (after a container restart)
- transonic ogive10 (nice 5): cd /home/user/bowshock/.claude/worktrees/agent-a9685e852221ade15 && setsid nohup nice -n 5 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-ogive10.txt > /dev/null 2>&1 < /dev/null &
- transonic queue s11 (nice 10): same worktree, run-queue.sh tests/tmp-transonic/queue-s11.txt (ask agent a9685e852221ade15 if unsure)
- haack lane6/lanex (nice 10): agent adab6109fa31ec249 knows; worktree agent-abd83b26cc3489c03, tests/tmp-haack/lane6.sh, tests/tmp-haackmoc/lanex.sh
- subtip lanes A/B (nice 10): agent ab5d432a73ee9aead restarts them (lane A/B scripts in scratchpad/subtip); last PGIDs 3514 and 3594
- transonic queue s12 (nice 10): cd /home/user/bowshock/.claude/worktrees/agent-a9685e852221ade15 && setsid nohup nice -n 10 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-s12.txt > /dev/null 2>&1 < /dev/null &
- transonic queue-nest (nice 10): cd /home/user/bowshock/.claude/worktrees/agent-a9685e852221ade15 && setsid nohup nice -n 10 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-nest.txt > /dev/null 2>&1 < /dev/null &

# Coordinator notes for wake-ups (2026-10-22)
- subtip agent ab5d432a73ee9aead finished its turn; resume it when subtip:F-dense or subtip:P-dense fires. Tell it then: the two-family agreement is the gate for F and G, but 0006 and the README must say plainly that the captured cross-check was unresolved on F and G (changes not shrinking; F's finest captured 1.5e-3 below and rising; a first-order extrapolation of its last two grids still 1.05e-4 short), so the fitted result rests on the fitted method's own verification; no wider claim than measured.
- W7 re-letters its 0014 10.7 entries to (j), (k), (l); W1 keeps (g), (h), (i).
- W1 reviewer passed 0604b9b (no blockers); W1 agent a8f6ee5599fb50bd7 fixing 5 slips (threshold 0.8 -> 0.9 chords, forward-swept TE refused). Merge after quick diff check.
- BRL 934 range A run prerequisites (0014 10.6 item 5): Graph I second reading done (round 7, branch worktree-agent-a5296b84a65b1ae85, not on main); Table II yaw + Table III drag blind reading given to fresh reader a2162bd67ed8cc1fa (round 9). Then pair readings, land them on main, then a neutral agent runs range A once as registered.
- 0019 review (a88c4f425a1f55a91): 3.2 rejected (lower bound on TE, normal plane, refuse near M 1, C_L margin x2; upper bound cap M_n 0.8 until CR-149372 fig. 8a read twice; Re allowance; Barrowman); 3.3 accept with 7 changes (fig. 32 measured in gap). W7 rewriting; re-review by same reviewer. Blind reader a5296b84a65b1ae85 queue: R&M 3348 figs 30a/30b, 31b, 32, CR-149372 8a, then R&M 3427 13, 9, 10, 15, 16.
- 04:50 UTC: main bfe997e = audit rounds 6 to 9 merged (additions only; BRL 934 tables paired 0 differences). BRL 934 range A prerequisites complete except W1 merge.
- 04:50 UTC: main bfe997e = audit rounds 6 to 9 merged (additions only; BRL 934 tables paired 0 differences). BRL 934 range A prerequisites complete except W1 merge.
- Round 10 (branch round10-w7-figures): R&M 3348 figs 30a/b (620c0a6), 31b and 32 (c8bb424) read blind. At pairing time (after W7's first readings) raise: reader found fig. 30's points at M_0 1.11 to 1.20 sit 0.003 to 0.010 below table 3 (0.017/0.022 at phi 45/60, M 1.20); source inconsistency, band must cover it or say which is primary. Do NOT tell W7 before its own fig. 30 reading.
- Transonic review: a5ebaa772b3cd0964 on aed95b0.
- 05:00 UTC: main b86c308 = W1 merged (pushed). BRL 934 range A neutral run agent a4fc9ae3928201a48 (0014 10.7 (n)); W7 letters (j)-(m), ask coordinator from (o).
- Tell Haack and interface agents to merge main b86c308 (W1) before their review.
- subtip lanes restart (coordinator can do it): setsid nohup nice -n 10 bash scratchpad/subtip/lanef.sh laneA family:F:dense:1.5:4 family:G:default:1:8 family:G:dense:1.5:4 ; and lanef.sh laneB-family family:P:dense:1.5:4 family:A:default:1:8
- 08:43 UTC container restart #N: lanes restarted, PGIDs 256 257 260 264 265 267; nest queue finished at 05:59 (not restarted).
- transonic queue ogive3 (case A cross-check, nice 10): cd agent-a9685e852221ade15 && setsid nohup nice -n 10 sh tests/tmp-transonic/run-queue.sh tests/tmp-transonic/queue-ogive3.txt (PGID 2498 at 09:10)
- NOTE: transonic agent was refused permission to kill lane 257; do not kill it on its behalf.
- 09:15 UTC: main 7d8221c = F record cherry-picked from subtip-tangent 61457ed (branch carries duplicate old commits incl. unverified 255b6ff; never merge subtip-tangent wholesale, cherry-pick its new commits). Before any merge: git log --format='%h %ce' main..BRANCH | grep -v noreply@anthropic.com
