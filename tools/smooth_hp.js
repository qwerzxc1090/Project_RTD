const fs = require('fs');
const stats = JSON.parse(fs.readFileSync('assets/data/stats.json', 'utf8'));
let html = fs.readFileSync('tools/data-editor.html', 'utf8');
const m = stats.monsters;
const scaled = id => Math.floor(m[id].hp * (1 + parseInt(id) * 0.1));

// ─── R11-R20 선형 보간 ───
// R10 scaled=2924 → R21 scaled=5986
// R11~R20 구간(보스R16 제외) 사이를 단조증가하도록 보간
// R10과 R21 사이 비보스 라운드: 11,12,13,14,15,17,18,19,20 = 9개
// 목표: 2924에서 5986까지 9단계 등분(보스 R16은 건드리지 않음)

const nonBoss_11_20 = [11,12,13,14,15,17,18,19,20]; // R16=보스
const s10 = scaled(10); // 2924
const s21 = scaled(21); // 5986

console.log('R10 scaled='+s10+', R21 scaled='+s21);
console.log('보간 구간: R11-R20 (R16 보스 제외) '+nonBoss_11_20.length+'개');

nonBoss_11_20.forEach((r, i) => {
    const steps = nonBoss_11_20.length + 1; // 10등분 (R10→R21 사이)
    const targetScaled = Math.round(s10 + (s21 - s10) * (i + 1) / steps);
    const mult = 1 + r * 0.1;
    const oldHp = m[r].hp;
    m[r].hp = Math.round(targetScaled / mult);
    console.log('  R'+r+': hp '+oldHp+'→'+m[r].hp+' (scaled '+scaled(r)+')');
});

// ─── R31-R47 선형 보간 ───
// R30 scaled=4492 → R48(보스) 직전이므로 R41 scaled을 목표로
// R31에서 R47까지 보스(R32,R40) 제외 단조증가
// R30 scaled=4492 → R31 scaled=4674 (이미 올라감) → R33부터 갑자기 3517로 떨어짐
// R30(4492) → 마지막 비보스 R47 목표를 설정
// R47 현재 scaled=3522 → 이걸 R30보다 자연스럽게 증가하도록 조정

const nonBoss_31_47 = [31,33,34,35,36,37,38,39,41,42,43,44,45,46,47]; // R32,R40=보스
const s30 = scaled(30); // 4492
// R47 목표: R30 * 1.30 정도로 자연 증가 설정 (약 5840)
const s47target = Math.round(s30 * 1.30); // ~5840

console.log('\nR30 scaled='+s30+', R47 목표 scaled='+s47target);
console.log('보간 구간: R31-R47 (R32,R40 보스 제외) '+nonBoss_31_47.length+'개');

nonBoss_31_47.forEach((r, i) => {
    const steps = nonBoss_31_47.length + 1;
    const targetScaled = Math.round(s30 + (s47target - s30) * (i + 1) / steps);
    const mult = 1 + r * 0.1;
    const oldHp = m[r].hp;
    m[r].hp = Math.round(targetScaled / mult);
    console.log('  R'+r+': hp '+oldHp+'→'+m[r].hp+' (scaled '+scaled(r)+')');
});

// ─── 최종 흐름 확인 ───
console.log('\n=== 최종 스케일드 HP 전체 흐름 ===');
Object.keys(m).sort((a,b)=>parseInt(a)-parseInt(b)).forEach(id=>{
    const tag = m[id].isBoss ? '[보스]' : '[일반]';
    console.log('R'+id+tag+' scaled='+scaled(id));
});

// ─── 저장 ───
fs.writeFileSync('assets/data/stats.json', JSON.stringify(stats, null, 2), 'utf8');

let edHp = 0;
Object.keys(m).forEach(id => {
    const hpRe = new RegExp(
        "({ id: " + id + ",\\s*name: '[^']*',\\s*type: '[^']*',\\s*hp: )\\d+(,)", 'g'
    );
    html = html.replace(hpRe, (match, pre, post) => { edHp++; return pre + m[id].hp + post; });
});
fs.writeFileSync('tools/data-editor.html', html, 'utf8');
console.log('\n✅ 저장 완료 (HP 동기화: '+edHp+'개)');
