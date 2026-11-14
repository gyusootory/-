# 이름 한자 데이터 생성기: Unihan(강희자전 부수·획수)으로 원획수를 계산해 hanja-data.js를 만듭니다.
# 사용법: python3 tools/build_data.py <unihan.db 경로>
import sqlite3, sys, json, os

DB = sys.argv[1]
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
con = sqlite3.connect(DB)

def rad_strokes(r):  # 강희 부수 번호 → 부수 본래 획수
    for hi, s in [(6,1),(29,2),(60,3),(94,4),(117,5),(146,6),(166,7),(175,8),(186,9),(194,10),(200,11),(204,12),(208,13),(210,14),(211,15),(213,16),(214,17)]:
        if r <= hi: return s

FIX = {'熙': 13, '翼': 17, '泰': 10, '求': 7, '露': 21, '斌': 12, '政': 9, '致': 10}  # 검증으로 찾은 개별 보정값
NUM = {'一':1,'二':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9,'十':10}
# 부수 → 자원오행 (부수가 오행을 직접 나타내는 경우 기준)
ELEM = {}
for e, rs in {'木':[75,140,118,115,120,119,64,100,145,47],
              '火':[86,72,73,61,9,10,187,196,59,155,60,4,123],
              '土':[32,46,102,170,163,162,38,40,166,53,54,1,12,31,51,44],
              '金':[167,96,112,18,62,69,154,149,164,57,131,24],
              '水':[85,173,15,195,39,30,74,129,128,116,8,49]}.items():
    for r in rs: ELEM[r] = e
# 오행 성질이 간접적인 부수(자의 기준 통용 분류)
for e, rs in {'木':[113,109,50,33,67,165,174,169,186,168,37,11,14,126,127,26,41],
              '火':[124,159,172,181,95,144,156,147,25,135,134],
              '土':[19,77,27,70,161,133,138,157],
              '金':[66,76,117,111,178,106,79,42,108],
              '水':[29,152,130]}.items():
    for r in rs: ELEM.setdefault(r, e)
# 부수로 정하기 어려운 글자: 자의(字義) 기준 수동 지정
OVR = {'泰':'水','秀':'木','承':'木','昇':'火','民':'火','文':'木','永':'水','星':'火','美':'土','光':'火',
       '大':'木','太':'木','天':'火','元':'木','允':'土','兌':'金','亨':'土','京':'土','亮':'火','東':'木',
       '世':'火','丹':'火','才':'木','有':'水','丞':'木','斗':'火','升':'木','甫':'水','由':'木','南':'火',
       '卓':'木','乾':'金','亞':'火','兒':'水','慶':'木','書':'木','曉':'火','曦':'火','麗':'火','鳳':'火',
       '鶴':'火','麟':'土','麒':'土','龍':'土','鼎':'火','齊':'土','韶':'金','顯':'火','頤':'火','頊':'火',
       '順':'火','奎':'木','奕':'木','奐':'木','夏':'火','多':'水','壽':'水','學':'水','孝':'水','存':'水'}

def info(ch):
    row = con.execute('select kRSKangXi,kTotalStrokes,kHangul from unihan where character=?',(ch,)).fetchone()
    if not row or not row[0]: raise SystemExit('no data: '+ch)
    r, res = row[0].split()[0].split('.')
    r, res = int(r.rstrip("'")), int(res)
    tot = int(row[1].split()[0])
    # 원획 = 부수 본래 획수 + 나머지 획수 (FIX: Unihan 잔획 오류·氺 모양 부수 등 개별 보정)
    won = NUM.get(ch) or FIX.get(ch) or (rad_strokes(r) + res if res > 0 else tot)
    return r, won, tot

MEAN = {}
for line in open(os.path.join(ROOT,'tools/meaning_source.txt'), encoding='utf-8'):
    if line.startswith('#') or not line.strip(): continue
    for it in line.strip().split('|'):
        ch, m = it.split(':'); MEAN[ch] = m
out = []
for line in open(os.path.join(ROOT,'tools/hanja_source.txt'), encoding='utf-8'):
    line = line.strip()
    if not line or line.startswith('#'): continue
    eum, *items = line.split()
    for it in items:
        ch, hun = it[0], it[1:]
        r, won, tot = info(ch)
        el = OVR.get(ch) or ELEM.get(r)
        if not el: print('미지정 오행:', ch, r, file=sys.stderr)
        if ch not in MEAN: print('풀이 없음:', ch, file=sys.stderr)
        out.append([ch, eum, hun, won, el or '土', r, MEAN.get(ch, hun)])

sur = []
for line in open(os.path.join(ROOT,'tools/surname_source.txt'), encoding='utf-8'):
    p = line.split()
    if not p: continue
    for h in p[1:]:
        ws = [info(c)[1] for c in h]
        els = [OVR.get(c) or ELEM.get(info(c)[0]) or '土' for c in h]
        sur.append([p[0], h, ws, els])

js = '// 자동 생성 파일 (tools/build_data.py) — 직접 수정하지 마세요\n'
js += '// HANJA: [한자, 음, 훈, 원획수, 자원오행, 강희부수번호]\n'
js += 'const HANJA = ' + json.dumps(out, ensure_ascii=False, separators=(',',':')) + ';\n'
js += '// SURNAMES: [한글, 한자, [글자별 원획], [글자별 자원오행]]\n'
js += 'const SURNAMES = ' + json.dumps(sur, ensure_ascii=False, separators=(',',':')) + ';\n'
open(os.path.join(ROOT,'hanja-data.js'),'w',encoding='utf-8').write(js)
print(len(out), 'hanja,', len(sur), 'surnames')
