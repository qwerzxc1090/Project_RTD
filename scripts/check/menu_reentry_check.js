const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const storage = new Map();
const context = vm.createContext({
    window: {},
    Phaser: { Scene: function() {}, Class: function(definition) { return definition; } },
    localStorage: { setItem: (key, value) => storage.set(key, value) },
    sessionStorage: { removeItem: key => storage.delete(key) }
});
for (const file of ['MenuScene.js', 'GameScene.js']) {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '../../js/scenes', file), 'utf8'), context);
}
const Game = context.window.Game;
Game.Config = { WIDTH: 1280, HEIGHT: 720 };
Game.UILayout = { get: () => ({}) };
const graphics = new Proxy({}, { get: (_, key) => key === 'then' ? undefined : () => graphics });
let click;
let transition;
let starts = 0;
const menu = Object.assign({}, Game.MenuScene, {
    _isTransitioning: true,
    add: {
        graphics: () => graphics,
        text: () => graphics,
        zone: () => ({ setInteractive() { return this; }, on(event, handler) {
            if (event === 'pointerdown') click = handler;
            return this;
        } })
    },
    tweens: { add: config => { if (config.onComplete) transition = config.onComplete; } },
    scene: { start: key => { assert.equal(key, 'GameScene'); starts++; } }
});
for (const method of ['_createBackground', '_createTitle', '_createGameInfo', '_createParticles', '_createDevPanel']) {
    menu[method] = () => {};
}

// Exercise the real start-button handler across repeated scene reuse.
for (let visit = 0; visit < 3; visit++) {
    transition = undefined;
    menu.create();
    click();
    assert.equal(typeof transition, 'function', 'Returning to menu must allow another start');
    const firstTransition = transition;
    click();
    assert.equal(transition, firstTransition, 'Double clicks must not queue another transition');
    transition();
}
assert.equal(starts, 3);

// Stop at system initialization to isolate the entry-state reset from rendering.
const initialized = new Error('initialized');
Game.EconomySystem = { reset() { throw initialized; } };
let returns = 0;
const game = Object.assign({}, Game.GameScene, {
    _returningToMenu: true,
    simInstanceId: 'test',
    scene: { start: key => { assert.equal(key, 'MenuScene'); returns++; } }
});
for (let visit = 0; visit < 3; visit++) {
    assert.throws(() => game.create(), error => error === initialized);
    storage.set('rtd_devMode', '1');
    storage.set('rtd_simRunActive_test', '1');
    storage.set('rtd_simAutoRestart_test', '1');
    game._returnToMenu();
    game._returnToMenu();
    assert.equal(storage.get('rtd_devMode'), '0');
    assert.equal(storage.has('rtd_simRunActive_test'), false);
    assert.equal(storage.has('rtd_simAutoRestart_test'), false);
}
assert.equal(returns, 3, 'ESC return must work again on each game entry');
console.log('PASS: repeated menu start, duplicate-click guard, ESC return, and DEV flag cleanup');
