const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const waves = stats.waves;
const monsters = stats.monsters;
const normalWaves = waves.filter(w => !monsters[w.monsterId].isBoss);

// 1. 구간별 증감 적용 (R49는 Total HP 예외 처리용으로 OLS에서는 제외)
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
        monsterId: w.monsterId,
        count: w.count,
        oldHP: m.hp,
        scaledHP: m.hp * multiplier
    };
});

// OLS 계산 (R1~R47 구간)
const dataForOLS = scaledData.filter(d => d.round <= 47);
const n = dataForOLS.length;
const sumX = dataForOLS.reduce((s, d) => s + d.pos, 0);
const sumY = dataForOLS.reduce((s, d) => s + d.scaledHP, 0);
const sumXY = dataForOLS.reduce((s, d) => s + d.pos * d.scaledHP, 0);
const sumX2 = dataForOLS.reduce((s, d) => s + d.pos * d.pos, 0);

const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
const inter = (sumY - slope * sumX) / n;

console.log('=== 구간별 증감 및 선형 조정 적용 ===');
console.log('Round | 마리수 | 기존 HP | 신규 선형 HP | 토탈 HP');
console.log('------|-------|---------|-------------|---------');

let r46Total = 0;
let r47Total = 0;

scaledData.forEach(d => {
    let finalHP = 0;
    
    if (d.round <= 47) {
        finalHP = Math.round(inter + slope * d.pos);
        monsters[d.monsterId].hp = finalHP;
        
        if (d.round === 46) r46Total = finalHP * d.count;
        if (d.round === 47) r47Total = finalHP * d.count;
    } else if (d.round === 49) {
        // R49: R46~R47의 토탈 HP 증가량을 기반으로 R47 대비 +2 라운드 증가
        const diff = r47Total - r46Total;
        const targetTotalHP = r47Total + (diff * 2);
        finalHP = Math.round(targetTotalHP / d.count);
        monsters[d.monsterId].hp = finalHP;
    }

    console.log(
        ('R'+d.round).padEnd(5) + ' | ' +
        String(d.count).padStart(5) + ' | ' +
        String(d.oldHP).padStart(7) + ' | ' +
        String(finalHP).padStart(11) + ' | ' +
        (finalHP * d.count).toLocaleString().padStart(9)
    );
});

// 저장
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2));
console.log('\n✅ stats.json 저장 완료');

// data-editor 동기화
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const lines = Object.values(stats.monsters).map(m => {
    const img = m.imagePath || '';
    return "    { id: " + String(m.id).padStart(2) + ", name: '" + m.name + "', type: '" + m.type + "', hp: " + m.hp + ", speed: " + m.speed + ", goldReward: " + m.goldReward + ", isBoss: " + m.isBoss + ", imagePath: '" + img + "' }";
});
const newM = 'const DEFAULT_MONSTERS = [\n' + lines.join(',\n') + '\n    ];';
html = html.replace(/const DEFAULT_MONSTERS = \[[\s\S]*?\];(\r?\n)/, newM + '$1');
fs.writeFileSync('tools/data-editor.html', html);
console.log('✅ data-editor.html 동기화 완료');
