# 모든 JS를 한 HTML에 넣어 ① 파일 하나로 보내는 버전(dist)과 ② 웹사이트·홈 화면 설치용 앱(docs)을 만듭니다.
import os, re, json, hashlib
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
src = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
def inline(m):
    js = open(os.path.join(R, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
body = re.sub(r'<script src="([^"]+)"></script>', inline, src)
DESC = '아기 생년월일시 사주로 오행·음양·81수리를 계산해 이름과 한자를 추천하고 뜻을 풀어 주는 작명 앱'
base = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
        f'<meta name="description" content="{DESC}">\n'
        '<meta property="og:title" content="오행 작명소">\n'
        f'<meta property="og:description" content="{DESC}">\n')
# ① 단일 파일
open(os.path.join(R, 'dist', '오행작명소.html'), 'w', encoding='utf-8').write(base + body + '\n</html>\n')
# ② 설치형 웹앱(PWA)
pwa = (base + '<meta name="theme-color" content="#b23a2b">\n'
       '<link rel="manifest" href="manifest.webmanifest">\n'
       '<link rel="icon" href="icon-192.png" type="image/png">\n'
       '<link rel="apple-touch-icon" href="apple-touch-icon.png">\n'
       '<meta name="apple-mobile-web-app-capable" content="yes">\n'
       '<meta name="mobile-web-app-capable" content="yes">\n'
       '<meta name="apple-mobile-web-app-title" content="오행작명소">\n'
       '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n')
pwa += body + ("\n<script>if ('serviceWorker' in navigator && location.protocol === 'https:') "
               "navigator.serviceWorker.register('sw.js').catch(function () {});</script>\n</html>\n")
D = os.path.join(R, 'docs'); os.makedirs(D, exist_ok=True)
open(os.path.join(D, 'index.html'), 'w', encoding='utf-8').write(pwa)
json.dump({
    'name': '오행 작명소', 'short_name': '오행작명소', 'description': DESC, 'lang': 'ko',
    'start_url': './', 'scope': './', 'display': 'standalone',
    'background_color': '#eef1f4', 'theme_color': '#b23a2b',
    'icons': [{'src': 'icon-192.png', 'sizes': '192x192', 'type': 'image/png'},
              {'src': 'icon-512.png', 'sizes': '512x512', 'type': 'image/png'},
              {'src': 'icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}],
}, open(os.path.join(D, 'manifest.webmanifest'), 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
ver = hashlib.sha1(pwa.encode()).hexdigest()[:8]  # 내용이 바뀌면 캐시 이름도 바뀌어 새 버전으로 갱신
open(os.path.join(D, 'sw.js'), 'w', encoding='utf-8').write(f"""// 오프라인에서도 열리도록 앱 파일을 저장해 두는 서비스 워커
const CACHE = 'ohaeng-{ver}';
const FILES = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png', './apple-touch-icon.png'];
self.addEventListener('install', e => {{ e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))); self.skipWaiting(); }});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
}});
// 새 버전을 먼저 받아 보고, 인터넷이 없으면 저장본을 보여줌
self.addEventListener('fetch', e => {{
  if (e.request.method !== 'GET') return;
  e.respondWith(fetch(e.request).then(r => {{
    if (r.ok && new URL(e.request.url).origin === location.origin) {{ const c = r.clone(); caches.open(CACHE).then(x => x.put(e.request, c)); }}
    return r;
  }}).catch(() => caches.match(e.request).then(m => m || caches.match('./index.html'))));
}});
""")
open(os.path.join(D, '.nojekyll'), 'w').close()
print('dist', len(base + body) // 1024, 'KB / docs', len(pwa) // 1024, 'KB')
