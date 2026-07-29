import json, random, re

random.seed(99)

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']

# 보스 라운드 키 수집
boss_keys = sorted(
    [k for k in monsters if monsters[k].get('isBoss')],
    key=lambda x: int(x)
)
n = len(boss_keys)  # 7개

# 3가지 타입 균등 분배: 7 = 3+2+2 → 한 타입만 3개, 나머지 2개씩
# 순서 무작위로 섞어서 배정
pool = ['boss_normal'] * 3 + ['boss_explosive'] * 2 + ['boss_vibration'] * 2
random.shuffle(pool)

print(f"보스 라운드 수: {n}")
print(f"배정 풀: {pool}")
print()
print("=== 배정 결과 ===")
assignments = {}
for k, t in zip(boss_keys, pool):
    assignments[k] = t
    print(f"R{k.zfill(2)} [{monsters[k]['name']}] → {t}")

# stats.json 적용
for k, t in assignments.items():
    monsters[k]['type'] = t

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("\nstats.json 적용 완료")

# data-editor.html 동기화
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

for k, new_type in assignments.items():
    rid = int(k)
    pattern = (r"(\{\s*id:\s*" + str(rid) +
               r",\s*name:\s*'[^']*',\s*type:\s*)'boss(?:_normal|_explosive|_vibration)?'")
    replacement = r"\g<1>'" + new_type + "'"
    editor, cnt = re.subn(pattern, replacement, editor)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("data-editor.html 적용 완료")

# 분포 확인
from collections import Counter
c = Counter(assignments.values())
print("\n=== 타입별 분포 ===")
for t in ['boss_normal', 'boss_explosive', 'boss_vibration']:
    print(f"  {t}: {c[t]}개")
