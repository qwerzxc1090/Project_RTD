import re, sys, io, json
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# DEFAULT_UNITS 블록 추출
m = re.search(r'const DEFAULT_UNITS\s*=\s*\[(.*?)\];', html, re.DOTALL)
if m:
    block = m.group(1)
    ids = re.findall(r'id:"([^"]+)"', block)
    print('DEFAULT_UNITS 유닛 수:', len(ids))
    yeon = [i for i in ids if '_yeon' in i]
    dok  = [i for i in ids if '_dok'  in i]
    don  = [i for i in ids if '_don'  in i]
    base = [i for i in ids if '_yeon' not in i and '_dok' not in i and '_don' not in i]
    print('  기본:', len(base))
    print('  _yeon:', len(yeon))
    print('  _dok:', len(dok))
    print('  _don:', len(don))
else:
    print('DEFAULT_UNITS 블록 없음')

# stats.json 유닛 수
data = json.load(open('assets/data/stats.json', encoding='utf-8'))
print()
print('stats.json 유닛 수:', len(data['units']))
sjson_ids = set(u['id'] for u in data['units'])
editor_ids = set(ids) if m else set()
missing = sjson_ids - editor_ids
extra   = editor_ids - sjson_ids
print('에디터에만 없는 유닛 (stats에는 있음):', len(missing))
if missing:
    print('  누락:', sorted(list(missing))[:10])
print('에디터에만 있는 유닛 (stats에는 없음):', len(extra))
