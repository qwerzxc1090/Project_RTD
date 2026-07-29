import json
import re

# 1. Update stats.json
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)

# 원본 폭발형 타워 데미지 저장
base_damages = {}
for u in stats['units']:
    if not u['id'].endswith('_dok') and u['id'].endswith('2'):
        base_damages[u['id']] = u['damage']

# _dok 타워 데미지를 원본의 12%로 수정
for u in stats['units']:
    if u['id'].endswith('_dok'):
        base_id = u['id'].replace('_dok', '')
        if base_id in base_damages:
            new_damage = round(base_damages[base_id] * 0.12)
            u['damage'] = new_damage

# 독 스킬 지속시간 20초(20000ms)로 수정
if '5' in stats['skills']:
    stats['skills']['5']['poisonDuration'] = 20000

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)

# 2. Update data-editor.html
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def replacer_unit(match):
    id_val = match.group(1)
    prefix = match.group(2)
    suffix = match.group(3)
    
    if id_val.endswith('_dok'):
        base_id = id_val.replace('_dok', '')
        if base_id in base_damages:
            new_dmg = round(base_damages[base_id] * 0.12)
            return f'{{id:"{id_val}",{prefix}damage:{new_dmg},{suffix}'
    return match.group(0)

# 유닛 데미지 수정 매치 패턴
editor = re.sub(r'\{id:"([^"]+)",(.*?)damage:\d+,(.*?)\}', replacer_unit, editor)

def replacer_skill(match):
    prefix = match.group(1)
    suffix = match.group(2)
    return f'{prefix}poisonDuration:20000{suffix}'

# 스킬 지속시간 수정 매치 패턴
editor = re.sub(r'("5":\{.*?)(poisonDuration:\d+)(.*?\})', replacer_skill, editor)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print("✅ 독 타워 데미지 12% 및 지속시간 20초 수정 완료")
