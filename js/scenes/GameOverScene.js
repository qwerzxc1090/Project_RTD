var Game = window.Game || {};

Game.GameOverScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function GameOverScene() {
        Phaser.Scene.call(this, { key: 'GameOverScene' });
    },
    
    init: function(data) {
        this.isVictory = data.victory || false;
        this.finalRound = data.round || 0;
        this.remainingLives = data.lives || 0;
        this.totalGold = data.goldEarned || 0;
        this.monstersOnField = data.monstersOnField || 0;
    },
    
    create: function() {
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        
        // Background
        this._createBackground(W, H);
        
        // Result display
        this._createResult(W, H);
        
        // Stats
        this._createStats(W, H);
        
        // Buttons
        this._createButtons(W, H);
        
        // Effects
        if (this.isVictory) {
            this._createVictoryEffects(W, H);
        }
    },
    
    _createBackground: function(W, H) {
        var bg = this.add.graphics();
        if (this.isVictory) {
            bg.fillGradientStyle(0x0a1a0a, 0x0a1a0a, 0x0a2a1a, 0x0a2a1a, 1);
        } else {
            bg.fillGradientStyle(0x1a0a0a, 0x1a0a0a, 0x2a0a0a, 0x2a0a0a, 1);
        }
        bg.fillRect(0, 0, W, H);
        
        // Grid overlay
        var grid = this.add.graphics();
        grid.lineStyle(1, 0x1a1a3e, 0.1);
        for (var x = 0; x < W; x += 40) {
            grid.lineBetween(x, 0, x, H);
        }
        for (var y = 0; y < H; y += 40) {
            grid.lineBetween(0, y, W, y);
        }
    },
    
    _createResult: function(W, H) {
        // Large result text
        var titleColor = this.isVictory ? '#FFD700' : '#FF4444';
        var titleText = this.isVictory ? '승리!' : '패배...';
        var subtitleText = this.isVictory ? 'VICTORY' : 'GAME OVER';
        
        // Glow
        var glow = this.add.graphics();
        glow.fillStyle(this.isVictory ? 0xFFD700 : 0xFF4444, 0.1);
        glow.fillCircle(W / 2, 140, 180);
        
        this.tweens.add({
            targets: glow,
            alpha: 0.3,
            duration: 1500,
            yoyo: true,
            repeat: -1
        });
        
        var title = this.add.text(W / 2, 100, titleText, {
            fontSize: '58px',
            fontFamily: 'Oxanium',
            color: titleColor,
            stroke: '#000000',
            strokeThickness: 6
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: title,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 800,
            ease: 'Back.easeOut'
        });
        
        var subtitle = this.add.text(W / 2, 170, subtitleText, {
            fontSize: '19px',
            fontFamily: 'Oxanium',
            color: this.isVictory ? '#44FF44' : '#FF8888',
            stroke: '#000000',
            strokeThickness: 3
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: subtitle,
            alpha: 1,
            delay: 400,
            duration: 500
        });
    },
    
    _createStats: function(W, H) {
        var statsY = 240;
        
        // Stats panel
        var panel = this.add.graphics();
        panel.fillStyle(0x0a0a1f, 0.8);
        panel.fillRoundedRect(W / 2 - 200, statsY, 400, 180, 10);
        panel.lineStyle(2, this.isVictory ? 0xFFD700 : 0xFF4444, 0.5);
        panel.strokeRoundedRect(W / 2 - 200, statsY, 400, 180, 10);
        
        var stats = [
            { label: '클리어 라운드', value: this.finalRound + ' / ' + Game.Config.TOTAL_ROUNDS },
            { label: '필드 몬스터', value: this.monstersOnField + ' / ' + Game.Config.MAX_MONSTERS },
            { label: '획득 골드', value: this.totalGold.toString() + 'G' }
        ];
        
        for (var i = 0; i < stats.length; i++) {
            var sy = statsY + 30 + i * 50;
            
            this.add.text(W / 2 - 170, sy, stats[i].label, {
                fontSize: '12px',
                fontFamily: 'Oxanium',
                color: '#888888'
            });
            
            var valText = this.add.text(W / 2 + 170, sy, stats[i].value, {
                fontSize: '17px',
                fontFamily: 'Oxanium',
                color: '#FFFFFF'
            }).setOrigin(1, 0).setAlpha(0);
            
            this.tweens.add({
                targets: valText,
                alpha: 1,
                x: valText.x,
                delay: 600 + i * 300,
                duration: 400
            });
        }
        
        // Score calculation
        var score = this.finalRound * 100 + this.remainingLives * 50 + this.totalGold;
        var scoreText = this.add.text(W / 2, statsY + 160, '총 점수: ' + score, {
            fontSize: '14px',
            fontFamily: 'Oxanium',
            color: '#FFD700',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setAlpha(0);
        
        this.tweens.add({
            targets: scoreText,
            alpha: 1,
            delay: 1800,
            duration: 500
        });
    },
    
    _createButtons: function(W, H) {
        var self = this;
        var btnY = 490;
        
        // Retry button
        this._makeButton(W / 2 - 140, btnY, '다시 시작', '#44FF44', 0x44FF44, function() {
            self._transitionTo('GameScene');
        });
        
        // Menu button
        this._makeButton(W / 2 + 60, btnY, '메뉴로', '#4488FF', 0x4488FF, function() {
            self._transitionTo('MenuScene');
        });
    },
    
    _makeButton: function(x, y, text, textColor, borderColor, callback) {
        var btnW = 160;
        var btnH = 45;
        
        var btn = this.add.graphics();
        btn.fillStyle(0x1a1a2e, 1);
        btn.fillRoundedRect(x, y, btnW, btnH, 8);
        btn.lineStyle(2, borderColor, 0.8);
        btn.strokeRoundedRect(x, y, btnW, btnH, 8);
        
        var btnText = this.add.text(x + btnW / 2, y + btnH / 2, text, {
            fontSize: '13px',
            fontFamily: 'Oxanium',
            color: textColor
        }).setOrigin(0.5);
        
        var hitZone = this.add.zone(x + btnW / 2, y + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true });
        
        hitZone.on('pointerover', function() {
            btn.clear();
            btn.fillStyle(0x2a2a4e, 1);
            btn.fillRoundedRect(x, y, btnW, btnH, 8);
            btn.lineStyle(2, borderColor, 1);
            btn.strokeRoundedRect(x, y, btnW, btnH, 8);
        });
        
        hitZone.on('pointerout', function() {
            btn.clear();
            btn.fillStyle(0x1a1a2e, 1);
            btn.fillRoundedRect(x, y, btnW, btnH, 8);
            btn.lineStyle(2, borderColor, 0.8);
            btn.strokeRoundedRect(x, y, btnW, btnH, 8);
        });
        
        hitZone.on('pointerdown', function() {
            callback();
        });
    },
    
    _transitionTo: function(sceneKey) {
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        var self = this;
        
        var overlay = this.add.graphics();
        overlay.fillStyle(0x000000, 0);
        overlay.fillRect(0, 0, W, H);
        overlay.setDepth(100);
        
        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 500,
            onComplete: function() {
                self.scene.start(sceneKey);
            }
        });
    },
    
    _createVictoryEffects: function(W, H) {
        var self = this;
        var colors = [0xFFD700, 0xFF4444, 0x44FF44, 0x4488FF, 0xAA44FF];
        
        // Confetti-like particles
        for (var i = 0; i < 40; i++) {
            (function(index) {
                self.time.delayedCall(index * 50, function() {
                    var p = self.add.graphics();
                    var color = colors[Math.floor(Math.random() * colors.length)];
                    p.fillStyle(color, 1);
                    
                    if (Math.random() > 0.5) {
                        p.fillRect(-3, -3, 6, 6);
                    } else {
                        p.fillCircle(0, 0, 3);
                    }
                    
                    p.setPosition(Math.random() * W, -10);
                    
                    self.tweens.add({
                        targets: p,
                        y: H + 20,
                        x: p.x + (Math.random() - 0.5) * 200,
                        angle: Math.random() * 720,
                        alpha: 0,
                        duration: 2000 + Math.random() * 2000,
                        onComplete: function() { p.destroy(); }
                    });
                });
            })(i);
        }
    }
});

window.Game = Game;
