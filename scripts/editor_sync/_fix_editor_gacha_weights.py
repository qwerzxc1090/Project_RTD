"""
data-editor.html 가챠 확률 섹션을
소수점 방식 → 정수 가중치 방식으로 일괄 수정
"""
import re

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

original = html

# ── 1. DEFAULT_CONFIG.GACHA_RATES 소수점 → 정수 가중치 ──────────────
old_rates = (
    "normal: 0.5000, rare: 0.3310, ancient: 0.1020, relic: 0.0510,\n"
    "    saga: 0.0080, legend: 0.0050, epic: 0.0020, myth: 0.0008, primordial: 0.00019"
)
new_rates = (
    "normal: 50000, rare: 33100, ancient: 10200, relic: 5100,\n"
    "    saga: 800, legend: 500, epic: 200, myth: 80, primordial: 19"
)
html = html.replace(old_rates, new_rates)
print("1. DEFAULT_CONFIG.GACHA_RATES:", "OK" if html != original else "NOT FOUND")
after1 = html

# ── 2. 렌더링: 퍼센트 표시 로직 수정 ────────────────────────────────
#  변경전: const pct = (v * 100).toFixed(4);
#  변경후: const total = Object.values(cfg.GACHA_RATES).reduce((a,b)=>a+b,0)||99999;
#           const pct = (v / total * 100).toFixed(4);
old_pct = "    const pct = (v * 100).toFixed(4);"
new_pct = (
    "    const total = Object.values(cfg.GACHA_RATES).reduce((a,b)=>a+b,0)||99999;\n"
    "    const pct = (v / total * 100).toFixed(4);"
)
html = html.replace(old_pct, new_pct)
print("2. 퍼센트 표시 로직:", "OK" if html != after1 else "NOT FOUND")
after2 = html

# ── 3. 입력 필드: step 속성 소수점 → 정수 ────────────────────────────
#  변경전: step="0.0001" ... value="${v}"
#  변경후: step="1"      ... value="${v}"
old_step = 'type="number" step="0.0001" data-rate="${t}" value="${v}"'
new_step = 'type="number" step="1"      data-rate="${t}" value="${v}"'
html = html.replace(old_step, new_step)
print("3. 입력 필드 step:", "OK" if html != after2 else "NOT FOUND")
after3 = html

# ── 4. 저장 로직: parseFloat → parseInt ─────────────────────────────
old_parse = "    cfg.GACHA_RATES[inp.dataset.rate] = parseFloat(inp.value) || 0;"
new_parse = "    cfg.GACHA_RATES[inp.dataset.rate] = parseInt(inp.value) || 0;"
html = html.replace(old_parse, new_parse)
print("4. 저장 로직 parseInt:", "OK" if html != after3 else "NOT FOUND")
after4 = html

# ── 5. 합계 표시: rateSum 계산 로직 수정 ────────────────────────────
# 기존에 합계를 100% 기준으로 표시하는 부분을 찾아 수정
# 패턴: sumRate 또는 rateSum 관련 계산
old_sum = re.search(r'(rateSum|sumRate)[^\n]*\n[^\n]*\.toFixed', html)
if old_sum:
    print("5. rateSum 위치:", old_sum.start(), "→ 수동 확인 필요")
else:
    print("5. rateSum 별도 처리 없음 (자동 계산)")

# ── 6. export 로직: JSON.stringify가 정수를 그대로 출력하므로 수정 불필요
print("6. export 로직: 정수 그대로 출력되므로 수정 불필요")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("\n저장 완료: tools/data-editor.html")
