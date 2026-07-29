import json
import re
import math

# 1. Update stats.json
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)

for u in stats['units']:
    if u['id'].endswith('_dok'):
        # Reduce damage to 20%
        new_damage = round(u['damage'] * 0.2)
        u['damage'] = new_damage

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)

# 2. Update data-editor.html
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def replacer(match):
    id_val = match.group(1)
    prefix = match.group(2)
    current_dmg = int(match.group(3))
    suffix = match.group(4)
    
    if id_val.endswith('_dok'):
        new_dmg = round(current_dmg * 0.2)
        return f'{{id:"{id_val}",{prefix}damage:{new_dmg},{suffix}'
    else:
        return match.group(0)

# match pattern: {id:"...", ... damage:123, ...
editor = re.sub(r'\{id:"([^"]+)",(.*?)damage:(\d+),(.*?)\}', replacer, editor)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print("✅ 독 타워 DPS(공격력) 20% 수준으로 감소 완료")
