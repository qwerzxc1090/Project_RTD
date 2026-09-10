(function(root) {
    'use strict';
    var PREFIX = 'rtd_calcRun:';
    var LEGACY = 'rtd_calcSimAggregate';
    function records(storage) {
        var result = [];
        for (var i = 0; i < storage.length; i++) {
            var key = storage.key(i);
            if (key && key.indexOf(PREFIX) === 0) {
                try { result.push(JSON.parse(storage.getItem(key))); } catch(e) {}
            }
        }
        return result;
    }
    function matches(aggregate, expected) {
        return !expected || !!aggregate && aggregate.version === expected.version &&
            aggregate.model === expected.model &&
            Number(aggregate.assumptions && aggregate.assumptions.accuracyLevel) === expected.accuracyLevel;
    }
    function read(storage, simulator, expected) {
        var aggregate = JSON.parse(storage.getItem(LEGACY) || 'null');
        if (!matches(aggregate, expected)) aggregate = null;
        var storedRecords = records(storage);
        storedRecords.sort(function(a, b) {
            return a.savedAt - b.savedAt || a.id.localeCompare(b.id);
        });
        storedRecords.forEach(function(record) {
            if (!matches(record && record.aggregate, expected)) return;
            aggregate = simulator.mergeAggregates(aggregate, record.aggregate);
            aggregate.wallElapsedMs = record.aggregate.wallElapsedMs;
            aggregate.nextSeedOffset = record.aggregate.nextSeedOffset;
        });
        return aggregate;
    }
    var api = {
        read: read,
        records: records,
        averageTimePerThousand: function(storage, expected) {
            var elapsedMs = 0;
            var samples = 0;
            records(storage).forEach(function(record) {
                var aggregate = record && record.aggregate;
                if (!matches(aggregate, expected)) return;
                var checkpointElapsed = Number(aggregate.checkpointWallElapsedMs || 0);
                var checkpointSamples = Number(aggregate.checkpointSampleCount || 0);
                if (checkpointElapsed > 0 && checkpointSamples > 0) {
                    elapsedMs += checkpointElapsed;
                    samples += checkpointSamples;
                }
            });
            return samples > 0 ? elapsedMs / samples * 1000 : null;
        },
        save: function(storage, id, aggregate) {
            var key = PREFIX + id;
            // Retrying a completed run must not count it twice.
            if (storage.getItem(key) !== null) return JSON.parse(storage.getItem(key));
            var record = { id: id, savedAt: Date.now(), aggregate: aggregate };
            storage.setItem(key, JSON.stringify(record));
            return record;
        },
        importRecords: function(storage, incoming, expected) {
            var added = 0;
            (incoming || []).forEach(function(record) {
                var aggregate = record && record.aggregate;
                if (!record || !record.id || !aggregate) return;
                if (expected && (aggregate.version !== expected.version || aggregate.model !== expected.model ||
                    Number(aggregate.assumptions && aggregate.assumptions.accuracyLevel) !== expected.accuracyLevel)) return;
                var key = PREFIX + record.id;
                if (storage.getItem(key) === null) {
                    storage.setItem(key, JSON.stringify(record));
                    added++;
                }
            });
            return added;
        },
        isKey: function(key) { return key === LEGACY || !!key && key.indexOf(PREFIX) === 0; },
        clear: function(storage, expected) {
            var keys = [];
            for (var i = 0; i < storage.length; i++) {
                var key = storage.key(i);
                if (key === LEGACY) {
                    try { if (matches(JSON.parse(storage.getItem(key)), expected)) keys.push(key); } catch(e) {}
                } else if (key && key.indexOf(PREFIX) === 0) {
                    try {
                        var record = JSON.parse(storage.getItem(key));
                        if (matches(record && record.aggregate, expected)) keys.push(key);
                    } catch(e) {}
                }
            }
            keys.forEach(function(key) { storage.removeItem(key); });
        }
    };
    if (typeof module !== 'undefined' && module.exports) module.exports = api;
    else root.RTDCalculationRunStore = api;
}(typeof window !== 'undefined' ? window : this));
