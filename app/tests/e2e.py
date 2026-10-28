import os, json, re, time
from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8090'; OUT=os.path.dirname(os.path.abspath(__file__))+'/shots/'; os.makedirs(OUT, exist_ok=True)
R={}; errs=[]
def ok(k, v): R[k]=v; print(('OK  ' if v else 'FAIL'), k)
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w=390,h=844):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<760 else 1,has_touch=w<760,is_mobile=w<760)
        pg=c.new_page(); pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e))); pg.on('console',lambda m: errs.append(m.text) if m.type=='error' and 'favicon' not in m.text else None)
        def onresp(r):
            if '/api/' in r.url and r.status>=400:
                try: body=r.text()[:300]
                except Exception: body=''
                errs.append(f'HTTP {r.status} {r.request.method} {r.url[22:120]} {body}')
        pg.on('response', onresp)
        return c,pg
    def login(pg,u,pw):
        pg.goto(B+'/'); pg.wait_for_selector('#lg-user', timeout=8000)
        time.sleep(1.7)
        pg.fill('#lg-user',u); pg.fill('#lg-pw',pw); pg.click('#login-form button[type=submit]')
    # --- Jakob ---
    c,pg=ctx(1280,860)
    login(pg,'jakob','Sp1eleschrank!'); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(400)
    ok('admin logged in', 'Hallo Jakob' in pg.inner_text('#view'))
    pg.screenshot(path=OUT+'01-admin-leer.png')
    pg.click('.dtab[data-tab="verwalten"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="add-item"]'); pg.wait_for_timeout(300); pg.click('[data-act="add-bgg"]'); pg.wait_for_timeout(300)
    pg.fill('#bgg-q','wingspan'); pg.wait_for_selector('.bgg-row', timeout=8000); pg.screenshot(path=OUT+'02-bgg-suche.png')
    pg.click('.bgg-row'); pg.wait_for_selector('#sheet-foot [data-act="gf-save"]', timeout=8000)
    ok('bgg thing prefilled', 'Wingspan' in pg.inner_text('#sheet-body'))
    pg.click('#sheet-foot [data-act="gf-save"]'); pg.wait_for_timeout(1500)
    # zweites Spiel: Catan + Erweiterung
    pg.click('[data-act="add-item"]'); pg.wait_for_timeout(300); pg.click('[data-act="add-bgg"]'); pg.wait_for_timeout(300)
    pg.fill('#bgg-q','catan'); pg.wait_for_selector('.bgg-row', timeout=8000); pg.locator('.bgg-row', has_text='CATAN').first.click(); pg.wait_for_selector('#sheet-foot [data-act="gf-save"]'); pg.click('#sheet-foot [data-act="gf-save"]'); pg.wait_for_timeout(1500)
    pg.click('[data-act="add-item"]'); pg.wait_for_timeout(300); pg.click('[data-act="add-bgg"]'); pg.wait_for_timeout(300)
    pg.fill('#bgg-q','seafarers'); pg.wait_for_selector('.bgg-row', timeout=8000); pg.locator('.bgg-row').first.click(); pg.wait_for_selector('#gf-base', timeout=8000)
    ok('expansion base preselected', pg.eval_on_selector('#gf-base','e=>e.options[e.selectedIndex].text')=='CATAN')
    pg.click('#sheet-foot [data-act="gf-save"]'); pg.wait_for_timeout(1500)
    # Puzzle
    pg.click('[data-act="add-item"]'); pg.wait_for_timeout(300); pg.click('[data-act="add-puzzle"]'); pg.wait_for_timeout(300)
    pg.fill('#pz-title','Alpenpanorama'); pg.fill('#pz-brand','Ravensburger'); pg.click('#sheet-foot [data-act="pz-save"]'); pg.wait_for_timeout(1500)
    # Person
    pg.click('[data-act="add-person"]'); pg.wait_for_timeout(300); pg.fill('#pf-name','Lisa'); pg.fill('#pf-user','lisa'); pg.fill('#pf-ort','Linz'); pg.click('#sheet-foot [data-act="pf-save"]'); pg.wait_for_selector('#cred', timeout=8000)
    pw = pg.locator('#cred dd').nth(1).inner_text(); ok('credentials shown', bool(re.match(r'^\w+-\w+-\d+$', pw)))
    pg.screenshot(path=OUT+'03-zugang.png')
    pg.click('#sheet-foot [data-act="close-sheet"]'); pg.wait_for_timeout(600)
    pg.reload(); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(500)
    pg.click('.dtab[data-tab="regal"]'); pg.wait_for_timeout(300)
    tiles = pg.eval_on_selector_all('.grid .tile .tile-title','els=>els.map(e=>e.textContent)')
    ok('items persisted after reload', 'Wingspan' in tiles and 'CATAN' in tiles, ); R['tiles']=tiles
    pg.screenshot(path=OUT+'04-admin-regal.png')
    c.close()
    # --- Lisa ---
    c,pg=ctx()
    login(pg,'lisa',pw); pg.wait_for_selector('#pw-form', timeout=8000); pg.screenshot(path=OUT+'05-willkommen.png')
    pg.fill('#np1','Lisas-Passwort-1'); pg.fill('#np2','Lisas-Passwort-1'); pg.click('#pw-form button[type=submit]'); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(500)
    ok('member in regal', 'Hallo Lisa' in pg.inner_text('#view'))
    pg.screenshot(path=OUT+'06-lisa-regal.png')
    pg.locator('.grid .tile', has_text='Wingspan').first.click(); pg.wait_for_timeout(700)
    pg.click('#sheet-foot [data-act="request"]'); pg.wait_for_timeout(500)
    en=pg.eval_on_selector_all('button.cal-day:not([aria-disabled])','els=>els.map(e=>e.dataset.d)')
    pg.click(f'#cd-{en[2]}'); pg.wait_for_timeout(200)
    en2=[d for d in pg.eval_on_selector_all('button.cal-day:not([aria-disabled])','els=>els.map(e=>e.dataset.d)') if d>en[2]]
    pg.click(f'#cd-{en2[6]}'); pg.wait_for_timeout(200); pg.fill('#f-msg','Für Samstag')
    pg.click('#sheet-foot [data-act="send-request"]'); pg.wait_for_timeout(1500)
    ok('request done view', 'Anfrage gesendet' in pg.inner_text('#sheet-body'))
    pg.click('#sheet-foot [data-act="close-sheet"]'); pg.wait_for_timeout(500)
    # Merken und Kenn-ich-schon-freie Aktionen
    pg.locator('.grid .tile', has_text='CATAN').first.click(); pg.wait_for_timeout(600); pg.click('#mark-btn'); pg.wait_for_timeout(800)
    pg.keyboard.press('Escape'); pg.wait_for_timeout(500)
    pg.click('.ttab[data-tab="meine"]'); pg.wait_for_timeout(500); pg.screenshot(path=OUT+'07-lisa-meine.png', full_page=True)
    ok('meine shows request', 'Wingspan' in pg.inner_text('#view') and 'Angefragt' in pg.inner_text('#view'))
    pg.reload(); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(800)
    pg.click('.ttab[data-tab="meine"]'); pg.wait_for_timeout(400)
    pg.screenshot(path=OUT+'07b-lisa-meine-reload.png', full_page=True); R['meine_after']=pg.inner_text('#view')[:600]
    ok('request + list persisted', 'Wingspan' in pg.inner_text('#view') and 'Merkliste' in pg.inner_text('#view'))
    c.close()
    # --- Jakob nimmt an ---
    c,pg=ctx(1280,860)
    login(pg,'jakob','Sp1eleschrank!'); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(500)
    badge = pg.inner_text('.dtab[data-tab="verwalten"] .badge') if pg.query_selector('.dtab[data-tab="verwalten"] .badge') else ''
    ok('admin badge shows request', badge=='1')
    pg.click('.dtab[data-tab="verwalten"]'); pg.wait_for_timeout(300); pg.screenshot(path=OUT+'08-verwalten.png')
    pg.locator('.req [data-act="accept"]').first.click(); pg.wait_for_timeout(500); pg.click('#sheet-foot [data-act="accept-confirm"]'); pg.wait_for_timeout(1500)
    ok('accept done', 'Angenommen' in pg.inner_text('#sheet-body'))
    pg.click('#sheet-foot [data-act="close-sheet"]'); pg.wait_for_timeout(400)
    pg.locator('[data-act="handover"]').first.click(); pg.wait_for_timeout(1500)
    pg.reload(); pg.wait_for_selector('#view', timeout=8000); pg.wait_for_timeout(500); pg.click('.dtab[data-tab="verwalten"]'); pg.wait_for_timeout(300)
    ok('verliehen persisted', 'Verliehen' in pg.inner_text('#view') and 'Bei Lisa' in pg.inner_text('#view'))
    c.close()
    # --- Schaufenster ---
    c,pg=ctx()
    b2=json.loads(os.popen("curl -s -X POST %s/api/collections/users/auth-with-password -H 'Content-Type: application/json' -d '{\"identity\":\"jakob\",\"password\":\"Sp1eleschrank!\"}'" % B).read())['token']
    st=json.loads(os.popen("curl -s %s/api/collections/settings/records -H 'Authorization: %s'" % (B,b2)).read())['items'][0]['showcase']
    pg.goto(B+'/schaufenster/'+st); pg.wait_for_timeout(1200)
    ok('showcase renders', 'Wingspan' in pg.inner_text('body') and 'Zugang anfragen' in pg.inner_text('body')); pg.screenshot(path=OUT+'09-schaufenster.png')
    pg.goto(B+'/schaufenster/falsch99'); pg.wait_for_timeout(800); ok('wrong showcase link', 'gibt es nicht mehr' in pg.inner_text('body'))
    c.close()
    b.close()
R['errors']=errs
print(json.dumps({k:v for k,v in R.items() if k in ('tiles','errors','meine_after')}, ensure_ascii=False, indent=1))
