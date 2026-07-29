/**
 * 일반/보스 분리 후 일반 몬스터 총HP(HP×마리수) 선형 재설정
 * 방법: OLS 선형 회귀로 현재 데이터 기반 기울기·절편 추출 → 목표 totalHP 산출
 */
const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const waves    = stats.waves;
const monsters = stats.monsters;

const normalWaves = waves.filter(w => !monsters[w.monsterId].isBoss);
const bossWaves   = waves.filter(w =>  monsters[w.monsterId].isBoss);

// 현재 데이터 수집
const normalData = normalWaves.map((w, i) => ({
    round:     w.round,
    pos:       i + 1,            // 1-indexed 일반 스테이지 순서
    monsterId: w.monsterId,
    count:     w.count,
    hp:        monsters[w.monsterId].hp,
    totalHP:   monsters[w.monsterId].hp * w.count
}));

const n = normalData.length;

// ── OLS 계산 ──
const sumX  = normalData.reduce((s, d) => s + d.pos,        0);
const sumY  = normalData.reduce((s, d) => s + d.totalHP,    0);
const sumXY = normalData.reduce((s, d) => s + d.pos * d.totalHP, 0);
const sumX2 = normalData.reduce((s, d) => s + d.pos * d.pos,    0);

const b = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const a = (sumY - b * sumX) / n;

const startHP = a + b * 1;
const endHP   = a + b * n;

console.log('=== OLS 선형 회귀 결과 ===');
console.log('totalHP = ' + a.toFixed(0) + ' + ' + b.toFixed(1) + ' × pos');
console.log('일반 1번째 스테이지 목표 totalHP:', Math.round(startHP).toLocaleString());
console.log('일반 ' + n + '번째 스테이지 목표 totalHP:', Math.round(endHP).toLocaleString());
console.log('');

// ── 보스 현황 ──
console.log('=== 보스 HP 현황 (변경 없음) ===');
bossWaves.forEach(w => {
    console.log('R' + String(w.round).padStart(2) + ' | 1마리 | HP: ' + monsters[w.monsterId].hp.toLocaleString());
});
console.log('');

// ── 일반 몬스터 재설정 미리보기 ──
console.log('=== 일반 몬스터 HP 재설정 계획 ===');
console.log('Pos | Round | 마리수 | 현재totalHP | 목표totalHP | 현재HP | 신규HP');
console.log('----|-------|-------|------------|------------|-------|-------');

let issues = [];
normalData.forEach(d => {
    const targetTotal = Math.round(a + b * d.pos);
    const newHP       = Math.max(300, Math.round(targetTotal / d.count));
    const actualTotal = newHP * d.count;
    console.log(
        String(d.pos).padStart(3) + ' | ' +
        ('R'+d.round).padStart(5) + ' | ' +
        String(d.count).padStart(5) + ' | ' +
        String(d.totalHP).padStart(11) + ' | ' +
        String(targetTotal).padStart(11) + ' | ' +
        String(d.hp).padStart(6) + ' | ' +
        String(newHP).padStart(6)
    );
    if (newHP < 300) issues.push('R'+d.round + ' HP가 300 미만');
});

if (issues.length > 0) {
    console.log('\n⚠️  경고:', issues.join(', '));
}

console.log('\n단조 증가 여부 확인 중...');
let prev = 0, monotone = true;
normalData.forEach((d, i) => {
    const targetTotal = Math.round(a + b * (i+1));
    if (targetTotal < prev) { monotone = false; }
    prev = targetTotal;
});
console.log(monotone ? '✅ 단조 증가 확인' : '❌ 단조 증가 실패 - 범위 수동 지정 필요');
