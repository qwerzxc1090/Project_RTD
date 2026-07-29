var Game = window.Game || {};

// ── UILayout: 화면별 UI 레이아웃 설정 로더 ──
// tools/ui-editor.html 에서 조정 → localStorage 저장
// 게임 시작 시 여기서 로드 (없으면 기본값 fallback)
//
// localStorage 키:
//   rtd_uiLayout_menu  → 시작화면 레이아웃 JSON
//   rtd_uiLayout_game  → 게임화면 레이아웃 JSON

Game.UILayout = {

    // ── 기본값 (현재 하드코딩된 값과 일치) ──
    _defaults: {
        menu: {
            'title':        { x: 640, y: 120, fontSize: 43 },
            'subtitle':     { x: 640, y: 180, fontSize: 17 },
            'startBtn':     { x: 640, y: 420, w: 220, h: 52 },
            'infoPanel':    { x: 20,  y: 440, w: 580, h: 200 },
            'devPanel':     { x: 1010, y: 40, w: 240, h: 640 }
        },
        game: {
            'hud.bar':          { x: 0,    y: 0,   w: 1280, h: 36 },
            'hud.lives':        { x: 42,   y: 18,  fontSize: 16 },
            'hud.gold':         { x: 155,  y: 18,  fontSize: 14 },
            'hud.time':         { x: 275,  y: 18,  fontSize: 14 },
            'hud.round':        { x: 640,  y: 10,  fontSize: 14 },
            'hud.status':       { x: 1260, y: 10,  fontSize: 12 },
            'hud.speedBtn':     { x: 1210, y: 308, w: 54, h: 200 },
            'hud.bossWarning':  { x: 640,  y: 60,  fontSize: 19 },
            'hud.spacePrompt':  { x: 640,  y: 360, fontSize: 22 },
            'game.inventory':   { x: 0,    y: 634, w: 1280, h: 86 },
            'game.gameLog':     { x: 905,  y: 50,  w: 360,  h: 270 },
            'game.roundLog':    { x: 905,  y: 330, w: 360,  h: 270 },
            'game.gachaBtn':    { x: 640,  y: 600 },
            'game.tierGuide':   { x: 905,  y: 610, w: 360,  h: 100 },
            'game.timer':       { x: 350,  y: 18, fontSize: 14 }
        }
    },

    // 캐시 (로드 후 저장)
    _cache: { menu: null, game: null },

    // ── 화면 레이아웃 로드 (localStorage → 기본값 fallback) ──
    load: function(screen) {
        if (this._cache[screen]) return this._cache[screen];
        var key = 'rtd_uiLayout_' + screen;
        var saved = null;
        try {
            var raw = localStorage.getItem(key);
            if (raw) saved = JSON.parse(raw);
        } catch(e) {}

        // 저장값과 기본값을 머지 (저장값이 없는 요소는 기본값 사용)
        var defaults = this._defaults[screen] || {};
        var result = {};
        var ids = Object.keys(defaults);
        for (var i = 0; i < ids.length; i++) {
            var id = ids[i];
            result[id] = (saved && saved[id])
                ? Object.assign({}, defaults[id], saved[id])
                : Object.assign({}, defaults[id]);
        }
        this._cache[screen] = result;
        return result;
    },

    // ── 단일 요소 설정 반환 ──
    // 예: Game.UILayout.get('game', 'hud.gold')  → { x:155, y:18, fontSize:14 }
    get: function(screen, id) {
        var layout = this.load(screen);
        return layout[id] || (this._defaults[screen] || {})[id] || {};
    },

    // ── 캐시 초기화 (에디터에서 저장 후 즉시 반영 시 사용) ──
    invalidate: function() {
        this._cache = { menu: null, game: null };
    },

    // ── 레이아웃 저장 (에디터에서 호출) ──
    save: function(screen, data) {
        var key = 'rtd_uiLayout_' + screen;
        try {
            localStorage.setItem(key, JSON.stringify(data));
            this._cache[screen] = null; // 캐시 무효화
        } catch(e) {}
    },

    // ── 초기화 (기본값으로 복원) ──
    reset: function(screen) {
        var key = 'rtd_uiLayout_' + screen;
        try {
            localStorage.removeItem(key);
            this._cache[screen] = null;
        } catch(e) {}
    }
};

window.Game = Game;
