"""
data-editor.html의 DEFAULT_UNITS 블록 구문 유효성 검사
"""
import re, json, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# ── 1. DEFAULT_UNITS 블록 추출 및 JSON 변환 테스트 ──
m = re.search(r'const DEFAULT_UNITS\s*=\s*(\[.*?\]);', html, re.DOTALL)
if not m:
    print('ERROR: DEFAULT_UNITS 블록 없음')
    exit(1)

block = m.group(1)

# JS → JSON 변환: 키에 따옴표 추가
json_str = re.sub(r'(\w+):', r'"\1":', block)          # key: → "key":
json_str = json_str.replace("'", '"')                   # 작은따옴표 → 큰따옴표
json_str = re.sub(r',\s*([\]\}])', r'\1', json_str)     # trailing comma 제거

try:
    units = json.loads(json_str)
    print('DEFAULT_UNITS 구문 OK: {}개'.format(len(units)))
except json.JSONDecodeError as e:
    print('DEFAULT_UNITS JSON 오류:', e)
    # 오류 위치 주변 출력
    lines = json_str.split('\n')
    err_line = e.lineno - 1
    for i in range(max(0, err_line-2), min(len(lines), err_line+3)):
        marker = '>>>' if i == err_line else '   '
        print('{} {}: {}'.format(marker, i+1, lines[i][:120]))

# ── 2. DEFAULT_SKILLS 블록 검사 ──
m2 = re.search(r'const DEFAULT_SKILLS\s*=\s*(\{.*?\});', html, re.DOTALL)
if m2:
    sk_block = m2.group(1)
    sk_json = re.sub(r'(\w+):', r'"\1":', sk_block)
    sk_json = sk_json.replace("'", '"')
    sk_json = re.sub(r',\s*([\]\}])', r'\1', sk_json)
    try:
        skills = json.loads(sk_json)
        print('DEFAULT_SKILLS 구문 OK: {}개'.format(len(skills)))
    except json.JSONDecodeError as e:
        print('DEFAULT_SKILLS JSON 오류:', e)
else:
    print('DEFAULT_SKILLS 블록 없음')

# ── 3. DEFAULT_CONFIG 검사 ──
m3 = re.search(r'const DEFAULT_CONFIG\s*=\s*(\{.*?\});', html, re.DOTALL)
if m3:
    cfg_block = m3.group(1)
    cfg_json = re.sub(r'(\w+):', r'"\1":', cfg_block)
    cfg_json = cfg_json.replace("'", '"')
    cfg_json = re.sub(r',\s*([\]\}])', r'\1', cfg_json)
    try:
        cfg = json.loads(cfg_json)
        print('DEFAULT_CONFIG 구문 OK')
    except json.JSONDecodeError as e:
        print('DEFAULT_CONFIG JSON 오류:', e)
else:
    print('DEFAULT_CONFIG 블록 없음')

# ── 4. DEFAULT_UNITS의 각 유닛 개별 검사 ──
print('\n=== 유닛별 필수 필드 검사 ===')
errors = []
for u in units if 'units' not in dir() else []:
    pass
try:
    for i, u in enumerate(units):
        required = ['id','name','tier','attackType','damage','attackSpeed','range']
        for field in required:
            if field not in u:
                errors.append('유닛[{}] {} 필드 없음'.format(i, field))
    if errors:
        for e in errors:
            print('ERROR:', e)
    else:
        print('전체 {}개 유닛 필드 검사 통과'.format(len(units)))
except:
    pass

# ── 5. 특수문자/이스케이프 문제 검사 ──
print('\n=== 신규 추가 유닛 (54개) 샘플 검사 ===')
special = [u for u in units if any(s in u['id'] for s in ['_yeon','_dok','_don'])]
print('특수 유닛 수:', len(special))
# attackType 분포
from collections import Counter
atk_cnt = Counter(u['attackType'] for u in special)
for at, cnt in sorted(atk_cnt.items()):
    print('  {}:{}'.format(at, cnt))
