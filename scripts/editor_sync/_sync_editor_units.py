"""
stats.json의 전체 108개 유닛을 data-editor.html DEFAULT_UNITS에 동기화.
에디터에 없는 54개 신규 유닛 (_yeon explosive/vibration, _dok normal/vibration, _don normal/explosive)을 추가.
"""
import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# ── 현재 에디터의 유닛 ID 목록 추출 ──
m = re.search(r'(const DEFAULT_UNITS\s*=\s*\[)(.*?)(\];)', html, re.DOTALL)
if not m:
    print('ERROR: DEFAULT_UNITS 블록을 찾지 못했습니다')
    exit(1)

before = html[:m.start(2)]
block  = m.group(2)
after  = html[m.end(2):]

existing_ids = set(re.findall(r'id:"([^"]+)"', block))
print('기존 유닛:', len(existing_ids))

# ── 누락 유닛을 stats.json 순서 기준으로 JS 라인 생성 ──
new_lines = []
for u in data['units']:
    uid = u['id']
    if uid in existing_ids:
        continue  # 이미 있음
    # skillId: 정수면 숫자, 아니면 문자열
    sid = u.get('skillId', '')
    sid_str = str(int(sid)) if isinstance(sid, (int, float)) else str(sid)
    ga  = 'true' if u.get('gachaAvailable', False) else 'false'
    cr  = u.get('criticalRate', 0)
    line = (
        f'  {{id:"{uid}", name:"{u["name"]}", tier:"{u["tier"]}", '
        f'attackType:"{u["attackType"]}", damage:{u["damage"]}, '
        f'attackSpeed:{u["attackSpeed"]}, range:{u["range"]}, '
        f'skillId:{sid_str}, gradeScore:{u.get("gradeScore",0)}, '
        f'gachaAvailable:{ga}, criticalRate:{cr}}}'
    )
    new_lines.append(line)

print('추가할 유닛:', len(new_lines))

if not new_lines:
    print('추가할 유닛 없음')
    exit(0)

# ── 기존 블록 끝에 추가 ──
# 마지막 }에 쉼표가 없으면 추가
block = block.rstrip()
if not block.endswith(','):
    block = block + ','
block = block + '\n' + ',\n'.join(new_lines) + '\n'

new_html = before + block + after

# ── renderTower 타이틀 유닛 수 업데이트 ──
total_units = len(data['units'])
new_html = re.sub(
    r'(🗼 타워 능력치 \()\d+(개 유닛\))',
    lambda mm: mm.group(1) + str(total_units) + mm.group(2),
    new_html
)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(new_html)

print('저장 완료: tools/data-editor.html')
print('타워 능력치 타이틀: {}개 유닛으로 업데이트'.format(total_units))
