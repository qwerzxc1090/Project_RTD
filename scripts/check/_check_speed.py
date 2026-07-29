import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

units = s['units']
print("=== 350ms 미만(초고속) 타워 ===")
for u in units:
    if not u['id'].endswith('_dok') and u['attackSpeed'] < 350:
        dps = round(u['damage'] / (u['attackSpeed'] / 1000), 1)
        print(f"  {u['id']:12} {u['name']:12} speed={u['attackSpeed']} dmg={u['damage']} DPS={dps}")

print("\n=== _dok 타워 전체 ===")
for u in units:
    if u['id'].endswith('_dok'):
        dps = round(u['damage'] / (u['attackSpeed'] / 1000), 1)
        print(f"  {u['id']:12} {u['name']:14} speed={u['attackSpeed']} dmg={u['damage']} DPS={dps}")
