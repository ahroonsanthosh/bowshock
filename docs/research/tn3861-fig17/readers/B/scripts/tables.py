# Print markdown tables for method.md: grid lines with fits and residuals; the readings with px on both images.
import sys, json, csv
cal = json.load(open(sys.argv[1])); det = json.load(open(sys.argv[2])); jog = json.load(open(sys.argv[3]))
o = cal['all_lines']; A = o['Mc']; B = o['CD']
print('| Axis | Line value | Labelled | Samples kept | Position (px) | at | Slope | Line rms (px) | Mean residual (value) | Mean residual (px) |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for L in cal['lines']:
    key = '%s=%g' % (L['axis'], L['value'])
    r = o['resid_mean_rms_per_line'][key][0]
    px = r / A[1] if L['axis'] == 'Mc' else -r / B[2]
    lab = 'yes' if (L['axis'] == 'Mc' and L['value'] in (0, 1, 2, 3, 4, 5, 6, 7, 8)) or (L['axis'] == 'CD' and L['value'] in (0, 0.5, 1.0, 1.5, 2.0, 2.5)) else 'no'
    if L['axis'] == 'Mc' and L['value'] == 9: lab = 'no (frame)'
    if L['axis'] == 'CD' and L['value'] == 2.75: lab = 'no (frame)'
    print('| %s | %g | %s | %d of %d | %.2f | %s | %+.5f | %.2f | %+.4f | %+.2f |' % ('x (Mc)' if L['axis'] == 'Mc' else 'y (CD)', L['value'], lab, L['n_kept'], L['n_sampled'], L['pos_at_ref'], L['ref'], L['slope'], L['rms_px'], r, px))
print()
for n in ('all_lines', 'labelled_lines_only', 'interior_lines_no_frame'):
    c = cal[n]
    print('- %s: Mc = %.6f %+.8f u %+.8f v; CD = %.6f %+.8f u %+.8f v; rms of the line mean residuals %.4f (Mc), %.4f (CD)' % (n, *c['Mc'], *c['CD'], c['Mc_rms_over_lines'], c['CD_rms_over_lines']))
print()
print('| Symbol | Corrected image (u, v) px | Page image px | Affine Mc | Local Mc | Affine CD | Local CD | x_err | value_err |')
print('| --- | --- | --- | --- | --- | --- | --- | --- | --- |')
for p in det:
    print('| %d | (%.2f, %.2f) | (%.1f, %.1f) | %.4f | %.4f | %.4f | %.4f | %.3f | %.3f |' % (p['id'], p['u_dejog'], p['v_dejog'], p['u_page'], p['v_page'], p['mc'], p['mc_local'], p['cd'], p['cd_local'], p['x_err'], p['value_err']))
print()
print('x jog rows', jog['x_jogs']); print('x segments', [[a, b, round(c0, 4), round(c1, 6)] for a, b, c0, c1, n in jog['x_segments']])
print('y jog cols', jog['y_jogs']); print('y segments', [[a, b, round(c0, 4), round(c1, 6)] for a, b, c0, c1, n in jog['y_segments']])
