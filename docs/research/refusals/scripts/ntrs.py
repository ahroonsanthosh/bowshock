"""Search the NASA Technical Reports Server: id | title | report numbers | date | authors."""
import json
import subprocess
import sys
import urllib.parse

q = sys.argv[1]
n = sys.argv[2] if len(sys.argv) > 2 else '10'
url = 'https://ntrs.nasa.gov/api/citations/search?' + urllib.parse.urlencode({'q': q, 'page.size': n})
raw = subprocess.run(['curl', '-sS', '--max-time', '60', url], capture_output=True).stdout
d = json.loads(raw)
for r in d.get('results', []):
    nums = r.get('reportNumber') or []
    if isinstance(nums, str):
        nums = [nums]
    pubs = r.get('publications') or []
    date = pubs[0].get('publicationDate', '') if pubs else ''
    authors = ', '.join(
        a.get('meta', {}).get('author', {}).get('name', '') for a in (r.get('authorAffiliations') or [])[:3]
    )
    print(r.get('id'), '|', (r.get('title') or '')[:160], '|', ';'.join(nums), '|', str(date)[:10], '|', authors)
