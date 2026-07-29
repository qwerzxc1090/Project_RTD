const fs = require('fs');
let html = fs.readFileSync('tools/data-editor.html', 'utf8');

// R25-31 패치
const r25to31 = [
    [25, 1282], [26, 1246], [27, 1213], [28, 1181],
    [29, 1151], [30, 1122], [31, 803]
];
// R33-39 패치
const r33to39 = [
    [33, 765], [34, 748], [35, 731], [36, 715],
    [37, 700], [38, 686], [39, 672]
];
// R41-47 패치
const r41to47 = [
    [41, 645], [42, 633], [43, 621], [44, 609],
    [45, 598], [46, 588], [47, 577]
];

const all = [...r25to31, ...r33to39, ...r41to47];
let changed = 0;

all.forEach(([id, newHp]) => {
    // 에디터에서 해당 몬스터 라인의 hp를 찾아 교체
    // 패턴: { id: 25, name: '몬스터 25R', ..., hp: XXXX,
    const regex = new RegExp(`(\\{ id: ${id},.*?hp: )\\d+`, 's');
    const before = html;
    html = html.replace(regex, `$1${newHp}`);
    if (html !== before) {
        changed++;
        console.log(`✅ MON ${id}: hp → ${newHp}`);
    } else {
        // 보스가 아닌 경우만 체크
        const isNonBoss = [25,26,27,28,29,30,31,33,34,35,36,37,38,39,41,42,43,44,45,46,47].includes(id);
        if (isNonBoss) console.log(`❌ MON ${id}: 패턴 미발견`);
    }
});

fs.writeFileSync('tools/data-editor.html', html);
console.log(`\n${changed}개 몬스터 HP 업데이트 완료`);
