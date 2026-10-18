"""Illustrative linear combination of component model-form bands for draft 0008 (arithmetic on assumed shares,
not a measurement). Bands are data over model, as ratios:
  friction 0.88 to 1.19 (0007-skin-friction section 4, 23 comparisons);
  base (cylindrical afterbody, no fins near the base, M 1.5 to 3) 0.824 to 1.078 (base_ratios_v3_output.txt:
       tunnel points 0.856 to 1.078, Herrin and Dutton 0.824 to 0.885);
  fins, own drag only (linear 3D wave + turbulent VDII friction) against ARCAS increments 1/0.849 to 1/0.492
       (arcas_fin_check_v2_output.txt); with the measured chamber change added to the model 1/0.99 to 1/0.63;
  nose wave drag (solved) +-1e-3 (0005, 0006 bands are of order 1e-4; 1e-3 taken as a round bound).
Shares: the 0002 scoping shares friction 50%, base 30%, fins 15%, nose 5%."""
shares = {'friction': 0.50, 'base': 0.30, 'fins': 0.15, 'nose': 0.05}
bands = {'friction': (0.88, 1.19), 'base': (0.824, 1.078), 'nose': (0.999, 1.001)}
for label, fins in (('fins, own drag only', (1 / 0.849, 1 / 0.492)), ('fins, own drag plus measured chamber change', (1 / 0.99, 1 / 0.63))):
    b = dict(bands, fins=fins)
    lo = sum(shares[k] * (b[k][0] - 1) for k in shares)
    hi = sum(shares[k] * (b[k][1] - 1) for k in shares)
    print('%s: fin band %.2f to %.2f; total data/model - 1: %+.1f%% to %+.1f%% (linear sum)' % (label, fins[0], fins[1], 100 * lo, 100 * hi))
    for k in shares:
        print('   %-8s share %.2f  contributes %+.1f%% to %+.1f%%' % (k, shares[k], 100 * shares[k] * (b[k][0] - 1), 100 * shares[k] * (b[k][1] - 1)))
