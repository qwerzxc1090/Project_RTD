// Main entry point - Phaser game initialization
var config = {
    type: Phaser.AUTO,
    width: Game.Config.WIDTH,
    height: Game.Config.HEIGHT,
    backgroundColor: '#0a0a0f',
    scene: [
        Game.BootScene,
        Game.MenuScene,
        Game.GameScene,
        Game.GameOverScene
    ],
    parent: 'game-container',
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH
    },
    // ── 탭 비활성 시 게임 루프 중단 방지 ──
    // Phaser 기본 동작: Page Visibility API로 탭 비활성 시 자동 pause
    // focus: false 로 해당 동작 비활성화
    focus: false
};

window.gameInstance = new Phaser.Game(config);

// ── 브라우저 탭 비활성 스로틀링 방지 ──
// 비활성 탭에서 rAF를 1fps 이하로 제한하는 브라우저 동작 우회
// Phaser 게임 루프를 requestAnimationFrame 대신 setInterval로 강제 실행
(function() {
    document.addEventListener('visibilitychange', function() {
        var game = window.gameInstance;
        if (!game) return;

        if (document.hidden) {
            // ① Phaser 내부 pause 상태 강제 해제 (focus: false 보완)
            if (game.loop && game.loop.paused) {
                game.loop.paused = false;
            }

            // ② setInterval로 게임 루프 강제 구동 (16ms ≈ 60fps)
            if (!window._bgLoopId) {
                window._bgLoopId = setInterval(function() {
                    try {
                        var g = window.gameInstance;
                        if (!g) return;
                        // Phaser 3.x: TimeStep.step() 직접 호출
                        if (g.loop && typeof g.loop.step === 'function') {
                            g.loop.step(performance.now());
                        }
                    } catch(e) {}
                }, 16);
            }
        } else {
            // 탭 활성화: setInterval 제거, rAF 루프 복원
            if (window._bgLoopId) {
                clearInterval(window._bgLoopId);
                window._bgLoopId = null;
            }
        }
    });
})();

