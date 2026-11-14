// =====================================================================
// 가치작명소 방문 통계 수집기 (Supabase에 익명 이벤트를 한 줄씩 기록)
// - 보내는 것: 이벤트 이름, 익명 방문자 ID(무작위), 기기 종류, 유입 경로, 기능 사용 정보
// - 보내지 않는 것: 생년월일, 태어난 시각, 성씨, 이름 전체(성+이름) 등 개인을 알아볼 수 있는 정보
// - 설정(config.js)이 비어 있거나 웹사이트가 아닌 곳(파일·미리보기)에서 열면 아무것도 보내지 않음
// =====================================================================
(function () {
  'use strict';
  const C = window.GACHI_CONFIG || {};
  const on = !!(C.supabaseUrl && C.supabaseAnonKey) && location.protocol === 'https:' && !/claude|anthropic/.test(location.hostname);
  const get = k => { try { return localStorage.getItem(k); } catch (e) { return null; } };
  const set = (k, v) => { try { localStorage.setItem(k, v); } catch (e) {} };
  const rid = () => (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : Math.random().toString(36).slice(2) + Date.now().toString(36);

  // 같은 브라우저를 다시 방문하면 같은 무작위 ID → '순 방문자' 계산용 (개인 정보 아님)
  let visitor = get('gachi-vid');
  const isNew = !visitor;
  if (!visitor) { visitor = rid(); set('gachi-vid', visitor); }
  const session = rid();
  const device = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent) ? 'mobile' : 'desktop';
  const appMode = (window.matchMedia && matchMedia('(display-mode: standalone)').matches) || navigator.standalone === true ? 'app' : 'web';
  let referrer = '';
  try {
    const q = new URLSearchParams(location.search).get('utm_source');
    if (q) referrer = q.slice(0, 60);
    else if (document.referrer) { const r = new URL(document.referrer); if (r.hostname !== location.hostname) referrer = r.hostname; }
  } catch (e) {}

  function track(event, meta) {
    if (!on) return;
    const body = JSON.stringify({ event, visitor, session, device, app_mode: appMode, referrer: referrer || null, meta: meta || {} });
    try {
      fetch(C.supabaseUrl.replace(/\/$/, '') + '/rest/v1/events', {
        method: 'POST', keepalive: true, body,
        headers: { apikey: C.supabaseAnonKey, Authorization: 'Bearer ' + C.supabaseAnonKey, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      }).catch(() => {});
    } catch (e) {}
  }
  window.gachiTrack = track;
  track('visit', { new_visitor: isNew });
  window.addEventListener('appinstalled', () => track('install'));
})();
