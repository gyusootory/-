// 스토어·공유용 이미지 만들기: 카톡 미리보기(og.png), 플레이스토어 대표 이미지, 휴대폰 스크린샷 5장
// 사용법: node tools/store_assets.js <글꼴 폴더(@fontsource 패키지들을 풀어둔 곳)>
const { chromium } = require('playwright');
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..'), FONT = process.argv[2], OUT = path.join(ROOT, 'store');
fs.mkdirSync(path.join(OUT, 'screenshots'), { recursive: true });

// 로컬 글꼴(@fontsource)의 CSS를 절대 경로로 바꿔 페이지에 주입 → 인터넷 없이도 실제 글꼴로 렌더링
const fontCss = [['package', 'index.css'], ['ns/package', '500.css'], ['ns/package', '600.css'], ['ns/package', '700.css'], ['ibm-plex-sans-kr/package', '400.css'], ['ibm-plex-sans-kr/package', '600.css'], ['ibm-plex-mono/package', '500.css']]
  .map(([d, f]) => fs.readFileSync(path.join(FONT, d, f), 'utf8').replace(/url\(\.\/files\//g, `url(file://${path.join(FONT, d, 'files')}/`)).join('\n');
const fontTag = `<style>${fontCss}</style>`;

const TOKENS = `--band:#121826;--ivory:#efe8d8;--muted:#a39b8a;--gold:#c9a86a;--tile:#f7f6f2;--ink:#141a26;--disp:"Noto Serif KR",serif;--body:"IBM Plex Sans KR",sans-serif`;
const ICON = 'file://' + path.join(ROOT, 'docs', 'icon-512.png');
const banner = (w, h, big) => `<!doctype html><meta charset="utf-8">${fontTag}<style>
:root{${TOKENS}} *{box-sizing:border-box} body{margin:0;width:${w}px;height:${h}px;background:radial-gradient(120% 140% at 15% 50%,#1b2333 0%,var(--band) 60%);font-family:var(--body);color:var(--ivory);display:grid;grid-template-columns:1.05fr 1fr;align-items:center;gap:${big ? 44 : 32}px;padding:0 ${big ? 76 : 60}px;overflow:hidden}
.logo{width:${big ? 104 : 86}px;height:${big ? 104 : 86}px;border-radius:24px;box-shadow:0 0 0 1px rgb(201 168 106 / .4),0 14px 40px rgb(0 0 0 / .45);margin-bottom:${big ? 30 : 22}px;display:block}
h1{font:600 ${big ? 74 : 62}px/1.1 var(--disp);letter-spacing:.06em;margin:0 0 ${big ? 18 : 14}px;color:var(--ivory)}
.rule{width:56px;height:1px;background:var(--gold);margin:0 0 ${big ? 18 : 14}px}
p{margin:0;font-size:${big ? 28 : 24}px;color:var(--muted);line-height:1.5;letter-spacing:.01em}
.card{background:#fff;color:var(--ink);border-radius:26px;padding:${big ? 30 : 24}px;box-shadow:0 24px 60px rgb(0 0 0 / .45);display:grid;gap:16px}
.chars{display:flex;gap:10px}.c{flex:1;background:var(--tile);border-radius:16px;text-align:center;padding:12px 0 10px}
.c b{display:block;font:600 ${big ? 62 : 52}px/1.15 var(--disp)}.c span{font-size:${big ? 19 : 16}px;font-weight:600}
.c.s{background:none;border:1px solid #e2dfd7}
.m{background:#f8f3e7;border-radius:16px;padding:14px 16px;font:500 ${big ? 22 : 19}px/1.55 var(--disp)}.sc{justify-self:end;font:600 ${big ? 20 : 17}px var(--disp);color:#8a6a2f;letter-spacing:.04em}
</style>
<div><img class="logo" src="${ICON}"><h1>가치작명소</h1><div class="rule"></div><p>아기 사주에 맞춘 이름과 한자,<br>뜻 풀이까지 한 번에</p></div>
<div class="card"><span class="sc">98점 · 최상</span><div class="chars"><div class="c s"><b>金</b><span>김</span></div><div class="c"><b>兌</b><span>태</span></div><div class="c"><b>璟</b><span>경</span></div></div>
<div class="m">“기쁨을 나누는 밝은 마음과 옥빛처럼 맑은 광채를 함께 지닌 사람”</div></div>`;

// 스크린샷 액자: 위에 한 줄 설명 + 아래 실제 화면
const frame = (img, title, sub) => `<!doctype html><meta charset="utf-8">${fontTag}<style>
:root{${TOKENS}} body{margin:0;width:1080px;height:1920px;background:radial-gradient(90% 40% at 50% 0%,#1d2638 0%,var(--band) 70%);display:grid;grid-template-rows:340px 1fr;justify-items:center;overflow:hidden;font-family:var(--body)}
.t{align-self:center;text-align:center;color:var(--ivory)}.t h2{font:600 68px/1.2 var(--disp);letter-spacing:.04em;margin:0 0 18px}.t p{margin:0;font-size:32px;color:var(--gold);letter-spacing:.02em}
img{width:860px;border-radius:48px 48px 0 0;box-shadow:0 0 0 2px rgb(201 168 106 / .35),0 -10px 70px rgb(0 0 0 / .5);align-self:end}
</style><div class="t"><h2>${title}</h2><p>${sub}</p></div><img src="file://${img}">`;

// 카톡·SNS 미리보기(og.png): 작게 보여도 읽히도록 아이콘 + 이름 + 금색 선 + 한 줄 문구만 가운데 정렬
const ogCard = () => `<!doctype html><meta charset="utf-8">${fontTag}<style>
:root{${TOKENS}} *{box-sizing:border-box} body{margin:0;width:1200px;height:630px;overflow:hidden;font-family:var(--body);
background:radial-gradient(55% 75% at 50% 42%,#1f2a3e 0%,#141b2a 45%,#0c111b 100%);color:var(--ivory);display:grid;place-items:center;text-align:center}
.frame{position:absolute;inset:26px;border:1px solid rgb(201 168 106 / .28);border-radius:18px}
.frame:after{content:"";position:absolute;inset:8px;border:1px solid rgb(201 168 106 / .12);border-radius:12px}
.wm{position:absolute;right:70px;bottom:-60px;font:600 360px/1 var(--disp);color:rgb(201 168 106 / .035)}
main{position:relative;display:grid;justify-items:center}
img{width:132px;height:132px;border-radius:30px;box-shadow:0 0 0 1px rgb(201 168 106 / .45),0 18px 50px rgb(0 0 0 / .55);margin-bottom:34px}
h1{font:600 86px/1 var(--disp);letter-spacing:.14em;margin:0 0 0 .14em}
.rule{display:flex;align-items:center;gap:16px;margin:30px 0 24px;color:var(--gold);font:500 20px var(--disp);letter-spacing:.5em}
.rule:before,.rule:after{content:"";width:70px;height:1px;background:linear-gradient(90deg,transparent,var(--gold))}.rule:after{transform:scaleX(-1)}
p{margin:0;font:500 30px/1.4 var(--disp);color:#d9cfb8;letter-spacing:.04em}
</style><div class="frame"></div><div class="wm">名</div>
<main><img src="${ICON}"><h1>가치작명소</h1><div class="rule">價値作名</div><p>평생 부를 이름, 성명학 기반으로 가치 있게 지어 드립니다</p></main>`;

(async () => {
  const b = await chromium.launch();
  const shot = async (html, w, h, file) => {
    const p = await b.newPage({ viewport: { width: w, height: h }, deviceScaleFactor: 1 });
    const tmp = path.join(OUT, '_tmp.html'); fs.writeFileSync(tmp, html);   // 파일로 열어야 로컬 글꼴·이미지를 읽을 수 있음
    await p.goto('file://' + tmp, { waitUntil: 'load' }); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(300);
    await p.screenshot({ path: file }); await p.close(); fs.unlinkSync(tmp);
  };
  await shot(ogCard(), 1200, 630, path.join(ROOT, 'docs', 'og.png'));
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
