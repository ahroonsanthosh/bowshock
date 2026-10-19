"""band_sum.py with the fins-on-base band of 0010 section 1.3 (largest relative half-width 12.2%, at M 3.0; the
rows as tabulated there), in place of love_fig35_factor.csv's 10.9%. Same illustrative 0002 scoping shares
(friction 50%, base 30%, fins 15%, nose 5%; arithmetic, not a measurement), same other bands. Fin friction sits in
the fins' own drag (B4's band) only; the friction share is the body's."""
rows = [(1.80, 1.236, 1.537), (2.00, 1.140, 1.387), (2.20, 1.101, 1.378), (2.40, 1.120, 1.371), (2.50, 1.127, 1.411),
        (2.60, 1.133, 1.425), (2.80, 1.144, 1.448), (2.90, 1.148, 1.457), (2.97, 1.146, 1.463), (3.00, 1.147, 1.465)]
hw = max((h - l) / (h + l) for _, l, h in rows)
print('fins-on-base relative half-width (largest over the 0010 rows): %.3f' % hw)
shares = {'friction (body)': 0.50, 'base': 0.30, 'fins-on-base': 0.30, 'fins own': 0.15, 'nose': 0.05}
bands = {'friction (body)': (0.88, 1.19), 'base': (0.824, 1.078), 'fins-on-base': (1 - hw, 1 + hw),
         'fins own': (1 / 0.99, 1 / 0.63), 'nose': (0.999, 1.001)}
lo = hi = 0.0
for k in shares:
    a, b = shares[k] * (bands[k][0] - 1), shares[k] * (bands[k][1] - 1)
    lo += a
    hi += b
    print('%-16s share %.2f  band %.3f to %.3f  contributes %+.1f%% to %+.1f%%' % (k, shares[k], bands[k][0], bands[k][1], 100 * a, 100 * b))
print('total, measured over modelled - 1, linear sum: %+.1f%% to %+.1f%%' % (100 * lo, 100 * hi))
print('(without the fins-on-base term: %+.1f%% to %+.1f%%)' % (100 * (lo - shares['fins-on-base'] * (bands['fins-on-base'][0] - 1)),
      100 * (hi - shares['fins-on-base'] * (bands['fins-on-base'][1] - 1))))
