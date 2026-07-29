const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const m = stats.monsters;
const changes = [];

// ── 1. 전체 보스 HP +15% ──
console.log('[1] 전체 보스 HP +15%');
Object.entries(m).forEach(([r, mo]) => {
    if (!mo.isBoss) return;
    const old = mo.hp;
    mo.hp = Math.round(old * 1.15);
    changes.push({ r: parseInt(r), old, hp: mo.hp });
    console.log(`  R${r}(보스) ${old} → ${mo.hp}`);
});

// ── 2. R21-40 일반 몬스터: 0% → 10% 선형 증가 ──
console.log('\n[2] R21-40 일반 몬스터 HP +0%→+10% 선형');
for (let r = 21; r <= 40; r++) {
    const mo = m[r];
    if (!mo || mo.isBoss) continue;
    const rate = 10 * (r - 21) / 19;   // R21=0%, R40=10%
    const old = mo.hp;
    mo.hp = Math.round(old * (1 + rate / 100));
    changes.push({ r, old, hp: mo.hp });
    console.log(`  R${r}: +${rate.toFixed(2)}% → ${old} → ${mo.hp}`);
}

// ── 3. R41-50 일반 몬스터: 11% → 20% 선형 증가 ──
console.log('\n[3] R41-50 일반 몬스터 HP +11%→+20% 선형');
for (let r = 41; r <= 50; r++) {
    const mo = m[r];
    if (!mo || mo.isBoss) continue;
    const rate = 10 + 10 * (r - 40) / 10;   // R41=11%, R50=20%
    const old = mo.hp;
    mo.hp = Math.round(old * (1 + rate / 100));
    changes.push({ r, old, hp: mo.hp });
    console.log(`  R${r}: +${rate.toFixed(1)}% → ${old} → ${mo.hp}`);
}

// ── 4. stats.json 저장 ──
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('\nstats.json 저장 완료');

// ── 5. data-editor.html 동기화 ──
let edCount = 0;
changes.forEach(c => {
    const re = new RegExp(
        '({ id: ' + c.r + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)", 'g'
    );
    html = html.replace(re, (match, pre, post) => { edCount++; return pre + c.hp + post; });
});
fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log(`data-editor.html 동기화: ${edCount}개`);
