import json,math,struct,sys
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
probe={d['id']:d for d in map(json.loads,open(f'{S}/probe.jsonl'))}
cid=sys.argv[1] if len(sys.argv)>1 else 'C'
start=float(sys.argv[2]) if len(sys.argv)>2 else 1e-3
anch=sys.argv[3] if len(sys.argv)>3 else None
F={}
for l in open(f'{S}/fits.jsonl'):
    d=json.loads(l)
    if d['id']==cid and d['start']==start and (str(d.get('anchor')) if d.get('anchor') is not None else None)==anch: F[d['nj']]=d
P=probe[cid]; L=P['length']; cpTM=P['tm']['cp']
m=P['mach']; u=struct.unpack('f',struct.pack('f',m*math.sqrt(1.4)))[0]; qd=0.5*u*u
def interp(d,xl):
    xs=[w['x']/L for w in d['wall']]; cps=[(w['p']-1)/qd for w in d['wall']]
    if xl<=xs[0]: return cps[0]
    for k in range(len(xs)-1):
        if xs[k]<=xl<=xs[k+1]:
            t=(xl-xs[k])/(xs[k+1]-xs[k]); return cps[k]+t*(cps[k+1]-cps[k])
    return float('nan')
stations=[0.002,0.003,0.005,0.01,0.02,0.05,0.1,0.15,0.2,0.3,0.4,0.5,0.6,0.7,0.8,0.9]
njs=sorted(F)
print(f'{cid} x0={start} anchor={anch} Cp_TM={cpTM:.6f}; (Cp-CpTM)/CpTM at x/L, nj =',njs)
for s in stations:
    vals=[(interp(F[n],s)-cpTM)/cpTM for n in njs]
    line=' '.join(f'{v:+.3e}' for v in vals)
    extra=''
    if len(vals)>=3 and (vals[1]-vals[2])!=0:
        r=(vals[0]-vals[1])/(vals[1]-vals[2]); extra=f' ratio={r:.2f}'
        g=3; ext=vals[2]+(vals[2]-vals[1])/g; extra+=f' ext2={ext:+.2e}'
    elif len(vals)==2:
        extra=f' ext2={vals[1]+(vals[1]-vals[0])/3:+.2e}'
    print(f'  x/L={s:<6} {line}{extra}')
# first face
for n in njs:
    w=F[n]['wall'][0]; print(f'  nj={n} first face x/L={w["x"]/L:.5f} dev={((w["p"]-1)/qd-cpTM)/cpTM:+.3e}')
