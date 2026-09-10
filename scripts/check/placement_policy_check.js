const fs = require('fs');
const vm = require('vm');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function chainStub() {
  let stub;
  stub = new Proxy({}, {
    get: () => function() { return stub; }
  });
  return stub;
}

const context = {
  window: {},
  console: { log() {}, warn() {}, error: console.error },
  Phaser: {
    Scene: function() {},
    Class: function(definition) { return definition; }
  }
};
vm.createContext(context);
vm.runInContext(fs.readFileSync('js/config.js', 'utf8'), context);
vm.runInContext(fs.readFileSync('js/scenes/GameScene.js', 'utf8'), context);

const Game = context.window.Game;
const scene = Object.create(Game.GameScene);
scene.add = {
  graphics: chainStub,
  group: chainStub,
  text: chainStub
};
scene._computeTowerSlots();

assert(scene.towerSlots.length === 121, '11x11 슬롯 수가 121이 아닙니다.');
const centerSlot = scene.towerSlots.find(slot => slot.col === 5 && slot.row === 5);
const centerPoints = Array.from({ length: 10 }, (_, index) => scene._getSlotPlacementPoint(centerSlot, index));
const uniqueCenterPoints = new Set(centerPoints.map(point => `${point.x.toFixed(4)},${point.y.toFixed(4)}`));
assert(uniqueCenterPoints.size === 10, '중앙 슬롯의 10개 좌표가 서로 고유하지 않습니다.');

const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
const shortLow = stats.units.find(unit => unit.id === 'n2');
const midRange = stats.units.find(unit => unit.id === 'e3');
const mythDestroy = stats.units.find(unit => unit.id === 'm2');
assert(shortLow && midRange && mythDestroy, '배치 검증용 타워 데이터를 찾을 수 없습니다.');

Game.UnitData = { units: stats.units };
scene.waveSystem = { getCurrentRound: () => 24 };
assert(JSON.stringify(scene._getPlacementPathWeights()) === JSON.stringify([1.30, 1.20, 1.10, 1, 1]),
  'R24까지는 시작·좌측·하단 경로 가중치가 적용되어야 합니다.');
assert(scene._selectAutoPlacementSlot(shortLow) >= 0, 'R24 우선 배치 슬롯을 찾지 못했습니다.');
assert(JSON.stringify(scene._getPlacementPathWeights(false)) === JSON.stringify([1, 1, 1, 1, 1]),
  'R24라도 세 우선 경로가 포화되면 즉시 동일 가중치로 전환되어야 합니다.');

// 시작·좌측·하단을 덮지 않는 슬롯만 남기면, R24에도 실제 선택이 동일 가중치로 전환되어야 한다.
scene._longRangeReservedSlotIndices = [];
scene._midRangeReservedSlotIndices = [];
scene.slotOccupancy = scene.towerSlots.map(slot => slot.maxCapacity || 4);
const roundLogs = [];
scene.addRoundLog = (message, color) => roundLogs.push({ message, color });
const earlyOnlyWeights = [1, 1, 1, 0, 0];
const lateOnlySlot = scene.towerSlots.findIndex((slot, index) =>
  scene._calcPathCoverageAt(slot.x, slot.y, shortLow.range, earlyOnlyWeights) === 0 && index !== 0
);
assert(lateOnlySlot >= 0, '우선 경로 밖 검증 슬롯을 찾지 못했습니다.');
scene.slotOccupancy[lateOnlySlot] = 0;
const originalCoverage = scene._calcPathCoverageAt;
let usedFallbackWeights = false;
scene._calcPathCoverageAt = function(x, y, range, weights) {
  if (JSON.stringify(weights) === JSON.stringify([1, 1, 1, 1, 1])) usedFallbackWeights = true;
  return originalCoverage.call(this, x, y, range, weights);
};
assert(scene._selectAutoPlacementSlot(shortLow) === lateOnlySlot,
  '우선 경로 포화 뒤 사용 가능한 순수 커버리지 슬롯을 선택하지 못했습니다.');
assert(usedFallbackWeights, '우선 경로 포화 시 동일 가중치 전환이 실제 선택에 적용되지 않았습니다.');
assert(roundLogs.length === 1 && roundLogs[0].message.includes('R24 우선 경로 포화') &&
  roundLogs[0].message.includes('전 경로 동일 가중치 전환'),
  '우선 경로 포화 시 라운드 로그 알림이 기록되지 않았습니다.');
scene._calcPathCoverageAt = originalCoverage;

scene.waveSystem = { getCurrentRound: () => 25 };
assert(JSON.stringify(scene._getPlacementPathWeights()) === JSON.stringify([1, 1, 1, 1, 1]),
  'R25부터는 모든 경로가 동일 가중치여야 합니다.');
assert(scene._selectAutoPlacementSlot(shortLow) >= 0, 'R25 순수 커버리지 슬롯을 찾지 못했습니다.');

console.log(JSON.stringify({
  thresholds: Game.Config.TOWER_PLACEMENT,
  uniqueCenterPoints: uniqueCenterPoints.size,
  lowTower: { id: shortLow.id, range: shortLow.range, gradeScore: shortLow.gradeScore },
  earlyRoundWeights: [1.30, 1.20, 1.10, 1, 1],
  lateRoundWeights: [1, 1, 1, 1, 1]
}, null, 2));
