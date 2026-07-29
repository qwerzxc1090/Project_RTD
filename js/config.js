var Game = window.Game || {};

Game.Config = {
    // Display
    WIDTH: 1280,
    HEIGHT: 720,
    TILE_SIZE: 40,
    
    // Square field layout - monsters walk along the border of this square (counter-clockwise)
    FIELD: {
        // The square path center and dimensions
        CENTER_X: 640,
        CENTER_Y: 320,
        SIZE: 440,          // Square side length (outer edge of the path)
        PATH_WIDTH: 36,     // Width of the path the monsters walk on
        
        // Computed corners (outer) - counter-clockwise from 12 o'clock (top-center)
        // Spawn = top-center
        // Direction: top-center -> top-left -> bottom-left -> bottom-right -> top-right -> top-center (CCW)
        get LEFT()   { return this.CENTER_X - this.SIZE / 2; },
        get RIGHT()  { return this.CENTER_X + this.SIZE / 2; },
        get TOP()    { return this.CENTER_Y - this.SIZE / 2; },
        get BOTTOM() { return this.CENTER_Y + this.SIZE / 2; },
        
        // Spawn point at 12 o'clock (top-center)
        get SPAWN_X() { return this.CENTER_X; },
        get SPAWN_Y() { return this.TOP; },
        
        // Waypoints for CCW movement starting from 12 o'clock (top-center)
        getWaypoints: function() {
            return [
                { x: this.LEFT,  y: this.TOP },       // Top-left corner
                { x: this.LEFT,  y: this.BOTTOM },     // Bottom-left corner
                { x: this.RIGHT, y: this.BOTTOM },     // Bottom-right corner
                { x: this.RIGHT, y: this.TOP },        // Top-right corner
                { x: this.CENTER_X, y: this.TOP }      // Back to spawn (12 o'clock)
            ];
        }
    },
    
    // Tower placement slots
    TOWER_PLACEMENT: {
        SLOT_SIZE: 34,      // 12×12 그리드 기준 (spacing=36, margin=4)
        OFFSET: 30,
    },
    
    // Economy
    INITIAL_GOLD: 1000,
    GACHA_COST: 100,
    ROUND_BONUS_MULTIPLIER: 0,  // clearGoldBonus로 대체 — 비활성화
    
    // Player - lives = max monsters on field
    INITIAL_LIVES: 50,
    MAX_MONSTERS: 50,       // Game over if this many monsters on field
    
    // Rounds
    TOTAL_ROUNDS: 50,
    BOSS_INTERVAL: 5,
    SPAWN_INTERVAL: 2806,      // ms between monster spawns (100% 증가)

    // 라운드 사이 시작 딜레이 (ms)
    BETWEEN_ROUND_DELAY:            1000,   // 일반 → 일반: 1초
    BETWEEN_ROUND_DELAY_BOSS_START: 3000,   // 일반 → 보스 직전: 3초 (긴장감)
    BETWEEN_ROUND_DELAY_BOSS_END:   3000,   // 보스 완료 → 다음: 3초 (여운)
    
    // Combat
    CRITICAL_DAMAGE_RATIO: 0.5,
    
    // Gacha weights (9등급) — 정수 가중치 방식 (5자리, ×100000 기준)
    // 합계 99999 / 100000 = 100%에 근접. 태초 19/99999 ≈ 0.019% 정확 표현
    // 등급 제외 시 해당 값을 0으로 설정하면 자동 비례 재분배됨
    GACHA_RATES: {
        normal:     50000,  // 일반   50.000%  (50000/99999)
        rare:       33100,  // 레어   33.100%  (33100/99999)
        ancient:    10200,  // 고대   10.200%  (10200/99999)
        relic:       5100,  // 유물    5.100%  ( 5100/99999)
        saga:          800,  // 서사    0.800%  (  800/99999)
        legend:        500,  // 전설    0.500%  (  500/99999)
        epic:          200,  // 에픽    0.200%  (  200/99999)
        myth:           80,  // 신화    0.080%  (   80/99999)
        primordial:     19   // 태초    0.019%  (   19/99999)
        // 합계: 99999
    },
    
    // 이 등급 이상이면 특별 알림 표시 (전설 ~ 태초)
    LEGENDARY_THRESHOLD: ['legend', 'epic', 'myth', 'primordial'],
    
    // Type effectiveness
    // 일반 몬스터 방어 테이블 (공격타입 → 몬스터 크기)
    TYPE_EFFECTIVENESS: {
        //              소형(small) 일반형(general) 대형(large)
        normal:    { small: 1.00, general: 1.00, large: 1.00 },
        vibration: { small: 1.00, general: 0.50, large: 0.25 },
        explosive: { small: 0.50, general: 0.75, large: 1.00 },
        // ── 보스 전용 방어 테이블 (type: 'boss_normal' / 'boss_large' / 'boss_small') ──
        //   각 열은 공격타입: { boss_normal, boss_large, boss_small }
        //   boss_normal   : 모든 공격에 균등 저항 (0.8× — 기본 내구력 높음)
        //   boss_large: 일반/폭발에 강하고 진동에 취약 (폭발 0.6×, 진동 1.5×)
        //   boss_small: 진동에 강하고 일반/폭발에 취약 (진동 0.6×, 폭발 1.5×)
        //
        //                      보스_일반   보스_폭발   보스_진동
        normal_boss:   { boss_normal: 0.80, boss_large: 0.80, boss_small: 0.80 },
        vibration_boss:{ boss_normal: 0.80, boss_large: 1.50, boss_small: 0.60 },
        explosive_boss:{ boss_normal: 0.80, boss_large: 0.60, boss_small: 1.50 }
    },
    // 보스 방어 테이블 룩업: 공격타입 → boss_X 서브테이블
    // 일반 몬스터 크기별 방어 패턴과 동일한 수치 적용
    //   boss_normal (균형형) ↔ general : 일반=1.0, 폭발=0.75, 진동=0.50
    //   boss_large  (대형형) ↔ large   : 일반=1.0, 폭발=1.00, 진동=0.25 (진동에 강함)
    //   boss_small  (소형형) ↔ small   : 일반=1.0, 폭발=0.50, 진동=1.00 (폭발에 강함)
    BOSS_EFFECTIVENESS: {
        normal:    { boss_normal: 1.00, boss_large: 1.00, boss_small: 1.00 },
        explosive: { boss_normal: 0.75, boss_large: 1.00, boss_small: 0.50 },
        vibration: { boss_normal: 0.50, boss_large: 0.25, boss_small: 1.00 }
    },
    
    // Colors
    COLORS: {
        TIER: {
            normal:      0x888888,  // 회색
            rare:        0x228B22,  // 진초록
            ancient:     0x9900CC,  // 보라
            relic:       0xFF7F00,  // 주황
            saga:        0xC0C0C0,  // 은색
            legend:      0xFFE000,  // 노랑
            epic:        0x40E0D0,  // 청록
            myth:        0xFF3300,  // 밝은 빨강
            primordial:  0x00FFFF   // 시안
        },
        ATTACK_TYPE: {
            normal: 0xFFFFFF,
            explosive: 0xFF4444,
            vibration: 0x44FF44
        },
        MONSTER: {
            small:          0xFF6644,   // 소형: 주황 (원형)
            large:          0x4488FF,   // 대형: 파랑 (네모)
            general:          0xFF44CC,   // 혼합: 마젠타 (별형)
            boss:           0xDD1111,   // 보스(레거시): 진한 빨강
            boss_normal:    0xDD1111,   // 보스_일반: 빨강 다이아 (균형형)
            boss_large:     0x2288FF,   // 보스_대형: 파랑 다이아 (대형 방어 — 진동 0.25×)
            boss_small:     0x00CC66    // 보스_소형: 초록 다이아 (소형 방어 — 폭발 0.50×)
        },
        UI: {
            BACKGROUND: 0x0a0a0f,
            PANEL: 0x1a1a2e,
            PANEL_BORDER: 0x2a2a4e,
            TEXT: 0xFFFFFF,
            GOLD: 0xFFD700,
            HEALTH: 0xFF4444,
            PATH: 0x2a1a0a,
            PATH_BORDER: 0x3a2a1a,
            GRID: 0x1a1a2e,
            GRID_HOVER: 0x2a2a4e,
            GRID_VALID: 0x224422,
            GRID_INVALID: 0x442222
        }
    },
    
    // Tower defaults
    TOWER: {
        SIZE: 16,                  // 기존 32px → 16px (슬롯 1칸 = 20px에 맞게 축소)
        ATTACK_RANGE_BASE: 120,
    },
    
    // Monster defaults
    MONSTER: {
        SMALL_SIZE: 20,
        LARGE_SIZE: 32,
        BOSS_SIZE: 48,
        HP_BAR_WIDTH: 30,
        HP_BAR_HEIGHT: 4,
        HP_BAR_OFFSET_Y: -20
    },
    
    // Inventory
    INVENTORY: {
        MAX_SLOTS: 12,
        SLOT_SIZE: 48,
        PANEL_HEIGHT: 80
    }
};

// ── localStorage 오버라이드 (tools/data-editor.html 에서 저장) ──
(function() {
    try {
        var raw = localStorage.getItem('rtd_configOverride');
        if (!raw) return;
        var ov = JSON.parse(raw);

        // 단순 숫자 설정
        var simpleKeys = ['INITIAL_GOLD','GACHA_COST','ROUND_BONUS_MULTIPLIER',
                          'INITIAL_LIVES','MAX_MONSTERS','TOTAL_ROUNDS','SPAWN_INTERVAL', 'CRITICAL_DAMAGE_RATIO'];
        for (var i = 0; i < simpleKeys.length; i++) {
            var k = simpleKeys[i];
            if (ov[k] !== undefined) Game.Config[k] = ov[k];
        }

        // 가차 확률
        if (ov.GACHA_RATES) {
            var tiers = Object.keys(Game.Config.GACHA_RATES);
            for (var t = 0; t < tiers.length; t++) {
                if (ov.GACHA_RATES[tiers[t]] !== undefined) {
                    Game.Config.GACHA_RATES[tiers[t]] = ov.GACHA_RATES[tiers[t]];
                }
            }
        }

        // 타입 상성
        if (ov.TYPE_EFFECTIVENESS) {
            var types = Object.keys(Game.Config.TYPE_EFFECTIVENESS);
            for (var j = 0; j < types.length; j++) {
                if (ov.TYPE_EFFECTIVENESS[types[j]]) {
                    Object.assign(Game.Config.TYPE_EFFECTIVENESS[types[j]], ov.TYPE_EFFECTIVENESS[types[j]]);
                }
            }
        }
    } catch(e) {}
})();

window.Game = Game;
