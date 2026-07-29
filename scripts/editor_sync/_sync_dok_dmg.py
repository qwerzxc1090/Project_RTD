"""
stats.json의 _dok 유닛 damage 값을 data-editor.html DEFAULT_UNITS에 반영
"""
import json, re, sys, io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# _dok 유닛 딕셔너리
dok_map = {u['id']: u for u in data['units'] if '_dok' in u['id']}

changes = 0
for uid, u in dok_map.items():
    # 패턴: id:"n2_dok", ... damage:30 → damage:22
    pattern = r'(id:"' + re.escape(uid) + r'"[^}]*?damage:)(\d+)'
    def replace_dmg(m, new_dmg=u['damage']):
        return m.group(1) + str(new_dmg)
    new_html, cnt = re.subn(pattern, replace_dmg, html, flags=re.DOTALL)
    if cnt > 0:
        changes += cnt
        html = new_html

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(html)
print("_dok 공격력 에디터 반영: {}건".format(changes))
