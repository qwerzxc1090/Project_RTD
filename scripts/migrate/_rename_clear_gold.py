"""
bossGoldBonus → clearGoldBonus 전면 변경
기능: 보스 처치 시 지급 → 스테이지 클리어 시 지급
"""
import json, re

# ── 1. stats.json waves ──
with open('assets/data/stats.json', 'r', encoding='utf-8') as f:
    s = json.load(f)
for w in s['waves']:
    if 'bossGoldBonus' in w:
        w['clearGoldBonus'] = w.pop('bossGoldBonus')
with open('assets/data/stats.json', 'w', encoding='utf-8') as f:
    json.dump(s, f, indent=2, ensure_ascii=False)
print("stats.json: bossGoldBonus → clearGoldBonus 변환 완료")

# ── 2. data-editor.html ──
with open('tools/data-editor.html', 'r', encoding='utf-8') as f:
    ed = f.read()
ed = ed.replace('bossGoldBonus', 'clearGoldBonus')
ed = ed.replace('🎁보스처치골드', '🏆클리어골드')
ed = ed.replace('보스처치골드', '클리어골드')
ed = ed.replace('보스 라운드만 해당', '클리어 시 보너스 골드 (보스 라운드)')
with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(ed)
print("data-editor.html: 완료")

print("모든 파일 변환 완료")
