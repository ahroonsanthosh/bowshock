"""Illustrative linear combination of component model-form bands for draft 0008 (arithmetic on assumed shares,
not a measurement). Bands are measured over modelled, as ratios:
  friction 0.88 to 1.19 (0007-skin-friction section 4, 23 comparisons);
  base (cylindrical afterbody, compiled curve, M 1.5 to 3) 0.824 to 1.078 (base_ratios_v3_output.txt);
  fins-on-base increment (B3, fins ending at the base): the Basic Finner factor band F_low to F_high of
       love_fig35_factor.csv about its midpoint, largest relative half-width over M 1.8 to 3.0, applied to the
       base share;
  fins' own drag (B4: linear 3D wave + turbulent VDII friction), band from the ARCAS increments with the measured
       chamber change removed, so the base effect is counted once (in B3): 1/0.99 to 1/0.63
       (arcas_fin_check_v2_output.txt; with the audit's reading of the M 2.96 chamber change the low end would be
       1.12, the band-widening rule keeps 1.01);
  nose wave drag (solved) +-1e-3.
Shares: the 0002 scoping shares friction 50%, base 30%, fins 15%, nose 5%."""
import csv
rows = [r for r in csv.DictReader(l for l in open('data/love_fig35_factor.csv') if not l.startswith('#'))]
hw = max((float(r['F_high_basic_finner']) - float(r['F_low_basic_finner'])) / (float(r['F_high_basic_finner']) + float(r['F_low_basic_finner'])) for r in rows)
shares = {'friction': 0.50, 'base': 0.30, 'fins-on-base': 0.30, 'fins own': 0.15, 'nose': 0.05}
bands = {'friction': (0.88, 1.19), 'base': (0.824, 1.078), 'fins-on-base': (1 - hw, 1 + hw),
         'fins own': (1 / 0.99, 1 / 0.63), 'nose': (0.999, 1.001)}
lo = hi = 0.0
for k in shares:
    a, b = shares[k] * (bands[k][0] - 1), shares[k] * (bands[k][1] - 1)
    lo += a; hi += b
    print('%-13s share %.2f  band %.3f to %.3f  contributes %+.1f%% to %+.1f%%' % (k, shares[k], bands[k][0], bands[k][1], 100 * a, 100 * b))
print('fins-on-base relative half-width (largest over M 1.8 to 3.0): %.3f' % hw)
print('total, measured over modelled - 1, linear sum: %+.1f%% to %+.1f%%' % (100 * lo, 100 * hi))
print('(the fins-on-base term applies only when fins end within a chord of the base; without it: %+.1f%% to %+.1f%%)'
      % (100 * (lo - shares['fins-on-base'] * (bands['fins-on-base'][0] - 1)), 100 * (hi - shares['fins-on-base'] * (bands['fins-on-base'][1] - 1))))
