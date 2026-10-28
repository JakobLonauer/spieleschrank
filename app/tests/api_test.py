import json, urllib.request, urllib.error, datetime, sys, time
B='http://127.0.0.1:8090'
def req(method, path, body=None, token=None, raw=False):
    data = json.dumps(body).encode() if body is not None else None
    r = urllib.request.Request(B+path, data=data, method=method)
    r.add_header('Content-Type','application/json')
    if token: r.add_header('Authorization', token)
    try:
        with urllib.request.urlopen(r) as resp:
            t = resp.read().decode(); return resp.status, (json.loads(t) if t else None)
    except urllib.error.HTTPError as e:
        t = e.read().decode()
        try: return e.code, json.loads(t)
        except Exception: return e.code, t
def login(u,p):
    time.sleep(1.6)
    s,d = req('POST','/api/collections/users/auth-with-password',{'identity':u,'password':p}); assert s==200,(s,d); return d['token'], d['record']
D = lambda n: (datetime.date.today()+datetime.timedelta(days=n)).isoformat()
R=[]; 
def check(name, cond, info=''):
    R.append((name, bool(cond))); print(('OK  ' if cond else 'FAIL'), name, '' if cond else info)

A, arec = login('jakob','Sp1eleschrank!')
check('admin seeded', arec['role']=='admin')
s,lisa = req('POST','/api/collections/users/records',{'username':'Lisa','name':'Lisa','password':'lisa-start-1','passwordConfirm':'lisa-start-1','ort':'Linz','color':1},A)
check('admin creates member', s==200 and lisa['username']=='lisa' and lisa['mustChange'] and lisa['role']=='member', (s,lisa))
s,maxu = req('POST','/api/collections/users/records',{'username':'max','name':'Max','password':'max-start-11','passwordConfirm':'max-start-11','ort':'Mauthausen','color':2},A)
L, lrec = login('lisa','lisa-start-1'); M, mrec = login('max','max-start-11')
s,_ = req('POST','/api/collections/users/records',{'username':'evil','name':'x','password':'12345678aa','passwordConfirm':'12345678aa'},L)
check('member cannot create users', s in (400,403), s)
s,_ = req('PATCH',f"/api/collections/users/records/{lrec['id']}",{'role':'admin'},L); check('member cannot make herself admin', s in (400,403), s)
s,_ = req('PATCH',f"/api/collections/users/records/{lrec['id']}",{'lastVisit':D(0)},L); check('member updates lastVisit', s==200, s)
s,d = req('PATCH',f"/api/collections/users/records/{lrec['id']}",{'oldPassword':'lisa-start-1','password':'lisa-neu-123','passwordConfirm':'lisa-neu-123','mustChange':False},L); check('member changes password', s==200 and d['mustChange']==False, (s,d))
L, lrec = login('lisa','lisa-neu-123')
s,d = req('GET','/api/collections/users/records',None,L); check('member sees only herself in users', s==200 and d['totalItems']==1, d)
s,d = req('PATCH',f"/api/collections/users/records/{mrec['id']}",{'password':'max-neu-1234','passwordConfirm':'max-neu-1234'},A); check('admin resets password without old', s==200, (s,d))
M, mrec = login('max','max-neu-1234')

def item(body):
    s,d = req('POST','/api/collections/items/records',body,A); assert s==200,(s,d); return d
catan = item({'kind':'game','title':'Catan','pmin':3,'pmax':4,'tmin':60,'tmax':90,'lendable':True,'genres':['Familie'],'note':'privat'})
seef = item({'kind':'exp','title':'Catan: Seefahrer','base':catan['id'],'lendable':True})
heat = item({'kind':'game','title':'Heat','lendable':True,'added':''})
gift = item({'kind':'game','title':'Splendor','lendable':True,'gift':True})
mm = item({'kind':'game','title':'MicroMacro','lendable':True,'once':'intakt','solved':True})
check('added defaults to today', catan['added']==D(0) and heat['added']=='', (catan['added'], heat['added']))
s,d = req('POST','/api/collections/items/records',{'kind':'game','title':'x'},L); check('member cannot create items', s in (400,403), s)
s,d = req('GET',f"/api/collections/items/records/{catan['id']}",None,L); check('note hidden from member', s==200 and 'note' not in d, d.get('note'))
s,d = req('GET',f"/api/collections/items/records/{catan['id']}",None,A); check('note visible to admin', d.get('note')=='privat')

# Anfrage
ok = {'item':catan['id'],'user':lrec['id'],'status':'angefragt','start':D(2),'ret':[D(9),D(16)],'extras':[seef['id']],'msg':'Samstag'}
s,l1 = req('POST','/api/collections/loans/records',ok,L); check('member request ok', s==200 and l1['pub']==True, (s,l1))
s,d = req('POST','/api/collections/loans/records',ok,L); check('duplicate request blocked', s==400, (s,d))
bad = dict(ok, item=heat['id'], extras=[], ret=[D(3),D(4),D(5),D(6)]); s,d = req('POST','/api/collections/loans/records',bad,L); check('4 return days blocked', s==400, d)
bad = dict(ok, item=heat['id'], extras=[], ret=[D(30)]); s,d = req('POST','/api/collections/loans/records',bad,L); check('beyond 3 weeks blocked', s==400 and 'drei Wochen' in json.dumps(d,ensure_ascii=False), d)
bad = dict(ok, item=heat['id'], extras=[], start=D(-2), ret=[D(3)]); s,d = req('POST','/api/collections/loans/records',bad,L); check('past start blocked', s==400, d)
bad = dict(ok, item=heat['id'], extras=[], status='reserviert'); s,d = req('POST','/api/collections/loans/records',bad,L); check('member cannot create reserviert', s in (400,403), s)
bad = dict(ok, item=heat['id'], extras=[], user=mrec['id']); s,d = req('POST','/api/collections/loans/records',bad,L); check('member cannot request for others', s in (400,403), s)
bad = dict(ok, item=heat['id'], extras=[catan['id']]); s,d = req('POST','/api/collections/loans/records',bad,L); check('foreign extra blocked', s==400, d)
s,d = req('GET','/api/collections/loans/records',None,M); check('max cannot see lisas request', d['totalItems']==0, d)
s,d = req('GET','/api/collections/loan_public/records',None,M); check('angefragt not in public view', d['totalItems']==0, d)
# Annehmen
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'status':'reserviert'},A); check('admin accepts', s==200, (s,d))
s,d = req('GET','/api/collections/loan_public/records',None,M); 
check('public view shows reservation with name', d['totalItems']==1 and d['items'][0]['who']=='Lisa' and d['items'][0]['status']=='reserviert', d)
s,d = req('POST','/api/collections/loans/records',{'item':catan['id'],'user':mrec['id'],'status':'angefragt','start':D(5),'ret':[D(12)]},M); check('overlap blocked', s==400 and 'vergeben' in json.dumps(d,ensure_ascii=False), d)
s,d = req('POST','/api/collections/loans/records',{'item':seef['id'],'user':mrec['id'],'status':'angefragt','start':D(5),'ret':[D(12)]},M); check('extra lent with base is busy', s==400, d)
s,v1 = req('POST','/api/collections/loans/records',{'item':catan['id'],'user':mrec['id'],'status':'vorgemerkt'},M); check('max vormerken', s==200 and v1['start']=='', (s,v1))
s,d = req('GET','/api/collections/loan_public/records?filter=status%3D%27vorgemerkt%27',None,L); check('vormerkung anonym', d['totalItems']==1 and d['items'][0]['who']=='' and not d['items'][0]['pub'], d)
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'pub':False},A)
s,d = req('GET','/api/collections/loan_public/records?filter=status%3D%27reserviert%27',None,M); check('pub off hides name', d['items'][0]['who']=='', d)
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'status':'verliehen'},L); check('member cannot hand over', s==403, s)
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'status':'verliehen','handed':D(0)},A); check('admin hands over', s==200, (s,d))
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'ext':'angefragt'},L); check('member requests extension', s==200, (s,d))
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'ext':'angefragt','ret':[D(30)]},L); check('member cannot change dates', s==403, s)
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'ext':'ok','extended':True,'ret':[D(23),D(30)]},A); check('admin accepts extension (beyond 21 ok for admin)', s==200, (s,d))
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'ext':'angefragt'},L); check('second extension blocked', s==403, s)
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'photoHint':'dismissed'},L); check('photo hint by member', s==200, s)
# Rückgabe, Bescheid, Zeitraum wählen
s,d = req('PATCH',f"/api/collections/loans/records/{l1['id']}",{'status':'zurück','returned':D(0)},A); check('admin return', s==200, (s,d))
s,d = req('PATCH',f"/api/collections/loans/records/{v1['id']}",{'status':'angefragt','start':D(1),'ret':[D(8)]},M); check('pick period before notify blocked', s==403, s)
s,d = req('PATCH',f"/api/collections/loans/records/{v1['id']}",{'notified':True},A)
s,d = req('PATCH',f"/api/collections/loans/records/{v1['id']}",{'status':'angefragt','start':D(1),'ret':[D(8)]},M); check('pick period after notify', s==200 and d['status']=='angefragt', (s,d))
s,d = req('PATCH',f"/api/collections/loans/records/{v1['id']}",{'status':'zurückgezogen'},M); check('member withdraws', s==200, s)
# Ablehnung
s,l2 = req('POST','/api/collections/loans/records',{'item':heat['id'],'user':lrec['id'],'status':'angefragt','start':D(1),'ret':[D(5)]},L)
s,d = req('PATCH',f"/api/collections/loans/records/{l2['id']}",{'status':'abgelehnt','reason':'Fehlt was'},A)
s,d = req('PATCH',f"/api/collections/loans/records/{l2['id']}",{'seen':True},L); check('member hides decline', s==200, s)
# Direkt verleihen offen
s,d = req('POST','/api/collections/loans/records',{'item':heat['id'],'user':mrec['id'],'status':'verliehen','start':D(0),'handed':D(0),'open':True,'ret':[D(3)],'pub':True},A); check('admin lends open', s==200 and d['ret']==[], (s,d))
# Fotos, Wünsche, Kenn ich schon, Listen
s,d = req('POST','/api/collections/wishes/records',{'item':heat['id'],'user':lrec['id']},L); check('wish on non-gift blocked', s==400, d)
s,w = req('POST','/api/collections/wishes/records',{'item':gift['id'],'user':lrec['id']},L); check('wish on gift ok', s==200, d)
s,d = req('GET','/api/collections/wishes/records',None,M); check('max cannot see lisas wish', d['totalItems']==0)
s,d = req('GET','/api/collections/wishes/records',None,A); check('admin sees wishes', d['totalItems']==1)
s,d = req('POST','/api/collections/known/records',{'item':heat['id'],'user':lrec['id']},L); check('known on normal game blocked', s==400)
s,d = req('POST','/api/collections/known/records',{'item':mm['id'],'user':lrec['id']},L); check('known on once ok', s==200, d)
s,li = req('POST','/api/collections/lists/records',{'user':lrec['id'],'name':'Merkliste','items':[catan['id']],'isDefault':True},L); check('list create', s==200, li)
s,d = req('GET','/api/collections/lists/records',None,M); check('lists private', d['totalItems']==0)
s,d = req('GET','/api/collections/lists/records',None,A); check('lists private even from admin', d['totalItems']==0)
# Einstellungen, Schaufenster
s,st = req('GET','/api/collections/settings/records',None,A); token = st['items'][0].get('showcase'); check('admin sees showcase token', bool(token), st)
s,d = req('GET','/api/collections/settings/records',None,L); check('member does not see token', 'showcase' not in d['items'][0], d)
s,d = req('GET',f'/api/showcase/{token}'); check('showcase works without login', s==200 and len(d['items'])>=4 and 'note' not in d['items'][0], (s, str(d)[:200]))
s,d = req('GET','/api/showcase/falsch123'); check('wrong showcase token 404', s==404)
# Zugangsanfrage
s,d = req('POST','/api/collections/access_requests/records',{'name':'Onkel Peter','contact':'0664 123'}); check('access request public', s==200 and d['status']=='neu', (s,d))
s,d = req('POST','/api/collections/access_requests/records',{'name':'Bot','contact':'x','website':'http://spam'}); check('honeypot silently dropped', s==204, (s,d))
s,d = req('GET','/api/collections/access_requests/records',None,A); check('only real access request stored', d['totalItems']==1, d)
s,d = req('GET','/api/collections/access_requests/records',None,L); check('member cannot list access', s==200 and d['totalItems']==0 or s in (403,), (s,d))
# BGG
s,d = req('GET','/api/bgg/search?q=catan',None,A); check('bgg search', s==200 and len(d['items'])==2, (s,d))
s,d = req('GET','/api/bgg/search?q=catan',None,L); check('bgg search admin only', s==403, s)
s,d = req('GET','/api/bgg/thing/325',None,A); check('bgg thing exp with base', s==200 and d['kind']=='exp' and d['bases'][0]['id']==13, (s,d))
s,d = req('GET','/api/bgg/thing/13',None,A); check('bgg thing mapping', d['pmin']==3 and d['best']==[4,4] and 'Strategie' in d['genres'] and 'Die Siedler von Catan' in d['alt'], d)
s,d = req('POST','/api/bgg/import',{'rows':[{'bggId':266192,'title':'Wingspan','pmin':1,'pmax':5,'tmin':40,'tmax':70,'weight':2.45},{'bggId':178900,'title':'Codenames','pmin':2,'pmax':8},{'bggId':13,'title':'CATAN'}],'enrich':True},A)
check('csv import creates items', s==200 and d['created']==3 and d['enrich'], (s,d))
s,d = req('POST','/api/bgg/import',{'rows':[{'bggId':266192,'title':'Wingspan'}]},A); check('import skips duplicates', d['skipped']==1, d)
print('waiting for cron enrichment ...'); 
for i in range(80):
    s,d = req('GET','/api/bgg/status',None,A)
    if d['waiting']==0: break
    time.sleep(1)
check('cron enriched jobs', d['waiting']==0 and d['done']>=3, d)
s,d = req('GET','/api/collections/items/records?filter=bggId%3D266192',None,A); w=d['items'][0]
check('enriched fields', w['title']=='Wingspan' and 'Flügelschlag' in w['alt'] and w['added']=='' and w['bestMin']==3, w)
print('\nRESULT', sum(1 for _,ok in R if ok), '/', len(R))
