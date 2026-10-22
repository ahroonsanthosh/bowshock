import json,math
S='/tmp/claude-0/-home-user-bowshock/bdd8e536-5be2-56f7-a977-5e8c0e15cd6b/scratchpad/subtip'
L={}
for l in open(f'{S}/family3.jsonl'):
    d=json.loads(l)
    if d['kind']=='level': L[(d['id'],d['family'],d['refinement'])]=d['drag']
def ext(f1,f2,f3):
    r=(f1-f2)/(f2-f3); p=math.log2(r) if r>0 else float('nan')
    g=2**min(p,2)-1
    return p, f3+(f3-f2)/g, 1.25*abs(f2-f3)/g
for cid in 'EAP':
    d=[L.get((cid,'default',r)) for r in (1,2,4,8)]
    s=[L.get((cid,'dense',r)) for r in (1,2,4,8)]
    out=[cid]
    if None not in d[1:4]:
        p,e,b=ext(*d[1:4]); out.append(f'default 40-80-160: p={p:.3f} ext={e:.9f} band={b:.2e}')
        if None not in d[0:3]:
            p0,_,_=ext(*d[0:3]); out.append(f'(20-40-80 p={p0:.3f}, orders differ by {abs(p-p0):.3f})')
    if None not in s[0:3]:
        p2,e2,b2=ext(*s[0:3]); out.append(f'dense 20-40-80: p={p2:.3f} ext={e2:.9f} band={b2:.2e}')
        if None not in d[1:4]: out.append(f'difference {(e2-e)/e:+.2e} relative ({e2-e:+.3e} abs); within 7e-5: {abs(e2-e)/abs(e)<=7e-5}')
    print(' | '.join(out))
