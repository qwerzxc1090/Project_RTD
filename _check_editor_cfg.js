const fs = require('fs');
const html = fs.readFileSync('tools/data-editor.html', 'utf8');

// DEFAULT_CONFIG 파싱
const cfgMatch = html.match(/const DEFAULT_CONFIG\s*=\s*(\{[\s\S]*?\});/);
const cfg = eval('(' + cfgMatch[1] + ')');

// renderSystem sections에서 사용하는 cfg.KEY?? 패턴 추출
const keysUsed = [];
const re = /cfg\.(\w+)\s*\?\?/g;
let m;
while ((m = re.exec(html)) !== null) keysUsed.push(m[1]);
const uniq = [...new Set(keysUsed)];

console.log('renderSystem에서 참조하는 cfg 키 (' + uniq.length + '개):');
let missing = 0;
uniq.forEach(k => {
  const ok = k in cfg;
  if (!ok) missing++;
  console.log('  ' + (ok ? 'OK  ' : 'MISS') + ' ' + k);
});
console.log(missing > 0 ? '\n경고: ' + missing + '개 키 누락!' : '\n전체 키 정상');

// loadLS 함수 존재 확인
console.log('\nloadLS 병합 로직:', html.includes('Array.isArray(fallback)') ? 'OK' : 'MISSING');

// 페이지 로드 시 초기화 호출
const initMatch = html.match(/renderSystem\(\)/g);
console.log('renderSystem() 호출 수:', initMatch ? initMatch.length : 0);
