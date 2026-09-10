/**
 * 50개 스테이지의 몬스터/경제 곡선을 재생성한다.
 *
 * 설계 목표
 * - 일반 몬스터 기준 HP: R1 500 → R50 기준 18,000 선형 증가
 * - R1~7 개별 HP: 기존 R6~7 수준인 1,140 → 1,320 선형 증가
 * - 초중반 HP 계수: R1~15 0.50, R16~30 0.51→0.83, R31~40 0.85→1.00
 * - 타임어택 보스 HP: 첫 보스 120,000 → 최종 보스 1,800,000 선형 증가
 * - 일반 스테이지 수량: R1 18 → R50 기준 36 선형 증가
 * - 처치 골드: R1 3 → R50 9 선형 증가
 * - 클리어 골드: R1 10 → R50 90 선형 증가
 * - 스폰 간격: R1 1,800ms → R50 1,200ms 선형 감소
 * - 일반 난이도 상향: HP ×1.50, 골드 ×1.25 (난이도 증가분의 50%)
 * - 보스 난이도 하향: HP ×0.70, 골드 ×0.91 (난이도 감소분의 30%)
 *
 * 보스 판정은 라운드 번호가 아니라 monster.isBoss 데이터만 사용한다.
 * 보스 수량 1도 시스템 규칙이 아니라 이 스테이지 데이터 생성 규칙이다.
 */
const fs = require('fs');
const path = require('path');

const statsPath = path.resolve(__dirname, '../../assets/data/stats.json');
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));

const lerp = (start, end, t) => start + (end - start) * t;
const roundTo = (value, unit) => Math.round(value / unit) * unit;
const getHpScale = round => {
  if (round <= 15) return 0.50;
  if (round <= 30) return lerp(0.51, 0.83, (round - 16) / 14);
  if (round <= 40) return lerp(0.85, 1.00, (round - 31) / 9);
  return 1.00;
};

const waves = stats.waves.slice().sort((a, b) => a.round - b.round);
const bossWaves = waves.filter(wave => {
  const monster = stats.monsters[String(wave.monsterId)];
  return monster && monster.isBoss;
});
const bossIndexByRound = new Map(bossWaves.map((wave, index) => [wave.round, index]));
const normalTypeCycle = ['small', 'large', 'general'];
const NORMAL_HP_MULTIPLIER = 1.50;
const NORMAL_GOLD_MULTIPLIER = 1.25;
const BOSS_HP_MULTIPLIER = 0.70;
const BOSS_GOLD_MULTIPLIER = 0.91;
let normalStageIndex = 0;

let totalMonsterHp = 0;
let totalKillGold = 0;
let totalClearGold = 0;
let totalCount = 0;

for (const wave of waves) {
  const monster = stats.monsters[String(wave.monsterId)];
  if (!monster) throw new Error(`R${wave.round}: monsterId ${wave.monsterId} 데이터가 없습니다.`);

  const stageT = (wave.round - 1) / 49;
  const bossIndex = bossIndexByRound.get(wave.round);
  const isBoss = bossIndex !== undefined;
  const hpScale = getHpScale(wave.round);

  if (isBoss) {
    const bossT = bossWaves.length > 1 ? bossIndex / (bossWaves.length - 1) : 1;
    monster.hp = roundTo(lerp(120000, 1800000, bossT) * hpScale * BOSS_HP_MULTIPLIER, 1000);
    wave.count = 1;
  } else {
    monster.type = normalTypeCycle[normalStageIndex % normalTypeCycle.length];
    normalStageIndex++;
    monster.hp = (wave.round <= 7
      ? roundTo(lerp(1140, 1320, (wave.round - 1) / 6), 10)
      : roundTo(lerp(500, 18000, stageT) * hpScale, 10)) * NORMAL_HP_MULTIPLIER;
    monster.hp = roundTo(monster.hp, 10);
    wave.count = Math.round(lerp(18, 36, stageT));
  }

  const goldMultiplier = isBoss ? BOSS_GOLD_MULTIPLIER : NORMAL_GOLD_MULTIPLIER;
  monster.goldReward = Math.max(1, Math.round(lerp(3, 9, stageT) * goldMultiplier * 10) / 10);
  wave.clearGoldBonus = Math.round(lerp(10, 90, stageT));
  wave.spawnInterval = roundTo(lerp(1800, 1200, stageT), 50);

  totalMonsterHp += monster.hp * wave.count;
  totalKillGold += monster.goldReward * wave.count;
  totalClearGold += wave.clearGoldBonus;
  totalCount += wave.count;
}

fs.writeFileSync(statsPath, JSON.stringify(stats, null, 2) + '\n');

const initialGold = 500;
const gachaCost = 100;
const basePulls = (initialGold + totalKillGold + totalClearGold) / gachaCost;
const slotCapacity = 120 * 4 + 10;

console.log('Linear stage rebalance complete');
console.log({
  stages: waves.length,
  bosses: bossWaves.length,
  totalCount,
  totalMonsterHp,
  totalKillGold,
  totalClearGold,
  basePulls: Number(basePulls.toFixed(2)),
  baseSlotSaturationPct: Number((basePulls / slotCapacity * 100).toFixed(2))
});
