const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const m = stats.monsters;

const changes = [];

// ── 1. 일반 몬스터 R1-24: 18% → 0% 선형 감소 ──
console.log('[1] 일반 몬스터 R1-24 HP 감소 (R1=-18%, R24=0%)');
for (let r = 1; r <= 24; r++) {
    const mo = m[r];
    if (!mo || mo.isBoss) continue;
    const rate = 18 * (24 - r) / 23;  // R1=18%, R24=0%
    const old = mo.hp;
    mo.hp = Math.round(old * (1 - rate / 100));
    const scaled = Math.floor(mo.hp * (1 + r * 0.1));
    changes.push({ r, old, hp: mo.hp });
    console.log(`  R${r}: -${rate.toFixed(1)}% → ${old} → ${mo.hp} (scaled=${scaled})`);
}

// ── 2. 보스 HP 감소 ──
console.log('\n[2] 보스 HP 감소');
const bossRates = { 8: 0.12, 16: 0.08, 24: 0.04 };
Object.entries(bossRates).forEach(([r, rate]) => {
    const mo = m[r];
    if (!mo || !mo.isBoss) return;
    const old = mo.hp;
    mo.hp = Math.round(old * (1 - rate));
    const scaled = Math.floor(mo.hp * (1 + parseInt(r) * 0.1));
    changes.push({ r: parseInt(r), old, hp: mo.hp });
    console.log(`  R${r}(보스): -${(rate*100).toFixed(0)}% → ${old} → ${mo.hp} (scaled=${scaled})`);
});

// ── 3. stats.json 저장 ──
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
console.log('\nstats.json 저장 완료');

// ── 4. data-editor.html HP 동기화 ──
let edHp = 0;
changes.forEach(c => {
    const re = new RegExp(
        "({ id: " + c.r + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)", 'g'
    );
    html = html.replace(re, (match, pre, post) => { edHp++; return pre + c.hp + post; });
});
fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log(`data-editor.html HP 동기화: ${edHp}개`);
