import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

changes = 0

# ── 1. 입력 변경 시 개별 퍼센트 업데이트: (v*100) → (v/total*100) ──
# "if(pctEl) pctEl.textContent = (v*100).toFixed(4) + '%';"
old1 = "if(pctEl) pctEl.textContent = (v*100).toFixed(4) + '%';"
new1 = (
    "const _total = Object.values(cfg.GACHA_RATES).reduce((a,b)=>a+b,0)||99999;\n"
    "    if(pctEl) pctEl.textContent = (v/_total*100).toFixed(4) + '%';"
)
if old1 in html:
    html = html.replace(old1, new1)
    changes += 1
    print("1. 개별 퍼센트 업데이트: OK")
else:
    print("1. 개별 퍼센트 업데이트: NOT FOUND")

# ── 2. 합계 계산: sum*100 → sum/99999*100, 유효 범위도 수정 ──────────
# 변경전:
#   const pct = (sum * 100).toFixed(4);
#   const ok = sum >= 0.999 && sum <= 1.001;
#   sumEl.textContent = `합계: ${pct}%`;
#   sumEl.className = 'sum-row ' + (ok ? 'ok' : 'err');
#   if(!ok) sumEl.textContent += ' ⚠️ 99.9~100.1% 범위를 벗어남!';
old2 = (
    "  const pct = (sum * 100).toFixed(4);\n"
    "  const ok = sum >= 0.999 && sum <= 1.001;\n"
    "  sumEl.textContent = `합계: ${pct}%`;\n"
    "  sumEl.className = 'sum-row ' + (ok ? 'ok' : 'err');\n"
    "  if(!ok) sumEl.textContent += ' \u26a0\ufe0f 99.9~100.1% 범위를 벗어남!';"
)
new2 = (
    "  const _sumTotal = 99999;\n"
    "  const pct = (sum / _sumTotal * 100).toFixed(4);\n"
    "  const ok = sum >= 99000 && sum <= 101000;\n"
    "  sumEl.textContent = `합계: ${pct}% (${sum}/${_sumTotal})`;\n"
    "  sumEl.className = 'sum-row ' + (ok ? 'ok' : 'err');\n"
    "  if(!ok) sumEl.textContent += ' \u26a0\ufe0f 가중치 합계가 99000~101000 범위를 벗어남!';"
)
if old2 in html:
    html = html.replace(old2, new2)
    changes += 1
    print("2. 합계 표시 로직: OK")
else:
    # \u26a0 처리 차이로 못 찾을 수 있으니 regex로 시도
    pattern = re.compile(
        r"  const pct = \(sum \* 100\)\.toFixed\(4\);\n"
        r"  const ok = sum >= 0\.999 && sum <= 1\.001;\n"
        r"  sumEl\.textContent = `합계: \$\{pct\}%`;\n"
        r"  sumEl\.className = 'sum-row ' \+ \(ok \? 'ok' : 'err'\);\n"
        r"  if\(!ok\) sumEl\.textContent \+= '[^']*';"
    )
    m = pattern.search(html)
    if m:
        html = html[:m.start()] + new2 + html[m.end():]
        changes += 1
        print("2. 합계 표시 로직 (regex): OK")
    else:
        print("2. 합계 표시 로직: NOT FOUND")

with open('tools/data-editor.html', 'w', encoding='utf-8') as f:
    f.write(html)

print("\n총 {}건 수정, 저장 완료".format(changes))
