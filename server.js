const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = Number(process.env.PORT) || 3000;
const ROOT = __dirname;
const LIVE_REPORT_PATH = path.join(ROOT, 'simulation-live-report.json');
const DEV_SIMULATION_RUNS_PATH = process.env.DEV_SIMULATION_RUNS_PATH || path.join(ROOT, 'dev-simulation-runs.ndjson');
const CALCULATION_RUNS_PATH = process.env.CALCULATION_RUNS_PATH || path.join(ROOT, 'calculation-runs.json');
const MAX_REPORT_BYTES = 1024 * 1024;
const MAX_DEV_SIMULATION_RUN_BYTES = 16 * 1024;
const MAX_CALCULATION_RUN_BYTES = 256 * 1024;
const IS_DEVELOPMENT = process.env.NODE_ENV !== 'production';
// Development-only facilities must never be re-enabled in a production process.
const ENABLE_DEV_API = IS_DEVELOPMENT && process.env.ENABLE_DEV_API !== '0';
const ENABLE_DEV_TOOLS = IS_DEVELOPMENT && process.env.ENABLE_DEV_TOOLS !== '0';
const PUBLIC_FILES = new Set(['/index.html', '/style.css']);
const PUBLIC_DIRECTORIES = ['/js/', '/assets/'];
const DEV_TOOL_DIRECTORY = '/tools/';

const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.js':   'application/javascript; charset=utf-8',
    '.css':  'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.png':  'image/png',
    '.jpg':  'image/jpeg',
    '.gif':  'image/gif',
    '.svg':  'image/svg+xml',
    '.ico':  'image/x-icon',
    '.wav':  'audio/wav',
    '.mp3':  'audio/mpeg',
    '.ogg':  'audio/ogg',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
    '.ttf':  'font/ttf',
};

function log(message) {
    console.log(`[${new Date().toISOString()}] ${message}`);
}

function formatError(error) {
    return error && error.stack ? error.stack : String(error);
}

function sendText(res, statusCode, text) {
    if (res.headersSent || res.writableEnded) return;
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(text);
}

function sendJson(res, statusCode, value) {
    if (res.headersSent || res.writableEnded) return;
    res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(value));
}

function setPublicHeaders(res, requestPath) {
    // The development data editor is a self-contained legacy page with an
    // inline initializer. It is never served in production.
    const isDevelopmentTool = IS_DEVELOPMENT && requestPath.startsWith(DEV_TOOL_DIRECTORY);
    const scriptSource = isDevelopmentTool
        ? "'self' 'unsafe-inline' https://cdn.jsdelivr.net"
        : "'self' https://cdn.jsdelivr.net";
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self'; script-src " + scriptSource + "; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'"
    );
    var mustRevalidate = requestPath === '/index.html' || requestPath.endsWith('.js') ||
        requestPath.startsWith('/assets/data/') || requestPath.startsWith('/assets/Art/projectiles/');
    res.setHeader('Cache-Control', mustRevalidate ? 'no-cache' : 'public, max-age=3600');
}

function isPublicGamePath(requestPath) {
    return PUBLIC_FILES.has(requestPath) ||
        PUBLIC_DIRECTORIES.some(prefix => requestPath.startsWith(prefix)) ||
        (IS_DEVELOPMENT && requestPath.startsWith(DEV_TOOL_DIRECTORY));
}

function handleSimulationReport(req, res) {
    if (req.method === 'GET') {
        fs.readFile(LIVE_REPORT_PATH, 'utf8', (error, text) => {
            if (error) {
                sendJson(res, error.code === 'ENOENT' ? 404 : 500, { ok: false, error: error.code || 'read_failed' });
                return;
            }
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(text);
        });
        return;
    }
    if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
        return;
    }
    var chunks = [];
    var size = 0;
    req.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_REPORT_BYTES) {
            sendJson(res, 413, { ok: false, error: 'report_too_large' });
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (res.writableEnded) return;
        try {
            const report = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            if (!report || report.schema !== 'rtd-simulation-comparison' ||
                !report.dev || !report.calculation || !report.comparison) {
                sendJson(res, 400, { ok: false, error: 'invalid_report' });
                return;
            }
            const text = JSON.stringify(report, null, 2) + '\n';
            const temporaryPath = LIVE_REPORT_PATH + '.tmp';
            fs.writeFile(temporaryPath, text, 'utf8', writeError => {
                if (writeError) {
                    sendJson(res, 500, { ok: false, error: writeError.code || 'write_failed' });
                    return;
                }
                fs.rename(temporaryPath, LIVE_REPORT_PATH, renameError => {
                    if (renameError) {
                        sendJson(res, 500, { ok: false, error: renameError.code || 'rename_failed' });
                        return;
                    }
                    sendJson(res, 200, { ok: true, sourceSignature: report.sourceSignature || null });
                });
            });
        } catch (error) {
            sendJson(res, 400, { ok: false, error: 'invalid_json' });
        }
    });
}

function normalizeDevSimulationRun(value) {
    if (!value || typeof value !== 'object') return null;
    var round = Math.floor(Number(value.round));
    var timestamp = Math.floor(Number(value.ts));
    var time = Math.max(0, Math.floor(Number(value.time) || 0));
    var score = Math.max(0, Math.floor(Number(value.gs) || 0));
    if (!Number.isFinite(round) || round < 1 || round > 52 || !Number.isFinite(timestamp) || timestamp < 1) return null;

    var failCategory = value.failCategory === 'boss' ? 'boss' : (value.failCategory === 'normal' ? 'normal' : null);
    var failReason = typeof value.failReason === 'string' && /^[a-z_]{1,32}$/.test(value.failReason)
        ? value.failReason : null;
    var hpAvg = {};
    ['early', 'mid', 'late'].forEach(group => {
        var hp = Number(value.hpAvg && value.hpAvg[group]);
        if (Number.isFinite(hp) && hp >= 0 && hp <= 50) hpAvg[group] = Math.round(hp * 10) / 10;
    });
    return {
        win: !!value.win,
        round: round,
        ts: timestamp,
        time: time,
        gs: score,
        hpAvg: hpAvg,
        failCategory: failCategory,
        failReason: failReason
    };
}

function handleDevSimulationRun(req, res) {
    if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
        return;
    }
    readJsonBody(req, res, MAX_DEV_SIMULATION_RUN_BYTES, body => {
        var run = normalizeDevSimulationRun(body);
        if (!run) {
            sendJson(res, 400, { ok: false, error: 'invalid_run' });
            return;
        }
        fs.appendFile(DEV_SIMULATION_RUNS_PATH, JSON.stringify(run) + '\n', 'utf8', error => {
            if (error) {
                sendJson(res, 500, { ok: false, error: error.code || 'write_failed' });
                return;
            }
            sendJson(res, 201, { ok: true });
        });
    });
}

let calculationRunWriteQueue = Promise.resolve();

function readCalculationRuns() {
    return fs.promises.readFile(CALCULATION_RUNS_PATH, 'utf8')
        .then(text => JSON.parse(text))
        .catch(error => {
            if (error.code === 'ENOENT') return { schema: 'rtd-calculation-runs', version: 1, runs: {}, resets: {} };
            throw error;
        });
}

function calculationScope(value) {
    const aggregate = value && value.aggregate ? value.aggregate : value;
    if (aggregate && aggregate.assumptions) return {
        version: Number(aggregate.version),
        model: String(aggregate.model || ''),
        accuracyLevel: Number(aggregate.assumptions.accuracyLevel)
    };
    return aggregate && aggregate.accuracyLevel !== undefined ? {
        version: Number(aggregate.version),
        model: String(aggregate.model || ''),
        accuracyLevel: Number(aggregate.accuracyLevel)
    } : null;
}

function calculationScopeKey(scope) {
    return scope.version + ':' + scope.model + ':' + scope.accuracyLevel;
}

function matchesCalculationScope(value, scope) {
    const candidate = calculationScope(value);
    return !!candidate && candidate.version === scope.version && candidate.model === scope.model &&
        candidate.accuracyLevel === scope.accuracyLevel;
}

function readJsonBody(req, res, maxBytes, callback) {
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
        size += chunk.length;
        if (size > maxBytes) {
            sendJson(res, 413, { ok: false, error: 'request_too_large' });
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (res.writableEnded) return;
        try {
            callback(JSON.parse(Buffer.concat(chunks).toString('utf8') || '{}'));
        } catch (error) {
            sendJson(res, 400, { ok: false, error: 'invalid_json' });
        }
    });
}

function handleCalculationRuns(req, res) {
    if (req.method === 'GET') {
        readCalculationRuns().then(store => {
            sendJson(res, 200, { ok: true, runs: Object.keys(store.runs || {}).map(id => store.runs[id]) });
        }).catch(error => sendJson(res, 500, { ok: false, error: error.code || 'read_failed' }));
        return;
    }
    if (req.method === 'DELETE') {
        readJsonBody(req, res, 16 * 1024, body => {
            const scope = calculationScope(body);
            if (!scope || !Number.isFinite(scope.version) || !scope.model ||
                !Number.isFinite(scope.accuracyLevel)) {
                sendJson(res, 400, { ok: false, error: 'invalid_scope' });
                return;
            }
            calculationRunWriteQueue = calculationRunWriteQueue.then(async () => {
                const store = await readCalculationRuns();
                store.runs = store.runs || {};
                store.resets = store.resets || {};
                let deleted = 0;
                Object.keys(store.runs).forEach(id => {
                    if (!matchesCalculationScope(store.runs[id], scope)) return;
                    delete store.runs[id];
                    deleted++;
                });
                const resetAt = Date.now();
                store.resets[calculationScopeKey(scope)] = resetAt;
                const temporaryPath = CALCULATION_RUNS_PATH + '.tmp';
                await fs.promises.writeFile(temporaryPath, JSON.stringify(store, null, 2) + '\n', 'utf8');
                await fs.promises.rename(temporaryPath, CALCULATION_RUNS_PATH);
                return { deleted, resetAt };
            });
            calculationRunWriteQueue.then(result => {
                sendJson(res, 200, { ok: true, deleted: result.deleted, resetAt: result.resetAt });
            }).catch(error => sendJson(res, 500, { ok: false, error: error.code || 'write_failed' }));
        });
        return;
    }
    if (req.method !== 'POST') {
        sendJson(res, 405, { ok: false, error: 'method_not_allowed' });
        return;
    }
    const chunks = [];
    let size = 0;
    req.on('data', chunk => {
        size += chunk.length;
        if (size > MAX_CALCULATION_RUN_BYTES) {
            sendJson(res, 413, { ok: false, error: 'run_too_large' });
            req.destroy();
            return;
        }
        chunks.push(chunk);
    });
    req.on('end', () => {
        if (res.writableEnded) return;
        let record;
        try {
            record = JSON.parse(Buffer.concat(chunks).toString('utf8'));
            const aggregate = record && record.aggregate;
            if (!record || !/^[A-Za-z0-9_-]{8,80}$/.test(String(record.id || '')) ||
                !aggregate || !Number.isFinite(Number(aggregate.total)) || Number(aggregate.total) < 0 ||
                !Number.isFinite(Number(aggregate.version)) || !aggregate.model ||
                !aggregate.assumptions || !Number.isFinite(Number(aggregate.assumptions.accuracyLevel))) {
                sendJson(res, 400, { ok: false, error: 'invalid_run' });
                return;
            }
            record = { id: String(record.id), savedAt: Number(record.savedAt || Date.now()), aggregate: aggregate };
        } catch (error) {
            sendJson(res, 400, { ok: false, error: 'invalid_json' });
            return;
        }
        calculationRunWriteQueue = calculationRunWriteQueue.then(async () => {
            const store = await readCalculationRuns();
            store.runs = store.runs || {};
            store.resets = store.resets || {};
            const scope = calculationScope(record);
            const resetAt = Number(store.resets[calculationScopeKey(scope)] || 0);
            const stale = Number(record.savedAt || 0) <= resetAt;
            const duplicate = !!store.runs[record.id];
            if (!duplicate && !stale) store.runs[record.id] = record;
            const temporaryPath = CALCULATION_RUNS_PATH + '.tmp';
            if (!duplicate && !stale) {
                await fs.promises.writeFile(temporaryPath, JSON.stringify(store, null, 2) + '\n', 'utf8');
                await fs.promises.rename(temporaryPath, CALCULATION_RUNS_PATH);
            }
            return { duplicate, stale };
        });
        calculationRunWriteQueue.then(result => {
            sendJson(res, 200, { ok: true, id: record.id, duplicate: result.duplicate, stale: result.stale });
        }).catch(error => sendJson(res, 500, { ok: false, error: error.code || 'write_failed' }));
    });
}

const server = http.createServer((req, res) => {
    try {
        const rawPath = (req.url || '/').split('?')[0];
        if (rawPath === '/healthz') {
            sendJson(res, 200, { ok: true });
            return;
        }
        if (rawPath === '/runtime-config.js') {
            setPublicHeaders(res, rawPath);
            res.setHeader('Cache-Control', 'no-store');
            res.writeHead(200, { 'Content-Type': 'application/javascript; charset=utf-8' });
            res.end('window.RTD_RUNTIME_CONFIG=Object.freeze({devToolsEnabled:' +
                (ENABLE_DEV_TOOLS ? 'true' : 'false') + '});');
            return;
        }
        if (rawPath === '/api/simulation-report') {
            if (!ENABLE_DEV_API) {
                sendJson(res, 404, { ok: false, error: 'not_found' });
                return;
            }
            handleSimulationReport(req, res);
            return;
        }
        if (rawPath === '/api/dev-simulation-runs') {
            if (!ENABLE_DEV_API) {
                sendJson(res, 404, { ok: false, error: 'not_found' });
                return;
            }
            handleDevSimulationRun(req, res);
            return;
        }
        if (rawPath === '/api/calculation-runs') {
            if (!ENABLE_DEV_API) {
                sendJson(res, 404, { ok: false, error: 'not_found' });
                return;
            }
            handleCalculationRuns(req, res);
            return;
        }
        const decodedPath = decodeURIComponent(rawPath);
        const requestPath = decodedPath === '/' ? '/index.html' : decodedPath;
        if ((req.method !== 'GET' && req.method !== 'HEAD') || !isPublicGamePath(requestPath)) {
            sendText(res, 404, 'Not found');
            return;
        }
        const filePath = path.resolve(ROOT, '.' + requestPath);
        const rootPrefix = ROOT.endsWith(path.sep) ? ROOT : ROOT + path.sep;

        // 정적 서버 루트 밖 파일은 허용하지 않는다.
        if (filePath !== ROOT && !filePath.startsWith(rootPrefix)) {
            log(`"${req.method} ${req.url}" Error (403): "Forbidden path"`);
            sendText(res, 403, 'Forbidden');
            return;
        }

        const ext = path.extname(filePath).toLowerCase();
        fs.readFile(filePath, (err, data) => {
            if (err) {
                const statusCode = err.code === 'ENOENT' || err.code === 'EISDIR' ? 404 : 500;
                log(`"${req.method} ${req.url}" Error (${statusCode}): "${err.code || 'Read failed'}"`);
                sendText(res, statusCode, statusCode === 404 ? 'Not found' : 'Server error');
                return;
            }
            log(`"${req.method} ${req.url}" "${req.headers['user-agent'] || '-'}"`);
            setPublicHeaders(res, requestPath);
            res.writeHead(200, { 'Content-Type': MIME[ext] || 'application/octet-stream' });
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    } catch (error) {
        // 잘못된 퍼센트 인코딩 등 요청 하나의 오류가 Node 프로세스 전체를 종료시키지 않게 한다.
        log(`"${req.method} ${req.url}" Error (400): "${error.message}"`);
        sendText(res, 400, 'Bad request');
    }
});

let shuttingDown = false;
function shutdown(exitCode, reason) {
    if (shuttingDown) return;
    shuttingDown = true;
    log(`Shutdown requested (code=${exitCode}): ${reason}`);

    const forceExit = setTimeout(() => {
        log(`Forced shutdown after graceful-close timeout (code=${exitCode}).`);
        process.exit(exitCode);
    }, 5000);
    forceExit.unref();

    if (!server.listening) {
        clearTimeout(forceExit);
        process.exit(exitCode);
        return;
    }
    server.close(() => {
        clearTimeout(forceExit);
        log(`Server closed gracefully (code=${exitCode}).`);
        process.exit(exitCode);
    });
}

process.on('uncaughtException', error => {
    log(`Uncaught exception:\n${formatError(error)}`);
    shutdown(1, 'uncaughtException');
});

process.on('unhandledRejection', reason => {
    log(`Unhandled rejection:\n${formatError(reason)}`);
    shutdown(1, 'unhandledRejection');
});

process.on('SIGINT', () => shutdown(0, 'SIGINT'));
process.on('SIGTERM', () => shutdown(0, 'SIGTERM'));
process.on('exit', code => log(`Node process exiting (code=${code}, pid=${process.pid}).`));

server.on('clientError', (error, socket) => {
    log(`Client error: ${error.code || error.message}`);
    if (socket.writable) socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
});

server.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
        log(`Server start failed: port ${PORT} is already in use.`);
    } else {
        log(`Server error: ${error.stack || error.message}`);
    }
    shutdown(1, error.code || 'server error');
});

server.listen(PORT, () => {
    log(`Game server running at http://localhost:${PORT} (pid=${process.pid})`);
});
