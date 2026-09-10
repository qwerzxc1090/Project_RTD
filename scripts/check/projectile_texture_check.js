const { chromium } = require('playwright');
const assert = require('node:assert/strict');

(async () => {
    const browser = await chromium.launch({ channel: 'msedge', headless: true });
    try {
        const page = await browser.newPage();
        const errors = [];
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
        page.on('pageerror', err => errors.push(err.message));
        await page.goto(process.env.RTD_TEST_URL || 'http://localhost:3000/');
        await page.waitForFunction(() => window.gameInstance && window.gameInstance.scene.isActive('MenuScene'));
        const result = await page.evaluate(() => {
            const textures = window.gameInstance.textures;
            return Object.values(Game.SkillData.skills).map(skill => ({
                id: skill.id, key: skill.imageKey || 'proj_' + skill.id,
                loaded: textures.exists(skill.imageKey || 'proj_' + skill.id)
            }));
        });
        console.log(JSON.stringify({ result, errors }, null, 2));
        assert.ok(result.length > 0 && result.every(x => x.loaded), 'All projectile textures must decode and register');
        await page.evaluate(() => window.gameInstance.scene.start('GameScene'));
        await page.waitForFunction(() => window.gameInstance.scene.isActive('GameScene'));
        const visuals = await page.evaluate(() => {
            const scene = window.gameInstance.scene.getScene('GameScene');
            return Object.values(Game.SkillData.skills).map(skill => {
                const unit = Game.UnitData.units && Object.values(Game.UnitData.units).find(u => u.skillId === skill.id);
                const p = Game.ProjectilePool.acquire(300, 300, null,
                    unit || { skillId: skill.id, attackType: 'normal' }, skill, null);
                return { id: skill.id, image: !!(p._visualImage && p._visualImage.visible),
                    fallback: !!(p._visualGraphics && p._visualGraphics.visible) };
            });
        });
        assert.ok(visuals.every(x => x.image && !x.fallback), JSON.stringify(visuals));
        console.log('PASS: all skills use image textures in the game projectile pool');
    } finally { await browser.close(); }
})().catch(err => { console.error(err); process.exitCode = 1; });
