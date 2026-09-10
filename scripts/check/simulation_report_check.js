const report = require('../../js/systems/SimulationReport.js');

const devRows = [
  { win: true, round: 52, time: 100, gs: 200, hpAvg: { early: 20, mid: 15, late: 10 } },
  { win: false, round: 20, time: 50, gs: 100, failCategory: 'normal', failReason: 'normal_life' },
  { win: false, round: 40, time: 70, gs: 150, failCategory: 'boss', failReason: 'boss_timeout' }
];
const calc = {
  version: 6, model: 'quality-scaled-event-v6', total: 100, clears: 50, failures: 50,
  clearGsSum: 10000, clearGsCount: 50, failGsSum: 5000, failGsCount: 50,
  failRoundSum: 1500, totalTime: 8000, normalFails: 30, bossFails: 20, bossTimeouts: 10,
  failCounts: Array(53).fill(0), failGsSums: Array(53).fill(0), failGsCounts: Array(53).fill(0),
  hpSums: { early: 2000, mid: 1500, late: 1000 }, hpCounts: { early: 100, mid: 100, late: 100 },
  assumptions: { accuracyLevel: 10 }, requestedIterations: 100, wallElapsedMs: 8400
};
calc.failCounts[20] = 30;
calc.failCounts[40] = 20;

const result = report.build(devRows, calc, { totalRounds: 52 });
if (result.dev.total !== 3 || result.dev.clears !== 1 || result.dev.failures !== 2) throw new Error('DEV 집계 불일치');
if (result.dev.bossTimeouts !== 1 || result.dev.averageFailureRound !== 30) throw new Error('DEV 실패 집계 불일치');
if (result.calculation.total !== 100 || result.calculation.topFailureRounds[0].round !== 20) throw new Error('계산 집계 불일치');
if (result.calculation.accuracyLevel !== 10 || result.calculation.wallElapsedMs !== 8400) throw new Error('품질 메타데이터 불일치');
if (result.comparison.clearRateGapPp !== -16.67) throw new Error('비교 클리어율 불일치');
if (!Array.isArray(result.comparison.notes) || !result.generatedAt) throw new Error('리포트 메타데이터 누락');

console.log('PASS SIMULATION_REPORT (정규화, 신뢰구간, 비교 분석)');
