// 성명학 검증 스크립트: 원획·81수리·사주 경계·두음법칙·점수
const fs = require('fs');
eval(fs.readFileSync(__dirname + '/../hanja-data.js', 'utf8').replace(/^const /gm, 'globalThis.'));
require(__dirname + '/../engine.js');
const N = globalThis.Naming; N.index(HANJA);
const K = require(__dirname + '/../korean-lunar-calendar.min.js');
let fail = 0; const ok = (c, m) => { if (!c) { fail++; console.log('  ✗', m); } };

// 1) 원획 (성명학 통용값)
const KNOWN = {浩:11,賢:15,智:12,恩:10,美:9,英:11,秀:7,珍:10,炫:9,慧:15,允:4,雅:12,娟:10,淑:12,熙:13,承:8,泰:10,永:5,源:14,河:9,
  書:10,瑞:14,憲:16,德:15,道:16,建:9,慶:15,寧:14,勳:16,煥:13,炳:9,錫:16,鍾:17,東:8,洙:10,載:13,範:15,衡:16,茂:11,華:14,
  俊:9,民:5,敏:11,成:7,延:7,玟:9,珉:10,宇:6,潤:16,在:6,鉉:13,昊:8,秉:8,翼:17,求:7,政:9,蓮:17,律:9,姸:9,沇:8,汀:6};
const by = c => N.byChar(c);
for (const [c, n] of Object.entries(KNOWN)) ok(by(c) && by(c).strokes === n, `원획 ${c}: ${by(c) && by(c).strokes} ≠ ${n}`);
const SUR = {金:8,李:7,朴:6,崔:11,鄭:19,姜:9,趙:14,尹:4,張:11,林:8,韓:17,吳:7,徐:10,申:5,權:22,黃:12,安:6,宋:7,柳:9,洪:10,全:6,高:10,孫:10,文:4,梁:11,裵:14,白:5,許:11,劉:15,南:9,沈:8,盧:16,河:9,丁:2,郭:15,成:7,車:7,具:8,羅:20,陳:16,池:7,蔡:17,邊:22,都:16,蘇:22,表:9,玄:5,王:4,琴:13,陸:16,諸:16,魏:18};
for (const [c, n] of Object.entries(SUR)) { const r = SURNAMES.find(s => s[1] === c); ok(r && r[2][0] === n, `성씨 ${c}: ${r && r[2][0]} ≠ ${n}`); }
console.log('1) 원획 검사', Object.keys(KNOWN).length + Object.keys(SUR).length, '자');

// 2) 81수리 4격 손계산 대조: 김민준 金敏俊 = 8 / 11 / 9
const sur = (h) => { const r = SURNAMES.find(s => s[1] === h); return { ko: r[0], hanja: r[1], strokes: r[2], els: r[3] }; };
const g = s => s.split('').map((c, i) => ({ ...by(c), ko: by(c).eum }));
let ev = N.evaluate(sur('金'), g('敏俊'), null);
ok(ev.gyeok.map(x => x.num).join() === '20,19,17,28', '김민준 4격 ' + ev.gyeok.map(x => x.num));
ok(ev.gyeok.map(x => x.grade).join() === '0,0,2,0', '김민준 길흉 ' + ev.gyeok.map(x => x.grade));
// 복성: 남궁(9+10) + 민(10)준(9)
ev = N.evaluate(sur('南宮'), g('珉俊'), null);
ok(ev.gyeok.map(x => x.num).join() === '19,29,28,38', '남궁민준 4격 ' + ev.gyeok.map(x => x.num));
// 외자: 이(7) + 준(9) → 원 9, 형 16, 이 7, 정 16
ev = N.evaluate(sur('李'), g('俊'), null);
ok(ev.gyeok.map(x => x.num).join() === '9,16,7,16', '이준(외자) 4격 ' + ev.gyeok.map(x => x.num));
// 81 초과: 82 → 2
ok(N.suri(82).n === 2 && N.suri(81).n === 81, '81 초과 환원');
// 발음오행: 김(ㄱ木)-서(ㅅ金)-윤(ㅇ土) → 木剋土? 木→金 상극, 金→土 상생
ev = N.evaluate(sur('金'), g('瑞允'), null);
ok(ev.sEls.join() === '木,金,土' && ev.soundRel.join() === '상극,상생', '발음오행 김서윤 ' + ev.sEls + ' ' + ev.soundRel);
// 음양: 金8 瑞14 允4 → 모두 짝수 → 0점
ok(!ev.mixed && ev.parts.yinyang === 0, '음양 전부 음 감지');
console.log('2) 수리·발음·음양 검사 완료');

// 3) 사주 경계
const P = o => N.saju(o).pillars.map(p => p.stem + p.branch).join(' ');
ok(P({y:2024,m:2,d:4,hour:17,minute:0}).startsWith('癸卯 乙丑'), '입춘 직전(17:00) 전년 ' + P({y:2024,m:2,d:4,hour:17,minute:0}));
ok(P({y:2024,m:2,d:4,hour:17,minute:40}).startsWith('甲辰 丙寅'), '입춘 직후(17:40) 신년 ' + P({y:2024,m:2,d:4,hour:17,minute:40}));
// 자시: 2024-03-10 23:40(보정 23:10) → 다음 날 일주, 子시
const d10 = N.saju({y:2024,m:3,d:10,hour:12,minute:0}).pillars[2], d11 = N.saju({y:2024,m:3,d:11,hour:12,minute:0}).pillars[2];
const late = N.saju({y:2024,m:3,d:10,hour:23,minute:40}).pillars;
ok(late[2].stem + late[2].branch === d11.stem + d11.branch && late[3].branch === '子', '23:40 출생 → 다음 날 子시');
const at2310 = N.saju({y:2024,m:3,d:10,hour:23,minute:10}).pillars;
ok(at2310[2].stem === d10.stem && at2310[3].branch === '亥', '23:10 출생(보정 22:40) → 당일 亥시');
const at0010 = N.saju({y:2024,m:3,d:11,hour:0,minute:10}).pillars;
ok(at0010[2].stem === d11.stem && at0010[3].branch === '子', '00:10 출생 → 당일 子시');
// 시간 모름 → 3기둥
ok(N.saju({y:2024,m:3,d:10,hour:null}).pillars.length === 3, '시간 모름 3주');
// 일주 대조 2만 일
let bad = 0;
for (let i = 0; i < 20000; i++) { const t = new Date(Date.UTC(1901, 0, 1) + i * 86400000 * 2.7); const y = t.getUTCFullYear(), m = t.getUTCMonth() + 1, d = t.getUTCDate();
  const c = new K(); c.setSolarDate(y, m, d); const r = N.saju({ y, m, d, hour: null }).pillars[2]; if (!c.getGapja(true).day.startsWith(r.stem + r.branch)) bad++; }
ok(bad === 0, '일주 불일치 ' + bad);
// 월주: 매달 15일 정오의 월지 = 절기 순서
for (let m = 1; m <= 12; m++) { const b = N.saju({y:2023,m,d:15,hour:12,minute:0}).pillars[1].branch; ok(b === '丑寅卯辰巳午未申酉戌亥子'[m - 1], `2023-${m}-15 월지 ${b}`); }
console.log('3) 사주 경계 검사 완료 (일주 2만 일 대조)');

// 4) 두음법칙·후보
ok(N.candidates('율').some(h => h.ch === '律'), '율→律');
ok(N.candidates('영').some(h => h.ch === '寧'), '영→寧');
ok(N.candidates('유').some(h => h.ch === '柳'), '유→柳');
ok(N.candidates('이').some(h => h.ch === '理'), '이→理');
console.log('4) 두음법칙 검사 완료');
// 5) 전체 이름의 점수 분포
const sj = N.saju({y:2025,m:3,d:15,hour:8,minute:30});
const scores = [];
'서윤 하준 도윤 지안 민준 서아'.split(' ').forEach(n => { const r = N.rankHanja(sur('金'), n.split(''), sj, null, true); scores.push(n + ' ' + r.length + '조합 최고 ' + r[0].ev.total + ' ' + r[0].given.map(x => x.ch).join('')); });
console.log('5)', scores.join(' | '));
console.log(fail ? `\n실패 ${fail}건` : '\n모든 검사 통과');
// 6) 표준시·서머타임·절기일 경고
const a = N.saju({y:1988,m:7,d:1,hour:0,minute:20}); // 서머타임: 실제 23:20(전날), 보정 22:50 → 亥시, 전날 일주
const prev = N.saju({y:1988,m:6,d:30,hour:12,minute:0}).pillars[2];
console.log('6) 1988 서머타임 00:20 →', a.pillars.map(p=>p.stem+p.branch).join(' '), a.tzNote, '| 전날 일주', prev.stem+prev.branch);
const b = N.saju({y:1958,m:5,d:1,hour:23,minute:10}); // UTC+8:30 → 보정 0분 → 23:10 → 다음날 子시
console.log('   1958 23:10 →', b.pillars.map(p=>p.stem+p.branch).join(' '), b.tzNote);
console.log('   2024-02-04 시간모름 절기일 경고:', N.saju({y:2024,m:2,d:4,hour:null}).jieqiDay, '/ 2024-02-10:', N.saju({y:2024,m:2,d:10,hour:null}).jieqiDay);
