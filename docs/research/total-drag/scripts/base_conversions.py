g = 1.4
print('OpenRocket 13.05 base CD = 0.25/M (techdoc eq. 3.94) vs Love TN 3819 fig. 18 curve range (-P_B, digitised):')
love = {1.5: (0.173, 0.177), 2.0: (0.139, 0.145), 2.5: (0.116, 0.118), 3.0: (0.096, 0.101)}
for M, (lo, hi) in love.items():
    orb = 0.25 / M
    print('  M=%.1f OR=%.4f Love=%.3f..%.3f  OR/Love-1 = %+.1f%% .. %+.1f%%' % (M, orb, lo, hi, 100 * (orb / hi - 1), 100 * (orb / lo - 1)))
print('Herrin & Dutton case via Tucker (1993) slide p.900, M=2.46: base drag coefficient = -(pb/pinf - 1) * 2/(g M^2)')
M = 2.46
k = 2 / (g * M * M)
for name, r in (('data (visual mean)', 0.56), ('data range lo', 0.553), ('data range hi', 0.575), ('std k-eps (area mean, visual)', 0.39), ('ext k-eps k-corr (area mean, visual)', 0.50)):
    print('  %-38s pb/pinf=%.3f  CD_base=%.4f' % (name, r, -(r - 1) * k))
print('Love curve at M=2.46 (interpolated -P_B ~0.117..0.119 from M2.5 reading) -> pb/pinf = %.3f..%.3f' % (1 - 0.119 / k, 1 - 0.117 / k))
