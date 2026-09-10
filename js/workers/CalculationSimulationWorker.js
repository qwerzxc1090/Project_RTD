'use strict';

importScripts('../systems/CalculationSimulator.js');

self.onmessage = function(event) {
    try {
        var options = event.data || {};
        var total = Math.max(1, Math.floor(Number(options.iterations || 1)));
        var checkpointSize = Math.max(1, Math.floor(Number(options.checkpointIterations || 250)));
        var seedBase = Number(options.seedBase || 0) >>> 0;
        var maxDurationMs = Math.max(0, Number(options.maxDurationMs || 0));
        var startedAt = Date.now();
        var done = 0;
        var stoppedByTimeLimit = false;
        while (done < total) {
            var remainingDuration = maxDurationMs > 0
                ? Math.max(0, maxDurationMs - (Date.now() - startedAt)) : 0;
            if (maxDurationMs > 0 && remainingDuration <= 0) {
                stoppedByTimeLimit = true;
                break;
            }
            var requested = Math.min(checkpointSize, total - done);
            var chunkOptions = Object.assign({}, options, {
                iterations: requested,
                seedBase: (seedBase + Math.imul(done, 97)) >>> 0,
                maxDurationMs: remainingDuration,
                existingAggregate: null
            });
            var aggregate = self.RTDCalculationSimulator.run(chunkOptions);
            var completed = Number(aggregate.total || 0);
            if (completed <= 0) {
                stoppedByTimeLimit = maxDurationMs > 0;
                break;
            }
            done += completed;
            self.postMessage({
                type: 'checkpoint', done: done, total: total, aggregate: aggregate
            });
            if (completed < requested || aggregate.stoppedByTimeLimit) {
                stoppedByTimeLimit = true;
                break;
            }
        }
        self.postMessage({ type: 'complete', done: done, total: total, stoppedByTimeLimit: stoppedByTimeLimit });
    } catch (error) {
        self.postMessage({
            type: 'error',
            message: error && error.message ? error.message : String(error)
        });
    }
};
