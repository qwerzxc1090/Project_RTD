import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

NEW_DURATION = 10000  # 10초

# ── 1. stats.json ──────────────────────────────────────────────
with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

changed = []
for sid, s in data['skills'].items():
    if s.get('category') == 'duration' or s.get('nameEn') == 'POISON_DOT':
        old = s.get('poisonDuration')
        s['poisonDuration'] = NEW_DURATION
        changed.append('스킬 {} ({}): {}ms → {}ms'.format(sid, s.get('name',''), old, NEW_DURATION))

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

for c in changed:
    print(c)
print('stats.json 저장 완료\n')

# ── 2. data-editor.html DEFAULT_SKILLS 동기화 ─────────────────
with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# poisonDuration 값 교체 (DEFAULT_SKILLS 블록 내)
m = re.search(r'(const DEFAULT_SKILLS\s*=\s*\{)(.*?)(\};)', html, re.DOTALL)
if m:
    before = html[:m.start(2)]
    block  = m.group(2)
    after  = html[m.end(2):]
    # duration 카테고리 스킬의 poisonDuration 값 변경
    old_val_pattern = r'(poisonDuration:)\s*\d+'
    new_block = re.sub(old_val_pattern, r'\g<1>' + str(NEW_DURATION), block)
    if new_block != block:
        html = before + new_block + after
        print('data-editor.html DEFAULT_SKILLS poisonDuration 업데이트')
    else:
        print('data-editor.html: 변경 대상 없음')
    with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
        f.write(html)
else:
    print('WARNING: DEFAULT_SKILLS 블록 없음')
