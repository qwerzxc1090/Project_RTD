var Game = window.Game || {};

Game.GameScene = new Phaser.Class({
    Extends: Phaser.Scene,
    
    initialize: function GameScene() {
        Phaser.Scene.call(this, { key: 'GameScene' });
    },
    
    create: function() {
        var self = this;
        
        // Initialize systems
        Game.EconomySystem.reset();
        if (Game.DamageTracker) Game.DamageTracker.init();
        this.waveSystem = new Game.WaveSystem(this);
        
        // Game state
        this.towers = [];
        this.monsters = [];
        this.projectiles = [];   // 호환용 (사용하지 않음)
        this.speedMultiplier = 1;
        this.totalGoldEarned = 0;
        this.isGameOver = false;

        // ── 풀 초기화 ──
        Game.ProjectilePool.init(this);
        Game.MonsterPool.init(this); // 최적화: 몬스터 풀 초기화
        Game.DamageTextPool.init(this);
        Game.HitEffectPool.init(this);
        this._cachedActiveMonsters = [];  // update에서 재사용

        // ── 멀티 시뮬레이션 인스턴스 ID (URL ?sim=X) ──
        this.simId = (function() {
            try { return new URLSearchParams(window.location.search).get('sim'); } catch(e) { return null; }
        }());
        this.simResultsKey = this.simId ? 'rtd_simResults_' + this.simId : 'rtd_simResults';

        // ── SIM 모드 감지 (localStorage 기준) ──
        this.devSimMode = (function() {
            try { return localStorage.getItem('rtd_devMode') === '1'; } catch(e) { return false; }
        }());

        // ── DPS MODE 감지 ──
        this.dpsMode = (function() {
            try { return localStorage.getItem('rtd_dpsMode') === '1'; } catch(e) { return false; }
        }());
        // DPS MODE 활성화 시 SIM MODE는 비활성화 (충돌 방지)
        if (this.dpsMode) this.devSimMode = false;

        
        // Tower placement tracking
        this.towerSlots = [];           // Pre-computed tower placement positions
        this.slotOccupancy = [];         // 슬롯당 배치된 타워 수 (최대 5)
        this._lastActiveCount = -1;       // 이전 프레임 몬스터 수 (변경 감지용)
        
        // Create map
        this._createMap();
        
        // Compute tower placement slots
        this._computeTowerSlots();
        
        // Create UI
        this._createUI();
        
        // Setup events
        this._setupEvents();
        
        // 저장된 배속 복원 (이벤트 리스너 등록 후 실행)
        var savedSpeed = 1;
        try { savedSpeed = parseFloat(localStorage.getItem('rtd_speed')) || 1; } catch(e) {}
        if ([0.5, 1, 2, 3, 4, 5, 6].indexOf(savedSpeed) !== -1 && savedSpeed !== 1) {
            this.events.emit('speedChanged', savedSpeed);
        }
        
        // Setup SPACE key
        this._setupSpaceKey();

        
        // Setup economy callbacks
        Game.EconomySystem.onGoldChange(function(gold) {
            self.hud.updateGold(gold);
            self.gachaUI.updateAffordability();
        });
        
        // 콜백 등록 직후 HUD에 현재 골드 즉시 반영 (캐시 문제 방지)
        self.hud.updateGold(Game.EconomySystem.getGold());
        
        Game.EconomySystem.onLivesChange(function(lives) {
            self.hud.updateLives(lives);
        });

        // 초기 생명력 즉시 동기화
        self.hud.updateLives(Game.EconomySystem.getLives());

        // 시뮬레이션 모드: 자동 시작
        if (this.devSimMode) {
            var selfDev = this;
            window.setTimeout(function() {
                try {
                    if (selfDev.scene && !selfDev.isGameOver) {
                        selfDev._startGameAction();
                    }
                } catch(eStart) {
                    console.warn('[Sim] 자동 시작 예외:', eStart);
                }
            }, 400);
            // DEV 표시
            this.add.text(10, 50, '⚙ SIM', {
                fontSize: '10px', fontFamily: 'Oxanium',
                color: '#FF6600', alpha: 0.7
            }).setDepth(999);
            
            this._createSimStatsDisplay();
        } else if (this.dpsMode) {
            // ── DPS MODE: 설정 UI 표시 후 시작 ──
            var selfDps = this;
            this.time.delayedCall(300, function() {
                selfDps._showDpsSetupUI();
            });
            // DPS MODE 라벨 (타이머 하단)
            this.add.text(260, 38, '📊 DPS MODE', {
                fontSize: '12px', fontFamily: 'Oxanium',
                color: '#00AAFF',
                stroke: '#000000', strokeThickness: 2
            }).setDepth(999);
        } else {
            // 게임 자동 시작 (메뉴에서 버튼 누른 직후 바로 시작)
            this.time.delayedCall(100, function() {
                self._startGameAction();
            });
        }

    },
    
    _setupSpaceKey: function() {
        // 스페이스바 등록 (배속 토글용으로만 유지)
        this.spaceKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE);
    },
    
    _startGameAction: function() {
        if (this.waveSystem.isGameStarted || this.isGameOver) return;
        this.waveSystem.startGame();
        this.hud.hideSpacePrompt();
        this.hud.setWaveActive(true);
    },

    // ── DPS MODE 설정 UI ──────────────────────────────────────
    _showDpsSetupUI: function() {
        var self = this;
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        var DEPTH = 800;
        var uiObjs = [];

        // ── 기본 상태 ──
        var defaultState = {
            normal: true,
            boss: false,
            normalTypes: { general: true, small: true, large: true },
            bossTypes:   { boss_normal: true, boss_small: true, boss_large: true },
            towerTypes: {
                normal_base: true, explosive_base: true, vibration_base: true,
                normal_chain: true, explosive_chain: true, vibration_chain: true,
                normal_poison: true, explosive_poison: true, vibration_poison: true,
                normal_gold: true, explosive_gold: true, vibration_gold: true
            },
            towerTiers: {
                normal: true, rare: true, ancient: true, relic: false,
                saga: false, legend: false, epic: false, myth: false, primordial: false
            },
            towerMultiplier: 1,
            normalHpMultiplier: 1,
            bossHpMultiplier: 1
        };

        // ── localStorage에서 이전 설정 복원 ──
        var state = defaultState;
        try {
            var saved = localStorage.getItem('rtd_dpsSetup');
            if (saved) {
                var parsed = JSON.parse(saved);
                // 각 필드를 기본값 위에 덮어쓰기 (새 키가 추가되어도 안전)
                if (typeof parsed.normal === 'boolean') state.normal = parsed.normal;
                if (typeof parsed.boss === 'boolean') state.boss = parsed.boss;
                if (parsed.normalTypes) {
                    for (var nk in defaultState.normalTypes) {
                        if (typeof parsed.normalTypes[nk] === 'boolean') state.normalTypes[nk] = parsed.normalTypes[nk];
                    }
                }
                if (parsed.bossTypes) {
                    for (var bk in defaultState.bossTypes) {
                        if (typeof parsed.bossTypes[bk] === 'boolean') state.bossTypes[bk] = parsed.bossTypes[bk];
                    }
                }
                if (parsed.towerTypes) {
                    for (var ttk in defaultState.towerTypes) {
                        if (typeof parsed.towerTypes[ttk] === 'boolean') state.towerTypes[ttk] = parsed.towerTypes[ttk];
                    }
                }
                if (parsed.towerTiers) {
                    for (var trk in defaultState.towerTiers) {
                        if (typeof parsed.towerTiers[trk] === 'boolean') state.towerTiers[trk] = parsed.towerTiers[trk];
                    }
                }
                if (typeof parsed.towerMultiplier === 'number' && parsed.towerMultiplier >= 1 && parsed.towerMultiplier <= 20) {
                    state.towerMultiplier = Math.floor(parsed.towerMultiplier);
                }
                if (typeof parsed.normalHpMultiplier === 'number' && parsed.normalHpMultiplier >= 1 && parsed.normalHpMultiplier <= 20) {
                    state.normalHpMultiplier = Math.floor(parsed.normalHpMultiplier);
                }
                if (typeof parsed.bossHpMultiplier === 'number' && parsed.bossHpMultiplier >= 1 && parsed.bossHpMultiplier <= 20) {
                    state.bossHpMultiplier = Math.floor(parsed.bossHpMultiplier);
                }
                console.log('[DPS MODE] 이전 설정 복원 완료');
            }
        } catch(e) {}

        // ── 배경 오버레이 ──
        var overlay = this.add.graphics().setDepth(DEPTH);
        overlay.fillStyle(0x000000, 0.75);
        overlay.fillRect(0, 0, W, H);
        uiObjs.push(overlay);

        // ── 패널 (좌: 몬스터, 우: 타워) ──
        var panW = 660, panH = 520;
        var panX = (W - panW) / 2, panY = (H - panH) / 2;
        var panel = this.add.graphics().setDepth(DEPTH + 1);
        panel.fillStyle(0x0d0d1a, 0.98);
        panel.fillRoundedRect(panX, panY, panW, panH, 12);
        panel.lineStyle(2, 0x00AAFF, 0.8);
        panel.strokeRoundedRect(panX, panY, panW, panH, 12);
        uiObjs.push(panel);

        // 중앙 구분선
        var divider = this.add.graphics().setDepth(DEPTH + 2);
        divider.lineStyle(1, 0x333355, 0.6);
        divider.lineBetween(panX + panW / 2, panY + 45, panX + panW / 2, panY + panH - 60);
        uiObjs.push(divider);

        // ── 제목 ──
        var title = this.add.text(W / 2, panY + 20, '📊 DPS MODE 설정', {
            fontSize: '16px', fontFamily: 'Oxanium', fontStyle: 'bold',
            color: '#00AAFF', stroke: '#000', strokeThickness: 3
        }).setOrigin(0.5).setDepth(DEPTH + 2);
        uiObjs.push(title);

        // ── 체크박스 헬퍼 ──
        function createCheckbox(x, y, label, checked, fontSize, color, onChange) {
            var boxSize = fontSize >= 12 ? 13 : 11;
            var boxGfx = self.add.graphics().setDepth(DEPTH + 2);
            var fillColor = color || 0x00AAFF;
            var labelTxt = self.add.text(x + boxSize + 5, y, label, {
                fontSize: fontSize + 'px', fontFamily: 'Oxanium', color: '#CCCCCC',
                stroke: '#000', strokeThickness: 1
            }).setOrigin(0, 0.5).setDepth(DEPTH + 2);
            uiObjs.push(boxGfx, labelTxt);

            var cb = { checked: checked };
            function draw() {
                boxGfx.clear();
                boxGfx.lineStyle(1.5, cb.checked ? fillColor : 0x555555, 1);
                boxGfx.strokeRect(x, y - boxSize / 2, boxSize, boxSize);
                if (cb.checked) {
                    boxGfx.fillStyle(fillColor, 1);
                    boxGfx.fillRect(x + 2, y - boxSize / 2 + 2, boxSize - 4, boxSize - 4);
                }
                labelTxt.setColor(cb.checked ? '#FFFFFF' : '#555555');
            }
            draw();

            var zone = self.add.zone(x + boxSize / 2, y, boxSize + labelTxt.width + 8, boxSize + 4)
                .setInteractive({ useHandCursor: true }).setDepth(DEPTH + 3);
            zone.on('pointerdown', function() {
                cb.checked = !cb.checked;
                draw();
                if (onChange) onChange(cb.checked);
            });
            uiObjs.push(zone);
            return cb;
        }

        // ── 라디오 헬퍼 ──
        function createRadioGroup(items, x, y, spacing, selected, onChange) {
            var radios = [];
            for (var ri = 0; ri < items.length; ri++) {
                (function(idx, item) {
                    var rx = x + idx * spacing;
                    var gfx = self.add.graphics().setDepth(DEPTH + 2);
                    var lbl = self.add.text(rx + 16, y, item.label, {
                        fontSize: '10px', fontFamily: 'Oxanium', color: '#CCCCCC',
                        stroke: '#000', strokeThickness: 1
                    }).setOrigin(0, 0.5).setDepth(DEPTH + 2);
                    uiObjs.push(gfx, lbl);

                    var radio = { value: item.value, selected: item.value === selected, gfx: gfx, lbl: lbl };
                    radios.push(radio);

                    function drawAll() {
                        for (var rj = 0; rj < radios.length; rj++) {
                            var r = radios[rj];
                            var cx = x + rj * spacing + 6, cy = y;
                            r.gfx.clear();
                            r.gfx.lineStyle(1.5, r.selected ? 0x00AAFF : 0x555555, 1);
                            r.gfx.strokeCircle(cx, cy, 5);
                            if (r.selected) {
                                r.gfx.fillStyle(0x00AAFF, 1);
                                r.gfx.fillCircle(cx, cy, 3);
                            }
                            r.lbl.setColor(r.selected ? '#FFFFFF' : '#555555');
                        }
                    }
                    drawAll();

                    var zone = self.add.zone(rx + 6, y, spacing - 4, 14)
                        .setInteractive({ useHandCursor: true }).setDepth(DEPTH + 3);
                    zone.on('pointerdown', function() {
                        for (var rk = 0; rk < radios.length; rk++) radios[rk].selected = false;
                        radio.selected = true;
                        drawAll();
                        if (onChange) onChange(radio.value);
                    });
                    uiObjs.push(zone);
                })(ri, items[ri]);
            }
            return radios;
        }

        // ════════════════════════════════════════════
        // 좌측: 몬스터 리스폰 설정
        // ════════════════════════════════════════════
        var leftX = panX + 20;
        var yPos = panY + 48;

        var secMon = this.add.text(leftX, yPos, '🎯 몬스터 리스폰', {
            fontSize: '12px', fontFamily: 'Oxanium', fontStyle: 'bold', color: '#00AAFF',
            stroke: '#000', strokeThickness: 2
        }).setDepth(DEPTH + 2);
        uiObjs.push(secMon);

        yPos += 24;
        createCheckbox(leftX, yPos, '일반', state.normal, 11, 0x00AAFF, function(v) { state.normal = v; });
        yPos += 20;
        var nLabels = { general: '일반', small: '소형', large: '대형' };
        var nKeys = ['general', 'small', 'large'];
        for (var ni = 0; ni < nKeys.length; ni++) {
            (function(key, i) {
                createCheckbox(leftX + 20 + i * 75, yPos, nLabels[key], state.normalTypes[key], 9, 0x6699CC, function(v) {
                    state.normalTypes[key] = v;
                });
            })(nKeys[ni], ni);
        }

        yPos += 26;
        createCheckbox(leftX, yPos, '보스', state.boss, 11, 0xFF9900, function(v) { state.boss = v; });
        yPos += 20;
        var bLabels = { boss_normal: '일반', boss_small: '소형', boss_large: '대형' };
        var bKeys = ['boss_normal', 'boss_small', 'boss_large'];
        for (var bi = 0; bi < bKeys.length; bi++) {
            (function(key, i) {
                createCheckbox(leftX + 20 + i * 75, yPos, bLabels[key], state.bossTypes[key], 9, 0xFF6644, function(v) {
                    state.bossTypes[key] = v;
                });
            })(bKeys[bi], bi);
        }

        yPos += 22;
        var ruleText = this.add.text(leftX, yPos, '♻ 사망 시 자동 리스폰 (설정 수량 유지)', {
            fontSize: '8px', fontFamily: 'Oxanium', color: '#00CC66', stroke: '#000', strokeThickness: 1
        }).setDepth(DEPTH + 2);
        uiObjs.push(ruleText);

        // ── 숫자 입력 헬퍼 (DOM input) ──
        function createNumberInput(x, y, label, value, min, max, onChange) {
            var lbl = self.add.text(x, y, label, {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#AAAAAA'
            }).setDepth(DEPTH + 2);
            uiObjs.push(lbl);

            var input = document.createElement('input');
            input.type = 'number';
            input.min = min;
            input.max = max;
            input.value = value;
            input.style.cssText = 'width:60px;height:20px;background:#1a1a2e;color:#00AAFF;border:1px solid #00AAFF;' +
                'border-radius:4px;font-family:Oxanium,monospace;font-size:12px;text-align:center;outline:none;' +
                'position:absolute;z-index:9999;';

            // Phaser 캔버스 기준 위치 계산
            var canvas = self.game.canvas;
            var rect = canvas.getBoundingClientRect();
            var scaleX = rect.width / Game.Config.WIDTH;
            var scaleY = rect.height / Game.Config.HEIGHT;
            input.style.left = (rect.left + (x + lbl.width + 8) * scaleX) + 'px';
            input.style.top  = (rect.top + (y - 10) * scaleY) + 'px';
            input.style.transform = 'scale(' + scaleX + ')';
            input.style.transformOrigin = 'left top';

            document.body.appendChild(input);

            input.addEventListener('change', function() {
                var v = parseInt(input.value) || min;
                v = Math.max(min, Math.min(max, v));
                input.value = v;
                onChange(v);
            });
            input.addEventListener('input', function() {
                var v = parseInt(input.value) || min;
                v = Math.max(min, Math.min(max, v));
                onChange(v);
            });

            // UI 정리 시 DOM 제거용
            uiObjs.push({ destroy: function() { if (input.parentNode) input.parentNode.removeChild(input); } });

            return input;
        }

        // ── HP 배율 (일반) ──
        yPos += 22;
        createNumberInput(leftX, yPos, '❤ HP 배율 (일반)', state.normalHpMultiplier, 1, 20,
            function(v) { state.normalHpMultiplier = v; });

        // ── HP 배율 (보스) ──
        yPos += 26;
        createNumberInput(leftX, yPos, '💀 HP 배율 (보스)', state.bossHpMultiplier, 1, 20,
            function(v) { state.bossHpMultiplier = v; });

        // ════════════════════════════════════════════
        // 우측: 타워 설정
        // ════════════════════════════════════════════
        var rightX = panX + panW / 2 + 20;
        yPos = panY + 48;

        var secTower = this.add.text(rightX, yPos, '🗼 타워 구성', {
            fontSize: '12px', fontFamily: 'Oxanium', fontStyle: 'bold', color: '#FFD700',
            stroke: '#000', strokeThickness: 2
        }).setDepth(DEPTH + 2);
        uiObjs.push(secTower);

        // 타워 공격타입 12종 (4행 × 3열)
        yPos += 22;
        var subSec1 = this.add.text(rightX, yPos, '공격타입 (12종)', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#AAAAAA'
        }).setDepth(DEPTH + 2);
        uiObjs.push(subSec1);

        yPos += 16;
        var towerTypeRows = [
            [{ key: 'normal_base',    label: '일반형' },  { key: 'explosive_base',    label: '폭발형' },  { key: 'vibration_base',    label: '진동형' }],
            [{ key: 'normal_chain',   label: '일반_연' }, { key: 'explosive_chain',   label: '폭발_연' }, { key: 'vibration_chain',   label: '진동_연' }],
            [{ key: 'normal_poison',  label: '일반_독' }, { key: 'explosive_poison',  label: '폭발_독' }, { key: 'vibration_poison',  label: '진동_독' }],
            [{ key: 'normal_gold',    label: '일반_골' }, { key: 'explosive_gold',    label: '폭발_골' }, { key: 'vibration_gold',    label: '진동_골' }]
        ];
        var ttColors = [0xFFFFFF, 0x44CCFF, 0x44FF44, 0xFFD700];
        for (var tr = 0; tr < towerTypeRows.length; tr++) {
            for (var tc = 0; tc < towerTypeRows[tr].length; tc++) {
                (function(item, col) {
                    createCheckbox(rightX + col * 90, yPos, item.label, state.towerTypes[item.key], 9, ttColors[tr], function(v) {
                        state.towerTypes[item.key] = v;
                    });
                })(towerTypeRows[tr][tc], tc);
            }
            yPos += 18;
        }

        // 타워 등급 (2행)
        yPos += 8;
        var subSec2 = this.add.text(rightX, yPos, '등급 (9종)', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#AAAAAA'
        }).setDepth(DEPTH + 2);
        uiObjs.push(subSec2);

        yPos += 16;
        var tierKeys = ['normal', 'rare', 'ancient', 'relic', 'saga'];
        var tierLabels = { normal: '일반', rare: '레어', ancient: '고대', relic: '유물', saga: '서사',
                           legend: '전설', epic: '에픽', myth: '신화', primordial: '태초' };
        var tierColors = { normal: 0x888888, rare: 0x228B22, ancient: 0x9900CC, relic: 0xFF7F00, saga: 0xC0C0C0,
                           legend: 0xFFE000, epic: 0x40E0D0, myth: 0xFF3300, primordial: 0x00FFFF };
        for (var t1 = 0; t1 < tierKeys.length; t1++) {
            (function(key, i) {
                createCheckbox(rightX + i * 52, yPos, tierLabels[key], state.towerTiers[key], 9, tierColors[key], function(v) {
                    state.towerTiers[key] = v;
                });
            })(tierKeys[t1], t1);
        }
        yPos += 18;
        var tierKeys2 = ['legend', 'epic', 'myth', 'primordial'];
        for (var t2 = 0; t2 < tierKeys2.length; t2++) {
            (function(key, i) {
                createCheckbox(rightX + i * 52, yPos, tierLabels[key], state.towerTiers[key], 9, tierColors[key], function(v) {
                    state.towerTiers[key] = v;
                });
            })(tierKeys2[t2], t2);
        }

        // 타워 배수
        yPos += 28;
        createNumberInput(rightX, yPos, '타워 배수', state.towerMultiplier, 1, 20,
            function(v) { state.towerMultiplier = v; });

        // ════════════════════════════════════════════
        // START 버튼 (하단 중앙)
        // ════════════════════════════════════════════
        var btnW = 180, btnH = 38;
        var btnX = (W - btnW) / 2, btnY = panY + panH - 55;
        var btnGfx = this.add.graphics().setDepth(DEPTH + 2);
        function drawBtn(hover) {
            btnGfx.clear();
            btnGfx.fillStyle(hover ? 0x0088DD : 0x00AAFF, 1);
            btnGfx.fillRoundedRect(btnX, btnY, btnW, btnH, 8);
        }
        drawBtn(false);
        uiObjs.push(btnGfx);

        var btnLabel = this.add.text(W / 2, btnY + btnH / 2, '▶  START', {
            fontSize: '15px', fontFamily: 'Oxanium', fontStyle: 'bold',
            color: '#FFFFFF', stroke: '#000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(DEPTH + 3);
        uiObjs.push(btnLabel);

        var btnZone = this.add.zone(W / 2, btnY + btnH / 2, btnW, btnH)
            .setInteractive({ useHandCursor: true }).setDepth(DEPTH + 4);
        btnZone.on('pointerover', function() { drawBtn(true); });
        btnZone.on('pointerout',  function() { drawBtn(false); });
        btnZone.on('pointerdown', function() {
            // ── 몬스터 설정 수집 ──
            var normalTypes = [];
            var bossTypes = [];
            if (state.normal) {
                for (var k in state.normalTypes) {
                    if (state.normalTypes[k]) normalTypes.push(k);
                }
            }
            if (state.boss) {
                for (var k2 in state.bossTypes) {
                    if (state.bossTypes[k2]) bossTypes.push(k2);
                }
            }
            if (normalTypes.length === 0 && bossTypes.length === 0) {
                normalTypes = ['general', 'small', 'large'];
            }

            // ── 타워 설정 수집 ──
            var selectedTowerTypes = [];
            for (var tk in state.towerTypes) {
                if (state.towerTypes[tk]) selectedTowerTypes.push(tk);
            }
            var selectedTiers = [];
            for (var ti in state.towerTiers) {
                if (state.towerTiers[ti]) selectedTiers.push(ti);
            }

            // ── 설정값 localStorage에 저장 ──
            try {
                localStorage.setItem('rtd_dpsSetup', JSON.stringify(state));
            } catch(e) {}

            // 셔플 함수
            function shuffle(arr) {
                for (var i = arr.length - 1; i > 0; i--) {
                    var j = Math.floor(Math.random() * (i + 1));
                    var tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp;
                }
                return arr;
            }

            // DPS 옵션 저장
            self._dpsOptions = {
                normal: shuffle(normalTypes),
                boss: shuffle(bossTypes),
                towerTypes: selectedTowerTypes,
                towerTiers: selectedTiers,
                towerMultiplier: state.towerMultiplier,
                normalHpMultiplier: state.normalHpMultiplier,
                bossHpMultiplier: state.bossHpMultiplier
            };

            // UI 제거 (Phaser 객체 + DOM 입력 필드 모두 정리)
            uiObjs.forEach(function(o) {
                if (o && typeof o.destroy === 'function') {
                    if (o.active !== false) o.destroy();
                }
            });

            // 타워 자동 배치
            self._placeDpsTowers();

            // 게임 시작
            self._startGameAction();
        });
        uiObjs.push(btnZone);
    },

    // ── DPS MODE 타워 자동 배치 ──
    _placeDpsTowers: function() {
        var opts = this._dpsOptions;
        if (!opts || !opts.towerTypes || !opts.towerTiers) return;

        var allUnits = (Game.UnitData && Game.UnitData.units) ? Game.UnitData.units : [];
        if (!allUnits || allUnits.length === 0) return;

        // 스킬 매핑: unitId suffix → towerType suffix
        // _yeon → chain, _dok → poison, _don → gold, 없음 → base
        function getUnitTypeKey(unit) {
            var id = unit.id || '';
            var atk = unit.attackType || 'normal';
            var suffix = 'base';
            if (id.indexOf('_yeon') !== -1) suffix = 'chain';
            else if (id.indexOf('_dok') !== -1) suffix = 'poison';
            else if (id.indexOf('_don') !== -1) suffix = 'gold';
            return atk + '_' + suffix;
        }

        // 선택된 조합에 맞는 유닛 필터링
        var filtered = [];
        for (var ui = 0; ui < allUnits.length; ui++) {
            var u = allUnits[ui];
            var typeKey = getUnitTypeKey(u);
            var tier = u.tier || '';
            if (opts.towerTypes.indexOf(typeKey) !== -1 && opts.towerTiers.indexOf(tier) !== -1) {
                filtered.push(u);
            }
        }

        // 배수 적용
        var mult = opts.towerMultiplier || 1;
        var towerList = [];
        for (var mi = 0; mi < mult; mi++) {
            for (var fi = 0; fi < filtered.length; fi++) {
                towerList.push(filtered[fi]);
            }
        }

        // 셔플
        for (var si = towerList.length - 1; si > 0; si--) {
            var sj = Math.floor(Math.random() * (si + 1));
            var tmp = towerList[si]; towerList[si] = towerList[sj]; towerList[sj] = tmp;
        }

        // 순차 배치
        console.log('[DPS MODE] 선택 등급:', opts.towerTiers.join(','), '선택 타입:', opts.towerTypes.join(','));
        console.log('[DPS MODE] 필터링: ' + filtered.length + '종 × X' + mult + ' = ' + towerList.length + '개 배치');
        for (var pi = 0; pi < towerList.length; pi++) {
            this._autoPlaceTower(towerList[pi]);
        }
    },

    
    _createMap: function() {
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        var FIELD = Game.Config.FIELD;
        
        // Background
        var bg = this.add.graphics();
        bg.fillStyle(0x0a0a0f, 1);
        bg.fillRect(0, 0, W, H);
        
        // Draw subtle grid on the background
        var gridBg = this.add.graphics();
        gridBg.lineStyle(1, 0x1a1a2e, 0.15);
        for (var gx = 0; gx < W; gx += 40) {
            gridBg.lineBetween(gx, 0, gx, H);
        }
        for (var gy = 0; gy < H; gy += 40) {
            gridBg.lineBetween(0, gy, W, gy);
        }
        
        // Draw the square path border
        var pathG = this.add.graphics();
        var pathWidth = FIELD.PATH_WIDTH;
        var halfPath = pathWidth / 2;
        
        // Outer boundary of path
        var outerLeft = FIELD.LEFT - halfPath;
        var outerRight = FIELD.RIGHT + halfPath;
        var outerTop = FIELD.TOP - halfPath;
        var outerBottom = FIELD.BOTTOM + halfPath;
        
        // Inner boundary of path
        var innerLeft = FIELD.LEFT + halfPath;
        var innerRight = FIELD.RIGHT - halfPath;
        var innerTop = FIELD.TOP + halfPath;
        var innerBottom = FIELD.BOTTOM - halfPath;
        
        // Draw path fill (4 sides of the square)
        pathG.fillStyle(Game.Config.COLORS.UI.PATH, 1);
        
        // Top side
        pathG.fillRect(outerLeft, outerTop, outerRight - outerLeft, pathWidth);
        // Bottom side
        pathG.fillRect(outerLeft, FIELD.BOTTOM - halfPath, outerRight - outerLeft, pathWidth);
        // Left side
        pathG.fillRect(outerLeft, outerTop, pathWidth, outerBottom - outerTop);
        // Right side
        pathG.fillRect(FIELD.RIGHT - halfPath, outerTop, pathWidth, outerBottom - outerTop);
        
        // Draw path borders
        pathG.lineStyle(2, Game.Config.COLORS.UI.PATH_BORDER, 0.8);
        // Outer border
        pathG.strokeRect(outerLeft, outerTop, outerRight - outerLeft, outerBottom - outerTop);
        // Inner border
        pathG.strokeRect(innerLeft, innerTop, innerRight - innerLeft, innerBottom - innerTop);
        
        // Draw direction arrows (CCW) along the path
        var arrowG = this.add.graphics();
        arrowG.fillStyle(0x3a2a1a, 0.4);
        
        // Top side arrows (going left ←)
        for (var ax = FIELD.RIGHT - 60; ax > FIELD.LEFT + 20; ax -= 80) {
            arrowG.fillTriangle(
                ax, FIELD.TOP - 10,
                ax - 15, FIELD.TOP,
                ax, FIELD.TOP + 10
            );
        }
        // Left side arrows (going down ↓)
        for (var ay = FIELD.TOP + 40; ay < FIELD.BOTTOM - 20; ay += 80) {
            arrowG.fillTriangle(
                FIELD.LEFT - 10, ay,
                FIELD.LEFT, ay + 15,
                FIELD.LEFT + 10, ay
            );
        }
        // Bottom side arrows (going right →)
        for (var bx = FIELD.LEFT + 60; bx < FIELD.RIGHT - 20; bx += 80) {
            arrowG.fillTriangle(
                bx, FIELD.BOTTOM - 10,
                bx + 15, FIELD.BOTTOM,
                bx, FIELD.BOTTOM + 10
            );
        }
        // Right side arrows (going up ↑)
        for (var by = FIELD.BOTTOM - 40; by > FIELD.TOP + 20; by -= 80) {
            arrowG.fillTriangle(
                FIELD.RIGHT - 10, by,
                FIELD.RIGHT, by - 15,
                FIELD.RIGHT + 10, by
            );
        }
        
        // Spawn point indicator at 12 o'clock (top center)
        this._createSpawnPointIndicator();
        
        // Center area label
        var centerLabel = this.add.text(FIELD.CENTER_X, FIELD.CENTER_Y, '🏰', {
            fontSize: '38px',
        }).setOrigin(0.5).setAlpha(0.15);
        
        // ── 배치 불가 구역: 경로 바깥쪽 ──
        this._createForbiddenZone(W, H, outerLeft, outerTop, outerRight, outerBottom);
    },
    
    _createForbiddenZone: function(W, H, outerLeft, outerTop, outerRight, outerBottom) {
        // 경로 바깥 4개 코너 영역 = 배치 불가 (빨간 빗금)
        var fz = this.add.graphics();
        fz.setDepth(3);
        
        // 바깥 전체를 어두운 붉은 오버레이로
        fz.fillStyle(0x220000, 0.35);
        // 위쪽 바깥
        fz.fillRect(0, 36, W, outerTop - 36);
        // 아래쪽 바깥
        fz.fillRect(0, outerBottom, W, H - outerBottom);
        // 왼쪽 바깥
        fz.fillRect(0, outerTop, outerLeft, outerBottom - outerTop);
        // 오른쪽 바깥
        fz.fillRect(outerRight, outerTop, W - outerRight, outerBottom - outerTop);
        
        // 빗금 패턴 (대각선)
        var hatch = this.add.graphics();
        hatch.setDepth(4);
        hatch.lineStyle(1, 0xFF2222, 0.07);
        
        var step = 20;
        // 위쪽
        for (var i = 0; i < W; i += step) {
            hatch.lineBetween(i, 36, i + (outerTop - 36), outerTop);
        }
        // 아래쪽
        for (var i = 0; i < W; i += step) {
            hatch.lineBetween(i, outerBottom, i + (H - outerBottom), H);
        }
        // 왼쪽
        for (var i = outerTop; i < outerBottom; i += step) {
            hatch.lineBetween(0, i, outerLeft, i + outerLeft);
        }
        // 오른쪽
        for (var i = outerTop; i < outerBottom; i += step) {
            hatch.lineBetween(outerRight, i, W, i + (W - outerRight));
        }
        

    },
    
    _createSpawnPointIndicator: function() {
        var FIELD = Game.Config.FIELD;
        var spawnX = FIELD.SPAWN_X;
        var spawnY = FIELD.SPAWN_Y;
        
        // Spawn portal - glowing circle with animation
        var portalOuter = this.add.graphics();
        portalOuter.setPosition(spawnX, spawnY);
        portalOuter.lineStyle(3, 0xFF4444, 0.8);
        portalOuter.strokeCircle(0, 0, 22);
        portalOuter.fillStyle(0xFF4444, 0.15);
        portalOuter.fillCircle(0, 0, 22);
        portalOuter.setDepth(15);
        
        // Inner ring
        var portalInner = this.add.graphics();
        portalInner.setPosition(spawnX, spawnY);
        portalInner.lineStyle(2, 0xFFAA44, 0.9);
        portalInner.strokeCircle(0, 0, 14);
        portalInner.fillStyle(0xFF6644, 0.3);
        portalInner.fillCircle(0, 0, 14);
        portalInner.setDepth(15);
        
        // Core
        var portalCore = this.add.graphics();
        portalCore.setPosition(spawnX, spawnY);
        portalCore.fillStyle(0xFFDD44, 0.7);
        portalCore.fillCircle(0, 0, 6);
        portalCore.setDepth(15);
        
        // Warning icon
        var spawnIcon = this.add.text(spawnX, spawnY - 35, '⚠ SPAWN', {
            fontSize: '10px',
            fontFamily: 'Oxanium',
            color: '#FF6644',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(16);
        
        // Pulse animation on outer ring
        this.tweens.add({
            targets: portalOuter,
            scaleX: 1.2,
            scaleY: 1.2,
            alpha: 0.4,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut'
        });

        // Rotation animation on inner ring
        this.tweens.add({
            targets: portalInner,
            angle: 360,
            duration: 3000,
            repeat: -1
        });

        // Blink spawn text
        this.tweens.add({
            targets: spawnIcon,
            alpha: 0.3,
            duration: 800,
            yoyo: true,
            repeat: -1
        });
    },

    _computeTowerSlots: function() {
        var FIELD    = Game.Config.FIELD;
        var halfPath = FIELD.PATH_WIDTH / 2;

        // ── 11×11 고정 그리드 파라미터 ──
        var innerL = FIELD.LEFT   + halfPath;  // 438
        var innerR = FIELD.RIGHT  - halfPath;  // 842
        var innerT = FIELD.TOP    + halfPath;  // 118
        var innerB = FIELD.BOTTOM - halfPath;  // 522

        var COLS     = 11;
        var ROWS     = 11;
        var slotSize = Game.Config.TOWER_PLACEMENT.SLOT_SIZE;  // 34px
        var margin   = Math.ceil(slotSize / 2);  // 17px — 경로 침범 방지

        var areaL = innerL + margin;   // 455
        var areaR = innerR - margin;   // 825
        var areaT = innerT + margin;   // 135
        var areaB = innerB - margin;   // 505

        var spacingX = Math.round((areaR - areaL) / (COLS - 1));  // 37
        var spacingY = Math.round((areaB - areaT) / (ROWS - 1));  // 37

        // ── 클램핑 경계: 타워 비주얼(16px)이 경로 안으로 들어가지 않는 최소 여백만 적용 ──
        // areaT/L/R/B(슬롯 중심 margin 기준)가 아닌 innerT/L/R/B + towerHalf 사용
        // → 스폰 방향 포함 모든 방향 동등하게 배치 가능
        var towerHalf = Math.ceil(Game.Config.TOWER.SIZE / 2);  // 8px
        this._towerAreaL = innerL + towerHalf;   // 438 + 8 = 446
        this._towerAreaR = innerR - towerHalf;   // 842 - 8 = 834
        this._towerAreaT = innerT + towerHalf;   // 118 + 8 = 126
        this._towerAreaB = innerB - towerHalf;   // 522 - 8 = 514

        // ── 존(Zone) 정의 ──
        // ring 0-1 = Zone 3 (바깥), ring 2-3 = Zone 2 (중간), ring 4-5 = Zone 1 (안쪽)
        this.zoneConfig = [
            { zone: 1, name: '안쪽',   nameEn: 'INNER',  color: 0xFFCC22, ringMin: 4, ringMax: 5 },
            { zone: 2, name: '중간',   nameEn: 'MIDDLE', color: 0x22CC66, ringMin: 2, ringMax: 3 },
            { zone: 3, name: '바깥',   nameEn: 'OUTER',  color: 0x4488FF, ringMin: 0, ringMax: 1 }
        ];

        var spawnX = FIELD.SPAWN_X;

        // ── 그리드 좌표 생성 (11×11 = 121슬롯 전체) ──
        var grid = [];
        for (var row = 0; row < ROWS; row++) {
            for (var col = 0; col < COLS; col++) {
                var gx = areaL + col * spacingX;
                var gy = areaT + row * spacingY;
                var ring = Math.min(col, row, COLS - 1 - col, ROWS - 1 - row);

                // zone 할당
                var zone = 3, zoneName = '바깥';
                if (ring >= 4) { 
                    if (col === 5 && row === 5) {
                        zone = 1.3;
                    } else if ((col === 4 || col === 6) && (row === 4 || row === 6)) {
                        zone = 1.1;
                    } else {
                        zone = 1.2;
                    }
                    zoneName = '안쪽'; 
                }
                else if (ring >= 2) { zone = 2; zoneName = '중간'; }

                // 정 중앙 (5,5) 1자리만 최대 10개, 나머지: 4개
                var maxCap = (col === 5 && row === 5) ? 10 : 4;
                // 경로 내부 가장자리까지 4방향 거리 사전 계산
                var distToPath = {
                    top:    gy - innerT,
                    bottom: innerB - gy,
                    left:   gx - innerL,
                    right:  innerR - gx
                };
                var minDist = Math.min(distToPath.top, distToPath.bottom, distToPath.left, distToPath.right);
                var isCorner = ((col === 4 || col === 6) && (row === 4 || row === 6)) ||
                               ((col === 2 || col === 8) && (row === 2 || row === 8)) ||
                               ((col === 0 || col === 10) && (row === 0 || row === 10));
                var cornerBonus = 0;
                if (isCorner) {
                    if (col <= 5 && row <= 5)      cornerBonus = 300; // 1순위: 11시 (Top-Left)
                    else if (col <= 5 && row > 5)  cornerBonus = 200; // 2순위: 7시 (Bottom-Left)
                    else if (col > 5 && row > 5)   cornerBonus = 100; // 3순위: 5시 (Bottom-Right, 우측 하단)
                    else                           cornerBonus = 10;  // 4순위: 1시 (Top-Right, 우측 상단)
                }
                grid.push({ col: col, row: row, x: gx, y: gy,
                            ring: ring, side: 'grid',
                            zone: zone, zoneName: zoneName, maxCapacity: maxCap,
                            isCorner: isCorner, cornerBonus: cornerBonus,
                            distToPath: distToPath, minDistToPath: minDist });
            }
        }

        // Zone 1(안쪽)과 Outer(Zone 2+3 통합 외곽) 구별 및 11시 기준 반시계 방향 정렬
        grid.sort(function(a, b) {
            var isAInner = Math.floor(a.zone) === 1;
            var isBInner = Math.floor(b.zone) === 1;
            
            // 1. Zone 1 (안쪽) 내부 구역 간 정렬 (1.1 -> 1.2 -> 1.3)
            if (isAInner && isBInner) {
                if (a.zone !== b.zone) return a.zone - b.zone;
            }
            
            // 2. Outer(Zone 2 & Zone 3 통합 외곽)와 Zone 1 구별 (외곽 통합 구역 -> 안쪽)
            if (isAInner !== isBInner) {
                return isAInner ? 1 : -1;
            }

            // 3. 통합 외곽 구역(Zone 2+3) 내에서는 11시 모서리 (0,0) 기준 반시계 방향 각도 정렬
            var startCol = isAInner ? 4 : 0;
            var startRow = isAInner ? 4 : 0;

            return _getAngleDiff(a.col, a.row, startCol, startRow) - _getAngleDiff(b.col, b.row, startCol, startRow);
        });

        function _getAngleDiff(col, row, sc, sr) {
            if (col === 5 && row === 5) return 0;
            var cx = 5, cy = 5;
            var targetAngle = Math.atan2(sr - cy, sc - cx);
            var currAngle = Math.atan2(row - cy, col - cx);
            
            // 반시계 방향: targetAngle에서 currAngle을 뺀 값이 0에서 2PI 사이클을 돌도록
            var diff = targetAngle - currAngle;
            while (diff < -0.001) diff += Math.PI * 2;
            while (diff >= Math.PI * 2 - 0.001) diff -= Math.PI * 2;
            return diff;
        }

        this.towerSlots = grid;
        this.slotOccupancy = this.towerSlots.map(function() { return 0; });

        // ── _독 타워 전용: Zone별 모서리 슬롯 사전 계산 ──
        // Zone 3 모서리 (경로~17px): (0,0),(0,10),(10,10),(10,0)
        // Zone 2 모서리 (경로~91px): (2,2),(2,8),(8,8),(8,2)
        // Zone 1 모서리 (경로~202px): (4,4),(4,6),(6,6),(6,4)
        var self = this;
        var POISON_CORNERS = {
            zone3: [{ col:0, row:0 }, { col:0, row:10 }, { col:10, row:10 }, { col:10, row:0 }],
            zone2: [{ col:2, row:2 }, { col:2, row:8 },  { col:8, row:8 },   { col:8, row:2 }],
            zone1: [{ col:4, row:4 }, { col:4, row:6 },  { col:6, row:6 },   { col:6, row:4 }]
        };

        function findSlotIdx(target) {
            for (var i = 0; i < self.towerSlots.length; i++) {
                if (self.towerSlots[i].col === target.col && self.towerSlots[i].row === target.row) return i;
            }
            return -1;
        }

        this._poisonCorners = {
            zone3: POISON_CORNERS.zone3.map(findSlotIdx),
            zone2: POISON_CORNERS.zone2.map(findSlotIdx),
            zone1: POISON_CORNERS.zone1.map(findSlotIdx)
        };
        this._poisonCornerNext = { zone3: 0, zone2: 0, zone1: 0 };
        console.log('[PoisonCorners] Zone3:', this._poisonCorners.zone3,
                    'Zone2:', this._poisonCorners.zone2,
                    'Zone1:', this._poisonCorners.zone1);

        var z1 = grid.filter(function(g){return Math.floor(g.zone)===1;}).length;
        var z2 = grid.filter(function(g){return g.zone===2;}).length;
        var z3 = grid.filter(function(g){return g.zone===3;}).length;
        console.log('[TowerSlots] 11×11 | Zone1(안쪽)=' + z1 + ' Zone2(중간)=' + z2 + ' Zone3(바깥)=' + z3
            + ' | spacingX=' + spacingX + 'px');

        // ── 존 경계 시각화 ──
        this.slotGraphics = this.add.graphics();
        this.slotGraphics.setDepth(5);
        this._drawZoneBorders(areaL, areaT, spacingX, spacingY, COLS, ROWS);
        this._drawAvailableSlots();

        // ── 중앙 (5,5) 슬롯 카운터 텍스트 ──
        this._centerSlotIdx = -1;
        for (var cs = 0; cs < this.towerSlots.length; cs++) {
            if (this.towerSlots[cs].col === 5 && this.towerSlots[cs].row === 5) {
                this._centerSlotIdx = cs;
                break;
            }
        }
        if (this._centerSlotIdx >= 0) {
            var cSlot = this.towerSlots[this._centerSlotIdx];
            this._centerCountText = this.add.text(cSlot.x, cSlot.y - 20, '', {
                fontSize: '8px', fontFamily: 'Oxanium', color: '#FFD700',
                stroke: '#000', strokeThickness: 2
            }).setOrigin(0.5).setDepth(50);
            this._updateCenterCount();
        }
    },

    _drawZoneBorders: function(areaL, areaT, sx, sy, C, R) {
        // 존 경계선 및 라벨 (1회성 포개다 거낙)
        var zg = this.add.graphics().setDepth(6);
        var lt = this.add.group();  // 텍스트 그룹

        // Zone 3 (바깥) 경계: 전체 11×11 영역
        var z3L = areaL - sx/2 + 1,  z3T = areaT - sy/2 + 1;
        var z3W = sx * C - 2, z3H = sy * R - 2;
        zg.lineStyle(1.5, 0x4488FF, 0.35);
        zg.strokeRect(z3L, z3T, z3W, z3H);

        // Zone 2 (중간) 경계: 7×7 영역 (col 2~8, row 2~8)
        var z2L = areaL + 2*sx - sx/2 + 1,  z2T = areaT + 2*sy - sy/2 + 1;
        var z2W = sx * 7 - 2, z2H = sy * 7 - 2;
        zg.lineStyle(1.5, 0x22CC66, 0.45);
        zg.strokeRect(z2L, z2T, z2W, z2H);

        // Zone 1 (안쪽) 경계: 3×3 영역 (col 4~6, row 4~6)
        var z1L = areaL + 4*sx - sx/2 + 1,  z1T = areaT + 4*sy - sy/2 + 1;
        var z1W = sx * 3 - 2, z1H = sy * 3 - 2;
        zg.lineStyle(2, 0xFFCC22, 0.55);
        zg.strokeRect(z1L, z1T, z1W, z1H);

        // Zone 라벨 (좌상단 모서리)
        var lblStyle = function(col) {
            return { fontSize: '9px', fontFamily: 'Oxanium', color: col, stroke: '#000000', strokeThickness: 2 };
        };
        this.add.text(z3L + 3, z3T + 2, 'ZONE 3  바깥', lblStyle('#4499FF')).setDepth(7).setAlpha(0.7);
        this.add.text(z2L + 3, z2T + 2, 'ZONE 2  중간', lblStyle('#44EE88')).setDepth(7).setAlpha(0.7);
        this.add.text(z1L + 3, z1T + 2, 'ZONE 1  안쪽', lblStyle('#FFDD44')).setDepth(7).setAlpha(0.7);
    },

    _drawAvailableSlots: function() {
        this.slotGraphics.clear();
        var slotSize = Game.Config.TOWER_PLACEMENT.SLOT_SIZE;
        var half = slotSize / 2;
        var ZONE_COLOR = { 1: 0xFFCC22, 2: 0x22CC66, 3: 0x4488FF };

        var nextIdx = -1;
        for (var k = 0; k < this.towerSlots.length; k++) {
            var cap_k = this.towerSlots[k].maxCapacity || 4;
            if ((this.slotOccupancy[k] || 0) < cap_k) { nextIdx = k; break; }
        }
        var nextRing = (nextIdx >= 0 && this.towerSlots[nextIdx]) ? this.towerSlots[nextIdx].ring : -1;

        for (var i = 0; i < this.towerSlots.length; i++) {
            var occ = this.slotOccupancy[i] || 0;
            var slotCap = this.towerSlots[i].maxCapacity || 4;
            if (occ >= slotCap) continue;

            var slot   = this.towerSlots[i];
            var zColor = ZONE_COLOR[slot.zone] || 0xAAAAAA;
            var dColor = occ > 0 ? 0xFFAA22 : zColor;

            if (i === nextIdx) {
                this.slotGraphics.fillStyle(dColor, occ > 0 ? 0.15 : 0.20);
                this.slotGraphics.fillRect(slot.x - half, slot.y - half, slotSize, slotSize);
                this.slotGraphics.lineStyle(1.5, dColor, 0.8);
                this.slotGraphics.strokeRect(slot.x - half, slot.y - half, slotSize, slotSize);
            } else if (slot.ring === nextRing) {
                this.slotGraphics.lineStyle(1, dColor, 0.35);
                this.slotGraphics.strokeRect(slot.x - half, slot.y - half, slotSize, slotSize);
            } else {
                this.slotGraphics.lineStyle(1, zColor, 0.10);
                this.slotGraphics.strokeRect(slot.x - half, slot.y - half, slotSize, slotSize);
            }
        }
        this._updateCenterCount();
    },

    _updateCenterCount: function() {
        if (this._centerSlotIdx < 0 || !this._centerCountText) return;
        var occ = this.slotOccupancy[this._centerSlotIdx] || 0;
        var cap = this.towerSlots[this._centerSlotIdx].maxCapacity || 4;
        this._centerCountText.setText('⚙ ' + occ + ' / ' + cap);
        this._centerCountText.setColor(occ >= cap ? '#FF4444' : '#FFD700');
    },

    // ── 경로 커버리지 계산: 슬롯에서 사정거리로 닿는 경로 총 길이 ──
    // 4벽면(상하좌우)에 대해 range원과 경로의 교차 길이를 합산
    _calcPathCoverage: function(slot, range) {
        var d = slot.distToPath;
        //                  상단(←1번째)  하단(→3번째)  좌측(↓2번째)  우측(↑4번째)
        var dists   = [d.top,   d.bottom, d.left,  d.right];
        var weights = [1.3,     1.1,      1.2,     1.0];  // 경로 초반 가중치
        var total = 0;
        var wallLen = 404;  // 경로 내부 벽면 길이 (innerR-innerL ≈ innerB-innerT)

        for (var i = 0; i < 4; i++) {
            var dist = dists[i];
            if (dist > 0 && range > dist) {
                // range원과 벽면의 교차 길이 = 2 × √(range² - dist²)
                var cover = 2 * Math.sqrt(range * range - dist * dist);
                total += Math.min(cover, wallLen) * weights[i];
            }
        }
        return total;
    },

    _createUI: function() {
        // HUD
        this.hud = new Game.HUD(this);
        
        // Inventory
        this.inventory = new Game.Inventory(this);
        
        // Gacha UI
        var gachaX = 50;
        var gachaY = Game.Config.HEIGHT - Game.Config.INVENTORY.PANEL_HEIGHT - 40;
        this.gachaUI = new Game.GachaUI(this, gachaX, gachaY);
        this.gachaUI.setDepth(95);

        // DPS MODE: 가챠 비활성화 + 골드 0 (GachaUI 생성 직후 즉시 적용)
        if (this.dpsMode) {
            this.gachaUI.setVisible(false);
            if (this.gachaUI.autoGachaTimer) {
                this.gachaUI.autoGachaTimer.remove();
                this.gachaUI.autoGachaTimer = null;
            }
            this.gachaUI.autoGacha = false;
            Game.EconomySystem._gold = 0;
            if (Game.EconomySystem._onGoldChange) Game.EconomySystem._onGoldChange(0);
        }

        // 골드 로그 패널 (화면 좌상단)
        Game.GoldLog.reset();
        this.goldLogPanel = new Game.GoldLogPanel(this);
        if (!this.dpsMode) {
            Game.GoldLog.add(Game.Config.INITIAL_GOLD, '시작 골드', '#FFD700');
        }
        
        // DPS 미터 UI 패널
        if (Game.DPSMeterUI) {
            this.dpsMeterUI = new Game.DPSMeterUI(this);
        }

        // Type effectiveness legend (top-right area)
        this._createLegend();

        // 게임 로그 패널
        this._createGameLog();
    },
    
    _createGameLog: function() {
        // 필드 오른쪽(878) ~ 레전드 왼쪽(1105) 사이
        var logX = 882;
        var logW = 218;
        var lineH = 24;

        // ── 상단: 일반 이벤트 로그 (10줄) ──
        var topY      = 45;
        var topLines  = 10;
        var topH      = topLines * lineH + 28;

        var topBg = this.add.graphics();
        topBg.fillStyle(0x05050f, 0.88);
        topBg.fillRoundedRect(logX - 4, topY - 4, logW + 8, topH, 6);
        topBg.lineStyle(1, 0x2a2a5e, 0.7);
        topBg.strokeRoundedRect(logX - 4, topY - 4, logW + 8, topH, 6);
        topBg.setDepth(80);

        var topTitleBg = this.add.graphics();
        topTitleBg.fillStyle(0x111133, 1);
        topTitleBg.fillRoundedRect(logX - 4, topY - 4, logW + 8, 24, 6);
        topTitleBg.setDepth(81);

        this.add.text(logX + logW / 2, topY + 4, 'EVENT LOG', {
            fontSize: '15px', fontFamily: 'Oxanium', color: '#4466AA', fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(82);

        this._logLines   = [];
        this._logData    = [];
        this._logMaxLines = topLines;
        for (var i = 0; i < topLines; i++) {
            var lt = this.add.text(logX, topY + 28 + i * lineH, '', {
                fontSize: '12px', fontFamily: 'Oxanium',
                color: '#888888', wordWrap: { width: logW - 4 }
            }).setDepth(82);
            this._logLines.push(lt);
        }

        // ── 하단: 라운드 정보 로그 (6줄) ──
        var botY      = topY + topH + 8;
        var botLines  = 6;
        var botH      = botLines * lineH + 28;

        var botBg = this.add.graphics();
        botBg.fillStyle(0x05050f, 0.88);
        botBg.fillRoundedRect(logX - 4, botY - 4, logW + 8, botH, 6);
        botBg.lineStyle(1, 0x1a3a2a, 0.7);
        botBg.strokeRoundedRect(logX - 4, botY - 4, logW + 8, botH, 6);
        botBg.setDepth(80);

        var botTitleBg = this.add.graphics();
        botTitleBg.fillStyle(0x0a1f15, 1);
        botTitleBg.fillRoundedRect(logX - 4, botY - 4, logW + 8, 24, 6);
        botTitleBg.setDepth(81);

        this.add.text(logX + logW / 2, botY + 4, 'ROUND LOG', {
            fontSize: '15px', fontFamily: 'Oxanium', color: '#44AA66', fontStyle: 'bold'
        }).setOrigin(0.5, 0).setDepth(82);

        this._roundLogLines   = [];
        this._roundLogData    = [];
        this._roundLogMaxLines = botLines;
        for (var j = 0; j < botLines; j++) {
            var rl = this.add.text(logX, botY + 28 + j * lineH, '', {
                fontSize: '12px', fontFamily: 'Oxanium',
                color: '#888888', wordWrap: { width: logW - 4 }
            }).setDepth(82);
            this._roundLogLines.push(rl);
        }
    },

    // 상단: 일반 이벤트 로그
    addGameLog: function(msg, color) {
        if (!this._logLines) return;
        color = color || '#AAAAAA';
        this._logData.push({ msg: msg, color: color });
        if (this._logData.length > this._logMaxLines) this._logData.shift();
        for (var i = 0; i < this._logLines.length; i++) {
            if (i < this._logData.length) {
                this._logLines[i].setText(this._logData[i].msg).setColor(this._logData[i].color);
            } else {
                this._logLines[i].setText('');
            }
        }
    },

    // 하단: 라운드 정보 로그
    addRoundLog: function(msg, color) {
        if (!this._roundLogLines) return;
        color = color || '#AAAAAA';
        this._roundLogData.push({ msg: msg, color: color });
        if (this._roundLogData.length > this._roundLogMaxLines) this._roundLogData.shift();
        for (var i = 0; i < this._roundLogLines.length; i++) {
            if (i < this._roundLogData.length) {
                this._roundLogLines[i].setText(this._roundLogData[i].msg).setColor(this._roundLogData[i].color);
            } else {
                this._roundLogLines[i].setText('');
            }
        }
    },

    _createLegend: function() {
        var W = Game.Config.WIDTH;
        var legendX = W - 170;
        var legendY = 45;
        
        var legendBg = this.add.graphics();
        legendBg.fillStyle(0x0a0a0f, 0.85);
        legendBg.fillRoundedRect(legendX - 5, legendY - 5, 165, 135, 4);
        legendBg.lineStyle(1, 0x2a2a4e, 0.5);
        legendBg.strokeRoundedRect(legendX - 5, legendY - 5, 165, 135, 4);
        legendBg.setDepth(80);
        
        var items = [
            { type: 'normal',    label: '일반', color: '#FFFFFF', desc: '균등' },
            { type: 'explosive', label: '폭발', color: '#FF4444', desc: '대형↑ 소형↓' },
            { type: 'vibration', label: '진동', color: '#44FF44', desc: '소형↑ 대형↓' }
        ];
        
        for (var i = 0; i < items.length; i++) {
            var iy = legendY + 10 + i * 40;
            
            var dot = this.add.graphics();
            dot.fillStyle(parseInt(items[i].color.replace('#', '0x')), 1);
            
            if (items[i].type === 'normal') {
                var cx = legendX + 10, cy = iy + 4, outR = 7, inR = 3.5, rot = -Math.PI / 2, step = Math.PI / 5;
                dot.beginPath();
                for (var j = 0; j < 10; j++) {
                    var r = (j % 2 === 0) ? outR : inR;
                    dot.lineTo(cx + Math.cos(rot) * r, cy + Math.sin(rot) * r);
                    rot += step;
                }
                dot.closePath();
                dot.fillPath();
            } else if (items[i].type === 'explosive') {
                dot.fillTriangle(legendX + 10, iy - 4, legendX + 3, iy + 10, legendX + 17, iy + 10);
            } else { // vibration
                dot.fillCircle(legendX + 10, iy + 4, 7);
            }
            dot.setDepth(81);
            
            var text = this.add.text(legendX + 26, iy - 4, items[i].label, {
                fontSize: '14px',
                fontFamily: 'Oxanium',
                color: items[i].color
            }).setDepth(81);
            
            var desc = this.add.text(legendX + 70, iy - 2, items[i].desc, {
                fontSize: '12px',
                fontFamily: 'Oxanium',
                color: '#666666'
            }).setDepth(81);
        }

        // ── 플레이 타이머 시작 시간 ──
        this._playStartTime = Date.now();
    },
    
    _setupEvents: function() {
        var self = this;

        // ── 씬 재시작 시 이전 리스너 누적 방지 ──
        var customEvents = [
            'waveStart', 'spawnMonster', 'monsterKilled',
            'bossTimeOut', 'bossTimerTick',
            'waveComplete', 'gameVictory', 'speedChanged', 'gachaResult',
            'gachaRollback', 'addGoldReward'
        ];
        for (var ei = 0; ei < customEvents.length; ei++) {
            this.events.off(customEvents[ei]);
        }
        
        // Wave started
        this.events.on('waveStart', function(round, waveData, mult, scaledCount, scaledHp, baseHp) {
            // ── DPS MODE: 전용 표시 ──
            if (self.dpsMode) {
                self.hud.updateRound('DPS');
                self.hud.setWaveActive(true);
                var opts = self._dpsOptions || { normal: ['general','small','large'], boss: [] };
                var typeLabel = { general:'일반', small:'소형', large:'대형',
                                  boss_normal:'보스_일반', boss_small:'보스_소형', boss_large:'보스_대형' };

                // 데이터 테이블에서 타입별 count 조회
                var dpsCfg = null;
                try { var raw = localStorage.getItem('rtd_dpsModeData'); if (raw) dpsCfg = JSON.parse(raw); } catch(e){}
                if (!dpsCfg && Game.DpsModeData) dpsCfg = Game.DpsModeData;
                var tcMap = {};
                if (dpsCfg && dpsCfg.types) {
                    dpsCfg.types.forEach(function(t) { tcMap[t.type] = t.count || 10; });
                }

                // 일반 구간 로그
                if (opts.normal && opts.normal.length > 0) {
                    var totalNormal = 0;
                    opts.normal.forEach(function(t) { totalNormal += (tcMap[t] || 10); });
                    var normalHpStr = (scaledHp !== undefined && scaledHp < Number.MAX_SAFE_INTEGER) ? ' (HP: ' + scaledHp.toLocaleString() + ' ×' + (opts.normalHpMultiplier || 1) + ')' : '';
                    self.addRoundLog('[DPS MODE] 일반 ' + totalNormal + '마리' + normalHpStr, '#00AAFF');
                    var normalStr = opts.normal.map(function(t) {
                        return (typeLabel[t] || t) + '×' + (tcMap[t] || 10);
                    }).join(' → ');
                    self.addRoundLog('  ' + normalStr, '#6699CC');
                }
                // 보스 구간 로그
                if (opts.boss && opts.boss.length > 0) {
                    self.addRoundLog('[DPS MODE] 보스 ' + opts.boss.length + '종 (×' + (opts.bossHpMultiplier || 1) + ')', '#FF9900');
                    var bossStr = opts.boss.map(function(t) { return typeLabel[t] || t; }).join(' → ');
                    self.addRoundLog('  ' + bossStr, '#FF6644');
                }
                // 타워 구성 로그
                if (opts.towerTypes && opts.towerTiers) {
                    var tCount = opts.towerTypes.length * opts.towerTiers.length * (opts.towerMultiplier || 1);
                    self.addRoundLog('[타워] ' + tCount + '개 배치 (X' + (opts.towerMultiplier || 1) + ')', '#FFD700');
                }
                // 리스폰 안내
                self.addRoundLog('♻ 리스폰 활성 (사망 시 자동 보충)', '#00CC66');
                self.addGameLog('📊 DPS MODE 측정 시작', '#00AAFF');
                return;
            }

            self.hud.updateRound(round);
            self.hud.setWaveActive(true);

            // 경과 시간 계산
            var elapsed = self._playStartTime ? Math.floor((Date.now() - self._playStartTime) / 1000) : 0;
            var mm = Math.floor(elapsed / 60);
            var ss = elapsed % 60;
            var timeStr = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;

            if (Game.WaveData.isBossRound(round)) {
                var bossHpStr = (scaledHp !== undefined && baseHp !== undefined)
                                ? scaledHp + '<' + baseHp + '>'
                                : (scaledHp !== undefined ? scaledHp : '?');
                self.addRoundLog('["' + timeStr + '"] BOSS R' + round, '#FF4444');
                self.addRoundLog('  HP ' + bossHpStr, '#FF8844');
                self.addGameLog('=== BOSS WAVE ' + round + ' ===', '#FF4444');
                self.hud.showBossWarning();
            } else {
                var cnt   = scaledCount || waveData.count || '?';
                var hpStr = (scaledHp !== undefined && baseHp !== undefined)
                            ? scaledHp + '<' + baseHp + '>'
                            : (scaledHp !== undefined ? scaledHp : '?');
                self.addRoundLog('[' + timeStr + '] R' + round + ' 시작', '#4488FF');
                self.addRoundLog('  수량 ' + cnt + ' | HP ' + hpStr, '#6699CC');
            }

            // 제한 시간이 있는 경우 보스 타이머 표시
            var tl = waveData.timeLimit || 0;
            if (tl > 0) {
                self.hud.showBossTimer(tl, waveData.timeAttack);
                if (waveData.timeAttack) {
                    self.addRoundLog('  ⏱ ' + tl + '초 이내 처치 필요! (실패 시 게임오버)', '#FF8844');
                } else {
                    self.addRoundLog('  ⏱ ' + tl + '초 제한 시간! (초과 시 다음 라운드 진행)', '#FFAA44');
                }
            }
        });
        
        // Monster spawn
        this.events.on('spawnMonster', function(data) {
            self._spawnMonster(data);
        });
        
        // Monster killed
        this.events.on('monsterKilled', function(monster) {
            self._removeMonster(monster);
            if (monster.isBoss) {
                self.waveSystem.onBossKilled();
                self.hud.hideBossTimer();
                self.addGameLog('★ BOSS 처치! +' + Math.floor(monster.goldReward) + 'G', '#FFD700');
                Game.GoldLog.add(monster.goldReward, 'R' + self.waveSystem.currentRound + ' 보스 처치', '#FFD700');
            } else {
                self.waveSystem.onMonsterKilled();
                // 마리당 골드 로그 (매 10히트 1회로 간소화)
                if (((self.waveSystem._logKillCount = (self.waveSystem._logKillCount||0)+1) % 10) === 0) {
                    var roundGold = monster.goldReward * self.waveSystem.totalMonstersInWave;
                    Game.GoldLog.add(Math.round(roundGold), 'R'+self.waveSystem.currentRound+' 킬(웨이브)', '#88FF88');
                }
            }
            // DPS MODE: 리스폰 트리거
            if (self.dpsMode && self.waveSystem._dpsRespawn) {
                self.waveSystem._dpsRespawn(monster.monsterType, monster.isBoss);
            }
            // DPS MODE에서는 골드 미지급
            if (!self.dpsMode) {
                Game.EconomySystem.addGold(monster.goldReward);
                self.totalGoldEarned += monster.goldReward;
            }
            self._updateMonsterCount();
        });

        
        // 보스 타임아웃 → 게임 오버 (DPS MODE 제외)
        this.events.on('bossTimeOut', function() {
            if (!self.dpsMode) self._gameOver(false);
        });
        
        // 보스 타이머 tick → HUD 업데이트
        this.events.on('bossTimerTick', function(seconds) {
            self.hud.updateBossTimer(seconds);
        });
        
        // Wave complete
        this.events.on('waveComplete', function(round, bonus, clearBonus) {
            self.hud.setWaveActive(false);
            self.hud.showWaveComplete(round, bonus);
            self.totalGoldEarned += bonus;
            self.waveSystem._logKillCount = 0;   // 킬 카운터 리셋
            if (clearBonus && clearBonus > 0) {
                self.totalGoldEarned += clearBonus;
                self.addRoundLog('  클리어 +' + Math.floor(bonus) + 'G  🏆 보너스 +' + clearBonus + 'G', '#44FF88');
                self.addGameLog('R' + round + ' 클리어 +' + Math.floor(bonus) + 'G  🏆+' + clearBonus + 'G', '#44FF88');
                Game.GoldLog.add(Math.floor(bonus), 'R' + round + ' 클리어', '#44FF88');
                Game.GoldLog.add(clearBonus, 'R' + round + ' 클리보너스', '#AAFFDD');
            } else {
                self.addRoundLog('  완료 +' + Math.floor(bonus) + 'G', '#44FF88');
                self.addGameLog('R' + round + ' 클리어 +' + Math.floor(bonus) + 'G', '#44FF88');
                Game.GoldLog.add(Math.floor(bonus), 'R' + round + ' 클리어', '#44FF88');
            }
        });
        
        // Game victory
        this.events.on('gameVictory', function() {
            self._gameOver(true);
        });
        
        // Speed change
        this.events.on('speedChanged', function(multiplier) {
            self.speedMultiplier = multiplier;
            self.time.timeScale = multiplier; // 타이머 이벤트(스폰 등) 배속 적용
            Game.DamageTextPool.setThrottle(multiplier);
        });
        
        // Gacha result - auto-place tower
        this.events.on('gachaResult', function(unit) {
            self._autoPlaceTower(unit);
            self.inventory.addUnit(unit);
            var tierNames = { normal:'일반', rare:'레어', ancient:'고대', relic:'유물', saga:'서사', legend:'전설', epic:'에픽', myth:'신화', primordial:'태초' };
            var tierColors = { normal:'#AAAAAA', rare:'#228B22', ancient:'#9900CC', relic:'#FF7F00', saga:'#C0C0C0', legend:'#FFE000', epic:'#40E0D0', myth:'#FF3300', primordial:'#00FFFF' };
            var tName = tierNames[unit.tier] || unit.tier;
            var tColor = tierColors[unit.tier] || '#FFFFFF';
            self.addGameLog('[' + tName + '] ' + unit.name + ' 획득', tColor);
        });

        // ── 앵벌이 스킬: N회 공격 골드 보상 ──
        this.events.on('addGoldReward', function(amount, towerX, towerY) {
            // 1. 골드 지급
            Game.EconomySystem.addGold(amount);

            // 2. GoldLog 기록
            if (Game.GoldLog) {
                Game.GoldLog.add(amount, '앵벌이', '#FFD700');
            }

            // 3. 플로팅 골드 텍스트 (타워 위치에서 떠오르며 페이드)
            var label   = '+' + amount + 'G';
            var fx      = towerX + (Math.random() * 14 - 7);
            var fy      = towerY - 20;
            var gText   = self.add.text(fx, fy, label, {
                fontSize: '16px',          // 기존 13px → 120% = 16px
                fontFamily: 'Oxanium',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#5A2A00',
                strokeThickness: 3
            }).setOrigin(0.5).setDepth(300);

            // 팝업 확대 → 상승 + 페이드 아웃 (총 2.5초)
            self.tweens.add({
                targets: gText,
                scaleX: 1.35, scaleY: 1.35,
                duration: 100,
                ease: 'Power2',
                onComplete: function() {
                    self.tweens.add({
                        targets: gText,
                        y: fy - 35,        // 속도 50% 감소 (70 → 35px)
                        alpha: 0,
                        scaleX: 0.9, scaleY: 0.9,
                        duration: 2400,    // 기존 680ms → 2400ms (팝업 100ms 포함 총 2.5초)
                        ease: 'Power1',
                        onComplete: function() { gText.destroy(); }
                    });
                }
            });
        });
    },
    
    _spawnMonster: function(data) {
        var FIELD = Game.Config.FIELD;
        
        // Spawn at 12 o'clock (top center)
        var spawnX = FIELD.SPAWN_X;
        var spawnY = FIELD.SPAWN_Y;
        
        // Get CCW waypoints
        var waypoints = FIELD.getWaypoints();
        
        var monster = Game.MonsterPool.acquire(spawnX, spawnY, {
            monsterId: data.id,
            type: data.type,
            hp: data.hp,
            speed: data.speed,
            goldReward: data.goldReward,
            isBoss: data.isBoss,
            imagePath: data.imagePath || '',
            waypoints: waypoints
        });
        
        // 보스: depth 85 (일반 몬스터 20·타워 30~40 위, UI 패널 90+ 아래) → HP 게이지 항상 최우선 표시
        monster.setDepth(monster.isBoss ? 85 : 20);
        this.monsters.push(monster);
        
        // Spawn animation
        monster.setAlpha(0);
        monster.setScale(0.5);
        this.tweens.add({
            targets: monster,
            alpha: 1,
            scaleX: 1,
            scaleY: 1,
            duration: 300
        });
        
        // Update monster count and check game over
        this._updateMonsterCount();
    },

    
    _removeMonster: function(monster) {
        var idx = this.monsters.indexOf(monster);
        if (idx !== -1) {
            this.monsters.splice(idx, 1);
        }
    },
    
    _updateMonsterCount: function() {
        var activeCount = 0;
        for (var i = 0; i < this.monsters.length; i++) {
            if (this.monsters[i].active && this.monsters[i].hp > 0) {
                activeCount++;
            }
        }

        // 변경된 경우에만 HUD·EconomySystem 업데이트
        if (activeCount === this._lastActiveCount) return;
        var prevCount = this._lastActiveCount;
        this._lastActiveCount = activeCount;

        // 목숨감소 로그
        if (prevCount >= 0 && activeCount > prevCount) {
            var lives = Game.Config.MAX_MONSTERS - activeCount;
            // 5이하: 매번 / 6이상: 정확히 10의 배수 시점(50,40,30,20,10)만 + 10초 쿨다운
            var shouldLog = lives <= 5 ? true : (lives % 10 === 0);
            if (shouldLog && lives > 5) {
                var now = Date.now();
                if (!this._lastLivesLogTime) this._lastLivesLogTime = {};
                var lastTime = this._lastLivesLogTime[lives] || 0;
                if (now - lastTime < 10000) shouldLog = false; // 10초 쿨다운
                else this._lastLivesLogTime[lives] = now;
            }
            if (shouldLog) {
                var color = lives <= 5 ? '#FF2222' : '#FF4444';
                this.addGameLog('\u2665 도달! 생명력 ' + lives, color);
            }
        }

        // Monster count update has been moved to play timer

        // Update lives (lives = MAX_MONSTERS - monsterCount)
        var isOver = Game.EconomySystem.updateLivesFromMonsterCount(activeCount);

        // Check game over (30 monsters on field) — DPS MODE에서는 게임 오버 없음
        if (isOver && !this.isGameOver && !this.dpsMode) {
            this._gameOver(false);
        }
    },
    
    _autoPlaceTower: function(unitData) {
        // MAX_PER_SLOT: 슬롯별 maxCapacity 사용 (정 중앙 2×2 = 30, 나머지 = 4)
        var slotIndex = -1;
        var placedZone = -1;


        // ── 1단계: 유효 커버리지 기반 최적 슬롯 탐색 ─────────
        if (slotIndex === -1) {
            var range = unitData.range || 120;
            var bestScore = -1;
            var bestIdx = -1;

            for (var si = 0; si < this.towerSlots.length; si++) {
                var slot = this.towerSlots[si];
                var cap = slot.maxCapacity || 4;
                var occ = this.slotOccupancy[si] || 0;
                if (occ >= cap) continue;

                // 사정거리가 경로에 닿지 않는 슬롯 제외
                if (range <= slot.minDistToPath) continue;

                // 유효 경로 커버리지 계산 (4벽면)
                var coverage = this._calcPathCoverage(slot, range);
                if (coverage <= 0) continue;

                // 점수 = 커버리지 - 분산 패널티 + 보너스
                var isCenter = (slot.col === 5 && slot.row === 5);
                var isCorner = slot.isCorner || false;
                var penalty  = (isCenter || isCorner) ? 0 : (occ * 20);
                var bonus    = isCenter ? 5 : (slot.cornerBonus || 0);
                var score    = coverage - penalty + bonus;

                if (score > bestScore) {
                    bestScore = score;
                    bestIdx = si;
                }
            }

            if (bestIdx >= 0) {
                slotIndex = bestIdx;
                placedZone = this.towerSlots[bestIdx].zone;
            }
        }

        // ── 2단계 (차선책 Fallback): 유효 커버리지 자리가 가득 찼을 때 ──
        // 환불 방지: 1순위 자리가 만석이면 경로까지 최단 거리(minDistToPath)가 가장 가까운 남은 빈 슬롯에 차선 배치
        if (slotIndex === -1) {
            var minPathDist = 999999;
            var fallbackIdx = -1;

            for (var fsi = 0; fsi < this.towerSlots.length; fsi++) {
                var fSlot = this.towerSlots[fsi];
                var fCap = fSlot.maxCapacity || 4;
                var fOcc = this.slotOccupancy[fsi] || 0;
                if (fOcc >= fCap) continue;

                // 경로까지 거리가 가장 가까운 빈 슬롯 선택 (동점시 점유수 적은 슬롯)
                var scoreDist = fSlot.minDistToPath + (fOcc * 10);
                if (scoreDist < minPathDist) {
                    minPathDist = scoreDist;
                    fallbackIdx = fsi;
                }
            }

            if (fallbackIdx >= 0) {
                slotIndex = fallbackIdx;
                placedZone = this.towerSlots[fallbackIdx].zone;
            }
        }

        if (slotIndex === -1) {
            // ── 전체 가득 참: 뽑기 롤백 ──
            Game.EconomySystem.addGold(Game.Config.GACHA_COST);
            this.events.emit('gachaRollback');
            if (!this._noSlotWarnCooldown) {
                this._showNoSlotWarning();
                this._noSlotWarnCooldown = true;
                var selfW = this;
                this.time.delayedCall(2000, function() { selfW._noSlotWarnCooldown = false; });
            }
            return;
        }

        var slot     = this.towerSlots[slotIndex];
        var occCount = this.slotOccupancy[slotIndex] || 0;

        // ── 2x2 사분면 배치 로직 (4개 최대) ──
        // 슬롯을 좌상/우상/좌하/우하 4등분, 각 사분면 중심에 ±15% 범위 내 랜덤 배치
        var slotSize = Game.Config.TOWER_PLACEMENT.SLOT_SIZE; // 34px
        var qOff   = slotSize * 0.25;        // 사분면 중심 오프셋 = 8.5px
        var jitter = slotSize * 0.075;       // ±15% 범위의 절반 = ±2.55px

        // occCount 0~3 순서로 사분면 할당
        var QUADS = [
            { x: -qOff, y: -qOff },  // 0: 좌상 (TL)
            { x:  qOff, y: -qOff },  // 1: 우상 (TR)
            { x: -qOff, y:  qOff },  // 2: 좌하 (BL)
            { x:  qOff, y:  qOff }   // 3: 우하 (BR)
        ];
        var quad = QUADS[occCount % 4];
        var dx = quad.x + (Math.random() * 2 - 1) * jitter;
        var dy = quad.y + (Math.random() * 2 - 1) * jitter;

        // 배치 좌표 (슬롯 중심 + 사분면 오프셋 + 랜덤 지터)
        var rawX = slot.x + dx;
        var rawY = slot.y + dy;

        // ── 경로 침범 방지 클램핑 ──
        var tX = Math.max(this._towerAreaL, Math.min(this._towerAreaR, rawX));
        var tY = Math.max(this._towerAreaT, Math.min(this._towerAreaB, rawY));

        // 타워 생성
        var tower = new Game.Tower(this, tX, tY, unitData);
        tower.placeOnGrid(slotIndex, occCount, tX, tY);
        tower.setDepth(30 + occCount);   // 같은 슬롯 내 나중 배치가 위에

        this.towers.push(tower);
        if (Game.DamageTracker) {
            Game.DamageTracker.registerTower(tower);
        }
        this.slotOccupancy[slotIndex] = occCount + 1;

        // HUD 등급 점수 갱신
        var totalGs = 0, gsCount = 0;
        this.towers.forEach(function(t) {
            var gs = (t.unitData && t.unitData.gradeScore) ? t.unitData.gradeScore : 0;
            if (gs > 0) { totalGs += gs; gsCount++; }
        });
        if (this.hud && this.hud.updateGradeScore) {
            this.hud.updateGradeScore(gsCount > 0 ? Math.round(totalGs / gsCount) : 0);
        }

        // 배치 애니메이션
        tower.setScale(0);
        tower.setAlpha(0);
        this.tweens.add({
            targets: tower,
            scaleX: 1,
            scaleY: 1,
            alpha: 1,
            duration: 300,
            ease: 'Back.easeOut'
        });

        // 배치 이펙트
        var effect = this.add.graphics();
        effect.setPosition(tX, tY);
        var tierColor = Game.Config.COLORS.TIER[unitData.tier] || 0xFFFFFF;
        effect.lineStyle(2, tierColor, 0.8);
        effect.strokeCircle(0, 0, 10);
        this.tweens.add({
            targets: effect,
            scaleX: 3,
            scaleY: 3,
            alpha: 0,
            duration: 400,
            onComplete: function() { effect.destroy(); }
        });

        // 슬롯 인디케이터 갱신
        this._drawAvailableSlots();
    },
    
    _showNoSlotWarning: function() {
        var warnText = this.add.text(Game.Config.WIDTH / 2, Game.Config.HEIGHT / 2 - 50, '배치 공간이 부족합니다!', {
            fontSize: '12px',
            fontFamily: 'Oxanium',
            color: '#FF4444',
            stroke: '#000000',
            strokeThickness: 2
        }).setOrigin(0.5).setDepth(200);
        
        this.tweens.add({
            targets: warnText,
            alpha: 0,
            y: warnText.y - 30,
            duration: 1200,
            onComplete: function() { warnText.destroy(); }
        });
    },
    
    _gameOver: function(victory) {
        if (this.isGameOver) return;
        this.isGameOver = true; // ── 중복 호출 즐단 (바로 설정) ──

        // ── 시뮬레이션 모드: 결과 기록 + 통계 오버레이 + 자동 재시작 ──
        if (this.devSimMode) {
            // ★ 최우선: 자동 재시작 보장 (아래 코드에서 에러가 나도 리로드는 반드시 실행)
            try {
                localStorage.setItem('rtd_simAutoRestart', '1');
                if (this.simId) {
                    localStorage.setItem('rtd_simAutoRestart_' + this.simId, '1');
                }
            } catch(e) {}
            var reloadTimer = window.setTimeout(function() {
                window.location.reload();
            }, 1500);

            // ── 데이터 수집 ──
            var currentRound = 0;
            try { currentRound = this.waveSystem ? this.waveSystem.getCurrentRound() : 0; } catch(e) {}
            var playTimeSec = this._playStartTime ? Math.floor((Date.now() - this._playStartTime) / 1000) : 0;
            var simStats = { total: 0, clears: 0, rate: 0, avgFail: 0, avgTime: 0, thisTime: playTimeSec,
                             avgGsClear: 0, avgGsFail: 0 };

            // ── 웨이브 시스템 정지 ──
            try { if (this.waveSystem) this.waveSystem.destroy(); } catch(e) {}

            // ── 결과 기록 + 통계 계산 ──
            try {
                var resultsKey = this.simResultsKey;
                var results = JSON.parse(localStorage.getItem(resultsKey) || '[]');
                var totalGradeScore = 0, towerCount = 0;
                if (this.towers) {
                    this.towers.forEach(function(t) {
                        var gs = (t.unitData && t.unitData.gradeScore) ? t.unitData.gradeScore : 0;
                        totalGradeScore += gs;
                        if (gs > 0) towerCount++;
                    });
                }
                var avgGradeScore = towerCount > 0 ? Math.round(totalGradeScore / towerCount) : 0;
                results.push({ win: victory, round: currentRound, ts: Date.now(), time: playTimeSec, gs: avgGradeScore });
                if (results.length > 9999) results = results.slice(-9999);
                localStorage.setItem(resultsKey, JSON.stringify(results));

                var wins  = results.filter(function(r){ return r.win; });
                var fails = results.filter(function(r){ return !r.win; });
                simStats.total  = results.length;
                simStats.clears = wins.length;
                simStats.rate   = Math.round(simStats.clears / simStats.total * 100);
                simStats.avgFail = fails.length > 0
                    ? Math.round(fails.reduce(function(a,r){ return a + r.round; }, 0) / fails.length) : 0;
                simStats.avgTime = Math.round(results.reduce(function(a,r){ return a + (r.time || 0); }, 0) / results.length);
                var winsWithGs  = wins.filter(function(r){ return r.gs > 0; });
                var failsWithGs = fails.filter(function(r){ return r.gs > 0; });
                simStats.avgGsClear = winsWithGs.length > 0
                    ? Math.round(winsWithGs.reduce(function(a,r){ return a + r.gs; }, 0) / winsWithGs.length) : 0;
                simStats.avgGsFail  = failsWithGs.length > 0
                    ? Math.round(failsWithGs.reduce(function(a,r){ return a + r.gs; }, 0) / failsWithGs.length) : 0;
            } catch(e) {
                console.error('[SimRecord] 기록 실패:', e);
            }

            // ── 결과 오버레이 (실패해도 리로드에 영향 없음) ──
            try {
                var fmtTime = function(sec) {
                    var m = Math.floor(sec / 60), s = sec % 60;
                    return (m < 10 ? '0' : '') + m + ':' + (s < 10 ? '0' : '') + s;
                };
                var W = Game.Config.WIDTH, H = Game.Config.HEIGHT;
                var ov = this.add.graphics().setDepth(500);
                ov.fillStyle(0x000000, 0.78);
                ov.fillRect(0, 0, W, H);

                var resultLabel = victory ? '✅  CLEAR' : '❌  FAIL  R' + currentRound;
                var resultColor = victory ? '#44FF44' : '#FF5533';
                this.add.text(W/2, H/2 - 55, resultLabel, {
                    fontSize: '28px', fontFamily: 'Oxanium',
                    color: resultColor, stroke: '#000000', strokeThickness: 4
                }).setOrigin(0.5).setDepth(501);

                this.add.text(W/2, H/2 + 4, [
                    '플레이 시간: ' + fmtTime(playTimeSec) + '  |  평균: ' + fmtTime(simStats.avgTime),
                    '누적 실행: ' + simStats.total + '회',
                    '클리어율: ' + simStats.rate + '%  (클리어 ' + simStats.clears + '회)',
                    '실패시 평균 도달 라운드: R' + (simStats.avgFail || '-'),
                    '클리어 평균 등급점수: ' + (simStats.avgGsClear || '-'),
                    '게임오버 평균 등급점수: ' + (simStats.avgGsFail || '-')
                ].join('\n'), {
                    fontSize: '13px', fontFamily: 'Oxanium',
                    color: '#CCCCCC', align: 'center',
                    lineSpacing: 6
                }).setOrigin(0.5).setDepth(501);
            } catch(e) {
                console.warn('[SimOverlay] 오버레이 표시 실패:', e);
            }

            // 화면 클릭 시 즉시 재시작
            try {
                this.input.once('pointerdown', function() {
                    window.location.reload();
                });
            } catch(e) {}

            return; // 일반 게임오버 UI 스킵
        }


        var self = this;
        var W = Game.Config.WIDTH;
        var H = Game.Config.HEIGHT;
        var currentRound = this.waveSystem ? this.waveSystem.getCurrentRound() : 0;

        // 웨이브 시스템 정지 (몬스터 리스폰 중단)
        if (this.waveSystem) this.waveSystem.destroy();


        // ── 플래시 ──
        var flash = this.add.graphics().setDepth(400);
        flash.fillStyle(victory ? 0xFFD700 : 0xFF0000, 0.4);
        flash.fillRect(0, 0, W, H);
        this.tweens.add({ targets: flash, alpha: 0, duration: 600,
            onComplete: function() { flash.destroy(); }
        });

        // 패널 파라미터
        var accentColor = victory ? 0xFFD700 : 0xFF2244;
        var accentStr   = victory ? '#FFD700' : '#FF2244';
        var panelW = 520, panelH = 310;
        var panelX = W / 2 - panelW / 2;
        var panelY = H / 2 - panelH / 2 - 20;

        // ── 반투명 배경 오버레이 ──
        var overlay = this.add.graphics().setDepth(450);
        overlay.fillStyle(0x000000, 0.72);
        overlay.fillRect(0, 0, W, H);
        overlay.setAlpha(0);

        // ── 패널 ──
        var panel = this.add.graphics().setDepth(451);
        panel.fillStyle(0x050510, 1);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 16);
        panel.lineStyle(3, accentColor, 1);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 16);
        panel.setAlpha(0);

        // 글로우
        var glow = this.add.graphics().setDepth(451);
        glow.lineStyle(8, accentColor, 0.25);
        glow.strokeRoundedRect(panelX - 4, panelY - 4, panelW + 8, panelH + 8, 20);
        glow.setAlpha(0);

        // ── 상단 배지 ──
        var badgeW = 180, badgeH = 36;
        var badge = this.add.graphics().setDepth(452);
        badge.fillStyle(accentColor, 1);
        badge.fillRoundedRect(W/2 - badgeW/2, panelY - 18, badgeW, badgeH, 10);
        badge.setAlpha(0);

        var badgeLabel = victory ? '✦  VICTORY  ✦' : '✦  GAME OVER  ✦';
        var badgeText = this.add.text(W/2, panelY, badgeLabel, {
            fontSize: '13px', fontFamily: 'Oxanium',
            color: victory ? '#000000' : '#FFFFFF',
            stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(453).setAlpha(0);

        // ── 메인 타이틀 ──
        var titleStr = victory ? 'CLEAR!' : 'DEFEAT';
        var titleText = this.add.text(W/2, panelY + 60, titleStr, {
            fontSize: '36px', fontFamily: 'Oxanium',
            color: accentStr, stroke: '#000000', strokeThickness: 5
        }).setOrigin(0.5).setDepth(452).setAlpha(0);

        // ── 스탯 줄 ──
        var elapsed = this._playStartTime ? Math.floor((Date.now() - this._playStartTime) / 1000) : 0;
        var mm = Math.floor(elapsed / 60), ss = elapsed % 60;
        var timeStr = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
        var statsStr = 'ROUND  ' + currentRound + '   |   GOLD  ' + Math.floor(this.totalGoldEarned) + 'G   |   TIME  ' + timeStr;
        var statsText = this.add.text(W/2, panelY + 120, statsStr, {
            fontSize: '10px', fontFamily: 'Oxanium',
            color: '#888888', stroke: '#000000', strokeThickness: 2
        }).setOrigin(0.5).setDepth(452).setAlpha(0);

        // ── 구분선 ──
        var divG = this.add.graphics().setDepth(452);
        divG.lineStyle(1, accentColor, 0.3);
        divG.lineBetween(panelX + 30, panelY + 148, panelX + panelW - 30, panelY + 148);
        divG.setAlpha(0);

        // ── 다시하기 버튼 ──
        var btnW = 180, btnH = 44;
        var btnX = W/2 - btnW/2, btnY = panelY + 166;
        var btnBg = this.add.graphics().setDepth(452);
        btnBg.fillStyle(0x112211, 1);
        btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
        btnBg.lineStyle(2, 0x44FF44, 0.9);
        btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
        btnBg.setAlpha(0);

        var btnText = this.add.text(W/2, btnY + btnH/2, '다시하기', {
            fontSize: '16px', fontFamily: 'Oxanium', color: '#44FF44'
        }).setOrigin(0.5).setDepth(453).setAlpha(0);

        var btnZone = this.add.zone(W/2, btnY + btnH/2, btnW, btnH).setDepth(460).setInteractive({ useHandCursor: true });
        btnZone.setAlpha(0);

        // ── 안내 ──
        var hint = this.add.text(W/2, panelY + panelH - 22, '아무 곳이나 클릭하면 메인 화면으로', {
            fontSize: '8px', fontFamily: 'Oxanium', color: '#333355'
        }).setOrigin(0.5).setDepth(452).setAlpha(0);

        // ── 등장 애니메이션 ──
        var allObjs = [overlay, panel, glow, badge, badgeText, titleText, statsText, divG, btnBg, btnText, hint];
        this.tweens.add({ targets: allObjs, alpha: 1, duration: 400, ease: 'Power2' });
        titleText.setScale(0.5);
        this.tweens.add({ targets: titleText, scaleX: 1, scaleY: 1, duration: 450, ease: 'Back.easeOut', delay: 100 });

        // 글로우 펄스
        this.tweens.add({ targets: glow, alpha: 0.6, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

        // ── 다시하기 호버 ──
        btnZone.on('pointerover', function() {
            btnBg.clear();
            btnBg.fillStyle(0x224422, 1);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            btnBg.lineStyle(2, 0x66FF66, 1);
            btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
            btnText.setColor('#66FF66');
        });
        btnZone.on('pointerout', function() {
            btnBg.clear();
            btnBg.fillStyle(0x112211, 1);
            btnBg.fillRoundedRect(btnX, btnY, btnW, btnH, 10);
            btnBg.lineStyle(2, 0x44FF44, 0.9);
            btnBg.strokeRoundedRect(btnX, btnY, btnW, btnH, 10);
            btnText.setColor('#44FF44');
        });

        // ── 다시하기 클릭 ──
        btnZone.on('pointerdown', function() {
            if (typeof self.scene.restart === 'function') {
                self.scene.restart();
            } else {
                self.scene.start('GameScene');
            }
        });

        // ── 배경 클릭 → 메인메뉴 ──
        this.time.delayedCall(500, function() {
            self.input.on('pointerdown', function(pointer) {
                // 버튼 영역은 제외
                if (pointer.x >= btnX && pointer.x <= btnX + btnW &&
                    pointer.y >= btnY && pointer.y <= btnY + btnH) return;
                self.scene.start('MenuScene');
            });
        });
    },
    
    update: function(time, delta) {
        if (this.isGameOver) return;
        
        // Check SPACE key (polling - more reliable than event)
        if (this.spaceKey && Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
            if (!this.waveSystem.isGameStarted) {
                this._startGameAction();
            }
        }

        // 플레이 타이머 갱신 (매초)
        if (this._playStartTime) {
            var elapsed = Math.floor((Date.now() - this._playStartTime) / 1000);
            var mm = Math.floor(elapsed / 60);
            var ss = elapsed % 60;
            var timeStr = (mm < 10 ? '0' : '') + mm + ':' + (ss < 10 ? '0' : '') + ss;
            this.hud.updatePlayTime(timeStr, '#88CCFF');
        }
        
        // Apply speed multiplier
        var adjustedDelta = delta * this.speedMultiplier;
        
        // Update monsters
        for (var i = this.monsters.length - 1; i >= 0; i--) {
            var monster = this.monsters[i];
            if (monster.active) {
                monster.update(time, adjustedDelta);
            }
        }
        
        // Update towers (캐시 배열 재사용 — GC 압력 감소)
        var am = this._cachedActiveMonsters;
        am.length = 0;
        for (var mi = 0; mi < this.monsters.length; mi++) {
            var mon = this.monsters[mi];
            if (mon.active && mon.hp > 0) am.push(mon);
        }
        
        for (var j = 0; j < this.towers.length; j++) {
            var tower = this.towers[j];
            if (tower.active && tower.isPlaced) {
                tower.update(time, adjustedDelta, am);
            }
        }
        
        // Update projectiles (풀 관리자 위임)
        Game.ProjectilePool.updateAll(time, adjustedDelta);
        
        // Clean up destroyed monsters from array
        for (var m = this.monsters.length - 1; m >= 0; m--) {
            if (!this.monsters[m].active) {
                this.monsters.splice(m, 1);
            }
        }
        
        // Update monster count every frame when game is active
        if (this.waveSystem && !this.waveSystem._destroyed && this.waveSystem.isGameStarted) {
            this._updateMonsterCount();
        }
        
        // Check spawn completion for auto-wave progression
        if (this.waveSystem && !this.waveSystem._destroyed && !this.isGameOver) {
            this.waveSystem.checkSpawnComplete();
        }

        // DPS 미터 시스템 갱신
        if (Game.DamageTracker && this.waveSystem && !this.waveSystem._destroyed && this.waveSystem.isGameStarted) {
            Game.DamageTracker.updateTime(adjustedDelta);
            if (this.dpsMeterUI && this.dpsMeterUI.isOpen) {
                this.dpsMeterUI.updateData();
            }
        }
    },
    
    _createSimStatsDisplay: function() {
        var results = [];
        try { results = JSON.parse(localStorage.getItem(this.simResultsKey) || '[]'); } catch(e) {}
        
        var total  = results.length;
        var wins   = results.filter(function(r){ return r.win; });
        var fails  = results.filter(function(r){ return !r.win; });
        var clears = wins.length;
        var rate   = total > 0 ? Math.round(clears / total * 100) : 0;

        var avgFail  = fails.length > 0 ? Math.round(fails.reduce(function(a,r){ return a+r.round; }, 0) / fails.length) : 0;
        var avgTimeSec = total > 0 ? Math.round(results.reduce(function(a,r){ return a + (r.time || 0); }, 0) / total) : 0;
        
        var am = Math.floor(avgTimeSec / 60), as = avgTimeSec % 60;
        var avgTimeStr = (am < 10 ? '0' : '') + am + ':' + (as < 10 ? '0' : '') + as;

        // 등급 점수 평균
        var winsWithGs  = wins.filter(function(r){ return r.gs > 0; });
        var failsWithGs = fails.filter(function(r){ return r.gs > 0; });
        var avgGsClear = winsWithGs.length > 0
            ? Math.round(winsWithGs.reduce(function(a,r){ return a+r.gs; },0) / winsWithGs.length) : 0;
        var avgGsFail  = failsWithGs.length > 0
            ? Math.round(failsWithGs.reduce(function(a,r){ return a+r.gs; },0) / failsWithGs.length) : 0;

        var panelX = 10;
        var panelY = 300;

        // 배경 박스
        var bg = this.add.graphics().setDepth(998);
        bg.fillStyle(0x0a0a0f, 0.75);
        bg.fillRoundedRect(panelX - 4, panelY - 4, 230, 118, 6);
        bg.lineStyle(1, 0x333355, 0.6);
        bg.strokeRoundedRect(panelX - 4, panelY - 4, 230, 118, 6);

        var txtTotal = this.add.text(panelX, panelY,      '총 실행: ' + total + '회',                                                 { fontSize: '13px', fontFamily: 'Oxanium', color: '#AAAAAA' });
        var txtClear = this.add.text(panelX, panelY + 18, '클리어: ' + clears + '회',                                                 { fontSize: '13px', fontFamily: 'Oxanium', color: '#44FF44', fontStyle: 'bold' });
        var txtRate  = this.add.text(panelX, panelY + 36, '클리어율: ' + rate + '%',                                                  { fontSize: '16px', fontFamily: 'Oxanium', color: '#FF6600', fontStyle: 'bold' });
        var txtAvg   = this.add.text(panelX, panelY + 60, '실패 평균: R' + (avgFail || '-') + ' | 평균시간: ' + avgTimeStr,          { fontSize: '12px', fontFamily: 'Oxanium', color: '#55CC55' });

        // 구분선
        var divG = this.add.graphics().setDepth(999);
        divG.lineStyle(1, 0x334455, 0.5);
        divG.lineBetween(panelX - 4, panelY + 78, panelX + 226, panelY + 78);

        var txtGsClear = this.add.text(panelX, panelY + 83,  '🏆 클리어 평균점수: ' + (avgGsClear > 0 ? avgGsClear.toLocaleString() : '게임 축적 필요'), { fontSize: '11px', fontFamily: 'Oxanium', color: '#44DDFF' });
        var txtGsFail  = this.add.text(panelX, panelY + 99,  '💀 오버 평균점수: '   + (avgGsFail  > 0 ? avgGsFail.toLocaleString()  : '게임 축적 필요'), { fontSize: '11px', fontFamily: 'Oxanium', color: '#FF9944' });

        this.add.container(0, 0, [txtTotal, txtClear, txtRate, txtAvg, txtGsClear, txtGsFail]).setDepth(999);
    }
});

window.Game = Game;
