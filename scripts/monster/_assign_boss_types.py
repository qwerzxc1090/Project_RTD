import json, random, re

random.seed(42)  # 결과 재현 가능하도록 시드 고정

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']
boss_types = ['boss_normal', 'boss_explosive', 'boss_vibration']

print("=== 보스 라운드 현황 및 배정 계획 ===")
assignments = {}
for k in sorted(monsters.keys(), key=lambda x: int(x)):
    m = monsters[k]
    if m['type'] == 'boss' or m.get('isBoss'):
        new_type = random.choice(boss_types)
        assignments[k] = new_type
        print(f"R{k.zfill(2)} [{m['name']}]  boss → {new_type}")

# 실제 적용
for k, new_type in assignments.items():
    monsters[k]['type'] = new_type

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 적용 완료")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

for k, new_type in assignments.items():
    rid = int(k)
    # 패턴: { id: 8, name: '보스 8R', type: 'boss', ...}
    pattern = r"(\{\s*id:\s*" + str(rid) + r",\s*name:\s*'[^']*',\s*type:\s*)'boss'"
    replacement = r"\g<1>'" + new_type + "'"
    editor, cnt = re.subn(pattern, replacement, editor)
    print(f"R{k.zfill(2)}: data-editor 패치 ({cnt}개)")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print("\ndata-editor.html 적용 완료")
print("\n=== 최종 배정 결과 ===")
for k, t in assignments.items():
    print(f"  R{k.zfill(2)}: {t}")
