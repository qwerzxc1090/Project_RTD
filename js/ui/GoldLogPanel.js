var Game = window.Game || {};

// ─────────────────────────────────────────────────────
//  Game.GoldLog  — 전역 골드 이벤트 브로드캐스터
//  사용법: Game.GoldLog.add(amount, label, colorHex)
// ─────────────────────────────────────────────────────
Game.GoldLog = {
    _listeners: [],
    add: function(amount, label, color) {
        this._listeners.forEach(function(fn) { fn(amount, label, color); });
    },
    register: function(fn) {
        this._listeners.push(fn);
    },
    reset: function() {
        // 씬 재시작 시 패널 리스너 초기화
        this._listeners = [];
    }
};

// ─────────────────────────────────────────────────────
//  Game.GoldLogPanel  — 화면 좌상단 골드 로그 패널
// ─────────────────────────────────────────────────────
Game.GoldLogPanel = function(scene) {
    this.scene = scene;

    var PW = 210, PH = 196;
    var px = 8, py = 8;
    var MAX = 8;

    // ── 배경 ──
    this.bg = scene.add.graphics().setDepth(90).setScrollFactor(0);
    this._drawBg(px, py, PW, PH);

    // ── 타이틀 ──
    this.titleText = scene.add.text(px + 10, py + 8, '💰  골드 로그', {
        fontSize: '10px', fontFamily: 'Oxanium', color: '#FFD700'
    }).setDepth(91).setScrollFactor(0);

    // ── 구분선 ──
    this.divider = scene.add.graphics().setDepth(91).setScrollFactor(0);
    this.divider.lineStyle(1, 0x334466, 0.6);
    this.divider.lineBetween(px + 6, py + 24, px + PW - 6, py + 24);

    // ── 로그 텍스트 슬롯 ──
    this.slots = [];
    var slotY0 = py + 30;
    var slotH  = 20;
    for (var i = 0; i < MAX; i++) {
        this.slots.push(
            scene.add.text(px + 10, slotY0 + i * slotH, '', {
                fontSize: '9px', fontFamily: 'Oxanium', color: '#888888'
            }).setDepth(91).setScrollFactor(0).setAlpha(0)
        );
    }

    // ── 현재 골드 표시 ──
    this.goldText = scene.add.text(px + PW - 10, py + 8, '', {
        fontSize: '10px', fontFamily: 'Oxanium', color: '#FFD700', align: 'right'
    }).setDepth(91).setScrollFactor(0).setOrigin(1, 0);

    // 내부 로그 버퍼
    this._logs  = [];
    this._MAX   = MAX;
    this._px    = px;
    this._py    = py;
    this._PW    = PW;

    // GoldLog 리스너 등록
    var self = this;
    Game.GoldLog.register(function(amount, label, color) {
        self._push(amount, label, color);
    });
};

Game.GoldLogPanel.prototype._drawBg = function(px, py, PW, PH) {
    this.bg.clear();
    this.bg.fillStyle(0x050510, 0.88);
    this.bg.fillRoundedRect(px, py, PW, PH, 8);
    this.bg.lineStyle(1, 0x334466, 0.8);
    this.bg.strokeRoundedRect(px, py, PW, PH, 8);
};

Game.GoldLogPanel.prototype._push = function(amount, label, color) {
    var prefix = amount >= 0 ? '+' : '-';
    // 실제 골드는 소수값으로 누적하지만 획득/연출 표시는 정수만 사용한다.
    var amtStr = prefix + Math.floor(Math.abs(amount)) + 'G';
    var entry  = {
        text:  amtStr + '  ' + label,
        color: color || (amount >= 0 ? '#44FF88' : '#FF6644')
    };

    this._logs.unshift(entry);
    if (this._logs.length > this._MAX) this._logs.pop();

    this._refresh();

    // 최신 항목 flash 효과
    var slot = this.slots[0];
    this.scene.tweens.add({
        targets: slot, alpha: 1, duration: 80,
        onComplete: function() {}
    });
};

Game.GoldLogPanel.prototype._refresh = function() {
    var MAX = this._MAX;
    for (var i = 0; i < MAX; i++) {
        if (i < this._logs.length) {
            var log   = this._logs[i];
            var alpha = Math.max(0.2, 1 - i * 0.11);
            this.slots[i].setText(log.text).setColor(log.color).setAlpha(alpha);
        } else {
            this.slots[i].setText('').setAlpha(0);
        }
    }

    // 현재 골드 업데이트
    var g = Game.EconomySystem ? Game.EconomySystem.getGold() : 0;
    this.goldText.setText(g + 'G');
};

Game.GoldLogPanel.prototype.updateGold = function() {
    var g = Game.EconomySystem ? Game.EconomySystem.getGold() : 0;
    this.goldText.setText(g + 'G');
};

Game.GoldLogPanel.prototype.destroy = function() {
    if (this.bg)        this.bg.destroy();
    if (this.titleText) this.titleText.destroy();
    if (this.divider)   this.divider.destroy();
    if (this.goldText)  this.goldText.destroy();
    this.slots.forEach(function(s) { s.destroy(); });
};

window.Game = Game;
