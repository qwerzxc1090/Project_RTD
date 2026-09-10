const fs = require('fs');
const vm = require('vm');
const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const simulator = require('../../js/systems/CalculationSimulator.js');

const ITERATIONS = Number(process.argv[2] || 100000);
const WORKERS = Number(process.argv[3] || 4);
const ACCURACY = Number(process.argv[4] || 6);
const SEED_BASE = 0x9e3779b9;

if (!isMainThread) {
  const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
  const context = { window: {} };
  vm.createContext(context);
  vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), context);
  const aggregate = simulator.run({
    iterations: workerData.iterations,
    seedBase: workerData.seedBase,
    units: stats.units,
    skills: stats.skills,
    monsters: stats.monsters,
    waves: stats.waves,
    autoGachaInterval: 1111,
    autoSynthesisDelay: 3000,
    accuracyLevel: workerData.accuracyLevel,
    config: context.window.Game.Config
  });
  parentPort.postMessage(aggregate);
} else {
  const startedAt = Date.now();
  const tasks = [];
  for (let index = 0; index < WORKERS; index++) {
    const startOffset = Math.floor(ITERATIONS * index / WORKERS);
    const endOffset = Math.floor(ITERATIONS * (index + 1) / WORKERS);
    tasks.push(new Promise((resolve, reject) => {
      const worker = new Worker(__filename, { workerData: {
        iterations: endOffset - startOffset,
        seedBase: (SEED_BASE + Math.imul(startOffset, 97)) >>> 0,
        accuracyLevel: ACCURACY
      }});
      worker.once('message', resolve);
      worker.once('error', reject);
      worker.once('exit', code => { if (code !== 0) reject(new Error('worker exit ' + code)); });
    }));
  }
  Promise.all(tasks).then(parts => {
    const aggregate = parts.reduce((merged, part) => simulator.mergeAggregates(merged, part), null);
    const elapsedMs = Date.now() - startedAt;
    if (aggregate.total !== ITERATIONS) throw new Error('병렬 성능 검사 집계 수 불일치');
    console.log('PASS CALCULATION_PERFORMANCE (' + ITERATIONS.toLocaleString() + '회, ' +
      WORKERS + ' workers, ' + (elapsedMs / 1000).toFixed(2) + '초, 클리어율 ' +
      (aggregate.clears / aggregate.total * 100).toFixed(2) + '%, 정확도 ' + ACCURACY + ')');
    if (elapsedMs > 60000) process.exitCode = 1;
  }).catch(error => {
    console.error(error.stack || error);
    process.exitCode = 1;
  });
}
