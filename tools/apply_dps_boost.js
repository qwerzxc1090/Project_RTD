/**
 * 일반/폭발/진동/일반_연 타워 DPS 상향
 * - 낮은 등급: +5%  (normal)
 * - 높은 등급: +15% (primordial)
 * - 등급별 선형 보간
 * - damage 값을 곱해 DPS 증가 (attackSpeed 유지)
 */
const fs = require('fs');

const TIER_ORDER = ['normal','rare','ancient','relic','saga','legend','epic','myth','primordial'];
const MIN_BOOST  = 0.05;
const MAX_BOOST  = 0.15;
const N          = TIER_ORDER.length - 1; // 8

function tierMultiplier(tier) {
    var idx = TIER_ORDER.indexOf(tier);
    if (idx === -1) return 1.0;
    return 1 + MIN_BOOST + (MAX_BOOST - MIN_BOOST) * idx / N;
}

// 대상 attackType
const TARGET_TYPES = ['normal', 'explosive', 'vibration'];
// _yeon 타워는 attackType이 'normal'이지만 skillId=4로 구분
const YEON_SKILL_ID = 4;

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const units = stats.units;

console.log('=== 타워 DPS 상향 (5% ~ 15%) ===\n');

// 헤더
console.log('타입     | 등급         | ID           | 이전dmg | 신규dmg | 배율    | 이전DPS    | 신규DPS');
console.log('---------|--------------|--------------|---------|---------|---------|------------|----------');

var changed = 0;

Object.values(units).forEach(function(u) {
    var isYeon = (u.skillId === YEON_SKILL_ID);
    var isTarget = TARGET_TYPES.indexOf(u.attackType) !== -1;

    if (!isTarget) return;

    var mult = tierMultiplier(u.tier);
    var oldDmg = u.damage;
    var newDmg = Math.round(oldDmg * mult);

    var oldDPS = (oldDmg / (u.attackSpeed / 1000)).toFixed(1);
    var newDPS = (newDmg / (u.attackSpeed / 1000)).toFixed(1);

    var typeLabel = isYeon ? '일반_연  ' : (u.attackType === 'normal' ? '일반     ' : u.attackType === 'explosive' ? '폭발     ' : '진동     ');
    var pct = ((mult - 1) * 100).toFixed(2) + '%';

    console.log(
        typeLabel + ' | ' +
        u.tier.padEnd(12) + ' | ' +
        u.id.padEnd(12) + ' | ' +
        String(oldDmg).padStart(7) + ' | ' +
        String(newDmg).padStart(7) + ' | ' +
        ('+' + pct).padStart(7) + ' | ' +
        oldDPS.padStart(10) + ' | ' +
        newDPS.padStart(8)
    );

    u.damage = newDmg;
    changed++;
});

console.log('\n총 변경: ' + changed + '개 타워');

// 저장
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
console.log('✅ stats.json 저장 완료');

// ── data-editor.html 동기화 ──
const htmlPath = 'tools/data-editor.html';
let html = fs.readFileSync(htmlPath, 'utf8');
const unitLines = Object.values(units).map(function(u) {
    return '  {id:"' + u.id + '", name:"' + u.name + '", tier:"' + u.tier + '", attackType:"' + u.attackType + '", damage:' + u.damage + ', attackSpeed:' + u.attackSpeed + ', range:' + u.range + ', skillId:' + u.skillId + ', gradeScore:' + u.gradeScore + ', gachaAvailable:' + u.gachaAvailable + '}';
});
const newUnits = 'const DEFAULT_UNITS = [\n' + unitLines.join(',\n') + '\n];';
html = html.replace(/const DEFAULT_UNITS = \[[\s\S]*?\];(\r?\n)/, newUnits + '$1');
fs.writeFileSync(htmlPath, html);
console.log('✅ data-editor.html 동기화 완료');
