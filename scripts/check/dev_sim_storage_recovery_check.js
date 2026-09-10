const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        await page.goto(process.env.RTD_TEST_URL || 'http://localhost:3000/');
        await page.evaluate(() => localStorage.clear());
        await page.reload();
        await page.waitForFunction(() => window.gameInstance?.scene.isActive('MenuScene'));
        await page.evaluate(() => {
            const menu = gameInstance.scene.getScene('MenuScene');
            const label = menu.children.list.find(child => child.type === 'Text' && child.text.includes('DEV') && child.text.includes('시작'));
            const zone = menu.children.list.find(child => child.type === 'Zone' && child.input && Math.abs(child.x - label.x) < 2 && Math.abs(child.y - label.y) < 2);
            zone.emit('pointerdown');
        });
        await page.waitForFunction(() => gameInstance.scene.isActive('GameScene') && gameInstance.scene.getScene('GameScene').waveSystem.isGameStarted);

        const marker = await page.evaluate(() => {
            const scene = gameInstance.scene.getScene('GameScene');
            const oldRows = Array.from({ length: 80 }, (_, index) => ({
                win: false, round: 10, ts: 1000 + index, time: 20, gs: 100,
                failCategory: 'normal', failReason: 'normal_life'
            }));
            localStorage.setItem(scene.simResultsKey, JSON.stringify(oldRows));
            const originalSetItem = Storage.prototype.setItem;
            Storage.prototype.setItem = function(key, value) {
                if (key === scene.simResultsKey && value.length > 1200) {
                    throw new DOMException('quota exceeded', 'QuotaExceededError');
                }
                return originalSetItem.call(this, key, value);
            };
            scene._gameOver(false);
            return scene.simResultsKey;
        });

        await page.waitForFunction(() => {
            const scene = gameInstance.scene.getScene('GameScene');
            return gameInstance.scene.isActive('GameScene') && scene.waveSystem.isGameStarted && !scene.isGameOver;
        }, null, { timeout: 10000 });
        const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key) || '[]'), marker);
        assert(saved.length > 0 && saved.length < 80, 'quota recovery must retain a trimmed sample');
        assert(saved.some(row => row.ts > 1000000000000), 'the just-finished run must survive quota recovery');
        console.log('PASS: DEV simulation keeps the newest result and restarts after localStorage quota recovery');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
