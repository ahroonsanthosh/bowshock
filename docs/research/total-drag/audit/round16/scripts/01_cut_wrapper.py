# Cut the NTRS wrapper at the first %PDF- and report hashes and offset.
import sys, hashlib
src, dst = sys.argv[1], sys.argv[2]
data = open(src, 'rb').read()
off = data.find(b'%PDF-')
print('download sha256', hashlib.sha256(data).hexdigest(), 'bytes', len(data))
print('first %PDF- at byte offset', off)
pdf = data[off:]
open(dst, 'wb').write(pdf)
print('pdf sha256', hashlib.sha256(pdf).hexdigest(), 'bytes', len(pdf))
