import json

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']  # dict: { "1": {...}, "2": {...}, ... }
print('라운드 | HP      | 타입   | 이름')
print('-' * 55)
for i in range(1, 29):
    key = str(i)
    if key not in monsters:
        break
    m = monsters[key]
    hp = m['hp']
    t = m['type']
    n = m['name']
    print(f'R{str(i).zfill(2)}  hp={hp:8}  type={t:5}  {n}')
