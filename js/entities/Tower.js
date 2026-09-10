var Game = window.Game || {};

Game.Tower = function(scene, x, y, unitData) {
    Phaser.GameObjects.Container.call(this, scene, x, y);
    
    this.scene = scene;
    this.towerId = ++Game.Tower._idCounter;  // 개별 타워 인스턴스 고유 식별자
    this.unitData = unitData;
    this.attackTimer = 0;
    this.target = null;
    this.isPlaced = false;
    this.gridX = -1;
    this.gridY = -1;
    this.rangeCircle = null;
    this.showingRange = false;
    this.goldFarmComplete = false;
    
    // ── 스킬 모듈 장착 (Composition) ──
    this.skills = [];
    if (Game.SkillFactory) {
        // 우선 기본 스킬 1개 장착 (향후 배열로 다중 장착 가능)
        this.skills.push(Game.SkillFactory.create(this.unitData.skillId));
    }
    
    this._createVisual();
    this._setupInteraction();
    
    scene.add.existing(this);
};

// ── 타워 고유 ID 카운터 (생성자 정의 후 설정) ──
Game.Tower._idCounter = 0;

Game.Tower.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.Tower.prototype.constructor = Game.Tower;


Game.Tower.prototype._createVisual = function() {
    var g = this.scene.add.graphics();
    var size = Game.Config.TOWER.SIZE;   // 16
    var half = size / 2;                 // 8
    var tierColor  = Game.Config.COLORS.TIER[this.unitData.tier];
    var attackColor = Game.Config.COLORS.ATTACK_TYPE[this.unitData.attackType];

    var type = this.unitData.attackType;

    // 공격 타입별 디자인 분기
    if (type === 'vibration') {
        // ── 1. 진동 (원형 스피커/레이더 형태) ──
        g.fillStyle(tierColor, 1);
        g.fillCircle(0, 0, half);
        g.lineStyle(1, 0xFFFFFF, 0.5);
        g.strokeCircle(0, 0, half);
        
        g.fillStyle(tierColor, 0.55);
        g.fillCircle(0, 0, half - 2);

        // 진동 코어 (상단 초록색)
        g.fillStyle(attackColor, 1);
        g.fillCircle(0, -4, 2);

        // 눈 (동그란 형태)
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-3, 1, 1.5);
        g.fillCircle(3, 1, 1.5);
        g.fillStyle(0x000000, 1);
        g.fillCircle(-3, 1, 0.8);
        g.fillCircle(3, 1, 0.8);

        // 입 (작은 원형)
        g.fillStyle(0x000000, 0.5);
        g.fillCircle(0, 4, 1.5);

    } else if (type === 'explosive') {
        // ── 2. 폭발 (삼각형 포탑 형태) ──
        g.fillStyle(tierColor, 1);
        g.fillTriangle(0, -9, -9, 7, 9, 7);
        g.lineStyle(1, 0xFFFFFF, 0.5);
        g.strokeTriangle(0, -9, -9, 7, 9, 7);
        
        g.fillStyle(tierColor, 0.55);
        g.fillTriangle(0, -6, -6, 5, 6, 5);

        // 폭발 코어 (상단 빨간색 뾰족)
        g.fillStyle(attackColor, 1);
        g.fillTriangle(0, -9, -3, -4, 3, -4);

        // 화난 눈 (사각형 기울임 느낌)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRect(-4, 0, 3, 2);
        g.fillRect(1, 0, 3, 2);
        g.fillStyle(0x000000, 1);
        g.fillRect(-3, 0, 1.5, 1.5);
        g.fillRect(1.5, 0, 1.5, 1.5);

        // 입 (일자)
        g.fillStyle(0x000000, 0.5);
        g.fillRect(-2, 4, 4, 1);

    } else if (this.unitData.skillId === 4) {
        // ── 3. 일반_연 (다이아몬드 + 번개 코어) ──
        var chainColor = 0x00CCFF;  // 연쇄 번개 청록색

        // 외부 다이아몬드
        g.fillStyle(tierColor, 1);
        g.beginPath();
        g.moveTo(0, -9);
        g.lineTo(9, 0);
        g.lineTo(0, 9);
        g.lineTo(-9, 0);
        g.closePath();
        g.fillPath();
        g.lineStyle(1.5, chainColor, 0.9);
        g.strokePath();

        // 내부 다이아몬드 (반투명)
        g.fillStyle(tierColor, 0.5);
        g.beginPath();
        g.moveTo(0, -6);
        g.lineTo(6, 0);
        g.lineTo(0, 6);
        g.lineTo(-6, 0);
        g.closePath();
        g.fillPath();

        // 번개 코어 (청록 지그재그 Z 모양)
        g.fillStyle(chainColor, 1);
        g.beginPath();
        g.moveTo(1.5, -5);
        g.lineTo(-1,  -1);
        g.lineTo(1,   -1);
        g.lineTo(-1.5, 5);
        g.lineTo(1,    1);
        g.lineTo(-1,   1);
        g.closePath();
        g.fillPath();

        // 눈 (작게)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRect(-3.5, -2, 1.5, 1.5);
        g.fillRect(2,    -2, 1.5, 1.5);
        g.fillStyle(0x000000, 1);
        g.fillRect(-3.5, -2, 0.8, 0.8);
        g.fillRect(2,    -2, 0.8, 0.8);

    } else {
        // ── 4. 일반 (별 형태) ──
        var drawStar = function(outR, inR) {
            g.beginPath();
            for (var i = 0; i < 10; i++) {
                var r = (i % 2 === 0) ? outR : inR;
                var a = -Math.PI / 2 + (i * Math.PI / 5);
                var px = Math.cos(a) * r;
                var py = Math.sin(a) * r;
                if (i === 0) g.moveTo(px, py);
                else g.lineTo(px, py);
            }
            g.closePath();
        };

        g.fillStyle(tierColor, 1);
        drawStar(9, 4);
        g.fillPath();
        g.lineStyle(1, 0xFFFFFF, 0.5);
        g.strokePath();

        g.fillStyle(tierColor, 0.55);
        drawStar(6, 2.5);
        g.fillPath();

        // 일반 코어 (별 상단 부분 강조)
        g.fillStyle(attackColor, 1);
        g.beginPath();
        g.moveTo(0, -9);
        g.lineTo(2, -4);
        g.lineTo(-2, -4);
        g.closePath();
        g.fillPath();

        // 눈 (작게)
        g.fillStyle(0xFFFFFF, 1);
        g.fillRect(-3.5, -1, 1.5, 1.5);
        g.fillRect(2, -1, 1.5, 1.5);
        g.fillStyle(0x000000, 1);
        g.fillRect(-3.5, -1, 0.8, 0.8);
        g.fillRect(2, -1, 0.8, 0.8);

        // 입 (작게)
        g.fillStyle(0x000000, 0.5);
        g.fillRect(-1.5, 2, 3, 1);
    }

    this.add(g);
    this.bodyGraphics = g;

    // 등급 표시 라벨 삭제됨 (사용자 요청)

    // 사거리 원 (클릭 시 표시)
    this.rangeCircle = this.scene.add.graphics();
    this.rangeCircle.lineStyle(1, tierColor, 0.3);
    this.rangeCircle.fillStyle(tierColor, 0.05);
    this.rangeCircle.strokeCircle(0, 0, this.unitData.range);
    this.rangeCircle.fillCircle(0, 0, this.unitData.range);
    this.rangeCircle.setVisible(false);
    this.add(this.rangeCircle);

    // GOLD_FARM 스킬 타워: 진행도 바 생성
    this.goldBar       = null;
    this.goldBarBlink  = null;
    if (Game.SkillData) {
        var sd = Game.SkillData.getSkill(this.unitData.skillId);
        if (sd && sd.nameEn === 'GOLD_FARM') {
            this._createGoldBar(sd.attacksToReward || 100);
        }
    }

    this.setSize(size + 2, size + 8);
};


Game.Tower.prototype._setupInteraction = function() {
    this.setInteractive({ draggable: false, useHandCursor: true });

    var self = this;

    // 사정거리 토글 (클릭)
    this.on('pointerdown', function() {
        self.showingRange = !self.showingRange;
        self.rangeCircle.setVisible(self.showingRange);
    });

    // 호버: 타워 이름 툴팁 + GOLD_FARM 골드 표시
    this.on('pointerover', function() {
        self._showNameTooltip();
        self._showGoldTooltip();
    });
    this.on('pointerout', function() {
        self._hideNameTooltip();
        self._hideGoldTooltip();
    });
};

// ── 타워 이름 툴팁 ──
Game.Tower.prototype._showNameTooltip = function() {
    this._hideNameTooltip();

    var ud = this.unitData;
    var name = ud.name || ud.id;
    var DEPTH = 500;

    var tipX = this.x;
    var tipY = this.y - 14;

    // 등급 색상
    var tierColor = '#' + (Game.Config.COLORS.TIER[ud.tier] || 0xFFFFFF).toString(16).padStart(6, '0');

    var label = this.scene.add.text(tipX, tipY, name, {
        fontSize: '9px', fontFamily: 'Oxanium', fontStyle: 'bold',
        color: tierColor, stroke: '#000000', strokeThickness: 2
    }).setOrigin(0.5).setDepth(DEPTH);

    label.setAlpha(0);
    this.scene.tweens.add({ targets: label, alpha: 1, duration: 80, ease: 'Power1' });

    this._nameTooltipObj = label;
};

Game.Tower.prototype._hideNameTooltip = function() {
    if (!this._nameTooltipObj) return;
    var obj = this._nameTooltipObj;
    this._nameTooltipObj = null;
    this.scene.tweens.add({
        targets: obj, alpha: 0, duration: 80,
        onComplete: function() { if (obj && obj.active) obj.destroy(); }
    });
};

// ── GOLD_FARM 호버: 다음 스택 완료 시 획득 골드량만 심플 표시 ──
Game.Tower.prototype._showGoldTooltip = function() {
    var sd = Game.SkillData ? Game.SkillData.getSkill(this.unitData.skillId) : null;
    if (!sd || sd.nameEn !== 'GOLD_FARM') return;

    this._hideGoldTooltip(); // 중복 방지

    var cur  = (this.goldCurrentReward !== undefined) ? this.goldCurrentReward : sd.goldReward;
    var curG = Math.max(1, Math.floor(cur));
    if (cur <= 0) return; // 이미 비활성화

    var DEPTH = 500;

    // 타워 위에 작은 라벨 표시
    var tipX = this.x;
    var tipY = this.y - 22;

    var label = this.scene.add.text(tipX, tipY, curG + 'G', {
        fontSize: '11px', fontFamily: 'Oxanium', fontStyle: 'bold',
        color: '#FFD700', stroke: '#000000', strokeThickness: 3
    }).setOrigin(0.5).setDepth(DEPTH);

    // fade-in
    label.setAlpha(0);
    this.scene.tweens.add({ targets: label, alpha: 1, duration: 100, ease: 'Power1' });

    this._goldTooltipObjs = [label];
};

Game.Tower.prototype._hideGoldTooltip = function() {
    if (!this._goldTooltipObjs) return;
    var objs = this._goldTooltipObjs;
    this._goldTooltipObjs = null;
    this.scene.tweens.add({
        targets: objs, alpha: 0, duration: 100,
        onComplete: function() { objs.forEach(function(o) { if (o && o.active) o.destroy(); }); }
    });
};


Game.Tower.prototype.placeOnGrid = function(gridX, gridY, worldX, worldY) {
    this.gridX = gridX;
    this.gridY = gridY;
    this.setPosition(worldX, worldY);
    this.isPlaced = true;
};

Game.Tower.prototype.update = function(time, delta, monsters) {
    if (!this.isPlaced || !this.active) return;
    
    this.attackTimer += delta;
    
    if (this.attackTimer >= this.unitData.attackSpeed) {
        var target = Game.CombatSystem.findTarget(this, monsters);
        if (target) {
            // 무한 루프 방지: attackSpeed가 0 이하면 최소 10ms로 강제 설정
            var atkSpeed = this.unitData.attackSpeed > 0 ? this.unitData.attackSpeed : 10;
            
            // 6x 초고속 모드에서 프레임당 축적된 시간이 쿨다운을 초과할 경우 딜로스 방지를 위해 반복 발사
            var attacksThisFrame = 0;
            while (this.attackTimer >= atkSpeed && attacksThisFrame < 5) {
                this.attack(target);
                this.attackTimer -= atkSpeed;
                attacksThisFrame++;
            }
            // 과도한 지연(탭 비활성화 등)으로 타이머가 너무 많이 쌓인 경우 타이머 상한선 적용 (프리징 방지)
            if (this.attackTimer > atkSpeed) {
                this.attackTimer = atkSpeed;
            }
        } else {
            // 타겟이 없을 때 쿨다운이 무한히 누적되어 한 번에 폭사하는 것을 방지
            if (this.attackTimer > this.unitData.attackSpeed) {
                this.attackTimer = this.unitData.attackSpeed;
            }
        }
    }
};

Game.Tower.prototype.attack = function(target) {
    // ── 장착된 스킬 모듈 순차 실행 ──
    if (this.skills && this.skills.length > 0) {
        var monsters = Game.MonsterPool ? Game.MonsterPool._group.getChildren() : [];
        for (var i = 0; i < this.skills.length; i++) {
            this.skills[i].execute(this, target, monsters);
        }
    } else {
        // Fallback: 스킬 모듈 초기화 실패 시 기존 로직 수행
        var skill = Game.SkillData.getSkill(this.unitData.skillId);
        Game.ProjectilePool.acquire(
            this.x, this.y,
            target,
            this.unitData,
            skill
        );
    }

    // 공격 애니메이션 - scaleX/Y 직접 조작 (Tween 생성 비용 회피)
    this.bodyGraphics.scaleX = 1.15;
    this.bodyGraphics.scaleY = 1.15;
    var self = this;
    if (!this._atkResetTimer) {
        this._atkResetTimer = this.scene.time.delayedCall(50, function() {
            if (self && self.bodyGraphics) {
                self.bodyGraphics.scaleX = 1;
                self.bodyGraphics.scaleY = 1;
            }
            self._atkResetTimer = null;
        });
    }
};

Game.Tower.prototype.showRange = function(visible) {
    this.showingRange = visible;
    this.rangeCircle.setVisible(visible);
};

// ── GOLD_FARM 진행도 바 ──────────────────────────────────────────
// 씬 레벨 객체로 생성 → depth 200으로 항상 타워 위에 렌더
Game.Tower.prototype._createGoldBar = function(totalAttacks) {
    var BAR_W  = 20;   // 바 전체 너비 (px)
    var BAR_H  = 3;    // 바 높이 (px)
    var BAR_Y  = 13;   // 타워 중심에서 아래 오프셋
    var GAP    = 1;    // 1줄과 2줄 사이 간격

    // ── 1줄: 스택 진행도 바 배경 ──
    var bg = this.scene.add.graphics();
    bg.fillStyle(0x3A2000, 0.85);
    bg.fillRect(this.x - BAR_W / 2, this.y + BAR_Y, BAR_W, BAR_H);
    bg.setDepth(200);
    this.goldBarBg = bg;

    // 1줄: 스택 진행도 바
    var bar = this.scene.add.graphics();
    bar.setDepth(201);
    this.goldBar = bar;
    this.goldBar._bgW   = BAR_W;
    this.goldBar._bgH   = BAR_H;
    this.goldBar._bgY   = BAR_Y;
    this.goldBar._total = totalAttacks || 100;
    this.goldBar._ratio = 0;
    bar.clear();

    // ── 2줄: 획득량 변화율 게이지 (goldRewardDelta가 있는 타워만) ──
    var sd = Game.SkillData ? Game.SkillData.getSkill(this.unitData.skillId) : null;
    if (sd && sd.goldRewardDelta && sd.goldRewardDelta !== 0) {
        var deltaY = BAR_Y + BAR_H + GAP;

        // 2줄 배경
        var deltaBg = this.scene.add.graphics();
        deltaBg.fillStyle(0x1a1a1a, 0.85);
        deltaBg.fillRect(this.x - BAR_W / 2, this.y + deltaY, BAR_W, BAR_H);
        deltaBg.setDepth(200);
        this.goldDeltaBg = deltaBg;

        // 2줄 게이지 (초기: 100% 채움)
        var deltaBar = this.scene.add.graphics();
        deltaBar.setDepth(201);
        deltaBar.fillStyle(0x44FF44, 1);
        deltaBar.fillRect(this.x - BAR_W / 2, this.y + deltaY, BAR_W, BAR_H);
        this.goldDeltaBar = deltaBar;
        this.goldDeltaBar._bgW = BAR_W;
        this.goldDeltaBar._bgH = BAR_H;
        this.goldDeltaBar._bgY = deltaY;
    }
};

Game.Tower.prototype._updateGoldBar = function(count, total) {
    if (!this.goldBar) return;

    var bar    = this.goldBar;
    var BAR_W  = bar._bgW;
    var BAR_H  = bar._bgH;
    var BAR_Y  = bar._bgY;
    // 씬 레벨 절대 좌표 기준
    var bx     = this.x - BAR_W / 2;
    var by     = this.y + BAR_Y;
    var ratio  = Math.min(count / Math.max(total, 1), 1);
    bar._ratio = ratio;

    var fillW = Math.max(1, Math.floor(BAR_W * ratio));

    // 90% 이상이면 흰 금색, 아니면 기본 금색
    var color = ratio >= 0.9 ? 0xFFFFCC : 0xFFD700;

    bar.clear();
    bar.fillStyle(color, 1);
    bar.fillRect(bx, by, fillW, BAR_H);

    // 90% 도달 시 깜빡임 시작
    if (ratio >= 0.9 && !this.goldBarBlink) {
        var self = this;
        this.goldBarBlink = this.scene.tweens.add({
            targets: bar,
            alpha: 0.3,
            yoyo: true,
            repeat: -1,
            duration: 200,
            ease: 'Sine.easeInOut'
        });
    } else if (ratio < 0.9 && this.goldBarBlink) {
        this.goldBarBlink.stop();
        this.goldBarBlink = null;
        bar.alpha = 1;
    }

    // 리셋(count===0) 시 순간 흰색 플래시
    if (count === 0 && this.scene) {
        bar.clear();
        bar.fillStyle(0xFFFFFF, 1);
        bar.fillRect(bx, by, BAR_W, BAR_H);
        var self = this;
        this.scene.time.delayedCall(120, function() {
            if (self.goldBar) {
                self.goldBar.clear();
                self.goldBar.alpha = 1;
            }
        });

        // ── 2줄 획득량 변화율 게이지 갱신 ──
        this._updateDeltaBar();
    }
};

// ── 2줄 획득량 변화율 게이지 갱신 ──
Game.Tower.prototype._updateDeltaBar = function() {
    if (!this.goldDeltaBar) return;

    var sd = Game.SkillData ? Game.SkillData.getSkill(this.unitData.skillId) : null;
    if (!sd || !sd.goldReward) return;

    var cur  = (this.goldCurrentReward !== undefined) ? this.goldCurrentReward : sd.goldReward;
    var orig = sd.goldReward;
    var pct  = Math.max(0, Math.min(1, cur / orig));

    var dBar = this.goldDeltaBar;
    var W    = dBar._bgW;
    var H    = dBar._bgH;
    var Y    = dBar._bgY;
    var bx   = this.x - W / 2;
    var by   = this.y + Y;
    var fillW = Math.max(0, Math.floor(W * pct));

    // 색상: 남은 비율에 따라 초록 → 노랑 → 주황 → 빨강
    var color;
    if      (pct >= 0.6) color = 0x44FF44;   // 초록
    else if (pct >= 0.4) color = 0xCCDD00;   // 노랑
    else if (pct >= 0.2) color = 0xFF9900;   // 주황
    else                 color = 0xFF2200;   // 빨강

    dBar.clear();
    if (fillW > 0) {
        dBar.fillStyle(color, 1);
        dBar.fillRect(bx, by, fillW, H);
    }
};

// ── 골드 획득량 0% 도달 시 골드바 영구 제거 ──
Game.Tower.prototype._deactivateGoldBar = function() {
    // 깜빡임 중단
    if (this.goldBarBlink) {
        this.goldBarBlink.stop();
        this.goldBarBlink = null;
    }
    // 1줄 진행바 제거
    if (this.goldBar) {
        this.goldBar.destroy();
        this.goldBar = null;
    }
    // 1줄 배경바 제거
    if (this.goldBarBg) {
        this.goldBarBg.destroy();
        this.goldBarBg = null;
    }
    // 2줄 획득량 게이지 제거
    if (this.goldDeltaBar) {
        this.goldDeltaBar.destroy();
        this.goldDeltaBar = null;
    }
    if (this.goldDeltaBg) {
        this.goldDeltaBg.destroy();
        this.goldDeltaBg = null;
    }
};

// 일반 _돈 타워는 골드 파밍을 마친 뒤부터 합성 재료로 인정한다.
Game.Tower.prototype._completeGoldFarm = function() {
    if (this.goldFarmComplete) return;
    this.goldFarmComplete = true;
    this._deactivateGoldBar();
    if (this.scene && this.scene.gachaUI && this.scene.gachaUI.updateSynthesisAvailability) {
        this.scene.gachaUI.updateSynthesisAvailability();
    }
};

window.Game = Game;
