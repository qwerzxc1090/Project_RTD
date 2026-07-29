var Game = window.Game || {};

// ──────────────────────────────────────────────────────────────
//  Inventory  (하단 3단 히스토리 패널)
//   LEFT   : 일반 · 레어 · 고대  (8 슬롯)
//   MIDDLE : 유물 · 서사 · 전설  (7 슬롯)  ← 신규
//   RIGHT  : 에픽 · 신화 · 태초  (7 슬롯)
// ──────────────────────────────────────────────────────────────
Game.Inventory = function(scene) {
    Phaser.GameObjects.Container.call(this, scene, 0, 0);

    this.scene  = scene;
    this.setDepth(90);

    var W  = Game.Config.WIDTH;
    var H  = Game.Config.HEIGHT;
    var PH = Game.Config.INVENTORY.PANEL_HEIGHT;
    this.panelY = H - PH;

    // 3분할 구분선 x 좌표
    this.DIV1 = Math.floor(W / 3);       // ≈ 427
    this.DIV2 = Math.floor(W * 2 / 3);   // ≈ 853

    // 슬롯 규격
    this.SS  = 40;
    this.GAP = 4;

    // 티어 그룹
    this.LEFT_TIERS  = ['normal', 'rare', 'ancient'];
    this.MID_TIERS   = ['relic',  'saga', 'legend'];
    this.RIGHT_TIERS = ['epic',   'myth', 'primordial'];

    // 히스토리 배열
    this.leftUnits  = [];
    this.midUnits   = [];
    this.rightUnits = [];

    this.MAX_LEFT  = 7;
    this.MAX_MID   = 7;
    this.MAX_RIGHT = 7;

    // 하위 호환 (LEGEND_TIERS 참조 코드용)
    this.LEGEND_TIERS = this.MID_TIERS.concat(this.RIGHT_TIERS);
    this.allUnits    = [];
    this.legendUnits = [];
    this.MAX_ALL     = this.MAX_LEFT;
    this.MAX_LEGEND  = this.MAX_MID;

    this._createPanel();
    this._createLeftSlots();
    this._createMidSlots();
    this._createRightSlots();

    scene.add.existing(this);
};

Game.Inventory.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.Inventory.prototype.constructor = Game.Inventory;

// ── 패널 배경 ──────────────────────────────────────────────────
Game.Inventory.prototype._createPanel = function() {
    var W   = Game.Config.WIDTH;
    var py  = this.panelY;
    var PH  = Game.Config.INVENTORY.PANEL_HEIGHT;
    var d1  = this.DIV1;
    var d2  = this.DIV2;

    var bg = this.scene.add.graphics();

    // 전체 배경
    bg.fillStyle(0x0a0a0f, 0.97);
    bg.fillRect(0, py, W, PH);

    // 상단 테두리
    bg.lineStyle(2, 0x2a2a4e, 1);
    bg.lineBetween(0, py, W, py);

    // ── 섹션별 오버레이 색상 ──
    // LEFT: 파란 계열 (일반~고대)
    bg.fillStyle(0x0d0d22, 0.55);
    bg.fillRect(0, py, d1, PH);

    // MIDDLE: 주황 계열 (유물~전설)
    bg.fillStyle(0x1a1200, 0.65);
    bg.fillRect(d1 + 2, py, d2 - d1 - 2, PH);

    // RIGHT: 청록 계열 (에픽~태초)
    bg.fillStyle(0x001515, 0.75);
    bg.fillRect(d2 + 2, py, W - d2 - 2, PH);

    // ── 구분선 ──
    bg.lineStyle(2, 0x4a4a7a, 0.9);
    bg.lineBetween(d1, py, d1, py + PH);

    bg.lineStyle(2, 0x7a6a00, 0.9);
    bg.lineBetween(d2, py, d2, py + PH);

    this.add(bg);

    // ── LEFT 라벨 ──
    this.add(this.scene.add.text(10, py + 5, '일반 · 레어 · 고대', {
        fontSize: '7px', fontFamily: 'Press Start 2P', color: '#6666aa'
    }));
    this.leftCountText = this.scene.add.text(10, py + 18, '0 / ' + this.MAX_LEFT, {
        fontSize: '6px', fontFamily: 'Press Start 2P', color: '#444466'
    });
    this.add(this.leftCountText);

    // ── MIDDLE 라벨 ──
    this.add(this.scene.add.text(d1 + 10, py + 5, '유물 · 서사 · 전설', {
        fontSize: '7px', fontFamily: 'Press Start 2P', color: '#cc9900'
    }));
    this.midCountText = this.scene.add.text(d1 + 10, py + 18, '0 / ' + this.MAX_MID, {
        fontSize: '6px', fontFamily: 'Press Start 2P', color: '#886600'
    });
    this.add(this.midCountText);

    // ── RIGHT 라벨 ──
    this.add(this.scene.add.text(d2 + 10, py + 5, '★ 에픽 · 신화 · 태초', {
        fontSize: '7px', fontFamily: 'Press Start 2P', color: '#00dddd'
    }));
    this.rightCountText = this.scene.add.text(d2 + 10, py + 18, '0 / ' + this.MAX_RIGHT, {
        fontSize: '6px', fontFamily: 'Press Start 2P', color: '#007777'
    });
    this.add(this.rightCountText);
};

// ── 슬롯 생성 공통 ────────────────────────────────────────────
Game.Inventory.prototype._buildSlots = function(count, startX, fillColor, borderColor) {
    var slots = [];
    var py = this.panelY;
    var ss = this.SS;
    var y  = py + (Game.Config.INVENTORY.PANEL_HEIGHT - ss) / 2;

    for (var i = 0; i < count; i++) {
        var x = startX + (ss + this.GAP) * i;
        var g = this.scene.add.graphics();
        g.fillStyle(fillColor, 0.85);
        g.fillRoundedRect(x, y, ss, ss, 4);
        g.lineStyle(1, borderColor, 0.5);
        g.strokeRoundedRect(x, y, ss, ss, 4);
        this.add(g);
        slots.push({ x: x, y: y, g: g, vis: null, label: null, unitData: null });
    }
    return slots;
};

// ── 왼쪽 슬롯 (일반·레어·고대) ────────────────────────────────
Game.Inventory.prototype._createLeftSlots = function() {
    this.leftSlots = this._buildSlots(this.MAX_LEFT, 90, 0x1a1a2e, 0x2a2a4e);
    // 하위 호환
    this.allSlots = this.leftSlots;
};

// ── 중간 슬롯 (유물·서사·전설) ────────────────────────────────
Game.Inventory.prototype._createMidSlots = function() {
    this.midSlots = this._buildSlots(this.MAX_MID, this.DIV1 + 90, 0x1a1200, 0x4a3a00);
    // 하위 호환
    this.legendSlots = this.midSlots;
};

// ── 오른쪽 슬롯 (에픽·신화·태초) ─────────────────────────────
Game.Inventory.prototype._createRightSlots = function() {
    this.rightSlots = this._buildSlots(this.MAX_RIGHT, this.DIV2 + 80, 0x001a1a, 0x005555);
};

// ── 유닛 추가 (외부 호출) ────────────────────────────────────
Game.Inventory.prototype.addUnit = function(unitData) {
    var tier = unitData.tier;

    if (this.LEFT_TIERS.indexOf(tier) !== -1) {
        this._pushToPanel(unitData, this.leftUnits, this.leftSlots, this.MAX_LEFT, 'left');
        this._updateCountText(this.leftCountText, this.leftUnits.length, this.MAX_LEFT);
        // 하위 호환 배열 동기화
        this.allUnits = this.leftUnits;

    } else if (this.MID_TIERS.indexOf(tier) !== -1) {
        this._pushToPanel(unitData, this.midUnits, this.midSlots, this.MAX_MID, 'mid');
        this._updateCountText(this.midCountText, this.midUnits.length, this.MAX_MID);
        this._flashSlot(this.midSlots);
        // 하위 호환 배열 동기화
        this.legendUnits = this.midUnits;

    } else if (this.RIGHT_TIERS.indexOf(tier) !== -1) {
        this._pushToPanel(unitData, this.rightUnits, this.rightSlots, this.MAX_RIGHT, 'right');
        this._updateCountText(this.rightCountText, this.rightUnits.length, this.MAX_RIGHT);
        this._flashSlot(this.rightSlots);
    }

    return true;
};

// ── 슬롯 패널 업데이트 ───────────────────────────────────────
Game.Inventory.prototype._pushToPanel = function(unitData, arr, slots, maxSlots, panelType) {
    arr.push(unitData);
    if (arr.length > maxSlots) arr.shift();

    for (var i = 0; i < maxSlots; i++) {
        this._clearSlotVisual(slots[i]);
    }
    for (var j = 0; j < arr.length; j++) {
        slots[j].unitData = arr[j];
        this._drawInSlot(slots[j], arr[j], panelType);
    }
};

// ── 슬롯 비주얼 제거 ─────────────────────────────────────────
Game.Inventory.prototype._clearSlotVisual = function(slot) {
    if (slot.vis)   { slot.vis.destroy();   slot.vis   = null; }
    if (slot.label) { slot.label.destroy(); slot.label = null; }
    slot.unitData = null;
};

// ── 슬롯에 타워 그리기 ──────────────────────────────────────
Game.Inventory.prototype._drawInSlot = function(slot, unitData, panelType) {
    var ss        = this.SS;
    var tierColor = Game.Config.COLORS.TIER[unitData.tier];
    var atkColor  = Game.Config.COLORS.ATTACK_TYPE[unitData.attackType];
    var colorHex  = '#' + tierColor.toString(16).padStart(6, '0');
    var cx = slot.x + ss / 2;
    var cy = slot.y + ss / 2 - 3;

    // 슬롯 배경 + 테두리 (panelType별 스타일)
    slot.g.clear();
    if (panelType === 'right') {
        // 에픽~태초: 화려한 이중 테두리
        slot.g.fillStyle(0x001212, 1);
        slot.g.fillRoundedRect(slot.x, slot.y, ss, ss, 4);
        slot.g.lineStyle(3, tierColor, 1);
        slot.g.strokeRoundedRect(slot.x, slot.y, ss, ss, 4);
        slot.g.lineStyle(1, tierColor, 0.4);
        slot.g.strokeRoundedRect(slot.x + 3, slot.y + 3, ss - 6, ss - 6, 3);
    } else if (panelType === 'mid') {
        // 유물~전설: 중간 강조
        slot.g.fillStyle(0x110d00, 1);
        slot.g.fillRoundedRect(slot.x, slot.y, ss, ss, 4);
        slot.g.lineStyle(2, tierColor, 1);
        slot.g.strokeRoundedRect(slot.x, slot.y, ss, ss, 4);
        slot.g.lineStyle(1, tierColor, 0.3);
        slot.g.strokeRoundedRect(slot.x + 2, slot.y + 2, ss - 4, ss - 4, 3);
    } else {
        // 일반~고대: 기본
        slot.g.fillStyle(0x1a1a2e, 0.9);
        slot.g.fillRoundedRect(slot.x, slot.y, ss, ss, 4);
        slot.g.lineStyle(2, tierColor, 0.85);
        slot.g.strokeRoundedRect(slot.x, slot.y, ss, ss, 4);
    }

    // 미니 타워 아이콘
    var g    = this.scene.add.graphics();
    var mini = 20;
    var half = mini / 2;
    g.setPosition(cx, cy);
    g.fillStyle(tierColor, 1);
    g.fillRect(-half, -half, mini, mini);
    g.lineStyle(1, 0xFFFFFF, 0.35);
    g.strokeRect(-half, -half, mini, mini);
    g.fillStyle(tierColor, 0.5);
    g.fillRect(-half + 2, -half + 2, mini - 4, mini - 4);
    g.fillStyle(atkColor, 1);
    g.fillCircle(0, -half + 4, 2);
    g.fillStyle(0xFFFFFF, 1);
    g.fillRect(-3, -1, 2, 2);
    g.fillRect(1,  -1, 2, 2);
    this.add(g);
    slot.vis = g;

    // 등급 이니셜
    var tierName  = Game.TIER_NAMES ? Game.TIER_NAMES[unitData.tier] : unitData.tier;
    var shortName = tierName ? tierName.charAt(0) : unitData.tier.charAt(0).toUpperCase();
    var lbl = this.scene.add.text(cx, slot.y + ss - 3, shortName, {
        fontSize: '6px', fontFamily: 'Press Start 2P', color: colorHex
    }).setOrigin(0.5, 1);
    this.add(lbl);
    slot.label = lbl;
};

// ── 슬롯 플래시 효과 ─────────────────────────────────────────
Game.Inventory.prototype._flashSlot = function(slots) {
    // 마지막으로 추가된 슬롯(배열 마지막 빈 슬롯 전)을 플래시
    var slot = null;
    for (var i = 0; i < slots.length; i++) {
        if (slots[i].vis) slot = slots[i];
    }
    if (!slot || !slot.vis) return;
    this.scene.tweens.add({
        targets: slot.vis,
        alpha: 0.2,
        duration: 80,
        yoyo: true,
        repeat: 4,
        onComplete: function() { if (slot.vis) slot.vis.setAlpha(1); }
    });
};

// ── 하위 호환용 스텁 ─────────────────────────────────────────
Game.Inventory.prototype._flashLegendSlot  = function() { this._flashSlot(this.midSlots); };
Game.Inventory.prototype.isFull            = function() { return false; };
Game.Inventory.prototype.getUnitCount      = function() {
    return this.leftUnits.length + this.midUnits.length + this.rightUnits.length;
};
Game.Inventory.prototype._updateCountText  = function(textObj, current, max) {
    textObj.setText(current + ' / ' + max);
};

window.Game = Game;
