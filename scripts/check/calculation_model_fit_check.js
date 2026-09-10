const fs = require('fs');
const vm = require('vm');
const simulator = require('../../js/systems/CalculationSimulator.js');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));

const context = { window: {} };
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), context);

const aggregate = simulator.run({
  iterations: 2000,
  seedBase: 0x9e3779b9,
  units: stats.units,
  skills: stats.skills,
  monsters: stats.monsters,
  waves: stats.waves,
  autoGachaInterval: 1111,
  autoSynthesisDelay: 3000,
  config: context.window.Game.Config
});

const earlyFailureShare = (aggregate.failCounts[3] + aggregate.failCounts[4]) /
  Math.max(1, aggregate.failures) * 100;
const averageFailureRound = aggregate.failRoundSum / Math.max(1, aggregate.failures);
const bossFailureShare = aggregate.bossFails / Math.max(1, aggregate.failures) * 100;

// 976회 DEV 기준: R3~R4 3.96%, 평균 실패 R22.25, 보스 실패 51.93%.
// 계산 모델은 정확한 복제가 아니라도 기존의 R3~R4 85.61% 집중 상태로 회귀하면 안 된다.
if (earlyFailureShare >= 15) throw new Error('R3~R4 조기 실패가 다시 과대 추정됨: ' + earlyFailureShare.toFixed(2) + '%');
if (averageFailureRound < 15 || averageFailureRound > 30) {
  throw new Error('평균 실패 라운드가 DEV 허용 범위를 벗어남: R' + averageFailureRound.toFixed(2));
}
if (bossFailureShare < 20) throw new Error('보스 관문 실패를 충분히 재현하지 못함: ' + bossFailureShare.toFixed(2) + '%');

console.log('PASS CALCULATION_MODEL_FIT (' +
  'R3~R4=' + earlyFailureShare.toFixed(2) + '%, ' +
  '평균실패=R' + averageFailureRound.toFixed(2) + ', ' +
  '보스실패=' + bossFailureShare.toFixed(2) + '%)');
