const assert = require('assert');
const store = require('../../js/systems/CalculationRunStore.js');
const simulator = require('../../js/systems/CalculationSimulator.js');
const values = new Map();
const storage = {
    get length() { return values.size; },
    key: i => Array.from(values.keys())[i],
    getItem: key => values.has(key) ? values.get(key) : null,
    setItem: (key, value) => values.set(key, value),
    removeItem: key => values.delete(key)
};
const model = { version: simulator.VERSION, model: simulator.MODEL };
function batch(total) {
    return { version: model.version, model: model.model, total,
        assumptions: { accuracyLevel: 11 }, wallElapsedMs: 100 };
}
function timedBatch(total, elapsed) {
    const value = batch(total);
    value.checkpointSampleCount = total;
    value.checkpointWallElapsedMs = elapsed;
    return value;
}
storage.setItem('rtd_calcSimAggregate', JSON.stringify(batch(100)));
// Both windows start from the same snapshot, then save only their own result.
assert.equal(store.read(storage, simulator).total, 100);
assert.equal(store.read(storage, simulator).total, 100);
store.save(storage, 'window-a', batch(20));
store.save(storage, 'window-b', batch(30));
assert.equal(store.read(storage, simulator).total, 150);
store.save(storage, 'window-a', batch(20));
assert.equal(store.read(storage, simulator).total, 150);
assert.equal(store.read(storage, simulator).wallElapsedMs, 100);
store.save(storage, 'timed-a', timedBatch(1000, 60000));
store.save(storage, 'timed-b', timedBatch(500, 45000));
assert.equal(store.averageTimePerThousand(storage, {
    version: model.version, model: model.model, accuracyLevel: 11
}), 70000);
const remote = [
    { id: 'remote-11', savedAt: 200, aggregate: batch(40) },
    { id: 'remote-12', savedAt: 201, aggregate: Object.assign(batch(50), { assumptions: { accuracyLevel: 12 } }) }
];
assert.equal(store.importRecords(storage, remote, {
    version: model.version, model: model.model, accuracyLevel: 11
}), 1);
assert.equal(store.read(storage, simulator).total, 1690);
assert.equal(store.importRecords(storage, remote, {
    version: model.version, model: model.model, accuracyLevel: 11
}), 0);
store.save(storage, 'window-12', Object.assign(batch(70), { assumptions: { accuracyLevel: 12 } }));
assert.equal(store.read(storage, simulator, {
    version: model.version, model: model.model, accuracyLevel: 11
}).total, 1690);
assert.equal(store.read(storage, simulator, {
    version: model.version, model: model.model, accuracyLevel: 12
}).total, 70);
store.clear(storage, { version: model.version, model: model.model, accuracyLevel: 11 });
assert.equal(store.read(storage, simulator, {
    version: model.version, model: model.model, accuracyLevel: 11
}), null);
assert.equal(store.read(storage, simulator, {
    version: model.version, model: model.model, accuracyLevel: 12
}).total, 70);
storage.setItem('rtd_simResults', '[]');
store.clear(storage);
assert.equal(store.read(storage, simulator), null);
assert.equal(storage.getItem('rtd_simResults'), '[]');
console.log('PASS CALCULATION_RUN_STORE (concurrent completion, legacy totals, retry, clear)');
