var Game = window.Game || {};

// ══════════════════════════════════════════════════════
//  Projectile — 오브젝트 풀 기반 투사체 시스템
//  - new/destroy 대신 acquire/release 로 재사용
//  - 데미지 텍스트 풀링 + 쓰로틀
//  - 히트 이펙트 간소화 (고밀도 시 생략)
// ══════════════════════════════════════════════════════

// ── 투사체 풀 관리자 (Phaser Group 적용) ──
Game.ProjectilePool = {
    _group: null,
    _scene: null,

    init: function(scene) {
        this._scene = scene;
        
        // 물리 연산이 필요 없는 순수 GameObjects Group 활용
        this._group = scene.add.group({
            classType: Game.Projectile,
            runChildUpdate: false // GameScene에서 speedMultiplier(adjustedDelta)를 직접 주입하기 위해 수동 업데이트 사용
        });
        
        // 씬 시작 시 미리 500개의 투사체 객체를 풀에 생성해 둠 (초반 생성 렉 방지)
        for (var i = 0; i < 500; i++) {
            // 더미 데이터로 생성 후 비활성화
            var p = new Game.Projectile(scene, 0, 0, null, { attackType: 'normal' }, null);
            p.setActive(false);
            p.setVisible(false);
            this._group.add(p);
        }
    },

    acquire: function(x, y, target, unitData, skill, originTower) {
        // 비활성화된(Dead) 투사체를 찾아서 재활용
        var p = this._group.getFirstDead(false);
        
        if (!p) {
            // 풀에 남은 객체가 없으면 새로 생성하여 풀에 추가
            p = new Game.Projectile(this._scene, x, y, target, unitData, skill);
            this._group.add(p);
        }
        
        // 타겟 및 위치 정보 재설정 후 활성화
        p.reset(x, y, target, unitData, skill, originTower);
        return p;
    },

    release: function(p) {
        // 상태를 비활성화하면 updateAll에서 건너뛰고 getFirstDead에서 다시 재활용 가능해짐
        p.setActive(false);
        p.setVisible(false);
    },

    updateAll: function(time, delta) {
        // 배열 splice()를 사용하지 않고 단순히 활성화된 객체만 순회
        var children = this._group.getChildren();
        var len = children.length;
        for (var i = 0; i < len; i++) {
            var p = children[i];
            if (p.active) {
                p.update(time, delta);
            }
        }
    },

    getActiveCount: function() {
        return this._group ? this._group.countActive(true) : 0;
    },

    destroyAll: function() {
        if (this._group) {
            this._group.clear(true, true);
        }
        this._group = null;
    }
};

// ── 데미지 텍스트 풀 ──
Game.DamageTextPool = {
    _pool: [],
    _scene: null,
    _lastShowTime: 0,
    _throttleMs: 0,     // 배속에 따라 동적 조절

    init: function(scene) {
        this._scene = scene;
        this._pool = [];
        this._lastShowTime = 0;
    },

    setThrottle: function(speedMult) {
        // 1x=0ms, 2x=30ms, 4x=60ms, 6x=100ms
        if (speedMult >= 6)      this._throttleMs = 100;
        else if (speedMult >= 4) this._throttleMs = 60;
        else if (speedMult >= 2) this._throttleMs = 30;
        else                     this._throttleMs = 0;
    },

    // ── 일반 피해 텍스트 (치명타 전용으로 대체 - 현재 미사용) ──
    show: function(x, y, damage, color, isBig) {
        // 일반 공격 피해 텍스트는 표시하지 않음 (치명타만 showCrit 사용)
    },

    // ── 치명타 전용 피해 텍스트 (화려한 연출) ──
    showCrit: function(x, y, damage) {
        var scene = this._scene;
        if (!scene) return;

        // 스로틀 없음 — 치명타는 희귀 이벤트이므로 항상 표시
        var label = damage.toLocaleString() + '!';

        // ── 메인 텍스트 (골드 + 두꺼운 외곽선) ──
        var startX = x + (Math.random() * 20 - 10); // 약간 랜덤 X 분산
        var startY = y - 18;
        var txt;
        if (this._pool.length > 0) {
            txt = this._pool.pop();
            txt.setText(label);
            txt.setPosition(startX, startY);
            txt.setAlpha(1);
            txt.setScale(1);
            txt.setColor('#FFD700');
            txt.setFontSize('17px');
            txt.setStroke('#7B3A00', 4);
            txt.setActive(true);
            txt.setVisible(true);
        } else {
            txt = scene.add.text(startX, startY, label, {
                fontSize: '17px',
                fontFamily: 'Oxanium',
                fontStyle: 'bold',
                color: '#FFD700',
                stroke: '#7B3A00',
                strokeThickness: 4
            }).setOrigin(0.5);
        }
        txt.setDepth(210);

        var pool = this._pool;

        // ── 팝업 → 상승 → 페이드 아웃 애니메이션 ──
        // 1단계: 순간 팝업 (크게 확대)
        scene.tweens.add({
            targets: txt,
            scaleX: 1.45,
            scaleY: 1.45,
            duration: 108,
            ease: 'Power2',
            onComplete: function() {
                // 2단계: 살짝 축소 후 상승 + 페이드
                scene.tweens.add({
                    targets: txt,
                    scaleX: 1.1,
                    scaleY: 1.1,
                    y: startY - 52,
                    alpha: 0,
                    duration: 864,
                    ease: 'Power1',
                    onComplete: function() {
                        txt.setActive(false);
                        txt.setVisible(false);
                        txt.setScale(1);
                        pool.push(txt);
                    }
                });
            }
        });

        // ── 번쩍임 이펙트 (흰 테두리 원) ──
        var flash = scene.add.graphics();
        flash.setPosition(x, y);
        flash.lineStyle(3, 0xFFDD00, 1);
        flash.strokeCircle(0, 0, 12);
        flash.setDepth(209);
        scene.tweens.add({
            targets: flash,
            scaleX: 2.8,
            scaleY: 2.8,
            alpha: 0,
            duration: 350,
            ease: 'Power2',
            onComplete: function() { flash.destroy(); }
        });
    },

    showPoison: function(x, y, damage) {
        var scene = this._scene;
        if (!scene) return;

        var label = '-' + damage;
        var startX = x;
        var startY = y - 10;
        var txt;
        if (this._pool.length > 0) {
            txt = this._pool.pop();
            txt.setText(label);
            txt.setPosition(startX, startY);
            txt.setAlpha(1);
            txt.setScale(1);
            txt.setColor('#44FF66');
            txt.setFontSize('9px');
            txt.setStroke('#003300', 2);
            txt.setActive(true);
            txt.setVisible(true);
        } else {
            txt = scene.add.text(startX, startY, label, {
                fontSize: '9px',
                fontFamily: 'Oxanium',
                color: '#44FF66',
                stroke: '#003300',
                strokeThickness: 2
            }).setOrigin(0.5);
        }
        txt.setDepth(205);

        var pool = this._pool;
        scene.tweens.add({
            targets: txt,
            y: startY - 24,
            alpha: 0,
            duration: 600,
            ease: 'Power1',
            onComplete: function() {
                txt.setActive(false);
                txt.setVisible(false);
                txt.setScale(1);
                pool.push(txt);
            }
        });
    },

    destroyAll: function() {
        for (var i = 0; i < this._pool.length; i++) {
            if (this._pool[i] && this._pool[i].destroy) this._pool[i].destroy();
        }
        this._pool = [];
    }
};

// ── 히트 이펙트 풀 ──
Game.HitEffectPool = {
    _pool: [],
    _scene: null,
    _activeCount: 0,
    MAX_CONCURRENT: 30,  // 동시 이펙트 최대 개수

    init: function(scene) {
        this._scene = scene;
        this._pool = [];
        this._activeCount = 0;
    },

    show: function(x, y, color) {
        // 동시 이펙트가 너무 많으면 생략
        if (this._activeCount >= this.MAX_CONCURRENT) return;

        var g;
        if (this._pool.length > 0) {
            g = this._pool.pop();
            g.clear();
            g.setPosition(x, y);
            g.setAlpha(1);
            g.setScale(1);
            g.setActive(true);
            g.setVisible(true);
        } else {
            g = this._scene.add.graphics();
        }
        g.setPosition(x, y);
        g.fillStyle(color, 0.5);
        g.fillCircle(0, 0, 8);
        g.setDepth(190);

        this._activeCount++;
        var self = this;
        var pool = this._pool;
        this._scene.tweens.add({
            targets: g,
            alpha: 0,
            scaleX: 2,
            scaleY: 2,
            duration: 200,
            onComplete: function() {
                g.setActive(false);
                g.setVisible(false);
                g.clear();
                pool.push(g);
                self._activeCount--;
            }
        });
    },

    destroyAll: function() {
        for (var i = 0; i < this._pool.length; i++) {
            if (this._pool[i] && this._pool[i].destroy) this._pool[i].destroy();
        }
        this._pool = [];
        this._activeCount = 0;
    }
};


// ══════════════════════════════════════════════════════
//  투사체 클래스 (풀 재사용 가능)
// ══════════════════════════════════════════════════════
Game.Projectile = function(scene, x, y, target, unitData, skill) {
    Phaser.GameObjects.Container.call(this, scene, x, y);

    this.scene    = scene;
    this.target   = target;
    this.targetInstanceId = target ? target.instanceId : null;
    this.unitData = unitData;
    this.skill    = skill || Game.SkillData.getSkill(2);
    this.speed    = this.skill.projectileSpeed;
    this.hit      = false;

    // ── 체인 라이트닝 전용 변수 ──
    this.originTower          = null;   // 발사한 타워 참조 (핑퐁용)
    this.isChainLightning     = false;  // 체인 라이트닝 투사체 여부
    this.bounceCount          = 0;      // 남은 연쇄 횟수
    this.maxBounceCount       = 0;      // 최대 연쇄 횟수 (reset 복구용)
    this.bounceRange          = 0;      // 연쇄 탐색 반경
    this.bounceDamageMultiplier = 1;    // 연쇄 시 데미지 감소 배율
    this.hitEnemies           = [];     // 이미 타격한 적 instanceId 배열
    this.isReturningToTower   = false;  // 타워로 되돌아가는 중 여부
    this.currentDamage        = 0;      // 현재 데미지 (연쇄 감소 적용)

    // 비주얼은 한 번만 생성 후 재사용
    this._visualGraphics = null;
    this._visualImage    = null;
    this._createVisual();

    this.setDepth(50);
    scene.add.existing(this);
};

Game.Projectile.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.Projectile.prototype.constructor = Game.Projectile;

// ── 풀에서 재사용 시 호출 ──
Game.Projectile.prototype.reset = function(x, y, target, unitData, skill, originTower) {
    this.setPosition(x, y);
    this.target   = target;
    this.targetInstanceId = target ? target.instanceId : null;
    this.unitData = unitData;
    this.skill    = skill || Game.SkillData.getSkill(2);
    this.speed    = this.skill.projectileSpeed;
    this.hit      = false;
    this.setActive(true);
    this.setVisible(true);
    this.setAlpha(1);
    this.rotation = 0;

    // ── 이동 상태 초기화 (재사용 시 구 위치 잔류 방지) ──
    this.lastTargetX = undefined;
    this.lastTargetY = undefined;

    // ── 체인 라이트닝 변수 초기화 ──
    this.originTower          = originTower || null;
    // nameEn === 'CHAIN_ATTACK' 또는 bounceCount > 0 이면 체인 어택 투사체로 판정
    this.isChainLightning     = !!(this.skill && (
        (this.skill.nameEn === 'CHAIN_ATTACK') ||
        (this.skill.bounceCount && this.skill.bounceCount > 0)
    ));
    this.bounceCount          = this.isChainLightning ? this.skill.bounceCount : 0;
    this.maxBounceCount       = this.bounceCount;
    // bounceRange: 0 = 사정거리 제한 없음, 양수 = px 반경 제한
    this.bounceRange          = this.isChainLightning ? (this.skill.bounceRange || 0) : 0;
    this.bounceDamageMultiplier = this.isChainLightning ? (this.skill.bounceDamageMultiplier || 0.85) : 1;
    this.hitEnemies           = [];
    this.isReturningToTower   = false;
    this.currentDamage        = 0; // 첫 타격 시 계산
    this.isCritForChain       = false; // 연쇄 투사체 치명타 여부 공유

    // 비주얼 업데이트 (스킬이 달라지면)
    this._updateVisual();
};

Game.Projectile.prototype._createVisual = function() {
    this._updateVisual();
};

Game.Projectile.prototype._updateVisual = function() {
    var displaySize = (this.skill && this.skill.displaySize) ? this.skill.displaySize : 8;
    var imageKey    = this.skill ? (this.skill.imageKey || ('proj_' + this.skill.id)) : null;

    if (imageKey && this.scene.textures.exists(imageKey)) {
        if (this._visualGraphics) {
            this._visualGraphics.setVisible(false);
        }
        if (!this._visualImage) {
            var img = this.scene.add.image(0, 0, imageKey);
            this.add(img);
            this._visualImage = img;
        } else {
            this._visualImage.setTexture(imageKey);
            this._visualImage.setVisible(true);
        }
        this._visualImage.setDisplaySize(displaySize, displaySize);
        this.setSize(displaySize, displaySize);
    } else {
        if (this._visualImage) {
            this._visualImage.setVisible(false);
        }
        if (!this._visualGraphics) {
            var g = this.scene.add.graphics();
            this.add(g);
            this._visualGraphics = g;
        } else {
            this._visualGraphics.setVisible(true);
            this._visualGraphics.clear();
        }
        this._drawProjectileShape(this._visualGraphics);
        this.setSize(displaySize, displaySize);
    }
};

Game.Projectile.prototype._drawProjectileShape = function(g) {
    var rawColor = (this.skill && this.skill.fallbackColor)
        ? this.skill.fallbackColor
        : Game.Config.COLORS.ATTACK_TYPE[this.unitData.attackType];
    // 문자열 "0x..." 형태를 숫자로 변환
    var fallbackColor = (typeof rawColor === 'string') ? parseInt(rawColor, 16) : rawColor;
    var fallbackShape = this.skill ? this.skill.fallbackShape : 'circle';
    var size = 4;

    if (fallbackShape === 'lightning') {
        // ── 번개 볼트: 글로우 외곽 + 코어 + 센터 화이트 ──
        // 외곽 글로우 (큰 반투명 원)
        g.fillStyle(fallbackColor, 0.25);
        g.fillCircle(0, 0, 14);
        // 중간 글로우
        g.fillStyle(fallbackColor, 0.55);
        g.fillCircle(0, 0, 9);
        // 번개 지그재그 (크게)
        g.fillStyle(fallbackColor, 1);
        g.fillTriangle(-2, -10, 4, -1, 0, -1);
        g.fillTriangle(0,  -1, -4,  8, 2,  1);
        // 코어 화이트
        g.fillStyle(0xFFFFFF, 0.9);
        g.fillCircle(0, 0, 3);
    } else if (this.unitData.attackType === 'explosive') {
        g.fillStyle(fallbackColor, 1);
        g.fillRect(-size, -size, size * 2, size * 2);
        g.fillStyle(0xFFAA00, 0.5);
        g.fillRect(-size + 1, -size + 1, size * 2 - 2, size * 2 - 2);
    } else if (this.unitData.attackType === 'vibration') {
        g.lineStyle(2, fallbackColor, 1);
        g.strokeCircle(0, 0, size);
        g.fillStyle(fallbackColor, 0.5);
        g.fillCircle(0, 0, 2);
    } else if (fallbackShape === 'circle_large') {
        g.fillStyle(fallbackColor, 0.9);
        g.fillCircle(0, 0, size + 2);
        g.lineStyle(1, 0xFFFFFF, 0.4);
        g.strokeCircle(0, 0, size + 2);
    } else if (fallbackShape === 'diamond') {
        g.fillStyle(fallbackColor, 1);
        g.fillTriangle(0, -(size+1), size, 0, 0, size+1);
        g.fillTriangle(0, -(size+1), -size, 0, 0, size+1);
    } else {
        g.fillStyle(fallbackColor, 1);
        g.fillCircle(0, 0, size);
    }
};

Game.Projectile.prototype.update = function(time, delta) {
    if (this.hit || !this.active) return;

    // ── 체인 라이트닝: 전용 업데이트 분기 ──
    if (this.isChainLightning) {
        this._updateChainLightning(time, delta);
        return;
    }

    // ── 일반 투사체 업데이트 ──
    var targetIsValid = this.target && this.target.active && this.target.hp > 0 && this.target.instanceId === this.targetInstanceId;
    var destX, destY;

    if (targetIsValid) {
        destX = this.target.x;
        destY = this.target.y;
        this.lastTargetX = destX;
        this.lastTargetY = destY;
    } else {
        if (this.lastTargetX === undefined) {
            this.setActive(false);
            this.setVisible(false);
            return;
        }
        destX = this.lastTargetX;
        destY = this.lastTargetY;
    }

    // ── 속도 0 = Hitscan (즉시 확정 타격) ──
    if (this.speed === 0) {
        this.hit = true;
        if (targetIsValid) {
            var dmgResult = Game.CombatSystem.calculateDamage(
                { x: this.x, y: this.y, unitData: this.unitData },
                this.target
            );
            this.target.takeDamage(dmgResult.damage);
            if (Game.DamageTracker) {
                Game.DamageTracker.recordDamage(this.originTower || this.unitData, dmgResult.damage);
            }
            // 스킬 카테고리가 'duration'인 경우 독 중첩 적용 (skillId 5 POISON_DOT 등)
            if (this.skill && this.skill.category === 'duration' && this.originTower && this.target.applyPoison) {
                this.target.applyPoison(this.originTower.towerId, this.unitData, this.skill);
            }
            // 치명타 적중 시에만 피해량 표시
            if (dmgResult.isCritical) {
                Game.DamageTextPool.showCrit(this.target.x, this.target.y, dmgResult.damage);
            }
            var hitColor = Game.Config.COLORS.ATTACK_TYPE[this.unitData.attackType];
            Game.HitEffectPool.show(this.target.x, this.target.y, hitColor);
        }
        this.setActive(false);
        this.setVisible(false);
        return;
    }

    var dx = destX - this.x;
    var dy = destY - this.y;
    var distSq = dx * dx + dy * dy;
    var moveAmount = this.speed * (delta / 16);
    var hitDist = 8;

    if (distSq <= hitDist * hitDist) {
        this.hit = true;

        if (targetIsValid) {
            var dmgResult = Game.CombatSystem.calculateDamage(
                { x: this.x, y: this.y, unitData: this.unitData },
                this.target
            );
            this.target.takeDamage(dmgResult.damage);
            if (Game.DamageTracker) {
                Game.DamageTracker.recordDamage(this.originTower || this.unitData, dmgResult.damage);
            }

            // 스킬 카테고리가 'duration'인 경우 독 중첩 적용 (skillId 5 POISON_DOT 등)
            if (this.skill && this.skill.category === 'duration' && this.originTower && this.target.applyPoison) {
                this.target.applyPoison(this.originTower.towerId, this.unitData, this.skill);
            }

            // 치명타 적중 시에만 피해량 표시
            if (dmgResult.isCritical) {
                Game.DamageTextPool.showCrit(this.target.x, this.target.y, dmgResult.damage);
            }

            var hitColor = Game.Config.COLORS.ATTACK_TYPE[this.unitData.attackType];
            Game.HitEffectPool.show(this.target.x, this.target.y, hitColor);
        } else {
            var hitColor = Game.Config.COLORS.ATTACK_TYPE[this.unitData.attackType];
            Game.HitEffectPool.show(destX, destY, hitColor);
        }

        this.setActive(false);
        this.setVisible(false);
    } else {
        var dist = Math.sqrt(distSq);
        var actualMove = Math.min(moveAmount, dist);
        this.x += (dx / dist) * actualMove;
        this.y += (dy / dist) * actualMove;
        this.rotation = Math.atan2(dy, dx);
    }
};


// ══════════════════════════════════════════════════════
//  체인 라이트닝 전용 업데이트
//  - bounceCount를 모두 소모할 때까지 투사체가 절대 사라지지 않음
//  - Case 1: 단일 타겟 → 타워 핑퐁
//  - Case 2: 적 부족 시 hitEnemies 초기화
//  - Case 3: 일반 연쇄 (가장 가까운 미타격 적 추적)
// ══════════════════════════════════════════════════════
Game.Projectile.prototype._updateChainLightning = function(time, delta) {
    // ── 목적지 결정 ──
    var destX, destY;

    if (this.isReturningToTower) {
        // 타워로 귀환 중
        if (this.originTower && this.originTower.active) {
            destX = this.originTower.x;
            destY = this.originTower.y;
        } else {
            // 타워가 파괴된 경우: 소멸
            this._chainRelease();
            return;
        }
    } else {
        // 적을 향해 이동 중
        var targetIsValid = this.target && this.target.active && this.target.hp > 0
                          && this.target.instanceId === this.targetInstanceId;

        if (targetIsValid) {
            destX = this.target.x;
            destY = this.target.y;
            this.lastTargetX = destX;
            this.lastTargetY = destY;
        } else {
            // 타겟이 죽었으면 즉시 다음 바운스 타겟 탐색 시도
            var nextTarget = this._findChainTarget(this.x, this.y);
            if (nextTarget) {
                this.target = nextTarget;
                this.targetInstanceId = nextTarget.instanceId;
                destX = nextTarget.x;
                destY = nextTarget.y;
                this.lastTargetX = destX;
                this.lastTargetY = destY;
            } else if (this.lastTargetX !== undefined) {
                destX = this.lastTargetX;
                destY = this.lastTargetY;
            } else {
                this._chainRelease();
                return;
            }
        }
    }

    // ── 이동 ──
    var dx = destX - this.x;
    var dy = destY - this.y;
    var distSq = dx * dx + dy * dy;
    var moveAmount = this.speed * (delta / 16);
    var hitDist = 10;

    if (distSq <= hitDist * hitDist) {
        // ── 도착 ──
        if (this.isReturningToTower) {
            // 타워 도착: 데미지 없음, bounceCount 소모
            this.isReturningToTower = false;
            this.bounceCount--;
            if (this.bounceCount <= 0) {
                // 복귀 중 소모 완료 → 소멸
                this._chainRelease();
                return;
            }
            var nextTarget = this._findChainTarget(destX, destY);
            if (nextTarget) {
                this.target = nextTarget;
                this.targetInstanceId = nextTarget.instanceId;
            } else {
                this._chainRelease();
            }
            return;
        }

        // ── 적 타격 처리 ──
        var targetIsValid = this.target && this.target.active && this.target.hp > 0
                          && this.target.instanceId === this.targetInstanceId;

        if (targetIsValid) {
            if (this.currentDamage === 0) {
                var dmgResult = Game.CombatSystem.calculateDamage(
                    { x: this.x, y: this.y, unitData: this.unitData },
                    this.target
                );
                this.currentDamage = dmgResult.damage;
                this.isCritForChain = dmgResult.isCritical;
            }
            this.target.takeDamage(this.currentDamage);
            if (Game.DamageTracker) {
                Game.DamageTracker.recordDamage(this.originTower || this.unitData, this.currentDamage);
            }
            // 스킬 카테고리가 'duration'인 경우 독 중첩 적용 (연쇄 번개)
            if (this.skill && this.skill.category === 'duration' && this.originTower && this.target.applyPoison) {
                this.target.applyPoison(this.originTower.towerId, this.unitData, this.skill);
            }
            // 치명타 적중 시에만 피해량 표시 (연쇄 번개)
            if (this.isCritForChain) {
                Game.DamageTextPool.showCrit(this.target.x, this.target.y, this.currentDamage);
            }
            Game.HitEffectPool.show(this.target.x, this.target.y, 0x00CCFF);
            this.hitEnemies.push(this.target.instanceId);
            this.currentDamage = Math.floor(this.currentDamage * this.bounceDamageMultiplier);
            if (this.currentDamage < 1) this.currentDamage = 1;
        }

        // ── bounceCount 소모 ──
        this.bounceCount--;
        if (this.bounceCount <= 0) {
            this._chainRelease();
            return;
        }

        // ── 다음 타겟 탐색 (3가지 케이스) ──
        var hitX = destX, hitY = destY;
        var monsters = this._getActiveMonsters();
        var unlimited = (this.bounceRange === 0); // 0 = 사정거리 제한 없음
        var rangeSq = unlimited ? 0 : (this.bounceRange * this.bounceRange);
        var monstersInRange = [];
        var unhitInRange = [];
        for (var i = 0; i < monsters.length; i++) {
            var m = monsters[i];
            if (!m.active || m.hp <= 0) continue;
            var inRange = unlimited;
            if (!unlimited) {
                var mdx = m.x - hitX;
                var mdy = m.y - hitY;
                inRange = (mdx * mdx + mdy * mdy <= rangeSq);
            }
            if (inRange) {
                monstersInRange.push(m);
                if (this.hitEnemies.indexOf(m.instanceId) === -1) {
                    unhitInRange.push(m);
                }
            }
        }

        if (unhitInRange.length > 0) {
            // [Case 3] 미타격 적 존재: 가장 가까운 적 추적
            var nextTarget = this._findClosest(unhitInRange, hitX, hitY);
            this.target = nextTarget;
            this.targetInstanceId = nextTarget.instanceId;
            this.isReturningToTower = false;
        } else if (monstersInRange.length === 0) {
            // 범위 내 적 없음: 소멸
            this._chainRelease();
            return;
        } else if (monstersInRange.length === 1) {
            // [Case 1] 적 1마리: 타워 핑퐁
            this.hitEnemies = [];
            if (this.originTower && this.originTower.active) {
                this.isReturningToTower = true;
                this.target = null;
                this.targetInstanceId = null;
            } else {
                this.target = monstersInRange[0];
                this.targetInstanceId = monstersInRange[0].instanceId;
                this.isReturningToTower = false;
            }
        } else {
            // [Case 2] 전부 타격됨: hitEnemies 초기화 후 재탐색
            this.hitEnemies = [];
            var nextTarget = this._findClosest(monstersInRange, hitX, hitY);
            this.target = nextTarget;
            this.targetInstanceId = nextTarget.instanceId;
            this.isReturningToTower = false;
        }

    } else {
        // ── 이동 중 ──
        var dist = Math.sqrt(distSq);
        var actualMove = Math.min(moveAmount, dist);
        this.x += (dx / dist) * actualMove;
        this.y += (dy / dist) * actualMove;
        this.rotation = Math.atan2(dy, dx);
    }
};

// ── 체인 라이트닝 헬퍼: 활성 몬스터 목록 ──
Game.Projectile.prototype._getActiveMonsters = function() {
    if (Game.MonsterPool && Game.MonsterPool._group) {
        return Game.MonsterPool._group.getChildren();
    }
    return [];
};

// ── 체인 라이트닝 헬퍼: 가장 가까운 타겟 찾기 ──
Game.Projectile.prototype._findClosest = function(candidates, fromX, fromY) {
    var best = null;
    var bestDistSq = Infinity;
    for (var i = 0; i < candidates.length; i++) {
        var c = candidates[i];
        var cdx = c.x - fromX;
        var cdy = c.y - fromY;
        var cDistSq = cdx * cdx + cdy * cdy;
        if (cDistSq < bestDistSq) {
            bestDistSq = cDistSq;
            best = c;
        }
    }
    return best;
};

// ── 체인 라이트닝 헬퍼: bounceRange 내 미타격 적 탐색 ──
// bounceRange === 0 이면 사정거리 무제한 (전체 맵 탐색)
Game.Projectile.prototype._findChainTarget = function(fromX, fromY) {
    var monsters = this._getActiveMonsters();
    var unlimited = (this.bounceRange === 0);
    var rangeSq = unlimited ? 0 : (this.bounceRange * this.bounceRange);
    var candidates = [];
    for (var i = 0; i < monsters.length; i++) {
        var m = monsters[i];
        if (!m.active || m.hp <= 0) continue;
        if (this.hitEnemies.indexOf(m.instanceId) !== -1) continue;
        if (!unlimited) {
            var mdx = m.x - fromX;
            var mdy = m.y - fromY;
            if (mdx * mdx + mdy * mdy > rangeSq) continue;
        }
        candidates.push(m);
    }
    if (candidates.length > 0) {
        return this._findClosest(candidates, fromX, fromY);
    }
    // 미타격 적 없으면 hitEnemies 초기화 후 재탐색
    this.hitEnemies = [];
    candidates = [];
    for (var j = 0; j < monsters.length; j++) {
        var m2 = monsters[j];
        if (!m2.active || m2.hp <= 0) continue;
        if (!unlimited) {
            var m2dx = m2.x - fromX;
            var m2dy = m2.y - fromY;
            if (m2dx * m2dx + m2dy * m2dy > rangeSq) continue;
        }
        candidates.push(m2);
    }
    if (candidates.length > 0) {
        return this._findClosest(candidates, fromX, fromY);
    }
    return null;
};

// ── 체인 라이트닝 투사체 소멸 ──
Game.Projectile.prototype._chainRelease = function() {
    this.hit = true;
    this.setActive(false);
    this.setVisible(false);
};

window.Game = Game;
