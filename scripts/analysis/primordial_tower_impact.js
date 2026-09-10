const fs = require('fs');
const vm = require('vm');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const configContext = { window: {} };
vm.createContext(configContext);
vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), configContext);

let source = fs.readFileSync('js/systems/CalculationSimulator.js', 'utf8');
source = source.replace(
  'totalRounds: Number(config.TOTAL_ROUNDS || 52),',
  'initialUnitId: options.initialUnitId || null,\n            totalRounds: Number(config.TOTAL_ROUNDS || 52),'
);
source = source.replace(
  'var precisionEventLimit = prepared.accuracyLevel >= 12 ? 500000 :',
  "if (prepared.initialUnitId && prepared.profiles[prepared.initialUnitId]) {\n" +
  "            addTower(prepared.profiles[prepared.initialUnitId].unit);\n" +
  "        }\n\n        var precisionEventLimit = prepared.accuracyLevel >= 12 ? 500000 :"
);
const moduleContext = { module: { exports: {} }, exports: {}, console };
vm.runInNewContext(source, moduleContext);
const simulator = moduleContext.module.exports;

const iterations = Number(process.argv[2] || 20000);
const accuracyLevel = Number(process.argv[3] || 8);
const common = {
  iterations,
  seedBase: 0x71c3a5d9,
  accuracyLevel,
  units: stats.units,
  skills: stats.skills,
  monsters: stats.monsters,
  waves: stats.waves,
  config: configContext.window.Game.Config,
  autoGachaInterval: 1111,
  autoSynthesisDelay: 3000
};

function summarize(id) {
  const result = simulator.run(Object.assign({}, common, id ? { initialUnitId: id } : {}));
  return {
    id: id || 'baseline',
    total: result.total,
    clears: result.clears,
    clearRate: result.clears / result.total * 100,
    averageFailureRound: result.failures ? result.failRoundSum / result.failures : 52,
    averageFailureScore: result.failGsCount ? result.failGsSum / result.failGsCount : 0
  };
}

const results = [summarize(null), summarize('p1'), summarize('p2'), summarize('p3')];
const mixed = {
  id: 'equal-mix',
  total: results.slice(1).reduce((sum, value) => sum + value.total, 0),
  clears: results.slice(1).reduce((sum, value) => sum + value.clears, 0),
  clearRate: results.slice(1).reduce((sum, value) => sum + value.clearRate, 0) / 3,
  averageFailureRound: results.slice(1).reduce((sum, value) => sum + value.averageFailureRound, 0) / 3,
  averageFailureScore: results.slice(1).reduce((sum, value) => sum + value.averageFailureScore, 0) / 3
};
console.log(JSON.stringify({ iterationsPerCase: iterations, accuracyLevel, results, mixed }, null, 2));
