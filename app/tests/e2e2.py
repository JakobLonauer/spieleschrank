import os, json, time
from playwright.sync_api import sync_playwright
B='http://127.0.0.1:8090'; HERE=os.path.dirname(os.path.abspath(__file__)); OUT=HERE+'/shots/'
AXE=os.environ.get('AXE_JS', 'node_modules/axe-core/axe.min.js')   # npm i axe-core
R={}; errs=[]; axe={}
def ok(k, v): R[k]=v; print(('OK  ' if v else 'FAIL'), k)
def api(path, token=None, method='GET', body=None):
    import urllib.request
    req=urllib.request.Request(B+path, method=method, data=json.dumps(body).encode() if body is not None else None, headers={'Content-Type':'application/json', **({'Authorization':token} if token else {})})
    return json.loads(urllib.request.urlopen(req).read() or b'{}')
with sync_playwright() as p:
    b=p.chromium.launch()
    def ctx(w=390,h=844):
        c=b.new_context(viewport={'width':w,'height':h},device_scale_factor=2 if w<760 else 1,has_touch=w<760,is_mobile=w<760)
        pg=c.new_page(); pg.on('pageerror',lambda e: errs.append('PAGEERROR '+str(e)))
        def onresp(r):
            if '/api/' in r.url and r.status>=400:
                try: body=r.text()[:200]
                except Exception: body=''
                errs.append(f'HTTP {r.status} {r.request.method} {r.url[22:110]} {body}')
        pg.on('response', onresp)
        return c,pg
    def run_axe(pg, name):
        pg.add_script_tag(path=AXE)
        res=pg.evaluate("async()=>{const r=await axe.run(document,{resultTypes:['violations']});return r.violations.map(v=>({id:v.id,impact:v.impact,n:v.nodes.length,t:v.nodes.slice(0,2).map(x=>x.target.join(' '))}))}")
        axe[name]=res; print('AXE', name, 'violations:', len(res), [r['id'] for r in res])
    def login(pg,u,pw):
        pg.goto(B+'/'); pg.wait_for_selector('#lg-user', timeout=8000); time.sleep(1.7)
        pg.fill('#lg-user',u); pg.fill('#lg-pw',pw); pg.click('#login-form button[type=submit]')
    # Login-Seite (Handy)
    c,pg=ctx(); pg.goto(B+'/'); pg.wait_for_selector('#lg-user'); run_axe(pg,'login-mobile'); pg.screenshot(path=OUT+'20-login.png'); c.close()
    # --- Jakob: Puzzle + Import ---
    c,pg=ctx(1280,860)
    login(pg,'jakob','Sp1eleschrank!'); pg.wait_for_selector('#view'); pg.wait_for_timeout(500)
    pg.click('.dtab[data-tab="verwalten"]'); pg.wait_for_timeout(300)
    pg.click('[data-act="add-item"]'); pg.wait_for_timeout(300); pg.click('[data-act="add-puzzle"]'); pg.wait_for_selector('#pz-title')
    pg.fill('#pz-title','Abend am See'); pg.fill('#pz-brand','Ravensburger'); pg.fill('#pz-w','70'); pg.fill('#pz-h','50')
    pg.set_input_files('#pz-img', HERE+'/fixtures/schachtel.jpg'); pg.wait_for_timeout(1200)
    run_axe(pg,'puzzle-form')
    pg.click('#sheet-foot [data-act="pz-save"]'); pg.wait_for_timeout(2500)
    # Import
    pg.click('[data-act="import"]'); pg.wait_for_selector('#imp-file', state='attached'); pg.wait_for_timeout(500)
    pg.set_input_files('#imp-file', HERE+'/fixtures/collection.csv'); pg.wait_for_timeout(800)
    summ=pg.inner_text('.import-sum') if pg.query_selector('.import-sum') else ''
    ok('import summary', '3 Spiele' in summ and '1 Erweiterung' in summ); R['summ']=summ
    run_axe(pg,'import-sheet'); pg.screenshot(path=OUT+'21-import.png')
    pg.click('#imp-go'); pg.wait_for_timeout(2500)
    toast=pg.inner_text('.toasts') if pg.query_selector('.toasts') else ''
    ok('import toast', 'ins Regal gestellt' in toast); R['toast']=toast
    pg.click('.dtab[data-tab="regal"]'); pg.wait_for_timeout(500)
    tiles=pg.eval_on_selector_all('.grid .tile .tile-title','els=>els.map(e=>e.textContent.trim())')
    ok('imported tiles', all(t in ' '.join(tiles) for t in ['Codenames','Wingspan','CATAN'])); R['tiles']=tiles
    ok('import not marked neu', 'Neu' not in pg.inner_text('.grid'))
    run_axe(pg,'regal-admin-desktop'); pg.screenshot(path=OUT+'22-regal-import.png')
    # Puzzle-Umschalter
    pg.click('#kind-pz'); pg.wait_for_timeout(500)
    ok('puzzle persisted', 'Abend am See' in pg.inner_text('#view'))
    img=pg.eval_on_selector('.grid .tile img','e=>e && e.naturalWidth') if pg.query_selector('.grid .tile img') else 0
    ok('puzzle cover uploaded', bool(img)); pg.screenshot(path=OUT+'23-puzzles.png')
    pg.click('#kind-games'); pg.wait_for_timeout(400)
    pg.locator('.grid .tile', has_text='CATAN').first.click(); pg.wait_for_timeout(800)
    run_axe(pg,'game-sheet-admin')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    pg.click('.dtab[data-tab="verwalten"]'); pg.wait_for_timeout(400); run_axe(pg,'verwalten')
    ok('orphan tool row before enrichment', 'Ohne Grundspiel' in pg.inner_text('#view'))
    pg.click('[data-act="orphan-list"]'); pg.wait_for_timeout(500); run_axe(pg,'orphan-sheet'); pg.screenshot(path=OUT+'24a-ohne-grundspiel.png')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    c.close()
    # Hintergrund-Ergänzung von BGG (Cron jede Minute)
    tok=api('/api/collections/users/auth-with-password', method='POST', body={'identity':'jakob','password':'Sp1eleschrank!'})['token']
    t0=time.time(); alt=''
    while time.time()-t0<80:
        its=api('/api/collections/items/records?perPage=50&filter='+__import__('urllib.parse').parse.quote("bggId=266192"), tok)['items']
        alt=its[0]['alt'] if its else ''
        if alt: break
        time.sleep(5)
    ok('bgg enrichment ran', 'Flügelschlag' in alt); R['enrich_s']=round(time.time()-t0)
    st=api('/api/bgg/status', tok); R['status']=st
    c,pg=ctx(1280,860); login(pg,'jakob','Sp1eleschrank!'); pg.wait_for_selector('#view'); pg.wait_for_timeout(600)
    pg.locator('.grid .tile', has_text='CATAN').first.click(); pg.wait_for_timeout(800)
    ok('expansion under base after enrichment', 'Seafarers' in pg.inner_text('#sheet-body')); pg.screenshot(path=OUT+'24-catan.png')
    imgs=pg.eval_on_selector_all('.grid .tile img','els=>els.length'); R['cover_imgs']=imgs
    c.close()
    # --- Mitglied auf dem Handy: Suche nach anderem Titel, Barrierefreiheit ---
    users=api('/api/collections/users/records', tok)['items']
    if not any(u['username']=='mia' for u in users):
        api('/api/collections/users/records', tok, 'POST', {'username':'mia','name':'Mia','password':'Mias-Start-1','passwordConfirm':'Mias-Start-1','role':'member','ort':'Wien'})
    c,pg=ctx()
    login(pg,'mia','Mias-Start-1'); pg.wait_for_selector('#pw-form'); run_axe(pg,'welcome')
    pg.fill('#np1','Mias-Passwort-1'); pg.fill('#np2','Mias-Passwort-1'); pg.click('#pw-form button[type=submit]'); pg.wait_for_selector('#view'); pg.wait_for_timeout(600)
    run_axe(pg,'regal-member-mobile')
    pg.fill('#q','Flügel'); pg.wait_for_timeout(500)
    ok('search by alt title', 'Wingspan' in pg.inner_text('#view'))
    pg.locator('.grid .tile', has_text='Wingspan').first.click(); pg.wait_for_timeout(700); run_axe(pg,'game-sheet-member')
    pg.click('#sheet-foot [data-act="request"]'); pg.wait_for_timeout(500); run_axe(pg,'calendar')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(400)
    pg.click('.ttab[data-tab="meine"]'); pg.wait_for_timeout(400); run_axe(pg,'meine')
    ok('member cannot see note field', pg.evaluate("fetch('/api/collections/items/records',{headers:{Authorization:JSON.parse(localStorage.getItem('pocketbase_auth')).token}}).then(r=>r.json()).then(d=>d.items.every(i=>!('note' in i)))"))
    c.close()
    b.close()
R['errors']=errs; R['axe']={k:v for k,v in axe.items() if v}
print(json.dumps({k:R[k] for k in ('errors','axe','status','enrich_s','tiles')}, ensure_ascii=False, indent=1))
