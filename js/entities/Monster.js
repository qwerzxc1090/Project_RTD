var Game = window.Game || {};

Game.MonsterPool = {
    _group: null,
    _scene: null,

    init: function(scene) {
        this._scene = scene;
        this._group = scene.add.group({
            classType: Game.Monster,
            runChildUpdate: false
        });
        
        // 씬 시작 시 미리 200개의 몬스터 객체를 풀에 생성
        for (var i = 0; i < 200; i++) {
            var m = new Game.Monster(scene, 0, 0, { hp:1, speed:1, type:'small', goldReward:1, waypoints:[] });
            m.setActive(false);
            m.setVisible(false);
            this._group.add(m);
        }
    },

    acquire: function(x, y, data) {
        var m = this._group.getFirstDead(false);
        if (!m) {
            m = new Game.Monster(this._scene, x, y, data);
            this._group.add(m);
        }
        m.reset(x, y, data);
        return m;
    },

    destroyAll: function() {
        if (this._group) {
            this._group.clear(true, true);
        }
        this._group = null;
    }
};

Game.Monster = function(scene, x, y, data) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    
    this.scene = scene;
    
    // 외형 생성 (한 번만)
    this._createVisual();
    
    // 데이터 초기화
    this.reset(x, y, data);
    
    scene.add.existing(this);
};

Game.Monster.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.Monster.prototype.constructor = Game.Monster;

Game.Monster.prototype.reset = function(x, y, data) {
    this.setPosition(x, y);
    this.instanceId = (Game.MonsterPool._instanceCounter = (Game.MonsterPool._instanceCounter || 0) + 1);
    this.hp = data.hp;
    this.maxHp = data.hp;
    this.speed = data.speed;
    this.monsterType = data.type;  // 'small', 'large', 'boss', 'general'
    this.goldReward = data.goldReward;
    this.isBoss = data.isBoss || false;
    this.imagePath = data.imagePath || '';       // 이미지 리소스 경로
    this._monsterDataId = data.monsterId || 0;  // BootScene 키 'monster_<id>' 조회용
    
    this.waypoints = data.waypoints || [];
    this.currentWaypointIndex = 0;
    this.lapCount = 0;
    this.totalDistance = 0;
    
    // ── 독 상태 초기화 ──
    // poisons 객체: { towerId: { stacks, remaining, tickAccum, baseDamage, tickRate, maxStacks, duration, ratio } }
    this.poisons = {};
    this._isPoisoned = false;  // 틴트 상태 추적
    
    this.setActive(true);
    this.setVisible(true);
    this.setScale(1);
    this.setAlpha(1);
    
    // 독 오버레이 초기화
    if (this.poisonOverlay) {
        this.poisonOverlay.clear();
        this.poisonOverlay.setVisible(false);
        this.poisonOverlay.setScale(1);
    }
    if (this.bodyImage) {
        this.bodyImage.clearTint();
    }
    this._poisonPulseTime = 0;
    
    this._updateVisual();
};

Game.Monster.prototype._createVisual = function() {
    // 이미지 슬롯 (imagePath 있을 때 사용)
    this.bodyImage = null;

    // ── 독 상태 시각 오버레이 (몸체 뒤에 배치) ──
    this.poisonOverlay = this.scene.add.graphics();
    this.poisonOverlay.setVisible(false);
    this.add(this.poisonOverlay);

    this.bodyGraphics = this.scene.add.graphics();
    this.add(this.bodyGraphics);

    this.hpBg = this.scene.add.graphics();
    this.add(this.hpBg);

    this.hpBar = this.scene.add.graphics();
    this.add(this.hpBar);

    // 독 예측 게이지 (보라색 — HP 바 위에 오버레이)
    this.poisonBar = this.scene.add.graphics();
    this.add(this.poisonBar);
};

Game.Monster.prototype._updateVisual = function() {
    var g = this.bodyGraphics;
    g.clear();

    var size;
    var color;

    if (this.isBoss) {
        size = Game.Config.MONSTER.BOSS_SIZE;
        // 보스 타입별 색상 분기 (boss_normal / boss_explosive / boss_vibration / 레거시 boss)
        var bossColor = Game.Config.COLORS.MONSTER[this.monsterType];
        color = bossColor !== undefined ? bossColor : Game.Config.COLORS.MONSTER.boss;
    } else if (this.monsterType === 'large') {
        size = Game.Config.MONSTER.LARGE_SIZE;
        color = Game.Config.COLORS.MONSTER.large;
    } else if (this.monsterType === 'general') {
        size = Game.Config.MONSTER.LARGE_SIZE;
        color = Game.Config.COLORS.MONSTER.general;
    } else {
        size = Game.Config.MONSTER.SMALL_SIZE;
        color = Game.Config.COLORS.MONSTER.small;
    }

    this.monsterSize = size;
    var half = size / 2;

    // ── 이미지 우선 렌더링 ──
    // useImageKey: BootScene에서 'monster_<id>' 형식으로 로드된 텍스처 키
    var useImageKey = (this.imagePath && this._monsterDataId)
        ? ('monster_' + this._monsterDataId)
        : null;

    if (useImageKey && this.scene.textures.exists(useImageKey)) {
        // ✅ 이미지 사용
        g.setVisible(false);
        if (!this.bodyImage) {
            this.bodyImage = this.scene.add.image(0, 0, useImageKey);
            this.add(this.bodyImage);
        } else {
            this.bodyImage.setTexture(useImageKey);
            this.bodyImage.setVisible(true);
        }
        this.bodyImage.setDisplaySize(size, size);
        this.setSize(size, size);
        this._updateHpBar();
        return;  // 이미지 사용 시 도형 그리기 스킵
    } else {
        // ❌ 이미지 없음 → 도형 폴백
        g.setVisible(true);
        if (this.bodyImage) this.bodyImage.setVisible(false);
    }
    
    // Body
    g.fillStyle(color, 1);
    if (this.isBoss) {
        // Boss: diamond/rhombus shape
        g.fillTriangle(0, -half, half, 0, 0, half);
        g.fillTriangle(0, -half, -half, 0, 0, half);
        // Glow effect
        g.lineStyle(2, 0xFFFFFF, 0.5);
        g.strokeTriangle(0, -half, half, 0, 0, half);
        g.strokeTriangle(0, -half, -half, 0, 0, half);
    } else if (this.monsterType === 'general') {
        // General(일반형): 별 모양 (5각별)
        var spikes = 5;
        var outerR = half;
        var innerR = half * 0.42;
        for (var si = 0; si < spikes; si++) {
            var aOuter1 = (Math.PI / spikes) * (si * 2) - Math.PI / 2;
            var aInner  = (Math.PI / spikes) * (si * 2 + 1) - Math.PI / 2;
            var aOuter2 = (Math.PI / spikes) * (si * 2 + 2) - Math.PI / 2;
            var ox1 = Math.cos(aOuter1) * outerR;
            var oy1 = Math.sin(aOuter1) * outerR;
            var ix  = Math.cos(aInner)  * innerR;
            var iy  = Math.sin(aInner)  * innerR;
            var ox2 = Math.cos(aOuter2) * outerR;
            var oy2 = Math.sin(aOuter2) * outerR;
            g.fillTriangle(0, 0, ox1, oy1, ix, iy);
            g.fillTriangle(0, 0, ix, iy, ox2, oy2);
        }
        // 바깥리 개요 효고
        g.lineStyle(1.5, 0xFFFFFF, 0.5);
        for (var si2 = 0; si2 < spikes; si2++) {
            var ao = (Math.PI / spikes) * (si2 * 2) - Math.PI / 2;
            var ai = (Math.PI / spikes) * (si2 * 2 + 1) - Math.PI / 2;
            var ao2 = (Math.PI / spikes) * (si2 * 2 + 2) - Math.PI / 2;
            g.lineBetween(
                Math.cos(ao) * outerR, Math.sin(ao) * outerR,
                Math.cos(ai) * innerR, Math.sin(ai) * innerR
            );
            g.lineBetween(
                Math.cos(ai) * innerR, Math.sin(ai) * innerR,
                Math.cos(ao2) * outerR, Math.sin(ao2) * outerR
            );
        }
    } else if (this.monsterType === 'large') {
        // Large: rounded rectangle
        g.fillRoundedRect(-half, -half, size, size, 6);
        g.lineStyle(1, 0xFFFFFF, 0.3);
        g.strokeRoundedRect(-half, -half, size, size, 6);
    } else {
        // Small: circle
        g.fillCircle(0, 0, half);
        g.lineStyle(1, 0xFFFFFF, 0.3);
        g.strokeCircle(0, 0, half);
    }
    
    // Eyes
    g.fillStyle(0xFFFFFF, 1);
    if (this.isBoss) {
        g.fillRect(-8, -6, 5, 5);
        g.fillRect(3, -6, 5, 5);
        g.fillStyle(0xFF0000, 1);
        g.fillRect(-7, -5, 3, 3);
        g.fillRect(4, -5, 3, 3);
    } else if (this.monsterType === 'general') {
        // 별 모양: 활환하는 눈 (중앙 포인트)
        g.fillStyle(0xFFFFFF, 0.95);
        g.fillCircle(-4, -3, 2.5);
        g.fillCircle(4, -3, 2.5);
        g.fillStyle(0x330033, 1);
        g.fillCircle(-4, -3, 1.2);
        g.fillCircle(4, -3, 1.2);
    } else {
        var eyeSpacing = this.monsterType === 'large' ? 5 : 3;
        g.fillRect(-eyeSpacing - 2, -3, 3, 3);
        g.fillRect(eyeSpacing - 1, -3, 3, 3);
        g.fillStyle(0x000000, 1);
        g.fillRect(-eyeSpacing - 1, -2, 2, 2);
        g.fillRect(eyeSpacing, -2, 2, 2);
    }
    
    // HP Bar background
    var hpBarWidth = this.isBoss ? 50 : Game.Config.MONSTER.HP_BAR_WIDTH;
    this.hpBarWidth = hpBarWidth;
    
    this.hpBg.clear();
    this.hpBg.fillStyle(0x000000, 0.7);
    this.hpBg.fillRect(-hpBarWidth / 2, Game.Config.MONSTER.HP_BAR_OFFSET_Y - 2, hpBarWidth, Game.Config.MONSTER.HP_BAR_HEIGHT + 2);
    
    this._updateHpBar();
    
    this.setSize(size, size);
};

Game.Monster.prototype._updateHpBar = function() {
    this.hpBar.clear();
    var hpRatio = Math.max(0, this.hp / this.maxHp);
    var hpWidth = this.hpBarWidth * hpRatio;
    
    // Color: green > yellow > red based on HP
    var color;
    if (hpRatio > 0.6) color = 0x44FF44;
    else if (hpRatio > 0.3) color = 0xFFFF44;
    else color = 0xFF4444;
    
    var barX = -this.hpBarWidth / 2;
    var barY = Game.Config.MONSTER.HP_BAR_OFFSET_Y - 1;
    var barH = Game.Config.MONSTER.HP_BAR_HEIGHT;
    
    this.hpBar.fillStyle(color, 1);
    this.hpBar.fillRect(barX, barY, hpWidth, barH);
    
    // ── 독 예측 게이지 (보라색 역방향 바) ──
    this.poisonBar.clear();
    if (!this.poisons) return;
    
    // 총 예측 독 피해량 계산
    // Σ( floor(remaining / tickRate) * floor(baseDamage * ratio) * stacks )
    var totalPoisonDmg = 0;
    var keys = Object.keys(this.poisons);
    for (var i = 0; i < keys.length; i++) {
        var p = this.poisons[keys[i]];
        var ticksLeft = Math.floor(p.remaining / p.tickRate);  // 남은 틱 횟수
        var tickDmg = Math.floor(p.baseDamage * p.ratio);      // 1틱당 기본 피해
        totalPoisonDmg += ticksLeft * tickDmg * p.stacks;
    }
    
    if (totalPoisonDmg <= 0) return;
    
    // 독 피해 비율: 현재 HP를 기준으로 역방향 게이지
    var poisonRatio = totalPoisonDmg / this.maxHp;
    
    // 현재 체력 게이지의 오른쪽 끝을 시작점으로 왼쪽 방향으로 뻗어나감
    // 하지만 체력바의 0%(왼쪽 끝)를 넘어가지 않도록 클램프
    var poisonWidth = Math.min(poisonRatio, hpRatio) * this.hpBarWidth;
    
    // 독 게이지 시작 X = 현재 HP 바 오른쪽 끝 - 독 게이지 폭
    var poisonStartX = barX + hpWidth - poisonWidth;
    
    this.poisonBar.fillStyle(0x9900CC, 0.7);  // 보라색 반투명
    this.poisonBar.fillRect(poisonStartX, barY, poisonWidth, barH);
};

// ── 독 오버레이 렌더링 ──
// 몬스터 몸체 뒤에 초록색 반투명 원형 글로우를 그린다.
// Graphics 기반 몬스터에서도 작동하는 시각 효과.
Game.Monster.prototype._drawPoisonOverlay = function(stacks, maxStacks) {
    if (!this.poisonOverlay) return;
    this.poisonOverlay.clear();

    var half      = (this.monsterSize || 20) / 2;
    var intensity = (stacks && maxStacks) ? Math.min(stacks / maxStacks, 1) : 0.2;

    // Layer 1: 최외곽 소프트 글로우
    this.poisonOverlay.fillStyle(0x00FF44, 0.06 + intensity * 0.09);
    this.poisonOverlay.fillCircle(0, 0, half + 12 + intensity * 6);

    // Layer 2: 중간 글로우
    this.poisonOverlay.fillStyle(0x00EE33, 0.14 + intensity * 0.14);
    this.poisonOverlay.fillCircle(0, 0, half + 6);

    // Layer 3: 몸체 내부 얼루마
    this.poisonOverlay.fillStyle(0x00CC22, 0.18 + intensity * 0.18);
    this.poisonOverlay.fillCircle(0, 0, half);

    // 테두리 링 — 중첩 수로 두께 증가
    var ringW = 1.5 + intensity * 2;
    this.poisonOverlay.lineStyle(ringW, 0x44FF66, 0.55 + intensity * 0.35);
    this.poisonOverlay.strokeCircle(0, 0, half + 4);

    // 추가 두 번째 링 (중첩 높을 때만)
    if (intensity > 0.4) {
        this.poisonOverlay.lineStyle(1, 0x88FFAA, 0.3 + intensity * 0.2);
        this.poisonOverlay.strokeCircle(0, 0, half + 9);
    }

    this.poisonOverlay.setVisible(true);
    this.poisonOverlay.setAlpha(0.55 + intensity * 0.3);
};

// ══════════════════════════════════════════════════════
//  독 상태 관리 (Per-Tower Tracking)
// ══════════════════════════════════════════════════════

// 전체 타워 독 중첩 합산
Game.Monster.prototype._getTotalPoisonStacks = function() {
    var total = 0;
    var keys = Object.keys(this.poisons);
    for (var i = 0; i < keys.length; i++) total += this.poisons[keys[i]].stacks;
    return total;
};

/**
 * applyPoison — 투사체 적중 시 호출
 * @param {number} towerId   - 공격한 타워의 고유 ID (Tower.towerId)
 * @param {object} unitData  - 타워의 unitData (damage 등 기본 스탯)
 * @param {object} skillData - 스킬 데이터 (poisonDuration, maxPoisonStacks, tickRate, poisonDamageRatio 포함)
 */
Game.Monster.prototype.applyPoison = function(towerId, unitData, skillData) {
    // 독 파라미터는 스킬 데이터에서 읽음
    // (unitData가 아닌 skillId 5번 등 duration 카테고리 스킬에 정의)
    var duration  = (skillData && skillData.poisonDuration)    || unitData.poisonDuration;
    var maxStacks = (skillData && skillData.maxPoisonStacks)   || unitData.maxPoisonStacks || 10;
    var tickRate  = (skillData && skillData.tickRate)          || unitData.tickRate        || 1000;
    var ratio     = (skillData && skillData.poisonDamageRatio) || unitData.poisonDamageRatio || 0.2;
    
    if (!duration) return;  // 독 파라미터 없으면 무시
    
    var existing = this.poisons[towerId];
    
    if (existing) {
        // ── 기존 독: 중첩 증가 + 지속시간 리셋 ──
        if (existing.stacks < existing.maxStacks) {
            existing.stacks++;
        }
        existing.remaining = existing.duration;
    } else {
        // ── 새 독 생성 ──
        this.poisons[towerId] = {
            stacks:     1,           // 현재 중첩 수
            remaining:  duration,    // 남은 지속시간 (ms)
            tickAccum:  0,           // 틱 누적 시간 (ms)
            baseDamage: unitData.damage,  // 타워 기본 공격력
            tickRate:   tickRate,    // 틱 주기 (ms)
            maxStacks:  maxStacks,   // 최대 중첩
            duration:   duration,    // 전체 지속시간 (리셋 기준)
            ratio:      ratio        // 독 데미지 비율
        };
    }
    
    // 독 시각적 피드백: 오버레이 + 몸체 틴트 활성화
    var totalStacks = this._getTotalPoisonStacks();
    var anyPoison = this.poisons[towerId];
    var maxSt = anyPoison ? anyPoison.maxStacks : maxStacks;
    if (!this._isPoisoned) {
        this._isPoisoned = true;
        this._poisonPulseTime = 0;
    }
    this._drawPoisonOverlay(totalStacks, maxSt);
    // 몸체 이미지 틴트 (GPU 연산, 부하 거의 없음)
    if (this.bodyImage) {
        var g = Math.max(0x66, Math.min(0xFF, 0x88 + totalStacks * 8));
        this.bodyImage.setTint(Phaser.Display.Color.GetColor(0x33, g, 0x33));
    }
};

/**
 * _updatePoison — update() 루프에서 매 프레임 호출
 * delta 기반으로 독 틱을 처리하고, 지속시간 만료 시 독을 해제한다.
 */
Game.Monster.prototype._updatePoison = function(delta) {
    var keys = Object.keys(this.poisons);
    if (keys.length === 0) return;
    
    var totalTickDamage = 0;
    
    for (var i = keys.length - 1; i >= 0; i--) {
        var towerId = keys[i];
        var p = this.poisons[towerId];
        
        // 지속시간 차감
        p.remaining -= delta;
        
        // 틱 누적
        p.tickAccum += delta;
        
        // 틱 주기마다 데미지 적용
        while (p.tickAccum >= p.tickRate) {
            // 1 틱 데미지 = floor(기본공격력 * 독비율) * 현재 중첩수
            var tickDmg = Math.floor(p.baseDamage * p.ratio) * p.stacks;
            totalTickDamage += tickDmg;
            if (Game.DamageTracker) {
                Game.DamageTracker.recordDamageByTowerId(towerId, tickDmg);
            }
            p.tickAccum -= p.tickRate;
        }
        
        // 지속시간 만료 → 해당 타워의 독 해제
        if (p.remaining <= 0) {
            delete this.poisons[towerId];
        }
    }
    
    // 독 데미지 적용 (takeDamage 대신 직접 차감 — flash 트윈 방지)
    if (totalTickDamage > 0) {
        this.hp -= totalTickDamage;
        // 독 틱 피해 소형 녹색 숫자
        if (Game.DamageTextPool && Game.DamageTextPool.showPoison) {
            var ox = (Math.random() - 0.5) * 16;
            Game.DamageTextPool.showPoison(this.x + ox, this.y, totalTickDamage, this.scene);
        }
        if (this.hp <= 0) {
            this.hp = 0;
            this.die();
            return;
        }
    }

    // 모든 독 해제 확인 → 오버레이 제거
    if (Object.keys(this.poisons).length === 0) {
        if (this._isPoisoned) {
            this._isPoisoned = false;
            if (this.poisonOverlay) {
                this.poisonOverlay.clear();
                this.poisonOverlay.setVisible(false);
                this.poisonOverlay.setScale(1);
            }
            if (this.bodyImage) {
                this.bodyImage.clearTint();
            }
        }
    } else {
        // 중첩 수 변경 시 오버레이 강도 업데이트
        var ts = this._getTotalPoisonStacks();
        if (this.bodyImage) {
            var tg = Math.max(0x66, Math.min(0xFF, 0x88 + ts * 8));
            this.bodyImage.setTint(Phaser.Display.Color.GetColor(0x33, tg, 0x33));
        }
    }
    
    // HP바 업데이트 (독 예측 게이지 포함)
    this._updateHpBar();
};

Game.Monster.prototype.takeDamage = function(amount) {
    this.hp -= amount;
    this._updateHpBar();
    
    // Flash red
    var self = this;
    this.scene.tweens.add({
        targets: this,
        alpha: 0.5,
        duration: 50,
        yoyo: true,
        onComplete: function() { self.alpha = 1; }
    });
    
    if (this.hp <= 0) {
        this.die();
    }
};

Game.Monster.prototype.die = function() {
    // 독 상태 정리
    this.poisons = {};
    if (this._isPoisoned) {
        this._isPoisoned = false;
        if (this.poisonOverlay) {
            this.poisonOverlay.clear();
            this.poisonOverlay.setVisible(false);
        }
    }
    
    // 골드 지급 로직은 Event-Driven 방식으로 GameScene에서 처리하도록 분리됨
    
    // Death animation
    var self = this;
    this.scene.tweens.add({
        targets: this,
        alpha: 0,
        scaleX: 1.5,
        scaleY: 1.5,
        duration: 200,
        onComplete: function() {
            self.scene.events.emit('monsterKilled', self);
            // 최적화: destroy() 대신 비활성화하여 풀로 반환
            self.setActive(false);
            self.setVisible(false);
        }
    });
};

Game.Monster.prototype.update = function(time, delta) {
    if (!this.active || this.hp <= 0) return;
    
    // ── 독 틱 업데이트 (이동 전에 처리 — 독으로 사망 시 이동 불필요) ──
    this._updatePoison(delta);
    if (!this.active || this.hp <= 0) return;  // 독 사망 체크
    
    if (this.waypoints.length === 0) return;
    
    // Follow waypoints in a loop (infinite CCW around square)
    var target = this.waypoints[this.currentWaypointIndex];
    var dx = target.x - this.x;
    var dy = target.y - this.y;
    var dist = Math.sqrt(dx * dx + dy * dy);
    
    var moveAmount = this.speed * (delta / 16);
    
    while (moveAmount > 0) {
        if (this.currentWaypointIndex >= this.waypoints.length) {
            this.currentWaypointIndex = 0;
            this.lapCount++;
        }
        
        var target = this.waypoints[this.currentWaypointIndex];
        var dx = target.x - this.x;
        var dy = target.y - this.y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        
        if (dist <= moveAmount) {
            // Reached waypoint, advance to next and keep moving
            this.x = target.x;
            this.y = target.y;
            this.totalDistance += dist;
            this.currentWaypointIndex++;
            moveAmount -= dist;
        } else {
            // Move towards waypoint and consume all remaining moveAmount
            var moveX = (dx / dist) * moveAmount;
            var moveY = (dy / dist) * moveAmount;
            this.x += moveX;
            this.y += moveY;
            this.totalDistance += moveAmount;
            moveAmount = 0;
        }
    }
    
    // Bobbing animation for boss
    if (this.isBoss) {
        this.bodyGraphics.y = Math.sin(time / 200) * 3;
    }
    
    // ── 독 오버레이 페이즈 + 스케일 폄스 애니메이션 ──
    if (this._isPoisoned && this.poisonOverlay) {
        this._poisonPulseTime = (this._poisonPulseTime || 0) + delta;
        var ts2 = this._getTotalPoisonStacks();
        // 스택 많을수록 페이스 빠르게
        var pSpeed  = Math.max(80, 300 - ts2 * 18);
        var baseA   = Math.min(0.55 + ts2 * 0.025, 0.85);
        var pulseA  = baseA + Math.sin(this._poisonPulseTime / pSpeed) * 0.18;
        this.poisonOverlay.setAlpha(Math.min(pulseA, 0.95));
        // 미세 스케일 펙동 (시소한 샴 아님이션)
        var sc = 1 + Math.sin(this._poisonPulseTime / (pSpeed * 1.3)) * 0.04;
        this.poisonOverlay.setScale(sc);
    }
};

// Get the total progress (distance traveled) for targeting priority
Game.Monster.prototype.getProgress = function() {
    return this.totalDistance;
};

window.Game = Game;
