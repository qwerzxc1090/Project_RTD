import json, re, sys
sys.stdout.reconfigure(encoding='utf-8')

# stats.json에서 현재 damage 맵 생성
d = json.load(open('assets/data/stats.json', 'r', encoding='utf-8'))
dmg_map = {}
for u in d.get('units', []):
    dmg_map[u['id']] = u['damage']

# data-editor.html 읽기
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()

count = 0
new_lines = []
for line in lines:
    # id:"xxx" 가 있는 줄에서 damage:NNN 치환
    m_id = re.search(r'id:"([^"]+)"', line)
    if m_id and 'damage:' in line:
        uid = m_id.group(1)
        if uid in dmg_map:
            def repl(m):
                global count
                old = int(m.group(1))
                new_val = dmg_map[uid]
                if old != new_val:
                    count += 1
                return 'damage:' + str(new_val)
            line = re.sub(r'damage:(\d+)', repl, line, count=1)
    new_lines.append(line)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print(f'OK - {count} damage values synced')
