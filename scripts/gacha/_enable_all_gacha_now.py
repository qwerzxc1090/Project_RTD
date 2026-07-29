import json

with open('assets/data/stats.json', encoding='utf-8') as f:
    data = json.load(f)

count = 0
for u in data['units']:
    if not u.get('gachaAvailable'):
        u['gachaAvailable'] = True
        count += 1

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(data, f, ensure_ascii=False, indent=2)

total_on  = len([u for u in data['units'] if u.get('gachaAvailable')])
total_all = len(data['units'])
print("활성화: {}개".format(count))
print("뽑기 가능: {}개 / {}개".format(total_on, total_all))
