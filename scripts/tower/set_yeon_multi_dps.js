const fs = require('fs');

const statsPath = 'assets/data/stats.json';
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
const skill = stats.skills && stats.skills['4'];

if (!skill) throw new Error('연쇄 번개 스킬(id=4)을 찾을 수 없습니다.');

const bounceCount = Number(skill.bounceCount);
const decay = Number(skill.bounceDamageMultiplier);
if (!Number.isInteger(bounceCount) || bounceCount < 1 || !Number.isFinite(decay) || decay < 0) {
    throw new Error('연쇄 번개 횟수 또는 감쇠율이 올바르지 않습니다.');
}

const targetMultiRatio = 1.25;
const multiMultiplier = Array.from({ length: bounceCount }, (_, index) => decay ** index)
    .reduce((sum, value) => sum + value, 0);
// 적이 한 기뿐이면 적→타워 왕복에도 bounceCount가 소모된다.
const singleHitCount = Math.ceil(bounceCount / 2);
const singleMultiplier = Array.from({ length: singleHitCount }, (_, index) => decay ** index)
    .reduce((sum, value) => sum + value, 0);

const byId = new Map(stats.units.map(unit => [unit.id, unit]));
const results = [];

for (const yeon of stats.units.filter(unit => unit.id.endsWith('_yeon'))) {
    const baseId = yeon.id.slice(0, -'_yeon'.length);
    const base = byId.get(baseId);
    if (!base) throw new Error(`${yeon.id}의 기본형 ${baseId}을 찾을 수 없습니다.`);
    if (base.tier !== yeon.tier || base.attackType !== yeon.attackType) {
        throw new Error(`${base.id} ↔ ${yeon.id}의 등급 또는 공격 타입이 일치하지 않습니다.`);
    }

    const preservedAttackSpeed = yeon.attackSpeed;
    const preservedRange = yeon.range;
    const baseDps = base.damage / (base.attackSpeed / 1000);
    const oldDamage = yeon.damage;
    yeon.damage = Math.max(1, Math.round(
        baseDps * targetMultiRatio * (yeon.attackSpeed / 1000) / multiMultiplier
    ));

    if (yeon.attackSpeed !== preservedAttackSpeed || yeon.range !== preservedRange) {
        throw new Error(`${yeon.id}의 공격속도 또는 사정거리가 변경됐습니다.`);
    }

    const singleRatio = (yeon.damage / (yeon.attackSpeed / 1000) * singleMultiplier) / baseDps;
    const multiRatio = (yeon.damage / (yeon.attackSpeed / 1000) * multiMultiplier) / baseDps;
    if (multiRatio < 1.20 || multiRatio > 1.30) {
        throw new Error(`${yeon.id} 다수 대상 DPS 비율이 범위를 벗어났습니다: ${(multiRatio * 100).toFixed(2)}%`);
    }
    results.push({
        id: yeon.id,
        baseId,
        attackType: yeon.attackType,
        tier: yeon.tier,
        oldDamage,
        damage: yeon.damage,
        attackSpeed: yeon.attackSpeed,
        range: yeon.range,
        singleRatio,
        multiRatio
    });
}

if (results.length !== 27) throw new Error(`_연 타워 수가 27종이 아닙니다: ${results.length}`);

fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n', 'utf8');

for (const result of results) {
    console.log(
        `${result.id}: ${result.oldDamage} → ${result.damage}, ` +
        `단일 ${(result.singleRatio * 100).toFixed(2)}%, 다수 ${(result.multiRatio * 100).toFixed(2)}%`
    );
}
