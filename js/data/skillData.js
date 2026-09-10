var Game = window.Game || {};

// ── 스킬 데이터 모듈 ──
// 타워의 unitData.skillId 와 연결하여 공격 방식을 결정한다.
// 현재 구현: 단일 타겟 투사체 발사 (projectileType: 'single')
// skillId: 1=느린 사격  2=일반 사격  3=빠른 사격
//
// 투사체 이미지 파일 경로: assets/projectiles/
//   이미지 파일 사이즈: 32×32 px (투명 배경 PNG)
//   일반 기준 게임 표시 크기: 8×8 px (setDisplaySize 적용)

Game.SkillData = {

    skills: {},

    init: function(data) {
        this.skills = data || {};
        this.applyLocalOverrides();
    },

    applyLocalOverrides: function() {
        try {
            var raw = localStorage.getItem('rtd_skillData');
            if (!raw) return;
            var saved = JSON.parse(raw);
            if (!saved || typeof saved !== 'object') return;

            var ids = Object.keys(saved);
            for (var i = 0; i < ids.length; i++) {
                var id = ids[i];
                if (this.skills[id]) Object.assign(this.skills[id], saved[id]);
                else this.skills[id] = saved[id];
            }
        } catch(e) {
            console.warn('[SkillData] localStorage override load failed:', e);
        }
    },

    // skillId로 스킬 정보 조회 (없으면 id=2 기본 반환)
    getSkill: function(id) {
        return this.skills[id] || this.skills[2];
    },

    // 속도 이름 레이블
    getSpeedLabel: function(id) {
        var labels = { 1: 'SLOW', 2: 'NORMAL', 3: 'FAST' };
        return labels[id] || 'NORMAL';
    },
};

window.Game = Game;
