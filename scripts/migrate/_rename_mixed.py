"""
몬스터 크기 타입명 'mixed' → 'general' 로 전체 변경
  - 내부 식별자: 'mixed' → 'general'  (attackType 'normal'과 혼동 방지)
  - 한국어 레이블: '혼합' → '일반'
  - 변경 대상 파일:
      assets/data/stats.json
      tools/data-editor.html
      js/config.js
      js/entities/Monster.js
      js/systems/CombatSystem.js  (주석)
      js/systems/WaveSystem.js    (주석 + 내장 테이블)
"""

import json, re

OLD = 'mixed'
NEW = 'general'   # 내부 식별자

# ═══════════════════════════════════════════
# 1. stats.json — 몬스터 type 필드
# ═══════════════════════════════════════════
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    stats = json.load(f)

cnt = 0
for k in stats['monsters']:
    if stats['monsters'][k].get('type') == OLD:
        stats['monsters'][k]['type'] = NEW
        cnt += 1
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(stats, f, indent=2, ensure_ascii=False)
print(f"[stats.json] {cnt}개 몬스터 type 변경: '{OLD}' → '{NEW}'")

# ═══════════════════════════════════════════
# 2. config.js — TYPE_EFFECTIVENESS 키 + COLORS.MONSTER 키
# ═══════════════════════════════════════════
with open('js/config.js', 'r', encoding='utf-8') as f:
    cfg = f.read()

# TYPE_EFFECTIVENESS 내 mixed 키 (값 내부에서만 교체)
cnt = cfg.count(f' {OLD}:')
cfg = cfg.replace(f' {OLD}:', f' {NEW}:')
# 주석의 mixed 표기도 교체
cfg = cfg.replace('중형(mixed)', '일반형(general)')
cfg = cfg.replace(f'mixed  :', f'{NEW}  :')
cfg = cfg.replace(f'boss_normal (\uade0\ud615\ud615) \u2194 mixed  :', f'boss_normal (\uade0\ud615\ud615) \u2194 {NEW} :')
# COLORS.MONSTER mixed → general
cfg = cfg.replace(f'            {OLD}:          0xFF44CC,', f'            {NEW}:          0xFF44CC,')
# 모든 잔여 ' mixed:' → ' general:'
cfg = cfg.replace(f' {OLD}:', f' {NEW}:')
cfg = cfg.replace(f'\t{OLD}:', f'\t{NEW}:')

with open('js/config.js', 'w', encoding='utf-8') as f:
    f.write(cfg)
print(f"[config.js] mixed 키 → general 변경 완료")

# ═══════════════════════════════════════════
# 3. Monster.js — 조건문 및 색상 참조
# ═══════════════════════════════════════════
with open('js/entities/Monster.js', 'r', encoding='utf-8') as f:
    monster = f.read()

cnt = monster.count(f"'{OLD}'")
monster = monster.replace(f"'{OLD}'", f"'{NEW}'")
monster = monster.replace(f'.MONSTER.{OLD}', f'.MONSTER.{NEW}')
monster = monster.replace(f"'small', 'large', 'boss', '{OLD}'", f"'small', 'large', 'boss', '{NEW}'")

with open('js/entities/Monster.js', 'w', encoding='utf-8') as f:
    f.write(monster)
print(f"[Monster.js] {cnt}개 '{OLD}' → '{NEW}' 변경")

# ═══════════════════════════════════════════
# 4. CombatSystem.js — 주석
# ═══════════════════════════════════════════
with open('js/systems/CombatSystem.js', 'r', encoding='utf-8') as f:
    combat = f.read()

combat = combat.replace(
    f"'small','large','{OLD}','boss'",
    f"'small','large','{NEW}','boss'"
)
combat = combat.replace(f"'{OLD}'", f"'{NEW}'")

with open('js/systems/CombatSystem.js', 'w', encoding='utf-8') as f:
    f.write(combat)
print("[CombatSystem.js] 주석 업데이트")

# ═══════════════════════════════════════════
# 5. WaveSystem.js — 주석 + 내장 TYPE_EFFECTIVENESS
# ═══════════════════════════════════════════
with open('js/systems/WaveSystem.js', 'r', encoding='utf-8') as f:
    wave = f.read()

wave = wave.replace(f"'{OLD}'", f"'{NEW}'")
wave = wave.replace(f' {OLD}:', f' {NEW}:')

with open('js/systems/WaveSystem.js', 'w', encoding='utf-8') as f:
    f.write(wave)
print("[WaveSystem.js] mixed → general 변경")

# ═══════════════════════════════════════════
# 6. data-editor.html — 전체
# ═══════════════════════════════════════════
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    editor = f.read()

# 몬스터 데이터 type: 'mixed' → 'general'
editor = editor.replace(f"type: '{OLD}'", f"type: '{NEW}'")

# MONSTER_TYPES 배열의 'mixed' 항목
editor = editor.replace(f"'{OLD}'", f"'{NEW}'")

# MONSTER_TYPE_LABELS
editor = editor.replace(f"{OLD}: '혼합'", f"{NEW}: '일반'")
editor = editor.replace("혼합: '혼합'", f"{NEW}: '일반'")   # 혹시 모를 케이스

# 타입 상성 data-aff 속성 (at-mixed → at-general)
editor = editor.replace(f'-{OLD}"', f'-{NEW}"')

# JavaScript 내 aff.mixed → aff.general
editor = editor.replace(f'aff.{OLD}', f'aff.{NEW}')
editor = editor.replace(f'mixedVal', f'generalVal')

# 테이블 헤더
editor = editor.replace('<th>혼합 배율</th>', '<th>일반 배율</th>')

# TYPE_AFFINITY 블록 내 mixed: 키
editor = re.sub(r'(mixed\s*:\s*[\d.]+)', lambda m: m.group(0).replace('mixed', NEW), editor)

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(editor)
print("[data-editor.html] 전체 mixed → general, '혼합' → '일반' 변경 완료")

print("\n✅ 모든 파일 변경 완료")
print(f"   내부 식별자: '{OLD}' → '{NEW}'")
print("   한국어 레이블: '혼합' → '일반'")
