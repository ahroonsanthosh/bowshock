"""A capped run's levels: stagnation numbers, face drag, and the face changes between levels (ofref)."""
import sys, os
sys.path.insert(0, "/home/user/bowshock/docs/research/w6-reference")
import w6ref, ofref
root, shape, cal, ratio, mach = sys.argv[1], sys.argv[2], float(sys.argv[3]), float(sys.argv[4]), float(sys.argv[5])
times = dict(a.split("=") for a in sys.argv[6:])  # optional Lk=time
spec = w6ref.capped_spec(shape, cal, ratio, mach)
x0 = w6ref.region_start(spec)
prev = None; ch = []
for lv in range(5):
    case = f"{root}/L{lv}"
    if not os.path.isdir(case):
        break
    nose, x, r, marks = w6ref.grid(spec, lv)
    ni, nj = x.shape[0] - 1, x.shape[1] - 1
    ts = [int(t) for t in os.listdir(case) if t.isdigit() and t != "0"]
    if not ts:
        break
    t = int(times.get(f"L{lv}", max(ts)))
    st = ofref.stagnation(f"{case}/{t}", ni, nj, mach)
    ax = st["axisTotalPressure"]
    w = ofref.wall_faces(f"{case}/{t}", x, r, marks, mach)
    s = f"L{lv} ({ni}x{nj}, it {t}) wall cell {st['cpWallFirstCell']/st['pitotCp']-1:+.3%} axis p0 near wall {ax[0]-1:+.3%} mid {ax[len(ax)//2]-1:+.3%} drag {ofref.faces_drag(w):.8f}"
    if prev is not None:
        c = ofref.faces_changes(prev, w, spec["L"], x0)
        ch.append(c)
        s += f" | vertex {c['vertex']:.3e} regions {c['regions']:.3e} signed {c['signed']:+.3e}"
    prev = w
    print(s, flush=True)
for k in range(1, len(ch)):
    print(f"ratios levels {k-1}-{k}-{k+1}: vertex {ch[k]['vertex']/ch[k-1]['vertex']:.3f} regions {ch[k]['regions']/ch[k-1]['regions']:.3f}")
