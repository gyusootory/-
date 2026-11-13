# 모든 JS를 한 HTML 파일에 넣어, 파일 하나만 보내도 열리게 만듭니다.
import os, re
R = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
html = open(os.path.join(R, 'index.html'), encoding='utf-8').read()
def inline(m):
    js = open(os.path.join(R, m.group(1)), encoding='utf-8').read().replace('</script', '<\\/script')
    return '<script>\n' + js + '\n</script>'
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)
head = ('<!doctype html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n')
html = head + html.replace('<style>', '</head>\n<body>\n<style>', 1) if False else head + html + '\n</html>\n'
open(os.path.join(R, 'dist', '오행작명소.html'), 'w', encoding='utf-8').write(html)
print('ok', len(html.encode()) // 1024, 'KB')
