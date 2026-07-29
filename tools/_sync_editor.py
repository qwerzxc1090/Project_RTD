import json, re, io, sys

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# ── DEFAULT_UNITS의 gachaAvailable 동기화 ─────────────────────────
unit_map = {str(u['id']): u for u in data['units']}
changes = 0

def replace_gacha(m):
    global changes
    # 앞쪽에서 id를 추출
    prefix = m.group(1)
    id_match = re.search(r'id:"([^"]+)"', prefix)
    if not id_match:
        return m.group(0)
    uid = id_match.group(1)
    u = unit_map.get(uid)
    if u is None:
        return m.group(0)
    new_val = 'true' if u['gachaAvailable'] else 'false'
    old_val = m.group(2)
    if new_val != old_val:
        changes += 1
    return f'{prefix}gachaAvailable:{new_val}'

# DEFAULT_UNITS 블록 내에서만 치환
units_match = re.search(r'(const DEFAULT_UNITS\s*=\s*\[)(.*?)(\];)', html, re.DOTALL)
if units_match:
    before = html[:units_match.start(2)]
    block  = units_match.group(2)
    after  = html[units_match.end(2):]

    # 각 유닛 오브젝트 내 gachaAvailable 값 치환
    def fix_unit_block(m):
        global changes
        content = m.group(0)
        id_m = re.search(r'id:"([^"]+)"', content)
        if not id_m:
            return content
        uid = id_m.group(1)
        u = unit_map.get(uid)
        if u is None:
            return content
        new_val = 'true' if u['gachaAvailable'] else 'false'
        new_content = re.sub(r'gachaAvailable:(true|false)', f'gachaAvailable:{new_val}', content)
        if new_content != content:
            changes += 1
        return new_content

    block = re.sub(r'\{[^}]+\}', fix_unit_block, block)
    html = before + block + after

# ── DEFAULT_SKILLS의 attacksToReward 동기화 ──────────────────────
skill_map = {str(k): v for k, v in data['skills'].items()}

skills_match = re.search(r'(const DEFAULT_SKILLS\s*=\s*\{)(.*?)(\};)', html, re.DOTALL)
if skills_match:
    before = html[:skills_match.start(2)]
    block  = skills_match.group(2)
    after  = html[skills_match.end(2):]

    def fix_skill_block(m):
        global changes
        content = m.group(0)
        # 키 추출: "6":{...}
        key_m = re.search(r'"(\d+)":\{', content)
        if not key_m:
            return content
        sid = key_m.group(1)
        s = skill_map.get(sid)
        if s is None or 'attacksToReward' not in s:
            return content
        new_val = str(s['attacksToReward'])
        new_content = re.sub(r'attacksToReward:\d+', f'attacksToReward:{new_val}', content)
        if new_content != content:
            changes += 1
        return new_content

    block = re.sub(r'"(\d+)":\{[^}]+\}', fix_skill_block, block)
    html = before + block + after

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(html)

print(f"[PASS] data-editor.html saved ({changes}건 변경)")
