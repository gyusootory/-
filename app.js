// =====================================================================
// 화면 로직: 입력 → 사주 계산 → 이름 추천 / 한자 찾기 → 카드 렌더링
// =====================================================================
(function () {
  'use strict';
  const N = window.Naming;
  N.index(HANJA);
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const EL_CLASS = { 木: 'wood', 火: 'fire', 土: 'earth', 金: 'metal', 水: 'water' };
  const elTag = e => `<span class="el el-${EL_CLASS[e]}">${e}<small>${N.EL_KO[e]}</small></span>`;

  // ---------- 인기 이름(한글) 후보 ----------
  const NAMES = {
    M: '도윤 서준 하준 은우 시우 지호 예준 유준 수호 이준 준우 지후 건우 우진 선우 서진 민준 현우 연우 유찬 정우 승우 시윤 지환 승민 준서 지훈 윤우 태윤 민재 은찬 하율 도현 재윤 시후 한결 준혁 지성 민성 현준 성민 동현 재민 태민 승현 민호 재현 현서 우현 준영 은호 태현 성준 진우 시원 규민 영준 준호 상우 민혁 재원 정민 경민 세진 진호 태준 선호 민규 승준 은성 윤호 지혁 서우 주원 도원 시현 주안 연호 성현 원준 준희 태하 이현 도하 율 윤재 태경 정훈 지완 건희 승훈 현호 우재 해준 하진 경준 범준 석진 의준 상현'.split(' '),
    F: '서아 하윤 지안 이서 서윤 하은 지우 아윤 수아 윤서 지아 서연 하린 채원 지유 다은 예린 소율 시아 유나 서하 예은 연우 수빈 나은 채윤 민서 지원 서은 예서 윤아 하율 가은 아린 소은 지민 유진 세아 은서 다인 수연 지윤 서현 예원 채은 하연 유주 소윤 다현 서영 민지 수민 혜원 지혜 예진 가윤 나윤 서진 아인 유하 연서 수현 다연 하진 지은 채아 은채 이현 시은 예나 주아 세은 효주 연아 수진 해인 소연 가희 은지 정원 서희 다온 윤하 소희 채린 혜인 예지 아현 지수 하영 서율 리아 미소 보은 선아 은솔'.split(' '),
  };
  NAMES.U = [...new Set([...NAMES.M, ...NAMES.F])];

  // ---------- 성씨 선택 ----------
  const surSel = $('#sur');
  const surOpts = SURNAMES.map(s => `<option value="${s[0]}|${s[1]}">${s[0]} (${s[1]})</option>`).join('');
  document.querySelectorAll('.sursel').forEach(el => (el.innerHTML = '<option value="">성씨 선택</option>' + surOpts));
  // p: 입력칸 아이디 앞머리 ('' = ① 이름 추천 탭, 'f-' = ② 한자 찾기 탭)
  function surname(p = '') {
    if (!$('#' + p + 'sur').value) return null;
    const [ko, hanja] = $('#' + p + 'sur').value.split('|');
    const row = SURNAMES.find(s => s[0] === ko && s[1] === hanja);
    return { ko, hanja, strokes: row[2], els: row[3] };
  }

  // ---------- 사주 입력 ----------
  function readBirth(p = '') {
    const f = id => $('#' + p + id);
    const v = f('bdate').value; if (!v) return null;
    let [y, m, d] = v.split('-').map(Number);
    if (f('cal').value === 'lunar') {
      const c = new KoreanLunarCalendar();
      if (!c.setLunarDate(y, m, d, f('leap').checked)) return { error: '음력 날짜를 확인해 주세요 (1000~2050년, 해당 월의 일수).' };
      const s = c.getSolarCalendar(); y = s.year; m = s.month; d = s.day;
    }
    const tUnknown = f('tunknown').checked, t = f('btime').value;
    const [hh, mi] = (!tUnknown && t) ? t.split(':').map(Number) : [null, null];
    return N.saju({ y, m, d, hour: hh, minute: mi, correct: f('correct').checked });
  }

  function renderSaju(sj, p = '') {
    const box = $('#' + p + 'sajuOut');
    if (!sj) { box.innerHTML = '<p class="muted">생년월일을 입력하면 사주 오행 분석이 표시됩니다.</p>'; return; }
    if (sj.error) { box.innerHTML = `<p class="err">${esc(sj.error)}</p>`; return; }
    const ps = [...sj.pillars].reverse(); // 시·일·월·연 순(전통 표기)
    const cols = ps.map(p => `<div class="pillar${p.label === '일주' ? ' me' : ''}">
        <span class="plabel">${p.label}</span>
        <span class="gz el-${EL_CLASS[p.sEl]}">${p.stem}</span>
        <span class="gz el-${EL_CLASS[p.bEl]}">${p.branch}</span>
        <span class="pko">${p.ko}</span></div>`).join('');
    const max = Math.max(...N.ELS.map(e => sj.count[e]), 1);
    const bars = N.ELS.map(e => `<div class="bar"><span class="bl">${e}</span>
        <span class="track"><span class="fill el-bg-${EL_CLASS[e]}" style="width:${sj.count[e] / max * 100}%"></span></span>
        <span class="bn">${sj.raw[e]}</span></div>`).join('');
    const i = sj.input;
    box.innerHTML = `
      <div class="pillars">${cols}${sj.hourKnown ? '' : '<div class="pillar ghost"><span class="plabel">시주</span><span class="gz">?</span><span class="gz">?</span><span class="pko">시간 모름</span></div>'}</div>
      <p class="sajumeta">양력 ${i.y}.${i.m}.${i.d} · ${sj.animal}띠 · ${sj.jieqi} 절기 구간${sj.tzNote ? ' · ' + sj.tzNote : ''}</p>
      ${sj.jieqiDay ? '<p class="err" style="margin:0;font-size:12px">이날은 절기가 바뀌는 날이라 태어난 시각을 모르면 월주가 달라질 수 있어요. 시각을 입력하면 정확해집니다.</p>' : ''}
      <div class="bars">${bars}</div>
      <dl class="yong">
        <div><dt>일간</dt><dd>${sj.dayMaster.stem}(${sj.dayMaster.ko}) ${elTag(sj.dayMaster.el)} · ${sj.strong ? '신강' : '신약'}</dd></div>
        <div class="need"><dt>보완할 오행</dt><dd>${sj.need.map(elTag).join(' ')}</dd></div>
        <div><dt>피할 오행</dt><dd>${sj.avoid.length ? sj.avoid.map(elTag).join(' ') : '<span class="muted">없음</span>'}</dd></div>
      </dl>`;
  }

  // ---------- 이름 뜻 풀이 문장 ----------
  // 받침 유무에 따라 조사 선택 (예: 마음+을 / 지혜+를)
  function josa(word, withB, withoutB) {
    const c = word.charCodeAt(word.length - 1) - 0xAC00;
    return word + (c >= 0 && c <= 11171 && c % 28 ? withB : withoutB);
  }
  function nameMeaning(given) {
    const k = given.map(g => g.mean);
    if (k.length === 1) return `${josa(k[0], '을', '를')} 지닌 사람이 되라는 뜻을 담았습니다.`;
    const t = [
      () => `${josa(k[0], '과', '와')} ${josa(k[1], '을', '를')} 함께 지닌 사람이 되라는 뜻을 담았습니다.`,
      () => `${josa(k[0], '을', '를')} 바탕으로 ${josa(k[1], '을', '를')} 이루어 가는 사람이 되라는 뜻입니다.`,
      () => `${josa(k[0], '과', '와')} ${josa(k[1], '이', '가')} 조화를 이루는 삶을 바라는 이름입니다.`,
    ];
    return t[(given[0].ch.charCodeAt(0) + given[1].ch.charCodeAt(0)) % t.length]();
  }

  // 방문 통계 기록 (analytics.js가 없거나 꺼져 있으면 아무 일도 안 함)
  const T = (e, m) => { if (window.gachiTrack) window.gachiTrack(e, m); };

  // ---------- 공유 ----------
  const PUBLIC_URL = 'https://gyusootory.github.io/gachi-naming/';
  // 웹사이트로 올린 경우 그 주소를, 그 밖(파일·미리보기)에서는 공개 링크를 공유
  function appUrl() {
    const h = location.hostname;
    return (location.protocol === 'https:' && h && !/claude|anthropic/.test(h) ? location.origin + location.pathname : PUBLIC_URL) + '?utm_source=share'; // 공유 링크 표시(통계) + 카톡이 미리보기를 새로 읽게 함
  }
  function cardText(ko, hz, given, ev) {
    return `[가치작명소 추천 이름]\n${ko} (${hz}) · ${Math.round(ev.total)}점 ${ev.grade}\n“${nameMeaning(given)}”\n` +
      given.map(g => `${g.ch} ${g.hun} ${g.eum} — ${g.mean}`).join('\n');
  }
  let toastTimer;
  function toast(msg) {
    const t = $('#toast'); t.textContent = msg; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => (t.hidden = true), 2600);
  }
  function showShareBox(text) { // 공유·복사가 막힌 환경: 직접 선택해서 복사
    $('#shareText').value = text; $('#shareBox').hidden = false;
    $('#shareText').focus(); $('#shareText').select();
  }
  async function share(text) {
    T(text ? 'share_name' : 'share_app');
    const url = appUrl(), full = (text ? text + '\n\n' : '') + '가치작명소에서 직접 지어 보기 ▶ ' + url;
    if (navigator.share) {
      try { await navigator.share(text ? { title: '가치작명소', text: full } : { title: '가치작명소', text: '사주로 아기 이름 짓기 — 가치작명소', url }); return; }
      catch (e) { if (e && e.name === 'AbortError') return; }
    }
    try { await navigator.clipboard.writeText(full); toast('복사했어요! 카톡에 붙여넣기 하세요'); }
    catch (e) { showShareBox(full); }
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-share]'); if (b) share(b.dataset.share);
  });

  // ---------- 이름 카드 ----------
  function nameCard(item, rank, sur) {
    const { given, ev } = item;
    const fullKo = sur.ko + given.map(g => g.ko).join('');
    const fullH = sur.hanja + given.map(g => g.ch).join('');
    const chars = [
      ...sur.hanja.split('').map((c, k) => ({ ch: c, ko: sur.ko[k] || sur.ko, sub: '성씨', strokes: sur.strokes[k], el: sur.els[k], surname: true })),
      ...given.map(g => ({ ch: g.ch, ko: g.ko, sub: `${g.hun} ${g.eum}`, strokes: g.strokes, el: g.el })),
    ];
    const P = ev.parts;
    const parts = [['수리', P.suri, 40], ['자원오행', P.ja, 25], ['발음오행', P.sound, 15], ['음양', P.yinyang, 10], ['삼원오행', P.sam, 10]];
    const gy = ev.gyeok.map(g => `<tr><th>${g.key}</th><td>${g.age}</td><td class="num">${g.num}</td>
        <td><span class="pill g${g.grade}">${N.GRADE_KO[g.grade]}</span></td><td>${g.name} — ${g.desc}</td></tr>`).join('');
    const alts = (item.alts || []).map(a => `<li><b>${a.given.map(g => g.ch).join('')}</b> ${a.given.map(g => g.hun + ' ' + g.eum).join(', ')} <span class="num">${a.ev.total}점</span></li>`).join('');
    return `<article class="card">
      <header class="chead">
        ${rank ? `<span class="rank">${rank}</span>` : ''}
        <div class="score" style="--p:${ev.total}"><b>${Math.round(ev.total)}</b><small>${ev.grade}</small></div>
      </header>
      <div class="chars">${chars.map(c => `<div class="ch${c.surname ? ' sur' : ''}">
          <span class="hz">${c.ch}</span><span class="hk">${c.ko}</span>
          <span class="hs">${esc(c.sub)}</span>
          <span class="hm">${c.strokes}획 ${elTag(c.el)}</span></div>`).join('')}</div>
      <div class="meaning">
        <p class="msent">“${esc(nameMeaning(given))}”</p>
        <ul class="mlist">${given.map(g => `<li><b>${g.ch}</b><span class="mh">${esc(g.hun)} ${g.eum}</span><span class="mk">${esc(g.mean)}</span></li>`).join('')}</ul>
      </div>
      <ul class="parts">${parts.map(([k, v, m]) => `<li><span>${k}</span><span class="pt"><i style="width:${v / m * 100}%"></i></span><span class="num">${v}/${m}</span></li>`).join('')}</ul>
      ${ev.warn.length ? `<p class="warn">${ev.warn.map(esc).join(' · ')}</p>` : ''}
      <details><summary>상세 감명 보기</summary>
        <h4>원형이정 4격 (81수리)</h4>
        <div class="tw"><table><tbody>${gy}</tbody></table></div>
        <h4>음양 · 발음오행 · 삼원오행</h4>
        <ul class="facts">
          <li><b>획수 음양</b> ${ev.yy.join(' · ')} → ${ev.mixed ? '음양 조화' : '한쪽으로 치우침'}</li>
          <li><b>발음오행</b> ${ev.syl.map((s, k) => `${s}(${N.CHO_NAME[N.decompose(s).cho]}) ${elTag(ev.sEls[k])}`).join(' → ')} <span class="muted">${ev.soundRel.join(', ')}</span></li>
          <li><b>삼원오행</b> 천격 ${elTag(ev.sam[0])} → 인격 ${elTag(ev.sam[1])} → 지격 ${elTag(ev.sam[2])} <span class="muted">${ev.samRel.join(', ')}</span></li>
          <li><b>자원오행</b> ${given.map((g, k) => `${g.ch} ${elTag(g.el)} <span class="muted">${ev.jaNote[k]}</span>`).join(' / ')}</li>
        </ul>
        ${alts ? `<h4>같은 소리의 다른 한자 조합</h4><ul class="alts">${alts}</ul>` : ''}
      </details>
      <div class="cact">
        <button class="act" type="button" data-share="${esc(cardText(fullKo, fullH, given, ev))}">이 이름 공유하기</button>
        <button class="act ghost" type="button" data-copy="${esc(fullKo + ' ' + fullH)}">이름만 복사</button>
      </div>
    </article>`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const t = b.dataset.copy; T('copy_name');
    const done = () => { const o = b.textContent; b.textContent = '복사됨'; setTimeout(() => (b.textContent = o), 1200); };
    const fail = () => { b.textContent = t; b.classList.add('sel'); }; // 복사 불가 시 텍스트를 보여 직접 선택하게 함
    if (navigator.clipboard) navigator.clipboard.writeText(t).then(done, fail); else fail();
  });

  // ---------- 기능 1: 사주 맞춤 추천 ----------
  let pool = [], shown = new Set();
  function hangSpec() {
    const v = $('#hangSel').value; if (!v) return null;
    return { h: N.byChar(v), pos: +$('#hangPos').value };
  }
  function fillHangSel() {
    const s = $('#hangEum').value.trim();
    const list = s ? N.candidates(s) : [];
    $('#hangSel').innerHTML = '<option value="">항렬자 없음</option>' + list.map(h => `<option value="${h.ch}">${h.ch} (${h.hun} ${h.eum}, ${h.strokes}획)</option>`).join('');
    if (list.length) $('#hangSel').value = list[0].ch;
    $('#hangHint').textContent = s && !list.length ? `‘${s}’ 음의 한자가 데이터에 없습니다.` : '';
  }
  function buildPool(sj) {
    const sur = surname();
    const gender = $('#gender').value;
    let names = NAMES[gender].filter(n => n.length === 2 || $('#allowOne').checked);
    const hs = hangSpec();
    let fixed = null;
    if (hs) {
      const other = new Set();
      NAMES[gender].forEach(n => { if (n.length === 2) other.add(n[1 - hs.pos]); });
      // 입력한 소리(예: 律 → '율')를 그대로 이름에 사용
      const say = $('#hangEum').value.trim() || hs.h.eum;
      names = [...other].filter(o => o !== say).map(o => hs.pos === 0 ? say + o : o + say);
      fixed = hs.pos === 0 ? [hs.h, null] : [null, hs.h];
    }
    pool = names.map(n => {
      const r = N.rankHanja(sur, n.split(''), sj, fixed, true);
      return r.length ? { hangul: n, ...r[0], alts: r.slice(1, 4) } : null;
    }).filter(Boolean).sort((a, b) => b.ev.total - a.ev.total);
    shown = new Set();
  }
  function pickFive() {
    const top = pool.slice(0, Math.max(30, Math.ceil(pool.length * 0.45))).filter(x => !shown.has(x.hangul));
    let src = top.length >= 5 ? top : pool.filter(x => !shown.has(x.hangul));
    let reset = false;
    if (src.length < 5) { shown = new Set(); src = pool.slice(0, 30); reset = true; }
    // 점수가 높을수록 뽑힐 확률이 높은 가중 무작위 추출
    const pick = [], bag = [...src];
    while (pick.length < 5 && bag.length) {
      const w = bag.map(x => Math.pow(Math.max(x.ev.total - 50, 1), 3));
      let r = Math.random() * w.reduce((a, b) => a + b, 0), i = 0;
      while ((r -= w[i]) > 0 && i < bag.length - 1) i++; // 소수점 오차로 범위를 넘지 않게
      pick.push(bag.splice(i, 1)[0]);
    }
    pick.sort((a, b) => b.ev.total - a.ev.total).forEach(x => shown.add(x.hangul));
    return { pick, reset };
  }
  let round = 0;
  function showRecs(rebuild) {
    const sj = readBirth();
    renderSaju(sj);
    if (!sj || sj.error) { $('#recOut').innerHTML = '<p class="muted">생년월일을 먼저 입력해 주세요.</p>'; return; }
    if (rebuild) { buildPool(sj); round = 0; }
    if (!pool.length) { $('#recOut').innerHTML = '<p class="muted">조건에 맞는 이름이 없습니다. 항렬자나 성별 조건을 바꿔 보세요.</p>'; return; }
    const { pick, reset } = pickFive(); round = reset ? 1 : round + 1;
    $('#recMeta').textContent = `${pool.length}개 후보 중 ${round}번째 추천 · 지금까지 ${shown.size}개 제안`;
    $('#recOut').innerHTML = (reset ? '<p class="muted">상위 후보를 모두 보여드려 처음부터 다시 추천합니다.</p>' : '') + pick.map((x, k) => nameCard(x, k + 1, surname())).join('');
  }

  // ---------- 기능 2: 한자 찾기 ----------
  let findList = [], findShown = 0;
  function showFind() {
    const raw = $('#wantName').value.replace(/\s/g, '');
    const out = $('#findOut');
    const stop = msg => { out.innerHTML = `<p class="err">${msg}</p>`; $('#findMore').hidden = true; $('#findMeta').textContent = ''; $('#candOut').innerHTML = ''; };
    if (!/^[가-힣]{1,2}$/.test(raw)) return stop('이름(성 제외)을 한글 1~2자로 입력해 주세요. 예: 서윤');
    if (!surname('f-')) return stop('성씨를 선택해 주세요.');
    const sko = surname('f-').ko;
    if (raw.length === 2 && raw[0] === sko && !N.candidates(raw[0]).length) return stop(`성씨 ‘${sko}’${josa(sko, '은', '는').slice(sko.length)} 빼고 이름만 입력해 주세요. 예: ${sko}서윤 → 서윤`);
    const use = $('#useSaju').checked;
    const sj = use ? readBirth('f-') : null;
    $('#f-sajuOut').hidden = !use;
    if (use) renderSaju(sj, 'f-');
    const syl = raw.split('');
    const missing = syl.filter(s => !N.candidates(s).length);
    const cand = syl.map(s => `<div class="cand"><h4>‘${s}’ 후보 한자 <span class="muted">${N.candidates(s).length}자</span></h4>
        <ul>${N.candidates(s).map(h => `<li>${elTag(h.el)}<b>${h.ch}</b> ${esc(h.hun)} ${h.eum} <span class="num">${h.strokes}획</span><small class="ck">${esc(h.mean)}</small></li>`).join('') || '<li class="muted">데이터에 없는 음입니다</li>'}</ul></div>`).join('');
    $('#candOut').innerHTML = cand;
    if (missing.length) { out.innerHTML = `<p class="err">‘${missing.join(', ')}’ 음의 이름용 한자가 데이터에 없어 한자 조합을 만들 수 없습니다.</p>`; $('#findMore').hidden = true; $('#findMeta').textContent = ''; return; }
    findList = N.rankHanja(surname('f-'), syl, sj && !sj.error ? sj : null, null);
    findShown = 0; out.innerHTML = '';
    $('#findMeta').textContent = `${surname('f-').ko}${raw} · 가능한 한자 조합 ${findList.length}개를 점수순으로 정렬했습니다${sj && !sj.error ? ' (사주 반영)' : ' (사주 미반영)'}.`;
    moreFind();
  }
  function moreFind() {
    const next = findList.slice(findShown, findShown + 6);
    $('#findOut').insertAdjacentHTML('beforeend', next.map((x, k) => nameCard(x, findShown + k + 1, surname('f-'))).join(''));
    findShown += next.length;
    $('#findMore').hidden = findShown >= findList.length;
  }

  // ---------- 모바일: 명식 입력 접기/펼치기 ----------
  const mobile = window.matchMedia('(max-width: 760px)');
  const panel = $('#recForm');
  function updateSummary() {
    if (!surSel.value || !$('#gender').value || !$('#bdate').value) { $('#fsumText').textContent = '아기 정보를 입력해 주세요'; return; }
    const g = { M: '남', F: '여', U: '성별 무관' }[$('#gender').value];
    const d = $('#bdate').value.replace(/-/g, '.');
    const t = $('#tunknown').checked ? '시간 모름' : ($('#btime').value || '시간 모름');
    const cal = $('#cal').value === 'lunar' ? ('음력' + ($('#leap').checked ? '(윤)' : '')) : '양력';
    const hs = $('#hangSel').value;
    $('#fsumText').textContent = `${surSel.value.replace('|', '(')}) · ${g} · ${cal} ${d} ${t}${hs ? ' · 항렬 ' + hs : ''}`;
  }
  function setCollapsed(c) {
    panel.classList.toggle('collapsed', c);
    $('#fsum').setAttribute('aria-expanded', String(!c));
    $('#feditLbl').textContent = c ? '정보 수정' : '접기';
  }
  $('#fsum').addEventListener('click', () => setCollapsed(!panel.classList.contains('collapsed')));
  panel.addEventListener('change', updateSummary);
  panel.addEventListener('input', updateSummary);

  $('#appShare').addEventListener('click', () => share(''));
  $('#shareClose').addEventListener('click', () => ($('#shareBox').hidden = true));
  $('#shareBox').addEventListener('click', e => { if (e.target.id === 'shareBox') $('#shareBox').hidden = true; });

  // ---------- 필수 입력 표시·검사 ----------
  const reqFields = form => [...form.querySelectorAll('.field[data-req]')]
    .filter(f => f.dataset.req !== 'saju' || $('#useSaju').checked);
  const ctl = f => f.querySelector('input, select');
  function markNeed() {
    document.querySelectorAll('.field[data-req]').forEach(f => {
      const empty = !ctl(f).value.trim();
      f.classList.toggle('need', empty);
      if (!empty) { f.classList.remove('miss'); const e = f.querySelector('.ferr'); if (e) e.remove(); }
    });
  }
  function validate(form) {
    markNeed();
    const missing = reqFields(form).filter(f => !ctl(f).value.trim());
    missing.forEach(f => {
      f.classList.remove('miss'); void f.offsetWidth; f.classList.add('miss'); // 흔들림 다시 재생
      if (!f.querySelector('.ferr')) f.insertAdjacentHTML('beforeend', '<small class="ferr">꼭 입력해 주세요</small>');
    });
    if (missing.length) {
      if (mobile.matches) setCollapsed(false);
      ctl(missing[0]).focus({ preventScroll: true });
      missing[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
      toast(`필수 항목 ${missing.length}개를 입력해 주세요`);
    }
    return !missing.length;
  }
  document.addEventListener('input', markNeed);
  document.addEventListener('change', markNeed);

  // ---------- 탭 ----------
  function setTab(t) {
    document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
    document.querySelectorAll('[role=tabpanel]').forEach(p => (p.hidden = p.id !== 'p-' + t));
    try { localStorage.setItem('naming-tab', t); } catch (e) {}
  }
  document.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => { setTab(b.dataset.tab); window.scrollTo(0, 0); T('tab', { tab: b.dataset.tab }); }));
  document.addEventListener('toggle', e => { if (e.target.matches && e.target.matches('.card details') && e.target.open) T('detail_open'); }, true);

  // ---------- 이벤트 ----------
  ['', 'f-'].forEach(p => {
    $('#' + p + 'cal').addEventListener('change', () => ($('#' + p + 'leapWrap').hidden = $('#' + p + 'cal').value !== 'lunar'));
    $('#' + p + 'tunknown').addEventListener('change', () => ($('#' + p + 'btime').disabled = $('#' + p + 'tunknown').checked));
  });
  $('#useSaju').addEventListener('change', () => {
    $('#f-birth').hidden = !$('#useSaju').checked;
    if (!$('#useSaju').checked) $('#f-sajuOut').hidden = true;
    if (findList.length && $('#wantName').value && surname('f-')) showFind(); // 이미 결과가 있으면 다시 계산
  });
  $('#hangEum').addEventListener('input', fillHangSel);
  $('#recForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate($('#recForm'))) return;
    showRecs(true); $('#moreBtn').hidden = false; $('#fsum').hidden = false;
    T('recommend', { gender: $('#gender').value, has_time: !!$('#btime').value && !$('#tunknown').checked,
      lunar: $('#cal').value === 'lunar', hangyeol: !!$('#hangSel').value, candidates: pool.length });
    if (mobile.matches) { setCollapsed(true); $('#recOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); }
  });
  $('#moreBtn').addEventListener('click', () => { showRecs(false); T('more', { round }); $('#recOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#findForm').addEventListener('submit', e => {
    e.preventDefault();
    if (!validate($('#findForm'))) return;
    showFind();
    // 성씨는 빼고 이름 글자만 기록 (인기 이름 통계용)
    T('find', { name: $('#wantName').value.replace(/\s/g, '').slice(0, 2), saju: $('#useSaju').checked, combos: findList.length });
    if (mobile.matches) $('#findMeta').scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  $('#findMore').addEventListener('click', moreFind);
  ['', 'f-'].forEach(p => ['sur', 'bdate', 'btime', 'cal', 'leap', 'tunknown', 'correct'].forEach(id =>
    $('#' + p + id).addEventListener('change', () => { if (!p || $('#useSaju').checked) renderSaju(readBirth(p), p); })));

  // ---------- 첫 화면: 모든 칸 비움 + 필수 칸 강조 ----------
  fillHangSel();
  updateSummary();
  setCollapsed(false);
  markNeed();
  renderSaju(null);
  let tab = 'rec'; try { tab = localStorage.getItem('naming-tab') || 'rec'; } catch (e) {}
  if (tab !== 'rec' && tab !== 'find') tab = 'rec';
  setTab(tab);
})();
