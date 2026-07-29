var Game = window.Game || {};

Game.WaveSystem = function(scene) {
    this.scene = scene;
    this.currentRound = 0;
    this.monstersSpawned = 0;
    this.isWaveActive = false;
    this.isGameStarted = false;
    this.spawnTimer = null;
    this.waveData = null;
    this.autoSpawnTimer = null;
    this.waveQueue = [];
    this.spawnedInWave = 0;
    this.totalMonstersInWave = 0;
    this.bossAlive = false;
    this.bossTimer = null;
    this.bossTickTimer = null;
    this.waveKills = 0;              // 현재 웨이브 킬 카운터
    this._pendingNextWave = false;   // 스폰 완료 후 클리어 대기 중
};

Game.WaveSystem.prototype = {
    getCurrentRound: function() {
        return this.currentRound;
    },
    
    getTotalRounds: function() {
        return Game.Config.TOTAL_ROUNDS;
    },
    
    isActive: function() {
        return this.isWaveActive;
    },
    
    // Start the game - triggered by SPACE key
    startGame: function() {
        if (this.isGameStarted) return false;
        this.isGameStarted = true;
        
        // Start the first wave automatically
        this.startWave();
        
        return true;
    },
    
    canStartWave: function() {
        return this.isGameStarted && !this.isWaveActive && this.currentRound < Game.Config.TOTAL_ROUNDS;
    },
    
    // 스테이지 가중치: 1 + (스테이지 × 0.1)
    getStageMultiplier: function(round) {
        return 1 + round * 0.1;
    },

    // 스테이지별 스폰 간격: stats.json waveData.spawnInterval에서 읽음 (하드코딩 제거)
    // 폴백: config.js SPAWN_INTERVAL
    
    startWave: function() {
        // ── DPS MODE: 전용 웨이브로 분기 ──
        if (this.scene && this.scene.dpsMode) {
            return this.startDpsWave();
        }
        if (this.isWaveActive) return false;
        if (this.currentRound >= Game.Config.TOTAL_ROUNDS) return false;

        this._pendingNextWave = false;   // 리셋
        this.currentRound++;
        this.waveData = Game.WaveData.getWave(this.currentRound);
        if (!this.waveData) return false;
        
        this.monsterData = Game.MonsterData.getMonster(this.waveData.monsterId);
        if (!this.monsterData) return false;

        var mult = this.getStageMultiplier(this.currentRound);
        // 스폰 간격: waveData.spawnInterval 우선, 없으면 config 폴백
        var spawnInterval = this.waveData.spawnInterval || Game.Config.SPAWN_INTERVAL;

        if (this.monsterData.isBoss) {
            // 보스: 수량 1 고정, goldReward = 보스 첫 타 전체 골드
            this.scaledCount    = 1;
            this.scaledHp       = Math.floor(this.monsterData.hp * mult);
            this.scaledGold     = this.monsterData.goldReward;  // 보스 count=1
            this.clearGoldBonus = this.waveData.clearGoldBonus || 0;
        } else {
            var MAX_SPAWN = 30;
            var rawCount  = Math.ceil(this.waveData.count * mult);
            var excess    = Math.max(0, rawCount - MAX_SPAWN);

            // 수량: 최대 30 제한
            this.scaledCount    = Math.min(rawCount, MAX_SPAWN);

            // 초과 1마리당 HP +1%
            var hpBoost = 1 + excess * 0.01;
            this.scaledHp = Math.floor(this.monsterData.hp * mult * hpBoost);

            // 마리당 골드 = goldReward(데이터에서 지정한 총 골드) / count → 소수점 1자리
            // 예외: 결과가 1.0 미만(0.x)이면 1.0G로 보정 (최소 1G/마리)
            var perKill = Math.round(this.monsterData.goldReward / this.waveData.count * 10) / 10;
            this.scaledGold = Math.max(1.0, perKill);

            this.clearGoldBonus = this.waveData.clearGoldBonus || 0;

            if (excess > 0) {
                console.log('[Wave'+this.currentRound+'] 초과:'+excess+'마리 → HP×'+hpBoost.toFixed(2)+' / 마리당 골드:'+this.scaledGold+'G');
            }
        }

        this.spawnedInWave = 0;
        this.waveKills = 0;
        this.totalMonstersInWave = this.scaledCount;
        this.isWaveActive = true;

        if (this.monsterData.isBoss) {
            this.bossAlive = true;
        } else {
            this.bossAlive = false;
        }

        var self = this;
        this.spawnTimer = this.scene.time.addEvent({
            delay: spawnInterval,
            callback: function() { self._spawnMonster(); },
            repeat: this.totalMonstersInWave - 1
        });

        this.scene.events.emit('waveStart', this.currentRound, this.waveData, mult, this.scaledCount, this.scaledHp, this.monsterData.hp, spawnInterval);

        // ── timeLimit 기반 타임어택 (0이면 타이머 없음) ──
        var tl = this.waveData.timeLimit || 0;
        if (tl > 0) {
            this._startTimeLimitTimer(tl);
        }

        return true;
    },
    
    _spawnMonster: function() {
        if (this.spawnedInWave >= this.totalMonstersInWave) return;

        // 'general' 타입은 그대로 전달 → Monster가 별 모양으로 렌더링
        var monsterType = this.monsterData.type;

        this.spawnedInWave++;
        this.monstersSpawned++;

        // Emit spawn event (가중치·초과보정 적용된 HP, 골드 사용)
        this.scene.events.emit('spawnMonster', {
            id: this.monsterData.id,
            type: monsterType,
            hp: this.scaledHp,
            speed: this.monsterData.speed,
            goldReward: this.scaledGold,
            isBoss: this.monsterData.isBoss,
            bossGoldBonus: this.bossBonusGold || 0,
            imagePath: this.monsterData.imagePath || ''
        });

        // Check if all monsters for this wave have been spawned
        if (this.spawnedInWave >= this.totalMonstersInWave) {
            this._checkWaveComplete();
        }
    },

    onMonsterKilled: function() {
        // 보스 처치 여부 추적용 (일반 라운드에서는 진행에 영향 없음)
        this.waveKills++;
        // _pendingNextWave 제거됨 - 일반 라운드는 스폰 완료 후 자동 진행
    },
    
    // 보스가 처치됐을 때 GameScene에서 호출
    onBossKilled: function() {
        this.bossAlive = false;
        // 타이머 정리
        if (this.bossTimer) {
            this.bossTimer.remove();
            this.bossTimer = null;
        }
        if (this.bossTickTimer) {
            this.bossTickTimer.remove();
            this.bossTickTimer = null;
        }
        this._checkWaveComplete();
    },
    
    // timeLimit(초) 카운트다운 타이머 시작 (범용)
    _startTimeLimitTimer: function(seconds) {
        var self = this;
        var remaining = seconds;
        var repeat    = seconds - 1;

        // 기존 타이머 정리 (중복 생성 방지)
        if (this.bossTimer) {
            this.bossTimer.remove();
            this.bossTimer = null;
        }
        if (this.bossTickTimer) {
            this.bossTickTimer.remove();
            this.bossTickTimer = null;
        }

        // 1초마다 tick
        this.bossTickTimer = this.scene.time.addEvent({
            delay: 1000,
            repeat: repeat,
            callback: function() {
                remaining--;
                if (remaining >= 0) {
                    self.scene.events.emit('bossTimerTick', remaining);
                }
            }
        });

        // 제한시간 후 타임아웃
        this.bossTimer = this.scene.time.delayedCall(seconds * 1000, function() {
            self.bossTickTimer = null;
            self.bossTimer = null;

            if (self.isWaveActive) {
                var isTimeAttack = self.waveData.timeAttack;
                if (isTimeAttack) {
                    // 타임 어택 오버 -> 게임 오버
                    self.scene.events.emit('bossTimeOut');
                } else {
                    // 타임어택 아님 -> 다음 라운드 강제 시작
                    console.log('[WaveSystem] 시간 초과! (타임어택 아님) -> 다음 라운드 강제 진행');
                    self.forceCompleteWave();
                }
            }
        });
    },

    // 제한시간 초과 등으로 다음 라운드로 강제 전환
    forceCompleteWave: function() {
        if (!this.isWaveActive) return;

        // 스폰 타이머 중단
        if (this.spawnTimer) {
            this.spawnTimer.remove();
            this.spawnTimer = null;
        }

        // 타이머 정리
        if (this.bossTimer) {
            this.bossTimer.remove();
            this.bossTimer = null;
        }
        if (this.bossTickTimer) {
            this.bossTickTimer.remove();
            this.bossTickTimer = null;
        }

        this.isWaveActive = false;
        this.bossAlive = false;

        // HUD의 타이머 숨기기
        if (this.scene.hud) {
            this.scene.hud.hideBossTimer();
        }

        var bonus = Math.floor(this.currentRound * Game.Config.ROUND_BONUS_MULTIPLIER);
        if (this.monsterData && this.monsterData.isBoss) {
            bonus = Math.floor(bonus * 1.5);
        } else {
            bonus = Math.floor(bonus * 0.7);
        }
        var clearBonus = this.clearGoldBonus || 0;
        Game.EconomySystem.addGold(bonus + clearBonus);
        this.scene.events.emit('waveComplete', this.currentRound, bonus, clearBonus);

        if (this.currentRound >= Game.Config.TOTAL_ROUNDS) {
            this.scene.events.emit('gameVictory');
            return;
        }

        // 다음 라운드 딜레이: 보스 완료 후 → BOSS_END 딜레이
        this._scheduleNextWave('boss_end');
    },
    
    _checkWaveComplete: function() {
        // 보스 웨이브: 보스가 살아있으면 완료 안함 (보스 처치 필수)
        if (this.waveData && this.monsterData.isBoss && this.bossAlive) return;
        if (!this.isWaveActive) return;
        if (this.spawnedInWave < this.totalMonstersInWave) return;

        // ── 스폰 완료 ──
        this.isWaveActive = false;

        // 타이머 정리
        if (this.bossTimer) {
            this.bossTimer.remove();
            this.bossTimer = null;
        }
        if (this.bossTickTimer) {
            this.bossTickTimer.remove();
            this.bossTickTimer = null;
        }
        if (this.scene.hud) {
            this.scene.hud.hideBossTimer();
        }

        var bonus = Math.floor(this.currentRound * Game.Config.ROUND_BONUS_MULTIPLIER);
        if (this.monsterData && this.monsterData.isBoss) {
            bonus = Math.floor(bonus * 1.5);
        } else {
            bonus = Math.floor(bonus * 0.7);
        }
        var clearBonus = this.clearGoldBonus || 0;
        Game.EconomySystem.addGold(bonus + clearBonus);
        this.scene.events.emit('waveComplete', this.currentRound, bonus, clearBonus);

        if (this.currentRound >= Game.Config.TOTAL_ROUNDS) {
            this.scene.events.emit('gameVictory');
            return;
        }

        // 다음 라운드 딜레이: 보스/일반 완료 후 상황에 맞는 딜레이 자동 선택
        this._scheduleNextWave('auto');
    },

    // 다음 라운드 예약 — 상황별 딜레이 자동 선택
    // mode: 'auto' (완료 웨이브 기반 자동판단) | 'boss_end' (보스 완료 고정)
    _scheduleNextWave: function(mode) {
        if (this.autoSpawnTimer) {
            this.autoSpawnTimer.remove();
            this.autoSpawnTimer = null;
        }

        var delay;
        var cfg = Game.Config;
        if (mode === 'boss_end') {
            // 보스 라운드 완료 후 → BOSS_END 딜레이
            delay = cfg.BETWEEN_ROUND_DELAY_BOSS_END || 3000;
            console.log('[WaveSystem] 보스 완료 딜레이: ' + delay + 'ms');
        } else {
            // 일반 라운드 완료: 다음 라운드가 보스면 BOSS_START, 아니면 NORMAL
            if (this._isNextBoss()) {
                delay = cfg.BETWEEN_ROUND_DELAY_BOSS_START || 3000;
                console.log('[WaveSystem] 보스 시작 예고 딜레이: ' + delay + 'ms (R' + (this.currentRound + 1) + '이 보스)');
            } else {
                delay = cfg.BETWEEN_ROUND_DELAY || 1000;
            }
        }

        var self = this;
        this.autoSpawnTimer = this.scene.time.delayedCall(delay, function() {
            self.autoSpawnTimer = null;
            self.startWave();
        });
    },

    // 다음 라운드가 보스 라운드인지 확인
    _isNextBoss: function() {
        var nextRound = this.currentRound + 1;
        if (nextRound > Game.Config.TOTAL_ROUNDS) return false;
        var nextWave = Game.WaveData.getWave(nextRound);
        if (!nextWave) return false;
        var nextMonster = Game.MonsterData.getMonster(nextWave.monsterId);
        return nextMonster ? !!nextMonster.isBoss : false;
    },
    
    // Called from GameScene update to check spawn completion
    checkSpawnComplete: function() {
        // isWaveActive가 이미 false면 이미 처리된 것 - 재호출 불필요
        if (this.isWaveActive && this.spawnedInWave >= this.totalMonstersInWave) {
            this._checkWaveComplete();
        }
    },
    
    isBossRound: function() {
        return this.waveData ? this.monsterData.isBoss : false;
    },
    
    getProgress: function() {
        if (!this.isWaveActive) return 1;
        if (this.totalMonstersInWave === 0) return 1;
        return this.spawnedInWave / this.totalMonstersInWave;
    },
    
    // ────────────────────────────────────────────────────────────
    // DPS MODE 전용 웨이브 (리스폰 시스템)
    // scene._dpsOptions = { normal: ['general','small',...], boss: ['boss_normal',...],
    //                       normalHpMultiplier: 1, bossHpMultiplier: 1 }
    // ────────────────────────────────────────────────────────────

    // ── HP 계산: 최고등급 타워 DPS 기반 ──
    _calculateDpsHp: function(multiplier) {
        var scene = this.scene;
        if (!scene || !scene.towers || scene.towers.length === 0) return Number.MAX_SAFE_INTEGER;

        // 등급 우선순위 (높은 것부터)
        var tierOrder = ['primordial','myth','epic','legend','saga',
                         'relic','ancient','rare','normal'];

        // 배치된 타워 중 가장 높은 등급 찾기
        var highestTier = null;
        for (var ti = 0; ti < tierOrder.length; ti++) {
            for (var tw = 0; tw < scene.towers.length; tw++) {
                if (scene.towers[tw].unitData &&
                    scene.towers[tw].unitData.tier === tierOrder[ti]) {
                    highestTier = tierOrder[ti];
                    break;
                }
            }
            if (highestTier) break;
        }
        if (!highestTier) return Number.MAX_SAFE_INTEGER;

        // 해당 등급 타워들의 DPS 합산
        var totalDPS = 0;
        var towerCount = 0;
        for (var tw2 = 0; tw2 < scene.towers.length; tw2++) {
            var t = scene.towers[tw2];
            if (t.unitData && t.unitData.tier === highestTier) {
                totalDPS += (t.unitData.damage / t.unitData.attackSpeed) * 1000;
                towerCount++;
            }
        }

        // 1.2바퀴 생존 시간 계산
        var speed = this._dpsBaseSpeed || 0.9;
        var lapDistance = 1760;  // 440 × 4
        var survivalDistance = lapDistance * 0.72;  // 72% 보정 (기존 60%에서 20% 증가)
        var survivalTime = survivalDistance / (speed * 62.5);  // px / (px/sec)

        var baseHp = Math.floor(totalDPS * survivalTime);
        var finalHp = Math.floor(baseHp * (multiplier || 1));

        console.log('[DPS MODE] HP 계산: 최고등급=' + highestTier +
                    ' 타워수=' + towerCount +
                    ' 합산DPS=' + Math.floor(totalDPS) +
                    ' 생존시간=' + survivalTime.toFixed(1) + 's' +
                    ' 기본HP=' + baseHp +
                    ' ×' + multiplier + ' = ' + finalHp);

        return Math.max(finalHp, 1);
    },

    // ── 단일 몬스터 스폰 헬퍼 ──
    _dpsSpawnOne: function(monsterType, isBoss) {
        var hp = isBoss ? this._dpsBossHp : this._dpsNormalHp;
        var speed = this._dpsBaseSpeed || 0.9;
        var data = {
            id: 0,
            name: '',
            type: monsterType,
            hp: hp,
            speed: speed,
            goldReward: 0,
            isBoss: isBoss,
            imagePath: ''
        };

        // 보스 데이터 보강
        if (isBoss) {
            var bossBase = Game.MonsterData ? Game.MonsterData.getMonster('8') : null;
            if (bossBase) {
                data.id = bossBase.id;
                data.name = bossBase.name;
                data.imagePath = bossBase.imagePath || '';
            }
        }

        this.spawnedInWave++;
        this.monstersSpawned++;
        this._dpsAliveCounts[monsterType] = (this._dpsAliveCounts[monsterType] || 0) + 1;

        this.scene.events.emit('spawnMonster', data);
    },

    // ── 사망 시 리스폰 ──
    _dpsRespawn: function(monsterType, isBoss) {
        if (!this._dpsTargetCounts) return;

        // alive 카운트 감소
        this._dpsAliveCounts[monsterType] = Math.max(0, (this._dpsAliveCounts[monsterType] || 0) - 1);

        var self = this;
        var delay = this._dpsSpawnInterval || 1800;

        if (isBoss) {
            // 보스: 순차 순환 리스폰 (사망한 타입과 관계없이 다음 순서의 보스 스폰)
            if (this._dpsBossSequence && this._dpsBossSequence.length > 0) {
                var nextType = this._dpsBossSequence[this._dpsBossSeqIndex % this._dpsBossSequence.length];
                this._dpsBossSeqIndex++;

                var timer = this.scene.time.delayedCall(delay, function() {
                    if (!self.scene || !self.scene.scene.isActive()) return;
                    self._dpsSpawnOne(nextType, true);
                    var idx = self._dpsRespawnTimers.indexOf(timer);
                    if (idx !== -1) self._dpsRespawnTimers.splice(idx, 1);
                });
                this._dpsRespawnTimers.push(timer);
            }
        } else {
            // 일반: 동일 타입 리스폰 (설정 수량 유지)
            var target = this._dpsTargetCounts[monsterType] || 0;
            var alive = this._dpsAliveCounts[monsterType] || 0;

            if (alive < target) {
                var timer2 = this.scene.time.delayedCall(delay, function() {
                    if (!self.scene || !self.scene.scene.isActive()) return;
                    self._dpsSpawnOne(monsterType, false);
                    var idx = self._dpsRespawnTimers.indexOf(timer2);
                    if (idx !== -1) self._dpsRespawnTimers.splice(idx, 1);
                });
                this._dpsRespawnTimers.push(timer2);
            }
        }
    },

    startDpsWave: function() {
        if (this._dpsSpawned) return false;

        var self = this;
        this.currentRound = 1;
        this.isWaveActive = true;
        this._dpsSpawned = false;
        this._dpsBossStarted = false;
        this._dpsRespawnTimers = [];  // 리스폰 타이머 추적
        this._dpsBossSequence = [];   // 보스 순환 순서
        this._dpsBossSeqIndex = 0;    // 보스 순환 인덱스

        // ── 외부 데이터 로드 ──
        var dpsCfg = null;
        try {
            var raw = localStorage.getItem('rtd_dpsModeData');
            if (raw) dpsCfg = JSON.parse(raw);
        } catch(e) {}
        if (!dpsCfg && Game.DpsModeData) dpsCfg = Game.DpsModeData;

        var SPAWN_INTERVAL = (dpsCfg && dpsCfg.spawnInterval) ? dpsCfg.spawnInterval : 1800;
        var baseSpeed      = (dpsCfg && dpsCfg.monsterSpeed)  ? dpsCfg.monsterSpeed  : 0.9;

        // 인스턴스 변수로 저장 (리스폰 시 사용)
        this._dpsSpawnInterval = SPAWN_INTERVAL;
        this._dpsBaseSpeed = baseSpeed;

        // types 테이블에서 타입별 count 맵 생성
        var typeCountMap = {};
        var cfgTypes = (dpsCfg && dpsCfg.types) ? dpsCfg.types : [];
        for (var ci = 0; ci < cfgTypes.length; ci++) {
            typeCountMap[cfgTypes[ci].type] = cfgTypes[ci].count || 10;
        }

        // ── 설정 UI 옵션 읽기 ──
        var opts = this.scene._dpsOptions || { normal: ['general','small','large'], boss: [] };
        var normalTypes = opts.normal || [];
        var bossTypes   = opts.boss   || [];

        // 보스 순환 순서 설정
        this._dpsBossSequence = bossTypes.slice();  // 순서 복사
        this._dpsBossSeqIndex = 0;

        // ── HP 계산 (타워 DPS 기반) ──
        var normalMult = opts.normalHpMultiplier || 1;
        var bossMult   = opts.bossHpMultiplier || 1;
        this._dpsNormalHp = this._calculateDpsHp(normalMult);
        this._dpsBossHp   = this._calculateDpsHp(bossMult);

        // ── 타입별 목표 수량 설정 ──
        this._dpsTargetCounts = {};
        this._dpsAliveCounts = {};

        // 일반 몬스터 목표 수량
        for (var ni = 0; ni < normalTypes.length; ni++) {
            var cnt = typeCountMap[normalTypes[ni]] || 10;
            this._dpsTargetCounts[normalTypes[ni]] = cnt;
            this._dpsAliveCounts[normalTypes[ni]] = 0;
        }

        // 보스 목표 수량
        for (var bi = 0; bi < bossTypes.length; bi++) {
            var bCnt = typeCountMap[bossTypes[bi]] || 1;
            this._dpsTargetCounts[bossTypes[bi]] = bCnt;
            this._dpsAliveCounts[bossTypes[bi]] = 0;
        }

        // ── 초기 스폰 큐 구성 ──
        var initialQueue = [];

        // 일반 몬스터
        for (var ni2 = 0; ni2 < normalTypes.length; ni2++) {
            var nCnt = this._dpsTargetCounts[normalTypes[ni2]] || 0;
            for (var nc = 0; nc < nCnt; nc++) {
                initialQueue.push({ type: normalTypes[ni2], isBoss: false });
            }
        }

        // 보스 몬스터 (첫 번째 보스만 초기 스폰, 사망 시 다음 보스 순차 리스폰)
        if (bossTypes.length > 0) {
            initialQueue.push({ type: bossTypes[0], isBoss: true });
        }

        this.totalMonstersInWave = initialQueue.length;
        this.spawnedInWave = 0;
        this.waveKills = 0;

        // ── 초기 스폰 (SPAWN_INTERVAL 간격으로 순차) ──
        if (initialQueue.length > 0) {
            var queueIndex = 0;

            function spawnNext() {
                if (queueIndex >= initialQueue.length) {
                    self._dpsSpawned = true;
                    console.log('[DPS MODE] 초기 스폰 완료 (' + initialQueue.length + '마리) — 리스폰 시스템 활성');
                    return;
                }

                var item = initialQueue[queueIndex];
                queueIndex++;
                self._dpsSpawnOne(item.type, item.isBoss);

                if (queueIndex < initialQueue.length) {
                    var nextDelay = initialQueue[queueIndex].isBoss ? 12000 : SPAWN_INTERVAL;
                    self.spawnTimer = self.scene.time.delayedCall(nextDelay, spawnNext);
                } else {
                    self._dpsSpawned = true;
                    console.log('[DPS MODE] 초기 스폰 완료 (' + initialQueue.length + '마리) — 리스폰 시스템 활성');
                }
            }

            spawnNext();
        }

        // 웨이브 시작 이벤트 (HP 정보 포함)
        this.scene.events.emit('waveStart', 1, null, 1, this.totalMonstersInWave, this._dpsNormalHp, this._dpsNormalHp, SPAWN_INTERVAL);

        return true;
    },

    destroy: function() {
        if (this._destroyed) return;
        this._destroyed = true;
        try {
            if (this.spawnTimer) {
                this.spawnTimer.remove();
                this.spawnTimer = null;
            }
        } catch(e) {}
        try {
            if (this.autoSpawnTimer) {
                this.autoSpawnTimer.remove();
                this.autoSpawnTimer = null;
            }
        } catch(e) {}
        try {
            if (this.bossTimer) {
                this.bossTimer.remove();
                this.bossTimer = null;
            }
        } catch(e) {}
        try {
            if (this.bossTickTimer) {
                this.bossTickTimer.remove();
                this.bossTickTimer = null;
            }
        } catch(e) {}
        // DPS MODE 리스폰 타이머 정리
        try {
            if (this._dpsRespawnTimers) {
                for (var i = 0; i < this._dpsRespawnTimers.length; i++) {
                    if (this._dpsRespawnTimers[i]) this._dpsRespawnTimers[i].remove();
                }
                this._dpsRespawnTimers = [];
            }
        } catch(e) {}
    }
};

window.Game = Game;
