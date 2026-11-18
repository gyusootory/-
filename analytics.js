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
  // 유입 경로: 홍보 링크(utm_*)가 있으면 그것을, 없으면 이전 페이지 주소
  //  · 이전 페이지는 '사이트+경로'까지만 (예: m.blog.naver.com/아이디/글번호) · 물음표 뒤(검색어 등)는 저장하지 않음
  //  · 요즘 브라우저는 다른 사이트에서 올 때 사이트 이름만 알려 주는 경우가 많아, 경로는 알려 줄 때만 기록됨
  let referrer = '', refUrl = '', utm = null;
  try {
    const qs = new URLSearchParams(location.search);
    ['source', 'medium', 'campaign', 'content'].forEach(k => { const v = qs.get('utm_' + k); if (v) (utm = utm || {})[k] = v.slice(0, 60); });
    if (utm && utm.source) referrer = utm.source;
    else if (document.referrer) {
      const r = new URL(document.referrer);
      if (r.hostname !== location.hostname) { referrer = r.hostname; if (r.pathname && r.pathname !== '/') refUrl = (r.hostname + r.pathname).slice(0, 160); }
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
  track('visit', Object.assign({ new_visitor: isNew }, refUrl ? { ref_url: refUrl } : {}, utm ? { utm } : {}));
  window.addEventListener('appinstalled', () => track('install'));
})();
