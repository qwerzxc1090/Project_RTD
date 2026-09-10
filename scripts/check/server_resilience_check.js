const assert = require('assert');
const { spawn } = require('child_process');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..', '..');
const port = 32145;
const child = spawn(process.execPath, ['server.js'], {
  cwd: root,
  env: { ...process.env, PORT: String(port) },
  stdio: ['ignore', 'pipe', 'pipe']
});

let output = '';
child.stdout.on('data', chunk => { output += chunk.toString(); });
child.stderr.on('data', chunk => { output += chunk.toString(); });

function request(requestPath) {
  return new Promise((resolve, reject) => {
    const req = http.get({ hostname: '127.0.0.1', port, path: requestPath }, res => {
      res.resume();
      res.on('end', () => resolve(res.statusCode));
    });
    req.on('error', reject);
  });
}

async function waitForServer() {
  const timeoutAt = Date.now() + 5000;
  while (Date.now() < timeoutAt) {
    try {
      if (await request('/')) return;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 50));
    }
  }
  throw new Error(`서버 시작 시간 초과: ${output}`);
}

(async () => {
  try {
    await waitForServer();
    assert.strictEqual(await request('/'), 200, '정상 요청은 200이어야 합니다.');
    assert.strictEqual(await request('/%E0%A4%A'), 400, '잘못된 인코딩 요청은 400이어야 합니다.');
    assert.strictEqual(await request('/'), 200, '잘못된 요청 뒤에도 서버는 계속 응답해야 합니다.');
    console.log('SERVER_RESILIENCE_OK');
  } finally {
    child.kill();
  }
})().catch(error => {
  console.error(error.stack || error.message);
  process.exitCode = 1;
});
