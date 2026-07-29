var Game = window.Game || {};

Game.HUD = function(scene) {
    Phaser.GameObjects.Container.call(this, scene, 0, 0);
    
    this.scene = scene;
    this.setDepth(100);
    
    this._createTopBar();
    this._createSpeedButton();
    this._createRoundInfo();
    this._createSpacePrompt();
    this._createTierGuide();
    
    scene.add.existing(this);
};

Game.HUD.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.HUD.prototype.constructor = Game.HUD;

Game.HUD.prototype._createTopBar = function() {
    var UL = Game.UILayout.get.bind(Game.UILayout, 'game');

    // Top bar background
    var barCfg = UL('hud.bar');
    var topBar = this.scene.add.graphics();
    topBar.fillStyle(0x0a0a0f, 0.9);
    topBar.fillRect(barCfg.x, barCfg.y, barCfg.w || Game.Config.WIDTH, barCfg.h || 36);
    topBar.lineStyle(1, 0x2a2a4e, 1);
    topBar.lineBetween(barCfg.x, (barCfg.h || 36), (barCfg.w || Game.Config.WIDTH), (barCfg.h || 36));
    this.add(topBar);

    // Lives
    var livesCfg = UL('hud.lives');
    var heartIcon = this.scene.add.graphics();
    heartIcon.fillStyle(0xFF4444, 1);
    heartIcon.fillRect(livesCfg.x - 26, 10, 6, 6);
    heartIcon.fillRect(livesCfg.x - 18, 10, 6, 6);
    heartIcon.fillRect(livesCfg.x - 28, 12, 18, 6);
    heartIcon.fillRect(livesCfg.x - 26, 18, 14, 4);
    heartIcon.fillRect(livesCfg.x - 24, 22, 10, 2);
    heartIcon.fillRect(livesCfg.x - 22, 24, 6, 2);
    heartIcon.fillRect(livesCfg.x - 20, 26, 2, 1);
    this.add(heartIcon);
    this.livesText = this.scene.add.text(livesCfg.x, livesCfg.y, Game.Config.INITIAL_LIVES.toString(), {
        fontSize: (livesCfg.fontSize || 16) + 'px', fontFamily: 'Oxanium', color: '#FF4444'
    }).setOrigin(0, 0.5);
    this.add(this.livesText);

    // Gold
    var goldCfg = UL('hud.gold');
    var goldIcon = this.scene.add.graphics();
    goldIcon.fillStyle(0xFFD700, 1);
    goldIcon.fillCircle(goldCfg.x - 15, goldCfg.y, 8);
    goldIcon.fillStyle(0xCC9900, 1);
    goldIcon.fillCircle(goldCfg.x - 15, goldCfg.y, 5);
    goldIcon.fillStyle(0xFFD700, 1);
    this.add(goldIcon);
    this.goldText = this.scene.add.text(goldCfg.x, goldCfg.y, Game.Config.INITIAL_GOLD.toString(), {
        fontSize: (goldCfg.fontSize || 14) + 'px', fontFamily: 'Oxanium', color: '#FFD700'
    }).setOrigin(0, 0.5);
    this.add(this.goldText);

    // Play time
    var timeCfg = UL('hud.time');
    var timeIcon = this.scene.add.graphics();
    timeIcon.lineStyle(2, 0x88CCFF, 1);
    timeIcon.strokeCircle(timeCfg.x - 15, timeCfg.y, 6);
    timeIcon.lineStyle(1.5, 0x88CCFF, 1);
    timeIcon.lineBetween(timeCfg.x - 15, timeCfg.y - 3, timeCfg.x - 15, timeCfg.y);
    timeIcon.lineBetween(timeCfg.x - 15, timeCfg.y, timeCfg.x - 13, timeCfg.y + 2);
    this.add(timeIcon);
    this.playTimeText = this.scene.add.text(timeCfg.x, timeCfg.y, '00:00', {
        fontSize: (timeCfg.fontSize || 14) + 'px', fontFamily: 'Oxanium', color: '#88CCFF'
    }).setOrigin(0, 0.5);
    this.add(this.playTimeText);

    // Round (center)
    var roundCfg = UL('hud.round');
    this.roundText = this.scene.add.text(roundCfg.x, roundCfg.y, 'ROUND 0 / ' + Game.Config.TOTAL_ROUNDS, {
        fontSize: (roundCfg.fontSize || 14) + 'px', fontFamily: 'Oxanium', color: '#FFFFFF', align: 'center'
    }).setOrigin(0.5, 0);
    this.add(this.roundText);

    // Status (right)
    var statusCfg = UL('hud.status');
    this.statusText = this.scene.add.text(statusCfg.x, statusCfg.y, '대기중', {
        fontSize: (statusCfg.fontSize || 12) + 'px', fontFamily: 'Oxanium', color: '#AAAAAA', align: 'right'
    }).setOrigin(1, 0);
    this.add(this.statusText);

    // 등급 점수 (실시간)
    this.gradeScoreText = this.scene.add.text(statusCfg.x - 130, statusCfg.y, '★ 점수: -', {
        fontSize: '11px', fontFamily: 'Oxanium', color: '#44DDFF', align: 'right'
    }).setOrigin(1, 0);
    this.add(this.gradeScoreText);

    // 📊 DPS 토글 버튼
    var self = this;
    this.dpsBtnText = this.scene.add.text(statusCfg.x - 240, statusCfg.y, '📊 DPS', {
        fontSize: '11px', fontFamily: 'Oxanium', color: '#FFD700', align: 'right'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });

    this.dpsBtnText.on('pointerdown', function() {
        if (self.scene && self.scene.dpsMeterUI) {
            self.scene.dpsMeterUI.toggle();
        }
    });
    this.add(this.dpsBtnText);
};

Game.HUD.prototype._createSpeedButton = function() {
    var self  = this;
    var speeds = [0.5, 1, 2, 3, 4, 5, 6];

    // 저장된 배속 불러오기
    var saved = 1;
    try { saved = parseFloat(localStorage.getItem('rtd_speed')) || 1; } catch(e) {}
    if (speeds.indexOf(saved) === -1) saved = 1;
    this.speedMultiplier = saved;

    // 위치 설정 (UILayout 참조)
    var spdCfg = Game.UILayout.get('game', 'hud.speedBtn');
    var baseX = spdCfg.x || (Game.Config.WIDTH - 70);
    var baseY = spdCfg.y || (Game.Config.HEIGHT / 2 - 52);
    var bw = 54, bh = 26, gap = 6;

    // SPEED 라벨
    this.scene.add.text(baseX, baseY - 4, 'SPEED', {
        fontSize: '8px',
        fontFamily: 'Oxanium',
        color: '#555577'
    }).setOrigin(0.5, 1).setDepth(102);

    // 색상정의
    this._speedColors = {
        0.5: { active: '#88DDFF', inactive: '#1a2b33', border_a: 0x44BBFF, border_i: 0x0c1a22, bg_a: 0x081a22, bg_i: 0x040811 },
        1: { active: '#AAAAAA', inactive: '#2a2a44', border_a: 0x666688, border_i: 0x1a1a33, bg_a: 0x111122, bg_i: 0x080810 },
        2: { active: '#DDEE00', inactive: '#2b3300', border_a: 0xDDEE00, border_i: 0x1e2200, bg_a: 0x151a00, bg_i: 0x050800 },
        3: { active: '#FFCC00', inactive: '#332a00', border_a: 0xFFCC00, border_i: 0x221a00, bg_a: 0x1a1500, bg_i: 0x080800 },
        4: { active: '#FFAA22', inactive: '#331c00', border_a: 0xFFAA22, border_i: 0x221200, bg_a: 0x1a0d00, bg_i: 0x080400 },
        5: { active: '#FF6633', inactive: '#331000', border_a: 0xFF6633, border_i: 0x220800, bg_a: 0x1a0500, bg_i: 0x080200 },
        6: { active: '#FF3333', inactive: '#330000', border_a: 0xFF3333, border_i: 0x220000, bg_a: 0x1a0000, bg_i: 0x080000 }
    };

    this._speedBtnBgs  = {};
    this._speedBtnTxts = {};
    this._speedBaseX   = baseX;
    this._speedBaseY   = baseY;
    this._speedBW      = bw;
    this._speedBH      = bh;
    this._speedGap     = gap;
    this._speedList    = speeds;

    speeds.forEach(function(spd, idx) {
        var by = baseY + idx * (bh + gap);
        var cy = by + bh / 2;

        // 배경 그래픽 (Scene Level)
        var bg = self.scene.add.graphics().setDepth(101);
        self._speedBtnBgs[spd] = bg;

        // 텍스트 (Scene Level)
        var txt = self.scene.add.text(baseX, cy, spd + 'X', {
            fontSize: '13px',
            fontFamily: 'Oxanium',
            color: '#FFFFFF'
        }).setOrigin(0.5).setDepth(102);
        self._speedBtnTxts[spd] = txt;

        // 인터랙티브 존 (Scene Level)
        var zone = self.scene.add.zone(baseX, cy, bw, bh)
            .setInteractive({ useHandCursor: true })
            .setDepth(103);

        zone.on('pointerover', function() {
            if (self.speedMultiplier !== spd) {
                bg.clear();
                var c = self._speedColors[spd];
                bg.fillStyle(0x1a1a2e, 1);
                bg.fillRoundedRect(baseX - bw/2, by, bw, bh, 5);
                bg.lineStyle(1, c.border_a, 0.5);
                bg.strokeRoundedRect(baseX - bw/2, by, bw, bh, 5);
                txt.setColor(c.active).setAlpha(0.7);
            }
        });
        zone.on('pointerout', function() {
            self._redrawSpeedBtn(spd, by);
        });
        zone.on('pointerdown', function() {
            self._onSpeedSelect(spd);
        });

        // 초기 그리기
        self._redrawSpeedBtn(spd, by);
    });

    // 저장된 배속 있으면 적용
    if (saved !== 1) {
        self.scene.events.emit('speedChanged', saved);
    }
};

Game.HUD.prototype._redrawSpeedBtn = function(spd, by) {
    var bg  = this._speedBtnBgs[spd];
    var txt = this._speedBtnTxts[spd];
    if (!bg || !txt) return;

    var bx      = this._speedBaseX;
    var bw      = this._speedBW;
    var bh      = this._speedBH;
    var c       = this._speedColors[spd];
    var isActive = (this.speedMultiplier === spd);

    bg.clear();
    if (isActive) {
        bg.fillStyle(c.bg_a, 1);
        bg.fillRoundedRect(bx - bw/2, by, bw, bh, 5);
        bg.lineStyle(2, c.border_a, 1);
        bg.strokeRoundedRect(bx - bw/2, by, bw, bh, 5);
        // 외부 글로
        bg.lineStyle(5, c.border_a, 0.18);
        bg.strokeRoundedRect(bx - bw/2 - 3, by - 3, bw + 6, bh + 6, 8);
        txt.setColor(c.active).setAlpha(1).setScale(1.1);
    } else {
        bg.fillStyle(c.bg_i, 1);
        bg.fillRoundedRect(bx - bw/2, by, bw, bh, 5);
        bg.lineStyle(1, c.border_i, 1);
        bg.strokeRoundedRect(bx - bw/2, by, bw, bh, 5);
        txt.setColor(c.inactive).setAlpha(1).setScale(1);
    }
};

Game.HUD.prototype._onSpeedSelect = function(spd) {
    var self    = this;
    var speeds  = this._speedList;
    var baseY   = this._speedBaseY;
    var bh      = this._speedBH;
    var gap     = this._speedGap;

    this.speedMultiplier = spd;

    // localStorage 저장
    try { localStorage.setItem('rtd_speed', spd); } catch(e) {}

    // 모든 버튼 업데이트
    speeds.forEach(function(s, idx) {
        var by = baseY + idx * (bh + gap);
        self._redrawSpeedBtn(s, by);
    });

    this.scene.events.emit('speedChanged', spd);
};

// 호환성 (unused)
Game.HUD.prototype._toggleSpeed = function() {};
Game.HUD.prototype._drawSpeedBtn = function() {};
Game.HUD.prototype._selectSpeed  = function() {};

Game.HUD.prototype._createRoundInfo = function() {
    var bwCfg = Game.UILayout.get('game', 'hud.bossWarning');
    this.bossWarning = this.scene.add.text(bwCfg.x || Game.Config.WIDTH / 2, bwCfg.y || 60, '⚠ BOSS ROUND ⚠', {
        fontSize: (bwCfg.fontSize || 19) + 'px',
        fontFamily: 'Oxanium',
        color: '#FF0000',
        stroke: '#000000',
        strokeThickness: 3
    }).setOrigin(0.5).setVisible(false);
    this.add(this.bossWarning);

    this.waveCompleteText = this.scene.add.text(Game.Config.WIDTH / 2, 100, '', {
        fontSize: '14px',
        fontFamily: 'Oxanium',
        color: '#44FF44',
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0);
    this.add(this.waveCompleteText);
};

Game.HUD.prototype._createSpacePrompt = function() {
    var spCfg = Game.UILayout.get('game', 'hud.spacePrompt');
    this.spacePrompt = this.scene.add.text(
        spCfg.x || Game.Config.WIDTH / 2,
        spCfg.y || Game.Config.HEIGHT / 2,
        '[ SPACE ] 게임 시작', {
        fontSize: (spCfg.fontSize || 22) + 'px',
        fontFamily: 'Oxanium',
        color: '#44FF44',
        stroke: '#000000',
        strokeThickness: 4,
        align: 'center'
    }).setOrigin(0.5).setDepth(150);
    
    // Sub-hint
    this.spaceSubHint = this.scene.add.text(Game.Config.WIDTH / 2, Game.Config.HEIGHT / 2 + 35, '또는 화면을 클릭하세요', {
        fontSize: '11px',
        fontFamily: 'Oxanium',
        color: '#888888',
        stroke: '#000000',
        strokeThickness: 2,
        align: 'center'
    }).setOrigin(0.5).setDepth(150);
    
    // Pulse animation
    this.scene.tweens.add({
        targets: this.spacePrompt,
        alpha: 0.3,
        duration: 800,
        yoyo: true,
        repeat: -1
    });
};

Game.HUD.prototype.hideSpacePrompt = function() {
    if (this.spacePrompt) {
        var prompt = this.spacePrompt;
        this.spacePrompt = null;
        
        this.scene.tweens.killTweensOf(prompt);
        this.scene.tweens.add({
            targets: prompt,
            alpha: 0,
            scaleX: 1.5,
            scaleY: 1.5,
            duration: 400,
            onComplete: function() {
                prompt.destroy();
            }
        });
    }
    
    if (this.spaceSubHint) {
        var subHint = this.spaceSubHint;
        this.spaceSubHint = null;
        this.scene.tweens.add({
            targets: subHint,
            alpha: 0,
            duration: 300,
            onComplete: function() {
                subHint.destroy();
            }
        });
    }
};

// Update methods
Game.HUD.prototype.updateGold = function(amount) {
    this.goldText.setText(Math.floor(amount).toString());
    
    // Gold change animation
    this.scene.tweens.add({
        targets: this.goldText,
        scaleX: 1.3,
        scaleY: 1.3,
        duration: 100,
        yoyo: true
    });
};

Game.HUD.prototype.updateLives = function(lives) {
    this.livesText.setText(lives.toString());

    // 색상: 충분(초록) → 주의(노랑) → 위험(빨강)
    if (lives > 15) {
        this.livesText.setColor('#00FF88');
    } else if (lives > 8) {
        this.livesText.setColor('#FFDD00');
    } else if (lives > 3) {
        this.livesText.setColor('#FF8800');
    } else {
        this.livesText.setColor('#FF2222');
    }

    // 흔들림: 10 이하일 때만
    if (lives <= 10) {
        var lt = this.livesText;
        var baseX = lt._baseX !== undefined ? lt._baseX : lt.x;
        lt._baseX = baseX;

        this.scene.tweens.killTweensOf(lt);
        this.scene.tweens.add({
            targets: lt,
            x: baseX - 3,
            duration: 40,
            yoyo: true,
            repeat: 2,
            onComplete: function() { lt.x = baseX; }
        });
    }
};



Game.HUD.prototype.updatePlayTime = function(timeStr, color) {
    if (!this.playTimeText) return;
    this.playTimeText.setText(timeStr);
    if (color) this.playTimeText.setColor(color);
};

Game.HUD.prototype.updateRound = function(round) {
    this.roundText.setText('ROUND ' + round + ' / ' + Game.Config.TOTAL_ROUNDS);
};

Game.HUD.prototype.updateGradeScore = function(avg) {
    if (!this.gradeScoreText) return;
    var label = avg > 0 ? '★ 점수: ' + avg : '★ 점수: -';
    this.gradeScoreText.setText(label);
};

Game.HUD.prototype.setWaveActive = function(active) {
    if (active) {
        this.statusText.setText('전투중');
        this.statusText.setColor('#FF4444');
    } else {
        this.statusText.setText('준비중');
        this.statusText.setColor('#44FF44');
    }
};

Game.HUD.prototype.showBossWarning = function() {
    this.bossWarning.setVisible(true);
    this.bossWarning.setAlpha(0);
    
    var self = this;
    this.scene.tweens.add({
        targets: this.bossWarning,
        alpha: 1,
        duration: 300,
        yoyo: true,
        repeat: 3,
        onComplete: function() {
            self.bossWarning.setAlpha(1);
            self.scene.time.delayedCall(2000, function() {
                self.bossWarning.setVisible(false);
            });
        }
    });
};

Game.HUD.prototype.showWaveComplete = function(round, bonus) {
    this.waveCompleteText.setText('ROUND ' + round + ' CLEAR! +' + bonus + 'G');
    this.waveCompleteText.setAlpha(0);
    
    var self = this;
    this.scene.tweens.add({
        targets: this.waveCompleteText,
        alpha: 1,
        duration: 300,
        hold: 1500,
        onComplete: function() {
            self.scene.tweens.add({
                targets: self.waveCompleteText,
                alpha: 0,
                duration: 300
            });
        }
    });
};

// ─── 보스 및 제한시간 타이머 UI (Scene Level) ─────────────────────────────

Game.HUD.prototype.showBossTimer = function(seconds, isTimeAttack) {
    var self = this;
    var cfg = Game.UILayout.get('game', 'game.timer');
    var baseX = cfg.x || 350;
    var baseY = cfg.y || 18;
    var fs = (cfg.fontSize || 14) + 'px';
    
    this._isTimeAttackMode = !!isTimeAttack;

    // 기존 타이머 UI 제거
    this._destroyBossTimerUI();

    var textStyleColor = this._isTimeAttackMode ? '#FF4444' : '#00FF88';
    var labelText = 'BOSS';

    // ── 카운트다운 텍스트 ──
    this.bossTimerText = this.scene.add.text(baseX, baseY, labelText + ' ⏱ ' + seconds, {
        fontSize: fs,
        fontFamily: 'Oxanium',
        color: textStyleColor,
        stroke: '#000000',
        strokeThickness: 2
    }).setOrigin(0, 0.5).setDepth(121);

    // Pulse 애니메이션
    this.bossTimerTween = this.scene.tweens.add({
        targets: this.bossTimerText,
        alpha: 0.6,
        duration: 500, yoyo: true, repeat: -1,
        ease: 'Sine.easeInOut'
    });
};

Game.HUD.prototype._drawBossTimerBg = function(borderColor) {
    // 배경 패널 더 이상 사용하지 않음
};

Game.HUD.prototype.updateBossTimer = function(seconds) {
    if (!this.bossTimerText) return;

    var labelText = 'BOSS';
    this.bossTimerText.setText(labelText + ' ⏱ ' + seconds);

    if (seconds <= 10) {
        this.bossTimerText.setColor('#FF0000');
        if (this.bossTimerTween) this.bossTimerTween.timeScale = 3;
    } else if (seconds <= 30) {
        var warnColor = this._isTimeAttackMode ? '#FFAA00' : '#FFDD00';
        this.bossTimerText.setColor(warnColor);
        if (this.bossTimerTween) this.bossTimerTween.timeScale = 1.8;
    } else {
        var normalColor = this._isTimeAttackMode ? '#FF4444' : '#00FF88';
        this.bossTimerText.setColor(normalColor);
        if (this.bossTimerTween) this.bossTimerTween.timeScale = 1;
    }
};

Game.HUD.prototype.hideBossTimer = function(reason) {
    var self = this;

    if (this.bossTimerTween) {
        this.scene.tweens.remove(this.bossTimerTween);
        this.bossTimerTween = null;
    }

    var mainText = '✔ CLEAR!';
    var isTimeOver = (reason === 'timeout');

    if (isTimeOver) {
        mainText = '⏱ TIME OVER!';
    } else if (reason === 'bossKilled' || (this.scene.waveSystem && this.scene.waveSystem.isBossRound())) {
        mainText = '✔ BOSS DOWN!';
    }

    var themeColorStr = isTimeOver ? '#FFAA00' : '#44FF88';

    if (this.bossTimerText)  {
        this.bossTimerText.setText(mainText);
        this.bossTimerText.setColor(themeColorStr);
        this.bossTimerText.setAlpha(1);
    }

    // 1.5초 후 페이드아웃
    if (this.bossTimerText) {
        this.scene.time.delayedCall(1500, function() {
            if (self.bossTimerText) {
                self.scene.tweens.add({
                    targets: self.bossTimerText, alpha: 0, duration: 400,
                    onComplete: function() { self._destroyBossTimerUI(); }
                });
            }
        });
    }
};

Game.HUD.prototype._destroyBossTimerUI = function() {
    if (this.bossTimerTween)  { this.scene.tweens.remove(this.bossTimerTween); this.bossTimerTween = null; }
    if (this.bossTimerText)   { this.bossTimerText.destroy();  this.bossTimerText  = null; }
};

// ──────────────────────────────────────────────────────────────

Game.HUD.prototype.getSpeedMultiplier = function() {
    return this.speedMultiplier;
};

Game.HUD.prototype._createTierGuide = function() {
    var self = this;
    var x = 10;
    var y = 60; // topBar 아래 적절한 위치

    // 등급표 컨테이너
    this.tierGuideContainer = this.scene.add.container(x, y);
    this.tierGuideContainer.setDepth(105);
    this.add(this.tierGuideContainer);

    // 등급 목록 (하위 등급부터 위에서 아래로)
    var tiers = [
        { id: 'normal', name: '일반', prob: '50.0%' },
        { id: 'rare', name: '레어', prob: '33.1%' },
        { id: 'ancient', name: '고대', prob: '10.2%' },
        { id: 'relic', name: '유물', prob: '5.1%' },
        { id: 'saga', name: '서사', prob: '0.8%' },
        { id: 'legend', name: '전설', prob: '0.5%' },
        { id: 'epic', name: '에픽', prob: '0.2%' },
        { id: 'myth', name: '신화', prob: '0.08%' },
        { id: 'primordial', name: '태초', prob: '0.019%' }
    ];

    // 배경 패널
    var bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a0f, 0.85);
    bg.fillRoundedRect(0, 0, 160, tiers.length * 24 + 10, 8);
    bg.lineStyle(1, 0x444466, 0.8);
    bg.strokeRoundedRect(0, 0, 160, tiers.length * 24 + 10, 8);
    this.tierGuideContainer.add(bg);

    // 각 등급별 항목
    for (var i = 0; i < tiers.length; i++) {
        var tier = tiers[i];
        var ty = 10 + i * 24;
        
        // 타워 미니 아이콘 생성 (네모상자)
        var color = Game.Config.COLORS.TIER[tier.id] || 0xFFFFFF;
        var iconG = this.scene.add.graphics();
        
        iconG.fillStyle(color, 1);
        iconG.fillRect(10, ty, 14, 14);
        iconG.lineStyle(1, 0xFFFFFF, 0.5);
        iconG.strokeRect(10, ty, 14, 14);
        
        iconG.fillStyle(color, 0.55);
        iconG.fillRect(11, ty + 1, 12, 12);
        
        iconG.fillStyle(0xFFFFFF, 1);
        iconG.fillRect(13, ty + 4, 2, 2); 
        iconG.fillRect(19, ty + 4, 2, 2); 
        
        iconG.fillStyle(0x000000, 1);
        iconG.fillRect(13, ty + 4, 1, 1); 
        iconG.fillRect(19, ty + 4, 1, 1); 
        
        iconG.fillStyle(0x000000, 0.5);
        iconG.fillRect(15, ty + 9, 4, 1); 
        this.tierGuideContainer.add(iconG);

        // 이름 텍스트
        var nameText = this.scene.add.text(32, ty + 2, tier.name, {
            fontSize: '12px',
            fontFamily: 'Oxanium',
            color: '#' + color.toString(16).padStart(6, '0')
        });
        this.tierGuideContainer.add(nameText);

        // 확률 텍스트
        var probText = this.scene.add.text(150, ty + 3, tier.prob, {
            fontSize: '10px',
            fontFamily: 'Oxanium',
            color: '#AAAAAA',
            align: 'right'
        }).setOrigin(1, 0);
        this.tierGuideContainer.add(probText);
    }

    // 초기 상태: 보이게 설정 (또는 숨김)
    this.tierGuideContainer.setVisible(true);

    // 토글 버튼 (가이드 상단 탭 형태)
    this.tierBtnBg = this.scene.add.graphics();
    this.tierBtnBg.setDepth(105);
    this.tierBtnBg.fillStyle(0x1a1a2e, 0.9);
    this.tierBtnBg.fillRoundedRect(x, y - 22, 70, 20, 4);
    this.tierBtnBg.lineStyle(1, 0x444466, 1);
    this.tierBtnBg.strokeRoundedRect(x, y - 22, 70, 20, 4);
    this.add(this.tierBtnBg);

    this.tierBtnText = this.scene.add.text(x + 35, y - 12, '등급표 ▲', {
        fontSize: '11px',
        fontFamily: 'Oxanium',
        color: '#FFFFFF'
    }).setOrigin(0.5, 0.5).setDepth(106);
    this.add(this.tierBtnText);

    // 토글 인터랙션 처리를 위한 투명 Zone
    var toggleZone = this.scene.add.zone(x + 35, y - 12, 70, 20).setInteractive({ useHandCursor: true });
    toggleZone.setDepth(107);
    this.add(toggleZone);

    toggleZone.on('pointerdown', function() {
        var isVisible = self.tierGuideContainer.visible;
        self.tierGuideContainer.setVisible(!isVisible);
        self.tierBtnText.setText(!isVisible ? '등급표 ▲' : '등급표 ▼');
    });
};

window.Game = Game;
