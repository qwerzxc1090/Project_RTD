/**
 * stats.json의 런타임 데이터를 data-editor.html 기본값과 동기화한다.
 * 시스템 설정은 config.js와 수동으로 함께 관리한다.
 */
const fs = require('fs');
const path = require('path');

const statsPath = 'assets/data/stats.json';
const editorPath = 'tools/data-editor.html';
const outputPath = process.argv[2] || editorPath;
const stats = JSON.parse(fs.readFileSync(statsPath, 'utf8'));
let html = fs.readFileSync(editorPath, 'utf8');

function replaceConst(name, value) {
    const marker = 'const ' + name + ' = ';
    const start = html.indexOf(marker);
    if (start === -1) throw new Error(name + ' 시작 위치를 찾을 수 없습니다.');

    const valueStart = start + marker.length;
    const opening = html[valueStart];
    const closing = opening === '[' ? ']' : opening === '{' ? '}' : null;
    if (!closing) throw new Error(name + ' 값이 배열/객체가 아닙니다.');

    let depth = 0;
    let quote = null;
    let escaped = false;
    let end = -1;
    for (let i = valueStart; i < html.length; i++) {
        const ch = html[i];
        if (quote) {
            if (escaped) escaped = false;
            else if (ch === '\\') escaped = true;
            else if (ch === quote) quote = null;
            continue;
        }
        if (ch === '"' || ch === "'" || ch === '`') {
            quote = ch;
            continue;
        }
        if (ch === opening) depth++;
        else if (ch === closing) {
            depth--;
            if (depth === 0) {
                end = i + 1;
                break;
            }
        }
    }
    if (end === -1) throw new Error(name + ' 끝 위치를 찾을 수 없습니다.');

    html = html.slice(0, valueStart) + JSON.stringify(value, null, 2) + html.slice(end);
}

replaceConst('DEFAULT_UNITS', stats.units);
replaceConst('DEFAULT_SKILLS', stats.skills);
replaceConst('DEFAULT_MONSTERS', Object.values(stats.monsters));
replaceConst('DEFAULT_WAVES', stats.waves);
replaceConst('DEFAULT_DPS_MODE', stats.dpsMode);

const RETRYABLE_WRITE_ERRORS = new Set(['EPERM', 'EBUSY', 'EACCES']);
const MAX_WRITE_ATTEMPTS = 5;

function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function runWriteStepWithRetry(label, operation) {
    for (let attempt = 1; attempt <= MAX_WRITE_ATTEMPTS; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const retryable = RETRYABLE_WRITE_ERRORS.has(error.code);
            if (!retryable || attempt === MAX_WRITE_ATTEMPTS) throw error;

            const delayMs = attempt * 100;
            console.warn(
                `[sync_defaults] ${error.code}: ${label} 재시도 ` +
                `${attempt}/${MAX_WRITE_ATTEMPTS - 1} (${delayMs}ms 후)`
            );
            await wait(delayMs);
        }
    }
}

async function writeAtomicWithRetry(targetPath, content) {
    const resolvedTarget = path.resolve(targetPath);
    const targetDir = path.dirname(resolvedTarget);
    const tempPath = path.join(
        targetDir,
        '.' + path.basename(resolvedTarget) + '.' + process.pid + '.' + Date.now() + '.tmp'
    );

    // 대상 파일과 같은 디렉터리에 먼저 기록해야 최종 rename이 원자적으로 처리된다.
    await fs.promises.access(targetDir, fs.constants.W_OK);
    await runWriteStepWithRetry('임시 파일 생성', function() {
        return fs.promises.writeFile(tempPath, content, { encoding: 'utf8', flag: 'wx' });
    });

    try {
        await runWriteStepWithRetry('파일 교체', function() {
            return fs.promises.rename(tempPath, resolvedTarget);
        });
    } finally {
        // rename 성공 시에는 이미 사라졌고, 실패 시에는 임시 파일을 정리한다.
        await fs.promises.unlink(tempPath).catch(() => {});
    }
}

async function main() {
    await writeAtomicWithRetry(outputPath, html);
    console.log(outputPath + ' defaults synced:');
    console.log('  units:', stats.units.length);
    console.log('  skills:', Object.keys(stats.skills).length);
    console.log('  monsters:', Object.keys(stats.monsters).length);
    console.log('  waves:', stats.waves.length);
}

main().catch(error => {
    console.error(
        `[sync_defaults] ${outputPath} 쓰기 실패 (${error.code || 'UNKNOWN'}): ${error.message}`
    );
    process.exitCode = 1;
});
