const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
        const errors = [];
        page.on('pageerror', error => { errors.push(error.stack); console.error(error.stack); });
        await page.goto(process.env.RTD_TEST_URL || 'http://localhost:3000/');
        await page.waitForFunction(() => window.gameInstance?.scene.isActive('MenuScene'));
        // Use the actual DEV button handler; leave the user's browser storage untouched.
        await page.evaluate(() => {
            const menu = gameInstance.scene.getScene('MenuScene');
            const button = menu.children.list.find(child => child.type === 'Text' && child.text.includes('DEV') && child.text.includes('시작'));
            if (!button) throw new Error('DEV start label not found');
            const zone = menu.children.list.find(child => child.type === 'Zone' && child.input && Math.abs(child.x - button.x) < 2 && Math.abs(child.y - button.y) < 2);
            zone.emit('pointerdown');
        });
        await page.waitForFunction(() => gameInstance.scene.isActive('GameScene') && gameInstance.scene.getScene('GameScene').waveSystem.isGameStarted);
        await page.waitForTimeout(1800);
        for (let visit = 0; visit < 3; visit++) {
            await page.keyboard.press('Escape');
            await page.waitForFunction(() => gameInstance.scene.isActive('MenuScene'));
            await page.evaluate(() => {
                const menu = gameInstance.scene.getScene('MenuScene');
                const button = menu.children.list.find(child => child.type === 'Text' && child.text === '게임 시작');
                const zone = menu.children.list.find(child => child.type === 'Zone' && child.input && child.x === button.x && child.y === button.y);
                zone.emit('pointerdown');
            });
            await page.waitForFunction(() => gameInstance.scene.isActive('GameScene'));
            await page.keyboard.press('Space');
            await page.waitForFunction(() => {
                const scene = gameInstance.scene.getScene('GameScene');
                return !scene.devSimMode && scene.waveSystem.isGameStarted && scene.monsters.length > 0 &&
                    scene.towers.length > 0 && scene._centerCountText.scene === scene &&
                    scene._reservedSlotLegend.scene === scene;
            }, null, { timeout: 10000 });
            assert.deepEqual(errors, []);
        }
        console.log('PASS: DEV -> ESC -> normal game + SPACE, repeated 3 times without browser errors');
    } finally {
        await browser.close();
    }
})().catch(error => { console.error(error); process.exitCode = 1; });
