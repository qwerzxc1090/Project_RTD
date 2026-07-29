import json, re

# 1. stats.json 업데이트
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)

for u in stats['units']:
    u['gachaAvailable'] = u['id'].endswith('_dok')

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)

# 2. data-editor.html 업데이트
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

def replacer(match):
    id_val = match.group(1)
    is_dok = id_val.endswith('_dok')
    gacha = 'true' if is_dok else 'false'
    return '{{id:"{}",{}gachaAvailable:{},'.format(id_val, match.group(2), gacha)

# 매치 패턴: {id:"...", ... gachaAvailable:true|false,
# {id:"n1", name:"...", ..., gachaAvailable:true,
editor = re.sub(r'\{id:"([^"]+)",(.*?)(?:gachaAvailable:(?:true|false)),', replacer, editor)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print("✅ 업데이트 완료")
