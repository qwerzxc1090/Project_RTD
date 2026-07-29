/**
 * 연쇄 번개(_yeon) 타워 단일 DPS → 일반 타워 90% 수준으로 상향
 *
 * 단일 배율(3회 타격): 1 + 0.85 + 0.85^2 = 2.5725
 * 멀티 배율(5회 타격): 1 + 0.85 + ... + 0.85^4 = 3.7097
 *
 * 새 damage 계수 = 0.90 × 1.4 / 2.5725 = 0.48980
 */
const fs = require('fs');

const SINGLE_MULT  = 1 + 0.85 + 0.85**2;             // 2.5725
const MULTI_MULT   = 1 + 0.85 + 0.85**2 + 0.85**3 + 0.85**4; // 3.7097
const SPD_FACTOR   = 1.4;
const TARGET_RATIO = 0.90;

const NEW_FACTOR   = (TARGET_RATIO * SPD_FACTOR) / SINGLE_MULT;  // 0.48980

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

// 기준 타워 ↔ 연쇄 타워 매핑
const pairs = [
    ['n1',  'n1_yeon'],
    ['r1',  'r1_yeon'],
    ['a1',  'a1_yeon'],
    ['e1',  'e1_yeon'],
    ['s1',  's1_yeon'],
    ['l1',  'l1_yeon'],
    ['ep1', 'ep1_yeon'],
    ['m1',  'm1_yeon'],
    ['p1',  'p1_yeon']
];

const units = stats.units;

console.log('=== 연쇄 번개 타워 DPS 상향 (단일: 70% → 90%) ===');
console.log('');
console.log('타워         | 이전dmg | 신규dmg |  일반DPS | 단일이전  |  단일신규 | 멀티이전  |  멀티신규');
console.log('-------------|---------|---------|----------|---------|----------|---------|----------');

const results = [];

pairs.forEach(function([baseId, yeonId]) {
    const base = Object.values(units).find(u => u.id === baseId);
    const yeon = Object.values(units).find(u => u.id === yeonId);
    if (!base || !yeon) return;

    const atkMs = yeon.attackSpeed;
    const baseDPS = base.damage / (base.attackSpeed / 1000);

    // 이전 값
    const oldDmg = yeon.damage;
    const oldSingleDPS = oldDmg * SINGLE_MULT / (atkMs / 1000);
    const oldMultiDPS  = oldDmg * MULTI_MULT  / (atkMs / 1000);

    // 신규 값 (기준 타워 damage 기반)
    const newDmg = Math.round(base.damage * NEW_FACTOR);
    const newSingleDPS = newDmg * SINGLE_MULT / (atkMs / 1000);
    const newMultiDPS  = newDmg * MULTI_MULT  / (atkMs / 1000);

    // 적용
    yeon.damage = newDmg;

    console.log(
        baseId.padEnd(12) + ' | ' +
        String(oldDmg).padStart(7) + ' | ' +
        String(newDmg).padStart(7) + ' | ' +
        baseDPS.toFixed(1).padStart(8) + ' | ' +
        oldSingleDPS.toFixed(1).padStart(7) + '  | ' +
        newSingleDPS.toFixed(1).padStart(7) + '  | ' +
        oldMultiDPS.toFixed(1).padStart(7) + '  | ' +
        newMultiDPS.toFixed(1).padStart(8)
    );

    results.push({ baseId, yeonId, baseDPS, oldDmg, newDmg,
        oldSingleDPS, newSingleDPS, oldMultiDPS, newMultiDPS,
        singleRatioOld: oldSingleDPS/baseDPS,
        singleRatioNew: newSingleDPS/baseDPS,
        multiRatioOld:  oldMultiDPS/baseDPS,
        multiRatioNew:  newMultiDPS/baseDPS
    });
});

const avgSingleOld = results.reduce((a,r)=>a+r.singleRatioOld,0)/results.length;
const avgSingleNew = results.reduce((a,r)=>a+r.singleRatioNew,0)/results.length;
const avgMultiOld  = results.reduce((a,r)=>a+r.multiRatioOld,0)/results.length;
const avgMultiNew  = results.reduce((a,r)=>a+r.multiRatioNew,0)/results.length;

console.log('');
console.log('=== 평균 비율 변화 ===');
console.log('단일 DPS: ' + (avgSingleOld*100).toFixed(1) + '% → ' + (avgSingleNew*100).toFixed(1) + '%');
console.log('멀티 DPS: ' + (avgMultiOld*100).toFixed(1)  + '% → ' + (avgMultiNew*100).toFixed(1) + '%');
console.log('새 damage 계수:', NEW_FACTOR.toFixed(5), '(구: 0.37730)');

// 저장
fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2));
console.log('\n✅ stats.json 저장 완료');

// data-editor 동기화
const htmlPath = 'tools/data-editor.html';
let html = fs.readFileSync(htmlPath, 'utf8');
const unitLines = Object.values(units).map(u => {
    const ga = u.gachaAvailable;
    return `  {id:"${u.id}", name:"${u.name}", tier:"${u.tier}", attackType:"${u.attackType}", damage:${u.damage}, attackSpeed:${u.attackSpeed}, range:${u.range}, skillId:${u.skillId}, gradeScore:${u.gradeScore}, gachaAvailable:${ga}}`;
});
const newUnits = `const DEFAULT_UNITS = [\n${unitLines.join(',\n')}\n];`;
html = html.replace(/const DEFAULT_UNITS = \[[\s\S]*?\];(\r?\n)/, newUnits + '$1');
fs.writeFileSync(htmlPath, html);
console.log('✅ data-editor.html 동기화 완료');
