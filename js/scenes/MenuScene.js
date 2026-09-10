var Game = window.Game || {};

Game.MenuScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function MenuScene() {
        Phaser.Scene.call(this, { key: 'MenuScene' });
    },
    
    create: function() {
        // Phaser reuses this scene instance when returning from a game.
        this._isTransitioning = false;
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;

        // ── 메뉴 진입 시 모드 플래그: localStorage에서 마지막 설정 유지 ──
        
        // Background
        this._createBackground();
        
        // Title
        this._createTitle(W, H);
        
        // Start button
        this._createStartButton(W, H);
        
        // Game info
        this._createGameInfo(W, H);
        
        // Floating particles
        this._createParticles();
        
        // Version text
        this.add.text(W - 10, H - 10, 'v1.0', {
            fontSize: '10px',
            fontFamily: 'Oxanium',
            color: '#333333'
        }).setOrigin(1, 1);

        // 배포판에서는 개발용 진입·계산 시뮬·리포트를 만들지 않는다.
        if (Game.Runtime && Game.Runtime.isDevToolsEnabled()) this._createDevPanel(W, H);
    },
    
    _createBackground: function() {
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        
        // Dark gradient background
        var bg = this.add.graphics();
        bg.fillGradientStyle(0x0a0a1f, 0x0a0a1f, 0x1a0a2f, 0x1a0a2f, 1);
        bg.fillRect(0, 0, W, H);
        
        // Grid lines for depth effect
        var grid = this.add.graphics();
        grid.lineStyle(1, 0x1a1a3e, 0.15);
        for (var x = 0; x < W; x += 40) {
            grid.lineBetween(x, 0, x, H);
        }
        for (var y = 0; y < H; y += 40) {
            grid.lineBetween(0, y, W, y);
        }
    },
     _createTitle: function(W, H) {
        var ULm = Game.UILayout.get.bind(Game.UILayout, 'menu');
        var titleCfg    = ULm('title');
        var subtitleCfg = ULm('subtitle');

        // Glow behind title
        var glow = this.add.graphics();
        glow.fillStyle(0x4488FF, 0.1);
        glow.fillCircle(titleCfg.x, titleCfg.y + 40, 200);
        this.tweens.add({ targets: glow, alpha: 0.3, duration: 2000, yoyo: true, repeat: -1 });

        // Main title
        var titleText = this.add.text(titleCfg.x, titleCfg.y, '운빨 디펜스', {
            fontSize: (titleCfg.fontSize || 43) + 'px',
            fontFamily: 'Black Han Sans', color: '#FFD700',
            stroke: '#000000', strokeThickness: 6
        }).setOrigin(0.5);
        this.tweens.add({
            targets: titleText, y: titleCfg.y + 10,
            duration: 2000, yoyo: true, repeat: -1, ease: 'Sine.easeInOut'
        });

        // Subtitle
        this.add.text(subtitleCfg.x, subtitleCfg.y, 'LUCK DEFENSE', {
            fontSize: (subtitleCfg.fontSize || 17) + 'px',
            fontFamily: 'Oxanium', color: '#4488FF',
            stroke: '#000000', strokeThickness: 3
        }).setOrigin(0.5);

        // Decorative line
        var line = this.add.graphics();
        line.lineStyle(2, 0x4488FF, 0.5);
        line.lineBetween(subtitleCfg.x - 200, subtitleCfg.y + 30, subtitleCfg.x + 200, subtitleCfg.y + 30);

        // Tier preview circles
        var tierColors = [0xAAAAAA, 0x4488FF, 0xAA44FF, 0xFFD700];
        var tierNames = ['일반', '레어', '에픽', '전설'];
        for (var i = 0; i < 4; i++) {
            var tx = subtitleCfg.x - 150 + i * 100;
            var dotY = subtitleCfg.y + 60;
            var dot = this.add.graphics();
            dot.fillStyle(tierColors[i], 1);
            dot.fillCircle(tx, dotY, 6);
            dot.lineStyle(1, 0xFFFFFF, 0.3);
            dot.strokeCircle(tx, dotY, 6);
            this.add.text(tx, dotY + 16, tierNames[i], {
                fontSize: '8px', fontFamily: 'Oxanium',
                color: '#' + tierColors[i].toString(16).padStart(6, '0')
            }).setOrigin(0.5);
        }
    },

    
    _createStartButton: function(W, H) {
        var btnCfg = Game.UILayout.get('menu', 'startBtn');
        var btnY  = btnCfg.y  || (H / 2 + 60);
        var btnCX = btnCfg.x  || (W / 2);
        var btnHalfW = (btnCfg.w || 220) / 2;
        var btnHalfH = (btnCfg.h || 52)  / 2;

        // Button background
        var btn = this.add.graphics();
        btn.fillStyle(0x1a1a2e, 1);
        btn.fillRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
        btn.lineStyle(2, 0x44FF44, 0.8);
        btn.strokeRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
        
        var btnText = this.add.text(btnCX, btnY, '게임 시작', {
            fontSize: '19px', fontFamily: 'Oxanium', color: '#44FF44'
        }).setOrigin(0.5);

        // Interactive zone
        var hitZone = this.add.zone(btnCX, btnY, btnHalfW * 2, btnHalfH * 2).setInteractive({ useHandCursor: true });
        
        var self = this;
        hitZone.on('pointerover', function() {
            btn.clear();
            btn.fillStyle(0x224422, 1);
            btn.fillRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
            btn.lineStyle(2, 0x66FF66, 1);
            btn.strokeRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
            btnText.setColor('#66FF66');
        });

        hitZone.on('pointerout', function() {
            btn.clear();
            btn.fillStyle(0x1a1a2e, 1);
            btn.fillRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
            btn.lineStyle(2, 0x44FF44, 0.8);
            btn.strokeRoundedRect(btnCX - btnHalfW, btnY - btnHalfH, btnHalfW * 2, btnHalfH * 2, 10);
            btnText.setColor('#44FF44');
        });
        
        hitZone.on('pointerdown', function() {
            if (self._isTransitioning) return;
            self._isTransitioning = true;
            
            // Transition effect
            var overlay = self.add.graphics();
            overlay.fillStyle(0x000000, 0);
            overlay.fillRect(0, 0, W, H);
            overlay.setDepth(100);
            
            self.tweens.add({
                targets: overlay,
                alpha: 1,
                duration: 500,
                onComplete: function() {
                    // localStorage의 SIM/DPS 토글 상태를 그대로 존중하여 GameScene 시작
                    self.scene.start('GameScene');
                }
            });
        });
        
        // Button pulse animation
        this.tweens.add({
            targets: btn,
            alpha: 0.8,
            duration: 1000,
            yoyo: true,
            repeat: -1
        });
    },
    
    _createGameInfo: function(W, H) {
        var infoY = H / 2 + 130;
        
        // Info panel (3줄)
        var infoBg = this.add.graphics();
        infoBg.fillStyle(0x0a0a1f, 0.7);
        infoBg.fillRoundedRect(W / 2 - 300, infoY, 600, 100, 8);
        infoBg.lineStyle(1, 0x2a2a4e, 0.5);
        infoBg.strokeRoundedRect(W / 2 - 300, infoY, 600, 100, 8);

        var instructions = [
            '🎲 SPACE키로 게임 시작! 가차로 유닛 자동 배치',
            '⚔️ 몬스터가 사각형 필드를 무한 순환합니다',
            '  폭발형: 대형↑ 소형↓  |  진동형: 소형↑ 대형↓'
        ];

        for (var i = 0; i < instructions.length; i++) {
            this.add.text(W / 2, infoY + 18 + i * 30, instructions[i], {
                fontSize: '14px',
                fontFamily: 'Oxanium',
                color: i === 2 ? '#888888' : '#AAAAAA',
                align: 'center'
            }).setOrigin(0.5);
        }
    },
    
    _createParticles: function() {
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        var self = this;

        for (var i = 0; i < 20; i++) {
            (function() {
                var p = self.add.graphics();
                var pColor = [0xFFD700, 0x4488FF, 0xAA44FF, 0xAAAAAA][Math.floor(Math.random() * 4)];
                var pSize  = 1 + Math.random() * 2;

                var resetParticle = function() {
                    p.clear();
                    p.fillStyle(pColor, 0.3 + Math.random() * 0.4);
                    p.fillCircle(0, 0, pSize);
                    p.setPosition(Math.random() * W, H + 20);
                    p.setAlpha(0.5 + Math.random() * 0.4);

                    self.tweens.add({
                        targets: p,
                        y: p.y - 80 - Math.random() * 120,
                        alpha: 0,
                        duration: 3000 + Math.random() * 3000,
                        ease: 'Linear',
                        onComplete: function() {
                            if (self.scene && self.scene.isActive()) {
                                resetParticle();
                            }
                        }
                    });
                };

                // 초기 지연으로 파티클들이 동시에 시작하지 않도록 분산
                self.time.delayedCall(Math.random() * 4000, resetParticle);
            })();
        }
    },

    _createDevPanel: function(W, H) {
        var self = this;
        var PX = W - 410, PY = 40, PW = 380, PH = H - 80;

        // 패널 배경
        var panelBg = this.add.graphics();
        panelBg.fillStyle(0x0a0a1a, 0.92);
        panelBg.fillRoundedRect(PX, PY, PW, PH, 10);
        panelBg.lineStyle(1, 0xFF6600, 0.7);
        panelBg.strokeRoundedRect(PX, PY, PW, PH, 10);

        // 헤더
        this.add.text(PX + PW/2, PY + 18, '🔧 DEV MODE', {
            fontSize: '13px', fontFamily: 'Oxanium',
            color: '#FF6600'
        }).setOrigin(0.5);

        var line1 = this.add.graphics();
        line1.lineStyle(1, 0xFF6600, 0.3);
        line1.lineBetween(PX+10, PY+32, PX+PW-10, PY+32);

        // 시뮬레이션 모드 토글 버튼
        var devActive = false;
        try { devActive = localStorage.getItem('rtd_devMode') === '1'; } catch(e) {}

        var toggleBg = this.add.graphics();
        var toggleText = this.add.text(PX + PW/2, PY + 58, '', {
            fontSize: '12px', fontFamily: 'Oxanium'
        }).setOrigin(0.5);

        var drawToggle = function(active) {
            toggleBg.clear();
            toggleBg.fillStyle(active ? 0x331100 : 0x111111, 1);
            toggleBg.fillRoundedRect(PX+20, PY+44, PW-40, 28, 6);
            toggleBg.lineStyle(2, active ? 0xFF6600 : 0x444444, 1);
            toggleBg.strokeRoundedRect(PX+20, PY+44, PW-40, 28, 6);
            toggleText.setText(active ? '[ SIM MODE: ON ]' : '[ SIM MODE: OFF ]');
            toggleText.setColor(active ? '#FF6600' : '#666666');
        };
        drawToggle(devActive);

        var toggleZone = this.add.zone(PX+PW/2, PY+58, PW-40, 28).setInteractive({useHandCursor:true});
        var clearDevRunMarker = function() {
            try {
                var instanceId = sessionStorage.getItem('rtd_simInstanceId');
                if (!instanceId) return;
                sessionStorage.removeItem('rtd_simRunActive_' + instanceId);
                sessionStorage.removeItem('rtd_simAutoRestart_' + instanceId);
            } catch(e) {}
        };
        toggleZone.on('pointerdown', function() {
            devActive = !devActive;
            // 상호 배타: SIM ON → DPS OFF
            if (devActive && dpsActive) {
                dpsActive = false;
                try { localStorage.setItem('rtd_dpsMode', '0'); } catch(e) {}
                drawDpsToggle(dpsActive);
            }
            try { localStorage.setItem('rtd_devMode', devActive ? '1' : '0'); } catch(e) {}
            if (!devActive) clearDevRunMarker();
            drawToggle(devActive);
            updateStats();
        });

        // ── DPS MODE 토글 ──
        var dpsActive = false;
        try { dpsActive = localStorage.getItem('rtd_dpsMode') === '1'; } catch(e) {}

        var dpsBg = this.add.graphics();
        var dpsTxt = this.add.text(PX + PW/2, PY + 98, '', {
            fontSize: '12px', fontFamily: 'Oxanium'
        }).setOrigin(0.5);

        var drawDpsToggle = function(active) {
            dpsBg.clear();
            dpsBg.fillStyle(active ? 0x001133 : 0x111111, 1);
            dpsBg.fillRoundedRect(PX+20, PY+84, PW-40, 28, 6);
            dpsBg.lineStyle(2, active ? 0x00AAFF : 0x444444, 1);
            dpsBg.strokeRoundedRect(PX+20, PY+84, PW-40, 28, 6);
            dpsTxt.setText(active ? '[ DPS MODE: ON ]' : '[ DPS MODE: OFF ]');
            dpsTxt.setColor(active ? '#00AAFF' : '#666666');
        };
        drawDpsToggle(dpsActive);

        var dpsZone = this.add.zone(PX+PW/2, PY+98, PW-40, 28).setInteractive({useHandCursor:true});
        dpsZone.on('pointerdown', function() {
            dpsActive = !dpsActive;
            // 상호 배타: DPS ON → SIM OFF
            if (dpsActive && devActive) {
                devActive = false;
                try { localStorage.setItem('rtd_devMode', '0'); } catch(e) {}
                clearDevRunMarker();
                drawToggle(devActive);
            }
            try { localStorage.setItem('rtd_dpsMode', dpsActive ? '1' : '0'); } catch(e) {}
            drawDpsToggle(dpsActive);
        });

        // 구분선
        var line2 = this.add.graphics();
        line2.lineStyle(1, 0x333333, 0.5);
        line2.lineBetween(PX+10, PY+122, PX+PW-10, PY+122);

        // ── 통계 텍스트 ── (PY+130 부터 시작, 15px 간격)
        var statTotal    = this.add.text(PX+16, PY+130, '', {
            fontSize: '11px', fontFamily: 'Oxanium', color: '#AAAAAA'
        });
        var statClear    = this.add.text(PX+16, PY+147, '', {
            fontSize: '11px', fontFamily: 'Oxanium', color: '#44FF44'
        });
        var statRate     = this.add.text(PX+16, PY+164, '', {
            fontSize: '15px', fontFamily: 'Oxanium', color: '#FF6600'
        });
        var statAvgClear = this.add.text(PX+16, PY+188, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#55CC55'
        });
        var statAvgFail  = this.add.text(PX+16, PY+202, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#FF6655'
        });
        // 라운드 시작 생명력 평균 + 등급 점수 박스
        var gsBg = this.add.graphics();
        gsBg.fillStyle(0x001a2a, 0.8);
        gsBg.fillRoundedRect(PX+10, PY+216, PW-20, 74, 4);
        gsBg.lineStyle(1, 0x225577, 0.6);
        gsBg.strokeRoundedRect(PX+10, PY+216, PW-20, 74, 4);
        var statHp = this.add.text(PX+18, PY+222, '', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#AADDFF'
        });
        var statGsClear  = this.add.text(PX+18, PY+223, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#44DDFF'
        });
        statGsClear.setY(PY + 255);
        var statGsFail   = this.add.text(PX+18, PY+271, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#FF9944'
        });

        // 실패 분포는 좌측 독립 패널에서 열고 닫는다.
        var isFailurePanelOpen = true;
        try { isFailurePanelOpen = localStorage.getItem('rtd_failureDistributionOpen') !== '0'; } catch(e) {}
        var distToggleBg = this.add.graphics();
        var distToggleText = this.add.text(PX + PW - 62, PY + 18,
            isFailurePanelOpen ? '분포 닫기' : '분포 열기', {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#AADDFF'
            }).setOrigin(0.5);
        var drawDistToggle = function(hover) {
            distToggleBg.clear();
            distToggleBg.fillStyle(hover ? 0x123355 : 0x0c1c30, 1);
            distToggleBg.fillRoundedRect(PX + PW - 112, PY + 7, 96, 22, 4);
            distToggleBg.lineStyle(1, hover ? 0x66BBFF : 0x336699, 1);
            distToggleBg.strokeRoundedRect(PX + PW - 112, PY + 7, 96, 22, 4);
            distToggleText.setColor(hover ? '#FFFFFF' : '#AADDFF');
        };
        drawDistToggle(false);
        var distToggleZone = this.add.zone(PX + PW - 62, PY + 18, 96, 22)
            .setInteractive({useHandCursor: true});
        distToggleZone.on('pointerover', function() { drawDistToggle(true); });
        distToggleZone.on('pointerout', function() { drawDistToggle(false); });
        distToggleZone.on('pointerdown', function() {
            try { localStorage.setItem('rtd_failureDistributionOpen', isFailurePanelOpen ? '0' : '1'); } catch(e) {}
            self.scene.restart();
        });

        // 누적 DEV 원본과 계산 집계를 정규화한 비교 리포트의 실시간 상태 표시.
        var reportBg = this.add.graphics();
        var reportText = this.add.text(PX + 62, PY + 18, '리포트 LIVE', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#99E6B3'
        }).setOrigin(0.5);
        var drawReportStatus = function(active) {
            reportBg.clear();
            reportBg.fillStyle(active ? 0x123522 : 0x182018, 1);
            reportBg.fillRoundedRect(PX + 16, PY + 7, 92, 22, 4);
            reportBg.lineStyle(1, active ? 0x66EE99 : 0x445544, 1);
            reportBg.strokeRoundedRect(PX + 16, PY + 7, 92, 22, 4);
            reportText.setColor(active ? '#99E6B3' : '#778877');
        };
        drawReportStatus(false);

        // 전체 라운드: 인게임과 계산형 결과를 같은 행에서 비교한다.
        var allRounds = [];
        for (var ar = 1; ar <= 52; ar++) allRounds.push(ar);
        var ingameRoundTexts = [];
        var calculationRoundTexts = [];
        var ingameClearText = null;
        var calculationClearText = null;
        var clearDetailContainer = null;
        var clearDetailDevText = null;
        var clearDetailCalculationText = null;
        var clearDetailToggleText = null;
        var clearDetailOpen = false;
        if (isFailurePanelOpen) {
            var FPX = 20, FPY = 40, FPW = 820, FPH = H - 80;
            var failurePanelBg = this.add.graphics();
            failurePanelBg.fillStyle(0x0a1020, 0.99);
            failurePanelBg.fillRoundedRect(FPX, FPY, FPW, FPH, 10);
            failurePanelBg.lineStyle(1, 0x4488BB, 0.8);
            failurePanelBg.strokeRoundedRect(FPX, FPY, FPW, FPH, 10);
            this.add.text(FPX + 16, FPY + 18, '실패 분포 비교', {
                fontSize: '13px', fontFamily: 'Oxanium', color: '#AADDFF'
            });
            this.add.text(FPX + FPW - 14, FPY + 20, '상위', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#FF6655'
            }).setOrigin(1, 0);
            this.add.text(FPX + FPW - 58, FPY + 20, '· 평균', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#55CC55'
            }).setOrigin(1, 0);
            this.add.text(FPX + FPW - 106, FPY + 20, '하위 ·', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#5599FF'
            }).setOrigin(1, 0);
            this.add.text(FPX + 16, FPY + 43, '라운드', {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#778899'
            });
            this.add.text(FPX + 61, FPY + 43, 'DEV 시뮬  횟수 | 비율 | 점수', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#FFFFFF'
            });
            this.add.text(FPX + 225, FPY + 43, '계산 시뮬  횟수 | 비율 | 점수', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#88DDFF'
            });
            this.add.text(FPX + 420, FPY + 43, '라운드', {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#778899'
            });
            this.add.text(FPX + 465, FPY + 43, 'DEV 시뮬  횟수 | 비율 | 점수', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#FFFFFF'
            });
            this.add.text(FPX + 629, FPY + 43, '계산 시뮬  횟수 | 비율 | 점수', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#88DDFF'
            });
            var distLine = this.add.graphics();
            distLine.lineStyle(1, 0x4488BB, 0.45);
            distLine.lineBetween(FPX + 12, FPY + 66, FPX + FPW - 12, FPY + 66);
            distLine.lineBetween(FPX + 410, FPY + 38, FPX + 410, FPY + FPH - 44);
            distLine.lineStyle(1, 0x4488BB, 0.18);
            distLine.lineBetween(FPX + 56, FPY + 38, FPX + 56, FPY + FPH - 70);
            distLine.lineBetween(FPX + 220, FPY + 38, FPX + 220, FPY + FPH - 70);
            distLine.lineBetween(FPX + 460, FPY + 38, FPX + 460, FPY + FPH - 70);
            distLine.lineBetween(FPX + 624, FPY + 38, FPX + 624, FPY + FPH - 70);

            var distCols = 2;
            var distRowHeight = 18;
            var distColW = 404;
            for (var bi = 0; bi < allRounds.length; bi++) {
                var blockX = FPX + 16 + (bi % distCols) * distColW;
                var rowY = FPY + 78 + Math.floor(bi / distCols) * distRowHeight;
                this.add.text(blockX, rowY, 'R' + allRounds[bi], {
                    fontSize: '9px', fontFamily: 'Oxanium', color: '#778899'
                });
                ingameRoundTexts.push(this.add.text(
                    blockX + 45,
                    rowY,
                    '0 | - | -',
                    { fontSize: '9px', fontFamily: 'Oxanium', color: '#333333' }
                ));
                calculationRoundTexts.push(this.add.text(
                    blockX + 209,
                    FPY + 78 + Math.floor(bi / distCols) * distRowHeight,
                    '0 | - | -',
                    { fontSize: '9px', fontFamily: 'Oxanium', color: '#333333' }
                ));
            }
            var clearY = FPY + 78 + Math.floor(allRounds.length / distCols) * distRowHeight + 8;
            this.add.text(FPX + 16, clearY, 'R' + (Game.Config.TOTAL_ROUNDS || 52) + ' 클리어', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#FFD766'
            });
            ingameClearText = this.add.text(FPX + 96, clearY, 'DEV 시뮬  0 | - | -', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#333333'
            });
            calculationClearText = this.add.text(FPX + 306, clearY, '계산 시뮬  0 | - | -', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#333333'
            });
            clearDetailToggleText = this.add.text(calculationClearText.x + calculationClearText.width + 10, clearY - 3, '+', {
                fontSize: '16px', fontStyle: 'bold', fontFamily: 'Oxanium', color: '#FFD766'
            }).setOrigin(0.5, 0);

            // 클리어 행을 누르면 하단을 기준으로 위쪽에 상세 점수 패널을 펼친다.
            var clearDetailH = 214;
            var clearDetailY = clearY - clearDetailH - 8;
            clearDetailContainer = this.add.container(0, 0).setDepth(20).setVisible(false);
            var clearDetailBg = this.add.graphics();
            clearDetailBg.fillStyle(0x071323, 0.98);
            clearDetailBg.fillRoundedRect(FPX + 12, clearDetailY, FPW - 24, clearDetailH, 8);
            clearDetailBg.lineStyle(1, 0x55AADD, 0.9);
            clearDetailBg.strokeRoundedRect(FPX + 12, clearDetailY, FPW - 24, clearDetailH, 8);
            var clearDetailTitle = this.add.text(FPX + 28, clearDetailY + 14, '클리어 점수 상세', {
                fontSize: '12px', fontFamily: 'Oxanium', color: '#FFD766'
            });
            var clearDetailGuide = this.add.text(FPX + FPW - 28, clearDetailY + 16,
                '클리어 행을 다시 누르면 닫기', {
                    fontSize: '9px', fontFamily: 'Oxanium', color: '#668899'
                }).setOrigin(1, 0);
            var clearDetailDivider = this.add.graphics();
            clearDetailDivider.lineStyle(1, 0x335577, 0.7);
            clearDetailDivider.lineBetween(FPX + FPW / 2, clearDetailY + 42,
                FPX + FPW / 2, clearDetailY + clearDetailH - 14);
            clearDetailDevText = this.add.text(FPX + 28, clearDetailY + 48, '', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#FFFFFF',
                wordWrap: { width: 360 }, lineSpacing: 5
            });
            clearDetailCalculationText = this.add.text(FPX + FPW / 2 + 18, clearDetailY + 48, '', {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#88DDFF',
                wordWrap: { width: 360 }, lineSpacing: 5
            });
            clearDetailContainer.add([
                clearDetailBg, clearDetailTitle, clearDetailGuide, clearDetailDivider,
                clearDetailDevText, clearDetailCalculationText
            ]);

            var clearDetailZone = this.add.zone(FPX + FPW / 2, clearY + 7, FPW - 28, 22)
                .setDepth(21).setInteractive({ useHandCursor: true });
            clearDetailZone.on('pointerdown', function() {
                clearDetailOpen = !clearDetailOpen;
                clearDetailContainer.setVisible(clearDetailOpen);
                clearDetailToggleText.setText(clearDetailOpen ? '−' : '+');
                clearDetailToggleText.setColor('#FFD766');
            });
        }


        var thinLine2 = this.add.graphics();
        var resultIcons = [];
        var calcAccuracyLevel = 7;
        try {
            calcAccuracyLevel = Math.max(1, Math.min(13,
                Math.floor(Number(localStorage.getItem('rtd_calcAccuracyLevel') || 7))));
        } catch(e) {}
        var selectedCalculationModel = function() {
            // 계산 엔진의 현재 모델을 직접 참조해, 규칙 변경 뒤 구형 결과를
            // 새 결과와 섞거나 새 결과를 표시에서 누락시키지 않는다.
            var simulator = window.RTDCalculationSimulator || {};
            return {
                version: Number(simulator.VERSION || 11),
                model: String(simulator.MODEL || 'quality-scaled-event-v11'),
                accuracyLevel: calcAccuracyLevel
            };
        };

        var readAllSimResults = function() {
            var results = [];
            try {
                // 창마다 별도 키를 사용하므로 read-modify-write 충돌 없이 합산한다.
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf('rtd_simResults') === 0) {
                        var parsed = JSON.parse(localStorage.getItem(key) || '[]');
                        if (Array.isArray(parsed)) results = results.concat(parsed);
                    }
                }
            } catch(e) {}
            results.sort(function(a, b) { return (a.ts || 0) - (b.ts || 0); });
            return results;
        };

        var readCalculationAggregate = function() {
            try {
                var expected = selectedCalculationModel();
                var parsed = window.RTDCalculationRunStore.read(
                    localStorage, window.RTDCalculationSimulator, expected
                );
                // 모델 규칙이 달라진 구형 결과는 새 결과와 누적하지 않는다.
                return parsed && parsed.version === expected.version && parsed.model === expected.model
                    ? parsed : null;
            } catch(e) { return null; }
        };
        var uploadedCalculationRuns = {};
        var calculationSyncRunning = false;
        var calculationSyncEpoch = 0;
        var pushCalculationRun = function(record) {
            if (!record || uploadedCalculationRuns[record.id]) return Promise.resolve();
            return fetch('/api/calculation-runs', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(record),
                keepalive: true
            }).then(function(response) {
                if (!response.ok) throw new Error('calculation_run_upload_failed');
                uploadedCalculationRuns[record.id] = true;
            });
        };
        var syncCalculationRuns = function() {
            if (calculationSyncRunning) return Promise.resolve(0);
            calculationSyncRunning = true;
            var syncEpoch = calculationSyncEpoch;
            var expected = selectedCalculationModel();
            var localRecords = window.RTDCalculationRunStore.records(localStorage).filter(function(record) {
                var aggregate = record && record.aggregate;
                return aggregate && aggregate.version === expected.version && aggregate.model === expected.model &&
                    Number(aggregate.assumptions && aggregate.assumptions.accuracyLevel) === expected.accuracyLevel;
            });
            return Promise.all(localRecords.map(function(record) {
                return pushCalculationRun(record).catch(function() {});
            })).then(function() {
                return fetch('/api/calculation-runs', { cache: 'no-store' });
            }).then(function(response) {
                if (!response.ok) throw new Error('calculation_run_download_failed');
                return response.json();
            }).then(function(payload) {
                if (syncEpoch !== calculationSyncEpoch) return 0;
                (payload.runs || []).forEach(function(record) { uploadedCalculationRuns[record.id] = true; });
                return window.RTDCalculationRunStore.importRecords(localStorage, payload.runs, expected);
            }).catch(function() { return 0; }).then(function(added) {
                calculationSyncRunning = false;
                return added;
            });
        };

        var buildComparisonReport = function(results, calculationAggregate) {
            if (!window.RTDSimulationReport) return null;
            return window.RTDSimulationReport.build(
                results || readAllSimResults(),
                calculationAggregate === undefined ? readCalculationAggregate() : calculationAggregate, {
                totalRounds: Game.Config.TOTAL_ROUNDS || 52
            });
        };
        var publishLiveReport = function(devResults, calculationAggregate) {
            devResults = devResults || readAllSimResults();
            if (calculationAggregate === undefined) calculationAggregate = readCalculationAggregate();
            var report = buildComparisonReport(devResults, calculationAggregate);
            if (!report) return null;
            var latestDevTs = devResults.length ? Number(devResults[devResults.length - 1].ts || 0) : 0;
            report.sourceSignature = [
                report.version, report.dev.total, report.dev.clears, latestDevTs,
                report.calculation.total, report.calculation.clears,
                calculationAggregate ? Number(calculationAggregate.completedAt || 0) : 0
            ].join(':');
            try {
                var previous = JSON.parse(localStorage.getItem('rtd_simLiveReport') || 'null');
                if (!previous || previous.sourceSignature !== report.sourceSignature) {
                    localStorage.setItem('rtd_simLiveReport', JSON.stringify(report));
                } else {
                    report = previous;
                }
            } catch(e) {}
            // localhost 서버에도 최신 요약을 기록해 브라우저 외부 분석 도구가 바로 읽을 수 있게 한다.
            // 원본 플레이 기록은 전송하지 않으며, 동일 출처 내 로컬 요청만 사용한다.
            try {
                fetch('/api/simulation-report', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(report),
                    keepalive: true
                }).catch(function() {});
            } catch(eSync) {}
            drawReportStatus(report.dev.total > 0 || report.calculation.total > 0);
            reportText.setText('리포트 LIVE');
            try {
                window.dispatchEvent(new CustomEvent('rtd-simulation-report-updated', { detail: report }));
            } catch(eEvent) {}
            return report;
        };

        // 읽기/구독 접근점: 브라우저 UI, 개발자 도구와 테스트 자동화가 같은 최신 데이터를 사용한다.
        window.RTDSimData = window.RTDSimData || {};
        window.RTDSimData.current = function() {
            try {
                return JSON.parse(localStorage.getItem('rtd_simLiveReport') || 'null') || publishLiveReport();
            } catch(e) { return publishLiveReport(); }
        };
        window.RTDSimData.refresh = publishLiveReport;
        window.RTDSimData.subscribe = function(listener) {
            var handler = function(event) { listener(event.detail); };
            window.addEventListener('rtd-simulation-report-updated', handler);
            listener(window.RTDSimData.current());
            return function() { window.removeEventListener('rtd-simulation-report-updated', handler); };
        };

        var getFailureDistribution = function(results, calculationAggregate, source) {
            var fails = results.filter(function(r) { return !r.win; });
            var useCalculation = source === 'calculation';
            var roundCount = {};
            var roundGsSum = {};
            var roundGsCount = {};
            allRounds.forEach(function(round) {
                roundCount[round] = useCalculation && calculationAggregate && calculationAggregate.failCounts
                    ? Number(calculationAggregate.failCounts[round] || 0) : 0;
                roundGsSum[round] = useCalculation && calculationAggregate && calculationAggregate.failGsSums
                    ? Number(calculationAggregate.failGsSums[round] || 0) : 0;
                roundGsCount[round] = useCalculation && calculationAggregate && calculationAggregate.failGsCounts
                    ? Number(calculationAggregate.failGsCounts[round] || 0) : 0;
            });
            if (!useCalculation) {
                fails.forEach(function(result) {
                    if (roundCount[result.round] !== undefined) {
                        roundCount[result.round]++;
                        if (result.gs > 0) {
                            roundGsSum[result.round] += result.gs;
                            roundGsCount[result.round]++;
                        }
                    }
                });
            }

            var totalFailureCount = useCalculation
                ? (calculationAggregate ? Number(calculationAggregate.failures || 0) : 0)
                : fails.length;

            // 평균 비율은 실패가 실제 발생한 라운드 수를 분모로 사용한다.
            var failedRoundCount = allRounds.filter(function(round) {
                return roundCount[round] > 0;
            }).length;
            var averageShare = failedRoundCount > 0 ? 100 / failedRoundCount : 0;
            var lowerShare = averageShare * 0.7;
            var upperShare = averageShare * 1.3;

            return allRounds.map(function(round) {
                var count = roundCount[round];
                var share = totalFailureCount > 0 ? count / totalFailureCount * 100 : 0;
                var color = '#333333';
                if (count > 0) {
                    color = share < lowerShare ? '#5599FF' :
                        (share > upperShare ? '#FF6655' : '#55CC55');
                }
                return {
                    round: round,
                    count: count,
                    share: share,
                    avgGs: roundGsCount[round] > 0
                        ? Math.round(roundGsSum[round] / roundGsCount[round]) : 0,
                    color: color
                };
            });
        };

        var updateStats = function() {
            var results = readAllSimResults();
            var calculationAggregate = readCalculationAggregate();
            var total  = results.length;
            var wins   = results.filter(function(r){ return r.win; });
            var fails  = results.filter(function(r){ return !r.win; });
            var clears = wins.length;
            var failureCount = fails.length;
            var rate   = total > 0 ? Math.round(clears / total * 100) : 0;

            // 평균 라운드 (성공/실패 분리)
            var avgClear = wins.length  > 0 ? Math.round(wins.reduce(function(a,r){  return a+r.round; }, 0) / wins.length)  : 0;
            var failRoundTotal = fails.reduce(function(a,r){ return a+r.round; }, 0);
            var avgFail  = failureCount > 0 ? Math.round(failRoundTotal / failureCount) : 0;

            // 평균 플레이 시간
            var totalTimeSec = results.reduce(function(a,r){ return a + (r.time || 0); }, 0);
            var avgTimeSec = total > 0 ? Math.round(totalTimeSec / total) : 0;
            var am = Math.floor(avgTimeSec / 60), as = avgTimeSec % 60;
            var avgTimeStr = (am < 10 ? '0' : '') + am + ':' + (as < 10 ? '0' : '') + as;

            // 게임별 구간 평균을 다시 평균내어 누적 평균으로 표시한다.
            // 중간에 종료된 게임은 실제로 시작한 라운드 구간만 기록되어 분모에 포함된다.
            var hpSums = { early: 0, mid: 0, late: 0 };
            var hpCounts = { early: 0, mid: 0, late: 0 };
            results.forEach(function(r) {
                if (!r.hpAvg) return;
                ['early', 'mid', 'late'].forEach(function(group) {
                    if (typeof r.hpAvg[group] === 'number') {
                        hpSums[group] += r.hpAvg[group];
                        hpCounts[group]++;
                    }
                });
            });
            var formatHp = function(group) {
                return hpCounts[group] > 0
                    ? (Math.round(hpSums[group] / hpCounts[group] * 10) / 10).toFixed(1)
                    : '-';
            };
            statHp.setText('생명력 평균  R2-10: ' + formatHp('early') +
                '   R11-30: ' + formatHp('mid') + '   R31-50: ' + formatHp('late'));

            statTotal.setText('DEV 시뮬 총 실행: ' + total + '회');
            statClear.setText('클리어: ' + clears + '회');
            statRate.setText('클리어율: ' + rate + '%');
            statAvgClear.setText('실패 평균: R' + (avgFail || '-') + '  |  평균시간: ' + avgTimeStr);
            var normalFails = fails.filter(function(r) { return r.failCategory === 'normal'; }).length;
            var bossFails = fails.filter(function(r) { return r.failCategory === 'boss'; }).length;
            var bossTimeouts = fails.filter(function(r) { return r.failReason === 'boss_timeout'; }).length;
            statAvgFail.setText('게임오버  일반: ' + normalFails + '  보스: ' + bossFails +
                '  (타임아웃 ' + bossTimeouts + ')');

            // 등급 점수 (최근 5회 클리어 개별 + 총 평균)
            var winsWithGs  = wins.filter(function(r){ return r.gs > 0; });
            var failsWithGs = fails.filter(function(r){ return r.gs > 0; });
            var clearGsCount = winsWithGs.length;
            var clearGsSum = winsWithGs.reduce(function(a,r){ return a+r.gs; },0);
            var failGsCount = failsWithGs.length;
            var failGsSum = failsWithGs.reduce(function(a,r){ return a+r.gs; },0);
            var avgGsClear = clearGsCount > 0 ? Math.round(clearGsSum / clearGsCount) : 0;
            var avgGsFail  = failGsCount > 0 ? Math.round(failGsSum / failGsCount) : 0;

            if (clearGsCount > 0) {
                var recent5 = winsWithGs.slice(-5).map(function(r) { return r.gs; });
                var scores = recent5.map(function(gs){ return Number(gs).toLocaleString(); });
                statGsClear.setText('🏆 클리어 점수: ' + scores.join(', ') + ' (평균 ' + avgGsClear.toLocaleString() + ')');
            } else {
                statGsClear.setText('🏆 클리어 점수: 게임 축적 필요');
            }
            statGsFail.setText('💀 오버 평균점수: '    + (avgGsFail  > 0 ? avgGsFail.toLocaleString()  : '게임 축적 필요'));

            var ingameDistribution = getFailureDistribution(results, calculationAggregate, 'ingame');
            var calculationDistribution = getFailureDistribution(results, calculationAggregate, 'calculation');
            var formatDistributionItem = function(item) {
                return item.count + ' | ' + (item.count > 0 ? item.share.toFixed(1) + '%' : '-') +
                    ' | ' + (item.avgGs > 0 ? item.avgGs : '-');
            };
            for (var bi2 = 0; bi2 < allRounds.length; bi2++) {
                if (ingameRoundTexts[bi2]) {
                    ingameRoundTexts[bi2].setText(formatDistributionItem(ingameDistribution[bi2]));
                    ingameRoundTexts[bi2].setColor(ingameDistribution[bi2].color);
                }
                if (calculationRoundTexts[bi2]) {
                    calculationRoundTexts[bi2].setText(formatDistributionItem(calculationDistribution[bi2]));
                    calculationRoundTexts[bi2].setColor(calculationDistribution[bi2].color);
                }
            }
            if (ingameClearText && calculationClearText) {
                var ingameClearShare = total > 0 ? (clears / total * 100).toFixed(1) + '%' : '-';
                ingameClearText.setText('DEV 시뮬  ' + clears + ' | ' + ingameClearShare +
                    ' | ' + (avgGsClear > 0 ? avgGsClear : '-'));
                ingameClearText.setColor(clears > 0 ? '#FFD766' : '#333333');

                var calculationTotal = calculationAggregate ? Number(calculationAggregate.total || 0) : 0;
                var calculationClears = calculationAggregate ? Number(calculationAggregate.clears || 0) : 0;
                var calculationClearGsCount = calculationAggregate
                    ? Number(calculationAggregate.clearGsCount || 0) : 0;
                var calculationClearGs = calculationClearGsCount > 0
                    ? Math.round(Number(calculationAggregate.clearGsSum || 0) / calculationClearGsCount) : 0;
                var calculationClearShare = calculationTotal > 0
                    ? (calculationClears / calculationTotal * 100).toFixed(1) + '%' : '-';
                calculationClearText.setText('계산 시뮬  ' + calculationClears + ' | ' + calculationClearShare +
                    ' | ' + (calculationClearGs > 0 ? calculationClearGs : '-'));
                calculationClearText.setColor(calculationClears > 0 ? '#FFD766' : '#333333');
                clearDetailToggleText.setX(calculationClearText.x + calculationClearText.width + 10);

                if (clearDetailDevText && clearDetailCalculationText) {
                    var devClearScores = winsWithGs.map(function(result) { return Number(result.gs || 0); })
                        .filter(function(score) { return score > 0; });
                    var devMin = devClearScores.length ? Math.min.apply(null, devClearScores) : 0;
                    var devMax = devClearScores.length ? Math.max.apply(null, devClearScores) : 0;
                    var devRecent = devClearScores.slice(-30).reverse();
                    clearDetailDevText.setText(
                        'DEV 시뮬\n' +
                        '클리어 ' + clears.toLocaleString() + '회  ·  점수 기록 ' + devClearScores.length.toLocaleString() + '개\n' +
                        '최저 ' + (devMin ? devMin.toLocaleString() : '-') +
                        '  ·  평균 ' + (avgGsClear ? avgGsClear.toLocaleString() : '-') +
                        '  ·  최고 ' + (devMax ? devMax.toLocaleString() : '-') + '\n\n' +
                        '최근 점수 (최신순, 최대 30개)\n' +
                        (devRecent.length ? devRecent.map(function(score) {
                            return score.toLocaleString();
                        }).join('  ·  ') : '게임 축적 필요')
                    );

                    var calculationRecent = calculationAggregate && Array.isArray(calculationAggregate.recentClearGs)
                        ? calculationAggregate.recentClearGs.slice(-5).reverse() : [];
                    clearDetailCalculationText.setText(
                        '계산 시뮬 · 정확도 ' + calcAccuracyLevel + '\n' +
                        '클리어 ' + calculationClears.toLocaleString() + '회  ·  점수 기록 ' +
                        calculationClearGsCount.toLocaleString() + '개\n' +
                        '누적 평균 ' + (calculationClearGs ? calculationClearGs.toLocaleString() : '-') + '\n\n' +
                        '최근 저장 점수 (최신순, 최대 5개)\n' +
                        (calculationRecent.length ? calculationRecent.map(function(score) {
                            return Number(score).toLocaleString();
                        }).join('  ·  ') : '계산 결과 축적 필요') + '\n\n' +
                        '※ 계산 시뮬은 전체 개별 점수 대신 누적 평균과 최근 5개를 저장합니다.'
                    );
                }
            }
            publishLiveReport(results, calculationAggregate);
        };
        updateStats();
        window.addEventListener('storage', function(e) {
            if (e.key && (e.key.indexOf('rtd_simResults') === 0 || window.RTDCalculationRunStore.isKey(e.key))) {
                updateStats();
                var latest = readCalculationAggregate();
                storedCalculationTotal = latest ? Number(latest.total || 0) : 0;
                if (!calcRunning && typeof refreshCalcButtonLabel === 'function') refreshCalcButtonLabel();
            }
        });

        // 계산 시뮬레이션 설정: 시간·횟수 직접 입력, 정확도는 단계 선택.
        var readInteger = function(key, fallback, min, max) {
            try {
                var raw = localStorage.getItem(key);
                var value = raw === null ? fallback : Number(raw);
                if (!Number.isFinite(value)) value = fallback;
                return Math.max(min, Math.min(max, Math.floor(value)));
            } catch(e) { return fallback; }
        };
        var calcTimeSeconds = readInteger('rtd_calcTimeSeconds', 60, 60, 600);
        var calcIterations = readInteger('rtd_calcIterations', 50000, 1000, 100000);
        var calcUnlimited = false;
        try { calcUnlimited = localStorage.getItem('rtd_calcUnlimited') === '1'; } catch(e) {}
        if (calcAccuracyLevel >= 11 && !calcUnlimited) calcTimeSeconds = 600;
        var settingsY = PY + 304;
        this.add.text(PX + 16, settingsY, '계산 설정', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#668899'
        });
        this.add.text(PX + 20, settingsY + 22, '시간(초)', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#AADDFF'
        });
        var accuracyLabel = this.add.text(PX + 42, settingsY + 46, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#AADDFF'
        });
        var accuracyTimeLabel = this.add.text(PX + 172, settingsY + 46, '', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#77AACC'
        });
        this.add.text(PX + 20, settingsY + 70, '횟수', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#AADDFF'
        });
        var createCalcInput = function(type, x, y, width) {
            var input = document.createElement('input');
            input.type = type;
            input.style.cssText = 'position:absolute;z-index:9999;width:' + width + 'px;height:19px;' +
                'box-sizing:border-box;background:#102030;color:#88DDFF;border:1px solid #3399BB;' +
                'border-radius:3px;font:11px Oxanium,monospace;text-align:center;outline:none;';
            document.body.appendChild(input);
            var reposition = function() {
                var rect = self.game.canvas.getBoundingClientRect();
                var sx = rect.width / Game.Config.WIDTH, sy = rect.height / Game.Config.HEIGHT;
                input.style.left = (rect.left + x * sx) + 'px';
                input.style.top = (rect.top + y * sy) + 'px';
                input.style.transform = 'scale(' + sx + ',' + sy + ')';
                input.style.transformOrigin = 'left top';
            };
            reposition();
            window.addEventListener('resize', reposition);
            self.events.once('shutdown', function() {
                window.removeEventListener('resize', reposition);
                if (input.parentNode) input.parentNode.removeChild(input);
            });
            return input;
        };
        var timeInput = createCalcInput('number', PX + 86, settingsY + 18, 70);
        timeInput.min = '60'; timeInput.max = '600'; timeInput.step = '10'; timeInput.value = calcTimeSeconds;
        var countInput = createCalcInput('number', PX + 86, settingsY + 66, 92);
        countInput.min = '1000'; countInput.max = '100000'; countInput.step = '1000'; countInput.value = calcIterations;
        var unlimitedInput = createCalcInput('checkbox', PX + 190, settingsY + 18, 18);
        unlimitedInput.checked = calcUnlimited;
        this.add.text(PX + 212, settingsY + 22, '제한 없음', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#AADDFF'
        });
        var formatCalculationDuration = function(milliseconds) {
            var seconds = Math.max(0, Math.round(Number(milliseconds || 0) / 1000));
            return Math.floor(seconds / 60) + '분 ' + String(seconds % 60).padStart(2, '0') + '초';
        };
        var refreshAccuracyTimeLabel = function() {
            if (calcAccuracyLevel < 11) {
                accuracyTimeLabel.setText('');
                return;
            }
            var averageMs = window.RTDCalculationRunStore.averageTimePerThousand(
                localStorage, selectedCalculationModel()
            );
            accuracyTimeLabel.setText('(1000회 평균 소모 시간 ' +
                (averageMs === null ? '측정 전' : formatCalculationDuration(averageMs)) + ')');
        };
        var normalizeInputs = function() {
            calcTimeSeconds = Math.max(60, Math.min(600, Math.floor(Number(timeInput.value) || 60)));
            calcIterations = Math.max(1000, Math.min(100000, Math.floor(Number(countInput.value) || 1000)));
            calcUnlimited = !!unlimitedInput.checked;
            if (calcAccuracyLevel >= 11 && !calcUnlimited) calcTimeSeconds = 600;
            timeInput.value = calcTimeSeconds;
            countInput.value = calcIterations;
            timeInput.disabled = calcUnlimited || calcAccuracyLevel >= 11;
            try {
                localStorage.setItem('rtd_calcTimeSeconds', String(calcTimeSeconds));
                localStorage.setItem('rtd_calcIterations', String(calcIterations));
                localStorage.setItem('rtd_calcUnlimited', calcUnlimited ? '1' : '0');
            } catch(e) {}
            accuracyLabel.setText('정확도 ' + calcAccuracyLevel +
                (calcAccuracyLevel >= 11 && !calcUnlimited ? ' · 600초 고정' : ''));
            refreshAccuracyTimeLabel();
            if (typeof refreshCalcButtonLabel === 'function') refreshCalcButtonLabel();
        };
        timeInput.addEventListener('change', normalizeInputs);
        countInput.addEventListener('change', normalizeInputs);
        unlimitedInput.addEventListener('change', normalizeInputs);
        var accuracyMinus = this.add.text(PX + 20, settingsY + 44, '−', {
            fontSize: '14px', fontFamily: 'Oxanium', color: '#66AACC'
        }).setInteractive({useHandCursor: true});
        var accuracyPlus = this.add.text(PX + PW - 28, settingsY + 44, '+', {
            fontSize: '14px', fontFamily: 'Oxanium', color: '#66AACC'
        }).setInteractive({useHandCursor: true});
        var changeAccuracy = function(delta) {
            if (calcRunning) return;
            calcAccuracyLevel = Math.max(1, Math.min(13, calcAccuracyLevel + delta));
            try { localStorage.setItem('rtd_calcAccuracyLevel', String(calcAccuracyLevel)); } catch(e) {}
            normalizeInputs();
            var selectedAggregate = readCalculationAggregate();
            storedCalculationTotal = selectedAggregate ? Number(selectedAggregate.total || 0) : 0;
            uploadedCalculationRuns = {};
            updateStats();
            if (typeof refreshCentralCalculationRuns === 'function') refreshCentralCalculationRuns();
        };
        accuracyMinus.on('pointerdown', function() { changeAccuracy(-1); });
        accuracyPlus.on('pointerdown', function() { changeAccuracy(1); });
        normalizeInputs();

        // 구분선

        // 인게임·계산형 시뮬레이션 시작 버튼 (패널 최하단)
        var simBtnY  = PY + PH - 116;
        var simBtnBg = this.add.graphics();
        var simBtnText = this.add.text(PX+PW/2, simBtnY + 14, '▶ DEV 시뮬 시작', {
            fontSize: '12px', fontFamily: 'Oxanium', color: '#FF6600'
        }).setOrigin(0.5);

        // 구분선 (시작 버튼 위)
        var line3 = this.add.graphics();
        line3.lineStyle(1, 0x333333, 0.5);
        line3.lineBetween(PX+10, simBtnY - 10, PX+PW-10, simBtnY - 10);

        var drawSimBtn = function(hover) {
            simBtnBg.clear();
            simBtnBg.fillStyle(hover ? 0x331100 : 0x1a0a00, 1);
            simBtnBg.fillRoundedRect(PX+20, simBtnY, PW-40, 28, 6);
            simBtnBg.lineStyle(2, hover ? 0xFF9900 : 0xFF6600, hover ? 1 : 0.7);
            simBtnBg.strokeRoundedRect(PX+20, simBtnY, PW-40, 28, 6);
        };
        drawSimBtn(false);

        var simZone = this.add.zone(PX+PW/2, simBtnY + 14, PW-40, 28).setInteractive({useHandCursor:true});
        simZone.on('pointerover',  function(){ drawSimBtn(true);  });
        simZone.on('pointerout',   function(){ drawSimBtn(false); });
        simZone.on('pointerdown',  function() {
            if (self._isTransitioning) return;
            self._isTransitioning = true;
            try {
                localStorage.setItem('rtd_devMode', '1');
                localStorage.setItem('rtd_autoGacha', '1');
            } catch(e) {}
            self.scene.start('GameScene');
        });

        // 화면과 Phaser 물리를 실행하지 않는 품질 가변 이벤트 계산 시뮬레이션.
        var storedCalculationAggregate = readCalculationAggregate();
        var storedCalculationTotal = storedCalculationAggregate
            ? Number(storedCalculationAggregate.total || 0) : 0;
        var calcBtnY = PY + PH - 82;
        var calcBtnBg = this.add.graphics();
        var calcBtnText = this.add.text(PX+PW/2, calcBtnY + 14, '', {
            fontSize: '11px', fontFamily: 'Oxanium', color: '#55CCFF'
        }).setOrigin(0.5);
        var calcRunning = false;
        var refreshCalcButtonLabel = function() {
            calcBtnText.setText('⚡ 정확도 ' + calcAccuracyLevel + ' · ' + calcIterations.toLocaleString() +
                '회 · 누적 ' + storedCalculationTotal.toLocaleString() + '회');
        };
        refreshCalcButtonLabel();
        var refreshCentralCalculationRuns = function() {
            syncCalculationRuns().then(function(added) {
                if (!added) return;
                var latest = readCalculationAggregate();
                storedCalculationTotal = latest ? Number(latest.total || 0) : 0;
                if (!calcRunning) refreshCalcButtonLabel();
                updateStats();
            });
        };
        refreshCentralCalculationRuns();
        var calculationSyncTimer = window.setInterval(refreshCentralCalculationRuns, 30000);
        this.events.once('shutdown', function() { window.clearInterval(calculationSyncTimer); });

        var drawCalcBtn = function(hover) {
            calcBtnBg.clear();
            calcBtnBg.fillStyle(calcRunning ? 0x102030 : (hover ? 0x10283a : 0x081820), 1);
            calcBtnBg.fillRoundedRect(PX+20, calcBtnY, PW-40, 28, 6);
            calcBtnBg.lineStyle(2, calcRunning ? 0x3388AA : (hover ? 0x66DDFF : 0x3399BB), hover ? 1 : 0.7);
            calcBtnBg.strokeRoundedRect(PX+20, calcBtnY, PW-40, 28, 6);
        };
        drawCalcBtn(false);

        var calcZone = this.add.zone(PX+PW/2, calcBtnY + 14, PW-40, 28).setInteractive({useHandCursor:true});
        calcZone.on('pointerover', function() { if (!calcRunning) drawCalcBtn(true); });
        calcZone.on('pointerout', function() { drawCalcBtn(false); });
        calcZone.on('pointerdown', function() {
            if (calcRunning) return;
            normalizeInputs();
            var existingCalculationAggregate = readCalculationAggregate();
            var existingCalculationTotal = existingCalculationAggregate
                ? Number(existingCalculationAggregate.total || 0) : 0;
            var existingSeedOffset = existingCalculationAggregate
                ? Number(existingCalculationAggregate.nextSeedOffset || existingCalculationTotal) : 0;
            var nextSeedBase = (0x9e3779b9 + Math.imul(existingSeedOffset >>> 0, 97)) >>> 0;
            var runId = window.crypto.randomUUID();
            // Independent windows must not reuse the same seed sequence.
            nextSeedBase = window.crypto.getRandomValues(new Uint32Array(1))[0];
            calcRunning = true;
            drawCalcBtn(false);
            calcBtnText.setText('계산 준비 중...').setColor('#88DDFF');

            var hardwareThreads = Math.max(2, Number(navigator.hardwareConcurrency || 4));
            var workerCount = Math.min(4, Math.max(2, hardwareThreads - 1));
            var workers = [];
            var workerProgress = new Array(workerCount).fill(0);
            var completedWorkers = 0;
            var pendingCheckpointAggregate = null;
            var checkpointIndex = 0;
            var calculationStoppedByTimeLimit = false;
            var calculationStartedAt = Date.now();
            var checkpointStartedAt = calculationStartedAt;
            var sharedOptions = {
                units: Game.UnitData.units,
                skills: Game.SkillData.skills,
                monsters: Game.MonsterData.monsters,
                waves: Game.WaveData.waves,
                autoGachaInterval: 1111,
                autoSynthesisDelay: 3000,
                accuracyLevel: calcAccuracyLevel,
                maxDurationMs: calcUnlimited ? 0 : calcTimeSeconds * 1000,
                config: {
                    INITIAL_GOLD: Game.Config.INITIAL_GOLD,
                    GACHA_COST: Game.Config.GACHA_COST,
                    ROUND_BONUS_MULTIPLIER: Game.Config.ROUND_BONUS_MULTIPLIER,
                    MAX_MONSTERS: Game.Config.MAX_MONSTERS,
                    TOTAL_ROUNDS: Game.Config.TOTAL_ROUNDS,
                    SPAWN_INTERVAL: Game.Config.SPAWN_INTERVAL,
                    NORMAL_SPAWN_INTERVAL_MULTIPLIER: Game.Config.NORMAL_SPAWN_INTERVAL_MULTIPLIER,
                    MONSTER_HP_ROUND_RATE: Game.Config.MONSTER_HP_ROUND_RATE,
                    GOLD_ROUND_RATE: Game.Config.GOLD_ROUND_RATE,
                    BETWEEN_ROUND_DELAY: Game.Config.BETWEEN_ROUND_DELAY,
                    BETWEEN_ROUND_DELAY_BOSS_START: Game.Config.BETWEEN_ROUND_DELAY_BOSS_START,
                    BETWEEN_ROUND_DELAY_BOSS_END: Game.Config.BETWEEN_ROUND_DELAY_BOSS_END,
                    CRITICAL_DAMAGE_RATIO: Game.Config.CRITICAL_DAMAGE_RATIO,
                    GACHA_RATES: Game.Config.GACHA_RATES,
                    SYNTHESIS_RATES: Game.Config.SYNTHESIS_RATES,
                    TYPE_EFFECTIVENESS: Game.Config.TYPE_EFFECTIVENESS,
                    BOSS_EFFECTIVENESS: Game.Config.BOSS_EFFECTIVENESS,
                    FIELD: {
                        CENTER_X: Game.Config.FIELD.CENTER_X, CENTER_Y: Game.Config.FIELD.CENTER_Y,
                        SIZE: Game.Config.FIELD.SIZE, PATH_WIDTH: Game.Config.FIELD.PATH_WIDTH,
                        LEFT: Game.Config.FIELD.LEFT, RIGHT: Game.Config.FIELD.RIGHT,
                        TOP: Game.Config.FIELD.TOP, BOTTOM: Game.Config.FIELD.BOTTOM,
                        SPAWN_X: Game.Config.FIELD.SPAWN_X, SPAWN_Y: Game.Config.FIELD.SPAWN_Y
                    },
                    TOWER_PLACEMENT: {
                        SLOT_SIZE: Game.Config.TOWER_PLACEMENT.SLOT_SIZE,
                        MID_RANGE_MIN: Game.Config.TOWER_PLACEMENT.MID_RANGE_MIN,
                        CORNER_MIN_RANGE: Game.Config.TOWER_PLACEMENT.CORNER_MIN_RANGE,
                        MID_RANGE_RESERVED_SLOT_COUNT: Game.Config.TOWER_PLACEMENT.MID_RANGE_RESERVED_SLOT_COUNT
                    }
                }
            };

            var stopWorkersWithError = function(message) {
                workers.forEach(function(item) { try { item.terminate(); } catch(e) {} });
                calcRunning = false;
                self._calculationSimulationWorkers = null;
                calcBtnText.setText(message).setColor('#FF6666');
                drawCalcBtn(false);
            };

            var saveCalculationCheckpoint = function(force) {
                if (!pendingCheckpointAggregate || pendingCheckpointAggregate.total <= 0) return;
                if (!force && pendingCheckpointAggregate.total < 1000) return;
                checkpointIndex++;
                var checkpointSavedAt = Date.now();
                pendingCheckpointAggregate.wallElapsedMs = checkpointSavedAt - calculationStartedAt;
                pendingCheckpointAggregate.checkpointWallElapsedMs = checkpointSavedAt - checkpointStartedAt;
                pendingCheckpointAggregate.checkpointSampleCount = pendingCheckpointAggregate.total;
                checkpointStartedAt = checkpointSavedAt;
                pendingCheckpointAggregate.nextSeedOffset = existingSeedOffset +
                    workerProgress.reduce(function(sum, value) { return sum + value; }, 0);
                var checkpointId = runId + '-checkpoint-' + String(checkpointIndex).padStart(6, '0');
                var savedRun = window.RTDCalculationRunStore.save(
                    localStorage, checkpointId, pendingCheckpointAggregate
                );
                pushCalculationRun(savedRun).catch(function() {});
                pendingCheckpointAggregate = null;
                var savedAggregate = readCalculationAggregate();
                storedCalculationTotal = savedAggregate ? Number(savedAggregate.total || 0) : 0;
                updateStats();
                refreshAccuracyTimeLabel();
            };

            var finishParallelCalculation = function() {
                var aggregate;
                try {
                    // 정상 종료와 시간 제한 종료에서는 마지막 1,000회 미만 잔여분도 보존한다.
                    if (pendingCheckpointAggregate && calculationStoppedByTimeLimit) {
                        pendingCheckpointAggregate.stoppedByTimeLimit = true;
                    }
                    saveCalculationCheckpoint(true);
                    aggregate = readCalculationAggregate();
                    if (!aggregate) throw new Error('empty_calculation_result');
                    aggregate.wallElapsedMs = Date.now() - calculationStartedAt;
                } catch(eSave) {
                    stopWorkersWithError('결과 저장 실패');
                    return;
                }
                workers.forEach(function(item) { try { item.terminate(); } catch(e) {} });
                calcRunning = false;
                self._calculationSimulationWorkers = null;
                storedCalculationTotal = Number(aggregate.total || 0);
                calcBtnText.setText('✓ ' + (aggregate.wallElapsedMs / 1000).toFixed(1) + '초 · ' +
                    (calculationStoppedByTimeLimit || aggregate.stoppedByTimeLimit ? '시간 제한 · ' : '') + '누적 ' +
                    storedCalculationTotal.toLocaleString() + '회').setColor('#55FF99');
                drawCalcBtn(false);
                updateStats();
            };

            try {
                for (var workerIndex = 0; workerIndex < workerCount; workerIndex++) {
                    (function(index) {
                        var worker = new Worker('js/workers/CalculationSimulationWorker.js?v=11');
                        workers.push(worker);
                        var startOffset = Math.floor(calcIterations * index / workerCount);
                        var endOffset = Math.floor(calcIterations * (index + 1) / workerCount);
                        var batchIterations = endOffset - startOffset;
                        worker.onmessage = function(event) {
                            var message = event.data || {};
                            if (message.type === 'checkpoint') {
                                workerProgress[index] = Number(message.done || 0);
                                pendingCheckpointAggregate = window.RTDCalculationSimulator.mergeAggregates(
                                    pendingCheckpointAggregate, message.aggregate
                                );
                                saveCalculationCheckpoint(false);
                                var totalDone = workerProgress.reduce(function(sum, value) { return sum + value; }, 0);
                                var pct = Math.floor(totalDone / calcIterations * 100);
                                calcBtnText.setText('계산 중 ' + pct + '% (' + totalDone.toLocaleString() + '회 · ' +
                                    workerCount + ' workers)');
                                return;
                            }
                            if (message.type === 'complete') {
                                workerProgress[index] = Number(message.done || workerProgress[index] || 0);
                                calculationStoppedByTimeLimit = calculationStoppedByTimeLimit ||
                                    !!message.stoppedByTimeLimit;
                                completedWorkers++;
                                if (completedWorkers === workerCount) finishParallelCalculation();
                                return;
                            }
                            if (message.type === 'error') stopWorkersWithError('계산 오류: ' + message.message);
                        };
                        worker.onerror = function() { stopWorkersWithError('계산 모드 실행 실패'); };
                        worker.postMessage(Object.assign({}, sharedOptions, {
                            iterations: batchIterations,
                            checkpointIterations: 250,
                            seedBase: (nextSeedBase + Math.imul(startOffset, 97)) >>> 0,
                            existingAggregate: null
                        }));
                    }(workerIndex));
                }
                self._calculationSimulationWorkers = workers;
            } catch(eWorker) {
                stopWorkersWithError('계산 모드 실행 실패');
            }
        });

        // DEV 시뮬·계산 시뮬 기록은 서로 독립적으로 초기화한다.
        var clearBtnY = PY + PH - 44;
        var clearBtnGap = 8;
        var clearBtnW = (PW - 48 - clearBtnGap) / 2;
        var devClearX = PX + 20;
        var calcClearX = devClearX + clearBtnW + clearBtnGap;
        var devClearBg = this.add.graphics();
        var calcClearBg = this.add.graphics();
        var devClearText = this.add.text(devClearX + clearBtnW / 2, clearBtnY + 12, '🗑 DEV 기록 초기화', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#666666'
        }).setOrigin(0.5);
        var calcClearText = this.add.text(calcClearX + clearBtnW / 2, clearBtnY + 12, '🗑 계산 기록 초기화', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#666666'
        }).setOrigin(0.5);

        var drawClearButton = function(bg, textObject, x, hover) {
            bg.clear();
            bg.fillStyle(hover ? 0x220000 : 0x110000, 0.8);
            bg.fillRoundedRect(x, clearBtnY, clearBtnW, 24, 4);
            bg.lineStyle(1, hover ? 0xFF4444 : 0x442222, 1);
            bg.strokeRoundedRect(x, clearBtnY, clearBtnW, 24, 4);
            textObject.setColor(hover ? '#FF4444' : '#666666');
        };
        drawClearButton(devClearBg, devClearText, devClearX, false);
        drawClearButton(calcClearBg, calcClearText, calcClearX, false);

        var devClearZone = this.add.zone(devClearX + clearBtnW / 2, clearBtnY + 12, clearBtnW, 24)
            .setInteractive({useHandCursor:true});
        devClearZone.on('pointerover', function(){ drawClearButton(devClearBg, devClearText, devClearX, true); });
        devClearZone.on('pointerout', function(){ drawClearButton(devClearBg, devClearText, devClearX, false); });
        devClearZone.on('pointerdown', function() {
            try {
                var keys = [];
                for (var i = 0; i < localStorage.length; i++) {
                    var key = localStorage.key(i);
                    if (key && key.indexOf('rtd_simResults') === 0) keys.push(key);
                }
                keys.forEach(function(key) { localStorage.removeItem(key); });
            } catch(e) {}
            updateStats();
        });

        var calcClearZone = this.add.zone(calcClearX + clearBtnW / 2, clearBtnY + 12, clearBtnW, 24)
            .setInteractive({useHandCursor:true});
        calcClearZone.on('pointerover', function(){ drawClearButton(calcClearBg, calcClearText, calcClearX, true); });
        calcClearZone.on('pointerout', function(){ drawClearButton(calcClearBg, calcClearText, calcClearX, false); });
        calcClearZone.on('pointerdown', function() {
            if (calcRunning) {
                calcClearText.setText('계산 중에는 초기화 불가').setColor('#FFAA55');
                return;
            }
            var expected = selectedCalculationModel();
            calculationSyncEpoch++;
            try { window.RTDCalculationRunStore.clear(localStorage, selectedCalculationModel()); } catch(e) {}
            storedCalculationTotal = 0;
            refreshCalcButtonLabel();
            calcBtnText.setColor('#55CCFF');
            updateStats();
            fetch('/api/calculation-runs', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(expected)
            }).then(function(response) {
                if (!response.ok) throw new Error('calculation_run_clear_failed');
                return response.json();
            }).then(function() {
                // 초기화 요청과 겹친 이전 동기화 결과까지 제거한다.
                window.RTDCalculationRunStore.clear(localStorage, expected);
                uploadedCalculationRuns = {};
                calcClearText.setText('✓ 계산 기록 초기화').setColor('#55FF99');
                updateStats();
            }).catch(function() {
                calcClearText.setText('서버 초기화 실패').setColor('#FF5555');
            });
        });
    }
});

window.Game = Game;
