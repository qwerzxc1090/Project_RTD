"""
1~20 라운드 몬스터 HP를 10%~20% 범위로 순차적으로 증가 감소 적용
  - R01: 기존 HP * 0.10 (10%)
  - R20: 기존 HP * 0.20 (20%)
  - R02~R19: 선형 보간 (0.10 ~ 0.20)
  - 보스 라운드(R08, R16)도 동일 비율 적용
  - R20->R21 역전 현상 확인 후 자연스럽게 연결
"""

import json, math

with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)

monsters = s['monsters']  # dict {"1": {...}, ...}

# ── 원본 HP 백업 ──
original_hp = {}
for k, m in monsters.items():
    original_hp[k] = m['hp']

print("=== 원본 HP (R01~R22) ===")
for i in range(1, 23):
    k = str(i)
    print(f"R{k.zfill(2)} hp={original_hp[k]}")

# ── R01~R20 비율 계산 (선형 보간 10%→20%) ──
ratio_start = 0.10
ratio_end   = 0.20
N = 20  # 대상 라운드 수

print("\n=== 적용 예정 값 ===")
new_hps = {}
for i in range(1, N+1):
    k = str(i)
    # 선형 보간: i=1 → ratio_start, i=N → ratio_end
    t = (i - 1) / (N - 1)  # 0.0 ~ 1.0
    ratio = ratio_start + t * (ratio_end - ratio_start)
    new_hp = max(1, round(original_hp[k] * ratio))
    new_hps[k] = new_hp
    print(f"R{k.zfill(2)} {original_hp[k]:7} * {ratio:.4f} = {new_hp}")

# ── R20 → R21 역전 확인 ──
r20_new = new_hps['20']
r21_orig = original_hp['21']
print(f"\n=== 경계 확인 ===")
print(f"R20 (신규): {r20_new}")
print(f"R21 (원본): {r21_orig}")

if r21_orig <= r20_new:
    print(f"⚠️  역전 발생! R21을 {r20_new + 100} 이상으로 조정 필요")
    # R21부터 자연스럽게 올라가도록 R21 HP = R20_new * 1.03 수준에서 재시작
    # 하지만 너무 크게 튀면 안됨 — R21 원본 값과 비교해 큰 쪽 채택
    r21_adjusted = max(r21_orig, round(r20_new * 1.03))
    print(f"R21 조정: {r21_adjusted}")
else:
    r21_adjusted = None
    print(f"✅ 역전 없음 — R21 원본 그대로 유지 ({r21_orig})")

# ── 실제 적용 ──
for i in range(1, N+1):
    k = str(i)
    monsters[k]['hp'] = new_hps[k]

if r21_adjusted is not None:
    monsters['21']['hp'] = r21_adjusted

with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)

print("\n✅ stats.json 적용 완료")

# ── data-editor.html 동기화 ──
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

import re

def patch_monster_hp(html, monster_id, new_hp):
    """data-editor.html의 특정 몬스터 HP 값을 패치"""
    # 패턴: { id:  1, ... hp: 1073, ...}  또는 { id: 21, ... hp: 2669, ...}
    # id 매칭 후 가장 가까운 hp 값 변경
    pattern = r'(\{ id:\s*' + str(monster_id) + r',\s*name:[^,]+,\s*type:[^,]+,\s*hp:\s*)\d+'
    replacement = r'\g<1>' + str(new_hp)
    new_html, count = re.subn(pattern, replacement, html)
    return new_html, count

total_patched = 0
for i in range(1, N+1):
    editor, cnt = patch_monster_hp(editor, i, new_hps[str(i)])
    total_patched += cnt

if r21_adjusted is not None:
    editor, cnt = patch_monster_hp(editor, 21, r21_adjusted)
    total_patched += cnt

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)

print(f"✅ data-editor.html 패치 완료 ({total_patched}개 항목 수정)")
