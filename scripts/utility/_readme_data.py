import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']
units = s['units']
skills = s['skills']

# 보스 상세
print("=== 보스 라운드 ===")
for k in sorted(monsters.keys(), key=lambda x: int(x)):
    m = monsters[k]
    if m.get('isBoss'):
        name = m['name']
        mtype = m['type']
        hp = m['hp']
        print(f"R{k}: {name} | {mtype} | hp={hp}")

# HP 범위
print("\n=== HP 범위 ===")
print("R01 hp:", monsters['1']['hp'])
print("R20 hp:", monsters['20']['hp'])
print("R21 hp:", monsters['21']['hp'])
print("R50 hp:", monsters['50']['hp'])

# 가챠 활성
print("\n=== 가챠 활성 유닛 ===")
gacha = [u for u in units if u.get('gachaAvailable')]
for u in gacha:
    uid = u['id']
    name = u['name']
    tier = u['tier']
    dmg = u['damage']
    print(f"  {uid}: {name} ({tier}) damage={dmg}")

# 스킬
print("\n=== 스킬 목록 ===")
for k in sorted(skills.keys()):
    v = skills[k]
    name = v.get('name', '')
    cat = v.get('category', '')
    spd = v.get('projectileSpeed', '')
    pd = v.get('poisonDuration', '-')
    ms = v.get('maxPoisonStacks', '-')
    ratio = v.get('poisonDamageRatio', '-')
    print(f"  skill {k}: {name} | {cat} | speed={spd} | poisonDuration={pd} maxStacks={ms} ratio={ratio}")
