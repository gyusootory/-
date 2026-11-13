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
  const surKos = [...new Set(SURNAMES.map(s => s[0]))];
  surSel.innerHTML = surKos.map(k => {
    const opts = SURNAMES.filter(s => s[0] === k);
    return opts.map(s => `<option value="${s[0]}|${s[1]}">${s[0]} (${s[1]})</option>`).join('');
  }).join('');
  function surname() {
    const [ko, hanja] = surSel.value.split('|');
    const row = SURNAMES.find(s => s[0] === ko && s[1] === hanja);
    return { ko, hanja, strokes: row[2], els: row[3] };
  }

  // ---------- 사주 입력 ----------
  function readBirth() {
    const v = $('#bdate').value; if (!v) return null;
    let [y, m, d] = v.split('-').map(Number);
    if ($('#cal').value === 'lunar') {
      const c = new KoreanLunarCalendar();
      if (!c.setLunarDate(y, m, d, $('#leap').checked)) return { error: '음력 날짜를 확인해 주세요 (1000~2050년, 해당 월의 일수).' };
      const s = c.getSolarCalendar(); y = s.year; m = s.month; d = s.day;
    }
    const tUnknown = $('#tunknown').checked, t = $('#btime').value;
    const [hh, mi] = (!tUnknown && t) ? t.split(':').map(Number) : [null, null];
    return N.saju({ y, m, d, hour: hh, minute: mi, correct: $('#correct').checked });
  }

  function renderSaju(sj) {
    const box = $('#sajuOut');
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
      <p class="sajumeta">양력 ${i.y}.${i.m}.${i.d} · ${sj.animal}띠 · ${sj.jieqi} 절기 구간</p>
      <div class="bars">${bars}</div>
      <dl class="yong">
        <div><dt>일간</dt><dd>${sj.dayMaster.stem}(${sj.dayMaster.ko}) ${elTag(sj.dayMaster.el)} · ${sj.strong ? '신강' : '신약'}</dd></div>
        <div><dt>보완할 오행</dt><dd>${sj.need.map(elTag).join(' ')}</dd></div>
        <div><dt>피할 오행</dt><dd>${sj.avoid.length ? sj.avoid.map(elTag).join(' ') : '<span class="muted">없음</span>'}</dd></div>
      </dl>`;
  }

  // ---------- 이름 카드 ----------
  function nameCard(item, rank) {
    const { given, ev } = item;
    const sur = surname();
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
      <p class="meaning">${given.map(g => `<b>${g.ch}</b> ${esc(g.hun)}`).join(' · ')}</p>
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
      <button class="copy" type="button" data-copy="${esc(fullKo + ' ' + fullH)}">${esc(fullKo)} ${esc(fullH)} 복사</button>
    </article>`;
  }

  document.addEventListener('click', e => {
    const b = e.target.closest('[data-copy]'); if (!b) return;
    const t = b.dataset.copy;
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
      names = [...other].filter(o => o !== hs.h.eum).map(o => hs.pos === 0 ? hs.h.eum + o : o + hs.h.eum);
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
      while ((r -= w[i]) > 0) i++;
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
    $('#recOut').innerHTML = (reset ? '<p class="muted">상위 후보를 모두 보여드려 처음부터 다시 추천합니다.</p>' : '') + pick.map((x, k) => nameCard(x, k + 1)).join('');
  }

  // ---------- 기능 2: 한자 찾기 ----------
  let findList = [], findShown = 0;
  function showFind() {
    const raw = $('#wantName').value.replace(/\s/g, '');
    const out = $('#findOut');
    if (!/^[가-힣]{1,2}$/.test(raw)) { out.innerHTML = '<p class="err">이름(성 제외)을 한글 1~2자로 입력해 주세요. 예: 서윤</p>'; $('#findMore').hidden = true; return; }
    const sj = $('#useSaju').checked ? readBirth() : null;
    renderSaju(readBirth());
    const syl = raw.split('');
    const missing = syl.filter(s => !N.candidates(s).length);
    const cand = syl.map(s => `<div class="cand"><h4>‘${s}’ 후보 한자 <span class="muted">${N.candidates(s).length}자</span></h4>
        <ul>${N.candidates(s).map(h => `<li>${elTag(h.el)}<b>${h.ch}</b> ${esc(h.hun)} ${h.eum} <span class="num">${h.strokes}획</span></li>`).join('') || '<li class="muted">데이터에 없는 음입니다</li>'}</ul></div>`).join('');
    $('#candOut').innerHTML = cand;
    if (missing.length) { out.innerHTML = `<p class="err">‘${missing.join(', ')}’ 음의 이름용 한자가 데이터에 없어 한자 조합을 만들 수 없습니다.</p>`; $('#findMore').hidden = true; return; }
    findList = N.rankHanja(surname(), syl, sj && !sj.error ? sj : null, null);
    findShown = 0; out.innerHTML = '';
    $('#findMeta').textContent = `${surname().ko}${raw} · 가능한 한자 조합 ${findList.length}개를 점수순으로 정렬했습니다${sj && !sj.error ? ' (사주 반영)' : ' (사주 미반영)'}.`;
    moreFind();
  }
  function moreFind() {
    const next = findList.slice(findShown, findShown + 6);
    $('#findOut').insertAdjacentHTML('beforeend', next.map((x, k) => nameCard(x, findShown + k + 1)).join(''));
    findShown += next.length;
    $('#findMore').hidden = findShown >= findList.length;
  }

  // ---------- 탭 ----------
  function setTab(t) {
    document.querySelectorAll('[role=tab]').forEach(b => b.setAttribute('aria-selected', b.dataset.tab === t));
    document.querySelectorAll('[role=tabpanel]').forEach(p => (p.hidden = p.id !== 'p-' + t));
    try { localStorage.setItem('naming-tab', t); } catch (e) {}
  }
  document.querySelectorAll('[role=tab]').forEach(b => b.addEventListener('click', () => setTab(b.dataset.tab)));

  // ---------- 이벤트 ----------
  $('#cal').addEventListener('change', () => ($('#leapWrap').hidden = $('#cal').value !== 'lunar'));
  $('#tunknown').addEventListener('change', () => ($('#btime').disabled = $('#tunknown').checked));
  $('#hangEum').addEventListener('input', fillHangSel);
  $('#recForm').addEventListener('submit', e => { e.preventDefault(); showRecs(true); });
  $('#moreBtn').addEventListener('click', () => { showRecs(false); $('#recOut').scrollIntoView({ behavior: 'smooth', block: 'start' }); });
  $('#findForm').addEventListener('submit', e => { e.preventDefault(); showFind(); });
  $('#findMore').addEventListener('click', moreFind);
  ['#sur', '#bdate', '#btime', '#cal', '#leap', '#tunknown', '#correct'].forEach(s => $(s).addEventListener('change', () => renderSaju(readBirth())));

  // ---------- 첫 화면: 예시 값으로 바로 결과 표시 ----------
  fillHangSel();
  let tab = 'rec'; try { tab = localStorage.getItem('naming-tab') || 'rec'; } catch (e) {}
  setTab(tab);
  showRecs(true);
  showFind();
})();
