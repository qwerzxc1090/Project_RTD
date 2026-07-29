var Game = window.Game || {};

// ── 스킬 네임스페이스 ──
Game.Skills = Game.Skills || {};

// ==========================================
// BaseSkill (모든 스킬의 기본 부모 클래스)
// ==========================================
Game.Skills.BaseSkill = function(skillData) {
    this.skillData = skillData;
};

Game.Skills.BaseSkill.prototype.execute = function(tower, target, monsters) {
    // 하위 클래스에서 오버라이드하여 구현
};

// ==========================================
// SingleShotSkill (기본 단일 발사 스킬)
// ==========================================
Game.Skills.SingleShotSkill = function(skillData) {
    Game.Skills.BaseSkill.call(this, skillData);
};
Game.Skills.SingleShotSkill.prototype = Object.create(Game.Skills.BaseSkill.prototype);
Game.Skills.SingleShotSkill.prototype.constructor = Game.Skills.SingleShotSkill;

Game.Skills.SingleShotSkill.prototype.execute = function(tower, target, monsters) {
    if (!target || target.hp <= 0) return;
    
    // 투사체 생성 (풀에서 획득) — originTower 전달 (독 등 per-tower 추적용)
    Game.ProjectilePool.acquire(
        tower.x, tower.y,
        target,
        tower.unitData,
        this.skillData,
        tower           // originTower
    );
};

// ==========================================
// MultiShotSkill (다중 발사 스킬 - 향후 확장 예시)
// ==========================================
Game.Skills.MultiShotSkill = function(skillData, targetCount) {
    Game.Skills.BaseSkill.call(this, skillData);
    this.targetCount = targetCount || 3;
};
Game.Skills.MultiShotSkill.prototype = Object.create(Game.Skills.BaseSkill.prototype);
Game.Skills.MultiShotSkill.prototype.constructor = Game.Skills.MultiShotSkill;

Game.Skills.MultiShotSkill.prototype.execute = function(tower, target, monsters) {
    // 가장 가까운 N개의 타겟을 찾아 각각 발사하는 로직 (CombatSystem 활용 가능)
    // 현재는 예시 구조만 제공
};

// ==========================================
// ChainLightningSkill (연쇄 번개 스킬)
// - 투사체가 bounceCount만큼 적 사이를 연쇄 타격
// - originTower 참조를 투사체에 주입
// ==========================================
Game.Skills.ChainLightningSkill = function(skillData) {
    Game.Skills.BaseSkill.call(this, skillData);
};
Game.Skills.ChainLightningSkill.prototype = Object.create(Game.Skills.BaseSkill.prototype);
Game.Skills.ChainLightningSkill.prototype.constructor = Game.Skills.ChainLightningSkill;

Game.Skills.ChainLightningSkill.prototype.execute = function(tower, target, monsters) {
    if (!target || target.hp <= 0) return;
    
    // 체인 라이트닝 투사체 생성 (originTower 주입)
    Game.ProjectilePool.acquire(
        tower.x, tower.y,
        target,
        tower.unitData,
        this.skillData,
        tower           // originTower: 타워 핑퐁을 위해 자신을 발사한 타워 참조 전달
    );
};

// ==========================================
// PoisonDotSkill (지속 피해 — 독 중첩 스킬)
// - category: "duration" 계열
// - 투사체 적중 시 Monster.applyPoison() 호출은 Projectile에서 처리
// - originTower 참조를 투사체에 주입
// ==========================================
Game.Skills.PoisonDotSkill = function(skillData) {
    Game.Skills.BaseSkill.call(this, skillData);
};
Game.Skills.PoisonDotSkill.prototype = Object.create(Game.Skills.BaseSkill.prototype);
Game.Skills.PoisonDotSkill.prototype.constructor = Game.Skills.PoisonDotSkill;

Game.Skills.PoisonDotSkill.prototype.execute = function(tower, target, monsters) {
    if (!target || target.hp <= 0) return;
    
    // 독 투사체 생성 (originTower 주입 — per-tower 독 추적용)
    Game.ProjectilePool.acquire(
        tower.x, tower.y,
        target,
        tower.unitData,
        this.skillData,
        tower           // originTower
    );
};

// ==========================================
// GoldFarmSkill (앱벌이 — N회 공격마다 골드 획득)
// - category: "instant" 유지 (투사체 정상 동작)
// - tower 객체에 goldAttackCount 커운터 저장
// - attacksToReward 회수 도달 시 addGoldReward 이벤트 emit
// ==========================================
Game.Skills.GoldFarmSkill = function(skillData) {
    Game.Skills.BaseSkill.call(this, skillData);
};
Game.Skills.GoldFarmSkill.prototype = Object.create(Game.Skills.BaseSkill.prototype);
Game.Skills.GoldFarmSkill.prototype.constructor = Game.Skills.GoldFarmSkill;

Game.Skills.GoldFarmSkill.prototype.execute = function(tower, target, monsters) {
    if (!target || target.hp <= 0) return;

    var sd = this.skillData;

    // ── goldCurrentReward 초기화 (타워 최초 공격 시 한 번만) ──
    if (tower.goldCurrentReward === undefined) {
        tower.goldCurrentReward = sd.goldReward;
    }

    // 골드 획득량이 0이 된 타워는 투사체만 발사 (골드바 없음)
    if (tower.goldCurrentReward <= 0) {
        Game.ProjectilePool.acquire(tower.x, tower.y, target, tower.unitData, sd, tower);
        return;
    }

    // 공격 카운터 증가
    tower.goldAttackCount = (tower.goldAttackCount || 0) + 1;

    // 보상 도달 확인
    if (tower.goldAttackCount >= sd.attacksToReward) {
        tower.goldAttackCount = 0;

        // 이번 스택의 골드 지급 (소수점 버림)
        var reward = Math.floor(tower.goldCurrentReward);
        if (tower.scene) {
            tower.scene.events.emit('addGoldReward', reward, tower.x, tower.y);
        }

        // ── 다음 스택 획득량 계산 (goldRewardDelta % 단순 누적) ──
        var delta = (sd.goldRewardDelta !== undefined ? sd.goldRewardDelta : 0);
        if (delta !== 0) {
            tower.goldDeltaAccum = (tower.goldDeltaAccum || 0) + delta;
            tower.goldCurrentReward = sd.goldReward * Math.max(0, 1 + tower.goldDeltaAccum / 100);
        }

        // 이전 스택이 최소 보정(1G)이었으면 → 이번 지급 완료 후 비활성화
        if (tower._goldLastStack) {
            tower.goldCurrentReward = 0;
            if (tower._deactivateGoldBar) tower._deactivateGoldBar();
        }
        // 정확히 0 → 즉시 비활성화
        else if (tower.goldCurrentReward <= 0) {
            tower.goldCurrentReward = 0;
            if (tower._deactivateGoldBar) tower._deactivateGoldBar();
        }
        // 0 초과 1 미만 (0.xxx) → 1G로 보정, 마지막 스택 플래그
        else if (tower.goldCurrentReward > 0 && tower.goldCurrentReward < 1) {
            tower.goldCurrentReward = 1;
            tower._goldLastStack = true;
            if (tower._updateGoldBar) tower._updateGoldBar(0, sd.attacksToReward);
        }
        else {
            // 정상 진행: 진행도 바 리셋 플래시
            if (tower._updateGoldBar) tower._updateGoldBar(0, sd.attacksToReward);
        }

    } else {
        // 진행도 바 갱신
        if (tower._updateGoldBar) tower._updateGoldBar(tower.goldAttackCount, sd.attacksToReward);
    }

    // 투사체 발사
    Game.ProjectilePool.acquire(
        tower.x, tower.y,
        target,
        tower.unitData,
        sd,
        tower
    );
};

// ==========================================
// SkillFactory (데이터에 따라 스킬 객체 생성)
// ── 라우팅 우선순위 ──
// 1. nameEn 매칭 (CHAIN_ATTACK, POISON_DOT 등)
// 2. category 매칭 (duration → 기본 SingleShot 폴백)
// 3. 기본값: SingleShotSkill
// ==========================================
Game.SkillFactory = {
    create: function(skillId) {
        var skillData = Game.SkillData.getSkill(skillId);
        
        if (!skillData) return new Game.Skills.SingleShotSkill(Game.SkillData.getSkill(2));
        
        // ── nameEn 기반 라우팅 ──
        switch (skillData.nameEn) {
            case 'CHAIN_ATTACK':
                return new Game.Skills.ChainLightningSkill(skillData);
            case 'POISON_DOT':
                return new Game.Skills.PoisonDotSkill(skillData);
            case 'GOLD_FARM':
                return new Game.Skills.GoldFarmSkill(skillData);
        }
        
        // ── category 기반 폴백 ──
        // 새로운 duration 스킬이 nameEn 매칭 없이 추가되더라도
        // category: "duration" 이면 SingleShotSkill로 동작 (치명타만 자동 비활성화)
        // 향후 전용 클래스를 만들면 위 switch에 추가
        
        // 기본: 단일 발사 스킬
        return new Game.Skills.SingleShotSkill(skillData);
    }
};

window.Game = Game;
