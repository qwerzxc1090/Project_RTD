const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const root = path.resolve(__dirname, '../..');
const dataPath = path.join(root, 'scripts/check/.calculation-runs-test.json');
try { fs.unlinkSync(dataPath); } catch (error) { if (error.code !== 'ENOENT') throw error; }
const child = spawn(process.execPath, ['server.js'], {
    cwd: root,
    env: Object.assign({}, process.env, { PORT: '3107', CALCULATION_RUNS_PATH: dataPath }),
    stdio: ['ignore', 'pipe', 'pipe']
});

function record(id, total) {
    return { id, savedAt: Date.now(), aggregate: {
        version: 9, model: 'quality-scaled-event-v9', total,
        assumptions: { accuracyLevel: 11 }
    } };
}
async function waitForServer() {
    for (let i = 0; i < 30; i++) {
        try {
            const response = await fetch('http://127.0.0.1:3107/api/calculation-runs');
            if (response.ok) return;
        } catch (_) {}
        await new Promise(resolve => setTimeout(resolve, 50));
    }
    throw new Error('test server did not start');
}

(async () => {
    try {
        await waitForServer();
        const send = value => fetch('http://127.0.0.1:3107/api/calculation-runs', {
            method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(value)
        }).then(response => response.json());
        const responses = await Promise.all([send(record('computer-a', 20)), send(record('computer-b', 30))]);
        assert.ok(responses.every(value => value.ok));
        assert.equal((await send(record('computer-a', 20))).duplicate, true);
        const payload = await fetch('http://127.0.0.1:3107/api/calculation-runs').then(response => response.json());
        assert.equal(payload.runs.length, 2);
        assert.equal(payload.runs.reduce((sum, value) => sum + value.aggregate.total, 0), 50);
        const cleared = await fetch('http://127.0.0.1:3107/api/calculation-runs', {
            method: 'DELETE', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ version: 9, model: 'quality-scaled-event-v9', accuracyLevel: 11 })
        }).then(response => response.json());
        assert.equal(cleared.ok, true);
        assert.equal(cleared.deleted, 2);
        assert.equal((await fetch('http://127.0.0.1:3107/api/calculation-runs').then(response => response.json())).runs.length, 0);
        const staleRecord = record('computer-a', 20);
        staleRecord.savedAt = cleared.resetAt - 1;
        const staleResult = await send(staleRecord);
        assert.equal(staleResult.stale, true);
        const fresh = record('computer-c', 40);
        fresh.savedAt = cleared.resetAt + 1;
        assert.equal((await send(fresh)).stale, false);
        assert.equal((await fetch('http://127.0.0.1:3107/api/calculation-runs').then(response => response.json())).runs.length, 1);
        console.log('PASS CALCULATION_RUN_API (parallel writes, reset, stale-run protection, retrieval)');
    } finally {
        child.kill();
        try { fs.unlinkSync(dataPath); } catch (_) {}
        try { fs.unlinkSync(dataPath + '.tmp'); } catch (_) {}
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
