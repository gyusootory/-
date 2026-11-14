// 스토어·공유용 이미지 만들기: 카톡 미리보기(og.png), 플레이스토어 대표 이미지, 휴대폰 스크린샷 5장
// 사용법: node tools/store_assets.js <글꼴 폴더(@fontsource 패키지들을 풀어둔 곳)>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FONT = process.argv[2], OUT = path.join(ROOT, 'store');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });

// 로컬 글꼴(@fontsource)의 CSS를 절대 경로로 바꿔 페이지에 주입 → 인터넷 없이도 실제 글꼴로 렌더링
const fontCss = [['package', 'index.css'], ['ns/package', '600.css'], ['ibm-plex-sans-kr/package', '400.css'], ['ibm-plex-sans-kr/package', '600.css'], ['ibm-plex-mono/package', '500.css']]
  .map(([d, f]) => fs.readFileSync(path.join(FONT, d, f), 'utf8').replace(/url\(\.\/files\//g, `url(file://${path.join(FONT, d, 'files')}/`)).join('\n');
const fontTag = `<style>${fontCss}</style>`;

const TOKENS = `--paper:#eef1f4;--ink:#18212e;--muted:#5b6676;--seal:#b23a2b;--accent:#2d3f8f;--disp:"Song Myung","Noto Serif KR",serif;--body:"IBM Plex Sans KR",sans-serif`;
const banner = (w, h, big) => `<!doctype html><meta charset="utf-8">${fontTag}<style>
:root{${TOKENS}} *{box-sizing:border-box} body{margin:0;width:${w}px;height:${h}px;background:var(--paper);font-family:var(--body);color:var(--ink);display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:${big ? 40 : 30}px;padding:0 ${big ? 72 : 60}px;overflow:hidden}
.seal{width:${big ? 92 : 78}px;height:${big ? 92 : 78}px;border:4px solid var(--seal);color:var(--seal);border-radius:6px;display:grid;grid-template-columns:1fr 1fr;place-items:center;font:${big ? 34 : 29}px/1 var(--disp);padding:6px;transform:rotate(-3deg);margin-bottom:${big ? 26 : 20}px}
h1{font:400 ${big ? 78 : 66}px/1.1 var(--disp);margin:0 0 ${big ? 18 : 14}px}
p{margin:0;font-size:${big ? 30 : 26}px;color:var(--muted);line-height:1.45}
.card{background:#fff;border-radius:22px;padding:${big ? 30 : 24}px;box-shadow:0 18px 50px rgb(24 33 46 / .14);display:grid;gap:16px}
.chars{display:flex;gap:10px}.c{flex:1;background:var(--paper);border-radius:12px;text-align:center;padding:10px 0}
.c b{display:block;font:600 ${big ? 64 : 54}px/1.15 var(--disp)}.c span{font-size:${big ? 20 : 17}px;font-weight:600}
.c.s{background:none;border:2px dashed #cfd6df}
.m{font:${big ? 23 : 20}px/1.5 var(--disp);color:var(--ink)}.sc{justify-self:end;font:600 ${big ? 22 : 19}px var(--body);color:var(--seal)}
</style>
<div><div class="seal"><span>價</span><span>値</span><span>作</span><span>名</span></div>
<h1>가치작명소</h1><p>아기 사주에 맞춘 이름과 한자,<br>뜻 풀이까지 한 번에</p></div>
<div class="card"><span class="sc">98점 · 최상</span><div class="chars"><div class="c s"><b>金</b><span>김</span></div><div class="c"><b>兌</b><span>태</span></div><div class="c"><b>璟</b><span>경</span></div></div>
<div class="m">“기쁨을 나누는 밝은 마음과 옥빛처럼 맑은 광채를 함께 지닌 사람”</div></div>`;

// 스크린샷 액자: 위에 한 줄 설명 + 아래 실제 화면
const frame = (img, title, sub) => `<!doctype html><meta charset="utf-8">${fontTag}<style>
:root{${TOKENS}} body{margin:0;width:1080px;height:1920px;background:var(--seal);display:grid;grid-template-rows:330px 1fr;justify-items:center;overflow:hidden;font-family:var(--body)}
.t{align-self:center;text-align:center;color:#fff}.t h2{font:400 70px/1.2 var(--disp);margin:0 0 14px}.t p{margin:0;font-size:34px;opacity:.9}
img{width:860px;border-radius:44px 44px 0 0;box-shadow:0 -10px 60px rgb(0 0 0 / .25);align-self:end}
</style><div class="t"><h2>${title}</h2><p>${sub}</p></div><img src="file://${img}">`;

(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, file) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const tmp = path.join(OUT, '_tmp.html'); fs.writeFileSync(tmp, html);   // 파일로 열어야 로컬 글꼴·이미지를 읽을 수 있음
    await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: file }); await p.close(); fs.unlinkSync(tmp);
  };
  await shot(banner(1200, 630, true), 1200, 630, path.join(ROOT, 'docs', 'og.png'));
  await shot(banner(1024, 500, false), 1024, 500, path.join(OUT, 'feature-graphic-1024x500.png'));
  fs.copyFileSync(path.join(ROOT, 'docs', 'icon-512.png'), path.join(OUT, 'icon-512.png'));

  // 실제 앱 화면 캡처 (430x1080 → 2배)
  const ctx = await b.newContext({ viewport: { width: 430, height: 1080 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true });
  const p = await ctx.newPage();
  await p.goto('file://' + path.join(ROOT, 'docs', 'index.html'));
  await p.addStyleTag({ content: fontCss }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(400);
  const raw = n => path.join(OUT, `raw-${n}.png`);
  await p.screenshot({ path: raw(1) });                                   // 입력 화면
  await p.selectOption('#sur', '김|金'); await p.selectOption('#gender', 'F'); await p.fill('#bdate', '2026-03-21'); await p.fill('#btime', '09:40');
  await p.click('#recForm button[type=submit]'); await p.waitForTimeout(500);
  await p.evaluate(() => window.scrollTo(0, 0)); await p.waitForTimeout(200);
  await p.screenshot({ path: raw(2) });                                   // 사주 + 추천 시작
  await p.evaluate(() => document.querySelector('#recOut .card').scrollIntoView({ block: 'start' })); await p.waitForTimeout(200);
  await p.screenshot({ path: raw(3) });                                   // 이름 카드 + 뜻 풀이
  await p.click('#recOut .card summary'); await p.evaluate(() => document.querySelector('#recOut .card details').scrollIntoView({ block: 'start' })); await p.waitForTimeout(200);
  await p.screenshot({ path: raw(4) });                                   // 상세 감명
  await p.click('#t-find'); await p.selectOption('#f-sur', '이|李'); await p.fill('#wantName', '서윤'); await p.click('#findForm button[type=submit]'); await p.waitForTimeout(400);
  await p.evaluate(() => document.querySelector('#findOut .card').scrollIntoView({ block: 'center' })); await p.waitForTimeout(200);
  await p.screenshot({ path: raw(5) });                                   // 한자 찾기
  const caps = [['정보 세 가지면 끝', '성씨 · 성별 · 생년월일만 입력하세요'], ['사주에 맞춘 이름 추천', '부족한 오행을 채우는 이름 5개씩'],
    ['이름에 담긴 뜻까지', '한자 한 글자씩 의미를 풀어 드려요'], ['성명학 감명 그대로', '81수리 · 음양 · 발음오행 · 삼원오행'], ['원하는 이름의 한자 찾기', '한글 이름만 넣으면 좋은 한자 조합을']];
  for (let i = 1; i <= 5; i++) await shot(frame(raw(i), ...caps[i - 1]), 1080, 1920, path.join(OUT, 'screenshots', `0${i}.png`));
  for (let i = 1; i <= 5; i++) fs.unlinkSync(raw(i));
  await b.close();
  console.log('store assets ok');
})();
