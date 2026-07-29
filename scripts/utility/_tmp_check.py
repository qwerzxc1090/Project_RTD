import sys, io, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

with open('tools/data-editor.html', encoding='utf-8') as f:
    html = f.read()

# rateSum 합계 계산 전체 블록 확인 (pos=37718 주변)
print(html[37600:38000])
