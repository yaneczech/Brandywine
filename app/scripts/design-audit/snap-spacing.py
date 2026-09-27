# Snaps spacing declarations (gap, margin, padding) in <style> blocks to the
# 4px grid (DESIGN.md › Rytmus). Values inside clamp()/calc()/var(), em units,
# negative and sub-4px values (optical adjustments) are left alone. Usage: python3 snap-spacing.py FILE...
import re, sys
PROP = re.compile(r'(?P<prop>(?:row-|column-)?gap|margin(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?|padding(?:-(?:top|right|bottom|left|block|inline)(?:-(?:start|end))?)?)\s*:\s*(?P<val>[^;{}]+);')
LEN = re.compile(r'(?<![\w.-])(-?\d*\.?\d+)(rem|em|px)\b')
def snap(m):
    num, unit = float(m.group(1)), m.group(2)
    # em follows the element's font size, negatives and sub-4px values are
    # optical adjustments (hairline overlaps, badge insets) — leave them alone
    if unit == 'em' or num <= 0: return m.group(0)
    px = num * 16 if unit == 'rem' else num
    if px < 4: return m.group(0)
    return f'{round(px / 4) * 4}px'
def fix_value(v):
    if re.search(r'clamp|calc|var|min\(|max\(', v): return v
    return LEN.sub(snap, v)
changed = 0
for path in sys.argv[1:]:
    s = open(path).read()
    i = s.find('<style')
    if i < 0 and not path.endswith('.css'): continue
    head, css = (s[:i], s[i:]) if i >= 0 else ('', s)
    new = PROP.sub(lambda m: f"{m.group('prop')}: {fix_value(m.group('val')).strip()};", css)
    if new != css:
        changed += sum(1 for a, b in zip(PROP.findall(css), PROP.findall(new)) if a != b)
        open(path, 'w').write(head + new)
print('declarations changed:', changed)
