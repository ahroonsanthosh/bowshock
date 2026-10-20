"""Expected B5 gate tolerance on the Basic Finner per Mach cluster, as measured over modelled minus 1, linear sum
(a minimum: the fins' own drag and the blunt fin trailing-edge base term are not included because their shares
need the B4 and B3 computations). Inputs (saved outputs):
  shares of CX0: friction 19% to 22%, body base term 29% to 37% (bf_gate_width_output.txt, per cluster below);
  bands: friction 0.88 to 1.19 (0007); base curve 0.82 to 1.08 (draft 3.3); fins-on-base half-band of the body base
  term as % of CX0 (bf_gate_width_output.txt); transition input -6.4% to -0.9% of CX0 (laminar run to Re_T 5e5 to
  3e6 against the fully turbulent default; data then fall below the model); shot spread per cluster
  (basic_finner_stats_output.txt)."""
clusters = {  # M range: (friction share, base share, fins-on-base half-band %, transition worst %, spread lo, hi)
    '1.80-1.85': (0.201, 0.37, 4.0, -6.4, -3.3, 2.0),
    '2.35-2.41': (0.207, 0.33, 3.3, -6.0, -2.2, 3.4),
    '2.66-2.75': (0.223, 0.30, 2.4, -6.1, -7.6, 4.5),
    '2.97':      (0.223, 0.29, 2.5, -5.9, -1.2, 1.2)}
for k, (fs, bs, fob, tr, slo, shi) in clusters.items():
    lo = fs * (0.88 - 1) * 100 + bs * (0.82 - 1) * 100 - fob + tr + slo
    hi = fs * (1.19 - 1) * 100 + bs * (1.08 - 1) * 100 + fob + 0.0 + shi
    print('M %-9s: friction %+.1f/%+.1f, base %+.1f/%+.1f, fins-on-base +-%.1f, transition %+.1f/0, spread %+.1f/%+.1f  => at least %+.0f%% to %+.0f%%'
          % (k, fs * -12, fs * 19, bs * -18, bs * 8, fob, tr, slo, shi, lo, hi))
print('plus, on the high side, 0.59 times the fins own-drag share of CX0 (B4 band 1.01 to 1.59), and the fin trailing-edge base band')
