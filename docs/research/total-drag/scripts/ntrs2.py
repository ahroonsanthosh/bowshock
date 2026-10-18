import sys, json, urllib.parse, subprocess
q = sys.argv[1]
url = 'https://ntrs.nasa.gov/api/citations/search?q=%s&page.size=%s' % (urllib.parse.quote(q), sys.argv[2] if len(sys.argv) > 2 else '10')
out = subprocess.run(['curl', '-sS', '--max-time', '90', '--retry', '3', '--retry-all-errors', url], capture_output=True, text=True).stdout
try:
    d = json.loads(out)
except Exception as e:
    print('ERR', e, out[:200]); sys.exit()
print('total', d.get('stats', {}).get('total'))
for r in d.get('results', []):
    pubs = r.get('publications') or [{}]
    print(r.get('id'), (r.get('title') or '')[:130], (pubs[0].get('publicationDate') or '')[:4])
