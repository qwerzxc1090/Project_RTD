import json
import re

# 1. Update stats.json
stats_path = 'assets/data/stats.json'
with open(stats_path, 'r', encoding='utf-8') as f:
    data = json.load(f)

for unit in data.get('units', []):
    if 'criticalRate' not in unit:
        unit['criticalRate'] = 1000

with open(stats_path, 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

# 2. Update tools/data-editor.html
html_path = 'tools/data-editor.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Add to DEFAULT_CONFIG
if 'CRITICAL_DAMAGE_RATIO' not in html:
    html = html.replace('SPAWN_INTERVAL: 1600,', 'SPAWN_INTERVAL: 1600,\n  CRITICAL_DAMAGE_RATIO: 0.5,')

# Add to renderSystem
if 'CRITICAL_DAMAGE_RATIO' not in html and 'title:\'💰 경제 시스템' in html:
    # already handled above by checking CRITICAL_DAMAGE_RATIO, but let's be safe and just insert the section
    combat_sec = """    { title:'⚔️ 전투 시스템', fields:[
      {key:'CRITICAL_DAMAGE_RATIO', label:'치명타 데미지 비율', val:cfg.CRITICAL_DAMAGE_RATIO??0.5, type:'number', step:'0.01'}
    ]},"""
    html = html.replace("    { title:'🔄 라운드', fields:[", combat_sec + "\n    { title:'🔄 라운드', fields:[")

# Add criticalRate to DEFAULT_UNITS
html = re.sub(r'(gachaAvailable:true)(\s*\})', r'\1, criticalRate:1000\2', html)

# Add to renderTower table header
html = html.replace('<th>공격력</th><th>공속(ms)</th>', '<th>공격력</th><th>치명타율(‱)</th><th>공속(ms)</th>')

# Add to renderTower table body
html = html.replace('<td><input type="number" value="${u.damage}" data-field="damage"></td>\n      <td><input type="number"', '<td><input type="number" value="${u.damage}" data-field="damage"></td>\n      <td><input type="number" value="${u.criticalRate !== undefined ? u.criticalRate : 1000}" data-field="criticalRate"></td>\n      <td><input type="number"')

# Add to collectTower
if 'criticalRate:' not in html:
    html = html.replace('damage: parseFloat(tr.querySelector(\'[data-field="damage"]\').value) || 0,', 'damage: parseFloat(tr.querySelector(\'[data-field="damage"]\').value) || 0,\n      criticalRate: parseInt(tr.querySelector(\'[data-field="criticalRate"]\').value) || 1000,')

# Add to save data string in saveToFiles
if 'criticalRate: ${u.criticalRate}' not in html:
    html = html.replace('skillId: ${u.skillId}, gradeScore: ${u.gradeScore}, gachaAvailable: ${u.gachaAvailable}', 'skillId: ${u.skillId}, gradeScore: ${u.gradeScore}, gachaAvailable: ${u.gachaAvailable}, criticalRate: ${u.criticalRate}')

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(html)

print("Updates applied successfully.")
