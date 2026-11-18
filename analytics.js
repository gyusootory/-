// =====================================================================
// 가치작명소 방문 통계 수집기 (Supabase에 익명 이벤트를 한 줄씩 기록)
// - 보내는 것: 이벤트 이름, 익명 방문자 ID(무작위), 기기 종류, 유입 경로, 기능 사용 정보
// - 보내지 않는 것: 생년월일, 태어난 시각, 성씨, 이름 전체(성+이름) 등 개인을 알아볼 수 있는 정보
// - 설정(config.js)이 비어 있거나 웹사이트가 아닌 곳(파일·미리보기)에서 열면 아무것도 보내지 않음
// =====================================================================
(function () {
  'use strict';
  const C = window.GACHI_CONFIG || {};
  const on = !!(C.supabaseUrl && C.supabaseAnonKey) && location.protocol === 'https:' && !/claude|anthropic/.test(location.hostname) && !/--/.test(location.hostname);   // --: Firebase 테스트 주소는 통계에서 제외
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const rid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

  // 같은 브라우저를 다시 방문하면 같은 무작위 ID → '순 방문자' 계산용 (개인 정보 아님)
  let visitor = get('gachi-vid');
  const isNew = !visitor;
  if (!visitor) { visitor = rid(); set('gachi-vid', visitor); }
  window.gachiNewVisitor = isNew;   // 처음 온 사람인지 (앱의 '새 한자 안내'를 처음 방문자에게는 안 보이게)
  const session = rid();
  const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const appMode = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true ? 'app' : 'web';
  // 유입 경로 (네이버 블로그 통계처럼 보기 위한 정보)
  //  · 홍보 링크(utm_*)가 있으면 그것을 기록
  //  · 검색 사이트에서 왔으면 '검색어'만 기록 (최대 40자)
  //  · 블로그·카페 등에서 왔으면 글 주소 (사이트+경로 + 글을 가리키는 번호만: blogId·logNo·clubid·articleid 등)
  //  · 그 밖의 주소 뒤 정보(물음표 뒤)는 저장하지 않음 · 브라우저가 주소를 알려 주지 않으면 사이트 이름만
  let referrer = '', refUrl = '', refKw = '', utm = null;
  try {
    const qs = new URLSearchParams(location.search);
    ['source', 'medium', 'campaign', 'content'].forEach(k => { const v = qs.get('utm_' + k); if (v) (utm = utm || {})[k] = v.slice(0, 60); });
    if (utm && utm.source) referrer = utm.source;
    else if (document.referrer) {
      const r = new URL(document.referrer);
      if (r.hostname !== location.hostname) {
        referrer = r.hostname;
        const isSearch = /(^|\.)search\.|google\.|bing\.|search\.daum|zum\.com|yahoo\.|duckduckgo/.test(r.hostname);
        const kw = isSearch && (r.searchParams.get('query') || r.searchParams.get('q') || r.searchParams.get('p'));
        if (kw) refKw = kw.trim().replace(/\s+/g, ' ').slice(0, 40);
        else {
          const keep = ['blogId', 'logNo', 'clubid', 'articleid', 'articleId', 'cafeId', 'postNo'].filter(k => r.searchParams.get(k)).map(k => k + '=' + r.searchParams.get(k)).join('&');
          const path = r.pathname && r.pathname !== '/' ? r.pathname : '';
          if (path || keep) refUrl = (r.hostname + path + (keep ? '?' + keep : '')).slice(0, 200);
        }
      }
    }
  } catch (e) {}

  function track(event, meta) { send(event, meta); }
  // 보내고 성공 여부(true/false)를 알려 줌 (의견 남기기처럼 결과를 보여 줘야 할 때 사용)
  function send(event, meta) {
    if (!on) return Promise.resolve(false);
    const body = JSON.stringify({ event, visitor, session, device, app_mode: appMode, referrer: referrer || null, meta: meta || {} });
    try {
      return fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/events', {
        method: 'POST', keepalive: true, body,
        headers: Object.assign({ apikey: C.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
          // 예전 방식 anon 키(eyJ…)만 Authorization에도 넣음. 새 publishable 키(sb_publishable_…)는 apikey 헤더만 사용
          /^eyJ/.test(C.supabaseAnonKey) ? { Authorization: 'Bearer ' + C.supabaseAnonKey } : {}),
      }).then(r => r.ok).catch(() => false);
    } catch (e) { return Promise.resolve(false); }
  }
  window.gachiTrack = track;
  window.gachiSend = send;
  track('visit', Object.assign({ new_visitor: isNew }, refUrl ? { ref_url: refUrl } : {}, refKw ? { ref_kw: refKw } : {}, utm ? { utm } : {}));
  window.addEventListener('appinstalled', () => track('install'));
})();
