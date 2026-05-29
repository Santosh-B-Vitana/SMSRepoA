"""Fix CP437-corrupted UTF-8 characters in SectionDetail.tsx"""
f = r'c:\Vitana\Vitana Group\SMSRepoA\ui\src\pages\academics\SectionDetail.tsx'

with open(f, 'rb') as fp:
    raw = fp.read()

print(f"File size: {len(raw)} bytes")

# ΓÇô = corrupted en-dash (–, U+2013)
# Bytes: CE93 C387 C3B4 -> should be E2 80 93
bad_endash = b'\xce\x93\xc3\x87\xc3\xb4'
good_endash = b'\xe2\x80\x93'
print(f"ΓÇô (en-dash) occurrences: {raw.count(bad_endash)}")

# ΓöÇ = box-drawing char (─, U+2500) corrupted via CP437
# CP437: 0xE2=Γ, 0x94=ö... wait let me check
# Actually ─ (U+2500) UTF-8: E2 94 80
# CP437: E2=Γ, 94=ö, 80=Ç  
# So ΓöÇ = CE93 C3B6 C387
bad_boxdraw = b'\xce\x93\xc3\xb6\xc3\x87'
good_boxdraw = b'\xe2\x94\x80'
print(f"ΓöÇ (box-draw) occurrences: {raw.count(bad_boxdraw)}")

# Also check for em-dash version: ΓÇö
# CP437: 0x80=Ç is correct for ΓÇ, 0x94=ö... 
# But em dash is E2 80 94: Γ(E2)Ç(80)ö(94) = ΓÇö
bad_emdash2 = b'\xce\x93\xc3\x87\xc3\xb6'
good_emdash2 = b'\xe2\x80\x94'
print(f"ΓÇö (em-dash) occurrences: {raw.count(bad_emdash2)}")

# Replace all
fixed = raw
fixed = fixed.replace(bad_endash, b' - ')   # en dash -> ' - '
fixed = fixed.replace(bad_boxdraw, b'-')    # box drawing -> '-'
fixed = fixed.replace(bad_emdash2, b' - ')  # em dash -> ' - '

print(f"\nAfter fixes:")
print(f"Bad en-dash left: {fixed.count(bad_endash)}")
print(f"Bad box-draw left: {fixed.count(bad_boxdraw)}")

with open(f, 'wb') as fp:
    fp.write(fixed)
print("DONE - file written")
