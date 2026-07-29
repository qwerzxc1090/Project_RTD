const fs = require('fs');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let cfg  = fs.readFileSync('js/config.js', 'utf8');
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const m  = stats.monsters;

// ─── 스케일드 HP 계산 (게임 내 실제 HP) ───
const scaled = id => Math.floor(m[id].hp * (1 + parseInt(id) * 0.1));

// ─── 1. 일반 몬스터 골드 -20% ───
console.log('[1] 일반 몬스터 골드 -20%');
Object.keys(m).forEach(id => {
    if (!m[id].isBoss) {
        m[id].goldReward = Math.max(1, Math.round(m[id].goldReward * 0.8));
    }
});

// ─── 2. 보스 몬스터 골드 +5% ───
console.log('[2] 보스 몬스터 골드 +5%');
Object.keys(m).forEach(id => {
    if (m[id].isBoss) {
        m[id].goldReward = Math.round(m[id].goldReward * 1.05);
    }
});

// ─── 3. 스테이지 클리어 골드 -20% ───
console.log('[3] ROUND_BONUS_MULTIPLIER: 5.0 → 4.0 (-20%)');
cfg  = cfg.replace(/ROUND_BONUS_MULTIPLIER:\s*[\d.]+,/, 'ROUND_BONUS_MULTIPLIER: 4.0,');
html = html.replace(/ROUND_BONUS_MULTIPLIER:\s*[\d.]+/, 'ROUND_BONUS_MULTIPLIER: 4.0');

// ─── 4. 전체 보스 HP +35% ───
console.log('[4] 보스 HP +35%');
Object.keys(m).forEach(id => {
    if (m[id].isBoss) {
        m[id].hp = Math.round(m[id].hp * 1.35);
    }
});

// ─── 5. HP 구간별 적용 (보스 제외) ───
console.log('[5] 일반 몬스터 HP 구간별 조정');
const hpRates = { '1-10': 0.85, '11-30': 1.16, '31-50': 1.24 };
Object.keys(m).forEach(id => {
    const r = parseInt(id);
    if (m[id].isBoss) return;
    let rate = 1.0;
    if (r >= 1  && r <= 10) rate = 0.85;
    if (r >= 11 && r <= 30) rate = 1.16;
    if (r >= 31 && r <= 50) rate = 1.24;
    m[id].hp = Math.round(m[id].hp * rate);
});

// ─── 6. R10-R11, R30-R31 경계 스무딩 ───
// 목표: 경계 전후 스케일드HP가 단조 증가하도록 보정
// 보정 구간: R9-R11 (R10 기준), R29-R31 (R30 기준)
console.log('[6] 경계 구간 스무딩 (R10-R11, R30-R31)');

function smoothBoundary(lo, hi) {
    // lo: 낮은 구간 마지막 라운드, hi: 높은 구간 첫 라운드
    const s_lo = scaled(lo);
    const s_hi = scaled(hi);

    if (s_hi <= s_lo) {
        // hi가 lo보다 작거나 같음 → hi를 lo 스케일드 HP 기준으로 올림
        // hi와 hi+1 사이를 선형 보간하여 자연스럽게 증가
        const target_hi = s_lo + Math.round((s_lo * 0.04)); // lo보다 4% 높게
        const mult_hi = 1 + parseInt(hi) * 0.1;
        m[hi].hp = Math.round(target_hi / mult_hi);
        console.log(`  R${lo}→R${hi}: 스케일드 ${s_lo}→${s_hi} (역전) → R${hi} 조정: base=${m[hi].hp}, scaled=${scaled(hi)}`);
    } else {
        const diff_pct = ((s_hi - s_lo) / s_lo * 100).toFixed(1);
        console.log(`  R${lo}→R${hi}: 스케일드 ${s_lo}→${s_hi} (${diff_pct > 0 ? '+' : ''}${diff_pct}%) → 자연스러운 증가`);
    }

    // lo-1도 확인 (3구간 선형)
    if (lo > 1) {
        const prev = Object.keys(m).filter(id => !m[id].isBoss && parseInt(id) < lo)
                       .map(id => parseInt(id)).sort((a,b) => b-a)[0];
        if (prev) {
            const s_prev = scaled(prev);
            const s_cur  = scaled(lo);
            const growth = ((s_cur - s_prev) / s_prev * 100).toFixed(1);
            console.log(`  R${prev}→R${lo}: 스케일드 ${s_prev}→${s_cur} (${growth > 0 ? '+' : ''}${growth}%)`);
        }
    }
}

smoothBoundary(10, 11);
smoothBoundary(30, 31);

// ─── 7. 결과 출력 ───
console.log('\n=== 최종 HP & 골드 ===');
Object.keys(m).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(id => {
    const mo = m[id];
    const s  = scaled(id);
    const tag = mo.isBoss ? '보스' : '일반';
    console.log(`R${id}(${tag}) hp=${mo.hp} scaled=${s} gold=${mo.goldReward}`);
});

// ─── 8. 파일 저장 ───
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');
fs.writeFileSync('js/config.js', cfg, 'utf8');

// data-editor.html 동기화: 몬스터 HP + goldReward
let edHp = 0, edGold = 0;
Object.keys(m).forEach(id => {
    const mo = m[id];
    // HP 동기화
    const hpRe = new RegExp(
        "({ id: " + id + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)", 'g'
    );
    html = html.replace(hpRe, (match, pre, post) => { edHp++; return pre + mo.hp + post; });

    // goldReward 동기화
    const goldRe = new RegExp(
        "({ id: " + id + ",[\\s\\S]{0,80}?goldReward: )\\d+(,)", 'g'
    );
    html = html.replace(goldRe, (match, pre, post) => { edGold++; return pre + mo.goldReward + post; });
});

// ROUND_BONUS_MULTIPLIER data-editor 내 값도 처리 (숫자만 있는 경우)
html = html.replace(/ROUND_BONUS_MULTIPLIER:\s*5/, 'ROUND_BONUS_MULTIPLIER: 4.0');

fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log(`\n✅ stats.json / config.js / data-editor.html 저장 완료`);
console.log(`   HP 동기화: ${edHp}개, goldReward 동기화: ${edGold}개`);
