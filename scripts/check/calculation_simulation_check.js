const fs = require('fs');
const vm = require('vm');
const simulator = require('../../js/systems/CalculationSimulator.js');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), context);

const options = {
  iterations: 1000,
  seedBase: 0x9e3779b9,
  units: stats.units,
  skills: stats.skills,
  monsters: stats.monsters,
  waves: stats.waves,
  autoGachaInterval: 1111,
  autoSynthesisDelay: 3000,
  config: context.window.Game.Config
};

const first = simulator.run(options);
const second = simulator.run(options);
const precision = simulator.run(Object.assign({}, options, { iterations: 20, accuracyLevel: 10 }));
const spatial = simulator.run(Object.assign({}, options, { iterations: 1, accuracyLevel: 11 }));
const projectile = simulator.run(Object.assign({}, options, { iterations: 1, accuracyLevel: 12 }));
const specialPrecision = simulator.run(Object.assign({}, options, {
  iterations: 1, accuracyLevel: 13, maxDurationMs: 1,
  units: stats.units.map((unit) => Object.assign({}, unit, { gachaAvailable: false }))
}));
const derivedGachaUnits = stats.units.map((unit) => Object.assign({}, unit, {
  gachaAvailable: ['n1_yeon', 'n1_dok', 'n1_don'].includes(unit.id)
}));
const derivedEligibleIds = simulator.getGachaEligibleUnits(derivedGachaUnits)
  .map((unit) => unit.id)
  .sort();
function runSpecialTowerProbe(id) {
  const unit = Object.assign({}, stats.units.find((item) => item.id === id), {
    gachaAvailable: true, damage: 100, attackSpeed: 500, range: 999, criticalRate: 0
  });
  const skill = Object.assign({}, stats.skills[unit.skillId]);
  if (/_don$/.test(id)) Object.assign(skill, { attacksToReward: 1, goldReward: 10, goldRewardDelta: -100 });
  if (/_dok$/.test(id)) Object.assign(skill, {
    poisonDuration: 5000, tickRate: 500, maxPoisonStacks: 3, poisonDamageRatio: 1
  });
  if (/_yeon$/.test(id)) Object.assign(skill, { bounceCount: 5, bounceDamageMultiplier: 0.85 });
  return simulator.simulateOne({
    units: [unit], skills: { [unit.skillId]: skill },
    monsters: { 1: { id: 1, type: 'small', hp: 999999, speed: 0.1, goldReward: 0, isBoss: true } },
    waves: [{ round: 1, monsterId: 1, count: 1, timeAttack: true, timeLimit: 20, spawnInterval: 100 }],
    autoGachaInterval: 1, autoSynthesisDelay: 1, accuracyLevel: 13,
    config: Object.assign({}, context.window.Game.Config, {
      TOTAL_ROUNDS: 1, INITIAL_GOLD: 100, GACHA_COST: 100,
      GACHA_RATES: { normal: 100 }, SYNTHESIS_RATES: { rare: 100 }, MAX_MONSTERS: 50
    })
  }, 123);
}
const goldProbe = runSpecialTowerProbe('n1_don');
const poisonProbe = runSpecialTowerProbe('n1_dok');
const chainProbe = runSpecialTowerProbe('n1_yeon');
const timed = simulator.run(Object.assign({}, options, {
  iterations: 100000, accuracyLevel: 10, maxDurationMs: 1
}));
const nextOptions = Object.assign({}, options, {
  seedBase: (options.seedBase + Math.imul(options.iterations, 97)) >>> 0
});
const nextBatch = simulator.run(nextOptions);
const merged = simulator.mergeAggregates(first, nextBatch);
let parallelEquivalent = null;
const partitionCount = 4;
for (let partition = 0; partition < partitionCount; partition++) {
  const startOffset = Math.floor(options.iterations * partition / partitionCount);
  const endOffset = Math.floor(options.iterations * (partition + 1) / partitionCount);
  const partitionResult = simulator.run(Object.assign({}, options, {
    iterations: endOffset - startOffset,
    seedBase: (options.seedBase + Math.imul(startOffset, 97)) >>> 0
  }));
  parallelEquivalent = simulator.mergeAggregates(parallelEquivalent, partitionResult);
}
const failureTotal = first.failCounts.reduce((sum, count) => sum + count, 0);

if (simulator.crowdUtilization(0.1, 10) <= simulator.crowdUtilization(0.1, 1)) {
  throw new Error('활성 몬스터 군집 가동률 증가 불일치');
}
if (JSON.stringify(derivedEligibleIds) !== JSON.stringify(['n1_dok', 'n1_don', 'n1_yeon'])) {
  throw new Error('gachaAvailable 기반 파생 타워 풀 반영 불일치');
}

if (first.total !== options.iterations) throw new Error('총 실행 횟수 불일치');
if (precision.assumptions.accuracyLevel !== 10 || precision.total !== 20) {
  throw new Error('정확도 10 실행 경로 불일치');
}
if (spatial.assumptions.accuracyLevel !== 11 || spatial.total !== 1 || spatial.precisionLimitHits !== 0) {
  throw new Error('정확도 11 공간 전투 경로 불일치');
}
if (projectile.assumptions.accuracyLevel !== 12 || projectile.total !== 1 || projectile.precisionLimitHits !== 0) {
  throw new Error('정확도 12 투사체 전투 경로 불일치');
}
if (specialPrecision.assumptions.accuracyLevel !== 13 ||
    !/연쇄.*독.*돈/.test(specialPrecision.assumptions.specialTowerSimulation || '')) {
  throw new Error('정확도 13 파생 타워 정밀 경로 메타데이터 불일치');
}
if (goldProbe.specialEventCounts.goldRewards < 1 || goldProbe.specialEventCounts.goldFarmCompletions < 1) {
  throw new Error('정확도 13 _돈 공격 횟수 골드·파밍 완료 경로 불일치');
}
if (poisonProbe.specialEventCounts.poisonApplications < 1 || poisonProbe.specialEventCounts.poisonTicks < 1) {
  throw new Error('정확도 13 _독 중첩·틱 경로 불일치');
}
if (chainProbe.specialEventCounts.chainHits < 2) {
  throw new Error('정확도 13 _연 연쇄·감쇠 경로 불일치');
}
if (!timed.stoppedByTimeLimit || timed.total >= timed.requestedIterations) {
  throw new Error('시간 제한 중단 또는 완료 표본 집계 불일치');
}
if (first.clears + first.failures !== first.total) throw new Error('클리어·실패 합계 불일치');
if (failureTotal !== first.failures) throw new Error('라운드별 실패 합계 불일치');
if (first.clears !== second.clears ||
    JSON.stringify(first.failCounts) !== JSON.stringify(second.failCounts)) {
  throw new Error('동일 시드 재현성 불일치');
}
if (merged.total !== first.total + nextBatch.total) throw new Error('누적 실행 횟수 불일치');
if (merged.clears !== first.clears + nextBatch.clears ||
    merged.failures !== first.failures + nextBatch.failures) {
  throw new Error('누적 클리어·실패 합계 불일치');
}
if (parallelEquivalent.total !== first.total ||
    parallelEquivalent.clears !== first.clears ||
    parallelEquivalent.failures !== first.failures ||
    parallelEquivalent.failRoundSum !== first.failRoundSum ||
    JSON.stringify(parallelEquivalent.failCounts) !== JSON.stringify(first.failCounts) ||
    JSON.stringify(parallelEquivalent.recentClearGs) !== JSON.stringify(first.recentClearGs)) {
  throw new Error('병렬 분할·병합 결과가 단일 실행과 불일치');
}
for (let round = 1; round <= 52; round++) {
  if (merged.failCounts[round] !== first.failCounts[round] + nextBatch.failCounts[round]) {
    throw new Error('누적 라운드 실패 합계 불일치: R' + round);
  }
}

console.log('PASS CALCULATION_SIMULATION (' + merged.total + '회 누적, seed 재현, 병렬 집계 일치)');
