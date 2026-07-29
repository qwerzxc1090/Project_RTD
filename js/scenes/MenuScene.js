var Game = window.Game || {};

Game.MenuScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function MenuScene() {
        Phaser.Scene.call(this, { key: 'MenuScene' });
    },
    
    create: function() {
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

        // DEV 패널
        this._createDevPanel(W, H);
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
        var PX = W - 270, PY = 40, PW = 240, PH = H - 80;

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
        toggleZone.on('pointerdown', function() {
            devActive = !devActive;
            // 상호 배타: SIM ON → DPS OFF
            if (devActive && dpsActive) {
                dpsActive = false;
                try { localStorage.setItem('rtd_dpsMode', '0'); } catch(e) {}
                drawDpsToggle(dpsActive);
            }
            try { localStorage.setItem('rtd_devMode', devActive ? '1' : '0'); } catch(e) {}
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
        // 등급 점수 박스 배경 (statAvgFail 아래 10px 여백)
        var gsBg = this.add.graphics();
        gsBg.fillStyle(0x001a2a, 0.8);
        gsBg.fillRoundedRect(PX+10, PY+216, PW-20, 42, 4);
        gsBg.lineStyle(1, 0x225577, 0.6);
        gsBg.strokeRoundedRect(PX+10, PY+216, PW-20, 42, 4);
        var statGsClear  = this.add.text(PX+18, PY+223, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#44DDFF'
        });
        var statGsFail   = this.add.text(PX+18, PY+239, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#FF9944'
        });

        // ── 실패 분포 라벨 (gsBg 끝 PY+258에서 16px 여백) ──
        var thinLine1 = this.add.graphics();
        thinLine1.lineStyle(1, 0x2a2a2a, 1);
        thinLine1.lineBetween(PX+10, PY+266, PX+PW-10, PY+266);
        this.add.text(PX+16, PY+272, '실패 분포 (보스 라운드)', {
            fontSize: '12px', fontFamily: 'Oxanium', color: '#666666'
        });

        // 보스 라운드 (4열, 행간 20px, PY+290 시작)
        var bossRounds = Game.WaveData.getBossRounds ? Game.WaveData.getBossRounds() : [8,16,24,32,40,48,49,50];
        var bossTexts = [];
        var cols = Math.min(bossRounds.length, 4);
        var colW = Math.floor((PW - 24) / cols);   // 열 폭 균등 분배
        for (var bi = 0; bi < bossRounds.length; bi++) {
            bossTexts.push(this.add.text(
                PX + 14 + (bi % cols) * colW,
                PY + 290 + Math.floor(bi / cols) * 20,
                'R' + bossRounds[bi] + ':0',
                { fontSize: '12px', fontFamily: 'Oxanium', color: '#555555' }
            ));
        }

        // ── 최근 50회 결과 (보스 2행 = PY+310 → thinLine2 PY+318) ──
        var rowsUsed = Math.ceil(bossRounds.length / cols);
        var histStartY = PY + 290 + rowsUsed * 20 + 14;   // 보스 마지막 행 + 14px 여백

        var thinLine2 = this.add.graphics();
        thinLine2.lineStyle(1, 0x2a2a2a, 1);
        thinLine2.lineBetween(PX+10, histStartY, PX+PW-10, histStartY);
        this.add.text(PX+16, histStartY + 6, '최근 50회', {
            fontSize: '12px', fontFamily: 'Oxanium', color: '#666666'
        });

        var resultIcons = [];
        var iconStartY = histStartY + 24;
        for (var ri = 0; ri < 50; ri++) {
            resultIcons.push(this.add.text(
                PX + 14 + (ri % 10) * 22,
                iconStartY + Math.floor(ri / 10) * 19,
                '', { fontSize: '11px', fontFamily: 'Oxanium' }
            ));
        }

        var updateStats = function() {
            var results = [];
            try { results = JSON.parse(localStorage.getItem('rtd_simResults') || '[]'); } catch(e) {}
            var total  = results.length;
            var wins   = results.filter(function(r){ return r.win; });
            var fails  = results.filter(function(r){ return !r.win; });
            var clears = wins.length;
            var rate   = total > 0 ? Math.round(clears / total * 100) : 0;

            // 평균 라운드 (성공/실패 분리)
            var avgClear = wins.length  > 0 ? Math.round(wins.reduce(function(a,r){  return a+r.round; }, 0) / wins.length)  : 0;
            var avgFail  = fails.length > 0 ? Math.round(fails.reduce(function(a,r){ return a+r.round; }, 0) / fails.length) : 0;

            // 평균 플레이 시간
            var avgTimeSec = total > 0 ? Math.round(results.reduce(function(a,r){ return a + (r.time || 0); }, 0) / total) : 0;
            var am = Math.floor(avgTimeSec / 60), as = avgTimeSec % 60;
            var avgTimeStr = (am < 10 ? '0' : '') + am + ':' + (as < 10 ? '0' : '') + as;

            statTotal.setText('총 실행: ' + total + '회');
            statClear.setText('클리어: ' + clears + '회');
            statRate.setText('클리어율: ' + rate + '%');
            statAvgClear.setText('실패 평균: R' + (avgFail || '-') + '  |  평균시간: ' + avgTimeStr);
            statAvgFail.setText('');

            // 등급 점수 평균 (새 gs 데이터 우선, 없으면 전체 평균)
            var winsWithGs  = wins.filter(function(r){ return r.gs > 0; });
            var failsWithGs = fails.filter(function(r){ return r.gs > 0; });
            var avgGsClear = winsWithGs.length > 0
                ? Math.round(winsWithGs.reduce(function(a,r){ return a+r.gs; },0) / winsWithGs.length) : 0;
            var avgGsFail  = failsWithGs.length > 0
                ? Math.round(failsWithGs.reduce(function(a,r){ return a+r.gs; },0) / failsWithGs.length) : 0;
            statGsClear.setText('🏆 클리어 평균점수: ' + (avgGsClear > 0 ? avgGsClear.toLocaleString() : '게임 축적 필요'));
            statGsFail.setText('💀 오버 평균점수: '    + (avgGsFail  > 0 ? avgGsFail.toLocaleString()  : '게임 축적 필요'));

            // 보스 라운드별 실패 카운트
            var bossCount = {};
            bossRounds.forEach(function(b) { bossCount[b] = 0; });
            fails.forEach(function(r) {
                // 실패한 라운드를 가장 가까운 보스 라운드 이하로 버킷팅
                var bucket = bossRounds[0];
                bossRounds.forEach(function(b) {
                    if (r.round >= b) bucket = b;
                });
                if (bossCount[bucket] !== undefined) bossCount[bucket]++;
            });
            for (var bi2 = 0; bi2 < bossRounds.length; bi2++) {
                var br = bossRounds[bi2];
                var cnt = bossCount[br] || 0;
                if (bossTexts[bi2]) {
                    bossTexts[bi2].setText('R' + br + ':' + cnt);
                    bossTexts[bi2].setColor(cnt > 0 ? '#FF8844' : '#444444');
                }
            }

            // 최근 50회: 성공=✅, 실패=R번호(빨강)
            var recent = results.slice(-50);
            for (var i = 0; i < 50; i++) {
                if (i < recent.length) {
                    if (recent[i].win) {
                        resultIcons[i].setText('✅').setColor('#44FF44');
                    } else {
                        resultIcons[i].setText('R' + recent[i].round).setColor('#FF5533');
                    }
                } else {
                    resultIcons[i].setText('·').setColor('#333333');
                }
            }
        };
        updateStats();

        // 구분선

        // 시뮬레이션 시작 버튼 (패널 최하단)
        var simBtnY  = PY + PH - 82;   // 기록 초기화 위
        var simBtnBg = this.add.graphics();
        var simBtnText = this.add.text(PX+PW/2, simBtnY + 14, '▶ 시뮬레이션 시작', {
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

        // 기록 초기화 버튼
        var clearBtnBg = this.add.graphics();
        var clearBtnText = this.add.text(PX+PW/2, PY+PH-30, '🗑 기록 초기화', {
            fontSize: '11px', fontFamily: 'Oxanium', color: '#666666'
        }).setOrigin(0.5);

        var drawClearBtn = function(hover) {
            clearBtnBg.clear();
            clearBtnBg.fillStyle(hover ? 0x220000 : 0x110000, 0.8);
            clearBtnBg.fillRoundedRect(PX+40, PY+PH-44, PW-80, 24, 4);
            clearBtnBg.lineStyle(1, hover ? 0xFF4444 : 0x442222, 1);
            clearBtnBg.strokeRoundedRect(PX+40, PY+PH-44, PW-80, 24, 4);
            clearBtnText.setColor(hover ? '#FF4444' : '#666666');
        };
        drawClearBtn(false);

        var clearZone = this.add.zone(PX+PW/2, PY+PH-30, PW-80, 24).setInteractive({useHandCursor:true});
        clearZone.on('pointerover',  function(){ drawClearBtn(true);  });
        clearZone.on('pointerout',   function(){ drawClearBtn(false); });
        clearZone.on('pointerdown', function() {
            try { localStorage.removeItem('rtd_simResults'); } catch(e) {}
            updateStats();
        });
    }
});

window.Game = Game;
