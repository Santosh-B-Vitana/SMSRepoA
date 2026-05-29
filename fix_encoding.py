"""Fix double-encoded UTF-8 characters in AdvancedAnalytics.tsx"""
import sys

f = r'c:\Vitana\Vitana Group\SMSRepoA\ui\src\components\analytics\AdvancedAnalytics.tsx'

with open(f, 'rb') as fp:
    raw = fp.read()

# â‚¹ = double-encoded ₹ (U+20B9)
# Raw bytes: C3 A2 E2 80 9A C2 B9 -> should be E2 82 B9
bad_rupee = b'\xc3\xa2\xe2\x80\x9a\xc2\xb9'
good_rupee = b'\xe2\x82\xb9'

print(f"Bad rupee occurrences: {raw.count(bad_rupee)}")
fixed = raw.replace(bad_rupee, good_rupee)
print(f"Good rupee after fix: {fixed.count(good_rupee)}")

# â€" = double-encoded — (em dash U+2014)  
# â = C3 A2, € = E2 82 AC, " = ...
# Let's just find what â€" looks like in raw bytes
# â (U+00E2) = C3 A2 in UTF-8
# € (U+20AC) = E2 82 AC in UTF-8  
# " (U+201D) = E2 80 9D in UTF-8
# But â€" might be â + € + " where " is right double quotation mark
# Actually: â€" might be the ASCII dash '-' which is just 0x2D
# Or the em dash U+2014 whose UTF-8 is E2 80 94
# Double encoded: C3 A2 E2 80 AC E2 80 94... no
# Let's look at actual bytes for â€" in text
# In the text, it shows as 'â€"'  
# â=C3A2, €=E282AC, "=E2809C  <- but that's left double quote
# OR: â + zero-width + something
# Let's just decode the file and look for the pattern
text = raw.decode('utf-8')
idx = text.find('\u00e2\u20ac\u201c')
print(f"Pattern left-dquote at: {idx}")
idx2 = text.find('\u00e2\u20ac\u201d')
print(f"Pattern right-dquote at: {idx2}")

# em dash U+2014 UTF-8: E2 80 94
# double encoded: C3 A2 E2 80 80 C2 94? No.
# U+2014 = E2 80 94
# E2 decoded as Latin1 = â (U+00E2), UTF-8 encoded back = C3 A2
# 80 decoded as Windows-1252 = € (U+20AC), UTF-8 encoded = E2 82 AC
# 94 decoded as Windows-1252 = " (U+201D right double quotation), UTF-8 encoded = E2 80 9D
# So double encoding of em dash: C3 A2 E2 82 AC E2 80 9D

bad_emdash = b'\xc3\xa2\xe2\x82\xac\xe2\x80\x9d'
good_dash = b'-'
print(f"Bad em-dash occurrences: {raw.count(bad_emdash)}")
fixed2 = fixed.replace(bad_emdash, good_dash)
print(f"After em-dash fix")

# Write the file
with open(f, 'wb') as fp:
    fp.write(fixed2)
print("DONE - file written")
