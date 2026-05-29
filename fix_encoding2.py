"""Check remaining bad characters in AdvancedAnalytics.tsx"""
f = r'c:\Vitana\Vitana Group\SMSRepoA\ui\src\components\analytics\AdvancedAnalytics.tsx'

with open(f, 'rb') as fp:
    raw = fp.read()

# Find all occurrences of C3 A2 (â) to see what follows
import re
for m in re.finditer(b'\xc3\xa2', raw):
    pos = m.start()
    ctx = raw[pos:pos+15].hex()
    txt = raw[pos:pos+15].decode('utf-8', errors='replace')
    print(f"pos {pos}: {ctx} -> {repr(txt)}")
