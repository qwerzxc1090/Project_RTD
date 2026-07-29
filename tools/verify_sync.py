import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

d = json.load(open('assets/data/stats.json', 'r', encoding='utf-8'))
dmg_map = {u['id']: u['damage'] for u in d['units']}

with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    content = f.read()

mismatch = 0
for m in re.finditer(r'id:"([^"]+)"[^}]*?damage:(\d+)', content):
    uid, dmg = m.group(1), int(m.group(2))
    if uid in dmg_map and dmg_map[uid] != dmg:
        print(f'MISMATCH: {uid} stats={dmg_map[uid]} editor={dmg}')
        mismatch += 1

print(f'Total mismatches: {mismatch}')
