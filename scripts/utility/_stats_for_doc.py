import json
from collections import Counter

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

units = s['units']
monsters = s['monsters']
skills = s['skills']

print("=== 유닛 통계 ===")
print("총 유닛 수:", len(units))
print("일반 타워:", len([u for u in units if not u['id'].endswith('_dok') and not u['id'].endswith('_yeon')]))
print("연쇄(_yeon):", len([u for u in units if u['id'].endswith('_yeon')]))
print("독(_dok):", len([u for u in units if u['id'].endswith('_dok')]))

print("\n== 등급 분포 ==")
c = Counter(u['tier'] for u in units)
tiers = ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial']
for t in tiers:
    if t in c:
        print(f"  {t}: {c[t]}개")

print("\n== 공격타입 분포 ==")
c2 = Counter(u['attackType'] for u in units)
for k,v in c2.items():
    print(f"  {k}: {v}개")

gacha = [u for u in units if u.get('gachaAvailable')]
print(f"\n== 가챠 활성: {len(gacha)}개 ==")

print("\n=== 스킬 현황 ===")
for k in sorted(skills.keys()):
    v = skills[k]
    name = v.get('name', '')
    cat = v.get('category', '')
    print(f"  skillId {k}: {name} ({cat})")

print("\n=== 몬스터 통계 ===")
print("총 몬스터 라운드 수:", len(monsters))
boss_list = [str(i) for i in monsters if monsters[i].get('isBoss')]
print("보스 라운드:", boss_list)
