import sys, json
import numpy as np
g = json.load(open(sys.argv[1])); f = json.load(open(sys.argv[2]))
Hl = sorted([(float(k),v) for k,v in g['h'].items()])          # (-0.32,..), y=a+bx
Vl = sorted([(float(k),v) for k,v in g['v'].items()])          # (0.0..1.0), x=a+by
def cell(px, py):
    # horizontal offsets to each vertical gridline at this y
    e = np.array([px - (a + b*py) for _,(b,a) in Vl]); vv = np.array([k for k,_ in Vl])
    i = np.searchsorted(-e, 0) - 1          # last line with e>=0
    i = min(max(i,0), len(vv)-2)
    dh = vv[i] + (vv[i+1]-vv[i]) * e[i]/(e[i]-e[i+1])
    fy = np.array([py - (a + b*px) for _,(b,a) in Hl]); hv = np.array([k for k,_ in Hl])  # increasing value -0.32..0 ; y increases
    j = np.searchsorted(-fy, 0) - 1
    j = min(max(j,0), len(hv)-2)
    pb = hv[j] + (hv[j+1]-hv[j]) * fy[j]/(fy[j]-fy[j+1])
    return dh, pb, (vv[i], vv[i+1]), (hv[j], hv[j+1]), e[i]-e[i+1], fy[j]-fy[j+1]
pts = np.load(sys.argv[3])
A = np.c_[pts[:,2], pts[:,3], np.ones(len(pts))]
cx = np.linalg.lstsq(A, pts[:,0], rcond=None)[0]; cy = np.linalg.lstsq(A, pts[:,1], rcond=None)[0]
out = {}
print("name   px       py        d/h(cell)  p_b(cell)  | d/h(aff)  p_b(aff) | cell px-width px-height")
for n,info in f.items():
    dh, pb, ci, cj, wpx, hpx = cell(info['px'], info['py'])
    ad = cx @ [info['px'], info['py'], 1]; ap = cy @ [info['px'], info['py'], 1]
    extra = {}
    if info['kind']=='t':
        _, pbb, *_ = cell(info['px'], info['py_bboxmid']); extra['p_b_bboxmid'] = pbb
    out[n] = dict(info, d_over_h=float(dh), p_b=float(pb), d_over_h_affine=float(ad), p_b_affine=float(ap), cell_w_px=float(wpx), cell_h_px=float(hpx), **{k:float(v) for k,v in extra.items()})
    print(f"{n:4s} {info['px']:8.2f} {info['py']:8.2f}   {dh:7.4f}   {pb:8.4f}   | {ad:7.4f}  {ap:8.4f} | {wpx:6.1f} {hpx:6.1f}" + (f"  bboxmid p_b={extra['p_b_bboxmid']:.4f}" if extra else ""))
json.dump(out, open(sys.argv[4],'w'), indent=1)
