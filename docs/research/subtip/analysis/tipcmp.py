import json,math,struct,sys
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
probe={d['id']:d for d in map(json.loads,open(f'{S}/probe.jsonl'))}
cid=sys.argv[1]; nj=int(sys.argv[2])
F={}
for l in open(f'{S}/fits.jsonl'):
    d=json.loads(l)
    if d['id']==cid and d['nj']==nj and d.get('anchor') is None: F[d['start']]=d
P=probe[cid]; L=P['length']; cpTM=P['tm']['cp']; m=P['mach']; u=struct.unpack('f',struct.pack('f',m*math.sqrt(1.4)))[0]; qd=0.5*u*u
def interp(d,xl):
    xs=[w['x']/L for w in d['wall']]; cps=[(w['p']-1)/qd for w in d['wall']]
    if xl<xs[0]: return float('nan')
    for k in range(len(xs)-1):
        if xs[k]<=xl<=xs[k+1]:
            t=(xl-xs[k])/(xs[k+1]-xs[k]); return cps[k]+t*(cps[k+1]-cps[k])
    return float('nan')
starts=sorted(F)
print(cid,'nj',nj,'(Cp-CpTM)/CpTM; columns: x0 =',starts)
for s in [1.5e-4,2e-4,3e-4,5e-4,1e-3,1.5e-3,2e-3,3e-3,5e-3,1e-2,2e-2,5e-2,0.1,0.3,0.5,0.7,0.9]:
    print(f'  x/L={s:<7}',' '.join(f'{(interp(F[x],s)-cpTM)/cpTM:+.3e}' for x in starts))
