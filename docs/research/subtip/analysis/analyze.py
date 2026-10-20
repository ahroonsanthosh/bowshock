import json, math, sys
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
fits=[json.loads(l) for l in open(f'{S}/fits.jsonl')]
probe={d['id']:d for d in map(json.loads,open(f'{S}/probe.jsonl'))}
# keep last record per (id, refinement, start)
F={}
for d in fits:
    if d.get('anchor') is None: F[(d['id'],d['refinement'],d['start'])]=d
N={}
for d in fits:
    if d.get('anchor') is not None: N[(d['id'],d['refinement'],d['start'])]=d
ids=sorted({k[0] for k in F})
gamma=1.4
def q(m):
    import struct
    u=struct.unpack('f',struct.pack('f',m*math.sqrt(gamma)))[0]
    return 0.5*u*u
section=sys.argv[1] if len(sys.argv)>1 else 'all'

if section in ('all','x0'):
    print('== x0 sensitivity (drag; relative change vs x0=1e-3 on the same nj)')
    for i in ids:
        for r in (1,2,4,8):
            row=[(s,F[(i,r,s)]) for s in (1e-2,3e-3,1e-3,3e-4,1e-4) if (i,r,s) in F]
            if not row: continue
            base=F.get((i,r,1e-3))
            out=[]
            for s,d in row:
                rel=(d['drag']/base['drag']-1) if base else float('nan')
                out.append(f"x0={s:g}: {d['drag']:.9f} ({rel:+.2e}) ni={d['ni']} conv={d['converged']} it={d['iterations']}")
            print(i,'nj',20*r); [print('   ',o) for o in out]
    # 2-grid extrapolation per x0 at order 2
    print('== per-x0 two-grid extrapolation (nj 20,40 at order 2) and three-grid where available')
    for i in ids:
        for s in (1e-2,3e-3,1e-3,3e-4,1e-4):
            if (i,1,s) in F and (i,2,s) in F:
                f1=F[(i,1,s)]['drag']; f2=F[(i,2,s)]['drag']
                print(i, f"x0={s:g}", f"f20={f1:.9f} f40={f2:.9f} d={f2-f1:+.3e} ext2={f2+(f2-f1)/3:.9f}")

if section in ('all','grid'):
    print('== grid convergence at x0=1e-3')
    for i in ids:
        v=[F[(i,r,1e-3)]['drag'] for r in (1,2,4,8) if (i,r,1e-3) in F]
        if len(v)<3: print(i,v); continue
        for k in range(len(v)-2):
            f1,f2,f3=v[k:k+3]
            ratio=(f1-f2)/(f2-f3)
            p=math.log2(abs(ratio)) if ratio>0 else float('nan')
            pc=min(p,2) if p==p else 2
            g=2**pc-1
            ext=f3+(f3-f2)/g; band=1.25*abs(f2-f3)/g
            print(i, f"nj {20*2**k}-{20*2**(k+2)}", ' '.join(f'{x:.9f}' for x in (f1,f2,f3)), f"ratio={ratio:.3f} p={p:.3f} ext={ext:.9f} band={band:.3e} ({band/ext:.2e} rel)")

if section in ('all','hist'):
    print('== convergence history')
    for k,d in sorted(F.items()):
        h=d['history']
        def first(idx,th):
            for e in h:
                if e[idx]<th: return e[0]
            return None
        fd=d['drag']
        # drag error at the first check with speed < 1e-6
        e6=next((e for e in h if e[1]<1e-6),None)
        # non-monotone speed: count checks where speed rose by >10% after 500 its
        rises=sum(1 for a,b in zip(h,h[1:]) if a[0]>=500 and b[1]>1.1*a[1])
        rrises=sum(1 for a,b in zip(h,h[1:]) if a[0]>=500 and b[2]>1.1*a[2])
        # tail rate: decades of speed per 1000 its over last half
        n=len(h); a=h[n//2]; b=h[-1]
        rate=(math.log10(a[1])-math.log10(b[1]))/((b[0]-a[0])/1000) if b[0]>a[0] else float('nan')
        rateR=(math.log10(a[2])-math.log10(b[2]))/((b[0]-a[0])/1000) if b[0]>a[0] else float('nan')
        print(d['id'], f"nj={d['nj']} x0={d['start']:g} it={d['iterations']} conv={d['converged']}",
              f"speed<1e-3@{first(1,1e-3)} <1e-6@{first(1,1e-6)} <1e-9@{first(1,1e-9)}",
              f"res<1e-6@{first(2,1e-6)} <1e-9@{first(2,1e-9)}",
              f"rate(spd,res)={rate:.2f},{rateR:.2f} dec/kit rises(spd,res)={rises},{rrises}",
              f"dragErr@spd1e-6={(e6[3]-fd)/fd if e6 else float('nan'):+.1e}", f"t={d['elapsed']:.0f}s")

if section=='anchored':
    print('== anchored (nested-column) x0 series: columns behind 1e-2 L identical; x0=1e-2 is the unanchored run')
    for i in ids:
        for r in (1,2):
            row=[]
            for s in (1e-2,3e-3,1e-3,3e-4,1e-4):
                d=F.get((i,r,s)) if s==1e-2 else N.get((i,r,s))
                if d: row.append((s,d))
            if len(row)<2: continue
            ref=row[-1][1]['drag']
            print(i,'nj',20*r,' '.join(f"x0={s:g}:{d['drag']:.9f}({d['drag']/ref-1:+.1e},ni={d['ni']},conv={d['converged']})" for s,d in row))
