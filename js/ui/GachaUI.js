var Game = window.Game || {};

// ── 등급 한글 이름 ──
Game.TIER_NAMES = {
    normal:     '일반',
    rare:       '레어',
    ancient:    '고대',
    relic:      '유물',
    saga:       '서사',
    legend:     '전설',
    epic:       '에픽',
    myth:       '신화',
    primordial: '태초'
};

// ──────────────────────────────────────────
//  GachaUI
// ──────────────────────────────────────────
Game.GachaUI = function(scene, x, y) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    this.scene = scene;
    this.isAnimating = false;
    this.autoGacha = false;
    this.autoGachaTimer = null;
    this.AUTO_GACHA_INTERVAL = 1111;  // 1500ms → 1111ms (속도 35% 증가)

    this._createUI();
    this._createAutoGachaBtn();
    this._createDevGoldBtns();
    scene.add.existing(this);

    // ── localStorage에서 자동 뽑기 상태 복원 ──
    var savedAuto = false;
    try { savedAuto = localStorage.getItem('rtd_autoGacha') === '1'; } catch(e) {}
    if (savedAuto) {
        this.autoGacha = true;
        this._startAutoGacha();
    }

    // 슬롯 가득 참 → 자동 뽑기 강제 OFF
    var self = this;
    scene.events.on('gachaRollback', function() {
        if (self.autoGacha) {
            self._stopAutoGacha();
        }
        // 배치 불가 안내
        self._showFullMessage();
    });
};

Game.GachaUI.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.GachaUI.prototype.constructor = Game.GachaUI;

// ── 뽑기 버튼 ──
Game.GachaUI.prototype._createUI = function() {
    var btnG = this.scene.add.graphics();
    btnG.fillStyle(0x1a1a2e, 1);
    btnG.fillRoundedRect(-60, -25, 120, 50, 8);
    btnG.lineStyle(2, 0xFFD700, 0.8);
    btnG.strokeRoundedRect(-60, -25, 120, 50, 8);
    this.add(btnG);
    this.btnBackground = btnG;

    this.btnText = this.scene.add.text(0, -8, '뽑기', {
        fontSize: '14px', fontFamily: 'Oxanium', color: '#FFD700', align: 'center'
    }).setOrigin(0.5);
    this.add(this.btnText);

    this.costText = this.scene.add.text(0, 10, Game.Config.GACHA_COST + 'G', {
        fontSize: '10px', fontFamily: 'Oxanium', color: '#AAAAAA', align: 'center'
    }).setOrigin(0.5);
    this.add(this.costText);

    var hitArea = new Phaser.Geom.Rectangle(-60, -25, 120, 50);
    this.setInteractive(hitArea, Phaser.Geom.Rectangle.Contains);

    var self = this;
    this.on('pointerover', function() {
        if (!self.isAnimating)
            self.scene.tweens.add({ targets: self, scaleX: 1.05, scaleY: 1.05, duration: 100 });
    });
    this.on('pointerout', function() {
        if (!self.isAnimating)
            self.scene.tweens.add({ targets: self, scaleX: 1, scaleY: 1, duration: 100 });
    });
    this.on('pointerdown', function() { self._onGachaClick(); });
};

// ── AUTO 버튼 (씬 직접 추가) ──
Game.GachaUI.prototype._createAutoGachaBtn = function() {
    var self = this;
    var ax = this.x + 148, ay = this.y;
    var bw = 90, bh = 50;

    this.autoBtnBg = this.scene.add.graphics().setDepth(96);
    this._drawAutoBtn(false);

    this.autoLabel = this.scene.add.text(ax, ay - 13, 'AUTO', {
        fontSize: '11px', fontFamily: 'Oxanium', color: '#888888'
    }).setOrigin(0.5).setDepth(96);

    this.autoStateText = this.scene.add.text(ax, ay + 5, 'OFF', {
        fontSize: '13px', fontFamily: 'Oxanium', color: '#555555'
    }).setOrigin(0.5).setDepth(96);

    this.autoDots = this.scene.add.text(ax, ay + 19, '', {
        fontSize: '8px', fontFamily: 'Oxanium', color: '#44FF44'
    }).setOrigin(0.5).setDepth(96);

    this.autoHitZone = this.scene.add.rectangle(ax, ay, bw, bh)
        .setInteractive({ useHandCursor: true }).setDepth(97).setAlpha(0.001);

    this.autoHitZone.on('pointerover', function() {
        if (!self.autoGacha) self._drawAutoBtn(false, true);
    });
    this.autoHitZone.on('pointerout', function() {
        if (!self.autoGacha) self._drawAutoBtn(false, false);
    });
    this.autoHitZone.on('pointerdown', function() { self._toggleAutoGacha(); });
};

// ── 개발자용 골드 추가 버튼 ──
Game.GachaUI.prototype._createDevGoldBtns = function() {
    var self = this;
    var ax   = this.x + 148;
    var ay   = this.y;

    var amounts = [500, 1000, 10000];
    var bw = 52, bh = 20, gap = 3;
    var totalW  = amounts.length * bw + (amounts.length - 1) * gap;
    var startX  = ax - totalW / 2;
    var btnY    = ay - 38;   // AUTO 버튼(50px) 위

    // DEV 라벨
    this._devLabel = this.scene.add.text(ax, btnY - 14, '[ DEV ]', {
        fontSize: '7px', fontFamily: 'Oxanium', color: '#FF6600', alpha: 0.7
    }).setOrigin(0.5).setDepth(96);

    this._devGoldBtns = [];

    for (var i = 0; i < amounts.length; i++) {
        (function(amount, idx) {
            var bx  = startX + idx * (bw + gap) + bw / 2;
            var lbl = '+' + (amount >= 10000 ? '10K' : amount >= 1000 ? '1K' : amount) + 'G';

            // 배경
            var bg = self.scene.add.graphics().setDepth(96);
            function drawBg(hover) {
                bg.clear();
                bg.fillStyle(hover ? 0x1a1400 : 0x0a0a00, 1);
                bg.fillRoundedRect(bx - bw/2, btnY - bh/2, bw, bh, 4);
                bg.lineStyle(1, hover ? 0xFFDD00 : 0xFFAA00, hover ? 1 : 0.65);
                bg.strokeRoundedRect(bx - bw/2, btnY - bh/2, bw, bh, 4);
            }
            drawBg(false);

            // 레이블
            var txt = self.scene.add.text(bx, btnY, lbl, {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#FFAA00'
            }).setOrigin(0.5).setDepth(96);

            // 히트존
            var zone = self.scene.add.rectangle(bx, btnY, bw, bh)
                .setInteractive({ useHandCursor: true })
                .setDepth(97).setAlpha(0.001);

            zone.on('pointerover',  function() { drawBg(true);  });
            zone.on('pointerout',   function() { drawBg(false); });
            zone.on('pointerdown',  function() {
                if (Game.EconomySystem) {
                    Game.EconomySystem.addGold(amount);
                    if (Game.GoldLog) {
                        Game.GoldLog.add(amount, '[DEV] +' + lbl.replace('+',''), '#FFAA00');
                    }
                }
                // 클릭 flash
                self.scene.tweens.add({
                    targets: txt,
                    scaleX: 1.4, scaleY: 1.4,
                    duration: 70, yoyo: true
                });
            });

            self._devGoldBtns.push({ bg: bg, txt: txt, zone: zone });
        })(amounts[i], i);
    }
};

Game.GachaUI.prototype._drawAutoBtn = function(active, hover) {
    var ax = this.x + 148, ay = this.y, bw = 90, bh = 50;
    this.autoBtnBg.clear();
    if (active) {
        this.autoBtnBg.fillStyle(0x0a2a0a, 1);
        this.autoBtnBg.fillRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
        this.autoBtnBg.lineStyle(2, 0x44FF44, 1);
        this.autoBtnBg.strokeRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
    } else if (hover) {
        this.autoBtnBg.fillStyle(0x1a1a2e, 1);
        this.autoBtnBg.fillRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
        this.autoBtnBg.lineStyle(2, 0x666666, 1);
        this.autoBtnBg.strokeRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
    } else {
        this.autoBtnBg.fillStyle(0x111118, 1);
        this.autoBtnBg.fillRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
        this.autoBtnBg.lineStyle(1, 0x444466, 1);
        this.autoBtnBg.strokeRoundedRect(ax - bw/2, ay - bh/2, bw, bh, 8);
    }
};

Game.GachaUI.prototype._toggleAutoGacha = function() {
    this.autoGacha = !this.autoGacha;
    // ── 상태 영구 저장 ──
    try { localStorage.setItem('rtd_autoGacha', this.autoGacha ? '1' : '0'); } catch(e) {}
    if (this.autoGacha) this._startAutoGacha();
    else this._stopAutoGacha();
};

Game.GachaUI.prototype._startAutoGacha = function() {
    var self = this;
    this._drawAutoBtn(true);
    this.autoLabel.setColor('#44FF44');
    this.autoStateText.setText('ON').setColor('#44FF44');

    // 상시 점 애니메이션 제거 — 뽑기 성공 시에만 깜빡임 표시
    this.autoDots.setText('').setAlpha(1);

    this.autoGachaTimer = this.scene.time.addEvent({
        delay: this.AUTO_GACHA_INTERVAL,
        callback: function() {
            if (!self.autoGacha) return;
            if (Game.GachaSystem.canAfford() && !self.isAnimating) self._onGachaClick();
            else if (!Game.GachaSystem.canAfford()) self.autoDots.setText('💰');
        },
        loop: true
    });

    var ax = this.x + 148, ay = this.y;
    var flash = this.scene.add.graphics();
    flash.fillStyle(0x44FF44, 0.35);
    flash.fillCircle(ax, ay, 45);
    this.scene.tweens.add({
        targets: flash, scaleX: 2, scaleY: 2, alpha: 0, duration: 300,
        onComplete: function() { flash.destroy(); }
    });
};

Game.GachaUI.prototype._stopAutoGacha = function() {
    if (this.autoGachaTimer) { this.autoGachaTimer.remove(); this.autoGachaTimer = null; }
    if (this._dotAnim)       { this._dotAnim.remove();       this._dotAnim = null; }
    this._drawAutoBtn(false);
    this.autoLabel.setColor('#888888');
    this.autoStateText.setText('OFF').setColor('#555555');
    this.autoDots.setText('');
};

// ── 뽑기 실행 ──
Game.GachaUI.prototype._onGachaClick = function() {
    if (this.isAnimating) return;
    if (!Game.GachaSystem.canAfford()) { this._showInsufficientGold(); return; }
    var unit = Game.GachaSystem.performGacha();
    if (unit) {
        this._playGachaAnimation(unit);
    }
};

Game.GachaUI.prototype._playGachaAnimation = function(unit) {
    var self = this;
    this.isAnimating = true;

    var tierColor    = Game.Config.COLORS.TIER[unit.tier] || 0xFFFFFF;
    var tierColorStr = '#' + tierColor.toString(16).padStart(6, '0');
    var tierName     = Game.TIER_NAMES[unit.tier] || unit.tier;
    var isSpecial    = Game.GachaSystem.isSpecialTier(unit.tier);

    // 플래시
    var flash = this.scene.add.graphics();
    flash.setPosition(this.x, this.y);
    flash.fillStyle(tierColor, 0.8);
    flash.fillCircle(0, 0, isSpecial ? 20 : 10);
    this.scene.tweens.add({
        targets: flash, scaleX: isSpecial ? 12 : 8, scaleY: isSpecial ? 12 : 8, alpha: 0,
        duration: isSpecial ? 800 : 500,
        onComplete: function() { flash.destroy(); }
    });

    if (isSpecial) {
        // ★ 전설 이상: 풀스크린 특별 알림 UI
        this._showSpecialAcquireUI(unit, tierColor, tierColorStr, tierName);
    } else {
        // 일반 결과 텍스트
        var holdTime = this.autoGacha ? 250 : 1000;
        var resultText = this.scene.add.text(this.x, this.y - 60,
            '[' + tierName + '] ' + unit.name, {
            fontSize: '12px', fontFamily: 'Oxanium',
            color: tierColorStr, stroke: '#000000', strokeThickness: 3, align: 'center'
        }).setOrigin(0.5).setAlpha(0).setDepth(200);

        this.scene.tweens.add({
            targets: resultText, alpha: 1, y: resultText.y - 20, duration: 200, hold: holdTime,
            onComplete: function() {
                self.scene.tweens.add({
                    targets: resultText, alpha: 0, y: resultText.y - 20, duration: 200,
                    onComplete: function() { resultText.destroy(); self.isAnimating = false; }
                });
            }
        });
    }

    if (unit.tier === 'primordial') this._primordialEffect();
    else if (unit.tier === 'myth')  this._legendaryEffect(tierColor, 18);
    else if (unit.tier === 'epic')  this._legendaryEffect(tierColor, 14);
    else if (unit.tier === 'legend') this._legendaryEffect(tierColor, 12);

    this.scene.events.emit('gachaResult', unit);

    // ── AUTO ON일 때 뽑기 성공 깜빡임 ──
    if (this.autoGacha && this.autoDots) {
        var tierColorStr2 = '#' + (tierColor).toString(16).padStart(6, '0');
        this.autoDots.setText('✦').setColor(tierColorStr2).setAlpha(1).setScale(1);
        if (this._dotsFlashTween) this._dotsFlashTween.stop();
        this._dotsFlashTween = this.scene.tweens.add({
            targets: this.autoDots,
            scaleX: 1.5, scaleY: 1.5,
            duration: 120,
            yoyo: true,
            onComplete: function() {
                self.scene.tweens.add({
                    targets: self.autoDots,
                    alpha: 0,
                    delay: 400,
                    duration: 300,
                    onComplete: function() {
                        self.autoDots.setText('').setAlpha(1).setScale(1);
                    }
                });
            }
        });
    }
};

// ── 전설 이상 특별 획득 UI ──
Game.GachaUI.prototype._showSpecialAcquireUI = function(unit, tierColor, tierColorStr, tierName) {
    var self   = this;
    var W      = Game.Config.WIDTH;
    var H      = Game.Config.HEIGHT;

    // 어두운 오버레이
    var overlay = this.scene.add.graphics().setDepth(500);
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, W, H);
    overlay.setAlpha(0);

    // 패널 배경
    var panelW = 500, panelH = 260;
    var panelX = W / 2 - panelW / 2;
    var panelY = H / 2 - panelH / 2;

    var panel = this.scene.add.graphics().setDepth(501);
    panel.fillStyle(0x050510, 1);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
    panel.lineStyle(3, tierColor, 1);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
    panel.setAlpha(0);

    // 빛나는 테두리 (두 번째 라인)
    var glow = this.scene.add.graphics().setDepth(501);
    glow.lineStyle(6, tierColor, 0.3);
    glow.strokeRoundedRect(panelX - 3, panelY - 3, panelW + 6, panelH + 6, 18);
    glow.setAlpha(0);

    // 등급 배지
    var badgeSize = 56;
    var badge = this.scene.add.graphics().setDepth(502);
    badge.fillStyle(tierColor, 1);
    badge.fillRoundedRect(W/2 - badgeSize/2, panelY - badgeSize/2, badgeSize, badgeSize, 12);
    badge.lineStyle(2, 0xFFFFFF, 0.5);
    badge.strokeRoundedRect(W/2 - badgeSize/2, panelY - badgeSize/2, badgeSize, badgeSize, 12);
    badge.setAlpha(0);

    var badgeText = this.scene.add.text(W/2, panelY, tierName, {
        fontSize: '12px', fontFamily: 'Oxanium',
        color: '#000000', stroke: '#000000', strokeThickness: 1
    }).setOrigin(0.5).setDepth(503).setAlpha(0);

    // 획득! 헤더
    var headerText = this.scene.add.text(W/2, panelY + 50, '✦  획득  ✦', {
        fontSize: '16px', fontFamily: 'Oxanium',
        color: tierColorStr, stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(502).setAlpha(0);

    // 유닛 이름
    var nameText = this.scene.add.text(W/2, panelY + 100, unit.name, {
        fontSize: unit.tier === 'primordial' ? '22px' : '18px',
        fontFamily: 'Oxanium',
        color: tierColorStr,
        stroke: '#000000',
        strokeThickness: 4
    }).setOrigin(0.5).setDepth(502).setAlpha(0);

    // 스탯 요약
    var statsStr = '공격력 ' + unit.damage + '  │  속도 ' + unit.attackSpeed + 'ms  │  사정거리 ' + unit.range;
    var statsText = this.scene.add.text(W/2, panelY + 145, statsStr, {
        fontSize: '10px', fontFamily: 'Oxanium',
        color: '#AAAAAA', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(502).setAlpha(0);

    // 닫기 안내
    var closeHint = this.scene.add.text(W/2, panelY + panelH - 28, '화면을 클릭하여 닫기', {
        fontSize: '8px', fontFamily: 'Oxanium', color: '#555555'
    }).setOrigin(0.5).setDepth(502).setAlpha(0);

    var allObjs = [overlay, panel, glow, badge, badgeText, headerText, nameText, statsText, closeHint];

    // 등장 애니메이션
    this.scene.tweens.add({
        targets: allObjs, alpha: 1, duration: 350, ease: 'Power2'
    });
    nameText.setScale(0.6);
    this.scene.tweens.add({
        targets: nameText, scaleX: 1, scaleY: 1, duration: 400, ease: 'Back.easeOut', delay: 150
    });

    // 배지 펄스
    this.scene.tweens.add({
        targets: badge, scaleX: 1.1, scaleY: 1.1, duration: 700,
        yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
    });

    // 닫기 클릭
    var closeZone = this.scene.add.rectangle(W/2, H/2, W, H)
        .setInteractive().setDepth(510).setAlpha(0.001);

    closeZone.once('pointerdown', function() {
        self.scene.tweens.add({
            targets: allObjs, alpha: 0, duration: 250,
            onComplete: function() {
                allObjs.forEach(function(o) { o.destroy(); });
                closeZone.destroy();
                self.isAnimating = false;
            }
        });
    });

    // 5초 후 자동 닫기
    this.scene.time.delayedCall(5000, function() {
        if (closeZone.active) closeZone.emit('pointerdown');
    });
};

// ── 파티클 이펙트 ──
Game.GachaUI.prototype._legendaryEffect = function(color, count) {
    count = count || 12;
    for (var i = 0; i < count; i++) {
        var p = this.scene.add.graphics();
        p.setPosition(this.x, this.y);
        p.fillStyle(color || 0xFFD700, 1);
        p.fillRect(-3, -3, 6, 6);
        var angle = (Math.PI * 2 / count) * i;
        var dist  = 80 + Math.random() * 50;
        this.scene.tweens.add({
            targets: p,
            x: this.x + Math.cos(angle) * dist,
            y: this.y + Math.sin(angle) * dist,
            alpha: 0, scaleX: 0.2, scaleY: 0.2,
            duration: 700 + Math.random() * 300,
            onComplete: function() { p.destroy(); }
        });
    }
};

Game.GachaUI.prototype._primordialEffect = function() {
    // 태초: 화면 전체 파티클
    for (var i = 0; i < 30; i++) {
        var p = this.scene.add.graphics().setDepth(499);
        p.fillStyle(0x00FFFF, 1);
        p.fillCircle(0, 0, 4);
        p.setPosition(
            Game.Config.WIDTH / 2 + (Math.random() - 0.5) * 400,
            Game.Config.HEIGHT / 2 + (Math.random() - 0.5) * 300
        );
        this.scene.tweens.add({
            targets: p,
            y: p.y - 150 - Math.random() * 100,
            alpha: 0, scaleX: 0.1, scaleY: 0.1,
            duration: 1200 + Math.random() * 600,
            delay: Math.random() * 400,
            onComplete: function() { p.destroy(); }
        });
    }
};

Game.GachaUI.prototype._showInsufficientGold = function() {
    var self = this;
    this.scene.tweens.add({
        targets: this, x: this.x - 5, duration: 50, yoyo: true, repeat: 3,
        onComplete: function() {}
    });
    var warnText = this.scene.add.text(this.x, this.y - 40, '골드 부족!', {
        fontSize: '10px', fontFamily: 'Oxanium',
        color: '#FF4444', stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(200);
    this.scene.tweens.add({
        targets: warnText, alpha: 0, y: warnText.y - 20, duration: 800,
        onComplete: function() { warnText.destroy(); }
    });
    if (this.autoGacha) this.autoDots.setText('💰');
};

Game.GachaUI.prototype.updateAffordability = function() {
    var canAfford = Game.GachaSystem.canAfford();
    this.costText.setColor(canAfford ? '#AAAAAA' : '#FF4444');
    this.btnText.setColor(canAfford ? '#FFD700' : '#666666');
};

Game.GachaUI.prototype.destroy = function() {
    this._stopAutoGacha();
    if (this.autoBtnBg)    this.autoBtnBg.destroy();
    if (this.autoLabel)    this.autoLabel.destroy();
    if (this.autoStateText) this.autoStateText.destroy();
    if (this.autoDots)     this.autoDots.destroy();
    if (this.autoHitZone)  this.autoHitZone.destroy();
    if (this._devLabel)    this._devLabel.destroy();
    if (this._devGoldBtns) {
        this._devGoldBtns.forEach(function(b) {
            if (b.bg)   b.bg.destroy();
            if (b.txt)  b.txt.destroy();
            if (b.zone) b.zone.destroy();
        });
    }
    Phaser.GameObjects.Container.prototype.destroy.call(this);
};

// 배치 공간 가득 참 → 롤백 안내 메시지
Game.GachaUI.prototype._showFullMessage = function() {
    var W = Game.Config.WIDTH;

    // 화면 중앙 플래시 메시지
    var msg = this.scene.add.text(W / 2, Game.Config.HEIGHT / 2 - 60,
        '⚠  배치 공간 가득 참\n뽑기 롤백 · 자동 OFF', {
        fontSize: '12px',
        fontFamily: 'Oxanium',
        color: '#FF4444',
        stroke: '#000000',
        strokeThickness: 3,
        align: 'center',
        lineSpacing: 6
    }).setOrigin(0.5).setDepth(300).setAlpha(0);

    var bg = this.scene.add.graphics().setDepth(299);
    bg.fillStyle(0x1a0000, 0.85);
    bg.fillRoundedRect(W/2 - 140, Game.Config.HEIGHT/2 - 90, 280, 60, 8);
    bg.lineStyle(2, 0xFF4444, 0.9);
    bg.strokeRoundedRect(W/2 - 140, Game.Config.HEIGHT/2 - 90, 280, 60, 8);
    bg.setAlpha(0);

    // 페이드 인 → 유지 → 페이드 아웃
    this.scene.tweens.add({
        targets: [msg, bg], alpha: 1, duration: 200,
        onComplete: function() {
            this.scene.time.delayedCall(1800, function() {
                this.scene.tweens.add({
                    targets: [msg, bg], alpha: 0, duration: 400,
                    onComplete: function() { msg.destroy(); bg.destroy(); }
                });
            }, [], this);
        },
        callbackScope: this
    });
};

window.Game = Game;
