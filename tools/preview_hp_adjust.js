const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const waves = stats.waves;
const monsters = stats.monsters;
const normalWaves = waves.filter(w => !monsters[w.monsterId].isBoss);

// 1. 구간별 증감 적용
const scaledData = normalWaves.map((w, i) => {
    const m = monsters[w.monsterId];
    let multiplier = 1.0;
    if (w.round >= 1 && w.round <= 20) multiplier = 1.06;
    else if (w.round >= 21 && w.round <= 30) multiplier = 1.03;
    else if (w.round >= 31 && w.round <= 40) multiplier = 0.96;
    else if (w.round >= 41 && w.round <= 50) multiplier = 0.92;

    return {
        pos: i + 1,
        round: w.round,
        count: w.count,
        oldHP: m.hp,
        scaledHP: m.hp * multiplier
    };
});

// 2. 선형 조정을 위한 선형 회귀(OLS) 계산 (개별 HP 기준)
const n = scaledData.length;
const sumX = scaledData.reduce((s, d) => s + d.pos, 0);
const sumY = scaledData.reduce((s, d) => s + d.scaledHP, 0);
const sumXY = scaledData.reduce((s, d) => s + d.pos * d.scaledHP, 0);
const sumX2 = scaledData.reduce((s, d) => s + d.pos * d.pos, 0);

const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const inter = (sumY - slope * sumX) / n;

console.log('=== 구간별 증감 후 선형 조정 결과 미리보기 ===');
console.log('Round | 마리수 | 기존 HP | 증감적용 HP | 최종 선형 HP | 토탈 HP');
console.log('------|-------|---------|------------|------------|--------');

scaledData.forEach(d => {
    // 선형 수식에 맞춘 최종 HP
    let finalHP = Math.round(inter + slope * d.pos);
    
    // R49의 경우 이전처럼 토탈 HP 기준으로 맞출지 확인하기 위해 출력
    let totalHP = finalHP * d.count;

    console.log(
        ('R'+d.round).padEnd(5) + ' | ' +
        String(d.count).padStart(5) + ' | ' +
        String(d.oldHP).padStart(7) + ' | ' +
        String(Math.round(d.scaledHP)).padStart(10) + ' | ' +
        String(finalHP).padStart(10) + ' | ' +
        totalHP.toLocaleString().padStart(9)
    );
});

console.log('\n[참고] 선형 공식: HP = ' + inter.toFixed(2) + ' + ' + slope.toFixed(2) + ' * pos');
