#!/bin/sh
# usage: ntrs.sh "query words"
q=$(python3 -I -c "import urllib.parse,sys; print(urllib.parse.quote(sys.argv[1]))" "$1")
curl -sS --retry 4 --retry-all-errors "https://ntrs.nasa.gov/api/citations/search?q=$q&page.size=${2:-8}" | python3 -I -c "
import sys,json
try:
  d=json.load(sys.stdin)
except Exception as e:
  print('ERR',e); sys.exit()
for r in d.get('results',[]): print(r.get('id'), (r.get('title') or '')[:140], ((r.get('publications') or [{}])[0].get('publicationDate') or '')[:4])"
