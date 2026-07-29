var Game = window.Game || {};

Game.DPSMeterUI = function(scene) {
    Phaser.GameObjects.Container.call(this, scene, 0, 0);

    this.scene    = scene;
    this.setDepth(120);
    this.isOpen   = false;
    this.viewMode = 0;  // 0=기본, 1=타입별, 2=종류별(12그룹)

    var W = Game.Config.WIDTH;

    this.panelX = W - 262;
    this.panelY = 44;
    this.panelW = 252;

    // 모드별 패널 높이: 기본/종류별 12행, 타입별 3행
    this._rowCount = 12;
    this.panelH    = this._calcPanelH(12);

    this.rowTexts  = [];
    this.rowBars   = [];
    this._modeBtns = [];
    this._maxRows  = 12;   // 종류별 최대 12개

    this._createUI();
    scene.add.existing(this);
};

Game.DPSMeterUI.prototype = Object.create(Phaser.GameObjects.Container.prototype);
Game.DPSMeterUI.prototype.constructor = Game.DPSMeterUI;

// 행수에 따른 패널 높이 계산 (버튼 영역 78px + 행당 30px + 하단 36px)
Game.DPSMeterUI.prototype._calcPanelH = function(rows) {
    return 78 + rows * 30 + 36;
};

Game.DPSMeterUI.prototype._createUI = function() {
    var self = this;
    var PX = this.panelX, PY = this.panelY, PW = this.panelW;

    // ── 패널 배경 ──
    this.panelBg = this.scene.add.graphics();
    this.add(this.panelBg);

    // ── 헤더 타이틀 ──
    this.titleText = this.scene.add.text(PX + 12, PY + 10, '📊 DPS METER', {
        fontSize: '13px', fontFamily: 'Oxanium', color: '#FFD700', fontStyle: 'bold'
    });
    this.add(this.titleText);

    // ── 닫기 버튼 ──
    this.toggleBtnText = this.scene.add.text(PX + PW - 14, PY + 10, '[−]', {
        fontSize: '13px', fontFamily: 'Oxanium', color: '#AAAAAA'
    }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
    this.toggleBtnText.on('pointerdown', function() { self.toggle(); });
    this.add(this.toggleBtnText);

    // ── 요약 텍스트 ──
    this.summaryText = this.scene.add.text(PX + 12, PY + 28, '총 딜량: 0 | DPS: 0', {
        fontSize: '10px', fontFamily: 'Oxanium', color: '#88CCFF'
    });
    this.add(this.summaryText);

    // ── 구분선 1 ──
    var line1 = this.scene.add.graphics();
    line1.lineStyle(1, 0x2a2a4e, 0.8);
    line1.lineBetween(PX + 10, PY + 44, PX + PW - 10, PY + 44);
    this.add(line1);

    // ── 뷰 모드 버튼 3개 ──
    var modeLabels  = ['기본', '타입별', '종류별'];
    var btnW = Math.floor((PW - 22) / 3);
    var btnY = PY + 48;

    for (var mi = 0; mi < 3; mi++) {
        (function(idx) {
            var bx = PX + 10 + idx * (btnW + 1);

            var bg = self.scene.add.graphics();
            self.add(bg);

            var lbl = self.scene.add.text(bx + btnW / 2, btnY + 9, modeLabels[idx], {
                fontSize: '10px', fontFamily: 'Oxanium', color: '#AAAAAA'
            }).setOrigin(0.5).setInteractive({ useHandCursor: true });

            lbl.on('pointerdown', function() { self._setMode(idx); });
            self.add(lbl);

            self._modeBtns.push({ bg: bg, lbl: lbl, bx: bx, btnW: btnW, btnY: btnY });
        })(mi);
    }

    // ── 구분선 2 ──
    this.divLine2 = this.scene.add.graphics();
    this.add(this.divLine2);

    // ── 행 풀 생성 (최대 12개) ──
    for (var i = 0; i < this._maxRows; i++) {
        var barG = this.scene.add.graphics();
        this.add(barG);
        this.rowBars.push(barG);

        var nameTxt = this.scene.add.text(0, 0, '', {
            fontSize: '10px', fontFamily: 'Oxanium', color: '#FFFFFF'
        });
        this.add(nameTxt);

        var valTxt = this.scene.add.text(0, 0, '', {
            fontSize: '9px', fontFamily: 'Oxanium', color: '#CCCCCC'
        }).setOrigin(1, 0);
        this.add(valTxt);

        this.rowTexts.push({ name: nameTxt, val: valTxt });
    }

    // ── 리셋 버튼 (동적 위치) ──
    this.resetBtnText = this.scene.add.text(0, 0, '🔄 딜량 리셋', {
        fontSize: '10px', fontFamily: 'Oxanium', color: '#888888'
    }).setOrigin(0.5, 0.5).setInteractive({ useHandCursor: true });
    this.resetBtnText.on('pointerdown', function() {
        if (Game.DamageTracker) {
            Game.DamageTracker.reset();
            self.updateData();
        }
    });
    this.add(this.resetBtnText);

    this._renderFrame();
    this._drawModeBtns();
    this.setVisible(this.isOpen);
};

// ── 행 수 변경 시 패널 크기/위치 재계산 ──
Game.DPSMeterUI.prototype._applyRowCount = function(rows) {
    if (this._rowCount === rows) return;
    this._rowCount = rows;
    this.panelH    = this._calcPanelH(rows);
    this._renderFrame();
    this._repositionDivLine2();
    this._repositionResetBtn();
};

Game.DPSMeterUI.prototype._getRowStartY = function() {
    return this.panelY + 48 + 28;   // btnY(48) + 버튼높이(22) + 여백(6)
};

Game.DPSMeterUI.prototype._repositionDivLine2 = function() {
    var PX = this.panelX, PY = this.panelY, PW = this.panelW;
    var btnY = PY + 48;
    this.divLine2.clear();
    this.divLine2.lineStyle(1, 0x2a2a4e, 0.6);
    this.divLine2.lineBetween(PX + 10, btnY + 28, PX + PW - 10, btnY + 28);
};

Game.DPSMeterUI.prototype._repositionResetBtn = function() {
    var PX = this.panelX, PW = this.panelW;
    var resetY = this.panelY + this.panelH - 18;
    this.resetBtnText.setPosition(PX + PW / 2, resetY);
};

// ── 패널 배경 다시 그리기 ──
Game.DPSMeterUI.prototype._renderFrame = function() {
    this.panelBg.clear();
    this.panelBg.fillStyle(0x0a0a1f, 0.92);
    this.panelBg.fillRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 8);
    this.panelBg.lineStyle(1.5, 0xFFD700, 0.7);
    this.panelBg.strokeRoundedRect(this.panelX, this.panelY, this.panelW, this.panelH, 8);
};

// ── 모드 버튼 활성/비활성 ──
Game.DPSMeterUI.prototype._drawModeBtns = function() {
    var borderColors = [0x88CCFF, 0xFF8844, 0xAAFF44];
    var textColors   = ['#88CCFF', '#FF8844', '#AAFF44'];

    for (var i = 0; i < this._modeBtns.length; i++) {
        var btn    = this._modeBtns[i];
        var active = (i === this.viewMode);
        btn.bg.clear();
        if (active) {
            btn.bg.fillStyle(borderColors[i], 0.18);
            btn.bg.fillRoundedRect(btn.bx, btn.btnY, btn.btnW, 22, 4);
            btn.bg.lineStyle(1.5, borderColors[i], 0.9);
            btn.bg.strokeRoundedRect(btn.bx, btn.btnY, btn.btnW, 22, 4);
            btn.lbl.setColor(textColors[i]);
            btn.lbl.setStyle({ fontStyle: 'bold' });
        } else {
            btn.bg.fillStyle(0x111122, 0.5);
            btn.bg.fillRoundedRect(btn.bx, btn.btnY, btn.btnW, 22, 4);
            btn.bg.lineStyle(1, 0x333344, 0.6);
            btn.bg.strokeRoundedRect(btn.bx, btn.btnY, btn.btnW, 22, 4);
            btn.lbl.setColor('#555566');
            btn.lbl.setStyle({ fontStyle: 'normal' });
        }
    }
};

Game.DPSMeterUI.prototype._setMode = function(mode) {
    this.viewMode = mode;
    this._drawModeBtns();
    this.updateData();
};

Game.DPSMeterUI.prototype.toggle = function() {
    this.isOpen = !this.isOpen;
    this.setVisible(this.isOpen);
    if (this.isOpen) this.updateData();
};

Game.DPSMeterUI.prototype.setOpen = function(open) {
    this.isOpen = open;
    this.setVisible(this.isOpen);
    if (this.isOpen) this.updateData();
};

Game.DPSMeterUI.prototype.updateData = function() {
    if (!this.isOpen || !Game.DamageTracker) return;
    var fmt = this._formatNum.bind(this);

    if (this.viewMode === 0) {
        this._applyRowCount(12);
        this._repositionDivLine2();
        this._repositionResetBtn();
        this._renderUnitMode(fmt);
    } else if (this.viewMode === 1) {
        this._applyRowCount(3);
        this._repositionDivLine2();
        this._repositionResetBtn();
        this._renderTypeMode(fmt);
    } else {
        this._applyRowCount(12);
        this._repositionDivLine2();
        this._repositionResetBtn();
        this._renderGroupMode(fmt);
    }
};

// ── 모드 0: 유닛 기본 (등급 색상, 6행) ──
Game.DPSMeterUI.prototype._renderUnitMode = function(fmt) {
    var stats = Game.DamageTracker.getStats();
    this.summaryText.setText('총 딜량: ' + fmt(stats.totalDamage) + ' | DPS: ' + fmt(stats.totalDps));

    var units = stats.units;
    var maxDmg = (units.length > 0) ? units[0].damage : 1;
    var tierColors = Game.Config.COLORS.TIER;
    var tierKorMap = { normal:'일반', rare:'레어', ancient:'고대', relic:'유물', saga:'서사', legend:'전설', epic:'에픽', myth:'신화', primordial:'태초' };

    this._renderRows(units.slice(0, 12), maxDmg, 12, function(u, i) {
        var tColor = tierColors[u.tier] || 0xAAAAAA;
        var tK = tierKorMap[u.tier] || u.tier;
        return {
            barColor: tColor,
            nameStr: (i + 1) + '. [' + tK + '] ' + u.name + (u.count > 1 ? ' ×' + u.count : ''),
            nameColor: '#' + tColor.toString(16).padStart(6, '0'),
            valStr: fmt(u.damage) + ' (' + u.pct + '% | ' + fmt(u.dps) + '/s)'
        };
    });
};

// ── 모드 1: 공격 타입별 (3행) ──
Game.DPSMeterUI.prototype._renderTypeMode = function(fmt) {
    var stats = Game.DamageTracker.getTypeStats();
    this.summaryText.setText('총 딜량: ' + fmt(stats.totalDamage) + ' | DPS: ' + fmt(stats.totalDps));

    var items  = stats.items;
    var maxDmg = (items.length > 0) ? items[0].damage : 1;
    var typeIcon = { normal: '★', explosive: '▲', vibration: '●' };

    this._renderRows(items, maxDmg, 3, function(u, i) {
        var hex = parseInt(u.colorHex.replace('#', ''), 16);
        return {
            barColor: hex,
            nameStr: (i + 1) + '. ' + (typeIcon[u.id] || '') + ' ' + u.name + ' 유닛',
            nameColor: u.colorHex,
            valStr: fmt(u.damage) + ' (' + u.pct + '% | ' + fmt(u.dps) + '/s)'
        };
    });
};

// ── 모드 2: 12종 타입별 (9등급 합산 순위) ──
Game.DPSMeterUI.prototype._renderGroupMode = function(fmt) {
    var stats = Game.DamageTracker.getGroupStats();
    this.summaryText.setText('총 딜량: ' + fmt(stats.totalDamage) + ' | DPS: ' + fmt(stats.totalDps));

    var items  = stats.items;
    var maxDmg = (items.length > 0 && items[0].damage > 0) ? items[0].damage : 1;

    this._renderRows(items, maxDmg, 12, function(u, i) {
        var hex = u.hex || 0xAAAAAA;
        return {
            barColor: hex,
            nameStr: (i + 1) + '. ' + u.name,
            nameColor: u.damage > 0 ? u.colorHex : '#444444',
            valStr: u.damage > 0 ? fmt(u.damage) + ' (' + u.pct + '% | ' + fmt(u.dps) + '/s)' : '-'
        };
    });
};

// ── 공통 행 렌더러 ──
Game.DPSMeterUI.prototype._renderRows = function(items, maxDmg, maxRows, buildCell) {
    var PX = this.panelX, PW = this.panelW;
    var startY = this._getRowStartY();
    var rowH   = 30;
    var barW   = PW - 24;

    for (var i = 0; i < this._maxRows; i++) {
        var barG = this.rowBars[i];
        var txts = this.rowTexts[i];
        barG.clear();

        if (i < maxRows && i < items.length && items[i].damage > 0) {
            var u    = items[i];
            var ry   = startY + i * rowH;
            var cell = buildCell(u, i);
            var fillW = Math.max(4, Math.floor(barW * (u.damage / maxDmg)));

            barG.fillStyle(0x1a1a2e, 0.6);
            barG.fillRoundedRect(PX + 12, ry, barW, 24, 4);
            barG.fillStyle(cell.barColor, 0.28);
            barG.fillRoundedRect(PX + 12, ry, fillW, 24, 4);
            barG.lineStyle(1, cell.barColor, 0.75);
            barG.strokeRoundedRect(PX + 12, ry, fillW, 24, 4);

            txts.name.setPosition(PX + 14, ry + 2);
            txts.name.setText(cell.nameStr);
            txts.name.setColor(cell.nameColor);
            txts.name.setVisible(true);

            txts.val.setPosition(PX + PW - 14, ry + 13);
            txts.val.setText(cell.valStr);
            txts.val.setVisible(true);
        } else {
            txts.name.setVisible(false);
            txts.val.setVisible(false);
        }
    }
};

Game.DPSMeterUI.prototype._formatNum = function(num) {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 10000)   return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
};

window.Game = Game;
